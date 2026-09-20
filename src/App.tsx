import { useEffect, useMemo, useRef, useState } from 'react'
import { createMD5, createSHA1, createSHA256 } from 'hash-wasm'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, RasterTileSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  CircleDot,
  Code2,
  Database,
  Download,
  ExternalLink,
  Fingerprint,
  Globe2,
  Layers3,
  Lock,
  Menu,
  Network,
  Pause,
  Play,
  Radar,
  Satellite,
  Search,
  ServerCog,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { imageryDates, intelEvents, sourceCatalog, type IntelEvent, type Mode } from './data'
import './App.css'

type LayerState = {
  imagery: boolean
  change: boolean
  routes: boolean
  labels: boolean
}

type DetailTab = 'overview' | 'evidence' | 'provenance'
type SideView = 'event' | 'sources' | 'connectors' | 'browser' | 'artifact'

type BrowserPreviewReport = {
  score: number
  grade: string
  scannedAt: string
  inventory: {
    links: number
    forms: number
    fields: number
    frames: number
    externalOrigins: number
  }
  findings: Array<{ level: string; title: string; detail: string }>
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type ArtifactReport = {
  generatedAt: string
  artifact: { name: string; size: number; type: string; modifiedAt: string }
  hashes: { sha256: string; sha1: string; md5: string }
  reputation: Array<{
    provider: string
    status: 'not-configured' | 'not-found' | 'known'
    detections: number | null
    engines: number | null
    provenance: string
  }>
  localScan: { provider: string; status: 'not-run'; detail: string }
}

const MAX_BROWSER_ARTIFACT_BYTES = 512 * 1024 * 1024

async function hashArtifact(file: File) {
  const [sha256, sha1, md5] = await Promise.all([createSHA256(), createSHA1(), createMD5()])
  const chunkSize = 4 * 1024 * 1024
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunk = new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer())
    sha256.update(chunk)
    sha1.update(chunk)
    md5.update(chunk)
  }
  return { sha256: sha256.digest(), sha1: sha1.digest(), md5: md5.digest() }
}

const modeCopy: Record<Mode, { label: string; detail: string }> = {
  CYBER: { label: 'CYBER', detail: 'Infrastructure + campaign graph' },
  EARTH: { label: 'EARTH', detail: 'Observations + derived context' },
  FUSION: { label: 'FUSION', detail: 'Temporal correlation workspace' },
}

const getEventColor = (event: IntelEvent) => {
  if (event.mode === 'EARTH') return '#52e6d5'
  if (event.mode === 'CYBER') return '#ff4f9a'
  return '#b6f047'
}

const eventsGeoJson = {
  type: 'FeatureCollection' as const,
  features: intelEvents.map((event) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: event.coordinates },
    properties: {
      id: event.id,
      title: event.title,
      mode: event.mode,
      severity: event.severity,
      color: getEventColor(event),
    },
  })),
}

const observationsGeoJson = {
  type: 'FeatureCollection' as const,
  features: intelEvents
    .filter((event) => event.mode !== 'CYBER')
    .map((event) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [event.coordinates[0] + 0.48, event.coordinates[1] + 0.32],
      },
      properties: { id: event.id, color: '#52e6d5' },
    })),
}

const routesGeoJson = {
  type: 'FeatureCollection' as const,
  features: intelEvents
    .filter((event) => event.mode !== 'EARTH')
    .map((event) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [event.coordinates, event.linkedPoint],
      },
      properties: { id: event.id, color: getEventColor(event) },
    })),
}

const changeGeoJson = {
  type: 'FeatureCollection' as const,
  features: intelEvents
    .filter((event) => event.mode !== 'CYBER')
    .map((event) => {
      const [lng, lat] = event.coordinates
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [lng - 0.72, lat - 0.46],
            [lng + 0.72, lat - 0.46],
            [lng + 0.72, lat + 0.46],
            [lng - 0.72, lat + 0.46],
            [lng - 0.72, lat - 0.46],
          ]],
        },
        properties: { id: event.id },
      }
    }),
}

function nasaTile(date: string) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
}

function FusionMap({
  mode,
  selectedEvent,
  onSelect,
  layers,
  imageryDate,
}: {
  mode: Mode
  selectedEvent: IntelEvent
  onSelect: (id: string) => void
  layers: LayerState
  imageryDate: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onSelectRef = useRef(onSelect)
  const baseLayerIdsRef = useRef<string[]>([])
  const initialImageryDateRef = useRef(imageryDate)
  const initialSelectedIdRef = useRef(selectedEvent.id)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [23, 33],
      zoom: 2.35,
      minZoom: 1.35,
      maxZoom: 11,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      attributionControl: false,
      style: 'https://tiles.openfreemap.org/styles/dark',
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    const isolateGeneratedLinks = () => {
      map.getContainer().querySelectorAll<HTMLAnchorElement>('a[target="_blank"]').forEach((link) => {
        link.relList.add('noopener', 'noreferrer')
      })
    }
    const attributionObserver = new MutationObserver(isolateGeneratedLinks)
    attributionObserver.observe(map.getContainer(), { childList: true, subtree: true })
    map.on('idle', isolateGeneratedLinks)

    map.on('load', () => {
      isolateGeneratedLinks()
      baseLayerIdsRef.current = (map.getStyle().layers ?? []).map((layer) => layer.id)
      const firstSymbolLayer = (map.getStyle().layers ?? []).find((layer) => layer.type === 'symbol')?.id
      map.addSource('nasa-imagery', {
        type: 'raster',
        tiles: [nasaTile(initialImageryDateRef.current)],
        tileSize: 256,
        maxzoom: 9,
        attribution: 'Imagery: NASA EOSDIS GIBS',
      })
      map.addLayer(
        {
          id: 'nasa-imagery-layer',
          type: 'raster',
          source: 'nasa-imagery',
          paint: { 'raster-opacity': 0.74, 'raster-saturation': -0.16, 'raster-contrast': 0.16 },
        },
        firstSymbolLayer,
      )

      map.addSource('change-zones', { type: 'geojson', data: changeGeoJson })
      map.addLayer({
        id: 'change-fill',
        type: 'fill',
        source: 'change-zones',
        paint: {
          'fill-color': '#d5ff5f',
          'fill-opacity': 0.09,
          'fill-outline-color': '#d5ff5f',
        },
      })
      map.addLayer({
        id: 'change-line',
        type: 'line',
        source: 'change-zones',
        paint: {
          'line-color': '#d5ff5f',
          'line-width': 1,
          'line-opacity': 0.7,
          'line-dasharray': [3, 3],
        },
      })

      map.addSource('routes', { type: 'geojson', data: routesGeoJson })
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 5,
          'line-opacity': 0.08,
        },
      })
      map.addLayer({
        id: 'route-lines',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.3,
          'line-opacity': 0.74,
          'line-dasharray': [2, 2],
        },
      })

      map.addSource('observations', { type: 'geojson', data: observationsGeoJson })
      map.addLayer({
        id: 'observation-rings',
        type: 'circle',
        source: 'observations',
        paint: {
          'circle-radius': 13,
          'circle-color': 'rgba(82,230,213,0.03)',
          'circle-stroke-color': '#52e6d5',
          'circle-stroke-opacity': 0.55,
          'circle-stroke-width': 1,
        },
      })
      map.addLayer({
        id: 'observation-points',
        type: 'circle',
        source: 'observations',
        paint: {
          'circle-radius': 3,
          'circle-color': '#52e6d5',
          'circle-blur': 0.15,
        },
      })

      map.addSource('events', { type: 'geojson', data: eventsGeoJson })
      map.addLayer({
        id: 'event-halo',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'id'], initialSelectedIdRef.current], 24, 16],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.12,
          'circle-blur': 0.35,
        },
      })
      map.addLayer({
        id: 'event-points',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'id'], initialSelectedIdRef.current], 8, 5],
          'circle-color': '#07110f',
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-width': 2,
        },
      })
      map.addLayer({
        id: 'event-labels',
        type: 'symbol',
        source: 'events',
        minzoom: 2.8,
        layout: {
          'text-field': ['concat', ['get', 'id'], '  ', ['get', 'mode']],
          'text-size': 10,
          'text-font': ['Open Sans Semibold'],
          'text-offset': [0, 1.7],
          'text-anchor': 'top',
          'text-letter-spacing': 0.12,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#d9e6df',
          'text-halo-color': '#07110f',
          'text-halo-width': 1,
        },
      })

      map.on('click', 'event-points', (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id
        if (typeof id === 'string') onSelectRef.current(id)
      })
      map.on('mouseenter', 'event-points', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'event-points', () => {
        map.getCanvas().style.cursor = ''
      })

      setReady(true)
    })

    mapRef.current = map
    return () => {
      attributionObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    const map = mapRef.current
    const visibility = (visible: boolean) => (visible ? 'visible' : 'none')
    const earthVisible = mode !== 'CYBER'
    const cyberVisible = mode !== 'EARTH'

    map.setLayoutProperty('nasa-imagery-layer', 'visibility', visibility(earthVisible && layers.imagery))
    map.setLayoutProperty('change-fill', 'visibility', visibility(earthVisible && layers.change))
    map.setLayoutProperty('change-line', 'visibility', visibility(earthVisible && layers.change))
    map.setLayoutProperty('observation-rings', 'visibility', visibility(earthVisible))
    map.setLayoutProperty('observation-points', 'visibility', visibility(earthVisible))
    map.setLayoutProperty('route-glow', 'visibility', visibility(cyberVisible && layers.routes))
    map.setLayoutProperty('route-lines', 'visibility', visibility(cyberVisible && layers.routes))
    baseLayerIdsRef.current.forEach((layerId) => {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility(layers.labels))
    })
    map.setLayoutProperty('event-points', 'visibility', visibility(cyberVisible))
    map.setLayoutProperty('event-halo', 'visibility', visibility(cyberVisible))
    map.setLayoutProperty('event-labels', 'visibility', visibility(cyberVisible))
  }, [ready, mode, layers])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    const source = mapRef.current.getSource('nasa-imagery') as RasterTileSource | undefined
    if (source) {
      source.setTiles([nasaTile(imageryDate)])
    }
  }, [ready, imageryDate])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    const map = mapRef.current
    const source = map.getSource('events') as GeoJSONSource | undefined
    if (source) {
      source.setData({
        ...eventsGeoJson,
        features: eventsGeoJson.features.map((feature) => ({
          ...feature,
          properties: { ...feature.properties, selected: feature.properties.id === selectedEvent.id },
        })),
      })
    }
    map.setPaintProperty('event-halo', 'circle-radius', [
      'case',
      ['==', ['get', 'id'], selectedEvent.id],
      26,
      16,
    ])
    map.setPaintProperty('event-points', 'circle-radius', [
      'case',
      ['==', ['get', 'id'], selectedEvent.id],
      8,
      5,
    ])
    map.flyTo({ center: selectedEvent.coordinates, zoom: Math.max(map.getZoom(), 4.2), duration: 780 })
  }, [ready, selectedEvent])

  return <div ref={containerRef} className="map-canvas" aria-label="Interactive geospatial intelligence map" />
}

function Toggle({ enabled, onChange, locked = false }: { enabled: boolean; onChange: () => void; locked?: boolean }) {
  return (
    <button
      type="button"
      className={`toggle ${enabled ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
      onClick={onChange}
      aria-pressed={enabled}
      aria-label={locked ? 'Restricted source; open licensing gate' : enabled ? 'Disable layer' : 'Enable layer'}
    >
      <span>{locked ? <Lock size={10} /> : null}</span>
    </button>
  )
}

function ModeSelector({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="mode-selector" role="tablist" aria-label="Intelligence mode">
      {(['CYBER', 'EARTH', 'FUSION'] as Mode[]).map((item) => (
        <button
          type="button"
          role="tab"
          aria-selected={mode === item}
          key={item}
          className={mode === item ? 'active' : ''}
          onClick={() => onChange(item)}
        >
          {item === 'CYBER' ? <Network size={14} /> : item === 'EARTH' ? <Satellite size={14} /> : <Sparkles size={14} />}
          {item}
        </button>
      ))}
    </div>
  )
}

function EventList({ selected, onSelect, query }: { selected: string; onSelect: (id: string) => void; query: string }) {
  const items = intelEvents.filter((event) => {
    const haystack = `${event.title} ${event.region} ${event.id} ${event.campaign}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <div className="event-list">
      {items.map((event) => (
        <button
          type="button"
          key={event.id}
          className={`event-row ${selected === event.id ? 'selected' : ''}`}
          onClick={() => onSelect(event.id)}
        >
          <span className="event-dot" style={{ '--event-color': getEventColor(event) } as React.CSSProperties} />
          <span className="event-row-copy">
            <span className="event-id">{event.id} · {event.mode}</span>
            <strong>{event.title}</strong>
            <span>{event.region}</span>
          </span>
          <span className={`severity ${event.severity.toLowerCase()}`}>{event.severity}</span>
        </button>
      ))}
      {!items.length && <div className="empty-state">No events match this query.</div>}
    </div>
  )
}

function EvidenceChain({ event }: { event: IntelEvent }) {
  const nodes = [event.malware, event.domain, event.ip, event.asn, event.campaign]
  return (
    <div className="evidence-chain">
      {nodes.map((node, index) => (
        <div className="chain-node" key={`${node}-${index}`}>
          <span className="chain-index">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <small>{['MALWARE', 'DOMAIN', 'IP', 'ASN', 'CAMPAIGN'][index]}</small>
            <strong>{node}</strong>
          </div>
          {index < nodes.length - 1 && <span className="chain-line" />}
        </div>
      ))}
    </div>
  )
}

function EventDetail({
  event,
  tab,
  setTab,
  onExport,
  onShare,
  onOpenSources,
}: {
  event: IntelEvent
  tab: DetailTab
  setTab: (tab: DetailTab) => void
  onExport: () => void
  onShare: () => void
  onOpenSources: () => void
}) {
  return (
    <aside className="detail-panel panel-surface">
      <div className="panel-topline">
        <div className="eyebrow"><span className="live-dot" /> SELECTED INTELLIGENCE EVENT</div>
        <button type="button" className="icon-button" onClick={onShare} aria-label="Copy share link"><Share2 size={15} /></button>
      </div>

      <div className="event-heading">
        <div>
          <span className="event-code">{event.id}</span>
          <h1>{event.title}</h1>
          <p>{event.region} · {new Date(event.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC</p>
        </div>
        <span className={`severity large ${event.severity.toLowerCase()}`}>{event.severity}</span>
      </div>

      <div className="confidence-card">
        <div className="confidence-top">
          <span>CONFIDENCE</span>
          <strong>{event.confidence}%</strong>
        </div>
        <div className="confidence-track"><span style={{ width: `${event.confidence}%` }} /></div>
        <small>{event.confidenceLabel}</small>
      </div>

      <div className="detail-tabs" role="tablist">
        {(['overview', 'evidence', 'provenance'] as DetailTab[]).map((item) => (
          <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="detail-scroll">
        {tab === 'overview' && (
          <>
            <p className="summary">{event.summary}</p>
            <div className="no-claim">
              <ShieldCheck size={17} />
              <div><strong>Context, not attribution</strong><span>Imagery never proves that a building or person is a cyber actor.</span></div>
            </div>
            <section className="detail-section">
              <h2>CYBER EVIDENCE</h2>
              <dl className="facts-grid">
                <div><dt>Campaign</dt><dd>{event.campaign}</dd></div>
                <div><dt>Malware</dt><dd>{event.malware}</dd></div>
                <div><dt>Domain</dt><dd>{event.domain}</dd></div>
                <div><dt>IP / ASN</dt><dd>{event.ip}<br />{event.asn}</dd></div>
                <div className="wide"><dt>Vulnerability</dt><dd>{event.cve}</dd></div>
              </dl>
            </section>
            <section className="detail-section">
              <h2>EARTH CONTEXT</h2>
              <dl className="facts-grid">
                <div className="wide"><dt>Observation</dt><dd>{event.satellite}</dd></div>
                <div><dt>Acquired</dt><dd>{event.acquisitionDate}</dd></div>
                <div><dt>Derived signal</dt><dd>{event.changeSignal}</dd></div>
              </dl>
            </section>
          </>
        )}

        {tab === 'evidence' && (
          <>
            <div className="section-intro">Trace the synthetic relationship chain. Each edge retains its own source and confidence.</div>
            <EvidenceChain event={event} />
            <section className="detail-section">
              <h2>EVIDENCE REGISTER</h2>
              <div className="evidence-register">
                {event.evidence.map((item) => (
                  <div className="evidence-item" key={item.label}>
                    <div><strong>{item.label}</strong><span>{item.value}</span></div>
                    <div className="evidence-meta"><span>{item.source}</span><em className={item.confidence.toLowerCase()}>{item.confidence}</em></div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'provenance' && (
          <>
            <div className="provenance-stamp"><Fingerprint size={22} /><div><span>PROVENANCE COMPLETE</span><strong>5 of 5 required fields</strong></div></div>
            <dl className="provenance-list">
              <div><dt>Source</dt><dd>NASA EOSDIS GIBS + synthetic demo graph</dd></div>
              <div><dt>Satellite / sensor</dt><dd>{event.satellite}</dd></div>
              <div><dt>Acquisition date</dt><dd>{event.acquisitionDate}</dd></div>
              <div><dt>License decision</dt><dd>Open display; NASA attribution retained</dd></div>
              <div><dt>Redistribution</dt><dd>Derived event metadata: allowed. Verify terms before exporting raw scenes.</dd></div>
            </dl>
            <button type="button" className="text-button full" onClick={onOpenSources}>Open source policy gate <ExternalLink size={13} /></button>
          </>
        )}
      </div>

      <div className="detail-actions">
        <button type="button" className="primary-button" onClick={onExport}><Download size={14} /> Export brief</button>
        <button type="button" className="secondary-button" onClick={onOpenSources}><Database size={14} /> Sources</button>
      </div>
    </aside>
  )
}

function SourcesPanel({ onClose }: { onClose: () => void }) {
  const [expanded, setExpanded] = useState(sourceCatalog[0].id)
  return (
    <aside className="detail-panel panel-surface source-panel">
      <div className="panel-topline">
        <div className="eyebrow"><Fingerprint size={13} /> LICENSING + PROVENANCE GATE</div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close data source panel"><X size={16} /></button>
      </div>
      <div className="source-panel-heading">
        <h1>Source policy register</h1>
        <p>Default public views use open imagery and derived products. Restricted sources stay locked until entitlement and downstream rights are recorded.</p>
      </div>
      <div className="policy-summary">
        <div><strong>5</strong><span>OPEN / READY</span></div>
        <div><strong>3</strong><span>RESTRICTED</span></div>
        <div><strong>0</strong><span>UNCLASSIFIED</span></div>
      </div>
      <div className="source-register">
        {sourceCatalog.map((source) => (
          <article className={`source-record ${source.status.toLowerCase()}`} key={source.id}>
            <button type="button" className="source-record-head" onClick={() => setExpanded(expanded === source.id ? '' : source.id)}>
              <span className="source-icon">{source.category === 'EARTH' ? <Satellite size={15} /> : <Network size={15} />}</span>
              <span><strong>{source.name}</strong><small>{source.provider}</small></span>
              <em>{source.status}</em>
              <ChevronDown size={14} className={expanded === source.id ? 'rotated' : ''} />
            </button>
            {expanded === source.id && (
              <div className="source-record-body">
                <dl>
                  <div><dt>License</dt><dd>{source.license}</dd></div>
                  <div><dt>Permitted use</dt><dd>{source.permittedUse}</dd></div>
                  <div><dt>Redistribution</dt><dd>{source.redistribution}</dd></div>
                  <div><dt>Derivatives</dt><dd>{source.derivatives}</dd></div>
                  <div><dt>Attribution</dt><dd>{source.attribution}</dd></div>
                </dl>
                <p>{source.note}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </aside>
  )
}

function ConnectorsPanel({ onClose, notify }: { onClose: () => void; notify: (message: string) => void }) {
  return (
    <aside className="detail-panel panel-surface connector-panel">
      <div className="panel-topline">
        <div className="eyebrow"><ServerCog size={13} /> CONNECTOR HEALTH CENTER</div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close connector panel"><X size={16} /></button>
      </div>
      <div className="source-panel-heading">
        <h1>Connector status</h1>
        <p>Public sources are previewed client-side. Account and commercial connectors require a secure backend before activation.</p>
      </div>
      <div className="connector-table">
        <div className="connector-table-head"><span>CONNECTOR</span><span>STATUS</span><span>RECORDS</span></div>
        {sourceCatalog.map((source, index) => (
          <div className="connector-row" key={source.id}>
            <div><strong>{source.name}</strong><small>{source.endpoint}</small></div>
            <span className={`connector-status ${source.status.toLowerCase()}`}><i />{source.status}</span>
            <span className="record-count">{source.status === 'LIVE' ? 'TILES' : source.status === 'READY' ? `${(index + 3) * 418}` : '—'}</span>
            <div className="connector-actions">
              <button type="button" onClick={() => notify(`${source.name}: connection test queued in demo mode.`)}>Test</button>
              <button type="button" disabled={source.status === 'LOCKED'} onClick={() => notify(`${source.name}: static prototype has no background sync.`)}>Sync</button>
            </div>
          </div>
        ))}
      </div>
      <div className="backend-note"><Lock size={16} /><p><strong>Secrets stay server-side.</strong> This GitHub Pages build intentionally contains no API keys, commercial credentials, or executable malware-analysis backend.</p></div>
    </aside>
  )
}

function BrowserScanPanel({
  onClose,
  consent,
  setConsent,
  report,
  onScan,
}: {
  onClose: () => void
  consent: boolean
  setConsent: (consent: boolean) => void
  report: BrowserPreviewReport | null
  onScan: () => void
}) {
  return (
    <aside className="detail-panel panel-surface browser-panel">
      <div className="panel-topline">
        <div className="eyebrow"><ShieldCheck size={13} /> BROWSER LENS · CONSENT REQUIRED</div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close browser lens"><X size={16} /></button>
      </div>
      <div className="source-panel-heading browser-heading">
        <span className="event-code">ACTIVE TAB ONLY</span>
        <h1>Private page scan</h1>
        <p>The downloadable extension inspects only the active tab after a click. This live panel demonstrates the same checks against the Orbital app itself.</p>
      </div>
      <div className="detail-scroll browser-scroll">
        <div className="permission-grid">
          <div><span>READS</span><strong>Active-tab structure and security attributes</strong></div>
          <div><span>NEVER READS</span><strong>History, cookies, passwords, values, or other tabs</strong></div>
          <div><span>REPORT ROUTE</span><strong>Local only — no upload endpoint</strong></div>
        </div>

        <label className="browser-consent">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span><strong>One-time consent</strong>I authorize a local structure scan of this page. Consent resets immediately after the scan.</span>
        </label>
        <button type="button" className="primary-button browser-scan-button" disabled={!consent} onClick={onScan}>
          <ShieldCheck size={14} /> Scan this live preview
        </button>

        {report ? (
          <section className="browser-report" aria-live="polite">
            <div className="browser-score">
              <div><span>PAGE HYGIENE</span><strong>{report.score}/100</strong></div>
              <em>{report.grade}</em>
            </div>
            <div className="browser-meta"><span>SCANNED LOCALLY</span><strong>{new Date(report.scannedAt).toLocaleTimeString()}</strong></div>
            <div className="inventory-grid">
              {Object.entries(report.inventory).map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label.replace(/([A-Z])/g, ' $1')}</span></div>)}
            </div>
            <div className="browser-findings">
              {report.findings.map((finding) => (
                <article className={finding.level} key={finding.title}>
                  <span>{finding.level}</span><strong>{finding.title}</strong><p>{finding.detail}</p>
                </article>
              ))}
            </div>
            <p className="scan-limit"><AlertTriangle size={13} /> A clean DOM hygiene scan does not prove a page is safe. It is not a vulnerability assessment or malware verdict.</p>
          </section>
        ) : <div className="scan-empty"><Fingerprint size={20} /><strong>No page data has been read</strong><span>Review the scope, check consent, then start the one-time preview.</span></div>}
      </div>
      <div className="detail-actions browser-actions">
        <a className="primary-button" href="https://github.com/1243353366/orbital-fusion-console/releases/latest" target="_blank" rel="noopener noreferrer"><Download size={14} /> Get browser package</a>
        <a className="secondary-button" href="https://github.com/1243353366/orbital-fusion-console/blob/main/docs/BROWSER_EXTENSION.md" target="_blank" rel="noopener noreferrer"><BookOpen size={14} /> Install guide</a>
      </div>
    </aside>
  )
}

function ArtifactScannerPanel({
  onClose,
  file,
  consent,
  setConsent,
  busy,
  report,
  onFile,
  onHash,
  onExport,
}: {
  onClose: () => void
  file: File | null
  consent: boolean
  setConsent: (consent: boolean) => void
  busy: boolean
  report: ArtifactReport | null
  onFile: (file: File | null) => void
  onHash: () => void
  onExport: () => void
}) {
  return (
    <aside className="detail-panel panel-surface artifact-panel">
      <div className="panel-topline">
        <div className="eyebrow"><Fingerprint size={13} /> FILE SCANNER · HASH FIRST</div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close file scanner"><X size={16} /></button>
      </div>
      <div className="source-panel-heading browser-heading">
        <span className="event-code">NO AUTOMATIC UPLOADS</span>
        <h1>Release verification</h1>
        <p>Fingerprint an APK, EXE, ZIP, or other artifact locally, then use the normalized record for reputation lookup before any optional submission.</p>
      </div>
      <div className="detail-scroll browser-scroll">
        <div className="scan-pipeline" aria-label="Artifact scan pipeline">
          {['Artifact', 'SHA-256', 'Reputation', 'Optional submit', 'Normalized result'].map((step, index) => (
            <div key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></div>
          ))}
        </div>

        <label className="file-drop">
          <input type="file" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
          <Database size={22} />
          <strong>{file ? file.name : 'Choose an artifact'}</strong>
          <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${file.type || 'unknown type'}` : 'APK · EXE · ZIP · DMG · package or binary · 512 MB max'}</span>
        </label>

        <label className="browser-consent artifact-consent">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span><strong>Local hash consent</strong>I authorize this browser to read the selected file only to calculate SHA-256, SHA-1, and MD5. The file is not uploaded.</span>
        </label>
        <button type="button" className="primary-button browser-scan-button" disabled={!file || !consent || busy} onClick={onHash}>
          <Fingerprint size={14} /> {busy ? 'Hashing locally…' : 'Calculate fingerprints'}
        </button>

        {report ? (
          <section className="artifact-report" aria-live="polite">
            <div className="artifact-summary"><span>FINGERPRINT COMPLETE</span><strong>{report.artifact.name}</strong><small>{new Date(report.generatedAt).toLocaleString()}</small></div>
            <dl className="hash-list">
              <div><dt>SHA-256</dt><dd>{report.hashes.sha256}</dd></div>
              <div><dt>SHA-1</dt><dd>{report.hashes.sha1}</dd></div>
              <div><dt>MD5</dt><dd>{report.hashes.md5}</dd></div>
            </dl>
            <div className="provider-list">
              {report.reputation.map((provider) => (
                <article key={provider.provider}>
                  <div><strong>{provider.provider}</strong><span>{provider.provenance}</span></div>
                  <em>{provider.status.replace('-', ' ')}</em>
                </article>
              ))}
              <article><div><strong>{report.localScan.provider}</strong><span>{report.localScan.detail}</span></div><em>{report.localScan.status.replace('-', ' ')}</em></article>
            </div>
            <p className="scan-limit"><AlertTriangle size={13} /> A hash is a fingerprint, not an antivirus verdict. A “not found” reputation result also does not mean clean.</p>
          </section>
        ) : <div className="scan-empty"><Fingerprint size={20} /><strong>No artifact has been read</strong><span>Select a file and approve local hashing to create the normalized lookup record.</span></div>}
      </div>
      <div className="detail-actions browser-actions">
        <button type="button" className="primary-button" disabled={!report} onClick={onExport}><Download size={14} /> Export JSON</button>
        <a className="secondary-button" href="https://github.com/1243353366/orbital-fusion-console/blob/main/docs/FILE_SCANNER.md" target="_blank" rel="noopener noreferrer"><BookOpen size={14} /> Scanner guide</a>
      </div>
    </aside>
  )
}

function App() {
  const [mode, setMode] = useState<Mode>('FUSION')
  const [selectedId, setSelectedId] = useState(() => {
    const eventId = new URLSearchParams(window.location.search).get('event')
    return eventId && intelEvents.some((event) => event.id === eventId) ? eventId : intelEvents[0].id
  })
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [sideView, setSideView] = useState<SideView>(() => {
    const view = new URLSearchParams(window.location.search).get('view')
    return view === 'browser' || view === 'artifact' ? view : 'event'
  })
  const [query, setQuery] = useState('')
  const [imageryIndex, setImageryIndex] = useState(imageryDates.length - 1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [browserConsent, setBrowserConsent] = useState(false)
  const [browserReport, setBrowserReport] = useState<BrowserPreviewReport | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [artifactFile, setArtifactFile] = useState<File | null>(null)
  const [artifactConsent, setArtifactConsent] = useState(false)
  const [artifactBusy, setArtifactBusy] = useState(false)
  const [artifactReport, setArtifactReport] = useState<ArtifactReport | null>(null)
  const [layers, setLayers] = useState<LayerState>({ imagery: true, change: true, routes: true, labels: true })

  const selectedEvent = useMemo(
    () => intelEvents.find((event) => event.id === selectedId) ?? intelEvents[0],
    [selectedId],
  )

  const imageryDate = imageryDates[imageryIndex]

  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setInterval(() => {
      setImageryIndex((current) => {
        if (current >= imageryDates.length - 1) {
          setIsPlaying(false)
          return 0
        }
        return current + 1
      })
    }, 1200)
    return () => window.clearInterval(timer)
  }, [isPlaying])

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
  }, [])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  const selectEvent = (id: string) => {
    setSelectedId(id)
    setDetailTab('overview')
    setSideView('event')
  }

  const toggleLayer = (key: keyof LayerState) => {
    setLayers((current) => ({ ...current, [key]: !current[key] }))
  }

  const exportBrief = () => {
    const source = sourceCatalog.find((item) => item.id === 'nasa-gibs')
    const payload = {
      exportedAt: new Date().toISOString(),
      classification: 'EDUCATIONAL PROTOTYPE — SYNTHETIC CYBER DATA',
      event: selectedEvent,
      provenance: source,
      caveat: 'Satellite imagery provides contextual geospatial evidence and does not establish cyber attribution.',
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${selectedEvent.id.toLowerCase()}-fusion-brief.json`
    anchor.click()
    URL.revokeObjectURL(url)
    notify('Provenance-aware JSON brief exported.')
  }

  const shareSnapshot = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('event', selectedEvent.id)
    try {
      await navigator.clipboard.writeText(url.toString())
      notify('Snapshot link copied to clipboard.')
    } catch {
      notify(`Snapshot: ${url.toString()}`)
    }
  }

  const runBrowserPreview = () => {
    if (!browserConsent) return
    const nodes = (selector: string) => [...document.querySelectorAll(selector)]
    const externalOrigins = new Set(nodes('script[src],img[src],iframe[src],link[href]').flatMap((element) => {
      const reference = element.getAttribute('src') ?? element.getAttribute('href')
      if (!reference) return []
      try {
        const origin = new URL(reference, window.location.href).origin
        return origin !== window.location.origin ? [origin] : []
      } catch {
        return []
      }
    }))
    const unlabeledFields = nodes('input:not([type="hidden"]):not([type="submit"]):not([type="button"]),select,textarea').filter((field) => {
      const ariaLabel = field.getAttribute('aria-label') || field.getAttribute('aria-labelledby')
      const labels = 'labels' in field ? (field as HTMLInputElement).labels : null
      return !ariaLabel && !labels?.length
    }).length
    const unsafeBlankLinks = nodes('a[target="_blank"]').filter((link) => !(link as HTMLAnchorElement).relList.contains('noopener')).length
    const findings: BrowserPreviewReport['findings'] = []
    if (unlabeledFields) findings.push({ level: 'LOW', title: 'Unlabeled form controls', detail: `${unlabeledFields} field(s) need an accessible label review.` })
    if (unsafeBlankLinks) findings.push({ level: 'LOW', title: 'New-tab relationship policy', detail: `${unsafeBlankLinks} link(s) do not explicitly declare noopener.` })
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy" i]')) findings.push({ level: 'INFO', title: 'Header policy not observable', detail: 'This DOM-only preview does not inspect HTTP response headers.' })
    if (!findings.some((finding) => finding.level !== 'INFO')) findings.push({ level: 'INFO', title: 'No obvious DOM hygiene issues', detail: 'The limited local scan found no actionable structure findings.' })
    const penalty = findings.filter((finding) => finding.level === 'LOW').length * 4
    setBrowserReport({
      score: Math.max(0, 100 - penalty),
      grade: penalty === 0 ? 'A' : 'B',
      scannedAt: new Date().toISOString(),
      inventory: {
        links: nodes('a[href]').length,
        forms: nodes('form').length,
        fields: nodes('input,select,textarea').length,
        frames: nodes('iframe').length,
        externalOrigins: externalOrigins.size,
      },
      findings,
    })
    setBrowserConsent(false)
    notify('Local preview complete. No page data was uploaded.')
  }

  const installApp = async () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      notify('Orbital Fusion Console is already running as an installed app.')
      return
    }
    if (!installPrompt) {
      notify('Use your browser menu → Install app. On iPhone or iPad, use Share → Add to Home Screen.')
      return
    }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    notify(choice.outcome === 'accepted' ? 'App installation accepted.' : 'App installation dismissed; nothing changed.')
  }

  const createArtifactReport = async () => {
    if (!artifactFile || !artifactConsent) return
    setArtifactBusy(true)
    try {
      const hashes = await hashArtifact(artifactFile)
      setArtifactReport({
        generatedAt: new Date().toISOString(),
        artifact: {
          name: artifactFile.name,
          size: artifactFile.size,
          type: artifactFile.type || 'application/octet-stream',
          modifiedAt: new Date(artifactFile.lastModified).toISOString(),
        },
        hashes,
        reputation: [
          { provider: 'VirusTotal', status: 'not-configured', detections: null, engines: null, provenance: 'Hash lookup adapter · API key required' },
          { provider: 'MetaDefender Cloud', status: 'not-configured', detections: null, engines: null, provenance: 'Hash lookup adapter · API key required' },
        ],
        localScan: { provider: 'ClamAV', status: 'not-run', detail: 'Run the documented local CLI scanner for an engine verdict.' },
      })
      notify('Fingerprints calculated locally. The artifact was not uploaded.')
    } finally {
      setArtifactBusy(false)
      setArtifactConsent(false)
    }
  }

  const exportArtifactReport = () => {
    if (!artifactReport) return
    const blob = new Blob([JSON.stringify(artifactReport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${artifactReport.artifact.name.replace(/[^a-z0-9._-]/gi, '_')}.sentinel-scan.json`
    anchor.click()
    URL.revokeObjectURL(url)
    notify('Normalized artifact report exported.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark"><Radar size={18} /></div>
          <div><strong>ORBITAL</strong><span>FUSION CONSOLE</span></div>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <button type="button" className="active"><Globe2 size={14} /> Observatory</button>
          <button type="button" onClick={() => setSideView('browser')}><ShieldCheck size={14} /> Browser Lens</button>
          <button type="button" onClick={() => setSideView('artifact')}><Code2 size={14} /> File Scanner</button>
          <button type="button" onClick={() => notify('Malware Lab remains non-executing in this static prototype.')}><Box size={14} /> Malware Lab</button>
          <button type="button" onClick={() => notify('Notebook persistence requires the future authenticated backend.')}><BookOpen size={14} /> Notebook</button>
        </nav>
        <div className="top-actions">
          <span className="version-pill">v0.2.1</span>
          <button type="button" className="install-pill" onClick={installApp}>
            <Download size={13} /> INSTALL APP
          </button>
          <button type="button" className="safety-pill" onClick={() => notify('All cyber indicators are synthetic and use reserved example domains/IPs.')}>
            <ShieldCheck size={13} /> SAFE ANALYSIS
          </button>
          <button type="button" className="gate-button" onClick={() => setSideView('sources')}>
            <Fingerprint size={14} /> Data gate <span>5 / 3</span>
          </button>
          <button type="button" className="mobile-menu" onClick={() => setLeftOpen(!leftOpen)} aria-label="Toggle controls"><Menu size={18} /></button>
        </div>
      </header>

      <main className="workspace">
        <div className="map-stage">
          <FusionMap
            mode={mode}
            selectedEvent={selectedEvent}
            onSelect={selectEvent}
            layers={layers}
            imageryDate={imageryDate}
          />
          <div className="map-vignette" />
          <div className="grid-overlay" />

          <div className="map-status">
            <span><i /> NASA GIBS LIVE</span>
            <span>{imageryDate}</span>
            <span>EPSG:3857</span>
          </div>

          <div className="map-legend">
            <span><i className="legend-fusion" /> Fusion event</span>
            <span><i className="legend-cyber" /> Cyber evidence</span>
            <span><i className="legend-earth" /> Earth observation</span>
            <span><i className="legend-change" /> Derived change</span>
          </div>

          <div className="mode-banner">
            <span>{modeCopy[mode].label} MODE</span>
            <strong>{modeCopy[mode].detail}</strong>
          </div>

          <div className="timeline panel-surface">
            <button type="button" className="play-button" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}>
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <div className="timeline-copy"><span>OBSERVATION WINDOW</span><strong>{imageryDate}</strong></div>
            <div className="timeline-control">
              <div className="timeline-ticks">
                {imageryDates.map((date, index) => <span key={date} className={index <= imageryIndex ? 'passed' : ''} />)}
              </div>
              <input
                type="range"
                min="0"
                max={imageryDates.length - 1}
                value={imageryIndex}
                onChange={(event) => setImageryIndex(Number(event.target.value))}
                aria-label="Observation date"
              />
              <div className="timeline-labels"><span>06 JUL</span><span>09 JUL</span></div>
            </div>
            <div className="timeline-source"><Satellite size={16} /><div><span>ACTIVE IMAGERY</span><strong>Terra / MODIS True Color</strong></div></div>
          </div>
        </div>

        <aside className={`control-panel panel-surface ${leftOpen ? 'mobile-open' : ''}`}>
          <div className="control-title">
            <div><span>INTELLIGENCE LENS</span><strong>Global observatory</strong></div>
            <button type="button" className="mobile-close" onClick={() => setLeftOpen(false)}><X size={15} /></button>
          </div>
          <ModeSelector mode={mode} onChange={setMode} />

          <div className="search-box">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event, region, campaign" aria-label="Search events, regions, and campaigns" />
            <kbd>⌘K</kbd>
          </div>

          <section className="control-section">
            <div className="section-label"><span>ACTIVE LAYERS</span><SlidersHorizontal size={13} /></div>
            <div className="layer-list">
              <div className="layer-row"><span className="layer-icon cyan"><Satellite size={14} /></span><div><strong>NASA true color</strong><small>Live GIBS tiles · open</small></div><Toggle enabled={layers.imagery} onChange={() => toggleLayer('imagery')} /></div>
              <div className="layer-row"><span className="layer-icon lime"><Zap size={14} /></span><div><strong>Change masks</strong><small>Synthetic derived product</small></div><Toggle enabled={layers.change} onChange={() => toggleLayer('change')} /></div>
              <div className="layer-row"><span className="layer-icon pink"><Network size={14} /></span><div><strong>Intel routes</strong><small>Synthetic correlation graph</small></div><Toggle enabled={layers.routes} onChange={() => toggleLayer('routes')} /></div>
              <div className="layer-row"><span className="layer-icon neutral"><Layers3 size={14} /></span><div><strong>Base context</strong><small>OpenFreeMap · OSM data</small></div><Toggle enabled={layers.labels} onChange={() => toggleLayer('labels')} /></div>
            </div>
          </section>

          <section className="control-section data-sources-mini">
            <div className="section-label"><span>SOURCE ACCESS</span><button type="button" onClick={() => setSideView('sources')}>VIEW ALL</button></div>
            <button type="button" className="mini-source" onClick={() => setSideView('sources')}><span className="source-state live"><Activity size={13} /></span><div><strong>NASA GIBS</strong><small>Public imagery · connected</small></div><em>LIVE</em></button>
            <button type="button" className="mini-source" onClick={() => setSideView('sources')}><span className="source-state ready"><Check size={13} /></span><div><strong>NASA HLS v2</strong><small>Account access · CC BY 4.0</small></div><em>READY</em></button>
            <button type="button" className="mini-source restricted" onClick={() => setSideView('sources')}><span className="source-state"><Lock size={13} /></span><div><strong>Commercial imagery</strong><small>Entitlement required</small></div><em>LOCKED</em></button>
          </section>

          <section className="control-section events-section">
            <div className="section-label"><span>INTELLIGENCE EVENTS</span><em>{intelEvents.length}</em></div>
            <EventList selected={selectedId} onSelect={selectEvent} query={query} />
          </section>

          <button type="button" className="connector-link" onClick={() => setSideView('connectors')}><ServerCog size={14} /> Connector health center <ExternalLink size={12} /></button>
          <div className="simulation-stamp"><AlertTriangle size={14} /><span><strong>SIMULATION</strong> — NOT REAL MALWARE</span></div>
        </aside>

        {sideView === 'event' && (
          <EventDetail
            event={selectedEvent}
            tab={detailTab}
            setTab={setDetailTab}
            onExport={exportBrief}
            onShare={shareSnapshot}
            onOpenSources={() => setSideView('sources')}
          />
        )}
        {sideView === 'sources' && <SourcesPanel onClose={() => setSideView('event')} />}
        {sideView === 'connectors' && <ConnectorsPanel onClose={() => setSideView('event')} notify={notify} />}
        {sideView === 'browser' && (
          <BrowserScanPanel
            onClose={() => setSideView('event')}
            consent={browserConsent}
            setConsent={setBrowserConsent}
            report={browserReport}
            onScan={runBrowserPreview}
          />
        )}
        {sideView === 'artifact' && (
          <ArtifactScannerPanel
            onClose={() => setSideView('event')}
            file={artifactFile}
            consent={artifactConsent}
            setConsent={setArtifactConsent}
            busy={artifactBusy}
            report={artifactReport}
            onFile={(file) => {
              if (file && file.size > MAX_BROWSER_ARTIFACT_BYTES) {
                notify('Artifact exceeds the 512 MB browser limit. Use the streaming local CLI instead.')
                setArtifactFile(null)
                setArtifactReport(null)
                setArtifactConsent(false)
                return
              }
              setArtifactFile(file)
              setArtifactReport(null)
              setArtifactConsent(false)
            }}
            onHash={createArtifactReport}
            onExport={exportArtifactReport}
          />
        )}
      </main>

      {toast && <div className="toast"><CircleDot size={14} />{toast}</div>}
    </div>
  )
}

export default App
