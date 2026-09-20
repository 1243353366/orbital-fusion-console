# Sentinel Atlas File Scanner

The File Scanner implements a **hash-first release verification pipeline** for products, APKs, EXEs, ZIP archives, disk images, and other artifacts.

```text
Artifact
   ↓
SHA-256 + SHA-1 + MD5 + size + type + build metadata
   ↓
Hash reputation lookup
   ↓
Known?
 ├─ Yes → normalize existing threat intelligence
 └─ No  → report unknown; require a separate explicit upload decision
```

> A cryptographic hash is a fingerprint, not an antivirus verdict. A clean local scan or an unknown reputation record does not prove an artifact is safe.

## Browser workflow

Open **File Scanner** in the live app. Select an artifact, review the local-read disclosure, and give one-time consent. The browser calculates SHA-256, SHA-1, and MD5 in streaming chunks. The artifact remains on the device and is not uploaded. Consent resets after hashing.

Because the public app is static, it does not contain third-party API keys or invoke local antivirus software. It produces a normalized JSON record that can be passed to the CLI or a future secure backend.

## Local CLI

The repository and localhost release include `tools/sentinel-scan.mjs`.

```bash
node tools/sentinel-scan.mjs path/to/product.zip --output=scan-report.json
```

The command performs these steps in order:

1. Calculates SHA-256, SHA-1, and MD5 by streaming the file.
2. Runs `clamscan` when ClamAV is installed.
3. Queries VirusTotal by SHA-256 when `VIRUSTOTAL_API_KEY` is present.
4. Queries MetaDefender Cloud by SHA-256 when `METADEFENDER_API_KEY` is present.
5. Emits one normalized JSON report.
6. **Never uploads the file.**

Optional configuration:

```bash
export VIRUSTOTAL_API_KEY='your-key'
export METADEFENDER_API_KEY='your-key'
node tools/sentinel-scan.mjs ./release/product.zip --output=product.scan.json
```

Keep API keys in the local environment or a secret manager. Never commit them or compile them into the public PWA.

## Normalized result

The report records artifact filename, size, inferred MIME type, modification timestamp, SHA-256, SHA-1, MD5, provider status, detection count, engine count, provider provenance, and the submission decision. Provider statuses are normalized to `known`, `not-found`, `clean`, `malicious`, `not-configured`, or `error`.

A `not-found` result means only that the configured provider does not have an existing record for that exact hash. It does not mean clean.

## Upload boundary

The scanner deliberately has no upload implementation. An unknown hash can be marked eligible for review, but submitting the artifact must be a separate, explicit action after the user sees the provider, retention, sharing, licensing, and confidentiality implications.

Do not upload proprietary or sensitive artifacts to public multi-engine services without authorization. Public submissions may be shared with security vendors and research partners. Private scanning generally requires a suitable paid plan.

## Provider notes

| Provider | Integration in this repository | Privacy boundary |
| --- | --- | --- |
| **ClamAV** | Local `clamscan` process; one engine verdict. | File stays on the machine. |
| **VirusTotal** | API v3 hash lookup only: `GET /api/v3/files/{sha256}` using `x-apikey`. | No upload is performed. Public API terms and quotas still apply. |
| **MetaDefender Cloud** | API v4 hash lookup only: `GET /v4/hash/{sha256}` using `apikey`. | No upload is performed. Community-tier terms still apply. |
| **Nord Threat Protection / Malwarebytes** | Not executed in the reproducible Linux release pipeline because no licensed, configured command-line scanner is present. | Do not claim a vendor verdict unless that vendor's engine actually ran. |

## Release scanning

The repository's `scripts/security-scan.sh` performs npm dependency audits, custom and community Semgrep checks, YARA scans, ClamAV scans, and extension permission tests. GitHub Actions also runs CodeQL, Dependabot, and the layered security workflow on changes.

Official documentation:

- [VirusTotal API v3 files reference](https://docs.virustotal.com/reference/files)
- [VirusTotal public API terms](https://docs.virustotal.com/docs/api-overview)
- [MetaDefender Cloud API hash lookup](https://docs.opswat.com/mdcloud/metadefender-cloud-api-v4/ref/scan-results/get-hash-results)
- [ClamAV documentation](https://docs.clamav.net/)
