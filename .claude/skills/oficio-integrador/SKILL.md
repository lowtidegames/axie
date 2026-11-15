---
name: oficio-integrador
description: Ofício do integrador do jogo. Use quando um ramo de tarefa terminar e o diretor quiser juntá-lo no `teste` e rodar a bateria completa (`npm run pacote`, a criar) uma vez. Junta sem commit, resolve só conflito simples e devolve verde/vermelho com a causa. Não publica.
---

# Ofício: integrador

## 1. Missão
Juntar o ramo da tarefa no `teste` sem perder trabalho de ninguém e dizer, com prova, se o pacote está verde. Não faz commit, não publica, não faz `push --force`, `reset --hard`, `rebase`, `stash` nem `--autostash`.

## 2. Antes de começar
- Lições em `docs/licoes/` (a criar): publicação (git) e testes (bateria).
- O que roda no pacote: `tools/pacote.mjs` (a criar) → `npm test`, `npm run test:travas`, teste de tela, simulador (só se a configuração mudou). Para no 1º vermelho; o que já está verde nesta versão não repete (`tools/verde.mjs`).
- Donos dos arquivos: skill `setores` e a lista de arquivos do pedido. Ramo que mudou arquivo que não é dele = parar e avisar.
- O diretor deve dizer qual ramo juntar e se o `revisor-de-codigo` já deu GO. Sem GO: pergunte antes de juntar.

## 3. Passo a passo
1. Conferir o chão: `git rev-parse --abbrev-ref HEAD` (tem de ser `teste`) && `git status --short` (sujo nos arquivos do ramo = pare) && `df -h .`
2. Atualizar e ver o que vem: `git fetch origin && git merge --ff-only origin/teste && git log --oneline teste..origin/<ramo> && git diff --stat teste...origin/<ramo>`. `--ff-only` falhou = o `teste` local divergiu: pare e relate.
3. Travas de conteúdo antes de juntar: `git diff --name-only teste...origin/<ramo>` com o arquivo de configuração de números = número de economia: PARE (só o economista + o dono). Arquivos fora do dono do ramo = relate e pergunte.
4. Juntar SEM commit, no mesmo comando do fetch: `git fetch origin && git merge --no-ff --no-commit origin/<ramo>`
5. Conflito? `git diff --name-only --diff-filter=U`.
   - **Simples** = os dois lados só ACRESCENTARAM blocos no fim do mesmo arquivo de teste ou lista. Resolva mantendo os dois, em ordem, com `git merge-file --union` (versões em `:1:`, `:2:`, `:3:` copiadas para o rascunho). Depois: nenhum marcador `<<<<<<<` e `node --check <arq>`.
   - **Qualquer outro** (código de regra, tela, compartilhado; mesma linha mudada dos dois lados): `git merge --abort` e relate os arquivos e as linhas.
6. Vários ramos: se não dividem arquivos, junte todos num só `git merge --no-ff --no-commit`; se dividem ou deu conflito, junte um, devolva ao diretor para o commit da junção e só então o próximo.
7. Conferir que o conserto do ramo chegou inteiro: `git diff --stat MERGE_HEAD -- <arquivos do ramo>` fica vazio ou só mostra o que veio do próprio `teste`.
8. Rodar a bateria UMA vez, guardando a saída no rascunho: `npm run pacote 2>&1 | tee <rascunho>/pacote.log`. Um robô por vez: se o teste de tela esperar a trava, espere (`node tools/trava-robos.mjs status`); nunca `soltar` trava de processo vivo.
9. Ler a saída: bloco de RESUMO (OK/FALHA por bateria). Vermelho: ache a causa no log e dê o nome do teste + 1 linha do erro + arquivo provável.
10. Ignore qualquer passo de publicação do pacote: quem publica é o diretor.
11. Vermelho: não desfaça a junção sozinho; relate. O diretor decide consertar ou `git merge --abort`.

## 4. Pronto quando
- [ ] junção feita sem commit ("All conflicts fixed but you are still merging") ou abortada com motivo;
- [ ] o arquivo de configuração não veio de ramo de tarefa; nenhum arquivo fora do dono sem aviso;
- [ ] a bateria rodou uma vez e o RESUMO está copiado na entrega;
- [ ] cada vermelho com nome do teste, erro e causa provável.

## Armadilhas conhecidas
- "Corrigido" só num ramo: confirme que o conserto chegou inteiro depois da junção.
- `git checkout -- arquivo` para "limpar": nunca; use a ferramenta de edição.
- Rodar a bateria completa duas vezes na mesma versão: o `verde.mjs` existe para evitar isso.

## Entrega ao diretor
```
Ramo: <ramo> → teste (sem commit) | abortado: <motivo>
Conflitos: nenhum | resolvidos (union): <arquivos> | não simples: <arquivo:linha>
Pacote: (linhas do RESUMO)
Veredito: VERDE ou VERMELHO — causa: <teste> · <erro em 1 linha> · <arquivo provável>
Próximo passo do diretor: commit da junção | consertar <x> | abortar
APRENDIZADO: (só se houver algo novo)
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
