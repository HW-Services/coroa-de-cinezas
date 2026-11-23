// ============================================================
//  Coroa de Cinzas — versão desktop (Electron) para a Steam
//  - serve os arquivos do jogo pelo protocolo app:// (funciona offline)
//  - integra a Steam (overlay, conquistas, nome, ticket de login)
//  - salva os dados em arquivos na pasta do usuário (Steam Cloud)
// ============================================================
'use strict';
const { app, BrowserWindow, protocol, net, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const PASTA_JOGO = app.isPackaged ? path.join(process.resourcesPath, 'jogo') : path.join(__dirname, 'jogo');
const PASTA_SAVES = path.join(app.getPath('userData'), 'saves');

// ---------- Steam ----------
let steam = null, steamworks = null;
function lerAppId() {
  for (const f of [path.join(process.resourcesPath || '', 'steam_appid.txt'), path.join(__dirname, 'steam_appid.txt')]) {
    try { const n = parseInt(fs.readFileSync(f, 'utf8'), 10); if (n > 0) return n; } catch (e) { }
  }
  return 480; // Spacewar: app de testes da Valve
}
const APP_ID = parseInt(process.env.STEAM_APP_ID || '', 10) || lerAppId();
try {
  steamworks = require('steamworks.js');
  steam = steamworks.init(APP_ID);
  steamworks.electronEnableSteamOverlay();
  console.log('Steam conectada:', steam.localplayer.getName());
} catch (e) {
  console.log('Steam indisponível (jogando sem a Steam):', e && e.message);
  steam = null;
}

// ---------- protocolo app:// ----------
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

function caminhoSeguro(url) {
  const u = new URL(url);
  let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  if (!rel) rel = 'index.html';
  const abs = path.normalize(path.join(PASTA_JOGO, rel));
  if (!abs.startsWith(PASTA_JOGO)) return null; // nada fora da pasta do jogo
  return abs;
}

// ---------- saves (arquivos JSON; a pasta é sincronizada pelo Steam Cloud) ----------
const nomeArq = (chave) => path.join(PASTA_SAVES, chave.replace(/[^\w.-]/g, '_') + '.json');
ipcMain.on('save:tudo', (ev) => {
  const out = {};
  try {
    for (const f of fs.readdirSync(PASTA_SAVES)) {
      if (!f.endsWith('.json')) continue;
      try { const d = JSON.parse(fs.readFileSync(path.join(PASTA_SAVES, f), 'utf8')); if (d && typeof d.chave === 'string' && typeof d.valor === 'string') out[d.chave] = d.valor; } catch (e) { }
    }
  } catch (e) { }
  ev.returnValue = out;
});
ipcMain.handle('save:gravar', (ev, chave, valor) => {
  if (typeof chave !== 'string' || chave.length > 120) return false;
  fs.mkdirSync(PASTA_SAVES, { recursive: true });
  const arq = nomeArq(chave), tmp = arq + '.tmp';
  if (valor === null) { try { fs.unlinkSync(arq); } catch (e) { } return true; }
  if (typeof valor !== 'string' || valor.length > 8e6) return false;
  fs.writeFileSync(tmp, JSON.stringify({ chave, valor, em: Date.now() }));
  fs.renameSync(tmp, arq); // grava inteiro ou nada (sem arquivo corrompido)
  return true;
});

// ---------- Steam (para a página) ----------
ipcMain.handle('steam:info', () => {
  if (!steam) return null;
  try { const id = steam.localplayer.getSteamId(); return { nome: steam.localplayer.getName(), id: String(id.steamId64), appId: APP_ID }; } catch (e) { return null; }
});
ipcMain.handle('steam:conquista', (ev, api) => {
  if (!steam || typeof api !== 'string') return false;
  try { if (steam.achievement.isActivated(api)) return true; return steam.achievement.activate(api); } catch (e) { return false; }
});
ipcMain.handle('steam:ticket', async () => {
  if (!steam) return null;
  try { const t = await steam.auth.getAuthTicketForWebApi('coroa-de-cinzas'); return Buffer.from(t.getBytes()).toString('hex'); } catch (e) { return null; }
});
ipcMain.handle('app:sair', () => { app.quit(); });
ipcMain.handle('janela:telaCheia', (ev, sim) => { const w = BrowserWindow.fromWebContents(ev.sender); if (w) w.setFullScreen(sim == null ? !w.isFullScreen() : !!sim); return w ? w.isFullScreen() : false; });

// ---------- janela ----------
function criarJanela() {
  const w = new BrowserWindow({
    width: 1600, height: 900, minWidth: 1024, minHeight: 600, show: false, backgroundColor: '#0b0907',
    title: 'Coroa de Cinzas', icon: path.join(__dirname, 'icone.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  w.once('ready-to-show', () => { w.show(); if (!process.argv.includes('--janela')) w.setFullScreen(true); });
  w.webContents.on('before-input-event', (e, inp) => {
    if (inp.type === 'keyDown' && (inp.key === 'F11' || (inp.alt && inp.key === 'Enter'))) { w.setFullScreen(!w.isFullScreen()); e.preventDefault(); }
    if (inp.type === 'keyDown' && inp.key === 'F12' && !app.isPackaged) w.webContents.toggleDevTools();
  });
  // links externos abrem no navegador (ou no overlay da Steam)
  w.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  w.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url); } });
  w.loadURL('app://jogo/index.html');
  return w;
}

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('force_high_performance_gpu');

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const arq = caminhoSeguro(req.url);
    if (!arq || !fs.existsSync(arq)) return new Response('não encontrado', { status: 404 });
    return net.fetch(pathToFileURL(arq).toString());
  });
  criarJanela();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) criarJanela(); });
});
app.on('window-all-closed', () => app.quit());
