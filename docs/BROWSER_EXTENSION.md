# Orbital Browser Lens

Orbital Browser Lens is an optional companion extension for the Orbital Fusion Console. It performs a **local, one-time structural review of the active tab** only after the user opens the extension, checks the consent box, and selects **Scan this page**.

## Permission model

| Permission | Why it is required | What it does not allow |
| --- | --- | --- |
| `activeTab` | Grants temporary access to the page the user deliberately chooses to scan. | It does not grant persistent access to browsing history or other tabs. |
| `scripting` | Runs the bundled scanner function in that one tab after the scan button is pressed. | It does not run automatically or in the background. |

The manifests declare **no host permissions**, content scripts, background workers, cookies permission, history permission, storage permission, downloads permission, web-request access, or remote code.

## What a scan reads

The scanner reads the active page URL without its query string or fragment, its title, DOM element counts, and security-relevant markup such as form actions, iframe sandbox attributes, new-tab link relationships, labels, and mixed-content references. It summarizes external-resource origins as a count rather than recording the domains.

It does not read or retain browsing history, other tabs, cookies, local storage, passwords, form values, page text, request or response bodies, downloaded files, or installed extensions. Reports are kept in the popup only until it closes unless the user explicitly copies or downloads the JSON. There is no report-upload endpoint.

> This is a limited page-hygiene review, not a vulnerability assessment, malware verdict, or guarantee that a page is safe. HTTP response headers are outside the local DOM scan.

## Install on Chrome, Edge, Brave, Opera, or another Chromium browser

1. Download `sentinel-atlas-browser-lens-v0.2.1-chromium.zip` from the latest GitHub release and extract it.
2. Open the browser's extension manager (`chrome://extensions` in Chrome or Brave, `edge://extensions` in Edge).
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the extracted directory.
5. Pin **Orbital Browser Lens** if desired.

Browser stores require their own review and signing process. The repository package is intentionally an inspectable, self-installed build rather than a store listing.

## Install on Firefox

1. Download `sentinel-atlas-browser-lens-v0.2.1-firefox.zip` from the latest GitHub release and extract it.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** and select `manifest.json` in the extracted directory.

Firefox requires AMO signing for normal persistent installation. The release package is for transparent review and temporary/developer loading; it does not bypass Firefox signing controls.

## Run a scan

1. Open the page you want to inspect.
2. Select the extension icon.
3. Review the displayed read/never-read scope.
4. Check the one-time consent box.
5. Select **Scan this page**.
6. Review the score and findings, then optionally copy or download the local JSON report.

Consent resets after every scan. Restricted browser pages such as extension settings, browser internals, and most web-store pages cannot be scanned.

## Install the main app on an operating system

Open the [live Orbital Fusion Console](https://1243353366.github.io/orbital-fusion-console/) over HTTPS and use the browser's **Install app** action. Chrome and Edge can install it as a windowed app on Windows, macOS, Linux, and ChromeOS. On iOS and iPadOS, use **Share → Add to Home Screen**. Browser support varies.

For an offline localhost copy, download `sentinel-atlas-v0.2.1-localhost.zip` from the latest release, extract it, and follow its included README. The local launcher binds only to `127.0.0.1` and opens the app at `http://127.0.0.1:4173`.
