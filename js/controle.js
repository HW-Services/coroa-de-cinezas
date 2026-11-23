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
