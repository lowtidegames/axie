---
name: checklist
description: PRIMORDIAL — use SEMPRE antes de propor qualquer coisa ao dono do jogo ou de pedir o "sim" dele (ideia nova, mudança, número, compra, ordem de trabalho, escolha entre caminhos). Monta o checklist de opções com nota, passa pelos conselheiros e entrega a melhor primeiro. A trava `tools/trava-proposta.mjs` barra a resposta que pede o "sim" sem isso.
---

# Checklist de opções (método primordial do jogo)

Toda proposta passa por este checklist, sem exceção. Ele costuma ser esquecido e por isso virou trava. Vale para o diretor e para qualquer agente que proponha algo ao dono.

## Quando usar
Sempre que a resposta for pedir o "sim" do dono ou recomendar um caminho: ideia nova, tela, regra, número de economia, compra, ordem dos trabalhos, como consertar algo com mais de um jeito. Pergunta simples de fato ("que horas são", "subiu?") não precisa.

## Passo a passo
0. **Ideia do dono?** Primeiro o veredito da skill `contraponto` na 1ª linha (CONCORDO / CONCORDO COM AJUSTE / DISCORDO, com prova); a ideia dele entra na tabela como uma opção com nota honesta, mesmo se não for a melhor.
1. **Entenda o pedido** com as palavras do dono. Se faltar algo que muda o resultado (número de economia, dinheiro, rede do token, apagar, regra da casa), pergunte em vez de supor.
2. **Liste TODAS as opções reais** — no mínimo 2, de preferência 3 a 5. Inclua sempre "fazer do jeito mais simples" e "não fazer / esperar" quando fizer sentido. Não esconda a opção que você não gosta.
3. **Passe cada opção pelas lentes**:
   - Jogador: diversão, clareza, nenhum veto do guardião (contagem falsa, punição por não voltar, compra escondida, chance omitida, empurrão para apostar, cópia de jogo existente). Só se anuncia o que já está no ar.
   - Dinheiro: economia (regra 7, simulador), tesouraria, segurança (`seguranca`/`auditor-de-dinheiro` quando toca dinheiro, login, banco, rota HTTP).
   - Código: arquivos em conflito entre agentes, testes, banco/migração, tempo da bateria.
   - Custo: créditos do Claude (limite semanal), dinheiro do dono, tempo dele.
   - Regras da casa e decisões já tomadas (`docs/decisions.md`): decisão aprovada é final; NUNCA reoferecer alternativa recusada.
4. **Dê nota de 0 a 10** para cada opção e ordene da melhor para a pior.
5. **Conselheiros**: para o que o jogador vê (regra, prêmio, preço, sorteio, batalha, cruzamento, mercado, tela nova) chame `guardiao` + `conselheiro-de-diversao` (uma rodada por pacote); se mexe em número, `economista`. Escreva a linha **`Conselheiros: ...`** com as notas, ou **`Conselheiros: não precisa — <motivo>`** (ex.: conserto, estrutura, processo interno).
6. **Escreva a resposta neste formato** (português simples, poucas palavras):
   - Tabela com a coluna **Nota** (melhor primeiro): `| # | Opção | Ganha | Perde | Nota |`.
   - A recomendação em 1 linha ("Recomendo a 1 porque …").
   - `Conselheiros: ...`
   - Para aprovação: **Direção:** (1 linha) e **O que muda se você aprovar:** (1 linha), com o gasto se houver.
   - O texto que o dono copia **sozinho num bloco de código**, começando com "sim" (ex.: ```` ```\nsim, opção 1\n``` ````).
7. **Depois do "sim"**: registre a decisão no topo do `docs/decisions.md` no mesmo dia (no mesmo commit da mudança quando houver) e anote em `docs/fila.md`. Opção recusada vai junto no registro, para nunca ser reoferecida.

## Exemplo mínimo
| # | Opção | Ganha | Perde | Nota |
|---|---|---|---|---|
| 1 | Fazer X agora com um agente | rápido, sem conflito | gasta créditos | 9 |
| 2 | Esperar o lote atual | barato | atrasa 2 h | 5 |

Recomendo a 1: não mexe nos arquivos do outro agente.
Conselheiros: não precisa — é ordem de trabalho, o jogador não vê.
**Direção:** X entra hoje. **O que muda se você aprovar:** abro 1 agente (créditos de Claude).
```
sim, opção 1
```
