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
           operating_regions_includes: array-contains match for regions
           us_states_includes / data_types_includes / etc: same pattern
           in: input value is in the given array
   - first_steps[]: short actionable bullets shown under each card
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
        { level: "definite", reason: "Industry is healthcare with US operations", conditions: { industry: "healthcare", operating_regions_includes: "us" } },
        { level: "definite", reason: "Handles Protected Health Information with US operations", conditions: { data_types_includes: "phi", operating_regions_includes: "us" } },
        { level: "likely", reason: "US operations with healthcare organization customers (potential business associate)", conditions: { customer_types_includes: "healthcare_orgs", operating_regions_includes: "us" } }
      ],
      first_steps: [
        "Complete and document a HIPAA Security Risk Analysis (45 CFR 164.308(a)(1)(ii)(A))",
        "Designate Privacy Officer and Security Officer",
        "Execute Business Associate Agreements (BAAs) with all service providers handling PHI",
        "Implement administrative, physical, and technical safeguards from the Security Rule",
        "Develop and test incident response and breach notification procedures"
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
      ],
      first_steps: [
        "Determine your SAQ type or RoC level based on transaction volume and acceptance method",
        "Map and minimize the cardholder data environment (CDE)",
        "Engage a Qualified Security Assessor (QSA) if you are a Level 1 merchant or service provider",
        "Implement the 12 PCI DSS requirements applicable to your scope",
        "Annually validate compliance and provide an Attestation of Compliance to your acquirer"
      ]
    },

    {
      id: "nist_csf",
      name: "NIST Cybersecurity Framework 2.0",
      category: "Voluntary · General",
      description: "Risk-based framework structured around six functions (Govern, Identify, Protect, Detect, Respond, Recover). Widely used as a baseline by organizations of all sizes and adopted as a reference by many sector regulators.",
      reference_url: "https://www.nist.gov/cyberframework",
      suppressed_by_baseline: true,
      evaluators: [
        { level: "consider", reason: "Recommended as a foundational cybersecurity framework for organizations of any size or sector", conditions: {} }
      ],
      first_steps: [
        "Establish your current profile (where you are) across the six functions",
        "Define a target profile (where you want to be) based on risk and business priorities",
        "Identify gaps between current and target and prioritize implementation",
        "Document cybersecurity governance, roles, and reporting to leadership (Govern function)",
        "Continuously assess, improve, and report progress against the target profile"
      ]
    },

    {
      id: "nist_800_171",
      name: "NIST SP 800-171",
      category: "US Federal · Civilian Contractors",
      description: "Security requirements for protecting Controlled Unclassified Information in non-federal systems. Required by various FAR and agency-specific clauses for federal civilian contractors handling CUI. DoD contractors handling CUI should follow CMMC, which incorporates the 800-171 controls along with assessment requirements.",
      reference_url: "https://csrc.nist.gov/pubs/sp/800/171/r3/final",
      is_baseline: true,
      evaluators: [
        { level: "definite", reason: "Federal civilian customer with CUI handling triggers NIST 800-171 compliance under FAR and agency-specific clauses (GSA, NASA, HHS, etc.)", conditions: { customer_types_includes: "federal_civilian", data_types_includes: "cui" } },
        { level: "definite", reason: "FAR contracts require NIST SP 800-171", conditions: { contracts_includes: "far_171" } },
        { level: "likely", reason: "Federal civilian customer relationships frequently involve CUI handling under various FAR clauses", conditions: { customer_types_includes: "federal_civilian" } }
      ],
      first_steps: [
        "Complete a System Security Plan (SSP) documenting all applicable controls",
        "Document any gaps in a Plan of Action and Milestones (POA&M)",
        "Submit your Supplier Performance Risk System (SPRS) score for DoD contracts",
        "Implement multifactor authentication on systems processing CUI",
        "Validate compliance via annual self-assessment or third-party assessment"
      ]
    },

    {
      id: "cmmc",
      name: "CMMC 2.0",
      category: "US Federal · DoD Contractors",
      description: "Cybersecurity Maturity Model Certification. Level 1 (FCI, self-assessment), Level 2 (CUI, third-party assessment for most), Level 3 (DIBCAC). Phased rollout into DoD contracts beginning 2025.",
      reference_url: "https://dodcio.defense.gov/CMMC/",
      is_baseline: true,
      evaluators: [
        { level: "definite", reason: "Subject to DFARS 252.204-7021 (CMMC clause)", conditions: { contracts_includes: "dfars" } },
        { level: "definite", reason: "Customers include the US Department of Defense", conditions: { customer_types_includes: "dod" } },
        { level: "likely", reason: "Industry is defense industrial base", conditions: { industry: "defense" } },
        { level: "likely", reason: "Handles Federal Contract Information", conditions: { data_types_includes: "fci" } },
        { level: "likely", reason: "Handles Controlled Unclassified Information", conditions: { data_types_includes: "cui" } }
      ],
      first_steps: [
        "Determine your required CMMC level based on contract clauses (1, 2, or 3)",
        "Implement NIST SP 800-171 controls if pursuing Level 2 or higher",
        "Engage a Certified Third-Party Assessor Organization (C3PAO) for Level 2 assessments",
        "Document System Security Plan and Plan of Action and Milestones",
        "Maintain annual affirmations of continued compliance"
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
      ],
      first_steps: [
        "Choose Trust Services Criteria (Security required; add others as relevant to your service)",
        "Decide between Type 1 (point-in-time) and Type 2 (operating effectiveness over time)",
        "Engage a licensed CPA firm to perform the audit",
        "Document policies, procedures, and controls aligned to chosen criteria",
        "Remediate any control gaps before audit fieldwork begins"
      ]
    },

    {
      id: "iso_27001",
      name: "ISO/IEC 27001:2022",
      category: "International · Certification",
      description: "International standard for information security management systems (ISMS). Often required by international customers and a common alternative or complement to SOC 2.",
      reference_url: "https://www.iso.org/standard/27001",
      is_baseline: true,
      evaluators: [
        { level: "definite", reason: "Customers require ISO 27001 certification", conditions: { contracts_includes: "iso27001" } },
        { level: "likely", reason: "Operations or customers in EU / EEA", conditions: { operating_regions_includes: "eu" } },
        { level: "likely", reason: "Operations or customers in the UK", conditions: { operating_regions_includes: "uk" } }
      ],
      first_steps: [
        "Define your Information Security Management System (ISMS) scope and policy",
        "Conduct a documented risk assessment and treatment plan",
        "Apply Annex A controls and complete a Statement of Applicability",
        "Engage an accredited Certification Body for Stage 1 and Stage 2 audits",
        "Maintain certification through internal audits and management reviews"
      ]
    },

    {
      id: "gdpr",
      name: "EU GDPR",
      category: "International · Privacy",
      description: "General Data Protection Regulation. Applies to processing of personal data of EU / EEA data subjects regardless of where the controller or processor is located.",
      reference_url: "https://gdpr.eu/",
      evaluators: [
        { level: "definite", reason: "Operations or data subjects in EU / EEA", conditions: { operating_regions_includes: "eu" } }
      ],
      first_steps: [
        "Map personal data processing activities and maintain Records of Processing (Article 30)",
        "Identify and document lawful basis for each processing activity (Article 6)",
        "Implement data subject rights procedures (access, rectification, erasure, portability)",
        "Appoint a Data Protection Officer if required (Article 37)",
        "Conduct Data Protection Impact Assessments for high-risk processing"
      ]
    },

    {
      id: "nis2",
      name: "EU NIS2 Directive",
      category: "International · Critical Infrastructure (EU)",
      description: "EU Directive 2022/2555 on measures for a high common level of cybersecurity across the Union. Replaces NIS1 with expanded sector coverage including essential entities (energy, transport, banking, financial market infrastructure, healthcare, digital infrastructure, ICT service management, public administration) and important entities (postal, waste, chemicals, food, manufacturing of critical products, digital providers, research). Generally applies to medium and large organizations (50+ employees or over €10M turnover) in scoped sectors. Member state transposition deadline was October 2024.",
      reference_url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
      evaluators: [
        { level: "definite", reason: "Energy sector with EU operations and 50+ employees (essential entity, meets NIS2 size threshold)", conditions: { industry: "energy", operating_regions_includes: "eu", employees_in: ["51_250", "251_1000", "over_1000"] } },
        { level: "definite", reason: "Healthcare sector with EU operations and 50+ employees (essential entity, meets NIS2 size threshold)", conditions: { industry: "healthcare", operating_regions_includes: "eu", employees_in: ["51_250", "251_1000", "over_1000"] } },
        { level: "definite", reason: "Financial services with EU operations and 50+ employees (essential entity, meets NIS2 size threshold)", conditions: { industry: "financial_services", operating_regions_includes: "eu", employees_in: ["51_250", "251_1000", "over_1000"] } },
        { level: "definite", reason: "Technology / ICT service management with EU operations and 50+ employees (essential entity, meets NIS2 size threshold)", conditions: { industry: "technology", operating_regions_includes: "eu", employees_in: ["51_250", "251_1000", "over_1000"] } },
        { level: "definite", reason: "Manufacturing with EU operations and 50+ employees (potentially important entity, meets NIS2 size threshold)", conditions: { industry: "manufacturing", operating_regions_includes: "eu", employees_in: ["51_250", "251_1000", "over_1000"] } },
        { level: "definite", reason: "Government / public administration with EU operations and 50+ employees (essential entity, meets NIS2 size threshold)", conditions: { industry: "government", operating_regions_includes: "eu", employees_in: ["51_250", "251_1000", "over_1000"] } },
        { level: "likely", reason: "Energy sector with EU operations (essential entity under NIS2, verify size threshold)", conditions: { industry: "energy", operating_regions_includes: "eu" } },
        { level: "likely", reason: "Healthcare sector with EU operations (essential entity under NIS2, verify size threshold)", conditions: { industry: "healthcare", operating_regions_includes: "eu" } },
        { level: "likely", reason: "Financial services with EU operations (essential entity under NIS2, verify size threshold)", conditions: { industry: "financial_services", operating_regions_includes: "eu" } },
        { level: "likely", reason: "Technology / ICT service management with EU operations (essential entity under NIS2, verify size threshold)", conditions: { industry: "technology", operating_regions_includes: "eu" } },
        { level: "likely", reason: "Manufacturing with EU operations (potentially important entity under NIS2, verify size threshold)", conditions: { industry: "manufacturing", operating_regions_includes: "eu" } },
        { level: "likely", reason: "Government / public administration with EU operations (essential entity under NIS2, verify size threshold)", conditions: { industry: "government", operating_regions_includes: "eu" } }
      ],
      first_steps: [
        "Determine if you are an essential or important entity under your member state's transposition",
        "Implement minimum cybersecurity risk-management measures (Article 21)",
        "Establish incident reporting (24-hour early warning, 72-hour incident notification)",
        "Ensure management body oversight and approval of cybersecurity measures",
        "Register with the competent national authority in your member state"
      ]
    },

    {
      id: "uk_gdpr",
      name: "UK GDPR / Data Protection Act 2018",
      category: "International · Privacy",
      description: "UK's retained version of GDPR alongside the Data Protection Act 2018. Applies to processing of UK data subjects' personal data.",
      reference_url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/",
      evaluators: [
        { level: "definite", reason: "Operations or data subjects in the UK", conditions: { operating_regions_includes: "uk" } }
      ],
      first_steps: [
        "Document lawful basis for processing UK data subjects' data",
        "Register with the Information Commissioner's Office and pay the data protection fee",
        "Implement individual rights procedures (subject access, rectification, erasure)",
        "Conduct Data Protection Impact Assessments for high-risk processing",
        "Establish 72-hour ICO breach notification procedures"
      ]
    },

    {
      id: "cyber_essentials",
      name: "UK Cyber Essentials",
      category: "International · Certification (UK)",
      description: "UK Government-backed cybersecurity certification scheme run by the National Cyber Security Centre (NCSC) and administered by IASME. Two levels: Cyber Essentials (self-assessment) and Cyber Essentials Plus (independently audited). Required for many UK central government contracts handling personal information or providing certain technical services. Commonly required by UK commercial contracts, cyber insurers, and supply chain partners.",
      reference_url: "https://www.ncsc.gov.uk/cyberessentials/overview",
      evaluators: [
        { level: "likely", reason: "Operations or customers in the UK (commonly required by UK contracts and insurers)", conditions: { operating_regions_includes: "uk" } }
      ],
      first_steps: [
        "Identify scope (which systems, devices, and users are in the assessment)",
        "Implement the five technical controls: firewalls, secure configuration, user access, malware protection, patching",
        "Complete the IASME self-assessment questionnaire",
        "Get certified via an IASME-accredited certification body",
        "Consider Cyber Essentials Plus for independently audited assurance"
      ]
    },

    {
      id: "ccpa_cpra",
      name: "CCPA / CPRA",
      category: "US State · Privacy (California)",
      description: "California Consumer Privacy Act as amended by the California Privacy Rights Act. Applies to qualifying for-profit businesses handling California residents' personal information.",
      reference_url: "https://cppa.ca.gov/regulations/",
      evaluators: [
        { level: "definite", reason: "California operations with revenue over $25M (meets CCPA scope threshold)", conditions: { us_states_includes: "ca", revenue_in: ["50m_250m", "over_250m"] } },
        { level: "likely", reason: "Operations or customers in California (CCPA scope depends on revenue, consumer count, or data sale percentage)", conditions: { us_states_includes: "ca" } }
      ],
      first_steps: [
        "Update your privacy notice with required disclosures (categories, purposes, retention)",
        "Implement consumer rights mechanisms (access, deletion, opt-out, correction, limit SPI)",
        "Display 'Do Not Sell or Share My Personal Information' link prominently",
        "Execute CCPA-compliant service provider and contractor agreements",
        "Train staff on consumer request handling within 45-day response window"
      ]
    },

    {
      id: "ny_dfs_500",
      name: "NY DFS 23 NYCRR Part 500",
      category: "US State · Financial Services (New York)",
      description: "New York Department of Financial Services cybersecurity regulation. Applies directly only to Covered Entities: persons or entities operating under a DFS-issued license, charter, or similar authorization under NY Banking, Insurance, or Financial Services Law (banks, insurers, mortgage brokers, money transmitters, virtual currency businesses, etc.). The 2023 Second Amendment categorizes Covered Entities into three tiers: Class A (large entities with enhanced requirements), Standard, and Limited Exemption (smaller entities exempt from certain provisions). Third-party service providers of Covered Entities are not directly subject to Part 500, though they typically face contractual security requirements flowing down from their Covered Entity clients under Section 500.11.",
      reference_url: "https://www.dfs.ny.gov/industry_guidance/cybersecurity",
      is_baseline: true,
      suppressed_by: ["ny_dfs_500_limited_exemption"],
      evaluators: [
        { level: "definite", reason: "Industry is financial services with New York operations", conditions: { industry: "financial_services", us_states_includes: "ny" } },
        { level: "definite", reason: "Industry is insurance with New York operations", conditions: { industry: "insurance", us_states_includes: "ny" } }
      ],
      first_steps: [
        "Determine Part 500 classification: Class A (Section 500.1(d)), Standard, or Limited Exemption (Section 500.19)",
        "Designate a CISO with reporting line to senior management or board",
        "Implement a written cybersecurity program based on documented risk assessment",
        "Conduct annual penetration testing and bi-annual vulnerability assessments",
        "Require MFA on all access (with limited documented exceptions, deadline November 2025)",
        "File annual certification of compliance with DFS by April 15"
      ]
    },

    {
      id: "ny_dfs_500_class_a",
      name: "NY DFS Part 500 - Class A Company Enhanced Requirements",
      category: "US State · Financial Services (New York)",
      description: "Enhanced requirements under 23 NYCRR Part 500 for Class A Companies (Section 500.1(d)). A Covered Entity is Class A if it has at least $20 million in gross annual revenue in each of the last two fiscal years from NY business operations, AND either (a) more than 2,000 employees averaged over the last two fiscal years (including global affiliates that share cybersecurity programs), or (b) more than $1 billion in gross annual revenue in each of the last two fiscal years from global business operations. Class A obligations include annual independent cybersecurity audits, privileged access management solutions, endpoint detection and response, and automated blocking of commonly-used passwords.",
      reference_url: "https://www.dfs.ny.gov/industry_guidance/cybersecurity",
      is_baseline: true,
      evaluators: [
        { level: "definite", reason: "Large NY financial services entity (over 1,000 employees) - likely meets Class A thresholds; verify $20M+ NY revenue and 2,000+ employees or $1B+ global revenue", conditions: { industry: "financial_services", us_states_includes: "ny", employees_in: ["over_1000"] } },
        { level: "definite", reason: "Large NY insurance entity (over 1,000 employees) - likely meets Class A thresholds; verify $20M+ NY revenue and 2,000+ employees or $1B+ global revenue", conditions: { industry: "insurance", us_states_includes: "ny", employees_in: ["over_1000"] } },
        { level: "definite", reason: "Large NY financial services entity (over $250M revenue) - likely meets Class A thresholds; verify $1B+ global revenue", conditions: { industry: "financial_services", us_states_includes: "ny", revenue_in: ["over_250m"] } },
        { level: "definite", reason: "Large NY insurance entity (over $250M revenue) - likely meets Class A thresholds; verify $1B+ global revenue", conditions: { industry: "insurance", us_states_includes: "ny", revenue_in: ["over_250m"] } }
      ],
      first_steps: [
        "Conduct annual independent audit of the cybersecurity program (Section 500.2(c)) - internal or external auditor with documented independence",
        "Implement a privileged access management (PAM) solution covering all privileged accounts",
        "Implement an automated method of blocking commonly-used passwords for company-controlled accounts",
        "Deploy endpoint detection and response (EDR) tools with centralized logging and alerting (Section 500.14(b))",
        "Maintain documentation supporting Class A classification and enhanced controls for the five-year record retention requirement"
      ]
    },

    {
      id: "ny_dfs_500_limited_exemption",
      name: "NY DFS Part 500 - Limited Exemption Eligibility",
      category: "US State · Financial Services (New York)",
      description: "Smaller Covered Entities may qualify for limited exemption under Section 500.19(a). To qualify, the entity (including affiliates) must meet ALL THREE criteria: fewer than 20 employees and independent contractors, less than $7.5 million in gross annual revenue in each of the last three fiscal years from NY business operations, and less than $15 million in year-end total assets. Qualifying entities must file a Notice of Exemption through the DFS Portal. Limited Exemption entities are exempt from several sections including CISO designation (500.4(a)), independent audit, penetration testing (500.5(a)(1)), application security (500.8), monitoring (500.14(b)), and training (500.14(a)(3)) but must still comply with core sections including cybersecurity program, risk assessment, MFA, encryption, breach reporting, access privileges, and annual certification.",
      reference_url: "https://www.dfs.ny.gov/industry_guidance/cybersecurity",
      evaluators: [
        { level: "definite", reason: "Small NY financial services entity (under 50 employees, under $10M revenue) - may qualify for Limited Exemption; verify under 20 employees, under $7.5M NY revenue (3-year history), and under $15M total assets", conditions: { industry: "financial_services", us_states_includes: "ny", employees_in: ["1_50"], revenue_in: ["under_1m", "1m_10m"] } },
        { level: "definite", reason: "Small NY insurance entity (under 50 employees, under $10M revenue) - may qualify for Limited Exemption; verify under 20 employees, under $7.5M NY revenue (3-year history), and under $15M total assets", conditions: { industry: "insurance", us_states_includes: "ny", employees_in: ["1_50"], revenue_in: ["under_1m", "1m_10m"] } }
      ],
      first_steps: [
        "Verify all three exemption criteria: fewer than 20 employees and contractors (including affiliates), under $7.5M NY revenue in each of the last 3 fiscal years, under $15M year-end total assets",
        "File Notice of Exemption through the DFS Portal",
        "Comply with non-exempted core sections: cybersecurity program (500.2), policy (500.3), risk assessment (500.9), MFA (500.12), encryption (500.15), access privileges (500.7), breach reporting (500.17(a)), and certification (500.17(b))",
        "Document basis for the exemption claim and maintain supporting evidence for the five-year record retention requirement",
        "Reassess exemption eligibility annually - business growth may push the entity out of Limited Exemption into Standard tier"
      ]
    },

    {
      id: "glba",
      name: "GLBA / FTC Safeguards Rule",
      category: "US Federal · Financial Services",
      description: "Gramm-Leach-Bliley Act and the FTC Safeguards Rule (16 CFR Part 314). Applies to non-bank financial institutions, including many businesses that handle customer financial information (lenders, advisors, tax preparers, auto dealers, payday lenders).",
      reference_url: "https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know",
      evaluators: [
        { level: "definite", reason: "Industry is financial services with US operations", conditions: { industry: "financial_services", operating_regions_includes: "us" } },
        { level: "definite", reason: "Handles consumer financial records with US operations", conditions: { data_types_includes: "financial", operating_regions_includes: "us" } },
        { level: "likely", reason: "Industry is insurance with US operations", conditions: { industry: "insurance", operating_regions_includes: "us" } }
      ],
      first_steps: [
        "Designate a Qualified Individual to oversee the information security program",
        "Conduct and document a written risk assessment",
        "Implement specific safeguards: access controls, encryption, MFA, change management, monitoring",
        "Perform periodic penetration testing and vulnerability assessments",
        "Report annually to the board or governing body"
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
      ],
      first_steps: [
        "Document key internal controls over financial reporting (ICFR)",
        "Test design and operating effectiveness of those controls annually",
        "Implement CEO and CFO certification processes (Sections 302 and 906)",
        "Coordinate Section 404 management assessment and external auditor attestation",
        "Establish independent audit committee oversight and whistleblower procedures"
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
      ],
      first_steps: [
        "Establish cybersecurity risk management governance with board oversight",
        "Implement materiality assessment process for cybersecurity incidents",
        "Document four-business-day Form 8-K incident disclosure procedures",
        "Prepare Item 1C 10-K disclosures on risk management, strategy, and governance",
        "Track and document third-party cybersecurity risk management"
      ]
    },

    {
      id: "ferpa",
      name: "FERPA",
      category: "US Federal · Education",
      description: "Family Educational Rights and Privacy Act. Applies to educational agencies and institutions that receive federal funding under Department of Education programs.",
      reference_url: "https://studentprivacy.ed.gov/",
      evaluators: [
        { level: "definite", reason: "Industry is education with US operations", conditions: { industry: "education", operating_regions_includes: "us" } },
        { level: "definite", reason: "Handles student educational records with US operations", conditions: { data_types_includes: "student", operating_regions_includes: "us" } },
        { level: "likely", reason: "US operations with educational institution customers", conditions: { customer_types_includes: "education", operating_regions_includes: "us" } }
      ],
      first_steps: [
        "Publish annual notification of FERPA rights to parents and eligible students",
        "Designate directory information categories with opt-out procedures",
        "Implement procedures for parental/student inspection and amendment of records",
        "Execute vendor agreements using the school official exception where applicable",
        "Train staff on permissible disclosures and breach response"
      ]
    },

    {
      id: "coppa",
      name: "COPPA",
      category: "US Federal · Children's Privacy",
      description: "Children's Online Privacy Protection Act. Applies to operators of websites or online services directed to children under 13, or those with actual knowledge that they collect personal information from children under 13.",
      reference_url: "https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa",
      evaluators: [
        { level: "definite", reason: "Handles personal data of children under 13 with US operations", conditions: { data_types_includes: "children", operating_regions_includes: "us" } }
      ],
      first_steps: [
        "Post a clear and comprehensive children's privacy policy",
        "Obtain verifiable parental consent before collecting children's personal information",
        "Provide parents access to review and delete their child's data",
        "Implement reasonable security for children's data",
        "Limit data collection to what is reasonably necessary for the service"
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
      ],
      first_steps: [
        "Determine impact level (Low, Moderate, High) based on FIPS 199 categorization",
        "Engage a Third-Party Assessment Organization (3PAO)",
        "Document System Security Plan against applicable NIST 800-53 controls",
        "Pursue authorization via Joint Authorization Board (JAB) or Agency ATO",
        "Maintain continuous monitoring with monthly POA&M updates"
      ]
    },

    {
      id: "cis_v8",
      name: "CIS Critical Security Controls v8.1",
      category: "Voluntary · General",
      description: "Prioritized set of cybersecurity actions organized into 18 control groups, with implementation groups (IG1, IG2, IG3) scaled to organization size and risk. Widely used as a practical baseline.",
      reference_url: "https://www.cisecurity.org/controls",
      suppressed_by_baseline: true,
      evaluators: [
        { level: "consider", reason: "Recommended as a practical implementation baseline alongside any required framework", conditions: {} }
      ],
      first_steps: [
        "Determine your Implementation Group (IG1, IG2, or IG3) based on size and risk",
        "Inventory and control enterprise and software assets (Controls 1-2)",
        "Implement IG1 safeguards (56 basic-hygiene controls) before moving to IG2/IG3",
        "Use the CIS Controls Self Assessment Tool (CSAT) to track progress",
        "Map CIS Controls to other required frameworks for cross-coverage"
      ]
    },

    {
      id: "gtia_cybersecurity_trustmark",
      name: "GTIA Cybersecurity Trustmark",
      category: "Voluntary · MSP / MSSP",
      description: "Maturity-model assurance program designed specifically for IT service providers (MSPs and MSSPs) by the Global Technology Industry Association (formerly CompTIA Community). Foundationally based on the CIS Controls Implementation Group 2 (IG2) and supplemented by safeguards drawn from multiple globally recognized frameworks, the Trustmark addresses controls unique to the ITSP risk model. Demonstrates ongoing cybersecurity maturity to customers, cyber insurers, and partners. Achieved through assessment by a CREST-accredited assessor. Requires GTIA membership and a subscription to an approved GRC platform.",
      reference_url: "https://gtia.org/membership/cybersecurity-programs/trustmark",
      evaluators: [
        { level: "consider", reason: "Operating as an MSP / MSSP (industry trust mark designed specifically for IT service providers)", conditions: { provider_role_includes: "msp" } }
      ],
      first_steps: [
        "Join GTIA and submit the Cybersecurity Trustmark interest form",
        "Subscribe to an approved GRC platform (program prerequisite)",
        "Implement CIS Controls IG2 as the foundational control baseline",
        "Work through the 24-month Readiness Program safeguards (typical completion in ~10 months)",
        "Engage a CREST-accredited assessor through GTIA for the formal assessment"
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
      ],
      first_steps: [
        "Implement administrative safeguards (designated person, training, risk assessment)",
        "Implement technical safeguards (access controls, encryption, incident detection)",
        "Implement physical safeguards (facility access, secure disposal)",
        "Update breach notification procedures to meet SHIELD Act timing requirements",
        "Review vendor contracts for security obligations"
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
      ],
      first_steps: [
        "Update privacy notice to meet Texas-specific disclosure requirements",
        "Implement consumer rights mechanisms (access, deletion, correction, portability, opt-out)",
        "Conduct data protection assessments for high-risk processing",
        "Execute data processing agreements with vendors and processors",
        "Train staff on consumer rights response within statutory timelines"
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
      ],
      first_steps: [
        "Develop a Written Information Security Program (WISP)",
        "Designate one or more employees to maintain the WISP",
        "Implement required technical safeguards including encryption of regulated PI in transit and at rest",
        "Verify third-party service providers maintain comparable safeguards via contract",
        "Train employees on the WISP and incident response procedures"
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
      ],
      first_steps: [
        "Update privacy notice with required CPA disclosures",
        "Implement consumer rights (access, deletion, correction, opt-out of targeted advertising)",
        "Conduct data protection assessments for high-risk processing activities",
        "Honor Universal Opt-Out Mechanism (UOOM) signals",
        "Execute data processing agreements with vendors and processors"
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
      ],
      first_steps: [
        "Update privacy notice with required VCDPA disclosures",
        "Implement consumer rights mechanisms (access, deletion, correction, portability, opt-out)",
        "Conduct data protection assessments for sensitive data and targeted advertising",
        "Execute data processing agreements with all processors",
        "Establish 45-day consumer request response process"
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
      ],
      first_steps: [
        "Update privacy notice with required CTDPA disclosures",
        "Implement consumer rights (access, deletion, correction, portability, opt-out)",
        "Honor Universal Opt-Out Mechanism (UOOM) signals",
        "Conduct data protection assessments for high-risk processing",
        "Execute data processing agreements with processors"
      ]
    },

    {
      id: "nerc_cip",
      name: "NERC CIP",
      category: "US Federal · Energy (Bulk Electric)",
      description: "North American Electric Reliability Corporation Critical Infrastructure Protection standards. Applies to entities that own, operate, or use the bulk electric system in North America.",
      reference_url: "https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx",
      evaluators: [
        { level: "definite", reason: "Critical infrastructure operator in energy sector with US operations", conditions: { critical_infra: "energy", operating_regions_includes: "us" } }
      ],
      first_steps: [
        "Identify and classify BES Cyber Systems and associated assets (CIP-002)",
        "Implement electronic and physical security perimeters (CIP-005, CIP-006)",
        "Document personnel and training programs (CIP-004)",
        "Implement incident reporting and response plans (CIP-008)",
        "Maintain configuration change management and vulnerability assessments (CIP-007, CIP-010)"
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
      ],
      first_steps: [
        "Sign the CJIS Security Addendum with your state CJIS Systems Agency",
        "Conduct background investigations for all personnel with CJI access",
        "Implement Advanced Authentication and FIPS 140-validated encryption",
        "Maintain detailed audit logs and provide to state CSA upon request",
        "Provide annual CJIS Security Awareness Training to all authorized personnel"
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
      ],
      first_steps: [
        "Submit a Safeguard Procedures Report (SPR) to the IRS Office of Safeguards",
        "Implement NIST 800-53 controls scaled to FTI sensitivity",
        "Submit an annual Safeguard Activity Report (SAR) by January 31",
        "Restrict FTI access to authorized personnel on a need-to-know basis",
        "Prepare for triennial Safeguard Reviews by the IRS"
      ]
    },

    {
      id: "state_breach",
      name: "US state breach notification laws",
      category: "US State · Breach Notification (All 50 + DC)",
      description: "All 50 US states, DC, Puerto Rico, Guam, and US Virgin Islands have breach notification laws. Triggered by unauthorized access to defined categories of personal information of state residents, with varying definitions, timelines, and content requirements.",
      reference_url: "https://www.ncsl.org/technology-and-communication/security-breach-notification-laws",
      evaluators: [
        { level: "definite", reason: "Handles general PII with US operations", conditions: { data_types_includes: "pii", operating_regions_includes: "us" } },
        { level: "likely", reason: "Operations across multiple US states", conditions: { us_states_includes: "other_us" } }
      ],
      first_steps: [
        "Inventory regulated personal information by state of residence",
        "Establish incident detection, triage, and containment processes",
        "Document notification triggers, timelines, and content requirements per applicable state",
        "Identify recipients (consumers, attorneys general, credit reporting agencies) for each state",
        "Prepare template breach notification letters for likely scenarios"
      ]
    },

    /* =================================================================
       STATE CYBERSECURITY SAFE HARBOR LAWS
       Affirmative defenses available to entities that maintain
       qualifying cybersecurity programs. Not compliance obligations.
       Triggered in the "consider" (Recommended) tier.
       ================================================================= */

    {
      id: "oh_safe_harbor",
      name: "Ohio Data Protection Act (Safe Harbor)",
      category: "US State · Legal Protection (Ohio)",
      description: "Ohio's Data Protection Act provides an affirmative defense to tort claims arising from a data breach if the entity maintains a written cybersecurity program that reasonably conforms to a recognized framework (NIST CSF, NIST 800-171, NIST 800-53, ISO 27001, PCI DSS, FedRAMP, CIS Controls, HIPAA Security Rule, or GLBA). Not a compliance mandate but a litigation defense worth maintaining qualifying frameworks to claim.",
      reference_url: "https://codes.ohio.gov/ohio-revised-code/chapter-1354",
      evaluators: [
        { level: "consider", reason: "Ohio operations: affirmative defense to data breach tort claims available if a qualifying framework is maintained", conditions: { us_states_includes: "oh" } }
      ],
      first_steps: [
        "Select a qualifying framework (NIST CSF, ISO 27001, CIS Controls, PCI DSS, etc.)",
        "Develop a written cybersecurity program that reasonably conforms to the chosen framework",
        "Scale program to entity size, complexity, and data sensitivity",
        "Update program within one year of any framework revision",
        "Retain evidence of conformance to support affirmative defense if litigation arises"
      ]
    },

    {
      id: "ut_safe_harbor",
      name: "Utah Cybersecurity Affirmative Defense Act",
      category: "US State · Legal Protection (Utah)",
      description: "Utah's safe harbor law provides an affirmative defense to data breach tort claims if the entity maintains a written cybersecurity program reasonably conforming to a recognized framework. The defense is unavailable if the entity had actual notice of a specific threat or hazard and failed to take remedial action within a reasonable time.",
      reference_url: "https://le.utah.gov/xcode/Title78B/Chapter4/78B-4-S702.html",
      evaluators: [
        { level: "consider", reason: "Utah operations: affirmative defense to data breach tort claims available if a qualifying framework is maintained", conditions: { us_states_includes: "ut" } }
      ],
      first_steps: [
        "Select a qualifying framework (NIST CSF, ISO 27001, CIS Controls, etc.)",
        "Develop and maintain a written cybersecurity program conforming to that framework",
        "Establish processes to respond to known threats and hazards in a reasonable timeframe",
        "Document threat response decisions and remediation actions",
        "Update program within nine months of any framework revision"
      ]
    },

    {
      id: "ct_safe_harbor",
      name: "Connecticut Cybersecurity Standards Act (Safe Harbor)",
      category: "US State · Legal Protection (Connecticut)",
      description: "Connecticut's Public Act 21-119 (Conn. Gen. Stat. § 42-901) provides an affirmative defense to PUNITIVE DAMAGES only (not liability) in tort actions alleging failure to implement reasonable cybersecurity controls. The defense is unavailable for gross negligence or willful conduct. Program must conform to a recognized framework, with revision conformance required within six months.",
      reference_url: "https://www.cga.ct.gov/2021/ACT/PA/PDF/2021PA-00119-R00HB-06607-PA.PDF",
      evaluators: [
        { level: "consider", reason: "Connecticut operations: affirmative defense to punitive damages available if a qualifying framework is maintained", conditions: { us_states_includes: "ct" } }
      ],
      first_steps: [
        "Select a qualifying framework (NIST CSF, ISO 27001, CIS Controls, etc.)",
        "Develop a written cybersecurity program scaled to your entity",
        "Update program within six months of any framework revision (shorter than other states)",
        "Document program conformance and reasonable-implementation evidence",
        "Note: protects punitive damages only, not full liability; gross negligence carve-out applies"
      ]
    },

    {
      id: "ia_safe_harbor",
      name: "Iowa Cybersecurity Safe Harbor",
      category: "US State · Legal Protection (Iowa)",
      description: "Iowa's safe harbor (Iowa Code § 554G.2) provides an affirmative defense to data breach tort claims if the entity maintains a qualifying cybersecurity program AND the program's operating cost is no less than the entity's calculated maximum probable loss value. The spending threshold is a distinct requirement not found in other state safe harbors.",
      reference_url: "https://www.legis.iowa.gov/legislation/BillBook?ba=HF553&ga=90",
      evaluators: [
        { level: "consider", reason: "Iowa operations: affirmative defense to data breach tort claims available with qualifying framework AND spending threshold", conditions: { us_states_includes: "ia" } }
      ],
      first_steps: [
        "Calculate your maximum probable loss (total possible damage multiplied by probability)",
        "Select a qualifying framework (NIST CSF, ISO 27001, CIS Controls, etc.)",
        "Ensure cybersecurity program operating cost meets or exceeds the calculated loss value",
        "Develop a written program conforming to the chosen framework",
        "Document the loss calculation methodology and spending evidence for defense"
      ]
    },

    {
      id: "ok_safe_harbor",
      name: "Oklahoma Hospital Cybersecurity Safe Harbor",
      category: "US State · Legal Protection (Oklahoma)",
      description: "Oklahoma's 18 Okla. Stat. § 2070 (effective January 1, 2026) provides a safe harbor limited to HOSPITALS. Provides an affirmative defense to tort claims arising from a data breach if the hospital demonstrates reasonable conformance with HIPAA and HITECH data security regulations. Narrower than other state safe harbors in both entity scope (hospitals only) and framework scope (HIPAA/HITECH only).",
      reference_url: "https://www.oklegislature.gov/cf_pdf/2023-24%20ENR/SB/SB626%20ENR.PDF",
      evaluators: [
        { level: "consider", reason: "Oklahoma hospital operations: affirmative defense available if conformance with HIPAA/HITECH is documented", conditions: { us_states_includes: "ok", industry: "healthcare" } }
      ],
      first_steps: [
        "Confirm entity qualifies as a hospital under Oklahoma law",
        "Conduct and document a HIPAA Security Risk Analysis",
        "Implement HIPAA Security Rule administrative, physical, and technical safeguards",
        "Maintain HITECH-compliant breach notification procedures",
        "Retain evidence of HIPAA/HITECH conformance to support affirmative defense"
      ]
    },

    {
      id: "tn_safe_harbor",
      name: "Tennessee Class Action Safe Harbor",
      category: "US State · Legal Protection (Tennessee)",
      description: "Tennessee HB 2434 (effective May 21, 2024) provides that a private entity is not liable in a class action lawsuit resulting from a cybersecurity event UNLESS the event was caused by willful misconduct or gross negligence. Unlike Ohio-model safe harbors, this is conduct-based rather than framework-based.",
      reference_url: "https://wapp.capitol.tn.gov/apps/BillInfo/Default.aspx?BillNumber=HB2434",
      evaluators: [
        { level: "consider", reason: "Tennessee operations: class action protection available absent willful misconduct or gross negligence", conditions: { us_states_includes: "tn" } }
      ],
      first_steps: [
        "Document security decisions and risk-based judgments with management approval",
        "Maintain decision logs and risk assessment records (not framework-required but supports defense)",
        "Establish incident response procedures that demonstrate good-faith effort",
        "Train staff on security policies to avoid negligent conduct findings",
        "Engage qualified counsel early in any incident for litigation positioning"
      ]
    },

    {
      id: "ne_safe_harbor",
      name: "Nebraska Cybersecurity Safe Harbor",
      category: "US State · Legal Protection (Nebraska)",
      description: "Nebraska's safe harbor provision (similar in approach to Tennessee) shields entities from certain liabilities arising from a cybersecurity event provided the incident was not caused by willful misconduct or gross negligence. Conduct-based rather than framework-conformance based.",
      reference_url: "https://nebraskalegislature.gov/laws/browse-statutes.php",
      evaluators: [
        { level: "consider", reason: "Nebraska operations: liability protection available absent willful misconduct or gross negligence", conditions: { us_states_includes: "ne" } }
      ],
      first_steps: [
        "Document security decisions and management-approved risk judgments",
        "Maintain evidence of reasonable and good-faith cybersecurity practices",
        "Establish documented incident response procedures",
        "Train staff on security policies and procedures",
        "Engage qualified counsel early to position incident response for litigation defense"
      ]
    },

    {
      id: "tx_safe_harbor",
      name: "Texas Small Business Cybersecurity Safe Harbor",
      category: "US State · Legal Protection (Texas)",
      description: "Texas's 2025 cybersecurity safe harbor (effective September 2025) provides an affirmative defense to data breach tort claims for entities with FEWER THAN 250 EMPLOYEES that maintain a qualifying written cybersecurity program. Unlike most state safe harbors, Texas requires compliance with a recognized framework as a hard requirement rather than just an option.",
      reference_url: "https://capitol.texas.gov/BillLookup/Text.aspx?LegSess=89R&Bill=HB18",
      evaluators: [
        { level: "consider", reason: "Texas operations with under 250 employees: affirmative defense available if a qualifying framework is maintained", conditions: { us_states_includes: "tx", employees_in: ["1_50", "51_250"] } }
      ],
      first_steps: [
        "Verify entity meets the under-250-employee threshold",
        "Select a qualifying framework (NIST CSF, ISO 27001, CIS Controls, etc.)",
        "Develop a written cybersecurity program conforming to that framework",
        "Note: framework compliance is required, not merely incentivized",
        "Retain evidence of framework conformance and scaling to entity size"
      ]
    },

    {
      id: "or_safe_harbor",
      name: "Oregon Cybersecurity Safe Harbor",
      category: "US State · Legal Protection (Oregon)",
      description: "Oregon's safe harbor allows entities to assert an affirmative defense if they comply with applicable federal information security regulations that provide greater protection, or a recognized cybersecurity framework. Particularly relevant for entities already subject to HIPAA, GLBA, or other federal data security regimes.",
      reference_url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html",
      evaluators: [
        { level: "consider", reason: "Oregon operations: affirmative defense available if compliant with federal information security regulations or a recognized framework", conditions: { us_states_includes: "or" } }
      ],
      first_steps: [
        "Identify applicable federal information security regulations (HIPAA, GLBA, etc.) or recognized frameworks",
        "Develop and document a written cybersecurity program conforming to chosen standard",
        "Maintain administrative, technical, and physical safeguards for personal information",
        "Document program scaling and reasonableness for entity size",
        "Retain evidence of conformance to support affirmative defense"
      ]
    }

  ]
};
