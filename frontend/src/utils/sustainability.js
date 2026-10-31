// Sustainability calculation formulas mirrored from backend morpho_pipeline.py
// Used for real-time client-side estimates before API response arrives.

export const MATERIAL_PROFILES = {
  mycelium: {
    name: 'Agricultural Mycelium',
    density: 85, co2PerKg: 0.42,
    recyclability: 0.98, biodegradableMonths: 1,
    voidFillEfficiency: 0.95, color: '#22C55E',
  },
  cardboard: {
    name: 'Corrugated Cardboard',
    density: 120, co2PerKg: 0.89,
    recyclability: 0.87, biodegradableMonths: 3,
    voidFillEfficiency: 0.78, color: '#F59E0B',
  },
  kraft: {
    name: 'Recycled Kraft',
    density: 105, co2PerKg: 0.61,
    recyclability: 0.92, biodegradableMonths: 6,
    voidFillEfficiency: 0.85, color: '#8B5CF6',
  },
}

const EPS_BASELINE = { co2PerKg: 3.29, density: 25 }

export function calcMetrics(
  lengthMm,
  widthMm,
  heightMm,
  materialKey = 'cardboard',
  degradationMonths = 0,
  thicknessMm = 4,
) {
  const p = MATERIAL_PROFILES[materialKey] || MATERIAL_PROFILES.cardboard
  const l = lengthMm / 1000, w = widthMm / 1000, h = heightMm / 1000

  const volume = l * w * h
  const surfaceArea = 2 * (l * w + l * h + w * h)
  const thickness = thicknessMm / 1000
  const massKg = surfaceArea * thickness * p.density

  const baselineCO2 = EPS_BASELINE.co2PerKg * massKg
  const actualCO2 = p.co2PerKg * massKg
  const co2SavedKg = Math.max(0, baselineCO2 - actualCO2)
  const co2SavedGrams = co2SavedKg * 1000

  const matSavingsPct = Math.max(0, (1 - p.density / EPS_BASELINE.density) * 100)
  const matSavingsGrams = massKg * (matSavingsPct / 100) * 1000

  const productVol = volume * 0.75
  const fillRatio = Math.min(1, productVol / Math.max(volume, 1e-9))
  const effectiveFill = fillRatio + (1 - fillRatio) * p.voidFillEfficiency
  const voidReductionPct = Math.max(0, Math.min(100, ((effectiveFill - 0.6) / 0.4) * 100))

  // Score
  const carbonScore = Math.min(40, (co2SavedKg / Math.max(0.001, baselineCO2)) * 40)
  const circularityScore = p.recyclability * 35
  const voidScore = (voidReductionPct / 100) * 25
  const degradationBonus = Math.min(10, Math.max(0, (degradationMonths - p.biodegradableMonths) / p.biodegradableMonths * 10))
  const score = Math.min(100, Math.max(0, carbonScore + circularityScore + voidScore + degradationBonus))

  return {
    materialName: p.name,
    materialColor: p.color,
    co2SavedGrams: Math.round(co2SavedGrams * 10) / 10,
    co2SavedKg: Math.round(co2SavedKg * 1000) / 1000,
    matSavingsPct: Math.round(matSavingsPct * 10) / 10,
    matSavingsGrams: Math.round(matSavingsGrams * 10) / 10,
    voidReductionPct: Math.round(voidReductionPct * 10) / 10,
    sustainabilityScore: Math.round(score * 10) / 10,
    recyclabilityPct: Math.round(p.recyclability * 1000) / 10,
    massKg: Math.round(massKg * 10000) / 10000,
    volume: Math.round(volume * 1e6) / 1e6,
  }
}

export function getScoreColor(score) {
  if (score >= 80) return '#22C55E'
  if (score >= 60) return '#F59E0B'
  if (score >= 40) return '#F97316'
  return '#EF4444'
}

export function generateMonthlyTrend(baseScore, months = 12) {
  return Array.from({ length: months }, (_, i) => ({
    month: new Date(2025, i).toLocaleString('default', { month: 'short' }),
    score: Math.min(100, Math.round(baseScore + Math.sin(i * 0.5) * 8 + i * 0.4)),
  }))
}

export function generateDegradationTrend(lengthMm, widthMm, heightMm, material) {
  return Array.from({ length: 25 }, (_, months) => {
    const m = calcMetrics(lengthMm, widthMm, heightMm, material, months)
    return { month: months, score: m.sustainabilityScore }
  })
}
