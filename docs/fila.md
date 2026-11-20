# Fila de trabalho

O diretor escreve aqui ANTES de despachar (skill `diretor`). Duas tarefas no mesmo arquivo nunca rodam juntas.

**Estados:** `FILA` · `RODANDO` · `CONFERINDO` · `PRONTO` · `TRAVADO` · `ESPERA DONO`

| Nº | Tarefa | Agente (modelo) | Arquivos que mexe | Depende de | Estado |
|---|---|---|---|---|---|
| 1 | Motor de batalha sem tela (semente + comandos → resultado), 24 cartas, 9 bonecos, 2 robôs, simulador de 10.000 lutas | general-purpose (Opus) | shared/, tests/servidor/batalha*.test.js, tools/simular-batalha.mjs | — | PRONTO (7aa9c91; 44 testes; 9,3 turnos, quem começa 50%) |
| 2 | Simulador da economia do pote (3 cenários: enchente, estável, fuga) + proposta de números para o "sim" | general-purpose (Opus) | tools/simular-economia.mjs, tests/servidor/economia-sim.test.js, docs/ideias/economia-do-pote.md | — | PRONTO (66f79dc juntado; números são PROPOSTA, esperam o motor e o "sim") |
| 3 | Tela do protótipo em canvas (3×3, mão, Linha, roda) + 9 bonecos desenhados | dev-tela (Sonnet) | public/, server/dev.mjs, tests/tela/ | 1 | PRONTO (fc4dcef juntado; e2e verde no celular e no PC; trindade do agente D76 C85 Ch88; falta som, Aventura e tela de Costura) |
| 4 | Costura local (cruzamento com chances na tela) + Pontos de Costura e Carretel | dev-servidor (Opus) | shared/costura.js, tests/servidor/costura.test.js, tools/simular-costura.mjs | 1 | PRONTO (a312f92; 59 testes; achados: Lendária × Comum vence ~62% e raridade infla com seleção → proposta ao dono junto com a economia) |
| 5 | Economia rodada 2: subir o ganho do farmador sem furar o pote; medir o rendimento do time alugado com o motor; proposta 95 | general-purpose (Opus) | tools/simular-economia.mjs, tests/servidor/economia-sim.test.js, docs/ideias/economia-do-pote.md | 1, 2 | ESPERA DONO (02980dd juntado; melhor conjunto nota 87; proposta levada ao dono 15/11 00:20) |
| 6 | Tela 2: Aventura (5 fases com intenção visível), tela de Costura com revelação, som sintetizado, mais festa na carta jogada | general-purpose (Sonnet) | public/, tests/tela/ | 3, 4 | PRONTO (662ddf5 juntado; e2e verde no celular e no PC; som e festa só no esqueleto, de propósito: vêm no acabamento) |
| 7 | Servidor do protótipo: luta decidida no servidor (HTTP), conta local de teste, banco embutido, time do rival e semente vindos do servidor | general-purpose (Opus) | server/ (menos dev.mjs), tests/servidor/api*.test.js | 1, 4 | PRONTO (juntado b0070d5 com GO do seguranca para protótipo sem dinheiro; 95 testes; parecer em docs/seguranca/parecer-servidor-1.md) |
| 8 | ACABAMENTO — bonecos e cena: bonecos moles em camadas com poses e animação, ateliê em 3 planos, Tesoura pendurada, efeitos (guia de estilo §5, §6) | general-purpose (Fable) | public/js/boneco-rig.js, cenario.js, efeitos.js, public/arte.html, tests/tela/arte.e2e.mjs (só arquivos novos; encaixe na luta depois da tarefa 6) | — | RODANDO |
| 9 | ACABAMENTO — interface: fontes, logotipo, cartas, mão em leque, fita métrica, carretéis, bastidor, telas de entrada/time/fim (guia §3, §4, §7, §8) | general-purpose (Fable) | public/fontes/, CREDITOS.md, public/css/pecas.css, public/js/pecas/, public/pecas.html, tests/tela/pecas.e2e.mjs (só arquivos novos; encaixe depois da tarefa 6) | — | RODANDO |
| 10 | ACABAMENTO — som e música: efeitos, valsa da caixinha em camadas, folha de sons, teste que mede cada som (direção de som) | general-purpose (Fable) | public/js/som.js, musica.js, public/sons.html, tests/tela/som.e2e.mjs (o som.js substitui o esqueleto da tarefa 6 na junção) | — | RODANDO |
| 11 | ENCAIXE do acabamento na luta: trocar o desenho antigo pelo boneco novo e pela cena, as peças na tela de luta, de time e de fim, o som em cada acontecimento | general-purpose (Fable) | public/index.html, css, app.js, arena.js | 6, 8, 9, 10 | FILA |
| 12 | MOTOR, segurança (A1, A2, A11): sorteio com estado de 128 bits; carta jogada só volta ao descarte no fim do turno; teto de comandos por turno; números de carta embaralhados por luta; simulador de novo | general-purpose (Opus) | shared/rng.js, shared/batalha.js, shared/robos.js, tests/servidor/batalha.test.js, tools/simular-batalha.mjs | 7 | RODANDO |
| 13 | SERVIDOR rodada 2 (A3, A4, A5, A7, A8, A9, A10, chaves de emergência, sessão com validade e sair, teto de comandos por turno) | general-purpose (Opus) | server/ (menos dev.mjs), tests/servidor/api.test.js | 12 | FILA (entra quando abrir vaga) |

## Já subiu
(nada publicado ainda)

## Porão (jogo-sátira, uso pessoal) — desenho em docs/porao/desenho-v1.md

| Nº | Tarefa | Agente (modelo) | Arquivos que mexe | Depende de | Estado |
|---|---|---|---|---|---|
| P1 | Regras puras e config (ciclo do golpe, Calor, impressora, fusão, luxos, prestígio, contrato) | dev-servidor (Opus) | porao/comum/regras.js, config.js, porao/tests/regras.test.js | — | RODANDO |
| P2 | Nomes provisórios inventados + troca por nomes locais fora do git | dev-servidor (Sonnet) | porao/comum/nomes.js, porao/servidor/nomes-local.mjs, porao/tests/nomes.test.js | — | RODANDO |
| P3 | Cena isométrica do porão + zoom nos 3 monitores (arte provisória trocável) | dev-tela | porao/tela/index.html, estilo.css, sprites.js, cena.js | — | RODANDO |
| P4 | Banco e ações do jogo | dev-servidor (Opus) | porao/servidor/banco.mjs, jogo.mjs, porao/tests/jogo.test.js | P1, P2 | FILA |
| P5 | Servidor HTTP local (127.0.0.1:4900) | dev-servidor | porao/servidor/index.mjs, porao/tests/api.test.js | P4 | FILA |
| P6 | Conteúdo dos 3 monitores, celular da mesa, e2e | dev-tela | porao/tela/monitores.js, api.js, app.js, porao/tests/tela.e2e.mjs | P1, P3 | FILA |
| P7 | Simulador e ritmo dos números | economista (Opus) | porao/ferramentas/simular.mjs, números de porao/comum/config.js | P1 | FILA |
| PA | Piloto de arte lado a lado (PixelLab × pacote itch.io) | diretor-de-arte | arte/piloto-porao/ | — | ESPERA DONO |
