import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { PageHeader, StatusPill, StudioButton } from "../components/StudioUI"
import { StudioIcon } from "../components/StudioIcon"

const materials = [
  {
    id: "kraft",
    name: "Recycled kraft",
    detail: "Lightweight · paper based",
    texture: "kraft-texture",
  },
  {
    id: "corrugated",
    name: "Corrugated board",
    detail: "Rigid · protective",
    texture: "corrugated-texture",
  },
  {
    id: "mycelium",
    name: "Agricultural mycelium",
    detail: "Bio-based · compostable",
    texture: "mycelium-texture",
  },
]

export default function CreatePackagingPage() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [material, setMaterial] = useState("mycelium")
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const file = files[0] ?? null

  useEffect(() => {
    if (!file || progress >= 100) return
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(value + 8, 100)),
      90,
    )
    return () => window.clearInterval(timer)
  }, [file, progress])

  const chooseFiles = (selected?: FileList | File[]) => {
    if (!selected || selected.length === 0) return
    setFiles(Array.from(selected))
    setProgress(0)
  }

  return (
    <div className="studio-page create-page">
      <PageHeader
        eyebrow="01 / PRODUCT INPUT"
        title="From product to possibility."
        description="Bring your product. We’ll help find its lightest, most considered form."
      />
      <div className="process-rail" aria-label="Creation steps">
        <span className="active">
          <b>01</b> Upload product
        </span>
        <i />
        <span>
          <b>02</b> Choose material
        </span>
        <i />
        <span>
          <b>03</b> Generate & refine
        </span>
      </div>

      <div className="create-layout">
        <div className="create-main">
          <section className="studio-panel upload-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-index">01</span>
                <h2>Your product</h2>
                <p>A clear view makes a better fit.</p>
              </div>
              <div className="input-type-tabs">
                <button className="active" type="button">
                  <StudioIcon name="cube" size={14} /> 3D mesh
                </button>
                <button type="button">
                  <StudioIcon name="file" size={14} /> Photo / multi-view
                </button>
              </div>
            </div>

            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              accept=".glb,.gltf,.obj,image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => chooseFiles(event.target.files ?? undefined)}
            />
            <button
              className={
                dragging ? "upload-dropzone dragging" : "upload-dropzone"
              }
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                chooseFiles(event.dataTransfer.files)
              }}
            >
              <span>
                <StudioIcon name="upload" size={22} />
              </span>
              <strong>Drop a product file, or browse files</strong>
              <small>PNG, JPG, GLB, GLTF, OBJ · Single or multiple views</small>
            </button>

            {file ? (
              <div className="upload-file">
                <span className="file-type-icon">
                  <StudioIcon
                    name={file.type.includes("image") ? "file" : "cube"}
                    size={18}
                  />
                </span>
                <div>
                  <strong>
                    {file.name}
                    {files.length > 1
                      ? ` + ${files.length - 1} more views`
                      : ""}
                  </strong>
                  <small>
                    {(
                      files.reduce((total, item) => total + item.size, 0) /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB ·{" "}
                    {files.length > 1
                      ? `${files.length}-view reconstruction set`
                      : "locally processed"}
                  </small>
                </div>
                <div className="upload-progress">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <StatusPill>
                  {progress === 100 ? "Ready" : `${progress}%`}
                </StatusPill>
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={() => setFiles([])}
                >
                  <StudioIcon name="x" size={15} />
                </button>
              </div>
            ) : (
              <div className="privacy-note">
                <StudioIcon name="check" size={14} />
                Files stay in this browser for this prototype. TRELLIS-ready
                image sets and meshes are validated before generation.
              </div>
            )}
          </section>

          <section className="studio-panel material-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-index">02</span>
                <h2>Choose your material</h2>
              </div>
              <button className="panel-link" type="button">
                Material guide <StudioIcon name="arrow" size={13} />
              </button>
            </div>
            <div className="material-grid">
              {materials.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setMaterial(item.id)}
                  className={
                    material === item.id
                      ? "material-option active"
                      : "material-option"
                  }
                >
                  <span className={`material-swatch ${item.texture}`} />
                  <strong>{item.name}</strong>
                  <small>{item.detail}</small>
                  <span className="material-check">
                    <StudioIcon name="check" size={12} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="create-summary">
          <section className="studio-panel product-summary">
            <div className="summary-preview">
              <div className="summary-package">
                <StudioIcon name="cube" size={44} />
              </div>
            </div>
            <div className="summary-title">
              <div>
                <h2>
                  {file ? file.name.replace(/\.[^.]+$/, "") : "Sensor module"}
                </h2>
                <small>Exploration 03</small>
              </div>
              <StatusPill>{file ? "Uploaded" : "Sample"}</StatusPill>
            </div>
            <label>
              Project name
              <input defaultValue="Sensor module / Exploration 03" />
            </label>
            <dl>
              <div>
                <dt>Dimensions</dt>
                <dd>90 × 60 × 40 mm</dd>
              </div>
              <div>
                <dt>Material</dt>
                <dd>{materials.find((item) => item.id === material)?.name}</dd>
              </div>
            </dl>
            <StudioButton
              onClick={() => navigate("/workspace")}
              disabled={Boolean(file && progress < 100)}
            >
              <StudioIcon name="spark" size={16} /> Generate packaging
            </StudioButton>
            <p className="summary-hint">
              You’ll inspect the fit, refine parameters, and compare
              material-efficient structures.
            </p>
          </section>
          <div className="insight-note">
            <StudioIcon name="spark" size={17} />
            <p>
              <strong>A better input, a better structure.</strong>
              Multi-view sets improve reconstruction around hidden edges and
              curved surfaces.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
