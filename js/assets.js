// ============================================================
//  Modelos 3D animados (glTF)
//  Personagens e esqueletos: KayKit (Kay Lousberg) — CC0
//  Criaturas: Quaternius — CC0
// ============================================================
'use strict';

const A3D = { gltf: {}, pronto: false, tpl: {} };
const ARQS_3D = ['Knight', 'Barbarian', 'Mage', 'Rogue', 'Rogue_Hooded', 'Skeleton_Minion', 'Skeleton_Mage', 'Skeleton_Rogue', 'Skeleton_Warrior',
  'Wolf', 'Eagle', 'Bat', 'Dragon', 'Slime', 'anim_herois', 'anim_esqueletos',
  'Skeleton_Axe', 'Skeleton_Blade', 'Skeleton_Crossbow', 'Skeleton_Staff', 'Skeleton_Shield_Small_A', 'Skeleton_Shield_Large_A'];

const CLIPS_HEROI = { idle: 'Idle', andar: 'Walking_A', correr: 'Running_A', golpe: '1H_Melee_Attack_Chop', giro: '2H_Melee_Attack_Spin', disparo: '1H_Ranged_Shoot',
  conjurar: 'Spellcast_Shoot', erguer: 'Cheer', morte: 'Death_A', dano: 'Hit_A', esquiva: 'Dodge_Forward', falar: 'Interact' };
const CLIPS_ESQ = Object.assign({}, CLIPS_HEROI, { idle: 'Idle_Combat', andar: 'Walking_D_Skeletons', erguer: 'Spellcast_Raise', surgir: 'Spawn_Ground_Skeletons' });

// configuração de cada modelo
const CFG_3D = {
  guerreiro: { arq: 'Knight', anim: 'anim_herois', clips: Object.assign({}, CLIPS_HEROI, { erguer: 'Cheer' }), altura: 1.95, mostrar: ['1H_Sword', 'Round_Shield', 'Knight_Helmet', 'Knight_Cape'] },
  cacadora: { arq: 'Rogue_Hooded', anim: 'anim_herois', clips: Object.assign({}, CLIPS_HEROI, { disparo: '2H_Ranged_Shoot', golpe: '1H_Melee_Attack_Slice_Diagonal' }), altura: 1.85, mostrar: ['2H_Crossbow', 'Rogue_Cape'] },
  feiticeira: { arq: 'Mage', anim: 'anim_herois', clips: Object.assign({}, CLIPS_HEROI, { golpe: 'Spellcast_Shoot', disparo: 'Spellcast_Shoot', erguer: 'Spellcast_Raise' }), altura: 1.9, mostrar: ['2H_Staff', 'Mage_Hat', 'Mage_Cape'] },
  npc_cavaleira: { arq: 'Knight', anim: 'anim_herois', clips: CLIPS_HEROI, altura: 1.95, mostrar: ['1H_Sword', 'Badge_Shield', 'Knight_Cape'] },
  npc_barbaro: { arq: 'Barbarian', anim: 'anim_herois', clips: CLIPS_HEROI, altura: 1.95, mostrar: ['Mug', 'Barbarian_Hat'] },
  npc_ferreiro: { arq: 'Barbarian', anim: 'anim_herois', clips: CLIPS_HEROI, altura: 2.0, mostrar: ['2H_Axe'] },
  npc_maga: { arq: 'Mage', anim: 'anim_herois', clips: CLIPS_HEROI, altura: 1.9, mostrar: ['Spellbook_open', 'Mage_Hat', 'Mage_Cape'] },
  npc_maga2: { arq: 'Mage', anim: 'anim_herois', clips: CLIPS_HEROI, altura: 1.9, mostrar: ['2H_Staff', 'Mage_Cape'] },
  npc_ladina: { arq: 'Rogue_Hooded', anim: 'anim_herois', clips: CLIPS_HEROI, altura: 1.85, mostrar: ['2H_Crossbow', 'Rogue_Cape'] },
  npc_nobre: { arq: 'Rogue', anim: 'anim_herois', clips: CLIPS_HEROI, altura: 1.85, mostrar: ['Rogue_Cape', 'Knife'] },
  esq_lacaio: { arq: 'Skeleton_Minion', anim: 'anim_esqueletos', clips: CLIPS_ESQ, altura: 1.8, armas: { 'handslotr': 'Skeleton_Blade', 'handslotl': 'Skeleton_Shield_Small_A' } },
  esq_afogado: { arq: 'Skeleton_Minion', anim: 'anim_esqueletos', clips: CLIPS_ESQ, altura: 1.85, armas: { 'handslotr': 'Skeleton_Blade' } },
  esq_arqueiro: { arq: 'Skeleton_Rogue', anim: 'anim_esqueletos', clips: Object.assign({}, CLIPS_ESQ, { disparo: '2H_Ranged_Shoot' }), altura: 1.85, armas: { 'handslotr': 'Skeleton_Crossbow' } },
  esq_guerreiro: { arq: 'Skeleton_Warrior', anim: 'anim_esqueletos', clips: CLIPS_ESQ, altura: 1.95, armas: { 'handslotr': 'Skeleton_Axe', 'handslotl': 'Skeleton_Shield_Small_A' } },
  esq_rei: { arq: 'Skeleton_Warrior', anim: 'anim_esqueletos', clips: Object.assign({}, CLIPS_ESQ, { golpe: '2H_Melee_Attack_Chop' }), altura: 1.95, armas: { 'handslotr': 'Skeleton_Axe', 'handslotl': 'Skeleton_Shield_Large_A' } },
  esq_mago: { arq: 'Skeleton_Mage', anim: 'anim_esqueletos', clips: Object.assign({}, CLIPS_ESQ, { golpe: 'Spellcast_Shoot' }), altura: 1.9, armas: { 'handslotr': 'Skeleton_Staff' } },
  lobo: { arq: 'Wolf', clips: { idle: 'WolfArmature|Idle', andar: 'WolfArmature|Walking', correr: 'WolfArmature|Walking' }, tamanho: 1.9, velCorrer: 1.9, bote: true, rotY: -Math.PI / 2 },
  aguia: { arq: 'Eagle', clips: { idle: 'EagleArmature|Flying', andar: 'EagleArmature|Flying', correr: 'EagleArmature|Flying' }, tamanho: 2.1, voa: 1.9, bote: true,
    cores: { Wings: 0x4a5664, Head: 0xd8dcd8, Beak: 0xd8a030, Claws: 0x2a2018 } },
  morcego: { arq: 'Bat', clips: { idle: 'BatArmature|Bat_Flying', andar: 'BatArmature|Bat_Flying', correr: 'BatArmature|Bat_Flying', golpe: 'BatArmature|Bat_Attack', morte: 'BatArmature|Bat_Death', dano: 'BatArmature|Bat_Hit' }, tamanho: 1.3, voa: 1.4,
    cores: { Main: 0x4a1a38, Belly: 0x9a6a40, Eyes: 0xff2020, Nose: 0x7a3050, Black: 0x100810 }, emissivo: { Eyes: 2.5 } },
  dragonete: { arq: 'Dragon', clips: { idle: 'DragonArmature|Dragon_Flying', andar: 'DragonArmature|Dragon_Flying', correr: 'DragonArmature|Dragon_Flying', golpe: 'DragonArmature|Dragon_Attack', conjurar: 'DragonArmature|Dragon_Attack2', disparo: 'DragonArmature|Dragon_Attack2', morte: 'DragonArmature|Dragon_Death', dano: 'DragonArmature|Dragon_Hit' }, tamanho: 1.8, voa: 1.2,
    cores: { Main: 0x8a2a14, Belly: 0xe0a030, Wings: 0x3a1008, Claws: 0x1a1010, Eyes: 0xffe040 }, emissivo: { Eyes: 2.5, Belly: 0.5 } },
  dragao_gelo: { arq: 'Dragon', clips: { idle: 'DragonArmature|Dragon_Flying', andar: 'DragonArmature|Dragon_Flying', correr: 'DragonArmature|Dragon_Flying', golpe: 'DragonArmature|Dragon_Attack', conjurar: 'DragonArmature|Dragon_Attack2', erguer: 'DragonArmature|Dragon_Attack2', morte: 'DragonArmature|Dragon_Death', dano: 'DragonArmature|Dragon_Hit' }, tamanho: 2.0, voa: 0.9,
    cores: { Main: 0x7aa8d0, Belly: 0xe8f4ff, Wings: 0x34587a, Claws: 0x1a2a3a, Eyes: 0x60e0ff }, emissivo: { Eyes: 3 } },
  lodo: { arq: 'Slime', clips: { idle: 'Armature|Slime_Idle', andar: 'Armature|Slime_Walk', correr: 'Armature|Slime_Walk', golpe: 'Armature|Slime_Attack', conjurar: 'Armature|Slime_Attack', erguer: 'Armature|Slime_Attack', morte: 'Armature|Slime_Death' }, tamanho: 1.3,
    cores: { Body: 0x6a7a24, Eyes: 0xd8ff40 }, emissivo: { Eyes: 2 }, translucido: true },
};

A3D.carregar = function (progresso) {
  if (!THREE.GLTFLoader || !THREE.SkeletonUtils) return Promise.resolve(false);
  const loader = new THREE.GLTFLoader();
  let feitos = 0;
  const fim = () => { feitos++; progresso && progresso(feitos / ARQS_3D.length); };
  // os modelos vêm em base64 (.glb.txt) e são decodificados aqui
  return Promise.all(ARQS_3D.map(n => fetch('modelos/' + n + '.glb.txt').then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).then(txt => new Promise((res, rej) => {
    const bin = atob(txt.trim()); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    loader.parse(u8.buffer, 'modelos/', g => { A3D.gltf[n] = g; res(); }, rej);
  })).catch(e => console.warn('Modelo não carregado:', n, e && e.message)).then(fim)))
    .then(() => { A3D.pronto = !!A3D.gltf.Knight; return A3D.pronto; });
};

// prepara o molde (escala, clipes) uma única vez por configuração
A3D.molde = function (chave) {
  if (A3D.tpl[chave]) return A3D.tpl[chave];
  const cfg = CFG_3D[chave]; if (!cfg) return null;
  const g = A3D.gltf[cfg.arq]; if (!g) return null;
  const cena = g.scene;
  cena.updateMatrixWorld(true);
  // esconder peças opcionais (armas, capas) que não estão na lista
  const opcionais = /Sword|Shield|Axe|Mug|Hat|Cape|Helmet|Staff|Wand|Spellbook|Crossbow|Knife|Throwable/;
  const box = new THREE.Box3();
  const v = new THREE.Vector3(), acc = new THREE.Vector3(), tmpV = new THREE.Vector3(), mtx = new THREE.Matrix4();
  const fator = (at) => { const arr = at.isInterleavedBufferAttribute ? at.data.array : at.array; return !at.normalized ? 1 : arr instanceof Int16Array ? 1 / 32767 : arr instanceof Uint16Array ? 1 / 65535 : arr instanceof Int8Array ? 1 / 127 : arr instanceof Uint8Array ? 1 / 255 : 1; };
  cena.traverse(o => {
    if (!o.isMesh) return;
    if (opcionais.test(o.name)) return; // só o corpo define a escala
    const at = o.geometry.attributes.position; const f = fator(at);
    const sk = o.isSkinnedMesh ? o.geometry.attributes.skinIndex : null, sw = o.isSkinnedMesh ? o.geometry.attributes.skinWeight : null;
    if (sk) o.skeleton.update();
    const fw = sw ? fator(sw) : 1;
    const passo = Math.max(1, Math.floor(at.count / 500));
    for (let i = 0; i < at.count; i += passo) {
      v.set(at.getX(i) * f, at.getY(i) * f, at.getZ(i) * f);
      if (sk) {
        v.applyMatrix4(o.bindMatrix); acc.set(0, 0, 0); let soma = 0;
        for (let k = 0; k < 4; k++) {
          const w = (k === 0 ? sw.getX(i) : k === 1 ? sw.getY(i) : k === 2 ? sw.getZ(i) : sw.getW(i)) * fw; if (!w) continue;
          const ji = k === 0 ? sk.getX(i) : k === 1 ? sk.getY(i) : k === 2 ? sk.getZ(i) : sk.getW(i);
          mtx.fromArray(o.skeleton.boneMatrices, ji * 16);
          tmpV.copy(v).applyMatrix4(mtx).multiplyScalar(w); acc.add(tmpV); soma += w;
        }
        if (soma > 0) v.copy(acc).divideScalar(soma).applyMatrix4(o.bindMatrixInverse);
      }
      v.applyMatrix4(o.matrixWorld); box.expandByPoint(v);
    }
  });
  const tam = box.getSize(new THREE.Vector3());
  const esc = cfg.altura ? cfg.altura / tam.y : cfg.tamanho / Math.max(tam.x, tam.y, tam.z);
  const fonte = cfg.anim ? A3D.gltf[cfg.anim] : g;
  const todos = (fonte && fonte.animations) || [];
  const clips = {};
  for (const [k, nome] of Object.entries(cfg.clips || {})) { const c = todos.find(a => a.name === nome); if (c) clips[k] = c; }
  A3D.tpl[chave] = { cfg, cena, esc, clips, base: box.min.y * esc, opcionais };
  return A3D.tpl[chave];
};

// cria uma instância animada com a mesma interface dos modelos procedurais
MOD.criar3D = function (chave, escala = 1, tinta = null) {
  if (!A3D.pronto) return null;
  const T = A3D.molde(chave); if (!T) return null;
  const cfg = T.cfg;
  const modelo = THREE.SkeletonUtils.clone(T.cena);
  const mats = [];
  const raiz = new THREE.Group();
  const pivo = new THREE.Group(); raiz.add(pivo); pivo.add(modelo);
  modelo.scale.setScalar(T.esc); modelo.position.y = -T.base;
  if (cfg.rotY) modelo.rotation.y = cfg.rotY;
  const corTinta = tinta != null ? new THREE.Color(tinta) : null;
  modelo.traverse(o => {
    if (!o.isMesh) return;
    if (cfg.mostrar && T.opcionais.test(o.name) && !cfg.mostrar.includes(o.name)) { o.visible = false; return; }
    o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
    const lista = Array.isArray(o.material) ? o.material : [o.material];
    const novos = lista.map(m0 => {
      const m = m0.clone();
      if (!m.isMeshStandardMaterial) { const s = new THREE.MeshStandardMaterial({ color: m.color, map: m.map || null, skinning: true }); m.dispose(); return prepararMat(s, m0.name); }
      return prepararMat(m, m0.name);
    });
    o.material = Array.isArray(o.material) ? novos : novos[0];
  });
  function prepararMat(m, nome) {
    m.skinning = true;
    m.roughness = 0.75; m.metalness = Math.min(m.metalness || 0, 0.3);
    if (cfg.cores && cfg.cores[nome] != null) m.color.set(cfg.cores[nome]);
    if (cfg.emissivo && cfg.emissivo[nome]) { m.emissive = m.color.clone(); m.emissiveIntensity = cfg.emissivo[nome]; }
    if (corTinta) m.color.multiply(corTinta);
    if (cfg.translucido && nome === 'Body') { m.transparent = true; m.opacity = 0.88; m.roughness = 0.2; }
    m.userData.emi = m.emissive.clone(); m.userData.emiI = m.emissiveIntensity;
    if (typeof GFX !== 'undefined') GFX.patchPersonagem(m, true);
    mats.push(m); return m;
  }
  // armas presas aos ossos das mãos
  if (cfg.armas) {
    for (const [osso, arq] of Object.entries(cfg.armas)) {
      const gA = A3D.gltf[arq]; if (!gA) continue;
      let alvo = null; modelo.traverse(o => { if (!alvo && o.name === osso) alvo = o; });
      if (!alvo) continue;
      const arma = gA.scene.clone(true);
      arma.traverse(o => { if (o.isMesh) { o.castShadow = true; const m = o.material.clone(); if (corTinta) m.color.multiply(corTinta); m.userData.emi = m.emissive.clone(); m.userData.emiI = m.emissiveIntensity; o.material = m; mats.push(m); } });
      alvo.add(arma);
    }
  }
  const mixer = new THREE.AnimationMixer(modelo);
  const m = { raiz, p: { raiz, corpo: pivo }, mats, rig: 'gltf', chave, cfg, T, mixer, acoes: {}, atual: null, escala, alturaCabeca: (cfg.altura || cfg.tamanho) * 1.02 + (cfg.voa || 0), tAnt: null };
  raiz.scale.setScalar(escala);
  m.blob = GFX.sombraContato(raiz, cfg.tamanho ? cfg.tamanho * 0.35 : 0.6);
  MOD.tocar(m, 'idle', true);
  return m;
};

MOD.acao3D = function (m, nome) {
  if (m.acoes[nome]) return m.acoes[nome];
  const clip = m.T.clips[nome]; if (!clip) return null;
  const a = m.mixer.clipAction(clip); m.acoes[nome] = a; return a;
};
MOD.tocar = function (m, nome, loop, fade = 0.18) {
  const a = MOD.acao3D(m, nome); if (!a) return false;
  if (m.atual === nome) return true;
  const ant = m.atual && m.acoes[m.atual];
  a.reset(); a.enabled = true; a.setEffectiveWeight(1);
  a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1); a.clampWhenFinished = !loop;
  a.timeScale = 1;
  a.play();
  if (ant) ant.crossFadeTo(a, fade, false);
  m.atual = nome; return true;
};

// mapeia o estado do jogo para animações
const ALIAS_ATQ = { golpe: ['golpe', 'conjurar'], giro: ['giro', 'golpe'], disparo: ['disparo', 'golpe', 'conjurar'], conjurar: ['conjurar', 'golpe'], erguer: ['erguer', 'conjurar', 'golpe'] };
MOD.animarGLTF = function (m, s) {
  const dt = m.tAnt == null ? 0 : Math.min(0.1, Math.max(0, s.t - m.tAnt)); m.tAnt = s.t;
  const cfg = m.cfg, pivo = m.p.corpo;
  if (m.surgirT > 0) { m.surgirT -= dt; if (MOD.tocar(m, 'surgir', false, 0.05)) { m.mixer.update(dt); return; } m.surgirT = 0; }
  let semClipeAtaque = false;
  if (m.morto) {
    if (!MOD.tocar(m, 'morte', false, 0.1)) { m.semMorte = true; }
  } else if (s.rolar && m.T.clips.esquiva) {
    MOD.tocar(m, 'esquiva', false, 0.08);
    const a = m.acoes.esquiva; if (a) { a.timeScale = 0; a.time = Math.min(1, s.rolar) * a.getClip().duration * 0.95; }
  } else if (s.atq != null) {
    const opcoes = ALIAS_ATQ[s.tipoAtq || 'golpe'] || ['golpe'];
    const nome = opcoes.find(n => m.T.clips[n]);
    if (nome) {
      if (m.atual !== nome || (m.ultAtq != null && s.atq < m.ultAtq - 0.3)) { m.atual = null; MOD.tocar(m, nome, false, 0.08); }
      const a = m.acoes[nome]; a.timeScale = 0; a.time = Math.min(0.999, s.atq) * a.getClip().duration;
    } else { semClipeAtaque = true; MOD.tocar(m, 'correr', true); }
    m.ultAtq = s.atq;
  } else {
    m.ultAtq = null;
    if (s.andar > 0.55 && m.T.clips.correr) { MOD.tocar(m, 'correr', true); const a = m.acoes.correr; if (a) a.timeScale = (cfg.velCorrer || 1) * Math.max(0.6, s.andar); }
    else if (s.andar > 0.12 && m.T.clips.andar) { MOD.tocar(m, 'andar', true); }
    else MOD.tocar(m, 'idle', true);
  }
  m.mixer.update(dt);
  // complementos procedurais
  let y = cfg.voa ? cfg.voa + Math.sin(s.t * 3) * 0.12 : 0;
  let z = 0;
  if ((semClipeAtaque || cfg.bote) && s.atq != null) { const e = Math.sin(Math.min(1, s.atq) * Math.PI); z = e * 0.7; if (cfg.voa) y -= e * 0.8; }
  if (m.morto && m.semMorte) { pivo.rotation.z = Math.min(1.45, (pivo.rotation.z || 0) + dt * 4); if (cfg.voa) y = Math.max(0, y - (m.mortoT || 0) * 3); }
  pivo.position.y = y; pivo.position.z = z;
};
