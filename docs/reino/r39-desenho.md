# R39 — vitória na rodada 20 e conquistas em degraus (desenho do arquiteto, 20/11/2026)

Decisão: `docs/decisions.md`, 20/11/2026 08:00. Medidas: `docs/reino/medidas-r36.md`.

## Vitória
- Config: `PARTIDA.rodadaDaVitoria: 20`.
- Motor (`shared/reino/partida.js`): função exportada `resistiu(vencidas)`; campos `visao.venceu`, `visao.fim.venceu`, `resultado.venceu`, todos saídos do número de vencidas (o contador sobe em `partida.js:337`; quem perde repete a rodada, então "venceu a 20" = `vencidas >= 20`). Nada guardado na partida muda, nenhum tipo novo de evento, `acabar()` igual: replay antigo sai idêntico.
- Servidor (`server/reino/reino.mjs`): sem coluna nova (`venceu = resistiu(linha.vencidas)`). `venceu` aparece em `Partida.resultado`, `Replay.resultado`, `perfil.melhores[]`, `estradaDoDia.lista[]` e `estradaDeOntem.lista[]`; novo `perfil.recordes.vitorias` (partidas conferidas com vencidas >= 20). Ranking da temporada sem selo.
- Tela: meta à vista "HOLD TO ROUND 20"; depois, selo pequeno "HELD". Festa quando `visao.venceu` passa de false para true depois da luta: faixa "ROUND 20 HELD!" e abaixo "KEEP GOING FOR SCORE" (usa `C.efeito('fireworks')`, confete, `Musica.momento('vitoria')`; sem flash com "Menos animação"; a cena não precisa de gancho novo). Fim: "THE KINGDOM HELD" × "RUN OVER". Replay: "HELD: N ROUNDS". Cartão com faixa. Servidor antigo sem o campo: a tela calcula com `resistiu(vencidas)`.
- Não fazer: acabar a partida na 20; pontos extras pela vitória; evento novo no motor.

## Conquistas (12 → 30)
As 12 de hoje ficam com os mesmos ids e datas. Novas (só título, sem prêmio):

| id | nome | condição |
|---|---|---|
| tally25 | Tally Stick | 25 rodadas vencidas somadas |
| tally50 | Notched Spoon | 50 somadas |
| tally100 | Hundred Hold | 100 somadas |
| tally200 | Old Gatepost | 200 somadas |
| tally400 | Every Stone of the Mile | 400 somadas |
| shields | Shields Up | bônus Pikewall ligado |
| bows | Nobody Gets Close | bônus Thornbow ligado |
| dish | Bring a Dish | bônus Potluck ligado |
| sparks | Mind the Sparks | bônus Fizzwick ligado |
| mason | Built to Last | construção no nível 5 |
| spicy | Extra Spicy | magia no nível 5 |
| encore | Encore! | vencer a rodada 25 |
| thread | By a Thread | vencer com 1 coração |
| seconds | Back on Your Feet | vencer a rodada logo depois de perdê-la |
| nopatch | No Patches | vencer o chefe 10 sem consertar na partida |
| scratch | Not a Scratch | vencer o chefe 15 com todos os corações |
| pockets | Pocketful | 3 relíquias numa partida |
| grand | Grand Entrance | carta de raridade L no reino |

- Regra num módulo só, `shared/reino/conquistas.js` (hoje está duas vezes: `server/reino/reino.mjs:439-476` e `public/reino/js/app.js:121-131`, `:429-433`). Contrato: `LISTA` (30 ids em ordem, grupos `chefes|lutas|reino|marcos`) e `conquistasDoPasso({antes, depois, eventos, comandos, rodadasAntes, cartasNoAlbum, tem}) → [ids novos]`. `contarSoldados` (hoje `reino.mjs:84`) vai para lá.
- Números dos degraus no config, bloco `CONQUISTAS`.
- Banco v8, só dados, idempotente: liga `tally*` por `rodadas_vencidas` e `encore` pelo maior número de vencidas numa partida conferida, sem data (`quando: null`). As de luta valem daqui para frente.
- Não fazer: conquista de sequência, de "volte amanhã" ou de número de partidas; dar para trás conquistas de luta.

## Contrato servidor → tela (todos opcionais)
`visao.venceu` · `resultado.venceu` · `replay.resultado.venceu` · `perfil.melhores[].venceu` · `perfil.recordes.vitorias` · `estradaDoDia.lista[].venceu` · `estradaDeOntem.lista[].venceu` · `perfil.conquistas: [{id, feita, quando}]` com 30 itens. Tela antiga ignora ids que não conhece.

## Tarefas
1. Motor + servidor (Opus; depois `seguranca`): config (`rodadaDaVitoria`, `CONQUISTAS`), `partida.js`, `conquistas.js`, `reino.mjs`, `banco.mjs` (`migracaoV8`), `server/db.mjs`, testes `reino-r39-motor` e `reino-r39`. Testes que falham antes: `venceu` false com 19 e true depois da 20; replay de robôs igual a uma foto tirada ANTES; um caso por id; nas 12 antigas o mesmo conjunto da regra de hoje em 200 sementes; `perfil.conquistas` com 30; banco v7 usado → v8 liga `tally25–200` com `quando: null` e mantém as 12 com data; segundo boot não muda nada; partida antiga com 21 vencidas → `venceu: true`.
2. Tela (depois da 1): `app.js`, `interface.js`, `telas.js`, `fim.js`, `textos.js`. Modo local usa `conquistasDoPasso`; tela de conquistas em grupos com barra "123 / 200" de `perfil.album.rodadasVencidas`; trecho novo `REINO_SO=r39` no e2e.
3. Economista (depois da 1): `tools/medir-reino.mjs E` dá a partida mediana de cada uma das 30.
