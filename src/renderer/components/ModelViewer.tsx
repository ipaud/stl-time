import { useEffect, useRef } from 'react'
import {
  AmbientLight,
  Box3,
  type BufferGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './model-viewer.css'

const BACKGROUND = new Color('#151517')
const GRID_COLOR = new Color('#2c2c31')

interface Props {
  readonly geometry: BufferGeometry | null
}

/**
 * Display only: orbit, zoom and pan. No gizmos, no transforms — the model is
 * shown exactly as it will be sliced.
 */
export function ModelViewer({ geometry }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const meshRef = useRef<Mesh | null>(null)
  const sceneRef = useRef<Scene | null>(null)
  const cameraRef = useRef<PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new Scene()
    scene.background = BACKGROUND

    const camera = new PerspectiveCamera(38, 1, 0.1, 5000)
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    scene.add(new AmbientLight(0xffffff, 1.6))

    const key = new DirectionalLight(0xffffff, 2.1)
    key.position.set(1, 1.4, 1)
    scene.add(key)

    const fill = new DirectionalLight(0xffffff, 0.7)
    fill.position.set(-1, 0.3, -0.8)
    scene.add(fill)

    const grid = new GridHelper(400, 40, GRID_COLOR, GRID_COLOR)
    grid.material.transparent = true
    grid.material.opacity = 0.35
    scene.add(grid)

    sceneRef.current = scene
    cameraRef.current = camera
    controlsRef.current = controls

    let frame = 0
    const tick = (): void => {
      frame = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    const resize = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = container
      if (clientWidth === 0 || clientHeight === 0) return
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight, false)
    })
    resize.observe(container)

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      controls.dispose()
      grid.geometry.dispose()
      grid.material.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
      sceneRef.current = null
      cameraRef.current = null
      controlsRef.current = null
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!scene || !camera || !controls) return

    // Drop the previous model's GPU resources before showing the new one.
    const previous = meshRef.current
    if (previous) {
      scene.remove(previous)
      previous.geometry.dispose()
      ;(previous.material as MeshStandardMaterial).dispose()
      meshRef.current = null
    }

    if (!geometry) return

    const material = new MeshStandardMaterial({
      color: 0xb9bcc4,
      roughness: 0.62,
      metalness: 0.05,
      flatShading: false,
    })

    geometry.computeVertexNormals()
    const mesh = new Mesh(geometry, material)

    // STLs are authored Z-up; the viewer is Y-up.
    mesh.rotation.x = -Math.PI / 2
    mesh.updateMatrixWorld(true)

    // Centre on X/Z and rest on the grid, matching --ensure-on-bed at slice time.
    const box = new Box3().setFromObject(mesh)
    const centre = box.getCenter(new Vector3())
    mesh.position.set(-centre.x, -box.min.y, -centre.z)
    mesh.updateMatrixWorld(true)

    scene.add(mesh)
    meshRef.current = mesh

    frameCamera(camera, controls, new Box3().setFromObject(mesh))
  }, [geometry])

  return <div className="viewer" ref={containerRef} aria-label="3D preview of the loaded model" />
}

function frameCamera(camera: PerspectiveCamera, controls: OrbitControls, box: Box3): void {
  const size = box.getSize(new Vector3())
  const centre = box.getCenter(new Vector3())
  const radius = Math.max(size.length() / 2, 1)
  const distance = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.15

  camera.position.set(centre.x + distance * 0.62, centre.y + distance * 0.5, centre.z + distance)
  camera.near = Math.max(distance / 500, 0.05)
  camera.far = distance * 20
  camera.updateProjectionMatrix()

  controls.target.copy(centre)
  controls.update()
}
