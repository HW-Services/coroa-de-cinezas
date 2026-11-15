// ============================================================
//  VFX: partículas texturizadas, rastros, shaders de energia,
//  projéteis, impactos, explosões, conjuração e auras
// ============================================================
'use strict';

const VFX = { efeitos: [], seguidores: [], tex: {} };
const C3 = (c) => (c && c.isColor) ? c.clone() : new THREE.Color(c);

// ------------------------------------------------------------
// Atlas de sprites (4x4 células de 256px)
// ------------------------------------------------------------
const SPR = { brilho: 0, faisca: 1, fumaca: 2, estrela: 3, anel: 4, chama: 5, brasa: 6, floco: 7, bolha: 8, runa: 9, estilhaco: 10, pedra: 11, gota: 12, raio: 13, nevoa: 14, impacto: 15 };
VFX.gerarAtlas = function () {
  const T = 256, c = document.createElement('canvas'); c.width = c.height = T * 4; const g = c.getContext('2d');
  const rnd = mulberry32(77);
  const cel = (i, fn) => { g.save(); g.translate((i % 4) * T + T / 2, Math.floor(i / 4) * T + T / 2); g.beginPath(); g.rect(-T / 2, -T / 2, T, T); g.clip(); fn(); g.restore(); };
  const rad = (r0, stops) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r0); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
  cel(SPR.brilho, () => { g.fillStyle = rad(124, [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,.85)'], [0.45, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-128, -128, 256, 256); });
  cel(SPR.faisca, () => { g.scale(1, 0.12); g.fillStyle = rad(124, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-128, -128 / 0.12, 256, 256 / 0.12); });
  const nuvem = (escuro) => { for (let k = 0; k < 26; k++) { const a = rnd() * 6.28, d = rnd() * 50, r = 30 + rnd() * 45; g.fillStyle = rad(r, [[0, `rgba(255,255,255,${0.32 + rnd() * 0.2})`], [1, 'rgba(255,255,255,0)']]); g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d); g.fillRect(-r, -r, r * 2, r * 2); g.restore(); } };
  cel(SPR.fumaca, () => nuvem());
  cel(SPR.estrela, () => { g.fillStyle = rad(60, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-128, -128, 256, 256); for (const r of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) { g.save(); g.rotate(r); g.scale(1, r % (Math.PI / 2) ? 0.025 : 0.045); g.fillStyle = rad(r % (Math.PI / 2) ? 80 : 124, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-128, -128 / 0.025, 256, 256 / 0.025); g.restore(); } });
  cel(SPR.anel, () => { g.strokeStyle = 'rgba(255,255,255,1)'; for (let k = 0; k < 6; k++) { g.lineWidth = 14 - k * 2; g.globalAlpha = 0.18 + k * 0.12; g.beginPath(); g.arc(0, 0, 100, 0, 7); g.stroke(); } g.globalAlpha = 1; });
  cel(SPR.chama, () => { for (let k = 0; k < 18; k++) { const y = 70 - k * 9, w = (1 - k / 18) * 70 + rnd() * 10, x = (rnd() - 0.5) * 20 * (k / 18); g.fillStyle = rad(w, [[0, `rgba(255,255,255,${0.3})`], [1, 'rgba(255,255,255,0)']]); g.save(); g.translate(x, y); g.scale(0.75, 1.15); g.fillRect(-w, -w, w * 2, w * 2); g.restore(); } });
  cel(SPR.brasa, () => { g.fillStyle = rad(70, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-128, -128, 256, 256); });
  cel(SPR.floco, () => { g.strokeStyle = 'white'; g.lineCap = 'round'; for (let k = 0; k < 6; k++) { g.save(); g.rotate(k * Math.PI / 3); g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -95); g.stroke(); g.lineWidth = 6; for (const y of [-40, -68]) { g.beginPath(); g.moveTo(0, y); g.lineTo(-20, y - 18); g.moveTo(0, y); g.lineTo(20, y - 18); g.stroke(); } g.restore(); } g.globalCompositeOperation = 'lighter'; g.fillStyle = rad(60, [[0, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-128, -128, 256, 256); });
  cel(SPR.bolha, () => { g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 80, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(-30, -32, 18, 10, -0.6, 0, 7); g.fill(); });
  cel(SPR.runa, () => { g.strokeStyle = 'white'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-30, -80); g.lineTo(-30, 80); g.moveTo(-30, -20); g.lineTo(40, -70); g.moveTo(-30, 10); g.lineTo(45, 70); g.moveTo(-60, 30); g.lineTo(10, 30); g.stroke(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rad(120, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-128, -128, 256, 256); });
  cel(SPR.estilhaco, () => { g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.moveTo(0, -110); g.lineTo(34, 10); g.lineTo(0, 100); g.lineTo(-30, 0); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(0, -110); g.lineTo(34, 10); g.lineTo(0, 0); g.fill(); });
  cel(SPR.pedra, () => { g.fillStyle = 'rgba(255,255,255,1)'; g.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28, r = 60 + rnd() * 40; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(-20, -10); g.lineTo(60, 10); g.lineTo(30, 60); g.lineTo(-40, 50); g.fill(); });
  cel(SPR.gota, () => { g.fillStyle = rad(90, [[0, 'rgba(255,255,255,1)'], [0.6, 'rgba(255,255,255,.8)'], [1, 'rgba(255,255,255,0)']]); g.beginPath(); g.moveTo(0, -100); g.quadraticCurveTo(60, 20, 0, 70); g.quadraticCurveTo(-60, 20, 0, -100); g.fill(); });
  cel(SPR.raio, () => { g.strokeStyle = 'white'; g.lineWidth = 8; g.shadowColor = 'white'; g.shadowBlur = 18; g.beginPath(); let x = 0, y = -110; g.moveTo(x, y); while (y < 110) { x = (rnd() - 0.5) * 70; y += 18 + rnd() * 18; g.lineTo(x, y); } g.stroke(); });
  cel(SPR.nevoa, () => { g.scale(1, 0.55); nuvem(); });
  cel(SPR.impacto, () => { g.fillStyle = rad(110, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']]); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28 + rnd() * 0.2, l = 70 + rnd() * 50; g.save(); g.rotate(a); g.beginPath(); g.moveTo(0, -6); g.lineTo(l, 0); g.lineTo(0, 6); g.fill(); g.restore(); } });
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.premultiplyAlpha = false;
  VFX.tex.atlas = t;
  // círculo rúnico
  const cr = document.createElement('canvas'); cr.width = cr.height = 512; const q = cr.getContext('2d'); q.translate(256, 256); q.strokeStyle = 'white'; q.fillStyle = 'white';
  for (const [r, w] of [[246, 6], [226, 3], [168, 4], [150, 2], [70, 3]]) { q.lineWidth = w; q.beginPath(); q.arc(0, 0, r, 0, 7); q.stroke(); }
  q.lineWidth = 3; q.beginPath(); for (let k = 0; k <= 7; k++) { const a = k * (Math.PI * 2 / 7) * 3 - Math.PI / 2; q.lineTo(Math.cos(a) * 168, Math.sin(a) * 168); } q.stroke();
  q.font = 'bold 30px serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; const glifos = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; q.save(); q.rotate(a); q.fillText(glifos[k % glifos.length], 0, -236 + 0); q.restore(); }
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; q.save(); q.rotate(a); q.fillText(glifos[(k * 5) % glifos.length], 0, -110); q.restore(); }
  const tr = new THREE.CanvasTexture(cr); VFX.tex.runa = tr;
};

// ------------------------------------------------------------
// Partículas instanciadas (quadros com textura, rotação e estiramento)
// ------------------------------------------------------------
class SpritesVFX {
  constructor(cap, aditivo) {
    this.cap = cap; this.n = 0; this.aditivo = aditivo;
    const g = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1);
    g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
    this.iPos = new Float32Array(cap * 3); this.iVel = new Float32Array(cap * 3); this.iCor = new Float32Array(cap * 4); this.iTam = new Float32Array(cap * 3);
    const add = (nome, arr, n) => { const a = new THREE.InstancedBufferAttribute(arr, n); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(nome, a); return a; };
    this.aPos = add('iPos', this.iPos, 3); this.aVel = add('iVel', this.iVel, 3); this.aCor = add('iCor', this.iCor, 4); this.aTam = add('iTam', this.iTam, 3);
    g.instanceCount = 0;
    // dados de simulação
    this.vel = new Float32Array(cap * 3); this.vida = new Float32Array(cap); this.max = new Float32Array(cap);
    this.t0 = new Float32Array(cap); this.t1 = new Float32Array(cap); this.grav = new Float32Array(cap); this.arr = new Float32Array(cap);
    this.c0 = new Float32Array(cap * 3); this.c1 = new Float32Array(cap * 3); this.rot = new Float32Array(cap); this.giro = new Float32Array(cap);
    this.est = new Float32Array(cap); this.fr = new Float32Array(cap); this.brilho = new Float32Array(cap); this.alfa0 = new Float32Array(cap);
    const m = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: VFX.tex.atlas }, escala: { value: 1 } },
      vertexShader: `attribute vec3 iPos; attribute vec3 iVel; attribute vec4 iCor; attribute vec3 iTam; varying vec2 vUv; varying vec4 vCor;
        void main(){
          float tam = iTam.x, est = iTam.y; float rot = iVel.x; float fr = iTam.z;
          vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
          vec2 eixo = vec2(cos(rot), sin(rot));
          float alongar = 1.0;
          if (est > 0.0) { vec3 vv = (viewMatrix * vec4(iVel, 0.0)).xyz; vec2 d = vv.xy; float L = length(d); if (L > 1e-4) { eixo = d / L; alongar = 1.0 + est * L; } }
          vec2 perp = vec2(-eixo.y, eixo.x);
          vec2 c = position.xy;
          mv.xy += eixo * c.x * tam * alongar + perp * c.y * tam;
          gl_Position = projectionMatrix * mv;
          float cx = mod(fr, 4.0), cy = floor(fr / 4.0);
          vUv = (vec2(cx, 3.0 - cy) + uv) / 4.0; vCor = iCor;
        }`,
      fragmentShader: aditivo
        ? `uniform sampler2D atlas; varying vec2 vUv; varying vec4 vCor; void main(){ vec4 t = texture2D(atlas, vUv); float a = t.a * vCor.a; gl_FragColor = vec4(vCor.rgb * t.rgb * a, a); }`
        : `uniform sampler2D atlas; varying vec2 vUv; varying vec4 vCor; void main(){ vec4 t = texture2D(atlas, vUv); gl_FragColor = vec4(vCor.rgb * t.rgb, t.a * vCor.a); }`,
      transparent: true, depthWrite: false, blending: aditivo ? THREE.CustomBlending : THREE.NormalBlending,
    });
    if (aditivo) { m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneFactor; m.blendEquation = THREE.AddEquation; }
    this.mat = m; this.geo = g;
    this.pontos = new THREE.Mesh(g, m); this.pontos.frustumCulled = false; this.pontos.renderOrder = aditivo ? 5 : 4;
    // os campos usados pelo código vindo do sistema antigo
    this.mat.uniforms.escala = { value: 1 };
  }
  emitir(o) {
    const n = o.n || 10; const c = C3(o.cor || '#ffffff'); const c2 = o.cor2 ? C3(o.cor2) : null; const cf = o.corFim ? C3(o.corFim) : null;
    const tipo = o.tipo != null ? (typeof o.tipo === 'string' ? SPR[o.tipo] : o.tipo) : (this.aditivo ? SPR.brilho : SPR.fumaca);
    const brilho = o.brilho ?? (this.aditivo ? 1.6 : 1);
    for (let k = 0; k < n; k++) {
      if (this.n >= this.cap) return;
      const i = this.n++;
      const ang = Math.random() * Math.PI * 2, el = (Math.random() - 0.3) * Math.PI;
      const sp = (o.vel ?? 3) * (0.4 + Math.random() * 0.8);
      const esp = o.espalhar ?? 0.2;
      this.iPos[i * 3] = o.x + (Math.random() - 0.5) * esp; this.iPos[i * 3 + 1] = o.y + (Math.random() - 0.5) * esp * (o.espY ?? 1); this.iPos[i * 3 + 2] = o.z + (Math.random() - 0.5) * esp;
      let vx = Math.cos(ang) * Math.cos(el) * sp, vy = Math.abs(Math.sin(el)) * sp * (o.sobe ?? 1), vz = Math.sin(ang) * Math.cos(el) * sp;
      if (o.anelPlano) { vy = Math.abs(vy) * 0.15; }
      if (o.dir) { vx = o.dir.x * sp + vx * (o.disp ?? 0.3); vy = o.dir.y * sp + vy * (o.disp ?? 0.3); vz = o.dir.z * sp + vz * (o.disp ?? 0.3); }
      if (o.vy !== undefined) vy += o.vy;
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      const cc = c2 && Math.random() < 0.5 ? c2 : c;
      this.c0[i * 3] = cc.r * brilho; this.c0[i * 3 + 1] = cc.g * brilho; this.c0[i * 3 + 2] = cc.b * brilho;
      const ce = cf || cc; const bf = cf ? (o.brilhoFim ?? brilho) : brilho;
      this.c1[i * 3] = ce.r * bf; this.c1[i * 3 + 1] = ce.g * bf; this.c1[i * 3 + 2] = ce.b * bf;
      const vida = (o.vida || 0.6) * (0.6 + Math.random() * 0.7);
      this.vida[i] = vida; this.max[i] = vida;
      this.t0[i] = (o.tam || 0.5) * 0.75 * (0.7 + Math.random() * 0.6); this.t1[i] = o.tamFim != null ? o.tamFim * 0.75 : this.t0[i] * (this.aditivo ? 0.2 : 1.6);
      this.grav[i] = o.grav ?? 0; this.arr[i] = o.arrasto ?? 1.5;
      this.rot[i] = o.rot ?? Math.random() * 6.28; this.giro[i] = o.girar != null ? o.girar * (Math.random() - 0.5) * 2 : (this.aditivo ? 0 : (Math.random() - 0.5) * 1.5);
      this.est[i] = o.estica || 0; this.fr[i] = Array.isArray(tipo) ? tipo[Math.floor(Math.random() * tipo.length)] : tipo;
      this.alfa0[i] = o.alfa ?? 1;
    }
  }
  atualizar(dt) {
    let i = 0;
    while (i < this.n) {
      this.vida[i] -= dt;
      if (this.vida[i] <= 0) { this.trocar(i, --this.n); continue; }
      const k = Math.exp(-this.arr[i] * dt);
      const i3 = i * 3;
      this.vel[i3] *= k; this.vel[i3 + 1] = this.vel[i3 + 1] * k - this.grav[i] * dt; this.vel[i3 + 2] *= k;
      this.iPos[i3] += this.vel[i3] * dt; this.iPos[i3 + 1] += this.vel[i3 + 1] * dt; this.iPos[i3 + 2] += this.vel[i3 + 2] * dt;
      const t = 1 - this.vida[i] / this.max[i];
      this.rot[i] += this.giro[i] * dt;
      const est = this.est[i];
      this.iVel[i3] = est > 0 ? this.vel[i3] * 0.06 : this.rot[i]; this.iVel[i3 + 1] = this.vel[i3 + 1] * 0.06; this.iVel[i3 + 2] = this.vel[i3 + 2] * 0.06;
      if (est > 0) { this.iVel[i3] = this.vel[i3] * 0.06; }
      this.iTam[i3] = this.t0[i] + (this.t1[i] - this.t0[i]) * t; this.iTam[i3 + 1] = est; this.iTam[i3 + 2] = this.fr[i];
      const a = (t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88) * this.alfa0[i];
      const i4 = i * 4;
      this.iCor[i4] = this.c0[i3] + (this.c1[i3] - this.c0[i3]) * t; this.iCor[i4 + 1] = this.c0[i3 + 1] + (this.c1[i3 + 1] - this.c0[i3 + 1]) * t; this.iCor[i4 + 2] = this.c0[i3 + 2] + (this.c1[i3 + 2] - this.c0[i3 + 2]) * t; this.iCor[i4 + 3] = a;
      i++;
    }
    this.geo.instanceCount = this.n;
    this.aPos.needsUpdate = true; this.aVel.needsUpdate = true; this.aCor.needsUpdate = true; this.aTam.needsUpdate = true;
  }
  trocar(a, b) {
    if (a === b) return;
    for (const [arr, s] of [[this.iPos, 3], [this.vel, 3], [this.c0, 3], [this.c1, 3], [this.iVel, 3], [this.iTam, 3], [this.iCor, 4]]) for (let j = 0; j < s; j++) arr[a * s + j] = arr[b * s + j];
    for (const arr of [this.vida, this.max, this.t0, this.t1, this.grav, this.arr, this.rot, this.giro, this.est, this.fr, this.alfa0]) arr[a] = arr[b];
  }
  limpar() { this.n = 0; this.geo.instanceCount = 0; }
}

// substitui os sistemas antigos depois da inicialização do motor
{
  const init0 = ENG.init;
  ENG.init = function (canvas) {
    init0(canvas);
    VFX.gerarAtlas();
    ENG.scene.remove(ENG.particulas.pontos); ENG.scene.remove(ENG.fumaca.pontos);
    ENG.particulas = new SpritesVFX(9000, true);
    ENG.fumaca = new SpritesVFX(3000, false);
    ENG.scene.add(ENG.particulas.pontos); ENG.scene.add(ENG.fumaca.pontos);
  };
}
const FX = (o) => ENG.particulas.emitir(o);
const FM = (o) => ENG.fumaca.emitir(o);

// ------------------------------------------------------------
// Shader de energia (fogo, arcano, raio, veneno, gelo)
// ------------------------------------------------------------
const GLSL_RUIDO = `
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += n3(p) * a; p *= 2.07; a *= 0.5; } return s; }`;
VFX.matEnergia = function (o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { t: { value: Math.random() * 10 }, c1: { value: C3(o.c1 || '#ffffff') }, c2: { value: C3(o.c2 || '#ffa040') }, c3: { value: C3(o.c3 || '#a01000') },
      escala: { value: o.escala || 2.5 }, vel: { value: new THREE.Vector3(...(o.vel || [0, -1.6, 0])) }, dissolver: { value: o.dissolver || 0 }, intens: { value: o.intens || 2.2 }, fres: { value: o.fres ?? 1.0 } },
    vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: GLSL_RUIDO + `uniform float t, escala, dissolver, intens, fres; uniform vec3 c1, c2, c3, vel; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){ float f = fbm3(vP * escala + vel * t); float fr = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 1.5);
        float k = clamp(f * 1.3 - fr * 0.35 * fres, 0.0, 1.0);
        vec3 c = k > 0.55 ? mix(c2, c1, (k - 0.55) / 0.45) : mix(c3, c2, k / 0.55);
        float a = smoothstep(dissolver, dissolver + 0.18, f + (1.0 - fr) * 0.25) * (1.0 - fr * 0.55 * fres);
        gl_FragColor = vec4(c * intens * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: o.dupla ? THREE.DoubleSide : THREE.FrontSide,
  });
};
const PALETA = {
  fogo: { c1: '#fff4c0', c2: '#ff8a20', c3: '#a01800', luz: '#ff7a20', part: '#ff8030', part2: '#ffd060' },
  frio: { c1: '#ffffff', c2: '#9ad8ff', c3: '#2050a0', luz: '#80c8ff', part: '#bfeaff', part2: '#ffffff' },
  raio: { c1: '#ffffff', c2: '#b0d8ff', c3: '#3050ff', luz: '#a0c8ff', part: '#c8e8ff', part2: '#ffffff' },
  veneno: { c1: '#eaffb0', c2: '#80e030', c3: '#205010', luz: '#90ff40', part: '#90ff40', part2: '#d0ff80' },
  arcano: { c1: '#ffffff', c2: '#c080ff', c3: '#4010a0', luz: '#b080ff', part: '#c890ff', part2: '#ffffff' },
  fisico: { c1: '#ffffff', c2: '#ffe0b0', c3: '#806040', luz: '#ffe0b0', part: '#fff0d0', part2: '#ffd090' },
};
VFX.pal = (elem, cor) => PALETA[elem] || (cor ? { c1: '#ffffff', c2: cor, c3: '#202020', luz: cor, part: cor, part2: '#ffffff' } : PALETA.fisico);

// ------------------------------------------------------------
// Rastros (fita voltada para a câmera) e rastro de lâmina
// ------------------------------------------------------------
class Rastro {
  constructor(n, larg, cor, o = {}) {
    this.n = n; this.larg = larg; this.pts = []; this.vida = o.vida || 0.35; this.ativo = true;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3); this.uv = new Float32Array(n * 2 * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { cor: { value: C3(cor) }, cor2: { value: C3(o.cor2 || '#ffffff') }, t: { value: 0 }, intens: { value: o.intens || 2.0 }, ruido: { value: o.ruido || 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: GLSL_RUIDO + `uniform vec3 cor, cor2; uniform float t, intens, ruido; varying vec2 vUv;
        void main(){ float idade = vUv.x; float borda = 1.0 - abs(vUv.y * 2.0 - 1.0); borda = smoothstep(0.0, 0.8, borda);
          float n = ruido > 0.0 ? mix(1.0, n3(vec3(vUv.x * 12.0 - t * 6.0, vUv.y * 3.0, t)) * 1.6, ruido) : 1.0;
          float a = pow(1.0 - idade, 1.6) * borda * n; vec3 c = mix(cor2, cor, smoothstep(0.0, 0.5, idade + (1.0 - borda) * 0.5));
          gl_FragColor = vec4(c * a * intens, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
    ENG.scene.add(this.mesh);
  }
  adicionar(p, tempo) { this.pts.unshift({ p: p.clone(), t: tempo }); if (this.pts.length > this.n) this.pts.pop(); }
  atualizar(tempo, dt) {
    this.mat.uniforms.t.value = tempo;
    while (this.pts.length && tempo - this.pts[this.pts.length - 1].t > this.vida) this.pts.pop();
    const cam = ENG.camera.position; const m = this.pts.length;
    const d = new THREE.Vector3(), v = new THREE.Vector3(), lado = new THREE.Vector3();
    for (let i = 0; i < this.n; i++) {
      const j = Math.min(i, m - 1);
      if (m < 2) { this.pos.fill(0); break; }
      const a = this.pts[Math.max(0, j - 1)].p, b = this.pts[Math.min(m - 1, j + 1)].p, p = this.pts[j].p;
      d.subVectors(a, b).normalize(); v.subVectors(cam, p).normalize(); lado.crossVectors(d, v).normalize();
      const idade = Math.min(1, (tempo - this.pts[j].t) / this.vida); const w = this.larg * (1 - idade * 0.7) * (i < m ? 1 : 0);
      this.pos[i * 6] = p.x + lado.x * w; this.pos[i * 6 + 1] = p.y + lado.y * w; this.pos[i * 6 + 2] = p.z + lado.z * w;
      this.pos[i * 6 + 3] = p.x - lado.x * w; this.pos[i * 6 + 4] = p.y - lado.y * w; this.pos[i * 6 + 5] = p.z - lado.z * w;
      this.uv[i * 4] = idade; this.uv[i * 4 + 1] = 0; this.uv[i * 4 + 2] = idade; this.uv[i * 4 + 3] = 1;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
    return this.pts.length > 0;
  }
  remover() { ENG.scene.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
}
VFX.Rastro = Rastro;

class RastroLamina {
  constructor(n, cor, o = {}) {
    this.n = n; this.amostras = []; this.vida = o.vida || 0.22;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3); this.uv = new Float32Array(n * 2 * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { cor: { value: C3(cor) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 cor; varying vec2 vUv; void main(){ float idade = vUv.x; float pt = vUv.y; float a = pow(1.0 - idade, 2.2) * smoothstep(0.0, 0.9, pt);
        vec3 c = mix(cor, vec3(1.0), pow(pt, 6.0) * (1.0 - idade)); gl_FragColor = vec4(c * a * 2.4, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
    ENG.scene.add(this.mesh);
  }
  adicionar(base, ponta, tempo) { this.amostras.unshift({ b: base.clone(), p: ponta.clone(), t: tempo }); if (this.amostras.length > this.n) this.amostras.pop(); }
  atualizar(tempo) {
    while (this.amostras.length && tempo - this.amostras[this.amostras.length - 1].t > this.vida) this.amostras.pop();
    const m = this.amostras.length;
    for (let i = 0; i < this.n; i++) {
      const s = this.amostras[Math.min(i, m - 1)];
      if (!s) { this.pos.fill(0); break; }
      const idade = i < m ? Math.min(1, (tempo - s.t) / this.vida) : 1;
      this.pos.set([s.b.x, s.b.y, s.b.z, s.p.x, s.p.y, s.p.z], i * 6);
      this.uv.set([idade, 0, idade, 1], i * 4);
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
    return m > 0;
  }
  remover() { ENG.scene.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
}
VFX.RastroLamina = RastroLamina;

// ------------------------------------------------------------
// Efeitos temporários genéricos
// ------------------------------------------------------------
VFX.efeito = function (obj, dur, upd, fim) { const e = { obj, t: 0, dur, upd, fim }; VFX.efeitos.push(e); if (obj && !obj.parent) ENG.scene.add(obj); return e; };
VFX.atualizar = function (dt) {
  const T = J.tempo || 0;
  for (let i = VFX.efeitos.length - 1; i >= 0; i--) {
    const e = VFX.efeitos[i]; e.t += dt; const k = Math.min(1, e.t / e.dur);
    if (e.upd) e.upd(k, dt, e);
    if (k >= 1) {
      if (e.fim) e.fim(e);
      if (e.obj) { ENG.scene.remove(e.obj); e.obj.traverse(c => { if (c.geometry && !c.geometry.userData.cache) c.geometry.dispose(); if (c.material && !c.material.userData.cache) c.material.dispose(); }); }
      VFX.efeitos.splice(i, 1);
    }
  }
  for (let i = VFX.seguidores.length - 1; i >= 0; i--) {
    const s = VFX.seguidores[i];
    if (s.alvo && s.ativo !== false) s.rastro.adicionar(s.alvo(), T);
    const vivo = s.rastro.atualizar(T, dt);
    if (s.ativo === false && !vivo) { s.rastro.remover(); VFX.seguidores.splice(i, 1); }
  }
};
VFX.limpar = function () {
  for (const e of VFX.efeitos) if (e.obj) ENG.scene.remove(e.obj);
  VFX.efeitos = [];
  for (const s of VFX.seguidores) s.rastro.remover();
  VFX.seguidores = [];
};
VFX.seguir = function (rastro, alvoFn) { const s = { rastro, alvo: alvoFn, ativo: true }; VFX.seguidores.push(s); return s; };

// geometrias compartilhadas
const gV = {};
const GV = (k, fn) => gV[k] || (gV[k] = (() => { const g = fn(); g.userData.cache = true; return g; })());

// ------------------------------------------------------------
// Círculo rúnico no chão
// ------------------------------------------------------------
VFX.circulo = function (x, z, raio, cor, dur = 1.2, o = {}) {
  if (!ENG.mundo) return null;
  const seg = 28, aneis = 4; const pos = [], uv = [], idx = [];
  pos.push(x, ENG.mundo.h(x, z) + 0.12, z); uv.push(0.5, 0.5);
  for (let a = 1; a <= aneis; a++) for (let s = 0; s < seg; s++) {
    const r = a / aneis, an = s / seg * Math.PI * 2; const wx = x + Math.cos(an) * r * raio, wz = z + Math.sin(an) * r * raio;
    pos.push(wx, ENG.mundo.h(wx, wz) + 0.12, wz); uv.push(0.5 + Math.cos(an) * r * 0.5, 0.5 + Math.sin(an) * r * 0.5);
  }
  for (let s = 0; s < seg; s++) idx.push(0, 1 + (s + 1) % seg, 1 + s);
  for (let a = 1; a < aneis; a++) for (let s = 0; s < seg; s++) { const i0 = 1 + (a - 1) * seg + s, i1 = 1 + (a - 1) * seg + (s + 1) % seg, j0 = 1 + a * seg + s, j1 = 1 + a * seg + (s + 1) % seg; idx.push(i0, i1, j1, i0, j1, j0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: VFX.tex.runa }, cor: { value: C3(cor) }, ang: { value: 0 }, alfa: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D mapa; uniform vec3 cor; uniform float ang, alfa; varying vec2 vUv;
      void main(){ vec2 p = vUv - 0.5; float c = cos(ang), s = sin(ang); vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
        float t = texture2D(mapa, q).r; float r = length(p) * 2.0; float glow = smoothstep(1.0, 0.0, r) * 0.15;
        float a = (t + glow) * alfa; gl_FragColor = vec4(cor * a * 2.2, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4,
  });
  const me = new THREE.Mesh(g, mat); me.renderOrder = 3;
  const giro = o.giro ?? 1.2;
  return VFX.efeito(me, dur, (k, dt) => { mat.uniforms.ang.value += dt * giro; mat.uniforms.alfa.value = (k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1) * (o.alfa || 1); });
};

// ------------------------------------------------------------
// Impactos
// ------------------------------------------------------------
VFX.impacto = function (x, y, z, elem = 'fisico', escala = 1, dir = null) {
  const P = VFX.pal(elem);
  FX({ x, y, z, n: 1, tipo: 'impacto', cor: P.part, vel: 0, vida: 0.14, tam: 0.9 * escala, tamFim: 1.4 * escala, brilho: 1.1, alfa: 0.8 });
  FX({ x, y, z, n: 1, tipo: 'estrela', cor: P.part2, vel: 0, vida: 0.1, tam: 0.8 * escala, tamFim: 0.3, brilho: 1.2, alfa: 0.8 });
  const d = dir ? { x: dir.x, y: 0.35, z: dir.z } : null;
  FX({ x, y, z, n: Math.round(10 * escala), tipo: 'faisca', estica: 2.2, cor: P.part2, corFim: P.part, vel: 9 * escala, vida: 0.28, tam: 0.28, tamFim: 0.05, grav: 10, arrasto: 2.5, dir: d, disp: 0.9 });
  if (elem === 'fogo') { FX({ x, y, z, n: 6, tipo: 'chama', cor: '#ffc060', corFim: '#ff3000', vel: 2.5, vida: 0.45, tam: 0.8, tamFim: 0.2, sobe: 2, grav: -3, rot: 0 }); FM({ x, y, z, n: 3, cor: '#3a2a22', vel: 1.5, vida: 0.8, tam: 0.7, tamFim: 1.6, sobe: 1.5, grav: -1 }); }
  else if (elem === 'frio') FX({ x, y, z, n: 8, tipo: ['floco', 'estilhaco'], cor: '#e0f6ff', corFim: '#60a0ff', vel: 5, vida: 0.6, tam: 0.45, tamFim: 0.1, grav: 8, girar: 6, brilho: 1.4 });
  else if (elem === 'raio') { FX({ x, y, z, n: 4, tipo: 'raio', cor: '#e0f0ff', vel: 0.5, vida: 0.15, tam: 1.2, tamFim: 0.9, brilho: 2.5 }); }
  else if (elem === 'veneno') FX({ x, y, z, n: 7, tipo: 'bolha', cor: '#b0ff60', corFim: '#307010', vel: 2.5, vida: 0.7, tam: 0.35, tamFim: 0.15, sobe: 1.5, grav: -2, brilho: 1.3 });
  else { FM({ x, y, z, n: 4, cor: '#5a0a0a', vel: 3.5, vida: 0.5, tam: 0.22, tamFim: 0.1, grav: 12, tipo: 'gota', estica: 1.2 }); }
};

// explosão volumétrica
VFX.explosao = function (x, y, z, raio, elem = 'fogo', cor = null) {
  const P = VFX.pal(elem, cor);
  const bola = new THREE.Mesh(GV('esfExp', () => new THREE.IcosahedronGeometry(1, 3)), VFX.matEnergia({ c1: P.c1, c2: P.c2, c3: P.c3, escala: 1.8, vel: [0, -2.5, 0], intens: 3 }));
  bola.position.set(x, y, z); const mat = bola.material;
  VFX.efeito(bola, 0.55, (k, dt) => { const s = raio * (0.25 + 0.85 * Math.pow(k, 0.45)); bola.scale.setScalar(s); mat.uniforms.t.value += dt * 1.5; mat.uniforms.dissolver.value = k * 1.1; bola.position.y = y + k * raio * 0.25; });
  FX({ x, y, z, n: 1, tipo: 'brilho', cor: P.c1, vel: 0, vida: 0.2, tam: raio * 3.2, tamFim: raio * 1.5, brilho: 2.4 });
  VFX.choque(x, y, z, raio * 1.25, P.c2);
  FX({ x, y, z, n: Math.round(18 + raio * 6), tipo: 'faisca', estica: 2.5, cor: P.part2, corFim: P.part, vel: raio * 4.5, vida: 0.55, tam: 0.35, tamFim: 0.05, grav: 9, arrasto: 1.8, sobe: 1.4 });
  FX({ x, y, z, n: Math.round(10 + raio * 3), tipo: elem === 'frio' ? ['floco', 'estilhaco'] : elem === 'veneno' ? 'bolha' : 'brasa', cor: P.part2, corFim: P.part, vel: raio * 2.5, vida: 1.2, tam: 0.2, tamFim: 0.05, grav: 4, sobe: 2.2, arrasto: 0.8, girar: 4 });
  FM({ x, y: y + 0.3, z, n: Math.round(8 + raio * 2), cor: elem === 'veneno' ? '#3a5a1a' : elem === 'frio' ? '#a0b8d0' : '#2e2622', vel: raio * 1.2, vida: 1.6, tam: raio * 0.6, tamFim: raio * 1.4, sobe: 1.2, grav: -0.6, espalhar: raio * 0.5, alfa: 0.75 });
  FM({ x, y: y - 0.5, z, n: 10, tipo: 'pedra', cor: '#4a3e34', vel: raio * 2.2, vida: 0.9, tam: 0.25, tamFim: 0.18, sobe: 2.5, grav: 14, arrasto: 0.4, girar: 9 });
  ENG.luz(new THREE.Vector3(x, y + 1, z), P.luz, 7, 0.45, raio * 4);
};

// onda de choque no chão
VFX.choque = function (x, y, z, raio, cor, dur = 0.45) {
  const g = GV('choque', () => { const r = new THREE.RingGeometry(0.0, 1, 64, 1); r.rotateX(-Math.PI / 2); return r; });
  const mat = new THREE.ShaderMaterial({
    uniforms: { cor: { value: C3(cor) }, k: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: GLSL_RUIDO + `uniform vec3 cor; uniform float k; varying vec2 vP;
      void main(){ float r = length(vP); float frente = k; float w = 0.08 + 0.12 * (1.0 - k);
        float aro = exp(-pow((r - frente) / w, 2.0)); float dentro = smoothstep(frente, 0.0, r) * 0.18 * (1.0 - k);
        float n = 0.7 + 0.6 * n3(vec3(vP * 6.0, k * 4.0));
        float a = (aro * n + dentro) * (1.0 - k); gl_FragColor = vec4(cor * a * 2.6, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const me = new THREE.Mesh(g, mat); me.position.set(x, y + 0.25, z); me.scale.setScalar(raio); me.renderOrder = 4;
  VFX.efeito(me, dur, (k) => { mat.uniforms.k.value = Math.pow(k, 0.6); });
  FM({ x, y: y + 0.3, z, n: Math.round(raio * 4), tipo: 'nevoa', cor: '#8a7a68', vel: raio * 2.2, vida: 0.7, tam: 0.8, tamFim: 1.8, anelPlano: true, arrasto: 2.5, alfa: 0.5 });
};

// corte em crescente com varredura de luz
VFX.corte = function (x, y, z, ang, raio, arco, cor, o = {}) {
  const ar = arco * Math.PI / 180;
  const g = new THREE.RingGeometry(raio * 0.35, raio, 40, 4, -ar / 2, ar); g.rotateX(-Math.PI / 2);
  // uv.x = posição angular, uv.y = raio
  const pos = g.attributes.position; const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) { const px = pos.getX(i), pz = pos.getZ(i); const a = Math.atan2(-pz, px); const r = Math.hypot(px, pz); uv.setXY(i, (a + ar / 2) / ar, (r - raio * 0.35) / (raio * 0.65)); }
  const mat = new THREE.ShaderMaterial({
    uniforms: { cor: { value: C3(cor) }, k: { value: 0 }, dirS: { value: o.inverso ? -1 : 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: GLSL_RUIDO + `uniform vec3 cor; uniform float k, dirS; varying vec2 vUv;
      void main(){ float u = dirS > 0.0 ? vUv.x : 1.0 - vUv.x; float cabeca = k * 1.35;
        float rastro = smoothstep(cabeca - 0.75, cabeca, u) * step(u, cabeca);
        float radial = pow(vUv.y, 2.2); float fio = smoothstep(0.85, 1.0, vUv.y);
        float estrias = 0.65 + 0.5 * n3(vec3(u * 18.0, vUv.y * 4.0, k * 3.0));
        float a = rastro * (radial * estrias + fio * 1.4) * (1.0 - smoothstep(0.75, 1.0, k));
        vec3 c = mix(cor, vec3(1.0), fio * 0.8 + smoothstep(cabeca - 0.1, cabeca, u) * 0.6);
        gl_FragColor = vec4(c * a * 2.0, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const me = new THREE.Mesh(g, mat); me.position.set(x, y + (o.altura ?? 1.0), z); me.rotation.y = -ang; me.renderOrder = 6;
  if (o.inclina) me.rotation.z = o.inclina;
  VFX.efeito(me, o.dur || 0.28, (k) => { mat.uniforms.k.value = k; });
  // faíscas ao longo do fio
  for (let i = 0; i < 6; i++) { const a = -ang + (Math.random() - 0.5) * ar; const px = x + Math.cos(-a) * raio * 0.9, pz = z - Math.sin(-a) * raio * 0.9; FX({ x: px, y: y + 1, z: pz, n: 1, tipo: 'faisca', estica: 2, cor: '#ffffff', corFim: cor, vel: 5, vida: 0.22, tam: 0.22, tamFim: 0.05, grav: 6 }); }
};

// relâmpago com ramificações
VFX.relampago = function (a, b, cor, larg = 0.12) {
  const pts = [a.clone()]; const n = Math.max(4, Math.floor(a.distanceTo(b) / 1.1));
  for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); const amp = Math.sin(i / n * Math.PI) * 1.1; p.x += (Math.random() - 0.5) * amp; p.y += (Math.random() - 0.5) * amp * 0.6; p.z += (Math.random() - 0.5) * amp; pts.push(p); }
  pts.push(b.clone());
  const fita = (lista, w, c, dur) => {
    const r = new Rastro(lista.length, w, c, { cor2: '#ffffff', vida: 10, intens: 3, ruido: 0.6 });
    lista.slice().reverse().forEach(p => r.adicionar(p, 0));
    r.vida = 1e9; r.atualizar(0, 0); r.vida = 10;
    // fixa as idades em 0 para não desvanecer pelo comprimento
    for (let i = 0; i < r.n; i++) { r.uv[i * 4] = 0.15; r.uv[i * 4 + 2] = 0.15; } r.geo.attributes.uv.needsUpdate = true;
    VFX.efeito(null, dur, (k) => { r.mat.uniforms.intens.value = 3.2 * (1 - k) * (0.7 + Math.random() * 0.6); }, () => r.remover());
  };
  fita(pts, larg * 2.2, cor, 0.22);
  // ramos
  for (let k = 0; k < 2; k++) {
    const i0 = 1 + Math.floor(Math.random() * (pts.length - 2)); const ramo = [pts[i0].clone()]; let p = pts[i0].clone();
    for (let j = 0; j < 3; j++) { p = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.3) * 0.8, (Math.random() - 0.5) * 1.6)); ramo.push(p); }
    fita(ramo, larg * 1.1, cor, 0.16);
  }
  FX({ x: b.x, y: b.y, z: b.z, n: 1, tipo: 'estrela', cor: '#ffffff', vel: 0, vida: 0.15, tam: 1.6, tamFim: 0.5, brilho: 2.4 });
  FX({ x: b.x, y: b.y, z: b.z, n: 6, tipo: 'faisca', estica: 2, cor: '#ffffff', corFim: cor, vel: 7, vida: 0.2, tam: 0.2, tamFim: 0.05 });
};

// pilar de luz com ruído
VFX.coluna = function (x, y, z, cor, alt = 8, larg = 1, dur = 0.5) {
  const g = GV('colunaV', () => new THREE.CylinderGeometry(1, 0.7, 1, 24, 6, true));
  const mat = new THREE.ShaderMaterial({
    uniforms: { cor: { value: C3(cor) }, t: { value: 0 }, k: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: GLSL_RUIDO + `uniform vec3 cor; uniform float t, k; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float n = fbm3(vec3(vUv.x * 8.0, vUv.y * 3.0 - t * 3.0, t)); float lados = pow(abs(dot(normalize(vN), normalize(vV))), 1.5);
        float a = lados * (0.5 + n) * smoothstep(1.0, 0.6, vUv.y) * smoothstep(0.0, 0.1, vUv.y) * (1.0 - k); gl_FragColor = vec4(mix(cor, vec3(1.0), n * 0.5) * a * 2.4, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const me = new THREE.Mesh(g, mat); me.position.set(x, y + alt / 2, z); me.scale.set(larg, alt, larg);
  VFX.efeito(me, dur, (k, dt) => { mat.uniforms.t.value += dt; mat.uniforms.k.value = k; me.scale.x = me.scale.z = larg * (1 - k * 0.5); });
  FX({ x, y: y + 0.3, z, n: 14, tipo: 'faisca', estica: 2.5, cor: '#ffffff', corFim: cor, vel: 3, dir: { x: 0, y: 1, z: 0 }, disp: 0.6, vida: 0.7, tam: 0.25, espalhar: larg * 1.5, grav: -2 });
};

// ------------------------------------------------------------
// Projéteis
// ------------------------------------------------------------
VFX.projetil = function (modelo, cor, o = {}) {
  const g = new THREE.Group();
  const elem = o.elem || (o.sk && o.sk.elem) || 'fisico';
  const P = VFX.pal(elem === 'fisico' && modelo === 'orbeGrande' ? 'arcano' : elem, cor);
  const dono = o.dono;
  const metal = (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.85, roughness: 0.3 });
  const madeira = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 });
  let rastro = null, upd = null, raioV = 0.3;
  const corP = C3(cor);
  switch (modelo) {
    case 'flecha': case 'dardo': {
      const L = modelo === 'dardo' ? 0.5 : 1.0;
      const haste = new THREE.Mesh(GV('hasteF', () => new THREE.CylinderGeometry(0.022, 0.022, 1, 6)), madeira); haste.rotation.x = Math.PI / 2; haste.scale.y = L; g.add(haste);
      const ponta = new THREE.Mesh(GV('pontaF', () => new THREE.ConeGeometry(0.055, 0.2, 6)), modelo === 'dardo' ? new THREE.MeshStandardMaterial({ color: 0x60c030, emissive: 0x40a020, emissiveIntensity: 1.5 }) : metal(0xc8ccd4)); ponta.rotation.x = Math.PI / 2; ponta.position.z = L / 2 + 0.08; g.add(ponta);
      const pena = new THREE.MeshStandardMaterial({ color: modelo === 'dardo' ? 0x3a6020 : 0xe8e0d0, side: THREE.DoubleSide, roughness: 0.9 });
      for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(GV('penaF', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.09, -0.04); s.lineTo(0.08, -0.22); s.lineTo(0, -0.18); return new THREE.ShapeGeometry(s); }), pena); f.rotation.z = k * 2.094; f.rotation.y = Math.PI / 2; f.position.z = -L / 2 + 0.1; const pv = new THREE.Group(); pv.rotation.z = k * 2.094; pv.add(f); f.rotation.set(0, Math.PI / 2, 0); f.position.set(0, 0, -L / 2 + 0.2); g.add(pv); }
      const brilho = new THREE.Mesh(GV('plano', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: null, color: corP, transparent: true, opacity: 0.0 })); g.add(brilho);
      rastro = new Rastro(14, modelo === 'dardo' ? 0.07 : 0.09, modelo === 'dardo' ? '#80ff40' : cor, { cor2: '#ffffff', vida: 0.18, intens: 1.6 });
      upd = (p) => { if (modelo === 'dardo' && Math.random() < 0.4) FX({ x: p.x, y: p.y, z: p.z, n: 1, tipo: 'gota', cor: '#90ff40', vel: 0.3, vida: 0.5, tam: 0.12, grav: 5 }); };
      break;
    }
    case 'lanca': {
      const haste = new THREE.Mesh(GV('hasteL', () => new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8)), elem === 'fisico' && cor === '#efe6cc' ? new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 }) : madeira); haste.rotation.x = Math.PI / 2; g.add(haste);
      const ponta = new THREE.Mesh(GV('pontaL', () => new THREE.OctahedronGeometry(0.13, 0)), metal(0xd0d4dc)); ponta.scale.set(0.7, 0.7, 2.4); ponta.position.z = 0.95; g.add(ponta);
      rastro = new Rastro(16, 0.14, cor, { cor2: '#ffffff', vida: 0.22, intens: 1.8 });
      break;
    }
    case 'lamina': {
      const mat = metal(0xd8e8f0); mat.emissive = corP.clone(); mat.emissiveIntensity = 0.4;
      for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(GV('lamProj', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.25, 0.08, 0.38, 0.0); s.quadraticCurveTo(0.22, -0.04, 0, 0); return new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: false }); }), mat); l.rotation.x = -Math.PI / 2; l.rotation.z = k * 2.094; g.add(l); }
      rastro = new Rastro(18, 0.22, cor, { cor2: '#ffffff', vida: 0.2, intens: 1.6 });
      upd = (p, dt) => { g.rotation.y += dt * 22; };
      break;
    }
    case 'onda': {
      raioV = 0;
      upd = (p, dt, hy) => {
        if (Math.random() < 0.9) FM({ x: p.x, y: hy + 0.2, z: p.z, n: 2, tipo: 'pedra', cor: '#5a4a3a', vel: 3.5, vida: 0.7, tam: 0.3, tamFim: 0.2, sobe: 3, grav: 14, girar: 8, espalhar: 1 });
        FM({ x: p.x, y: hy + 0.3, z: p.z, n: 1, tipo: 'nevoa', cor: '#7a6a54', vel: 1.5, vida: 0.9, tam: 1.0, tamFim: 2.0, alfa: 0.6, espalhar: 1.2 });
        if (Math.random() < 0.15) GFX.decal(p.x, p.z, 1.1, 'queimado', 5);
      };
      break;
    }
    case 'cristal': {
      const m = new THREE.Mesh(GV('cristalP', () => new THREE.OctahedronGeometry(0.16, 0)), new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, emissive: 0x4090c0, emissiveIntensity: 0.9, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.92, flatShading: true }));
      m.scale.set(0.7, 0.7, 2.6); g.add(m);
      const nuc = new THREE.Mesh(GV('esfP', () => new THREE.SphereGeometry(1, 12, 10)), VFX.matEnergia({ c1: P.c1, c2: P.c2, c3: P.c3, escala: 4, intens: 1.6 })); nuc.scale.setScalar(0.18); g.add(nuc);
      rastro = new Rastro(16, 0.12, P.c2, { cor2: '#ffffff', vida: 0.25, intens: 1.8 });
      upd = (p, dt) => { m.rotation.z += dt * 8; nuc.material.uniforms.t.value += dt; if (Math.random() < 0.5) FX({ x: p.x, y: p.y, z: p.z, n: 1, tipo: 'floco', cor: '#e0f6ff', vel: 0.4, vida: 0.6, tam: 0.18, girar: 5, grav: 1 }); };
      break;
    }
    case 'orbeGrande': {
      const nuc = new THREE.Mesh(GV('esfP', () => new THREE.SphereGeometry(1, 12, 10)), VFX.matEnergia({ c1: P.c1, c2: P.c2, c3: P.c3, escala: 2.2, vel: [0.8, 1.2, 0], intens: 2.4 })); nuc.scale.setScalar(0.75); g.add(nuc);
      const casca = new THREE.Mesh(GV('esfP', () => new THREE.SphereGeometry(1, 12, 10)), VFX.matEnergia({ c1: P.c2, c2: P.c3, c3: '#000000', escala: 3.5, vel: [-1, 0.5, 0.7], intens: 1.4, dissolver: 0.4 })); casca.scale.setScalar(1.05); g.add(casca);
      rastro = new Rastro(22, 0.55, P.c2, { cor2: P.c1, vida: 0.4, intens: 1.6, ruido: 0.6 });
      raioV = 0.9;
      upd = (p, dt) => { nuc.material.uniforms.t.value += dt; casca.material.uniforms.t.value += dt * 1.3; casca.rotation.y += dt * 2;
        const a = J.tempo * 6; for (let k = 0; k < 2; k++) FX({ x: p.x + Math.cos(a + k * 3.14) * 1.1, y: p.y + Math.sin(a * 0.7 + k) * 0.4, z: p.z + Math.sin(a + k * 3.14) * 1.1, n: 1, tipo: 'brilho', cor: P.part, vel: 0.2, vida: 0.35, tam: 0.35 });
        if (Math.random() < 0.3) FX({ x: p.x, y: p.y, z: p.z, n: 1, tipo: 'raio', cor: P.part2, vel: 0, vida: 0.1, tam: 1.5, brilho: 1.8 }); };
      break;
    }
    default: { // orbes elementais
      const ehInim = dono === 'inimigo';
      const esc = ehInim ? 0.34 : elem === 'fogo' ? 0.42 : 0.3;
      const nuc = new THREE.Mesh(GV('esfP', () => new THREE.SphereGeometry(1, 12, 10)), VFX.matEnergia({ c1: P.c1, c2: P.c2, c3: P.c3, escala: elem === 'raio' ? 5 : 3, vel: elem === 'fogo' ? [0, -3, 0] : [1, 1.5, 0.5], intens: 2.4 }));
      nuc.scale.setScalar(esc); g.add(nuc);
      const halo = new THREE.Mesh(GV('esfP', () => new THREE.SphereGeometry(1, 12, 10)), VFX.matEnergia({ c1: P.c2, c2: P.c3, c3: '#000000', escala: 2, intens: 1.2, dissolver: 0.35 })); halo.scale.setScalar(esc * 1.7); g.add(halo);
      raioV = esc;
      rastro = new Rastro(18, esc * 1.4, P.c2, { cor2: P.c1, vida: elem === 'fogo' ? 0.32 : 0.22, intens: 1.8, ruido: elem === 'fogo' ? 0.8 : elem === 'raio' ? 0.9 : 0.3 });
      upd = (p, dt) => {
        nuc.material.uniforms.t.value += dt * 1.5; halo.material.uniforms.t.value += dt; halo.rotation.y += dt * 3;
        if (elem === 'fogo') { FX({ x: p.x, y: p.y, z: p.z, n: 2, tipo: 'chama', cor: '#ffd080', corFim: '#ff2000', vel: 0.8, vida: 0.35, tam: esc * 2.2, tamFim: esc * 0.6, sobe: 1.5, grav: -2, rot: 0, espalhar: esc }); if (Math.random() < 0.3) FM({ x: p.x, y: p.y, z: p.z, n: 1, cor: '#2a2420', vel: 0.5, vida: 0.7, tam: esc * 1.5, tamFim: esc * 3.5, sobe: 1, grav: -1, alfa: 0.6 }); if (Math.random() < 0.4) FX({ x: p.x, y: p.y, z: p.z, n: 1, tipo: 'brasa', cor: '#ffc040', vel: 1.5, vida: 0.6, tam: 0.1, grav: 3 }); }
        else if (elem === 'raio') { if (Math.random() < 0.5) FX({ x: p.x, y: p.y, z: p.z, n: 1, tipo: 'raio', cor: '#d8ecff', vel: 0, vida: 0.07, tam: esc * 4, brilho: 2.2, rot: Math.random() * 6.28 }); FX({ x: p.x, y: p.y, z: p.z, n: 1, tipo: 'faisca', estica: 2, cor: '#ffffff', corFim: P.part, vel: 4, vida: 0.15, tam: 0.12 }); }
        else if (elem === 'veneno') { if (Math.random() < 0.5) FX({ x: p.x, y: p.y, z: p.z, n: 1, tipo: 'bolha', cor: '#b0ff60', vel: 0.6, vida: 0.6, tam: 0.18, sobe: 1, grav: -1 }); }
        else if (elem === 'frio') { if (Math.random() < 0.5) FX({ x: p.x, y: p.y, z: p.z, n: 1, tipo: 'floco', cor: '#e0f6ff', vel: 0.4, vida: 0.6, tam: 0.2, girar: 5 }); }
        else if (Math.random() < 0.4) FX({ x: p.x, y: p.y, z: p.z, n: 1, tipo: 'brilho', cor: P.part, vel: 0.5, vida: 0.3, tam: esc * 1.5 });
      };
    }
  }
  const vfx = { rastro, raioV, elem, P, upd };
  if (rastro) { vfx.seg = VFX.seguir(rastro, () => g.position.clone().add(new THREE.Vector3(0, 0, -raioV * 0.5).applyQuaternion(g.quaternion))); }
  g.userData.vfx = vfx;
  return g;
};
VFX.fimProjetil = function (p) {
  const v = p.mesh.userData.vfx; if (!v) return;
  if (v.seg) v.seg.ativo = false;
  if (p.explode && p.dono === 'jogador') return; // a explosão cuida do resto
  const dir = { x: Math.sin(p.ang || 0), z: Math.cos(p.ang || 0) };
  VFX.impacto(p.x, p.y, p.z, v.elem === 'fisico' && (p.modelo === 'orbeGrande') ? 'arcano' : v.elem, p.modelo === 'orbeGrande' ? 1.6 : 0.9, dir);
};

// meteoro (rocha incandescente com cauda)
VFX.meteoro = function (cor, raio) {
  const g = new THREE.Group();
  const rocha = new THREE.Mesh(GV('rochaMet', () => new THREE.DodecahedronGeometry(0.6, 1)), new THREE.MeshStandardMaterial({ color: 0x2a1a14, emissive: 0xff3a00, emissiveIntensity: 1.2, roughness: 0.9, flatShading: true }));
  rocha.scale.setScalar(0.6 + raio * 0.12); g.add(rocha);
  const P = VFX.pal('fogo');
  const fogo = new THREE.Mesh(GV('esfP', () => new THREE.SphereGeometry(1, 12, 10)), VFX.matEnergia({ c1: P.c1, c2: cor, c3: P.c3, escala: 2.5, vel: [0, 3, 0], intens: 2.4, dissolver: 0.25 })); fogo.scale.setScalar(rocha.scale.x * 1.25); g.add(fogo);
  g.userData.atualizar = (dt) => { rocha.rotation.x += dt * 4; rocha.rotation.y += dt * 3; fogo.material.uniforms.t.value += dt * 2; };
  const r = new Rastro(24, 0.5 + raio * 0.1, cor, { cor2: '#fff0b0', vida: 0.35, intens: 2.2, ruido: 0.8 });
  g.userData.seg = VFX.seguir(r, () => g.position.clone());
  g.material = { dispose() { } };
  return g;
};

// espinhos de gelo brotando em anel
VFX.espinhosGelo = function (x, z, raio, n = 18) {
  const grupo = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xcff0ff, emissive: 0x3070a0, emissiveIntensity: 0.6, roughness: 0.05, transparent: true, opacity: 0.9, flatShading: true });
  const esp = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + Math.random() * 0.2, r = raio * (0.55 + Math.random() * 0.45);
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; const y = ENG.mundo.h(px, pz);
    const m = new THREE.Mesh(GV('espinho', () => new THREE.ConeGeometry(0.3, 1, 5)), mat); m.position.set(px, y, pz);
    m.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 6, (Math.random() - 0.5) * 0.6 + Math.cos(a) * -0.4);
    const h = 1 + Math.random() * 1.4; esp.push({ m, h, atraso: r / raio * 0.12 }); grupo.add(m); m.scale.set(1, 0.01, 1);
  }
  VFX.efeito(grupo, 1.4, (k, dt, e) => { for (const s of esp) { const kk = clamp((e.t - s.atraso) / 0.12, 0, 1); const sai = e.t > 1.0 ? 1 - (e.t - 1.0) / 0.4 : 1; s.m.scale.set(1, Math.max(0.01, s.h * kk * sai), 1); s.m.position.y = ENG.mundo.h(s.m.position.x, s.m.position.z) + s.m.scale.y * 0.3; } mat.opacity = e.t > 1.0 ? 0.9 * (1 - (e.t - 1.0) / 0.4) : 0.9; });
  FX({ x, y: ENG.mundo.h(x, z) + 0.5, z, n: 40, tipo: ['floco', 'estilhaco'], cor: '#e8f8ff', corFim: '#60a0ff', vel: raio * 1.6, vida: 0.9, tam: 0.35, tamFim: 0.1, girar: 6, anelPlano: true, arrasto: 1.5 });
  FM({ x, y: ENG.mundo.h(x, z) + 0.4, z, n: 14, tipo: 'nevoa', cor: '#d8ecff', vel: raio * 1.2, vida: 1.2, tam: 1.4, tamFim: 2.6, anelPlano: true, alfa: 0.5 });
};

// martelo de luz caindo
VFX.martelo = function (x, z, cor) {
  const g = new THREE.Group(); const y = ENG.mundo.h(x, z);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffe8a0, emissive: C3(cor), emissiveIntensity: 2.2, metalness: 0.6, roughness: 0.3 });
  const cab = new THREE.Mesh(GV('cabMart', () => new THREE.BoxGeometry(1.0, 0.5, 0.55)), mat); g.add(cab);
  const cabo = new THREE.Mesh(GV('caboMart', () => new THREE.CylinderGeometry(0.07, 0.07, 1.6, 8)), mat); cabo.position.y = 0.9; g.add(cabo);
  g.position.set(x, y + 9, z); g.rotation.z = 0.3;
  VFX.efeito(g, 0.22, (k) => { g.position.y = y + 9 * (1 - k * k) + 0.3; g.rotation.z = 0.3 * (1 - k); });
};

// flechas caindo do céu
VFX.flechaCaindo = function (x, z, cor) {
  const f = VFX.projetil('flecha', cor, {}); const y = ENG.mundo.h(x, z);
  f.rotation.x = Math.PI / 2 - 0.15; f.position.set(x - 0.6, y + 8, z - 0.3);
  ENG.scene.add(f);
  VFX.efeito(f, 0.24, (k) => { f.position.set(x - 0.6 * (1 - k), y + 8 * (1 - k) + 0.25, z - 0.3 * (1 - k)); }, () => {
    if (f.userData.vfx.seg) f.userData.vfx.seg.ativo = false;
    // flecha cravada no chão por alguns instantes
    const fixa = VFX.projetil('flecha', cor, {}); if (fixa.userData.vfx.seg) { fixa.userData.vfx.seg.rastro.remover(); VFX.seguidores.splice(VFX.seguidores.indexOf(fixa.userData.vfx.seg), 1); }
    fixa.rotation.x = Math.PI / 2 - 0.2; fixa.position.set(x, y + 0.25, z); VFX.efeito(fixa, 1.2, (k) => { fixa.position.y = y + 0.25 - k * 0.6; });
    FM({ x, y: y + 0.15, z, n: 2, tipo: 'nevoa', cor: '#8a7a64', vel: 1, vida: 0.5, tam: 0.4, tamFim: 0.9, alfa: 0.6 });
  });
};

// aura de buff (círculo rúnico seguindo o jogador + correntes ascendentes)
VFX.aura = function (cor, dur) {
  const jg = J.jog; if (!jg) return;
  const grupo = new THREE.Group();
  const me = VFX.circulo(jg.x, jg.z, 2.2, cor, dur, { giro: 1.6, alfa: 0.55 });
  if (me) { const x0 = jg.x, z0 = jg.z; const upd0 = me.upd; me.upd = (k, dt, e) => { upd0(k, dt, e); me.obj.position.set(jg.x - x0, jg.y - ENG.mundo.h(x0, z0), jg.z - z0); }; }
  VFX.efeito(null, dur, (k, dt) => {
    if (Math.random() < 0.7) { const a = Math.random() * 6.28; FX({ x: jg.x + Math.cos(a) * 0.9, y: jg.y + 0.2, z: jg.z + Math.sin(a) * 0.9, n: 1, tipo: 'faisca', estica: 2, cor: '#ffffff', corFim: cor, vel: 2.5, dir: { x: 0, y: 1, z: 0 }, disp: 0.1, vida: 0.8, tam: 0.18, grav: -1 }); }
  });
};

// energia convergindo durante a conjuração
VFX.carregar = function (pos, cor, k) {
  for (let i = 0; i < 2; i++) {
    const a = Math.random() * 6.28, r = 1.2 + Math.random() * 0.6; const o = { x: pos.x + Math.cos(a) * r, y: pos.y + (Math.random() - 0.3) * 0.8, z: pos.z + Math.sin(a) * r };
    const d = new THREE.Vector3(pos.x - o.x, pos.y - o.y, pos.z - o.z); const L = d.length(); d.normalize();
    FX({ x: o.x, y: o.y, z: o.z, n: 1, tipo: 'faisca', estica: 1.5, cor: '#ffffff', corFim: cor, vel: L / 0.22, dir: d, disp: 0, vida: 0.22, tam: 0.14, tamFim: 0.05, arrasto: 0, espalhar: 0 });
  }
  FX({ x: pos.x, y: pos.y, z: pos.z, n: 1, tipo: 'brilho', cor, vel: 0, vida: 0.08, tam: 0.6 + k * 0.9, brilho: 2 });
};

// ------------------------------------------------------------
// Substituições dos efeitos do motor
// ------------------------------------------------------------
ENG.onda = function (x, y, z, raio, cor, dur = 0.4) { VFX.choque(x, y, z, raio, cor, dur); };
ENG.arcoGolpe = function (x, y, z, ang, raio, arco, cor) { VFX.corte(x, y, z, ang, raio, arco, cor); };
ENG.relampago = function (a, b, cor, larg = 0.12) { VFX.relampago(a, b, cor, larg); };
ENG.coluna = function (x, y, z, cor, alt, larg, dur) { VFX.coluna(x, y, z, cor, alt, larg, dur); };
{
  const at0 = ENG.atualizarEfeitos;
  ENG.atualizarEfeitos = function (dt) { at0(dt); VFX.atualizar(dt); };
  const lim0 = ENG.limparEfeitos;
  ENG.limparEfeitos = function () { lim0(); VFX.limpar(); };
}

// ------------------------------------------------------------
// Pontos de ancoragem nos modelos 3D (mão, ponta da arma)
// ------------------------------------------------------------
VFX.osso = function (m, nome) {
  if (!m || m.rig !== 'gltf') return null;
  if (!m._ossos) m._ossos = {};
  if (m._ossos[nome] === undefined) { let o = null; m.raiz.traverse(c => { if (!o && c.name === nome) o = c; }); m._ossos[nome] = o; }
  return m._ossos[nome];
};
VFX.posMao = function (ent, lado = 'r') {
  const m = ent.m; const o = VFX.osso(m, 'handslot' + lado);
  if (o) { o.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld); }
  return new THREE.Vector3(ent.x + Math.sin(ent.ang) * 0.5, (ent.y || 0) + 1.3, ent.z + Math.cos(ent.ang) * 0.5);
};
// base e ponta da arma (para o rastro de lâmina)
VFX.lamina = function (ent, comp = 1.0) {
  const o = VFX.osso(ent.m, 'handslotr'); if (!o) return null;
  o.updateWorldMatrix(true, false);
  const base = new THREE.Vector3(0, 0.15, 0).applyMatrix4(o.matrixWorld);
  const ponta = new THREE.Vector3(0, comp / ent.m.T.esc / ent.m.escala, 0).applyMatrix4(o.matrixWorld);
  return [base, ponta];
};

// ------------------------------------------------------------
// Visual das áreas (habilidades em área do jogador e dos inimigos)
// ------------------------------------------------------------
VFX.visualArea = function (a, y) {
  const cor = a.cor || '#ff6030';
  const elem = a.elem || (a.sk && a.sk.elem) || 'fisico';
  switch (a.visual) {
    case 'flechas':
      for (let k = 0; k < 4; k++) { const r = Math.sqrt(Math.random()) * a.raio, an = Math.random() * 6.28; VFX.flechaCaindo(a.x + Math.cos(an) * r, a.z + Math.sin(an) * r, a.sk && a.sk.elem === 'fogo' ? '#ff8030' : cor); }
      if (a.sk && a.sk.elem === 'fogo') FX({ x: a.x, y: y + 0.3, z: a.z, n: 10, tipo: 'chama', cor: '#ffc060', corFim: '#ff2000', vel: 1.5, vida: 0.6, tam: 0.8, sobe: 2, grav: -2, rot: 0, espalhar: a.raio });
      break;
    case 'meteoro': case 'explosao':
      VFX.explosao(a.x, y + 0.6, a.z, a.raio, a.visual === 'meteoro' ? 'fogo' : (elem === 'fisico' ? 'fogo' : elem), cor);
      GFX.decal(a.x, a.z, a.raio * 0.9, 'queimado', 12);
      ENG.tremor = Math.max(ENG.tremor, a.dono === 'inimigo' ? 0.4 : 0.3);
      break;
    case 'martelo':
      VFX.martelo(a.x, a.z, cor);
      setTimeout(() => { if (!ENG.mundo) return; VFX.coluna(a.x, y, a.z, cor, 9, 0.7, 0.4); VFX.choque(a.x, y, a.z, a.raio * 1.2, cor); FX({ x: a.x, y: y + 0.4, z: a.z, n: 18, tipo: 'faisca', estica: 2.5, cor: '#ffffff', corFim: cor, vel: 8, vida: 0.4, tam: 0.25, sobe: 1.2, grav: 6 }); }, 200);
      break;
    case 'armadilha':
      VFX.explosao(a.x, y + 0.4, a.z, a.raio * 0.85, 'fogo', cor);
      GFX.decal(a.x, a.z, a.raio * 0.7, 'queimado', 10);
      break;
    case 'veneno':
      VFX.choque(a.x, y, a.z, a.raio, '#80e030', 0.5);
      FM({ x: a.x, y: y + 0.4, z: a.z, n: 22, cor: '#4a7a20', vel: 2.5, vida: 1.2, tam: 1.0, tamFim: 2.2, sobe: 0.5, espalhar: a.raio, alfa: 0.7 });
      FX({ x: a.x, y: y + 0.3, z: a.z, n: 24, tipo: 'bolha', cor: '#c0ff70', corFim: '#307010', vel: 2.5, vida: 0.9, tam: 0.3, sobe: 1.5, grav: -1.5, espalhar: a.raio * 0.9 });
      GFX.decal(a.x, a.z, a.raio * 0.8, 'gosma', 8);
      break;
    case 'gelo':
      VFX.espinhosGelo(a.x, a.z, a.raio, Math.round(8 + a.raio * 2));
      VFX.choque(a.x, y, a.z, a.raio, '#9ad8ff', 0.5);
      break;
    case 'nenhum': break;
    default:
      VFX.choque(a.x, y, a.z, a.raio, cor, 0.4);
      FM({ x: a.x, y: y + 0.2, z: a.z, n: 10, tipo: 'pedra', cor: '#5a4a3a', vel: a.raio * 1.8, vida: 0.8, tam: 0.3, tamFim: 0.2, sobe: 3, grav: 14, girar: 8, espalhar: a.raio * 0.6 });
      FM({ x: a.x, y: y + 0.3, z: a.z, n: 8, tipo: 'nevoa', cor: '#7a6a54', vel: a.raio, vida: 0.9, tam: 1.2, tamFim: 2.4, alfa: 0.55, espalhar: a.raio * 0.7 });
      if (Math.random() < 0.5) GFX.decal(a.x, a.z, a.raio * 0.6, 'queimado', 6);
      ENG.tremor = Math.max(ENG.tremor, 0.15);
  }
};

// ------------------------------------------------------------
// Rastros das armas nos golpes corpo a corpo
// ------------------------------------------------------------
const COMP_ARMA = { guerreiro: 1.05, cacadora: 0.45, esq_lacaio: 0.8, esq_afogado: 0.8, esq_guerreiro: 0.95, esq_rei: 1.0, npc_ferreiro: 1.1 };
VFX.rastroArma = function (ent, ativo, cor) {
  const m = ent.m; if (!m || m.rig !== 'gltf' || !COMP_ARMA[m.chave]) return;
  if (ativo) {
    if (!ent._rl) ent._rl = new RastroLamina(16, cor || '#ffe8c0', { vida: 0.18 });
    const p = VFX.lamina(ent, COMP_ARMA[m.chave] * m.escala); if (p) ent._rl.adicionar(p[0], p[1], J.tempo);
  }
  if (ent._rl) { const vivo = ent._rl.atualizar(J.tempo); if (!ativo && !vivo) { ent._rl.remover(); ent._rl = null; } }
};
