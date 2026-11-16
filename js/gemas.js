// ============================================================
//  Jóias empilháveis: jóias do mesmo tipo e da mesma qualidade
//  ocupam um único espaço (campo qtd).
// ============================================================
'use strict';

const MAX_PILHA_GEMA = 999;
IT.qtd = (it) => (it && it.tipo === 'gema' ? Math.max(1, it.qtd || 1) : 1);
IT.novaGema = (gema, q, qtd = 1) => ({ uid: IT.uid(), tipo: 'gema', gema, q, qtd, nome: GEMAS[gema].nome + ' ' + QUALIDADES[q].nome, raridade: 'gema' });

// guarda um item numa lista (inventário ou baú); jóias entram na pilha igual.
// Retorna o índice usado ou -1 se não couber.
J.guardar = function (lista, it) {
  if (!it) return -1;
  if (it.tipo === 'gema') {
    it.qtd = IT.qtd(it);
    const k = lista.findIndex(x => x && x !== it && x.tipo === 'gema' && x.gema === it.gema && x.q === it.q && IT.qtd(x) + it.qtd <= MAX_PILHA_GEMA);
    if (k >= 0) { lista[k].qtd = IT.qtd(lista[k]) + it.qtd; return k; }
  }
  const i = lista.indexOf(null); if (i < 0) return -1;
  lista[i] = it; return i;
};
J.inv_temPilha = (lista, gema, q) => lista.some(x => x && x.tipo === 'gema' && x.gema === gema && x.q === q);
// quantas jóias de um tipo/qualidade há na lista
J.contarGema = (lista, gema, q) => lista.reduce((s, x) => s + (x && x.tipo === 'gema' && x.gema === gema && x.q === q ? IT.qtd(x) : 0), 0);
// retira n jóias (de uma ou mais pilhas); devolve o índice da última pilha mexida
J.tirarGema = function (lista, gema, q, n) {
  let ult = -1;
  for (let i = 0; i < lista.length && n > 0; i++) {
    const x = lista[i]; if (!x || x.tipo !== 'gema' || x.gema !== gema || x.q !== q) continue;
    const t = Math.min(n, IT.qtd(x)); x.qtd = IT.qtd(x) - t; n -= t; ult = i;
    if (x.qtd <= 0) lista[i] = null;
  }
  return ult;
};
// junta pilhas espalhadas (saves antigos)
J.juntarGemas = function (lista) {
  if (!Array.isArray(lista)) return;
  for (let i = 0; i < lista.length; i++) {
    const x = lista[i]; if (!x || x.tipo !== 'gema') continue;
    x.qtd = IT.qtd(x);
    for (let k = i + 1; k < lista.length; k++) { const y = lista[k]; if (y && y.tipo === 'gema' && y.gema === x.gema && y.q === x.q) { x.qtd += IT.qtd(y); lista[k] = null; } }
  }
};
{
  const mig0 = J.migrarSave;
  J.migrarSave = function (p) { mig0(p); if (!p) return; J.juntarGemas(p.inv); J.juntarGemas(p.bau); };
  // quantidade na dica
  const d0 = IT.descreverItem;
  IT.descreverItem = function (it) {
    const h = d0(it);
    return it && it.tipo === 'gema' && IT.qtd(it) > 1 ? h + `<div class="tt-l" style="margin-top:4px">Quantidade: <b>${IT.qtd(it)}</b></div>` : h;
  };
  // número na célula
  const c0 = UI.celula;
  UI.celula = function (it, cls) {
    const d = c0(it, cls);
    if (it && it.tipo === 'gema' && IT.qtd(it) > 1) { const s = document.createElement('span'); s.className = 'pilha'; s.textContent = IT.qtd(it); d.appendChild(s); }
    return d;
  };
  const st = document.createElement('style');
  st.textContent = '.pilha{position:absolute;right:3px;bottom:1px;font-weight:800;font-size:12px;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000,0 0 2px #000;font-variant-numeric:tabular-nums;pointer-events:none}';
  document.head.appendChild(st);
}
UI.combinarGemas = () => { if (UI.evoluirTodas) UI.evoluirTodas(); };
