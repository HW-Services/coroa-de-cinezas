// ============================================================
//  Gráficos avançados: fluxo linear, pós-processamento, texturas
//  procedurais, terreno em camadas, grama, água, lava, decalques
// ============================================================
'use strict';

// ---------- cores em sRGB convertidas para linear (iluminação física) ----------
(function () {
  const P = THREE.Color.prototype;
  const setHex = P.setHex, setStyle = P.setStyle;
  let dentro = false;
  P.setHex = function (h) { setHex.call(this, h); if (!dentro) this.convertSRGBToLinear(); return this; };
  P.setStyle = function (s) { dentro = true; try { setStyle.call(this, s); } finally { dentro = false; } return this.convertSRGBToLinear(); };
})();

const GFX = { tempo: 0, tex: {}, decals: [], qualidade: 'ultra' };
const QUALIDADES_GFX = {
  media: { nome: 'Média', pr: 1, sombra: 2048, ao: false, grama: 7000, bloom: true },
  alta: { nome: 'Alta', pr: 1.5, sombra: 2048, ao: true, grama: 16000, bloom: true },
  ultra: { nome: 'Ultra', pr: 2, sombra: 4096, ao: true, grama: 32000, bloom: true, smaa: true },
};
try { const q = localStorage.getItem('coroaDeCinzas_gfx'); if (q && QUALIDADES_GFX[q]) GFX.qualidade = q; } catch (e) { }

// ============================================================
//  Sombras suaves com penumbra variável (PCSS)
//  Perto do objeto a sombra é nítida; longe dele, difusa, como sob o sol real.
//  O trecho é compilado nos shaders no início, por isso vale a partir do próximo carregamento.
// ============================================================
GFX.pcss = GFX.qualidade !== 'media';
GFX.instalarPCSS = function () {
  if (!GFX.pcss || GFX._pcssOk) return; GFX._pcssOk = true;
  const C = THREE.ShaderChunk;
  const funcoes = `
  #define PCSS_AMOSTRAS 16
  vec2 discoPCSS[PCSS_AMOSTRAS];
  void iniciarDiscoPCSS(const in vec2 semente) {
    float ang = rand(semente) * PI2, raio = 1.0 / float(PCSS_AMOSTRAS);
    for (int i = 0; i < PCSS_AMOSTRAS; i++) { discoPCSS[i] = vec2(cos(ang), sin(ang)) * pow(raio, 0.75); raio += 1.0 / float(PCSS_AMOSTRAS); ang += PI2 * 7.0 / float(PCSS_AMOSTRAS); }
  }
  float sombraPCSS(sampler2D mapa, vec2 tamMapa, vec4 c) {
    iniciarDiscoPCSS(c.xy);
    float texel = 1.0 / tamMapa.x;
    // 1) profundidade média de quem bloqueia a luz
    float busca = 0.0065, soma = 0.0; float n = 0.0;
    for (int i = 0; i < PCSS_AMOSTRAS; i++) { float d = unpackRGBAToDepth(texture2D(mapa, c.xy + discoPCSS[i] * busca)); if (d < c.z) { soma += d; n += 1.0; } }
    if (n < 0.5) return 1.0;
    float bloqueio = soma / n;
    // 2) penumbra proporcional à distância bloqueador → receptor (sol com ~1,7° de diâmetro aparente)
    float raioF = clamp((c.z - bloqueio) * 0.06, texel * 1.5, 0.006);
    // 3) filtragem
    float luz = 0.0;
    for (int i = 0; i < PCSS_AMOSTRAS; i++) {
      luz += step(c.z, unpackRGBAToDepth(texture2D(mapa, c.xy + discoPCSS[i] * raioF)));
      luz += step(c.z, unpackRGBAToDepth(texture2D(mapa, c.xy - discoPCSS[i].yx * raioF)));
    }
    return luz / float(2 * PCSS_AMOSTRAS);
  }
`;
  let sh = C.shadowmap_pars_fragment;
  sh = sh.replace('#ifdef USE_SHADOWMAP', '#ifdef USE_SHADOWMAP\n' + funcoes);
  sh = sh.replace('#if defined( SHADOWMAP_TYPE_PCF )', 'return sombraPCSS( shadowMap, shadowMapSize, shadowCoord );\n\t\t#if defined( SHADOWMAP_TYPE_PCF )');
  C.shadowmap_pars_fragment = sh;
};
GFX.instalarPCSS();

// ============================================================
//  Ruído periódico e Voronoi (texturas que repetem sem emenda)
// ============================================================
function ruidoPeriodico(seed) {
  const rnd = mulberry32(seed);
  const P = 256; const val = new Float32Array(P * P); for (let i = 0; i < P * P; i++) val[i] = rnd();
  const n = (x, y, per) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const m = (a, b) => val[((((a % per) + per) % per) & 255) * P + ((((b % per) + per) % per) & 255)];
    const a = m(xi, yi), b = m(xi + 1, yi), c = m(xi, yi + 1), d = m(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  // u,v em [0,1)
  const fbm = (u, v, per, oct = 5) => { let s = 0, a = 1, t = 0, p = per; for (let i = 0; i < oct; i++) { s += n(u * p, v * p, p) * a; t += a; a *= 0.5; p *= 2; } return s / t; };
  const ridge = (u, v, per, oct = 5) => { let s = 0, a = 1, t = 0, p = per; for (let i = 0; i < oct; i++) { s += (1 - Math.abs(n(u * p, v * p, p) * 2 - 1)) * a; t += a; a *= 0.5; p *= 2; } return s / t; };
  // Voronoi periódico: retorna [F1, F2, id]
  const pts = new Float32Array(64 * 64 * 2); for (let i = 0; i < pts.length; i++) pts[i] = rnd();
  const vor = (u, v, per) => {
    const x = u * per, y = v * per; const xi = Math.floor(x), yi = Math.floor(y);
    let f1 = 9, f2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = xi + i, cy = yi + j; const wx = ((cx % per) + per) % per, wy = ((cy % per) + per) % per;
      const k = (wy * 64 + wx) * 2; const px = cx + pts[k], py = cy + pts[k + 1];
      const d = Math.hypot(px - x, py - y);
      if (d < f1) { f2 = f1; f1 = d; id = pts[k] * 0.7 + pts[k + 1] * 0.3; } else if (d < f2) f2 = d;
    }
    return [f1, f2, id];
  };
  return { n, fbm, ridge, vor };
}

// gera par albedo + normal a partir de uma função altura(u,v) -> [altura, luminância, matiz]
function gerarMaterialTex(tam, fn, forcaNormal = 3) {
  const alt = new Float32Array(tam * tam);
  const cA = document.createElement('canvas'); cA.width = cA.height = tam;
  const gA = cA.getContext('2d'); const iA = gA.createImageData(tam, tam);
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    const [h, l, r, g, b] = fn(x / tam, y / tam);
    alt[y * tam + x] = h;
    const k = (y * tam + x) * 4;
    iA.data[k] = clamp(l * r, 0, 1) * 255; iA.data[k + 1] = clamp(l * g, 0, 1) * 255; iA.data[k + 2] = clamp(l * b, 0, 1) * 255; iA.data[k + 3] = 255;
  }
  gA.putImageData(iA, 0, 0);
  const cN = document.createElement('canvas'); cN.width = cN.height = tam;
  const gN = cN.getContext('2d'); const iN = gN.createImageData(tam, tam);
  const H = (x, y) => alt[(((y % tam) + tam) % tam) * tam + (((x % tam) + tam) % tam)];
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    const dx = (H(x - 1, y) - H(x + 1, y)) * forcaNormal, dy = (H(x, y - 1) - H(x, y + 1)) * forcaNormal;
    const L = Math.hypot(dx, dy, 1); const k = (y * tam + x) * 4;
    iN.data[k] = (dx / L * 0.5 + 0.5) * 255; iN.data[k + 1] = (dy / L * 0.5 + 0.5) * 255; iN.data[k + 2] = (1 / L * 0.5 + 0.5) * 255; iN.data[k + 3] = 255;
  }
  gN.putImageData(iN, 0, 0);
  const tA = new THREE.CanvasTexture(cA), tN = new THREE.CanvasTexture(cN);
  for (const t of [tA, tN]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ENG.renderer.capabilities.getMaxAnisotropy(); }
  tA.encoding = THREE.sRGBEncoding;
  return [tA, tN];
}

GFX.gerarTexturas = function () {
  const R = ruidoPeriodico(1234);
  const T = 512;
  // solo: terra/grama com cascalho
  [GFX.tex.soloA, GFX.tex.soloN] = gerarMaterialTex(T, (u, v) => {
    const f = R.fbm(u, v, 6, 6); const f2 = R.fbm(u + 0.37, v + 0.11, 24, 3);
    const [d1, , id] = R.vor(u, v, 40);
    const pedra = id > 0.72 ? clamp((0.32 - d1) / 0.2, 0, 1) : 0;
    const h = f * 0.7 + f2 * 0.25 + pedra * 0.5;
    const l = 0.42 + (f - 0.5) * 0.5 + (f2 - 0.5) * 0.25 + pedra * 0.18;
    const m = (R.fbm(u + 0.5, v + 0.2, 4, 3) - 0.5) * 0.25;
    return [h, l, 1 + m, 1, 1 - m];
  }, 4);
  // caminho: terra batida com seixos, sulcos e pedrinhas
  [GFX.tex.camA, GFX.tex.camN] = gerarMaterialTex(T, (u, v) => {
    const f = R.fbm(u, v, 8, 6), f3 = R.fbm(u + 0.9, v, 32, 3);
    const [c1, , cid] = R.vor(u + 0.5, v + 0.5, 36); const seixo = cid > 0.62 ? clamp((0.34 - c1) / 0.18, 0, 1) : 0;
    const [p1, , pid] = R.vor(u + 0.2, v + 0.8, 90); const grao = pid > 0.5 ? clamp((0.4 - p1) / 0.25, 0, 1) : 0;
    const sulco = Math.pow(R.ridge(u + 0.13, v + 0.4, 3, 4), 6);
    const h = f * 0.45 + f3 * 0.15 + seixo * (0.55 + cid * 0.2) + grao * 0.15 - sulco * 0.25;
    const l = 0.36 + (f - 0.5) * 0.3 + (f3 - 0.5) * 0.14 + seixo * (0.1 + (cid - 0.6) * 0.6) + grao * 0.06 - sulco * 0.1;
    const m = (R.fbm(u + 0.3, v + 0.6, 3, 3) - 0.5) * 0.18 + seixo * (cid - 0.8) * 0.2;
    return [h, l, 1.05 + m, 1, 0.92 - m];
  }, 5);
  // calçamento das cidades: pedras arredondadas com rejunte
  [GFX.tex.calcA, GFX.tex.calcN] = gerarMaterialTex(T, (u, v) => {
    const [f1, f2, id] = R.vor(u, v, 11);
    const borda = clamp((f2 - f1) / 0.16, 0, 1); const bord = Math.sqrt(borda);
    const f = R.fbm(u, v, 16, 4), f3 = R.fbm(u + 0.4, v + 0.2, 48, 2);
    const desgaste = R.fbm(u + 0.7, v + 0.1, 3, 3);
    const h = bord * (0.6 + id * 0.15) + f * 0.12 + f3 * 0.06;
    const l = borda < 0.08 ? 0.16 + f3 * 0.08 : (0.34 + id * 0.2 + (f - 0.5) * 0.18 + (f3 - 0.5) * 0.08) * (0.85 + desgaste * 0.3) * (0.82 + bord * 0.18);
    const m = (id - 0.5) * 0.12;
    return [h, l, 1.0 + m, 0.98, 0.95 - m * 0.5];
  }, 6);
  // casca de árvore: sulcos verticais
  [GFX.tex.cascaA, GFX.tex.cascaN] = gerarMaterialTex(256, (u, v) => {
    const r = R.ridge(u * 1, v * 0.25, 6, 4); const f = R.fbm(u, v, 12, 4);
    const h = Math.pow(r, 2.2) * 0.8 + f * 0.2;
    return [h, 0.3 + h * 0.5, 1.05, 1, 0.95];
  }, 5);
  // telhas de barro em fileiras
  [GFX.tex.telhaA, GFX.tex.telhaN] = gerarMaterialTex(256, (u, v) => {
    const fil = 8, col = 6; const vy = v * fil, fy = vy - Math.floor(vy);
    const ux = u * col + (Math.floor(vy) % 2) * 0.5; const fx = ux - Math.floor(ux);
    const id = R.n(Math.floor(ux) * 7.3 % 256, Math.floor(vy) * 3.1 % 256);
    const curva = Math.sin(fx * Math.PI); const f = R.fbm(u, v, 16, 3);
    const h = curva * 0.55 + fy * 0.45 + f * 0.1;
    const l = (0.32 + curva * 0.22 + id * 0.12 + f * 0.08) * (0.55 + fy * 0.45);
    return [h, l, 1, 1, 1];
  }, 5);
  // reboco (paredes)
  [GFX.tex.rebocoA, GFX.tex.rebocoN] = gerarMaterialTex(256, (u, v) => {
    const f = R.fbm(u, v, 6, 5), f2 = R.fbm(u + 0.3, v, 32, 3); const mancha = clamp((R.fbm(u + 0.5, v + 0.5, 3, 4) - 0.55) * 4, 0, 1);
    return [f * 0.5 + f2 * 0.3, 0.62 + (f - 0.5) * 0.15 + (f2 - 0.5) * 0.08 - mancha * 0.12, 1, 0.98, 0.95];
  }, 2);
  // madeira em tábuas
  [GFX.tex.madeiraA, GFX.tex.madeiraN] = gerarMaterialTex(256, (u, v) => {
    const tb = 4, ft = u * tb - Math.floor(u * tb), id = Math.floor(u * tb);
    const veio = R.fbm(u * 0.3 + id * 0.17, v * 4, 4, 5); const sulco = ft < 0.05 || ft > 0.95 ? 1 : 0;
    const h = veio * 0.5 - sulco * 0.5; const l = (0.36 + veio * 0.3 + (id % 2) * 0.05) * (1 - sulco * 0.55);
    return [h, l, 1.05, 1, 0.92];
  }, 4);
  // rocha: estratos e rachaduras
  [GFX.tex.rochaA, GFX.tex.rochaN] = gerarMaterialTex(T, (u, v) => {
    const r = R.ridge(u, v, 4, 6); const st = Math.sin((v + R.fbm(u, v, 3, 3) * 0.35) * Math.PI * 2 * 7) * 0.5 + 0.5;
    const [f1, f2] = R.vor(u + R.fbm(u, v, 5, 3) * 0.08, v, 5); const fenda = clamp((f2 - f1) / 0.035, 0, 1);
    const lasca = R.fbm(u + 0.2, v + 0.6, 10, 4);
    const h = r * 0.7 + st * 0.2 + fenda * 0.12 + lasca * 0.15;
    const l = (0.3 + r * 0.3 + st * 0.1 + (lasca - 0.5) * 0.15) * (0.8 + fenda * 0.2);
    return [h, l, 1.02, 1, 0.97];
  }, 5);
  // pico / neve / areia fina
  [GFX.tex.picoA, GFX.tex.picoN] = gerarMaterialTex(T, (u, v) => {
    const f = R.fbm(u, v, 5, 6), f2 = R.n(u * 128, v * 128, 128);
    const h = f * 0.8 + f2 * 0.1; const l = 0.5 + (f - 0.5) * 0.25 + (f2 - 0.5) * 0.06;
    return [h, l, 1, 1, 1];
  }, 2.5);
  // tecido/pele para personagens (somente normal)
  [, GFX.tex.tecidoN] = gerarMaterialTex(256, (u, v) => {
    const f = R.fbm(u, v, 16, 4); const trama = (Math.sin(u * 256 * Math.PI) * Math.sin(v * 256 * Math.PI)) * 0.08;
    return [f * 0.6 + trama, 0.5, 1, 1, 1];
  }, 3);
  GFX.tex.tecidoN.repeat.set(3, 3);
  // água: ondas
  [, GFX.tex.aguaN] = gerarMaterialTex(256, (u, v) => { const f = R.fbm(u, v, 6, 5); const r = R.ridge(u + 0.2, v, 4, 3); return [f * 0.7 + r * 0.3, 0.5, 1, 1, 1]; }, 3);
  GFX.tex.aguaN.repeat.set(24, 24);
  // lava: veios brilhantes
  [GFX.tex.lavaA] = gerarMaterialTex(512, (u, v) => {
    const [f1, f2] = R.vor(u, v, 6); const veio = 1 - clamp((f2 - f1) / 0.18, 0, 1);
    const f = R.fbm(u, v, 8, 5);
    const k = clamp(veio * 0.85 + f * 0.45 - 0.15, 0, 1);
    return [k, 0.1 + k * 1.2, 1.0, 0.35 + k * 0.45, 0.08 + k * 0.1];
  }, 1);
  GFX.tex.lavaA.repeat.set(1, 1); // r164: cada mapa usa a própria repetição (no r128 valia a do normalMap)
  // grama (lâminas com transparência)
  {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
    const rnd = mulberry32(9);
    for (let i = 0; i < 26; i++) {
      const x = 8 + rnd() * 112, h = 120 + rnd() * 130, curva = (rnd() - 0.5) * 50, w = 3 + rnd() * 4;
      const grad = g.createLinearGradient(0, 256, 0, 256 - h); grad.addColorStop(0, '#9a9a9a'); grad.addColorStop(1, '#ffffff');
      g.fillStyle = grad; g.beginPath(); g.moveTo(x - w, 256); g.quadraticCurveTo(x + curva * 0.5, 256 - h * 0.5, x + curva, 256 - h); g.quadraticCurveTo(x + curva * 0.5 + 1, 256 - h * 0.5, x + w, 256); g.fill();
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; GFX.tex.grama = t;
  }
  // decalques: sangue, queimado, gosma
  const decal = (cor, tipo) => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const rnd = mulberry32(tipo.length * 77);
    g.translate(128, 128);
    if (tipo === 'queimado') {
      const gr = g.createRadialGradient(0, 0, 10, 0, 0, 125); gr.addColorStop(0, 'rgba(10,6,4,.95)'); gr.addColorStop(0.6, 'rgba(20,12,8,.7)'); gr.addColorStop(1, 'rgba(20,12,8,0)');
      g.fillStyle = gr; g.beginPath(); for (let a = 0; a < 6.3; a += 0.2) { const r = 95 + rnd() * 30; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
      g.fillStyle = 'rgba(255,90,20,.5)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc((rnd() - 0.5) * 120, (rnd() - 0.5) * 120, 1 + rnd() * 2.5, 0, 7); g.fill(); }
    } else {
      g.fillStyle = cor;
      for (let i = 0; i < 9; i++) { const a = rnd() * 6.3, d = rnd() * 40, r = 22 + rnd() * 34; g.beginPath(); g.ellipse(Math.cos(a) * d, Math.sin(a) * d, r, r * (0.6 + rnd() * 0.4), a, 0, 7); g.fill(); }
      for (let i = 0; i < 22; i++) { const a = rnd() * 6.3, d = 50 + rnd() * 70, r = 3 + rnd() * 9; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, 7); g.fill(); }
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  };
  GFX.tex.sangue = decal('rgba(70,4,4,.92)', 'sangue');
  GFX.tex.gosma = decal('rgba(60,90,20,.85)', 'gosma');
  GFX.tex.queimado = decal('', 'queimado');
  // sombra de contato
  {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(0.5, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    GFX.tex.blob = new THREE.CanvasTexture(c);
  }
};

// ============================================================
//  Material do terreno (camadas com triplanar na rocha)
// ============================================================
GFX.materialTerreno = function (biomaId, cidade = false) {
  const umido = biomaId === 'pantano' || biomaId === 'litoral';
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: umido ? 0.78 : 0.95, metalness: 0 });
  const U = {
    tSolo: { value: GFX.tex.soloA }, tCam: { value: cidade ? GFX.tex.calcA : GFX.tex.camA }, tRocha: { value: GFX.tex.rochaA }, tPico: { value: GFX.tex.picoA },
    nSolo: { value: GFX.tex.soloN }, nCam: { value: cidade ? GFX.tex.calcN : GFX.tex.camN }, nRocha: { value: GFX.tex.rochaN }, nPico: { value: GFX.tex.picoN },
    escala: { value: 0.16 }, forcaN: { value: 0.9 }, escalaC: { value: cidade ? 0.0 : 1.0 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute vec4 peso;\nvarying vec4 vPeso;\nvarying vec3 vPosW;\nvarying vec3 vNormW;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvPeso = peso;\nvPosW = (modelMatrix * vec4(position, 1.0)).xyz;\nvNormW = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = `uniform sampler2D tSolo, tCam, tRocha, tPico, nSolo, nCam, nRocha, nPico; uniform float escala, forcaN, escalaC;
varying vec4 vPeso; varying vec3 vPosW; varying vec3 vNormW;
vec4 gPeso; vec3 gBW;
` + sh.fragmentShader
      .replace('#include <map_fragment>', `
  vec2 uvT = vPosW.xz * escala;
  gBW = pow(abs(normalize(vNormW)), vec3(4.0)); gBW /= (gBW.x + gBW.y + gBW.z);
  // segunda amostra girada e em outra escala, misturada por ruído amplo (esconde a repetição)
  float varM = smoothstep(0.3, 0.7, texture2D(tPico, uvT * 0.031 + 0.17).r);
  vec2 uvR = mat2(0.8, -0.6, 0.6, 0.8) * uvT * 0.61 + 0.37;
  vec3 aS = mix(texture2D(tSolo, uvT).rgb, texture2D(tSolo, uvR).rgb, varM);
  vec3 aC = mix(texture2D(tCam, uvT * 0.9).rgb, texture2D(tCam, uvR * 0.9).rgb, varM * escalaC);
  vec3 aP = texture2D(tPico, uvT * 0.6).rgb;
  vec3 aR = texture2D(tRocha, vPosW.zy * escala * 0.55).rgb * gBW.x + texture2D(tRocha, vPosW.xz * escala * 0.55).rgb * gBW.y + texture2D(tRocha, vPosW.xy * escala * 0.55).rgb * gBW.z;
  // mistura por altura (bordas naturais entre camadas)
  vec4 hh = vec4(aS.g, aC.g, aR.g, aP.g);
  vec4 vp = vPeso; vp.z *= smoothstep(0.97, 0.86, normalize(vNormW).y); vp.x += 1e-3;
  gPeso = vp * (0.35 + hh * 1.3); gPeso = pow(gPeso, vec4(3.0)); gPeso /= max(1e-4, gPeso.x + gPeso.y + gPeso.z + gPeso.w);
  vec3 det = aS * gPeso.x + aC * gPeso.y + aR * gPeso.z + aP * gPeso.w;
  float macro = texture2D(tSolo, uvT * 0.045).r * 0.6 + texture2D(tPico, uvT * 0.11 + 0.3).r * 0.4;
  diffuseColor.rgb *= det * 2.1 * mix(0.75, 1.25, macro);
`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness * mix(1.0, 0.82, gPeso.y) * mix(1.0, 1.05, gPeso.z);`)
      .replace('#include <normal_fragment_maps>', `
  {
    vec3 nS = texture2D(nSolo, uvT).xyz * 2.0 - 1.0;
    vec3 nC = texture2D(nCam, uvT * 0.9).xyz * 2.0 - 1.0;
    vec3 nP = texture2D(nPico, uvT * 0.6).xyz * 2.0 - 1.0;
    vec3 nX = texture2D(nRocha, vPosW.zy * escala * 0.55).xyz * 2.0 - 1.0;
    vec3 nY = texture2D(nRocha, vPosW.xz * escala * 0.55).xyz * 2.0 - 1.0;
    vec3 nZ = texture2D(nRocha, vPosW.xy * escala * 0.55).xyz * 2.0 - 1.0;
    vec3 plano = vec3(nS.x, 0.0, nS.y) * gPeso.x + vec3(nC.x, 0.0, nC.y) * gPeso.y * 0.85 + vec3(nP.x, 0.0, nP.y) * gPeso.w;
    vec3 rocha = (vec3(0.0, nX.y, nX.x) * gBW.x + vec3(nY.x, 0.0, nY.y) * gBW.y + vec3(nZ.x, nZ.y, 0.0) * gBW.z) * gPeso.z * 1.5;
    vec3 nW = normalize(normalize(vNormW) + (plano + rocha) * forcaN);
    normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
  }
`);
  };
  m.userData.U = U; m.customProgramCacheKey = () => 'terreno_v2';
  return m;
};

// ============================================================
//  Grama instanciada com vento
// ============================================================
const GRAMA_BIOMA = {
  litoral: { cores: [0x9a9a4a, 0x7a8a3a, 0xb0a060], dens: 0.55, alt: [0.5, 1.0] },
  pantano: { cores: [0x3a5020, 0x4a5a28, 0x5a6a30], dens: 0.9, alt: [0.7, 1.6] },
  floresta: { cores: [0x3a6020, 0x4a7028, 0x2a5018, 0x5a7a30], dens: 1.0, alt: [0.5, 1.1] },
  deserto: { cores: [0xa08a50, 0x8a7a40], dens: 0.18, alt: [0.4, 0.8] },
  gelo: { cores: [0xb0c0c8, 0x90a0a8], dens: 0.12, alt: [0.3, 0.6] },
  caverna: null, vulcao: { cores: [0x3a2a20, 0x2a1a14], dens: 0.12, alt: [0.3, 0.6] },
};
GFX.criarGrama = function (mundo) {
  const cfg = GRAMA_BIOMA[mundo.bioma]; if (!cfg) return null;
  const Q = QUALIDADES_GFX[GFX.qualidade];
  const n = Math.floor(Q.grama * cfg.dens * Math.min(2.6, Math.pow((mundo.AREA || 150) / 150, 2)));
  // geometria: dois planos cruzados
  if (!GFX.geoGrama) {
    const pos = [], uv = [], nor = [], idx = [];
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI / 3, cx = Math.cos(a) * 0.5, cz = Math.sin(a) * 0.5, b = pos.length / 3;
      const nx = -Math.sin(a) * 0.38, nz = Math.cos(a) * 0.38, sg = k % 2 ? 1 : -1;
      pos.push(-cx, 0, -cz, cx, 0, cz, cx + nx * sg, 0.92, cz + nz * sg, -cx + nx * sg, 0.92, -cz + nz * sg); uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let i = 0; i < 4; i++) nor.push(0, 1, 0);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    g.userData.cache = true; GFX.geoGrama = g;
  }
  const mat = new THREE.MeshStandardMaterial({ map: GFX.tex.grama, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.tempo = GFX.uTempo;
    sh.vertexShader = 'uniform float tempo;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wpG = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float hG = uv.y * uv.y;
      float vento = sin(tempo * 1.6 + wpG.x * 0.31 + wpG.z * 0.22) * 0.18 + sin(tempo * 3.7 + wpG.x * 1.1) * 0.05;
      transformed.x += vento * hG; transformed.z += vento * 0.5 * hG;`);
    // escurece a base (oclusão)
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= mix(0.55, 1.35, vMapUv.y);')
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize((viewMatrix * vec4(0.15, 1.0, 0.1, 0.0)).xyz);');
  };
  mat.customProgramCacheKey = () => 'grama_v2';
  const im = new THREE.InstancedMesh(GFX.geoGrama, mat, n);
  const rnd = mulberry32(mundo.TAM | 0);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), cor = new THREE.Color();
  const cores = cfg.cores.map(c => new THREE.Color(c));
  let k = 0;
  for (let t = 0; t < n * 4 && k < n; t++) {
    const L = (mundo.AREA || 150) * 2 + 50; const x = (rnd() - 0.5) * L, z = (rnd() - 0.5) * L;
    const e = mundo.borda(x, z); if (e > 10 || e < -20 || (mundo.cidade && e < -2.5)) continue;
    const h = mundo.h(x, z); if (h < mundo.B.aguaNivel + 0.15) continue;
    const cam = mundo.pesoCaminho ? mundo.pesoCaminho(x, z) : 0; if (cam > 0.35 && rnd() > 0.08) continue;
    const incl = Math.abs(mundo.h(x + 1, z) - mundo.h(x - 1, z)) + Math.abs(mundo.h(x, z + 1) - mundo.h(x, z - 1)); if (incl > 1.6) continue;
    const a = cfg.alt[0] + rnd() * (cfg.alt[1] - cfg.alt[0]);
    p.set(x, h - 0.05, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28); s.set(a * (0.8 + rnd() * 0.6), a, a * (0.8 + rnd() * 0.6));
    m4.compose(p, q, s); im.setMatrixAt(k, m4);
    cor.copy(cores[Math.floor(rnd() * cores.length)]).multiplyScalar(1.6 + rnd() * 0.8); im.setColorAt(k, cor);
    k++;
  }
  im.count = k; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false;
  return im;
};

// ============================================================
//  Água e lava
// ============================================================
GFX.materialAgua = function (B) {
  if (B.lava) {
    const m = new THREE.MeshStandardMaterial({ color: 0x1a0804, emissive: 0xffffff, emissiveMap: GFX.tex.lavaA, emissiveIntensity: 3.2, roughness: 0.75, normalMap: GFX.tex.rochaN, normalScale: new THREE.Vector2(0.8, 0.8) });
    GFX.tex.rochaN.repeat.set(1, 1);
    GFX.lava = m; GFX.agua = null; return m;
  }
  const m = new THREE.MeshStandardMaterial({ color: B.agua, roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.84, normalMap: GFX.tex.aguaN, normalScale: new THREE.Vector2(0.45, 0.45), envMapIntensity: 1.6 });
  GFX.agua = m; GFX.lava = null; return m;
};

// ============================================================
//  Mapa de ambiente (reflexos e luz indireta) por bioma
// ============================================================
GFX.ambiente = function (B) {
  if (!GFX.pmrem) GFX.pmrem = new THREE.PMREMGenerator(ENG.renderer);
  const brilho = B.escuro ? 0.45 : 1.0;
  const topo = new THREE.Color(B.ceu).multiplyScalar(brilho * 1.15), meio = new THREE.Color(B.neblina).multiplyScalar(brilho), base = new THREE.Color(B.amb).multiplyScalar(brilho * 0.45), sol = new THREE.Color(B.sol);
  const W = 256, H = 128;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const img = g.createImageData(W, H);
  const ds = new THREE.Vector3(30, 55, 18).normalize(); const tmp = new THREE.Color();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fi = (x / W) * Math.PI * 2, te = (y / H) * Math.PI; const dy = Math.cos(te), sr = Math.sin(te);
    const dx = sr * Math.cos(fi), dz = sr * Math.sin(fi);
    if (dy > 0) tmp.copy(meio).lerp(topo, Math.pow(dy, 0.6)); else tmp.copy(meio).lerp(base, Math.pow(-dy, 0.4));
    const d = Math.max(0, dx * ds.x + dy * ds.y + dz * ds.z);
    const k = (B.escuro ? 0.2 : 1) * (Math.pow(d, 48) * 3 + Math.pow(d, 4) * 0.25);
    tmp.r += sol.r * k; tmp.g += sol.g * k; tmp.b += sol.b * k;
    tmp.convertLinearToSRGB();
    const i = (y * W + x) * 4; img.data[i] = clamp(tmp.r, 0, 1) * 255; img.data[i + 1] = clamp(tmp.g, 0, 1) * 255; img.data[i + 2] = clamp(tmp.b, 0, 1) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
  const rt = GFX.pmrem.fromEquirectangular(t);
  t.dispose();
  if (GFX.envAtual) GFX.envAtual.dispose();
  GFX.envAtual = rt;
  ENG.scene.environment = rt.texture;
};

// ============================================================
//  Materiais de personagem: luz de contorno + microdetalhe
// ============================================================
GFX.uRim = { value: new THREE.Color(0.35, 0.3, 0.28) };
GFX.uTempo = { value: 0 };
GFX.patchPersonagem = function (mat, semNormal) {
  if (!semNormal && !mat.flatShading && !mat.transparent && GFX.tex.tecidoN) { mat.normalMap = GFX.tex.tecidoN; mat.normalScale = new THREE.Vector2(0.35, 0.35); }
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = GFX.uRim;
    sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `
      float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
      gl_FragColor.rgb += uRim * pow(rimF, 3.0) * (0.75 - 0.55 * max(normal.y, 0.0)); // contorno sem estourar o topo da cabeça
      #include <dithering_fragment>`);
  };
  mat.customProgramCacheKey = () => 'personagem_v2';
};
GFX.sombraContato = function (raiz, raio) {
  if (!GFX.matBlob) GFX.matBlob = new THREE.MeshBasicMaterial({ map: GFX.tex.blob, transparent: true, depthWrite: false, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
  if (!GFX.geoBlob) { GFX.geoBlob = new THREE.PlaneGeometry(1, 1); GFX.geoBlob.rotateX(-Math.PI / 2); GFX.geoBlob.userData.cache = true; }
  const m = new THREE.Mesh(GFX.geoBlob, GFX.matBlob); m.scale.set(raio * 2, 1, raio * 2); m.position.y = 0.05; m.renderOrder = 1;
  raiz.add(m); return m;
};

// ============================================================
//  Decalques no chão (sangue, queimado, gosma)
// ============================================================
GFX.decal = function (x, z, raio, tipo, dur = 14) {
  if (!ENG.mundo) return;
  const tex = GFX.tex[tipo]; if (!tex) return;
  const seg = 10; const pos = [], uv = [], idx = [];
  const ang = Math.random() * 6.28, ca = Math.cos(ang), sa = Math.sin(ang);
  for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) {
    const u = i / seg, v = j / seg; const lx = (u - 0.5) * 2 * raio, lz = (v - 0.5) * 2 * raio;
    const wx = x + lx * ca - lz * sa, wz = z + lx * sa + lz * ca;
    pos.push(wx, ENG.mundo.h(wx, wz) + 0.06, wz); uv.push(u, v);
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i; idx.push(a, a + seg + 1, a + 1, a + 1, a + seg + 1, a + seg + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: tipo === 'sangue' ? 0.25 : 0.9, polygonOffset: true, polygonOffsetFactor: -3, opacity: 1 });
  const me = new THREE.Mesh(g, mat); me.receiveShadow = true; me.renderOrder = 1;
  ENG.scene.add(me);
  GFX.decals.push({ me, t: 0, dur });
  if (GFX.decals.length > 45) { const d = GFX.decals.shift(); ENG.scene.remove(d.me); d.me.geometry.dispose(); d.me.material.dispose(); }
};
GFX.limparDecals = function () { for (const d of GFX.decals) { ENG.scene.remove(d.me); d.me.geometry.dispose(); d.me.material.dispose(); } GFX.decals = []; };

// ============================================================
//  Pós-processamento
// ============================================================
const VERT_QUAD = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
GFX.criarQuad = function (mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); m.frustumCulled = false; const s = new THREE.Scene(); s.add(m); return { s, m }; };

GFX.initPos = function () {
  const r = ENG.renderer;
  GFX.camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const half = r.capabilities.isWebGL2 && (r.extensions.has('EXT_color_buffer_float') || r.extensions.has('EXT_color_buffer_half_float'));
  GFX.tipoRT = half ? THREE.HalfFloatType : THREE.UnsignedByteType;
  // AO a partir da profundidade
  GFX.matAO = new THREE.ShaderMaterial({
    extensions: { derivatives: true },
    uniforms: { tDepth: { value: null }, projInv: { value: new THREE.Matrix4() }, proj: { value: new THREE.Matrix4() }, res: { value: new THREE.Vector2() }, raio: { value: 1.6 }, forca: { value: 1.3 } },
    vertexShader: VERT_QUAD,
    fragmentShader: `uniform sampler2D tDepth; uniform mat4 projInv, proj; uniform vec2 res; uniform float raio, forca; varying vec2 vUv;
      vec3 posV(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 c = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); vec4 v = projInv * c; return v.xyz / v.w; }
      void main(){
        float d0 = texture2D(tDepth, vUv).x; if (d0 >= 0.99999) { gl_FragColor = vec4(1.0); return; }
        vec3 P = posV(vUv);
        vec3 N = normalize(cross(dFdx(P), dFdy(P)));
        float rr = raio * proj[1][1] * 0.5 / -P.z;
        float giro = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
        float occ = 0.0;
        for (int i = 0; i < 14; i++) {
          float fi = float(i); float t = (fi + 0.5) / 14.0; float a = giro + fi * 2.39996;
          vec2 off = vec2(cos(a), sin(a)) * rr * t;
          vec3 Q = posV(vUv + off); vec3 v = Q - P; float vv = dot(v, v);
          float vn = dot(v, N) - 0.02 * -P.z * 0.05;
          occ += max(0.0, vn) / (vv + 0.05) * smoothstep(raio * raio * 4.0, 0.0, vv);
        }
        float ao = clamp(1.0 - forca * occ / 14.0, 0.0, 1.0);
        gl_FragColor = vec4(ao, ao, ao, 1.0);
      }`,
  });
  GFX.matBlur = new THREE.ShaderMaterial({
    uniforms: { tAO: { value: null }, tDepth: { value: null }, dir: { value: new THREE.Vector2() } },
    vertexShader: VERT_QUAD,
    fragmentShader: `uniform sampler2D tAO, tDepth; uniform vec2 dir; varying vec2 vUv;
      void main(){ float d0 = texture2D(tDepth, vUv).x; float s = 0.0, w = 0.0;
        for (int i = -4; i <= 4; i++) { vec2 uv = vUv + dir * float(i); float d = texture2D(tDepth, uv).x; float k = exp(-float(i * i) / 10.0) * (1.0 / (1.0 + abs(d - d0) * 4000.0)); s += texture2D(tAO, uv).r * k; w += k; }
        float a = s / w; gl_FragColor = vec4(a, a, a, 1.0); }`,
  });
  GFX.matFinal = new THREE.ShaderMaterial({
    uniforms: {
      tCena: { value: null }, tAO: { value: null }, usaAO: { value: 1 }, exposicao: { value: 1.0 }, contraste: { value: 1.08 }, saturacao: { value: 1.12 },
      vinheta: { value: 0.42 }, grao: { value: 0.035 }, tempo: { value: 0 }, res: { value: new THREE.Vector2() },
      tintSombra: { value: new THREE.Vector3(0.86, 0.94, 1.08) }, tintLuz: { value: new THREE.Vector3(1.08, 1.0, 0.9) }, aberr: { value: 0.0011 },
    },
    vertexShader: VERT_QUAD,
    fragmentShader: `uniform sampler2D tCena, tAO; uniform float usaAO, exposicao, contraste, saturacao, vinheta, grao, tempo, aberr; uniform vec2 res; uniform vec3 tintSombra, tintLuz; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 dc = vUv - 0.5; float r2 = dot(dc, dc);
        vec3 c;
        c.r = texture2D(tCena, vUv - dc * aberr * r2 * 8.0).r;
        c.g = texture2D(tCena, vUv).g;
        c.b = texture2D(tCena, vUv + dc * aberr * r2 * 8.0).b;
        if (usaAO > 0.5) { float ao = texture2D(tAO, vUv).r; c *= mix(1.0, ao, 0.9); }
        c = aces(c * exposicao);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c *= mix(tintSombra, tintLuz, smoothstep(0.05, 0.7, l));
        c = mix(vec3(l), c, saturacao);
        c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
        c = (c - 0.5) * contraste + 0.5;
        c *= 1.0 - vinheta * smoothstep(0.35, 1.05, length(dc * vec2(1.25, 1.0)) * 1.4);
        c += (hash(vUv * res + fract(tempo) * 97.0) - 0.5) * grao;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  });
  GFX.matFXAA = new THREE.ShaderMaterial(THREE.FXAAShader);
  GFX.qAO = GFX.criarQuad(GFX.matAO); GFX.qBlur = GFX.criarQuad(GFX.matBlur); GFX.qFinal = GFX.criarQuad(GFX.matFinal); GFX.qFXAA = GFX.criarQuad(GFX.matFXAA);
  // limiar acima de 1: só o que emite luz (fogo, magia, runas) brilha; superfícies claras ao sol não viram halo
  GFX.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 1.35);
  // SMAA (antisserrilhado morfológico de alta qualidade, usado no Ultra)
  if (THREE.SMAAPass) { GFX.smaa = new THREE.SMAAPass(256, 256); GFX.smaa.renderToScreen = true; }
  GFX.redimensionar();
  window.addEventListener('resize', GFX.redimensionar);
};

GFX.redimensionar = function () {
  const r = ENG.renderer; const Q = QUALIDADES_GFX[GFX.qualidade];
  const dpr = window.devicePixelRatio || 1;
  r.setPixelRatio(Math.min(Math.max(dpr, Q.pr > 1 ? 1.25 : 1), Q.pr));
  r.setSize(window.innerWidth, window.innerHeight);
  const w = Math.floor(window.innerWidth * r.getPixelRatio()), h = Math.floor(window.innerHeight * r.getPixelRatio());
  for (const k of ['rtCena', 'rtAO', 'rtAO2', 'rtLDR']) if (GFX[k]) { if (GFX[k].depthTexture) GFX[k].depthTexture.dispose(); GFX[k].dispose(); }
  GFX.rtCena = new THREE.WebGLRenderTarget(w, h, { type: GFX.tipoRT, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  GFX.rtCena.depthTexture = new THREE.DepthTexture(w, h); GFX.rtCena.depthTexture.type = THREE.UnsignedIntType;
  const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
  GFX.rtAO = new THREE.WebGLRenderTarget(hw, hh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  GFX.rtAO2 = GFX.rtAO.clone();
  GFX.rtLDR = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  GFX.bloom.setSize(w, h);
  if (GFX.smaa) GFX.smaa.setSize(w, h);
  GFX.matAO.uniforms.res.value.set(hw, hh);
  GFX.matFinal.uniforms.res.value.set(w, h);
  GFX.matFXAA.uniforms.resolution.value.set(1 / w, 1 / h);
  ENG.camera.aspect = window.innerWidth / window.innerHeight; ENG.camera.updateProjectionMatrix();
  if (ENG.particulas) { ENG.particulas.mat.uniforms.escala.value = h * 0.9; ENG.fumaca.mat.uniforms.escala.value = h * 0.9; }
};

GFX.definirQualidade = function (q) {
  if (!QUALIDADES_GFX[q]) return;
  GFX.qualidade = q;
  try { localStorage.setItem('coroaDeCinzas_gfx', q); } catch (e) { }
  const Q = QUALIDADES_GFX[q];
  const sol = ENG.sol;
  if (sol.shadow.mapSize.x !== Q.sombra) { sol.shadow.mapSize.set(Q.sombra, Q.sombra); if (sol.shadow.map) { sol.shadow.map.dispose(); sol.shadow.map = null; } }
  GFX.redimensionar();
  if (ENG.mundo) GFX.recriarGrama(ENG.mundo);
};
GFX.recriarGrama = function (mundo) {
  if (mundo.grama) { ENG.scene.remove(mundo.grama); mundo.grama.material.dispose(); mundo.grama.dispose && mundo.grama.dispose(); mundo.objetos = mundo.objetos.filter(o => o !== mundo.grama); mundo.grama = null; }
  const g = GFX.criarGrama(mundo); if (g) { ENG.scene.add(g); mundo.objetos.push(g); mundo.grama = g; }
};

GFX.render = function () {
  const r = ENG.renderer, cena = ENG.scene, cam = ENG.camera; const Q = QUALIDADES_GFX[GFX.qualidade];
  // 1) cena em HDR com profundidade
  r.setRenderTarget(GFX.rtCena); r.clear(); r.render(cena, cam);
  // 2) oclusão de ambiente
  const usaAO = Q.ao && J.estado !== 'menu';
  if (usaAO) {
    const u = GFX.matAO.uniforms; u.tDepth.value = GFX.rtCena.depthTexture; u.projInv.value.copy(cam.projectionMatrixInverse); u.proj.value.copy(cam.projectionMatrix);
    r.setRenderTarget(GFX.rtAO); r.render(GFX.qAO.s, GFX.camQuad);
    const b = GFX.matBlur.uniforms; b.tDepth.value = GFX.rtCena.depthTexture;
    b.tAO.value = GFX.rtAO.texture; b.dir.value.set(1 / GFX.rtAO.width, 0); r.setRenderTarget(GFX.rtAO2); r.render(GFX.qBlur.s, GFX.camQuad);
    b.tAO.value = GFX.rtAO2.texture; b.dir.value.set(0, 1 / GFX.rtAO.height); r.setRenderTarget(GFX.rtAO); r.render(GFX.qBlur.s, GFX.camQuad);
  }
  // 3) bloom aditivo sobre a cena
  if (Q.bloom) { const ac = r.autoClear; r.autoClear = false; GFX.bloom.render(r, null, GFX.rtCena, 0, false); r.autoClear = ac; }
  // 4) tonemapping + gradação de cor
  const f = GFX.matFinal.uniforms; f.tCena.value = GFX.rtCena.texture; f.tAO.value = GFX.rtAO.texture; f.usaAO.value = usaAO ? 1 : 0; f.tempo.value = GFX.tempo;
  r.setRenderTarget(GFX.rtLDR); r.render(GFX.qFinal.s, GFX.camQuad);
  // 5) antisserrilhado para a tela
  if (Q.smaa && GFX.smaa) { GFX.smaa.render(r, null, GFX.rtLDR); return; }
  GFX.matFXAA.uniforms.tDiffuse.value = GFX.rtLDR.texture;
  r.setRenderTarget(null); r.render(GFX.qFXAA.s, GFX.camQuad);
};

GFX.atualizar = function (dt) {
  GFX.tempo += dt; GFX.uTempo.value = GFX.tempo;
  if (GFX.agua) { GFX.agua.normalMap.offset.set(GFX.tempo * 0.012, GFX.tempo * 0.007); }
  if (GFX.lava) { GFX.lava.emissiveMap.offset.set(GFX.tempo * 0.004, GFX.tempo * 0.0025); GFX.lava.emissiveIntensity = 2.8 + Math.sin(GFX.tempo * 1.3) * 0.5; }
  for (let i = GFX.decals.length - 1; i >= 0; i--) {
    const d = GFX.decals[i]; d.t += dt;
    if (d.t > d.dur - 3) d.me.material.opacity = Math.max(0, (d.dur - d.t) / 3);
    if (d.t >= d.dur) { ENG.scene.remove(d.me); d.me.geometry.dispose(); d.me.material.dispose(); GFX.decals.splice(i, 1); }
  }
  // tocha tremeluzente
  if (ENG.tocha && ENG.tocha.userData.base !== undefined) ENG.tocha.intensity = ENG.tocha.userData.base * (0.9 + Math.sin(GFX.tempo * 9) * 0.04 + Math.sin(GFX.tempo * 23.7) * 0.03 + (Math.random() - 0.5) * 0.04);
};
