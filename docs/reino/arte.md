# Jogo de reino — direção de arte e de fotografia (versão 1, 19/11/2026)

Provas em `arte/reino/prova/`. Tudo aqui é PROVISÓRIO até o diretor fechar; nomes de cartas vêm da bíblia do jogo. Arte 100% própria: peças geradas pela conta do estúdio e tratadas por código, o resto desenhado por código. Trindade do quadro-chave: `D 84 · Cg 88 · Ch 90`.

## 1. A frase e os 5 princípios
**"Parece um livro de histórias vivo: um reino de brinquedo, dourado pelo sol, com dezenas de bonequinhos cabeçudos brigando na estrada."**

| # | Princípio | Na prática |
|---|---|---|
| 1 | Ler em 1 segundo | Reino = azul, aço e pele clara. Invasor = roxo com olho lima. Os dois exércitos viram duas manchas de cor que se chocam. |
| 2 | Um boneco-base | Todo soldado nasce do MESMO boneco (cabeça grande, 26 px). Só mudam chapéu, arma e cor. É o que dá cara de jogo único. |
| 3 | A luz conta a hora | Manhã, tarde e noite mudam céu, cor do chão, sombra e filete de luz. O jogador sente o chefe chegando sem ler nada. |
| 4 | Pixel inteiro | Uma grade só. Ampliação sempre inteira, nunca suavizada. Luz e vinheta em degraus, nunca degradê liso. |
| 5 | Festa com peso | Todo golpe tem antecipação, pausa e poeira. Humor nas caras (olho fechado, boca aberta), nunca em texto. |

## 2. Cor, contorno, luz e sombra
| Uso | Cores (claro · meio · escuro) |
|---|---|
| Contorno e sombra (ameixa) | `#2B1E3A` — nunca preto puro |
| Texto claro (creme) / ouro | `#FFF6E0` · `#FFD248` |
| Grama | `#7CC950` · `#56A842` · `#3A803C` · `#285C3A` |
| Estrada | `#E8C48A` · `#CDA068` · `#A0724C` · `#704C3E` |
| Pedra | `#CECAD8` · `#9E98B4` · `#6E668E` · `#483E64` |
| Madeira | `#C48C54` · `#96623C` · `#684030` |
| Reino (aliado) | azul `#4884E8`, aço `#B0BAD2`, pele `#F2C29A` |
| Invasor | roxo `#9248C8`, olho lima `#B6F03C` (roxo e lima são PROIBIDOS no reino) |
| Painel da interface | `#3A2A4E` com filete `#624C7C` |

| Regra | Decisão |
|---|---|
| Contorno | Boneco: 1 px ameixa por fora, sempre. Cenário e prédio: 1 px da própria cor escurecida (fica atrás do boneco no olho). |
| Tons | No máximo 3 tons por material (4 no chão). Nada de detalhe menor que 2 px. |
| Luz | Vem de cima e da esquerda (da direita à noite, da lua). Filete de luz de 1 px na borda do boneco, na cor da hora. |
| Sombra | Elipse ameixa no chão, feita pelo código (nunca na peça). Curta de manhã, comprida à tarde. |
| Brilhos | Janela, olho do invasor, cristal e raio não escurecem à noite e acendem o chão em volta. |
| 4 famílias | Cor da FAIXA do nome e da bandeira do terreno: carmim `#CC3C3E`, folha `#469C48`, anil `#3E6ED6`, laranja `#E87E2E`. Sempre com ícone junto. |
| Tipo da carta | SELO redondo com ícone: espada (Tropa), martelo (Construção), estrela (Magia). |
| Raridade | MATERIAL da moldura, não cor: madeira (comum), bronze (incomum), prata (rara), ouro com brilho (lendária). |
| Aliado × invasor | Cor (acima) + lado para onde olha (aliado →, invasor ←) + ícone na barra de força (escudo × chifre). |

## 3. Tamanhos e grade
| Peça | Tamanho (px de arte) | Nota |
|---|---|---|
| Tela do celular | 180×370, ampliada ×2 = 360×740 | ×2 também em 390 e 412; ×3 em tablet; sobra vira céu e chão |
| Tela do PC | 640×360, ×2 = 1280×720 | ×3 em 1920×1080 |
| Soldado | quadro 32×32, corpo 26–28 de altura | cabe 70+ na tela do PC e 40+ no celular, e ainda tem cara |
| Herói / mago | quadro 40×40, corpo 32 | |
| Bruto | 48×48, corpo 43 | tem barra de vida |
| Chefe | 80×80, corpo 72 | 2,7 soldados de altura |
| Construção no terreno | 48×48 (desenho 44–48) | pás, fumaça e bandeira são do código |
| Portão / castelo | 64×64 / 96×96 | castelo tem 3 estados (inteiro, rachado, muito rachado) |
| Terreno | 56 de largura no celular, 80 no PC | bandeira da família + 3 pinos de nível |
| Carta | 56×78 | faixa do nome 12 · ilustração 46×36 · selo 11 · força · 3 pinos de nível |
| Ícones | 5×5 a 7×7 com contorno | coração, moeda, caveira, escudo, chifre |
| Botão / toque | 22×22 no mínimo (= 44 px de tela) | |
| Fonte | "Reino 5×7", desenhada por código (`arte/reino/fonte.py`), com acentos | nome de carta até 9 letras. Texto longo fora da cena: Nunito (OFL, já em `public/fontes/`) |

## 4. Fotografia
| Assunto | Celular (em pé) | PC |
|---|---|---|
| Estrada | Sobe o MORRO DO CASTELO em 3 patamares de 2 terrenos (zigue-zague com escadas) | Reta, 6 terrenos em fila, com 40 px de fundo (6 fileiras) |
| Portão / castelo | Portão embaixo à esquerda, castelo no alto à direita (a diagonal guia o olho) | Portão à esquerda, castelo à direita |
| Mão de 3 cartas | Mesa embaixo (100 px), carta escolhida sobe 9 px com aura de ouro | Embaixo, no centro; espólio da rodada no canto direito |
| HUD | Em cima: vidas, ouro, pinos até o chefe, rodada, barra de força, acelerar | Igual |

| Recurso | Regra |
|---|---|
| Câmera | Parada ao escolher carta. Na batalha: zoom só em passo inteiro (×2 → ×3) no ponto do choque; travelling de até 24 px/s seguindo a frente; volta suave no fim. |
| Pausa de impacto | 60 ms no golpe forte, 120 ms no golpe do chefe. Câmera lenta (metade da velocidade, 600 ms) no último soldado de pé. |
| Profundidade | 3 planos de paralaxe: montanhas (anda 10%), árvores (30%), moitas escuras da frente (130%). O longe é puxado para a cor da névoa. |
| Hora do dia | Segue o ciclo de 5 rodadas: 1–2 manhã, 3–4 tarde dourada, 5 (chefe) noite. A virada dura 2 s entre rodadas. |
| Clima | Nuvens andando sempre; névoa baixa de manhã; vaga-lumes à noite; chuva só como efeito de carta. |
| Gradação | Calmo: cores cheias, vinheta 14%. Batalha: saturação +10%, vinheta 20%. Chefe: ambiente azul-noite, luz carmim em volta dele, vinheta 30%. Vitória: clarão quente de 300 ms e confete. Derrota: dessatura 40% em 600 ms. |
| Vinheta e brilho | Vinheta ameixa em degraus pontilhados. Brilho só em: sol/lua, janelas, magia, olho do invasor, carta lendária. |

## 5. Animação
Método provado em `prova/soldado-andar-bater.png`: **4 poses-chave geradas por boneco (parado, passo, golpe, apanhou) e o resto por código.**

| Ação | Quadros | Como |
|---|---|---|
| Parado | 2 (respira 1 px, 500 ms) | código |
| Andar | 4 × 110 ms | passo gerado → sobe 1 px → passo inclinado → amassa 1 px |
| Bater | 6 | parado → antecipa 120 ms (recua 3 px e amassa) → golpe gerado + rastro branco → segura 60 ms + faísca → volta → parado |
| Apanhar | 2 | pose gerada em branco por 50 ms → recua 3 px |
| Cair | 4 | tomba (inclina) → gira 90° → some em pontilhado (2 quadros) + poeira |
| Chefe | iguais, com tempos ×1,5 | o golpe treme a tela |
| Construção | pás 8 posições, fumaça, bandeira 3 quadros | tudo por código |

| Regra | Limite |
|---|---|
| Partículas | 60 na tela (40 no celular); poeira, faísca, flecha, lasca, confete |
| Tremida | até 3 px golpe forte, 6 px chefe, no máximo 120 ms |
| Flash | no máximo 3 por segundo; nunca a tela inteira branca |
| "Menos animação" | sem tremida, sem flash, sem câmera (zoom e travelling), sem câmera lenta; 20 partículas; trocas por esmaecer; dano continua aparecendo em número |

## 6. Interface
| Peça | Regra |
|---|---|
| Carta | Moldura = raridade; faixa = família; selo = tipo; pinos = nível. Etiqueta "FALTA 1" em cima da carta que sobe de nível. |
| Botão | 22×22 px de arte ou mais, 3 tons, afunda 2 px ao tocar. Verde = seguir, carmim = perigo, ameixa = neutro. |
| Número de dano | Creme com contorno ameixa; crítico em ouro com "!"; sobe 10 px e some em 500 ms. No máximo 8 ao mesmo tempo. |
| Barras | Barra de força no topo (azul × roxo, com as contagens). Vida só em bruto e chefe; soldado comum não tem barra. |
| Festa de nível | Prédio pula 4 px, anel de ouro, pino acende, 12 confetes, som; 600 ms. |
| Tela de fim | Castelo ao centro na hora em que acabou, rodadas em número grande, recorde, botão "JOGAR DE NOVO" de 120×26. |
| Contraste | Texto creme sobre painel ameixa (acima de 10:1); texto solto na cena sempre com contorno. Nenhuma informação só por cor. |

## 7. Lista de produção
| Peça | Tamanho | Quantos | Como | Prioridade |
|---|---|---|---|---|
| Soldados aliados (4 poses cada) | 32×32 | 6 tipos | gerador (base + edições) | 1 |
| Invasores (4 poses cada) | 32×32 e 48×48 | 4 tipos | gerador (edições do base) | 1 |
| Chefes (parado, golpe) | 80×80 | 3 | gerador | 1 (1 no piloto) |
| Construções | 48×48 | 8 | gerador + enfeites de nível por código | 1 |
| Castelo (3 estados) e portão | 96×96, 64×64 | 4 | gerador (edição para rachar) | 1 |
| Planos de fundo | 320×96 | 2 por tema | gerador, cor por código | 2 |
| Céu, sol, lua, nuvens, estrelas | — | — | código | 1 |
| Chão, muro, escada, estrada | — | — | código | 1 |
| Cartas (moldura, faixa, selo, pinos) | 56×78 | 4 molduras | código | 1 |
| Ilustração de magia | 46×36 | 6 | código (raio) e gerador | 2 |
| Ícones, botões, barras, painéis | 5–22 | ~25 | código | 1 |
| Fonte Reino 5×7 | — | 1 | código | 1 |
| Partículas, luz, sombra, vinheta | — | — | código | 1 |
| Enfeites de reino (loja) | 48×48 | depois | gerador | 3 |

### Plano de gerações do piloto (10 cartas, 1 chefe)
Já gastas nesta tarefa: **25** (registro em `arte/reino/registro.csv`). Faltam **22 + 6 de reserva = 28**. Piloto inteiro: **53**. Só ferramentas de 1 geração: `create-image-pixflux` (peça nova) e `edit-image-pixen` (pose e variação).

| Peça | Ger. | Pedido (inglês) |
|---|---|---|
| Boneco-base (FEITO) | 1 | "pixel art game sprite, side view, facing right, full body, chunky chibi proportions with big head, bright saturated storybook colors, single dark plum outline, 3-tone cel shading, light from top-left, transparent background, tiny medieval spearman soldier, round steel kettle helmet, blue tunic, long wooden spear held upright, small round wooden shield" |
| Variação de tropa (FEITO: arqueiro, cavaleiro) | 1 cada | edit do base: "same chibi character with the same proportions and outline, but now an archer: green pointed hood instead of the helmet, brown leather vest, holding a wooden longbow, quiver on the back, no spear, no shield" |
| Pose passo | 1 cada (faltam 4) | edit: "same soldier, same colors and size, walking to the right, mid-stride with legs wide apart, one foot forward and one foot back" |
| Pose golpe | 1 cada (faltam 4) | edit: "same soldier, same colors and size, lunging forward in an attack, weapon thrust forward at full stretch, front leg bent" |
| Pose apanhou | 1 cada (faltam 4) | edit: "same soldier, same colors and size, hit and knocked backwards, leaning back, eyes shut tight, mouth open" |
| Invasor (FEITO) e invasor atirador | 1 + 3 | edit do base: "same chibi proportions and outline, but now a mischievous imp raider facing left: dark violet skin, glowing lime-green eyes, two small curved horns, ragged black loincloth, jagged bone club, toothy grin" |
| Bruto e chefe: golpe | 2 | edit: "same ogre, same colors and size, swinging the weapon down hard to the left, leaning forward, mouth wide open" |
| Castelo rachado (2 estados) | 2 | edit: "same castle, same colors, large cracks across the walls, one tower roof broken, a few fallen stones at the base" |
| Construções novas (2) | 2 | "pixel art game building sprite, side view, front facade, flat ground line at the bottom, bright saturated storybook colors, 3-tone cel shading, light from top-left, transparent background, no text, no symbols, plain solid-color pennants, small medieval [stable / tavern]" |
| Ilustrações de magia (2) | 2 | "pixel art card illustration, 48x36, [a rain of arrows / a healing fountain], storybook colors, no text, no border" |

## 8. Riscos honestos e como contornar
| Risco | O que acontece | Contorno |
|---|---|---|
| Consistência entre peças | Pedido novo de texto sai em outro traço (o 1º arqueiro e o 1º cavaleiro vieram finos e virados para o lado errado) | Nunca pedir boneco do zero: sempre `edit-image-pixen` sobre o boneco-base. Contorno, lado e alfa refeitos por código (`pecas.py`). |
| Linha fina | Lança, arco e corda saem de 1 px e quebram ao espelhar ou inclinar | Arma com 2 px no pedido; rastro e flecha são do código. |
| Animação | O gerador não entrega ciclo de andar coerente em ferramenta de 1 geração | 4 poses-chave + código (subir, amassar, inclinar, girar, pontilhar). É estilo "recorte", não desenho quadro a quadro: honesto, mas menos fluido. |
| Prédios em outro ângulo | Vêm em 3/4 de cima, com base de grama própria | Aceito como estilo (chão também é 3/4); pedir "front facade" e base alinhada por código. |
| Cor errada | Portão e torre vieram roxos (cor do invasor); o invasor veio escuro demais | Troca de matiz e clareamento por código; "roxo só no invasor" vira checagem do tratamento. |
| Sombra e chão assados | Algumas peças trazem sombra cinza no pé | Apagada por código; sombra é sempre do motor. |
| Multidão embolada | Com 40+ bonecos no mesmo trecho a leitura cai (pior no patamar de baixo do celular) | No máximo 14 por terreno na tela; acima disso, vira "pelotão" com número. Fileiras de fundo com 2 px de diferença. |
| Símbolos reais | Escudo veio com cruz; bandeiras tendem a brasões | Pedir "plain, without any symbol"; conferir peça a peça. |
| Texto pequeno | 5×7 com 9 letras enche a carta | Nomes curtos; texto de regra fica fora da cena, em Nunito. |

**Falta para 9,5:** ciclo de andar de verdade (6 quadros desenhados), prédios refeitos em vista de frente no mesmo traço do boneco, poses do bruto e do chefe, variação de rosto entre soldados iguais, árvores e pedras de primeiro plano geradas, e a cena testada em movimento (a prova é parada).
