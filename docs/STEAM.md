# Guia: publicar Coroa de Cinzas na Steam

O jogo já está pronto para a Steam:
- versão desktop (Electron);
- conquistas;
- saves em arquivo com Steam Cloud;
- overlay da Steam;
- login pela Steam;
- suporte a controle e Steam Deck.

Este guia cobre a parte que só você pode fazer, na ordem certa. Os itens marcados com **→ me avise** são os pontos em que eu entro no passo 5.

---

## 1. Conta de desenvolvedor (Steamworks)

1. Acesse <https://partner.steamgames.com> e entre com uma conta Steam (de preferência uma criada só para o estúdio).
2. Aceite o acordo de distribuição. Escolha se publica como **pessoa física** ou **empresa** (CNPJ). O nome escolhido aparece como "Desenvolvedor/Distribuidora" na loja.
3. Preencha:
   - **Dados bancários:** a conta onde a Valve deposita as vendas, em dólar.
   - **Informações fiscais:** é uma entrevista on-line. Para quem mora no Brasil, ela gera o formulário de não residente dos EUA (W-8BEN para pessoa física ou W-8BEN-E para empresa). Informe o CPF/CNPJ como número fiscal estrangeiro. Na dúvida, consulte um contador.
   - **Verificação de identidade:** documento com foto.
4. Pague a taxa do **Steam Direct: US$ 100 por jogo**. Ela volta para você depois que o jogo fizer US$ 1.000 em vendas.

> ⏱️ Para desenvolvedores novos, a Valve exige uma espera de **30 dias** entre o pagamento do Steam Direct e o lançamento. Pague logo, mesmo que o lançamento demore.

## 2. Criar o app e anotar os números

Depois do pagamento, o Steamworks cria o app e mostra:
- o **App ID**, um número como `3456780`;
- os **Depots**, que são os pacotes de arquivos. Crie dois: um para Windows e outro para Linux (o Steam Deck usa a versão Windows pelo Proton, ou a Linux).

**→ Me avise com o App ID e os IDs dos depots.** Eu coloco os números no projeto:
- `desktop/steam_appid.txt`;
- os arquivos `desktop/steam/*.vdf`;
- o segredo da função de login.

## 3. Configurações do app no Steamworks

Em **App Admin** (página do app no Steamworks):

### 3.1 Instalação (Installation → General)
Crie duas opções de inicialização (Launch Options):

| Sistema | Executável |
|---|---|
| Windows | `Coroa de Cinzas.exe` |
| Linux / SteamOS | `coroa-de-cinzas` |

### 3.2 Steam Cloud (Steam Cloud → Auto-Cloud)
- **Cota por usuário:** 100 MB. **Arquivos:** 500.
- **Root Paths:**

| Sistema | Raiz (Root) | Subdiretório | Padrão |
|---|---|---|---|
| Windows | `WinAppDataRoaming` | `Coroa de Cinzas/saves` | `*.json` |
| Linux | `LinuxXdgConfigHome` | `Coroa de Cinzas/saves` | `*.json` |
| macOS (se lançar) | `MacAppSupport` | `Coroa de Cinzas/saves` | `*.json` |

O jogo grava um `.json` por save nessa pasta. A Steam sincroniza sozinha entre computadores e o Steam Deck.

### 3.3 Conquistas (Stats & Achievements → Achievements)
Cadastre cada uma com **exatamente** este API Name. Cada conquista precisa de dois ícones 256×256 (colorido e cinza para "bloqueada"); posso gerar os ícones se você quiser.

| API Name | Nome na loja | Descrição |
|---|---|---|
| `PRIMEIRO_SANGUE` | Primeiro Sangue | Derrote seu primeiro monstro |
| `CEM_ABATES` | Ceifador | Derrote 100 monstros |
| `MIL_ABATES` | Flagelo das Cinzas | Derrote 1.000 monstros |
| `NIVEL_10` | Calejado | Alcance o nível 10 |
| `NIVEL_25` | Veterano | Alcance o nível 25 |
| `NIVEL_50` | Lenda Viva | Alcance o nível 50 |
| `NIVEL_100` | Coroado | Alcance o nível 100 |
| `CHEFE_MARETH` | A Rainha Afogada | Derrote Mareth, a Rainha Coral |
| `CHEFE_VHORRA` | Lodo ao Lodo | Derrote a Mãe Lodo Vhorra |
| `CHEFE_MORGRATH` | Caçador de Lendas | Derrote Morgrath, o Cervo Ancião |
| `CHEFE_TECELA` | Teia Rompida | Derrote a Tecelã Abissal |
| `CHEFE_TUSKAR` | Fim de um Reinado | Derrote Tuskar, o Rei Sepultado |
| `CHEFE_HRIMFANG` | Matador de Dragões | Derrote Hrimfang, o Dragão Glacial |
| `CHEFE_VORTHAK` | Coroa de Cinzas | Derrote Vorthak, Senhor das Cinzas |
| `PRIMEIRA_REACAO` | Alquimia de Batalha | Provoque uma reação elemental |
| `JOIA_GRANDIOSA` | Mestre Joalheiro | Crie uma jóia Grandiosa |
| `RAIZ_DESPERTA` | Semente Desperta | Desperte um nó da Raiz Primeva |

Clique em **Save** e depois em **Publish** (Publish → Prepare for Publishing → Really Publish). Sem publicar, as conquistas não funcionam.

### 3.4 Chave da Web API (para o "Entrar com a Steam")
Em **Users & Permissions → Manage Groups**, abra o grupo do seu app e clique em **Create WebAPI Key**.

> ⚠️ Esta chave é **secreta**: não mande no chat nem coloque no código. Ela vai direto no painel do Supabase:
> 1. Supabase → **Edge Functions → Secrets**;
> 2. crie `STEAM_WEB_API_KEY` com a chave;
> 3. crie `STEAM_APP_ID` com o App ID.

**→ Me avise quando os segredos estiverem salvos.** Eu publico a função `steam-login` e a tabela `contas_steam` no Supabase. Até lá, o botão "Entrar com a Steam" mostra um aviso, e o login por e-mail continua funcionando.

## 4. Página da loja

Em **Store Page Admin**. Imagens obrigatórias (o Steamworks mostra os tamanhos exatos ao enviar):

| Imagem | Tamanho |
|---|---|
| Header Capsule | 920 × 430 |
| Small Capsule | 462 × 174 |
| Main Capsule | 1232 × 706 |
| Vertical Capsule | 748 × 896 |
| Page Background (opcional) | 1438 × 810 |
| Library Capsule | 600 × 900 |
| Library Header | 920 × 430 |
| Library Hero | 3840 × 1240 |
| Library Logo (PNG, fundo transparente) | 1280 de largura e/ou 720 de altura |
| Ícone da comunidade | 184 × 184 |
| Capturas de tela | pelo menos 5, em 1920 × 1080 |
| Trailer | recomendado (MP4, 1080p) |

Preencha também:
- **Descrição curta e longa**, em português e inglês. Posso escrever as duas.
- **Tags** sugeridas: RPG de Ação, Hack and Slash, Fantasia Sombria, Loot, Cooperativo On-line, Dungeon Crawler, Isométrico.
- **Requisitos de sistema.** Sugestão:

  | | Mínimo | Recomendado |
  |---|---|---|
  | Sistema | Windows 10 64 bits | Windows 10 ou 11, 64 bits |
  | Processador | 4 núcleos | 6 núcleos |
  | Memória | 8 GB | 16 GB |
  | Placa de vídeo | GTX 960 / RX 470 | GTX 1660 / RX 6600 |
  | Armazenamento | 1 GB | 1 GB |

- **Questionário de conteúdo** (violência de fantasia, sangue) e a classificação etária **IARC**, que é gratuita e feita no próprio Steamworks.
- **Recursos multijogador:** marque "Online Co-op" e "Online PvP: não". Informe que há servidores on-line e coloque o link da **política de privacidade**, obrigatória porque o jogo guarda conta e dados. Posso redigir a política e publicar no site do jogo.
- **Preço:** escolha o preço em dólar; a Steam sugere os preços regionais (o do Brasil costuma ficar bem abaixo do americano).

Deixe a página como **"Em breve" (Coming Soon)** o quanto antes. Ela precisa ficar pública **pelo menos 2 semanas** antes do lançamento e é ali que o jogo junta listas de desejos.

## 5. Gerar e enviar a build

### 5.1 Gerar os arquivos
No GitHub:
1. Abra **Actions → "Montar versão desktop (Steam)" → Run workflow**.
2. Ao terminar (cerca de 10 minutos), baixe os artefatos:
   - `coroa-de-cinzas-win`;
   - `coroa-de-cinzas-linux`.

Para testar no seu computador antes, abra `Coroa de Cinzas.exe` de dentro da pasta do Windows.

### 5.2 Enviar pela SteamPipe (jeito mais simples, no Windows)
1. Baixe o **Steamworks SDK** (Steamworks → página inicial → "Steamworks SDK").
2. Em `sdk/tools/ContentBuilder/content/`, crie as pastas `windows` e `linux`. Copie para elas o conteúdo dos artefatos.
3. Copie os arquivos `desktop/steam/*.vdf` deste projeto para `sdk/tools/ContentBuilder/scripts/`. Troque `SEU_APP_ID` e os `SEU_DEPOT_…` pelos números do passo 2, ou me peça.
4. Rode no terminal, dentro de `sdk/tools/ContentBuilder/`:

```bat
builder\steamcmd.exe +login SEU_USUARIO_STEAM +run_app_build ..\scripts\app_build.vdf +quit
```

O SteamCMD pede a senha e o código do Steam Guard na primeira vez.

5. No Steamworks, em **SteamPipe → Builds**, a build aparece na lista. Coloque-a no branch **beta** primeiro.

### 5.3 Testar pela Steam
1. Em **Users & Permissions**, gere chaves de teste (Request Steam Product Keys → "Testing") e ative uma na sua conta.
2. Na sua biblioteca, escolha o branch beta (Propriedades → Betas) e instale.
3. Confira:
   - o overlay abre com **Shift+Tab**;
   - uma conquista aparece (mate um monstro);
   - o save volta em outro computador (Steam Cloud);
   - o controle funciona.

### 5.4 Revisão e lançamento
1. Envie a **página da loja** e a **build** para revisão: botões "Mark as ready for review" no checklist do Steamworks. Cada revisão leva de 3 a 5 dias úteis.
2. Aprovadas as duas, coloque a build no branch **default** e clique em **Release App** na data escolhida, respeitando os 30 dias da taxa e as 2 semanas da página "Em breve".
3. Depois do lançamento, peça a verificação de compatibilidade com o **Steam Deck** (Steamworks → Steam Deck Compatibility).

---

## Resumo do que eu faço no passo 5 (juntos)

- Colocar o App ID e os depots no projeto.
- Publicar a função `steam-login` e a tabela `contas_steam` no Supabase.
- Gerar os ícones das conquistas e as imagens da loja a partir do jogo.
- Escrever as descrições (português e inglês) e a política de privacidade.
- Traduzir o jogo para o inglês.
- Testar no Steam Deck (com você) e ajustar a interface para controle.
