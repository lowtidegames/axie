---
name: mapa-do-codigo
description: Onde fica cada parte do jogo (tela, função, rota, número da config, teste). Use ANTES de procurar qualquer coisa no código, e atualize no MESMO commit quando algo mudar de lugar.
---
# Mapa do código
- O mapa estará em `docs/mapa-do-codigo.md` (a criar quando houver código): 1 linha por parte do jogo (criaturas e partes, cartas, batalha 3 contra 3, cruzamento, mercado, minha conta, painel do dono, carteira, saque, sons...) com arquivo da tela · função/linha principal · rota do servidor · chave na configuração · teste que cobre.
- Leia antes de abrir arquivo; abra só os citados. Se a linha estiver errada ou faltar, conserte o mapa no mesmo commit (exceção à regra "docs/ é do diretor", só para este arquivo).
- Mudou algo de lugar (arquivo, função, rota, chave, teste)? A linha do mapa muda no MESMO commit. O `revisor-de-codigo` confere.
