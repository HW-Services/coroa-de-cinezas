// ============================================================
//  Comércio (ouro, mercador) e Forja (aprimorar, raridade,
//  reforjar, encaixes, desmontar)
// ============================================================
'use strict';

const COM = {};
RARIDADES.ouro = { nome: 'Ouro', cor: '#ecc451', afixos: [0, 0] };

const MATERIAIS = {
  sucata: { nome: 'Sucata de Ferro', cor: '#b8b8b8', icone: '⚙' },
  essencia: { nome: 'Essência Arcana', cor: '#8a8aff', icone: '✧' },
  po: { nome: 'Pó Dourado', cor: '#ffe060', icone: '✦' },
  lendario: { nome: 'Fragmento Lendário', cor: '#e08a3a', icone: '❖' },
};

// NPCs de comércio em cada cidade
Object.assign(NPCS, {
  otto: { modelo3d: 'npc_barbaro', tinta3d: 0xe0c8a0, funcao: 'mercador', nome: 'Otto', titulo: 'Mercador do Porto', visual: { pele: 0xd0a080, roupa: 0x6a4a2a, chapeu: true, olhos: 0x202020 },
    fala: 'Tudo tem preço, até o que o mar devolve. Venda o que não usa, compre o que precisa.' },
  hilda: { modelo3d: 'npc_ferreiro', tinta3d: 0xffd0c0, funcao: 'ferreiro', nome: 'Hilda', titulo: 'Ferreira', visual: { pele: 0xd8a888, roupa: 0x3a2a1a, machado: 1.1, olhos: 0x202020 },
    fala: 'Aço bom aguenta o martelo. Traga-me material e eu deixo seu equipamento digno de um rei.' },
  lysa: { modelo3d: 'npc_ladina', tinta3d: 0xf0d8a0, funcao: 'mercador', nome: 'Lysa', titulo: 'Mercadora Itinerante', visual: { pele: 0xd8b090, roupa: 0x5a3a20, capuz: true, olhos: 0x202020 },
    fala: 'Atravessei a floresta inteira com esta carroça. Espero que valha a pena.' },
  brann: { modelo3d: 'npc_ferreiro', tinta3d: 0xd8e0c8, funcao: 'ferreiro', nome: 'Brann', titulo: 'Ferreiro da Paliçada', visual: { pele: 0xb08060, roupa: 0x2a2a1a, machado: 1.1, olhos: 0x202020 },
    fala: 'A forja nunca apaga. Nem quando os lobos uivam.' },
  kasim: { modelo3d: 'npc_nobre', tinta3d: 0xffd8a0, funcao: 'mercador', nome: 'Kasim', titulo: 'Mercador de Âmbar', visual: { pele: 0x9a6a48, roupa: 0x8a3a1a, chapeu: true, olhos: 0x202020 },
    fala: 'Sedas, aço, jóias... e uma ou outra relíquia que é melhor não perguntar de onde veio.' },
});
NPCS.duran.funcao = 'ferreiro';
CIDADES.c1.npcs.push('otto', 'hilda');
CIDADES.c2.npcs.push('lysa', 'brann');
CIDADES.c3.npcs.push('kasim');

// ------------------------------------------------------------
// Ouro e preços
// ------------------------------------------------------------
const MULT_RAR = { normal: 1, magico: 3, raro: 8, unico: 20 };
COM.precoVenda = function (it) {
  if (it.tipo === 'gema') return 12 * Math.pow(it.q + 1, 2);
  return Math.round((5 + it.ilvl * 1.6) * (MULT_RAR[it.raridade] || 1) * (1 + 0.25 * (it.aprim || 0)) * (1 + 0.1 * it.encaixes.length));
};
COM.precoCompra = (it) => COM.precoVenda(it) * 4;
COM.ouro = (n) => { J.pers.ouro = Math.max(0, (J.pers.ouro || 0) + n); UI.atualizarOuro && UI.atualizarOuro(); };

// ouro dos monstros
{
  const saque0 = J.gerarSaque;
  J.gerarSaque = function (e) {
    saque0(e);
    const ch = e.rar === 'chefe' ? 1 : e.rar === 'raro' ? 1 : e.rar === 'magico' ? 0.6 : 0.3;
    const pilhas = e.rar === 'chefe' ? 4 : 1;
    for (let k = 0; k < pilhas; k++) if (Math.random() < ch * (e.invocado ? 0.3 : 1)) {
      const mult = e.rar === 'chefe' ? 12 : e.rar === 'raro' ? 5 : e.rar === 'magico' ? 2 : 1;
      const q = Math.max(1, Math.round((2 + e.nivel * 1.3) * (0.6 + Math.random() * 0.8) * mult * (1 + J.st.achado / 200)));
      J.soltar({ uid: IT.uid(), tipo: 'ouro', quantia: q, nome: q + ' Ouro', raridade: 'ouro' }, e.x, e.z);
    }
  };
  const pegar0 = J.pegar;
  J.pegar = function (d) {
    if (d.item.tipo === 'ouro') {
      COM.ouro(d.item.quantia);
      J.texto(J.jog.x, J.jog.y + 2.4, J.jog.z, '+' + d.item.quantia + ' ouro', '#ecc451', 13, 0.8);
      ENG.scene.remove(d.mesh); d.me.material.dispose(); J.drops.splice(J.drops.indexOf(d), 1);
      return true;
    }
    return pegar0(d);
  };
  const atual0 = J.atualizar;
  J.atualizar = function (dt) {
    atual0(dt);
    if (J.estado !== 'jogando' || !J.jog) return;
    for (let i = J.drops.length - 1; i >= 0; i--) { const d = J.drops[i]; if (d.item.tipo === 'ouro' && d.t > 0.5 && Math.hypot(d.x - J.jog.x, d.z - J.jog.z) < 2.2) J.pegar(d); }
  };
  const mig0 = J.migrarSave;
  J.migrarSave = function (p) { mig0(p); if (!p) return; p.ouro = p.ouro || 0; p.mat = p.mat || { sucata: 0, essencia: 0, po: 0, lendario: 0 }; p.recompra = p.recompra || []; p.estoques = p.estoques || {}; };
}

// ------------------------------------------------------------
// Mercador
// ------------------------------------------------------------
COM.gerarEstoque = function (cid) {
  const C = CIDADES[cid]; const p = J.pers;
  const nivel = Math.min(p.nivel + 1, Math.max(C.nivel, Math.min(p.nivel, C.nivel + 12)));
  const itens = [];
  for (let i = 0; i < 14; i++) itens.push(IT.gerar(nivel, { classe: p.classe, raridade: RNG.chance(0.12) ? 'raro' : RNG.chance(0.55) ? 'magico' : 'normal' }));
  for (let i = 0; i < 3; i++) itens.push(IT.gerarGema(nivel));
  // armas da classe sempre presentes
  itens.unshift(IT.gerar(nivel, { classe: p.classe, base: CLASSES[p.classe].arma, raridade: 'magico' }));
  p.estoques[cid] = itens;
};
COM.vender = function (onde, i) {
  const p = J.pers; const lista = onde === 'inv' ? p.inv : null; if (!lista) return;
  const it = lista[i]; if (!it) return;
  const v = COM.precoVenda(it);
  lista[i] = null; COM.ouro(v);
  p.recompra.unshift(it); if (p.recompra.length > 12) p.recompra.pop();
  UI.aviso(`${it.nome} vendido por ${v} ouro`, '#ecc451');
  UI.esconderTooltip(); UI.atualizarInventario(); UI.atualizarLoja(); J.salvar();
};
COM.venderTodos = function (rar) {
  const p = J.pers; let total = 0, n = 0;
  p.inv.forEach((it, i) => { if (it && it.tipo === 'equip' && it.raridade === rar) { total += COM.precoVenda(it); p.recompra.unshift(it); p.inv[i] = null; n++; } });
  p.recompra = p.recompra.slice(0, 12);
  if (n) { COM.ouro(total); UI.aviso(`${n} itens vendidos por ${total} ouro`, '#ecc451'); } else UI.aviso('Nenhum item desse tipo no inventário', '#ff9080');
  UI.atualizarInventario(); UI.atualizarLoja(); J.salvar();
};
COM.comprar = function (lista, i, preco) {
  const p = J.pers; const it = lista[i]; if (!it) return;
  if ((p.ouro || 0) < preco) { UI.aviso('Ouro insuficiente', '#ff9080'); return; }
  const k = p.inv.indexOf(null); if (k < 0) { UI.aviso('Inventário cheio', '#ff9080'); return; }
  COM.ouro(-preco); p.inv[k] = it; lista.splice(i, 1);
  UI.aviso(`${it.nome} comprado`, '#ecc451');
  UI.esconderTooltip(); UI.atualizarInventario(); UI.atualizarLoja(); J.salvar();
};

// ------------------------------------------------------------
// Forja
// ------------------------------------------------------------
COM.sel = null; // { onde: 'inv'|'equip', i|slot }
COM.itemSel = function () {
  const s = COM.sel; if (!s) return null;
  const it = s.onde === 'inv' ? J.pers.inv[s.i] : J.pers.equip[s.slot];
  if (!it || it.tipo !== 'equip') { COM.sel = null; return null; }
  return it;
};
COM.tem = (custo) => { const p = J.pers; if ((p.ouro || 0) < (custo.ouro || 0)) return false; for (const k of Object.keys(MATERIAIS)) if ((p.mat[k] || 0) < (custo[k] || 0)) return false; return true; };
COM.pagar = (custo) => { const p = J.pers; COM.ouro(-(custo.ouro || 0)); for (const k of Object.keys(MATERIAIS)) p.mat[k] -= (custo[k] || 0); };
COM.textoCusto = (c) => [c.ouro ? `<span style="color:#ecc451">${c.ouro} ouro</span>` : '', ...Object.keys(MATERIAIS).filter(k => c[k]).map(k => `<span style="color:${MATERIAIS[k].cor}">${c[k]} ${MATERIAIS[k].icone}</span>`)].filter(Boolean).join(' · ');
COM.base = (it) => Math.round(10 + it.ilvl * 4);

COM.acoes = function (it) {
  const B = COM.base(it); const ap = it.aprim || 0;
  const maxEnc = IT.grupoDoSlot(it.slot) === 'joia' ? 1 : 2;
  const lista = [];
  lista.push({ id: 'aprimorar', nome: ap >= 5 ? 'Aprimoramento máximo' : `Aprimorar para +${ap + 1}`, desc: '+8% em todos os atributos do item a cada nível (até +5).',
    custo: { ouro: B * (ap + 1) * 2, sucata: ap < 2 ? 3 : 0, essencia: ap >= 2 && ap < 4 ? 2 : 0, po: ap >= 4 ? 2 : 0 }, ok: ap < 5 });
  if (it.raridade === 'normal') lista.push({ id: 'raridade', nome: 'Imbuir: tornar Mágico', desc: 'Adiciona 1 ou 2 afixos aleatórios.', custo: { ouro: B * 3, essencia: 2 }, ok: true });
  if (it.raridade === 'magico') lista.push({ id: 'raridade', nome: 'Imbuir: tornar Raro', desc: 'Adiciona afixos até chegar a quatro e dá um novo nome.', custo: { ouro: B * 6, po: 2 }, ok: true });
  if (it.raridade !== 'unico' && it.afixos.length) lista.push({ id: 'rerrolar', nome: 'Rerrolar valores', desc: 'Sorteia de novo os valores de todos os afixos.', custo: { ouro: B * 3, essencia: 3 }, ok: true });
  lista.push({ id: 'encaixe', nome: it.encaixes.length >= maxEnc ? 'Encaixes no máximo' : 'Abrir encaixe', desc: `Adiciona um encaixe para jóia (máximo ${maxEnc}).`, custo: { ouro: B * 5, po: 2, lendario: it.encaixes.length ? 1 : 0 }, ok: it.encaixes.length < maxEnc });
  return lista;
};
COM.novoAfixo = function (it, tipo, excluir) {
  const slotChave = it.slot === 'offhand' ? 'offhand' : it.slot;
  const usados = new Set(it.afixos.map(a => a.stat).concat(excluir || []));
  const pool = AFIXOS.filter(a => a.slots.includes(slotChave) && !usados.has(a.stat) && (!tipo || a.tipo === tipo));
  if (!pool.length) return null;
  const a = RNG.pick(pool); const [mn, mx] = a.f(it.ilvl);
  return { id: a.id, stat: a.stat, v: arred(a.stat, mn + Math.random() * (mx - mn)), tipo: a.tipo };
};
COM.renomear = function (it) {
  if (it.raridade === 'magico') {
    const p = it.afixos.find(a => a.tipo === 'pre'), s = it.afixos.find(a => a.tipo === 'suf');
    const pd = p && AFIXOS.find(x => x.id === p.id), sd = s && AFIXOS.find(x => x.id === s.id);
    it.nome = (pd ? pd.adj + ' ' : '') + it.nomeBase + (sd ? ' ' + sd.nome : '');
  } else if (it.raridade === 'raro') it.nome = RNG.pick(NOMES_RAROS_A) + ' ' + RNG.pick(NOMES_RAROS_B);
};
COM.executar = function (acao, extra) {
  const it = COM.itemSel(); if (!it) return;
  const a = COM.acoes(it).find(x => x.id === acao);
  let custo = a ? a.custo : null;
  if (acao === 'reforjar') custo = { ouro: COM.base(it) * 2, essencia: it.raridade === 'raro' ? 0 : 1, po: it.raridade === 'raro' ? 1 : 0 };
  if (!custo || (a && !a.ok)) return;
  if (!COM.tem(custo)) { UI.aviso('Faltam ouro ou materiais', '#ff9080'); return; }
  COM.pagar(custo);
  let msg = '';
  switch (acao) {
    case 'aprimorar': it.aprim = (it.aprim || 0) + 1; msg = `${it.nome} aprimorado para +${it.aprim}`; break;
    case 'raridade':
      if (it.raridade === 'normal') { it.raridade = 'magico'; const n = RNG.chance(0.5) ? 2 : 1; const t = RNG.chance(0.5) ? 'pre' : 'suf'; const a1 = COM.novoAfixo(it, t); if (a1) it.afixos.push(a1); if (n === 2) { const a2 = COM.novoAfixo(it, t === 'pre' ? 'suf' : 'pre'); if (a2) it.afixos.push(a2); } }
      else { it.raridade = 'raro'; let guarda = 0; while (it.afixos.length < 4 && guarda++ < 20) { const np = it.afixos.filter(x => x.tipo === 'pre').length; const af = COM.novoAfixo(it, np < 2 ? (RNG.chance(0.5) ? 'pre' : 'suf') : 'suf'); if (af) it.afixos.push(af); } }
      COM.renomear(it); msg = `Agora é ${RARIDADES[it.raridade].nome}: ${it.nome}`; break;
    case 'rerrolar':
      for (const af of it.afixos) { const d = AFIXOS.find(x => x.id === af.id); if (!d) continue; const [mn, mx] = d.f(it.ilvl); af.v = arred(af.stat, mn + Math.random() * (mx - mn)); }
      msg = 'Valores rerrolados'; break;
    case 'encaixe': it.encaixes.push(null); msg = 'Novo encaixe aberto'; break;
    case 'reforjar': {
      const velho = it.afixos[extra]; if (!velho) return;
      const novo = COM.novoAfixo(it, velho.tipo, [velho.stat]);
      if (novo) { it.afixos[extra] = novo; msg = `${STAT_NOMES[velho.stat](velho.v)} → ${STAT_NOMES[novo.stat](novo.v)}`; }
      if (it.raridade === 'magico') COM.renomear(it);
      break;
    }
  }
  COM.efeitoForja();
  UI.aviso(msg, '#ffd78a');
  J.recalc(); UI.atualizarInventario(); UI.atualizarForja(); UI.atualizarPersonagemSeAberto && UI.atualizarPersonagemSeAberto(); J.salvar();
};
COM.desmontar = function (onde, ref) {
  const p = J.pers; const it = onde === 'inv' ? p.inv[ref] : p.equip[ref]; if (!it || it.tipo !== 'equip') return null;
  const ganho = { normal: { sucata: RNG.int(1, 2) }, magico: { sucata: 1, essencia: RNG.int(1, 2) }, raro: { essencia: 2, po: RNG.int(1, 2) }, unico: { po: 2, lendario: 1 } }[it.raridade];
  if (it.aprim) ganho.sucata = (ganho.sucata || 0) + it.aprim;
  for (const [k, v] of Object.entries(ganho)) p.mat[k] = (p.mat[k] || 0) + v;
  // jóias encaixadas voltam para o inventário (ou caem no chão)
  for (const g of it.encaixes) if (g) { const gem = { uid: IT.uid(), tipo: 'gema', gema: g.gema, q: g.q, nome: GEMAS[g.gema].nome + ' ' + QUALIDADES[g.q].nome, raridade: 'gema' }; const k = p.inv.indexOf(null); if (k >= 0 && !(onde === 'inv' && k === ref)) p.inv[k] = gem; else J.soltar(gem, J.jog.x, J.jog.z); }
  if (onde === 'inv') p.inv[ref] = null; else delete p.equip[ref];
  return ganho;
};
COM.desmontarSel = function () {
  const s = COM.sel; if (!s || !COM.itemSel()) return;
  const ganho = COM.desmontar(s.onde, s.onde === 'inv' ? s.i : s.slot);
  COM.sel = null; COM.efeitoForja();
  if (ganho) UI.aviso('Desmontado: ' + Object.entries(ganho).map(([k, v]) => `${v} ${MATERIAIS[k].nome}`).join(', '), '#d8d0c0');
  J.recalc(); UI.atualizarInventario(); UI.atualizarForja(); J.salvar();
};
COM.desmontarTodos = function (rar) {
  const p = J.pers; let n = 0; const tot = {};
  p.inv.forEach((it, i) => { if (it && it.tipo === 'equip' && it.raridade === rar) { const g = COM.desmontar('inv', i); n++; for (const [k, v] of Object.entries(g)) tot[k] = (tot[k] || 0) + v; } });
  if (COM.sel && COM.sel.onde === 'inv' && !p.inv[COM.sel.i]) COM.sel = null;
  if (n) { UI.aviso(`${n} itens desmontados: ` + Object.entries(tot).map(([k, v]) => `${v} ${MATERIAIS[k].icone}`).join(' '), '#d8d0c0'); COM.efeitoForja(); } else UI.aviso('Nenhum item desse tipo no inventário', '#ff9080');
  UI.atualizarInventario(); UI.atualizarForja(); J.salvar();
};
// faíscas na bigorna
COM.efeitoForja = function () {
  const f = J.interativos.find(i => i.tipo === 'forja'); if (!f || typeof FX === 'undefined') return;
  const y = J.mundo.h(f.x, f.z) + 1.1;
  FX({ x: f.x, y, z: f.z, n: 40, tipo: 'faisca', estica: 2.5, cor: '#fff0c0', corFim: '#ff6010', vel: 7, vida: 0.6, tam: 0.22, grav: 12, sobe: 1.5 });
  FX({ x: f.x, y, z: f.z, n: 1, tipo: 'estrela', cor: '#ffd080', vel: 0, vida: 0.15, tam: 1.6, brilho: 2 });
  ENG.luz(new THREE.Vector3(f.x, y + 0.5, f.z), '#ffa040', 4, 0.3, 10);
};

// ------------------------------------------------------------
// Bigorna e fornalha na cidade
// ------------------------------------------------------------
EST.forja = function (x, z, ang = 0) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z), z); g.rotation.y = ang;
  const ferro = matE(0x3a3a40, { metalness: 0.85, roughness: 0.35 }), pm = pedraMat(), mad = matE(0x5a3a1e, { map: GFX.tex.rochaA });
  // bigorna
  malha(gB(), mad, g, 0, 0.35, 0, 0.7, 0.7, 0.7);
  malha(gB(), ferro, g, 0, 0.82, 0, 1.1, 0.26, 0.42); malha(gB(), ferro, g, 0, 0.7, 0, 0.5, 0.2, 0.3);
  malha(G('chifreBig', () => new THREE.ConeGeometry(0.16, 0.5, 8)), ferro, g, 0.75, 0.82, 0, 1, 1, 1).rotation.z = Math.PI / 2;
  malha(gB(), ferro, g, -0.3, 1.02, 0.05, 0.45, 0.07, 0.07).rotation.y = 0.4;
  // fornalha
  const forno = new THREE.Group(); forno.position.set(-1.6, 0, -1.2); g.add(forno);
  malha(gB(), pm, forno, 0, 0.8, 0, 1.6, 1.6, 1.4);
  malha(G('chamineForja', () => new THREE.CylinderGeometry(0.35, 0.5, 2.4, 8)), pm, forno, 0, 2.6, -0.2);
  const brasa = malha(gB(), new THREE.MeshStandardMaterial({ color: 0xff5010, emissive: 0xff5010, emissiveIntensity: 3 }), forno, 0, 0.75, 0.66, 0.9, 0.55, 0.06, false);
  g.userData = { brasa, forno };
  ENG.scene.add(g); return g;
};
{
  const cons0 = EST.construirCidade;
  EST.construirCidade = function (mundo, C) {
    const L = cons0(mundo, C);
    L.ferreiro = { x: 13, z: -6 }; L.forja = { x: 15.5, z: -8.5 }; L.mercador = { x: -13.5, z: -7.5 };
    return L;
  };
  const mont0 = J.montarCidade;
  J.montarCidade = function (C, L) {
    // NPCs com função ficam em lugares próprios
    const fixos = C.npcs.filter(id => NPCS[id].funcao);
    const C2 = Object.assign({}, C, { npcs: C.npcs.filter(id => !NPCS[id].funcao) });
    mont0(C2, L);
    const m = J.mundo;
    for (const id of fixos) {
      const N = NPCS[id]; const pos = N.funcao === 'ferreiro' ? L.ferreiro : L.mercador;
      const mm = (N.modelo3d && MOD.criar3D(N.modelo3d, 1.0, N.tinta3d)) || MOD.criar('humanoide', N.visual, 1.0);
      mm.raiz.position.set(pos.x, m.h(pos.x, pos.z), pos.z); ENG.scene.add(mm.raiz);
      m.obst.push({ x: pos.x, z: pos.z, r: 0.6 });
      const it = { tipo: 'npc', id, x: pos.x, z: pos.z, m: mm, nome: N.nome, altura: 2.3, ang: Math.random() * 6.28, t: Math.random() * 10, acao: () => UI.abrirNpc(id) };
      J.interativos.push(it); J.npcs.push(it);
    }
    // bigorna
    const f = L.forja; const mesh = EST.forja(f.x, f.z, -0.6);
    m.obst.push({ x: f.x, z: f.z, r: 1.0 }, { x: f.x - 1.6, z: f.z - 1.2, r: 1.2 });
    J.interativos.push({ tipo: 'forja', x: f.x, z: f.z, mesh, nome: 'Forja', altura: 1.8, acao: () => UI.abrirForja() });
    // estoque renovado a cada visita
    if (J._renovarEstoque || !J.pers.estoques[C.id]) COM.gerarEstoque(C.id);
  };
  const ent0 = J.entrarDef;
  J.entrarDef = function (def, chegada, opcoes) {
    const anterior = J.z && J.z.def.id;
    J._renovarEstoque = !!def.cidade && anterior !== def.id;
    ent0(def, chegada, opcoes);
    J._renovarEstoque = false;
  };
  // fornalha e martelo vivos
  const am0 = J.atualizarMundo;
  J.atualizarMundo = function (dt) {
    am0(dt);
    const f = J.interativos.find(i => i.tipo === 'forja');
    if (f && typeof FX !== 'undefined') {
      const u = f.mesh.userData; u.brasa.material.emissiveIntensity = 2.6 + Math.sin(J.tempo * 7) * 0.5 + Math.random() * 0.3;
      const wp = new THREE.Vector3(); u.forno.getWorldPosition(wp);
      if (Math.random() < 0.5) FX({ x: wp.x, y: wp.y + 3.8, z: wp.z, n: 1, tipo: 'brasa', cor: '#ffa040', vel: 0.6, vida: 1.4, tam: 0.12, sobe: 2, grav: -1.2, espalhar: 0.4 });
      if (Math.random() < 0.25) FM({ x: wp.x, y: wp.y + 4, z: wp.z, n: 1, cor: '#3a3430', vel: 0.4, vida: 2.5, tam: 0.8, tamFim: 2.4, sobe: 1.5, grav: -0.5, alfa: 0.5 });
      // o ferreiro martela de vez em quando
      const fe = J.npcs.find(n => NPCS[n.id].funcao === 'ferreiro');
      if (fe && Math.hypot(J.jog.x - fe.x, J.jog.z - fe.z) > 5) {
        fe.martelo = (fe.martelo || 0) - dt;
        if (fe.martelo <= 0) { fe.martelo = 2.4 + Math.random(); fe.golpeT = 0; }
        if (fe.golpeT != null) { fe.golpeT += dt; if (fe.golpeT > 0.35 && !fe.bateu) { fe.bateu = true; FX({ x: f.x, y: J.mundo.h(f.x, f.z) + 1.0, z: f.z, n: 14, tipo: 'faisca', estica: 2.5, cor: '#fff0c0', corFim: '#ff6010', vel: 5, vida: 0.4, tam: 0.18, grav: 12, sobe: 1.4 }); } if (fe.golpeT > 0.7) { fe.golpeT = null; fe.bateu = false; } }
        fe.m.raiz.rotation.y = Math.atan2(f.x - fe.x, f.z - fe.z);
      }
    }
  };
  // animação do martelo usando o estado de ataque
  const anim0 = MOD.animar;
  MOD.animar = function (m, s) {
    const fe = J.npcs && J.npcs.find(n => n.m === m && n.golpeT != null);
    if (fe) s = Object.assign({}, s, { atq: Math.min(0.99, fe.golpeT / 0.7), tipoAtq: 'golpe' });
    return anim0(m, s);
  };
}

// ------------------------------------------------------------
// Interface: Mercador e Forja
// ------------------------------------------------------------
(function () {
  const css = `
  #painelLoja, #painelForja { left: 10px; }
  .abasLoja { display: flex; gap: 4px; margin-bottom: 8px; }
  .abasLoja button { flex: 1; padding: 7px; background: var(--painel2); border: 1px solid var(--borda); color: var(--texto2); cursor: pointer; font-family: var(--f-titulo); border-radius: 3px; }
  .abasLoja button.on { color: var(--bronze2); border-color: var(--bronze); }
  .precoCel { position: absolute; bottom: 1px; left: 0; right: 0; text-align: center; font-size: 10px; font-weight: 700; color: #ecc451; text-shadow: 0 0 3px #000; font-variant-numeric: tabular-nums; }
  .ouroLinha { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #120e0a; border: 1px solid var(--borda); border-radius: 3px; margin-bottom: 10px; font-family: var(--f-titulo); }
  .ouroLinha b { color: #ecc451; font-size: 17px; font-variant-numeric: tabular-nums; }
  .mats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 10px; margin-bottom: 10px; font-size: 13px; }
  .mats span b { font-variant-numeric: tabular-nums; }
  .bigorna { border: 1px dashed var(--borda); border-radius: 4px; padding: 10px; min-height: 90px; margin-bottom: 10px; background: radial-gradient(#2a1a10, #120c08); }
  .bigorna .vazia { color: var(--texto2); font-size: 13px; text-align: center; padding: 22px 6px; }
  .acaoForja { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid #2a2118; }
  .acaoForja .t { font-family: var(--f-titulo); color: var(--bronze2); font-size: 14px; }
  .acaoForja .d { font-size: 12px; color: var(--texto2); grid-column: 1; }
  .acaoForja .c { font-size: 12px; grid-column: 1; }
  .acaoForja .btn { grid-row: 1 / span 3; grid-column: 2; padding: 6px 12px; }
  .btn:disabled { opacity: .4; cursor: not-allowed; filter: none; }
  .afReforja { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; padding: 4px 0; color: #9a9aff; }
  .afReforja .btn { padding: 3px 8px; font-size: 11px; }
  #ouroHud { font-size: 11px; color: #ecc451; text-align: center; font-variant-numeric: tabular-nums; }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const html = `
  <div class="painel" id="painelLoja" hidden>
    <h2><span id="lojaTitulo">Mercador</span> <button class="fechar" data-fecharc="loja" aria-label="Fechar">✕</button></h2>
    <div class="corpo">
      <div class="ouroLinha"><span>Seu ouro</span><b id="lojaOuro">0</b></div>
      <div class="abasLoja"><button data-aba="comprar" class="on">Comprar</button><button data-aba="recompra">Recomprar</button></div>
      <div id="gradeLoja" class="gradeItens"></div>
      <div class="acoesInv"><button class="btn sec" id="bVendeNormais">Vender todos os Normais</button><button class="btn sec" id="bVendeMagicos">Vender todos os Mágicos</button></div>
      <div class="dica">Clique direito num item do inventário para vender. Clique direito num item da loja para comprar. O estoque muda a cada vez que você volta à cidade.</div>
    </div>
  </div>
  <div class="painel" id="painelForja" hidden>
    <h2><span id="forjaTitulo">Forja</span> <button class="fechar" data-fecharc="forja" aria-label="Fechar">✕</button></h2>
    <div class="corpo">
      <div class="ouroLinha"><span>Seu ouro</span><b id="forjaOuro">0</b></div>
      <div class="mats" id="forjaMats"></div>
      <div class="bigorna" id="bigorna"></div>
      <div id="forjaAcoes"></div>
      <div class="acoesInv"><button class="btn sec" id="bDesmNormais">Desmontar todos os Normais</button><button class="btn sec" id="bDesmMagicos">Desmontar todos os Mágicos</button></div>
      <div class="dica">Clique num item do inventário ou equipado para colocá-lo na bigorna. Desmontar gera materiais; as jóias encaixadas voltam para você.</div>
    </div>
  </div>`;
  const d = document.createElement('div'); d.innerHTML = html; while (d.firstElementChild) document.body.insertBefore(d.firstElementChild, document.getElementById('tooltip'));
  document.querySelectorAll('[data-fecharc]').forEach(b => b.addEventListener('click', () => { document.getElementById(b.dataset.fecharc === 'loja' ? 'painelLoja' : 'painelForja').hidden = true; }));
  document.querySelectorAll('.abasLoja button').forEach(b => b.addEventListener('click', () => { UI.abaLoja = b.dataset.aba; UI.atualizarLoja(); }));
  document.getElementById('bVendeNormais').addEventListener('click', () => COM.venderTodos('normal'));
  document.getElementById('bVendeMagicos').addEventListener('click', () => COM.venderTodos('magico'));
  document.getElementById('bDesmNormais').addEventListener('click', () => COM.desmontarTodos('normal'));
  document.getElementById('bDesmMagicos').addEventListener('click', () => COM.desmontarTodos('magico'));
  // ouro no HUD
  const xp = document.getElementById('xpTxt'); if (xp) { const o = document.createElement('div'); o.id = 'ouroHud'; xp.after(o); }
})();

UI.abaLoja = 'comprar';
UI.atualizarOuro = function () {
  const o = (J.pers && J.pers.ouro || 0).toLocaleString('pt-BR');
  for (const id of ['lojaOuro', 'forjaOuro', 'invOuro']) { const e = document.getElementById(id); if (e) e.textContent = o; }
  const h = document.getElementById('ouroHud'); if (h) h.textContent = o + ' ouro';
};
UI.abrirLoja = function (npc) {
  UI.lojaNpc = npc;
  $('#modalNpc').hidden = true; if (J.estado === 'pausa') J.estado = 'jogando';
  $('#painelForja').hidden = true; $('#painelBau').hidden = true; $('#painelPers').hidden = true;
  $('#painelLoja').hidden = false; $('#painelInv').hidden = false;
  $('#lojaTitulo').textContent = NPCS[npc].nome + ' — Mercador';
  UI.atualizarLoja(); UI.atualizarInventario();
};
UI.atualizarLoja = function () {
  if ($('#painelLoja').hidden) return;
  UI.atualizarOuro();
  document.querySelectorAll('.abasLoja button').forEach(b => b.classList.toggle('on', b.dataset.aba === UI.abaLoja));
  const cid = J.z && J.z.def.cidade ? J.z.def.id : J.pers.ultimaCidade;
  const lista = UI.abaLoja === 'comprar' ? (J.pers.estoques[cid] || []) : J.pers.recompra;
  const g = $('#gradeLoja'); g.innerHTML = '';
  for (let i = 0; i < Math.max(24, lista.length); i++) {
    const it = lista[i]; const d = UI.celula(it, 'cel');
    if (it) {
      const preco = UI.abaLoja === 'comprar' ? COM.precoCompra(it) : COM.precoVenda(it);
      d.insertAdjacentHTML('beforeend', `<div class="precoCel" style="${preco > (J.pers.ouro || 0) ? 'color:#c06050' : ''}">${preco}</div>`);
      d.addEventListener('contextmenu', (ev) => { ev.preventDefault(); COM.comprar(lista, i, preco); });
      d.addEventListener('mouseenter', () => { let comp = null; if (it.tipo === 'equip') { const sl = it.slot === 'anel' ? 'anel1' : it.slot; const e = J.pers.equip[sl]; if (e) comp = '<div class="tag">Equipado</div>' + IT.descreverItem(e); } UI.mostrarTooltip(`<div class="tag">Preço: ${preco} ouro</div>` + IT.descreverItem(it), d, comp); });
      d.addEventListener('mouseleave', UI.esconderTooltip);
    }
    g.appendChild(d);
  }
};
UI.abrirForja = function (npc) {
  $('#modalNpc').hidden = true; if (J.estado === 'pausa') J.estado = 'jogando';
  $('#painelLoja').hidden = true; $('#painelBau').hidden = true; $('#painelPers').hidden = true;
  $('#painelForja').hidden = false; $('#painelInv').hidden = false;
  $('#forjaTitulo').textContent = 'Forja' + (npc ? ' de ' + NPCS[npc].nome : '');
  UI.atualizarForja(); UI.atualizarInventario();
};
UI.atualizarForja = function () {
  if ($('#painelForja').hidden) return;
  UI.atualizarOuro();
  const p = J.pers;
  $('#forjaMats').innerHTML = Object.entries(MATERIAIS).map(([k, m]) => `<span style="color:${m.cor}">${m.icone} ${m.nome}: <b>${p.mat[k] || 0}</b></span>`).join('');
  const it = COM.itemSel();
  const big = $('#bigorna'), ac = $('#forjaAcoes'); ac.innerHTML = '';
  if (!it) { big.innerHTML = '<div class="vazia">Bigorna vazia. Clique num item do inventário ou equipado.</div>'; return; }
  big.innerHTML = `<div class="tt" style="width:auto;border:none;background:none;box-shadow:none;padding:0">${IT.descreverItem(it)}</div>`;
  for (const a of COM.acoes(it)) {
    const r = document.createElement('div'); r.className = 'acaoForja';
    r.innerHTML = `<div class="t">${a.nome}</div><div class="d">${a.desc}</div><div class="c">${a.ok ? COM.textoCusto(a.custo) : ''}</div>`;
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Forjar'; b.disabled = !a.ok || !COM.tem(a.custo);
    b.addEventListener('click', () => COM.executar(a.id)); r.appendChild(b); ac.appendChild(r);
  }
  if (it.raridade !== 'unico' && it.afixos.length) {
    const custo = { ouro: COM.base(it) * 2, essencia: it.raridade === 'raro' ? 0 : 1, po: it.raridade === 'raro' ? 1 : 0 };
    const box = document.createElement('div'); box.className = 'acaoForja'; box.style.display = 'block';
    box.innerHTML = `<div class="t">Reforjar um afixo</div><div class="d">Troca um afixo por outro do mesmo tipo. Custo: ${COM.textoCusto(custo)}</div>`;
    it.afixos.forEach((af, i) => {
      const l = document.createElement('div'); l.className = 'afReforja';
      l.innerHTML = `<span>${STAT_NOMES[af.stat](IT.valAfixo(it, af))}</span>`;
      const b = document.createElement('button'); b.className = 'btn sec'; b.textContent = 'Reforjar'; b.disabled = !COM.tem(custo);
      b.addEventListener('click', () => COM.executar('reforjar', i)); l.appendChild(b); box.appendChild(l);
    });
    ac.appendChild(box);
  }
  const des = document.createElement('div'); des.className = 'acaoForja';
  des.innerHTML = `<div class="t">Desmontar</div><div class="d">Destrói o item e devolve materiais.</div><div class="c"></div>`;
  const b = document.createElement('button'); b.className = 'btn sec'; b.textContent = 'Desmontar'; b.addEventListener('click', COM.desmontarSel); des.appendChild(b); ac.appendChild(des);
};

// integra com inventário, diálogo dos NPCs e teclas
{
  const inv0 = UI.atualizarInventario;
  UI.atualizarInventario = function () {
    inv0();
    UI.atualizarOuro();
    const lojaAberta = !$('#painelLoja').hidden, forjaAberta = !$('#painelForja').hidden;
    if (!lojaAberta && !forjaAberta) return;
    // intercepta cliques nas células do inventário e do equipamento
    const cels = $('#grade').children;
    for (let i = 0; i < cels.length; i++) {
      const c = cels[i];
      if (lojaAberta) c.addEventListener('contextmenu', (ev) => { if (ev.shiftKey || !J.pers.inv[i]) return; ev.stopImmediatePropagation(); ev.preventDefault(); COM.vender('inv', i); }, true);
      if (forjaAberta) c.addEventListener('click', (ev) => { const it = J.pers.inv[i]; if (!it || it.tipo !== 'equip' || UI.gemaSel != null) return; ev.stopImmediatePropagation(); COM.sel = { onde: 'inv', i }; UI.atualizarForja(); UI.atualizarInventario(); }, true);
      if (forjaAberta && COM.sel && COM.sel.onde === 'inv' && COM.sel.i === i) c.classList.add('selec');
    }
    if (forjaAberta) {
      const eqs = $('#bonecoEquip').children; const slots = Object.keys(ROT_EQUIP);
      for (let k = 0; k < eqs.length; k++) {
        const slot = slots[k];
        eqs[k].addEventListener('click', (ev) => { if (!J.pers.equip[slot] || UI.gemaSel != null) return; ev.stopImmediatePropagation(); COM.sel = { onde: 'equip', slot }; UI.atualizarForja(); UI.atualizarInventario(); }, true);
        if (COM.sel && COM.sel.onde === 'equip' && COM.sel.slot === slot) eqs[k].classList.add('selec');
      }
    }
  };
  const npc0 = UI.abrirNpc;
  UI.abrirNpc = function (id) {
    npc0(id);
    const f = NPCS[id].funcao; if (!f) return;
    const box = $('#npcCorpo');
    const c = document.createElement('div'); c.style.cssText = 'display:flex;gap:8px;margin:0 0 14px';
    const b = document.createElement('button'); b.className = 'btn grande';
    b.textContent = f === 'mercador' ? 'Negociar' : 'Abrir a Forja';
    b.addEventListener('click', () => f === 'mercador' ? UI.abrirLoja(id) : UI.abrirForja(id));
    c.appendChild(b);
    box.insertBefore(c, box.children[1] || null);
  };
  const fechar0 = UI.fecharTudo;
  UI.fecharTudo = function () { fechar0(); $('#painelLoja').hidden = true; $('#painelForja').hidden = true; };
  window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && (!$('#painelLoja').hidden || !$('#painelForja').hidden)) { $('#painelLoja').hidden = true; $('#painelForja').hidden = true; } }, true);
  // sair de perto do mercador/forja fecha os painéis
  const am1 = J.atualizarMundo;
  J.atualizarMundo = function (dt) {
    am1(dt);
    if ((!$('#painelLoja').hidden || !$('#painelForja').hidden) && J.mundo && !J.mundo.cidade) { $('#painelLoja').hidden = true; $('#painelForja').hidden = true; }
  };
}
