# Parecer de segurança — servidor do Keepmile

## Rodada 1 (commit 2721a90, 19/11/2026 21:34 BRT): **GO** para o main (beta sem dinheiro, nada publicado)
`npm test` 304/0; nada apagado; a mudança em tarefa16 (`>= 4`) foi aceita (a v5 está fixada em reino-api-banco.test.js:50; o certo é fixar `== 5`).

| Nº | Gravidade | Estado |
|---|---|---|
| K1 seq antigo e replay refazem a partida | média | FECHADO (R16, rechecado com GO): repetir 1,9 ms sem motor; seq antigo 409; replay 120/min por IP. Fica: cache de replay ocupa ~6,7× o contado na memória (médio novo, conserto na R19) |
| K2 estrada do dia com conta descartável | média | FECHADO (R16): replay da própria estrada de hoje 409; placar com `foraDoPlacar`. Fica: conta das 23:59 com 1 ranking desistido entra no placar (baixo, risco aceito; placar é só enfeite). A estrada do dia serve para título, NUNCA para prêmio |
| K3 fecho da temporada num pedido só | baixa | FECHADO (R16): lotes de 20; corrida sem título repetido |
| K4 modo.json com %xx diz "local" | baixa | FECHADO (R16): 8 variações dão "servidor" |
| K5 segredo da estrada no banco e nas cópias | baixa | FECHADO (R16): aviso no boot; segredo curto recusado; valor fora do log. Exigir `REINO_SEGREDO` antes do lançamento |
| K6 repetir partida terminada por tempo diz "aberta" | baixa | FECHADO (R16): diz "terminada", motivo "tempo" |

Fechado: entrada hostil, partida e replay alheios, energia (2 servidores e relógio), virada e títulos, chaves de emergência, v1/v4→v5 com cópia, WAL.

Risco que fica: CPU por pedido cerca de 40 vezes maior que no jogo antigo. Os 2 médios precisam estar fechados antes de o servidor ficar aberto ao público.

**Lição:** toda rota que refaz uma partida desde a semente (repetir seq antigo, replay) precisa de limite próprio ou de resposta guardada.
