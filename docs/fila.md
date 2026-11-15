# Fila de trabalho

O diretor escreve aqui ANTES de despachar (skill `diretor`). Duas tarefas no mesmo arquivo nunca rodam juntas.

**Estados:** `FILA` · `RODANDO` · `CONFERINDO` · `PRONTO` · `TRAVADO` · `ESPERA DONO`

| Nº | Tarefa | Agente (modelo) | Arquivos que mexe | Depende de | Estado |
|---|---|---|---|---|---|
| 1 | Motor de batalha sem tela (semente + comandos → resultado), 24 cartas, 9 bonecos, 2 robôs, simulador de 10.000 lutas | general-purpose (Opus) | shared/, tests/servidor/batalha*.test.js, tools/simular-batalha.mjs | — | RODANDO |
| 2 | Simulador da economia do pote (3 cenários: enchente, estável, fuga) + proposta de números para o "sim" | general-purpose (Opus) | tools/simular-economia.mjs, tests/servidor/economia-sim.test.js, docs/ideias/economia-do-pote.md | — | RODANDO |
| 3 | Tela do protótipo em canvas (3×3, mão, Linha, roda) + 9 bonecos desenhados | dev-tela (Sonnet) | public/ | 1 | FILA |
| 4 | Costura local (cruzamento com chances na tela) + Pontos de Costura e Carretel | dev-servidor (Opus) | shared/costura.js, tests/servidor/costura.test.js | 1 | FILA |

## Já subiu
(nada publicado ainda)
