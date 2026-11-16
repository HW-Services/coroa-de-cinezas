// ============================================================
//  Modelos procedurais detalhados do cenário: árvores, palmeiras,
//  pinheiros, arbustos, rochas, cactos, cristais e afins.
//  Cada modelo é uma geometria única com cores por vértice
//  (oclusão, gradientes, neve), instanciada em blocos espaciais.
// ============================================================
'use strict';

const D3 = {};

// ---------- utilidades ----------
D3.ruido3 = (r) => (x, y, z) => (r.n(x + z * 0.71, y * 1.13 - z * 0.37) + r.n(y * 1.31 + 5.2, z - x * 0.61) + r.n(z * 0.9 - 3.1, x * 1.07 + y * 0.5)) / 3;

// junta várias geometrias (com matriz e cor) numa só, com cores por vértice
D3.fundir = function (itens) {
  const P = [], N = [], C = [], U = [];
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3(), cor = new THREE.Color();
  for (const it of itens) {
    const g = it.g.index ? it.g.toNonIndexed() : it.g;
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, no = g.attributes.normal, uv = g.attributes.uv;
    const m = it.m || new THREE.Matrix4(); nm.getNormalMatrix(m);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m); n.fromBufferAttribute(no, i).applyMatrix3(nm).normalize();
      P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z);
      if (uv) U.push(uv.getX(i) * (it.uv || 1), uv.getY(i) * (it.uv || 1)); else U.push(v.x * 0.35, v.y * 0.35);
      if (typeof it.c === 'function') it.c(cor, v, n); else cor.copy(it.c);
      C.push(cor.r, cor.g, cor.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.computeBoundingSphere(); g.userData.cache = true;
  return g;
};

// matriz que leva o eixo Y de "a" até "b" (para cilindros entre dois pontos)
D3.entre = function (a, b, raio) {
  const d = new THREE.Vector3().subVectors(b, a); const L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(raio, L, raio));
};

// esfera deformada por ruído (copas, arbustos, rochas)
D3.bolha = function (seed, det = 1, amp = 0.25, freq = 1.6) {
  const g = new THREE.IcosahedronGeometry(1, det);
  const n3 = D3.ruido3(criarRuido(seed)); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + n3(x * freq, y * freq, z * freq) * amp * 2;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals(); return g;
};

// tronco cônico levemente torto (base em y=0, topo em y=1)
D3.tronco = function (seed, rBase = 1, rTopo = 0.6, curva = 0.12, radial = 6, seg = 3) {
  const g = new THREE.CylinderGeometry(rTopo, rBase, 1, radial, seg, true); g.translate(0, 0.5, 0);
  const r = criarRuido(seed); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x); const rug = 1 + r.n(a * 2.2, y * 6) * 0.12;
    const raiz = y < 0.12 ? 1 + (0.12 - y) * 3.2 * (0.6 + 0.4 * Math.cos(a * 4)) : 1;
    p.setXYZ(i, x * rug * raiz + Math.sin(y * 2.4) * curva, y, z * rug * raiz + Math.cos(y * 1.7 + 1) * curva * 0.6);
  }
  g.computeVertexNormals(); return g;
};

// galhos recursivos (árvores mortas, estrutura das copas)
D3.galhos = function (itens, rnd, base, dir, comp, raio, nivel, cor, pontas) {
  const fim = base.clone().addScaledVector(dir, comp);
  itens.push({ g: D3._galhoG || (D3._galhoG = new THREE.CylinderGeometry(0.7, 1, 1, 5, 1, true)), m: D3.entre(base, fim, raio), c: cor, uv: 1 });
  if (nivel <= 0) { if (pontas) pontas.push(fim); return; }
  const nF = nivel > 1 ? 2 + Math.floor(rnd() * 2) : 2;
  for (let i = 0; i < nF; i++) {
    const d = dir.clone();
    const eixo = new THREE.Vector3(rnd() - 0.5, 0, rnd() - 0.5).normalize();
    d.applyAxisAngle(eixo, 0.45 + rnd() * 0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), i / nF * Math.PI * 2 + rnd());
    d.y = Math.max(d.y, 0.15); d.normalize();
    D3.galhos(itens, rnd, fim, d, comp * (0.6 + rnd() * 0.15), raio * 0.62, nivel - 1, cor, pontas);
  }
};

// ---------- cores ----------
const _cc = new THREE.Color(), _cc2 = new THREE.Color();
function corMix(alvo, a, b, t) { alvo.copy(a).lerp(b, clamp(t, 0, 1)); return alvo; }
// cor de folhagem: escurece embaixo e por dentro, clareia o topo
function corFolha(base, claro, yMin, yMax, neve = 0) {
  const A = new THREE.Color(base), B = new THREE.Color(claro), BR = new THREE.Color(0xf2f6fc);
  return (c, v, n) => {
    const t = (v.y - yMin) / (yMax - yMin);
    corMix(c, A, B, t * 0.7 + n.y * 0.3).multiplyScalar(0.55 + 0.45 * clamp(t + 0.25, 0, 1));
    if (neve && n.y > 0.35) c.lerp(BR, clamp((n.y - 0.35) * 2.2, 0, 1) * neve);
  };
}
function corCasca(base, yMax = 3) { const A = new THREE.Color(base); return (c, v) => { c.copy(A).multiplyScalar(0.6 + 0.4 * clamp(v.y / yMax + 0.2, 0, 1)); }; }

// ---------- pinheiro ----------
D3.saiaPinheiro = function (rnd, nP = 9) {
  const pts = [], a0 = rnd() * 6.28;
  for (let i = 0; i < nP * 2; i++) {
    const a = a0 + i / (nP * 2) * Math.PI * 2, ponta = i % 2 === 0;
    const r = ponta ? 0.9 + rnd() * 0.2 : 0.6 + rnd() * 0.06;
    const y = ponta ? -0.16 - rnd() * 0.1 : 0.06;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  const topo = [rnd() * 0.06, 1, rnd() * 0.06], baixo = [0, 0.18, 0], pos = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    pos.push(...topo, ...b, ...a, ...baixo, ...a, ...b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
};
D3.pinheiro = function (seed, neve = 0) {
  const rnd = mulberry32(seed), folha = [], casca = [];
  casca.push({ g: D3.tronco(seed, 0.3, 0.12, 0.05), m: M4(0, -0.2, 0, 0, 0, 0, 1, 6.2, 1), c: corCasca(0x4a3420, 6) });
  const nC = 6 + Math.floor(rnd() * 2);
  for (let k = 0; k < nC; k++) {
    const t = k / nC, r = 2.0 * (1 - t * 0.86) + 0.15, h = 1.35 - t * 0.35;
    folha.push({ g: D3.saiaPinheiro(rnd, 8 + Math.floor((1 - t) * 4)), m: M4((rnd() - 0.5) * 0.1, 1.15 + k * 0.78, (rnd() - 0.5) * 0.1, 0, rnd() * 6, 0, r, h, r), c: corFolha(0x1c3418, 0x3c6a2e, 0.8, 6.8, neve) });
  }
  folha.push({ g: new THREE.ConeGeometry(0.28, 1.1, 6), m: M4(0, 1.15 + nC * 0.78 + 0.25, 0), c: corFolha(0x1c3418, 0x3c6a2e, 0.8, 6.8, neve) });
  return [{ g: D3.fundir(casca), mat: 'casca' }, { g: D3.fundir(folha), mat: 'folha' }];
};

// ---------- árvore de copa ----------
D3.arvore = function (seed, cores = [0x1c3416, 0x467226]) {
  const rnd = mulberry32(seed), folha = [], casca = [];
  const cc = corCasca(0x4a3624, 4);
  casca.push({ g: D3.tronco(seed, 0.34, 0.2, 0.18), m: M4(0, -0.1, 0, 0, 0, 0, 1, 3.0, 1), c: cc });
  const pontas = [];
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + rnd();
    D3.galhos(casca, rnd, new THREE.Vector3(0, 2.4 + rnd() * 0.4, 0), new THREE.Vector3(Math.cos(a) * 0.8, 1, Math.sin(a) * 0.8).normalize(), 1.2, 0.14, 1, cc, pontas);
  }
  const cf = corFolha(cores[0], cores[1], 2.2, 5.6);
  folha.push({ g: D3.bolha(seed + 1, 1, 0.16, 1.4), m: M4(0, 4.1, 0, 0, rnd() * 6, 0, 1.75, 1.45, 1.75), c: cf });
  for (const p of pontas) {
    const s = 0.85 + rnd() * 0.45;
    folha.push({ g: D3.bolha(seed + folha.length * 7, 1, 0.18, 1.6), m: M4(p.x * 1.1, p.y + 0.3, p.z * 1.1, rnd(), rnd() * 6, 0, s, s * 0.82, s), c: cf });
  }
  return [{ g: D3.fundir(casca), mat: 'casca' }, { g: D3.fundir(folha), mat: 'folha' }];
};

// ---------- palmeira ----------
D3.fronde = function (rnd, comp) {
  const S = 7, pos = [];
  const pt = (t, lado) => {
    const x = t * comp, y = Math.sin(t * Math.PI * 0.75) * 0.55 * comp * 0.35 - t * t * comp * 0.45;
    const w = 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05)) * (lado ? 1 : 0);
    const serra = lado && (Math.round(t * S * 2) % 2) ? 0.18 : 0;
    return [x + serra * Math.abs(lado), y - w * 0.32, w * lado];
  };
  for (let i = 0; i < S; i++) {
    const t0 = i / S, t1 = (i + 1) / S;
    for (const lado of [-1, 1]) {
      const a = pt(t0, 0), b = pt(t1, 0), c = pt(t1, lado), d = pt(t0, lado);
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
};
D3.palmeira = function (seed) {
  const rnd = mulberry32(seed), casca = [], folha = [];
  const segs = 10, comp = 0.56, inc = 0.6 + rnd() * 0.8, ang = rnd() * 6.28;
  let p = new THREE.Vector3(0, -0.1, 0);
  const cTr = new THREE.Color(0x8a6a48), cTr2 = new THREE.Color(0x5e4630);
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const d = new THREE.Vector3(Math.cos(ang) * t * inc * 0.5, 1, Math.sin(ang) * t * inc * 0.5).normalize();
    const q = p.clone().addScaledVector(d, comp);
    const r = 0.24 - t * 0.08;
    const g = new THREE.CylinderGeometry(r, r * 1.22, 1, 6, 1, true);
    casca.push({ g, m: D3.entre(p, q, 1), c: (c, v, n) => { c.copy(i % 2 ? cTr : cTr2).multiplyScalar(0.75 + 0.25 * n.y); } });
    p = q;
  }
  const topo = p.clone();
  const cF = corFolha(0x243f16, 0x5a8030, topo.y - 2.2, topo.y + 0.6);
  const nF = 8 + Math.floor(rnd() * 3);
  for (let i = 0; i < nF; i++) {
    const a = i / nF * Math.PI * 2 + rnd() * 0.3, lev = (rnd() - 0.3) * 0.5;
    folha.push({ g: D3.fronde(rnd, 2.6 + rnd() * 0.9), m: new THREE.Matrix4().compose(topo, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, lev, 'YXZ')), new THREE.Vector3(1, 1, 1)), c: cF });
  }
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + rnd(); casca.push({ g: new THREE.SphereGeometry(0.16, 5, 4), m: M4(topo.x + Math.cos(a) * 0.2, topo.y - 0.18, topo.z + Math.sin(a) * 0.2), c: new THREE.Color(0x4a3418) }); }
  return [{ g: D3.fundir(casca), mat: 'casca' }, { g: D3.fundir(folha), mat: 'folhaDupla' }];
};

// ---------- arbusto ----------
D3.arbusto = function (seed, cores = [0x1e3a16, 0x45702a]) {
  const rnd = mulberry32(seed), folha = [];
  const cf = corFolha(cores[0], cores[1], -0.1, 1.1);
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, d = i ? 0.35 + rnd() * 0.35 : 0, s = i ? 0.42 + rnd() * 0.25 : 0.62;
    folha.push({ g: D3.bolha(seed + i * 13, 1, 0.2, 1.8), m: M4(Math.cos(a) * d, s * 0.7, Math.sin(a) * d, 0, rnd() * 6, 0, s, s * 0.8, s), c: cf });
  }
  return [{ g: D3.fundir(folha), mat: 'folha' }];
};

// ---------- rochas ----------
D3.rocha = function (seed, cor = 0x8a857a, musgo = null) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const r = criarRuido(seed), n3 = D3.ruido3(r); const p = g.attributes.position;
  const rnd = mulberry32(seed); const sx = 0.8 + rnd() * 0.6, sz = 0.8 + rnd() * 0.5, sy = 0.5 + rnd() * 0.35;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + n3(x * 1.1, y * 1.1, z * 1.1) * 0.75 + n3(x * 2.7, y * 2.7, z * 2.7) * 0.2;
    x *= k * sx; y *= k * sy; z *= k * sz;
    // facetas planas (corte das camadas)
    const corte = 0.55 * sy; if (y > corte) y = corte + (y - corte) * 0.25;
    if (y < -0.2) y = -0.2 + (y + 0.2) * 0.15;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  const A = new THREE.Color(cor), M = musgo ? new THREE.Color(musgo) : null;
  return [{ g: D3.fundir([{ g, c: (c, v, n) => { c.copy(A).multiplyScalar(1.5 * (0.62 + 0.38 * clamp(v.y * 1.4 + 0.5, 0, 1) + n.y * 0.1)); if (M && n.y > 0.55) c.lerp(M, clamp((n.y - 0.55) * 2.5, 0, 0.85)); } }]), mat: 'pedra' }];
};

// ---------- árvore morta ----------
D3.arvoreMorta = function (seed, cor = 0x3a3228) {
  const rnd = mulberry32(seed), casca = [];
  const cc = corCasca(cor, 5);
  casca.push({ g: D3.tronco(seed, 0.3, 0.16, 0.2), m: M4(0, -0.1, 0, 0, 0, 0, 1, 2.6, 1), c: cc });
  const n = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + rnd();
    D3.galhos(casca, rnd, new THREE.Vector3(0, 2.2 + rnd() * 0.3, 0), new THREE.Vector3(Math.cos(a) * 0.7, 1, Math.sin(a) * 0.7).normalize(), 1.5, 0.13, 2, cc);
  }
  return [{ g: D3.fundir(casca), mat: 'casca' }];
};

// ---------- cacto (saguaro) ----------
D3.cacto = function (seed) {
  const rnd = mulberry32(seed), itens = [];
  const A = new THREE.Color(0x3a5a28), B = new THREE.Color(0x5e7e3a);
  const cor = (c, v, n) => { const a = Math.atan2(n.z, n.x); corMix(c, A, B, 0.5 + 0.5 * Math.cos(a * 5)).multiplyScalar(0.7 + 0.3 * clamp(v.y / 3, 0, 1)); };
  const coluna = (r, h) => {
    const g = new THREE.CylinderGeometry(r, r * 1.05, h, 10, 1, true); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + Math.cos(a * 5) * 0.07; p.setX(i, x * k); p.setZ(i, z * k); }
    g.computeVertexNormals(); return g;
  };
  const cupula = (r) => new THREE.SphereGeometry(r, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  const H = 2.6 + rnd() * 0.8;
  itens.push({ g: coluna(0.3, H), m: M4(0, H / 2 - 0.1, 0), c: cor }, { g: cupula(0.3), m: M4(0, H - 0.1, 0), c: cor });
  const nb = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < nb; i++) {
    const lado = i ? -1 : 1, y0 = 0.9 + rnd() * 0.7, sai = 0.55 + rnd() * 0.2, sobe = 0.7 + rnd() * 0.6;
    itens.push({ g: coluna(0.17, sai), m: M4(lado * sai / 2, y0, 0, 0, 0, Math.PI / 2), c: cor });
    itens.push({ g: new THREE.SphereGeometry(0.17, 8, 5), m: M4(lado * sai, y0, 0), c: cor });
    itens.push({ g: coluna(0.17, sobe), m: M4(lado * sai, y0 + sobe / 2, 0), c: cor }, { g: cupula(0.17), m: M4(lado * sai, y0 + sobe, 0), c: cor });
  }
  return [{ g: D3.fundir(itens), mat: 'cacto' }];
};

// ---------- cristais ----------
D3.cristais = function (seed, corA, corB) {
  const rnd = mulberry32(seed), itens = [];
  const prisma = () => { const g = new THREE.CylinderGeometry(1, 1, 1, 6, 1); g.translate(0, 0.5, 0); return g; };
  const ponta = () => { const g = new THREE.ConeGeometry(1, 0.6, 6); g.translate(0, 1.3, 0); return g; };
  const n = 4 + Math.floor(rnd() * 3);
  const A = new THREE.Color(corA), B = new THREE.Color(corB);
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, d = i ? 0.25 + rnd() * 0.35 : 0, s = i ? 0.5 + rnd() * 0.4 : 1;
    const m = M4(Math.cos(a) * d, -0.1, Math.sin(a) * d, Math.cos(a) * d * 0.9, rnd(), -Math.sin(a) * d * 0.9, 0.18 * s, 1.5 * s, 0.18 * s);
    const c = (cc, v) => { corMix(cc, A, B, v.y / 2); };
    itens.push({ g: prisma(), m, c }, { g: ponta(), m: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.3, 0)), c });
  }
  return [{ g: D3.fundir(itens), mat: 'cristal' }];
};

// ---------- estalagmite ----------
D3.estalagmite = function (seed) {
  const rnd = mulberry32(seed), itens = [], A = new THREE.Color(0x4a444a);
  const pico = (s) => { const g = new THREE.ConeGeometry(1, 1, 7, 3, true); g.translate(0, 0.5, 0); const r = criarRuido(seed + s); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + r.n(a * 1.5, y * 4) * 0.25 + Math.cos(y * 9) * 0.05; p.setXYZ(i, x * k, y, z * k); } g.computeVertexNormals(); return g; };
  itens.push({ g: pico(0), m: M4(0, -0.1, 0, 0, 0, 0, 0.6, 2.9, 0.6) });
  for (let i = 0; i < 2; i++) { const a = rnd() * 6.28; itens.push({ g: pico(i + 1), m: M4(Math.cos(a) * 0.55, -0.1, Math.sin(a) * 0.55, 0, 0, 0, 0.32, 1.1 + rnd() * 0.6, 0.32) }); }
  for (const it of itens) it.c = (c, v) => { c.copy(A).multiplyScalar(0.55 + 0.5 * clamp(v.y / 2.5, 0, 1)); };
  return [{ g: D3.fundir(itens), mat: 'pedra' }];
};

// ---------- coluna arruinada ----------
D3.pilar = function (seed) {
  const rnd = mulberry32(seed), itens = [], A = new THREE.Color(0xd8c098), Bc = new THREE.Color(0xb09868);
  const alt = 2 + rnd() * 2.4;
  const fuste = new THREE.CylinderGeometry(0.5, 0.56, alt, 12, 2, true); fuste.translate(0, alt / 2 + 0.5, 0);
  const p = fuste.attributes.position, r = criarRuido(seed);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x); const k = 1 - Math.max(0, Math.cos(a * 6)) * 0.07; p.setX(i, x * k); p.setZ(i, z * k);
    if (y > alt + 0.4) p.setY(i, y - Math.max(0, r.n(a * 2, 1) + 0.3) * 0.7); }
  fuste.computeVertexNormals();
  const cor = (c, v, n) => { corMix(c, Bc, A, clamp(v.y / 4, 0, 1)).multiplyScalar(0.75 + 0.25 * Math.abs(n.y)); };
  itens.push({ g: fuste, c: cor, uv: 2 });
  itens.push({ g: new THREE.BoxGeometry(1.5, 0.35, 1.5), m: M4(0, 0.17, 0), c: cor }, { g: new THREE.CylinderGeometry(0.68, 0.72, 0.2, 12), m: M4(0, 0.45, 0), c: cor });
  if (rnd() < 0.55) { // capitel caído ao lado
    const a = rnd() * 6.28; itens.push({ g: new THREE.BoxGeometry(1.4, 0.4, 1.4), m: M4(Math.cos(a) * 1.4, 0.15, Math.sin(a) * 1.4, 0.15, a, 0.1), c: cor });
  }
  return [{ g: D3.fundir(itens), mat: 'arenito' }];
};

// ---------- ossada (costelas de criatura) ----------
D3.ossada = function (seed) {
  const rnd = mulberry32(seed), itens = [], A = new THREE.Color(0xe4dcc4);
  const c = (cc, v) => { cc.copy(A).multiplyScalar(0.7 + 0.3 * clamp(v.y, 0, 1)); };
  itens.push({ g: new THREE.CylinderGeometry(0.09, 0.07, 2.6, 5, 1, true), m: M4(0, 0.12, 0, 0, 0, Math.PI / 2), c });
  for (let i = 0; i < 5; i++) {
    const x = -1 + i * 0.5, s = 1 - Math.abs(i - 1.5) * 0.18;
    for (const lado of [-1, 1]) itens.push({ g: new THREE.TorusGeometry(0.7 * s, 0.045, 4, 6, Math.PI * 0.55), m: M4(x, 0.12, 0, 0, Math.PI / 2, lado > 0 ? 0 : Math.PI).multiply(new THREE.Matrix4().makeRotationZ(0.1)), c });
  }
  itens.push({ g: D3.bolha(seed, 0, 0.1, 2), m: M4(1.55, 0.25, 0, 0, 0, 0.3, 0.42, 0.3, 0.3), c });
  return [{ g: D3.fundir(itens), mat: 'osso' }];
};

// ---------- materiais compartilhados ----------
D3.mats = function () {
  if (D3._mats) return D3._mats;
  const base = (o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, vertexColors: true, roughness: 0.85, metalness: 0 }, o)); m.userData.cache = true; return m; };
  D3._mats = {
    casca: base({ map: GFX.tex.cascaA, normalMap: GFX.tex.cascaN, roughness: 0.95 }),
    folha: base({ flatShading: true, normalMap: GFX.tex.soloN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.75 }),
    folhaDupla: base({ side: THREE.DoubleSide, roughness: 0.7 }),
    pedra: base({ flatShading: true, map: GFX.tex.picoA, normalMap: GFX.tex.rochaN, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.92 }),
    arenito: base({ map: GFX.tex.picoA, normalMap: GFX.tex.rochaN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.9 }),
    cacto: base({ roughness: 0.65 }),
    osso: base({ roughness: 0.6 }),
    cristal: base({ flatShading: true, roughness: 0.15, metalness: 0.25, emissive: 0xffffff, emissiveIntensity: 0.0 }),
  };
  // cristais brilham com a própria cor
  D3._mats.cristal.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = vColor * 1.1;'); };
  D3._mats.cristal.customProgramCacheKey = () => 'cristal_v1';
  return D3._mats;
};

// cria as variantes de cada tipo de decoração (chamado por initDecor)
D3.registrar = function () {
  const mats = D3.mats();
  const V = (fn, n, esc) => ({ esc, variantes: Array.from({ length: n }, (_, i) => fn(1000 + i * 97).map(p => ({ g: p.g, m: mats[p.mat], mx: new THREE.Matrix4() }))) });
  const sub = (tipo, def) => { DECOR[tipo] = def; };
  sub('pinheiro', V(s => D3.pinheiro(s), 3, [0.85, 1.5]));
  sub('pinheiroNeve', V(s => D3.pinheiro(s, 1), 3, [0.85, 1.5]));
  sub('arvore', V(s => D3.arvore(s), 3, [0.85, 1.4]));
  sub('palmeira', V(s => D3.palmeira(s), 3, [0.9, 1.3]));
  sub('arbusto', V(s => D3.arbusto(s), 3, [0.8, 1.5]));
  sub('rocha', V(s => D3.rocha(s), 3, [0.6, 2.4]));
  sub('arvoreMorta', V(s => D3.arvoreMorta(s), 3, [0.9, 1.5]));
  sub('cacto', V(s => D3.cacto(s), 3, [0.8, 1.3]));
  sub('estalagmite', V(s => D3.estalagmite(s), 3, [0.7, 2.0]));
  sub('pilar', V(s => D3.pilar(s), 3, [0.8, 1.2]));
  sub('ossada', V(s => D3.ossada(s), 2, [0.8, 1.5]));
  sub('cristal', V(s => D3.cristais(s, 0x5a30d0, 0xb0a0ff), 3, [0.6, 1.6]));
  sub('cristalGelo', V(s => D3.cristais(s, 0x6aa8d0, 0xe8f8ff), 3, [0.6, 1.6]));
  // rocha vulcânica: rocha escura + veio incandescente (parte extra)
  const brasa = DECOR.rochaVulc.partes[1];
  DECOR.rochaVulc = { esc: [0.8, 2.8], variantes: Array.from({ length: 3 }, (_, i) => D3.rocha(2000 + i * 31, 0x2e2422).map(p => ({ g: p.g, m: mats[p.mat], mx: new THREE.Matrix4() })).concat([brasa])) };
  // árvore queimada: galhos carbonizados + brasas no tronco
  const brasaT = DECOR.arvoreQueimada.partes[DECOR.arvoreQueimada.partes.length - 1];
  DECOR.arvoreQueimada = { esc: [0.9, 1.5], variantes: Array.from({ length: 3 }, (_, i) => D3.arvoreMorta(3000 + i * 41, 0x161010).map(p => ({ g: p.g, m: mats[p.mat], mx: new THREE.Matrix4() })).concat([brasaT])) };
};

// adiciona um modelo de decoração a um grupo (cidades, menus)
D3.colocar = function (tipo, pai, x, y, z, s = 1, ang = 0, variante = 0) {
  const d = DECOR[tipo]; if (!d) return null;
  const partes = d.variantes ? d.variantes[variante % d.variantes.length] : d.partes;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ang; g.scale.setScalar(s);
  for (const p of partes) { const m = new THREE.Mesh(p.g, p.m); m.applyMatrix4(p.mx); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  pai.add(g); return g;
};
