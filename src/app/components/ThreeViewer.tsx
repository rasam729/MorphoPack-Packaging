import { useEffect, useRef } from "react"
import * as THREE from "three"

export type ViewportMode = "rotate" | "move" | "scale"
export type PackageType = "carton" | "sleeve" | "insert"

type ViewerProps = {
  dimensions: { width: number height: number depth: number }
  clearance: number
  thickness: number
  mode: ViewportMode
  packageType: PackageType
  wireframe: boolean
}

export function ThreeViewer({
  dimensions,
  clearance,
  thickness,
  mode,
  packageType,
  wireframe,
}: ViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(4.8, 3.5, 6.8)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xe8fff0, 0x15231d, 2.5))
    const key = new THREE.DirectionalLight(0xffffff, 3.2)
    key.position.set(4, 7, 5)
    key.castShadow = true
    scene.add(key)

    const group = new THREE.Group()
    group.rotation.set(-0.18, -0.55, 0)
    scene.add(group)

    const scale = 0.025
    const productSize = new THREE.Vector3(
      dimensions.width * scale,
      dimensions.height * scale,
      dimensions.depth * scale,
    )
    const productGeometry = new THREE.BoxGeometry(
      productSize.x,
      productSize.y,
      productSize.z,
      3,
      3,
      3,
    )
    const productMaterial = new THREE.MeshStandardMaterial({
      color: 0x18231f,
      metalness: 0.18,
      roughness: 0.3,
    })
    const product = new THREE.Mesh(productGeometry, productMaterial)
    product.castShadow = true
    group.add(product)

    const outer = productSize
      .clone()
      .addScalar((clearance + thickness) * scale * 2)
    if (packageType === "sleeve")
      outer.y = productSize.y + clearance * scale * 2
    if (packageType === "insert") outer.x += 0.5

    const packageGeometry = new THREE.BoxGeometry(outer.x, outer.y, outer.z)
    const packageMaterial = new THREE.MeshPhysicalMaterial({
      color:
        packageType === "carton"
          ? 0xbca57e
          : packageType === "sleeve"
            ? 0x9fc69c
            : 0xcbbf9f,
      transparent: true,
      opacity: wireframe ? 0.08 : 0.26,
      roughness: 0.7,
      transmission: wireframe ? 0 : 0.12,
      side: THREE.DoubleSide,
    })
    const packaging = new THREE.Mesh(packageGeometry, packageMaterial)
    group.add(packaging)

    const edgeGeometry = new THREE.EdgesGeometry(packageGeometry)
    const edges = new THREE.LineSegments(
      edgeGeometry,
      new THREE.LineBasicMaterial({
        color: 0x54d795,
        transparent: true,
        opacity: 0.92,
      }),
    )
    group.add(edges)

    if (packageType === "insert") {
      const ringGeometry = new THREE.TorusGeometry(
        Math.min(outer.x, outer.z) * 0.25,
        0.05,
        8,
        32,
      )
      const ring = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshStandardMaterial({ color: 0xc5b184, roughness: 0.9 }),
      )
      ring.rotation.x = Math.PI / 2
      ring.position.y = -outer.y / 2 + 0.12
      group.add(ring)
    }

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({
        color: 0x17261f,
        transparent: true,
        opacity: 0.26,
        roughness: 1,
      }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -outer.y / 2 - 0.25
    floor.receiveShadow = true
    scene.add(floor)

    const grid = new THREE.GridHelper(14, 22, 0x36664f, 0x233d32)
    grid.position.y = floor.position.y + 0.01
    scene.add(grid)

    let dragging = false
    let previous = { x: 0, y: 0 }
    let scaleValue = 1

    const onPointerDown = (event: PointerEvent) => {
      dragging = true
      previous = { x: event.clientX, y: event.clientY }
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      const dx = event.clientX - previous.x
      const dy = event.clientY - previous.y
      if (mode === "rotate") {
        group.rotation.y += dx * 0.008
        group.rotation.x += dy * 0.008
      } else if (mode === "move") {
        group.position.x += dx * 0.006
        group.position.y -= dy * 0.006
      } else {
        scaleValue = Math.max(0.55, Math.min(1.7, scaleValue + dy * -0.006))
        group.scale.setScalar(scaleValue)
      }
      previous = { x: event.clientX, y: event.clientY }
    }
    const onPointerUp = () => {
      dragging = false
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      camera.position.multiplyScalar(event.deltaY > 0 ? 1.06 : 0.94)
      camera.position.clampLength(4, 12)
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown)
    renderer.domElement.addEventListener("pointermove", onPointerMove)
    renderer.domElement.addEventListener("pointerup", onPointerUp)
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false })

    const resize = () => {
      const { clientWidth, clientHeight } = mount
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / Math.max(clientHeight, 1)
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    let animationFrame = 0
    const animate = () => {
      animationFrame = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      renderer.domElement.removeEventListener("pointerdown", onPointerDown)
      renderer.domElement.removeEventListener("pointermove", onPointerMove)
      renderer.domElement.removeEventListener("pointerup", onPointerUp)
      renderer.domElement.removeEventListener("wheel", onWheel)
      productGeometry.dispose()
      productMaterial.dispose()
      packageGeometry.dispose()
      packageMaterial.dispose()
      edgeGeometry.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [
    clearance,
    dimensions.depth,
    dimensions.height,
    dimensions.width,
    mode,
    packageType,
    thickness,
    wireframe,
  ])

  return (
    <div
      className="three-viewer"
      ref={mountRef}
      aria-label="Interactive 3D package fit preview"
    />
  )
}
