// ============================================================
//  Versão desktop (Steam): saves em arquivo, conquistas, login
//  pela Steam e opções da janela. No navegador, só as conquistas
//  ficam registradas localmente (sem efeito visível).
// ============================================================
'use strict';

const DESK = { ativo: !!(window.CDC_DESKTOP && window.CDC_DESKTOP.desktop), api: window.CDC_DESKTOP || null, steam: null };

// ---------- saves espelhados em arquivo (Steam Cloud sincroniza a pasta) ----------
if (DESK.ativo) {
  const RX = /^(coroaDeCinzas|cdc_)/;
  const pend = new Map(); let tm = null;
  const descarregar = () => { tm = null; for (const [k, v] of pend) DESK.api.gravar(k, v); pend.clear(); };
  const agendar = (k, v) => { pend.set(k, v); if (!tm) tm = setTimeout(descarregar, 400); };
  const S = Storage.prototype, set0 = S.setItem, rem0 = S.removeItem;
  S.setItem = function (k, v) { set0.call(this, k, v); if (this === window.localStorage && RX.test(k)) agendar(k, String(v)); };
  S.removeItem = function (k) { rem0.call(this, k); if (this === window.localStorage && RX.test(k)) agendar(k, null); };
  window.addEventListener('beforeunload', descarregar);
  DESK.api.steamInfo().then(i => { DESK.steam = i; }).catch(() => { });
}

// ---------- conquistas ----------
// Os nomes (API Name) precisam ser cadastrados iguais no Steamworks: veja docs/STEAM.md
const CONQUISTAS = {
  PRIMEIRO_SANGUE: 'Primeiro Sangue — derrote seu primeiro monstro',
  CEM_ABATES: 'Ceifador — derrote 100 monstros',
  MIL_ABATES: 'Flagelo das Cinzas — derrote 1.000 monstros',
  NIVEL_10: 'Calejado — alcance o nível 10',
  NIVEL_25: 'Veterano — alcance o nível 25',
  NIVEL_50: 'Lenda Viva — alcance o nível 50',
  NIVEL_100: 'Coroado — alcance o nível 100',
  CHEFE_MARETH: 'Derrote Mareth, a Rainha Coral',
  CHEFE_VHORRA: 'Derrote a Mãe Lodo Vhorra',
  CHEFE_MORGRATH: 'Derrote Morgrath, o Cervo Ancião',
  CHEFE_TECELA: 'Derrote a Tecelã Abissal',
  CHEFE_TUSKAR: 'Derrote Tuskar, o Rei Sepultado',
  CHEFE_HRIMFANG: 'Derrote Hrimfang, o Dragão Glacial',
  CHEFE_VORTHAK: 'Derrote Vorthak, Senhor das Cinzas',
  PRIMEIRA_REACAO: 'Alquimia de Batalha — provoque uma reação elemental',
  JOIA_GRANDIOSA: 'Mestre Joalheiro — crie uma jóia Grandiosa',
  RAIZ_DESPERTA: 'Semente Desperta — desperte um nó da Raiz Primeva',
};
DESK.contagem = (() => { try { return JSON.parse(localStorage.getItem('cdc_conquistas') || '{}'); } catch (e) { return {}; } })();
DESK.salvarContagem = () => { try { localStorage.setItem('cdc_conquistas', JSON.stringify(DESK.contagem)); } catch (e) { } };
DESK.conquistar = function (api) {
  if (!CONQUISTAS[api]) return;
  const c = DESK.contagem; c.feitas = c.feitas || {};
  if (!c.feitas[api]) { c.feitas[api] = Date.now(); DESK.salvarContagem(); }
  if (DESK.ativo) DESK.api.conquista(api).catch(() => { }); // a Steam mostra o aviso no overlay
};

{
  const m0 = J.matarInimigo;
  J.matarInimigo = function (e) {
    const ja = e && e.morto; const r = m0.apply(this, arguments);
    try {
      if (e && !ja && e.morto && !e.invocado) {
        const c = DESK.contagem; c.abates = (c.abates || 0) + 1;
        if (c.abates === 1) DESK.conquistar('PRIMEIRO_SANGUE');
        if (c.abates >= 100) DESK.conquistar('CEM_ABATES');
        if (c.abates >= 1000) DESK.conquistar('MIL_ABATES');
        if (e.boss && e.tipo) DESK.conquistar('CHEFE_' + String(e.tipo).toUpperCase());
        if (c.abates % 25 === 0) DESK.salvarContagem();
      }
    } catch (err) { }
    return r;
  };
  const xp0 = J.ganharXP;
  J.ganharXP = function () {
    const r = xp0.apply(this, arguments);
    try { const n = J.pers.nivel; for (const k of [10, 25, 50, 100]) if (n >= k) DESK.conquistar('NIVEL_' + k); } catch (e) { }
    return r;
  };
  if (typeof COMBO !== 'undefined') { const d0 = COMBO.detonar; COMBO.detonar = function () { DESK.conquistar('PRIMEIRA_REACAO'); return d0.apply(this, arguments); }; }
  if (UI.evoluirGema) { const g0 = UI.evoluirGema; UI.evoluirGema = function (g, q) { const ok = g0.apply(this, arguments); if (ok && q + 1 >= QUALIDADES.length - 1) DESK.conquistar('JOIA_GRANDIOSA'); return ok; }; }
  if (typeof RAIZ !== 'undefined') { const a0 = RAIZ.alocar; RAIZ.alocar = function (id) { const n0 = Object.keys(RAIZ.estado().nos).length; const r = a0.apply(this, arguments); if (Object.keys(RAIZ.estado().nos).length > n0) DESK.conquistar('RAIZ_DESPERTA'); return r; }; }
}

// ---------- menu: fechar o jogo e tela cheia ----------
if (DESK.ativo) {
  window.addEventListener('load', () => {
    const sair = document.getElementById('bSairMenu'); if (!sair) return;
    const tc = document.createElement('button'); tc.className = 'btn sec'; tc.textContent = 'Tela cheia (F11)';
    tc.addEventListener('click', () => DESK.api.telaCheia());
    const fechar = document.createElement('button'); fechar.className = 'btn sec'; fechar.textContent = 'Fechar o jogo';
    fechar.addEventListener('click', () => { try { J.salvar && J.pers && J.salvar(); } catch (e) { } setTimeout(() => DESK.api.sair(), 300); });
    sair.after(tc, fechar);
  });
}

// ---------- login pela Steam ----------
if (DESK.ativo && typeof REDE !== 'undefined' && REDE.telaLogin) {
  const tl0 = REDE.telaLogin;
  REDE.telaLogin = function (modo) {
    const r = tl0.apply(this, arguments);
    if ((modo || 'entrar') === 'entrar' && REDE.ativo) {
      const f = document.getElementById('rForm');
      if (f && !document.getElementById('rSteam')) {
        const b = document.createElement('button'); b.type = 'button'; b.id = 'rSteam'; b.className = 'btn grande'; b.textContent = 'Entrar com a Steam';
        const ou = document.createElement('div'); ou.className = 'rTxt'; ou.style.textAlign = 'center'; ou.textContent = 'ou com e-mail e senha';
        const abas = f.querySelector('.rAbas'); (abas ? abas.after(b, ou) : f.prepend(b, ou));
        b.addEventListener('click', () => DESK.entrarSteam());
      }
    }
    return r;
  };
  DESK.entrarSteam = async function (apelido) {
    const msg = (t, ok) => { const m = document.getElementById('rMsg'); if (m) { m.textContent = t; m.className = 'rMsg' + (ok ? ' ok' : ''); } };
    try {
      msg('Conectando à Steam…', true);
      await REDE.pronto;
      const ticket = await DESK.api.ticketSteam();
      if (!ticket) throw new Error('A Steam não está aberta. Abra a Steam e tente de novo.');
      const r = await fetch(REDE.cfg.supabaseUrl.replace(/\/$/, '') + '/functions/v1/steam-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: REDE.cfg.supabaseAnonKey, Authorization: 'Bearer ' + REDE.cfg.supabaseAnonKey },
        body: JSON.stringify(apelido ? { ticket, apelido } : { ticket }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.precisaApelido) return DESK.pedirApelido();
      if (!r.ok || !j.token) throw new Error(j.erro || 'Não foi possível entrar pela Steam.');
      let res = await REDE.sb.auth.verifyOtp({ token_hash: j.token, type: 'email' });
      if (res.error) res = await REDE.sb.auth.verifyOtp({ token_hash: j.token, type: 'magiclink' });
      if (res.error) throw res.error;
      REDE.sessao = res.data.session; await REDE.carregarPerfil();
      REDE.entrada();
    } catch (e) { msg(e.message || String(e)); }
  };
  DESK.pedirApelido = function () {
    const sugestao = String((DESK.steam && DESK.steam.nome) || '').normalize('NFD').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16);
    REDE.tela(`<form class="rCaixa" id="rForm" novalidate>
      <p class="rTxt">Primeira vez por aqui! Escolha o apelido que os outros jogadores vão ver.</p>
      <label>Apelido <small>(3 a 16 letras, números ou _)</small><input id="rApelido" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" required></label>
      <button class="btn grande" type="submit">Começar</button>
      <div class="rMsg" id="rMsg" role="status"></div></form>`);
    const inp = document.getElementById('rApelido'); inp.value = sugestao.length >= 3 ? sugestao : ''; inp.focus();
    document.getElementById('rForm').addEventListener('submit', (e) => {
      e.preventDefault(); const ap = inp.value.trim();
      if (!/^[A-Za-z0-9_]{3,16}$/.test(ap)) { const m = document.getElementById('rMsg'); m.textContent = 'O apelido deve ter de 3 a 16 letras, números ou _.'; return; }
      DESK.entrarSteam(ap);
    });
  };
}
