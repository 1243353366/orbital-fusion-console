import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'

const root = process.cwd()
const extensionRoot = join(root, 'extension')
const releaseRoot = join(root, 'release')
const stageRoot = join(root, '.release-stage')
const packageManifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const releaseVersion = `v${packageManifest.version}`
const chromiumArchive = `sentinel-atlas-browser-lens-${releaseVersion}-chromium.zip`
const firefoxArchive = `sentinel-atlas-browser-lens-${releaseVersion}-firefox.zip`
const localhostArchive = `sentinel-atlas-${releaseVersion}-localhost.zip`

await rm(releaseRoot, { recursive: true, force: true })
await rm(stageRoot, { recursive: true, force: true })
await mkdir(releaseRoot, { recursive: true })
await mkdir(stageRoot, { recursive: true })

const sharedExtensionFiles = ['popup.html', 'popup.css', 'popup.js', 'scanner.js', 'PRIVACY.md']
for (const target of ['chromium', 'firefox']) {
  const directory = join(stageRoot, `orbital-browser-lens-${target}`)
  await mkdir(directory, { recursive: true })
  for (const file of sharedExtensionFiles) await cp(join(extensionRoot, file), join(directory, file))
  await cp(join(extensionRoot, `manifest.${target}.json`), join(directory, 'manifest.json'))
  const archive = target === 'chromium' ? chromiumArchive : firefoxArchive
  const zip = spawnSync('zip', ['-qr', join(releaseRoot, archive), `orbital-browser-lens-${target}`], { cwd: stageRoot })
  if (zip.status !== 0) throw new Error(zip.stderr.toString() || `Could not package ${target} extension`)
}

const localDirectory = join(stageRoot, 'orbital-fusion-console-localhost')
await cp(join(root, 'dist'), join(localDirectory, 'app'), { recursive: true })
await mkdir(join(localDirectory, 'tools'), { recursive: true })
await cp(join(root, 'tools', 'sentinel-scan.mjs'), join(localDirectory, 'tools', 'sentinel-scan.mjs'))
await writeFile(join(localDirectory, 'start-local.mjs'), `import { createReadStream, existsSync, statSync } from 'node:fs'\nimport { createServer } from 'node:http'\nimport { extname, join, normalize } from 'node:path'\n\nconst host = '127.0.0.1'\nconst port = Number(process.env.PORT || 4173)\nconst root = join(import.meta.dirname, 'app')\nconst mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png' }\n\ncreateServer((request, response) => {\n  const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)\n  const safePath = normalize(requestPath).replace(/^(\\.\\.(\\/|\\\\|$))+/, '')\n  let filePath = join(root, safePath === '/' ? 'index.html' : safePath)\n  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(root, 'index.html')\n  response.setHeader('Content-Type', mime[extname(filePath)] || 'application/octet-stream')\n  response.setHeader('X-Content-Type-Options', 'nosniff')\n  response.setHeader('Referrer-Policy', 'no-referrer')\n  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')\n  createReadStream(filePath).pipe(response)\n}).listen(port, host, () => {\n  const url = \`http://\${host}:\${port}\`\n  console.log(\`Orbital Fusion Console is running at \${url}\`)\n  console.log('Press Ctrl+C to stop.')\n})\n`)
await writeFile(join(localDirectory, 'README.md'), `# Orbital Fusion Console — Localhost Bundle\n\nRequirements: Node.js 22 or newer. No package installation is required.\n\n## Run the app\n\n1. Extract this archive.\n2. Open a terminal in the extracted directory.\n3. Run \`node start-local.mjs\`.\n4. Open \`http://127.0.0.1:4173\` in your browser.\n5. Press Ctrl+C in the terminal to stop the local server.\n\nThe server binds only to the local loopback interface and does not expose the app to your network. Live NASA and map tiles still require internet access.\n\n## Scan an artifact\n\nRun \`node tools/sentinel-scan.mjs path/to/product.zip --output=scan-report.json\`. The scanner computes SHA-256, SHA-1, and MD5, runs ClamAV when installed, and performs hash-only reputation lookups when \`VIRUSTOTAL_API_KEY\` and/or \`METADEFENDER_API_KEY\` are present. It never uploads a file.\n`)
const localZip = spawnSync('zip', ['-qr', join(releaseRoot, localhostArchive), 'orbital-fusion-console-localhost'], { cwd: stageRoot })
if (localZip.status !== 0) throw new Error(localZip.stderr.toString() || 'Could not package localhost app')

const checksums = spawnSync('sha256sum', [chromiumArchive, firefoxArchive, localhostArchive], { cwd: releaseRoot, encoding: 'utf8' })
if (checksums.status !== 0) throw new Error(checksums.stderr || 'Could not calculate checksums')
await writeFile(join(releaseRoot, 'SHA256SUMS.txt'), checksums.stdout)

console.log(JSON.stringify({ version: releaseVersion, release: resolve(releaseRoot), files: checksums.stdout.trim().split('\n') }, null, 2))
await rm(stageRoot, { recursive: true, force: true })
