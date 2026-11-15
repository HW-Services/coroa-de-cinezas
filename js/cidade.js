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
EST.casa = function (pai, x, z, ang, larg, prof, alt, P, rnd) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z) - 0.1, z); g.rotation.y = ang; pai.add(g);
  const parede = matE(P.parede, { normalMap: GFX.tex.picoN, roughness: 0.95 }), madeira = matE(P.madeira, { map: GFX.tex.rochaA, roughness: 0.9 }), telhado = matE(P.telhado, { map: GFX.tex.camA, normalMap: GFX.tex.camN, roughness: 0.85 });
  const pm = pedraMat();
  malha(gB(), pm, g, 0, 0.35, 0, larg + 0.3, 0.7, prof + 0.3);
  malha(gB(), parede, g, 0, 0.7 + alt / 2, 0, larg, alt, prof);
  // vigas
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) malha(gB(), madeira, g, sx * larg / 2, 0.7 + alt / 2, sz * prof / 2, 0.25, alt + 0.1, 0.25);
  malha(gB(), madeira, g, 0, 0.7 + alt, prof / 2, larg + 0.2, 0.22, 0.22); malha(gB(), madeira, g, 0, 0.7 + alt, -prof / 2, larg + 0.2, 0.22, 0.22);
  malha(gB(), madeira, g, 0, 0.7 + alt * 0.5, prof / 2 + 0.02, larg, 0.16, 0.12);
  // telhado em duas águas
  const t = malha(gTelhado(), telhado, g, 0, 0.7 + alt, 0, prof + 0.8, alt * 0.9, larg + 1.0); t.rotation.y = Math.PI / 2;
  // janelas iluminadas e porta
  const luz = matE(0xffb050, { emissive: 0xff9a30, emissiveIntensity: 2.2 });
  for (const sx of [-0.28, 0.28]) malha(gB(), luz, g, sx * larg, 0.7 + alt * 0.62, prof / 2 + 0.04, 0.55, 0.6, 0.06, false);
  malha(gB(), madeira, g, 0, 0.7 + 0.9, prof / 2 + 0.05, 0.9, 1.8, 0.08);
  if (rnd() < 0.6) malha(gB(), pm, g, larg * 0.3, 0.7 + alt + alt * 0.55, -prof * 0.2, 0.5, 1.4, 0.5);
  return g;
};
EST.barraca = function (pai, x, z, ang, P) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z), z); g.rotation.y = ang; pai.add(g);
  const madeira = matE(P.madeira, { map: GFX.tex.rochaA }), pano = matE(P.pano, { side: THREE.DoubleSide, roughness: 0.9 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) malha(gB(), madeira, g, sx * 1.3, 1.1, sz * 0.9, 0.14, 2.2, 0.14);
  malha(gB(), madeira, g, 0, 0.75, 0.3, 2.6, 0.12, 1.2);
  const t = malha(gTelhado(), pano, g, 0, 2.2, 0, 3.2, 0.9, 2.4); t.rotation.y = 0;
  const cores = [0xc04030, 0xd8a040, 0x6a8a30, 0x8a5a2a];
  for (let i = 0; i < 5; i++) malha(gB(), matE(cores[i % 4]), g, -1 + i * 0.5, 0.95, 0.3, 0.3, 0.28, 0.3);
  return g;
};
EST.poste = function (pai, x, z) {
  const g = new THREE.Group(); g.position.set(x, ENG.mundo.h(x, z), z); pai.add(g);
  malha(gC(), matE(0x2a2420, { metalness: 0.6, roughness: 0.5 }), g, 0, 1.4, 0, 0.08, 2.8, 0.08);
  malha(gB(), matE(0xffc070, { emissive: 0xffa040, emissiveIntensity: 3 }), g, 0, 2.9, 0, 0.3, 0.4, 0.3, false);
  return g;
};

EST.construirCidade = function (mundo, C) {
  const P = C.paleta; const rnd = mulberry32(C.ato * 1337);
  const raiz = new THREE.Group(); ENG.scene.add(raiz); mundo.objetos.push(raiz);
  // muralha em anel com abertura a leste (portão)
  const R = 33; const pm = pedraMat();
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.3) continue;
    const x = Math.cos(a) * R, z = Math.sin(a) * R; const y = mundo.h(x, z);
    const s = new THREE.Group(); s.position.set(x, y - 0.3, z); s.rotation.y = -a + Math.PI / 2; raiz.add(s);
    malha(gB(), pm, s, 0, 2.2, 0, 6.9, 4.4, 1.6);
    for (let k = -2; k <= 2; k++) malha(gB(), pm, s, k * 1.4, 4.75, 0, 0.8, 0.7, 1.7);
    if (i % 4 === 0) { malha(gC(), pm, s, 0, 3.0, 0, 1.7, 6.0, 1.7); malha(gPir(), matE(P.telhado, { map: GFX.tex.camA }), s, 0, 6.8, 0, 2.6, 2.2, 2.6).rotation.y = Math.PI / 4; }
  }
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
    const g = new THREE.Group(); g.position.set(x, mundo.h(x, z), z); raiz.add(g);
    if (C.bioma === 'deserto' || C.bioma === 'litoral') {
      malha(gC(), matE(0x8a6a48, { map: GFX.tex.rochaA }), g, 0, 2.5, 0, 0.22, 5, 0.22).rotation.z = 0.12;
      for (let k = 0; k < 7; k++) { const b = k * 0.9; const f = malha(G('folhaPalm', () => new THREE.ConeGeometry(1, 1, 6)), matE(0x4a7a2a, { flatShading: true, side: THREE.DoubleSide }), g, Math.cos(b) * 1.1 + 0.3, 5.0, Math.sin(b) * 1.1, 0.35, 2.6, 0.08); f.rotation.set(Math.sin(b) * 1.2, 0, -Math.cos(b) * 1.2); }
    } else {
      malha(gC(), matE(0x4a3420, { map: GFX.tex.rochaA }), g, 0, 1.6, 0, 0.3, 3.2, 0.3);
      malha(G('copaC', () => new THREE.IcosahedronGeometry(1, 1)), matE(0x2e4a22, { flatShading: true, map: GFX.tex.soloA }), g, 0, 4.0, 0, 2.2, 1.9, 2.2);
    }
    mundo.obst.push({ x, z, r: 0.6 });
  }
  // portão de saída decorativo na muralha
  { const g = new THREE.Group(); g.position.set(R, mundo.h(R, 0), 0); raiz.add(g);
    for (const sz of [-1, 1]) { malha(gC(), pm, g, 0, 3.5, sz * 5.6, 1.8, 7.0, 1.8); malha(gPir(), matE(P.telhado, { map: GFX.tex.camA }), g, 0, 8.0, sz * 5.6, 2.8, 2.5, 2.8).rotation.y = Math.PI / 4; mundo.obst.push({ x: R, z: sz * 5.6, r: 2 }); }
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
