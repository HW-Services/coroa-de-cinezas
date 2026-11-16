// ============================================================
//  Mapa do Mundo ilustrado: cada ato é uma região pintada
//  (costa, brejo, floresta, cavernas, deserto, gelo, vulcão),
//  com estradas, pedras de passagem, chefes, cidades e névoa
//  sobre as áreas ainda não descobertas. Os nomes aparecem só
//  ao passar o mouse.
// ============================================================
'use strict';

const MAPA_ATO = { W: 1100, H: 640, cache: {}, aba: null };

MAPA_ATO.nos = function (ato) {
  const ids = ato === 1 ? ['z1', 'c1', 'z2', 'z2b', 'z3', 'z3b', 'z4', 'z4b', 'z5']
    : ato === 2 ? ['c2', 'z6', 'z6b', 'z7', 'z7b', 'z8', 'z8b', 'z8c', 'z9']
      : ['c3', 'z10', 'z10b', 'z11', 'z11b', 'z12', 'z12b', 'z13', 'z13b', 'z14', 'z14b', 'z15'];
  return ids.map(id => TODAS_AREAS[id]).filter(Boolean);
};

// posições: uma rota sinuosa da esquerda para a direita
MAPA_ATO.layout = function (ato) {
  const nos = MAPA_ATO.nos(ato), W = MAPA_ATO.W, H = MAPA_ATO.H;
  const rnd = mulberry32(ato * 991);
  const n = nos.length;
  return nos.map((z, i) => {
    const t = i / (n - 1);
    const x = W * (0.09 + t * 0.82) + (rnd() - 0.5) * 50;
    const y = H * (0.5 + Math.sin(t * Math.PI * (ato === 3 ? 2.2 : 1.6) + ato) * 0.27) + (rnd() - 0.5) * 70;
    let bioma = z.bioma;
    return { z, x, y, bioma, i };
  });
};

// ---------- pintura do terreno (cacheada por ato) ----------
const COR_BIOMA = {
  litoral: [[84, 112, 52], [114, 134, 66]], pantano: [[56, 70, 38], [78, 84, 44]], floresta: [[38, 66, 30], [58, 86, 40]],
  caverna: [[70, 60, 52], [96, 84, 70]], deserto: [[196, 162, 98], [214, 182, 118]], gelo: [[206, 216, 226], [232, 238, 244]], vulcao: [[56, 42, 38], [82, 60, 50]],
};
MAPA_ATO.pintar = function (ato) {
  if (MAPA_ATO.cache[ato]) return MAPA_ATO.cache[ato];
  const W = MAPA_ATO.W, H = MAPA_ATO.H, S = 2, w = W / S, h = H / S;
  const L = MAPA_ATO.layout(ato), R = criarRuido(ato * 77 + 5), rnd = mulberry32(ato * 31 + 7);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const baixa = document.createElement('canvas'); baixa.width = w; baixa.height = h; const gb = baixa.getContext('2d');
  const img = gb.createImageData(w, h); const celula = new Int8Array(w * h); const agua = new Uint8Array(w * h);
  const dist = (px, py, n) => { const dx = px - n.x, dy = py - n.y; return dx * dx + dy * dy; };
  // relevo calculado uma vez por pixel; o sombreamento usa os vizinhos
  const alt = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) alt[y * w + x] = R.fbm(x * S * 0.01, y * S * 0.01, 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x * S, py = y * S;
    // fronteiras irregulares entre regiões
    const wx = px + R.fbm(px * 0.006, py * 0.006, 2) * 90, wy = py + R.fbm(px * 0.006 + 9, py * 0.006 - 4, 2) * 90;
    let bi = 0, bd = 1e12; for (let k = 0; k < L.length; k++) { const d = dist(wx, wy, L[k]); if (d < bd) { bd = d; bi = k; } }
    celula[y * w + x] = bi;
    const no = L[bi]; const bioma = no.z.cidade ? (L[bi + 1] || L[bi - 1]).bioma : no.bioma;
    const [A, B] = COR_BIOMA[bioma] || COR_BIOMA.floresta;
    const n1 = alt[y * w + x], n2 = R.n(px * 0.05, py * 0.05);
    let k = 0.5 + n1 * 0.6 + n2 * 0.2;
    let r = A[0] + (B[0] - A[0]) * k, gg = A[1] + (B[1] - A[1]) * k, b = A[2] + (B[2] - A[2]) * k;
    const hx = alt[y * w + Math.min(w - 1, x + 1)] - alt[y * w + Math.max(0, x - 1)];
    const hy = alt[Math.min(h - 1, y + 1) * w + x] - alt[Math.max(0, y - 1) * w + x];
    let luz = 1 + (-hx - hy) * 3.2;
    // detalhes de cada bioma
    if (bioma === 'deserto') { const duna = Math.sin(px * 0.045 + R.fbm(px * 0.01, py * 0.01, 3) * 9 + py * 0.02); luz *= 0.92 + duna * 0.1; }
    if (bioma === 'gelo' || bioma === 'caverna') { const crista = Math.pow(R.ridge(px * 0.012, py * 0.012, 4), 3); luz *= 0.75 + crista * 0.6; if (bioma === 'gelo' && crista < 0.35) { r *= 0.85; gg *= 0.9; } }
    if (bioma === 'vulcao') { const veio = Math.pow(R.ridge(px * 0.009 + 3, py * 0.009, 3), 12); if (veio > 0.25) { const q = Math.min(1, (veio - 0.25) * 2.5); r = r + (255 - r) * q; gg = gg + (110 - gg) * q; b = b + (20 - b) * q; luz = 1 + q * 0.6; } }
    if (bioma === 'pantano') { const poca = R.fbm(px * 0.02 + 40, py * 0.02, 3); if (poca > 0.28) { r = 40; gg = 54; b = 44; luz = 0.9 + (poca - 0.28) * 0.6; agua[y * w + x] = 1; } }
    // mar no ato I (lado de baixo/esquerdo)
    if (ato === 1) {
      const costa = py / H * 0.9 - px / W * 0.55 + R.fbm(px * 0.006, py * 0.006, 3) * 0.35;
      if (costa > 0.55 && bioma === 'litoral') {
        const fundo = Math.min(1, (costa - 0.55) * 4);
        r = 30 - fundo * 12; gg = 82 - fundo * 30; b = 98 - fundo * 26; luz = 1 + R.n(px * 0.08, py * 0.08) * 0.05; agua[y * w + x] = 2;
      } else if (costa > 0.5 && bioma === 'litoral') { r = 196; gg = 178; b = 124; }
    }
    // rios gelados e lagos no ato II/III
    if (ato === 2 && bioma === 'floresta') { const rio = Math.abs(R.fbm(px * 0.004 + 20, py * 0.004, 3)); if (rio < 0.025) { r = 38; gg = 74; b = 88; luz = 1; agua[y * w + x] = 1; } }
    const i = (y * w + x) * 4;
    img.data[i] = Math.max(0, Math.min(255, r * luz)); img.data[i + 1] = Math.max(0, Math.min(255, gg * luz)); img.data[i + 2] = Math.max(0, Math.min(255, b * luz)); img.data[i + 3] = 255;
  }
  gb.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(baixa, 0, 0, W, H);
  const bioPos = (x, y) => { const xi = Math.min(w - 1, Math.max(0, Math.floor(x / S))), yi = Math.min(h - 1, Math.max(0, Math.floor(y / S))); const no = L[celula[yi * w + xi]]; return { bioma: no.z.cidade ? (L[no.i + 1] || L[no.i - 1]).bioma : no.bioma, agua: agua[yi * w + xi] }; };
  // distância à rota (para deixar a estrada livre de árvores)
  const pertoRota = (x, y) => { for (let k = 0; k < L.length - 1; k++) { const a = L[k], b = L[k + 1]; const vx = b.x - a.x, vy = b.y - a.y; const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / (vx * vx + vy * vy))); if (Math.hypot(x - a.x - vx * t, y - a.y - vy * t) < 26) return true; } return L.some(n => Math.hypot(x - n.x, y - n.y) < 34); };
  // vegetação, rochas, ruínas
  const arvore = (x, y, s, cor) => {
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + s * 0.4, y + s * 0.5, s, s * 0.6, 0, 0, 7); g.fill();
    const gr = g.createRadialGradient(x - s * 0.35, y - s * 0.4, 1, x, y, s); gr.addColorStop(0, `rgb(${cor[0] + 50},${cor[1] + 50},${cor[2] + 30})`); gr.addColorStop(1, `rgb(${cor[0] * 0.55},${cor[1] * 0.55},${cor[2] * 0.55})`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
  };
  const pinheiro = (x, y, s, neve) => { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + s * 0.5, y + s * 0.8, s * 0.7, s * 0.35, 0, 0, 7); g.fill(); g.fillStyle = neve ? '#5a7a6a' : '#1e3a1e'; g.beginPath(); g.moveTo(x, y - s * 1.4); g.lineTo(x + s * 0.8, y + s * 0.7); g.lineTo(x - s * 0.8, y + s * 0.7); g.closePath(); g.fill(); if (neve) { g.fillStyle = '#f2f6fa'; g.beginPath(); g.moveTo(x, y - s * 1.4); g.lineTo(x + s * 0.4, y - s * 0.4); g.lineTo(x - s * 0.4, y - s * 0.4); g.closePath(); g.fill(); } };
  const montanha = (x, y, s, cor, neve) => { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(x - s, y + s * 0.3); g.lineTo(x + s * 0.2, y - s); g.lineTo(x + s * 1.4, y + s * 0.3); g.fill(); g.fillStyle = cor; g.beginPath(); g.moveTo(x - s, y + s * 0.2); g.lineTo(x, y - s); g.lineTo(x + s, y + s * 0.2); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(x - s, y + s * 0.2); g.lineTo(x, y - s); g.lineTo(x - s * 0.1, y + s * 0.2); g.closePath(); g.fill(); if (neve) { g.fillStyle = '#f4f8ff'; g.beginPath(); g.moveTo(x - s * 0.32, y - s * 0.6); g.lineTo(x, y - s); g.lineTo(x + s * 0.32, y - s * 0.6); g.lineTo(x, y - s * 0.5); g.closePath(); g.fill(); } };
  for (let k = 0; k < 5200; k++) {
    const x = rnd() * W, y = rnd() * H; const { bioma, agua: ag } = bioPos(x, y); if (ag || pertoRota(x, y)) continue;
    const dens = R.fbm(x * 0.008 + 7, y * 0.008, 3);
    if (bioma === 'floresta' && dens > -0.15) { if (rnd() < 0.55) pinheiro(x, y, 4 + rnd() * 3); else arvore(x, y, 4 + rnd() * 4, rnd() < 0.14 ? [120, 30, 26] : [40 + rnd() * 20, 76 + rnd() * 20, 34]); }
    else if (bioma === 'pantano' && dens > 0.05 && rnd() < 0.5) arvore(x, y, 3 + rnd() * 3, rnd() < 0.35 ? [110, 34, 30] : [60, 70, 34]);
    else if (bioma === 'litoral' && dens > -0.05 && rnd() < 0.5) arvore(x, y, 3 + rnd() * 3.5, rnd() < 0.5 ? [52, 86, 36] : [70, 100, 44]);
    else if (bioma === 'gelo' && rnd() < 0.18) { if (dens > 0.1) pinheiro(x, y, 4 + rnd() * 3, true); else if (rnd() < 0.4) montanha(x, y, 10 + rnd() * 14, '#8a96a6', true); }
    else if (bioma === 'caverna' && rnd() < 0.2) { if (rnd() < 0.6) montanha(x, y, 8 + rnd() * 12, '#5a4e46'); else { g.save(); g.shadowColor = '#9a70ff'; g.shadowBlur = 10; g.fillStyle = rnd() < 0.5 ? '#a080ff' : '#60a8ff'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 3, y); g.lineTo(x, y + 3); g.lineTo(x - 3, y); g.closePath(); g.fill(); g.restore(); } }
    else if (bioma === 'deserto' && rnd() < 0.05) { if (rnd() < 0.5) arvore(x, y, 3 + rnd() * 2, [70, 96, 40]); else { g.fillStyle = '#8a6a42'; g.fillRect(x, y, 3, 8); g.fillRect(x + 7, y + 1, 3, 7); g.fillRect(x - 1, y - 1, 12, 2); } }
    else if (bioma === 'vulcao' && rnd() < 0.08) { if (rnd() < 0.7) montanha(x, y, 8 + rnd() * 12, '#2e2220'); else { g.save(); g.shadowColor = '#ff5a10'; g.shadowBlur = 12; g.fillStyle = '#ff7a20'; g.beginPath(); g.arc(x, y, 2 + rnd() * 2, 0, 7); g.fill(); g.restore(); } }
  }
  // vinheta
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return (MAPA_ATO.cache[ato] = { c, L, celula, w, h, S });
};

// ---------- desenho por cima (estradas, névoa, marcadores) ----------
MAPA_ATO.desenhar = function (cv, ato, t, hover) {
  const P = MAPA_ATO.pintar(ato), g = cv.getContext('2d'), W = MAPA_ATO.W, H = MAPA_ATO.H, p = J.pers;
  g.drawImage(P.c, 0, 0);
  const conhecida = (z) => z.cidade ? p.cidades.includes(z.id) : p.zonas.includes(z.id);
  // névoa sobre as regiões desconhecidas
  if (!MAPA_ATO.nevoa || MAPA_ATO.nevoa.ato !== ato || MAPA_ATO.nevoa.chave !== P.L.map(n => conhecida(n.z) ? 1 : 0).join('')) {
    const f = document.createElement('canvas'); f.width = P.w; f.height = P.h; const fg = f.getContext('2d'); const im = fg.createImageData(P.w, P.h);
    for (let k = 0; k < P.w * P.h; k++) if (!conhecida(P.L[P.celula[k]].z)) { im.data[k * 4] = 10; im.data[k * 4 + 1] = 8; im.data[k * 4 + 2] = 8; im.data[k * 4 + 3] = 215; }
    fg.putImageData(im, 0, 0);
    const f2 = document.createElement('canvas'); f2.width = W; f2.height = H; const g2 = f2.getContext('2d'); g2.filter = 'blur(10px)'; g2.drawImage(f, 0, 0, W, H);
    MAPA_ATO.nevoa = { ato, chave: P.L.map(n => conhecida(n.z) ? 1 : 0).join(''), c: f2 };
  }
  g.drawImage(MAPA_ATO.nevoa.c, 0, 0);
  // estradas entre áreas conhecidas
  const L = P.L;
  for (let k = 0; k < L.length - 1; k++) {
    const a = L[k], b = L[k + 1]; const vis = conhecida(a.z) && conhecida(b.z); const meia = conhecida(a.z) || conhecida(b.z);
    if (!meia) continue;
    const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
    g.save(); g.lineCap = 'round';
    g.strokeStyle = 'rgba(20,14,8,.7)'; g.lineWidth = 7; g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(mx, my, b.x, b.y); g.stroke();
    g.strokeStyle = vis ? '#c8a870' : 'rgba(200,168,112,.45)'; g.lineWidth = 3.5; if (!vis) g.setLineDash([6, 8]);
    g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(mx, my, b.x, b.y); g.stroke();
    if (vis) { g.strokeStyle = 'rgba(120,220,255,.55)'; g.lineWidth = 1.4; g.setLineDash([2, 10]); g.lineDashOffset = -t * 18; g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(mx, my, b.x, b.y); g.stroke(); }
    g.restore();
  }
  // marcadores
  for (const n of L) {
    const z = n.z, con = conhecida(z), pedra = p.waypoints.includes(z.id), aqui = J.z && J.z.def.id === z.id, sob = hover === n;
    if (!con && !aqui) { g.fillStyle = 'rgba(140,120,100,.5)'; g.font = '700 16px Cinzel, serif'; g.textAlign = 'center'; g.fillText('?', n.x, n.y + 6); continue; }
    if (z.cidade) MAPA_ATO.icCidade(g, n.x, n.y, sob);
    else {
      g.save(); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(n.x, n.y, 11, 0, 7); g.fill();
      g.strokeStyle = sob ? '#ffe8a0' : '#b89860'; g.lineWidth = 2; g.stroke(); g.restore();
    }
    if (pedra) { // pedra de passagem: losango azul brilhante
      g.save(); g.shadowColor = '#60c8ff'; g.shadowBlur = 14 + Math.sin(t * 3 + n.i) * 5;
      const s = z.cidade ? 6 : 7, yy = z.cidade ? n.y + 18 : n.y;
      g.fillStyle = '#7ad8ff'; g.beginPath(); g.moveTo(n.x, yy - s * 1.4); g.lineTo(n.x + s, yy); g.lineTo(n.x, yy + s * 1.4); g.lineTo(n.x - s, yy); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(n.x, yy - s * 1.4); g.lineTo(n.x - s, yy); g.lineTo(n.x, yy); g.closePath(); g.fill(); g.restore();
    } else if (!z.cidade) { g.fillStyle = '#6a5a48'; g.beginPath(); g.arc(n.x, n.y, 3, 0, 7); g.fill(); }
    if (z.chefe) { const morto = p.chefesMortos.includes(z.chefe); MAPA_ATO.icCaveira(g, n.x + 14, n.y - 16, morto); }
    if (aqui) { // você está aqui
      const r = 17 + Math.sin(t * 4) * 3;
      g.save(); g.strokeStyle = '#ffd860'; g.lineWidth = 2.5; g.shadowColor = '#ffb020'; g.shadowBlur = 12; g.beginPath(); g.arc(n.x, n.y, r, 0, 7); g.stroke();
      g.fillStyle = '#ffd860'; g.beginPath(); g.moveTo(n.x, n.y - r - 12); g.lineTo(n.x + 7, n.y - r - 2); g.lineTo(n.x - 7, n.y - r - 2); g.closePath(); g.fill(); g.restore();
    }
  }
};
MAPA_ATO.icCidade = function (g, x, y, sob) {
  g.save(); g.shadowColor = sob ? '#ffe8a0' : 'rgba(0,0,0,.8)'; g.shadowBlur = 8;
  g.fillStyle = '#d8c8a0'; g.strokeStyle = '#2a1e12'; g.lineWidth = 1.5;
  const torre = (tx, ty, tw, th) => { g.fillRect(tx - tw / 2, ty - th, tw, th); g.strokeRect(tx - tw / 2, ty - th, tw, th); g.fillStyle = '#8a3a2a'; g.beginPath(); g.moveTo(tx - tw / 2 - 2, ty - th); g.lineTo(tx, ty - th - tw); g.lineTo(tx + tw / 2 + 2, ty - th); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#d8c8a0'; };
  g.fillRect(x - 14, y - 8, 28, 12); g.strokeRect(x - 14, y - 8, 28, 12);
  torre(x - 12, y + 4, 7, 18); torre(x + 12, y + 4, 7, 18); torre(x, y + 4, 9, 24);
  g.fillStyle = '#2a1e12'; g.fillRect(x - 2.5, y - 4, 5, 8);
  g.restore();
};
MAPA_ATO.icCaveira = function (g, x, y, morto) {
  g.save(); g.shadowColor = morto ? 'transparent' : '#ff3020'; g.shadowBlur = 10;
  g.fillStyle = morto ? '#8a8070' : '#f0e6d0'; g.beginPath(); g.arc(x, y - 1, 7, Math.PI, 0); g.lineTo(x + 7, y + 3); g.lineTo(x + 4, y + 4); g.lineTo(x + 4, y + 7); g.lineTo(x - 4, y + 7); g.lineTo(x - 4, y + 4); g.lineTo(x - 7, y + 3); g.closePath(); g.fill();
  g.fillStyle = morto ? '#3a3228' : '#c01818'; g.beginPath(); g.arc(x - 2.7, y, 1.9, 0, 7); g.arc(x + 2.7, y, 1.9, 0, 7); g.fill();
  if (morto) { g.strokeStyle = '#7ad870'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x + 5, y + 6); g.lineTo(x + 8, y + 9); g.lineTo(x + 13, y + 2); g.stroke(); }
  g.restore();
};

// ---------- janela ----------
{
  const css = `
  #modalMapa .caixa { max-width: 1160px !important; width: 96vw; }
  .mmTopo { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
  .mmTopo button { font-family: Cinzel, serif; background: linear-gradient(#2a2016, #16100a); color: #b8a080; border: 1px solid #4a3a26; padding: 5px 16px; cursor: pointer; letter-spacing: .06em; }
  .mmTopo button.on { color: #ffe0a0; border-color: #c8a060; box-shadow: inset 0 0 10px rgba(200,160,96,.35); }
  .mmTopo button:disabled { opacity: .35; cursor: default; }
  .mmTopo .mmNota { margin-left: auto; color: #a89878; font-size: 13px; }
  .mmQuadro { position: relative; border: 2px solid #4a3a26; box-shadow: 0 0 0 1px #000, 0 0 30px rgba(0,0,0,.8) inset; background: #0a0806; }
  .mmQuadro canvas { display: block; width: 100%; height: auto; cursor: default; }
  .mmDica { position: absolute; pointer-events: none; background: rgba(10,8,6,.94); border: 1px solid #8a6a3a; padding: 6px 10px; font-family: "Alegreya Sans", sans-serif; color: #e8dcc0; font-size: 13px; white-space: nowrap; transform: translate(-50%, calc(-100% - 18px)); }
  .mmDica b { font-family: Cinzel, serif; color: #ffe0a0; font-size: 15px; display: block; }
  .mmLeg { display: flex; gap: 18px; flex-wrap: wrap; color: #a89878; font-size: 12px; margin-top: 6px; }
  .mmLeg span::before { content: ''; display: inline-block; width: 10px; height: 10px; margin-right: 6px; vertical-align: -1px; background: var(--c); transform: rotate(45deg); box-shadow: 0 0 6px var(--c); }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
}
{
  const antigo = UI.abrirMapaMundo;
  UI.abrirMapaMundo = function (obrigatorio, podeViajar, soAtlas) {
    if (soAtlas) return antigo.apply(this, arguments);
    const p = J.pers;
    if (J.estado === 'jogando') J.estado = 'pausa';
    $('#fecharMapa').hidden = obrigatorio || !J.mundo;
    const corpo = $('#mapaCorpo'); corpo.innerHTML = '';
    const atoAtual = J.z && J.z.def.ato ? J.z.def.ato : 1;
    const conheceAto = (a) => MAPA_ATO.nos(a).some(n => n.cidade ? p.cidades.includes(n.id) : p.zonas.includes(n.id));
    if (!MAPA_ATO.aba || !conheceAto(MAPA_ATO.aba)) MAPA_ATO.aba = Math.min(3, Math.max(1, atoAtual));
    const topo = document.createElement('div'); topo.className = 'mmTopo';
    for (const a of [1, 2, 3]) { const b = document.createElement('button'); b.textContent = 'Ato ' + ['I', 'II', 'III'][a - 1]; b.disabled = !conheceAto(a); if (a === MAPA_ATO.aba) b.classList.add('on'); b.addEventListener('click', () => { MAPA_ATO.aba = a; UI.abrirMapaMundo(obrigatorio, podeViajar); }); topo.appendChild(b); }
    const bAt = document.createElement('button'); bAt.textContent = 'Atlas'; bAt.disabled = !(p.mapaMax > 0); bAt.addEventListener('click', () => { antigo(obrigatorio, podeViajar, false); const at = $('#mapaCorpo .atos'); if (at) at.remove(); const nt = $('#mapaCorpo .mapaNota'); if (nt) nt.remove(); const vt = document.createElement('button'); vt.className = 'btn'; vt.textContent = '← Voltar ao mapa'; vt.addEventListener('click', () => UI.abrirMapaMundo(obrigatorio, podeViajar)); $('#mapaCorpo').prepend(vt); });
    topo.appendChild(bAt);
    const nota = document.createElement('span'); nota.className = 'mmNota';
    nota.textContent = podeViajar ? 'Clique numa Pedra de Passagem (losango azul) para viajar.' : 'Viaje por uma Pedra de Passagem ou volte à cidade com um portal (V).';
    topo.appendChild(nota); corpo.appendChild(topo);
    const q = document.createElement('div'); q.className = 'mmQuadro';
    const cv = document.createElement('canvas'); cv.width = MAPA_ATO.W; cv.height = MAPA_ATO.H; q.appendChild(cv);
    const dica = document.createElement('div'); dica.className = 'mmDica'; dica.hidden = true; q.appendChild(dica);
    corpo.appendChild(q);
    const leg = document.createElement('div'); leg.className = 'mmLeg';
    leg.innerHTML = '<span style="--c:#7ad8ff">Pedra de Passagem ativada</span><span style="--c:#ffd860">Você está aqui</span><span style="--c:#ff3020">Chefe (✓ derrotado)</span><span style="--c:#d8c8a0">Cidade</span><span style="--c:#3a3028">Névoa: área não descoberta</span>';
    corpo.appendChild(leg);
    $('#modalMapa').hidden = false;
    // laço de animação e interação
    const ato = MAPA_ATO.aba; const L = MAPA_ATO.pintar(ato).L;
    let hover = null, rodando = true;
    const pos = (ev) => { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * MAPA_ATO.W / r.width, y: (ev.clientY - r.top) * MAPA_ATO.H / r.height, r }; };
    const conhecida = (z) => z.cidade ? p.cidades.includes(z.id) : p.zonas.includes(z.id);
    cv.addEventListener('mousemove', (ev) => {
      const { x, y, r } = pos(ev); hover = L.find(n => Math.hypot(n.x - x, n.y - y) < 22) || null;
      if (!hover) { dica.hidden = true; cv.style.cursor = 'default'; return; }
      const z = hover.z, con = conhecida(z), pedra = p.waypoints.includes(z.id);
      const pode = podeViajar && pedra && !(J.z && J.z.def.id === z.id);
      cv.style.cursor = pode ? 'pointer' : 'default';
      const chefe = z.chefe ? `<div>Chefe: ${esc(CHEFES[z.chefe].nome)}${p.chefesMortos.includes(z.chefe) ? ' <span style="color:#7ad870">✓ derrotado</span>' : ''}</div>` : '';
      dica.innerHTML = con ? `<b>${esc(z.nome)}</b><div>${z.cidade ? 'Cidade' : 'Nível de área ' + z.nivel}</div>${chefe}<div style="color:${pedra ? '#7ad8ff' : '#8a7a60'}">${pedra ? (pode ? 'Clique para viajar' : 'Pedra de Passagem ativada') : 'Pedra de Passagem não ativada'}</div>` : '<b>???</b><div>Área ainda não descoberta</div>';
      dica.style.left = (hover.x * r.width / MAPA_ATO.W) + 'px'; dica.style.top = (hover.y * r.height / MAPA_ATO.H) + 'px'; dica.hidden = false;
    });
    cv.addEventListener('mouseleave', () => { hover = null; dica.hidden = true; });
    cv.addEventListener('click', () => {
      if (!hover || !podeViajar) return; const z = hover.z;
      if (!p.waypoints.includes(z.id) || (J.z && J.z.def.id === z.id)) return;
      rodando = false; $('#modalMapa').hidden = true; $('#modalMorte').hidden = true; J.entrarArea(z.id, 'passagem');
    });
    const t0 = performance.now();
    const quadro = () => { if (!rodando || $('#modalMapa').hidden || !cv.isConnected) return; MAPA_ATO.desenhar(cv, ato, (performance.now() - t0) / 1000, hover); requestAnimationFrame(quadro); };
    quadro();
  };
}

// pinta com antecedência o mapa do ato em que o jogador está (abre na hora)
{
  const ent0 = J.entrarDef;
  J.entrarDef = function (def) {
    const r = ent0.apply(this, arguments);
    const ato = def && def.ato; if (ato >= 1 && ato <= 3 && !MAPA_ATO.cache[ato]) setTimeout(() => { try { MAPA_ATO.pintar(ato); } catch (e) { } }, 1500);
    return r;
  };
}
