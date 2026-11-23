// ============================================================
//  Animação realista dos modelos .glb
//  - mistura contínua parado ↔ andar ↔ correr, com a velocidade da
//    passada calibrada pela pegada (sem "patinar" no chão)
//  - ataque só no tronco enquanto as pernas continuam andando
//  - inclinação nas curvas e acelerações, corpo de quadrúpedes
//    acompanhando o declive
//  - cabeça acompanhando o alvo
//  - IK de pernas: os pés pousam no relevo do terreno
//  - reação a golpes
//  - atualização reduzida para modelos fora da tela ou distantes
// ============================================================
'use strict';

const ANIM = {
  ativo: true,
  v1: new THREE.Vector3(), v2: new THREE.Vector3(), v3: new THREE.Vector3(), v4: new THREE.Vector3(), v5: new THREE.Vector3(),
  q1: new THREE.Quaternion(), q2: new THREE.Quaternion(), q3: new THREE.Quaternion(), q4: new THREE.Quaternion(),
  m4: new THREE.Matrix4(), esfera: new THREE.Sphere(), frustum: new THREE.Frustum(), quadroFrustum: -1, quadro: 0,
  CIMA: new THREE.Vector3(0, 1, 0),
};

// ---------- proporções (modelos estilizados "cabeçudos" → proporção adulta) ----------
// escala uniforme de cada osso (uniforme não distorce a malha); valores relativos ao pai
const PROPORCOES = {
  heroico: { spine: 1.06, head: 0.6 / 1.06, upperarml: 1.1 / 1.06, upperarmr: 1.1 / 1.06, handl: 1 / 1.1, handr: 1 / 1.1, upperlegl: 1.5, upperlegr: 1.5, footl: 1.05 / 1.5, footr: 1.05 / 1.5 },
};
ANIM.proporcaoDe = (cfg) => cfg.proporcao === false || cfg.realista ? null : PROPORCOES[cfg.proporcao || ((cfg.anim === 'anim_herois' || cfg.anim === 'anim_esqueletos') ? 'heroico' : '')] || null;
ANIM.prepararProporcao = function (m, an) {
  const P = ANIM.proporcaoDe(m.cfg); if (!P) return;
  const ossos = {}; m.raiz.traverse(o => { if (o.isBone && P[o.name] != null) ossos[o.name] = o; });
  if (!Object.keys(ossos).length) return;
  an.prop = { P, ossos, ergue: 0 };
  // as pernas mais longas levantam o corpo: mede a perna na pose atual
  const coxa = ossos.upperlegl || ossos.upperlegr, pe = ossos.footl || ossos.footr;
  if (coxa && pe && (P.upperlegl || P.upperlegr)) {
    m.raiz.updateMatrixWorld(true);
    const a = coxa.getWorldPosition(new THREE.Vector3()), b = pe.getWorldPosition(new THREE.Vector3());
    an.prop.ergue = Math.max(0, a.y - b.y) / Math.max(1e-4, m.raiz.scale.y) * ((P.upperlegl || P.upperlegr) - 1);
  }
};
ANIM.aplicarProporcao = function (an) {
  const pr = an.prop; if (!pr) return;
  for (const [n, o] of Object.entries(pr.ossos)) o.scale.setScalar(pr.P[n]);
};

// ---------- ossos ----------
const RX_INFERIOR = /hip|pelvis|leg|thigh|calf|shin|knee|foot|toe|ankle|upleg|root|coxa|perna|pe_|quadril/i;
const RX_PE = /foot|ankle|(^|[^a-z])pe([^a-z]|$)/i;
const RX_CABECA = /head|cabeca|cabeça/i;
const RX_PESCOCO = /neck|pescoco/i;
const RX_TRONCO = /spine|chest|torso|tronco/i;

ANIM.nomeOsso = (n) => THREE.PropertyBinding.sanitizeNodeName(n || '');
ANIM.trilhaNo = (t) => { try { return THREE.PropertyBinding.parseTrackName(t.name).nodeName; } catch (e) { return ''; } };

// ossos relevantes de uma instância (cabeça, tronco, pernas)
ANIM.mapearOssos = function (raiz) {
  const ossos = [];
  raiz.traverse(o => { if (o.isBone) ossos.push(o); });
  if (!ossos.length) return null;
  const achar = (rx, excl) => ossos.find(o => rx.test(o.name) && !(excl && excl.test(o.name)));
  const cabeca = achar(RX_CABECA, /end|top|_end|nub/i);
  const pescoco = achar(RX_PESCOCO);
  const troncos = ossos.filter(o => RX_TRONCO.test(o.name));
  // pernas: pé com pai (canela) e avô (coxa) também ossos
  const pes = ossos.filter(o => RX_PE.test(o.name) && !/toe|ball|end|ik|pole|target|control|roll|heel|ctrl/i.test(o.name) && o.parent && o.parent.isBone && o.parent.parent && o.parent.parent.isBone);
  let pesF = pes.filter(p => !pes.includes(p.parent));
  let cab = cabeca;
  // nomes fora do padrão: deduz pela estrutura (pés = ossos mais baixos, cabeça = o mais alto)
  if (pesF.length < 2 || !cab) {
    raiz.updateMatrixWorld(true);
    const pos = new Map(ossos.map(o => [o, o.getWorldPosition(new THREE.Vector3())]));
    const ys = ossos.map(o => pos.get(o).y); const ymin = Math.min(...ys), ymax = Math.max(...ys), H = Math.max(1e-3, ymax - ymin);
    if (!cab) { let topo = ossos.reduce((a, o) => pos.get(o).y > pos.get(a).y ? o : a, ossos[0]); if (!topo.children.some(c => c.isBone) && topo.parent && topo.parent.isBone && pos.get(topo).y - pos.get(topo.parent).y < H * 0.08) topo = topo.parent; cab = topo; }
    if (pesF.length < 2) {
      const baixos = ossos.filter(o => pos.get(o).y < ymin + H * 0.12);
      pesF = baixos.filter(o => !baixos.includes(o.parent) && o.parent && o.parent.isBone && o.parent.parent && o.parent.parent.isBone && pos.get(o.parent.parent).y > ymin + H * 0.3);
    }
  }
  const pernas = pesF.map(p => ({ pe: p, canela: p.parent, coxa: p.parent.parent, off: 0 }));
  return { cabeca: cab, pescoco, tronco: troncos[troncos.length - 1] || null, troncos, pernas, bipede: pernas.length === 2 && !!cab };
};

// ---------- clipes do tronco / das pernas ----------
ANIM.dividir = function (clip, inferior) {
  const tr = clip.tracks.filter(t => RX_INFERIOR.test(ANIM.trilhaNo(t)) === inferior);
  if (!tr.length || tr.length === clip.tracks.length) return null;
  return new THREE.AnimationClip(clip.name + (inferior ? '__inf' : '__sup'), clip.duration, tr);
};

// ---------- calibração da velocidade natural de um ciclo de caminhada ----------
// mede a velocidade horizontal do pé apoiado no chão (em clipes "no lugar", é a velocidade do corpo)
ANIM.calibrar = function (T, nome) {
  T.vn = T.vn || {};
  if (T.vn[nome] !== undefined) return T.vn[nome];
  const clip = T.clips[nome]; let res = null;
  try {
    if (clip) {
      const inst = THREE.SkeletonUtils.clone(T.cena); inst.position.set(0, 0, 0); inst.rotation.set(0, 0, 0); inst.scale.setScalar(T.esc);
      const ossos = ANIM.mapearOssos(inst);
      const mixer = new THREE.AnimationMixer(inst); const a = mixer.clipAction(clip); a.play();
      const N = 48, dur = clip.duration || 1, alt = (T.cfg.altura || T.cfg.tamanho || 1.8);
      const pes = ossos ? ossos.pernas.map(p => p.pe) : [];
      const quadril = inst.getObjectByProperty('isBone', true);
      const amostras = pes.map(() => []); const q0 = new THREE.Vector3(), qN = new THREE.Vector3();
      for (let i = 0; i <= N; i++) {
        mixer.setTime(dur * i / N); inst.updateMatrixWorld(true);
        pes.forEach((p, k) => amostras[k].push(p.getWorldPosition(new THREE.Vector3())));
        if (quadril) { if (i === 0) quadril.getWorldPosition(q0); if (i === N) quadril.getWorldPosition(qN); }
      }
      const vels = [];
      for (const am of amostras) {
        const ymin = Math.min(...am.map(p => p.y)); const lim = ymin + alt * 0.035;
        let d = 0, t = 0;
        for (let i = 1; i < am.length; i++) if (am[i].y < lim && am[i - 1].y < lim) { d += Math.hypot(am[i].x - am[i - 1].x, am[i].z - am[i - 1].z); t += dur / N; }
        if (t > dur * 0.15) vels.push(d / t);
      }
      vels.sort((a, b) => a - b);
      if (vels.length && vels[vels.length >> 1] > alt * 0.08) res = vels[vels.length >> 1];
      else if (quadril && Math.hypot(qN.x - q0.x, qN.z - q0.z) > alt * 0.2) res = Math.hypot(qN.x - q0.x, qN.z - q0.z) / dur; // clipe com deslocamento próprio
      mixer.stopAllAction(); mixer.uncacheRoot(inst);
    }
  } catch (e) { console.warn('calibração', nome, e); }
  if (!res) { const alt = (T.cfg.altura || (T.cfg.tamanho || 1.8) * 0.7); res = (nome === 'correr' ? 3.4 : 1.3) * alt / 1.8; }
  T.vn[nome] = res; return res;
};

// ---------- estado por modelo ----------
ANIM.estado = function (m) {
  if (m.an) return m.an;
  const T = m.T;
  m.an = {
    pesos: {}, acoes: {}, pos: new THREE.Vector3(), temPos: false, vel: 0, velF: 0, acel: 0, yaw: null, yawV: 0,
    incX: 0, incZ: 0, pivoY: 0, olharYaw: 0, golpe: 0, flashAnt: 0, acumDt: 0, atqAnt: null, atqNome: null, morteIni: false,
    ossos: ANIM.mapearOssos(m.raiz),
  };
  ANIM.prepararProporcao(m, m.an);
  // pose de repouso dos ossos que o código gira (cabeça, pescoço, tronco, pernas):
  // é reposta antes de cada atualização, senão os ajustes se acumulam quando a animação não mexe nesses ossos
  const O = m.an.ossos, mexidos = new Set();
  if (O) { [O.cabeca, O.pescoco, O.tronco, ...O.troncos].forEach(o => o && mexidos.add(o)); for (const pr of O.pernas) { mexidos.add(pr.coxa); mexidos.add(pr.canela); mexidos.add(pr.pe); } }
  m.an.repouso = [...mexidos].map(o => [o, o.quaternion.clone()]);
  if (!T.vn) { ANIM.calibrar(T, 'andar'); if (T.clips.correr && T.clips.correr !== T.clips.andar) ANIM.calibrar(T, 'correr'); }
  return m.an;
};

ANIM.acao = function (m, chave, clip) {
  const A = m.an.acoes; if (A[chave]) return A[chave];
  if (!clip) return null;
  const a = m.mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(0); a.play(); A[chave] = a; return a;
};
ANIM.clipParte = function (T, nome, inferior) {
  const k = inferior ? 'inf' : 'sup';
  T.partes = T.partes || { inf: {}, sup: {} };
  if (T.partes[k][nome] === undefined) T.partes[k][nome] = T.clips[nome] ? ANIM.dividir(T.clips[nome], inferior) : null;
  return T.partes[k][nome];
};

// ---------- visibilidade / nível de detalhe ----------
ANIM.detalhe = function (m) {
  const cam = ENG.camera; if (!cam) return 2;
  if (ANIM.quadroFrustum !== ANIM.quadro) { ANIM.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); ANIM.frustum.setFromProjectionMatrix(ANIM.m4); ANIM.quadroFrustum = ANIM.quadro; }
  const p = m.raiz.position; const esc = m.escala || 1;
  ANIM.esfera.center.set(p.x, p.y + 1 * esc, p.z); ANIM.esfera.radius = 2.2 * esc + 1;
  if (!ANIM.frustum.intersectsSphere(ANIM.esfera)) return 0;
  const d = cam.position.distanceTo(p);
  return d < 34 ? 2 : 1;
};

// ---------- condução principal ----------
ANIM.animar = function (m, s) {
  const dtReal = m.tAnt == null ? 0 : Math.min(0.1, Math.max(0, s.t - m.tAnt)); m.tAnt = s.t;
  const cfg = m.cfg, T = m.T, pivo = m.p.corpo;
  const an = ANIM.estado(m);
  const det = ANIM.detalhe(m);
  // atualização reduzida fora da tela (1/4) e longe (1/2)
  an.acumDt += dtReal;
  const passo = det === 0 ? 4 : det === 1 ? 2 : 1;
  an.cont = (an.cont || 0) + 1;
  if (an.cont % passo !== 0 && !m.morto) return;
  const dt = Math.min(0.25, an.acumDt); an.acumDt = 0;

  // velocidade medida pelo deslocamento real (serve para monstros, jogador e jogadores remotos)
  const rp = m.raiz.position;
  if (an.temPos && dt > 0) {
    const dx = rp.x - an.pos.x, dz = rp.z - an.pos.z, d = Math.hypot(dx, dz);
    const v = d > 3 ? an.vel : d / dt;
    const yaw = m.raiz.rotation.y;
    // velocidade no sentido em que o corpo aponta (andar de costas conta como menor)
    const vF = v * Math.max(0.35, (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / Math.max(1e-4, d) * 0.5 + 0.5);
    const velAnt = an.vel;
    an.vel += (v - an.vel) * (1 - Math.exp(-dt * 10));
    an.velF += (vF - an.velF) * (1 - Math.exp(-dt * 10));
    an.acel += ((an.vel - velAnt) / dt - an.acel) * (1 - Math.exp(-dt * 6));
    if (an.yaw != null) { let dy = yaw - an.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); an.yawV += (dy / dt - an.yawV) * (1 - Math.exp(-dt * 8)); }
    an.yaw = yaw;
  }
  an.pos.copy(rp); an.temPos = true;
  if (s.andar === 0 && an.vel < 0.05) an.vel = 0;

  const esc = (m.escala || 1);
  const alvo = {}; // chave da ação -> peso desejado
  let atqParcial = false;
  // --- seleção de camadas ---
  if (m.surgirT > 0) { m.surgirT -= dt; if (T.clips.surgir) { alvo.surgir = 1; const a = ANIM.acao(m, 'surgir', T.clips.surgir); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } else m.surgirT = 0; }
  if (m.surgirT > 0 && T.clips.surgir) { /* só o surgimento */ }
  else if (m.morto) {
    if (T.clips.morte) {
      const a = ANIM.acao(m, 'morte', T.clips.morte);
      if (!an.morteIni) { a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = 0.9 + Math.random() * 0.25; a.play(); an.morteIni = true; }
      alvo.morte = 1;
    } else { m.semMorte = true; alvo.idle = 1; }
  } else if (s.rolar != null && T.clips.esquiva) {
    const a = ANIM.acao(m, 'esquiva', T.clips.esquiva); a.timeScale = 0; a.time = Math.min(1, s.rolar) * a.getClip().duration * 0.95; alvo.esquiva = 1;
  } else {
    an.morteIni = false;
    let nomeAtq = null;
    if (s.atq != null) {
      const opcoes = ALIAS_ATQ[s.tipoAtq || 'golpe'] || ['golpe'];
      nomeAtq = opcoes.find(n => T.clips[n]) || null;
    }
    // locomoção (pesos por velocidade)
    const vnA = ANIM.calibrar(T, 'andar') * esc;
    const temCorrer = T.clips.correr && T.clips.correr !== T.clips.andar;
    const vnC = temCorrer ? ANIM.calibrar(T, 'correr') * esc : vnA * 2.2;
    const v = an.velF;
    let wI = 1, wA = 0, wC = 0;
    if (T.clips.andar) {
      const kA = THREE.MathUtils.smoothstep(v, vnA * 0.12, vnA * 0.55);
      const kC = temCorrer ? THREE.MathUtils.smoothstep(v, vnA * 1.05, Math.max(vnA * 1.3, vnC * 0.8)) : 0;
      wI = 1 - kA; wA = kA * (1 - kC); wC = kA * kC;
    }
    if (!temCorrer) { wA += wC; wC = 0; }
    if (nomeAtq) {
      const mexendo = an.vel > vnA * 0.3 && an.ossos && an.ossos.bipede;
      const sup = mexendo ? ANIM.clipParte(T, nomeAtq, false) : null;
      const chaveAtq = sup ? nomeAtq + '__sup' : nomeAtq;
      const a = ANIM.acao(m, chaveAtq, sup || T.clips[nomeAtq]);
      // reinício de golpe (novo ataque)
      if (an.atqNome !== chaveAtq || (an.atqAnt != null && s.atq < an.atqAnt - 0.3)) { a.reset(); a.play(); }
      a.timeScale = 0; a.time = Math.min(0.999, s.atq) * a.getClip().duration;
      an.atqNome = chaveAtq; an.atqAnt = s.atq;
      alvo[chaveAtq] = 1;
      if (sup) {
        atqParcial = true;
        // pernas continuam com a locomoção (só as trilhas de baixo)
        if (wI > 0.01) alvo.idle__inf = wI; if (wA > 0.01) alvo.andar__inf = wA; if (wC > 0.01) alvo.correr__inf = wC;
      }
    } else {
      an.atqNome = null; an.atqAnt = null;
      if (s.atq != null && !nomeAtq) { wI = 0; wA = 0; wC = 1; }
      if (wI > 0.01) alvo.idle = wI; if (wA > 0.01) alvo.andar = wA; if (wC > 0.01) alvo.correr = wC;
    }
    // passada no ritmo do deslocamento
    const tsA = THREE.MathUtils.clamp(v / Math.max(0.05, vnA), 0.55, temCorrer ? 1.7 : 2.4);
    const tsC = THREE.MathUtils.clamp(v / Math.max(0.05, vnC), 0.6, 1.9) * (temCorrer ? 1 : (cfg.velCorrer || 1));
    m._ts = { andar: tsA, correr: temCorrer ? tsC : Math.max(tsA, tsC), idle: 1 };
  }
  // --- mistura (suaviza os pesos e cria as ações necessárias) ---
  // chaves que apontam para o mesmo clipe viram uma só ação (ex.: aves com um único ciclo de voo)
  const resolver = (chave) => { const [base, parte] = chave.split('__'); return parte ? ANIM.clipParte(T, base, parte === 'inf') : T.clips[base]; };
  const porClip = new Map();
  for (const chave of Object.keys(alvo)) {
    const clip = resolver(chave); if (!clip) { delete alvo[chave]; continue; }
    if (porClip.has(clip)) { const k0 = porClip.get(clip); alvo[k0] = Math.min(1, alvo[k0] + alvo[chave]); delete alvo[chave]; }
    else porClip.set(clip, chave);
  }
  for (const [chave, a] of Object.entries(an.acoes)) { const k0 = porClip.get(a.getClip()); if (k0 && k0 !== chave) { alvo[chave] = alvo[k0]; delete alvo[k0]; } }
  const tau = m.morto ? 0.18 : 0.1;
  const kMix = 1 - Math.exp(-dt / tau);
  for (const chave of Object.keys(alvo)) if (!an.acoes[chave]) ANIM.acao(m, chave, resolver(chave));
  let fase = null;
  for (const [chave, a] of Object.entries(an.acoes)) {
    const w0 = an.pesos[chave] || 0, w1 = alvo[chave] || 0;
    let w = w0 + (w1 - w0) * kMix; if (w1 === 0 && w < 0.005) w = 0; if (w1 > 0 && w0 === 0 && kMix >= 0.999) w = w1;
    an.pesos[chave] = w;
    a.enabled = w > 0; a.setEffectiveWeight(w);
    const base = chave.split('__')[0];
    if (m._ts && (base === 'andar' || base === 'correr' || base === 'idle') && !m.morto) {
      a.timeScale = m._ts[base] || 1;
      // fases sincronizadas entre andar e correr (os pés não "pulam" na transição)
      if (base !== 'idle' && w > 0) {
        if (fase == null || w > 0.5) fase = (a.time / a.getClip().duration) % 1;
      }
    }
  }
  if (fase != null) for (const [chave, a] of Object.entries(an.acoes)) {
    const base = chave.split('__')[0];
    if ((base === 'andar' || base === 'correr') && (an.pesos[chave] || 0) > 0 && (an.pesos[chave] || 0) <= 0.5) a.time = fase * a.getClip().duration;
  }
  m.atual = Object.keys(alvo)[0] || null;
  for (const [o, q] of an.repouso) o.quaternion.copy(q);
  m.mixer.update(dt);
  ANIM.aplicarProporcao(an);

  // --- complementos procedurais (pivô) ---
  let y = (cfg.voa ? cfg.voa + Math.sin(s.t * 3) * 0.12 : 0) + (an.prop ? an.prop.ergue * (m.morto ? Math.max(0, 1 - (m.mortoT || 0) * 1.5) : 1) : 0);
  let z = 0;
  if ((!T.clips.golpe || cfg.bote) && s.atq != null) { const e = Math.sin(Math.min(1, s.atq) * Math.PI); z = e * 0.7; if (cfg.voa) y -= e * 0.8; }
  if (m.morto && m.semMorte) { pivo.rotation.z = Math.min(1.45, (pivo.rotation.z || 0) + dt * 4); if (cfg.voa) y = Math.max(0, y - (m.mortoT || 0) * 3); pivo.position.set(0, y, z); return; }

  // inclinação: curva (centrípeta) e aceleração; quadrúpedes acompanham o declive
  const vnRef = Math.max(0.5, ANIM.calibrar(T, 'andar') * esc);
  let alvoX = THREE.MathUtils.clamp(an.acel * 0.012, -0.1, 0.12) + Math.min(0.08, an.vel / vnRef * 0.025);
  let alvoZ = THREE.MathUtils.clamp(-an.yawV * an.vel * 0.018, -0.2, 0.2);
  const mundo = ENG.mundo;
  if (mundo && !cfg.voa && !m.morto && det === 2 && (!an.ossos || !an.ossos.bipede)) {
    const yaw = m.raiz.rotation.y, sy = Math.sin(yaw), cy = Math.cos(yaw);
    const L = Math.max(0.4, (cfg.tamanho || 1.6) * esc * 0.45), W = L * 0.55;
    const hF = mundo.h(rp.x + sy * L, rp.z + cy * L), hT = mundo.h(rp.x - sy * L, rp.z - cy * L);
    const hD = mundo.h(rp.x + cy * W, rp.z - sy * W), hE = mundo.h(rp.x - cy * W, rp.z + sy * W);
    alvoX += THREE.MathUtils.clamp(Math.atan2(hT - hF, 2 * L), -0.45, 0.45);
    alvoZ += THREE.MathUtils.clamp(Math.atan2(hD - hE, 2 * W), -0.35, 0.35);
  }
  // reação ao golpe
  an.golpe = Math.max(0, an.golpe - dt * 4.5);
  const recuo = an.golpe > 0 ? Math.sin((1 - an.golpe) * Math.PI) * an.golpe : 0;
  alvoX -= recuo * 0.22;
  const kI = 1 - Math.exp(-dt * 7);
  an.incX += (alvoX - an.incX) * kI; an.incZ += (alvoZ - an.incZ) * kI;
  if (!m.semMorte) { pivo.rotation.x = an.incX; pivo.rotation.z = an.incZ; }
  pivo.position.set(0, y, z);

  // --- ossos (só perto da câmera) ---
  let queda = 0; // eslint-disable-line no-unused-vars
  if (det === 2 && an.ossos && !m.morto) {
    m.raiz.updateMatrixWorld(true);
    ANIM.olhar(m, an, s, dt);
    ANIM.tremorGolpe(m, an, recuo);
    if (an.ossos.bipede && !cfg.voa && mundo && PELE_QUALIDADE_IK()) queda = ANIM.pesNoChao(m, an, dt);
  }
  if (!queda) an.pivoY *= 0.8;
};
function PELE_QUALIDADE_IK() { return typeof GFX === 'undefined' || GFX.qualidade !== 'media'; }

// cabeça (e um pouco do pescoço/tronco) vira para o alvo
ANIM.alvoOlhar = function (m) {
  if (typeof J === 'undefined' || !J.jog) return null;
  if (J.jog.m === m) return null;
  const j = J.jog; const p = m.raiz.position;
  const d = Math.hypot(j.x - p.x, j.z - p.z);
  return d < 11 && d > 0.6 ? ANIM.v5.set(j.x, (j.y || 0) + 1.5, j.z) : null;
};
ANIM.olhar = function (m, an, s, dt) {
  const O = an.ossos; if (!O.cabeca) return;
  const alvo = s.atq == null ? ANIM.alvoOlhar(m) : null;
  let desejado = 0;
  if (alvo) {
    const rp = m.raiz.position; const yaw = m.raiz.rotation.y;
    let a = Math.atan2(alvo.x - rp.x, alvo.z - rp.z) - yaw; a = Math.atan2(Math.sin(a), Math.cos(a));
    desejado = Math.abs(a) < 1.9 ? THREE.MathUtils.clamp(a, -1.1, 1.1) : 0;
  }
  an.olharYaw += (desejado - an.olharYaw) * (1 - Math.exp(-dt * 5));
  if (Math.abs(an.olharYaw) < 0.005) return;
  const partes = [[O.cabeca, 0.6], [O.pescoco, 0.25], [O.tronco, 0.15]];
  for (const [osso, k] of partes) if (osso) ANIM.girarMundo(osso, ANIM.CIMA, an.olharYaw * (O.pescoco || O.tronco ? k : 1));
};
// gira um osso em torno de um eixo do mundo (respeitando a rotação dos pais)
ANIM.girarMundo = function (osso, eixoMundo, ang) {
  const pai = osso.parent; if (!pai) return;
  pai.getWorldQuaternion(ANIM.q1);
  const eixo = ANIM.v1.copy(eixoMundo).applyQuaternion(ANIM.q2.copy(ANIM.q1).invert()).normalize();
  ANIM.q3.setFromAxisAngle(eixo, ang);
  osso.quaternion.premultiply(ANIM.q3);
  osso.updateMatrixWorld(true);
};
ANIM.tremorGolpe = function (m, an, recuo) {
  if (recuo <= 0.01) return;
  const O = an.ossos; const osso = O.tronco || O.pescoco; if (!osso) return;
  // eixo lateral do corpo (direita do modelo)
  const yaw = m.raiz.rotation.y;
  const lado = ANIM.v2.set(Math.cos(yaw), 0, -Math.sin(yaw));
  ANIM.girarMundo(osso, lado, -recuo * 0.35);
  if (O.cabeca) ANIM.girarMundo(O.cabeca, lado, -recuo * 0.25);
};

// ---------- pés no chão (IK de duas articulações) ----------
ANIM.pesNoChao = function (m, an, dt) {
  const mundo = ENG.mundo; const O = an.ossos; const chao = m.raiz.position.y;
  const k = 1 - Math.exp(-dt * 14);
  let menor = 0; const offs = [];
  for (const pr of O.pernas) {
    pr.pe.getWorldPosition(ANIM.v1);
    let off = mundo.h(ANIM.v1.x, ANIM.v1.z) - chao;
    off = THREE.MathUtils.clamp(off, -0.6 * (m.escala || 1), 0.6 * (m.escala || 1));
    pr.off += (off - pr.off) * k; offs.push(pr.off); menor = Math.min(menor, pr.off);
  }
  // o quadril desce para o pé mais baixo alcançar o chão
  an.pivoY += (menor - an.pivoY) * k;
  if (Math.abs(an.pivoY) > 0.002) { m.p.corpo.position.y += an.pivoY; m.raiz.updateMatrixWorld(true); }
  O.pernas.forEach((pr, i) => { const subir = offs[i] - an.pivoY; if (subir > 0.01) ANIM.ik2(pr, subir); });
  return an.pivoY;
};
ANIM.ik2 = function (pr, subir) {
  const A = pr.coxa.getWorldPosition(new THREE.Vector3());
  const B = pr.canela.getWorldPosition(new THREE.Vector3());
  const C = pr.pe.getWorldPosition(new THREE.Vector3());
  const Tg = C.clone(); Tg.y += subir;
  const a = A.distanceTo(B), b = B.distanceTo(C);
  if (a < 1e-4 || b < 1e-4) return;
  const c = THREE.MathUtils.clamp(A.distanceTo(Tg), Math.abs(a - b) + 1e-3, a + b - 1e-3);
  const qPe = pr.pe.getWorldQuaternion(new THREE.Quaternion());
  // 1) joelho: ajusta o ângulo para a distância quadril→pé ser c
  const BA = A.clone().sub(B), BC = C.clone().sub(B);
  let eixo = new THREE.Vector3().crossVectors(BA, BC);
  if (eixo.lengthSq() < 1e-10) { eixo.set(1, 0, 0).applyQuaternion(pr.coxa.getWorldQuaternion(new THREE.Quaternion())); }
  eixo.normalize();
  const ang0 = BA.angleTo(BC);
  const ang1 = Math.acos(THREE.MathUtils.clamp((a * a + b * b - c * c) / (2 * a * b), -1, 1));
  const delta = ang1 - ang0;
  let qJ = new THREE.Quaternion().setFromAxisAngle(eixo, -delta);
  let C1 = B.clone().add(BC.clone().applyQuaternion(qJ));
  const qJ2 = new THREE.Quaternion().setFromAxisAngle(eixo, delta);
  const C2 = B.clone().add(BC.clone().applyQuaternion(qJ2));
  if (Math.abs(A.distanceTo(C2) - c) < Math.abs(A.distanceTo(C1) - c)) { qJ = qJ2; C1 = C2; }
  ANIM.aplicarMundo(pr.canela, qJ);
  // 2) coxa: gira para levar o pé até o alvo
  const de = C1.clone().sub(A).normalize(), para = Tg.clone().sub(A).normalize();
  const qC = new THREE.Quaternion().setFromUnitVectors(de, para);
  ANIM.aplicarMundo(pr.coxa, qC);
  // 3) pé mantém a orientação que tinha (não tomba)
  pr.canela.getWorldQuaternion(ANIM.q1);
  pr.pe.quaternion.copy(ANIM.q1.invert().multiply(qPe));
  pr.pe.updateMatrixWorld(true);
};
// aplica uma rotação dada no espaço do mundo a um osso
ANIM.aplicarMundo = function (osso, qMundo) {
  const qO = osso.getWorldQuaternion(new THREE.Quaternion());
  const qNovo = qMundo.clone().multiply(qO);
  const qPai = osso.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  osso.quaternion.copy(qPai.multiply(qNovo));
  osso.updateMatrixWorld(true);
};

// ---------- integração ----------
{
  MOD.animarGLTF0 = MOD.animarGLTF;
  MOD.animarGLTF = function (m, s) {
    if (!ANIM.ativo || !m.T) return MOD.animarGLTF0(m, s);
    try { ANIM.animar(m, s); } catch (e) { console.error('animação', e); ANIM.ativo = false; MOD.animarGLTF0(m, s); }
  };
  // golpe recebido: detecta o pico do clarão de dano
  const fl0 = MOD.flash;
  MOD.flash = function (m, k) {
    if (m && m.rig === 'gltf') { const an = m.an; if (an) { if (k > an.flashAnt + 0.35 && k > 0.6) an.golpe = 1; an.flashAnt = k; } }
    return fl0(m, k);
  };
  // contador de quadros para o recorte de visibilidade
  const at0 = J.atualizar;
  J.atualizar = function (dt) { ANIM.quadro++; return at0.apply(this, arguments); };
}
