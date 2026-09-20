import { readFile } from 'node:fs/promises'

const app = await readFile('src/App.tsx', 'utf8')
const popup = await readFile('extension/popup.js', 'utf8')
const scanner = await readFile('tools/sentinel-scan.mjs', 'utf8')
const chromium = JSON.parse(await readFile('extension/manifest.chromium.json', 'utf8'))
const firefox = JSON.parse(await readFile('extension/manifest.firefox.json', 'utf8'))

const assertions = [
  [app.includes('MAX_BROWSER_ARTIFACT_BYTES'), 'browser artifact size limit is missing'],
  [app.includes('512 * 1024 * 1024'), 'browser artifact size limit changed unexpectedly'],
  [popup.includes("/^https?:/i"), 'active-tab URL scheme validation is missing'],
  [scanner.includes('existsSync(filePath)') && scanner.includes('statSync(filePath).isFile()'), 'CLI file input validation is missing'],
  [scanner.includes("performed: false"), 'no-upload result marker is missing'],
  [!scanner.includes('FormData('), 'scanner contains a file-upload form'],
  [!scanner.includes("method: 'POST'") && !scanner.includes('method: "POST"'), 'scanner contains a POST request'],
  [!app.includes('VIRUSTOTAL_API_KEY') && !app.includes('METADEFENDER_API_KEY'), 'API credential names leaked into the browser bundle'],
  [scanner.includes('process.env.VIRUSTOTAL_API_KEY') && scanner.includes('process.env.METADEFENDER_API_KEY'), 'CLI adapters must read keys from the environment'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message)
}

for (const [name, manifest] of [['Chromium', chromium], ['Firefox', firefox]]) {
  const permissions = [...(manifest.permissions ?? [])].sort().join(',')
  if (permissions !== 'activeTab,scripting') throw new Error(`${name} extension permissions changed: ${permissions}`)
  if (manifest.host_permissions?.length) throw new Error(`${name} extension declares persistent host access`)
}

console.log(JSON.stringify({
  apiAuthorization: 'environment-only CLI credentials; none in public bundle',
  uploadBoundary: 'no POST, FormData, or automatic submission path',
  browserAuthorization: 'one-time activeTab plus scripting only',
  inputValidation: 'HTTP(S) tab guard, 512 MB browser limit, regular-file CLI guard',
}, null, 2))
