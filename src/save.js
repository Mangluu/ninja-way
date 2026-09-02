// Progress lives in this browser. Eight sets stored as arrays, and one number:
// seconds spent petting the fox.
const KEYS = ['lit', 'found', 'seen', 'heard', 'hit', 'done', 'food', 'fed']
const STORE = 'ninja-way:save:v1'

export function loadSave() {
  const s = Object.fromEntries(KEYS.map((k) => [k, new Set()]))
  try {
    const j = JSON.parse(localStorage.getItem(STORE))
    if (j) for (const k of KEYS) s[k] = new Set(Array.isArray(j[k]) ? j[k] : [])
    s.bond = j && Number.isFinite(j.bond) ? j.bond : 0
  } catch {}
  if (!Number.isFinite(s.bond)) s.bond = 0
  return s
}

export function persistSave(s) {
  try { localStorage.setItem(STORE, JSON.stringify({ ...Object.fromEntries(KEYS.map((k) => [k, [...s[k]]])), bond: s.bond || 0 })) } catch {}
}

export function clearSave() {
  try { localStorage.removeItem(STORE) } catch {}
}
