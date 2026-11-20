# Bíblia do jogo de reino (versão 1, 19/11/2026)

Base: `docs/reino/jogo.md` (versão 2). Jogo ORIGINAL; nomes, cartas, invasores e regras são próprios. Textos do jogo em inglês. **Todos os números são PROVISÓRIOS e ainda não passaram pelo simulador** (seção 13 diz o que medir).

## 1. Nome
| Opção | Ideia | Colisão (busca na web em 19/11/2026) |
|---|---|---|
| **Keepmile** (provisório) | a última milha até o castelo | nenhum jogo com esse nome |
| Roadkeep | guardar a estrada | nenhum; há nomes parecidos com "Road" |
| Tollkeep | o castelo do pedágio | nenhum; há um jogo de cabine de pedágio com nome diferente |
| Crownlane | a rua da coroa | nenhum; há vários "Crown algo" |
| Puddingkeep | o castelo do pudim | nenhum; há jogos de pudim sem relação |

Busca simples não é registro de marca: conferir marca e domínio antes de anunciar. Nomes de famílias, cartas e invasores: conferidos só de memória.

## 2. O mundo e as 4 famílias
O reino de Butterby é pequeno: uma estrada, seis terrenos e um castelo. No castelo mora o Crown Pudding, o doce mais famoso do mundo.
Toda tarde a Hungry Horde sobe a estrada para roubar uma colherada. Você é o Steward: decide o que fica em cada terreno, do portão ao castelo.
Ninguém morre de verdade: soldado caído volta na rodada seguinte, invasor vencido sai correndo. O tom é de feira medieval, não de guerra.

| Família | Cor | Jeito de jogar | Por que é diferente | Bônus com 3+ terrenos da família |
|---|---|---|---|---|
| **Pikewall** | azul | Segura a frente com gente dura | ganha por aguentar, não por bater | soldados recebem 15% menos dano |
| **Thornbow** | verde | Bate de longe, atrás de quem segura | ganha antes de o invasor chegar; frágil de perto | atiradores ganham +0,5 de alcance |
| **Potluck** | laranja | Cura, engorda e rende ouro | ganha na luta longa e na economia | soldados curam 2 de vida por segundo |
| **Fizzwick** | roxo | Explosão, armadilha e bando barato | ganha em um instante; aposta no lugar certo da estrada | Magias ficam 25% mais fortes |

A cor é da família; a raridade aparece só na moldura (1 a 5 pinos), nunca por cor.

## 3. Regra da batalha
**Para o jogador (2 linhas):** "Invaders walk the road from the gate to your castle. Your soldiers guard their plots and everyone hits the closest enemy — stop them all before one touches the castle."

Para o motor (sem dado na batalha; a semente decide cartas, invasores e espólios, e a mesma semente refaz a partida igual):
| Regra | Valor |
|---|---|
| Estrada | linha reta de x=0 (portão) a x=6 (castelo); terreno k fica em [k−1, k), centro em k−0,5; terreno 1 é a frente |
| Relógio | passos de 0,1 s; posição em centésimos de terreno; contas em inteiros, arredondando meio para cima |
| Soldados | nascem no centro do seu terreno com vida cheia a cada batalha; os de corpo a corpo saem atrás de inimigo a até 1,0 do seu centro (velocidade 1,5/s) e voltam; atiradores não andam |
| Invasores | entram em fila em x=−0,5, um a cada min(0,3 s; 6 s ÷ quantidade); andam para o castelo e só param quando há soldado no alcance |
| Alcance | corpo a corpo 0,3; à distância o da carta (tiro acerta na hora; a flecha é só desenho) |
| Alvo | o inimigo mais perto; empate: menor vida, depois menor número de ordem (soldados: terreno 1→6; invasores: ordem de entrada) |
| Ordem do passo | 1 entradas · 2 cada um escolhe alvo e anda ou bate (se a cadência deixou) · 3 todo dano aplicado junto · 4 quedas e efeitos · 5 confere o fim |
| Posição | a frente apanha primeiro; Construção melhora os dois terrenos vizinhos (bônus de duas construções somam); Magia dispara no terreno onde está; terreno sem tropa não segura ninguém |
| Vitória | todos os invasores caíram |
| Derrota | um invasor chegou a x=6 |
| Duração | alvo 10–20 s; aos 20 s "Nightfall": todo dano em dobro; aos 30 s acaba: vence quem tem maior % da vida total; empate é do jogador |
| Velocidade | botões ×1, ×2, ×4 (só muda o desenho, não o resultado) |

Por que é gostosa de ver: a horda quebra terreno por terreno e o fundo pode segurar no último (virada); "Last one standing" vira festa.

## 4. As cartas (30)
**Regras gerais.** 1 carta por terreno; a mesma carta no mesmo terreno sobe 1 nível (máx. 5); carta diferente em terreno ocupado troca a antiga (pede confirmação). Vida e dano por nível: ×1,0 / 1,2 / 1,4 / 1,7 / 2,0 (N1 a N5). Cadência e alcance não mudam com o nível.
**Sorteio de 3.** Rodada 1: três Tropas diferentes. Da rodada 2 em diante: a 1ª carta é sempre uma cópia de carta que já está no reino abaixo do nível 5 (selo "LEVEL UP"); as outras duas saem por raridade: Common 50% · Uncommon 30% · Rare 14% · Epic 5% · Legendary 1% (igual entre as cartas liberadas da raridade; raridade vazia cai para a de baixo). A chance fica na tela.
Raridade (R): C, U, R, E, L. **P** = carta do piloto.

### Tropas (12) — números do nível 1; Qtd = soldados nos níveis 1/2/3/4/5
| id | Nome | Fam. | R | P | Qtd | Vida | Dano | Cad. (s) | Alc. | Texto do jogo | Brilha com | Silhueta (arte, 32 px) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T01 | Pikeman | Pikewall | C | P | 3/3/4/4/5 | 30 | 6 | 1,0 | 0,3 | Sturdy pikemen. They hold the road. | Smithy, Cookhouse | lança comprida, elmo redondo, pés firmes |
| T02 | Doorman | Pikewall | U | P | 2/2/3/3/4 | 60 | 3 | 1,2 | 0,3 | Carries a real door. Takes 30% less damage from ranged. | Hedge Archer atrás | porta enorme escondendo um homem pequeno |
| T03 | Sir Dent | Pikewall | R | | 1/1/1/1/1 | 140 | 18 | 1,2 | 0,3 | One big knight. Grows twice as much per level. | Feast Hall, Soup Carrier | armadura redonda amassada, pluma mínima, espadão |
| T04 | Hedge Archer | Thornbow | C | P | 2/3/3/4/4 | 16 | 7 | 1,2 | 2,5 | Shoots from behind the line. | Doorman, Watchtower | capuz pontudo, arco maior que ele |
| T05 | Granny Bolt | Thornbow | R | | 1/1/2/2/3 | 20 | 24 | 2,5 | 3,5 | Slow, huge shot at the toughest invader in range. | Bramble Snare, Fletcher's Hut | vovó de xale com besta gigante |
| T06 | Falconer | Thornbow | U | | 1/1/2/2/2 | 18 | 9 | 1,0 | 4,0 | Her falcon strikes the farthest invader in range. | qualquer frente dura | braço erguido, falcão pousado, capa curta |
| T07 | Frypan Cook | Potluck | C | P | 3/4/4/5/6 | 22 | 5 | 0,8 | 0,3 | Many cooks, fast pans. | Smithy, Bunkhouse | chapéu de cozinheiro, frigideira no alto |
| T08 | Soup Carrier | Potluck | U | | 1/1/2/2/2 | 24 | cura 8 | 1,5 | 1,5 | Heals the most hurt soldier nearby. Does not fight. | Sir Dent, Doorman | canga no ombro com dois baldes |
| T09 | Pie Thrower | Potluck | R | | 2/2/3/3/4 | 16 | 4 | 1,5 | 2,0 | Pies slow the target by 30% for 2 s. | Angry Bees, Granny Bolt | braço para trás, torta na mão |
| T10 | Squib Runner | Fizzwick | C | P | 2/3/3/4/5 | 10 | 20 em área 0,5 | 1 vez | 0,3 | Runs at invaders and goes boom. | Bramble Snare, Bunkhouse | barril nas costas, pavio aceso, correndo |
| T11 | Clockwork Geese | Fizzwick | U | | 4/5/6/8/10 | 8 | 3 | 0,6 | 0,3 | A noisy flock of wind-up geese. | Fuse Depot, Smithy | ganso com chave de corda nas costas |
| T12 | Sparkwright | Fizzwick | E | | 1/1/1/2/2 | 18 | 8 | 1,6 | 2,5 | Bolt jumps to 2 more invaders. | Tar Puddle, Watchtower | chapéu torto, cajado em garfo, barba arrepiada |

Sir Dent usa ×1,0 / 1,5 / 2,0 / 2,7 / 3,5 no lugar da regra geral. Squib Runner procura inimigo a até 2,5 do seu centro e some ao explodir.

### Construções (10) — valem para os dois terrenos vizinhos; valores nos níveis 1/2/3/4/5
| id | Nome | Fam. | R | P | Texto do jogo | Valor por nível | Brilha com |
|---|---|---|---|---|---|---|---|
| B01 | Smithy | Pikewall | C | P | Neighbors deal more damage. | +20/30/40/50/60% | Frypan Cook, Clockwork Geese |
| B02 | Bunkhouse | Pikewall | C | | Neighbor troops get extra soldiers. | +1/1/1/2/2 soldados; vida +5/10/15/20/25% | Pikeman, Squib Runner |
| B03 | Stone Wall | Pikewall | U | | Neighbors take less damage. | −30/36/42/48/55% | Doorman, Sir Dent |
| B04 | Watchtower | Thornbow | C | P | Neighbor shooters see farther and hit harder. | alcance +0,5/0,75/1/1,25/1,5 e dano +10/15/20/25/30% | Hedge Archer, Granny Bolt |
| B05 | Fletcher's Hut | Thornbow | U | | Neighbors attack faster. | +15/20/25/30/35% | Granny Bolt, Frypan Cook |
| B06 | Cookhouse | Potluck | C | P | Neighbors heal every second. | 2/3/4/5/6 de vida por s | Pikeman, Doorman |
| B07 | Market Stall | Potluck | U | | Each neighbor troop pays gold when you win. | +1/1/2/2/3 de ouro por vizinho | reino que já vence com folga |
| B08 | Feast Hall | Potluck | R | | Neighbors have more health. | +25/35/45/55/65% | Sir Dent, Pikeman |
| B09 | Tinker's Shed | Fizzwick | R | | Neighbor Magic triggers a second time. | 2º disparo com 50/60/70/85/100% da força | Boom Barrel, Second Helping |
| B10 | Fuse Depot | Fizzwick | E | | Neighbor soldiers burst when they fall. | 10/14/18/24/30 de dano em área 0,5 | Clockwork Geese, Frypan Cook |

### Magias (8) — ficam num terreno e agem ali; valores nos níveis 1/2/3/4/5
| id | Nome | Fam. | R | P | Texto do jogo | Valor por nível | Brilha com |
|---|---|---|---|---|---|---|---|
| M01 | Boom Barrel | Fizzwick | C | P | First invader to step here sets it off. | 30/45/60/80/100 de dano em área 1,0 | Bramble Snare, Tinker's Shed |
| M02 | Tar Puddle | Fizzwick | U | | Invaders here walk slower. | −40/45/50/55/60% de velocidade | atiradores atrás |
| M03 | Angry Bees | Thornbow | U | | Invaders here get stung every second. | 4/6/8/10/13 de dano por s | Tar Puddle, Pie Thrower |
| M04 | Rally Horn | Pikewall | U | | When invaders reach here, all soldiers attack faster for 5 s. | +30/40/50/60/75% | muitas tropas |
| M05 | Second Helping | Potluck | R | | When invaders reach here, all soldiers heal. | 120/130/140/150/160% da vida | Sir Dent, frente dura |
| M06 | Bramble Snare | Thornbow | C | P | The first invaders to step here are stuck for 3.5 s. | prende 4/5/6/8/10 invasores | Boom Barrel, Hedge Archer |
| M07 | Seconds! | Potluck | E | | The first soldiers to fall get back up with half health. | 2/3/4/5/6 soldados | Sir Dent, Fuse Depot |
| M08 | Grand Finale | Fizzwick | L | | When invaders reach here, every invader loses part of its health. | 15/22/30/40/50% da vida máxima | terreno 4–5; Tinker's Shed |

Chefes sofrem metade de lentidão, prisão e Grand Finale.

## 5. Invasores e chefes
**Força da rodada r:** pontos = 4 + 3·r; vida e dano dos invasores × (1 + 0,10·(r−1)). A semente escolhe 2 tipos já liberados (60% e 40% dos pontos; a sobra vira Munchers). A horda da próxima rodada aparece ANTES de escolher a carta (ícones e quantidade).

| Invasor | Desde | Pontos | Vida | Dano | Cad. | Vel. | O que traz | O que castiga |
|---|---|---|---|---|---|---|---|---|
| Muncher | 1 | 2 | 20 | 4 | 1,0 | 1,0 | número | frente fina |
| Stilt Runner | 3 | 2 | 12 | 3 | 0,8 | 2,0 | chega antes da horda | quem bate devagar; frente vazia |
| Spud Slinger | 4 | 3 | 14 | 5 | 1,4 | 1,0 | tiro de alcance 2,5 | frente frágil; curandeiro exposto |
| Potlid Brute | 6 | 5 | 90 | 9 | 1,5 | 0,7 | recebe metade do dano de tiro | reino só de atiradores |
| Bloater | 7 | 4 | 40 | 5 | 1,0 | 0,9 | ao cair, 15 de dano em área 0,75 | bando amontoado |
| Mole Raider | 8 | 4 | 24 | 6 | 1,0 | 1,0 | some no portão e sai no terreno 4 depois de 1,5 s | fundo vazio |
| Drum Bully | 11 | 4 | 30 | 2 | 1,0 | 0,9 | invasores a até 1,0 batem 25% mais forte | quem não alcança o fundo da horda |
| Quack | 12 | 4 | 22 | cura 6/s | — | 0,9 | cura o invasor mais ferido a até 1,5 | dano baixo e espalhado |

**Chefes** (rodadas 5, 10, 15, 20; vêm com metade dos pontos da rodada; avisados 2 rodadas antes com silhueta e regra; depois da 20 repetem a cada 5 com o dobro de vida e dano):
| Rodada | Chefe | Vida / Dano / Cad. | Regra especial (1 linha) | Espólio |
|---|---|---|---|---|
| 5 | Gutbucket the Wide | 320 / 14 / 1,5 | Each swing hits every soldier within 0.5. | 1 de 3 relíquias + 10 de ouro |
| 10 | Nip & Tuck | 500 cada / 16 / 1,0 | When one twin falls, the other gets 50% faster and stronger. | 1 de 3 relíquias + 10 de ouro |
| 15 | Madame Moleworth | 1100 / 25 / 1,2 | Digs under the first three plots and comes up at plot 4. | 1 de 3 relíquias + 10 de ouro |
| 20 | King Gobble the Uninvited | 2000 / 30 / 1,2 | Calls 4 Munchers every 5 s; cannot be slowed or stuck. | 1 de 3 relíquias + 10 de ouro + título |

## 6. Espólios e relíquias
Depois de vencer, 1 de 3, sempre os mesmos três tipos, mostrados antes da luta:
| Espólio | O que é |
|---|---|
| Card | uma carta com nome à vista (sorteio por raridade), para pôr na hora |
| Promotion | +1 nível numa carta do reino, à escolha |
| Purse | 8 de ouro; em 15% das vezes é uma Relic no lugar (chance na tela) |

Relíquias (valem até o fim da partida; sem repetir):
| Relíquia | Texto do jogo |
|---|---|
| Lucky Horseshoe | Your first reroll each round is free. |
| Last Candle | Your last soldier standing deals triple damage. |
| Spare Crown | The castle gets one extra life. |
| Gate Bell | Soldiers on plot 1 have 40% more health. |
| Long Fuse | Magic is 30% stronger. |
| Tax Ledger | +3 gold for every win. |
| Twin Banner | Family bonus needs 2 plots, not 3. |
| Blueprints | Buildings reach 2 plots on each side. |

## 7. Ouro (só se ganha jogando; nunca se compra)
| Item | Valor |
|---|---|
| Começo da partida | 3 |
| Vitória | 4 + 1 por terreno em que nenhum invasor pisou |
| Chefe vencido | +10 |
| Derrota | 2 |
| Sortear de novo | 2, +1 a cada novo sorteio na mesma rodada |
| Consertar 1 vida | 20, depois 30, 40… (nunca acima do máximo de vidas) |

## 8. A curva da partida
Perdeu: perde 1 vida, não ganha espólio, e a MESMA rodada volta com horda nova de mesma força, depois de mais uma carta. Pontos = 100 × rodadas vencidas + % da vida da horda derrubada na última luta (0 a 99).
| Rodadas | O que o jogador sente | Como o jogo faz |
|---|---|---|
| 1–3 | "Sou forte e entendi" | só Munchers; vitória certa com qualquer tropa; 1º nível 2 |
| 4–5 | "Agora é sério" | Runners e Slingers; 1º chefe; 1ª relíquia |
| 6–10 | "Meu plano está fechando" | reino cheio; família com bônus; 1ª derrota provável; 2º chefe |
| 11–15 | "Por um fio" | lutas decididas no último terreno; conserto de vida; nível 5 |
| 16+ | "Recorde" | só reino bem montado passa; cada rodada vale para o ranking |

Tempo por rodada: cerca de 40 s (escolher 12 s, luta 15 s, espólio 8 s). Partida mediana acaba na rodada 12 (faixa 10–14), em 9 a 11 min; a de um bom jogador vai à 18–22, em 13 a 15 min.

## 9. Álbum e conquistas
- Começa com 12 cartas: as 10 do piloto + Bunkhouse + Rally Horn.
- As outras 18 liberam por **rodadas vencidas somadas** (treino conta; nunca diminui; sem relógio): a 1ª com 8, as 8 seguintes a cada 15, as 9 últimas a cada 30 (total 398). Ordem fixa e à vista, com a silhueta da próxima: Uncommon → Rare → Epic → Legendary.
- Conquistas dão só título e enfeite:

| Conquista | Como |
|---|---|
| First Supper | win your first battle |
| Not on My Road | beat Gutbucket |
| Clean Plate | win a battle without losing a soldier |
| Last One Standing | win with exactly one soldier left |
| Full House | fill all 6 plots |
| Top Brass | raise a card to level 5 |
| One Big Family | hold 6 plots of the same family |
| Penny Pincher | win round 10 without a single reroll |
| Double Trouble | beat Nip & Tuck |
| Mole Patrol | beat Madame Moleworth |
| Long Live the Pudding | beat King Gobble |
| Head Librarian | unlock every card |

## 10. Ranking da temporada
- **Conta a média das 3 melhores partidas de ranking da temporada.** Porquê: uma partida só premia a semente de sorte; a média de 3 premia quem joga bem sempre, e quem joga mais não passa na frente só por jogar mais.
- Temporada de 7 dias. Energia das partidas de ranking: proposta do economista em `jogo.md`, não decidida aqui. Treino é livre.
- Ligas por faixa fixa de pontos (a meta fica clara):

| Liga (título) | Média |
|---|---|
| Gate Sweeper | até 799 |
| Road Warden | 800–1199 |
| Keep Captain | 1200–1599 |
| Lord Steward | 1600–1999 |
| Crown Guardian | 2000 ou mais |
| Legend of the Mile | os 10 primeiros |

- No beta ganha-se só título e enfeite (bandeira do castelo, piso da estrada, moldura do cartão). Nada dá força.

## 11. Primeiros 60 segundos (sem tutorial em texto)
| Tempo | O que acontece |
|---|---|
| 0–5 s | abre direto na estrada: 6 terrenos vazios, castelo com o pudim na janela, 3 Tropas grandes viradas para cima; a do meio balança |
| 5–12 s | o jogador toca numa carta; o terreno 1 pulsa; ele toca no terreno; os soldados caem ali com som e poeira |
| 12–15 s | 3 Munchers aparecem no portão com os 3 espólios em cima; botão único "FIGHT" |
| 15–30 s | a luta roda sozinha; números pequenos sobem; o último Muncher sai correndo |
| 30–40 s | "VICTORY": ouro rola no contador; os 3 espólios viram cartas grandes |
| 40–50 s | o jogador pega um espólio (1º prêmio antes de 60 s) |
| 50–60 s | rodada 2: a 1ª carta brilha com o selo "LEVEL UP"; ele repete e vê os soldados crescerem |

## 12. Telas e festas
| Tela | O que é |
|---|---|
| Home | reino vivo ao fundo, um botão "PLAY", recorde e liga |
| Kingdom | a partida inteira: estrada, cartas, luta e espólio na mesma tela |
| Run End | rodadas, pontos, recorde, cartão do reino para postar e "PLAY AGAIN" |
| Album | as 30 cartas, chances, silhueta da próxima e a barra de rodadas |
| Ranking | sua média, liga, o que falta para a próxima e a lista |
| Profile | títulos, enfeites, som e "Less animation" |

| Festa | Dispara com |
|---|---|
| Pequena | golpe, invasor caído, moeda, carta posta no terreno, armadilha disparando |
| Média | vitória, nível novo, espólio pego, bônus de família ligado, "Last one standing", vitória sem perder soldado, carta nova no álbum |
| Grande | chefe vencido, carta no nível 5, carta Legendary no sorteio, recorde, subir de liga |

Nunca duas grandes seguidas; com "Less animation", sem tremida nem flash (kit de diversão).

## 13. Decisões que tomei e riscos
| Decisão | Motivo | Nota |
|---|---|---|
| Soldados guardam o terreno; o invasor é que anda | lê-se em 5 s e dá virada no último terreno | 92 |
| Batalha sem dado; semente só em cartas, hordas e espólios | servidor refaz a partida; a tela nunca mente | 95 |
| Perdeu: a mesma rodada volta, com mais uma carta | derrota vira chance de virada, não ladeira | 88 |
| 1ª carta do sorteio é sempre "LEVEL UP" | subir de nível é a festa do gênero; sem isso quase não acontece com 30 cartas | 90 |
| Espólio sempre Card / Promotion / Purse | escolha clara e igual em toda rodada | 90 |
| Horda e espólios à vista antes de escolher a carta | a escolha vira estratégia, não chute | 93 |
| Bônus de família com 3 terrenos | dá 2 famílias por reino e abre mais de 6 planos | 86 |
| Raridade na moldura, cor só da família | só uma coisa usa cor de destaque | 90 |
| Ranking pela média das 3 melhores | menos sorte, sem premiar volume | 91 |
| Álbum por rodadas vencidas somadas, ordem à vista | progresso honesto, sem relógio e sem sorteio | 89 |
| Ligas por faixa fixa de pontos | meta clara; título não depende dos outros | 85 |
| Nome provisório Keepmile | curto, diz estrada e castelo, sem colisão na busca | 80 |

Planos que têm de ser viáveis (alvo: 6 ou mais): muralha com arqueiros · bando com Smithy · campeão único (Sir Dent) · estrada de armadilhas · cozinha que cura · explosão (Squib, Geese, Fuse Depot) · ouro e relíquias.

| Risco | O que medir no simulador | Alvo |
|---|---|---|
| "LEVEL UP" e Promotion sempre a melhor escolha: todo reino vira 1 carta no nível 5 | % de escolhas por tipo; presença de cada carta nas partidas vencedoras de alto nível | nenhuma escolha acima de 60%; nenhuma carta em mais de 60% |
| Curva da horda errada: partida curta demais ou sem fim (cura que empata até os 30 s) | rodada final mediana; % de lutas que chegam a 30 s; duração da luta | mediana 10–14; menos de 2% das lutas aos 30 s; luta de 10–20 s |
| Tropa vence sempre de Magia e Construção, e sobra 1 plano só | planos diferentes entre os 10% melhores; vitória por plano | 6 ou mais planos, cada um em 8% ou mais dos melhores |
