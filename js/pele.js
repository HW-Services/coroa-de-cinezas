// ============================================================
//  Pele realista dos monstros
//  Cada criatura recebe um perfil de superfície (escamas,
//  carapaça, quitina, pelo, osso, pedra, magma, gelo, lodo,
//  pele anfíbia, casca, penas, couro, carne) aplicado no shader:
//  - padrão procedural em projeção triplanar no espaço do modelo
//    (acompanha a animação, sem textura esticada)
//  - relevo por derivadas (bump), cavidades escurecidas e
//    rugosidade variável (partes úmidas brilham)
//  - translucidez nas bordas (lodo, gelo, carne, membranas)
//  - rachaduras e veios incandescentes que pulsam (magma, golem)
//  - pelagem em camadas (fur shells) para lobos, yetis e feras
// ============================================================
'use strict';

const PELE = { tex: {}, uTempo: { value: 0 } };
try { PELE.desligado = localStorage.getItem('cdc_pele_off') === '1'; } catch (e) { }

// ---------- texturas dos padrões (R = relevo, G = cor/cavidade, B = brilho) ----------
PELE.gerar = function (tipo) {
  if (PELE.tex[tipo]) return PELE.tex[tipo];
  const R = ruidoPeriodico(tipo.length * 131 + tipo.charCodeAt(0) * 7);
  const T = 256, c = document.createElement('canvas'); c.width = c.height = T;
  const g = c.getContext('2d'), img = g.createImageData(T, T);
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const u = x / T, v = y / T; let h = 0.5, cor = 1, bri = 0;
    switch (tipo) {
      case 'escamas': case 'penas': {
        const fil = tipo === 'penas' ? 10 : 14, col = tipo === 'penas' ? 7 : 12;
        const vy = v * fil, fy = vy - Math.floor(vy), ux = u * col + (Math.floor(vy) % 2) * 0.5, fx = ux - Math.floor(ux);
        const dx = (fx - 0.5) * (tipo === 'penas' ? 1.6 : 1), dy = fy * (tipo === 'penas' ? 0.8 : 1.1);
        const dome = 1 - clamp(Math.hypot(dx, dy - 0.15) * 1.6, 0, 1);
        h = dome * 0.85 + R.fbm(u, v, 16, 3) * 0.15;
        cor = 0.55 + dome * 0.5 + (R.n(Math.floor(ux) * 3.1, Math.floor(vy) * 5.7, 256) - 0.5) * 0.2;
        if (tipo === 'penas') { const raque = 1 - clamp(Math.abs(fx - 0.5) * 22, 0, 1); h = h * 0.8 + raque * 0.2; cor += raque * 0.15; cor *= 0.8 + Math.sin(fx * 60) * 0.06; }
        break;
      }
      case 'carapaca': case 'quitina': {
        const [f1, f2, id] = R.vor(u, v, tipo === 'quitina' ? 6 : 5);
        const borda = clamp((f2 - f1) / 0.12, 0, 1);
        const bolhas = R.fbm(u, v, 24, 3);
        h = Math.sqrt(borda) * 0.7 + bolhas * 0.3 - (tipo === 'quitina' ? Math.max(0, Math.sin(v * Math.PI * 18)) * 0.08 : 0);
        cor = 0.45 + borda * 0.5 + (id - 0.5) * 0.25 + bolhas * 0.1;
        break;
      }
      case 'pelo': {
        const fio = R.fbm(u * 1.0, v * 0.12, 64, 3), fio2 = R.n(u * 256, v * 32, 256);
        h = fio * 0.7 + fio2 * 0.3; cor = 0.6 + h * 0.5 + (R.fbm(u, v, 3, 3) - 0.5) * 0.3;
        break;
      }
      case 'osso': {
        const [p1, , pid] = R.vor(u, v, 18); const poro = pid > 0.55 ? clamp((0.25 - p1) / 0.15, 0, 1) : 0;
        const fissura = Math.pow(R.ridge(u, v, 5, 4), 14);
        h = 0.6 + R.fbm(u, v, 8, 4) * 0.4 - poro * 0.45 - fissura * 0.5;
        cor = 0.85 + (R.fbm(u + 0.3, v, 4, 3) - 0.5) * 0.35 - poro * 0.35 - fissura * 0.5;
        break;
      }
      case 'pedra': case 'magma': case 'gelo': {
        const [f1, f2] = R.vor(u + R.fbm(u, v, 4, 3) * 0.06, v, tipo === 'gelo' ? 4 : 6);
        const fenda = 1 - clamp((f2 - f1) / (tipo === 'gelo' ? 0.02 : 0.05), 0, 1);
        const f = R.fbm(u, v, 12, 4);
        h = (1 - fenda) * (0.55 + f * 0.45);
        cor = tipo === 'gelo' ? 0.85 + f * 0.25 - fenda * 0.15 : 0.5 + f * 0.5 - fenda * 0.45;
        bri = tipo === 'gelo' ? fenda * 0.6 : fenda * (0.6 + f * 0.4);
        break;
      }
      case 'lodo': {
        const [b1, , bid] = R.vor(u, v, 9); const bolha = bid > 0.5 ? clamp((0.35 - b1) / 0.2, 0, 1) : 0;
        h = 0.5 + R.fbm(u, v, 4, 4) * 0.4 + bolha * 0.35; cor = 0.8 + R.fbm(u, v, 3, 3) * 0.3 + bolha * 0.25; bri = bolha * 0.25;
        break;
      }
      case 'anfibia': {
        const mancha = sm(0.58, 0.64, R.fbm(u, v, 5, 4)); const [w1, , wid] = R.vor(u, v, 22); const verruga = wid > 0.6 ? clamp((0.3 - w1) / 0.2, 0, 1) : 0;
        h = 0.5 + verruga * 0.5 + R.fbm(u, v, 20, 2) * 0.2; cor = 1 - mancha * 0.55 + verruga * 0.15;
        break;
      }
      case 'casca': {
        const sulco = Math.pow(R.ridge(u * 1.0, v * 0.25, 10, 4), 2.5);
        h = sulco * 0.8 + R.fbm(u, v, 16, 3) * 0.2; cor = 0.4 + sulco * 0.7;
        const musgo = sm(0.6, 0.7, R.fbm(u + 0.5, v, 4, 4)); bri = 0; cor -= musgo * 0.15;
        break;
      }
      case 'couro': {
        const ruga = Math.pow(R.ridge(u, v, 14, 4), 3); h = 0.6 - ruga * 0.4 + R.fbm(u, v, 30, 2) * 0.2; cor = 0.8 - ruga * 0.35;
        break;
      }
      default: { // carne
        const veia = Math.pow(R.ridge(u, v, 4, 4), 10); const poro = R.n(u * 128, v * 128, 128);
        h = 0.55 + R.fbm(u, v, 10, 3) * 0.3 - veia * 0.25 - poro * 0.08; cor = 0.85 + (R.fbm(u, v, 3, 3) - 0.5) * 0.3 - veia * 0.3; bri = veia * 0.25;
      }
    }
    const k = (y * T + x) * 4;
    img.data[k] = clamp(h, 0, 1) * 255; img.data[k + 1] = clamp(cor * 0.5, 0, 1) * 255; img.data[k + 2] = clamp(bri, 0, 1) * 255; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.LinearEncoding; t.anisotropy = 4;
  return (PELE.tex[tipo] = t);
};

// ---------- perfis ----------
// dens: repetições por "tamanho do modelo"; bump: força do relevo; cav: escurecimento das cavidades;
// rug: rugosidade base; sss: cor e força da translucidez; brilho: cor dos veios; pelo: camadas de pelagem
const PERFIS_PELE = {
  escamas: { tex: 'escamas', dens: 7, bump: 1.4, cav: 0.55, rug: 0.45, met: 0.05, sss: [0xff8060, 0.12] },
  carapaca: { tex: 'carapaca', dens: 2.6, bump: 1.8, cav: 0.5, rug: 0.32, met: 0.08, sss: [0xff9070, 0.08] },
  quitina: { tex: 'quitina', dens: 3.2, bump: 1.6, cav: 0.45, rug: 0.28, met: 0.15, sss: [0x8060ff, 0.06] },
  pelo: { tex: 'pelo', dens: 5, bump: 0.9, cav: 0.6, rug: 0.92, met: 0, sss: [0xffd0b0, 0.05], pelo: 6 },
  penas: { tex: 'penas', dens: 5, bump: 1.1, cav: 0.55, rug: 0.8, met: 0, sss: [0xffe0c0, 0.04] },
  osso: { tex: 'osso', dens: 1.8, bump: 0.7, cav: 0.4, rug: 0.62, met: 0, sss: [0xfff0d0, 0.06] },
  ossoUmido: { tex: 'osso', dens: 1.8, bump: 0.7, cav: 0.45, rug: 0.35, met: 0, sss: [0x60c0a0, 0.1] },
  pedra: { tex: 'pedra', dens: 2.6, bump: 2.0, cav: 0.65, rug: 0.95, met: 0, brilho: [0xffa030, 1.6] },
  magma: { tex: 'magma', dens: 3, bump: 1.8, cav: 0.75, rug: 0.85, met: 0.05, brilho: [0xff4a10, 2.6] },
  gelo: { tex: 'gelo', dens: 2.2, bump: 0.9, cav: 0.2, rug: 0.12, met: 0.1, sss: [0x80d0ff, 0.45], brilho: [0x9ae8ff, 0.8] },
  lodo: { tex: 'lodo', dens: 2.4, bump: 0.8, cav: 0.25, rug: 0.12, met: 0, sss: [0xc0ff60, 0.5], brilho: [0xe0ff80, 0.5] },
  anfibia: { tex: 'anfibia', dens: 3.2, bump: 1.1, cav: 0.55, rug: 0.25, met: 0, sss: [0xc0ff80, 0.18] },
  casca: { tex: 'casca', dens: 3, bump: 2.0, cav: 0.7, rug: 0.95, met: 0, sss: [0x80a040, 0.05] },
  couro: { tex: 'couro', dens: 4, bump: 1.0, cav: 0.5, rug: 0.6, met: 0, sss: [0xff6050, 0.3] },
  carne: { tex: 'carne', dens: 3, bump: 0.9, cav: 0.45, rug: 0.5, met: 0, sss: [0xff5040, 0.25], brilho: [0xff2010, 0.3] },
};
const PELE_DO_MONSTRO = {
  afogado: 'ossoUmido', caranguejo: 'carapaca', harpia: 'penas', sapo: 'anfibia', lodoso: 'lodo', bruxa: 'osso',
  lobo: 'pelo', ent: 'casca', arqueiro: 'osso', aranha: 'quitina', morcego: 'couro', golem: 'pedra',
  escorpiao: 'quitina', mumia: 'osso', cultista: 'osso', yeti: 'pelo', elemental: 'gelo', loboGelo: 'pelo',
  diabrete: 'magma', salamandra: 'escamas', demonio: 'magma',
  mareth: 'carapaca', vhorra: 'lodo', morgrath: 'pelo', tecela: 'quitina', tuskar: 'osso', hrimfang: 'escamas', vorthak: 'magma',
};

// ---------- shader ----------
PELE.patch = function (mat, P, dens) {
  const tex = PELE.gerar(P.tex);
  const U = {
    tPele: { value: tex }, uDens: { value: dens }, uBump: { value: P.bump }, uCav: { value: 1 - P.cav },
    uSss: { value: new THREE.Color(P.sss ? P.sss[0] : 0) }, uSssK: { value: P.sss ? P.sss[1] : 0 },
    uBrilho: { value: new THREE.Color(P.brilho ? P.brilho[0] : 0) }, uBrilhoK: { value: P.brilho ? P.brilho[1] : 0 },
    uTempo: PELE.uTempo, uRim: GFX.uRim,
  };
  mat.roughness = P.rug; mat.metalness = P.met || 0;
  if (P.tinta) mat.color.multiply(new THREE.Color(P.tinta));
  mat.normalMap = null;
  mat.extensions = Object.assign(mat.extensions || {}, { derivatives: true });
  mat.userData.pele = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vPosPele;\nvarying vec3 vNorPele;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosPele = position;\nvNorPele = normalize(objectNormal);');
    sh.fragmentShader = `uniform sampler2D tPele; uniform float uDens, uBump, uCav, uSssK, uBrilhoK, uTempo; uniform vec3 uSss, uBrilho, uRim;
varying vec3 vPosPele; varying vec3 vNorPele;
vec3 gPele; float hPele;
vec3 amostraPele(vec3 p, vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-5);
  return texture2D(tPele, p.zy).rgb * w.x + texture2D(tPele, p.xz).rgb * w.y + texture2D(tPele, p.xy).rgb * w.z;
}
` + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
  gPele = amostraPele(vPosPele * uDens, normalize(vNorPele));
  hPele = gPele.r;
  diffuseColor.rgb *= mix(uCav, 1.0, smoothstep(0.1, 0.7, gPele.r)) * (0.7 + gPele.g * 0.8);`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness * mix(1.2, 0.8, hPele);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  {
    vec3 pSup = -vViewPosition; vec3 pDx = dFdx(pSup), pDy = dFdy(pSup);
    float pHx = dFdx(hPele), pHy = dFdy(hPele);
    vec3 pR1 = cross(pDy, normal), pR2 = cross(normal, pDx);
    float pDet = dot(pDx, pR1);
    vec3 pGrad = sign(pDet) * (pHx * pR1 + pHy * pR2);
    normal = normalize(abs(pDet) * normal - pGrad * uBump * 0.3);
  }`)
      .replace('#include <dithering_fragment>', `
  float rimP = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
  gl_FragColor.rgb += uRim * pow(rimP, 3.0) * (0.6 + 0.4 * normal.y);
  gl_FragColor.rgb += uSss * uSssK * pow(rimP, 1.6) * (0.6 + 0.4 * gPele.r);
  gl_FragColor.rgb += uBrilho * uBrilhoK * gPele.b * (0.75 + 0.25 * sin(uTempo * 2.6 + vPosPele.y * 4.0));
  #include <dithering_fragment>`);
  };
  mat.customProgramCacheKey = () => 'pele_v1';
  mat.needsUpdate = true;
};

// ---------- pelagem em camadas ----------
PELE.matPelo = function (base, camada, n, raioObj) {
  const m = new THREE.MeshStandardMaterial({ color: base.color.clone().multiplyScalar(0.75 + 0.3 * camada / n), roughness: 0.95, metalness: 0, transparent: false, alphaTest: 0.5 });
  const U = { uDesl: { value: (camada / n) * 0.055 * raioObj }, uK: { value: camada / n }, uDens: { value: 38 / Math.max(0.05, raioObj) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform float uDesl;\nvarying vec3 vPosPelo;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(objectNormal) * uDesl;\ntransformed.y -= uDesl * uDesl * 6.0;\nvPosPelo = position;');
    sh.fragmentShader = 'uniform float uK, uDens;\nvarying vec3 vPosPelo;\nfloat hashP(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n' + sh.fragmentShader
      .replace('#include <alphatest_fragment>', `
  float fio = hashP(floor(vPosPelo * uDens));
  if (fio < uK * 0.92 + 0.05) discard;
  diffuseColor.rgb *= 0.55 + uK * 0.6;`);
  };
  m.customProgramCacheKey = () => 'pelo_v2';
  return m;
};
PELE.criarPelo = function (raiz, mesh, n, raioObj) {
  const camadas = [];
  for (let i = 1; i <= n; i++) {
    const mat = PELE.matPelo(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material, i, n, raioObj);
    let s;
    if (mesh.isSkinnedMesh) { s = new THREE.SkinnedMesh(mesh.geometry, mat); s.bind(mesh.skeleton, mesh.bindMatrix); }
    else s = new THREE.Mesh(mesh.geometry, mat);
    s.position.copy(mesh.position); s.quaternion.copy(mesh.quaternion); s.scale.copy(mesh.scale);
    s.castShadow = false; s.receiveShadow = true; s.frustumCulled = false; s.userData.pelo = true;
    mesh.parent.add(s); camadas.push(s);
  }
  return camadas;
};

// ---------- aplicação ----------
PELE.qualidadeAlta = () => GFX.qualidade !== 'media';
PELE.aplicar = function (m, perfilId) {
  const P = PERFIS_PELE[perfilId]; if (!P || !m || !m.raiz || m._pele || PELE.desligado) return;
  m._pele = perfilId;
  // tamanho do modelo para a densidade do padrão
  const malhas = [];
  // tecidos e acessórios (capuz, capa, chapéu, elmo) não recebem pele: ganham material próprio sem o padrão
  const TECIDO = /Hood|Cape|Cloak|Hat|Helmet|Crossbow|Sword|Shield|Axe|Staff|Blade/i;
  m.raiz.traverse(o => {
    if (!o.isMesh || !o.material || o.userData.pelo || o.material.type === 'MeshBasicMaterial') return;
    if (TECIDO.test(o.name) && !Array.isArray(o.material)) { const c = o.material.clone(); c.userData.emi = o.material.emissive.clone(); c.userData.emiI = o.material.emissiveIntensity; if (typeof GFX !== 'undefined') GFX.patchPersonagem(c, true); if (m.mats) m.mats.push(c); o.material = c; return; }
    malhas.push(o);
  });
  const feitos = new Set();
  for (const o of malhas) {
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    // modelos animados: o padrão segue o tamanho do modelo; peças procedurais (primitivas unitárias): segue a escala da peça
    const escPeca = (Math.abs(o.scale.x) + Math.abs(o.scale.y) + Math.abs(o.scale.z)) / 3;
    const dens = 0.42 * (o.isSkinnedMesh ? P.dens / Math.max(0.2, o.geometry.boundingSphere.radius) : P.dens * 0.9 * Math.max(0.05, escPeca) * Math.max(0.3, o.geometry.boundingSphere.radius));
    for (const mat of mats) {
      if (feitos.has(mat) || !mat.isMeshStandardMaterial) continue;
      // olhos e partes que brilham ficam como estão
      if (mat.emissiveIntensity > 0.6 && mat.emissive && (mat.emissive.r + mat.emissive.g + mat.emissive.b) > 0.2) continue;
      if (mat.transparent && mat.opacity < 0.6) continue;
      feitos.add(mat);
      PELE.patch(mat, P, dens);
    }
  }
  // pelagem
  if (P.pelo && PELE.qualidadeAlta()) {
    m.pelos = [];
    for (const o of malhas) {
      if (!o.visible) continue;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!mat.userData.pele) continue;
      const raio = o.geometry.boundingSphere.radius * (o.isSkinnedMesh ? 1 : (Math.abs(o.scale.x) + Math.abs(o.scale.y) + Math.abs(o.scale.z)) / 3);
      if (!o.isSkinnedMesh && raio < 0.08) continue;
      m.pelos.push(...PELE.criarPelo(m.raiz, o, P.pelo, o.isSkinnedMesh ? raio : 1));
    }
  }
};
PELE.perfilDe = (e) => PELE_DO_MONSTRO[e.tipo] || (e.d && e.d.rig === 'slime' ? 'lodo' : e.d && e.d.rig === 'elemental' ? 'gelo' : e.d && e.d.rig === 'aranha' ? 'quitina' : 'carne');

{
  const ci0 = J.criarInimigo;
  J.criarInimigo = function () { const e = ci0.apply(this, arguments); try { if (e && e.m) PELE.aplicar(e.m, PELE.perfilDe(e)); } catch (err) { console.warn('pele', err); } return e; };
  const cc0 = J.criarChefe;
  J.criarChefe = function () { const e = cc0.apply(this, arguments); try { if (e && e.m) PELE.aplicar(e.m, PELE.perfilDe(e)); } catch (err) { console.warn('pele', err); } return e; };
  // tempo dos veios e pelagem só perto da câmera (economiza desenho)
  const at0 = J.atualizar;
  J.atualizar = function (dt) {
    at0.apply(this, arguments);
    PELE.uTempo.value += dt || 0;
    const c = ENG.camera && ENG.camera.position; if (!c || !J.inimigos) return;
    for (const e of J.inimigos) if (e.m && e.m.pelos) { const perto = !e.morto && Math.hypot(e.x - c.x, e.z - c.z) < 38; for (const s of e.m.pelos) s.visible = perto; }
  };
}
// gera as texturas de pele aos poucos, em segundo plano, para não travar ao entrar numa zona
setTimeout(function preparar() {
  const falta = Object.values(PERFIS_PELE).map(p => p.tex).find(t => !PELE.tex[t]);
  if (!falta || typeof ruidoPeriodico === 'undefined') return;
  PELE.gerar(falta); setTimeout(preparar, 250);
}, 4000);
