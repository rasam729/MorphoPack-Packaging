import { useMemo, useState } from "react"
import { Link } from "react-router"
import {
  ThreeViewer,
  type PackageType,
  type ViewportMode,
} from "../components/ThreeViewer"
import { PageHeader, StatusPill, StudioButton } from "../components/StudioUI"
import { StudioIcon } from "../components/StudioIcon"

export default function WorkspacePage() {
  const [dimensions, setDimensions] = useState({
    width: 90,
    height: 40,
    depth: 60,
  })
  const [clearance, setClearance] = useState(3)
  const [thickness, setThickness] = useState(1.5)
  const [mode, setMode] = useState<ViewportMode>("rotate")
  const [packageType, setPackageType] = useState<PackageType>("insert")
  const [wireframe, setWireframe] = useState(false)
  const [generated, setGenerated] = useState(true)

  const dieline = useMemo(() => {
    const width = 72 + (dimensions.width - 90) * 0.25
    const depth = 44 + (dimensions.depth - 60) * 0.2
    return { width, depth }
  }, [dimensions])

  return (
    <div className="studio-page workspace-page">
      <PageHeader
        eyebrow="EXPLORATION 03 · SAMPLE DESIGN"
        title="Shape a more intelligent fit."
        description="Inspect the product geometry. Refine the structure down to the millimetre."
        actions={
          <>
            <StudioButton variant="secondary">Save design</StudioButton>
            <Link to="/optimize">
              <StudioButton>
                Compare variants <StudioIcon name="arrow" size={15} />
              </StudioButton>
            </Link>
          </>
        }
      />

      <div className="workspace-layout">
        <div className="workspace-canvases">
          <section className="viewer-panel">
            <div className="viewer-toolbar">
              <div>
                <StatusPill>Mycelium · fitted insert</StatusPill>
                <span className="viewer-state">
                  <i /> Geometry ready
                </span>
              </div>
              <div className="viewport-modes">
                {(["rotate", "move", "scale"] as ViewportMode[]).map((item) => (
                  <button
                    key={item}
                    className={mode === item ? "active" : ""}
                    type="button"
                    onClick={() => setMode(item)}
                    title={`${item} model`}
                  >
                    <StudioIcon
                      name={
                        item === "rotate"
                          ? "rotate"
                          : item === "move"
                            ? "move"
                            : "zoom"
                      }
                      size={16}
                    />
                    <span>{item}</span>
                  </button>
                ))}
                <button
                  className={wireframe ? "active" : ""}
                  type="button"
                  onClick={() => setWireframe(!wireframe)}
                >
                  <StudioIcon name="cube" size={16} />
                  <span>Wire</span>
                </button>
              </div>
            </div>
            <ThreeViewer
              dimensions={dimensions}
              clearance={clearance}
              thickness={thickness}
              mode={mode}
              packageType={generated ? packageType : "carton"}
              wireframe={wireframe}
            />
            <div className="viewer-help">
              Drag to {mode} · Scroll to zoom
              <span>LIVE WEBGL</span>
            </div>
          </section>

          <section className="studio-panel dieline-panel">
            <div className="panel-heading">
              <div>
                <h2>2D dieline</h2>
                <p>Live synchronized manufacturing geometry.</p>
              </div>
              <div className="line-legend">
                <span>
                  <i className="cut-line" /> Cut
                </span>
                <span>
                  <i className="fold-line" /> Fold
                </span>
              </div>
            </div>
            <div className="dieline-canvas">
              <svg
                viewBox="0 0 420 210"
                aria-label="Synchronized packaging dieline"
              >
                <g transform="translate(70 28)">
                  <path
                    className="dieline-cut"
                    d={`M${dieline.depth} 0h${dieline.width}v28h${dieline.depth}v${dieline.width}h-${dieline.depth}v28H${dieline.depth}v-28H0V28h${dieline.depth}V0Z`}
                  />
                  <path
                    className="dieline-fold"
                    d={`M${dieline.depth} 28v${dieline.width}m${dieline.width} 0V28M0 ${28 + dieline.width / 2}h${dieline.width + dieline.depth * 2}`}
                  />
                  <path
                    className="dieline-tab"
                    d={`M${dieline.depth + 8} 0  ${dieline.depth + 18} -12h${dieline.width - 20}l10 12`}
                  />
                </g>
              </svg>
              <span className="dieline-dimensions">
                {dimensions.width + dimensions.depth * 2} ×{" "}
                {dimensions.height + dimensions.depth * 2} mm / LIVE
              </span>
            </div>
          </section>
        </div>

        <aside className="workspace-controls">
          <section className="studio-panel generator-panel">
            <div className="panel-heading">
              <div>
                <h2>Generator</h2>
                <p>Choose a structural direction.</p>
              </div>
              <StudioIcon name="spark" size={17} />
            </div>
            <div className="package-type-grid">
              {(["carton", "sleeve", "insert"] as PackageType[]).map((type) => (
                <button
                  key={type}
                  className={packageType === type ? "active" : ""}
                  type="button"
                  onClick={() => setPackageType(type)}
                >
                  <span>
                    <StudioIcon name="box" size={20} />
                  </span>
                  {type}
                </button>
              ))}
            </div>
            <StudioButton onClick={() => setGenerated(false)}>
              <StudioIcon name="spark" size={16} />
              {generated ? "Auto-generate again" : "Generating…"}
            </StudioButton>
            {!generated && (
              <button
                className="generation-progress"
                type="button"
                onAnimationEnd={() => setGenerated(true)}
              >
                <span />
              </button>
            )}
          </section>

          <section className="studio-panel parameters-panel">
            <div className="panel-heading">
              <div>
                <h2>Parameters</h2>
                <p>Live parametric editing.</p>
              </div>
              <button
                className="panel-link"
                type="button"
                onClick={() => {
                  setDimensions({ width: 90, height: 40, depth: 60 })
                  setClearance(3)
                  setThickness(1.5)
                }}
              >
                Reset
              </button>
            </div>
            <div className="dimension-inputs">
              {(["width", "depth", "height"] as const).map((key) => (
                <label key={key}>
                  {key}
                  <span>
                    <input
                      type="number"
                      value={dimensions[key]}
                      onChange={(event) =>
                        setDimensions({
                          ...dimensions,
                          [key]: Math.max(20, Number(event.target.value)),
                        })
                      }
                    />
                    mm
                  </span>
                </label>
              ))}
            </div>
            <label className="range-control">
              <span>
                Fit clearance <strong>{clearance.toFixed(1)} mm</strong>
              </span>
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.5"
                value={clearance}
                onChange={(event) => setClearance(Number(event.target.value))}
              />
            </label>
            <label className="range-control">
              <span>
                Material thickness <strong>{thickness.toFixed(1)} mm</strong>
              </span>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.5"
                value={thickness}
                onChange={(event) => setThickness(Number(event.target.value))}
              />
            </label>
            <label className="select-control">
              Material
              <select defaultValue="mycelium">
                <option value="mycelium">Agricultural mycelium</option>
                <option value="kraft">Recycled kraft</option>
                <option value="corrugated">Corrugated board</option>
              </select>
            </label>
          </section>

          <section className="studio-panel feasibility-panel">
            <div className="panel-heading">
              <h2>Feasibility checks</h2>
              <StatusPill>{clearance < 1.5 ? "3 / 4" : "4 / 4"}</StatusPill>
            </div>
            <ul>
              <li className={clearance < 1.5 ? "warning" : ""}>
                <StudioIcon
                  name={clearance < 1.5 ? "warning" : "check"}
                  size={14}
                />
                {clearance < 1.5
                  ? "Clearance may restrict removal"
                  : "Fit clearance is production-safe"}
              </li>
              <li>
                <StudioIcon name="check" size={14} /> No panel overlaps
              </li>
              <li>
                <StudioIcon name="check" size={14} /> Material thickness
                supported
              </li>
              <li>
                <StudioIcon name="check" size={14} /> Parts are assemblable
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
