# R46 — revanche com troca grátis e dica (desenho do arquiteto, 20/11/2026)

Decisão: `docs/decisions.md`, 20/11/2026 14:45. Medida: R45 parte 1 (`tools/medir-reino.mjs --variante rematch`; dica em `:122-133`, troca em `:322-333`, mesma horda em `:362-374`). Alvo medido: novato passa o 1º chefe em 53,4%, mediana de 9 rodadas vencidas.

## O que muda
Quem perde uma rodada e continua na partida enfrenta a MESMA horda. Antes de lutar, pode trocar o conteúdo de 2 terrenos uma vez, de graça. Se alguma troca vence essa horda, o jogo avisa e aponta o par (opção escolhida pelo diretor: a dica aponta os dois terrenos, que é o que foi medido).

## Motor (`shared/reino/`)
- Config: `PARTIDA.regra: 2` (regra das partidas novas) e `PARTIDA.trocasNaRevanche: 1`.
- Versão da regra por partida: `criarPartida({ semente, cartasLiberadas, regra })` grava `e.regra`. Sem `regra` vale 1, a de hoje. `reproduzir` recebe e repassa `regra`. Estado guardado sem o campo vale 1. `VERSAO` fica como está (se subisse, as partidas abertas seriam recusadas).
- Derrota: com regra 2, guarda a horda, chama `abrirRodada(e)` e devolve a horda guardada. O sorteio anda exatamente como hoje: mão e espólio saem iguais. Depois grava `e.revanche = { troca: true, dica: {a,b} | null }`.
- `dicaDaTroca(estado)` exportada pelo motor, fonte única: a 1ª troca com a<b, sem contar dois terrenos vazios, que vence a horda com o reino como está (sem a carta nova da mão). O medidor passa a importar essa função.
- Comando novo `{tipo:'trocar', a, b}`: só com regra ≥ 2, `revanche.troca` ligada, fase de carta, a≠b entre 1 e 6, pelo menos um dos dois ocupado. Evento `{tipo:'troca', a, b}`; desliga a troca. `batalhar` também desliga. Recusa: `sem_troca`.
- `opcoes`: as trocas válidas entram em `comandos` só quando a troca está disponível.
- `visao.revanche: { troca, dica }`, opcional. A dica some depois que a troca é usada.
- A dica é calculada pelo MOTOR na derrota e guardada no estado: igual no servidor, no modo local e no replay; não existe dica sob encomenda.

## Servidor (`server/reino/`)
- Banco v9: `ALTER TABLE reino_partidas ADD COLUMN regra INTEGER NOT NULL DEFAULT 1`.
- `abrir` grava `PARTIDA.regra`; `refazer` e `replayMontado` passam `linha.regra`.
- `comandoLimpo` e `rotas.mjs` aceitam `a` e `b` só no comando `trocar`.
- `Partida.regra` e `Replay.regra` opcionais.

## Anti-trapaça
- Troca só na revanche e só uma vez; partida de regra 1 recusa `trocar`.
- A horda já aparece na tela e a luta não tem dado: "existe troca que vence" não revela semente nem futuro. Nenhuma rota recebe arranjo qualquer.

## Tela
- Faixa "REMATCH · SWAP TWO PLOTS (FREE)" e "SAME HORDE AGAIN". Toca o 1º terreno (aceso), depois o 2º; "SWAPPED". Botão "KEEP AS IS"; pôr carta ou lutar também mantém. Dica: par aceso e "THIS SWAP WINS AS IT STANDS".
- Arquivos: `interface.js`, `cena.js`, `app.js`, `textos.js`, `teste.js`. `batalha-tela.js` e `movimento.js` não mudam.
- "Menos animação": troca instantânea, só esmaecer. Som: `troca` e `dica`. Replay mostra o evento `troca`.

## Conquistas
`seconds` continua igual (fica mais fácil). A troca não muda famílias nem `penny`, `nopatch`, `thread`, `scratch`.

## Tarefas
1. Motor (Opus): `config.js`, `partida.js`, `tests/servidor/reino-r46-motor.test.js`, foto `reino-r46-antes.json` tirada ANTES. Testes: replay da regra 1 idêntico à foto; regra 2 com mesma horda, mesma mão e mesmo espólio da regra 1; troca fora da revanche, segunda troca e troca depois de `batalhar` recusadas; dica igual à conta das 15 trocas em 200 sementes; `seconds` depois de vencer a revanche; refazer partida longa em no máximo o dobro do tempo.
2. Servidor (Opus, depois da 1; depois `seguranca`): `reino.mjs`, `rotas.mjs`, `banco.mjs` (`migracaoV9`), `server/db.mjs`, `tests/servidor/reino-r46.test.js`. Testes: banco v8 usado sobe para v9; antigas com regra 1 e replay idêntico; partida aberta antiga segue com horda nova; nova sai com regra 2; segundo boot não muda nada; cópia do banco no log; `a`/`b` fora de `trocar` dá 400.
3. Medidor (depois da 1): troca a injeção pelo motor com regra 2; pronto = 53,4% e mediana 9 nas mesmas sementes.
4. Tela (depois da 1): `app.js`, `interface.js`, `cena.js`, `textos.js`, `teste.js`, trecho `REINO_SO=r46` no e2e.
5. Som: `som-reino.js`, `reino-som.e2e.mjs`.

## Não fazer
"Só a mesma horda" · mais de uma troca ou troca paga · rota de dica para arranjo qualquer · dica feita pela tela · subir `VERSAO` · mudar fotos e testes antigos.

Lição: partida terminada guarda só semente e comandos; regra nova de partida precisa de versão gravada fora do estado (coluna com DEFAULT = regra antiga) e o motor com a regra antiga como padrão.

## Emenda (20/11 17:30, decisão do diretor)
A dica é recalculada quando o reino muda (pôr carta); a troca continua valendo depois de pôr carta (só `batalhar` e a própria troca gastam). A tela mostra o par só no "SHOW ME". Texto: "SWAP TWO PLOTS ONCE". Festa "REVENGE!" ao vencer a revanche.
