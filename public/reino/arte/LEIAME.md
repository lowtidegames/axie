# Arte do piloto (Keepmile) — como a tela usa

Tudo aqui é gerado por `python3 -B arte/reino/atlas.py` (não editar à mão). Ver animando: abrir `galeria.html`.
`atlas.json` = `atlas.js` (o mesmo conteúdo em `window.KEEPMILE_ATLAS`, para abrir sem servidor).

## Regras de desenho
- Unidade = pixel de arte. Ampliar só por número inteiro, com `imageSmoothingEnabled = false` / `image-rendering: pixelated`.
- Retângulo é sempre `[x, y, largura, altura]` dentro da folha `folhas[nome].arquivo`.
- Colar a peça com o pé em (X, Y): `drawImage(folha, quadro, X - ancora[0], Y - ancora[1])`. Espelhada: `X - (largura - 1 - ancora[0])`.

## `pecas[id]` (id = id da carta ou do invasor na bíblia: `T01`, `B04`, `M06`, `muncher`, `gutbucket`…)
- `folha`, `tamanho` (célula), `ancora` (ponto do pé), `quadros` (lista de retângulos), `cor` (hex da família), `familia`, `tipo`.
- `variantes`: listas de quadros com os MESMOS índices (rosto, pele e altura diferentes). Sortear uma por soldado.
- `animacoes[nome] = {quadros: [índices], ms: [duração de cada], loop, impacto?}`. `impacto` = posição em `quadros` onde o golpe acerta (pausa, faísca, som).
- Tropas e invasores: `idle`, `walk`, `attack`, `hit`, `fall`. `olha`: `direita` (aliado) ou `esquerda` (invasor).
  Espelhar quando o `sentido` do terreno pedir: o invasor anda no `sentido` (+1 = para a direita) e o aliado olha contra.
- `T10` (Squib Runner): `attack` termina num quadro vazio; tocar `explosion` por cima (`efeito`).
- Construções: `n1`, `n3`, `n5` (4 quadros vivos cada); `niveis` diz qual usar em cada nível 1–5.
- `castle`: `estados` por vidas (3 inteiro, 2 rachado, 1 muito rachado). `plot-empty`: `plot1`…`plot6`. `plot-flag`: uma animação por família.
- Magias na estrada: `M01` (`idle`, depois `explosion`), `M06` (`grow` → `hold` → `wither`).
- Efeitos (`tipo: efeito`): `dust`, `spark`, `slash`, `arrow`, `spud`, `heal`, `coin`, `level-stars`, `level-ring`, `rarity-shine`, `smoke`, `confetti`, `shadow`, `explosion`. Animação `play`.
  `shadow` tem 4 tamanhos (soldado, bruto, prédio, chefe): desenhar embaixo da peça com o `alfa` da hora.

## Cartas, ícones, fontes
- `cartas.piloto[id].quadro`: carta 56×78 pronta, sem pinos acesos e sem número. A tela põe `icones.quadros['pin-on']` em `cartas.pinos[0..nível-1]` e o texto de força centrado em `cartas.texto_forca`.
- `cartas.molduras[raridade]` (vazias) e `cartas.costas`. Faixa = família, moldura = raridade, selo = tipo.
- `icones.quadros[nome]`: `life`, `life-empty`, `gold`, `round`, `speed`, `sound-on`, `sound-off`, `loot`, `boss`, `shield`, `horn`, `reroll`…
- `interface.pecas`: `button-*` (`solto`, `apertado`, `conteudo` = centro do ícone), `panel` (9 fatias, `borda`), `loot` (Card, Promotion, Purse), `level-up` (4 quadros), `label-*`.
- `fontes[nome].glifos[letra]`: avançar `largura + espaco`. `reino` e `mini` são brancas (pintar por cima); `reino-contorno` (dano), `reino-ouro` (crítico), `mini-contorno` já vêm com contorno. Só maiúsculas, números e sinais.

## Cenários
- `cenarios[pc|celular]`: `referencia` (tela lógica: PC 480×270, celular 180×370), `terrenos` (centro `x`, `base_predio`, faixa `estrada` em y, `sentido`), `portao`, `castelo`, `escadas`, `mesa_y`.
- `horas[morning|afternoon|boss-night]`: `planos` na ordem de desenho (`quadro`, `x`, `y`, `paralaxe`, `repete_x`), `nuvens`, e `luz` para as peças: multiplicar por `ambiente`, filete de 1 px na cor `filete`, `sombra` e `vinheta`.
- `cenarios.rodadas`: qual hora em cada rodada do ciclo de 5. PC: usar a maior ampliação inteira em que caibam 480×270; os planos têm 640 e repetem.
