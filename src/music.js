import { musicBus } from './sound.js'

// ─────────────────────────────────────────────────────────────────────────────
// An original adaptive score, synthesised live — no audio files, nothing sampled.
//
// The village hums quietly; the closer you get to the Sahloka gate (and the more
// lanterns you have lit), the more of the arrangement arrives: plucked strings,
// then taiko, then the melody over the top. Written on the "yo" scale, the
// pentatonic used in a lot of Japanese folk music, which is why it sits so
// naturally against a shinobi village.
// ─────────────────────────────────────────────────────────────────────────────

const BPM = 76
const SPB = 60 / BPM          // seconds per beat
const STEP = SPB / 2          // eighth notes
const LOOKAHEAD = 0.25        // how far ahead we schedule

// Yo scale on D, across two octaves.
const D = 146.83
const SCALE = [1, 9 / 8, 4 / 3, 3 / 2, 5 / 3]          // ratios: D E G A B
const note = (deg, oct = 0) => D * SCALE[((deg % 5) + 5) % 5] * Math.pow(2, oct + Math.floor(deg / 5))

// 16-step patterns. `null` is a rest.
const KOTO = [0, null, 2, null, 3, null, 2, null, 4, null, 3, null, 2, null, 0, null]
const MELODY = [7, null, null, 6, 5, null, null, 7, 8, null, null, 7, 5, null, null, null]
const TAIKO = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0]

let bus = null
let timer = null
let step = 0
let nextTime = 0
let intensity = 0      // 0..1, what the world asks for
let level = 0          // smoothed follower

export function startMusic() {
  if (bus) return
  bus = musicBus()
  nextTime = bus.ctx.currentTime + 0.1
  drone()
  timer = setInterval(schedule, 40)
}

export function stopMusic() {
  if (timer) clearInterval(timer)
  timer = null
}

// The world calls this every so often; the score eases toward it.
export function setMusicIntensity(v) {
  intensity = Math.max(0, Math.min(1, v))
}

// A sustained bed of open fifths, always present once the music starts.
function drone() {
  const { ctx, gain } = bus
  const t = ctx.currentTime
  ;[D / 2, (D / 2) * (3 / 2)].forEach((f, i) => {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = i ? 0.05 : 0.075
    // a slow beat between the two voices keeps it from sounding synthetic
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07 + i * 0.03
    const lg = ctx.createGain()
    lg.gain.value = 0.6
    lfo.connect(lg).connect(o.detune)
    lfo.start(t)
    o.connect(g).connect(gain)
    o.start(t)
  })
  gain.gain.setTargetAtTime(0.9, t, 1.5)
}

// Plucked string — short attack, ringing decay.
function pluck(f, t, amp) {
  const { ctx, gain } = bus
  const o = ctx.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(f, t)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(f * 6, t)
  lp.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.5)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(amp, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
  o.connect(lp).connect(g).connect(gain)
  o.start(t); o.stop(t + 1.2)
}

// Breathy sustained tone for the melody — a flute-ish voice.
function flute(f, t, dur, amp) {
  const { ctx, gain } = bus
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(f, t)
  const vib = ctx.createOscillator()
  vib.frequency.value = 5.2
  const vg = ctx.createGain()
  vg.gain.value = 3.5
  vib.connect(vg).connect(o.detune)
  vib.start(t); vib.stop(t + dur + 0.3)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(amp, t + 0.09)
  g.gain.setValueAtTime(amp, t + dur * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25)
  o.connect(g).connect(gain)
  o.start(t); o.stop(t + dur + 0.3)
}

// Taiko: a pitched thud with a noise transient on top.
function taiko(t, amp) {
  const { ctx, gain } = bus
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(155, t)
  o.frequency.exponentialRampToValueAtTime(52, t + 0.22)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(amp, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
  o.connect(g).connect(gain)
  o.start(t); o.stop(t + 0.45)

  const n = ctx.createBufferSource()
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.09, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3)
  n.buffer = buf
  const ng = ctx.createGain()
  ng.gain.value = amp * 0.5
  n.connect(ng).connect(gain)
  n.start(t)
}

function schedule() {
  if (!bus) return
  const { ctx } = bus
  // ease the arrangement toward what the world is asking for
  level += (intensity - level) * 0.06

  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    const i = step % 16
    const t = nextTime

    // strings come in first
    if (level > 0.12 && KOTO[i] !== null) {
      pluck(note(KOTO[i], 1), t, 0.05 + level * 0.05)
    }
    // drums as the climb begins
    if (level > 0.42 && TAIKO[i]) {
      taiko(t, 0.10 + level * 0.14)
    }
    // and the melody at the summit
    if (level > 0.62 && MELODY[i] !== null) {
      flute(note(MELODY[i], 0), t, STEP * 1.6, 0.05 + level * 0.06)
    }
    // a low answering note every other bar keeps the bottom moving
    if (level > 0.5 && i === 0 && (step / 16) % 2 === 1) {
      pluck(note(0, 0), t, 0.09)
    }

    nextTime += STEP
    step++
  }
}
