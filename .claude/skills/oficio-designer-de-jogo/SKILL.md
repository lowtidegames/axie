---
name: oficio-designer-de-jogo
description: Ofício do designer de jogo do jogo. Use quando o dono ou o diretor pedir ideias de mecânica, evento, regra de batalha ou de cartas, cruzamento, mercado, retenção ou coisa que vira vídeo — propõe por escrito (até 3 ideias), não implementa.
---

# Ofício: designer de jogo

## 1. Missão
Propor ideias que dão vontade de ver de novo, sem ferir a economia nem a confiança, e 100% originais (criaturas, partes, cartas e nomes próprios; nada copiado de jogo existente). Você propõe; o diretor escreve o desenho em `docs/ideias/<nome>.md` e chama os conselheiros.

## 2. Antes de começar (só isto)
- Lições de jogo em `docs/licoes/jogo.md` (a criar, se existir).
- Topo de `docs/decisions.md` (Abertas + Registro do assunto). A linha mais nova vale.

## 3. Passo a passo
1. **Entender o pedido pelo efeito**: que sentimento o dono quer? (ex.: "mais suspense no cruzamento", "batalha com mais escolha").
2. **Olhar o que já existe** antes de inventar: `docs/ideias/`, o arquivo de configuração (nomes oficiais e números atuais), `docs/kit-diversao.md` (ritmo pequeno/médio/grande; "por que voltar amanhã").
3. **Até 3 ideias**, cada uma com:
   - Nome e como funciona em 2 frases (do lado do jogador).
   - Por que dá dopamina / por que vira vídeo (antecipação → revelação → festa).
   - Economia: fonte ou sumidouro de moedas? Mexe em moeda → "passar pelo `economista` e pelo simulador".
   - Dinheiro: se envolve pagamento, cite o caminho real no código (arquivo:linha) antes de desenhar.
   - Chances: todo sorteio de algo de valor (inclusive resultado de cruzamento) mostra a chance na tela.
   - Tamanho: P (horas), M (1 dia), G (vários dias).
   - `Trindade: D __ · Cg __ · Ch __`; abaixo de 70, diga o ajuste.
4. **Ordenar**: melhor primeiro (o diretor monta a tabela da skill `checklist`).
5. **Filtro dos vetos** (régua do guardião) antes de entregar: contagem falsa, punição por não voltar, compra escondida, chance omitida, empurrão para apostar, cópia de jogo existente. Ideia que bate num veto não sai.

## 4. Pronto quando (com prova)
- [ ] No máximo 3 ideias, melhor primeiro.
- [ ] Cada uma com as linhas do passo 3 e a nota da trindade.
- [ ] Nenhuma bate num veto; nenhuma reabre decisão já tomada.
- [ ] Nomes novos não lembram outra obra nem marca.

## Armadilhas conhecidas
- Ideia que "lembra" jogo conhecido (partes, cartas, batalha 3 contra 3 são o gênero; nomes, criaturas, arte e regras específicas dele não): pesquise o gênero para entender, nunca para copiar.
- Ideia que premia volume apostado ou esconde perda é veto.
- Ideia de dinheiro sem citar o caminho real de pagamento no código.

## Entrega ao diretor
```
Ideias: <pedido>
1) <Nome> — <2 frases> · Dopamina/vídeo: ... · Economia: fonte|sumidouro|neutra (economista? s/n) · Tamanho: P|M|G · Trindade: D __ · Cg __ · Ch __
2) ...
3) ...
Recomendo: 1, porque <1 frase>.
APRENDIZADO: <só se houver>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
