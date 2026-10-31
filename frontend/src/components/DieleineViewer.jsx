import React, { useEffect, useRef, useState } from 'react'
import { Download, Maximize2, ZoomIn, ZoomOut, Scissors } from 'lucide-react'

export default function DieleineViewer({
  svgUrl,
  pdfUrl,
  overviewPdfUrl,
  pdfError,
  loading,
  onDownload,
  dimensions,
  visualScale = 1,
}) {
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [pdfDownloadError, setPdfDownloadError] = useState('')
  const [pdfDownloading, setPdfDownloading] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setError('')
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [svgUrl])

  const handleWheel = (event) => {
    event.preventDefault()
    setScale((current) => Math.min(8, Math.max(0.1, current * (event.deltaY < 0 ? 1.1 : 0.9))))
  }

  const downloadSvg = () => {
    if (!svgUrl || !loaded) return
    const link = document.createElement('a')
    link.href = svgUrl
    link.download = 'morphopack-dieline.svg'
    link.click()
    onDownload?.()
  }
  const downloadPdf = async (url, filename) => {
    if (!url || pdfDownloading) return
    setPdfDownloadError('')
    setPdfDownloading(true)
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Download failed (HTTP ${response.status}).`)
      }
      const pdf = await response.blob()
      if (pdf.type && pdf.type !== 'application/pdf') {
        throw new Error('The server did not return a PDF file.')
      }
      const objectUrl = URL.createObjectURL(pdf)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (downloadError) {
      setPdfDownloadError(downloadError instanceof TypeError
        ? 'Cannot reach the MorphoPack API. Start the backend server and try again.'
        : downloadError.message || 'Could not download the PDF.')
    } finally {
      setPdfDownloading(false)
    }
  }
  return (
    <section className="studio-viewer">
      <header className="studio-viewer-toolbar">
        <div>
          <strong>2D dieline</strong>
          <span className="studio-viewer-hint"><Scissors size={13}/> Solid: cut · dashed: fold</span>
          {dimensions && (
            <span className="studio-viewer-dimensions">
              {Math.round(dimensions.length_mm)} × {Math.round(dimensions.width_mm)} × {Math.round(dimensions.height_mm)} mm
            </span>
          )}
        </div>
        <div className="studio-viewer-actions">
          <button className="studio-icon-button" onClick={() => setScale((value) => Math.max(0.1, value * 0.8))} title="Zoom out">
            <ZoomOut size={15}/>
          </button>
          <button className="studio-icon-button" onClick={() => setScale((value) => Math.min(8, value * 1.25))} title="Zoom in">
            <ZoomIn size={15}/>
          </button>
          <button className="studio-icon-button" onClick={() => { setScale(1); setPan({ x: 0, y: 0 }) }} title="Fit to view">
            <Maximize2 size={15}/>
          </button>
          <button className="studio-button studio-button-secondary" onClick={downloadSvg} disabled={!loaded}>
            <Download size={14}/> SVG
          </button>
          <button
            className="studio-button studio-button-primary"
            onClick={() => downloadPdf(pdfUrl, 'morphopack-dieline.pdf')}
            disabled={!pdfUrl || pdfDownloading}
            title="Full-size manufacturing dieline. Print at 100% / actual size."
          >
            <Download size={14}/>{pdfDownloading ? 'Preparing PDF…' : 'PDF'}
          </button>
          {overviewPdfUrl && (
            <button
              className="studio-button studio-button-secondary"
              onClick={() => downloadPdf(overviewPdfUrl, 'morphopack-dieline-overview.pdf')}
              disabled={pdfDownloading}
              title="One-page fit-to-sheet overview with sustainability metrics; not for cutting"
            >
              <Download size={14}/> Overview PDF
            </button>
          )}
        </div>
      </header>
      <div
        className={`studio-dieline-canvas${dragging ? ' is-dragging' : ''}`}
        onWheel={handleWheel}
        onMouseDown={(event) => {
          if (!loaded) return
          setDragging(true)
          setStartPos({ x: event.clientX - pan.x, y: event.clientY - pan.y })
        }}
        onMouseMove={(event) => {
          if (dragging) setPan({ x: event.clientX - startPos.x, y: event.clientY - startPos.y })
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        {loading ? (
          <div className="studio-empty-viewer">Generating dieline…</div>
        ) : svgUrl ? (
          <div
            className="studio-dieline-artwork"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale * visualScale})`,
            }}
          >
            <img
              src={svgUrl}
              alt="Generated packaging dieline with cut and fold lines"
              draggable="false"
              decoding="async"
              onLoad={() => {
                setLoaded(true)
                setError('')
              }}
              onError={() => setError('Could not load the generated SVG dieline.')}
            />
            {error && <span className="studio-viewer-error" role="alert">{error}</span>}
          </div>
        ) : (
          <div className="studio-empty-viewer" role={error ? 'alert' : undefined}>
            <Scissors size={32}/>
            <strong>{error || 'Your dieline will appear here'}</strong>
            <span>{error ? 'Run the pipeline again or check the backend logs.' : 'Upload a mesh and run the pipeline to create a cutting template.'}</span>
          </div>
        )}
        {loaded && <span className="studio-zoom-indicator">{Math.round(scale * 100)}%</span>}
      </div>
      {!pdfUrl && !loading && (
        <p className={`studio-viewer-hint studio-download-unavailable${pdfError ? ' studio-inline-error' : ''}`} role={pdfError ? 'alert' : undefined}>
          {pdfError ? `PDF generation failed: ${pdfError}` : 'PDF is not ready yet. Regenerate the dieline to create the download.'}
        </p>
      )}
      {pdfDownloadError && <p className="studio-inline-error" role="alert">{pdfDownloadError}</p>}
    </section>
  )
}
