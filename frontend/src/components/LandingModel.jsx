import { useEffect, useRef, useState } from 'react'
import { Rotate3D } from 'lucide-react'

export default function LandingModel() {
  const hostRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    let disposed = false
    let frameId
    let renderer
    let controls
    let geometry
    let material
    let resizeObserver

    const initialize = async () => {
      try {
        const [THREE, { OrbitControls }, { STLLoader }] = await Promise.all([
          import('three'),
          import('three/addons/controls/OrbitControls.js'),
          import('three/addons/loaders/STLLoader.js'),
        ])
        if (disposed) return

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100)
        camera.position.set(3.2, 2.2, 4)
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.25
        host.appendChild(renderer.domElement)

        scene.add(new THREE.HemisphereLight('#e9fff0', '#163528', 2.4))
        const keyLight = new THREE.DirectionalLight('#ffffff', 3)
        keyLight.position.set(4, 6, 4)
        scene.add(keyLight)
        const rimLight = new THREE.DirectionalLight('#44e69a', 3)
        rimLight.position.set(-4, 2, -3)
        scene.add(rimLight)

        const loader = new STLLoader()
        geometry = await new Promise((resolve, reject) => {
          loader.load('/models/glass.stl', resolve, undefined, reject)
        })
        if (disposed) {
          geometry.dispose()
          return
        }
        geometry.computeVertexNormals()
        geometry.center()
        const bounds = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position)
        const size = bounds.getSize(new THREE.Vector3())
        const largestSide = Math.max(size.x, size.y, size.z)
        if (!Number.isFinite(largestSide) || largestSide <= 0) {
          throw new Error('The sample glass model has no measurable geometry.')
        }
        geometry.scale(2.5 / largestSide, 2.5 / largestSide, 2.5 / largestSide)
        material = new THREE.MeshPhysicalMaterial({
          color: '#91d9b4',
          metalness: 0.12,
          roughness: 0.2,
          transmission: 0.22,
          thickness: 0.45,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        })
        const model = new THREE.Mesh(geometry, material)
        scene.add(model)

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.7, 0.006, 8, 160),
          new THREE.MeshBasicMaterial({ color: '#53d994', transparent: true, opacity: 0.5 }),
        )
        ring.rotation.x = Math.PI / 2.7
        scene.add(ring)

        controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.06
        controls.minDistance = 2.5
        controls.maxDistance = 8
        controls.autoRotate = true
        controls.autoRotateSpeed = 1.15

        const resize = () => {
          const { width, height } = host.getBoundingClientRect()
          if (!width || !height) return
          renderer.setSize(width, height)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
        }
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(host)
        resize()

        const animate = () => {
          if (disposed) return
          frameId = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()
      } catch (loadError) {
        if (!disposed) setError(`Could not load the sample 3D model: ${loadError.message}`)
      }
    }

    initialize()
    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
      controls?.dispose()
      geometry?.dispose()
      material?.dispose()
      renderer?.dispose()
      if (renderer?.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="landing-model-card">
      <div className="landing-model-head">
        <span className="landing-model-indicator"><i/> LIVE 3D PREVIEW</span>
        <span className="landing-model-format">STL · 360°</span>
      </div>
      <div className="landing-model-canvas" ref={hostRef} aria-label="Interactive rotating glass STL preview">
        {error && <span className="landing-model-error" role="status">{error}</span>}
      </div>
      <div className="landing-model-caption">
        <div><strong>Glass vessel</strong><span>Drag to rotate · scroll to zoom</span></div>
        <Rotate3D size={18}/>
      </div>
    </div>
  )
}
