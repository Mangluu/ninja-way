import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { gradientMap } from '../lib/toon'

// Downloaded CC0/CC-BY .glb models, RE-SKINNED to our cel-shading AND auto-normalized
// to a target height (they ship in wildly different units), then re-based to sit on the
// ground. This keeps them cohesive with the procedural props and correctly sized.
const url = (f) => `${import.meta.env.BASE_URL}models/${f}`

function useToonModel(file, { tint, flat = false, height = 2 } = {}) {
  const { scene } = useGLTF(url(file))
  return useMemo(() => {
    const root = scene.clone(true)
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        const base = tint || (o.material && o.material.color ? `#${o.material.color.getHexString()}` : '#cccccc')
        o.material = new THREE.MeshToonMaterial({ color: base, gradientMap, flatShading: flat })
      }
    })
    const box = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3(); box.getSize(size)
    const center = new THREE.Vector3(); box.getCenter(center)
    const s = height / (size.y || 1)
    root.scale.setScalar(s)
    root.position.set(-center.x * s, -box.min.y * s, -center.z * s) // center XZ, base at y=0
    const g = new THREE.Group()
    g.add(root)
    return g
  }, [scene, tint, flat, height])
}

export function ModelRock({ height = 0.9, tint, ...p }) {
  const m = useToonModel('rock.glb', { tint, flat: true, height })
  return <primitive object={m} {...p} />
}

export function Pagoda({ height = 9, ...p }) {
  const m = useToonModel('house.glb', { height })
  return <primitive object={m} {...p} />
}

export function ModelTree({ height = 3.4, ...p }) {
  const m = useToonModel('tree.glb', { height })
  return <primitive object={m} {...p} />
}

useGLTF.preload(url('rock.glb'))
useGLTF.preload(url('house.glb'))
useGLTF.preload(url('tree.glb'))
