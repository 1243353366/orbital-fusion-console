export type Mode = 'CYBER' | 'EARTH' | 'FUSION'

export type DataSource = {
  id: string
  name: string
  provider: string
  category: 'EARTH' | 'CYBER'
  access: 'OPEN' | 'ACCOUNT' | 'RESTRICTED'
  status: 'LIVE' | 'READY' | 'LOCKED'
  license: string
  permittedUse: string
  redistribution: string
  derivatives: string
  attribution: string
  endpoint: string
  note: string
}

export type IntelEvent = {
  id: string
  title: string
  summary: string
  region: string
  coordinates: [number, number]
  linkedPoint: [number, number]
  timestamp: string
  mode: 'CYBER' | 'EARTH' | 'FUSION'
  confidence: number
  confidenceLabel: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  campaign: string
  malware: string
  domain: string
  ip: string
  asn: string
  cve: string
  satellite: string
  acquisitionDate: string
  changeSignal: string
  evidence: Array<{
    label: string
    value: string
    source: string
    confidence: 'HIGH' | 'MEDIUM' | 'UNVERIFIED'
  }>
}

export const sourceCatalog: DataSource[] = [
  {
    id: 'nasa-gibs',
    name: 'NASA GIBS',
    provider: 'NASA Earthdata',
    category: 'EARTH',
    access: 'OPEN',
    status: 'LIVE',
    license: 'NASA ESDIS / CC0 unless otherwise marked',
    permittedUse: 'Educational, informational, research, and factual display',
    redistribution: 'Allowed when the source product carries no separate restriction',
    derivatives: 'Allowed; retain dataset-level provenance',
    attribution: 'Acknowledge NASA as the source',
    endpoint: 'gibs.earthdata.nasa.gov',
    note: 'Live imagery tiles in this prototype. Dataset-specific terms still control.',
  },
  {
    id: 'nasa-hls',
    name: 'NASA HLS v2',
    provider: 'NASA / USGS / ESA',
    category: 'EARTH',
    access: 'ACCOUNT',
    status: 'READY',
    license: 'CC BY 4.0 (registry listing)',
    permittedUse: 'Research and commercial use with attribution',
    redistribution: 'Permitted under the source license; preserve attribution',
    derivatives: 'Permitted under CC BY 4.0',
    attribution: 'NASA HLS Project and product citation required',
    endpoint: 'Earthdata Cloud / LP DAAC',
    note: '30 m harmonized Landsat/Sentinel surface reflectance. Earthdata Login required for direct object access.',
  },
  {
    id: 'sentinel',
    name: 'Copernicus Sentinel-2',
    provider: 'European Union / ESA',
    category: 'EARTH',
    access: 'OPEN',
    status: 'READY',
    license: 'Copernicus data terms',
    permittedUse: 'Broad reuse subject to Copernicus terms',
    redistribution: 'Check product and service terms before mirroring raw scenes',
    derivatives: 'Generally allowed with proper notice',
    attribution: 'Contains modified Copernicus Sentinel data',
    endpoint: 'Copernicus Data Space Ecosystem',
    note: 'Connector interface only in this static prototype.',
  },
  {
    id: 'cisa-kev',
    name: 'CISA KEV',
    provider: 'CISA',
    category: 'CYBER',
    access: 'OPEN',
    status: 'READY',
    license: 'U.S. government public data',
    permittedUse: 'Defensive vulnerability intelligence',
    redistribution: 'Allowed with source citation',
    derivatives: 'Allowed',
    attribution: 'CISA Known Exploited Vulnerabilities Catalog',
    endpoint: 'cisa.gov/known-exploited-vulnerabilities-catalog',
    note: 'Static connector preview; no background synchronization in this build.',
  },
  {
    id: 'mitre-attack',
    name: 'MITRE ATT&CK',
    provider: 'MITRE',
    category: 'CYBER',
    access: 'OPEN',
    status: 'READY',
    license: 'CC BY 4.0',
    permittedUse: 'Defensive research and education with attribution',
    redistribution: 'Allowed under CC BY 4.0',
    derivatives: 'Allowed under CC BY 4.0',
    attribution: '© MITRE; ATT&CK is a trademark of The MITRE Corporation',
    endpoint: 'attack.mitre.org',
    note: 'Technique mappings in the demo are synthetic and clearly labeled.',
  },
  {
    id: 'planet',
    name: 'PlanetScope',
    provider: 'Planet Labs',
    category: 'EARTH',
    access: 'RESTRICTED',
    status: 'LOCKED',
    license: 'Program- and contract-specific',
    permittedUse: 'Only as authorized by the user’s agreement',
    redistribution: 'Not assumed; raw imagery remains locked by default',
    derivatives: 'Requires entitlement review',
    attribution: 'Contract-specific',
    endpoint: 'Authorized connector only',
    note: 'No scraping, bypass, or public redistribution.',
  },
  {
    id: 'capella',
    name: 'Capella Space',
    provider: 'Capella Space',
    category: 'EARTH',
    access: 'RESTRICTED',
    status: 'LOCKED',
    license: 'Contract-specific commercial terms',
    permittedUse: 'Only within an authorized account and approved workflow',
    redistribution: 'Locked until explicitly granted',
    derivatives: 'Requires entitlement review',
    attribution: 'Contract-specific',
    endpoint: 'Authorized connector only',
    note: 'Commercial SAR source represented as a disabled connector.',
  },
  {
    id: 'virustotal',
    name: 'VirusTotal',
    provider: 'Google',
    category: 'CYBER',
    access: 'RESTRICTED',
    status: 'LOCKED',
    license: 'API plan and terms specific',
    permittedUse: 'Only within an authorized API plan',
    redistribution: 'Not assumed',
    derivatives: 'Review required before export',
    attribution: 'Provider terms apply',
    endpoint: 'Authorized connector only',
    note: 'No API key is stored or requested by this frontend.',
  },
]

export const intelEvents: IntelEvent[] = [
  {
    id: 'FUS-204',
    title: 'Suspected ransomware staging corridor',
    summary: 'A synthetic infrastructure cluster overlaps a new regional observation window. The satellite layer adds terrain and infrastructure context; it does not identify an actor or prove activity at a specific site.',
    region: 'Western Black Sea region',
    coordinates: [28.32, 44.18],
    linkedPoint: [30.9, 43.2],
    timestamp: '2025-07-09T21:42:00Z',
    mode: 'FUSION',
    confidence: 82,
    confidenceLabel: 'CORROBORATED',
    severity: 'HIGH',
    campaign: 'Silver Kestrel — synthetic',
    malware: 'Lockware behavior cluster — simulated',
    domain: 'relay-7.example',
    ip: '203.0.113.42',
    asn: 'AS65551 — documentation range',
    cve: 'No verified CVE relationship',
    satellite: 'NASA Terra / MODIS browse imagery',
    acquisitionDate: '2025-07-09',
    changeSignal: 'Synthetic change mask: logistics activity +14%',
    evidence: [
      { label: 'Domain ↔ IP', value: 'Passive-DNS style relationship (synthetic)', source: 'Demo graph', confidence: 'HIGH' },
      { label: 'Malware ↔ Campaign', value: 'Shared configuration markers (synthetic)', source: 'Demo sandbox', confidence: 'MEDIUM' },
      { label: 'Region ↔ Observation', value: 'Temporal and geographic overlap only', source: 'NASA GIBS', confidence: 'HIGH' },
      { label: 'Building ↔ Actor', value: 'No claim; intentionally unsupported', source: 'Provenance gate', confidence: 'UNVERIFIED' },
    ],
  },
  {
    id: 'CYB-118',
    title: 'Documentation-range C2 relay pattern',
    summary: 'Reserved example IP addresses form a synthetic relay chain for demonstrating graph traversal without exposing operational infrastructure.',
    region: 'North Atlantic region',
    coordinates: [-21.83, 64.12],
    linkedPoint: [-14.4, 57.3],
    timestamp: '2025-07-08T06:18:00Z',
    mode: 'CYBER',
    confidence: 66,
    confidenceLabel: 'INDEPENDENT SOURCE',
    severity: 'MEDIUM',
    campaign: 'Polar Relay — synthetic',
    malware: 'Loader telemetry — simulated',
    domain: 'north-hop.example',
    ip: '198.51.100.17',
    asn: 'AS65550 — documentation range',
    cve: 'No verified CVE relationship',
    satellite: 'No imagery correlation selected',
    acquisitionDate: '2025-07-08',
    changeSignal: 'Not evaluated',
    evidence: [
      { label: 'IP ↔ ASN', value: 'Synthetic routing context', source: 'Demo graph', confidence: 'HIGH' },
      { label: 'Domain ↔ Campaign', value: 'Naming-pattern similarity only', source: 'Demo graph', confidence: 'MEDIUM' },
    ],
  },
  {
    id: 'ERT-072',
    title: 'Coastal infrastructure observation',
    summary: 'An Earth-observation-only record demonstrating acquisition metadata and a derived change signal with no cyber attribution attached.',
    region: 'Singapore Strait region',
    coordinates: [103.71, 1.16],
    linkedPoint: [105.3, -0.1],
    timestamp: '2025-07-07T03:06:00Z',
    mode: 'EARTH',
    confidence: 91,
    confidenceLabel: 'SOURCE VERIFIED',
    severity: 'LOW',
    campaign: 'None — observation only',
    malware: 'None',
    domain: 'None',
    ip: 'None',
    asn: 'None',
    cve: 'None',
    satellite: 'NASA Terra / MODIS browse imagery',
    acquisitionDate: '2025-07-07',
    changeSignal: 'Synthetic vessel-density delta +8%',
    evidence: [
      { label: 'Scene provenance', value: 'Acquisition date and source retained', source: 'NASA GIBS', confidence: 'HIGH' },
      { label: 'Derived signal', value: 'Synthetic demonstration; not an operational assessment', source: 'Prototype model', confidence: 'MEDIUM' },
    ],
  },
  {
    id: 'FUS-087',
    title: 'Research-cluster temporal overlap',
    summary: 'A synthetic campaign timeline and an open observation window intersect at regional scale. The link is a lead for review, not a finding.',
    region: 'Mid-Atlantic region',
    coordinates: [-76.18, 37.94],
    linkedPoint: [-68.9, 40.8],
    timestamp: '2025-07-06T14:33:00Z',
    mode: 'FUSION',
    confidence: 48,
    confidenceLabel: 'UNCERTAIN',
    severity: 'MEDIUM',
    campaign: 'Glass Harbor — synthetic',
    malware: 'Downloader behavior — simulated',
    domain: 'beacon-lab.example',
    ip: '192.0.2.88',
    asn: 'AS65549 — documentation range',
    cve: 'Candidate relationship withheld pending verification',
    satellite: 'NASA Terra / MODIS browse imagery',
    acquisitionDate: '2025-07-06',
    changeSignal: 'No significant derived change',
    evidence: [
      { label: 'Timestamp overlap', value: 'Within a 16-hour review window', source: 'Demo graph', confidence: 'MEDIUM' },
      { label: 'Geographic context', value: 'Regional scale only', source: 'NASA GIBS', confidence: 'HIGH' },
      { label: 'Attribution', value: 'Insufficient evidence', source: 'Analyst review', confidence: 'UNVERIFIED' },
    ],
  },
]

export const imageryDates = ['2025-07-06', '2025-07-07', '2025-07-08', '2025-07-09']
