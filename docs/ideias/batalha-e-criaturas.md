# Frayz — batalha e criaturas (desenho aprovado em 14/11/2026 23:27 BRT)

Tema e nome aprovados pelo dono ("sim, nome do jogo: Frayz — tema bonecos amaldiçoados opção 1"). Todo número abaixo é **PROVISÓRIO**: serve ao protótipo sem dinheiro e só vira regra depois do simulador e do "sim" do dono.
Tudo aqui é próprio. É proibido copiar nome, criatura, carta, arte ou visual de jogo existente.

## 1. Fantasia
- Bonecos de pano **amaldiçoados**: uma bruxa-costureira os costurou com retalhos de bonecos que perderam. Olho de botão torto, boca de zíper, cara de bravo. Engraçados, mas com cara de briga.
- O nome de cada boneco é montado pelas partes (ex.: "Zíper-Tamanco-Novelo").
- No golpe crítico a costura estoura e o enchimento voa.

## 2. Seis reforços do tema (aprovados)
1. Amaldiçoados, não fofos.
2. **Retalho de troféu** (só visual): no ranqueado, cada vitória costura no boneco um pedacinho da cor do adversário.
3. **Fio de Ouro**: os primeiros da temporada ganham costura dourada visível e lugar no Mural da temporada. Não dá força.
4. **Costura (cruzamento) é revelação**: o filho nasce num casulo de retalhos que abre parte por parte; a chance de cada parte aparece na tela ANTES de confirmar.
5. **Imagem pronta para postar**: ficha do boneco e os últimos 20 s da luta num link.
6. **Time legível**: cada parte mostra a carta que carrega.

## 3. Tipos (roda)
Seis tecidos. Cada um bate forte no seguinte (+25% de dano) e apanha do anterior:
Jeans > Seda > Lã > Feltro > Tule > Couro > Jeans.
A roda fica sempre visível num canto. Só a raridade tem cor; o tipo é um ícone de textura.

## 4. Anatomia (5 partes)
- **Cabeça, Braços, Pernas**: cada uma dá 1 carta e um pouco de atributo.
- **Tronco**: define o tipo e os atributos base (Vida, Rapidez, Firmeza).
- **Bordado**: dá 1 passiva (ex.: "Espinho: devolve 15 de dano"). Não é carta.
- Baralho da luta: 3 bonecos × 3 cartas × 2 cópias = 18 cartas.
- **Genes**: cada parte tem a face visível (dominante) e o forro escondido (recessivo); o botão "olhar o avesso" mostra o forro.
  - Costura: para cada parte, 50% de vir de cada pai; do pai escolhido, 70% vem a face e 30% o forro. O forro do filho é sorteado entre as 4 opções dos pais.
- **Raridade das partes**: Comum, Incomum, Rara, Lendária. Raridade dá mais OPÇÕES (efeito extra, combinação), não números muito maiores: teto de +10% de valor sobre a Comum. Enfeite só muda aparência.

## 5. Batalha 3×3
- Lugares: Frente, Meio, Trás. Ataque comum acerta o primeiro vivo a partir da Frente; carta de "Alcance" escolhe o alvo; trocar dois de lugar custa 1 Linha.
- Turnos **alternados**, 20 s por vez. Quem começa ganha 1 Linha a menos no 1º turno.
- Energia = **Linha**: +3 por turno, guarda até 7.
- Mão: começa com 4, compra 2 por turno, máximo 7. Quando um boneco cai, as cartas dele viram "fiapo" (descarta por 0 Linha e compra 1).
- **Último Fio**: na primeira vez que cai a 0 de vida, o boneco fica de pé até o fim do próximo turno do dono e só usa cartas de Pernas.
- Vitória: derrubar os 3. A partir do turno 9 a **Tesoura** tira 10% da vida máxima de todos por turno; no turno 12 vence a maior soma de % de vida.
- Duração alvo: 8–10 turnos, 2,5–3,5 min.
- **Determinismo**: o servidor guarda a semente e a lista de comandos. Embaralhar, crítico e desempate saem da semente, em ordem fixa. A luta roda inteira sem tela; o replay é semente + comandos.

## 6. Doze cartas de exemplo (PROVISÓRIAS)
| Carta | Parte / tipo | Linha | Efeito |
|---|---|---|---|
| Botãozada | Cabeça / Jeans | 1 | 70 de dano na Frente |
| Mordida de Zíper | Cabeça / Couro | 2 | 90 de dano; +50% se o alvo tem Fio Solto |
| Agulha Longa | Braços / Seda | 1 | Alcance; 50 de dano em qualquer lugar |
| Abraço Apertado | Braços / Lã | 1 | escudo de 40 em si e 20 em um vizinho |
| Novelo Rolante | Pernas / Lã | 2 | 60 de dano e empurra o alvo uma casa para trás |
| Pisão de Tamanco | Pernas / Couro | 2 | 80 de dano; +40 se você tem menos vida que o alvo |
| Rasgo | Braços / Jeans | 1 | 40 de dano e Fio Solto (+20% de dano recebido por 2 turnos) |
| Véu de Tule | Cabeça / Tule | 1 | o próximo ataque contra ele erra (garantido) |
| Ponto Cruz | Braços / Feltro | 0 | compra 1; se for do mesmo tipo, +1 Linha |
| Remendo Rápido | Pernas / Feltro | 2 | cura 80 num aliado |
| Desfiar | Cabeça / Seda | 3 | 40 de dano em todos os inimigos |
| Último Ponto | Pernas / Tule | 1 | só com menos de 25% de vida ou no Último Fio; 150 de dano |

## 7. Modos
- **Aventura** (farmador): fases; o inimigo MOSTRA a próxima intenção. Ganho por resultado, com teto na energia diária. Times alugados jogam aqui, com divisão automática.
- **Ranqueado** (baleia): rival humano ou o time salvo dele; intenção escondida; baralho travado na temporada de 30 dias; inscrição paga ao pote; replay público dos 100 primeiros.

## 8. Desgaste e limite de cruzamento
- Desgaste = "Pontos de Costura" que aparecem como remendos. Não reduz força até o fim. No fim vem a **Aposentadoria**: o boneco vai para o Mural da conta com as estatísticas e devolve "Retalhos Honrados" (material).
- Limite de cruzamento = **Carretel** com N voltas, visível na ficha, com a árvore da família.

## 9. Suposições abertas (o dono pode trocar)
1. Raridade dá opções, com teto de +10% de força.
2. Desgaste conta igual na Aventura e no Ranqueado.
3. Time alugado joga só a Aventura no começo.
4. Turnos alternados.

## 10. Primeiro protótipo local (sem dinheiro, sem token)
1. Motor de batalha em JS puro: semente + comandos → resultado, sem tela.
2. Roda dos 6 tipos, Linha, mão, lugares, Último Fio e Tesoura.
3. 24 cartas (as 12 acima + 12; 4 por tipo).
4. 9 bonecos prontos, montados de partes, com 2 raridades.
5. Tela simples em canvas: 3×3, mão, Linha e roda.
6. Robô em 2 níveis (ganancioso e planejador de 2 turnos).
7. Simulador em lote: 10.000 lutas; taxa de vitória por carta e por tipo; duração média. Alerta para carta acima de 55%.
8. Replay por semente.
9. 5 fases de Aventura com intenção visível.
10. Costura local com chances na tela e "olhar o avesso".
11. Contador de Pontos de Costura e Carretel na ficha.
12. Teste com 5 pessoas: dura 2–4 min? Querem a revanche?

## 11. Riscos
1. Parecer cópia do líder do gênero → 5 partes com Bordado passivo, Linha que se guarda, Último Fio, tema de pano; revisar cada nome e arte.
2. "Paga para ganhar" → teto de força por raridade; prova no simulador com e sem Lendária.
3. Meta resolvida ou robôs farmando → teto de energia; temporada troca 2 regras de arena; simulador vigia carta acima de 55%.

Trindade do desenho (estimativa do diretor): Dopamina 94 · Congruência 95 · Coerência 96. Guardião e diversão dão a nota com o protótipo.
