# Keepmile — servidor (R14, 19/11/2026; consertos de segurança R16, 20/11/2026)

Código: `server/reino/` (regras `reino.mjs`, rotas `rotas.mjs`, tabelas `banco.mjs` = migrações v5 e v6) · testes `tests/servidor/reino-api*.test.js`.
Sem dinheiro e sem token: só título e enfeite. O servidor sorteia, aplica cada comando com o motor (`shared/reino/partida.js`) e grava o resultado que ELE calculou.

## Para a tela
- Modo: `GET /public/reino/modo.json` → no servidor `{ "modo": "servidor", "api": "/api/reino/" }`; o arquivo parado diz `{ "modo": "local" }`.
- Conta e sessão são as do jogo antigo: `POST /api/conta {apelido}` → `{ conta, token }`; depois `Authorization: Bearer <token>`. Corpo sempre `application/json`.
- Erro: `{ erro: { codigo, motivo, ...extra } }` com `motivo` em português simples. Campo desconhecido ou tipo errado: 400.

## Rotas
| Rota | Corpo / consulta | Resposta | Erros |
|---|---|---|---|
| `POST /api/reino/partida` | `{ modo: "ranking" \| "treino" \| "estrada" }` | 201 `Partida` + `energia` | 400 MODO_INVALIDO · 409 PARTIDA_ABERTA `{partida}` · 409 SEM_ENERGIA `{energia}` · 409 ESTRADA_JA_JOGADA · 429 MUITAS_PARTIDAS |
| `GET /api/reino/partida?modo=` | modo opcional | `{ partida: Partida \| null, abertas: [{id, modo}], energia }` (sem modo: a última mexida) | 400 MODO_INVALIDO |
| `POST /api/reino/partida/comando` | `{ partida, seq, comando }` | 200 `Partida` (com `eventos` e `novidades`) | 409 SEQ_FORA_DE_ORDEM `{seq}` · 409 SEQ_JA_USADA `{seq}` · 409 SEQ_ANTIGA `{seq}` · 409 PARTIDA_ACABOU `{partida}` · 422 COMANDO_RECUSADO `{motivoDoMotor}` · 404 |
| `POST /api/reino/partida/desistir` | `{ partida }` | 200 `Partida` terminada | 409 PARTIDA_ACABOU · 404 |
| `GET /api/reino/ranking?cursor=&temporada=` | cursor da página anterior; temporada opcional | `Ranking` | 400 CURSOR_INVALIDO · 400 TEMPORADA_INVALIDA |
| `GET /api/reino/perfil` | — | `Perfil` | — |
| `GET /api/reino/replay/:id?desde=` | `desde` opcional (1º passo da página; padrão 0) | `Replay` | 400 CAMPO_INVALIDO (desde) · 404 (não existe ou não pode ver) · 409 PARTIDA_ABERTA · 409 ESTRADA_DE_HOJE · 429 MUITOS_PEDIDOS (por conta e por IP) |
| `POST /api/reino/apelido` | `{ apelido }` — 3–16 de [A-Za-z0-9 _-], com letra ou número, sem espaço nas pontas nem dois seguidos | 200 `Perfil` | 400 APELIDO_INVALIDO · 400 APELIDO_BARRADO · 400 CAMPO_DESCONHECIDO · 409 APELIDO_EM_USO (único sem caixa; I/l/1 e O/0 contam igual) · 429 APELIDO_TROCADO_HOJE `{podeEm}` (1 troca por 24 h; recusa não gasta a vez) · 429 MUITOS_PEDIDOS (10 tentativas/h por conta, 30/h por IP; contam as recusadas) |
| `GET /api/reino/partida/ultima?modo=` | modo opcional | `{ partida: Partida \| null }` — a última TERMINADA da própria conta (do modo, ou de qualquer um); nunca a aberta; sem semente | 400 MODO_INVALIDO · 400 CAMPO_DESCONHECIDO · 429 MUITOS_PEDIDOS (só quando precisa remontar a partida: conta no limite do replay) |

Sempre possíveis: 401 SEM_SESSAO/SESSAO_VENCIDA · 429 MUITOS_PEDIDOS · 503 MANUTENCAO (tudo) · 503 SO_LEITURA (todo POST).

**Comando** = o do motor: `{tipo:"por", carta, terreno}` · `{tipo:"sortear"}` · `{tipo:"consertar"}` · `{tipo:"batalhar"}` · `{tipo:"espolio", indice, terreno?}` · `{tipo:"desistir"}`. Mande só os que vêm em `opcoes.comandos`.

**seq** = quantos comandos a partida já aceitou (vem em `Partida.seq`). Repetir o ÚLTIMO comando (o `seq` anterior ao atual, com o mesmo comando: rede caiu, clique duplo) devolve a resposta guardada com `repetido: true`, sem aplicar nem refazer nada; se a partida terminou depois dele (tempo, fecho da temporada, teto), ela vem com `status: "terminada"` e o `resultado`. `seq` mais antigo que esse → 409 SEQ_ANTIGA (a tela recarrega com `GET /api/reino/partida`). Partida aberta antes da v6 do banco não tem resposta guardada: a repetição dela também dá SEQ_ANTIGA. PARTIDA_ACABOU traz a última `Partida` em `partida`.

**Partida** = `{ id, modo, dia ("aaaa-mm-dd" UTC), temporada, status ("aberta"|"terminada"), seq, visao, opcoes (null se terminada), eventos, novidades: { cartaNova, conquistas: [ids] }, resultado: null | { motivo, pontos, vencidas, rodada, conta }, prazo (ISO; parada até lá termina por tempo), foraDoPlacar (só no modo estrada: null ou `{ codigo: "CONTA_NOVA" | "SEM_RANKING", motivo }`) }`. `visao`/`opcoes`/`eventos` são os do motor (os da batalha vêm em `eventos[].tipo === "batalha"`). Nunca vem semente nem sorteio.

**Ranking** = `{ temporada: { numero, comeca, termina, fechada, melhoresQueContam }, lista: [{ posicao, apelido, pontos, partidas, liga }], proximo (cursor ou null), voce: null | { posicao, pontos, partidas, liga, faltaParaProxima: null | { liga, pontos } }, ligas, estradaDoDia: { dia, lista: [{ posicao, apelido, pontos, vencidas, partida }], voce: null | { status, pontos, posicao, foraDoPlacar }, jogou, foraDoPlacar } }`. Página de 50. `foraDoPlacar` (da conta que pede) = null ou `{ codigo, motivo }` com o texto "Fora do placar hoje: ..."; quem está fora tem `posicao: null`.

**Perfil** = `{ apelido, album: { rodadasVencidas, liberadas, total, proxima: null | { carta, rodadas, faltam } }, conquistas: [{ id, feita }] (12), recordes: { pontos, rodadasVencidas, partidas }, melhores: [{ id, modo, pontos, vencidas, rodada, quando }] (5), energia: { atual, maximo, porDia, recarregaEm }, temporada: { numero, termina, voce }, titulos: [{ temporada, posicao, pontos, liga }] }`. Nomes e textos das conquistas e ligas ficam na tela (ids: supper, road, plate, last, house, brass, family, penny, double, mole, pudding, librarian; ligas gate, road, keep, lord, crown, legend).

**Replay** = `{ id, modo, dia, temporada, apelido, propria, cartasLiberadas, semente, inicio: visao, passos: [{ comando, eventos, visao }], totalPassos, desde, proximo, resultado }`. A tela reproduz pelos `passos`, sem motor. Até 100 passos por resposta: partida maior vem em páginas — pedir de novo com `?desde=<proximo>` até `proximo` vir `null` e juntar os `passos` (`inicio` é sempre a visão do começo). Partida comum (menos de 100 comandos) vem inteira numa resposta só, como antes. A semente sempre vem, porque a estrada de hoje não sai para ninguém antes da virada do dia (nem a própria).

## Decisões que tomei (ASSUMPTION; o diretor confirma ou troca)
1. **Menos de 3 partidas de ranking:** pontuação = soma das melhores ÷ 3; a que falta conta 0. É a regra mais simples e não premia jogar 1 só (1 partida de 1500 vale 500).
2. **Ligas:** faixa fixa da bíblia (seção 10: até 799, 800, 1200, 1600, 2000; os 10 primeiros = Legend of the Mile, se tiverem ponto). A tarefa falava em percentis; fiquei com a bíblia (decisão anterior, "meta clara, título não depende dos outros"). Números em `shared/reino/config.js` (BETA), provisórios.
3. **Energia:** saldo + 3 a cada virada UTC desde o último dia gravado, até 9; gasta na mesma transação que cria a partida; relógio que volta não dá energia. Conta nova começa com 3. Desistir não devolve.
4. **Estrada do dia:** semente = HMAC-SHA256(segredo do servidor, dia UTC). Segredo: variável `REINO_SEGREDO` (≥ 32 letras) ou o sorteado na migração v5 (tabela `meta`). Sem a variável, ou com ela curta (< 32: recusada, nunca usada em silêncio), o boot escreve AVISO no log e usa o do banco. **Risco (R16, K5):** o segredo do banco vai junto em toda cópia do banco (`copias/`, feitas antes de migrar); quem lê uma cópia calcula a estrada de qualquer dia. Não tirei da cópia porque a cópia restaurada ficaria sem segredo e a estrada do dia mudaria no meio do dia. Conserto: definir `REINO_SEGREDO` (32+ letras, no cofre da hospedagem) ANTES do lançamento; aí o do banco não é usado. Cartas = álbum inicial (12) para todos. 1 tentativa por dia (desistir gasta). Placar do dia (decisão de 19/11 21:34, R16 K2) só com partidas terminadas e conferidas de conta criada ANTES das 00:00 UTC daquele dia e com pelo menos 1 partida de ranking terminada antes do fim daquele dia; quem não cumpre joga e vê `foraDoPlacar` com o motivo. A estrada do dia é só título, nunca prêmio.
5. **Temporada:** número = semanas desde a 1ª segunda da era; a partida conta na temporada em que ABRIU. Fecha a partir do 1º pedido depois de segunda 00:00 UTC + 3 h de folga, em lotes (R16 K3): cada pedido termina no máximo 20 partidas de ranking ainda abertas (`fim_da_temporada`); sobrando, os pedidos seguintes continuam; sem nenhuma aberta, grava posição, média e liga de cada conta (`reino_titulos`) uma vez só.
6. **Partida parada:** 3 h sem comando → termina por tempo (`tempo`), vale o que tinha. Teto de comandos = o do motor (3000) → termina (`teto`). Tudo isso é feito no próximo pedido da conta (sem tarefa em segundo plano).
7. **Anti-trapaça:** ao terminar, o servidor refaz a partida pela semente e pelos comandos; não bateu → grava mas não conta (`resultado.conta = false`) e escreve ALERTA no log. Tempo de cada comando guardado em `reino_partidas.tempos` (ms desde o anterior), sem mínimo exigido.
8. **Guardado:** aberta = estado + comandos; terminada = semente, cartas, comandos, tempos e resultado (o estado sai). Sempre a última resposta de comando (`resposta`, migração v6), para a repetição não refazer a partida. Treino: as 100 últimas por conta (as 5 melhores ficam sempre).
9. **Replay alheio:** só de ranking de quem está entre os 10 primeiros da temporada, ou de estrada de dia passado entre os 10 do placar daquele dia; treino alheio nunca; a estrada de hoje de ninguém, nem a própria (409 ESTRADA_DE_HOJE até a virada). Quem ainda tem aberta a estrada daquele dia não vê a dos outros. O replay montado fica guardado na memória do servidor (até 32 MB; partida terminada não muda), então pedir de novo não refaz a partida.
10. **Álbum:** rodadas vencidas somadas em todos os modos (a bíblia: "treino conta"); a carta nova vale a partir da partida seguinte. Conquistas calculadas pelo servidor a cada comando.
11. **Limites (técnicos, `PARAMS_REINO`):** 30 aberturas por hora por conta, 120 por IP, 30 replays por minuto por conta e 120 por IP (somando as contas), além dos limites do jogo antigo.

## Fica de fora
- Enfeites (bandeira, piso, moldura) e nomes dos títulos na tela: só os ids da liga e da conquista.
- Ranking de temporadas antigas usa as mesmas tabelas; não há "melhores de todos os tempos".
- Painel do dono e qualquer prêmio: nada aqui.


**R22 (banco v7).** Ranking: `lista[]` ganha `partida` (id da MELHOR partida terminada e conferida da conta na temporada, ou null fora do top 10 do replay; a própria sempre vem) e `estradaDeOntem: { dia, lista: [{ posicao, apelido, pontos, vencidas, partida }] }` (placar do dia passado, só leitura; `partida` = null fora do top 10 e, para quem ainda tem a estrada de ontem aberta, null em todas menos a própria). Perfil: `conquistas: [{ id, feita, quando (ISO ou null) }]` e `trocaDeApelido: { podeEm: ISO | null }` (null = já pode trocar).
