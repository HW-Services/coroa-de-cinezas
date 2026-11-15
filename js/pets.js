// ============================================================
//  Pets: companheiros que seguem o jogador e coletam ouro e
//  itens conforme os filtros escolhidos no menu (tecla P).
//  Modelos procedurais no mesmo estilo dos monstros.
// ============================================================
'use strict';

const PETS = {
  leao: { nome: 'Leão Dourado', especie: 'felino', classe: 'guerreiro', icone: '🦁', desc: 'Juba farta e passo de rei. Combina com a armadura do guerreiro.', v: { pelo: 0xd8a050, barriga: 0xf0d8a0, juba: 0x8a4a1a, olhos: 0xffc040, nariz: 0x3a2018, juba2: 0xa85a20 } },
  leaoCeleste: { nome: 'Leão Celeste', especie: 'felino', classe: 'guerreiro', icone: '🦁', desc: 'Pelagem de marfim e olhos que brilham como estrelas.', v: { pelo: 0xf2ece0, barriga: 0xffffff, juba: 0xd8c8a0, juba2: 0xbfae80, olhos: 0x80d0ff, nariz: 0x6a5a58, brilho: 0x80c0ff } },
  tigre: { nome: 'Tigre das Sombras', especie: 'felino', classe: 'cacadora', icone: '🐯', desc: 'Silencioso como a caçadora que acompanha.', v: { pelo: 0xe07a20, barriga: 0xfff0e0, listras: 0x1a1210, olhos: 0xa0ff60, nariz: 0x3a2018 } },
  tigreNeve: { nome: 'Tigre das Neves', especie: 'felino', classe: 'cacadora', icone: '🐯', desc: 'Listras de carvão sobre pelo de neve.', v: { pelo: 0xf2f2f6, barriga: 0xffffff, listras: 0x2a2a34, olhos: 0x70c8ff, nariz: 0x6a5a5a } },
  coruja: { nome: 'Coruja Arcana', especie: 'coruja', classe: 'feiticeira', icone: '🦉', desc: 'Olhos de mana pura; deixa faíscas por onde voa.', v: { corpo: 0x5a4a8a, peito: 0xb8a8e0, disco: 0xd8d0f0, olhos: 0x60c0ff, bico: 0xd8b040, asa: 0x3a2a6a, runas: 0x80c8ff } },
  corujaNeve: { nome: 'Coruja das Neves', especie: 'coruja', classe: 'feiticeira', icone: '🦉', desc: 'Branca como os picos gélidos.', v: { corpo: 0xf0f0f4, peito: 0xffffff, disco: 0xffffff, olhos: 0xffc020, bico: 0x3a3a3a, asa: 0xd8d8e0, pintas: 0x5a5a6a } },
};
const PET_PADRAO = { guerreiro: 'leao', cacadora: 'tigre', feiticeira: 'coruja' };
const FILTROS_PET = [['ouro', 'Ouro', '#ecc451'], ['normal', 'Itens normais', '#c8c8c8'], ['magico', 'Itens mágicos', '#8888ff'], ['raro', 'Itens raros', '#ffff77'], ['unico', 'Itens únicos', '#d07a30'], ['gema', 'Jóias', '#60e0c0']];

// ------------------------------------------------------------
// Modelos
// ------------------------------------------------------------
function texListras(cor, listra) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#' + new THREE.Color(cor).getHexString(); g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#' + new THREE.Color(listra).getHexString();
  for (let i = 0; i < 9; i++) {
    const y = 20 + i * 25 + (i % 2) * 5;
    for (const lado of [0, 64]) { g.beginPath(); g.moveTo(lado + 6, y); g.quadraticCurveTo(lado + 32, y - 9, lado + 58, y + 2); g.lineTo(lado + 54, y + 7); g.quadraticCurveTo(lado + 32, y - 2, lado + 10, y + 6); g.closePath(); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
}

MOD.felino = function (v, mk) {
  const raiz = new THREE.Group(); const corpo = N(raiz);
  const alt = 0.6, comp = 0.78;
  const opc = { roughness: 0.85 };
  if (v.listras) opc.map = texListras(v.pelo, v.listras);
  if (v.brilho) { opc.emissive = v.brilho; opc.emissiveIntensity = 0.12; }
  const mPelo = mk(v.listras ? 0xffffff : v.pelo, opc);
  const mClaro = mk(v.barriga, { roughness: 0.85 });
  const mOlho = mk(0x000000, { emissive: v.olhos, emissiveIntensity: 2.6 });
  const mNariz = mk(v.nariz, { roughness: 0.5 });
  const tronco = N(corpo, 0, alt, 0);
  P(capsula(0.25, comp), mPelo, tronco, 0, 0, 0, 1, 0.95, 1).rotation.x = Math.PI / 2;
  P(gEsf(), mPelo, tronco, 0, 0.03, 0.34, 0.31, 0.31, 0.32);
  P(gEsf(), mClaro, tronco, 0, -0.12, 0.05, 0.2, 0.14, 0.42);
  const pescoco = N(tronco, 0, 0.1, comp * 0.6); pescoco.rotation.x = -0.35;
  P(capsula(0.16, 0.14), mPelo, pescoco, 0, 0.1, 0.04).rotation.x = 0.5;
  const cabeca = N(pescoco, 0, 0.24, 0.14); cabeca.rotation.x = 0.35;
  P(gEsf(), mPelo, cabeca, 0, 0, 0, 0.22, 0.2, 0.21);
  P(gEsf(), mClaro, cabeca, 0, -0.06, 0.15, 0.13, 0.09, 0.1);
  P(gEsf(), mNariz, cabeca, 0, -0.01, 0.235, 0.04, 0.028, 0.025, false);
  const mand = N(cabeca, 0, -0.1, 0.08);
  P(gEsf(), mClaro, mand, 0, -0.01, 0.07, 0.09, 0.04, 0.08);
  for (const lado of [1, -1]) {
    P(gEsfB(), mOlho, cabeca, 0.085 * lado, 0.05, 0.17, 0.035, 0.028, 0.02, false);
    P(gEsf(), mPelo, cabeca, 0.15 * lado, 0.16, -0.02, 0.065, 0.065, 0.03);
    P(gEsf(), mClaro, cabeca, 0.15 * lado, 0.16, -0.005, 0.04, 0.04, 0.02, false);
  }
  if (v.juba) {
    const mJ = mk(v.juba, { roughness: 0.95 }), mJ2 = mk(v.juba2 || v.juba, { roughness: 0.95 });
    P(gEsf(), mJ, cabeca, 0, 0.0, -0.08, 0.32, 0.31, 0.22);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2; const r = 0.27;
      const t = P(gCone(), i % 2 ? mJ : mJ2, cabeca, Math.cos(a) * r, Math.sin(a) * r * 0.95, -0.06, 0.09, 0.2, 0.09);
      t.rotation.z = a - Math.PI / 2; t.rotation.x = -0.4;
    }
    P(gEsf(), mJ, pescoco, 0, 0.05, -0.02, 0.24, 0.26, 0.24);
  }
  const pernas = []; const L = 0.34;
  for (const [x, z] of [[0.17, 0.33], [-0.17, 0.33], [0.17, -0.33], [-0.17, -0.33]]) {
    const ombro = N(tronco, x, -0.05, z);
    P(capsula(0.09, L * 0.75), mPelo, ombro, 0, -L * 0.5, 0);
    const joelho = N(ombro, 0, -L, 0);
    P(capsula(0.07, L * 0.7), mPelo, joelho, 0, -L * 0.42, 0);
    P(gEsf(), mClaro, joelho, 0, -L * 0.92, 0.03, 0.09, 0.05, 0.11);
    pernas.push({ ombro, joelho });
  }
  const cauda = []; let pai = N(tronco, 0, 0.08, -comp * 0.6);
  for (let i = 0; i < 6; i++) {
    const s = N(pai, 0, 0, i === 0 ? 0 : -0.13); s.rotation.x = v.juba ? (i === 0 ? -0.75 : 0.22) : (i === 0 ? -0.35 : 0.2);
    P(capsula(0.045 * (1 - i * 0.08), 0.09), mPelo, s, 0, 0, -0.06).rotation.x = Math.PI / 2;
    cauda.push(s); pai = s;
  }
  if (v.juba) P(gEsf(), mk(v.juba, { roughness: 0.95 }), pai, 0, 0, -0.16, 0.07, 0.07, 0.1);
  return { raiz, p: { raiz, corpo, tronco, pescoco, cabeca, mand, pernas, cauda }, mats: mk.lista, rig: 'quadrupede', alturaCabeca: 1.1 };
};

MOD.coruja = function (v, mk) {
  const raiz = new THREE.Group(); const corpo = N(raiz, 0, 1.7, 0);
  const mC = mk(v.corpo, { roughness: 0.9 }), mP = mk(v.peito, { roughness: 0.9 }), mD = mk(v.disco, { roughness: 0.9 });
  const mA = mk(v.asa, { side: THREE.DoubleSide, roughness: 0.9 });
  const mOlho = mk(0x000000, { emissive: v.olhos, emissiveIntensity: 2.4 }), mPupila = mk(0x050505, { roughness: 0.3 });
  const mBico = mk(v.bico, { roughness: 0.5 });
  P(gEsf(), mC, corpo, 0, 0, 0, 0.26, 0.32, 0.25);
  P(gEsf(), mP, corpo, 0, -0.04, 0.12, 0.19, 0.24, 0.14);
  if (v.pintas) { const mPi = mk(v.pintas); for (let i = 0; i < 10; i++) P(gEsfB(), mPi, corpo, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4, 0.18 + Math.random() * 0.05, 0.022, 0.016, 0.01, false); }
  if (v.runas) { const mR = mk(v.runas, { emissive: v.runas, emissiveIntensity: 2.2 }); for (let i = 0; i < 3; i++) P(gOcta(), mR, corpo, 0, -0.14 + i * 0.1, 0.24, 0.025, 0.035, 0.01, false); }
  const cab = N(corpo, 0, 0.36, 0.02);
  P(gEsf(), mC, cab, 0, 0, 0, 0.24, 0.21, 0.22);
  for (const lado of [1, -1]) {
    P(gEsf(), mD, cab, 0.095 * lado, -0.01, 0.15, 0.1, 0.11, 0.05);
    P(gEsf(), mOlho, cab, 0.095 * lado, 0.0, 0.19, 0.06, 0.06, 0.03, false);
    P(gEsf(), mPupila, cab, 0.095 * lado, 0.0, 0.215, 0.028, 0.028, 0.015, false);
    const tufo = P(gCone(), mC, cab, 0.16 * lado, 0.2, -0.02, 0.05, 0.16, 0.04); tufo.rotation.z = -lado * 0.45;
  }
  P(gCone(), mBico, cab, 0, -0.07, 0.2, 0.035, 0.09, 0.035).rotation.x = Math.PI / 2 + 0.6;
  const asas = [];
  for (const lado of [1, -1]) {
    const a = N(corpo, 0.2 * lado, 0.1, -0.02);
    P(asaGeo('harpia'), mA, a, 0, 0, 0, 0.42 * lado, 1, 0.4);
    P(gEsf(), mC, a, 0.02 * lado, -0.08, 0, 0.07, 0.22, 0.12);
    asas.push(a);
  }
  const garras = [];
  for (const lado of [1, -1]) { const g = N(corpo, 0.08 * lado, -0.3, 0.05); P(capsula(0.03, 0.08), mBico, g, 0, -0.05, 0); garras.push(g); }
  const cauda = N(corpo, 0, -0.22, -0.18); P(gCone(), mA, cauda, 0, 0, -0.1, 0.12, 0.24, 0.04).rotation.x = -Math.PI / 2 - 0.4;
  return { raiz, p: { raiz, corpo, cab, asas, garras, cauda }, mats: mk.lista, rig: 'coruja', alturaCabeca: 2.2 };
};
MOD.animCoruja = function (m, s) {
  const p = m.p, t = s.t, w = s.andar || 0;
  // asas: dobradas paradas, batendo ao voar
  const bat = Math.sin(t * 12);
  const abre = 0.15 + 0.85 * w;
  p.asas[0].rotation.z = (bat * 0.8 * w) - (1 - w) * 1.45; p.asas[1].rotation.z = -(bat * 0.8 * w) + (1 - w) * 1.45;
  p.asas[0].rotation.y = -0.3 * (1 - abre); p.asas[1].rotation.y = 0.3 * (1 - abre);
  p.corpo.position.y = 1.7 + Math.sin(t * 2.2) * 0.08 + bat * 0.03 * w;
  p.corpo.rotation.x = 0.25 * w;
  p.cab.rotation.y = Math.sin(t * 0.6) * 0.6 * (1 - w);   // vira a cabeça como coruja
  p.cab.rotation.z = Math.sin(t * 0.9) * 0.12 * (1 - w);
  p.garras.forEach((g, i) => g.rotation.x = 0.2 + Math.sin(t * 2 + i) * 0.1);
};
(function () {
  const an0 = MOD.animar;
  MOD.animar = function (m, s) { if (m.rig === 'coruja') return MOD.animCoruja(m, s); return an0(m, s); };
})();

const PET = { m: null, id: null, x: 0, z: 0, ang: 0, fase: 0, t: 0, alvo: null, avisoCheio: 0, mov: 0 };
window.PET = PET;
PET.criarModelo = function (id) {
  const d = PETS[id]; if (!d) return null;
  const mk = criarMats();
  const m = d.especie === 'coruja' ? MOD.coruja(d.v, mk) : MOD.felino(d.v, mk);
  const esc = d.especie === 'coruja' ? 0.8 : 0.85;
  m.raiz.scale.setScalar(esc); m.escala = esc;
  m.blob = GFX.sombraContato(m.raiz, d.especie === 'coruja' ? 0.35 : 0.55);
  m.voa = d.especie === 'coruja';
  return m;
};
PET.descartar = function (m) { if (!m) return; ENG.scene.remove(m.raiz); MOD.descartar(m); };

// ------------------------------------------------------------
// Comportamento
// ------------------------------------------------------------
PET.cfg = () => J.pers && J.pers.pet;
PET.aceita = function (it) {
  const f = PET.cfg().filtros;
  if (it.tipo === 'ouro') return !!f.ouro;
  if (it.tipo === 'gema') return !!f.gema;
  return !!f[it.raridade];
};
PET.atualizar = function (dt) {
  const c = PET.cfg(), jg = J.jog;
  const quer = c && c.ativo && PETS[c.id] && jg && J.mundo && J.estado !== 'menu';
  if (!quer) { if (PET.m) { PET.descartar(PET.m); PET.m = null; PET.id = null; } return; }
  if (!PET.m || PET.id !== c.id || !PET.m.raiz.parent) {
    if (PET.m) PET.descartar(PET.m);
    PET.m = PET.criarModelo(c.id); PET.id = c.id; ENG.scene.add(PET.m.raiz);
    PET.x = jg.x - 1.5; PET.z = jg.z - 1.5; PET.ang = jg.ang; PET.alvo = null;
  }
  PET.t += dt;
  // procura algo para coletar (perto do jogador)
  if (PET.alvo && !J.drops.includes(PET.alvo)) PET.alvo = null;
  if (!PET.alvo && J.estado === 'jogando') {
    let melhor = null, md = 18;
    for (const d of J.drops) {
      if (d._petIgnorar || d.t < 0.6 || !PET.aceita(d.item)) continue;
      const dj = Math.hypot(d.x - jg.x, d.z - jg.z); if (dj > 18) continue;
      const dp = Math.hypot(d.x - PET.x, d.z - PET.z); if (dp < md) { md = dp; melhor = d; }
    }
    PET.alvo = melhor;
  }
  let tx, tz, vel;
  if (PET.alvo) { tx = PET.alvo.x; tz = PET.alvo.z; vel = 11; }
  else { tx = jg.x - Math.sin(jg.ang) * 1.6 + Math.cos(jg.ang) * 1.3; tz = jg.z - Math.cos(jg.ang) * 1.6 - Math.sin(jg.ang) * 1.3; vel = 0; }
  const dx = tx - PET.x, dz = tz - PET.z, dist = Math.hypot(dx, dz);
  if (Math.hypot(jg.x - PET.x, jg.z - PET.z) > 28) { PET.x = jg.x - 1.5; PET.z = jg.z - 1.5; PET.alvo = null; }
  if (PET.alvo && dist < 1.0) {
    const d = PET.alvo; const ok = J.pegar(d);
    if (ok === false) { d._petIgnorar = true; if (J.tempo - PET.avisoCheio > 8) { PET.avisoCheio = J.tempo; UI.aviso('Seu pet não consegue coletar: inventário cheio', '#ff9080'); } }
    else ENG.particulas.emitir({ x: PET.x, y: J.mundo.h(PET.x, PET.z) + (PET.m.voa ? 1.4 : 0.6), z: PET.z, n: 10, cor: d.item.tipo === 'ouro' ? '#ffd860' : '#ffffff', vel: 2, vida: 0.4, tam: 0.25, sobe: 1 });
    PET.alvo = null;
  }
  let movendo = 0;
  if (dist > 0.6) {
    const v = vel || Math.min(13, Math.max(jg.andar > 0.3 ? J.st.velMov : 3, dist * 2.4));
    const passo = Math.min(dist, v * dt);
    PET.x += dx / dist * passo; PET.z += dz / dist * passo;
    PET.ang += angDif(Math.atan2(dx, dz), PET.ang) * (1 - Math.exp(-dt * 10));
    movendo = Math.min(1, v / 7);
  } else PET.ang += angDif(jg.ang, PET.ang) * (1 - Math.exp(-dt * 3));
  PET.mov = lerp(PET.mov, movendo, 1 - Math.exp(-dt * 8));
  PET.fase += dt * 7 * PET.mov * 1.4;
  const y = J.mundo.h(PET.x, PET.z);
  PET.m.raiz.position.set(PET.x, y, PET.z); PET.m.raiz.rotation.y = PET.ang;
  MOD.animar(PET.m, { andar: PET.mov, fase: PET.fase, t: PET.t, atq: null });
  if (PETS[PET.id].v.runas && Math.random() < 0.15) ENG.particulas.emitir({ x: PET.x, y: y + 1.35, z: PET.z, n: 1, cor: '#80c8ff', vel: 0.5, vida: 0.7, tam: 0.18, sobe: -0.5, espalhar: 0.3 });
  if (PETS[PET.id].v.brilho && Math.random() < 0.08) ENG.particulas.emitir({ x: PET.x, y: y + 0.9, z: PET.z, n: 1, cor: '#a0d8ff', vel: 0.4, vida: 0.8, tam: 0.16, sobe: 1, espalhar: 0.5 });
};

// pets dos outros jogadores (só seguem, não coletam)
PET.atualizarRemotos = function (dt) {
  if (!window.MP || !MP.outros) return;
  for (const o of MP.outros.values()) {
    const id = o.s && o.s.pt;
    if (!id || !PETS[id]) { if (o.pet) { PET.descartar(o.pet.m); o.pet = null; } continue; }
    if (!o.pet || o.pet.id !== id) { if (o.pet) PET.descartar(o.pet.m); const m = PET.criarModelo(id); ENG.scene.add(m.raiz); o.pet = { id, m, x: o.x - 1.5, z: o.z - 1.5, ang: o.ang, fase: 0, t: 0, mov: 0 }; }
    const p = o.pet; p.t += dt;
    const tx = o.x - Math.sin(o.ang) * 1.6 + Math.cos(o.ang) * 1.3, tz = o.z - Math.cos(o.ang) * 1.6 - Math.sin(o.ang) * 1.3;
    const dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz);
    if (dist > 25) { p.x = tx; p.z = tz; }
    let mv = 0;
    if (dist > 0.6) { const passo = Math.min(dist, Math.min(13, dist * 2.4) * dt); p.x += dx / dist * passo; p.z += dz / dist * passo; p.ang += angDif(Math.atan2(dx, dz), p.ang) * (1 - Math.exp(-dt * 10)); mv = 1; }
    p.mov = lerp(p.mov, mv, 1 - Math.exp(-dt * 8)); p.fase += dt * 7 * p.mov * 1.4;
    p.m.raiz.position.set(p.x, J.mundo.h(p.x, p.z), p.z); p.m.raiz.rotation.y = p.ang;
    MOD.animar(p.m, { andar: p.mov, fase: p.fase, t: p.t, atq: null });
  }
};

// ------------------------------------------------------------
// Menu de pets (tecla P)
// ------------------------------------------------------------
PET.desenharPainel = function () {
  const box = document.getElementById('petCorpo'); if (!box || !J.pers) return;
  const c = PET.cfg(), cls = J.pers.classe;
  let h = `<div class="petTopo"><span>Seu pet ${c.ativo ? 'está acompanhando você' : 'está guardado'}</span><button class="btn${c.ativo ? ' sec' : ''}" id="petAtivo">${c.ativo ? 'Guardar pet' : 'Chamar pet'}</button></div>`;
  h += '<div class="sSub">Escolha o companheiro</div><div class="petGrade">';
  for (const [id, d] of Object.entries(PETS)) {
    const cor = '#' + new THREE.Color(d.v.pelo || d.v.corpo).getHexString(), cor2 = '#' + new THREE.Color(d.v.juba || d.v.listras || d.v.asa || d.v.barriga).getHexString();
    h += `<button class="petCard${c.id === id ? ' sel' : ''}" data-pet="${id}" aria-pressed="${c.id === id}">
      <span class="petIc" style="background:radial-gradient(circle at 40% 35%, ${cor}, ${cor2})">${d.icone}</span>
      <span class="petNm">${d.nome}</span><span class="petCl">${d.classe === cls ? '★ Combina com sua classe' : 'Tema: ' + CLASSES[d.classe].nome}</span>
      <span class="petDs">${d.desc}</span></button>`;
  }
  h += '</div><div class="sSub">O que o pet deve coletar</div><div class="petFiltros">';
  for (const [k, rot, cor] of FILTROS_PET) h += `<label class="petF"><input type="checkbox" data-filtro="${k}" ${c.filtros[k] ? 'checked' : ''}><span style="color:${cor}">${rot}</span></label>`;
  h += '</div><div class="dica">O pet busca o que você marcar num raio de cerca de 18 metros e coloca direto no inventário. Ele não luta: só coleta.</div>';
  box.innerHTML = h;
  box.querySelector('#petAtivo').addEventListener('click', () => { c.ativo = !c.ativo; J.salvar(); PET.desenharPainel(); if (window.SOM) SOM.tocar(c.ativo ? 'magia' : 'fechar', { vol: 0.5, tom: 1.3 }); });
  box.querySelectorAll('[data-pet]').forEach(b => b.addEventListener('click', () => { c.id = b.dataset.pet; c.ativo = true; J.salvar(); PET.desenharPainel(); if (window.SOM) SOM.tocar('magia', { vol: 0.5, tom: 1.2 }); }));
  box.querySelectorAll('[data-filtro]').forEach(i => i.addEventListener('change', () => { c.filtros[i.dataset.filtro] = i.checked; J.salvar(); }));
};
PET.alternarPainel = function (abrir) {
  const p = document.getElementById('painelPet'); if (!p || !J.pers || J.estado === 'menu') return;
  const vai = abrir == null ? p.hidden : abrir; p.hidden = !vai;
  if (vai) PET.desenharPainel();
};

(function () {
  const css = `
  #painelPet { left: 10px; width: min(480px, 96vw); z-index: 11; }
  #petCorpo { overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
  .petTopo { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 14px; color: var(--texto); }
  .petGrade { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .petCard { display: grid; grid-template-columns: 48px 1fr; grid-template-rows: auto auto auto; gap: 1px 10px; text-align: left; background: rgba(12,10,8,.75); border: 2px solid var(--borda); border-radius: 4px; padding: 8px; color: var(--texto); cursor: pointer; font-family: var(--f-corpo); }
  .petCard:hover { border-color: var(--bronze); } .petCard.sel { border-color: #ffcf70; box-shadow: 0 0 14px rgba(255,190,90,.25); }
  .petCard:focus-visible { outline: 2px solid var(--bronze2); outline-offset: 2px; }
  .petIc { grid-row: 1 / span 3; width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; font-size: 28px; border: 1px solid #000; box-shadow: inset 0 0 8px rgba(0,0,0,.5); }
  .petNm { font-family: var(--f-titulo); font-weight: 700; color: var(--bronze2); font-size: 14px; }
  .petCl { font-size: 11px; color: var(--bronze); } .petDs { font-size: 12px; color: var(--texto2); line-height: 1.3; }
  .petFiltros { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 12px; }
  .petF { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; padding: 4px 6px; background: rgba(12,10,8,.6); border: 1px solid #2a2118; border-radius: 3px; }
  .petF input { width: 16px; height: 16px; accent-color: #d8a858; }
  @media (max-width: 520px) { .petGrade, .petFiltros { grid-template-columns: 1fr; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const d = document.createElement('div'); d.className = 'painel'; d.id = 'painelPet'; d.hidden = true;
  d.innerHTML = '<h2>Pets <button class="fechar" id="fecharPet" aria-label="Fechar">✕</button></h2><div id="petCorpo"></div>';
  document.body.insertBefore(d, document.getElementById('tooltip'));
  document.getElementById('fecharPet').addEventListener('click', () => PET.alternarPainel(false));
  const menu = document.getElementById('botoesMenu');
  if (menu) { const b = document.createElement('button'); b.className = 'bmenu'; b.id = 'bPet'; b.textContent = 'Pet (P)'; b.addEventListener('click', () => PET.alternarPainel()); const ref = document.getElementById('bSocial') || menu.lastElementChild; menu.insertBefore(b, ref); }
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') return;
    if (J.estado === 'menu') return;
    if (e.code === 'KeyP' && !e.repeat) { PET.alternarPainel(); e.stopImmediatePropagation(); }
    else if (e.code === 'Escape' && !document.getElementById('painelPet').hidden) { PET.alternarPainel(false); e.stopImmediatePropagation(); }
  }, true);
  const fe0 = UI.fecharTudo; UI.fecharTudo = function () { fe0(); document.getElementById('painelPet').hidden = true; };

  // salvamento: pet padrão por classe
  const mig0 = J.migrarSave;
  J.migrarSave = function (p) {
    mig0(p); if (!p) return;
    if (!p.pet || !PETS[p.pet.id]) p.pet = { id: PET_PADRAO[p.classe] || 'leao', ativo: true, filtros: {} };
    p.pet.filtros = Object.assign({ ouro: true, normal: false, magico: true, raro: true, unico: true, gema: true }, p.pet.filtros || {});
  };
  // por quadro
  const at0 = J.atualizar;
  J.atualizar = function (dt) { at0(dt); try { if (J.pers && !J.pers.pet) J.migrarSave(J.pers); PET.atualizar(dt); PET.atualizarRemotos(dt); } catch (err) { console.error(err); } };
  // troca de área: o modelo some com a limpeza da cena; recria e reposiciona
  const ent0 = J.entrarDef;
  J.entrarDef = function (def, chegada, op) { ent0(def, chegada, op); if (PET.m) { PET.descartar(PET.m); PET.m = null; } };
  const rest0 = J.restaurarGuardado;
  J.restaurarGuardado = function () { rest0(); if (PET.m) { PET.descartar(PET.m); PET.m = null; } };
  // multijogador: avisa qual pet está ativo e remove pets de quem sai
  if (window.MP) {
    const el0 = MP.estadoLocal;
    MP.estadoLocal = function () { const e = el0(); if (e) { const c = PET.cfg(); e.pt = c && c.ativo ? c.id : ''; } return e; };
    const rm0 = MP.removerAvatar;
    MP.removerAvatar = function (o) { if (o.pet) { PET.descartar(o.pet.m); o.pet = null; } rm0(o); };
  }
})();
