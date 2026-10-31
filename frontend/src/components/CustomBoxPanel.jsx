import React, { useState } from 'react'
import { Upload, Box, Image, Ruler, Sparkles, Download, AlertCircle } from 'lucide-react'
import api from '../utils/api.js'
import DieleineViewer from './DieleineViewer.jsx'
import { calcMetrics, MATERIAL_PROFILES } from '../utils/sustainability.js'

export default function CustomBoxPanel() {
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState('') // '3d' | 'image'
  const [manualDims, setManualDims] = useState({ length: '', width: '', height: '' })
  const [material, setMaterial] = useState('cardboard')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = React.useRef()

  const handle3D = (f) => {
    const ext = f.name.split('.').pop().toLowerCase()
    if (['stl','obj','glb'].includes(ext)) { setFile(f); setFileType('3d'); setError('') }
    else if (['png','jpg','jpeg'].includes(ext)) { setFile(f); setFileType('image'); setError('') }
    else setError(`Unsupported file type: .${ext}`)
  }

  const handleGenerate = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const form = new FormData()
      if (file) form.append('asset', file)
      form.append('material', material)
      const { length, width, height } = manualDims
      if (length) form.append('length_mm', length)
      if (width)  form.append('width_mm', width)
      if (height) form.append('height_mm', height)
      const res = await api.customBox(form)
      setResult(res)
    } catch (e) {
      setError(e.message || 'Generation failed.')
    } finally {
      setLoading(false)
    }
  }

  const metrics = result?.dimensions
    ? calcMetrics(result.dimensions.length_mm, result.dimensions.width_mm, result.dimensions.height_mm, material)
    : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
      {/* Left panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(139,92,246,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} color="#A78BFA"/>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#F9FAFB' }}>Custom Box Generator</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Upload product → get fitted box</div>
            </div>
          </div>
        </div>

        {/* Upload */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 12 }}>
            Upload Product Asset
          </div>
          <div
            className="upload-zone"
            style={{ padding: 24, cursor: 'pointer' }}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".stl,.obj,.glb,.png,.jpg,.jpeg"
              style={{ display: 'none' }} onChange={e => handle3D(e.target.files[0])} />
            {file ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>
                  {fileType === '3d' ? '📦' : '🖼️'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F9FAFB' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  {fileType === '3d' ? '3D Model' : 'Product Image'} · {(file.size/1024/1024).toFixed(1)} MB
                </div>
                <button className="btn-ghost" style={{ marginTop: 8, fontSize: 12 }}
                  onClick={e => { e.stopPropagation(); setFile(null); setFileType('') }}>
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <Upload size={24} color="#6B7280" style={{ margin: '0 auto 8px' }}/>
                <div style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 500 }}>
                  Drop 3D model or product image
                </div>
                <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>
                  STL, OBJ, GLB, PNG, JPG
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manual dims */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ruler size={14}/> Manual Dimensions (optional)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { key: 'length', label: 'Length (mm)' },
              { key: 'width',  label: 'Width (mm)'  },
              { key: 'height', label: 'Height (mm)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>{label}</label>
                <input type="number" className="input-field" placeholder="Auto-detect"
                  value={manualDims[key]}
                  onChange={e => setManualDims(d => ({ ...d, [key]: e.target.value }))}
                  min="1" step="1" />
              </div>
            ))}
          </div>

          {/* Material */}
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Material</label>
            <select className="input-field" value={material} onChange={e => setMaterial(e.target.value)}>
              {Object.entries(MATERIAL_PROFILES).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div style={{
            display: 'flex', gap: 8, padding: '10px 14px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, fontSize: 13, color: '#F87171', alignItems: 'center',
          }}>
            <AlertCircle size={14}/>{error}
          </div>
        )}

        <button
          className="btn-primary"
          style={{ justifyContent: 'center' }}
          onClick={handleGenerate}
          disabled={loading || (!file && !Object.values(manualDims).some(Boolean))}
          id="custom-box-generate-btn"
        >
          <Sparkles size={15}/>
          {loading ? 'Generating…' : 'Generate Custom Box'}
        </button>
      </div>

      {/* Right panel — results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {result ? (
          <>
            {/* Dimensions result */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB', marginBottom: 14 }}>
                Computed Box Dimensions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Length', val: result.dimensions.length_mm, color: '#22C55E' },
                  { label: 'Width',  val: result.dimensions.width_mm,  color: '#3B82F6' },
                  { label: 'Height', val: result.dimensions.height_mm, color: '#8B5CF6' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    padding: '14px 16px', background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${color}22`, borderRadius: 12, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'monospace' }}>
                      {Math.round(val)}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label} (mm)</div>
                  </div>
                ))}
              </div>
              {metrics && (
                <div style={{
                  marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10,
                }}>
                  {[
                    { label: 'CO₂ Saved', val: `${metrics.co2SavedGrams}g`, color: '#22C55E' },
                    { label: 'Sustainability', val: `${metrics.sustainabilityScore}/100`, color: '#A78BFA' },
                    { label: 'Recyclability', val: `${metrics.recyclabilityPct}%`, color: '#3B82F6' },
                    { label: 'Void Reduction', val: `${metrics.voidReductionPct}%`, color: '#F59E0B' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{
                      padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)', borderRadius: 10,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dieline */}
            <DieleineViewer
              svgUrl={result.svg_url}
              pdfUrl={result.pdf_url}
              overviewPdfUrl={result.overview_pdf_url}
              dimensions={result.dimensions}
              baseDimensions={result.dimensions}
              loading={false}
            />
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: 400,
            border: '2px dashed var(--border)', borderRadius: 16, color: '#4B5563', gap: 12,
          }}>
            <Box size={40} strokeWidth={1} color="#374151"/>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#6B7280' }}>
                Your custom box will appear here
              </div>
              <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
                Upload a product image or 3D model to get started
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
