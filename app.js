/* =================================================================
   Compliance Profile Generator - Application Logic
   ================================================================= */

(function () {
  'use strict';

  // -----------------------------------------------------------------
  // THEME TOGGLE
  // -----------------------------------------------------------------

  function getCurrentTheme() {
    var explicit = document.documentElement.getAttribute('data-theme');
    if (explicit) return explicit;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('bs-theme', theme); } catch (e) {}
  }

  function toggleTheme() {
    var current = getCurrentTheme();
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // -----------------------------------------------------------------
  // "NONE OF THE ABOVE" MUTUAL EXCLUSIVITY
  // -----------------------------------------------------------------
  // In any checkbox group that includes a "none" option, "none" and the
  // specific options are mutually exclusive. Clicking "none" clears the
  // specifics; clicking a specific option clears "none".

  function enforceExclusiveNone(form, e) {
    if (!e || !e.target || e.target.type !== 'checkbox') return;
    var name = e.target.name;
    var noneCb = form.querySelector('input[type="checkbox"][name="' + name + '"][value="none"]');
    if (!noneCb) return;

    if (e.target.value === 'none' && e.target.checked) {
      // "None" just got checked - uncheck all other specifics in this group
      form.querySelectorAll('input[type="checkbox"][name="' + name + '"]:not([value="none"])').forEach(function (cb) {
        cb.checked = false;
      });
    } else if (e.target.value !== 'none' && e.target.checked) {
      // A specific option just got checked - uncheck "none"
      noneCb.checked = false;
    }
  }

  // -----------------------------------------------------------------
  // BUSINESS TYPE TO INDUSTRY MAPPING
  // -----------------------------------------------------------------
  // The form asks for a specific business type (e.g., "CPA firm",
  // "medical practice") which is unambiguous for end users. Internally
  // we map to the existing `industry` values used by framework triggers.
  // Multiple business types may map to the same industry value.

  var BUSINESS_TYPE_TO_INDUSTRY = {
    // Accounting & Finance
    cpa_firm: 'financial_services',
    tax_prep: 'financial_services',
    investment_advisor: 'financial_services',
    bank_credit_union: 'financial_services',
    mortgage_broker: 'financial_services',
    insurance_agency: 'insurance',
    fintech: 'financial_services',

    // Healthcare
    medical_practice: 'healthcare',
    dental_practice: 'healthcare',
    veterinary_practice: 'professional_services',
    mental_health: 'healthcare',
    pharmacy: 'healthcare',
    healthcare_it: 'healthcare',
    health_insurance: 'insurance',
    pharma_biotech: 'healthcare',

    // Legal
    law_firm: 'legal',

    // Education
    k12_school: 'education',
    higher_ed: 'education',

    // Government & Public Sector
    federal_civilian_contractor: 'government',
    defense_contractor: 'defense',
    state_local_government: 'government',
    nonprofit: 'nonprofit',

    // Technology
    saas: 'technology',
    msp_services: 'technology',
    cybersecurity_vendor: 'technology',
    other_technology: 'technology',

    // Retail & Hospitality
    retail_store: 'retail',
    ecommerce: 'retail',
    restaurant: 'hospitality',
    hotel: 'hospitality',

    // Real Estate
    real_estate_brokerage: 'real_estate',
    property_management: 'real_estate',

    // Professional Services
    consulting: 'professional_services',
    marketing_agency: 'professional_services',
    architecture_engineering: 'professional_services',
    recruiting_staffing: 'professional_services',

    // Industrial
    manufacturing: 'manufacturing',
    construction: 'manufacturing',
    energy: 'energy',
    transportation: 'manufacturing',

    // Other
    other: 'other'
  };

  // -----------------------------------------------------------------
  // CONDITIONAL FIELD VISIBILITY
  // -----------------------------------------------------------------

  var VISIBILITY_RULES = {
    us_states: {
      show_when: [
        { operating_regions_includes: 'us' }
      ]
    },
    revenue: {
      show_when: [
        { us_states_includes: 'ca' },
        { us_states_includes: 'ny', industry_in: ['financial_services', 'insurance'] }
      ]
    },
    employees: {
      show_when: [
        { operating_regions_includes: 'eu' },
        { us_states_includes: 'tx' },
        { us_states_includes: 'ny', industry_in: ['financial_services', 'insurance'] }
      ]
    },
    contracts: {
      show_when: [
        { customer_types_includes_any: ['businesses', 'federal_civilian', 'dod', 'state_local', 'education', 'healthcare_orgs', 'financial_orgs'] },
        { industry_in: ['defense', 'technology', 'professional_services'] }
      ]
    },
    card_handling: {
      show_when: [
        { data_types_includes: 'pci' },
        { industry_in: ['retail', 'hospitality', 'healthcare', 'financial_services', 'education', 'nonprofit', 'professional_services', 'insurance', 'legal'] }
      ]
    },
    critical_infra: {
      show_when: [
        { industry_in: ['energy'] }
      ]
    },
    provider_role: {
      show_when: [
        { industry_in: ['technology'] },
        { customer_types_includes_any: ['businesses', 'federal_civilian', 'dod', 'state_local', 'education', 'healthcare_orgs', 'financial_orgs'] }
      ]
    }
  };

  function checkCondition(condition, data) {
    // All keys in the condition must match (AND logic across keys)
    var keys = Object.keys(condition);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var expected = condition[key];

      if (key === 'industry_in') {
        if (expected.indexOf(data.industry) === -1) return false;
      } else if (key === 'industry') {
        if (data.industry !== expected) return false;
      } else if (key === 'data_types_includes') {
        if (!Array.isArray(data.data_types) || data.data_types.indexOf(expected) === -1) return false;
      } else if (key === 'customer_types_includes_any') {
        if (!Array.isArray(data.customer_types) ||
            !expected.some(function (v) { return data.customer_types.indexOf(v) !== -1; })) return false;
      } else if (key === 'operating_regions_includes') {
        if (!Array.isArray(data.operating_regions) || data.operating_regions.indexOf(expected) === -1) return false;
      } else if (key === 'us_states_includes') {
        if (!Array.isArray(data.us_states) || data.us_states.indexOf(expected) === -1) return false;
      } else {
        // Unknown condition key
        return false;
      }
    }
    return true;
  }

  function shouldShowField(fieldName, data) {
    var rule = VISIBILITY_RULES[fieldName];
    if (!rule) return true;
    return rule.show_when.some(function (cond) {
      return checkCondition(cond, data);
    });
  }

  function clearFieldValue(fieldEl) {
    var inputs = fieldEl.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    inputs.forEach(function (input) { input.checked = false; });
    var selects = fieldEl.querySelectorAll('select');
    selects.forEach(function (sel) { sel.value = ''; });
  }

  function updateConditionalFields(form) {
    var data = readForm(form);
    Object.keys(VISIBILITY_RULES).forEach(function (fieldName) {
      var fieldEl = form.querySelector('[data-field="' + fieldName + '"]');
      if (!fieldEl) return;
      var shouldShow = shouldShowField(fieldName, data);
      if (shouldShow) {
        fieldEl.classList.add('visible');
      } else {
        if (fieldEl.classList.contains('visible')) {
          clearFieldValue(fieldEl);
        }
        fieldEl.classList.remove('visible');
      }
    });

    var section5 = document.getElementById('section-operations');
    if (section5) {
      var anyVisible = section5.querySelectorAll('.field.conditional.visible').length > 0;
      section5.classList.toggle('all-hidden', !anyVisible);
    }
  }

  // -----------------------------------------------------------------
  // REGION-BASED OPTION VISIBILITY
  // -----------------------------------------------------------------

  function updateRegionVisibility(form) {
    var data = readForm(form);
    var regions = data.operating_regions || [];

    form.querySelectorAll('[data-show-region]').forEach(function (el) {
      var required = el.dataset.showRegion;
      if (regions.indexOf(required) !== -1) {
        el.classList.remove('hidden-by-region');
      } else {
        // Hide it and clear any selected value so it can't sneak through on submit
        el.classList.add('hidden-by-region');
        var input = el.querySelector('input');
        if (input && input.checked) input.checked = false;
      }
    });
  }

  // -----------------------------------------------------------------
  // FORM DATA EXTRACTION
  // -----------------------------------------------------------------

  function readForm(form) {
    var data = {};
    var multiFields = ['operating_regions', 'us_states', 'data_types', 'customer_types', 'contracts', 'provider_role'];

    var fd = new FormData(form);
    fd.forEach(function (value, key) {
      if (multiFields.indexOf(key) === -1) {
        data[key] = value;
      }
    });

    multiFields.forEach(function (field) {
      data[field] = Array.from(form.querySelectorAll('input[name="' + field + '"]:checked'))
        .map(function (el) { return el.value; });
    });

    // Derive `industry` from `business_type` so existing framework triggers
    // (which reference industry) keep working unchanged.
    if (data.business_type && BUSINESS_TYPE_TO_INDUSTRY[data.business_type]) {
      data.industry = BUSINESS_TYPE_TO_INDUSTRY[data.business_type];
    }

    return data;
  }

  // -----------------------------------------------------------------
  // CONDITION EVALUATION (for framework rules)
  // -----------------------------------------------------------------

  function evaluateCondition(conditions, data) {
    if (!conditions || Object.keys(conditions).length === 0) return true;

    for (var key in conditions) {
      if (!Object.prototype.hasOwnProperty.call(conditions, key)) continue;
      var expected = conditions[key];

      if (key.endsWith('_includes')) {
        var field = key.slice(0, -'_includes'.length);
        var value = data[field];
        if (!Array.isArray(value) || value.indexOf(expected) === -1) return false;
      } else if (key.endsWith('_in')) {
        var field2 = key.slice(0, -'_in'.length);
        var value2 = data[field2];
        if (!Array.isArray(expected) || expected.indexOf(value2) === -1) return false;
      } else {
        if (data[key] !== expected) return false;
      }
    }
    return true;
  }

  function evaluateFramework(framework, data) {
    var tier = null;
    var reasons = [];
    var tierPriority = { definite: 3, likely: 2, consider: 1 };

    framework.evaluators.forEach(function (ev) {
      if (evaluateCondition(ev.conditions, data)) {
        reasons.push({ level: ev.level, reason: ev.reason });
        if (!tier || tierPriority[ev.level] > tierPriority[tier]) {
          tier = ev.level;
        }
      }
    });

    if (!tier) return null;

    var winningReasons = reasons
      .filter(function (r) { return tierPriority[r.level] >= tierPriority[tier]; })
      .map(function (r) { return r.reason; });

    return {
      framework: framework,
      tier: tier,
      reasons: winningReasons
    };
  }

  // -----------------------------------------------------------------
  // VALIDATION
  // -----------------------------------------------------------------

  function validate(data, form) {
    if (!data.operating_regions || data.operating_regions.length === 0) {
      return 'Please select at least one operating region in section 1 before generating.';
    }

    var requiredAlways = ['business_type', 'public_status'];
    for (var i = 0; i < requiredAlways.length; i++) {
      var f = requiredAlways[i];
      if (!data[f]) {
        return 'Please complete the ' + f.replace(/_/g, ' ') + ' field before generating.';
      }
    }

    // Multi-select fields with a "None of the above" option require explicit selection
    if (!data.data_types || data.data_types.length === 0) {
      return 'Please answer the "Data handled" question. Select "None of the above" if no sensitive data is handled.';
    }

    var conditionalRequired = ['revenue', 'employees', 'card_handling', 'critical_infra'];
    for (var j = 0; j < conditionalRequired.length; j++) {
      var cf = conditionalRequired[j];
      var fieldEl = form.querySelector('[data-field="' + cf + '"]');
      if (fieldEl && fieldEl.classList.contains('visible') && !data[cf]) {
        return 'Please complete the ' + cf.replace(/_/g, ' ') + ' field before generating.';
      }
    }

    // provider_role: when visible, requires explicit selection (has "Not a service provider..." option)
    var providerEl = form.querySelector('[data-field="provider_role"]');
    if (providerEl && providerEl.classList.contains('visible') && (!data.provider_role || data.provider_role.length === 0)) {
      return 'Please answer the service provider role question. Select "Not a service provider in any of these ways" if not applicable.';
    }

    return null;
  }

  // -----------------------------------------------------------------
  // RENDERING
  // -----------------------------------------------------------------

  var TIER_META = {
    definite: { label: 'Definitely applies', screenSummary: 'definitely apply', order: 1 },
    likely:   { label: 'Likely applies',     screenSummary: 'likely apply',     order: 2 },
    consider: { label: 'Recommended',         screenSummary: 'recommended',      order: 3 }
  };

  function formatDate(d) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function populatePrintReportHeader(clientName, mspName, totalCount, grouped) {
    // Fill in the print-only report header fields
    var clientRow = document.querySelector('.report-client-row');
    var clientSpan = document.querySelector('.report-client');
    var mspRow = document.querySelector('.report-msp-row');
    var mspSpan = document.querySelector('.report-msp');
    var dateSpan = document.querySelector('.report-date');
    var summarySpan = document.querySelector('.report-summary');

    if (clientName) {
      clientSpan.textContent = clientName;
      clientRow.classList.remove('empty');
    } else {
      clientSpan.textContent = '';
      clientRow.classList.add('empty');
    }

    if (mspName) {
      mspSpan.textContent = mspName;
      mspRow.classList.remove('empty');
    } else {
      mspSpan.textContent = '';
      mspRow.classList.add('empty');
    }

    dateSpan.textContent = formatDate(new Date());

    var summaryParts = [];
    summaryParts.push(totalCount + ' framework' + (totalCount === 1 ? '' : 's') + ' identified');
    if (grouped.definite.length) summaryParts.push(grouped.definite.length + ' definitely apply');
    if (grouped.likely.length) summaryParts.push(grouped.likely.length + ' likely apply');
    if (grouped.consider.length) summaryParts.push(grouped.consider.length + ' recommended');
    summarySpan.textContent = summaryParts.join(' · ');
  }

  function renderResults(matches, clientName, mspName) {
    var wrapper = document.getElementById('results-content-wrapper');

    if (matches.length === 0) {
      wrapper.innerHTML = '<div class="results-placeholder">' +
        '<img class="placeholder-mark placeholder-mark-light" src="assets/Dark_Blue.svg" alt="">' +
        '<img class="placeholder-mark placeholder-mark-dark" src="assets/Bright_Blue.svg" alt="">' +
        '<p class="placeholder-text">No applicable frameworks matched the provided profile. Double-check the inputs, or contribute a rule fix on GitHub if a framework should have triggered.</p>' +
        '</div>';
      populatePrintReportHeader(clientName, mspName, 0, { definite: [], likely: [], consider: [] });
      return;
    }

    var grouped = { definite: [], likely: [], consider: [] };
    matches.forEach(function (m) { grouped[m.tier].push(m); });

    var html = '<div class="results-content">';

    html += '<div class="results-header">';

    // Eyebrow: date plus optional "Prepared by" hint
    var eyebrowText = 'Compliance Profile · ' + formatDate(new Date());
    if (mspName) eyebrowText += ' · Prepared by ' + mspName;
    html += '<p class="results-eyebrow">' + escapeHtml(eyebrowText) + '</p>';

    if (clientName) {
      html += '<h2 class="results-title">' + escapeHtml(clientName) + '</h2>';
      html += '<p class="results-subtitle">' + matches.length + ' frameworks identified</p>';
    } else {
      html += '<h2 class="results-title">' + matches.length + ' frameworks identified</h2>';
    }
    html += '<div class="results-summary">';
    html += '<span><strong>' + grouped.definite.length + '</strong> definitely apply</span>';
    html += '<span><strong>' + grouped.likely.length + '</strong> likely apply</span>';
    if (grouped.consider.length) html += '<span><strong>' + grouped.consider.length + '</strong> recommended</span>';
    html += '</div>';
    html += '<div class="results-actions">';
    html += '<button type="button" class="btn btn-primary btn-small" onclick="window.downloadProfilePDF()">Download PDF</button>';
    html += '<button type="button" class="btn btn-ghost btn-small" onclick="window.print()">Print</button>';
    html += '<button type="button" class="btn btn-ghost btn-small" onclick="window.copyShareLink(this)">Copy share link</button>';
    html += '</div>';
    html += '</div>';

    ['definite', 'likely', 'consider'].forEach(function (tier) {
      var entries = grouped[tier];
      if (entries.length === 0) return;
      html += '<div class="tier">';
      html += '<div class="tier-header">';
      html += '<span class="tier-dot ' + tier + '"></span>';
      html += '<h3 class="tier-name">' + TIER_META[tier].label + '</h3>';
      html += '<span class="tier-count">' + entries.length + '</span>';
      html += '</div>';
      entries.forEach(function (m) { html += renderFrameworkCard(m, tier); });
      html += '</div>';
    });

    html += '</div>';
    wrapper.innerHTML = html;

    populatePrintReportHeader(clientName, mspName, matches.length, grouped);
  }

  function renderFrameworkCard(match, tier) {
    var fw = match.framework;
    var html = '<article class="framework-card ' + tier + '">';
    html += '<h4 class="framework-name">' + escapeHtml(fw.name) + '</h4>';
    html += '<div class="framework-meta">';
    html += '<span>' + escapeHtml(fw.category) + '</span>';
    html += '<a href="' + fw.reference_url + '" target="_blank" rel="noopener">Reference</a>';
    html += '</div>';
    html += '<p class="framework-desc">' + escapeHtml(fw.description) + '</p>';

    if (match.reasons.length) {
      html += '<div class="reasons-label">Why this applies</div>';
      html += '<ul class="reasons-list">';
      match.reasons.forEach(function (r) {
        html += '<li>' + escapeHtml(r) + '</li>';
      });
      html += '</ul>';
    }

    if (fw.first_steps && fw.first_steps.length) {
      html += '<div class="first-steps-label">Where to start</div>';
      html += '<ul class="first-steps-list">';
      fw.first_steps.forEach(function (step) {
        html += '<li>' + escapeHtml(step) + '</li>';
      });
      html += '</ul>';
    }

    html += '</article>';
    return html;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // -----------------------------------------------------------------
  // SHAREABLE URL (encode/decode profile via base64 in hash)
  // -----------------------------------------------------------------

  var SCHEMA_VERSION = 2;

  function encodeProfileToHash(data) {
    var payload = { v: SCHEMA_VERSION, profile: data };
    var json = JSON.stringify(payload);
    // Unicode-safe base64
    var b64 = btoa(unescape(encodeURIComponent(json)));
    return '#p=' + b64;
  }

  function decodeProfileFromHash() {
    var hash = window.location.hash || '';
    if (hash.indexOf('#p=') !== 0) return null;
    try {
      var b64 = hash.substring(3);
      var json = decodeURIComponent(escape(atob(b64)));
      var payload = JSON.parse(json);
      if (payload.v !== SCHEMA_VERSION) {
        console.warn('Profile URL schema version mismatch:', payload.v);
        return null;
      }
      return payload.profile;
    } catch (e) {
      console.warn('Failed to decode profile from URL hash:', e);
      return null;
    }
  }

  function updateUrlHash(data) {
    try {
      var hash = encodeProfileToHash(data);
      // replaceState avoids polluting browser history
      history.replaceState(null, '', hash);
    } catch (e) {
      console.warn('Failed to update URL hash:', e);
    }
  }

  function clearUrlHash() {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function applyProfileToForm(form, profile) {
    if (!profile || typeof profile !== 'object') return;

    Object.keys(profile).forEach(function (name) {
      var value = profile[name];

      if (Array.isArray(value)) {
        // Multi-value (checkboxes)
        value.forEach(function (v) {
          var cb = form.querySelector('[name="' + name + '"][value="' + cssEscape(String(v)) + '"]');
          if (cb) cb.checked = true;
        });
      } else if (typeof value === 'string' && value.length) {
        // Try radio match first (named radio groups have multiple inputs)
        var radio = form.querySelector('[name="' + name + '"][type="radio"][value="' + cssEscape(value) + '"]');
        if (radio) {
          radio.checked = true;
        } else {
          // Otherwise it's a select or text input
          var input = form.querySelector('select[name="' + name + '"], input[name="' + name + '"]:not([type="radio"]):not([type="checkbox"])');
          if (input) input.value = value;
        }
      }
    });
  }

  function cssEscape(str) {
    // Minimal escape for attribute selector values
    return String(str).replace(/[\\"]/g, '\\$&');
  }

  // -----------------------------------------------------------------
  // LAST RESULTS STORAGE (so post-render buttons can access data)
  // -----------------------------------------------------------------

  var lastResults = { matches: [], clientName: '', mspName: '' };

  // -----------------------------------------------------------------
  // GLOBAL BUTTON HANDLERS (exposed for inline onclick)
  // -----------------------------------------------------------------

  window.copyShareLink = function (btn) {
    var url = window.location.href;
    var revertLabel = function () {
      if (btn) btn.textContent = 'Copy share link';
    };
    var showCopied = function () {
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(revertLabel, 2000);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(showCopied).catch(function () {
        // Fallback prompt
        window.prompt('Copy this link:', url);
      });
    } else {
      window.prompt('Copy this link:', url);
    }
  };

  // -----------------------------------------------------------------
  // EVENT HANDLERS
  // -----------------------------------------------------------------

  function handleSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var data = readForm(form);

    var error = validate(data, form);
    if (error) {
      alert(error);
      return;
    }

    var clientName = (data.company_name || '').trim();
    var mspName = (data.msp_name || '').trim();

    var matches = window.COMPLIANCE_DATA.frameworks
      .map(function (fw) { return evaluateFramework(fw, data); })
      .filter(function (m) { return m !== null; });

    // Apply suppression: if a framework declares `suppressed_by: [...]` and any of those IDs are in the matches, drop it.
    var matchIds = matches.map(function (m) { return m.framework.id; });
    matches = matches.filter(function (m) {
      var suppressors = m.framework.suppressed_by;
      if (!Array.isArray(suppressors) || !suppressors.length) return true;
      return !suppressors.some(function (id) { return matchIds.indexOf(id) !== -1; });
    });

    // Apply baseline suppression: if any framework flagged `is_baseline: true` fires at definite
    // or likely tier, drop generic baselines flagged `suppressed_by_baseline: true` (e.g., CIS, NIST CSF).
    var baselineApplies = matches.some(function (m) {
      return m.framework.is_baseline && (m.tier === 'definite' || m.tier === 'likely');
    });
    if (baselineApplies) {
      matches = matches.filter(function (m) { return !m.framework.suppressed_by_baseline; });
    }

    var tierOrder = { definite: 0, likely: 1, consider: 2 };
    matches.sort(function (a, b) {
      if (tierOrder[a.tier] !== tierOrder[b.tier]) {
        return tierOrder[a.tier] - tierOrder[b.tier];
      }
      return a.framework.name.localeCompare(b.framework.name);
    });

    renderResults(matches, clientName, mspName);

    // Store for post-render button handlers (share link, PDF download)
    lastResults = { matches: matches, clientName: clientName, mspName: mspName };
    window.lastProfileResults = lastResults;

    // Update URL hash so the profile is shareable
    updateUrlHash(data);

    if (window.innerWidth < 1024) {
      document.getElementById('results-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function resetPlaceholder() {
    var wrapper = document.getElementById('results-content-wrapper');
    wrapper.innerHTML = '<div class="results-placeholder">' +
      '<img class="placeholder-mark placeholder-mark-light" src="assets/Dark_Blue.svg" alt="">' +
      '<img class="placeholder-mark placeholder-mark-dark" src="assets/Bright_Blue.svg" alt="">' +
      '<p class="placeholder-text">Complete the profile to generate a list of likely applicable frameworks and regulations<span class="accent-text">.</span></p>' +
      '</div>';

    // Clear print report header
    document.querySelector('.report-client').textContent = '';
    document.querySelector('.report-client-row').classList.add('empty');
    document.querySelector('.report-msp').textContent = '';
    document.querySelector('.report-msp-row').classList.add('empty');
    document.querySelector('.report-date').textContent = '';
    document.querySelector('.report-summary').textContent = '';
  }

  function handleReset(e) {
    var form = e.target;
    setTimeout(function () {
      updateRegionVisibility(form);
      updateConditionalFields(form);
      resetPlaceholder();
      lastResults = { matches: [], clientName: '', mspName: '' };
      window.lastProfileResults = lastResults;
      clearUrlHash();
    }, 0);
  }

  // -----------------------------------------------------------------
  // INIT
  // -----------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('profile-form');
    if (form) {
      form.addEventListener('submit', handleSubmit);
      form.addEventListener('reset', handleReset);
      form.addEventListener('change', function (e) {
        enforceExclusiveNone(form, e);
        updateRegionVisibility(form);
        updateConditionalFields(form);
      });

      // Pre-fill from URL hash if present, before initial visibility passes
      var sharedProfile = decodeProfileFromHash();
      if (sharedProfile) {
        applyProfileToForm(form, sharedProfile);
      }

      updateRegionVisibility(form);
      updateConditionalFields(form);

      // If we restored from a shared link, auto-submit to render results
      if (sharedProfile) {
        // Defer one tick so visibility updates settle first
        setTimeout(function () {
          if (form.requestSubmit) {
            form.requestSubmit();
          } else {
            // Older browsers
            var evt = new Event('submit', { cancelable: true, bubbles: true });
            form.dispatchEvent(evt);
          }
        }, 0);
      }
    }

    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }
  });

})();
