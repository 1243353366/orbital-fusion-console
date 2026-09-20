#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
mkdir -p .security-results
rm -f .security-results/*

printf '1/9 npm production dependency audit\n'
npm audit --omit=dev --json > .security-results/npm-audit-production.json

printf '2/9 npm complete dependency audit\n'
npm audit --json > .security-results/npm-audit-all.json

printf '3/9 secret and configuration audit\n'
detect-secrets scan --all-files \
  --exclude-files '(^|/)(node_modules|dist|release|qa|docs|security|\.git|\.security-results)/' \
  > .security-results/detect-secrets.json
jq -e '[.results[]?[]?] | length == 0' .security-results/detect-secrets.json >/dev/null

printf '4/9 API authorization and input boundary audit\n'
npm run test:security-boundaries > .security-results/security-boundaries.txt

printf '5/9 project static security rules\n'
semgrep scan --config security/semgrep.yml --metrics=off --no-git-ignore --json --output .security-results/semgrep-project.json src extension scripts tools
jq -e '.results | length == 0' .security-results/semgrep-project.json >/dev/null

printf '6/9 community JavaScript and TypeScript security rules\n'
semgrep scan --config p/javascript --config p/typescript --metrics=off --no-git-ignore --json --output .security-results/semgrep-community.json src extension tools
jq -e '.results | map(select(.extra.severity == "ERROR")) | length == 0' .security-results/semgrep-community.json >/dev/null

printf '7/9 YARA source and release scan\n'
: > .security-results/yara.txt
for target in src extension dist release; do
  if [ -e "$target" ]; then
    yara -r security/project-threats.yar "$target" >> .security-results/yara.txt
  fi
done
[ ! -s .security-results/yara.txt ]

printf '8/9 ClamAV source, dependencies, build, and release scan\n'
clamscan -r -i --cross-fs=no --exclude-dir='(^|/)\.git$' --log=.security-results/clamav.log . >/dev/null
! grep -q 'Infected files: [1-9]' .security-results/clamav.log

printf '9/9 extension permission and prohibited-API tests\n'
npm run test:extension > .security-results/extension-validation.txt

jq -n \
  --arg generatedAt "$(date -u +%FT%TZ)" \
  --arg clamavVersion "$(clamscan --version | head -1)" \
  --arg yaraVersion "$(yara --version)" \
  --arg semgrepVersion "$(semgrep --version)" \
  --argjson prodVulnerabilities "$(jq '.metadata.vulnerabilities' .security-results/npm-audit-production.json)" \
  --argjson allVulnerabilities "$(jq '.metadata.vulnerabilities' .security-results/npm-audit-all.json)" \
  --argjson projectFindings "$(jq '.results | length' .security-results/semgrep-project.json)" \
  --argjson communityErrors "$(jq '.results | map(select(.extra.severity == "ERROR")) | length' .security-results/semgrep-community.json)" \
  '{generatedAt:$generatedAt,engines:{clamav:$clamavVersion,yara:$yaraVersion,semgrep:$semgrepVersion},npm:{production:$prodVulnerabilities,all:$allVulnerabilities},secretFindings:0,authorizationAudit:"passed",inputValidation:"passed",staticAnalysis:{projectFindings:$projectFindings,communityErrors:$communityErrors},yaraMatches:0,clamavInfected:0,extensionValidation:"passed"}' \
  > .security-results/summary.json

cat .security-results/summary.json
