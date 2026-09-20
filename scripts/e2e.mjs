import puppeteer from 'puppeteer-core'
import { mkdir, writeFile } from 'node:fs/promises'

const baseUrl = process.env.TEST_URL || 'http://127.0.0.1:4173/'
const expectServiceWorker = process.env.EXPECT_SW === '1'
await mkdir('qa', { recursive: true })
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
})

const clickByText = async (page, text) => {
  const clicked = await page.evaluate((label) => {
    const normalized = label.toLowerCase()
    const element = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim().toLowerCase().includes(normalized))
    if (!(element instanceof HTMLButtonElement)) return false
    element.click()
    return true
  }, text)
  if (!clicked) throw new Error(`Button not found: ${text}`)
}

try {
  const desktop = await browser.newPage()
  const securityConsoleErrors = []
  desktop.on('console', (message) => {
    const text = message.text()
    if (text.includes('Content Security Policy') || text.includes('violates the following')) securityConsoleErrors.push(text)
  })
  await desktop.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
  await desktop.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await desktop.waitForSelector('.detail-panel')

  await clickByText(desktop, 'EVIDENCE')
  await desktop.waitForFunction(() => document.body.textContent?.includes('EVIDENCE REGISTER'))

  await clickByText(desktop, 'Data gate')
  await desktop.waitForFunction(() => document.body.textContent?.includes('Source policy register'))
  const policyText = await desktop.$eval('.source-panel', (element) => element.textContent || '')
  if (!policyText.includes('PlanetScope') || !policyText.includes('LOCKED')) throw new Error('Restricted-source gate is incomplete')

  let pwa = null
  if (expectServiceWorker) {
    await desktop.waitForFunction(async () => Boolean(await navigator.serviceWorker.getRegistration()), { timeout: 10_000 })
    pwa = await desktop.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      const manifestLink = document.querySelector('link[rel="manifest"]')
      const manifest = manifestLink instanceof HTMLLinkElement ? await fetch(manifestLink.href).then((response) => response.json()) : null
      return {
        active: Boolean(registration.active),
        scope: registration.scope,
        name: manifest?.name,
        display: manifest?.display,
      }
    })
    if (!pwa.active || pwa.display !== 'standalone') throw new Error(`PWA check failed: ${JSON.stringify(pwa)}`)
  }
  if (securityConsoleErrors.length) throw new Error(`CSP violations: ${securityConsoleErrors.join('\n')}`)

  const browserLens = await browser.newPage()
  await browserLens.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
  const browserUrl = new URL(baseUrl)
  browserUrl.searchParams.set('view', 'browser')
  await browserLens.goto(browserUrl.toString(), { waitUntil: 'domcontentloaded' })
  await browserLens.waitForFunction(() => document.body.textContent?.includes('Private page scan'))
  await browserLens.waitForFunction(() => document.querySelectorAll('.maplibregl-ctrl-attrib a[target="_blank"]').length >= 2, { timeout: 10_000 })
  const isolatedAttributionLinks = await browserLens.$$eval('.maplibregl-ctrl-attrib a[target="_blank"]', (links) => links.every((link) => link.relList.contains('noopener') && link.relList.contains('noreferrer')))
  if (!isolatedAttributionLinks) throw new Error('MapLibre attribution links are not isolated')
  const scanDisabledBeforeConsent = await browserLens.$eval('.browser-scan-button', (button) => button.disabled)
  if (!scanDisabledBeforeConsent) throw new Error('Browser scan must be disabled before consent')
  await browserLens.click('.browser-consent input')
  await browserLens.click('.browser-scan-button')
  await browserLens.waitForFunction(() => document.body.textContent?.includes('PAGE HYGIENE'))
  const browserScan = await browserLens.evaluate(() => ({
    consentReset: !(document.querySelector('.browser-consent input'))?.checked,
    hasReport: Boolean(document.querySelector('.browser-report')),
    text: document.querySelector('.browser-report')?.textContent || '',
  }))
  if (!browserScan.consentReset || !browserScan.hasReport || !browserScan.text.includes('No obvious DOM hygiene issues')) {
    throw new Error(`Browser lens consent flow failed: ${JSON.stringify(browserScan)}`)
  }

  const artifactScanner = await browser.newPage()
  await artifactScanner.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
  const artifactUrl = new URL(baseUrl)
  artifactUrl.searchParams.set('view', 'artifact')
  await artifactScanner.goto(artifactUrl.toString(), { waitUntil: 'domcontentloaded' })
  await artifactScanner.waitForFunction(() => document.body.textContent?.includes('Release verification'))
  const fixturePath = 'qa/orbital-scan-fixture.zip'
  await writeFile(fixturePath, 'orbital-fusion-console security fixture\n')
  await artifactScanner.$eval('.file-drop input', (input) => { input.value = '' })
  const fileInput = await artifactScanner.$('.file-drop input')
  if (!fileInput) throw new Error('Artifact file input not found')
  await fileInput.uploadFile(fixturePath)
  await artifactScanner.click('.artifact-consent input')
  await artifactScanner.click('.artifact-panel .browser-scan-button')
  await artifactScanner.waitForFunction(() => document.body.textContent?.includes('FINGERPRINT COMPLETE'))
  const artifactResult = await artifactScanner.evaluate(() => ({
    consentReset: !(document.querySelector('.artifact-consent input'))?.checked,
    hasSha256: (document.querySelector('.hash-list')?.textContent || '').includes('SHA-256'),
    noAutoUpload: (document.querySelector('.artifact-panel')?.textContent || '').includes('NO AUTOMATIC UPLOADS'),
  }))
  if (!artifactResult.consentReset || !artifactResult.hasSha256 || !artifactResult.noAutoUpload) throw new Error(`Artifact scan flow failed: ${JSON.stringify(artifactResult)}`)

  const mobile = await browser.newPage()
  await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await mobile.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await mobile.waitForSelector('.mobile-menu')
  await mobile.click('.mobile-menu')
  await mobile.waitForFunction(() => document.querySelector('.control-panel')?.classList.contains('mobile-open'))
  await mobile.screenshot({ path: 'qa/mobile-menu-open.png' })

  const responsive = await mobile.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    menuOpen: document.querySelector('.control-panel')?.classList.contains('mobile-open') || false,
    title: document.title,
  }))
  if (responsive.scrollWidth > responsive.viewport + 1) throw new Error(`Horizontal overflow: ${JSON.stringify(responsive)}`)

  console.log(JSON.stringify({ desktop: 'evidence and policy gate passed', browserLens: 'one-time consent and local report passed', artifactScanner: 'local hashing and consent reset passed', mobile: responsive, pwa }, null, 2))
} finally {
  await browser.close()
}
