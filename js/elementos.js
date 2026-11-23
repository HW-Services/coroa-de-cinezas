// ============================================================
//  Aparência elemental dos monstros
//  - fogo: chamas saindo do corpo, brasas, fumaça e chão chamuscado
//  - gelo: névoa gelada, flocos e geada no chão por onde passa
//  - veneno: bolhas tóxicas, gotas e poças venenosas no rastro
//  - espectral (lobos): fiapos de névoa fantasmagórica
//  - afogados: água escorrendo · múmias: poeira de areia
//  - elite Gélido: ganha a aura de gelo · Explosivo: faíscas
//  Também suaviza o sombreamento dos modelos animados low-poly.
// ============================================================
'use strict';

const ELEM = { raioAtivo: 42, trilhas: {}, quadro: 0 };

// ---------- aura de cada monstro ----------
const ELEM_DO_TIPO = {
  loboGelo: 'gelo', elemental: 'gelo', mareth: 'gelo', hrimfang: 'gelo', yeti: 'gelo',
  cultista: 'fogo', diabrete: 'fogo', salamandra: 'fogo', demonio: 'fogo', tuskar: 'fogo', vorthak: 'fogo',
  sapo: 'veneno', lodoso: 'veneno', bruxa: 'veneno', aranha: 'veneno', escorpiao: 'veneno', vhorra: 'veneno', tecela: 'veneno',
  lobo: 'espectral', afogado: 'agua', mumia: 'areia',
};
ELEM.auraDe = function (e) {
  if (e.mods && e.mods.includes('gelido')) return 'gelo';
  return ELEM_DO_TIPO[e.tipo] || (e.d && ({ fogo: 'fogo', frio: 'gelo', veneno: 'veneno' })[e.d.elem]) || null;
};

// ---------- pontos da superfície do corpo ----------
const _pv = new THREE.Vector3();
ELEM.malhas = function (m) {
  if (m._malhasSup) return m._malhasSup;
  const l = []; let tot = 0;
  m.raiz.traverse(o => {
    if (!o.isMesh || !o.visible || o.userData.pelo || !o.material || o.material.transparent || o.material.type === 'MeshBasicMaterial') return;
    const n = o.geometry.attributes.position.count; if (n < 3) return;
    l.push({ o, n }); tot += n;
  });
  l.tot = tot; m._malhasSup = l; return l;
};
// ponto aleatório (já animado) na superfície; cima = prefere a metade de cima
ELEM.pontoCorpo = function (m, out) {
  const l = ELEM.malhas(m); if (!l.length) return null;
  let r = Math.random() * l.tot, esc = l[0];
  for (const x of l) { if (r < x.n) { esc = x; break; } r -= x.n; }
  const o = esc.o; if (!o.visible) return null;
  const i = (Math.random() * esc.n) | 0;
  o.getVertexPosition(i, out);
  return out.applyMatrix4(o.matrixWorld);
};

// ---------- rastros no chão (geada, queimado, veneno) ----------
ELEM.texGeada = function () {
  if (GFX.tex.geada) return GFX.tex.geada;
  const T = 256, c = document.createElement('canvas'); c.width = c.height = T; const g = c.getContext('2d');
  const rnd = mulberry32(31); g.translate(T / 2, T / 2);
  const gr = g.createRadialGradient(0, 0, 8, 0, 0, 120); gr.addColorStop(0, 'rgba(200,230,250,.42)'); gr.addColorStop(0.55, 'rgba(170,210,240,.26)'); gr.addColorStop(1, 'rgba(170,210,240,0)');
  g.fillStyle = gr; g.beginPath(); for (let a = 0; a < 6.3; a += 0.25) { const r = 80 + rnd() * 40; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
  // cristais ramificados
  g.strokeStyle = 'rgba(235,248,255,.75)'; g.lineCap = 'round';
  const galho = (x, y, a, L, w, d) => { if (d > 3 || L < 4) return; const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); for (const s of [-1, 1]) galho(x + (x2 - x) * 0.55, y + (y2 - y) * 0.55, a + s * 1.05, L * 0.45, w * 0.6, d + 1); galho(x2, y2, a + (rnd() - 0.5) * 0.4, L * 0.6, w * 0.7, d + 1); };
  for (let i = 0; i < 9; i++) galho((rnd() - 0.5) * 60, (rnd() - 0.5) * 60, rnd() * 6.3, 30 + rnd() * 35, 2.2, 0);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; GFX.tex.geada = t; return t;
};
ELEM.trilha = function (tipo) {
  if (ELEM.trilhas[tipo]) return ELEM.trilhas[tipo];
  const CAP = 260;
  const tex = tipo === 'geada' ? ELEM.texGeada() : GFX.tex[tipo];
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
    roughness: tipo === 'geada' ? 0.3 : tipo === 'gosma' ? 0.2 : 0.95, metalness: tipo === 'geada' ? 0.1 : 0,
    emissive: tipo === 'queimado' ? new THREE.Color(0xff5010) : new THREE.Color(0x000000), emissiveIntensity: tipo === 'queimado' ? 0.0 : 0,
  });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float aAlfa;\nvarying float vAlfa;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlfa = aAlfa;');
    sh.fragmentShader = 'varying float vAlfa;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= vAlfa;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vAlfa * vAlfa * diffuseColor.a;');
  };
  mat.customProgramCacheKey = () => 'trilha_v1';
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const alfa = new THREE.InstancedBufferAttribute(new Float32Array(CAP), 1); alfa.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aAlfa', alfa);
  const im = new THREE.InstancedMesh(geo, mat, CAP); im.count = 0; im.frustumCulled = false; im.receiveShadow = true; im.renderOrder = 1;
  
  ENG.scene.add(im);
  const T = { im, alfa, cap: CAP, itens: [], prox: 0 };
  ELEM.trilhas[tipo] = T; return T;
};
const _m4 = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _nn = new THREE.Vector3(), _ss = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _pp = new THREE.Vector3(), _qr = new THREE.Quaternion();
ELEM.marcar = function (tipo, x, z, tam, dur) {
  const mundo = ENG.mundo; if (!mundo) return;
  const T = ELEM.trilha(tipo);
  const i = T.prox; T.prox = (T.prox + 1) % T.cap;
  // apoiado no relevo
  const e = 0.4, h = mundo.h(x, z);
  _nn.set(mundo.h(x - e, z) - mundo.h(x + e, z), 2 * e, mundo.h(x, z - e) - mundo.h(x, z + e)).normalize();
  _qq.setFromUnitVectors(_up, _nn).multiply(_qr.setFromAxisAngle(_up, Math.random() * 6.28));
  T.itens[i] = { x, y: h + 0.05, z, tam, t: 0, dur, q: _qq.clone() };
  T.im.count = Math.max(T.im.count, i + 1);
};
ELEM.atualizarTrilhas = function (dt) {
  for (const T of Object.values(ELEM.trilhas)) {
    let algum = false;
    for (let i = 0; i < T.im.count; i++) {
      const it = T.itens[i]; let a = 0;
      if (it && it.t < it.dur) {
        it.t += dt; const k = it.t / it.dur;
        a = Math.min(1, it.t / 0.25) * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
        const s = it.tam * (0.75 + 0.25 * Math.min(1, it.t / 0.6));
        _m4.compose(_pp.set(it.x, it.y, it.z), it.q, _ss.set(s, 1, s)); T.im.setMatrixAt(i, _m4);
        algum = true;
      } else if (it) { _m4.makeScale(0, 0, 0); T.im.setMatrixAt(i, _m4); }
      T.alfa.array[i] = a;
    }
    T.im.instanceMatrix.needsUpdate = true; T.alfa.needsUpdate = true; T.im.visible = algum;
  }
};
ELEM.limparTrilhas = function () {
  for (const T of Object.values(ELEM.trilhas)) { T.itens = []; T.im.count = 0; T.prox = 0; }
};

// ---------- emissão por monstro ----------
const _a = new THREE.Vector3();
ELEM.efeitos = {
  fogo(e, m, dt, esc) {
    const taxa = 30 * esc * (e.boss ? 2.2 : 1);
    for (let k = ELEM.qtd(taxa, dt); k > 0; k--) {
      if (!ELEM.pontoCorpo(m, _a)) return;
      FX({ x: _a.x, y: _a.y, z: _a.z, n: 1, tipo: 'chama', cor: '#ffc050', corFim: '#ff2a05', brilho: 2.2, brilhoFim: 0.8, vel: 0.5, sobe: 0.2, vy: 1.8 + Math.random() * 1.4, vida: 0.75, tam: 0.7 * esc, tamFim: 0.12, arrasto: 1.2, espalhar: 0.08 });
    }
    // brilho de calor em volta do corpo
    if (Math.random() < dt * 5 * esc) FX({ x: e.x, y: (e.y || 0) + 1.0 * esc, z: e.z, n: 1, tipo: 'brilho', cor: '#ff6018', brilho: 0.5, vel: 0.1, vida: 0.6, tam: 2.4 * esc, tamFim: 2.6 * esc, espalhar: 0.3 });
    if (Math.random() < dt * 10 * esc && ELEM.pontoCorpo(m, _a)) FX({ x: _a.x, y: _a.y, z: _a.z, n: 1, tipo: 'brasa', cor: '#ffc060', corFim: '#ff4010', vel: 1.2, vy: 2.5, vida: 1.4, tam: 0.09, grav: -0.6, arrasto: 0.8, girar: 6 });
    if (Math.random() < dt * 3 * esc && ELEM.pontoCorpo(m, _a)) FM({ x: _a.x, y: _a.y + 0.3, z: _a.z, n: 1, tipo: 'fumaca', cor: '#2a2420', vel: 0.3, vy: 1.4, vida: 1.6, tam: 0.5 * esc, tamFim: 1.4 * esc, alfa: 0.35 });
    ELEM.rastro(e, 'queimado', 0.75 * esc, 0.7, 9);
    // brasas que ficam no chão por onde passa
    if (e.mov > 0.2 && Math.random() < dt * 4) FX({ x: e.x + (Math.random() - 0.5) * e.raio, y: (e.y || 0) + 0.08, z: e.z + (Math.random() - 0.5) * e.raio, n: 1, tipo: 'brasa', cor: '#ff9030', corFim: '#601000', vel: 0.1, sobe: 0, vida: 2.2, tam: 0.07, arrasto: 4 });
  },
  gelo(e, m, dt, esc) {
    // névoa gelada que escorre e se acumula nos pés
    const taxa = 7 * esc * (e.boss ? 2 : 1);
    for (let k = ELEM.qtd(taxa, dt); k > 0; k--) {
      if (!ELEM.pontoCorpo(m, _a)) return;
      FM({ x: _a.x, y: _a.y, z: _a.z, n: 1, tipo: 'nevoa', cor: '#d8f0ff', vel: 0.3, sobe: 0.2, vy: -0.4, vida: 1.4, tam: 0.35 * esc, tamFim: 1.0 * esc, alfa: 0.2, arrasto: 1.5 });
    }
    if (Math.random() < dt * 2.5 * esc) FM({ x: e.x, y: (e.y || 0) + 0.12, z: e.z, n: 1, tipo: 'nevoa', cor: '#e8f8ff', vel: 0.5, anelPlano: true, vida: 1.6, tam: 0.6 * esc, tamFim: 1.6 * esc, alfa: 0.14, espalhar: e.raio * 1.2 });
    if (Math.random() < dt * 9 * esc && ELEM.pontoCorpo(m, _a)) FX({ x: _a.x, y: _a.y, z: _a.z, n: 1, tipo: 'floco', cor: '#e0f6ff', vel: 0.4, vy: -0.4, vida: 1.6, tam: 0.1, grav: 0.4, girar: 3, brilho: 0.9 });
    ELEM.rastro(e, 'geada', 1.0 * esc, 1.0, 12);
  },
  veneno(e, m, dt, esc) {
    const taxa = 7 * esc * (e.boss ? 2 : 1);
    for (let k = ELEM.qtd(taxa, dt); k > 0; k--) {
      if (!ELEM.pontoCorpo(m, _a)) return;
      FX({ x: _a.x, y: _a.y, z: _a.z, n: 1, tipo: 'bolha', cor: '#a8ff40', corFim: '#4a8a10', brilho: 0.9, brilhoFim: 0.5, vel: 0.2, vy: 0.9, vida: 1.0, tam: 0.14 * esc, tamFim: 0.2 * esc, arrasto: 2 });
    }
    if (Math.random() < dt * 4 * esc && ELEM.pontoCorpo(m, _a)) FM({ x: _a.x, y: _a.y, z: _a.z, n: 1, tipo: 'gota', cor: '#6ab020', vel: 0.1, sobe: 0, vy: -0.5, grav: 9, vida: 0.7, tam: 0.12, alfa: 0.9 });
    if (Math.random() < dt * 1.5 * esc) FM({ x: e.x, y: (e.y || 0) + 0.3, z: e.z, n: 1, tipo: 'nevoa', cor: '#6a9a30', vel: 0.3, vy: 0.4, vida: 2.0, tam: 0.6 * esc, tamFim: 1.8 * esc, alfa: 0.22, espalhar: e.raio });
    ELEM.rastro(e, 'gosma', 0.9 * esc, 0.9, 10);
  },
  espectral(e, m, dt, esc) {
    if (Math.random() < dt * 7 * esc && ELEM.pontoCorpo(m, _a)) FX({ x: _a.x, y: _a.y, z: _a.z, n: 1, tipo: 'nevoa', cor: '#7090ff', corFim: '#203060', brilho: 0.55, vel: 0.3, vy: 0.5, vida: 1.1, tam: 0.35, tamFim: 0.9, arrasto: 1.8 });
  },
  agua(e, m, dt, esc) {
    if (Math.random() < dt * 6 * esc && ELEM.pontoCorpo(m, _a)) FM({ x: _a.x, y: _a.y, z: _a.z, n: 1, tipo: 'gota', cor: '#9fd8e8', vel: 0.05, sobe: 0, vy: -0.3, grav: 11, vida: 0.6, tam: 0.09, alfa: 0.8 });
  },
  areia(e, m, dt, esc) {
    if (e.mov > 0.2 && Math.random() < dt * 5 * esc) FM({ x: e.x, y: (e.y || 0) + 0.2, z: e.z, n: 1, tipo: 'fumaca', cor: '#c8a870', vel: 0.6, anelPlano: true, vida: 1.1, tam: 0.4, tamFim: 1.0, alfa: 0.35, espalhar: 0.5 });
    if (Math.random() < dt * 2 && ELEM.pontoCorpo(m, _a)) FM({ x: _a.x, y: _a.y, z: _a.z, n: 1, tipo: 'pedra', cor: '#b89a60', vel: 0.1, vy: -0.2, grav: 8, vida: 0.7, tam: 0.05, alfa: 0.9 });
  },
};
ELEM.qtd = (taxa, dt) => { const v = taxa * dt; return Math.floor(v) + (Math.random() < v % 1 ? 1 : 0); };
// deixa marcas no chão conforme anda
ELEM.rastro = function (e, tipo, tam, passo, dur) {
  if (e.voa || (e.d && e.d.rig === 'voador')) return;
  const ult = e._rastro; const d = ult ? Math.hypot(e.x - ult.x, e.z - ult.z) : 1e9;
  if (d < passo * Math.max(0.8, e.raio)) return;
  e._rastro = { x: e.x, z: e.z };
  if (!ult) return;
  ELEM.marcar(tipo, e.x + (Math.random() - 0.5) * 0.3, e.z + (Math.random() - 0.5) * 0.3, tam * (0.8 + Math.random() * 0.4) * Math.max(0.8, e.raio * 1.4), dur * (0.8 + Math.random() * 0.4));
};

ELEM.atualizar = function (dt) {
  if (!J.jog || !J.mundo || typeof FX === 'undefined') return;
  ELEM.quadro++;
  const jx = J.jog.x, jz = J.jog.z, R = ELEM.raioAtivo;
  for (const e of J.inimigos) {
    if (e.morto || !e.m || !e.m.raiz || !e.m.raiz.visible) continue;
    if (Math.abs(e.x - jx) > R || Math.abs(e.z - jz) > R) continue;
    if (e._aura === undefined) e._aura = ELEM.auraDe(e);
    const fn = e._aura && ELEM.efeitos[e._aura]; if (!fn) continue;
    const esc = Math.min(2.6, Math.max(0.6, (e.m.escala || 1)));
    try { fn(e, e.m, dt, esc); } catch (err) { e._aura = null; }
    if (e.mods && e.mods.includes('explosivo') && Math.random() < dt * 5 && ELEM.pontoCorpo(e.m, _a)) FX({ x: _a.x, y: _a.y, z: _a.z, n: 2, tipo: 'faisca', cor: '#ffd070', corFim: '#ff5010', vel: 3, vida: 0.35, tam: 0.18, estica: 2.5, grav: 6 });
  }
  ELEM.atualizarTrilhas(dt);
};

// ---------- sombreamento suave nos modelos animados low-poly ----------
// normais suavizadas por posição, mantendo quinas acima do ângulo de vinco (garras, pontas de asa)
ELEM.suavizar = function (cena, vincoGraus = 58) {
  const porPos = new Map();
  cena.traverse(o => { if (o.isMesh && o.geometry && o.geometry.index) { const pa = o.geometry.attributes.position; if (!porPos.has(pa)) porPos.set(pa, []); porPos.get(pa).push(o.geometry); } });
  const cosV = Math.cos(vincoGraus * Math.PI / 180);
  for (const [pa, geos] of porPos) {
    const nor = geos[0].attributes.normal; if (!nor) continue;
    const n = pa.count; const tris = [];
    for (const g of geos) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) tris.push(ix[i], ix[i + 1], ix[i + 2]); }
    // normal de cada face (ponderada pela área) e faces de cada vértice
    const nf = new Float32Array(tris.length); const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const facesV = Array.from({ length: n }, () => []);
    for (let t = 0; t < tris.length; t += 3) {
      a.fromBufferAttribute(pa, tris[t]); b.fromBufferAttribute(pa, tris[t + 1]); c.fromBufferAttribute(pa, tris[t + 2]);
      b.sub(a); c.sub(a); b.cross(c); nf[t] = b.x; nf[t + 1] = b.y; nf[t + 2] = b.z;
      facesV[tris[t]].push(t); facesV[tris[t + 1]].push(t); facesV[tris[t + 2]].push(t);
    }
    // vértices na mesma posição (duplicados do sombreamento chapado)
    const chave = (i) => `${Math.round(pa.getX(i) * 1e4)},${Math.round(pa.getY(i) * 1e4)},${Math.round(pa.getZ(i) * 1e4)}`;
    const grupos = new Map(); for (let i = 0; i < n; i++) { const k = chave(i); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(i); }
    const ref = new THREE.Vector3(), soma = new THREE.Vector3(), fv = new THREE.Vector3();
    for (const lista of grupos.values()) {
      const faces = []; for (const i of lista) faces.push(...facesV[i]);
      for (const i of lista) {
        if (!facesV[i].length) continue;
        ref.set(0, 0, 0); for (const t of facesV[i]) ref.add(fv.set(nf[t], nf[t + 1], nf[t + 2])); ref.normalize();
        soma.set(0, 0, 0);
        for (const t of faces) { fv.set(nf[t], nf[t + 1], nf[t + 2]); const L = fv.length(); if (L < 1e-12) continue; if (fv.dot(ref) / L >= cosV) soma.add(fv); }
        if (soma.lengthSq() > 0) { soma.normalize(); nor.setXYZ(i, soma.x, soma.y, soma.z); }
      }
    }
    nor.needsUpdate = true;
  }
};
const ELEM_SUAVIZAR = ['lobo', 'morcego', 'dragonete', 'dragao_gelo', 'lodo']; // a águia já é densa
{
  const m0 = A3D.molde;
  A3D.molde = function (chave) {
    const T = m0.apply(this, arguments);
    if (T && !T._suave && ELEM_SUAVIZAR.includes(chave) && !(T.cfg && T.cfg.realista)) {
      T._suave = true; const arq = T.cfg.arq;
      // várias configurações usam o mesmo arquivo (dragonete e dragão de gelo): suaviza uma vez por arquivo
      ELEM._feitos = ELEM._feitos || new Set();
      if (!ELEM._feitos.has(arq)) { ELEM._feitos.add(arq); try { ELEM.suavizar(T.cena); } catch (e) { console.warn('suavizar', e); } }
    }
    return T;
  };
  const at0 = J.atualizar;
  J.atualizar = function (dt) { const r = at0.apply(this, arguments); try { ELEM.atualizar(dt); } catch (e) { console.error('elementos', e); } return r; };
  const ea0 = J.entrarArea;
  if (ea0) J.entrarArea = function () { ELEM.limparTrilhas(); return ea0.apply(this, arguments); };
}
