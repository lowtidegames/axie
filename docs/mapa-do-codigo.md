# Mapa do código

Onde fica cada parte. Atualizar no mesmo commit quando algo mudar de lugar.

## Keepmile (jogo atual)
Jogo de reino: cartas postas em 6 terrenos, batalha automática sem dado, partidas curtas. Servidor decide; a tela só mostra.

### Tela — `public/reino/`
- `index.html` · só o canvas `#cena`, `#toques` e a caixa `#tela`; carrega `js/app.js` · `reino.css` · estilo · `modo.json` · `{"modo":"local"}` (o servidor responde "servidor" no lugar)
- `js/app.js` · o jogo (modo local e servidor): monta o modelo `M`, manda comandos, `novaPartida`, `mandar`, `lutar`, `fimDaPartida`, `abrirModo`; lê `?teste ?nova ?semente ?rodadas`
- `js/cena.js` · canvas: planos, terrenos, bonecos, efeitos · `criarCena`, `AN`, `EST`, `CONTORNO` · `js/cenario.js` · 4 trechos da estrada · `criarCenario`, `TRECHOS`
- `js/batalha-tela.js` · reproduz os eventos que o motor já decidiu · `criarBatalha` · `js/movimento.js` · poses por código (golpe, apanhou, passo) · `golpe`, `apanhou`, `passo`, `festa`
- `js/interface.js` · HUD, mão de 3 cartas, espólios, resumo, fim, botões por cima do canvas · `criarInterface` · `js/telas.js` · menu, álbum, conquistas, melhores partidas · `criarTelas`
- `js/arte.js` · atlas primeiro, desenho por código se faltar · `carregar`, `unidade`, `predio`, `peca`, `desenhar` · `js/arte-codigo.js` · bonecos/prédios/fonte por código · `posesDe`, `contornar`, `COR`
- `js/particulas.js` · efeitos por código (fumaça, anel, rastro, névoa) · `fumaca`, `anel`, `varrida`, `graduar` · `js/textos.js` · textos em inglês · `T`, `CONQUISTAS`, `CHEFE_CONQUISTA`
- `js/guarda.js` · o que fica no aparelho · `Guarda` (get/set, partida, conquista, rodadaVencida) · `js/ligas.js` · liga do beta só local · `LIGAS`, `ligaDe`, `mediaDasMelhores`
- `js/servidor.js` · ponte com `/api/reino` (conta, seq, repetição de pedido) · `Srv`, `ErroS` · `js/fim.js` · cartão PNG para postar · `cartaoDoReino`, `compartilhar`, `linkDaEstrada`
- `js/teste.js` · ganchos de teste (só com `?teste=1`) · `ligarGanchos` · `som-reino.js` · som e música por código (WebAudio) · `Som`, `Musica` · `sons.html` · folha para ouvir cada som · `sons/` · mp3 do castelo
- `arte/` · atlas (`atlas.json` = `atlas.js`, gerado por `python3 -B arte/reino/atlas.py`; não editar), PNGs, `galeria.html` (ver animando), `LEIAME.md` · `arte-provisoria/` · peças de reserva

### Motor — `shared/reino/` (roda igual no servidor e no navegador; usa `shared/rng.js`)
- `config.js` · todos os números e textos (abaixo) · `partida.js` · `criarPartida`, `aplicar`, `opcoes`, `visao`, `resultado`, `reproduzir`, `chefeDaRodada`
- `batalha.js` · luta sem dado, passos de 0,1 s · `simularBatalha`, `montarExercito`, `familiasAtivas`, `expandirHorda`, `multChefe` · `robos.js` · jogadores do simulador · `ROBOS`, `PLANOS`, `escolher`, `jogarPartida`, `hordaDeReferencia`

### Servidor — `server/reino/` (ligado em `server/index.mjs`: `criarReino`, `rotasDoReino`, `MODO_REINO`)
- `reino.mjs` · regras: `criarReino(db, opções)` devolve `abrir, comando, desistir, verAberta, ranking, perfil, replay, trocarApelido, ultima`; limites técnicos em `PARAMS_REINO`; `MODOS`, `CONQUISTAS`, `ligaDe`, `liberadasPorRodadas`
- `rotas.mjs` · formato de cada corpo (campo estranho = 400) · `rotasDoReino` · `banco.mjs` · tabelas `reino_contas, reino_partidas, reino_pontuacao, reino_temporadas, reino_titulos` · `migracaoV5/V6/V7` (chamadas em `server/db.mjs`)
- `apelidos-barrados.mjs` · palavras proibidas no apelido · `apelidoBarrado` (usada também em `server/api.mjs`)
- Modo: `public/reino/modo.json` parado diz local; `server/index.mjs` troca por `MODO_REINO` (sessão, limites e chaves de emergência são os de `server/api.mjs`)

### Rotas `/api/reino` (todas com sessão) — arquivo `server/reino/rotas.mjs` → função de `reino.mjs`
- POST `/partida` {modo} → `abrir` · GET `/partida?modo=` → `verAberta` · POST `/partida/comando` {partida,seq,comando} → `comando` · POST `/partida/desistir` → `desistir`
- GET `/partida/ultima?modo=` → `ultima` · GET `/replay/<id>?desde=` → `replay` · GET `/ranking?cursor=&temporada=` → `ranking` · GET `/perfil` → `perfil` · POST `/apelido` {apelido} → `trocarApelido`
- Modos: ranking, treino, estrada · comandos: por, sortear, consertar, batalhar, espolio, desistir · contrato: `docs/reino/servidor.md`

### Armazenamento do aparelho (localStorage)
- `keepmile_v1` recorde, rodadas, conquistas, preferências (`guarda.js`) · `keepmile_partida_v1` partida em curso · `keepmile_partida2_v1` a outra partida · `keepmile_fim_v1` tela de fim (todas `guarda.js`)
- `keepmile_sessao_v1` token e apelido · `keepmile_fim_servidor_v1` fim guardado do servidor (`servidor.js`) · `reino_som` volumes e mudo (`som-reino.js`)

### Ganchos de teste
- `?teste=1` liga `window.__keepmile` (`js/teste.js`: `pronto, estado, visao, opcoes, fase, modelo, servidor, jogarSozinho, avancarBatalha`...) e `window.__kmCena` (`cena.js`, só com teste); `?nova=1&semente=X` força partida nova; `?semente=X&rodadas=N` é o link de amigo
- Variáveis: `REINO_SO` (parte de `reino.e2e.mjs`: celular|pc|r17celular|r17pc|desenho|r30; e de `reino-servidor.e2e.mjs`, ex. r30) · `MOV_SO=celular|pc` · `REINO_FOTOS_EXTRA` (pasta de fotos) · `REINO_SEGREDO` (32+ letras, estrada do dia) · `MANUTENCAO`, `SAVE_SO_LEITURA` (chaves de emergência)

### Números — `shared/reino/config.js` (PROVISORIO = true)
- `PARTIDA` (vidas, ouro, bolsa) · `RARIDADES` · `MULT_NIVEL` · `FAMILIAS` · `CARTAS` · `LEGENDAS` · `ALBUM` · `BATALHA` · `INVASORES` · `HORDA` · `CHEFES` · `ESPOLIOS` · `RELIQUIAS` · `BETA` (energia, ligas, temporada, estrada do dia)
- Mudou número: nota em `docs/reino/motor-notas.md` + linha em `docs/decisions.md` no mesmo commit (trava-economia); medir com `node tools/simular-reino.mjs`

### Testes e como rodar
- Servidor (todos juntos): `npm test` (= `node --test 'tests/servidor/*.test.js'` via `tools/verde.mjs`) · um só: `node --test tests/servidor/reino-api.test.js`
- `reino-partida`/`reino-batalha` motor e dados · `reino-api` rotas, seq, energia, ranking, replay · `reino-api-banco` migração com banco usado · `reino-seguranca16` K1–K6 · `reino-cache19` replay e placar · `reino-r22` apelido, última, replay do topo · `reino-r24` apelidos barrados e cursor
- Tela (um por vez, sempre pela trava `tools/trava-robos.mjs rodar "<comando>"`; rodar direto é barrado):
  - `npm run e2e:reino` (`tests/tela/reino.e2e.mjs`, celular e PC, fotos em `tests/tela/fotos/reino/`) · modo servidor: `node tools/trava-robos.mjs rodar "timeout 900 node tests/tela/reino-servidor.e2e.mjs"`
  - movimento: `... rodar "timeout 900 node tests/tela/reino-movimento.e2e.mjs"` · som: `... rodar "timeout 600 node tests/tela/reino-som.e2e.mjs"`
- Simulador: `node tools/simular-reino.mjs [--partidas 600] [--planos N] [--semente keepmile] [--rapido] [--album todas|inicial] [--trabalhos 4]` · travas do estúdio: `npm run test:travas` · `npm run dev` / `npm run servidor` sobem o jogo
- Documentos `docs/reino/`: `jogo.md` (1 página), `biblia.md` (regras e números), `motor-notas.md`, `servidor.md`, `arte.md`, `som.md`
