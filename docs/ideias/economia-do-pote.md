# Frayz — economia do pote — PROPOSTA RODADA 2 (para o "sim" do dono)

Desenho aprovado pelo dono em 14/11/2026 23:17 BRT ("sim, pote com os quatro reforços opção 1"). Esta rodada **não muda o desenho**: só mede caminhos novos e propõe números.
**Todo número aqui é PROPOSTA.** Nenhum vale até o "sim" do dono. Valores em **US$ ilustrativo** (unidade de conta). **Nada aqui é promessa de lucro**: é o que o simulador mostra com hipóteses de comportamento que só o beta confirma.
Simulador: `node tools/simular-economia.mjs --comparar` (arquivo `tools/simular-economia.mjs`, semente 42, 180 dias = 6 temporadas). Testes: `tests/servidor/economia-sim.test.js`.

## 1. Em 7 linhas (sem enfeite)
1. O pote **nunca pagou mais do que recebeu** em nenhum conjunto de números, em nenhum dos 4 casos (checado todo dia; o teste roda isso para TODO conjunto).
2. **Melhor achado: o farmador entra de graça**, jogando com time alugado. Ele não arrisca nada: 99,7% dos farmadores terminam no positivo (eram 67%) e o ganho no bolso por dia sobe de **US$ 0,16 para US$ 0,37** (ESTÁVEL). Mas isso **só funciona junto com o anti-bot**: sozinha, a entrada grátis deixa a fazenda de bots entrar de graça e tomar os times (só 43% dos farmadores acham time).
3. **Bots: de 27% do pote para 2–4%** com 30% de contas-bot, mesmo se a fazenda usar o nosso robô bom (o código dele é público).
4. **Teto que não dá para furar:** todo dólar que o farmador leva saiu do bolso de alguém. No ESTÁVEL entra de fora ~US$ 0,97 por jogador por dia; com metade do público sendo farmador, o farmador fica em **US$ 0,30–0,45 por dia** em qualquer conjunto honesto. Para dobrar isso é preciso o dobro de gasto de quem paga, para cada farmador — isso é o público, não um número nosso.
5. **Baleia: melhorou, mas a mediana continua no negativo** (−US$ 6,2/dia → −US$ 3,6/dia; baleias com retorno ≥ 0: 13% → 22%). O time novo alugado agora se paga **antes de aposentar** (70 dias, vida de 90) — na rodada 1 ele aposentava antes de se pagar (102 dias, vida de 60).
6. **Mercado entre jogadores continua pequeno** (0,2% → 0,6% da receita). Não achei jeito honesto de fazê-lo virar uma fonte grande.
7. **Nota da melhor opção: 87, não 95.** O que falta para 95 está na seção 4, item por item. Resumo: três coisas só se provam com gente de verdade (beta).

## 2. Opções (melhor primeiro)
| # | Opção | Nota | Farmador no bolso/dia (ESTÁVEL) | Baleia mediana/dia · % ≥ 0 | Bots (30%) | Caixa do estúdio (ESTÁVEL) |
|---|---|---|---|---|---|---|
| 1 | **R2 — equilibrado** (todos os caminhos + aluguel 55/40/5 + desgaste 1.800) | **87** | 0,37 (top 25%: 0,41) | −3,61 · 22% | 2,1% | 38 mil |
| 2 | R2_FARMADOR — mais para quem joga (aluguel 60/35/5, desgaste 1.200) | 86 | 0,38 (0,46) | −4,42 · 19% | 2,6% | 39 mil |
| 3 | R2_BALEIA — mais para quem investe em times (aluguel 50/45/5, desgaste 2.400) | 86 | 0,30 (0,36) | −2,81 · 29% | 1,8% | 33 mil |
| 4 | R1 — ficar como está | 71 | 0,16 (0,27) | −6,22 · 13% | 27,3% | 66 mil |
| — | Medido e descartado: lotação (vagas só enquanto o pote paga US$ 1,20 por time/dia) | 55 | 0,08; só 33% com time | −1,62 · 26% | 8,3% | 65 mil |

Conselheiros: economista 87 (este estudo). Guardião e diversão: o diretor chama antes de levar ao dono.
Direção: aprovar o R2 como ponto de partida **para o protótipo e o beta sem dinheiro**, e só travar números de dinheiro depois de medir as 4 coisas da seção 7.
O que muda se você aprovar: o simulador passa a usar o R2 como proposta; nada vai para o arquivo de configuração do jogo sem um novo "sim" número a número.
Trindade (o que o jogador sente): Dopamina 80 · Congruência 85 · Coerência 88.
```
sim, economia rodada 2 opção 1 (R2 equilibrado) como base do beta
```

## 3. O que mudou contra a rodada 1 (tabela `--comparar`, semente 42)
"No bolso por dia" = o que sacou + o saldo (já com a taxa de saque) − o que pôs de fora, dividido pelos dias em que esteve ativo (dia sem time conta como 0). É mais duro que o "ganha por dia" da rodada 1 (US$ 0,48), que não descontava a entrada nem a taxa de saque.

| | ENCHENTE R1 → R2 | ESTÁVEL R1 → R2 | FUGA R1 → R2 | 30% BOTS R1 → R2 |
|---|---|---|---|---|
| Farmador no bolso/dia — mediano | 0,12 → **0,31** | 0,16 → **0,37** | 0,18 → **0,40** | 0,07 → **0,29** |
| Farmador no bolso/dia — top 25% | 0,23 → 0,37 | 0,27 → 0,41 | 0,25 → 0,46 | 0,19 → 0,35 |
| Farmadores com time (temp. 2–6) | 86% → 95% | 93% → 96% | 92% → 94% | 90% → 95% |
| Dono: time novo se paga em (vida do boneco) | 113 d (60) → **81 d (90)** | 102 d (60) → **70 d (90)** | 81 d (60) → **59 d (90)** | 127 d (60) → **86 d (90)** |
| Dono: média de todos os times (custo real, com time parado) | 306 → 378 d | 297 → 376 d | 296 → 303 d | 356 → 387 d |
| Baleia mediana/dia (conta bonecos vivos) | −6,45 → −2,70 | −6,22 → −3,61 | −8,88 → −9,86 | −6,46 → −3,61 |
| Top 10 baleias/dia | 46,6 → 22,5 | 12,0 → 9,8 | 21,7 → 9,8 | 8,8 → 8,7 |
| Baleias com retorno ≥ 0 | 9% → 21% | 13% → 22% | 12% → 19% | 10% → 18% |
| % do pote para bots | 0 → 0 | 0 → 0 | 0 → 0 | **27,3% → 2,1%** (robô bom: 3,9%) |
| Taxa de mercado, % da receita | 0,2% → 0,7% | 0,2% → 0,6% | 0,1% → 0,5% | 0,2% → 0,7% |
| Caixa do estúdio no fim (após custos ilustrativos) | 214 mil → 164 mil | 66 mil → 38 mil | 78 mil → 47 mil | 46 mil → 24 mil |
| Pote pagou mais do que entrou? | **NUNCA** | **NUNCA** | **NUNCA** | **NUNCA** |

Outras sementes (7, 99, 2026), ESTÁVEL: farmador R2 0,28–0,37 (R1 0,09–0,16); bots R2 2,1–2,3% (R1 27–30%). Ruído: ±0,05/dia.
"Média de todos os times" fica alta porque conta os bonecos de origem (US$ 25 cada, comprados pela baleia ao entrar) e os dias em que o time fica parado; o número que decide se a baleia compra **mais** times é o do time novo.
Quem põe e quem tira (ESTÁVEL, 180 dias): farmadores R1 põem 22 mil e tiram 40 mil → R2 põem ~0 e tiram 31 mil (líquido +72%); médios R1 põem 84 mil e tiram 31 mil → R2 põem 72 mil e tiram 57 mil (o médio fica com 79% do que pôs, eram 37%); baleias R1 põem 159 mil e tiram 20 mil → R2 põem 191 mil e tiram 23 mil (+ saldo e bonecos).
Receita por fonte R2 (ESTÁVEL): origem das baleias 33% · leilão 15% · inscrições 13% · kit e reposição 12% · costura 9% · enfeites 5% · taxa de saque 5% · reparo 4% · passe 3% · aluguel 1% · mercado 1%.

## 4. Nota 87, item por item (e o que falta para 95)
| Item (peso) | R2 | Por quê | O que levaria a 95+ |
|---|---|---|---|
| Pote nunca paga mais; FUGA; reserva (20%) | 100 | NUNCA em todos os conjuntos e cenários, testado todo dia | — |
| Ganho por dia do farmador (20%) | 78 | 2,3× a rodada 1, mas US$ 0,37/dia ≈ US$ 11/mês | ≈ US$ 0,8/dia. Só com ~2× de gasto de quem paga, por farmador (público). Nenhum número nosso faz isso sem tirar de outro jogador |
| Velocidade de retorno do farmador (10%) | 100 | entrada zero: lucra desde o 1º saque; 99,7% no positivo | — |
| Farmador com time (10%) | 92 | 95–96%; na 1ª temporada 82% (ESTÁVEL) e 54% com bots | mais times no 1º mês (ex.: times de aluguel limitados à venda para baleias na pré-temporada) |
| Baleia (15%) | 72 | mediana −US$ 3,6/dia; 22% ≥ 0; time novo se paga em 70 d (vida 90) | mediana ≥ 0. Só se a baleia gastar menos em prestígio (enfeite, leilão) ou se os médios pagarem mais. É escolha da baleia, não furo da conta |
| Bots (10%) | 92 | 2–4% do pote com 30% de bots | provar no beta que o limite de contas barra ~65% e a detecção pega ~3%/dia (hoje são suposições) |
| Mercado (5%) | 60 | 0,6% da receita | só se trocar for divertido por si (coleção, partes raras); o dinheiro não precisa dele |
| Caixa do estúdio (5%) | 82 | positivo em todos, mas ~40% menor | — (é o preço de dar mais ao pote) |
| Coerência com as decisões (5%) | 100 | pote só de receita real, temporadas, desgaste, saque mais caro que reinvestir, reserva | — |

Conta: 0,2×100 + 0,2×78 + 0,1×100 + 0,1×92 + 0,15×72 + 0,1×92 + 0,05×60 + 0,05×82 + 0,05×100 = **86,9 → 87**. Pela mesma régua (que mede o que o dono pediu agora: ganho e retorno do farmador e da baleia), a rodada 1 dá **71** — a nota 88–91 dela era por outra régua (só "fecha a conta").
**Por que não 95:** os dois itens que mais pesam e ficam abaixo (ganho do farmador e baleia) esbarram no teto da seção 1, item 4: a soma do que os jogadores tiram é menor que a soma do que põem (o estúdio e a reserva ficam com uma parte). Farmador ganhando mais e baleia mediana no positivo ao mesmo tempo exigem que os médios e o gasto de prestígio paguem mais — isso só o beta mede. Mostrar 95 hoje seria inflar a nota.

## 5. Números propostos (R2) — só o que muda contra a rodada 1
| Número | Rodada 1 | **R2 (proposta)** | Medido isolado (ESTÁVEL, sobre o R1) |
|---|---|---|---|
| Entrada do farmador | 1 boneco (US$ 8) | **de graça**, só joga a Aventura com time alugado; fila visível | farmador 0,16 → 0,32/dia; com 30% de bots e sem anti-bot: bots 14,5% e só 43% com time |
| Aluguel (farmador / dono / taxa) | 65 / 30 / 5 | **55 / 40 / 5** | ver opções 2 e 3 |
| Desgaste até aposentar | 1.200 lutas (60 dias) | **1.800 lutas (90 dias)** | sozinho (com dono 40%, sem entrada grátis): farmador cai para 0,09 (o médio repõe menos e entra menos dinheiro) — só vale junto do resto |
| Máx. times de aluguel por baleia | 8 | **40** | — |
| Fatias da receita (pote / reserva / estúdio) | 55 / 15 / 30 | **estúdio 15% até US$ 150 mil de receita, 20% até 400 mil, 25% depois; reserva 12%; pote = o resto (73% → 68% → 63%)** | farmador 0,16 → 0,19; caixa 66 → 34 mil |
| Para onde vai a taxa de saque | 55 pote / 15 reserva / 30 estúdio | **20 / 10 / 70** (estúdio ganha mais no saque, menos na venda) | junto do item acima |
| Taxa de saque (idade da conta) | 25% · 15% · 10% · 6% (dias 0 · 15 · 45 · 90) | **30%** · 15% · 10% · 6% | junto do anti-bot |
| 1º saque | na hora | **depois de 7 dias de conta** (o saldo fica guardado) | anti-bot |
| Inscrição de ranking | US$ 20, única | **bronze US$ 5 · prata US$ 25 · ouro US$ 80**, cada faixa com o seu prêmio | top 10 das baleias sobe; farmador igual |
| Parte de ranking do pote geral | toda num ranking só | **50% bronze · 30% prata · 20% ouro** (prêmio "descendo") | — |
| Premiados | 25% dos inscritos, peso 1/posição^0,9 | **40%, peso 1/posição^0,7** (mais achatado) | ver item g na seção 6 |
| Passe de temporada | — | **US$ 10, só enfeite e prestígio, não dá ganho** (hipótese: 80% das baleias, 15% dos médios compram) | 3% da receita |
| Reparo opcional | — | **zerar o desgaste custa 90% do preço de um boneco novo** | 4% da receita; time da baleia dura mais |
| Leilão de partes raras/lendárias | 1 a cada 5 baleias por temporada | **1 a cada 3** | leilão 11% → 15% da receita |
| Enfeites da baleia | 5% da riqueza (hipótese) | 7% (hipótese) | — |
| Ganho por resultado (Aventura) | todo ponto paga igual | **só vitória pontua; fases F1–F5 pagam 1 · 1,25 · 1,8 · 2,4 · 2,8 por vitória; 3 vitórias seguidas = +50% na vitória**; teto de energia igual (20 lutas) | bots 27% → 22%; top 25% sobe |
| Anti-bot (fora da economia) | — | **1 conta por carteira + aparelho + verificação; detecção de comportamento; saldo de bot pego volta ao pote** | bots 27% → 4,5% |
| Não mudam | preço comum US$ 8 · origem US$ 25 · energia 20 lutas · Carretel 5 · costura US$ 4 × 1,25 · mercado 6% · liberação 10%/dia · teto US$ 0,04/ponto · reserva (piso 80%, 5%/dia, teto 30 dias) | | |

As fases foram **medidas no motor de batalha** (1.000 lutas por célula, time do jogador comum; F1 inimigo ganancioso comum · F2 ganancioso raro · F3 planejador comum · F4 planejador raro · F5 planejador lendário):

| | F1 | F2 | F3 | F4 | F5 |
|---|---|---|---|---|---|
| Bot simples (robô ganancioso) vence | 50,0% | 43,1% | 32,4% | 25,5% | 22,1% |
| Jogador bom (robô planejador) vence | 66,5% | 60,1% | 49,1% | 39,5% | 39,3% |

Com os pesos propostos, todo mundo escolhe F5. Por luta: **bom ganha 1,32 · mediano 1,00 · bot simples 0,70**. Ou seja, o bot simples deixa de ganhar 30% contra o mediano e 47% contra o bom. **Mas o robô bom está no repositório público**: uma fazenda que use ele ganha como o jogador bom. Pagar por resultado sozinho não segura bot; quem segura é o limite de contas e a detecção.

## 6. Cada caminho medido isolado (sobre o R1, semente 42)
| Caminho | Farmador no bolso/dia (ENCH · EST · FUGA · BOTS) | Com time | Time novo se paga (EST) | Baleia mediana · ≥ 0 (EST) | Bots | Mercado | Caixa (EST) |
|---|---|---|---|---|---|---|---|
| R1 | 0,12 · 0,16 · 0,18 · 0,07 | 86–93% | 102 d (vida 60) | −6,2 · 13% | 27,3% | 0,2% | 66 mil |
| a) farmador de graça + baleia locadora | 0,32 · 0,32 · 0,35 · 0,14 | 98–100% (com bots: **43%**) | 104 d (60) | −7,1 · 11% | **14,5%** | 0,3% | 53 mil |
| b) pote maior, estúdio subindo + saque ao estúdio | 0,15 · 0,19 · 0,22 · 0,12 | 84–91% | 93 d | −5,8 · 13% | 27,4% | 0,2% | 34 mil |
| c) faixas + passe + reparo + leilão maior | 0,13 · 0,15 · 0,18 · 0,09 | 83–92% | 93 d | −6,1 · 17% | 27,7% | 0,2% | 75 mil |
| d) ganho por resultado | 0,10 · 0,15 · 0,12 · 0,06 (top 25% sobe) | 82–94% | 98 d | −5,7 · 11% | 22,0% | 0,2% | 71 mil |
| e) anti-bot (limite + detecção + espera + taxa nova 30%) | 0,11 · 0,14 · 0,18 · 0,11 | 84–92% | 101 d | −6,9 · 10% | **4,5%** | 0,2% | 67 mil |
| f) mercado: formatura do farmador + criadores | 0,10 · 0,10 · 0,13 · 0,04 | 82–86% | 104 d | −6,4 · 15% | 27,9% | **0,7%** | 63 mil |
| g) ranking achatado (40%, expoente 0,5) | 0,12 · 0,15 · 0,17 · 0,07 | 84–94% | 104 d | −4,4 · 10% (top 10: 4,7/dia) | 26,7% | 0,2% | 65 mil |
| g) ranking concentrado (10%, expoente 1,3) | 0,11 · 0,14 · 0,18 · 0,07 | 82–92% | 103 d | −6,7 · 9% (top 10: 21,5/dia) | 26,4% | 0,2% | 63 mil |
| extra) lotação (vagas só se o pote paga US$ 1,20/time/dia) | 0,04 · 0,08 · 0,21 · 0,00 | **6–67%** | 63 d | −1,6 · 26% | 8,3% | 0,3% | 65 mil |
| extra) desgaste 1.800 + dono 40% (sem entrada grátis) | 0,04 · 0,09 · 0,15 · 0,01 | 82–96% | 82 d (90) | −4,4 · 13% | 26,0% | 0,2% | 61 mil |
| R2 sem anti-bot (para ver o peso dele) | 0,31 · 0,35 · 0,38 · **0,17** | 63% com bots | 71 d (90) | −3,2 · 21% | **10,6%** | 0,6% | 4,7 mil com bots |

O que cada um ensinou:
- **a) Retorno do dono (o número que faz a baleia comprar times):** a parte do dono por time alugado fica em ~US$ 0,19–0,41/dia em qualquer conjunto. Um time novo de 3 comuns (US$ 24) leva 59–127 dias para se pagar. Com vida de 60 dias (R1) ele **aposenta antes de se pagar** — por isso a baleia locadora do simulador nunca comprou time novo (só aluga o que já tem). Com 90 dias de vida (R2) se paga e sobra ~30%; com 120 dias e dono 45% (opção 3) sobra ~80%. Oferta × demanda: com as baleias atuais sobra time (ocupação 67–74%), então a fila só aperta na 1ª temporada.
- **b)** Cada 10 pontos tirados do estúdio dão ~+13% ao farmador e custam ~30% do caixa. O estúdio fica positivo em todos os casos, mas com pouca folga com bots (24 mil).
- **c)** As fontes novas enchem o pote (leilão, passe, reparo ≈ 22% da receita juntos), mas quem paga é a própria baleia; mudam pouco o farmador. São gasto de prestígio: **é hipótese que a baleia compre** (só o beta mede).
- **d)** Pagar por vitória espalha o ganho: bom 1,32 × mediano 1,00 × bot simples 0,70 por luta. Sozinho, o mediano perde um pouco para o bom.
- **e)** O anti-bot é o que mais mexe nos bots. Eficácia × bots no pote (R2, fazenda com o robô BOM, 30% de bots, sementes 42 e 7):

| detecção por dia ↓ / contas-bot que passam o limite → | 100% | 60% | 35% | 20% |
|---|---|---|---|---|
| nenhuma | 16,8% | 13,2% | 9,3% | 6,4% |
| 1%/dia | 13,5% | 10,3% | 6,2% | 4,1% |
| 3%/dia | 9,1% | 6,0% | **4,2%** | 2,6% |

**Fronteira:** abaixo de 10% exige barrar ≥ 40% das contas-bot na criação **ou** detectar ≥ 3% por dia. Sem nenhuma das duas, a entrada grátis piora os bots (10–17%).
- **f)** Mesmo com 35% dos farmadores juntando para comprar time próprio ("formatura") e médios criadores, o mercado fica em 0,6–0,7% da receita. Taxa maior não ajuda (volume pequeno). O dinheiro do jogo gira na loja, costura e reparo, não no mercado.
- **g)** Achatar ou concentrar o ranking **não muda a baleia mediana** (6–15% ≥ 0 nos dois). Concentrar só faz o top 10 ganhar 4× mais (21,5 × 4,7/dia). Proposta: meio-termo (40%, expoente 0,7) — o top 10 continua com ~US$ 10/dia e mais baleias das faixas de baixo levam algo.
- **Lotação (descartada):** limitar vagas para cada time pagar mais faz o time novo se pagar em 63 dias, mas deixa 33–94% dos farmadores sem time e eles saem. O total que o pote paga é o mesmo; só muda quem leva.

## 7. Onde ainda quebra (e o que só o beta mede)
Onde quebra:
1. **FUGA para a baleia:** a mediana cai para −US$ 9,9/dia (ela comprou times que ficam parados quando os farmadores somem). O pote não quebra; quem ficou ganha mais (farmador 0,40/dia).
2. **1ª temporada com bots:** só 54% dos farmadores acham time no 1º mês (bots disputam a fila antes de serem pegos).
3. **Caixa do estúdio com bots:** 24 mil em 180 dias (R1: 46 mil) — positivo, mas fino, com custo ilustrativo de US$ 150/dia.
4. **Se a fazenda roda o robô bom** (código público): bots 3,9% em vez de 2,1%. Ainda abaixo de 10% por causa do limite de contas e da detecção.
5. **Se o público for só de sacadores** (sem médios que pagam por diversão), o ganho do farmador cai junto com a receita. O pote encolhe, não quebra.

Só se mede com jogadores de verdade (beta sem dinheiro, pontos de brinquedo):
1. Proporção real baleia : médio : farmador e quanto o médio gasta por dia (decide o teto do farmador).
2. Se as baleias compram passe, enfeite, leilão e reparo nos valores supostos (≈ 27% da receita do R2 depende disso).
3. Eficácia real do limite de contas e da detecção (as duas suposições: 65% barradas, 3%/dia pegas).
4. Taxa de vitória de humanos nas fases F1–F5 (o motor mede robôs, não gente) e quanto tempo o farmador espera na fila antes de desistir.

## 8. O que o dono decide (cada item com recomendação)
| # | Decisão | Recomendação |
|---|---|---|
| 1 | Farmador entra de graça (só Aventura com time alugado; fila visível) | **Sim — mas só junto com o item 2** |
| 2 | Pacote anti-bot: 1 conta por carteira + aparelho + verificação, detecção de comportamento, 1º saque após 7 dias, saque 30% nos primeiros 14 dias, saldo de bot pego volta ao pote | **Sim** (sem ele a entrada grátis dá 10–17% do pote aos bots) |
| 3 | Lado do aluguel e do desgaste | **R2: 55/40/5 e 1.800 lutas** (alternativas: opção 2 farmador, opção 3 baleia) |
| 4 | Estúdio menor no começo (15% → 20% → 25% por volume), reserva 12%, taxa de saque 70% para o estúdio | **Sim**; o caixa cai ~40%, positivo em todos os casos |
| 5 | Ranking por faixas (bronze 5 · prata 25 · ouro 80), prêmio descendo 50/30/20, 40% premiados | **Sim** |
| 6 | Passe de temporada US$ 10 (só enfeite) e reparo opcional (90% do preço novo) | **Sim**, marcados como hipótese até o beta |
| 7 | Ganho por resultado (só vitória pontua, F1–F5 pagam 1 a 2,8, sequência de 3 = +50%) | **Sim** |
| 8 | Lotação de vagas | **Não** |
| 9 | Em que moeda o pote guarda o valor (vem da rodada 1, segue aberto) | pote guardado em valor fixo e pago em token pelo preço do dia |
| 10 | Beta sem dinheiro antes de travar qualquer número de dinheiro | **Sim** — é o que falta para a nota 95 |

Linha pronta para o `docs/decisions.md` (só depois do "sim"):
`- dd/mm/2026 hh:mm BRT — economia rodada 2: R2 equilibrado como base do beta (farmador de graça com aluguel 55/40/5, desgaste 1.800, estúdio 15→25% por volume, faixas de ranking, ganho por resultado, pacote anti-bot); números de dinheiro só travam depois do beta — "<frase do dono>" (conversa)`

## 9. Como rodar
- `node tools/simular-economia.mjs --comparar` — R1 × R2 × R2 com bot forte, nos 4 cenários (a tabela da seção 3).
- `node tools/simular-economia.mjs --comparar R1,A_GRATIS,B_FATIA,C_FONTES,D_RESULTADO,E_ANTIBOT,F_MERCADO,G_ACHATADO,G_CONCENTRADO,H_LOTACAO,I_VIDA,R2,R2_FARMADOR,R2_BALEIA,R2+BOT_FORTE,R2+SEM_ANTIBOT` — tudo (seção 6).
- `node tools/simular-economia.mjs --conjunto R2 --cenario FUGA` — temporada a temporada. `--semente 7 --escala 0.5 --json` também valem.
- `npm run simular:economia` continua mostrando o R1 (a proposta anterior), igual à rodada 1.
- Parâmetros num objeto único no topo do arquivo (`PARAMETROS`, todos PROPOSTA); cada conjunto é uma lista de trocas (`CONJUNTOS`, `VARIACOES`). Este simulador não é o arquivo de configuração do jogo.
- O que é hipótese de comportamento (não é número do jogo): mistura de público, saída por dia, quanto cada tipo saca, riqueza da baleia, quem compra passe/enfeite, 35% dos farmadores que juntam para ter time próprio, a regra da baleia locadora (só compra time novo se ele se paga em ≤ 40 dias).

## Anexo — rodada 1 (para comparar)
Fatias 55/15/30; pote 85% Aventura / 15% ranking (+85% das inscrições); aluguel 65/30/5; boneco comum US$ 8 (farmador entrava com 1); origem US$ 25; energia 20; desgaste 1.200; Carretel 5; costura US$ 4 × 1,25; mercado 6%; inscrição US$ 20; saque 25/15/10/6%; liberação 10%/dia, teto US$ 0,04/ponto; reserva piso 80%, 5%/dia, teto 30 dias, metade da sobra da temporada. Resultado e pontos fracos: seção 3 (coluna R1) e seção 6 (linha R1). O conjunto `R1` do simulador reproduz a rodada 1 exatamente (o teste confere).
