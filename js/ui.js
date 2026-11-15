// ============================================================
//  Interface, entrada e laço principal
// ============================================================
'use strict';

const UI = {};
const $ = (s) => document.querySelector(s);
const TECLAS_BARRA = ['LMB', 'RMB', 'Q', 'E', 'R', 'F'];
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------
// Ícones de itens desenhados em canvas
// ------------------------------------------------------------
const _icones = {};
UI.icone = function (tipo, cor) {
  const k = tipo + cor; if (_icones[k]) return _icones[k];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.translate(32, 32); g.lineJoin = 'round'; g.lineCap = 'round';
  const grad = g.createLinearGradient(-20, -20, 20, 20); grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.35, cor); grad.addColorStop(1, '#1a1410');
  g.fillStyle = grad; g.strokeStyle = '#0a0806'; g.lineWidth = 2.5;
  const forma = (fn) => { g.beginPath(); fn(); g.fill(); g.stroke(); };
  switch (tipo) {
    case 'machado': g.save(); g.rotate(-0.7); g.fillStyle = '#6a4a2a'; g.fillRect(-3, -24, 6, 50); g.strokeRect(-3, -24, 6, 50); g.fillStyle = grad; forma(() => { g.moveTo(2, -22); g.quadraticCurveTo(26, -20, 22, 2); g.quadraticCurveTo(14, -6, 2, -4); g.closePath(); }); g.restore(); break;
    case 'arco': g.lineWidth = 5; g.strokeStyle = cor; g.beginPath(); g.arc(-12, 0, 26, -1.15, 1.15); g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#ddd'; g.beginPath(); g.moveTo(-1, -24); g.lineTo(-1, 24); g.stroke(); break;
    case 'cajado': g.save(); g.rotate(0.5); g.fillStyle = '#6a4a2a'; g.fillRect(-2.5, -18, 5, 46); g.strokeRect(-2.5, -18, 5, 46); g.fillStyle = grad; forma(() => g.arc(0, -22, 8, 0, 7)); g.restore(); break;
    case 'escudo': forma(() => { g.moveTo(0, -24); g.lineTo(20, -16); g.quadraticCurveTo(20, 12, 0, 26); g.quadraticCurveTo(-20, 12, -20, -16); g.closePath(); }); break;
    case 'aljava': g.save(); g.rotate(0.4); forma(() => g.rect(-8, -14, 16, 36)); g.fillStyle = '#ddd'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 5, -14); g.lineTo(i * 5 - 3, -24); g.lineTo(i * 5 + 3, -24); g.fill(); } g.restore(); break;
    case 'orbe': forma(() => g.arc(0, 0, 18, 0, 7)); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-6, -6, 5, 0, 7); g.fill(); break;
    case 'elmo': forma(() => { g.moveTo(-18, 12); g.quadraticCurveTo(-20, -22, 0, -22); g.quadraticCurveTo(20, -22, 18, 12); g.lineTo(6, 12); g.lineTo(6, 2); g.lineTo(-6, 2); g.lineTo(-6, 12); g.closePath(); }); break;
    case 'peitoral': forma(() => { g.moveTo(-10, -22); g.lineTo(-22, -14); g.lineTo(-18, 2); g.lineTo(-14, 0); g.lineTo(-14, 24); g.lineTo(14, 24); g.lineTo(14, 0); g.lineTo(18, 2); g.lineTo(22, -14); g.lineTo(10, -22); g.quadraticCurveTo(0, -14, -10, -22); }); break;
    case 'luvas': forma(() => { g.moveTo(-12, 24); g.lineTo(-14, -4); g.lineTo(-12, -20); g.lineTo(-6, -20); g.lineTo(-5, -8); g.lineTo(-2, -22); g.lineTo(4, -22); g.lineTo(4, -8); g.lineTo(9, -18); g.lineTo(14, -16); g.lineTo(12, 0); g.lineTo(18, -4); g.lineTo(20, 2); g.lineTo(12, 24); g.closePath(); }); break;
    case 'botas': forma(() => { g.moveTo(-10, -24); g.lineTo(6, -24); g.lineTo(6, 8); g.lineTo(22, 14); g.lineTo(22, 24); g.lineTo(-12, 24); g.closePath(); }); break;
    case 'cinto': forma(() => g.rect(-24, -6, 48, 12)); g.fillStyle = '#d8b040'; g.fillRect(-7, -9, 14, 18); g.strokeRect(-7, -9, 14, 18); break;
    case 'amuleto': g.strokeStyle = '#c8a050'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -24); g.quadraticCurveTo(0, 0, 14, -24); g.stroke(); g.strokeStyle = '#0a0806'; g.lineWidth = 2.5; forma(() => { g.moveTo(0, -4); g.lineTo(10, 8); g.lineTo(0, 22); g.lineTo(-10, 8); g.closePath(); }); break;
    case 'anel': g.lineWidth = 7; g.strokeStyle = cor; g.beginPath(); g.arc(0, 5, 14, 0, 7); g.stroke(); g.lineWidth = 2.5; g.strokeStyle = '#0a0806'; g.fillStyle = '#fff'; forma(() => { g.moveTo(0, -18); g.lineTo(7, -10); g.lineTo(0, -4); g.lineTo(-7, -10); g.closePath(); }); break;
    case 'gema': forma(() => { g.moveTo(0, -20); g.lineTo(16, -6); g.lineTo(0, 22); g.lineTo(-16, -6); g.closePath(); }); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-16, -6); g.lineTo(16, -6); g.moveTo(0, -20); g.lineTo(-5, -6); g.lineTo(0, 22); g.lineTo(5, -6); g.lineTo(0, -20); g.stroke(); break;
  }
  return (_icones[k] = c.toDataURL());
};
UI.iconeItem = function (it) {
  if (it.tipo === 'gema') return UI.icone('gema', GEMAS[it.gema].cor);
  const tipo = it.slot === 'arma' || it.slot === 'offhand' ? it.base : it.slot;
  return UI.icone(tipo, RARIDADES[it.raridade].cor);
};

// ------------------------------------------------------------
// Avisos, banner, flashes
// ------------------------------------------------------------
UI.aviso = function (txt, cor) {
  const d = document.createElement('div'); d.className = 'aviso'; d.textContent = txt; if (cor) d.style.color = cor;
  $('#avisos').appendChild(d); setTimeout(() => d.remove(), 3100);
  while ($('#avisos').children.length > 4) $('#avisos').firstChild.remove();
};
UI.flashDano = function (k) { const f = $('#flashDano'); f.style.transition = 'none'; f.style.opacity = Math.min(0.85, 0.25 + k); requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; }); };
UI.aoEntrarZona = function (def, restaurado) {
  $('#zonaInfo').hidden = false; $('#minimapa').hidden = false; $('#hud').hidden = false; $('#rastreador').hidden = false;
  $('#zNome').textContent = def.nome;
  $('#zSub').textContent = def.cidade ? `Ato ${def.ato} · Cidade` : `${def.mapa ? 'Atlas' : 'Ato ' + def.ato} · Nível de área ${def.nivel}` + (def.chefe ? ' · Chefe: ' + CHEFES[def.chefe].nome : '');
  $('#zMods').innerHTML = (def.mods || []).map(m => esc(m.nome)).join('<br>');
  const b = $('#banner'); $('#bannerT').textContent = def.nome; $('#bannerS').textContent = def.cidade ? `Ato ${def.ato} · Cidade` : def.mapa ? `Mapa · Nível ${def.nivel}` : `Ato ${def.ato} · Nível ${def.nivel}`;
  if (!restaurado) { b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); }
  if (!restaurado) UI.esconderChefe();
  UI.atualizarRastreador();
  UI.gerarMinimapa();
  UI.fecharTudo();
  UI.atualizarTudo();
};
UI.mostrarChefe = function (e) { UI.chefe = e; $('#chefeBarra').hidden = false; $('#chefeNome').textContent = e.nome; };
UI.esconderChefe = function () { UI.chefe = null; $('#chefeBarra').hidden = true; };
UI.mostrarMorte = function () {
  $('#morteInfo').textContent = J.z.def.mapa ? 'Você perdeu parte da experiência do nível atual.' : 'Seus itens e sua experiência estão a salvo. Renasça na cidade ou recomece esta área.';
  $('#modalMorte').hidden = false;
};

// ------------------------------------------------------------
// HUD
// ------------------------------------------------------------
UI.montarBarra = function () {
  const b = $('#barra'); b.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div'); s.className = 'slot'; s.dataset.i = i; s.tabIndex = 0;
    s.innerHTML = `<div class="ic"></div><div class="cd"></div><div class="cdT"></div><div class="tecla">${TECLAS_BARRA[i]}</div>`;
    s.addEventListener('click', (ev) => { ev.stopPropagation(); UI.abrirSeletor(i, s); });
    s.addEventListener('contextmenu', (ev) => { ev.preventDefault(); UI.abrirSeletor(i, s); });
    s.addEventListener('mouseenter', () => { const id = J.pers.barra[i]; if (id) UI.mostrarTooltip(UI.ttHabilidade(id), s); });
    s.addEventListener('mouseleave', UI.esconderTooltip);
    b.appendChild(s);
  }
};
UI.atualizarBarra = function () {
  if (!J.pers) return;
  const slots = $('#barra').children;
  for (let i = 0; i < 6; i++) {
    const id = J.pers.barra[i]; const s = slots[i];
    const ic = s.querySelector('.ic');
    if (id) { const h = HABILIDADES[id]; ic.textContent = h.icone; s.style.setProperty('--c', h.cor); s.classList.remove('vazio'); }
    else { ic.textContent = '+'; s.classList.add('vazio'); s.style.removeProperty('--c'); }
  }
};
UI.atualizarHUD = function () {
  const jg = J.jog, st = J.st; if (!jg || !st) return;
  $('#orbeVida .liq').style.height = (Math.max(0, jg.vida) / st.vidaMax * 100) + '%';
  $('#orbeRec .liq').style.height = (jg.rec / st.recMax * 100) + '%';
  $('#vidaTxt').textContent = `${Math.ceil(Math.max(0, jg.vida))}/${st.vidaMax}`;
  $('#recTxt').textContent = `${Math.floor(jg.rec)}/${st.recMax}`;
  const slots = $('#barra').children;
  for (let i = 0; i < 6; i++) {
    const id = J.pers.barra[i]; const s = slots[i];
    if (!id) { s.style.setProperty('--p', 0); s.querySelector('.cdT').textContent = ''; continue; }
    const cd = jg.cds[id] || 0; const sk = HABILIDADES[id];
    const tot = (sk.cd || 0) * (1 - st.recarga / 100) || 1;
    s.style.setProperty('--p', cd > 0 ? cd / tot : 0);
    s.querySelector('.cdT').textContent = cd > 0 ? (cd < 10 ? cd.toFixed(1) : Math.ceil(cd)) : '';
    s.classList.toggle('semRec', (sk.custo || 0) > jg.rec);
  }
  const f = J.pers.frascos;
  $('#frascoVida .liq').style.height = (f.vida / 30 * 100) + '%';
  $('#frascoRecLiq').style.height = (f.rec / 30 * 100) + '%';
  const p = J.pers; const xpN = xpProximo(p.nivel);
  $('#xp div').style.width = (p.xp / xpN * 100) + '%';
  $('#xpTxt').textContent = `Nível ${p.nivel} · ${p.xp.toLocaleString('pt-BR')} / ${xpN.toLocaleString('pt-BR')} XP`;
  // buffs
  const bd = $('#buffs');
  const chave = J.buffs.map(b => b.id + Math.ceil(b.t)).join(',');
  if (bd.dataset.k !== chave) { bd.dataset.k = chave; bd.innerHTML = J.buffs.map(b => `<div class="buff" style="color:${b.cor}" title="${esc(b.nome)}">${b.icone}<span>${Math.ceil(b.t)}</span></div>`).join(''); }
  // chefe
  if (UI.chefe) { const e = UI.chefe; const pct = Math.max(0, e.vida / e.vidaMax * 100); $('#chefeVida').style.width = pct + '%'; $('#chefeGhost').style.width = pct + '%'; $('#chefeFase').textContent = `Fase ${e.boss.fase} de 3 · ${Math.max(0, Math.ceil(e.vida)).toLocaleString('pt-BR')} de vida`; if (e.morto) UI.esconderChefe(); }
};
UI.atualizarPontos = function () {
  if (!J.pers) return;
  const n = IT.pontosLivres(J.pers) + (J.pers.nivel >= 10 && !J.pers.asc ? 1 : 0) + (J.pers.asc ? IT.ascPontosLivres(J.pers) : 0);
  const el = $('#ptArvore'); el.hidden = n <= 0; el.textContent = n;
};
UI.atualizarTudo = function () {
  UI.atualizarBarra(); UI.atualizarPontos();
  const rc = CLASSES[J.pers.classe].recurso;
  document.documentElement.style.setProperty('--recCor', rc.cor);
  document.documentElement.style.setProperty('--recClaro', rc.cor + 'cc');
  $('#frascoRecLiq').style.background = `linear-gradient(${rc.cor}, #050a1a)`;
  if (!$('#painelInv').hidden) UI.atualizarInventario();
  if (!$('#painelPers').hidden) UI.atualizarPersonagem();
  if (!$('#modalArvore').hidden) UI.desenharArvore();
};

// ------------------------------------------------------------
// Tooltip
// ------------------------------------------------------------
UI.mostrarTooltip = function (html, ancora, extra) {
  const t = $('#tooltip'); t.innerHTML = `<div class="tt">${html}</div>` + (extra ? `<div class="tt">${extra}</div>` : ''); t.hidden = false;
  const r = ancora.getBoundingClientRect(); const tw = t.offsetWidth, th = t.offsetHeight;
  let x = r.right + 10, y = r.top;
  if (x + tw > window.innerWidth - 8) x = r.left - tw - 10;
  if (x < 8) x = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left));
  if (y + th > window.innerHeight - 8) y = window.innerHeight - th - 8;
  if (x < r.right && x + tw > r.left && y < r.bottom) y = Math.max(8, r.top - th - 8);
  t.style.left = x + 'px'; t.style.top = Math.max(8, y) + 'px';
};
UI.esconderTooltip = function () { $('#tooltip').hidden = true; };

UI.ttHabilidade = function (id) {
  const h = HABILIDADES[id]; const p = J.pers;
  const sk = IT.habEfetiva(p, id, J.st);
  const rank = p.arvore[id] || 0; const max = IT.maxRank(id);
  const sec = h.asc ? 'Ascendência · ' + ASCENDENCIAS[h.asc].nome : SECOES.find(s => s.id === h.secao).nome;
  let s = `<div class="tag">${sec}</div><h4>${h.icone} ${h.nome}</h4>`;
  s += `<div class="tt-l">Rank <b>${rank}/${max}</b>${J.st && J.st.ranks && rank ? ` (+${J.st.ranks} de itens)` : ''} · Requer nível ${h.nivel}</div>`;
  s += `<div class="desc">${h.desc}</div>`;
  const multR = rank ? sk.multRank : 1;
  if (h.mult) s += `<div>Dano: <span class="num">${Math.round(sk.mult * multR * 100)}%</span> do dano da arma${sk.golpes > 1 ? ` × ${sk.golpes}` : ''}${sk.pulsos > 1 ? ` × ${sk.pulsos} pulsos` : ''}</div>`;
  if (sk.qtd > 1 && ['projetil', 'radial', 'chuva', 'area', 'invocar'].includes(h.tipo)) s += `<div>Quantidade: <span class="num">${sk.qtd}</span></div>`;
  if (sk.custo) s += `<div>Custo: <span class="num">${Math.round(sk.custo)}</span> de ${CLASSES[h.classe].recurso.nome}</div>`;
  if (sk.gera) s += `<div>Gera: <span class="num">${sk.gera}</span> de ${CLASSES[h.classe].recurso.nome}</div>`;
  if (sk.cd) s += `<div>Recarga: <span class="num">${(sk.cdFinal ?? sk.cd).toFixed(1)}s</span></div>`;
  if (rank < max && rank > 0) s += `<div class="tt-dica">Próximo rank: +15% de dano</div>`;
  s += `<div class="tt-sep"></div><div class="mod ${p.arvore[id + '#apr'] ? '' : 'off'}">◆ Aprimorado: ${h.apr.desc}</div>`;
  h.mods.forEach((m, i) => { s += `<div class="mod ${p.arvore[id + '#mod'] === i + 1 ? '' : 'off'}">● ${m.nome}: ${m.desc}</div>`; });
  if (p.nivel < h.nivel) s += `<div class="req">Requer nível ${h.nivel}</div>`;
  return s;
};

// ------------------------------------------------------------
// Seletor de habilidades da barra
// ------------------------------------------------------------
UI.abrirSeletor = function (i, ancora) {
  const sel = $('#seletorHab');
  const lista = Object.keys(J.pers.arvore).filter(k => HABILIDADES[k] && J.pers.arvore[k] > 0);
  sel.innerHTML = '';
  const add = (id) => {
    const s = document.createElement('div'); s.className = 'slot' + (id ? '' : ' vazio');
    s.innerHTML = `<div class="ic">${id ? HABILIDADES[id].icone : '✕'}</div>`;
    if (id) s.style.setProperty('--c', HABILIDADES[id].cor);
    s.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const b = J.pers.barra; const j = b.indexOf(id);
      if (id && j >= 0) b[j] = b[i];
      b[i] = id; sel.hidden = true; UI.esconderTooltip(); UI.atualizarBarra(); J.salvar();
    });
    if (id) { s.addEventListener('mouseenter', () => UI.mostrarTooltip(UI.ttHabilidade(id), s)); s.addEventListener('mouseleave', UI.esconderTooltip); }
    sel.appendChild(s);
  };
  lista.forEach(add); add(null);
  sel.hidden = false;
  const r = ancora.getBoundingClientRect();
  sel.style.left = Math.max(8, Math.min(window.innerWidth - sel.offsetWidth - 8, r.left - sel.offsetWidth / 2 + 27)) + 'px';
  sel.style.top = (r.top - sel.offsetHeight - 10) + 'px';
};

// ------------------------------------------------------------
// Painéis
// ------------------------------------------------------------
UI.painelAberto = function () { return !$('#modalArvore').hidden || !$('#modalMapa').hidden || !$('#modalMenu').hidden || !$('#modalMorte').hidden || !$('#modalNpc').hidden; };
UI.fecharTudo = function () { for (const id of ['#painelInv', '#painelPers', '#modalArvore', '#modalMapa', '#modalMenu', '#modalNpc', '#painelBau']) $(id).hidden = true; $('#seletorHab').hidden = true; UI.esconderTooltip(); UI.gemaSel = null; };
UI.alternar = function (p) {
  if (J.estado === 'menu') return;
  UI.esconderTooltip(); $('#seletorHab').hidden = true;
  if (p === 'inv') { const el = $('#painelInv'); el.hidden = !el.hidden; if (!el.hidden) UI.atualizarInventario(); else UI.gemaSel = null; }
  if (p === 'pers') { const el = $('#painelPers'); el.hidden = !el.hidden; if (!el.hidden) UI.atualizarPersonagem(); }
  if (p === 'arvore') { const el = $('#modalArvore'); el.hidden = !el.hidden; if (!el.hidden) UI.desenharArvore(); }
  if (p === 'mapa') { const el = $('#modalMapa'); if (el.hidden) UI.abrirMapaMundo(false, false); else { el.hidden = true; if (J.estado === 'pausa' && J.mundo) J.estado = 'jogando'; } }
  if (p === 'portal') J.abrirPortalCidade();
  if (p === 'npc') { $('#modalNpc').hidden = true; }
  if (p === 'bau') { $('#painelBau').hidden = true; }
  if (p === 'menu') { const el = $('#modalMenu'); el.hidden = !el.hidden; if (J.estado === 'jogando' || J.estado === 'pausa') J.estado = el.hidden ? 'jogando' : 'pausa'; }
};

// ---------- inventário ----------
const ROT_EQUIP = { arma: 'Arma', offhand: 'Secundária', elmo: 'Elmo', peitoral: 'Peitoral', luvas: 'Luvas', botas: 'Botas', cinto: 'Cinto', amuleto: 'Amuleto', anel1: 'Anel', anel2: 'Anel' };
const AREA_EQUIP = { arma: 'a', elmo: 'e', offhand: 'o', peitoral: 'p', luvas: 'l', botas: 'b', anel1: 'an', cinto: 'c', anel2: 'an2', amuleto: 'am' };
UI.celula = function (it, cls) {
  const d = document.createElement('div'); d.className = cls;
  if (it) {
    d.classList.add(it.tipo === 'gema' ? 'normal' : it.raridade);
    d.innerHTML = `<img alt="" src="${UI.iconeItem(it)}">` + (it.encaixes && it.encaixes.length ? `<div class="encs">${it.encaixes.map(g => `<i style="${g ? 'background:' + GEMAS[g.gema].cor : ''}"></i>`).join('')}</div>` : '');
    if (it.tipo === 'equip' && (it.req > J.pers.nivel || (BASES[it.base].classe && BASES[it.base].slot === 'arma' && BASES[it.base].classe !== J.pers.classe))) d.classList.add('naoUsa');
  }
  return d;
};
UI.atualizarInventario = function () {
  const p = J.pers;
  if (UI.atualizarOuro) UI.atualizarOuro();
  const be = $('#bonecoEquip'); be.innerHTML = '';
  for (const slot of Object.keys(ROT_EQUIP)) {
    const it = p.equip[slot];
    const d = UI.celula(it, 'eq'); d.style.gridArea = AREA_EQUIP[slot];
    if (!it) d.innerHTML = `<span class="rot">${ROT_EQUIP[slot]}</span>`;
    d.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (ev.shiftKey) UI.removerGemas(it); else UI.desequipar(slot); });
    d.addEventListener('click', () => { if (UI.gemaSel != null && it) UI.encaixar(it); });
    d.addEventListener('mouseenter', () => { UI.hoverItem = { onde: 'equip', slot }; if (it) UI.mostrarTooltip(`<div class="tag">Equipado</div>` + IT.descreverItem(it), d); });
    d.addEventListener('mouseleave', () => { UI.hoverItem = null; UI.esconderTooltip(); });
    be.appendChild(d);
  }
  const g = $('#grade'); g.innerHTML = '';
  p.inv.forEach((it, i) => {
    const d = UI.celula(it, 'cel'); if (UI.gemaSel === i) d.classList.add('selec');
    d.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (!it) return; if (!$('#painelBau').hidden && !ev.shiftKey) { const k = J.pers.bau.indexOf(null); if (k < 0) { UI.aviso('Baú cheio', '#ff8080'); return; } J.pers.bau[k] = it; J.pers.inv[i] = null; UI.esconderTooltip(); UI.atualizarInventario(); UI.atualizarBau(); J.salvar(); return; } if (ev.shiftKey) UI.removerGemas(it); else if (it.tipo === 'gema') { UI.gemaSel = UI.gemaSel === i ? null : i; UI.atualizarInventario(); if (UI.gemaSel != null) UI.aviso('Clique em um item com encaixe livre'); } else UI.equipar(i); });
    d.addEventListener('click', () => { if (UI.gemaSel != null && it && it.tipo === 'equip') UI.encaixar(it); });
    d.addEventListener('mouseenter', () => {
      UI.hoverItem = { onde: 'inv', i };
      if (!it) return;
      let comp = null;
      if (it.tipo === 'equip') { const sl = it.slot === 'anel' ? 'anel1' : it.slot; const e = p.equip[sl]; if (e) comp = `<div class="tag">Equipado</div>` + IT.descreverItem(e); }
      UI.mostrarTooltip(IT.descreverItem(it), d, comp);
    });
    d.addEventListener('mouseleave', () => { UI.hoverItem = null; UI.esconderTooltip(); });
    g.appendChild(d);
  });
};
UI.equipar = function (i) {
  const p = J.pers; const it = p.inv[i]; if (!it || it.tipo !== 'equip') return;
  if (it.req > p.nivel) { UI.aviso(`Requer nível ${it.req}`, '#ff8080'); return; }
  const B = BASES[it.base];
  if (B.classe && B.slot === 'arma' && B.classe !== p.classe) { UI.aviso(`Apenas ${CLASSES[B.classe].nome}`, '#ff8080'); return; }
  let slot = it.slot;
  if (slot === 'anel') slot = !p.equip.anel1 ? 'anel1' : !p.equip.anel2 ? 'anel2' : 'anel1';
  const ant = p.equip[slot] || null;
  p.equip[slot] = it; p.inv[i] = ant;
  UI.esconderTooltip(); J.recalc(); UI.atualizarInventario(); UI.atualizarPersonagemSeAberto(); J.salvar();
};
UI.desequipar = function (slot) {
  const p = J.pers; const it = p.equip[slot]; if (!it) return;
  const i = p.inv.indexOf(null); if (i < 0) { UI.aviso('Inventário cheio', '#ff8080'); return; }
  p.inv[i] = it; delete p.equip[slot];
  UI.esconderTooltip(); J.recalc(); UI.atualizarInventario(); UI.atualizarPersonagemSeAberto(); J.salvar();
};
UI.encaixar = function (alvo) {
  const p = J.pers; const gi = UI.gemaSel; const gema = p.inv[gi];
  if (!gema || gema.tipo !== 'gema') { UI.gemaSel = null; return; }
  const k = alvo.encaixes.indexOf(null);
  if (k < 0) { UI.aviso(alvo.encaixes.length ? 'Sem encaixes livres' : 'Este item não tem encaixes', '#ff8080'); return; }
  alvo.encaixes[k] = { gema: gema.gema, q: gema.q }; p.inv[gi] = null; UI.gemaSel = null;
  UI.aviso(`${gema.nome} encaixada`);
  J.recalc(); UI.esconderTooltip(); UI.atualizarInventario(); UI.atualizarPersonagemSeAberto(); J.salvar();
};
UI.removerGemas = function (it) {
  if (!it || !it.encaixes) return;
  const p = J.pers; let n = 0;
  it.encaixes.forEach((g, k) => { if (!g) return; const i = p.inv.indexOf(null); if (i < 0) return; p.inv[i] = { uid: IT.uid(), tipo: 'gema', gema: g.gema, q: g.q, nome: GEMAS[g.gema].nome + ' ' + QUALIDADES[g.q].nome, raridade: 'gema' }; it.encaixes[k] = null; n++; });
  if (n) { UI.aviso(`${n} jóia(s) removida(s)`); J.recalc(); UI.esconderTooltip(); UI.atualizarInventario(); J.salvar(); }
};
UI.combinarGemas = function () {
  const p = J.pers; let feitas = 0, mudou = true;
  while (mudou) {
    mudou = false;
    const grupos = {};
    p.inv.forEach((it, i) => { if (it && it.tipo === 'gema' && it.q < QUALIDADES.length - 1) (grupos[it.gema + '_' + it.q] = grupos[it.gema + '_' + it.q] || []).push(i); });
    for (const [k, idx] of Object.entries(grupos)) if (idx.length >= 3) {
      const [g, q] = k.split('_'); idx.slice(0, 3).forEach(i => p.inv[i] = null);
      p.inv[idx[0]] = { uid: IT.uid(), tipo: 'gema', gema: g, q: +q + 1, nome: GEMAS[g].nome + ' ' + QUALIDADES[+q + 1].nome, raridade: 'gema' };
      feitas++; mudou = true; break;
    }
  }
  UI.aviso(feitas ? `${feitas} jóia(s) aprimorada(s)` : 'Precisa de 3 jóias iguais da mesma qualidade', feitas ? null : '#ff9090');
  UI.atualizarInventario(); J.salvar();
};
UI.organizar = function () {
  const p = J.pers; const ordem = { unico: 0, raro: 1, magico: 2, normal: 3, gema: 4 };
  const its = p.inv.filter(Boolean).sort((a, b) => (ordem[a.raridade] - ordem[b.raridade]) || ((b.ilvl || 0) - (a.ilvl || 0)));
  p.inv = its.concat(new Array(40 - its.length).fill(null));
  UI.atualizarInventario(); J.salvar();
};
UI.descartarHover = function () {
  const h = UI.hoverItem; if (!h || h.onde !== 'inv') return;
  const it = J.pers.inv[h.i]; if (!it) return;
  J.pers.inv[h.i] = null; UI.aviso(`${it.nome} descartado`, '#c0a080');
  if (UI.gemaSel === h.i) UI.gemaSel = null;
  UI.esconderTooltip(); UI.atualizarInventario(); J.salvar();
};

// ---------- personagem ----------
UI.atualizarPersonagemSeAberto = function () { if (!$('#painelPers').hidden) UI.atualizarPersonagem(); };
UI.atualizarPersonagem = function () {
  const p = J.pers, s = J.st;
  $('#persTitulo').textContent = `${p.nome} — ${p.asc ? ASCENDENCIAS[p.asc].nome : CLASSES[p.classe].nome} nível ${p.nivel}`;
  const L = (n, v) => `<div class="stat"><span>${n}</span><b>${v}</b></div>`;
  const pc = v => `${Math.round(v)}%`;
  let h = '';
  h += `<div class="statT">Atributos</div>` + L('Força', s.forca) + L('Destreza', s.destreza) + L('Inteligência', s.inteligencia);
  h += `<div class="statT">Ofensiva</div>` + L('Dano da arma', `${s.dano[0]}–${s.dano[1]}`) + L('Dano aumentado', pc(s.danoPct)) + L('Ataques por segundo', s.velAtaque.toFixed(2)) + L('Chance de crítico', pc(s.critChance)) + L('Dano crítico', '+' + pc(s.danoCrit)) + L('DPS estimado (básico)', s.dps.toLocaleString('pt-BR'));
  for (const [k, n] of [['fogo', 'Fogo'], ['frio', 'Frio'], ['raio', 'Raio'], ['veneno', 'Veneno'], ['fisico', 'Físico']]) if (s.danoElem[k]) h += L('Dano de ' + n, '+' + pc(s.danoElem[k]));
  if (s.danoDot) h += L('Dano ao longo do tempo', '+' + pc(s.danoDot));
  h += `<div class="statT">Defensiva</div>` + L('Vida', s.vidaMax) + L('Armadura', s.armadura) + L('Regeneração de vida', s.regenVida.toFixed(1) + '/s') + L('Redução de dano', pc(s.redDano)) + L('Bloqueio', pc(s.bloqueio)) + L('Esquiva', pc(s.esquiva));
  const rc = v => `<span style="color:${v < 0 ? '#ff6060' : v >= 75 ? '#8fdc7a' : 'inherit'}">${Math.round(v)}%</span>`;
  h += L('Resistência a Fogo', rc(s.res.fogo)) + L('Resistência a Frio', rc(s.res.frio)) + L('Resistência a Raio', rc(s.res.raio)) + L('Resistência a Veneno', rc(s.res.veneno));
  h += `<div class="statT">Utilidade</div>` + L(CLASSES[p.classe].recurso.nome + ' máxima', s.recMax) + L('Regeneração de recurso', s.regenRec.toFixed(1) + '/s') + L('Velocidade de movimento', pc((s.velMov / 7.2 - 1) * 100)) + L('Redução de recarga', pc(s.recarga)) + L('Área de efeito', '+' + pc((s.area - 1) * 100)) + L('Raridade de itens', '+' + pc(s.achado));
  if (p.penalRes) h += `<div class="dica">Penalidade de resistência nesta região: −${p.penalRes}%.</div>`;
  h += `<div class="dica">Mapas concluídos: ${p.mapasFeitos} · Maior nível de mapa liberado: ${p.mapaMax || '—'}</div>`;
  $('#persCorpo').innerHTML = h;
};

// ------------------------------------------------------------
// Árvore de habilidades estilo Diablo IV
// ------------------------------------------------------------
UI.abaArvore = 'classe';
UI.desenharArvore = function () {
  const p = J.pers;
  const livres = IT.pontosLivres(p);
  $('#pontosInfo').innerHTML = `Pontos: <b>${livres}</b>` + (p.asc ? ` · Ascendência: <b>${IT.ascPontosLivres(p)}</b>` : '');
  document.querySelectorAll('.aba').forEach(a => a.classList.toggle('on', a.dataset.aba === UI.abaArvore));
  const cont = $('#arvore'); cont.innerHTML = '';
  if (UI.abaArvore === 'asc') return UI.desenharAsc(cont);
  const W = 1040, secH = 210, topo = 70;
  const H = topo + secH * SECOES.length + 30;
  cont.style.width = W + 'px'; cont.style.height = H + 'px';
  const cx = W / 2;
  const linhas = [];
  const habs = IT.habsDaClasse(p.classe);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H);
  cont.appendChild(svg);
  const linha = (x1, y1, x2, y2, ativa, grossa) => { const l = document.createElementNS(svgNS, 'line'); l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2); l.setAttribute('stroke', ativa ? '#e8b860' : '#3a2e22'); l.setAttribute('stroke-width', grossa ? 6 : 3); if (ativa) l.setAttribute('filter', 'drop-shadow(0 0 4px #ffb050)'); svg.appendChild(l); };
  // tronco
  const gastos = IT.pontosGastos(p);
  SECOES.forEach((sec, i) => {
    const y = topo + i * secH;
    const liberada = IT.pontosAntes(p.arvore, i) >= sec.req;
    if (i > 0) linha(cx, y - secH, cx, y, liberada, true);
    const r = document.createElement('div'); r.className = 'secRot' + (liberada ? '' : ' bloq');
    r.style.left = cx + 'px'; r.style.top = y + 'px';
    r.innerHTML = `${sec.nome}<small>${liberada ? (sec.req ? 'Desbloqueada' : 'Início') : `Requer ${sec.req} pontos (${IT.pontosAntes(p.arvore, i)}/${sec.req})`}</small>`;
    r.style.background = 'radial-gradient(#1a140f 50%, transparent 72%)'; r.style.padding = '18px 30px';
    cont.appendChild(r);
    // conteúdos
    if (sec.id === 'chave') {
      CHAVES[p.classe].forEach((k, j) => {
        const x = cx + (j ? 1 : -1) * 200, yy = y + 20;
        linha(cx, y, x, yy, p.arvore.chave === k.id);
        const n = UI.no('chave', x, yy, '✪', p.arvore.chave === k.id, liberada && !p.arvore.chave && livres > 0, !liberada);
        n.insertAdjacentHTML('beforeend', `<div class="nm" style="top:-34px;transform:translateX(-50%) rotate(-45deg)">${k.nome}</div>`);
        n.querySelector('.nm').style.transformOrigin = 'center';
        n.addEventListener('click', () => UI.tentar(() => IT.alocar(p, 'chave', k.id)));
        n.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (p.arvore.chave === k.id) UI.tentar(() => IT.desalocar(p, 'chave')); });
        UI.hoverTT(n, () => `<div class="tag">Passiva-Chave</div><h4>${k.nome}</h4><div class="desc">${k.desc}</div><div class="tt-dica">Escolha apenas uma.</div>`);
      });
      return;
    }
    const hs = habs.filter(id => HABILIDADES[id].secao === sec.id);
    const ps = PASSIVAS.filter(x => x.secao === sec.id);
    hs.forEach((id, j) => {
      const lado = j % 2 ? 1 : -1;
      const x = cx + lado * 175, yy = y + (j > 1 ? 70 : 0);
      UI.cluster(cont, linha, id, x, yy, lado, liberada, cx, y);
    });
    ps.forEach((pa, j) => {
      const lado = j % 2 ? 1 : -1;
      const x = cx + lado * (j < 2 ? 70 : 110), yy = y + 62 + (j >= 2 ? 32 : 0);
      const rk = p.arvore[pa.id] || 0;
      linha(cx, y, x, yy, rk > 0);
      const n = UI.no('pas', x, yy, rk ? `${rk}/${pa.max}` : '+', rk > 0, liberada && livres > 0 && rk < pa.max, !liberada);
      n.insertAdjacentHTML('beforeend', `<div class="rk">${pa.nome}</div>`);
      n.addEventListener('click', () => UI.tentar(() => IT.alocar(p, pa.id)));
      n.addEventListener('contextmenu', (ev) => { ev.preventDefault(); UI.tentar(() => IT.desalocar(p, pa.id)); });
      UI.hoverTT(n, () => `<div class="tag">Passiva · ${sec.nome}</div><h4>${pa.nome}</h4><div class="desc">${pa.desc}</div><div class="tt-l">Rank <b>${rk}/${pa.max}</b></div>`);
    });
  });
};
UI.cluster = function (cont, linha, id, x, y, lado, liberada, cx, cy) {
  const p = J.pers; const h = HABILIDADES[id];
  const rk = p.arvore[id] || 0, max = IT.maxRank(id);
  const livres = IT.pontosLivres(p);
  const nivelOk = p.nivel >= h.nivel;
  if (cx !== undefined) linha(cx, cy, x, y, rk > 0);
  const n = UI.no('hab', x, y, h.icone, rk > 0, liberada && nivelOk && livres > 0 && rk < max, !liberada || !nivelOk);
  n.style.color = h.cor;
  n.insertAdjacentHTML('beforeend', `<div class="nm">${h.nome}</div><div class="rk">${rk}/${max}${nivelOk ? '' : ' · nv ' + h.nivel}</div>`);
  n.addEventListener('click', () => UI.tentar(() => IT.alocar(p, id)));
  n.addEventListener('contextmenu', (ev) => { ev.preventDefault(); UI.tentar(() => IT.desalocar(p, id)); });
  UI.hoverTT(n, () => UI.ttHabilidade(id));
  // aprimoramento
  const ax = x + lado * 82, ay = y;
  const apr = !!p.arvore[id + '#apr'];
  linha(x, y, ax, ay, apr);
  const na = UI.no('apr', ax, ay, '<span>◆</span>', apr, rk > 0 && !apr && livres > 0, rk === 0);
  na.addEventListener('click', () => UI.tentar(() => IT.alocar(p, id + '#apr')));
  na.addEventListener('contextmenu', (ev) => { ev.preventDefault(); UI.tentar(() => IT.desalocar(p, id + '#apr')); });
  UI.hoverTT(na, () => `<div class="tag">Aprimoramento</div><h4>${h.nome} Aprimorado</h4><div class="desc">${h.apr.desc}</div>`);
  // modificadores (escolha 1 de 2)
  const mod = p.arvore[id + '#mod'] || 0;
  h.mods.forEach((m, k) => {
    const mx = ax + lado * 72, my = ay + (k ? 40 : -40);
    linha(ax, ay, mx, my, mod === k + 1);
    const nm = UI.no('mod', mx, my, k ? 'II' : 'I', mod === k + 1, apr && !mod && livres > 0, !apr || (mod && mod !== k + 1));
    nm.addEventListener('click', () => UI.tentar(() => IT.alocar(p, id + '#mod', k + 1)));
    nm.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (mod === k + 1) UI.tentar(() => IT.desalocar(p, id + '#mod')); });
    UI.hoverTT(nm, () => `<div class="tag">Modificador (escolha 1 de 2)</div><h4>${m.nome}</h4><div class="desc">${m.desc}</div>`);
  });
};
UI.no = function (tipo, x, y, html, ativo, disp, bloq) {
  const n = document.createElement('div'); n.className = `no ${tipo}` + (ativo ? ' ativo' : disp ? ' disp' : '') + (bloq && !ativo ? ' bloq' : '');
  n.style.left = x + 'px'; n.style.top = y + 'px'; n.innerHTML = (tipo === 'chave' ? `<span>${html}</span>` : html);
  $('#arvore').appendChild(n); return n;
};
UI.hoverTT = function (el, fn) { el.addEventListener('mouseenter', () => UI.mostrarTooltip(fn(), el)); el.addEventListener('mouseleave', UI.esconderTooltip); };
UI.tentar = function (fn) {
  const err = fn();
  if (err) UI.aviso(err, '#ff9080');
  J.recalc(); UI.esconderTooltip(); UI.desenharArvore(); UI.atualizarBarra(); UI.atualizarPontos(); J.salvar();
};
UI.desenharAsc = function (cont) {
  const p = J.pers; const C = CLASSES[p.classe];
  cont.style.width = '1000px'; cont.style.height = 'auto';
  if (p.nivel < 10) { cont.innerHTML = `<div class="ascEscolha"><div class="ascCard" style="cursor:default"><h3>Bloqueada</h3><p>A Ascendência é liberada no nível 10. Ela concede duas habilidades exclusivas e quatro passivas notáveis.</p></div></div>`; return; }
  if (!p.asc) {
    const d = document.createElement('div'); d.className = 'ascEscolha';
    for (const aid of C.ascendencias) {
      const A = ASCENDENCIAS[aid]; const c = document.createElement('div'); c.className = 'ascCard'; c.tabIndex = 0;
      c.innerHTML = `<h3>${A.nome}</h3><div class="dica">${A.desc}</div><div class="statT">Habilidades</div><ul>${IT.habsDaAsc(aid).map(id => `<li>${HABILIDADES[id].icone} ${HABILIDADES[id].nome} (nv ${HABILIDADES[id].nivel})</li>`).join('')}</ul><div class="statT">Notáveis</div><ul>${A.nos.map(n => `<li>${n.nome}: ${n.desc}</li>`).join('')}</ul><button class="btn" style="width:100%">Escolher ${A.nome}</button>`;
      c.querySelector('button').addEventListener('click', () => { p.asc = aid; UI.aviso(`Você ascendeu como ${A.nome}!`, '#ffd23a'); J.recalc(); UI.desenharArvore(); UI.atualizarPontos(); J.salvar(); });
      d.appendChild(c);
    }
    cont.appendChild(d); return;
  }
  const A = ASCENDENCIAS[p.asc];
  const W = 1000, H = 520; cont.style.width = W + 'px'; cont.style.height = H + 'px';
  const svgNS = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H); cont.appendChild(svg);
  const linha = (x1, y1, x2, y2, ativa) => { const l = document.createElementNS(svgNS, 'line'); l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2); l.setAttribute('stroke', ativa ? '#e8b860' : '#3a2e22'); l.setAttribute('stroke-width', 3); svg.appendChild(l); };
  const t = document.createElement('div'); t.className = 'secRot'; t.style.left = W / 2 + 'px'; t.style.top = '50px'; t.innerHTML = `${A.nome}<small>${A.desc}</small>`; cont.appendChild(t);
  IT.habsDaAsc(p.asc).forEach((id, j) => UI.cluster(cont, linha, id, W / 2 + (j ? 1 : -1) * 160, 170, j ? 1 : -1, true));
  const livres = IT.ascPontosLivres(p);
  A.nos.forEach((no, j) => {
    const x = W / 2 + (j - 1.5) * 170, y = 370;
    const at = !!p.ascNos[no.id];
    if (j > 0) linha(W / 2 + (j - 2.5) * 170, y, x, y, at && p.ascNos[A.nos[j - 1].id]);
    const n = UI.no('chave', x, y, '✦', at, !at && livres > 0, false);
    n.insertAdjacentHTML('beforeend', `<div class="rk" style="bottom:-30px">${no.nome}</div>`);
    n.addEventListener('click', () => { if (at) return; if (IT.ascPontosLivres(p) <= 0) { UI.aviso('Sem pontos de ascendência (ganhe mais nos níveis 25 e 40)', '#ff9080'); return; } p.ascNos[no.id] = 1; J.recalc(); UI.desenharArvore(); UI.atualizarPontos(); J.salvar(); });
    n.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (!at) return; delete p.ascNos[no.id]; J.recalc(); UI.desenharArvore(); UI.atualizarPontos(); J.salvar(); });
    UI.hoverTT(n, () => `<div class="tag">Notável de Ascendência</div><h4>${no.nome}</h4><div class="desc">${no.desc}</div><div class="tt-dica">Pontos de ascendência: 2 no nível 10, +1 no 25 e +1 no 40.</div>`);
  });
};

// ------------------------------------------------------------
// Mapa do mundo
// ------------------------------------------------------------
UI.abrirMapaMundo = function (obrigatorio, podeViajar, soAtlas) {
  const p = J.pers;
  if (J.estado === 'jogando') J.estado = 'pausa';
  $('#fecharMapa').hidden = obrigatorio || !J.mundo;
  const viajar = (fn) => { $('#modalMapa').hidden = true; $('#modalMorte').hidden = true; fn(); };
  const corpo = $('#mapaCorpo'); corpo.innerHTML = '';
  if (!soAtlas) {
    const nota = document.createElement('div'); nota.className = 'mapaNota';
    nota.textContent = podeViajar ? 'Escolha uma Pedra de Passagem ativada para viajar.' : 'Para viajar, use uma Pedra de Passagem (ícone azul no minimapa) ou volte à cidade com um portal (tecla V).';
    corpo.appendChild(nota);
    const atos = document.createElement('div'); atos.className = 'atos';
    for (const ato of [1, 2, 3]) {
      const a = document.createElement('div'); a.className = 'ato'; a.innerHTML = `<h3>Ato ${['I', 'II', 'III'][ato - 1]}</h3>`;
      const areas = [];
      for (const z of ZONAS.filter(z => z.ato === ato)) { areas.push(z); if (z.saida && CIDADES[z.saida] && CIDADES[z.saida].ato === ato) areas.push(CIDADES[z.saida]); }
      if (ato > 1) areas.unshift(CIDADES['c' + ato]);
      for (const z of areas) {
        const conhecida = z.cidade ? p.cidades.includes(z.id) : p.zonas.includes(z.id);
        const temPedra = p.waypoints.includes(z.id);
        const b = document.createElement('button'); b.className = 'zonaBtn' + (z.cidade ? ' cidade' : '');
        b.disabled = !podeViajar || !temPedra || (J.z && J.z.def.id === z.id);
        const marca = z.cidade ? ' <span title="Cidade">⌂</span>' : (z.chefe ? ' <span class="bossI" title="Chefe">☠</span>' : '');
        const feito = z.chefe && p.chefesMortos.includes(z.chefe) ? ' <span class="ok">✓</span>' : '';
        b.innerHTML = `<span>${conhecida ? z.nome : '???'}${marca}${feito}</span><span class="lv">${z.cidade ? 'Cidade' : 'Nv ' + z.nivel}${temPedra ? ' · ◆' : ''}</span>`;
        b.title = temPedra ? 'Pedra de Passagem ativada' : conhecida ? 'Pedra de Passagem ainda não ativada nesta área' : 'Área desconhecida';
        b.addEventListener('click', () => viajar(() => J.entrarArea(z.id, 'passagem')));
        a.appendChild(b);
      }
      atos.appendChild(a);
    }
    corpo.appendChild(atos);
  }
  const at = document.createElement('div'); at.className = 'atlas';
  if (p.mapaMax > 0) {
    at.innerHTML = `<h3 class="statT" style="margin-top:0">Atlas dos Mapas</h3><div class="dica" style="margin-bottom:8px">${soAtlas ? 'Escolha o nível do mapa. ' : 'Use o Dispositivo de Mapas na cidade para abrir um mapa. '}Cada nível aumenta a força dos monstros e adiciona modificadores com mais itens. Conclua um mapa para liberar o próximo.</div>`;
    const tiers = document.createElement('div'); tiers.className = 'tiers';
    const ini = Math.max(1, p.mapaMax - 11);
    for (let t = ini; t <= p.mapaMax; t++) {
      const b = document.createElement('button'); b.className = 'tierBtn'; b.textContent = t; b.title = `Mapa nível ${t} · Nível de área ${44 + t * 2}`;
      b.disabled = !soAtlas;
      b.addEventListener('click', () => viajar(() => J.entrarDef(J.defMapa(t), 'inicio')));
      tiers.appendChild(b);
    }
    at.appendChild(tiers);
  } else at.innerHTML = `<div class="dica">O Atlas dos Mapas será liberado após derrotar Vorthak, Senhor das Cinzas, no Ato III.</div>`;
  corpo.appendChild(at);
  $('#modalMapa').hidden = false;
};

// ------------------------------------------------------------
// NPCs, baú e rastreador de missões
// ------------------------------------------------------------
const textoRecompensa = (r) => [r.xp ? 'Experiência' : '', r.ponto ? `+${r.ponto} ponto${r.ponto > 1 ? 's' : ''} de habilidade` : '', r.item ? ({ magico: 'Item mágico', raro: r.arma ? 'Arma rara da sua classe' : 'Item raro', unico: 'Item único' }[r.item]) : '', r.gema ? 'Jóia' : ''].filter(Boolean).join(' · ');
const objetivoMissao = (m) => {
  const st = J.pers.missoes[m.id];
  if (st && st.e === 'pronta') return `Volte a ${NPCS[m.npc].nome}`;
  switch (m.tipo) {
    case 'zona': return `Atravesse: ${TODAS_AREAS[m.zona].nome}`;
    case 'coletar': return `${m.item}: ${st ? st.p : 0}/${m.qtd} (${m.zonas.map(z => TODAS_AREAS[z].nome).join(', ')})`;
    case 'chefe': return `Derrote ${CHEFES[m.chefe].nome}`;
    case 'objeto': return `Ative o ${m.objeto} em ${TODAS_AREAS[m.zona].nome}`;
    case 'raro': return `Monstros raros: ${st ? st.p : 0}/${m.qtd} em ${TODAS_AREAS[m.zona].nome}`;
  }
  return '';
};
UI.abrirNpc = function (id) {
  const N = NPCS[id]; const box = $('#npcCorpo');
  $('#npcNome').innerHTML = `${esc(N.nome)}<span class="npcTit">${esc(N.titulo)}</span>`;
  let h = `<p class="npcFala">“${esc(N.fala)}”</p>`;
  const ms = J.missoesDoNpc(id);
  if (!ms.length) h += '<div class="dica">Não há missões no momento.</div>';
  box.innerHTML = h;
  for (const m of ms) {
    const est = J.mEstado(m.id);
    const c = document.createElement('div'); c.className = 'missaoCard';
    c.innerHTML = `<h4>${esc(m.nome)}<small>${est === 'pronta' ? 'Concluída' : est === 'ativa' ? 'Em andamento' : 'Nova'}</small></h4><p>${esc(m.texto)}</p><div class="rec">Recompensa: ${textoRecompensa(m.recompensa)}</div>` + (est === 'ativa' ? `<div class="dica">${esc(objetivoMissao(m))}</div>` : '');
    if (!est) { const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Aceitar missão'; b.addEventListener('click', () => { J.aceitarMissao(m.id); UI.abrirNpc(id); }); c.appendChild(b); }
    if (est === 'pronta') { const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Entregar e receber recompensa'; b.addEventListener('click', () => { J.entregarMissao(m.id); UI.abrirNpc(id); }); c.appendChild(b); }
    box.appendChild(c);
  }
  if (id === 'nessa') { const jg = J.jog; jg.vida = J.st.vidaMax; J.pers.frascos.vida = 30; J.pers.frascos.rec = 30; }
  $('#modalNpc').hidden = false;
  if (J.estado === 'jogando') J.estado = 'pausa';
};
UI.abrirBau = function () { $('#painelBau').hidden = false; $('#painelInv').hidden = false; $('#painelPers').hidden = true; UI.atualizarBau(); UI.atualizarInventario(); };
UI.atualizarBau = function () {
  const g = $('#gradeBau'); g.innerHTML = '';
  J.pers.bau.forEach((it, i) => {
    const d = UI.celula(it, 'cel');
    d.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (!it) return; const k = J.pers.inv.indexOf(null); if (k < 0) { UI.aviso('Inventário cheio', '#ff8080'); return; } J.pers.inv[k] = it; J.pers.bau[i] = null; UI.esconderTooltip(); UI.atualizarBau(); UI.atualizarInventario(); J.salvar(); });
    d.addEventListener('mouseenter', () => { if (it) UI.mostrarTooltip(IT.descreverItem(it), d); });
    d.addEventListener('mouseleave', UI.esconderTooltip);
    g.appendChild(d);
  });
};
UI.atualizarRastreador = function () {
  const el = $('#rastreador'); if (!J.pers) return;
  const ativas = MISSOES.filter(m => ['ativa', 'pronta'].includes(J.mEstado(m.id))).slice(0, 5);
  el.innerHTML = ativas.map(m => `<div class="rq ${J.mEstado(m.id)}"><b>${esc(m.nome)}</b><span>${esc(objetivoMissao(m))}</span></div>`).join('');
};

// ------------------------------------------------------------
// Minimapa e sobreposição (barras, números, rótulos)
// ------------------------------------------------------------
UI.gerarMinimapa = function () {
  const m = J.mundo; const c = document.createElement('canvas'); const N = 200; c.width = c.height = N;
  const g = c.getContext('2d'); const img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i / N - 0.5) * (m.AREA * 2 + 40), z = (j / N - 0.5) * (m.AREA * 2 + 40); const e = m.borda(x, z);
    const k = (j * N + i) * 4;
    if (e < -0.5) { img.data[k] = 120; img.data[k + 1] = 105; img.data[k + 2] = 80; img.data[k + 3] = 200; }
    else if (e < 2) { img.data[k] = 200; img.data[k + 1] = 170; img.data[k + 2] = 110; img.data[k + 3] = 230; }
    else img.data[k + 3] = 0;
  }
  g.putImageData(img, 0, 0);
  UI.mini = c;
};
UI.desenharMinimapa = function () {
  const cv = $('#minimapa'); const g = cv.getContext('2d'); const W = cv.width;
  const m = J.mundo, jg = J.jog; if (!m || !UI.mini) return;
  g.clearRect(0, 0, W, W);
  g.save(); g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.clip();
  const escala = 2.2; // pixels do minimapa por unidade de 200px
  const vis = 90; // unidades visíveis
  const px = (x) => W / 2 + (x - jg.x) / vis * W, pz = (z) => W / 2 + (z - jg.z) / vis * W;
  const L = m.AREA + 20; const tamMini = L * 2 / vis * W;
  g.globalAlpha = 0.9; g.drawImage(UI.mini, px(-L), pz(-L), tamMini, tamMini); g.globalAlpha = 1;
  for (const e of J.inimigos) {
    if (e.morto) continue;
    const x = px(e.x), y = pz(e.z); if (x < 0 || y < 0 || x > W || y > W) continue;
    g.fillStyle = e.rar === 'chefe' ? '#ff3020' : e.rar === 'raro' ? '#ffff60' : e.rar === 'magico' ? '#8080ff' : '#d04030';
    g.beginPath(); g.arc(x, y, e.rar === 'chefe' ? 5 : e.rar === 'normal' ? 1.8 : 2.8, 0, 7); g.fill();
  }
  for (const pt of J.portoes) { g.fillStyle = pt.saida && !J.z.saidaAberta ? '#ff5040' : pt.entrada ? '#ffb060' : '#8aa0ff'; g.fillRect(px(pt.x) - 4, pz(pt.z) - 4, 8, 8); g.strokeStyle = '#000'; g.lineWidth = 1; g.strokeRect(px(pt.x) - 4, pz(pt.z) - 4, 8, 8); }
  for (const it of J.interativos) {
    const x = px(it.x), y = pz(it.z);
    if (it.tipo === 'passagem') { g.fillStyle = it.ativa ? '#4aa8ff' : '#406080'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y); g.closePath(); g.fill(); }
    else if (it.tipo === 'npc') { const mk = J.marcadorNpc(it.id); g.fillStyle = mk === '!' || mk === '?' ? '#ffd23a' : '#e0d0b0'; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
    else if (it.tipo === 'objetivo') { g.fillStyle = '#40ffd0'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    else if (it.tipo === 'portal') { g.fillStyle = '#9080ff'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); }
    else if (it.tipo === 'tesouro') { g.fillStyle = '#ffc840'; g.fillRect(x - 4, y - 3, 8, 6); g.strokeStyle = '#000'; g.strokeRect(x - 4, y - 3, 8, 6); }
    else if (it.tipo === 'santuario') { g.fillStyle = '#b080ff'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 4, y); g.lineTo(x, y + 6); g.lineTo(x - 4, y); g.closePath(); g.fill(); }
    else { g.fillStyle = '#c0a060'; g.fillRect(x - 3, y - 3, 6, 6); }
  }
  // jogador
  g.translate(W / 2, W / 2); g.rotate(-jg.ang + Math.PI);
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(0, 2.5); g.lineTo(-4.5, 5); g.closePath(); g.fill();
  g.restore();
};

UI.desenharOverlay = function () {
  const cv = UI.ov, g = UI.ovg; const dpr = UI.dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  if (!J.mundo || !J.jog || J.estado === 'menu') return;
  const jg = J.jog; const v = new THREE.Vector3(); const o = {};
  // barras dos inimigos
  for (const e of J.inimigos) {
    if (e.morto || !e.m.raiz.visible || e.boss || e.estado === 'dormindo' && e.rar === 'normal') continue;
    if (e.vida >= e.vidaMax && e.rar === 'normal') continue;
    v.set(e.x, e.y + (e.m.alturaCabeca || 1.8) * e.m.escala + 0.4, e.z); ENG.paraTela(v, o);
    if (o.z > 1) continue;
    const w = e.rar === 'normal' ? 46 : 70, h = e.rar === 'normal' ? 5 : 7;
    g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(o.x - w / 2 - 1, o.y - 1, w + 2, h + 2);
    g.fillStyle = e.rar === 'raro' ? '#d8b020' : e.rar === 'magico' ? '#4a5ae0' : '#c02a20';
    g.fillRect(o.x - w / 2, o.y, w * Math.max(0, e.vida / e.vidaMax), h);
    if (e.rar !== 'normal') {
      g.font = '600 13px "Alegreya Sans", sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#000';
      g.fillStyle = e.rar === 'raro' ? '#ffff77' : '#8888ff';
      g.strokeText(e.nome, o.x, o.y - 5); g.fillText(e.nome, o.x, o.y - 5);
      if (e.mods.length && e.rar === 'raro') { const t = e.mods.map(id => MODS_RAROS.find(x => x.id === id).nome).join(' · '); g.font = '500 11px "Alegreya Sans", sans-serif'; g.fillStyle = '#d8c890'; g.strokeText(t, o.x, o.y - 19); g.fillText(t, o.x, o.y - 19); }
    }
  }
  // barras dos lacaios
  for (const l of J.lacaios) { v.set(l.x, l.y + 2.1, l.z); ENG.paraTela(v, o); g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(o.x - 16, o.y, 32, 4); g.fillStyle = '#5ab0ff'; g.fillRect(o.x - 15, o.y + 1, 30 * Math.max(0, l.vida / l.vidaMax), 2); }
  // rótulos de saque
  UI.rotulos = [];
  const lista = J.drops.filter(d => Math.hypot(d.x - jg.x, d.z - jg.z) < 45).map(d => { v.set(d.x, d.y + 0.6, d.z); ENG.paraTela(v, o); return { d, x: o.x, y: o.y, z: o.z }; }).filter(r => r.z < 1).sort((a, b) => a.y - b.y);
  g.textAlign = 'center';
  for (const r of lista) {
    const it = r.d.item;
    const txt = it.tipo === 'gema' ? it.nome : it.nome;
    const cor = it.tipo === 'gema' ? GEMAS[it.gema].cor : RARIDADES[it.raridade].cor;
    g.font = (it.raridade === 'unico' || it.raridade === 'raro' ? '700 ' : '500 ') + '13px "Alegreya Sans", sans-serif';
    const w = g.measureText(txt).width + 14, h = 20;
    let x = r.x - w / 2, y = r.y - h - 4;
    for (let k = 0; k < 8; k++) { const col = UI.rotulos.find(q => !(x + w < q.x || x > q.x + q.w || y + h < q.y || y > q.y + q.h)); if (!col) break; y = col.y - h - 2; }
    const hover = UI.mouseX >= x && UI.mouseX <= x + w && UI.mouseY >= y && UI.mouseY <= y + h;
    g.fillStyle = hover ? 'rgba(60,45,30,.95)' : 'rgba(8,6,5,.85)'; g.fillRect(x, y, w, h);
    g.strokeStyle = it.raridade === 'unico' ? '#af6025' : it.raridade === 'raro' ? '#8a8a3a' : it.tipo === 'gema' ? cor : 'rgba(120,100,80,.6)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.fillStyle = cor; g.fillText(txt, x + w / 2, y + 14);
    UI.rotulos.push({ d: r.d, x, y, w, h });
  }
  J.input.sobreRotulo = UI.rotulos.some(q => UI.mouseX >= q.x && UI.mouseX <= q.x + q.w && UI.mouseY >= q.y && UI.mouseY <= q.y + q.h);
  // textos flutuantes
  for (const t of J.textos) {
    const k = t.t / t.dur;
    v.set(t.x, t.y + k * 1.6, t.z); ENG.paraTela(v, o); if (o.z > 1) continue;
    g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    const s = t.tam * (k < 0.12 ? 0.7 + k / 0.12 * 0.5 : 1.2 - Math.min(0.2, (k - 0.12)));
    g.font = `800 ${s}px "Alegreya Sans", sans-serif`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.85)';
    g.strokeText(t.txt, o.x, o.y); g.fillStyle = t.cor; g.fillText(t.txt, o.x, o.y);
  }
  g.globalAlpha = 1;
  // portões, NPCs e objetos interativos
  g.textAlign = 'center';
  for (const pt of J.portoes) {
    if (Math.hypot(pt.x - jg.x, pt.z - jg.z) > 40) continue;
    v.set(pt.x, J.mundo.h(pt.x, pt.z) + 5.8, pt.z); ENG.paraTela(v, o); if (o.z > 1) continue;
    const trancado = pt.saida && !J.z.saidaAberta;
    const txt = (pt.entrada ? '◂ ' : '') + pt.nome + (pt.entrada ? '' : ' ▸');
    g.font = '700 14px Cinzel, serif'; g.lineWidth = 3; g.strokeStyle = '#000'; g.fillStyle = trancado ? '#ff8070' : pt.entrada ? '#ffd090' : '#b8c8ff';
    g.strokeText(txt, o.x, o.y); g.fillText(txt, o.x, o.y);
    if (trancado) { g.font = '500 12px "Alegreya Sans", sans-serif'; g.strokeText('Derrote o chefe', o.x, o.y + 15); g.fillText('Derrote o chefe', o.x, o.y + 15); }
  }
  UI.sobreInterativo = null; let melhor = 46;
  for (const it of J.interativos) {
    if (Math.hypot(it.x - jg.x, it.z - jg.z) > 45) continue;
    v.set(it.x, J.mundo.h(it.x, it.z) + it.altura, it.z); ENG.paraTela(v, o); if (o.z > 1) continue;
    const base = new THREE.Vector3(it.x, J.mundo.h(it.x, it.z) + it.altura * 0.5, it.z); const ob = {}; ENG.paraTela(base, ob);
    const dm = Math.hypot(UI.mouseX - ob.x, UI.mouseY - ob.y);
    const hover = dm < melhor && !UI.painelAberto(); if (hover) { melhor = dm; UI.sobreInterativo = it; }
    it._tela = { x: o.x, y: o.y };
  }
  for (const it of J.interativos) {
    if (!it._tela || Math.hypot(it.x - jg.x, it.z - jg.z) > 45) continue;
    const { x, y } = it._tela; const hover = UI.sobreInterativo === it;
    const cor = it.tipo === 'npc' ? '#ffe2a8' : it.tipo === 'passagem' ? (it.ativa ? '#9cd0ff' : '#90a0b0') : it.tipo === 'objetivo' ? '#80ffe0' : it.tipo === 'portal' ? '#b8b0ff' : '#e8d0a0';
    if (it.tipo === 'npc' || hover) {
      g.font = (hover ? '700 15px' : '600 13px') + ' "Alegreya Sans", sans-serif'; g.lineWidth = 3; g.strokeStyle = '#000'; g.fillStyle = hover ? '#ffffff' : cor;
      g.strokeText(it.nome, x, y); g.fillText(it.nome, x, y);
    }
    if (it.tipo === 'npc') {
      const mk = J.marcadorNpc(it.id);
      if (mk) { g.font = '900 26px Cinzel, serif'; g.fillStyle = mk === '!' ? '#ffd23a' : mk === '?' ? '#ffd23a' : '#a09888'; g.lineWidth = 4; g.strokeText(mk, x, y - 20 + Math.sin(J.tempo * 3) * 2); g.fillText(mk, x, y - 20 + Math.sin(J.tempo * 3) * 2); }
    }
  }
  UI.desenharMinimapa();
};

// ------------------------------------------------------------
// Entrada
// ------------------------------------------------------------
UI.initEntrada = function () {
  const inp = J.input;
  const cv = $('#jogo');
  window.addEventListener('mousemove', (e) => { inp.mx = e.clientX; inp.my = e.clientY; UI.mouseX = e.clientX; UI.mouseY = e.clientY; });
  cv.addEventListener('mousedown', (e) => {
    $('#seletorHab').hidden = true;
    if (J.estado !== 'jogando') return;
    if (e.button === 0 && UI.sobreInterativo && !J.input.sobreRotulo) {
      const it = UI.sobreInterativo; const d = Math.hypot(it.x - J.jog.x, it.z - J.jog.z);
      if (d < 3.6) it.acao(); else J.jog.irPara = { x: it.x, z: it.z, raioChegada: 3.2, ao: () => it.acao() };
      return;
    }
    if (e.button === 0 && J.mundo && J.mundo.cidade && !J.input.sobreRotulo) { const a = J.input.alvo; J.jog.irPara = { x: a.x, z: a.z, raioChegada: 0.6 }; return; }
    if (e.button === 0 && J.input.sobreRotulo) {
      const r = UI.rotulos.find(q => UI.mouseX >= q.x && UI.mouseX <= q.x + q.w && UI.mouseY >= q.y && UI.mouseY <= q.y + q.h);
      if (r) { if (Math.hypot(r.d.x - J.jog.x, r.d.z - J.jog.z) < 3) J.pegar(r.d); else J.jog.irPara = r.d; }
      return;
    }
    inp.botoes[e.button] = true;
  });
  window.addEventListener('mouseup', (e) => { inp.botoes[e.button] = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('wheel', (e) => { ENG.zoom = clamp(ENG.zoom + Math.sign(e.deltaY) * 2.5, 18, 46); }, { passive: true });
  window.addEventListener('blur', () => { inp.teclas = {}; inp.botoes = {}; });
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.repeat && !['KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) return;
    inp.teclas[e.code] = true;
    if (J.estado === 'menu') return;
    switch (e.code) {
      case 'KeyI': case 'KeyB': UI.alternar('inv'); break;
      case 'KeyC': UI.alternar('pers'); break;
      case 'KeyT': case 'KeyK': UI.alternar('arvore'); break;
      case 'KeyM': UI.alternar('mapa'); break;
      case 'KeyV': UI.alternar('portal'); break;
      case 'Delete': case 'KeyX': UI.descartarHover(); break;
      case 'Escape': {
        const algum = !$('#painelInv').hidden || !$('#painelPers').hidden || !$('#modalArvore').hidden || !$('#modalNpc').hidden || !$('#painelBau').hidden || (!$('#modalMapa').hidden && J.mundo && !$('#fecharMapa').hidden);
        if (algum) { UI.fecharTudo(); if (J.estado === 'pausa' && J.mundo && $('#modalMorte').hidden) J.estado = 'jogando'; }
        else if ($('#modalMapa').hidden && $('#modalMorte').hidden) UI.alternar('menu');
        break;
      }
    }
  });
  window.addEventListener('keyup', (e) => { inp.teclas[e.code] = false; });
  document.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', () => { const p = b.dataset.fechar; if (p === 'menu') { $('#modalMenu').hidden = true; if (J.estado === 'pausa') J.estado = 'jogando'; } else if (p === 'mapa') { $('#modalMapa').hidden = true; if (J.estado === 'pausa' && J.mundo) J.estado = 'jogando'; } else if (p === 'npc') { $('#modalNpc').hidden = true; if (J.estado === 'pausa') J.estado = 'jogando'; } else UI.alternar(p); }));
  document.querySelectorAll('.bmenu').forEach(b => b.addEventListener('click', () => UI.alternar(b.dataset.p)));
  document.querySelectorAll('.aba').forEach(a => a.addEventListener('click', () => { UI.abaArvore = a.dataset.aba; UI.desenharArvore(); }));
  $('#bCombinar').addEventListener('click', UI.combinarGemas);
  $('#bOrganizar').addEventListener('click', UI.organizar);
  $('#bContinuar').addEventListener('click', () => UI.alternar('menu'));
  $('#bSairMenu').addEventListener('click', () => { J.salvar(); location.reload(); });
  $('#bRenascer').addEventListener('click', () => { $('#modalMorte').hidden = true; J.descartarGuardado(); J.entrarArea(J.pers.ultimaCidade || 'c1', 'passagem'); });
  $('#bMorteMapa').addEventListener('click', () => { $('#modalMorte').hidden = true; J.entrarDef(J.z.def, 'inicio'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#seletorHab') && !e.target.closest('.slot')) $('#seletorHab').hidden = true; });
};

UI.montarQualidade = function () {
  const box = $('#qualidadeGfx'); if (!box) return; box.innerHTML = '';
  for (const [id, q] of Object.entries(QUALIDADES_GFX)) {
    const b = document.createElement('button'); b.className = 'btn' + (GFX.qualidade === id ? '' : ' sec'); b.textContent = q.nome;
    b.addEventListener('click', () => { GFX.definirQualidade(id); UI.montarQualidade(); UI.aviso('Qualidade gráfica: ' + q.nome); });
    box.appendChild(b);
  }
};
const CONTROLES = [['W A S D', 'Mover (na cidade também com clique)'], ['V', 'Abrir portal para a cidade'], ['Clique em NPC / Pedra', 'Conversar / viajar'], ['Mouse', 'Mirar'], ['Botão esquerdo / direito', 'Habilidades 1 e 2'], ['Q  E  R  F', 'Habilidades 3 a 6'], ['Espaço', 'Esquivar (invulnerável)'], ['1 / 2', 'Frascos de vida / recurso'], ['I · C · T · M', 'Inventário · Personagem · Árvore · Mapa'], ['Clique no nome do item', 'Pegar saque'], ['Roda do mouse', 'Zoom']];
UI.preencherControles = function (el) { el.innerHTML = CONTROLES.map(([k, d]) => `<kbd>${k}</kbd><span>${d}</span>`).join(''); };

// ------------------------------------------------------------
// Telas iniciais
// ------------------------------------------------------------
UI.telaInicio = function () {
  J.estado = 'menu';
  $('#telaInicio').hidden = false; $('#telaClasse').hidden = true;
  UI.preencherControles($('#controlesInicio'));
  if (J.temSave() && J.carregarSave()) {
    const p = J.pers;
    $('#saveInfo').textContent = `${p.nome} · ${p.asc ? ASCENDENCIAS[p.asc].nome : CLASSES[p.classe].nome} nível ${p.nivel}`;
    $('#bContinuarJogo').hidden = false;
  } else { $('#saveInfo').textContent = 'Os mortos não descansam no litoral naufragado.'; $('#bContinuarJogo').hidden = true; }
  // cenário de fundo
  if (!J.mundo) { ENG.construirMundo('litoral', 42, { chefe: false, pequeno: true }); J.fundo = true; }
};
UI.telaClasse = function () {
  $('#telaInicio').hidden = true; $('#telaClasse').hidden = false;
  const box = $('#classes'); box.innerHTML = '';
  UI.classeSel = UI.classeSel || 'guerreiro';
  for (const [id, C] of Object.entries(CLASSES)) {
    const c = document.createElement('div'); c.className = 'classeCard' + (UI.classeSel === id ? ' sel' : ''); c.tabIndex = 0;
    c.innerHTML = `<h3>${C.nome}</h3><div class="tit">${C.titulo}</div><p>${C.desc}</p><span class="rec" style="background:${C.recurso.cor}33;color:${C.recurso.cor}">${C.recurso.nome}</span><p class="asc">Ascendências: ${C.ascendencias.map(a => ASCENDENCIAS[a].nome).join(' ou ')}</p>`;
    c.addEventListener('click', () => { UI.classeSel = id; UI.telaClasse(); });
    box.appendChild(c);
  }
  $('#avisoNovo').textContent = J.temSave() ? 'Atenção: criar um novo personagem substitui o personagem salvo.' : '';
};
UI.iniciarJogo = function (novo) {
  $('#telaInicio').hidden = true; $('#telaClasse').hidden = true;
  if (novo) { J.novoPersonagem(UI.classeSel, $('#nomePers').value.trim()); }
  J.trocarModeloJogador();
  J.criarJogador();
  J.recalc();
  UI.montarBarra(); UI.atualizarTudo();
  const p = J.pers;
  if (novo || !p.ultimaCidade) J.entrarArea(novo ? 'z1' : (p.area && TODAS_AREAS[p.area] ? p.area : 'z1'), 'inicio');
  else J.entrarArea(p.ultimaCidade, 'passagem');
};

// ------------------------------------------------------------
// Inicialização e laço
// ------------------------------------------------------------
UI.boot = function () {
  ENG.init($('#jogo'));
  UI.ov = $('#overlay'); UI.ovg = UI.ov.getContext('2d');
  const ajustar = () => { UI.dpr = Math.min(2, window.devicePixelRatio || 1); UI.ov.width = window.innerWidth * UI.dpr; UI.ov.height = window.innerHeight * UI.dpr; };
  ajustar(); window.addEventListener('resize', ajustar);
  UI.initEntrada();
  UI.preencherControles($('#controles'));
  UI.montarQualidade();
  $('#bNovo').addEventListener('click', UI.telaClasse);
  $('#bVoltar').addEventListener('click', UI.telaInicio);
  $('#bContinuarJogo').addEventListener('click', () => UI.iniciarJogo(false));
  $('#bComecar').addEventListener('click', () => UI.iniciarJogo(true));
  $('#carregando').textContent = 'CARREGANDO MODELOS… 0%';
  A3D.carregar(p => { $('#carregando').textContent = `CARREGANDO MODELOS… ${Math.round(p * 100)}%`; }).then(() => { UI.telaInicio(); $('#carregando').hidden = true; });
  let ult = performance.now(), acumHUD = 0;
  let tCam = 0;
  const loop = (agora) => {
    requestAnimationFrame(loop);
    let dt = Math.min(0.05, (agora - ult) / 1000); ult = agora;
    if (J.estado === 'menu') {
      tCam += dt * 0.05;
      ENG.camera.position.set(Math.cos(tCam) * 60 - 60, 30, Math.sin(tCam) * 40 + 30);
      ENG.camera.lookAt(-90, 0, 0);
      ENG.atualizarEfeitos(dt);
    } else {
      try { J.atualizar(dt); } catch (err) { console.error(err); }
      acumHUD += dt; if (acumHUD > 0.05) { acumHUD = 0; UI.atualizarHUD(); }
    }
    GFX.atualizar(dt);
    GFX.render();
    try { UI.desenharOverlay(); } catch (err) { console.error(err); }
  };
  requestAnimationFrame(loop);
  // salvar periodicamente
  setInterval(() => { if (J.estado === 'jogando') J.salvar(); }, 30000);
};

window.addEventListener('load', UI.boot);
