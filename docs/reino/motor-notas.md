# Motor do reino — notas (R6, 19/11/2026)

Código: `shared/reino/` (config, partida, batalha, robôs) · simulador `tools/simular-reino.mjs` · testes `tests/servidor/reino-*.test.js`.
Todos os números seguem PROVISÓRIOS. Medido com `node tools/simular-reino.mjs --partidas 600` (semente "keepmile", álbum com as 30 cartas).

## 1. Onde a bíblia era ambígua (escolhi o mais simples)
| Ponto | Escolha |
|---|---|
| Passo da luta | 0,1 s, como a bíblia (a tarefa sugeria 50 ms; a bíblia é a especificação) |
| Pôr carta | opcional: pode lutar sem pôr; 1 carta por oferta; sortear só antes de pôr |
| Sorteios da rodada | na abertura da rodada, nesta ordem: horda → espólios → oferta. Perder abre a mesma rodada com tudo novo |
| Rodada 1 | 3 Tropas diferentes, por raridade, só das que lutam (Soup Carrier fica fora) |
| Espólio Card | põe na hora (pede terreno). Promotion pede terreno com carta abaixo do nível 5 |
| Espólio de chefe | 3 relíquias que você ainda não tem (+10 de ouro automático); faltando relíquia, completa com Purse |
| Purse com relíquia | a relíquia já aparece com nome antes da luta |
| Spare Crown | +1 vida e +1 no máximo de vidas |
| Lucky Horseshoe | o 1º sorteio de cada oferta é grátis; o 2º custa 2 |
| Conserto | só na fase de carta |
| Chefes | velocidade 0,6/s, alcance corpo a corpo; vida e dano NÃO crescem com a rodada (só ×2 a cada volta depois da 20); entram no fim da fila |
| Nip & Tuck | 2 gêmeos; a fúria (+50% velocidade, cadência e dano) liga quando um cai |
| Moleworth e Mole Raider | somem ao entrar e saem em x = 3,0 (começo do terreno 4) 1,5 s depois; enterrados não apanham |
| King Gobble | chama 4 Munchers no portão a cada 5 s, no máximo 12 |
| Falconer | "mais longe" = mais distante dela, dentro do alcance |
| Granny Bolt | "mais duro" = mais vida agora |
| Sparkwright | o raio pula para o inimigo mais perto do anterior (até 1,0), sem repetir |
| Soup Carrier | não anda; cura quem perdeu mais vida até 1,5 (pode ser ela mesma) |
| Quack | não bate; para quando há soldado a 0,3; cura 1 vez por segundo |
| Tinker's Shed | magia de gatilho dispara de novo 3 s depois com X% da força; Tar Puddle e Angry Bees ficam X% mais fortes; Bramble Snare prende um 2º lote; Seconds! ganha X% de levantadas |
| Seconds! | vale para o reino todo (os primeiros que caem em qualquer terreno) |
| Força da magia | 100% + 25% (família Fizzwick) + 30% (Long Fuse), somados |
| Bônus de construções | percentuais somam; redução de dano tem teto de 75%; lentidão tem teto de 90% (vale a maior entre torta e piche) |
| Nightfall | dobra (agora triplica) dano de golpes, tiros, estouros e abelhas; Grand Finale (% da vida) não |
| "Terreno em que nenhum invasor pisou" | o terreno onde nenhum invasor visível esteve; o Mole que sai no 4 pisa do 4 em diante |
| Pontos | 100 × rodadas vencidas + % da horda derrubada na última luta, só se ela foi perdida (0 a 99) |
| Lista de cartas liberadas | é reordenada pela ordem do config: a mesma lista em outra ordem dá a mesma partida |

## 2. Regras que mudei (a regra da bíblia quebrava a luta; a menor troca)
1. **Corpo a corpo vai atrás de atirador que o alcança.** Sem isso o Spud Slinger parava a 2,5 e ninguém chegava nele: luta empatada até os 30 s (era a maior causa das lutas aos 30 s).
2. **Sem nenhum soldado de pé, a luta acaba em derrota na hora** (a horda entra andando na tela). Antes a tela esperava a caminhada até o castelo e a luta batia nos 30 s.
3. **Sir Dent não ganha cavaleiro extra do Bunkhouse.** Um cavaleiro de vida enorme virava 3 ou 4 (×4 de força por desenho, não por número). Ele também passou a crescer exatamente o dobro dos outros por nível (+40/+80/+140/+200%).
4. **Grand Finale só pega quem já está na estrada** (não os que ainda vão entrar). Tirando % da vida máxima de todos, ela ignorava a força da rodada e dominava.
5. **Squib Runner não explode em invasor que já vai cair no mesmo passo.** Os dois Squibs explodiam juntos no mesmo Muncher.
6. **King Gobble chama no máximo 12 Munchers** (a bíblia não tinha teto; sem teto a luta não acaba).
7. **Rodada 1 = 2 Munchers** (base da horda 4 → 1): com 3, metade das Tropas perdia sozinha no terreno 1 e a bíblia promete "vitória certa com qualquer tropa".

## 3. Rodadas de ajuste (6) — de → para, motivo, efeito medido
Medidas intermediárias com 40–300 partidas por robô; a final com 600.
| Rodada | Número | De → para | Motivo | Efeito medido |
|---|---|---|---|---|
| 0 | (mudanças de regra 1 e 2) | — | lutas aos 30 s | 10,5% → 4,2% das lutas aos 30 s |
| 1 | Nightfall (BATALHA.multNoite) | ×2 → ×3 | lutas longas no fim da partida | aos 30 s 4,2% → 1,5% |
| 1 | Bunkhouse | +1/1/2/2/3 → +1/1/1/2/2 | presente em 67% dos melhores reinos | 67% → 20–33% |
| 1 | Gutbucket (vida) | 450 → 380 | ~10% das partidas morriam na rodada 5 | vitória contra ele 47% → 60% |
| 1 | King Gobble (vida) | 2000 → 1600 | 6% de vitória contra ele | quase nada (6% → 5–12%) |
| 2 | Conserto (passo) | 20, 30, 40… → 20, 40, 60… | 4 consertos por partida esticavam tudo | consertos 4,0 → 2,9 por partida |
| 2 | Grand Finale | 15/22/30/40/50% → 10/15/20/25/30% | dominava os melhores reinos (100%) | 100% → 17–33% |
| 3 | Força da horda (HORDA.escalaPorRodada) | +10% → +14% por rodada | ganancioso ia à rodada 17 (alvo 10–14) | mediana 17 → 14 |
| 3 | Sir Dent | vida 140 → 120, nível ×1,5/2/2,7/3,5 → ×1,4/1,8/2,4/3,0 | 80% dos melhores reinos | 80% → 73% (não bastou) |
| 3 | King Gobble | teto de chamados 40 → 12 | parede na rodada 20 (0–4% de vitória) | 4% → 9% |
| 4 | Família Pikewall | −15% → −10% de dano | Pikewall em 60% dos melhores | 60% → 33% |
| 4 | Família Potluck | cura 2 → 4 por s | o plano "cozinha" perdia de todos | Potluck passou a aparecer (20–60%) |
| 4 | Cookhouse | 2/3/4/5/6 → 3/5/7/9/12 por s | idem | idem |
| 4 | Soup Carrier (cura) | 8 → 14 | idem | idem |
| 4 | Frypan Cook (vida) | 22 → 26 | idem | idem |
| 4 | Pie Thrower (dano) | 4 → 6 | perdia de tudo | — |
| 4 | Clockwork Geese (vida) | 8 → 10 | bando morria no 1º golpe | — |
| 4 | Granny Bolt (dano) | 24 → 40 | o tiro lento não matava nada | presente em 30–53% dos melhores |
| 4 | Sir Dent (vida) | 120 → 110 | ainda dominante | 73% → 50% (rodada 6) |
| 4 | King Gobble (vida) | 2000 → 1400 | parede | 9% → 10% |
| 4 | Fuse Depot | 10/14/18/24/30 → 15/22/30/40/50 | plano "explosão" fraco | passou do ponto: 100% dos melhores |
| 5 | Fuse Depot | → 6/8/10/13/16 | 100% dos melhores reinos | 100% → 53% |
| 5 | Squib Runner (dano) | 20 → 30 → 24 | 30 era demais (70% dos melhores) | 70% → 47% |
| 5 | Nip & Tuck (vida) | 500 → 420 cada | parede do ganancioso (16%) | 16% → 21–25% |
| 5 | King Gobble (vida) | 1400 → 1000 | parede | 10% → 8–14% (o problema é a horda da rodada 20, não a vida dele) |
| 6 | Hedge Archer (dano) | 7 → 8 | arqueiros fracos | — |
| 6 | Vida e dano por nível (MULT_NIVEL) | ×1,2/1,4/1,7/2,0 → ×1,18/1,36/1,6/1,9 | LEVEL UP escolhido demais | 67% → 66% (quase nada) |
| depois | Base da horda | 4 → 1 ponto | regra 7 (rodada 1) | ver medição final |

## 4. Medição final (600 partidas por robô)
| Alvo | Medido | |
|---|---|---|
| Ganancioso: mediana 10–14 rodadas | 13 (p10 10, p90 18) | atingiu |
| Planejador ≥ 1,5× o aleatório | 17 ÷ 5 = 3,4× (aleatório p10 2, p90 5; planejador p10 10, p90 22) | atingiu |
| Batalha 10–20 s | mediana 13,5 s (p10 4,9; p90 23,1) | atingiu |
| Lutas aos 30 s < 2% | 0,61% (rodada 21+: 2,1%) | atingiu |
| Nenhuma carta > 60% nos 10% melhores | Squib Runner 62% (depois Sir Dent 47%, Frypan 40%) | quase (não atingiu) |
| ≥ 6 planos, cada um ≥ 8% | por dupla de famílias: 3 (Fizzwick+Pikewall 37%, Fizzwick+Potluck 35%, Pikewall+Thornbow 15%); por carta dominante: 5 | não atingiu |
| Nenhuma escolha > 60% | ganancioso: LEVEL UP 54%, Promotion 53%; planejador: LEVEL UP 67%, Promotion 41%; Tropa 73–76% das cartas postas | LEVEL UP do planejador e Tropa acima |
| Vitória contra chefes (planejador) | Gutbucket 60% · Nip & Tuck 31% · Moleworth 64% · King Gobble 13% | — |
| Ouro (planejador, por partida) | ganho 181 · gasto 146 (15 sorteios, 2,9 consertos); ganancioso 136 × 97 | — |
| ms por batalha com eventos | 0,34 ms (143 eventos em média) | atingiu (alvo < 5 ms) |


## 5. O que NÃO consegui (honesto)
- **Diversidade de planos (3 de 6).** Fizzwick está em quase todo reino forte porque as duas Commons dela (Squib Runner e Boom Barrel) aparecem cedo e servem a qualquer plano; Squib Runner fica em 62%. Próximo passo sugerido: Squib Runner como Uncommon, ou Boom Barrel mais fraco cedo; medir de novo.
- **Thornbow puro e Potluck puro** quase não aparecem entre os melhores; atirador sem frente morre. Precisa de rodada de ajuste só de Thornbow.
- **LEVEL UP no planejador em 67%** e Tropa em ~75% das cartas postas: subir de nível continua a melhor jogada na maioria das ofertas. Baixar o ganho por nível quase não mudou (67% → 66%).
- **King Gobble é parede (13% do planejador, 4% do ganancioso):** quem chega à rodada 20 quase sempre para ali. Baixar a vida dele quase não muda; o que pesa é a horda da rodada 20 (×3,66). Sugestão: horda do chefe com menos pontos (50% → 30%).
- **Nip & Tuck segura o ganancioso (25%)**: é ele que faz a mediana do ganancioso ficar em 13.
- **Números de nível que não mudam nada:** Bunkhouse (N1–N3 = +1; N4–N5 = +2) e Market Stall (N1=N2, N3=N4) têm níveis sem ganho — herdado da bíblia e piorado no Bunkhouse pelo ajuste. LEVEL UP nesses níveis é festa sem efeito; a tela precisa avisar ou o número precisa mudar.
- Os testes foram escritos junto com o código novo (não havia código antes para "falhar antes"); o determinismo e o reproduzir foram conferidos contra partidas reais dos 3 robôs.

