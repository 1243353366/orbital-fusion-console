# Orbital Fusion Console User Guide

## Orientation

The console is divided into four working areas: the top navigation bar, the left intelligence controls, the central map and timeline, and the right evidence drawer. On narrow screens, the left controls become a slide-over opened from the menu button, while the evidence drawer moves to the bottom.

## Top navigation

**Observatory** is the active prototype. **Code Lab**, **Malware Lab**, and **Notebook** show roadmap notices because this repository is a frontend-only map prototype. They do not execute code, accept malware, or persist research records.

The **Safe Analysis** indicator confirms that the cyber scenario is synthetic. **Data gate** opens the source policy register and shows the current count of open/ready versus restricted connectors.

## Intelligence lenses

The **CYBER** lens emphasizes synthetic infrastructure and campaign relationships. NASA imagery and Earth-only overlays are hidden so that the relationship graph is easier to follow.

The **EARTH** lens emphasizes NASA browse imagery, observation points, and synthetic change masks. Cyber routes are hidden and no cyber attribution is inferred from the image.

The **FUSION** lens displays both evidence classes. Use it to review whether independently sourced cyber timestamps overlap a regional observation window. An overlap is a lead for investigation, not proof of cause, identity, ownership, or physical presence.

## Active layers

**NASA true color** enables the Terra/MODIS Corrected Reflectance True Color browse tiles served by NASA EOSDIS GIBS. The tile date follows the bottom timeline.

**Change masks** displays synthetic dashed areas around Earth-observation examples. These are UI demonstrations, not remote-sensing results.

**Intel routes** displays synthetic graph edges between event points and related documentation-only infrastructure.

**Base context** toggles the OpenFreeMap dark vector style, built from OpenMapTiles and OpenStreetMap data, beneath the NASA imagery.

## Search and events

Type an event ID, title, campaign name, or region in the search field. Choose an event from the result list or click a colored event marker on the map. The map flies to the selected event and the right drawer updates.

Markers use cyan for Earth observations, magenta for cyber evidence, and lime for fusion records. Severity badges communicate the synthetic scenario’s review priority, not a verified real-world threat level.

## Evidence drawer

The **Overview** tab presents the scenario summary, explicit attribution caveat, cyber fields, and Earth-observation fields.

The **Evidence** tab traces the malware → domain → IP → ASN → campaign chain. Each relationship has its own evidence statement, source label, and confidence value. “Unverified” relationships are intentionally left unresolved rather than invented.

The **Provenance** tab records the source, satellite or sensor, acquisition date, license decision, and redistribution decision. Select **Open source policy gate** or **Sources** for the full register.

**Export brief** downloads a JSON file containing the selected event, the source-policy record, export timestamp, synthetic-data classification, and the context-not-attribution caveat. **Share** copies a URL containing the selected event ID.

## Timeline

Drag the slider to select an observation date, or use Play to animate the available dates. The status strip in the upper-left corner of the map reports the selected date and map projection.

The app requests browse tiles from the upstream NASA service for the chosen day. If a tile is unavailable or the browser is offline, the basemap remains visible and the licensing/evidence interfaces still work.

## Data gate

Each source record is classified as **Live**, **Ready**, or **Locked**.

**Live** means the public frontend currently requests the source directly. **Ready** means the connector model is present but this static build does not continuously synchronize it. **Locked** means authentication, contract terms, or redistribution rights must be documented before activation.

Expand a source to review its license, permitted use, redistribution posture, derivative-work posture, attribution requirement, and implementation note. Dataset-specific terms override the high-level summary.

## Connector health center

The health center is a transparent preview of the proposed connector administration experience. Test and Sync actions only display demo notices. A production implementation must move credentials, synchronization, logs, rate-limit handling, and provider-specific policy decisions to a secure backend.

## Install as an app

On Chromium-based desktop browsers, open the browser menu and choose **Install Orbital Fusion Console**. On iPhone or iPad, open the Share menu and choose **Add to Home Screen**. Installation requires the deployed HTTPS site.

The service worker caches only same-origin application-shell files. It deliberately avoids bulk caching third-party tiles, which helps respect upstream services and licensing boundaries. Live imagery still requires connectivity.

## Safe interpretation

Never interpret a point marker, route, or image as a claim about a real actor, building, network owner, or event. The prototype is designed to make the distinction between observation, derived context, hypothesis, and corroborated evidence visible at every step.
