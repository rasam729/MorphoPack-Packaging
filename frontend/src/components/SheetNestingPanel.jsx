import React, { useMemo } from 'react'
import { Layers3 } from 'lucide-react'

const SHEET = { width: 1000, height: 700, margin: 12, gap: 8 }

function pack(netWidth, netHeight) {
  const usableWidth = SHEET.width - SHEET.margin * 2
  const usableHeight = SHEET.height - SHEET.margin * 2
  const choices = [
    { width: netWidth, height: netHeight, rotated: false },
    { width: netHeight, height: netWidth, rotated: true },
  ].map((item) => {
    const columns = Math.max(0, Math.floor((usableWidth + SHEET.gap) / (item.width + SHEET.gap)))
    const rows = Math.max(0, Math.floor((usableHeight + SHEET.gap) / (item.height + SHEET.gap)))
    return { ...item, columns, rows, count: columns * rows }
  })
  return choices.sort((a, b) => b.count - a.count)[0]
}

export function estimateNesting(dimensions, fitClearance = 3, materialThickness = 1.5) {
  const length = Math.max(1, Number(dimensions.length_mm) || 1)
  const width = Math.max(1, Number(dimensions.width_mm) || 1)
  const height = Math.max(1, Number(dimensions.height_mm) || 1)
  const allowance = 2 * (fitClearance + materialThickness)
  const netWidth = (length + allowance) * 2.15 + (width + allowance) * 2
  const netHeight = height + allowance + (width + allowance) * 0.9
  const placement = pack(netWidth, netHeight)
  const usedArea = placement.count * netWidth * netHeight
  const wastePct = Math.max(0, Math.min(100, (1 - usedArea / (SHEET.width * SHEET.height)) * 100))
  return { netWidth, netHeight, placement, wastePct }
}

export default function SheetNestingPanel({
  dimensions,
  fitClearance = 3,
  materialThickness = 1.5,
}) {
  const layout = useMemo(
    () => estimateNesting(dimensions, fitClearance, materialThickness),
    [dimensions, fitClearance, materialThickness],
  )

  const { placement } = layout
  const scale = 0.66
  const itemWidth = (placement.rotated ? layout.netHeight : layout.netWidth) * scale
  const itemHeight = (placement.rotated ? layout.netWidth : layout.netHeight) * scale
  const visibleCount = Math.min(placement.count, 24)

  return (
    <section className="studio-card studio-nesting-panel">
      <header className="studio-nesting-heading">
        <div>
          <div className="studio-section-heading"><Layers3 size={16}/><span>Sheet nesting</span></div>
          <h2>{SHEET.width} × {SHEET.height} mm sheet</h2>
        </div>
        <strong>{placement.count} <small>estimated per sheet</small></strong>
      </header>
      <div className="studio-nesting-sheet">
        <svg
          viewBox={`0 0 ${SHEET.width * scale} ${SHEET.height * scale}`}
          role="img"
          aria-label={`Estimated nesting of ${placement.count} dielines on a ${SHEET.width} by ${SHEET.height} millimetre sheet`}
        >
          <rect x="0" y="0" width={SHEET.width * scale} height={SHEET.height * scale} rx="10" className="studio-nesting-stock"/>
          {Array.from({ length: visibleCount }, (_, index) => {
            const column = index % placement.columns
            const row = Math.floor(index / placement.columns)
            return (
              <rect
                key={index}
                x={SHEET.margin * scale + column * (itemWidth + SHEET.gap * scale)}
                y={SHEET.margin * scale + row * (itemHeight + SHEET.gap * scale)}
                width={itemWidth}
                height={itemHeight}
                rx="4"
                className="studio-nesting-piece"
              />
            )
          })}
        </svg>
      </div>
      <div className="studio-nesting-summary">
        <div><span>Estimated offcut</span><strong>{layout.wastePct.toFixed(1)}%</strong></div>
        <div><span>Net envelope</span><strong>{Math.round(layout.netWidth)} × {Math.round(layout.netHeight)} mm</strong></div>
      </div>
      <p className="studio-nesting-note">Rectangular layout estimate only; allow for cutter kerf, grain direction and production margins before ordering stock.</p>
    </section>
  )
}
