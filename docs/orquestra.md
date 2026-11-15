# Orquestra do jogo

O diretor (a conversa principal, skill `diretor`) recebe as ordens do dono, divide em tarefas, manda cada uma a um agente de `.claude/agents/`, confere, junta no ramo `teste` e publica no ambiente de teste. Só vale no **site de teste**; production continua só com o "sim" do dono.

> **Estado atual:** nada está publicado. O ambiente de teste (hospedagem, serviço, banco) ainda será criado pelo dono. Até lá, tudo roda local; as vias abaixo valem a partir do momento em que o ambiente existir.

## 1. Três vias de publicação no test
**Publica primeiro, confere depois.** Em toda via, o que segura a publicação é só `npm test` + travas verdes (+ `seguranca`/`auditor-de-dinheiro` com GO no cofre). A bateria completa (`npm run pacote`, a criar) roda DEPOIS, sobre a versão no ar; vermelho → volta automática (seção 2).
| Via | O que entra | Antes de ir ao ar |
|---|---|---|
| **Expressa** | Pequeno: texto, cor, posição, ajuste de tela, bug de 1–3 arquivos; SEM dinheiro, carteira, login, banco/migração, rota HTTP nova ou número de configuração | `npm test` verde (trava-verde) + teste só das telas tocadas (`tools/testes-do-arquivo.mjs`, a criar) + foto rápida |
| **Trem** | Médio: tela nova, regra de jogo, junção de ramos | bateria completa + conselheiros (o que o jogador vê) |
| **Cofre** | Dinheiro, carteira, login, banco, rota HTTP, economia | bateria completa + `seguranca` (+ `auditor-de-dinheiro` se dinheiro) com GO; economia com o "sim" do dono |
Na dúvida entre duas vias, vai pela mais segura.

## 2. Rede de segurança (sempre ligada)
- Depois de cada publicação expressa, a bateria completa roda sobre aquela versão. Verde → a versão vira "sha verde". Vermelho → **volta automática**: publicar de novo o último sha verde, avisar o diretor, e o conserto vira prioridade (teste que falha antes).
- Guardar o último sha verde em `estudio/ultimo-verde.txt` (a criar na primeira publicação verde; só o diretor escreve).
- A trava de um teste de tela por vez continua (`trava-robos`); push sem `npm test` verde continua barrado (`trava-verde`).

## 3. Agentes e ramos
- Até 4 agentes em segundo plano ao mesmo tempo, cada um no seu worktree e com a lista de arquivos que pode mexer (nunca dois no mesmo arquivo). Ramo do agente: `teste-<tarefa>`; agente faz commit no ramo dele, sem push; o diretor junta no `teste`.
- Os setores (quem é dono de que arquivos) estão na skill `setores` e serão preenchidos pelo `arquiteto` quando houver código.
- O arquiteto escreve antes, em `docs/ideias/<nome>.md` (a criar), **o contrato** (quem toca qual arquivo e qual função/rota liga as partes) para nenhuma junção brigar.
- Arquivos comuns (`docs/`, `.claude/`, `CLAUDE.md`, `PASSAGEM.md`, `package.json`) só o diretor.

## 4. Contratados
- `cacador-de-bugs`: joga o site de teste depois de cada publicação, lê os erros do diário do servidor, reproduz e devolve o bug com passo a passo + teste que falha.
- `polidor`: primeiros 10 minutos do jogador, sensação e clareza, com foto e nota da trindade.

## 5. Ritmo
- Diretor: lê o resultado de cada agente assim que termina e despacha o próximo na mesma resposta.
- Fim de cada lote: retrospectiva curta (skill `evolucao`) só depois de publicar.
