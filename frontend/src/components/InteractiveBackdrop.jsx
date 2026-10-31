import React, { useEffect, useRef } from 'react'

export default function InteractiveBackdrop() {
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !image) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = { x: -1000, y: -1000 }
    let nodes = []
    let frameId
    let width = 0
    let height = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      const count = Math.min(64, Math.floor((width * height) / 22000))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 1 + Math.random() * 1.3,
      }))
      draw()
    }

    const movePointer = (event) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      if (!reducedMotion) {
        const x = (event.clientX / Math.max(width, 1) - 0.5) * -24
        const y = (event.clientY / Math.max(height, 1) - 0.5) * -18
        image.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.04)`
      }
    }

    const pushNodes = (event) => {
      nodes.forEach((node) => {
        const dx = node.x - event.clientX
        const dy = node.y - event.clientY
        const distance = Math.hypot(dx, dy) || 1
        if (distance < 220) {
          node.vx += (dx / distance) * 2.2
          node.vy += (dy / distance) * 2.2
        }
      })
    }

    function draw() {
      context.clearRect(0, 0, width, height)
      nodes.forEach((node) => {
        if (!reducedMotion) {
          const dx = node.x - pointer.x
          const dy = node.y - pointer.y
          const distance = Math.hypot(dx, dy) || 1
          if (distance < 140) {
            node.vx += (dx / distance) * 0.035
            node.vy += (dy / distance) * 0.035
          }
          node.vx *= 0.985
          node.vy *= 0.985
          node.x = (node.x + node.vx + width) % width
          node.y = (node.y + node.vy + height) % height
        }
      })

      nodes.forEach((node, index) => {
        nodes.slice(index + 1).forEach((other) => {
          const distance = Math.hypot(node.x - other.x, node.y - other.y)
          if (distance < 130) {
            context.strokeStyle = `rgba(46, 125, 80, ${0.22 * (1 - distance / 130)})`
            context.beginPath()
            context.moveTo(node.x, node.y)
            context.lineTo(other.x, other.y)
            context.stroke()
          }
        })
        const distance = Math.hypot(node.x - pointer.x, node.y - pointer.y)
        if (distance < 180) {
          context.strokeStyle = `rgba(31, 77, 58, ${0.4 * (1 - distance / 180)})`
          context.beginPath()
          context.moveTo(node.x, node.y)
          context.lineTo(pointer.x, pointer.y)
          context.stroke()
        }
        context.fillStyle = 'rgba(46, 125, 80, .55)'
        context.beginPath()
        context.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        context.fill()
      })

      if (!reducedMotion) frameId = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', movePointer, { passive: true })
    window.addEventListener('pointerdown', pushNodes, { passive: true })

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', movePointer)
      window.removeEventListener('pointerdown', pushNodes)
    }
  }, [])

  return (
    <div className="studio-interactive-background" aria-hidden="true">
      <div className="studio-background-image" ref={imageRef}/>
      <canvas className="studio-background-particles" ref={canvasRef}/>
    </div>
  )
}
