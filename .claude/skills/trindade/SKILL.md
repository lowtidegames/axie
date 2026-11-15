---
name: trindade
description: PRIMORDIAL — a trindade do jogo (Dopamina, Congruência, Coerência). Use SEMPRE ao desenhar, propor, construir ou revisar qualquer coisa que o jogador vê ou sente (tela, prêmio, sorteio, revelação, batalha, número, texto, arte, som, regra). Cada ideia ganha nota de 0 a 100 nas três; abaixo de 70 em qualquer uma, ajuste antes de seguir.
---

# A trindade do jogo: Dopamina · Congruência · Coerência

Toda coisa que o jogador vê ou sente passa por ela, junto com a skill `checklist` (opções com nota) e a skill `conselheiros` (guardião, diversão, economista). Não substitui a régua do guardião (`docs/regua-do-guardiao.md`) nem o kit de diversão (`docs/kit-diversao.md`): é a lente curta que todos usam o tempo todo.

## As três
| | A pergunta | Sinais de que está certo | Sinais de que está errado |
|---|---|---|---|
| **Dopamina** (vontade de ver de novo) | Dá aquele "uau", a expectativa e a vontade de voltar amanhã? | expectativa até o último instante (a carta ou o golpe decisivo pode vir no fim); revelação com ritmo (pequeno/médio/grande); som e brilho no prêmio; "bônus" só quando saiu de verdade; meta curta à vista; motivo para voltar sem punição | entrega o resultado antes; tudo igual, sem pico; espera longa sem nada acontecendo; prêmio que some sem festa; "quase ganhou" falso |
| **Congruência** (tudo combina) | Combina com o mundo, a arte, os nomes e o tom do jogo (a definir pelo dono) e é 100% original? | arte na mesma escala e estilo; partes de criatura que encaixam em todas as combinações; só a raridade tem cor de destaque; nomes só da lista oficial do jogo; texto simples em português; nada que lembre outro jogo ou marca | cor de classe parecida com raridade; peça de outro estilo; nome inventado fora da lista oficial; tela, criatura ou carta que copia ou lembra jogo existente |
| **Coerência** (tudo bate e é honesto) | As regras são as mesmas em todo lugar, a tela mostra o que o servidor paga e nada contradiz uma decisão já tomada? | número da tela = número do servidor (mesma função compartilhada); chance de todo sorteio e do cruzamento na tela; a mesma regra em todas as telas; barra que mede o que diz medir; economia que fecha no simulador; decisões do `docs/decisions.md` respeitadas | contagem falsa; barra que mente; regra diferente em cada tela; promessa de lucro; mudança que desfaz decisão aprovada sem prova nova |

## Como usar
1. Ao desenhar ou propor: dê **nota de 0 a 100** em Dopamina, Congruência e Coerência para cada opção, em uma linha: `Trindade: D 80 · Cg 90 · Ch 100`.
2. **Qualquer nota abaixo de 70**: diga o porquê e o ajuste que sobe a nota antes de seguir. Coerência abaixo de 70 em algo de dinheiro, sorteio ou número = não segue (vira veto, como na régua do guardião).
3. Ao construir: confira os sinais da tabela na tela de verdade (foto no celular e no PC, "Menos animação" incluída).
4. Ao revisar (QA, conselheiro): aponte qual das três caiu e onde (arquivo/tela), com foto.
5. Na proposta ao dono (skill `checklist`), a trindade entra junto das notas: a nota da opção já considera as três.

## Exemplos de como a nota cai
- Criatura "comum" com cor de destaque parecendo rara → Congruência e Coerência baixas → regra "só a raridade tem cor".
- Resultado do cruzamento mostrado antes da revelação → Dopamina baixa → revelação em etapas, com o destaque no fim.
- Preço lido errado por fonte pequena → Coerência baixa → fonte própria e grande nos números.
- Barra de progresso que não mede o que o servidor conta → Coerência baixa (contagem falsa) → a tela usa o valor do servidor.
