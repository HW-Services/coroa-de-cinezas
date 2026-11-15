// ============================================================
//  Monstros compartilhados entre os jogadores da mesma área.
//
//  * Os monstros de cada área nascem iguais para todos (sorteio com
//    semente fixa) e recebem um número (nid).
//  * O ANFITRIÃO (quem entrou primeiro na área) comanda a IA: decide
//    movimento e ataques e transmite posições e vida.
//  * Os outros jogadores veem "marionetes": seguem o anfitrião, mas
//    calculam localmente o dano que causam (enviado ao anfitrião) e
//    os golpes que recebem.
//  * A morte é decidida pelo anfitrião; cada jogador por perto ganha
//    a sua experiência e o seu próprio saque.
//  * Se o anfitrião sair, o próximo da fila assume sem interrupção.
// ============================================================
'use strict';

const COOP = {
  pronto: false, souHost: false, hostChave: null, tEntrada: 0, sala: null,
  pendente: new Map(), remotos: new Map(), mortosRecentes: [], ultimoSnap: 0, ultimoDano: 0, pediuEstado: 0,
  _gerando: false, _sync: false, _permitir: false, _semRecompensa: false,
};
window.COOP = COOP;

const SEM_RECOMPENSA_DIST = 55;
const hashTexto = (t) => [...String(t)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 2166136261) >>> 0;
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

COOP.ativo = () => !!(window.MP && MP.ativo && MP.sala && COOP.sala === MP.sala && COOP.pronto);
COOP.minhaChave = () => (window.REDE && REDE.perfil ? REDE.perfil.id + ':' + MP.tab : 'eu');
COOP.porNid = (n) => { for (const e of J.inimigos) if (e.nid === n) return e; return null; };

// ------------------------------------------------------------
// Nascimento igual para todos
// ------------------------------------------------------------
(function () {
  const ger0 = J.gerarInimigos;
  J.gerarInimigos = function () {
    COOP._gerando = true;
    try { J.comSemente(hashTexto('inimigos:' + J.z.def.id), () => ger0()); }
    finally { COOP._gerando = false; }
    J.inimigos.forEach((e, i) => { e.nid = i + 1; });
  };
  // guardiões de missão: cada jogador tem os seus (não compartilhados)
  const mz0 = J.montarZona;
  J.montarZona = function (def) { COOP._gerando = true; try { return mz0(def); } finally { COOP._gerando = false; } };
  // mapas: mesmos modificadores para todos no mesmo nível
  const dm0 = J.defMapa;
  J.defMapa = function (tier) { return J.comSemente(hashTexto('mapa:' + tier), () => dm0(tier)); };

  // monstros criados durante o jogo (divisão, invocações do chefe)
  const cri0 = J.criarInimigo;
  J.criarInimigo = function (tipo, x, z, nivel, rar, extra) {
    const e = cri0(tipo, x, z, nivel, rar, extra);
    if (!COOP._gerando && !COOP._sync && COOP.ativo() && COOP.souHost) {
      e.nid = 100000 + Math.floor(Math.random() * 1e9);
      e.criacao = { tp: tipo, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, nv: nivel, r: rar || 'normal', ex: extra || {} };
      setTimeout(() => { if (!e.morto) COOP.enviar('n', { n: e.nid, c: e.criacao, at: e.estado === 'ativo' ? 1 : 0 }); }, 0);
    }
    return e;
  };

  // morte: só o anfitrião decide nos monstros compartilhados
  const mat0 = J.matarInimigo;
  J.matarInimigo = function (e) {
    if (e.morto) return;
    const comp = e.nid != null && COOP.ativo();
    if (comp && !COOP.souHost && !COOP._permitir) { e.vida = Math.max(e.vida, e.vidaMax * 0.01); return; }
    if (comp && !COOP.souHost) e.pequeno = true;  // filhotes da divisão chegam pelo anfitrião
    const longe = comp && (J.estado !== 'jogando' || dist2(e, J.jog) > SEM_RECOMPENSA_DIST);
    COOP._semRecompensa = longe;
    try { mat0(e); } finally { COOP._semRecompensa = false; }
    if (comp && COOP.souHost) { COOP.enviar('m', { n: e.nid }); COOP.mortosRecentes.push({ n: e.nid, t: performance.now() }); }
  };
  const xp0 = J.ganharXP; J.ganharXP = function (q) { if (!COOP._semRecompensa) xp0(q); };
  const saq0 = J.gerarSaque; J.gerarSaque = function (e) { if (!COOP._semRecompensa) saq0(e); };

  // dano causado por quem não é anfitrião: aplica na hora (resposta
  // imediata) e envia ao anfitrião, que tem a palavra final
  const ac0 = J.acertarInimigo;
  J.acertarInimigo = function (e, mult, sk, o) {
    if (!e.marionete) return ac0(e, mult, sk, o);
    const l0 = e.lentoF;
    const d = ac0(e, mult, sk, o);
    if (d > 0) COOP.danoRemoto(e, d, e.lentoF > l0 ? e.lentoF : 0);
    return d;
  };
  J.aoDanoMarionete = (e, d) => COOP.danoRemoto(e, d, 0);

  // início de ataque: o anfitrião transmite
  J.aoIniciarAtq = function (e, atq, alvo) {
    if (e.nid == null || !COOP.souHost || !COOP.ativo() || e.marionete) return;
    const a = { dur: atq.dur, golpe: atq.golpe, tipo: atq.tipo };
    if (atq.salto) { a.salto = 1; a.px = Math.round(atq.para.x * 10) / 10; a.pz = Math.round(atq.para.z * 10) / 10; }
    atq.alvoRef = alvo && alvo.remoto ? alvo.remoto : COOP.minhaChave();
    COOP.enviar('a', { n: e.nid, a, k: atq.alvoRef });
  };
  J.aoHabChefe = function (e, h, s) {
    if (e.nid == null || !COOP.souHost || !COOP.ativo() || e.marionete) return;
    const alvo = J.alvoChefe(e);
    e.boss.alvoRef = alvo.remoto || COOP.minhaChave();
    COOP.enviar('h', { n: e.nid, h, s, k: e.boss.alvoRef, x: Math.round(e.x * 10) / 10, z: Math.round(e.z * 10) / 10 });
  };

  // alvos: outros jogadores da área
  J.resolverAlvo = function (k) {
    if (k === COOP.minhaChave()) return J.jog;
    return COOP.remotos.get(k) || null;
  };
  J.distOutros = function (e) {
    let m = 1e9; if (!COOP.ativo() || !COOP.souHost) return m;
    for (const r of COOP.remotos.values()) { const d = dist2(e, r); if (d < m) m = d; }
    return m;
  };
  J.simularSempre = () => COOP.ativo() && COOP.souHost && COOP.remotos.size > 0;
  J.moverMarionete = function (e, dt) {
    if (e.sx == null) return 0;
    const k = 1 - Math.exp(-dt * 10);
    const dx = e.sx - e.x, dz = e.sz - e.z;
    if (Math.hypot(dx, dz) > 8) { e.x = e.sx; e.z = e.sz; } else { e.x += dx * k; e.z += dz * k; }
    e.ang += angDif(e.sa, e.ang) * k;
    e.fase += dt * e.vel * 1.6 * (e.smov || 0);
    return e.smov || 0;
  };
})();

// ------------------------------------------------------------
// Papéis: quem é o anfitrião
// ------------------------------------------------------------
COOP.novaSala = function (ch) {
  COOP.sala = ch; COOP.pronto = false; COOP.souHost = false; COOP.hostChave = null;
  COOP.tEntrada = Date.now(); COOP.pendente.clear(); COOP.remotos.clear(); COOP.mortosRecentes = [];
  COOP.aplicarPapel();
};
COOP.aoPresenca = function (ch, estado) {
  if (ch !== MP.sala) return;
  COOP.sala = ch;
  const lista = [];
  for (const metas of Object.values(estado || {})) for (const m of metas || []) if (m && m.k) lista.push({ k: String(m.k), t: num(m.t, 9e15) });
  const eu = COOP.minhaChave();
  if (!lista.some(x => x.k === eu)) return;   // ainda não apareço na presença
  lista.sort((a, b) => a.t - b.t || (a.k < b.k ? -1 : 1));
  const host = lista[0].k;
  const eraHost = COOP.souHost, eraPronto = COOP.pronto;
  COOP.pronto = true; COOP.hostChave = host; COOP.souHost = host === eu;
  if (!COOP.souHost && (!eraPronto || eraHost)) COOP.pedirEstado();
  if (COOP.souHost && !eraHost && eraPronto) MP.registrar('Você agora comanda os monstros desta área.', '#a89880');
  COOP.aplicarPapel();
};
COOP.aplicarPapel = function () {
  const marionete = COOP.ativo() && !COOP.souHost;
  for (const e of J.inimigos) if (e.nid != null) {
    if (e.marionete && !marionete) { e.sx = null; }
    e.marionete = marionete;
  }
};
COOP.pedirEstado = function () { COOP.pediuEstado = performance.now(); COOP.enviar('q', {}); };

// ------------------------------------------------------------
// Envio e recepção
// ------------------------------------------------------------
COOP.enviar = function (t, dados) {
  if (!MP.sala || !MP.ativo) return;
  dados.t = t; dados.k0 = COOP.minhaChave();
  MP.sala.send({ type: 'broadcast', event: 'co', payload: dados }).catch(() => {});
};
COOP.danoRemoto = function (e, d, lento) {
  const p = COOP.pendente.get(e.nid) || { d: 0, l: 0 };
  p.d += d; if (lento) p.l = Math.max(p.l, lento);
  e.tGolpeLocal = performance.now();
  COOP.pendente.set(e.nid, p);
};
COOP.receber = function (m) {
  if (!m || typeof m.t !== 'string' || !J.z || !J.mundo) return;
  if (m.k0 === COOP.minhaChave()) return;
  const deHost = m.k0 === COOP.hostChave;
  switch (m.t) {
    case 'q': if (COOP.souHost) COOP.enviarEstado(); break;
    case 'E': if (deHost && !COOP.souHost) COOP.aplicarEstado(m); break;
    case 's': if (deHost && !COOP.souHost) COOP.aplicarSnap(m); break;
    case 'd': if (COOP.souHost && Array.isArray(m.d)) for (const x of m.d) COOP.aplicarDano(x); break;
    case 'm': if (deHost && !COOP.souHost) COOP.morte(num(m.n, -1)); break;
    case 'n': if (deHost && !COOP.souHost) COOP.nascer(m); break;
    case 'a': if (deHost && !COOP.souHost) COOP.ataque(m); break;
    case 'h': if (deHost && !COOP.souHost) COOP.habChefe(m); break;
  }
};

// estado completo (para quem acabou de chegar)
COOP.enviarEstado = function () {
  const lista = [];
  for (const e of J.inimigos) {
    if (e.nid == null || e.morto) continue;
    const l = [e.nid, Math.round(e.x * 10), Math.round(e.z * 10), Math.round(e.ang * 100), Math.round(e.vida), e.estado === 'ativo' ? 1 : 0];
    if (e.criacao) l.push(e.criacao);
    lista.push(l);
  }
  COOP.enviar('E', { e: lista, ab: J.z.saidaAberta ? 1 : 0 });
};
COOP.aplicarEstado = function (m) {
  if (!Array.isArray(m.e)) return;
  const vivos = new Set();
  for (const l of m.e) {
    if (!Array.isArray(l)) continue;
    const n = num(l[0], -1); vivos.add(n);
    let e = COOP.porNid(n);
    if (!e && l[6] && typeof l[6] === 'object') e = COOP.nascer({ n, c: l[6], at: l[5] });
    if (!e) continue;
    COOP.posicionar(e, l, true);
  }
  // os que já morreram para o anfitrião somem sem recompensa
  for (const e of J.inimigos) if (e.nid != null && !e.morto && !vivos.has(e.nid)) {
    e.morto = true; e.mortoT = 3.3; if (e.boss) UI.esconderChefe();
    J.z.mortos++;
  }
  if (m.ab && !J.z.saidaAberta) J.abrirPortal();
  COOP.aplicarPapel();
};
COOP.posicionar = function (e, l, salto) {
  const x = num(l[1], e.x * 10) / 10, z = num(l[2], e.z * 10) / 10;
  if (Math.abs(x) > 400 || Math.abs(z) > 400) return;
  e.sx = x; e.sz = z; e.sa = num(l[3], e.ang * 100) / 100; e.smov = l[6] === 1 ? 1 : 0;
  if (salto) { e.x = x; e.z = z; e.ang = e.sa; }
  const v = Math.max(1, Math.min(e.vidaMax, num(l[4], e.vida)));
  // mantém a previsão local por um instante depois de um golpe nosso
  if (v < e.vida || performance.now() - (e.tGolpeLocal || 0) > 700) e.vida = v;
  if (l[5] === 1 && e.estado === 'dormindo') { e.estado = 'ativo'; if (e.boss) UI.mostrarChefe(e); }
  else if (salto && l[5] === 0 && e.estado === 'ativo') e.estado = 'dormindo';
};
COOP.aplicarSnap = function (m) {
  if (Array.isArray(m.e)) for (const l of m.e) { if (!Array.isArray(l)) continue; const e = COOP.porNid(num(l[0], -1)); if (e && !e.morto) COOP.posicionar(e, l, false); }
  if (Array.isArray(m.k)) for (const n of m.k) COOP.morte(num(n, -1));
};
COOP.aplicarDano = function (x) {
  if (!Array.isArray(x)) return;
  const e = COOP.porNid(num(x[0], -1)); if (!e || e.morto) return;
  const d = Math.max(0, Math.min(num(x[1], 0), e.vidaMax * 3));
  if (e.boss && e.boss.invulnT > 0) return;
  e.vida -= d; e.flash = 1;
  if (e.estado === 'dormindo') J.acordar(e);
  const l = num(x[2], 0); if (l > 0) { e.lentoT = 2.5; e.lentoF = Math.max(e.lentoF, Math.min(0.8, l)); }
  if (e.vida <= 0) J.matarInimigo(e);
};
COOP.morte = function (n) {
  const e = COOP.porNid(n); if (!e || e.morto) return;
  COOP._permitir = true;
  try { e.vida = 0; J.matarInimigo(e); } finally { COOP._permitir = false; }
};
COOP.nascer = function (m) {
  const c = m.c; if (!c || !INIMIGOS[c.tp] || COOP.porNid(num(m.n, -1))) return null;
  COOP._sync = true;
  let e;
  try { e = J.criarInimigo(c.tp, num(c.x, 0), num(c.z, 0), num(c.nv, J.z.nivel), ['normal', 'magico', 'raro'].includes(c.r) ? c.r : 'normal', { escala: num(c.ex && c.ex.escala, 1), vida: num(c.ex && c.ex.vida, 1), pequeno: !!(c.ex && c.ex.pequeno), invocado: !!(c.ex && c.ex.invocado) }); }
  finally { COOP._sync = false; }
  e.nid = m.n; e.criacao = c; e.marionete = true;
  if (m.at) { e.estado = 'ativo'; e.m.raiz.visible = true; }
  return e;
};
COOP.ataque = function (m) {
  const e = COOP.porNid(num(m.n, -1)); if (!e || e.morto || !m.a) return;
  const a = m.a;
  const atq = { t: 0, dur: Math.max(0.2, Math.min(3, num(a.dur, 0.8))), golpe: Math.max(0.1, Math.min(1, num(a.golpe, 0.6))), tipo: String(a.tipo || 'golpe').slice(0, 12), alvoRef: String(m.k || '') };
  if (a.salto) { atq.salto = true; atq.para = { x: num(a.px, e.x), z: num(a.pz, e.z) }; }
  if (e.estado === 'dormindo') e.estado = 'ativo';
  J.iniciarAtq(e, atq, null);
};
COOP.habChefe = function (m) {
  const e = COOP.porNid(num(m.n, -1)); if (!e || e.morto || !e.boss) return;
  const H = ['basico', 'golpeArea', 'radial', 'investida', 'nova', 'chuva', 'invocar'];
  if (!H.includes(m.h)) return;
  e.boss.alvoRef = String(m.k || '');
  if (typeof m.x === 'number') { e.x = m.x; e.z = num(m.z, e.z); }
  if (e.estado === 'dormindo') { e.estado = 'ativo'; UI.mostrarChefe(e); }
  J.comSemente(num(m.s, 1) >>> 0, () => J.habChefe(e, m.h));
};

// ------------------------------------------------------------
// Por quadro
// ------------------------------------------------------------
COOP.atualizar = function () {
  // jogadores remotos como alvos
  COOP.remotos.clear();
  if (window.MP && MP.outros) for (const o of MP.outros.values()) if (o.s && !o.s.d) COOP.remotos.set(o.chave, { x: o.x, z: o.z, raio: 0.4, remoto: o.chave });
  const ativo = COOP.ativo();
  J.alvosExtras = ativo && COOP.souHost && COOP.remotos.size ? [...COOP.remotos.values()] : null;
  COOP.aplicarPapel();
  if (!ativo) return;
  const agora = performance.now();
  if (!COOP.souHost) {
    if (COOP.pendente.size && agora - COOP.ultimoDano > 150) {
      COOP.ultimoDano = agora;
      const d = []; for (const [n, p] of COOP.pendente) d.push([n, Math.round(p.d * 10) / 10, Math.round(p.l * 100) / 100]);
      COOP.pendente.clear(); COOP.enviar('d', { d });
    }
    return;
  }
  // anfitrião: fotos periódicas dos monstros acordados
  if (!COOP.remotos.size || agora - COOP.ultimoSnap < 200) return;
  COOP.ultimoSnap = agora;
  COOP.mortosRecentes = COOP.mortosRecentes.filter(x => agora - x.t < 3000);
  const lista = [];
  for (const e of J.inimigos) {
    if (e.nid == null || e.morto || e.estado !== 'ativo') continue;
    const l = [e.nid, Math.round(e.x * 10), Math.round(e.z * 10), Math.round(e.ang * 100), Math.round(e.vida), 1, (e.mov || 0) > 0.3 ? 1 : 0];
    const k = l.join(','); if (k === e._ultSnap && agora - (e._tSnap || 0) < 1500) continue;
    e._ultSnap = k; e._tSnap = agora; lista.push(l);
  }
  if (lista.length || COOP.mortosRecentes.length) COOP.enviar('s', { e: lista, k: COOP.mortosRecentes.map(x => x.n) });
};

(function () {
  const at0 = J.atualizar;
  J.atualizar = function (dt) { try { COOP.atualizar(); } catch (e) { console.error(e); } at0(dt); };
})();
