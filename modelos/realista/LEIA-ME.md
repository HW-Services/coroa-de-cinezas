# Modelos realistas (.glb)

Coloque aqui arquivos `.glb` para substituir o visual de monstros, chefes, NPCs ou das classes do jogador. Os modelos atuais continuam como reserva: o que não estiver no manifesto não muda.

## Passo a passo

1. Abra o **Inspetor de Modelos** (`ferramentas/inspetor.html`, no site: `…/coroa-de-cinezas/ferramentas/inspetor.html`) e solte o `.glb` nele. Se as animações vierem em arquivos separados, solte todos juntos.
2. O inspetor mostra:
   - tamanho, ossos e triângulos;
   - quais animações ele reconheceu (parado, andar, correr, ataque, morte…).

   Escolha o que substituir e copie o trecho gerado.
3. Copie os `.glb` para esta pasta e cole o trecho dentro de `"modelos": [ … ]` no `manifesto.json`.
4. Recarregue o jogo.

## Exemplo de manifesto

```json
{
  "modelos": [
    {
      "arquivo": "lobo_cinzento.glb",
      "monstros": ["lobo", "loboGelo"],
      "tamanho": 1.9,
      "clipes": { "idle": "Idle", "andar": "Walk", "correr": "Gallop", "golpe": "Bite", "morte": "Death", "dano": "Hit" }
    },
    {
      "arquivo": "cavaleiro.glb",
      "animacoes": ["Idle.glb", "Walking.glb", "Running.glb", "Sword Slash.glb", "Dying.glb"],
      "classes": ["guerreiro"],
      "altura": 1.85
    }
  ]
}
```

## Campos

| Campo | Para que serve |
|---|---|
| `arquivo` | O `.glb` com a malha (e, se tiver, as animações). |
| `animacoes` | Outros `.glb` só com animações, do **mesmo esqueleto** (ex.: Mixamo exporta uma animação por arquivo). O nome do arquivo vira o nome da animação. |
| `monstros` / `npcs` / `classes` | Quem passa a usar o modelo. Os nomes são as chaves de `js/data.js`: monstros e chefes (`lobo`, `arqueiro`, `vhorra`…), NPCs (`isolde`, `bram`…), classes (`guerreiro`, `cacadora`, `feiticeira`). |
| `altura` ou `tamanho` | Altura em metros (humanoides) ou a maior medida (criaturas). |
| `rotY` | Graus para girar, se o modelo olhar para o lado errado (frente do jogo = eixo +Z). |
| `clipes` | Nome de cada animação no arquivo. Sem ele, o jogo deduz pelos nomes (Idle, Walk, Run, Attack, Death, Hit…). Chaves: `idle`, `andar`, `correr`, `golpe`, `disparo`, `conjurar`, `erguer`, `morte`, `dano`, `esquiva`, `surgir`. |
| `voa` | Altura de voo (aves, morcegos). |
| `bote` | `true` para criaturas que avançam no ataque. |
| `metal`, `rugosidade` | Força valores de material (0 a 1), se o arquivo vier errado. |
| `manterTinta` | `true` para manter a tinta de cor que o jogo aplica a cada variante do monstro. |
| `ativo` | `false` desliga a entrada sem apagar. |

## O que o jogo faz com o modelo

- **Materiais:** mantém o material PBR do arquivo (cor, normal, rugosidade, metal, oclusão, emissão) e as extensões glTF (verniz, brilho de tecido, transmissão, iridescência).
- **Arquivos comprimidos:** aceita Draco, Meshopt e texturas KTX2/WebP.
- **Animação:**
  - mistura parado, andar e correr conforme a velocidade, sem o pé patinar no chão;
  - o ataque usa só o tronco quando o personagem está andando;
  - o corpo se inclina nas curvas, e a cabeça acompanha o jogador;
  - os pés pousam no relevo do terreno (IK) em humanoides;
  - quadrúpedes acompanham o declive com o corpo todo.
- **Esqueleto:** reconhece ossos com nomes comuns (Mixamo, Unreal, Blender/Rigify). Se os nomes forem diferentes, deduz pela forma do esqueleto.

## Onde conseguir modelos realistas

Confira sempre a licença: ela precisa permitir **uso comercial** (o jogo será vendido na Steam).

- **Mixamo** (Adobe, gratuito): personagens humanoides e centenas de animações. Exporte em FBX e converta para `.glb` no Blender.
- **Fab**, **Sketchfab** (filtro "Downloadable" + licença CC-BY ou comercial), **CGTrader**, **TurboSquid**: criaturas realistas prontas, várias já animadas.
- **Um artista 3D**: é o caminho para ter um estilo único. Peça a entrega em `.glb` com as animações da tabela de `clipes`.

## Otimizar antes de colocar no jogo

Modelos de loja costumam ser pesados. Com o Node.js instalado:

```bash
npx @gltf-transform/cli optimize entrada.glb saida.glb --compress draco --texture-compress webp --texture-size 2048
```

Isso reduz o arquivo e as texturas, geralmente de 5 a 10 vezes. Metas por modelo:
- **Monstro comum:** até 30 mil triângulos e texturas de 2048.
- **Chefe:** até 80 mil triângulos.
