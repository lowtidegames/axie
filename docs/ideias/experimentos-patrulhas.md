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

## 7. Medição com filhotes e parecer do economista (tarefa 35, 15/11/2026 15:00 BRT)

Medido em `tools/experimentos-filhotes.mjs` (cerca de 25 milhões de lutas, 35 min em 4 núcleos; refazer a análise com a medição guardada leva 2 min). **Nada mudou no jogo**: `shared/config.js` e o padrão do motor estão iguais. Testes do gerador em `tests/servidor/filhotes.test.js`.

### 7.1 Como medi

- **Contas realistas (200):** cada uma começa com 6 a 9 prontos sorteados (com repetição; cada cópia com o seu avesso sorteado) e faz 2 a 4 cruzamentos de verdade com `costurar` e `abrirCasulo` (semente fixa). Fica com os filhotes como saírem: partes misturadas, raridades do sorteio. Contas de 8 a 13 monstros.
- **Contas maduras (100):** 10 a 15 monstros. Metade são filhotes: 2 de 1ª geração e o resto de 2ª.
- **Contas de propósito (100):** gêmeas das 100 primeiras realistas (mesmos prontos, mesmo número de cruzamentos). Escolhem um lugar e, a cada cruzamento, os pais que dão o filhote que mais bate forte na guarda dele. A conta usa as chances exatas do cruzamento: o corpo resiste ou apanha da guarda, a habilidade bate forte em quantos corpos.
- **Controle "só prontos" (200):** as mesmas 200 contas antes de cruzar.
- **Trios saem da conta de cada jogador.** Primeiro uma triagem rápida de todos os trios da conta (30.309 trios com filhote). Depois, a medição completa dos melhores de cada lugar e dos 4 melhores trios só de prontos: 18 formações × táticas em 2 etapas, e lutas novas na melhor (8.635 trios × 3 regras). Cansaço: a mesma formação, começando com 75% da vida.
- **Critérios por conta**, não por trio. Cada conta conta como **um** jogador, com o seu melhor trio em cada lugar. Pesos: "cenário B" (inverso da vitória média do lugar nos 84 trios de prontos), como na tarefa 33. a) nenhum lugar é o melhor para mais de 40% das contas · b) cada lugar é o melhor para pelo menos 10% · c) ir ao lugar mais escolhido custa pelo menos 10% (mediana) · d) pelo menos 5 divisões ótimas com 3 lugares em 100 contas · e) depois do rodízio, pelo menos 30% mudam de lugar principal · f) a–c valem com cada peso ±10%.

### 7.2 Critérios por cenário

Contas **realistas** (200):

| Regras | a ≤40% | b ≥10% | c ≥10% | d ≥5 | e ≥30% | f |
|---|---|---|---|---|---|---|
| hoje | REPROVADO 66,5% | REPROVADO 0,0% | REPROVADO 0,0% | REPROVADO 0 | APROVADO 34,5% | REPROVADO 10/10 |
| opção 1 (+75%, resist. 40%, cansaço 5) | REPROVADO 68,0% | REPROVADO 0,0% | REPROVADO 0,0% | APROVADO 8 | APROVADO 73,0% | REPROVADO 10/10 |
| opção 1 sem cansaço | REPROVADO 68,0% | REPROVADO 0,0% | REPROVADO 0,0% | REPROVADO 0 | APROVADO 37,0% | REPROVADO 10/10 |
| opção 2 (resist. 40% + cansaço 5) | REPROVADO 46,5% | REPROVADO 0,0% | REPROVADO 4,8% | APROVADO 13 | APROVADO 80,0% | REPROVADO 10/10 |

Contas **maduras** (100): hoje a 61% · b 0% · c 0% · d 0 · e 39% · f 10/10 — opção 1: 64% · 0% · 0% · **6** · **74%** · 10/10 — sem cansaço: 64% · 0% · 0% · 0 · 38% · 10/10 — opção 2: 46% · 0% · 4,4% · **11** · **84%** · 10/10.
Controle **só prontos** (200): hoje 52,5% · 0,5% · 0% · 0 · 49% · 10/10 — opção 1: 59,5% · 0% · 0% · 3 · 78% · 10/10 — opção 2: **40,0%** · 0% · 6,5% · 3 · 88% · 10/10.

**Por que a, b e c caíram em relação à tarefa 33:** lá a régua era por trio, contando os 84 trios, inclusive os fracos que ninguém usaria. Por conta, cada jogador usa o **melhor** trio dele, e esse trio vence quase sempre em quase todo lugar. O melhor trio de cada conta realista vence, por lugar: 87 · 90 · 76 · 74 · 84% hoje e 91 · 91 · 91 · 78 · 90% na opção 1. Com a vitória perto do teto, quem decide o lugar é o **peso**, e o lugar 4 (o mais pesado) leva 66–68% das contas. O lugar 2 não é o melhor para ninguém.

**Diagnóstico (não é proposta):** recalculei os pesos pelo inverso da vitória do melhor trio de cada conta. Com isso a e b passam (realistas, opção 1: a 30% · b 13%), mas c fica em 9,8% e **f continua reprovando 10/10** (pior b 0,5%). Com os filhotes, o f não passa com peso nenhum.

### 7.3 As quatro perguntas

| | hoje | opção 1 | opção 1 sem cansaço | opção 2 |
|---|---|---|---|---|
| (i) contas realistas com o melhor lugar diferente da moda (de 200) | 67 | 64 | 64 | 107 |
| — maduras (de 100) | 39 | 36 | 36 | 54 |
| — só prontos (de 200) | 95 | 81 | 81 | 120 |
| (ii) custo de seguir a receita **mais comum** (mediana · contas que perdem ≥10%) | 0,0% · 14% (L4:20, 133 contas) | **8,1% · 46%** (L3:15 + L4:5, só 24 contas) | 0,0% · 21% (L4:20, 136 contas) | 14,1% · 58% (L3:20, 25 contas) |
| (ii) custo de seguir o plano da conta **mediana** (o pedido) | 17,7% | 13,5% | 0,0% | 9,1% |
| (iii) robustez f | REPROVADO 10/10 | REPROVADO 10/10 | REPROVADO 10/10 | REPROVADO 10/10 |
| (iv) ganho do plano com 2–4 cruzamentos: de propósito × ao acaso | 11,0% × 9,4% | 19,2% × 18,8% | 0,8% × 5,9% | 13,1% × 12,8% |
| (iv) ganho no lugar-alvo: de propósito × ao acaso | 27,5% × 27,1% | 11,2% × 11,2% | 11,2% × 11,2% | 18,7% × 12,1% |
| (iv) contas em que o de propósito ficou melhor que o gêmeo ao acaso | 38% | 51% | 27% | 53% |
| plano ótimo usa pelo menos 1 filhote | 77% | 98% | 69% | 90% |

Leitura de (ii): o "plano da conta mediana" muda muito conforme qual conta cai no meio. A "receita mais comum" é a régua mais honesta do que a internet espalharia. Hoje, 133 de 200 contas têm o mesmo plano (tudo no lugar 4), e copiar não custa nada. Na opção 1, o plano mais comum é de só 24 contas, e copiá-lo custa 8% na mediana (46% das contas perdem 10% ou mais). **Quem cria essa diferença é o cansaço:** sem ele, a receita volta a custar 0%.

### 7.4 Efeitos colaterais com filhotes

| | hoje | opção 1 | opção 2 |
|---|---|---|---|
| Melhor filhote gerado (vitória do time com ele, contra prontos) | 61,8% | 57,3% | 61,7% |
| **Melhor filhote possível** (busca parte a parte, tudo Comum, confirmado com 2.000 lutas) | **71,4%** | **68,0%** | **73,2%** |
| Prontos (mesma régua) | 45,4–54,8% | 42,9–53,9% | 44,0–56,4% |
| Lendária − Comum (mesmo filhote, 60 filhotes) | +2,0 pontos | +1,3 | +1,8 |
| Duração (turnos) | 9,99 | 10,00 | 10,40 |
| Quem começa vence | 49,1% | 46,9% | 50,1% |
| Time com filhote × time sem filhote | 46,9% | 49,8% | 48,2% |

- **Equilíbrio, alerta:** existe um arranjo dominante, e não é culpa das opções (hoje também chega a 71%). Nas três regras o melhor arranjo tem **Perna de Linha Solta + Bordado de Espinho**. Fora da faixa 42–58% e pede revisão desses dois números de luta antes de o cruzamento ir ao ar. Os filhotes que saem de verdade ficam em 57–62%.
- **Raridade continua sem decidir:** +1,3 a +2,0 pontos de vitória por ter tudo Lendário.
- Duração e quem começa ficam como hoje. Na opção 1, quem começa vence 46,9% (dentro de 45–55).

### 7.5 Com filhotes, a estratégia depende da conta?

**Em parte, e por causa do cansaço, não dos filhotes.**
- **Os filhotes deixam as contas diferentes.** 77–98% dos planos ótimos usam um filhote, e um terço das contas tem um melhor lugar fora da moda.
- **Mas o melhor trio de cada conta vence 75–93% em quase todo lugar.** Aí o peso decide o lugar, e o lugar 4 vira a resposta de 2 em cada 3 contas. **A hipótese da tarefa 33 não se confirmou: o f reprova 10/10 com filhotes, em todas as regras, e piorou.** O lugar mais vazio cai para 0%.
- **O que faz a resposta mudar de conta para conta é o cansaço.** Com ele, o plano mais comum vale para só 12% das contas (24 de 200) e copiá-lo custa 8%. Sem ele, 68% copiam o mesmo plano sem perder nada.
- **Cruzar "de propósito" pelo elemento quase não rende** (opção 1: +19,2% contra +18,8% ao acaso; melhor em 51% das contas). Cruzar rende, e o ganho dobra na opção 1 (+19% contra +9% hoje). Mas qualquer filhote razoável serve. **O cruzamento ainda não é estratégia de elemento; é estratégia de quantidade.**
- **Causa do f:** as guardas são fracas para o melhor trio (saturação). Para o lugar virar escolha, a guarda precisa segurar o melhor trio da conta (vitória de 50–75%, não 90%), ou a vantagem de elemento tem de pesar contra o **melhor** trio, não contra a média. Isto é número de luta das guardas (`shared/lugares.js`) e fica como o próximo experimento sugerido.

### 7.6 Parecer do economista sobre os três números

Os três são números de **luta**, não de moeda, mas mexem no valor de cada monstro e do cruzamento.

**Conta do cansaço:** 20 lutas × 3 monstros = **60 lutas-monstro por dia**.
- **Cansaço depois de 5 lutas:** para lutar as 20 sem cansar, a conta precisa de 60 ÷ 5 = **12 monstros** em 4 trios. O jogo só deixa **3 patrulhas** (9 monstros = 45 lutas-monstro = 15 lutas descansadas). **Nenhuma conta escapa:** 5 lutas por dia são sempre cansadas.
- **Cansaço depois de 7 lutas:** 3 trios × 7 = 21 lutas, o que basta com **9 monstros**, exatamente a coleção inicial.
- **Cansaço depois de 10 lutas:** bastam 2 trios (6 monstros), e a 3ª patrulha deixa de valer a pena: d cai para 0 e 0% das contas usam 3 lugares.

**Perda medida** (plano com cansaço contra o mesmo plano sem cansaço, mediana):

| Cansaço depois de | só prontos 6–7 | só prontos 8–9 | realistas 10–12 | maduras 13+ | contas que usam 3 lugares (realistas) |
|---|---|---|---|---|---|
| 5 lutas (aprovado no piloto) | 29,1% | 25,9% | 19,2% | 14,2% | 12,5% |
| 6 | 26,2% | 22,3% | 16,4% | 11,2% | 14,5% |
| **7** | **23,6%** | **18,8%** | **13,5%** | **9,8%** | **18,5%** |
| 10 | 12,3% | 9,3% | 7,2% | 5,5% | 0% |

(opção 1; na opção 2 os números são parecidos, 1–4 pontos acima)

- **Freio ou parede?** Com 5 lutas, o cansaço é um **corte de 15–29% nos pontos do dia**, maior para quem tem menos monstros. Como o prêmio sai de um pote repartido pelos pontos, um corte igual para todos não muda nada. Esse corte **não é igual**: tira cerca de 15 pontos a mais da conta pequena do que da grande, e passa a fatia do novato para a conta grande. É parede leve para a conta nova e regressivo.
- **Bots e fazendas:** o cansaço obriga cada conta a ter 9 ou mais monstros para render o máximo. Isso sobe o capital por conta-robô, um bom freio, mas que também pesa no novato. Com 7 lutas, a coleção inicial de 9 já basta para não pagar nada pelo cansaço em si (o que sobra de perda é usar o 2º e o 3º trio, mais fracos: é a escolha que queremos). Assim, a fazenda não ganha mais do que um jogador comum com 9 monstros.
- **Preço relativo:** na opção 1, a parte dos monstros que **não valem nada** para o plano (tirar um não muda os pontos) cai de 75% para 45%. O banco passa a valer, e a procura se espalha por mais monstros, em vez de só os 2–3 de topo. O filhote vale em média 5,1% do plano contra 3,6% do pronto: um prêmio de cerca de 1,4×, parecido com o de hoje (3,9% contra 2,5%). O que cresce é o valor de **cruzar**: com 2–4 cruzamentos o plano sobe 19% na opção 1, contra 9% hoje e 6% sem cansaço. Isso valoriza o cruzamento como sumidouro (custo da costura e Carretel) sem criar fonte nova de moeda.
- **Vantagem de elemento +75%:** não piorou o equilíbrio (melhor filhote 68% contra 71% hoje). Também não fez o cruzamento de propósito render. Faixa proposta: **0,50–0,75**. Fico em 0,75 no piloto (já aprovado) e desço para 0,50 se o replay ficar "explosivo".
- **Resistência 40%:** é o número que mais espalha as contas (opção 2: 107 de 200 fora da moda; só prontos: a passa com 40%). Faixa proposta: **0,25–0,40**. Fico em 0,40.
- **Cansaço:** faixa proposta de **6–8 lutas** com **75% da vida**. Recomendo **7**: a coleção inicial de 9 monstros consegue lutar as 20 descansada, a perda da conta pequena cai de 29% para 24%, e mais contas usam 3 lugares (18,5% contra 12,5%). Abaixo de 6 fica parede; acima de 8 a 3ª patrulha deixa de valer a pena (com 10, 0% usam 3 lugares). Vida de 85% não foi medida.

**Opção 2 (só resistência + cansaço):** medida porque a tarefa pediu. **Foi recusada pelo dono em 15/11 14:04** e não volta à tabela.

### 7.7 Opções para o dono (melhor primeiro)

| Opção | Ganha | Perde | Nota |
|---|---|---|---|
| **1. Opção 1 com cansaço depois de 7 lutas** | A coleção inicial de 9 luta as 20 descansada (sem parede para o novato). A perda da conta pequena cai de 29% para 24%. Mais contas usam 3 lugares (18,5%). d e e continuam aprovados (o cansaço é o que dá d e e). O banco de monstros continua valendo. | f continua reprovado (10/10). O lugar 4 domina por conta (68%), e isso só se resolve nas guardas. Um número a mais para mexer no piloto. | **7** |
| 2. Opção 1 como aprovada (cansaço depois de 5) | Já ligada no piloto. A receita da internet custa 8%. Cruzar rende o dobro de hoje. | Nenhuma conta escapa do cansaço (5 lutas por dia sempre cansadas). Corta 15–29% dos pontos do dia, mais da conta pequena (regressivo). f reprovado. | 6 |
| 3. Opção 1 sem cansaço | Regra mais simples. Nenhuma perda de pontos. | d volta a 0, a receita volta a custar 0%, e 68% das contas copiam o mesmo plano. A divisão das 20 energias volta a ser enfeite. f reprovado. | 4 |

**De → para (todos PROPOSTA; nada aplicado; o motor só tem as regras de experimento):**

| Número | Hoje | Opção 1 aprovada (piloto) | Proposto (opção 1 da tabela) | Faixa |
|---|---|---|---|---|
| Vantagem de elemento (`BONUS_DE_TIPO`) | 0,25 | 0,75 | 0,75 | 0,50–0,75 |
| Resistência (número novo) | 0 | 0,40 | 0,40 | 0,25–0,40 |
| Cansaço: lutas no dia antes de cansar | não existe | 5 | **7** | 6–8 |
| Cansaço: vida ao começar cansado | não existe | 0,75 | 0,75 | 0,75 (0,85 não medido) |

**Próximo passo sugerido (não é deste pacote):** guardas que seguram o melhor trio de cada conta (vitória de 50–75%) e uma revisão de Perna de Linha Solta + Bordado de Espinho. Sem isso, o f não passa com regra de elemento nenhuma.

Reproduzir: `node tools/experimentos-filhotes.mjs` (35 min na primeira vez; `--rapido` para conferir em 2 min). O JSON fica em `.cache/filhotes/relatorio.json` (não commitado).
