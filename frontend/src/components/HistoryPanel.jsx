import React, { useEffect, useState, useCallback } from 'react'
import {
  History, Download, Clock, Package, Search, RefreshCw,
  Scissors, Box, Leaf, TrendingDown, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Layers, BarChart3, Wind
} from 'lucide-react'
import api from '../utils/api.js'
import { MATERIAL_PROFILES } from '../utils/sustainability.js'

const MATERIAL_BADGE = {
  mycelium: 'badge-green',
  cardboard: 'badge-amber',
  kraft: 'badge-purple',
}

/* ─── Type detection ──────────────────────────────────────────────────────── */
function getRunType(item) {
  const meta = item.meta || {}
  if (meta.type === 'custom_unfold') return 'unfold'
  const result = item.pipeline_result || {}
  if (result.svg_url?.includes('custom_unfold')) return 'unfold'
  return 'standard'
}

/* ─── Inline Comparison Stats Row (for unfold runs) ──────────────────────── */
function UnfoldStats({ metrics }) {
  if (!metrics) return null
  const r = metrics.reduction || metrics
  const items = [
    { label: 'Void saved', value: `${r.void_reduction_pct ?? '—'}%`, icon: <Wind size={12}/>, color: '#22C55E' },
    { label: 'Material area', value: `–${r.material_area_savings_pct ?? '—'}%`, icon: <Layers size={12}/>, color: '#3B82F6' },
    { label: 'CO₂ avoided', value: `${r.co2_avoided_grams ?? '—'}g`, icon: <Leaf size={12}/>, color: '#A78BFA' },
    { label: 'Score', value: `${r.sustainability_score ?? '—'}/100`, icon: <BarChart3 size={12}/>, color: '#F59E0B' },
  ]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {items.map(({ label, value, icon, color }) => (
        <span key={label} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
          background: 'rgba(255,255,255,0.04)', borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.08)', fontSize: 11,
        }}>
          <span style={{ color }}>{icon}</span>
          <span style={{ color: '#9CA3AF' }}>{label}</span>
          <strong style={{ color: '#F9FAFB' }}>{value}</strong>
        </span>
      ))}
    </div>
  )
}

/* ─── Expanded Detail Pane ────────────────────────────────────────────────── */
function HistoryDetailPanel({ item }) {
  const meta = item.meta || {}
  const result = item.pipeline_result || {}
  const metrics = result.metrics
  const isUnfold = getRunType(item) === 'unfold'

  if (!metrics && !result.svg_url && !result.glb_url) {
    return (
      <div style={{ padding: '12px 16px', fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>
        No output details available for this run.
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.25)' }}>
      {/* Downloads row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: metrics ? 14 : 0 }}>
        {result.svg_url && (
          <a href={result.svg_url} download className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={12}/> SVG Dieline
          </a>
        )}
        {result.pdf_url && (
          <a href={result.pdf_url} download className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={12}/> 1:1 PDF
          </a>
        )}
        {result.overview_pdf_url && (
          <a href={result.overview_pdf_url} download className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={12}/> Overview PDF
          </a>
        )}
        {result.glb_url && (
          <a href={result.glb_url} download className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={12}/> 3D GLB Preview
          </a>
        )}
      </div>

      {/* Comparison stats table for unfold runs */}
      {isUnfold && metrics && (() => {
        const box = metrics.box || {}
        const custom = metrics.custom_unfold || {}
        const red = metrics.reduction || {}
        return (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Vs. Standard Box — Packaging Pipeline Comparison
            </div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#6B7280', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Metric</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Box Dieline</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Custom Unfold</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#22C55E' }}>Δ Saved</th>
                </tr>
              </thead>
              <tbody style={{ color: '#D1D5DB' }}>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 8px' }}>Envelope Volume</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9CA3AF' }}>{box.volume_cm3 ?? '—'} cm³</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{custom.volume_cm3 ?? '—'} cm³</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#22C55E', fontWeight: 700 }}>
                    {red.void_reduction_pct != null ? `–${red.void_reduction_pct}%` : '—'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 8px' }}>Dieline Sheet Area</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9CA3AF' }}>{box.dieline_area_cm2 ?? '—'} cm²</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{custom.dieline_area_cm2 ?? '—'} cm²</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#22C55E', fontWeight: 700 }}>
                    {red.material_area_savings_pct != null ? `–${red.material_area_savings_pct}%` : '—'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 8px' }}>Material Mass / Unit</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9CA3AF' }}>{box.material_mass_grams ?? '—'} g</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{custom.material_mass_grams ?? '—'} g</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#22C55E', fontWeight: 700 }}>
                    {red.material_mass_saved_grams != null ? `–${red.material_mass_saved_grams} g` : '—'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 8px' }}>CO₂e / Unit</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9CA3AF' }}>{box.co2_emissions_grams ?? '—'} g</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{custom.co2_emissions_grams ?? '—'} g</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#A78BFA', fontWeight: 700 }}>
                    {red.co2_avoided_grams != null ? `–${red.co2_avoided_grams} g` : '—'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px' }}>CO₂ (10k units)</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9CA3AF' }}>Baseline</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>Optimised</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#A78BFA', fontWeight: 700 }}>
                    {red.co2_avoided_10k_units_kg != null ? `–${red.co2_avoided_10k_units_kg} kg CO₂` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* Mesh metrics for standard runs */}
      {!isUnfold && result.mesh_metrics && (() => {
        const m = result.mesh_metrics
        return (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            {[
              { label: 'L', value: `${Math.round(m.length_mm ?? 0)} mm` },
              { label: 'W', value: `${Math.round(m.width_mm ?? 0)} mm` },
              { label: 'H', value: `${Math.round(m.height_mm ?? 0)} mm` },
              { label: 'Faces', value: (m.face_count ?? 0).toLocaleString() },
              { label: 'Volume', value: `${((m.volume_mm3 ?? 0) / 1e6).toFixed(2)} L` },
            ].map(({ label, value }) => (
              <span key={label} style={{ fontSize: 11, color: '#9CA3AF' }}>
                <b style={{ color: '#D1D5DB' }}>{label}</b> {value}
              </span>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

/* ─── Single History Item ─────────────────────────────────────────────────── */
function HistoryItem({ item }) {
  const [expanded, setExpanded] = useState(false)
  const meta = item.meta || item.metadata || {}
  const result = item.pipeline_result || {}
  const material = meta.material || result.metrics?.material || 'unknown'
  const profile = MATERIAL_PROFILES[material]
  const created = item.created_at ? new Date(item.created_at).toLocaleString() : '—'
  const isUnfold = getRunType(item) === 'unfold'
  const metrics = result.metrics

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      <div
        style={{ padding: '14px 18px', cursor: 'pointer' }}
        onClick={() => setExpanded(x => !x)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          {/* Left: icon + name + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: isUnfold ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isUnfold ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isUnfold ? <Scissors size={17} color="#22C55E"/> : <Package size={17} color="#6B7280"/>}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.file_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {isUnfold && (
                  <span className="badge badge-green" style={{ fontSize: 10 }}>Custom Unfold</span>
                )}
                {profile && (
                  <span className={`badge ${MATERIAL_BADGE[material] || 'badge-blue'}`} style={{ fontSize: 10 }}>
                    {profile.name}
                  </span>
                )}
                {meta.degradation_months > 0 && (
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>{meta.degradation_months}mo</span>
                )}
                {isUnfold && meta.void_reduction_pct != null && (
                  <span style={{ fontSize: 10, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <TrendingDown size={10}/> –{meta.void_reduction_pct}% void
                  </span>
                )}
              </div>

              {/* Inline stats for unfold runs */}
              {isUnfold && metrics && (
                <UnfoldStats metrics={metrics} />
              )}
            </div>
          </div>

          {/* Right: status + expand */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`badge ${item.status === 'done' ? 'badge-green' : item.status === 'error' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                {item.status === 'done' ? <CheckCircle2 size={10} style={{ display: 'inline', marginRight: 3 }}/> : null}
                {item.status}
              </span>
              {expanded ? <ChevronUp size={15} color="#6B7280"/> : <ChevronDown size={15} color="#6B7280"/>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4B5563' }}>
              <Clock size={11}/> {created}
            </div>
          </div>
        </div>
      </div>

      {expanded && <HistoryDetailPanel item={item} />}
    </div>
  )
}

/* ─── Aggregate History Summary Bar ──────────────────────────────────────── */
function HistorySummary({ items }) {
  const unfoldRuns = items.filter(i => getRunType(i) === 'unfold')
  const totalCO2Saved = unfoldRuns.reduce((sum, i) => {
    const co2 = i.meta?.co2_avoided_grams ?? i.pipeline_result?.metrics?.reduction?.co2_avoided_grams ?? 0
    return sum + Number(co2)
  }, 0)
  const totalVoidPct = unfoldRuns.length > 0
    ? unfoldRuns.reduce((s, i) => s + Number(i.meta?.void_reduction_pct ?? 0), 0) / unfoldRuns.length
    : 0

  if (items.length === 0) return null

  return (
    <div className="glass-card" style={{
      padding: '14px 20px', display: 'flex', gap: 24, flexWrap: 'wrap',
      alignItems: 'center', background: 'rgba(34,197,94,0.04)',
      border: '1px solid rgba(34,197,94,0.15)',
    }}>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Total Pipeline Runs</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB' }}>{items.length}</div>
        <div style={{ fontSize: 10, color: '#6B7280' }}>{unfoldRuns.length} Custom Unfold · {items.length - unfoldRuns.length} Standard Box</div>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Cumulative CO₂ Avoided</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#A78BFA' }}>
          {totalCO2Saved >= 1000 ? `${(totalCO2Saved / 1000).toFixed(2)} kg` : `${totalCO2Saved.toFixed(1)} g`}
        </div>
        <div style={{ fontSize: 10, color: '#6B7280' }}>From {unfoldRuns.length} unfold pipeline runs</div>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Avg. Void Reduction</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#22C55E' }}>
          {totalVoidPct > 0 ? `–${totalVoidPct.toFixed(1)}%` : '—'}
        </div>
        <div style={{ fontSize: 10, color: '#6B7280' }}>Across unfold dieline runs</div>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Pipeline Health</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#22C55E' }}>
          {items.filter(i => i.status === 'done').length}/{items.length}
        </div>
        <div style={{ fontSize: 10, color: '#6B7280' }}>Runs completed successfully</div>
      </div>
    </div>
  )
}

/* ─── Main Export ─────────────────────────────────────────────────────────── */
export default function HistoryPanel({ userId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterMaterial, setFilterMaterial] = useState('all')
  const [filterType, setFilterType] = useState('all') // 'all' | 'standard' | 'unfold'
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await api.history(userId)
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load history.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(item => {
    const meta = item.meta || item.metadata || {}
    const result = item.pipeline_result || {}
    const material = meta.material || result.metrics?.material || ''
    const runType = getRunType(item)
    const matchMat = filterMaterial === 'all' || material === filterMaterial
    const matchType = filterType === 'all' || runType === filterType
    const matchSearch = !search || item.file_name?.toLowerCase().includes(search.toLowerCase())
    return matchMat && matchType && matchSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }}/>
          <input
            className="input-field"
            placeholder="Search files…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 34, fontSize: 13 }}
          />
        </div>

        {/* Material filter */}
        <select
          className="input-field"
          style={{ width: 'auto', fontSize: 13, padding: '9px 12px' }}
          value={filterMaterial}
          onChange={e => setFilterMaterial(e.target.value)}
        >
          <option value="all">All materials</option>
          {Object.entries(MATERIAL_PROFILES).map(([k, v]) => (
            <option key={k} value={k}>{v.name}</option>
          ))}
        </select>

        {/* Run type filter */}
        <select
          className="input-field"
          style={{ width: 'auto', fontSize: 13, padding: '9px 12px' }}
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">All run types</option>
          <option value="standard">Standard box pipeline</option>
          <option value="unfold">Custom mesh unfold</option>
        </select>

        {/* Refresh */}
        <button className="btn-ghost" onClick={load} style={{ padding: '9px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px', background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10,
          fontSize: 13, color: '#F87171', display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <AlertCircle size={14}/> {error}
        </div>
      )}

      {/* Summary bar */}
      {!loading && <HistorySummary items={items} />}

      {/* Items */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 90 }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: '40px 20px', border: '2px dashed var(--border)', borderRadius: 16,
        }}>
          <History size={32} color="#374151"/>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#6B7280' }}>
              {items.length > 0 ? 'No results match your filter.' : 'No history yet'}
            </div>
            <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
              {items.length === 0 && 'Run a pipeline or generate a custom unfold dieline to start your history.'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(item => (
            <HistoryItem key={item.id ?? item.job_id} item={item} />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
