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
  var PAGE_W = 612;     // 8.5 inches
  var PAGE_H = 792;     // 11 inches
  var MARGIN_X = 56;    // ~0.78 inch left/right
  var MARGIN_TOP = 56;
  var MARGIN_BOTTOM = 56;
  var CONTENT_W = PAGE_W - (MARGIN_X * 2);
  var CONTENT_BOTTOM = PAGE_H - MARGIN_BOTTOM;

  // ---- Brand colors (RGB 0-255) --------------------------------------
  var C_TITLE = [6, 35, 63];        // Maastricht Blue
  var C_BODY = [35, 31, 32];        // Blacksmith Black
  var C_MUTED = [92, 87, 89];       // Muted neutral
  var C_LIGHT_BORDER = [220, 220, 224];
  var C_LINK = [0, 134, 183];       // Picton Blue (darker)

  var TIER_COLOR = {
    definite: [46, 139, 87],   // #2E8B57 sea green
    likely:   [183, 121, 31],  // #B7791F amber
    consider: [30, 93, 156]    // #1E5D9C medium blue
  };

  var TIER_LABEL = {
    definite: 'Definitely applies',
    likely:   'Likely applies',
    consider: 'Recommended'
  };

  // ---- Entry point ---------------------------------------------------
  window.downloadProfilePDF = function () {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library failed to load. Please refresh and try again.');
      return;
    }
    var data = window.lastProfileResults;
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
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'pt', format: 'letter' });

    // Group by tier
    var grouped = { definite: [], likely: [], consider: [] };
    matches.forEach((m) => {
      if (grouped[m.tier]) grouped[m.tier].push(m);
    });

    var state = { y: MARGIN_TOP, page: 1 };

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
    var logoData = null;
    var logoAspect = 1;
    try {
      logoData = localStorage.getItem('blacksmith_msp_logo_v1');
      var storedAspect = localStorage.getItem('blacksmith_msp_logo_aspect_v1');
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
        var maxSize = 56; // ~0.78 inch box
        var logoW, logoH;
        if (logoAspect >= 1) {
          logoW = maxSize;
          logoH = maxSize / logoAspect;
        } else {
          logoH = maxSize;
          logoW = maxSize * logoAspect;
        }
        var logoX = PAGE_W - MARGIN_X - logoW;
        var logoY = state.y;
        // jsPDF auto-detects format from data URL
        doc.addImage(logoData, logoX, logoY, logoW, logoH);
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
    var labelWidth = 80;

    var meta = [
      ['Prepared for', clientName || 'Not specified'],
      ['Prepared by', mspName || 'Not specified'],
      ['Generated', formatToday()],
      ['Summary', summaryLine(total, grouped)]
    ];

    setFont(doc, 'normal');
    doc.setFontSize(9.5);
    var lh = lineHeight(9.5);

    meta.forEach(function (row) {
      ensureSpace(doc, state, lh);
      // Label
      setFont(doc, 'bold');
      setColor(doc, C_MUTED);
      doc.text(row[0], MARGIN_X, state.y + 9);
      // Value
      setFont(doc, 'normal');
      setColor(doc, C_BODY);
      var valueLines = doc.splitTextToSize(String(row[1]), CONTENT_W - labelWidth);
      for (var i = 0; i < valueLines.length; i++) {
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

  const drawTierSection = (doc, state, tier, frameworks) => {
    drawTierHeader(doc, state, tier, frameworks.length);
    frameworks.forEach(function (m) {
      drawFrameworkCard(doc, state, m, tier);
    });
    state.y += 6;
  };

  const drawTierHeader = (doc, state, tier, count) => {
    ensureSpace(doc, state, 28);
    var dotR = 4;
    var dotCx = MARGIN_X + dotR;
    var dotCy = state.y + 9;

    // Dot
    setFill(doc, TIER_COLOR[tier]);
    doc.circle(dotCx, dotCy, dotR, 'F');

    // Tier name (set font first so we measure width at the right size)
    setFont(doc, 'bold');
    doc.setFontSize(13);
    setColor(doc, C_TITLE);
    var nameWidth = doc.getTextWidth(TIER_LABEL[tier]);
    doc.text(TIER_LABEL[tier], MARGIN_X + 16, state.y + 12);

    // Count (smaller, muted, placed to the right of the name)
    setFont(doc, 'normal');
    doc.setFontSize(11);
    setColor(doc, C_MUTED);
    doc.text(String(count), MARGIN_X + 16 + nameWidth + 8, state.y + 12);

    state.y += 22;
  };

  const drawFrameworkCard = (doc, state, match, tier) => {
    var fw = match.framework;
    var reasons = match.reasons || [];
    var steps = fw.first_steps || [];

    // We need to know roughly how tall this card will be so we don't
    // start it near the bottom of a page. Estimate generously.
    var estName = lineHeight(12);
    var estMeta = lineHeight(8.5);
    var estDesc = approxLines(doc, fw.description, CONTENT_W - 18, 9.5) * lineHeight(9.5);
    var estReasonsLabel = lineHeight(8.5) + 4;
    var estReasons = reasons.reduce(function (sum, r) {
      return sum + approxLines(doc, r, CONTENT_W - 30, 9.5) * lineHeight(9.5);
    }, 0);
    var estStepsLabel = lineHeight(8.5) + 4;
    var estSteps = steps.reduce(function (sum, s) {
      return sum + approxLines(doc, s, CONTENT_W - 30, 9.5) * lineHeight(9.5);
    }, 0);
    var estTotal = estName + estMeta + 8 + estDesc + 8 + estReasonsLabel + estReasons + 6 +
                   estStepsLabel + estSteps + 16;

    // If the entire card is shorter than remaining page, avoid splitting it
    // by triggering a page break. Otherwise allow it to flow.
    var remaining = CONTENT_BOTTOM - state.y;
    if (estTotal <= CONTENT_BOTTOM - MARGIN_TOP && remaining < estTotal) {
      doc.addPage();
      state.page += 1;
      state.y = MARGIN_TOP;
    }

    var cardTop = state.y;
    var contentX = MARGIN_X + 10;
    var contentW = CONTENT_W - 18;

    // Framework name
    setFont(doc, 'bold');
    doc.setFontSize(12);
    setColor(doc, C_TITLE);
    var nameLines = doc.splitTextToSize(fw.name, contentW);
    nameLines.forEach(function (ln) {
      ensureSpace(doc, state, lineHeight(12));
      doc.text(ln, contentX, state.y + 10);
      state.y += lineHeight(12);
    });
    state.y += 2;

    // Meta row: category (uppercase, muted) + clickable Reference link
    setFont(doc, 'normal');
    doc.setFontSize(8.5);
    setColor(doc, C_MUTED);
    var catText = (fw.category || '').toUpperCase();
    var catLines = doc.splitTextToSize(catText, contentW - 70);
    catLines.forEach(function (ln, idx) {
      ensureSpace(doc, state, lineHeight(8.5));
      doc.text(ln, contentX, state.y + 8);
      if (idx === catLines.length - 1 && fw.reference_url) {
        // Place "Reference" link to the right of the last category line
        var refLabel = 'REFERENCE';
        setFont(doc, 'bold');
        doc.setFontSize(8.5);
        setColor(doc, C_LINK);
        var refX = contentX + doc.getTextWidth(ln) + 12;
        // Ensure we don't run off the right edge; if so put on a new line
        if (refX + doc.getTextWidth(refLabel) > MARGIN_X + CONTENT_W - 8) {
          state.y += lineHeight(8.5);
          ensureSpace(doc, state, lineHeight(8.5));
          refX = contentX;
        }
        doc.text(refLabel, refX, state.y + 8);
        // Underline
        var refWidth = doc.getTextWidth(refLabel);
        setDraw(doc, C_LINK);
        doc.setLineWidth(0.6);
        doc.line(refX, state.y + 9.5, refX + refWidth, state.y + 9.5);
        // Clickable annotation
        doc.link(refX - 1, state.y, refWidth + 2, 11, { url: fw.reference_url });
        // Restore styling for next category line
        setFont(doc, 'normal');
        doc.setFontSize(8.5);
        setColor(doc, C_MUTED);
      }
      state.y += lineHeight(8.5);
    });
    state.y += 4;

    // Description
    drawBlockText(doc, state, fw.description, {
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
    reasons.forEach(function (reason) {
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

      steps.forEach(function (step, idx) {
        drawBullet(doc, state, (idx + 1) + '.', step, contentX, contentW, 9.5);
      });
    }

    // Card bottom: draw the left accent bar from cardTop to current state.y
    var barX = MARGIN_X;
    setDraw(doc, TIER_COLOR[tier]);
    doc.setLineWidth(2.5);
    // Note: if the card flowed across pages this single line will only span
    // the final page. For first version this is acceptable; multi-page cards
    // are rare given our estimate-based page break.
    doc.line(barX, cardTop + 2, barX, state.y - 4);

    state.y += 14;
  };

  const drawBullet = (doc, state, marker, text, contentX, contentW, size) => {
    var markerX = contentX;
    var textX = contentX + 14;
    var textWidth = contentW - 14;

    setFont(doc, 'normal');
    doc.setFontSize(size);
    setColor(doc, C_BODY);

    var lines = doc.splitTextToSize(String(text), textWidth);
    lines.forEach(function (ln, i) {
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
    var lines = doc.splitTextToSize(String(text), opts.maxWidth || CONTENT_W);
    var lh = lineHeight(opts.size || 10);
    lines.forEach(function (ln) {
      ensureSpace(doc, state, lh);
      doc.text(ln, opts.x || MARGIN_X, state.y + (opts.size || 10) * 0.85);
      state.y += lh;
    });
    if (opts.gapAfter) state.y += opts.gapAfter;
  };

  const drawFooter = (doc, state) => {
    // Anchor footer near the bottom of the current (last) page.
    var footerTop = CONTENT_BOTTOM - 42;
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

    var attribution = 'Open source compliance scoping tool by Blacksmith InfoSec.' + 
            'Suggests likely-applicable frameworks based on the inputs provided.';
    var attrLines = doc.splitTextToSize(attribution, CONTENT_W);
    attrLines.forEach(function (ln) {
      doc.text(ln, MARGIN_X, state.y + 7);
      state.y += lineHeight(8);
    });

    state.y += 2;

    var disclaimer = 'Educational reference, not legal advice. Confirm applicability with qualified counsel.';
    var discLines = doc.splitTextToSize(disclaimer, CONTENT_W);
    discLines.forEach(function (ln) {
      doc.text(ln, MARGIN_X, state.y + 7);
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
    var parts = [];
    parts.push(total + ' frameworks identified');
    if (grouped.definite.length) parts.push(grouped.definite.length + ' definitely apply');
    if (grouped.likely.length) parts.push(grouped.likely.length + ' likely apply');
    if (grouped.consider.length) parts.push(grouped.consider.length + ' recommended');
    return parts.join(' \u00B7 ');
  };

  const formatToday = () => {
    var d = new Date();
    var months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  };

  const makeFilename = (clientName) => {
    var slug = (clientName || 'compliance-profile')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
    if (!slug) slug = 'compliance-profile';
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return slug + '-compliance-profile-' + yyyy + mm + dd + '.pdf';
  };
})();
