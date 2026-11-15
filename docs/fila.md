# Fila de trabalho

O diretor escreve aqui ANTES de despachar (skill `diretor`). Duas tarefas no mesmo arquivo nunca rodam juntas.

**Estados:** `FILA` · `RODANDO` · `CONFERINDO` · `PRONTO` · `TRAVADO` · `ESPERA DONO`

| Nº | Tarefa | Agente (modelo) | Arquivos que mexe | Depende de | Estado |
|---|---|---|---|---|---|
| 1 | Motor de batalha sem tela (semente + comandos → resultado), 24 cartas, 9 bonecos, 2 robôs, simulador de 10.000 lutas | general-purpose (Opus) | shared/, tests/servidor/batalha*.test.js, tools/simular-batalha.mjs | — | PRONTO (7aa9c91; 44 testes; 9,3 turnos, quem começa 50%) |
| 2 | Simulador da economia do pote (3 cenários: enchente, estável, fuga) + proposta de números para o "sim" | general-purpose (Opus) | tools/simular-economia.mjs, tests/servidor/economia-sim.test.js, docs/ideias/economia-do-pote.md | — | PRONTO (66f79dc juntado; números são PROPOSTA, esperam o motor e o "sim") |
| 3 | Tela do protótipo em canvas (3×3, mão, Linha, roda) + 9 bonecos desenhados | dev-tela (Sonnet) | public/, server/dev.mjs, tests/tela/ | 1 | RODANDO |
| 4 | Costura local (cruzamento com chances na tela) + Pontos de Costura e Carretel | dev-servidor (Opus) | shared/costura.js, tests/servidor/costura.test.js, tools/simular-costura.mjs | 1 | PRONTO (a312f92; 59 testes; achados: Lendária × Comum vence ~62% e raridade infla com seleção → proposta ao dono junto com a economia) |
| 5 | Economia rodada 2: subir o ganho do farmador sem furar o pote; medir o rendimento do time alugado com o motor; proposta 95 | general-purpose (Opus) | tools/simular-economia.mjs, tests/servidor/economia-sim.test.js, docs/ideias/economia-do-pote.md | 1, 2 | ESPERA DONO (02980dd juntado; melhor conjunto nota 87; proposta levada ao dono 15/11 00:20) |

## Já subiu
(nada publicado ainda)
