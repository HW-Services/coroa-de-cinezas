// ============================================================
//  Modelos realistas (.glb) definidos em modelos/realista/manifesto.json
//  Cada entrada troca o modelo de monstros, chefes, NPCs ou classes.
//  Aceita .glb comprimidos (Draco, Meshopt, texturas KTX2/WebP),
//  materiais PBR completos e animações em arquivos separados
//  (por exemplo, exportadas do Mixamo, uma por arquivo).
//  Formato: veja modelos/realista/LEIA-ME.md
// ============================================================
'use strict';

const REAL = { pasta: 'modelos/realista/', entradas: [], erros: [] };

// nomes de animação reconhecidos automaticamente
const REAL_CLIPES = [
  ['idle', /idle|survey|stand|breath|parad|rest|espera/i],
  ['andar', /walk|andar|stroll/i],
  ['correr', /run|sprint|gallop|trot|correr|jog/i],
  ['golpe', /attack|bite|slash|punch|strike|melee|claw|swipe|ataque|golpe|mordida/i],
  ['disparo', /shoot|ranged|throw|bow|arrow|disparo|tiro/i],
  ['conjurar', /cast|spell|magic|conjur|feiti/i],
  ['erguer', /roar|howl|taunt|scream|cheer|rugido|uivo/i],
  ['morte', /death|die|dying|dead|morte|morrer/i],
  ['dano', /hit|hurt|damage|react|impact|dano/i],
  ['esquiva', /dodge|roll|evade|esquiva/i],
  ['surgir', /spawn|emerge|rise|surgir|levantar/i],
];
REAL.mapearClipes = function (nomes, dado) {
  const out = {};
  if (dado) for (const [k, v] of Object.entries(dado)) if (nomes.includes(v)) out[k] = v;
  for (const [k, rx] of REAL_CLIPES) {
    if (out[k]) continue;
    const n = nomes.find(x => rx.test(x) && !Object.values(out).includes(x)) || nomes.find(x => rx.test(x));
    if (n) out[k] = n;
  }
  if (!out.idle && nomes.length) out.idle = nomes[0];
  if (!out.correr && out.andar) out.correr = out.andar;
  if (!out.andar && out.correr) out.andar = out.correr;
  return out;
};

REAL.loader = function () {
  if (REAL._ld) return REAL._ld;
  const ld = new THREE.GLTFLoader();
  try { const dr = new THREE.DRACOLoader(); dr.setDecoderPath('js/vendor/draco/'); ld.setDRACOLoader(dr); } catch (e) { }
  try { if (ENG.renderer) { const k = new THREE.KTX2Loader(); k.setTranscoderPath('js/vendor/basis/'); k.detectSupport(ENG.renderer); ld.setKTX2Loader(k); } } catch (e) { }
  try { ld.setMeshoptDecoder(THREE.MeshoptDecoder); } catch (e) { }
  REAL._ld = ld; return ld;
};
REAL.abrir = (arq) => new Promise((ok, falha) => REAL.loader().load(REAL.pasta + arq, ok, undefined, falha));

// prepara um gltf: texturas nítidas em ângulo, sombras
REAL.preparar = function (g, e) {
  const aniso = ENG.renderer ? ENG.renderer.capabilities.getMaxAnisotropy() : 4;
  const json = g.parser && g.parser.json, assoc = g.parser && g.parser.associations;
  g.scene.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      // o glTF assume metal = 1 quando o arquivo não informa; quase sempre é omissão do exportador
      const idx = assoc && assoc.get(m) && assoc.get(m).materials;
      const def = json && json.materials && idx != null ? json.materials[idx] : null;
      const pbr = def && def.pbrMetallicRoughness;
      if (pbr && pbr.metallicFactor === undefined && !pbr.metallicRoughnessTexture && m.metalness === 1) m.metalness = 0;
      if (e && e.metal != null) m.metalness = e.metal;
      if (e && e.rugosidade != null) m.roughness = e.rugosidade;
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) if (m[k]) m[k].anisotropy = aniso;
    }
  });
};

REAL.carregar = async function (progresso) {
  let man = null;
  try { const r = await fetch(REAL.pasta + 'manifesto.json', { cache: 'no-cache' }); if (r.ok) man = await r.json(); } catch (e) { }
  if (!man || !Array.isArray(man.modelos) || !man.modelos.length) return false;
  const lista = man.modelos.filter(e => e && e.arquivo && e.ativo !== false);
  let feitos = 0;
  for (const e of lista) {
    try {
      const g = await REAL.abrir(e.arquivo); REAL.preparar(g, e);
      const chaveArq = 'real:' + e.arquivo; A3D.gltf[chaveArq] = g;
      // animações extras (arquivos separados com o mesmo esqueleto)
      let fonte = null;
      const extras = Array.isArray(e.animacoes) ? e.animacoes : e.animacoes ? [e.animacoes] : [];
      if (extras.length) {
        const clips = [...g.animations];
        for (const arqA of extras) {
          try {
            const gA = await REAL.abrir(arqA);
            const base = arqA.replace(/^.*\//, '').replace(/\.(glb|gltf)$/i, '');
            gA.animations.forEach((c, i) => { if (gA.animations.length === 1 || /mixamo\.com|^Take ?\d*$|^Armature\|?mixamo/i.test(c.name)) c.name = gA.animations.length === 1 ? base : base + '_' + i; clips.push(c); });
          } catch (err) { REAL.erros.push(arqA + ': ' + (err && err.message)); }
        }
        fonte = 'real-anim:' + e.arquivo; A3D.gltf[fonte] = { animations: clips, scene: g.scene };
      }
      const nomes = (fonte ? A3D.gltf[fonte].animations : g.animations).map(c => c.name);
      const chave = 'real_' + (e.id || e.arquivo.replace(/\.(glb|gltf)$/i, '').replace(/\W+/g, '_'));
      const cfg = {
        arq: chaveArq, anim: fonte || undefined, clips: REAL.mapearClipes(nomes, e.clipes), realista: true,
        rotY: e.rotY != null ? e.rotY * Math.PI / 180 : 0,
        voa: e.voa || 0, bote: !!e.bote, velCorrer: e.velCorrer || 1,
        armas: e.armas || undefined, emissivo: e.emissivo || undefined, translucido: !!e.translucido,
      };
      if (e.altura) cfg.altura = e.altura; else cfg.tamanho = e.tamanho || 1.8;
      CFG_3D[chave] = cfg;
      const tinta = e.manterTinta ? undefined : null;
      for (const t of e.monstros || []) {
        const d = (typeof INIMIGOS !== 'undefined' && INIMIGOS[t]) || (typeof CHEFES !== 'undefined' && CHEFES[t]);
        if (d) { d.modelo3d = chave; if (tinta === null) d.tinta3d = null; } else REAL.erros.push('monstro desconhecido: ' + t);
      }
      for (const n of e.npcs || []) { if (typeof NPCS !== 'undefined' && NPCS[n]) { NPCS[n].modelo3d = chave; if (tinta === null) NPCS[n].tinta3d = null; } }
      for (const c of e.classes || []) CFG_3D[c] = Object.assign({}, cfg);
      REAL.entradas.push({ chave, arquivo: e.arquivo, clipes: cfg.clips, nomes });
    } catch (err) { REAL.erros.push(e.arquivo + ': ' + (err && err.message)); }
    feitos++; progresso && progresso(feitos / lista.length);
  }
  if (REAL.erros.length) console.warn('Modelos realistas com problema:', REAL.erros);
  return REAL.entradas.length > 0;
};

{
  const c0 = A3D.carregar;
  A3D.carregar = function (progresso) {
    return c0.call(A3D, p => progresso && progresso(p * 0.85)).then(ok => REAL.carregar(p => progresso && progresso(0.85 + p * 0.15)).then(() => ok, () => ok));
  };
  // modelos realistas usam o próprio material PBR (sem a pele procedural)
  const ap0 = PELE.aplicar;
  PELE.aplicar = function (m) { if (m && m.cfg && m.cfg.realista) return; return ap0.apply(this, arguments); };
}
