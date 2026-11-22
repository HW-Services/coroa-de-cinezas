// ============================================================
//  Física entre corpos e navegação dos monstros
//  - personagens, monstros e lacaios se empurram (corpos sólidos)
//  - monstros presos em pedras/árvores/bordas percebem que não
//    avançam e calculam um desvio (A* numa grade local)
// ============================================================
'use strict';

const FIS = { RAIO_JOG: 0.45 };

// ---------- empurrões ----------
// peso de cada corpo (quanto resiste a ser empurrado)
FIS.peso = (e) => e.boss ? 12 : e.rar === 'raro' ? 2.2 : (e.m && e.m.escala > 1.4) ? 2.5 : 1;
FIS.separar = function (a, ra, pa, b, rb, pb, moverA, moverB) {
  const dx = a.x - b.x, dz = a.z - b.z; let d = Math.hypot(dx, dz);
  const min = ra + rb; if (d >= min) return;
  let nx, nz;
  if (d < 1e-3) { const ang = Math.random() * 6.28; nx = Math.cos(ang); nz = Math.sin(ang); d = 0; } else { nx = dx / d; nz = dz / d; }
  const sobra = (min - d) * 0.6; // resolve parte por quadro (suave)
  const ka = !moverA ? 0 : !moverB ? 1 : pb / (pa + pb), kb = 1 - ka;
  if (moverA && ka > 0) J.mover(a, nx * sobra * ka, nz * sobra * ka, ra * 0.9);
  if (moverB && kb > 0) J.mover(b, -nx * sobra * kb, -nz * sobra * kb, rb * 0.9);
};
FIS.empurroes = function () {
  const jg = J.jog; if (!jg || !J.mundo) return;
  const vivo = jg.vida > 0;
  const host = !(typeof COOP !== 'undefined' && COOP.ativo && COOP.ativo()) || COOP.souHost;
  for (const e of J.inimigos) {
    if (e.morto || !e.m || !e.m.raiz.visible || e.voa || (e.alt || 0) > 0.5) continue;
    const re = e.raio * 0.85;
    // jogador local x monstro (marionetes são posicionadas pelo anfitrião: só o jogador se move)
    if (vivo && Math.abs(e.x - jg.x) < 4 && Math.abs(e.z - jg.z) < 4) FIS.separar(jg, FIS.RAIO_JOG, 1.4, e, re, FIS.peso(e), true, !e.marionete);
    // lacaios x monstro
    if (!e.marionete) for (const l of J.lacaios) if (Math.abs(e.x - l.x) < 3 && Math.abs(e.z - l.z) < 3) FIS.separar(l, 0.4, 0.8, e, re, FIS.peso(e), true, true);
    // no anfitrião, os monstros também abrem espaço para os outros jogadores
    if (host && !e.marionete && window.MP && MP.outros) for (const o of MP.outros.values()) if (Math.abs(e.x - o.x) < 3 && Math.abs(e.z - o.z) < 3) FIS.separar(o, FIS.RAIO_JOG, 1e9, e, re, FIS.peso(e), false, true);
  }
  // jogador local x outros jogadores (cada um empurra só a si mesmo, então fica simétrico)
  if (vivo && window.MP && MP.outros) for (const o of MP.outros.values()) if (Math.abs(o.x - jg.x) < 2 && Math.abs(o.z - jg.z) < 2) FIS.separar(jg, FIS.RAIO_JOG, 1, o, FIS.RAIO_JOG, 1, true, false);
  // lacaios entre si e com o jogador
  for (const l of J.lacaios) if (vivo) FIS.separar(l, 0.4, 0.6, jg, FIS.RAIO_JOG, 1.4, true, false);
};
{
  const at0 = J.atualizar;
  J.atualizar = function (dt) {
    const r = at0.apply(this, arguments);
    if (J.estado === 'jogando' && J.mundo && dt > 0) FIS.empurroes();
    return r;
  };
}

// ---------- navegação: A* numa grade local ----------
FIS.caminho = function (x0, z0, x1, z1, raio) {
  const m = J.mundo; const P = 1.0;
  // limita a busca a uma janela em volta do monstro
  const dist = Math.hypot(x1 - x0, z1 - z0);
  if (dist > 34) { const k = 34 / dist; x1 = x0 + (x1 - x0) * k; z1 = z0 + (z1 - z0) * k; }
  const minX = Math.min(x0, x1) - 12, minZ = Math.min(z0, z1) - 12;
  const W = Math.ceil((Math.max(x0, x1) + 12 - minX) / P), H = Math.ceil((Math.max(z0, z1) + 12 - minZ) / P);
  const id = (i, j) => j * W + i, cx = (i) => minX + (i + 0.5) * P, cz = (j) => minZ + (j + 0.5) * P;
  const livre = new Int8Array(W * H).fill(-1);
  const ok = (i, j) => { if (i < 0 || j < 0 || i >= W || j >= H) return false; const k = id(i, j); if (livre[k] < 0) livre[k] = m.andavel(cx(i), cz(j), raio) ? 1 : 0; return livre[k] === 1; };
  const si = Math.floor((x0 - minX) / P), sj = Math.floor((z0 - minZ) / P);
  let ti = Math.floor((x1 - minX) / P), tj = Math.floor((z1 - minZ) / P);
  // se o destino está bloqueado, usa a célula livre mais próxima dele
  if (!ok(ti, tj)) { let melhor = null; for (let r = 1; r < 5 && !melhor; r++) for (let a = -r; a <= r; a++) for (const [i, j] of [[ti + a, tj - r], [ti + a, tj + r], [ti - r, tj + a], [ti + r, tj + a]]) if (!melhor && ok(i, j)) melhor = [i, j]; if (!melhor) return null; [ti, tj] = melhor; }
  const g = new Float32Array(W * H).fill(1e9), de = new Int32Array(W * H).fill(-1), fechado = new Uint8Array(W * H);
  const aberto = [[0, si, sj]]; g[id(si, sj)] = 0;
  const h = (i, j) => Math.hypot(i - ti, j - tj);
  const viz = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let n = 0, achou = false;
  while (aberto.length && n++ < 3000) {
    // menor f (lista pequena: busca linear basta)
    let bi = 0; for (let k = 1; k < aberto.length; k++) if (aberto[k][0] < aberto[bi][0]) bi = k;
    const [, i, j] = aberto[bi]; aberto[bi] = aberto[aberto.length - 1]; aberto.pop();
    const k0 = id(i, j); if (fechado[k0]) continue; fechado[k0] = 1;
    if (i === ti && j === tj) { achou = true; break; }
    for (const [di, dj, c] of viz) {
      const ni = i + di, nj = j + dj; if (!ok(ni, nj)) continue;
      if (di && dj && (!ok(i + di, j) || !ok(i, j + dj))) continue; // não corta quinas
      const k = id(ni, nj); const ng = g[k0] + c;
      if (ng < g[k]) { g[k] = ng; de[k] = k0; aberto.push([ng + h(ni, nj), ni, nj]); }
    }
  }
  if (!achou) return null;
  const pts = []; let k = id(ti, tj);
  while (k >= 0 && k !== id(si, sj)) { pts.push({ x: cx(k % W), z: cz(Math.floor(k / W)) }); k = de[k]; }
  pts.reverse();
  // suaviza: pula pontos com linha reta livre
  const livreReta = (a, b) => { const L = Math.hypot(b.x - a.x, b.z - a.z), s = Math.ceil(L / 0.5); for (let t = 1; t < s; t++) if (!m.andavel(a.x + (b.x - a.x) * t / s, a.z + (b.z - a.z) * t / s, raio)) return false; return true; };
  const res = []; let atual = { x: x0, z: z0 };
  for (let a = 0; a < pts.length;) {
    let b = pts.length - 1; while (b > a && !livreReta(atual, pts[b])) b--;
    res.push(pts[b]); atual = pts[b]; a = b + 1;
  }
  return res;
};

// devolve o ponto para onde o monstro deve andar agora (o alvo, ou o próximo ponto do desvio)
J.navAlvo = function (e, ax, az, dt, vel) {
  const agora = J.tempo || 0;
  const nv = e.nav || (e.nav = { t0: agora, x0: e.x, z0: e.z, esp: 0, rota: null, ate: 0, falhas: 0 });
  // seguindo um desvio
  if (nv.rota && nv.rota.length) {
    const alvoMudou = Math.hypot(ax - nv.ax, az - nv.az) > 5;
    if (agora > nv.ate || alvoMudou) nv.rota = null;
    else {
      let p = nv.rota[0];
      while (p && Math.hypot(p.x - e.x, p.z - e.z) < 0.7) { nv.rota.shift(); p = nv.rota[0]; }
      if (p) return p;
      nv.rota = null;
    }
  }
  // detecta se está preso: anda pouco em relação ao que deveria
  nv.esp += vel * dt;
  if (agora - nv.t0 > 0.6) {
    const andou = Math.hypot(e.x - nv.x0, e.z - nv.z0);
    const longe = Math.hypot(ax - e.x, az - e.z) > e.raio + 2.5;
    if (longe && nv.esp > 1 && andou < nv.esp * 0.3) {
      const rota = FIS.caminho(e.x, e.z, ax, az, e.raio);
      if (rota && rota.length) { nv.rota = rota; nv.ax = ax; nv.az = az; nv.ate = agora + 5; nv.falhas = 0; e.strafe = -(e.strafe || 1); }
      else nv.falhas++;
    }
    nv.t0 = agora; nv.x0 = e.x; nv.z0 = e.z; nv.esp = 0;
  }
  return null;
};

// ============================================================
//  Física dos monstros: inércia, empurrão ao ser atingido,
//  cambaleio, peso na subida/descida e corpos arremessados
// ============================================================
FIS.acel = (e) => 11 / Math.sqrt(FIS.peso(e));   // quanto mais pesado, mais demora para acelerar e frear

// movimento da IA com aceleração e efeito da inclinação do terreno
J.moverIA = function (e, dx, dz, raio, dt) {
  if (!dt || e.boss) return J.mover(e, dx, dz, raio);
  const k = 1 - Math.exp(-dt * FIS.acel(e));
  const vdx = dx / dt, vdz = dz / dt;
  e.vx = (e.vx || 0) + (vdx - (e.vx || 0)) * k; e.vz = (e.vz || 0) + (vdz - (e.vz || 0)) * k;
  // subida cansa, descida embala
  const m = J.mundo, L = Math.hypot(e.vx, e.vz);
  let inc = 1;
  if (L > 0.1 && !e.voa) { const s = (m.h(e.x + e.vx / L * 0.8, e.z + e.vz / L * 0.8) - m.h(e.x, e.z)) / 0.8; inc = Math.max(0.6, Math.min(1.25, 1 - s * 0.45)); }
  e._movT = J.tempo;
  const ok = J.mover(e, e.vx * dt * inc, e.vz * dt * inc, raio);
  if (!ok) { e.vx *= 0.5; e.vz *= 0.5; }
  return ok;
};
// impulso (empurrão) num monstro
J.impulso = function (e, ix, iz) {
  if (!e || e.morto) return;
  const p = FIS.peso(e);
  e.kbx = (e.kbx || 0) + ix / p; e.kbz = (e.kbz || 0) + iz / p;
  const f = Math.hypot(e.kbx, e.kbz); if (f > 14) { e.kbx *= 14 / f; e.kbz *= 14 / f; }
  // cambaleio: golpes fortes interrompem o passo por um instante
  const forca = Math.hypot(ix, iz) / p;
  if (forca > 2.2 && !e.boss) { e.lentoT = Math.max(e.lentoT || 0, 0.28); e.lentoF = Math.max(e.lentoF || 0, 0.75); e.tranco = Math.min(0.45, 0.12 + forca * 0.03); }
};
// força do golpe: dano relativo à vida do monstro, tipo do golpe e crítico
FIS.forcaGolpe = function (e, d, sk, o) {
  let f = 1.2 + Math.min(1, d / Math.max(1, e.vidaMax)) * 18;
  const marcas = sk && sk.id && typeof MARCA_HAB !== 'undefined' ? (MARCA_HAB[sk.id] || []) : [];
  if (marcas.includes('impacto')) f *= 1.8; else if (marcas.includes('vento')) f *= 1.5;
  if (sk && sk.elem && sk.elem !== 'fisico' && !marcas.length) f *= 0.7;
  if (o && o.combo) f *= 0.6;
  if (o && o.semFx) f *= 0.7;
  return Math.min(9, f);
};
{
  const ac0 = J.acertarInimigo;
  J.acertarInimigo = function (e, mult, sk, o = {}) {
    const vivo = e && !e.morto, v0 = e ? e.vida : 0;
    const d = ac0.apply(this, arguments);
    if (!vivo || !d || !J.jog) return d;
    const fonte = o.origem || J.jog;
    let dx = e.x - fonte.x, dz = e.z - fonte.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const f = FIS.forcaGolpe(e, Math.max(d, v0 - Math.max(0, e.vida)), sk, o);
    e._ultGolpe = { dx, dz, f };
    if (e.marionete) {
      // o anfitrião é quem move o monstro: envia o empurrão junto com o dano
      if (typeof COOP !== 'undefined' && COOP.pendente && e.nid != null) { const p = COOP.pendente.get(e.nid); if (p) { p.kx = (p.kx || 0) + dx * f; p.kz = (p.kz || 0) + dz * f; } }
    } else if (!e.morto) J.impulso(e, dx * f, dz * f);
    return d;
  };
  // corpo arremessado ao morrer, no sentido do último golpe
  const mat0 = J.matarInimigo;
  J.matarInimigo = function (e) {
    const ja = e && e.morto;
    const r = mat0.apply(this, arguments);
    if (e && !ja && e.morto && !e.boss && !e.voa) {
      const g = e._ultGolpe || { dx: 0, dz: 0, f: 2 };
      const p = FIS.peso(e), f = Math.min(10, (2.5 + g.f * 0.9) / Math.sqrt(p));
      e.toss = { vx: g.dx * f, vz: g.dz * f, vy: (4 + g.f * 0.6) / Math.sqrt(p), y: 0, giro: (Math.random() - 0.5) * 6, t: 0 };
    }
    return r;
  };
  const at0 = J.atualizarInimigo;
  J.atualizarInimigo = function (e, dt) {
    if (e.morto && e.toss && dt > 0) {
      const T = e.toss; T.t += dt;
      if (T.t < 2) {
        T.vy -= 22 * dt; T.y += T.vy * dt;
        if (T.y <= 0) { T.y = 0; if (Math.abs(T.vy) > 2.2) { T.vy = -T.vy * 0.3; T.giro *= 0.5; } else T.vy = 0; const fr = Math.exp(-dt * 7); T.vx *= fr; T.vz *= fr; }
        if (Math.abs(T.vx) + Math.abs(T.vz) > 0.05) { const x0 = e.x, z0 = e.z; J.mover(e, T.vx * dt, T.vz * dt, 0.25); if (e.x === x0 && e.z === z0) { T.vx *= -0.3; T.vz *= -0.3; } e.y = J.mundo.h(e.x, e.z); }
      }
      const ok = at0.apply(this, arguments);
      const rz = e.m.raiz; rz.position.x = e.x; rz.position.z = e.z; rz.position.y += T.y;
      if (T.y > 0.02) rz.rotation.y += T.giro * dt;
      return ok;
    }
    if (!e.morto && !e.marionete && dt > 0) {
      // empurrão em andamento (com atrito; bate em pedras e árvores)
      if (e.kbx || e.kbz) {
        const okm = J.mover(e, e.kbx * dt, e.kbz * dt, e.raio * 0.9);
        const fr = Math.exp(-dt * (okm ? 7 : 20)); e.kbx *= fr; e.kbz *= fr;
        if (Math.abs(e.kbx) + Math.abs(e.kbz) < 0.05) { e.kbx = 0; e.kbz = 0; }
      }
      // embalo: ao parar de andar, ainda desliza um pouco
      if ((e.vx || e.vz) && J.tempo - (e._movT || 0) > dt * 1.5) {
        const fr = Math.exp(-dt * FIS.acel(e) * 1.4); e.vx *= fr; e.vz *= fr;
        if (Math.abs(e.vx) + Math.abs(e.vz) < 0.08) { e.vx = 0; e.vz = 0; } else J.mover(e, e.vx * dt, e.vz * dt, e.raio);
      }
    }
    const ok = at0.apply(this, arguments);
    // tranco: o corpo inclina para trás com o golpe e volta
    if (!e.morto && e.tranco > 0.005 && e.m && e.m.raiz) {
      const g = e._ultGolpe; const rz = e.m.raiz;
      const lx = g ? g.dx : 0, lz = g ? g.dz : 0;
      const s = Math.sin(e.ang), c = Math.cos(e.ang);
      rz.rotation.x = -(lx * s + lz * c) * e.tranco; rz.rotation.z = (lx * c - lz * s) * e.tranco;
      e.tranco *= Math.exp(-dt * 9);
    } else if (!e.morto && e.m && e.m.raiz && (e.m.raiz.rotation.x || e.m.raiz.rotation.z) && e.tranco !== undefined) { e.m.raiz.rotation.x = 0; e.m.raiz.rotation.z = 0; e.tranco = undefined; }
    return ok;
  };
}
