# PASSAGEM — Frayz

## ⚑ 15/11/2026 02:30 BRT — ESTADO ATUAL (vale acima do resto)
- **Jogo:** Frayz — bonecos de pano amaldiçoados, batalha 3×3 por cartas, costura (cruzamento), aluguel de times, ranking, token na Solana (nada de dinheiro ainda). Repositório `lowtidegames/axie` (público, o dono sabe), ramo `main`. Ambiente de nuvem próprio: `frayz` (libera só api.elevenlabs.io e api.pixellab.ai).
- **Diretor anterior:** `session_019N76nV6wFUb2aP2SLbeotJ` (conversa encerrada por tamanho e custo). **Regra nova do dono (02:01): o Fable só dirige e julga; agentes em Opus e Sonnet; nenhum agente em Fable sem ele dizer.**
- **No `main`, tudo com teste:** motor de batalha 2 (sorteio por SHA-256, mesa, teto de 40 comandos por turno), costura/genes/Carretel/desgaste, economia do pote no simulador (rodadas 1 e 2), tela do protótipo (luta, coleção, costura com casulo, Aventura de 5 fases, replay), servidor do protótipo (rodada 1), som (30 efeitos, valsa em camadas, folha de sons). `npm test` 114/0; `npm run e2e` verde (luta, tela 2 e som; celular e PC).
- **Acabamento entregue em PEÇAS, ainda SEM ENCAIXE na luta (tarefa 11):**
  - `public/js/boneco-rig.js` (44 partes, 9 bonecos, 8 poses animadas, remendos, troféus, Fio de Ouro, `registrarFonteDeCamada`), `public/js/cenario.js` (ateliê, lugares, Tesoura pendurada; `desenharFrente` passa a Tesoura na frente dos bonecos), `public/js/efeitos.js`; folha: `public/arte.html`; teste: `npm run e2e:arte`.
  - `public/js/pecas/*` (carta, mão em leque, fita métrica, dedal, carretéis, bastidor, faixa, fio do tempo, etiqueta, botão, logotipo, número de dano, marca de vantagem, `arte-adaptador.js`), `public/css/pecas.css`, fontes livres em `public/fontes/` (crédito em `CREDITOS.md`); folha: `public/pecas.html` (`?montagem=luta|time|vitoria|derrota`); teste: `npm run e2e:pecas`.
  - ATENÇÃO: esses dois testes passaram nos ramos dos agentes, mas ainda NÃO foram rodados no `main` depois da junção; o caminho do `arte-adaptador.js` que usa o `boneco-rig.js` nunca rodou (o contrato suposto está no cabeçalho do adaptador; conferir com o do rig). Primeiro passo da tarefa 11: rodar os dois e consertar.
  - Fotos para olhar: `tests/tela/fotos/arte-antes-e-depois.png`, `arte-poses.png`, `arte-cena-celular.png`, `pecas-pc-1280-luta.png`, `pecas-celular-360-luta.png`, `pecas-pc-1280-vitoria.png`.
- **Plano de encaixe (tarefa 11), resumo dos relatos:**
  - Tela: `index.html` ganha `css/pecas.css` e os recipientes das peças (modelo pronto em `public/js/pecas/montagens.js`, função `montarLuta`); `app.js` troca `renderMao` por `mao.definir` + `mao.aoEscolher`, a barra de Linha por `criarCarreteis`, a roda por `bastidor.acender`, os avisos por `etiquetas.avisar`, o relógio por `fio.iniciar/parar`, a vida por `criarPlaca` posicionada pelos retângulos da arena, o dano por `soltarNumero`; a caixa de texto do replay sai da tela do fim. O teste `prototipo.e2e.mjs` usa `#mao .carta[data-cid]`: o seletor muda (a regra não).
  - Arena: trocar o desenho antigo (`bonecos.js`) por `criarRig(...).desenhar(...)` com as poses pelos eventos do motor, e o fundo por `criarCenario()`; `cenario.lugares()` dá os pés e os tamanhos.
  - Som: mapa completo "acontecimento → som" e "momento da música" no relato do som (carta, golpe, golpe forte, crítico, vantagem, escudo, golpe no escudo, véu, cura, Fio Solto, troca, Último Fio, queda, Tesoura desce/corta, casulo, remendo, aposentadoria; música: entrada, luta, tesouraDescendo nos turnos 6–8, tesouraCortando do 9 em diante, ultimoFio, costura, vitória, derrota).
  - Motor 2: a tela ainda não mostra a `mesa` (carta jogada some da mão e só aparece no descarte no fim do turno) — mostrar é melhoria.
- **Ramo pendente no GitHub, SEM juntar:** `frayz-servidor2` (b943003; servidor rodada 2: teto de 60 bonecos vivos + coleção em páginas, banco enxuto, limites no banco e atrás de proxy, progressão da Aventura, banco alheio recusado, apelido único, chaves de emergência, sessão com validade e sair, motor 2 no servidor, luta parada; 139 testes; banco v2 com migração). Mexe em banco, rotas e login: precisa do `seguranca` (Opus) ANTES de juntar. Contrato novo da API no relato (resumo: `GET /api/estado` devolve resumo + 1ª página + `faseLiberada`; `GET /api/bonecos?cursor=&limite=`; `POST /api/sair`; códigos `COLECAO_CHEIA`, `FASE_BLOQUEADA`, `APELIDO_EM_USO`, `SESSAO_VENCIDA`, `MANUTENCAO`, `SO_LEITURA`).
- **Ramos só na máquina antiga (não enviados por causa de ~40 MB de fotos):** `frayz-arte`, `frayz-pecas` — o código deles já está no `main`.
- **Régua de qualidade:** `docs/guia-de-estilo.md` e `docs/direcao-de-som.md`. Meta: trindade 90+ por tela.
- **Serviços pagos (dono liberou 15/11 00:36):** ElevenLabs e PixelLab. Piloto em `sons/piloto-elevenlabs/` e `arte/piloto-pixellab/`; gastos e lições em `docs/custos.md` (342 créditos; 38 gerações; PixelLab com 1.107 de 10.000 gerações no ciclo, conta dividida com outro projeto). As amostras do ElevenLabs entram pelo `public/sons/manifesto.json` (o som cai para o código se o arquivo faltar).
- **Segurança:** `docs/seguranca/parecer-servidor-1.md` (A1, A2, A11 fechados; o resto na tarefa 13; A6 espera a economia). Provas em `tests/ataques/servidor-1/`.

### Esperando o dono (não reoferecer o que ele recusar)
1. **Visual** (a escolha é dele; os dois lados estão prontos para comparar):
   - `sim, desenho por código opção 1 — som pelo ElevenLabs com teto de 5.000 créditos` (recomendação do diretor depois de ver o resultado; nota 94)
   - `sim, pixel art total — teto 600 gerações do PixelLab e 5.000 créditos do ElevenLabs` (nota 86: cena e bonecos inteiros muito bons, mas a parte de cada boneco precisa ser lida de longe e só a mistura cabeça × corpo foi provada)
2. **Link de teste:** `sim, link de teste pelo GitHub opção 1` (página grátis do GitHub; 1 clique dele em Settings → Pages; sem link ele não ouve a folha de sons nem joga).
3. **Economia:** `sim, números da rodada 2 só para o beta sem dinheiro opção 1` (`docs/ideias/economia-do-pote.md`).
4. Mais adiante: teto de força do Lendário (+10% dá ~62% de vitória; +4% dá 56,5%); freio da inflação de raridade; abrir luta gastar energia e desistir contar como derrota (A6); custo da costura; o evento de Linha do Ponto Cruz revela o tipo da carta comprada (regra ou esconder?); tornar o repositório privado antes de ligar dinheiro; confirmar o código FRAY no explorador antes de criar o token.

### Próximos passos, em ordem
1. `seguranca` (Opus) no ramo `frayz-servidor2` → com GO, juntar.
2. Tarefa 11, encaixe do acabamento (Opus para `app.js`/`arena.js`; Sonnet para o resto), com fotos conferidas pelo diretor.
3. Ligar a tela ao servidor pela `public/js/ponte.js` (hoje o motor roda no navegador).
4. Com o "sim" do som: pacote do ElevenLabs (3–4 tomadas por som, de 1 a 2 s, escolher por medição, aparar e nivelar) e preencher o manifesto.

### Regras vivas do dono
- Fable só dirige (02:01). Propostas já chegam com uma opção 95+ em primeiro lugar; nota honesta (dizer o que falta; mudar a nota quando a prova mudar).
- Capricho máximo em interface, layout, som e arte.
- Checklist com Nota + linha "Conselheiros:" + o "sim" num bloco; contraponto honesto antes de executar; português simples; hora real em BRT (rodar `date`, não chutar).
- Só o dono decide: número de economia, dinheiro e créditos pagos (teto dito por ele), token/carteira, hospedagem, publicar, apagar, regra da casa, visual.
- Até 4 agentes ao mesmo tempo, cada um em worktree próprio e com lista de arquivos; agentes não enviam ao GitHub; o diretor junta, roda `npm test` e envia o `main`. Juntar poucos retornos por vez para gastar menos turnos do diretor.
- Nada liga o Frayz a outros jogos; nada copiado de jogo existente.

### Avisos práticos para a conversa nova
- **Chaves:** numa conversa nova no ambiente `frayz` as variáveis `ELEVENLABS_API_KEY` e `PIXELLAB_API_KEY` NÃO existem. Antes de usar os serviços, pedir as duas pelo formulário seguro de credencial (ElevenLabs: cabeçalho `xi-api-key`; PixelLab: `Authorization: Bearer`), nunca no chat.
- O `fetch` do Node só passa pelo proxy com `NODE_USE_ENV_PROXY=1`; Python `requests` precisa de `verify='/root/.ccr/ca-bundle.crt'`.
- Trava do verde: `git push` só passa com `npm test` verde na MESMA árvore; arquivo solto sem commit muda a árvore (o `npm run e2e` regrava fotos: `git checkout -- tests/tela/fotos` depois). Commit de `shared/config.js` exige linha nova em `docs/decisions.md` já adicionada antes do comando de commit. Não encadear `merge && teste`. Um `git push` e um `git worktree add` no mesmo comando fazem a guarda de privacidade barrar: separar.
- Fotos de teste em densidade 2 pesam muito: não juntar ramo com dezenas de MB de PNG; trazer o código e 2 ou 3 fotos reduzidas.
- Rodar: `npm test` · `npm run e2e` · `npm run e2e:arte` · `npm run e2e:pecas` · `npm run simular` · `npm run simular:economia -- --comparar` · `npm run dev` (tela local, porta 4700; folhas em `/arte.html`, `/pecas.html`, `/sons.html`) · `npm run servidor` (porta 4800).

### Frase para a conversa nova
```
Você é o DIRETOR do Frayz. Repositório lowtidegames/axie, ramo main, ambiente frayz. Leia PASSAGEM.md (seção do topo), CLAUDE.md, docs/fila.md e o topo de docs/decisions.md. Revise as regras e me mostre o resumo em poucas linhas.
```
