// ─────────────────────────────────────────────────────────────────────────────
// THE HIDDEN VILLAGE — data. Subtle by design: no life-story narration, just a
// fun world with discoverable projects, all orbiting one glowing landmark: SAHLOKA.
// ─────────────────────────────────────────────────────────────────────────────

export const profile = {
  name: 'SHIVANG GUPTA',
  handle: 'Mangluu',
  title: 'World-builder · XR researcher · D.Sc @ Tampere',
  links: {
    sahloka: 'https://sahloka.com',
    github: 'https://github.com/Mangluu',
    linkedin: 'https://www.linkedin.com/in/i-am-manglu/',
    email: 'mailto:shivangzephyr@gmail.com',
  },
}

// The palette — one cohesive Japanese-village set used everywhere.
export const C = {
  vermilion: '#bb3323', vermilionLite: '#e5543f',
  indigo: '#2a4b7c', indigoDeep: '#1b2e4e',
  celadon: '#5fa88a',
  wood: '#b5835a', woodDark: '#7a5638',
  washi: '#efe7d6',
  sumi: '#2b2823',
  gold: '#e6b24d', goldLite: '#ffd98a',
  sakura: '#e8a9b8', sakuraDeep: '#d98ca0',
  leaf: '#6f8f5f', leafDark: '#4e6b4a',
  stone: '#9a958a', stoneDark: '#6f6b62',
  roof: '#38466a',
  grass: '#6d7a4f', dirt: '#b89a6c',
}

// Environment — a golden-hour dusk. Warm, cel-shades beautifully, makes gold glow.
export const ENV = {
  skyTop: '#2b3f6b',
  skyMid: '#c98b6e',
  skyBottom: '#f0c48a',
  fog: '#d7a878',
  fogNear: 14,
  fogFar: 120,
  sun: '#ffdba6',
  ground: '#6d7a4f',
}

// SAHLOKA — the star everything orbits. On a hill at the far end, always visible.
export const SAHLOKA = {
  name: 'SAHLOKA',
  blurb: 'A living world where AI residents lead their own lives — and you drop in to watch, befriend, and join them. It remembers you. The one I am betting everything on.',
  link: 'https://sahloka.com',
  x: 0, z: 74, y: 4, // raised on the hill
}

// Discoverable project spots — glowing lanterns you wander up to. Optional, not a tour.
export const projects = [
  {
    id: 'passage', name: 'Passage', tag: 'b_hack 2026 · Winner',
    blurb: 'How safe and free will you be abroad — specific to who you are, every fact sourced and dated. Provenance over plausibility.',
    link: 'https://mangluu.github.io/passage/', cta: 'Open Passage', color: C.celadon,
    x: -7, z: 16,
  },
  {
    id: 'visbaltic', name: 'VisBaltic', tag: 'b_hack 2025 · Winner',
    blurb: 'An open, source-cited map of how climate change is reshaping the Baltic Sea — and real initiatives to act on it. Turning scary data into action.',
    link: 'https://mangluu.github.io/visbaltic/', cta: 'Open VisBaltic', color: C.celadon,
    x: 8, z: 24,
  },
  {
    id: 'sayit', name: 'Say It, Slay It', tag: 'Game Jam · Leiden · Winner',
    blurb: 'Shout something ridiculous, the AI forges it into a weapon, and you fling it at a friend. A game that is useless without human creativity — then it won a jam.',
    link: 'https://github.com/GameAISchool2026members/Say-It-Slay-It', cta: 'See the code', color: C.vermilionLite,
    x: -9, z: 34,
  },
  {
    id: 'explaindb', name: 'ExplainDB', tag: 'Aalto AI Hackathon',
    blurb: 'Talk to your database like you talk to ChatGPT — but better: graphs, recommendations, plain language. 48 hours, 2 developers, a lot of pizza.',
    link: 'https://github.com/Mangluu', cta: 'About it', color: C.indigo,
    x: 9, z: 40,
  },
  {
    id: 'haptics', name: 'Virtual Playing, Real Touch', tag: 'CHI 2026 · Barcelona',
    blurb: 'My PhD work on the haptics of musical instruments — play virtual instruments and feel how touch changes VR. Watching people get competitive with it was the best part.',
    link: 'https://doi.org/10.1109/PEEIC47157.2019.8976471', cta: 'The research', color: C.gold,
    x: -8, z: 50,
  },
  {
    id: 'overleaf', name: 'overleaf-comments-export', tag: '★ Most-starred tool',
    blurb: 'Export Overleaf comments and tracked changes to clean Markdown + JSON. A small sharp tool that scratched my own itch — and others’ too.',
    link: 'https://github.com/Mangluu/overleaf-comments-export', cta: 'View on GitHub', color: C.gold,
    x: 8, z: 58,
  },
]

// A few quiet personality notes — surfaced softly, never as a timeline.
export const facts = [
  'Hackathon teams named Akatsuki and METAvengers. Casting my life as Naruto and Marvel for years.',
  'Fell for the metaverse watching Ready Player One — before it existed.',
  'The best part is always the people. The tech is just the excuse.',
]

// World bounds (XZ). Forward toward Sahloka is +Z.
export const WORLD = { minX: -22, maxX: 22, minZ: -8, maxZ: 82 }
