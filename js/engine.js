// ============================================================
//  Motor: renderização, terreno, partículas, efeitos
// ============================================================
'use strict';

const ENG = {};

// ---------- RNG com semente e ruído ----------
function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function criarRuido(seed) {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(512);
  const base = []; for (let i = 0; i < 256; i++) base.push(i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const val = new Float32Array(256); for (let i = 0; i < 256; i++) val[i] = rnd() * 2 - 1;
  function n(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = val[p[(p[xi & 255] + yi) & 255]], b = val[p[(p[(xi + 1) & 255] + yi) & 255]];
    const c = val[p[(p[xi & 255] + yi + 1) & 255]], d = val[p[(p[(xi + 1) & 255] + yi + 1) & 255]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct = 4) { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += n(x * f, y * f) * a; t += a; a *= 0.5; f *= 2.03; } return s / t; }
  function ridge(x, y, oct = 4) { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += (1 - Math.abs(n(x * f, y * f))) * a; t += a; a *= 0.5; f *= 2.1; } return s / t; }
  return { n, fbm, ridge, rnd };
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- inicialização ----------
ENG.init = function (canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  r.setSize(window.innerWidth, window.innerHeight);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputEncoding = THREE.LinearEncoding;
  r.toneMapping = THREE.NoToneMapping;
  r.physicallyCorrectLights = false;
  ENG.renderer = r;
  const scene = new THREE.Scene();
  ENG.scene = scene;
  ENG.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 400);
  ENG.zoom = 25;
  ENG.camAlvo = new THREE.Vector3();
  ENG.camPos = new THREE.Vector3(0, 30, 20);
  ENG.tremor = 0;

  ENG.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7); scene.add(ENG.hemi);
  const sol = new THREE.DirectionalLight(0xffffff, 2);
  sol.castShadow = true;
  sol.shadow.mapSize.set(QUALIDADES_GFX[GFX.qualidade].sombra, QUALIDADES_GFX[GFX.qualidade].sombra);
  const sc = sol.shadow.camera; sc.left = -42; sc.right = 42; sc.top = 42; sc.bottom = -42; sc.near = 1; sc.far = 160;
  sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.04;
  scene.add(sol); scene.add(sol.target);
  ENG.sol = sol;
  ENG.tocha = new THREE.PointLight(0xffb070, 1.2, 22, 1.1);
  scene.add(ENG.tocha);
  // pool de luzes dinâmicas (número fixo para não recompilar shaders)
  ENG.luzes = [];
  for (let i = 0; i < 10; i++) { const l = new THREE.PointLight(0xffffff, 0, 12, 2); scene.add(l); ENG.luzes.push({ l, vida: 0, max: 0, int: 0, segue: null }); }

  ENG.particulas = new Particulas(5000, THREE.AdditiveBlending);
  ENG.fumaca = new Particulas(1500, THREE.NormalBlending);
  scene.add(ENG.particulas.pontos); scene.add(ENG.fumaca.pontos);
  ENG.efeitos = [];
  ENG.raycaster = new THREE.Raycaster();
  window.addEventListener('resize', () => {
    r.setSize(window.innerWidth, window.innerHeight);
    ENG.camera.aspect = window.innerWidth / window.innerHeight; ENG.camera.updateProjectionMatrix();
  });
  ENG.texRuido = criarTexturaRuido();
  GFX.gerarTexturas();
  GFX.initPos();
};

function criarTexturaRuido() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const img = g.createImageData(256, 256);
  const rn = criarRuido(7);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    // ruído periódico simples
    const v = 0.82 + 0.16 * rn.fbm(x / 16, y / 16, 3) + 0.08 * rn.n(x / 3, y / 3);
    const k = Math.floor(clamp(v, 0, 1) * 255);
    const i = (y * 256 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = k; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40);
  t.encoding = THREE.LinearEncoding; t.anisotropy = 4;
  return t;
}

// ---------- câmera ----------
ENG.atualizarCamera = function (alvo, dt) {
  ENG.camAlvo.lerp(alvo, 1 - Math.exp(-dt * 8));
  const d = ENG.zoom;
  const desejada = new THREE.Vector3(ENG.camAlvo.x, ENG.camAlvo.y + d * 0.82, ENG.camAlvo.z + d * 0.57);
  ENG.camPos.lerp(desejada, 1 - Math.exp(-dt * 10));
  ENG.camera.position.copy(ENG.camPos);
  if (ENG.tremor > 0) {
    const k = ENG.tremor * 0.5;
    ENG.camera.position.x += (Math.random() - 0.5) * k; ENG.camera.position.y += (Math.random() - 0.5) * k;
    ENG.tremor = Math.max(0, ENG.tremor - dt * 3);
  }
  ENG.camera.lookAt(ENG.camAlvo.x, ENG.camAlvo.y + 1, ENG.camAlvo.z);
  // sombra acompanha
  ENG.sol.position.set(ENG.camAlvo.x + 30, ENG.camAlvo.y + 55, ENG.camAlvo.z + 18);
  ENG.sol.target.position.copy(ENG.camAlvo);
};

ENG.mouseNoChao = function (mx, my, yRef) {
  const ndc = new THREE.Vector2((mx / window.innerWidth) * 2 - 1, -(my / window.innerHeight) * 2 + 1);
  ENG.raycaster.setFromCamera(ndc, ENG.camera);
  const o = ENG.raycaster.ray.origin, d = ENG.raycaster.ray.direction;
  let y = yRef, p = new THREE.Vector3();
  for (let i = 0; i < 5; i++) {
    const t = (y - o.y) / d.y; p.set(o.x + d.x * t, y, o.z + d.z * t);
    if (!ENG.mundo) break; y = ENG.mundo.h(p.x, p.z);
  }
  p.y = y; return p;
};

ENG.paraTela = function (v, out) {
  const p = v.clone().project(ENG.camera);
  out.x = (p.x * 0.5 + 0.5) * window.innerWidth; out.y = (-p.y * 0.5 + 0.5) * window.innerHeight; out.z = p.z;
  return out;
};

// ============================================================
//  Mundo / terreno
// ============================================================
ENG.construirMundo = function (biomaId, seed, opcoes = {}) {
  ENG.limparMundo();
  const B = BIOMAS[biomaId];
  const R = criarRuido(seed);
  const rnd = R.rnd;
  // o terreno vai bem além da área jogável para o horizonte nunca mostrar o vazio
  // zonas de combate são grandes (caminho em serpentina com ramos); cidades e o fundo do menu, menores
  const grande = !opcoes.cidade && !opcoes.pequeno;
  const AREA = grande ? 300 : 150;
  const TAM = grande ? 740 : 440, N = grande ? 621 : 411, cel = TAM / (N - 1), meio = TAM / 2;
  // --- caminhos ---
  let pts = [];
  const ramosBase = [];
  if (opcoes.cidade) {
    pts = [{ x: -24, z: 0, w: 15 }, { x: -8, z: 0, w: 20 }, { x: 8, z: 0, w: 20 }, { x: 22, z: 0, w: 14 }, { x: 38, z: 0, w: 7 }, { x: 50, z: 0, w: 7.5 }];
  } else if (!grande) {
    let x = -AREA + 22, z = (rnd() - 0.5) * 80;
    const passos = 15;
    const dx = (AREA * 2 - 44) / passos;
    for (let i = 0; i <= passos; i++) {
      pts.push({ x, z, w: 7.5 + rnd() * 3.5 });
      x += dx; z += (rnd() - 0.5) * 55; z = clamp(z, -AREA + 40, AREA - 40);
    }
    for (let i = 2; i < pts.length - 2; i += 2 + Math.floor(rnd() * 2)) pts[i].w = 15 + rnd() * 6;
    pts[0].w = 13; pts[pts.length - 1].w = opcoes.chefe ? 26 : 16;
  } else {
    // caminho principal em serpentina: 2 ou 3 faixas separadas por morros
    const nLin = rnd() < 0.45 ? 4 : 3;
    const sep = nLin === 4 ? AREA * 0.5 : AREA * 0.64;
    const z0 = -(nLin - 1) / 2 * sep + (rnd() - 0.5) * 16;
    const xa = -AREA + 28, xb = AREA - 28;
    for (let r = 0; r < nLin; r++) {
      const zr = z0 + r * sep, ida = r % 2 === 0, passos = 15;
      for (let i = 0; i <= passos; i++) {
        const t = i / passos, x = ida ? lerp(xa, xb, t) : lerp(xb, xa, t);
        const amp = (i === 0 || i === passos) ? 6 : 30;
        pts.push({ x: x + (rnd() - 0.5) * 8, z: clamp(zr + (rnd() - 0.5) * amp, -AREA + 22, AREA - 22), w: 7.5 + rnd() * 3.5, lin: r });
      }
      // curva até a próxima faixa
      if (r < nLin - 1) { const xe = ida ? xb : xa; pts.push({ x: xe + (ida ? -1 : 1) * rnd() * 10, z: zr + sep * 0.5 + (rnd() - 0.5) * 14, w: 9 + rnd() * 3, lin: -1 }); }
    }
    for (let i = 2; i < pts.length - 2; i += 2 + Math.floor(rnd() * 2)) pts[i].w = 15 + rnd() * 6;
    pts[0].w = 13; pts[pts.length - 1].w = opcoes.chefe ? 26 : 16;
    // ramos laterais terminando em locais especiais (tesouro, santuário, covil)
    const nRamos = 5 + Math.floor(rnd() * 5);
    const tipos = ['tesouro', 'santuario', 'covil'];
    const usados = [];
    for (let k = 0; k < nRamos * 6 && ramosBase.length < nRamos; k++) {
      const i = 3 + Math.floor(rnd() * (pts.length - 6));
      const a = pts[i];
      if (a.lin < 0 || Math.abs(a.x) > AREA - 70 || usados.some(u => Math.abs(u - i) < 3)) continue;
      const lado = rnd() < 0.5 ? -1 : 1;
      const zr = z0 + a.lin * sep;
      const externo = (lado < 0 && a.lin === 0) || (lado > 0 && a.lin === nLin - 1);
      const espaco = externo ? (lado < 0 ? zr + AREA : AREA - zr) - 20 : sep / 2 - 17;
      const comp = Math.min(espaco - 2, 36 + rnd() * 26);
      if (comp < 24) continue;
      usados.push(i);
      let dx = (rnd() - 0.5) * 0.9, dz = lado; const L = Math.hypot(dx, dz); dx /= L; dz /= L;
      const pr = [{ x: a.x, z: a.z, w: 7 }];
      for (const f of [0.35, 0.7]) pr.push({ x: a.x + dx * comp * f + (rnd() - 0.5) * 8, z: a.z + dz * comp * f, w: 6.5 + rnd() * 1.5 });
      pr.push({ x: clamp(a.x + dx * comp, -AREA + 18, AREA - 18), z: clamp(a.z + dz * comp, -AREA + 18, AREA - 18), w: 12 + rnd() * 3 });
      ramosBase.push({ pts: pr, tipo: tipos[ramosBase.length % 3 === 0 ? 0 : Math.floor(rnd() * 3)], tA: i / (pts.length - 1) });
    }
  }
  // suavizar (Chaikin)
  const suavizar = (lista) => {
    let c = lista;
    for (let k = 0; k < 2; k++) {
      const nv = [c[0]];
      for (let i = 0; i < c.length - 1; i++) {
        const a = c[i], b = c[i + 1];
        nv.push({ x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25, w: a.w * 0.75 + b.w * 0.25 });
        nv.push({ x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75, w: a.w * 0.25 + b.w * 0.75 });
      }
      nv.push(c[c.length - 1]); c = nv;
    }
    return c;
  };
  const cam = suavizar(pts);
  const ramos = ramosBase.map(r => ({ caminho: suavizar(r.pts), tipo: r.tipo, fim: { x: r.pts[r.pts.length - 1].x, z: r.pts[r.pts.length - 1].z, r: r.pts[r.pts.length - 1].w } }));
  const fim = pts[pts.length - 1], ini = pts[0];
  // --- campos: distância até a borda andável (negativo = andável) ---
  // cada trecho só atualiza as células ao seu redor (rápido mesmo em mapas grandes)
  const LIM = 95;
  const borda = new Float32Array(N * N).fill(LIM);
  const alt = new Float32Array(N * N);
  const tParam = new Float32Array(N * N);
  const segs = [];
  for (let s = 0; s < cam.length - 1; s++) segs.push([cam[s], cam[s + 1], s / (cam.length - 1), (s + 1) / (cam.length - 1)]);
  ramos.forEach((r, k) => { const c = r.caminho; for (let s = 0; s < c.length - 1; s++) segs.push([c[s], c[s + 1], ramosBase[k].tA, ramosBase[k].tA]); });
  for (const [a, b, t0, t1] of segs) {
    const mg = Math.max(a.w, b.w) + LIM;
    const i0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - mg + meio) / cel)), i1 = Math.min(N - 1, Math.ceil((Math.max(a.x, b.x) + mg + meio) / cel));
    const j0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - mg + meio) / cel)), j1 = Math.min(N - 1, Math.ceil((Math.max(a.z, b.z) + mg + meio) / cel));
    const vx = b.x - a.x, vz = b.z - a.z, L2 = vx * vx + vz * vz || 1e-6;
    for (let j = j0; j <= j1; j++) {
      const pz = -meio + j * cel;
      for (let i = i0; i <= i1; i++) {
        const px = -meio + i * cel;
        let t = ((px - a.x) * vx + (pz - a.z) * vz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(px - a.x - vx * t, pz - a.z - vz * t) - (a.w + (b.w - a.w) * t);
        const idx = j * N + i;
        if (d < borda[idx]) { borda[idx] = d; tParam[idx] = t0 + (t1 - t0) * t; }
      }
    }
  }
  // pontas arredondadas e irregularidade da borda
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const px = -meio + i * cel, pz = -meio + j * cel;
    borda[j * N + i] += R.fbm(px * 0.06 + 11, pz * 0.06 - 4, 3) * (opcoes.cidade ? 1.2 : 3.2);
  }
  const relevo = B.relevo;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const px = -meio + i * cel, pz = -meio + j * cel;
    const e = borda[j * N + i];
    let h = R.fbm(px * 0.035, pz * 0.035, 4) * 1.8 + R.n(px * 0.18, pz * 0.18) * 0.18;
    if (e < 4) h = Math.max(h, B.aguaNivel + 0.35 + smooth(4, -2, e) * 0.1);
    const fora = smooth(-1, 14, e);
    const montanha = (0.55 + 0.7 * R.ridge(px * 0.022 + 5, pz * 0.022 + 9, 4)) * relevo;
    let direcao = 1;
    if (biomaId === 'litoral' || biomaId === 'vulcao') {
      const lado = R.fbm(px * 0.012 + 40, pz * 0.012 - 30, 2);
      if (lado > 0.08) direcao = -0.45; // mar / poços de lava
    }
    h += fora * montanha * direcao;
    h += smooth(10, 40, e) * relevo * 0.6 * (direcao > 0 ? 1 : 0);
    // anel de montanhas no horizonte (o mar continua quando o bioma tem água)
    const borda2 = Math.max(Math.abs(px), Math.abs(pz));
    h += smooth(AREA + 15, meio, borda2) * relevo * (direcao > 0 ? 1.6 : 0.2);
    // poças dentro do caminho
    if ((B.aguaNivel > -1) && e < -3) {
      const poca = R.fbm(px * 0.05 + 70, pz * 0.05 + 20, 2);
      if (poca > 0.35 && biomaId !== 'vulcao') h -= smooth(0.35, 0.5, poca) * 1.4;
    }
    alt[j * N + i] = h;
  }
  // aplainar início e fim
  const aplainar = (cx, cz, r) => {
    const i0 = Math.max(0, Math.floor((cx - r + meio) / cel)), i1 = Math.min(N - 1, Math.ceil((cx + r + meio) / cel));
    const j0 = Math.max(0, Math.floor((cz - r + meio) / cel)), j1 = Math.min(N - 1, Math.ceil((cz + r + meio) / cel));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = -meio + i * cel, pz = -meio + j * cel; const d = Math.hypot(px - cx, pz - cz);
      if (d < r) { const k = smooth(r, r * 0.6, d); const idx = j * N + i; alt[idx] = lerp(alt[idx], Math.max(0.4, B.aguaNivel + 0.6), k * 0.8); }
    }
  };
  if (opcoes.cidade) { aplainar(0, 0, 31); aplainar(40, 0, 13); }
  else { aplainar(fim.x, fim.z, fim.w * 0.9); aplainar(ini.x, ini.z, 10); for (const r of ramos) aplainar(r.fim.x, r.fim.z, r.fim.r * 0.8); }

  const amostra = (arr, x, z) => {
    const fx = clamp((x + meio) / cel, 0, N - 1.001), fz = clamp((z + meio) / cel, 0, N - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const a = arr[j * N + i], b = arr[j * N + i + 1], c = arr[(j + 1) * N + i], d = arr[(j + 1) * N + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const mundo = {
    bioma: biomaId, B, TAM, meio, R, caminho: cam, pontos: pts, ramos, inicio: { x: ini.x, z: ini.z }, fim: { x: fim.x, z: fim.z, r: fim.w },
    h: (x, z) => amostra(alt, x, z),
    borda: (x, z) => amostra(borda, x, z),
    progresso: (x, z) => amostra(tParam, x, z),
    andavel: (x, z, r = 0.5) => {
      if (!(amostra(borda, x, z) < -r && Math.abs(x) < AREA + 8 && Math.abs(z) < AREA + 8)) return false;
      return !mundo.colide(x, z, r);
    },
    andavelTerreno: (x, z, r = 0.5) => amostra(borda, x, z) < -r && Math.abs(x) < AREA + 8 && Math.abs(z) < AREA + 8,
    obst: [], AREA, cidade: !!opcoes.cidade,
    // obstáculos indexados numa grade espacial (reindexa quando a lista muda)
    _grade: null, _nIdx: -1,
    colide: (x, z, r) => !!mundo.obstaculoEm(x, z, r),
    obstaculoEm: (x, z, r) => {
      const ob = mundo.obst;
      if (mundo._nIdx !== ob.length) {
        const g = new Map(); const C = 6;
        for (const o of ob) {
          const x0 = Math.floor((o.x - o.r) / C), x1 = Math.floor((o.x + o.r) / C), z0 = Math.floor((o.z - o.r) / C), z1 = Math.floor((o.z + o.r) / C);
          for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i * 4096 + j; let l = g.get(k); if (!l) g.set(k, l = []); l.push(o); }
        }
        mundo._grade = g; mundo._nIdx = ob.length;
      }
      const C = 6, g = mundo._grade;
      const x0 = Math.floor((x - r) / C), x1 = Math.floor((x + r) / C), z0 = Math.floor((z - r) / C), z1 = Math.floor((z + r) / C);
      for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
        const l = g.get(i * 4096 + j); if (!l) continue;
        for (const o of l) { const dx = x - o.x, dz = z - o.z, R = o.r + r; if (dx * dx + dz * dz < R * R) return o; }
      }
      return null;
    },
    objetos: [],
  };
  ENG.mundo = mundo;

  // --- malha do terreno (camadas: solo, caminho, rocha, pico) ---
  const geo = new THREE.PlaneGeometry(TAM, TAM, N - 1, N - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cores = new Float32Array(pos.count * 3);
  const pesos = new Float32Array(pos.count * 4);
  const pesoCam = new Float32Array(N * N);
  const cChao = new THREE.Color(B.chao), cCam = new THREE.Color(B.caminho), cEnc = new THREE.Color(B.encosta), cPico = new THREE.Color(B.pico);
  const cLava = new THREE.Color(0x401008), cAreia = new THREE.Color(0xa89870);
  if (opcoes.cidade) cCam.lerp(new THREE.Color(0x8e8a82), 0.55);
  const tmp = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const px = pos.getX(k), pz = pos.getZ(k);
    const i = Math.round((px + meio) / cel), j = Math.round((pz + meio) / cel);
    const idx = j * N + i;
    const h = alt[idx]; pos.setY(k, h);
    const e = borda[idx];
    const hx = alt[j * N + Math.min(N - 1, i + 1)] - alt[j * N + Math.max(0, i - 1)];
    const hz = alt[Math.min(N - 1, j + 1) * N + i] - alt[Math.max(0, j - 1) * N + i];
    const incl = clamp(Math.hypot(hx, hz) / (2 * cel), 0, 2);
    const nz = R.fbm(px * 0.08, pz * 0.08, 3);
    // pesos das camadas
    const wCam0 = smooth(0.3, -0.45, nz + (e + 5) * 0.035) * smooth(1, -5, e);
    const wR = smooth(0.4, 0.95, incl);
    let wP = (biomaId === 'gelo' ? smooth(relevo * 0.35, relevo * 0.9, h) : smooth(relevo * 0.5, relevo * 1.2, h)) * (1 - wR * 0.6);
    if (biomaId === 'deserto' || biomaId === 'litoral') wP = Math.max(wP, smooth(-2, 6, e) * 0.5 * (1 - wR));
    const wC = wCam0 * 0.85 * (1 - wR) * (1 - wP);
    const wS = Math.max(0, 1 - wR - wP - wC);
    pesos[k * 4] = wS; pesos[k * 4 + 1] = wC; pesos[k * 4 + 2] = wR; pesos[k * 4 + 3] = wP;
    pesoCam[idx] = wC;
    // cor base
    tmp.setRGB(0, 0, 0);
    tmp.r = cChao.r * wS + cCam.r * wC + cEnc.r * wR + cPico.r * wP;
    tmp.g = cChao.g * wS + cCam.g * wC + cEnc.g * wR + cPico.g * wP;
    tmp.b = cChao.b * wS + cCam.b * wC + cEnc.b * wR + cPico.b * wP;
    if (B.lava && h < B.aguaNivel + 0.6) tmp.lerp(cLava, 0.7);
    if (biomaId === 'litoral' && h < B.aguaNivel + 0.5) tmp.lerp(cAreia, 0.6);
    // oclusão das reentrâncias (comparando com a vizinhança)
    let soma = 0, cnt = 0;
    for (let dj = -3; dj <= 3; dj += 3) for (let di = -3; di <= 3; di += 3) { const ii = clamp(i + di, 0, N - 1), jj = clamp(j + dj, 0, N - 1); soma += alt[jj * N + ii]; cnt++; }
    const ao = clamp(1 + (h - soma / cnt) * 0.22, 0.45, 1.12);
    const v = (0.9 + nz * 0.2) * ao;
    cores[k * 3] = tmp.r * v; cores[k * 3 + 1] = tmp.g * v; cores[k * 3 + 2] = tmp.b * v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  geo.setAttribute('peso', new THREE.BufferAttribute(pesos, 4));
  geo.computeVertexNormals();
  mundo.pesoCaminho = (x, z) => amostra(pesoCam, x, z);
  const matT = GFX.materialTerreno(biomaId, !!opcoes.cidade);
  const terreno = new THREE.Mesh(geo, matT);
  terreno.receiveShadow = true;
  ENG.scene.add(terreno); mundo.objetos.push(terreno);

  // --- água / lava ---
  if (B.aguaNivel > -2.5) {
    const ag = new THREE.PlaneGeometry(TAM * 1.2, TAM * 1.2, 1, 1); ag.rotateX(-Math.PI / 2);
    ag.attributes.uv.array.forEach((v, i, arr) => { arr[i] = v * 1; });
    const mA = GFX.materialAgua(B);
    const agua = new THREE.Mesh(ag, mA); agua.position.y = B.aguaNivel; agua.receiveShadow = !B.lava;
    ENG.scene.add(agua); mundo.objetos.push(agua); mundo.agua = agua;
  } else { GFX.agua = null; GFX.lava = null; }
  mundo.matAgua = mundo.agua ? mundo.agua.material : null;
  ENG.aplicarBioma(mundo);
  // --- decoração ---
  construirDecoracao(mundo, rnd);
  // --- grama ---
  GFX.recriarGrama(mundo);
  // --- partículas ambientes ---
  mundo.ambiente = { t: 0 };
  return mundo;
};


// iluminação, neblina e ambiente de um mundo (também usado ao voltar de um portal)
ENG.aplicarBioma = function (mundo) {
  const B = mundo.B;
  GFX.agua = mundo.matAgua && !B.lava ? mundo.matAgua : null;
  GFX.lava = mundo.matAgua && B.lava ? mundo.matAgua : null;
  const cidade = mundo.cidade;
  ENG.scene.background = new THREE.Color(B.neblina);
  ENG.scene.fog = new THREE.FogExp2(B.neblina, B.nDens * (cidade ? 0.6 : 0.85));
  ENG.hemi.color.set(B.ceu); ENG.hemi.groundColor.set(B.amb); ENG.hemi.intensity = B.ambI * 0.35;
  ENG.sol.color.set(B.sol); ENG.sol.intensity = B.solI * 1.25 * (cidade ? 0.85 : 1);
  ENG.tocha.userData.base = B.escuro ? 5 : 1.6; ENG.tocha.intensity = ENG.tocha.userData.base; ENG.tocha.distance = B.escuro ? 32 : 18;
  GFX.ambiente(B);
  GFX.matFinal.uniforms.exposicao.value = (B.exposicao || 1) * (cidade ? 0.95 : 1);
  GFX.bloom.threshold = 0.95 / (B.exposicao || 1);
  GFX.uRim.value.set(B.sol).multiplyScalar(B.escuro ? 0.35 : 0.22);
};
// retira o mundo da cena sem destruí-lo (portal para a cidade)
ENG.guardarMundo = function () {
  const m = ENG.mundo; if (!m) return null;
  for (const o of m.objetos) ENG.scene.remove(o);
  ENG.mundo = null; return m;
};
ENG.restaurarMundo = function (m) {
  ENG.limparMundo();
  for (const o of m.objetos) ENG.scene.add(o);
  ENG.mundo = m; ENG.aplicarBioma(m);
};
ENG.descartarMundo = function (m) {
  if (!m) return;
  for (const o of m.objetos) { ENG.scene.remove(o); o.traverse && o.traverse(c => { if (c.geometry && !c.geometry.userData.cache) c.geometry.dispose(); }); }
};

ENG.limparMundo = function () {
  const m = ENG.mundo; if (!m) return;
  for (const o of m.objetos) {
    ENG.scene.remove(o);
    o.traverse && o.traverse(c => { if (c.geometry && !c.geometry.userData.cache) c.geometry.dispose(); });
  }
  ENG.mundo = null;
};

// ---------- decoração instanciada ----------
const _mc = {};
function matDec(cor, opt = {}) {
  const k = cor + '|' + Object.keys(opt).map(n => n + ':' + (opt[n] && opt[n].isTexture ? opt[n].uuid : opt[n])).join(',');
  if (!_mc[k]) _mc[k] = new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: 0.85, metalness: 0.0 }, opt));
  return _mc[k];
}
function geoRocha(seed) {
  const g = new THREE.DodecahedronGeometry(1, 1);
  const p = g.attributes.position; const r = criarRuido(seed);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + r.n(x * 2.2 + 3, z * 2.2 + y * 1.7) * 0.28;
    p.setXYZ(i, x * k, y * k * 0.75, z * k);
  }
  g.computeVertexNormals(); g.userData.cache = true; return g;
}
const DECOR = {};
function M4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  return m;
}
function initDecor() {
  const C = (g) => { g.userData.cache = true; return g; };
  const tronco = C(new THREE.CylinderGeometry(0.18, 0.3, 1, 7));
  const cone = C(new THREE.ConeGeometry(1, 1, 8));
  const ico = C(new THREE.IcosahedronGeometry(1, 1));
  const rocha = geoRocha(3);
  const octa = C(new THREE.OctahedronGeometry(1, 0));
  const cil = C(new THREE.CylinderGeometry(1, 1, 1, 10));
  const caixa = C(new THREE.BoxGeometry(1, 1, 1));
  const esf = C(new THREE.SphereGeometry(1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  const toro = C(new THREE.TorusGeometry(0.6, 0.06, 5, 12, Math.PI));
  const fl = { flatShading: true };
  const pedra = { flatShading: true, map: GFX.tex.rochaA, normalMap: GFX.tex.rochaN, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.92 };
  const casca = { map: GFX.tex.rochaA, normalMap: GFX.tex.rochaN, roughness: 0.95 };
  const folha = { flatShading: true, map: GFX.tex.soloA, normalMap: GFX.tex.soloN, roughness: 0.8 };
  DECOR.palmeira = { esc: [0.9, 1.4], partes: [
    { g: tronco, m: matDec(0x8a6a48, casca), mx: M4(0, 2.5, 0, 0.08, 0, 0.1, 1.1, 5, 1.1) },
    ...[0, 1, 2, 3, 4, 5, 6].map(i => ({ g: cone, m: matDec(0x4a7a2a, folha), mx: M4(Math.cos(i * 0.9) * 1.1, 5.0, Math.sin(i * 0.9) * 1.1, Math.sin(i * 0.9) * 1.2, 0, -Math.cos(i * 0.9) * 1.2, 0.35, 2.6, 0.08) })),
  ] };
  DECOR.rocha = { esc: [0.6, 2.6], partes: [{ g: rocha, m: matDec(0x8a857a, pedra), mx: M4(0, 0.2, 0) }] };
  DECOR.rochaVulc = { esc: [0.8, 3], partes: [{ g: rocha, m: matDec(0x2e2422, pedra), mx: M4(0, 0.2, 0) }, { g: rocha, m: matDec(0xff4010, { emissive: 0xff3000, emissiveIntensity: 1.2 }), mx: M4(0, -0.05, 0, 0, 1, 0, 1.06, 0.3, 1.06) }] };
  DECOR.concha = { esc: [0.3, 0.6], partes: [{ g: cone, m: matDec(0xe8d0c0, fl), mx: M4(0, 0.2, 0, 1.4, 0, 0, 0.4, 0.8, 0.4) }] };
  DECOR.arbusto = { esc: [0.6, 1.3], partes: [{ g: ico, m: matDec(0x4a6a2a, folha), mx: M4(0, 0.4, 0, 0, 0, 0, 1, 0.7, 1) }, { g: ico, m: matDec(0x5a7a32, folha), mx: M4(0.5, 0.3, 0.2, 0, 0, 0, 0.6, 0.5, 0.6) }] };
  DECOR.arvoreMorta = { esc: [0.9, 1.6], partes: [
    { g: tronco, m: matDec(0x3a3228, casca), mx: M4(0, 2, 0, 0.05, 0, 0, 1, 4, 1) },
    { g: tronco, m: matDec(0x3a3228, casca), mx: M4(0.6, 3.2, 0, 0, 0, -0.9, 0.5, 2, 0.5) },
    { g: tronco, m: matDec(0x3a3228, casca), mx: M4(-0.5, 2.6, 0.3, 0.4, 0, 0.8, 0.45, 1.6, 0.45) },
    { g: tronco, m: matDec(0x3a3228, casca), mx: M4(0.1, 3.8, -0.5, -0.8, 0, 0, 0.35, 1.4, 0.35) },
  ] };
  DECOR.arvoreQueimada = { esc: [0.9, 1.6], partes: DECOR.arvoreMorta.partes.map(p => ({ g: p.g, m: matDec(0x151010), mx: p.mx })).concat([{ g: tronco, m: matDec(0xff5010, { emissive: 0xff3000, emissiveIntensity: 1.5 }), mx: M4(0, 1.2, 0, 0, 0, 0, 1.02, 0.3, 1.02) }]) };
  DECOR.junco = { esc: [0.7, 1.2], partes: [-0.2, 0.1, 0.3].map((o, i) => ({ g: cil, m: matDec(0x6a7a3a), mx: M4(o, 0.9, i * 0.15 - 0.15, o * 0.3, 0, o * 0.4, 0.04, 1.8 + i * 0.3, 0.04) })) };
  DECOR.cogumelo = { esc: [0.5, 1.6], partes: [{ g: cil, m: matDec(0xd8d0b0), mx: M4(0, 0.35, 0, 0, 0, 0, 0.12, 0.7, 0.12) }, { g: esf, m: matDec(0x8a3a6a, { emissive: 0x6a2050, emissiveIntensity: 0.4 }), mx: M4(0, 0.65, 0, 0, 0, 0, 0.45, 0.3, 0.45) }] };
  DECOR.pinheiro = { esc: [0.9, 1.7], partes: [
    { g: tronco, m: matDec(0x4a3420, casca), mx: M4(0, 1, 0, 0, 0, 0, 1, 2, 1) },
    { g: cone, m: matDec(0x24401e, folha), mx: M4(0, 2.6, 0, 0, 0, 0, 1.7, 2.4, 1.7) },
    { g: cone, m: matDec(0x2a4a22, folha), mx: M4(0, 3.8, 0, 0, 0.5, 0, 1.3, 2.0, 1.3) },
    { g: cone, m: matDec(0x305426, folha), mx: M4(0, 4.9, 0, 0, 1, 0, 0.85, 1.6, 0.85) },
  ] };
  DECOR.pinheiroNeve = { esc: [0.9, 1.7], partes: [
    DECOR.pinheiro.partes[0], DECOR.pinheiro.partes[1], DECOR.pinheiro.partes[2], DECOR.pinheiro.partes[3],
    { g: cone, m: matDec(0xf0f4fa, fl), mx: M4(0, 3.2, 0, 0, 0.2, 0, 1.45, 1.2, 1.45) },
    { g: cone, m: matDec(0xf0f4fa, fl), mx: M4(0, 5.3, 0, 0, 0.7, 0, 0.7, 0.9, 0.7) },
  ] };
  DECOR.arvore = { esc: [0.9, 1.6], partes: [
    { g: tronco, m: matDec(0x4a3420, casca), mx: M4(0, 1.4, 0, 0, 0, 0, 1.2, 2.8, 1.2) },
    { g: ico, m: matDec(0x2e4a22, folha), mx: M4(0, 3.6, 0, 0, 0, 0, 1.9, 1.6, 1.9) },
    { g: ico, m: matDec(0x36542a, folha), mx: M4(0.9, 3.0, 0.4, 0, 0, 0, 1.2, 1.0, 1.2) },
  ] };
  DECOR.cristal = { esc: [0.6, 1.8], partes: [
    { g: octa, m: matDec(0x8a60ff, { emissive: 0x6a40ff, emissiveIntensity: 1.1, roughness: 0.3, metalness: 0.2 }), mx: M4(0, 1, 0, 0, 0, 0.15, 0.4, 1.4, 0.4) },
    { g: octa, m: matDec(0x60a0ff, { emissive: 0x4080ff, emissiveIntensity: 1.1, roughness: 0.3 }), mx: M4(0.4, 0.6, 0.2, 0.3, 0, -0.5, 0.25, 0.8, 0.25) },
    { g: rocha, m: matDec(0x3a3640, pedra), mx: M4(0, 0, 0, 0, 0, 0, 0.7, 0.4, 0.7) },
  ] };
  DECOR.cristalGelo = { esc: [0.6, 1.8], partes: [
    { g: octa, m: matDec(0xbfe8ff, { emissive: 0x4080a0, emissiveIntensity: 0.5, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 }), mx: M4(0, 1.2, 0, 0, 0, 0.1, 0.45, 1.8, 0.45) },
    { g: octa, m: matDec(0xd8f4ff, { emissive: 0x4080a0, emissiveIntensity: 0.4, roughness: 0.1 }), mx: M4(0.5, 0.6, 0, 0, 0, -0.6, 0.3, 1, 0.3) },
  ] };
  DECOR.estalagmite = { esc: [0.7, 2.2], partes: [{ g: cone, m: matDec(0x4a444a, pedra), mx: M4(0, 1.4, 0, 0, 0, 0, 0.6, 2.8, 0.6) }, { g: cone, m: matDec(0x3a343a, fl), mx: M4(0.5, 0.7, 0.3, 0, 0, 0, 0.35, 1.4, 0.35) }] };
  DECOR.pilar = { esc: [0.8, 1.3], partes: [
    { g: cil, m: matDec(0xd8c098, casca), mx: M4(0, 2.2, 0, 0, 0, 0, 0.55, 4.4, 0.55) },
    { g: caixa, m: matDec(0xb8a078), mx: M4(0, 4.5, 0, 0, 0, 0, 1.5, 0.4, 1.5) },
    { g: caixa, m: matDec(0xb8a078), mx: M4(0, 0.15, 0, 0, 0, 0, 1.4, 0.3, 1.4) },
  ] };
  DECOR.cacto = { esc: [0.8, 1.4], partes: [
    { g: cil, m: matDec(0x5a7a3a), mx: M4(0, 1.2, 0, 0, 0, 0, 0.25, 2.4, 0.25) },
    { g: cil, m: matDec(0x5a7a3a), mx: M4(0.4, 1.4, 0, 0, 0, 0, 0.16, 0.9, 0.16) },
    { g: cil, m: matDec(0x5a7a3a), mx: M4(-0.35, 1.0, 0, 0, 0, 0, 0.16, 0.7, 0.16) },
  ] };
  DECOR.ossada = { esc: [0.8, 1.6], partes: [0, 1, 2, 3].map(i => ({ g: toro, m: matDec(0xe0d8c0), mx: M4(i * 0.3 - 0.45, 0.1, 0, 0, Math.PI / 2, 0, 1 - i * 0.1, 1 - i * 0.1, 1) })) };
  DECOR.obelisco = { esc: [0.8, 1.4], partes: [
    { g: C(new THREE.CylinderGeometry(0.3, 0.8, 1, 4)), m: matDec(0x1a1416, fl), mx: M4(0, 2.5, 0, 0, Math.PI / 4, 0, 1, 5, 1) },
    { g: octa, m: matDec(0xff5020, { emissive: 0xff4010, emissiveIntensity: 2 }), mx: M4(0, 5.4, 0, 0, 0, 0, 0.3, 0.5, 0.3) },
  ] };
  DECOR.braseiro = { esc: [1, 1], partes: [
    { g: cil, m: matDec(0x3a3430, { metalness: 0.6, roughness: 0.5 }), mx: M4(0, 0.6, 0, 0, 0, 0, 0.12, 1.2, 0.12) },
    { g: esf, m: matDec(0x3a3430, { metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide }), mx: M4(0, 1.5, 0, Math.PI, 0, 0, 0.55, 0.35, 0.55) },
  ] };
  D3.registrar();
}

// raio de colisão (pegada no chão) de cada tipo de decoração, em escala 1
const COLISAO_DECOR = { pinheiro: 0.42, pinheiroNeve: 0.42, arvore: 0.45, palmeira: 0.32, arvoreMorta: 0.36, arvoreQueimada: 0.36, cacto: 0.34,
  pilar: 0.72, estalagmite: 0.55, cristal: 0.45, cristalGelo: 0.45, obelisco: 0.75, braseiro: 0.45 };
function raioColisao(tipo, d, vi) {
  if (tipo === 'rocha' || tipo === 'rochaVulc') {
    const v = d.variantes ? d.variantes[Math.max(0, vi)] : d.partes;
    const g = v[0].g;
    if (g.userData.rCol === undefined) {
      const p = g.attributes.position; let soma = 0, n = 0;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.25) { soma += Math.hypot(p.getX(i), p.getZ(i)); n++; }
      g.userData.rCol = n ? soma / n * 0.85 : 0.8;
    }
    return g.userData.rCol;
  }
  return COLISAO_DECOR[tipo] || 0;
}
function construirDecoracao(mundo, rnd) {
  if (!DECOR.rocha) initDecor();
  const lista = mundo.B.decor;
  const porTipo = {};
  // áreas que precisam ficar desimpedidas (chegada/portões, arena do chefe, fim dos ramos)
  const livres = [{ x: mundo.inicio.x, z: mundo.inicio.z, r: 14 }, { x: mundo.fim.x, z: mundo.fim.z, r: (mundo.fim.r || 10) + 4 }]
    .concat((mundo.ramos || []).map(r => ({ x: r.fim.x, z: r.fim.z, r: (r.fim.r || 6) + 3 })));
  const tentativas = mundo.cidade ? 2400 : Math.round(5200 * Math.pow(mundo.TAM / 440, 2));
  for (let n = 0; n < tentativas; n++) {
    const x = (rnd() - 0.5) * mundo.TAM * 0.94, z = (rnd() - 0.5) * mundo.TAM * 0.94;
    const e = mundo.borda(x, z);
    let tipo;
    if (e < -2) { if (mundo.cidade || rnd() > 0.035) continue; tipo = rnd() < 0.5 ? 'rocha' : lista[lista.length - 1]; if (['pinheiro', 'arvore', 'pinheiroNeve', 'palmeira', 'pilar', 'obelisco'].includes(tipo)) tipo = 'rocha'; }
    else if (e < 40) { if (rnd() > 0.75 - e * 0.012) continue; if (mundo.cidade && e < 14) continue; tipo = lista[Math.floor(rnd() * lista.length)]; }
    else if (e < 90 && rnd() < 0.18) tipo = lista[Math.floor(rnd() * lista.length)];
    else continue;
    const h = mundo.h(x, z);
    if (mundo.B.aguaNivel > -2.5 && h < mundo.B.aguaNivel + 0.1 && tipo !== 'junco' && tipo !== 'rocha' && tipo !== 'rochaVulc') continue;
    const d = DECOR[tipo]; if (!d) continue;
    const s = d.esc[0] + rnd() * (d.esc[1] - d.esc[0]);
    const m = M4(x, h - 0.1, z, (rnd() - 0.5) * 0.1, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.1, s, s, s);
    const vi = d.variantes ? Math.floor(rnd() * d.variantes.length) : -1;
    const chave = vi >= 0 ? tipo + '#' + vi : tipo;
    const rc = raioColisao(tipo, d, vi) * s;
    if (rc > 0 && e < rc + 0.6) {
      // dentro (ou na beira) da área andável: nunca fechar passagens. Exige folga de 2,2 até outros
      // obstáculos e não aceita peças "no meio do caminho" perto demais da borda.
      const fundo = -e;
      if (fundo > rc * 0.4 && fundo < rc + 2.6) continue;
      if (mundo.obstaculoEm(x, z, rc + 2.2)) continue;
      if (livres.some(l => Math.hypot(x - l.x, z - l.z) < l.r + rc)) continue;
    }
    if (rc > 0) mundo.obst.push({ x, z, r: rc, decor: tipo });
    (porTipo[chave] = porTipo[chave] || []).push(m);
  }
  // braseiros ao redor da arena final
  const f = mundo.fim;
  porTipo.braseiro = [];
  mundo.braseiros = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, x = f.x + Math.cos(a) * f.r * 0.85, z = f.z + Math.sin(a) * f.r * 0.85;
    const h = mundo.h(x, z); porTipo.braseiro.push(M4(x, h, z)); mundo.braseiros.push(new THREE.Vector3(x, h + 1.7, z)); mundo.obst.push({ x, z, r: 0.45 });
  }
  // instâncias agrupadas em blocos espaciais (cada bloco com a própria esfera de recorte)
  const BLOCO = 70;
  for (const [chave, mats] of Object.entries(porTipo)) {
    const [tipo, vi] = chave.split('#'); const d = DECOR[tipo];
    const partes = vi !== undefined ? d.variantes[+vi] : d.partes;
    const blocos = {};
    for (const m of mats) { const bx = Math.floor(m.elements[12] / BLOCO), bz = Math.floor(m.elements[14] / BLOCO); (blocos[bx + ',' + bz] = blocos[bx + ',' + bz] || []).push(m); }
    let nb = 0;
    for (const lista of Object.values(blocos)) {
      nb++;
      // centro e raio do bloco
      let cx = 0, cy = 0, cz = 0; for (const m of lista) { cx += m.elements[12]; cy += m.elements[13]; cz += m.elements[14]; }
      cx /= lista.length; cy /= lista.length; cz /= lista.length;
      let raio = 0; for (const m of lista) raio = Math.max(raio, Math.hypot(m.elements[12] - cx, m.elements[13] - cy, m.elements[14] - cz));
      for (const p of partes) {
        if (!p.g.boundingSphere) p.g.computeBoundingSphere();
        const g = new THREE.BufferGeometry();
        for (const nome in p.g.attributes) g.setAttribute(nome, p.g.attributes[nome]);
        g.index = p.g.index; g.userData.cache = true;
        g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), raio + (p.g.boundingSphere.radius + p.g.boundingSphere.center.length()) * 2.8);
        const im = new THREE.InstancedMesh(g, p.m, lista.length);
        const tmp = new THREE.Matrix4();
        const cv = new THREE.Color(); const rv = mulberry32(lista.length * 31 + tipo.length + nb * 7);
        const brilha = p.m.emissive && p.m.emissiveIntensity >= 1;
        lista.forEach((m, i) => { tmp.multiplyMatrices(m, p.mx); im.setMatrixAt(i, tmp); if (!brilha) { const k = 0.82 + rv() * 0.34; cv.setRGB(k * (0.95 + rv() * 0.1), k, k * (0.95 + rv() * 0.1)); im.setColorAt(i, cv); } });
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.castShadow = !brilha; im.receiveShadow = true; im.frustumCulled = true;
        im.instanceMatrix.needsUpdate = true;
        ENG.scene.add(im); mundo.objetos.push(im);
      }
    }
  }
}

// ============================================================
//  Partículas
// ============================================================
class Particulas {
  constructor(cap, blending) {
    this.cap = cap; this.n = 0;
    this.pos = new Float32Array(cap * 3); this.vel = new Float32Array(cap * 3);
    this.cor = new Float32Array(cap * 3); this.tam = new Float32Array(cap); this.alfa = new Float32Array(cap);
    this.vida = new Float32Array(cap); this.max = new Float32Array(cap);
    this.t0 = new Float32Array(cap); this.t1 = new Float32Array(cap); this.grav = new Float32Array(cap); this.arr = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('cor', new THREE.BufferAttribute(this.cor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('tam', new THREE.BufferAttribute(this.tam, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alfa', new THREE.BufferAttribute(this.alfa, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    const aditivo = blending === THREE.AdditiveBlending;
    const m = new THREE.ShaderMaterial({
      uniforms: { escala: { value: window.innerHeight * 0.9 } },
      vertexShader: `attribute vec3 cor; attribute float tam; attribute float alfa; varying vec3 vCor; varying float vA; uniform float escala;
        void main(){ vCor=cor; vA=alfa; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=tam*escala/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: aditivo
        ? `varying vec3 vCor; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d); a=a*a; gl_FragColor=vec4(vCor*a*vA*1.6, a*vA); }`
        : `varying vec3 vCor; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.1,d); gl_FragColor=vec4(vCor, a*vA); }`,
      blending, transparent: true, depthWrite: false,
    });
    this.pontos = new THREE.Points(g, m); this.pontos.frustumCulled = false; this.geo = g; this.mat = m;
    window.addEventListener('resize', () => { m.uniforms.escala.value = window.innerHeight * 0.9; });
  }
  emitir(o) {
    const n = o.n || 10; const c = new THREE.Color(o.cor || '#ffffff'); const c2 = o.cor2 ? new THREE.Color(o.cor2) : null;
    for (let k = 0; k < n; k++) {
      if (this.n >= this.cap) return;
      const i = this.n++;
      const ang = Math.random() * Math.PI * 2, el = (Math.random() - 0.3) * Math.PI;
      const sp = (o.vel || 3) * (0.4 + Math.random() * 0.8);
      const esp = o.espalhar || 0.2;
      this.pos[i * 3] = o.x + (Math.random() - 0.5) * esp; this.pos[i * 3 + 1] = o.y + (Math.random() - 0.5) * esp * (o.espY ?? 1); this.pos[i * 3 + 2] = o.z + (Math.random() - 0.5) * esp;
      let vx = Math.cos(ang) * Math.cos(el) * sp, vy = Math.abs(Math.sin(el)) * sp * (o.sobe ?? 1), vz = Math.sin(ang) * Math.cos(el) * sp;
      if (o.dir) { vx = o.dir.x * sp + vx * (o.disp ?? 0.3); vy = o.dir.y * sp + vy * (o.disp ?? 0.3); vz = o.dir.z * sp + vz * (o.disp ?? 0.3); }
      if (o.vy !== undefined) vy += o.vy;
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      const cc = c2 && Math.random() < 0.5 ? c2 : c;
      this.cor[i * 3] = cc.r; this.cor[i * 3 + 1] = cc.g; this.cor[i * 3 + 2] = cc.b;
      const vida = (o.vida || 0.6) * (0.6 + Math.random() * 0.7);
      this.vida[i] = vida; this.max[i] = vida;
      this.t0[i] = (o.tam || 0.5) * (0.7 + Math.random() * 0.6); this.t1[i] = o.tamFim ?? this.t0[i] * 0.2;
      this.grav[i] = o.grav ?? 0; this.arr[i] = o.arrasto ?? 1.5;
      this.tam[i] = this.t0[i]; this.alfa[i] = 1;
    }
  }
  atualizar(dt) {
    let i = 0;
    while (i < this.n) {
      this.vida[i] -= dt;
      if (this.vida[i] <= 0) { this.trocar(i, --this.n); continue; }
      const k = Math.exp(-this.arr[i] * dt);
      this.vel[i * 3] *= k; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.grav[i] * dt; this.vel[i * 3 + 2] *= k;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const t = 1 - this.vida[i] / this.max[i];
      this.tam[i] = this.t0[i] + (this.t1[i] - this.t0[i]) * t;
      this.alfa[i] = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      i++;
    }
    const g = this.geo; g.setDrawRange(0, this.n);
    g.attributes.position.needsUpdate = true; g.attributes.cor.needsUpdate = true; g.attributes.tam.needsUpdate = true; g.attributes.alfa.needsUpdate = true;
  }
  trocar(a, b) {
    if (a === b) return;
    for (const arr of [this.pos, this.vel, this.cor]) { arr[a * 3] = arr[b * 3]; arr[a * 3 + 1] = arr[b * 3 + 1]; arr[a * 3 + 2] = arr[b * 3 + 2]; }
    for (const arr of [this.tam, this.alfa, this.vida, this.max, this.t0, this.t1, this.grav, this.arr]) arr[a] = arr[b];
  }
  limpar() { this.n = 0; this.geo.setDrawRange(0, 0); }
}

// ============================================================
//  Efeitos visuais
// ============================================================
ENG.luz = function (pos, cor, int, dur, alcance = 12, segue = null) {
  let melhor = ENG.luzes[0];
  for (const L of ENG.luzes) { if (L.vida <= 0) { melhor = L; break; } if (L.vida < melhor.vida) melhor = L; }
  melhor.l.color.set(cor); melhor.l.position.copy(pos); melhor.l.distance = alcance;
  int *= 2.6;
  melhor.vida = dur; melhor.max = dur; melhor.int = int; melhor.segue = segue; melhor.l.intensity = int;
  return melhor;
};

const _telegrafoMat = (cor) => new THREE.ShaderMaterial({
  uniforms: { cor: { value: new THREE.Color(cor) }, prog: { value: 0 }, opac: { value: 1 } },
  vertexShader: `attribute float rad; varying float vR; void main(){ vR=rad; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 cor; uniform float prog; uniform float opac; varying float vR;
    void main(){ float borda=smoothstep(0.90,0.97,vR)*(1.0-smoothstep(0.985,1.0,vR)); float fill=vR<prog?0.42:0.10; float frente=smoothstep(prog-0.04,prog,vR)*(1.0-smoothstep(prog,prog+0.01,vR))*0.6;
    float a=max(borda*0.95,fill+frente)*opac; gl_FragColor=vec4(cor*(1.0+borda), a); }`,
  transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide,
  polygonOffset: true, polygonOffsetFactor: -4,
});
// disco que acompanha o relevo
ENG.discoTerreno = function (x, z, raio, cor, opc = {}) {
  const seg = 40, aneis = 6;
  const pos = [], rad = [], idx = [];
  pos.push(0, 0, 0); rad.push(0);
  for (let a = 1; a <= aneis; a++) for (let s = 0; s < seg; s++) {
    const r = a / aneis, ang = s / seg * Math.PI * 2;
    pos.push(Math.cos(ang) * r, 0, Math.sin(ang) * r); rad.push(r);
  }
  for (let s = 0; s < seg; s++) idx.push(0, 1 + (s + 1) % seg, 1 + s);
  for (let a = 1; a < aneis; a++) for (let s = 0; s < seg; s++) {
    const i0 = 1 + (a - 1) * seg + s, i1 = 1 + (a - 1) * seg + (s + 1) % seg, j0 = 1 + a * seg + s, j1 = 1 + a * seg + (s + 1) % seg;
    idx.push(i0, i1, j1, i0, j1, j0);
  }
  const g = new THREE.BufferGeometry();
  const P = new Float32Array(pos);
  for (let i = 0; i < P.length; i += 3) {
    const wx = x + P[i] * raio, wz = z + P[i + 2] * raio;
    P[i] = wx; P[i + 1] = (ENG.mundo ? ENG.mundo.h(wx, wz) : 0) + 0.15; P[i + 2] = wz;
  }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('rad', new THREE.BufferAttribute(new Float32Array(rad), 1));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, _telegrafoMat(cor)); m.renderOrder = 2; m.frustumCulled = false;
  ENG.scene.add(m);
  return m;
};
ENG.removerMalha = function (m) { if (!m) return; ENG.scene.remove(m); m.geometry && !m.geometry.userData.cache && m.geometry.dispose(); m.material && m.material.dispose && !m.material.userData.cache && m.material.dispose(); };

// anel de onda de choque (efeito)
ENG.onda = function (x, y, z, raio, cor, dur = 0.4) {
  const g = new THREE.RingGeometry(0.85, 1, 48); g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const me = new THREE.Mesh(g, m); me.position.set(x, y + 0.3, z); ENG.scene.add(me);
  ENG.efeitos.push({ me, t: 0, dur, upd: (e, k) => { const s = 0.2 + k * raio; me.scale.set(s, 1, s); m.opacity = 0.9 * (1 - k); } });
};
// golpe em arco
ENG.arcoGolpe = function (x, y, z, ang, raio, arcoGraus, cor) {
  const ar = arcoGraus * Math.PI / 180;
  const g = new THREE.RingGeometry(raio * 0.72, raio, 24, 1, -ar / 2, ar); g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const me = new THREE.Mesh(g, m); me.position.set(x, y + 1.0, z); me.rotation.y = -ang;
  ENG.scene.add(me);
  ENG.efeitos.push({ me, t: 0, dur: 0.22, upd: (e, k) => { m.opacity = 0.5 * (1 - k); me.scale.setScalar(0.8 + k * 0.3); me.rotation.y = -ang - (k - 0.5) * 0.5; } });
};
// raio (relâmpago)
ENG.relampago = function (a, b, cor, larg = 0.12) {
  const pts = [a.clone()]; const n = Math.max(3, Math.floor(a.distanceTo(b) / 1.5));
  for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); p.x += (Math.random() - 0.5) * 1.2; p.y += (Math.random() - 0.5) * 0.8; p.z += (Math.random() - 0.5) * 1.2; pts.push(p); }
  pts.push(b.clone());
  const grupo = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i], p1 = pts[i + 1]; const L = p0.distanceTo(p1);
    const c = new THREE.Mesh(_geoCil(), m); c.scale.set(larg, L, larg);
    c.position.copy(p0).lerp(p1, 0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
    grupo.add(c);
  }
  ENG.scene.add(grupo);
  ENG.efeitos.push({ me: grupo, t: 0, dur: 0.22, upd: (e, k) => { m.opacity = 1 - k; } , mats: [m] });
};
let _gc = null; function _geoCil() { if (!_gc) { _gc = new THREE.CylinderGeometry(1, 1, 1, 5); _gc.userData.cache = true; } return _gc; }
// coluna de luz
ENG.coluna = function (x, y, z, cor, alt = 8, larg = 1, dur = 0.5) {
  const g = new THREE.CylinderGeometry(larg, larg * 0.6, alt, 16, 1, true);
  const m = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const me = new THREE.Mesh(g, m); me.position.set(x, y + alt / 2, z); ENG.scene.add(me);
  ENG.efeitos.push({ me, t: 0, dur, upd: (e, k) => { m.opacity = 0.7 * (1 - k); me.scale.set(1 - k * 0.6, 1, 1 - k * 0.6); } });
};

ENG.atualizarEfeitos = function (dt) {
  for (let i = ENG.efeitos.length - 1; i >= 0; i--) {
    const e = ENG.efeitos[i]; e.t += dt; const k = Math.min(1, e.t / e.dur);
    e.upd(e, k);
    if (k >= 1) {
      ENG.scene.remove(e.me);
      e.me.traverse(c => { if (c.geometry && !c.geometry.userData.cache) c.geometry.dispose(); if (c.material) c.material.dispose(); });
      ENG.efeitos.splice(i, 1);
    }
  }
  for (const L of ENG.luzes) {
    if (L.vida > 0) {
      L.vida -= dt; L.l.intensity = L.int * Math.max(0, L.vida / L.max);
      if (L.segue) L.l.position.copy(L.segue);
      if (L.vida <= 0) { L.l.intensity = 0; L.segue = null; }
    }
  }
  ENG.particulas.atualizar(dt); ENG.fumaca.atualizar(dt);
};

ENG.limparEfeitos = function () {
  for (const e of ENG.efeitos) ENG.scene.remove(e.me);
  ENG.efeitos.length = 0;
  for (const L of ENG.luzes) { L.vida = 0; L.l.intensity = 0; L.segue = null; }
  ENG.particulas.limpar(); ENG.fumaca.limpar();
};
