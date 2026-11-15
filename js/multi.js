// ============================================================
//  Multijogador: ver outros jogadores na mesma área, lista de
//  quem está online no servidor, bate-papo e viagem até um amigo.
//  Usa o Supabase Realtime:
//   * canal "lobby:<servidor>"  -> presença de todos os conectados
//   * canal "area:<servidor>:<área>" -> posições e bate-papo local
// ============================================================
'use strict';

const MP = { lobby: null, sala: null, nomeSala: null, outros: new Map(), log: [], ativo: false, tab: Math.random().toString(36).slice(2, 8), ultimoEnvio: 0, ultimoBeat: 0 };
window.MP = MP;

const limparTexto = (t, max) => String(t == null ? '' : t).split('').filter(ch => { const c = ch.charCodeAt(0); return !(c < 32 || c === 127 || (c >= 0x200b && c <= 0x200f) || (c >= 0x2028 && c <= 0x202e) || (c >= 0x2060 && c <= 0x206f)); }).join('').trim().slice(0, max);

MP.status = function (t) { const e = document.getElementById('mpStatus'); if (e) { e.textContent = t; e.hidden = !t; } };

// chamado pela rede depois do login, quando o personagem entra no jogo
MP.conectar = function () {
  if (MP.lobby || !window.REDE || !REDE.ativo || !REDE.perfil) { if (!window.REDE || !REDE.ativo) MP.status('Modo solo (sem servidor configurado).'); return; }
  const sb = REDE.sb;
  MP.lobby = sb.channel('lobby:' + REDE.servidor, { config: { presence: { key: REDE.perfil.id } } });
  MP.lobby.on('presence', { event: 'sync' }, () => { MP.desenharLista(); if (REDE.aoMudarOnline) REDE.aoMudarOnline(); })
    .subscribe((st) => {
      if (st === 'SUBSCRIBED') { MP.ativo = true; MP._lob = null; MP.status(''); MP.enviar(true); if (J.z) { MP.nomeSala = null; MP.trocarArea(J.z.def.id); } }
      else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') MP.status('Reconectando ao servidor…');
      else if (st === 'CLOSED') MP.ativo = false;
    });
  if (!MP._iv) MP._iv = setInterval(MP.enviar, 150);
};

// todos os conectados ao servidor: uid -> dados
MP.online = function () {
  const r = new Map(); if (!MP.lobby) return r;
  const st = MP.lobby.presenceState();
  for (const [k, metas] of Object.entries(st)) { const m = metas && metas[metas.length - 1]; if (m && m.n) r.set(k, m); }
  return r;
};

// entra no canal da área atual (cada área tem o seu)
MP.trocarArea = function (areaId) {
  if (!MP.ativo) return;
  const nome = ('area:' + REDE.servidor + ':' + String(areaId)).toLowerCase().replace(/[^a-z0-9_:.-]/g, '');
  if (MP.nomeSala === nome) return;
  if (MP.sala) { try { REDE.sb.removeChannel(MP.sala); } catch (e) { } }
  MP.limparAvatares();
  MP.nomeSala = nome;
  const ch = REDE.sb.channel(nome, { config: { broadcast: { self: false }, presence: { key: REDE.perfil.id + ':' + MP.tab } } });
  ch.on('broadcast', { event: 'e' }, ({ payload }) => MP.receber(payload))
    .on('broadcast', { event: 'chat' }, ({ payload }) => MP.receberChat(payload))
    .on('presence', { event: 'leave' }, ({ key }) => MP.saiu(key))
    .subscribe((st) => { if (st === 'SUBSCRIBED' && MP.sala === ch) { ch.track({ u: REDE.perfil.id }).catch(() => {}); MP.enviar(true); } });
  MP.sala = ch;
};

MP.estadoLocal = function () {
  const jg = J.jog, p = J.pers; if (!jg || !p || !J.z) return null;
  const c = jg.cast;
  return {
    k0: REDE.perfil.id + ':' + MP.tab, u: REDE.perfil.id, ap: REDE.perfil.apelido, tg: REDE.tagCla ? REDE.tagCla() : '',
    n: String(p.nome || CLASSES[p.classe].nome).slice(0, 18), c: p.classe, l: p.nivel, asc: p.asc || '',
    x: Math.round(jg.x * 10) / 10, z: Math.round(jg.z * 10) / 10, a: Math.round(jg.ang * 100) / 100,
    m: Math.round((jg.andar || 0) * 10) / 10, k: c ? Math.round(c.t / c.dur * 100) / 100 : -1, t: c ? c.anim : '', s: c ? c.sk.id : '',
    tx: c ? Math.round(c.alvo.x * 10) / 10 : 0, tz: c ? Math.round(c.alvo.z * 10) / 10 : 0,
    r: jg.rolar ? Math.round(jg.rolar.t / jg.rolar.dur * 100) / 100 : -1, d: J.estado === 'morto' ? 1 : 0,
    v: Math.round(Math.max(0, jg.vida) / (J.st ? J.st.vidaMax : 1) * 100),
  };
};
MP.enviar = function (forcar) {
  if (!MP.ativo || !J.pers || J.estado === 'menu' || !J.z) return;
  const agora = performance.now();
  // presença no servidor: quem é e onde está
  const lob = { n: String(J.pers.nome).slice(0, 18), c: J.pers.classe, l: J.pers.nivel, ap: REDE.perfil.apelido, tg: REDE.tagCla ? REDE.tagCla() : '', area: String(J.z.def.id), an: String(J.z.def.nome).slice(0, 40) };
  const kl = JSON.stringify(lob); if (kl !== MP._lob) { MP._lob = kl; MP.lobby.track(lob).catch(() => {}); }
  if (!MP.sala) return;
  const e = MP.estadoLocal(); if (!e) return;
  const ks = JSON.stringify(e);
  // envia quando algo muda (até ~7 vezes por segundo) e um sinal a cada 2 s
  if ((ks !== MP._sala && agora - MP.ultimoEnvio > 140) || forcar || agora - MP.ultimoBeat > 2000) {
    MP._sala = ks; MP.ultimoEnvio = MP.ultimoBeat = agora;
    MP.sala.send({ type: 'broadcast', event: 'e', payload: e }).catch(() => {});
  }
};

// ------------------------------------------------------------
// Avatares dos outros jogadores
// ------------------------------------------------------------
MP.receber = function (s) {
  if (!s || typeof s.x !== 'number' || typeof s.z !== 'number' || !CLASSES[s.c] || !s.k0 || !J.mundo) return;
  const chave = String(s.k0).slice(0, 60);
  if (chave === REDE.perfil.id + ':' + MP.tab) return;
  s.n = limparTexto(s.n, 18) || 'Aventureiro'; s.ap = limparTexto(s.ap, 16); s.tg = limparTexto(s.tg, 5);
  let o = MP.outros.get(chave);
  if (!o || o.classe !== s.c) {
    if (o) MP.removerAvatar(o);
    const m = MOD.jogador(s.c);
    if (m.anel) m.anel.material = new THREE.MeshBasicMaterial({ color: 0x70b0ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
    ENG.scene.add(m.raiz);
    o = { chave, classe: s.c, m, x: s.x, z: s.z, ang: s.a || 0, fase: 0, t: 0, kAnt: -1, bolha: null };
    MP.outros.set(chave, o);
    MP.registrar(`${s.n} entrou na área.`, '#9cc8ff');
  }
  o.s = s; o.visto = performance.now();
  if (s.k >= 0 && (o.kAnt < 0 || s.k < o.kAnt - 0.3) && s.s && HABILIDADES[s.s]) MP.efeitoRemoto(o, s);
  o.kAnt = s.k;
};
MP.saiu = function (chave) {
  const o = MP.outros.get(chave); if (!o) return;
  MP.registrar(`${o.s ? o.s.n : 'Alguém'} saiu da área.`, '#8a8070'); MP.removerAvatar(o); MP.outros.delete(chave);
};
MP.receberChat = function (p) {
  if (!p) return;
  const txt = limparTexto(p.t, 120), n = limparTexto(p.n, 18) || 'Alguém'; if (!txt) return;
  const o = MP.outros.get(String(p.k0 || ''));
  if (o) o.bolha = { txt, t: J.tempo };
  MP.registrar(`${n}: ${txt}`, '#e8e0d0');
};

MP.removerAvatar = function (o) { ENG.scene.remove(o.m.raiz); MOD.descartar(o.m); };
MP.limparAvatares = function () { for (const o of MP.outros.values()) MP.removerAvatar(o); MP.outros.clear(); };

MP.atualizar = function (dt) {
  if (!MP.outros.size || !J.mundo) return;
  const agora = performance.now();
  for (const o of MP.outros.values()) {
    const s = o.s; if (!s) continue;
    if (agora - o.visto > 9000) { MP.saiu(o.chave); continue; }
    o.t += dt;
    const k = 1 - Math.exp(-dt * 12);
    const dx = s.x - o.x, dz = s.z - o.z;
    if (Math.hypot(dx, dz) > 12) { o.x = s.x; o.z = s.z; } else { o.x += dx * k; o.z += dz * k; }
    o.ang += angDif(s.a, o.ang) * k;
    const y = J.mundo.h(o.x, o.z);
    o.m.raiz.position.set(o.x, y, o.z); o.m.raiz.rotation.y = o.ang;
    o.fase += dt * 7.2 * 1.5 * (s.m || 0);
    o.m.morto = !!s.d;
    MOD.animar(o.m, { andar: s.m || 0, fase: o.fase, t: o.t, atq: s.k >= 0 ? s.k : null, tipoAtq: s.t || null, rolar: s.r >= 0 ? s.r : null });
    o.y = y;
  }
};

// efeitos cosméticos das habilidades dos outros
MP.efeitoRemoto = function (o, s) {
  const h = HABILIDADES[s.s]; const y = J.mundo.h(o.x, o.z);
  const ang = Math.atan2(s.tx - o.x, s.tz - o.z);
  setTimeout(() => {
    if (!J.mundo) return;
    switch (h.tipo) {
      case 'golpe': VFX.corte(o.x, y, o.z, Math.atan2(Math.cos(ang), Math.sin(ang)), h.alcance || 3, h.arco || 100, h.cor); break;
      case 'projetil': case 'radial': {
        const n = Math.min(h.qtd || 1, 9);
        for (let i = 0; i < n; i++) {
          const a = h.tipo === 'radial' ? ang + i / n * Math.PI * 2 : n > 1 ? ang + (i / (n - 1) - 0.5) * (h.spread || 10) * Math.PI / 180 : ang;
          const g = VFX.projetil(h.modelo, h.cor, { elem: h.elem });
          g.position.set(o.x, y + 1.2, o.z); g.rotation.y = a; ENG.scene.add(g);
          const dur = Math.min(2.5, (h.alcance || 20) / (h.vel || 30));
          VFX.efeito(g, dur, (kk, dt) => { g.position.x += Math.sin(a) * (h.vel || 30) * dt; g.position.z += Math.cos(a) * (h.vel || 30) * dt; g.position.y = J.mundo.h(g.position.x, g.position.z) + 1.1; const vv = g.userData.vfx; if (vv && vv.upd) vv.upd({ x: g.position.x, y: g.position.y, z: g.position.z }, dt, g.position.y - 1.1); }, () => { if (g.userData.vfx && g.userData.vfx.seg) g.userData.vfx.seg.ativo = false; });
        }
        break;
      }
      case 'nova': VFX.choque(o.x, y, o.z, h.raio || 5, h.cor); break;
      case 'area': case 'chuva': if (h.meteoro || h.armadilha) VFX.explosao(s.tx, J.mundo.h(s.tx, s.tz) + 0.6, s.tz, h.raio || 4, h.elem === 'fisico' ? 'fogo' : h.elem, h.cor); else VFX.choque(s.tx, J.mundo.h(s.tx, s.tz), s.tz, h.raio || 4, h.cor); break;
      case 'buff': VFX.coluna(o.x, y, o.z, h.cor, 6, 1.1, 0.7); break;
      case 'teleporte': case 'salto': case 'investida': VFX.coluna(o.x, y, o.z, h.cor, 5, 0.8, 0.4); break;
      case 'corrente': VFX.relampago(new THREE.Vector3(o.x, y + 1.3, o.z), new THREE.Vector3(s.tx, J.mundo.h(s.tx, s.tz) + 1, s.tz), h.cor); break;
      case 'invocar': VFX.circulo(o.x + 2, o.z, 1.6, h.cor, 1.2); break;
    }
  }, Math.max(0, (h.tempo || 0.4) * 0.45 * 1000));
};

// ------------------------------------------------------------
// Bate-papo, lista de jogadores e rótulos
// ------------------------------------------------------------
MP.registrar = function (txt, cor) {
  MP.log.push({ txt, cor, t: Date.now() }); if (MP.log.length > 40) MP.log.shift();
  const el = document.getElementById('mpChat'); if (!el) return;
  el.innerHTML = MP.log.slice(-7).map(l => `<div style="color:${l.cor}">${esc(l.txt)}</div>`).join('');
};
MP.falar = function (txt) {
  txt = limparTexto(txt, 120); if (!txt) return;
  if (txt.startsWith('/c ') && REDE.cla) { REDE.enviarMsgCla(txt.slice(3)); return; }
  MP.registrar(`${J.pers.nome || 'Você'} (você): ${txt}`, '#ffe2a8');
  MP.minhaBolha = { txt, t: J.tempo };
  if (MP.sala) MP.sala.send({ type: 'broadcast', event: 'chat', payload: { k0: REDE.perfil.id + ':' + MP.tab, n: J.pers.nome, t: txt } }).catch(() => {});
};
MP.desenharLista = function () {
  const el = document.getElementById('mpLista'); if (!el) return;
  if (!MP.lobby || J.estado === 'menu') { el.innerHTML = ''; return; }
  const on = MP.online(); const eu = REDE.perfil.id;
  const amigos = new Set((REDE.amigos || []).map(a => a.id));
  const lista = [...on.entries()].sort((a, b) => (b[0] === eu) - (a[0] === eu) || amigos.has(b[0]) - amigos.has(a[0]));
  const linhas = lista.slice(0, 8).map(([uid, s]) => {
    const souEu = uid === eu, amigo = amigos.has(uid);
    const podeIr = !souEu && MP.podeIrPara(s.area);
    const tag = s.tg ? `[${esc(limparTexto(s.tg, 5))}] ` : '';
    return `<div class="mpL${souEu ? ' eu' : ''}${amigo ? ' amigo' : ''}"><span class="pt"></span><span class="nm">${tag}${esc(limparTexto(s.n, 18))}${souEu ? ' (você)' : ''}</span><span class="ar">${esc(limparTexto(s.ap, 16))} · ${esc(CLASSES[s.c] ? CLASSES[s.c].nome : '')} nv ${Number(s.l) || 1} · ${esc(limparTexto(s.an, 40))}</span><span class="bt">${podeIr ? `<button class="mpIr" data-area="${esc(String(s.area))}">Ir</button>` : ''}${!souEu ? `<button class="mpIr" data-negociar="${esc(limparTexto(s.ap, 16))}" title="Negociar">⇄</button>` : ''}</span></div>`;
  });
  el.innerHTML = `<div class="mpT">Online no servidor · ${on.size}</div>` + linhas.join('') + (on.size > 8 ? `<div class="mpT" style="font-size:11px">+${on.size - 8} no painel Social (O)</div>` : '');
  el.querySelectorAll('[data-area]').forEach(b => b.addEventListener('click', () => MP.irPara(b.dataset.area)));
  el.querySelectorAll('[data-negociar]').forEach(b => b.addEventListener('click', () => REDE.abrirTroca(b.dataset.negociar)));
};
MP.podeIrPara = function (area) {
  if (!J.pers || !area || !TODAS_AREAS[area] || (J.z && J.z.def.id === area)) return false;
  return (J.pers.waypoints || []).includes(area);
};
MP.irPara = function (area) {
  if (!MP.podeIrPara(area) || J.estado !== 'jogando') { UI.aviso('Ative a Pedra de Passagem dessa área para viajar até lá', '#ff9080'); return; }
  J.entrarArea(area, 'passagem');
};
MP.desenharRotulos = function (g) {
  if (!MP.outros.size && !MP.minhaBolha) return;
  const v = new THREE.Vector3(), o2 = {};
  const bolha = (x, y, txt) => {
    g.font = '600 13px "Alegreya Sans", sans-serif'; const w = Math.min(260, g.measureText(txt).width + 16);
    g.fillStyle = 'rgba(12,10,8,.88)'; g.strokeStyle = 'rgba(201,160,99,.8)'; g.lineWidth = 1;
    g.fillRect(x - w / 2, y - 24, w, 20); g.strokeRect(x - w / 2 + 0.5, y - 23.5, w - 1, 19);
    g.fillStyle = '#f0e6d4'; g.textAlign = 'center'; g.fillText(txt.length > 40 ? txt.slice(0, 38) + '…' : txt, x, y - 10);
  };
  for (const o of MP.outros.values()) {
    if (!o.s) continue;
    v.set(o.x, (o.y || 0) + 2.5, o.z); ENG.paraTela(v, o2); if (o2.z > 1) continue;
    g.textAlign = 'center'; g.font = '700 14px "Alegreya Sans", sans-serif'; g.lineWidth = 3; g.strokeStyle = '#000'; g.fillStyle = '#9cc8ff';
    const nome = `${o.s.tg ? '[' + o.s.tg + '] ' : ''}${o.s.n} · nv ${Number(o.s.l) || 1}`; g.strokeText(nome, o2.x, o2.y); g.fillText(nome, o2.x, o2.y);
    g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(o2.x - 22, o2.y + 4, 44, 5); g.fillStyle = '#d03a2a'; g.fillRect(o2.x - 21, o2.y + 5, 42 * Math.max(0, Math.min(1, (o.s.v || 0) / 100)), 3);
    if (o.bolha && J.tempo - o.bolha.t < 6) bolha(o2.x, o2.y - 8, o.bolha.txt);
  }
  if (MP.minhaBolha && J.tempo - MP.minhaBolha.t < 6 && J.jog) { v.set(J.jog.x, J.jog.y + 2.5, J.jog.z); ENG.paraTela(v, o2); bolha(o2.x, o2.y - 8, MP.minhaBolha.txt); }
};

// ------------------------------------------------------------
// Interface e integração
// ------------------------------------------------------------
(function () {
  const css = `
  #mpLista { position: fixed; top: calc(max(12px, env(safe-area-inset-top, 0px)) + 62px); left: 14px; z-index: 5; width: 270px; font-size: 12px; display: flex; flex-direction: column; gap: 3px; }
  #mpLista .mpT { font-family: var(--f-titulo); color: var(--bronze); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; text-shadow: 0 0 4px #000; }
  .mpL { display: grid; grid-template-columns: 10px 1fr auto; grid-template-rows: auto auto; column-gap: 6px; align-items: center; background: rgba(10,8,6,.62); padding: 4px 8px; border-radius: 3px; }
  .mpL .pt { width: 7px; height: 7px; border-radius: 50%; background: #5ad06a; grid-row: 1 / span 2; }
  .mpL.eu .pt { background: #ffd080; }
  .mpL .nm { color: #9cc8ff; font-weight: 700; } .mpL.eu .nm { color: #ffe2a8; }
  .mpL .ar { color: var(--texto2); grid-column: 2; }
  .mpL.amigo .nm { color: #9cf0a8; }
  .mpL .bt { grid-row: 1 / span 2; grid-column: 3; display: flex; gap: 3px; }
  .mpIr { background: var(--painel2); border: 1px solid var(--bronze); color: var(--bronze2); font-family: var(--f-titulo); font-size: 11px; padding: 3px 9px; cursor: pointer; border-radius: 3px; }
  #mpChat { position: fixed; left: 14px; bottom: calc(max(10px, env(safe-area-inset-bottom, 0px)) + 150px); z-index: 5; width: min(380px, 40vw); font-size: 13px; line-height: 1.35; text-shadow: 0 0 4px #000, 0 0 2px #000; pointer-events: none; }
  #mpEntrada { position: fixed; left: 14px; bottom: calc(max(10px, env(safe-area-inset-bottom, 0px)) + 120px); z-index: 9; width: min(380px, 60vw); background: rgba(10,8,6,.92); border: 1px solid var(--bronze); color: var(--texto); padding: 7px 10px; font-family: var(--f-corpo); font-size: 14px; border-radius: 3px; }
  #mpEntrada:focus { outline: 2px solid var(--bronze2); }
  #mpStatus { position: fixed; top: calc(max(12px, env(safe-area-inset-top, 0px)) + 62px); left: 14px; z-index: 5; font-size: 12px; color: var(--texto2); text-shadow: 0 0 4px #000; max-width: 270px; }
  @media (max-width: 760px) { #mpLista, #mpChat { display: none; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const d = document.createElement('div');
  d.innerHTML = '<div id="mpLista"></div><div id="mpStatus" hidden></div><div id="mpChat"></div><input id="mpEntrada" maxlength="120" placeholder="Mensagem para quem está na área (Enter envia, Esc cancela)" autocomplete="off" hidden>';
  while (d.firstElementChild) document.body.insertBefore(d.firstElementChild, document.getElementById('tooltip'));
  const ent = document.getElementById('mpEntrada');
  window.addEventListener('keydown', (e) => {
    if (e.target === ent) {
      if (e.key === 'Enter') { MP.falar(ent.value); ent.value = ''; ent.hidden = true; ent.blur(); e.preventDefault(); }
      else if (e.key === 'Escape') { ent.value = ''; ent.hidden = true; ent.blur(); e.preventDefault(); }
      e.stopPropagation(); return;
    }
    if (e.key === 'Enter' && J.estado === 'jogando' && !(e.target && e.target.tagName === 'INPUT')) { ent.hidden = false; ent.focus(); J.input.teclas = {}; e.preventDefault(); e.stopPropagation(); }
  }, true);

  // ganchos: troca de área, atualização por quadro, rótulos
  const ent0 = J.entrarDef;
  J.entrarDef = function (def, chegada, opcoes) { ent0(def, chegada, opcoes); MP.trocarArea(def.id); MP.desenharLista(); };
  const rest0 = J.restaurarGuardado;
  J.restaurarGuardado = function () { rest0(); if (J.z) MP.trocarArea(J.z.def.id); };
  const at0 = J.atualizar;
  J.atualizar = function (dt) { at0(dt); MP.atualizar(dt); };
  const ov0 = UI.desenharOverlay;
  UI.desenharOverlay = function () { ov0(); if (J.mundo && J.estado !== 'menu') MP.desenharRotulos(UI.ovg); };
  const ini0 = UI.iniciarJogo;
  UI.iniciarJogo = function (novo) { ini0(novo); MP.conectar(); MP.registrar('Pressione Enter para conversar com quem estiver na mesma área.', '#a89880'); setTimeout(MP.desenharLista, 500); };
})();
