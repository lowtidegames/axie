// Keepmile — textos de interface (inglês). Nomes e regras de cartas, invasores, chefes, espólios e relíquias vêm do config do motor;
// todo número que aparece aqui chega por parâmetro (lido do config ou do motor), nunca escrito à mão.
import { CHEFES, CONQUISTAS as N, FAMILIAS, PARTIDA, RARIDADES } from '../../../shared/reino/config.js'
import { CHEFE_CONQUISTA, GRUPOS, LISTA } from '../../../shared/reino/conquistas.js'

const chefe = (id) => CHEFES.find((c) => c.id === id).nome
export const T = {
  jogo: 'Keepmile', rodada: 'ROUND', lutar: 'FIGHT', vitoria: 'VICTORY', derrota: 'DEFEAT', chefe: 'BOSS', noite: 'NIGHTFALL', ultimo: 'LAST ONE STANDING',
  noiteSub: (x) => `ALL DAMAGE x${x}`, caiu: (n) => `${n} DOWN!`, maximo: 'MAX LEVEL!', bonus: (n) => `${n} BONUS`,
  sobe: 'LEVEL UP!', trocar: 'REPLACE?', confirma: 'OK?', ganhe: 'WIN:', escolhaTerreno: 'PICK A PLOT', voltar: 'BACK', nivel: 'LEVEL', ouro: 'GOLD',
  trocarDica: 'TAP AGAIN TO REPLACE WHAT IS THERE', trocarQue: (nome, n) => ['REPLACE', `${nome} LV${n}?`],
  chegou: (n) => `${n} reached the castle`, varreu: (n) => `${n} broke your line`, emRodadas: (n) => (n === 1 ? 'BOSS NEXT ROUND' : `BOSS IN ${n} ROUNDS`),
  quase: (p) => `HORDE HEALTH DOWN ${p}%`, deNovoMais: 'SAME ROUND AGAIN: +1 CARD', semVidas: 'NO HEARTS LEFT',
  chances: 'ODDS THIS HAND', // R34: o número é a chance de cada raridade na MÃO (sem repetir carta)
  bolsaSo: 'GOLD ONLY. NO RELIC THIS TIME.' /* R31: a bolsa já veio sorteada; sem relíquia, a chance dela é 0 */, bolsaSorte: (n) => `LUCKY PURSE: ${n}% CHANCE`,
  poder: (a, b) => `POWER ${a}% > ${b}%`, deAte: (a, b, leg) => `${a} > ${b}${leg ? ' ' + leg : ''}`, sobeLinha: (s) => `LEVEL UP: ${s}`,
  pinos: (n, max, rar) => `PINS: LEVEL ${n} OF ${max} - FRAME: ${rar}`,
  familia: (nome, n, p) => `${nome} ${n}/${p}`, familiaMais: (nome, n, p, liga) => `${nome} ${n}/${p} > ${n + 1}/${p}${liga ? ' BONUS' : ''}`, familiaLigada: (nome, n, p) => `${nome} ${n}/${p} BONUS ON`,
  dica: {
    vidas: (n) => `LOSE ALL ${n} HEARTS AND THE RUN ENDS`, tropas: 'TROOPS FIGHT. BUILDINGS HELP THE PLOTS NEXT TO THEM.', chefe: (n) => `A BOSS COMES EVERY ${n} ROUNDS`,
    ganhe: 'WIN THE FIGHT, THEN PICK 1 OF THESE', horda: (n) => (n === 1 ? '1 INVADER THIS ROUND' : `${n} INVADERS THIS ROUND`),
  },
  resumo: { dano: 'DAMAGE BY PLOT', mvp: 'MVP', magia: 'MAGIC', ajuda: 'EACH BAR IS THE DAMAGE OF ONE PLOT' },
  ganheAjuda: 'WIN, THEN PICK 1',
  // R39 — vitória: a meta à vista, o selo depois dela, a festa da rodada da vitória e o fim com vitória (o número vem do config)
  maisConquistas: (n) => `+${n} MORE`, degrauPertoCurto: (meta, n) => `${meta} ROUNDS WON: ${n} TO GO`, degrauPerto: (nome, n) => `${nome}: ${n} ROUND${n === 1 ? '' : 'S'} TO GO`, // R41
  meta: (n) => `HOLD TO ROUND ${n}`, resistiu: 'HELD',
  festaReino: (n) => `ROUND ${n} HELD!`, festaReinoSub: 'KEEP GOING FOR SCORE', fimVenceu: 'THE KINGDOM HELD', cartaoVenceu: 'THE KINGDOM HELD',
  grupos: { chefes: 'Bosses', lutas: 'Battles', reino: 'Kingdom', marcos: 'Milestones' },
  fim: 'RUN OVER', aguentou: (n) => (n === 1 ? 'ROUND HELD' : 'ROUNDS HELD'), recorde: 'NEW RECORD!', melhor: 'BEST SCORE', pontos: 'SCORE', ouroGanho: 'GOLD', deNovo: 'PLAY AGAIN', postar: 'SHARE',
  media: 'AVG BEST 3', recordeMais: (d) => `+${d} OVER YOUR OLD BEST SCORE`, recordeFalta: (d, r) => `BEST SCORE ${r}: ${d} SHORT`, primeira: 'YOUR FIRST SCORE ON THE BOARD', recordeIgual: 'TIED WITH YOUR BEST SCORE',
  ligaProxima: (nome, n) => `${nome} IN ${n}`, ligaTopo: 'TOP TITLE OF THE BETA', provisorio: 'PROVISIONAL', beta: 'BETA', proximaCarta: (n) => (n === 1 ? '1 ROUND TO UNLOCK' : `${n} ROUNDS TO UNLOCK`), todasCartas: 'EVERY CARD UNLOCKED',
  desafio: (n) => (n === 1 ? 'BEAT MY 1 ROUND' : `BEAT MY ${n} ROUNDS`), desafioA: 'BEAT MY', desafioB: (n) => (n === 1 ? '1 ROUND' : `${n} ROUNDS`), copiado: 'LINK COPIED: SAME ROAD',
  postarTexto: (n, url) => `Keepmile: beat my ${n} round${n === 1 ? '' : 's'} on the same road ${url}`,
  melhorMomento: 'BEST MOMENT', melhorLinha: (nome, dano, r) => `${nome} ${dano} DMG IN ROUND ${r}`,
  rodadasPara: (d) => (d > 1 ? `${d} ROUNDS TO YOUR BEST` : d === 1 ? '1 ROUND TO YOUR BEST' : d === 0 ? 'TIED WITH YOUR LONGEST RUN' : 'YOUR LONGEST RUN YET'), semRodadas: 'ROUGH ROAD. GO AGAIN!',
  desafioFim: (amigo, eu) => (eu > amigo ? `YOU BEAT YOUR FRIEND: ${eu} VS ${amigo}` : eu === amigo ? `TIED WITH YOUR FRIEND: ${eu} VS ${amigo}` : `YOUR FRIEND HOLDS: ${amigo} VS ${eu}`),
  bater: (n) => `BEAT ${n}`, outraAba: 'OTHER TAB PLAYED', antigoMelhor: (n) => `OLD BEST ${n}`, mediaLinha: (n) => `AVG BEST 3: ${n}`,
  amigo: {
    estrada: "YOUR FRIEND'S ROAD", sub: 'SAME ROAD, SAME STARTER CARDS FOR EVERYONE', titulo: "Start your friend's road?",
    texto: (n) => (n == null ? '' : `Your friend held ${n} round${n === 1 ? '' : 's'} on this road. `) + 'Same road, same starter cards for everyone. It counts for one run.',
    guarda: 'Your current run will be saved: you come back to it after this one.', troca: "This replaces the friend's road you are on now.",
    sim: "Start friend's road", nao: 'Keep my run',
  },
  // a regra do chefe do config fala em terrenos sem dizer a unidade ("within 0.5"): a tela acrescenta "plots" (o número é o do config)
  comUnidade: (s) => String(s).replace(/(within \d+(?:\.\d+)?)(?=\.?$)/i, '$1 plots'),
  ganheN: (n) => `WIN: PICK 1 OF ${n}`,
  // R46 — revanche: a mesma horda de novo e UMA troca grátis de 2 terrenos (o motor decide; a dica é dele e vale para o reino como está)
  // R52: a dica não entrega o par ("A SWAP WINS THIS" + "SHOW ME"); sem dica, "NO SWAP WINS ALONE: TRY A CARD"; "KEEP AS IS" recolhe a
  // faixa na etiqueta "SWAP"; vencer a revanche ganha "REVENGE!"
  revanche: { titulo: ['REMATCH', 'SAME HORDE AGAIN'], linha: 'SWAP TWO PLOTS ONCE', segundo: 'TAP THE OTHER PLOT', dica: 'A SWAP WINS THIS', semDica: 'NO SWAP WINS ALONE: TRY A CARD', mostrar: 'SHOW ME', manter: 'KEEP AS IS', etiqueta: 'SWAP', feita: 'SWAPPED', vazios: 'BOTH PLOTS ARE EMPTY', vinganca: 'REVENGE!', derrota: 'SAME HORDE AGAIN: +1 CARD +1 SWAP', ariaEtiqueta: 'Open the free swap' },
  toqueCarta: 'TAP A CARD', sortearNome: 'REROLL', consertarNome: 'REPAIR', chefeAmanha: (c) => `BOSS NEXT ROUND: REPAIR A HEART FOR ${c} GOLD`, dicaConserto: (c) => `SPARE GOLD? REPAIR A HEART FOR ${c}`,
  proximaMao: 'NEXT HAND', unidadeTerreno: (x) => `${x} PLOTS`,
  cartaNova: 'NEW CARD', conquista: 'ACHIEVEMENT', limpo: 'CLEAN PLATE', maisNivel: '+1 LEVEL', pegue: 'PICK 1 REWARD', continua: (r) => `RUN RESUMED: ROUND ${r}`,
  menu: {
    titulo: 'Keepmile', som: 'Sound', movimento: 'Reduced motion', album: 'Album', conquistas: 'Achievements', ranking: 'Best runs', nova: 'New run', novaConfirma: 'Give up this run?', fechar: 'Close', sim: 'Yes, new run', nao: 'Keep playing', ligado: 'On', desligado: 'Off', melhores: 'Best runs',
    sair: 'Leave the game?', sairTexto: 'Your run is saved on this device.', sairSim: 'Leave', liga: 'League', media: (n) => `Average of your best 3: ${n}`, proxima: (nome, n) => `${n} more for ${nome}`, topo: 'Top title of the beta', beta: 'Beta: titles only, kept on this device.',
    efeitos: 'Effects', musica: 'Music', menosVol: (q) => `${q} quieter`, maisVol: (q) => `${q} louder`, data: (d) => `Earned ${d}`, enfeite: 'Medal', degrau: (a, b) => `${a} / ${b}`, feitas: (a, b) => `${a} / ${b} earned`, selo: 'HELD', nova: 'NEW', voltar: 'Back to menu',
    ajustes: 'Settings', faixa: (de, ate) => (ate ? `${de} to ${ate}` : `${de} or more`), nenhuma: 'No runs yet', rodadas: (n) => `${n} round${n === 1 ? '' : 's'}`,
  },
  album: { titulo: 'Album', chances: 'Odds per hand from round 2, before level-ups', chancesTodas: 'Same, with every card unlocked', proxima: (n) => (n === 1 ? 'Next card: 1 more round won' : `Next card: ${n} more rounds won`), todas: 'Every card unlocked', somadas: (n) => (n === 1 ? '1 round won so far' : `${n} rounds won so far`), bloqueada: 'Locked card' },
  tipo: { tropa: 'Troop', construcao: 'Building', magia: 'Magic' },
  // MODO SERVIDOR (docs/reino/servidor.md): avisos curtos, modos de partida, temporada, placar do dia, perfil e replay. Todo número vem do servidor.
  srv: {
    // (R30) a conta mora só neste aparelho: o perfil diz isso, e quando a sessão guardada não vale mais a tela avisa uma vez (sem prometer recuperar)
    aparelho: 'Your keep is saved on this device. Clearing browser data starts a new one.',
    aparelhoPrazo: (dias) => `Your keep is saved on this device. Unused for ${dias} days, or if browser data is cleared, it is lost.`, // (R33) dias = perfil.conta.diasSemUsoAtePerder do servidor
    sessao: { titulo: 'YOUR SESSION EXPIRED', texto: 'A NEW KEEP WAS STARTED' },
    // (R30) fim de uma partida de ranking: os pontos da partida e a conta da temporada (números do servidor)
    fimRanking: { partida: (n) => `RUN SCORE ${n}`, temporada: (n, k) => `SEASON SCORE ${n} (AVG OF YOUR BEST ${k})` },
    rede: 'RECONNECTING...', voltou: 'BACK ONLINE', sincronizado: 'SYNCED WITH SERVER', carregando: 'Loading...', deNovo: 'Try again', acabou: 'THAT RUN ENDED ON THE SERVER',
    erro: {
      MUITOS_PEDIDOS: 'Too many requests. Wait a moment.', MUITAS_PARTIDAS: 'Too many new runs. Wait a little.', MUITAS_CONTAS: 'Too many new accounts from here. Wait a little.',
      MANUTENCAO: 'Maintenance. Back soon.', SO_LEITURA: 'Read only right now. Nothing changed.', SEM_REDE: 'No connection. Try again.',
      SEM_ENERGIA: 'No ranked energy left. Training is free.', ESTRADA_JA_JOGADA: "Today's road is done. Available tomorrow.", ESTRADA_DE_HOJE: "Replays of today's road: available tomorrow.",
      PARTIDA_ABERTA: 'That run is still open.', PARTIDA_NAO_ENCONTRADA: 'That run is not available.', PADRAO: 'Something went wrong. Try again.',
    },
    modo: { treino: 'TRAINING', ranking: 'RANKED', estrada: 'DAILY ROAD' }, replayRot: 'REPLAY',
    modoNome: { treino: 'Training', ranking: 'Ranked', estrada: "Today's road" },
    modoSub: { treino: 'FREE PRACTICE', estrada: 'SAME ROAD FOR EVERYONE TODAY' }, energiaCurta: (a, m) => `RANKED ENERGY ${a}/${m}`,
    fora: { CONTA_NOVA: "OFF TODAY'S BOARD: NEW ACCOUNT. PLAY FREELY.", SEM_RANKING: "OFF TODAY'S BOARD: FINISH 1 RANKED RUN FIRST." },
    foraFrase: { CONTA_NOVA: "Off today's board: this account is new. From tomorrow, with 1 ranked run finished, you are in.", SEM_RANKING: "Off today's board: finish 1 ranked run to enter." },
    noPlacar: (n) => `TODAY'S ROAD: RANK ${n} ON THE BOARD`, foraSemMotivo: "TODAY'S ROAD: NOT ON THE BOARD", naoContou: 'THIS RUN DID NOT COUNT',
    semLiga: 'UNRANKED', semRanking: 'NO RANKED RUN THIS SEASON', temporadaMarca: 'SEASON', posicao: (n) => String(n), posicaoMarca: (n) => `RANK ${n}`, // a letra do jogo não tem o sinal de número: a posição vai por extenso
    postar: (n, url) => `Keepmile: I held ${n} round${n === 1 ? '' : 's'}. ${url}`,
    em: (ms) => { const m = Math.max(0, Math.ceil(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m % 60}m` : `${m}m` },
    energia: (a, m) => `Ranked energy ${a}/${m}`, energiaVolta: (n, quando) => `+${n} in ${quando}`,
    jogar: {
      titulo: 'Play', menu: 'Play', treino: 'Training', treinoSub: 'Free. Counts for your album.', ranking: 'Ranked run', rankingSub: (a, m) => `Uses 1 energy. You have ${a}/${m}.`,
      semEnergia: (quando) => `No energy. More in ${quando}.`, estrada: "Today's road", estradaSub: 'Same road for everyone. 1 try a day.', estradaFeita: 'Done today. Available tomorrow.',
      continuar: 'Resume', aberta: 'In progress',
    },
    ranking: {
      titulo: 'Season', menu: 'Season ranking', temporada: (n, quando) => `Season ${n} - ends in ${quando}`, fechada: (n) => `Season ${n} - closed`, regra: (n) => `Score: average of your best ${n} ranked runs`,
      voce: (pos, pts) => `Rank ${pos} - ${pts} points`, semVoce: 'No ranked run this season yet', proxima: (nome, n) => `${n} more for ${nome}`, topo: 'Top keepers', vazio: 'No ranked runs yet this season', passar: (n, nome) => `${n} point${n === 1 ? '' : 's'} to pass ${nome}`,
      mais: 'More', ligas: 'Titles', faixa: (de) => `${de} or more`, lenda: (n) => `Top ${n} of the season`, topoN: (n) => `Top ${n} this season`, beta: 'Beta: titles only.', partidas: (n) => `${n} run${n === 1 ? '' : 's'}`,
    },
    placar: {
      titulo: "Today's road", menu: "Today's road", dia: (d, quando) => (quando ? `${d} - new road in ${quando}` : `${d} - new road tomorrow`), voce: (pos, pts) => `You: rank ${pos} - ${pts} points`, aberta: 'Your road is in progress', naoJogou: 'You have not played today',
      abaHoje: 'Today', abaOntem: 'Yesterday', tituloOntem: "Yesterday's road", diaOntem: (d) => `${d} - final board`, vazioOntem: "Nobody on yesterday's board",
      fora: (pts) => `Your run: ${pts} - not on the board`, vazio: 'Nobody on the board yet', jogar: "Play today's road", replays: "Replays of today's road open tomorrow.", linha: (pts, n) => `${pts} - ${n} round${n === 1 ? '' : 's'}`,
    },
    perfil: {
      titulo: 'Profile', menu: 'Profile', vitorias: (n) => `Kingdom held in ${n} run${n === 1 ? '' : 's'}`, recordes: (p, r, n) => `Best ${p} - Longest ${r} round${r === 1 ? '' : 's'} - ${n} run${n === 1 ? '' : 's'}`, temporada: (n, quando) => `Season ${n} ends in ${quando}`, titulos: 'Past seasons',
      titulo1: (t, pos, liga, pts) => `Season ${t}: rank ${pos} - ${liga} - ${pts}`, melhores: 'Best runs', ver: 'Watch', nenhuma: 'No runs yet', corrida: (n, modo, dia) => `${n} round${n === 1 ? '' : 's'} - ${modo} - ${dia}`, nome: (n) => `Name: ${n}`,
    },
    // trocar o nome (POST apelido): a regra em 1 linha e as recusas do servidor em texto curto. O tempo de espera é o `podeEm` dele.
    apelido: {
      menu: 'Change name', titulo: 'Your name', rotulo: 'New name', atual: (n) => `Now: ${n}`, novo: (n) => `New: ${n}`, regra: '3-16 letters, numbers, spaces, - or underscore. 1 change a day.', salvar: 'Save name', feito: 'Name changed.', voltar: 'Back to profile',
      espera: (quando) => `You can change again in ${quando}.`,
      erro: { APELIDO_EM_USO: 'That name is taken. Try another.', APELIDO_BARRADO: 'That name is not allowed. Try another.', APELIDO_INVALIDO: 'Use 3-16 letters, numbers, spaces, - or underscore.' },
    },
    // fim da partida no modo servidor: a subida no ranking (números do servidor, antes > depois) e o gancho da estrada do dia
    subiu: { rank: (de, para) => `RANK ${de} > ${para}`, entrou: (n) => `ON THE BOARD: RANK ${n}`, liga: (nome) => `NEW TITLE: ${nome}` },
    gancho: { aberta: "TODAY'S ROAD IS OPEN", curso: "TODAY'S ROAD: IN PROGRESS", nova: (quando) => `NEW ROAD IN ${String(quando).toUpperCase()}`, amanha: 'NEW ROAD TOMORROW' },
    replay: { sair: 'Leave replay', de: (n) => `REPLAY: ${n}`, passo: (r, i, n) => `ROUND ${r} - STEP ${i}/${n}`, fim: (r, p) => `RUN OVER: ${r} ROUND${r === 1 ? '' : 'S'} - SCORE ${p}`, fimVenceu: (r, p) => `HELD: ${r} ROUNDS - SCORE ${p}`, pular: 'SKIP TO FIGHT', rever: 'WATCH AGAIN', voltar: 'BACK', por: (carta, k) => `${carta} > PLOT ${k}`, espolio: 'TOOK A REWARD', troca: (a, b) => `SWAP: PLOT ${a} AND ${b}`, desistir: 'GAVE UP' },
  },
  aria: {
    carta: (n) => `Card ${n}`, terreno: (k) => `Plot ${k}`, sortear: (c) => `Reroll cards for ${c} gold`, consertar: (c) => `Repair one life for ${c} gold`, vel: (v) => `Speed ${v}x`, som: 'Sound on or off', menu: 'Menu', espolio: (n) => `Take ${n}`, seguir: 'Continue', lutar: 'Fight',
    vidas: 'What hearts are', pinos: 'When the boss comes', horda: 'Who is coming', ganhe: 'What you can win', reliquias: 'What your relics do', pular: 'Skip',
  },
}
// Conquistas (docs/reino/biblia.md, seção 9; R39): só título e enfeite. Os 30 ids, os nomes, os grupos e a meta dos degraus vêm do
// módulo da regra (shared/reino/conquistas.js); aqui fica só a condição curta de cada uma, com os números e nomes do config.
const chefeCurto = (id) => chefe(id).split(' the ')[0]
const NIVEL = PARTIDA.nivelMax, LENDARIA = RARIDADES[RARIDADES.length - 1].nome
const bonusDe = (f) => `Switch on the ${FAMILIAS[f].nome} bonus`
const COMO = {
  road: `Beat ${chefe('gutbucket').split(' ')[0]}`, double: `Beat ${chefe('niptuck')}`, mole: `Beat ${chefe('moleworth')}`, pudding: `Beat ${chefeCurto('gobble')}`,
  nopatch: `Beat ${chefe('niptuck')} without a single repair in the run`, scratch: `Beat ${chefeCurto('moleworth')} with every heart full`,
  supper: 'Win your first battle', plate: 'Win a battle without losing a soldier', last: 'Win with exactly one soldier left', penny: 'Win round 10 with no rerolls in the run',
  thread: N.coracoes === 1 ? 'Win a battle on your last heart' : `Win a battle with ${N.coracoes} hearts`, seconds: 'Win a battle right after losing one', encore: `Win round ${N.rodadaDoBis} or a later one`,
  house: 'Fill all 6 plots', family: 'Hold 6 plots of the same family', brass: `Raise a card to level ${NIVEL}`,
  shields: bonusDe('pikewall'), bows: bonusDe('thornbow'), dish: bonusDe('potluck'), sparks: bonusDe('fizzwick'),
  mason: `Raise a building to level ${NIVEL}`, spicy: `Raise a magic card to level ${NIVEL}`, pockets: `Hold ${N.reliquias} relics in one run`, grand: `Put a ${LENDARIA} card in your kingdom`,
  librarian: 'Unlock every card',
}
for (const [id, n] of Object.entries(N.rodadasSomadas)) COMO[id] = `Win ${n} rounds in total, any mode`
/** As 30, na ordem do módulo: { id, nome, grupo, como, meta?, medida? }. */
export const CONQUISTAS = LISTA.map((c) => ({ ...c, como: COMO[c.id] || '' }))
export const GRUPOS_CONQUISTA = GRUPOS.map((id) => ({ id, nome: T.grupos[id] }))
export { CHEFE_CONQUISTA }
