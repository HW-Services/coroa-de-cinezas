// Copia os arquivos do jogo (pasta acima) para desktop/jogo, que vai dentro do executável
'use strict';
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..'), destino = path.join(__dirname, 'jogo');
fs.rmSync(destino, { recursive: true, force: true });
for (const item of ['index.html', 'js', 'modelos', 'audio', 'fontes']) fs.cpSync(path.join(raiz, item), path.join(destino, item), { recursive: true });
fs.rmSync(path.join(destino, 'js', 'vendor', 'three.pacote.fonte.js'), { force: true });
console.log('Jogo copiado para', destino);
