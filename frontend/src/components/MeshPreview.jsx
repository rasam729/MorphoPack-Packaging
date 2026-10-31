import React, { useEffect, useRef, useState } from 'react'
import { Download, Box, Maximize2, Rotate3D } from 'lucide-react'

export default function MeshPreview({
  glbUrl,
  meshFile,
  loading,
  dimensions,
  baseDimensions,
  visualScale = 1,
  fitClearance = 3,
  materialThickness = 1.5,
}) {
  const hostRef = useRef(null)
  const fitCameraRef = useRef(() => {})
  const cameraRef = useRef(null)
  const modelRef = useRef(null)
  const baselineRef = useRef(null)
  const fitOutlineRef = useRef(null)
  const updateFitOutlineRef = useRef(() => {})
  const liveParametersRef = useRef(null)
  liveParametersRef.current = { dimensions, fitClearance, materialThickness, visualScale }
  const [viewerError, setViewerError] = useState('')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    setViewerError('')
    let disposed = false
    let cleanup = () => {}

    const initialize = async () => {
      const [
        THREE,
        { OrbitControls },
        { GLTFLoader },
        { OBJLoader },
      ] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/loaders/OBJLoader.js'),
      ])
      if (disposed) return

      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#f6f8f6')
      const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000)
      cameraRef.current = camera
      camera.position.set(2.8, 2.2, 3.2)
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.15
      host.appendChild(renderer.domElement)

      scene.add(new THREE.HemisphereLight('#ffffff', '#b8c2ba', 2.1))
      const keyLight = new THREE.DirectionalLight('#ffffff', 2.4)
      keyLight.position.set(4, 6, 5)
      scene.add(keyLight)
      const fillLight = new THREE.DirectionalLight('#ffffff', 1.1)
      fillLight.position.set(-4, 2, -3)
      scene.add(fillLight)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.screenSpacePanning = true
      let model
      let fitCamera = () => {}

      const fitModel = (object) => {
        if (disposed) return
        const centered = new THREE.Group()
        centered.add(object)
        centered.updateWorldMatrix(true, true)
        const bounds = new THREE.Box3().setFromObject(centered)
        const center = bounds.getCenter(new THREE.Vector3())
        const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius
        if (!Number.isFinite(radius) || radius <= 0 || !center.toArray().every(Number.isFinite)) {
          setViewerError('The mesh has no visible geometry.')
          return
        }

        centered.position.sub(center)
        scene.add(centered)
        model = centered
        modelRef.current = centered
        const modelSize = bounds.getSize(new THREE.Vector3())
        baselineRef.current = {
          length: Number(baseDimensions?.length_mm) || Number(dimensions?.length_mm) || Math.max(modelSize.x, 1e-8),
          width: Number(baseDimensions?.width_mm) || Number(dimensions?.width_mm) || Math.max(modelSize.y, 1e-8),
          height: Number(baseDimensions?.height_mm) || Number(dimensions?.height_mm) || Math.max(modelSize.z, 1e-8),
        }
        centered.scale.set(
          Number(dimensions?.length_mm || baselineRef.current.length) / baselineRef.current.length,
          Number(dimensions?.width_mm || baselineRef.current.width) / baselineRef.current.width,
          Number(dimensions?.height_mm || baselineRef.current.height) / baselineRef.current.height,
        )
        const fitOutline = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
          new THREE.LineBasicMaterial({ color: '#b73870', transparent: true, opacity: 0.78 }),
        )
        scene.add(fitOutline)
        fitOutlineRef.current = fitOutline
        const updateFitOutline = () => {
          const liveParameters = liveParametersRef.current
          const liveDimensions = liveParameters?.dimensions
          const modelBounds = new THREE.Box3().setFromObject(centered)
          const modelSize = modelBounds.getSize(new THREE.Vector3())
          const unitsPerMm = modelSize.x / Math.max(Number(liveDimensions?.length_mm) || 1, 1e-8)
          const totalAllowance = 2 * (
            (liveParameters?.fitClearance || 0) + (liveParameters?.materialThickness || 0)
          ) * unitsPerMm
          const expandedSize = modelSize.addScalar(totalAllowance)
          const previousGeometry = fitOutline.geometry
          fitOutline.geometry = new THREE.EdgesGeometry(
            new THREE.BoxGeometry(expandedSize.x, expandedSize.y, expandedSize.z),
          )
          previousGeometry.dispose()
        }
        updateFitOutlineRef.current = updateFitOutline
        updateFitOutline()
        controls.target.set(0, 0, 0)
        fitCamera = () => {
          const currentBounds = new THREE.Box3().setFromObject(centered)
          currentBounds.expandByObject(fitOutline)
          const currentRadius = currentBounds.getBoundingSphere(new THREE.Sphere()).radius
          const safeRadius = Math.max(currentRadius, 1e-6)
          const verticalFov = THREE.MathUtils.degToRad(camera.fov)
          const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
          const fitFov = Math.max(0.01, Math.min(verticalFov, horizontalFov))
          const distance = (safeRadius / Math.sin(fitFov / 2)) * 1.3
          const direction = camera.position.clone().sub(controls.target).normalize()
          camera.near = Math.max(safeRadius / 100_000, 1e-7)
          camera.far = Math.max(safeRadius * 1000, distance * 10)
          camera.updateProjectionMatrix()
          camera.zoom = liveParametersRef.current?.visualScale || 1
          camera.updateProjectionMatrix()
          camera.position.copy(controls.target).addScaledVector(direction, distance)
          controls.minDistance = Math.max(safeRadius * 0.005, 1e-8)
          controls.maxDistance = Math.max(safeRadius * 200, distance * 20)
          controls.update()
        }
        fitCameraRef.current = fitCamera
        fitCamera()
      }

      const createStlGeometry = (buffer) => {
        const bytes = new Uint8Array(buffer)
        const view = new DataView(buffer)
        const declaredFaces = bytes.length >= 84 ? view.getUint32(80, true) : 0
        const expectedLength = 84 + declaredFaces * 50
        const header = new TextDecoder().decode(bytes.subarray(0, Math.min(256, bytes.length)))
        const isAsciiStl = /^\s*solid\b/i.test(header) && /\bfacet\s+normal\b/i.test(header)
        const isBinary = declaredFaces > 0
          && expectedLength <= bytes.length
          && !isAsciiStl
        const vertices = []
        const appendTriangle = (triangle) => {
          const [a, b, c] = triangle
          if (!triangle.flat().every(Number.isFinite)) return
          const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
          const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
          const cross = [
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0],
          ]
          if (cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2 <= 1e-30) return
          vertices.push(...a, ...b, ...c)
        }

        if (isBinary) {
          for (let face = 0; face < declaredFaces; face += 1) {
            const offset = 84 + face * 50 + 12
            const triangle = []
            for (let vertex = 0; vertex < 3; vertex += 1) {
              const vertexOffset = offset + vertex * 12
              triangle.push([
                view.getFloat32(vertexOffset, true),
                view.getFloat32(vertexOffset + 4, true),
                view.getFloat32(vertexOffset + 8, true),
              ])
            }
            appendTriangle(triangle)
          }
        } else {
          const text = new TextDecoder().decode(buffer)
          const vertexPattern = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/gi
          let match
          let triangle = []
          while ((match = vertexPattern.exec(text)) !== null) {
            triangle.push([Number(match[1]), Number(match[2]), Number(match[3])])
            if (triangle.length === 3) {
              appendTriangle(triangle)
              triangle = []
            }
          }
        }

        if (vertices.length === 0) {
          throw new Error('No valid triangles found. Check that the STL is complete and contains non-degenerate facets.')
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        geometry.computeVertexNormals()
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()
        return geometry
      }

      const loadFromFile = async () => {
        if (!meshFile) return
        const bytes = await meshFile.arrayBuffer()
        if (disposed) return
        const extension = meshFile.name.split('.').pop()?.toLowerCase()

        if (extension === 'stl') {
          const geometry = createStlGeometry(bytes)
          fitModel(new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
              color: '#cbd3c9',
              roughness: 0.72,
              metalness: 0.02,
              flatShading: true,
            }),
          ))
          return
        }

        if (extension === 'obj') {
          fitModel(new OBJLoader().parse(new TextDecoder().decode(bytes)))
          return
        }

        throw new Error('Choose an STL or OBJ mesh to preview.')
      }

      if (glbUrl) {
        new GLTFLoader().load(
          glbUrl,
          (gltf) => fitModel(gltf.scene),
          undefined,
          (error) => {
            if (!disposed && meshFile) {
              loadFromFile().catch((fallbackError) => {
                if (!disposed) {
                  setViewerError(`Could not load the generated GLB or source mesh: ${error.message}; ${fallbackError.message}`)
                }
              })
            } else if (!disposed) {
              setViewerError(`Could not load the generated GLB: ${error.message}`)
            }
          },
        )
      } else if (meshFile) {
        loadFromFile().catch((error) => {
          if (!disposed) setViewerError(`Could not load ${meshFile.name}: ${error.message}`)
        })
      }

      const resize = () => {
        if (!host.clientWidth || !host.clientHeight) return
        camera.aspect = host.clientWidth / host.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(host.clientWidth, host.clientHeight)
      }
      const resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(host)
      resize()

      let frameId
      const render = () => {
        if (disposed) return
        frameId = window.requestAnimationFrame(render)
        controls.update()
        renderer.render(scene, camera)
      }
      render()

      cleanup = () => {
        fitCameraRef.current = () => {}
        cameraRef.current = null
        modelRef.current = null
        baselineRef.current = null
        updateFitOutlineRef.current = () => {}
        window.cancelAnimationFrame(frameId)
        resizeObserver.disconnect()
        controls.dispose()
        if (model) {
          model.traverse((child) => {
            if (!child.isMesh) return
            child.geometry.dispose()
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((material) => material.dispose())
          })
        }
        if (fitOutlineRef.current) {
          fitOutlineRef.current.geometry.dispose()
          fitOutlineRef.current.material.dispose()
          fitOutlineRef.current.removeFromParent()
          fitOutlineRef.current = null
        }
        renderer.dispose()
        renderer.domElement.remove()
      }
    }

    initialize().catch((error) => {
      if (!disposed) setViewerError(`3D preview is unavailable: ${error.message}`)
    })

    return () => {
      disposed = true
      cleanup()
    }
  }, [glbUrl, meshFile])

  useEffect(() => {
    const model = modelRef.current
    const baseline = baselineRef.current
    if (!model || !baseline || !dimensions) return
    model.scale.set(
      Number(dimensions.length_mm) / Math.max(baseline.length, 1e-8),
      Number(dimensions.width_mm) / Math.max(baseline.width, 1e-8),
      Number(dimensions.height_mm) / Math.max(baseline.height, 1e-8),
    )
    updateFitOutlineRef.current()
    fitCameraRef.current()
  }, [dimensions, baseDimensions, fitClearance, materialThickness])

  useEffect(() => {
    const camera = cameraRef.current
    if (!camera) return
    camera.zoom = visualScale
    camera.updateProjectionMatrix()
  }, [visualScale])

  const handleDownload = () => {
    if (!glbUrl) return
    const link = document.createElement('a')
    link.href = glbUrl
    link.download = 'morphopack-preview.glb'
    link.click()
  }

  return (
    <section className="studio-viewer">
      <header className="studio-viewer-toolbar">
        <div>
          <strong>{glbUrl ? 'Processed 3D mesh' : '3D mesh preview'}</strong>
          <span className="studio-viewer-hint"><Rotate3D size={13}/> Drag to rotate · scroll to zoom</span>
        </div>
        <div className="studio-viewer-actions">
          <button className="studio-icon-button" onClick={() => fitCameraRef.current()} title="Fit model to view">
            <Maximize2 size={15}/>
          </button>
          <button className="studio-button studio-button-secondary" onClick={handleDownload} disabled={!glbUrl || loading}>
            <Download size={14}/> Download GLB
          </button>
        </div>
      </header>
      <div className="studio-canvas" ref={hostRef}>
        {!meshFile && !glbUrl && !loading && (
          <div className="studio-empty-viewer">
            <Box size={34}/>
            <strong>Your 3D preview will appear here</strong>
            <span>Upload an STL or OBJ file to inspect it interactively.</span>
          </div>
        )}
        {loading && <div className="studio-viewer-status">Generating your 3D preview…</div>}
        {viewerError && <div className="studio-viewer-error" role="alert">{viewerError}</div>}
      </div>
    </section>
  )
}
