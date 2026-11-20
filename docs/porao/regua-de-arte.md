# Porão — régua de arte

_Diretor de arte, 20/11/2026 07:32 BRT · tarefa A1 do lote de arte (decisions.md, 20/11 07:07). É PROPOSTA: o estilo final é do dono, que vê as fotos antes de qualquer peça entrar no jogo._

Tudo que for gerado para o Porão segue esta página. Arquivos da régua em `arte/porao/regua/`: `sala.png` (âncora), `pecas/`, `paleta.png` + `paleta.json`, `referencia-escala.png`, `gerar.py`, `montar.py`, `medir.py`, `prancha.py`, `registro.json`.

## 1. Medidas (a grade é a do jogo; nada muda em `cena.js`)
| O quê | Valor | De onde vem |
|---|---|---|
| Grade | isométrica 2:1 | `porao/tela/cena.js:19` |
| Losango do chão | 32 × 16 px | `sprites.js:104` · a sala do PixelLab mede 10 px de subida a cada 20 px (2:1 exato) |
| Sala do jogo | 8 × 8 losangos, tela 272 × 196 | `cena.js:16-18` |
| Sala-âncora (PixelLab) | 7 × 6 losangos, 248 × 176 | `arte/porao/regua/sala.png` |
| Parede alta | 48 px | `sprites.js:97` (a da âncora mede 47) |
| **Rugrigo sentado (com a cadeira)** | **46 px de altura**, 34 de largura | `pecas/rugrigo_sentado.png` (quadro 36 × 48) |
| Gente em pé (trouxa) | 40 px de altura (±2), 20 de largura | `pecas/trouxa_1.png` (39 px) |
| Monitor em cima da mesa | 14 × 14 px | medido na sala |
| Zoom | só inteiro (2x, 3x, 4x), vizinho mais próximo | `cena.js:227` |

Âncora de cada sprite = centro da base no chão (como no catálogo). Para móvel de caixa: `ax = W/2`, `ay = H − 3 − (largura+fundo em losangos) × 4`. Gente: `ax = W/2`, `ay = H − 2`.

## 2. Paleta (32 cores, `paleta.json`)
| Grupo | Cores |
|---|---|
| Contorno | `#1d1622` |
| Madeira (5) | `#3b2216` `#5d371c` `#86522a` `#b5763f` `#f5a55f` |
| Tijolo (3) | `#4a1f16` `#7a2f22` `#a5452e` |
| Pedra e metal (3) | `#3a383c` `#6a6660` `#9a958c` |
| Pano escuro (2) | `#2a2630` `#4a4458` |
| Pele (2) | `#d98a6e` `#facdad` |
| Vermelho do moletom (3) | `#6a0227` `#d6082d` `#ff6b5e` |
| Azul e água (4) | `#283a6a` `#3b8fd9` `#39b4e4` `#8fd0ff` |
| Verde (3) | `#185b05` `#55a10d` `#5be08a` |
| Laranja e ouro (2) | `#e7723c` `#ffd84a` |
| Roxo e neon (3) | `#594a86` `#a65ae6` `#ff5fa2` |
| Claro (1) | `#f3ead6` |

- Toda peça é trocada para esta paleta POR CÓDIGO (cor mais próxima, sem pontilhado): `montar.py`, função `na_paleta`.
- **Raridade fica fora da paleta de propósito.** As 6 cores (`--rar-*` em `monitores.js:13-14`: comum `#e8d9b5`, incomum `#7bd88f`, raro `#5bb8ff`, épico `#c58bff`, lendário `#ffc857`, mítico `#ff8fb5`) só aparecem em moldura de carta, selo e barra de raridade. Nenhum móvel, roupa ou botão usa essas seis.

## 3. Contorno, luz e sombra
- **Contorno:** 1 px `#1d1622`, fechado em volta de toda a silhueta, garantido por código (`montar.py`, `contornar`): borda que já veio escura é recolorida; borda clara ganha 1 px por fora. No piloto (peças de 96 px) somava-se 1 px; nesta escala 1 px já vira 3–4 px na tela e 2 px comeria o boneco.
- **Alfa duro:** só 0 ou 255. Margem de 1 px transparente em volta.
- **Luz:** de cima. Face de cima = tom claro, face da esquerda = tom médio, face da direita = tom escuro (igual ao `caixa()` do `sprites.js`). Não espelhar móvel de caixa (troca o lado escuro); gente pode ser espelhada.
- **Sombra no chão: nenhuma no arquivo.** Sombra é do código da tela. Peça que vier com sombra pintada: apagar por código ou descartar.
- **Cor:** a sala vem apagada do serviço; sobe saturação ×1,3 e claridade ×1,15 por código antes da paleta (`avivar`).

## 4. Prompt-base fixo (PixelLab)
```
isometric pixel art game asset, 2:1 dimetric angle, 32x16 pixel floor tiles, dark plum outline around every shape, bold saturated colors, 3-tone cel shading, light from the top left, crisp clean pixels, no cast shadow on the ground, transparent background, original design, no text, no logos, no letters, exactly the same scale as the reference
```
O pedido é sempre `<o que é a peça>, ` + o texto acima. Evitar "empty" e "no person" (o pedido com essas palavras devolveu só chão; não ficou provado que foram elas). Nada de nome, marca ou personagem conhecido no texto.

**Três receitas (cada chamada = 1 geração):**
| Receita | Ferramenta | Imagem de referência | Para quê | Prova |
|---|---|---|---|---|
| R1 "dentro da sala" | `map-objects` com `background_image` + `inpainting` de máscara | `arte/porao/regua/referencia-escala.png` (recorte CRU 96 × 96 da sala) | peça nova (móvel, luxo, gente) | 4 de 5 no tamanho da máscara |
| R2 "redesenhar menor" | `edit-image-pixen` com `width`/`height` | a peça grande já aprovada | trazer peça do piloto para a escala | 3 de 3 |
| R3 "mesma peça, outra pose" | `edit-image-pixen` no mesmo tamanho | a peça já aceita em `pecas/` | poses, variações de roupa, raridades | lição de 19/11 (3 de 3) |

- R1: a peça nasce do tamanho da máscara. **Máscara = tamanho pedido + 4 px de cada lado**, centrada em x = 48, com a base em y = 78 da referência. Peça maior que 88 px: recorte cru de 128 × 128 a partir de (56, 48) da sala (`gerar.py dentro <nome> <n> 56 48 128 128 ...`).
- R1 só está provada com o recorte CRU de 96 × 96 (`bruto/sala-image_url.png`). Com um fundo tratado na paleta, de 128 × 128 e com o Rugrigo à vista, o serviço devolveu só um pedaço de chão, 2 de 2 (`bruto/cadeira_gamer-1.png` e `-2.png`). Qual das três diferenças causou não foi isolado: o teto acabou. Ficar na receita provada.
- R3: escrever "exactly the same head size, body size and chair, only <o que muda> changes". Lados múltiplos de 4.
- Depois de qualquer receita: tratar por código (alfa duro → paleta → contorno → corte) e passar no `python3 -I arte/porao/regua/medir.py <arquivo>`. Conferir a contagem de pixels de cada pose contra a base (diferença acima de 10% = boneco pulsa).

## 5. Lista de pedidos para o artista-pixel
Tamanho = quadro final do PNG, já com 1 px de margem. "Hoje" = tamanho no catálogo (`sprites.js`). Onde o tamanho muda, o dev da tela acerta o catálogo (seção 6).

### A2 — objetos e gente (teto 70; previsto 64)
| Sprite | Tamanho (hoje) | Âncora | Receita | Pedido (antes do prompt-base) | Ger. |
|---|---|---|---|---|---|
| `rugrigo_a` | 36×48 (22×36) | 18,46 | R3 sobre `rugrigo_costas` | sitting on the black office chair seen from behind in three-quarter view, body turned to the top-right, both hands forward on a keyboard | 2 |
| `rugrigo_b` | 36×48 (22×36) | 18,46 | R3 sobre `rugrigo_a` | exactly the same, only the hands change: one hand raised over the keyboard | 2 |
| `rugrigo_rindo` (novo) | 36×48 | 18,46 | R3 sobre `rugrigo_sentado` | exactly the same, only the face and arms change: laughing with the mouth wide open, head tilted back, one fist in the air | 2 |
| `rugrigo_batida` (novo) | 36×48 | 18,46 | R3 sobre `rugrigo_a` | exactly the same, only the head changes: looking back over his shoulder at the camera, wide scared eyes, sweat drop | 3 |
| `mesa` (com os 3 monitores) | 70×60 (70×52) | 35,41 | R1 | one long straight wooden computer desk along a wall, three flat computer monitors side by side facing the bottom-left, lit screens (green chart, blue chat bubbles, colorful game), keyboard, mouse, dark PC tower with purple lights under the desk | 3 |
| `cadeira` (vazia) | 35×41 (igual) | 18,30 | R1 | a plain black office chair with a star base and wheels, facing the top-right | 2 |
| `escada` | 58×54 (igual) | 29,38 | R1 | a short wooden staircase with a handrail going up to the top-left | 2 |
| `sofa` | 58×52 (igual) | 29,36 | R1 | an old worn brown fabric sofa with two cushions and a crocheted blanket | 2 |
| `cadeira_gamer` | 38×52 (igual) | 19,41 | R1 | a luxurious gaming chair, tall padded backrest, black leather with crimson red stripes, chrome star base with wheels, facing the top-right | 2 |
| `aquario` | 58×58 (igual) | 29,42 | pronto: `pecas/aquario.png` (54×61), só centrar no quadro | — | 0 |
| `ar_condicionado` | 30×26 (22×26) | 3,3 | R1 | a white split air conditioner unit mounted flat on a brick wall on the right, small green light, three thin cold air lines | 2 |
| `letreiro_neon` | 40×32 (22×26) | 37,3 | R1 | a glowing pink and cyan neon sign shaped like a rocket and a rising arrow, mounted flat on a brick wall on the left, no letters | 2 |
| `maquina_bebida` | 38×58 (igual) | 19,47 | R1 | a tall energy drink vending machine, glass front with rows of colorful cans, glowing blue panel, plain colored stripes, no brand | 2 |
| `tela_curva` | 34×36 (23×35) | 17,29 | R1 | one wide curved gaming monitor on a thin stand, facing the bottom-left, lit screen with a green rising chart | 2 |
| `garagem` | 96×84 (96×69) | 48,59 | R1 com recorte de 128 | a low wide yellow sports car parked on a grey garage floor mat with yellow stripes, seen from the front-left, no brand, no badge, original shape | 4 |
| `trouxa_1` | 22×42 (14×22) | 11,40 | pronto: `pecas/trouxa_1.png` | — | 0 |
| `trouxa_2` | 22×42 (14×22) | 11,40 | R3 sobre `trouxa_1` | exactly the same body and head size, only these change: orange cap, yellow hoodie, holding a paper bill | 2 |
| `trouxa_3` | 22×42 (14×22) | 11,40 | R3 sobre `trouxa_1` | exactly the same body and head size, only these change: an older woman with grey hair in a bun, green cardigan, handbag | 2 |
| `trouxa_4` (novo) | 22×42 | 11,40 | R3 sobre `trouxa_1` | exactly the same body and head size, only these change: a bald man with glasses, white shirt and tie, briefcase | 2 |
| `influ_nano_1` Biel do Grupo | 32×32 | — | pixflux 32×32, frente | portrait bust of a teenage boy with braces and a cheap headset, messy bedroom behind, excited face | 2 |
| `influ_nano_2` Dona Cripta | 32×32 | — | idem | portrait bust of a cheerful aunt with curly hair and reading glasses, flower blouse, holding a phone too close | 2 |
| `influ_nano_3` Pedrinho Carrão | 32×32 | — | idem | portrait bust of a young man with sunglasses pushed up and a bus pass on a lanyard, confident smile | 2 |
| `influ_medio_1` Tio Gema | 32×32 | — | idem | portrait bust of a middle-aged uncle with a thick mustache and an open shirt, big gem ring, wink | 2 |
| `influ_medio_2` Lucas Conversível | 32×32 | — | idem | portrait bust of a young man with slick hair taking a selfie, wind in the hair, rented look | 2 |
| `influ_medio_3` Dra. Foguete | 32×32 | — | idem | portrait bust of a woman in a white lab coat with a tiny rocket pin and round glasses, pointing up | 2 |
| `influ_mega_1` Mestre do Airdrop | 32×32 | — | idem | portrait bust of a bearded guru in a hooded robe with headphones, calm smile, small falling coins behind | 2 |
| `influ_mega_2` Baronesa Hype | 32×32 | — | idem | portrait bust of a glamorous woman with big pink hair, huge sunglasses and a fur collar, neon glow behind | 2 |
| `moldura_comum` | 48×64, fatia 10 | — | pixflux 48×64, vista de frente | an empty vertical card frame, flat front view, plain cardboard-beige border, transparent center, small dark banner at the bottom | 2 |
| `moldura_incomum` … `moldura_mitico` (5) | 48×64, fatia 10 | — | R3 sobre `moldura_comum` | exactly the same frame shape and size, only the border changes: (incomum) green painted wood · (raro) blue polished metal · (épico) purple crystal with studs · (lendário) ornate gold with small gems · (mítico) pink iridescent with tiny stars | 8 |

- Retratos e molduras NÃO são isométricos: trocar no prompt-base "isometric… floor tiles" por "pixel art portrait, flat front view" / "pixel art card frame, flat front view". Paleta, contorno e luz iguais.
- Moldura: a cor da borda é a da raridade (as 6 de fora da paleta); miolo transparente; a arte e o nome entram por trás e por cima no código.
- Sala vazia 8 × 8 (chão + 2 paredes + porta): **sem geração**, montada por código a partir de `bruto/sala-kit.png` (kit grátis da sala, 344 × 224).

### A3 — kit de interface (teto 20; previsto 20)
A interface é HTML: cada peça entra por `border-image` com `image-rendering: pixelated`, **escala fixa 2x** (1 px da arte = 2 px de tela). "Fatia" = quantos px de cada lado NÃO esticam (cima/direita/baixo/esquerda). Miolo liso, de uma cor só. Estados saem por CÓDIGO da peça normal (sem geração).

| Peça | Tamanho | Fatia | Como | Pedido | Ger. |
|---|---|---|---|---|---|
| `ui_btn_normal` | 24×24 | 6/6/8/6 | pixflux 32×32, cortar e alisar por código | a chunky rounded rectangular game button, flat front view, plum body `#4a4458`, light top edge, thick dark outline, 2 px darker lip at the bottom, empty face | 2 |
| `ui_btn_apertado` | 24×24 | 8/6/6/6 | código: tira o lábio, desce 2 px, escurece 1 tom | — | 0 |
| `ui_btn_desligado` | 24×24 | 6/6/8/6 | código: tudo em pedra (`#3a383c` `#6a6660`) | — | 0 |
| `ui_btn_destaque` | 24×24 | 6/6/8/6 | código: corpo laranja `#e7723c`, brilho ouro `#ffd84a` | — | 0 |
| `ui_aba_ligada` | 24×20 | 6/6/2/6 | pixflux 32×32 | a folder tab with rounded top corners, flat front view, cream paper color, thick dark outline, open at the bottom | 2 |
| `ui_aba_desligada` | 24×20 | 6/6/2/6 | código: pano escuro `#2a2630` `#4a4458` | — | 0 |
| `ui_janela` | 48×48 | 19/6/6/6 | pixflux 48×48 | a retro computer window frame, flat front view, thick dark outline, title bar at the top with three small square buttons on the right (cream, gold, red), empty dark plum body | 2 |
| `ui_barra_vazia` | 24×8 | 0/4/0/4 | pixflux 32×32, cortar | an empty horizontal progress bar slot, rounded ends, dark inside, thick dark outline | 2 |
| `ui_barra_cheia` | 24×8 | 0/4/0/4 | código sobre a vazia: recheio `#5be08a` com linha clara em cima; outras cores por troca de cor | — | 0 |
| `papel_grafico` | 64×64, repete | — | pixflux 64×64 | seamless tileable wallpaper pattern, dark green graph paper with faint tiny candlestick doodles, low contrast, two tones | 1 |
| `papel_comunidade` | 64×64, repete | — | pixflux 64×64 | seamless tileable wallpaper pattern, dark purple with faint tiny speech bubbles and hearts, low contrast, two tones | 1 |
| `papel_projeto` | 64×64, repete | — | pixflux 64×64 | seamless tileable wallpaper pattern, dark blue with faint tiny game controllers and stars, low contrast, two tones | 1 |
| `icone_grafico` `icone_caixa` `icone_comunidade` `icone_chat` `icone_projetos` `icone_ideias` `icone_impressora` `icone_porao` | 16×16 cada | — | pixen 16×16 | app icon, flat front view, thick dark outline: rising green chart · gold coin stack · three little heads · speech bubble · game cartridge · light bulb · office printer with a sheet · basement door with stairs | 8 |
| `ui_status` (barra de status e fichas de caixa, Calor e relógio) | 24×16 | 6/6/6/6 | pixflux 32×32 | a small rounded status plate, flat front view, dark night-blue body, thick dark outline, thin light line on top | 1 |
| `ui_dock` (barra de tarefas) | 24×24 | 4/4/4/4 | código: `ui_status` esticada, sem cantos de baixo | — | 0 |

- Cor de aplicativo (as 8 `--app-*` do `estilo.css`): o miolo da barra de título de `ui_janela` fica TRANSPARENTE; a cor vem do CSS por trás.
- Papel de parede: conferir a emenda lado a lado (2 × 2) antes de aceitar; emenda à vista = alisar a borda por código.
- Texto continua texto (decisão do dono): nenhuma peça traz letra.

## 6. Quem precisa mexer (não é da arte)
- **dev da tela, `porao/tela/sprites.js:352-357`:** `desenhar()` estica a imagem para o tamanho do catálogo. Peça com tamanho novo (coluna "hoje" diferente) exige trocar `w, h, ax, ay` do sprite; senão a arte sai amassada.
- **dev da tela, `porao/tela/cena.js:136-137`:** o Rugrigo novo já vem COM a cadeira: tirar o `add('cadeira'…)` enquanto ele está sentado. `cena.js:149`: `trouxa_4` (hoje só 1 a 3). Poses novas `rugrigo_rindo` e `rugrigo_batida` precisam entrar no catálogo e na cena.
- **dev da tela:** `mesa` nova já traz os 3 monitores; `monitor_grafico/comunidade/projeto` viram só área de clique (ou brilho de tela por cima).
- **dev da tela, `monitores.js` e `estilo.css`:** trocar `border`/`background` por `border-image` nas classes `.pm-btn`, `.pm-aba`, `.pm-jan`, `.pm-barra__trilho`, `.pm-medidor`, `.pm-mesa--*`, `.pm-dock`, `.pagina-chip`; ícone da janela hoje em 24 px de tela (1,5x de 16): passar para 32 ou 16.
- **diretor:** linha do Porão em `CREDITOS.md` (arte gerada no PixelLab pela conta do estúdio); `porao/tela/arte/indice.json` com os nomes que entrarem.

## 7. Limites conhecidos da âncora
- A sala-âncora tem escada no meio e mesa pintada junto: serve de régua, não de cenário final. O cenário final é a sala vazia do kit + peças soltas.
- Rugrigo e trouxa têm proporção um pouco diferente (cabeça da trouxa maior). Trouxas 2 a 4 saem da `trouxa_1`; se a diferença incomodar na foto, refazer a `trouxa_1` por R3 sobre o Rugrigo.
- Nesta grade o rosto do Rugrigo tem ~10 px: lê-se cabelo, bigode e moletom, não a expressão fina do piloto (91 px). Dobrar a grade (losango 64 × 32, sala a 25 gerações) daria o detalhe do piloto, mas muda `cena.js` e o celular: decisão do dono, não tomada aqui.
