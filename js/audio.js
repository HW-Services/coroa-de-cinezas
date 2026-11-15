// ============================================================
//  Áudio: músicas de rock/metal e efeitos sonoros (todos CC0,
//  ver audio/CREDITOS.txt), com controles de volume.
// ============================================================
'use strict';

const SOM = {
  ctx: null, gMus: null, gFx: null, buffers: {}, manifesto: null, carregando: false,
  cfg: { musica: true, efeitos: true, volMus: 0.35, volFx: 0.8, v: 2 },
  ultimo: {}, ativos: {}, contexto: null, decks: [], deckAtual: null, tCtx: 0, passoAcc: 0, rolarAnt: false,
};
window.SOM = SOM;
try { const salvo = JSON.parse(localStorage.getItem('cdc_audio') || '{}'); if (salvo.v !== 2) delete salvo.volMus; Object.assign(SOM.cfg, salvo, { v: 2 }); } catch (e) { }
SOM.salvarCfg = () => { try { localStorage.setItem('cdc_audio', JSON.stringify(SOM.cfg)); } catch (e) { } };

// ------------------------------------------------------------
// Músicas
// ------------------------------------------------------------
const MUSICA = 'audio/musica/';
const TRILHAS = {
  menu: [{ src: 'tema.mp3', loop: true }],
  cidade: [{ src: 'cidade.mp3', loop: true }],
  zona: [{ src: 'megasong.mp3' }, { src: 'unchained_destiny.mp3' }, { src: 'once_more.mp3', vezes: 2 }],
  chefe: [{ src: 'chefe_abertura.mp3' }, { src: 'chefe_loop.mp3', loop: true }],
};

// ------------------------------------------------------------
// Início (o navegador só libera o som depois de um clique ou tecla)
// ------------------------------------------------------------
SOM.iniciar = function () {
  if (SOM.ctx) { if (SOM.ctx.state === 'suspended') SOM.ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try { SOM.ctx = new AC(); } catch (e) { return; }
  const c = SOM.ctx;
  SOM.gMus = c.createGain(); SOM.gMus.connect(c.destination);
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2; comp.connect(c.destination);
  SOM.gFx = c.createGain(); SOM.gFx.connect(comp);
  SOM.aplicarVolumes();
  SOM.carregarEfeitos();
  SOM.contexto = null; SOM.atualizarMusica(true);
};
SOM.aplicarVolumes = function () {
  if (!SOM.ctx) return;
  const t = SOM.ctx.currentTime;
  SOM.gMus.gain.setTargetAtTime(SOM.cfg.musica ? Math.pow(SOM.cfg.volMus, 1.6) * 0.45 : 0, t, 0.05);
  SOM.gFx.gain.setTargetAtTime(SOM.cfg.efeitos ? Math.pow(SOM.cfg.volFx, 1.6) : 0, t, 0.05);
  for (const d of SOM.decks) if (!SOM.cfg.musica && !d.el.paused) d.el.pause();
  if (SOM.cfg.musica && SOM.deckAtual && SOM.deckAtual.el.paused && SOM.deckAtual.el.src) SOM.deckAtual.el.play().catch(() => {});
};
SOM.carregarEfeitos = async function () {
  if (SOM.carregando) return; SOM.carregando = true;
  try { SOM.manifesto = await (await fetch('audio/sfx/manifesto.json')).json(); } catch (e) { return; }
  const fila = [];
  for (const [nome, arqs] of Object.entries(SOM.manifesto)) arqs.forEach((a, i) => fila.push([nome, i, a]));
  const um = async () => {
    while (fila.length) {
      const [nome, i, a] = fila.shift();
      try {
        const buf = await (await fetch('audio/sfx/' + a)).arrayBuffer();
        const dec = await new Promise((ok, er) => SOM.ctx.decodeAudioData(buf, ok, er));
        (SOM.buffers[nome] = SOM.buffers[nome] || [])[i] = dec;
      } catch (e) { }
    }
  };
  await Promise.all([um(), um(), um(), um(), um(), um()]);
};

// ------------------------------------------------------------
// Efeitos
// ------------------------------------------------------------
// op: { vol, x, z (posição no mundo), tom (multiplicador), varia (0..1), max (simultâneos), intervalo (s) }
SOM.tocar = function (nome, op = {}) {
  if (!SOM.ctx || !SOM.cfg.efeitos || SOM.ctx.state !== 'running') return;
  const lista = (SOM.buffers[nome] || []).filter(Boolean); if (!lista.length) return;
  const agora = SOM.ctx.currentTime;
  if (agora - (SOM.ultimo[nome] || -9) < (op.intervalo ?? 0.04)) return;
  if ((SOM.ativos[nome] || 0) >= (op.max || 4)) return;
  let vol = op.vol ?? 1, pan = 0;
  if (op.x != null && J.jog) {
    const dx = op.x - J.jog.x, dz = op.z - J.jog.z, d = Math.hypot(dx, dz);
    const alc = op.alcance || 42;
    if (d > alc) return;
    vol *= Math.pow(1 - d / alc, 1.4);
    pan = Math.max(-0.85, Math.min(0.85, dx / 18));
  }
  if (vol < 0.015) return;
  SOM.ultimo[nome] = agora;
  const c = SOM.ctx, src = c.createBufferSource();
  src.buffer = lista[Math.floor(Math.random() * lista.length)];
  src.playbackRate.value = (op.tom || 1) * (1 + ((Math.random() * 2 - 1) * (op.varia ?? 0.08)));
  const g = c.createGain(); g.gain.value = vol;
  let fim = g;
  if (c.createStereoPanner && pan) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); fim = p; }
  src.connect(g); fim.connect(SOM.gFx);
  SOM.ativos[nome] = (SOM.ativos[nome] || 0) + 1;
  src.onended = () => { SOM.ativos[nome]--; try { fim.disconnect(); g.disconnect(); } catch (e) { } };
  src.start();
};

// som de uma habilidade (do jogador local ou de outro jogador)
SOM.somHabilidade = function (h, x, z, remoto) {
  if (!h) return;
  const v = remoto ? 0.6 : 0.85;
  const p = x != null ? { x, z } : {};
  const el = h.elem || 'fisico', mod = h.modelo || '';
  switch (h.tipo) {
    case 'golpe': case 'nova': SOM.tocar('golpe', { ...p, vol: v, tom: h.tipo === 'nova' ? 0.85 : 1 }); break;
    case 'projetil': case 'radial':
      if (el === 'fogo' && mod !== 'flecha') SOM.tocar('fogo', { ...p, vol: v * 0.8 });
      else if (el === 'frio') SOM.tocar('magia', { ...p, vol: v * 0.7, tom: 1.35 });
      else if (el === 'raio') SOM.tocar('raio', { ...p, vol: v * 0.6, tom: mod === 'orbeGrande' ? 0.7 : 1.1 });
      else if (el === 'veneno') SOM.tocar('flecha', { ...p, vol: v * 0.7, tom: 1.2 });
      else if (mod === 'flecha') SOM.tocar('flecha', { ...p, vol: v });
      else SOM.tocar('golpe', { ...p, vol: v * 0.9, tom: 0.9 });
      break;
    case 'area': case 'chuva':
      if (mod === 'flecha' || h.id === 'chuva_flechas') SOM.tocar('flecha', { ...p, vol: v, tom: 0.8 });
      else SOM.tocar(el === 'fogo' ? 'fogo' : el === 'raio' ? 'magia' : 'magia', { ...p, vol: v * 0.8, tom: 0.8 });
      break;
    case 'buff': SOM.tocar(el === 'fogo' ? 'fogo' : 'magia', { ...p, vol: v, tom: 0.7 }); break;
    case 'investida': case 'salto': SOM.tocar('esquiva', { ...p, vol: v }); SOM.tocar('golpe', { ...p, vol: v * 0.6, tom: 0.8 }); break;
    case 'teleporte': SOM.tocar('portal', { ...p, vol: v * 0.8, tom: 1.4 }); break;
    case 'corrente': SOM.tocar('raio', { ...p, vol: v * 0.8 }); break;
    case 'invocar': SOM.tocar('invocar', { ...p, vol: v }); SOM.tocar('magia', { ...p, vol: v * 0.5, tom: 0.6 }); break;
    default: SOM.tocar('magia', { ...p, vol: v * 0.7 });
  }
};

// ------------------------------------------------------------
// Música: decks com transição suave
// ------------------------------------------------------------
SOM.novoDeck = function () {
  const el = new Audio(); el.preload = 'auto';
  const d = { el, g: null, fila: [], i: 0, rep: 0 };
  try { const s = SOM.ctx.createMediaElementSource(el); d.g = SOM.ctx.createGain(); d.g.gain.value = 0; s.connect(d.g); d.g.connect(SOM.gMus); } catch (e) { d.g = null; }
  el.addEventListener('ended', () => SOM.proxima(d));
  SOM.decks.push(d);
  return d;
};
SOM.tocarFaixa = function (d) {
  const f = d.fila[d.i]; if (!f) return;
  d.el.loop = !!f.loop;
  d.el.src = MUSICA + f.src;
  if (SOM.cfg.musica) d.el.play().catch(() => {});
};
SOM.proxima = function (d) {
  const f = d.fila[d.i];
  if (f && f.vezes && ++d.rep < f.vezes) { d.el.currentTime = 0; d.el.play().catch(() => {}); return; }
  d.rep = 0; d.i++;
  if (d.i >= d.fila.length) { if (d.embaralhar) d.fila = SOM.embaralhar(d.fila); d.i = 0; }
  SOM.tocarFaixa(d);
};
SOM.embaralhar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
SOM.trocarTrilha = function (ctxNome) {
  if (!SOM.ctx || SOM.contexto === ctxNome) return;
  SOM.contexto = ctxNome;
  const velho = SOM.deckAtual;
  const d = SOM.decks.find(x => x !== velho && x.el.paused) || SOM.novoDeck();
  d.fila = ctxNome === 'zona' ? SOM.embaralhar(TRILHAS.zona) : TRILHAS[ctxNome].slice(); d.embaralhar = ctxNome === 'zona'; d.i = 0; d.rep = 0;
  const t = SOM.ctx.currentTime;
  if (d.g) { d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(0.0001, t); d.g.gain.linearRampToValueAtTime(1, t + 1.6); }
  SOM.tocarFaixa(d);
  SOM.deckAtual = d;
  if (velho) {
    if (velho.g) { velho.g.gain.cancelScheduledValues(t); velho.g.gain.setValueAtTime(velho.g.gain.value, t); velho.g.gain.linearRampToValueAtTime(0.0001, t + 1.4); }
    setTimeout(() => { if (velho !== SOM.deckAtual) velho.el.pause(); }, 1500);
  }
};
SOM.atualizarMusica = function (forcar) {
  if (!SOM.ctx) return;
  const agora = performance.now(); if (!forcar && agora - SOM.tCtx < 500) return; SOM.tCtx = agora;
  let c = 'menu';
  if (J.estado !== 'menu' && J.z) {
    const ch = UI.chefe;
    if (ch && !ch.morto && ch.estado === 'ativo' && J.z.chefe === ch) c = 'chefe';
    else c = J.z.def.cidade ? 'cidade' : 'zona';
  }
  SOM.trocarTrilha(c);
};

// ------------------------------------------------------------
// Por quadro: passos, esquiva, fases de chefe, música
// ------------------------------------------------------------
SOM.porQuadro = function (dt) {
  SOM.atualizarMusica();
  const jg = J.jog; if (!jg || J.estado !== 'jogando') return;
  if ((jg.andar || 0) > 0.35 && !jg.rolar) {
    SOM.passoAcc += dt * (0.6 + jg.andar);
    if (SOM.passoAcc > 0.5) { SOM.passoAcc = 0; SOM.tocar('passo', { vol: 0.16, varia: 0.12, intervalo: 0.15, max: 2 }); }
  }
  const rolando = !!jg.rolar; if (rolando && !SOM.rolarAnt) SOM.tocar('esquiva', { vol: 0.7 }); SOM.rolarAnt = rolando;
  const ch = J.z && J.z.chefe;
  if (ch && ch.boss && !ch.morto) { if (ch._faseSom && ch.boss.fase > ch._faseSom) SOM.tocar('rugido', { x: ch.x, z: ch.z, vol: 1, tom: 0.75, alcance: 70 }); ch._faseSom = ch.boss.fase; }
};

// ------------------------------------------------------------
// Ganchos no jogo
// ------------------------------------------------------------
(function () {
  const ex0 = J.executar;
  J.executar = function (sk, alvo) { const r = ex0(sk, alvo); try { SOM.somHabilidade(sk, null, null, false); } catch (e) { } return r; };

  const ac0 = J.acertarInimigo;
  J.acertarInimigo = function (e, mult, sk, o) {
    const textos = J.textos.length;
    const d = ac0(e, mult, sk, o);
    if (d > 0) {
      const ult = J.textos[textos]; const crit = ult && ult.tam >= 20;
      const el = (o && o.elem) || (sk && sk.elem) || 'fisico';
      SOM.tocar('impacto', { x: e.x, z: e.z, vol: crit ? 0.75 : 0.45, intervalo: 0.05, max: 3, tom: e.boss ? 0.8 : 1 });
      if (crit) SOM.tocar('metal', { x: e.x, z: e.z, vol: 0.45, intervalo: 0.1 });
      if (el === 'frio') SOM.tocar('gelo', { x: e.x, z: e.z, vol: 0.3, intervalo: 0.12, max: 2 });
      else if (el === 'raio') SOM.tocar('raio', { x: e.x, z: e.z, vol: 0.25, intervalo: 0.15, max: 2, tom: 1.3 });
      else if (el === 'veneno') SOM.tocar('veneno', { x: e.x, z: e.z, vol: 0.3, intervalo: 0.15, max: 2 });
    }
    return d;
  };

  const mat0 = J.matarInimigo;
  J.matarInimigo = function (e) {
    const antes = e.morto; mat0(e);
    if (antes || !e.morto) return;
    const rig = (e.d && e.d.rig) || '';
    const nome = e.boss ? 'morteGrande' : /slime|sapo/i.test(rig) ? 'morteSlime' : /elemental|voador/.test(rig) ? 'morteSombra' : (e.m && e.m.escala > 1.4) ? 'morteGrande' : 'morte';
    SOM.tocar(nome, { x: e.x, z: e.z, vol: e.boss ? 1 : 0.55, max: 3, intervalo: 0.06, tom: e.pequeno ? 1.3 : 1, alcance: e.boss ? 80 : 42 });
    if (e.boss) { SOM.tocar('gongo', { vol: 0.8 }); SOM.tocar('explosao', { vol: 0.6, tom: 0.7 }); }
  };

  const dj0 = J.danoJogador;
  J.danoJogador = function (qtd, elem, fonte) {
    const jg = J.jog; const v0 = jg ? jg.vida : 0; const t0 = J.textos.length;
    dj0(qtd, elem, fonte);
    if (!jg) return;
    if (jg.vida < v0) { SOM.tocar('dor', { vol: 0.55, intervalo: 0.12, max: 2 }); SOM.tocar('impacto', { vol: 0.5, tom: 0.75, intervalo: 0.1, max: 2 }); }
    else { const t = J.textos[t0]; if (t && t.txt === 'Esquiva') SOM.tocar('esquiva', { vol: 0.6 }); else if (t && t.txt === 'Bloqueio') SOM.tocar('metal', { vol: 0.65 }); }
  };
  const mo0 = J.morrer; J.morrer = function () { mo0(); SOM.tocar('gongo', { vol: 1, tom: 0.6 }); };

  const xp0 = J.ganharXP;
  J.ganharXP = function (q) { const n0 = J.pers.nivel; xp0(q); if (J.pers.nivel > n0) { SOM.tocar('nivel', { vol: 0.9 }); SOM.tocar('magia', { vol: 0.5, tom: 1.2 }); } };

  const so0 = J.soltar;
  J.soltar = function (item, x, z) {
    const r = so0(item, x, z);
    if (item.tipo === 'ouro') SOM.tocar('moeda', { x, z, vol: 0.35, intervalo: 0.08 });
    else if (item.raridade === 'unico' || item.raridade === 'conjunto') { SOM.tocar('sino', { x, z, vol: 0.9, alcance: 60 }); SOM.tocar('gema', { x, z, vol: 0.6 }); }
    else if (item.raridade === 'raro') SOM.tocar('sino', { x, z, vol: 0.4, tom: 1.25 });
    else if (item.tipo === 'gema') SOM.tocar('gema', { x, z, vol: 0.55 });
    else SOM.tocar('itemCai', { x, z, vol: 0.4, intervalo: 0.08 });
    return r;
  };
  const pe0 = J.pegar;
  J.pegar = function (d) { const ouro = d && d.item && d.item.tipo === 'ouro'; const r = pe0(d); if (r !== false) SOM.tocar(ouro ? 'moeda' : 'pegar', { vol: ouro ? 0.4 : 0.6, intervalo: 0.06 }); return r; };
  const fr0 = J.usarFrasco;
  J.usarFrasco = function (tipo) { const c0 = J.pers.frascos[tipo]; fr0(tipo); if (J.pers.frascos[tipo] < c0) SOM.tocar('frasco', { vol: 0.7 }); };

  const ap0 = J.abrirPortalCidade; J.abrirPortalCidade = function () { const n = J.interativos.length; ap0(); if (J.interativos.length >= n && J.interativos.some(i => i.tipo === 'portal')) SOM.tocar('portal', { vol: 0.8 }); };
  const pa0 = J.ativarPassagem; J.ativarPassagem = function (it) { const ja = it.ativa; pa0(it); if (!ja) { SOM.tocar('magia', { vol: 0.7, tom: 0.9 }); SOM.tocar('sino', { vol: 0.4 }); } };
  const ed0 = J.entrarDef; J.entrarDef = function (def, chegada, opcoes) { ed0(def, chegada, opcoes); SOM.tocar('portal', { vol: 0.5, tom: 0.8 }); SOM.atualizarMusica(true); };
  const am0 = J.aceitarMissao; if (am0) J.aceitarMissao = function (id) { am0(id); SOM.tocar('abrir', { vol: 0.6 }); };
  const em0 = J.entregarMissao; if (em0) J.entregarMissao = function (id) { em0(id); SOM.tocar('sino', { vol: 0.7 }); SOM.tocar('moeda', { vol: 0.5 }); };

  // áreas (explosões, tremores, gelo, veneno)
  const da0 = J.disparoArea;
  J.disparoArea = function (a, y) {
    da0(a, y);
    const v = a.visual || (a.sk && a.sk.elem) || '';
    const vol = Math.min(1, 0.45 + (a.raio || 3) / 12);
    if (v === 'explosao' || v === 'meteoro' || v === 'fogo') SOM.tocar('explosao', { x: a.x, z: a.z, vol, intervalo: 0.07, max: 4 });
    else if (v === 'tremor' || v === 'fisico') SOM.tocar('tremor', { x: a.x, z: a.z, vol, intervalo: 0.07, max: 3 });
    else if (v === 'gelo' || v === 'frio') SOM.tocar('gelo', { x: a.x, z: a.z, vol, intervalo: 0.07, max: 3 });
    else if (v === 'veneno') SOM.tocar('veneno', { x: a.x, z: a.z, vol, intervalo: 0.07, max: 3 });
    else if (v === 'raio') SOM.tocar('trovao', { x: a.x, z: a.z, vol: vol * 0.8, intervalo: 0.2, max: 2 });
  };
  const xp1 = J.explodir; J.explodir = function (x, y, z, raio, dono, sk, mult, cor, base) { xp1(x, y, z, raio, dono, sk, mult, cor, base); SOM.tocar('explosao', { x, z, vol: 0.7, intervalo: 0.07 }); };

  // monstros atacando
  const ia0 = J.iniciarAtq;
  J.iniciarAtq = function (e, atq, alvo) {
    ia0(e, atq, alvo);
    const ia = e.d && e.d.ia; const tom = e.m && e.m.escala > 1.4 ? 0.75 : 1;
    if (ia === 'caster') SOM.tocar('magia', { x: e.x, z: e.z, vol: 0.4, tom: 0.85, max: 3 });
    else if (atq.salto) SOM.tocar('esquiva', { x: e.x, z: e.z, vol: 0.45, tom: 0.8, max: 3 });
    else if (ia !== 'ranged') SOM.tocar('golpe', { x: e.x, z: e.z, vol: 0.32, tom, max: 4, intervalo: 0.05 });
  };
  const cp0 = J.criarProjetil;
  J.criarProjetil = function (o) {
    const p = cp0(o);
    if (o.dono === 'inimigo') { const el = o.elem || 'fisico'; SOM.tocar(el === 'fogo' ? 'fogo' : el === 'fisico' ? 'flecha' : 'magia', { x: o.x, z: o.z, vol: 0.32, max: 4, intervalo: 0.05, tom: el === 'frio' ? 1.3 : 1 }); }
    return p;
  };
  const hc0 = J.habChefe;
  J.habChefe = function (e, h) {
    hc0(e, h);
    const p = { x: e.x, z: e.z, alcance: 70 };
    if (h === 'investida') SOM.tocar('rugido', { ...p, vol: 0.9 });
    else if (h === 'invocar') { SOM.tocar('invocar', { ...p, vol: 0.8 }); SOM.tocar('rugido', { ...p, vol: 0.5, tom: 1.2 }); }
    else if (h === 'basico') SOM.tocar('golpe', { ...p, vol: 0.7, tom: 0.6 });
    else SOM.tocar('magia', { ...p, vol: 0.75, tom: 0.6 });
  };
  const mc0 = UI.mostrarChefe;
  UI.mostrarChefe = function (e) { mc0(e); if (!e._rugiu) { e._rugiu = true; SOM.tocar('rugido', { vol: 1, tom: 0.8 }); } SOM.atualizarMusica(true); };

  // interface
  const alt0 = UI.alternar;
  UI.alternar = function (p) {
    const ids = { inv: '#painelInv', pers: '#painelPers', arvore: '#modalArvore', mapa: '#modalMapa', menu: '#modalMenu' };
    const el = ids[p] ? document.querySelector(ids[p]) : null; const antes = el ? el.hidden : null;
    alt0(p);
    if (el && el.hidden !== antes) SOM.tocar(el.hidden ? 'fechar' : 'abrir', { vol: 0.45, intervalo: 0.05 });
  };
  for (const f of ['equipar', 'desequipar']) { const o = UI[f]; if (o) UI[f] = function (...a) { o.apply(UI, a); SOM.tocar('equipar', { vol: 0.55 }); }; }
  for (const f of ['encaixar', 'combinarGemas']) { const o = UI[f]; if (o) UI[f] = function (...a) { o.apply(UI, a); SOM.tocar('gema', { vol: 0.6 }); }; }
  if (window.COM) {
    for (const f of ['vender', 'venderTodos']) { const o = COM[f]; if (o) COM[f] = function (...a) { const v = J.pers.ouro; o.apply(COM, a); if (J.pers.ouro > v) SOM.tocar('moeda', { vol: 0.7 }); }; }
    { const o = COM.comprar; if (o) COM.comprar = function (...a) { const v = J.pers.ouro; o.apply(COM, a); if (J.pers.ouro < v) SOM.tocar('comprar', { vol: 0.7 }); }; }
    { const o = COM.efeitoForja; if (o) COM.efeitoForja = function (...a) { o.apply(COM, a); SOM.tocar('martelo', { vol: 0.8 }); setTimeout(() => SOM.tocar('martelo', { vol: 0.6, tom: 1.1 }), 180); }; }
  }
  if (window.MP) {
    const er0 = MP.efeitoRemoto; if (er0) MP.efeitoRemoto = function (o, s) { er0(o, s); try { SOM.somHabilidade(HABILIDADES[s.s], o.x, o.z, true); } catch (e) { } };
    const rc0 = MP.receberChat; if (rc0) MP.receberChat = function (p) { rc0(p); SOM.tocar('clique', { vol: 0.25, tom: 1.3 }); };
  }
  if (window.REDE) {
    const pd0 = REDE.pedido; if (pd0) REDE.pedido = function (...a) { SOM.tocar('sino', { vol: 0.5, tom: 1.2 }); return pd0.apply(REDE, a); };
    const rp0 = REDE.recarregarPers; if (rp0) REDE.recarregarPers = async function (...a) { const r = await rp0.apply(REDE, a); if (a[0] === undefined) SOM.tocar('moeda', { vol: 0.6 }); return r; };
  }
  // cliques em botões
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.btn, .bmenu, .rAba, .sAba, .rServ')) SOM.tocar('clique', { vol: 0.22, intervalo: 0.03 }); }, true);

  const at0 = J.atualizar;
  J.atualizar = function (dt) { at0(dt); try { SOM.porQuadro(dt); } catch (e) { console.error(e); } };
  // nos menus (J.atualizar não roda o jogo, mas é chamado): garante a música do menu
  setInterval(() => { try { if (J.estado === 'menu') SOM.atualizarMusica(); } catch (e) { } }, 700);

  // libera o áudio no primeiro gesto
  const liberar = () => SOM.iniciar();
  window.addEventListener('pointerdown', liberar, true);
  window.addEventListener('keydown', liberar, true);
})();

// ------------------------------------------------------------
// Controles de volume (botão sempre visível + seção no Menu)
// ------------------------------------------------------------
SOM.icone = function () {
  const mudo = !SOM.cfg.musica && !SOM.cfg.efeitos;
  return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${mudo ? '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'}</svg>`;
};
SOM.montarControles = function (box) {
  const linha = (id, rot, liga, vol) => `
    <div class="somLinha">
      <span class="somRot">${rot}</span>
      <button class="somTog${SOM.cfg[liga] ? ' on' : ''}" data-tog="${liga}" role="switch" aria-checked="${SOM.cfg[liga]}" aria-label="${rot}: ${SOM.cfg[liga] ? 'ligado' : 'desligado'}"><span></span></button>
      <input type="range" min="0" max="100" step="1" value="${Math.round(SOM.cfg[vol] * 100)}" data-vol="${vol}" aria-label="Volume: ${rot}" ${SOM.cfg[liga] ? '' : 'disabled'}>
      <span class="somVal">${Math.round(SOM.cfg[vol] * 100)}</span>
    </div>`;
  box.innerHTML = linha('m', 'Música', 'musica', 'volMus') + linha('e', 'Efeitos', 'efeitos', 'volFx') + '<div class="somCred">Rock e metal CC0 · créditos em audio/CREDITOS.txt</div>';
  box.querySelectorAll('[data-tog]').forEach(b => b.addEventListener('click', (ev) => { ev.stopPropagation(); SOM.iniciar(); const k = b.dataset.tog; SOM.cfg[k] = !SOM.cfg[k]; SOM.salvarCfg(); SOM.aplicarVolumes(); SOM.atualizarUI(); }));
  box.querySelectorAll('[data-vol]').forEach(r => r.addEventListener('input', () => { SOM.iniciar(); SOM.cfg[r.dataset.vol] = r.value / 100; SOM.salvarCfg(); SOM.aplicarVolumes(); r.nextElementSibling.textContent = r.value; const b = document.getElementById('somBtn'); if (b) b.innerHTML = SOM.icone(); }));
  box.querySelectorAll('[data-vol="volFx"]').forEach(r => r.addEventListener('change', () => SOM.tocar('moeda', { vol: 0.8 })));
};
SOM.atualizarUI = function () {
  const b = document.getElementById('somBtn'); if (b) { b.innerHTML = SOM.icone(); b.setAttribute('aria-label', 'Som e música'); }
  for (const id of ['somPainel', 'somMenu']) { const el = document.getElementById(id); if (el) SOM.montarControles(el); }
};
(function () {
  const css = `
  #somBtn { position: fixed; top: max(14px, env(safe-area-inset-top, 0px)); right: 214px; z-index: 36; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--bronze); background: rgba(18,14,11,.88); color: var(--bronze2); display: grid; place-items: center; cursor: pointer; box-shadow: 0 2px 12px #000; padding: 0; }
  #somBtn:hover { filter: brightness(1.25); } #somBtn:focus-visible { outline: 2px solid var(--bronze2); outline-offset: 2px; }
  body.semHud #somBtn { right: 14px; }
  #somPainel { position: fixed; top: calc(max(14px, env(safe-area-inset-top, 0px)) + 48px); right: 214px; z-index: 36; width: 300px; max-width: calc(100vw - 28px); background: linear-gradient(var(--painel), #0f0c0a); border: 2px solid var(--borda); border-radius: 4px; padding: 12px 14px; box-shadow: 0 10px 40px #000; }
  body.semHud #somPainel { right: 14px; }
  .somLinha { display: grid; grid-template-columns: 62px 44px 1fr 30px; align-items: center; gap: 8px; margin: 6px 0; }
  .somRot { font-family: var(--f-titulo); font-weight: 700; color: var(--bronze2); font-size: 13px; }
  .somTog { width: 42px; height: 22px; border-radius: 11px; border: 1px solid var(--borda); background: #2a2018; position: relative; cursor: pointer; padding: 0; }
  .somTog span { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #8a7a68; transition: left .15s, background .15s; }
  .somTog.on { background: #4a3a20; border-color: var(--bronze); } .somTog.on span { left: 22px; background: #ffd27a; }
  .somTog:focus-visible { outline: 2px solid var(--bronze2); outline-offset: 2px; }
  .somLinha input[type=range] { width: 100%; accent-color: #d8a858; }
  .somLinha input[type=range]:disabled { opacity: .35; }
  .somVal { font-size: 12px; color: var(--texto2); text-align: right; font-variant-numeric: tabular-nums; }
  .somCred { font-size: 11px; color: var(--texto2); margin-top: 6px; }
  #somMenu { margin: 10px 0 4px; padding: 8px 10px; border: 1px solid var(--borda); border-radius: 4px; background: rgba(12,10,8,.6); }
  @media (max-width: 760px) { #somBtn, #somPainel { right: 14px; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const b = document.createElement('button'); b.id = 'somBtn'; b.type = 'button'; b.title = 'Som e música'; b.setAttribute('aria-label', 'Som e música'); b.setAttribute('aria-expanded', 'false'); b.innerHTML = SOM.icone();
  const p = document.createElement('div'); p.id = 'somPainel'; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Som e música');
  document.body.appendChild(b); document.body.appendChild(p);
  b.addEventListener('click', (e) => { e.stopPropagation(); SOM.iniciar(); p.hidden = !p.hidden; b.setAttribute('aria-expanded', String(!p.hidden)); if (!p.hidden) SOM.montarControles(p); });
  document.addEventListener('pointerdown', (e) => { if (!p.hidden && !p.contains(e.target) && e.target !== b && !b.contains(e.target)) { p.hidden = true; b.setAttribute('aria-expanded', 'false'); } });
  // seção no Menu (Esc)
  const menu = document.querySelector('#modalMenu .corpo');
  if (menu) { const h = document.createElement('div'); h.innerHTML = '<div class="sSub" style="font-family:var(--f-titulo);color:var(--bronze);font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-top:12px">Som</div><div id="somMenu"></div>'; menu.insertBefore(h, menu.children[1] || null); SOM.montarControles(document.getElementById('somMenu')); }
  // nas telas iniciais, o minimapa não existe: botão vai para o canto
  setInterval(() => { document.body.classList.toggle('semHud', J.estado === 'menu' || !J.z); }, 400);
})();
