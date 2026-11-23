// ============================================================
//  Escultura dos monstros procedurais
//  Os monstros montados com peças (esferas, caixas, cilindros) viram
//  uma malha única e orgânica:
//   1. cada peça vira um campo de distância (SDF);
//   2. as peças se fundem com união suave, como argila (juntas naturais);
//   3. a superfície é extraída com Surface Nets;
//   4. a malha é presa aos grupos animados das peças originais
//      (skinning), então as animações continuam iguais;
//   5. as cores das partes se misturam suavemente.
//  Olhos, armas, peças brilhantes, transparentes ou finas continuam como eram.
//  A malha de cada tipo de monstro é calculada uma vez e reaproveitada.
// ============================================================
'use strict';

const ESC = {
  ativo: true, cache: new Map(), tempoTotal: 0,
  RESOLUCAO: 58,           // células no maior eixo
  SUAVE: 0.04,            // raio da união suave (fração do tamanho do monstro)
  FORA: ['slime', 'chefeSlime', 'elemental', 'voador'], // translúcidos e asas finas ficam como estão
};
try { if (localStorage.getItem('cdc_esculpir_off') === '1') ESC.ativo = false; } catch (e) { }

// ---------- forma de cada peça ----------
const _v = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
function formaDaPeca(o) {
  const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
  const bb = g.boundingBox; const c = bb.getCenter(new THREE.Vector3()), h = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const t = g.type;
  let tipo = 'caixa';
  if (/Sphere|Icosahedron|Dodecahedron|Octahedron|Tetrahedron/.test(t)) tipo = 'elipse';
  else if (/Cylinder|Cone|Lathe|Capsule/.test(t)) tipo = 'capsula';
  let rTopo = 1, rBase = 1;
  if (/Cylinder|Cone/.test(t) && g.parameters) { rTopo = t === 'ConeGeometry' ? 0 : g.parameters.radiusTop; rBase = g.parameters.radiusBottom != null ? g.parameters.radiusBottom : g.parameters.radius; const mx = Math.max(rTopo, rBase, 1e-4); rTopo /= mx; rBase /= mx; }
  o.matrixWorld.decompose(_v, _q, _s);
  const escMin = Math.min(Math.abs(_s.x), Math.abs(_s.y), Math.abs(_s.z));
  return { o, tipo, c, h, rTopo, rBase, inv: o.matrixWorld.clone().invert(), escMin, mw: o.matrixWorld.clone() };
}
// distância (no espaço do mundo, aproximada) de um ponto à peça
const _p = new THREE.Vector3();
function distPeca(f, x, y, z) {
  _p.set(x, y, z).applyMatrix4(f.inv).sub(f.c);
  const h = f.h; let d;
  if (f.tipo === 'elipse') {
    const k0 = Math.hypot(_p.x / h.x, _p.y / h.y, _p.z / h.z), k1 = Math.hypot(_p.x / (h.x * h.x), _p.y / (h.y * h.y), _p.z / (h.z * h.z));
    d = k1 > 1e-6 ? k0 * (k0 - 1) / k1 : -Math.min(h.x, h.y, h.z);
  } else if (f.tipo === 'capsula') {
    // cápsula afunilada ao longo de Y (cilindros, cones, membros)
    const t = THREE.MathUtils.clamp((_p.y + h.y) / (2 * h.y), 0, 1);
    const rr = Math.max(0.02, f.rBase + (f.rTopo - f.rBase) * t);
    const rx = h.x * rr, rz = h.z * rr, r = Math.min(rx, rz);
    const meio = Math.max(0, h.y - r * 0.6);
    const yy = Math.max(Math.abs(_p.y) - meio, 0);
    d = Math.hypot(_p.x * r / Math.max(rx, 1e-5), yy, _p.z * r / Math.max(rz, 1e-5)) - r;
  } else {
    const r = Math.min(h.x, h.y, h.z) * 0.35;
    const qx = Math.abs(_p.x) - h.x + r, qy = Math.abs(_p.y) - h.y + r, qz = Math.abs(_p.z) - h.z + r;
    d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  }
  return d * f.escMin;
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

// ---------- escolha das peças ----------
function pecaEsculpivel(o, voxel) {
  if (!o.isMesh || o.isSkinnedMesh || !o.visible || o.userData.semEsculpir) return false;
  const m = o.material; if (!m || Array.isArray(m) || !m.isMeshStandardMaterial) return false;
  if (m.transparent || m.opacity < 0.95 || m.alphaTest > 0) return false;
  if (m.metalness > 0.45) return false;                         // armas e metais
  const em = m.emissive ? (m.emissive.r + m.emissive.g + m.emissive.b) * m.emissiveIntensity : 0;
  if (em > 0.8) return false;                                   // olhos e cristais (brilho fraco de pele, como magma, entra)
  if (!/Sphere|Icosahedron|Dodecahedron|Octahedron|Cylinder|Cone|Lathe|Capsule|Box/.test(o.geometry.type)) return false;
  // peças finas demais para a grade ficam como estão (garras, chifres finos, pernas de aranha)
  const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
  o.matrixWorld.decompose(_v, _q, _s);
  const t = g.boundingBox.getSize(new THREE.Vector3()).multiply(_s.set(Math.abs(_s.x), Math.abs(_s.y), Math.abs(_s.z)));
  return Math.min(t.x, t.y, t.z) > voxel * 2.1;
}

// ---------- construção ----------
ESC.construir = function (m, chave) {
  const t0 = performance.now();
  const raiz = m.raiz;
  // calcula no espaço da raiz, em escala 1
  const pos0 = raiz.position.clone(), rot0 = raiz.rotation.clone(), esc0 = raiz.scale.clone();
  raiz.position.set(0, 0, 0); raiz.rotation.set(0, 0, 0); raiz.scale.set(1, 1, 1); raiz.updateMatrixWorld(true);
  const restaurar = () => { raiz.position.copy(pos0); raiz.rotation.copy(rot0); raiz.scale.copy(esc0); raiz.updateMatrixWorld(true); };
  const todas = []; raiz.traverse(o => { if (o.isMesh) todas.push(o); });
  // tamanho do monstro (para a resolução)
  const caixa = new THREE.Box3(); for (const o of todas) if (o.visible && o.material && !o.material.transparent) caixa.expandByObject(o);
  if (caixa.isEmpty()) { restaurar(); return null; }
  const tam = caixa.getSize(new THREE.Vector3()); const maior = Math.max(tam.x, tam.y, tam.z);
  const voxel = maior / ESC.RESOLUCAO;
  const pecas = todas.filter(o => pecaEsculpivel(o, voxel));
  if (pecas.length < 3) { restaurar(); return null; }
  const formas = pecas.map(formaDaPeca);
  const k = maior * ESC.SUAVE;
  // caixas de cada peça (para pular as distantes)
  for (const f of formas) { const b = new THREE.Box3().setFromObject(f.o); b.expandByScalar(k * 1.2 + voxel); f.bb = b; }
  const bb = new THREE.Box3(); for (const f of formas) bb.union(f.bb);
  bb.expandByScalar(voxel * 2);
  const dims = [0, 1, 2].map(i => Math.max(4, Math.ceil((bb.max.getComponent(i) - bb.min.getComponent(i)) / voxel)));
  const campo = (x, y, z) => {
    let d = 1e9;
    for (const f of formas) {
      const b = f.bb; if (x < b.min.x || x > b.max.x || y < b.min.y || y > b.max.y || z < b.min.z || z > b.max.z) continue;
      d = smin(d, distPeca(f, x, y, z), k);
    }
    return d === 1e9 ? voxel * 4 : d;
  };
  // grade pré-calculada (o Surface Nets consulta cada canto várias vezes)
  const nx = dims[0] + 1, ny = dims[1] + 1, nz = dims[2] + 1;
  const grade = new Float32Array(nx * ny * nz);
  const sx = (bb.max.x - bb.min.x) / dims[0], sy = (bb.max.y - bb.min.y) / dims[1], sz = (bb.max.z - bb.min.z) / dims[2];
  for (let iz = 0; iz < nz; iz++) for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++)
    grade[ix + nx * (iy + ny * iz)] = campo(bb.min.x + ix * sx, bb.min.y + iy * sy, bb.min.z + iz * sz);
  const consulta = (x, y, z) => {
    const ix = Math.min(nx - 1, Math.max(0, Math.round((x - bb.min.x) / sx))), iy = Math.min(ny - 1, Math.max(0, Math.round((y - bb.min.y) / sy))), iz = Math.min(nz - 1, Math.max(0, Math.round((z - bb.min.z) / sz)));
    return grade[ix + nx * (iy + ny * iz)];
  };
  const sn = window.surfaceNet(dims, consulta, [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.max.y, bb.max.z]]);
  if (!sn.positions.length) { restaurar(); return null; }

  // grupos animados (ossos) = pais das peças
  const grupos = []; const idxGrupo = new Map();
  for (const f of formas) { const g = f.o.parent; if (!idxGrupo.has(g)) { idxGrupo.set(g, grupos.length); grupos.push(g); } f.gi = idxGrupo.get(g); }
  const nV = sn.positions.length;
  const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), cor = new Float32Array(nV * 3), sIdx = new Uint16Array(nV * 4), sPeso = new Float32Array(nV * 4);
  const ds = new Float32Array(formas.length); const e = voxel * 0.5; const corT = new THREE.Color();
  for (let i = 0; i < nV; i++) {
    let [x, y, z] = sn.positions[i];
    // normal pelo gradiente do campo exato
    let gx = campo(x + e, y, z) - campo(x - e, y, z), gy = campo(x, y + e, z) - campo(x, y - e, z), gz = campo(x, y, z + e) - campo(x, y, z - e);
    const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
    // projeta o vértice na superfície (um passo de Newton)
    const d0 = campo(x, y, z); x -= gx * d0; y -= gy * d0; z -= gz * d0;
    pos.set([x, y, z], i * 3); nor.set([gx, gy, gz], i * 3);
    // peças mais próximas: cor e pesos por grupo
    let dmin = 1e9; for (let j = 0; j < formas.length; j++) { const f = formas[j]; const b = f.bb; ds[j] = (x < b.min.x || x > b.max.x || y < b.min.y || y > b.max.y || z < b.min.z || z > b.max.z) ? 1e9 : distPeca(f, x, y, z); if (ds[j] < dmin) dmin = ds[j]; }
    const kc = Math.max(voxel * 0.6, k * 0.35);
    let r = 0, gg = 0, b2 = 0, wt = 0; const pg = new Map();
    for (let j = 0; j < formas.length; j++) {
      if (ds[j] > dmin + kc * 6) continue;
      const w = Math.exp(-(ds[j] - dmin) / kc);
      corT.copy(formas[j].o.material.color); r += corT.r * w; gg += corT.g * w; b2 += corT.b * w; wt += w;
      const gi = formas[j].gi; pg.set(gi, (pg.get(gi) || 0) + Math.exp(-(ds[j] - dmin) / (kc * 0.7)));
    }
    cor.set([r / wt, gg / wt, b2 / wt], i * 3);
    const ord = [...pg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2); const soma = ord.reduce((s, a) => s + a[1], 0);
    ord.forEach(([gi, w], k2) => { sIdx[i * 4 + k2] = gi; sPeso[i * 4 + k2] = w / soma; });
  }
  const idx = []; for (const c of sn.cells) { if (c.length === 3) idx.push(c[0], c[1], c[2]); else { idx.push(c[0], c[1], c[2], c[0], c[2], c[3]); } }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sPeso, 4));
  geo.setIndex(nV > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  // orientação dos triângulos: as normais do campo apontam para fora
  { const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(); let pos2 = 0, neg = 0;
    for (let t = 0; t < Math.min(idx.length, 900); t += 3) { a.fromArray(pos, idx[t] * 3); b.fromArray(pos, idx[t + 1] * 3); c.fromArray(pos, idx[t + 2] * 3); n.subVectors(b, a).cross(c.sub(a)); const nn = new THREE.Vector3().fromArray(nor, idx[t] * 3); if (n.dot(nn) > 0) pos2++; else neg++; }
    if (neg > pos2) { const ix = geo.index.array; for (let t = 0; t < ix.length; t += 3) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; } } }
  geo.computeBoundingSphere(); geo.userData.cache = true;
  // material médio das peças
  let rug = 0, met = 0; const emi = new THREE.Color(); for (const f of formas) { rug += f.o.material.roughness; met += f.o.material.metalness; emi.add(f.o.material.emissive.clone().multiplyScalar(f.o.material.emissiveIntensity)); }
  emi.multiplyScalar(1 / formas.length);
  const molde = {
    geo, rug: rug / formas.length, met: met / formas.length, emi,
    assinatura: todas.length, pecas: pecas.map(o => todas.indexOf(o)),
    grupos: grupos.map(g => { const l = []; raiz.traverse(o => l.push(o)); return l.indexOf(g); }),
    inversas: grupos.map(g => g.matrixWorld.clone().invert()),
  };
  restaurar();
  const dt = performance.now() - t0; ESC.tempoTotal += dt;
  if (chave) ESC.cache.set(chave, molde);
  return molde;
};

// aplica um molde (calculado ou do cache) a uma instância
ESC.aplicar = function (m, molde) {
  const raiz = m.raiz;
  const todas = []; raiz.traverse(o => { if (o.isMesh) todas.push(o); });
  if (todas.length !== molde.assinatura) return false;
  const lista = []; raiz.traverse(o => lista.push(o));
  const ossos = molde.grupos.map(i => lista[i]); if (ossos.some(o => !o)) return false;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: molde.rug, metalness: molde.met, emissive: molde.emi.clone().multiplyScalar(1 / Math.max(1e-4, molde.emi.r, molde.emi.g, molde.emi.b)), emissiveIntensity: Math.max(molde.emi.r, molde.emi.g, molde.emi.b) });
  mat.userData.emi = mat.emissive.clone(); mat.userData.emiI = mat.emissiveIntensity;
  if (typeof GFX !== 'undefined') GFX.patchPersonagem(mat, true);
  const malha = new THREE.SkinnedMesh(molde.geo, mat);
  malha.castShadow = true; malha.receiveShadow = true; malha.frustumCulled = false; malha.name = 'esculpido';
  raiz.add(malha);
  malha.bind(new THREE.Skeleton(ossos, molde.inversas.map(x => x.clone())), new THREE.Matrix4());
  // modo 'attached' (padrão): a posição final vem só dos grupos animados, que já incluem a raiz
  for (const i of molde.pecas) todas[i].visible = false;
  if (m.mats) m.mats.push(mat);
  m.esculpido = malha;
  return true;
};

ESC.processar = function (m, rig, visual) {
  if (!ESC.ativo || !m || !m.raiz || ESC.FORA.includes(rig) || !window.surfaceNet) return;
  const chave = rig + '|' + JSON.stringify(visual || {}) + '|' + (() => { let n = 0; m.raiz.traverse(o => { if (o.isMesh) n++; }); return n; })();
  let molde = ESC.cache.get(chave);
  if (molde === undefined) { try { molde = ESC.construir(m, chave); } catch (err) { console.warn('escultura', rig, err); molde = null; } ESC.cache.set(chave, molde); }
  if (molde) { try { ESC.aplicar(m, molde); } catch (err) { console.warn('escultura', err); } }
};

{
  const c0 = MOD.criar;
  MOD.criar = function (rig, visual, escala) {
    const m = c0.apply(this, arguments);
    ESC.processar(m, rig, visual);
    return m;
  };
}
