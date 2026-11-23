// Ponte segura entre a página do jogo e o processo principal
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// restaura os saves gravados em arquivo antes de qualquer script do jogo rodar
try {
  const salvos = ipcRenderer.sendSync('save:tudo') || {};
  for (const [k, v] of Object.entries(salvos)) { try { window.localStorage.setItem(k, v); } catch (e) { } }
} catch (e) { }

contextBridge.exposeInMainWorld('CDC_DESKTOP', {
  desktop: true,
  plataforma: process.platform,
  gravar: (chave, valor) => ipcRenderer.invoke('save:gravar', String(chave), valor == null ? null : String(valor)),
  steamInfo: () => ipcRenderer.invoke('steam:info'),
  conquista: (api) => ipcRenderer.invoke('steam:conquista', String(api)),
  ticketSteam: () => ipcRenderer.invoke('steam:ticket'),
  telaCheia: (sim) => ipcRenderer.invoke('janela:telaCheia', sim),
  sair: () => ipcRenderer.invoke('app:sair'),
});
