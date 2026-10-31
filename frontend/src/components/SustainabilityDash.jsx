import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement, LineElement, PointElement, Filler, Title
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { Leaf, Zap, Wind, Recycle, TrendingUp, Award } from 'lucide-react'
import { calcMetrics, generateMonthlyTrend, generateDegradationTrend, getScoreColor, MATERIAL_PROFILES } from '../utils/sustainability.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Title)

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#9CA3AF', font: { family: 'DM Sans', size: 12 }, padding: 16 } },
    tooltip: {
      backgroundColor: '#111827',
      borderColor: '#1F2937',
      borderWidth: 1,
      titleColor: '#F9FAFB',
      bodyColor: '#9CA3AF',
      padding: 12,
    },
  },
}

function ScoreGauge({ score }) {
  const color = getScoreColor(score)
  const circumference = 2 * Math.PI * 54
  const offset = circumference * (1 - score / 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="54" fill="none" stroke="#1F2937" strokeWidth="10"/>
          <circle
            cx="70" cy="70" r="54"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(score)}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>/ 100</div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>
        {score >= 80 ? '🌿 Excellent' : score >= 60 ? '✅ Good' : score >= 40 ? '⚠️ Fair' : '❌ Poor'}
      </div>
    </div>
  )
}

export default function SustainabilityDash({ metrics, material = 'cardboard', degradationMonths = 0,
  lengthMm = 200, widthMm = 150, heightMm = 100 }) {

  const m = metrics || calcMetrics(lengthMm, widthMm, heightMm, material, degradationMonths)
  const trend = generateMonthlyTrend(m.sustainabilityScore)
  const degradTrend = generateDegradationTrend(lengthMm, widthMm, heightMm, material)
  const profile = MATERIAL_PROFILES[material] || MATERIAL_PROFILES.cardboard

  // Pie chart data
  const pieData = {
    labels: ['Volume Efficiency', 'Circularity', 'Carbon Index'],
    datasets: [{
      data: [
        Math.round(m.voidReductionPct),
        Math.round(m.recyclabilityPct),
        Math.round(Math.min(100, (m.co2SavedGrams / 10))),
      ],
      backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(59,130,246,0.8)', 'rgba(139,92,246,0.8)'],
      borderColor: ['#22C55E', '#3B82F6', '#8B5CF6'],
      borderWidth: 2,
    }],
  }

  // Bar chart — monthly efficiency trend
  const barData = {
    labels: trend.map(t => t.month),
    datasets: [{
      label: 'Sustainability Score',
      data: trend.map(t => t.score),
      backgroundColor: trend.map(t => `${getScoreColor(t.score)}BB`),
      borderColor: trend.map(t => getScoreColor(t.score)),
      borderWidth: 1.5,
      borderRadius: 6,
    }],
  }

  // Line chart — degradation timeline
  const lineData = {
    labels: degradTrend.map(d => `${d.month}mo`),
    datasets: [{
      label: 'Score over time',
      data: degradTrend.map(d => d.score),
      borderColor: '#22C55E',
      backgroundColor: 'rgba(34,197,94,0.08)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#22C55E',
      pointRadius: 3,
      pointHoverRadius: 6,
    }],
  }

  const metricCards = [
    { label: 'CO₂ Reduced', val: `${m.co2SavedGrams}g`, sub: 'vs EPS baseline', color: '#22C55E', icon: <Leaf size={18}/> },
    { label: 'Material Saved', val: `${m.matSavingsGrams}g`, sub: `${m.matSavingsPct}% lighter`, color: '#3B82F6', icon: <Zap size={18}/> },
    { label: 'Void Reduction', val: `${m.voidReductionPct}%`, sub: 'tighter fit', color: '#8B5CF6', icon: <Wind size={18}/> },
    { label: 'Recyclability', val: `${m.recyclabilityPct}%`, sub: profile.name, color: '#F59E0B', icon: <Recycle size={18}/> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top row — score gauge + metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
        {/* Score gauge */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Award size={14}/> Sustainability Score
          </div>
          <ScoreGauge score={m.sustainabilityScore} />
          <div style={{ fontSize: 11, color: '#4B5563', textAlign: 'center', lineHeight: 1.5 }}>
            Integrated score combining carbon, circularity, and void efficiency
          </div>
        </div>

        {/* Metric cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {metricCards.map(({ label, val, sub, color, icon }) => (
            <div key={label} className="metric-card" style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="metric-label">{label}</div>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color,
                }}>{icon}</div>
              </div>
              <div className="metric-value" style={{ color }}>{val}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 16 }}>
        {/* Pie chart */}
        <div className="chart-container">
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} color="#22C55E"/> Material Property Mix
          </div>
          <div style={{ height: 200 }}>
            <Doughnut data={pieData} options={{
              ...CHART_DEFAULTS,
              cutout: '65%',
              plugins: { ...CHART_DEFAULTS.plugins, legend: { ...CHART_DEFAULTS.plugins.legend, position: 'bottom' } },
            }} />
          </div>
        </div>

        {/* Bar chart */}
        <div className="chart-container">
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB', marginBottom: 16 }}>
            Monthly Efficiency Trend
          </div>
          <div style={{ height: 200 }}>
            <Bar data={barData} options={{
              ...CHART_DEFAULTS,
              scales: {
                x: { grid: { color: '#1F2937' }, ticks: { color: '#6B7280', font: { size: 11 } } },
                y: { grid: { color: '#1F2937' }, ticks: { color: '#6B7280', font: { size: 11 } }, min: 0, max: 100 },
              },
              plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
            }} />
          </div>
        </div>
      </div>

      {/* Degradation line chart */}
      <div className="chart-container">
        <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB', marginBottom: 4 }}>
          Dieline Score vs. Degradation Timeline
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
          Sustainability score evolution over a 24-month biodegradation lifecycle
        </div>
        <div style={{ height: 180 }}>
          <Line data={lineData} options={{
            ...CHART_DEFAULTS,
            scales: {
              x: { grid: { color: '#1F2937' }, ticks: { color: '#6B7280', font: { size: 10 }, maxTicksLimit: 12 } },
              y: { grid: { color: '#1F2937' }, ticks: { color: '#6B7280', font: { size: 11 } }, min: 0, max: 100 },
            },
            plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
          }} />
        </div>
      </div>
    </div>
  )
}
