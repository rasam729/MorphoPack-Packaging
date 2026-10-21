import { PageHeader, StatusPill, StudioButton } from "../components/StudioUI"
import { StudioIcon, type StudioIconName } from "../components/StudioIcon"

function saveFile(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function createGlb() {
  const json = JSON.stringify({
    asset: { version: "2.0", generator: "MorphoPack" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "MorphoPack packaging preview" }],
  })
  const encoder = new TextEncoder()
  const source = encoder.encode(json)
  const paddedLength = Math.ceil(source.length / 4) * 4
  const buffer = new ArrayBuffer(12 + 8 + paddedLength)
  const view = new DataView(buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, buffer.byteLength, true)
  view.setUint32(12, paddedLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  const bytes = new Uint8Array(buffer, 20)
  bytes.fill(0x20)
  bytes.set(source)
  return buffer
}

const dielineSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="334mm" height="178mm" viewBox="0 0 334 178">
  <g fill="none" stroke="#145e40" stroke-width=".4">
    <path d="M70 10h100v30h54v98h-54v30H70v-30H16V40h54V10Z"/>
    <path d="M70 40v98m100-98v98M16 89h208" stroke-dasharray="4 3"/>
  </g>
</svg>`

const exportItems: {
  order: string
  type: string
  title: string
  copy: string
  icon: StudioIconName
  action: string
  format: string
  download: () => void
}[] = [
  {
    order: "01 / SVG",
    type: "Manufacturing",
    title: "Precision, unfolded.",
    copy: "An editable vector dieline with separate cut and fold layers for production review.",
    icon: "file",
    action: "Download SVG",
    format: "334 × 178 mm · 2 layers",
    download: () =>
      saveFile(
        "morphopack-sensor-module-dieline.svg",
        dielineSvg,
        "image/svg+xml",
      ),
  },
  {
    order: "02 / GLB",
    type: "3D asset",
    title: "See every dimension.",
    copy: "A lightweight 3D packaging preview for design handoff and spatial review.",
    icon: "cube",
    action: "Download GLB",
    format: "90 × 60 × 40 mm · binary",
    download: () =>
      saveFile(
        "morphopack-sensor-module.glb",
        createGlb(),
        "model/gltf-binary",
      ),
  },
  {
    order: "03 / REPORT",
    type: "Impact",
    title: "Make the impact clear.",
    copy: "A complete summary of material saved, carbon estimates, compute, and assumptions.",
    icon: "chart",
    action: "Download report",
    format: "31% saved · SDG 12 + 13",
    download: () =>
      saveFile(
        "morphopack-impact-report.csv",
        "Metric,Selected design,Baseline\nMaterial mass,84g,122g\nWaste,6.4%,8.9%\nCarbon,84g CO2e,122g CO2e\nAI compute,0.8Wh,\n",
        "text/csv",
      ),
  },
]

export default function ExportPage() {
  return (
    <div className="studio-page export-page">
      <PageHeader
        eyebrow="PRODUCTION HANDOFF"
        title="Ready for the next stage."
        description="Take your geometry, dieline, and impact story from the studio to your workflow."
      />

      <section className="studio-panel export-project">
        <div className="export-project-visual">
          <StudioIcon name="cube" size={27} />
        </div>
        <div>
          <h2>Sensor module / Exploration 03</h2>
          <p>
            Agricultural mycelium · 90 × 60 × 40 mm · clearance 3 mm · sleeve +
            insert
          </p>
        </div>
        <StatusPill>Geometry checked</StatusPill>
        <a href="/workspace">
          <StudioButton variant="secondary">Change design</StudioButton>
        </a>
      </section>

      <div className="export-grid">
        {exportItems.map((item) => (
          <article className="studio-panel export-card" key={item.order}>
            <div className="export-card-meta">
              <span>{item.order}</span>
              <StatusPill tone="neutral">{item.type}</StatusPill>
            </div>
            <div className={`export-illustration export-${item.icon}`}>
              {item.icon === "file" ? (
                <svg viewBox="0 0 240 150">
                  <path d="M70 18h65v24h35v66h-35v24H70v-24H35V42h35V18Z" />
                  <path
                    d="M70 42v66m65-66v66M35 75h135"
                    strokeDasharray="5 5"
                  />
                </svg>
              ) : (
                <StudioIcon name={item.icon} size={52} />
              )}
            </div>
            <h2>{item.title}</h2>
            <p>{item.copy}</p>
            <small>{item.format}</small>
            <StudioButton
              variant={item.icon === "file" ? "primary" : "secondary"}
              onClick={item.download}
            >
              <StudioIcon name="download" size={15} /> {item.action}
            </StudioButton>
          </article>
        ))}
      </div>

      <div className="export-bottom">
        <section className="studio-panel export-settings">
          <div className="panel-heading">
            <div>
              <h2>Export settings</h2>
              <p>Applied to manufacturing files.</p>
            </div>
            <StudioIcon name="settings" size={17} />
          </div>
          <div className="setting-grid">
            <label>
              Dieline units
              <select defaultValue="mm">
                <option value="mm">Millimetres (mm)</option>
                <option value="in">Inches (in)</option>
              </select>
            </label>
            <label>
              Line layers
              <select defaultValue="separate">
                <option value="separate">Separate cut & fold</option>
                <option value="combined">Combined paths</option>
              </select>
            </label>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            Include reference assumptions and sample-metric disclaimer
          </label>
        </section>
        <aside className="final-check">
          <StudioIcon name="check" size={20} />
          <div>
            <h2>One final check before production.</h2>
            <p>
              Confirm material thickness, tooling tolerances, fold allowances,
              and supplier requirements.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
