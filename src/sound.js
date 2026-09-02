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

// A hall to put the struck things in. The impulse is synthesised: a burst of
// noise with an exponential tail and a handful of early reflections, which is
// most of what a real room adds. Only the metal and the drum go through it.
let verb = null
function reverb() {
  if (verb) return verb
  const c = initAudio()
  const len = Math.floor(c.sampleRate * 2.6)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      const t = i / c.sampleRate
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.6) * (t < 0.01 ? t / 0.01 : 1)
    }
    // early reflections, a few milliseconds apart, slightly different per ear
    for (const [ms, g] of [[11, 0.5], [23, 0.35], [37, 0.28], [53, 0.2]]) {
      const i = Math.floor((ms + ch * 3) * c.sampleRate / 1000)
      if (i < len) d[i] += g * (ch ? -1 : 1)
    }
  }
  const conv = c.createConvolver(); conv.buffer = ir
  const wet = c.createGain(); wet.gain.value = 0.42
  conv.connect(wet).connect(out())
  verb = conv
  return verb
}
// connect a node to both the dry output and the hall
function wetDry(node, send = 0.5) {
  node.connect(out())
  const g = ctx.createGain(); g.gain.value = send
  node.connect(g).connect(reverb())
}

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

// The shrine bell. A real bell is a stack of partials that are not quite in
// tune with each other, each dying at its own rate, over a low hum; a clapper
// adds a short bright knock. Two of the partials beat slowly against a
// detuned twin, which is the shimmer you hear on a struck bronze.
export function bellRing(vel = 1) {
  const c = initAudio(), t = c.currentTime
  const bus = c.createGain(); bus.gain.value = 0.9 * vel
  wetDry(bus, 0.7)
  const f0 = 523
  const partials = [[0.5, 0.35, 5.0], [1, 1.0, 3.8], [2.0, 0.55, 2.8], [2.41, 0.32, 2.2], [3.01, 0.36, 1.9], [4.16, 0.2, 1.4], [5.43, 0.12, 1.0], [6.8, 0.06, 0.7]]
  partials.forEach(([r, amp, dec], i) => {
    const twins = i === 1 || i === 2 ? [-1.4, 1.4] : [0]
    twins.forEach((dt) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0 * r + dt, t)
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime((amp / twins.length) * 0.22, t + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec)
      o.connect(g).connect(bus); o.start(t); o.stop(t + dec + 0.05)
    })
  })
  // the clapper
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3)
  n.buffer = buf
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.2
  const ng = c.createGain(); ng.gain.value = 0.25
  n.connect(bp).connect(ng).connect(bus); n.start(t)
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

// The great drum. The skin rings down in pitch as it settles, the barrel adds
// a second, higher body an octave up that dies faster, the stick gives a
// short slap, and the hall does the rest. A little random pitch per hit so a
// roll never sounds like a loop.
export function taikoHit(vel = 1) {
  const c = initAudio(), t = c.currentTime
  const bus = c.createGain(); bus.gain.value = Math.min(vel, 1.2)
  wetDry(bus, 0.55)
  const jit = 1 + (Math.random() - 0.5) * 0.08
  ;[[92 * jit, 40 * jit, 0.9, 1.35], [176 * jit, 84 * jit, 0.32, 0.5], [58 * jit, 34 * jit, 0.5, 1.8]].forEach(([f1, f2, amp, len]) => {
    const o = c.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(f1, t)
    o.frequency.exponentialRampToValueAtTime(f2, t + len * 0.5)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(amp, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.connect(g).connect(bus); o.start(t); o.stop(t + len + 0.1)
  })
  // stick on hide: a slap with a touch of skin resonance
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.18), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.4)
  n.buffer = buf
  const slap = c.createBiquadFilter(); slap.type = 'bandpass'; slap.frequency.value = 520; slap.Q.value = 0.7
  const sg = c.createGain(); env(sg, t, 0.002, 0.16, 0.5)
  n.connect(slap).connect(sg).connect(bus)
  const skin = c.createBiquadFilter(); skin.type = 'bandpass'; skin.frequency.value = 170 * jit; skin.Q.value = 6
  const kg = c.createGain(); env(kg, t, 0.003, 0.3, 0.6)
  n.connect(skin).connect(kg).connect(bus)
  n.start(t)
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

// The seal breaking: a downward sweep under a wall of noise. Low enough that
// small speakers feel it as pressure rather than hear it as a tone.
export function foxRoar() {
  const ctx = initAudio(); if (!ctx) return
  const t = ctx.currentTime
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(0.0001, t)
  bus.gain.exponentialRampToValueAtTime(0.9, t + 0.18)
  bus.gain.exponentialRampToValueAtTime(0.0001, t + 3.4)
  bus.connect(out())

  const growl = ctx.createOscillator()
  growl.type = 'sawtooth'
  growl.frequency.setValueAtTime(150, t)
  growl.frequency.exponentialRampToValueAtTime(38, t + 2.6)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t)
  lp.frequency.exponentialRampToValueAtTime(220, t + 3.0)
  growl.connect(lp).connect(bus)

  // breath over the top so it is an animal, not a synth
  const n = ctx.createBufferSource()
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3.5, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  n.buffer = buf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'; bp.frequency.setValueAtTime(900, t)
  bp.frequency.exponentialRampToValueAtTime(180, t + 2.8); bp.Q.value = 0.7
  const ng = ctx.createGain(); ng.gain.value = 0.35
  n.connect(bp).connect(ng).connect(bus)

  growl.start(t); growl.stop(t + 3.5); n.start(t); n.stop(t + 3.5)
}

// One gate catching fire. Called seven times, a beat apart.
export function gateCatch(i = 0) {
  const ctx = initAudio(); if (!ctx) return
  const t = ctx.currentTime
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
  g.connect(out())
  const o = ctx.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(220 * Math.pow(2, i / 12), t)
  o.frequency.exponentialRampToValueAtTime(660 * Math.pow(2, i / 12), t + 0.5)
  o.connect(g); o.start(t); o.stop(t + 0.75)
}

// a shuriken leaving the hand: a short bright whip of air and a thin ring of steel
export function shing() {
  const c = initAudio(), t = c.currentTime
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, c.sampleRate * 0.22, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.4)
  n.buffer = buf
  const hp = c.createBiquadFilter(); hp.type = 'highpass'
  hp.frequency.setValueAtTime(1400, t); hp.frequency.exponentialRampToValueAtTime(5200, t + 0.18)
  const g = c.createGain(); env(g, t, 0.008, 0.2, 0.16)
  n.connect(hp).connect(g); wetDry(g, 0.3); n.start(t)
  ;[2650, 3980].forEach((f, i) => {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t)
    const og = c.createGain(); env(og, t, 0.004, 0.14 - i * 0.04, 0.05)
    o.connect(og).connect(out()); o.start(t); o.stop(t + 0.25)
  })
}

// The fox, pleased: a soft two-note chirp with a little warble on the second
// note, and a breath under it.
export function purr() {
  const c = initAudio(), t = c.currentTime
  const bus = c.createGain(); bus.gain.value = 0.9
  wetDry(bus, 0.25)
  ;[[820, 0, 0.13], [1180, 0.11, 0.22]].forEach(([f, at, len], i) => {
    const o = c.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(f, t + at)
    o.frequency.exponentialRampToValueAtTime(f * (i ? 1.12 : 1.05), t + at + len)
    if (i) { const v = c.createOscillator(); v.frequency.value = 9; const vg = c.createGain(); vg.gain.value = 18; v.connect(vg).connect(o.detune); v.start(t + at); v.stop(t + at + len + 0.1) }
    const g = c.createGain(); env(g, t + at, 0.012, len, 0.14)
    o.connect(g).connect(bus); o.start(t + at); o.stop(t + at + len + 0.1)
  })
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.3), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / d.length) * Math.PI)
  n.buffer = buf
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 1.5
  const ng = c.createGain(); ng.gain.value = 0.03
  n.connect(bp).connect(ng).connect(bus); n.start(t)
}

// Eating: three quick soft crunches, each a touch lower than the last.
export function munch() {
  const c = initAudio(), t0 = c.currentTime
  for (let k = 0; k < 3; k++) {
    const t = t0 + k * 0.13
    const n = c.createBufferSource()
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.07), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2)
    n.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400 - k * 180; bp.Q.value = 1.1
    const g = c.createGain(); env(g, t, 0.003, 0.06, 0.18)
    n.connect(bp).connect(g).connect(out()); n.start(t)
  }
}
