import React, { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw, Ruler } from 'lucide-react'
import api from '../utils/api.js'

const DIMENSIONS = [
  { key: 'length', label: 'Length', color: '#18b45a' },
  { key: 'width', label: 'Width', color: '#3685cc' },
  { key: 'height', label: 'Height', color: '#8b72cd' },
]

export default function DimensionEditor({
  meshMetrics,
  onRegenerate,
  onDimensionsChange,
  fitClearance,
  materialThickness,
  onParametersChange,
  material,
  degradationMonths,
  disabled,
}) {
  const [dimensions, setDimensions] = useState({
    length: meshMetrics?.length_mm || 200,
    width: meshMetrics?.width_mm || 150,
    height: meshMetrics?.height_mm || 100,
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!meshMetrics) return
    setDimensions({
      length: Math.round(meshMetrics.length_mm) || 200,
      width: Math.round(meshMetrics.width_mm) || 150,
      height: Math.round(meshMetrics.height_mm) || 100,
    })
  }, [meshMetrics])

  const regenerate = async () => {
    const [length, width, height] = ['length', 'width', 'height'].map((key) => Number(dimensions[key]))
    if ([length, width, height].some((value) => !Number.isFinite(value) || value <= 0)) {
      setError('Enter positive values for all three dimensions.')
      return
    }

    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      await api.regenerateDieline({
        length_mm: length,
        width_mm: width,
        height_mm: height,
        material,
        degradation_months: degradationMonths,
        fit_clearance_mm: fitClearance,
        material_thickness_mm: materialThickness,
      })
      setSuccess(true)
      onRegenerate?.({ length_mm: length, width_mm: width, height_mm: height })
    } catch (requestError) {
      setError(requestError.message || 'Failed to regenerate the dieline.')
    } finally {
      setLoading(false)
    }
  }

  const volumeLitres = (
    Number(dimensions.length) * Number(dimensions.width) * Number(dimensions.height) / 1_000_000
  ).toFixed(3)
  const dimensionBounds = (key) => {
    const source = Number(meshMetrics?.[`${key}_mm`]) || Number(dimensions[key]) || 200
    const min = Math.max(1, Math.floor(source * 0.1))
    const max = Math.max(min + 1, Math.ceil(source * 3))
    return { min, max }
  }
  const changeDimension = (key, value) => {
    const next = { ...dimensions, [key]: value }
    setDimensions(next)
    setSuccess(false)
    const numeric = Object.fromEntries(
      Object.entries(next).map(([name, dimension]) => [name, Number(dimension)]),
    )
    if (Object.values(numeric).every((dimension) => Number.isFinite(dimension) && dimension > 0)) {
      onDimensionsChange?.({
        length_mm: numeric.length,
        width_mm: numeric.width,
        height_mm: numeric.height,
      })
    }
  }

  const changeParameter = (key, value) => {
    onParametersChange?.({
      fitClearance: key === 'fitClearance' ? Number(value) : fitClearance,
      materialThickness: key === 'materialThickness' ? Number(value) : materialThickness,
    })
  }

  return (
    <section className="studio-card studio-dimension-editor">
      <div className="studio-section-heading"><Ruler size={16}/><span>Parameters</span></div>
      <div className="studio-dimension-grid">
        {DIMENSIONS.map(({ key, label, color }) => (
          <label className="studio-dimension-field" key={key} htmlFor={`dim-${key}`}>
            <span><i style={{ background: color }}/>{label}</span>
            <div>
              <input
                id={`dim-${key}`}
                type="number"
                min={dimensionBounds(key).min}
                max={dimensionBounds(key).max}
                step="1"
                value={dimensions[key]}
                onChange={(event) => changeDimension(key, event.target.value)}
              />
              <small>mm</small>
            </div>
            <input
              className="studio-dimension-range"
              type="range"
              min={dimensionBounds(key).min}
              max={dimensionBounds(key).max}
              step="1"
              value={Math.min(dimensionBounds(key).max, Math.max(dimensionBounds(key).min, Number(dimensions[key]) || dimensionBounds(key).min))}
              aria-label={`${label} in millimetres`}
              onChange={(event) => changeDimension(key, event.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="studio-dimension-footer"><span>Estimated volume</span><strong>{volumeLitres} L</strong></div>
      <div className="studio-parameter-grid">
        <label className="studio-parameter-field" htmlFor="fit-clearance">
          <span>Fit clearance</span><strong>{fitClearance.toFixed(1)} mm</strong>
          <input
            id="fit-clearance"
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={fitClearance}
            onChange={(event) => changeParameter('fitClearance', event.target.value)}
          />
        </label>
        <label className="studio-parameter-field" htmlFor="material-thickness">
          <span>Material thickness</span><strong>{materialThickness.toFixed(1)} mm</strong>
          <input
            id="material-thickness"
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={materialThickness}
            onChange={(event) => changeParameter('materialThickness', event.target.value)}
          />
        </label>
      </div>
      {error && <div className="studio-inline-error" role="alert"><AlertCircle size={14}/>{error}</div>}
      {success && <div className="studio-success-message"><CheckCircle2 size={14}/>Regenerating with the updated dimensions…</div>}
      <button className="studio-button studio-button-primary studio-dimension-generate" onClick={regenerate} disabled={loading || disabled}>
        <RefreshCw size={14} className={loading ? 'studio-spin' : ''}/>{loading ? 'Generating…' : 'Auto-generate dieline'}
      </button>
    </section>
  )
}
