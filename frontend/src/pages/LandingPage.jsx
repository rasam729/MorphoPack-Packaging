import { Link } from 'react-router-dom'
import { Leaf, Zap, Package, BarChart3, ArrowRight, Shield, Globe, Recycle, Upload, Layers3, Download, MoveUpRight } from 'lucide-react'
import LandingModel from '../components/LandingModel.jsx'
import './LandingPage.css'

const STATS = [
  { val: '94%', label: 'CO₂ reduction vs. EPS foam' },
  { val: '12k+', label: 'Packages optimized' },
  { val: '2.4t',  label: 'Material waste avoided' },
  { val: '98%',  label: 'Mycelium recyclability' },
]

const FEATURES = [
  {
    icon: <Package size={22}/>, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
    title: 'Smart Dieline Generation',
    desc: 'Upload any STL/OBJ mesh and get a manufacturing-ready SVG dieline with fold and cut lines — powered by Blender 4.5.',
  },
  {
    icon: <Zap size={22}/>, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',
    title: 'Custom Box Pipeline',
    desc: 'Upload a product image or 3D model and instantly generate a tightly-fitted custom packaging shape with zero void space.',
  },
  {
    icon: <BarChart3 size={22}/>, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',
    title: 'Sustainability Analytics',
    desc: 'Real-time CO₂ savings, material efficiency, and void reduction metrics displayed in interactive charts and dashboards.',
  },
  {
    icon: <Recycle size={22}/>, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
    title: 'Material Intelligence',
    desc: 'Compare Agricultural Mycelium, Recycled Kraft, and Corrugated Cardboard across biodegradability, cost, and carbon footprint.',
  },
  {
    icon: <Globe size={22}/>, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
    title: 'Lifecycle Modeling',
    desc: 'Visualize 24-month biodegradation timelines and their impact on your packaging sustainability score.',
  },
  {
    icon: <Shield size={22}/>, color: '#EC4899', bg: 'rgba(236,72,153,0.1)',
    title: 'Full History & Traceability',
    desc: 'Every upload is tracked with metadata, pipeline status, and downloadable assets — all tied to your secure account.',
  },
]

export default function LandingPage() {
  return (
    <main className="marketing-home">
      <section className="marketing-hero">
        <div className="marketing-hero-inner">
          <div className="marketing-hero-copy">
            <span className="marketing-kicker"><i/> AI-GENERATED SUSTAINABLE PACKAGING <i/></span>
            <h1>Every shape.<br/><em>Zero waste.</em><br/>Fit to the millimetre.</h1>
            <p>Upload any 3D mesh and MorphoPack creates a considered fit, a clear dieline and a lighter footprint — from first model to manufacturing-ready output.</p>
            <div className="marketing-actions">
              <Link to="/dashboard" className="marketing-primary" id="hero-cta-btn">Open the studio <ArrowRight size={17}/></Link>
              <a href="#how-it-works" className="marketing-secondary"><MoveUpRight size={16}/> See how it works</a>
            </div>
            <div className="marketing-proof"><span><i/> STL · OBJ · GLB</span><span><i/> True-size PDF</span><span><i/> Blender powered</span></div>
          </div>
          <div className="marketing-hero-visual">
            <div className="marketing-grid-glow"/>
            <LandingModel/>
            <span className="marketing-orbit-label">01 / PRODUCT STUDY</span>
            <span className="marketing-orbit-dimension">130 mm <b>↗</b></span>
          </div>
        </div>
        <div className="marketing-scroll-note"><span/> DESIGNED WITH PURPOSE · ENGINEERED TO FIT</div>
      </section>

      {/* Stats bar */}
      <section className="marketing-stats" id="sustainability">
        <div className="marketing-stats-inner">
          {STATS.map(({ val, label }, index) => (
            <div className="marketing-stat" key={label}>
              <span>0{index + 1} / IMPACT</span>
              <strong>{val}</strong>
              <p>{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-how" id="how-it-works">
        <div className="marketing-section-heading">
          <span className="marketing-kicker"><i/> THE WORKFLOW</span>
          <h2>From mesh to manufacturable<br/><em>dieline in four steps.</em></h2>
          <p>Go from a product model to a useful packaging concept without losing sight of material or manufacturing.</p>
        </div>
        <div className="marketing-steps">
          {[
            { icon: <Upload size={19}/>, step: '01', title: 'Upload 3D mesh', text: 'Start with an STL or OBJ. The studio inspects your product geometry.' },
            { icon: <Leaf size={19}/>, step: '02', title: 'Choose material', text: 'Compare sustainable packaging materials and tune the fit.' },
            { icon: <Layers3 size={19}/>, step: '03', title: 'Generate dieline', text: 'Preview the model and a clear, dimensioned RSC-style layout.' },
            { icon: <Download size={19}/>, step: '04', title: 'Export & make', text: 'Download the manufacturing PDF at actual size, ready for review.' },
          ].map(({ icon, step, title, text }) => (
            <article className="marketing-step" key={step}>
              <span className="marketing-step-number">STEP {step}</span>
              <div className="marketing-step-icon">{icon}</div>
              <h3>{title}</h3><p>{text}</p>
              <span className="marketing-step-line"/>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-capabilities" id="pipeline">
        <div className="marketing-section-heading">
          <span className="marketing-kicker"><i/> DESIGNED FOR THE WHOLE JOURNEY</span>
          <h2>Thoughtful design.<br/><em>Measurable impact.</em></h2>
          <p>One connected workspace for the model, the dieline and the material decisions in between.</p>
        </div>
        <div className="marketing-features">
          {FEATURES.map(({ icon, color, title, desc }) => (
            <article className="marketing-feature" key={title}>
              <span style={{ color }}>{icon}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-cta">
        <div>
          <span className="marketing-kicker"><i/> MAKE ROOM FOR BETTER PACKAGING</span>
          <h2>Let the product<br/><em>shape the package.</em></h2>
        </div>
        <Link to="/dashboard" className="marketing-primary">Launch the studio <ArrowRight size={17}/></Link>
      </section>

      <footer className="marketing-footer">
        <span><Leaf size={16}/> Morpho<span>Pack</span></span>
        <p>Packaging intelligence for a lighter footprint.</p>
        <small>© 2025 MorphoPack · Built for SDG 12 &amp; SDG 13</small>
      </footer>
    </main>
  )
}
