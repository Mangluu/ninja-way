import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { toonify } from '../lib/gltf'
import { groundHeight } from './layout'

// Two bundles hold every model prop: nature.glb (Kenney) and arch.glb
// (Quaternius torii and temples, Kay Lousberg's shrine). Each prop is a named
// child of the bundle scene; pieces are cloned or instanced from there.

const NATURE = `${import.meta.env.BASE_URL}models/nature.glb`
const ARCH = `${import.meta.env.BASE_URL}models/arch.glb`

function useBundle(url) {
  const { scene } = useGLTF(url, false)
  return useMemo(() => {
    if (!scene.userData.toon) { toonify(scene); scene.updateMatrixWorld(true); scene.userData.toon = true }
    return scene
  }, [scene])
}
export const useNature = () => useBundle(NATURE)
export const useArch = () => useBundle(ARCH)

// One copy of a named prop, stood on the ground.
// `tint` multiplies the prop's own colours; `paint` replaces them with one flat
// colour and drops the texture, for models whose atlas is the wrong material.
export function Prop({ bundle, name, x = 0, z = 0, y = 0, s = 1, rot = 0, tint, paint, children, ...rest }) {
  const obj = useMemo(() => {
    const src = bundle.getObjectByName(name)
    if (!src) { console.warn('missing prop', name); return new THREE.Group() }
    const c = src.clone(true)
    if (tint || paint) c.traverse((o) => {
      if (!o.isMesh) return
      o.material = o.material.clone()
      if (paint) { o.material.map = null; o.material.color.set(paint); o.material.needsUpdate = true }
      if (tint) o.material.color.multiply(new THREE.Color(tint))
    })
    return c
  }, [bundle, name, tint, paint])
  return (
    <group position={[x, groundHeight(x, z) + y, z]} rotation={[0, rot, 0]} scale={s} {...rest}>
      <primitive object={obj} />
      {children}
    </group>
  )
}

// Many copies of props: one InstancedMesh per source mesh per kind, so a
// forest of two hundred trees is a handful of draw calls.
export function Instanced({ bundle, items }) {
  const groups = useMemo(() => {
    const m = new Map()
    for (const it of items) { if (!m.has(it.kind)) m.set(it.kind, []); m.get(it.kind).push(it) }
    return [...m]
  }, [items])
  return groups.map(([kind, list]) => <InstancedKind key={kind} bundle={bundle} kind={kind} items={list} />)
}

function InstancedKind({ bundle, kind, items }) {
  const meshes = useMemo(() => {
    const root = bundle.getObjectByName(kind)
    if (!root) { console.warn('missing prop', kind); return [] }
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
    const d = new THREE.Object3D(), rel = new THREE.Matrix4(), m4 = new THREE.Matrix4()
    const out = []
    root.traverse((o) => {
      if (!o.isMesh) return
      rel.multiplyMatrices(inv, o.matrixWorld)
      const inst = new THREE.InstancedMesh(o.geometry, o.material, items.length)
      items.forEach((it, i) => {
        d.position.set(it.x, groundHeight(it.x, it.z) + (it.y || 0), it.z)
        d.rotation.set(0, it.rot || 0, 0)
        d.scale.setScalar(it.s || 1)
        d.updateMatrix()
        m4.multiplyMatrices(d.matrix, rel)
        inst.setMatrixAt(i, m4)
      })
      inst.instanceMatrix.needsUpdate = true
      inst.castShadow = true
      inst.receiveShadow = true
      // ponytail: the bounding sphere only knows the base mesh, so culling
      // would drop far instances mid-view; leave it off
      inst.frustumCulled = false
      out.push(inst)
    })
    return out
  }, [bundle, kind, items])
  return meshes.map((m, i) => <primitive key={i} object={m} />)
}

useGLTF.preload(NATURE, false)
useGLTF.preload(ARCH, false)
