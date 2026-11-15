---
name: evolucao
description: PRIMORDIAL — como o diretor e os agentes do jogo melhoram a cada pacote. Use no fim de cada pacote (depois de publicar no test, ou de fechar o lote enquanto não há test), quando um agente devolver `APRENDIZADO:`, quando o mesmo erro aparecer 2 vezes, ou quando o dono pedir para a equipe se aprimorar.
---

# Evolução da equipe

A equipe deve ficar melhor sozinha: qualidade, rapidez e eficiência no máximo, sem estresse na produção. Cada cargo tem a sua skill de ofício em `.claude/skills/oficio-<cargo>/SKILL.md` (carregada pelo agente pelo campo `skills:` do arquivo dele). A evolução acontece nesses arquivos, nas lições e nas travas.

## De onde vem o aprendizado
- Linha `CAMINHO NOVO:` (liberdade com aviso): se deu certo e foi mais rápido, vira o novo passo a passo da skill do ofício.
- Linha `APRENDIZADO:` no fim da entrega de cada agente.
- Bateria que falhou, revisão com achado, bug no site de teste, correção do dono.
- O que custou tempo ou créditos à toa (espera, bateria repetida, conflito entre agentes).

## Retrospectiva do pacote (o diretor faz, 5 minutos, depois de fechar o lote)
1. Junte os `APRENDIZADO:` do pacote (agentes e a sua própria conversa).
2. Para cada um, escolha o destino, nesta ordem de força:
   1. **Teste ou trava** (não depende de memória) — se dá para checar com código, vira teste em `tests/` ou trava em `tools/` + `.claude/settings.json`.
   2. **Skill do ofício** — vira 1 linha em `## Aprendizados (evolução)` de `oficio-<cargo>` (com data e origem); se mudou o jeito de trabalhar, ajuste o passo a passo.
   3. **Lição** em `docs/licoes/<area>.md` (formato Errado · Regra · Checa).
   4. Descartar (era caso único).
3. Lição repetida 2 vezes sem checagem = obrigatoriamente vira teste ou trava.
4. Uma linha em `docs/fila.md` ou `STATUS.md` ("Evolução: …").

## Higiene das skills (sem inchar)
- Cada skill de ofício até ~120 linhas. Passou disso: junte itens parecidos, apague os que viraram teste/trava (deixe só "virou teste: <nome>").
- Nunca contradizer o `CLAUDE.md` nem o `docs/decisions.md`; decisão do dono vence a skill.
- Só o diretor edita skills e arquivos de agente. Agente nunca edita a própria skill.

## Contratar, ajustar e dispensar
- **Contratar:** quando um tipo de trabalho aparece em 2 pacotes e nenhum cargo cobre bem. Cria `.claude/agents/<cargo>.md` (modelo mais barato que resolve) + `oficio-<cargo>` + linha no `.claude/EQUIPE.md`.
- **Subir modelo/esforço:** agente falhou 2 vezes no mesmo tipo de tarefa → mais 1 vez com modelo maior; se resolveu, anote no ofício.
- **Descer modelo/esforço:** cargo acertou 5 entregas seguidas sem retrabalho → testar o modelo mais barato na próxima.
- **Dispensar:** cargo sem uso em 2 semanas fica na tabela como "parado" (não apagar sem o dono).

## Sem estresse na produção
- Production (`main`) nunca recebe nada que não passou pelo test e pela bateria; mudança de evolução (skill, agente, trava) não muda o jogo.
- Trava nova entra com teste em `tests/travas.test.mjs` e não bloqueia o que já é permitido sem avisar o dono.
