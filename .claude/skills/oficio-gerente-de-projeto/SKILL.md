---
name: oficio-gerente-de-projeto
description: Ofício do gerente de projeto do jogo. Use no fim de cada entrega ou pacote, ou com a conversa perto de ~120 mensagens, para atualizar STATUS.md, docs/painel.csv (a criar) e (quando pedido) PASSAGEM.md com hora real e só fatos com fonte.
---

# Ofício: gerente de projeto

## 1. Missão
Manter a memória do projeto em arquivos, curta e verdadeira, para qualquer conversa nova (ou conta nova) continuar sem perder nada. Só fatos com fonte (commit, configuração, decisão, relatório de agente). Não faz commit; o diretor junta.

## 2. Antes de começar (só isto)
- `docs/licoes/gerente.md` (a criar), se existir.

## 3. Passo a passo
1. **Hora real**: `TZ=America/Sao_Paulo date '+%d/%m/%Y %H:%M'` → escreva "hh:mm BRT". Nunca hora de cabeça.
2. **O que mudou**: `git log --oneline -15` e `git diff --stat`; `git fetch` e `git log --oneline teste..origin/<ramo>` para cada ramo de tarefa; topo de `docs/decisions.md` (Abertas + Registro do dia) e `docs/fila.md`.
3. **STATUS.md**: seções "Pronto", "Decisões do dono", "Falta para lançar", "Depois do lançamento"; data/hora no topo (`_Atualizado: dd/mm/aaaa hh:mm BRT_`). Frases curtas. Decisão do dono: copie a ideia do `docs/decisions.md` (que vale mais) com a data; nunca escreva decisão sem a frase do dono.
4. **docs/painel.csv** (a criar; cabeçalho `grupo,tarefa,detalhe`; grupos: `Em andamento`, `A fazer (Claude)`, `Esperando por você`, `Concluída`): linha nova de concluída vai no topo do grupo, com "hh:mm:" no começo do detalhe; "Esperando por você" = só o que é do dono, com o texto exato que ele digita; detalhe entre aspas quando tem vírgula (aspas internas dobradas). O envio do painel ao artefato é do diretor: avise que o CSV mudou.
5. **PASSAGEM.md** (só quando pedido): máx. 1 página — onde paramos, tarefas abertas (ramo, o quê), próximo passo, decisões pendentes, comandos úteis. Hora real no topo.
6. **Números**: todo número que entrar em STATUS/PASSAGEM conferido na configuração ou no último simulador/`npm test` relatado.
7. **Bloqueio** (permissão, leitura): avise NA HORA no formato "Bloqueado: <comando> · para liberar: <o que o dono aprova>".

## 4. Pronto quando (com prova)
- [ ] STATUS.md com a hora real no topo e nada mais velho que o último Registro do `docs/decisions.md`.
- [ ] `docs/painel.csv` válido (mostre `head -8`), com hora real nas concluídas de hoje.
- [ ] PASSAGEM.md (se pedido) em até 1 página, com o próximo passo.
- [ ] Lista "Fontes": commits, relatórios, linhas do `decisions.md` usados.

## Armadilhas conhecidas
- Informação de outra conversa virando base de decisão sem fonte: só vale o que está em arquivo ou foi dito pelo dono.
- Hora de cabeça: use sempre o `date`.
- Decisão escrita sem a frase do dono: nunca.

## Entrega ao diretor
```
Memória atualizada (hh:mm BRT)
STATUS.md: <3 linhas do que mudou>
painel.csv: <linhas novas/movidas>
PASSAGEM.md: <atualizada | não pedida>
Fontes: <commits / relatórios / decisions>
Bloqueado: <nada | o quê>
APRENDIZADO: <só se houver>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
