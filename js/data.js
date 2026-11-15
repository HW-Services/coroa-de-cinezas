// ============================================================
//  COROA DE CINZAS — dados do jogo
// ============================================================
'use strict';

const RNG = {
  r: Math.random,
  range(a, b) { return a + Math.random() * (b - a); },
  int(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  chance(p) { return Math.random() < p; },
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
};

// ------------------------------------------------------------
// Classes e ascendências
// ------------------------------------------------------------
const CLASSES = {
  guerreiro: {
    nome: 'Guerreiro', titulo: 'Senhor da Guerra',
    desc: 'Combatente corpo a corpo que gera Fúria ao golpear. Muita vida e armadura.',
    recurso: { nome: 'Fúria', cor: '#d8452f', max: 100, regen: 1.5, inicio: 0 },
    base: { vida: 95, forca: 20, destreza: 10, inteligencia: 8 },
    porNivel: { vida: 9, forca: 3, destreza: 1, inteligencia: 1 },
    atributo: 'forca', arma: 'machado', cores: { corpo: 0x6b4a32, armadura: 0x8a8f99, detalhe: 0xb8923a, pele: 0xc89878 },
    ascendencias: ['berserker', 'guardiao'],
  },
  cacadora: {
    nome: 'Caçadora', titulo: 'Lâmina do Ermo',
    desc: 'Arqueira ágil que usa Energia. Ataques rápidos à distância e muita mobilidade.',
    recurso: { nome: 'Energia', cor: '#e2b93b', max: 100, regen: 9, inicio: 100 },
    base: { vida: 80, forca: 10, destreza: 20, inteligencia: 10 },
    porNivel: { vida: 7, forca: 1, destreza: 3, inteligencia: 1 },
    atributo: 'destreza', arma: 'arco', cores: { corpo: 0x3d5a3a, armadura: 0x6b5236, detalhe: 0xc2a46a, pele: 0xd6a888 },
    ascendencias: ['atiradora', 'sombra'],
  },
  feiticeira: {
    nome: 'Feiticeira', titulo: 'Tecelã dos Elementos',
    desc: 'Conjuradora de fogo, gelo e raio que consome Mana. Grande dano em área.',
    recurso: { nome: 'Mana', cor: '#3f7fe0', max: 110, regen: 6, inicio: 110 },
    base: { vida: 72, forca: 8, destreza: 10, inteligencia: 22 },
    porNivel: { vida: 6, forca: 1, destreza: 1, inteligencia: 3 },
    atributo: 'inteligencia', arma: 'cajado', cores: { corpo: 0x3a2f5c, armadura: 0x5b4a8a, detalhe: 0xd9b45a, pele: 0xe0b498 },
    ascendencias: ['piromante', 'necromante'],
  },
};

const ASCENDENCIAS = {
  berserker: { nome: 'Berserker', classe: 'guerreiro', desc: 'Sacrifica defesa por velocidade e sede de sangue.',
    nos: [
      { id: 'b1', nome: 'Sede de Sangue', desc: '+3% de roubo de vida', stats: { roubo: 3 } },
      { id: 'b2', nome: 'Fúria Imparável', desc: '+15% velocidade de ataque', stats: { velAtaque: 15 } },
      { id: 'b3', nome: 'Golpes Devastadores', desc: '+45% dano crítico', stats: { danoCrit: 45 } },
      { id: 'b4', nome: 'Sem Dor', desc: '+25% dano, -10% armadura', stats: { danoPct: 25, armaduraPct: -10 } },
    ] },
  guardiao: { nome: 'Guardião', classe: 'guerreiro', desc: 'Muralha viva abençoada por luz antiga.',
    nos: [
      { id: 'g1', nome: 'Bastião', desc: '+45% armadura', stats: { armaduraPct: 45 } },
      { id: 'g2', nome: 'Vigor Sagrado', desc: '+20% vida máxima', stats: { vidaPct: 20 } },
      { id: 'g3', nome: 'Retaliação', desc: 'Reflete 60% do dano corpo a corpo recebido', stats: { espinhos: 60 } },
      { id: 'g4', nome: 'Resolução', desc: '+15% em todas as resistências, +10% bloqueio', stats: { resTodas: 15, bloqueio: 10 } },
    ] },
  atiradora: { nome: 'Atiradora', classe: 'cacadora', desc: 'Mestra das flechas explosivas e saraivadas.',
    nos: [
      { id: 'a1', nome: 'Olho de Águia', desc: '+12% chance de crítico', stats: { critChance: 12 } },
      { id: 'a2', nome: 'Munição Extra', desc: '+1 projétil em habilidades de projétil', stats: { projeteis: 1 } },
      { id: 'a3', nome: 'Precisão Letal', desc: '+50% dano crítico', stats: { danoCrit: 50 } },
      { id: 'a4', nome: 'Pés Ligeiros', desc: '+12% velocidade de movimento', stats: { velMov: 12 } },
    ] },
  sombra: { nome: 'Sombra', classe: 'cacadora', desc: 'Assassina que caminha entre as trevas e o veneno.',
    nos: [
      { id: 's1', nome: 'Veneno Concentrado', desc: '+40% dano de veneno e ao longo do tempo', stats: { danoVeneno: 40, danoDot: 40 } },
      { id: 's2', nome: 'Evasão', desc: '+15% chance de esquiva', stats: { esquiva: 15 } },
      { id: 's3', nome: 'Assassina', desc: '+35% dano contra raros e chefes', stats: { danoElite: 35 } },
      { id: 's4', nome: 'Sombras Velozes', desc: '-20% tempo de recarga', stats: { recarga: 20 } },
    ] },
  piromante: { nome: 'Piromante', classe: 'feiticeira', desc: 'Encarnação viva das chamas.',
    nos: [
      { id: 'p1', nome: 'Coração em Chamas', desc: '+40% dano de fogo', stats: { danoFogo: 40 } },
      { id: 'p2', nome: 'Combustão', desc: '+25% área de efeito', stats: { area: 25 } },
      { id: 'p3', nome: 'Pele Abrasada', desc: '+30% resistência a fogo, +12% vida', stats: { resFogo: 30, vidaPct: 12 } },
      { id: 'p4', nome: 'Fogo Eterno', desc: '+50% dano de queimadura', stats: { danoDot: 50 } },
    ] },
  necromante: { nome: 'Necromante', classe: 'feiticeira', desc: 'Comanda os mortos e colhe almas.',
    nos: [
      { id: 'n1', nome: 'Exército dos Mortos', desc: '+2 lacaios máximos', stats: { lacaios: 2 } },
      { id: 'n2', nome: 'Ossos Endurecidos', desc: 'Lacaios têm +60% vida', stats: { lacaioVida: 60 } },
      { id: 'n3', nome: 'Pacto Sombrio', desc: '+20% dano, lacaios +40% dano', stats: { danoPct: 20, lacaioDano: 40 } },
      { id: 'n4', nome: 'Colheita de Almas', desc: 'Cura 3% da vida ao abater um inimigo', stats: { curaAbate: 3 } },
    ] },
};

// ------------------------------------------------------------
// Habilidades
// secoes: basico, nucleo, defensivo, maestria, supremo
// tipos: golpe, projetil, nova, area, investida, salto, teleporte, buff, chuva, corrente, radial, invocar
// ------------------------------------------------------------
const SECOES = [
  { id: 'basico', nome: 'Básico', req: 0 },
  { id: 'nucleo', nome: 'Núcleo', req: 2 },
  { id: 'defensivo', nome: 'Defensivo', req: 6 },
  { id: 'maestria', nome: 'Maestria', req: 11 },
  { id: 'supremo', nome: 'Supremo', req: 16 },
  { id: 'chave', nome: 'Passiva-Chave', req: 23 },
];

const HABILIDADES = {
  // ---------------- GUERREIRO ----------------
  golpe_pesado: { nome: 'Golpe Pesado', classe: 'guerreiro', secao: 'basico', nivel: 1, icone: '⚒', tipo: 'golpe', elem: 'fisico',
    mult: 1.0, gera: 14, tempo: 0.55, alcance: 3.4, arco: 120, cor: '#ffd08a',
    desc: 'Um golpe amplo que atinge todos os inimigos à frente. Gera Fúria.',
    apr: { desc: 'Gera +5 de Fúria adicional', ef: { gera: 5 } },
    mods: [{ nome: 'Golpe Brutal', desc: '+30% de dano', ef: { mult: 1.3 } }, { nome: 'Golpe Sanguinário', desc: 'Cura 4% do dano causado', ef: { vamp: 0.04 } }] },
  lanca_arremessada: { nome: 'Lança Arremessada', classe: 'guerreiro', secao: 'basico', nivel: 3, icone: '➶', tipo: 'projetil', elem: 'fisico',
    mult: 0.95, gera: 10, tempo: 0.6, vel: 34, qtd: 1, spread: 12, alcance: 26, raioHit: 0.9, cor: '#d9c39a', modelo: 'lanca',
    desc: 'Arremessa uma lança pesada. Gera Fúria.',
    apr: { desc: 'A lança atravessa inimigos', ef: { perfura: true } },
    mods: [{ nome: 'Lanças Gêmeas', desc: '+2 lanças', ef: { qtd: 2 } }, { nome: 'Lança Explosiva', desc: 'Explode ao atingir (raio 3)', ef: { explode: 3 } }] },
  turbilhao: { nome: 'Turbilhão de Aço', classe: 'guerreiro', secao: 'nucleo', nivel: 4, icone: '✺', tipo: 'nova', elem: 'fisico',
    mult: 0.75, custo: 24, tempo: 0.55, raio: 4.6, pulsos: 3, intervalo: 0.16, cor: '#e6e6f0', giro: true,
    desc: 'Gira violentamente, atingindo todos ao redor três vezes.',
    apr: { desc: '+1 giro', ef: { pulsos: 1 } },
    mods: [{ nome: 'Vórtice', desc: '+35% de raio', ef: { raio: 1.35 } }, { nome: 'Lâminas Rubras', desc: 'Inimigos sangram (dano ao longo do tempo)', ef: { queimar: 0.6 } }] },
  fissura: { nome: 'Fissura', classe: 'guerreiro', secao: 'nucleo', nivel: 6, icone: '⚡', tipo: 'projetil', elem: 'fisico',
    mult: 1.7, custo: 30, tempo: 0.65, vel: 24, qtd: 1, spread: 22, alcance: 22, raioHit: 1.8, perfura: true, cor: '#b88a52', modelo: 'onda',
    desc: 'Golpeia o chão, abrindo uma fenda que atravessa tudo em linha.',
    apr: { desc: '+20% de dano', ef: { mult: 1.2 } },
    mods: [{ nome: 'Fendas em Leque', desc: '+2 fendas', ef: { qtd: 2 } }, { nome: 'Abalo', desc: 'Atordoa e deixa lento', ef: { lentidao: 0.5 } }] },
  grito_guerra: { nome: 'Grito de Guerra', classe: 'guerreiro', secao: 'defensivo', nivel: 8, icone: '❂', tipo: 'buff', elem: 'fisico',
    cd: 16, gera: 35, tempo: 0.3, cor: '#ff9d3a', buff: { danoPct: 30, armaduraPct: 50, dur: 8 },
    desc: 'Brado que concede +30% dano e +50% armadura por 8s. Gera 35 de Fúria.',
    apr: { desc: '-25% de recarga', ef: { cd: 0.75 } },
    mods: [{ nome: 'Brado Prolongado', desc: '+60% de duração', ef: { dur: 1.6 } }, { nome: 'Brado Revigorante', desc: 'Cura 20% da vida', ef: { cura: 0.2 } }] },
  investida: { nome: 'Investida', classe: 'guerreiro', secao: 'defensivo', nivel: 10, icone: '➤', tipo: 'investida', elem: 'fisico',
    mult: 1.4, cd: 6, tempo: 0.1, alcance: 13, raio: 2.6, cor: '#ffcc80', invuln: true,
    desc: 'Avança até o alvo, empurrando e ferindo inimigos no caminho.',
    apr: { desc: '-30% de recarga', ef: { cd: 0.7 } },
    mods: [{ nome: 'Aríete', desc: '+60% de dano', ef: { mult: 1.6 } }, { nome: 'Impacto', desc: 'Cria uma onda de choque no fim (raio 4)', ef: { explode: 4 } }] },
  terremoto: { nome: 'Terremoto', classe: 'guerreiro', secao: 'maestria', nivel: 14, icone: '☷', tipo: 'area', elem: 'fisico',
    mult: 0.8, custo: 25, cd: 9, tempo: 0.6, alcance: 14, raio: 6, pulsos: 5, intervalo: 0.45, atraso: 0.15, cor: '#c08850',
    desc: 'Rompe o solo na área escolhida, causando tremores repetidos.',
    apr: { desc: '+2 tremores', ef: { pulsos: 2 } },
    mods: [{ nome: 'Falha Tectônica', desc: '+40% de raio', ef: { raio: 1.4 } }, { nome: 'Magma', desc: 'Converte em fogo e queima', ef: { elem: 'fogo', queimar: 0.8 } }] },
  salto: { nome: 'Salto Devastador', classe: 'guerreiro', secao: 'maestria', nivel: 18, icone: '⤒', tipo: 'salto', elem: 'fisico',
    mult: 2.4, cd: 8, tempo: 0.1, alcance: 16, raio: 5, cor: '#ffd9a0', invuln: true,
    desc: 'Salta até o local e esmaga todos ao aterrissar.',
    apr: { desc: '-25% de recarga', ef: { cd: 0.75 } },
    mods: [{ nome: 'Meteoro Humano', desc: '+40% de raio', ef: { raio: 1.4 } }, { nome: 'Esmagar', desc: '+50% de dano', ef: { mult: 1.5 } }] },
  ira_titas: { nome: 'Ira dos Titãs', classe: 'guerreiro', secao: 'supremo', nivel: 24, icone: '♛', tipo: 'buff', elem: 'fisico', unico: true,
    cd: 55, tempo: 0.4, cor: '#ff6a2a', buff: { danoPct: 80, velAtaque: 30, redDano: 25, dur: 12, gigante: true },
    desc: 'Torna-se um titã: +80% dano, +30% vel. de ataque e 25% redução de dano por 12s.',
    apr: { desc: '-20% de recarga', ef: { cd: 0.8 } },
    mods: [{ nome: 'Titã Eterno', desc: '+50% de duração', ef: { dur: 1.5 } }, { nome: 'Passos do Titã', desc: 'Cada passo causa um tremor ao redor', ef: { aura: 1 } }] },
  frenesi: { nome: 'Frenesi Sangrento', classe: 'guerreiro', asc: 'berserker', nivel: 12, icone: '♨', tipo: 'buff', elem: 'fisico',
    cd: 18, tempo: 0.2, cor: '#ff2a2a', buff: { velAtaque: 40, roubo: 5, velMov: 15, dur: 10 },
    desc: '+40% vel. de ataque, +15% movimento e +5% roubo de vida por 10s.',
    apr: { desc: '+3s de duração', ef: { dur: 1.3 } },
    mods: [{ nome: 'Carnificina', desc: '+30% dano durante o frenesi', ef: { buffDano: 30 } }, { nome: 'Fervor', desc: '-35% de recarga', ef: { cd: 0.65 } }] },
  execucao: { nome: 'Execução', classe: 'guerreiro', asc: 'berserker', nivel: 20, icone: '☠', tipo: 'golpe', elem: 'fisico',
    mult: 4.2, custo: 35, cd: 5, tempo: 0.7, alcance: 3.8, arco: 80, cor: '#ff4040', executar: 0.3,
    desc: 'Golpe esmagador. Causa dano dobrado em inimigos com menos de 30% de vida.',
    apr: { desc: '+25% dano', ef: { mult: 1.25 } },
    mods: [{ nome: 'Guilhotina', desc: 'Limite de execução 45%', ef: { executar: 0.45 } }, { nome: 'Banho de Sangue', desc: 'Cura 8% do dano', ef: { vamp: 0.08 } }] },
  muralha_escudos: { nome: 'Muralha de Escudos', classe: 'guerreiro', asc: 'guardiao', nivel: 12, icone: '⛨', tipo: 'buff', elem: 'fisico',
    cd: 20, tempo: 0.3, cor: '#ffe680', buff: { redDano: 35, espinhos: 100, dur: 10 },
    desc: '35% de redução de dano e reflete dano por 10s.',
    apr: { desc: '+30% de duração', ef: { dur: 1.3 } },
    mods: [{ nome: 'Fortaleza', desc: 'Cura 25% da vida', ef: { cura: 0.25 } }, { nome: 'Égide', desc: '-30% recarga', ef: { cd: 0.7 } }] },
  martelo_sagrado: { nome: 'Martelos Sagrados', classe: 'guerreiro', asc: 'guardiao', nivel: 20, icone: '✠', tipo: 'chuva', elem: 'raio',
    mult: 1.5, custo: 30, cd: 6, tempo: 0.5, alcance: 15, raio: 3, qtd: 7, espalhar: 6, duracao: 1.2, cor: '#ffe27a',
    desc: 'Martelos de luz caem sobre a área escolhida.',
    apr: { desc: '+3 martelos', ef: { qtd: 3 } },
    mods: [{ nome: 'Julgamento', desc: '+40% de dano', ef: { mult: 1.4 } }, { nome: 'Consagração', desc: '+30% de raio', ef: { raio: 1.3 } }] },

  // ---------------- CAÇADORA ----------------
  disparo_rapido: { nome: 'Disparo Rápido', classe: 'cacadora', secao: 'basico', nivel: 1, icone: '➹', tipo: 'projetil', elem: 'fisico',
    mult: 0.8, gera: 8, tempo: 0.4, vel: 48, qtd: 1, spread: 8, alcance: 30, raioHit: 0.7, cor: '#f2ead0', modelo: 'flecha',
    desc: 'Dispara uma flecha veloz. Gera Energia.',
    apr: { desc: '+15% chance de crítico', ef: { crit: 15 } },
    mods: [{ nome: 'Flecha Dupla', desc: '+1 flecha', ef: { qtd: 1 } }, { nome: 'Ponta Perfurante', desc: 'Atravessa inimigos', ef: { perfura: true } }] },
  laminas_gemeas: { nome: 'Lâminas Gêmeas', classe: 'cacadora', secao: 'basico', nivel: 3, icone: '⚔', tipo: 'golpe', elem: 'fisico',
    mult: 0.65, golpes: 2, gera: 12, tempo: 0.38, alcance: 2.8, arco: 100, cor: '#cfe8ff',
    desc: 'Dois cortes rápidos com adagas. Gera Energia.',
    apr: { desc: '+1 corte', ef: { golpes: 1 } },
    mods: [{ nome: 'Cortes Venenosos', desc: 'Envenena inimigos', ef: { queimar: 0.6, elem: 'veneno' } }, { nome: 'Dança das Lâminas', desc: 'Cura 3% do dano', ef: { vamp: 0.03 } }] },
  flecha_perfurante: { nome: 'Flecha Perfurante', classe: 'cacadora', secao: 'nucleo', nivel: 4, icone: '↠', tipo: 'projetil', elem: 'fisico',
    mult: 1.55, custo: 18, tempo: 0.5, vel: 60, qtd: 1, spread: 6, alcance: 36, raioHit: 0.9, perfura: true, cor: '#fff2c0', modelo: 'flecha',
    desc: 'Uma flecha poderosa que atravessa todos os inimigos em linha.',
    apr: { desc: '+20% de dano', ef: { mult: 1.2 } },
    mods: [{ nome: 'Flecha Sísmica', desc: 'Explode ao final (raio 3)', ef: { explode: 3 } }, { nome: 'Disparo Triplo', desc: '+2 flechas', ef: { qtd: 2 } }] },
  rajada: { nome: 'Rajada', classe: 'cacadora', secao: 'nucleo', nivel: 6, icone: '⋔', tipo: 'projetil', elem: 'fisico',
    mult: 0.72, custo: 22, tempo: 0.5, vel: 46, qtd: 5, spread: 42, alcance: 26, raioHit: 0.7, cor: '#f2ead0', modelo: 'flecha',
    desc: 'Dispara cinco flechas em leque.',
    apr: { desc: '+2 flechas', ef: { qtd: 2 } },
    mods: [{ nome: 'Flechas Gélidas', desc: 'Converte em frio e deixa lento', ef: { elem: 'frio', lentidao: 0.4 } }, { nome: 'Flechas Incendiárias', desc: 'Converte em fogo e queima', ef: { elem: 'fogo', queimar: 0.5 } }] },
  rolamento: { nome: 'Rolamento', classe: 'cacadora', secao: 'defensivo', nivel: 8, icone: '↺', tipo: 'investida', elem: 'fisico',
    mult: 0, cd: 3.5, tempo: 0.05, alcance: 10, raio: 2, cor: '#b0f0c0', invuln: true,
    desc: 'Rola rapidamente, ficando invulnerável durante o movimento.',
    apr: { desc: '-25% de recarga', ef: { cd: 0.75 } },
    mods: [{ nome: 'Rolamento Cortante', desc: 'Causa dano no caminho', ef: { multAbs: 1.2 } }, { nome: 'Fôlego', desc: 'Recupera 25 de Energia', ef: { gera: 25 } }] },
  armadilha: { nome: 'Armadilha Explosiva', classe: 'cacadora', secao: 'defensivo', nivel: 10, icone: '✹', tipo: 'area', elem: 'fogo',
    mult: 2.6, custo: 15, cd: 5, tempo: 0.3, alcance: 14, raio: 4.5, pulsos: 1, atraso: 1.0, cor: '#ff8a3a', armadilha: true,
    desc: 'Arremessa uma armadilha que explode após 1 segundo.',
    apr: { desc: '+25% raio', ef: { raio: 1.25 } },
    mods: [{ nome: 'Armadilhas em Cadeia', desc: '+2 armadilhas', ef: { qtd: 2 } }, { nome: 'Napalm', desc: 'Queima os inimigos', ef: { queimar: 1.0 } }] },
  chuva_flechas: { nome: 'Chuva de Flechas', classe: 'cacadora', secao: 'maestria', nivel: 14, icone: '⇊', tipo: 'area', elem: 'fisico',
    mult: 0.7, custo: 30, cd: 8, tempo: 0.5, alcance: 18, raio: 5, pulsos: 7, intervalo: 0.22, atraso: 0.25, cor: '#f2ead0', flechas: true,
    desc: 'Uma saraivada de flechas cai repetidamente sobre a área.',
    apr: { desc: '+3 ondas', ef: { pulsos: 3 } },
    mods: [{ nome: 'Céu Coberto', desc: '+40% de raio', ef: { raio: 1.4 } }, { nome: 'Flechas Mortais', desc: '+40% de dano', ef: { mult: 1.4 } }] },
  leque_laminas: { nome: 'Leque de Lâminas', classe: 'cacadora', secao: 'maestria', nivel: 18, icone: '✲', tipo: 'radial', elem: 'fisico',
    mult: 1.0, custo: 25, tempo: 0.4, vel: 30, qtd: 14, alcance: 16, raioHit: 0.9, perfura: true, cor: '#d8f0ff', modelo: 'lamina',
    desc: 'Arremessa lâminas em todas as direções.',
    apr: { desc: '+6 lâminas', ef: { qtd: 6 } },
    mods: [{ nome: 'Lâminas Envenenadas', desc: 'Envenena', ef: { elem: 'veneno', queimar: 0.8 } }, { nome: 'Lâminas Afiadas', desc: '+40% de dano', ef: { mult: 1.4 } }] },
  tempestade_aco: { nome: 'Tempestade de Aço', classe: 'cacadora', secao: 'supremo', nivel: 24, icone: '☄', tipo: 'chuva', elem: 'fisico', unico: true,
    mult: 1.6, cd: 40, tempo: 0.6, alcance: 18, raio: 3.4, qtd: 22, espalhar: 9, duracao: 3, cor: '#e0f0ff', flechas: true,
    desc: 'Invoca uma tempestade devastadora de flechas por 3 segundos.',
    apr: { desc: '-20% de recarga', ef: { cd: 0.8 } },
    mods: [{ nome: 'Dilúvio', desc: '+12 flechas', ef: { qtd: 12 } }, { nome: 'Aço Gélido', desc: 'Converte em frio e deixa lento', ef: { elem: 'frio', lentidao: 0.5 } }] },
  tiro_explosivo: { nome: 'Tiro Explosivo', classe: 'cacadora', asc: 'atiradora', nivel: 12, icone: '✸', tipo: 'projetil', elem: 'fogo',
    mult: 2.0, custo: 24, tempo: 0.55, vel: 42, qtd: 1, spread: 10, alcance: 30, raioHit: 0.9, explode: 4, cor: '#ff9040', modelo: 'flecha',
    desc: 'Flecha que explode em chamas ao atingir.',
    apr: { desc: '+25% raio de explosão', ef: { raio: 1.25 } },
    mods: [{ nome: 'Fragmentação', desc: '+2 flechas', ef: { qtd: 2 } }, { nome: 'Incendiar', desc: 'Queima os inimigos', ef: { queimar: 1.0 } }] },
  saraivada: { nome: 'Saraivada', classe: 'cacadora', asc: 'atiradora', nivel: 20, icone: '⫸', tipo: 'projetil', elem: 'fisico',
    mult: 1.1, custo: 30, cd: 4, tempo: 0.5, vel: 55, qtd: 9, spread: 60, alcance: 32, raioHit: 0.8, perfura: true, cor: '#fff6d0', modelo: 'flecha',
    desc: 'Nove flechas perfurantes em um arco largo.',
    apr: { desc: '+4 flechas', ef: { qtd: 4 } },
    mods: [{ nome: 'Foco', desc: '+40% dano, arco menor', ef: { mult: 1.4, spreadMul: 0.5 } }, { nome: 'Sem Pausa', desc: 'Sem recarga', ef: { cd: 0 } }] },
  passo_sombrio: { nome: 'Passo Sombrio', classe: 'cacadora', asc: 'sombra', nivel: 12, icone: '◐', tipo: 'teleporte', elem: 'veneno',
    mult: 1.8, cd: 4, tempo: 0.1, alcance: 15, raio: 4, cor: '#9a5cff',
    desc: 'Teleporta-se pelas sombras e explode em veneno ao chegar.',
    apr: { desc: '+30% raio', ef: { raio: 1.3 } },
    mods: [{ nome: 'Névoa Tóxica', desc: 'Envenena intensamente', ef: { queimar: 1.5 } }, { nome: 'Passo Fantasma', desc: '-40% de recarga', ef: { cd: 0.6 } }] },
  veneno_mortal: { nome: 'Dardo Mortal', classe: 'cacadora', asc: 'sombra', nivel: 20, icone: '☣', tipo: 'projetil', elem: 'veneno',
    mult: 1.1, custo: 14, tempo: 0.42, vel: 50, qtd: 3, spread: 18, alcance: 30, raioHit: 0.8, perfura: true, queimar: 1.6, cor: '#7cff5a', modelo: 'dardo',
    desc: 'Dardos que perfuram e envenenam fortemente.',
    apr: { desc: '+2 dardos', ef: { qtd: 2 } },
    mods: [{ nome: 'Toxina', desc: '+60% dano de veneno ao longo do tempo', ef: { queimar: 2.6 } }, { nome: 'Peste', desc: 'Explode ao atingir', ef: { explode: 2.5 } }] },

  // ---------------- FEITICEIRA ----------------
  faisca: { nome: 'Faísca', classe: 'feiticeira', secao: 'basico', nivel: 1, icone: '✧', tipo: 'projetil', elem: 'raio',
    mult: 0.85, gera: 7, tempo: 0.42, vel: 38, qtd: 1, spread: 14, alcance: 26, raioHit: 0.9, cor: '#9fdcff', modelo: 'orbe', luz: true,
    desc: 'Dispara uma faísca elétrica. Gera Mana.',
    apr: { desc: '+1 faísca', ef: { qtd: 1 } },
    mods: [{ nome: 'Arco Voltaico', desc: 'Salta para mais 2 inimigos', ef: { cadeias: 2 } }, { nome: 'Sobrecarga', desc: '+35% de dano', ef: { mult: 1.35 } }] },
  fragmento_gelo: { nome: 'Fragmentos de Gelo', classe: 'feiticeira', secao: 'basico', nivel: 3, icone: '❄', tipo: 'projetil', elem: 'frio',
    mult: 0.6, gera: 8, tempo: 0.45, vel: 40, qtd: 3, spread: 18, alcance: 24, raioHit: 0.8, lentidao: 0.3, cor: '#bff0ff', modelo: 'cristal',
    desc: 'Três fragmentos de gelo que deixam o alvo lento. Gera Mana.',
    apr: { desc: '+2 fragmentos', ef: { qtd: 2 } },
    mods: [{ nome: 'Gelo Profundo', desc: 'Lentidão muito maior', ef: { lentidao: 0.65 } }, { nome: 'Estilhaços', desc: 'Atravessa inimigos', ef: { perfura: true } }] },
  bola_fogo: { nome: 'Bola de Fogo', classe: 'feiticeira', secao: 'nucleo', nivel: 4, icone: '☀', tipo: 'projetil', elem: 'fogo',
    mult: 1.65, custo: 18, tempo: 0.55, vel: 30, qtd: 1, spread: 15, alcance: 28, raioHit: 1.1, explode: 3.2, cor: '#ff7a2a', modelo: 'orbe', luz: true,
    desc: 'Lança uma esfera flamejante que explode ao impacto.',
    apr: { desc: '+30% raio de explosão', ef: { raio: 1.3 } },
    mods: [{ nome: 'Combustão Lenta', desc: 'Queima os inimigos', ef: { queimar: 1.0 } }, { nome: 'Bolas Gêmeas', desc: '+1 bola de fogo', ef: { qtd: 1 } }] },
  corrente_eletrica: { nome: 'Corrente Elétrica', classe: 'feiticeira', secao: 'nucleo', nivel: 6, icone: 'ϟ', tipo: 'corrente', elem: 'raio',
    mult: 1.35, custo: 16, tempo: 0.45, alcance: 18, cadeias: 4, saltoAlc: 9, cor: '#c8e8ff',
    desc: 'Um raio que salta entre vários inimigos.',
    apr: { desc: '+2 saltos', ef: { cadeias: 2 } },
    mods: [{ nome: 'Tempestade', desc: '+4 saltos', ef: { cadeias: 4 } }, { nome: 'Alta Voltagem', desc: '+40% de dano', ef: { mult: 1.4 } }] },
  teleporte: { nome: 'Teleporte', classe: 'feiticeira', secao: 'defensivo', nivel: 8, icone: '◎', tipo: 'teleporte', elem: 'raio',
    mult: 0.7, cd: 5, tempo: 0.1, alcance: 15, raio: 3.5, cor: '#a8c8ff',
    desc: 'Teleporta-se para o local, liberando uma descarga elétrica.',
    apr: { desc: '-25% de recarga', ef: { cd: 0.75 } },
    mods: [{ nome: 'Descarga', desc: '+100% de dano', ef: { mult: 2 } }, { nome: 'Salto Arcano', desc: '-35% de recarga', ef: { cd: 0.65 } }] },
  nova_glacial: { nome: 'Nova Glacial', classe: 'feiticeira', secao: 'defensivo', nivel: 10, icone: '✻', tipo: 'nova', elem: 'frio',
    mult: 1.2, custo: 12, cd: 6, tempo: 0.4, raio: 7, pulsos: 1, lentidao: 0.75, cor: '#bfeaff',
    desc: 'Explosão de gelo ao redor, congelando quase por completo os inimigos.',
    apr: { desc: '+30% raio', ef: { raio: 1.3 } },
    mods: [{ nome: 'Zero Absoluto', desc: '+60% dano', ef: { mult: 1.6 } }, { nome: 'Inverno', desc: '-40% recarga', ef: { cd: 0.6 } }] },
  meteoro: { nome: 'Meteoro', classe: 'feiticeira', secao: 'maestria', nivel: 14, icone: '☄', tipo: 'area', elem: 'fogo',
    mult: 3.2, custo: 35, tempo: 0.6, alcance: 18, raio: 5.5, pulsos: 1, atraso: 0.9, queimar: 0.6, cor: '#ff6a1a', meteoro: true,
    desc: 'Invoca um meteoro que cai após um breve atraso.',
    apr: { desc: '+25% raio', ef: { raio: 1.25 } },
    mods: [{ nome: 'Chuva de Meteoros', desc: '+2 meteoros', ef: { qtd: 2 } }, { nome: 'Núcleo Derretido', desc: '+50% dano', ef: { mult: 1.5 } }] },
  orbe_arcano: { nome: 'Orbe Arcano', classe: 'feiticeira', secao: 'maestria', nivel: 18, icone: '◉', tipo: 'projetil', elem: 'raio',
    mult: 0.55, custo: 28, tempo: 0.55, vel: 11, qtd: 1, spread: 20, alcance: 30, raioHit: 2.4, perfura: true, multiHit: 0.22, cor: '#c890ff', modelo: 'orbeGrande', luz: true,
    desc: 'Um orbe lento que atinge repetidamente tudo que atravessa.',
    apr: { desc: '+30% tamanho', ef: { raioHitMul: 1.3 } },
    mods: [{ nome: 'Orbes Gêmeos', desc: '+1 orbe', ef: { qtd: 1 } }, { nome: 'Implosão', desc: 'Explode ao final (raio 6)', ef: { explode: 6 } }] },
  inferno: { nome: 'Inferno', classe: 'feiticeira', secao: 'supremo', nivel: 24, icone: '♨', tipo: 'chuva', elem: 'fogo', unico: true,
    mult: 1.7, cd: 45, tempo: 0.7, alcance: 18, raio: 3.8, qtd: 20, espalhar: 10, duracao: 3, queimar: 0.8, cor: '#ff5010', meteoro: true,
    desc: 'Pilares de fogo irrompem em toda a área durante 3 segundos.',
    apr: { desc: '-20% de recarga', ef: { cd: 0.8 } },
    mods: [{ nome: 'Apocalipse', desc: '+10 pilares', ef: { qtd: 10 } }, { nome: 'Chama Azul', desc: '+40% dano', ef: { mult: 1.4 } }] },
  chuva_fogo: { nome: 'Chuva de Fogo', classe: 'feiticeira', asc: 'piromante', nivel: 12, icone: '♆', tipo: 'area', elem: 'fogo',
    mult: 0.6, custo: 28, cd: 3, tempo: 0.5, alcance: 18, raio: 5.5, pulsos: 8, intervalo: 0.3, atraso: 0.2, queimar: 0.5, cor: '#ff7020', flechas: true,
    desc: 'Gotas de fogo caem sobre a área repetidamente.',
    apr: { desc: '+3 ondas', ef: { pulsos: 3 } },
    mods: [{ nome: 'Tempestade Ígnea', desc: '+30% raio', ef: { raio: 1.3 } }, { nome: 'Chamas Vorazes', desc: '+40% dano', ef: { mult: 1.4 } }] },
  avatar_fenix: { nome: 'Avatar da Fênix', classe: 'feiticeira', asc: 'piromante', nivel: 20, icone: '♅', tipo: 'buff', elem: 'fogo',
    cd: 35, tempo: 0.4, cor: '#ff8a20', buff: { danoPct: 50, aura: 1, regenVidaPct: 2, dur: 12 },
    desc: '+50% dano, regenera vida e queima tudo ao redor por 12s.',
    apr: { desc: '+30% duração', ef: { dur: 1.3 } },
    mods: [{ nome: 'Renascer', desc: 'Cura 40% da vida', ef: { cura: 0.4 } }, { nome: 'Labareda', desc: '-30% recarga', ef: { cd: 0.7 } }] },
  erguer_esqueletos: { nome: 'Erguer Esqueletos', classe: 'feiticeira', asc: 'necromante', nivel: 12, icone: '☗', tipo: 'invocar', elem: 'fisico',
    mult: 0.9, custo: 25, cd: 1.5, tempo: 0.5, qtd: 2, maxLacaios: 6, cor: '#e8e0c8',
    desc: 'Ergue esqueletos guerreiros que lutam por você (máx. 6).',
    apr: { desc: '+1 esqueleto por conjuração', ef: { qtd: 1 } },
    mods: [{ nome: 'Legião', desc: '+3 lacaios máximos', ef: { maxLacaios: 3 } }, { nome: 'Guerreiros de Elite', desc: '+60% dano dos lacaios', ef: { mult: 1.6 } }] },
  lanca_ossos: { nome: 'Lança de Ossos', classe: 'feiticeira', asc: 'necromante', nivel: 20, icone: '⟶', tipo: 'projetil', elem: 'fisico',
    mult: 2.3, custo: 22, tempo: 0.5, vel: 55, qtd: 1, spread: 10, alcance: 34, raioHit: 1.0, perfura: true, cor: '#efe6cc', modelo: 'lanca',
    desc: 'Lança de osso que atravessa todos os inimigos.',
    apr: { desc: '+25% dano', ef: { mult: 1.25 } },
    mods: [{ nome: 'Ossada', desc: '+2 lanças', ef: { qtd: 2 } }, { nome: 'Medula', desc: '+20% chance de crítico', ef: { crit: 20 } }] },
};

// passivas da árvore (por seção)
const PASSIVAS = [
  { id: 'p_forca', secao: 'basico', nome: 'Força Bruta', desc: '+5% de dano por rank', max: 3, stats: { danoPct: 5 } },
  { id: 'p_const', secao: 'basico', nome: 'Constituição', desc: '+5% de vida por rank', max: 3, stats: { vidaPct: 5 } },
  { id: 'p_prec', secao: 'nucleo', nome: 'Precisão', desc: '+2% chance de crítico por rank', max: 3, stats: { critChance: 2 } },
  { id: 'p_impeto', secao: 'nucleo', nome: 'Ímpeto', desc: '+4% velocidade de ataque por rank', max: 3, stats: { velAtaque: 4 } },
  { id: 'p_couraca', secao: 'defensivo', nome: 'Couraça', desc: '+10% armadura por rank', max: 3, stats: { armaduraPct: 10 } },
  { id: 'p_resil', secao: 'defensivo', nome: 'Resiliência', desc: '+5% em todas as resistências por rank', max: 3, stats: { resTodas: 5 } },
  { id: 'p_vigor', secao: 'defensivo', nome: 'Vigor', desc: '+30% de regeneração de vida dos itens por rank', max: 3, stats: { regenVidaMais: 30 } },
  { id: 'p_brut', secao: 'maestria', nome: 'Brutalidade', desc: '+12% dano crítico por rank', max: 3, stats: { danoCrit: 12 } },
  { id: 'p_ampl', secao: 'maestria', nome: 'Amplitude', desc: '+7% área de efeito por rank', max: 3, stats: { area: 7 } },
  { id: 'p_fluxo', secao: 'maestria', nome: 'Fluxo', desc: '+25% de regeneração de recurso dos itens por rank', max: 3, stats: { regenRecPct: 25 } },
  { id: 'p_sup1', secao: 'supremo', nome: 'Determinação', desc: '+8% redução de recarga por rank', max: 3, stats: { recarga: 8 } },
  { id: 'p_sup2', secao: 'supremo', nome: 'Celeridade', desc: '+4% velocidade de movimento por rank', max: 3, stats: { velMov: 4 } },
];

const CHAVES = {
  guerreiro: [
    { id: 'k_g1', nome: 'Sangue de Gigante', desc: '+25% vida e +15% dano', stats: { vidaPct: 25, danoPct: 15 } },
    { id: 'k_g2', nome: 'Lâmina Implacável', desc: '+25% vel. ataque e +10% chance de crítico', stats: { velAtaque: 25, critChance: 10 } },
  ],
  cacadora: [
    { id: 'k_c1', nome: 'Precisão Mortal', desc: '+15% chance e +60% dano crítico', stats: { critChance: 15, danoCrit: 60 } },
    { id: 'k_c2', nome: 'Saraivada Eterna', desc: '+1 projétil e +15% dano', stats: { projeteis: 1, danoPct: 15 } },
  ],
  feiticeira: [
    { id: 'k_f1', nome: 'Arcano Instável', desc: '+45% dano, -15% vida', stats: { danoPct: 45, vidaPct: -15 } },
    { id: 'k_f2', nome: 'Coração de Gelo', desc: '20% de redução de dano e +20% resistências', stats: { redDano: 20, resTodas: 20 } },
  ],
};

// ------------------------------------------------------------
// Itens
// ------------------------------------------------------------
const RARIDADES = {
  normal: { nome: 'Normal', cor: '#c8c8c8', afixos: [0, 0] },
  magico: { nome: 'Mágico', cor: '#8888ff', afixos: [1, 2] },
  raro: { nome: 'Raro', cor: '#ffff77', afixos: [3, 6] },
  unico: { nome: 'Único', cor: '#af6025', afixos: [0, 0] },
};

const SLOTS = {
  arma: { nome: 'Arma', grupo: 'arma' }, offhand: { nome: 'Mão Secundária', grupo: 'armadura' },
  elmo: { nome: 'Elmo', grupo: 'armadura' }, peitoral: { nome: 'Peitoral', grupo: 'armadura' },
  luvas: { nome: 'Luvas', grupo: 'armadura' }, botas: { nome: 'Botas', grupo: 'armadura' },
  cinto: { nome: 'Cinto', grupo: 'armadura' }, amuleto: { nome: 'Amuleto', grupo: 'joia' },
  anel1: { nome: 'Anel', grupo: 'joia' }, anel2: { nome: 'Anel', grupo: 'joia' },
};

// bases: [ilvl mínimo, nome]
const BASES = {
  machado: { slot: 'arma', classe: 'guerreiro', tipo: 'Machado', nomes: [[1, 'Machado Enferrujado'], [10, 'Machado de Guerra'], [25, 'Machado do Carrasco'], [42, 'Machado Rúnico'], [60, 'Ceifador Abissal']], vel: 1.0 },
  arco: { slot: 'arma', classe: 'cacadora', tipo: 'Arco', nomes: [[1, 'Arco Curto'], [10, 'Arco de Teixo'], [25, 'Arco Composto'], [42, 'Arco do Caçador Real'], [60, 'Arco do Eclipse']], vel: 1.1 },
  cajado: { slot: 'arma', classe: 'feiticeira', tipo: 'Cajado', nomes: [[1, 'Cajado Torto'], [10, 'Cajado de Carvalho'], [25, 'Cajado Serpentino'], [42, 'Cajado Arcano'], [60, 'Cetro do Vazio']], vel: 1.05 },
  escudo: { slot: 'offhand', classe: 'guerreiro', tipo: 'Escudo', nomes: [[1, 'Broquel'], [12, 'Escudo de Torre'], [30, 'Égide de Bronze'], [50, 'Baluarte Rúnico']], arm: 1.3, implicito: { bloqueio: 8 } },
  aljava: { slot: 'offhand', classe: 'cacadora', tipo: 'Aljava', nomes: [[1, 'Aljava Simples'], [12, 'Aljava Emplumada'], [30, 'Aljava Serrilhada'], [50, 'Aljava Espectral']], arm: 0, implicito: { danoPct: 8 } },
  orbe: { slot: 'offhand', classe: 'feiticeira', tipo: 'Orbe', nomes: [[1, 'Orbe de Vidro'], [12, 'Orbe de Quartzo'], [30, 'Orbe Tempestuoso'], [50, 'Coração Estelar']], arm: 0, implicito: { recursoMax: 15 } },
  elmo: { slot: 'elmo', tipo: 'Elmo', nomes: [[1, 'Capuz de Couro'], [12, 'Elmo de Ferro'], [28, 'Elmo de Cavaleiro'], [45, 'Elmo Rúnico'], [62, 'Coroa do Abismo']], arm: 1.0 },
  peitoral: { slot: 'peitoral', tipo: 'Peitoral', nomes: [[1, 'Túnica Acolchoada'], [12, 'Cota de Malha'], [28, 'Couraça de Placas'], [45, 'Armadura Rúnica'], [62, 'Carapaça do Vazio']], arm: 1.7 },
  luvas: { slot: 'luvas', tipo: 'Luvas', nomes: [[1, 'Luvas de Couro'], [12, 'Manoplas de Ferro'], [28, 'Garras de Aço'], [45, 'Manoplas Rúnicas']], arm: 0.7 },
  botas: { slot: 'botas', tipo: 'Botas', nomes: [[1, 'Sandálias'], [12, 'Botas de Couro'], [28, 'Grevas de Aço'], [45, 'Botas Rúnicas']], arm: 0.8 },
  cinto: { slot: 'cinto', tipo: 'Cinto', nomes: [[1, 'Faixa de Corda'], [15, 'Cinto de Couro'], [35, 'Cinturão Pesado'], [55, 'Cinto do Titã']], arm: 0, implicito: { vida: 12 } },
  amuleto: { slot: 'amuleto', tipo: 'Amuleto', nomes: [[1, 'Amuleto de Osso'], [15, 'Amuleto de Jade'], [35, 'Amuleto de Âmbar'], [55, 'Amuleto Ônix']], arm: 0, implicito: { atributos: 6 } },
  anel: { slot: 'anel', tipo: 'Anel', nomes: [[1, 'Anel de Ferro'], [15, 'Anel de Prata'], [35, 'Anel de Ouro'], [55, 'Anel de Opala']], arm: 0, implicito: { resTodas: 5 } },
};

// stats legíveis
const STAT_NOMES = {
  vida: v => `+${v} de Vida Máxima`, vidaPct: v => `+${v}% de Vida Máxima`, recursoMax: v => `+${v} de Recurso Máximo`,
  armadura: v => `+${v} de Armadura`, armaduraPct: v => `+${v}% de Armadura`,
  danoFlat: v => `+${v} de Dano Físico à Arma`, danoPct: v => `+${v}% de Dano`, danoFisico: v => `+${v}% de Dano Físico`,
  danoFogo: v => `+${v}% de Dano de Fogo`, danoFrio: v => `+${v}% de Dano de Frio`, danoRaio: v => `+${v}% de Dano de Raio`, danoVeneno: v => `+${v}% de Dano de Veneno`,
  danoDot: v => `+${v}% de Dano ao Longo do Tempo`, danoElite: v => `+${v}% de Dano contra Raros e Chefes`, danoBasico: v => `+${v}% de Dano de Habilidades Básicas`,
  velAtaque: v => `+${v}% de Velocidade de Ataque`, critChance: v => `+${v}% de Chance de Crítico`, danoCrit: v => `+${v}% de Dano Crítico`,
  resFogo: v => `+${v}% de Resistência a Fogo`, resFrio: v => `+${v}% de Resistência a Frio`, resRaio: v => `+${v}% de Resistência a Raio`, resVeneno: v => `+${v}% de Resistência a Veneno`, resTodas: v => `+${v}% em Todas as Resistências`,
  velMov: v => `+${v}% de Velocidade de Movimento`, roubo: v => `${v}% do Dano Causado Roubado como Vida`, regenVida: v => `+${v} de Vida Regenerada por Segundo`, regenVidaPct: v => `Regenera ${v}% da Vida por Segundo`,
  regenRecPct: v => `+${v}% de Regeneração de Recurso`, regenVidaMais: v => `+${v}% de Regeneração de Vida dos Itens`, forca: v => `+${v} de Força`, destreza: v => `+${v} de Destreza`, inteligencia: v => `+${v} de Inteligência`, atributos: v => `+${v} em Todos os Atributos`,
  recarga: v => `${v}% de Redução de Recarga`, area: v => `+${v}% de Área de Efeito`, bloqueio: v => `+${v}% de Chance de Bloqueio`, esquiva: v => `+${v}% de Chance de Esquiva`,
  vidaPorGolpe: v => `+${v} de Vida por Golpe`, projeteis: v => `+${v} Projétil(eis) Adicional(is)`, redDano: v => `${v}% de Redução de Dano`, espinhos: v => `Reflete ${v}% do Dano Corpo a Corpo`,
  ranks: v => `+${v} Rank em Todas as Habilidades Aprendidas`, efPocao: v => `+${v}% de Efeito dos Frascos`, curaAbate: v => `Cura ${v}% da Vida ao Abater`, lacaios: v => `+${v} Lacaio(s) Máximo(s)`,
  lacaioVida: v => `Lacaios têm +${v}% de Vida`, lacaioDano: v => `Lacaios causam +${v}% de Dano`, achado: v => `+${v}% de Raridade de Itens Encontrados`,
};

// afixos: g = grupos de slot onde podem aparecer; f(ilvl) => [min,max]
const AFIXOS = [
  { id: 'vida', tipo: 'pre', adj: 'Vital', stat: 'vida', slots: ['elmo', 'peitoral', 'luvas', 'botas', 'cinto', 'offhand', 'amuleto', 'anel'], f: il => [6 + il * 0.9, 12 + il * 1.6] },
  { id: 'arm', tipo: 'pre', adj: 'Imponente', stat: 'armadura', slots: ['elmo', 'peitoral', 'luvas', 'botas', 'cinto', 'offhand'], f: il => [5 + il * 1.2, 12 + il * 2.4] },
  { id: 'armPct', tipo: 'pre', adj: 'Inabalável', stat: 'armaduraPct', slots: ['elmo', 'peitoral', 'offhand'], f: il => [8 + il * 0.2, 18 + il * 0.45] },
  { id: 'dFlat', tipo: 'pre', adj: 'Cruel', stat: 'danoFlat', slots: ['arma', 'luvas', 'anel', 'amuleto'], f: il => [1 + il * 0.35, 3 + il * 0.75] },
  { id: 'dPct', tipo: 'pre', adj: 'Feroz', stat: 'danoPct', slots: ['arma', 'amuleto', 'anel', 'offhand', 'luvas'], f: il => [6 + il * 0.25, 14 + il * 0.6] },
  { id: 'dFogo', tipo: 'pre', adj: 'Ardente', stat: 'danoFogo', slots: ['arma', 'amuleto', 'anel', 'offhand'], f: il => [8 + il * 0.3, 18 + il * 0.7] },
  { id: 'dFrio', tipo: 'pre', adj: 'Glacial', stat: 'danoFrio', slots: ['arma', 'amuleto', 'anel', 'offhand'], f: il => [8 + il * 0.3, 18 + il * 0.7] },
  { id: 'dRaio', tipo: 'pre', adj: 'Fulminante', stat: 'danoRaio', slots: ['arma', 'amuleto', 'anel', 'offhand'], f: il => [8 + il * 0.3, 18 + il * 0.7] },
  { id: 'dVen', tipo: 'pre', adj: 'Pestilente', stat: 'danoVeneno', slots: ['arma', 'amuleto', 'anel', 'offhand'], f: il => [8 + il * 0.3, 18 + il * 0.7] },
  { id: 'dFis', tipo: 'pre', adj: 'Brutal', stat: 'danoFisico', slots: ['arma', 'amuleto', 'offhand'], f: il => [8 + il * 0.3, 18 + il * 0.7] },
  { id: 'rec', tipo: 'pre', adj: 'Sublime', stat: 'recursoMax', slots: ['elmo', 'amuleto', 'anel', 'offhand'], f: il => [5 + il * 0.15, 10 + il * 0.3] },
  { id: 'dElite', tipo: 'pre', adj: 'Implacável', stat: 'danoElite', slots: ['arma', 'luvas', 'anel'], f: il => [6 + il * 0.2, 14 + il * 0.45] },
  { id: 'vAtq', tipo: 'suf', nome: 'da Celeridade', stat: 'velAtaque', slots: ['arma', 'luvas', 'anel', 'amuleto'], f: il => [4 + il * 0.08, 8 + il * 0.18] },
  { id: 'crit', tipo: 'suf', nome: 'da Precisão', stat: 'critChance', slots: ['arma', 'luvas', 'amuleto', 'anel', 'elmo'], f: il => [2 + il * 0.06, 5 + il * 0.12] },
  { id: 'dCrit', tipo: 'suf', nome: 'da Ruína', stat: 'danoCrit', slots: ['arma', 'amuleto', 'luvas', 'anel'], f: il => [10 + il * 0.3, 20 + il * 0.7] },
  { id: 'rFogo', tipo: 'suf', nome: 'da Salamandra', stat: 'resFogo', slots: ['elmo', 'peitoral', 'luvas', 'botas', 'cinto', 'offhand', 'anel', 'amuleto'], f: il => [6 + il * 0.2, 14 + il * 0.45] },
  { id: 'rFrio', tipo: 'suf', nome: 'do Urso Polar', stat: 'resFrio', slots: ['elmo', 'peitoral', 'luvas', 'botas', 'cinto', 'offhand', 'anel', 'amuleto'], f: il => [6 + il * 0.2, 14 + il * 0.45] },
  { id: 'rRaio', tipo: 'suf', nome: 'da Tempestade', stat: 'resRaio', slots: ['elmo', 'peitoral', 'luvas', 'botas', 'cinto', 'offhand', 'anel', 'amuleto'], f: il => [6 + il * 0.2, 14 + il * 0.45] },
  { id: 'rVen', tipo: 'suf', nome: 'da Serpente', stat: 'resVeneno', slots: ['elmo', 'peitoral', 'luvas', 'botas', 'cinto', 'offhand', 'anel', 'amuleto'], f: il => [6 + il * 0.2, 14 + il * 0.45] },
  { id: 'rTodas', tipo: 'suf', nome: 'do Prisma', stat: 'resTodas', slots: ['amuleto', 'anel', 'peitoral'], f: il => [3 + il * 0.08, 6 + il * 0.18] },
  { id: 'vMov', tipo: 'suf', nome: 'do Guepardo', stat: 'velMov', slots: ['botas'], f: il => [6 + il * 0.08, 12 + il * 0.15] },
  { id: 'roubo', tipo: 'suf', nome: 'do Vampiro', stat: 'roubo', slots: ['arma', 'anel', 'amuleto', 'luvas'], f: il => [0.6 + il * 0.02, 1.5 + il * 0.04] },
  { id: 'regen', tipo: 'suf', nome: 'do Troll', stat: 'regenVida', slots: ['elmo', 'peitoral', 'cinto', 'anel', 'amuleto'], f: il => [1 + il * 0.15, 3 + il * 0.35] },
  { id: 'for', tipo: 'suf', nome: 'do Urso', stat: 'forca', slots: ['elmo', 'peitoral', 'luvas', 'botas', 'cinto', 'amuleto', 'anel', 'arma'], f: il => [3 + il * 0.2, 7 + il * 0.4] },
  { id: 'des', tipo: 'suf', nome: 'da Raposa', stat: 'destreza', slots: ['elmo', 'peitoral', 'luvas', 'botas', 'cinto', 'amuleto', 'anel', 'arma'], f: il => [3 + il * 0.2, 7 + il * 0.4] },
  { id: 'int', tipo: 'suf', nome: 'da Coruja', stat: 'inteligencia', slots: ['elmo', 'peitoral', 'luvas', 'botas', 'cinto', 'amuleto', 'anel', 'arma'], f: il => [3 + il * 0.2, 7 + il * 0.4] },
  { id: 'cdr', tipo: 'suf', nome: 'do Relojoeiro', stat: 'recarga', slots: ['elmo', 'amuleto', 'anel', 'offhand'], f: il => [3 + il * 0.05, 6 + il * 0.1] },
  { id: 'area', tipo: 'suf', nome: 'da Vastidão', stat: 'area', slots: ['amuleto', 'offhand', 'elmo'], f: il => [5 + il * 0.1, 10 + il * 0.2] },
  { id: 'vpg', tipo: 'suf', nome: 'da Sanguessuga', stat: 'vidaPorGolpe', slots: ['arma', 'luvas', 'anel'], f: il => [1 + il * 0.1, 3 + il * 0.22] },
  { id: 'achado', tipo: 'suf', nome: 'do Saqueador', stat: 'achado', slots: ['elmo', 'botas', 'anel', 'amuleto', 'luvas'], f: il => [6 + il * 0.1, 14 + il * 0.25] },
  { id: 'regRec', tipo: 'suf', nome: 'do Fluxo', stat: 'regenRecPct', slots: ['elmo', 'amuleto', 'anel', 'offhand', 'arma'], f: il => [15 + il * 0.3, 30 + il * 0.6] },
];

const NOMES_RAROS_A = ['Agouro', 'Presságio', 'Lamento', 'Tormenta', 'Carniça', 'Ruína', 'Vigília', 'Abismo', 'Cinza', 'Sombra', 'Cripta', 'Fúria', 'Maldição', 'Eclipse', 'Uivo', 'Espinho', 'Brasa', 'Geada', 'Trovão', 'Sina', 'Pesar', 'Martírio', 'Sangue', 'Osso'];
const NOMES_RAROS_B = ['Sombrio', 'do Corvo', 'da Morte', 'Eterno', 'Sangrento', 'da Tempestade', 'Voraz', 'Gélido', 'Ardente', 'Profano', 'do Lobo', 'Ancestral', 'da Aurora', 'Silencioso', 'do Dragão', 'Faminto', 'da Víbora', 'Quebrado', 'Solene', 'da Coroa'];

const UNICOS = [
  { nome: 'Coroa do Rei Afogado', base: 'elmo', ilvl: 1, sabor: 'O mar devolve o que lhe é roubado.', stats: { vida: 40, resFrio: 30, regenVida: 4, projeteis: 1 } },
  { nome: 'Garras de Morgrath', base: 'luvas', ilvl: 10, sabor: 'Ainda cheiram a terra molhada e sangue.', stats: { velAtaque: 18, roubo: 4, forca: 25, danoFlat: 8 } },
  { nome: 'Passos do Vendaval', base: 'botas', ilvl: 5, sabor: 'Ninguém alcança quem caminha com o vento.', stats: { velMov: 30, esquiva: 12, resRaio: 25 } },
  { nome: 'Coração de Vorthak', base: 'amuleto', ilvl: 35, sabor: 'Ainda pulsa. Ainda arde.', stats: { danoFogo: 60, vidaPct: 10, resFogo: 40, area: 15 } },
  { nome: 'Anel do Eclipse', base: 'anel', ilvl: 15, sabor: 'Quando a luz morre, a sombra reina.', stats: { danoPct: 30, critChance: 10, resTodas: -10 } },
  { nome: 'Égide Coral', base: 'escudo', ilvl: 5, sabor: 'Forjada no fundo do recife.', stats: { bloqueio: 18, armaduraPct: 60, vida: 50, espinhos: 50 } },
  { nome: 'Fúria do Titã', base: 'machado', ilvl: 20, sabor: 'Os gigantes não pedem permissão.', stats: { danoFlat: 25, danoCrit: 60, danoFisico: 40, velAtaque: -5 } },
  { nome: 'Sussurro da Tecelã', base: 'arco', ilvl: 20, sabor: 'Cada fio é uma sentença.', stats: { projeteis: 2, danoVeneno: 50, danoDot: 40, velAtaque: 10 } },
  { nome: 'Cajado do Inverno Eterno', base: 'cajado', ilvl: 20, sabor: 'O frio não perdoa. Nem esquece.', stats: { danoFrio: 70, danoPct: 20, recursoMax: 30, area: 15 } },
  { nome: 'Manto das Cinzas', base: 'peitoral', ilvl: 25, sabor: 'Vestido pelos que caminharam pelo fogo.', stats: { vida: 120, resFogo: 35, redDano: 8, armadura: 120 } },
  { nome: 'Cinto do Glutão', base: 'cinto', ilvl: 8, sabor: 'Nunca se está satisfeito.', stats: { vida: 80, efPocao: 60, regenVida: 6 } },
  { nome: 'Olho do Abismo', base: 'amuleto', ilvl: 40, sabor: 'Olhe por tempo demais e ele olhará de volta.', stats: { ranks: 1, danoPct: 15, achado: 25 } },
  { nome: 'Lamento da Viúva', base: 'anel', ilvl: 30, sabor: 'Seu choro ecoa entre os mortos.', stats: { lacaios: 2, lacaioDano: 50, inteligencia: 30, curaAbate: 2 } },
];

// Jóias (estilo Diablo IV): efeito depende do grupo do slot
const GEMAS = {
  rubi: { nome: 'Rubi', cor: '#e0203a', arma: ['danoFisico', 12], armadura: ['vidaPct', 3], joia: ['resFogo', 10] },
  safira: { nome: 'Safira', cor: '#2a6cf0', arma: ['danoCrit', 12], armadura: ['redDano', 1.5], joia: ['resFrio', 10] },
  esmeralda: { nome: 'Esmeralda', cor: '#23c060', arma: ['critChance', 2.5], armadura: ['destreza', 6], joia: ['resVeneno', 10] },
  topazio: { nome: 'Topázio', cor: '#f0b020', arma: ['danoBasico', 15], armadura: ['armaduraPct', 6], joia: ['resRaio', 10] },
  ametista: { nome: 'Ametista', cor: '#a040e0', arma: ['danoDot', 15], armadura: ['regenVida', 3], joia: ['recursoMax', 6] },
  diamante: { nome: 'Diamante', cor: '#e8f4ff', arma: ['danoPct', 8], armadura: ['atributos', 4], joia: ['resTodas', 4] },
  caveira: { nome: 'Caveira', cor: '#d8d0b8', arma: ['vidaPorGolpe', 4], armadura: ['vida', 15], joia: ['armadura', 40] },
};
const QUALIDADES = [
  { nome: 'Lascada', mult: 1, ilvl: 1 }, { nome: 'Comum', mult: 1.8, ilvl: 12 },
  { nome: 'Impecável', mult: 2.8, ilvl: 28 }, { nome: 'Real', mult: 4.2, ilvl: 45 },
];

// ------------------------------------------------------------
// Biomas, inimigos e zonas
// ------------------------------------------------------------
const BIOMAS = {
  litoral: { exposicao: 0.62, nome: 'Litoral', ceu: 0x8fb4c8, neblina: 0x9ab8c4, nDens: 0.010, sol: 0xfff0d8, solI: 2.2, amb: 0x8aa0b0, ambI: 0.75,
    chao: 0xc8b88a, caminho: 0xd8c898, encosta: 0x7a8a5a, pico: 0x6a6e66, agua: 0x2a6a80, aguaNivel: -0.6, decor: ['palmeira', 'rocha', 'concha', 'arbusto'], relevo: 14 },
  pantano: { exposicao: 1.0, nome: 'Pântano', ceu: 0x5a6a50, neblina: 0x56604a, nDens: 0.022, sol: 0xd8e0b0, solI: 1.3, amb: 0x506040, ambI: 0.8,
    chao: 0x4a5230, caminho: 0x5e5a38, encosta: 0x3a4228, pico: 0x4a4a3a, agua: 0x2a3a20, aguaNivel: 0.15, decor: ['arvoreMorta', 'junco', 'rocha', 'cogumelo'], relevo: 10 },
  floresta: { exposicao: 1.0, nome: 'Floresta', ceu: 0x4a5a6a, neblina: 0x3a4a48, nDens: 0.02, sol: 0xe8d8b8, solI: 1.5, amb: 0x405048, ambI: 0.7,
    chao: 0x3a5228, caminho: 0x5a4a32, encosta: 0x2e4020, pico: 0x5a5a52, agua: 0x203a40, aguaNivel: -3, decor: ['pinheiro', 'pinheiro', 'arvore', 'rocha', 'arbusto', 'cogumelo'], relevo: 16 },
  caverna: { exposicao: 1.15, nome: 'Caverna', ceu: 0x0a0a12, neblina: 0x0c0c16, nDens: 0.03, sol: 0x9aa0d0, solI: 1.3, amb: 0x4a4060, ambI: 1.5,
    chao: 0x4a4448, caminho: 0x5a5256, encosta: 0x34303a, pico: 0x24222a, agua: 0x102030, aguaNivel: -3, decor: ['cristal', 'estalagmite', 'rocha', 'cristal'], relevo: 18, escuro: true },
  deserto: { exposicao: 0.6, nome: 'Deserto', ceu: 0xe0c090, neblina: 0xd8b888, nDens: 0.011, sol: 0xffe8c0, solI: 2.5, amb: 0xc0a070, ambI: 0.7,
    chao: 0xd0a868, caminho: 0xc09858, encosta: 0xb07848, pico: 0x8a6040, agua: 0x2a6a80, aguaNivel: -5, decor: ['pilar', 'rocha', 'cacto', 'ossada'], relevo: 15 },
  gelo: { exposicao: 0.42, nome: 'Picos Gelados', ceu: 0x9ab0c8, neblina: 0xa8b8cc, nDens: 0.009, sol: 0xf0f4ff, solI: 2.0, amb: 0x90a0c0, ambI: 0.85,
    chao: 0xdce4ec, caminho: 0xb8c0c8, encosta: 0x8890a0, pico: 0xf4f8ff, agua: 0x5a8aa8, aguaNivel: -3, decor: ['pinheiroNeve', 'rocha', 'cristalGelo', 'pinheiroNeve'], relevo: 22 },
  vulcao: { exposicao: 0.85, nome: 'Terras Vulcânicas', ceu: 0x2a1410, neblina: 0x3a1c12, nDens: 0.02, sol: 0xffa060, solI: 1.3, amb: 0x5a2a1a, ambI: 1.2,
    chao: 0x30282a, caminho: 0x3e3230, encosta: 0x221a1c, pico: 0x2e2022, agua: 0xff5010, aguaNivel: -0.4, lava: true, decor: ['rochaVulc', 'obelisco', 'arvoreQueimada', 'rochaVulc'], relevo: 16 },
};

// tipos de IA: melee, rapido, ranged, caster, saltador, invocador, explosivo
const INIMIGOS = {
  // litoral
  afogado: { modelo3d: 'esq_afogado', tinta3d: 0x8ac0b0, nome: 'Afogado', bioma: 'litoral', rig: 'humanoide', escala: 1.05, vida: 1.1, dano: 1.0, vel: 3.2, ia: 'melee', alcance: 1.8,
    visual: { pele: 0x6a8a7a, roupa: 0x3a4a48, extra: 'algas', corcunda: true, olhos: 0x9fffd0 } },
  caranguejo: { nome: 'Caranguejo Rochoso', bioma: 'litoral', rig: 'caranguejo', escala: 1.0, vida: 0.8, dano: 0.8, vel: 5.2, ia: 'rapido', alcance: 1.6,
    visual: { casca: 0xa04a2a, garra: 0xc06a3a, olhos: 0x111111 } },
  harpia: { modelo3d: 'aguia', nome: 'Harpia das Marés', bioma: 'litoral', rig: 'voador', escala: 0.95, vida: 0.7, dano: 0.9, vel: 4.2, ia: 'ranged', alcance: 14, proj: { cor: '#6fd8ff', vel: 18, elem: 'frio' },
    visual: { corpo: 0x6a7a8a, asa: 0x4a5a6a, olhos: 0x6fd8ff } },
  // pântano
  sapo: { nome: 'Sapo Pestilento', bioma: 'pantano', rig: 'sapo', escala: 1.1, vida: 0.9, dano: 1.0, vel: 3.6, ia: 'saltador', alcance: 1.8, elem: 'veneno',
    visual: { pele: 0x5a7a2a, barriga: 0xc0b060, olhos: 0xffd020 } },
  lodoso: { modelo3d: 'lodo', nome: 'Lodoso', bioma: 'pantano', rig: 'slime', escala: 1.2, vida: 1.4, dano: 0.9, vel: 2.4, ia: 'melee', alcance: 1.8, elem: 'veneno', divide: true,
    visual: { cor: 0x5a6a20, olhos: 0xd0ff40 } },
  bruxa: { modelo3d: 'esq_mago', tinta3d: 0xa8d890, nome: 'Bruxa do Brejo', bioma: 'pantano', rig: 'humanoide', escala: 0.95, vida: 0.8, dano: 1.2, vel: 3.0, ia: 'caster', alcance: 15, elem: 'veneno',
    visual: { pele: 0x7a8a5a, roupa: 0x2a3020, capuz: true, cajado: true, olhos: 0xb0ff40 } },
  // floresta
  lobo: { modelo3d: 'lobo', tinta3d: 0x7a8aa8, nome: 'Lobo Espectral', bioma: 'floresta', rig: 'quadrupede', escala: 1.0, vida: 0.75, dano: 0.9, vel: 6.4, ia: 'rapido', alcance: 1.9,
    visual: { pelo: 0x5a6070, olhos: 0x8ff0ff, cauda: true, focinho: true, espectral: true } },
  ent: { nome: 'Ent Corrompido', bioma: 'floresta', rig: 'humanoide', escala: 1.7, vida: 2.6, dano: 1.6, vel: 2.2, ia: 'melee', alcance: 2.8,
    visual: { pele: 0x4a3a28, roupa: 0x3a2a1a, galhos: true, olhos: 0xff8030, bracosLongos: true } },
  arqueiro: { modelo3d: 'esq_arqueiro', nome: 'Arqueiro Esquelético', bioma: 'floresta', rig: 'humanoide', escala: 1.0, vida: 0.7, dano: 1.0, vel: 3.4, ia: 'ranged', alcance: 16, proj: { cor: '#e8e0c8', vel: 26, elem: 'fisico', modelo: 'flecha' },
    visual: { pele: 0xd8d0b8, roupa: 0x4a3a30, esqueleto: true, arco: true, olhos: 0xff4020 } },
  // caverna
  aranha: { nome: 'Aranha de Cristal', bioma: 'caverna', rig: 'aranha', escala: 1.0, vida: 0.8, dano: 1.0, vel: 5.5, ia: 'rapido', alcance: 1.8, elem: 'veneno',
    visual: { corpo: 0x2a2440, cristal: 0x8a60ff, olhos: 0xff40a0 } },
  morcego: { modelo3d: 'morcego', nome: 'Morcego Sanguessuga', bioma: 'caverna', rig: 'voador', escala: 0.75, vida: 0.5, dano: 0.7, vel: 6.5, ia: 'rapido', alcance: 1.6, vamp: true,
    visual: { corpo: 0x3a2028, asa: 0x2a1418, olhos: 0xff2020, morcego: true } },
  golem: { nome: 'Golem de Pedra', bioma: 'caverna', rig: 'humanoide', escala: 1.6, vida: 3.0, dano: 1.7, vel: 2.0, ia: 'melee', alcance: 2.6,
    visual: { pele: 0x5a5560, roupa: 0x4a4550, pedra: true, olhos: 0x60c0ff, cristais: 0x60c0ff } },
  // deserto
  escorpiao: { nome: 'Escorpião Gigante', bioma: 'deserto', rig: 'aranha', escala: 1.2, vida: 1.2, dano: 1.2, vel: 4.4, ia: 'melee', alcance: 2.4, elem: 'veneno',
    visual: { corpo: 0x8a5a28, cristal: 0x5a3a18, olhos: 0x111111, ferrao: true, pinças: true } },
  mumia: { modelo3d: 'esq_guerreiro', tinta3d: 0xf0dcb0, nome: 'Guardião Ressecado', bioma: 'deserto', rig: 'humanoide', escala: 1.1, vida: 1.5, dano: 1.1, vel: 2.8, ia: 'melee', alcance: 2.0,
    visual: { pele: 0xc8b890, roupa: 0xa89870, faixas: true, olhos: 0x40d0ff, lanca: true } },
  cultista: { modelo3d: 'esq_mago', tinta3d: 0xff9a70, nome: 'Cultista Solar', bioma: 'deserto', rig: 'humanoide', escala: 1.0, vida: 0.8, dano: 1.3, vel: 3.2, ia: 'caster', alcance: 16, elem: 'fogo',
    visual: { pele: 0xa07050, roupa: 0x8a2a1a, capuz: true, cajado: true, olhos: 0xffc040 } },
  // gelo
  yeti: { nome: 'Yeti', bioma: 'gelo', rig: 'humanoide', escala: 1.6, vida: 2.4, dano: 1.6, vel: 3.2, ia: 'saltador', alcance: 2.6,
    visual: { pele: 0xe8eef4, roupa: 0xd0dae4, peludo: true, olhos: 0x40a0ff, bracosLongos: true, chifres: true } },
  elemental: { nome: 'Elemental de Gelo', bioma: 'gelo', rig: 'elemental', escala: 1.1, vida: 1.0, dano: 1.2, vel: 3.0, ia: 'ranged', alcance: 15, elem: 'frio', proj: { cor: '#a0e8ff', vel: 20, elem: 'frio', modelo: 'cristal' },
    visual: { cor: 0x8ad0ff, olhos: 0xffffff } },
  loboGelo: { modelo3d: 'lobo', tinta3d: 0xf2f8ff, nome: 'Lobo Glacial', bioma: 'gelo', rig: 'quadrupede', escala: 1.1, vida: 0.9, dano: 1.0, vel: 6.2, ia: 'rapido', alcance: 1.9, elem: 'frio',
    visual: { pelo: 0xdce8f0, olhos: 0x40c0ff, cauda: true, focinho: true } },
  // vulcão
  diabrete: { nome: 'Diabrete de Magma', bioma: 'vulcao', rig: 'humanoide', escala: 0.75, vida: 0.6, dano: 1.0, vel: 5.4, ia: 'explosivo', alcance: 1.6, elem: 'fogo',
    visual: { pele: 0x8a2a10, roupa: 0x3a1008, chifres: true, olhos: 0xffe040, brilho: 0xff5010, cauda: true } },
  salamandra: { modelo3d: 'dragonete', nome: 'Dragonete Ígneo', bioma: 'vulcao', rig: 'quadrupede', escala: 1.1, vida: 1.0, dano: 1.1, vel: 4.2, ia: 'ranged', alcance: 13, elem: 'fogo', proj: { cor: '#ff7020', vel: 20, elem: 'fogo', modelo: 'orbe' },
    visual: { pelo: 0x3a2018, olhos: 0xffe040, cauda: true, reptil: true, brilho: 0xff5010 } },
  demonio: { nome: 'Demônio Ígneo', bioma: 'vulcao', rig: 'humanoide', escala: 1.5, vida: 2.4, dano: 1.7, vel: 3.0, ia: 'melee', alcance: 2.6, elem: 'fogo',
    visual: { pele: 0x4a1a14, roupa: 0x1a0a08, chifres: true, olhos: 0xffd020, brilho: 0xff4010, asas: true, bracosLongos: true } },
};

const CHEFES = {
  mareth: { nome: 'Mareth, a Rainha Coral', bioma: 'litoral', rig: 'chefeCaranguejo', escala: 2.6, vida: 22, dano: 1.4, vel: 3.8,
    habilidades: ['golpeArea', 'radial', 'investida', 'invocar'], invoca: 'caranguejo', elem: 'frio', cor: 0xd05a3a },
  vhorra: { modelo3d: 'lodo', tinta3d: 0x9aa060, nome: 'Mãe Lodo Vhorra', bioma: 'pantano', rig: 'chefeSlime', escala: 2.8, vida: 26, dano: 1.4, vel: 2.6,
    habilidades: ['chuva', 'nova', 'invocar', 'radial'], invoca: 'lodoso', elem: 'veneno', cor: 0x6a7a20 },
  morgrath: { nome: 'Morgrath, o Cervo Ancião', bioma: 'floresta', rig: 'chefeCervo', escala: 2.4, vida: 28, dano: 1.5, vel: 5.0,
    habilidades: ['investida', 'golpeArea', 'nova', 'invocar', 'chuva'], invoca: 'lobo', elem: 'fisico', cor: 0x4a3a2a },
  tecela: { nome: 'A Tecelã Abissal', bioma: 'caverna', rig: 'chefeAranha', escala: 2.8, vida: 30, dano: 1.5, vel: 4.6,
    habilidades: ['radial', 'investida', 'invocar', 'chuva', 'golpeArea'], invoca: 'aranha', elem: 'veneno', cor: 0x3a2a5a },
  tuskar: { modelo3d: 'esq_rei', tinta3d: 0xffe0a0, nome: 'Tuskar, o Rei Sepultado', bioma: 'deserto', rig: 'chefeEscaravelho', escala: 2.8, vida: 32, dano: 1.6, vel: 3.8,
    habilidades: ['golpeArea', 'chuva', 'radial', 'investida', 'nova', 'invocar'], invoca: 'escorpiao', elem: 'fogo', cor: 0x2a6a6a },
  hrimfang: { modelo3d: 'dragao_gelo', nome: 'Hrimfang, o Dragão Glacial', bioma: 'gelo', rig: 'chefeWyrm', escala: 2.4, vida: 34, dano: 1.7, vel: 4.0,
    habilidades: ['radial', 'chuva', 'nova', 'investida', 'golpeArea'], invoca: 'elemental', elem: 'frio', cor: 0x8ac0e0 },
  vorthak: { nome: 'Vorthak, Senhor das Cinzas', bioma: 'vulcao', rig: 'chefeDemonio', escala: 3.0, vida: 40, dano: 1.8, vel: 3.6,
    habilidades: ['golpeArea', 'chuva', 'radial', 'nova', 'investida', 'invocar'], invoca: 'diabrete', elem: 'fogo', cor: 0x5a1a10 },
};

const MODS_RAROS = [
  { id: 'veloz', nome: 'Veloz' }, { id: 'robusto', nome: 'Robusto' }, { id: 'brutal', nome: 'Brutal' },
  { id: 'vampirico', nome: 'Vampírico' }, { id: 'explosivo', nome: 'Explosivo' }, { id: 'gelido', nome: 'Gélido' },
];
const NOMES_RAROS_MOB = ['Grath', 'Vel\'kor', 'Myrr', 'Oskarn', 'Thul', 'Zerek', 'Ulma', 'Brakka', 'Sorn', 'Ixil', 'Morva', 'Kesh', 'Drun', 'Yrsa', 'Haldor', 'Vexa'];
const TITULOS_RAROS_MOB = ['o Faminto', 'a Pútrida', 'o Implacável', 'a Silenciosa', 'o Devorador', 'a Maldita', 'o Sanguinário', 'a Eterna', 'o Quebra-Ossos', 'a Tecelã de Dor'];

const ZONAS = [
  // ---------------- Ato I ----------------
  { id: 'z1', entrada: null, saida: 'c1', ato: 1, nome: 'Litoral Naufragado', nivel: 1, bioma: 'litoral', inimigos: ['afogado', 'caranguejo'], densidade: 0.75 },
  { id: 'z2', entrada: 'c1', saida: 'z2b', ato: 1, nome: 'Costa dos Ossos', nivel: 3, bioma: 'litoral', inimigos: ['afogado', 'caranguejo', 'harpia'] },
  { id: 'z2b', entrada: 'z2', saida: 'z3', ato: 1, nome: 'Grutas da Maré', nivel: 4, bioma: 'litoral', inimigos: ['caranguejo', 'afogado', 'morcego'], densidade: 1.05 },
  { id: 'z3', entrada: 'z2b', saida: 'z3b', ato: 1, nome: 'Recife da Rainha', nivel: 5, bioma: 'litoral', inimigos: ['caranguejo', 'harpia', 'afogado'], chefe: 'mareth' },
  { id: 'z3b', entrada: 'z3', saida: 'z4', ato: 1, nome: 'Cemitério dos Navios', nivel: 6, bioma: 'litoral', inimigos: ['afogado', 'harpia', 'bruxa'] },
  { id: 'z4', entrada: 'z3b', saida: 'z4b', ato: 1, nome: 'Brejo das Névoas', nivel: 7, bioma: 'pantano', inimigos: ['sapo', 'lodoso', 'bruxa'] },
  { id: 'z4b', entrada: 'z4', saida: 'z5', ato: 1, nome: 'Turfeiras Podres', nivel: 8, bioma: 'pantano', inimigos: ['lodoso', 'sapo', 'afogado'], densidade: 1.1 },
  { id: 'z5', entrada: 'z4b', saida: 'c2', ato: 1, nome: 'Charco Profundo', nivel: 9, bioma: 'pantano', inimigos: ['lodoso', 'bruxa', 'sapo'], chefe: 'vhorra' },
  // ---------------- Ato II ----------------
  { id: 'z6', entrada: 'c2', saida: 'z6b', ato: 2, nome: 'Floresta Uivante', nivel: 12, bioma: 'floresta', inimigos: ['lobo', 'arqueiro', 'ent'] },
  { id: 'z6b', entrada: 'z6', saida: 'z7', ato: 2, nome: 'Trilha dos Caçadores', nivel: 13, bioma: 'floresta', inimigos: ['arqueiro', 'lobo', 'bruxa'] },
  { id: 'z7', entrada: 'z6b', saida: 'z7b', ato: 2, nome: 'Bosque Ancestral', nivel: 15, bioma: 'floresta', inimigos: ['ent', 'lobo', 'arqueiro'], chefe: 'morgrath' },
  { id: 'z7b', entrada: 'z7', saida: 'z8', ato: 2, nome: 'Raízes Sombrias', nivel: 16, bioma: 'floresta', inimigos: ['ent', 'aranha', 'lobo'], densidade: 1.1 },
  { id: 'z8', entrada: 'z7b', saida: 'z8b', ato: 2, nome: 'Minas de Cristal', nivel: 18, bioma: 'caverna', inimigos: ['aranha', 'morcego', 'golem'] },
  { id: 'z8b', entrada: 'z8', saida: 'z8c', ato: 2, nome: 'Galerias Inundadas', nivel: 19, bioma: 'caverna', inimigos: ['golem', 'morcego', 'lodoso'] },
  { id: 'z8c', entrada: 'z8b', saida: 'z9', ato: 2, nome: 'Fenda Ecoante', nivel: 20, bioma: 'caverna', inimigos: ['aranha', 'golem', 'morcego'], densidade: 1.15 },
  { id: 'z9', entrada: 'z8c', saida: 'c3', ato: 2, nome: 'Ninho Abissal', nivel: 21, bioma: 'caverna', inimigos: ['aranha', 'golem', 'morcego'], chefe: 'tecela' },
  // ---------------- Ato III ----------------
  { id: 'z10', entrada: 'c3', saida: 'z10b', ato: 3, nome: 'Dunas Esquecidas', nivel: 24, bioma: 'deserto', inimigos: ['escorpiao', 'mumia', 'cultista'] },
  { id: 'z10b', entrada: 'z10', saida: 'z11', ato: 3, nome: 'Oásis Envenenado', nivel: 25, bioma: 'deserto', inimigos: ['escorpiao', 'cultista', 'sapo'] },
  { id: 'z11', entrada: 'z10b', saida: 'z11b', ato: 3, nome: 'Templo Soterrado', nivel: 27, bioma: 'deserto', inimigos: ['mumia', 'cultista', 'escorpiao'], chefe: 'tuskar' },
  { id: 'z11b', entrada: 'z11', saida: 'z12', ato: 3, nome: 'Necrópole dos Reis', nivel: 28, bioma: 'deserto', inimigos: ['mumia', 'cultista', 'arqueiro'], densidade: 1.1 },
  { id: 'z12', entrada: 'z11b', saida: 'z12b', ato: 3, nome: 'Picos Gélidos', nivel: 30, bioma: 'gelo', inimigos: ['yeti', 'loboGelo', 'elemental'] },
  { id: 'z12b', entrada: 'z12', saida: 'z13', ato: 3, nome: 'Desfiladeiro do Vento', nivel: 32, bioma: 'gelo', inimigos: ['loboGelo', 'yeti', 'harpia'] },
  { id: 'z13', entrada: 'z12b', saida: 'z13b', ato: 3, nome: 'Fortaleza de Gelo', nivel: 34, bioma: 'gelo', inimigos: ['elemental', 'yeti', 'loboGelo'], chefe: 'hrimfang' },
  { id: 'z13b', entrada: 'z13', saida: 'z14', ato: 3, nome: 'Geleira Rachada', nivel: 36, bioma: 'gelo', inimigos: ['elemental', 'loboGelo', 'golem'], densidade: 1.1 },
  { id: 'z14', entrada: 'z13b', saida: 'z14b', ato: 3, nome: 'Caldeira Ardente', nivel: 38, bioma: 'vulcao', inimigos: ['diabrete', 'salamandra', 'demonio'] },
  { id: 'z14b', entrada: 'z14', saida: 'z15', ato: 3, nome: 'Rios de Magma', nivel: 40, bioma: 'vulcao', inimigos: ['salamandra', 'diabrete', 'demonio'], densidade: 1.15 },
  { id: 'z15', entrada: 'z14b', saida: 'c3', ato: 3, nome: 'Trono de Cinzas', nivel: 42, bioma: 'vulcao', inimigos: ['demonio', 'diabrete', 'salamandra'], chefe: 'vorthak' },
];

const MODS_MAPA = [
  { id: 'mVida', nome: 'Monstros têm +40% de vida', quant: 8 },
  { id: 'mDano', nome: 'Monstros causam +30% de dano', quant: 8 },
  { id: 'mVel', nome: 'Monstros são 20% mais rápidos', quant: 6 },
  { id: 'mRaros', nome: 'Mais monstros raros', quant: 12 },
  { id: 'mDens', nome: '+30% de monstros', quant: 14 },
  { id: 'mChefe', nome: 'O chefe tem +50% de vida', quant: 6 },
  { id: 'mRes', nome: 'Jogador tem -15% de resistências', quant: 7 },
];

const BIOMA_INIMIGOS = {};
for (const [id, d] of Object.entries(INIMIGOS)) (BIOMA_INIMIGOS[d.bioma] = BIOMA_INIMIGOS[d.bioma] || []).push(id);
const BIOMA_CHEFE = {};
for (const [id, d] of Object.entries(CHEFES)) BIOMA_CHEFE[d.bioma] = id;

// escalonamento
function escalaVida(l) { return (1 + 0.16 * (l - 1)) * Math.pow(1.05, l - 1); }
function escalaDano(l) { return (1 + 0.11 * (l - 1)) * Math.pow(1.035, l - 1); }
function xpProximo(l) { return Math.round(90 * Math.pow(l, 1.9) + 60 * l); }
function xpInimigo(l) { return Math.round((6 + l * 2.2) * Math.pow(1.03, l)); }


// ------------------------------------------------------------
// Cidades, NPCs e missões
// ------------------------------------------------------------
const CIDADES = {
  c1: { id: 'c1', cidade: true, ato: 1, nome: 'Porto Cinzento', nivel: 2, bioma: 'litoral', saida: 'z2', entrada: 'z1', npcs: ['isolde', 'bram', 'nessa'],
    paleta: { parede: 0xc8bca0, madeira: 0x4a3420, telhado: 0x5a3a30, pedra: 0x8a8478, pano: 0x2a4a6a }, desc: 'Um porto de pescadores fortificado contra os afogados.' },
  c2: { id: 'c2', cidade: true, ato: 2, nome: 'Fortim de Carvalho', nivel: 11, bioma: 'floresta', saida: 'z6', entrada: 'z5', npcs: ['corvin', 'maelis'],
    paleta: { parede: 0x8a7a5a, madeira: 0x3a2a18, telhado: 0x2e3a22, pedra: 0x6a6a60, pano: 0x5a2a1a }, desc: 'Uma paliçada de guardiões no coração da floresta.' },
  c3: { id: 'c3', cidade: true, ato: 3, nome: 'Oásis de Âmbar', nivel: 23, bioma: 'deserto', saida: 'z10', entrada: 'z9', npcs: ['zahra', 'duran'],
    paleta: { parede: 0xd8b888, madeira: 0x5a3a20, telhado: 0xb06a3a, pedra: 0xb09870, pano: 0x8a1a2a }, desc: 'Uma cidade de mercadores à sombra das palmeiras.' },
};
const TODAS_AREAS = {};
for (const z of ZONAS) TODAS_AREAS[z.id] = z;
for (const c of Object.values(CIDADES)) TODAS_AREAS[c.id] = c;

const NPCS = {
  isolde: { modelo3d: 'npc_cavaleira', nome: 'Capitã Isolde', titulo: 'Comandante da Guarda', visual: { pele: 0xd8a888, roupa: 0x2a3a5a, corPeito: 0x8a8f99, ombreira: 0x9aa0aa, capa: 0x1a2a4a, espada: 0.9, cabelo: 0x8a5a2a, olhos: 0x202020, bota: 0x2a2018 },
    fala: 'O mar trouxe mais mortos esta noite. Se você sobreviveu ao naufrágio, talvez sobreviva ao que vem depois.' },
  bram: { modelo3d: 'npc_barbaro', tinta3d: 0xd8d0c0, nome: 'Bram, o Pescador', titulo: 'Velho do cais', visual: { pele: 0xc89878, roupa: 0x4a5a3a, chapeu: true, lanca: true, cabelo: 0xb0b0b0, olhos: 0x202020, bota: 0x3a2818 },
    fala: 'Antigamente a gente pescava peixe. Hoje pesca é osso.' },
  nessa: { modelo3d: 'npc_maga2', tinta3d: 0xf0c8e0, nome: 'Nessa', titulo: 'Curandeira', visual: { pele: 0xe0b498, roupa: 0x5a2a4a, capuz: true, cajado: true, olhos: 0x90ff90, saia: 0x4a2a3a, bota: 0x2a1a20 },
    fala: 'Descanse um pouco. Suas feridas e seus frascos estão restaurados enquanto estiver na cidade.' },
  corvin: { modelo3d: 'npc_ladina', tinta3d: 0xc0e0b0, nome: 'Corvin', titulo: 'Guarda-Florestal', visual: { pele: 0xb08060, roupa: 0x3a4a2a, capuz: true, arco: true, aljava: true, capa: 0x2a3a1a, olhos: 0x202020, bota: 0x2a2018 },
    fala: 'Os lobos não uivam mais para a lua. Uivam para algo que acordou sob as raízes.' },
  maelis: { modelo3d: 'npc_maga', tinta3d: 0xd0c0ff, nome: 'Maelis', titulo: 'Erudita do Arcano', visual: { pele: 0xe8c0a0, roupa: 0x3a2a5a, chapeu: true, cajado: true, saia: 0x2a2048, olhos: 0xc0a0ff, bota: 0x201828 },
    fala: 'Os cristais das minas cantam numa frequência que não deveria existir.' },
  zahra: { modelo3d: 'npc_nobre', tinta3d: 0xffe0a0, nome: 'Sultana Zahra', titulo: 'Senhora do Oásis', visual: { pele: 0x9a6a48, roupa: 0x8a5a1a, corPeito: 0xd8b040, coroa: 0xd8b040, capa: 0x6a1a1a, saia: 0x8a2a1a, olhos: 0x202020, bota: 0x4a2a18 },
    fala: 'O deserto guarda reis antigos. Alguns deles ainda não sabem que morreram.' },
  duran: { modelo3d: 'npc_ferreiro', nome: 'Duran', titulo: 'Ferreiro', visual: { pele: 0xa07050, roupa: 0x3a2a1a, corPeito: 0x4a3a2a, ombreira: 0x5a5a60, machado: 1.2, olhos: 0x202020, luva: 0x2a1a10, bota: 0x2a1a10 },
    fala: 'Traga-me material digno e eu forjo algo que corte até o fogo de Vorthak.' },
};

// tipos: zona (atravessar até a próxima área), coletar (itens de missão de um inimigo),
// chefe (derrotar), objeto (encontrar e ativar no mapa), raro (abater N monstros raros)
const MISSOES = [
  { id: 'a1_costa', ato: 1, npc: 'isolde', tipo: 'zona', zona: 'z2', nome: 'A Costa dos Ossos', texto: 'Os afogados chegam pela Costa dos Ossos. Atravesse-a e abra caminho até o Recife da Rainha.', recompensa: { xp: 0.35, item: 'magico' } },
  { id: 'a1_perolas', ato: 1, npc: 'bram', tipo: 'coletar', zonas: ['z2', 'z3'], inimigo: 'caranguejo', item: 'Pérola Negra', qtd: 6, chance: 0.35, nome: 'Pérolas Negras', texto: 'Os caranguejos rochosos engolem pérolas negras dos naufrágios. Traga seis e eu lhe dou algo que encontrei no fundo do mar.', recompensa: { xp: 0.3, gema: 1 } },
  { id: 'a1_rainha', ato: 1, npc: 'isolde', tipo: 'chefe', chefe: 'mareth', req: 'a1_costa', nome: 'A Rainha Coral', texto: 'Mareth, a Rainha Coral, comanda os mortos do recife. Mate-a e o porto terá paz.', recompensa: { xp: 0.6, ponto: 1 } },
  { id: 'a1_altar', ato: 1, npc: 'nessa', tipo: 'objeto', zona: 'z4', objeto: 'Altar Afogado', nome: 'O Altar Afogado', texto: 'Há um altar antigo no Brejo das Névoas. Toque-o e liberte a bênção presa nele.', recompensa: { xp: 0.4, ponto: 1 } },
  { id: 'a1_vhorra', ato: 1, npc: 'isolde', tipo: 'chefe', chefe: 'vhorra', req: 'a1_rainha', nome: 'A Mãe do Lodo', texto: 'Algo no Charco Profundo pare os lodosos. Encontre a origem e destrua-a.', recompensa: { xp: 0.7, ponto: 1, item: 'raro' } },
  { id: 'a2_uivos', ato: 2, npc: 'corvin', tipo: 'raro', zona: 'z6', qtd: 2, nome: 'Matilha Alfa', texto: 'Duas criaturas lideram as matilhas da Floresta Uivante. Abata dois monstros raros por lá.', recompensa: { xp: 0.4, item: 'raro' } },
  { id: 'a2_presas', ato: 2, npc: 'corvin', tipo: 'coletar', zonas: ['z6', 'z7'], inimigo: 'lobo', item: 'Presa Espectral', qtd: 6, chance: 0.35, nome: 'Presas Espectrais', texto: 'As presas dos lobos espectrais afastam os mortos. Preciso de seis para a paliçada.', recompensa: { xp: 0.35, gema: 1 } },
  { id: 'a2_cervo', ato: 2, npc: 'maelis', tipo: 'chefe', chefe: 'morgrath', nome: 'O Cervo Ancião', texto: 'Morgrath era o guardião da floresta. Agora está corrompido. Liberte-o com a morte.', recompensa: { xp: 0.6, ponto: 1 } },
  { id: 'a2_cristal', ato: 2, npc: 'maelis', tipo: 'objeto', zona: 'z8', objeto: 'Cristal Ressonante', nome: 'O Cristal Ressonante', texto: 'No fundo das Minas de Cristal pulsa um cristal ressonante. Ative-o para que eu possa estudá-lo.', recompensa: { xp: 0.45, ponto: 1 } },
  { id: 'a2_tecela', ato: 2, npc: 'corvin', tipo: 'chefe', chefe: 'tecela', req: 'a2_cervo', nome: 'A Tecelã Abissal', texto: 'As aranhas vêm de um ninho abaixo das minas. A mãe delas precisa morrer.', recompensa: { xp: 0.7, ponto: 1, item: 'raro' } },
  { id: 'a3_dunas', ato: 3, npc: 'zahra', tipo: 'zona', zona: 'z10', nome: 'As Dunas Esquecidas', texto: 'Atravesse as Dunas Esquecidas e encontre a entrada do Templo Soterrado.', recompensa: { xp: 0.35, item: 'magico' } },
  { id: 'a3_ferroes', ato: 3, npc: 'duran', tipo: 'coletar', zonas: ['z10', 'z11'], inimigo: 'escorpiao', item: 'Ferrão de Âmbar', qtd: 6, chance: 0.35, nome: 'Ferrões de Âmbar', texto: 'O ferrão dos escorpiões gigantes endurece como âmbar. Com seis deles eu forjo uma arma de verdade.', recompensa: { xp: 0.4, item: 'raro', arma: true } },
  { id: 'a3_rei', ato: 3, npc: 'zahra', tipo: 'chefe', chefe: 'tuskar', nome: 'O Rei Sepultado', texto: 'Tuskar, o rei sepultado, despertou no Templo Soterrado com seu exército de ossos. Devolva-o ao sono eterno.', recompensa: { xp: 0.6, ponto: 1 } },
  { id: 'a3_yetis', ato: 3, npc: 'duran', tipo: 'raro', zona: 'z12', qtd: 3, nome: 'Feras dos Picos', texto: 'Três feras lendárias rondam os Picos Gélidos. Abata-as.', recompensa: { xp: 0.45, gema: 2 } },
  { id: 'a3_wyrm', ato: 3, npc: 'zahra', tipo: 'chefe', chefe: 'hrimfang', req: 'a3_rei', nome: 'O Dragão Glacial', texto: 'Hrimfang congela as caravanas que cruzam os picos. Derrote-o.', recompensa: { xp: 0.7, ponto: 1 } },
  { id: 'a3_selo', ato: 3, npc: 'duran', tipo: 'objeto', zona: 'z14', objeto: 'Selo Ígneo', nome: 'O Selo Ígneo', texto: 'Um selo ígneo contém o poder de Vorthak na Caldeira Ardente. Quebre-o para enfraquecê-lo.', recompensa: { xp: 0.5, ponto: 1 } },
  { id: 'a3_vorthak', ato: 3, npc: 'zahra', tipo: 'chefe', chefe: 'vorthak', req: 'a3_wyrm', nome: 'O Senhor das Cinzas', texto: 'Vorthak queima o mundo a partir de seu trono. Este é o fim da jornada, ou o começo de outra.', recompensa: { xp: 1.0, ponto: 2, item: 'unico' } },
];
MISSOES.push(
  { id: 'a1_grutas', ato: 1, npc: 'bram', tipo: 'raro', zona: 'z2b', qtd: 2, nome: 'Ecos nas Grutas', texto: 'Algo grande se esconde nas Grutas da Maré e assusta os peixes. Abata dois monstros raros por lá.', recompensa: { xp: 0.35, item: 'magico' } },
  { id: 'a1_navios', ato: 1, npc: 'nessa', tipo: 'zona', zona: 'z3b', nome: 'O Cemitério dos Navios', texto: 'Os cascos encalhados do Cemitério dos Navios guardam o caminho para o brejo. Atravesse-o.', recompensa: { xp: 0.4, gema: 1 } },
  { id: 'a2_trilha', ato: 2, npc: 'corvin', tipo: 'zona', zona: 'z6b', nome: 'A Trilha dos Caçadores', texto: 'Meus batedores sumiram na Trilha dos Caçadores. Percorra-a até o Bosque Ancestral.', recompensa: { xp: 0.4, item: 'magico' } },
  { id: 'a2_galerias', ato: 2, npc: 'maelis', tipo: 'raro', zona: 'z8b', qtd: 3, nome: 'Guardiões Submersos', texto: 'Golens despertaram nas Galerias Inundadas. Destrua três dos mais fortes.', recompensa: { xp: 0.45, gema: 2 } },
  { id: 'a3_necropole', ato: 3, npc: 'duran', tipo: 'raro', zona: 'z11b', qtd: 3, nome: 'Os Reis Esquecidos', texto: 'Antigos reis se erguem na Necrópole. Abata três deles e traga paz ao oásis.', recompensa: { xp: 0.45, item: 'raro' } },
  { id: 'a3_magma', ato: 3, npc: 'zahra', tipo: 'zona', zona: 'z14b', nome: 'Os Rios de Magma', texto: 'Só os Rios de Magma levam ao Trono de Cinzas. Atravesse-os.', recompensa: { xp: 0.5, ponto: 1 } },
);
const MISSAO_POR_ID = {}; for (const m of MISSOES) MISSAO_POR_ID[m.id] = m;
