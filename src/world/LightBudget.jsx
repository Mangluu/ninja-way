import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Three.js forward-renders: every visible point light is evaluated for every lit
// fragment. Lighting all 14 lanterns plus the project waypoints and the gate put
// 26 point lights in the scene, which multiplies the cost of the toon shader for
// lights you often cannot even see.
//
// Only the nearest few actually matter, so this keeps those enabled and switches
// the rest off. An invisible light is skipped entirely when the renderer walks
// the scene, so it costs nothing.
export default function LightBudget({ max = 7 }) {
  const { scene, camera } = useThree()
  const lights = useRef([])
  const frame = useRef(0)
  const v = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    // Re-collect occasionally — lanterns light up over time, so the set grows.
    if (frame.current++ % 30 === 0) {
      const found = []
      scene.traverse((o) => { if (o.isPointLight) found.push(o) })
      lights.current = found
    }
    const arr = lights.current
    if (arr.length <= max) { for (const l of arr) l.visible = true; return }

    for (const l of arr) l.userData._d = l.getWorldPosition(v).distanceToSquared(camera.position)
    arr.sort((a, b) => a.userData._d - b.userData._d)
    for (let i = 0; i < arr.length; i++) arr[i].visible = i < max
  })

  return null
}
