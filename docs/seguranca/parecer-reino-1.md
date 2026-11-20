# Parecer de segurança — servidor do Keepmile

## Rodada 1 (commit 2721a90, 19/11/2026 21:34 BRT): **GO** para o main (beta sem dinheiro, nada publicado)
`npm test` 304/0; nada apagado; a mudança em tarefa16 (`>= 4`) foi aceita (a v5 está fixada em reino-api-banco.test.js:50; o certo é fixar `== 5`).

| Nº | Gravidade | Estado |
|---|---|---|
| K1 seq antigo e replay refazem a partida | média | EM CONSERTO (R16): 14 ms e 19 ms/147 KB por pedido (partida de 88 comandos); só repetir o último seq + resposta guardada; limite do replay por IP |
| K2 estrada do dia com conta descartável | média | EM CONSERTO (R16): 9/9 passos iguais; atinge só o placar do dia; placar só de conta criada antes do dia e com 1 ranking terminado. A estrada do dia serve para título, NUNCA para prêmio |
| K3 fecho da temporada num pedido só | baixa | EM CONSERTO (R16): fechar em lotes |
| K4 modo.json com %xx diz "local" | baixa | EM CONSERTO (R16): decodificar antes de procurar |
| K5 segredo da estrada no banco e nas cópias | baixa | EM CONSERTO (R16): aviso no boot; exigir `REINO_SEGREDO` antes do lançamento |
| K6 repetir partida terminada por tempo diz "aberta" | baixa | EM CONSERTO (R16) |

Fechado: entrada hostil, partida e replay alheios, energia (2 servidores e relógio), virada e títulos, chaves de emergência, v1/v4→v5 com cópia, WAL.

Risco que fica: CPU por pedido cerca de 40 vezes maior que no jogo antigo. Os 2 médios precisam estar fechados antes de o servidor ficar aberto ao público.

**Lição:** toda rota que refaz uma partida desde a semente (repetir seq antigo, replay) precisa de limite próprio ou de resposta guardada.
