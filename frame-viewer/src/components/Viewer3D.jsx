import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import './Viewer3D.css'

export default function Viewer3D({ data, onBack }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a1a)

    const width = container.clientWidth
    const height = container.clientHeight
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100000)
    camera.position.set(0, 0, 100)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(50, 50, 50)
    scene.add(dirLight)

    scene.add(new THREE.GridHelper(500, 50, 0x444444, 0x222222))
    scene.add(new THREE.AxesHelper(50))

    // Build grid lookup map
    const gridMap = {}
    if (data.grids) {
      data.grids.forEach(g => { gridMap[g.id] = g })
    }

    // Points for grids
    if (data.grids && data.grids.length > 0) {
      const positions = new Float32Array(data.grids.length * 3)
      data.grids.forEach((g, i) => {
        positions[i * 3] = g.x
        positions[i * 3 + 1] = g.y
        positions[i * 3 + 2] = g.z
      })
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.PointsMaterial({ color: 0x00aaff, size: 3, sizeAttenuation: true })
      scene.add(new THREE.Points(geom, mat))
    }

    // Lines for elements
    if (data.elements && data.elements.length > 0) {
      const linePositions = []
      data.elements.forEach(elem => {
        const sg = gridMap[elem.start_grid]
        const eg = gridMap[elem.end_grid]
        if (sg && eg) {
          linePositions.push(sg.x, sg.y, sg.z, eg.x, eg.y, eg.z)
        }
      })
      if (linePositions.length > 0) {
        const geom = new THREE.BufferGeometry()
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3))
        const mat = new THREE.LineBasicMaterial({ color: 0xff6644 })
        scene.add(new THREE.LineSegments(geom, mat))
      }
    }

    // Fit camera to model bounds
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 1)
    const fov = camera.fov * (Math.PI / 180)
    const camDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8
    camera.position.copy(center)
    camera.position.z += camDist
    camera.near = camDist / 1000
    camera.far = camDist * 100
    camera.lookAt(center)
    camera.updateProjectionMatrix()

    const sceneCenter = center.clone()

    // Interaction state
    const state = {
      isDragging: false,
      prevMouse: { x: 0, y: 0 },
      rotX: 0,
      rotY: 0,
      touchStartDist: 0,
    }

    function rotate(dx, dy) {
      state.rotY += dx * 0.01
      state.rotX += dy * 0.01
      state.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.rotX))

      const q = new THREE.Quaternion()
      q.setFromEuler(new THREE.Euler(state.rotX, state.rotY, 0, 'YXZ'))
      const offset = camera.position.clone().sub(sceneCenter)
      const dist = offset.length()
      const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(q)
      camera.position.copy(sceneCenter).addScaledVector(dir, dist)
      camera.lookAt(sceneCenter)
    }

    function zoom(factor) {
      const dir = camera.position.clone().sub(sceneCenter)
      const dist = dir.length()
      const newDist = Math.max(camDist * 0.01, dist * factor)
      dir.setLength(newDist)
      camera.position.copy(sceneCenter).add(dir)
      camera.lookAt(sceneCenter)
    }

    // Mouse handlers
    const onMouseDown = (e) => {
      state.isDragging = true
      state.prevMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e) => {
      if (!state.isDragging) return
      rotate(e.clientX - state.prevMouse.x, e.clientY - state.prevMouse.y)
      state.prevMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => { state.isDragging = false }
    const onWheel = (e) => {
      e.preventDefault()
      zoom(e.deltaY > 0 ? 1.1 : 0.9)
    }

    // Touch handlers
    const onTouchStart = (e) => {
      e.preventDefault()
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        state.touchStartDist = Math.sqrt(dx * dx + dy * dy)
        state.isDragging = false
      } else if (e.touches.length === 1) {
        state.isDragging = true
        state.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
    const onTouchMove = (e) => {
      e.preventDefault()
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        zoom(dist > state.touchStartDist ? 0.95 : 1.05)
        state.touchStartDist = dist
      } else if (e.touches.length === 1 && state.isDragging) {
        rotate(e.touches[0].clientX - state.prevMouse.x, e.touches[0].clientY - state.prevMouse.y)
        state.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
    const onTouchEnd = () => { state.isDragging = false }

    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false })
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false })
    renderer.domElement.addEventListener('touchend', onTouchEnd)
    window.addEventListener('resize', onResize)

    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      renderer.domElement.removeEventListener('touchstart', onTouchStart)
      renderer.domElement.removeEventListener('touchmove', onTouchMove)
      renderer.domElement.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('resize', onResize)
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) obj.material.dispose()
      })
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [data])

  return (
    <div className="viewer3d">
      <div className="viewer-sidebar">
        <div className="stats-panel">
          <h3>Model Info</h3>
          <div className="stat"><span>Format</span><span>{data.format}</span></div>
          <div className="stat"><span>Grids</span><span>{data.grids?.length ?? 0}</span></div>
          <div className="stat"><span>Elements</span><span>{data.elements?.length ?? 0}</span></div>
          <div className="stat"><span>Properties</span><span>{data.properties?.length ?? 0}</span></div>
          <div className="stat"><span>Materials</span><span>{data.materials?.length ?? 0}</span></div>
        </div>
        <div className="legend">
          <div className="legend-item"><span className="dot dot-blue" />Grids (nodes)</div>
          <div className="legend-item"><span className="dot dot-orange" />Elements (members)</div>
        </div>
        <div className="controls-hint">
          <p>Drag to rotate</p>
          <p>Wheel to zoom</p>
          <p>1 finger: rotate</p>
          <p>2 fingers: pinch zoom</p>
        </div>
        <button className="btn-back" onClick={onBack}>← Back</button>
      </div>
      <div className="viewer-canvas" ref={containerRef} />
    </div>
  )
}
