// Keepmile — textos de interface (inglês). Nomes e regras de cartas, invasores, chefes, espólios e relíquias vêm do config do motor.
export const T = {
  jogo: 'Keepmile', rodada: 'ROUND', lutar: 'FIGHT', vitoria: 'VICTORY', derrota: 'DEFEAT', chefe: 'BOSS', noite: 'NIGHTFALL', ultimo: 'LAST ONE STANDING',
  sobe: 'LEVEL UP!', trocar: 'REPLACE?', confirma: 'OK?', ganhe: 'WIN:', escolhaTerreno: 'PICK A PLOT', voltar: 'BACK', nivel: 'LEVEL', ouro: 'GOLD',
  chegou: (n) => `${n} reached the castle`, varreu: (n) => `${n} broke your line`, emRodadas: (n) => (n === 1 ? 'BOSS NEXT ROUND' : `BOSS IN ${n} ROUNDS`),
  fim: 'RUN OVER', aguentou: 'ROUNDS HELD', recorde: 'NEW RECORD!', melhor: 'BEST', pontos: 'SCORE', ouroGanho: 'GOLD', deNovo: 'PLAY AGAIN', postar: 'SHARE',
  cartaNova: 'NEW CARD', conquista: 'ACHIEVEMENT', limpo: 'CLEAN PLATE', maisNivel: '+1 LEVEL', pegue: 'PICK 1 REWARD',
  menu: { titulo: 'Keepmile', som: 'Sound', movimento: 'Reduced motion', album: 'Album', conquistas: 'Achievements', nova: 'New run', novaConfirma: 'Give up this run?', fechar: 'Close', sim: 'Yes, new run', nao: 'Keep playing', ligado: 'On', desligado: 'Off', melhores: 'Best runs' },
  album: { titulo: 'Album', chances: 'Draw chances', proxima: (n) => (n === 1 ? 'Next card: 1 more round won' : `Next card: ${n} more rounds won`), todas: 'Every card unlocked', somadas: (n) => `${n} rounds won so far`, bloqueada: 'Locked card' },
  tipo: { tropa: 'Troop', construcao: 'Building', magia: 'Magic' },
  aria: { carta: (n) => `Card ${n}`, terreno: (k) => `Plot ${k}`, sortear: (c) => `Reroll cards for ${c} gold`, consertar: (c) => `Repair one life for ${c} gold`, vel: (v) => `Speed ${v}x`, som: 'Sound on or off', menu: 'Menu', espolio: (n) => `Take ${n}`, seguir: 'Continue', lutar: 'Fight' },
}
// Conquistas (docs/reino/biblia.md, seção 9): só título e enfeite.
export const CONQUISTAS = [
  { id: 'supper', nome: 'First Supper', como: 'Win your first battle' }, { id: 'road', nome: 'Not on My Road', como: 'Beat Gutbucket' },
  { id: 'plate', nome: 'Clean Plate', como: 'Win a battle without losing a soldier' }, { id: 'last', nome: 'Last One Standing', como: 'Win with exactly one soldier left' },
  { id: 'house', nome: 'Full House', como: 'Fill all 6 plots' }, { id: 'brass', nome: 'Top Brass', como: 'Raise a card to level 5' },
  { id: 'family', nome: 'One Big Family', como: 'Hold 6 plots of the same family' }, { id: 'penny', nome: 'Penny Pincher', como: 'Win round 10 without a single reroll' },
  { id: 'double', nome: 'Double Trouble', como: 'Beat Nip & Tuck' }, { id: 'mole', nome: 'Mole Patrol', como: 'Beat Madame Moleworth' },
  { id: 'pudding', nome: 'Long Live the Pudding', como: 'Beat King Gobble' }, { id: 'librarian', nome: 'Head Librarian', como: 'Unlock every card' },
]
export const CHEFE_CONQUISTA = { gutbucket: 'road', niptuck: 'double', moleworth: 'mole', gobble: 'pudding' }
