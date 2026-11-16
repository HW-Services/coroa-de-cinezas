// ============================================================
//  Combos elementais: cada golpe deixa uma marca no inimigo
//  (chamas, gelo, eletrizado, veneno, sangramento, perfurado,
//  vento, impacto). Um golpe de outro tipo sobre uma marca
//  compatível detona uma reação com dano elevado.
// ============================================================
'use strict';

const MARCAS = {
  chamas: { nome: 'Em Chamas', cor: '#ff7a20', ic: '♨' },
  gelo: { nome: 'Gelado', cor: '#8fd8ff', ic: '❄' },
  eletrizado: { nome: 'Eletrizado', cor: '#c8a8ff', ic: 'ϟ' },
  veneno: { nome: 'Envenenado', cor: '#8ed43a', ic: '☣' },
  sangramento: { nome: 'Sangrando', cor: '#e0203a', ic: '✚' },
  perfurado: { nome: 'Perfurado', cor: '#e8d8b0', ic: '➹' },
  vento: { nome: 'Vendaval', cor: '#b8f0e0', ic: '༄' },
  impacto: { nome: 'Atordoado', cor: '#f0c860', ic: '✶' },
};
const MARCA_ELEM = { fogo: 'chamas', frio: 'gelo', raio: 'eletrizado', veneno: 'veneno' };
// marcas físicas de cada habilidade
const MARCA_HAB = {
  golpe_pesado: ['impacto'], lanca_arremessada: ['perfurado'], turbilhao: ['vento', 'sangramento'], fissura: ['impacto'],
  investida: ['impacto'], terremoto: ['impacto'], salto: ['impacto', 'vento'], execucao: ['sangramento'], martelo_sagrado: ['impacto'],
  disparo_rapido: ['perfurado'], laminas_gemeas: ['sangramento'], flecha_perfurante: ['perfurado'], rajada: ['vento'],
  rolamento: ['vento'], chuva_flechas: ['perfurado'], leque_laminas: ['sangramento'], tempestade_aco: ['sangramento', 'vento'],
  tiro_explosivo: ['impacto'], saraivada: ['perfurado'], lanca_ossos: ['perfurado'],
  teleporte: ['vento'], nova_glacial: ['vento'], frenesi: ['sangramento'],
};
// reações (a ordem define a prioridade quando mais de uma é possível)
const REACOES = [
  { id: 'tempestadeFogo', a: 'chamas', b: 'vento', nome: 'Tempestade de Fogo', cor: '#ff6a10', elem: 'fogo', mult: 1.4, area: 5.5, multArea: 0.8, queima: 0.6, desc: '+140% de dano e um redemoinho de chamas fere e queima quem estiver por perto.' },
  { id: 'supercondutor', a: 'gelo', b: 'eletrizado', nome: 'Supercondutor', cor: '#a8f0ff', elem: 'raio', mult: 1.8, vuln: 25, vulnT: 5, desc: '+180% de dano e o alvo recebe +25% de dano por 5 s.' },
  { id: 'hemorragia', a: 'sangramento', b: 'perfurado', nome: 'Hemorragia', cor: '#ff1a3a', elem: 'fisico', mult: 1.8, sangra: 1.2, desc: '+180% de dano e um sangramento intenso (120% do golpe em 4 s).' },
  { id: 'estilhacar', a: 'gelo', b: 'impacto', nome: 'Estilhaçar', cor: '#d8f6ff', elem: 'frio', mult: 2.2, desc: '+220% de dano: o gelo se parte em estilhaços.' },
  { id: 'sobrecarga', a: 'chamas', b: 'eletrizado', nome: 'Sobrecarga', cor: '#ffd040', elem: 'raio', mult: 1.0, area: 4.5, multArea: 1.0, desc: '+100% de dano e uma explosão que atinge todos ao redor.' },
  { id: 'tempestadeEletrica', a: 'eletrizado', b: 'vento', nome: 'Tempestade Elétrica', cor: '#b8a0ff', elem: 'raio', mult: 0.9, cadeia: 5, multCadeia: 0.9, desc: '+90% de dano e raios saltam para até 5 inimigos próximos.' },
  { id: 'derretimento', a: 'chamas', b: 'gelo', nome: 'Derretimento', cor: '#ffa070', elem: 'fogo', mult: 1.6, desc: '+160% de dano: o choque térmico racha a carne.' },
  { id: 'combustao', a: 'veneno', b: 'chamas', nome: 'Combustão Tóxica', cor: '#b0e030', elem: 'veneno', mult: 0.8, area: 5, multArea: 0.7, veneno: 0.8, desc: '+80% de dano e uma nuvem tóxica explode, envenenando os próximos.' },
  { id: 'corrosao', a: 'veneno', b: 'perfurado', nome: 'Corrosão', cor: '#7ad040', elem: 'veneno', mult: 1.0, vuln: 35, vulnT: 5, desc: '+100% de dano e a armadura derrete: +35% de dano recebido por 5 s.' },
  { id: 'nevasca', a: 'gelo', b: 'vento', nome: 'Nevasca', cor: '#c0e4ff', elem: 'frio', mult: 0.9, area: 6, multArea: 0.7, lento: 0.55, desc: '+90% de dano e uma nevasca fere e congela (lentidão de 55%) quem estiver ao redor.' },
  { id: 'ruptura', a: 'sangramento', b: 'impacto', nome: 'Ruptura', cor: '#ff5040', elem: 'fisico', mult: 1.5, desc: '+150% de dano: as feridas se abrem com o impacto.' },
  { id: 'sangueToxico', a: 'veneno', b: 'sangramento', nome: 'Sangue Tóxico', cor: '#9ad020', elem: 'veneno', mult: 0.7, veneno: 1.4, desc: '+70% de dano e o veneno corre no sangue (140% do golpe em 4 s).' },
  { id: 'fulminar', a: 'eletrizado', b: 'perfurado', nome: 'Para-raios', cor: '#e0d0ff', elem: 'raio', mult: 1.3, cadeia: 3, multCadeia: 0.6, desc: '+130% de dano e o projétil vira para-raios para 3 inimigos.' },
];
const DUR_MARCA = 4.5;

const COMBO = {};
COMBO.marcasDe = function (sk) {
  if (!sk) return [];
  const m = [];
  const el = MARCA_ELEM[sk.elem]; if (el) m.push(el);
  if (sk.id && MARCA_HAB[sk.id]) m.push(...MARCA_HAB[sk.id]);
  return m;
};
COMBO.reacao = function (x, y) { return REACOES.find(r => (r.a === x && r.b === y) || (r.a === y && r.b === x)); };

{
  const acertar0 = J.acertarInimigo;
  J.acertarInimigo = function (e, mult, sk, o = {}) {
    if (!e || e.morto) return 0;
    const agora = J.tempo || 0;
    // alvo vulnerável recebe dano extra
    if (e.vulnAte > agora) o = Object.assign({}, o, { extraPct: (o.extraPct || 0) + e.vulnF });
    const d = acertar0(e, mult, sk, o);
    if (o.combo || !d || e.morto) return d;
    const novas = COMBO.marcasDe(sk); if (!novas.length) return d;
    e.marcas = e.marcas || {};
    for (const k in e.marcas) if (e.marcas[k] < agora) delete e.marcas[k];
    // procura uma reação: marca nova contra marca já presente
    if (!(e.comboCD > agora)) {
      for (const nova of novas) for (const velha in e.marcas) {
        if (velha === nova) continue;
        const R = COMBO.reacao(nova, velha); if (!R) continue;
        delete e.marcas[velha];
        e.comboCD = agora + 0.4;
        COMBO.rede.detonou(e, velha, R);
        COMBO.detonar(e, d, R);
        return d;
      }
    }
    for (const nova of novas) e.marcas[nova] = agora + DUR_MARCA;
    COMBO.rede.marcou(e, novas);
    return d;
  };
}

COMBO.detonar = function (e, d, R) {
  const agora = J.tempo || 0;
  const k = e.rar === 'chefe' ? 0.7 : 1;
  const y = e.y + (e.m.alturaCabeca || 1.8) * e.m.escala;
  const base = { combo: true, semVPG: true, semFx: true };
  // dano extra no alvo
  if (R.mult) acertar(e, d * R.mult * k, R.elem);
  if (R.vuln) { e.vulnAte = agora + R.vulnT; e.vulnF = R.vuln; }
  if (R.sangra) e.dots.push({ dps: d * R.sangra * (1 + J.st.danoDot / 100) / 4, t: 4, elem: 'fisico' });
  if (R.veneno) e.dots.push({ dps: d * R.veneno * (1 + J.st.danoDot / 100) / 4, t: 4, elem: 'veneno' });
  if (R.lento) { e.lentoT = 3; e.lentoF = Math.max(e.lentoF, e.boss ? R.lento * 0.4 : R.lento); }
  // área
  if (R.area) {
    for (const o of J.inimigos) {
      if (o === e || o.morto || !o.m.raiz.visible || Math.hypot(o.x - e.x, o.z - e.z) > R.area + o.raio) continue;
      acertar(o, d * R.multArea * k, R.elem);
      if (R.queima) o.dots.push({ dps: d * R.queima / 3, t: 3, elem: 'fogo' });
      if (R.veneno) o.dots.push({ dps: d * R.veneno * 0.6 / 4, t: 4, elem: 'veneno' });
      if (R.lento) { o.lentoT = 3; o.lentoF = Math.max(o.lentoF, o.boss ? R.lento * 0.4 : R.lento); }
    }
    ENG.onda(e.x, J.mundo.h(e.x, e.z) + 0.15, e.z, R.area, R.cor, 0.5);
    ENG.particulas.emitir({ x: e.x, y: e.y + 0.8, z: e.z, n: 60, cor: R.cor, cor2: '#ffffff', vel: R.area * 1.6, vida: 0.7, tam: 0.55, sobe: 0.6, espalhar: 1 });
  }
  // cadeia
  if (R.cadeia) {
    let de = e; const feitos = new Set([e]);
    for (let i = 0; i < R.cadeia; i++) {
      let melhor = null, md = 9;
      for (const o of J.inimigos) { if (feitos.has(o) || o.morto || !o.m.raiz.visible) continue; const dd = Math.hypot(o.x - de.x, o.z - de.z); if (dd < md) { md = dd; melhor = o; } }
      if (!melhor) break;
      feitos.add(melhor);
      ENG.relampago(new THREE.Vector3(de.x, de.y + 1.2, de.z), new THREE.Vector3(melhor.x, melhor.y + 1.2, melhor.z), R.cor, 0.14);
      acertar(melhor, d * R.multCadeia * k, R.elem);
      de = melhor;
    }
  }
  COMBO.fx(e, R);
  J.combosFeitos = (J.combosFeitos || 0) + 1;

  function acertar(alvo, qtd, elem) { if (qtd >= 1) J.acertarInimigo(alvo, 1, { elem }, Object.assign({ base: qtd, elem }, base)); }
};
// efeito visual e sonoro de uma reação (também usado quando outro jogador detona)
COMBO.fx = function (e, R, quem) {
  const y = e.y + (e.m.alturaCabeca || 1.8) * e.m.escala;
  if (quem && R.area) ENG.onda(e.x, J.mundo.h(e.x, e.z) + 0.15, e.z, R.area, R.cor, 0.5);
  ENG.particulas.emitir({ x: e.x, y: e.y + 1, z: e.z, n: 40, cor: R.cor, cor2: '#ffffff', vel: 6, vida: 0.55, tam: 0.5, sobe: 1.2, espalhar: 0.6 });
  ENG.luz(new THREE.Vector3(e.x, e.y + 2, e.z), R.cor, 6, 0.35, 14);
  ENG.coluna(e.x, J.mundo.h(e.x, e.z), e.z, R.cor, 5, 0.9, 0.35);
  ENG.tremor = Math.max(ENG.tremor || 0, 0.35);
  J.texto(e.x, y + 0.9, e.z, R.nome + '!' + (quem ? ' (' + quem + ')' : ''), R.cor, quem ? 22 : 26);
  if (typeof SOM !== 'undefined') { SOM.tocar(R.area || R.cadeia ? 'explosao' : R.elem === 'raio' ? 'trovao' : 'impacto', { x: e.x, z: e.z, vol: quem ? 0.6 : 0.85 }); }
};

// ---------- combos entre jogadores ----------
// As marcas de cada jogador são enviadas à sala da área (agrupadas a cada 120 ms):
// qualquer jogador pode detonar a marca deixada por outro. A detonação avisa os demais,
// que removem a marca consumida e veem o efeito. O dano extra segue pelo mesmo caminho
// de qualquer golpe (o anfitrião aplica e repassa).
COMBO.rede = {
  fila: new Map(), timer: null,
  ativo: () => typeof COOP !== 'undefined' && COOP.ativo && COOP.ativo(),
  marcou(e, marcas) {
    if (e.nid == null || !this.ativo()) return;
    const k = e.nid; const s = this.fila.get(k) || new Set(); marcas.forEach(m => s.add(m)); this.fila.set(k, s);
    if (!this.timer) this.timer = setTimeout(() => this.enviarFila(), 120);
  },
  enviarFila() {
    this.timer = null; if (!this.fila.size || !this.ativo()) { this.fila.clear(); return; }
    const l = []; for (const [n, s] of this.fila) l.push([n, [...s].join(',')]);
    this.fila.clear();
    COOP.enviar('mk', { l: l.slice(0, 60) });
  },
  detonou(e, consumida, R) {
    if (e.nid == null || !this.ativo()) return;
    COOP.enviar('mx', { n: e.nid, m: consumida, r: R.id, q: (J.pers && J.pers.nome) || '' });
  },
  receber(m) {
    if (!J.inimigos || !J.z) return;
    const agora = J.tempo || 0;
    const porNid = (n) => J.inimigos.find(x => x.nid === n && !x.morto);
    if (m.t === 'mk' && Array.isArray(m.l)) {
      for (const it of m.l.slice(0, 60)) {
        if (!Array.isArray(it)) continue;
        const e = porNid(+it[0]); if (!e) continue;
        e.marcas = e.marcas || {};
        for (const mk of String(it[1] || '').split(',')) if (MARCAS[mk]) e.marcas[mk] = agora + DUR_MARCA;
      }
    } else if (m.t === 'mx') {
      const e = porNid(+m.n); if (!e) return;
      if (e.marcas && MARCAS[m.m]) delete e.marcas[m.m];
      e.comboCD = agora + 0.25;
      const R = REACOES.find(r => r.id === m.r);
      if (R && e.m && e.m.raiz.visible) COMBO.fx(e, R, String(m.q || 'aliado').slice(0, 16));
    }
  },
};
if (typeof COOP !== 'undefined') {
  const rec0 = COOP.receber;
  COOP.receber = function (m) {
    if (m && (m.t === 'mk' || m.t === 'mx')) { if (m.k0 !== COOP.minhaChave()) COMBO.rede.receber(m); return; }
    return rec0.apply(this, arguments);
  };
}

// ---------- marcas sobre as barras de vida ----------
{
  const ov0 = UI.desenharOverlay;
  UI.desenharOverlay = function () {
    ov0();
    if (!J.mundo || !J.jog || J.estado === 'menu') return;
    const g = UI.ovg, v = new THREE.Vector3(), o = {}, agora = J.tempo || 0;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const e of J.inimigos) {
      if (e.morto || !e.marcas || !e.m.raiz.visible) continue;
      const ms = Object.keys(e.marcas).filter(k => e.marcas[k] > agora);
      const vul = e.vulnAte > agora;
      if (!ms.length && !vul) continue;
      v.set(e.x, e.y + (e.m.alturaCabeca || 1.8) * e.m.escala + 0.4, e.z); ENG.paraTela(v, o); if (o.z > 1) continue;
      const lista = ms.map(k => MARCAS[k]); if (vul) lista.push({ cor: '#ff60c0', ic: '⬇' });
      const y = o.y + (e.boss ? 18 : 14), w = 15;
      lista.forEach((M, i) => {
        const x = o.x + (i - (lista.length - 1) / 2) * (w + 3);
        g.fillStyle = 'rgba(8,6,5,.85)'; g.beginPath(); g.arc(x, y, w / 2 + 1, 0, 7); g.fill();
        g.strokeStyle = M.cor; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, w / 2, 0, 7); g.stroke();
        g.font = '700 10px sans-serif'; g.fillStyle = M.cor; g.fillText(M.ic, x, y + 0.5);
      });
    }
    g.textBaseline = 'alphabetic';
  };
}

// ---------- painel de combos (tecla L, botão na árvore e na barra) ----------
COMBO.abrirPainel = function () {
  let el = document.getElementById('painelCombos');
  if (!el) {
    el = document.createElement('div'); el.id = 'painelCombos'; el.hidden = true;
    document.body.appendChild(el);
    el.addEventListener('click', (ev) => { if (ev.target.dataset.fechar) el.hidden = true; });
  }
  if (!el.hidden) { el.hidden = true; return; }
  const chip = (k) => `<span class="cbChip" style="--c:${MARCAS[k].cor}"><b>${MARCAS[k].ic}</b>${MARCAS[k].nome}</span>`;
  const classe = J.pers ? J.pers.classe : null;
  const habs = Object.entries(HABILIDADES).filter(([id, h]) => !classe || h.classe === classe)
    .map(([id, h]) => { const ms = COMBO.marcasDe(Object.assign({ id }, h)); return ms.length ? `<div class="cbHab"><span>${h.icone || ''} ${esc(h.nome)}</span>${ms.map(chip).join('')}</div>` : ''; }).join('');
  el.innerHTML = `<div class="cbTopo"><h2>Combos Elementais</h2><button class="btn" data-fechar="1">Fechar (L)</button></div>
    <p class="cbDica">Cada golpe deixa uma <b>marca</b> no inimigo por ${DUR_MARCA} s. Acerte o mesmo inimigo com uma habilidade de outro tipo para <b>detonar a reação</b>. A reação consome a marca. Chefes sofrem 70% do efeito extra.</p>
    <div class="cbGrade">${REACOES.map(R => `<div class="cbR" style="--c:${R.cor}"><div class="cbN">${R.nome}</div><div>${chip(R.a)} <i>+</i> ${chip(R.b)}</div><div class="cbD">${R.desc}</div></div>`).join('')}</div>
    <h3>Marcas das suas habilidades</h3><div class="cbHabs">${habs}</div>`;
  el.hidden = false;
};
window.addEventListener('keydown', (ev) => {
  if (ev.code !== 'KeyL' || ev.repeat || J.estado !== 'jogando') return;
  const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
  COMBO.abrirPainel();
});
// botões de acesso
{
  const ab = document.getElementById('abasArvore');
  if (ab) { const b = document.createElement('button'); b.className = 'aba'; b.textContent = 'Combos (L)'; b.style.marginLeft = 'auto'; b.addEventListener('click', (ev) => { ev.stopPropagation(); COMBO.abrirPainel(); }); ab.appendChild(b); }
  const pet = document.getElementById('bPet');
  if (pet) { const b = pet.cloneNode(false); b.removeAttribute('id'); b.textContent = 'Combos (L)'; b.addEventListener('click', () => COMBO.abrirPainel()); pet.after(b); }
}
{
  const f0 = UI.fecharTudo;
  UI.fecharTudo = function () { f0(); const el = document.getElementById('painelCombos'); if (el) el.hidden = true; };
}
{
  const st = document.createElement('style');
  st.textContent = `
#painelCombos[hidden]{display:none}
#painelCombos{position:fixed;box-sizing:border-box;left:50%;top:50%;transform:translate(-50%,-50%);width:min(860px,94vw);max-height:86vh;overflow:auto;z-index:60;background:linear-gradient(#1a1410,#0e0a08);border:1px solid #6a5434;box-shadow:0 0 40px #000;padding:18px 22px;color:#e8dcc0;font-family:"Alegreya Sans",sans-serif}
#painelCombos h2{font-family:Cinzel,serif;color:#e8c070;margin:0;font-size:22px}
#painelCombos h3{font-family:Cinzel,serif;color:#c8a060;font-size:15px;margin:16px 0 8px}
.cbTopo{display:flex;justify-content:space-between;align-items:center}
.cbDica{color:#b8ac90;font-size:14px;margin:8px 0 12px}
.cbGrade{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
.cbR{border:1px solid color-mix(in srgb,var(--c) 45%,#000);background:linear-gradient(135deg,color-mix(in srgb,var(--c) 14%,#120e0a),#0e0a08);padding:8px 10px;border-radius:4px}
.cbN{font-weight:800;color:var(--c);font-size:16px;margin-bottom:4px}
.cbD{font-size:13px;color:#cfc3a6;margin-top:5px}
.cbChip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--c);color:var(--c);border-radius:10px;padding:0 7px 0 5px;font-size:12px;margin:1px 2px;white-space:nowrap}
.cbChip b{font-size:11px}
.cbHabs{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:4px 12px}
.cbHab{font-size:13px;display:flex;flex-wrap:wrap;align-items:center;gap:2px}
.cbHab span:first-child{min-width:130px;color:#e8dcc0}
@media (max-width:600px){#painelCombos{padding:12px}}`;
  document.head.appendChild(st);
}
