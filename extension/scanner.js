globalThis.inspectActiveDocument = function inspectActiveDocument() {
  const normalizedUrl = (() => {
    try {
      const value = new URL(window.location.href)
      return `${value.origin}${value.pathname}`
    } catch {
      return 'Unavailable'
    }
  })()
  const nodes = (selector) => [...document.querySelectorAll(selector)]
  const findings = []
  const addFinding = (severity, title, detail, count = 1) => findings.push({ severity, title, detail, count })
  const isHttps = window.location.protocol === 'https:'
  const insecureResources = isHttps
    ? nodes('img[src],script[src],link[href],iframe[src],audio[src],video[src],source[src]').filter((element) => {
        const reference = element.getAttribute('src') ?? element.getAttribute('href') ?? ''
        return reference.toLowerCase().startsWith('http://')
      })
    : []
  const insecureForms = nodes('form[action]').filter((form) => {
    try {
      return new URL(form.getAttribute('action'), window.location.href).protocol === 'http:'
    } catch {
      return false
    }
  })
  const unsafeBlankLinks = nodes('a[target="_blank"]').filter((link) => !link.relList.contains('noopener'))
  const unsandboxedFrames = nodes('iframe').filter((frame) => !frame.hasAttribute('sandbox'))
  const imagesMissingAlt = nodes('img').filter((image) => !image.hasAttribute('alt'))
  const unlabeledFields = nodes('input:not([type="hidden"]):not([type="submit"]):not([type="button"]),select,textarea').filter((field) => {
    const ariaLabel = field.getAttribute('aria-label') || field.getAttribute('aria-labelledby')
    const labels = 'labels' in field ? field.labels : null
    return !ariaLabel && !labels?.length
  })
  const externalOrigins = new Set(
    nodes('script[src],img[src],iframe[src],link[href]').flatMap((element) => {
      const reference = element.getAttribute('src') ?? element.getAttribute('href')
      if (!reference) return []
      try {
        const origin = new URL(reference, window.location.href).origin
        return origin !== window.location.origin ? [origin] : []
      } catch {
        return []
      }
    }),
  )

  if (!isHttps) addFinding('high', 'Connection is not HTTPS', 'Page traffic can be intercepted or modified in transit.')
  if (insecureResources.length) addFinding('high', 'Mixed-content references', `${insecureResources.length} HTTP resource reference(s) appear on this HTTPS page.`, insecureResources.length)
  if (insecureForms.length) addFinding('high', 'Insecure form destination', `${insecureForms.length} form(s) submit to an HTTP endpoint.`, insecureForms.length)
  if (!document.title.trim()) addFinding('medium', 'Missing document title', 'A descriptive title improves orientation and link safety.')
  if (unsandboxedFrames.length) addFinding('medium', 'Unsandboxed embedded frames', `${unsandboxedFrames.length} iframe(s) do not declare a sandbox policy. Review whether they require full capability.`, unsandboxedFrames.length)
  if (unsafeBlankLinks.length) addFinding('low', 'New-tab links without explicit noopener', `${unsafeBlankLinks.length} link(s) rely on browser defaults instead of an explicit rel="noopener".`, unsafeBlankLinks.length)
  if (imagesMissingAlt.length) addFinding('low', 'Images without alt text', `${imagesMissingAlt.length} image(s) do not provide an alt attribute.`, imagesMissingAlt.length)
  if (unlabeledFields.length) addFinding('low', 'Form controls without accessible labels', `${unlabeledFields.length} field(s) lack an associated label or ARIA label.`, unlabeledFields.length)
  if (!document.documentElement.lang) addFinding('low', 'Missing document language', 'The root document does not declare a language.')
  if (!document.querySelector('meta[name="viewport"]')) addFinding('low', 'Missing viewport metadata', 'Mobile browsers may not render the page responsively.')
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy" i]')) addFinding('info', 'Header-only policy check needed', 'No CSP meta element was found. Response-header policies are intentionally outside this local DOM scan.')
  if (!findings.some((finding) => finding.severity !== 'info')) addFinding('info', 'No obvious DOM hygiene issues', 'This limited scan found no high-, medium-, or low-severity page-structure findings.')

  const weights = { high: 22, medium: 10, low: 4, info: 0 }
  const penalty = findings.reduce((total, finding) => total + weights[finding.severity] * Math.min(finding.count, 3), 0)
  const score = Math.max(0, 100 - penalty)
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'

  return {
    schemaVersion: '1.0',
    scannedAt: new Date().toISOString(),
    target: {
      url: normalizedUrl,
      title: document.title.slice(0, 160),
      origin: window.location.origin,
    },
    consent: {
      mode: 'explicit-active-tab-one-time',
      persistence: 'none',
      transmission: 'none',
    },
    privacy: {
      captured: ['page URL without query or fragment', 'page title', 'DOM structure counts', 'security-relevant attributes'],
      excluded: ['browsing history', 'other tabs', 'cookies', 'local storage', 'passwords', 'form values', 'page text'],
    },
    inventory: {
      links: nodes('a[href]').length,
      forms: nodes('form').length,
      fields: nodes('input,select,textarea').length,
      frames: nodes('iframe').length,
      scripts: nodes('script[src]').length,
      externalOriginCount: externalOrigins.size,
    },
    score,
    grade,
    findings,
    limitations: [
      'This is a local DOM hygiene review, not a vulnerability assessment or malware verdict.',
      'HTTP response headers, network bodies, browser storage, extensions, and other tabs are not inspected.',
      'A clean result does not prove a page is safe.',
    ],
  }
}
