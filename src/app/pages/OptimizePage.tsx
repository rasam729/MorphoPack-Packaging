import { useMemo, useState } from "react"
import { Link } from "react-router"
import { PageHeader, StatusPill, StudioButton } from "../components/StudioUI"
import { StudioIcon } from "../components/StudioIcon"

type Variant = {
  id: string
  name: string
  description: string
  protection: number
  manufacture: number
  sustainability: number
  waste: number
  volume: number
  cost: string
}

const variants: Variant[] = [
  {
    id: "tuck",
    name: "Tuck carton",
    description: "Fast assembly",
    protection: 92,
    manufacture: 88,
    sustainability: 74,
    waste: 8.2,
    volume: 3.4,
    cost: "$0.28",
  },
  {
    id: "sleeve",
    name: "Sleeve + insert",
    description: "Balanced structure",
    protection: 86,
    manufacture: 78,
    sustainability: 90,
    waste: 4.8,
    volume: 3.1,
    cost: "$0.31",
  },
  {
    id: "mailer",
    name: "Mailer box",
    description: "Maximum protection",
    protection: 95,
    manufacture: 82,
    sustainability: 68,
    waste: 8.7,
    volume: 3.9,
    cost: "$0.38",
  },
]

export default function OptimizePage() {
  const [material, setMaterial] = useState("Corrugated")
  const [selected, setSelected] = useState("sleeve")
  const [sortBy, setSortBy] = useState<"balanced" | "waste" | "protection">(
    "balanced",
  )

  const ranked = useMemo(() => {
    const copy = [...variants]
    if (sortBy === "waste") return copy.sort((a, b) => a.waste - b.waste)
    if (sortBy === "protection")
      return copy.sort((a, b) => b.protection - a.protection)
    return copy.sort(
      (a, b) =>
        b.protection +
        b.manufacture +
        b.sustainability -
        (a.protection + a.manufacture + a.sustainability),
    )
  }, [sortBy])
  const current =
    variants.find((variant) => variant.id === selected) ?? variants[1]

  return (
    <div className="studio-page optimize-page">
      <PageHeader
        eyebrow="MULTI-DESIGN DECISION ENGINE"
        title="Less waste. Better balance."
        description="Rank valid structures across protection, production, material efficiency, and eco-impact."
        actions={
          <>
            <StudioButton variant="secondary">Re-run variants</StudioButton>
            <Link to="/export">
              <StudioButton>
                <StudioIcon name="check" size={15} /> Use selected design
              </StudioButton>
            </Link>
          </>
        }
      />

      <section className="studio-panel optimize-filterbar">
        <div className="material-filter">
          <span>Material</span>
          {["Corrugated", "Kraft", "Cardboard", "Mycelium"].map((item) => (
            <button
              key={item}
              type="button"
              className={material === item ? "active" : ""}
              onClick={() => setMaterial(item)}
            >
              {material === item && <StudioIcon name="check" size={12} />}
              {item}
            </button>
          ))}
        </div>
        <label>
          Rank by
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
          >
            <option value="balanced">Balanced score</option>
            <option value="waste">Lowest waste</option>
            <option value="protection">Highest protection</option>
          </select>
        </label>
      </section>

      <div className="compare-layout">
        <section className="studio-panel variant-matrix">
          <div className="panel-heading">
            <div>
              <h2>Design variant matrix</h2>
              <p>
                Select a design to expose its trade-offs. Lower waste and volume
                are better.
              </p>
            </div>
            <StatusPill>{ranked.length} valid designs</StatusPill>
          </div>
          <div className="matrix-table">
            <div className="matrix-row matrix-head">
              <span>Structure</span>
              <span>Protect</span>
              <span>Make</span>
              <span>Eco</span>
              <span>Waste</span>
              <span>Volume</span>
              <span>Cost</span>
            </div>
            {ranked.map((variant, index) => (
              <button
                type="button"
                className={
                  selected === variant.id ? "matrix-row active" : "matrix-row"
                }
                key={variant.id}
                onClick={() => setSelected(variant.id)}
              >
                <span className="variant-name">
                  <i>{index + 1}</i>
                  <span>
                    <strong>{variant.name}</strong>
                    <small>{variant.description}</small>
                  </span>
                </span>
                <span>{variant.protection}</span>
                <span>{variant.manufacture}</span>
                <span>{variant.sustainability}</span>
                <span>{variant.waste}%</span>
                <span>{variant.volume} L</span>
                <span>{variant.cost}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="studio-panel tradeoffs-panel">
          <div className="panel-heading">
            <div>
              <h2>Trade-offs</h2>
              <p>{current.name} · selected</p>
            </div>
            <StudioIcon name="compare" size={17} />
          </div>
          {[
            ["Protection", current.protection],
            ["Manufacturability", current.manufacture],
            ["Sustainability", current.sustainability],
          ].map(([label, value]) => (
            <div className="tradeoff-meter" key={label}>
              <span>
                <strong>{label}</strong>
                <b>{value} / 100</b>
              </span>
              <div>
                <i style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
          <div className="tradeoff-summary">
            <StudioIcon name="spark" size={17} />
            <p>
              <strong>
                {current.id === "sleeve"
                  ? "A lighter, more efficient fit."
                  : current.id === "tuck"
                    ? "Fastest path to production."
                    : "Maximum transit protection."}
              </strong>
              {current.id === "sleeve"
                ? "Lowest waste and material volume, with a minor assembly complexity trade-off."
                : "This structure leads its strongest category while keeping other scores production-ready."}
            </p>
          </div>
        </aside>
      </div>

      <div className="optimization-visuals">
        <section className="studio-panel nesting-panel">
          <div className="panel-heading">
            <div>
              <h2>Sheet nesting</h2>
              <p>1200 × 780 mm · {material}</p>
            </div>
            <StatusPill>6.8% offcut waste</StatusPill>
          </div>
          <div className="nesting-sheet">
            {Array.from({ length: 8 }).map((_, index) => (
              <svg
                key={index}
                className={`nested-dieline nested-${index + 1}`}
                viewBox="0 0 120 72"
              >
                <path d="M28 8h42v12h20v32H70v12H28V52H8V20h20V8Z" />
                <path d="M28 20v32m42-32v32M8 36h82" strokeDasharray="3 3" />
              </svg>
            ))}
            <span>93.2% SHEET UTILIZATION</span>
          </div>
        </section>
        <section className="selected-preview">
          <div className="preview-package">
            <div />
            <span>
              <StudioIcon name="cube" size={28} />
            </span>
          </div>
          <div>
            <span>SELECTED / {material.toUpperCase()}</span>
            <h2>{current.name}</h2>
            <p>
              {current.waste}% waste · {current.volume} L packed volume
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
