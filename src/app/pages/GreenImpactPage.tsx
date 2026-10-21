import { Link } from "react-router"
import {
  MetricCard,
  PageHeader,
  StatusPill,
  StudioButton,
} from "../components/StudioUI"
import { StudioIcon } from "../components/StudioIcon"

const emissions = [
  { name: "Standard carton", value: 122, color: "sand" },
  { name: "Tuck carton", value: 92, color: "sage" },
  { name: "Sleeve + insert", value: 84, color: "green" },
  { name: "Mailer box", value: 101, color: "lime" },
]

export default function GreenImpactPage() {
  return (
    <div className="studio-page impact-page">
      <PageHeader
        eyebrow="VERIFIED DESIGN IMPACT"
        title="A lighter footprint, by design."
        description="Understand the material, carbon, and compute behind each packaging decision."
        actions={
          <Link to="/export">
            <StudioButton>
              View impact report <StudioIcon name="arrow" size={15} />
            </StudioButton>
          </Link>
        }
      />

      <section className="metric-grid impact-metrics">
        <MetricCard
          label="Material saved"
          value="31%"
          detail="vs. standard packaging"
          icon="leaf"
        />
        <MetricCard
          label="Package mass"
          value="84 g"
          detail="38 g lighter"
          icon="box"
          trend="−31%"
        />
        <MetricCard
          label="Manufacturing waste"
          value="6.4%"
          detail="estimated offcut"
          icon="compare"
          trend="−2.5%"
        />
        <MetricCard
          label="AI compute"
          value="4.2 s"
          detail="0.8 Wh per generation"
          icon="spark"
        />
      </section>

      <div className="impact-dashboard-grid">
        <section className="studio-panel carbon-chart">
          <div className="panel-heading">
            <div>
              <h2>Carbon footprint by structure</h2>
              <p>g CO₂e / package · cradle-to-gate estimate</p>
            </div>
            <StatusPill>−31% selected</StatusPill>
          </div>
          <div className="carbon-bars">
            {emissions.map((item) => (
              <div className="carbon-row" key={item.name}>
                <span>{item.name}</span>
                <div>
                  <i
                    className={item.color}
                    style={{ width: `${(item.value / 130) * 100}%` }}
                  />
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="chart-axis">
            <span>0</span>
            <span>35</span>
            <span>70</span>
            <span>105</span>
            <span>140 g</span>
          </div>
        </section>

        <section className="impact-highlight-card">
          <span>
            <StudioIcon name="leaf" size={16} /> SMALLER BY NATURE
          </span>
          <strong>31%</strong>
          <h2>lower footprint</h2>
          <p>
            Sleeve + insert: 84 g CO₂e compared with a 122 g CO₂e standard-box
            baseline.
          </p>
          <div>
            <StatusPill>SDG 12 · Consumption</StatusPill>
            <StatusPill>SDG 13 · Climate</StatusPill>
          </div>
        </section>

        <section className="studio-panel resource-tracker">
          <div className="panel-heading">
            <div>
              <h2>AI resource tracker</h2>
              <p>Compute used for this design exploration.</p>
            </div>
            <StudioIcon name="spark" size={17} />
          </div>
          <div className="resource-gauge">
            <div>
              <span>0.8</span>
              <small>Wh</small>
            </div>
            <svg viewBox="0 0 160 90">
              <path className="gauge-track" d="M20 78a60 60 0 0 1 120 0" />
              <path className="gauge-value" d="M20 78a60 60 0 0 1 120 0" />
            </svg>
          </div>
          <dl>
            <div>
              <dt>Generation time</dt>
              <dd>4.2 seconds</dd>
            </div>
            <div>
              <dt>Variants evaluated</dt>
              <dd>18 structures</dd>
            </div>
            <div>
              <dt>Estimated compute CO₂e</dt>
              <dd>0.3 g</dd>
            </div>
          </dl>
        </section>

        <section className="studio-panel before-after">
          <div className="panel-heading">
            <div>
              <h2>Before / after</h2>
              <p>Material volume relative to baseline.</p>
            </div>
          </div>
          <div className="package-comparison">
            <div className="baseline-package">
              <span>122 g</span>
              <div />
              <small>Standard</small>
            </div>
            <div className="optimized-package">
              <span>84 g</span>
              <div />
              <small>MorphoPack</small>
            </div>
            <i className="saving-arrow">
              <StudioIcon name="arrow" size={24} />
            </i>
          </div>
          <div className="saving-row">
            <span>
              <StudioIcon name="check" size={14} /> 38 g material removed
            </span>
            <span>
              <StudioIcon name="check" size={14} /> 28 mm less void space
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
