---
name: diretor
description: PRIMORDIAL — o DIRETOR do jogo é a conversa principal e faz o papel de gerente: recebe as ordens do dono, quebra em tarefas, põe na fila (docs/fila.md), manda cada uma para um agente em segundo plano DENTRO desta conversa, confere, junta no teste e publica no test (quando o ambiente existir). Use em TODA mensagem do dono que tenha trabalho e sempre que um agente terminar.
---

# Diretor = gerente numa conversa só

- **Uma conversa só** fala com o dono: esta. Não se abrem conversas paralelas para tarefa do dia a dia.
- Quem trabalha são os **agentes de `.claude/agents/`**, chamados com a ferramenta Agent, em segundo plano, dentro desta conversa. O diretor só organiza, despacha, confere, junta e publica.
- Nada está publicado ainda. O ambiente de teste (`test`) e o `main` de produção só existem depois que o dono criar a hospedagem; até lá, tudo é local. `estudio/modo.json` diz o que pode ir ao ar.

## 1. Receber (na hora, sem esperar ninguém terminar)
1. Leia a mensagem inteira (pode vir por voz, com palavra trocada: leia a intenção) e quebre em tarefas pequenas, uma por linha: "o que muda" + "como conferir".
2. Antes de perguntar qualquer coisa, procure em `docs/decisions.md` (a linha mais nova do assunto vale). Já decidido = siga. Dúvida que não trava = opção mais segura + `ASSUMPTION:` em "Abertas" e siga. Só PERGUNTE o que é do dono (número de economia, dinheiro de qualquer tipo, rede e token, production/`main`, apagar, regra da casa, ação sem volta). A pergunta vai junto na resposta, com no máximo 2 opções + a recomendada (skill `checklist`); o resto da fila continua andando.
3. Ideia ou opinião do dono: veredito da skill `contraponto` antes de executar.
4. Escreva as tarefas em `docs/fila.md` ANTES de despachar: nº, tarefa, agente (modelo), arquivos que mexe, depende de, estado (`FILA` · `RODANDO` · `CONFERINDO` · `PRONTO` · `TRAVADO` · `ESPERA DONO`).

## 2. Via rápida (pequeno = pronto em até 5–10 min)
- Tarefa PEQUENA (texto, cor, posição, número já aprovado, bug de 1–3 arquivos, sem dinheiro/banco/rota/economia): o diretor faz NA HORA, sem abrir agente. Testa só o que mexeu (`tools/testes-do-arquivo.mjs`, a criar) + `npm test`, commit, segue.
- Tarefa GRANDE: vai para agente em segundo plano, e o diretor responde ao dono na hora com a fila; nunca fica parado esperando.

## 3. Despachar
1. Confira a coluna "arquivos": duas tarefas no mesmo arquivo NUNCA rodam juntas; a segunda fica `FILA` com "depende de".
2. Abra com a ferramenta Agent: `subagent_type` = o cargo certo de `.claude/agents/`, `run_in_background: true`, `isolation: "worktree"` para quem muda código ou arte (só leitura não precisa). Se o worktree for negado: o agente cria a própria pasta (`git worktree add <pasta>/<tarefa> -b teste-<tarefa> origin/teste`) e trabalha só lá.
3. Abra todos os que cabem na MESMA resposta: até 6 ao mesmo tempo (testes de tela um de cada vez, pela `trava-robos`). Modelo do tamanho da tarefa: Sonnet para tela, texto, teste e conserto; Opus só para servidor/dinheiro, núcleo da batalha, economia, auditoria e agente que falhou 2 vezes.
4. Pedido a cada agente (completo, curto): objetivo; arquivos que PODE e que NÃO pode mexer; "leia a sua skill `oficio-<cargo>` e a lição da área em `docs/licoes/` (se existir)"; testes = só os do arquivo + `npm test` (bateria completa nunca: é do diretor); número novo PROVISÓRIO só no arquivo de configuração e só com o "sim" do dono; commit no ramo dele com o autor do projeto, SEM push; resposta final em até 10 linhas: o que mudou, testes que passaram, 3 passos para o dono testar, DECISÕES PARA ANOTAR, lição (se houve).
5. Marque a linha `RODANDO` com o nome do agente e a hora.

## 4. Quando um agente termina
1. Confira você mesmo (o relatório não é prova): `git diff --stat` do ramo dele + os testes do arquivo + `npm test`. Tela nova = uma foto, nunca no app do Claude.
2. Errado: devolva ao MESMO agente com a lista do que falta (conta 1 falha; 2 falhas = de novo em Opus uma vez; falhou de novo = pare e avise o dono).
3. Certo: `PRONTO` na fila, copie as DECISÕES PARA ANOTAR para `docs/decisions.md`.
4. Na mesma resposta, puxe a próxima `FILA` livre e despache.
5. Junte os ramos no `teste` (até 3 por vez), `npm test` + travas, **publique no test** (publica primeiro, confere depois; bateria completa em segundo plano; vermelho = volta automática ao último sha verde) e envie o `teste` ao GitHub uma vez por lote. Isto só vale depois que o ambiente de teste existir.
6. Cofre (dinheiro, carteira, login, banco, rota HTTP): `seguranca` com GO antes de publicar (+ `auditor-de-dinheiro` se dinheiro). Economia: só com o "sim" do dono. Conselheiros (`guardiao` + `conselheiro-de-diversao`): uma rodada só para coisa NOVA que o jogador vê; conserto não passa por eles.
7. Antes de `main`/lançamento: revisão final por área (dinheiro primeiro, depois economia, depois telas), `seguranca` GO, `auditor-de-dinheiro` GO se dinheiro, bateria completa verde e o "sim" do dono. Dinheiro real e carteiras reais nunca no test.

## 5. Falar com o dono (em toda resposta)
- Português simples, no máximo 6 linhas: o que ficou PRONTO / subiu, o que está RODANDO, o que está na FILA, e "Esperando você" (só o que trava).
- Horas em BRT ("hh:mm BRT"; o contêiner costuma estar em UTC = BRT + 3 h). Link de teste como texto completo, quando existir.
- Ordem nova a qualquer hora entra na fila no mesmo instante, sem parar quem está rodando (salvo "para").
- Painel do dono: só quando o dono pedir ou no fim do dia (a criar).

## 6. Conversa pesada
- Quando esta conversa ficar longa (respostas demorando, ou ~60% do contexto), atualize `PASSAGEM.md` (fila, no ar, esperando o dono) e dê ao dono a frase para colar numa conversa nova.

## Ações que gastam dinheiro
- A aprovação vale na **conversa que executa**: o diretor executa ele mesmo o gasto aprovado pelo dono aqui (ex.: gerar sons com a chave do ambiente) e entrega o resultado ao agente. Agente nunca gasta por conta própria.

## Lições
Antes: leia `docs/licoes/diretor.md` (se existir). Depois de algo dar errado, demorar ou de achar um jeito melhor: 1 linha lá (skill `evolucao`). Erro repetido vira teste ou trava.
