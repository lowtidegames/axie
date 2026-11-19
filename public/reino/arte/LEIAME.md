# Arte do Keepmile (completa, R11) — como a tela usa

Tudo aqui é gerado por `python3 -B arte/reino/atlas.py` (não editar à mão). Ver animando: abrir `galeria.html`.
`atlas.json` = `atlas.js` (o mesmo conteúdo em `window.KEEPMILE_ATLAS`). **O formato é o da R9**: nenhum campo saiu e nenhum
retângulo antigo mudou de lugar (o script confere contra `arte/reino/atlas-r9.json` e falha se mudar). O que é novo está no fim.

## Regras de desenho
- Unidade = pixel de arte. Ampliar só por número inteiro, com `imageSmoothingEnabled = false` / `image-rendering: pixelated`.
- Retângulo é sempre `[x, y, largura, altura]` dentro da folha `folhas[nome].arquivo`. Cada peça diz a sua `folha`.
- Colar a peça com o pé em (X, Y): `drawImage(folha, quadro, X - ancora[0], Y - ancora[1])`. Espelhada: `X - (largura - 1 - ancora[0])`.

## `pecas[id]` (75 peças)
- Campos: `folha`, `tamanho`, `ancora`, `quadros`, `variantes` (mesmos índices; sortear uma por soldado: rosto, pele e tom da roupa), `cor`, `familia`, `tipo`, `animacoes[nome] = {quadros, ms, loop, impacto?, efeito?}`.
- Tropas `T01`…`T12` e invasores: `idle`, `walk` (6 quadros, as duas pernas), `attack`, `hit`, `fall`. `olha`: `direita` (aliado) ou `esquerda` (invasor).
- Invasores: `muncher`, `stilt-runner`, `spud-slinger`, `potlid-brute`, `bloater`, `mole-raider`, `drum-bully`, `quack`. Chefes: `gutbucket`, `niptuck`, `moleworth`, `gobble`.
  `ids.invasores` / `ids.chefes` traduzem o id de `shared/reino/config.js` para o id da peça.
- `niptuck`: `variantes[0]` = Nip (tesoura), `variantes[1]` = Tuck (agulha). `mole-raider` e `moleworth` têm `dig` e `emerge`. `gobble` tem `call`.
- Construções `B01`…`B10`: `n1`, `n3`, `n5` (4 quadros vivos cada); `niveis` diz qual usar em cada nível. O nível 5 é maior (puxadinho, cumeeira de ouro).
- Magias na estrada: `M01` (`idle` → `explosion`), `M02` (`idle`, desenhar ATRÁS dos bonecos), `M03` (`idle`, `swarm`), `M04` (`idle`, `blow`),
  `M05` (`idle`, `serve`), `M06` (`grow` → `hold` → `wither`), `M07` (`idle`, `open`), `M08` (`idle`, `launch` → `fireworks`).
- `castle` (`estados` por vidas), `gate`, `plot-empty` (`plot1`…`plot6`), `plot-flag` (uma animação por família; Fizzwick agora é fúcsia).
- Efeitos antigos (`play`): `dust`, `spark`, `slash`, `arrow`, `spud`, `heal`, `coin`, `level-stars`, `level-ring`, `rarity-shine`, `smoke`, `confetti`, `shadow`, `explosion`.
- Efeitos novos: `fireworks`, `bunting` (varal de bandeirolas, repete a cada 64 px), `bird`, `firefly`, `dust-mote`, `step-dust`, `bolt` (raio do Sparkwright),
  `pie` (`play`, `splat`), `falcon`, `big-bolt`, `gas-burst` (Bloater), `drum-wave`, `quack-heal`, `rally-notes`, `card-glow` (aura atrás da carta, branca: pintar na cor da raridade).
- `shadow`: 4 tamanhos (soldado, bruto, prédio, chefe); desenhar embaixo de CADA boneco com o `alfa` da hora.

## Cartas, ícones, fontes
- `cartas.piloto[id]`: as 10 da R9, no mesmo lugar. **`cartas.todas[id]`: as 30** (`nome`, `tipo`, `familia`, `raridade`, `texto`, `folha`, `quadro`, `peca`, `ilustracao`).
  Nome, raridade e texto vêm de `shared/reino/config.js`. Carta 56×78 sem pinos acesos e sem número: a tela põe `icones.quadros['pin-on']` em `cartas.pinos` e a força em `cartas.texto_forca`.
- `cartas.molduras[raridade]`, `cartas.costas`. `icones.quadros[nome]`, `interface.pecas` (botões, painel de 9 fatias, `loot`, `level-up`, `label-*`): iguais à R9.
- `fontes[nome].glifos[letra]`: avançar `largura + espaco`. Novas: `dano-g`, `dano-g-ouro` (números grandes), `mini-ouro`, `reino-verde` (cura).
  `dano.pequeno|medio|grande` diz qual fonte usar em `normal`, `critico` e `cura`.

## Novo na folha `extras`
- `logo.small|medium|large` (`quadro` + `brilho.quadros`, 6 quadros de reflexo). `icone_do_jogo`: `favicon-32.png` e `icone-180.png` (arquivos soltos).
- `conquistas`: `molduras` (`locked`, `unlocked`, `gold`), `icones[id]` (colar em `icone_em`), `prontas[id]` (já na moldura de ouro), `nomes`.
- `reliquias.quadros[id]` (ids do config), `ligas.emblemas[id]` (`nome`, `quadro`, `ordem`).
- `fim.faixa_recorde` (4 quadros), `fim.pergaminho` (`quadro`, `area_texto`), `fim.selo_chefe` (4 quadros).

## Cenários
- `cenarios[pc|celular]`: `referencia` (PC 480×270, celular 180×370), `terrenos`, `portao`, `castelo`, `escadas`, `mesa_y` — iguais à R9.
- `horas[morning|afternoon|boss-night]`: `planos` na ordem de desenho (`quadro`, `x`, `y`, `paralaxe`, `repete_x`), `nuvens`, `luz`.
  Planos novos, no fim da lista: PC `verge` (beira da estrada: cerca, pedras, flores; 1,15) e celular `front` (pé do morro; 1,15). O `front` do PC continua 1,3.
  Desenhar os bonecos depois do `ground` e antes de `front` (e de `verge`, no PC, se quiser a cerca na frente).
- `cenarios.vida[hora]`: quais efeitos de ambiente usar em cada hora (pássaros de dia, vaga-lumes à noite, poeira à tarde).
