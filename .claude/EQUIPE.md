# Equipe do jogo

25 agentes em `.claude/agents/`, cada um com a sua skill de ofício (`.claude/skills/oficio-<cargo>/`, carregada pelo campo `skills:`; só o diretor edita; evolui pela skill `evolucao`). A sessão principal é o diretor: fala com o dono, divide o trabalho, junta e faz o commit.
Máximo 4 agentes rodando juntos. Nunca dois agentes no mesmo arquivo ou na mesma tela. Agentes não fazem commit no `teste`.
Modelos: Opus só para pensar (plano, economia, segurança, auditoria, regras); Sonnet para escrever código e textos; Haiku para rodar e pesquisar.
Jeito de trabalhar: `docs/orquestra.md` (vias expressa, trem e cofre). Bateria já verde não se repete (`tools/verde.mjs`).
Agentes marcados **(só com a rede decidida)** esperam o dono escolher a rede do token.

## Mão de obra (dia a dia)
| Agente | Para quê | Modelo | Quando chamar |
|---|---|---|---|
| `dev-servidor` | Código do servidor (regras, batalha, cruzamento, mercado, banco) com teste | Sonnet médio | Mudança média ou grande no servidor |
| `dev-tela` | Tela (HTML, JS, canvas), com foto do teste de tela | Sonnet médio | Mudança média ou grande na tela |
| `economista` | Números do arquivo de configuração e o modelo sustentável, provados no simulador | Opus alto | Todo preço, chance, taxa ou renda. Escreve a linha em `docs/decisions.md` no mesmo commit (trava-economia) |
| `testador` | Roda `npm test`, travas, simulador e teste de tela e só relata | Haiku baixo | Quando o diretor fecha o lote (bateria completa, uma vez) |

## Apoio de qualidade
| Agente | Para quê | Modelo | Quando chamar |
|---|---|---|---|
| `integrador` | Junta ramo no `teste` (sem commit), roda o pacote uma vez, devolve verde/vermelho com a causa | Sonnet médio | Ramo terminou; o diretor confere e faz o commit |
| `revisor-de-codigo` | Revisa o diff antes da junção (GO/NÃO-GO com arquivo:linha e prova) | Opus alto | Antes de juntar ramo com código |
| `diretor-de-arte` | Escolhe e confere arte própria (licença, escala, paleta, partes que combinam) com foto | Sonnet médio | Arte nova ou trocada que o jogador vê |
| `designer-de-som` | Desenha, lista com custo, trata e confere sons | Sonnet médio | Som novo; gasto só com a frase do dono na conversa que executa |
| `cacador-de-bugs` | Joga o site de teste depois de cada publicação, lê os erros, devolve bug com teste que falha | Sonnet médio | Depois de cada publicação no test |
| `polidor` | Primeiros 10 minutos do jogador e sensação das telas, com foto e trindade | Sonnet médio | Ajustes pequenos pela via expressa |

## Segurança e dinheiro (obrigatórios quando o assunto aparece)
| Agente | Para quê | Modelo | Quando chamar |
|---|---|---|---|
| `seguranca` | Ataca o código como trapaceiro, com script | Opus alto | Toda mudança em dinheiro, login, carteira, banco, mercado ou rota HTTP |
| `auditor-de-dinheiro` **(só com a rede decidida)** | GO ou NÃO-GO pelo checklist de dinheiro | Opus alto | Antes de publicar qualquer coisa de dinheiro; antes de abrir o modo ABERTO para isso |
| `seguranca-do-token` **(só com a rede decidida)** | Carteiras, token, golpes, plano de lançamento e de fechamento | Opus alto | Antes de criar token e carteiras; dúvida de segurança fora do código |
| `engenheiro-de-carteira` **(só com a rede decidida)** | Código de carteira e rede a partir de `referencia/carteira/` (a criar, se o dono enviar) | Sonnet médio | Compra, login por carteira, chaves de emergência (só com o "sim" do dono) |
| `vigia` **(só com dinheiro real)** | Relatório diário de dinheiro (`tools/vigia-carteiras.mjs`, a criar, + painel) | Sonnet baixo | Uma vez por dia depois do dinheiro real; quando o dono perguntar "como está o dinheiro?" |

## Ideias e qualidade (para coisa NOVA que o jogador vê)
| Agente | Para quê | Modelo | Quando chamar |
|---|---|---|---|
| `designer-de-jogo` | Ideias de mecânica | Opus médio | Quando o dono pedir ideias |
| `guardiao` | Nota de regras com vetos (`docs/regua-do-guardiao.md`) | Opus médio | Regra, prêmio, preço, sorteio ou tela nova — junto com o conselheiro, uma rodada por pacote (máx. 2) |
| `conselheiro-de-diversao` | Nota de diversão (`docs/kit-diversao.md`) | Sonnet médio | Junto com o guardião, no desenho, antes do código |
| `qa-jogador` | Tabela de pagamento × parte do jogo e conforto do jogador | Sonnet médio | Antes de chamar uma parte de "verde" e antes do site de teste |
| `arquiteto` | Plano de mudança grande e estrutura do código | Opus alto | Antes de funcionalidade nova grande |

## Operação, textos e apoio
| Agente | Para quê | Modelo | Quando chamar |
|---|---|---|---|
| `operacoes` | Hospedagem, domínio, DNS, logs (a decidir pelo dono) | Sonnet baixo | Publicar no test pela orquestra, depois que o ambiente existir; production só com o "sim" do dono |
| `redator` | Textos, posts, wiki | Sonnet baixo | Quando o dono pedir; nunca publica |
| `pesquisador` | Pesquisa rápida com fontes | Haiku baixo | Dúvida de fora (preço, documentação, gênero, redes de token) |
| `controlador-de-custos` | Licença de asset e gasto de créditos | Sonnet baixo | Antes de usar arte, som ou fonte de fora; antes de gastar créditos |
| `gerente-de-projeto` | STATUS.md e PASSAGEM.md | Haiku baixo | Fim de entrega; conversa perto de ~120 mensagens |

## Regras de chamada
- **Liberdade com aviso:** agente pode trocar o passo a passo por um caminho melhor ou mais rápido, desde que avise ANTES com `CAMINHO NOVO: o quê · por quê · ganho · risco`. Caminho que deu certo vira regra pela skill `evolucao`. Limites duros nunca: dinheiro, production, apagar, economia, travas, enfraquecer teste, segredos.
- Agente que falhou 2 vezes: mais 1 vez com Opus; falhou de novo = pare e avise o dono.
- Tarefa pequena (1-3 arquivos, sem dinheiro, banco ou economia): a sessão principal faz na hora, sem agente.
- Dê ao agente só o necessário: arquivos exatos, critério de pronto, a lição da área (`docs/licoes/`, a criar).
- Agente novo só com trabalho concreto; a linha entra nesta tabela (o `CLAUDE.md` aponta para cá).

## Regras de todo agente
- Arquivos comuns (`docs/`, `.claude/`, `CLAUDE.md`, `PASSAGEM.md`, `STATUS.md`, `package.json`): só o diretor escreve. O agente manda a linha pronta para o diretor.
- Número de economia (arquivo de configuração): nenhum agente muda sem ordem; para e avisa o diretor (o dono decide).
- Agente nunca fala com o dono, nunca faz deploy, merge para `main` ou ação de dinheiro real; avisa o diretor quando termina ou trava, com prova (testes, fotos).
- Teste novo de agente: no fim do arquivo de testes, num bloco com o nome da tarefa (o diretor resolve o encaixe na junção).
- Toda proposta ao dono (do diretor ou de agente) segue a skill `checklist`: opções com nota, melhor primeiro, linha "Conselheiros:", bloco do "sim". A trava `tools/trava-proposta.mjs` confere.
- Skills primordiais para todos: `checklist`, `conselheiros`, `trindade`, `evolucao`, `velocidade`. Agente que desenha, constrói ou revisa algo que o jogador vê dá a nota da trindade (`Trindade: D · Cg · Ch`).
- Esforço sob medida: raciocínio forte (Opus alto) só onde erro custa caro — economia, segurança, auditor, arquiteto, desenho; execução (testes, recorte de arte, textos, operações) em esforço baixo/médio.

## Velocidade
Todo cargo usa a skill primordial `velocidade` e lê `docs/mapa-do-codigo.md` (skill `mapa-do-codigo`, a criar) antes de procurar no código. Cada `oficio-*` tem a seção "Atalhos"; cada agente acrescenta 1 atalho quando aprende um novo.
