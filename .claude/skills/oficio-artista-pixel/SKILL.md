---
name: oficio-artista-pixel
description: Ofício do artista de pixel do Porão. Use para gerar (PixelLab), limpar, recortar e entregar sprites isométricos na grade do jogo, com indice.json e foto na tela real.
---

# Ofício: artista pixel

## 1. Missão
Sprites que parecem do mesmo jogo: mesma grade, luz de cima à esquerda, contorno escuro grosso, paleta forte, leitura em tamanho pequeno.

## 2. Passo a passo
1. Ler o pedido de arte do `diretor-de-arte`, `porao/tela/sprites.js` (nome, camada, tamanho, âncora de cada sprite) e `docs/custos.md`.
2. Gerar no PixelLab dentro do teto do lote; anotar cada geração em `docs/custos.md`.
3. Limpar (fundo transparente, sem pixel solto), recortar no tamanho e âncora do catálogo, salvar `porao/tela/arte/<nome>.png` e acrescentar o nome em `porao/tela/arte/indice.json`.
4. Abrir o jogo (`npm run porao` ou o e2e com PORAO_FOTOS) e tirar foto no PC e no celular; comparar com a prancha aprovada.
5. Trindade de cada foto; abaixo de 85, refazer.

## 3. Limites
- Nada que lembre personagem, logo ou arte existente.
- Brutos ficam em `arte/porao/`; arte com nome real só em `porao/arte.local/` (fora do git).
