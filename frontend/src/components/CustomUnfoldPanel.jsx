import React, { useState, useRef, useEffect } from 'react'
import {
  Scissors, Upload, Box, Download, RefreshCw, AlertCircle, CheckCircle2,
  Leaf, Layers, Sparkles, TrendingDown, ShieldCheck, ArrowRight, Eye,
  Maximize2, ZoomIn, ZoomOut, RotateCcw, FileCode, Check
} from 'lucide-react'
import api from '../utils/api.js'
import { MATERIAL_PROFILES } from '../utils/sustainability.js'

export default function CustomUnfoldPanel({ user, defaultMeshFile }) {
  const [file, setFile] = useState(defaultMeshFile || null)
  const [useSample, setUseSample] = useState(false)
  const [material, setMaterial] = useState('cardboard')
  const [clearance, setClearance] = useState(2.5)
  const [thickness, setThickness] = useState(1.5)
  const [maxFaces, setMaxFaces] = useState(1000)
  const [degradationMonths, setDegradationMonths] = useState(6)
  const [loading, setLoading] = useState(false)
  const [statusStep, setStatusStep] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1.0)
  const [activeView, setActiveView] = useState('split') // 'split' | 'svg' | 'comparison'

  const fileInputRef = useRef(null)

  // Auto-load sample if user clicks sample button
  const handleSelectSample = () => {
    setUseSample(true)
    setFile(null)
    setError('')
  }

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    const ext = selected.name.split('.').pop()?.toLowerCase()
    if (!['stl', 'obj'].includes(ext)) {
      setError(`Please upload an .STL or .OBJ 3D mesh (got .${ext})`)
      return
    }
    setFile(selected)
    setUseSample(false)
    setError('')
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setStatusStep('Initializing Blender 4.5 headless environment...')

    const steps = [
      'Importing 3D STL mesh & analyzing surface geometry...',
      'Applying form-fitting cushion clearance displacement...',
      'Welding duplicate vertices & decimating polygons...',
      'Executing planar Paper Model unfold solver...',
      'Calculating void volume & carbon comparison metrics...',
    ]
    let stepIndex = 0
    const stepInterval = setInterval(() => {
      stepIndex++
      if (stepIndex < steps.length) {
        setStatusStep(steps[stepIndex])
      }
    }, 2800)

    try {
      const formData = new FormData()
      if (file && !useSample) {
        formData.append('mesh', file)
      }
      formData.append('clearance_mm', clearance)
      formData.append('thickness_mm', thickness)
      formData.append('max_faces', maxFaces)
      formData.append('material', material)
      formData.append('degradation_months', degradationMonths)
      if (user?.id) {
        formData.append('user_id', user.id)
      }

      const res = await api.customUnfold(formData)
      clearInterval(stepInterval)
      setResult(res)
    } catch (err) {
      clearInterval(stepInterval)
      setError(err.message || 'Custom unfold pipeline failed.')
    } finally {
      clearInterval(stepInterval)
      setLoading(false)
      setStatusStep('')
    }
  }

  const metrics = result?.metrics
  const cmp = metrics?.reduction
  const boxData = metrics?.box
  const customData = metrics?.custom_unfold
  const currentProfile = MATERIAL_PROFILES[material] || MATERIAL_PROFILES.cardboard

  return (
    <div className="custom-unfold-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Hero Banner */}
      <div className="glass-card" style={{ padding: '24px 28px', background: 'linear-gradient(135deg, rgba(16,33,27,0.7) 0%, rgba(17,24,39,0.85) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Scissors size={24} color="#22C55E" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB' }}>Custom Form-Fitting Dieline Unfolding</h2>
                <span className="badge badge-green" style={{ fontSize: 11 }}>Blender 4.5 Python Engine</span>
              </div>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                Unfolds the actual 3D product mesh into a true 2D cut/fold flat pattern with tabs, eliminating the massive void waste of standard rectangular boxes.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={15} color="#22C55E" /> Recorded to History Pipeline
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Config Panel, Right Results Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Input & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Mesh Selector Card */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Box size={16} color="#22C55E"/>
              <span>Select Product Mesh</span>
            </div>

            <div
              className="upload-zone"
              style={{
                padding: '24px 16px',
                border: file ? '2px solid rgba(34,197,94,0.4)' : '2px dashed var(--border)',
                background: file ? 'rgba(34,197,94,0.04)' : 'rgba(17,24,39,0.4)',
                borderRadius: 12,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".stl,.obj"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Upload size={24} color={file ? '#22C55E' : '#6B7280'} style={{ margin: '0 auto 8px' }} />
              {file ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB' }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: '#22C55E', marginTop: 2 }}>Ready for Blender unfolding</div>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '2px 8px', marginTop: 6 }}
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  >
                    Change file
                  </button>
                </div>
              ) : useSample ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB' }}>glass.stl (Sample Model)</div>
                  <div style={{ fontSize: 11, color: '#22C55E', marginTop: 2 }}>Using built-in product model</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#D1D5DB' }}>Drop STL mesh or click to browse</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Supports .STL and .OBJ 3D models</div>
                </div>
              )}
            </div>

            {!file && !useSample && (
              <button
                type="button"
                className="btn-ghost"
                style={{ width: '100%', marginTop: 10, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={handleSelectSample}
              >
                <Sparkles size={13} color="#F59E0B" /> Use Sample Product Model (glass.stl)
              </button>
            )}
          </div>

          {/* Configuration Card */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} color="#3B82F6"/>
              <span>Unfolding &amp; Material Parameters</span>
            </div>

            {/* Material */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
                Protective Packaging Material
              </label>
              <select
                className="studio-select"
                style={{ width: '100%', padding: '8px 12px', background: '#111827', color: '#F9FAFB', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              >
                {Object.entries(MATERIAL_PROFILES).map(([key, prof]) => (
                  <option key={key} value={key}>{prof.name}</option>
                ))}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11, color: '#9CA3AF' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentProfile.color }} />
                <span>Recyclability {Math.round(currentProfile.recyclability * 100)}% · {currentProfile.biodegradableMonths}mo breakdown</span>
              </div>
            </div>

            {/* Clearance Padding */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#9CA3AF' }}>Clearance Cushion Gap</span>
                <strong style={{ color: '#F9FAFB' }}>{clearance} mm</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={clearance}
                onChange={(e) => setClearance(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6B7280' }}>
                <span>1 mm (Tight shell)</span>
                <span>8 mm (High impact)</span>
              </div>
            </div>

            {/* Material Thickness */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#9CA3AF' }}>Material Caliper Thickness</span>
                <strong style={{ color: '#F9FAFB' }}>{thickness} mm</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.5"
                value={thickness}
                onChange={(e) => setThickness(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Mesh Decimation Target */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#9CA3AF' }}>Mesh Decimation / Polygon Limit</span>
                <strong style={{ color: '#F9FAFB' }}>{maxFaces} faces</strong>
              </div>
              <input
                type="range"
                min="400"
                max="1500"
                step="100"
                value={maxFaces}
                onChange={(e) => setMaxFaces(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                Optimizes folding lines for physical cardboard/kraft assembly.
              </div>
            </div>

            {/* Degradation Timeline */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#9CA3AF' }}>Target Lifecycle Timeline</span>
                <strong style={{ color: '#F9FAFB' }}>{degradationMonths} months</strong>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={degradationMonths}
                onChange={(e) => setDegradationMonths(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Run Button */}
            <button
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: loading ? '#374151' : 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              disabled={loading || (!file && !useSample)}
              onClick={handleGenerate}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Unfolding with Blender…</span>
                </>
              ) : (
                <>
                  <Scissors size={16} />
                  <span>Generate Custom Dieline SVG</span>
                </>
              )}
            </button>

            {loading && statusStep && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(34,197,94,0.08)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Blender Pipeline in Progress</span>
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{statusStep}</div>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 12, display: 'flex', gap: 6 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Output Showcase & Comparison Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {result ? (
            <>
              {/* Hero Reduction Statistics Banner */}
              <div className="glass-card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(17,24,39,0.7) 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: '#22C55E', textTransform: 'uppercase' }}>
                    Blender Unfold Optimization vs. Standard Box Dieline
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {result.svg_url && (
                      <a
                        href={result.svg_url}
                        download="custom_unfold_dieline.svg"
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Download size={13} /> Download SVG Dieline
                      </a>
                    )}
                    {result.glb_url && (
                      <a
                        href={result.glb_url}
                        download="custom_unfold_preview.glb"
                        className="btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Download size={13} /> 3D Preview GLB
                      </a>
                    )}
                    {result.pdf_url && (
                      <a
                        href={result.pdf_url}
                        download="custom_unfold_dieline.pdf"
                        className="btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Download size={13} /> 1:1 PDF
                      </a>
                    )}
                  </div>
                </div>

                {/* 4 Big Metrics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Packaging Void Reduction</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E' }}>
                      -{cmp?.void_reduction_pct}%
                    </div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                      {cmp?.void_volume_cm3_saved} cm³ wasted air eliminated
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Material Area Saved</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#3B82F6' }}>
                      -{cmp?.material_area_savings_pct}%
                    </div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                      {cmp?.material_mass_saved_grams}g lighter per unit
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.2)' }}>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>CO₂e Avoided / Unit</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#A78BFA' }}>
                      {cmp?.co2_avoided_grams}g
                    </div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                      {cmp?.co2_avoided_10k_units_kg} kg saved per 10k batch
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Sustainability Score</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>
                      {cmp?.sustainability_score}<span style={{ fontSize: 14, color: '#6B7280' }}>/100</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                      +{(cmp?.pallet_freight_density_increase_pct || 0)}% freight density
                    </div>
                  </div>
                </div>
              </div>

              {/* View Switcher: Split / SVG / Comparison Table */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={activeView === 'split' ? 'btn-primary' : 'btn-ghost'}
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={() => setActiveView('split')}
                >
                  Side-by-Side View
                </button>
                <button
                  className={activeView === 'svg' ? 'btn-primary' : 'btn-ghost'}
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={() => setActiveView('svg')}
                >
                  <FileCode size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Full Dieline SVG Viewer
                </button>
                <button
                  className={activeView === 'comparison' ? 'btn-primary' : 'btn-ghost'}
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={() => setActiveView('comparison')}
                >
                  Detailed Comparison Matrix
                </button>
              </div>

              {/* View Content */}
              {(activeView === 'split' || activeView === 'svg') && (
                <div className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <strong style={{ fontSize: 14, color: '#F9FAFB' }}>Custom 2D Unfolded Dieline Preview</strong>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>SVG with cut boundaries, mountain/valley fold lines, and glue tabs</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>
                        <ZoomOut size={14}/>
                      </button>
                      <span style={{ fontSize: 11, color: '#9CA3AF', minWidth: 42, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                      <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}>
                        <ZoomIn size={14}/>
                      </button>
                      <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setZoom(1.0)}>
                        <RotateCcw size={14}/>
                      </button>
                    </div>
                  </div>

                  {/* SVG Container */}
                  <div style={{
                    width: '100%',
                    height: activeView === 'svg' ? '560px' : '380px',
                    overflow: 'auto',
                    background: '#f8fafc',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                  }}>
                    <img
                      src={`${result.svg_url}?t=${Date.now()}`}
                      alt="Unfolded packaging dieline SVG"
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease-out',
                        maxWidth: '95%',
                        maxHeight: '95%',
                        objectFit: 'contain',
                      }}
                    />
                  </div>

                  {/* SVG Legend */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginTop: 12,
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#9CA3AF',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 18, height: 2, background: '#10291B', display: 'inline-block' }} /> Cut Boundary (Perimeter)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 18, height: 2, borderTop: '2px dashed #16A34A', display: 'inline-block' }} /> Mountain Fold (Convex)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 18, height: 2, borderTop: '2px dotted #2563EB', display: 'inline-block' }} /> Valley Fold (Concave)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 10, background: '#e5e5e5', border: '1px solid #aaa', display: 'inline-block' }} /> Glue Tabs (Adhesive)
                    </span>
                  </div>
                </div>
              )}

              {/* Side-by-Side Detailed Comparison Table */}
              {(activeView === 'split' || activeView === 'comparison') && (
                <div className="glass-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingDown size={16} color="#22C55E"/>
                    <span>Pipeline Comparison: Standard Box Dieline vs. Custom Mesh Unfold</span>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: '#9CA3AF' }}>
                        <th style={{ padding: '10px 8px' }}>Packaging Metric</th>
                        <th style={{ padding: '10px 8px' }}>Standard Box (Other Tab)</th>
                        <th style={{ padding: '10px 8px' }}>Custom Unfolded Dieline</th>
                        <th style={{ padding: '10px 8px', color: '#22C55E' }}>Savings &amp; Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 8px', color: '#D1D5DB' }}>Total Envelope Volume</td>
                        <td style={{ padding: '10px 8px', color: '#9CA3AF' }}>{boxData?.volume_cm3} cm³ ({boxData?.volume_liters} L)</td>
                        <td style={{ padding: '10px 8px', color: '#F9FAFB' }}>{customData?.volume_cm3} cm³ ({customData?.volume_liters} L)</td>
                        <td style={{ padding: '10px 8px', color: '#22C55E', fontWeight: 600 }}>
                          -{cmp?.void_reduction_pct}% Volume Reduction
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 8px', color: '#D1D5DB' }}>Void (Empty Air Space)</td>
                        <td style={{ padding: '10px 8px', color: '#EF4444' }}>{cmp?.void_volume_cm3_saved} cm³ wasted void</td>
                        <td style={{ padding: '10px 8px', color: '#22C55E' }}>Form-fitting (2.5mm clearance)</td>
                        <td style={{ padding: '10px 8px', color: '#22C55E', fontWeight: 600 }}>
                          {cmp?.void_volume_cm3_saved} cm³ Void Saved
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 8px', color: '#D1D5DB' }}>Dieline Flat Sheet Area</td>
                        <td style={{ padding: '10px 8px', color: '#9CA3AF' }}>{boxData?.dieline_area_cm2} cm²</td>
                        <td style={{ padding: '10px 8px', color: '#F9FAFB' }}>{customData?.dieline_area_cm2} cm²</td>
                        <td style={{ padding: '10px 8px', color: '#22C55E', fontWeight: 600 }}>
                          -{cmp?.material_area_savings_pct}% Material Saved
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 8px', color: '#D1D5DB' }}>Material Mass / Package</td>
                        <td style={{ padding: '10px 8px', color: '#9CA3AF' }}>{boxData?.material_mass_grams} g</td>
                        <td style={{ padding: '10px 8px', color: '#F9FAFB' }}>{customData?.material_mass_grams} g</td>
                        <td style={{ padding: '10px 8px', color: '#22C55E', fontWeight: 600 }}>
                          -{cmp?.material_mass_saved_grams} g / package
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 8px', color: '#D1D5DB' }}>Carbon Footprint / Unit</td>
                        <td style={{ padding: '10px 8px', color: '#9CA3AF' }}>{boxData?.co2_emissions_grams} g CO₂e</td>
                        <td style={{ padding: '10px 8px', color: '#F9FAFB' }}>{customData?.co2_emissions_grams} g CO₂e</td>
                        <td style={{ padding: '10px 8px', color: '#22C55E', fontWeight: 600 }}>
                          -{cmp?.co2_avoided_grams} g CO₂ avoided
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 8px', color: '#D1D5DB' }}>CO₂ Avoided (10k units batch)</td>
                        <td style={{ padding: '10px 8px', color: '#9CA3AF' }}>Baseline Reference</td>
                        <td style={{ padding: '10px 8px', color: '#F9FAFB' }}>Optimized Geometry</td>
                        <td style={{ padding: '10px 8px', color: '#22C55E', fontWeight: 700 }}>
                          {cmp?.co2_avoided_10k_units_kg} kg CO₂e Saved
                        </td>
                      </tr>

                      <tr>
                        <td style={{ padding: '10px 8px', color: '#D1D5DB' }}>Packaging Efficiency</td>
                        <td style={{ padding: '10px 8px', color: '#9CA3AF' }}>{boxData?.volume_efficiency_pct}% volume ratio</td>
                        <td style={{ padding: '10px 8px', color: '#F9FAFB' }}>{customData?.volume_efficiency_pct}% form efficiency</td>
                        <td style={{ padding: '10px 8px', color: '#22C55E', fontWeight: 600 }}>
                          +{(cmp?.pallet_freight_density_increase_pct || 0)}% Pallet Density
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            /* Empty State / Instructional Walkthrough */
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', border: '2px dashed var(--border)' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Scissors size={28} color="#22C55E" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F9FAFB' }}>Ready to Unfold Your 3D Product Mesh</h3>
              <p style={{ fontSize: 13, color: '#9CA3AF', maxWidth: 480, margin: '8px auto 20px', lineHeight: 1.6 }}>
                Upload an STL or OBJ file (or pick the sample glass model), configure your protective clearance padding, and click <strong>Generate Custom Dieline SVG</strong> to run the Blender Paper Model unfolding engine.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                maxWidth: 620,
                margin: '0 auto',
                textAlign: 'left',
              }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#22C55E', marginBottom: 4 }}>1. Clearance &amp; Weld</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Adds a 2.5mm protective buffer and merges vertices for manifold continuity.</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6', marginBottom: 4 }}>2. Decimate &amp; Unfold</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Decimates to 1000 faces, then computes flat planar net islands with glue tabs.</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>3. Impact Stats</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Compares void reduction, material savings, and carbon avoided vs. a standard box.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
