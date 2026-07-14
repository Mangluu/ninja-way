// Tiny synth SFX — no audio files, just the WebAudio API.
let ctx
export function initAudio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function env(node, t, a, d, peak = 0.5) {
  node.gain.setValueAtTime(0.0001, t)
  node.gain.exponentialRampToValueAtTime(peak, t + a)
  node.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
}

// THE SNAP — an impact: noise burst + a descending thump + a rising sweep.
export function snapSound() {
  const c = initAudio()
  const t = c.currentTime
  // noise burst
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2)
  n.buffer = buf
  const ng = c.createGain()
  env(ng, t, 0.005, 0.25, 0.4)
  n.connect(ng).connect(c.destination)
  n.start(t)
  // thump
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(180, t)
  o.frequency.exponentialRampToValueAtTime(40, t + 0.35)
  const og = c.createGain()
  env(og, t, 0.005, 0.4, 0.6)
  o.connect(og).connect(c.destination)
  o.start(t)
  o.stop(t + 0.5)
  // rising sweep
  const s = c.createOscillator()
  s.type = 'sawtooth'
  s.frequency.setValueAtTime(120, t + 0.05)
  s.frequency.exponentialRampToValueAtTime(900, t + 0.5)
  const sg = c.createGain()
  env(sg, t + 0.05, 0.02, 0.45, 0.15)
  s.connect(sg).connect(c.destination)
  s.start(t + 0.05)
  s.stop(t + 0.6)
}

// soft pling when entering a memory
export function ping() {
  const c = initAudio()
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(660, t)
  o.frequency.exponentialRampToValueAtTime(990, t + 0.12)
  const g = c.createGain()
  env(g, t, 0.005, 0.18, 0.25)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + 0.25)
}

// soft footstep thud
export function footstep() {
  const c = initAudio()
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(115, t)
  o.frequency.exponentialRampToValueAtTime(52, t + 0.09)
  const g = c.createGain()
  env(g, t, 0.004, 0.09, 0.07)
  o.connect(g).connect(c.destination)
  o.start(t); o.stop(t + 0.14)
}

// rising portal whoosh when entering Sahloka
export function whoosh() {
  const c = initAudio()
  const t = c.currentTime
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, c.sampleRate * 1.3, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  n.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'; f.Q.value = 1.1
  f.frequency.setValueAtTime(280, t)
  f.frequency.exponentialRampToValueAtTime(3200, t + 0.95)
  const g = c.createGain()
  env(g, t, 0.15, 1.05, 0.32)
  n.connect(f).connect(g).connect(c.destination)
  n.start(t); n.stop(t + 1.3)
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(420, t)
  o.frequency.exponentialRampToValueAtTime(1650, t + 0.9)
  const og = c.createGain()
  env(og, t, 0.1, 0.95, 0.13)
  o.connect(og).connect(c.destination)
  o.start(t); o.stop(t + 1.0)
}

// ambient dusk bed: gusting wind + a warm low drone (starts once)
let ambientOn = false
export function startAmbient() {
  if (ambientOn) return
  const c = initAudio()
  ambientOn = true
  const t = c.currentTime
  const buf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4
  const src = c.createBufferSource()
  src.buffer = buf; src.loop = true
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'; lp.frequency.value = 480
  const wg = c.createGain(); wg.gain.value = 0.055
  src.connect(lp).connect(wg).connect(c.destination); src.start(t)
  const lfo = c.createOscillator(); lfo.frequency.value = 0.08
  const lg = c.createGain(); lg.gain.value = 240
  lfo.connect(lg).connect(lp.frequency); lfo.start(t)
  ;[70, 105].forEach((freq, i) => {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq
    const og = c.createGain(); og.gain.value = i ? 0.03 : 0.05
    o.connect(og).connect(c.destination); o.start(t)
  })
}

// little triumphant arpeggio for SIUUU / BELIEVE IT
export function cheer() {
  const c = initAudio()
  const t0 = c.currentTime
  ;[523, 659, 784, 1047].forEach((f, i) => {
    const t = t0 + i * 0.08
    const o = c.createOscillator()
    o.type = 'square'
    o.frequency.setValueAtTime(f, t)
    const g = c.createGain()
    env(g, t, 0.005, 0.16, 0.16)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + 0.2)
  })
}
