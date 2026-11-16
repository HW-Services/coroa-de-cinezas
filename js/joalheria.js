// ============================================================
//  Joalheria: uma joalheira em cada cidade evolui as jóias
//  (3 iguais da mesma qualidade + ouro = 1 da qualidade acima)
//  e remove jóias encaixadas sem destruir nada.
// ============================================================
'use strict';

const CUSTO_JOIA = [60, 300, 1200, 4500]; // ouro para criar a qualidade q+1 a partir de q

Object.assign(NPCS, {
  iris: { modelo3d: 'npc_maga', tinta3d: 0xffe0f0, funcao: 'joalheiro', nome: 'Íris', titulo: 'Joalheira do Porto', visual: { pele: 0xe0b090, roupa: 0x5a2a6a, olhos: 0x202020 },
    fala: 'Toda pedra guarda um brilho escondido. Traga três iguais e eu faço delas uma só, bem mais bonita.' },
  tamsin: { modelo3d: 'npc_maga', tinta3d: 0xd8f0d0, funcao: 'joalheiro', nome: 'Tâmsin', titulo: 'Lapidária da Paliçada', visual: { pele: 0xc89070, roupa: 0x2a4a3a, olhos: 0x202020 },
    fala: 'A floresta esconde veios de esmeralda nas raízes. Mas lapidar exige paciência... e ouro.' },
  yasmin: { modelo3d: 'npc_maga', tinta3d: 0xffe8b0, funcao: 'joalheiro', nome: 'Yasmin', titulo: 'Joalheira Real de Âmbar', visual: { pele: 0xa07050, roupa: 0x8a5a1a, olhos: 0x202020 },
    fala: 'Os sultões pagavam fortunas por uma jóia grandiosa. Para você, faço por um preço quase justo.' },
});
CIDADES.c1.npcs.push('iris'); CIDADES.c2.npcs.push('tamsin'); CIDADES.c3.npcs.push('yasmin');

// posição da joalheira e da bancada (lado oeste da praça)
{
  const cons0 = EST.construirCidade;
  EST.construirCidade = function (mundo, C) {
    const L = cons0(mundo, C);
    L.joalheiro = { x: -13.2, z: 2.6 }; L.bancada = { x: -16, z: 1.6 };
    return L;
  };
  const mont0 = J.montarCidade;
  J.montarCidade = function (C, L) {
    mont0(C, L);
    const b = L.bancada; if (!b) return;
    const mesh = EST.bancadaJoias(b.x, b.z, Math.PI / 2 - 0.15);
    J.mundo.obst.push({ x: b.x, z: b.z, r: 1.3 });
    J.interativos.push({ tipo: 'bancada', x: b.x, z: b.z, mesh, nome: 'Bancada de Lapidação', altura: 1.6, acao: () => UI.abrirJoalheria() });
    const jo = J.npcs.find(n => NPCS[n.id] && NPCS[n.id].funcao === 'joalheiro');
    if (jo) jo.m.raiz.rotation.y = Math.atan2(b.x - jo.x, b.z - jo.z);
  };
  // jóias da vitrine brilham e giram
  const am0 = J.atualizarMundo;
  J.atualizarMundo = function (dt) {
    am0(dt);
    const it = J.interativos && J.interativos.find(i => i.tipo === 'bancada');
    if (it && it.mesh.userData.joias) it.mesh.userData.joias.forEach((j, i) => { j.rotation.y += dt * (0.8 + i * 0.15); j.position.y = j.userData.y0 + Math.sin(J.tempo * 2 + i) * 0.03; });
    if (it && typeof FX !== 'undefined' && Math.random() < 0.06) { const p = new THREE.Vector3(); it.mesh.userData.lente.getWorldPosition(p); FX({ x: p.x + (Math.random() - 0.5) * 0.8, y: p.y, z: p.z + (Math.random() - 0.5) * 0.8, n: 1, tipo: 'brasa', cor: ['#ff5a7a', '#5ab0ff', '#60ff9a', '#ffd040'][Math.floor(Math.random() * 4)], vel: 0.3, vida: 1, tam: 0.08, sobe: 1, grav: -0.5, espalhar: 0.2 }); }
  };
}

// bancada com toalha, vitrine de jóias, lente e lamparina
EST.bancadaJoias = function (x, z, ang) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z), z); g.rotation.y = ang; ENG.scene.add(g);
  const P = { parede: 0xc8bca0, madeira: 0x5a3a22, telhado: 0x5a3a30, pano: 0x5a2a6a };
  const M = EST.matsCidade(P), ob = Obra();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ob.caixa(M.madeira, 0.12, 0.9, 0.12, sx * 1.05, 0.45, sz * 0.45, 0, 0, 0, 1);
  ob.caixa(M.madeira, 2.4, 0.1, 1.15, 0, 0.94, 0, 0, 0, 0, 1);
  ob.caixa(matV(0x4a1e5a, { roughness: 0.95 }), 2.45, 0.04, 1.2, 0, 1.0, 0);
  ob.caixa(matV(0x4a1e5a, { roughness: 0.95 }), 2.45, 0.35, 0.03, 0, 0.84, 0.6);
  // vitrine com tampo de vidro
  ob.caixa(M.madeira, 1.0, 0.12, 0.6, -0.55, 1.08, -0.1, 0, 0, 0, 1);
  ob.caixa(matV(0x201018), 0.9, 0.03, 0.5, -0.55, 1.15, -0.1);
  // lamparina
  ob.add(M.ferro, G('lampBase', () => new THREE.CylinderGeometry(0.1, 0.13, 0.08, 10)), 0.95, 1.06, -0.35);
  ob.add(M.ferro, G('lampHaste', () => new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6)), 0.95, 1.3, -0.35);
  ob.add(M.luz, G('lampLuz', () => new THREE.SphereGeometry(0.09, 10, 8)), 0.95, 1.58, -0.35);
  // ferramentas
  ob.caixa(M.ferro, 0.3, 0.02, 0.03, 0.35, 1.04, 0.25, 0, 0.4, 0); ob.caixa(M.ferro, 0.25, 0.02, 0.03, 0.4, 1.04, 0.32, 0, -0.3, 0);
  ob.fim(g);
  // vidro e jóias expostas
  const vidro = new THREE.Mesh(G('vitrineV', () => new THREE.BoxGeometry(0.92, 0.2, 0.52)), new THREE.MeshStandardMaterial({ color: 0xc8e8ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2 }));
  vidro.position.set(-0.55, 1.24, -0.1); g.add(vidro);
  const cores = ['rubi', 'safira', 'esmeralda', 'topazio', 'ametista', 'diamante'];
  const joias = cores.map((k, i) => {
    const cor = GEMAS[k].cor;
    const j = new THREE.Mesh(G('vitrineJ' + (i % 3), () => [new THREE.OctahedronGeometry(0.05, 0), new THREE.IcosahedronGeometry(0.05, 0), new THREE.DodecahedronGeometry(0.05, 0)][i % 3]),
      new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 1.2, flatShading: true, roughness: 0.1, metalness: 0.3 }));
    j.position.set(-0.85 + (i % 3) * 0.3, 1.21, -0.22 + Math.floor(i / 3) * 0.24); j.userData.y0 = j.position.y; g.add(j); return j;
  });
  // lente de aumento num braço articulado
  const lente = new THREE.Group(); lente.position.set(0.25, 1.35, -0.05); g.add(lente);
  const anel = new THREE.Mesh(G('lenteA', () => new THREE.TorusGeometry(0.13, 0.018, 6, 20)), M.ferro); anel.rotation.x = -1.1; lente.add(anel);
  const disco = new THREE.Mesh(G('lenteD', () => new THREE.CircleGeometry(0.12, 20)), new THREE.MeshStandardMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.35, roughness: 0.02, side: THREE.DoubleSide })); disco.rotation.x = -1.1; lente.add(disco);
  const braco = new THREE.Mesh(G('lenteB', () => new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6)), M.ferro); braco.position.set(0.12, -0.18, 0); braco.rotation.z = 0.6; lente.add(braco);
  // pequena pedra bruta sendo lapidada
  const bruta = new THREE.Mesh(G('bruta', () => new THREE.DodecahedronGeometry(0.06, 0)), new THREE.MeshStandardMaterial({ color: 0xe0203a, emissive: 0x801020, emissiveIntensity: 0.8, flatShading: true }));
  bruta.position.set(0.25, 1.08, -0.05); g.add(bruta);
  const luz = new THREE.PointLight(0xffd0a0, 1.2, 6, 2); luz.position.set(0.95, 1.7, -0.35); g.add(luz);
  g.userData = { joias, lente };
  return g;
};

// ---------------- painel ----------------
{
  const css = `
  #painelJoias { left: 10px; width: min(470px, calc(100vw - 20px)); }
  .jxGrade { display: grid; grid-template-columns: 86px repeat(5, minmax(0, 58px)); gap: 3px; align-items: center; margin-bottom: 10px; }
  .jxCab { font-family: var(--f-titulo); font-size: 11px; color: var(--texto2); text-align: center; }
  .jxNome { font-family: var(--f-titulo); font-size: 13px; }
  .jxCel { position: relative; aspect-ratio: 1; background: radial-gradient(circle at 50% 45%, #241a12, #0c0a08 75%); border: 1px solid #2a2118; display: grid; place-items: center; cursor: default; }
  .jxCel img { width: 82%; height: 82%; filter: drop-shadow(0 2px 2px rgba(0,0,0,.7)); }
  .jxCel.zero img { opacity: .22; filter: grayscale(.8); }
  .jxCel .n { position: absolute; right: 3px; bottom: 1px; font-weight: 800; font-size: 13px; color: #fff; text-shadow: 0 0 3px #000, 0 0 3px #000; font-variant-numeric: tabular-nums; }
  .jxCel.pode { border-color: #8a6a30; cursor: pointer; }
  .jxCel.pode:hover { border-color: #e8c070; box-shadow: inset 0 0 12px rgba(232,192,112,.35); }
  .jxCel.pode::after { content: '▲'; position: absolute; left: 3px; top: 1px; font-size: 10px; color: #ecc451; }
  .jxEnc { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #2a2118; font-size: 13px; }
  .jxEnc img { width: 34px; height: 34px; }
  .jxEnc .gm { display: flex; gap: 2px; margin-left: auto; }
  .jxEnc .gm img { width: 24px; height: 24px; }
  .jxEnc .btn { padding: 3px 10px; font-size: 12px; }
  #jxEncs { max-height: 190px; overflow: auto; }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const d = document.createElement('div'); d.className = 'painel'; d.id = 'painelJoias'; d.hidden = true;
  d.innerHTML = `<h2><span id="jxTitulo">Joalheria</span> <button class="fechar" id="jxFechar" aria-label="Fechar">✕</button></h2>
    <div class="corpo">
      <div class="ouroLinha"><span>Seu ouro</span><b id="jxOuro">0</b></div>
      <div class="dica" style="margin:0 0 8px">Junte <b>3 jóias iguais</b> da mesma qualidade e pague em ouro para criar <b>1 da qualidade seguinte</b>. Clique numa jóia marcada com ▲ para evoluí-la.</div>
      <div class="jxGrade" id="jxGrade"></div>
      <div class="acoesInv"><button class="btn" id="jxTudo">Evoluir tudo que for possível</button></div>
      <h3 style="font-family:var(--f-titulo);color:var(--bronze2);font-size:14px;margin:12px 0 4px">Remover jóias encaixadas (grátis)</h3>
      <div id="jxEncs"></div>
    </div>`;
  document.body.insertBefore(d, document.getElementById('tooltip'));
  document.getElementById('jxFechar').addEventListener('click', () => { d.hidden = true; });
  document.getElementById('jxTudo').addEventListener('click', () => UI.evoluirTodas());
  // o botão antigo de combinar no inventário dá lugar à joalheira
  const bc = document.getElementById('bCombinar'); if (bc) bc.hidden = true;
}

const nomeGema = (g, q) => GEMAS[g].nome + ' ' + QUALIDADES[q].nome;
UI.abrirJoalheria = function (npc) {
  $('#modalNpc').hidden = true; if (J.estado === 'pausa') J.estado = 'jogando';
  for (const id of ['#painelLoja', '#painelForja', '#painelBau', '#painelPers']) { const e = $(id); if (e) e.hidden = true; }
  $('#painelJoias').hidden = false; $('#painelInv').hidden = false;
  const jo = npc || (J.npcs.find(n => NPCS[n.id] && NPCS[n.id].funcao === 'joalheiro') || {}).id;
  $('#jxTitulo').textContent = 'Joalheria' + (jo ? ' de ' + NPCS[jo].nome : '');
  UI.atualizarJoalheria(); UI.atualizarInventario();
};
UI.contarGemas = function () {
  const c = {}; for (const it of J.pers.inv) if (it && it.tipo === 'gema') { const k = it.gema + '_' + it.q; c[k] = (c[k] || 0) + IT.qtd(it); } return c;
};
UI.atualizarJoalheria = function () {
  const el = $('#painelJoias'); if (!el || el.hidden) return;
  const p = J.pers, cont = UI.contarGemas();
  $('#jxOuro').textContent = (p.ouro || 0).toLocaleString('pt-BR');
  let h = '<div></div>' + QUALIDADES.map(q => `<div class="jxCab">${q.nome}</div>`).join('');
  for (const [g, G] of Object.entries(GEMAS)) {
    h += `<div class="jxNome" style="color:${G.cor}">${G.nome}</div>`;
    QUALIDADES.forEach((Q, q) => {
      const n = cont[g + '_' + q] || 0;
      const pode = q < QUALIDADES.length - 1 && n >= 3 && (p.ouro || 0) >= CUSTO_JOIA[q];
      const dica = q < QUALIDADES.length - 1 ? `3× ${nomeGema(g, q)} + ${CUSTO_JOIA[q].toLocaleString('pt-BR')} de ouro → 1× ${nomeGema(g, q + 1)}` : 'Qualidade máxima';
      h += `<div class="jxCel ${n ? '' : 'zero'} ${pode ? 'pode' : ''}" data-g="${g}" data-q="${q}" title="${esc(nomeGema(g, q) + ' — ' + dica)}"><img alt="" src="${ARTE.iconeGema(g, q, 96)}">${n ? `<span class="n">${n}</span>` : ''}</div>`;
    });
  }
  const grade = $('#jxGrade'); grade.innerHTML = h;
  grade.querySelectorAll('.jxCel.pode').forEach(c => c.addEventListener('click', () => UI.evoluirGema(c.dataset.g, +c.dataset.q)));
  grade.querySelectorAll('.jxCel').forEach(c => {
    c.addEventListener('mouseenter', (ev) => { const g = c.dataset.g, q = +c.dataset.q; UI.mostrarTooltip && UI.mostrarTooltip(IT.descreverItem({ tipo: 'gema', gema: g, q, nome: nomeGema(g, q), raridade: 'gema' }) + (q < QUALIDADES.length - 1 ? `<div class="tt-dica">Evoluir: 3 desta + ${CUSTO_JOIA[q].toLocaleString('pt-BR')} de ouro</div>` : ''), c); });
    c.addEventListener('mouseleave', () => UI.esconderTooltip && UI.esconderTooltip());
  });
  // itens com jóias encaixadas
  const lista = [];
  for (const [slot, it] of Object.entries(p.equip)) if (it && it.encaixes && it.encaixes.some(Boolean)) lista.push({ it, onde: 'equip', slot });
  p.inv.forEach((it, i) => { if (it && it.encaixes && it.encaixes.some(Boolean)) lista.push({ it, onde: 'inv', i }); });
  $('#jxEncs').innerHTML = lista.length ? lista.map((l, k) => `<div class="jxEnc"><img alt="" src="${ARTE.iconeItem(l.it, 96)}"><span style="color:${RARIDADES[l.it.raridade].cor}">${esc(l.it.nome)}${l.onde === 'equip' ? ' <i style="color:#8a7a60">(equipado)</i>' : ''}</span><span class="gm">${l.it.encaixes.filter(Boolean).map(g => `<img alt="" title="${esc(nomeGema(g.gema, g.q))}" src="${ARTE.iconeGema(g.gema, g.q, 64)}">`).join('')}</span><button class="btn sec" data-k="${k}">Remover</button></div>`).join('') : '<div class="dica">Nenhum item com jóias encaixadas.</div>';
  $('#jxEncs').querySelectorAll('button[data-k]').forEach(b => b.addEventListener('click', () => { const l = lista[+b.dataset.k]; const livres = p.inv.filter(x => !x).length; const n = l.it.encaixes.filter(Boolean).length; if (livres < n) { UI.aviso('Inventário cheio', '#ff8080'); return; } UI.removerGemas(l.it); UI.atualizarJoalheria(); }));
};
UI.evoluirGema = function (g, q, silencioso) {
  const p = J.pers; if (q >= QUALIDADES.length - 1) return false;
  if (J.contarGema(p.inv, g, q) < 3) { if (!silencioso) UI.aviso('Precisa de 3 jóias iguais', '#ff9090'); return false; }
  if ((p.ouro || 0) < CUSTO_JOIA[q]) { if (!silencioso) UI.aviso('Ouro insuficiente', '#ff9090'); return false; }
  p.ouro -= CUSTO_JOIA[q];
  const ult = J.tirarGema(p.inv, g, q, 3);
  const nova = IT.novaGema(g, q + 1);
  // se a pilha de origem acabou, a nova jóia fica no mesmo lugar
  if (!J.inv_temPilha(p.inv, g, q + 1) && ult >= 0 && !p.inv[ult]) p.inv[ult] = nova; else if (J.guardar(p.inv, nova) < 0) J.soltar(nova, J.jog.x, J.jog.z);
  if (!silencioso) {
    UI.aviso(`${nomeGema(g, q + 1)} criada!`, GEMAS[g].cor);
    if (typeof SOM !== 'undefined') { SOM.tocar('gema', { vol: 0.8 }); SOM.tocar('sino', { vol: 0.35 }); }
    const b = J.interativos.find(i => i.tipo === 'bancada');
    if (b) ENG.particulas.emitir({ x: b.x, y: J.mundo.h(b.x, b.z) + 1.3, z: b.z, n: 30, cor: GEMAS[g].cor, cor2: '#ffffff', vel: 2.5, vida: 0.8, tam: 0.25, sobe: 2 });
    UI.atualizarOuro && UI.atualizarOuro(); UI.atualizarInventario(); UI.atualizarJoalheria(); J.salvar();
  }
  return true;
};
UI.evoluirTodas = function () {
  let n = 0, mudou = true;
  while (mudou) { mudou = false; for (let q = 0; q < QUALIDADES.length - 1; q++) for (const g of Object.keys(GEMAS)) if (UI.evoluirGema(g, q, true)) { n++; mudou = true; } }
  if (n) { UI.aviso(`${n} jóia(s) evoluída(s)`, '#ecc451'); if (typeof SOM !== 'undefined') SOM.tocar('gema', { vol: 0.8 }); } else UI.aviso('Nada para evoluir (3 iguais + ouro)', '#ff9090');
  UI.atualizarOuro && UI.atualizarOuro(); UI.atualizarInventario(); UI.atualizarJoalheria(); J.salvar();
};
// mantém o painel em dia e fecha junto com os demais
{
  const inv0 = UI.atualizarInventario;
  UI.atualizarInventario = function () { inv0.apply(this, arguments); if (!$('#painelJoias').hidden) UI.atualizarJoalheria(); };
  const f0 = UI.fecharTudo;
  UI.fecharTudo = function () { f0(); $('#painelJoias').hidden = true; };
  window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && !$('#painelJoias').hidden) $('#painelJoias').hidden = true; }, true);
  const am1 = J.atualizarMundo;
  J.atualizarMundo = function (dt) { am1(dt); if (!$('#painelJoias').hidden && J.mundo && !J.mundo.cidade) $('#painelJoias').hidden = true; };
}
