/* =================================================================
   Compliance Profile Generator - Framework Data
   -----------------------------------------------------------------
   Each framework has:
   - id, name, category, description, reference_url
   - evaluators[]: rules that determine applicability
       level: "definite" | "likely" | "consider"
       reason: human-readable explanation shown to users
       conditions: must ALL match for the evaluator to fire
           field: input field name
           equals: single-value match
           includes: array-contains match for multi-select fields
           in: input value is in the given array
   - For each framework, the HIGHEST level evaluator that fires wins.

   Tier meanings:
     - definite: Regulatory or contractual trigger is met. Direct obligation.
     - likely:   Strong indicators present but scope/timing needs verification.
     - consider: Voluntary baseline worth adopting regardless. "Recommended".
   -----------------------------------------------------------------
   Contributions welcome. Add new frameworks below the existing array,
   keep keys stable, and update reference_url if authoritative source
   moves. PRs that fix bad mappings are especially appreciated.
   ================================================================= */

window.COMPLIANCE_DATA = {
  frameworks: [

    {
      id: "hipaa",
      name: "HIPAA / HITECH",
      category: "US Federal · Healthcare",
      description: "Privacy, Security, and Breach Notification rules for protected health information held by covered entities and business associates.",
      reference_url: "https://www.hhs.gov/hipaa/index.html",
      evaluators: [
        { level: "definite", reason: "Industry is healthcare", conditions: { industry: "healthcare" } },
        { level: "definite", reason: "Handles Protected Health Information", conditions: { data_types_includes: "phi" } },
        { level: "likely", reason: "Customers include healthcare organizations (potential business associate)", conditions: { customer_types_includes: "healthcare_orgs" } }
      ]
    },

    {
      id: "pci_dss",
      name: "PCI DSS 4.0.1",
      category: "Card Brand · Payments",
      description: "Payment Card Industry Data Security Standard. Applies to any entity that stores, processes, or transmits cardholder data, with scope and validation level depending on transaction volume and role.",
      reference_url: "https://www.pcisecuritystandards.org/document_library/",
      evaluators: [
        { level: "definite", reason: "Handles payment card data", conditions: { data_types_includes: "pci" } },
        { level: "definite", reason: "Processes or stores cardholder data directly", conditions: { card_handling: "processed" } },
        { level: "definite", reason: "Service provider to merchants", conditions: { card_handling: "service_provider" } },
        { level: "likely", reason: "Accepts cards via outsourced redirect (SAQ-A scope)", conditions: { card_handling: "redirected" } },
        { level: "definite", reason: "Has card brand merchant or service provider agreement", conditions: { contracts_includes: "card_brand" } }
      ]
    },

    {
      id: "nist_csf",
      name: "NIST Cybersecurity Framework 2.0",
      category: "Voluntary · General",
      description: "Risk-based framework structured around six functions (Govern, Identify, Protect, Detect, Respond, Recover). Widely used as a baseline by organizations of all sizes and adopted as a reference by many sector regulators.",
      reference_url: "https://www.nist.gov/cyberframework",
      evaluators: [
        { level: "consider", reason: "Recommended as a foundational cybersecurity framework for organizations of any size or sector", conditions: {} }
      ]
    },

    {
      id: "nist_800_171",
      name: "NIST SP 800-171",
      category: "US Federal · Defense / Contractors",
      description: "Security requirements for protecting Controlled Unclassified Information in non-federal systems. Required by DFARS and various FAR clauses for contractors handling CUI.",
      reference_url: "https://csrc.nist.gov/pubs/sp/800/171/r3/final",
      evaluators: [
        { level: "definite", reason: "Handles Controlled Unclassified Information", conditions: { data_types_includes: "cui" } },
        { level: "definite", reason: "Subject to DFARS 252.204-7012 / 7019 / 7020", conditions: { contracts_includes: "dfars" } },
        { level: "definite", reason: "FAR contracts require NIST SP 800-171", conditions: { contracts_includes: "far_171" } },
        { level: "likely", reason: "Industry is defense industrial base", conditions: { industry: "defense" } },
        { level: "likely", reason: "Customers include the US Department of Defense", conditions: { customer_types_includes: "dod" } }
      ]
    },

    {
      id: "cmmc",
      name: "CMMC 2.0",
      category: "US Federal · DoD Contractors",
      description: "Cybersecurity Maturity Model Certification. Level 1 (FCI, self-assessment), Level 2 (CUI, third-party assessment for most), Level 3 (DIBCAC). Phased rollout into DoD contracts beginning 2025.",
      reference_url: "https://dodcio.defense.gov/CMMC/",
      evaluators: [
        { level: "definite", reason: "Subject to DFARS 252.204-7021 (CMMC clause)", conditions: { contracts_includes: "dfars" } },
        { level: "definite", reason: "Customers include the US Department of Defense", conditions: { customer_types_includes: "dod" } },
        { level: "likely", reason: "Industry is defense industrial base", conditions: { industry: "defense" } },
        { level: "likely", reason: "Handles Federal Contract Information", conditions: { data_types_includes: "fci" } },
        { level: "likely", reason: "Handles Controlled Unclassified Information", conditions: { data_types_includes: "cui" } }
      ]
    },

    {
      id: "soc2",
      name: "SOC 2 (Type 1 / Type 2)",
      category: "Customer-Driven · Service Organizations",
      description: "AICPA Trust Services Criteria attestation, typically required by enterprise customers of SaaS, MSP, and other service organizations. Not a regulation; a customer-driven proof.",
      reference_url: "https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2",
      evaluators: [
        { level: "definite", reason: "Customers require SOC 2 reports", conditions: { contracts_includes: "soc2" } },
        { level: "likely", reason: "Operates as a SaaS provider", conditions: { provider_role_includes: "saas" } },
        { level: "likely", reason: "Operates as an MSP or MSSP", conditions: { provider_role_includes: "msp" } },
        { level: "likely", reason: "Operates as a cloud infrastructure provider", conditions: { provider_role_includes: "cloud" } }
      ]
    },

    {
      id: "iso_27001",
      name: "ISO/IEC 27001:2022",
      category: "International · Certification",
      description: "International standard for information security management systems (ISMS). Often required by international customers and a common alternative or complement to SOC 2.",
      reference_url: "https://www.iso.org/standard/27001",
      evaluators: [
        { level: "definite", reason: "Customers require ISO 27001 certification", conditions: { contracts_includes: "iso27001" } },
        { level: "likely", reason: "Operations or customers in EU / EEA", conditions: { international_includes: "eu" } },
        { level: "likely", reason: "Operations or customers in the UK", conditions: { international_includes: "uk" } }
      ]
    },

    {
      id: "gdpr",
      name: "EU GDPR",
      category: "International · Privacy",
      description: "General Data Protection Regulation. Applies to processing of personal data of EU / EEA data subjects regardless of where the controller or processor is located.",
      reference_url: "https://gdpr.eu/",
      evaluators: [
        { level: "definite", reason: "Operations or data subjects in EU / EEA", conditions: { international_includes: "eu" } }
      ]
    },

    {
      id: "uk_gdpr",
      name: "UK GDPR / Data Protection Act 2018",
      category: "International · Privacy",
      description: "UK's retained version of GDPR alongside the Data Protection Act 2018. Applies to processing of UK data subjects' personal data.",
      reference_url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/",
      evaluators: [
        { level: "definite", reason: "Operations or data subjects in the UK", conditions: { international_includes: "uk" } }
      ]
    },

    {
      id: "ccpa_cpra",
      name: "CCPA / CPRA",
      category: "US State · Privacy (California)",
      description: "California Consumer Privacy Act as amended by the California Privacy Rights Act. Applies to qualifying for-profit businesses handling California residents' personal information.",
      reference_url: "https://cppa.ca.gov/regulations/",
      evaluators: [
        { level: "definite", reason: "Operations or customers in California", conditions: { us_states_includes: "ca" } },
        { level: "likely", reason: "Revenue over $25M with California consumer data", conditions: { revenue_in: ["50m_250m", "over_250m"] } }
      ]
    },

    {
      id: "ny_dfs_500",
      name: "NY DFS 23 NYCRR Part 500",
      category: "US State · Financial Services (New York)",
      description: "New York Department of Financial Services cybersecurity regulation. Applies to entities authorized under NY banking, insurance, or financial services law. Amended in 2023 with new governance, MFA, and incident reporting requirements.",
      reference_url: "https://www.dfs.ny.gov/industry_guidance/cybersecurity",
      evaluators: [
        { level: "definite", reason: "Industry is financial services with New York operations", conditions: { industry: "financial_services", us_states_includes: "ny" } },
        { level: "definite", reason: "Industry is insurance with New York operations", conditions: { industry: "insurance", us_states_includes: "ny" } },
        { level: "likely", reason: "Operations in New York with financial customers", conditions: { us_states_includes: "ny", customer_types_includes: "financial_orgs" } }
      ]
    },

    {
      id: "glba",
      name: "GLBA / FTC Safeguards Rule",
      category: "US Federal · Financial Services",
      description: "Gramm-Leach-Bliley Act and the FTC Safeguards Rule (16 CFR Part 314). Applies to non-bank financial institutions, including many businesses that handle customer financial information (lenders, advisors, tax preparers, auto dealers, payday lenders).",
      reference_url: "https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know",
      evaluators: [
        { level: "definite", reason: "Industry is financial services", conditions: { industry: "financial_services" } },
        { level: "definite", reason: "Handles consumer financial records", conditions: { data_types_includes: "financial" } },
        { level: "likely", reason: "Industry is insurance", conditions: { industry: "insurance" } }
      ]
    },

    {
      id: "sox",
      name: "Sarbanes-Oxley (SOX)",
      category: "US Federal · Public Companies",
      description: "Internal controls over financial reporting (Section 404) and other governance requirements applicable to companies with securities registered under the Securities Exchange Act of 1934.",
      reference_url: "https://www.sec.gov/about/laws/soa2002.pdf",
      evaluators: [
        { level: "definite", reason: "Publicly traded on US exchange", conditions: { public_status: "public" } },
        { level: "likely", reason: "Planning IPO within 24 months", conditions: { public_status: "planning_ipo" } }
      ]
    },

    {
      id: "sec_cyber",
      name: "SEC Cybersecurity Disclosure Rules",
      category: "US Federal · Public Companies",
      description: "SEC rules adopted in 2023 requiring registrants to disclose material cybersecurity incidents within four business days on Form 8-K and annually describe cybersecurity risk management and governance on Form 10-K.",
      reference_url: "https://www.sec.gov/files/rules/final/2023/33-11216.pdf",
      evaluators: [
        { level: "definite", reason: "Publicly traded on US exchange", conditions: { public_status: "public" } },
        { level: "likely", reason: "Planning IPO within 24 months", conditions: { public_status: "planning_ipo" } }
      ]
    },

    {
      id: "ferpa",
      name: "FERPA",
      category: "US Federal · Education",
      description: "Family Educational Rights and Privacy Act. Applies to educational agencies and institutions that receive federal funding under Department of Education programs.",
      reference_url: "https://studentprivacy.ed.gov/",
      evaluators: [
        { level: "definite", reason: "Industry is education", conditions: { industry: "education" } },
        { level: "definite", reason: "Handles student educational records", conditions: { data_types_includes: "student" } },
        { level: "likely", reason: "Customers include educational institutions", conditions: { customer_types_includes: "education" } }
      ]
    },

    {
      id: "coppa",
      name: "COPPA",
      category: "US Federal · Children's Privacy",
      description: "Children's Online Privacy Protection Act. Applies to operators of websites or online services directed to children under 13, or those with actual knowledge that they collect personal information from children under 13.",
      reference_url: "https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa",
      evaluators: [
        { level: "definite", reason: "Handles personal data of children under 13", conditions: { data_types_includes: "children" } }
      ]
    },

    {
      id: "fedramp",
      name: "FedRAMP",
      category: "US Federal · Cloud Authorization",
      description: "Federal Risk and Authorization Management Program. Required for cloud service offerings used by US federal agencies, with authorization levels (Low, Moderate, High) based on data sensitivity.",
      reference_url: "https://www.fedramp.gov/",
      evaluators: [
        { level: "definite", reason: "Cloud provider with US federal civilian customers", conditions: { provider_role_includes: "cloud", customer_types_includes: "federal_civilian" } },
        { level: "definite", reason: "SaaS provider with US federal civilian customers", conditions: { provider_role_includes: "saas", customer_types_includes: "federal_civilian" } },
        { level: "likely", reason: "Cloud or SaaS provider with DoD customers", conditions: { customer_types_includes: "dod" } }
      ]
    },

    {
      id: "cis_v8",
      name: "CIS Critical Security Controls v8.1",
      category: "Voluntary · General",
      description: "Prioritized set of cybersecurity actions organized into 18 control groups, with implementation groups (IG1, IG2, IG3) scaled to organization size and risk. Widely used as a practical baseline.",
      reference_url: "https://www.cisecurity.org/controls",
      evaluators: [
        { level: "consider", reason: "Recommended as a practical implementation baseline alongside any required framework", conditions: {} }
      ]
    },

    {
      id: "ny_shield",
      name: "NY SHIELD Act",
      category: "US State · Privacy and Breach (New York)",
      description: "Stop Hacks and Improve Electronic Data Security Act. Applies to any business that owns or licenses computerized data containing private information of a New York resident.",
      reference_url: "https://ag.ny.gov/internet/data-breach",
      evaluators: [
        { level: "definite", reason: "Operations or customers in New York", conditions: { us_states_includes: "ny" } }
      ]
    },

    {
      id: "tx_dpsa",
      name: "Texas Data Privacy and Security Act",
      category: "US State · Privacy (Texas)",
      description: "Texas's comprehensive privacy law applying to businesses that conduct business in Texas or produce products or services consumed by Texas residents and process or sell personal data, with broader scope than many state laws.",
      reference_url: "https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights",
      evaluators: [
        { level: "definite", reason: "Operations or customers in Texas", conditions: { us_states_includes: "tx" } }
      ]
    },

    {
      id: "ma_201",
      name: "Massachusetts 201 CMR 17.00",
      category: "US State · Data Protection (Massachusetts)",
      description: "Standards for the protection of personal information of residents of the Commonwealth. Requires a written information security program (WISP) and specific technical safeguards.",
      reference_url: "https://www.mass.gov/regulations/201-CMR-17-standards-for-the-protection-of-personal-information-of-residents-of-the-commonwealth",
      evaluators: [
        { level: "definite", reason: "Operations or customers in Massachusetts", conditions: { us_states_includes: "ma" } }
      ]
    },

    {
      id: "co_privacy",
      name: "Colorado Privacy Act",
      category: "US State · Privacy (Colorado)",
      description: "Comprehensive consumer data privacy law for Colorado residents, applicable to controllers that meet defined thresholds for processing personal data of Colorado consumers.",
      reference_url: "https://coag.gov/resources/colorado-privacy-act/",
      evaluators: [
        { level: "definite", reason: "Operations or customers in Colorado", conditions: { us_states_includes: "co" } }
      ]
    },

    {
      id: "va_cdpa",
      name: "Virginia Consumer Data Protection Act",
      category: "US State · Privacy (Virginia)",
      description: "Comprehensive privacy law applying to entities that control or process personal data of at least 100,000 Virginia consumers, or 25,000 consumers if 50%+ of revenue comes from data sales.",
      reference_url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/",
      evaluators: [
        { level: "definite", reason: "Operations or customers in Virginia", conditions: { us_states_includes: "va" } }
      ]
    },

    {
      id: "ct_dpa",
      name: "Connecticut Data Privacy Act",
      category: "US State · Privacy (Connecticut)",
      description: "Connecticut's comprehensive privacy law applying to controllers that meet processing or revenue thresholds related to Connecticut residents' personal data.",
      reference_url: "https://portal.ct.gov/AG/Sections/Privacy/The-Connecticut-Data-Privacy-Act",
      evaluators: [
        { level: "definite", reason: "Operations or customers in Connecticut", conditions: { us_states_includes: "ct" } }
      ]
    },

    {
      id: "nerc_cip",
      name: "NERC CIP",
      category: "US Federal · Energy (Bulk Electric)",
      description: "North American Electric Reliability Corporation Critical Infrastructure Protection standards. Applies to entities that own, operate, or use the bulk electric system in North America.",
      reference_url: "https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx",
      evaluators: [
        { level: "definite", reason: "Critical infrastructure operator in energy sector", conditions: { critical_infra: "energy" } }
      ]
    },

    {
      id: "cjis",
      name: "FBI CJIS Security Policy",
      category: "US Federal · Law Enforcement Data",
      description: "FBI Criminal Justice Information Services Security Policy. Applies to any organization that accesses, stores, or processes criminal justice information.",
      reference_url: "https://www.fbi.gov/services/cjis/cjis-security-policy-resource-center",
      evaluators: [
        { level: "definite", reason: "Handles Criminal Justice Information", conditions: { data_types_includes: "cji" } }
      ]
    },

    {
      id: "irs_1075",
      name: "IRS Publication 1075",
      category: "US Federal · Tax Information",
      description: "Tax Information Security Guidelines for Federal, State, and Local Agencies. Applies to organizations that access Federal Tax Information.",
      reference_url: "https://www.irs.gov/privacy-disclosure/safeguards-program",
      evaluators: [
        { level: "definite", reason: "Handles Federal Tax Information", conditions: { data_types_includes: "fti" } }
      ]
    },

    {
      id: "state_breach",
      name: "US state breach notification laws",
      category: "US State · Breach Notification (All 50 + DC)",
      description: "All 50 US states, DC, Puerto Rico, Guam, and US Virgin Islands have breach notification laws. Triggered by unauthorized access to defined categories of personal information of state residents, with varying definitions, timelines, and content requirements.",
      reference_url: "https://www.ncsl.org/technology-and-communication/security-breach-notification-laws",
      evaluators: [
        { level: "definite", reason: "Handles general PII", conditions: { data_types_includes: "pii" } },
        { level: "likely", reason: "Operations across multiple US states", conditions: { us_states_includes: "other_us" } }
      ]
    }

  ]
};
