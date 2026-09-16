# Compliance Profile Generator

Generate a ranked list of likely applicable compliance frameworks and regulations based on an organization's industry, jurisdiction, data types, customer types, and contractual requirements.

Built for MSPs, vCISOs, and auditors who need a defensible starting point for prospect conversations and client onboarding in minutes, not days.

Open source under an MIT license. Built and maintained by [Blacksmith InfoSec](https://blacksmithinfosec.com).

## What it does

The tool takes a structured profile of an organization (12 questions across 5 sections) and returns a categorized list of compliance frameworks and regulations that likely apply, sorted into three tiers:

- **Definitely applies** - clear regulatory trigger or contractual requirement
- **Likely applies** - strong indicators present, verify scope and applicability
- **Worth evaluating** - baseline or commonly-relevant standards

Each result includes the framework name, category, brief description, the specific reasons it triggered for this profile, and a link to the authoritative source.

The 42 frameworks currently covered include HIPAA, PCI DSS, NIST 800-171, CMMC, SOC 2, ISO 27001, GDPR, NIS2, UK GDPR, UK Cyber Essentials, CCPA, NY DFS Part 500 (with Class A and Limited Exemption tier entries), GLBA / FTC Safeguards, SOX, SEC cyber rules, FERPA, COPPA, FedRAMP, CIS Controls, GTIA Cybersecurity Trustmark, NERC CIP, CJIS, IRS 1075, state breach laws, major state privacy laws (TX, MA, CO, VA, CT, NY SHIELD), and state cybersecurity safe harbor laws (OH, UT, CT, IA, OK, TN, NE, TX, OR). Each framework includes a "Where to start" section with actionable first steps.

## Run locally

This is a static site with no build step and no dependencies.

The simplest way: download or clone the repo, then open `index.html` in any modern browser. Because data is loaded as a JavaScript file (not via `fetch`), it works directly from the file system.

```
git clone https://github.com/blacksmith-infosec/compliance-profile-generator.git
cd compliance-profile-generator
# Then open index.html in your browser
```

If you prefer a local web server (recommended if you want to test refresh and caching behavior):

```
# Python 3
python -m http.server 8000

# Or Node.js (no install required)
npx serve

# Or use the VS Code Live Server extension
```

Then visit `http://localhost:8000`.

## Deploy

The tool is a static site and can be hosted anywhere that serves static files. Recommended options:

- **GitHub Pages**: enable Pages in repository settings, source `main` branch, root folder
- **Cloudflare Pages**: connect the GitHub repo, no build command needed, output directory is the root
- **Netlify, Vercel, Render**: connect repo, no build step required

Blacksmith InfoSec hosts a working copy at https://profile.blacksmithinfosec.com (planned).

## How the rules work

Every framework in `data/frameworks.js` has a list of `evaluators`. Each evaluator has:

- A `level`: `definite`, `likely`, or `consider`
- A human-readable `reason` shown to users
- A `conditions` object that must match the user's input for the evaluator to fire

When the form is submitted, each framework's evaluators are tested against the input data. The highest-level evaluator that fires determines which tier the framework lands in. All matching reasons at that tier are shown to the user.

Supported condition operators:

| Operator | Example | Meaning |
|---|---|---|
| Direct match | `{ industry: "healthcare" }` | The `industry` field equals `"healthcare"` |
| `_includes` | `{ data_types_includes: "phi" }` | The `data_types` array contains `"phi"` |
| `_in` | `{ revenue_in: ["50m_250m", "over_250m"] }` | The `revenue` value is in the array |
| Empty `{}` | `{ conditions: {} }` | Always fires (used for baseline frameworks) |

This design keeps all compliance logic auditable and contributable in a single file.

## Contributing

Pull requests welcome, especially for:

- Adding missing frameworks (NIST AI RMF, FFIEC IT Handbook, additional state privacy laws, etc.)
- Refining trigger conditions for existing frameworks (catching missed applicability or removing false positives)
- Updating reference URLs when authoritative sources move
- Improving rule accuracy with citations

When proposing a rule change, include the authoritative source in the PR description (statute, regulation, agency guidance). This is a tool for compliance professionals; we'd rather be conservative and accurate than expansive and wrong.

For larger architectural changes (new condition operators, scoring weights, output formats), open an issue first so we can discuss before you invest the work.

## Limitations and disclaimers

This is an indicative tool. It uses heuristics based on common applicability triggers and does not account for every nuance of every framework. In particular:

- Many frameworks have revenue, employee count, or data-volume thresholds that aren't fully modeled
- Some frameworks (PCI DSS, CMMC) have multiple levels or scopes that aren't fully distinguished
- Industry-specific subregulations (DEA, FDA, FCC, state insurance commissioners) aren't covered
- Contractual obligations from specific customers can impose requirements beyond what this tool flags

**This tool does not constitute legal advice.** Verify obligations with qualified counsel before making compliance decisions.

## Related open source tools by Blacksmith InfoSec

- [Risk Assessment Tool](https://assess.blacksmithinfosec.com) - Quick maturity risk assessment for SMBs

## License

Apache. See [LICENSE](LICENSE) for details.

## About Blacksmith InfoSec

[Blacksmith InfoSec](https://blacksmithinfosec.com) builds the GRC platform purpose-built for MSPs, vCISOs, and auditors managing compliance programs across many clients. The full platform handles policy generation, control mapping across 33+ frameworks, evidence collection, risk registers, audit prep, and client reporting in one multi-tenanted system.

If this tool is useful and you find yourself needing more (full crossmapping, audit-ready documentation, multi-client management), get in touch.
