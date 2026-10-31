import React, { useEffect, useState } from 'react'
import { History, Download, ExternalLink, Clock, Package, Filter, Search, RefreshCw } from 'lucide-react'
import api from '../utils/api.js'
import { MATERIAL_PROFILES } from '../utils/sustainability.js'

const MATERIAL_BADGE = {
  mycelium: 'badge-green',
  cardboard: 'badge-amber',
  kraft: 'badge-purple',
}

function HistoryItem({ item, onSelect, selected }) {
  const meta = item.meta || item.metadata || {}
  const result = item.pipeline_result || {}
  const material = meta.material || 'unknown'
  const profile = MATERIAL_PROFILES[material]
  const created = item.created_at ? new Date(item.created_at).toLocaleString() : '—'

  return (
    <div
      className="glass-card"
      style={{
        padding: '14px 18px', cursor: 'pointer',
        borderColor: selected ? 'var(--accent-green)' : 'var(--border)',
        boxShadow: selected ? '0 0 0 1px #22C55E22' : 'none',
      }}
      onClick={() => onSelect(item)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Package size={18} color="#6B7280"/>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#F9FAFB',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.file_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {profile && (
                <span className={`badge ${MATERIAL_BADGE[material] || 'badge-blue'}`} style={{ fontSize: 10 }}>
                  {profile.name}
                </span>
              )}
              {meta.degradation_months > 0 && (
                <span className="badge badge-blue" style={{ fontSize: 10 }}>
                  {meta.degradation_months}mo
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span className={`badge ${item.status === 'done' ? 'badge-green' : item.status === 'error' ? 'badge-red' : 'badge-amber'}`}
            style={{ fontSize: 10 }}>
            {item.status}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {result.svg_url && (
              <a href={result.svg_url} download onClick={e => e.stopPropagation()}
                className="btn-ghost" style={{ padding: '3px 7px', fontSize: 11 }}>
                SVG
              </a>
            )}
            {result.pdf_url && (
              <a href={result.pdf_url} download onClick={e => e.stopPropagation()}
                className="btn-ghost" style={{ padding: '3px 7px', fontSize: 11 }}>
                PDF
              </a>
            )}
            {result.glb_url && (
              <a href={result.glb_url} download onClick={e => e.stopPropagation()}
                className="btn-ghost" style={{ padding: '3px 7px', fontSize: 11 }}>
                GLB
              </a>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, color: '#4B5563' }}>
        <Clock size={11}/> {created}
      </div>
    </div>
  )
}

export default function HistoryPanel({ userId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filterMaterial, setFilterMaterial] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    if (!userId) return
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
  }

  useEffect(() => { load() }, [userId])

  const filtered = items.filter(item => {
    const meta = item.meta || item.metadata || {}
    const matchMat = filterMaterial === 'all' || meta.material === filterMaterial
    const matchSearch = !search || item.file_name?.toLowerCase().includes(search.toLowerCase())
    return matchMat && matchSearch
  })

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }}/>
          <input className="input-field" placeholder="Search files…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 34, fontSize: 13 }} />
        </div>
        <select className="input-field" style={{ width: 'auto', fontSize: 13, padding: '9px 12px' }}
          value={filterMaterial} onChange={e => setFilterMaterial(e.target.value)}>
          <option value="all">All materials</option>
          {Object.entries(MATERIAL_PROFILES).map(([k,v]) => (
            <option key={k} value={k}>{v.name}</option>
          ))}
        </select>
        <button className="btn-ghost" onClick={load} style={{ padding: '9px 12px', fontSize: 13 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/> Refresh
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10,
          fontSize: 13, color: '#F87171', marginBottom: 16,
        }}>{error}</div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90 }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: '40px 20px', border: '2px dashed var(--border)', borderRadius: 16,
        }}>
          <History size={32} color="#374151"/>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#6B7280' }}>No history yet</div>
            <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
              {items.length > 0 ? 'No results match your filter.' : 'Upload and process a mesh to start your history.'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(item => (
            <HistoryItem key={item.id} item={item}
              onSelect={setSelected} selected={selected?.id === item.id} />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
