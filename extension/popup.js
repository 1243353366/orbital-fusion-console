const browserApi = globalThis.browser ?? globalThis.chrome
const consent = document.querySelector('#consent')
const scanButton = document.querySelector('#scan')
const status = document.querySelector('#status')
const reportPanel = document.querySelector('#report')
const scoreOutput = document.querySelector('#score')
const gradeOutput = document.querySelector('#grade')
const urlOutput = document.querySelector('#url')
const scannedOutput = document.querySelector('#scanned')
const findingsOutput = document.querySelector('#findings')
const copyButton = document.querySelector('#copy')
const downloadButton = document.querySelector('#download')

let latestReport = null

function setStatus(message, isError = false) {
  status.textContent = message
  status.classList.toggle('error', isError)
}

function renderReport(report) {
  latestReport = report
  scoreOutput.textContent = `${report.score}/100`
  gradeOutput.textContent = report.grade
  urlOutput.textContent = report.target.url
  urlOutput.title = report.target.url
  scannedOutput.textContent = new Date(report.scannedAt).toLocaleString()
  findingsOutput.replaceChildren()
  report.findings.forEach((finding) => {
    const item = document.createElement('article')
    item.className = `finding ${finding.severity}`
    const title = document.createElement('strong')
    title.textContent = `${finding.severity.toUpperCase()} · ${finding.title}`
    const detail = document.createElement('span')
    detail.textContent = finding.detail
    item.append(title, detail)
    findingsOutput.append(item)
  })
  reportPanel.hidden = false
}

consent.addEventListener('change', () => {
  scanButton.disabled = !consent.checked
  setStatus(consent.checked ? 'Consent recorded for the next scan only.' : 'Waiting for consent.')
})

scanButton.addEventListener('click', async () => {
  if (!consent.checked) return
  scanButton.disabled = true
  setStatus('Inspecting the active tab locally…')
  try {
    const [tab] = await browserApi.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) throw new Error('No active tab is available.')
    if (!/^https?:/i.test(tab.url ?? '')) throw new Error('Open a regular http:// or https:// page before scanning.')
    const [{ result }] = await browserApi.scripting.executeScript({ target: { tabId: tab.id }, func: globalThis.inspectActiveDocument })
    renderReport(result)
    setStatus('Scan complete. Nothing was uploaded or retained by the extension.')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'The active tab could not be scanned.', true)
  } finally {
    consent.checked = false
    scanButton.disabled = true
  }
})

copyButton.addEventListener('click', async () => {
  if (!latestReport) return
  await navigator.clipboard.writeText(JSON.stringify(latestReport, null, 2))
  setStatus('Report JSON copied locally.')
})

downloadButton.addEventListener('click', () => {
  if (!latestReport) return
  const blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `orbital-browser-scan-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
  setStatus('Report downloaded to this device.')
})
