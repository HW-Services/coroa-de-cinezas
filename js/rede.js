// ============================================================
//  Rede: contas (e-mail), servidores, personagens na nuvem,
//  amigos, clãs e negociação entre jogadores (Supabase).
//  Sem configuração em js/config.js o jogo roda no modo solo.
// ============================================================
'use strict';

const REDE = {
  cfg: window.CDC_CONFIG || {}, sb: null, ativo: false, sessao: null, perfil: null,
  servidor: null, servidores: [], personagens: [], persId: null, versao: 0,
  sujo: false, salvando: null, timerSave: null, ultimoSave: 0,
  amigos: [], pedidosRec: [], pedidosEnv: [], cla: null, membros: [], convitesCla: [], convidadosCla: [], msgsCla: [],
  troca: null, trSel: new Set(), perfisCache: new Map(),
};
window.REDE = REDE;
REDE.ativo = !!(REDE.cfg.supabaseUrl && REDE.cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);

const $r = (s) => document.querySelector(s);
const ERROS = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  'User already registered': 'Já existe uma conta com esse e-mail.',
  'Password should be at least': 'A senha precisa ter pelo menos 6 caracteres.',
  'rate limit': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'Email address': 'Esse e-mail não foi aceito pelo servidor.',
  'Database error saving new user': 'Não foi possível criar a conta (o apelido pode já estar em uso).',
  SEM_SESSAO: 'Sua sessão expirou. Entre novamente.', SERVIDOR_FECHADO: 'Este servidor está fechado.',
  LIMITE_PERSONAGENS: 'Limite de 4 personagens neste servidor.', SAVE_GRANDE: 'Personagem grande demais para salvar.',
  JOGADOR_NAO_EXISTE: 'Nenhum jogador com esse apelido.', VOCE_MESMO: 'Esse é você.', LIMITE_AMIGOS: 'Lista de amigos cheia.',
  JA_EM_CLA: 'Você já está num clã neste servidor.', NOME_EM_USO: 'Já existe um clã com esse nome.', TAG_EM_USO: 'Essa sigla já está em uso.',
  SEM_PERMISSAO: 'Você não tem permissão para isso.', JOGADOR_JA_EM_CLA: 'Esse jogador já está num clã.', CLA_CHEIO: 'O clã está cheio (30 membros).',
  SEM_CONVITE: 'O convite não existe mais.', CLA_NAO_EXISTE: 'O clã não existe mais.', NAO_MEMBRO: 'Você não está nesse clã.', DEVAGAR: 'Calma! Espere um pouco para mandar mais mensagens.',
  TROCA_INVALIDA: 'Essa negociação não está mais disponível.', TROCA_EXPIROU: 'O convite de negociação expirou.',
  MUITOS_ITENS: 'No máximo 12 itens por negociação.', OURO_INSUFICIENTE: 'Ouro insuficiente.', ITEM_NAO_EXISTE: 'Um dos itens não está mais no inventário.',
  OFERTA_MUDOU: 'Um item ofertado mudou antes da conclusão.', INVENTARIO_CHEIO: 'Um dos inventários não tem espaço livre suficiente.',
  NAO_ENCONTRADO: 'Personagem não encontrado.', 'Failed to fetch': 'Sem conexão com o servidor.',
};
REDE.msgErro = function (e) {
  const m = String((e && (e.message || e.error_description)) || e || '');
  for (const [k, v] of Object.entries(ERROS)) if (m.includes(k)) return v;
  return m || 'Algo deu errado.';
};
REDE.rpc = async function (fn, args) {
  const { data, error } = await REDE.sb.rpc(fn, args || {});
  if (error) throw error;
  return data;
};
REDE.avisoErro = (e) => UI.aviso(REDE.msgErro(e), '#ff9080');
const urlVolta = () => location.href.split('#')[0].split('?')[0];

// ------------------------------------------------------------
// Início: cliente, sessão e telas de entrada
// ------------------------------------------------------------
REDE.pronto = (async function () {
  if (!REDE.ativo) return;
  REDE.sb = window.supabase.createClient(REDE.cfg.supabaseUrl, REDE.cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  REDE.sb.auth.onAuthStateChange((ev, sessao) => {
    REDE.sessao = sessao;
    if (ev === 'PASSWORD_RECOVERY') setTimeout(() => REDE.telaLogin('nova'), 0);
  });
  try { const { data } = await REDE.sb.auth.getSession(); REDE.sessao = data.session; } catch (e) { REDE.sessao = null; }
  if (REDE.sessao) await REDE.carregarPerfil();
})();

REDE.carregarPerfil = async function () {
  const uid = REDE.sessao.user.id;
  const { data } = await REDE.sb.from('perfis').select('id, apelido').eq('id', uid).maybeSingle();
  REDE.perfil = data || null;
};

REDE.esconderTelas = function () { for (const id of ['#telaInicio', '#telaClasse', '#telaRede']) { const e = $r(id); if (e) e.hidden = true; } };
REDE.fundo = function () { J.estado = 'menu'; if (!J.mundo) { ENG.construirMundo('litoral', 42, { chefe: false }); J.fundo = true; } };
REDE.tela = function (html) {
  REDE.esconderTelas();
  const t = $r('#telaRede'); t.innerHTML = `<div><div class="logo">Coroa de Cinzas</div><div class="sublogo">Um RPG de ação sombrio</div></div>` + html; t.hidden = false;
  return t;
};
REDE.entrada = async function () {
  REDE.fundo();
  await REDE.pronto;
  if (REDE.sessao && !REDE.perfil) await REDE.carregarPerfil();
  if (!REDE.sessao || !REDE.perfil) return REDE.telaLogin(REDE.sessao ? 'semPerfil' : 'entrar');
  if (!REDE.servidor) return REDE.telaServidor();
  return REDE.telaPersonagens();
};

// --- login / cadastro / senha ---
REDE.telaLogin = function (modo) {
  modo = modo || 'entrar';
  const abas = `<div class="rAbas"><button type="button" class="rAba${modo === 'entrar' ? ' on' : ''}" data-m="entrar">Entrar</button><button type="button" class="rAba${modo === 'criar' ? ' on' : ''}" data-m="criar">Criar conta</button></div>`;
  let corpo = '';
  if (modo === 'entrar') corpo = `
    <label>E-mail<input id="rEmail" type="email" autocomplete="email" required></label>
    <label>Senha<input id="rSenha" type="password" autocomplete="current-password" required minlength="6"></label>
    <button class="btn grande" type="submit">Entrar</button>
    <button class="rLink" type="button" data-m="esqueci">Esqueci minha senha</button>`;
  else if (modo === 'criar') corpo = `
    <label>Apelido <small>(3 a 16 letras, números ou _ · é como os outros jogadores verão você)</small><input id="rApelido" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" autocomplete="nickname" required></label>
    <label>E-mail<input id="rEmail" type="email" autocomplete="email" required></label>
    <label>Senha <small>(mínimo 6 caracteres)</small><input id="rSenha" type="password" autocomplete="new-password" required minlength="6"></label>
    <label>Confirmar senha<input id="rSenha2" type="password" autocomplete="new-password" required minlength="6"></label>
    <button class="btn grande" type="submit">Criar conta</button>`;
  else if (modo === 'esqueci') corpo = `
    <p class="rTxt">Informe o e-mail da conta. Enviaremos um link para criar uma nova senha.</p>
    <label>E-mail<input id="rEmail" type="email" autocomplete="email" required></label>
    <button class="btn grande" type="submit">Enviar link</button>
    <button class="rLink" type="button" data-m="entrar">Voltar</button>`;
  else if (modo === 'nova') corpo = `
    <p class="rTxt">Escolha sua nova senha.</p>
    <label>Nova senha<input id="rSenha" type="password" autocomplete="new-password" required minlength="6"></label>
    <button class="btn grande" type="submit">Salvar senha</button>`;
  else if (modo === 'semPerfil') corpo = `<p class="rTxt">Sua conta não tem perfil de jogador. Saia e crie a conta novamente.</p><button class="btn" type="button" id="rSair">Sair</button>`;
  const t = REDE.tela(`<form class="rCaixa" id="rForm" novalidate>${modo === 'entrar' || modo === 'criar' ? abas : ''}${corpo}<div class="rMsg" id="rMsg" role="status"></div></form>`);
  t.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); REDE.telaLogin(b.dataset.m); }));
  const sair = $r('#rSair'); if (sair) sair.addEventListener('click', REDE.sair);
  const msg = (txt, ok) => { const m = $r('#rMsg'); m.textContent = txt; m.className = 'rMsg' + (ok ? ' ok' : ''); };
  const f = $r('#rForm');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bt = f.querySelector('[type=submit]'); if (!bt || bt.disabled) return;
    const email = ($r('#rEmail') || {}).value, senha = ($r('#rSenha') || {}).value;
    try {
      bt.disabled = true; msg('Aguarde…', true);
      if (modo === 'entrar') {
        if (!email || !senha) throw new Error('Preencha e-mail e senha.');
        const { error } = await REDE.sb.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
        const { data } = await REDE.sb.auth.getSession(); REDE.sessao = data.session; await REDE.carregarPerfil();
        REDE.entrada();
      } else if (modo === 'criar') {
        const ap = $r('#rApelido').value.trim();
        if (!/^[A-Za-z0-9_]{3,16}$/.test(ap)) throw new Error('O apelido deve ter de 3 a 16 letras, números ou _.');
        if (!email || !/.+@.+\..+/.test(email)) throw new Error('Informe um e-mail válido.');
        if (!senha || senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
        if (senha !== $r('#rSenha2').value) throw new Error('As senhas não conferem.');
        if (!(await REDE.rpc('apelido_livre', { p: ap }))) throw new Error('Esse apelido já está em uso.');
        const { data, error } = await REDE.sb.auth.signUp({ email: email.trim(), password: senha, options: { data: { apelido: ap }, emailRedirectTo: urlVolta() } });
        if (error) throw error;
        if (data.session) { REDE.sessao = data.session; await REDE.carregarPerfil(); REDE.entrada(); }
        else { REDE.telaLogin('entrar'); msg('Conta criada! Enviamos um link de confirmação para ' + email.trim() + '. Depois de confirmar, entre aqui.', true); }
      } else if (modo === 'esqueci') {
        if (!email) throw new Error('Informe o e-mail.');
        const { error } = await REDE.sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: urlVolta() });
        if (error) throw error;
        msg('Se houver uma conta com esse e-mail, o link chegará em instantes.', true);
      } else if (modo === 'nova') {
        if (!senha || senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
        const { error } = await REDE.sb.auth.updateUser({ password: senha });
        if (error) throw error;
        history.replaceState(null, '', urlVolta());
        await REDE.carregarPerfil(); REDE.entrada();
      }
    } catch (err) { msg(REDE.msgErro(err)); }
    finally { if (bt.isConnected) bt.disabled = false; }
  });
  const pri = f.querySelector('input'); if (pri) pri.focus();
};

REDE.sair = async function () {
  await REDE.flush(true).catch(() => {});
  try { await REDE.sb.auth.signOut(); } catch (e) { }
  try { localStorage.removeItem('cdc_servidor'); } catch (e) { }
  location.reload();
};

// --- servidores ---
REDE.telaServidor = async function () {
  const t = REDE.tela(`<div class="rCaixa larga"><h3 class="rTit">Escolha o servidor</h3><div id="rServ" class="rLista"><div class="rTxt">Carregando servidores…</div></div>
    <div class="rConta">Conectado como <b>${esc(REDE.perfil.apelido)}</b> · <button class="rLink" id="rSair">Sair da conta</button></div></div>`);
  $r('#rSair').addEventListener('click', REDE.sair);
  const { data, error } = await REDE.sb.from('servidores').select('*').order('ordem');
  const box = $r('#rServ'); if (!box) return;
  if (error) { box.innerHTML = `<div class="rMsg">${esc(REDE.msgErro(error))}</div><button class="btn" id="rTentar">Tentar de novo</button>`; $r('#rTentar').onclick = REDE.telaServidor; return; }
  REDE.servidores = data || [];
  let ultimo = null; try { ultimo = localStorage.getItem('cdc_servidor'); } catch (e) { }
  box.innerHTML = REDE.servidores.map(s => `<button class="rServ${s.id === ultimo ? ' sel' : ''}" data-s="${esc(s.id)}" ${s.aberto ? '' : 'disabled'}>
      <span class="sNome">${esc(s.nome)}</span><span class="sReg">${esc(s.regiao)}</span><span class="sEst ${s.aberto ? 'on' : ''}">${s.aberto ? '● Online' : '● Fechado'}</span></button>`).join('') || '<div class="rTxt">Nenhum servidor disponível.</div>';
  box.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => {
    REDE.servidor = b.dataset.s; try { localStorage.setItem('cdc_servidor', REDE.servidor); } catch (e) { }
    REDE.telaPersonagens();
  }));
};
REDE.nomeServidor = () => { const s = REDE.servidores.find(x => x.id === REDE.servidor); return s ? s.nome : REDE.servidor; };

// --- personagens ---
REDE.telaPersonagens = async function () {
  const t = REDE.tela(`<div class="rCaixa larga"><h3 class="rTit">Personagens · ${esc(REDE.nomeServidor())}</h3><div id="rPers" class="rLista"><div class="rTxt">Carregando…</div></div>
    <div class="rBotoes"><button class="btn grande" id="rNovo">Novo Personagem</button></div>
    <div class="rConta"><b>${esc(REDE.perfil.apelido)}</b> · <button class="rLink" id="rServ">Trocar servidor</button> · <button class="rLink" id="rSair">Sair da conta</button></div>
    <div class="controles" id="controlesInicio2" style="max-width:420px;margin:14px auto 0"></div></div>`);
  UI.preencherControles($r('#controlesInicio2'));
  $r('#rSair').addEventListener('click', REDE.sair);
  $r('#rServ').addEventListener('click', () => { REDE.servidor = null; REDE.telaServidor(); });
  $r('#rNovo').addEventListener('click', () => { if (REDE.personagens.length >= 4) { UI.aviso('Limite de 4 personagens neste servidor', '#ff9080'); return; } UI.telaClasse(); });
  const { data, error } = await REDE.sb.from('personagens').select('id, nome, classe, nivel, versao, dados, atualizado_em').eq('servidor', REDE.servidor).order('atualizado_em', { ascending: false });
  const box = $r('#rPers'); if (!box) return;
  if (error) { box.innerHTML = `<div class="rMsg">${esc(REDE.msgErro(error))}</div>`; return; }
  REDE.personagens = data || [];
  if (!REDE.personagens.length) { box.innerHTML = '<div class="rTxt">Você ainda não tem personagens neste servidor.</div>'; return; }
  box.innerHTML = REDE.personagens.map(p => {
    const d = p.dados || {}; const asc = d.asc && ASCENDENCIAS[d.asc] ? ASCENDENCIAS[d.asc].nome : (CLASSES[p.classe] || {}).nome;
    const area = d.ultimaCidade && TODAS_AREAS[d.ultimaCidade] ? TODAS_AREAS[d.ultimaCidade].nome : '';
    return `<div class="rPersL"><div><div class="pNome">${esc(p.nome)}</div><div class="pInfo">${esc(asc || '')} · nível ${Number(d.nivel || p.nivel) || 1}${area ? ' · ' + esc(area) : ''}</div></div>
      <button class="btn" data-jogar="${p.id}">Jogar</button><button class="btn sec" data-excluir="${p.id}" aria-label="Excluir ${esc(p.nome)}">Excluir</button></div>`;
  }).join('');
  box.querySelectorAll('[data-jogar]').forEach(b => b.addEventListener('click', () => REDE.jogar(b.dataset.jogar)));
  box.querySelectorAll('[data-excluir]').forEach(b => b.addEventListener('click', async () => {
    const p = REDE.personagens.find(x => x.id === b.dataset.excluir); if (!p) return;
    const nome = prompt(`Para excluir "${p.nome}" para sempre, digite o nome do personagem:`);
    if (nome == null) return;
    if (nome.trim() !== p.nome) { UI.aviso('Nome não confere; nada foi excluído', '#ff9080'); return; }
    try { await REDE.rpc('excluir_personagem', { p_id: p.id }); UI.aviso('Personagem excluído'); REDE.telaPersonagens(); } catch (e) { REDE.avisoErro(e); }
  }));
};
REDE.jogar = function (id) {
  const p = REDE.personagens.find(x => x.id === id); if (!p) return;
  J.pers = JSON.parse(JSON.stringify(p.dados));
  J.migrarSave(J.pers);
  REDE.persId = p.id; REDE.versao = p.versao; REDE.sujo = false;
  REDE.esconderTelas();
  UI.iniciarJogo(false);
};

// ------------------------------------------------------------
// Salvamento na nuvem (com controle de versão)
// ------------------------------------------------------------
REDE.agendarSave = function () {
  if (REDE.timerSave) return;
  const espera = Math.max(500, 5000 - (Date.now() - REDE.ultimoSave));
  REDE.timerSave = setTimeout(() => { REDE.timerSave = null; REDE.flush(); }, espera);
};
REDE.flush = async function (forcar) {
  if (!REDE.ativo || !REDE.persId || !J.pers) return;
  if (REDE.salvando) { await REDE.salvando.catch(() => {}); if (!REDE.sujo && !forcar) return; }
  if (!REDE.sujo && !forcar) return;
  REDE.sujo = false; REDE.ultimoSave = Date.now();
  const dados = JSON.parse(JSON.stringify(J.pers));
  const id = REDE.persId;
  REDE.salvando = (async () => {
    try {
      const v = await REDE.rpc('salvar_personagem', { p_id: id, p_dados: dados, p_versao: REDE.versao });
      if (id === REDE.persId) REDE.versao = v;
      REDE.statusSave('');
    } catch (e) {
      if (String(e.message || '').includes('VERSAO')) await REDE.recarregarPers('Seu personagem foi atualizado no servidor.');
      else { REDE.sujo = true; REDE.statusSave('Falha ao salvar na nuvem; tentando de novo…'); REDE.agendarSave(); throw e; }
    }
  })();
  try { await REDE.salvando; } finally { REDE.salvando = null; }
};
REDE.statusSave = function (t) { const e = $r('#rSaveStatus'); if (e) { e.textContent = t; e.hidden = !t; } };
// substitui o personagem local pela cópia do servidor (após trocas)
REDE.recarregarPers = async function (aviso) {
  const { data, error } = await REDE.sb.from('personagens').select('dados, versao').eq('id', REDE.persId).maybeSingle();
  if (error || !data) return;
  for (const k of Object.keys(J.pers)) delete J.pers[k];
  Object.assign(J.pers, data.dados);
  J.migrarSave(J.pers);
  REDE.versao = data.versao; REDE.sujo = false;
  try { J.recalc(); UI.atualizarTudo(); if (!$r('#painelInv').hidden) UI.atualizarInventario(); if (REDE.troca) REDE.desenharTroca(); } catch (e) { console.error(e); }
  if (aviso) UI.aviso(aviso, '#9cc8ff');
};

// ------------------------------------------------------------
// Social: amigos, clã, convites (carregamento e tempo real)
// ------------------------------------------------------------
REDE.perfis = async function (ids) {
  const falta = [...new Set(ids)].filter(id => id && !REDE.perfisCache.has(id));
  if (falta.length) {
    const { data } = await REDE.sb.from('perfis').select('id, apelido').in('id', falta);
    for (const p of data || []) REDE.perfisCache.set(p.id, p.apelido);
  }
  return (id) => REDE.perfisCache.get(id) || '?';
};
REDE.carregarSocial = async function () {
  if (!REDE.perfil) return;
  const eu = REDE.perfil.id;
  try {
    const [am, mc, cv] = await Promise.all([
      REDE.sb.from('amizades').select('*'),
      REDE.sb.from('membros_cla').select('cla, cargo').eq('usuario', eu).eq('servidor', REDE.servidor).maybeSingle(),
      REDE.sb.from('convites_cla').select('cla, de, criado_em').eq('usuario', eu),
    ]);
    const amz = am.data || [];
    const ids = amz.map(a => a.de === eu ? a.para : a.de);
    // clã
    REDE.cla = null; REDE.membros = []; REDE.convidadosCla = [];
    if (mc.data) {
      const [cl, ms, msgs] = await Promise.all([
        REDE.sb.from('clas').select('*').eq('id', mc.data.cla).maybeSingle(),
        REDE.sb.from('membros_cla').select('usuario, cargo, entrou_em').eq('cla', mc.data.cla),
        REDE.sb.from('msgs_cla').select('id, apelido, texto, criado_em').eq('cla', mc.data.cla).order('id', { ascending: false }).limit(60),
      ]);
      if (cl.data) {
        REDE.cla = { ...cl.data, cargo: mc.data.cargo };
        REDE.membros = ms.data || [];
        REDE.msgsCla = (msgs.data || []).reverse();
        for (const m of REDE.membros) ids.push(m.usuario);
        if (['lider', 'oficial'].includes(mc.data.cargo)) {
          const { data } = await REDE.sb.from('convites_cla').select('usuario').eq('cla', mc.data.cla);
          REDE.convidadosCla = (data || []).map(x => x.usuario); ids.push(...REDE.convidadosCla);
        }
      }
    }
    // convites recebidos (apenas deste servidor)
    let convites = cv.data || [];
    if (convites.length) {
      const { data } = await REDE.sb.from('clas').select('id, nome, tag, servidor').in('id', convites.map(c => c.cla));
      const porId = new Map((data || []).map(c => [c.id, c]));
      convites = convites.filter(c => porId.has(c.cla) && porId.get(c.cla).servidor === REDE.servidor).map(c => ({ ...c, info: porId.get(c.cla) }));
      ids.push(...convites.map(c => c.de));
    }
    REDE.convitesCla = convites;
    const nome = await REDE.perfis(ids);
    REDE.amigos = amz.filter(a => a.aceita).map(a => { const id = a.de === eu ? a.para : a.de; return { id, apelido: nome(id) }; }).sort((a, b) => a.apelido.localeCompare(b.apelido));
    REDE.pedidosRec = amz.filter(a => !a.aceita && a.para === eu).map(a => ({ id: a.de, apelido: nome(a.de) }));
    REDE.pedidosEnv = amz.filter(a => !a.aceita && a.de === eu).map(a => ({ id: a.para, apelido: nome(a.para) }));
    REDE.nomeDe = nome;
  } catch (e) { console.error(e); }
  REDE.desenharSocial(); REDE.atualizarSelo();
  if (window.MP) MP.desenharLista();
};
REDE.tagCla = () => REDE.cla ? REDE.cla.tag : '';
let _tSocial = null;
REDE.recarregarSocialLogo = () => { clearTimeout(_tSocial); _tSocial = setTimeout(REDE.carregarSocial, 300); };

REDE.assinar = function () {
  if (REDE.canalDb) return;
  const eu = REDE.perfil.id;
  const ch = REDE.sb.channel('db-' + eu);
  for (const t of ['amizades', 'membros_cla', 'convites_cla']) ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p) => REDE.aoMudar(t, p));
  ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'msgs_cla' }, (p) => REDE.aoMsgCla(p.new));
  ch.on('postgres_changes', { event: '*', schema: 'public', table: 'trocas' }, (p) => REDE.aoMudarTroca(p.new));
  ch.subscribe((st) => { if (st === 'SUBSCRIBED') REDE.carregarSocial(); });
  REDE.canalDb = ch;
};
REDE.aoMudar = function (tabela, p) {
  const eu = REDE.perfil.id, n = p.new || {};
  if (p.eventType === 'INSERT') {
    if (tabela === 'amizades' && n.para === eu && !n.aceita) REDE.perfis([n.de]).then(nm => REDE.pedido(`${nm(n.de)} quer ser seu amigo.`, 'Aceitar', () => REDE.responderAmizade(n.de, true), () => REDE.responderAmizade(n.de, false)));
    if (tabela === 'convites_cla' && n.usuario === eu) UI.aviso('Você recebeu um convite de clã (painel Social, O)', '#ffd080');
  }
  if (p.eventType === 'UPDATE' && tabela === 'amizades' && n.de === eu && n.aceita) REDE.perfis([n.para]).then(nm => UI.aviso(`${nm(n.para)} aceitou sua amizade`, '#9cf0a8'));
  if (tabela === 'membros_cla' && p.eventType === 'DELETE' && REDE.cla && (p.old || {}).usuario === eu) UI.aviso('Você não faz mais parte do clã', '#ff9080');
  REDE.recarregarSocialLogo();
};
REDE.aoMsgCla = function (m) {
  if (!m || !REDE.cla || m.cla !== REDE.cla.id) return;
  if (REDE.msgsCla.some(x => x.id === m.id)) return;
  REDE.msgsCla.push(m); if (REDE.msgsCla.length > 80) REDE.msgsCla.shift();
  if (window.MP) MP.registrar(`[${REDE.cla.tag}] ${m.apelido}: ${m.texto}`, '#9cf0a8');
  if (REDE.abaSocial === 'cla') REDE.desenharSocial();
};
REDE.aoMudarOnline = () => { if (!$r('#painelSocial').hidden) REDE.desenharSocial(); };

// --- ações ---
const acao = (fn) => async (...a) => { try { await fn(...a); } catch (e) { REDE.avisoErro(e); } };
REDE.pedirAmizade = acao(async (ap) => {
  ap = String(ap || '').trim(); if (!ap) return;
  const r = await REDE.rpc('pedir_amizade', { p_apelido: ap });
  UI.aviso(r === 'aceita' ? `Agora você e ${ap} são amigos` : r === 'ja' ? 'Já está na sua lista' : `Pedido de amizade enviado a ${ap}`, '#9cf0a8');
  REDE.carregarSocial();
});
REDE.responderAmizade = acao(async (de, aceitar) => { await REDE.rpc('responder_amizade', { p_de: de, p_aceitar: aceitar }); REDE.carregarSocial(); });
REDE.removerAmizade = acao(async (id) => { await REDE.rpc('remover_amizade', { p_outro: id }); REDE.carregarSocial(); });
REDE.criarCla = acao(async (nome, tag) => { await REDE.rpc('criar_cla', { p_servidor: REDE.servidor, p_nome: nome, p_tag: tag }); UI.aviso('Clã fundado!', '#ffd23a'); await REDE.carregarSocial(); MP._lob = null; });
REDE.convidarCla = acao(async (ap) => { ap = String(ap || '').trim(); if (!ap) return; await REDE.rpc('convidar_cla', { p_cla: REDE.cla.id, p_apelido: ap }); UI.aviso(`Convite enviado a ${ap}`); REDE.carregarSocial(); });
REDE.responderConvite = acao(async (cla, aceitar) => { await REDE.rpc('responder_convite_cla', { p_cla: cla, p_aceitar: aceitar }); if (aceitar) UI.aviso('Bem-vindo ao clã!', '#ffd23a'); await REDE.carregarSocial(); MP._lob = null; });
REDE.sairCla = acao(async () => { if (!confirm(REDE.cla.cargo === 'lider' && REDE.membros.length === 1 ? 'Você é o único membro: sair vai dissolver o clã. Continuar?' : 'Sair do clã?')) return; await REDE.rpc('sair_cla', { p_cla: REDE.cla.id }); await REDE.carregarSocial(); MP._lob = null; });
REDE.expulsar = acao(async (uid) => { if (!confirm(`Expulsar ${REDE.nomeDe(uid)} do clã?`)) return; await REDE.rpc('expulsar_cla', { p_cla: REDE.cla.id, p_usuario: uid }); REDE.carregarSocial(); });
REDE.cargo = acao(async (uid, cargo) => { if (cargo === 'lider' && !confirm(`Passar a liderança para ${REDE.nomeDe(uid)}? Você vira oficial.`)) return; await REDE.rpc('definir_cargo_cla', { p_cla: REDE.cla.id, p_usuario: uid, p_cargo: cargo }); REDE.carregarSocial(); });
REDE.salvarDescricao = acao(async (txt) => { await REDE.rpc('descricao_cla', { p_cla: REDE.cla.id, p_texto: txt }); UI.aviso('Descrição salva'); REDE.carregarSocial(); });
REDE.enviarMsgCla = acao(async (txt) => { txt = String(txt || '').trim().slice(0, 200); if (!txt || !REDE.cla) return; await REDE.rpc('enviar_msg_cla', { p_cla: REDE.cla.id, p_texto: txt }); });

// --- pedidos com botões (amizade, negociação) ---
REDE.pedido = function (txt, rotuloSim, sim, nao, segundos) {
  const box = $r('#rPedidos'); const d = document.createElement('div'); d.className = 'rPedido';
  d.innerHTML = `<span>${esc(txt)}</span><button class="btn">${esc(rotuloSim)}</button><button class="btn sec">Recusar</button>`;
  const fim = () => { clearTimeout(tm); d.remove(); };
  const [bs, bn] = d.querySelectorAll('button');
  bs.addEventListener('click', () => { fim(); sim(); });
  bn.addEventListener('click', () => { fim(); if (nao) nao(); });
  const tm = setTimeout(() => { d.remove(); }, (segundos || 30) * 1000);
  box.appendChild(d);
  return fim;
};
REDE.atualizarSelo = function () {
  const n = REDE.pedidosRec.length + REDE.convitesCla.length; const s = $r('#rSelo'); if (s) { s.textContent = n; s.hidden = !n; }
};

// ------------------------------------------------------------
// Painel Social
// ------------------------------------------------------------
REDE.abaSocial = 'amigos';
REDE.alternarSocial = function (abrir) {
  const p = $r('#painelSocial'); const vai = abrir == null ? p.hidden : abrir;
  p.hidden = !vai; if (vai) { REDE.desenharSocial(); REDE.carregarSocial(); }
};
REDE.desenharSocial = function () {
  const p = $r('#painelSocial'); if (!p || p.hidden) return;
  const ativo = document.activeElement && p.contains(document.activeElement) && document.activeElement.tagName === 'INPUT' ? document.activeElement.id : null;
  const valores = {}; p.querySelectorAll('input').forEach(i => { valores[i.id] = i.value; });
  const on = window.MP ? MP.online() : new Map();
  const eu = REDE.perfil.id;
  for (const b of p.querySelectorAll('.sAba')) b.classList.toggle('on', b.dataset.aba === REDE.abaSocial);
  const c = $r('#socialCorpo'); let h = '';
  const linhaOn = (uid) => { const s = on.get(uid); return s ? `<span class="sOn">● ${esc(String(s.n).slice(0, 18))} · ${esc(CLASSES[s.c] ? CLASSES[s.c].nome : '')} nv ${Number(s.l) || 1} · ${esc(String(s.an || '').slice(0, 40))}</span>` : '<span class="sOff">● Offline</span>'; };
  if (REDE.abaSocial === 'amigos') {
    h += `<form class="sForm" data-f="amigo"><input id="sNovoAmigo" maxlength="16" placeholder="Apelido do jogador" autocomplete="off"><button class="btn">Adicionar</button></form>`;
    if (REDE.pedidosRec.length) h += `<div class="sSub">Pedidos recebidos</div>` + REDE.pedidosRec.map(a => `<div class="sL"><span class="sNm">${esc(a.apelido)}</span><span class="sBt"><button class="btn" data-ac="aceitarAmigo" data-id="${a.id}">Aceitar</button><button class="btn sec" data-ac="recusarAmigo" data-id="${a.id}">Recusar</button></span></div>`).join('');
    h += `<div class="sSub">Amigos · ${REDE.amigos.length}</div>`;
    const ord = REDE.amigos.slice().sort((a, b) => on.has(b.id) - on.has(a.id));
    h += ord.map(a => { const s = on.get(a.id); return `<div class="sL"><span class="sNm">${esc(a.apelido)}</span>${linhaOn(a.id)}<span class="sBt">${s && window.MP && MP.podeIrPara(s.area) ? `<button class="btn" data-ac="ir" data-area="${esc(String(s.area))}">Ir</button>` : ''}${s ? `<button class="btn" data-ac="negociar" data-ap="${esc(a.apelido)}">Negociar</button>` : ''}<button class="btn sec" data-ac="removerAmigo" data-id="${a.id}" aria-label="Remover ${esc(a.apelido)}">✕</button></span></div>`; }).join('') || '<div class="dica">Adicione amigos pelo apelido (é o nome da conta, mostrado na lista de online).</div>';
    if (REDE.pedidosEnv.length) h += `<div class="sSub">Pedidos enviados</div>` + REDE.pedidosEnv.map(a => `<div class="sL"><span class="sNm">${esc(a.apelido)}</span><span class="sOff">aguardando</span><span class="sBt"><button class="btn sec" data-ac="removerAmigo" data-id="${a.id}">Cancelar</button></span></div>`).join('');
  } else if (REDE.abaSocial === 'cla') {
    const C = REDE.cla;
    if (!C) {
      if (REDE.convitesCla.length) h += `<div class="sSub">Convites recebidos</div>` + REDE.convitesCla.map(cv => `<div class="sL"><span class="sNm">[${esc(cv.info.tag)}] ${esc(cv.info.nome)}</span><span class="sOff">convite de ${esc(REDE.nomeDe(cv.de))}</span><span class="sBt"><button class="btn" data-ac="aceitarCla" data-id="${cv.cla}">Entrar</button><button class="btn sec" data-ac="recusarCla" data-id="${cv.cla}">Recusar</button></span></div>`).join('');
      h += `<div class="sSub">Fundar um clã</div><form class="sForm col" data-f="criarCla"><input id="sClaNome" maxlength="24" placeholder="Nome do clã (3 a 24 caracteres)" autocomplete="off"><input id="sClaTag" maxlength="5" placeholder="Sigla (2 a 5 letras/números)" autocomplete="off"><button class="btn">Fundar clã</button></form><div class="dica">Você pode estar em um clã por servidor. Clãs têm até 30 membros, mural de mensagens e cargos (líder, oficial, membro).</div>`;
    } else {
      const chefe = C.cargo === 'lider', ofi = C.cargo === 'oficial';
      const ROT = { lider: 'Líder', oficial: 'Oficial', membro: 'Membro' };
      h += `<div class="sCla"><div class="sClaN">[${esc(C.tag)}] ${esc(C.nome)}</div><div class="sOff">Seu cargo: ${ROT[C.cargo]} · ${REDE.membros.length}/30 membros</div>`;
      h += (chefe || ofi) ? `<form class="sForm" data-f="desc"><input id="sClaDesc" maxlength="300" placeholder="Mensagem do clã" value="${esc(C.descricao || '')}"><button class="btn sec">Salvar</button></form>` : (C.descricao ? `<div class="sDesc">${esc(C.descricao)}</div>` : '');
      h += `</div><div class="sSub">Membros</div>`;
      const ordem = { lider: 0, oficial: 1, membro: 2 };
      h += REDE.membros.slice().sort((a, b) => ordem[a.cargo] - ordem[b.cargo] || on.has(b.usuario) - on.has(a.usuario)).map(m => {
        const souEu = m.usuario === eu; let bt = '';
        if (!souEu && chefe) bt += m.cargo === 'membro' ? `<button class="btn sec" data-ac="cargo" data-id="${m.usuario}" data-c="oficial">Promover</button>` : m.cargo === 'oficial' ? `<button class="btn sec" data-ac="cargo" data-id="${m.usuario}" data-c="membro">Rebaixar</button><button class="btn sec" data-ac="cargo" data-id="${m.usuario}" data-c="lider">Passar liderança</button>` : '';
        if (!souEu && ((chefe && m.cargo !== 'lider') || (ofi && m.cargo === 'membro'))) bt += `<button class="btn sec" data-ac="expulsar" data-id="${m.usuario}">Expulsar</button>`;
        if (!souEu && on.has(m.usuario)) bt += `<button class="btn" data-ac="negociar" data-ap="${esc(REDE.nomeDe(m.usuario))}">Negociar</button>`;
        return `<div class="sL"><span class="sNm">${esc(REDE.nomeDe(m.usuario))}${souEu ? ' (você)' : ''} <small>${ROT[m.cargo]}</small></span>${linhaOn(m.usuario)}<span class="sBt">${bt}</span></div>`;
      }).join('');
      if (chefe || ofi) {
        h += `<form class="sForm" data-f="convidar"><input id="sConvidar" maxlength="16" placeholder="Convidar pelo apelido" autocomplete="off"><button class="btn">Convidar</button></form>`;
        if (REDE.convidadosCla.length) h += `<div class="dica">Convites pendentes: ${REDE.convidadosCla.map(u => esc(REDE.nomeDe(u))).join(', ')}</div>`;
      }
      h += `<div class="sSub">Mural do clã</div><div class="sMural" id="sMural">${REDE.msgsCla.slice(-40).map(m => `<div><b>${esc(m.apelido)}</b> <span class="sOff">${new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><br>${esc(m.texto)}</div>`).join('') || '<div class="sOff">Nenhuma mensagem ainda.</div>'}</div>
        <form class="sForm" data-f="msg"><input id="sMsgCla" maxlength="200" placeholder="Mensagem para o clã (no jogo: Enter e /c texto)" autocomplete="off"><button class="btn">Enviar</button></form>
        <button class="btn sec" data-ac="sairCla" style="margin-top:10px">${chefe && REDE.membros.length === 1 ? 'Dissolver clã' : 'Sair do clã'}</button>`;
    }
  } else {
    const amigos = new Set(REDE.amigos.map(a => a.id));
    h += `<div class="sSub">Online em ${esc(REDE.nomeServidor())} · ${on.size}</div>`;
    h += [...on.entries()].map(([uid, s]) => {
      const souEu = uid === eu; let bt = '';
      if (!souEu) {
        if (window.MP && MP.podeIrPara(s.area)) bt += `<button class="btn" data-ac="ir" data-area="${esc(String(s.area))}">Ir</button>`;
        bt += `<button class="btn" data-ac="negociar" data-ap="${esc(String(s.ap || ''))}">Negociar</button>`;
        if (!amigos.has(uid)) bt += `<button class="btn sec" data-ac="addAmigo" data-ap="${esc(String(s.ap || ''))}">+ Amigo</button>`;
        if (REDE.cla && ['lider', 'oficial'].includes(REDE.cla.cargo) && !s.tg) bt += `<button class="btn sec" data-ac="convidarCla" data-ap="${esc(String(s.ap || ''))}">Convidar ao clã</button>`;
      }
      return `<div class="sL"><span class="sNm">${s.tg ? '[' + esc(String(s.tg).slice(0, 5)) + '] ' : ''}${esc(String(s.ap || '?').slice(0, 16))}${souEu ? ' (você)' : ''}</span>${linhaOn(uid)}<span class="sBt">${bt}</span></div>`;
    }).join('');
  }
  c.innerHTML = h;
  for (const [id, v] of Object.entries(valores)) { const i = c.querySelector('#' + id); if (i && id !== 'sClaDesc') i.value = v; }
  if (ativo) { const i = c.querySelector('#' + ativo); if (i) i.focus(); }
  const mural = $r('#sMural'); if (mural) mural.scrollTop = mural.scrollHeight;
};
REDE.cliqueSocial = function (e) {
  const b = e.target.closest('[data-ac]'); if (!b) return;
  const id = b.dataset.id, ap = b.dataset.ap;
  switch (b.dataset.ac) {
    case 'aceitarAmigo': REDE.responderAmizade(id, true); break;
    case 'recusarAmigo': REDE.responderAmizade(id, false); break;
    case 'removerAmigo': if (confirm(`Remover ${REDE.nomeDe(id)} da lista?`)) REDE.removerAmizade(id); break;
    case 'addAmigo': REDE.pedirAmizade(ap); break;
    case 'negociar': REDE.abrirTroca(ap); break;
    case 'ir': MP.irPara(b.dataset.area); break;
    case 'aceitarCla': REDE.responderConvite(id, true); break;
    case 'recusarCla': REDE.responderConvite(id, false); break;
    case 'convidarCla': REDE.convidarCla(ap); break;
    case 'expulsar': REDE.expulsar(id); break;
    case 'cargo': REDE.cargo(id, b.dataset.c); break;
    case 'sairCla': REDE.sairCla(); break;
  }
};
REDE.enviarFormSocial = function (e) {
  const f = e.target.closest('form[data-f]'); if (!f) return; e.preventDefault();
  const v = (id) => { const i = $r('#' + id); return i ? i.value.trim() : ''; };
  const limpar = (id) => { const i = $r('#' + id); if (i) i.value = ''; };
  switch (f.dataset.f) {
    case 'amigo': REDE.pedirAmizade(v('sNovoAmigo')); limpar('sNovoAmigo'); break;
    case 'criarCla': {
      const n = v('sClaNome'), t = v('sClaTag');
      if (n.length < 3 || n.length > 24) { UI.aviso('O nome do clã deve ter de 3 a 24 caracteres', '#ff9080'); return; }
      if (!/^[A-Za-z0-9]{2,5}$/.test(t)) { UI.aviso('A sigla deve ter de 2 a 5 letras ou números', '#ff9080'); return; }
      REDE.criarCla(n, t); break;
    }
    case 'convidar': REDE.convidarCla(v('sConvidar')); limpar('sConvidar'); break;
    case 'desc': REDE.salvarDescricao(v('sClaDesc')); break;
    case 'msg': REDE.enviarMsgCla(v('sMsgCla')); limpar('sMsgCla'); break;
  }
};

// ------------------------------------------------------------
// Negociação entre jogadores
// ------------------------------------------------------------
REDE.podeNegociarAqui = () => !!(J.z && J.z.def.cidade);
REDE.abrirTroca = acao(async (apelido) => {
  apelido = String(apelido || '').trim();
  if (!apelido) return;
  if (!REDE.podeNegociarAqui()) { UI.aviso('Negociações só podem ser feitas nas cidades', '#ff9080'); return; }
  if (REDE.troca && ['convite', 'aberta'].includes(REDE.troca.estado)) { UI.aviso('Termine a negociação atual primeiro', '#ff9080'); return; }
  await REDE.flush(true);
  const id = await REDE.rpc('abrir_troca', { p_pers: REDE.persId, p_apelido: apelido });
  REDE.trSel = new Set();
  REDE.troca = { id, estado: 'convite', a: REDE.perfil.id, nome_b: apelido, _outroAp: apelido, oferta_a: [], oferta_b: [], ouro_a: 0, ouro_b: 0 };
  REDE.mostrarTroca();
  UI.aviso(`Convite de negociação enviado a ${apelido}`);
});
REDE.aoMudarTroca = async function (t) {
  if (!t || !t.id) return;
  const eu = REDE.perfil.id;
  // convite novo para mim
  if (t.estado === 'convite' && t.b === eu) {
    if (Date.now() - new Date(t.criado_em).getTime() > 170000) return;
    const nm = await REDE.perfis([t.a]);
    REDE._fecharConvite = REDE.pedido(`${nm(t.a)} (${t.nome_a}) quer negociar com você.`, 'Negociar', () => REDE.aceitarTroca(t), () => REDE.rpc('cancelar_troca', { p_id: t.id }).catch(() => {}), 170);
    return;
  }
  if (!REDE.troca || REDE.troca.id !== t.id) return;
  const antes = REDE.troca.estado;
  REDE.troca = { ...REDE.troca, ...t };
  if (t.estado === 'concluida') {
    if (antes !== 'concluida') { REDE.fecharTroca(); await REDE.recarregarPers(); UI.aviso('Negociação concluída! Itens entregues.', '#9cf0a8'); }
    return;
  }
  if (t.estado === 'cancelada') {
    REDE.fecharTroca();
    const m = t.motivo && t.motivo !== 'cancelada' && t.motivo !== 'substituida' ? ': ' + REDE.msgErro(t.motivo) : '';
    UI.aviso('Negociação cancelada' + m, '#ff9080');
    return;
  }
  REDE.desenharTroca();
};
REDE.aceitarTroca = acao(async (t) => {
  if (!REDE.podeNegociarAqui()) { UI.aviso('Vá até uma cidade para negociar', '#ff9080'); REDE.rpc('cancelar_troca', { p_id: t.id }).catch(() => {}); return; }
  await REDE.flush(true);
  await REDE.rpc('aceitar_troca', { p_id: t.id, p_pers: REDE.persId });
  const nm = await REDE.perfis([t.a]);
  REDE.trSel = new Set();
  REDE.troca = { ...t, estado: 'aberta', _outroAp: nm(t.a) };
  REDE.mostrarTroca();
});
REDE.souA = () => REDE.troca && REDE.troca.a === REDE.perfil.id;
REDE.mostrarTroca = function () { $r('#modalTroca').hidden = false; $r('#trOuro').value = 0; REDE.desenharTroca(); };
REDE.fecharTroca = function () { $r('#modalTroca').hidden = true; UI.esconderTooltip(); };
REDE.cancelarTroca = acao(async () => { const t = REDE.troca; REDE.fecharTroca(); if (t && ['convite', 'aberta'].includes(t.estado)) await REDE.rpc('cancelar_troca', { p_id: t.id }); });
REDE.desenharTroca = function () {
  const t = REDE.troca; if (!t || $r('#modalTroca').hidden) return;
  const a = REDE.souA();
  const minha = (a ? t.oferta_a : t.oferta_b) || [], dele = (a ? t.oferta_b : t.oferta_a) || [];
  const okEu = a ? t.ok_a : t.ok_b, okDele = a ? t.ok_b : t.ok_a;
  const outro = t._outroAp || (a ? t.nome_b : t.nome_a);
  $r('#trTitulo').textContent = `Negociação com ${outro}`;
  $r('#trNomeDele').textContent = `Oferta de ${outro}`;
  const grade = (el, lista) => {
    el.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const o = lista[i]; const it = o && o.item;
      const d = UI.celula(it || null, 'cel');
      if (it) { d.addEventListener('mouseenter', () => UI.mostrarTooltip(IT.descreverItem(it), d)); d.addEventListener('mouseleave', UI.esconderTooltip); }
      el.appendChild(d);
    }
  };
  grade($r('#trMinha'), minha); grade($r('#trDele'), dele);
  $r('#trOuroDele').textContent = Number(a ? t.ouro_b : t.ouro_a || 0).toLocaleString('pt-BR');
  $r('#trOkEu').textContent = okEu ? '✔ Você confirmou' : ''; $r('#trOkDele').textContent = okDele ? `✔ ${outro} confirmou` : '';
  // inventário: clique para ofertar
  const inv = $r('#trInv'); inv.innerHTML = '';
  J.pers.inv.forEach((it, i) => {
    const d = UI.celula(it, 'cel'); if (REDE.trSel.has(i)) d.classList.add('selec');
    if (it) {
      d.addEventListener('click', () => { if (t.estado !== 'aberta') return; if (REDE.trSel.has(i)) REDE.trSel.delete(i); else if (REDE.trSel.size < 12) REDE.trSel.add(i); else { UI.aviso('No máximo 12 itens', '#ff9080'); return; } REDE.desenharTroca(); REDE.agendarOferta(); });
      d.addEventListener('mouseenter', () => UI.mostrarTooltip(IT.descreverItem(it), d)); d.addEventListener('mouseleave', UI.esconderTooltip);
    }
    inv.appendChild(d);
  });
  $r('#trSeuOuro').textContent = (J.pers.ouro || 0).toLocaleString('pt-BR');
  const st = $r('#trStatus'), bc = $r('#trConfirmar');
  if (t.estado === 'convite') { st.textContent = `Aguardando ${outro} aceitar o convite…`; bc.disabled = true; }
  else if (REDE._ofertando) { st.textContent = 'Atualizando a oferta…'; bc.disabled = true; }
  else if (okEu && !okDele) { st.textContent = `Aguardando ${outro} confirmar. Qualquer mudança nas ofertas desfaz as confirmações.`; bc.disabled = true; }
  else { st.textContent = 'Clique nos itens do seu inventário para oferecê-los. Confira a oferta do outro jogador e confirme. A troca só acontece quando os dois confirmam.'; bc.disabled = false; }
  $r('#trOuro').disabled = t.estado !== 'aberta';
};
let _tOferta = null;
REDE.agendarOferta = function () { REDE._ofertando = true; clearTimeout(_tOferta); _tOferta = setTimeout(REDE.enviarOferta, 450); REDE.desenharTroca(); };
REDE.enviarOferta = async function () {
  const t = REDE.troca; if (!t || t.estado !== 'aberta') { REDE._ofertando = false; return; }
  const ouro = Math.max(0, Math.floor(Number($r('#trOuro').value) || 0));
  if (ouro > (J.pers.ouro || 0)) { UI.aviso('Ouro insuficiente', '#ff9080'); $r('#trOuro').value = J.pers.ouro || 0; }
  try {
    await REDE.flush(true);
    for (const i of [...REDE.trSel]) if (!J.pers.inv[i]) REDE.trSel.delete(i);
    await REDE.rpc('ofertar_troca', { p_id: t.id, p_slots: [...REDE.trSel], p_ouro: Math.min(ouro, J.pers.ouro || 0) });
  } catch (e) { REDE.avisoErro(e); }
  REDE._ofertando = false; REDE.desenharTroca();
};
REDE.confirmarTroca = acao(async () => {
  const t = REDE.troca; if (!t || t.estado !== 'aberta' || REDE._ofertando) return;
  await REDE.flush(true);
  const r = await REDE.rpc('confirmar_troca', { p_id: t.id });
  if (r === 'concluida') { REDE.troca.estado = 'concluida'; REDE.fecharTroca(); await REDE.recarregarPers(); UI.aviso('Negociação concluída! Itens entregues.', '#9cf0a8'); }
  else if (String(r).startsWith('falhou:')) { REDE.troca.estado = 'cancelada'; REDE.fecharTroca(); UI.aviso('A negociação falhou: ' + REDE.msgErro(r.slice(7)), '#ff9080'); }
  else { if (REDE.souA()) REDE.troca.ok_a = true; else REDE.troca.ok_b = true; REDE.desenharTroca(); }
});

// ------------------------------------------------------------
// Interface (HTML/CSS) e integração com o jogo
// ------------------------------------------------------------
(function () {
  const css = `
  .rCaixa { width: min(420px, 100%); background: rgba(18,14,11,.94); border: 2px solid var(--borda); border-radius: 4px; padding: 20px; display: flex; flex-direction: column; gap: 12px; text-align: left; box-shadow: 0 10px 50px #000; }
  .rCaixa.larga { width: min(620px, 100%); }
  .rCaixa label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; color: var(--texto2); }
  .rCaixa label small { font-size: 12px; }
  .rCaixa input, .sForm input, #trOuro { background: #0c0a08; border: 1px solid var(--borda); color: var(--texto); padding: 9px 10px; font: 15px var(--f-corpo); border-radius: 3px; }
  .rCaixa input:focus, .sForm input:focus, #trOuro:focus { outline: 2px solid var(--bronze); border-color: var(--bronze); }
  .rAbas { display: flex; gap: 4px; border-bottom: 1px solid var(--borda); }
  .rAba { flex: 1; background: none; border: 0; border-bottom: 2px solid transparent; color: var(--texto2); font: 700 15px var(--f-titulo); padding: 8px; cursor: pointer; letter-spacing: .05em; }
  .rAba.on { color: var(--bronze2); border-color: var(--bronze); }
  .rLink { background: none; border: 0; color: var(--bronze); cursor: pointer; font: 14px var(--f-corpo); text-decoration: underline; padding: 2px; }
  .rMsg { min-height: 1.2em; font-size: 14px; color: #ff9080; line-height: 1.4; } .rMsg.ok { color: var(--ok); }
  .rTxt { color: var(--texto2); font-size: 14px; line-height: 1.45; margin: 0; }
  .rTit { font-family: var(--f-titulo); color: var(--bronze2); margin: 0; font-size: 20px; text-align: center; }
  .rLista { display: flex; flex-direction: column; gap: 8px; }
  .rServ { display: grid; grid-template-columns: 1fr auto; text-align: left; gap: 2px 10px; background: linear-gradient(#251c15, #15100c); border: 2px solid var(--borda); color: var(--texto); padding: 12px 14px; cursor: pointer; border-radius: 4px; font-family: var(--f-corpo); }
  .rServ:hover, .rServ.sel { border-color: var(--bronze); }
  .rServ .sNome { font: 700 18px var(--f-titulo); color: var(--bronze2); } .rServ .sReg { color: var(--texto2); font-size: 13px; grid-column: 1; }
  .rServ .sEst { grid-row: 1 / span 2; grid-column: 2; align-self: center; color: var(--texto2); font-size: 13px; } .rServ .sEst.on { color: var(--ok); }
  .rPersL { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; background: rgba(12,10,8,.8); border: 1px solid var(--borda); padding: 10px 12px; border-radius: 4px; }
  .rPersL .pNome { font: 700 17px var(--f-titulo); color: var(--bronze2); } .rPersL .pInfo { color: var(--texto2); font-size: 13px; }
  .rBotoes { display: flex; justify-content: center; } .rConta { text-align: center; color: var(--texto2); font-size: 14px; }
  #rPedidos { position: fixed; top: 90px; left: 50%; transform: translateX(-50%); z-index: 25; display: flex; flex-direction: column; gap: 6px; width: min(520px, 94vw); }
  .rPedido { display: flex; gap: 8px; align-items: center; background: rgba(18,14,11,.96); border: 1px solid var(--bronze); padding: 8px 10px; border-radius: 4px; box-shadow: 0 6px 24px #000; }
  .rPedido span { flex: 1; font-size: 14px; }
  #painelSocial { left: 10px; width: min(460px, 96vw); z-index: 11; }
  .sAbas { display: flex; border-bottom: 1px solid var(--borda); } .sAba { flex: 1; background: none; border: 0; border-bottom: 2px solid transparent; color: var(--texto2); font: 700 13px var(--f-titulo); padding: 8px; cursor: pointer; }
  .sAba.on { color: var(--bronze2); border-color: var(--bronze); }
  #socialCorpo { overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .sForm { display: flex; gap: 6px; } .sForm input { flex: 1; min-width: 0; font-size: 14px; padding: 7px 9px; } .sForm.col { flex-direction: column; }
  .sSub { font-family: var(--f-titulo); color: var(--bronze); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; margin-top: 10px; }
  .sL { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: center; background: rgba(12,10,8,.7); border: 1px solid #2a2118; padding: 6px 9px; border-radius: 3px; }
  .sL .sNm { font-weight: 700; color: var(--texto); } .sL .sNm small { color: var(--bronze); font-weight: 400; margin-left: 4px; }
  .sL .sOn, .sL .sOff { grid-column: 1; font-size: 12px; } .sOn { color: #8fdc7a; } .sOff { color: var(--texto2); font-size: 12px; }
  .sL .sBt { grid-row: 1 / span 2; grid-column: 2; display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; } .sL .btn { padding: 4px 8px; font-size: 11px; }
  .sCla { background: rgba(40,30,18,.5); border: 1px solid var(--borda); padding: 10px; border-radius: 4px; display: flex; flex-direction: column; gap: 6px; }
  .sClaN { font: 700 18px var(--f-titulo); color: var(--bronze2); } .sDesc { font-size: 14px; font-style: italic; color: var(--texto); }
  .sMural { max-height: 220px; overflow-y: auto; background: #0c0a08; border: 1px solid #2a2118; padding: 8px; font-size: 13px; display: flex; flex-direction: column; gap: 6px; border-radius: 3px; }
  #rSelo { background: #d03a2a; color: #fff; border-radius: 9px; font-size: 10px; padding: 0 5px; margin-left: 4px; }
  #rSaveStatus { position: fixed; top: 8px; left: 50%; transform: translateX(-50%); z-index: 9; font-size: 12px; color: #ffb080; text-shadow: 0 0 4px #000; }
  #modalTroca .caixa { max-width: 760px; }
  #modalTroca .corpo { padding: 12px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
  .trCols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .trLado { background: rgba(12,10,8,.6); border: 1px solid var(--borda); padding: 10px; border-radius: 4px; display: flex; flex-direction: column; gap: 8px; }
  .trLado h3, #modalTroca h4 { margin: 0; font: 700 14px var(--f-titulo); color: var(--bronze2); letter-spacing: .05em; }
  #trInv { grid-template-columns: repeat(10, 1fr); }
  .trG { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; }
  .trOuro { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #ecc451; } #trOuro { width: 120px; padding: 5px 8px; }
  .trOk { color: var(--ok); font-size: 13px; min-height: 1.1em; font-weight: 700; }
  .trBotoes { display: flex; gap: 10px; justify-content: flex-end; }
  #trConfirmar:disabled { opacity: .5; cursor: default; filter: none; }
  @media (max-width: 640px) { .trCols { grid-template-columns: 1fr; } .rPersL { grid-template-columns: 1fr auto; } .rPersL [data-excluir] { grid-column: 2; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const d = document.createElement('div');
  d.innerHTML = `
  <div class="tela" id="telaRede" hidden></div>
  <div id="rPedidos"></div>
  <div id="rSaveStatus" hidden></div>
  <div class="painel" id="painelSocial" hidden>
    <h2>Social <button class="fechar" id="fecharSocial" aria-label="Fechar">✕</button></h2>
    <div class="sAbas"><button class="sAba on" data-aba="amigos">Amigos</button><button class="sAba" data-aba="cla">Clã</button><button class="sAba" data-aba="online">Online</button></div>
    <div id="socialCorpo"></div>
  </div>
  <div class="modal" id="modalTroca" hidden>
    <div class="caixa">
      <h2><span id="trTitulo">Negociação</span><button class="fechar" id="trFechar" aria-label="Cancelar negociação">✕</button></h2>
      <div class="corpo">
        <div class="trCols">
          <div class="trLado"><h3>Sua oferta</h3><div class="trG" id="trMinha"></div>
            <label class="trOuro">Ouro <input id="trOuro" type="number" min="0" step="1" value="0"> <small>de <span id="trSeuOuro">0</span></small></label><div class="trOk" id="trOkEu"></div></div>
          <div class="trLado"><h3 id="trNomeDele">Oferta</h3><div class="trG" id="trDele"></div>
            <div class="trOuro">Ouro <b id="trOuroDele">0</b></div><div class="trOk" id="trOkDele"></div></div>
        </div>
        <h4>Seu inventário · clique para oferecer ou retirar</h4>
        <div class="gradeItens" id="trInv"></div>
        <div class="dica" id="trStatus"></div>
        <div class="trBotoes"><button class="btn sec" id="trCancelar">Cancelar</button><button class="btn grande" id="trConfirmar">Confirmar troca</button></div>
      </div>
    </div>
  </div>`;
  while (d.firstElementChild) document.body.insertBefore(d.firstElementChild, document.getElementById('tooltip'));

  // botão Social no HUD
  const menu = document.getElementById('botoesMenu');
  if (menu) { const b = document.createElement('button'); b.className = 'bmenu'; b.id = 'bSocial'; b.innerHTML = 'Social (O)<span id="rSelo" hidden></span>'; b.hidden = !REDE.ativo; b.addEventListener('click', () => REDE.alternarSocial()); menu.insertBefore(b, menu.lastElementChild); }
  $r('#fecharSocial').addEventListener('click', () => REDE.alternarSocial(false));
  $r('#painelSocial').addEventListener('click', (e) => { const a = e.target.closest('.sAba'); if (a) { REDE.abaSocial = a.dataset.aba; REDE.desenharSocial(); return; } REDE.cliqueSocial(e); });
  $r('#painelSocial').addEventListener('submit', REDE.enviarFormSocial);
  $r('#trFechar').addEventListener('click', REDE.cancelarTroca);
  $r('#trCancelar').addEventListener('click', REDE.cancelarTroca);
  $r('#trConfirmar').addEventListener('click', REDE.confirmarTroca);
  $r('#trOuro').addEventListener('input', () => REDE.agendarOferta());

  window.addEventListener('keydown', (e) => {
    if (!REDE.ativo || J.estado === 'menu' || (e.target && e.target.tagName === 'INPUT')) return;
    if (e.code === 'KeyO') REDE.alternarSocial();
    if (e.code === 'Escape') {
      if (!$r('#modalTroca').hidden) { REDE.cancelarTroca(); e.stopImmediatePropagation(); }
      else if (!$r('#painelSocial').hidden) { REDE.alternarSocial(false); e.stopImmediatePropagation(); }
    }
  }, true);

  if (!REDE.ativo) return;   // modo solo: o resto do jogo funciona como antes

  // salvamento: navegador (cópia) + nuvem
  J.temSave = () => false;
  J.salvar = function () {
    if (!J.pers || !REDE.persId) return;
    try { localStorage.setItem('cdc_copia_' + REDE.persId, JSON.stringify(J.pers)); } catch (e) { }
    REDE.sujo = true; REDE.agendarSave();
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') REDE.flush(); });
  const ent0 = J.entrarDef;
  J.entrarDef = function (def, chegada, opcoes) { ent0(def, chegada, opcoes); REDE.flush(); if (REDE.troca && REDE.troca.estado === 'aberta' && !def.cidade) REDE.cancelarTroca(); };

  // telas de entrada
  UI.telaInicio = function () { REDE.entrada(); };
  const tc0 = UI.telaClasse;
  UI.telaClasse = function () { $r('#telaRede').hidden = true; tc0(); };
  const ini0 = UI.iniciarJogo;
  UI.iniciarJogo = async function (novo) {
    if (novo) {
      const bt = $r('#bComecar'); if (bt.disabled) return;
      bt.disabled = true;
      try {
        const nome = $r('#nomePers').value.trim();
        J.novoPersonagem(UI.classeSel, nome);
        const r = await REDE.rpc('criar_personagem', { p_servidor: REDE.servidor, p_nome: J.pers.nome, p_classe: J.pers.classe, p_dados: J.pers });
        const linha = Array.isArray(r) ? r[0] : r;
        REDE.persId = linha.id; REDE.versao = linha.versao; REDE.sujo = false;
      } catch (e) { J.pers = null; $r('#avisoNovo').textContent = REDE.msgErro(e); return; }
      finally { bt.disabled = false; }
      REDE.esconderTelas();
      ini0(false);
    } else ini0(false);
    $r('#bSocial').hidden = false;
    REDE.assinar();
  };
  // "Sair" do menu: salva na nuvem antes de voltar
  window.addEventListener('load', () => {
    const b = $r('#bSairMenu');
    if (b) b.addEventListener('click', async (e) => { e.stopImmediatePropagation(); b.disabled = true; b.textContent = 'Salvando…'; await REDE.flush(true).catch(() => {}); location.reload(); }, true);
  });
  const fe0 = UI.fecharTudo;
  UI.fecharTudo = function () { fe0(); $r('#painelSocial').hidden = true; };
})();
