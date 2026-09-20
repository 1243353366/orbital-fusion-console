import { readFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const requiredPermissions = ['activeTab', 'scripting']
const manifests = ['extension/manifest.chromium.json', 'extension/manifest.firefox.json']

for (const path of manifests) {
  const manifest = JSON.parse(await readFile(path, 'utf8'))
  const permissions = [...(manifest.permissions ?? [])].sort()
  if (JSON.stringify(permissions) !== JSON.stringify([...requiredPermissions].sort())) {
    throw new Error(`${path} requests unexpected permissions: ${permissions.join(', ')}`)
  }
  for (const forbiddenKey of ['host_permissions', 'content_scripts', 'background', 'externally_connectable']) {
    if (forbiddenKey in manifest) throw new Error(`${path} must not declare ${forbiddenKey}`)
  }
}

const extensionSource = await Promise.all(['extension/popup.js', 'extension/scanner.js'].map((path) => readFile(path, 'utf8'))).then((parts) => parts.join('\n'))
const forbiddenPatterns = [
  /document\.cookie/,
  /chrome\.cookies/,
  /browser\.cookies/,
  /chrome\.history/,
  /browser\.history/,
  /localStorage\s*\./,
  /sessionStorage\s*\./,
  /indexedDB\s*\./,
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /WebSocket\s*\(/,
  /sendBeacon\s*\(/,
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /importScripts\s*\(/,
]
for (const pattern of forbiddenPatterns) {
  if (pattern.test(extensionSource)) throw new Error(`Extension source contains prohibited pattern: ${pattern}`)
}

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
})
try {
  const page = await browser.newPage()
  await page.setBypassCSP(true)
  await page.setContent(`<!doctype html><html lang="en"><head><title>Test page</title><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'self'"></head><body><a href="/safe">Safe</a><img alt="map" src="/map.png"><form><label>Email<input type="email"></label></form></body></html>`)
  await page.addScriptTag({ path: new URL('../extension/scanner.js', import.meta.url).pathname })
  const safeReport = await page.evaluate(() => globalThis.inspectActiveDocument())
  if (safeReport.consent.transmission !== 'none' || safeReport.privacy.excluded.length < 7) throw new Error('Privacy declaration is incomplete')
  const safeActionable = safeReport.findings.filter((finding) => finding.severity !== 'info').map((finding) => finding.title)
  if (safeActionable.some((title) => title !== 'Connection is not HTTPS')) throw new Error(`Safe fixture produced unexpected findings: ${JSON.stringify(safeReport.findings)}`)

  await page.setContent(`<!doctype html><html><head><title></title></head><body><a target="_blank" href="https://example.com">External</a><img src="http://example.com/pixel.png"><form action="http://example.com"><input></form><iframe src="https://example.com"></iframe></body></html>`)
  await page.addScriptTag({ path: new URL('../extension/scanner.js', import.meta.url).pathname })
  const riskyReport = await page.evaluate(() => globalThis.inspectActiveDocument())
  const titles = riskyReport.findings.map((finding) => finding.title)
  for (const expected of ['Connection is not HTTPS', 'Insecure form destination', 'Unsandboxed embedded frames', 'Form controls without accessible labels']) {
    if (!titles.includes(expected)) throw new Error(`Risk fixture did not detect: ${expected}`)
  }
  console.log(JSON.stringify({ manifests: 'minimal permissions passed', prohibitedApis: 'none found', safeFixture: safeReport.grade, riskyFixture: riskyReport.grade }, null, 2))
} finally {
  await browser.close()
}
