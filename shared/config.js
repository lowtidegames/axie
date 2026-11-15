// Frayz — dados do jogo (configuração única de números).
//
// *** TODO NÚMERO DESTE ARQUIVO É PROVISÓRIO ***
// Serve ao protótipo SEM dinheiro, sem banco e sem rede. Só vira regra depois do simulador
// (`npm run simular`) e do "sim" do dono. Desenho aprovado em docs/ideias/batalha-e-criaturas.md.
// Nomes de cartas, partes, bordados e bonecos são originais do Frayz (tema: bonecos de pano amaldiçoados).
// Só dados aqui: nenhuma lógica. O motor (shared/batalha.js) só LÊ este arquivo.

// ---------------------------------------------------------------------------------------------
// 1. Tipos (tecidos) em roda: cada um bate forte no SEGUINTE da lista; o último bate no primeiro.
//    Jeans > Seda > Lã > Feltro > Tule > Couro > Jeans
// ---------------------------------------------------------------------------------------------
export const TIPOS = ['jeans', 'seda', 'la', 'feltro', 'tule', 'couro']
export const NOMES_DOS_TIPOS = { jeans: 'Jeans', seda: 'Seda', la: 'Lã', feltro: 'Feltro', tule: 'Tule', couro: 'Couro' }
export const BONUS_DE_TIPO = 0.25 // +25% de dano quando o tipo da carta bate forte no tipo do alvo

// ---------------------------------------------------------------------------------------------
// 2. Regras da luta
//    "Turno" = a vez de UM lado (quem começa joga os turnos ímpares, o outro os pares; 20 s cada na tela).
//    Firmeza do boneco: reduz em % o dano que ele recebe. Rapidez: chance (%) de crítico.
// ---------------------------------------------------------------------------------------------
export const REGRAS = {
  lugares: ['frente', 'meio', 'tras'],
  linhaPorTurno: 3,
  linhaPrimeiroTurnoDeQuemComeca: 2, // quem começa ganha 1 Linha a menos no 1º turno
  linhaMaxima: 7,
  maoInicial: 4,
  compraPorTurno: 2,
  compraNoPrimeiroTurno: { quemComeca: 1, quemNaoComeca: 3 }, // compra no 1º turno de cada lado (depois: compraPorTurno)
  maoMaxima: 7,
  copiasPorCarta: 2, // 3 bonecos × 3 cartas × 2 cópias = 18 cartas no baralho
  custoDaTroca: 1, // trocar dois bonecos de lugar custa 1 Linha
  fiapoCompra: 1, // descartar fiapo (carta de boneco caído) custa 0, compra 1 e o fiapo sai da luta
  tesouraInicio: 9, // a partir deste turno a Tesoura corta todos
  tesouraCorte: 0.10, // 10% da vida máxima por turno
  turnoFinal: 12, // no fim deste turno vence a maior soma de % de vida
  escudoSomeNoTurnoDoDono: false, // true: escudo some no começo do próximo turno do dono; false: fica até ser gasto
  escudoMaximo: 100, // escudo acumulado num boneco nunca passa disto
  fioSoltoBonus: 0.20, // Fio Solto: +20% de dano recebido
  critico: 0.50, // golpe crítico: +50% de dano (chance = Rapidez do boneco, em %)
  firmezaMaxima: 30, // Firmeza (em %) nunca reduz mais que isto
  maxComandosPorTurno: 40, // trava: no máximo 40 jogadas/trocas/fiapos por turno; depois só passar (parecer de segurança nº 1)
}

// ---------------------------------------------------------------------------------------------
// 3. Raridade das partes: dá mais OPÇÕES, não números muito maiores. Teto: +10% de valor sobre a Comum.
//    O fator multiplica Vida, Rapidez e Firmeza que a parte dá. Cartas são iguais em qualquer raridade.
// ---------------------------------------------------------------------------------------------
export const RARIDADES = {
  comum: { nome: 'Comum', fator: 1.00 },
  incomum: { nome: 'Incomum', fator: 1.03 },
  rara: { nome: 'Rara', fator: 1.06 },
  lendaria: { nome: 'Lendária', fator: 1.10 },
}

// ---------------------------------------------------------------------------------------------
// 4. Cartas (24: 4 por tipo, 8 de Cabeça, 8 de Braços, 8 de Pernas)
//    alvo: 'frente' (primeiro inimigo de pé a partir da Frente) · 'inimigo' (Alcance: qualquer inimigo de pé)
//          'aliado' (qualquer aliado de pé, inclusive ele) · 'vizinho' (aliado ao lado; se não houver, sem alvo)
//          'outroAliado' (outro aliado que ainda não caiu) · 'nenhum' · 'todos' (todos os inimigos de pé)
//    texto: o que a tela mostra. NUNCA escreva número no texto: use {i.campo} (campo do efeito i), {c.campo}
//          (da condição) ou {campo} (bordado); com % no fim vira porcentagem. Assim a tela mostra o número que o
//          servidor usa (função textoDaCarta / textoDoBordado em shared/batalha.js).
//    efeitos (em ordem): dano · quebraEscudo · fioSolto · empurra · puxa · escudo · veu · compra · cura ·
//          autoDano · ganhaLinha · roubaLinha · trocaComAlvo
// ---------------------------------------------------------------------------------------------
export const CARTAS = {
  // Jeans
  botaozada: { nome: 'Botãozada', parte: 'cabeca', tipo: 'jeans', linha: 1, alvo: 'frente', texto: '{0.valor} de dano na Frente.',
    efeitos: [{ tipo: 'dano', valor: 75 }] },
  testada_de_brim: { nome: 'Testada de Brim', parte: 'cabeca', tipo: 'jeans', linha: 2, alvo: 'frente', texto: '{0.valor} de dano na Frente; ele toma {1.valor}.',
    efeitos: [{ tipo: 'dano', valor: 115 }, { tipo: 'autoDano', valor: 15 }] },
  rasgo: { nome: 'Rasgo', parte: 'bracos', tipo: 'jeans', linha: 1, alvo: 'frente', texto: '{0.valor} de dano e Fio Solto no alvo por {1.turnos} turnos.',
    efeitos: [{ tipo: 'dano', valor: 45 }, { tipo: 'fioSolto', turnos: 2 }] },
  rebite_solto: { nome: 'Rebite Solto', parte: 'pernas', tipo: 'jeans', linha: 1, alvo: 'frente', texto: 'Arranca o escudo do alvo e dá {1.valor} de dano.',
    efeitos: [{ tipo: 'quebraEscudo' }, { tipo: 'dano', valor: 55 }] },
  // Couro
  mordida_de_ziper: { nome: 'Mordida de Zíper', parte: 'cabeca', tipo: 'couro', linha: 2, alvo: 'frente', texto: '{0.valor} de dano; +{0.bonusFioSolto%} se o alvo tem Fio Solto.',
    efeitos: [{ tipo: 'dano', valor: 85, bonusFioSolto: 0.5 }] },
  laco_de_cadarco: { nome: 'Laço de Cadarço', parte: 'bracos', tipo: 'couro', linha: 1, alvo: 'inimigo', texto: 'Alcance; {0.valor} de dano e puxa o alvo uma casa para a frente.',
    efeitos: [{ tipo: 'dano', valor: 45 }, { tipo: 'puxa' }] },
  pisao_de_tamanco: { nome: 'Pisão de Tamanco', parte: 'pernas', tipo: 'couro', linha: 2, alvo: 'frente', texto: '{0.valor} de dano; +{0.bonusSeMenosVida} se ele tem menos vida que o alvo.',
    efeitos: [{ tipo: 'dano', valor: 75, bonusSeMenosVida: 30 }] },
  sola_grossa: { nome: 'Sola Grossa', parte: 'pernas', tipo: 'couro', linha: 1, alvo: 'nenhum', texto: 'Escudo de {0.valor} em si.',
    efeitos: [{ tipo: 'escudo', valor: 70, em: 'si' }] },
  // Seda
  desfiar: { nome: 'Desfiar', parte: 'cabeca', tipo: 'seda', linha: 3, alvo: 'todos', texto: '{0.valor} de dano em todos os inimigos de pé.',
    efeitos: [{ tipo: 'dano', valor: 80 }] },
  agulha_longa: { nome: 'Agulha Longa', parte: 'bracos', tipo: 'seda', linha: 1, alvo: 'inimigo', texto: 'Alcance; {0.valor} de dano em qualquer lugar.',
    efeitos: [{ tipo: 'dano', valor: 60 }] },
  lacada_fina: { nome: 'Laçada Fina', parte: 'bracos', tipo: 'seda', linha: 2, alvo: 'inimigo', texto: 'Alcance; {0.valor} de dano; +{0.bonusTras} se o alvo está atrás.',
    efeitos: [{ tipo: 'dano', valor: 90, bonusTras: 35 }] },
  passo_de_cetim: { nome: 'Passo de Cetim', parte: 'pernas', tipo: 'seda', linha: 0, alvo: 'outroAliado', texto: 'Troca de lugar com um aliado e compra {1.qtd}.',
    efeitos: [{ tipo: 'trocaComAlvo' }, { tipo: 'compra', qtd: 1 }] },
  // Lã
  gorro_felpudo: { nome: 'Gorro Felpudo', parte: 'cabeca', tipo: 'la', linha: 1, alvo: 'nenhum', texto: 'Escudo de {0.valor} em todos os aliados.',
    efeitos: [{ tipo: 'escudo', valor: 45, em: 'todos' }] },
  abraco_apertado: { nome: 'Abraço Apertado', parte: 'bracos', tipo: 'la', linha: 1, alvo: 'vizinho', texto: 'Escudo de {0.valor} em si e {1.valor} num vizinho.',
    efeitos: [{ tipo: 'escudo', valor: 60, em: 'si' }, { tipo: 'escudo', valor: 40, em: 'alvo' }] },
  novelo_rolante: { nome: 'Novelo Rolante', parte: 'pernas', tipo: 'la', linha: 2, alvo: 'frente', texto: '{0.valor} de dano e empurra o alvo uma casa para trás.',
    efeitos: [{ tipo: 'dano', valor: 95 }, { tipo: 'empurra' }] },
  rolo_de_la: { nome: 'Rolo de Lã', parte: 'pernas', tipo: 'la', linha: 2, alvo: 'frente', texto: '{0.valor} de dano; o rival perde {1.valor} de Linha guardada.',
    efeitos: [{ tipo: 'dano', valor: 85 }, { tipo: 'roubaLinha', valor: 1 }] },
  // Feltro
  feltro_pesado: { nome: 'Feltro Pesado', parte: 'cabeca', tipo: 'feltro', linha: 2, alvo: 'frente', texto: '{0.valor} de dano; ele se cura em {1.valor}.',
    efeitos: [{ tipo: 'dano', valor: 90 }, { tipo: 'cura', valor: 25, em: 'si' }] }, // dano 100 → 90 em 15/11 (com a mesa, o robô parou de travar no laço do Ponto Cruz e o Feltro subiu a 56,9%)
  ponto_cruz: { nome: 'Ponto Cruz', parte: 'bracos', tipo: 'feltro', linha: 0, alvo: 'nenhum', texto: 'Compra {0.qtd}; se for do tipo dele, +{0.linhaSeMesmoTipo} de Linha.',
    efeitos: [{ tipo: 'compra', qtd: 1, linhaSeMesmoTipo: 1 }] },
  alfinete_de_feltro: { nome: 'Alfinete de Feltro', parte: 'bracos', tipo: 'feltro', linha: 1, alvo: 'inimigo', texto: 'Alcance; {0.valor} de dano.',
    efeitos: [{ tipo: 'dano', valor: 65 }] },
  remendo_rapido: { nome: 'Remendo Rápido', parte: 'pernas', tipo: 'feltro', linha: 2, alvo: 'aliado', texto: 'Cura {0.valor} num aliado.',
    efeitos: [{ tipo: 'cura', valor: 90, em: 'alvo' }] },
  // Tule
  veu_de_tule: { nome: 'Véu de Tule', parte: 'cabeca', tipo: 'tule', linha: 1, alvo: 'nenhum', texto: 'O próximo ataque contra ele erra (garantido).',
    efeitos: [{ tipo: 'veu' }] },
  grito_abafado: { nome: 'Grito Abafado', parte: 'cabeca', tipo: 'tule', linha: 0, alvo: 'nenhum', texto: '+{0.valor} de Linha agora; ele perde {1.valor} de vida.',
    efeitos: [{ tipo: 'ganhaLinha', valor: 1 }, { tipo: 'autoDano', valor: 20 }] },
  nevoa_de_tule: { nome: 'Névoa de Tule', parte: 'bracos', tipo: 'tule', linha: 2, alvo: 'inimigo', texto: 'Alcance; {0.valor} de dano e Fio Solto no alvo por {1.turnos} turnos.',
    efeitos: [{ tipo: 'dano', valor: 75 }, { tipo: 'fioSolto', turnos: 2 }] },
  ultimo_ponto: { nome: 'Último Ponto', parte: 'pernas', tipo: 'tule', linha: 1, alvo: 'frente', texto: 'Só com menos de {c.limite%} de vida ou no Último Fio: {0.valor} de dano.',
    condicao: { tipo: 'vidaBaixa', limite: 0.25 }, efeitos: [{ tipo: 'dano', valor: 150 }] },
}

// ---------------------------------------------------------------------------------------------
// 5. Bordados (passivas). Não são cartas.
// ---------------------------------------------------------------------------------------------
export const BORDADOS = {
  espinho: { nome: 'Espinho', texto: 'Devolve {valor} de dano a quem o golpeia com carta.', valor: 15 },
  remendo_vivo: { nome: 'Remendo Vivo', texto: 'Cura {valor} no começo de cada turno do dono.', valor: 15 },
  botao_reserva: { nome: 'Botão Reserva', texto: 'O primeiro golpe que recebe tira {valor} a menos.', valor: 40 },
  agulha_afiada: { nome: 'Agulha Afiada', texto: '+{valor%} de dano com cartas de Braços.', valor: 0.10 },
  pe_de_chumbo: { nome: 'Pé de Chumbo', texto: 'Recebe {valor} a menos por golpe e não pode ser empurrado nem puxado.', valor: 8 },
  olho_de_vidro: { nome: 'Olho de Vidro', texto: '+{valor}% de chance de crítico.', valor: 8 },
  rancor: { nome: 'Rancor', texto: '+{valor%} de dano enquanto está no Último Fio.', valor: 0.30 },
  bolso_de_linha: { nome: 'Bolso de Linha', texto: 'Quando cai de vez, o time ganha {valor} de Linha.', valor: 2 },
}

// ---------------------------------------------------------------------------------------------
// 6. Catálogo de partes. A raridade vem de cada boneco (ver RARIDADES); aqui está o valor da Comum.
//    Tronco: define o tipo e os atributos base. Cabeça, Braços, Pernas: 1 carta + um pouco de atributo.
//    Bordado: 1 passiva. "apelido" monta o nome do boneco (ex.: "Zíper-Cadarço-Tamanco").
// ---------------------------------------------------------------------------------------------
export const PARTES = {
  // Troncos (2 por tipo: pesado e ligeiro)
  tr_jeans_rebitado: { slot: 'tronco', nome: 'Tronco de Jeans Rebitado', tipo: 'jeans', vida: 135, rapidez: 6, firmeza: 6 },
  tr_jeans_surrado: { slot: 'tronco', nome: 'Tronco de Jeans Surrado', tipo: 'jeans', vida: 115, rapidez: 9, firmeza: 3 },
  tr_seda_bordada: { slot: 'tronco', nome: 'Tronco de Seda Bordada', tipo: 'seda', vida: 145, rapidez: 9, firmeza: 3 },
  tr_seda_rota: { slot: 'tronco', nome: 'Tronco de Seda Rota', tipo: 'seda', vida: 135, rapidez: 6, firmeza: 5 },
  tr_la_embolada: { slot: 'tronco', nome: 'Tronco de Lã Embolada', tipo: 'la', vida: 150, rapidez: 4, firmeza: 7 },
  tr_la_tricotada: { slot: 'tronco', nome: 'Tronco de Lã Tricotada', tipo: 'la', vida: 130, rapidez: 7, firmeza: 5 },
  tr_feltro_duro: { slot: 'tronco', nome: 'Tronco de Feltro Duro', tipo: 'feltro', vida: 145, rapidez: 5, firmeza: 7 },
  tr_feltro_manchado: { slot: 'tronco', nome: 'Tronco de Feltro Manchado', tipo: 'feltro', vida: 125, rapidez: 8, firmeza: 4 },
  tr_tule_rasgado: { slot: 'tronco', nome: 'Tronco de Tule Rasgado', tipo: 'tule', vida: 115, rapidez: 10, firmeza: 2 },
  tr_tule_armado: { slot: 'tronco', nome: 'Tronco de Tule Armado', tipo: 'tule', vida: 135, rapidez: 7, firmeza: 4 },
  tr_couro_curtido: { slot: 'tronco', nome: 'Tronco de Couro Curtido', tipo: 'couro', vida: 140, rapidez: 4, firmeza: 6 },
  tr_couro_rachado: { slot: 'tronco', nome: 'Tronco de Couro Rachado', tipo: 'couro', vida: 125, rapidez: 7, firmeza: 5 },
  // Cabeças
  cab_botao: { slot: 'cabeca', nome: 'Cabeça de Botão Torto', apelido: 'Botão', carta: 'botaozada', vida: 15, rapidez: 1, firmeza: 0 },
  cab_brim: { slot: 'cabeca', nome: 'Testa de Brim', apelido: 'Brim', carta: 'testada_de_brim', vida: 20, rapidez: 0, firmeza: 1 },
  cab_ziper: { slot: 'cabeca', nome: 'Boca de Zíper', apelido: 'Zíper', carta: 'mordida_de_ziper', vida: 15, rapidez: 1, firmeza: 0 },
  cab_desfiada: { slot: 'cabeca', nome: 'Cabeça Desfiada', apelido: 'Fiapo', carta: 'desfiar', vida: 10, rapidez: 1, firmeza: 0 },
  cab_gorro: { slot: 'cabeca', nome: 'Cabeça de Gorro', apelido: 'Gorro', carta: 'gorro_felpudo', vida: 20, rapidez: 0, firmeza: 1 },
  cab_feltro: { slot: 'cabeca', nome: 'Cabeça de Feltro Duro', apelido: 'Cascudo', carta: 'feltro_pesado', vida: 20, rapidez: 0, firmeza: 1 },
  cab_veu: { slot: 'cabeca', nome: 'Rosto de Véu', apelido: 'Véu', carta: 'veu_de_tule', vida: 10, rapidez: 2, firmeza: 0 },
  cab_abafada: { slot: 'cabeca', nome: 'Boca Costurada', apelido: 'Mudo', carta: 'grito_abafado', vida: 15, rapidez: 1, firmeza: 0 },
  // Braços
  br_rasgado: { slot: 'bracos', nome: 'Braço Rasgado', apelido: 'Rasgão', carta: 'rasgo', vida: 15, rapidez: 1, firmeza: 0 },
  br_cadarco: { slot: 'bracos', nome: 'Braço de Cadarço', apelido: 'Cadarço', carta: 'laco_de_cadarco', vida: 15, rapidez: 0, firmeza: 1 },
  br_agulha: { slot: 'bracos', nome: 'Braço de Agulha', apelido: 'Agulha', carta: 'agulha_longa', vida: 10, rapidez: 2, firmeza: 0 },
  br_cetim: { slot: 'bracos', nome: 'Braço de Cetim', apelido: 'Laçada', carta: 'lacada_fina', vida: 10, rapidez: 1, firmeza: 0 },
  br_abraco: { slot: 'bracos', nome: 'Braços Compridos', apelido: 'Abraço', carta: 'abraco_apertado', vida: 20, rapidez: 0, firmeza: 1 },
  br_cruz: { slot: 'bracos', nome: 'Mão de Ponto Cruz', apelido: 'Cruz', carta: 'ponto_cruz', vida: 15, rapidez: 1, firmeza: 0 },
  br_alfinete: { slot: 'bracos', nome: 'Mão de Alfinete', apelido: 'Alfinete', carta: 'alfinete_de_feltro', vida: 10, rapidez: 1, firmeza: 0 },
  br_nevoa: { slot: 'bracos', nome: 'Manga de Tule', apelido: 'Névoa', carta: 'nevoa_de_tule', vida: 10, rapidez: 2, firmeza: 0 },
  // Pernas
  pe_rebite: { slot: 'pernas', nome: 'Perna de Rebite', apelido: 'Rebite', carta: 'rebite_solto', vida: 15, rapidez: 0, firmeza: 1 },
  pe_tamanco: { slot: 'pernas', nome: 'Perna de Tamanco', apelido: 'Tamanco', carta: 'pisao_de_tamanco', vida: 20, rapidez: 0, firmeza: 1 },
  pe_sola: { slot: 'pernas', nome: 'Bota de Sola Grossa', apelido: 'Sola', carta: 'sola_grossa', vida: 20, rapidez: 0, firmeza: 1 },
  pe_cetim: { slot: 'pernas', nome: 'Pé de Cetim', apelido: 'Cetim', carta: 'passo_de_cetim', vida: 10, rapidez: 2, firmeza: 0 },
  pe_novelo: { slot: 'pernas', nome: 'Pé de Novelo', apelido: 'Novelo', carta: 'novelo_rolante', vida: 15, rapidez: 1, firmeza: 0 },
  pe_rolo: { slot: 'pernas', nome: 'Perna de Rolo', apelido: 'Rolo', carta: 'rolo_de_la', vida: 15, rapidez: 0, firmeza: 1 },
  pe_remendo: { slot: 'pernas', nome: 'Perna Remendada', apelido: 'Remendo', carta: 'remendo_rapido', vida: 20, rapidez: 0, firmeza: 0 },
  pe_ultimo: { slot: 'pernas', nome: 'Perna de Linha Solta', apelido: 'Ponto', carta: 'ultimo_ponto', vida: 10, rapidez: 2, firmeza: 0 },
  // Bordados (o id da passiva é o mesmo de BORDADOS)
  bo_espinho: { slot: 'bordado', nome: 'Bordado de Espinho', bordado: 'espinho' },
  bo_remendo_vivo: { slot: 'bordado', nome: 'Bordado de Remendo Vivo', bordado: 'remendo_vivo' },
  bo_botao_reserva: { slot: 'bordado', nome: 'Bordado de Botão Reserva', bordado: 'botao_reserva' },
  bo_agulha_afiada: { slot: 'bordado', nome: 'Bordado de Agulha Afiada', bordado: 'agulha_afiada' },
  bo_pe_de_chumbo: { slot: 'bordado', nome: 'Bordado de Pé de Chumbo', bordado: 'pe_de_chumbo' },
  bo_olho_de_vidro: { slot: 'bordado', nome: 'Bordado de Olho de Vidro', bordado: 'olho_de_vidro' },
  bo_rancor: { slot: 'bordado', nome: 'Bordado de Rancor', bordado: 'rancor' },
  bo_bolso_de_linha: { slot: 'bordado', nome: 'Bordado de Bolso de Linha', bordado: 'bolso_de_linha' },
}

// ---------------------------------------------------------------------------------------------
// 7. Nove bonecos prontos, montados de partes. Duas raridades: Comum e Rara.
//    Cada parte é 'id@raridade'. Juntos carregam as 24 cartas (algumas em mais de um boneco).
// ---------------------------------------------------------------------------------------------
export const BONECOS_PRONTOS = {
  rasgao: { partes: { tronco: 'tr_jeans_rebitado@comum', cabeca: 'cab_botao@comum', bracos: 'br_rasgado@comum', pernas: 'pe_rebite@comum', bordado: 'bo_agulha_afiada@comum' } },
  brigao: { partes: { tronco: 'tr_jeans_surrado@rara', cabeca: 'cab_brim@rara', bracos: 'br_alfinete@rara', pernas: 'pe_sola@rara', bordado: 'bo_botao_reserva@rara' } },
  mordedor: { partes: { tronco: 'tr_couro_curtido@comum', cabeca: 'cab_ziper@comum', bracos: 'br_cadarco@comum', pernas: 'pe_tamanco@comum', bordado: 'bo_espinho@comum' } },
  pisoteador: { partes: { tronco: 'tr_couro_rachado@rara', cabeca: 'cab_botao@rara', bracos: 'br_agulha@rara', pernas: 'pe_tamanco@rara', bordado: 'bo_olho_de_vidro@rara' } },
  desfiado: { partes: { tronco: 'tr_seda_bordada@rara', cabeca: 'cab_desfiada@rara', bracos: 'br_agulha@rara', pernas: 'pe_cetim@rara', bordado: 'bo_olho_de_vidro@rara' } },
  embolado: { partes: { tronco: 'tr_la_embolada@comum', cabeca: 'cab_gorro@comum', bracos: 'br_abraco@comum', pernas: 'pe_novelo@comum', bordado: 'bo_pe_de_chumbo@comum' } },
  cascudo: { partes: { tronco: 'tr_feltro_duro@rara', cabeca: 'cab_feltro@rara', bracos: 'br_cruz@rara', pernas: 'pe_remendo@rara', bordado: 'bo_remendo_vivo@rara' } },
  assombrado: { partes: { tronco: 'tr_tule_rasgado@comum', cabeca: 'cab_veu@comum', bracos: 'br_nevoa@comum', pernas: 'pe_ultimo@comum', bordado: 'bo_rancor@comum' } },
  mudo: { partes: { tronco: 'tr_tule_armado@comum', cabeca: 'cab_abafada@comum', bracos: 'br_cetim@comum', pernas: 'pe_rolo@comum', bordado: 'bo_bolso_de_linha@comum' } },
}
