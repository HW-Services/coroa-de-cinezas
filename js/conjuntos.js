// ============================================================
//  Itens de conjunto (verdes): peças com nome próprio que dão
//  bônus extras quando várias do mesmo conjunto estão equipadas.
// ============================================================
'use strict';

RARIDADES.conjunto = { nome: 'Conjunto', cor: '#3ed05a', afixos: [0, 0] };

// cada peça: base, nome e atributos (valores no nível do conjunto; crescem com o nível do item)
// bonus: { quantidade de peças: atributos }
const CONJUNTOS = {
  // ---------------- Guerreiro ----------------
  vigilia: { nome: 'Vigília do Porto', classe: 'guerreiro', ilvl: 3, sabor: 'Os guardas do Porto Cinzento nunca dormem.',
    pecas: [
      { base: 'elmo', nome: 'Elmo da Sentinela', stats: { vida: 18, armadura: 12, resFrio: 10 } },
      { base: 'peitoral', nome: 'Couraça da Muralha', stats: { vida: 28, armaduraPct: 20 } },
      { base: 'luvas', nome: 'Manoplas do Quebra-Mar', stats: { forca: 8, danoFlat: 3 } },
      { base: 'escudo', nome: 'Broquel do Farol', stats: { bloqueio: 8, vida: 15 } },
    ],
    bonus: { 2: { vida: 30, armaduraPct: 15 }, 3: { danoFisico: 20, espinhos: 15 }, 4: { redDano: 8, vidaPorGolpe: 3 } } },
  cervo: { nome: 'Fúria do Cervo Ancião', classe: 'guerreiro', ilvl: 18, sabor: 'A floresta corrompida ainda ruge através do aço.',
    pecas: [
      { base: 'machado', nome: 'Chifre Partido', stats: { danoPct: 35, velAtaque: 8 } },
      { base: 'elmo', nome: 'Galhada de Morgrath', stats: { vida: 45, forca: 14 } },
      { base: 'botas', nome: 'Cascos do Bosque', stats: { velMov: 12, resVeneno: 20 } },
      { base: 'cinto', nome: 'Cinturão de Raízes', stats: { vidaPct: 8, regenVida: 4 } },
      { base: 'anel', nome: 'Anel da Seiva Rubra', stats: { roubo: 2, critChance: 3 } },
    ],
    bonus: { 2: { velAtaque: 15 }, 3: { danoPct: 30, vida: 60 }, 4: { roubo: 4, danoElite: 25 }, 5: { ranks: 1, curaAbate: 2 } } },
  tita: { nome: 'Ira do Titã de Cinzas', classe: 'guerreiro', ilvl: 32, sabor: 'Forjada no Trono de Cinzas, ainda quente ao toque.',
    pecas: [
      { base: 'peitoral', nome: 'Peito de Brasa', stats: { vida: 90, resFogo: 25 } },
      { base: 'luvas', nome: 'Punhos do Titã', stats: { danoFlat: 14, velAtaque: 10 } },
      { base: 'botas', nome: 'Passos Sísmicos', stats: { velMov: 15, armadura: 40 } },
      { base: 'cinto', nome: 'Grilhão Derretido', stats: { vidaPct: 10, forca: 20 } },
      { base: 'amuleto', nome: 'Brasão de Vorthak', stats: { danoPct: 25, resTodas: 10 } },
    ],
    bonus: { 2: { resTodas: 15 }, 3: { danoElite: 40, espinhos: 60 }, 4: { redDano: 12, danoFisico: 35 }, 5: { vidaPct: 25, ranks: 1 } } },
  // ---------------- Caçadora ----------------
  raposa: { nome: 'Trilha da Raposa', classe: 'cacadora', ilvl: 3, sabor: 'Leve como folha, rápida como sussurro.',
    pecas: [
      { base: 'botas', nome: 'Botas de Pele de Raposa', stats: { velMov: 8, esquiva: 4 } },
      { base: 'luvas', nome: 'Luvas da Corda Tensa', stats: { velAtaque: 6, destreza: 6 } },
      { base: 'aljava', nome: 'Aljava do Rastreador', stats: { danoFlat: 3, critChance: 3 } },
      { base: 'anel', nome: 'Anel do Olhar Atento', stats: { critChance: 2, achado: 10 } },
    ],
    bonus: { 2: { velMov: 10 }, 3: { critChance: 6, danoCrit: 25 }, 4: { projeteis: 1, esquiva: 6 } } },
  sombra: { nome: 'Sombra do Bosque', classe: 'cacadora', ilvl: 18, sabor: 'Ninguém vê de onde vêm as flechas.',
    pecas: [
      { base: 'arco', nome: 'Arco do Uivo Silencioso', stats: { danoPct: 35, critChance: 4 } },
      { base: 'elmo', nome: 'Capuz de Musgo', stats: { vida: 35, esquiva: 6 } },
      { base: 'peitoral', nome: 'Gibão de Folhas Mortas', stats: { vida: 45, resVeneno: 20 } },
      { base: 'luvas', nome: 'Dedos de Espinho', stats: { velAtaque: 10, danoVeneno: 15 } },
      { base: 'amuleto', nome: 'Presa do Alfa', stats: { danoCrit: 30, destreza: 14 } },
    ],
    bonus: { 2: { esquiva: 8 }, 3: { danoCrit: 50 }, 4: { danoVeneno: 30, danoDot: 25 }, 5: { projeteis: 1, velAtaque: 15 } } },
  deserto: { nome: 'Olhos do Deserto', classe: 'cacadora', ilvl: 32, sabor: 'O sol revela cada presa.',
    pecas: [
      { base: 'elmo', nome: 'Véu do Sol Poente', stats: { vida: 70, critChance: 4 } },
      { base: 'botas', nome: 'Sandálias da Duna', stats: { velMov: 18, esquiva: 6 } },
      { base: 'cinto', nome: 'Faixa do Nômade', stats: { vidaPct: 8, destreza: 20 } },
      { base: 'anel', nome: 'Anel do Escorpião', stats: { danoVeneno: 25, roubo: 2 } },
      { base: 'aljava', nome: 'Aljava das Areias', stats: { danoPct: 30, danoCrit: 30 } },
    ],
    bonus: { 2: { velAtaque: 12 }, 3: { critChance: 10, danoElite: 30 }, 4: { danoCrit: 80 }, 5: { projeteis: 2, ranks: 1 } } },
  // ---------------- Feiticeira ----------------
  mares: { nome: 'Aprendiz das Marés', classe: 'feiticeira', ilvl: 3, sabor: 'O primeiro feitiço é sempre o mais frio.',
    pecas: [
      { base: 'cajado', nome: 'Cajado de Coral', stats: { danoPct: 20, danoFrio: 10 } },
      { base: 'elmo', nome: 'Diadema da Espuma', stats: { vida: 14, recursoMax: 10 } },
      { base: 'peitoral', nome: 'Manto da Maré Baixa', stats: { vida: 22, resFrio: 15 } },
      { base: 'amuleto', nome: 'Concha Sussurrante', stats: { inteligencia: 8, regenRecPct: 15 } },
    ],
    bonus: { 2: { recursoMax: 20 }, 3: { danoFrio: 20, area: 10 }, 4: { regenRecPct: 40, recarga: 8 } } },
  tecela: { nome: 'Tecelã Arcana', classe: 'feiticeira', ilvl: 18, sabor: 'Fios de mana tecidos no escuro das minas.',
    pecas: [
      { base: 'orbe', nome: 'Orbe Ressonante', stats: { danoRaio: 25, recursoMax: 15 } },
      { base: 'luvas', nome: 'Luvas de Teia Cristalina', stats: { velAtaque: 8, inteligencia: 12 } },
      { base: 'botas', nome: 'Passos de Seda', stats: { velMov: 12, esquiva: 4 } },
      { base: 'anel', nome: 'Anel do Fio de Prata', stats: { recarga: 6, critChance: 3 } },
      { base: 'cinto', nome: 'Cinto de Fios Vivos', stats: { vidaPct: 8, regenRecPct: 25 } },
    ],
    bonus: { 2: { recarga: 10 }, 3: { danoRaio: 35, danoPct: 20 }, 4: { area: 15, regenRecPct: 40 }, 5: { ranks: 1, critChance: 8 } } },
  trono: { nome: 'Chama do Trono', classe: 'feiticeira', ilvl: 32, sabor: 'Quem a veste ouve o crepitar de um reino em chamas.',
    pecas: [
      { base: 'cajado', nome: 'Cetro de Cinzas', stats: { danoPct: 45, danoFogo: 25 } },
      { base: 'elmo', nome: 'Coroa de Brasas', stats: { vida: 60, inteligencia: 18 } },
      { base: 'peitoral', nome: 'Vestes do Inferno', stats: { vida: 80, resFogo: 25 } },
      { base: 'amuleto', nome: 'Coração da Caldeira', stats: { danoFogo: 30, danoDot: 20 } },
      { base: 'anel', nome: 'Anel da Fênix', stats: { curaAbate: 2, recursoMax: 20 } },
    ],
    bonus: { 2: { resFogo: 25, resTodas: 8 }, 3: { danoFogo: 40, danoDot: 30 }, 4: { area: 20, recarga: 10 }, 5: { danoPct: 40, ranks: 1 } } },
};

// ------------------------------------------------------------
// Geração
// ------------------------------------------------------------
IT.gerarConjunto = function (ilvl, classe, idConj, idxPeca) {
  let pool = Object.entries(CONJUNTOS).filter(([, c]) => c.ilvl <= ilvl);
  if (!pool.length) return null;
  if (idConj && CONJUNTOS[idConj]) pool = [[idConj, CONJUNTOS[idConj]]];
  else {
    // 70% de chance de vir um conjunto da própria classe (se houver no nível)
    const daClasse = pool.filter(([, c]) => c.classe === classe);
    if (daClasse.length && Math.random() < 0.7) pool = daClasse;
  }
  const [id, C] = pool[Math.floor(Math.random() * pool.length)];
  // peças de arma/escudo só aparecem para a classe certa; as demais servem a todos
  let possiveis = C.pecas.map((p, i) => i).filter(i => { const B = BASES[C.pecas[i].base]; return !B.classe || B.classe === classe; });
  if (!possiveis.length) possiveis = C.pecas.map((p, i) => i);
  const i = idxPeca != null ? idxPeca : possiveis[Math.floor(Math.random() * possiveis.length)];
  const P = C.pecas[i];
  const ilv = Math.max(ilvl, C.ilvl);
  const it = { uid: IT.uid(), tipo: 'equip', base: P.base, slot: BASES[P.base].slot, raridade: 'conjunto', conjunto: id, peca: i, ilvl: ilv, nome: P.nome, sabor: C.sabor, implicito: {}, afixos: [], encaixes: [] };
  it.nomeBase = IT.nomeBase(P.base, ilv);
  it.req = Math.max(1, Math.floor(C.ilvl * 0.85));
  IT.aplicarBase(it);
  const esc = 1 + Math.max(0, ilvl - C.ilvl) * 0.015;
  for (const [k, v] of Object.entries(P.stats)) it.afixos.push({ id: 's_' + k, stat: k, v: (['projeteis', 'ranks'].includes(k)) ? v : arred(k, v * esc * (0.9 + Math.random() * 0.2)), tipo: 'conjunto' });
  if (Math.random() < 0.35) it.encaixes.push(null);
  return it;
};

// bônus de conjunto conforme as peças equipadas (peças diferentes)
IT.contarConjuntos = function (equip) {
  const r = {};
  for (const it of Object.values(equip || {})) if (it && it.conjunto && CONJUNTOS[it.conjunto]) (r[it.conjunto] = r[it.conjunto] || new Set()).add(it.peca);
  const n = {}; for (const [k, s] of Object.entries(r)) n[k] = s.size; return n;
};
IT.bonusConjuntos = function (equip, add) {
  for (const [id, qtd] of Object.entries(IT.contarConjuntos(equip))) {
    for (const [lim, stats] of Object.entries(CONJUNTOS[id].bonus)) if (qtd >= +lim) for (const [k, v] of Object.entries(stats)) add(k, v);
  }
};

// ------------------------------------------------------------
// Descrição no tooltip
// ------------------------------------------------------------
(function () {
  const desc0 = IT.descreverItem;
  IT.descreverItem = function (it) {
    let h = desc0(it);
    if (!it.conjunto || !CONJUNTOS[it.conjunto]) return h;
    const C = CONJUNTOS[it.conjunto];
    const eq = (J.pers && J.pers.equip) || {};
    const tem = new Set(Object.values(eq).filter(x => x && x.conjunto === it.conjunto).map(x => x.peca));
    const qtd = tem.size;
    let s = `<div class="tt-sep"></div><div class="tt-conj" style="color:#3ed05a;font-weight:700">${C.nome} (${qtd}/${C.pecas.length})</div>`;
    for (const [i, P] of C.pecas.entries()) s += `<div class="tt-l" style="color:${tem.has(i) ? '#3ed05a' : '#6a6a5a'}">${tem.has(i) ? '◆' : '◇'} ${P.nome} <span style="opacity:.7">· ${BASES[P.base].tipo}</span></div>`;
    s += '<div class="tt-sep"></div>';
    for (const [lim, stats] of Object.entries(C.bonus)) {
      const ativo = qtd >= +lim;
      s += `<div class="tt-l" style="color:${ativo ? '#7dff8a' : '#6a6a5a'}">(${lim}) ${Object.entries(stats).map(([k, v]) => STAT_NOMES[k] ? STAT_NOMES[k](v) : k).join(' · ')}</div>`;
    }
    // os bônus entram antes do texto de sabor
    const i = h.lastIndexOf('<div class="tt-sep"></div><div class="tt-sabor">');
    return i >= 0 ? h.slice(0, i) + s + h.slice(i) : h + s;
  };
  // inclui as peças no texto do item na tela do baú/inventário também (nome verde já vem de RARIDADES)
})();

// ------------------------------------------------------------
// Onde caem
// ------------------------------------------------------------
(function () {
  const CHANCE = { chefe: 0.22, raro: 0.03, magico: 0.004, normal: 0.0005 };
  const saq0 = J.gerarSaque;
  J.gerarSaque = function (e) {
    saq0(e);
    if (window.COOP && COOP._semRecompensa) return;
    const ch = (CHANCE[e.rar] || 0) * (1 + (J.st.achado || 0) / 200) * (e.invocado ? 0.2 : 1);
    if (Math.random() < ch) { const it = IT.gerarConjunto(J.nivelDrop(J.z.nivel), J.pers.classe); if (it) J.soltar(it, e.x, e.z); }
  };
  if (J.abrirTesouro) {
    const t0 = J.abrirTesouro;
    J.abrirTesouro = function (x, z) {
      const antes = J.interativos.some(i => i.tipo === 'tesouro' && i.x === x && i.z === z);
      t0(x, z);
      const aberto = antes && !J.interativos.some(i => i.tipo === 'tesouro' && i.x === x && i.z === z);
      if (aberto && Math.random() < 0.07) { const it = IT.gerarConjunto(J.nivelDrop(J.z.nivel + 1), J.pers.classe); if (it) J.soltar(it, x, z); }
    };
  }
  const so0 = J.soltar;
  J.soltar = function (item, x, z) {
    const r = so0(item, x, z);
    if (item.raridade === 'conjunto') UI.aviso('Um item de CONJUNTO caiu!', '#3ed05a');
    return r;
  };
})();
