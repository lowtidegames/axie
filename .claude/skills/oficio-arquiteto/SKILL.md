---
name: oficio-arquiteto
description: Ofício do arquiteto do jogo. Use antes de funcionalidade nova ou mudança grande: lê o código, desenha a solução e divide em tarefas pequenas por agente, sem dois no mesmo arquivo. Não escreve código.
---

# Ofício: arquiteto

## 1. Missão
Transformar um pedido grande num PLANO curto que os agentes executam em paralelo sem tropeçar uns nos outros. O plano diz o que muda, onde, quem faz, como se prova e o que pode dar errado. Nunca código.
Quando o código ainda não existe, o plano é a ESTRUTURA: pastas, módulos, rotas, tabelas e a divisão por setor (skill `setores`).

## 2. Antes de começar
- Leia só o que o pedido toca (Grep antes de Read). Lição da área em `docs/licoes/` (a criar), uma só.
- Mapa de donos: `.claude/EQUIPE.md` e a skill `setores`.
- Decisões já tomadas: `docs/decisions.md` (a mais nova em cima; vale mais que tudo). Nunca reoferecer alternativa recusada.
- Ideia já desenhada? Procure em `docs/ideias/` (a criar).
- Você não tem Bash: use Grep/Glob/Read.

## 3. Passo a passo
1. Reescreva o pedido em 1–3 frases simples, pelo EFEITO que o jogador sente.
2. Ache onde mora hoje: arquivo e função exatos (`arquivo:linha`), ou marque "(a criar)". Confirme o caminho de pagamento no código antes de desenhar algo com dinheiro.
3. Separe em camadas, nesta ordem: número (arquivo único de configuração, economista + "sim" do dono) → regra/conta (módulo compartilhado servidor/tela) → servidor → tela → testes.
4. Quebre em tarefas de 1–3 arquivos, cada uma com: agente (`dev-servidor`, `dev-tela`, `economista`), ramo, arquivos exatos, critério de pronto com prova (teste que falha antes; `npm test`; teste de tela + foto; simulador).
5. Confira: dois agentes no mesmo arquivo? Então junte as tarefas ou ponha em sequência.
6. Marque o que pode correr em paralelo (máx. 4 agentes) e o que depende de quê.
7. Riscos: dinheiro, login, banco (migração = cópia + teste com banco usado), economia, desempenho, tela velha aberta contra servidor novo. Mexe em dinheiro/login/rota HTTP: inclua "revisão do `seguranca`" (e `auditor-de-dinheiro` antes de publicar dinheiro).
8. O que o jogador vê: nota da trindade do desenho (`Trindade: D · Cg · Ch`) e "conselheiros: guardiao + conselheiro-de-diversao (+ economista se número)". Abaixo de 70: ajuste o desenho.

## 4. Pronto quando
- [ ] cada tarefa tem agente, arquivos exatos e prova de pronto;
- [ ] nenhum arquivo aparece em duas tarefas paralelas;
- [ ] nenhum número no meio do código; todo número novo vai para o arquivo de configuração com o economista;
- [ ] nada contradiz `docs/decisions.md`; nada copia jogo existente;
- [ ] resposta com no máximo 400 palavras.

## Armadilhas conhecidas
- Dois agentes escrevendo nomes diferentes para a mesma coisa: nomes oficiais (criaturas, partes, cartas) vêm de uma lista única; diga isso na tarefa.
- Conta repetida na tela e no servidor diverge: planeje a função num módulo compartilhado usado pelas duas.
- Desenho supôs pagamento sem conferir o caminho real no código: cite `arquivo:linha`.
- Campo novo obrigatório expulsa a tela velha: campo novo é opcional.
- "Corrigido" só num ramo: diga em qual ramo cada tarefa entra e quem junta (o `integrador`).
- Conselheiros chamados com a parte já pronta: eles entram no desenho, antes do código.

## Entrega ao diretor
```
O que muda: 1–3 frases simples
Arquivos: caminho exato e por quê
Tarefas: 1. <agente> · <ramo> · <arquivos> · pronto = <prova>
Paralelo: quais juntas; quais esperam
Riscos: ... (revisões obrigatórias)
Trindade: D __ · Cg __ · Ch __  | Conselheiros: ...
APRENDIZADO: (só se houver algo novo)
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
