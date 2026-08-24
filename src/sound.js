// Tiny synth SFX — no audio files, just the WebAudio API.
// Everything routes through a master bus so a single toggle can mute the world.
let ctx, master
export function initAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Master bus (falls back to the raw output if a sound fires before init).
function out() { return master || ctx.destination }

// Ramped, not switched — an instant cut clicks.
export function setMuted(muted) {
  if (!master) return
  master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03)
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
  n.connect(ng).connect(out())
  n.start(t)
  // thump
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(180, t)
  o.frequency.exponentialRampToValueAtTime(40, t + 0.35)
  const og = c.createGain()
  env(og, t, 0.005, 0.4, 0.6)
  o.connect(og).connect(out())
  o.start(t)
  o.stop(t + 0.5)
  // rising sweep
  const s = c.createOscillator()
  s.type = 'sawtooth'
  s.frequency.setValueAtTime(120, t + 0.05)
  s.frequency.exponentialRampToValueAtTime(900, t + 0.5)
  const sg = c.createGain()
  env(sg, t + 0.05, 0.02, 0.45, 0.15)
  s.connect(sg).connect(out())
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
  o.connect(g).connect(out())
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
  o.connect(g).connect(out())
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
  n.connect(f).connect(g).connect(out())
  n.start(t); n.stop(t + 1.3)
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(420, t)
  o.frequency.exponentialRampToValueAtTime(1650, t + 0.9)
  const og = c.createGain()
  env(og, t, 0.1, 0.95, 0.13)
  o.connect(og).connect(out())
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
  src.connect(lp).connect(wg).connect(out()); src.start(t)
  const lfo = c.createOscillator(); lfo.frequency.value = 0.08
  const lg = c.createGain(); lg.gain.value = 240
  lfo.connect(lg).connect(lp.frequency); lfo.start(t)
  ;[70, 105].forEach((freq, i) => {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq
    const og = c.createGain(); og.gain.value = i ? 0.03 : 0.05
    o.connect(og).connect(out()); o.start(t)
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
    o.connect(g).connect(out())
    o.start(t)
    o.stop(t + 0.2)
  })
}

// a lantern catching: a soft whoosh with a warm bloom on top
export function lightUp() {
  const c = initAudio(), t = c.currentTime
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6)
  n.buffer = buf
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8
  const g = c.createGain(); env(g, t, 0.01, 0.4, 0.14)
  n.connect(f).connect(g).connect(out()); n.start(t)
  ;[523, 784].forEach((freq, i) => {
    const o = c.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(freq, t + i * 0.05)
    const og = c.createGain(); env(og, t + i * 0.05, 0.01, 0.35, 0.1)
    o.connect(og).connect(out()); o.start(t + i * 0.05); o.stop(t + 0.5)
  })
}

// the shrine bell: a struck partial stack with a long decay
export function bellRing() {
  const c = initAudio(), t = c.currentTime
  ;[[440, 0.22], [660, 0.13], [1320, 0.07], [1980, 0.04]].forEach(([f, amp]) => {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(amp, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2)
    o.connect(g).connect(out()); o.start(t); o.stop(t + 3.3)
  })
}

// picking up a scroll
export function collect() {
  const c = initAudio(), t0 = c.currentTime
  ;[659, 880, 1319].forEach((f, i) => {
    const t = t0 + i * 0.06
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t)
    const g = c.createGain(); env(g, t, 0.005, 0.2, 0.16)
    o.connect(g).connect(out()); o.start(t); o.stop(t + 0.28)
  })
}

// A bus for the score, sitting under the same master gain so the mute button
// silences music and effects together.
export function musicBus() {
  const c = initAudio()
  const g = c.createGain()
  g.gain.value = 0
  g.connect(out())
  return { ctx: c, gain: g }
}

// the kick off nothing — a short upward chirp for the second jump
export function doubleJump() {
  const c = initAudio(), t = c.currentTime
  const o = c.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(430, t)
  o.frequency.exponentialRampToValueAtTime(980, t + 0.16)
  const g = c.createGain(); env(g, t, 0.006, 0.18, 0.13)
  o.connect(g).connect(out()); o.start(t); o.stop(t + 0.26)
}

// wooden clatter when a crate is struck or lands
export function crateHit(vol = 1) {
  const c = initAudio(), t = c.currentTime
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, c.sampleRate * 0.14, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6)
  n.buffer = buf
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'
  bp.frequency.value = 380 + Math.random() * 260; bp.Q.value = 1.4
  const g = c.createGain(); env(g, t, 0.004, 0.13, 0.16 * vol)
  n.connect(bp).connect(g).connect(out()); n.start(t)
  const o = c.createOscillator(); o.type = 'triangle'
  o.frequency.setValueAtTime(150 + Math.random() * 70, t)
  o.frequency.exponentialRampToValueAtTime(70, t + 0.1)
  const og = c.createGain(); env(og, t, 0.004, 0.11, 0.10 * vol)
  o.connect(og).connect(out()); o.start(t); o.stop(t + 0.18)
}

// the great drum — deep, loud, and long. Two body tones an octave apart plus a
// hard rim slap; this should feel like it moves air.
export function taikoHit() {
  const c = initAudio(), t = c.currentTime
  ;[[126, 0.62, 1.5], [63, 0.42, 1.9]].forEach(([f, amp, len]) => {
    const o = c.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(f, t)
    o.frequency.exponentialRampToValueAtTime(f * 0.34, t + len * 0.6)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(amp, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.connect(g).connect(out()); o.start(t); o.stop(t + len + 0.1)
  })
  // the stick hitting hide
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, c.sampleRate * 0.26, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.0)
  n.buffer = buf
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 460; bp.Q.value = 0.7
  const ng = c.createGain(); env(ng, t, 0.003, 0.26, 0.34)
  n.connect(bp).connect(ng).connect(out()); n.start(t)
}

// leaves rustling when a tree is shaken
export function rustle() {
  const c = initAudio(), t = c.currentTime
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, c.sampleRate * 1.0, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    const env2 = Math.sin((i / d.length) * Math.PI)
    d[i] = (Math.random() * 2 - 1) * env2 * env2
  }
  n.buffer = buf
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1900
  const g = c.createGain(); g.gain.value = 0.13
  n.connect(hp).connect(g).connect(out()); n.start(t)
}

// Something large, breathing slowly, just under the wind. It arrives at the
// third lantern and never leaves. Pitched low enough that you feel it before
// you notice it, which is the point.
let breathing = null
export function startBreathing() {
  if (breathing) return
  const c = initAudio(), t = c.currentTime

  const buf = c.createBuffer(1, c.sampleRate * 6, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true

  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 190
  lp.Q.value = 1.6

  const gain = c.createGain()
  gain.gain.value = 0.0001

  // the breath itself: a slow swell and fall, about ten a minute
  const lfo = c.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.17
  const lfoGain = c.createGain()
  lfoGain.gain.value = 0.055
  lfo.connect(lfoGain).connect(gain.gain)
  lfo.start(t)

  src.connect(lp).connect(gain).connect(out())
  src.start(t)

  // a low body under the breath
  const sub = c.createOscillator()
  sub.type = 'sine'
  sub.frequency.value = 41
  const subGain = c.createGain()
  subGain.gain.value = 0.0001
  const subLfo = c.createOscillator()
  subLfo.frequency.value = 0.17
  const subLfoGain = c.createGain()
  subLfoGain.gain.value = 0.03
  subLfo.connect(subLfoGain).connect(subGain.gain)
  subLfo.start(t)
  sub.connect(subGain).connect(out())
  sub.start(t)

  // it fades in over half a minute, so nobody catches it starting
  gain.gain.setTargetAtTime(0.062, t, 12)
  subGain.gain.setTargetAtTime(0.034, t, 12)

  breathing = { gain, subGain }
}
