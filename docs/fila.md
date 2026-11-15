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
| 7 | Servidor do protótipo: luta decidida no servidor (HTTP), conta local de teste, banco embutido, time do rival e semente vindos do servidor | general-purpose (Opus) | server/ (menos dev.mjs), tests/servidor/api*.test.js | 1, 4 | CONFERINDO (9d28886 no ramo frayz-servidor; 94 testes; espera a revisão do seguranca antes de juntar — via cofre) |
| 8 | ACABAMENTO — bonecos e cena: bonecos moles em camadas com poses e animação, ateliê em 3 planos, Tesoura pendurada, efeitos (guia de estilo §5, §6) | general-purpose (Fable) | public/js/boneco-rig.js, cenario.js, efeitos.js, public/arte.html, tests/tela/arte.e2e.mjs (só arquivos novos; encaixe na luta depois da tarefa 6) | — | RODANDO |
| 9 | ACABAMENTO — interface: fontes, logotipo, cartas, mão em leque, fita métrica, carretéis, bastidor, telas de entrada/time/fim (guia §3, §4, §7, §8) | general-purpose (Fable) | public/fontes/, CREDITOS.md, public/css/pecas.css, public/js/pecas/, public/pecas.html, tests/tela/pecas.e2e.mjs (só arquivos novos; encaixe depois da tarefa 6) | — | RODANDO |
| 10 | ACABAMENTO — som e música: efeitos, valsa da caixinha em camadas, folha de sons, teste que mede cada som (direção de som) | general-purpose (Fable) | public/js/som.js, musica.js, public/sons.html, tests/tela/som.e2e.mjs (o som.js substitui o esqueleto da tarefa 6 na junção) | — | RODANDO |
| 11 | ENCAIXE do acabamento na luta: trocar o desenho antigo pelo boneco novo e pela cena, as peças na tela de luta, de time e de fim, o som em cada acontecimento | general-purpose (Fable) | public/index.html, css, app.js, arena.js | 6, 8, 9, 10 | FILA |

## Já subiu
(nada publicado ainda)
