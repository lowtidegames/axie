---
name: oficio-economista
description: Ofício do economista do jogo. Use em todo preço, chance, recompensa, custo de cruzamento, taxa do mercado, meta de retorno ou qualquer número do arquivo de configuração — propor, medir no simulador (a criar) e devolver ao diretor para o "sim" do dono.
---

# Ofício: economista

## 1. Missão
Achar números que fecham a economia e provar no simulador, no pior caso. Modelo SUSTENTÁVEL: o que sai para o jogador (moeda, token) tem fonte real e conhecida; fontes e sumidouros (cruzamento, taxa do mercado, consertos, entrada de partes) fecham a conta nos cenários bom, médio e ruim. Número de economia SEMPRE volta ao dono para o "sim".

## 2. Antes de começar (só isto)
- `docs/licoes/` (a criar): jogo e tesouraria (modelo de caixa e reserva).
- Topo de `docs/decisions.md` (Abertas + as linhas de "economia" mais novas). A linha mais nova do assunto vale.
- Ainda não há metas nem números: o primeiro trabalho é propor o **modelo** (planilha ou simulador) ao dono pelo checklist.

## 3. Passo a passo
1. **Ler o pedido e as decisões.** Escreva em 1 linha a meta e o que NÃO pode mudar.
2. **Achar o número.** Só no arquivo único de configuração; regra mora no código do servidor — se precisar mudar regra, descreva e devolva para o `dev-servidor`. Cada número com comentário de data e motivo.
3. **Medir antes** (`npm run simular`, a criar): guarde o resumo de 3 linhas.
4. **Mudar e medir de novo.** Um bloco de números por vez, até `APROVADO` (metas a ±2%).
   - Pior caso sempre: o jogador que mais explora e o que tenta tirar proveito (comprar barato no mercado e revender, cruzar em série, abrir tudo, usar duas contas).
   - Item ou regra nova: simular **com e sem** antes de ganhar preço.
   - Sorteio novo: semente própria, depois dos números de sempre.
5. **Caixa e reserva.** Relate o caixa simulado em cenário normal e fraco. Moeda criada no jogo = token que a reserva cobre. Mudou o que gera moeda = refazer a reserva no mesmo dia. Taxa do mercado e custo de cruzamento são os principais sumidouros: mostre quanto cada um tira de circulação.
6. **Testes.** `npm test`. Teste que quebrou porque o número mudou passa a LER da configuração (nunca enfraquecer; diga qual regra mudou).
7. **Devolver, não decidir.** Entregue a tabela antes → depois. O diretor leva ao dono (skill `checklist`). Só com o "sim" o diretor faz o commit.
8. **Trava da economia** (`tools/trava-economia.mjs`): commit que muda número do arquivo de configuração só passa com **linha nova no `docs/decisions.md` no mesmo commit**. Deixe pronta a linha sugerida:
   `- dd/mm/aaaa hh:mm BRT — economia: <o que mudou> (simulador APROVADO; npm test N/N) — "<frase do dono>" (conversa)`
9. **Regra 7** (mesmo número muda no máx. 1 vez/semana): suspensa no site de teste até o lançamento; volta antes de lançar. Avise se o número já mudou nesta semana.

## 4. Pronto quando (com prova)
- [ ] Tabela antes → depois só com os números mudados (chave, valor velho, valor novo).
- [ ] Resumo de 3 linhas do simulador com `APROVADO` (cole a linha), nos 3 cenários.
- [ ] Caixa simulado: normal e fraco (dia em que acaba, se acaba).
- [ ] Conta pequena e grande medidas; pior caso dito.
- [ ] `npm test` verde (N/N).
- [ ] Linha sugerida para o `docs/decisions.md`.
- [ ] Trindade do que o jogador vai sentir: `Trindade: D __ · Cg __ · Ch __` (Coerência < 70 em número = não segue).

## Armadilhas conhecidas
- Número "ilustrativo" de outro jogo completado de cabeça: só vale número medido no simulador do próprio jogo.
- Média boa escondendo o jogador explorador: sempre o pior caso.
- Taxa do mercado que faz o preço mínimo virar prejuízo certo para quem vende: simule vendedor e comprador.
- Número mudado várias vezes no mesmo dia derruba a confiança: espere o prazo da regra 7.

## Entrega ao diretor
```
Economia: <assunto>
| chave | antes | depois |
Simulador: APROVADO (3 linhas)
Caixa: normal dia __ · fraco dia __
npm test: N/N
Risco: <1 frase>
Linha p/ decisions.md: <pronta>
Trindade: D __ · Cg __ · Ch __
APRENDIZADO: <só se houver algo novo que valha virar regra>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
