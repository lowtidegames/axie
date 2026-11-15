# Frayz — economia do pote (PROPOSTA para o "sim" do dono)

Desenho aprovado pelo dono em 14/11/2026 23:17 BRT ("sim, pote com os quatro reforços opção 1"). Este texto **não redesenha nada**: só mede e propõe números.
**Todo número aqui é PROPOSTA.** Nenhum vale até o "sim" do dono. Valores em "US$ ilustrativo" (unidade de conta, não promessa).
Simulador: `npm run simular:economia` (arquivo `tools/simular-economia.mjs`, semente 42, 180 dias = 6 temporadas). Testes: `tests/servidor/economia-sim.test.js`.

## 1. Em 5 linhas
1. O pote **nunca pagou mais do que recebeu** em nenhum dos 4 casos (checado todo dia, 180 de 180). Isso é garantido pela regra, não pela sorte: o pote só solta uma fatia do que tem.
2. Num jogo estável de 1.500 jogadores, o farmador ganha ~US$ 0,48/dia e recupera a entrada (US$ 8) em ~24 dias; ~65% recuperam (os outros saem antes).
3. O pote é pago principalmente pelas baleias (bonecos de origem, inscrição, leilão, enfeites ≈ 55–60% da receita) e pela loja de kits.
4. Ponto fraco nº 1: **falta de time para alugar** (poucas baleias = farmador sem time = não recupera). Ponto fraco nº 2: **bots** — a economia sozinha não segura.
5. Na FUGA o pote não quebra, mas encolhe com o jogo: ninguém recebe "o prometido", recebe a parte do que entrou.

## 2. Como o dinheiro anda
```
 DINHEIRO DE FORA (real)                         DINHEIRO QUE GIRA NO JOGO (saldo do jogador)
 kit e bonecos da loja ─┐                        ┌─ costura, inscrição, enfeite pagos com saldo (reinvestir = 0% de taxa)
 bonecos de origem ─────┤                        ├─ taxa de mercado 6% · taxa de aluguel 5%
 leilão de raras ───────┼──► RECEITA ◄───────────┴─ taxa de saque 25%→6% (cai com a idade da conta)
 inscrição de ranking ──┤        │
 enfeites ──────────────┘        │  inscrição: 85% prêmio do ranking, 15% estúdio
                                 │  resto:     55% POTE · 15% RESERVA · 30% ESTÚDIO
                                 ▼
        ┌──────────────── POTE DA TEMPORADA (30 dias) ───────────────┐        RESERVA AMORTECEDORA
        │ 85% Aventura: solta 10% do saldo por dia;                   │ ◄────── completa até 80% da média
        │     cada ponto vale (solta do dia ÷ pontos do dia),         │         de 7 dias (máx. 5% dela/dia)
        │     com teto de US$ 0,04 por ponto; energia = 20 lutas/dia  │ ──────► acima de 30 dias de pagamento,
        │ 15% Ranking: pago no fim da temporada aos 25% de cima       │         o excesso volta ao pote
        │ sobra no fim: metade vai à reserva, metade fica             │
        └──────────────────────────────┬──────────────────────────────┘
                                       ▼
          SALDO DO JOGADOR ──► reinvestir (0%)  ou  sacar (25% → 15% → 10% → 6%)  ──► fora do jogo
          time alugado: 65% farmador · 30% dono · 5% taxa (volta à receita)
```
Desgaste: cada luta = 1 Ponto de Costura no boneco; com 1.200 ele se aposenta e vira 1 Retalho Honrado (US$ 1 a menos numa costura). Carretel: 5 costuras por boneco, cada uma mais cara.

## 3. Números propostos (com 2 alternativas nos sensíveis)
| Número | PROPOSTA | Alternativa A | Alternativa B | Por quê |
|---|---|---|---|---|
| Fatias da receita (pote / reserva / estúdio) | **55 / 15 / 30** | 50 / 15 / 35 (estúdio mais folgado; farmador −8%) | 60 / 15 / 25 (farmador +12%; caixa −17%) | o número que mais mexe em tudo |
| Pote: Aventura × ranking | **85 / 15** (+85% das inscrições no ranking) | 70 / 30 (top 10 ganha ~1,2–1,4× mais; farmador −29%) | 90 / 10 | com 70/30 o top 10 das baleias tira US$ 25–80/dia e o farmador perde quase 1/3 |
| Aluguel (farmador / dono / taxa) | **65 / 30 / 5** | 60 / 35 / 5 (farmador −4 a −16%) | 70 / 25 / 5 (farmador +10%; baleia aluga menos) | abaixo de ~60% o time alugado deixa de valer a pena |
| Preço do boneco comum (kit = 3) | **US$ 8** (kit US$ 24; farmador entra com 1) | US$ 10 (recupera em ~29 d em vez de ~24 d) | US$ 6 (entra mais gente; bots mais baratos) | é a "entrada" e o custo de cada conta-bot |
| Boneco de origem (baleia) | US$ 25 | — | — | 32% da receita |
| Energia diária | **20 lutas** | 15 (bots levam o mesmo %; farmador −20% na FUGA) | 25 | é o teto do ganho por dia |
| Desgaste até aposentar | **1.200 lutas** (~60–75 dias) | 900 (médio repõe mais; mais receita) | 1.800 (médio sofre menos) | o custo de verdade do médio e do bot |
| Carretel | **5 voltas** | 4 | 7 | mudou pouco no resultado (±0,02/dia) |
| Costura | **US$ 4**, × 1,25 a cada volta já usada pelos pais | US$ 5 | US$ 3 | 6–11% da receita |
| Taxa de mercado | **6%** | 5% | 8% | mercado ficou fino no modelo (≈0% da receita) |
| Inscrição de ranking | **US$ 20 / temporada** | US$ 15 | US$ 30 | 11–12% da receita |
| Taxa de saque (idade da conta) | **25% (0–14 d) · 15% (15–44) · 10% (45–89) · 6% (90+)**; reinvestir 0% | 35 · 20 · 10 · 6 (quase não muda bots: 27%→28%) | 20 · 12 · 8 · 5 | "sacar custa mais que reinvestir" |
| Liberação do pote | **10% do saldo por dia**, teto US$ 0,04 por ponto | 7% | 15% | quase não mexe; o teto só pesa na 1ª temporada e depois da fuga |
| Reserva | piso 80% da média de 7 dias, solta até 5%/dia, teto de 30 dias de pagamento; metade da sobra da temporada vai à reserva | teto 45 dias (reserva maior; farmador −8%) | teto 20 dias | |
| Prêmio do ranking | 25% dos inscritos, peso 1/posição^0,9 | top 10% | — | |
| Saque mínimo | US$ 5 | — | — | |

Comportamento (hipótese, não é número nosso): 3% baleias, 47% médios, 50% farmadores; saída 0,4% / 1,2% / 2% por dia; farmador saca 95%, médio 50%, baleia 30%.

## 4. Resultado (semente 42, escala 1; médias das temporadas 2–6)
| | ENCHENTE | ESTÁVEL | FUGA | ESTRESSE 30% bots |
|---|---|---|---|---|
| Jogadores ativos (pico → fim) | 5.000 → 4.995 | 1.500 → 1.499 | 4.000 → 720 | 1.500 → 1.499 |
| Receita de fora em 180 dias | 706 mil | 265 mil | 305 mil | 214 mil |
| Entrou no pote / pote pagou | 517 mil / 530 mil | 198 mil / 208 mil | 221 mil / 246 mil | 152 mil / 158 mil |
| Veio da reserva / voltou à reserva | 89 mil / 67 mil | 33 mil / 21 mil | 61 mil / 33 mil | 28 mil / 18 mil |
| Reserva no fim | 93 mil | 33 mil | 23 mil | 26 mil |
| Farmador ganha por dia | 0,43 | 0,48 | 0,63 | 0,37 |
| Médio ganha por dia | 0,53 | 0,56 | 0,69 | 0,45 |
| Baleia do top 10: ganha / gasta por dia | 52,7 / 6,5 | 20,9 / 6,5 | 22,5 / 8,4 | 16,7 / 6,2 |
| Farmador recupera a entrada (mediana; % que recuperou) | 26 d (61%) | 24 d (65%) | 16 d (75%) | 30 d (60%) |
| % do pote levado pelos bots | 0% | 0% | 0% | **27%** |
| Bonecos vivos por jogador (fim) | 3,56 | 3,62 | 3,72 | 3,47 |
| Pote pagou mais do que entrou? | **NUNCA** (180/180) | **NUNCA** | **NUNCA** | **NUNCA** |
| Caixa do estúdio no fim (após custos ilustrativos) | 214 mil | 66 mil | 78 mil | 46 mil |
| Índice do token no fim (brinquedo; >1 mais compra) | 2,29 | 1,63 | 1,16 (0,92 na queda) | 1,44 |

"Pote pagou" passa de "entrou no pote" porque a reserva devolve o excesso ao pote; a conta fecha: pago = entrou + veio da reserva − voltou à reserva − o que ainda está no pote. Além disso, o dinheiro inteiro fecha todo dia: dinheiro de fora = estúdio + pote + reserva + saldos dos jogadores + sacado.
Quem põe e quem tira (ESTÁVEL, 180 dias): farmadores põem 22 mil e sacam 40 mil; médios põem 84 mil e sacam 31 mil; baleias põem 159 mil e sacam 20 mil (+ saldo guardado).
Receita por fonte (ESTÁVEL): bonecos de origem 32% · kit e reposição 26% · inscrição 12% · leilão 11% · costura 11% · taxa de saque 4% · enfeites 4% · aluguel 1% · mercado ~0%.

## 5. Onde o modelo quebra (sem enfeite)
1. **Falta de time para alugar.** Com 1% de baleias e 70% de farmadores, 54–86% dos farmadores ficam sem time; o farmador ganha US$ 0,19–0,34/dia, leva 36–49 dias para recuperar e só ~30–50% recuperam. Mesmo no caso-base, na 1ª temporada ~50% ficam sem time (as baleias ainda estão costurando). **O farmador não recupera a entrada quando: não acha time, sai antes de ~20 dias, ou o pote é dividido com muitos bots.**
2. **Saída cedo.** 25–40% dos farmadores saem antes de recuperar, em todos os cenários (saída de 2% ao dia). A mediana de "dias para recuperar" só conta quem recuperou; olhe sempre o % ao lado.
3. **O médio paga a festa.** No ESTÁVEL os médios põem 84 mil e tiram 31 mil. Se o público for quase todo "sacador" (é o público de cripto), a receita cai e o ganho por dia cai junto. O pote não quebra — ele encolhe.
4. **FUGA.** A receita de fora cai ~80% de uma temporada para a outra (109 mil → 22 mil). O pote nunca fica negativo. Por 2–3 temporadas quem fica ganha MAIS por dia (0,45 → 0,76) porque a reserva e a sobra são divididas por menos gente; a reserva cai de 37 mil para 23 mil. Se a fuga continuar, o ganho cai até bater com a receita nova — não há dinheiro mágico. O índice do token fica abaixo de 1 (mais venda que compra) na queda: **se o pagamento for em token sem valor fixo, quem fica recebe menos em dólar.**
5. **Bots.** Com 30% de contas-bot, a fazenda leva 27% do pote e derruba o ganho do farmador em ~23% (0,48 → 0,37). Em 180 dias a fazenda não se paga (pôs 55 mil, sacou 32 mil), mas no longo prazo fica perto de empatar (ganha ~0,45/dia por conta; o kit custa ~0,40/dia com o desgaste). Subir a taxa de saque quase não muda (27% → 28%). **Só a economia não segura bot**: precisa de trava fora dela (uma carteira por conta, verificação, detecção de comportamento).
6. **Baleias.** Só o top 10 lucra; o grupo de baleias põe 159 mil e tira 20 mil. Se as baleias de fora do topo cansarem, cai a inscrição e o leilão (~23% da receita) e o kit de origem (32%).
7. **O que o modelo supõe e não mediu:** a curva de jogadores é dada de fora (não reage ao ganho); o time alugado rende 1,3× o kit (precisa do simulador de batalha); o mercado ficou fino porque as baleias guardam os filhos para alugar; o índice do token é brinquedo; o custo do estúdio (US$ 150/dia + 0,01 por ativo) é chute.

## 6. Os 5 números que mais mexem (ESTÁVEL, cada um −20% → +20%)
| Número | Farmador por dia | Recupera em | Outro efeito |
|---|---|---|---|
| Fatia do pote (55%) | 0,37 → 0,54 | 30 → 21 d | caixa do estúdio 91 mil → 32 mil |
| Fatia do farmador no aluguel (65%) | 0,37 → 0,54 | 30 → 22 d | baleia aluga menos |
| Preço do boneco comum (US$ 8) | 0,42 → 0,52 | 27 → 30 d | caixa 55 mil → 76 mil |
| Energia diária (20) | 0,43 → 0,48 | 27 → 24 d | médio fica com 40% → 31% do que pôs |
| Desgaste (1.200 lutas) | 0,50 → 0,47 | 23 → 24 d | médio fica com 32% → 43% do que pôs |
Maior que todos: **o tipo de público** (quantas baleias para cada farmador) — não é um número nosso, mas decide o resultado (item 1 da seção 5). Ruído entre sementes: ±0,03/dia.

## 7. O que o dono precisa decidir (lista curta)
| # | Decisão | Recomendação | Nota |
|---|---|---|---|
| 1 | Fatias da receita | 55% pote · 15% reserva · 30% estúdio | 88 |
| 2 | Divisão do pote | 85% Aventura · 15% ranking (+85% das inscrições) | 86 |
| 3 | Aluguel | 65% farmador · 30% dono · 5% taxa | 86 |
| 4 | Em que moeda o pote guarda o valor | pote guardado em valor fixo (moeda estável ou SOL) e pago em token pelo preço do dia; senão a queda do token esvazia o pote na FUGA | 90 |
| 5 | Trava contra bots fora da economia | 1 carteira por conta + carência de 7 dias no 1º saque + detecção de comportamento; sem isso, 30% de bots levam ~27% do pote | 91 |
| 6 | Taxa de saque | 25% · 15% · 10% · 6% (dias 0 · 15 · 45 · 90); reinvestir 0% | 85 |
| 7 | Preço do kit e energia | boneco US$ 8 (kit US$ 24), 20 lutas/dia, desgaste 1.200, Carretel 5, costura US$ 4 × 1,25 | 82 |
| 8 | Garantir time para alugar no começo | estúdio põe à venda times de origem limitados para baleias na 1ª temporada (ou fila de espera visível) — sem isso ~50% dos farmadores ficam sem time no 1º mês | 84 |
Por que não 95: falta medir o rendimento real do time alugado no simulador de batalha e o comportamento real do público (proporção baleia : farmador). Com o motor de batalha pronto (tarefa 1), dá para repetir a conta.

## 8. Como rodar
- `npm run simular:economia` — os 4 casos, semente 42.
- `node tools/simular-economia.mjs --cenario FUGA --semente 7 --escala 0.5 --json`
- Os parâmetros ficam num objeto único no topo do arquivo, todos marcados PROPOSTA. Este simulador não é o arquivo de configuração do jogo.
