import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  AlertCircle, ArrowRight, BarChart3, Box, CheckCircle, Circle, Clock3,
  History, Layers3, Leaf, Package, Play, RotateCcw, SlidersHorizontal,
} from 'lucide-react'
import api from '../utils/api.js'
import UploadZone from '../components/UploadZone.jsx'
import DieleineViewer from '../components/DieleineViewer.jsx'
import MeshPreview from '../components/MeshPreview.jsx'
import DimensionEditor from '../components/DimensionEditor.jsx'
import SustainabilityDash from '../components/SustainabilityDash.jsx'
import HistoryPanel from '../components/HistoryPanel.jsx'
import CustomBoxPanel from '../components/CustomBoxPanel.jsx'
import InteractiveBackdrop from '../components/InteractiveBackdrop.jsx'
import SheetNestingPanel from '../components/SheetNestingPanel.jsx'
import { calcMetrics, MATERIAL_PROFILES } from '../utils/sustainability.js'
import { estimateNesting } from '../components/SheetNestingPanel.jsx'
import './DashboardPage.css'

const PIPELINE_STEPS = [
  'Mesh import & validation',
  'Clearance displacement (2mm)',
  'WELD — merge duplicate vertices',
  'DECIMATE — reduce polygon count',
  'CLEANUP — remove degenerate geometry',
  'Manufacturing threshold check',
  'GLB viewport export',
  'SVG dieline unfold & export',
  'Print-ready PDF export',
]

const TABS = [
  { id: 'overview', label: 'Dashboard', icon: <BarChart3 size={15}/> },
  { id: 'workspace', label: '3D Workspace', icon: <Package size={15}/> },
  { id: 'nesting', label: 'Sheet nesting', icon: <Layers3 size={15}/> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={15}/> },
  { id: 'history', label: 'History', icon: <History size={15}/> },
  { id: 'custom', label: 'Custom box', icon: <Box size={15}/> },
]

function PipelineProgress({ status, step, stepsDone = [], error }) {
  if (status === 'idle' || status === 'uploaded') return null
  const progress = status === 'done'
    ? 100
    : Math.round((stepsDone.length / PIPELINE_STEPS.length) * 100)

  return (
    <section className="studio-card studio-pipeline">
      <div className="studio-pipeline-heading">
        <strong>{status === 'done' ? 'Pipeline complete' : status === 'error' ? 'Pipeline needs attention' : step || 'Preparing mesh…'}</strong>
        <span>{progress}%</span>
      </div>
      <div className="studio-progress-track"><div style={{ width: `${progress}%` }}/></div>
      {error && <div className="studio-inline-error" role="alert"><AlertCircle size={15}/>{error}</div>}
      {(status === 'running' || status === 'done') && (
        <div className="studio-step-list">
          {PIPELINE_STEPS.map((label) => {
            const done = status === 'done' || stepsDone.includes(label)
            const current = !done && label === step
            return (
              <span key={label} className={done ? 'is-done' : current ? 'is-current' : ''}>
                {done ? <CheckCircle size={13}/> : current ? <RotateCcw size={13}/> : <Circle size={13}/>}
                {label}
              </span>
            )
          })}
        </div>
      )}
    </section>
  )
}

function SustainabilitySummary({ material, degradation, dimensions, materialThickness = 4 }) {
  const metrics = calcMetrics(
    dimensions.length_mm,
    dimensions.width_mm,
    dimensions.height_mm,
    material,
    degradation,
    materialThickness,
  )
  const formatMass = (grams) => {
    if (Math.abs(grams) >= 1000) return `${(grams / 1000).toFixed(2)} kg`
    if (Math.abs(grams) < 0.1) return `${(grams * 1000).toFixed(0)} mg`
    return `${grams.toFixed(1)} g`
  }
  const indicators = [
    { label: 'Void reduction', value: `${Math.round(metrics.voidReductionPct)}%`, width: metrics.voidReductionPct, color: '#18b45a' },
    { label: 'Recyclability', value: `${Math.round(metrics.recyclabilityPct)}%`, width: metrics.recyclabilityPct, color: '#22c8d6' },
    { label: 'CO₂ avoided / unit', value: formatMass(metrics.co2SavedGrams), width: Math.min(100, metrics.co2SavedGrams / 10), color: '#a78bfa' },
  ]

  return (
    <>
      <section className="studio-card studio-score-card">
        <div className="studio-score-heading">
          <div>
            <h2>Integrated sustainability score</h2>
            <p>Material, circularity and carbon impact</p>
          </div>
          <strong>{Math.round(metrics.sustainabilityScore)}<small>/100</small></strong>
        </div>
        <div className="studio-score-ring" style={{ '--score': `${metrics.sustainabilityScore}%` }}>
          <div><b>{Math.round(metrics.sustainabilityScore)}</b><span>out of 100</span></div>
        </div>
        <div className="studio-indicators">
          {indicators.map(({ label, value, width, color }) => (
            <div className="studio-indicator" key={label}>
              <span>{label}</span>
              <i><b style={{ width: `${width}%`, background: color }}/></i>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
      <div className="studio-impact-grid">
        <section className="studio-card studio-impact-card">
          <span>Material saved vs. EPS</span>
          <strong>{metrics.matSavingsPct}%</strong>
          <small>{formatMass(metrics.matSavingsGrams)} saved per unit</small>
        </section>
        <section className="studio-card studio-impact-card">
          <span>Estimated volume</span>
          <strong>{(metrics.volume * 1000).toFixed(2)} L</strong>
          <small>{MATERIAL_PROFILES[material]?.name}</small>
        </section>
      </div>
    </>
  )
}

function FeasibilityChecks({ fitClearance, materialThickness, dimensions }) {
  const allowance = 2 * (fitClearance + materialThickness)
  const netWidth = (dimensions.length_mm + allowance) * 2.15 + (dimensions.width_mm + allowance) * 2
  const netHeight = dimensions.height_mm + allowance + (dimensions.width_mm + allowance) * 0.9
  const fitsSheet = netWidth <= 976 && netHeight <= 676
  const checks = [
    { valid: fitClearance >= 2, label: 'Fit clearance ≥ 2 mm' },
    { valid: materialThickness >= 1, label: 'Material thickness ≥ 1 mm' },
    { valid: fitsSheet, label: 'Dieline fits a 1000 × 700 mm sheet' },
  ]

  return (
    <section className="studio-card studio-feasibility-card">
      <div className="studio-section-heading"><CheckCircle size={16}/><span>Feasibility checks</span></div>
      {checks.map(({ valid, label }) => (
        <div className="studio-feasibility-row" key={label}>
          <strong className={valid ? 'is-pass' : 'is-check'}>{valid ? 'PASS' : 'CHECK'}</strong>
          <span>{label}</span>
        </div>
      ))}
    </section>
  )
}

function OverviewDashboard({
  user,
  dimensions,
  material,
  degradation,
  fitClearance,
  materialThickness,
  job,
  outputs,
  onNewPackaging,
}) {
  const metrics = calcMetrics(
    dimensions.length_mm,
    dimensions.width_mm,
    dimensions.height_mm,
    material,
    degradation,
    materialThickness,
  )
  const nesting = estimateNesting(dimensions, fitClearance, materialThickness)
  const formatMass = (grams) => grams >= 1000
    ? `${(grams / 1000).toFixed(2)} kg`
    : `${grams.toFixed(1)} g`
  const cards = [
    {
      label: 'Current fit',
      value: `${Math.round(dimensions.length_mm)} × ${Math.round(dimensions.width_mm)} × ${Math.round(dimensions.height_mm)}`,
      detail: 'L × W × H · mm',
    },
    { label: 'Material saved vs. EPS', value: `${metrics.matSavingsPct}%`, detail: 'estimated per unit' },
    { label: 'CO₂e avoided', value: formatMass(metrics.co2SavedGrams), detail: 'estimated per unit' },
    { label: 'Estimated sheet offcut', value: `${nesting.wastePct.toFixed(1)}%`, detail: '1000 × 700 mm sheet' },
  ]

  return (
    <section className="studio-overview">
      <header className="studio-overview-heading">
        <div>
          <span className="studio-eyebrow">MORPHOPACK · DESIGN STUDIO</span>
          <h1>Good work starts with a better fit{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
          <p>Design packaging around your product, then understand the footprint before you manufacture.</p>
        </div>
        <button className="studio-button studio-button-primary" onClick={onNewPackaging}>
          <Package size={15}/> New packaging
        </button>
      </header>

      <div className="studio-overview-stats">
        {cards.map(({ label, value, detail }) => (
          <article className="studio-card studio-overview-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>

      <section className="studio-overview-hero">
        <div className="studio-overview-hero-copy">
          <span>DESIGNED WITH PURPOSE · ENGINEERED TO FIT</span>
          <h2>Better packaging starts with your product.</h2>
          <p>Turn a photo or 3D mesh into a considered structure, a clear dieline and a lighter material footprint.</p>
          <button onClick={onNewPackaging}>Start a new exploration <ArrowRight size={15}/></button>
        </div>
        <img src="/studio-packaging.jpg" alt="MorphoPack packaging design artwork"/>
      </section>

      <section className="studio-overview-recent">
        <div className="studio-overview-recent-heading">
          <div><h2>Recent designs</h2><p>Your latest workspace output</p></div>
          <button className="studio-button studio-button-secondary" onClick={onNewPackaging}>Open workspace</button>
        </div>
        {job.file ? (
          <article className="studio-card studio-recent-design">
            <div className="studio-recent-file-icon"><Package size={20}/></div>
            <div className="studio-recent-file-info">
              <strong>{job.file}</strong>
              <span>{job.status === 'done' ? 'Dieline and preview ready' : job.status === 'running' ? 'Processing design…' : job.status === 'error' ? job.error : 'Mesh uploaded · ready to process'}</span>
            </div>
            <div className="studio-recent-downloads">
              {outputs.svg_url && <a className="studio-button studio-button-secondary" href={outputs.svg_url} download>SVG</a>}
              {outputs.pdf_url && <a className="studio-button studio-button-secondary" href={outputs.pdf_url} download>1:1 PDF</a>}
              {outputs.overview_pdf_url && <a className="studio-button studio-button-secondary" href={outputs.overview_pdf_url} download>Overview</a>}
            </div>
          </article>
        ) : (
          <div className="studio-card studio-recent-empty">
            <Package size={23}/>
            <div><strong>No designs yet</strong><span>Upload an STL or OBJ to create your first packaging concept.</span></div>
            <button className="studio-button studio-button-secondary" onClick={onNewPackaging}>Create design</button>
          </div>
        )}
      </section>
    </section>
  )
}

export default function DashboardPage({ user }) {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(() => (
    location.pathname === '/analytics' ? 'analytics' : location.pathname === '/history' ? 'history' : 'overview'
  ))
  const [material, setMaterial] = useState('mycelium')
  const [degradation, setDegradation] = useState(6)
  const [fitClearance, setFitClearance] = useState(3)
  const [materialThickness, setMaterialThickness] = useState(1.5)
  const [visualScale, setVisualScale] = useState(1)
  const [job, setJob] = useState({ status: 'idle', step: null, stepsDone: [], error: null, outputs: {} })
  const [jobId, setJobId] = useState(null)
  const [meshFile, setMeshFile] = useState(null)
  const [dimensions, setDimensions] = useState({
    length_mm: 200,
    width_mm: 150,
    height_mm: 100,
  })
  const [uploadLoading, setUploadLoading] = useState(false)
  const pollRef = useRef(null)

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const data = await api.pipelineStatus()
        const nextJob = { ...data, stepsDone: data.steps_done || data.stepsDone || [] }
        setJob(nextJob)
        if (nextJob.outputs?.mesh_metrics) {
          const metrics = nextJob.outputs.mesh_metrics
          setDimensions({
            length_mm: metrics.length_mm,
            width_mm: metrics.width_mm,
            height_mm: metrics.height_mm,
          })
          if (Number.isFinite(Number(metrics.fit_clearance_mm))) {
            setFitClearance(Number(metrics.fit_clearance_mm))
          }
          if (Number.isFinite(Number(metrics.material_thickness_mm))) {
            setMaterialThickness(Number(metrics.material_thickness_mm))
          }
        }
        if (data.status === 'done' || data.status === 'error') {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch (error) {
        clearInterval(pollRef.current)
        pollRef.current = null
        setJob((current) => ({ ...current, status: 'error', error: `Could not check pipeline status: ${error.message}` }))
      }
    }, 1200)
  }, [])

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current)
  }, [])

  const handleUpload = async (file) => {
    setMeshFile(file)
    setJobId(null)
    setUploadLoading(true)
    setJob({ status: 'idle', step: null, stepsDone: [], error: null, outputs: {}, file: file.name })
    try {
      const form = new FormData()
      form.append('mesh', file)
      form.append('material', material)
      form.append('degradation_months', degradation)
      if (user?.id) form.append('user_id', user.id)
      const response = await api.upload(form)
      setJobId(response.job_id)
      setJob((current) => ({ ...current, status: 'uploaded', file: response.filename }))
    } catch (error) {
      setJob((current) => ({ ...current, status: 'error', error: error.message }))
    } finally {
      setUploadLoading(false)
    }
  }

  const handleRunPipeline = async () => {
    if (!jobId) return
    try {
      await api.runPipeline({
        job_id: jobId,
        user_id: user?.id,
        material,
        degradation_months: degradation,
        fit_clearance_mm: fitClearance,
        material_thickness_mm: materialThickness,
      })
      setJob((current) => ({ ...current, status: 'running', error: null }))
      startPolling()
    } catch (error) {
      setJob((current) => ({ ...current, status: 'error', error: error.message }))
    }
  }

  const handleRegenerate = (nextDimensions) => {
    if (nextDimensions) setDimensions(nextDimensions)
    setJob((current) => ({ ...current, status: 'running', outputs: {}, error: null }))
    startPolling()
  }

  const outputs = job.outputs || {}
  const meshMetrics = outputs.mesh_metrics
  const cacheKey = encodeURIComponent(job.finished_at || jobId || Date.now())
  const svgUrl = outputs.svg_url ? `${outputs.svg_url}?v=${cacheKey}` : null
  const glbUrl = outputs.glb_url ? `${outputs.glb_url}?v=${cacheKey}` : null
  const pdfUrl = outputs.pdf_url ? `${outputs.pdf_url}?v=${cacheKey}` : null
  const overviewPdfUrl = outputs.overview_pdf_url ? `${outputs.overview_pdf_url}?v=${cacheKey}` : null
  const isDone = job.status === 'done'
  const isRunning = job.status === 'running'
  return (
    <div className="studio-app">
      <InteractiveBackdrop/>
      <div className="studio-tabs">
        <div className="studio-tabs-inner">
          <div className="studio-tab-list" role="tablist" aria-label="Studio sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? 'is-active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
          <span className={`studio-status studio-status-${job.status}`}>
            <i/>{job.status === 'running' ? 'Pipeline running' : isDone ? 'Ready to export' : job.status === 'uploaded' ? 'Mesh uploaded' : 'Studio ready'}
          </span>
        </div>
      </div>

      <main className="studio-content">
        {activeTab === 'overview' && (
          <OverviewDashboard
            user={user}
            dimensions={dimensions}
            material={material}
            degradation={degradation}
            fitClearance={fitClearance}
            materialThickness={materialThickness}
            job={job}
            outputs={outputs}
            onNewPackaging={() => setActiveTab('workspace')}
          />
        )}

        {activeTab === 'workspace' && (
          <>
            <header className="studio-page-heading">
              <div>
                <span className="studio-eyebrow">MORPHOPACK · DESIGN STUDIO</span>
                <h1>Packaging, shaped around your product.</h1>
                <p>Inspect your mesh, generate a production-ready dieline and understand its material impact.</p>
              </div>
              <span className="studio-heading-note"><Leaf size={16}/> Designed for a lighter footprint</span>
            </header>

            <div className="studio-layout">
              <aside className="studio-sidebar">
                <section className="studio-card studio-input-card">
                  <div className="studio-section-heading"><Layers3 size={16}/><span>3D mesh input</span></div>
                  <UploadZone
                    onUpload={handleUpload}
                    disabled={isRunning || uploadLoading}
                    onFileSelect={(file) => {
                      setMeshFile(file)
                      setJobId(null)
                      setJob({ status: 'idle', step: null, stepsDone: [], error: null, outputs: {}, file: file?.name })
                    }}
                    loading={uploadLoading}
                  />
                  {meshFile && <p className="studio-file-ready"><CheckCircle size={14}/>{meshFile.name} · preview ready</p>}
                </section>

                <section className="studio-card studio-material-card">
                  <div className="studio-section-heading"><SlidersHorizontal size={16}/><span>Material profile</span></div>
                  <label className="studio-field-label" htmlFor="material-select">Protective packaging</label>
                  <select id="material-select" className="studio-select" value={material} onChange={(event) => setMaterial(event.target.value)}>
                    {Object.entries(MATERIAL_PROFILES).map(([key, profile]) => (
                      <option key={key} value={key}>{profile.name}</option>
                    ))}
                  </select>
                  <div className="studio-material-note">
                    <i style={{ background: MATERIAL_PROFILES[material]?.color }}/>
                    <div><strong>{MATERIAL_PROFILES[material]?.name}</strong><span>Recyclability {Math.round(MATERIAL_PROFILES[material]?.recyclability * 100)}% · {MATERIAL_PROFILES[material]?.biodegradableMonths}-month breakdown</span></div>
                  </div>
                </section>

                <section className="studio-card studio-timeline-card">
                  <div className="studio-section-heading"><Clock3 size={16}/><span>Degradation timeline</span></div>
                  <label htmlFor="degradation-slider">Material degradation <strong>{degradation} mo</strong></label>
                  <input id="degradation-slider" type="range" min="0" max="24" value={degradation} onChange={(event) => setDegradation(Number(event.target.value))}/>
                  <div className="studio-range-labels"><span>0 months</span><span>24 months</span></div>
                </section>

                <button
                  className="studio-button studio-button-primary studio-run-button"
                  onClick={handleRunPipeline}
                  disabled={!jobId || isRunning || uploadLoading}
                  id="run-pipeline-btn"
                >
                  <Play size={15} fill="currentColor"/>{isRunning ? 'Generating…' : isDone ? 'Run pipeline again' : 'Run pipeline'}
                </button>
                <PipelineProgress status={job.status} step={job.step} stepsDone={job.stepsDone} error={job.error}/>
              </aside>

              <section className="studio-workspace">
                <div className="studio-workspace-toolbar">
                  <div>
                    <strong className="studio-workspace-title">3D Workspace</strong>
                    <span className="studio-workspace-subtitle">Dimension edits update the fit preview and dieline scale.</span>
                  </div>
                  <div className="studio-export-actions">
                    <label className="studio-preview-scale" htmlFor="preview-scale">
                      Preview size <strong>{Math.round(visualScale * 100)}%</strong>
                      <input
                        id="preview-scale"
                        type="range"
                        min="0.65"
                        max="1.45"
                        step="0.05"
                        value={visualScale}
                        onChange={(event) => setVisualScale(Number(event.target.value))}
                      />
                    </label>
                    <span className={`studio-ready-badge ${isDone || job.status === 'uploaded' ? 'is-ready' : ''}`}>
                      <i/>{isDone ? 'READY' : isRunning ? 'PROCESSING' : job.status === 'uploaded' ? 'READY TO RUN' : 'UPLOAD A MESH'}
                    </span>
                  </div>
                </div>

                <div className="studio-preview-grid">
                  <MeshPreview
                    glbUrl={glbUrl}
                    meshFile={meshFile}
                    loading={isRunning}
                    dimensions={dimensions}
                    baseDimensions={meshMetrics}
                    visualScale={visualScale}
                    fitClearance={fitClearance}
                    materialThickness={materialThickness}
                  />
                  <DieleineViewer
                    svgUrl={svgUrl}
                    pdfUrl={pdfUrl}
                    overviewPdfUrl={overviewPdfUrl}
                    pdfError={job.error}
                    loading={isRunning}
                    dimensions={dimensions}
                    baseDimensions={meshMetrics}
                    visualScale={visualScale}
                    fitClearance={fitClearance}
                    materialThickness={materialThickness}
                  />
                </div>
                {meshMetrics && (
                  <div className="studio-dimensions-strip">
                    <span><b>L</b>{Math.round(meshMetrics.length_mm)} mm</span>
                    <span><b>W</b>{Math.round(meshMetrics.width_mm)} mm</span>
                    <span><b>H</b>{Math.round(meshMetrics.height_mm)} mm</span>
                    <span>{meshMetrics.face_count?.toLocaleString()} faces</span>
                  </div>
                )}
              </section>

              <aside className="studio-telemetry">
                <DimensionEditor
                  meshMetrics={meshMetrics}
                  onRegenerate={handleRegenerate}
                  onDimensionsChange={setDimensions}
                  fitClearance={fitClearance}
                  materialThickness={materialThickness}
                  onParametersChange={({ fitClearance: clearance, materialThickness: thickness }) => {
                    setFitClearance(clearance)
                    setMaterialThickness(thickness)
                  }}
                  material={material}
                  degradationMonths={degradation}
                  disabled={isRunning}
                />
                <FeasibilityChecks
                  fitClearance={fitClearance}
                  materialThickness={materialThickness}
                  dimensions={dimensions}
                />
                <header className="studio-telemetry-heading">
                  <h2>Sustainability &amp; impact</h2>
                  <span>Material and carbon · Live estimates</span>
                </header>
                <SustainabilitySummary
                  material={material}
                  degradation={degradation}
                  dimensions={dimensions}
                  materialThickness={materialThickness}
                />
                {isDone && (
                  <div className="studio-export-note">
                    <CheckCircle size={15}/>
                    <span>SVG, true-size manufacturing PDF and compact sustainability overview are ready.</span>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}

        {activeTab === 'nesting' && (
          <section className="studio-secondary-page studio-nesting-page">
            <h1>Sheet nesting &amp; material efficiency</h1>
            <p>Estimate how many rectangular dieline envelopes fit on a standard sheet and review current material impact.</p>
            <div className="studio-nesting-page-grid">
              <SheetNestingPanel
                dimensions={dimensions}
                fitClearance={fitClearance}
                materialThickness={materialThickness}
              />
              <SustainabilitySummary
                material={material}
                degradation={degradation}
                dimensions={dimensions}
                materialThickness={materialThickness}
              />
            </div>
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="studio-secondary-page">
            <h1>Sustainability analytics</h1>
            <p>Environmental impact for your current packaging configuration.</p>
            <SustainabilityDash
              material={material}
              degradationMonths={degradation}
              lengthMm={dimensions.length_mm}
              widthMm={dimensions.width_mm}
              heightMm={dimensions.height_mm}
            />
          </section>
        )}

        {activeTab === 'history' && (
          <section className="studio-secondary-page">
            <h1>Generated packaging history</h1>
            <p>Your uploaded meshes and previous packaging outputs.</p>
            <HistoryPanel userId={user?.id}/>
          </section>
        )}

        {activeTab === 'custom' && (
          <section className="studio-secondary-page">
            <h1>Custom box generator</h1>
            <p>Create a close-fitting box from a product model or specified dimensions.</p>
            <CustomBoxPanel/>
          </section>
        )}
      </main>
    </div>
  )
}
