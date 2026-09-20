import puppeteer from 'puppeteer-core'

const baseUrl = process.env.TEST_URL || 'http://127.0.0.1:4175/'
const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium'
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader'],
})

try {
  const page = await browser.newPage()
  const cspErrors = []
  page.on('console', (message) => {
    const text = message.text()
    if (text.includes('Content Security Policy') || text.includes('violates the following')) cspErrors.push(text)
  })
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
  await page.goto(new URL('security/', baseUrl).toString(), { waitUntil: 'networkidle0' })
  await page.waitForSelector('.attestation-card')

  const initial = await page.evaluate(() => ({
    title: document.title,
    version: document.querySelector('.attestation-card dd')?.textContent,
    cards: document.querySelectorAll('.control-card').length,
    imagesLoaded: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    unsafeNewTabs: [...document.querySelectorAll('a[target="_blank"]')].filter((link) => !link.relList.contains('noopener')).length,
    hashes: [...document.querySelectorAll('.artifact-row code')].map((node) => node.textContent?.trim().length),
    node25: document.querySelector('.site-footer')?.textContent?.includes('Node.js 25 target'),
  }))
  if (initial.title !== 'Sentinel Atlas — Release Security Dossier' || initial.version !== 'v0.2.1') throw new Error(`Unexpected dossier identity: ${JSON.stringify(initial)}`)
  if (initial.cards !== 12 || !initial.imagesLoaded || initial.unsafeNewTabs !== 0 || !initial.hashes.every((length) => length === 64) || !initial.node25) throw new Error(`Initial dossier validation failed: ${JSON.stringify(initial)}`)

  await page.evaluate(() => [...document.querySelectorAll('.filter-bar button')].find((button) => button.textContent?.includes('Artifacts'))?.click())
  await page.waitForFunction(() => document.querySelectorAll('.control-card').length === 3)

  await page.evaluate(() => document.querySelector('.scan-stack-head button')?.click())
  await page.waitForFunction(() => document.querySelectorAll('.scan-step.complete').length === 6, { timeout: 5000 })

  await page.evaluate(() => [...document.querySelectorAll('.filter-bar button')].find((button) => button.textContent?.includes('All'))?.click())
  await page.waitForFunction(() => document.querySelectorAll('.control-card').length === 12)

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  const mobile = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    cards: document.querySelectorAll('.control-card').length,
  }))
  if (mobile.scrollWidth > mobile.width || mobile.cards !== 12) throw new Error(`Mobile layout failed: ${JSON.stringify(mobile)}`)
  if (cspErrors.length) throw new Error(`CSP violations: ${cspErrors.join('\n')}`)

  console.log(JSON.stringify({ desktop: initial, filter: '3 artifact controls', replay: '6 steps complete', mobile }, null, 2))
} finally {
  await browser.close()
}
