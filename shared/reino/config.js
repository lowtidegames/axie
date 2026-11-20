// Keepmile — TODOS os números e dados do jogo de reino num lugar só.
// PROVISÓRIO: copiados de docs/reino/biblia.md e ajustados no simulador (tools/simular-reino.mjs).
// Cada número mudado está anotado em docs/reino/motor-notas.md (de → para, motivo, efeito medido).
// Textos do jogo em inglês saem só daqui.
//
// Unidades do motor (tudo inteiro):
//   tempo    → passos de 0,1 s ("tique"); 10 tiques = 1 s
//   posição  → centésimos de terreno; portão x=0, castelo x=600; terreno k ocupa [100(k−1), 100k)
//   velocidade → centésimos por segundo (150 = 1,5 terreno/s)
//   percentuais → inteiros (25 = 25%)

export const PROVISORIO = true

// ---------------------------------------------------------------- partida
export const PARTIDA = {
  terrenos: 6,
  vidas: 3,
  nivelMax: 5,
  tetoComandos: 3000, // comandos aceitos numa partida (proteção do servidor)
  tetoRodada: 99, // partida acaba sozinha aqui (nenhuma partida normal chega)
  ouro: {
    inicio: 3,
    vitoria: 4,
    porTerrenoLimpo: 1, // por terreno em que nenhum invasor pisou
    chefe: 10,
    derrota: 2,
    sortearBase: 2, // 2, depois 3, 4… na mesma oferta
    sortearPasso: 1,
    consertoBase: 20, // 20, 30, 40…
    consertoPasso: 20,
  },
  bolsa: { ouro: 8, chanceReliquia: 15 }, // espólio Purse: 8 de ouro; 15% das vezes uma relíquia
  pontosPorRodada: 100,
}

// ---------------------------------------------------------------- raridades e sorteio
export const RARIDADES = [
  { id: 'C', nome: 'Common', chance: 50, pinos: 1 },
  { id: 'U', nome: 'Uncommon', chance: 30, pinos: 2 },
  { id: 'R', nome: 'Rare', chance: 14, pinos: 3 },
  { id: 'E', nome: 'Epic', chance: 5, pinos: 4 },
  { id: 'L', nome: 'Legendary', chance: 1, pinos: 5 },
]

// Vida e dano por nível (N1..N5), em %. Sir Dent tem a sua (cresce perto do dobro: +35/+70/+120/+170).
export const MULT_NIVEL = [100, 120, 138, 152, 165]

// ---------------------------------------------------------------- famílias
export const FAMILIAS = {
  pikewall: { nome: 'Pikewall', cor: 'azul', terrenos: 3, bonus: { reducao: 10 }, texto: 'Soldiers take 10% less damage.' },
  thornbow: { nome: 'Thornbow', cor: 'verde', terrenos: 3, bonus: { alcanceTiro: 50 }, texto: 'Shooters get +0.5 range.' },
  potluck: { nome: 'Potluck', cor: 'laranja', terrenos: 3, bonus: { curaSeg: 4 }, texto: 'Soldiers heal 4 health per second.' },
  fizzwick: { nome: 'Fizzwick', cor: 'roxo', terrenos: 3, bonus: { magia: 25 }, texto: 'Magic is 25% stronger.' },
}

// ---------------------------------------------------------------- cartas (30)
// Tropa: qtd por nível, vida, dano, cad (tiques), alcance (centésimos). Alcance 30 = corpo a corpo (anda);
// acima de 30 = atirador (não anda; o tiro acerta na hora).
// Construção: vale para os terrenos vizinhos; valores por nível. Magia: age no próprio terreno.
export const CARTAS = {
  // Tropas (12)
  T01: { nome: 'Pikeman', tipo: 'tropa', familia: 'pikewall', raridade: 'C', piloto: true, qtd: [3, 3, 4, 4, 5], vida: 30, dano: 6, cad: 10, alcance: 30, texto: 'Sturdy pikemen. They hold the road.' },
  T02: { nome: 'Doorman', tipo: 'tropa', familia: 'pikewall', raridade: 'U', piloto: true, qtd: [2, 2, 3, 3, 4], vida: 60, dano: 3, cad: 12, alcance: 30, reducaoTiro: 30, texto: 'Carries a real door. Takes 30% less damage from ranged.' },
  T03: { nome: 'Sir Dent', tipo: 'tropa', familia: 'pikewall', raridade: 'R', qtd: [1, 1, 1, 1, 1], vida: 100, dano: 18, cad: 12, alcance: 30, multNivel: [100, 135, 170, 220, 270], semExtras: true /* Bunkhouse não dá 2º cavaleiro */, texto: 'One big knight. Grows twice as much per level.' },
  T04: { nome: 'Hedge Archer', tipo: 'tropa', familia: 'thornbow', raridade: 'C', piloto: true, qtd: [2, 3, 3, 4, 4], vida: 16, dano: 8, cad: 12, alcance: 250, texto: 'Shoots from behind the line.' },
  T05: { nome: 'Granny Bolt', tipo: 'tropa', familia: 'thornbow', raridade: 'R', qtd: [1, 1, 2, 2, 3], vida: 20, dano: 40, cad: 25, alcance: 350, alvo: 'maisVida', texto: 'Slow, huge shot at the toughest invader in range.' },
  T06: { nome: 'Falconer', tipo: 'tropa', familia: 'thornbow', raridade: 'U', qtd: [1, 1, 2, 2, 2], vida: 18, dano: 12, cad: 10, alcance: 400, alvo: 'maisLonge', texto: 'Her falcon strikes the farthest invader in range.' },
  T07: { nome: 'Frypan Cook', tipo: 'tropa', familia: 'potluck', raridade: 'C', piloto: true, qtd: [3, 4, 4, 5, 6], vida: 26, dano: 5, cad: 8, alcance: 30, texto: 'Many cooks, fast pans.' },
  T08: { nome: 'Soup Carrier', tipo: 'tropa', familia: 'potluck', raridade: 'U', qtd: [1, 1, 2, 2, 2], vida: 24, dano: 0, cura: 22, cad: 15, alcance: 150, alvo: 'aliadoFerido', texto: 'Heals the most hurt soldier nearby. Does not fight.' },
  T09: { nome: 'Pie Thrower', tipo: 'tropa', familia: 'potluck', raridade: 'R', qtd: [2, 2, 3, 3, 4], vida: 16, dano: 11, cad: 15, alcance: 200, lento: { pct: 40, tiques: 20 }, texto: 'Pies slow the target by 40% for 2 s.' },
  T10: { nome: 'Squib Runner', tipo: 'tropa', familia: 'fizzwick', raridade: 'U', piloto: true, qtd: [2, 3, 3, 4, 5], vida: 10, dano: 24, cad: 10, alcance: 30, busca: 250, explode: { raio: 50 }, texto: 'Runs at invaders and goes boom.' },
  T11: { nome: 'Clockwork Geese', tipo: 'tropa', familia: 'fizzwick', raridade: 'U', qtd: [4, 5, 6, 8, 10], vida: 10, dano: 3, cad: 6, alcance: 30, texto: 'A noisy flock of wind-up geese.' },
  T12: { nome: 'Sparkwright', tipo: 'tropa', familia: 'fizzwick', raridade: 'E', qtd: [1, 1, 1, 2, 2], vida: 18, dano: 8, cad: 16, alcance: 250, saltos: 2, saltoAlcance: 100, texto: 'Bolt jumps to 2 more invaders.' },

  // Construções (10)
  B01: { nome: 'Smithy', tipo: 'construcao', familia: 'pikewall', raridade: 'C', piloto: true, efeito: 'dano', valores: [30, 40, 50, 60, 70], texto: 'Neighbors deal more damage.' },
  B02: { nome: 'Bunkhouse', tipo: 'construcao', familia: 'pikewall', raridade: 'C', efeito: 'soldados', valores: [1, 1, 1, 2, 2], efeito2: 'vida', valores2: [10, 20, 30, 30, 40], texto: 'Neighbor troops get extra soldiers and health.' },
  B03: { nome: 'Stone Wall', tipo: 'construcao', familia: 'pikewall', raridade: 'U', efeito: 'reducao', valores: [25, 30, 35, 40, 45], texto: 'Neighbors take less damage.' },
  B04: { nome: 'Watchtower', tipo: 'construcao', familia: 'thornbow', raridade: 'C', piloto: true, efeito: 'torre', valores: [50, 75, 100, 125, 150], valores2: [50, 60, 70, 85, 100], texto: 'Neighbor shooters see farther and hit harder.' },
  B05: { nome: "Fletcher's Hut", tipo: 'construcao', familia: 'thornbow', raridade: 'U', efeito: 'rapidez', valores: [50, 60, 70, 80, 90], texto: 'Neighbors attack faster.' },
  B06: { nome: 'Cookhouse', tipo: 'construcao', familia: 'potluck', raridade: 'C', piloto: true, efeito: 'curaSeg', valores: [3, 5, 7, 9, 12], texto: 'Neighbors heal every second.' },
  B07: { nome: 'Market Stall', tipo: 'construcao', familia: 'potluck', raridade: 'U', efeito: 'ouro', valores: [3, 4, 5, 6, 8], texto: 'Each neighbor troop pays gold when you win.' },
  B08: { nome: 'Feast Hall', tipo: 'construcao', familia: 'potluck', raridade: 'R', efeito: 'vida', valores: [40, 55, 70, 85, 100], texto: 'Neighbors have more health.' },
  B09: { nome: "Tinker's Shed", tipo: 'construcao', familia: 'fizzwick', raridade: 'R', efeito: 'bis', valores: [50, 60, 70, 85, 100], texto: 'Neighbor Magic triggers a second time.' },
  B10: { nome: 'Fuse Depot', tipo: 'construcao', familia: 'fizzwick', raridade: 'E', efeito: 'pavio', valores: [6, 8, 10, 13, 16], raio: 50, texto: 'Neighbor soldiers burst when they fall.' },

  // Magias (8)
  M01: { nome: 'Boom Barrel', tipo: 'magia', familia: 'fizzwick', raridade: 'C', piloto: true, efeito: 'barril', valores: [30, 45, 60, 80, 100], raio: 100, texto: 'First invader to step here sets it off.' },
  M02: { nome: 'Tar Puddle', tipo: 'magia', familia: 'fizzwick', raridade: 'U', efeito: 'piche', valores: [40, 45, 50, 55, 60], texto: 'Invaders here walk slower.' },
  M03: { nome: 'Angry Bees', tipo: 'magia', familia: 'thornbow', raridade: 'U', efeito: 'abelhas', valores: [8, 11, 14, 17, 21], texto: 'Invaders here get stung every second.' },
  M04: { nome: 'Rally Horn', tipo: 'magia', familia: 'pikewall', raridade: 'U', efeito: 'corneta', valores: [50, 60, 70, 85, 100], tiques: 50, texto: 'When invaders reach here, all soldiers attack faster for 5 s.' },
  M05: { nome: 'Second Helping', tipo: 'magia', familia: 'potluck', raridade: 'U', efeito: 'repeteco', valores: [80, 85, 90, 95, 100], texto: 'When invaders reach here, all soldiers heal.' },
  M06: { nome: 'Bramble Snare', tipo: 'magia', familia: 'thornbow', raridade: 'C', piloto: true, efeito: 'laco', valores: [3, 4, 5, 6, 8], tiques: 25, texto: 'The first invaders to step here are stuck for 2.5 s.' },
  M07: { nome: 'Seconds!', tipo: 'magia', familia: 'potluck', raridade: 'E', efeito: 'levanta', valores: [2, 3, 4, 5, 6], texto: 'The first soldiers to fall get back up with half health.' },
  M08: { nome: 'Grand Finale', tipo: 'magia', familia: 'fizzwick', raridade: 'L', efeito: 'finale', valores: [12, 18, 24, 30, 36], texto: 'When invaders reach here, every invader loses part of its health.' },
}

// ---------------------------------------------------------------- álbum
// Começa com as 10 do piloto + Bunkhouse + Rally Horn. As outras 18 liberam por rodadas vencidas somadas.
export const ALBUM = {
  inicial: ['T01', 'T02', 'T04', 'T07', 'T10', 'B01', 'B04', 'B06', 'M01', 'M06', 'B02', 'M04'],
  ordem: ['T06', 'T08', 'T11', 'B03', 'B05', 'B07', 'M02', 'M03', 'T03', 'T05', 'T09', 'B08', 'B09', 'M05', 'T12', 'B10', 'M07', 'M08'],
  primeira: 8, depoisCada: 15, quantasNoMeio: 8, fimCada: 30, // 8, +15 ×8, +30 ×9 = 398
}

// ---------------------------------------------------------------- batalha
export const BATALHA = {
  tiquesPorSegundo: 10,
  noite: 200, // aos 20 s todo dano em dobro
  fimTempo: 300, // aos 30 s vence a maior % de vida (empate é do jogador)
  multNoite: 300, // aos 20 s "Nightfall": todo dano ×3
  entrada: -50, // invasores entram em x = −0,5
  intervaloMax: 3, // um a cada min(0,3 s; 6 s ÷ quantidade)
  janelaEntrada: 60,
  castelo: 600,
  corpo: 30, // alcance do corpo a corpo
  saida: 100, // corpo a corpo sai atrás de inimigo a até 1,0 do seu centro
  velSoldado: 150,
  rearme: 30, // Tinker's Shed: o 2º disparo fica pronto 3 s depois do 1º
  tetoReducao: 75, // dano recebido nunca cai mais que 75%
  tetoLento: 90,
  chefeMetade: 50, // chefes sofrem só metade de lentidão, prisão e Grand Finale
  ultimoDeTriplo: 300, // Last Candle
}

// ---------------------------------------------------------------- invasores
// pontos = custo na horda. desde = primeira rodada em que pode aparecer.
export const INVASORES = {
  muncher: { nome: 'Muncher', desde: 1, pontos: 2, vida: 20, dano: 4, cad: 10, vel: 100, alcance: 30 },
  stilt: { nome: 'Stilt Runner', desde: 3, pontos: 2, vida: 12, dano: 3, cad: 8, vel: 200, alcance: 30 },
  spud: { nome: 'Spud Slinger', desde: 4, pontos: 3, vida: 14, dano: 5, cad: 14, vel: 100, alcance: 250 },
  brute: { nome: 'Potlid Brute', desde: 6, pontos: 5, vida: 90, dano: 9, cad: 15, vel: 70, alcance: 30, tiroMetade: true },
  bloater: { nome: 'Bloater', desde: 7, pontos: 4, vida: 40, dano: 5, cad: 10, vel: 90, alcance: 30, explode: { dano: 15, raio: 75 } },
  mole: { nome: 'Mole Raider', desde: 8, pontos: 4, vida: 24, dano: 6, cad: 10, vel: 100, alcance: 30, cava: { tiques: 15, sai: 300 } },
  drum: { nome: 'Drum Bully', desde: 11, pontos: 4, vida: 30, dano: 2, cad: 10, vel: 90, alcance: 30, tambor: { pct: 25, raio: 100 } },
  quack: { nome: 'Quack', desde: 12, pontos: 4, vida: 22, dano: 0, cura: 6, cad: 10, vel: 90, alcance: 150 },
}

export const HORDA = {
  pontosBase: 1, // rodada r: 1 + 3·r pontos (rodada 1 = 2 Munchers)
  pontosPorRodada: 3,
  escalaPorRodada: 14, // vida e dano × (1 + 0,14·(r−1))
  partes: [60, 40], // 2 tipos sorteados levam 60% e 40% dos pontos; a sobra vira Munchers
  chefeACada: 5,
  chefePontos: 50, // na rodada de chefe, os invasores comuns têm metade dos pontos
  avisoChefe: 2, // anunciado 2 rodadas antes
}

// Chefes (rodadas 5, 10, 15, 20; depois repetem a cada 5 com o dobro de vida e dano).
export const CHEFES = [
  { id: 'gutbucket', nome: 'Gutbucket the Wide', rodada: 5, vida: 380, dano: 14, cad: 15, vel: 60, alcance: 30, golpeArea: 50, texto: 'Each swing hits every soldier within 0.5.' },
  { id: 'niptuck', nome: 'Nip & Tuck', rodada: 10, vida: 300, dano: 16, cad: 10, vel: 60, alcance: 30, gemeos: 2, furia: 50, texto: 'When one twin falls, the other gets 50% faster and stronger.' },
  { id: 'moleworth', nome: 'Madame Moleworth', rodada: 15, vida: 1100, dano: 25, cad: 12, vel: 60, alcance: 30, cava: { tiques: 15, sai: 300 }, texto: 'Digs under the first three plots and comes up at plot 4.' },
  { id: 'gobble', nome: 'King Gobble the Uninvited', rodada: 20, vida: 800, dano: 30, cad: 12, vel: 60, alcance: 30, chama: { quantos: 3, tiques: 50, teto: 9 }, imune: true, texto: 'Calls 3 Munchers every 5 s (9 at most); cannot be slowed or stuck.' },
]

// ---------------------------------------------------------------- espólios e relíquias
export const ESPOLIOS = {
  carta: { nome: 'Card', texto: 'A card to place right now.' },
  promocao: { nome: 'Promotion', texto: '+1 level on a card in your kingdom.' },
  bolsa: { nome: 'Purse', texto: 'Gold. Sometimes a Relic instead.' },
  reliquia: { nome: 'Relic', texto: 'Lasts until the end of the run.' },
}

export const RELIQUIAS = {
  horseshoe: { nome: 'Lucky Horseshoe', texto: 'Your first reroll each round is free.' },
  candle: { nome: 'Last Candle', texto: 'Your last soldier standing deals triple damage.' },
  crown: { nome: 'Spare Crown', texto: 'The castle gets one extra life.' },
  bell: { nome: 'Gate Bell', texto: 'Soldiers on plot 1 have 40% more health.', vida: 40 },
  fuse: { nome: 'Long Fuse', texto: 'Magic is 30% stronger.', magia: 30 },
  ledger: { nome: 'Tax Ledger', texto: '+3 gold for every win.', ouro: 3 },
  banner: { nome: 'Twin Banner', texto: 'Family bonus needs 2 plots, not 3.', terrenos: 2 },
  blueprints: { nome: 'Blueprints', texto: 'Buildings reach 2 plots on each side.', alcance: 2 },
}

// ---------------------------------------------------------------- beta sem dinheiro (servidor) — PROVISÓRIO
// Lido só pelo servidor (server/reino/). Energia das partidas de ranking: decidida por delegação em 19/11
// (docs/decisions.md). Temporada, média das 3 melhores e ligas: docs/reino/biblia.md, seção 10.
// No beta só se ganha título e enfeite: nada de prêmio, pote ou dinheiro.
export const BETA = {
  energia: { porDia: 3, teto: 9, porPartidaDeRanking: 1 }, // recarga às 00:00 UTC; o que sobra junta até o teto
  temporadaDias: 7, // começa segunda-feira 00:00 UTC
  melhoresQueContam: 3, // pontuação = soma das 3 melhores ÷ 3; faltando partida, a que falta conta 0
  ligas: [ // por média (faixa fixa da bíblia); os primeiros da temporada viram a lenda
    { id: 'gate', nome: 'Gate Sweeper', min: 0 },
    { id: 'road', nome: 'Road Warden', min: 800 },
    { id: 'keep', nome: 'Keep Captain', min: 1200 },
    { id: 'lord', nome: 'Lord Steward', min: 1600 },
    { id: 'crown', nome: 'Crown Guardian', min: 2000 },
  ],
  lenda: { id: 'legend', nome: 'Legend of the Mile', primeiros: 10 },
  estradaDoDia: { tentativas: 1 }, // a mesma estrada para todos no dia UTC, com o álbum inicial (ninguém sai na frente)
}
