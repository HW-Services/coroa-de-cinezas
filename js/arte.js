// ============================================================
//  Arte dos itens: ícones pintados em canvas (por tipo, nível da
//  base e raridade) e jóias facetadas com lapidação por qualidade.
// ============================================================
'use strict';

// quinta qualidade de jóia (as anteriores mantêm os índices dos saves)
if (QUALIDADES.length === 4) QUALIDADES.push({ nome: 'Grandiosa', mult: 6, ilvl: 60 });

const ARTE = { cache: {} };
const _rgb = (h) => { const c = new THREE.Color(); c.setStyle(h); c.convertLinearToSRGB(); return [c.r * 255, c.g * 255, c.b * 255]; };
// clareia (k>0) ou escurece (k<0) uma cor css
ARTE.tom = function (h, k) {
  const [r, g, b] = _rgb(h); const f = (v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};
ARTE.alfa = function (h, a) { const [r, g, b] = _rgb(h); return `rgba(${r | 0},${g | 0},${b | 0},${a})`; };

// materiais por nível da base (0..4)
const MAT_TIER = [
  { metal: '#8a7a68', couro: '#7a5636', madeira: '#6e4a2a', enfeite: '#8a6a3a', runa: null },
  { metal: '#9aa2ac', couro: '#6a4628', madeira: '#7a5230', enfeite: '#a8884a', runa: null },
  { metal: '#cdd4de', couro: '#5a3a20', madeira: '#5a3a22', enfeite: '#d8b050', runa: null },
  { metal: '#8fb4d4', couro: '#3a3048', madeira: '#40344e', enfeite: '#e0c060', runa: '#5ad8ff' },
  { metal: '#5e4c80', couro: '#2a2030', madeira: '#2a2030', enfeite: '#c8a0ff', runa: '#d070ff' },
];

function _canvas(t = 128) { const c = document.createElement('canvas'); c.width = c.height = t; const g = c.getContext('2d'); g.translate(t / 2, t / 2); g.scale(t / 128, t / 128); g.lineJoin = 'round'; g.lineCap = 'round'; return [c, g]; }
// preenche e contorna um caminho
function _fs(g, fn, fill, lw = 3, stroke = '#0b0806') { g.beginPath(); fn(); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function _metal(g, x0, y0, x1, y1, base) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, ARTE.tom(base, 0.65)); gr.addColorStop(0.3, ARTE.tom(base, 0.1)); gr.addColorStop(0.55, ARTE.tom(base, -0.35)); gr.addColorStop(0.7, ARTE.tom(base, 0.2)); gr.addColorStop(1, ARTE.tom(base, -0.55));
  return gr;
}
function _plano(g, x0, y0, x1, y1, base) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, ARTE.tom(base, 0.35)); gr.addColorStop(1, ARTE.tom(base, -0.5)); return gr; }
function _brilho(g, x, y, r, cor = '#ffffff') { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, cor); gr.addColorStop(1, ARTE.alfa(cor === '#ffffff' ? '#ffffff' : cor, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
function _estrela(g, x, y, r, cor = '#fff') { g.save(); g.fillStyle = cor; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.18 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.restore(); }
function _runas(g, pts, cor) { if (!cor) return; g.save(); g.shadowColor = cor; g.shadowBlur = 8; g.strokeStyle = cor; g.lineWidth = 2; g.beginPath(); for (const [x, y, w] of pts) { g.moveTo(x - w, y - w); g.lineTo(x, y + w); g.lineTo(x + w, y - w * 0.3); } g.stroke(); g.restore(); }
function _pedra(g, x, y, r, cor) { _fs(g, () => g.arc(x, y, r, 0, 7), _plano(g, x - r, y - r, x + r, y + r, cor), 2); _brilho(g, x - r * 0.35, y - r * 0.35, r * 0.6); }

// ---------------- desenhos por tipo ----------------
const DESENHO = {};
DESENHO.machado = (g, M, ac, t) => {
  g.save(); g.rotate(-0.72);
  // cabo com empunhadura
  _fs(g, () => g.rect(-4.5, -40, 9, 92), _plano(g, -5, 0, 5, 0, M.madeira));
  g.strokeStyle = ARTE.tom(M.couro, -0.3); g.lineWidth = 2.5; for (let y = 22; y < 48; y += 5) { g.beginPath(); g.moveTo(-5, y); g.lineTo(5, y + 3); g.stroke(); }
  _fs(g, () => g.rect(-6, 47, 12, 6), _metal(g, -6, 0, 6, 0, M.metal), 2);
  // lâmina(s)
  const lam = (s) => _fs(g, () => {
    g.moveTo(3 * s, -36); g.quadraticCurveTo(26 * s, -48 - t * 2, 40 * s, -44 - t * 3); g.quadraticCurveTo(30 * s, -22, 42 * s, -2 + t * 2);
    if (t >= 4) { g.lineTo(34 * s, -8); g.lineTo(38 * s, -14); g.lineTo(30 * s, -16); }
    g.quadraticCurveTo(22 * s, -10, 3 * s, -14); g.closePath();
  }, _metal(g, 0, -48, 40 * s, 0, M.metal));
  lam(1); if (t >= 2) lam(-0.75);
  // fio da lâmina
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(39, -42 - t * 3); g.quadraticCurveTo(30, -22, 41, -3 + t * 2); g.stroke();
  _fs(g, () => g.rect(-7, -42, 14, 30), _metal(g, -7, 0, 7, 0, ARTE.tom(M.metal, -0.2)), 2.5);
  if (t >= 2) _pedra(g, 0, -27, 4.5, ac);
  _runas(g, [[22, -30, 4], [28, -18, 3]], M.runa);
  g.restore();
};
DESENHO.arco = (g, M, ac, t) => {
  g.save(); g.rotate(0.6);
  const arco = () => { g.moveTo(-6, -54); g.bezierCurveTo(-34, -40, -30 + t, -12, -10, 0); g.bezierCurveTo(-30 + t, 12, -34, 40, -6, 54); };
  g.lineWidth = 12; g.strokeStyle = '#0b0806'; g.beginPath(); arco(); g.stroke();
  g.lineWidth = 8; g.strokeStyle = _plano(g, -30, 0, 0, 0, M.madeira); g.beginPath(); arco(); g.stroke();
  g.lineWidth = 2; g.strokeStyle = ARTE.tom(M.madeira, 0.4); g.beginPath(); g.moveTo(-9, -50); g.bezierCurveTo(-32, -38, -28, -14, -12, -2); g.stroke();
  // pontas reforçadas
  for (const s of [-1, 1]) { _fs(g, () => { g.moveTo(-8, 54 * s); g.lineTo(0, 58 * s); g.lineTo(-2, 46 * s); g.closePath(); }, t >= 2 ? M.enfeite : M.metal, 2); }
  // corda
  g.save(); if (t >= 3) { g.shadowColor = M.runa; g.shadowBlur = 8; }
  g.lineWidth = 1.8; g.strokeStyle = t >= 3 ? M.runa : '#e8e0c8'; g.beginPath(); g.moveTo(-3, -55); g.lineTo(-3, 55); g.stroke(); g.restore();
  // empunhadura
  _fs(g, () => g.rect(-17, -9, 11, 18), _plano(g, -17, 0, -6, 0, M.couro), 2.5);
  if (t >= 1) { g.strokeStyle = M.enfeite; g.lineWidth = 2; g.beginPath(); g.moveTo(-17, -6); g.lineTo(-6, -6); g.moveTo(-17, 6); g.lineTo(-6, 6); g.stroke(); }
  if (t >= 2) _pedra(g, -24, -24, 3.5, ac);
  g.restore();
};
DESENHO.cajado = (g, M, ac, t) => {
  g.save(); g.rotate(0.45);
  _fs(g, () => { g.moveTo(-4, -26); g.bezierCurveTo(-8, 0, 6, 20, -3, 56); g.lineTo(5, 56); g.bezierCurveTo(12, 20, 2, 0, 5, -26); g.closePath(); }, _plano(g, -8, 0, 8, 0, M.madeira));
  g.strokeStyle = ARTE.tom(M.madeira, -0.4); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-2, -10); g.bezierCurveTo(4, 0, -4, 20, 3, 40); g.stroke();
  _fs(g, () => g.rect(-5.5, 8, 13, 5), _metal(g, -6, 0, 7, 0, M.enfeite), 2);
  // garras que seguram a pedra
  for (const s of [-1, 1]) _fs(g, () => { g.moveTo(0, -24); g.quadraticCurveTo(16 * s, -34, 13 * s, -50); g.quadraticCurveTo(9 * s, -38, 0, -30); g.closePath(); }, _metal(g, -14, -50, 14, -24, t >= 2 ? M.enfeite : M.madeira), 2);
  const cor = t >= 3 ? M.runa : ac === '#c8c8c8' ? '#80c0ff' : ac;
  g.save(); g.shadowColor = cor; g.shadowBlur = 16 + t * 3;
  if (t >= 2) { // cristal
    _fs(g, () => { g.moveTo(0, -60); g.lineTo(9, -42); g.lineTo(0, -28); g.lineTo(-9, -42); g.closePath(); }, _plano(g, -9, -60, 9, -28, cor), 2);
    g.restore(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, -60); g.lineTo(-9, -42); g.lineTo(0, -44); g.closePath(); g.fill();
  } else { _fs(g, () => g.arc(0, -40, 10, 0, 7), _plano(g, -10, -50, 10, -30, cor), 2); g.restore(); _brilho(g, -3, -44, 6); }
  if (t >= 4) { g.strokeStyle = M.runa; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, -44, 18, 6, 0.3, 0, 7); g.stroke(); }
  g.restore();
};
DESENHO.escudo = (g, M, ac, t) => {
  const forma = t === 0 ? () => g.arc(0, 0, 44, 0, 7)
    : t <= 2 ? () => { g.moveTo(0, -50); g.quadraticCurveTo(40, -48, 42, -30); g.quadraticCurveTo(40, 22, 0, 54); g.quadraticCurveTo(-40, 22, -42, -30); g.quadraticCurveTo(-40, -48, 0, -50); }
      : () => { g.moveTo(-40, -50); g.lineTo(40, -50); g.lineTo(42, 18); g.quadraticCurveTo(30, 42, 0, 56); g.quadraticCurveTo(-30, 42, -42, 18); g.closePath(); };
  _fs(g, forma, _metal(g, -40, -50, 40, 50, M.metal), 3.5);
  g.save(); g.scale(0.84, 0.84); _fs(g, forma, _plano(g, -40, -50, 40, 50, t === 0 ? M.madeira : ARTE.tom(ac === '#c8c8c8' ? '#7a3020' : ac, -0.35)), 2); g.restore();
  if (t === 0) { g.strokeStyle = ARTE.tom(M.madeira, -0.45); g.lineWidth = 2; for (let x = -24; x <= 24; x += 12) { g.beginPath(); g.moveTo(x, -34); g.lineTo(x, 34); g.stroke(); } }
  else { // emblema
    g.save(); g.fillStyle = t >= 3 ? M.enfeite : ARTE.tom(M.metal, 0.2); g.strokeStyle = '#0b0806'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -30); g.lineTo(8, -6); g.lineTo(28, -4); g.lineTo(10, 8); g.lineTo(16, 30); g.lineTo(0, 16); g.lineTo(-16, 30); g.lineTo(-10, 8); g.lineTo(-28, -4); g.lineTo(-8, -6); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  _fs(g, () => g.arc(0, 0, t === 0 ? 11 : 8, 0, 7), _metal(g, -10, -10, 10, 10, t >= 2 ? M.enfeite : M.metal), 2.5);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; _fs(g, () => g.arc(Math.cos(a) * 38, Math.sin(a) * 38 + (t > 0 ? -2 : 0), 2.6, 0, 7), M.enfeite, 1); }
  if (t >= 3) _runas(g, [[-22, 30, 4], [22, 30, 4]], M.runa);
};
DESENHO.aljava = (g, M, ac, t) => {
  g.save(); g.rotate(0.35);
  for (let i = -1; i <= 1; i++) { // flechas
    g.strokeStyle = '#4a3420'; g.lineWidth = 3; g.beginPath(); g.moveTo(i * 9, -30); g.lineTo(i * 9 + i * 3, -52); g.stroke();
    _fs(g, () => { g.moveTo(i * 12, -54); g.lineTo(i * 12 - 6, -44); g.lineTo(i * 12, -48); g.lineTo(i * 12 + 6, -44); g.closePath(); }, i === 0 && t >= 2 ? ac : t >= 3 ? M.runa : '#e8e0d0', 1.5);
  }
  _fs(g, () => { g.moveTo(-17, -34); g.lineTo(17, -34); g.lineTo(13, 50); g.quadraticCurveTo(0, 56, -13, 50); g.closePath(); }, _plano(g, -17, 0, 17, 0, M.couro));
  for (const y of [-26, 8, 38]) _fs(g, () => g.rect(-16, y, 32, 5), _metal(g, -16, y, 16, y, t >= 2 ? M.enfeite : M.metal), 1.5);
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-10, -30); g.lineTo(-8, 46); g.stroke();
  if (t >= 2) _pedra(g, 0, -12, 4, ac);
  g.restore();
};
DESENHO.orbe = (g, M, ac, t) => {
  const cor = t >= 3 ? M.runa : ac === '#c8c8c8' ? '#7ab0ff' : ac;
  // suporte
  _fs(g, () => { g.moveTo(-26, 50); g.lineTo(26, 50); g.lineTo(16, 34); g.lineTo(-16, 34); g.closePath(); }, _metal(g, -26, 0, 26, 0, M.enfeite), 2.5);
  for (const s of [-1, 1]) _fs(g, () => { g.moveTo(10 * s, 36); g.quadraticCurveTo(36 * s, 20, 30 * s, -10); g.quadraticCurveTo(26 * s, 14, 6 * s, 30); g.closePath(); }, _metal(g, -30, 0, 30, 0, M.metal), 2);
  g.save(); g.shadowColor = cor; g.shadowBlur = 18;
  const gr = g.createRadialGradient(-10, -16, 3, 0, -6, 34); gr.addColorStop(0, ARTE.tom(cor, 0.85)); gr.addColorStop(0.45, cor); gr.addColorStop(1, ARTE.tom(cor, -0.7));
  _fs(g, () => g.arc(0, -6, 32, 0, 7), gr, 3); g.restore();
  // redemoinho interno
  g.save(); g.beginPath(); g.arc(0, -6, 30, 0, 7); g.clip(); g.strokeStyle = ARTE.alfa('#ffffff', 0.45); g.lineWidth = 2;
  for (let i = 0; i < 3; i++) { g.beginPath(); for (let a = 0; a < 9; a += 0.2) { const r = a * 3.2; g.lineTo(Math.cos(a + i * 2.1) * r, -6 + Math.sin(a + i * 2.1) * r * 0.8); } g.stroke(); }
  g.restore();
  _brilho(g, -12, -20, 12); _estrela(g, -12, -20, 7);
};
DESENHO.elmo = (g, M, ac, t) => {
  if (t === 0) { // capuz de couro
    _fs(g, () => { g.moveTo(-36, 40); g.quadraticCurveTo(-46, -40, 0, -50); g.quadraticCurveTo(46, -40, 36, 40); g.quadraticCurveTo(20, 30, 18, 4); g.quadraticCurveTo(0, -6, -18, 4); g.quadraticCurveTo(-20, 30, -36, 40); }, _plano(g, -40, -50, 40, 40, M.couro));
    g.fillStyle = '#0b0806'; g.beginPath(); g.moveTo(-18, 6); g.quadraticCurveTo(0, -4, 18, 6); g.quadraticCurveTo(14, 30, 0, 34); g.quadraticCurveTo(-14, 30, -18, 6); g.fill();
    g.strokeStyle = ARTE.tom(M.couro, -0.4); g.setLineDash([3, 3]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -48); g.lineTo(0, -8); g.stroke(); g.setLineDash([]);
    return;
  }
  if (t >= 2 && t < 4) { // penacho
    _fs(g, () => { g.moveTo(0, -46); g.quadraticCurveTo(30, -66, 46, -40); g.quadraticCurveTo(30, -50, 4, -38); g.closePath(); }, _plano(g, 0, -60, 40, -40, ac === '#c8c8c8' ? '#b02a20' : ac), 2);
  }
  if (t === 3) for (const s of [-1, 1]) _fs(g, () => { g.moveTo(30 * s, -20); g.quadraticCurveTo(56 * s, -30, 52 * s, -62); g.quadraticCurveTo(44 * s, -36, 26 * s, -32); g.closePath(); }, _plano(g, 30 * s, -60, 50 * s, -20, '#e8dcc0'), 2);
  _fs(g, () => { g.moveTo(-34, 44); g.lineTo(-38, -10); g.quadraticCurveTo(-36, -48, 0, -50); g.quadraticCurveTo(36, -48, 38, -10); g.lineTo(34, 44); g.quadraticCurveTo(0, 52, -34, 44); }, _metal(g, -38, -50, 38, 44, M.metal), 3.5);
  if (t === 1) { _fs(g, () => g.rect(-4, -14, 8, 40), _metal(g, -4, 0, 4, 0, M.metal), 2); g.fillStyle = '#0b0806'; g.fillRect(-30, -2, 22, 8); g.fillRect(8, -2, 22, 8); }
  else { // viseira com fendas
    g.fillStyle = '#0b0806'; g.fillRect(-28, -4, 56, 7);
    for (let x = -18; x <= 18; x += 6) g.fillRect(x - 1.2, 8, 2.4, 18);
    _fs(g, () => g.rect(-2.5, -46, 5, 40), _metal(g, -3, 0, 3, 0, M.enfeite), 1.5);
  }
  if (t >= 4) for (let i = -2; i <= 2; i++) _fs(g, () => { g.moveTo(i * 14 - 6, -44); g.lineTo(i * 14, -64 + Math.abs(i) * 6); g.lineTo(i * 14 + 6, -44); g.closePath(); }, _metal(g, 0, -64, 0, -44, M.metal), 2);
  if (t >= 2) _pedra(g, 0, -30, 4.5, t >= 4 ? M.runa : ac);
  _runas(g, [[-24, 30, 3.5], [24, 30, 3.5]], M.runa);
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-26, -30); g.quadraticCurveTo(-18, -42, 0, -44); g.stroke();
};
DESENHO.peitoral = (g, M, ac, t) => {
  const corpo = () => { g.moveTo(-16, -46); g.lineTo(-40, -36); g.lineTo(-44, -6); g.lineTo(-30, -2); g.lineTo(-28, 48); g.lineTo(28, 48); g.lineTo(30, -2); g.lineTo(44, -6); g.lineTo(40, -36); g.lineTo(16, -46); g.quadraticCurveTo(0, -34, -16, -46); };
  const base = t === 0 ? M.couro : t === 1 ? '#7a7e86' : M.metal;
  _fs(g, corpo, t >= 2 ? _metal(g, -44, -46, 44, 48, base) : _plano(g, -40, -46, 40, 48, base), 3.5);
  g.save(); g.beginPath(); corpo(); g.clip();
  if (t === 0) { g.strokeStyle = ARTE.tom(M.couro, -0.4); g.lineWidth = 2; for (let y = -20; y < 48; y += 12) { g.beginPath(); g.moveTo(-30, y); g.lineTo(30, y); g.stroke(); } }
  if (t === 1) { g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = -40; y < 48; y += 5) for (let x = -44 + (y % 10 ? 2.5 : 0); x < 44; x += 5) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); } }
  if (t >= 2) { // placas
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2; for (const y of [8, 22, 36]) { g.beginPath(); g.moveTo(-28, y); g.quadraticCurveTo(0, y + 6, 28, y); g.stroke(); }
    g.beginPath(); g.moveTo(0, -36); g.lineTo(0, 6); g.stroke();
  }
  g.restore();
  // ombreiras
  if (t >= 2) for (const s of [-1, 1]) _fs(g, () => { g.moveTo(16 * s, -46); g.quadraticCurveTo(50 * s, -50, 48 * s, -16); g.quadraticCurveTo(36 * s, -24, 24 * s, -26); g.closePath(); }, _metal(g, 16 * s, -50, 48 * s, -16, t >= 4 ? M.metal : M.enfeite), 2.5);
  if (t >= 4) for (const s of [-1, 1]) _fs(g, () => { g.moveTo(34 * s, -44); g.lineTo(46 * s, -64); g.lineTo(42 * s, -40); g.closePath(); }, M.metal, 2);
  // cinto do peitoral
  _fs(g, () => g.rect(-29, 30, 58, 7), _plano(g, 0, 30, 0, 37, M.couro), 2);
  _fs(g, () => g.rect(-5, 29, 10, 9), _metal(g, -5, 0, 5, 0, M.enfeite), 1.5);
  if (t >= 2) _pedra(g, 0, -14, 5, t >= 3 ? M.runa : ac);
  _runas(g, [[-16, 0, 4], [16, 0, 4]], M.runa);
};
DESENHO.luvas = (g, M, ac, t) => {
  const mao = () => { g.moveTo(-24, 52); g.lineTo(-28, 4); g.lineTo(-30, -28); g.lineTo(-20, -30); g.lineTo(-17, -8); g.lineTo(-14, -42); g.lineTo(-4, -42); g.lineTo(-3, -10); g.lineTo(2, -46); g.lineTo(12, -44); g.lineTo(10, -8); g.lineTo(18, -36); g.lineTo(27, -32); g.lineTo(22, 4); g.lineTo(36, -6); g.lineTo(40, 2); g.lineTo(24, 28); g.lineTo(22, 52); g.closePath(); };
  _fs(g, mao, t === 0 ? _plano(g, -30, -40, 30, 50, M.couro) : _metal(g, -30, -46, 40, 52, M.metal), 3.5);
  g.save(); g.beginPath(); mao(); g.clip(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2;
  for (const y of [-26, -14]) { g.beginPath(); g.moveTo(-30, y); g.lineTo(28, y - 4); g.stroke(); } g.restore();
  _fs(g, () => g.rect(-26, 28, 50, 24), t >= 1 ? _metal(g, -26, 28, 24, 52, t >= 2 ? M.enfeite : M.metal) : _plano(g, -26, 28, 24, 52, ARTE.tom(M.couro, -0.2)), 3);
  if (t >= 3) for (let x = -14; x <= 10; x += 12) _fs(g, () => { g.moveTo(x - 4, -2); g.lineTo(x, -12); g.lineTo(x + 4, -2); g.closePath(); }, M.metal, 1.5);
  if (t >= 2) _pedra(g, -1, 40, 4.5, t >= 3 ? M.runa : ac);
};
DESENHO.botas = (g, M, ac, t) => {
  const bota = () => { g.moveTo(-22, -52); g.lineTo(14, -52); g.lineTo(14, 10); g.quadraticCurveTo(44, 16, 48, 34); g.lineTo(48, 50); g.lineTo(-24, 50); g.lineTo(-24, 20); g.closePath(); };
  _fs(g, bota, t >= 2 ? _metal(g, -24, -52, 48, 50, M.metal) : _plano(g, -24, -52, 48, 50, M.couro), 3.5);
  _fs(g, () => g.rect(-25, 42, 74, 9), '#2a1e14', 2.5);
  if (t <= 1) { g.strokeStyle = ARTE.tom(M.couro, 0.3); g.lineWidth = 1.5; for (let y = -40; y < 6; y += 8) { g.beginPath(); g.moveTo(-6, y); g.lineTo(6, y + 4); g.moveTo(6, y); g.lineTo(-6, y + 4); g.stroke(); } }
  else { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; for (const y of [-30, -10, 10]) { g.beginPath(); g.moveTo(-22, y); g.lineTo(14, y); g.stroke(); } }
  _fs(g, () => g.rect(-26, -56, 42, 10), t >= 2 ? _metal(g, -26, 0, 16, 0, M.enfeite) : _plano(g, 0, -56, 0, -46, ARTE.tom(M.couro, -0.25)), 2.5);
  if (t >= 3) _fs(g, () => { g.moveTo(14, -22); g.lineTo(30, -30); g.lineTo(16, -10); g.closePath(); }, M.metal, 2);
  if (t >= 2) _pedra(g, -4, -51, 4, t >= 3 ? M.runa : ac);
};
DESENHO.cinto = (g, M, ac, t) => {
  _fs(g, () => { g.moveTo(-56, -6); g.quadraticCurveTo(0, -18, 56, -6); g.lineTo(56, 12); g.quadraticCurveTo(0, 0, -56, 12); g.closePath(); }, _plano(g, 0, -14, 0, 12, M.couro), 3);
  g.strokeStyle = ARTE.tom(M.couro, 0.3); g.setLineDash([3, 3]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-54, -3); g.quadraticCurveTo(0, -14, 54, -3); g.moveTo(-54, 8); g.quadraticCurveTo(0, -3, 54, 8); g.stroke(); g.setLineDash([]);
  // bolsas
  for (const x of [-34, 30]) { _fs(g, () => { g.moveTo(x - 10, 4); g.lineTo(x + 10, 4); g.lineTo(x + 9, 30); g.quadraticCurveTo(x, 34, x - 9, 30); g.closePath(); }, _plano(g, x, 4, x, 30, ARTE.tom(M.couro, 0.15)), 2.5); _fs(g, () => g.arc(x, 14, 2.4, 0, 7), M.enfeite, 1); }
  // fivela
  _fs(g, () => g.rect(-14, -16, 28, 26), _metal(g, -14, -16, 14, 10, t >= 2 ? M.enfeite : M.metal), 3);
  g.fillStyle = '#0b0806'; g.fillRect(-7, -9, 14, 12);
  if (t >= 2) _pedra(g, 0, -3, 5, t >= 3 ? M.runa : ac);
};
DESENHO.amuleto = (g, M, ac, t) => {
  g.strokeStyle = M.enfeite; g.lineWidth = 2.5; g.setLineDash([4, 2]); g.beginPath(); g.moveTo(-30, -54); g.quadraticCurveTo(0, 0, 30, -54); g.stroke(); g.setLineDash([]);
  const cor = t >= 4 ? '#2a2030' : ac === '#c8c8c8' ? ['#e8dcc0', '#3a9a5a', '#d88a20', '#3a3040'][Math.min(3, t)] : ac;
  _fs(g, () => { g.moveTo(0, -18); g.lineTo(24, 4); g.lineTo(0, 46); g.lineTo(-24, 4); g.closePath(); }, _metal(g, -24, -18, 24, 46, M.enfeite), 3);
  _fs(g, () => { g.moveTo(0, -8); g.lineTo(15, 6); g.lineTo(0, 34); g.lineTo(-15, 6); g.closePath(); }, _plano(g, -15, -8, 15, 34, cor), 2);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, -8); g.lineTo(-15, 6); g.lineTo(0, 10); g.closePath(); g.fill();
  _fs(g, () => g.arc(0, -22, 5, 0, 7), _metal(g, -5, -27, 5, -17, M.enfeite), 2);
  if (t >= 3) _estrela(g, 6, 2, 8, ARTE.tom(M.runa || '#fff', 0.5));
};
DESENHO.anel = (g, M, ac, t) => {
  const metal = ['#9aa0a8', '#d8dce4', '#e8c060', '#e8e0f0', '#c8a0ff'][t];
  g.lineWidth = 15; g.strokeStyle = '#0b0806'; g.beginPath(); g.ellipse(0, 14, 30, 26, 0, 0, 7); g.stroke();
  g.lineWidth = 10; g.strokeStyle = _metal(g, -30, -12, 30, 40, metal); g.beginPath(); g.ellipse(0, 14, 30, 26, 0, 0, 7); g.stroke();
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(0, 14, 30, 26, 0, 3.6, 5.2); g.stroke();
  _fs(g, () => { g.moveTo(-16, -12); g.lineTo(16, -12); g.lineTo(10, -2); g.lineTo(-10, -2); g.closePath(); }, _metal(g, -16, 0, 16, 0, metal), 2.5);
  const cor = ac === '#c8c8c8' ? '#d02a40' : ac;
  ARTE.gemaFacetada(g, 0, -24, 15, cor, Math.min(4, t + 1), false);
};

// ---------------- jóias facetadas ----------------
// desenha uma jóia na posição (x,y) com raio r; corte de 0 (bruta) a 4 (lapidação brilhante)
ARTE.gemaFacetada = function (g, x, y, r, cor, corte, brilhoForte = true) {
  const contorno = [], mesa = [];
  const rnd = mulberry32(Math.round(r * 13 + corte * 7 + cor.length));
  let n, rot = -Math.PI / 2, sx = 1, sy = 1, km = 0.5;
  if (corte === 0) { n = 7; km = 0.42; }
  else if (corte === 1) { n = 8; sx = 0.82; km = 0.5; }
  else if (corte === 2) { n = 4; rot = -Math.PI / 4; km = 0.55; }
  else if (corte === 3) { n = 5; km = 0.52; }
  else { n = 10; km = 0.5; }
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * Math.PI * 2;
    const rr = corte === 0 ? r * (0.72 + rnd() * 0.32) : r;
    contorno.push([x + Math.cos(a) * rr * sx, y + Math.sin(a) * rr * sy]);
    mesa.push([x + Math.cos(a + (corte === 4 ? Math.PI / n : 0)) * rr * km * sx - r * 0.06, y + Math.sin(a + (corte === 4 ? Math.PI / n : 0)) * rr * km * sy - r * 0.08]);
  }
  g.save();
  if (brilhoForte) { g.shadowColor = cor; g.shadowBlur = r * (0.3 + corte * 0.18); }
  g.beginPath(); contorno.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
  g.fillStyle = ARTE.tom(cor, -0.35); g.fill(); g.restore();
  // facetas: tom pela direção (luz vinda do alto à esquerda)
  for (let i = 0; i < n; i++) {
    const a = contorno[i], b = contorno[(i + 1) % n], c = mesa[(i + 1) % n], d = mesa[i];
    const mx = (a[0] + b[0]) / 2 - x, my = (a[1] + b[1]) / 2 - y; const L = Math.hypot(mx, my) || 1;
    const luz = (-mx * 0.6 - my * 0.8) / L; // -1..1
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
    g.fillStyle = ARTE.tom(cor, corte === 0 ? luz * 0.35 - 0.1 : luz * 0.55); g.fill();
    if (corte >= 3) { // facetas em estrela
      g.beginPath(); g.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
      g.fillStyle = ARTE.tom(cor, luz * 0.3 + 0.12); g.fill();
    }
  }
  // mesa
  g.beginPath(); mesa.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
  const gm = g.createLinearGradient(x - r * 0.5, y - r * 0.5, x + r * 0.5, y + r * 0.5);
  gm.addColorStop(0, ARTE.tom(cor, corte === 0 ? 0.15 : 0.55)); gm.addColorStop(1, ARTE.tom(cor, corte === 0 ? -0.2 : -0.05));
  g.fillStyle = gm; g.fill();
  // arestas
  g.strokeStyle = ARTE.alfa('#ffffff', corte === 0 ? 0.12 : 0.28); g.lineWidth = Math.max(0.6, r * 0.03);
  for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(contorno[i][0], contorno[i][1]); g.lineTo(mesa[i][0], mesa[i][1]); g.stroke(); }
  g.beginPath(); contorno.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
  g.strokeStyle = 'rgba(8,5,3,.9)'; g.lineWidth = Math.max(1, r * 0.07); g.stroke();
  // rachaduras na bruta, brilhos nas lapidadas
  if (corte === 0) { g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = r * 0.04; g.beginPath(); g.moveTo(x - r * 0.3, y - r * 0.5); g.lineTo(x, y - r * 0.1); g.lineTo(x + r * 0.2, y + r * 0.4); g.stroke(); }
  _brilho(g, x - r * 0.28, y - r * 0.32, r * (0.25 + corte * 0.05));
  if (corte >= 2) _estrela(g, x - r * 0.3, y - r * 0.34, r * (0.3 + corte * 0.06));
  if (corte >= 4) { _estrela(g, x + r * 0.45, y + r * 0.2, r * 0.22); _estrela(g, x + r * 0.05, y - r * 0.75, r * 0.16); }
};

// caveira: cada qualidade fica mais polida e ornamentada
ARTE.caveira = function (g, q) {
  const osso = ['#b8ac90', '#d8ccb0', '#ece4d0', '#f4eee0', '#fff8ea'][q];
  const s = 0.6 + q * 0.1;
  g.save(); g.scale(s, s);
  if (q >= 3) { g.shadowColor = q >= 4 ? '#c070ff' : '#ffd070'; g.shadowBlur = 16; }
  _fs(g, () => { g.moveTo(-36, -4); g.bezierCurveTo(-40, -56, 40, -56, 36, -4); g.quadraticCurveTo(34, 14, 22, 18); g.lineTo(20, 36); g.lineTo(-20, 36); g.lineTo(-22, 18); g.quadraticCurveTo(-34, 14, -36, -4); }, _plano(g, -36, -50, 36, 36, osso), 3.5);
  g.shadowBlur = 0;
  // olhos e nariz
  const olho = q >= 2 ? (q >= 4 ? '#c070ff' : q >= 3 ? '#ff4030' : '#401010') : '#0b0806';
  for (const sx of [-1, 1]) { g.save(); if (q >= 3) { g.shadowColor = olho; g.shadowBlur = 12; } _fs(g, () => g.ellipse(14 * sx, -4, 11, 10, sx * 0.2, 0, 7), olho, 2); g.restore(); }
  _fs(g, () => { g.moveTo(0, 6); g.lineTo(-5, 16); g.lineTo(5, 16); g.closePath(); }, '#0b0806', 1);
  // dentes
  g.strokeStyle = '#0b0806'; g.lineWidth = 2; for (let x = -14; x <= 14; x += 7) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x, 36); g.stroke(); }
  g.beginPath(); g.moveTo(-20, 28); g.lineTo(20, 28); g.stroke();
  if (q <= 1) { g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6, -40); g.lineTo(-12, -26); g.lineTo(-6, -18); g.moveTo(20, -30); g.lineTo(26, -18); g.stroke(); }
  if (q >= 2) { g.strokeStyle = q >= 3 ? '#d8b050' : '#8a7a5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-34, -18); g.quadraticCurveTo(0, -30, 34, -18); g.stroke(); }
  if (q >= 3) for (let i = -2; i <= 2; i++) _fs(g, () => { g.moveTo(i * 12 - 5, -40 + Math.abs(i) * 3); g.lineTo(i * 12, -58 + Math.abs(i) * 5); g.lineTo(i * 12 + 5, -40 + Math.abs(i) * 3); g.closePath(); }, _metal(g, 0, -58, 0, -40, '#e0b040'), 1.8);
  if (q >= 4) ARTE.gemaFacetada(g, 0, -34, 7, '#c070ff', 4, false);
  _brilho(g, -14, -30, 10, 'rgba(255,255,255,.5)');
  g.restore();
};
ARTE.iconeGema = function (gema, q, t = 128) {
  const k = 'g|' + gema + '|' + q + '|' + t; if (ARTE.cache[k]) return ARTE.cache[k];
  const [c, g] = _canvas(t);
  if (gema === 'caveira') ARTE.caveira(g, q);
  else ARTE.gemaFacetada(g, 0, 2, 22 + q * 7, GEMAS[gema].cor, q);
  return (ARTE.cache[k] = c.toDataURL());
};

// nível visual da base (0..4) pelo nível do item
ARTE.tierDe = function (it) {
  const b = BASES[it.base]; if (!b) return 0;
  let k = 0; b.nomes.forEach(([l], i) => { if ((it.ilvl || 1) >= l) k = i; });
  return Math.min(4, Math.round(k * 4 / Math.max(1, b.nomes.length - 1)));
};
ARTE.iconeItem = function (it, t = 128) {
  if (it.tipo === 'gema') return ARTE.iconeGema(it.gema, it.q, t);
  const tipo = it.slot === 'arma' || it.slot === 'offhand' ? it.base : it.slot === 'anel1' || it.slot === 'anel2' ? 'anel' : it.slot;
  const tier = ARTE.tierDe(it), R = RARIDADES[it.raridade] || RARIDADES.normal;
  const k = tipo + '|' + tier + '|' + it.raridade + '|' + t; if (ARTE.cache[k]) return ARTE.cache[k];
  const [c, g] = _canvas(t);
  // aura da raridade
  if (it.raridade !== 'normal') { const gr = g.createRadialGradient(0, 0, 6, 0, 0, 62); gr.addColorStop(0, ARTE.alfa(R.cor, it.raridade === 'magico' ? 0.18 : 0.32)); gr.addColorStop(1, ARTE.alfa(R.cor, 0)); g.fillStyle = gr; g.fillRect(-64, -64, 128, 128); }
  g.scale(0.92, 0.92);
  const f = DESENHO[tipo] || DESENHO.anel;
  f(g, MAT_TIER[tier], R.cor, tier);
  return (ARTE.cache[k] = c.toDataURL());
};

// substitui os ícones antigos
UI.iconeItem = (it) => ARTE.iconeItem(it);
// imagem grande no topo das dicas
{
  const d0 = IT.descreverItem;
  IT.descreverItem = function (it) {
    const h = d0(it);
    if (!it) return h;
    const cor = it.tipo === 'gema' ? GEMAS[it.gema].cor : (RARIDADES[it.raridade] || {}).cor || '#888';
    return `<div class="tt-img" style="--c:${cor}"><img alt="" src="${ARTE.iconeItem(it)}"></div>` + h;
  };
  const st = document.createElement('style');
  st.textContent = `.tt-img{float:right;width:72px;height:72px;margin:-2px -2px 4px 10px;border:1px solid color-mix(in srgb,var(--c) 55%,#000);background:radial-gradient(circle,color-mix(in srgb,var(--c) 22%,#14100c),#0a0806 75%);display:grid;place-items:center}
.tt-img img{width:92%;height:92%}
.cel img,.eq img{filter:drop-shadow(0 2px 2px rgba(0,0,0,.6))}`;
  document.head.appendChild(st);
}

// jóia no chão: forma de acordo com a lapidação
{
  const solt0 = J.soltar;
  J.soltar = function (item, x, z) {
    const r = solt0.apply(this, arguments);
    try {
      if (item && item.tipo === 'gema') {
        const d = J.drops[J.drops.length - 1];
        if (d && d.item === item && d.me) {
          const geos = [() => new THREE.DodecahedronGeometry(0.17, 0), () => new THREE.OctahedronGeometry(0.2, 0), () => new THREE.OctahedronGeometry(0.23, 0), () => new THREE.IcosahedronGeometry(0.25, 0), () => new THREE.IcosahedronGeometry(0.29, 1)];
          if (item.gema !== 'caveira') { d.me.geometry = G('dropGemaQ' + item.q, geos[Math.min(4, item.q)]); d.me.material.flatShading = true; d.me.material.metalness = 0.2; d.me.material.roughness = 0.12; d.me.material.emissiveIntensity = 0.6 + item.q * 0.25; d.me.material.needsUpdate = true; }
        }
      }
    } catch (e) { }
    return r;
  };
}
