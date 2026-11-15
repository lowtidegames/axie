# Jogo idle: o laço inteiro

Proposta do designer de jogo, 15/11/2026, para a ordem do dono de 10:18 ("nosso jogo sera idle e o jogador precisa gerenciar com estrategia com base na conta dele"). Só desenho. **Nenhum número de economia muda aqui**: tudo que é número novo está marcado PROPOSTA e espera o dono e o economista. Percentuais de vitória e custo de servidor são exemplo ou conta de cabeça, não medição. Nomes novos (Keeper, Roost, Patrol, Standing Orders, Chronicle, Road Report, Nest) são provisórios: o dono escolhe, e cada um passa por busca antes de ir para a tela.

## 1. O jogo em 5 linhas

1. Você é um **Keeper**: cria monstros elementais feitos de partes num **Roost** à beira da King's Road.
2. Você monta trios e dá ordens; eles lutam sozinhos nos 5 lugares da estrada, com o jogo aberto ou fechado.
3. Cada luta gasta 1 **Ration**. São 20 por dia, e esse é o teto de tudo.
4. Cada monstro tem uma vida de lutas (**Scars**) e um número de ovos (**Clutches**). Gastar bem os dois é o jogo.
5. Do **Nest** saem filhotes com partes misturadas, feitos para vencer um lugar que seus monstros de hoje não vencem.

**Sou o quê?** O dono do criadouro: não aperto botão de golpe, eu decido quem vai, para onde, e quem nasce.

## 2. O laço

| Escala | O que acontece | O que o jogador faz |
|---|---|---|
| **Por minuto** (assistindo) | Uma luta de lado, 40–50 s em 1×, 12 s em 4×. Picos do piloto: Strong!, crítico, Last Stand, Sundown. | Nada na luta. Olha, acelera, pula. |
| **Por sessão** (2–5 min) | Lê a Chronicle (o que as patrulhas fizeram), vê 1 replay, ajusta ordens, cuida do Nest. | 1 a 3 decisões de verdade (seção 3). |
| **Por dia** | 20 Rations viram 20 lutas. Um ovo choca. | Reparte as Rations entre patrulhas e lugares. |
| **Por semana** | O **Road Report** troca as guarnições dos 5 lugares (avisado antes). | Refaz o encaixe trio × lugar. |
| **Por temporada** (30 dias) | Cerca de 600 lutas. Um trio fixo gastaria metade da vida dele. Pontos da temporada fecham e o ranking recomeça. | Planeja a linhagem: quem luta agora, quem cruza, quem fecha a carreira. |

**Com o jogo aberto:** o botão **March now (uses 1 Ration)** roda a próxima luta na hora. É o botão de hoje, só que a luta é automática.

**Com o jogo fechado:** as **Standing Orders** continuam. A cada sino (PROPOSTA: 30 min) o servidor gasta 1 Ration na próxima luta da fila, até as Rations do dia acabarem.

**O que é honesto aqui:**
- Aberto e fechado têm o mesmo teto (20) e a mesma regra. Ninguém ganha mais por ficar olhando, ninguém paga para acelerar.
- Nada se perde por ficar fora. Monstro não foge, ovo não estraga, Chronicle não some.
- As ordens valem sozinhas por um prazo mostrado antes (PROPOSTA: 3 dias). Depois os trios ficam em casa, descansando. A tela diz ao assinar: "These orders run for up to 3 days: up to 60 fights, 60 Scars per monster."
- O resultado de cada luta é sorteado na hora em que ela acontece, com as ordens daquela hora. Mudar ordem não refaz luta passada. A tela diz: "The result is decided when the fight starts."

**Ponto para o guardião olhar:** Scars gastas com o jogo fechado. É consequência de uma ordem que o próprio jogador assinou, com o total na tela antes, e tem teto. Não é veto na minha leitura, mas é dele a palavra.

## 3. As decisões de gestão, em ordem de peso

A regra do motor que faz tudo depender da conta: o bônus de +25% vale quando o **elemento da habilidade** bate forte no **elemento do corpo** do alvo. Como cada parte traz a sua habilidade, um monstro misturado ataca com vários elementos e defende com um só.

O que cada um dos 9 leva hoje:

| Monstro | Corpo (apanha forte de) | Habilidades de dano batem forte em |
|---|---|---|
| Burrlet | Bloom (Ember) | Tide |
| Ramblehorn | Bloom (Ember) | Tide, Mist |
| Snapcoal | Ember (Mist) | Bloom |
| Cindertusk | Ember (Mist) | Tide, Stone, Bloom |
| Ripplance | Tide (Bloom) | Stone |
| Cobblepup | Stone (Tide) | Gale |
| Breezle | Gale (Stone) | Mist |
| Wispurr | Mist (Gale) | Ember |
| Lanternewt | Mist (Gale) | Stone, Gale |

### Decisão 1: qual trio vai para qual lugar (a mais pesada)
- **Escolhe:** 3 monstros por patrulha e o lugar de cada patrulha.
- **Depende de:** os elementos das habilidades e dos corpos que a conta tem.
- **Por que não há resposta única:** cada lugar tem uma guarnição fixa, e o mesmo monstro é pedido em dois lugares. Exemplo: em Thornwood Edge (Burrlet, Ripplance, Cobblepup) o Cindertusk bate forte nos três e ninguém lá bate forte nele. Em Crownhold Keep (Ramblehorn, Cindertusk, Ripplance) ele também bate forte em dois. A conta só tem um Cindertusk. Quem tem dois, ou tem um filhote com as partes dele, joga outro jogo.
- **A tela mostra:** na folha de ordens, ícones de elemento por monstro ("Strong vs 2 · Weak to 1"), calculados pela mesma função do motor, e o placar real daquele trio naquele lugar ("Thornwood: 14 W – 6 L"). Nada de estimativa inventada.

### Decisão 2: onde gastar as 20 Rations
- **Escolhe:** quantas Rations do dia vão para cada patrulha.
- **Depende de:** o placar que cada trio da conta tem em cada lugar.
- **Por que não há resposta única:** lugar mais difícil vale mais por vitória (pesos do beta: 1 · 1,25 · 1,8 · 2,4 · 2,8), mas só vitória pontua. Exemplo com números inventados: trio que vence 60% em Stonebridge rende 0,60 × 2,4 = 1,44 por Ration; o mesmo trio vencendo 35% em Crownhold rende 0,98. Para outra conta, com outro trio, a ordem se inverte. A sequência de 3 vitórias (+50%) puxa para o lugar seguro; o peso puxa para o difícil.
- **A tela mostra:** barra de Rations repartida por patrulha e, na Chronicle, pontos por Ration de cada patrulha no dia.
- **Aviso:** o estudo da economia diz que, com os pesos de hoje, "todo mundo escolhe F5". Se a medição confirmar, esta decisão vira enfeite. Ver seção 4, item N3.

### Decisão 3: de quem gastar a vida (Scars)
- **Escolhe:** quem luta todo dia e quem é poupado.
- **Depende de:** as Scars de cada monstro (0 a 1.200 lutas, 5 níveis no retrato) e de quantos monstros bons a conta tem.
- **Por que não há resposta única:** o melhor trio lutando as 20 por dia acaba em 60 dias. Três trios revezando duram 180, mas vencem menos. Conta pequena precisa poupar; conta funda pode queimar o melhor trio na temporada que importa.
- **A tela mostra:** barra de vida em cada ficha ("Scars 412 / 1200 · about 34 days at this pace") e, ao assinar ordens, quantas Scars aquela ordem gasta.
- **Honestidade:** "mandar descansar" hoje seria enfeite. Scars não tiram força e não voltam. A decisão de verdade é a do orçamento de vida, não um botão de descanso.

### Decisão 4: quem cruza com quem, e quando
- **Escolhe:** o par, e a hora.
- **Depende de:** traços à vista e escondidos, Clutches de cada um (5 na vida), parentesco, vaga na coleção (teto de 60).
- **Por que não há resposta única:** o alvo é da conta. Exemplo: falta à conta um monstro para Stonebridge Watch (Cindertusk, Breezle, Wispurr), que pede habilidades Mist, Stone e Gale. Cruzar Lanternewt × Breezle busca corpo Gale ou Mist com Quake Feet e Storm Brow. Cada traço à vista de cada pai tem 35% de passar; cada escondido, 15%. A tela já mostra isso por parte antes de confirmar.
- **O "quando":** aposentado não cruza, e o custo sobe a cada Clutch usado pelos dois pais. Cruzar cedo custa menos e garante o gene; cruzar tarde deixa ver primeiro quem provou valor na estrada. PROPOSTA nova: os dois pais ficam no Nest até o ovo chocar (8 h). Aí cruzar o seu melhor lutador tem preço, e esse preço depende de quanta reserva a conta tem.
- **A tela mostra:** chances por parte, Clutches que sobram, custo, e "these two stay in the Nest until it hatches".

### Decisão 5: formação e tática de cada trio
- **Escolhe:** Front / Middle / Back, tática (Rush, Focus, Guard) e ordem das habilidades.
- **Depende de:** HP, Armor e habilidades de cada monstro e da guarnição do lugar.
- **Por que não há resposta única:** 10 das 24 habilidades só acertam o Front. Contra Hearthfield (Snapcoal bate só no Front) um Cobblepup na frente segura; contra Thornwood, o Tidal Crash do Ripplance acerta todos e o Front pesa menos.
- **A tela mostra:** depois da luta, "damage taken by spot" e quantos golpes Strong o trio deu e levou.
- **Honestidade:** posição é estratégia. A ordem das habilidades pode ser enfeite (risco 1 do piloto: o motor ainda sorteia quais ficam prontas). Só fica na tela se a medição mostrar 5 pontos de diferença.

### Decisão 6: o que fazer com o repetido e com a coleção cheia
- **Escolhe:** manter para cruzar, manter como reserva de vida, ou aposentar.
- **Depende de:** Clutches que sobram, raridade das partes, vaga (60).
- **Por que não há resposta única:** um segundo Cobblepup com 5 Clutches é um pai inteiro; com 0 Clutches e 900 Scars é só vida que resta. Honor Badges saem pela raridade das partes à vista (1, 2, 3, 5).
- **A tela mostra:** na ficha, lado a lado: "Keep: 5 Clutches, 300 fights left" e "Retire: 7 Honor Badges".
- **Limite de hoje:** só dá para aposentar no fim da vida. Aposentar antes é regra nova com número de economia (seção 4, N8).

### Decisão 7: melhorias do Roost
- **Escolhe:** qual abrir primeiro: 2ª e 3ª patrulha, 2º lugar no Nest, Scout Post (mostra o Road Report da semana seguinte).
- **Depende de:** tamanho da coleção. Conta com 9 monstros não usa a 3ª patrulha; conta que cruza muito quer o Nest.
- **Honestidade:** isto é progresso, não estratégia. Nenhuma melhoria dá "+X% de força" nem mais Rations. Elas só abrem opções. Pagas com Honor Badges (sumidouro; passar pelo economista).

**Resumo: o que é estratégia e o que é enfeite**

| Estratégia de verdade | Enfeite (gostoso, mas não muda resultado) |
|---|---|
| Trio × lugar · Rations por patrulha · vida (Scars) · par e hora do cruzamento · posição · manter ou aposentar | Velocidade 1×/2×/4× · assistir · nome do monstro · curativos no retrato · filhote menor nas primeiras lutas · ordem das habilidades (até medir) · botão "descansar" (não propor) |

## 4. O que já existe e o que é novo

**Já existe e entra como está:**

| Peça | Onde | Uso no idle |
|---|---|---|
| Motor determinístico, replay por semente | `shared/batalha.js` (`criarLuta`, `reproduzir`) | Toda luta de patrulha |
| Energia 20/dia, gasta ao abrir a luta, na mesma transação | `server/jogo.mjs` (`gastarEnergia`) | Rations, sem mudar |
| 5 fases com liberação | `server/jogo.mjs` (`FASES_DA_AVENTURA`, `liberarFase`) | Os 5 lugares |
| Desgaste 1.200, 5 níveis, sem tirar força | `shared/costura.js` (`registrarLuta`, `nivelDeRemendo`) | Scars |
| Cruzamento com traços à vista e escondidos, chances por parte, Clutches 5 | `shared/costura.js` (`chancesDaCostura`, `costurar`) | Nest |
| Raridade com teto de +4% | `shared/config.js` (`RARIDADES`) | Raridade vale Honor Badges e prestígio, não vitória |
| Teto de 60 vivos, monstro "ocupado" | `server/jogo.mjs` (`maxBonecosPorConta`, `ocupar`) | Aperta a decisão 6; trava o pai no Nest |
| Acerto de contas a cada pedido, sem tarefa em segundo plano | `server/jogo.mjs` (`aoPedido`, `vencerPrazo`) | Mesmo jeito para acertar as lutas do jogo fechado |
| Sequência de vitórias | `contas.vitorias_seguidas` | Decisão 2 |

**Novo (lista curta):**

| # | O quê | Tamanho | Quem | Número de economia? |
|---|---|---|---|---|
| N1 | Escolhedor + `lutaAutomatica(semente, times, ordens)` devolvendo eventos e resultado. Ainda não está em `shared/`. | M | motor | não |
| N2 | Guarnição fixa por lugar na configuração (hoje o servidor sorteia o rival ao acaso). O rival também usa o escolhedor, com ordens fixas do lugar. | P | motor + servidor | não |
| N3 | Simulador: matriz trio × lugar. Aprova se nenhum lugar for o melhor para mais de metade dos trios. | M | motor | os pesos dos lugares, se precisarem mudar: **sim, dono + economista** |
| N4 | Ajuda `vantagens(trio, guarnição)`: conta Strong e Weak para a tela, pela função `bateForte`. | P | motor | não |
| N5 | Patrulhas: tabela com trio, lugar, ordens, parte das Rations, hora da assinatura; acerto das lutas pendentes a cada pedido, com teto por pedido. Via cofre (banco + rota + economia). | G | servidor | sino de 30 min e prazo de 3 dias: **sim** |
| N6 | Chronicle: lista das lutas acertadas, com replay refeito por semente + ordens. | P | servidor | não |
| N7 | Ovo com tempo de choca e pais no Nest. | P | servidor | 8 h: ritmo; **levar ao dono** |
| N8 | Aposentar antes do limite. | P | motor + servidor | **sim** (quantas Honor Badges) |
| N9 | Melhorias do Roost pagas com Honor Badges. | M | servidor | **sim** |
| N10 | Road Report semanal (rodízio de guarnições, publicado antes). | M | servidor | não, se os pesos não mudarem |
| N11 | Telas: mapa com patrulhas, folha de ordens, Roost e Nest, Chronicle (seção 7). | G | tela | não |

Ordem de construção: N1 → N2 → N3 (medir antes de construir o resto) → N4 e N11 em modo local → N5 e N6 → N7 → N10 → N8 e N9.

## 5. Várias lutas ao mesmo tempo?

**Forma proposta:** até 3 patrulhas com ordens ao mesmo tempo, mas **uma fila só de lutas por conta**, 1 Ration por luta, teto de 20 por dia. Mais patrulhas não dão mais lutas: dão mais jeitos de repartir as mesmas 20. É isso que deixa a ideia fora de "fonte nova de ganho".

**Riscos, de cabeça:**

| Risco | Tamanho | Por quê | O que segura |
|---|---|---|---|
| **Robô que joga melhor** | Baixo | Todos usam o mesmo escolhedor, no servidor. Não há mão para automatizar. | O próprio formato. |
| **Fazenda de contas** | **Alto** | Idle é o melhor caso para ela: cria a conta, assina a ordem, vai embora. A detecção por comportamento enfraquece, porque todo mundo "parece robô". | Prazo das ordens (3 dias); só vitória pontua e conta fraca vence pouco nos lugares que valem; o pacote anti-bot do estudo da economia (1 conta por carteira + aparelho, 1º saque após 7 dias) passa a ser obrigatório, não opcional. Só o beta mede. |
| **Refazer sorteio** | Baixo | A semente nasce na hora do acerto, no servidor; ordem nova só vale para a próxima luta. | Acerto dentro de transação, como hoje. |
| **Custo de servidor** | Baixo a médio | 10 mil contas × 20 lutas = 200 mil lutas por dia, perto de 2 por segundo. O escolhedor é barato. O perigo é o rival usar o `planejador` (busca com cópias do estado) e um jogador voltar com 60 lutas para acertar num pedido só. | Rival com escolhedor (N2); no máximo 20 lutas acertadas por pedido, o resto no pedido seguinte; guardar só semente + times + ordens (replay refeito sob demanda). Medir o tempo por luta antes do N5. |
| **Calculadora da comunidade** | Médio | Alguém publica um site que diz a melhor repartição. | Tudo bem: a resposta dela muda de conta para conta e de semana para semana (Road Report). O jogo vira "ter a conta certa", que é o que se quer. |

## 6. Primeira sessão (10 minutos)

| Minuto | O que acontece |
|---|---|
| 0:00–1:00 | Mapa da King's Road vivo. Um ovo no Nest racha parte por parte: nasce o primeiro monstro (a cena que já existe). Primeiro prêmio em menos de 60 s. |
| 1:00–3:00 | A conta recebe o time inicial. O jogo aponta Hearthfield e mostra a guarnição (Snapcoal, Cobblepup, Lanternewt) com os ícones de elemento. O jogador monta o trio; a folha acende "Strong vs 2". |
| 3:00–5:00 | **March now.** Primeira luta em 2×. Fim com "Strong hits: 7 given, 2 taken". Mais duas seguidas. "Millbrook unlocked." |
| 5:00–7:00 | Primeira escolha de verdade: Millbrook pede outro trio (Ramblehorn, Wispurr, Breezle lá). O jogador troca um monstro, vê os ícones mudarem, e reparte as Rations: 6 para Hearthfield, 8 para Millbrook. |
| 7:00–9:00 | Primeiro cruzamento: escolhe dois pais, lê as chances por parte, confirma. O ovo vai para o Nest: "Hatches in 8 h. Both parents rest here." |
| 9:00–10:00 | Assina as Standing Orders. A tela resume: "11 Rations left today. Your patrols will use them while you're away. Orders run for up to 3 days." Fecha sem culpa. |

**Motivo honesto para voltar amanhã:** o ovo chocou e as partes ainda não foram reveladas; a Chronicle tem as lutas da noite com o placar por lugar; as 20 Rations voltaram. Nada disso some se ele voltar depois de amanhã.

## 7. As 3 telas principais (para o dev-tela)

**Tela 1: King's Road (casa do jogo, mapa visto de cima)**
- Mostra os 5 lugares com o ícone dos 3 elementos da guarnição, o Roost, e cada patrulha como 3 monstrinhos andando até o seu lugar.
- Em cima: saco de Rations (12/20), relógio do próximo sino, pontos da temporada, dia da temporada.
- Embaixo: fita da Chronicle com as 3 últimas lutas ("Thornwood · WIN · 2 Strong").
- Toca-se: num lugar (abre a folha de ordens), numa patrulha (abre a luta ao vivo ou o replay), na fita (abre a Chronicle inteira).
- Parado, o mapa se mexe sozinho: patrulhas andando, bandeirinhas, fumaça do Nest quando há ovo.

**Tela 2: Patrol Orders (folha de ordens de uma patrulha)**
- Mostra a guarnição do lugar à direita e o trio do jogador à esquerda, de lado, nas 3 posições.
- Por monstro: ícones "Strong vs / Weak to", barra de Scars e o que a ordem vai gastar.
- No meio: tática (Rush, Focus, Guard), barra de Rations desta patrulha, placar real do trio neste lugar.
- Toca-se: arrastar monstro da coleção para a posição, trocar tática, puxar a barra de Rations, **Sign orders** e **March now (uses 1 Ration)**.
- Aviso fixo no rodapé: quanto dura a ordem e quantas lutas e Scars ela pode gastar.

**Tela 3: Roost (coleção e Nest)**
- Mostra a grade dos monstros (até 60) com moldura de raridade, elemento, barra de Scars, "Clutches 3/5" e selo de onde está (Patrol 1, Nest, Free).
- Filtros por elemento do corpo, elemento de habilidade e "has Clutches".
- Lado direito, o Nest: dois lugares para os pais, chances por parte, custo, e os ovos chocando com o tempo que falta.
- Toca-se: ficha do monstro (traços, Peek hidden traits, histórico), arrastar dois para o Nest, Breed, Hatch (abre a cena do ovo), Retire.
- Hall of Legends e melhorias do Roost ficam numa aba ao lado.

## 8. Opções, recomendação, trindade, riscos e o piloto

| # | Forma do idle | Ganha | Perde | Nota |
|---|---|---|---|---|
| 1 | **Patrols com Standing Orders** (este documento) | Usa energia, fases, desgaste e cruzamento como estão. A resposta muda por conta. Aberto e fechado com a mesma regra. | Trabalho grande no servidor. Fazenda de contas fica mais fácil. Depende de a matriz trio × lugar não ter lugar dominante. | **8,5** |
| 2 | **Timed Expeditions** (trio sai por 4 h ou 8 h e volta com o pacote) | Simples de entender e de construir. Um baú para abrir na volta. | Espera longa sem nada na tela. Menos decisões por dia. A duração vira relógio para o jogador obedecer. Não dá para corrigir a rota no meio do dia. | 7,0 |
| 3 | **Standing Arena** (defesa automática contra trios de outros jogadores) | É o que esse público mais comenta. Ranking vivo o dia todo. | Contas combinadas trocam vitória. Pareamento e carga de servidor. Mexe direto no pote. Fica para depois, como Ranqueado. | 6,0 |

Fora da lista, só para registro: prédios que produzem recurso por hora. Cria fonte nova por tempo, tem receita única e não usa o motor.

**Recomendada: a 1.** É a única em que a pergunta "o que eu faço hoje?" tem resposta diferente para cada conta, usando só peças que já passaram por teste e segurança.

**Por que 8,5 e não 9,5:** faltam três provas que só saem medindo. (a) A matriz trio × lugar sem lugar dominante. (b) Posição e tática mudando o resultado em 5 pontos ou mais. (c) O prazo das ordens segurando a fazenda de contas no beta.

**Trindade esperada:** `D 84 · Cg 86 · Ch 88`
- D: Chronicle de manhã, ovo que amadurece, replay do melhor golpe. Perde pontos porque o jogador não age na luta.
- Cg: mesma estrada, mesmos 9 monstros, mesmos nomes do piloto. Perde pontos até a arte mostrar as partes misturadas.
- Ch: a tela mostra placar real e ícones da função do motor; mesma regra aberto e fechado. Perde pontos enquanto os pesos dos lugares não forem medidos.

**Os 3 maiores riscos:**
1. **Receita única disfarçada.** Se um lugar for o melhor para quase todo trio, as decisões 1 e 2 morrem e o jogo vira "mande tudo para Crownhold". O estudo da economia já viu isso com os pesos atuais. É o primeiro item a medir.
2. **Fazenda de contas.** O idle tira a vantagem do robô e dá de presente a da conta parada. Sem o pacote anti-bot do estudo da economia, não deveria existir prêmio neste formato.
3. **Pouca coisa para fazer na primeira semana.** Com 9 monstros e 1 patrulha, a sessão pode durar 40 segundos. O Road Report semanal e o Nest são o que dá assunto; se não bastar, falta conteúdo, não número.

**O que o piloto deve ganhar primeiro (1 tela, modo local, sem servidor):**
- Antes da luta, **dois lugares à escolha** em vez de um, cada um com a sua guarnição e ícones de elemento: Thornwood Edge (Burrlet, Ripplance, Cobblepup) e Stonebridge Watch (Cindertusk, Breezle, Wispurr).
- O jogador escolhe 3 entre 6 monstros; os ícones "Strong vs / Weak to" mudam ao arrastar.
- Um botão **Send patrol (5 Rations)**: 5 lutas seguidas, a primeira assistida, as outras em 4× ou resumidas.
- No fim, uma tira: "3 W – 2 L · Strong hits given 11 · taken 4", e o botão para tentar o outro lugar com outro trio.
- Depois, a cena do ovo como já está.

Se o dono trocar o trio, trocar o lugar e sentir que o resultado mudou por causa da escolha dele, a ideia está provada. Se não sentir, o problema está na decisão 1 e nada mais deve ser construído antes de consertar isso.

## 9. Rodada dos conselheiros (15/11/2026, 10:34–10:38 BRT)

Conselheiros: guardião 73 (aprovado, sem veto, 6 ajustes) · diversão 68 (abaixo da meta; D 66) · economista 85.

**Guardião (73).** Scars gastas com o jogo fechado são consequência informada se a ordem tiver prazo, total à vista antes de assinar e nunca renovar sozinha. Ajustes: (1) acerto das lutas idempotente, com teste de 2 pedidos juntos; (2) a folha de ordens diz "Type edge only, not a win chance", mostra o total que a ordem gasta (lutas, Scars, Rations que somem à meia-noite UTC) e tem "Stop orders"; (3) Road Report publicado 3 dias antes ou a ordem termina na troca; (4) pai que está numa patrulha: avisar ao confirmar o cruzamento; (5) ovo: "decided when you confirm", com a chance de raridade à vista; (6) trocar nomes que lembram marca: King's Road, Keeper, Hearthfield (os demais ainda pedem busca em lojas). Tirar "rende", "best", "yield" dos textos.

**Diversão (68).** Bom: primeiros 60 s (85) e o ovo (88). Fraco: sessão diária (58), dia 30 (50), terça a domingo sem decisão nova; nenhum número do monstro sobe (Scars só descem); sem prestígio e sem ritmo irregular. Melhorias: (1) ficha com história do monstro (placar por lugar, pais, títulos) e cartão para postar; (2) Chronicle como revelação (a luta mais apertada com o resultado escondido; a fita do mapa não mostra WIN/LOSS antes); (3) lutas 2 a 5 da patrulha como carimbos de ~3 s com a barra da sequência; (4) visitante do dia na guarda de um lugar, avisado na véspera (regra nova); (5) fecho de temporada com cerimônia e brasão (enfeite). Com as cinco: 80–82. Piloto: resultado da 1ª tentativa ao lado da 2ª; golpes Strong como sinal principal; dois lugares com diferença grande medida.

**Economista (85).** O idle não cria fonte (teto de 20 e pote de receita iguais; o pote nunca pagou mais do que entrou nos cenários rodados). Piora: bots de 2,1% para 6,2–8,2% do pote quando a detecção por comportamento enfraquece; o aluguel de time passa a incentivar conta dupla (a baleia ganha mais com 40 contas próprias do que alugando). "Todos na fase 5" confirmado (0,90 por energia na fase 5 contra 0,82 na 4). Proposta: pesos dos lugares pelo inverso da taxa média de vitória da matriz (ex.: 1 · 1,17 · 1,54 · 1,99 · 2,12), fixos na temporada. Critérios do simulador da matriz (84 trios × 6 formações × 3 táticas × 5 lugares, 400 lutas por casa): nenhum lugar melhor para mais de 40% dos trios; cada lugar melhor para pelo menos 10%; ir ao lugar popular em vez do seu custa 10% ou mais; em 100 contas, pelo menos 5 divisões ótimas diferentes; depois do Road Report, 30% das contas mudam de melhor lugar; vale com pesos ±10%; ponto médio por energia a ±5% do de hoje. Números propostos (todos esperam o dono): sino 30 min; ordens 3 dias; ovo 12 h com 1 vaga; aposentar antes do limite só acima de 50% da vida, por metade das medalhas; base: 2ª patrulha grátis, Scout Post 6, 3ª patrulha 8, 2ª vaga no ninho 12 medalhas. Prestígio sem inflar: Renome = raiz quadrada dos pontos da temporada, acumulado; dá só título, enfeite e vaga no Hall. Antes de qualquer prêmio: 1 conta por carteira + aparelho + verificação humana; ordem vencida não pontua e renovar exige entrar; saldo preso 7–14 dias e aluguel só entre contas sem ligação.
