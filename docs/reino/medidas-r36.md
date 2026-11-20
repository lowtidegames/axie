# R36 — profundidade do Keepmile, medida (20/11/2026)

Nada do config, de `partida.js` ou de `batalha.js` mudou. Medidor: `tools/medir-reino.mjs` (ramo `reino-medidas36`). Semente `keepmile36`. Números PROVISÓRIOS.
Robôs: aleatório (robos.js) · **ganancioso puro** (maior força imediata, nunca conserta nem sorteia) · **novato atento** (faz o que a tela sugere: conserta sempre que dá, pega LEVEL UP, liga família; senão carta qualquer; tropa no 1º terreno vazio, construção ao lado de tropa; nunca sorteia) · planejador (o melhor robô; cópia com memória das lutas, testada comando por comando igual ao original).
Erro: proporção com n = 2000 → ±2 pp (95%); valores de cada linha abaixo.

## A — novato no 1º chefe (álbum inicial; o álbum cresce entre partidas)
`node tools/medir-reino.mjs A` (2000 jogadores × 3 partidas por robô)

| robô | partida | vence o chefe 5 na 1ª tentativa | até a 2ª | até a 3ª | rodada final mediana / p90 |
|---|---|---|---|---|---|
| aleatório | 1 / 2 / 3 | 0,9 / 1,1 / 2,8% | 1,4 / 1,6 / 4,2% | 1,6 / 2,1 / 5,5% | 5 / 5 |
| ganancioso puro | 1 / 2 / 3 | 28 / 58 / 76% | 48 / 74 / 90% | 63 / 84 / 95% | 10 / 13–15 |
| novato atento | 1 / 2 / 3 | 6 / 7 / 12% | 18 / 17 / 22% | **27 / 27 / 37%** | 5 / 15–16 |

Passou do 1º chefe em alguma das 3 primeiras partidas: aleatório 8,9% (±1,3) · ganancioso 99,3% · **novato atento 75,2% (±1,9)**. Alvo 50%+ atingido em 3 partidas, mas **na 1ª partida só 27% do novato atento passa** e a mediana dele morre na rodada 5. O aleatório nem chega ao chefe em 32% das vezes. O álbum quase não cresce nas 3 primeiras (12 → 13 cartas).

## B — qualidade da decisão por oferta
`node tools/medir-reino.mjs B --n 600 --k 6` (600 ofertas de partidas do planejador, álbum completo; cada carta nos 2 melhores terrenos + sortear + consertar + guardar a mão; 6 continuações do planejador por opção, os mesmos 6 futuros para todas)

| rodadas | ofertas | interessantes (2 melhores ≤ 10%, tipos ≠) | leitura dura (10% do que FALTA) | óbvias (> 25%) | nulas (todas < 3%) | melhor opção mais comum |
|---|---|---|---|---|---|---|
| 1–5 | 173 | 51% (±7) | 46% | 2,3% | 0,6% | tropa 48%, sortear 17% |
| 6–10 | 197 | 71% (±6) | 53% | 0,5% | 2,5% | subir 27%, tropa 23%, sortear 20% |
| 11–15 | 113 | 78% (±8) | 44% | 0% | 9,7% | subir 38%, sortear 22% |
| 16+ | 117 | 83% (±7) | 51% | 0% | **21%** | subir 42%, sortear 18% |
| todas | 600 | **69% (±4)** | 49% | 0,8% | 7% | tropa 28%, subir 27%, sortear 19% |

Leitura honesta: o erro da média de cada opção é ±1,05 rodada (≈ 6%); **só 4,3% das ofertas têm a 1ª opção melhor que a 2ª acima do ruído**; diferença 1ª−2ª mediana 3% (16+: 0,9%). Ou seja: quase nunca há jogada óbvia, mas também quase nunca a escolha entre as duas melhores pesa — a faixa de 10% é mais larga que a régua. O que separa é a pior escolha: cada tipo perde em média 1,3–2,6 rodadas para a melhor da oferta. "Guardar a mão" é a melhor em 7% (ruído). Fim de partida: 1 em 5 ofertas não muda nada.

## C — posição importa?
`node tools/medir-reino.mjs C --n 300 --k 8` (266 reinos com ≥ 3 cartas; o mesmo reino com os terrenos embaralhados, 8 continuações)

| |Δ rodada final| mediana | p90 | ordem do planejador vs embaralhada | luta de agora: ordens que mudam o resultado (mediana / p90) | reinos em que alguma ordem muda a luta |
|---|---|---|---|---|---|
| **10,1%** | 25,4% | +1,16 rodada | 3% / 70% | 56% |

Posição está **na linha** (10%): não é decisão falsa, mas pesa pouco na maioria; pesa muito em 1 de 10 reinos. Dentro da mesma carta (2 melhores terrenos): 6,4% mediana, p90 21%.

## D — cartas, planos e ouro (planejador, álbum completo, 2000 partidas; planos 7 × 300)
`node tools/medir-reino.mjs D`

Rodada final mediana 17 (p10 10, p90 23). Mais escolhidas quando oferecidas: Pikeman 36%, Fuse Runner 35%, Sir Dent 34%, Frypan 32%. **Mortas (< 5%)**: Bramble Snare 3,9%, Market Stall 1,1%. Perto da linha: Tinker's Shed 6,1%, Watchtower 7,0%, Cookhouse 7,0%, Smithy 7,4%. Stone Wall 11,8% e Second Helping 8,7% já não estão mortas pela escolha, mas quase não ficam nos melhores reinos (2,5% e 5,5%). **Dominante (> 45% dos 10% melhores)**: Bunkhouse 54%.
Planos: **7 de 7 viáveis** (média a até 20% do melhor): Trap road 19,8 · Wall & arrows 19,5 · Lone champion 18,3 · Crowd 17,9 · Kitchen 17,0 · Boom 16,1 · Gold 16,1.
Ouro por partida: ganho 198 (vitória 65 · terrenos limpos 41 · bolsa 34 · chefe 28 · ledger 15 · derrota 14 · Market Stall 0,1 · início 3) · gasto 160 = **consertar 133 (83%)** + sortear 26 · sobra 38 no fim. O ouro tem, na prática, um uso só.

## E — longo prazo e ranking
`node tools/medir-reino.mjs E` (200 jogadores atentos até 400 partidas; 40 planejadores até 150)

| robô | partidas até o álbum de 30 (mediana / p90) | até as 12 conquistas | conquistas mais lentas |
|---|---|---|---|
| novato atento | 56 / 62 | > 400 (mediana 11 de 12) | One Big Family 34% dos jogadores (partida 104) · King Gobble 58% (partida 138) |
| planejador | 26 / 29 | 27 | Head Librarian 26 · One Big Family 20 |

10 das 12 conquistas do atento saem até a partida 10; depois disso, nada até a 56 (álbum). Ranking (média das 3 melhores de 21; 20.000 semanas reamostradas de 2000 partidas por robô, álbum completo): atento passa o ganancioso puro em **34%** das semanas; o ganancioso passa o planejador em 0,1% (5,0% com só 3 partidas); atento passa o planejador 0% (0,8%). Sorte decide entre níveis vizinhos; não vira o melhor contra o pior.

## F — tempo pela tela
`node tools/medir-reino.mjs F` (entrada 1,7 s/0,8 s, ritmo lento das rodadas 1–4 no 1×, fim 1 s (2,6 no chefe), ouro contando 1,5 s; 20 s de escolha por rodada é estimativa)

| robô | lutas | só luta 1× (min) | só luta 2× | partida 1× com escolha (mediana / p90) | 2× |
|---|---|---|---|---|---|
| aleatório (1ª partida) | 6,5 | 1,5 | 0,8 | 3,8 / 4,5 | 3,1 |
| ganancioso puro (1ª) | 10,7 | 3,1 | 1,6 | 7,0 / 9,3 | 5,6 |
| novato atento (1ª) | 10,9 | 1,8 | 1,0 | 4,5 / 11,6 | 3,7 |
| planejador | 23,0 | 7,1 | 4,0 | **14,9 / 19,3** | 11,7 |

"Só olhando" (planejador, 1ª mão da rodada): 11% das lutas já estavam ganhas com qualquer carta em qualquer terreno; 36% perdidas com qualquer uma (sortear/consertar é a saída); a escolha decide 53%.

## Propostas (não aplicadas; cada uma medida por injeção no medidor, sem tocar no config)
`node tools/medir-reino.mjs <A|B|D> --variante <nome>` · comparar com a base de mesma semente

| # | nota | mudança (regra · número) | efeito medido | risco | custo |
|---|---|---|---|---|---|
| 1 | **88** | 1º chefe mais leve: `CHEFES[0].vida` 380 → **320** (Gutbucket) | novato atento passa o 1º chefe na 1ª partida 27% → **44%**, em 3 partidas 75% → **90%**; ganancioso 1ª partida 63% → 80%; aleatório 9% → 14%; rodada final mediana do atento 5 → 7 (+~1 min). Com 280: 57% / 96% (fácil demais) | chefe vira "festa" sem medo para quem joga bem (planejador já passa) | P (config) |
| 2 | **85** | 4 mortas + Bunkhouse (números): Stone Wall `valores` 25..45 → 30/36/42/48/55 · Bramble Snare 3..8 → 4/5/6/8/10 e `tiques` 25 → 35 · Second Helping 80..100 → 120..160 · Bunkhouse `valores2` 10..40 → 5/10/15/20/25 | Bramble 3,9% → 7,9% (viva); Stone Wall nos melhores 2,5% → 17,5%; **Bunkhouse 54% → 36% (nenhuma dominante)**; planos 7/7; mediana 17 = 17 (p90 23 → 22). Market Stall continua morta (0,8%): só dá ouro e o ouro só serve para consertar | Stone Wall pode subir demais com Pikewall; medir com 2000 de novo antes | P (config) |
| 3 | **80** | Vitória na rodada 20: "THE KINGDOM HELD" ao vencer o chefe 20; a partida segue sem fim para o recorde | hoje 18% das partidas do planejador chegam lá; 0,3% do novato nas 3 primeiras. Dá um "ganhei" claro sem mudar luta nem duração | quem para na 20 encurta o ranking? (pontos seguem iguais) | M (tela + conquista no servidor) |
| 4 | **78** | Conquistas em degraus 12 → ~30: aguentar 5/10/15/20/25 rodadas numa partida; vencer 25/50/100/200/400 rodadas somadas; ligar cada família (4); nível 5 em tropa/construção/magia | atento chega a 25/50/100/200/400 vitórias nas partidas 4/8/16/29/56 e a 15 rodadas numa partida na 10: preenche o vazio entre a partida 10 e a 56, onde hoje não ganha nada | lista longa demais na tela; só título | M (tela + servidor) |
| 5 | 55 | Reino cheio: a mão traz **2** cartas que sobem (simulado: troca a 2ª carta) | interessantes 64% → 71% (±9, dentro do ruído); nulas 16+ 15% → 19% (pior); duração igual | mais LEVEL UP, menos carta nova | M (motor) |
| 6 | 40 | Guardar a mão rende +3 ouro | nenhum efeito: "guardar" melhor em 7% → 7,5%, interessantes +0,5 pp; pacote (1 + 6) +10,5 pp ±9 = ruído | ouro sem uso real; não resolve | P (motor) |
| — | 45 | Conserto 20/30/40 (`consertoPasso` 20 → 10) | novato: nada (não conserta antes do chefe); planejador mediana 17 → 18, p90 24: **alonga** a partida | infla duração | P |

Recomendação: 1 + 2 juntos (números, custo P, medir de novo com `A` e `D`), depois 3 + 4 (tela). 5 e 6 não sobem a decisão de forma medível; o problema real do ouro (83% vai para conserto) pede um 2º uso de verdade, que não medi aqui.
Comandos: `node tools/medir-reino.mjs A|B|C|D|E|F|todas [--n N] [--k K] [--variante base|chefe320|chefe280|guardar3|guardar5|sobem2|conserto10|cartas|pacote] [--saida x.json]`. Tempo nesta máquina (4 núcleos): A 4 min · B 600×6 42 min · C 7 min · D com planos 15 min · E 9 min.
