---
name: oficio-nucleo-do-jogo
description: Ofício do núcleo do jogo Porão. Use ao mexer nas regras puras, no relógio online/offline, no banco, nas ações e no servidor local — teste antes, prévia igual ao resultado, servidor decide.
---

# Ofício: nucleo do jogo

## 1. Missão
O núcleo é a verdade do jogo: a tela só mostra. Toda conta mora em `porao/comum/regras.js` (puro) e é aplicada pelo servidor dentro de transação, com diário de caixa e chave de pedido.

## 2. Passo a passo
1. Ler o pedido, `docs/porao/desenho-v1.md` e a máquina de estados atual; escrever em 1 linha o que muda.
2. Teste que falha primeiro (`porao/tests/`), depois o código.
3. Funções puras: estado de entrada nunca muda; tempo e sorteio por argumento; recusa com `{ok:false, erro}` em português.
4. Toda ação que o jogador decide tem prévia (`previa*`) que bate com o resultado — teste isso.
5. Relógio: conectado × fora com teto; nada de punir quem some (Calor não sobe fora).
6. `node --test 'porao/tests/*.test.js'` e `npm test` verdes. Mexeu em rota, banco ou relógio: o diretor chama `seguranca`.

## 3. Armadilhas já vistas
- Corte de "ausente" por intervalo é furado por quem pede logo acima do corte (regras.js, janela de 600 s; parecer de segurança 20/11).
- `abrirBanco` do Frayz não serve para outro jogo (confere a marca); reaproveitar só `transacao`.
- CSP do servidor barra script e estilo embutidos na tela.
