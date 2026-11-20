# Mercado: Solana Bombers e Mini Hero (versão com os sites oficiais, 2026-11-15)
Só referência de mercado; nada será copiado (projeto independente: nomes, regras, números e arte deles não entram no nosso jogo). Com o jogador prometemos token, nunca lucro (aviso ao redator).

**Como esta versão foi feita (2026-11-15, 18:40 UTC):** os dois sites oficiais abriram (HTTP 200). `solanabombers.fun` é um aplicativo em JavaScript (Next.js) que mostra só "Loading…" no HTML; baixei os arquivos .js do MESMO host e li neles o "Codex" (a ajuda do jogo) e a tabela de regras, e li três rotas públicas de leitura do próprio site (`/api/config`, `/api/online`, `/api/referral/leaderboard`). `minihero.org` é página estática: li o texto inteiro. Não criei conta, não conectei carteira, não chamei rota que escreve, não executei nada baixado. O jogo em si do Mini Hero (`dg.minihero.org`) fica fora da rede. O jogo do Solana Bombers exige carteira: só vi a tela de entrada; as regras vêm do Codex que está no código.
**Marcação:** [O n] = fonte OFICIAL (site do próprio jogo ou do Bombcrypto). [A n] = agregador/terceiro, NÃO OFICIAL (vem da versão parcial de antes, mantido). FATO tem fonte e data; OPINIÃO está marcada. "Não encontrado" = procurei e não achei.
Limite: o Codex do Solana Bombers está dentro do código do site, não numa página de documentação; ele pode estar mais novo ou mais velho que o servidor. Por isso conferi com `/api/config` (o servidor) e os números batem.

---
## 1. SOLANA BOMBERS (token $BOMBERS, estúdio "Artificial Studios")

### 1.1 O que é (FATO)
- Descrição do próprio site: "Treasure-hunting bomber heroes on Solana — by Artificial Studios" [O1] (título da página e meta description).
- Tela de entrada: "Send your bomber heroes treasure hunting. Connect a Solana wallet and sign a message to sign in. Signing in costs nothing." [O1][O12]
- Codex, "What is Solana Bombers?": "Collect Bomber heroes, send them into Treasure Hunt to blast chests, and earn $BOMBERS. Grow your team with upgrades and houses, then cash out your rewards." [O2]
- É uma cópia declarada da MECÂNICA do Bombcrypto de 2021, com economia própria. O código diz: "Original characters and art; inspired by the 2021 bomber-hero treasure-hunt genre." [O2] e o servidor lista como fontes das regras os repositórios do Bombcrypto (`github.com/senspark/bombcrypto-contract-v2`, `-server-v2`, `-market-v2`) e posts do Substack/Medium do Bombcrypto, com a frase "Original era — Dec 2021 baseline (+ Jan 2022 Marketplace module)" [O3]. (O texto desses repositórios não foi lido: github está fora da rede.)
- Lançamento: o servidor devolve `launchAt: 2026-10-06T08:00:00Z` [O3]. Em 2026-11-15 o jogo tem ~40 dias. Modo de pagamento: `"paymentsMode":"mainnet"`, `"production":true` [O3]: dinheiro real, rede principal da Solana.
- Gente agora: `{"online":220,"windowMin":15}`, ou seja, 220 jogadores ativos nos últimos 15 minutos, em 2026-11-15 ~18:40 UTC [O4]. A tela de entrada mostra "220 players online" [O12].
- Equipe: só "Artificial Studios" (sem nomes). Outro jogo do mesmo estúdio aparece na lista de votação do jogo: "Idle Grind" [O2]. Roteiro (roadmap), whitepaper, termos, auditoria: NÃO ENCONTRADO no site nem no código (busca por roadmap, whitepaper, audit, Terms sem resultado).
- Canais oficiais achados: Discord `discord.gg/F2d5BEY6mf` (fora da rede) e os botões "Buy $BOMBERS" e "Buy $AGS" que levam à pump.fun [O2][O12]. Conta de X do jogo: NÃO ENCONTRADA no site (só links de "poste sobre o jogo").

### 1.2 Como se joga (FATO, Codex [O2])
- Laço, como o jogo escreve ("The loop"): "Mint heroes in the Shop (Bomber Box, 25,000 $BOMBERS each; Mythic Box, 50,000 $BOMBERS each)." · "Work: up to 15 heroes hunt at once. Each bomb costs 1 energy." · "Rest: tired heroes recover energy outside or (much faster) in a house." · "Earn: chests drop $BOMBERS into your Reward Chest. Cash out when you reach the minimum."
- Por minuto: o herói anda sozinho até os blocos e solta bombas; "Heroes walk to blocks and drop bombs automatically. Bombs explode after 3s; a blast that reaches another bomb sets it off too." Mapa de 35×17 casas: "The arena is 35×17 tiles of bricks, chests and the odd prison. Clear it and a new map appears." "Heroes are never hurt by explosions." Velocidade: de 0,9 casa/s (velocidade 1) a ~6 casas/s (velocidade 18) [O2].
- Por dia: o que o jogador faz é gerir: mandar herói ao trabalho, pôr para descansar, cobrar. "Work all" manda ao trabalho os que têm 30% de energia ou mais.
- O que roda sozinho: o herói caça sozinho, MAS só com o jogo aberto: "Heroes only work while Treasure Hunt is open: there is no offline mining." [O2]. Quem quer "ir embora" compra o Mordomo (butler): "Lets you go idle: one butler looks after every house you own, while Treasure Hunt is open." Ele põe para descansar quando a energia chega a ~1% e volta ao trabalho aos 80%.
- Limites: até 500 heróis; os 50 melhores (mais raros primeiro) ficam carregados; 15 trabalham ao mesmo tempo [O2][O3].
- Vida útil do herói (gasto contínuo): "Every hero has 72h of lifespan. Only time spent working on the Treasure Hunt map uses it". Acabou, o herói sai do mapa e só volta pagando a recarga: Common 10.000, Rare 35.000, Super Rare 75.000, Epic 150.000, Legend 175.000, Super Legend 180.000, Mythic 200.000 $BOMBERS [O2].
- Blocos e recompensa por baú (conta minha: valor no código ÷ vida do bloco): madeira 100 de vida, paga 35,625 $BOMBERS; metal 213, paga 81,25; ouro 1.000, paga 406,25; diamante 1.625, paga 812,5. A cada 10º mapa há chefe de 6.000 de vida, que paga 2–3 vezes um baú de diamante (1.625 a 2.437,5), ou (no lugar da moeda) 5% de chance de herói grátis e 2% de skin. Prisão (libera herói de graça) e "Item Chest" (item, sem moeda) são raros [O2][O3].
- Chance de aparecer cada bloco (campo `blockWeights`, fonte "studio"): tijolo 70%, madeira 19%, metal 7%, ouro 2,5%, diamante 1%, prisão 0,006% (o dono pediu "jails about 1 per 50 maps") [O3].
- Poderes (7 perks, cada raridade ganha mais um): Treasure Hunter +2 de dano em baú, Jail Breaker +5 em prisão, Pierce Block, Save Battery (20% de chance de a bomba não gastar energia), Fast Charge, Bomb Pass, Block Pass [O2].
- Modos além da caça: mini-jogo de azar "Gamble Heroes", fusão "Hero Enhance", melhoria por nível, troca de skill, eventos de 48 h a cada 4 dias, missões de divulgação (ver 1.5) [O2].

### 1.3 Personagens, raridades e CHANCES (PUBLICADAS)
O site publica a tabela de chances na ajuda ("Rarity, odds and stats") e no servidor [O2][O3]:
| Raridade | Caixa comum (Bomber Box) | Mythic Box | Studio Box | Atributos | Bombas | Alcance | Perks |
|---|---|---|---|---|---|---|---|
| Common | 82,87% | 82,77% | 0 | 1–3 | 1 | 1 | 1 |
| Rare | 10,36% | 10,36% | 0 | 3–6 | 2 | 2 | 2 |
| Super Rare | 5,18% | 5,18% | 0 | 6–9 | 3 | 3 | 3 |
| Epic | 1,04% | 1,04% | 0 | 9–12 | 4 | 4 | 4 |
| Legend | 0,51% | 0,51% | 50% | 12–15 | 5 | 5 | 5 |
| Super Legend | 0,04% | 0,10% | 40% | 15–18 | 6 | 6 | 6 |
| Mythic | 0 | 0,04% | 10% | 17–20 | 7 | 6–7 | 7 |
Nota: o vetor da Mythic Box no código é `[8277,1036,518,104,51,10,4]` sobre 10.000; o dono do jogo escreveu "put super legend a little more common and take that rate from the commons droprate" [O3]. Mythic só sai da Mythic Box e da Studio Box.
- A tabela comum (82,87/10,36/5,18/1,04/0,51/0,04) é a MESMA que o Bombcrypto publicou em abril de 2022 [O9]. O servidor diz: "Owner-directed (brief): official Apr 2022 table 82.87/10.36/5.18/1.04/0.51/0.04" [O3].
- "Every hero rolls its rarity, stats, perks and look independently." [O2] "Fairness commitment" com `sha256(seed)` mostrada ao jogador: o sorteio é fixado na hora do pagamento por uma semente "committed" [O2]. (OPINIÃO: bom sinal de transparência; não conferi se o servidor revela a semente depois.)
- Aparência: 8 "skins" de bichos/memes (Hodlotl o axolote, Moonbeam Cow, GM Toast, Sir Fudsworth a coruja, Zen Lapis, Rondo o guaxinim, Rekt Rex, Laser Beanie) [O3] e 14 "heróis" estilo anime/super-herói (ex.: Leaf Genin, Mecha Pilot, Iron Titan, Void Emperor), liberados em 29/10/2026 [O2]. Skins dão bônus enquanto usadas.
- Níveis: até 5, queimando um herói do mesmo nível: "100% success". Custos em $BOMBERS (de Lv1→2 até Lv4→5): Common 2.500/5.000/10.000/17.500; Rare 5.000/10.000/12.500/22.500; Super Rare 5.000/10.000/12.500/25.000; Epic 7.500/17.500/27.500/55.000; Legend 17.500/45.000/100.000/365.000; Super Legend e Mythic 22.500/62.500/140.000/497.500 [O2] (valor base × 2.500, conta minha).
- Azar e fusão (chances publicadas): "Gamble Heroes": põe 5 heróis da mesma raridade (Common a Epic) mais taxa de 20.000/50.000/100.000/200.000 $BOMBERS. Resultado: 5% perde tudo ("Miss"), 20% "Safe" (volta o melhor), 55% sobe 1 raridade, 20% sobe 2. Texto: "A game of chance: only put in heroes you are happy to lose. Mythic can't be won. Play responsibly." "Hero Enhance": queima 4 heróis (60%) ou 5 (80%) para ter 1 da raridade acima (Common, Rare e Super Rare viram a próxima; taxa 10.000/25.000/50.000); "Epic is the highest result" [O2].

### 1.4 Preços de entrada (FATO)
- Herói: 25.000 $BOMBERS (caixa de 1 ou de 5; a de 10 foi retirada) e Mythic Box 50.000. O histórico do próprio servidor: "21 Oct 2026: \"put back the bombers so it should cost 25k $bombers to mint 1 hero again\"; 20-21 Oct 2026 it was 20,000 $BOMBERS + 5,000 $AGS" [O3]. O preço mudou em 1 dia.
- Casas (descanso): Tiny 1,8 milhão $BOMBERS (4 camas, 2 energia/min, oferta 2.500), Mini 6 mi (6 camas, 5/min, 1.250), Luxury 13,5 mi (8, 8/min, 750), Penthouse 24 mi (10, 11/min, 250), Villa 37,5 mi (12, 14/min, 200), Super Villa 54 mi (14, 17/min, 50) [O3]. Descansar fora: 0,5 energia/min (1 energia a cada 2 min). Limite 5 casas, todas trabalham ao mesmo tempo. Há promoções de casa de 35% a 5%, em janelas de 2 dias a cada 4 dias, a partir de 14/11/2026 [O3].
- Itens "AGS" (segundo token do estúdio): Studio Box (133 no total; 122 vendidas em 2026-11-15; preço sobe de 1,3 mi a 44,2 mi "AGS value" a cada venda; chances Legend 50%, Super Legend 40%, Mythic 10%; texto "After community feedback these will be the LAST Studio Boxes ever."); Mordomo (butler, 100 no total, todos vendidos; depois vem o "Hero Butler", 21 vendidos); casas especiais Studio (40/40 vendidas), AGS Event Center (3/5), Club House (13/25) [O3][O2]. Pagamento AGS: "you pay half of the AGS price in AGS and the other half in $BOMBERS of equal value (market price over the last 30 minutes), in one transaction" [O2].
- Taxa em SOL por ação: "Every paid action adds a small SOL studio fee (from 0.0005 SOL; cashouts 0.0025 SOL), plus the normal Solana network fee." [O2]; no código o destino é `studioFeeWallet` [O3].
- Entrada "grátis": NÃO existe compra grátis; o que existe é herói grátis por indicação, chefe, prisão, voto, divulgação e "holder reward" (ver 1.5). A listagem antiga dizia "jogo idle casual grátis" [A2]: o site oficial pede compra de herói em token.

### 1.5 Energia, descanso, crescimento e "marketing de dentro do jogo" (FATO [O2][O3])
- Energia máxima = Stamina × 50; cada bomba gasta 1. Common (Stamina 1–3) tem 50 a 150 energia e depois descansa; fora de casa recupera 1 a cada 2 min (100 energia = 3h20), numa Tiny 50 min.
- Indicação: "When a friend who joined with it has bought 15 heroes (Bomber Box, Mythic Box and Studio Box), you get 2 free heroes". Só novos jogadores. Ranking público de indicações (maior: 99 indicados com sucesso) [O5]. Apelidos do ranking parecem, em boa parte, em português (OPINIÃO minha; sem nomes aqui, são pessoas privadas).
- Portal de criadores: "Make a post about Solana Bombers on X or YouTube and earn free heroes. The more views it gets, the bigger the reward." Código do criador no post; posts de até 7 dias; 1 envio por 24 h [O2].
- Missão de voto: "Vote for our games in the PlayToEarn Blockchain Game Awards 2026" e ganha herói [O2].
- "$BOMBERS holder reward": "your wallet held tokens at the snapshot, worth ... free Bombers" e a frase "Claiming opens once the new token is live." [O2]. (INFERÊNCIA: houve ou haverá troca de token; ver 1.6.)
- Eventos: "Minting Events" e "Fusion Events", 48 h a cada ciclo de 4 dias; placar dos 20 primeiros; prêmio = "5% of every Bomber Box / Mythic Box sold during the event", pago do tesouro; resgate em 30 dias. Evento comunitário: 5.000 chefes mortos na semana = skin para todos que mataram 1 [O2].
- "Scholar": o dono da conta cria login e senha para outra pessoa jogar a caça e dividir o que rende, com a parte fixada por ele [O2] (é o "aluguel de conta" do gênero).
- Robôs: "You've been banned for automation." e logo abaixo "Buy a [Mordomo] to automate your heroes the right way and get unbanned right away." [O2]. (OPINIÃO: banir o robô e vender a saída pelo produto pago mostra que o jogo tem robô e o transforma em receita.)

### 1.6 Token (FATO [O2][O3])
- Símbolo $BOMBERS, Solana, 6 casas decimais. Endereço publicado pelo servidor: `5nZe5HnMyAQMTHXh9ohFVemzrAPaeEMbnMh9bV1Dpump` (termina em "pump": nasceu na pump.fun). O botão "Buy $BOMBERS" abre `pump.fun/coin/5nZe5...Dpump`.
- **Diferença a conferir:** a versão parcial (agregadores) trazia outro endereço, `CZiwA6eLUthZFLvTVEWG9v1K9Pc7p3eiBKRba2G7pump` [A4][A7]. O site oficial hoje usa o `5nZe5...`. Junto com a frase "Claiming opens once the new token is live." e o "holder reward" por foto (snapshot), a leitura mais provável (OPINIÃO) é que o token trocou e os números de preço/carteiras de [A4][A5][A7][A9] são do token ANTIGO. Não consegui ver pump.fun/solscan (fora da rede) para confirmar.
- Segundo token do estúdio: $AGS, endereço `GGGtVWFUS5jrG5M36GUyX9ZfzoMywdrirrdh8Gxzpump`, 6 casas, botão "Buy $AGS" [O3][O12].
- Carteiras públicas no servidor: tesouraria $BOMBERS `C5JFbTfEHVPyK8pgV7WYG33sisVPq1cWqLMFfGfF6KWu`; tesouraria AGS `EfQdQJJt7NrgDos2sRdK2QgYn3krJCM3gEWBpZbSy839`; carteira da taxa em SOL `5hqKWJMEG9KPim3LyyJw2YVUeGMaQaKvrV8XqNsAZEw3` [O3].
- Oferta total, emissão, queima de token, divisão inicial entre equipe e público: NÃO ENCONTRADO (a palavra "burn" só aparece para herói queimado, não para token).
- Taxas do token: não há "taxa de transferência" citada. Taxas do jogo: 3% no saque, 28% no mercado, 28% de multa se cancelar aposta antes da hora (1.7, 1.8).
- Números de preço/volume de agregadores (de antes, NÃO OFICIAL, possivelmente do token antigo): preço de US$ 0,0000003547 a 0,000045 [A5][A7][A8]; liquidez US$ 2.288 "100% travada" [A9]; volume 24 h US$ 249–4.240 [A7][A9]; 824 holders, 10 maiores com ~88,9% (até 08/10/2026) [A4]; valor de mercado ~US$ 45–161 mil [A4][A10].

### 1.7 De onde vem o prêmio e saque (FATO)
- Origem do prêmio, nas palavras do site: "Rewards come from the game's reward pool. Earnings depend on gameplay and are not guaranteed." [O2] e "After you sign, the payout is sent from the treasury to your wallet" [O2]. O que enche o "pool"/tesouro: NÃO está explicado. Pelo código, entram na tesouraria o que o jogador paga em $BOMBERS (caixas, recargas, melhorias, azar, fusão) e o que ele deixa em aposta ("Staked $BOMBERS goes to the game treasury"). OPINIÃO: é um circuito fechado de token; prêmio sai de tokens que outros jogadores gastaram mais o que a equipe pôs no início; a única receita "de fora" visível é a taxa em SOL, que vai para a carteira do estúdio e NÃO ao pote. Pote de receita real: não encontrado.
- Freio automático na tela: "The treasury is checked once a day. A day it drops more than 3% adds one −15% (they stack, each taking 15% off what chests pay at that point); a day at −3% or better ... removes one." Em 2026-11-15 o servidor devolve `"cc":1`, ou seja, um −15% ativo: baús pagam 85% [O3]. É um prêmio que se ajusta pelo tamanho do tesouro (parecido com a nossa ideia de pote).
- Saque ("Cashing out"): mínimo 100.000 $BOMBERS; carteira precisa ter pelo menos 2.500 $BOMBERS; taxa de 3% mais 0,0025 SOL mais taxa da rede; um saque a cada 24 h ("12 hours with a 10,000,000 stake whose lock is running"); "the time starts again at your last cashout" [O2][O3]. Origem das regras: "owner 25 Oct 2026: \"make cashouts 1 time per 24 hours max...\"" [O3].
- Trava contra quem não saca: "Cash out to keep full earnings": com 120.000 ou mais acumulados e 24 h sem saque, baús e chefe pagam só 25% "until you cash out" [O2].
- Aposta (stake) muda quanto o baú paga: sem aposta, 25%; com 100.000 $BOMBERS, 50%; com 350.000 ou mais, 100%. Exceção: quem tem média de saques abaixo de 100.000 por dia nos últimos 7 dias recebe 100% sem apostar. Apostas a partir de 1 milhão travam 32 dias e dão bônus nos heróis raros; cancelar antes custa 28% (máximo 10 milhões) [O2].
- Mercado entre jogadores: "Marketplace tax: 28% of the sale price, plus a 0.0005 SOL studio fee for the buyer." Vendem-se heróis Super Rare a Mythic, casas, mordomos e skins; preço mínimo (Super Rare 60.000, Epic 100.000, Legend 225.000, Super Legend e Mythic 1.172.500 $BOMBERS); cancelar só depois de 5 minutos; herói só pode ser vendido com vida útil cheia ou totalmente gasta [O2][O3]. O servidor registra que esses mínimos mudaram pelo menos 6 vezes entre 12 e 30/10/2026 e a taxa foi posta em 28% em 5/10/2026 ("set the marketplace tax to 28%") [O3]. (No Bombcrypto era 20% e mínimo bem menor [O8].)
- Aviso de saque/pagamento: pagamentos têm reembolso automático se falham ("refund queued"; "payment under review — support will resolve or refund") [O2]. Atraso de saque, golpe, relatos de jogadores: NÃO ENCONTRADO.

### 1.8 Promessas de retorno (palavras exatas)
- Nenhuma promessa numérica de retorno, de "payback" ou de ganho por dia nas telas e na ajuda do jogo. Busca por "payback", "APY", "per day", "daily" no código: sem resultado. Frases de aviso: "Earnings depend on gameplay and are not guaranteed." e "Rewards depend on gameplay and the reward pool; they are not guaranteed." [O2].
- Mas o verbo é "earn": "send them into Treasure Hunt to blast chests, and earn $BOMBERS" [O2].
- Fora do site: o título de vídeo de terceiro "PAYBACK de 2 DIAS?" [A6] (só o título foi lido; NÃO OFICIAL). OPINIÃO: o site não promete payback, mas o público procura por ele; o jogo vive de divulgadores pagos em herói grátis (portal de criadores), o que alimenta esse tipo de vídeo.
- Conta minha (OPINIÃO, ignora tijolos, alcance, perks e bombas em vários blocos, e usa só os números do site): um baú paga entre 0,36 e 0,5 $BOMBERS por ponto de dano. Para pagar 25.000 $BOMBERS (1 herói) seriam ~50 mil a ~70 mil pontos de dano com 100% do baú; com 25% (sem aposta) seriam 200 mil a ~280 mil, fora a recarga de vida útil (10.000 por 72 h para um Common) e o corte de 15% do freio. O ganho real por dia é desconhecido; não está publicado.

### 1.9 Visual (FATO, tela vista em 2026-11-15 [O12] + código [O2][O3])
Pixel art colorida, estilo "neon roxo". A tela de entrada tem barra roxa no alto com o logo (bomba preta sorridente com pavio e a marca "SOLANA BOMBERS $BOMBERS"), botões "Discord", "Buy $BOMBERS" (verde) e "Buy $AGS" (amarelo); no fundo, um prado de grama pixelada com céu azul, sol e nuvens quadradas; no centro um cartão roxo com borda ciano, uma faixa com arte de bombers (raposa, gato, guaxinim) explodindo baús, 8 bichinhos de pixel em fila e o contador "220 players online". Dentro do jogo (pelo código): mapa visto DE CIMA, 35×17 casas, blocos de tijolo, baús de madeira, metal, ouro e diamante, heróis pixel com brilho pela raridade (Mythic arco-íris, Super Legend vermelho, Legend dourado, Epic roxo, Super Rare azul, Rare verde; Common sem brilho), bombas com pavio de 3 s. Jogo feito com Phaser (motor 2D de navegador); telas de menu em React; avisos em tempo real por Supabase [O2]. Funciona no celular só pelo navegador da carteira ("On a phone, open the game inside your wallet app's browser").

### 1.10 O que faz bem e o que é risco (OPINIÃO)
- Faz bem: (1) laço de uma frase e tela que enche sozinha; (2) chances PUBLICADAS na própria ajuda e semente "committed" (transparência); (3) freio automático diário do tesouro (−15% empilhável) mostrado na tela; (4) saque com taxa, mínimo e prazo escritos; (5) eventos de 4 dias com placar e prêmio como % da venda; (6) aviso claro de "não garantido".
- Risco: (1) economia circular de token, sem receita de fora no pote; (2) preços e regras mexidos pelo dono de um dia para o outro (mint 20k+5k AGS para 25k em 1 dia; mínimos do mercado pelo menos 6 vezes em 3 semanas; oferta e preço da Studio Box também) [O3]; (3) corte dos baús para 25% (perde 75%) se você não saca, que EMPURRA o jogador a sacar e vender: pressão de venda do token; (4) jogo de azar com herói (Gamble Heroes) dentro do jogo, com 5% de perda total; (5) 28% de taxa no mercado e 28% de multa de aposta, taxas altas; (6) banir robô e vender a volta pelo produto pago; (7) pagamento por divulgação em herói grátis (marketing pago em ativo do jogo); (8) código de desenvolvimento ("Dev: grant 15 starter heroes", "DEV · SIMULATED PAYMENTS") entregue ao navegador, mesmo desligado [O2]; (9) token com trocas e concentração em poucas carteiras nas medidas antigas [A4].

---
## 2. MINI HERO (token MHDG)

### 2.1 O que é (FATO, [O6])
- Título: "Mini Hero | Small heroes. Big adventures." Descrição: "Meet Mini Hero, an idle dungeon adventure. Collect tiny heroes, send them into the dungeon, grow your team with the forge and fusion, and face Ignaroth in the raid." [O6]
- Texto da página: "Collect a team of tiny heroes and send them into the dungeon. They hunt on their own, bring back what they find and grow stronger with every summon, forge and fusion." e "Made for your desktop browser. Sign in with a Solana wallet." [O6]
- Jogo: `dg.minihero.org` (FORA DA REDE; uma tentativa sem conexão). "Is Mini Hero live? Yes. Play it at dg.minihero.org" [O6]. Rodapé: "© 2026 Mini Hero". Data de lançamento, equipe, whitepaper, roteiro: NÃO ENCONTRADO na página.
- Canais oficiais: X `@MiniHeroDG` (`x.com/MiniHeroDG`), Discord `discord.gg/vaJ7Cn6u8R`, CoinGecko `coingecko.com/en/coins/mini-hero-dg`, pump.fun do token — todos FORA DA REDE [O6].

### 2.2 Como se joga (FATO, [O6])
- Números da página: "50 heroes on a team", "15 in the dungeon at once", "6 rarities", "7 skills".
- Passos do site: 1 Collect heroes ("Every summon is a sealed card: a hero with its own rarity, stats and skills."); 2 "Up to fifteen heroes fight in the dungeon at once, all on their own."; 3 "Every blow fills your chest with MHDG, the game's currency, ready for what your team needs next."; 4 "Summon more, fuse spare heroes, hire blacksmiths and take your best into the raid."
- O que o jogador controla (FAQ): "The fighting is automatic: you decide who works, who rests, who goes into the forge and which hero joins the raid."
- Por minuto/por dia: não há números de ritmo na página. A cada poucos minutos a sala muda de "bioma": "Every few minutes the torches dim, four mages cast from the upper wall and the room wakes up as a new biome" (Stone Halls, Frost Crypt, Ember Vault, Moss Ruins). Monstros: Slime verde, Slime azul, Orc, Minotauro. Chefe de vez em quando: "A boss twice the size of any monster takes the middle of the room... When it falls, it leaves a mint card in your chest."
- O que roda sozinho: "Do my heroes hunt while I am away? Yes, at a slightly slower pace, until their weapons break or their shields run out. Porters and the boss only work while the game is open." (diferente do Solana Bombers: aqui há caça fora do jogo, mais lenta.) Progresso salvo pela carteira.
- Apoio: Ferreiros (blacksmiths, 6 níveis): "Repair more heroes at once, and faster." Carregadores (porters): mandam de volta ao calabouço os heróis consertados, "strongest first, while the game is open"; com ferreiro, "runs the forge for you too". Escudos: "Every hero hunts behind a shield that wears down as it goes. When it breaks, the hero rests until you repair it". Sucata (Scrap): "Scrap the heroes you do not need. They turn into Scrap, the material that repairs shields."
- Raide: "Ignaroth, The Crimson Wyrm, rises in raid events. Every player sends one hero, and they all fight it together in one arena, live." Escolha 1 de 3 cartas de batalha (Ataque, Velocidade, Sobrevivência) durante a luta; "Six rankings, one per rarity".
- Temporadas: "Seasons of 7 days"; "Every hero you summon scores points for the season, and rarer heroes score more."

### 2.3 Personagens, raridades e CHANCES
- Seis raridades: Common, Uncommon, Rare, Epic, Legendary, Mythic. Três alcances: Espadachim (alcance 1, golpes em área), Lanceiro (2), Arqueiro (3): "The range sets the hero's style, and the rarity sets how hard it hits." "Riftborn": 3 heróis especiais (Fighter com machado, Wizard com bola de fogo, Ranger com flecha de gelo) que "only come from the Riftborn offers in the shop".
- Sete habilidades, uma por degrau de raridade, sorteadas ao acaso: Extra Damage (Boss), Swift Step, Blacksmith, Precision, Execute, Fury, Extra Damage (Enemies).
- Cada invocação cai de costas: "Every summon lands face down, so nothing gives a rarity away." Cada degrau acrescenta habilidade, área maior e mais críticos.
- Fusão: "Four heroes of one rarity fuse into one hero of the next." "Common to Epic heroes fuse, four of one rarity at a time. Legendary and Mythic heroes never fuse." "Once in a long while, a critical fusion skips a rarity."
- CHANCES DE SORTEIO DA INVOCAÇÃO: NÃO PUBLICADAS na página (nem a chance do crítico de fusão). Não encontrado.

### 2.4 Preços, energia, token
- Preço da invocação, do ferreiro, do carregador, do escudo: NÃO PUBLICADO na página. (Dentro do jogo pode haver; fora da rede.)
- Energia/descanso: não há "energia"; há durabilidade de arma e escudo, que quebra e pede conserto (Sucata e ferreiro).
- Token: "Mini Hero DG (MHDG) is the game's currency on Solana. Your heroes gather it in the hunt, and it brings new heroes, blacksmiths, porters and stronger shields to your team." Quadro "Token": Ticker MHDG; Network Solana; Contract address `2fk5eGwAch1wGhsK3XhRUZpopXFGyRbFUn6XL4Yxpump` (igual ao de [A14]). Aviso: "Only trust the contract address posted on this site and on our official X, @MiniHeroDG." [O6]
- Oferta, emissão, queima, taxas: NÃO ENCONTRADO na página (mesma lacuna de antes).
- Uso do token: "you use it for summons, blacksmiths, porters, fusions and shield upgrades" (FAQ). Mesmo desenho do Solana Bombers: o jogo gasta token que ele mesmo paga.

### 2.5 De onde vem o prêmio, saque e promessas
- Origem do prêmio: "Every blow fills your chest with MHDG" [O6]: o prêmio é token que o herói "acha", sem dizer de onde sai. Pote de receita real: não encontrado.
- Saque (mínimo, taxa, travas): NÃO ENCONTRADO na página. A palavra "withdraw"/"cash out" não aparece. Frases: "Found in the dungeon. Spent on the team." (título do quadro do token) — isto apresenta o MHDG como moeda de gastar, não de sacar.
- Promessas de retorno: NENHUMA na página. Nenhum "earn", "profit", "ROI", "payback", "APY". O texto evita prometer dinheiro; fala em "currency". (OPINIÃO: tom mais "jogo", menos "ganhe".)
- Indicação: "Share your invite link from the game. As the friends you invite build their teams, you receive mint cards, and every mint card is a free hero." Chefe também dá cartão de invocação grátis.
- Mercado entre jogadores: "Trade with other players, bring your friends along and climb the board each season." "Epic, Legendary and Mythic heroes that are off the team, blacksmiths out of service and porters. List them in the game, and other players buy straight from you." Taxa do mercado: não encontrado.

### 2.6 Visual (FATO, tela vista em 2026-11-15 [O13])
Pixel art escura (fundo quase preto, texto branco e laranja, fontes "Jersey 10" e "Pixelify Sans"). A página mostra uma janela do calabouço visto DE CIMA: piso de pedra "Stone Halls" com tochas e estandartes vermelhos, um time de heróis pequenos (um com aura de fogo, um lanceiro, um mago roxo e outros), monstros pequenos (slimes verdes e azuis, um minotauro e outros) e números de dano flutuando (130, 106, 72, 178), com brilho de cor aos pés de cada herói pela raridade. Botão laranja "Play". Pensado para computador: "Made for your desktop browser."

### 2.7 O que faz bem e o que é risco (OPINIÃO)
- Faz bem: (1) laço claro (invoca, caça sozinho, consertar, fundir, chefe/raide); (2) chega a oferecer o jogo sem texto de lucro; (3) papéis de apoio (ferreiro, carregador, escudo, sucata) dão o que gerir; (4) raide ao vivo com 6 placares (um por raridade) e temporadas de 7 dias dão motivo para voltar; (5) fusão 4→1 deixa a sobra útil; (6) aviso anti-golpe de endereço do contrato; (7) caça lenta fora do jogo.
- Risco: (1) preço, chances, saque, oferta de token, equipe e roteiro não estão na página; (2) token pago pela caça e gasto no jogo, sem receita de fora (circular); (3) ~75% do token em 3 carteiras e liquidez fina na medida antiga [A17][A16]; (4) nota D em verificador automático [A15]; (5) "mint card" e indicação criam rede de convite.

---
## 3. Em conjunto

### 3.1 Em comum com o Bombcrypto (FATO e OPINIÃO)
- **Os dois novos copiam o Bombcrypto de formas diferentes.** Solana Bombers copia a MECÂNICA e as CHANCES (a mesma tabela de 04/04/2022: 82,87/10,36/5,18/1,04/0,51/0,04 [O9][O3]), o preço de herói (10 BCOIN × 2.500 = 25.000), os tipos de casa de descanso (Tiny a Super Villa), os 7 perks, o limite de 15 heróis, 3% no saque [O3]. Mini Hero copia só a ideia "herói que caça sozinho" e muda o resto (calabouço, ferreiro, raide).
- Bombcrypto, números oficiais [O9][O10] (para comparar): em abril de 2022 "19,852,842 BHeroes sold", mercado só de Super Legend e casas, taxa de 20% e venda só 7 dias depois do mint [O8][O9]; lista de atos proibidos: "Using Hack/Cheat tools or other software to interfere..." [O11]; um jogador no mesmo post: "Why don't you use captcha again? Please? There are many bot users who want to steal from us" [O11]. Último resumo trimestral oficial achado: 2º trimestre de 2025, com BCOIN lançado na Solana (Raydium) e temporadas de caça na TON e na Solana [O10]. (Novidade: o Substack do Bombcrypto agora abre; a versão anterior do dossiê dizia que não.)
- Diferenças que importam: Bombcrypto vendia NFT com mercado livre; Solana Bombers vende herói em token, com mercado só de raros e imposto de 28%, e tem freio diário do tesouro (o Bombcrypto tinha o "Reset ROI", mais complexo [O9]); Mini Hero nem fala de saque.
- Em comum com os dois: herói que trabalha e cansa, tela que enche sozinha, token como prêmio e como moeda de gasto, mercado de herói raro, indicação por herói grátis, pixel simples, entrada por carteira Solana.

### 3.2 Perfil do público (OPINIÃO, a partir do que os sites oferecem e dos guias em português [A6][A11])
Quer entrar rápido numa mecânica que já conhece (bomba/baú ou calabouço), ver número subindo sem esforço, revender herói raro e sair com token. Aceita risco alto e liquidez fina. Chega por vídeo de guia e divulgador, não por documentação. Há público brasileiro (vídeos em português [A6][A11] e apelidos em português no ranking de indicações [O5]). Quem fica é atraído por placar, evento de 4 dias e herói raro; quem sai é quem não vê o prêmio cobrir o custo (recarga, casa).

### 3.3 Cinco lições para um jogo cujo prêmio sai só de pote de receita real, com chance mostrada e sem promessa de lucro
1. **Chance na ajuda, não escondida:** o Solana Bombers publica a tabela inteira de chances e uma semente "committed" no próprio jogo [O2]; Mini Hero não publica nenhuma [O6]. Nós publicamos TODAS, na tela, já no dia 1, e ainda mostramos a semente depois da revelação.
2. **Prêmio pelo tamanho do pote, não por promessa:** o freio diário do tesouro do Solana Bombers (−15% empilhável, visível) é a ideia certa, mas o pote deles é feito de token dos próprios jogadores [O2][O3]. Nosso pote deve ser receita real recebida, e a tela deve mostrar "quanto o pote pagou ontem", nunca "quanto você ganha".
3. **Número fixo e anunciado:** o dono do Solana Bombers mudou preço do herói, mínimos do mercado e oferta de caixa mais de 6 vezes em 3 semanas, e o servidor guarda isso à vista [O3]. Isso quebra confiança; nossa regra (mudar no máximo 1 vez por semana, com aviso de 7 dias) é uma vantagem a destacar.
4. **Sem pressão de venda escondida nem azar com o ativo do jogador:** corte dos baús para 25% para quem não saca, 28% de multa de aposta e "Gamble Heroes" com 5% de perda total [O2] empurram o jogador a sair ou a apostar. Nada disso no nosso jogo: saque simples, sem punir quem fica, sem jogo de azar com criatura.
5. **Robô e conta alugada tratados desde o início, sem vender a saída:** os dois jogos têm robô (Solana Bombers bane e vende o Mordomo; Bombcrypto pediu captcha de volta [O2][O11]). Nós limitamos por conta, conferimos tudo no servidor e damos o "descansar sozinho" para todos (o que roda sozinho é parte do jogo, não produto pago).

---
## Não encontrado (depois de ler os sites oficiais)
- Solana Bombers: equipe com nomes, roteiro, whitepaper, termos, auditoria; oferta total e emissão do $BOMBERS; queima de token; saldo e entrada de dinheiro do tesouro; como o pote é abastecido além do que jogadores pagam; conta oficial no X; ganho real por dia por herói; relatos de golpe/atraso de saque; contrato do token antigo (`CZiwA...`) ligado ao novo (`5nZe5...`).
- Mini Hero: preço da invocação e dos itens; chances de invocação e do crítico de fusão; saque (mínimo, taxa, trava); oferta, emissão e queima do MHDG; taxa do mercado; equipe, data de lançamento, roteiro; número de jogadores.
- Ambos: tamanho real de comunidade (Discord, X); jogadores ativos além do contador do Solana Bombers (220 em 15 min).
- DappRadar: a rede liberou o endereço, mas o site respondeu 403 com a página "Just a moment... Enable JavaScript and cookies to continue" (proteção contra robô). Não tentei contornar.

## Fontes (consulta em 2026-11-15; hoje = 2026-11-15)
Oficiais:
[O1] https://www.solanabombers.fun/ — HTML, 2026-11-15 (título e meta description)
[O2] https://www.solanabombers.fun/_next/static/immutable/chunks/0k1t36xm0eqob.js — código do site (Codex/ajuda, telas), 2026-11-15, sem data própria
[O3] https://www.solanabombers.fun/api/config — rota pública de leitura do servidor: configuração, regras, oferta vendida, `paymentsMode`, `cc`; 2026-11-15 ~18:40 UTC
[O4] https://www.solanabombers.fun/api/online — jogadores ativos em 15 min, 2026-11-15 ~18:40 UTC
[O5] https://www.solanabombers.fun/api/referral/leaderboard — ranking de indicações (só usei a contagem), 2026-11-15
[O6] https://minihero.org/ — página estática; textos citados, 2026-11-15 (rodapé "© 2026")
[O7] https://minihero.org/js/main.js e os módulos em `/js/` — só animação da página, sem número de regra, 2026-11-15
[O8] https://bombcrypto.substack.com/p/marketplace-rules — 20/04/2022 (Bombcrypto)
[O9] https://bombcrypto.substack.com/p/bombcrypto-march-dev-update — 04/04/2022 (Bombcrypto)
[O10] https://bombcrypto.substack.com/p/bomb-crypto-quarterly-recap-q2-2025 — 01/07/2025 (Bombcrypto)
[O11] https://bombcrypto.substack.com/p/announcement-about-prohibited-acts — 08/02/2022 (Bombcrypto)
[O12] Tela de entrada do Solana Bombers vista com navegador (captura minha, 2026-11-15)
[O13] Página inicial do Mini Hero vista com navegador (captura minha, 2026-11-15)
Não oficiais, mantidas da versão parcial (resumos de busca; NÃO oficial; vale o que os sites oficiais dizem acima quando discordam):
[A1] https://playtoearn.com/blockchaingame/solana-bombers — sem data
[A2] https://web3gameshub.com/games/solana-bombers — sem data
[A3] (reservado, não usado)
[A4] https://solanacompass.com/tokens/CZiwA6eLUthZFLvTVEWG9v1K9Pc7p3eiBKRba2G7pump — dados até 08/10/2026
[A5] https://coinranking.com/coin/VSvZxx7G9vK+solanabombers-bombers — nov/2026
[A6] https://www.youtube.com/watch?v=MNbsPmHWdCc — só o título lido
[A7] https://jup.ag/tokens/CZiwA6eLUthZFLvTVEWG9v1K9Pc7p3eiBKRba2G7pump — nov/2026
[A8] https://www.coinbase.com/price/solana-bombers-solana-cziwa6eluthzflvtvewg9v1k9pc7p3eibkrba2g7pump-token — nov/2026
[A9] https://www.geckoterminal.com/solana/pools/7uQNr3qvET7GcVbA4bbpwevfaP4L3sttrJhxDugYgq41 — nov/2026
[A10] https://www.dextools.io/app/en/solana/pair-explorer/CZiwA6eLUthZFLvTVEWG9v1K9Pc7p3eiBKRba2G7pump — dados de 08/10/2026
[A11] https://www.youtube.com/watch?v=jxBJX0b1Cns — só o título lido
[A12] https://playtoearn.com/id/blockchaingame/mini-hero-dg2 — sem data
[A13] https://www.mexc.com/price/mini-hero-dg/info — nov/2026 (ficha de corretora)
[A14] https://pump.fun/coin/2fk5eGwAch1wGhsK3XhRUZpopXFGyRbFUn6XL4Yxpump — nov/2026
[A15] https://isthiscoinascam.com/check/mini-hero-dg — nov/2026 (verificador automático, nota D, segurança 23%)
[A16] https://www.coingecko.com/en/coins/mini-hero-dg — nov/2026 (preço ~US$ 0,00023–0,00028; valor de mercado ~US$ 222–281 mil; volume 24 h US$ 21.615 um dia)
[A17] https://solanacompass.com/tokens/2fk5eGwAch1wGhsK3XhRUZpopXFGyRbFUn6XL4Yxpump — nov/2026 (~992 holders; 3 maiores ~29,7%/22,5%/22,5%; queda ~37% em 24 h num dia; liquidez "muito fina")
[A18] https://games.polygon.technology/bomb-crypto — sem data

## Endereços fora da rede que valeria liberar (para o diretor pedir ao dono)
1. `dg.minihero.org` (o jogo do Mini Hero: preços, chances, saque e telas reais).
2. `pump.fun` (páginas dos 3 tokens: oferta, histórico, carteiras; MHDG, $BOMBERS `5nZe5...` e $AGS `GGGtV...`).
3. `solscan.io` ou `dexscreener.com` (oferta total, holders e liquidez de $BOMBERS novo e antigo).
4. `github.com` (repositórios `senspark/bombcrypto-contract-v2`, `-server-v2`, `-market-v2`, que o Solana Bombers cita como fonte das regras).
5. `x.com/MiniHeroDG` e `discord.gg/vaJ7Cn6u8R` / `discord.gg/F2d5BEY6mf` (comunidade e anúncios; só leitura, sem entrar).
6. `www.coingecko.com` (ficha do MHDG) e `playtoearn.com` (listagens e a premiação 2026 que o jogo cita).
7. `bombcrypto.medium.com` e `t.me/s/BombCryptoChannel` (fontes de regras citadas pelo Solana Bombers).
8. `dappradar.com` já está liberado mas devolve 403 por proteção contra robô; só vale se o dono achar que compensa.
