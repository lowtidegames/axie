---
name: conselheiros
description: PRIMORDIAL — quando e como chamar os conselheiros do jogo (guardiao, conselheiro-de-diversao, economista) e o que fazer com as notas. Use SEMPRE que entrar regra, prêmio, preço, sorteio, batalha, cruzamento, mercado, tela nova ou número de economia, e sempre que a resposta ao dono precisar da linha "Conselheiros:".
---

# Conselheiros (método primordial do jogo)

Os conselheiros são parte de toda proposta do que o jogador vê. Costumam ser esquecidos e por isso viraram skill e trava (`tools/trava-proposta.mjs` exige a linha "Conselheiros:").

## Quem é quem
| Conselheiro | Quando entra | O que devolve | Base |
|---|---|---|---|
| `guardiao` | regra, prêmio, preço, sorteio, batalha, cruzamento, mercado ou tela NOVA que o jogador vê | nota 0–100 (Diversão, Congruência, Clareza, Risco, Duração) + vetos + até 3 ajustes | `docs/regua-do-guardiao.md` |
| `conselheiro-de-diversao` | junto com o guardião, no desenho, antes do código | nota de diversão 0–100 + até 3 melhorias com custo | `docs/kit-diversao.md` |
| `economista` | qualquer número do arquivo de configuração (preço, chance, recompensa, taxa, custo de cruzamento, metas) | números propostos + simulador (a criar) + conta de sustentabilidade em 3 cenários | `docs/licoes/` (a criar) |

Arte, código, testes e consertos que não mudam o que o jogador vê **não** passam pelo guardião/diversão ("Conselheiros: não precisa — <motivo>").

## Como chamar
1. **Uma rodada por pacote** para cada coisa nova (ideia grande pode ter uma rodada de desenho antes de construir). Guardião e diversão **juntos, em paralelo** (os dois só leem).
2. Mande para eles o desenho escrito (ex.: `docs/ideias/<nome>.md`, a criar), não o código; diga o que **já foi decidido pelo dono** (não se vota de novo) e peça foco nos vetos e no que o jogador precisa ver.
3. O economista recebe as decisões do dono, as metas e as restrições (regra 7 quando valer) e devolve números + simulador + caixa em cenários. Número de economia SEMPRE volta ao dono para o "sim".
4. Guarde as notas no próprio desenho (seção "Conselheiros") e cite na proposta.

## O que fazer com as notas
- **Veto** do guardião (contagem falsa, punição por não voltar, compra escondida, chance omitida, empurrão para apostar, cópia de jogo existente): não segue até resolver; os ajustes obrigatórios entram no trabalho.
- Guardião reprovado (abaixo da linha da régua): volta ao desenho; no máximo 2 rodadas e depois o dono decide.
- Melhorias da diversão: entram se forem baratas e não ferirem a trindade (skill `trindade`); as caras viram opção na tabela do `checklist`.
- Na resposta ao dono, sempre a linha: `Conselheiros: guardião 77 (aprovado, 3 ajustes), diversão 84, economista: simulador APROVADO` — ou `Conselheiros: não precisa — <motivo>`.

## Junto com
- Skill `checklist` (opções com nota, melhor primeiro, bloco do "sim").
- Skill `trindade` (Dopamina · Congruência · Coerência): a lente curta que os conselheiros e todos usam.
