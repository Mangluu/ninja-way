import { useMemo } from 'react'
import * as THREE from 'three'
import { C } from '../data/content'
import { gradientMap } from '../lib/toon'
import { stone } from '../lib/materials'

// The 14 path lanterns are identical apart from whether they are lit. Drawn as
// individual meshes that is ~84 draw calls; the stone body is the same shape
// every time, so each part becomes one instanced mesh instead. Only the paper
// light box stays per-lantern, because that is what changes when one is lit.
const PARTS = [
  { geo: (t) => new THREE.CylinderGeometry(0.34, 0.4, 0.24, 8), y: 0.12, color: C.stone },
  { geo: () => new THREE.CylinderGeometry(0.12, 0.14, 0.7, 8), y: 0.55, color: C.stone },
  { geo: () => new THREE.CylinderGeometry(0.3, 0.26, 0.14, 8), y: 0.98, color: C.stoneDark },
  { geo: () => new THREE.ConeGeometry(0.44, 0.34, 4), y: 1.5, color: C.stoneDark, rotY: Math.PI / 4 },
  { geo: () => new THREE.SphereGeometry(0.08, 8, 8), y: 1.72, color: C.stone },
]

export default function LanternField({ lanterns, lit, scale = 0.85 }) {
  const tex = stone(1, 1)

  const parts = useMemo(() => PARTS.map((p) => {
    const geometry = p.geo()
    const material = new THREE.MeshToonMaterial({ color: p.color, gradientMap, map: tex.map, normalMap: tex.normalMap })
    const mesh = new THREE.InstancedMesh(geometry, material, lanterns.length)
    mesh.castShadow = true
    mesh.receiveShadow = true
    const m = new THREE.Object3D()
    lanterns.forEach((l, i) => {
      m.position.set(l.x, p.y * scale, l.z)
      m.rotation.set(0, p.rotY || 0, 0)
      m.scale.setScalar(scale)
      m.updateMatrix()
      mesh.setMatrixAt(i, m.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }), [lanterns, scale, tex])

  return (
    <>
      {parts.map((mesh, i) => <primitive key={i} object={mesh} />)}
      {/* the part that actually changes: the glowing paper box */}
      {lanterns.map((l) => {
        const on = !!lit?.has(l.id)
        return (
          <group key={l.id} position={[l.x, 1.22 * scale, l.z]} scale={scale}>
            <mesh>
              <boxGeometry args={[0.42, 0.42, 0.42]} />
              <meshToonMaterial
                gradientMap={gradientMap}
                color={on ? C.washi : '#6c6a63'}
                emissive={on ? C.goldLite : '#000000'}
                emissiveIntensity={on ? 2.4 : 0}
              />
            </mesh>
            {on && <pointLight color={C.goldLite} intensity={1.6} distance={7} decay={2} />}
          </group>
        )
      })}
    </>
  )
}
