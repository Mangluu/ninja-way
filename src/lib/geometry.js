import * as THREE from 'three'

// smoothstep — roofGeo uses it to ease the corner flare in over the last of the run
const sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (e0, e1, x) => { const t = sat((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t) }

// ─────────────────────────────────────────────────────────────────────────────
// Geometry builders adapted from KAGE by Meng To (https://github.com/MengTo/kage),
// used with the author's permission. Credited in the README.
//
// roofGeo is the important one: a temple roof is not a pyramid. Its eaves sag
// along each run and lift at the corners, which is what makes the silhouette
// read as Japanese rather than as a cone.
// ─────────────────────────────────────────────────────────────────────────────

function sweepPoly(points, profile) {
  const segs = points.length, np = profile.length;
  const pos = [], nor = [], uv = [], idx = [];
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < segs; i++) {
    const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(segs - 1, i + 1)];
    T.subVectors(b, a).normalize();
    B.crossVectors(T, up).normalize();
    N.crossVectors(B, T).normalize();
    for (let j = 0; j < np; j++) {
      const u = profile[j][0], v = profile[j][1], l = Math.hypot(u, v) || 1;
      pos.push(p.x + B.x * u + N.x * v, p.y + B.y * u + N.y * v, p.z + B.z * u + N.z * v);
      nor.push(B.x * u / l + N.x * v / l, B.y * u / l + N.y * v / l, B.z * u / l + N.z * v / l);
      uv.push(j / np, i / (segs - 1));
    }
  }
  for (let i = 0; i < segs - 1; i++) for (let j = 0; j < np; j++) {
    const j2 = (j + 1) % np, a = i * np + j, b = i * np + j2, c = (i + 1) * np + j2, d = (i + 1) * np + j;
    idx.push(a, b, c, a, c, d);
  }
  /* caps */
  [0, segs - 1].forEach((ring, k) => {
    const base = pos.length / 3, p = points[ring];
    pos.push(p.x, p.y, p.z); nor.push(0, 0, k ? 1 : -1); uv.push(.5, .5);
    for (let j = 0; j < np; j++) {
      const a = ring * np + j, b = ring * np + (j + 1) % np;
      k ? idx.push(base, a, b) : idx.push(base, b, a);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/* A temple roof. The height is a concave function of the Chebyshev distance
   from the ridge out to the eave, and the last fifth of that run flares back
   upward — that lift at the corners is the whole silhouette. Emitted solid:
   a top shell, an underside shell, and a fascia stitching the two rims. */
function roofGeo(A, B, R, Hr, thick, flare) {
  const NX = 52, NZ = 34, FL = flare === undefined ? .30 : flare, e = 1e-3;
  /* The lift has to be weighted toward the corners. Applied evenly along the
     eave it produces a raised rim the whole way round and the roof reads as a
     saucer; concentrated where the two runs meet, it reads as a temple. */
  const hAt = (x, z) => {
    const cx = Math.min(1, Math.abs(x) / A), cz = Math.min(1, Math.abs(z) / B);
    const tx = Math.max(0, (Math.abs(x) - R) / Math.max(A - R, 1e-4));
    const t = Math.min(1, Math.max(tx, cz));
    return Hr * Math.pow(1 - t, 1.45)
         + FL * Hr * smooth(.72, 1, t) * (.52 + .68 * Math.min(cx, cz));
  };
  const pos = [], nor = [], uv = [], idx = [];
  const N = new THREE.Vector3();
  const VPS = (NX + 1) * (NZ + 1);
  for (let k = 0; k < 2; k++) {
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const x = -A + 2 * A * i / NX, z = -B + 2 * B * j / NZ;
      N.set(-(hAt(x + e, z) - hAt(x - e, z)) / (2 * e), 1,
            -(hAt(x, z + e) - hAt(x, z - e)) / (2 * e)).normalize();
      if (k) N.negate();
      pos.push(x, hAt(x, z) - (k ? thick : 0), z);
      nor.push(N.x, N.y, N.z);
      /* one tile every seven metres: at half a metre the ribs land inside a
         pixel at this range and the mip chain averages them to flat grey */
      uv.push(x * .14, z * .14);
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = k * VPS + j * (NX + 1) + i, b = a + 1, c = a + NX + 2, d = a + NX + 1;
      k ? idx.push(a, c, b, a, d, c) : idx.push(a, b, c, a, c, d);
    }
  }
  /* fascia: its own ring of vertices so the eave edge keeps a sideways normal */
  const per = [];
  for (let i = 0; i <= NX; i++) per.push([i, 0]);
  for (let j = 1; j <= NZ; j++) per.push([NX, j]);
  for (let i = NX - 1; i >= 0; i--) per.push([i, NZ]);
  for (let j = NZ - 1; j >= 1; j--) per.push([0, j]);
  const base = pos.length / 3;
  per.forEach(p => {
    const x = -A + 2 * A * p[0] / NX, z = -B + 2 * B * p[1] / NZ;
    const nx = p[0] === 0 ? -1 : (p[0] === NX ? 1 : 0);
    const nz = p[1] === 0 ? -1 : (p[1] === NZ ? 1 : 0);
    const l = Math.hypot(nx, nz) || 1;
    const y = hAt(x, z);
    pos.push(x, y, z, x, y - thick, z);
    nor.push(nx / l, 0, nz / l, nx / l, 0, nz / l);
    uv.push(0, 0, 0, 1);
  });
  for (let i = 0; i < per.length; i++) {
    const a = base + i * 2, b = a + 1;
    const c = base + ((i + 1) % per.length) * 2, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function mergeGeos(list) {
  let vN = 0, iN = 0;
  list.forEach(g => { vN += g.attributes.position.count; iN += g.index.count; });
  const pos = new Float32Array(vN * 3), nor = new Float32Array(vN * 3), uv = new Float32Array(vN * 2);
  const idx = vN > 65535 ? new Uint32Array(iN) : new Uint16Array(iN);
  let vo = 0, io = 0;
  list.forEach(g => {
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    uv.set(g.attributes.uv.array, vo * 2);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    io += gi.length; vo += g.attributes.position.count;
    g.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

export { sweepPoly, roofGeo, mergeGeos }
