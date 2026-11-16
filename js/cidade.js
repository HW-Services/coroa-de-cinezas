// ============================================================
//  Cidades e estruturas interativas (portões, pedras de passagem,
//  baú, dispositivo de mapas, objetivos de missão)
// ============================================================
'use strict';

const EST = {};
const _matE = {};
function matE(cor, o = {}) {
  const k = cor + '|' + Object.keys(o).map(n => n + ':' + (o[n] && o[n].isTexture ? o[n].uuid : o[n])).join(',');
  if (!_matE[k]) _matE[k] = new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: 0.85, metalness: 0 }, o));
  return _matE[k];
}
function malha(geo, mat, pai, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, sombra = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = sombra; m.receiveShadow = true; pai.add(m); return m;
}
const gB = () => G('estBox', () => new THREE.BoxGeometry(1, 1, 1));
const gC = () => G('estCil', () => new THREE.CylinderGeometry(1, 1, 1, 12));
const gPir = () => G('estPir', () => new THREE.ConeGeometry(0.75, 1, 4));
const gTelhado = () => G('estTelhado', () => {
  const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 0.55); s.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g;
});
const pedraMat = () => matE(0x8a857a, { map: GFX.tex.rochaA, normalMap: GFX.tex.rochaN, roughness: 0.9 });

// ------------------------------------------------------------
// Portão de transição entre áreas
// ------------------------------------------------------------
EST.portao = function (x, z, ang, cor, rotulo) {
  const g = new THREE.Group();
  const y = ENG.mundo.h(x, z);
  g.position.set(x, y, z); g.rotation.y = ang;
  const pm = pedraMat();
  for (const lado of [-1, 1]) {
    malha(gB(), pm, g, lado * 2.1, 2.1, 0, 0.9, 4.2, 0.9);
    malha(gB(), pm, g, lado * 2.1, 0.25, 0, 1.3, 0.5, 1.3);
    malha(gB(), pm, g, lado * 2.1, 4.35, 0, 1.15, 0.3, 1.15);
  }
  malha(gB(), pm, g, 0, 4.75, 0, 5.4, 0.6, 1.0);
  const runa = malha(G('runaPortao', () => new THREE.OctahedronGeometry(0.35, 0)), new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 3 }), g, 0, 4.75, 0.55, 1, 1, 0.4, false);
  const vMat = new THREE.ShaderMaterial({
    uniforms: { cor: { value: new THREE.Color(cor) }, t: GFX.uTempo, aberto: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 cor; uniform float t, aberto; varying vec2 vUv;
      void main(){ vec2 p = vUv - 0.5; float r = length(p * vec2(1.0, 0.85)); float a = atan(p.y, p.x);
        float rede = sin(a * 6.0 + t * 2.5 - r * 18.0) * 0.5 + 0.5; float borda = smoothstep(0.5, 0.2, r);
        vec3 c = mix(cor * 0.6, cor * 2.4, rede * smoothstep(0.45, 0.0, r));
        vec3 bloq = vec3(1.4, 0.15, 0.08) * (0.6 + 0.4 * sin(vUv.y * 40.0 + t * 4.0));
        gl_FragColor = vec4(mix(bloq, c, aberto), borda * (0.55 + 0.25 * rede)); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const veu = malha(G('veuPortao', () => new THREE.PlaneGeometry(3.4, 4.2)), vMat, g, 0, 2.15, 0, 1, 1, 1, false);
  g.userData = { veu, vMat, runa, rotulo };
  ENG.scene.add(g);
  return g;
};

// ------------------------------------------------------------
// Pedra de Passagem (teleporte)
// ------------------------------------------------------------
EST.pedraPassagem = function (x, z) {
  const g = new THREE.Group(); const y = ENG.mundo.h(x, z);
  g.position.set(x, y, z);
  const pm = pedraMat();
  malha(gC(), pm, g, 0, 0.18, 0, 2.4, 0.36, 2.4);
  malha(gC(), pm, g, 0, 0.45, 0, 1.8, 0.25, 1.8);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; const m = malha(gB(), pm, g, Math.cos(a) * 1.9, 1.1, Math.sin(a) * 1.9, 0.4, 2.0, 0.4); m.rotation.y = -a; }
  const cristalMat = new THREE.MeshStandardMaterial({ color: 0x60b0ff, emissive: 0x3a90ff, emissiveIntensity: 0.4, roughness: 0.15, metalness: 0.2, flatShading: true });
  const cristal = malha(G('cristalPassagem', () => new THREE.OctahedronGeometry(0.6, 0)), cristalMat, g, 0, 2.2, 0, 1, 1.7, 1, false);
  const anel = malha(G('anelPassagem', () => { const r = new THREE.RingGeometry(1.2, 1.55, 40); r.rotateX(-Math.PI / 2); return r; }), new THREE.MeshBasicMaterial({ color: 0x4090ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }), g, 0, 0.6, 0, 1, 1, 1, false);
  g.userData = { cristal, cristalMat, anel };
  ENG.scene.add(g);
  return g;
};
EST.ativarPassagem = function (g, ativa) {
  const u = g.userData; u.cristalMat.emissiveIntensity = ativa ? 3.5 : 0.4; u.anel.material.opacity = ativa ? 0.7 : 0;
};

// ------------------------------------------------------------
// Baú, dispositivo de mapas, objetivo de missão, portal da cidade
// ------------------------------------------------------------
EST.bau = function (x, z, ang = 0) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z), z); g.rotation.y = ang;
  const mad = matE(0x5a3a1e, { map: GFX.tex.rochaA, roughness: 0.8 }), ferro = matE(0x4a4a50, { metalness: 0.8, roughness: 0.4 }), ouro = matE(0xc8a040, { metalness: 0.9, roughness: 0.3 });
  malha(gB(), mad, g, 0, 0.45, 0, 1.6, 0.9, 1.0);
  malha(G('tampaBau', () => new THREE.CylinderGeometry(0.5, 0.5, 1.6, 12, 1, false, 0, Math.PI)), mad, g, 0, 0.9, 0, 1, 1, 1).rotation.z = Math.PI / 2;
  for (const xx of [-0.6, 0.6]) malha(gB(), ferro, g, xx, 0.75, 0, 0.12, 1.25, 1.06);
  malha(gB(), ouro, g, 0, 0.75, 0.52, 0.22, 0.28, 0.06);
  ENG.scene.add(g); return g;
};
EST.dispositivo = function (x, z) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z), z);
  const pm = pedraMat(), bronze = matE(0x9a7a3a, { metalness: 0.85, roughness: 0.35 });
  malha(gC(), pm, g, 0, 0.3, 0, 2.2, 0.6, 2.2);
  malha(gC(), bronze, g, 0, 0.75, 0, 1.6, 0.3, 1.6);
  const roda = new THREE.Group(); roda.position.y = 2.2; g.add(roda);
  for (let i = 0; i < 3; i++) { const t = malha(G('toroDisp', () => new THREE.TorusGeometry(1.4, 0.07, 8, 40)), bronze, roda, 0, 0, 0); t.rotation.set(i * 1.05, i * 0.6, 0); }
  const nucleo = malha(gEsf(), new THREE.MeshStandardMaterial({ color: 0xa070ff, emissive: 0x8040ff, emissiveIntensity: 2.6 }), roda, 0, 0, 0, 0.45, 0.45, 0.45, false);
  g.userData = { roda, nucleo };
  ENG.scene.add(g); return g;
};
EST.objetivo = function (x, z, nome) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z), z);
  const pm = pedraMat();
  malha(gC(), pm, g, 0, 0.25, 0, 1.6, 0.5, 1.6);
  malha(gB(), pm, g, 0, 1.0, 0, 1.0, 1.1, 0.7);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; malha(gB(), pm, g, Math.cos(a) * 2.2, 0.9, Math.sin(a) * 2.2, 0.35, 1.8, 0.35).rotation.y = a; }
  const cor = nome.includes('Ígneo') ? 0xff5020 : nome.includes('Cristal') ? 0xa060ff : 0x40e0c0;
  const mat = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 3, roughness: 0.2, flatShading: true });
  const joia = malha(G('joiaObj', () => new THREE.OctahedronGeometry(0.45, 0)), mat, g, 0, 2.2, 0, 1, 1.4, 1, false);
  const feixe = new THREE.Mesh(G('feixeObj', () => new THREE.CylinderGeometry(0.25, 0.6, 1, 12, 1, true)), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  feixe.scale.y = 16; feixe.position.y = 8; g.add(feixe);
  g.userData = { joia, mat, feixe, cor };
  ENG.scene.add(g); return g;
};
EST.portalCidade = function (x, z) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z), z);
  const anel = malha(G('anelPortalC', () => new THREE.TorusGeometry(1.4, 0.12, 10, 40)), new THREE.MeshStandardMaterial({ color: 0x80a0ff, emissive: 0x6080ff, emissiveIntensity: 3 }), g, 0, 1.8, 0, 1, 1, 1, false);
  const disco = malha(G('discoPortalC', () => new THREE.CircleGeometry(1.35, 32)), new THREE.MeshBasicMaterial({ color: 0x5070ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }), g, 0, 1.8, 0, 1, 1, 1, false);
  g.userData = { anel, disco };
  ENG.scene.add(g); return g;
};

// ------------------------------------------------------------
// Construção da cidade
// ------------------------------------------------------------
// caixa com UV em metros (texturas sem esticar)
function caixaUV(w, h, d, T = 2) {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
  const esc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * esc[f][0] / T, uv.getY(i) * esc[f][1] / T); }
  return g;
}
// junta as peças de uma construção por material (poucas chamadas de desenho)
function Obra() {
  const grupos = new Map();
  const o = {
    add(mat, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      if (!grupos.has(mat)) grupos.set(mat, []);
      grupos.get(mat).push({ g: geo, m: M4(x, y, z, rx, ry, rz, sx, sy, sz), c: _branco });
      return o;
    },
    caixa(mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, T = 2) { return o.add(mat, caixaUV(w, h, d, T), x, y, z, rx, ry, rz); },
    fim(pai, sombra = true) {
      for (const [mat, lista] of grupos) {
        const g = D3.fundir(lista); g.userData.cache = false;
        const m = new THREE.Mesh(g, mat); m.castShadow = sombra && !(mat.emissiveIntensity > 1); m.receiveShadow = true; pai.add(m);
      }
    },
  };
  return o;
}
const _branco = new THREE.Color(1, 1, 1);
// materiais com textura (a cor é compensada pela luminância média da textura)
function matT(cor, tex, o = {}) {
  const c = new THREE.Color(cor).multiplyScalar(o.mult || 1.8);
  const k = 'T' + c.getHexString() + '|' + tex + '|' + (o.rough || 0.9) + (o.side ? 'D' : '');
  if (!_matE[k]) {
    _matE[k] = new THREE.MeshStandardMaterial({ color: c, map: GFX.tex[tex + 'A'], normalMap: GFX.tex[tex + 'N'] || null, roughness: o.rough || 0.9, metalness: 0, vertexColors: true, side: o.side ? THREE.DoubleSide : THREE.FrontSide });
    _matE[k].userData.cache = true;
  }
  return _matE[k];
}
function matV(cor, o = {}) { return matE(cor, Object.assign({ vertexColors: true }, o)); }

// janela com moldura, vidro aceso, travessas, venezianas e floreira
function janela(ob, M, x, y, z, ry, w = 0.62, h = 0.72, flores = false) {
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const P = (dx, dy, dz) => [x + dx * cs + dz * sn, y + dy, z - dx * sn + dz * cs];
  ob.caixa(M.madeira, w + 0.2, h + 0.2, 0.1, ...P(0, 0, 0.02), 0, ry, 0, 1);
  ob.caixa(M.vidro, w, h, 0.06, ...P(0, 0, 0.06), 0, ry, 0);
  ob.caixa(M.ferro, 0.05, h, 0.05, ...P(0, 0, 0.1), 0, ry, 0); ob.caixa(M.ferro, w, 0.05, 0.05, ...P(0, 0, 0.1), 0, ry, 0);
  for (const l of [-1, 1]) ob.caixa(M.veneziana, w * 0.5, h + 0.1, 0.05, ...P(l * (w * 0.5 + 0.32), 0, 0.12), 0, ry + l * 0.35, 0, 1);
  ob.caixa(M.madeira, w + 0.32, 0.08, 0.22, ...P(0, -h / 2 - 0.12, 0.1), 0, ry, 0, 1);
  if (flores) {
    ob.caixa(M.madeira, w + 0.1, 0.16, 0.18, ...P(0, -h / 2 - 0.25, 0.14), 0, ry, 0, 1);
    for (let i = 0; i < 5; i++) ob.add(i % 2 ? M.flor1 : M.flor2, G('florE', () => new THREE.IcosahedronGeometry(0.09, 0)), ...P(-w / 2 + 0.06 + i * (w - 0.12) / 4, -h / 2 - 0.13, 0.15));
  }
}
EST.matsCidade = function (P) {
  return {
    pedra: matT(0x8a857a, 'rocha', { mult: 1.6 }), reboco: matT(P.parede, 'reboco', { mult: 1.45, rough: 0.95 }),
    madeira: matT(P.madeira, 'madeira', { mult: 2.0 }), telha: matT(P.telhado, 'telha', { mult: 2.1, rough: 0.8 }),
    veneziana: matT(P.pano, 'madeira', { mult: 1.6 }), porta: matT(P.madeira, 'madeira', { mult: 1.5 }),
    vidro: matV(0xffb050, { emissive: 0xff9a30, emissiveIntensity: 1.8, roughness: 0.3 }),
    ferro: matV(0x2a2622, { metalness: 0.6, roughness: 0.5 }),
    flor1: matV(0xc03040), flor2: matV(0xe0c040),
    luz: matV(0xffc070, { emissive: 0xffa040, emissiveIntensity: 3 }),
  };
};

// ------------------------------------------------------------
// Construção da cidade
// ------------------------------------------------------------
EST.casa = function (pai, x, z, ang, larg, prof, alt, P, rnd) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z) - 0.1, z); g.rotation.y = ang; pai.add(g);
  const M = EST.matsCidade(P), ob = Obra();
  const base = 0.6;
  ob.caixa(M.pedra, larg + 0.4, base + 0.3, prof + 0.4, 0, base / 2 - 0.15, 0, 0, 0, 0, 1.5);
  // térreo
  const a1 = Math.min(alt, 2.9);
  ob.caixa(M.reboco, larg, a1, prof, 0, base + a1 / 2, 0);
  const enxaimel = (L, Pd, y0, h, comBraco) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) ob.caixa(M.madeira, 0.22, h + 0.06, 0.22, sx * L / 2, y0 + h / 2, sz * Pd / 2, 0, 0, 0, 1);
    for (const sz of [-1, 1]) { ob.caixa(M.madeira, L + 0.1, 0.2, 0.2, 0, y0 + h, sz * Pd / 2, 0, 0, 0, 1); ob.caixa(M.madeira, L + 0.1, 0.16, 0.18, 0, y0 + 0.08, sz * Pd / 2, 0, 0, 0, 1); }
    for (const sx of [-1, 1]) { ob.caixa(M.madeira, 0.2, 0.2, Pd + 0.1, sx * L / 2, y0 + h, 0, 0, 0, 0, 1); ob.caixa(M.madeira, 0.18, 0.16, Pd + 0.1, sx * L / 2, y0 + 0.08, 0, 0, 0, 0, 1); }
    if (comBraco) {
      const diag = Math.hypot(L * 0.3, h), ang = Math.atan2(L * 0.3, h);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) ob.caixa(M.madeira, 0.13, diag, 0.12, sx * (L / 2 - L * 0.15), y0 + h / 2, sz * (Pd / 2 + 0.02), 0, 0, sx * ang, 1);
      // montantes intermediários nas laterais
      for (const sx of [-1, 1]) ob.caixa(M.madeira, 0.12, h, 0.14, sx * (L / 2 + 0.02), y0 + h / 2, 0, 0, 0, 0, 1);
    }
  };
  enxaimel(larg, prof, base, a1, false);
  // porta com batente, degrau e lanterna
  ob.caixa(M.madeira, 1.25, 2.05, 0.14, 0, base + 1.0, prof / 2 + 0.02, 0, 0, 0, 1);
  ob.caixa(M.porta, 0.95, 1.85, 0.08, 0, base + 0.93, prof / 2 + 0.08, 0, 0, 0, 1);
  ob.add(M.ferro, G('macaneta', () => new THREE.SphereGeometry(0.05, 6, 4)), 0.3, base + 0.95, prof / 2 + 0.14);
  ob.caixa(M.pedra, 1.5, 0.22, 0.6, 0, base - 0.05, prof / 2 + 0.45, 0, 0, 0, 1.2);
  ob.caixa(M.ferro, 0.06, 0.06, 0.35, 0.85, base + 2.0, prof / 2 + 0.2); ob.caixa(M.luz, 0.18, 0.26, 0.18, 0.85, base + 1.82, prof / 2 + 0.36);
  // janelas do térreo (frente e laterais)
  const fl = rnd() < 0.6;
  for (const sx of [-1, 1]) if (larg > 3.8) janela(ob, M, sx * larg * 0.3, base + a1 * 0.58, prof / 2, 0, 0.62, 0.72, fl);
  for (const sx of [-1, 1]) janela(ob, M, sx * larg / 2, base + a1 * 0.58, 0, sx * Math.PI / 2, 0.55, 0.7, false);
  janela(ob, M, 0, base + a1 * 0.58, -prof / 2, Math.PI, 0.6, 0.7, false);
  // segundo andar em balanço
  let topo = base + a1, L2 = larg, P2 = prof;
  if (alt > 3.1 || rnd() < 0.45) {
    L2 = larg + 0.4; P2 = prof + 0.4; const a2 = 2.2;
    for (const sx of [-1, 0, 1]) ob.caixa(M.madeira, 0.18, 0.18, P2 + 0.2, sx * L2 * 0.42, topo + 0.08, 0, 0, 0, 0, 1);
    ob.caixa(M.reboco, L2, a2, P2, 0, topo + 0.18 + a2 / 2, 0);
    enxaimel(L2, P2, topo + 0.18, a2, true);
    for (const sx of [-1, 1]) janela(ob, M, sx * L2 * 0.2, topo + 0.18 + a2 * 0.55, P2 / 2, 0, 0.5, 0.62, fl && rnd() < 0.5);
    topo += 0.18 + a2;
  }
  // telhado em duas águas com beiral, cumeeira e oitões
  const rh = P2 * 0.55, hd = P2 / 2 + 0.5, Ls = Math.hypot(hd, rh), th = Math.atan2(rh, hd);
  const oitao = new THREE.Mesh(gTelhado(), M.reboco); // preenchimento triangular
  oitao.position.set(0, topo, 0); oitao.scale.set(P2, rh / 0.55, L2); oitao.rotation.y = Math.PI / 2; oitao.castShadow = true; oitao.receiveShadow = true; g.add(oitao);
  for (const lado of [-1, 1]) ob.caixa(M.telha, L2 + 1.0, 0.16, Ls + 0.1, 0, topo + rh / 2 + 0.09, lado * hd / 2, lado * th, 0, 0, 1.6);
  ob.caixa(M.madeira, L2 + 1.1, 0.24, 0.28, 0, topo + rh + 0.12, 0, 0, 0, 0, 1);
  for (const sx of [-1, 1]) for (const lado of [-1, 1]) ob.caixa(M.madeira, 0.14, 0.2, Ls + 0.15, sx * (L2 / 2 + 0.5), topo + rh / 2 + 0.03, lado * hd / 2, lado * th, 0, 0, 1);
  // chaminé
  if (rnd() < 0.75) {
    const cx = (rnd() < 0.5 ? -1 : 1) * L2 * 0.28, cz = -hd * 0.35, hc = rh + 1.4;
    ob.caixa(M.pedra, 0.65, hc, 0.65, cx, topo + hc / 2, cz, 0, 0, 0, 1);
    ob.caixa(M.pedra, 0.85, 0.16, 0.85, cx, topo + hc, cz, 0, 0, 0, 1);
  }
  // barris e caixotes ao lado da casa
  if (rnd() < 0.6) {
    const lado = rnd() < 0.5 ? -1 : 1;
    ob.add(M.madeira, G('barril', () => { const b = new THREE.CylinderGeometry(0.34, 0.34, 0.85, 12, 3); const p = b.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + (0.18 - y * y * 0.5) * 0.6; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } b.computeVertexNormals(); return b; }), lado * (larg / 2 + 0.5), 0.5, prof / 2 - 0.2);
    ob.caixa(M.madeira, 0.7, 0.7, 0.7, lado * (larg / 2 + 0.55), 0.45, prof / 2 - 1.1, 0, rnd(), 0, 0.7);
    if (rnd() < 0.5) ob.caixa(M.madeira, 0.5, 0.5, 0.5, lado * (larg / 2 + 0.5), 1.05, prof / 2 - 1.1, 0, rnd(), 0, 0.5);
  }
  ob.fim(g);
  return g;
};
GFX.texListras = function (cor) {
  const k = 'listras' + cor; if (GFX.tex[k]) return GFX.tex[k];
  const c = document.createElement('canvas'); c.width = 128; c.height = 16; const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#e8dcc0' : '#' + new THREE.Color(cor).convertLinearToSRGB().getHexString(); x.fillRect(i * 16, 0, 16, 16); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; GFX.tex[k] = t; return t;
};
EST.barraca = function (pai, x, z, ang, P) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z), z); g.rotation.y = ang; pai.add(g);
  const M = EST.matsCidade(P), ob = Obra();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ob.caixa(M.madeira, 0.14, 2.3, 0.14, sx * 1.3, 1.15, sz * 0.9, 0, 0, 0, 1);
  ob.caixa(M.madeira, 2.7, 0.12, 1.2, 0, 0.85, 0.3, 0, 0, 0, 1);
  ob.caixa(M.madeira, 2.6, 0.75, 0.1, 0, 0.45, 0.88, 0, 0, 0, 1);
  // mercadorias
  const cores = [0xc04030, 0xd8a040, 0x6a8a30, 0x8a5a2a, 0xa05ab0];
  for (let i = 0; i < 6; i++) {
    const cx = -1.05 + i * 0.42;
    ob.caixa(M.madeira, 0.38, 0.14, 0.38, cx, 0.98, 0.3, 0, 0, 0, 0.5);
    for (let k = 0; k < 4; k++) ob.add(matV(cores[i % 5]), G('fruta', () => new THREE.IcosahedronGeometry(0.075, 1)), cx + (k % 2 - 0.5) * 0.15, 1.1 + (k > 1 ? 0.06 : 0), 0.3 + (k % 2 ? 0.08 : -0.08));
  }
  ob.add(M.madeira, G('barril', () => new THREE.CylinderGeometry(0.34, 0.34, 0.85, 12)), 1.7, 0.43, -0.4);
  ob.caixa(M.madeira, 0.6, 0.6, 0.6, -1.75, 0.3, -0.5, 0, 0.4, 0, 0.6);
  ob.fim(g);
  // toldo listrado
  const pano = new THREE.MeshStandardMaterial({ map: GFX.texListras(P.pano), side: THREE.DoubleSide, roughness: 0.9 });
  const tg = new THREE.PlaneGeometry(3.2, 2.5, 8, 4); const pp = tg.attributes.position;
  for (let i = 0; i < pp.count; i++) { const px = pp.getX(i), py = pp.getY(i); pp.setZ(i, -Math.cos(px * 2) * 0.06 - (py + 1.25) * 0.18); }
  tg.computeVertexNormals(); const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 3);
  const t = new THREE.Mesh(tg, pano); t.position.set(0, 2.45, 0.2); t.rotation.x = -Math.PI / 2 + 0.28; t.castShadow = true; t.receiveShadow = true; g.add(t);
  // franja
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.3), pano); fr.position.set(0, 2.05, 1.42); fr.castShadow = true; g.add(fr);
  return g;
};
EST.poste = function (pai, x, z) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z), z); pai.add(g);
  const M = EST.matsCidade({ parede: 0xc8bca0, madeira: 0x4a3420, telhado: 0x5a3a30, pano: 0x2a4a6a }), ob = Obra();
  ob.caixa(M.pedra, 0.55, 0.4, 0.55, 0, 0.2, 0, 0, 0, 0, 1);
  ob.add(M.ferro, G('posteF', () => new THREE.CylinderGeometry(0.06, 0.09, 3.0, 8)), 0, 1.9, 0);
  ob.add(M.ferro, G('posteB', () => new THREE.CylinderGeometry(0.035, 0.035, 0.7, 6)), 0.3, 3.3, 0, 0, 0, Math.PI / 2);
  ob.add(M.ferro, G('posteT', () => new THREE.ConeGeometry(0.22, 0.2, 4)), 0.62, 3.2, 0, 0, Math.PI / 4, 0);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ob.caixa(M.ferro, 0.03, 0.36, 0.03, 0.62 + dx * 0.12, 2.9, dz * 0.12);
  ob.caixa(M.luz, 0.2, 0.3, 0.2, 0.62, 2.9, 0);
  ob.fim(g);
  return g;
};

EST.construirCidade = function (mundo, C) {
  const P = C.paleta; const rnd = mulberry32(C.ato * 1337);
  const raiz = new THREE.Group(); ENG.scene.add(raiz); mundo.objetos.push(raiz);
  // muralha em anel com abertura a leste (portão)
  const R = 33; const pm = pedraMat();
  const MC = EST.matsCidade(P); const obM = Obra();
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.3) continue;
    const x = Math.cos(a) * R, z = Math.sin(a) * R; const y = mundo.h(x, z) - 0.3;
    const ry = -a + Math.PI / 2, cs = Math.cos(ry), sn = Math.sin(ry);
    const L = (dx, dy, dz) => [x + dx * cs + dz * sn, y + dy, z - dx * sn + dz * cs];
    obM.caixa(MC.pedra, 6.9, 4.4, 1.6, ...L(0, 2.2, 0), 0, ry, 0, 1.6);
    obM.caixa(MC.pedra, 7.1, 0.3, 1.9, ...L(0, 4.35, 0), 0, ry, 0, 1.6);
    for (let k = -2; k <= 2; k++) obM.caixa(MC.pedra, 0.8, 0.7, 1.7, ...L(k * 1.4, 4.85, 0), 0, ry, 0, 1.2);
    if (i % 4 === 0) {
      obM.add(MC.pedra, G('torreC', () => { const t = new THREE.CylinderGeometry(1.7, 1.9, 6.5, 16, 1); const uv = t.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * 5, uv.getY(j) * 3); return t; }), ...L(0, 3.0, 0), 0, ry, 0);
      obM.add(MC.pedra, G('torreA', () => new THREE.CylinderGeometry(2.1, 2.0, 0.5, 16, 1)), ...L(0, 6.4, 0), 0, ry, 0);
      obM.add(MC.telha, G('torreT', () => { const t = new THREE.ConeGeometry(2.4, 3.0, 16, 1, true); const uv = t.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * 6, uv.getY(j) * 2.5); return t; }), ...L(0, 8.1, 0), 0, ry, 0);
      obM.add(MC.ferro, G('torreP', () => new THREE.ConeGeometry(0.08, 1.2, 6)), ...L(0, 10.1, 0), 0, ry, 0);
      obM.caixa(MC.vidro, 0.35, 0.6, 0.1, ...L(0, 4.0, -1.8), 0, ry, 0);
    }
  }
  obM.fim(raiz);
  // casas fora da praça
  const casas = [];
  for (let i = 0; i < 13; i++) {
    const a = i / 13 * Math.PI * 2 + 0.25; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.55) continue;
    const r = 25.5 + rnd() * 1.5; const x = Math.cos(a) * r, z = Math.sin(a) * r;
    EST.casa(raiz, x, z, -a - Math.PI / 2, 4.6 + rnd() * 2, 4 + rnd() * 1.2, 2.8 + rnd() * 1.2, P, rnd);
    mundo.obst.push({ x, z, r: 3.2 });
    casas.push({ x, z });
  }
  // barracas de mercado e postes dentro da praça (obstáculos)
  const barracas = [[-11, -12, 0.6], [-16, -3, 1.4], [-12, 12, 2.4], [8, -15, -0.3]];
  for (const [x, z, a] of barracas) { EST.barraca(raiz, x, z, a, P); mundo.obst.push({ x, z, r: 1.9 }); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.4; const x = Math.cos(a) * 18, z = Math.sin(a) * 18; EST.poste(raiz, x, z); mundo.obst.push({ x, z, r: 0.35 }); }
  // poço
  {
    const g = new THREE.Group(); g.position.set(-5, mundo.h(-5, 9), 9); raiz.add(g);
    malha(G('poco', () => new THREE.CylinderGeometry(1.3, 1.4, 1.0, 16, 1, true)), matE(0x8a857a, { map: GFX.tex.rochaA, normalMap: GFX.tex.rochaN, side: THREE.DoubleSide }), g, 0, 0.5, 0);
    malha(gC(), matE(0x203040, { roughness: 0.1 }), g, 0, 0.3, 0, 1.2, 0.05, 1.2, false);
    for (const sx of [-1.1, 1.1]) malha(gB(), matE(P.madeira), g, sx, 1.5, 0, 0.15, 2.0, 0.15);
    malha(gTelhado(), matE(P.telhado, { map: GFX.tex.camA }), g, 0, 2.4, 0, 2.8, 0.8, 1.6).rotation.y = Math.PI / 2;
    mundo.obst.push({ x: -5, z: 9, r: 1.6 });
  }
  // árvores decorativas e estandartes
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 1; const x = Math.cos(a) * 20.5, z = Math.sin(a) * 20.5;
    const tipo = (C.bioma === 'deserto' || C.bioma === 'litoral') ? 'palmeira' : C.bioma === 'gelo' ? 'pinheiroNeve' : 'arvore';
    D3.colocar(tipo, raiz, x, mundo.h(x, z) - 0.1, z, 1.1, i * 1.3, i);
    // canteiro de pedra em volta
    const ob = Obra(); for (let k = 0; k < 10; k++) { const b = k / 10 * Math.PI * 2; ob.caixa(MC.pedra, 0.6, 0.3, 0.3, x + Math.cos(b) * 1.1, mundo.h(x, z) + 0.05, z + Math.sin(b) * 1.1, 0, -b + Math.PI / 2, 0, 1); } ob.fim(raiz);
    mundo.obst.push({ x, z, r: 0.6 });
  }
  // portão de saída decorativo na muralha
  { const g = new THREE.Group(); g.position.set(R, mundo.h(R, 0), 0); raiz.add(g);
    const ob = Obra();
    for (const sz of [-1, 1]) { ob.add(MC.pedra, G('torreG', () => { const t = new THREE.CylinderGeometry(1.8, 2.0, 7.5, 16, 1); const uv = t.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * 6, uv.getY(j) * 4); return t; }), 0, 3.5, sz * 5.6);
      ob.add(MC.pedra, G('torreA2', () => new THREE.CylinderGeometry(2.2, 2.1, 0.5, 16, 1)), 0, 7.3, sz * 5.6);
      ob.add(MC.telha, G('torreT2', () => { const t = new THREE.ConeGeometry(2.6, 3.4, 16, 1, true); const uv = t.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * 6, uv.getY(j) * 2.5); return t; }), 0, 9.2, sz * 5.6);
      mundo.obst.push({ x: R, z: sz * 5.6, r: 2 }); }
    // arco sobre a passagem
    ob.caixa(MC.pedra, 1.8, 1.4, 9.4, 0, 6.6, 0, 0, 0, 0, 1.6);
    for (let k = -3; k <= 3; k++) ob.caixa(MC.pedra, 1.9, 0.6, 0.8, 0, 7.6, k * 1.3, 0, 0, 0, 1);
    ob.fim(g);
    const est = matE(P.pano, { side: THREE.DoubleSide });
    for (const sz of [-1, 1]) malha(gB(), est, g, -1.2, 4.5, sz * 5.6, 0.05, 3.5, 1.4, false);
  }
  // luzes quentes da praça
  mundo.luzesCidade = [];
  for (const [x, z] of [[0, 0], [-13, 7], [12, -8]]) { const l = new THREE.PointLight(0xffb070, 2.2, 26, 1.6); l.position.set(x, mundo.h(x, z) + 4, z); raiz.add(l); }
  // posições funcionais
  return {
    passagem: { x: 5, z: -5 }, bau: { x: -7, z: -4 }, dispositivo: { x: 11, z: 6 }, chegada: { x: 1, z: 1 }, portal: { x: -2, z: 5 },
    npcs: [{ x: -9, z: 4 }, { x: 5, z: 10 }, { x: -1, z: -10 }],
  };
};
