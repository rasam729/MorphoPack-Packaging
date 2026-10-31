import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Scissors, Upload, Box, Download, RefreshCw, AlertCircle, CheckCircle2,
  Leaf, Layers, Sparkles, TrendingDown, ShieldCheck, ArrowRight, Eye,
  Maximize2, ZoomIn, ZoomOut, RotateCcw, FileCode, Check, EyeOff, Rotate3D
} from 'lucide-react'
import api from '../utils/api.js'
import { MATERIAL_PROFILES } from '../utils/sustainability.js'

/* ─── Embedded Three.js 3D Environment for STL/OBJ Product Models ───────── */
function Product3DViewer({ file, useSample, onDimensionsExtracted }) {
  const containerRef = useRef(null)
  const [wireframe, setWireframe] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  const [loadingMesh, setLoadingMesh] = useState(false)
  const [meshDims, setMeshDims] = useState(null)
  const sceneRef = useRef(null)
  const currentMeshRef = useRef(null)
  const controlsRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let animationFrameId
    let renderer, camera, scene, controls

    const initThree = async () => {
      setLoadingMesh(true)
      const [THREE, { OrbitControls }, { STLLoader }, { OBJLoader }] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
        import('three/addons/loaders/STLLoader.js'),
        import('three/addons/loaders/OBJLoader.js'),
      ])
      if (disposed) return

      // Scene setup
      scene = new THREE.Scene()
      scene.background = new THREE.Color('#F8FAFC')
      sceneRef.current = scene

      const width = container.clientWidth || 400
      const height = container.clientHeight || 320
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
      camera.position.set(150, 120, 180)

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.outputColorSpace = THREE.SRGBColorSpace
      container.innerHTML = ''
      container.appendChild(renderer.domElement)

      // Lighting
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 1.4)
      scene.add(hemiLight)

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.8)
      dirLight.position.set(120, 180, 140)
      scene.add(dirLight)

      const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.8)
      fillLight.position.set(-120, -60, -100)
      scene.add(fillLight)

      // Ground plane grid
      const grid = new THREE.GridHelper(260, 26, 0x94A3B8, 0xE2E8F0)
      grid.position.y = -0.5
      scene.add(grid)

      // Controls
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.06
      controlsRef.current = controls

      // Mesh material
      const material = new THREE.MeshStandardMaterial({
        color: 0x16A34A,
        roughness: 0.35,
        metalness: 0.1,
        wireframe: wireframe,
      })

      const loadGeometry = (geometry) => {
        if (disposed) return
        if (currentMeshRef.current) {
          scene.remove(currentMeshRef.current)
          currentMeshRef.current.geometry?.dispose()
        }

        geometry.computeVertexNormals()
        geometry.center()

        geometry.computeBoundingBox()
        const bb = geometry.boundingBox
        const size = new THREE.Vector3()
        bb.getSize(size)

        // Scale if needed (if meters, scale up to mm; if huge, scale down)
        let scaleFactor = 1.0
        const maxExtent = Math.max(size.x, size.y, size.z)
        if (maxExtent < 5.0) scaleFactor = 1000.0
        else if (maxExtent > 1500.0) scaleFactor = 0.1

        geometry.scale(scaleFactor, scaleFactor, scaleFactor)
        geometry.computeBoundingBox()
        geometry.boundingBox.getSize(size)

        const dims = {
          length: Math.round(size.x * 10) / 10,
          width: Math.round(size.y * 10) / 10,
          height: Math.round(size.z * 10) / 10,
        }
        setMeshDims(dims)
        if (onDimensionsExtracted) onDimensionsExtracted(dims)

        const mesh = new THREE.Mesh(geometry, material)
        // Rest bottom on grid
        mesh.position.y = size.y / 2
        mesh.castShadow = true
        mesh.receiveShadow = true
        scene.add(mesh)
        currentMeshRef.current = mesh

        // Fit camera
        const radius = Math.max(size.x, size.y, size.z) * 1.5
        camera.position.set(radius * 1.2, radius * 0.9, radius * 1.4)
        controls.target.set(0, size.y / 2, 0)
        controls.update()
        setLoadingMesh(false)
      }

      // Load STL file or sample
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const loader = new STLLoader()
            const geom = loader.parse(e.target.result)
            loadGeometry(geom)
          } catch (err) {
            console.error('Error parsing 3D file', err)
            setLoadingMesh(false)
          }
        }
        reader.readAsArrayBuffer(file)
      } else if (useSample) {
        const loader = new STLLoader()
        loader.load(
          '/models/glass.stl',
          (geom) => loadGeometry(geom),
          undefined,
          (err) => {
            console.warn('Sample glass.stl not found in /models/glass.stl, falling back to procedural model', err)
            // Fallback cylindrical product
            const geom = new THREE.CylinderGeometry(25, 30, 95, 32)
            loadGeometry(geom)
          }
        )
      } else {
        // Default placeholder model
        const geom = new THREE.CylinderGeometry(24, 28, 85, 32)
        loadGeometry(geom)
      }

      // Render loop
      const animate = () => {
        if (disposed) return
        animationFrameId = requestAnimationFrame(animate)
        if (autoRotate && currentMeshRef.current) {
          currentMeshRef.current.rotation.y += 0.006
        }
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      // Handle resize
      const handleResize = () => {
        if (!container || !renderer || !camera) return
        const w = container.clientWidth
        const h = container.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        cancelAnimationFrame(animationFrameId)
        renderer?.dispose()
      }
    }

    const cleanPromise = initThree()

    return () => {
      disposed = true
      cleanPromise.then((fn) => fn && fn())
    }
  }, [file, useSample])

  // Wireframe toggle effect
  useEffect(() => {
    if (currentMeshRef.current?.material) {
      currentMeshRef.current.material.wireframe = wireframe
    }
  }, [wireframe])

  return (
    <div style={{ position: 'relative', width: '100%', height: 320, borderRadius: 12, overflow: 'hidden', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <div ref={mountRef => (containerRef.current = mountRef)} style={{ width: '100%', height: '100%' }} />

      {/* Floating 3D Toolbar */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(8px)',
        borderRadius: 8,
        border: '1px solid #CBD5E1',
        fontSize: 11,
        color: '#475569',
      }}>
        <Rotate3D size={13} color="#16A34A" />
        <span>3D Product Viewport</span>
        {meshDims && (
          <span style={{ marginLeft: 6, paddingLeft: 6, borderLeft: '1px solid #CBD5E1', fontWeight: 600, color: '#0F172A' }}>
            {meshDims.length} × {meshDims.width} × {meshDims.height} mm
          </span>
        )}
      </div>

      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className="btn-ghost"
          style={{
            padding: '5px 8px',
            fontSize: 11,
            background: autoRotate ? '#DCFCE7' : '#FFFFFF',
            borderColor: autoRotate ? '#86EFAC' : '#CBD5E1',
            color: autoRotate ? '#15803D' : '#475569',
            borderRadius: 6,
          }}
          title="Toggle Turntable Rotation"
        >
          Turntable
        </button>
        <button
          type="button"
          onClick={() => setWireframe(!wireframe)}
          className="btn-ghost"
          style={{
            padding: '5px 8px',
            fontSize: 11,
            background: wireframe ? '#DCFCE7' : '#FFFFFF',
            borderColor: wireframe ? '#86EFAC' : '#CBD5E1',
            color: wireframe ? '#15803D' : '#475569',
            borderRadius: 6,
          }}
          title="Toggle Wireframe / Shaded"
        >
          {wireframe ? 'Shaded' : 'Wireframe'}
        </button>
      </div>

      {loadingMesh && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(248, 250, 252, 0.85)', backdropFilter: 'blur(4px)', color: '#16A34A', fontSize: 13, gap: 8
        }}>
          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Processing 3D Geometry...</span>
        </div>
      )}
    </div>
  )
}

/* ─── Main Custom Unfold Panel Component ─────────────────────────────────── */
export default function CustomUnfoldPanel({ user, defaultMeshFile }) {
  const [file, setFile] = useState(defaultMeshFile || null)
  const [useSample, setUseSample] = useState(false)
  const [material, setMaterial] = useState('cardboard')
  const [clearance, setClearance] = useState(2.5)
  const [thickness, setThickness] = useState(1.5)
  const [maxFaces, setMaxFaces] = useState(150)
  const [degradationMonths, setDegradationMonths] = useState(6)
  const [loading, setLoading] = useState(false)
  const [statusStep, setStatusStep] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1.0)
  const [extractedDims, setExtractedDims] = useState(null)

  const fileInputRef = useRef(null)

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
      'Generating watertight packaging envelope & decimating facets...',
      'Executing planar Paper Model unfold solver...',
      'Synthesizing cut lines, fold creases, and glue tabs...',
      'Calculating void volume & carbon comparison metrics...',
    ]
    let stepIndex = 0
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length
      setStatusStep(steps[stepIndex])
    }, 1800)

    try {
      const form = new FormData()
      if (file) {
        form.append('mesh', file)
      }
      form.append('clearance_mm', String(clearance))
      form.append('thickness_mm', String(thickness))
      form.append('max_faces', String(maxFaces))
      form.append('material', material)
      form.append('degradation_months', String(degradationMonths))
      if (user?.id) form.append('user_id', String(user.id))

      const data = await api.customUnfold(form)
      clearInterval(stepInterval)
      setResult(data)
    } catch (err) {
      clearInterval(stepInterval)
      setError(err.message || 'Mesh unfolding failed. Please check your 3D STL file.')
    } finally {
      setLoading(false)
      setStatusStep('')
    }
  }

  const currentProfile = MATERIAL_PROFILES[material] || MATERIAL_PROFILES.cardboard
  const cmp = result?.metrics?.reduction
  const boxData = result?.metrics?.box
  const customData = result?.metrics?.custom_unfold

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      {/* Top Split Layout: 3D Product Environment (Left) & Generated Dieline SVG (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 460px) minmax(420px, 1fr)',
        gap: 24,
        alignItems: 'start',
      }}>
        {/* ── CARD 1: 3D Product Environment & Generation Controls (WHITE CARD) ── */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}>
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#DCFCE7',
                border: '1px solid #86EFAC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Box size={20} color="#15803D" />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  3D Product Mesh Environment
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                  Inspect uploaded 3D geometry &amp; parameters
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: 12, padding: '6px 12px', background: '#F8FAFC', borderColor: '#CBD5E1', color: '#334155', borderRadius: 8 }}
            >
              <Upload size={13} style={{ marginRight: 6, display: 'inline' }} />
              Upload STL
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".stl,.obj"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* 3D Interactive Canvas */}
          <Product3DViewer
            file={file}
            useSample={useSample}
            onDimensionsExtracted={setExtractedDims}
          />

          {/* Model Selection / Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: '#F8FAFC',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            fontSize: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }} />
              <span style={{ fontWeight: 600, color: '#1E293B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {file ? file.name : useSample ? 'glass.stl (Sample Model)' : 'Sample Product Model'}
              </span>
            </div>

            {!file && !useSample && (
              <button
                type="button"
                onClick={handleSelectSample}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563EB',
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={12} /> Load Glass Sample
              </button>
            )}
          </div>

          {/* Unfolding Configuration Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={15} color="#16A34A" /> Unfolding &amp; Material Parameters
            </div>

            {/* Material Profile */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>
                Packaging Material
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  fontSize: 13,
                  outline: 'none',
                }}
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              >
                {Object.entries(MATERIAL_PROFILES).map(([key, prof]) => (
                  <option key={key} value={key}>{prof.name}</option>
                ))}
              </select>
            </div>

            {/* Clearance Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#475569' }}>Clearance Cushion Gap</span>
                <strong style={{ color: '#0F172A' }}>{clearance} mm</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={clearance}
                onChange={(e) => setClearance(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#16A34A' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8' }}>
                <span>1.0 mm (Tight wrap)</span>
                <span>8.0 mm (High cushion)</span>
              </div>
            </div>

            {/* Caliper Thickness Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#475569' }}>Caliper Thickness</span>
                <strong style={{ color: '#0F172A' }}>{thickness} mm</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.25"
                value={thickness}
                onChange={(e) => setThickness(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#16A34A' }}
              />
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              fontSize: 12,
              color: '#B91C1C',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px 18px',
              fontSize: 14,
              fontWeight: 700,
              background: loading ? '#94A3B8' : '#16A34A',
              color: '#FFFFFF',
              borderRadius: 10,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Running Blender 4.5 Pipeline...</span>
              </>
            ) : (
              <>
                <Scissors size={16} />
                <span>Run Pipeline &amp; Generate Dieline</span>
              </>
            )}
          </button>

          {loading && (
            <div style={{
              padding: '10px 14px',
              background: '#F0FDF4',
              borderRadius: 8,
              border: '1px solid #BBF7D0',
              fontSize: 12,
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <RefreshCw size={14} style={{ animation: 'spin 1.2s linear infinite' }} />
              <span>{statusStep || 'Processing geometry...'}</span>
            </div>
          )}
        </div>

        {/* ── CARD 2: Generated Custom Dieline SVG Viewer (WHITE CARD) ── */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minHeight: 520,
        }}>
          {/* Header & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scissors size={18} color="#16A34A" />
                <span>Custom Form-Fitting Dieline SVG</span>
                {result && (
                  <span style={{ fontSize: 11, padding: '2px 8px', background: '#DCFCE7', color: '#166534', borderRadius: 999, fontWeight: 600 }}>
                    Blender Paper Model 4.5
                  </span>
                )}
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                Unfolded 2D net with cut boundaries, mountain/valley fold creases, and glue tabs
              </p>
            </div>

            {result && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setZoom(z => Math.max(0.6, z - 0.2))}
                  style={{ padding: '6px 10px', fontSize: 12, background: '#F8FAFC', borderColor: '#CBD5E1', color: '#334155' }}
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setZoom(1.0)}
                  style={{ padding: '6px 10px', fontSize: 12, background: '#F8FAFC', borderColor: '#CBD5E1', color: '#334155' }}
                  title="Reset Zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
                  style={{ padding: '6px 10px', fontSize: 12, background: '#F8FAFC', borderColor: '#CBD5E1', color: '#334155' }}
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            )}
          </div>

          {/* SVG Viewer Display Area */}
          {result?.svg_url ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                width: '100%',
                height: 380,
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <img
                  src={`${result.svg_url}?t=${Date.now()}`}
                  alt="Custom Unfolded Dieline SVG"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.12s ease-out',
                    maxWidth: '92%',
                    maxHeight: '92%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Vector Line Style Legend */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                padding: '10px 14px',
                background: '#F8FAFC',
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                fontSize: 11,
                color: '#475569',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 16, height: 2, background: '#000000', display: 'inline-block' }} /> Cut Boundary (Perimeter)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 16, height: 2, borderTop: '2px dashed #000000', display: 'inline-block' }} /> Mountain Fold (Convex)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 16, height: 2, borderTop: '2px dotted #000000', display: 'inline-block' }} /> Valley Fold (Concave)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 10, background: '#E5E7EB', border: '1px solid #94A3B8', display: 'inline-block' }} /> Glue / Interlock Tabs
                </span>
              </div>

              {/* Direct Download Suite */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a
                  href={result.svg_url}
                  download="custom_unfold_dieline.svg"
                  className="btn-primary"
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#16A34A',
                    color: '#FFFFFF',
                    borderRadius: 8,
                  }}
                >
                  <Download size={13} /> Download Dieline (SVG)
                </a>

                {result.glb_url && (
                  <a
                    href={result.glb_url}
                    download="custom_unfold_preview.glb"
                    className="btn-ghost"
                    style={{
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#F8FAFC',
                      borderColor: '#CBD5E1',
                      color: '#1E293B',
                      borderRadius: 8,
                    }}
                  >
                    <Download size={13} /> Download 3D Preview (GLB)
                  </a>
                )}

                {result.pdf_url && (
                  <a
                    href={result.pdf_url}
                    download="custom_unfold_dieline.pdf"
                    className="btn-ghost"
                    style={{
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#F8FAFC',
                      borderColor: '#CBD5E1',
                      color: '#1E293B',
                      borderRadius: 8,
                    }}
                  >
                    <Download size={13} /> Download 1:1 Scale (PDF)
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              border: '2px dashed #CBD5E1',
              borderRadius: 12,
              background: '#F8FAFC',
              textAlign: 'center',
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Scissors size={24} color="#16A34A" />
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Ready to Unfold 3D Product Mesh
              </h4>
              <p style={{ fontSize: 12, color: '#64748B', maxWidth: 360, marginTop: 6 }}>
                Click <strong>"Run Pipeline &amp; Generate Dieline"</strong> on the left.
                Blender 4.5 headless will unfold the 3D mesh into a flat SVG dieline ready for laser cutting or printing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 3: Comparative Packaging & Carbon Metrics (WHITE CARD) ── */}
      {result && cmp && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingDown size={18} color="#16A34A" />
                <span>Comparative Packaging Metrics: Standard Box vs. Custom Unfold</span>
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                Quantified reduction in packaging void volume, raw material consumption, and avoided carbon footprint
              </p>
            </div>
          </div>

          {/* 4 Summary Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            <div style={{ padding: '14px 18px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Void Reduction
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#15803D', marginTop: 4 }}>
                -{cmp.void_reduction_pct}%
              </div>
              <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                {cmp.void_volume_cm3_saved} cm³ air eliminated
              </div>
            </div>

            <div style={{ padding: '14px 18px', background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Material Area Saved
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1D4ED8', marginTop: 4 }}>
                -{cmp.material_area_savings_pct}%
              </div>
              <div style={{ fontSize: 11, color: '#1E40AF', marginTop: 2 }}>
                -{cmp.material_mass_saved_grams} g / package
              </div>
            </div>

            <div style={{ padding: '14px 18px', background: '#F5F3FF', borderRadius: 10, border: '1px solid #DDD6FE' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#5B21B6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                CO₂e Avoided
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#6D28D9', marginTop: 4 }}>
                {cmp.co2_avoided_grams} g
              </div>
              <div style={{ fontSize: 11, color: '#5B21B6', marginTop: 2 }}>
                -{cmp.co2_avoided_10k_units_kg} kg per 10k units
              </div>
            </div>

            <div style={{ padding: '14px 18px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sustainability Score
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#B45309', marginTop: 4 }}>
                {cmp.sustainability_score} / 100
              </div>
              <div style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>
                High Circularity Rating
              </div>
            </div>
          </div>

          {/* Detailed Side-by-Side Matrix Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', background: '#F8FAFC' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Packaging Parameter</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Standard Box (Other Tab)</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Custom Unfolded Dieline</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: '#16A34A' }}>Impact &amp; Delta</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 12px', color: '#1E293B', fontWeight: 500 }}>Total Outer Volume</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{boxData?.volume_cm3} cm³ ({boxData?.volume_liters} L)</td>
                  <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 600 }}>{customData?.volume_cm3} cm³ ({customData?.volume_liters} L)</td>
                  <td style={{ padding: '10px 12px', color: '#16A34A', fontWeight: 700 }}>-{cmp.void_reduction_pct}% Volume Reduction</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 12px', color: '#1E293B', fontWeight: 500 }}>Empty Air Void Space</td>
                  <td style={{ padding: '10px 12px', color: '#DC2626' }}>{cmp.void_volume_cm3_saved} cm³ wasted air</td>
                  <td style={{ padding: '10px 12px', color: '#16A34A' }}>Form-fitting (2.5mm clearance)</td>
                  <td style={{ padding: '10px 12px', color: '#16A34A', fontWeight: 700 }}>{cmp.void_volume_cm3_saved} cm³ Void Saved</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 12px', color: '#1E293B', fontWeight: 500 }}>Flat Sheet Dieline Area</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{boxData?.dieline_area_cm2} cm²</td>
                  <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 600 }}>{customData?.dieline_area_cm2} cm²</td>
                  <td style={{ padding: '10px 12px', color: '#16A34A', fontWeight: 700 }}>-{cmp.material_area_savings_pct}% Material Saved</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 12px', color: '#1E293B', fontWeight: 500 }}>Material Mass per Package</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{boxData?.material_mass_grams} g</td>
                  <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 600 }}>{customData?.material_mass_grams} g</td>
                  <td style={{ padding: '10px 12px', color: '#16A34A', fontWeight: 700 }}>-{cmp.material_mass_saved_grams} g / package</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 12px', color: '#1E293B', fontWeight: 500 }}>Unit Carbon Footprint (CO₂e)</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{boxData?.co2_emissions_grams} g CO₂e</td>
                  <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 600 }}>{customData?.co2_emissions_grams} g CO₂e</td>
                  <td style={{ padding: '10px 12px', color: '#7C3AED', fontWeight: 700 }}>-{cmp.co2_avoided_grams} g CO₂e / unit</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', color: '#1E293B', fontWeight: 500 }}>10,000 Units Production Batch</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>Baseline Packaging</td>
                  <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 600 }}>Form-Fitting Optimization</td>
                  <td style={{ padding: '10px 12px', color: '#7C3AED', fontWeight: 700 }}>-{cmp.co2_avoided_10k_units_kg} kg CO₂e Avoided</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
