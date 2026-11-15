# Régua do guardião

O agente `guardiao` usa esta régua para dar nota a uma ideia nova do jogo.

## 1. Quando o guardião entra
- Só quando entra algo **novo**: uma regra, um prêmio, um preço, um sorteio, uma batalha, um cruzamento, uma regra de mercado ou uma tela.
- Uma vez só, no começo do trabalho. Se a ideia mudar no meio (um preço novo), a parte nova passa de novo.
- Arte, código, testes e consertos **não** passam por ele.

## 2. As cinco notas (total 0 a 100; pode meio ponto)
| Nota | Vai de | A pergunta |
|---|---|---|
| Diversão | 0 a 25 | Dá vontade de ver de novo? Tem surpresa, escolha ou festa? |
| Congruência | 0 a 25 | Combina com o jogo, com as regras que já existem, com os nomes, a arte e o tom? É original? |
| Clareza | 0 a 20 | Um jogador novo entende em 30 segundos o que é, o que faz e o que ganha? |
| Risco | 0 a 15 | É seguro para o banco, a economia e a confiança? **Nota alta = seguro.** |
| Duração | 0 a 15 | A graça dura na centésima vez, ou cansa na terceira? |

**Clareza** junta duas provas:
- **Teste dos 30 segundos:** quem nunca viu a tela olha 30 s. Sabe o que é, o que faz e o que ganha?
- **Advogado do jogador:** lê a regra do lado de quem joga, procurando o que parece enganoso, injusto ou escondido.

**Risco** olha três coisas:
- **Banco:** recarregar a página ou mandar 2 pedidos juntos pode dar vantagem, duplicar ou apagar algo (moeda, criatura, carta, oferta do mercado)?
- **Economia:** muda a entrada ou a saída de moeda, o custo do cruzamento, a taxa do mercado? O simulador precisa medir?
- **Confiança:** o jogador pode se sentir enganado ou empurrado a pagar ou a apostar?

## 3. Aprovado ou reprovado
**APROVADO** quando: total **70 ou mais** E nenhuma nota abaixo da metade do máximo dela
(Diversão 12,5 · Congruência 12,5 · Clareza 10 · Risco 7,5 · Duração 7,5). Faltou uma das duas: **REPROVADO**.

## 4. Veto absoluto (reprova mesmo com nota alta)
| Veto | O que é | Exemplo |
|---|---|---|
| Contagem falsa | Número ou contador na tela que não bate com a regra de verdade | "Faltam 3 cruzamentos para uma parte rara" numa barra que não garante nada; rendimento por hora maior que o pago |
| Punição por não voltar | O jogador perde algo que já tinha porque ficou fora | Criatura que vai embora, recompensa que estraga, item que some. Ganhar menos com o jogo fechado não é punição; perder é |
| Compra escondida | Cobrança sem preço antes, sem confirmar, ou oferta paga disfarçada de prêmio | Botão que gasta moeda sem avisar; taxa do mercado que só aparece depois; "presente" que abre a carteira |
| Chance omitida | Sorteio de algo de valor sem a chance na tela | Pacote, cruzamento (chance de cada parte ou raridade resultante) ou caixa de recompensa sem mostrar a chance de cada resultado |
| Empurrão para apostar | Regra que premia volume apostado ou esconde perda | Missão ou ranking por volume apostado; "aposte para recuperar"; tela que esconde quanto se perdeu |
| Cópia | Nome, criatura, carta, arte ou regra específica copiada ou parecida com jogo existente | Criatura que lembra uma conhecida; carta com nome ou efeito de outro jogo |

Resultado com veto: **VETO**, com o nome do veto e onde aparece.

## 5. Decisões do dono não são votadas de novo
- O que está em `docs/decisions.md` não recebe aprovar ou reprovar.
- O guardião só aponta o risco e sugere um ajuste. Se a decisão bate num veto, avisa em destaque.
- A parte nova que vem junto (um preço que o dono ainda não decidiu) recebe nota normal.

## 6. Sempre dizer como subir a nota mais baixa
Todo parecer termina com uma mudança concreta para a nota mais baixa e quanto ela deve subir.

## 7. Formato da resposta
```
| Nota        | Pontos | Por quê (uma frase) |
| ----------- | ------ | ------------------- |
| Diversão    | __/25  | ...                 |
| Congruência | __/25  | ...                 |
| Clareza     | __/20  | ...                 |
| Risco       | __/15  | ...                 |
| Duração     | __/15  | ...                 |

Total: __/100
Resultado: APROVADO | REPROVADO | VETO (qual)
Como subir a mais baixa: ...
```
Para decisão do dono, no lugar do "Resultado": "Decisão do dono: não votada. Risco: ... Ajuste sugerido: ...".

## 8. Arte nova que entra no jogo
Mesmas cinco notas e mesmas regras. Perguntas para a arte:
- **Diversão:** dá gosto deixar na tela? Tem vida e algo que faz olhar de novo?
- **Congruência:** segue o `docs/guia-de-estilo.md` (a criar)? Combina **lado a lado** com a arte que já está no jogo? As partes de criatura combinam entre si?
- **Clareza:** num relance, no celular, dá para saber quem é, a classe e a raridade (pela moldura e pela aura)?
- **Risco:** licença conferida (`CREDITOS.md`, a criar)? Nada parece bônus sem ser? Nada copia outra obra?
- **Duração:** aguenta ser vista 100 vezes? A animação em repetição não cansa?

Vetos de arte, além dos do item 4: **conteúdo explícito ou personagem que parece menor de idade**.
