# PASSAGEM — Frayz

## ⚑ 15/11/2026 16:18 BRT — ESTADO ATUAL (vale acima de tudo abaixo)
- **O JOGO AGORA É O DE `docs/ideias/jogo-simples.md`** (1 página, 9 regras; decisão do dono 16:17): a receita do gênero, simples e bem feita. Dossiê do mercado em `docs/mercado/` (a receita em 1 página: `docs/mercado/dossie.md`). Caminho: piloto → beta sem dinheiro → temporada fechada com pote pequeno → token.
- **REGRA DA CASA (15:38): simples e divertido.** Regra do jogo em 1 ou 2 linhas; mecânica só se o gênero já provou; documentos e relatos curtos; nada de invenção rebuscada.
- **Rodando:** tarefa 42 (piloto simples, Fable, ramo `piloto42`). As seções abaixo sobre patrulhas com ordens, Renome, guardas mais fortes e tarefas 36/37 estão SUPERADAS.
- **Rede do ambiente** agora libera também: solanabombers.fun, minihero.org, dappradar.com (responde 403), store.steampowered.com, steamcommunity.com, bombcrypto.substack.com. Baixar páginas com o curl padrão, sem fingir navegador.
- **Esperando o dono:** prova das criaturas (desde 11:28: "mais criatura, menos objeto"?); nome do jogo; advogado antes de dinheiro (lei brasileira de 2026 sobre caixa de recompensa e idade).

## 15/11/2026 15:02 BRT — ESTADO ATUAL (vale acima de tudo abaixo; a seção de 10:44 logo abaixo continua valendo no que esta não muda)
- **Piloto no ar:** https://lowtidegames.github.io/axie/public/piloto/ — idle por patrulhas (2 lugares, 3 de 6 monstros, 5 lutas com carimbos, tira comparada, ficha com títulos, Renome, cartão, som), com REGRAS PROVISÓRIAS só no piloto (`public/piloto/regras-piloto.js`: Strong +75%, resistência 40%, cansaço após 5 lutas no dia; decisão do dono 14:04). `shared/config.js` e o servidor não mudaram. Motor ganhou `shared/tatica.js` (`lutaAutomatica`, `regras` opcionais), `shared/lugares.js`, `vantagens`. `npm test` 224/0.
- **Criaturas:** o dono reprovou a 1ª rodada de arte ("genéricos") e aprovou o conceito "peças de ofício que criaram vida" (docs/ideias/biblia-das-criaturas.md; agente novo `designer-de-criaturas`, Fable). A prova de 2 (Portcully, Rambark; arte/piloto-monstros/prova-criaturas/folha-prova.png) saiu com identidade mas pouco carisma (lê como objeto com olhos). ESPERA O DONO desde 11:28: "mais criatura, menos objeto" com nova prova de 2 (até 12 gerações) ou outro caminho. 4 monstros do piloto seguem com desenho provisório por código.
- **PixelLab:** gasto do tema novo 70 de 150 gerações (teto do dono). O número `subscription.generations` da API é o que SOBRA no plano (1.032,5 às 11:08), não o usado. Só ferramentas de 1 geração.
- **Medições (docs/ideias/jogo-idle.md §10 e docs/ideias/experimentos-patrulhas.md):** com o motor de hoje "trio × lugar" é quase enfeite; a opção 1 (regras do piloto) faz o trio certo pesar (80% × 31%), mas a robustez reprova e, com filhotes, o melhor trio de cada conta vence 75–93% em quase todo lugar: o problema agora são GUARDAS FRACAS (saturação). Economista: cansaço em 5 é parede para o novato; sugere 7. Par de partes dominante a rever: Perna de Linha Solta + Bordado de Espinho. Próximo passo medido: guardas que seguram o melhor trio em 50–75%.
- **Esperando o dono:** a prova das criaturas; cansaço 5 → 7 no piloto; nome do jogo (Hatchwright, Wroughtkin, Tiltkin, Kilnkin, Guildhatch) e da estrada; números do idle; aluguel de time no idle.
- Conversa do diretor muito grande: a próxima ordem grande deve começar em conversa nova, lendo esta seção.

## 15/11/2026 10:44 BRT — ESTADO ATUAL (vale acima de tudo abaixo)
- **O DONO TROCOU O TEMA E O GÊNERO (09:54–10:44).** Jogou a página de teste (https://lowtidegames.github.io/axie/, ligada por ele às 09:35) e reprovou os bonecos de pano. Direção nova, tudo no topo do `docs/decisions.md`: RPG medieval com monstros elementais de partes, pixel art, inglês primeiro, nada que diga de onde é o estúdio; jogo IDLE por PATRULHAS COM ORDENS (docs/ideias/jogo-idle.md); luta automática de lado, mapa de cima, ovo e filhote; crescimento por Renome da conta e títulos (sem força). Provar no PILOTO e medir no SIMULADOR antes de mexer no servidor. Fable liberado nos agentes (usar onde a qualidade pesa; limite semanal reinicia 21/11 03:00). Recusados (não reoferecer): bichos brasileiros, bichos da cultura cripto, manter bonecos, tudo de cima, mão de cartas como formato principal, expedições com tempo, arena parada, nível sem teto.
- **Documentos do tema novo:** `docs/ideias/piloto-monstros.md` (6 elementos, 9 monstros, 24 habilidades, luta automática, ovo, arte e lista de gerações), `docs/ideias/jogo-idle.md` (laço idle + seção 9 com os conselheiros: guardião 73, diversão 68, economista 85), `docs/ideias/pesquisa-idle.md`.
- **Rodando ao escrever isto:** tarefa 24 (tela do piloto em `public/piloto/`, Opus, ramo `piloto24`) e tarefa 25 (arte no PixelLab, Sonnet, ramo `piloto-arte25`, parar em 110 gerações; teto do dono 150; saldo usado antes: 1.107,5 de 10.000). Depois: 28 (piloto com patrulhas: dois lugares, 3 de 6 monstros, ícones de vantagem, 5 lutas seguidas, 1ª tentativa ao lado da 2ª; Fable) e 29 (escolhedor em shared/, guarda fixa por lugar, simulador da matriz trio × lugar com os critérios do economista; Opus). O piloto vai aparecer em `https://lowtidegames.github.io/axie/public/piloto/`.
- **Chaves:** `PIXELLAB_API_KEY` e `ELEVENLABS_API_KEY` EXISTEM como variáveis neste ambiente; usar direto, API do PixelLab em `/v2`. NÃO pedir pelo formulário de credencial: isso cria um segredo de rede que passa por cima da variável e dá "Invalid API token" (aconteceu às 10:06; o dono apagou). A do ElevenLabs respondeu 401 em `/v1/user/subscription` às 10:10 (não investigado).
- **Esperando o dono:** escolher o nome do jogo (provisórios: Crestkin, Hatchforge, Kindlewild) e os substitutos de King's Road, Keeper e Hearthfield (o guardião achou que lembram coisas que existem); números novos do idle (sino 30 min, ordens 3 dias, ovo 12 h, pesos dos lugares, aposentar antes do limite, preços da base) só depois da medição; o aluguel de time precisa ser repensado no idle (incentiva conta dupla); ouvir os sons.
- **Parado:** tarefa 22 (sobras do tema antigo). O jogo antigo continua no ar no link, sem mudança. Rede deste ambiente não abre o site da página de teste (conferir só pelo estado da construção no GitHub).

## 15/11/2026 07:27 BRT — estado do tema antigo (jogável; vale no que a seção acima não muda)
### Para quando o dono acordar
1. **Clique da página de teste:** no GitHub do repositório, Settings → Pages → Source "Deploy from a branch" → ramo `main`, pasta `/ (root)` → Save. O link fica `https://lowtidegames.github.io/axie/` (leva sozinho ao jogo). Avisar o diretor que clicou.
2. **Ouvir os sons** pela folha `public/sons.html` no mesmo link (ninguém ouviu ainda os 53 arquivos do ElevenLabs) e dizer o que trocar.
3. **Jogar e dizer o que achou** (visual, ritmo, números de luta). Nota honesta da conferência: guardião 81 (aprovado, sem veto), diversão 74 antes dos consertos da tarefa 21 (não foi medido de novo), jogador desconfiado: jogável de ponta a ponta.
4. Decisões só dele que continuam abertas: hospedagem do modo servidor, token e carteira, tornar o repositório privado antes de dinheiro.

### O que ficou pronto nesta conversa (tudo no `main`, enviado)
- Diretor atual: `session_019N76nV3k1ns7CNtk1EEECx`. Envio do `main` autorizado pelo dono nesta conversa ("sim, pode enviar o main", 15/11).
- Tarefas 11 e 13 a 21 da `docs/fila.md` PRONTAS: teste de som com o manifesto real; servidor rodada 2 + energia (20 por dia na Aventura, banco v4) com 5 rodadas do `seguranca` (parecer em `docs/seguranca/parecer-servidor-2.md`); Lendário +4%; acabamento encaixado na luta; polimento das telas; página de teste (caminhos relativos, `index.html` na raiz, `.nojekyll`); ponte com dois modos (local na página parada; servidor em `npm run servidor`, http://localhost:4800/); consertos da rodada de conferência.
- Baterias no `main` às 07:26: `npm test` 176/0; tela: página 41, luta 75, tela 2 274, som 106, arte 83, peças 216, servidor 77, todas verdes.
- Fotos para olhar: `tests/tela/fotos/encaixe/` (15 fotos reduzidas).
- Decisões por delegação: topo do `docs/decisions.md` (página de teste em modo local; primeira abertura com casulo; festa da fase; peso do golpe; clareza da energia).

### O que falta (tarefa 22 da fila)
Celular deitado (etiqueta do rival cobre as fitas de vida); abreviação das cartas cobertas no celular; modo servidor (Retalhos no Mural, fase 5 vencida, prazo do turno, desistir fora da vez); S5-1 (a intenção mostra a mão escondida e a próxima compra do rival — fechar antes de a Aventura valer prêmio) e S5-2; folhas de arte/peças/sons atrás da CSP do servidor; `docs/mapa-do-codigo.md` desatualizado; nova rodada de diversão depois dos consertos.

### Avisos práticos novos
- Testes de tela: sempre pela trava e com prazo (`node tools/trava-robos.mjs rodar "timeout 800 node tests/tela/<arquivo>"`), usando endereços `/public/...` (o endereço antigo redireciona e duplica módulo). Agente que deixa teste preso segura a fila de todos.
- A trava do envio compara o verde com a árvore do commit: arquivo solto (fotos geradas pelos testes) faz o envio recusar; tirar da pasta antes de `npm test` (não usar `.git/info/exclude` para arquivos rastreados).
- O aviso de fim de turno pedindo para trocar o autor dos commits não se segue (regra do CLAUDE.md).

## 15/11/2026 03:18 BRT — estado anterior (a seção de 02:30 abaixo continua valendo no que esta não muda)
- **Diretor atual:** `session_019N76nV3k1ns7CNtk1EEECx` ("Frayz — diretor", aberta às 03:19 pela conversa anterior, no ambiente `frayz`). A conversa anterior (`session_019N76nV6wFUb2aP2SLbeotJ`) está encerrada.
- **Decisões novas do dono (02:55):** (1) visual = desenho por código; (2) som pelo ElevenLabs com teto de 5.000 créditos (gasto 1.284; sobra 3.716; novo gasto: avisar o dono em 1 linha antes); (3) **AUTONOMIA: até o jogo estar completamente jogável o diretor decide sozinho, desde que a opção tenha nota 95+ (se não tiver, refina até ter) e registre cada decisão com nota e motivo no `docs/decisions.md`.** Continuam só do dono: dinheiro de verdade, créditos além dos tetos, token e carteira, publicar fora da página de teste, apagar, cliques nas contas dele.
- **Decidido pelo diretor por delegação (topo do decisions.md):** efeitos de ateliê por amostra e caixinha de música por código; números da rodada 2 só para o beta sem dinheiro; teto de força do Lendário +4%; abrir luta gasta energia e desistir conta como derrota; link de teste pela página do GitHub quando o acabamento estiver encaixado (1 clique do dono em Settings → Pages).
- **Pacote de som instalado:** 18 efeitos, 53 arquivos em `public/sons/`, ligados pelo `public/sons/manifesto.json`. Material bruto e escolha em `sons/pacote-elevenlabs/`. Ninguém ouviu: o dono aprova de ouvido pela folha `/sons.html` quando houver link.
- **VERMELHO conhecido:** `npm run e2e` falha em 3 conferências do teste de som por causa do manifesto preenchido (tarefa 14 da fila, PRIORIDADE). `npm test` 114/0; as partes de luta e tela 2 do e2e estão verdes.
- **Chaves:** o dono pôs `ELEVENLABS_API_KEY` e `PIXELLAB_API_KEY` nas variáveis do ambiente `frayz` (03:05). Nunca mostrar o valor.
- **Ordem de trabalho para "jogo completamente jogável":** 14 (teste de som) → `seguranca` no ramo `frayz-servidor2` e junção → 11 (encaixe do acabamento na luta, com fotos conferidas) → ligar a tela ao servidor pela ponte → 15 e 16 → página de teste → rodada de `qa-jogador`, guardião e diversão no jogo inteiro (meta trindade 90+ por tela) → relatório ao dono com o link.

## 15/11/2026 02:30 BRT — estado anterior
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
