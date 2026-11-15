// ============================================================
//  Modelos procedurais e animação
//  Todos os modelos olham para +Z
// ============================================================
'use strict';

const MOD = {};
const _gcache = {};
function G(key, fn) { if (!_gcache[key]) { const g = fn(); g.userData.cache = true; _gcache[key] = g; } return _gcache[key]; }
function capsula(r, len) {
  return G('cap' + r.toFixed(3) + '_' + len.toFixed(3), () => {
    const pts = []; const s = 5;
    for (let i = 0; i <= s; i++) { const a = -Math.PI / 2 + (i / s) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r, -len / 2 + Math.sin(a) * r)); }
    for (let i = 0; i <= s; i++) { const a = (i / s) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r, len / 2 + Math.sin(a) * r)); }
    return new THREE.LatheGeometry(pts, 12);
  });
}
const gEsf = () => G('esf', () => new THREE.SphereGeometry(1, 18, 14));
const gEsfB = () => G('esfB', () => new THREE.SphereGeometry(1, 8, 6));
const gCone = () => G('cone', () => new THREE.ConeGeometry(1, 1, 10));
const gCil = () => G('cil', () => new THREE.CylinderGeometry(1, 1, 1, 10));
const gCaixa = () => G('caixa', () => new THREE.BoxGeometry(1, 1, 1));
const gOcta = () => G('octa', () => new THREE.OctahedronGeometry(1, 0));
const gDode = () => G('dode', () => new THREE.DodecahedronGeometry(1, 0));
const gToro = () => G('toro', () => new THREE.TorusGeometry(1, 0.12, 6, 18));
const gMeiaEsf = () => G('meiaEsf', () => new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2));

function criarMats() {
  const lista = [];
  const fn = (cor, o = {}) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: 0.7, metalness: 0.05 }, o));
    m.userData.emi = m.emissive.clone(); m.userData.emiI = m.emissiveIntensity; lista.push(m);
    if (typeof GFX !== 'undefined') GFX.patchPersonagem(m);
    return m;
  };
  fn.lista = lista; return fn;
}
function P(geo, mat, pai, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, sombra = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = sombra; pai.add(m); return m;
}
function N(pai, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); pai.add(g); return g; }
function asaGeo(tipo) {
  return G('asa' + tipo, () => {
    const s = new THREE.Shape();
    if (tipo === 'morcego') { s.moveTo(0, 0); s.lineTo(1.0, 0.35); s.lineTo(1.3, -0.1); s.lineTo(1.0, -0.2); s.lineTo(0.75, -0.55); s.lineTo(0.5, -0.3); s.lineTo(0.25, -0.6); s.lineTo(0, -0.25); }
    else { s.moveTo(0, 0); s.quadraticCurveTo(0.7, 0.4, 1.4, 0.05); s.lineTo(1.2, -0.12); s.lineTo(1.05, -0.05); s.lineTo(0.9, -0.25); s.lineTo(0.7, -0.15); s.lineTo(0.5, -0.38); s.lineTo(0.3, -0.25); s.lineTo(0, -0.3); }
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g;
  });
}

// ---------------- armas ----------------
function armaMachado(mk, pai, grande = 1) {
  const g = N(pai, 0, -0.05, 0.05); g.rotation.x = Math.PI / 2;
  P(gCil(), mk(0x5a3a22), g, 0, 0.25 * grande, 0, 0.035 * grande, 0.95 * grande, 0.035 * grande);
  const lam = mk(0xb8bcc8, { metalness: 0.85, roughness: 0.3 });
  P(G('lamina', () => { const s = new THREE.Shape(); s.moveTo(0, -0.15); s.quadraticCurveTo(0.42, -0.3, 0.45, 0.05); s.quadraticCurveTo(0.42, 0.32, 0, 0.18); const e = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }); e.translate(0, 0, -0.02); return e; }), lam, g, 0.03, 0.62 * grande, 0, grande, grande, grande);
  return g;
}
function armaCajado(mk, pai, corOrbe = 0x80c0ff) {
  const g = N(pai, 0, -0.05, 0); g.rotation.x = Math.PI / 2 - 0.15;
  P(gCil(), mk(0x4a3020, { roughness: 0.8 }), g, 0, 0.3, 0, 0.035, 1.7, 0.035);
  P(gToro(), mk(0xc8a050, { metalness: 0.8, roughness: 0.35 }), g, 0, 1.18, 0, 0.12, 0.12, 0.12);
  const orbe = P(gEsf(), mk(corOrbe, { emissive: corOrbe, emissiveIntensity: 2.2, roughness: 0.2 }), g, 0, 1.2, 0, 0.1, 0.1, 0.1, false);
  g.userData.orbe = orbe; return g;
}
function armaArco(mk, pai) {
  const g = N(pai, 0, -0.06, 0.02); g.rotation.y = Math.PI / 2;
  const arco = P(G('arcoG', () => new THREE.TorusGeometry(0.62, 0.025, 6, 20, Math.PI * 0.85)), mk(0x6a4428, { roughness: 0.6 }), g, -0.22, 0, 0, 1, 1, 1);
  arco.rotation.z = Math.PI / 2 + Math.PI * 0.075; arco.rotation.y = Math.PI / 2;
  const corda = P(gCil(), mk(0xe8e0d0), g, 0.12, 0, 0, 0.006, 1.15, 0.006, false);
  g.userData.corda = corda; return g;
}
function armaEspada(mk, pai, comp = 0.8) {
  const g = N(pai, 0, -0.05, 0.05); g.rotation.x = Math.PI / 2;
  P(gCaixa(), mk(0xc0c4cc, { metalness: 0.85, roughness: 0.3 }), g, 0, comp * 0.55, 0, 0.07, comp, 0.02);
  P(gCaixa(), mk(0x8a6a3a, { metalness: 0.5 }), g, 0, 0.1, 0, 0.22, 0.04, 0.05);
  return g;
}
function armaLanca(mk, pai) {
  const g = N(pai, 0, -0.05, 0.05); g.rotation.x = Math.PI / 2 - 0.2;
  P(gCil(), mk(0x6a5030), g, 0, 0.4, 0, 0.03, 2.0, 0.03);
  P(gCone(), mk(0xa0a4ac, { metalness: 0.8, roughness: 0.3 }), g, 0, 1.5, 0, 0.07, 0.3, 0.07);
  return g;
}
function escudo(mk, pai, cor = 0x7a5a3a) {
  const g = N(pai, 0.08, -0.15, 0.05); g.rotation.z = Math.PI / 2; g.rotation.y = Math.PI / 2;
  P(G('escudoG', () => new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20)), mk(cor, { roughness: 0.6, metalness: 0.2 }), g, 0, 0, 0);
  P(G('escudoB', () => new THREE.TorusGeometry(0.42, 0.035, 6, 24)), mk(0xa0a4ac, { metalness: 0.85, roughness: 0.3 }), g, 0, 0, 0).rotation.x = Math.PI / 2;
  P(gEsf(), mk(0xc0a050, { metalness: 0.9, roughness: 0.3 }), g, 0, 0.04, 0, 0.1, 0.06, 0.1);
  return g;
}

// ============================================================
//  Humanoide
// ============================================================
MOD.humanoide = function (v, mk, o = {}) {
  const raiz = new THREE.Group();
  const corpo = N(raiz);
  const L = v.bracosLongos ? 1.35 : 1;
  const magro = v.esqueleto ? 0.55 : 1;
  const bulk = (o.bulk || 1) * (v.peludo ? 1.25 : 1);
  const flat = v.pedra ? { flatShading: true, roughness: 0.95 } : {};
  const mPele = mk(v.pele, Object.assign({ roughness: v.esqueleto ? 0.6 : 0.65 }, v.brilho ? { emissive: v.brilho, emissiveIntensity: 0.35 } : {}, flat));
  const mRoupa = mk(v.roupa, Object.assign({ roughness: 0.85 }, flat));
  const mBota = mk(v.bota || 0x2a2018, { roughness: 0.9 });
  const mOlho = mk(0x000000, { emissive: v.olhos || 0xffffff, emissiveIntensity: 2.5 });
  const quadril = N(corpo, 0, 0.95, 0);
  const pernas = [];
  for (const lado of [1, -1]) {
    const coxa = N(quadril, 0.15 * lado * bulk, 0, 0);
    P(capsula(0.105 * magro * bulk, 0.28), v.esqueleto ? mPele : mRoupa, coxa, 0, -0.22, 0);
    const joelho = N(coxa, 0, -0.45, 0);
    P(capsula(0.09 * magro * bulk, 0.28), v.esqueleto ? mPele : (v.saia ? mBota : mRoupa), joelho, 0, -0.21, 0);
    P(G('pe', () => new THREE.BoxGeometry(0.15, 0.09, 0.27)), mBota, joelho, 0, -0.45, 0.05, bulk, 1, 1);
    pernas.push({ coxa, joelho });
  }
  const torso = N(quadril);
  P(gEsf(), mRoupa, torso, 0, 0.04, 0, 0.23 * bulk, 0.15, 0.17 * bulk);
  if (v.esqueleto) {
    P(gCil(), mPele, torso, 0, 0.3, -0.04, 0.035, 0.55, 0.035);
    for (let i = 0; i < 4; i++) { const r = P(gToro(), mPele, torso, 0, 0.28 + i * 0.08, 0.0, 0.15 - i * 0.008, 0.11, 0.6); r.rotation.x = Math.PI / 2; r.scale.set(0.16 - i * 0.01, 0.12, 0.6); }
  } else {
    P(capsula(0.19 * bulk, 0.16), v.corPeito ? mk(v.corPeito) : mRoupa, torso, 0, 0.26, 0, 1, 1, 0.82);
    P(gEsf(), v.corPeito ? mk(v.corPeito) : mRoupa, torso, 0, 0.5, 0, 0.31 * bulk, 0.25, 0.2 * bulk);
  }
  if (v.faixas) for (let i = 0; i < 3; i++) { const f = P(gToro(), mk(0xd8ccaa), torso, 0, 0.2 + i * 0.14, 0, 0.21 * bulk, 0.21 * bulk, 0.5); f.rotation.x = Math.PI / 2; }
  P(capsula(0.065, 0.06), mPele, torso, 0, 0.7, 0);
  const cabeca = N(torso, 0, 0.84, 0.0);
  const cab = P(gEsf(), mPele, cabeca, 0, 0, 0, 0.16, 0.175, 0.165);
  if (v.esqueleto) { cab.scale.set(0.15, 0.16, 0.16); P(gCaixa(), mPele, cabeca, 0, -0.1, 0.06, 0.16, 0.06, 0.12); }
  for (const lado of [1, -1]) P(gEsfB(), mOlho, cabeca, 0.06 * lado, 0.02, 0.135, 0.028, 0.022, 0.02, false);
  if (v.capuz) {
    P(gEsf(), mRoupa, cabeca, 0, 0.02, -0.02, 0.2, 0.21, 0.21);
    P(gCone(), mRoupa, cabeca, 0, 0.2, -0.08, 0.15, 0.28, 0.15).rotation.x = -0.5;
    cab.scale.multiplyScalar(0.95);
  }
  if (v.chapeu) { P(gCone(), mRoupa, cabeca, 0, 0.32, -0.03, 0.17, 0.55, 0.17).rotation.x = -0.25; P(G('aba', () => new THREE.CylinderGeometry(1, 1, 0.02, 20)), mRoupa, cabeca, 0, 0.1, 0, 0.32, 1, 0.32); }
  if (v.elmo) {
    const mm = mk(v.elmo, { metalness: 0.8, roughness: 0.35 });
    P(gMeiaEsf(), mm, cabeca, 0, -0.01, 0, 0.19, 0.22, 0.19);
    P(gCaixa(), mm, cabeca, 0, 0.0, 0.16, 0.03, 0.14, 0.03);
    for (const lado of [1, -1]) { const c = P(gCone(), mk(0xe0d8c0), cabeca, 0.17 * lado, 0.12, 0, 0.04, 0.2, 0.04); c.rotation.z = -lado * 1.0; }
  }
  if (v.chifres) for (const lado of [1, -1]) {
    const c = P(gCone(), mk(v.corChifre || 0x2a2018, { roughness: 0.5 }), cabeca, 0.1 * lado, 0.16, -0.02, 0.05, 0.32, 0.05);
    c.rotation.z = -lado * 0.6; c.rotation.x = -0.4;
  }
  if (v.cabelo) P(gCone(), mk(v.cabelo), cabeca, 0, -0.08, -0.1, 0.17, 0.5, 0.12).rotation.x = 0.25;
  if (v.coroa) for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; P(gCone(), mk(v.coroa, { metalness: 0.9, roughness: 0.3, emissive: v.coroa, emissiveIntensity: 0.2 }), cabeca, Math.cos(a) * 0.14, 0.18, Math.sin(a) * 0.14, 0.03, 0.13, 0.03); }
  // braços
  const bracos = [];
  for (const lado of [1, -1]) {
    const ombro = N(torso, 0.33 * bulk * lado, 0.6, 0);
    P(gEsf(), v.ombreira ? mk(v.ombreira, { metalness: 0.8, roughness: 0.35 }) : mRoupa, ombro, 0, 0, 0, 0.12 * bulk * (v.ombreira ? 1.35 : 1), 0.11 * bulk * (v.ombreira ? 1.25 : 1), 0.12 * bulk * (v.ombreira ? 1.35 : 1));
    P(capsula(0.075 * magro * bulk, 0.22 * L), v.mangas ? mRoupa : mPele, ombro, 0, -0.17 * L, 0);
    const cotovelo = N(ombro, 0, -0.34 * L, 0);
    P(capsula(0.065 * magro * bulk, 0.2 * L), mPele, cotovelo, 0, -0.15 * L, 0);
    const mao = N(cotovelo, 0, -0.31 * L, 0);
    P(gEsf(), v.luva ? mk(v.luva) : mPele, mao, 0, 0, 0, 0.075 * bulk, 0.08, 0.075 * bulk);
    if (v.garras) for (let k = -1; k <= 1; k++) P(gCone(), mk(0x1a1410), mao, k * 0.04, -0.1, 0.03, 0.02, 0.12, 0.02).rotation.x = Math.PI;
    bracos.push({ ombro, cotovelo, mao });
  }
  const partes = { raiz, corpo, quadril, torso, cabeca, pE: pernas[0].coxa, pD: pernas[1].coxa, jE: pernas[0].joelho, jD: pernas[1].joelho,
    oE: bracos[0].ombro, oD: bracos[1].ombro, cE: bracos[0].cotovelo, cD: bracos[1].cotovelo, maoE: bracos[0].mao, maoD: bracos[1].mao };
  // extras
  if (v.saia) { const s = P(G('saia', () => new THREE.CylinderGeometry(0.2, 0.42, 0.75, 16, 1, true)), mk(v.saia, { side: THREE.DoubleSide, roughness: 0.85 }), quadril, 0, -0.3, 0); partes.saia = s; }
  if (v.capa) { const c = N(torso, 0, 0.62, -0.17); P(gCaixa(), mk(v.capa, { roughness: 0.9 }), c, 0, -0.45, 0, 0.5, 0.95, 0.03); partes.capa = c; }
  if (v.corcunda) { torso.rotation.x = 0.42; cabeca.rotation.x = -0.3; P(gEsf(), mRoupa, torso, 0, 0.55, -0.12, 0.25, 0.2, 0.18); }
  if (v.peludo) { for (let i = 0; i < 6; i++) P(gEsfB(), mRoupa, torso, (Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.35, -0.1 + (Math.random() - 0.5) * 0.25, 0.16, 0.14, 0.14); }
  if (v.galhos) {
    const mg = mk(0x3a2a18, { roughness: 0.95 }), mf = mk(0x3a5a22, { flatShading: true });
    const add = (pai, x, y, z, rz, rx, c) => { const g = N(pai, x, y, z); g.rotation.set(rx, 0, rz); P(gCil(), mg, g, 0, c / 2, 0, 0.04, c, 0.04); P(gDode(), mf, g, 0, c, 0, 0.14, 0.12, 0.14); };
    add(torso, 0.25, 0.65, -0.05, -0.6, 0.1, 0.55); add(torso, -0.2, 0.7, -0.1, 0.7, -0.2, 0.6); add(cabeca, 0.05, 0.12, 0, -0.3, 0, 0.45); add(cabeca, -0.06, 0.1, -0.03, 0.4, -0.2, 0.35);
    add(partes.oD, 0.06, -0.1, 0, -1.2, 0, 0.3);
  }
  if (v.pedra) { const mp = mk(v.pele, { flatShading: true, roughness: 1 }); P(gDode(), mp, partes.oE, 0.04, 0.05, 0, 0.2, 0.18, 0.2); P(gDode(), mp, partes.oD, -0.04, 0.05, 0, 0.2, 0.18, 0.2); P(gDode(), mp, torso, 0, 0.55, -0.12, 0.3, 0.28, 0.2); }
  if (v.cristais) { const mc = mk(v.cristais, { emissive: v.cristais, emissiveIntensity: 1.6, roughness: 0.2 }); for (let i = 0; i < 5; i++) { const c = P(gOcta(), mc, torso, (Math.random() - 0.5) * 0.4, 0.45 + Math.random() * 0.3, -0.2, 0.05, 0.18, 0.05, false); c.rotation.set(-0.5 + Math.random() * 0.3, 0, (Math.random() - 0.5)); } }
  if (v.algas) { const ma = mk(0x2a5a3a, { roughness: 0.9 }); for (let i = 0; i < 6; i++) { const pai = [partes.oE, partes.oD, torso][i % 3]; P(gCil(), ma, pai, (Math.random() - 0.5) * 0.15, -0.2 - Math.random() * 0.1, (Math.random() - 0.5) * 0.15, 0.015, 0.4, 0.015, false); } }
  if (v.asas) {
    const ma = mk(v.corAsa || 0x2a1010, { side: THREE.DoubleSide, roughness: 0.8 });
    partes.asas = [];
    for (const lado of [1, -1]) {
      const a = N(torso, 0.12 * lado, 0.55, -0.15);
      const m = P(asaGeo('morcego'), ma, a, 0, 0, 0, 1.3 * lado, 1, 1.3);
      m.rotation.x = Math.PI / 2 - 0.3; m.rotation.y = 0;
      partes.asas.push(a);
    }
  }
  if (v.cauda) {
    let pai = quadril; partes.cauda = [];
    for (let i = 0; i < 4; i++) { const s = N(pai, 0, i === 0 ? 0 : -0.0, i === 0 ? -0.15 : -0.2); s.rotation.x = 0.35; P(capsula(0.05 - i * 0.008, 0.12), mPele, s, 0, 0, -0.1, 1, 1, 1).rotation.x = Math.PI / 2; partes.cauda.push(s); pai = s; }
    P(gCone(), mPele, pai, 0, 0, -0.25, 0.06, 0.14, 0.06).rotation.x = -Math.PI / 2;
  }
  // armas
  if (v.cajado) partes.arma = armaCajado(mk, partes.maoD, v.olhos || 0x80c0ff);
  if (v.arco) partes.arma = armaArco(mk, partes.maoE);
  if (v.lanca) partes.arma = armaLanca(mk, partes.maoD);
  if (v.machado) partes.arma = armaMachado(mk, partes.maoD, v.machado);
  if (v.espada) partes.arma = armaEspada(mk, partes.maoD, v.espada);
  if (v.escudo) partes.escudo = escudo(mk, partes.cE, v.escudo);
  if (v.adagas) { armaEspada(mk, partes.maoE, 0.35); }
  if (v.aljava) { const q = N(torso, 0.1, 0.45, -0.22); q.rotation.z = 0.4; P(gCil(), mk(0x5a3a22), q, 0, 0, 0, 0.08, 0.6, 0.08); for (let i = 0; i < 4; i++) P(gCone(), mk(0xe0d8c0), q, (i - 1.5) * 0.03, 0.36, 0, 0.03, 0.12, 0.01, false); }
  return { raiz, p: partes, mats: mk.lista, rig: 'humanoide', alturaCabeca: 1.85 };
};

MOD.animHumanoide = function (m, s) {
  const p = m.p; const w = s.andar; const f = s.fase; const sw = Math.sin(f);
  const ataca = s.atq != null;
  p.pE.rotation.x = -sw * 0.75 * w; p.pD.rotation.x = sw * 0.75 * w;
  p.jE.rotation.x = (0.1 + Math.max(0, Math.cos(f))) * 0.9 * w; p.jD.rotation.x = (0.1 + Math.max(0, -Math.cos(f))) * 0.9 * w;
  p.corpo.position.y = Math.abs(Math.cos(f)) * 0.07 * w;
  const resp = Math.sin(s.t * 2.2) * 0.025;
  p.torso.rotation.y = sw * 0.12 * w;
  p.torso.rotation.z = 0;
  p.torso.position.y = resp * 0.5;
  // braços base
  let oEx = sw * 0.6 * w, oDx = -sw * 0.6 * w, oEz = 0.08 + resp, oDz = -0.08 - resp, cEx = -0.3 - 0.25 * w, cDx = -0.3 - 0.25 * w;
  if (m.estilo === 'cajado' || m.estilo === 'conjurador') { oDx = -0.35 + oDx * 0.3; cDx = -0.9; }
  if (m.estilo === 'arco') { oEx = -0.3 + oEx * 0.3; cEx = -0.6; }
  if (m.estilo === 'escudo') { oEx = -0.25; cEx = -1.2; oEz = 0.25; }
  if (ataca) {
    const k = s.atq;
    const tipo = s.tipoAtq || 'golpe';
    if (tipo === 'golpe') {
      const sube = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
      oDx = lerp(0.5, -2.7, k < 0.35 ? k / 0.35 : 1 - Math.min(1, (k - 0.35) / 0.3) * 1.2);
      oDz = -0.2 - sube * 0.3; cDx = -0.4 * sube;
      p.torso.rotation.y = k < 0.35 ? 0.5 * k / 0.35 : 0.5 - 1.1 * Math.min(1, (k - 0.35) / 0.4);
      p.torso.rotation.x = (m.baseTorsoX || 0) + (k > 0.35 ? 0.25 * Math.sin(Math.min(1, (k - 0.35) / 0.65) * Math.PI) : -0.1 * k / 0.35);
    } else if (tipo === 'giro') {
      p.torso.rotation.y = k * Math.PI * 2; oDx = -1.5; oEx = -1.5; oDz = -1.2; oEz = 1.2;
    } else if (tipo === 'disparo') {
      oEx = -1.55; cEx = -0.05; oDx = -1.5; cDx = -1.6 * (k < 0.7 ? k / 0.7 : 0); oEz = 0.0; oDz = 0.2;
      p.torso.rotation.y = 0.0;
      if (p.arma && p.arma.userData.corda) p.arma.userData.corda.position.x = 0.12 - (k < 0.7 ? k / 0.7 : 0) * 0.25;
    } else if (tipo === 'conjurar') {
      const e = Math.sin(Math.min(1, k) * Math.PI);
      oDx = -0.5 - 1.6 * e; cDx = -0.3; oEx = -0.4 - 1.2 * e; cEx = -0.3; oEz = 0.3 * e; oDz = -0.3 * e;
    } else if (tipo === 'erguer') {
      const e = Math.sin(Math.min(1, k) * Math.PI);
      oDx = -2.8 * e; oEx = -2.8 * e; oDz = -0.3; oEz = 0.3; cDx = cEx = -0.2;
    }
  } else if (p.arma && p.arma.userData.corda) p.arma.userData.corda.position.x = 0.12;
  if (!ataca || s.tipoAtq !== 'golpe') p.torso.rotation.x = (m.baseTorsoX || 0) + 0.05 * w;
  p.oE.rotation.x = oEx; p.oD.rotation.x = oDx; p.oE.rotation.z = oEz; p.oD.rotation.z = oDz;
  p.cE.rotation.x = cEx; p.cD.rotation.x = cDx;
  if (p.asas) { const a = Math.sin(s.t * (s.voando ? 10 : 2.5)) * (s.voando ? 0.6 : 0.2); p.asas[0].rotation.y = -0.5 + a; p.asas[1].rotation.y = 0.5 - a; }
  if (p.cauda) p.cauda.forEach((c, i) => { c.rotation.y = Math.sin(s.t * 3 - i * 0.7) * 0.3; });
  if (p.capa) p.capa.rotation.x = 0.1 + w * 0.35 + Math.sin(s.t * 3) * 0.03;
  if (p.saia) p.saia.rotation.x = -0.05 * w;
  if (p.arma && p.arma.userData.orbe) p.arma.userData.orbe.material.emissiveIntensity = 2 + Math.sin(s.t * 4) * 0.6;
};

// ============================================================
//  Quadrúpede
// ============================================================
MOD.quadrupede = function (v, mk) {
  const raiz = new THREE.Group(); const corpo = N(raiz);
  const rep = v.reptil;
  const alt = rep ? 0.42 : 0.78, comp = rep ? 0.85 : 0.7;
  const mPelo = mk(v.pelo, Object.assign({ roughness: 0.85 }, v.brilho ? { emissive: v.brilho, emissiveIntensity: 0.25 } : {}, v.espectral ? { emissive: 0x2a5070, emissiveIntensity: 0.5, transparent: true, opacity: 0.88 } : {}));
  const mEsc = mk(v.barriga || (v.pelo), { roughness: 0.8 });
  const mOlho = mk(0x000000, { emissive: v.olhos || 0xffffff, emissiveIntensity: 2.8 });
  const tronco = N(corpo, 0, alt, 0);
  P(capsula(rep ? 0.22 : 0.26, comp), mPelo, tronco, 0, 0, 0, 1, 1, rep ? 0.75 : 1).rotation.x = Math.PI / 2;
  P(gEsf(), mPelo, tronco, 0, 0.04, 0.32, 0.3, 0.3, 0.33);
  if (v.brilho && rep) for (let i = 0; i < 5; i++) P(gOcta(), mk(v.brilho, { emissive: v.brilho, emissiveIntensity: 2 }), tronco, 0, 0.17, -0.4 + i * 0.2, 0.05, 0.08, 0.06, false);
  const pescoco = N(tronco, 0, 0.12, comp * 0.62);
  pescoco.rotation.x = rep ? 0 : -0.5;
  P(capsula(0.13, 0.22), mPelo, pescoco, 0, 0.12, 0.05).rotation.x = 0.6;
  const cabeca = N(pescoco, 0, rep ? 0.05 : 0.28, rep ? 0.22 : 0.15);
  cabeca.rotation.x = rep ? 0 : 0.5;
  P(gEsf(), mPelo, cabeca, 0, 0, 0, 0.17, 0.15, 0.2);
  const focinho = P(capsula(0.08, 0.16), mPelo, cabeca, 0, -0.04, 0.2, 1.1, 0.9, 1); focinho.rotation.x = Math.PI / 2;
  const mand = N(cabeca, 0, -0.08, 0.05);
  P(gCaixa(), mEsc, mand, 0, -0.01, 0.15, 0.12, 0.04, 0.24);
  for (const lado of [1, -1]) {
    P(gEsfB(), mOlho, cabeca, 0.09 * lado, 0.05, 0.13, 0.03, 0.025, 0.02, false);
    if (!rep) P(gCone(), mPelo, cabeca, 0.09 * lado, 0.17, -0.04, 0.05, 0.14, 0.04).rotation.z = -lado * 0.2;
  }
  if (v.chifres) for (const lado of [1, -1]) {
    // galhada
    const mg = mk(0xd8c8a8, { roughness: 0.6 });
    const g = N(cabeca, 0.08 * lado, 0.12, -0.03); g.rotation.z = -lado * 0.5;
    P(gCil(), mg, g, 0, 0.3, 0, 0.025, 0.6, 0.025);
    for (let i = 0; i < 3; i++) { const r = N(g, 0, 0.2 + i * 0.15, 0); r.rotation.z = -lado * 0.9; r.rotation.x = -0.3 * i; P(gCil(), mg, r, 0, 0.12, 0, 0.018, 0.24, 0.018); }
  }
  const pernas = [];
  const L = rep ? 0.22 : 0.4;
  for (const [x, z] of [[0.18, 0.35], [-0.18, 0.35], [0.18, -0.35], [-0.18, -0.35]]) {
    const ombro = N(tronco, x * (rep ? 1.4 : 1), -0.05, z);
    if (rep) ombro.rotation.z = x > 0 ? 0.8 : -0.8;
    P(capsula(0.075, L * 0.8), mPelo, ombro, 0, -L * 0.5, 0);
    const joelho = N(ombro, 0, -L, 0);
    if (rep) joelho.rotation.z = x > 0 ? -1.3 : 1.3;
    P(capsula(0.055, L * 0.75), mPelo, joelho, 0, -L * 0.45, 0);
    P(gEsf(), mEsc, joelho, 0, -L * 0.95, 0.03, 0.07, 0.04, 0.09);
    pernas.push({ ombro, joelho });
  }
  const cauda = [];
  if (v.cauda) {
    let pai = N(tronco, 0, 0.05, -comp * 0.62);
    for (let i = 0; i < (rep ? 6 : 4); i++) {
      const s = N(pai, 0, 0, i === 0 ? 0 : -0.16); s.rotation.x = rep ? 0.05 : (i === 0 ? 0.6 : 0.15);
      P(capsula((rep ? 0.12 : 0.07) * (1 - i * 0.13), 0.1), mPelo, s, 0, 0, -0.08).rotation.x = Math.PI / 2;
      cauda.push(s); pai = s;
    }
  }
  return { raiz, p: { raiz, corpo, tronco, pescoco, cabeca, mand, pernas, cauda }, mats: mk.lista, rig: 'quadrupede', alturaCabeca: alt + 0.6 };
};
MOD.animQuadrupede = function (m, s) {
  const p = m.p; const w = s.andar; const f = s.fase * 1.15;
  const fases = [0, Math.PI, Math.PI, 0];
  p.pernas.forEach((pp, i) => {
    const a = Math.sin(f + fases[i]);
    pp.ombro.rotation.x = a * 0.65 * w;
    pp.joelho.rotation.x = (i < 2 ? -1 : 1) * Math.max(0, Math.cos(f + fases[i])) * 0.7 * w;
  });
  p.tronco.position.y = (p.tronco.userData.y0 ?? (p.tronco.userData.y0 = p.tronco.position.y)) + Math.abs(Math.sin(f)) * 0.06 * w + Math.sin(s.t * 2) * 0.01;
  p.tronco.rotation.x = Math.sin(f * 2) * 0.03 * w;
  p.cabeca.rotation.y = Math.sin(s.t * 0.7) * 0.15 * (1 - w);
  p.mand.rotation.x = 0.05 + Math.max(0, Math.sin(s.t * 1.3)) * 0.05;
  p.cauda.forEach((c, i) => { c.rotation.y = Math.sin(s.t * 4 - i * 0.6) * 0.25 * (1 + w); });
  if (s.atq != null) {
    const k = s.atq; const e = Math.sin(Math.min(1, k) * Math.PI);
    p.tronco.rotation.x = -0.15 * e + (k > 0.4 ? 0.2 * e : 0);
    p.corpo.position.z = e * 0.35;
    p.mand.rotation.x = 0.6 * e;
    p.pescoco.rotation.x = (p.pescoco.userData.x0 ?? (p.pescoco.userData.x0 = p.pescoco.rotation.x)) + 0.4 * e;
  } else { p.corpo.position.z = 0; if (p.pescoco.userData.x0 !== undefined) p.pescoco.rotation.x = p.pescoco.userData.x0; }
};

// ============================================================
//  Caranguejo
// ============================================================
MOD.caranguejo = function (v, mk) {
  const raiz = new THREE.Group(); const corpo = N(raiz);
  const mC = mk(v.casca, { roughness: 0.45, metalness: 0.1 }), mG = mk(v.garra, { roughness: 0.45 });
  const mOlho = mk(0x111111, { roughness: 0.2 });
  const tronco = N(corpo, 0, 0.5, 0);
  P(gEsf(), mC, tronco, 0, 0, 0, 0.6, 0.26, 0.45);
  P(gEsf(), mk(0xd8b090), tronco, 0, -0.08, 0, 0.5, 0.15, 0.38);
  for (let i = 0; i < 5; i++) P(gCone(), mC, tronco, (i - 2) * 0.18, 0.15, -0.15 + Math.abs(i - 2) * 0.05, 0.05, 0.14, 0.05).rotation.x = -0.3;
  for (const lado of [1, -1]) { const h = N(tronco, 0.1 * lado, 0.15, 0.35); P(gCil(), mC, h, 0, 0.08, 0, 0.02, 0.16, 0.02); P(gEsfB(), mOlho, h, 0, 0.18, 0, 0.045, 0.045, 0.045, false); }
  const pernas = [];
  for (const lado of [1, -1]) for (let i = 0; i < 3; i++) {
    const quadril = N(tronco, 0.42 * lado, -0.05, 0.15 - i * 0.18); quadril.rotation.y = lado * (-0.3 + i * 0.3);
    quadril.rotation.z = lado * 0.6;
    P(capsula(0.04, 0.3), mC, quadril, 0.17 * lado, 0, 0).rotation.z = Math.PI / 2;
    const joelho = N(quadril, 0.36 * lado, 0, 0); joelho.rotation.z = -lado * 1.7;
    P(capsula(0.035, 0.36), mG, joelho, 0.2 * lado, 0, 0).rotation.z = Math.PI / 2;
    pernas.push({ quadril, joelho, lado, i });
  }
  const garras = [];
  for (const lado of [1, -1]) {
    const b = N(tronco, 0.35 * lado, 0.0, 0.32); b.rotation.y = lado * 0.5;
    P(capsula(0.06, 0.25), mG, b, 0, 0, 0.18).rotation.x = Math.PI / 2;
    const pin = N(b, 0, 0.0, 0.38);
    P(gEsf(), mG, pin, 0, 0, 0.1, 0.13, 0.1, 0.18);
    const dedo = N(pin, 0, 0.04, 0.2); P(gCone(), mG, dedo, 0, 0, 0.1, 0.05, 0.25, 0.05).rotation.x = Math.PI / 2;
    const dedo2 = N(pin, 0, -0.04, 0.2); P(gCone(), mG, dedo2, 0, 0, 0.1, 0.05, 0.25, 0.04).rotation.x = Math.PI / 2;
    garras.push({ b, dedo, dedo2 });
  }
  return { raiz, p: { raiz, corpo, tronco, pernas, garras }, mats: mk.lista, rig: 'caranguejo', alturaCabeca: 1.0 };
};
MOD.animCaranguejo = function (m, s) {
  const p = m.p; const w = s.andar; const f = s.fase * 1.8;
  p.pernas.forEach(pp => {
    const a = Math.sin(f + pp.i * 2.1 + (pp.lado > 0 ? 0 : Math.PI));
    pp.quadril.rotation.z = pp.lado * (0.6 + Math.max(0, a) * 0.35 * w);
    pp.quadril.rotation.y = pp.lado * (-0.3 + pp.i * 0.3) + a * 0.25 * w;
  });
  p.tronco.position.y = 0.5 + Math.sin(f * 2) * 0.03 * w + Math.sin(s.t * 2) * 0.01;
  p.tronco.rotation.z = Math.sin(f) * 0.05 * w;
  p.garras.forEach((g, i) => {
    let sn = 0.15 + Math.sin(s.t * 3 + i) * 0.1, lev = -0.1;
    if (s.atq != null) { const e = Math.sin(Math.min(1, s.atq) * Math.PI); lev = -0.9 * e; sn = 0.5 * (1 - e); }
    g.b.rotation.x = lev; g.dedo.rotation.x = -sn; g.dedo2.rotation.x = sn;
  });
};

// ============================================================
//  Aracnídeo (aranha, escorpião, escaravelho)
// ============================================================
MOD.aranha = function (v, mk, o = {}) {
  const raiz = new THREE.Group(); const corpo = N(raiz);
  const nP = o.pernas || 8;
  const mC = mk(v.corpo, { roughness: 0.4, metalness: o.metal || 0.1 });
  const mX = mk(v.cristal, { emissive: v.ferrao ? 0x000000 : v.cristal, emissiveIntensity: v.ferrao ? 0 : 1.3, roughness: 0.3 });
  const mOlho = mk(0x000000, { emissive: v.olhos || 0xff2020, emissiveIntensity: 2.5 });
  const tronco = N(corpo, 0, 0.55, 0);
  P(gEsf(), mC, tronco, 0, 0, 0.12, 0.3, 0.22, 0.32);
  const cab = N(tronco, 0, 0.0, 0.42);
  P(gEsf(), mC, cab, 0, 0, 0, 0.18, 0.15, 0.18);
  for (let i = 0; i < (o.olhos || 4); i++) P(gEsfB(), mOlho, cab, (i % 2 ? 1 : -1) * (0.05 + Math.floor(i / 2) * 0.05), 0.07 - Math.floor(i / 2) * 0.03, 0.15, 0.03, 0.03, 0.03, false);
  const abd = N(tronco, 0, 0.1, -0.25);
  if (o.casco) {
    P(gMeiaEsf(), mk(o.casco, { metalness: 0.75, roughness: 0.25 }), tronco, 0, 0.05, -0.05, 0.55, 0.45, 0.65);
    if (o.chifre) { const c = P(gCone(), mk(0xd8b040, { metalness: 0.9, roughness: 0.25 }), cab, 0, 0.18, 0.12, 0.07, 0.5, 0.07); c.rotation.x = 0.6; }
  } else if (!v.ferrao) {
    P(gEsf(), mC, abd, 0, 0, -0.25, 0.42 * (o.abd || 1), 0.36 * (o.abd || 1), 0.5 * (o.abd || 1));
    for (let i = 0; i < 4; i++) { const c = P(gOcta(), mX, abd, (Math.random() - 0.5) * 0.3, 0.3 * (o.abd || 1), -0.3 + (Math.random() - 0.5) * 0.3, 0.05, 0.2, 0.05, false); c.rotation.z = (Math.random() - 0.5) * 0.8; }
    if (o.marcas) P(gEsf(), mk(o.marcas, { emissive: o.marcas, emissiveIntensity: 1.5 }), abd, 0, 0.18 * (o.abd || 1), -0.3, 0.2, 0.2, 0.3, false);
  }
  const cauda = [];
  if (v.ferrao) {
    P(capsula(0.2, 0.35), mC, abd, 0, 0, -0.1).rotation.x = Math.PI / 2;
    let pai = N(abd, 0, 0.05, -0.35);
    for (let i = 0; i < 5; i++) { const s2 = N(pai, 0, 0, i === 0 ? 0 : 0.0); s2.rotation.x = -0.55; P(gEsf(), mC, s2, 0, 0.13, 0, 0.09 - i * 0.008, 0.13, 0.09 - i * 0.008); const nx = N(s2, 0, 0.24, 0); cauda.push(s2); pai = nx; }
    const fe = P(gCone(), mk(0x2a1a0a, { roughness: 0.3 }), pai, 0, 0.1, 0.05, 0.06, 0.25, 0.06); fe.rotation.x = 2.2;
  }
  const garras = [];
  if (v.pinças) for (const lado of [1, -1]) {
    const b = N(cab, 0.14 * lado, -0.05, 0.1); b.rotation.y = lado * 0.4;
    P(capsula(0.05, 0.3), mC, b, 0, 0, 0.2).rotation.x = Math.PI / 2;
    const pin = N(b, 0, 0, 0.42); P(gEsf(), mC, pin, 0, 0, 0.08, 0.1, 0.07, 0.15);
    const d = N(pin, 0.03 * lado, 0, 0.18); P(gCone(), mC, d, 0, 0, 0.1, 0.04, 0.22, 0.04).rotation.x = Math.PI / 2;
    garras.push({ b, d });
  }
  const pernas = [];
  for (const lado of [1, -1]) for (let i = 0; i < nP / 2; i++) {
    const z = 0.32 - i * (0.5 / (nP / 2 - 1 || 1));
    const q = N(tronco, 0.2 * lado, 0, z); q.rotation.y = lado * (0.6 - i * 0.4) * -1 + (lado > 0 ? 0 : 0);
    const sup = N(q); sup.rotation.z = lado * 0.8;
    P(capsula(0.035, 0.42), mC, sup, 0.23 * lado, 0, 0).rotation.z = Math.PI / 2;
    const jo = N(sup, 0.48 * lado, 0, 0); jo.rotation.z = -lado * 2.1;
    P(capsula(0.028, 0.55), mC, jo, 0.29 * lado, 0, 0).rotation.z = Math.PI / 2;
    pernas.push({ q, sup, jo, lado, i, y0: q.rotation.y });
  }
  return { raiz, p: { raiz, corpo, tronco, cab, abd, pernas, cauda, garras }, mats: mk.lista, rig: 'aranha', alturaCabeca: 1.0 };
};
MOD.animAranha = function (m, s) {
  const p = m.p; const w = s.andar; const f = s.fase * 1.6;
  p.pernas.forEach(pp => {
    const off = pp.i * Math.PI / 2 + (pp.lado > 0 ? 0 : Math.PI);
    const a = Math.sin(f + off);
    pp.q.rotation.y = pp.y0 + a * 0.35 * w;
    pp.sup.rotation.z = pp.lado * (0.8 + Math.max(0, Math.cos(f + off)) * 0.3 * w);
  });
  p.tronco.position.y = 0.55 + Math.sin(f * 2) * 0.025 * w + Math.sin(s.t * 1.5) * 0.015;
  p.abd.rotation.x = Math.sin(s.t * 2) * 0.05;
  p.abd.rotation.y = Math.sin(f) * 0.08 * w;
  if (p.cauda.length) {
    const e = s.atq != null ? Math.sin(Math.min(1, s.atq) * Math.PI) : 0;
    p.cauda.forEach((c, i) => { c.rotation.x = -0.55 - (i > 1 ? e * 0.35 : -e * 0.3) + Math.sin(s.t * 2 + i) * 0.04; });
  }
  p.garras.forEach((g, i) => { const e = s.atq != null ? Math.sin(Math.min(1, s.atq) * Math.PI) : 0; g.b.rotation.x = -e * 0.5; g.d.rotation.y = (i ? 1 : -1) * (0.2 + Math.sin(s.t * 3) * 0.1) * (1 - e); });
  if (s.atq != null && !p.cauda.length) { const e = Math.sin(Math.min(1, s.atq) * Math.PI); p.tronco.rotation.x = -0.3 * e; p.corpo.position.z = 0.3 * e; } else { p.tronco.rotation.x = 0; p.corpo.position.z = 0; }
};

// ============================================================
//  Voador (harpia, morcego)
// ============================================================
MOD.voador = function (v, mk) {
  const raiz = new THREE.Group(); const corpo = N(raiz, 0, 1.6, 0);
  const mC = mk(v.corpo, { roughness: 0.8 }), mA = mk(v.asa, { side: THREE.DoubleSide, roughness: 0.85 });
  const mOlho = mk(0x000000, { emissive: v.olhos, emissiveIntensity: 2.5 });
  P(gEsf(), mC, corpo, 0, 0, 0, 0.22, 0.24, 0.3);
  const cab = N(corpo, 0, 0.18, 0.25);
  P(gEsf(), mC, cab, 0, 0, 0, 0.15, 0.14, 0.15);
  for (const lado of [1, -1]) P(gEsfB(), mOlho, cab, 0.06 * lado, 0.03, 0.12, 0.03, 0.03, 0.02, false);
  if (v.morcego) { for (const lado of [1, -1]) P(gCone(), mC, cab, 0.08 * lado, 0.16, -0.02, 0.05, 0.16, 0.03); }
  else { P(gCone(), mk(0xd8b040), cab, 0, -0.03, 0.18, 0.04, 0.14, 0.04).rotation.x = Math.PI / 2 + 0.3; P(gCone(), mC, cab, 0, 0.12, -0.08, 0.05, 0.25, 0.05).rotation.x = -1.1; }
  const asas = [];
  for (const lado of [1, -1]) {
    const a = N(corpo, 0.12 * lado, 0.08, 0);
    const me = P(asaGeo(v.morcego ? 'morcego' : 'harpia'), mA, a, 0, 0, 0, 0.85 * lado, 1, 0.8);
    asas.push(a);
  }
  const garras = [];
  for (const lado of [1, -1]) { const g = N(corpo, 0.08 * lado, -0.18, 0.02); P(capsula(0.035, 0.18), mk(0x4a3a20), g, 0, -0.14, 0); garras.push(g); }
  const cauda = N(corpo, 0, 0, -0.28); P(gCone(), mA, cauda, 0, 0, -0.15, 0.14, 0.35, 0.04).rotation.x = -Math.PI / 2;
  return { raiz, p: { raiz, corpo, cab, asas, garras, cauda }, mats: mk.lista, rig: 'voador', alturaCabeca: 2.2 };
};
MOD.animVoador = function (m, s) {
  const p = m.p; const t = s.t;
  const bat = Math.sin(t * (m.p.asas[0] ? 11 : 8)) ;
  p.asas[0].rotation.z = bat * 0.7; p.asas[1].rotation.z = -bat * 0.7;
  p.corpo.position.y = 1.6 + Math.sin(t * 3) * 0.15 + bat * 0.04;
  p.corpo.rotation.x = 0.15 * s.andar;
  p.garras.forEach((g, i) => g.rotation.x = 0.3 + Math.sin(t * 2 + i) * 0.1);
  p.cauda.rotation.y = Math.sin(t * 2) * 0.2;
  if (s.atq != null) { const e = Math.sin(Math.min(1, s.atq) * Math.PI); p.corpo.rotation.x = -0.5 * e; p.corpo.position.z = 0.4 * e; p.corpo.position.y -= 0.5 * e; } else p.corpo.position.z = 0;
};

// ============================================================
//  Slime
// ============================================================
MOD.slime = function (v, mk, o = {}) {
  const raiz = new THREE.Group(); const corpo = N(raiz);
  const mS = mk(v.cor, { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85, emissive: v.cor, emissiveIntensity: 0.18 });
  const mN = mk(0x1a1a0a, { roughness: 0.4 });
  const mOlho = mk(0x000000, { emissive: v.olhos, emissiveIntensity: 2.6 });
  const blob = N(corpo, 0, 0, 0);
  P(G('slime', () => new THREE.SphereGeometry(1, 24, 18)), mS, blob, 0, 0.45, 0, 0.62, 0.5, 0.62);
  P(gEsf(), mN, blob, 0.1, 0.45, -0.05, 0.2, 0.18, 0.2, false);
  for (let i = 0; i < 3; i++) P(gEsfB(), mk(0xe0d8c0), blob, (Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.3, (Math.random() - 0.5) * 0.6, 0.06, 0.06, 0.06, false);
  for (const lado of [1, -1]) P(gEsf(), mOlho, blob, 0.17 * lado, 0.68, 0.45, 0.07, 0.09, 0.05, false);
  if (o.olhosExtra) for (let i = 0; i < o.olhosExtra; i++) { const a = Math.random() * Math.PI * 2; P(gEsf(), mOlho, blob, Math.cos(a) * 0.45, 0.5 + Math.random() * 0.3, Math.sin(a) * 0.45, 0.05, 0.06, 0.05, false); }
  if (o.coroa) for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const c = P(gCone(), mk(0xd8d0b8), blob, Math.cos(a) * 0.3, 0.95, Math.sin(a) * 0.3, 0.05, 0.3, 0.05); c.rotation.z = -Math.cos(a) * 0.3; c.rotation.x = Math.sin(a) * 0.3; }
  const tent = [];
  if (o.tentaculos) for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2; const g = N(blob, Math.cos(a) * 0.5, 0.25, Math.sin(a) * 0.5); g.rotation.y = -a;
    P(capsula(0.06, 0.6), mS, g, 0.35, 0.1, 0).rotation.z = Math.PI / 2 - 0.4; tent.push(g);
  }
  return { raiz, p: { raiz, corpo, blob, tent }, mats: mk.lista, rig: 'slime', alturaCabeca: 1.1 };
};
MOD.animSlime = function (m, s) {
  const p = m.p; const w = s.andar;
  let sy = 1 + Math.sin(s.fase * 1.3) * 0.16 * w + Math.sin(s.t * 3) * 0.04;
  if (s.atq != null) { const e = Math.sin(Math.min(1, s.atq) * Math.PI); sy = 1 - 0.3 * e + (s.atq > 0.5 ? 0.5 * e : 0); }
  p.blob.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  p.tent.forEach((t, i) => t.rotation.z = Math.sin(s.t * 2 + i) * 0.3);
};

// ============================================================
//  Sapo
// ============================================================
MOD.sapo = function (v, mk) {
  const raiz = new THREE.Group(); const corpo = N(raiz);
  const mP = mk(v.pele, { roughness: 0.35, metalness: 0.05 }), mB = mk(v.barriga, { roughness: 0.6 });
  const mOlho = mk(0x111111, { emissive: v.olhos, emissiveIntensity: 1.2, roughness: 0.2 });
  const tronco = N(corpo, 0, 0.42, 0);
  P(gEsf(), mP, tronco, 0, 0, 0, 0.48, 0.32, 0.5);
  P(gEsf(), mB, tronco, 0, -0.1, 0.1, 0.4, 0.22, 0.42);
  for (let i = 0; i < 7; i++) P(gEsfB(), mk(0x7a5a1a, { emissive: 0x3a5a00, emissiveIntensity: 0.4 }), tronco, (Math.random() - 0.5) * 0.6, 0.22 + Math.random() * 0.08, (Math.random() - 0.5) * 0.6, 0.06, 0.04, 0.06, false);
  for (const lado of [1, -1]) { P(gEsf(), mP, tronco, 0.2 * lado, 0.22, 0.3, 0.12, 0.12, 0.12); P(gEsf(), mOlho, tronco, 0.22 * lado, 0.27, 0.36, 0.07, 0.07, 0.06, false); }
  const boca = N(tronco, 0, -0.02, 0.45); P(gCaixa(), mk(0x3a1a1a), boca, 0, 0, 0, 0.45, 0.02, 0.05);
  const pernas = [];
  for (const lado of [1, -1]) {
    const t = N(tronco, 0.4 * lado, -0.1, -0.2); P(gEsf(), mP, t, 0, 0, 0, 0.2, 0.18, 0.3);
    const pe = N(t, 0, -0.2, 0.2); P(gEsf(), mB, pe, 0, 0, 0, 0.12, 0.04, 0.2);
    const f = N(tronco, 0.3 * lado, -0.15, 0.3); P(capsula(0.06, 0.18), mP, f, 0, -0.12, 0);
    pernas.push({ t, f });
  }
  return { raiz, p: { raiz, corpo, tronco, boca, pernas }, mats: mk.lista, rig: 'sapo', alturaCabeca: 1.0 };
};
MOD.animSapo = function (m, s) {
  const p = m.p; const w = s.andar;
  const pulo = Math.abs(Math.sin(s.fase * 0.7));
  p.corpo.position.y = pulo * 0.6 * w;
  p.tronco.rotation.x = -pulo * 0.25 * w;
  p.pernas.forEach(pp => { pp.t.rotation.x = pulo * 0.9 * w; pp.f.rotation.x = -pulo * 0.6 * w; });
  p.tronco.scale.y = 1 + Math.sin(s.t * 4) * 0.03;
  if (s.atq != null) { const e = Math.sin(Math.min(1, s.atq) * Math.PI); p.boca.scale.y = 1 + e * 8; p.tronco.rotation.x = -0.2 * e; } else p.boca.scale.y = 1;
};

// ============================================================
//  Elemental
// ============================================================
MOD.elemental = function (v, mk, o = {}) {
  const raiz = new THREE.Group(); const corpo = N(raiz, 0, 1.3, 0);
  const mC = mk(v.cor, { emissive: v.cor, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.9, flatShading: true });
  const nucleo = P(gOcta(), mk(0xffffff, { emissive: v.cor, emissiveIntensity: 2.5 }), corpo, 0, 0, 0, 0.22, 0.32, 0.22, false);
  P(gOcta(), mC, corpo, 0, 0.1, 0, 0.35, 0.5, 0.3);
  const cab = P(gOcta(), mC, corpo, 0, 0.62, 0, 0.18, 0.22, 0.18);
  const fragmentos = [];
  for (let i = 0; i < (o.frag || 7); i++) { const g = N(corpo); const f = P(gOcta(), mC, g, 0.6, (Math.random() - 0.5) * 0.6, 0, 0.1, 0.25, 0.1); g.rotation.y = i / 7 * Math.PI * 2; fragmentos.push({ g, f, v: 0.8 + Math.random() }); }
  const bracos = [];
  for (const lado of [1, -1]) { const b = N(corpo, 0.45 * lado, 0.2, 0); P(gOcta(), mC, b, 0.05 * lado, -0.25, 0, 0.12, 0.35, 0.12); bracos.push(b); }
  return { raiz, p: { raiz, corpo, nucleo, cab, fragmentos, bracos }, mats: mk.lista, rig: 'elemental', alturaCabeca: 2.2 };
};
MOD.animElemental = function (m, s) {
  const p = m.p;
  p.corpo.position.y = 1.3 + Math.sin(s.t * 2) * 0.12;
  p.nucleo.rotation.y = s.t * 2;
  p.fragmentos.forEach((f, i) => { f.g.rotation.y += 0.02 * f.v; f.f.rotation.x = s.t * f.v; });
  const e = s.atq != null ? Math.sin(Math.min(1, s.atq) * Math.PI) : 0;
  p.bracos.forEach((b, i) => { b.rotation.x = -1.5 * e + Math.sin(s.t * 2 + i) * 0.1; });
  p.corpo.rotation.x = 0.1 * s.andar;
};

// ============================================================
//  Wyrm (serpente alada)
// ============================================================
MOD.wyrm = function (v, mk) {
  const raiz = new THREE.Group(); const corpo = N(raiz);
  const mC = mk(v.cor, { roughness: 0.35, metalness: 0.25 }), mB = mk(0xe8f4ff, { roughness: 0.5 });
  const mOlho = mk(0x000000, { emissive: 0x60d0ff, emissiveIntensity: 3 });
  const mGelo = mk(0xbfeaff, { emissive: 0x4090c0, emissiveIntensity: 0.6, roughness: 0.1, flatShading: true });
  const segs = [];
  for (let i = 0; i < 10; i++) {
    const r = 0.42 * (1 - i * 0.075);
    const s = N(corpo, 0, 0.5 + r * 0.3, -i * 0.55);
    P(gEsf(), mC, s, 0, 0, 0, r, r * 0.9, r * 1.25);
    P(gEsf(), mB, s, 0, -r * 0.35, 0, r * 0.8, r * 0.5, r * 1.1, false);
    if (i < 8) P(gOcta(), mGelo, s, 0, r * 0.9, 0, 0.06, 0.22 * (1 - i * 0.08), 0.12, false);
    segs.push(s);
  }
  const pesc = N(corpo, 0, 0.95, 0.3); pesc.rotation.x = -0.4;
  P(capsula(0.28, 0.4), mC, pesc, 0, 0.2, 0.1).rotation.x = 0.8;
  const cab = N(pesc, 0, 0.45, 0.35); cab.rotation.x = 0.4;
  P(gEsf(), mC, cab, 0, 0, 0, 0.3, 0.24, 0.36);
  P(gCaixa(), mC, cab, 0, 0.0, 0.32, 0.3, 0.14, 0.35);
  const mand = N(cab, 0, -0.1, 0.1); P(gCaixa(), mB, mand, 0, -0.03, 0.25, 0.26, 0.07, 0.4);
  for (const lado of [1, -1]) {
    P(gEsfB(), mOlho, cab, 0.15 * lado, 0.1, 0.22, 0.05, 0.04, 0.04, false);
    const c = P(gCone(), mGelo, cab, 0.14 * lado, 0.25, -0.15, 0.06, 0.55, 0.06); c.rotation.x = -1.0; c.rotation.z = -lado * 0.3;
  }
  const asas = [];
  for (const lado of [1, -1]) { const a = N(segs[1], 0.3 * lado, 0.3, 0); const me = P(asaGeo('morcego'), mk(0x6a90b0, { side: THREE.DoubleSide, roughness: 0.6, transparent: true, opacity: 0.92 }), a, 0, 0, 0, 2.2 * lado, 1, 2.0); me.rotation.x = Math.PI / 2 - 0.2; asas.push(a); }
  return { raiz, p: { raiz, corpo, segs, pesc, cab, mand, asas }, mats: mk.lista, rig: 'wyrm', alturaCabeca: 2.0 };
};
MOD.animWyrm = function (m, s) {
  const p = m.p; const t = s.t; const w = Math.max(0.3, s.andar);
  p.segs.forEach((sg, i) => { sg.position.x = Math.sin(t * 3 - i * 0.6) * 0.12 * i * w; sg.position.y = 0.5 + Math.sin(t * 2 - i * 0.5) * 0.06; sg.rotation.y = Math.cos(t * 3 - i * 0.6) * 0.15 * w; });
  p.asas.forEach((a, i) => { a.rotation.y = (i ? 1 : -1) * (0.3 + Math.sin(t * 2.2) * 0.35); a.rotation.z = (i ? -1 : 1) * 0.3; });
  const e = s.atq != null ? Math.sin(Math.min(1, s.atq) * Math.PI) : 0;
  p.mand.rotation.x = 0.1 + e * 0.7 + Math.max(0, Math.sin(t * 0.8)) * 0.05;
  p.pesc.rotation.x = -0.4 + e * 0.5 + Math.sin(t * 1.5) * 0.05;
  p.cab.rotation.y = Math.sin(t * 0.9) * 0.15;
};

// ============================================================
//  Fábrica
// ============================================================
MOD.criar = function (rig, v, escala = 1) {
  const mk = criarMats();
  let m;
  switch (rig) {
    case 'humanoide': m = MOD.humanoide(v, mk); break;
    case 'quadrupede': m = MOD.quadrupede(v, mk); break;
    case 'caranguejo': m = MOD.caranguejo(v, mk); break;
    case 'aranha': m = MOD.aranha(v, mk); break;
    case 'voador': m = MOD.voador(v, mk); break;
    case 'slime': m = MOD.slime(v, mk); break;
    case 'sapo': m = MOD.sapo(v, mk); break;
    case 'elemental': m = MOD.elemental(v, mk); break;
    // chefes
    case 'chefeCaranguejo': {
      m = MOD.caranguejo({ casca: 0xc0502a, garra: 0xe07a4a }, mk);
      const coral = mk(0xff7a8a, { roughness: 0.6, emissive: 0x501020, emissiveIntensity: 0.3 });
      for (let i = 0; i < 9; i++) { const c = P(gCone(), coral, m.p.tronco, (Math.random() - 0.5) * 0.9, 0.2, (Math.random() - 0.5) * 0.6, 0.06, 0.35 + Math.random() * 0.2, 0.06); c.rotation.set((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8); }
      const sir = MOD.humanoide({ pele: 0x8ac0b0, roupa: 0x3a7a8a, olhos: 0xa0ffff, cabelo: 0x2a5a6a, coroa: 0xff8a9a, cajado: true }, mk, { bulk: 0.85 });
      const t = sir.p.torso; m.p.tronco.add(t); t.position.set(0, 0.0, -0.05); t.scale.setScalar(0.85);
      m.sereia = sir; m.rig = 'chefeCaranguejo'; m.alturaCabeca = 1.9;
      break;
    }
    case 'chefeSlime': m = MOD.slime({ cor: 0x5a6a1a, olhos: 0xe0ff40 }, mk, { coroa: true, olhosExtra: 8, tentaculos: true }); m.rig = 'slime'; break;
    case 'chefeCervo': m = MOD.quadrupede({ pelo: 0x4a3a2a, olhos: 0x90ff60, cauda: true, chifres: true, barriga: 0x6a5a3a }, mk); m.rig = 'quadrupede';
      for (let i = 0; i < 8; i++) P(gDode(), mk(0x3a5a22, { flatShading: true }), m.p.tronco, (Math.random() - 0.5) * 0.4, 0.22, (Math.random() - 0.5) * 0.8, 0.12, 0.08, 0.12, false);
      break;
    case 'chefeAranha': m = MOD.aranha({ corpo: 0x241a34, cristal: 0xa060ff, olhos: 0xff40c0 }, mk, { abd: 1.5, olhos: 8, marcas: 0xc040ff }); break;
    case 'chefeEscaravelho': m = MOD.aranha({ corpo: 0x1a3a3a, cristal: 0x40c0c0, olhos: 0xffd040, pinças: true }, mk, { pernas: 6, casco: 0x2a8a7a, chifre: true, metal: 0.4 }); break;
    case 'chefeWyrm': m = MOD.wyrm({ cor: 0x8ab0d0 }, mk); break;
    case 'chefeDemonio': m = MOD.humanoide({ pele: 0x3a1410, roupa: 0x1a0806, chifres: true, corChifre: 0x1a1010, olhos: 0xffe040, brilho: 0xff3a10, asas: true, corAsa: 0x2a0a08, cauda: true, bracosLongos: true, machado: 1.8, garras: true, coroa: 0xff6020 }, mk, { bulk: 1.3 }); m.estilo = 'golpe'; break;
    default: m = MOD.humanoide(v, mk);
  }
  m.raiz.scale.setScalar(escala);
  m.escala = escala;
  m.blob = GFX.sombraContato(m.raiz, rig === 'chefeWyrm' ? 1.6 : rig.startsWith('chefe') ? 1.1 : rig === 'caranguejo' || rig === 'aranha' ? 0.9 : 0.6);
  return m;
};

MOD.animar = function (m, s) {
  switch (m.rig) {
    case 'gltf': MOD.animarGLTF(m, s); break;
    case 'humanoide': MOD.animHumanoide(m, s); break;
    case 'quadrupede': MOD.animQuadrupede(m, s); break;
    case 'caranguejo': MOD.animCaranguejo(m, s); break;
    case 'chefeCaranguejo': {
      MOD.animCaranguejo(m, s);
      const sp = m.sereia.p; const e = s.atq != null ? Math.sin(Math.min(1, s.atq) * Math.PI) : 0;
      sp.oD.rotation.x = -0.4 - 2.2 * e; sp.oE.rotation.x = -0.3 - 1.5 * e; sp.cD.rotation.x = -0.6; sp.torso.rotation.y = Math.sin(s.t) * 0.15;
      break;
    }
    case 'aranha': MOD.animAranha(m, s); break;
    case 'voador': MOD.animVoador(m, s); break;
    case 'slime': MOD.animSlime(m, s); break;
    case 'sapo': MOD.animSapo(m, s); break;
    case 'elemental': MOD.animElemental(m, s); break;
    case 'wyrm': MOD.animWyrm(m, s); break;
  }
};

MOD.flash = function (m, k) {
  for (const mat of m.mats) {
    if (k > 0) { mat.emissive.setRGB(1, 0.75, 0.6); mat.emissiveIntensity = k * 0.4 + mat.userData.emiI * (1 - k); }
    else { mat.emissive.copy(mat.userData.emi); mat.emissiveIntensity = mat.userData.emiI; }
  }
};
MOD.tingir = function (m, cor, k) {
  for (const mat of m.mats) { if (!mat.userData.cor0) mat.userData.cor0 = mat.color.clone(); mat.color.copy(mat.userData.cor0).lerp(new THREE.Color(cor), k); }
};
MOD.descartar = function (m) {
  for (const mat of m.mats) mat.dispose();
};

// jogador
MOD.jogador = function (classe) {
  const m3 = MOD.criar3D && MOD.criar3D(classe, 1);
  if (m3) {
    const anel = new THREE.Mesh(G('anelJog', () => { const g = new THREE.RingGeometry(0.55, 0.7, 32); g.rotateX(-Math.PI / 2); return g; }), new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    anel.position.y = 0.06; m3.raiz.add(anel); m3.anel = anel; return m3;
  }
  const C = CLASSES[classe].cores;
  let v;
  if (classe === 'guerreiro') v = { pele: C.pele, roupa: C.corpo, corPeito: C.armadura, elmo: C.armadura, ombreira: C.armadura, olhos: 0xffe0a0, machado: 1.1, escudo: 0x6a3a22, bota: 0x3a2a1a, luva: 0x4a3a2a, capa: 0x7a1a1a };
  else if (classe === 'cacadora') v = { pele: C.pele, roupa: C.corpo, corPeito: C.armadura, capuz: true, olhos: 0xc0ffd0, arco: true, aljava: true, bota: 0x3a2818, luva: 0x4a3420, capa: 0x2a4028, adagas: false };
  else v = { pele: C.pele, roupa: C.corpo, corPeito: C.armadura, chapeu: true, olhos: 0xa0d0ff, cajado: true, saia: C.armadura, bota: 0x2a2030, mangas: true, capa: 0x2a2048 };
  const mk = criarMats();
  const m = MOD.humanoide(v, mk, { bulk: classe === 'guerreiro' ? 1.15 : 0.95 });
  m.estilo = classe === 'guerreiro' ? 'escudo' : classe === 'cacadora' ? 'arco' : 'cajado';
  m.rig = 'humanoide';
  // anel de seleção sob o jogador
  const anel = new THREE.Mesh(G('anelJog', () => { const g = new THREE.RingGeometry(0.55, 0.7, 32); g.rotateX(-Math.PI / 2); return g; }),
    new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  anel.position.y = 0.06; m.raiz.add(anel); m.anel = anel;
  m.blob = GFX.sombraContato(m.raiz, 0.65);
  return m;
};
