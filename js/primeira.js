// ============================================================
//  Visão em primeira pessoa (tecla Z ou botão "1ª Pessoa")
//  - câmera na altura dos olhos, com balanço ao andar
//  - mouse travado para olhar em volta; a mira fica no centro
//  - WASD relativo para onde se olha; clique ataca na mira
//  - abrir um painel solta o mouse; clique no jogo para voltar
// ============================================================
'use strict';

const PP = { ativo: false, yaw: 0, pitch: -0.12, sens: 0.0024, bob: 0, fovNormal: null };
try { const s = parseFloat(localStorage.getItem('cdc_pp_sens')); if (s > 0) PP.sens = s; } catch (e) { }

PP.cv = () => document.getElementById('jogo');
PP.travado = () => document.pointerLockElement === PP.cv();
PP.alternar = function (ligar) {
  const novo = ligar ?? !PP.ativo;
  if (novo === PP.ativo) return;
  if (novo && (!J.jog || !J.mundo)) return;
  PP.ativo = novo;
  const cam = ENG.camera;
  if (novo) {
    PP.yaw = J.jog.ang; PP.pitch = -0.12;
    PP.fovNormal = cam.fov; PP.nearNormal = cam.near; PP.zoom = ENG.zoom;
    cam.fov = 72; cam.near = 0.08; cam.updateProjectionMatrix();
    PP.travar();
    UI.aviso('Primeira pessoa: mova o mouse para olhar · Z para voltar', '#e8d8b0');
  } else {
    cam.fov = PP.fovNormal || 42; cam.near = PP.nearNormal || 0.5; cam.updateProjectionMatrix(); if (PP.zoom) ENG.zoom = PP.zoom;
    if (PP.travado()) document.exitPointerLock();
    if (J.jog && J.jog.m) J.jog.m.raiz.visible = true;
    if (window.PET && PET.m && PET.m.raiz) PET.m.raiz.visible = true;
  }
  document.body.classList.toggle('pp', PP.ativo);
  const b = document.getElementById('bPP'); if (b) b.classList.toggle('on', PP.ativo);
};
PP.travar = function () { const c = PP.cv(); if (c && c.requestPointerLock && !PP.travado()) { try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { } } };

// olhar com o mouse
window.addEventListener('mousemove', (e) => {
  if (!PP.ativo) return;
  if (PP.travado()) {
    PP.yaw -= e.movementX * PP.sens;
    PP.pitch = clamp(PP.pitch - e.movementY * PP.sens * (PP.inverter ? -1 : 1), -1.35, 1.2);
  }
  // a mira (e o "mouse" do jogo) fica no centro da tela
  J.input.mx = window.innerWidth / 2; J.input.my = window.innerHeight / 2;
  UI.mouseX = J.input.mx; UI.mouseY = J.input.my;
});
// clicar no jogo trava o mouse de novo
document.addEventListener('mousedown', (e) => { if (PP.ativo && e.target === PP.cv() && !PP.travado() && !UI.painelAberto()) PP.travar(); }, true);
document.addEventListener('pointerlockchange', () => { const d = document.getElementById('ppDica'); if (d) d.hidden = !PP.ativo || PP.travado(); });
window.addEventListener('keydown', (ev) => {
  if (ev.code !== 'KeyZ' || ev.repeat) return;
  const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
  if (J.estado !== 'jogando' && J.estado !== 'pausa') return;
  PP.alternar();
});

// WASD relativo à direção do olhar
J.ajusteMov = function (mx, mz) {
  if (!PP.ativo) return [mx, mz];
  const fx = Math.sin(PP.yaw), fz = Math.cos(PP.yaw);   // frente
  const rx = -fz, rz = fx;                               // direita
  return [fx * -mz + rx * mx, fz * -mz + rz * mx];
};

// o personagem olha para onde a câmera olha
{
  const aj0 = J.atualizarJogador;
  J.atualizarJogador = function (dt) {
    const r = aj0.apply(this, arguments);
    if (PP.ativo && J.jog) {
      const jg = J.jog;
      if (!jg.rolar && !jg.dash) jg.ang = PP.yaw;
      if (jg.m) jg.m.raiz.visible = false;
      if (window.PET && PET.m && PET.m.raiz) { const pr = PET.m.raiz.position; PET.m.raiz.visible = Math.hypot(pr.x - jg.x, pr.z - jg.z) > 1.8; }
      PP.bob += dt * (jg.andar || 0) * 9;
      // solta o mouse quando um painel abre
      if (UI.painelAberto() && PP.travado()) document.exitPointerLock();
      J.input.mx = window.innerWidth / 2; J.input.my = window.innerHeight / 2;
    }
    return r;
  };
}

// câmera
{
  const cam0 = ENG.atualizarCamera;
  ENG.atualizarCamera = function (alvo, dt) {
    if (!PP.ativo || !J.jog) return cam0.apply(this, arguments);
    const jg = J.jog, c = ENG.camera;
    ENG.camAlvo.copy(alvo); ENG.camPos.copy(alvo);
    const escala = jg.m && jg.m.escala ? jg.m.escala : 1;
    const olho = 1.62 * escala + Math.sin(PP.bob) * 0.045 * (jg.andar || 0);
    c.position.set(jg.x - Math.sin(PP.yaw) * 0.15, jg.y + olho + (jg.alt || 0), jg.z - Math.cos(PP.yaw) * 0.15);
    if (ENG.tremor > 0) { const k = ENG.tremor * 0.25; c.position.x += (Math.random() - 0.5) * k; c.position.y += (Math.random() - 0.5) * k; ENG.tremor = Math.max(0, ENG.tremor - dt * 3); }
    const cp = Math.cos(PP.pitch);
    c.lookAt(c.position.x + Math.sin(PP.yaw) * cp, c.position.y + Math.sin(PP.pitch), c.position.z + Math.cos(PP.yaw) * cp);
    // sombras seguem um ponto um pouco à frente do jogador
    const fx = jg.x + Math.sin(PP.yaw) * 18, fz = jg.z + Math.cos(PP.yaw) * 18;
    ENG.sol.position.set(fx + 30, jg.y + 55, fz + 18); ENG.sol.target.position.set(fx, jg.y, fz);
  };
  // mira no centro: se o olhar estiver acima do horizonte, mira num ponto à frente
  const mira0 = ENG.mouseNoChao;
  ENG.mouseNoChao = function (mx, my, yRef) {
    const p = mira0(mx, my, yRef);
    if (!PP.ativo || !J.jog) return p;
    const jg = J.jog, d = Math.hypot(p.x - jg.x, p.z - jg.z);
    const dir = ENG.raycaster.ray.direction;
    if (dir.y > -0.03 || d > 32 || !isFinite(d)) {
      const x = jg.x + Math.sin(PP.yaw) * 22, z = jg.z + Math.cos(PP.yaw) * 22;
      p.set(x, J.mundo ? J.mundo.h(x, z) : jg.y, z);
    }
    return p;
  };
}

// sai do modo ao trocar de personagem/menu
{
  const f0 = UI.telaClasse; if (f0) UI.telaClasse = function () { PP.alternar(false); return f0.apply(this, arguments); };
}

// interface: mira, dica e botão
{
  const st = document.createElement('style');
  st.textContent = `
  #ppMira{position:fixed;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;pointer-events:none;z-index:6;display:none}
  body.pp #ppMira{display:block}
  #ppMira::before,#ppMira::after{content:'';position:absolute;background:rgba(255,240,210,.9);box-shadow:0 0 3px #000}
  #ppMira::before{left:10px;top:2px;width:2px;height:18px}
  #ppMira::after{top:10px;left:2px;height:2px;width:18px}
  #ppMira i{position:absolute;left:7px;top:7px;width:8px;height:8px;border:1.5px solid rgba(255,220,160,.85);border-radius:50%}
  #ppDica{position:fixed;left:50%;top:58%;transform:translateX(-50%);z-index:6;pointer-events:none;background:rgba(10,8,6,.85);border:1px solid #8a6a3a;color:#f0e0c0;padding:6px 14px;font-family:"Alegreya Sans",sans-serif;font-size:14px}
  .bmenu.on{color:#ffe0a0;border-color:#c8a060}`;
  document.head.appendChild(st);
  const m = document.createElement('div'); m.id = 'ppMira'; m.innerHTML = '<i></i>'; document.body.appendChild(m);
  const d = document.createElement('div'); d.id = 'ppDica'; d.hidden = true; d.textContent = 'Clique no jogo para controlar a câmera (Z volta à visão de cima)'; document.body.appendChild(d);
  const ref = document.getElementById('bRaiz') || document.getElementById('bPet');
  if (ref) { const b = document.createElement('button'); b.className = 'bmenu'; b.id = 'bPP'; b.textContent = '1ª Pessoa (Z)'; b.addEventListener('click', () => PP.alternar()); ref.before(b); }
}

// ---------------- ajuste no Menu (Esc): sensibilidade e eixo vertical ----------------
PP.SENS_MIN = 0.0006; PP.SENS_MAX = 0.0096; PP.SENS_PADRAO = 0.0024;
try { PP.inverter = localStorage.getItem('cdc_pp_inv') === '1'; } catch (e) { }
// escala de 1 a 100 (50 = padrão)
PP.sensParaNivel = (s) => Math.max(1, Math.min(100, Math.round(50 + 50 * Math.log(s / PP.SENS_PADRAO) / Math.log(4))));
PP.nivelParaSens = (n) => PP.SENS_PADRAO * Math.pow(4, (n - 50) / 50);
PP.salvarAjustes = () => { try { localStorage.setItem('cdc_pp_sens', String(PP.sens)); localStorage.setItem('cdc_pp_inv', PP.inverter ? '1' : '0'); } catch (e) { } };
{
  const menu = document.querySelector('#modalMenu .corpo');
  if (menu) {
    const st = document.createElement('style');
    st.textContent = `.ppAjuste{display:grid;grid-template-columns:auto 1fr auto;gap:8px 12px;align-items:center;font-size:14px}
    .ppAjuste input[type=range]{width:100%;accent-color:#c8a060}
    .ppAjuste output{min-width:34px;text-align:right;color:#ffe0a0;font-variant-numeric:tabular-nums}
    .ppAjuste label.chk{grid-column:1 / -1;display:flex;gap:8px;align-items:center;cursor:pointer}`;
    document.head.appendChild(st);
    const d = document.createElement('div');
    d.innerHTML = `<div class="statT" style="margin-top:0">Câmera em primeira pessoa</div>
      <div class="ppAjuste">
        <span>Sensibilidade do mouse</span><input type="range" id="ppSens" min="1" max="100" step="1" aria-label="Sensibilidade do mouse"><output id="ppSensV"></output>
        <label class="chk"><input type="checkbox" id="ppInv"> Inverter eixo vertical</label>
      </div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:6px"><button class="btn sec" id="ppPadrao" type="button">Restaurar padrão</button><span class="dica" style="margin:0">Vale para a visão em primeira pessoa (tecla Z). 50 é o padrão.</span></div>`;
    const ref = document.getElementById('controles');
    ref ? menu.insertBefore(d, ref) : menu.appendChild(d);
    const r = d.querySelector('#ppSens'), o = d.querySelector('#ppSensV'), inv = d.querySelector('#ppInv');
    const mostrar = () => { r.value = PP.sensParaNivel(PP.sens); o.textContent = r.value; inv.checked = !!PP.inverter; };
    r.addEventListener('input', () => { PP.sens = PP.nivelParaSens(+r.value); o.textContent = r.value; PP.salvarAjustes(); });
    r.addEventListener('keydown', (e) => e.stopPropagation());
    inv.addEventListener('change', () => { PP.inverter = inv.checked; PP.salvarAjustes(); });
    d.querySelector('#ppPadrao').addEventListener('click', () => { PP.sens = PP.SENS_PADRAO; PP.inverter = false; PP.salvarAjustes(); mostrar(); });
    mostrar();
    // atualiza sempre que o menu abre
    new MutationObserver(() => { if (!document.getElementById('modalMenu').hidden) mostrar(); }).observe(document.getElementById('modalMenu'), { attributes: true, attributeFilter: ['hidden'] });
  }
}
