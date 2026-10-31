import React, { useState, useRef, useEffect } from 'react'
import {
  Box, Upload, Download, Sparkles, AlertCircle, RefreshCw, Layers,
  CheckCircle2, Code2, Rotate3D, Eye, ChevronDown, ChevronUp, Sliders
} from 'lucide-react'
import api from '../utils/api.js'

/* ─── 3D Interactive Viewport for Custom Box (Product / Base / Lid / Assembled) ── */
function Box3DViewer({ glbUrl, originalFile, viewMode = 'assembled' }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [wireframe, setWireframe] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  const currentSceneRef = useRef(null)
  const modelRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let animationFrameId
    let renderer, camera, scene, controls

    const init = async () => {
      setLoading(true)
      const [THREE, { OrbitControls }, { GLTFLoader }, { STLLoader }] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/loaders/STLLoader.js'),
      ])
      if (disposed) return

      scene = new THREE.Scene()
      scene.background = new THREE.Color('#F8FAFC')
      currentSceneRef.current = scene

      const w = container.clientWidth || 400
      const h = container.clientHeight || 340
      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000)
      camera.position.set(160, 140, 190)

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.outputColorSpace = THREE.SRGBColorSpace
      container.innerHTML = ''
      container.appendChild(renderer.domElement)

      // Lighting
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 1.4))
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.8)
      dirLight.position.set(120, 180, 140)
      scene.add(dirLight)
      const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.8)
      fillLight.position.set(-120, -60, -100)
      scene.add(fillLight)

      // Grid
      const grid = new THREE.GridHelper(260, 26, 0x94A3B8, 0xE2E8F0)
      grid.position.y = -0.5
      scene.add(grid)

      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.06

      const displayObject = (obj) => {
        if (disposed) return
        if (modelRef.current) {
          scene.remove(modelRef.current)
        }
        obj.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            if (child.material) child.material.wireframe = wireframe
          }
        })
        const bbox = new THREE.Box3().setFromObject(obj)
        const size = new THREE.Vector3()
        bbox.getSize(size)
        const center = new THREE.Vector3()
        bbox.getCenter(center)

        // Center on X and Z, and ground bottom on grid floor y = 0
        obj.position.x = -center.x
        obj.position.z = -center.z
        obj.position.y = -bbox.min.y
        scene.add(obj)
        modelRef.current = obj

        const radius = Math.max(size.x, size.y, size.z) * 1.5
        camera.position.set(radius * 1.1, radius * 0.9, radius * 1.3)
        controls.target.set(0, size.y / 2, 0)
        controls.update()
        setLoading(false)
      }

      // If generated GLB preview exists, load it
      if (glbUrl) {
        const loader = new GLTFLoader()
        loader.load(
          `${glbUrl}?t=${Date.now()}`,
          (gltf) => {
            const root = gltf.scene
            // Filter nodes by viewMode if requested
            if (viewMode === 'base') {
              const lid = root.getObjectByName('Lid')
              if (lid) lid.visible = false
            } else if (viewMode === 'lid') {
              const base = root.getObjectByName('Base')
              if (base) base.visible = false
            }
            displayObject(root)
          },
          undefined,
          (err) => {
            console.error('Failed loading GLB', err)
            setLoading(false)
          }
        )
      } else if (originalFile) {
        // Load uploaded STL file before box is generated
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const loader = new STLLoader()
            const geom = loader.parse(e.target.result)
            geom.computeVertexNormals()
            geom.center() // Center vertex coordinates directly around local (0, 0, 0)
            geom.computeBoundingBox()
            const size = new THREE.Vector3()
            geom.boundingBox.getSize(size)

            let scaleFactor = 1.0
            const maxExtent = Math.max(size.x, size.y, size.z)
            if (maxExtent < 5.0) scaleFactor = 1000.0
            else if (maxExtent > 1500.0) scaleFactor = 0.1

            geom.scale(scaleFactor, scaleFactor, scaleFactor)
            geom.computeBoundingBox()

            const mat = new THREE.MeshStandardMaterial({
              color: 0x16A34A,
              roughness: 0.35,
              metalness: 0.1,
            })
            const mesh = new THREE.Mesh(geom, mat)
            const grp = new THREE.Group()
            grp.add(mesh)
            displayObject(grp)
          } catch (err) {
            console.error('Error loading STL:', err)
            setLoading(false)
          }
        }
        reader.readAsArrayBuffer(originalFile)
      } else {
        // Load sample model
        const loader = new STLLoader()
        loader.load(
          '/models/glass.stl',
          (geom) => {
            geom.computeVertexNormals()
            geom.center()
            geom.computeBoundingBox()
            const mat = new THREE.MeshStandardMaterial({
              color: 0x16A34A,
              roughness: 0.35,
              metalness: 0.1,
            })
            const mesh = new THREE.Mesh(geom, mat)
            const grp = new THREE.Group()
            grp.add(mesh)
            displayObject(grp)
          },
          undefined,
          () => setLoading(false)
        )
      }

      const animate = () => {
        if (disposed) return
        animationFrameId = requestAnimationFrame(animate)
        if (autoRotate && modelRef.current) {
          modelRef.current.rotation.y += 0.005
        }
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        if (!container || !renderer || !camera) return
        const width = container.clientWidth
        const height = container.clientHeight
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      }
      window.addEventListener('resize', onResize)

      return () => {
        window.removeEventListener('resize', onResize)
        cancelAnimationFrame(animationFrameId)
        renderer?.dispose()
      }
    }

    const clean = init()
    return () => {
      disposed = true
      clean.then(fn => fn && fn())
    }
  }, [glbUrl, originalFile, viewMode])

  return (
    <div style={{ position: 'relative', width: '100%', height: 340, borderRadius: 12, overflow: 'hidden', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <div ref={mountRef => (containerRef.current = mountRef)} style={{ width: '100%', height: '100%' }} />

      {/* Floating Controls */}
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
        <span>{glbUrl ? '3D Box Packaging (Base & Lid)' : 'Product Mesh Preview'}</span>
      </div>

      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className="btn-ghost"
          style={{
            padding: '5px 8px', fontSize: 11, background: autoRotate ? '#DCFCE7' : '#FFFFFF',
            borderColor: autoRotate ? '#86EFAC' : '#CBD5E1', color: autoRotate ? '#15803D' : '#475569', borderRadius: 6
          }}
        >
          Turntable
        </button>
        <button
          type="button"
          onClick={() => setWireframe(!wireframe)}
          className="btn-ghost"
          style={{
            padding: '5px 8px', fontSize: 11, background: wireframe ? '#DCFCE7' : '#FFFFFF',
            borderColor: wireframe ? '#86EFAC' : '#CBD5E1', color: wireframe ? '#15803D' : '#475569', borderRadius: 6
          }}
        >
          {wireframe ? 'Shaded' : 'Wireframe'}
        </button>
      </div>

      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(248, 250, 252, 0.85)', backdropFilter: 'blur(4px)', color: '#16A34A', fontSize: 13, gap: 8
        }}>
          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Rendering 3D Packaging Solids...</span>
        </div>
      )}
    </div>
  )
}

/* ─── Custom Box Panel Component ─────────────────────────────────────────── */
export default function CustomBoxPanel() {
  const [file, setFile] = useState(null)
  const [useSample, setUseSample] = useState(false)
  const [clearance, setClearance] = useState(2.0)
  const [wall, setWall] = useState(2.5)
  const [floor, setFloor] = useState(2.5)
  const [splitRatio, setSplitRatio] = useState(0.55)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('both') // 'both' | 'base' | 'lid'
  const [showCode, setShowCode] = useState(false)

  const inputRef = useRef(null)

  const handleSelectFile = (f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (['stl', 'obj', 'glb'].includes(ext)) {
      setFile(f)
      setUseSample(false)
      setError('')
    } else {
      setError(`Please upload a 3D model (.stl, .obj, .glb)`)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      if (file) {
        form.append('asset', file)
      }
      form.append('clearance_mm', String(clearance))
      form.append('wall_mm', String(wall))
      form.append('floor_mm', String(floor))
      form.append('split_pct', String(splitRatio))

      const res = await api.customBox(form)
      setResult(res)
    } catch (e) {
      setError(e.message || 'CAD kernel generation failed.')
    } finally {
      setLoading(false)
    }
  }

  const dims = result?.dimensions
  const metrics = result?.metrics

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      {/* Top Split Layout: 3D Product & Parameters (Left) vs 3D Box & Downloads (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 460px) minmax(420px, 1fr)',
        gap: 24,
        alignItems: 'start',
      }}>
        {/* ── LEFT CARD: 3D Product & CAD Kernel Parameters (WHITE CARD) ── */}
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
                  Custom CAD Box Generator
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                  Reform3d CAD kernel · Form-fitting Base + Lid
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => inputRef.current?.click()}
              style={{ fontSize: 12, padding: '6px 12px', background: '#F8FAFC', borderColor: '#CBD5E1', color: '#334155', borderRadius: 8 }}
            >
              <Upload size={13} style={{ marginRight: 6, display: 'inline' }} />
              Upload STL
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".stl,.obj,.glb"
              style={{ display: 'none' }}
              onChange={e => handleSelectFile(e.target.files[0])}
            />
          </div>

          {/* Interactive 3D Product Viewport */}
          <Box3DViewer
            glbUrl={null}
            originalFile={file}
            viewMode="product"
          />

          {/* Model Selection Indicator */}
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
                onClick={() => { setUseSample(true); setFile(null); }}
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
                <Sparkles size={12} /> Load Sample Model
              </button>
            )}
          </div>

          {/* Parametric CAD Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sliders size={15} color="#16A34A" /> CAD Kernel Packaging Parameters
            </div>

            {/* Clearance Cushion */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#475569' }}>Internal Cushion Clearance</span>
                <strong style={{ color: '#0F172A' }}>{clearance} mm</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.5"
                value={clearance}
                onChange={e => setClearance(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#16A34A' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8' }}>
                <span>1.0 mm (Tight fit)</span>
                <span>6.0 mm (Foam pad insert)</span>
              </div>
            </div>

            {/* Shell Wall Thickness */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#475569' }}>Shell Wall Thickness</span>
                <strong style={{ color: '#0F172A' }}>{wall} mm</strong>
              </div>
              <input
                type="range"
                min="1.5"
                max="5.0"
                step="0.5"
                value={wall}
                onChange={e => setWall(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#16A34A' }}
              />
            </div>

            {/* Split Height Ratio */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#475569' }}>Split Ratio (Base vs. Lid)</span>
                <strong style={{ color: '#0F172A' }}>{Math.round(splitRatio * 100)}% Base / {Math.round((1 - splitRatio) * 100)}% Lid</strong>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.8"
                step="0.05"
                value={splitRatio}
                onChange={e => setSplitRatio(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#16A34A' }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, fontSize: 12, color: '#B91C1C', display: 'flex', gap: 8, alignItems: 'center'
            }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Generate Button */}
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
                <span>Running CAD Kernel &amp; Synthesizing Solids...</span>
              </>
            ) : (
              <>
                <Box size={16} />
                <span>Generate Custom Base &amp; Lid Box</span>
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT CARD: 3D Box Packaging Viewport & STL Downloads (WHITE CARD) ── */}
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
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Box size={18} color="#16A34A" />
                <span>Custom Form-Fitting Box (Base &amp; Lid)</span>
                {result && (
                  <span style={{ fontSize: 11, padding: '2px 8px', background: '#DCFCE7', color: '#166534', borderRadius: 999, fontWeight: 600 }}>
                    {result.shape_type || 'Manifold 3D Solid'}
                  </span>
                )}
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                Non-cuboid packaging enclosure tailored to product shape with slip-fit interlock
              </p>
            </div>

            {result?.glb_preview_url && (
              <div style={{ display: 'flex', gap: 6 }}>
                {['both', 'base', 'lid'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid',
                      background: viewMode === mode ? '#DCFCE7' : '#FFFFFF',
                      borderColor: viewMode === mode ? '#86EFAC' : '#CBD5E1',
                      color: viewMode === mode ? '#15803D' : '#475569',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode === 'both' ? 'Both Parts' : `${mode} Only`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3D Box Interactive Viewer or Placeholder */}
          {result?.glb_preview_url ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Box3DViewer
                glbUrl={result.glb_preview_url}
                viewMode={viewMode}
              />

              {/* 3D Color Legend */}
              <div style={{
                display: 'flex',
                gap: 16,
                padding: '10px 14px',
                background: '#F8FAFC',
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                fontSize: 12,
                color: '#475569',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#16A34A', display: 'inline-block' }} />
                  <strong>Base Solid</strong> (with stepped interlock lip)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#3B82F6', display: 'inline-block' }} />
                  <strong>Lid Solid</strong> (with slip-fit receiving pocket)
                </span>
              </div>

              {/* STL Download Suite */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {result.base_stl_url && (
                  <a
                    href={result.base_stl_url}
                    download="custom_box_base.stl"
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
                    <Download size={13} /> Download Base (STL)
                  </a>
                )}

                {result.lid_stl_url && (
                  <a
                    href={result.lid_stl_url}
                    download="custom_box_lid.stl"
                    className="btn-primary"
                    style={{
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#2563EB',
                      color: '#FFFFFF',
                      borderRadius: 8,
                    }}
                  >
                    <Download size={13} /> Download Lid (STL)
                  </a>
                )}

                {result.assembled_stl_url && (
                  <a
                    href={result.assembled_stl_url}
                    download="custom_box_assembled.stl"
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
                    <Download size={13} /> Full Assembled (STL)
                  </a>
                )}

                {result.glb_preview_url && (
                  <a
                    href={result.glb_preview_url}
                    download="custom_box_preview.glb"
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
                    <Download size={13} /> 3D GLB Model
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
                <Box size={24} color="#16A34A" />
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Ready to Generate Form-Fitting Packaging Box
              </h4>
              <p style={{ fontSize: 12, color: '#64748B', maxWidth: 360, marginTop: 6 }}>
                Click <strong>"Generate Custom Base &amp; Lid Box"</strong>. The Reform3d CAD kernel processes the 3D product mesh contour and creates separate 3D printable STL models for the base and lid.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 3: LLM Shape Analysis & Design Rationale (WHITE CARD) ── */}
      {result && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#2563EB" />
                <span>AI Shape Analysis &amp; Packaging Architecture</span>
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                How the CAD kernel formed the non-cuboid envelope to eliminate packaging air void
              </p>
            </div>

            {result.cad_code && (
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="btn-ghost"
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#F8FAFC',
                  borderColor: '#CBD5E1',
                  color: '#334155',
                  borderRadius: 8,
                }}
              >
                <Code2 size={13} />
                <span>{showCode ? 'Hide CAD Code' : 'View Python CAD Script'}</span>
                {showCode ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>

          <div style={{
            padding: '14px 18px',
            background: '#F0FDF4',
            borderRadius: 10,
            border: '1px solid #BBF7D0',
            fontSize: 13,
            color: '#166534',
            lineHeight: 1.5,
          }}>
            <strong>Design Rationale:</strong> {result.rationale}
          </div>

          {/* 4 Telemetry Metrics */}
          {metrics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
              <div style={{ padding: '14px 18px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Void Reduction
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A', marginTop: 4 }}>
                  -{metrics.void_reduction_pct}%
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  vs. standard cuboid box
                </div>
              </div>

              <div style={{ padding: '14px 18px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Base Part Volume
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                  {metrics.base_volume_cm3} cm³
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  Solid 3D printed volume
                </div>
              </div>

              <div style={{ padding: '14px 18px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Lid Part Volume
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                  {metrics.lid_volume_cm3} cm³
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  Solid 3D printed volume
                </div>
              </div>

              <div style={{ padding: '14px 18px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Est. Material Mass
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>
                  {metrics.material_mass_grams} g
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  ~{metrics.est_print_time_mins} min print time
                </div>
              </div>
            </div>
          )}

          {/* Expandable CAD Python Source Drawer */}
          {showCode && result.cad_code && (
            <div style={{
              background: '#0F172A',
              color: '#E2E8F0',
              borderRadius: 10,
              padding: 16,
              fontSize: 12,
              fontFamily: '"JetBrains Mono", Consolas, monospace',
              overflowX: 'auto',
              maxHeight: 340,
            }}>
              <pre style={{ margin: 0 }}>{result.cad_code}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
