import { jsPDF } from 'jspdf';

import type { ComplianceProfile, EvaluatedFramework } from '../types/profileResults';

// ---- Page geometry (points; jsPDF default unit is 'pt') ------------
const PAGE_W = 612;     // 8.5 inches
const PAGE_H = 792;     // 11 inches
const MARGIN_X = 56;    // ~0.78 inch left/right
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const CONTENT_W = PAGE_W - (MARGIN_X * 2);
const CONTENT_BOTTOM = PAGE_H - MARGIN_BOTTOM;
const LOGO_MAX_SIZE = 96;

// ---- Brand colors (RGB 0-255) --------------------------------------
const C_TITLE: [number, number, number] = [6, 35, 63];        // Maastricht Blue
const C_BODY: [number, number, number] = [35, 31, 32];        // Blacksmith Black
const C_MUTED: [number, number, number] = [92, 87, 89];       // Muted neutral
const C_LIGHT_BORDER: [number, number, number] = [220, 220, 224];
const C_LINK: [number, number, number] = [0, 134, 183];       // Picton Blue (darker)

const TIER_COLOR = {
  definite: [46, 139, 87],   // #2E8B57 sea green
  likely:   [183, 121, 31],  // #B7791F amber
  consider: [30, 93, 156]    // #1E5D9C medium blue
};

const TIER_LABEL = {
  definite: 'Definitely applies',
  likely:   'Likely applies',
  consider: 'Recommended'
};

type PdfLogo = { dataUrl: string; aspectRatio: number };

// Rasterize browser-supported uploads (including SVG) for jsPDF.
const prepareLogo = (file: File): Promise<PdfLogo> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the uploaded logo.'));
  reader.onload = () => {
    if (typeof reader.result !== 'string') {
      reject(new Error('Could not read the uploaded logo.'));
      return;
    }

    const image = new Image();
    image.onerror = () => reject(new Error('Could not decode the uploaded logo.'));
    image.onload = () => {
      try {
        const { naturalWidth, naturalHeight } = image;
        if (!naturalWidth || !naturalHeight) throw new Error('The uploaded logo has no dimensions.');

        // A 512px image is plenty for the header logo and keeps PDFs small.
        const scale = Math.min(1, 512 / Math.max(naturalWidth, naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not render the uploaded logo.');

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL('image/png'), aspectRatio: naturalWidth / naturalHeight });
      } catch (error) {
        reject(error);
      }
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// ---- Entry point ---------------------------------------------------
export const downloadProfilePDF = async (lastProfileResults: ComplianceProfile) => {
  if (!jsPDF) {
    alert('PDF library failed to load. Please refresh and try again.');
    return;
  }
  const data = { ...lastProfileResults };
  if (!data || !data.definite?.length && !data.likely?.length && !data.consider?.length) {
    alert('Generate a profile first, then download the PDF.');
    return;
  }
  let logo: PdfLogo | null = null;
  if (data.identity.logoImg) {
    try {
      logo = await prepareLogo(data.identity.logoImg);
    } catch {
      alert('Could not process the uploaded logo. Please choose a different image and try again.');
      return;
    }
  }
  try {
    generatePDF(
      [...data.definite, ...data.likely, ...data.consider],
      data.identity.clientName,
      data.identity.preperName,
      logo
    );
  } catch {
    // console.error('PDF generation failed:', err);
    // alert('PDF generation failed. See browser console for details.');
    alert('PDF generation failed.');
  }
};

// ---- Main generator ------------------------------------------------
const generatePDF = (matches: EvaluatedFramework[], clientName: string, mspName: string, logo: PdfLogo | null) => {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  // Group by tier
  const grouped: Record<'definite' | 'likely' | 'consider', EvaluatedFramework[]> = {
    definite: [],
    likely: [],
    consider: [],
  };
  matches.forEach((m) => {
    if (grouped[m.matchLevel]) grouped[m.matchLevel].push(m);
  });

  const state = { y: MARGIN_TOP, page: 1 };

  drawReportHeader(doc, state, clientName, mspName, matches.length, grouped, logo);

  (['definite', 'likely', 'consider'] as const).forEach((tier) => {
    if (grouped[tier].length === 0) return;
    drawTierSection(doc, state, tier, grouped[tier]);
  });

  drawFooter(doc, state);

  doc.save(makeFilename(clientName));
  };

  // ---- Helpers: low-level drawing -----------------------------------

  const setFont = (doc: jsPDF, weight: 'normal' | 'bold' | 'italic' | 'bolditalic') => {
    doc.setFont('helvetica', weight || 'normal');
  };

  const setColor = (doc: jsPDF, rgb: string | number[]) => {
    if (typeof rgb === 'string') {
      doc.setTextColor(rgb);
    } else {
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    }
  };

  const setFill = (doc: jsPDF, rgb: string | number[]) => {
    if (typeof rgb === 'string') {
      doc.setFillColor(rgb);
    } else {
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    }
  };

  const setDraw = (doc: jsPDF, rgb: string | number[]) => {
    if (typeof rgb === 'string') {
      doc.setDrawColor(rgb);
    } else {
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    }
  };

  // Convert font size in points to approximate line height in points.
  const lineHeight = (size: number, factor?: number) => {
    return size * (factor || 1.32);
  };

  // Ensure space; if not enough room, push to next page and return true.
  const ensureSpace = (doc: jsPDF, state: { y: number; page: number }, needed: number) => {
    if (state.y + needed > CONTENT_BOTTOM) {
      doc.addPage();
      state.page += 1;
      state.y = MARGIN_TOP;
      return true;
    }
    return false;
  };

  // ---- Higher-level building blocks ---------------------------------

  const drawReportHeader = (
    doc: jsPDF,
    state: { y: number; page: number },
    clientName: string,
    mspName: string,
    total: number,
    grouped: Record<'definite' | 'likely' | 'consider', EvaluatedFramework[]>,
    logo: PdfLogo | null,
  ) => {
    // Client logo in the top-right corner of the first page.
    if (logo) {
      const logoW = logo.aspectRatio >= 1 ? LOGO_MAX_SIZE : LOGO_MAX_SIZE * logo.aspectRatio;
      const logoH = logo.aspectRatio >= 1 ? LOGO_MAX_SIZE / logo.aspectRatio : LOGO_MAX_SIZE;
      const logoX = PAGE_W - MARGIN_X - logoW;
      doc.addImage(logo.dataUrl, 'PNG', logoX, state.y, logoW, logoH);
    }

    // "BLACKSMITH INFOSEC" eyebrow
    setFont(doc, 'bold');
    doc.setFontSize(8.5);
    setColor(doc, C_MUTED);
    doc.text('BLACKSMITH INFOSEC', MARGIN_X, state.y + 8);
    state.y += 14;

    // Main title
    setFont(doc, 'bold');
    doc.setFontSize(24);
    setColor(doc, C_TITLE);
    doc.text('Compliance Profile Report', MARGIN_X, state.y + 22);
    state.y += 36;

    // Metadata grid
    const labelWidth = 80;
    const valueWidth = CONTENT_W - labelWidth - (logo ? LOGO_MAX_SIZE + 20 : 0);

    const meta = [
      ['Prepared for', clientName || 'Not specified'],
      ['Prepared by', mspName || 'Not specified'],
      ['Generated', formatToday()],
      ['Summary', summaryLine(total, grouped)]
    ];

    setFont(doc, 'normal');
    doc.setFontSize(9.5);
    const lh = lineHeight(9.5);

    meta.forEach((row) => {
      ensureSpace(doc, state, lh);
      // Label
      setFont(doc, 'bold');
      setColor(doc, C_MUTED);
      doc.text(row[0], MARGIN_X, state.y + 9);
      // Value
      setFont(doc, 'normal');
      setColor(doc, C_BODY);
      const valueLines = doc.splitTextToSize(String(row[1]), valueWidth);
      for (let i = 0; i < valueLines.length; i++) {
        if (i > 0) {
          ensureSpace(doc, state, lh);
          state.y += lh;
        }
        doc.text(valueLines[i], MARGIN_X + labelWidth, state.y + 9);
      }
      state.y += lh;
    });

    state.y += 6;
    // Divider line
    setDraw(doc, C_TITLE);
    doc.setLineWidth(1.2);
    doc.line(MARGIN_X, state.y, MARGIN_X + CONTENT_W, state.y);
    state.y += 18;
  };

  const drawTierSection = (
    doc: jsPDF,
    state: { y: number; page: number },
    tier: 'definite' | 'likely' | 'consider',
    frameworks: EvaluatedFramework[]
  ) => {
    drawTierHeader(doc, state, tier, frameworks.length);
    frameworks.forEach((f) => {
      drawFrameworkCard(doc, state, f, tier);
    });
    state.y += 6;
  };

  const drawTierHeader = (
    doc: jsPDF,
    state: { y: number; page: number },
    tier: 'definite' | 'likely' | 'consider',
    count: number
  ) => {
    ensureSpace(doc, state, 28);
    const dotR = 4;
    const dotCx = MARGIN_X + dotR;
    const dotCy = state.y + 9;

    // Dot
    setFill(doc, TIER_COLOR[tier]);
    doc.circle(dotCx, dotCy, dotR, 'F');

    // Tier name (set font first so we measure width at the right size)
    setFont(doc, 'bold');
    doc.setFontSize(13);
    setColor(doc, C_TITLE);
    const nameWidth = doc.getTextWidth(TIER_LABEL[tier]);
    doc.text(TIER_LABEL[tier], MARGIN_X + 16, state.y + 12);

    // Count (smaller, muted, placed to the right of the name)
    setFont(doc, 'normal');
    doc.setFontSize(11);
    setColor(doc, C_MUTED);
    doc.text(String(count), MARGIN_X + 16 + nameWidth + 8, state.y + 12);

    state.y += 22;
  };

  const drawFrameworkCard = (
    doc: jsPDF,
    state: { y: number; page: number },
    framework: EvaluatedFramework,
    tier: 'definite' | 'likely' | 'consider'
  ) => {
    const steps = framework.first_steps || [];

    // We need to know roughly how tall this card will be so we don't
    // start it near the bottom of a page. Estimate generously.
    const estName = lineHeight(12);
    const estMeta = lineHeight(8.5);
    const estDesc = approxLines(doc, framework.description, CONTENT_W - 18, 9.5) * lineHeight(9.5);
    const estReasonsLabel = lineHeight(8.5) + 4;
    const estStepsLabel = lineHeight(8.5) + 4;
    const estSteps = steps.reduce((sum: number, s: string) => {
      return sum + approxLines(doc, s, CONTENT_W - 30, 9.5) * lineHeight(9.5);
    }, 0);
    const estTotal = estName + estMeta + 8 + estDesc + 8 + estReasonsLabel + 1 + 6 +
                   estStepsLabel + estSteps + 16;

    // If the entire card is shorter than remaining page, avoid splitting it
    // by triggering a page break. Otherwise allow it to flow.
    const remaining = CONTENT_BOTTOM - state.y;
    if (estTotal <= CONTENT_BOTTOM - MARGIN_TOP && remaining < estTotal) {
      doc.addPage();
      state.page += 1;
      state.y = MARGIN_TOP;
    }

    const cardTop = state.y;
    const contentX = MARGIN_X + 10;
    const contentW = CONTENT_W - 18;

    // Framework name
    setFont(doc, 'bold');
    doc.setFontSize(12);
    setColor(doc, C_TITLE);
    const nameLines = doc.splitTextToSize(framework.name, contentW);
    nameLines.forEach((ln: string) => {
      ensureSpace(doc, state, lineHeight(12));
      doc.text(ln, contentX, state.y + 10);
      state.y += lineHeight(12);
    });
    state.y += 2;

    // Meta row: category (uppercase, muted) + clickable Reference link
    setFont(doc, 'normal');
    doc.setFontSize(8.5);
    setColor(doc, C_MUTED);
    const catText = (framework.category || '').toUpperCase();
    const catLines = doc.splitTextToSize(catText, contentW - 70);
    catLines.forEach((ln: string, idx: number) => {
      ensureSpace(doc, state, lineHeight(8.5));
      doc.text(ln, contentX, state.y + 8);
      if (idx === catLines.length - 1 && framework.reference_url) {
        // Place "Reference" link to the right of the last category line
        const refLabel = 'REFERENCE';
        setFont(doc, 'bold');
        doc.setFontSize(8.5);
        setColor(doc, C_LINK);
        let refX = contentX + doc.getTextWidth(ln) + 12;
        // Ensure we don't run off the right edge; if so put on a new line
        if (refX + doc.getTextWidth(refLabel) > MARGIN_X + CONTENT_W - 8) {
          state.y += lineHeight(8.5);
          ensureSpace(doc, state, lineHeight(8.5));
          refX = contentX;
        }
        doc.text(refLabel, refX, state.y + 8);
        // Underline
        const refWidth = doc.getTextWidth(refLabel);
        setDraw(doc, C_LINK);
        doc.setLineWidth(0.6);
        doc.line(refX, state.y + 9.5, refX + refWidth, state.y + 9.5);
        // Clickable annotation
        doc.link(refX - 1, state.y, refWidth + 2, 11, { url: framework.reference_url });
        // Restore styling for next category line
        setFont(doc, 'normal');
        doc.setFontSize(8.5);
        setColor(doc, C_MUTED);
      }
      state.y += lineHeight(8.5);
    });
    state.y += 4;

    // Description
    drawBlockText(
      doc,
      state,
      framework.description,
      { x: contentX, maxWidth: contentW, size: 9.5, color: C_BODY, gapAfter: 8 }
    );

    // WHY THIS APPLIES label
    setFont(doc, 'bold');
    doc.setFontSize(8);
    setColor(doc, TIER_COLOR[tier]);
    ensureSpace(doc, state, lineHeight(8) + 2);
    doc.text('WHY THIS APPLIES', contentX, state.y + 7);
    state.y += lineHeight(8) + 2;

    // Reasons (bulleted)
    drawBullet(doc, state, '\u2022', framework.matchReason, contentX, contentW, 9.5);
    state.y += 4;

    // WHERE TO START label
    if (steps.length) {
      setFont(doc, 'bold');
      doc.setFontSize(8);
      setColor(doc, TIER_COLOR[tier]);
      ensureSpace(doc, state, lineHeight(8) + 2);
      doc.text('WHERE TO START', contentX, state.y + 7);
      state.y += lineHeight(8) + 2;

      steps.forEach((step: string, idx: number) => {
        drawBullet(doc, state, (idx + 1) + '.', step, contentX, contentW, 9.5);
      });
    }

    // Card bottom: draw the left accent bar from cardTop to current state.y
    const barX = MARGIN_X;
    setDraw(doc, TIER_COLOR[tier]);
    doc.setLineWidth(2.5);
    // Note: if the card flowed across pages this single line will only span
    // the final page. For first version this is acceptable; multi-page cards
    // are rare given our estimate-based page break.
    doc.line(barX, cardTop + 2, barX, state.y - 4);

    state.y += 14;
  };

  const drawBullet = (
    doc: jsPDF,
    state: { y: number; page: number },
    marker: string,
    text: string,
    contentX: number,
    contentW: number,
    size: number
  ) => {
    const markerX = contentX;
    const textX = contentX + 14;
    const textWidth = contentW - 14;

    setFont(doc, 'normal');
    doc.setFontSize(size);
    setColor(doc, C_BODY);

    const lines = doc.splitTextToSize(String(text), textWidth);
    lines.forEach((ln: string, i: number) => {
      ensureSpace(doc, state, lineHeight(size));
      if (i === 0) {
        setFont(doc, 'bold');
        doc.text(marker, markerX, state.y + size * 0.85);
        setFont(doc, 'normal');
      }
      doc.text(ln, textX, state.y + size * 0.85);
      state.y += lineHeight(size);
    });
    state.y += 1;
  };

  const drawBlockText = (
    doc: jsPDF,
    state: { y: number; page: number },
    text: string,
    opts: {
      x?: number;
      maxWidth?: number;
      size?: number;
      color?: string | [number, number, number];
      weight?: 'normal' | 'bold';
      gapAfter?: number
    }
  ) => {
    if (!text) return;
    setFont(doc, opts.weight || 'normal');
    doc.setFontSize(opts.size || 10);
    setColor(doc, opts.color || C_BODY);
    const lines = doc.splitTextToSize(String(text), opts.maxWidth || CONTENT_W);
    const lh = lineHeight(opts.size || 10);
    lines.forEach((ln: string) => {
      ensureSpace(doc, state, lh);
      doc.text(ln, opts.x || MARGIN_X, state.y + (opts.size || 10) * 0.85);
      state.y += lh;
    });
    if (opts.gapAfter) state.y += opts.gapAfter;
  };

  const drawFooter = (doc: jsPDF, state: { y: number; page: number }) => {
    // Anchor footer near the bottom of the current (last) page.
    const footerTop = CONTENT_BOTTOM - 42;
    if (state.y > footerTop) {
      doc.addPage();
      state.page += 1;
      state.y = footerTop;
    } else {
      state.y = footerTop;
    }

    setDraw(doc, C_LIGHT_BORDER);
    doc.setLineWidth(0.6);
    doc.line(MARGIN_X, state.y, MARGIN_X + CONTENT_W, state.y);
    state.y += 10;

    setFont(doc, 'normal');
    doc.setFontSize(8);
    setColor(doc, C_MUTED);

    const attribution = 'Open source compliance scoping tool by Blacksmith InfoSec. ' +
            'Suggests likely-applicable frameworks based on the inputs provided.';
    const attrLines = doc.splitTextToSize(attribution, CONTENT_W);
    attrLines.forEach((ln: string) => {
      doc.text(ln, MARGIN_X, state.y + 7);
      state.y += lineHeight(8);
    });

    state.y += 2;

    const disclaimer = 'Educational reference, not legal advice. Confirm applicability with qualified counsel.';
    const discLines = doc.splitTextToSize(disclaimer, CONTENT_W);
    discLines.forEach((ln: string) => {
      doc.text(ln, MARGIN_X, state.y + 7);
      state.y += lineHeight(8);
    });
  };

  // ---- Misc helpers --------------------------------------------------

  const approxLines = (doc: jsPDF, text: string, maxWidth: number, fontSize: number) => {
    if (!text) return 0;
    setFont(doc, 'normal');
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(String(text), maxWidth).length;
  };

  const summaryLine = (
    total: number,
    grouped: Record<'definite' | 'likely' | 'consider', EvaluatedFramework[]>
  ) => {
    const parts = [];
    parts.push(total + ' frameworks identified');
    if (grouped.definite.length) parts.push(grouped.definite.length + ' definitely apply');
    if (grouped.likely.length) parts.push(grouped.likely.length + ' likely apply');
    if (grouped.consider.length) parts.push(grouped.consider.length + ' recommended');
    return parts.join(' \u00B7 ');
  };

  const formatToday = () => {
    const d = new Date();
    const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  };

  const makeFilename = (clientName: string) => {
    let slug = (clientName || 'compliance-profile')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
    if (!slug) slug = 'compliance-profile';
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = ('0' + (d.getMonth() + 1)).slice(-2);
    const dd = ('0' + d.getDate()).slice(-2);
    return slug + '-compliance-profile-' + yyyy + mm + dd + '.pdf';
  };
