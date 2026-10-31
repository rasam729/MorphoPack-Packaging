import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Calendar, Package, Leaf, LogOut, Edit3, Clock, Download, ChevronRight, Award, TrendingUp } from 'lucide-react'
import api from '../utils/api.js'
import HistoryPanel from '../components/HistoryPanel.jsx'
import { MATERIAL_PROFILES, calcMetrics } from '../utils/sustainability.js'

function Avatar({ user, size = 80 }) {
  if (user?.avatar_url) {
    return (
      <img src={user.avatar_url} alt="avatar" style={{
        width: size, height: size, borderRadius: '50%',
        border: '3px solid rgba(34,197,94,0.3)',
        objectFit: 'cover',
      }}/>
    )
  }
  const initials = ((user?.name || user?.email || '?')[0]).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #22C55E, #10B981)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#000',
      border: '3px solid rgba(34,197,94,0.3)',
    }}>
      {initials}
    </div>
  )
}

function StatCard({ icon, label, value, color = '#22C55E' }) {
  return (
    <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>{label}</div>
      </div>
    </div>
  )
}

export default function ProfilePage({ user, onLogout }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.id) return
    api.history(user.id)
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [user?.id])

  const handleLogout = () => {
    onLogout()
    navigate('/')
  }

  // Compute aggregate stats from history
  const totalUploads = history.length
  const doneJobs = history.filter(h => h.status === 'done')

  // Estimate total CO₂ saved across all jobs
  const totalCO2 = doneJobs.reduce((acc, h) => {
    const meta = h.meta || h.metadata || {}
    const res = h.pipeline_result || {}
    const mat = meta.material || 'cardboard'
    // Use placeholder dims since we don't store them
    const m = calcMetrics(200, 150, 100, mat, meta.degradation_months || 0)
    return acc + m.co2SavedGrams
  }, 0)

  const materialCounts = history.reduce((acc, h) => {
    const mat = (h.meta || h.metadata || {}).material || 'unknown'
    acc[mat] = (acc[mat] || 0) + 1
    return acc
  }, {})

  const topMaterial = Object.entries(materialCounts).sort((a,b) => b[1]-a[1])[0]

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently'

  if (!user) {
    return (
      <div style={{ paddingTop: 100, textAlign: 'center' }}>
        <p style={{ color: '#6B7280' }}>Please <Link to="/login" style={{ color: '#22C55E' }}>sign in</Link> to view your profile.</p>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 80, minHeight: '100vh', maxWidth: 1000, margin: '0 auto', padding: '80px 24px 60px' }}>
      {/* Profile header card */}
      <div className="glass-card" style={{
        padding: '32px 36px', marginBottom: 24,
        background: 'radial-gradient(ellipse at top left, rgba(34,197,94,0.05) 0%, transparent 60%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <Avatar user={user} size={90}/>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
              {user.name || user.email?.split('@')[0]}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
              fontSize: 14, color: '#9CA3AF' }}>
              <Mail size={14}/> {user.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B7280' }}>
                <Calendar size={13}/> Member since {memberSince}
              </span>
              {user.google_id && (
                <span className="badge badge-blue" style={{ fontSize: 11 }}>
                  Google Account
                </span>
              )}
              <span className="badge badge-green" style={{ fontSize: 11 }}>
                <Leaf size={10}/> Active
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary" style={{ gap: 7 }}>
            <LogOut size={15}/> Sign Out
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon={<Package size={20}/>} label="Total Uploads" value={totalUploads} color="#22C55E"/>
        <StatCard icon={<Leaf size={20}/>} label="CO₂ Saved (est.)" value={`${Math.round(totalCO2)}g`} color="#10B981"/>
        <StatCard icon={<Award size={20}/>} label="Completed Jobs" value={doneJobs.length} color="#3B82F6"/>
        <StatCard
          icon={<TrendingUp size={20}/>}
          label="Favourite Material"
          value={topMaterial ? MATERIAL_PROFILES[topMaterial[0]]?.name?.split(' ')[0] || topMaterial[0] : '—'}
          color="#8B5CF6"
        />
      </div>

      {/* Material breakdown */}
      {Object.keys(materialCounts).length > 0 && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Material Usage Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(materialCounts).map(([mat, count]) => {
              const pct = Math.round((count / totalUploads) * 100)
              const profile = MATERIAL_PROFILES[mat]
              return (
                <div key={mat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>
                      {profile?.name || mat}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: profile?.color || '#6B7280' }}>
                      {count} uploads · {pct}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{
                      width: `${pct}%`,
                      background: profile?.color || '#22C55E',
                    }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full history */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Dieline History</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>All past uploads and generated assets</div>
          </div>
          <Link to="/dashboard" className="btn-secondary" style={{ fontSize: 13, gap: 6 }}>
            New Upload <ChevronRight size={14}/>
          </Link>
        </div>
        <HistoryPanel userId={user.id}/>
      </div>
    </div>
  )
}
