// ============================================================
//  Núcleo do jogo
// ============================================================
'use strict';

const J = {
  estado: 'menu', pers: null, z: null, jog: null, st: null, buffs: [], tempo: 0,
  input: { teclas: {}, mx: 0, my: 0, botoes: {}, alvo: new THREE.Vector3() },
  textos: [], inimigos: [], projeteis: [], areas: [], drops: [], lacaios: [], agendados: [],
};
const CHAVE_SAVE = 'coroaDeCinzas_v1';
const yawPara = (dx, dz) => Math.atan2(dx, dz);
const angDif = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const corElem = { fisico: '#f0e6d0', fogo: '#ff8a3a', frio: '#9fe0ff', raio: '#fff27a', veneno: '#8aff5a' };

// ------------------------------------------------------------
// Salvar / carregar
// ------------------------------------------------------------
J.salvar = function () {
  if (!J.pers) return;
  try { localStorage.setItem(CHAVE_SAVE, JSON.stringify(J.pers)); } catch (e) { /* armazenamento indisponível */ }
};
J.temSave = function () { try { return !!localStorage.getItem(CHAVE_SAVE); } catch (e) { return false; } };
J.carregarSave = function () {
  try { const s = localStorage.getItem(CHAVE_SAVE); if (!s) return false; J.pers = JSON.parse(s); return true; } catch (e) { return false; }
};
J.apagarSave = function () { try { localStorage.removeItem(CHAVE_SAVE); } catch (e) { } };

J.novoPersonagem = function (classe, nome) {
  const p = {
    nome: nome || CLASSES[classe].nome, classe, asc: null, nivel: 1, xp: 0, arvore: {}, ascNos: {},
    barra: [null, null, null, null, null, null], inv: new Array(40).fill(null), equip: {},
    zonas: ['z1'], concluidas: [], mapaMax: 0, mapasFeitos: 0, frascos: { vida: 30, rec: 30 },
  };
  const arma = IT.gerar(1, { classe, base: CLASSES[classe].arma, raridade: 'normal' });
  p.equip.arma = arma;
  p.equip.peitoral = IT.gerar(1, { classe, base: 'peitoral', raridade: 'normal' });
  p.inv[0] = IT.gerarGema(1, 0);
  // primeira habilidade básica
  const prim = IT.habsDaClasse(classe).find(id => HABILIDADES[id].nivel === 1);
  p.arvore[prim] = 1; p.barra[0] = prim;
  J.pers = p;
  return p;
};

// ------------------------------------------------------------
// Atributos
// ------------------------------------------------------------
J.recalc = function () {
  const vAnt = J.st ? J.st.vidaMax : 0;
  J.st = IT.calcStats(J.pers, J.buffs);
  if (J.jog) {
    if (vAnt && J.st.vidaMax > vAnt) J.jog.vida += J.st.vidaMax - vAnt;
    J.jog.vida = Math.min(J.jog.vida, J.st.vidaMax); J.jog.rec = Math.min(J.jog.rec, J.st.recMax);
  }
};

// ------------------------------------------------------------
// Zonas
// ------------------------------------------------------------
J.defMapa = function (tier) {
  const biomas = Object.keys(BIOMAS);
  const bioma = biomas[(tier * 3 + 1) % biomas.length];
  const nMods = Math.min(4, 1 + Math.floor(tier / 3));
  const mods = RNG.shuffle(MODS_MAPA.slice()).slice(0, nMods);
  return { id: 'mapa' + tier, mapa: true, tier, nome: `Mapa Nível ${tier} — ${BIOMAS[bioma].nome}`, nivel: 44 + tier * 2, bioma, inimigos: BIOMA_INIMIGOS[bioma], chefe: BIOMA_CHEFE[bioma], mods, densidade: 1.15 };
};

J.carregarZona = function (def) {
  // limpar
  for (const e of J.inimigos) { ENG.scene.remove(e.m.raiz); MOD.descartar(e.m); }
  for (const p of J.projeteis) ENG.scene.remove(p.mesh);
  for (const a of J.areas) ENG.removerMalha(a.tel);
  for (const d of J.drops) ENG.scene.remove(d.mesh);
  for (const l of J.lacaios) { ENG.scene.remove(l.m.raiz); MOD.descartar(l.m); }
  if (J.portal) { ENG.scene.remove(J.portal); J.portal = null; }
  J.inimigos = []; J.projeteis = []; J.areas = []; J.drops = []; J.lacaios = []; J.textos = []; J.agendados = [];
  ENG.limparEfeitos(); GFX.limparDecals();
  const mods = def.mods || [];
  const tem = id => mods.some(m => m.id === id);
  J.z = { def, nivel: def.nivel, mods, quant: mods.reduce((s, m) => s + m.quant, 0), completa: false, chefe: null, mortos: 0, total: 0,
    multVida: (tem('mVida') ? 1.4 : 1) * (def.mapa ? 1 + def.tier * 0.06 : 1), multDano: (tem('mDano') ? 1.3 : 1) * (def.mapa ? 1 + def.tier * 0.03 : 1), multVel: tem('mVel') ? 1.2 : 1 };
  J.pers.penalRes = (def.mapa ? 30 : (def.ato - 1) * 10) + (tem('mRes') ? 15 : 0);
  const seed = Math.floor(Math.random() * 1e9);
  const mundo = ENG.construirMundo(def.bioma, seed, { chefe: !!def.chefe });
  J.mundo = mundo;
  // jogador
  if (!J.jog) J.criarJogador();
  const jg = J.jog;
  jg.x = mundo.inicio.x; jg.z = mundo.inicio.z; jg.y = mundo.h(jg.x, jg.z);
  jg.ang = Math.PI / 2; jg.cast = null; jg.dash = null; jg.salto = null; jg.irPara = null; jg.invuln = 0;
  if (!jg.m.raiz.parent) ENG.scene.add(jg.m.raiz);
  J.buffs = [];
  J.recalc();
  jg.vida = J.st.vidaMax; jg.rec = CLASSES[J.pers.classe].recurso.inicio ? J.st.recMax : 0;
  jg.cds = {};
  ENG.camAlvo.set(jg.x, jg.y, jg.z); ENG.camPos.set(jg.x, jg.y + 25, jg.z + 18);
  J.gerarInimigos();
  J.estado = 'jogando';
  UI.aoEntrarZona(def);
  J.salvar();
};

J.gerarInimigos = function () {
  const def = J.z.def, m = J.mundo;
  const dens = (def.densidade || 1) * (J.z.mods.some(x => x.id === 'mDens') ? 1.3 : 1);
  const raros = J.z.mods.some(x => x.id === 'mRaros') ? 2 : 1;
  const grande = (m.AREA || 150) > 200;
  // um grupo de monstros em torno de um ponto do caminho
  const LIMITE = grande ? 400 : 200;
  const grupo = (c, forcar) => {
    if (J.inimigos.length >= LIMITE && !forcar) return;
    const tipo = RNG.pick(def.inimigos);
    let n = RNG.int(3, 6);
    let rarPack = forcar || 'normal';
    if (!forcar) { const r = Math.random(); if (r < 0.07 * raros) rarPack = 'raro'; else if (r < 0.2 * raros) rarPack = 'magico'; }
    if (INIMIGOS[tipo].escala > 1.4) n = Math.max(1, Math.floor(n / 2));
    for (let i = 0; i < n; i++) {
      let x = c.x + (Math.random() - 0.5) * c.w * 1.1, z = c.z + (Math.random() - 0.5) * c.w * 1.1;
      if (!m.andavel(x, z, 1)) { x = c.x; z = c.z; }
      const rr = rarPack === 'raro' ? (i === 0 ? 'raro' : 'magico') : rarPack;
      J.criarInimigo(i > 0 && RNG.chance(0.3) ? RNG.pick(def.inimigos) : tipo, x, z, J.z.nivel + (RNG.chance(0.2) ? 1 : 0), rr);
    }
  };
  // percorre um caminho distribuindo grupos
  const percorrer = (cam, livreIni, livreFim, passo) => {
    let comp = 0; const segs = [];
    for (let i = 0; i < cam.length - 1; i++) { const L = Math.hypot(cam[i + 1].x - cam[i].x, cam[i + 1].z - cam[i].z); segs.push({ a: cam[i], b: cam[i + 1], L, s0: comp }); comp += L; }
    const ponto = (s) => { for (const sg of segs) if (s <= sg.s0 + sg.L) { const t = (s - sg.s0) / sg.L; return { x: lerp(sg.a.x, sg.b.x, t), z: lerp(sg.a.z, sg.b.z, t), w: lerp(sg.a.w, sg.b.w, t) }; } const u = cam[cam.length - 1]; return { x: u.x, z: u.z, w: u.w }; };
    for (let s = livreIni; s < comp - livreFim; s += passo) { if (RNG.chance(0.15)) continue; grupo(ponto(s)); }
  };
  percorrer(m.caminho, 28, def.chefe ? 30 : 8, (grande ? 19 : 13) / dens);
  // ramos laterais e seus locais especiais
  for (const r of (m.ramos || [])) {
    percorrer(r.caminho, 16, 14, 19 / dens);
    const f = { x: r.fim.x, z: r.fim.z, w: r.fim.r * 0.7 };
    if (r.tipo === 'tesouro') grupo(f, 'raro');
    else if (r.tipo === 'covil') { grupo(f, 'raro'); grupo({ x: f.x + 3, z: f.z - 3, w: f.w }, 'raro'); }
    else grupo(f, 'magico');
  }
  if (def.chefe) {
    const f = m.fim;
    J.criarChefe(def.chefe, f.x + 4, f.z, J.z.nivel + 1);
    // guardas
    for (let i = 0; i < 3; i++) J.criarInimigo(RNG.pick(def.inimigos), f.x - f.r * 0.5 + Math.random() * 3, f.z + (Math.random() - 0.5) * 8, J.z.nivel, 'magico');
  }
  J.z.total = J.inimigos.length;
};

J.criarInimigo = function (tipo, x, z, nivel, rar = 'normal', extra = {}) {
  const d = INIMIGOS[tipo];
  const esc = d.escala * (extra.escala || 1) * (rar === 'raro' ? 1.18 : rar === 'magico' ? 1.06 : 1);
  const m = (d.modelo3d && MOD.criar3D(d.modelo3d, esc, d.tinta3d)) || MOD.criar(d.rig, d.visual, esc);
  const multR = rar === 'raro' ? 3.6 : rar === 'magico' ? 1.7 : 1;
  const vidaMax = 26 * 1.35 * d.vida * escalaVida(nivel) * multR * J.z.multVida * (extra.vida || 1);
  const e = {
    tipo, d, m, x, z, y: J.mundo.h(x, z), ang: Math.random() * 6.28, nivel, rar, vida: vidaMax, vidaMax,
    dano: 5 * 1.3 * d.dano * escalaDano(nivel) * (rar === 'raro' ? 1.3 : rar === 'magico' ? 1.15 : 1) * J.z.multDano,
    vel: d.vel * J.z.multVel * (0.9 + Math.random() * 0.2), alcance: d.alcance, raio: 0.45 * esc, estado: 'dormindo', cd: Math.random() * 1.5,
    atq: null, fase: Math.random() * 6, t: Math.random() * 10, flash: 0, lentoT: 0, lentoF: 0, dots: [], mods: [], morto: false, mortoT: 0,
    pequeno: !!extra.pequeno, invocado: !!extra.invocado, strafe: Math.random() < 0.5 ? 1 : -1,
  };
  if (rar === 'raro') {
    const nm = RNG.int(2, 3); e.mods = RNG.shuffle(MODS_RAROS.slice()).slice(0, nm).map(x => x.id);
    e.nome = RNG.pick(NOMES_RAROS_MOB) + ', ' + RNG.pick(TITULOS_RAROS_MOB);
    MOD.tingir(m, 0xffe080, 0.08);
  } else if (rar === 'magico') { e.mods = [RNG.pick(MODS_RAROS).id]; e.nome = MODS_RAROS.find(x => x.id === e.mods[0]).nome + ' ' + d.nome; MOD.tingir(m, 0x8090ff, 0.08); }
  else e.nome = d.nome;
  if (e.mods.includes('veloz')) e.vel *= 1.35;
  if (e.mods.includes('robusto')) { e.vidaMax *= 1.8; e.vida = e.vidaMax; }
  if (e.mods.includes('brutal')) e.dano *= 1.5;
  m.raiz.position.set(x, e.y, z);
  m.estilo = d.visual.cajado ? 'cajado' : d.visual.arco ? 'arco' : 'golpe';
  m.baseTorsoX = d.visual.corcunda ? 0.42 : 0;
  m.raiz.visible = false;
  ENG.scene.add(m.raiz);
  J.inimigos.push(e);
  return e;
};

J.criarChefe = function (id, x, z, nivel) {
  const c = CHEFES[id];
  const m = (c.modelo3d && MOD.criar3D(c.modelo3d, c.escala, c.tinta3d)) || MOD.criar(c.rig, {}, c.escala);
  const vida = 22 * 1.35 * c.vida * escalaVida(nivel) * J.z.multVida * (J.z.mods.some(x => x.id === 'mChefe') ? 1.5 : 1);
  const e = {
    tipo: id, d: { nome: c.nome, ia: 'chefe', elem: c.elem, alcance: 3.2 * c.escala / 2.5 + 1.5, rig: c.rig }, c, m, x, z, y: J.mundo.h(x, z), ang: -Math.PI / 2, nivel, rar: 'chefe',
    vida, vidaMax: vida, dano: 6 * 1.3 * c.dano * escalaDano(nivel) * J.z.multDano, vel: c.vel, alcance: 3.2, raio: 0.42 * c.escala, estado: 'dormindo', cd: 2,
    atq: null, fase: 0, t: 0, flash: 0, lentoT: 0, lentoF: 0, dots: [], mods: [], morto: false, mortoT: 0, nome: c.nome,
    boss: { fase: 1, cdHab: 2.5, ultima: null, invulnT: 0, acao: null },
  };
  m.raiz.position.set(x, e.y, z); m.raiz.rotation.y = e.ang; m.raiz.visible = false;
  ENG.scene.add(m.raiz);
  J.inimigos.push(e); J.z.chefe = e;
  return e;
};

J.criarJogador = function () {
  const m = MOD.jogador(J.pers.classe);
  J.jog = { x: 0, z: 0, y: 0, ang: 0, m, vida: 100, rec: 0, invuln: 0, esquivaCD: 0, cast: null, cds: {}, fase: 0, t: 0, andar: 0, lentoT: 0, lentoF: 0, curas: [], auraT: 0 };
  ENG.scene.add(m.raiz);
};
J.trocarModeloJogador = function () {
  if (J.jog) { ENG.scene.remove(J.jog.m.raiz); MOD.descartar(J.jog.m); J.jog = null; }
};

// ------------------------------------------------------------
// Texto flutuante
// ------------------------------------------------------------
J.texto = function (x, y, z, txt, cor = '#fff', tam = 16, dur = 0.9) {
  if (J.textos.length > 90) J.textos.shift();
  J.textos.push({ x: x + (Math.random() - 0.5) * 0.6, y, z: z + (Math.random() - 0.5) * 0.6, txt, cor, tam, t: 0, dur });
};
J.agendar = function (t, fn) { J.agendados.push({ t, fn }); };

// ------------------------------------------------------------
// Dano
// ------------------------------------------------------------
// diferença de nível: área acima do personagem deixa os monstros mais duros e mais perigosos
J.fatorNivelAtaque = function (nivelMonstro) {
  const dif = nivelMonstro - J.pers.nivel;
  return dif > 0 ? Math.max(0.3, Math.pow(0.88, dif)) : Math.min(1.25, 1 + 0.025 * -dif);
};
J.fatorNivelDefesa = function (nivelMonstro) {
  const dif = nivelMonstro - J.pers.nivel;
  return dif > 0 ? Math.min(2.5, 1 + 0.09 * dif) : Math.max(0.6, 1 - 0.03 * -dif);
};
J.danoBase = function () { const [a, b] = J.st.dano; return a + Math.random() * (b - a); };

J.acertarInimigo = function (e, mult, sk, o = {}) {
  if (e.morto || (e.boss && e.boss.invulnT > 0)) return 0;
  const st = J.st;
  const elem = o.elem || sk.elem || 'fisico';
  let d = (o.base ?? J.danoBase()) * mult * (sk.multRank || 1);
  d *= 1 + (st.danoPct + (st.danoElem[elem] || 0) + (sk.secao === 'basico' ? st.danoBasico : 0) + ((e.rar === 'raro' || e.rar === 'chefe') ? st.danoElite : 0) + (o.extraPct || 0)) / 100;
  if (sk.executar && e.vida / e.vidaMax < sk.executar) d *= 2;
  const critC = st.critChance + (sk.crit || 0);
  const crit = Math.random() * 100 < critC;
  if (crit) d *= 1 + st.danoCrit / 100;
  if (e.rar === 'chefe') d *= 0.9;
  d *= J.fatorNivelAtaque(e.nivel);
  d = Math.max(1, d);
  e.vida -= d; e.flash = 1; if (e.estado === 'dormindo') J.acordar(e);
  const cabY = e.y + (e.m.alturaCabeca || 1.8) * e.m.escala;
  J.texto(e.x, cabY, e.z, Math.round(d).toString(), crit ? '#ffd23a' : corElem[elem], crit ? 22 : 15);
  // efeitos
  if (sk.lentidao) { const f = e.rar === 'chefe' ? sk.lentidao * 0.4 : sk.lentidao; e.lentoT = 2.5; e.lentoF = Math.max(e.lentoF * (e.lentoT > 0 ? 1 : 0), f); }
  if (sk.queimar) e.dots.push({ dps: d * sk.queimar / 3 * (1 + st.danoDot / 100), t: 3, elem });
  const cura = d * ((sk.vamp || 0) + st.roubo / 100) + st.vidaPorGolpe * (o.semVPG ? 0 : 1);
  if (cura > 0 && J.jog) J.jog.vida = Math.min(J.st.vidaMax, J.jog.vida + cura);
  // partículas de impacto
  if (!o.semFx) { const jgI = J.jog; const dx = e.x - jgI.x, dz = e.z - jgI.z, dl = Math.hypot(dx, dz) || 1; VFX.impacto(e.x, e.y + 1 * Math.min(1.6, e.m.escala), e.z, e.d.rig === 'elemental' && elem === 'fisico' ? 'frio' : elem, crit ? 1.25 : 0.75, { x: dx / dl, z: dz / dl }); }
  if (e.vida <= 0) J.matarInimigo(e);
  return d;
};

J.acordar = function (e) {
  if (e.estado !== 'dormindo') return;
  e.estado = 'ativo';
  for (const o of J.inimigos) if (o !== e && o.estado === 'dormindo' && dist2(o, e) < 12) o.estado = 'ativo';
  if (e.boss) UI.mostrarChefe(e);
};

J.danoJogador = function (qtd, elem = 'fisico', fonte = null) {
  const jg = J.jog; if (!jg || J.estado !== 'jogando' || jg.invuln > 0) return;
  const st = J.st;
  if (Math.random() * 100 < st.esquiva) { J.texto(jg.x, jg.y + 2.2, jg.z, 'Esquiva', '#c0ffc0', 14); return; }
  if (Math.random() * 100 < st.bloqueio) { J.texto(jg.x, jg.y + 2.2, jg.z, 'Bloqueio', '#d0d8ff', 14); ENG.particulas.emitir({ x: jg.x, y: jg.y + 1.2, z: jg.z, n: 8, cor: '#c0d0ff', vel: 4, vida: 0.3, tam: 0.3 }); return; }
  let d = qtd * J.fatorNivelDefesa(fonte && fonte.nivel != null ? fonte.nivel : (J.z ? J.z.nivel : J.pers.nivel));
  if (elem === 'fisico') { const red = Math.min(0.85, st.armadura / (st.armadura + 8 * d + 20)); d *= 1 - red; }
  else d *= 1 - (st.res[elem] || 0) / 100;
  d *= 1 - st.redDano / 100;
  d = Math.max(1, d);
  jg.vida -= d;
  J.texto(jg.x, jg.y + 2.2, jg.z, Math.round(d).toString(), '#ff5050', 15);
  UI.flashDano(Math.min(1, d / st.vidaMax * 4));
  if (J.pers.classe === 'guerreiro') jg.rec = Math.min(st.recMax, jg.rec + d / st.vidaMax * 40);
  if (fonte && !fonte.morto) {
    if (st.espinhos && dist2(fonte, jg) < 5) J.acertarInimigo(fonte, st.espinhos / 100 * 2.5, { elem: 'fisico' }, { base: d + st.armadura * 0.05, semVPG: true });
    if (fonte.mods && fonte.mods.includes('vampirico')) fonte.vida = Math.min(fonte.vidaMax, fonte.vida + d * 2);
    if (fonte.mods && fonte.mods.includes('gelido')) { jg.lentoT = 2; jg.lentoF = 0.35; }
  }
  if (jg.vida <= 0) J.morrer();
};

J.morrer = function () {
  const jg = J.jog; jg.vida = 0; J.estado = 'morto';
  if (jg.m.rig === 'gltf') { jg.m.morto = true; }
  if (J.z.def.mapa) { const perda = Math.floor(xpProximo(J.pers.nivel) * 0.08); J.pers.xp = Math.max(0, J.pers.xp - perda); }
  J.salvar();
  UI.mostrarMorte();
};

J.matarInimigo = function (e) {
  if (e.morto) return;
  e.morto = true; e.mortoT = 0; e.atq = null; e.lado = Math.random() < 0.5 ? 1 : -1;
  J.z.mortos++;
  const st = J.st, jg = J.jog;
  // xp
  const mxp = e.rar === 'chefe' ? 45 : e.rar === 'raro' ? 6 : e.rar === 'magico' ? 2.5 : 1;
  const dif = J.pers.nivel - e.nivel;
  const pen = dif > 5 ? Math.max(0.05, 1 - (dif - 5) * 0.18) : 1;
  J.ganharXP(Math.round(xpInimigo(e.nivel) * mxp * pen * (e.invocado ? 0.3 : 1)));
  // frascos
  const carga = e.rar === 'chefe' ? 30 : e.rar === 'raro' ? 4 : 1;
  J.pers.frascos.vida = Math.min(30, J.pers.frascos.vida + carga); J.pers.frascos.rec = Math.min(30, J.pers.frascos.rec + carga);
  if (st.curaAbate) jg.vida = Math.min(st.vidaMax, jg.vida + st.vidaMax * st.curaAbate / 100);
  // efeitos visuais
  const cor = e.d.elem ? corElem[e.d.elem] : '#ffd0a0';
  ENG.particulas.emitir({ x: e.x, y: e.y + 0.8 * e.m.escala, z: e.z, n: e.rar === 'chefe' ? 120 : 18, cor, vel: e.rar === 'chefe' ? 12 : 5, vida: 0.7, tam: 0.4, grav: 4 });
  // decalque no chão
  { const rig = e.d.rig || ''; const tipoD = rig === 'elemental' ? null : (rig === 'slime' || rig === 'sapo' || rig === 'chefeSlime' || e.d.elem === 'veneno' && rig === 'aranha') ? 'gosma' : 'sangue'; if (tipoD) GFX.decal(e.x, e.z, (e.rar === 'chefe' ? 3.2 : 1.1) * Math.min(2, e.m.escala), tipoD, e.rar === 'chefe' ? 40 : 16); }
  // modificadores de morte
  if (e.mods.includes('explosivo') || e.d.ia === 'explosivo') {
    const x = e.x, z = e.z, dn = e.dano * 1.6;
    J.criarArea({ x, z, raio: 3.2, atraso: 0.8, dono: 'inimigo', dano: dn, elem: 'fogo', cor: '#ff6020', visual: 'explosao', fonte: null });
  }
  if (e.d.divide && !e.pequeno) for (let i = 0; i < 2; i++) { const n = J.criarInimigo(e.tipo, e.x + (Math.random() - 0.5) * 2, e.z + (Math.random() - 0.5) * 2, e.nivel, 'normal', { escala: 0.6, vida: 0.35, pequeno: true, invocado: true }); n.estado = 'ativo'; n.m.raiz.visible = true; }
  // saque
  J.gerarSaque(e);
  if (e.boss) {
    ENG.tremor = 1.5; ENG.luz(new THREE.Vector3(e.x, e.y + 3, e.z), '#ffd080', 8, 2, 30);
    UI.esconderChefe();
    J.texto(e.x, e.y + 5, e.z, 'VITÓRIA', '#ffd23a', 34, 3);
    J.agendar(1.5, () => J.abrirPortal());
    // matar invocações
    for (const o of J.inimigos) if (o.invocado && !o.morto) { o.vida = 0; J.matarInimigo(o); }
  }
};

J.ganharXP = function (q) {
  const p = J.pers; if (p.nivel >= 100) return;
  p.xp += q;
  let subiu = false;
  while (p.nivel < 100 && p.xp >= xpProximo(p.nivel)) { p.xp -= xpProximo(p.nivel); p.nivel++; subiu = true; }
  if (subiu) {
    J.recalc(); J.jog.vida = J.st.vidaMax; J.jog.rec = Math.max(J.jog.rec, J.st.recMax * 0.5);
    const jg = J.jog;
    ENG.coluna(jg.x, jg.y, jg.z, '#ffd080', 10, 1.2, 1.2);
    ENG.particulas.emitir({ x: jg.x, y: jg.y + 1, z: jg.z, n: 80, cor: '#ffe0a0', cor2: '#ffffff', vel: 6, vida: 1.2, tam: 0.4, sobe: 2, grav: -1 });
    UI.aviso(`Nível ${p.nivel}! +1 ponto de habilidade` + (p.nivel === 10 && !p.asc ? ' — Ascendência disponível!' : ''));
    UI.atualizarTudo();
    J.salvar();
  }
};

// ------------------------------------------------------------
// Saque
// ------------------------------------------------------------
J.gerarSaque = function (e) {
  const bonus = J.st.achado + J.z.quant;
  const quant = 1 + J.z.quant / 100;
  let n = 0, minimo = null;
  if (e.rar === 'chefe') { n = 5 + Math.floor(J.z.nivel / 15); minimo = null; }
  else if (e.rar === 'raro') n = (Math.random() < 0.9 ? 1 : 0) + (Math.random() < 0.5 ? 1 : 0);
  else if (e.rar === 'magico') n = Math.random() < 0.28 * quant ? 1 : 0;
  else n = Math.random() < (e.invocado ? 0.03 : 0.1) * quant ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const it = IT.gerar(J.z.nivel, { classe: J.pers.classe, bonus: bonus + (e.rar === 'chefe' ? 150 : e.rar === 'raro' ? 60 : 0), minimo: e.rar === 'chefe' && i < 2 ? 'raro' : null });
    J.soltar(it, e.x, e.z);
  }
  const chGema = e.rar === 'chefe' ? 1 : e.rar === 'raro' ? 0.25 : 0.035;
  if (Math.random() < chGema) J.soltar(IT.gerarGema(J.z.nivel), e.x, e.z);
  if (e.rar === 'chefe' && J.z.nivel >= 5 && Math.random() < 0.35) J.soltar(IT.gerar(J.z.nivel, { classe: J.pers.classe, raridade: 'unico' }), e.x, e.z);
};

J.soltar = function (item, x, z) {
  const ang = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 2.2;
  let tx = x + Math.cos(ang) * r, tz = z + Math.sin(ang) * r;
  if (!J.mundo.andavel(tx, tz, 0.3)) { tx = x; tz = z; }
  const cor = item.tipo === 'gema' ? GEMAS[item.gema].cor : RARIDADES[item.raridade].cor;
  const g = new THREE.Group();
  let geo;
  if (item.tipo === 'gema') geo = G('dropGema', () => new THREE.OctahedronGeometry(0.22, 0));
  else geo = G('dropItem', () => new THREE.BoxGeometry(0.45, 0.12, 0.35));
  const mat = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: item.tipo === 'gema' ? 1.2 : 0.25, metalness: 0.5, roughness: 0.4 });
  const me = new THREE.Mesh(geo, mat); me.castShadow = true; g.add(me);
  const alto = item.raridade === 'unico' ? 14 : item.raridade === 'raro' ? 7 : item.tipo === 'gema' ? 5 : item.raridade === 'magico' ? 3 : 0;
  if (alto) {
    const fb = new THREE.Mesh(G('feixe', () => new THREE.CylinderGeometry(0.06, 0.18, 1, 8, 1, true)), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
    fb.scale.y = alto; fb.position.y = alto / 2; g.add(fb);
  }
  const y = J.mundo.h(tx, tz);
  g.position.set(x, y + 1, z);
  ENG.scene.add(g);
  const d = { item, x: tx, z: tz, y, mesh: g, t: 0, ox: x, oz: z, me };
  J.drops.push(d);
  if (item.raridade === 'unico') { UI.aviso('Um item ÚNICO caiu!', '#af6025'); }
};

J.pegar = function (d) {
  const i = J.pers.inv.indexOf(null);
  if (i < 0) { UI.aviso('Inventário cheio', '#ff8080'); return false; }
  J.pers.inv[i] = d.item;
  ENG.scene.remove(d.mesh); d.me.material.dispose();
  J.drops.splice(J.drops.indexOf(d), 1);
  UI.atualizarInventario();
  return true;
};

// ------------------------------------------------------------
// Portal / conclusão
// ------------------------------------------------------------
J.abrirPortal = function () {
  if (J.portal || !J.mundo) return;
  const f = J.mundo.fim; const x = f.x + 7, z = f.z; const y = J.mundo.h(x, z);
  const g = new THREE.Group();
  const anel = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.18, 10, 40), new THREE.MeshStandardMaterial({ color: 0x8090ff, emissive: 0x6070ff, emissiveIntensity: 2.2, metalness: 0.5, roughness: 0.3 }));
  anel.position.y = 2; g.add(anel);
  const disco = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ color: 0x6080ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  disco.position.y = 2; g.add(disco);
  g.position.set(x, y, z); g.rotation.y = Math.PI / 2;
  g.userData = { anel, disco };
  ENG.scene.add(g); J.portal = g;
  J.portalPos = { x, z };
  J.z.completa = true;
  ENG.luz(new THREE.Vector3(x, y + 2, z), '#8090ff', 4, 9999, 14);
  UI.aviso('Um portal se abriu. Entre para avançar.');
};

J.concluirZona = function () {
  const def = J.z.def, p = J.pers;
  if (def.mapa) { p.mapaMax = Math.max(p.mapaMax, def.tier + 1); p.mapasFeitos++; }
  else {
    if (!p.concluidas.includes(def.id)) p.concluidas.push(def.id);
    const i = ZONAS.findIndex(z => z.id === def.id);
    if (i < ZONAS.length - 1 && !p.zonas.includes(ZONAS[i + 1].id)) p.zonas.push(ZONAS[i + 1].id);
    if (i === ZONAS.length - 1 && p.mapaMax < 1) { p.mapaMax = 1; UI.aviso('O Atlas dos Mapas foi desbloqueado!', '#ffd23a'); }
  }
  J.salvar();
  J.estado = 'pausa';
  UI.abrirMapaMundo(true);
};

// ------------------------------------------------------------
// Habilidades do jogador
// ------------------------------------------------------------
J.tentarConjurar = function (id) {
  const jg = J.jog; if (!id || jg.cast || jg.dash || jg.salto) return false;
  const sk = IT.habEfetiva(J.pers, id, J.st);
  if (!sk.rank) return false;
  if ((jg.cds[id] || 0) > 0) return false;
  if (sk.custo && jg.rec < sk.custo) { if (!jg.avisoRec || J.tempo - jg.avisoRec > 1.2) { jg.avisoRec = J.tempo; J.texto(jg.x, jg.y + 2.4, jg.z, `Sem ${CLASSES[J.pers.classe].recurso.nome}`, '#a0b0ff', 13); } return false; }
  jg.rec -= sk.custo;
  const alvo = J.input.alvo.clone();
  const vel = sk.tipo === 'buff' || sk.tipo === 'investida' || sk.tipo === 'salto' || sk.tipo === 'teleporte' ? 1 : J.st.velAtaque;
  const dur = Math.max(0.12, sk.tempo / vel);
  jg.ang = yawPara(alvo.x - jg.x, alvo.z - jg.z);
  let anim = 'golpe';
  if (sk.tipo === 'projetil' || sk.tipo === 'radial') anim = J.pers.classe === 'cacadora' && sk.modelo !== 'lamina' && sk.modelo !== 'dardo' ? 'disparo' : J.pers.classe === 'feiticeira' ? 'conjurar' : 'golpe';
  else if (sk.tipo === 'nova') anim = sk.giro ? 'giro' : 'conjurar';
  else if (sk.tipo === 'area' || sk.tipo === 'chuva' || sk.tipo === 'corrente' || sk.tipo === 'invocar') anim = J.pers.classe === 'cacadora' ? 'disparo' : 'conjurar';
  else if (sk.tipo === 'buff') anim = 'erguer';
  jg.cast = { sk, t: 0, dur, disparou: false, alvo, anim };
  if (sk.cdFinal) jg.cds[id] = sk.cdFinal;
  return true;
};

J.executar = function (sk, alvo) {
  const jg = J.jog, st = J.st;
  const R = (r) => r * (sk.raioMul || 1) * st.area;
  const ang = yawPara(alvo.x - jg.x, alvo.z - jg.z);
  const dir = { x: Math.sin(ang), z: Math.cos(ang) };
  if (sk.gera) jg.rec = Math.min(st.recMax, jg.rec + sk.gera);
  const origem = new THREE.Vector3(jg.x, jg.y + 1.2, jg.z);
  const limitar = (alc) => { const dx = alvo.x - jg.x, dz = alvo.z - jg.z; const d = Math.hypot(dx, dz); const k = d > alc ? alc / d : 1; return { x: jg.x + dx * k, z: jg.z + dz * k }; };
  switch (sk.tipo) {
    case 'golpe': {
      for (let g = 0; g < sk.golpes; g++) J.agendar(g * 0.12, () => {
        const alc = sk.alcance * (1 + (st.area - 1) * 0.5);
        const a2 = yawPara(alvo.x - jg.x, alvo.z - jg.z);
        ENG.arcoGolpe(jg.x, jg.y, jg.z, Math.atan2(Math.cos(a2), Math.sin(a2)), alc, sk.arco, sk.cor);
        let acertou = false;
        for (const e of J.inimigos) {
          if (e.morto || !e.m.raiz.visible) continue;
          const d = dist2(e, jg); if (d > alc + e.raio) continue;
          const ae = yawPara(e.x - jg.x, e.z - jg.z);
          if (Math.abs(angDif(ae, a2)) * 180 / Math.PI > sk.arco / 2 + 10 && d > e.raio + 0.8) continue;
          J.acertarInimigo(e, sk.mult, sk); acertou = true;
        }
        if (acertou) { ENG.tremor = Math.max(ENG.tremor, 0.15); }
      });
      break;
    }
    case 'projetil': case 'radial': {
      const n = sk.qtd;
      const spread = sk.tipo === 'radial' ? 360 : (sk.spread || 10) * (sk.spreadMul || 1) * Math.min(1, 0.4 + n * 0.12);
      for (let i = 0; i < n; i++) {
        let a = ang;
        if (sk.tipo === 'radial') a = ang + i / n * Math.PI * 2;
        else if (n > 1) a = ang + (i / (n - 1) - 0.5) * spread * Math.PI / 180;
        J.criarProjetil({ x: jg.x + Math.sin(a) * 0.6, z: jg.z + Math.cos(a) * 0.6, y: jg.y + 1.2, ang: a, vel: sk.vel, alcance: sk.alcance, raio: (sk.raioHit || 0.8) * (sk.raioHitMul || 1), dono: 'jogador', sk, cor: sk.cor, modelo: sk.modelo, explode: sk.explode ? R(sk.explode) : 0, perfura: sk.perfura, cadeias: sk.cadeias, multiHit: sk.multiHit, luz: sk.luz });
      }
      break;
    }
    case 'nova': {
      if (sk.elem === 'frio') { VFX.espinhosGelo(jg.x, jg.z, R(sk.raio), 22); VFX.circulo(jg.x, jg.z, R(sk.raio) * 0.6, '#9ad8ff', 0.8, { alfa: 0.6 }); }
      for (let p = 0; p < sk.pulsos; p++) J.agendar(p * (sk.intervalo || 0.15), () => {
        const r = R(sk.raio);
        if (sk.giro) { VFX.corte(jg.x, jg.y, jg.z, J.tempo * 9 + p * 2.1, r, 320, sk.cor, { dur: 0.22, altura: 0.9 }); VFX.corte(jg.x, jg.y, jg.z, J.tempo * 9 + p * 2.1 + 3.1, r * 0.8, 300, '#ffffff', { dur: 0.2, altura: 1.2, inverso: true }); }
        ENG.onda(jg.x, jg.y, jg.z, r, sk.cor, 0.35);
        ENG.particulas.emitir({ x: jg.x, y: jg.y + 0.8, z: jg.z, n: 30, cor: sk.cor, vel: r * 2.2, vida: 0.4, tam: 0.35, sobe: 0.2, arrasto: 3 });
        for (const e of J.inimigos) if (!e.morto && e.m.raiz.visible && dist2(e, jg) < r + e.raio) J.acertarInimigo(e, sk.mult, sk);
      });
      break;
    }
    case 'area': {
      const p0 = limitar(sk.alcance);
      for (let q = 0; q < sk.qtd; q++) {
        const off = q === 0 ? { x: 0, z: 0 } : { x: (Math.random() - 0.5) * 7, z: (Math.random() - 0.5) * 7 };
        J.criarArea({ x: p0.x + off.x, z: p0.z + off.z, raio: R(sk.raio), atraso: (sk.atraso || 0) + q * 0.15, pulsos: sk.pulsos, intervalo: sk.intervalo || 0.3, dono: 'jogador', sk, mult: sk.mult, cor: sk.cor,
          visual: sk.meteoro ? 'meteoro' : sk.flechas ? 'flechas' : sk.armadilha ? 'armadilha' : 'tremor', mostrar: (sk.atraso || 0) >= 0.5 || sk.armadilha });
      }
      break;
    }
    case 'chuva': {
      const p0 = limitar(sk.alcance);
      for (let q = 0; q < sk.qtd; q++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * sk.espalhar;
        J.criarArea({ x: p0.x + Math.cos(a) * r, z: p0.z + Math.sin(a) * r, raio: R(sk.raio), atraso: 0.2 + Math.random() * sk.duracao, pulsos: 1, dono: 'jogador', sk, mult: sk.mult, cor: sk.cor, visual: sk.meteoro ? 'meteoro' : sk.flechas ? 'flechas' : 'martelo' });
      }
      break;
    }
    case 'investida': {
      const p0 = limitar(sk.alcance);
      jg.dash = { de: { x: jg.x, z: jg.z }, para: p0, t: 0, dur: Math.max(0.15, Math.hypot(p0.x - jg.x, p0.z - jg.z) / 38), sk, atingidos: new Set() };
      if (sk.invuln) jg.invuln = jg.dash.dur + 0.1;
      jg.ang = ang;
      break;
    }
    case 'salto': {
      const p0 = limitar(sk.alcance);
      jg.salto = { de: { x: jg.x, z: jg.z }, para: p0, t: 0, dur: 0.55, sk };
      jg.invuln = 0.6;
      break;
    }
    case 'teleporte': {
      let p0 = limitar(sk.alcance);
      for (let k = 0; k < 10 && !J.mundo.andavel(p0.x, p0.z, 0.6); k++) p0 = { x: lerp(jg.x, p0.x, 0.85), z: lerp(jg.z, p0.z, 0.85) };
      if (!J.mundo.andavel(p0.x, p0.z, 0.6)) break;
      VFX.coluna(jg.x, jg.y, jg.z, sk.cor, 6, 0.9, 0.45); VFX.circulo(jg.x, jg.z, 1.8, sk.cor, 0.7);
      FX({ x: jg.x, y: jg.y + 1, z: jg.z, n: 40, tipo: 'faisca', estica: 2, cor: '#ffffff', corFim: sk.cor, vel: 5, vida: 0.4, tam: 0.2 });
      jg.x = p0.x; jg.z = p0.z; jg.y = J.mundo.h(jg.x, jg.z); jg.invuln = 0.25;
      const r = R(sk.raio);
      ENG.onda(jg.x, jg.y, jg.z, r, sk.cor, 0.35);
      VFX.coluna(jg.x, jg.y, jg.z, sk.cor, 7, 1.1, 0.5); VFX.circulo(jg.x, jg.z, r, sk.cor, 0.8);
      if (sk.elem === 'veneno') FM({ x: jg.x, y: jg.y + 0.5, z: jg.z, n: 20, cor: '#4a2a6a', vel: r, vida: 1.1, tam: 1.2, tamFim: 2.4, alfa: 0.6, anelPlano: true });
      FX({ x: jg.x, y: jg.y + 1, z: jg.z, n: 30, tipo: sk.elem === 'raio' ? 'raio' : 'faisca', estica: sk.elem === 'raio' ? 0 : 2, cor: '#ffffff', corFim: sk.cor, vel: 7, vida: 0.4, tam: sk.elem === 'raio' ? 0.8 : 0.22 });
      ENG.luz(new THREE.Vector3(jg.x, jg.y + 1.5, jg.z), sk.cor, 4, 0.4, 12);
      for (const e of J.inimigos) if (!e.morto && e.m.raiz.visible && dist2(e, jg) < r + e.raio) J.acertarInimigo(e, sk.mult, sk);
      break;
    }
    case 'buff': {
      const b = sk.buff;
      const stats = {};
      for (const [k, v] of Object.entries(b)) if (k !== 'dur' && typeof v === 'number' && k !== 'aura' && k !== 'gigante') stats[k] = v;
      if (sk.buffDano) stats.danoPct = (stats.danoPct || 0) + sk.buffDano;
      J.buffs = J.buffs.filter(x => x.id !== sk.id);
      J.buffs.push({ id: sk.id, nome: sk.nome, icone: sk.icone, stats, t: b.dur * (sk.dur || 1), dur: b.dur * (sk.dur || 1), gigante: b.gigante, aura: b.aura || sk.aura, cor: sk.cor });
      if (sk.cura) jg.vida = Math.min(st.vidaMax, jg.vida + st.vidaMax * sk.cura);
      ENG.onda(jg.x, jg.y, jg.z, 6, sk.cor, 0.5);
      ENG.coluna(jg.x, jg.y, jg.z, sk.cor, 6, 1.1, 0.7);
      VFX.aura(sk.cor, b.dur * (sk.dur || 1));
      FX({ x: jg.x, y: jg.y + 1, z: jg.z, n: 40, tipo: 'faisca', estica: 2.5, cor: '#ffffff', corFim: sk.cor, vel: 6, vida: 0.7, tam: 0.25, sobe: 2 });
      J.recalc();
      break;
    }
    case 'corrente': {
      let atual = null, melhor = 1e9;
      for (const e of J.inimigos) { if (e.morto || !e.m.raiz.visible) continue; const d = dist2(e, jg); if (d > sk.alcance) continue; const da = Math.hypot(e.x - alvo.x, e.z - alvo.z); if (da < melhor) { melhor = da; atual = e; } }
      let de = origem.clone();
      if (!atual) { const p0 = limitar(sk.alcance); ENG.relampago(de, new THREE.Vector3(p0.x, J.mundo.h(p0.x, p0.z) + 0.5, p0.z), sk.cor); break; }
      const atingidos = new Set();
      for (let c = 0; c <= sk.cadeias && atual; c++) {
        atingidos.add(atual);
        const para = new THREE.Vector3(atual.x, atual.y + 1 * atual.m.escala, atual.z);
        ENG.relampago(de, para, sk.cor, 0.09); ENG.relampago(de, para, '#ffffff', 0.04);
        J.acertarInimigo(atual, sk.mult, sk);
        de = para;
        let prox = null, pd = sk.saltoAlc || 9;
        for (const e of J.inimigos) { if (e.morto || atingidos.has(e) || !e.m.raiz.visible) continue; const d = dist2(e, atual); if (d < pd) { pd = d; prox = e; } }
        atual = prox;
      }
      ENG.luz(origem, sk.cor, 3, 0.25, 14);
      break;
    }
    case 'invocar': {
      for (let q = 0; q < sk.qtd; q++) {
        if (J.lacaios.length >= sk.maxLacaios) { const v = J.lacaios.shift(); ENG.scene.remove(v.m.raiz); MOD.descartar(v.m); }
        const a = Math.random() * Math.PI * 2;
        J.criarLacaio(jg.x + Math.cos(a) * 2, jg.z + Math.sin(a) * 2, sk);
      }
      break;
    }
  }
};

J.criarLacaio = function (x, z, sk) {
  const m = MOD.criar3D('esq_lacaio', 1.0, 0xc8e0ff) || MOD.criar('humanoide', { pele: 0xe0d8c0, roupa: 0x3a3a40, esqueleto: true, olhos: 0x60c0ff, espada: 0.7, escudo: 0x4a4a52 }, 1.0);
  m.estilo = 'golpe';
  const vida = (60 + J.pers.nivel * 18) * (1 + J.st.lacaioVida / 100);
  const l = { x, z, y: J.mundo.h(x, z), ang: 0, m, vida, vidaMax: vida, sk, cd: 0, atq: null, fase: 0, t: 0, flash: 0, raio: 0.45, lacaio: true };
  if (!J.mundo.andavel(x, z, 0.4)) { l.x = J.jog.x; l.z = J.jog.z; }
  m.raiz.position.set(l.x, l.y, l.z);
  ENG.scene.add(m.raiz);
  VFX.circulo(l.x, l.z, 1.6, '#80c0ff', 1.4); m.surgirT = 1.3;
  FM({ x: l.x, y: l.y + 0.2, z: l.z, n: 10, tipo: 'pedra', cor: '#4a4038', vel: 2.5, vida: 0.8, tam: 0.22, sobe: 3, grav: 12, girar: 6 });
  FX({ x: l.x, y: l.y + 0.5, z: l.z, n: 20, tipo: 'faisca', estica: 2, cor: '#d0e8ff', corFim: '#4080ff', vel: 3, dir: { x: 0, y: 1, z: 0 }, disp: 0.5, vida: 0.8, tam: 0.18 });
  J.lacaios.push(l);
};

// ------------------------------------------------------------
// Projéteis e áreas
// ------------------------------------------------------------
const _projGeo = {};
function malhaProjetil(modelo, cor) {
  const g = new THREE.Group();
  const c = new THREE.Color(cor);
  const add = (geo, mat, sx = 1, sy = 1, sz = 1, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.rotation.x = rx; g.add(m); return m; };
  const brilho = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  switch (modelo) {
    case 'flecha': case 'dardo':
      add(gCil(), new THREE.MeshStandardMaterial({ color: 0x8a6a48 }), 0.025, modelo === 'dardo' ? 0.4 : 0.9, 0.025, Math.PI / 2);
      add(gCone(), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, metalness: 0.7 }), 0.05, 0.16, 0.05, Math.PI / 2).position.z = modelo === 'dardo' ? 0.25 : 0.5;
      break;
    case 'lanca':
      add(gCil(), new THREE.MeshStandardMaterial({ color: c }), 0.035, 1.6, 0.035, Math.PI / 2);
      add(gCone(), new THREE.MeshStandardMaterial({ color: 0xc0c4cc, metalness: 0.8, roughness: 0.3 }), 0.08, 0.3, 0.08, Math.PI / 2).position.z = 0.9;
      break;
    case 'cristal':
      add(gOcta(), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2, roughness: 0.1 }), 0.12, 0.12, 0.35);
      break;
    case 'lamina':
      add(G('lamProj', () => new THREE.TorusGeometry(0.28, 0.05, 4, 12)), new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: 0.2, emissive: c, emissiveIntensity: 0.3 }), 1, 1, 0.4, Math.PI / 2);
      break;
    case 'onda':
      add(gCaixa(), new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 }), 1.6, 0.25, 0.6).position.y = -0.95;
      break;
    case 'orbeGrande':
      add(gEsf(), brilho, 0.7, 0.7, 0.7); add(gEsf(), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.32, 0.32, 0.32);
      break;
    default:
      add(gEsf(), brilho, 0.32, 0.32, 0.32); add(gEsf(), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.15, 0.15, 0.15);
  }
  return g;
}

J.criarProjetil = function (o) {
  const mesh = VFX.projetil(o.modelo, o.cor, o);
  mesh.position.set(o.x, o.y, o.z); mesh.rotation.y = o.ang;
  ENG.scene.add(mesh);
  const p = Object.assign({ vx: Math.sin(o.ang) * o.vel, vz: Math.cos(o.ang) * o.vel, rest: o.alcance, atingidos: new Set(), mesh, hitCD: new Map(), t: 0 }, o);
  if (o.luz) p.luzRef = ENG.luz(mesh.position, o.cor, 2.2, o.alcance / o.vel + 0.1, 9, mesh.position);
  J.projeteis.push(p);
  return p;
};

J.explodir = function (x, y, z, raio, dono, sk, mult, cor, base) {
  if (sk && sk.elem === 'fogo') GFX.decal(x, z, raio * 0.8, 'queimado', 10);
  VFX.explosao(x, y, z, raio, sk && sk.elem && sk.elem !== 'fisico' ? sk.elem : 'fogo', cor);
  if (dono === 'jogador') { for (const e of J.inimigos) if (!e.morto && e.m.raiz.visible && Math.hypot(e.x - x, e.z - z) < raio + e.raio) J.acertarInimigo(e, mult * 0.8, sk); }
  else if (Math.hypot(J.jog.x - x, J.jog.z - z) < raio) J.danoJogador(base, sk.elem);
};

J.atualizarProjeteis = function (dt) {
  const m = J.mundo;
  for (let i = J.projeteis.length - 1; i >= 0; i--) {
    const p = J.projeteis[i];
    p.t += dt;
    const passo = Math.hypot(p.vx, p.vz) * dt;
    p.x += p.vx * dt; p.z += p.vz * dt; p.rest -= passo;
    const hy = m.h(p.x, p.z);
    p.y = lerp(p.y, hy + 1.1, 1 - Math.exp(-dt * 6));
    p.mesh.position.set(p.x, p.y, p.z);
    { const vv = p.mesh.userData.vfx; if (vv && vv.upd) vv.upd(p, dt, hy); }
    let morre = p.rest <= 0 || m.borda(p.x, p.z) > 2.5;
    if (!morre) {
      if (p.dono === 'jogador') {
        for (const e of J.inimigos) {
          if (e.morto || !e.m.raiz.visible) continue;
          if (Math.hypot(e.x - p.x, e.z - p.z) > p.raio + e.raio + 0.2) continue;
          if (p.multiHit) { const ult = p.hitCD.get(e) || -9; if (p.t - ult < p.multiHit) continue; p.hitCD.set(e, p.t); J.acertarInimigo(e, p.sk.mult, p.sk); continue; }
          if (p.atingidos.has(e)) continue;
          p.atingidos.add(e);
          J.acertarInimigo(e, p.sk.mult, p.sk);
          if (p.cadeias > 0) {
            // ricochete
            let prox = null, pd = 10;
            for (const o of J.inimigos) { if (o.morto || p.atingidos.has(o) || !o.m.raiz.visible) continue; const d = dist2(o, e); if (d < pd) { pd = d; prox = o; } }
            if (prox) { p.cadeias--; VFX.impacto(p.x, p.y, p.z, p.sk.elem || 'raio', 0.7); const a = yawPara(prox.x - p.x, prox.z - p.z); const v = Math.hypot(p.vx, p.vz); p.vx = Math.sin(a) * v; p.vz = Math.cos(a) * v; p.mesh.rotation.y = a; p.rest = Math.max(p.rest, 12); continue; }
          }
          if (!p.perfura) { morre = true; break; }
        }
      } else {
        const jg = J.jog;
        if (Math.hypot(jg.x - p.x, jg.z - p.z) < p.raio + 0.45) { J.danoJogador(p.base, p.elem, p.fonte); morre = true; }
        for (const l of J.lacaios) if (Math.hypot(l.x - p.x, l.z - p.z) < p.raio + 0.45) { l.vida -= p.base; morre = true; break; }
      }
    }
    if (morre) {
      VFX.fimProjetil(p);
      if (p.explode && p.dono === 'jogador') J.explodir(p.x, p.y, p.z, p.explode, 'jogador', p.sk, p.sk.mult, p.cor);
      ENG.scene.remove(p.mesh);
      p.mesh.traverse(c => c.material && c.material.dispose());
      if (p.luzRef && p.luzRef.segue === p.mesh.position) { p.luzRef.vida = Math.min(p.luzRef.vida, 0.1); p.luzRef.segue = null; }
      J.projeteis.splice(i, 1);
    }
  }
};

J.criarArea = function (o) {
  const a = Object.assign({ t: 0, pulsosFeitos: 0, pulsos: 1, intervalo: 0.3, atraso: 0.5 }, o);
  if (a.dono === 'inimigo' || a.mostrar) a.tel = ENG.discoTerreno(a.x, a.z, a.raio, a.dono === 'inimigo' ? (a.cor || '#ff3020') : (a.cor || '#80c0ff'));
  if (a.tel) a.tel.material.uniforms.opac.value = a.dono === 'inimigo' ? 0.9 : 0.45;
  if (a.visual === 'meteoro') { a.met = VFX.meteoro(a.cor || '#ff6020', a.raio); ENG.scene.add(a.met); }
  if (a.dono === 'inimigo' && a.visual !== 'nenhum' && a.atraso >= 0.6) VFX.circulo(a.x, a.z, a.raio * 1.05, a.cor || '#ff3020', a.atraso + 0.15, { alfa: 0.55, giro: 2 });
  J.areas.push(a);
  return a;
};

J.atualizarAreas = function (dt) {
  for (let i = J.areas.length - 1; i >= 0; i--) {
    const a = J.areas[i]; a.t += dt;
    const y = J.mundo.h(a.x, a.z);
    if (a.tel) a.tel.material.uniforms.prog.value = Math.min(1, a.t / Math.max(0.01, a.atraso));
    if (a.met) {
      const k = Math.min(1, a.t / a.atraso);
      a.met.position.set(a.x - 8 * (1 - k), y + 18 * (1 - k) + 0.5, a.z - 5 * (1 - k));
      a.met.userData.atualizar && a.met.userData.atualizar(dt);
      FX({ x: a.met.position.x, y: a.met.position.y, z: a.met.position.z, n: 2, tipo: 'chama', cor: '#ffd080', corFim: '#ff2000', vel: 1, vida: 0.4, tam: 1.2, tamFim: 0.3, espalhar: 0.5, rot: 0 });
      if (Math.random() < 0.5) FM({ x: a.met.position.x, y: a.met.position.y, z: a.met.position.z, n: 1, cor: '#2a2420', vel: 0.5, vida: 1, tam: 1, tamFim: 2.4, alfa: 0.6 });
    }
    if (a.visual === 'armadilha' && a.t < a.atraso && Math.random() < 0.2) ENG.particulas.emitir({ x: a.x, y: y + 0.4, z: a.z, n: 1, cor: '#ff8030', vel: 1, vida: 0.4, tam: 0.3 });
    while (a.t >= a.atraso + a.pulsosFeitos * a.intervalo && a.pulsosFeitos < a.pulsos) {
      a.pulsosFeitos++;
      J.disparoArea(a, y);
    }
    if (a.pulsosFeitos >= a.pulsos) {
      ENG.removerMalha(a.tel); if (a.met) { ENG.scene.remove(a.met); if (a.met.userData.seg) a.met.userData.seg.ativo = false; }
      J.areas.splice(i, 1);
    }
  }
};

J.disparoArea = function (a, y) {
  VFX.visualArea(a, y);
  if (a.dono === 'jogador') {
    for (const e of J.inimigos) if (!e.morto && e.m.raiz.visible && Math.hypot(e.x - a.x, e.z - a.z) < a.raio + e.raio) J.acertarInimigo(e, a.mult, a.sk);
  } else {
    const jg = J.jog;
    if (Math.hypot(jg.x - a.x, jg.z - a.z) < a.raio + 0.3) { J.danoJogador(a.dano, a.elem || 'fisico', a.fonte); if (a.lentidao) { jg.lentoT = 2; jg.lentoF = a.lentidao; } }
    for (const l of J.lacaios) if (Math.hypot(l.x - a.x, l.z - a.z) < a.raio) l.vida -= a.dano;
  }
};

// ------------------------------------------------------------
// Atualização do jogador
// ------------------------------------------------------------
J.mover = function (ent, dx, dz, raio = 0.5) {
  const m = J.mundo;
  const nx = ent.x + dx, nz = ent.z + dz;
  if (m.andavel(nx, nz, raio)) { ent.x = nx; ent.z = nz; return true; }
  if (m.andavel(nx, ent.z, raio)) { ent.x = nx; return true; }
  if (m.andavel(ent.x, nz, raio)) { ent.z = nz; return true; }
  return false;
};

J.atualizarJogador = function (dt) {
  const jg = J.jog, st = J.st, inp = J.input;
  jg.t += dt;
  // cooldowns
  for (const k of Object.keys(jg.cds)) jg.cds[k] = Math.max(0, jg.cds[k] - dt);
  jg.esquivaCD = Math.max(0, jg.esquivaCD - dt);
  jg.invuln = Math.max(0, jg.invuln - dt);
  jg.lentoT = Math.max(0, jg.lentoT - dt);
  // regeneração
  jg.vida = Math.min(st.vidaMax, jg.vida + st.regenVida * dt);
  jg.rec = Math.min(st.recMax, jg.rec + st.regenRec * dt);
  for (let i = jg.curas.length - 1; i >= 0; i--) { const c = jg.curas[i]; const q = Math.min(c.t, dt); c.t -= dt; if (c.tipo === 'vida') jg.vida = Math.min(st.vidaMax, jg.vida + c.taxa * q); else jg.rec = Math.min(st.recMax, jg.rec + c.taxa * q); if (c.t <= 0) jg.curas.splice(i, 1); }
  // buffs
  let mudou = false;
  for (let i = J.buffs.length - 1; i >= 0; i--) { const b = J.buffs[i]; b.t -= dt; if (b.t <= 0) { J.buffs.splice(i, 1); mudou = true; } }
  if (mudou) J.recalc();
  const gigante = J.buffs.some(b => b.gigante);
  const escAlvo = gigante ? 1.45 : 1;
  jg.m.raiz.scale.setScalar(lerp(jg.m.raiz.scale.x, escAlvo, 1 - Math.exp(-dt * 6)));
  const aura = J.buffs.find(b => b.aura);
  if (aura) {
    jg.auraT -= dt;
    if (Math.random() < 0.6) ENG.particulas.emitir({ x: jg.x, y: jg.y + 0.5, z: jg.z, n: 2, cor: aura.cor, vel: 2, vida: 0.6, tam: 0.5, espalhar: 5, sobe: 2 });
    if (jg.auraT <= 0) {
      jg.auraT = 0.5;
      const skA = { elem: J.pers.classe === 'feiticeira' ? 'fogo' : 'fisico', multRank: 1 };
      for (const e of J.inimigos) if (!e.morto && e.m.raiz.visible && dist2(e, jg) < 5.5) J.acertarInimigo(e, 0.35, skA, { semVPG: true });
      if (J.pers.classe === 'guerreiro') ENG.onda(jg.x, jg.y, jg.z, 5.5, '#c08850', 0.3);
    }
  }
  // mira
  if (J.mundo) J.input.alvo.copy(ENG.mouseNoChao(inp.mx, inp.my, jg.y));
  // ações especiais em andamento
  if (jg.dash) {
    const d = jg.dash; d.t += dt; const k = Math.min(1, d.t / d.dur);
    const nx = lerp(d.de.x, d.para.x, k), nz = lerp(d.de.z, d.para.z, k);
    J.mover(jg, nx - jg.x, nz - jg.z, 0.4);
    FX({ x: jg.x, y: jg.y + 0.9, z: jg.z, n: 2, tipo: 'faisca', estica: 2.5, cor: '#ffffff', corFim: d.sk.cor, vel: 3, dir: { x: -Math.sin(jg.ang), y: 0.1, z: -Math.cos(jg.ang) }, disp: 0.4, vida: 0.3, tam: 0.25 });
    FM({ x: jg.x, y: jg.y + 0.2, z: jg.z, n: 1, tipo: 'nevoa', cor: '#8a7a64', vel: 1, vida: 0.6, tam: 0.8, tamFim: 1.6, alfa: 0.5 });
    if (d.sk.mult) for (const e of J.inimigos) if (!e.morto && !d.atingidos.has(e) && e.m.raiz.visible && dist2(e, jg) < d.sk.raio + e.raio) { d.atingidos.add(e); J.acertarInimigo(e, d.sk.mult, d.sk); if (!e.boss) J.mover(e, Math.sin(jg.ang) * 2, Math.cos(jg.ang) * 2, e.raio); }
    if (k >= 1) { if (d.sk.explode) J.explodir(jg.x, jg.y + 0.8, jg.z, d.sk.explode * st.area, 'jogador', d.sk, d.sk.mult || 1, d.sk.cor); jg.dash = null; }
  } else if (jg.salto) {
    const s = jg.salto; s.t += dt; const k = Math.min(1, s.t / s.dur);
    const nx = lerp(s.de.x, s.para.x, k), nz = lerp(s.de.z, s.para.z, k);
    J.mover(jg, nx - jg.x, nz - jg.z, 0.4);
    jg.alturaSalto = Math.sin(k * Math.PI) * 4;
    if (k >= 1) {
      jg.alturaSalto = 0; jg.salto = null;
      const r = s.sk.raio * (s.sk.raioMul || 1) * st.area;
      ENG.onda(jg.x, jg.y, jg.z, r, s.sk.cor, 0.45); ENG.tremor = 0.6;
      FM({ x: jg.x, y: jg.y + 0.3, z: jg.z, n: 26, tipo: 'nevoa', cor: '#7a6a54', vel: 6, vida: 0.9, tam: 1.0, tamFim: 2.2, anelPlano: true, alfa: 0.6 });
      FM({ x: jg.x, y: jg.y + 0.2, z: jg.z, n: 14, tipo: 'pedra', cor: '#5a4a3a', vel: 6, vida: 0.9, tam: 0.3, sobe: 3, grav: 14, girar: 8 });
      GFX.decal(jg.x, jg.z, r * 0.6, 'queimado', 8); VFX.coluna(jg.x, jg.y, jg.z, s.sk.cor, 4, r * 0.4, 0.3);
      ENG.particulas.emitir({ x: jg.x, y: jg.y + 0.3, z: jg.z, n: 30, cor: s.sk.cor, vel: 8, vida: 0.4, tam: 0.4 });
      for (const e of J.inimigos) if (!e.morto && e.m.raiz.visible && dist2(e, jg) < r + e.raio) J.acertarInimigo(e, s.sk.mult, s.sk);
    }
  } else if (jg.rolar) {
    const r = jg.rolar; r.t += dt; const k = Math.min(1, r.t / r.dur);
    J.mover(jg, r.vx * dt * (1 - k * 0.5), r.vz * dt * (1 - k * 0.5), 0.4);
    if (Math.random() < 0.5) ENG.fumaca.emitir({ x: jg.x, y: jg.y + 0.2, z: jg.z, n: 1, cor: '#8a7a68', vel: 1, vida: 0.5, tam: 0.5, sobe: 1 });
    if (k >= 1) jg.rolar = null;
  }
  // conjuração
  if (jg.cast) {
    const c = jg.cast; c.t += dt;
    if (!c.disparou && (c.anim === 'conjurar' || (c.anim === 'erguer' && c.sk.tipo === 'buff') || (c.anim === 'disparo' && c.sk.elem !== 'fisico'))) VFX.carregar(VFX.posMao(jg), c.sk.cor, c.t / c.dur);
    if (!c.circ && ['chuva', 'area'].includes(c.sk.tipo) && (c.sk.unico || c.sk.meteoro)) { c.circ = true; VFX.circulo(jg.x, jg.z, 2.6, c.sk.cor, c.dur + 0.4); }
    if (!c.disparou && c.t >= c.dur * (c.sk.tipo === 'golpe' ? 0.42 : 0.5)) { c.disparou = true; J.executar(c.sk, c.alvo); }
    if (c.t >= c.dur) jg.cast = null;
  }
  // entrada: habilidades
  if (J.estado === 'jogando' && !UI.painelAberto() && !jg.cast && !jg.dash && !jg.salto && !(J.mundo && J.mundo.cidade)) {
    const barra = J.pers.barra;
    const teclas = [inp.botoes[0] && !inp.sobreRotulo, inp.botoes[2], inp.teclas.KeyQ, inp.teclas.KeyE, inp.teclas.KeyR, inp.teclas.KeyF];
    for (let i = 0; i < 6; i++) if (teclas[i] && barra[i]) { if (J.tentarConjurar(barra[i])) { jg.irPara = null; break; } }
  }
  // movimento
  let mx = 0, mz = 0;
  if (!UI.painelAberto() || true) {
    if (inp.teclas.KeyW || inp.teclas.ArrowUp) mz -= 1;
    if (inp.teclas.KeyS || inp.teclas.ArrowDown) mz += 1;
    if (inp.teclas.KeyA || inp.teclas.ArrowLeft) mx -= 1;
    if (inp.teclas.KeyD || inp.teclas.ArrowRight) mx += 1;
  }
  if (mx || mz) jg.irPara = null;
  if (jg.irPara) {
    const d = jg.irPara; const dx = d.x - jg.x, dz = d.z - jg.z; const L = Math.hypot(dx, dz);
    if (L < (d.raioChegada || 1.4)) { const alvoIr = d; jg.irPara = null; if (J.drops.includes(alvoIr)) J.pegar(alvoIr); else if (alvoIr.ao) alvoIr.ao(); }
    else { mx = dx / L; mz = dz / L; }
  }
  const L = Math.hypot(mx, mz);
  let andando = false;
  const podeMover = !jg.dash && !jg.salto && !jg.rolar && (!jg.cast || jg.cast.sk.tipo === 'buff');
  if (L > 0 && podeMover) {
    mx /= L; mz /= L;
    const v = st.velMov * (jg.lentoT > 0 ? 1 - jg.lentoF : 1) * (jg.cast ? 0.5 : 1);
    andando = J.mover(jg, mx * v * dt, mz * v * dt, 0.4);
    if (!jg.cast) jg.ang = jg.ang + angDif(yawPara(mx, mz), jg.ang) * (1 - Math.exp(-dt * 14));
    jg.fase += dt * v * 1.5;
  }
  if (jg.cast) jg.ang = jg.ang + angDif(yawPara(jg.cast.alvo.x - jg.x, jg.cast.alvo.z - jg.z), jg.ang) * (1 - Math.exp(-dt * 20));
  jg.andar = lerp(jg.andar, andando || jg.dash ? 1 : 0, 1 - Math.exp(-dt * 10));
  // esquiva (espaço)
  if (inp.teclas.Space && jg.esquivaCD <= 0 && !jg.dash && !jg.salto && !jg.rolar && J.estado === 'jogando') {
    inp.teclas.Space = false;
    let dx = mx, dz = mz;
    if (!dx && !dz) { dx = Math.sin(jg.ang); dz = Math.cos(jg.ang); }
    const n = Math.hypot(dx, dz);
    jg.rolar = { vx: dx / n * 17, vz: dz / n * 17, t: 0, dur: 0.32 };
    jg.invuln = 0.35; jg.esquivaCD = 1.6; jg.cast = null; jg.ang = yawPara(dx, dz);
  }
  // frascos
  if (inp.teclas.Digit1) { inp.teclas.Digit1 = false; J.usarFrasco('vida'); }
  if (inp.teclas.Digit2) { inp.teclas.Digit2 = false; J.usarFrasco('rec'); }
  // posição
  jg.y = J.mundo.h(jg.x, jg.z);
  const mm = jg.m;
  mm.raiz.position.set(jg.x, jg.y + (jg.alturaSalto || 0), jg.z);
  mm.raiz.rotation.y = jg.ang;
  if (mm.rig !== 'gltf') { if (jg.rolar) { const k = jg.rolar.t / jg.rolar.dur; mm.p.corpo.rotation.x = k * Math.PI * 2; mm.p.corpo.position.y = Math.sin(k * Math.PI) * 0.3; } else mm.p.corpo.rotation.x = 0; }
  MOD.animar(mm, { andar: jg.andar, fase: jg.fase, t: jg.t, atq: jg.cast ? jg.cast.t / jg.cast.dur : null, tipoAtq: jg.cast ? jg.cast.anim : null, rolar: jg.rolar ? jg.rolar.t / jg.rolar.dur : null });
  mm.anel.material.opacity = jg.invuln > 0 ? 0.8 : 0.3;
  { const c = jg.cast; const k = c ? c.t / c.dur : 0; VFX.rastroArma(jg, !!c && (c.anim === 'golpe' || c.anim === 'giro') && k > 0.18 && k < 0.85, c ? c.sk.cor : null); }
  ENG.tocha.position.set(jg.x, jg.y + 3.5, jg.z + 1);
  // portal
  if (J.portal) {
    J.portal.userData.anel.rotation.z += dt; J.portal.userData.disco.material.opacity = 0.45 + Math.sin(J.tempo * 4) * 0.12;
    if (Math.random() < 0.6) ENG.particulas.emitir({ x: J.portalPos.x, y: J.mundo.h(J.portalPos.x, J.portalPos.z) + 2, z: J.portalPos.z, n: 2, cor: '#90a0ff', vel: 1.5, vida: 0.8, tam: 0.35, espalhar: 2.6 });
    if (Math.hypot(jg.x - J.portalPos.x, jg.z - J.portalPos.z) < 2.2 && J.estado === 'jogando') J.concluirZona();
  }
};

J.usarFrasco = function (tipo) {
  const f = J.pers.frascos; if (f[tipo] < 10) { UI.aviso('Frasco sem cargas', '#ff9090'); return; }
  f[tipo] -= 10;
  const jg = J.jog, st = J.st, ef = 1 + st.efPocao / 100;
  if (tipo === 'vida') jg.curas.push({ tipo, taxa: st.vidaMax * 0.55 * ef / 1.2, t: 1.2 });
  else jg.curas.push({ tipo, taxa: st.recMax * 0.7 * ef / 1.0, t: 1.0 });
  ENG.particulas.emitir({ x: jg.x, y: jg.y + 1, z: jg.z, n: 26, cor: tipo === 'vida' ? '#ff4040' : CLASSES[J.pers.classe].recurso.cor, vel: 2, vida: 0.9, tam: 0.35, sobe: 2, grav: -1, espalhar: 1 });
};

// ------------------------------------------------------------
// IA dos inimigos
// ------------------------------------------------------------
J.alvoDe = function (e) {
  let alvo = J.jog, d = J.estado === 'jogando' || !J.alvosExtras ? dist2(e, J.jog) : 1e9;
  if (e.nid != null && J.alvosExtras) for (const r of J.alvosExtras) { const dr = dist2(e, r); if (dr < d) { d = dr; alvo = r; } }
  for (const l of J.lacaios) { const dl = dist2(e, l); if (dl < d - 2 && dl < 9) { d = dl; alvo = l; } }
  return [alvo, d];
};
J.danoAlvo = function (alvo, dano, elem, e) {
  if (alvo === J.jog) J.danoJogador(dano, elem, e);
  else if (!alvo.remoto) { alvo.vida -= dano; alvo.flash = 1; }
};

J.iniciarAtq = function (e, atq, alvo) {
  e.atq = atq;
  if (atq.salto) J.criarArea({ x: atq.para.x, z: atq.para.z, raio: 2.6, atraso: 0.7, dono: 'inimigo', dano: 0, cor: '#ffa040', visual: 'nenhum' });
  if (atq.tipo === 'erguer' && e.d.ia === 'explosivo') J.criarArea({ x: e.x, z: e.z, raio: 3, atraso: 0.65, dono: 'inimigo', dano: e.dano * 2.2, elem: 'fogo', cor: '#ff5010', visual: 'explosao', fonte: null });
  if (J.aoIniciarAtq) J.aoIniciarAtq(e, atq, alvo);
};
// números aleatórios repetíveis (mesmo resultado em todos os jogadores)
J.comSemente = function (s, fn) {
  const r0 = Math.random; let a = s >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = r0; }
};

J.atualizarInimigo = function (e, dt) {
  const jg = J.jog, m = J.mundo;
  e.t += dt;
  if (e.morto) {
    e.mortoT += dt;
    const k = Math.min(1, e.mortoT / 0.6);
    const r = e.m.raiz;
    if (e.m.rig === 'gltf') { e.m.morto = true; e.m.mortoT = e.mortoT; MOD.animar(e.m, { t: e.t, andar: 0 }); r.position.y = e.y - Math.max(0, e.mortoT - 2.0) * 0.7; }
    else if (e.d.rig === 'voador' || e.d.rig === 'elemental') r.position.y = e.y - k * 1.2;
    else { r.rotation.z = e.lado * k * 1.45; r.position.y = e.y + Math.sin(k * Math.PI) * 0.3 - Math.max(0, e.mortoT - 1.8) * 0.6; }
    MOD.flash(e.m, 0);
    if (e._rl) { e._rl.remover(); e._rl = null; }
    if (e.mortoT > 3.2) { ENG.scene.remove(r); MOD.descartar(e.m); return false; }
    return true;
  }
  // dots
  for (let i = e.dots.length - 1; i >= 0; i--) {
    const d = e.dots[i]; const q = Math.min(d.t, dt); d.t -= dt; e.vida -= d.dps * q;
    if (e.marionete && J.aoDanoMarionete) J.aoDanoMarionete(e, d.dps * q);
    if (Math.random() < 0.3) ENG.particulas.emitir({ x: e.x, y: e.y + 0.8 * e.m.escala, z: e.z, n: 1, cor: corElem[d.elem], vel: 1, vida: 0.5, tam: 0.35, sobe: 2, espalhar: 0.6 });
    if (d.t <= 0) e.dots.splice(i, 1);
  }
  if (e.vida <= 0) { J.matarInimigo(e); return true; }
  e.flash = Math.max(0, e.flash - dt * 6);
  MOD.flash(e.m, e.flash);
  e.lentoT = Math.max(0, e.lentoT - dt); if (e.lentoT <= 0) e.lentoF = 0;
  let [alvo, d] = J.alvoDe(e);
  if (e.marionete && e.atq && e.atq.alvoRef && J.resolverAlvo) { const r = J.resolverAlvo(e.atq.alvoRef); if (r) { alvo = r; d = dist2(e, r); } }
  if (e.estado === 'dormindo') {
    if (!e.marionete && d < (e.boss ? 20 : 19)) J.acordar(e);
    MOD.animar(e.m, { andar: 0, fase: e.fase, t: e.t, atq: null });
    return true;
  }
  if (e.boss) { J.atualizarChefe(e, dt, d); return true; }
  e.cd -= dt;
  const vel = e.vel * (1 - e.lentoF);
  let movendo = 0;
  const angAlvo = yawPara(alvo.x - e.x, alvo.z - e.z);
  if (e.atq) {
    const a = e.atq; a.t += dt * (1 - e.lentoF * 0.5);
    const k = a.t / a.dur;
    e.ang += angDif(angAlvo, e.ang) * (1 - Math.exp(-dt * (k < 0.4 ? 6 : 1)));
    if (a.salto) {
      const kk = Math.min(1, k);
      J.mover(e, (a.para.x - e.x) * Math.min(1, dt * 6), (a.para.z - e.z) * Math.min(1, dt * 6), e.raio);
      e.alt = Math.sin(kk * Math.PI) * 2.5;
    }
    if (!a.feito && (e.d.ia === 'caster' || e.d.ia === 'ranged') && k < a.golpe && e.m.rig === 'gltf') VFX.carregar(VFX.posMao(e), e.d.proj ? e.d.proj.cor : (e.d.elem === 'veneno' ? '#80e030' : '#ff6020'), k / a.golpe);
    VFX.rastroArma(e, !a.salto && (e.d.ia === 'melee' || e.d.ia === 'rapido') && k > 0.25 && k < 0.7, '#d0e0ff');
    if (!a.feito && k >= a.golpe) {
      a.feito = true;
      const ia = e.d.ia;
      if (a.salto) { e.alt = 0; ENG.onda(e.x, e.y, e.z, 2.6, '#a0a080', 0.3); FM({ x: e.x, y: e.y + 0.2, z: e.z, n: 10, tipo: 'nevoa', cor: '#7a6a54', vel: 3, vida: 0.7, tam: 0.8, tamFim: 1.8, anelPlano: true, alfa: 0.6 }); if (dist2(alvo, e) < 2.8) J.danoAlvo(alvo, e.dano * 1.3, e.d.elem || 'fisico', e); }
      else if (ia === 'ranged') {
        const pr = e.d.proj;
        { const mp = VFX.posMao(e); FX({ x: mp.x, y: mp.y, z: mp.z, n: 1, tipo: 'estrela', cor: pr.cor, vel: 0, vida: 0.12, tam: 1.0, brilho: 2 }); }
        J.criarProjetil({ x: e.x, z: e.z, y: e.y + 1.2 * e.m.escala, ang: yawPara(alvo.x - e.x, alvo.z - e.z), vel: pr.vel, alcance: e.alcance * 1.5, raio: 0.5, dono: 'inimigo', base: e.dano, elem: pr.elem, cor: pr.cor, modelo: pr.modelo || 'orbe', fonte: e, sk: { elem: pr.elem } });
      } else if (ia === 'caster') {
        J.criarArea({ x: alvo.x, z: alvo.z, raio: 2.8, atraso: 1.0, dono: 'inimigo', dano: e.dano * 1.4, elem: e.d.elem || 'fogo', cor: e.d.elem === 'veneno' ? '#70c020' : '#ff5020', visual: e.d.elem === 'veneno' ? 'veneno' : 'explosao', fonte: e });
      } else if (ia === 'explosivo') {
        if (!e.marionete) { e.vida = 0; J.matarInimigo(e); return true; }
      } else {
        const alc = e.alcance * (e.m.escala > 1.3 ? 1.1 : 1) + 0.6;
        VFX.corte(e.x, e.y, e.z, Math.atan2(Math.cos(e.ang), Math.sin(e.ang)), alc, 100, e.d.elem ? corElem[e.d.elem] : '#ffd0b0', { dur: 0.2, altura: 0.9 * Math.min(1.5, e.m.escala) });
        if (dist2(alvo, e) < alc + 0.4) J.danoAlvo(alvo, e.dano, e.d.elem || 'fisico', e);
        if (e.d.vamp) e.vida = Math.min(e.vidaMax, e.vida + e.dano);
      }
    }
    if (k >= 1) { e.atq = null; e.alt = 0; }
  } else if (e.marionete) {
    movendo = J.moverMarionete(e, dt);
  } else {
    const ia = e.d.ia;
    let alvoX = alvo.x, alvoZ = alvo.z, quer = 0;
    if (ia === 'ranged' || ia === 'caster') {
      if (d > e.alcance * 0.9) quer = 1;
      else if (d < e.alcance * 0.4) quer = -1;
      else quer = 0.4;
      if (d < e.alcance * 1.05 && e.cd <= 0 && m.borda((alvo.x + e.x) / 2, (alvo.z + e.z) / 2) < 1) {
        J.iniciarAtq(e, { t: 0, dur: ia === 'caster' ? 0.9 : 0.7, golpe: 0.6, tipo: ia === 'caster' ? 'conjurar' : (e.d.visual.arco ? 'disparo' : 'golpe') }, alvo);
        e.cd = (ia === 'caster' ? 3.2 : 2.0) * (0.8 + Math.random() * 0.4) * (e.mods.includes('veloz') ? 0.75 : 1);
      }
    } else if (ia === 'saltador' && d > 4 && d < 10 && e.cd <= 0) {
      J.iniciarAtq(e, { t: 0, dur: 0.75, golpe: 0.95, salto: true, para: { x: alvo.x, z: alvo.z }, tipo: 'golpe' }, alvo);
      e.cd = 4;
    } else if (ia === 'explosivo' && d < 2.4) {
      J.iniciarAtq(e, { t: 0, dur: 0.7, golpe: 0.95, tipo: 'erguer' }, alvo);
    } else {
      const alcR = e.alcance + (alvo.raio || 0.4);
      if (d > alcR * 0.85) quer = 1;
      else if (e.cd <= 0) {
        J.iniciarAtq(e, { t: 0, dur: (ia === 'rapido' ? 0.55 : 0.85) * (e.mods.includes('veloz') ? 0.8 : 1), golpe: 0.55, tipo: 'golpe' }, alvo);
        e.cd = (ia === 'rapido' ? 0.9 : 1.5) * (0.85 + Math.random() * 0.3);
      }
    }
    if (quer !== 0) {
      let dx = alvoX - e.x, dz = alvoZ - e.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      if (quer < 0) { dx = -dx; dz = -dz; }
      else if (quer < 1) { const t = dx; dx = -dz * e.strafe; dz = t * e.strafe; if (Math.random() < dt * 0.4) e.strafe *= -1; }
      const kv = quer < 0 ? 0.55 : Math.min(1, quer + 0.3);
      if (J.mover(e, dx * vel * dt * kv, dz * vel * dt * kv, e.raio)) movendo = quer < 0 ? 0.6 : 1;
      else e.strafe *= -1;
      // sempre de frente para o alvo (recua dando passos para trás)
      e.ang += angDif(angAlvo, e.ang) * (1 - Math.exp(-dt * 8));
      e.fase += dt * vel * 1.6;
    } else e.ang += angDif(angAlvo, e.ang) * (1 - Math.exp(-dt * 6));
  }
  // separação
  if (!e.marionete) for (const o of J.inimigos) {
    if (o === e || o.morto || !o.m.raiz.visible) continue;
    const dx = e.x - o.x, dz = e.z - o.z, dd = Math.hypot(dx, dz), min = e.raio + o.raio;
    if (dd < min && dd > 0.001) { const f = (min - dd) * 0.5; J.mover(e, dx / dd * f, dz / dd * f, e.raio); }
  }
  e.mov = lerp(e.mov || 0, movendo, 1 - Math.exp(-dt * 8));
  e.y = m.h(e.x, e.z);
  const r = e.m.raiz;
  r.position.set(e.x, e.y + (e.alt || 0), e.z); r.rotation.y = e.ang;
  MOD.animar(e.m, { andar: e.mov, fase: e.fase, t: e.t, atq: e.atq ? e.atq.t / e.atq.dur : null, tipoAtq: e.atq ? e.atq.tipo : null, voando: true });
  if (e.d.visual && e.d.visual.brilho && Math.random() < 0.15) ENG.particulas.emitir({ x: e.x, y: e.y + 1.2 * e.m.escala, z: e.z, n: 1, cor: '#ff6020', vel: 1, vida: 0.6, tam: 0.3, sobe: 3, espalhar: 0.5 * e.m.escala });
  return true;
};

// ------------------------------------------------------------
// Chefes
// ------------------------------------------------------------
J.alvoChefe = function (e) {
  if (e.marionete) return (e.boss.alvoRef && J.resolverAlvo && J.resolverAlvo(e.boss.alvoRef)) || J.jog;
  const [a] = J.alvoDe(e); return a.remoto || a === J.jog ? a : J.jog;
};
J.usarHabChefe = function (e, h) {
  const s = (Math.random() * 1e9) >>> 0;
  if (J.aoHabChefe) J.aoHabChefe(e, h, s);
  J.comSemente(s, () => J.habChefe(e, h));
};
J.atualizarChefe = function (e, dt, d) {
  const jg = J.alvoChefe(e), B = e.boss, c = e.c;
  d = dist2(e, jg);
  B.invulnT = Math.max(0, B.invulnT - dt);
  // fases
  const pct = e.vida / e.vidaMax;
  const novaFase = pct < 0.33 ? 3 : pct < 0.66 ? 2 : 1;
  if (novaFase > B.fase) {
    B.fase = novaFase; B.invulnT = 1.6; B.acao = null; e.atq = null;
    ENG.tremor = 1.2; ENG.onda(e.x, e.y, e.z, 14, '#ff4020', 0.8); VFX.coluna(e.x, e.y, e.z, corElem[c.elem], 14, e.raio * 1.4, 1.2); VFX.circulo(e.x, e.z, e.raio * 3, corElem[c.elem], 1.6);
    J.texto(e.x, e.y + 4 * e.m.escala / 2, e.z, B.fase === 3 ? 'FÚRIA!' : 'Fase ' + B.fase, '#ff6040', 28, 1.6);
    ENG.particulas.emitir({ x: e.x, y: e.y + 2, z: e.z, n: 120, cor: corElem[c.elem], vel: 10, vida: 0.9, tam: 0.6 });
    // empurrar jogador
    const jl = J.jog, dx = jl.x - e.x, dz = jl.z - e.z, L = Math.hypot(dx, dz) || 1;
    if (L < 8) J.mover(jl, dx / L * (8 - L), dz / L * (8 - L), 0.4);
    if (B.fase === 3) { e.vel *= 1.2; e.dano *= 1.15; }
  }
  const velF = [1, 1, 0.82, 0.66][B.fase];
  B.cdHab -= dt;
  e.cd -= dt;
  const angJ = yawPara(jg.x - e.x, jg.z - e.z);
  let movendo = 0, tipoAnim = null, prog = null;
  if (B.invulnT > 0) {
    tipoAnim = 'erguer'; prog = 1 - B.invulnT / 1.6;
  } else if (B.acao) {
    const a = B.acao; a.t += dt;
    prog = Math.min(1, a.t / a.dur); tipoAnim = a.anim || 'golpe';
    if (a.tipo === 'investida' && a.t >= a.prep) {
      const k = Math.min(1, (a.t - a.prep) / a.corrida);
      const nx = lerp(a.de.x, a.para.x, k), nz = lerp(a.de.z, a.para.z, k);
      J.mover(e, nx - e.x, nz - e.z, e.raio * 0.6);
      movendo = 1; e.fase += dt * 20;
      ENG.fumaca.emitir({ x: e.x, y: e.y + 0.3, z: e.z, n: 2, cor: '#6a5a48', vel: 2, vida: 0.6, tam: 1, sobe: 1 });
      if (Math.random() < 0.7) { FM({ x: e.x, y: e.y + 0.3, z: e.z, n: 2, tipo: 'nevoa', cor: '#7a6a54', vel: 2, vida: 0.8, tam: 1.4, tamFim: 2.8, alfa: 0.6, espalhar: e.raio }); FM({ x: e.x, y: e.y + 0.2, z: e.z, n: 1, tipo: 'pedra', cor: '#5a4a3a', vel: 3, vida: 0.6, tam: 0.3, sobe: 2, grav: 12, girar: 8 }); }
      if (!a.acertou && dist2(J.jog, e) < e.raio + 1.6) { a.acertou = true; J.danoJogador(e.dano * 1.8, c.elem === 'fisico' ? 'fisico' : 'fisico', e); }
    } else if (a.tipo !== 'investida') e.ang += angDif(angJ, e.ang) * (1 - Math.exp(-dt * 3));
    if (a.t >= a.dur) B.acao = null;
  } else if (e.atq) {
    const a = e.atq; a.t += dt; prog = a.t / a.dur; tipoAnim = 'golpe';
    if (!a.feito && prog >= 0.6) { a.feito = true; }
    if (prog >= 1) e.atq = null;
  } else if (e.marionete) {
    movendo = J.moverMarionete(e, dt);
  } else if (B.cdHab <= 0) {
    // escolher habilidade
    let ops = c.habilidades.filter(h => h !== B.ultima);
    if (B.fase === 1) ops = ops.slice(0, Math.max(2, ops.length - 2));
    const h = RNG.pick(ops); B.ultima = h;
    J.usarHabChefe(e, h);
    B.cdHab = (2.6 + Math.random() * 1.2) * velF;
  } else {
    // aproximar e golpear
    if (d > 3.5 + e.raio) {
      const dx = (jg.x - e.x) / d, dz = (jg.z - e.z) / d;
      if (J.mover(e, dx * e.vel * dt * (1 - e.lentoF), dz * e.vel * dt * (1 - e.lentoF), e.raio * 0.6)) movendo = 1;
      e.fase += dt * e.vel * 1.4;
    } else if (e.cd <= 0) J.usarHabChefe(e, 'basico');
    e.ang += angDif(angJ, e.ang) * (1 - Math.exp(-dt * 5));
  }
  e.mov = lerp(e.mov || 0, movendo, 1 - Math.exp(-dt * 6));
  e.y = J.mundo.h(e.x, e.z);
  e.m.raiz.position.set(e.x, e.y, e.z); e.m.raiz.rotation.y = e.ang;
  MOD.animar(e.m, { andar: e.mov, fase: e.fase, t: e.t, atq: prog, tipoAtq: tipoAnim, voando: true });
  if (B.invulnT > 0) MOD.flash(e.m, 0.4 + Math.sin(e.t * 20) * 0.3);
  // aura visual
  if (Math.random() < 0.5) ENG.particulas.emitir({ x: e.x, y: e.y + 1.5 * e.m.escala / 2.5, z: e.z, n: 1, cor: corElem[c.elem], vel: 1, vida: 0.9, tam: 0.5, sobe: 2.5, espalhar: e.raio * 1.5 });
};

J.habChefe = function (e, h) {
  const jg = J.alvoChefe(e), B = e.boss, c = e.c, f = B.fase;
  const velF = [1, 1, 0.82, 0.66][f];
  const cor = c.elem === 'fogo' ? '#ff4010' : c.elem === 'frio' ? '#40a0ff' : c.elem === 'veneno' ? '#70d020' : '#ff3020';
  const vis = c.elem === 'fogo' ? 'explosao' : c.elem === 'frio' ? 'gelo' : c.elem === 'veneno' ? 'veneno' : 'tremor';
  switch (h) {
    case 'basico': {
      // golpe básico telegrafado na frente
      const angJ = yawPara(jg.x - e.x, jg.z - e.z);
      const fx = e.x + Math.sin(angJ) * (e.raio + 1.2), fz = e.z + Math.cos(angJ) * (e.raio + 1.2);
      J.criarArea({ x: fx, z: fz, raio: 2.6, atraso: 0.65 * velF + 0.1, dono: 'inimigo', dano: e.dano * 1.2, elem: c.elem, cor: '#ff3020', visual: 'tremor', fonte: e });
      e.atq = { t: 0, dur: 0.85 * velF + 0.1 };
      e.cd = 1.6 * velF;
      break;
    }
    case 'golpeArea': {
      const n = f === 1 ? 3 : f === 2 ? 5 : 7;
      for (let i = 0; i < n; i++) {
        const px = jg.x + (i === 0 ? 0 : (Math.random() - 0.5) * 9), pz = jg.z + (i === 0 ? 0 : (Math.random() - 0.5) * 9);
        J.criarArea({ x: px, z: pz, raio: 3.4, atraso: 1.15 + i * 0.12, dono: 'inimigo', dano: e.dano * 1.7, elem: c.elem, cor, visual: vis, fonte: e, lentidao: c.elem === 'frio' ? 0.4 : 0 });
      }
      B.acao = { tipo: h, t: 0, dur: 1.0, anim: 'erguer' };
      break;
    }
    case 'radial': {
      B.acao = { tipo: h, t: 0, dur: 1.1, anim: 'conjurar' };
      const ondas = f === 3 ? 3 : f === 2 ? 2 : 1;
      for (let w = 0; w < ondas; w++) J.agendar(0.8 + w * 0.55, () => {
        if (e.morto) return;
        const n = 14 + f * 4; const off = Math.random();
        for (let i = 0; i < n; i++) { const a = (i + off + w * 0.5) / n * Math.PI * 2; J.criarProjetil({ x: e.x, z: e.z, y: e.y + 1.5, ang: a, vel: 11 + f * 1.5, alcance: 30, raio: 0.55, dono: 'inimigo', base: e.dano * 0.75, elem: c.elem, cor, modelo: 'orbe', fonte: e, sk: { elem: c.elem } }); }
        ENG.onda(e.x, e.y, e.z, 4, cor, 0.3);
      });
      break;
    }
    case 'investida': {
      const de = { x: e.x, z: e.z };
      const dx = jg.x - e.x, dz = jg.z - e.z, L = Math.hypot(dx, dz) || 1;
      const alc = Math.min(26, L + 6);
      let para = { x: e.x + dx / L * alc, z: e.z + dz / L * alc };
      for (let k = 0; k < 12 && !J.mundo.andavel(para.x, para.z, e.raio * 0.6); k++) para = { x: lerp(e.x, para.x, 0.85), z: lerp(e.z, para.z, 0.85) };
      const prep = f === 3 ? 0.7 : 0.95;
      const passos = Math.max(3, Math.floor(alc / 2.6));
      for (let i = 1; i <= passos; i++) { const t = i / passos; J.criarArea({ x: lerp(de.x, para.x, t), z: lerp(de.z, para.z, t), raio: e.raio + 1.0, atraso: prep, dono: 'inimigo', dano: 0, cor: '#ff3020', visual: 'nenhum' }); }
      e.ang = yawPara(dx, dz);
      B.acao = { tipo: h, t: 0, prep, corrida: 0.45, dur: prep + 0.55, de, para, anim: 'golpe' };
      break;
    }
    case 'nova': {
      const r = 8 + f;
      J.criarArea({ x: e.x, z: e.z, raio: r, atraso: 1.4, dono: 'inimigo', dano: e.dano * 2.0, elem: c.elem, cor, visual: vis, fonte: e });
      if (f === 3) J.agendar(1.6, () => { if (!e.morto) J.criarArea({ x: e.x, z: e.z, raio: r + 3, atraso: 1.1, dono: 'inimigo', dano: e.dano * 1.6, elem: c.elem, cor, visual: vis, fonte: e }); });
      B.acao = { tipo: h, t: 0, dur: 1.5, anim: 'erguer' };
      break;
    }
    case 'chuva': {
      const n = 7 + f * 3;
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = Math.random() * 10; J.criarArea({ x: jg.x + Math.cos(a) * r, z: jg.z + Math.sin(a) * r, raio: 2.4, atraso: 0.9 + Math.random() * 1.4, dono: 'inimigo', dano: e.dano * 1.2, elem: c.elem, cor, visual: c.elem === 'fogo' ? 'meteoro' : vis, fonte: e }); }
      B.acao = { tipo: h, t: 0, dur: 0.9, anim: 'conjurar' };
      break;
    }
    case 'invocar': {
      if (e.marionete) { B.acao = { tipo: h, t: 0, dur: 1.0, anim: 'erguer' }; break; }
      const vivos = J.inimigos.filter(o => o.invocado && !o.morto).length;
      if (vivos > 7) { B.cdHab = 0.2; break; }
      const n = 2 + f;
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; const x = e.x + Math.cos(a) * 4, z = e.z + Math.sin(a) * 4; if (!J.mundo.andavel(x, z, 0.5)) continue; const o = J.criarInimigo(c.invoca, x, z, e.nivel - 1, 'normal', { invocado: true }); o.estado = 'ativo'; o.m.raiz.visible = true; ENG.particulas.emitir({ x, y: J.mundo.h(x, z) + 0.5, z, n: 25, cor, vel: 3, vida: 0.7, tam: 0.4, sobe: 2 }); }
      B.acao = { tipo: h, t: 0, dur: 1.0, anim: 'erguer' };
      break;
    }
  }
};

// ------------------------------------------------------------
// Lacaios
// ------------------------------------------------------------
J.atualizarLacaios = function (dt) {
  const jg = J.jog;
  for (let i = J.lacaios.length - 1; i >= 0; i--) {
    const l = J.lacaios[i]; l.t += dt; l.cd -= dt;
    l.flash = Math.max(0, (l.flash || 0) - dt * 5); MOD.flash(l.m, l.flash);
    if (l.vida <= 0) { ENG.particulas.emitir({ x: l.x, y: l.y + 1, z: l.z, n: 20, cor: '#e0d8c0', vel: 4, vida: 0.5, tam: 0.3 }); ENG.scene.remove(l.m.raiz); MOD.descartar(l.m); J.lacaios.splice(i, 1); continue; }
    let alvo = null, bd = 14;
    for (const e of J.inimigos) { if (e.morto || e.estado === 'dormindo' && dist2(e, jg) > 16) continue; const d = dist2(e, l); if (d < bd) { bd = d; alvo = e; } }
    let movendo = 0;
    if (l.atq) {
      l.atq.t += dt; const k = l.atq.t / l.atq.dur;
      if (!l.atq.feito && k > 0.5) { l.atq.feito = true; if (alvo && dist2(alvo, l) < 2.4 + alvo.raio) J.acertarInimigo(alvo, l.sk.mult * (1 + J.st.lacaioDano / 100), { elem: 'fisico', multRank: l.sk.multRank }, { semVPG: true }); }
      if (k >= 1) l.atq = null;
    } else if (alvo) {
      if (bd > 1.6 + alvo.raio) { const dx = (alvo.x - l.x) / bd, dz = (alvo.z - l.z) / bd; if (J.mover(l, dx * 6.5 * dt, dz * 6.5 * dt, 0.4)) movendo = 1; l.fase += dt * 10; }
      else if (l.cd <= 0) { l.atq = { t: 0, dur: 0.6 }; l.cd = 0.9; }
      l.ang += angDif(yawPara(alvo.x - l.x, alvo.z - l.z), l.ang) * (1 - Math.exp(-dt * 10));
    } else {
      const d = dist2(jg, l);
      if (d > 4) { const dx = (jg.x - l.x) / d, dz = (jg.z - l.z) / d; if (J.mover(l, dx * 7.5 * dt, dz * 7.5 * dt, 0.4)) movendo = 1; l.fase += dt * 11; l.ang += angDif(yawPara(dx, dz), l.ang) * (1 - Math.exp(-dt * 10)); }
      if (d > 30) { l.x = jg.x; l.z = jg.z; }
    }
    for (const o of J.lacaios) { if (o === l) continue; const dx = l.x - o.x, dz = l.z - o.z, dd = Math.hypot(dx, dz); if (dd < 0.9 && dd > 0.001) J.mover(l, dx / dd * 0.02, dz / dd * 0.02, 0.4); }
    l.mov = lerp(l.mov || 0, movendo, 1 - Math.exp(-dt * 8));
    l.y = J.mundo.h(l.x, l.z);
    l.m.raiz.position.set(l.x, l.y, l.z); l.m.raiz.rotation.y = l.ang;
    MOD.animar(l.m, { andar: l.mov, fase: l.fase, t: l.t, atq: l.atq ? l.atq.t / l.atq.dur : null, tipoAtq: 'golpe' });
  }
};

// ------------------------------------------------------------
// Laço principal
// ------------------------------------------------------------
J.atualizar = function (dt) {
  J.tempo += dt;
  if (!J.mundo || !J.jog) return;
  if (J.estado === 'jogando') {
    for (let i = J.agendados.length - 1; i >= 0; i--) { const a = J.agendados[i]; a.t -= dt; if (a.t <= 0) { J.agendados.splice(i, 1); a.fn(); } }
    J.atualizarJogador(dt);
    const jg = J.jog;
    J.atualizarInimigos(dt);
    J.atualizarLacaios(dt);
    J.atualizarProjeteis(dt);
    J.atualizarAreas(dt);
    // drops: animação de queda
    for (const d of J.drops) {
      d.t += dt;
      const k = Math.min(1, d.t / 0.5);
      d.mesh.position.set(lerp(d.ox, d.x, k), d.y + 0.15 + Math.sin(k * Math.PI) * 1.5, lerp(d.oz, d.z, k));
      d.me.rotation.y += dt * (d.item.tipo === 'gema' ? 2 : 0.5);
    }
    // braseiros na arena
    if (J.mundo.braseiros && Math.random() < 0.8) for (const b of J.mundo.braseiros) if (Math.hypot(b.x - jg.x, b.z - jg.z) < 50) ENG.particulas.emitir({ x: b.x, y: b.y, z: b.z, n: 1, cor: '#ff7020', cor2: '#ffc040', vel: 0.8, vida: 0.7, tam: 0.6, sobe: 3, espalhar: 0.4, grav: -2 });
    // ambiente
    J.ambiente(dt);
  } else {
    // ainda animar o personagem parado
    const jg = J.jog; jg.t += dt;
    MOD.animar(jg.m, { andar: 0, fase: jg.fase, t: jg.t, atq: null });
    // no multijogador, o anfitrião continua comandando os monstros
    if (J.simularSempre && J.simularSempre()) { J.atualizarInimigos(dt); J.atualizarProjeteis(dt); J.atualizarAreas(dt); }
  }
  for (let i = J.textos.length - 1; i >= 0; i--) { const t = J.textos[i]; t.t += dt; if (t.t > t.dur) J.textos.splice(i, 1); }
  ENG.atualizarEfeitos(dt);
  ENG.atualizarCamera(new THREE.Vector3(J.jog.x, J.jog.y, J.jog.z), dt);
};

J.atualizarInimigos = function (dt) {
  const jg = J.jog;
  for (let i = J.inimigos.length - 1; i >= 0; i--) {
    const e = J.inimigos[i];
    const dl = dist2(e, jg);
    const d = e.nid != null && J.distOutros ? Math.min(dl, J.distOutros(e)) : dl;
    const ativo = d < 60 || (e.estado === 'ativo' && d < 80) || e.boss && e.estado === 'ativo';
    e.m.raiz.visible = dl < 62 || e.morto && dl < 70;
    if (!ativo && !e.morto) continue;
    if (!J.atualizarInimigo(e, dt)) J.inimigos.splice(i, 1);
  }
};

J.ambiente = function (dt) {
  const b = J.mundo.bioma, jg = J.jog;
  const r = () => (Math.random() - 0.5) * 50;
  if (b === 'vulcao' && Math.random() < 0.7) ENG.particulas.emitir({ x: jg.x + r(), y: jg.y + Math.random() * 3, z: jg.z + r(), n: 1, cor: '#ff6020', vel: 0.5, vida: 2.5, tam: 0.2, sobe: 1, grav: -0.6, arrasto: 0.2 });
  if (b === 'gelo' && Math.random() < 0.9) ENG.fumaca.emitir({ x: jg.x + r(), y: jg.y + 10 + Math.random() * 4, z: jg.z + r(), n: 1, cor: '#ffffff', vel: 0.3, vida: 4, tam: 0.18, grav: 2.5, arrasto: 1.5, sobe: 0 });
  if ((b === 'pantano' || b === 'floresta') && Math.random() < 0.25) ENG.particulas.emitir({ x: jg.x + r(), y: jg.y + 0.5 + Math.random() * 2, z: jg.z + r(), n: 1, cor: b === 'pantano' ? '#b0ff60' : '#ffe890', vel: 0.4, vida: 3, tam: 0.15, sobe: 0.2, arrasto: 0.1 });
  if (b === 'caverna' && Math.random() < 0.3) ENG.particulas.emitir({ x: jg.x + r(), y: jg.y + Math.random() * 4, z: jg.z + r(), n: 1, cor: '#a080ff', vel: 0.3, vida: 3, tam: 0.15, sobe: 0.3, arrasto: 0.1 });
  if (b === 'deserto' && Math.random() < 0.4) ENG.fumaca.emitir({ x: jg.x + r(), y: jg.y + 0.4, z: jg.z + r(), n: 1, cor: '#d8b880', vel: 3, vida: 2, tam: 1.2, tamFim: 2.5, sobe: 0, dir: { x: 1, y: 0.05, z: 0.2 }, disp: 0.2, arrasto: 0.3 });
  if (b === 'litoral' && J.mundo.agua) J.mundo.agua.position.y = J.mundo.B.aguaNivel + Math.sin(J.tempo * 0.8) * 0.08;
  if (b === 'vulcao' && J.mundo.agua) J.mundo.agua.material.emissiveIntensity = 1.2 + Math.sin(J.tempo * 1.3) * 0.3;
};
