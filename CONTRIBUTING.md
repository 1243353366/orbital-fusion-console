# Contributing

Thank you for improving Orbital Fusion Console. Keep contributions portable, source-transparent, defensive, and safe.

## Local workflow

1. Fork and clone the repository.
2. Create a focused branch.
3. Run `npm install`, `npm run lint`, `npm run build`, and `npm run test:extension`.
4. Run `./scripts/security-scan.sh` when ClamAV, YARA, and Semgrep are available.
5. Confirm desktop and mobile layouts in a browser.
6. Explain any new source, license, entitlement, attribution, redistribution, or browser-permission assumption in the pull request.

## Data contributions

Do not add raw commercial imagery, API keys, personal data, operational malware infrastructure, or unverified attribution claims. Use RFC 5737 IP addresses and `.example` domains for synthetic demonstrations. A new connector must include the provider, endpoint, authentication method, permissions, rate limits, data types, license restrictions, provenance fields, and a safe disabled state.

## Security boundary

The project is for observation, analysis, correlation, simulation, learning, and defense. Contributions must not enable deployment, propagation, persistence, credential theft, evasion, attacks, compromise, or botnet operations. Potentially dangerous behavior must be represented as a harmless simulation or remain outside this frontend repository.

Browser-extension changes must preserve one-time consent, avoid persistent host permissions, and must not access browsing history, cookies, passwords, form values, browser storage, or other tabs. File-scanner changes must remain hash-first and must never upload artifacts automatically.

## Attribution

Do not remove the map attribution control, `NOTICE.md`, source-policy fields, or dataset citations. If you replace a data source, update `docs/DATA_AND_LICENSING.md` in the same change.
