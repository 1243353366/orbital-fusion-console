# Security Policy

## Supported version

The `main` branch and current GitHub Pages deployment are the supported prototype.

## Reporting

Please use GitHub’s private vulnerability reporting feature for security issues. Do not include active malware, real credentials, restricted imagery, or personal data in an issue or pull request.

## Intended boundary

The public application is a static frontend. It contains no secret storage, privileged connector, file-analysis sandbox, malware execution engine, or automatic file uploader. Browser scans require one-time active-tab consent and do not access history, cookies, passwords, form values, storage, or other tabs.

Artifact hashing runs locally. The optional command-line scanner can call a locally installed ClamAV engine and can perform hash-only reputation lookups when API keys are supplied through environment variables. Keys must never be committed or compiled into the frontend. File submission is intentionally not implemented; adding it requires a separate explicit confirmation that shows the provider, sharing policy, retention, and confidentiality impact.

Any downstream system that adds code execution or sample detonation must isolate execution, default to no network, enforce strict resource limits, keep credentials outside the client bundle, and preserve the project’s defensive-use boundary.

## Automated validation

Pull requests and `main` are checked with npm audit, custom and community Semgrep rules, YARA signatures, ClamAV, browser-extension permission tests, CodeQL, and Dependabot. See `docs/SECURITY_VALIDATION.md` for scope and limitations.
