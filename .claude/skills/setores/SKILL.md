---
name: setores
description: PRIMORDIAL — SETORES DE MÃO DE OBRA do jogo. Use SEMPRE que o dono decidir algo para implementar: o diretor descobre o setor pelo arquivo (tabela abaixo, a preencher pelo arquiteto quando houver código) e manda a tarefa ao agente certo, que é dono dos arquivos do setor naquele lote.
---

# Setores de mão de obra

Os setores dividem o código por **dono de arquivo**, para dois agentes nunca mexerem no mesmo arquivo. O desenho dos setores será feito pelo `arquiteto` quando existir código; a tabela abaixo é o ponto de partida.

## Tabela "pedido → setor" (pelo arquivo que muda)
| Setor | Agente | Ramo | Modelo | Dono dos arquivos |
|---|---|---|---|---|
| SERVIDOR E REGRAS | `dev-servidor` | `teste-servidor` | Opus para dinheiro e núcleo da batalha, Sonnet no resto | pasta do servidor, regras compartilhadas, testes do servidor (a criar) |
| TELAS E CANVAS | `dev-tela` | `teste-telas` | Sonnet | páginas, scripts da tela, CSS, canvas (a criar) |
| ARTE E SOM | `diretor-de-arte`, `designer-de-som` | `teste-arte-som` | Sonnet | `arte/`, sons (a criar) |
| TESTES E CONSERTOS | `testador`, `cacador-de-bugs` | `teste-qualidade` | Sonnet | testes de tela e checagens, bateria completa |

Pedido que toca 2 setores: o diretor divide em 2 lotes (um por setor), e o que depende do outro espera o "pronto" do primeiro.

## Como o diretor manda (1 pedido por lote, na hora em que o dono decide)
1. Anota em `docs/fila.md` (setor, arquivos, prazo) e a decisão em `docs/decisions.md`.
2. Pedido ao agente: o que muda (com a frase do dono), arquivos que PODE e NÃO pode mexer, meta da TRINDADE (85+), prazo em BRT, "fotos PC 1280x720 e celular 390x844".
3. Setor sem lote = pega o próximo da fila; o diretor nunca deixa um setor parado se há pedido do dono na fila.

## Como cada setor trabalha
- Antes de começar: atualiza o ramo com o `teste`.
- `npm test` verde → commit (autor do projeto, sem Co-Authored-By) → envia SÓ o próprio ramo `teste-<tarefa>` (quando a regra de envio permitir) → 1 mensagem ao diretor: sha, o que mudou, testes, fotos, notas da trindade.
- Número do arquivo de configuração: linha no `docs/decisions.md` no MESMO commit (editar, `git add`, commit em comandos separados). Número de ECONOMIA, dinheiro, production e apagar: nunca sem o "sim" do dono (o diretor pergunta).
- Nunca envia `teste` nem `main`; nunca publica (só o diretor).

## Como o diretor junta
`git fetch origin <ramo>` → merge no `teste` (conflito em `docs/decisions.md`: manter as duas linhas) → `npm test` → push do `teste` → fila "PRONTO".
