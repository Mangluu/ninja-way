import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { texGlow, texWisp } from '../lib/textures'

// Atmosphere: the drifting light and haze that make the village feel like a place
// rather than a set. Particle motion lives entirely in the vertex shader, so the
// CPU never touches a per-frame loop.
// Glow/wisp sprite generators adapted from KAGE by Meng To (credited in README).

const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function canvasTex(canvas) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

// ── Fireflies: warm motes that rise, sway and fade ───────────────────────────
function Fireflies({ count = 110 }) {
  const uT = useRef({ value: 0 })
  const tex = useMemo(() => canvasTex(texGlow('rgba(255,216,150,1)', 'rgba(255,150,60,0.35)')), [])

  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 46
      pos[i * 3 + 1] = Math.random() * 7
      pos[i * 3 + 2] = Math.random() * 84 - 8
      seed[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [count])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uT: uT.current, uTex: { value: tex }, uSize: { value: window.innerHeight * 0.5 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `
      attribute float aSeed; uniform float uT; uniform float uSize; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uT * (0.10 + aSeed * 0.16), 7.5);
        p.x += sin(uT * 0.32 + aSeed * 21.0) * 1.05;
        p.z += cos(uT * 0.26 + aSeed * 15.0) * 0.9;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        // fade in off the ground, out near the top, and pulse gently
        float pulse = 0.55 + 0.45 * sin(uT * 1.7 + aSeed * 30.0);
        vA = (0.3 + aSeed * 0.7) * pulse * smoothstep(7.5, 4.5, p.y) * smoothstep(0.0, 1.2, p.y);
        gl_PointSize = uSize * (0.006 + aSeed * 0.010) / max(-mv.z, 0.6);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; varying float vA;
      void main(){
        vec4 t = texture2D(uTex, gl_PointCoord);
        gl_FragColor = vec4(t.rgb * vec3(1.5, 0.95, 0.55), t.a * vA * 0.85);
      }`,
  }), [tex])

  useFrame((s) => { uT.current.value = s.clock.elapsedTime })

  const pts = useMemo(() => { const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = 5; return p }, [geo, mat])
  return <primitive object={pts} />
}

// ── Low mist: soft sheets that drift across the ground ───────────────────────
function GroundMist({ count = 7 }) {
  const group = useRef()
  const tex = useMemo(() => canvasTex(texWisp()), [])
  const sheets = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: (Math.random() - 0.5) * 50,
    y: 0.5 + Math.random() * 0.9,
    z: i * 12 - 6 + Math.random() * 6,
    s: 16 + Math.random() * 14,
    drift: Math.random() * 6.28,
    speed: 0.1 + Math.random() * 0.12,
  })), [count])

  useFrame((s) => {
    if (!group.current) return
    const t = s.clock.elapsedTime
    group.current.children.forEach((m, i) => {
      const d = sheets[i]
      m.position.x = d.x + Math.sin(t * d.speed + d.drift) * 7
      m.material.opacity = 0.10 + 0.05 * Math.sin(t * 0.4 + d.drift)
    })
  })

  return (
    <group ref={group}>
      {sheets.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]} rotation={[-Math.PI / 2, 0, Math.random() * 3]} renderOrder={4}>
          <planeGeometry args={[d.s, d.s]} />
          <meshBasicMaterial map={tex} transparent opacity={0.12} depthWrite={false} color="#e8d9c4" />
        </mesh>
      ))}
    </group>
  )
}

export default function Atmosphere() {
  // Drifting particles are exactly what reduced-motion users ask not to see.
  if (REDUCED()) return null
  return (
    <>
      <Fireflies />
      <GroundMist />
    </>
  )
}
