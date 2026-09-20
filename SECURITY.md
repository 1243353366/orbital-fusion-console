# Security Policy

## Supported version

The `main` branch and current GitHub Pages deployment are the supported prototype.

## Reporting

Please use GitHub’s private vulnerability reporting feature for security issues. Do not include active malware, real credentials, restricted imagery, or personal data in an issue or pull request.

## Intended boundary

This repository is a static frontend. It contains no secret storage, privileged connector, file-analysis sandbox, or malware execution engine. Any downstream system that adds those capabilities must isolate code execution, default to no network, enforce strict resource limits, keep credentials outside the client bundle, and preserve the project’s defensive-use boundary.
