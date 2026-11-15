# Experimentos das patrulhas (tarefa 33)

15/11/2026, medido no simulador `tools/experimentos-patrulhas.mjs`. **Nada mudou no jogo.** `shared/config.js` está igual. O motor só ganhou um parâmetro opcional de experimento (`regras`). Sem ele, as lutas saem iguais, bit a bit: 200 lutas gravadas antes da mudança dão a mesma assinatura (teste em `tests/servidor/experimentos.test.js`). Todo número abaixo que mudaria o jogo é **PROPOSTA** e espera o "sim" do dono e o economista.

## 1. A pergunta

Em `jogo-idle.md` §10 a medição mostrou que "qual trio vai para qual lugar" e "como repartir as 20 energias" são quase enfeite. Procurei o **menor conjunto de mudanças** que faz as duas escolhas dependerem da conta.

Como medi:
- Matriz com 84 trios × 6 formações × 3 táticas × cada lugar. Na varredura usei 40 lutas por casa. As finalistas foram confirmadas com 400 lutas por casa, cerca de 3 milhões de lutas cada.
- Pesos dos lugares: os do "cenário B" (inverso da vitória média do lugar), recalculados para cada variante.
- Contas: as mesmas 100 contas do simulador da matriz, de 9 a 15 monstros, agora **com cópias**. Quem tem dois do mesmo monstro pode pôr um em cada patrulha. Sem cópias, uma conta quase nunca monta 3 trios sem repetir monstro, e o critério d fica impossível para qualquer regra.
- Divisão ótima: até 3 patrulhas, 20 energias, conta exata com chance de vitória. Com V5 as patrulhas vão a lugares diferentes.
- Efeitos colaterais: 6.000 pares de trios sorteados, cada par jogado dos dois lados com a mesma semente.

Critérios do economista: a) nenhum lugar é o melhor para mais de 40% dos trios · b) cada lugar é o melhor para pelo menos 10% · c) ir ao lugar popular custa 10% ou mais (mediana) · d) pelo menos 5 divisões ótimas diferentes **usando 3 ou mais lugares** · e) depois do rodízio, pelo menos 30% das contas mudam de lugar principal (peso fica no lugar) · f) a–c valem com cada peso ±10%.

## 2. Variantes (V1 a V7)

| Nome | O que é |
|---|---|
| V1 | Vantagem de elemento: +25% passa a +40%, +50% ou +75% |
| V2 | Resistência: o corpo recebe menos dano (−15%, −25% ou −40%) da habilidade do elemento que **ele** bate |
| V3 | Guarda de um elemento só (6 guardas, uma por elemento). Na semana 2 cada lugar recebe o elemento seguinte. Também testado "2 do elemento + 1" |
| V4 | Terreno: cada lugar tem um elemento. As habilidades desse elemento fazem +30% ou +60% ali, ou o corpo desse elemento começa com 25 de Guard |
| V5 | Ganho que diminui: por lugar e por dia, as primeiras N vitórias (4, 6 ou 8) valem 100% e as seguintes 50% (**economia**) |
| V6 | Cansaço: depois de K lutas no dia (5 ou 7), o monstro começa a luta com 75% ou 60% da vida |
| V7 (minha) | Lugar proibido: monstro com corpo do elemento do lugar não entra nele (ex.: "Ember não cruza o pântano") |

## 3. Tabela de todas as variantes × critérios

Varredura com 40 lutas por casa. As linhas em **negrito** foram confirmadas com 400. "Pior" é o elemento ou monstro mais longe de 50% nas lutas espelhadas. "Obrig." é o monstro que mais aparece nos trios ótimos das contas.

| Variante | a ≤40% | b ≥10% | c ≥10% | d ≥5 | e ≥30% | f | Turnos | Quem começa | Pior (42–58%) | Obrig. (≤60%) |
|---|---|---|---|---|---|---|---|---|---|---|
| hoje (+25%) | REPROVADO 52,4% | REPROVADO 8,3% | REPROVADO 0,0% | REPROVADO 0 | REPROVADO 5% | REPROVADO 10/10 | 10,0 | 49,8% | 45,7–54,3 | REPROVADO 80% |
| **hoje (400 lutas)** | REPROVADO 41,7% | APROVADO 11,9% | REPROVADO 3,5% | — | — | — | 10,0 | 49,9% | 46,0–55,1 | — |
| V1 +40% | REPROVADO 53,6% | APROVADO 10,7% | REPROVADO 0,0% | REPROVADO 0 | REPROVADO 4% | REPROVADO | 9,9 | 49,9% | 45,9–53,6 | REPROVADO 81% |
| V1 +50% | REPROVADO 52,4% | REPROVADO 7,1% | REPROVADO 0,0% | REPROVADO 0 | REPROVADO 6% | REPROVADO | 9,9 | 50,4% | 45,8–53,2 | REPROVADO 81% |
| V1 +75% | APROVADO 38,1% | APROVADO 10,7% | REPROVADO 9,6% | REPROVADO 0 | REPROVADO 15% | REPROVADO | 9,7 | 49,8% | 45,3–52,9 | REPROVADO 75% |
| V2 −15% | REPROVADO 48,8% | REPROVADO 8,3% | REPROVADO 5,4% | REPROVADO 0 | REPROVADO 7% | REPROVADO | 10,1 | 49,5% | 44,8–54,4 | REPROVADO 75% |
| V2 −25% | REPROVADO 41,7% | REPROVADO 9,5% | REPROVADO 7,0% | REPROVADO 0 | REPROVADO 13% | REPROVADO | 10,2 | 49,4% | 44,2–54,6 | REPROVADO 78% |
| V2 −40% | APROVADO 32,1% | APROVADO 15,5% | APROVADO 17,6% | REPROVADO 0 | REPROVADO 28% | REPROVADO | 10,4 | 48,8% | 43,1–54,7 | REPROVADO 78% |
| V3 um elemento | APROVADO 39,3% | REPROVADO 7,1% | APROVADO 18,3% | REPROVADO 0 | REPROVADO 9% | REPROVADO | 10,0 | 49,8% | 45,7–54,3 | REPROVADO 81% |
| V3 2+1 | APROVADO 38,1% | APROVADO 10,7% | APROVADO 16,8% | REPROVADO 0 | REPROVADO 3% | REPROVADO | 10,0 | 49,8% | 45,7–54,3 | REPROVADO 79% |
| V4 terreno +30% | REPROVADO 52,4% | REPROVADO 3,6% | REPROVADO 0,0% | REPROVADO 0 | REPROVADO 6% | REPROVADO | 9,7 | 50,1% | 45,9–53,4 | REPROVADO 78% |
| V4 terreno +60% | REPROVADO 45,2% | REPROVADO 2,4% | REPROVADO 5,2% | REPROVADO 0 | REPROVADO 18% | REPROVADO | 9,4 | 50,4% | 46,0–52,9 | REPROVADO 73% |
| V4 Guard 25 | REPROVADO 51,2% | REPROVADO 6,0% | REPROVADO 0,0% | REPROVADO 0 | REPROVADO 3% | REPROVADO | 10,1 | 49,6% | 46,1–53,7 | REPROVADO 81% |
| V7 proibido | APROVADO 32,1% | REPROVADO 8,3% | APROVADO* 20,2% | REPROVADO 0 | REPROVADO 13% | REPROVADO | 10,0 | 49,8% | 45,7–54,3 | REPROVADO 81% |
| V1+V2 (50%, −25%) | REPROVADO 40,5% | APROVADO 13,1% | REPROVADO 5,8% | REPROVADO 0 | REPROVADO 5% | REPROVADO | 10,1 | 50,4% | 44,8–52,4 | REPROVADO 76% |
| V1+V2 forte (75%, −40%) | APROVADO 27,4% | APROVADO 13,1% | APROVADO 27,1% | REPROVADO 0 | REPROVADO 13% | REPROVADO | 10,0 | 49,5% | 43,9–52,3 | REPROVADO 78% |
| V3+V1 | APROVADO 38,1% | REPROVADO 7,1% | APROVADO 11,5% | REPROVADO 0 | REPROVADO 7% | REPROVADO | 9,9 | 50,4% | 45,8–53,2 | REPROVADO 81% |
| V3+V2 (−25%) | APROVADO 35,7% | REPROVADO 7,1% | APROVADO 18,0% | REPROVADO 0 | REPROVADO 6% | REPROVADO | 10,2 | 49,4% | 44,2–54,6 | REPROVADO 78% |
| V3+V2 (−40%) | APROVADO 33,3% | REPROVADO 7,1% | APROVADO 22,3% | REPROVADO 0 | REPROVADO 20% | REPROVADO | 10,4 | 48,8% | 43,1–54,7 | REPROVADO 80% |
| V3+V1+V2 | APROVADO 33,3% | REPROVADO 6,0% | APROVADO 14,3% | REPROVADO 0 | REPROVADO 10% | REPROVADO | 10,1 | 50,4% | 44,8–52,4 | REPROVADO 75% |
| V3+V1+V2 forte | APROVADO 33,3% | REPROVADO 4,8% | APROVADO 26,0% | REPROVADO 0 | REPROVADO 7% | REPROVADO | 10,0 | 49,5% | 43,9–52,3 | REPROVADO 76% |
| V3+V4 | REPROVADO 45,2% | APROVADO 10,7% | REPROVADO 6,2% | REPROVADO 0 | APROVADO 96% | REPROVADO | 9,7 | 50,1% | 45,9–53,4 | REPROVADO 81% |
| V1+V2+V4 | REPROVADO 45,2% | REPROVADO 6,0% | REPROVADO 3,9% | REPROVADO 0 | REPROVADO 9% | REPROVADO | 9,8 | 50,5% | 44,9–53,0 | REPROVADO 77% |
| V7+V1+V2 | APROVADO 27,4% | REPROVADO 6,0% | APROVADO* 18,6% | REPROVADO 0 | REPROVADO 12% | REPROVADO | 10,1 | 50,4% | 44,8–52,4 | REPROVADO 75% |
| V7+V2 (−40%) | APROVADO 29,8% | REPROVADO 8,3% | APROVADO* 18,8% | REPROVADO 0 | APROVADO 86% | REPROVADO | 10,4 | 48,8% | 43,1–54,7 | REPROVADO 78% |
| V3+V7 | REPROVADO 41,7% | REPROVADO 9,5% | APROVADO* 20,7% | REPROVADO 0 | REPROVADO 10% | REPROVADO | 10,0 | 49,8% | 45,7–54,3 | REPROVADO 81% |
| V3+V1+V2+V7 | APROVADO 29,8% | APROVADO 11,9% | APROVADO* 40,9% | REPROVADO 0 | REPROVADO 19% | REPROVADO | 10,1 | 50,4% | 44,8–52,4 | REPROVADO 80% |
| V5 N=4 (só divisão) | = hoje | = hoje | = hoje | APROVADO 15 | REPROVADO 2% | = hoje | 10,0 | 49,8% | = hoje | APROVADO 44% |
| V5 N=6 | = hoje | = hoje | = hoje | APROVADO 12 | REPROVADO 4% | = hoje | | | | APROVADO 45% |
| V5 N=8 | = hoje | = hoje | = hoje | APROVADO 19 | REPROVADO 3% | = hoje | | | | APROVADO 48% |
| V6 K=5, 75% | = hoje | = hoje | = hoje | APROVADO 6 | APROVADO 68% | = hoje | | | | APROVADO 47% |
| V6 K=7, 60% | = hoje | = hoje | = hoje | APROVADO 8 | APROVADO 50% | = hoje | | | | APROVADO 45% |
| **V5+V6 (400 lutas)** | REPROVADO 41,7% | APROVADO 11,9% | REPROVADO 3,5% | APROVADO 37 | APROVADO 76% | REPROVADO 9/10 | 10,0 | 49,9% | 46,0–55,1 | APROVADO 44% |
| **V2 −40% + V6 (400)** | APROVADO 29,8% | APROVADO 11,9% | APROVADO 19,1% | APROVADO 11 | APROVADO 98% | REPROVADO 7/10 | 10,4 | 49,0% | 43,8–55,4 | APROVADO 47% |
| **V2 −40% + V5 + V6 (400)** | APROVADO 29,8% | APROVADO 11,9% | APROVADO 19,1% | APROVADO 37 | APROVADO 90% | REPROVADO 7/10 | 10,4 | 49,0% | 43,8–55,4 | APROVADO 43% |
| **V1+V2 forte + V6 (400)** | APROVADO 27,4% | APROVADO 11,9% | APROVADO 28,0% | APROVADO 15 | APROVADO 83% | REPROVADO 7/10 | 10,0 | 49,1% | 43,9–52,4 | APROVADO 43% |
| **V1+V2 forte + V5 (400)** | APROVADO 27,4% | APROVADO 11,9% | APROVADO 28,0% | APROVADO 10 | REPROVADO 14% | REPROVADO 7/10 | 10,0 | 49,1% | 43,9–52,4 | APROVADO 38% |
| **V1+V2 forte + V5 + V6 (400)** | APROVADO 27,4% | APROVADO 11,9% | APROVADO 28,0% | APROVADO 39 | APROVADO 65% | REPROVADO 7/10 | 10,0 | 49,1% | 43,9–52,4 | APROVADO 39% |
| **V3+V1+V2+V7 + V5 + V6 (400)** | APROVADO 26,2% | APROVADO 10,7% | *100%* | APROVADO 31 | APROVADO 99% | REPROVADO 4/10 | 10,1 | 50,1% | 45,0–53,2 | APROVADO 41% |

\* Com V7 o critério c engana. O lugar popular fica "caro" porque metade dos trios **não pode entrar** nele, e não porque ir lá seja má escolha. Entre os trios que podem entrar, a mediana é 0%. V7 troca estratégia por proibição, e por isso ficou fora das finalistas.

**Efeitos que não aparecem na tabela (400 lutas):**
- Posição continua sendo a decisão que mais pesa: 25,9 a 26,7 pontos entre a melhor e a pior formação (hoje 26,2; o acaso explica 6,2).
- Tática: 5,5 a 6,8 pontos (hoje 6,2; o acaso explica 4,0).
- Golpes com vantagem de elemento: 1,25 a 1,55 por luta (hoje 1,35). A vantagem aparece poucas vezes por luta, por isso aumentar o bônus sozinho rende pouco.
- O monstro mais fraco é sempre o de corpo Seda (`desfiado`, 43,8 a 45,0%). Fica dentro da faixa, mas encosta nela.
- Tempo por luta: igual ao de hoje (as regras novas são 3 multiplicações).

## 4. O que aprendi

1. **Nenhuma regra de luta sozinha passa.** Mudar só o bônus (V1) não basta: são 1,3 golpes fortes por luta. A guarda de um elemento (V3) deixa um lugar com 5 a 7% dos trios. O terreno (V4) **piora** tudo, porque o elemento do lugar ajuda a guarda e o jogador por igual.
2. **A resistência (V2 −40%) é a regra de luta que mais faz.** Ela pune o trio "forte em todo lugar" exatamente onde a guarda resiste a ele. Junto com +75% (V1+V2 forte), ir ao lugar popular passa a custar 28%.
3. **A divisão das 20 energias só vira escolha com retorno que cai.** O cansaço (V6) faz isso sem tocar em economia: a partir da 6ª luta do dia o monstro começa com 75% da vida, e vale mais mandar um segundo trio. O teto por lugar (V5) espalha ainda mais (92% das contas usam 3 lugares), mas é número de economia. Sozinho, o V5 não passa no rodízio (e = 14%).
4. **f (pesos ±10%) reprova em todas.** O lugar mais vazio tem 11 a 12% dos trios, e mexer 10% num peso o derruba para 2%. Com pesos lineares, a régua de 10% sempre fica no fio. Isto só se resolve com mais trios de verdade na conta (filhotes com partes misturadas), não com número.
5. **e (rodízio) com o peso indo junto com a guarda dá 98–100% em tudo.** Aí todo mundo corre atrás do peso novo, e isso não é estratégia. Usei a régua "o peso fica no lugar".

## 5. As 3 melhores opções para o dono

| Opção | Ganha | Perde | Nota |
|---|---|---|---|
| **1. Elemento pesa de verdade + cansaço** | Passa a–e: lugar popular custa 28%, 15 divisões com 3 lugares, 83% das contas mudam de lugar no rodízio, nenhum monstro obrigatório (máx. 43%). Nenhum número de economia. A tela explica fácil: "Strong +75%, Resists −40%, Tired after 5 fights". | f reprova (pesos ±10% derrubam o lugar mais vazio para 2%). Golpe forte vira golpe grande: replay mais "explosivo". Muda a regra de luta do piloto inteiro, não só do idle. Seda fica em 43,9%. | **8** |
| 2. Só resistência + cansaço | Mudança menor (o +25% fica). Passa a–e: custo 19%, 11 divisões com 3 lugares, 98% mudam no rodízio. | Custo 19% no limite do que o jogador sente. Lã sobe a 55,4% e Seda cai a 43,8%: o elemento mais desequilibrado das três. Só 34% das contas usam 3 lugares. | 7 |
| 3. Opção 1 + teto por lugar | A divisão fica a mais rica: 39 divisões com 3 lugares, 92% das contas usam 3 lugares, monstro mais usado só 39%. | Entra número de economia (teto de 6 vitórias por lugar e por dia, depois 50%): precisa do economista e do dono. O rodízio muda menos (65%). Mais uma regra para o jogador ler. | 7 |

**Números que mudariam (todos PROPOSTA; nenhum aplicado):**

| Opção | De → para |
|---|---|
| 1 | `BONUS_DE_TIPO` 0,25 → 0,75 · resistência (número novo em `REGRAS`) 0 → 0,40 · cansaço (número novo em `REGRAS`): depois de 5 lutas do monstro no dia, ele começa com 0,75 da vida (hoje não existe) · pesos relativos dos lugares 1 · 1,25 · 1,8 · 2,4 · 2,8 → 1 · 0,94 · 1,00 · 1,50 · 1,13 (inverso da vitória média; escala final com o economista) |
| 2 | `BONUS_DE_TIPO` fica 0,25 · resistência 0 → 0,40 · cansaço 5 lutas / 0,75 · pesos relativos → 1 · 1,01 · 1,22 · 1,41 · 1,09 |
| 3 | Os da opção 1 + teto por lugar e por dia: 6 vitórias valem 100% e as seguintes 50% (hoje não existe; **número de economia**) |

**Eu escolheria a opção 1.** É o menor conjunto que passa em a–e sem tocar em economia, e é a única em que o lugar popular custa mais de 25%. O cansaço também conversa com as Scars: dá ao jogador um motivo diário para ter banco de monstros.

## 6. Leitura honesta

Existe um conjunto pequeno: 2 números de luta e 1 regra de cansaço. Ele faz as duas escolhas dependerem da conta na régua do economista, menos no f. Mas o motivo do f reprovar mostra o limite do desenho: **com 9 monstros, as contas são parecidas demais.** Quase toda conta de 9–15 tem 6 a 8 dos 9 monstros e chega aos mesmos trios. O que vai fazer a resposta mudar de verdade de conta para conta são os filhotes com partes misturadas (um corpo de um elemento com habilidades de outro), e isto o simulador ainda não mede. Próximo passo sugerido: rodar a opção 1 com contas que tenham 2 a 4 filhotes sorteados do cruzamento e ver se f passa.

Reproduzir: `node tools/experimentos-patrulhas.mjs --lista`, depois `--experimento o2-so-v6 --lutas 400 --espelho 6000`. Os JSON ficam em `.cache/experimentos/` (não commitados).
