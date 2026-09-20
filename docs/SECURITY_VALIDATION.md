# v0.2.0 Release Hardening Validation

**Release label:** Sentinel Atlas v0.2.0 — Release Hardening

**Validation time:** 2026-09-20T21:48:50Z

**Scope:** source, dependencies, configuration, browser extension, production bundle, and versioned release archives

## Result

The reproducible release gate completed successfully with **zero detected infections, zero YARA threat matches, zero dependency vulnerabilities, zero secret findings in code/configuration, and zero blocking static-analysis findings**.

| Control | Tool or test | Result |
| --- | --- | --- |
| Consent/accessibility scan | Browser Lens plus Puppeteer workflow | Passed; one unlabeled search field and two new-tab isolation findings were found and fixed before this report. |
| Dependency audit | `npm audit` for production and complete dependency sets | 0 info, low, moderate, high, or critical vulnerabilities. |
| Secret/config audit | `detect-secrets` over source, configuration, workflows, scripts, and manifests | 0 findings. Documentation examples and YARA signature literals are excluded to prevent known false positives. |
| API authorization audit | `scripts/validate-security-boundaries.mjs` | Passed; provider credentials are CLI environment variables only and are absent from the public browser bundle. |
| Browser authorization | Manifest and source validation | Exactly `activeTab` and `scripting`; no host permissions, background worker, history, cookies, storage, telemetry, or remote-code path. |
| Input validation | Automated boundary checks and browser tests | HTTP(S)-only tab guard, 512 MB browser artifact limit, regular-file CLI guard, sanitized report filename, and loopback-only localhost server. |
| CSP/security policy | Static CSP plus local-server response headers | Restrictive origin allowlist, no objects, no forms, same-origin manifest/worker policy, and no remote scripts. |
| Static security analysis | 8 custom Semgrep rules plus 74 community JavaScript/TypeScript rules | 0 findings and 0 community errors. |
| Malware, worm, credential-theft, and cryptominer patterns | Custom YARA rules | 0 matches across source, extension, production bundle, and release archives. |
| Antivirus | ClamAV 1.5.3, 3,628,071 known signatures | 9,129 files and 413.65 MiB scanned; 0 infected files. |
| Extension behavior | Deterministic safe/risky DOM fixtures | Passed minimal-permission, prohibited-API, safe-fixture, and risky-fixture checks. |
| Archive integrity | `unzip -t` and SHA-256 | All three versioned archives passed structural validation and have published hashes. |

## Release artifacts

| Artifact | SHA-256 |
| --- | --- |
| `sentinel-atlas-browser-lens-v0.2.0-chromium.zip` | `171c1b4594aefbd80dab22e8623d5a7c5bff72665bdc9bb955605d382a1292f4` |
| `sentinel-atlas-browser-lens-v0.2.0-firefox.zip` | `e3776886daaba705f96744c83d48c74db9feb80b33ee9b11e87428907273b1d1` |
| `sentinel-atlas-v0.2.0-localhost.zip` | `244edef6ba218718cd29f84caa994cf0bd4927138985faa987af7f666bb9d8fc` |

Verify after download:

```bash
sha256sum -c SHA256SUMS.txt
```

## Hash-first reputation boundary

The CLI computes SHA-256, SHA-1, and MD5 before any provider request. It can query existing records by SHA-256 through VirusTotal API v3 and MetaDefender Cloud API v4 when the operator supplies a key at runtime. It never performs file submission. ClamAV runs locally when installed and its output is normalized into the same report.

No VirusTotal or MetaDefender credentials were configured in this build environment, so no cloud reputation lookup was claimed. Nord Threat Protection and Malwarebytes were not executed because no licensed, configured Linux command-line engine was available. Their names are not presented as release verdicts.

## Limitations

Security scanning reduces risk but cannot prove the absence of malicious behavior or unknown vulnerabilities. The Content Security Policy is delivered as a meta policy on GitHub Pages; protections that require HTTP response headers must be added by a downstream host that supports custom headers. The public browser extension packages are inspectable developer builds; normal persistent Firefox distribution requires Mozilla signing, and browser-store distribution requires the relevant store review.

Public multi-engine services may share submitted samples with vendors or researchers. This release deliberately stops before upload so an operator can make a separate, informed decision based on authorization, confidentiality, provider terms, and data handling.
