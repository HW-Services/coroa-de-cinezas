// ============================================================
//  Itens, atributos e árvore de habilidades
// ============================================================
'use strict';

const IT = {};
let _uid = Date.now() % 100000;
IT.uid = () => ++_uid;

IT.nomeBase = function (baseId, ilvl) {
  const b = BASES[baseId]; let n = b.nomes[0][1];
  for (const [l, nm] of b.nomes) if (ilvl >= l) n = nm;
  return n;
};
IT.slotDoItem = (it) => it.slot; // 'anel' vale para anel1/anel2

IT.rolarRaridade = function (bonus = 0, minimo = null) {
  const b = 1 + bonus / 100;
  const r = Math.random();
  let rar;
  if (r < 0.012 * b) rar = 'unico';
  else if (r < 0.012 * b + 0.10 * b) rar = 'raro';
  else if (r < 0.012 * b + 0.10 * b + 0.32 * Math.sqrt(b)) rar = 'magico';
  else rar = 'normal';
  const ordem = ['normal', 'magico', 'raro', 'unico'];
  if (minimo && ordem.indexOf(rar) < ordem.indexOf(minimo)) rar = minimo;
  return rar;
};

const PESOS_BASE = [['arma', 13], ['offhand', 7], ['elmo', 10], ['peitoral', 10], ['luvas', 10], ['botas', 10], ['cinto', 8], ['amuleto', 6], ['anel', 11]];
IT.escolherBase = function (classe) {
  let tot = 0; for (const [, w] of PESOS_BASE) tot += w;
  let r = Math.random() * tot, slot = 'arma';
  for (const [s, w] of PESOS_BASE) { r -= w; if (r <= 0) { slot = s; break; } }
  if (slot === 'arma') { const daClasse = CLASSES[classe].arma; return RNG.chance(0.75) ? daClasse : RNG.pick(['machado', 'arco', 'cajado']); }
  if (slot === 'offhand') { const m = { guerreiro: 'escudo', cacadora: 'aljava', feiticeira: 'orbe' }; return RNG.chance(0.75) ? m[classe] : RNG.pick(['escudo', 'aljava', 'orbe']); }
  return slot;
};

function arred(stat, v) { return ['roubo', 'regenVidaPct', 'redDano'].includes(stat) ? Math.round(v * 10) / 10 : Math.round(v); }

IT.gerar = function (ilvl, o = {}) {
  const classe = o.classe || 'guerreiro';
  let raridade = o.raridade || IT.rolarRaridade(o.bonus || 0, o.minimo);
  if (raridade === 'unico') {
    const pool = UNICOS.filter(u => u.ilvl <= ilvl);
    if (pool.length) return IT.gerarUnico(RNG.pick(pool), ilvl);
    raridade = 'raro';
  }
  const baseId = o.base || IT.escolherBase(classe);
  const B = BASES[baseId];
  const it = { uid: IT.uid(), tipo: 'equip', base: baseId, slot: B.slot, raridade, ilvl, nomeBase: IT.nomeBase(baseId, ilvl), implicito: {}, afixos: [], encaixes: [] };
  it.req = Math.max(1, Math.floor(ilvl * 0.85));
  IT.aplicarBase(it);
  const [amin, amax] = RARIDADES[raridade].afixos;
  const n = amin + Math.floor(Math.random() * (amax - amin + 1));
  const slotChave = B.slot === 'offhand' ? 'offhand' : B.slot;
  const pool = AFIXOS.filter(a => a.slots.includes(slotChave));
  let pre = 0, suf = 0; const maxPS = raridade === 'magico' ? 1 : 3;
  const usados = new Set();
  RNG.shuffle(pool.slice()).forEach(a => {
    if (it.afixos.length >= n) return;
    if (usados.has(a.stat)) return;
    if (a.tipo === 'pre' && pre >= maxPS) return; if (a.tipo === 'suf' && suf >= maxPS) return;
    const [mn, mx] = a.f(ilvl); const v = arred(a.stat, mn + Math.random() * (mx - mn));
    it.afixos.push({ id: a.id, stat: a.stat, v, tipo: a.tipo }); usados.add(a.stat);
    a.tipo === 'pre' ? pre++ : suf++;
  });
  // encaixes
  const maxE = SLOTS[B.slot === 'anel' ? 'anel1' : B.slot].grupo === 'joia' ? 1 : 2;
  let e = 0;
  if (raridade === 'normal') e = RNG.chance(0.18) ? 1 : 0;
  else if (raridade === 'magico') e = RNG.chance(0.3) ? 1 : 0;
  else e = RNG.chance(0.25) ? 2 : RNG.chance(0.45) ? 1 : 0;
  e = Math.min(e, maxE);
  for (let i = 0; i < e; i++) it.encaixes.push(null);
  // nome
  if (raridade === 'magico') {
    const p = it.afixos.find(a => a.tipo === 'pre'), s = it.afixos.find(a => a.tipo === 'suf');
    const pd = p && AFIXOS.find(x => x.id === p.id), sd = s && AFIXOS.find(x => x.id === s.id);
    it.nome = (pd ? pd.adj + ' ' : '') + it.nomeBase + (sd ? ' ' + sd.nome : '');
  } else if (raridade === 'raro') it.nome = RNG.pick(NOMES_RAROS_A) + ' ' + RNG.pick(NOMES_RAROS_B);
  else it.nome = it.nomeBase;
  return it;
};

IT.aplicarBase = function (it) {
  const B = BASES[it.base]; const il = it.ilvl;
  if (B.slot === 'arma') {
    const base = 4 + il * 1.35 + Math.pow(il, 1.25) * 0.12;
    const var_ = 0.9 + Math.random() * 0.2;
    it.dano = [Math.round(base * 0.72 * var_), Math.round(base * 1.28 * var_)];
    it.vel = B.vel;
  }
  if (B.arm) it.armadura = Math.round((6 + il * 2.4) * B.arm * (0.85 + Math.random() * 0.3));
  if (B.implicito) {
    for (const [k, v] of Object.entries(B.implicito)) {
      let val = v;
      if (k === 'vida') val = v + il * 0.6; else if (k === 'resTodas') val = v + il * 0.1; else if (k === 'atributos') val = v + il * 0.2;
      else if (k === 'danoPct') val = v + il * 0.15; else if (k === 'recursoMax') val = v + il * 0.3;
      it.implicito[k] = Math.round(val);
    }
  }
};

IT.gerarUnico = function (u, ilvl) {
  const it = { uid: IT.uid(), tipo: 'equip', base: u.base, slot: BASES[u.base].slot, raridade: 'unico', ilvl: Math.max(ilvl, u.ilvl), nome: u.nome, sabor: u.sabor, implicito: {}, afixos: [], encaixes: [] };
  it.nomeBase = IT.nomeBase(u.base, it.ilvl);
  it.req = Math.max(1, Math.floor(u.ilvl * 0.85));
  IT.aplicarBase(it);
  const esc = 1 + Math.max(0, ilvl - u.ilvl) * 0.012;
  for (const [k, v] of Object.entries(u.stats)) it.afixos.push({ id: 'u_' + k, stat: k, v: (['projeteis', 'ranks', 'lacaios'].includes(k) || v < 0) ? v : arred(k, v * esc * (0.9 + Math.random() * 0.2)), tipo: 'unico' });
  const maxE = SLOTS[it.slot === 'anel' ? 'anel1' : it.slot].grupo === 'joia' ? 1 : 2;
  const e = Math.min(maxE, RNG.chance(0.5) ? 1 : 0); for (let i = 0; i < e; i++) it.encaixes.push(null);
  return it;
};

IT.gerarGema = function (ilvl, q = null) {
  if (q === null) { q = 0; for (let i = 0; i < QUALIDADES.length; i++) if (ilvl >= QUALIDADES[i].ilvl && RNG.chance(i === 0 ? 1 : 0.55)) q = i; }
  const g = RNG.pick(Object.keys(GEMAS));
  return { uid: IT.uid(), tipo: 'gema', gema: g, q, nome: GEMAS[g].nome + ' ' + QUALIDADES[q].nome, raridade: 'gema' };
};
IT.efeitoGema = function (gema, q, grupo) {
  const [stat, v] = GEMAS[gema][grupo];
  const val = v * QUALIDADES[q].mult;
  return [stat, Math.round(val * 10) / 10];
};
IT.grupoDoSlot = (slot) => (slot === 'anel' ? 'joia' : SLOTS[slot] ? SLOTS[slot].grupo : 'armadura');

IT.multAprim = (it) => 1 + 0.08 * (it.aprim || 0);
IT.valAfixo = (it, a) => { const v = a.v * (a.v > 0 ? IT.multAprim(it) : 1); return ['roubo', 'regenVidaPct', 'redDano'].includes(a.stat) || Math.abs(v) < 10 && !Number.isInteger(a.v) ? Math.round(v * 10) / 10 : Math.round(v); };
IT.statsDoItem = function (it) {
  const s = {};
  const add = (k, v) => { s[k] = (s[k] || 0) + v; };
  for (const [k, v] of Object.entries(it.implicito || {})) add(k, IT.valAfixo(it, { stat: k, v }));
  for (const a of it.afixos) add(a.stat, IT.valAfixo(it, a));
  if (it.armadura) add('armadura', Math.round(it.armadura * IT.multAprim(it)));
  const grupo = IT.grupoDoSlot(it.slot);
  for (const g of it.encaixes) if (g) { const [k, v] = IT.efeitoGema(g.gema, g.q, grupo); add(k, v); }
  return s;
};

// ------------------------------------------------------------
// Atributos do personagem
// ------------------------------------------------------------
IT.calcStats = function (pers, buffs = [], mapaMods = []) {
  const C = CLASSES[pers.classe];
  const s = {};
  const add = (k, v) => { s[k] = (s[k] || 0) + v; };
  const L = pers.nivel;
  add('forca', C.base.forca + C.porNivel.forca * (L - 1));
  add('destreza', C.base.destreza + C.porNivel.destreza * (L - 1));
  add('inteligencia', C.base.inteligencia + C.porNivel.inteligencia * (L - 1));
  let vidaBase = C.base.vida + C.porNivel.vida * (L - 1);
  // itens
  let arma = null;
  const regItens = { regenVida: 0, regenVidaPct: 0, regenRecPct: 0 };   // regeneração vem só dos itens
  for (const [slot, it] of Object.entries(pers.equip)) {
    if (!it) continue;
    if (slot === 'arma') arma = it;
    if (it.base && BASES[it.base].classe && BASES[it.base].classe !== pers.classe && BASES[it.base].slot === 'arma') continue;
    for (const [k, v] of Object.entries(IT.statsDoItem(it))) { add(k, v); if (k in regItens) regItens[k] += v; }
  }
  // bônus de conjunto (contam como item)
  if (IT.bonusConjuntos) IT.bonusConjuntos(pers.equip, (k, v) => { add(k, v); if (k in regItens) regItens[k] += v; });
  // árvore
  for (const p of PASSIVAS) { const r = pers.arvore[p.id] || 0; if (r) for (const [k, v] of Object.entries(p.stats)) add(k, v * r); }
  if (pers.arvore.chave) { const ch = CHAVES[pers.classe].find(c => c.id === pers.arvore.chave); if (ch) for (const [k, v] of Object.entries(ch.stats)) add(k, v); }
  if (pers.asc) for (const n of ASCENDENCIAS[pers.asc].nos) if (pers.ascNos[n.id]) for (const [k, v] of Object.entries(n.stats)) add(k, v);
  // buffs
  for (const b of buffs) for (const [k, v] of Object.entries(b.stats)) if (typeof v === 'number') add(k, v);
  if (s.atributos) { add('forca', s.atributos); add('destreza', s.atributos); add('inteligencia', s.atributos); }
  const g = k => s[k] || 0;
  const r = {};
  r.forca = Math.round(g('forca')); r.destreza = Math.round(g('destreza')); r.inteligencia = Math.round(g('inteligencia'));
  r.vidaMax = Math.round((vidaBase + r.forca * 0.8 + g('vida')) * (1 + g('vidaPct') / 100));
  r.recMax = Math.round(C.recurso.max + g('recursoMax') + (pers.classe === 'feiticeira' ? r.inteligencia * 0.3 : 0));
  r.armadura = Math.round((g('armadura') + r.forca * 0.6 + 5) * Math.max(0.1, 1 + g('armaduraPct') / 100));
  const principal = r[C.atributo];
  r.danoPct = g('danoPct') + principal * 0.25;
  r.danoElem = { fisico: g('danoFisico'), fogo: g('danoFogo'), frio: g('danoFrio'), raio: g('danoRaio'), veneno: g('danoVeneno') };
  r.danoDot = g('danoDot'); r.danoElite = g('danoElite'); r.danoBasico = g('danoBasico');
  const armaValida = arma && (!BASES[arma.base].classe || BASES[arma.base].classe === pers.classe);
  const mA = armaValida ? IT.multAprim(arma) : 1;
  const dMin = (armaValida ? arma.dano[0] * mA : 3) + g('danoFlat') * 0.8, dMax = (armaValida ? arma.dano[1] * mA : 5) + g('danoFlat') * 1.2;
  r.dano = [Math.round(dMin), Math.round(dMax)];
  r.velAtaque = (armaValida ? arma.vel : 1) * Math.max(0.3, 1 + g('velAtaque') / 100);
  r.critChance = Math.min(85, 5 + g('critChance') + r.destreza * 0.03);
  r.danoCrit = 50 + g('danoCrit');
  const penal = pers.penalRes || 0;
  const res = k => Math.min(75, g(k) + g('resTodas') - penal);
  r.res = { fisico: 0, fogo: res('resFogo'), frio: res('resFrio'), raio: res('resRaio'), veneno: res('resVeneno') };
  r.velMov = 7.2 * Math.max(0.5, 1 + g('velMov') / 100);
  // sem regeneração base: só itens geram regeneração; árvore e bênçãos a ampliam
  const extraVidaPct = g('regenVidaPct') - regItens.regenVidaPct;   // bênçãos temporárias (ex.: Avatar da Fênix)
  r.regenVida = (regItens.regenVida + r.vidaMax * regItens.regenVidaPct / 100) * (1 + g('regenVidaMais') / 100) + r.vidaMax * extraVidaPct / 100;
  r.regenRec = C.recurso.regen * (regItens.regenRecPct / 100) * (1 + (g('regenRecPct') - regItens.regenRecPct) / 100);
  r.recarga = Math.min(60, g('recarga'));
  r.area = 1 + g('area') / 100;
  r.projeteis = g('projeteis');
  r.bloqueio = Math.min(60, g('bloqueio')); r.esquiva = Math.min(50, g('esquiva'));
  r.roubo = Math.min(20, g('roubo')); r.vidaPorGolpe = g('vidaPorGolpe');
  r.redDano = Math.min(60, g('redDano')); r.espinhos = g('espinhos');
  r.ranks = g('ranks'); r.efPocao = g('efPocao'); r.curaAbate = g('curaAbate');
  r.lacaios = g('lacaios'); r.lacaioVida = g('lacaioVida'); r.lacaioDano = g('lacaioDano');
  r.achado = g('achado');
  r.dps = Math.round((r.dano[0] + r.dano[1]) / 2 * (1 + r.danoPct / 100) * r.velAtaque * (1 + r.critChance / 100 * r.danoCrit / 100));
  return r;
};

// ------------------------------------------------------------
// Árvore de habilidades (estilo Diablo IV)
// ------------------------------------------------------------
IT.habsDaClasse = function (classe) { return Object.entries(HABILIDADES).filter(([, h]) => h.classe === classe && !h.asc).map(([id]) => id); };
IT.habsDaAsc = function (asc) { return Object.entries(HABILIDADES).filter(([, h]) => h.asc === asc).map(([id]) => id); };
IT.secIdx = function (chave) {
  if (chave === 'chave') return 5;
  const base = chave.split('#')[0];
  if (HABILIDADES[base]) { const h = HABILIDADES[base]; return h.asc ? 1 : SECOES.findIndex(s => s.id === h.secao); }
  const p = PASSIVAS.find(x => x.id === base); if (p) return SECOES.findIndex(s => s.id === p.secao);
  return 0;
};
IT.custoNo = function (arv, chave) {
  const v = arv[chave]; if (!v) return 0;
  if (chave === 'chave') return 1;
  if (chave.endsWith('#mod') || chave.endsWith('#apr')) return 1;
  return v;
};
IT.pontosGastos = function (pers) { let t = 0; for (const k of Object.keys(pers.arvore)) t += IT.custoNo(pers.arvore, k); return t; };
IT.pontosTotais = function (pers) { return pers.nivel + (pers.pontosExtras || 0); };
IT.pontosLivres = function (pers) { return IT.pontosTotais(pers) - IT.pontosGastos(pers); };
IT.ascPontosTotais = function (pers) { const l = pers.nivel; return l >= 40 ? 4 : l >= 25 ? 3 : l >= 10 ? 2 : 0; };
IT.ascPontosLivres = function (pers) { return IT.ascPontosTotais(pers) - Object.keys(pers.ascNos).length; };
IT.pontosAntes = function (arv, idx) { let t = 0; for (const k of Object.keys(arv)) if (IT.secIdx(k) < idx) t += IT.custoNo(arv, k); return t; };
IT.maxRank = function (id) { const h = HABILIDADES[id]; return h && h.unico ? 1 : 5; };

IT.valida = function (pers, arv) {
  for (const k of Object.keys(arv)) {
    if (!arv[k]) continue;
    const idx = IT.secIdx(k);
    const req = HABILIDADES[k.split('#')[0]] && HABILIDADES[k.split('#')[0]].asc ? 0 : SECOES[idx].req;
    if (IT.pontosAntes(arv, idx) < req) return false;
    if (k.endsWith('#apr') && !arv[k.replace('#apr', '')]) return false;
    if (k.endsWith('#mod') && !arv[k.replace('#mod', '#apr')]) return false;
  }
  return true;
};

IT.podeAlocar = function (pers, chave, valor = null) {
  if (IT.pontosLivres(pers) <= 0) return [false, 'Sem pontos de habilidade disponíveis'];
  const arv = pers.arvore;
  const base = chave.split('#')[0];
  const h = HABILIDADES[base];
  if (h) {
    if (h.asc && pers.asc !== h.asc) return [false, 'Requer a ascendência ' + ASCENDENCIAS[h.asc].nome];
    if (pers.nivel < h.nivel) return [false, 'Requer nível ' + h.nivel];
    if (chave === base && (arv[base] || 0) >= IT.maxRank(base)) return [false, 'Rank máximo'];
    if (chave.endsWith('#apr') && (!arv[base] || arv[chave])) return [false, arv[chave] ? 'Já aprimorado' : 'Aprenda a habilidade primeiro'];
    if (chave.endsWith('#mod') && (!arv[base + '#apr'] || arv[chave])) return [false, arv[chave] ? 'Modificador já escolhido' : 'Requer o aprimoramento'];
    if (!h.asc && h.unico && chave === base) {
      // apenas um supremo
      for (const id of IT.habsDaClasse(pers.classe)) if (id !== base && HABILIDADES[id].unico && arv[id]) return [false, 'Apenas uma habilidade suprema'];
    }
  }
  const p = PASSIVAS.find(x => x.id === chave);
  if (p && (arv[chave] || 0) >= p.max) return [false, 'Rank máximo'];
  if (chave === 'chave' && arv.chave) return [false, 'Já escolhida'];
  const idx = IT.secIdx(chave);
  const req = h && h.asc ? 0 : SECOES[idx].req;
  if (IT.pontosAntes(arv, idx) < req) return [false, `Requer ${req} pontos em seções anteriores`];
  return [true, ''];
};
IT.alocar = function (pers, chave, valor = null) {
  const [ok, msg] = IT.podeAlocar(pers, chave, valor); if (!ok) return msg;
  const arv = pers.arvore;
  if (chave.endsWith('#mod') || chave === 'chave') arv[chave] = valor;
  else arv[chave] = (arv[chave] || 0) + 1;
  // auto colocar na barra
  const base = chave.split('#')[0];
  if (HABILIDADES[base] && chave === base && arv[base] === 1 && !pers.barra.includes(base)) {
    const i = pers.barra.indexOf(null); if (i >= 0) pers.barra[i] = base;
  }
  return null;
};
IT.desalocar = function (pers, chave) {
  const arv = pers.arvore; if (!arv[chave]) return 'Nada para remover';
  const novo = Object.assign({}, arv);
  if (chave.endsWith('#mod') || chave === 'chave' || chave.endsWith('#apr')) delete novo[chave];
  else { novo[chave]--; if (!novo[chave]) delete novo[chave]; }
  // remover dependentes se rank zerou
  const base = chave.split('#')[0];
  if (HABILIDADES[base] && !novo[base] && (novo[base + '#apr'] || novo[base + '#mod'])) return 'Remova primeiro o aprimoramento/modificador';
  if (chave.endsWith('#apr') && novo[base + '#mod']) return 'Remova primeiro o modificador';
  if (!IT.valida(pers, novo)) return 'Outras escolhas dependem destes pontos';
  pers.arvore = novo;
  if (HABILIDADES[base] && !novo[base]) pers.barra = pers.barra.map(b => b === base ? null : b);
  return null;
};

IT.rankHab = function (pers, id, stats) { const r = pers.arvore[id] || 0; return r ? r + (stats ? stats.ranks : 0) : 0; };

IT.habEfetiva = function (pers, id, stats) {
  const h = HABILIDADES[id];
  const s = Object.assign({ id, raioMul: 1, cd: h.cd || 0, custo: h.custo || 0, gera: h.gera || 0, qtd: h.qtd || 1, pulsos: h.pulsos || 1, cadeias: h.cadeias || 0, golpes: h.golpes || 1, dur: 1, vamp: 0, crit: 0, spreadMul: 1, raioHitMul: 1, buffDano: 0, maxLacaios: h.maxLacaios || 0 }, h);
  s.cd = h.cd || 0; s.custo = h.custo || 0; s.qtd = h.qtd || 1; s.pulsos = h.pulsos || 1; s.cadeias = h.cadeias || 0; s.golpes = h.golpes || 1; s.gera = h.gera || 0; s.maxLacaios = h.maxLacaios || 0;
  const efs = [];
  if (pers.arvore[id + '#apr']) efs.push(h.apr.ef);
  const m = pers.arvore[id + '#mod']; if (m) efs.push(h.mods[m - 1].ef);
  for (const ef of efs) for (const [k, v] of Object.entries(ef)) {
    if (k === 'raio') s.raioMul *= v;
    else if (k === 'cd') s.cd = v === 0 ? 0 : s.cd * v;
    else if (['mult', 'dur', 'custo', 'spreadMul', 'raioHitMul'].includes(k)) s[k] = (k === 'custo' ? s.custo : (s[k] ?? 1)) * v;
    else if (['qtd', 'pulsos', 'cadeias', 'gera', 'crit', 'golpes', 'maxLacaios', 'vamp', 'buffDano'].includes(k)) s[k] = (s[k] || 0) + v;
    else if (k === 'queimar' || k === 'lentidao' || k === 'executar' || k === 'explode') s[k] = Math.max(s[k] || 0, v);
    else s[k] = v;
  }
  if (s.multAbs) s.mult = s.multAbs;
  const rank = IT.rankHab(pers, id, stats);
  s.rank = rank;
  s.multRank = 1 + 0.15 * Math.max(0, rank - 1);
  if (stats) {
    if (['projetil'].includes(s.tipo) && stats.projeteis) s.qtd += stats.projeteis;
    s.cdFinal = s.cd * (1 - stats.recarga / 100);
    s.maxLacaios += stats.lacaios;
  } else s.cdFinal = s.cd;
  return s;
};

IT.descreverItem = function (it) {
  // retorna HTML do tooltip
  if (it.tipo === 'gema') {
    const G = GEMAS[it.gema];
    const linhas = ['arma', 'armadura', 'joia'].map(gr => { const [k, v] = IT.efeitoGema(it.gema, it.q, gr); return `<div class="tt-gl"><b>${gr === 'arma' ? 'Arma' : gr === 'armadura' ? 'Armadura' : 'Joalheria'}:</b> ${STAT_NOMES[k](v)}</div>`; }).join('');
    return `<div class="tt-nome" style="color:${G.cor}">${it.nome}</div><div class="tt-tipo">Jóia</div><div class="tt-sep"></div>${linhas}<div class="tt-dica">Clique com o botão direito e depois em um item com encaixe livre para encaixar. Junte 3 iguais para melhorar.</div>`;
  }
  const R = RARIDADES[it.raridade];
  const B = BASES[it.base];
  let h = `<div class="tt-nome" style="color:${R.cor}">${it.aprim ? '+' + it.aprim + ' ' : ''}${it.nome}</div>`;
  const mA = IT.multAprim(it);
  if (it.raridade === 'raro' || it.raridade === 'unico' || it.raridade === 'conjunto' || it.raridade === 'magico' && it.nome !== it.nomeBase) h += `<div class="tt-base" style="color:${R.cor}">${it.raridade === 'magico' ? '' : it.nomeBase}</div>`;
  h += `<div class="tt-tipo">${R.nome} · ${B.tipo}${B.classe ? ' · ' + CLASSES[B.classe].nome : ''}</div><div class="tt-sep"></div>`;
  if (it.dano) h += `<div class="tt-l">Dano: <b>${Math.round(it.dano[0] * mA)}–${Math.round(it.dano[1] * mA)}</b></div><div class="tt-l">Ataques por segundo: <b>${it.vel.toFixed(2)}</b></div>`;
  if (it.armadura) h += `<div class="tt-l">Armadura: <b>${Math.round(it.armadura * mA)}</b></div>`;
  if (it.aprim) h += `<div class="tt-l" style="color:#ffd78a">Aprimorado +${it.aprim} (+${it.aprim * 8}% nos atributos)</div>`;
  h += `<div class="tt-l tt-req">Nível de item ${it.ilvl} · Requer nível ${it.req}</div>`;
  const imp = Object.entries(it.implicito || {});
  if (imp.length) { h += '<div class="tt-sep"></div>'; for (const [k, v] of imp) h += `<div class="tt-imp">${STAT_NOMES[k](IT.valAfixo(it, { stat: k, v }))}</div>`; }
  if (it.afixos.length) { h += '<div class="tt-sep"></div>'; for (const a of it.afixos) h += `<div class="tt-af ${a.v < 0 ? 'neg' : ''}">${STAT_NOMES[a.stat](IT.valAfixo(it, a))}</div>`; }
  if (typeof COM !== 'undefined') h += `<div class="tt-l tt-req" style="margin-top:4px">Valor de venda: <b style="color:#e8c040">${COM.precoVenda(it)} ouro</b></div>`;
  if (it.encaixes.length) {
    h += '<div class="tt-sep"></div>';
    const grupo = IT.grupoDoSlot(it.slot);
    for (const g of it.encaixes) {
      if (!g) h += `<div class="tt-enc"><span class="enc-v"></span> Encaixe vazio</div>`;
      else { const [k, v] = IT.efeitoGema(g.gema, g.q, grupo); h += `<div class="tt-enc"><span class="enc-c" style="background:${GEMAS[g.gema].cor}"></span> ${STAT_NOMES[k](v)}</div>`; }
    }
  }
  if (it.sabor) h += `<div class="tt-sep"></div><div class="tt-sabor">${it.sabor}</div>`;
  return h;
};
