// ============================================================
//  Minimapa realista: textura do terreno em alta resolução com
//  as cores do bioma, relevo sombreado, água/lava, copas das
//  árvores, pedras e telhados; névoa suave no que não foi
//  explorado; nitidez em telas de alta densidade; moldura com
//  bússola e ícones com contorno.
// ============================================================
'use strict';

const MINI = { vis: 90 };
const _srgb = (hex) => { const c = new THREE.Color(hex); c.convertLinearToSRGB(); return [c.r * 255, c.g * 255, c.b * 255]; };

UI.gerarMinimapa = function () {
  const m = J.mundo; if (!m) return;
  const B = m.B, L = m.AREA + 20, ext = L * 2;
  const N = Math.min(1100, Math.max(400, Math.ceil(ext * 1.7)));
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'); const img = g.createImageData(N, N);
  const chao = _srgb(B.chao), cam = _srgb(B.caminho), enc = _srgb(B.encosta), pico = _srgb(B.pico), agua = _srgb(B.agua);
  const u = ext / N; const rel = B.relevo || 14;
  const ruido = criarRuido(m.TAM | 7);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -L + (i + 0.5) * u, z = -L + (j + 0.5) * u;
    const e = m.borda(x, z), h = m.h(x, z);
    const k = (j * N + i) * 4;
    let r, gg, b;
    let wr = 0, wg = 0, wb = 0, ta = 0;
    // altura suavizada para o contorno da água (sem degraus)
    const hs = B.aguaNivel > -2.5 ? (h * 2 + m.h(x + 1.6, z) + m.h(x - 1.6, z) + m.h(x, z + 1.6) + m.h(x, z - 1.6) + m.h(x + 1.1, z + 1.1) + m.h(x - 1.1, z - 1.1)) / 8 : h;
    if (B.aguaNivel > -2.5 && hs < B.aguaNivel + 0.45) {
      ta = Math.max(0, Math.min(1, (B.aguaNivel + 0.45 - hs) / 0.6));
      const fundo = Math.min(1, (B.aguaNivel - h) * 0.35 + 0.2);
      if (B.lava) { const v = 0.75 + ruido.n(x * 0.15, z * 0.15) * 0.25; wr = 255 * v; wg = (90 + 60 * (1 - fundo)) * v; wb = 20; }
      else { const onda = 1 + ruido.n(x * 0.3, z * 0.3) * 0.05; wr = agua[0] * (1.15 - fundo * 0.5) * onda; wg = agua[1] * (1.15 - fundo * 0.5) * onda; wb = agua[2] * (1.2 - fundo * 0.4) * onda; }
    }
    {
      // cor de base: chão, caminho, encosta e pico pela altura e pela área andável
      const wc = m.pesoCaminho ? Math.max(0, Math.min(1, m.pesoCaminho(x, z))) : 0;
      const alto = Math.max(0, Math.min(1, h / (rel * 1.1)));
      const fora = Math.max(0, Math.min(1, (e + 0.5) / 6));
      r = chao[0] + (cam[0] - chao[0]) * wc; gg = chao[1] + (cam[1] - chao[1]) * wc; b = chao[2] + (cam[2] - chao[2]) * wc;
      r += (enc[0] - r) * fora * 0.8; gg += (enc[1] - gg) * fora * 0.8; b += (enc[2] - b) * fora * 0.8;
      r += (pico[0] - r) * alto * fora; gg += (pico[1] - gg) * alto * fora; b += (pico[2] - b) * alto * fora;
      // relevo sombreado (luz vinda do noroeste)
      const dx = m.h(x + 1.2, z) - m.h(x - 1.2, z), dz = m.h(x, z + 1.2) - m.h(x, z - 1.2);
      let luz = 1 + (-dx * 0.7 - dz * 0.7) * 0.22;
      luz = Math.max(0.45, Math.min(1.45, luz));
      // textura fina e variação
      luz *= 0.92 + ruido.fbm(x * 0.09, z * 0.09, 3) * 0.16 + ruido.n(x * 0.6, z * 0.6) * 0.04;
      // fora da área andável fica mais escuro; borda do caminho com contorno
      if (e > -0.3) luz *= 0.62 - Math.min(0.15, e * 0.01);
      else if (e > -1.6) luz *= 0.82 + (-e - 0.3) * 0.13;
      r *= luz; gg *= luz; b *= luz;
    }
    if (ta > 0) { const t = ta * ta * (3 - 2 * ta); const esp = ta > 0.05 && ta < 0.35 ? 1.25 : 1; r = r + (wr * esp - r) * t; gg = gg + (wg * esp - gg) * t; b = b + (wb * esp - b) * t; }
    img.data[k] = Math.max(0, Math.min(255, r)); img.data[k + 1] = Math.max(0, Math.min(255, gg)); img.data[k + 2] = Math.max(0, Math.min(255, b)); img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // vegetação, pedras e construções vistas de cima
  const px = (v) => (v + L) / u;
  const corDecor = {
    pinheiro: '#1c3818', pinheiroNeve: '#dfe8f0', arvore: '#2a4a1e', palmeira: '#3e6a26', arbusto: '#36562a', arvoreMorta: '#3a3026', arvoreQueimada: '#1a1210',
    rocha: '#8a857a', rochaVulc: '#3a2c28', cacto: '#4e7a34', pilar: '#c8b088', estalagmite: '#5a545a', cristal: '#9a70ff', cristalGelo: '#a8e0ff', obelisco: '#201418', braseiro: '#ff8030',
  };
  for (const o of m.obst) {
    const x = px(o.x), y = px(o.z);
    if (o.decor) {
      const copa = /pinheiro|arvore|palmeira/.test(o.decor) && !/Morta|Queimada/.test(o.decor);
      const rr = (copa ? o.r * 4.2 : o.r * 1.15) / u;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x + rr * 0.35, y + rr * 0.35, rr, 0, 7); g.fill();
      const cor = corDecor[o.decor] || '#556';
      const gr = g.createRadialGradient(x - rr * 0.35, y - rr * 0.35, rr * 0.1, x, y, rr);
      gr.addColorStop(0, ARTE.tom(cor, 0.35)); gr.addColorStop(1, ARTE.tom(cor, -0.35));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
      if (o.decor === 'cristal' || o.decor === 'braseiro') { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = ARTE.alfa(cor, 0.35); g.beginPath(); g.arc(x, y, rr * 2.2, 0, 7); g.fill(); g.restore(); }
    } else if (m.cidade && o.r >= 3) { // telhados das casas
      const s = o.r * 1.5 / u, a = Math.atan2(o.z, o.x);
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(-s * 0.9 + s * 0.15, -s * 0.65 + s * 0.15, s * 1.8, s * 1.3);
      g.fillStyle = '#6a3a2a'; g.fillRect(-s * 0.9, -s * 0.65, s * 1.8, s * 0.65); g.fillStyle = '#8a4a34'; g.fillRect(-s * 0.9, 0, s * 1.8, s * 0.65);
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.strokeRect(-s * 0.9, -s * 0.65, s * 1.8, s * 1.3);
      g.restore();
    }
  }
  if (m.cidade) { // muralha
    g.strokeStyle = '#7a756a'; g.lineWidth = 1.6 / u; g.beginPath(); g.arc(px(0), px(0), 33 / u, 0.3, Math.PI * 2 - 0.3); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.4 / u; g.beginPath(); g.arc(px(0), px(0), 34 / u, 0.3, Math.PI * 2 - 0.3); g.stroke();
  }
  UI.mini = c; MINI.L = L; MINI.nevoaChave = '';
};

// névoa do que ainda não foi explorado (usa a grade do mapa da zona)
MINI.nevoa = function () {
  const z = J.z; if (!z || !z.explorado || (J.mundo && J.mundo.cidade)) return null;
  const ex = z.explorado; let soma = 0; for (let i = 0; i < ex.d.length; i += 7) soma += ex.d[i];
  const chave = ex.n + ':' + soma;
  if (MINI.nevoaC && MINI.nevoaChave === chave) return MINI.nevoaC;
  const n = ex.n; const c = MINI.nevoaBase || (MINI.nevoaBase = document.createElement('canvas')); c.width = c.height = n;
  const g = c.getContext('2d'); const img = g.createImageData(n, n);
  for (let k = 0; k < n * n; k++) { img.data[k * 4] = 6; img.data[k * 4 + 1] = 5; img.data[k * 4 + 2] = 4; img.data[k * 4 + 3] = ex.d[k] ? 0 : 150; }
  g.putImageData(img, 0, 0);
  const big = MINI.nevoaC || (MINI.nevoaC = document.createElement('canvas')); big.width = big.height = n * 6;
  const gb = big.getContext('2d'); gb.clearRect(0, 0, big.width, big.height); gb.filter = 'blur(16px)'; gb.imageSmoothingEnabled = true; gb.drawImage(c, 0, 0, big.width, big.height); gb.filter = 'none';
  MINI.nevoaChave = chave; MINI.nevoaL = ex.L;
  return big;
};

UI.desenharMinimapa = function () {
  const cv = $('#minimapa'); const m = J.mundo, jg = J.jog; if (!m || !UI.mini || !jg) return;
  // resolução real da tela (sem serrilhado)
  const css = cv.clientWidth || 190, dpr = Math.min(3, window.devicePixelRatio || 1), W = Math.round(css * dpr);
  if (cv.width !== W) { cv.width = cv.height = W; }
  const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
  const R = W / 2;
  g.save(); g.beginPath(); g.arc(R, R, R - 3 * dpr, 0, 7); g.clip();
  const vis = MINI.vis;
  const px = (x) => R + (x - jg.x) / vis * W, pz = (z) => R + (z - jg.z) / vis * W;
  const L = MINI.L || m.AREA + 20; const tam = L * 2 / vis * W;
  g.fillStyle = '#0a0806'; g.fillRect(0, 0, W, W);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(UI.mini, px(-L), pz(-L), tam, tam);
  const nv = MINI.nevoa(); if (nv) { const Ln = MINI.nevoaL / 2; g.drawImage(nv, px(-Ln), pz(-Ln), Ln * 2 / vis * W, Ln * 2 / vis * W); }
  // marcadores com contorno
  const s = dpr;
  const ponto = (x, y, r, cor, brilho) => { if (brilho) { g.save(); g.shadowColor = cor; g.shadowBlur = 8 * s; } g.fillStyle = cor; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); if (brilho) g.restore(); g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 1.2 * s; g.stroke(); };
  const losango = (x, y, r, cor) => { g.save(); g.shadowColor = cor; g.shadowBlur = 10 * s; g.fillStyle = cor; g.beginPath(); g.moveTo(x, y - r * 1.3); g.lineTo(x + r, y); g.lineTo(x, y + r * 1.3); g.lineTo(x - r, y); g.closePath(); g.fill(); g.restore(); g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 1.2 * s; g.stroke(); };
  for (const pt of J.portoes) {
    const x = px(pt.x), y = pz(pt.z); const cor = pt.saida && !J.z.saidaAberta ? '#ff5040' : pt.entrada ? '#ffb060' : '#8aa8ff';
    g.save(); g.shadowColor = cor; g.shadowBlur = 8 * s; g.fillStyle = cor; g.beginPath(); g.arc(x, y, 5 * s, Math.PI, 0); g.lineTo(x + 5 * s, y + 5 * s); g.lineTo(x - 5 * s, y + 5 * s); g.closePath(); g.fill(); g.restore();
    g.strokeStyle = '#000'; g.lineWidth = 1.2 * s; g.stroke(); g.fillStyle = '#1a1008'; g.fillRect(x - 2 * s, y, 4 * s, 5 * s);
  }
  for (const it of J.interativos) {
    const x = px(it.x), y = pz(it.z); if (x < -10 || y < -10 || x > W + 10 || y > W + 10) continue;
    if (it.tipo === 'passagem') losango(x, y, 5 * s, it.ativa ? '#5ab8ff' : '#406080');
    else if (it.tipo === 'npc') { const mk = J.marcadorNpc(it.id); ponto(x, y, 3.5 * s, mk === '!' || mk === '?' ? '#ffd23a' : '#e8dcc0', mk === '!' || mk === '?'); }
    else if (it.tipo === 'objetivo') ponto(x, y, 4.5 * s, '#40ffd0', true);
    else if (it.tipo === 'portal') ponto(x, y, 4.5 * s, '#9a88ff', true);
    else if (it.tipo === 'tesouro') { g.fillStyle = '#e8b030'; g.fillRect(x - 4 * s, y - 3 * s, 8 * s, 6 * s); g.strokeStyle = '#000'; g.lineWidth = 1.2 * s; g.strokeRect(x - 4 * s, y - 3 * s, 8 * s, 6 * s); g.fillStyle = '#6a4a20'; g.fillRect(x - 4 * s, y - 0.5 * s, 8 * s, 1.2 * s); }
    else if (it.tipo === 'santuario') losango(x, y, 4 * s, '#c090ff');
    else ponto(x, y, 3 * s, '#c8a868', false);
  }
  for (const e of J.inimigos) {
    if (e.morto) continue;
    const x = px(e.x), y = pz(e.z); if (x < 0 || y < 0 || x > W || y > W) continue;
    if (e.rar === 'chefe') { MAPA_ATO.icCaveira(g, x, y, false); continue; }
    ponto(x, y, (e.rar === 'normal' ? 2 : 3) * s, e.rar === 'raro' ? '#ffe860' : e.rar === 'magico' ? '#8a8aff' : '#e04a3a', e.rar !== 'normal');
  }
  // outros jogadores
  if (window.MP && MP.outros) for (const o of MP.outros.values()) ponto(px(o.x), pz(o.z), 3.5 * s, '#60b0ff', true);
  // vinheta interna
  const vg = g.createRadialGradient(R, R, R * 0.55, R, R, R); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = vg; g.fillRect(0, 0, W, W);
  // jogador: seta com brilho e cone de visão
  g.save(); g.translate(R, R); g.rotate(-jg.ang + Math.PI);
  const cone = g.createRadialGradient(0, 0, 0, 0, 0, 34 * s); cone.addColorStop(0, 'rgba(255,240,200,.28)'); cone.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = cone; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 34 * s, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); g.closePath(); g.fill();
  g.shadowColor = '#ffd870'; g.shadowBlur = 8 * s; g.fillStyle = '#fff4d8';
  g.beginPath(); g.moveTo(0, -7 * s); g.lineTo(5 * s, 6 * s); g.lineTo(0, 3 * s); g.lineTo(-5 * s, 6 * s); g.closePath(); g.fill();
  g.shadowBlur = 0; g.strokeStyle = '#2a1a08'; g.lineWidth = 1.2 * s; g.stroke();
  g.restore();
  g.restore();
  // moldura de bronze com marcas e bússola
  const aro = g.createLinearGradient(0, 0, W, W); aro.addColorStop(0, '#e8c888'); aro.addColorStop(0.5, '#7a5a30'); aro.addColorStop(1, '#3a2814');
  g.strokeStyle = aro; g.lineWidth = 4 * s; g.beginPath(); g.arc(R, R, R - 3 * s, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1 * s; g.beginPath(); g.arc(R, R, R - 5.5 * s, 0, 7); g.stroke();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r0 = R - 3 * s - (i % 4 ? 2 : 4) * s; g.strokeStyle = 'rgba(40,24,8,.9)'; g.lineWidth = (i % 4 ? 1 : 1.6) * s; g.beginPath(); g.moveTo(R + Math.cos(a) * r0, R + Math.sin(a) * r0); g.lineTo(R + Math.cos(a) * (R - 1.5 * s), R + Math.sin(a) * (R - 1.5 * s)); g.stroke(); }
  // norte
  g.save(); g.translate(R, 9 * s); g.fillStyle = '#1a1008'; g.beginPath(); g.arc(0, 0, 7.5 * s, 0, 7); g.fill(); g.strokeStyle = '#c8a060'; g.lineWidth = 1.2 * s; g.stroke();
  g.fillStyle = '#ffe0a0'; g.font = `700 ${9 * s}px Cinzel, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', 0, 0.5 * s); g.restore();
};
// o minimapa já tem a própria moldura
{ const st = document.createElement('style'); st.textContent = '#minimapa{border:none!important;background:transparent!important;box-shadow:0 4px 18px rgba(0,0,0,.6);border-radius:50%}'; document.head.appendChild(st); }
