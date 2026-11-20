// Keepmile — textos de interface (inglês). Nomes e regras de cartas, invasores, chefes, espólios e relíquias vêm do config do motor;
// todo número que aparece aqui chega por parâmetro (lido do config ou do motor), nunca escrito à mão.
import { CHEFES } from '../../../shared/reino/config.js'

const chefe = (id) => CHEFES.find((c) => c.id === id).nome
export const T = {
  jogo: 'Keepmile', rodada: 'ROUND', lutar: 'FIGHT', vitoria: 'VICTORY', derrota: 'DEFEAT', chefe: 'BOSS', noite: 'NIGHTFALL', ultimo: 'LAST ONE STANDING',
  noiteSub: (x) => `ALL DAMAGE x${x}`, caiu: (n) => `${n} DOWN!`, maximo: 'MAX LEVEL!', bonus: (n) => `${n} BONUS`,
  sobe: 'LEVEL UP!', trocar: 'REPLACE?', confirma: 'OK?', ganhe: 'WIN:', escolhaTerreno: 'PICK A PLOT', voltar: 'BACK', nivel: 'LEVEL', ouro: 'GOLD',
  trocarDica: 'TAP AGAIN TO REPLACE WHAT IS THERE',
  chegou: (n) => `${n} reached the castle`, varreu: (n) => `${n} broke your line`, emRodadas: (n) => (n === 1 ? 'BOSS NEXT ROUND' : `BOSS IN ${n} ROUNDS`),
  quase: (p) => `${p}% OF THE HORDE DOWN`, deNovoMais: 'SAME ROUND AGAIN: +1 CARD', semVidas: 'NO HEARTS LEFT',
  chances: 'ODDS', bolsaChance: (n) => `RELIC CHANCE ${n}%`, bolsaSorte: (n) => `LUCKY PURSE: ${n}% CHANCE`,
  poder: (a, b) => `POWER ${a}% > ${b}%`, deAte: (a, b, leg) => `${a} > ${b}${leg ? ' ' + leg : ''}`, sobeLinha: (s) => `LEVEL UP: ${s}`,
  pinos: (n, max, rar) => `PINS: LEVEL ${n} OF ${max} - FRAME: ${rar}`,
  familia: (nome, n, p) => `${nome} ${n}/${p}`, familiaMais: (nome, n, p, liga) => `${nome} ${n}/${p} > ${n + 1}/${p}${liga ? ' BONUS' : ''}`, familiaLigada: (nome, n, p) => `${nome} ${n}/${p} BONUS ON`,
  dica: {
    vidas: (n) => `LOSE ALL ${n} HEARTS AND THE RUN ENDS`, tropas: 'TROOPS FIGHT. BUILDINGS HELP THE PLOTS NEXT TO THEM.', chefe: (n) => `A BOSS COMES EVERY ${n} ROUNDS`,
    ganhe: 'WIN THE FIGHT, THEN PICK 1 OF THESE', horda: (n) => `${n} INVADERS THIS ROUND`,
  },
  resumo: { dano: 'DAMAGE BY PLOT', mvp: 'MVP', magia: 'MAGIC' },
  fim: 'RUN OVER', aguentou: 'ROUNDS HELD', recorde: 'NEW RECORD!', melhor: 'BEST SCORE', pontos: 'SCORE', ouroGanho: 'GOLD', deNovo: 'PLAY AGAIN', postar: 'SHARE',
  media: 'AVG BEST 3', recordeMais: (d) => `NEW BEST SCORE: +${d} OVER YOUR OLD BEST`, recordeFalta: (d) => `${d} SHORT OF YOUR BEST SCORE`, primeira: 'YOUR FIRST SCORE ON THE BOARD', recordeIgual: 'TIED WITH YOUR BEST SCORE',
  ligaProxima: (nome, n) => `${nome} IN ${n}`, ligaTopo: 'TOP TITLE OF THE BETA', provisorio: 'PROVISIONAL', beta: 'BETA', proximaCarta: (n) => (n === 1 ? 'NEXT CARD IN 1 ROUND' : `NEXT CARD IN ${n} ROUNDS`), todasCartas: 'EVERY CARD UNLOCKED',
  desafio: (n) => (n === 1 ? 'BEAT MY 1 ROUND' : `BEAT MY ${n} ROUNDS`), desafioA: 'BEAT MY', desafioB: (n) => (n === 1 ? '1 ROUND' : `${n} ROUNDS`), copiado: 'LINK COPIED: SAME ROAD',
  postarTexto: (n, url) => `Keepmile: beat my ${n} round${n === 1 ? '' : 's'} on the same road ${url}`,
  cartaNova: 'NEW CARD', conquista: 'ACHIEVEMENT', limpo: 'CLEAN PLATE', maisNivel: '+1 LEVEL', pegue: 'PICK 1 REWARD', continua: (r) => `RUN RESUMED: ROUND ${r}`,
  menu: {
    titulo: 'Keepmile', som: 'Sound', movimento: 'Reduced motion', album: 'Album', conquistas: 'Achievements', ranking: 'Best runs', nova: 'New run', novaConfirma: 'Give up this run?', fechar: 'Close', sim: 'Yes, new run', nao: 'Keep playing', ligado: 'On', desligado: 'Off', melhores: 'Best runs',
    sair: 'Leave the game?', sairTexto: 'Your run is saved on this device.', sairSim: 'Leave', liga: 'League', media: (n) => `Average of your best 3: ${n}`, proxima: (nome, n) => `${n} more for ${nome}`, topo: 'Top title of the beta', beta: 'Beta: titles only, kept on this device.',
    faixa: (de, ate) => (ate ? `${de} to ${ate}` : `${de} or more`), nenhuma: 'No runs yet', rodadas: (n) => `${n} round${n === 1 ? '' : 's'}`,
  },
  album: { titulo: 'Album', chances: 'Draw chances', proxima: (n) => (n === 1 ? 'Next card: 1 more round won' : `Next card: ${n} more rounds won`), todas: 'Every card unlocked', somadas: (n) => `${n} rounds won so far`, bloqueada: 'Locked card' },
  tipo: { tropa: 'Troop', construcao: 'Building', magia: 'Magic' },
  aria: {
    carta: (n) => `Card ${n}`, terreno: (k) => `Plot ${k}`, sortear: (c) => `Reroll cards for ${c} gold`, consertar: (c) => `Repair one life for ${c} gold`, vel: (v) => `Speed ${v}x`, som: 'Sound on or off', menu: 'Menu', espolio: (n) => `Take ${n}`, seguir: 'Continue', lutar: 'Fight',
    vidas: 'What hearts are', pinos: 'When the boss comes', horda: 'Who is coming', ganhe: 'What you can win',
  },
}
// Conquistas (docs/reino/biblia.md, seção 9): só título e enfeite. O nome do chefe vem do config.
export const CONQUISTAS = [
  { id: 'supper', nome: 'First Supper', como: 'Win your first battle' }, { id: 'road', nome: 'Not on My Road', como: `Beat ${chefe('gutbucket').split(' ')[0]}` },
  { id: 'plate', nome: 'Clean Plate', como: 'Win a battle without losing a soldier' }, { id: 'last', nome: 'Last One Standing', como: 'Win with exactly one soldier left' },
  { id: 'house', nome: 'Full House', como: 'Fill all 6 plots' }, { id: 'brass', nome: 'Top Brass', como: 'Raise a card to level 5' },
  { id: 'family', nome: 'One Big Family', como: 'Hold 6 plots of the same family' }, { id: 'penny', nome: 'Penny Pincher', como: 'Win round 10 without a single reroll' },
  { id: 'double', nome: 'Double Trouble', como: `Beat ${chefe('niptuck')}` }, { id: 'mole', nome: 'Mole Patrol', como: `Beat ${chefe('moleworth')}` },
  { id: 'pudding', nome: 'Long Live the Pudding', como: `Beat ${chefe('gobble').split(' the ')[0]}` }, { id: 'librarian', nome: 'Head Librarian', como: 'Unlock every card' },
]
export const CHEFE_CONQUISTA = { gutbucket: 'road', niptuck: 'double', moleworth: 'mole', gobble: 'pudding' }
