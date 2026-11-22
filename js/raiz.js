// ============================================================
//  A Raiz Primeva: árvore passiva extra, comum a todas as
//  classes, alimentada por Seiva Abissal (moeda que cai dos
//  monstros). Quatro ramos (Fúria, Carapaça, Colheita, Arcano),
//  cada um com um Núcleo de efeito especial e grupos de nós.
// ============================================================
'use strict';

RARIDADES.seiva = { nome: 'Seiva Abissal', cor: '#c070ff', afixos: [0, 0] };
Object.assign(STAT_NOMES, {
  danoCombo: v => `+${v}% de Dano das Reações de Combo`,
  chanceJoia: v => `${v}% de chance de monstros soltarem uma jóia extra`,
  seivaExtra: v => `+${v}% de Seiva Abissal encontrada`,
  economia: v => `${v}% de chance de habilidades não gastarem recurso`,
});

// ---------------- estrutura da árvore ----------------
const RAIZ = { W: 1200, H: 760, nos: {}, lista: [] };
{
  const RAMOS = [
    { id: 'furia', nome: 'Fúria', cor: '#ff6aa8', ang: -2.35,
      pequenos: [['danoPct', 4], ['critChance', 1], ['danoCrit', 6], ['velAtaque', 2]],
      notaveis: [['Sede de Sangue', { roubo: 1.5, danoPct: 8 }], ['Golpe Certeiro', { critChance: 4, danoCrit: 20 }], ['Frenesi Primevo', { velAtaque: 8, danoBasico: 10 }]],
      nucleo: ['Coração Abissal', { danoCombo: 30, danoElite: 10 }] },
    { id: 'carapaca', nome: 'Carapaça', cor: '#9ccaf0', ang: -2.95,
      pequenos: [['vida', 12], ['armaduraPct', 5], ['resTodas', 3], ['vidaPct', 2]],
      notaveis: [['Casca Rija', { armaduraPct: 20, bloqueio: 4 }], ['Seiva Vital', { vidaPct: 8, regenVidaMais: 20 }], ['Escudo Primevo', { resTodas: 10, redDano: 2 }]],
      nucleo: ['Pele de Raiz', { redDano: 6, espinhos: 15 }] },
    { id: 'colheita', nome: 'Colheita', cor: '#f0c868', ang: -0.85,
      pequenos: [['achado', 4], ['efPocao', 6], ['velMov', 2], ['curaAbate', 0.5]],
      notaveis: [['Raízes Ávidas', { achado: 15 }], ['Passo Leve', { velMov: 6, esquiva: 3 }], ['Banquete', { curaAbate: 2, efPocao: 20 }]],
      nucleo: ['Colheita Abissal', { chanceJoia: 8, seivaExtra: 25 }] },
    { id: 'arcano', nome: 'Arcano', cor: '#b490ff', ang: -0.2,
      pequenos: [['recarga', 1.5], ['recursoMax', 6], ['area', 3], ['danoDot', 5]],
      notaveis: [['Eco Distante', { recarga: 6, area: 8 }], ['Fonte Profunda', { recursoMax: 25, regenRecPct: 15 }], ['Corrosão Lenta', { danoDot: 20, danoVeneno: 10 }]],
      nucleo: ['Eco Primevo', { economia: 12, ranks: 1 }] },
  ];
  const add = (no) => { RAIZ.nos[no.id] = no; RAIZ.lista.push(no); return no; };
  const liga = (a, b) => { a.viz.push(b.id); b.viz.push(a.id); };
  const raiz = add({ id: 'semente', tipo: 'semente', nome: 'Semente Primeva', stats: { vida: 10 }, x: 600, y: 690, viz: [], cor: '#d8b0ff' });
  for (const R of RAMOS) {
    const rnd = mulberry32(R.id.length * 131 + R.cor.charCodeAt(2));
    let ant = raiz, k = 0;
    const pequeno = (x, y) => { const [st, v] = R.pequenos[k++ % R.pequenos.length]; return add({ id: R.id + '_' + RAIZ.lista.length, tipo: 'pequeno', ramo: R.id, nome: R.nome, stats: { [st]: v }, x, y, viz: [], cor: R.cor }); };
    // tronco do ramo
    let x = raiz.x, y = raiz.y;
    for (let i = 0; i < 3; i++) {
      const a = R.ang + Math.sin(i * 1.3) * 0.12;
      x += Math.cos(a) * 78; y += Math.sin(a) * 78 * 0.95;
      const n = pequeno(x, y); liga(ant, n); ant = n;
    }
    x += Math.cos(R.ang) * 70; y += Math.sin(R.ang) * 70;
    const nuc = add({ id: R.id + '_nucleo', tipo: 'nucleo', ramo: R.id, nome: R.nucleo[0], stats: R.nucleo[1], x, y, viz: [], cor: R.cor }); liga(ant, nuc);
    // três galhos, cada um termina num grupo (notável + pequenos em volta)
    R.notaveis.forEach(([nome, stats], j) => {
      const a = R.ang + (j - 1) * 0.62 + (rnd() - 0.5) * 0.12;
      let gx = nuc.x, gy = nuc.y, a2 = nuc;
      for (let i = 0; i < 2; i++) { gx += Math.cos(a) * 62; gy += Math.sin(a) * 62; const n = pequeno(gx, gy); liga(a2, n); a2 = n; }
      gx += Math.cos(a) * 58; gy += Math.sin(a) * 58;
      const nt = add({ id: R.id + '_not' + j, tipo: 'notavel', ramo: R.id, nome, stats, x: gx, y: gy, viz: [], cor: R.cor }); liga(a2, nt);
      for (let i = 0; i < 4; i++) { const b = a + (i - 1.5) * 0.95; const n = pequeno(gx + Math.cos(b) * 38, gy + Math.sin(b) * 38); liga(nt, n); }
    });
  }
  // encaixa tudo na tela
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9; for (const n of RAIZ.lista) { mnx = Math.min(mnx, n.x); mxx = Math.max(mxx, n.x); mny = Math.min(mny, n.y); mxy = Math.max(mxy, n.y); }
  const k = Math.min((RAIZ.W - 120) / (mxx - mnx), (RAIZ.H - 110) / (mxy - mny));
  for (const n of RAIZ.lista) { n.x = 60 + (n.x - mnx) * k + ((RAIZ.W - 120) - (mxx - mnx) * k) / 2; n.y = 70 + (n.y - mny) * k; }
}

// ---------------- estado e regras ----------------
RAIZ.estado = () => { const p = J.pers; if (!p.raiz) p.raiz = { seiva: 0, nos: { semente: 0 }, total: 0 }; if (!p.raiz.nos) p.raiz.nos = { semente: 0 }; return p.raiz; };
RAIZ.alocados = () => Object.keys(RAIZ.estado().nos);
RAIZ.custo = () => 2 + Math.floor((RAIZ.alocados().length - 1) / 4);
RAIZ.disponivel = (id) => { const s = RAIZ.estado(); return !s.nos[id] && s.nos[id] !== 0 && RAIZ.nos[id].viz.some(v => v in s.nos); };
RAIZ.alocar = function (id) {
  const s = RAIZ.estado(), c = RAIZ.custo();
  if (!RAIZ.disponivel(id)) return UI.aviso('Este nó precisa estar ligado a um nó já despertado', '#ff9090');
  if (s.seiva < c) return UI.aviso(`Seiva Abissal insuficiente (custa ${c})`, '#ff9090');
  s.seiva -= c; s.nos[id] = c;
  if (typeof SOM !== 'undefined') SOM.tocar(RAIZ.nos[id].tipo === 'pequeno' ? 'gema' : 'sino', { vol: 0.6 });
  RAIZ.pulsos.push({ id, t: 0 });
  J.recalc(); RAIZ.atualizarTopo(); J.salvar();
};
// devolve um nó da ponta (sem desligar os demais da semente)
RAIZ.devolver = function (id) {
  const s = RAIZ.estado(); if (id === 'semente' || !(id in s.nos)) return;
  const resto = new Set(Object.keys(s.nos)); resto.delete(id);
  const vis = new Set(['semente']), fila = ['semente'];
  while (fila.length) { const a = fila.pop(); for (const v of RAIZ.nos[a].viz) if (resto.has(v) && !vis.has(v)) { vis.add(v); fila.push(v); } }
  if (vis.size !== resto.size) return UI.aviso('Só é possível devolver nós da ponta do ramo', '#ff9090');
  s.seiva += s.nos[id]; delete s.nos[id];
  J.recalc(); RAIZ.atualizarTopo(); J.salvar();
};
RAIZ.restituir = function () {
  const s = RAIZ.estado(); const n = RAIZ.alocados().length - 1; if (!n) return UI.aviso('Nenhum nó despertado', '#ff9090');
  const preco = n * 25;
  if ((J.pers.ouro || 0) < preco) return UI.aviso(`Restituir custa ${preco} de ouro`, '#ff9090');
  if (!confirm(`Restituir todos os ${n} nós da Raiz Primeva por ${preco} de ouro? Toda a Seiva gasta volta para você.`)) return;
  J.pers.ouro -= preco; for (const [id, c] of Object.entries(s.nos)) if (id !== 'semente') s.seiva += c; s.nos = { semente: 0 };
  UI.atualizarOuro && UI.atualizarOuro(); J.recalc(); RAIZ.atualizarTopo(); J.salvar();
  UI.aviso('A Raiz Primeva foi restituída', '#c070ff');
};
RAIZ.stats = function (pers) {
  const s = {}; if (!pers.raiz || !pers.raiz.nos) return s;
  for (const id of Object.keys(pers.raiz.nos)) { const n = RAIZ.nos[id]; if (n) for (const [k, v] of Object.entries(n.stats)) s[k] = (s[k] || 0) + v; }
  return s;
};
// soma aos atributos (como um bônus permanente) e expõe os efeitos especiais
{
  const calc0 = IT.calcStats;
  IT.calcStats = function (pers, buffs = [], mods = []) {
    const rs = RAIZ.stats(pers);
    const r = calc0(pers, buffs.concat([{ stats: rs }]), mods);
    r.danoCombo = rs.danoCombo || 0; r.chanceJoia = rs.chanceJoia || 0; r.seivaExtra = rs.seivaExtra || 0; r.economia = rs.economia || 0;
    return r;
  };
  if (typeof COMBO !== 'undefined') { const det0 = COMBO.detonar; COMBO.detonar = function (e, d, R) { return det0(e, d * (1 + ((J.st && J.st.danoCombo) || 0) / 100), R); }; }
  const mig0 = J.migrarSave;
  J.migrarSave = function (p) { mig0(p); if (p && !p.raiz) p.raiz = { seiva: 0, nos: { semente: 0 }, total: 0 }; };
}

// ---------------- Seiva Abissal: queda e coleta ----------------
{
  const saq0 = J.gerarSaque;
  J.gerarSaque = function (e) {
    saq0(e);
    if (typeof COOP !== 'undefined' && COOP._semRecompensa) return;
    const st = J.st || {};
    const chance = e.boss ? 1 : e.rar === 'raro' ? 1 : e.rar === 'magico' ? 0.22 : 0.05;
    if (Math.random() < chance) {
      let q = e.boss ? 14 + Math.floor(Math.random() * 10) : e.rar === 'raro' ? 1 + Math.floor(Math.random() * 3) : 1;
      q = Math.max(1, Math.round(q * (1 + (st.seivaExtra || 0) / 100) * (1 + Math.max(0, (e.nivel || 1) - 10) / 60)));
      J.soltar({ uid: IT.uid(), tipo: 'seiva', quantia: q, nome: q + ' Seiva Abissal', raridade: 'seiva' }, e.x, e.z);
    }
    if (st.chanceJoia && Math.random() * 100 < st.chanceJoia) J.soltar(IT.gerarGema(e.nivel || 1), e.x, e.z);
  };
  const peg0 = J.pegar;
  J.pegar = function (d) {
    if (d && d.item && d.item.tipo === 'seiva') {
      RAIZ.estado().seiva += d.item.quantia; RAIZ.estado().total = (RAIZ.estado().total || 0) + d.item.quantia;
      J.texto(J.jog.x, J.jog.y + 2.4, J.jog.z, '+' + d.item.quantia + ' Seiva', '#d090ff', 14, 0.9);
      ENG.scene.remove(d.mesh); d.me.material.dispose(); J.drops.splice(J.drops.indexOf(d), 1);
      if (typeof SOM !== 'undefined') SOM.tocar('gema', { vol: 0.35, intervalo: 0.08 });
      RAIZ.atualizarTopo(); return true;
    }
    return peg0(d);
  };
  const at0 = J.atualizar;
  J.atualizar = function (dt) {
    at0(dt);
    if (J.estado !== 'jogando' || !J.jog) return;
    for (let i = J.drops.length - 1; i >= 0; i--) { const d = J.drops[i]; if (d.item.tipo === 'seiva' && d.t > 0.5 && Math.hypot(d.x - J.jog.x, d.z - J.jog.z) < 3) J.pegar(d); }
  };
}

// ---------------- janela ----------------
RAIZ.pulsos = [];
{
  const css = `
  #painelRaiz[hidden]{display:none}
  #painelRaiz{position:fixed;inset:0;z-index:58;background:#07050a;display:flex;flex-direction:column;font-family:"Alegreya Sans",sans-serif;color:#e8dcc0}
  .rzTopo{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:10px 18px;background:linear-gradient(#2a1424,#140a12);border-bottom:2px solid #6a3a5a;box-shadow:0 4px 20px rgba(0,0,0,.7)}
  .rzTit{font-family:Cinzel,serif;font-size:22px;color:#ffe0a0;letter-spacing:.06em;padding:4px 18px;border:1px solid #c8a060;background:linear-gradient(#3a2414,#1a0e08);box-shadow:0 0 14px rgba(200,140,60,.35) inset}
  .rzSeiva{display:flex;flex-direction:column;gap:3px;min-width:200px}
  .rzSeiva b{color:#e0b0ff;font-size:17px;font-variant-numeric:tabular-nums}
  .rzBarra{height:7px;background:#1a0e18;border:1px solid #4a2a44;border-radius:4px;overflow:hidden}
  .rzBarra i{display:block;height:100%;background:linear-gradient(90deg,#7a3aa8,#e090ff);box-shadow:0 0 8px #c070ff}
  .rzTopo .btn{padding:6px 14px}
  .rzBusca{margin-left:auto;display:flex;gap:6px;align-items:center}
  .rzBusca input{background:#120a10;border:1px solid #5a3a50;color:#f0e0ff;padding:6px 10px;font-family:inherit;font-size:14px;width:180px}
  .rzArea{flex:1;position:relative;overflow:hidden}
  .rzArea canvas{position:absolute;inset:0;width:100%;height:100%;cursor:default}
  .rzDica{position:absolute;pointer-events:none;background:rgba(14,8,14,.96);border:1px solid #8a5a8a;padding:8px 12px;font-size:13px;max-width:280px;box-shadow:0 0 20px rgba(0,0,0,.8)}
  .rzDica b{font-family:Cinzel,serif;font-size:15px;display:block;margin-bottom:3px}
  .rzDica .st{color:#b8b0ff}
  .rzDica .c{color:#c8b090;margin-top:5px;font-size:12px}
  .rzLeg{position:absolute;left:14px;bottom:10px;font-size:12px;color:#a090a8;max-width:520px;line-height:1.4}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'painelRaiz'; d.hidden = true;
  d.innerHTML = `<div class="rzTopo"><span class="rzTit">A Raiz Primeva</span>
    <div class="rzSeiva"><span>Seiva Abissal: <b id="rzSeiva">0</b> · próximo nó: <b id="rzCusto">2</b></span><div class="rzBarra"><i id="rzBarra"></i></div></div>
    <button class="btn" id="rzRestituir">Restituir passivas</button>
    <div class="rzBusca"><input id="rzBusca" placeholder="Buscar aqui" autocomplete="off"><button class="btn sec" id="rzFechar">Fechar (G)</button></div></div>
    <div class="rzArea"><canvas id="rzCanvas"></canvas><div class="rzDica" id="rzDica" hidden></div>
    <div class="rzLeg">A Seiva Abissal cai de monstros mágicos, raros e chefes. Cada nó despertado custa um pouco mais que o anterior. Clique para despertar um nó ligado à sua raiz; clique direito numa ponta para devolvê-lo.</div></div>`;
  document.body.appendChild(d);
  d.querySelector('#rzFechar').addEventListener('click', () => RAIZ.alternar(false));
  d.querySelector('#rzRestituir').addEventListener('click', () => RAIZ.restituir());
  d.querySelector('#rzBusca').addEventListener('input', (ev) => { RAIZ.busca = ev.target.value.trim().toLowerCase(); });
  d.querySelector('#rzBusca').addEventListener('keydown', (ev) => ev.stopPropagation());
  const cv = d.querySelector('#rzCanvas');
  const pos = (ev) => { const r = cv.getBoundingClientRect(), k = RAIZ.esc; return { x: (ev.clientX - r.left - RAIZ.ox) / k, y: (ev.clientY - r.top - RAIZ.oy) / k, cx: ev.clientX - r.left, cy: ev.clientY - r.top }; };
  const achar = (p) => RAIZ.lista.find(n => Math.hypot(n.x - p.x, n.y - p.y) < (n.tipo === 'nucleo' ? 26 : n.tipo === 'notavel' ? 17 : 12));
  cv.addEventListener('mousemove', (ev) => {
    const p = pos(ev); const n = achar(p); RAIZ.hover = n || null; const dica = d.querySelector('#rzDica');
    if (!n) { dica.hidden = true; cv.style.cursor = 'default'; return; }
    const s = RAIZ.estado(), tem = n.id in s.nos, pode = RAIZ.disponivel(n.id);
    cv.style.cursor = pode ? 'pointer' : 'default';
    const tipo = n.tipo === 'nucleo' ? 'Núcleo' : n.tipo === 'notavel' ? 'Nó Notável' : n.tipo === 'semente' ? 'Origem' : 'Nó';
    dica.innerHTML = `<b style="color:${n.cor}">${esc(n.nome)}</b><div style="color:#a08aa8;font-size:12px">${tipo}${n.ramo ? ' · Ramo ' + esc(n.nome && RAIZ.nomeRamo(n.ramo)) : ''}</div>` +
      Object.entries(n.stats).map(([k, v]) => `<div class="st">${STAT_NOMES[k] ? STAT_NOMES[k](v) : k + ' ' + v}</div>`).join('') +
      `<div class="c">${tem ? (n.id === 'semente' ? 'Despertado' : `Despertado (custou ${s.nos[n.id]} de Seiva) · clique direito para devolver`) : pode ? `Clique para despertar: ${RAIZ.custo()} de Seiva` : 'Ligue este nó a um nó já despertado'}</div>`;
    dica.hidden = false;
    const r = cv.getBoundingClientRect(); let x = p.cx + 16, y = p.cy + 12;
    if (x + 290 > r.width) x = p.cx - 296; if (y + dica.offsetHeight > r.height) y = r.height - dica.offsetHeight - 6;
    dica.style.left = x + 'px'; dica.style.top = y + 'px';
  });
  cv.addEventListener('mouseleave', () => { RAIZ.hover = null; d.querySelector('#rzDica').hidden = true; });
  cv.addEventListener('click', (ev) => { const n = achar(pos(ev)); if (n && RAIZ.disponivel(n.id)) RAIZ.alocar(n.id); });
  cv.addEventListener('contextmenu', (ev) => { ev.preventDefault(); const n = achar(pos(ev)); if (n && n.id in RAIZ.estado().nos) RAIZ.devolver(n.id); });
}
RAIZ.nomeRamo = (id) => ({ furia: 'da Fúria', carapaca: 'da Carapaça', colheita: 'da Colheita', arcano: 'Arcano' }[id] || '');
RAIZ.atualizarTopo = function () {
  if (!J.pers) return; const s = RAIZ.estado(); const c = RAIZ.custo();
  const e = (id) => document.getElementById(id);
  if (!e('rzSeiva')) return;
  e('rzSeiva').textContent = s.seiva; e('rzCusto').textContent = c;
  e('rzBarra').style.width = Math.min(100, s.seiva / c * 100) + '%';
};
RAIZ.alternar = function (abrir) {
  const el = document.getElementById('painelRaiz'); const ab = abrir ?? el.hidden;
  if (ab && !J.pers) return;
  el.hidden = !ab;
  if (ab) { if (J.estado === 'jogando') J.estado = 'pausa'; RAIZ.atualizarTopo(); RAIZ.t0 = performance.now(); requestAnimationFrame(RAIZ.quadro); }
  else { document.getElementById('rzDica').hidden = true; if (J.estado === 'pausa' && J.mundo && $('#modalMenu').hidden) J.estado = 'jogando'; }
};
window.addEventListener('keydown', (ev) => {
  if (ev.code !== 'KeyG' || ev.repeat) return;
  const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
  if (!J.pers || !J.mundo) return;
  RAIZ.alternar();
});
{
  const pet = document.getElementById('bPet') || document.getElementById('bSocial');
  if (pet) { const b = document.createElement('button'); b.className = 'bmenu'; b.id = 'bRaiz'; b.textContent = 'Raiz (G)'; b.addEventListener('click', () => RAIZ.alternar()); pet.before(b); }
  const f0 = UI.fecharTudo;
  UI.fecharTudo = function () { f0(); const el = document.getElementById('painelRaiz'); if (el && !el.hidden) RAIZ.alternar(false); };
  window.addEventListener('keydown', (ev) => { if (ev.code === 'Escape' && !document.getElementById('painelRaiz').hidden) { ev.stopImmediatePropagation(); RAIZ.alternar(false); } }, true);
}

// ---------------- desenho ----------------
// fundo: tronco retorcido que segue os ramos, runas apagadas (pintado uma vez)
RAIZ.fundo = function () {
  if (RAIZ._fundo) return RAIZ._fundo;
  const W = RAIZ.W, H = RAIZ.H, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H * 0.55, 50, W / 2, H * 0.55, W * 0.7); gr.addColorStop(0, '#24182a'); gr.addColorStop(1, '#08060a');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // runas apagadas
  const rnd = mulberry32(77); g.font = '20px serif'; g.fillStyle = 'rgba(160,120,170,.07)';
  const runas = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  for (let i = 0; i < 260; i++) g.fillText(runas[Math.floor(rnd() * runas.length)], rnd() * W, rnd() * H);
  // galhos: traçados grossos ao longo das ligações, do tronco para fora
  const sem = RAIZ.nos.semente; const prof = { semente: 0 }; const fila = ['semente'];
  while (fila.length) { const a = fila.shift(); for (const v of RAIZ.nos[a].viz) if (!(v in prof)) { prof[v] = prof[a] + 1; fila.push(v); } }
  const galho = (a, b, larg) => {
    const mx = (a.x + b.x) / 2 + (rnd() - 0.5) * 26, my = (a.y + b.y) / 2 + (rnd() - 0.5) * 26;
    const gl = g.createLinearGradient(a.x, a.y, b.x, b.y); gl.addColorStop(0, '#4a3048'); gl.addColorStop(1, '#3a2638');
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = larg + 6; g.beginPath(); g.moveTo(a.x, a.y + 4); g.quadraticCurveTo(mx, my + 4, b.x, b.y + 4); g.stroke();
    g.strokeStyle = gl; g.lineWidth = larg; g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(mx, my, b.x, b.y); g.stroke();
    g.strokeStyle = 'rgba(200,160,200,.12)'; g.lineWidth = Math.max(1, larg * 0.18); g.beginPath(); g.moveTo(a.x - larg * 0.2, a.y - larg * 0.2); g.quadraticCurveTo(mx - larg * 0.2, my - larg * 0.2, b.x - larg * 0.2, b.y - larg * 0.2); g.stroke();
  };
  g.lineCap = 'round';
  // tronco principal
  for (let k = 0; k < 6; k++) { g.strokeStyle = k % 2 ? '#3e2a3e' : '#4a3248'; g.lineWidth = 70 - k * 8; g.beginPath(); g.moveTo(sem.x - 40 + k * 14, H + 20); g.bezierCurveTo(sem.x - 60 + k * 20, H - 60, sem.x + 30 - k * 10, sem.y + 40, sem.x, sem.y); g.stroke(); }
  const pares = []; for (const n of RAIZ.lista) for (const v of n.viz) if (prof[v] > prof[n.id]) pares.push([n, RAIZ.nos[v]]);
  pares.sort((a, b) => prof[a[0].id] - prof[b[0].id]);
  for (const [a, b] of pares) galho(a, b, Math.max(5, 30 - prof[a.id] * 4.2));
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return (RAIZ._fundo = c);
};
RAIZ.quadro = function () {
  const el = document.getElementById('painelRaiz'); if (el.hidden) return;
  const cv = document.getElementById('rzCanvas'); const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const k = Math.min(w / RAIZ.W, h / RAIZ.H); RAIZ.esc = k; RAIZ.ox = (w - RAIZ.W * k) / 2; RAIZ.oy = (h - RAIZ.H * k) / 2;
  g.fillStyle = '#07050a'; g.fillRect(0, 0, w, h);
  g.save(); g.translate(RAIZ.ox, RAIZ.oy); g.scale(k, k);
  g.drawImage(RAIZ.fundo(), 0, 0);
  const t = (performance.now() - RAIZ.t0) / 1000, s = RAIZ.estado(), busca = RAIZ.busca;
  // ligações
  g.lineCap = 'round';
  for (const n of RAIZ.lista) for (const v of n.viz) {
    if (v < n.id) continue; const b = RAIZ.nos[v];
    const ativo = n.id in s.nos && v in s.nos, meio = (n.id in s.nos) !== (v in s.nos);
    g.strokeStyle = ativo ? '#d8a0ff' : meio ? 'rgba(170,130,210,.75)' : 'rgba(120,100,150,.45)';
    g.lineWidth = ativo ? 3.2 : 2;
    if (ativo) { g.save(); g.shadowColor = '#c070ff'; g.shadowBlur = 10; }
    g.beginPath(); g.moveTo(n.x, n.y); g.lineTo(b.x, b.y); g.stroke();
    if (ativo) g.restore();
  }
  // nós
  for (const n of RAIZ.lista) {
    const tem = n.id in s.nos, pode = RAIZ.disponivel(n.id), sob = RAIZ.hover === n;
    const r = n.tipo === 'nucleo' ? 24 : n.tipo === 'notavel' ? 15 : n.tipo === 'semente' ? 16 : 9;
    const achado = busca && (n.nome.toLowerCase().includes(busca) || Object.keys(n.stats).some(k2 => (STAT_NOMES[k2] ? STAT_NOMES[k2](n.stats[k2]) : k2).toLowerCase().includes(busca)));
    g.save();
    if (n.tipo === 'nucleo') { // casulo pulsante
      const pul = 1 + Math.sin(t * 2.2 + n.x) * 0.05;
      g.shadowColor = tem ? n.cor : '#8a50c0'; g.shadowBlur = tem ? 30 : 14;
      const gr = g.createRadialGradient(n.x - 6, n.y - 8, 2, n.x, n.y, r * pul);
      gr.addColorStop(0, tem ? '#ffe0ff' : '#c8a0e8'); gr.addColorStop(0.45, tem ? '#b060f0' : '#7a4aa0'); gr.addColorStop(1, '#2a1030');
      g.fillStyle = gr; g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, rr = r * pul * (1 + Math.sin(a * 5 + t * 1.5) * 0.06); g.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr); } g.closePath(); g.fill();
      g.shadowBlur = 0; g.fillStyle = '#100810'; g.beginPath(); g.arc(n.x, n.y, r * 0.38, 0, 7); g.fill();
      g.strokeStyle = tem ? n.cor : '#8a6aa8'; g.lineWidth = 2; g.beginPath(); g.arc(n.x, n.y, r * 0.38, 0, 7); g.stroke();
    } else {
      // aro prateado com espinhos
      if (tem) { g.shadowColor = n.cor; g.shadowBlur = 14; }
      g.fillStyle = tem ? '#e8e0f0' : pode ? '#a89cb8' : '#5a5064';
      g.beginPath(); const sp = n.tipo === 'pequeno' ? 10 : 14; for (let i = 0; i < sp * 2; i++) { const a = i / (sp * 2) * Math.PI * 2, rr = r + (i % 2 ? 1.2 : 3.4); g.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr); } g.closePath(); g.fill();
      g.shadowBlur = 0;
      const gr = g.createRadialGradient(n.x - r * 0.35, n.y - r * 0.35, 1, n.x, n.y, r);
      gr.addColorStop(0, tem ? '#ffffff' : '#4a4058'); gr.addColorStop(0.5, tem ? n.cor : '#2a2232'); gr.addColorStop(1, tem ? ARTE.tom(n.cor, -0.5) : '#140e18');
      g.fillStyle = gr; g.beginPath(); g.arc(n.x, n.y, r * 0.82, 0, 7); g.fill();
      if (n.tipo === 'notavel' || n.tipo === 'semente') { g.strokeStyle = tem ? '#ffe8a0' : '#8a7a5a'; g.lineWidth = 1.6; g.beginPath(); g.arc(n.x, n.y, r * 0.82, 0, 7); g.stroke(); }
    }
    if (pode) { g.strokeStyle = `rgba(230,200,255,${0.5 + Math.sin(t * 4) * 0.3})`; g.lineWidth = 2; g.beginPath(); g.arc(n.x, n.y, r + 6, 0, 7); g.stroke(); }
    if (achado) { g.strokeStyle = '#ffe060'; g.lineWidth = 3; g.shadowColor = '#ffe060'; g.shadowBlur = 12; g.beginPath(); g.arc(n.x, n.y, r + 9, 0, 7); g.stroke(); }
    if (sob) { g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.arc(n.x, n.y, r + 4, 0, 7); g.stroke(); }
    g.restore();
    if (n.tipo === 'nucleo') { g.font = '700 10px Cinzel, serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.7)'; const tw = g.measureText(n.nome).width + 10; g.fillRect(n.x - tw / 2, n.y + r + 8, tw, 14); g.fillStyle = '#e8d0ff'; g.fillText(n.nome, n.x, n.y + r + 19); }
  }
  // brilho ao despertar
  RAIZ.pulsos = RAIZ.pulsos.filter(p => (p.t += 1 / 60) < 0.8);
  for (const p of RAIZ.pulsos) { const n = RAIZ.nos[p.id]; g.strokeStyle = `rgba(230,170,255,${1 - p.t / 0.8})`; g.lineWidth = 3; g.beginPath(); g.arc(n.x, n.y, 10 + p.t * 60, 0, 7); g.stroke(); }
  g.restore();
  requestAnimationFrame(RAIZ.quadro);
};
