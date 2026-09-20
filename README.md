# Orbital Fusion Console

A polished, installable progressive web app for exploring how **cyber intelligence**, **Earth observation**, and **time** can be correlated without confusing geographic context with cyber attribution.

**Live app:** <https://1243353366.github.io/orbital-fusion-console/>

> **Safety boundary:** all cyber indicators, infrastructure, campaigns, and malware relationships in this prototype are synthetic. Reserved example IP ranges and `.example` domains are used deliberately. The app does not execute malware, scan targets, store API keys, or make claims about real buildings or people.

## What the prototype demonstrates

The interface has three intelligence lenses:

| Lens | Purpose |
| --- | --- |
| **CYBER** | Follow synthetic malware → domain → IP → ASN → campaign relationships. |
| **EARTH** | Review public satellite imagery, acquisition time, change masks, and regional context. |
| **FUSION** | Examine temporal and geographic overlap while preserving source-level confidence and caveats. |

It also includes an interactive MapLibre map, live NASA GIBS browse tiles, a provenance-aware event record, a licensing gate for open/account/restricted data, an exportable JSON intelligence brief, a connector health preview, responsive mobile layouts, and a PWA service worker for installable app-shell access.

## Quick start

Requirements: **Node.js 22 or later** and npm.

```bash
git clone https://github.com/1243353366/orbital-fusion-console.git
cd orbital-fusion-console
npm install
npm run dev
```

Open the local URL printed by Vite. No API key is required for the public demonstration layers.

### Production build

```bash
npm run build
npm run preview
```

The compiled static site is written to `dist/`.

## Deploy your own copy

### GitHub Pages

1. Fork this repository or push it to a repository you own.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main`, or open **Actions → Deploy to GitHub Pages → Run workflow**.
4. The included workflow builds `dist/` and publishes it under your GitHub account.

The Vite base path is relative, so forks work without changing the repository name. GitHub Pages provides HTTPS, which is required for PWA installation and service workers.

### Any static host

Run `npm run build`, then upload the contents of `dist/` to Cloudflare Pages, Netlify, Vercel, an S3-compatible static host, or a conventional web server. Keep the site on HTTPS for full PWA behavior.

## Navigation

A complete walkthrough is available in [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md). The short version:

1. Use **CYBER / EARTH / FUSION** in the left panel to change the map lens.
2. Toggle NASA imagery, synthetic change masks, intelligence routes, and labels under **Active layers**.
3. Select an event from the map or **Intelligence events** list.
4. Use **Overview**, **Evidence**, and **Provenance** on the right to move from claim to supporting record.
5. Scrub or play the bottom timeline to change the NASA browse-imagery date.
6. Open **Data gate** to inspect source, license, redistribution, derivative-use, and attribution fields.
7. Select **Export brief** to download the current event with its provenance and caveat.
8. On mobile, use the menu button to open map controls; the event drawer stays at the bottom.

## PWA installation

After the deployed app has loaded, use the browser’s **Install app** action. On iOS/iPadOS, use **Share → Add to Home Screen**. The app shell can reopen offline after it has been cached; live external map tiles still require a network connection and are intentionally not copied into the service-worker cache.

## Data and licensing model

Every source record carries:

```text
source → provider → acquisition date → license → permitted use
       → redistribution allowed? → derivatives allowed? → attribution required?
```

The public app defaults to open data and derived products. Commercial providers are represented only as **locked connector definitions**. No restricted imagery is scraped, mirrored, or bundled. See [`docs/DATA_AND_LICENSING.md`](docs/DATA_AND_LICENSING.md) and [`NOTICE.md`](NOTICE.md).

## Architecture

```text
React + TypeScript
       │
       ├── MapLibre GL JS
       │     ├── OpenFreeMap / OpenMapTiles / OpenStreetMap context
       │     └── NASA EOSDIS GIBS browse imagery
       │
       ├── Synthetic event + evidence graph
       ├── Provenance / licensing policy register
       ├── JSON export gate
       └── PWA manifest + same-origin app-shell cache
```

This repository is frontend-only by design. A production deployment with authenticated commercial imagery, persistent notebooks, background synchronization, or malware/code analysis needs a secure backend. Secrets must never be compiled into the browser bundle.

## Customize the data

Synthetic events and connector metadata live in [`src/data.ts`](src/data.ts). New records should retain explicit confidence, provenance, and licensing fields. Use [RFC 5737](https://datatracker.ietf.org/doc/html/rfc5737) documentation IP ranges and `.example` domains for demonstrations.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Type-check and create the production build. |
| `npm run lint` | Run Oxlint. |
| `npm run test:e2e` | Test evidence, policy, and mobile navigation against a running local server. |
| `npm run preview` | Preview the production build locally. |

## Upstream credit

This project is built with [React](https://react.dev/), [Vite](https://vite.dev/), [MapLibre GL JS](https://maplibre.org/), and [Lucide](https://lucide.dev/). Map context is served by [OpenFreeMap](https://openfreemap.org/) using [OpenMapTiles](https://openmaptiles.org/) and [OpenStreetMap](https://www.openstreetmap.org/copyright) data. Earth-observation imagery is accessed from [NASA EOSDIS GIBS](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api); the graceful non-WebGL backdrop credits NASA Scientific Visualization Studio’s [Earth at Night 2012](https://svs.gsfc.nasa.gov/30028). HLS metadata references the [NASA HLS Project](https://registry.opendata.aws/nasa-hls/).

The application itself is released under the [MIT License](LICENSE). Third-party data, imagery, tiles, fonts, and libraries remain under their respective licenses and terms.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing a new connector or dataset. Contributions that weaken provenance, bypass access controls, enable offensive operations, or obscure synthetic-vs-real distinctions will not be accepted.
