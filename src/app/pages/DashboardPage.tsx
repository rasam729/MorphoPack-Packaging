import { Link } from "react-router"
import {
  MetricCard,
  PageHeader,
  StatusPill,
  StudioButton,
} from "../components/StudioUI"
import { StudioIcon } from "../components/StudioIcon"

const projects = [
  {
    name: "Headphones",
    material: "Recycled kraft",
    waste: "5.2%",
    image: "/morphopack/dashboard.png",
    status: "Ready",
  },
  {
    name: "Ceramic mug",
    material: "Corrugated",
    waste: "7.2%",
    image: "/morphopack/create.png",
    status: "Ready",
  },
  {
    name: "Sensor module",
    material: "Mycelium",
    waste: "4.9%",
    image: "/morphopack/workspace.png",
    status: "In review",
  },
]

export default function DashboardPage() {
  return (
    <div className="studio-page dashboard-page">
      <PageHeader
        eyebrow="MONDAY · 20 OCTOBER"
        title="Good morning, Alex."
        description="A live view of projects, material performance, and production readiness."
        actions={
          <Link to="/create-packaging">
            <StudioButton>
              <StudioIcon name="plus" size={16} /> New packaging
            </StudioButton>
          </Link>
        }
      />

      <section className="metric-grid">
        <MetricCard
          label="Designs generated"
          value="24"
          detail="this month"
          icon="spark"
          trend="+6"
        />
        <MetricCard
          label="Material saved"
          value="31%"
          detail="vs. standard kits"
          icon="leaf"
        />
        <MetricCard
          label="CO₂ avoided"
          value="182 kg"
          detail="across 8 active jobs"
          icon="chart"
        />
        <MetricCard
          label="Average waste"
          value="6.4%"
          detail="2.5% below baseline"
          icon="compare"
          trend="−2.5%"
        />
      </section>

      <section className="dashboard-hero-card">
        <div>
          <span className="page-eyebrow">GENERATIVE PACKAGING</span>
          <h2>Better packaging starts with your product.</h2>
          <p>
            Start from geometry, compare viable structures, and prove material
            savings before production.
          </p>
          <Link to="/create-packaging">
            Start a new exploration <StudioIcon name="arrow" size={15} />
          </Link>
        </div>
        <div className="dashboard-box-visual" aria-hidden="true">
          <div className="box-lid" />
          <div className="box-base" />
          <div className="box-product">
            <StudioIcon name="cube" size={25} />
          </div>
        </div>
      </section>

      <section className="studio-panel recent-projects">
        <div className="panel-heading">
          <div>
            <h2>Recent designs</h2>
            <p>Your latest generated packaging studies.</p>
          </div>
          <Link to="/optimize">
            View all designs <StudioIcon name="arrow" size={14} />
          </Link>
        </div>
        <div className="project-grid">
          {projects.map((project, index) => (
            <Link
              className="project-card"
              to={index === 2 ? "/workspace" : "/optimize"}
              key={project.name}
            >
              <div className="project-image">
                <img src={project.image} alt="" />
              </div>
              <div className="project-card-top">
                <strong>{project.name}</strong>
                <StudioIcon name="arrow" size={15} />
              </div>
              <p>{project.material}</p>
              <div>
                <small>{project.waste} waste</small>
                <StatusPill
                  tone={project.status === "Ready" ? "success" : "warning"}
                >
                  {project.status}
                </StatusPill>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
