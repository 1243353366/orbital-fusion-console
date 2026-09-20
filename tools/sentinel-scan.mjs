#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const fileArg = args.find((argument) => !argument.startsWith('--'))
const outputArg = args.find((argument) => argument.startsWith('--output='))?.slice('--output='.length)

if (!fileArg) {
  console.error('Usage: node tools/sentinel-scan.mjs <artifact> [--output=report.json]')
  process.exit(2)
}

const filePath = resolve(fileArg)
if (!existsSync(filePath) || !statSync(filePath).isFile()) {
  console.error(`Artifact not found: ${filePath}`)
  process.exit(2)
}

const mimeByExtension = {
  '.apk': 'application/vnd.android.package-archive',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.msi': 'application/x-msi',
  '.zip': 'application/zip',
  '.dmg': 'application/x-apple-diskimage',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
}

async function digestFile(path) {
  const hashes = {
    sha256: createHash('sha256'),
    sha1: createHash('sha1'),
    md5: createHash('md5'),
  }
  for await (const chunk of createReadStream(path)) {
    hashes.sha256.update(chunk)
    hashes.sha1.update(chunk)
    hashes.md5.update(chunk)
  }
  return {
    sha256: hashes.sha256.digest('hex'),
    sha1: hashes.sha1.digest('hex'),
    md5: hashes.md5.digest('hex'),
  }
}

function runClamAv(path) {
  const version = spawnSync('clamscan', ['--version'], { encoding: 'utf8' })
  if (version.error?.code === 'ENOENT') {
    return { provider: 'ClamAV', status: 'not-configured', detections: null, engines: 1, details: 'clamscan is not installed', provenance: 'local process' }
  }
  const scan = spawnSync('clamscan', ['--no-summary', '--stdout', path], { encoding: 'utf8' })
  const output = `${scan.stdout ?? ''}\n${scan.stderr ?? ''}`.trim()
  if (scan.status === 0) return { provider: 'ClamAV', status: 'clean', detections: 0, engines: 1, details: output, provenance: version.stdout.trim() }
  if (scan.status === 1) return { provider: 'ClamAV', status: 'malicious', detections: 1, engines: 1, details: output, provenance: version.stdout.trim() }
  return { provider: 'ClamAV', status: 'error', detections: null, engines: 1, details: output || 'Unknown ClamAV error', provenance: version.stdout.trim() }
}

async function lookupVirusTotal(sha256) {
  const apiKey = process.env.VIRUSTOTAL_API_KEY
  if (!apiKey) return { provider: 'VirusTotal', status: 'not-configured', detections: null, engines: null, details: 'Set VIRUSTOTAL_API_KEY to enable hash reputation lookup', provenance: 'VirusTotal API v3' }
  const response = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, { headers: { 'x-apikey': apiKey, accept: 'application/json' } })
  if (response.status === 404) return { provider: 'VirusTotal', status: 'not-found', detections: 0, engines: 0, details: 'Hash is not present in the provider dataset; the artifact was not uploaded', provenance: 'VirusTotal API v3' }
  if (!response.ok) return { provider: 'VirusTotal', status: 'error', detections: null, engines: null, details: `HTTP ${response.status}`, provenance: 'VirusTotal API v3' }
  const body = await response.json()
  const stats = body?.data?.attributes?.last_analysis_stats ?? {}
  const detections = Number(stats.malicious ?? 0) + Number(stats.suspicious ?? 0)
  const engines = Object.values(stats).reduce((total, value) => total + Number(value ?? 0), 0)
  return { provider: 'VirusTotal', status: 'known', detections, engines, details: body?.data?.attributes?.last_analysis_date ? `Last analysis epoch: ${body.data.attributes.last_analysis_date}` : 'Existing hash record returned', provenance: 'VirusTotal API v3' }
}

async function lookupMetaDefender(sha256) {
  const apiKey = process.env.METADEFENDER_API_KEY
  if (!apiKey) return { provider: 'MetaDefender Cloud', status: 'not-configured', detections: null, engines: null, details: 'Set METADEFENDER_API_KEY to enable hash reputation lookup', provenance: 'MetaDefender Cloud API v4' }
  const response = await fetch(`https://api.metadefender.com/v4/hash/${sha256}`, { headers: { apikey: apiKey, accept: 'application/json' } })
  if (response.status === 404) return { provider: 'MetaDefender Cloud', status: 'not-found', detections: 0, engines: 0, details: 'Hash is not present in the provider dataset; the artifact was not uploaded', provenance: 'MetaDefender Cloud API v4' }
  if (!response.ok) return { provider: 'MetaDefender Cloud', status: 'error', detections: null, engines: null, details: `HTTP ${response.status}`, provenance: 'MetaDefender Cloud API v4' }
  const body = await response.json()
  const summary = body?.scan_results ?? body?.scanResult ?? {}
  return {
    provider: 'MetaDefender Cloud',
    status: 'known',
    detections: Number(summary.total_detected_avs ?? summary.totalDetectedAvs ?? 0),
    engines: Number(summary.total_avs ?? summary.totalAvs ?? 0),
    details: summary.scan_all_result_a ?? summary.scanAllResultA ?? 'Existing hash record returned',
    provenance: 'MetaDefender Cloud API v4',
  }
}

const stat = statSync(filePath)
const hashes = await digestFile(filePath)
const providers = await Promise.all([Promise.resolve(runClamAv(filePath)), lookupVirusTotal(hashes.sha256), lookupMetaDefender(hashes.sha256)])
const known = providers.some((provider) => provider.status === 'known')
const report = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  artifact: {
    filename: basename(filePath),
    size: stat.size,
    mime: mimeByExtension[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    modifiedAt: stat.mtime.toISOString(),
  },
  hashes,
  reputation: {
    known,
    providers,
  },
  submission: {
    performed: false,
    eligibleForExplicitReview: !known,
    reason: known ? 'Existing threat intelligence was found by at least one configured provider.' : 'No configured provider returned an existing record. File submission requires a separate, explicit decision and is never automatic.',
  },
  caveats: [
    'A hash is a fingerprint, not an antivirus verdict.',
    'A clean local result or an unknown hash does not prove the artifact is safe.',
    'Public multi-engine services may share uploaded files with security partners; review provider terms before any submission.',
  ],
}

const json = `${JSON.stringify(report, null, 2)}\n`
if (outputArg) {
  const { writeFileSync } = await import('node:fs')
  writeFileSync(resolve(outputArg), json, { mode: 0o600 })
}
process.stdout.write(json)
process.exit(providers.some((provider) => provider.status === 'malicious') ? 1 : 0)
