/* =====================================================================
 * Compliance Profile Generator - PDF export (jsPDF)
 *
 * Builds a real PDF document with clickable reference links, independent
 * of the browser's print engine. Loaded after jsPDF's UMD bundle so
 * window.jspdf.jsPDF is available.
 * ===================================================================== */

(() => {
  'use strict';

  // ---- Page geometry (points; jsPDF default unit is 'pt') ------------
  const PAGE_W = 612;     // 8.5 inches
  const PAGE_H = 792;     // 11 inches
  const MARGIN_X = 56;    // ~0.78 inch left/right
  const MARGIN_TOP = 56;
  const MARGIN_BOTTOM = 56;
  const CONTENT_W = PAGE_W - (MARGIN_X * 2);
  const CONTENT_BOTTOM = PAGE_H - MARGIN_BOTTOM;

  // ---- Brand colors (RGB 0-255) --------------------------------------
  const C_TITLE = [6, 35, 63];        // Maastricht Blue
  const C_BODY = [35, 31, 32];        // Blacksmith Black
  const C_MUTED = [92, 87, 89];       // Muted neutral
  const C_LIGHT_BORDER = [220, 220, 224];
  const C_LINK = [0, 134, 183];       // Picton Blue (darker)

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

  // ---- Entry point ---------------------------------------------------
  window.downloadProfilePDF = () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library failed to load. Please refresh and try again.');
      return;
    }
    const data = window.lastProfileResults;
    if (!data || !data.matches || !data.matches.length) {
      alert('Generate a profile first, then download the PDF.');
      return;
    }
    try {
      generatePDF(data.matches, data.clientName, data.mspName);
    } catch {
      // console.error('PDF generation failed:', err);
      // alert('PDF generation failed. See browser console for details.');
      alert('PDF generation failed.');
    }
  };

  // ---- Main generator ------------------------------------------------
  const generatePDF = (matches, clientName, mspName) => {
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    // Group by tier
    const grouped = { definite: [], likely: [], consider: [] };
    matches.forEach((match) => {
      if (grouped[match.tier]) grouped[match.tier].push(match);
    });

    const state = { y: MARGIN_TOP, page: 1 };

    drawReportHeader(doc, state, clientName, mspName, matches.length, grouped);

    ['definite', 'likely', 'consider'].forEach((tier) => {
      if (grouped[tier].length === 0) return;
      drawTierSection(doc, state, tier, grouped[tier]);
    });

    drawFooter(doc, state);

    doc.save(makeFilename(clientName));
  };

  // ---- Helpers: low-level drawing -----------------------------------

  const setFont = (doc, weight) => {
    doc.setFont('helvetica', weight || 'normal');
  };

  const setColor = (doc, rgb) => {
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  };

  const setFill = (doc, rgb) => {
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  };

  const setDraw = (doc, rgb) => {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  };

  // Convert font size in points to approximate line height in points.
  const lineHeight = (size, factor) => {
    return size * (factor || 1.32);
  };

  // Ensure space; if not enough room, push to next page and return true.
  const ensureSpace = (doc, state, needed) => {
    if (state.y + needed > CONTENT_BOTTOM) {
      doc.addPage();
      state.page += 1;
      state.y = MARGIN_TOP;
      return true;
    }
    return false;
  };

  // ---- Higher-level building blocks ---------------------------------

  const drawReportHeader = (doc, state, clientName, mspName, total, grouped) => {
    // Optional MSP logo in top-right corner of first page
    let logoData = null;
    let logoAspect = 1;
    try {
      logoData = localStorage.getItem('blacksmith_msp_logo_v1');
      const storedAspect = localStorage.getItem('blacksmith_msp_logo_aspect_v1');
      if (storedAspect) logoAspect = parseFloat(storedAspect) || 1;
    } catch { 
      /* localStorage unavailable */ 
      // const errorMessage = err instanceof Error ? err.message : err;
      // setting up for conversion to react / ts
      // {error && <div className='error'>{error}</div>}
      // setError(errorMessage);
    }
    if (logoData) {
      try {
        const maxSize = 56; // ~0.78 inch box
        let logoWidth;
        let logoHeight;
        if (logoAspect >= 1) {
          logoWidth = maxSize;
          logoHeight = maxSize / logoAspect;
        } else {
          logoHeight = maxSize;
          logoWidth = maxSize * logoAspect;
        }
        const logoX = PAGE_W - MARGIN_X - logoWidth;
        const logoY = state.y;
        // jsPDF auto-detects format from data URL
        doc.addImage(logoData, logoX, logoY, logoWidth, logoHeight);
      } catch {
      // } catch (logoErr) {
        // console.warn('Failed to embed logo in PDF:', logoErr);
      }
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

    const meta = [
      ['Prepared for', clientName || 'Not specified'],
      ['Prepared by', mspName || 'Not specified'],
      ['Generated', formatToday()],
      ['Summary', summaryLine(total, grouped)]
    ];

    setFont(doc, 'normal');
    doc.setFontSize(9.5);
    const metaLineHeight = lineHeight(9.5);

    meta.forEach((row) => {
      ensureSpace(doc, state, metaLineHeight);
      // Label
      setFont(doc, 'bold');
      setColor(doc, C_MUTED);
      doc.text(row[0], MARGIN_X, state.y + 9);
      // Value
      setFont(doc, 'normal');
      setColor(doc, C_BODY);
      const valueLines = doc.splitTextToSize(String(row[1]), CONTENT_W - labelWidth);
      for (let i = 0; i < valueLines.length; i++) {
        if (i > 0) {
          ensureSpace(doc, state, metaLineHeight);
          state.y += metaLineHeight;
        }
        doc.text(valueLines[i], MARGIN_X + labelWidth, state.y + 9);
      }
      state.y += metaLineHeight;
    });

    state.y += 6;
    // Divider line
    setDraw(doc, C_TITLE);
    doc.setLineWidth(1.2);
    doc.line(MARGIN_X, state.y, MARGIN_X + CONTENT_W, state.y);
    state.y += 18;
  };

  const drawTierSection = (doc, state, tier, frameworks) => {
    drawTierHeader(doc, state, tier, frameworks.length);
    frameworks.forEach((match) => {
      drawFrameworkCard(doc, state, match, tier);
    });
    state.y += 6;
  };

  const drawTierHeader = (doc, state, tier, count) => {
    ensureSpace(doc, state, 28);
    const dotRadius = 4;
    const dotCenterX = MARGIN_X + dotRadius;
    const dotCenterY = state.y + 9;

    // Dot
    setFill(doc, TIER_COLOR[tier]);
    doc.circle(dotCenterX, dotCenterY, dotRadius, 'F');

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

  const drawFrameworkCard = (doc, state, match, tier) => {
    const framework = match.framework;
    const reasons = match.reasons || [];
    const steps = framework.first_steps || [];

    // We need to know roughly how tall this card will be so we don't
    // start it near the bottom of a page. Estimate generously.
    const estName = lineHeight(12);
    const estMeta = lineHeight(8.5);
    const estDesc = approxLines(doc, framework.description, CONTENT_W - 18, 9.5) * lineHeight(9.5);
    const estReasonsLabel = lineHeight(8.5) + 4;
    const estReasons = reasons.reduce((sum, r) => {
      return sum + approxLines(doc, r, CONTENT_W - 30, 9.5) * lineHeight(9.5);
    }, 0);
    const estStepsLabel = lineHeight(8.5) + 4;
    const estSteps = steps.reduce((sum, s) => {
      return sum + approxLines(doc, s, CONTENT_W - 30, 9.5) * lineHeight(9.5);
    }, 0);
    const estTotal = estName + estMeta + 8 + estDesc + 8 + estReasonsLabel + estReasons + 6 +
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
    nameLines.forEach((line) => {
      ensureSpace(doc, state, lineHeight(12));
      doc.text(line, contentX, state.y + 10);
      state.y += lineHeight(12);
    });
    state.y += 2;

    // Meta row: category (uppercase, muted) + clickable Reference link
    setFont(doc, 'normal');
    doc.setFontSize(8.5);
    setColor(doc, C_MUTED);
    const categoryText = (framework.category || '').toUpperCase();
    const categoryLines = doc.splitTextToSize(categoryText, contentW - 70);
    categoryLines.forEach((line, idx) => {
      ensureSpace(doc, state, lineHeight(8.5));
      doc.text(line, contentX, state.y + 8);
      if (idx === categoryLines.length - 1 && framework.reference_url) {
        // Place "Reference" link to the right of the last category line
        const refLabel = 'REFERENCE';
        setFont(doc, 'bold');
        doc.setFontSize(8.5);
        setColor(doc, C_LINK);
        let refX = contentX + doc.getTextWidth(line) + 12;
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
    drawBlockText(doc, state, framework.description, {
      x: contentX, maxWidth: contentW, size: 9.5, color: C_BODY, gapAfter: 8
    });

    // WHY THIS APPLIES label
    setFont(doc, 'bold');
    doc.setFontSize(8);
    setColor(doc, TIER_COLOR[tier]);
    ensureSpace(doc, state, lineHeight(8) + 2);
    doc.text('WHY THIS APPLIES', contentX, state.y + 7);
    state.y += lineHeight(8) + 2;

    // Reasons (bulleted)
    reasons.forEach((reason) => {
      drawBullet(doc, state, '\u2022', reason, contentX, contentW, 9.5);
    });
    state.y += 4;

    // WHERE TO START label
    if (steps.length) {
      setFont(doc, 'bold');
      doc.setFontSize(8);
      setColor(doc, TIER_COLOR[tier]);
      ensureSpace(doc, state, lineHeight(8) + 2);
      doc.text('WHERE TO START', contentX, state.y + 7);
      state.y += lineHeight(8) + 2;

      steps.forEach((step, idx) => {
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

  const drawBullet = (doc, state, marker, text, contentX, contentW, size) => {
    const markerX = contentX;
    const textX = contentX + 14;
    const textWidth = contentW - 14;

    setFont(doc, 'normal');
    doc.setFontSize(size);
    setColor(doc, C_BODY);

    const lines = doc.splitTextToSize(String(text), textWidth);
    lines.forEach((ln, i) => {
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

  const drawBlockText = (doc, state, text, opts) => {
    if (!text) return;
    setFont(doc, opts.weight || 'normal');
    doc.setFontSize(opts.size || 10);
    setColor(doc, opts.color || C_BODY);
    const lines = doc.splitTextToSize(String(text), opts.maxWidth || CONTENT_W);
    const lh = lineHeight(opts.size || 10);
    lines.forEach((line) => {
      ensureSpace(doc, state, lh);
      doc.text(line, opts.x || MARGIN_X, state.y + (opts.size || 10) * 0.85);
      state.y += lh;
    });
    if (opts.gapAfter) state.y += opts.gapAfter;
  };

  const drawFooter = (doc, state) => {
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
    attrLines.forEach((line) => {
      doc.text(line, MARGIN_X, state.y + 7);
      state.y += lineHeight(8);
    });

    state.y += 2;

    const disclaimer = 'Educational reference, not legal advice. Confirm applicability with qualified counsel.';
    const discLines = doc.splitTextToSize(disclaimer, CONTENT_W);
    discLines.forEach((line) => {
      doc.text(line, MARGIN_X, state.y + 7);
      state.y += lineHeight(8);
    });
  };

  // ---- Misc helpers --------------------------------------------------

  const approxLines = (doc, text, maxWidth, fontSize) => {
    if (!text) return 0;
    setFont(doc, 'normal');
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(String(text), maxWidth).length;
  };

  const summaryLine = (total, grouped) => {
    const parts = [];
    parts.push(total + ' frameworks identified');
    if (grouped.definite.length) parts.push(grouped.definite.length + ' definitely apply');
    if (grouped.likely.length) parts.push(grouped.likely.length + ' likely apply');
    if (grouped.consider.length) parts.push(grouped.consider.length + ' recommended');
    return parts.join(' \u00B7 ');
  };

  const formatToday = () => {
    const date = new Date();
    const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
    return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
  };

  const makeFilename = (clientName) => {
    let slug = (clientName || 'compliance-profile')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
    if (!slug) slug = 'compliance-profile';
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = ('0' + (date.getMonth() + 1)).slice(-2);
    const dd = ('0' + date.getDate()).slice(-2);
    return slug + '-compliance-profile-' + yyyy + mm + dd + '.pdf';
  };
})();
