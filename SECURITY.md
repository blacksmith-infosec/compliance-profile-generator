# Security Policy

## Data privacy

This is a client-side application with no application backend. Profile answers,
client and preparer names, and uploaded logos stay in browser memory. Reloading
or resetting the form clears those values. Only the theme preference is saved
in localStorage. PDF reports are generated locally and may contain sensitive
client information; handle exported files accordingly.

The app loads branding images and a favicon from assets.blacksmithinfosec.com.
Those requests expose normal request metadata to that host. Following external
reference links also contacts the destination sites. There are no assessment
API requests or analytics scripts in the application source.

## Reporting a vulnerability

Email security@blacksmithinfosec.com rather than opening a public issue for an
unpatched security vulnerability. Include the affected commit or version,
reproduction steps, expected impact, and a proof of concept where possible.
Do not include real client data or credentials. We will coordinate remediation
and public disclosure with the reporter.

Report non-sensitive rule accuracy issues through GitHub issues, with an
authoritative citation and an anonymized example profile.

## Supported version

Security fixes target the current main branch. The hosted application is at
https://profile.blacksmithinfosec.com. Fork maintainers are responsible for
updating their own dependencies and deployments.

## Development checks

Run `npm run lint`, `npm test`, `npm run build`, and `npm audit` before releasing.
Pull requests and deployments run lint, tests, and the production build through
GitHub Actions. Dependabot proposes dependency updates.

React renders user text without raw HTML injection. Uploaded logos are decoded
and rasterized locally for PDF export. Keep these boundaries intact when adding
features, and avoid committing credentials or client data.

## Limitations

Compliance results are heuristic guidance and do not constitute legal advice.
Client-side image processing can consume substantial memory for very large
uploads. Hosting configuration, access logs, and security headers are controlled
by the chosen static host.

## Contact

- Security: security@blacksmithinfosec.com
- General issues: https://github.com/blacksmith-infosec/compliance-profile-generator/issues

Last updated: October 5, 2026
