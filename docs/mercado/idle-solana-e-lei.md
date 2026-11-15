# Dossiê 40: idle, Solana, venda entre jogadores e lei (2026-11-15)
Aviso: pesquisa de mercado, NÃO é parecer jurídico. Outros jogos são só referência de gênero (nada vira nome, arte ou regra nossa). Com o jogador: token, nunca lucro.
Método: `WebFetch` não abriu nenhum site (steampowered, pcgamer, gamesradar, coindesk: "não abriu", rede barrada). Tudo veio de resultados de busca (trechos). Número de fonte não oficial vem marcado. Não repete `docs/ideias/pesquisa-idle.md`: aprofunda.

## A. Task Bar Hero (TBH)
**Laço (FATO).** Jogo grátis, lançado em 27/05/2026, roda na barra de tarefas; heróis lutam e pegam loot sozinhos [1][2]. Itens vão ao inventário da Steam e podem ser vendidos no Mercado da Steam por saldo Steam (só gasta na Steam, sem saque em dinheiro) [3][4]. O "Cube System" mexe nos atributos dos itens e liga a craft ao que se compra no mercado [5]. Limite de venda: 4 vagas de anúncio com espera de 8 h entre elas (guia, não oficial) [4].
**Números.**
| Dado | Valor | Fonte |
|---|---|---|
| Pico simultâneo | 526.572 em 14/06/2026; trackers depois: 545.349 a 546.130 | [6][7] |
| Antes do pico | ~140 mil (Inven), 164 mil (GamesRadar), 200 mil (agregador) | [8][9][10] |
| Queda | 30 dias: -10,9% (SteamCharts, sem data); 107.689 média 30 dias (ActivePlayer, sem data) | [7][11] |
| Jogando agora | 188.826 (22/07) e 168.752 (28/07) em sites de contagem | [7] |
| Reviews | Steam: 62% positivas de 8.854 (inglês); últimos 30 dias 56% de 1.207; Notebookcheck cita 50% | [3][4] |
| Mensal (ago a out) | não encontrado | |
**Elogiam:** arte pixel, laço leve que roda enquanto se faz outra coisa, 4 sistemas de melhoria em camadas, mercado como ponto forte, exigência baixa de máquina [3][4].
**Reclamam:** ganhar saldo Steam ("dinheiro fácil", comparam itens a NFT); queda de drop depois do mercado ("nerf silencioso"); sensação de ter que comprar DLC para dropar/subir melhor; conta bloqueada sem explicação e sem resposta; atraso de sincronia com o inventário Steam. São relatos de jogadores, não verificados [3][4].
**Bots (FATO de imprensa).** O loot vendável atraiu bots e fazendas de ouro; servidores de itens da Steam sofreram; os devs pediram desculpas à Valve e a jogadores e reduziram quantos itens podiam ser vendidos [8][9][12][13]. Banimento do Mercado para conta pega fazendo trapaça 2 vezes; critérios vagos geraram revolta e depois abriram um processo de recurso [14]. Em jul/2026 leilão de itens de alto nível foi desligado por duplicação e anúncios fraudulentos (artigo de agregador) [5]. O texto da fala oficial do estúdio: não encontrado.
**Receita (parcial).** Grátis; "pacote apoiador" (pets e bônus) e DLC que reviewers dizem afetar drop e XP [3][4]. Divisão de receita e faturamento: não encontrado. A taxa do Mercado da Steam (15%): não confirmada nas fontes abertas.
**O que explica o sucesso (OPINIÃO, ligada aos fatos acima):**
1. Custo zero de atenção: roda numa janelinha enquanto a pessoa trabalha [1][3].
2. Entrada grátis e leve, sem carteira nem cadastro novo: a Steam já tem pagamento e inventário [3][4].
3. Item que vira saldo real (mesmo preso na Steam): motivo para ficar e para contar aos amigos [3][4].
4. Efeito de imprensa e "dinheiro fácil": notícia de vendas de itens e de bots puxou audiência (conteúdo viral) [6][8].
5. Pixel art e progressão em camadas dão o "só mais um" sem exigir habilidade [3][4].
Contra: reviews 50% a 62%, bots, banimentos e queda depois do pico mostram que o modelo cansa e dói quando o item vale dinheiro.

## B. Jogos com token na Solana (2025 a 2026)
| Tema | Fato | Fonte |
|---|---|---|
| Solana geral | média de 3,2 mi de carteiras ativas por dia em 2025 (post da Solana); 4,1 mi por dia no 3º tri/2026; 1,88 mi endereços únicos em 09/10/2026 (outro rastreador, não comparar) | [15][16] |
| Taxa | tarifa base 5.000 lamports (0,000005 SOL) por assinatura; média citada de US$ 0,0006 a 0,001; picos de US$ 0,013 a 0,017 com taxa de prioridade | [17] |
| Velocidade | meta de 400 ms por bloco: não confirmada nas buscas | |
| Jogos web3 (todas as redes) | 5,8 mi carteiras/dia no 1º tri/2025, 4,8 mi no 2º, 4,66 mi no 3º (DappRadar). Líder em carteiras: opBNB, não Solana | [18] |
| Fatia de jogos na Solana | ~25% da atividade on-chain no 3º tri/2025 (citando DappRadar, via imprensa); 340 mil carteiras/dia do Star Atlas em mar/2026 (blog pequeno, verificar) | [19][20] |
| Mais ativos (Solana) | Star Atlas (MMO espacial), Aurory, Honeyland, MixMob, Photo Finish Live; Kintara (MMO isométrico no navegador, lançado 22/05/2026, ~20,5 mil jogadores/mês, uma fonte) | [21][22] |
| Mortalidade | ChainPlay: 93% de 3.279 projetos GameFi "mortos" (fechados ou abandonados) no fim de 2024. Caladan (abr/2026): >90% falharam, token ~-95% do pico, ~3.200 projetos. DappRadar via imprensa: 300+ jogos encerrados | [23][24] |
| Capital | fontes divergem (US$ 859 mi em 2024 vs ~US$ 360 mi em 2025); tratar com cautela | [23] |
**Lançadores de token (pump.fun e similares).** Criação sem permissão; curva de preço desde o início; ~1 bilhão de supply, ~800 mi na curva; ao esgotar a curva o token "gradua" para a PumpSwap (2025). Taxas, limite de graduação e taxa do criador: fontes se contradizem (1% a 1,25% na curva; 0,25% na PumpSwap) [25]. Regra que trave projeto de jogo: não encontrada; fonte oficial da pump.fun: não abriu. FATO relevante: lançador de moeda de meme dá preço e especulação desde o minuto 1, sem lastro de jogo (OPINIÃO: choca com "prêmio só de pote de receita").
**O que o público Solana joga:** o ranking confiável por jogadores: não encontrado. Sinal: MMO no navegador, espaço, fazenda social e arcade; uma fonte diz que os usuários passam a ligar mais para jogabilidade que para recompensa e que o rumo é grátis com ativos opcionais [21][22]. Um texto da Blockworks (sem data) diz que a Solana "não é gaming-first" e que muitos jogos "nunca saíram" [26].

## C. Venda por dinheiro real entre jogadores (RMT) e "idle com ganho"
- **Tamanho:** sem dado auditado. Estimativa de empresa de skins: US$ 40 bi por ano em cosméticos (DMarket, via Delphi; interesse comercial) [27]. Total de RMT geral: não encontrado.
- **Durável fora de cripto (FATO):** o Mercado da Steam com skins de CS (acadêmico: jogadores ganham dinheiro por ele) [27]. Fica em pé porque: item é cosmético (sem poder), oferta é controlada pelo dono do jogo, a plataforma segura pagamento e antifraude, e o saldo fica dentro da Steam [3][27]. TBH repete o modelo de saldo preso à Steam e mesmo assim teve bots e queda de drop [3][8][12].
- **Fracasso instrutivo (FATO):** casa de leilão com dinheiro real do Diablo III foi feita "por segurança, não por lucro" (duplicação e venda de ouro), rendeu no máx. ~US$ 15 mi e foi fechada na expansão de 2014 [28]. Observação (OPINIÃO): mercado oficial acaba com a fraude de terceiros, mas traz a do próprio jogo.
- **Estudo de RMT (NCSoft):** mercado de RMT virou monopólio de poucos grandes fornecedores [27]. (OPINIÃO: bots em escala vencem o jogador comum.)
- **Axie e cópias:** ver `docs/ideias/pesquisa-idle.md` seção 2 (não repito).
- **O que diferencia o que dura (OPINIÃO, a partir dos fatos):** item preso a um mercado com dono e regras; limite de venda por conta [4]; cosmético, não poder [27]; o prêmio não depende de entrada de novo jogador.
- **Duração de casos "idle com ganho" em cripto:** não encontrado dado de retenção.

## D. Lei e plataformas (visão geral; EXIGE ADVOGADO antes de qualquer sorteio pago)
| Lugar | O que dizem as fontes | Fonte |
|---|---|---|
| EUA | sem lei federal de loot box. Teste usual de azar: aposta (consideração) + prêmio de valor + sorte, os três juntos. A briga é se item virtual sem saque é "prêmio". FTC: Genshin pagou US$ 20 mi (menores de 16 e chances/custos enganosos; via blog jurídico) | [29][30] |
| Bélgica | Comissão de Jogos tratou loot box paga como jogo de azar; multas até €800 mil e prisão (blog). Tribunal de Antuérpia (LS v Apple) tratou como jogo de azar | [29][31] |
| Holanda | autoridade disse que é azar; tribunal depois olhou o jogo todo, não só a caixa; fontes divergem, status incerto | [29][31] |
| UE | Lei de Equidade Digital: proposta noticiada para 10 ou 11/11/2026; leaks falam em proibir loot box paga, moeda interna e pay-to-win onde há menor, e mostrar chances. Não confirmei texto formal; PEGI 16 para jogos com loot box (a partir de junho, ano não confirmado) | [32][33] |
| Reino Unido | Comissão: loot box sem saque "provavelmente não é azar licenciável"; governo (dez/2025) não vai tratar como azar; código do setor (ago/2023): avisar nos anúncios que tem caixa paga. Comitê DCMS (jun/2025) pediu proibir venda a menores. Skins gambling (sites externos) é azar e precisa de licença | [34] |
| Japão | "kompu gacha" (completar conjunto para ganhar prêmio) proibido em 2012 por regra de consumo; gacha comum avaliado caso a caso | [29] |
| Coreia / China | divulgação de chances obrigatória; Coreia multou ~US$ 900 mil em 2018 por chances erradas; China limita caixas por dia (30, blog) | [29] |
| Brasil | Lei 14.790/2023: aposta de quota fixa = modalidade lotérica; só empresa brasileira autorizada pela Fazenda; objeto: evento esportivo real ou "evento virtual de jogos on-line". ECA Digital (Lei 15.211/2025, em vigor 17/03/2026): art. 20 proíbe caixa de recompensa em jogo para menores ou de provável acesso por eles; definição: item aleatório obtido mediante pagamento. Decreto 12.880/2026: verificação de idade. Multa até 10% do faturamento no Brasil, teto R$ 50 mi por infração. Ministério da Justiça pediu à ANPD que olhe 6 jogos (CS2, Call of Duty, Genshin...). Regra específica da ANPD e multas a loot box: não encontradas | [35][36][37][38] |
**O que costuma manter fora de "azar" (OPINIÃO baseada nos fatos):** (1) item sem saque em dinheiro (UK, EUA: a briga é o "prêmio") [29][34]; (2) chances divulgadas (Coreia, China; UE proposta) [29][32]; (3) sem compra direta do sorteio (Bélgica, Brasil focam em caixa paga) [29][37]; (4) bloqueio de menores e checagem de idade (Brasil, UE, FTC) [30][37]. Nosso caso piora (1): se o item vale dinheiro (token ou mercado), o "prêmio" fica forte. Nenhuma fonte diz que só um desses pontos basta.
**Plataformas.** Steam: desde out/2021 proíbe jogo "que emite ou permite troca de cripto ou NFT" (confirmar regra atual no Steamworks) [39]. Google Play: permite NFT e ativo tokenizado, exige avisar que é jogo blockchain, proíbe "promover ou glamorizar ganho", proíbe dinheiro por chance de ganhar NFT sem elegibilidade de azar, proíbe minerar no aparelho (data do anúncio, 2023; vigência atual não conferida) [40]. Apple: "mais restritiva", regra atual não encontrada. Anúncios (Meta, Google Ads) para jogo com cripto em 2026: não encontrado.
**Idade:** Brasil exige verificação em jogo com caixa de recompensa [37]; UE/UK: recomendações e PEGI [32][34]. Conta de menor fora do sorteio é o caminho comum (OPINIÃO).
**EXIGE ADVOGADO:** (a) se ovo pago que dá criatura vendável é "caixa de recompensa" no Brasil (art. 2 e 20 da Lei 15.211) ou "aposta"/loteria (Lei 14.790); (b) Bélgica/Holanda/UE se houver usuário lá; (c) token pago como "prêmio" e pote de receita como possível valor mobiliário ou loteria (não pesquisado; área cripto de cada país); (d) regras de loja e anúncio; (e) imposto sobre prêmio (15% no IR sobre prêmio de aposta no Brasil, só na Lei 14.790 [36]).

## E. Recomendações para o nosso jogo (cada uma ligada a fato)
1. **Item da criatura em mercado só com dono e limite por conta** (4 anúncios, 8 h) como o TBH acabou fazendo [4][14]. Fato: bots e Mercado sob carga [8][12].
2. **Não vender o ovo diretamente com dinheiro para quem for menor ou sem checagem; pôr chances na tela.** Fato: ECA Digital art. 20 e decreto [37]; chances obrigatórias Coreia/China [29].
3. **Preferir ganhar o ovo por jogo e vender só cosmético e partes sem poder de batalha.** Fato: o que dura na Steam é cosmético [27]; "dinheiro fácil" gerou crítica [3].
4. **Defesa contra bots: prêmio por tempo de jogo real, 1 conta por carteira, banir com processo de recurso escrito.** Fato: bans vagos geraram revolta; depois houve recurso [14].
5. **Nunca mudar drop em silêncio:** anunciar mudança com 7 dias (já é regra da casa). Fato: "nerf silencioso" é a queixa central [3].
6. **Não lançar o token por lançador de moeda de meme** antes de haver pote de receita. Fato: curva e especulação desde o início, taxas incertas [25]; 93% dos projetos "mortos" [23].
7. **Não prometer ganho em texto de loja e de anúncio** ("jogar para ganhar"). Fato: Google Play proíbe glamorizar ganho [40]; Steam proíbe cripto/NFT [39]. Distribuir só pela web no beta.
8. **Contratar advogado do Brasil para os 5 pontos da seção D antes de qualquer teste com prêmio.** Fato: lei de 2026 em vigor e fiscalização ligada [37][38]. (Decisão e dinheiro: do dono.)
**5 números por semana no beta:** (1) jogadores que voltam no dia 7 e no dia 30 (TBH caiu depois do pico [7][11]); (2) contas suspeitas de bot / contas por carteira (bots do TBH [8]); (3) % de itens vendidos entre jogadores e preço mediano por tipo; (4) pote de receita real vs. token pago por dia (modelo do Axie quebrou por emissão [pesquisa-idle]); (5) % de reviews/feedback positivos e motivos de reclamação (TBH 50% a 62% [3][4]).

## Não encontrado
Mensal do TBH ago a out; fala oficial do estúdio; divisão de receita do TBH; taxa de 15% da Steam; ranking confiável de jogos Solana por jogadores; regra da pump.fun para jogos; bloco de 400 ms confirmado; regra atual da Apple; anúncios Meta/Google 2026; texto formal da proposta da UE; decisão atual da Holanda; Japão e Coreia em fonte oficial; tamanho total de RMT; leis de cripto/valor mobiliário (não pesquisadas).

## Fontes (acesso: 2026-11-15; sem data = a página não mostrava)
[1] https://labs.invenglobal.com/articles/22636/taskbar-hero-the-viral-game-hitting-2-in-steam-concurrent-players — 2026 (não oficial)
[2] https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero — oficial, não abriu (via busca)
[3] https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/ — oficial, números de reviews via busca, sem data
[4] https://www.dtgre.com/2026/05/tbh-task-bar-hero-worth-playing.html e https://www.notebookcheck.net/No-2-on-Steam-Viral-free-to-play-game-lets-players-earn-Steam-Wallet-credit.1323684.0.html — 05/2026 (não oficial)
[5] https://games.gg/pt-BR/news/task-bar-hero-normaliza-a-negociação-de-itens-por-dinheiro-real-na-steam/ — 07/2026 (não oficial)
[6] https://allthings.how/task-bar-hero-tops-526000-concurrent-steam-players-amid-mixed-reviews/ — 06/2026 (não oficial)
[7] https://steamcharts.com/app/3678970 e https://raijin.gg/app/3678970/TBH_Task_Bar_Hero e https://tracker.gg/population/steam/3678970 — 07/2026 (rastreadores)
[8] https://www.invenglobal.com/articles/22394/popular-idle-game-taskbar-hero-hits-140k-concurrent-users-but-gold-farmers-and-cheaters-leave-players-paying-the-price — 2026 (imprensa)
[9] https://www.gamesradar.com/games/rpg/rpg-devs-apologize-to-steam-staff-and-all-of-our-players-after-their-game-draws-164-000-concurrent-players-and-starts-breaking-valves-marketplace/ — 2026 (imprensa, não abriu)
[10] https://www.pulse.bot/gaming/news/free-pixel-art-idler-rpg-task-bar-hero-has-more-than-200000-players-on-steam-7554ee51-5a6e-4912-8930-e6ee9201bb29/ — 2026
[11] https://activeplayer.io/tbh-task-bar-hero/ — sem data
[12] https://kotaku.com/steams-latest-chart-topping-idle-game-is-packed-with-bots-trying-to-sell-in-game-weapons-for-1000-2000706738 — 2026 (imprensa)
[13] https://pcgamer.com/games/steams-second-most-played-game-right-now-is-reportedly-a-bot-filled-marketplace-that-can-get-you-banned/ — 2026 (imprensa, não abriu)
[14] https://opencritic.com/news/32292/players-are-facing-random-bans-in-one-of-2026-s-most-played-games-developer-suggests-theyre-not-as-random-as-you-think — 2026
[15] https://www.quicknode.com/blog/solana-ecosystem-report-h1-2025 — 2025 (não oficial)
[16] https://cryptobriefing.com/solana-14-billion-transactions-q3-2026/ e https://cryptobriefing.com/solana-active-addresses-13-month-high/ — 10/2026
[17] https://sanctum.so/blog/solana-transaction-fees-explained-why-so-low e https://xgram.io/blog/solana-fees-explained-what-a-sol-transaction-really-costs-in-2026 — 2026 (não oficial)
[18] https://dappradar.com/blog/state-of-blockchain-gaming-q3-2025 (e Q1, Q2 2025 no mesmo domínio) — 2025
[19] https://crypto.news/over-25-of-on-chain-activity-in-q3-driven-by-blockchain-gaming-data-shows/ — 2025 (imprensa)
[20] https://blockeden.xyz/blog/2026/01/28/solana-27-million-active-addresses-defi-resurgence-institutional-adoption/ — 2026 (blog)
[21] https://learn.backpack.exchange/articles/best-solana-games-2025 — 2025 (não oficial)
[22] https://cryptobriefing.com/kintara-solana-gaming-revival-20000-players/ — 2026 (uma fonte)
[23] https://dailycoin.com/gamefi-collapse-deepens-93-of-web3-games-fail-funding-evaporates/ e https://blog.kowatek.com/?p=86274 — 2025 (ChainPlay via imprensa)
[24] https://www.coindesk.com/markets/2026/04/23/more-than-90-of-web3-games-failed-after-usd15-billion-boom-as-gamers-never-showed-up-caladan — 23/04/2026 (imprensa, não abriu)
[25] https://madeonsol.com/blog/what-is-pumpswap e https://datawallet.com/crypto/what-is-pump-fun-and-create-a-coin — 2026 (não oficial; docs oficiais não abriram)
[26] https://blockworks.com/news/lightspeed-newsletter-solana-gaming-lacking — sem data
[27] https://members.delphidigital.io/reports/exploring-web3s-implications-for-multi-billion-dollar-in-game-item-economies e https://ar5iv.labs.arxiv.org/html/1801.06368 — sem data / 2018
[28] https://www.tweaktown.com/news/89207/blizzards-worst-creation-didnt-make-much-money/index.html e https://gamesbeat.com/meet-the-gamers-who-earned-big-in-the-now-closed-diablo-iii-real-money-auction-house/2 — 2014 a 2022
[29] https://www.pcgamer.com/the-legal-status-of-loot-boxes-around-the-world-and-whats-next e https://blog.promise.legal/loot-box-laws-game-developers/ — não oficial, blog jurídico
[30] https://gammalaw.com/how-does-us-consumer-protection-law-apply-to-video-game-loot-boxes-and-gacha-mechanics/ — 2025/2026 (blog jurídico)
[31] https://www.mondaq.com/article/1502744/legal-risks-of-loot-boxes-%E2%80%93-part-ii e https://scl.org/?p=5257 — não oficial
[32] https://www.pocketgamer.biz/leaked-eu-proposal-targets-loot-boxes-and-addictive-game-design e https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/the-eus-proposed-digital-fairness-act-a-game-developers-guide-to-potential-imp-102ltio — 2026
[33] https://www.osborneclarke.com/insights/games-loot-boxes-get-16-plus-age-rating-europe-under-pegi-overhaul — sem data
[34] https://parentzone.org.uk/article/whats-wrong-governments-announcement-loot-boxes e https://www.rpclegal.com/snapshots/consumer/winter-2025/uk-government-publishes-rapid-evidence-review-on-skins-gambling/ — 12/2025
[35] https://www2.camara.leg.br/legin/fed/lei/2023/lei-14790-29-dezembro-2023-795206-norma-pl.html — 29/12/2023 (oficial)
[36] https://www.migalhas.com.br/depeso/417123/analise-da-regulamentacao-das-casas-de-apostas-de-quotas-fixas — não oficial
[37] https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/estatuto-digital-da-crianca-e-do-adolescente-lei-n-15-211-2025-entra-em-vigor-em-17-de-marco-de-2026 e https://agenciagov.ebc.com.br/noticias/202603/lula-assina-decretos-que-regulamentam-eca-digital-conheca-em-10-pontos-a-nova-lei — 03/2026
[38] https://www.correiodamanha.com.br/economia/justica/2026/10/amp/327183-governo-pede-investigacao-de-seis-jogos-por-risco-de-apostas-a-menores.html — 10/2026
[39] https://www.engadget.com/steam-ban-cryptocurrency-nft-trading-blockchain-valve-165038811.html — 10/2021
[40] https://decrypt.co/148331/google-android-play-store-games-apps-nfts?amp=1 e https://support.google.com/googleplay/android-developer/answer/16302285 — 2023 (política oficial, não aberta)
