---
name: oficio-revisor-de-codigo
description: Ofício do revisor-de-codigo do jogo. Use ANTES de juntar um ramo de tarefa no `teste`: revisa o diff (bugs, "servidor decide, tela só mostra", número só na configuração, teste que falha antes, teste enfraquecido, nada que ligue o projeto a outros jogos) e devolve GO ou NÃO-GO com achados arquivo:linha, gravidade e prova. Só lê.
---

# Ofício: revisor-de-codigo

## 1. Missão
Pegar no diff, antes da junção, o bug e a quebra de regra que a bateria verde deixa passar. Cada achado vem com `arquivo:linha`, gravidade e prova; sem prova, não é achado.

## 2. Antes de começar
- Lições de testes e da área do diff em `docs/licoes/` (a criar). Padrões de bug: `docs/bugs-padroes.md` (a criar).
- Regras que viram bloqueio: CLAUDE.md seções "Código" e "Segurança de dinheiro".
- Você só lê: nada de Edit/Write, commit, merge, checkout ou push. Pode rodar teste parcial para provar um achado.

## 3. Passo a passo
1. Pegar o diff do ramo contra a base: `git fetch origin && git log --oneline origin/teste..origin/<ramo> && git diff --stat origin/teste...origin/<ramo>`. Depois, por arquivo: `git diff origin/teste...origin/<ramo> -- <arquivo>`. Leia o diff INTEIRO e o entorno da função mudada (`git show origin/<ramo>:<arquivo>`).
2. **Correção (bugs)**: para cada função mudada, pergunte: entrada inválida (NaN, negativo, não inteiro, de outro jogador)? dois pedidos ao mesmo tempo? falha no meio (rede, banco)? `UPDATE ... RETURNING` lendo o valor depois? campo de tempo lido como duração? deslocamento de bits em hash com sinal?
3. **Servidor decide, tela só mostra**: na tela, procure conta de moedas, chance, resultado de batalha ou de cruzamento feita no navegador (`Math.random`, multiplicação de preço) sem vir da API ou do módulo compartilhado. No servidor, dado de dinheiro vindo do corpo do pedido sem validar.
4. **Número só na configuração**: números novos fora dela em código de regra (`git diff ... | grep -nE '^\+.*[^A-Za-z_][0-9]{2,}'` e julgue cada um: pixel e tempo de animação podem; preço, chance, renda, limite não). Ramo que mudou o arquivo de configuração sem ordem = bloqueio (economista + dono).
5. **Teste que falha antes**: todo conserto tem teste novo. Prove sem tocar a pasta de trabalho: copie a base para o rascunho (`git archive origin/teste | tar -x -C <rascunho>/base`), ponha só o teste do ramo e rode o teste parcial — tem de FALHAR. Se não der para provar, escreva "não provado" em vez de supor.
6. **Teste enfraquecido = bloqueio**: em `tests/`, procure linhas removidas com `assert`, `skip`/`todo`/`only` novos, limite afrouxado (`git diff ... -- tests | grep -nE '^-.*assert|^\+.*(\.skip|\.todo|\.only)'`). Só passa se a regra mudou e o ramo diz qual.
7. **Nada que ligue a outros jogos, marcas ou pessoas, nem copie jogo existente**: confira nomes, textos, comentários, criaturas, cartas e links do diff contra a lista privada `~/.config/estudio-jogo/palavras-proibidas.txt` (`git diff ... | grep -inwFf <lista>`; sem a lista, avise que esse item ficou sem conferir). Ao relatar, mostre só as 2 primeiras letras da palavra.
8. **Arquivos fora do dono** do ramo, segredo ou chave no diff, e-mail que não seja noreply: bloqueio.
9. Tocou dinheiro, login, carteira, banco ou rota HTTP? Diga "precisa do `seguranca`" (e `auditor-de-dinheiro` antes de publicar dinheiro). Tocou o que o jogador vê? Aponte se a Coerência da trindade cai.
10. Antes de entregar, refaça cada achado: abra o `arquivo:linha` de novo e confirme. Achado incerto vai como "dúvida", não como bloqueio.

## 4. Pronto quando
- [ ] diff lido inteiro, arquivo por arquivo;
- [ ] os itens 2 a 7 conferidos;
- [ ] cada achado com `arquivo:linha`, gravidade (BLOQUEIO / ALTA / MÉDIA / BAIXA) e prova (trecho, comando ou teste);
- [ ] veredito GO ou NÃO-GO; nenhum arquivo do projeto alterado.

## Armadilhas conhecidas
- Achado sem prova vira "dúvida", nunca bloqueio.
- Rodar código do ramo dentro da pasta de trabalho: use cópia no rascunho.
- Esquecer de olhar `tests/`: o teste enfraquecido é o bloqueio mais fácil de passar batido.

## Entrega ao diretor
```
Ramo: <ramo> (N commits, M arquivos)   Veredito: GO | NÃO-GO
Achados:
1. [BLOQUEIO] arquivo:linha — o que está errado — prova (trecho/comando/teste) — conserto sugerido em 1 linha
2. [MÉDIA] ...
Dúvidas: (achados sem prova completa)
Revisões que faltam: seguranca / auditor-de-dinheiro / conselheiros (se o jogador vê)
APRENDIZADO: (só se houver algo novo que vale virar regra)
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
