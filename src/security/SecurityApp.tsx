import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Code2,
  Copy,
  Download,
  EyeOff,
  FileKey2,
  FileLock2,
  Fingerprint,
  Gauge,
  GitFork,
  KeyRound,
  Layers3,
  LockKeyhole,
  Network,
  PackageCheck,
  Play,
  ScanSearch,
  ShieldCheck,
  SquareTerminal,
} from "lucide-react";
import heroArt from "./assets/security-hero.webp";
import scanOrb from "./assets/security-orb.webp";

type Category = "All" | "Runtime" | "Supply chain" | "Privacy" | "Artifacts";

type Control = {
  category: Exclude<Category, "All">;
  label: string;
  tool: string;
  result: string;
  detail: string;
  icon: typeof ShieldCheck;
};

const controls: Control[] = [
  {
    category: "Runtime",
    label: "Consent & accessibility",
    tool: "Browser Lens + Puppeteer",
    result: "Passed",
    detail: "One search field, two application links, and three MapLibre attribution links were found, fixed, and retested with explicit new-tab isolation.",
    icon: ScanSearch,
  },
  {
    category: "Supply chain",
    label: "Dependency audit",
    tool: "npm audit",
    result: "0 vulnerabilities",
    detail: "Production and complete dependency trees returned zero info, low, moderate, high, or critical findings.",
    icon: Network,
  },
  {
    category: "Privacy",
    label: "Secret & configuration audit",
    tool: "detect-secrets",
    result: "0 findings",
    detail: "Source, workflows, scripts, manifests, and configuration were inspected without exposing credentials in the public bundle.",
    icon: KeyRound,
  },
  {
    category: "Privacy",
    label: "API authorization boundary",
    tool: "Static boundary tests",
    result: "Passed",
    detail: "Provider keys remain CLI environment variables only. The browser bundle has no credential path and performs no provider upload.",
    icon: FileLock2,
  },
  {
    category: "Runtime",
    label: "Browser authorization",
    tool: "Manifest validation",
    result: "2 permissions",
    detail: "Exactly activeTab and scripting. No host permissions, history, cookies, storage, telemetry, background worker, or remote-code path.",
    icon: LockKeyhole,
  },
  {
    category: "Runtime",
    label: "Input validation",
    tool: "Boundary + browser tests",
    result: "Passed",
    detail: "HTTP(S)-only tab guard, 512 MB browser artifact limit, regular-file CLI guard, sanitized export name, and loopback-only local server.",
    icon: ClipboardCheck,
  },
  {
    category: "Runtime",
    label: "Content Security Policy",
    tool: "Static CSP + local headers",
    result: "Enforced",
    detail: "Restricted origins, disabled objects and forms, same-origin manifest and worker policy, and no remote script allowance.",
    icon: ShieldCheck,
  },
  {
    category: "Supply chain",
    label: "Static security analysis",
    tool: "Semgrep · 82 rules",
    result: "0 findings",
    detail: "Eight project-specific rules and seventy-four community JavaScript and TypeScript rules completed without blocking results.",
    icon: Code2,
  },
  {
    category: "Artifacts",
    label: "Threat-pattern analysis",
    tool: "Custom YARA rules",
    result: "0 matches",
    detail: "Source, extension, production bundle, and release archives were checked for malware, worms, credential theft, obfuscation, and cryptomining patterns.",
    icon: Fingerprint,
  },
  {
    category: "Artifacts",
    label: "Antivirus scan",
    tool: "ClamAV 1.5.3",
    result: "0 infected",
    detail: "9,129 files and 413.59 MiB were scanned against 3,628,071 known signatures.",
    icon: Activity,
  },
  {
    category: "Runtime",
    label: "Extension behavior",
    tool: "Deterministic DOM fixtures",
    result: "Passed",
    detail: "Minimal permissions, prohibited APIs, safe-page behavior, and intentionally risky fixture detection were tested directly.",
    icon: EyeOff,
  },
  {
    category: "Artifacts",
    label: "Archive integrity",
    tool: "unzip -t + SHA-256",
    result: "3 verified",
    detail: "Every versioned browser and localhost archive passed structural validation and received a published checksum.",
    icon: Archive,
  },
];

const artifacts = [
  {
    title: "Chromium Browser Lens",
    filename: "sentinel-atlas-browser-lens-v0.2.1-chromium.zip",
    hash: "e2f125de7a7a422337658773fa7dad3b602795b5199afba87d9f591376fd2f1f",
    href: "https://github.com/1243353366/orbital-fusion-console/releases/download/v0.2.1/sentinel-atlas-browser-lens-v0.2.1-chromium.zip",
  },
  {
    title: "Firefox Browser Lens",
    filename: "sentinel-atlas-browser-lens-v0.2.1-firefox.zip",
    hash: "4d45731c96b6b8c8e59202841a057c6d3446e69c8a006d560858034bf0b68d0c",
    href: "https://github.com/1243353366/orbital-fusion-console/releases/download/v0.2.1/sentinel-atlas-browser-lens-v0.2.1-firefox.zip",
  },
  {
    title: "Standalone localhost",
    filename: "sentinel-atlas-v0.2.1-localhost.zip",
    hash: "9511678285e466586901da7c2f0a02a311f1b585709005e71d8fca33395b80f1",
    href: "https://github.com/1243353366/orbital-fusion-console/releases/download/v0.2.1/sentinel-atlas-v0.2.1-localhost.zip",
  },
];

const scanSteps = ["Artifact identified", "SHA-256 calculated", "Dependencies audited", "Static rules evaluated", "Threat signatures checked", "Release attested"];
const categories: Category[] = ["All", "Runtime", "Supply chain", "Privacy", "Artifacts"];

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return (
    <button type="button" className="copy-button" onClick={copy} aria-label={`Copy ${label}`}>
      {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export default function SecurityApp() {
  const [category, setCategory] = useState<Category>("All");
  const [activeStep, setActiveStep] = useState(scanSteps.length);
  const [replaying, setReplaying] = useState(false);

  const visibleControls = useMemo(
    () => (category === "All" ? controls : controls.filter((control) => control.category === category)),
    [category],
  );

  useEffect(() => {
    if (!replaying) return;
    if (activeStep >= scanSteps.length) {
      const done = window.setTimeout(() => setReplaying(false), 400);
      return () => window.clearTimeout(done);
    }
    const timer = window.setTimeout(() => setActiveStep((step) => step + 1), 420);
    return () => window.clearTimeout(timer);
  }, [activeStep, replaying]);

  function replayVerification() {
    setActiveStep(0);
    setReplaying(true);
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Sentinel Atlas security dossier home">
          <span className="brand-mark"><ShieldCheck size={18} /></span>
          <span><strong>SENTINEL ATLAS</strong><small>RELEASE SECURITY DOSSIER</small></span>
        </a>
        <nav aria-label="Page sections">
          <a href="#controls">Controls</a>
          <a href="#artifacts">Artifacts</a>
          <a href="#boundaries">Boundaries</a>
        </nav>
        <a className="header-link" href="https://github.com/1243353366/orbital-fusion-console" target="_blank" rel="noopener noreferrer">
          <GitFork size={15} /> Repository <ArrowUpRight size={13} />
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <img className="hero-art" src={heroArt} alt="Abstract orbital verification rings and security telemetry" />
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-content">
            <div className="eyebrow"><span className="pulse" /> Independent, reproducible release evidence</div>
            <h1>Verified by process.<br /><em>Bounded by evidence.</em></h1>
            <p className="hero-copy">A public, inspectable account of how Sentinel Atlas v0.2.1 was hardened, tested, scanned, and packaged—without overstating what any security tool can prove.</p>
            <div className="hero-actions">
              <a className="primary-action" href="#artifacts"><Download size={16} /> Verify the release</a>
              <a className="secondary-action" href="../">Open live console <ArrowUpRight size={15} /></a>
            </div>
            <div className="scope-line"><span>Scope</span> source · dependencies · configuration · browser extension · production bundle · release archives</div>
          </div>
          <aside className="attestation-card" aria-label="Release attestation summary">
            <div className="attestation-top"><span>Release attestation</span><span className="verified-tag"><Check size={12} /> VERIFIED</span></div>
            <div className="score-orb"><strong>100</strong><span>/ 100</span></div>
            <div className="grade">A</div>
            <h2>No detected release blockers</h2>
            <p>This is a scoped validation result—not a guarantee that unknown vulnerabilities do not exist.</p>
            <dl>
              <div><dt>Release</dt><dd>v0.2.1</dd></div>
              <div><dt>Validated</dt><dd>2026-09-20</dd></div>
              <div><dt>Commit</dt><dd>439f286</dd></div>
            </dl>
          </aside>
        </section>

        <section className="metric-strip" aria-label="Key validation metrics">
          <article><span>01</span><strong>0</strong><p>Dependency vulnerabilities</p></article>
          <article><span>02</span><strong>0</strong><p>Secret or config findings</p></article>
          <article><span>03</span><strong>0</strong><p>Static-analysis findings</p></article>
          <article><span>04</span><strong>0</strong><p>Infected files</p></article>
          <article><span>05</span><strong>3</strong><p>Verified release artifacts</p></article>
        </section>

        <section className="method-section section-wrap">
          <div className="section-heading narrow">
            <span className="section-index">01 / METHOD</span>
            <h2>Hash first. Ask later.</h2>
            <p>The fingerprint is calculated before any reputation provider is contacted. Existing intelligence can be queried by SHA-256; submission remains a separate human decision.</p>
          </div>
          <div className="method-visual">
            <img src={scanOrb} alt="Abstract verification core with concentric scanning rings" />
            <div className="scan-stack">
              <div className="scan-stack-head">
                <span>Verification sequence</span>
                <button type="button" onClick={replayVerification} disabled={replaying}><Play size={13} /> {replaying ? "Running" : "Replay"}</button>
              </div>
              {scanSteps.map((step, index) => {
                const complete = index < activeStep;
                return (
                  <div className={`scan-step ${complete ? "complete" : ""}`} key={step}>
                    <span className="step-node">{complete ? <Check size={12} /> : String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{step}</strong><small>{index === 1 ? "SHA-256 · SHA-1 · MD5" : index === 4 ? "YARA + ClamAV" : "Deterministic local gate"}</small></div>
                    <span className="step-state">{complete ? "PASS" : "WAIT"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="controls-section section-wrap" id="controls">
          <div className="section-heading split">
            <div><span className="section-index">02 / CONTROLS</span><h2>Twelve checks. One evidence trail.</h2></div>
            <p>Filter the validation register by operational boundary. Each result states both what was checked and what the check does not imply.</p>
          </div>
          <div className="filter-bar" role="group" aria-label="Filter controls">
            {categories.map((item) => (
              <button type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>
                {item}<span>{item === "All" ? controls.length : controls.filter((control) => control.category === item).length}</span>
              </button>
            ))}
          </div>
          <div className="control-grid">
            {visibleControls.map((control, index) => {
              const Icon = control.icon;
              return (
                <article className="control-card" key={control.label} style={{ "--delay": `${index * 34}ms` } as React.CSSProperties}>
                  <div className="control-card-top"><span className="control-icon"><Icon size={17} /></span><span className="status"><Check size={11} /> {control.result}</span></div>
                  <span className="category-label">{control.category}</span>
                  <h3>{control.label}</h3>
                  <p>{control.detail}</p>
                  <footer><SquareTerminal size={13} /><span>{control.tool}</span></footer>
                </article>
              );
            })}
          </div>
        </section>

        <section className="artifact-section section-wrap" id="artifacts">
          <div className="section-heading split">
            <div><span className="section-index">03 / ARTIFACTS</span><h2>Verify what you download.</h2></div>
            <p>Every archive is named, versioned, structurally tested, and bound to a published SHA-256 digest.</p>
          </div>
          <div className="artifact-list">
            {artifacts.map((artifact, index) => (
              <article className="artifact-row" key={artifact.filename}>
                <span className="artifact-number">0{index + 1}</span>
                <PackageCheck size={23} />
                <div className="artifact-name"><strong>{artifact.title}</strong><span>{artifact.filename}</span></div>
                <code>{artifact.hash}</code>
                <CopyButton value={artifact.hash} label={`${artifact.title} SHA-256`} />
                <a href={artifact.href} target="_blank" rel="noopener noreferrer" aria-label={`Download ${artifact.title}`}><Download size={17} /></a>
              </article>
            ))}
          </div>
          <div className="verify-command">
            <span><ChevronRight size={14} /> Verify all downloaded artifacts</span>
            <code>sha256sum -c SHA256SUMS.txt</code>
            <CopyButton value="sha256sum -c SHA256SUMS.txt" label="verification command" />
          </div>
        </section>

        <section className="boundaries-section section-wrap" id="boundaries">
          <div className="section-heading narrow">
            <span className="section-index">04 / TRUST BOUNDARIES</span>
            <h2>Clean is contextual—not absolute.</h2>
          </div>
          <div className="boundary-grid">
            <article className="boundary-primary">
              <div className="boundary-orbit"><Gauge size={34} /><span>NO AUTO<br />UPLOAD</span></div>
              <div>
                <span className="category-label">Hash-first reputation</span>
                <h3>Local fingerprinting precedes every provider request.</h3>
                <p>The CLI calculates SHA-256, SHA-1, and MD5 locally. VirusTotal API v3 and MetaDefender Cloud API v4 can be queried by SHA-256 only when an operator supplies a runtime key.</p>
                <ul>
                  <li><Check size={14} /> ClamAV runs locally when installed</li>
                  <li><Check size={14} /> Provider credentials stay out of the browser bundle</li>
                  <li><Check size={14} /> File submission is never automatic</li>
                </ul>
              </div>
            </article>
            <article className="boundary-note warning">
              <CircleAlert size={21} />
              <div><span>Not claimed</span><h3>Nord and Malwarebytes</h3><p>No licensed Linux CLI engine was configured, so neither product is presented as a release verdict.</p></div>
            </article>
            <article className="boundary-note">
              <Layers3 size={21} />
              <div><span>Hosting boundary</span><h3>GitHub Pages CSP</h3><p>The policy is delivered as a meta directive. Header-only protections require a downstream host with custom response headers.</p></div>
            </article>
            <article className="boundary-note">
              <FileKey2 size={21} />
              <div><span>Distribution boundary</span><h3>Developer packages</h3><p>Firefox persistence requires Mozilla signing; browser-store distribution requires the relevant store review.</p></div>
            </article>
          </div>
        </section>

        <section className="closing-section">
          <div>
            <span className="section-index">05 / CONCLUSION</span>
            <h2>Evidence you can inspect.<br />Limits you can see.</h2>
          </div>
          <div>
            <p>Security scanning reduces risk, but cannot prove the absence of malicious behavior or unknown vulnerabilities. Sentinel Atlas publishes the controls, artifacts, hashes, and caveats together so operators can make an informed decision.</p>
            <div className="closing-actions">
              <a className="primary-action" href="https://github.com/1243353366/orbital-fusion-console/releases/tag/v0.2.1" target="_blank" rel="noopener noreferrer"><Download size={16} /> Download v0.2.1</a>
              <a className="secondary-action" href="https://github.com/1243353366/orbital-fusion-console/blob/main/docs/SECURITY_VALIDATION.md" target="_blank" rel="noopener noreferrer">Read source report <ArrowUpRight size={15} /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Sentinel Atlas · Release Security Dossier</span>
        <span>Node.js 25 target · Static client · No telemetry</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </div>
  );
}
