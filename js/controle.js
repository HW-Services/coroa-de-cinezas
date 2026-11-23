// ============================================================
//  Controle (gamepad): Xbox, PlayStation, Steam Deck, genéricos
//  Analógico esquerdo: andar · Analógico direito: mirar
//  A/✕: ataque (botão 1 da barra) · B/○: esquiva · X/□: botão 2
//  Y/△: Q · LB/L1: E · RB/R1: R · LT/L2: F · RT/R2: ataque
//  Cruz ↑/↓: frascos de vida/recurso · ←: mapa · →: personagem
//  Start/Options: menu · Select/Share: inventário · R3: mapa da zona
//  L3: primeira pessoa
// ============================================================
'use strict';

const CTRL = { ativo: false, ant: [], zona: 0.18, mira: { x: 0, z: 0, t: 0 }, ultimoUso: 0, avisado: false };

// botão → tecla (gera keydown/keyup como o teclado)
const CTRL_TECLAS = { 1: 'Space', 3: 'KeyQ', 4: 'KeyE', 5: 'KeyR', 6: 'KeyF', 8: 'KeyI', 9: 'Escape', 10: 'KeyZ', 11: 'Tab', 12: 'Digit1', 13: 'Digit2', 14: 'KeyM', 15: 'KeyC' };
// botão → botão do mouse (0 = esquerdo, 2 = direito)
const CTRL_MOUSE = { 0: 0, 2: 2, 7: 0 };

CTRL.tecla = function (code, desce) {
  window.dispatchEvent(new KeyboardEvent(desce ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
};
CTRL.eixo = (v, z) => Math.abs(v) < z ? 0 : (v - Math.sign(v) * z) / (1 - z);

CTRL.atualizar = function () {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let pad = null; for (const p of pads) if (p && p.connected && p.mapping === 'standard') { pad = p; break; }
  if (!pad) for (const p of pads) if (p && p.connected) { pad = p; break; }
  const inp = J.input;
  if (!pad) { if (CTRL.ativo) { inp.eixo = null; CTRL.ativo = false; } return; }
  if (!CTRL.avisado) { CTRL.avisado = true; UI.aviso && UI.aviso('Controle conectado'); }
  const b = pad.buttons.map(x => x && (x.pressed || x.value > 0.5));
  const a = pad.axes;
  // menus, painéis e telas: o controle vira um cursor
  if (CTRLUI.modo()) {
    if (!CTRLUI.emUso) { inp.eixo = null; inp.botoes[0] = inp.botoes[2] = false; for (const c of Object.values(CTRL_TECLAS)) if (inp.teclas[c] && !['Escape'].includes(c)) inp.teclas[c] = false; }
    CTRLUI.atualizar(b, a);
    CTRL.ant = b; return;
  }
  if (CTRLUI.emUso) CTRLUI.sair();
  // botões (só nas mudanças de estado)
  for (let i = 0; i < b.length; i++) {
    if (!!b[i] === !!CTRL.ant[i]) continue;
    CTRL.ultimoUso = performance.now();
    if (CTRL_TECLAS[i]) CTRL.tecla(CTRL_TECLAS[i], b[i]);
    if (CTRL_MOUSE[i] != null && J.estado === 'jogando') inp.botoes[CTRL_MOUSE[i]] = !!b[i];
  }
  CTRL.ant = b;
  // movimento analógico
  const lx = CTRL.eixo(a[0] || 0, CTRL.zona), ly = CTRL.eixo(a[1] || 0, CTRL.zona);
  const rx = CTRL.eixo(a[2] || 0, CTRL.zona), ry = CTRL.eixo(a[3] || 0, CTRL.zona);
  if (lx || ly || rx || ry) CTRL.ultimoUso = performance.now();
  const usando = performance.now() - CTRL.ultimoUso < 4000;
  CTRL.ativo = usando;
  inp.eixo = usando && (lx || ly) ? { x: lx, z: ly } : null;
  // mira: analógico direito, senão a direção em que anda
  if (usando && J.jog && J.mundo && !(typeof PP !== 'undefined' && PP.ativo)) {
    let dx = rx, dz = ry;
    if (!dx && !dz) { if (lx || ly) { dx = lx; dz = ly; } else { dx = Math.sin(J.jog.ang); dz = Math.cos(J.jog.ang); } }
    const n = Math.hypot(dx, dz) || 1, alc = 7;
    const alvo = new THREE.Vector3(J.jog.x + dx / n * alc, J.jog.y + 0.5, J.jog.z + dz / n * alc);
    const t = ENG.paraTela(alvo, {});
    inp.mx = t.x; inp.my = t.y; UI.mouseX = t.x; UI.mouseY = t.y;
  }
  // primeira pessoa: analógico direito gira a câmera
  if (usando && typeof PP !== 'undefined' && PP.ativo && (rx || ry)) { PP.yaw -= rx * 0.045; PP.pitch = Math.max(-1.3, Math.min(1.3, PP.pitch - ry * 0.035 * (PP.inverter ? -1 : 1))); }
};

{
  // laço próprio: funciona também com o jogo pausado (menus)
  const laco = () => { requestAnimationFrame(laco); if (!J.input) return; try { CTRL.atualizar(); } catch (e) { console.error('controle', e); } };
  requestAnimationFrame(laco);
  window.addEventListener('gamepadconnected', () => { CTRL.avisado = false; });
  window.addEventListener('gamepaddisconnected', () => { CTRL.avisado = false; if (J.input) J.input.eixo = null; UI.aviso && UI.aviso('Controle desconectado'); });
}

// ============================================================
//  Menus com controle: cursor virtual + saltos entre botões
//  Analógico esquerdo: move o cursor · Cruz: salta para o botão/item mais próximo naquela direção
//  A/✕: clicar · X/□: ação do item (= clique direito: equipar, comprar, vender, guardar)
//  Y/△: ação alternativa (= Shift + clique direito: tirar jóias) · B/○: voltar/fechar
//  LB/RB: abas · Analógico direito: rolar a lista / zoom do mapa · Start: menu
// ============================================================
const CTRLUI = { x: innerWidth / 2, y: innerHeight / 2, emUso: false, sobre: null, foco: null, repet: {}, ultimo: performance.now() };
const CTRLUI_MODAIS = ['#modalTroca', '#modalMorte', '#modalNpc', '#modalMenu', '#modalMapa', '#modalArvore'];
const CTRLUI_PAINEIS = ['#seletorHab', '#painelRaiz', '#painelCombos', '#painelJoias', '#painelLoja', '#painelForja', '#painelPet', '#painelSocial', '#painelBau', '#painelInv', '#painelPers', '#telaRede', '#telaClasse', '#telaInicio'];
const CTRLUI_ALVOS = 'button:not([disabled]), input:not([type=hidden]), select, textarea, a[href], [data-ac], [data-m], [role=button], .cel, .eq, .slot, .rServ, .aba, .rAba';
CTRLUI.visivel = (el) => { if (!el || el.hidden) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
CTRLUI.camadas = function () {
  for (const q of CTRLUI_MODAIS) { const el = document.querySelector(q); if (CTRLUI.visivel(el)) return [el]; }
  return CTRLUI_PAINEIS.map(q => document.querySelector(q)).filter(CTRLUI.visivel);
};
CTRLUI.modo = function () { return CTRLUI.camadas().length > 0 || (typeof J !== 'undefined' && J.estado !== 'jogando' && J.estado !== 'pausa'); };
CTRLUI.alvos = function () {
  let cam = CTRLUI.camadas(); if (!cam.length) cam = [document.body];
  const set = new Set();
  for (const c of cam) {
    c.querySelectorAll(CTRLUI_ALVOS).forEach(e => set.add(e));
    // qualquer elemento clicável (cursor de mão), como os nós das árvores
    c.querySelectorAll('div, span, li, td, img, svg, g, circle').forEach(e => { if (getComputedStyle(e).cursor === 'pointer') set.add(e); });
  }
  const lista = [...set].filter(e => CTRLUI.visivel(e));
  // fica só o mais interno de elementos aninhados
  return lista.filter(e => !lista.some(o => o !== e && e.contains(o) && !o.matches('span, img, svg *')));
};
CTRLUI.centro = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

// ---------- eventos sintéticos do mouse ----------
CTRLUI.ev = (alvo, tipo, extra = {}) => {
  const base = { bubbles: !/enter|leave/.test(tipo), cancelable: true, clientX: CTRLUI.x, clientY: CTRLUI.y, view: window, button: 0, buttons: 0 };
  const E = tipo.startsWith('pointer') ? PointerEvent : tipo === 'wheel' ? WheelEvent : MouseEvent;
  return alvo.dispatchEvent(new E(tipo, Object.assign(base, tipo.startsWith('pointer') ? { pointerId: 9, pointerType: 'mouse', isPrimary: true } : {}, extra)));
};
CTRLUI.mover = function () {
  const el = document.elementFromPoint(CTRLUI.x, CTRLUI.y);
  const ant = CTRLUI.sobre;
  if (el !== ant) {
    const cadeia = (e) => { const c = []; while (e && e !== document) { c.push(e); e = e.parentNode; } return c; };
    const cA = cadeia(ant), cN = cadeia(el);
    if (ant) { CTRLUI.ev(ant, 'pointerout'); CTRLUI.ev(ant, 'mouseout'); for (const e of cA) if (!cN.includes(e)) { CTRLUI.ev(e, 'pointerleave'); CTRLUI.ev(e, 'mouseleave'); } }
    if (el) { CTRLUI.ev(el, 'pointerover'); CTRLUI.ev(el, 'mouseover'); for (const e of cN.slice().reverse()) if (!cA.includes(e)) { CTRLUI.ev(e, 'pointerenter'); CTRLUI.ev(e, 'mouseenter'); } }
    CTRLUI.sobre = el;
    // destaque no item clicável sob o cursor
    if (CTRLUI.foco) CTRLUI.foco.classList.remove('ctrlFoco');
    CTRLUI.foco = el ? el.closest(CTRLUI_ALVOS) || (getComputedStyle(el).cursor === 'pointer' ? el : null) : null;
    if (CTRLUI.foco) CTRLUI.foco.classList.add('ctrlFoco');
  }
  if (el) { CTRLUI.ev(el, 'pointermove'); CTRLUI.ev(el, 'mousemove'); }
  const c = CTRLUI.cursor(); c.style.transform = `translate(${CTRLUI.x}px, ${CTRLUI.y}px)`;
};
CTRLUI.clicar = function (botao, shift) {
  const el = document.elementFromPoint(CTRLUI.x, CTRLUI.y); if (!el) return;
  const ex = { button: botao, buttons: botao === 2 ? 2 : 1, shiftKey: !!shift };
  CTRLUI.ev(el, 'pointerdown', ex); CTRLUI.ev(el, 'mousedown', ex);
  CTRLUI.ev(el, 'pointerup', Object.assign({}, ex, { buttons: 0 })); CTRLUI.ev(el, 'mouseup', Object.assign({}, ex, { buttons: 0 }));
  if (botao === 2) { CTRLUI.ev(el, 'contextmenu', ex); return; }
  const campo = el.closest('input, textarea, select');
  if (campo) {
    campo.focus();
    if (campo.tagName === 'SELECT') { campo.selectedIndex = (campo.selectedIndex + 1) % campo.options.length; campo.dispatchEvent(new Event('change', { bubbles: true })); return; }
    if (campo.type === 'checkbox' || campo.type === 'radio') { campo.click(); return; }
    if (campo.type === 'range') return;
    // teclado na tela da Steam (Steam Deck / Big Picture)
    if (typeof DESK !== 'undefined' && DESK.ativo && DESK.api.tecladoSteam) {
      const rot = (campo.closest('label') && campo.closest('label').textContent.trim()) || campo.placeholder || '';
      DESK.api.tecladoSteam({ desc: rot, max: campo.maxLength > 0 ? campo.maxLength : 64, texto: campo.value, senha: campo.type === 'password' }).then(t => {
        if (t == null) return; campo.value = t; campo.dispatchEvent(new Event('input', { bubbles: true })); campo.dispatchEvent(new Event('change', { bubbles: true }));
      }).catch(() => { });
    }
    return;
  }
  if (el.closest('button, a[href]') && typeof el.click === 'function') { el.closest('button, a[href]').click(); return; }
  CTRLUI.ev(el, 'click', ex);
};
// salto para o alvo mais próximo numa direção
CTRLUI.saltar = function (dx, dy) {
  const alvos = CTRLUI.alvos(); let melhor = null, nota = Infinity;
  const atual = CTRLUI.foco;
  for (const e of alvos) {
    if (e === atual) continue;
    const c = CTRLUI.centro(e); const vx = c.x - CTRLUI.x, vy = c.y - CTRLUI.y;
    const ao = vx * dx + vy * dy; if (ao <= 6) continue;
    const lat = Math.abs(vx * dy - vy * dx);
    const n = ao + lat * 2.2; if (n < nota) { nota = n; melhor = c; }
  }
  if (melhor) { CTRLUI.x = melhor.x; CTRLUI.y = melhor.y; CTRLUI.mover(); CTRLUI.rolarPara(); }
};
CTRLUI.rolarPara = function () { const f = CTRLUI.foco; if (f && f.scrollIntoView) { const r = f.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) { f.scrollIntoView({ block: 'nearest' }); const c = CTRLUI.centro(f); CTRLUI.x = c.x; CTRLUI.y = c.y; CTRLUI.mover(); } } };
CTRLUI.primeiro = function () {
  const alvos = CTRLUI.alvos(); if (!alvos.length) return;
  const pri = alvos.find(e => e.matches('button.grande, .btn:not(.sec), .rServ')) || alvos[0];
  const c = CTRLUI.centro(pri); CTRLUI.x = c.x; CTRLUI.y = c.y; CTRLUI.mover();
};
CTRLUI.rolar = function (dy) {
  let el = document.elementFromPoint(CTRLUI.x, CTRLUI.y);
  if (el && el.tagName === 'CANVAS') { CTRLUI.ev(el, 'wheel', { deltaY: dy * 40 }); return; }
  while (el && el !== document.body) { const cs = getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight) { el.scrollTop += dy * 18; return; } el = el.parentElement; }
};
CTRLUI.aba = function (dir) {
  const cam = CTRLUI.camadas(); const abas = []; for (const c of cam) c.querySelectorAll('.aba, .rAba, [data-aba], [class*="Aba"]:not([class*="Abas"])').forEach(e => { if (CTRLUI.visivel(e)) abas.push(e); });
  if (abas.length < 2) return;
  let i = abas.findIndex(e => e.classList.contains('on') || e.classList.contains('ativa') || e.getAttribute('aria-selected') === 'true');
  i = ((i < 0 ? 0 : i) + dir + abas.length) % abas.length;
  abas[i].click();
};
CTRLUI.cursor = function () {
  if (CTRLUI._c) return CTRLUI._c;
  const st = document.createElement('style');
  st.textContent = `#cursorCtrl{position:fixed;left:0;top:0;z-index:99999;pointer-events:none;width:30px;height:30px;margin:-4px 0 0 -4px;display:none;filter:drop-shadow(0 2px 3px #000)}
    #cursorCtrl.on{display:block} .ctrlFoco{outline:2px solid #e8b860 !important;outline-offset:2px;box-shadow:0 0 14px #e8b86088 !important}
    body.ctrlUI, body.ctrlUI *{cursor:none !important}`;
  document.head.appendChild(st);
  const c = document.createElement('div'); c.id = 'cursorCtrl';
  c.innerHTML = '<svg viewBox="0 0 30 30" width="30" height="30"><path d="M4 3 L4 24 L10 18.5 L14 27 L18 25 L14 16.5 L22 16.5 Z" fill="#f2d79a" stroke="#3a2412" stroke-width="2" stroke-linejoin="round"/></svg>';
  document.body.appendChild(c); CTRLUI._c = c; return c;
};
CTRLUI.sair = function () {
  CTRLUI.emUso = false; CTRLUI.cursor().classList.remove('on'); document.body.classList.remove('ctrlUI');
  if (CTRLUI.foco) CTRLUI.foco.classList.remove('ctrlFoco'); CTRLUI.foco = null;
  if (CTRLUI.sobre) { CTRLUI.ev(CTRLUI.sobre, 'mouseleave'); CTRLUI.sobre = null; }
};
// repetição ao segurar a cruz (como no teclado)
CTRLUI.pulso = function (k, ativo) {
  const r = CTRLUI.repet, t = performance.now();
  if (!ativo) { delete r[k]; return false; }
  if (r[k] == null) { r[k] = t + 380; return true; }
  if (t >= r[k]) { r[k] = t + 110; return true; }
  return false;
};
CTRLUI.atualizar = function (b, a) {
  const ant = CTRL.ant, agora = performance.now(); const dt = Math.min(0.05, (agora - CTRLUI.ultimo) / 1000); CTRLUI.ultimo = agora;
  const novo = (i) => b[i] && !ant[i];
  const lx = CTRL.eixo(a[0] || 0, CTRL.zona), ly = CTRL.eixo(a[1] || 0, CTRL.zona), ry = CTRL.eixo(a[3] || 0, CTRL.zona);
  const mexeu = b.some((x, i) => x && !ant[i]) || lx || ly || ry;
  if (mexeu) CTRL.ultimoUso = agora;
  if (!CTRLUI.emUso) {
    if (!mexeu) return;
    CTRLUI.emUso = true; CTRLUI.cursor().classList.add('on'); document.body.classList.add('ctrlUI');
    CTRLUI.sobre = null; CTRLUI.primeiro();
    if (!novo(1) && !novo(9)) return; // o primeiro toque só mostra o cursor (B/Start já agem)
  }
  // cursor livre
  if (lx || ly) {
    const v = 1100 * Math.max(Math.hypot(lx, ly), 0.0001) ** 1.6;
    const n = Math.hypot(lx, ly); CTRLUI.x = clamp(CTRLUI.x + lx / n * v * dt, 0, innerWidth - 2); CTRLUI.y = clamp(CTRLUI.y + ly / n * v * dt, 0, innerHeight - 2);
    CTRLUI.mover();
  }
  if (ry) CTRLUI.rolar(ry);
  // cruz: saltos
  if (CTRLUI.pulso('c', b[12])) CTRLUI.saltar(0, -1);
  if (CTRLUI.pulso('b', b[13])) CTRLUI.saltar(0, 1);
  if (CTRLUI.pulso('e', b[14])) CTRLUI.saltar(-1, 0);
  if (CTRLUI.pulso('d', b[15])) CTRLUI.saltar(1, 0);
  if (novo(0)) CTRLUI.clicar(0);
  if (novo(2)) CTRLUI.clicar(2);
  if (novo(3)) CTRLUI.clicar(2, true);
  if (novo(1)) { CTRL.tecla('Escape', true); CTRL.tecla('Escape', false); }
  if (novo(9)) { CTRL.tecla('Escape', true); CTRL.tecla('Escape', false); }
  if (novo(8)) { CTRL.tecla('KeyI', true); CTRL.tecla('KeyI', false); }
  if (novo(4)) CTRLUI.aba(-1);
  if (novo(5)) CTRLUI.aba(1);
  // painel mudou (abriu/fechou algo): leva o cursor ao primeiro botão se ele ficou no vazio
  if (b.some((x, i) => x && !ant[i])) setTimeout(() => { if (CTRLUI.emUso && !document.elementFromPoint(CTRLUI.x, CTRLUI.y)?.closest(CTRLUI_PAINEIS.concat(CTRLUI_MODAIS).join(','))) CTRLUI.primeiro(); else CTRLUI.mover(); }, 60);
};
// o mouse de verdade esconde o cursor do controle
window.addEventListener('mousemove', (e) => { if (e.isTrusted && CTRLUI.emUso) CTRLUI.sair(); }, true);
