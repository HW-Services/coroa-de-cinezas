# Coroa de Cinzas

RPG de ação sombrio que roda no navegador (Three.js). Tem monstros compartilhados entre os jogadores, contas por e-mail, seleção de servidor, personagens salvos na nuvem, lista de amigos, clãs, negociação segura entre jogadores e multijogador em tempo real. Os jogadores na mesma cidade, zona ou mapa se veem.

- **Hospedagem:** GitHub Pages (site estático, gratuito).
- **Servidor:** Supabase (contas, banco Postgres e tempo real; o plano gratuito basta para o alfa).
- **Sem configuração**, o jogo roda no modo solo, salvo no navegador.

---

## Como colocar no ar (uma vez só)

### 1. Criar o projeto no Supabase

1. Crie uma conta em <https://supabase.com> e clique em **New project**. Escolha a região **South America (São Paulo)**.
2. Quando o projeto terminar de criar, abra **SQL Editor → New query**. Cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Isso cria as tabelas, as regras de segurança (RLS) e as funções de troca, clã e amizade. O arquivo pode ser rodado de novo depois, sem apagar dados.
3. Em **Authentication → Sign In / Providers → Email**, deixe **Email** ligado. Sobre **Confirm email**:
   - **Para o alfa com amigos, desligue.** O serviço de e-mail embutido do Supabase só envia para os membros do seu projeto e tem limite de poucos e-mails por hora.
   - Para exigir confirmação e permitir "Esqueci minha senha" para todo mundo, configure um SMTP próprio em **Authentication → Emails → SMTP Settings** (o Resend, por exemplo, tem plano gratuito). Depois ligue o **Confirm email**.
4. Em **Authentication → URL Configuration**, coloque o endereço do site do jogo em **Site URL** e em **Redirect URLs**. É o endereço do passo 3, por exemplo `https://hw-services.github.io/coroa-de-cinezas/`.
5. Em **Project Settings → API**, copie:
   - **Project URL** (`https://xxxx.supabase.co`);
   - a chave **anon public** (ou **publishable**).

   > ⚠️ **Nunca** use a chave `service_role` / `secret` no jogo. Ela dá acesso total ao banco.

### 2. Configurar o jogo

Edite [`js/config.js`](js/config.js):

```js
window.CDC_CONFIG = {
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseAnonKey: 'eyJ...ou sb_publishable_...',
};
```

A chave anon é pública por natureza. Quem protege os dados são as regras de RLS e as funções do `schema.sql`.

### 3. Publicar no GitHub Pages

1. Envie esta pasta para um repositório no GitHub (por exemplo `coroa-de-cinzas`).
2. No repositório, abra **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**.
3. Cada `push` na branch `main` publica o site automaticamente (workflow em `.github/workflows/pages.yml`). O link fica no formato `https://hw-services.github.io/coroa-de-cinezas/`.

---

## Como funciona

| Recurso | Onde |
|---|---|
| Login / cadastro / esqueci a senha | Supabase Auth (e-mail e senha). Cada conta tem um **apelido** único e público. |
| Seleção de servidor | Tabela `servidores` (hoje só `brasil-1`). Para abrir outro, insira uma linha nela. |
| Personagens | Até 4 por conta em cada servidor, salvos na nuvem a cada poucos segundos, com controle de versão. |
| Zonas | 27 zonas em 3 atos (8, 8 e 11), com mapas de 600×600: caminho em serpentina, ramos com baús de tesouro, santuários e covis. |
| Mapa da zona | Tecla **Tab** (ou botão "Zona"): traçado da área atual, névoa do que ainda não foi explorado, saídas, Pedra de Passagem, tesouros, santuários, chefe e outros jogadores. |
| Itens de conjunto | 9 conjuntos verdes (3 por classe, níveis 3, 18 e 32) com 4 ou 5 peças cada e bônus a partir de 2 peças equipadas. Caem de chefes (22%), raros (3%), baús e, raramente, de outros monstros. |
| Pets | Tecla **P**: 6 companheiros (Leão Dourado e Celeste, Tigre das Sombras e das Neves, Coruja Arcana e das Neves) que seguem o jogador e coletam ouro e itens conforme os filtros marcados. Outros jogadores veem seu pet. |
| Som | Botão de alto-falante no canto superior direito (também no Menu, Esc): liga/desliga e volume da música e dos efeitos, salvos no navegador. A música muda sozinha entre menu, cidade, zonas (rock) e chefes (metal). |
| Monstros compartilhados | Todos na mesma área enfrentam os mesmos monstros. Quem entrou primeiro comanda a IA (anfitrião) e transmite posições e vida; o dano de cada jogador vai ao anfitrião, que anuncia as mortes. Cada jogador vivo a até ~55 m ganha a sua experiência e o seu próprio saque. Se o anfitrião sair, o próximo assume. |
| Ver outros jogadores | Supabase Realtime: um canal por área (`area:<servidor>:<área>`), com posição, animação, habilidades e balão de conversa. |
| Online / bate-papo | Canal `lobby:<servidor>` (presença). **Enter** conversa com quem está na área; `/c texto` fala com o clã. |
| Amigos | Painel **Social (O)** → Amigos. Mostra quem está online e onde, com botões Ir e Negociar. |
| Clã | Social → Clã: fundar, convidar, cargos (líder, oficial, membro), expulsar, passar a liderança e mural de mensagens. |
| Negociação | Só nas cidades. As duas partes ofertam itens e ouro e confirmam; a troca acontece **inteira no banco**, numa transação. |

### Segurança da negociação

- O navegador **não escreve direto** em nenhuma tabela. Tudo passa por funções que conferem o jogador logado.
- A oferta que o outro jogador vê é montada **pelo banco**, a partir do personagem salvo. Não dá para mostrar um item e entregar outro.
- Ao concluir, o banco confere que cada item ainda está no inventário e que há ouro e espaço suficientes. Só então move tudo de uma vez.
- Cada troca aumenta a **versão** dos dois personagens. Um salvamento antigo (por exemplo, de outra aba com o item ainda no inventário) é recusado, o que impede duplicar itens.

> Limite conhecido do alfa: o progresso (saque, experiência) é calculado no navegador de cada jogador, como na maioria dos jogos de navegador sem servidor de jogo dedicado. Por isso, um jogador com conhecimento técnico consegue editar o próprio personagem. A troca impede duplicação entre jogadores, mas não impede alguém de alterar os próprios dados.

### Limites do plano gratuito do Supabase

São cerca de 200 conexões simultâneas e um teto mensal de mensagens em tempo real. As posições são enviadas só quando mudam (até cerca de 7 por segundo), com um sinal a cada 2 s. Para um alfa com amigos, sobra.

---

## Testar localmente

```bash
python3 -m http.server 8000
```

Depois abra <http://localhost:8000>. Com o `config.js` vazio, o jogo roda no modo solo.

## Créditos

Modelos 3D: KayKit (Kay Lousberg) e Quaternius, licença CC0. Veja `modelos/LICENCA_*.txt`.

Músicas (rock e metal) e efeitos sonoros: todos CC0, de nene, Emma_MA, Alex McCulloch (Pro Sensory), Kenney, artisticdude, Vehicle e rubberduck. Veja `audio/CREDITOS.txt`.

## Combos elementais
Cada golpe deixa uma marca no inimigo (Em Chamas, Gelado, Eletrizado, Envenenado, Sangrando, Perfurado, Vendaval, Atordoado). Acertar o mesmo inimigo com outro tipo detona uma reação de dano elevado: Tempestade de Fogo (fogo + vento), Supercondutor (gelo + raio), Hemorragia (sangramento + perfuração), Estilhaçar, Sobrecarga, Tempestade Elétrica, Derretimento, Combustão Tóxica, Corrosão, Nevasca, Ruptura, Sangue Tóxico e Para-raios. A lista fica no painel **Combos (L)**. Os combos funcionam entre jogadores: a marca deixada por um pode ser detonada por outro na mesma área.

## Jóias e joalheira
Jóias em cinco qualidades (Lascada, Comum, Impecável, Real, Grandiosa), cada uma com lapidação própria. Em cada cidade há uma joalheira (Íris, Tâmsin e Yasmin) que evolui 3 jóias iguais + ouro em 1 da qualidade seguinte e remove jóias encaixadas de graça.
