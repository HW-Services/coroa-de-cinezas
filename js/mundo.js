// ============================================================
//  Áreas, transições, cidades, NPCs, missões e portal
// ============================================================
'use strict';

J.interativos = []; J.portoes = []; J.npcs = [];
J.estadoGuardado = null; J.chegadaT = 0;

// ------------------------------------------------------------
// Save: campos novos
// ------------------------------------------------------------
J.migrarSave = function (p) {
  if (!p) return;
  p.waypoints = p.waypoints || [];
  p.missoes = p.missoes || {};
  p.bau = p.bau || new Array(40).fill(null);
  p.chefesMortos = p.chefesMortos || [];
  p.cidades = p.cidades || [];
  p.pontosExtras = p.pontosExtras || 0;
  p.zonas = p.zonas || ['z1'];
  // saves antigos: liberar cidades dos atos já alcançados
  for (const z of p.zonas) { const d = TODAS_AREAS[z]; if (d && !d.cidade && d.ato > 1 && !p.cidades.includes('c' + d.ato)) { p.cidades.push('c' + d.ato); p.waypoints.push('c' + d.ato); } }
  if (p.zonas.includes('z2') && !p.cidades.includes('c1')) { p.cidades.push('c1'); p.waypoints.push('c1'); }
};
{
  const novo = J.novoPersonagem; J.novoPersonagem = function (c, n) { const p = novo(c, n); J.migrarSave(p); return p; };
  const carregar = J.carregarSave; J.carregarSave = function () { const ok = carregar(); if (ok) J.migrarSave(J.pers); return ok; };
}

// ------------------------------------------------------------
// Limpeza e guarda de áreas
// ------------------------------------------------------------
J.removerInterativos = function (lista, descartar) {
  for (const it of lista) {
    if (it.mesh) ENG.scene.remove(it.mesh);
    if (it.m) { ENG.scene.remove(it.m.raiz); if (descartar) MOD.descartar(it.m); }
  }
};
J.limparArea = function () {
  for (const e of J.inimigos) { ENG.scene.remove(e.m.raiz); MOD.descartar(e.m); }
  for (const p of J.projeteis) ENG.scene.remove(p.mesh);
  for (const a of J.areas) { ENG.removerMalha(a.tel); if (a.met) ENG.scene.remove(a.met); }
  for (const d of J.drops) ENG.scene.remove(d.mesh);
  for (const l of J.lacaios) { ENG.scene.remove(l.m.raiz); MOD.descartar(l.m); }
  J.removerInterativos(J.interativos, true);
  for (const g of J.portoes) ENG.scene.remove(g.mesh);
  J.inimigos = []; J.projeteis = []; J.areas = []; J.drops = []; J.lacaios = []; J.textos = []; J.agendados = [];
  J.interativos = []; J.portoes = []; J.npcs = [];
  ENG.limparEfeitos(); GFX.limparDecals();
};
J.guardarArea = function () {
  const st = { def: J.z.def, z: J.z, inimigos: J.inimigos, drops: J.drops, interativos: J.interativos, portoes: J.portoes, pos: { x: J.jog.x, z: J.jog.z }, penal: J.pers.penalRes };
  for (const e of J.inimigos) ENG.scene.remove(e.m.raiz);
  for (const d of J.drops) ENG.scene.remove(d.mesh);
  J.removerInterativos(J.interativos, false);
  for (const g of J.portoes) ENG.scene.remove(g.mesh);
  for (const p of J.projeteis) ENG.scene.remove(p.mesh);
  for (const a of J.areas) { ENG.removerMalha(a.tel); if (a.met) ENG.scene.remove(a.met); }
  for (const l of J.lacaios) { ENG.scene.remove(l.m.raiz); MOD.descartar(l.m); }
  st.mundo = ENG.guardarMundo();
  J.inimigos = []; J.drops = []; J.interativos = []; J.portoes = []; J.npcs = []; J.projeteis = []; J.areas = []; J.lacaios = []; J.textos = []; J.agendados = [];
  ENG.limparEfeitos(); GFX.limparDecals();
  return st;
};
J.descartarGuardado = function () {
  const st = J.estadoGuardado; if (!st) return;
  ENG.descartarMundo(st.mundo);
  for (const e of st.inimigos) MOD.descartar(e.m);
  J.estadoGuardado = null;
};

// ------------------------------------------------------------
// Entrada em uma área
// ------------------------------------------------------------
J.carregarZona = function (def) { J.entrarDef(def, 'inicio'); };
J.entrarArea = function (id, chegada = 'inicio') { const d = TODAS_AREAS[id]; if (d) J.entrarDef(d, chegada); };

J.entrarDef = function (def, chegada = 'inicio', opcoes = {}) {
  const anterior = J.z ? J.z.def.id : null;
  if (opcoes.guardar) J.estadoGuardado = J.guardarArea();
  else { J.limparArea(); if (!def.cidade) J.descartarGuardado(); }
  if (!J.jog) J.criarJogador();
  const jg = J.jog;
  if (!jg.m.raiz.parent) ENG.scene.add(jg.m.raiz);
  if (jg.m.morto) { jg.m.morto = false; jg.m.atual = null; }
  const p = J.pers;
  const mods = def.mods || [];
  const tem = id => mods.some(m => m.id === id);
  J.z = { def, nivel: def.nivel, mods, quant: mods.reduce((s, m) => s + m.quant, 0), completa: false, chefe: null, mortos: 0, total: 0,
    multVida: (tem('mVida') ? 1.4 : 1) * (def.mapa ? 1 + def.tier * 0.06 : 1), multDano: (tem('mDano') ? 1.3 : 1) * (def.mapa ? 1 + def.tier * 0.03 : 1), multVel: tem('mVel') ? 1.2 : 1,
    saidaAberta: !def.chefe };
  p.penalRes = (def.mapa ? 30 : (def.ato - 1) * 10) + (tem('mRes') ? 15 : 0);
  // semente fixa por área: todos os jogadores veem o mesmo terreno
  const semente = [...String(def.id)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7919) >>> 0;
  const mundo = ENG.construirMundo(def.bioma, semente, { chefe: !!def.chefe, cidade: !!def.cidade });
  J.mundo = mundo;
  let pos = { x: mundo.inicio.x, z: mundo.inicio.z };
  if (def.cidade) {
    const L = EST.construirCidade(mundo, def);
    J.montarCidade(def, L);
    if (!p.cidades.includes(def.id)) p.cidades.push(def.id);
    if (!p.waypoints.includes(def.id)) p.waypoints.push(def.id);
    p.ultimaCidade = def.id;
    pos = chegada === 'passagem' ? { x: L.passagem.x + 3, z: L.passagem.z + 2 } : chegada === 'portal' ? { x: L.portal.x + 2, z: L.portal.z + 1.5 } : chegada === 'portao' ? { x: 40, z: 0 } : { x: L.chegada.x, z: L.chegada.z };
  } else {
    J.gerarInimigos();
    const P = J.montarZona(def);
    if (!def.mapa && !p.zonas.includes(def.id)) p.zonas.push(def.id);
    if (chegada === 'fim' && P.saida) pos = { x: P.saida.x - P.saida.dx * 6, z: P.saida.z - P.saida.dz * 6 };
    else if (chegada === 'passagem' && P.passagem) pos = { x: P.passagem.x + 2.5, z: P.passagem.z + 2.5 };
  }
  if (!def.mapa) p.area = def.id;
  if (!mundo.andavel(pos.x, pos.z, 0.4)) pos = { x: mundo.inicio.x, z: mundo.inicio.z };
  jg.x = pos.x; jg.z = pos.z; jg.y = mundo.h(jg.x, jg.z);
  jg.ang = Math.PI / 2; jg.cast = null; jg.dash = null; jg.salto = null; jg.rolar = null; jg.irPara = null; jg.invuln = 1;
  J.buffs = [];
  J.recalc();
  if (def.cidade || !opcoes.manterVida) { jg.vida = J.st.vidaMax; jg.rec = CLASSES[p.classe].recurso.inicio ? J.st.recMax : jg.rec; }
  if (def.cidade) { p.frascos.vida = 30; p.frascos.rec = 30; }
  jg.cds = {};
  ENG.camAlvo.set(jg.x, jg.y, jg.z); ENG.camPos.set(jg.x, jg.y + 25, jg.z + 18);
  J.chegadaT = J.tempo;
  J.estado = 'jogando';
  J.missaoAoEntrar(def.id, anterior);
  UI.aoEntrarZona(def);
  if (!def.cidade && def.nivel > p.nivel + 1) setTimeout(() => UI.aviso(`Área perigosa: nível ${def.nivel} (você é nível ${p.nivel}). Os monstros resistem mais e batem mais forte.`, '#ff9060'), 1200);
  J.salvar();
};

J.restaurarGuardado = function () {
  const st = J.estadoGuardado; if (!st) return;
  J.limparArea();
  ENG.restaurarMundo(st.mundo);
  J.mundo = st.mundo; J.z = st.z; J.inimigos = st.inimigos; J.drops = st.drops; J.interativos = st.interativos; J.portoes = st.portoes;
  J.npcs = J.interativos.filter(i => i.tipo === 'npc');
  for (const e of J.inimigos) ENG.scene.add(e.m.raiz);
  for (const d of J.drops) ENG.scene.add(d.mesh);
  for (const it of J.interativos) { if (it.mesh) ENG.scene.add(it.mesh); if (it.m) ENG.scene.add(it.m.raiz); }
  for (const g of J.portoes) ENG.scene.add(g.mesh);
  J.pers.penalRes = st.penal;
  const jg = J.jog; jg.x = st.pos.x + 1.5; jg.z = st.pos.z + 1.5; if (!J.mundo.andavel(jg.x, jg.z, 0.4)) { jg.x = st.pos.x; jg.z = st.pos.z; }
  jg.y = J.mundo.h(jg.x, jg.z); jg.invuln = 1.5; jg.irPara = null;
  J.estadoGuardado = null;
  ENG.camAlvo.set(jg.x, jg.y, jg.z); ENG.camPos.set(jg.x, jg.y + 25, jg.z + 18);
  J.chegadaT = J.tempo; J.recalc();
  J.estado = 'jogando';
  if (J.z.chefe && !J.z.chefe.morto && J.z.chefe.estado === 'ativo') UI.mostrarChefe(J.z.chefe);
  UI.aoEntrarZona(J.z.def, true);
};

// ------------------------------------------------------------
// Montagem de zona: portões, pedra de passagem, objetivos
// ------------------------------------------------------------
J.montarZona = function (def) {
  const m = J.mundo, cam = m.caminho;
  const P = {};
  const dirIni = (() => { const a = cam[0], b = cam[3]; const L = Math.hypot(b.x - a.x, b.z - a.z) || 1; return { x: (b.x - a.x) / L, z: (b.z - a.z) / L }; })();
  const n = cam.length;
  const dirFim = (() => { const a = cam[n - 4], b = cam[n - 1]; const L = Math.hypot(b.x - a.x, b.z - a.z) || 1; return { x: (b.x - a.x) / L, z: (b.z - a.z) / L }; })();
  // entrada (volta à área anterior)
  if (def.entrada) {
    let x = m.inicio.x - dirIni.x * 7, z = m.inicio.z - dirIni.z * 7;
    if (!m.andavel(x, z, 0.5)) { x = m.inicio.x - dirIni.x * 4; z = m.inicio.z - dirIni.z * 4; }
    const destino = TODAS_AREAS[def.entrada];
    J.addPortao(x, z, Math.atan2(dirIni.x, dirIni.z), 0xffb060, def.entrada, destino.cidade ? 'portao' : 'fim', true);
  }
  // saída (próxima área ou retorno à cidade nos mapas)
  {
    const f = m.fim; const x = f.x + dirFim.x * f.r * 0.6, z = f.z + dirFim.z * f.r * 0.6;
    const destinoId = def.mapa ? (J.pers.ultimaCidade || 'c3') : def.saida;
    const destino = TODAS_AREAS[destinoId];
    const g = J.addPortao(x, z, Math.atan2(dirFim.x, dirFim.z), 0x7090ff, destinoId, destino.cidade ? (def.mapa ? 'passagem' : 'portao') : 'inicio', false);
    g.saida = true; g.mapa = !!def.mapa;
    if (!J.z.saidaAberta) g.mesh.userData.vMat.uniforms.aberto.value = 0;
    P.saida = { x, z, dx: dirFim.x, dz: dirFim.z };
  }
  // pedra de passagem perto do início
  if (!def.mapa) {
    const c = cam[Math.min(n - 1, 5)];
    const nx = -dirIni.z, nz = dirIni.x; const off = Math.max(2.5, Math.min(c.w - 3, 6));
    let x = c.x + nx * off, z = c.z + nz * off;
    if (!m.andavel(x, z, 1.5)) { x = c.x; z = c.z; }
    J.addPassagem(x, z, def.id);
    P.passagem = { x, z };
  }
  // locais especiais no fim dos ramos laterais
  for (const r of (m.ramos || [])) {
    const x = r.fim.x, z = r.fim.z;
    if (r.tipo === 'tesouro') {
      const mesh = EST.bau(x, z, Math.random() * 6.28);
      m.obst.push({ x, z, r: 1.1 });
      J.interativos.push({ tipo: 'tesouro', x, z, mesh, nome: 'Baú do Tesouro', altura: 1.6, acao: () => J.abrirTesouro(x, z) });
    } else if (r.tipo === 'santuario') {
      const mesh = EST.objetivo(x, z, 'Santuário de Cristal');
      m.obst.push({ x, z, r: 1.3 });
      J.interativos.push({ tipo: 'santuario', x, z, mesh, nome: 'Santuário', altura: 3, acao: () => J.usarSantuario(x, z) });
    }
  }
  // objetivos de missões ativas
  for (const ms of MISSOES) {
    if (ms.tipo !== 'objeto' || ms.zona !== def.id || J.mEstado(ms.id) !== 'ativa') continue;
    const c = cam[Math.floor(n * 0.55)];
    let x = c.x + (Math.random() - 0.5) * c.w * 0.6, z = c.z + (Math.random() - 0.5) * c.w * 0.6;
    if (!m.andavel(x, z, 2)) { x = c.x; z = c.z; }
    const mesh = EST.objetivo(x, z, ms.objeto);
    m.obst.push({ x, z, r: 1.3 });
    J.interativos.push({ tipo: 'objetivo', x, z, mesh, nome: ms.objeto, altura: 3, missao: ms.id, acao: () => J.ativarObjetivo(ms.id) });
    // guardiões
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const ex = x + Math.cos(a) * 4, ez = z + Math.sin(a) * 4; if (m.andavel(ex, ez, 0.8)) J.criarInimigo(RNG.pick(def.inimigos), ex, ez, J.z.nivel + 1, i === 0 ? 'raro' : 'magico'); }
  }
  return P;
};

J.addPortao = function (x, z, ang, cor, destino, chegada, ehEntrada) {
  const d = TODAS_AREAS[destino];
  const mesh = EST.portao(x, z, ang, cor, d ? d.nome : '');
  // pilares sólidos
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (const lado of [-1, 1]) J.mundo.obst.push({ x: x + ca * lado * 2.1, z: z - sa * lado * 2.1, r: 0.7 });
  const g = { mesh, x, z, destino, chegada, entrada: ehEntrada, nome: d ? d.nome : '' };
  J.portoes.push(g);
  return g;
};
J.addPassagem = function (x, z, areaId) {
  const mesh = EST.pedraPassagem(x, z);
  J.mundo.obst.push({ x, z, r: 1.5 });
  const ativa = J.pers.waypoints.includes(areaId);
  EST.ativarPassagem(mesh, ativa);
  const it = { tipo: 'passagem', x, z, mesh, nome: 'Pedra de Passagem', altura: 3.2, area: areaId, ativa, acao: () => { J.ativarPassagem(it); UI.abrirMapaMundo(false, true); } };
  J.interativos.push(it);
  return it;
};
J.ativarPassagem = function (it) {
  if (it.ativa) return;
  it.ativa = true; EST.ativarPassagem(it.mesh, true);
  if (!J.pers.waypoints.includes(it.area)) J.pers.waypoints.push(it.area);
  const y = J.mundo.h(it.x, it.z);
  ENG.coluna(it.x, y, it.z, '#60b0ff', 10, 1.4, 1.2);
  ENG.particulas.emitir({ x: it.x, y: y + 2, z: it.z, n: 60, cor: '#80c0ff', cor2: '#ffffff', vel: 5, vida: 1, tam: 0.4, sobe: 2 });
  UI.aviso('Pedra de Passagem ativada');
  J.salvar();
};

// ------------------------------------------------------------
// Cidade
// ------------------------------------------------------------
J.montarCidade = function (C, L) {
  const m = J.mundo;
  // portão de saída a leste
  J.addPortao(47, 0, Math.PI / 2, 0x7090ff, C.saida, 'inicio', false);
  J.addPassagem(L.passagem.x, L.passagem.z, C.id);
  // baú
  { const mesh = EST.bau(L.bau.x, L.bau.z, 0.3); m.obst.push({ x: L.bau.x, z: L.bau.z, r: 1.0 }); J.interativos.push({ tipo: 'bau', x: L.bau.x, z: L.bau.z, mesh, nome: 'Baú', altura: 1.6, acao: () => UI.abrirBau() }); }
  // dispositivo de mapas
  { const d = L.dispositivo; const mesh = EST.dispositivo(d.x, d.z); m.obst.push({ x: d.x, z: d.z, r: 2.0 }); J.interativos.push({ tipo: 'dispositivo', x: d.x, z: d.z, mesh, nome: 'Dispositivo de Mapas', altura: 3.6, acao: () => { if (J.pers.mapaMax > 0) UI.abrirMapaMundo(false, true, true); else UI.aviso('O Atlas desperta quando Vorthak, Senhor das Cinzas, cair.', '#c0a0ff'); } }); }
  // portal de retorno ao mapa guardado
  if (J.estadoGuardado) {
    const mesh = EST.portalCidade(L.portal.x, L.portal.z);
    J.interativos.push({ tipo: 'portal', x: L.portal.x, z: L.portal.z, mesh, nome: 'Portal: ' + J.estadoGuardado.def.nome, altura: 3.4, pisar: true, acao: () => J.restaurarGuardado() });
  }
  // NPCs
  C.npcs.forEach((id, i) => {
    const N = NPCS[id]; const pos = L.npcs[i % L.npcs.length];
    const mm = (N.modelo3d && MOD.criar3D(N.modelo3d, 1.0, N.tinta3d)) || MOD.criar('humanoide', N.visual, 1.0);
    mm.estilo = N.visual.cajado ? 'cajado' : N.visual.arco ? 'arco' : 'golpe';
    mm.raiz.position.set(pos.x, m.h(pos.x, pos.z), pos.z);
    ENG.scene.add(mm.raiz);
    m.obst.push({ x: pos.x, z: pos.z, r: 0.6 });
    const it = { tipo: 'npc', id, x: pos.x, z: pos.z, m: mm, nome: N.nome, altura: 2.3, ang: Math.random() * 6.28, t: Math.random() * 10, acao: () => UI.abrirNpc(id) };
    J.interativos.push(it); J.npcs.push(it);
  });
};

// ------------------------------------------------------------
// Portal para a cidade (tecla V)
// ------------------------------------------------------------
J.abrirPortalCidade = function () {
  if (!J.mundo || J.mundo.cidade || J.estado !== 'jogando') { if (J.mundo && J.mundo.cidade) UI.aviso('Você já está na cidade'); return; }
  const velho = J.interativos.find(i => i.tipo === 'portal'); if (velho) { ENG.scene.remove(velho.mesh); J.interativos.splice(J.interativos.indexOf(velho), 1); }
  const jg = J.jog; let x = jg.x + Math.sin(jg.ang) * 2.2, z = jg.z + Math.cos(jg.ang) * 2.2;
  if (!J.mundo.andavel(x, z, 0.5)) { x = jg.x; z = jg.z; }
  const mesh = EST.portalCidade(x, z);
  const destino = J.pers.ultimaCidade || 'c1';
  J.interativos.push({ tipo: 'portal', x, z, mesh, nome: 'Portal: ' + TODAS_AREAS[destino].nome, altura: 3.4, pisar: true, criadoT: J.tempo, acao: () => J.entrarDef(TODAS_AREAS[destino], 'portal', { guardar: true }) });
  ENG.particulas.emitir({ x, y: J.mundo.h(x, z) + 1.8, z, n: 50, cor: '#90a8ff', vel: 4, vida: 0.8, tam: 0.4 });
  ENG.luz(new THREE.Vector3(x, J.mundo.h(x, z) + 2, z), '#7090ff', 3, 1, 14);
};

// ------------------------------------------------------------
// Atualização por quadro
// ------------------------------------------------------------
J.atualizarMundo = function (dt) {
  const jg = J.jog; if (!jg || !J.mundo) return;
  const t = J.tempo;
  // portões
  for (const g of J.portoes) {
    const u = g.mesh.userData; u.runa.rotation.y += dt * 1.5;
    if (Math.random() < 0.3) ENG.particulas.emitir({ x: g.x, y: J.mundo.h(g.x, g.z) + 1 + Math.random() * 3, z: g.z, n: 1, cor: g.saida && !J.z.saidaAberta ? '#ff4020' : g.entrada ? '#ffb060' : '#8aa0ff', vel: 0.8, vida: 1, tam: 0.3, espalhar: 3, sobe: 1 });
    if (t - J.chegadaT < 1.2 || J.estado !== 'jogando') continue;
    if (Math.hypot(jg.x - g.x, jg.z - g.z) < 2.0) {
      if (g.saida && !J.z.saidaAberta) { if (!g.avisoT || t - g.avisoT > 2.5) { g.avisoT = t; UI.aviso('Derrote o chefe para abrir esta passagem', '#ff9080'); } continue; }
      J.atravessar(g); return;
    }
  }
  // interativos
  for (const it of J.interativos) {
    if (it.tipo === 'npc') {
      it.t += dt;
      const d = Math.hypot(jg.x - it.x, jg.z - it.z);
      const alvo = d < 7 ? Math.atan2(jg.x - it.x, jg.z - it.z) : it.ang + Math.sin(it.t * 0.3) * 0.6;
      it.m.raiz.rotation.y += angDif(alvo, it.m.raiz.rotation.y) * (1 - Math.exp(-dt * 3));
      MOD.animar(it.m, { andar: 0, fase: 0, t: it.t, atq: null });
    } else if (it.tipo === 'passagem') {
      it.mesh.userData.cristal.rotation.y += dt * (it.ativa ? 1.2 : 0.3);
      if (!it.ativa && Math.hypot(jg.x - it.x, jg.z - it.z) < 5) J.ativarPassagem(it);
      if (it.ativa && Math.random() < 0.3) ENG.particulas.emitir({ x: it.x, y: J.mundo.h(it.x, it.z) + 0.8, z: it.z, n: 1, cor: '#6ab0ff', vel: 0.6, vida: 1.4, tam: 0.3, espalhar: 2.6, sobe: 2, grav: -1 });
    } else if (it.tipo === 'dispositivo') {
      const u = it.mesh.userData; u.roda.rotation.y += dt * 0.5; u.roda.rotation.x = Math.sin(t * 0.4) * 0.3;
      u.nucleo.material.emissiveIntensity = J.pers.mapaMax > 0 ? 2.6 + Math.sin(t * 3) * 0.6 : 0.3;
    } else if (it.tipo === 'objetivo' || it.tipo === 'santuario') {
      it.mesh.userData.joia.rotation.y += dt * 1.5; it.mesh.userData.joia.position.y = 2.2 + Math.sin(t * 2) * 0.15;
    } else if (it.tipo === 'portal') {
      it.mesh.userData.anel.rotation.z += dt; it.mesh.userData.disco.material.opacity = 0.45 + Math.sin(t * 4) * 0.12;
      if (Math.random() < 0.5) ENG.particulas.emitir({ x: it.x, y: J.mundo.h(it.x, it.z) + 1.8, z: it.z, n: 1, cor: '#90a8ff', vel: 1.2, vida: 0.7, tam: 0.3, espalhar: 2.2 });
      if (it.pisar && J.estado === 'jogando' && t - J.chegadaT > 1.2 && t - (it.criadoT || 0) > 0.8 && Math.hypot(jg.x - it.x, jg.z - it.z) < 1.5) { it.acao(); return; }
    }
  }
};

J.atravessar = function (g) {
  const d = TODAS_AREAS[g.destino];
  if (g.mapa) { J.pers.mapaMax = Math.max(J.pers.mapaMax, J.z.def.tier + 1); J.pers.mapasFeitos++; UI.aviso(`Mapa concluído! Nível ${J.z.def.tier + 1} liberado no Atlas.`, '#c0a0ff'); }
  J.entrarDef(d, g.chegada, { manterVida: true });
};

// abertura da saída após o chefe (substitui o antigo portal)
J.abrirPortal = function () {
  if (!J.z || J.z.saidaAberta) return;
  J.z.saidaAberta = true; J.z.completa = true;
  for (const g of J.portoes) if (g.saida) {
    g.mesh.userData.vMat.uniforms.aberto.value = 1;
    const y = J.mundo.h(g.x, g.z); ENG.coluna(g.x, y, g.z, '#7090ff', 12, 2, 1.4);
  }
  if (J.z.def.id === 'z15' && J.pers.mapaMax < 1) { J.pers.mapaMax = 1; UI.aviso('O Atlas dos Mapas despertou! Use o Dispositivo de Mapas na cidade.', '#ffd23a'); }
  else UI.aviso('A passagem adiante se abriu.');
  J.salvar();
};

// baú de tesouro: abre depois que os guardas caem
J.abrirTesouro = function (x, z) {
  const it = J.interativos.find(i => i.tipo === 'tesouro' && i.x === x && i.z === z); if (!it) return;
  const vivos = J.inimigos.filter(e => !e.morto && Math.hypot(e.x - x, e.z - z) < 12).length;
  if (vivos) { UI.aviso('Derrote os guardiões do tesouro primeiro', '#ff9080'); return; }
  J.interativos.splice(J.interativos.indexOf(it), 1);
  const y = J.mundo.h(x, z);
  ENG.coluna(x, y, z, '#ffd060', 8, 1.2, 1); ENG.particulas.emitir({ x, y: y + 1, z, n: 60, cor: '#ffe080', vel: 6, vida: 1, tam: 0.4, sobe: 2 });
  const nivel = J.z.nivel + 1, bonus = J.st.achado + J.z.quant + 120;
  const n = 2 + (Math.random() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) J.soltar(IT.gerar(nivel, { classe: J.pers.classe, bonus, minimo: i === 0 ? 'raro' : 'magico' }), x, z);
  if (Math.random() < 0.6) J.soltar(IT.gerarGema(nivel), x, z);
  if (Math.random() < 0.08) J.soltar(IT.gerar(nivel, { classe: J.pers.classe, raridade: 'unico' }), x, z);
  const ouro = Math.round((20 + nivel * 6) * (1 + Math.random()));
  J.soltar({ uid: IT.uid(), tipo: 'ouro', quantia: ouro, nome: ouro + ' Ouro', raridade: 'ouro' }, x, z);
  it.mesh.rotation.z = 0.05; UI.aviso('Tesouro encontrado!', '#ffd060');
};
// santuário: bênção temporária
const BENCAOS = [
  { nome: 'Fúria Ancestral', stats: { danoPct: 35 }, cor: '#ff6040' },
  { nome: 'Pés de Vento', stats: { velMov: 30, velAtaque: 20 }, cor: '#80ffc0' },
  { nome: 'Pele de Pedra', stats: { redDano: 25, armaduraPct: 60 }, cor: '#c0b090' },
  { nome: 'Olho do Caçador', stats: { critChance: 15, danoCrit: 60 }, cor: '#ffe060' },
  { nome: 'Vigor Sagrado', stats: { regenVidaPct: 3, vidaPct: 20 }, cor: '#ff80a0' },
];
J.usarSantuario = function (x, z) {
  const it = J.interativos.find(i => i.tipo === 'santuario' && i.x === x && i.z === z); if (!it) return;
  J.interativos.splice(J.interativos.indexOf(it), 1);
  const b = BENCAOS[Math.floor(Math.random() * BENCAOS.length)];
  J.buffs = J.buffs.filter(x => x.id !== 'santuario');
  J.buffs.push({ id: 'santuario', nome: b.nome, icone: '✦', stats: b.stats, t: 60, dur: 60, cor: b.cor });
  J.recalc();
  const y = J.mundo.h(x, z);
  ENG.coluna(x, y, z, b.cor, 14, 2, 1.4); ENG.particulas.emitir({ x, y: y + 2, z, n: 80, cor: b.cor, vel: 7, vida: 1.1, tam: 0.45, sobe: 2 });
  it.mesh.userData.feixe.visible = false; it.mesh.userData.mat.emissiveIntensity = 0.4;
  UI.aviso(`Santuário: ${b.nome} por 60 segundos!`, b.cor);
};

J.ativarObjetivo = function (id) {
  const it = J.interativos.find(i => i.missao === id); if (!it) return;
  const vivos = J.inimigos.filter(e => !e.morto && Math.hypot(e.x - it.x, e.z - it.z) < 9).length;
  if (vivos) { UI.aviso('Derrote os guardiões antes de tocar o ' + it.nome, '#ff9080'); return; }
  if (J.mEstado(id) === 'ativa') { J.pers.missoes[id].e = 'pronta'; UI.aviso(`${it.nome} ativado! Volte a ${NPCS[MISSAO_POR_ID[id].npc].nome}.`, '#ffd23a'); }
  const y = J.mundo.h(it.x, it.z);
  ENG.coluna(it.x, y, it.z, '#' + new THREE.Color(it.mesh.userData.cor).getHexString(), 14, 2, 1.5);
  ENG.particulas.emitir({ x: it.x, y: y + 2, z: it.z, n: 100, cor: '#ffe0a0', vel: 7, vida: 1.2, tam: 0.5, sobe: 2 });
  it.mesh.userData.feixe.visible = false; it.mesh.userData.mat.emissiveIntensity = 0.5;
  J.interativos.splice(J.interativos.indexOf(it), 1);
  ENG.scene.remove(it.mesh); ENG.scene.add(it.mesh); // mantém o altar apagado no cenário
  J.mundo.objetos.push(it.mesh);
  UI.atualizarRastreador(); J.salvar();
};

// ------------------------------------------------------------
// Missões
// ------------------------------------------------------------
J.mEstado = function (id) { const m = J.pers && J.pers.missoes[id]; return m ? m.e : null; };
J.missoesDoNpc = function (npc) {
  const p = J.pers;
  return MISSOES.filter(m => m.npc === npc && (J.mEstado(m.id) !== 'feita') && (J.mEstado(m.id) || !m.req || J.mEstado(m.req) === 'feita'));
};
J.marcadorNpc = function (npc) {
  const ms = J.missoesDoNpc(npc);
  if (ms.some(m => J.mEstado(m.id) === 'pronta')) return '?';
  if (ms.some(m => !J.mEstado(m.id))) return '!';
  if (ms.some(m => J.mEstado(m.id) === 'ativa')) return '…';
  return '';
};
J.aceitarMissao = function (id) {
  const m = MISSAO_POR_ID[id]; if (J.mEstado(id)) return;
  J.pers.missoes[id] = { e: 'ativa', p: 0 };
  if (m.tipo === 'chefe' && J.pers.chefesMortos.includes(m.chefe)) J.pers.missoes[id].e = 'pronta';
  if (m.tipo === 'zona' && J.pers.zonas.includes(TODAS_AREAS[m.zona].saida)) J.pers.missoes[id].e = 'pronta';
  UI.aviso('Missão aceita: ' + m.nome);
  UI.atualizarRastreador(); J.salvar();
};
J.progredirMissao = function (id, n = 1) {
  const m = MISSAO_POR_ID[id]; const st = J.pers.missoes[id]; if (!st || st.e !== 'ativa') return;
  st.p = Math.min(m.qtd || 1, st.p + n);
  if (st.p >= (m.qtd || 1)) { st.e = 'pronta'; UI.aviso(`Missão cumprida: ${m.nome}. Volte a ${NPCS[m.npc].nome}.`, '#ffd23a'); }
  UI.atualizarRastreador();
};
J.nivelMissao = function (m) {
  const z = m.zona || (m.zonas && m.zonas[0]) || (m.chefe && ZONAS.find(z => z.chefe === m.chefe).id);
  return (TODAS_AREAS[z] || { nivel: J.pers.nivel }).nivel + 1;
};
J.entregarMissao = function (id) {
  const m = MISSAO_POR_ID[id]; if (J.mEstado(id) !== 'pronta') return;
  const p = J.pers; const r = m.recompensa; const il = J.nivelMissao(m);
  const msgs = [];
  if (r.xp) { const q = Math.round(xpProximo(p.nivel) * r.xp * 0.45); J.ganharXP(q); msgs.push(`+${q.toLocaleString('pt-BR')} XP`); }
  if (r.ponto) { p.pontosExtras = (p.pontosExtras || 0) + r.ponto; msgs.push(`+${r.ponto} ponto${r.ponto > 1 ? 's' : ''} de habilidade`); }
  const dar = (it) => { const i = p.inv.indexOf(null); if (i >= 0) p.inv[i] = it; else J.soltar(it, J.jog.x, J.jog.z); msgs.push(it.nome); };
  if (r.item) dar(IT.gerar(il, { classe: p.classe, raridade: r.item === 'unico' ? 'unico' : undefined, minimo: r.item === 'unico' ? null : r.item, base: r.arma ? CLASSES[p.classe].arma : undefined }));
  if (r.gema) dar(IT.gerarGema(il, Math.min(3, r.gema)));
  p.missoes[id].e = 'feita';
  UI.aviso('Recompensa: ' + msgs.join(' · '), '#ffd23a');
  J.recalc(); UI.atualizarTudo(); UI.atualizarRastreador(); J.salvar();
};
J.missaoAoMatar = function (e) {
  const p = J.pers; if (!p) return;
  if (e.boss && !p.chefesMortos.includes(e.tipo)) p.chefesMortos.push(e.tipo);
  const zona = J.z.def.id;
  for (const m of MISSOES) {
    if (J.mEstado(m.id) !== 'ativa') continue;
    if (m.tipo === 'coletar' && m.zonas.includes(zona) && e.tipo === m.inimigo && Math.random() < m.chance) {
      J.progredirMissao(m.id);
      J.texto(e.x, e.y + 2.5, e.z, `${m.item} ${p.missoes[m.id].p}/${m.qtd}`, '#7fe0ff', 15, 1.6);
    }
    if (m.tipo === 'raro' && m.zona === zona && e.rar === 'raro') { J.progredirMissao(m.id); J.texto(e.x, e.y + 2.5, e.z, `${m.nome} ${p.missoes[m.id].p}/${m.qtd}`, '#7fe0ff', 15, 1.6); }
    if (m.tipo === 'chefe' && e.boss && e.tipo === m.chefe) J.progredirMissao(m.id);
  }
};
J.missaoAoEntrar = function (novo, anterior) {
  if (!anterior) return;
  for (const m of MISSOES) if (m.tipo === 'zona' && J.mEstado(m.id) === 'ativa' && m.zona === anterior && TODAS_AREAS[anterior].saida === novo) J.progredirMissao(m.id);
};
{
  const matar = J.matarInimigo;
  J.matarInimigo = function (e) { const ja = e.morto; matar(e); if (!ja && e.morto) J.missaoAoMatar(e); };
  const atualizar = J.atualizar;
  J.atualizar = function (dt) {
    atualizar(dt);
    if (J.estado === 'jogando') J.atualizarMundo(dt);
    else for (const n of J.npcs) { n.t += dt; MOD.animar(n.m, { andar: 0, fase: 0, t: n.t, atq: null }); }
  };
}
