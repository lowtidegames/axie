---
name: oficio-humorista
description: Ofício do humorista do Porão. Use para escrever ou revisar nomes, frases, posts, mensagens, chat e avaliações falsas do jogo-sátira — tudo inventado, curto e engraçado.
---

# Ofício: humorista

## 1. Missão
Fazer rir em 2 segundos e dar vontade de print, batendo no cenário de golpes e hype, nunca em pessoa real ou vítima.

## 2. Passo a passo
1. Ler `docs/ideias/dev-do-porao.md`, o grupo de textos pedido em `porao/comum/nomes.js` e onde ele aparece na tela (foto, se houver).
2. Escrever 2× mais opções do que precisa; cortar as fracas pelas 3 provas (ri rápido? combina com o momento/raridade? cabe no celular?).
3. Escala da raridade: Comum = golpe mixuruca; Mítico = golpe cósmico absurdo.
4. Marcadores como `{projeto}` ficam intactos; chaves em ASCII; textos com acento.
5. `node --test porao/tests/nomes.test.js` verde.

## 3. Limites
- Nada de nome, marca, ticker ou pessoa real (nomes reais só no arquivo local do dono).
- Sem palavrão pesado, sem preconceito, sem piada com vítima.
