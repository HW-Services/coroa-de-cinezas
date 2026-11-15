// ============================================================
//  Mapa da zona (tecla Tab): mostra o traçado da área atual,
//  o que já foi explorado e os pontos de interesse.
// ============================================================
'use strict';

const MZ = { aberto: false, img: null, imgMundo: null, tUlt: 0, celula: 5 };
window.MZ = MZ;

// grade de exploração por área (guardada em J.z, sobrevive ao portal da cidade)
MZ.grade = function () {
  const m = J.mundo, z = J.z; if (!m || !z) return null;
  const L = (m.AREA + 20) * 2, n = Math.ceil(L / MZ.celula);
  if (!z.explorado || z.explorado.n !== n) z.explorado = { n, L, d: new Uint8Array(n * n) };
  return z.explorado;
};
MZ.explorar = function () {
  const g = MZ.grade(), jg = J.jog; if (!g || !jg) return;
  const R = 30, c = MZ.celula, n = g.n, meio = g.L / 2;
  const ci = Math.floor((jg.x + meio) / c), cj = Math.floor((jg.z + meio) / c), r = Math.ceil(R / c);
  for (let j = Math.max(0, cj - r); j <= Math.min(n - 1, cj + r); j++)
    for (let i = Math.max(0, ci - r); i <= Math.min(n - 1, ci + r); i++)
      if ((i - ci) * (i - ci) + (j - cj) * (j - cj) <= r * r) g.d[j * n + i] = 1;
};

// imagem do traçado (gerada uma vez por área)
MZ.gerarImagem = function () {
  const m = J.mundo; const N = 360; const L = (m.AREA + 20) * 2;
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'); const img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i / N - 0.5) * L, z = (j / N - 0.5) * L; const e = m.borda(x, z), k = (j * N + i) * 4;
    if (e < -0.6) { img.data[k] = 132; img.data[k + 1] = 112; img.data[k + 2] = 78; img.data[k + 3] = 255; }
    else if (e < 1.6) { img.data[k] = 226; img.data[k + 1] = 190; img.data[k + 2] = 120; img.data[k + 3] = 255; }
  }
  g.putImageData(img, 0, 0);
  MZ.img = c; MZ.imgMundo = m; MZ.L = L;
};

MZ.abrir = function (abrir) {
  const el = document.getElementById('mapaZona');
  const vai = abrir == null ? el.hidden : abrir;
  if (vai === MZ.aberto && !el.hidden === vai) return;
  if (vai && (!J.mundo || !J.z || J.estado === 'menu')) return;
  el.hidden = !vai; MZ.aberto = vai;
  if (vai) { if (MZ.imgMundo !== J.mundo) MZ.gerarImagem(); MZ.desenhar(); if (window.SOM) SOM.tocar('abrir', { vol: 0.45 }); }
  else if (window.SOM) SOM.tocar('fechar', { vol: 0.4 });
};

MZ.desenhar = function () {
  const cv = document.getElementById('mzCanvas'); if (!cv || !J.mundo) return;
  const caixa = cv.parentElement.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.floor(Math.min(caixa.width, caixa.height));
  if (cv.width !== W * dpr) { cv.width = cv.height = W * dpr; cv.style.width = cv.style.height = W + 'px'; }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, W);
  const m = J.mundo, L = MZ.L, meio = L / 2;
  const P = (x) => (x + meio) / L * W;
  // traçado: tudo visível, mas o que não foi explorado fica escuro
  g.imageSmoothingEnabled = true;
  g.globalAlpha = 0.32; g.drawImage(MZ.img, 0, 0, W, W);
  const gr = MZ.grade();
  if (gr) {
    const mask = MZ._mask || (MZ._mask = document.createElement('canvas'));
    mask.width = mask.height = gr.n; const mg = mask.getContext('2d'); const id = mg.createImageData(gr.n, gr.n);
    for (let k = 0; k < gr.d.length; k++) if (gr.d[k]) id.data[k * 4 + 3] = 255;
    mg.putImageData(id, 0, 0);
    const tmp = MZ._tmp || (MZ._tmp = document.createElement('canvas')); tmp.width = tmp.height = W;
    const tg = tmp.getContext('2d'); tg.clearRect(0, 0, W, W); tg.imageSmoothingEnabled = true;
    tg.drawImage(mask, 0, 0, W, W); tg.globalCompositeOperation = 'source-in'; tg.drawImage(MZ.img, 0, 0, W, W); tg.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1; g.drawImage(tmp, 0, 0);
  }
  g.globalAlpha = 1;
  const marca = (x, z, fn) => fn(P(x), P(z));
  // chefe
  if (J.z.def.chefe && m.fim) {
    const vivo = J.z.chefe && !J.z.chefe.morto;
    marca(m.fim.x, m.fim.z, (x, y) => { g.font = '700 22px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = vivo ? '#ff4a3a' : '#8a7a6a'; g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeText('☠', x, y); g.fillText('☠', x, y); });
  }
  // portões
  for (const pt of J.portoes) marca(pt.x, pt.z, (x, y) => {
    const fechado = pt.saida && !J.z.saidaAberta;
    g.fillStyle = fechado ? '#ff5040' : pt.entrada ? '#ffb060' : '#8aa0ff'; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.stroke();
    const dest = TODAS_AREAS[pt.destino]; if (dest) { g.font = '700 12px "Alegreya Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.lineWidth = 3; g.strokeText((pt.entrada ? '◂ ' : '▸ ') + dest.nome, x, y - 9); g.fillStyle = '#f0e2c4'; g.fillText((pt.entrada ? '◂ ' : '▸ ') + dest.nome, x, y - 9); }
  });
  // interativos
  for (const it of J.interativos) marca(it.x, it.z, (x, y) => {
    g.strokeStyle = '#000'; g.lineWidth = 1.5;
    if (it.tipo === 'passagem') { g.fillStyle = it.ativa ? '#4aa8ff' : '#506a88'; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 6, y); g.lineTo(x, y + 8); g.lineTo(x - 6, y); g.closePath(); g.fill(); g.stroke(); }
    else if (it.tipo === 'tesouro') { g.fillStyle = '#ffc840'; g.fillRect(x - 6, y - 4, 12, 8); g.strokeRect(x - 6, y - 4, 12, 8); }
    else if (it.tipo === 'santuario') { g.fillStyle = '#b080ff'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
    else if (it.tipo === 'objetivo') { g.fillStyle = '#40ffd0'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
    else if (it.tipo === 'portal') { g.fillStyle = '#9080ff'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
    else if (it.tipo === 'npc') { g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.stroke(); }
  });
  // outros jogadores
  if (window.MP && MP.outros) for (const o of MP.outros.values()) if (o.s) marca(o.x, o.z, (x, y) => {
    g.fillStyle = '#6ab8ff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.stroke();
    g.font = '700 12px "Alegreya Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top'; g.lineWidth = 3; g.strokeText(o.s.n, x, y + 7); g.fillStyle = '#bfe0ff'; g.fillText(o.s.n, x, y + 7);
  });
  // você
  const jg = J.jog;
  marca(jg.x, jg.z, (x, y) => {
    g.save(); g.translate(x, y); g.rotate(-jg.ang + Math.PI);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
  });
  // explorado %
  if (gr) {
    let tot = 0, vis = 0; const n = gr.n;
    for (let j = 0; j < n; j += 2) for (let i = 0; i < n; i += 2) { const x = -meio + (i + 0.5) * MZ.celula, z = -meio + (j + 0.5) * MZ.celula; if (m.borda(x, z) < -1) { tot++; if (gr.d[j * n + i]) vis++; } }
    const t = document.getElementById('mzExpl'); if (t) t.textContent = tot ? `Explorado: ${Math.round(vis / tot * 100)}%` : '';
  }
  const tt = document.getElementById('mzTitulo'); if (tt) tt.textContent = J.z.def.nome + (J.z.def.cidade ? '' : ' · Nível ' + J.z.def.nivel);
};

// ------------------------------------------------------------
// Interface
// ------------------------------------------------------------
(function () {
  const css = `
  #mapaZona { position: fixed; inset: 0; z-index: 19; display: flex; align-items: center; justify-content: center; background: rgba(5,4,3,.55); padding: 16px; pointer-events: none; }
  #mapaZona .mzCaixa { pointer-events: auto; width: min(92vh, 92vw, 900px); height: min(92vh, 92vw, 900px); max-height: calc(100vh - 32px); display: flex; flex-direction: column; background: radial-gradient(ellipse at 50% 40%, rgba(40,32,22,.96), rgba(10,8,6,.97)); border: 2px solid var(--borda); border-radius: 4px; box-shadow: 0 0 0 1px #000, 0 10px 60px #000; }
  #mapaZona h2 { font-family: var(--f-titulo); color: var(--bronze2); font-size: 18px; margin: 0; padding: 10px 14px; border-bottom: 1px solid var(--borda); display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  #mapaZona h2 small { font-family: var(--f-corpo); color: var(--texto2); font-size: 13px; font-weight: 400; margin-left: auto; }
  #mapaZona .mzArea { flex: 1; min-height: 0; display: grid; place-items: center; padding: 10px; }
  #mapaZona .mzLeg { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 8px 14px 12px; font-size: 12px; color: var(--texto2); border-top: 1px solid var(--borda); }
  #mapaZona .mzLeg i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; vertical-align: -1px; border: 1px solid #000; }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'mapaZona'; d.hidden = true;
  d.innerHTML = `<div class="mzCaixa" role="dialog" aria-label="Mapa da zona"><h2><span id="mzTitulo">Mapa da Zona</span><small id="mzExpl"></small><button class="fechar" id="mzFechar" aria-label="Fechar">✕</button></h2>
    <div class="mzArea"><canvas id="mzCanvas"></canvas></div>
    <div class="mzLeg"><span><i style="background:#fff;border-radius:0"></i>Você</span><span><i style="background:#6ab8ff"></i>Outros jogadores</span><span><i style="background:#ffb060"></i>Entrada</span><span><i style="background:#8aa0ff"></i>Saída</span><span><i style="background:#ff5040"></i>Saída fechada (chefe)</span><span><i style="background:#4aa8ff;border-radius:0;transform:rotate(45deg)"></i>Pedra de Passagem</span><span><i style="background:#ffc840;border-radius:1px"></i>Tesouro</span><span><i style="background:#b080ff"></i>Santuário</span><span><i style="background:#40ffd0"></i>Objetivo</span><span style="color:#ff4a3a">☠ Chefe</span><span>Tab ou Esc para fechar</span></div></div>`;
  document.body.insertBefore(d, document.getElementById('tooltip'));
  document.getElementById('mzFechar').addEventListener('click', () => MZ.abrir(false));
  // botão no painel inferior
  const menu = document.getElementById('botoesMenu');
  if (menu) {
    const bm = [...menu.querySelectorAll('.bmenu')].find(b => b.dataset.p === 'mapa'); if (bm) bm.textContent = 'Mundo (M)';
    const b = document.createElement('button'); b.className = 'bmenu'; b.id = 'bMapaZona'; b.textContent = 'Zona (Tab)';
    b.addEventListener('click', () => MZ.abrir()); if (bm) bm.before(b); else menu.appendChild(b);
  }
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat && J.estado !== 'menu') MZ.abrir(); e.stopImmediatePropagation(); }
    else if (e.code === 'Escape' && MZ.aberto) { MZ.abrir(false); e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('resize', () => { if (MZ.aberto) MZ.desenhar(); });
  // exploração e atualização do mapa aberto
  const at0 = J.atualizar;
  J.atualizar = function (dt) {
    at0(dt);
    const agora = performance.now();
    if (agora - MZ.tUlt > 250) { MZ.tUlt = agora; try { MZ.explorar(); if (MZ.aberto) MZ.desenhar(); } catch (err) { console.error(err); } }
  };
  const ent0 = J.entrarDef;
  J.entrarDef = function (def, chegada, op) { ent0(def, chegada, op); MZ.img = null; MZ.imgMundo = null; if (MZ.aberto) { MZ.gerarImagem(); MZ.desenhar(); } };
  const rest0 = J.restaurarGuardado;
  J.restaurarGuardado = function () { rest0(); MZ.imgMundo = null; };
  const fe0 = UI.fecharTudo; UI.fecharTudo = function () { fe0(); MZ.abrir(false); };
})();
