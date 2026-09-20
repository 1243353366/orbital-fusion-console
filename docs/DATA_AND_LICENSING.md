# Data, Licensing, and Provenance Policy

## Default rule

The public build uses open data or metadata and synthetic cyber records. A source being technically reachable does not mean its raw content may be redistributed. Every connector must make access rights, downstream use, derivative-work rights, and attribution visible before content is shown or exported.

## Minimum provenance record

Every Earth-observation record should retain the source/provider, collection and product identifier, platform and sensor, acquisition time, spatial extent, processing level, retrieval time, source URL or object identifier, license or governing terms, permitted purpose, redistribution decision, derivative-work decision, required attribution, and any access entitlement used.

Every cyber record should retain the original publisher, publication or observation time, indicator type, confidence, relationship evidence, transformation history, license or terms, community-source label where applicable, and explicit uncertainty where a relationship is not verified.

## Sources represented in this prototype

| Source | Prototype use | Access posture | License/terms note |
| --- | --- | --- | --- |
| NASA EOSDIS GIBS | Live Terra/MODIS browse tiles | Public | NASA Earthdata says NASA-led mission data are CC0 unless marked otherwise; acknowledge NASA and verify dataset-specific restrictions. |
| NASA HLS v2 | Connector and policy example | Earthdata account | The Registry of Open Data on AWS lists CC BY 4.0 and controlled object access via Earthdata credentials. |
| Copernicus Sentinel-2 | Connector example | Public/account service | Apply the Copernicus data terms and required source notice. |
| CISA KEV | Connector example | Public | Retain catalog name and source URL. |
| MITRE ATT&CK | Connector example | Public | CC BY 4.0; preserve MITRE attribution and trademark notice. |
| PlanetScope, Capella Space | Locked connector examples | Authorized only | Contract/program-specific. Do not assume raw redistribution or derivative rights. |
| VirusTotal | Locked connector example | Authorized only | Plan- and terms-specific; do not expose keys or redistribute results without authorization. |

This table is an implementation aid, not legal advice. Providers may change products and terms. A production connector should store the exact terms/version reviewed and when the decision was made.

## Export gate

An export is allowed only when required provenance fields are present and the requested output is permitted. Open metadata and synthetic derived records may be exported in this prototype. Raw commercial imagery, vendor-restricted cyber results, and any object without a documented policy decision must remain blocked.

## Attribution rendered by the map

MapLibre’s attribution control displays NASA EOSDIS GIBS, OpenFreeMap, OpenMapTiles, and OpenStreetMap attribution next to the map. The repository README and `NOTICE.md` repeat these credits so that forks and non-map documentation retain them.

## No inference leap

Satellite imagery can provide time, terrain, land-use, infrastructure, environmental, and change context. It does not by itself prove that a building is operated by a cyber actor, that a device is at a precise physical location, or that a physical change caused a cyber event. Correlations must be supported by independent evidence and labeled according to confidence.

## References

1. [NASA Earthdata Data Use and Citation Guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance)
2. [NASA GIBS API](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api)
3. [NASA HLS Project — Registry of Open Data on AWS](https://registry.opendata.aws/nasa-hls/)
4. [Copernicus Sentinel Data Legal Notice](https://sentinels.copernicus.eu/web/sentinel/terms-conditions)
5. [OpenStreetMap Copyright and License](https://www.openstreetmap.org/copyright)
6. [OpenFreeMap](https://openfreemap.org/)
7. [MITRE ATT&CK Terms of Use](https://attack.mitre.org/resources/terms-of-use/)
