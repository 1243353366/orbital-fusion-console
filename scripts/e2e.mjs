import puppeteer from 'puppeteer-core'
import { mkdir } from 'node:fs/promises'

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

  console.log(JSON.stringify({ desktop: 'evidence and policy gate passed', mobile: responsive, pwa }, null, 2))
} finally {
  await browser.close()
}
