# Frayz — direção de som

Pedido do dono em 15/11/2026 00:25 BRT: capricho máximo em som. A parte visual está em `docs/guia-de-estilo.md`.
Todo som é **fabricado por código** no navegador (WebAudio): nenhum arquivo de áudio, nenhuma biblioteca, nenhum som de terceiros, nenhum crédito pago.

## 1. A ideia: caixinha de música amaldiçoada num ateliê de costura
Dois mundos de som, e só esses dois:
1. **Ateliê:** tesoura, agulha, linha puxada, pano rasgando, enchimento, botão, zíper, dedal.
2. **Caixinha de música:** notas curtas e cristalinas, um pouco desafinadas, como um brinquedo antigo.

Nada de laser, moeda de fliperama, explosão ou voz. Se o som não poderia sair de uma caixa de costura ou de uma caixinha de música, não entra.

## 2. Música (gerada na hora)
- Valsa em 3 por 4, ré menor, 92 batidas por minuto. Timbre de caixinha de música: nota senoidal com um harmônico agudo, ataque seco, queda de 0,9 s, desafinação aleatória de ±6 cents por nota e eco curto de sala pequena.
- **Tema do Frayz** (a assinatura; aparece em tudo): ré – fá – lá – sol – mi | fá – ré – dó sustenido – ré.
- Sequência de acordes do laço (8 compassos): Rém · Rém · Solm · Lá7 · Rém · Si bemol · Solm · Lá7.
- Camadas, que entram e saem conforme o momento:

| Momento | O que toca |
|---|---|
| Entrada e telas calmas | só a caixinha, tema inteiro, devagar |
| Luta | caixinha + baixo pizzicato no 1º tempo + tique de máquina de costura bem baixo (semicolcheias) |
| Tesoura descendo (turnos 6–8) | entra um tique-taque de relógio |
| Tesoura cortando (turno 9+) | sobe meio tom e ganha um tremor de cordas |
| Último Fio em campo | a música abafa (filtro) e entra uma batida de coração a 70 por minuto |
| Costura (casulo) | caixinha sozinha subindo um degrau a cada parte aberta |
| Vitória | tema em ré maior, 2 compassos, com arpejo final |
| Derrota | tema descendo e desacelerando, como caixinha perdendo a corda |

- A troca de camada sempre acontece na virada do compasso, nunca no meio.
- A música abaixa 6 dB por 400 ms nos golpes grandes (crítico, queda, Tesoura) para o efeito aparecer.

## 3. Efeitos (um por acontecimento)
Cada efeito tem 3 variações (altura ±3 a 6% e filtro um pouco diferente); a mesma variação nunca toca duas vezes seguidas. Efeitos de boneco saem do lado em que ele está (esquerda ou direita).

| Acontecimento | Receita | Duração |
|---|---|---|
| Tocar em botão | clique de botão de madeira: senoide 800 Hz curtíssima + estalo de ruído | 60 ms |
| Escolher carta | papel de molde: ruído agudo curto com filtro subindo | 90 ms |
| Carta sem Linha | dois toques graves e surdos | 140 ms |
| Jogar carta | linha puxada: ruído em faixa subindo de 600 a 2.400 Hz + tique de agulha | 220 ms |
| Golpe | baque de enchimento: ruído grave com filtro em 300 Hz + corpo senoidal 110 → 70 Hz | 180 ms |
| Golpe forte | o mesmo, com 30% mais corpo, + estalo de costura | 260 ms |
| Crítico | pano rasgando (ruído em faixa descendo de 3.000 a 500 Hz, picotado a 40 por segundo) + estouro abafado + 3 notas agudas da caixinha | 520 ms |
| Vantagem de tecido | uma nota da caixinha, quinta acima, junto do golpe | 200 ms |
| Escudo ganho | dedal: sino pequeno com parciais 1 · 2,76 · 5,4 a partir de 1.900 Hz | 300 ms |
| Golpe no escudo | "tink" curto do dedal + baque menor | 160 ms |
| Véu fez errar | sopro de tule: ruído agudo suave que passa de um lado ao outro | 300 ms |
| Cura | 3 notas da caixinha subindo (ré, fá, lá) + linha puxada baixinho | 420 ms |
| Fio Solto aplicado | corda que afrouxa: nota que escorrega para baixo | 250 ms |
| Trocar lugares | dois passinhos de pano + deslize | 240 ms |
| Comprar carta | folha de papel virada | 80 ms |
| Fiapo descartado | fiapo cortado: tesourinha fina | 110 ms |
| Linha ganha | carretel girando: 3 tiques subindo | 180 ms |
| Sua vez | duas notas da caixinha (lá, ré agudo) | 350 ms |
| Tempo acabando (5 s) | tique-taque que aperta | laço |
| Último Fio | corda esticada que geme (serra com filtro e tremor) + um baque de coração | 700 ms |
| Queda | assobio curto descendo + baque mole + flocos | 500 ms |
| Tesoura desce um degrau | rangido metálico curto | 300 ms |
| Tesoura corta | "snip" grande: dois estalos metálicos + anel de metal + baque grave | 600 ms |
| Casulo: abrir parte | ponto arrebentando; cada parte um degrau acima da anterior | 200 ms |
| Casulo: parte Rara | o mesmo + brilho de 4 notas | 500 ms |
| Casulo: parte Lendária | o mesmo + tema do Frayz em oitava alta com eco | 1.200 ms |
| Remendo novo | agulha passando 3 vezes | 300 ms |
| Aposentadoria | tema lento, só a caixinha, terminando na nota longa | 2.500 ms |
| Vitória / Derrota | ver a tabela da música | 2,5 s |

## 4. Volume e mistura
- Tudo passa por um limitador no fim (compressor: limiar −10 dB, razão 12, ataque 3 ms, soltura 250 ms). Nenhum pico acima de −3 dBFS.
- Efeitos com pico entre −12 e −6 dBFS conforme a importância (toque de botão é o mais baixo; Tesoura e crítico, os mais altos).
- Música de fundo cerca de 12 dB abaixo dos efeitos.
- No máximo 16 sons ao mesmo tempo; passou disso, o mais antigo e mais fraco sai.
- Padrão ao abrir: efeitos em 70%, música em 45%. Controles separados de música e efeitos + botão de mudo, sempre a um toque. A escolha fica guardada no aparelho.
- "Menos animação" não corta o som; só tira os estouros mais fortes (crítico e Tesoura ficam 6 dB mais baixos).

## 5. Regras técnicas
- O áudio só começa depois do primeiro toque do jogador (regra dos navegadores) e volta sozinho quando a aba volta a ficar visível; para quando a aba some.
- Música marcada com antecedência de 100 ms pelo relógio do áudio (nunca por `setTimeout` sozinho).
- Um arquivo para os efeitos (`public/js/som.js`), um para a música (`public/js/musica.js`); nenhum dos dois conhece regra do jogo: só recebem "aconteceu isto".
- Nenhum nó de áudio fica vivo depois que o som acaba.

## 6. Como conferir (ninguém da equipe ouve)
- **Folha de sons** (`public/sons.html`): lista todos os efeitos e as camadas da música com botão de tocar, o desenho da onda e três medidas de cada um — duração, pico e volume médio. É onde o dono ouve e aprova.
- Teste automático: cada efeito é fabricado fora do tempo real (`OfflineAudioContext`) e medido — duração dentro de ±20% da tabela, pico dentro da faixa, nenhum silêncio, nenhum estouro, e as 3 variações diferentes entre si.
- Teste de tela: confere que cada acontecimento da luta chamou o som certo, uma vez.
- A aprovação final de som é do dono, de ouvido, pela folha de sons.
