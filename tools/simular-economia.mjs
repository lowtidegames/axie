#!/usr/bin/env node
// SIMULADOR DA ECONOMIA DO POTE — Frayz (rodada 1: tarefa 2 da fila; rodada 2: economia2).
// Modelo por agentes, dia a dia, 180 dias (6 temporadas de 30 dias). Node 22, zero dependências, determinístico por semente.
//
// TODO NÚMERO AQUI É PROPOSTA. Nenhum vira regra sem o "sim" do dono. Não é o arquivo de configuração do jogo.
// Valores em "US$ ilustrativo" (unidade de conta). O preço do token é um modelo de brinquedo (pressão de compra × venda),
// só para mostrar a direção — não prevê preço nenhum. Nada aqui é promessa de lucro.
//
// Uso:
//   node tools/simular-economia.mjs                         os 3 cenários + estresse de bots, conjunto R1, semente 42
//   node tools/simular-economia.mjs --conjunto R2           o mesmo com outro conjunto de números (ver CONJUNTOS)
//   node tools/simular-economia.mjs --cenario FUGA          só um cenário
//   node tools/simular-economia.mjs --comparar [R1,R2,...]  tabela lado a lado dos conjuntos nos 4 cenários
//   node tools/simular-economia.mjs --semente 7 --escala 0.5 --json
//
// Invariante central (checado TODO dia; se quebrar, a simulação para com erro "INSOLVENCIA"):
//   pote pago ≤ entrou no pote + reserva usada − devolvido à reserva;  pote ≥ 0;  reserva ≥ 0;
//   e o dinheiro fecha: entrada externa = estúdio + pote + reserva + saldos dos jogadores + sacado.
// Saldo confiscado de conta-bot pega volta ao pote (é dinheiro que já tinha saído dele; não é emissão).

// ───────────────────────────── PARÂMETROS (todos PROPOSTA) ─────────────────────────────
// Os valores abaixo são a PROPOSTA DA RODADA 1 (conjunto "R1"). As chaves novas da rodada 2 nascem DESLIGADAS aqui
// (null/false), para o R1 continuar dando exatamente o mesmo resultado; os conjuntos novos ligam cada uma.
export const PARAMETROS = Object.freeze({
  DIAS: 180,                       // PROPOSTA: 6 temporadas
  DIAS_TEMPORADA: 30,              // decidido pelo dono (temporada de 30 dias)

  // Fatias de toda receita (soma 1)
  FATIA_POTE: 0.55,                // PROPOSTA
  FATIA_RESERVA: 0.15,             // PROPOSTA
  FATIA_ESTUDIO: 0.30,             // PROPOSTA
  // Inscrição de ranking tem divisão própria (vai quase toda para o prêmio do ranking)
  INSCRICAO_FATIA_RANKING: 0.85,   // PROPOSTA
  // Dentro do pote: quanto vai para Aventura (pago por dia) × prêmio de ranking (fim da temporada)
  POTE_FATIA_AVENTURA: 0.85,       // PROPOSTA (medido: 0,70 dava lucro demais ao top 10 do ranking)
  POTE_FATIA_RANKING: 0.15,        // PROPOSTA (+ 85% das inscrições)

  // Liberação diária do pote da Aventura e reserva amortecedora
  LIBERACAO_DIA: 0.10,             // PROPOSTA: libera 10% do saldo da Aventura por dia
  TETO_POR_PONTO: 0.04,            // PROPOSTA: US$ por ponto de Aventura (teto, mesmo com pote cheio)
  PISO_RESERVA: 0.80,              // PROPOSTA: reserva completa até 80% da média de 7 dias
  RESERVA_USO_MAX_DIA: 0.05,       // PROPOSTA: reserva solta no máx. 5% do próprio saldo por dia
  RESERVA_TETO_DIAS: 30,           // PROPOSTA: acima de 30 dias de pagamento, o excesso volta ao pote
  SOBRA_PARA_RESERVA: 0.50,        // PROPOSTA: no fim da temporada, metade da sobra da Aventura vai à reserva

  // Bonecos
  PRECO_BONECO_COMUM: 8,           // PROPOSTA: kit inicial = 3 comuns = US$ 24
  PRECO_BONECO_ORIGEM: 25,         // PROPOSTA: boneco de origem (baleia), rendimento maior
  REND_COMUM: 1.0,                 // rendimento de Aventura (pontos por luta) — hipótese de modelo
  REND_ORIGEM: 1.3,
  REND_RARA: 1.5,
  REND_TETO: 1.6,                  // coerente com "raridade dá opções, teto de força"
  REND_UM_BONECO: 0.35,            // conta com 1 boneco só (farmador sem time) mal anda na Aventura
  CARRETEL_VOLTAS: 5,              // PROPOSTA: cada boneco costura no máx. 5 vezes
  COSTURA_BASE: 4,                 // PROPOSTA: US$ da 1ª costura
  COSTURA_FATOR: 1.25,             // PROPOSTA: custo × 1,25 a cada volta já gasta (soma dos dois pais)
  RETALHO_DESCONTO: 1,             // PROPOSTA: cada aposentado vira 1 Retalho Honrado = US$ 1 a menos numa costura
  DESGASTE_MAX: 1200,              // PROPOSTA: lutas até a Aposentadoria (~60–75 dias de uso)
  ENERGIA_DIARIA: 20,              // PROPOSTA: lutas de Aventura por dia (teto)

  // Mercado e aluguel
  TAXA_MERCADO: 0.06,              // PROPOSTA
  ALUGUEL_DONO: 0.30,              // PROPOSTA: do ganho do time alugado
  ALUGUEL_FARMADOR: 0.65,          // PROPOSTA
  ALUGUEL_TAXA: 0.05,              // PROPOSTA: taxa do jogo (receita)
  MAX_TIMES_ALUGUEL_BALEIA: 8,     // limite por baleia

  // Ranking, leilão, enfeites
  INSCRICAO_RANKING: 20,           // PROPOSTA: US$ por temporada
  RANKING_PREMIADOS_FRAC: 0.25,    // PROPOSTA: 25% dos inscritos ganham algo
  RANKING_PREMIADOS_MAX: 100,
  RANKING_EXPOENTE: 0.9,           // prêmio ∝ 1/posição^0,9 (maior = mais concentrado no topo)
  LEILOES_POR_BALEIAS: 5,          // 1 leilão de rara por temporada a cada 5 baleias (mín. 1, máx. 20)
  ENFEITE_MEDIO: 3,
  ENFEITE_BALEIA_FRAC: 0.05,       // baleia gasta 5% da riqueza da temporada em enfeites (70% delas)

  // Saque: sacar custa mais que reinvestir (reinvestir = 0%)
  TAXA_SAQUE_FAIXAS: [[0, 0.25], [15, 0.15], [45, 0.10], [90, 0.06]], // PROPOSTA: [idade da conta em dias, taxa]
  SAQUE_MINIMO: 5,

  // Operação (ilustrativo)
  CUSTO_FIXO_DIA: 150,             // ILUSTRATIVO: servidor + equipe mínima
  CUSTO_POR_ATIVO_DIA: 0.01,       // ILUSTRATIVO
  LIQUIDEZ_TOKEN: 20000,           // ILUSTRATIVO: amortece o índice do token (modelo de brinquedo)

  // Comportamento (hipóteses do modelo)
  MIX: { baleia: 0.03, medio: 0.47, farmador: 0.50 },
  SAIDA_DIA: { baleia: 0.004, medio: 0.012, farmador: 0.02, bot: 0.01 },
  SAIDA_SEM_TIME: 0.05,            // farmador sem time alugado há > 5 dias
  PESO_SAIDA_FUGA: { baleia: 0.5, medio: 1, farmador: 1.5, bot: 1 },
  USO_ENERGIA: { baleia: 0.7, medio: 0.8, farmador: 1.0, bot: 1.0 },
  VENDE_TOKEN: { baleia: 0.3, medio: 0.6, farmador: 0.95, bot: 1.0 },
  MEDIO_INSCREVE: 0.25,
  MEDIO_REPOE_COM_DINHEIRO: 0.6,
  RIQUEZA_BALEIA_MEDIANA: 500,     // US$ por temporada que a baleia topa gastar (lognormal)
  RIQUEZA_BALEIA_SIGMA: 0.8,

  // ── RODADA 2 (desligado no R1) ──
  // (a) farmador entra de graça: não compra boneco; só joga a Aventura com time alugado (fila visível).
  FARMADOR_GRATIS: false,
  // (b) estúdio menor no começo, subindo com o volume: [receita acumulada em US$, fatia do estúdio]. O que o estúdio
  //     deixa de pegar vai ao pote (a reserva fica fixa em FATIA_RESERVA).
  FATIA_ESTUDIO_FAIXAS: null,
  // (b) divisão própria por fonte, ex.: { 'taxa de saque': { pote: 0.2, reserva: 0.1, estudio: 0.7 } }
  FATIA_POR_FONTE: null,
  // (c) inscrição por faixas: [{ nome, preco, pesoPote, quem: { baleia, medio, farmador } }]
  //     pesoPote = parte da fatia de ranking do pote geral que vai a esta faixa ("prêmio descendo" = mais peso embaixo)
  //     quem = peso de escolha de cada tipo (quem já se inscreveria escolhe uma faixa por esses pesos; farmador só se tiver time próprio)
  INSCRICAO_FAIXAS: null,
  // (c) passe de temporada: só enfeite/prestígio, NÃO dá ganho no pote. { preco, baleia, medio, farmador } = chance de comprar
  PASSE: null,
  // (c) reparo opcional: dono paga para zerar o desgaste do boneco em vez de comprar outro.
  //     { fator } = preço por luta restaurada ÷ (preço do comum ÷ DESGASTE_MAX). 1,0 = mesmo custo que comprar novo.
  REPARO: null,
  // (d) ganho por RESULTADO: só vitória pontua; fase mais difícil paga mais; sequência de vitórias dá bônus.
  //     fases[i].p = taxa de vitória MEDIDA no motor de batalha (tools/simular-batalha.mjs) por nível de jogador.
  RESULTADO: null,
  HABILIDADE_MIX: { bom: 0.25, mediano: 0.5, fraco: 0.25 }, // hipótese: nível dos jogadores humanos
  BOT_IA: 'fraco',                 // 'fraco' = robô ganancioso (bot simples); 'bom' = robô planejador (o código é público!)
  // (e) anti-bot: { passaLimite, deteccaoDia, esperaSaque }
  //     passaLimite = fração das contas-bot que passam 1 conta por carteira + dispositivo + verificação
  //     deteccaoDia = chance por dia de a detecção de comportamento pegar uma conta-bot (saldo volta ao pote)
  //     esperaSaque = dias de espera do 1º saque (vale para todos)
  ANTIBOT: null,
  // (a) baleia locadora: compra times para alugar quando há fila e o retorno compensa.
  //     { paybackMax: dias, investeFrac: × riqueza da temporada, maxTimes, porDia: times comprados por baleia por dia }
  LOCADORA: null,
  // (f) formatura: parte dos farmadores junta saldo e compra time próprio no mercado (sem taxa: é reinvestir).
  //     { frac: fração dos farmadores que tentam, folga: US$ que guarda além do preço }
  FORMATURA: null,
  // (f) criadores: médios costuram para vender com mais frequência. { medioCostura: chance por dia }
  CRIADORES: null,
  // (a) lotação da Aventura alugada: o jogo só abre vagas de aluguel enquanto o pote sustenta o ganho-alvo por time/dia
  //     (ganho bruto do time, antes da divisão). Quem fica na fila joga o modo treino (sem prêmio). Fila por ordem de chegada;
  //     quem já tinha vaga ontem continua. { alvoTimeDia: US$ }
  LOTACAO: null,
  // (a/g) bonecos de origem que a baleia compra ao entrar: { min, max, porRiqueza: US$ de riqueza por time de 3 }
  //     (R1: 9 a 30, 1 time a cada US$ 40). Com a loja de "time de aluguel", a baleia compra o resto como times comuns.
  BALEIA_ORIGEM: null,
})

// ───────────────────────────── CONJUNTOS (todos PROPOSTA) ─────────────────────────────
// Cada conjunto é só uma lista de trocas sobre PARAMETROS. "R1" = proposta da rodada 1 sem mudança nenhuma.
// Fases medidas no motor (1.000 lutas por célula, semente "eco2-fases", time do jogador comum):
//   F1 inimigo ganancioso/comum · F2 ganancioso/rara · F3 planejador/comum · F4 planejador/rara · F5 planejador/lendária
//   vitória do robô ganancioso (bot simples):  50,0 · 43,1 · 32,4 · 25,5 · 22,1 %
//   vitória do robô planejador (jogador bom):  66,5 · 60,1 · 49,1 · 39,5 · 39,3 %
const P_FRACO = [0.500, 0.431, 0.324, 0.255, 0.221]
const P_BOM = [0.665, 0.601, 0.491, 0.395, 0.393]
const P_MED = P_FRACO.map((x, i) => (x + P_BOM[i]) / 2)
const fases = (pesos) => pesos.map((peso, i) => ({ peso, p: { fraco: P_FRACO[i], mediano: P_MED[i], bom: P_BOM[i] } }))

const RESULTADO_PROPOSTO = { fases: fases([1.0, 1.25, 1.8, 2.4, 2.8]), seqK: 3, seqBonus: 0.5 }
const FAIXAS_PROPOSTAS = [
  { nome: 'bronze', preco: 5, pesoPote: 0.5, quem: { medio: 0.75, farmador: 1 } },
  { nome: 'prata', preco: 25, pesoPote: 0.3, quem: { baleia: 0.35, medio: 0.25 } },
  { nome: 'ouro', preco: 80, pesoPote: 0.2, quem: { baleia: 0.65 } },
]
const ANTIBOT_PROPOSTO = { passaLimite: 0.35, deteccaoDia: 0.03, esperaSaque: 7 }

export const CONJUNTOS = Object.freeze({
  R1: { _nome: 'Rodada 1 (proposta anterior)' },
  // ── cada caminho isolado sobre o R1 ──
  A_GRATIS: {
    _nome: '(a) farmador de graça + baleia locadora',
    FARMADOR_GRATIS: true, MAX_TIMES_ALUGUEL_BALEIA: 40, ALUGUEL_DONO: 0.35, ALUGUEL_FARMADOR: 0.60,
    LOCADORA: { paybackMax: 40, investeFrac: 1.0, maxTimes: 40, porDia: 1 },
  },
  B_FATIA: {
    _nome: '(b) pote 65% com estúdio subindo + saque para o estúdio',
    FATIA_ESTUDIO_FAIXAS: [[0, 0.15], [150000, 0.20], [400000, 0.25]], FATIA_RESERVA: 0.12,
    FATIA_POR_FONTE: { 'taxa de saque': { pote: 0.2, reserva: 0.1, estudio: 0.7 } },
  },
  C_FONTES: {
    _nome: '(c) faixas de ranking + passe + reparo + leilão maior',
    INSCRICAO_FAIXAS: FAIXAS_PROPOSTAS, PASSE: { preco: 10, baleia: 0.8, medio: 0.15, farmador: 0.03 },
    REPARO: { fator: 0.9 }, LEILOES_POR_BALEIAS: 3, ENFEITE_BALEIA_FRAC: 0.07,
  },
  D_RESULTADO: { _nome: '(d) ganho por resultado (fases + sequência)', RESULTADO: RESULTADO_PROPOSTO },
  E_ANTIBOT: {
    _nome: '(e) anti-bot: limite de contas + detecção + espera + taxa nova alta',
    ANTIBOT: ANTIBOT_PROPOSTO, TAXA_SAQUE_FAIXAS: [[0, 0.30], [15, 0.15], [45, 0.10], [90, 0.06]],
  },
  F_MERCADO: {
    _nome: '(f) mercado: formatura do farmador + criadores',
    FORMATURA: { frac: 0.35, folga: 2 }, CRIADORES: { medioCostura: 0.04 },
  },
  G_ACHATADO: { _nome: '(g) ranking achatado (40% premiados, expoente 0,5)', RANKING_PREMIADOS_FRAC: 0.40, RANKING_EXPOENTE: 0.5 },
  G_CONCENTRADO: { _nome: '(g) ranking concentrado (10% premiados, expoente 1,3)', RANKING_PREMIADOS_FRAC: 0.10, RANKING_EXPOENTE: 1.3 },
  H_LOTACAO: {
    _nome: '(extra) farmador de graça + lotação (vagas só enquanto o pote paga US$ 1,20/time/dia)',
    FARMADOR_GRATIS: true, MAX_TIMES_ALUGUEL_BALEIA: 40, ALUGUEL_DONO: 0.35, ALUGUEL_FARMADOR: 0.60, LOTACAO: { alvoTimeDia: 1.2 },
  },
  I_VIDA: { _nome: '(extra) desgaste 1.800 lutas + dono 40%', DESGASTE_MAX: 1800, ALUGUEL_DONO: 0.40, ALUGUEL_FARMADOR: 0.55 },
  // ── o melhor conjunto (proposta da rodada 2) ──
  R2: {
    _nome: 'Rodada 2 — proposta (a+b+c+d+e+f + desgaste 1.800)',
    FARMADOR_GRATIS: true, MAX_TIMES_ALUGUEL_BALEIA: 40, ALUGUEL_DONO: 0.40, ALUGUEL_FARMADOR: 0.55, ALUGUEL_TAXA: 0.05,
    DESGASTE_MAX: 1800,
    LOCADORA: { paybackMax: 40, investeFrac: 1.0, maxTimes: 40, porDia: 1 },
    FATIA_ESTUDIO_FAIXAS: [[0, 0.15], [150000, 0.20], [400000, 0.25]], FATIA_RESERVA: 0.12,
    FATIA_POR_FONTE: { 'taxa de saque': { pote: 0.2, reserva: 0.1, estudio: 0.7 } },
    INSCRICAO_FAIXAS: FAIXAS_PROPOSTAS, PASSE: { preco: 10, baleia: 0.8, medio: 0.15, farmador: 0.03 },
    REPARO: { fator: 0.9 }, LEILOES_POR_BALEIAS: 3, ENFEITE_BALEIA_FRAC: 0.07,
    RESULTADO: RESULTADO_PROPOSTO,
    ANTIBOT: ANTIBOT_PROPOSTO, TAXA_SAQUE_FAIXAS: [[0, 0.30], [15, 0.15], [45, 0.10], [90, 0.06]],
    FORMATURA: { frac: 0.35, folga: 2 }, CRIADORES: { medioCostura: 0.04 },
    RANKING_PREMIADOS_FRAC: 0.40, RANKING_EXPOENTE: 0.7,
  },
})
// Variações do R2 para o dono escolher o lado (mesmo R2, só aluguel e desgaste mudam):
//   R2_FARMADOR: mais para quem joga (dono 35% · farmador 60% · desgaste 1.200)
//   R2_BALEIA:   mais para quem investe em times (dono 45% · farmador 50% · desgaste 2.400)
export const VARIACOES = Object.freeze({
  R2_FARMADOR: { base: 'R2', trocas: { ALUGUEL_DONO: 0.35, ALUGUEL_FARMADOR: 0.60, DESGASTE_MAX: 1200 } },
  R2_BALEIA: { base: 'R2', trocas: { ALUGUEL_DONO: 0.45, ALUGUEL_FARMADOR: 0.50, DESGASTE_MAX: 2400 } },
})

/** Junta PARAMETROS + trocas do conjunto (+ trocas extras). Aceita "R2+BOT_FORTE" (bots com o robô bom). */
export function conjunto(nome = 'R1', extra = {}) {
  const [base, ...mods] = String(nome).split('+')
  const v = VARIACOES[base]
  const c = CONJUNTOS[v ? v.base : base]
  if (!c) throw new Error('conjunto desconhecido: ' + nome + ' (há: ' + [...Object.keys(CONJUNTOS), ...Object.keys(VARIACOES)].join(', ') + ')')
  const { _nome, ...trocas } = c
  const p = { ...trocas, ...(v ? v.trocas : {}) }
  for (const m of mods) {
    if (m === 'BOT_FORTE') p.BOT_IA = 'bom'
    else if (m === 'SEM_ANTIBOT') p.ANTIBOT = null
    else throw new Error('modificador desconhecido: ' + m + ' (há: BOT_FORTE, SEM_ANTIBOT)')
  }
  return { ...p, ...extra }
}

// ───────────────────────────── CENÁRIOS ─────────────────────────────
// alvo(d) = jogadores ativos desejados no dia d (antes da escala). bots = fração das contas novas que é fazenda de bots.
export const CENARIOS = Object.freeze({
  ENCHENTE: { nome: 'ENCHENTE', bots: 0, alvo: (d) => (d < 60 ? 150 + 4850 * (d / 60) ** 1.6 : 5000) },
  ESTAVEL: { nome: 'ESTÁVEL', bots: 0, alvo: (d) => (d < 21 ? 150 + 1350 * (d / 21) : 1500) },
  FUGA: {
    nome: 'FUGA', bots: 0,
    alvo: (d) => (d < 45 ? 150 + 3850 * (d / 45) ** 1.3 : d < 75 ? 4000 * (1 - 0.7 * (d - 45) / 30) : 1200 * Math.max(0.6, 1 - 0.004 * (d - 75))),
  },
  ESTRESSE_BOTS: { nome: 'ESTRESSE 30% bots', bots: 0.30, alvo: (d) => (d < 21 ? 150 + 1350 * (d / 21) : 1500) },
})

// ───────────────────────────── SORTEIO COM SEMENTE ─────────────────────────────
export function criarSorteio(semente) {
  let a = (semente >>> 0) || 1
  const prox = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    u: prox,
    entre: (x, y) => x + (y - x) * prox(),
    normal: () => { const u1 = prox() || 1e-12; return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * prox()) },
  }
}

export class Insolvencia extends Error {}

const EPS = 1e-6

// ───────────────────────────── INVARIANTES ─────────────────────────────
// Devolve null se as contas fecham, ou o motivo do erro. Pura: o teste prova que ela pega cada tipo de furo.
export function verificarContas(C, somaSaldos, algumSaldoNegativo = false) {
  const pote = C.poteAventura + C.poteRanking
  const tol = 1e-6 * Math.max(1, C.receita, C.externo)
  if (C.poteAventura < -EPS || C.poteRanking < -EPS) return 'pote negativo'
  if (C.reserva < -EPS) return 'reserva negativa'
  if (C.pagoPote > C.entrouPote + C.reservaParaPote - C.poteParaReserva + EPS) return 'pote pagou mais do que entrou'
  if (Math.abs(pote - (C.entrouPote + C.reservaParaPote - C.poteParaReserva - C.pagoPote)) > tol) return 'conta do pote não fecha'
  if (Math.abs(C.reserva - (C.entrouReserva + C.poteParaReserva - C.reservaParaPote)) > tol) return 'conta da reserva não fecha'
  if (algumSaldoNegativo) return 'saldo de jogador negativo'
  const lado = C.estudio + pote + C.reserva + somaSaldos + C.sacadoLiq
  if (Math.abs(C.externo - lado) > tol) return `dinheiro não fecha (${C.externo.toFixed(2)} vs ${lado.toFixed(2)})`
  return null
}

/** Fator de ganho por luta de cada nível no modo RESULTADO (o jogador escolhe a fase que mais paga para ele).
 *  Normalizado: o mediano = 1. Devolve { fraco, mediano, bom, fase: {nível: índice da fase escolhida} }. */
export function fatoresResultado(R) {
  const val = (n) => {
    let melhor = 0, fase = 0
    R.fases.forEach((f, i) => {
      const p = f.p[n]
      const v = f.peso * (p + (R.seqBonus || 0) * p ** (R.seqK || 3))
      if (v > melhor) { melhor = v; fase = i }
    })
    return { v: melhor, fase }
  }
  const m = val('mediano')
  const out = { fase: {} }
  for (const n of ['fraco', 'mediano', 'bom']) { const x = val(n); out[n] = x.v / m.v; out.fase[n] = x.fase }
  return out
}

// ───────────────────────────── SIMULAÇÃO ─────────────────────────────
export function simular(cenario, opcoes = {}) {
  const P = { ...PARAMETROS, ...(opcoes.params || {}) }
  const cen = typeof cenario === 'string' ? CENARIOS[cenario] : cenario
  if (!cen) throw new Error('cenário desconhecido: ' + cenario)
  const escala = opcoes.escala ?? 1
  const R = criarSorteio(opcoes.semente ?? 42)
  // 2º fluxo de sorteio, só para as regras da rodada 2: assim o R1 continua idêntico ao da rodada 1.
  const R2 = criarSorteio(((opcoes.semente ?? 42) ^ 0x5bd1e995) >>> 0)
  const DIAS = opcoes.dias ?? P.DIAS
  const FR = P.RESULTADO ? fatoresResultado(P.RESULTADO) : null
  const AB = P.ANTIBOT

  const agentes = []
  let ativos = []
  let mercado = [] // {boneco, vendedor}
  let fatorMercado = 1.0
  let compras7 = [] // compras no mercado por dia (últimos 7)

  // Contas do dinheiro (US$ ilustrativo)
  const C = {
    externo: 0, receita: 0, estudio: 0, custos: 0,
    poteAventura: 0, poteRanking: 0, reserva: 0,
    entrouPote: 0, entrouReserva: 0, reservaParaPote: 0, poteParaReserva: 0, pagoPote: 0,
    sacadoLiq: 0, taxaSaque: 0, confiscado: 0,
  }
  // Faixas de ranking (R1 = uma faixa só, com tudo)
  const FAIXAS = P.INSCRICAO_FAIXAS || [{ nome: 'única', preco: P.INSCRICAO_RANKING, pesoPote: 1 }]
  const poteFaixa = FAIXAS.map(() => 0)
  // Medidas da rodada 2
  const M = { donoCredito: 0, timeDias: 0, timeDiasAlugados: 0, custoTimes: 0, botsBarrados: 0, botsTentados: 0, botsBanidos: 0, timesComprados: 0, formaturas: 0, reparos: 0, vpHist: [], timeDiasHist: [], donoHist: [] }
  const ontem = { lib: 0, p0: 0, pbar: 0 } // para a lotação: liberação, pontos de quem joga com time próprio, pontos médios de um time alugado

  let preco = 1.0
  const fluxoCompra = [], fluxoVenda = [] // últimos 30 dias (índice de pressão do token)
  const historicoLib = [] // liberação final por dia
  const historicoPago = []
  const temporadas = []
  let T = novaTemp(0)
  let invariantesChecados = 0
  const registro = []
  const porFonte = {}
  let nascimentos = 0

  function novaTemp(i) {
    return {
      i, externo: 0, receita: 0, entrouPote: 0, pagoPote: 0, pagoBots: 0, nasc: 0, apos: 0,
      dias: { baleia: 0, medio: 0, farmador: 0, bot: 0 }, ganho: { baleia: 0, medio: 0, farmador: 0, bot: 0 },
      farmSemTimeDias: 0, ativosMax: 0, reservaUsada: 0, diasNoTeto: 0,
    }
  }

  // ── dinheiro ──
  function fatias(fonte) {
    if (P.FATIA_POR_FONTE && P.FATIA_POR_FONTE[fonte]) return P.FATIA_POR_FONTE[fonte]
    if (P.FATIA_ESTUDIO_FAIXAS) {
      let est = P.FATIA_ESTUDIO_FAIXAS[0][1]
      for (const [desde, f] of P.FATIA_ESTUDIO_FAIXAS) if (C.receita >= desde) est = f
      return { pote: 1 - P.FATIA_RESERVA - est, reserva: P.FATIA_RESERVA, estudio: est }
    }
    return null
  }
  function receita(valor, especial, fonte = especial || 'outros', faixa = 0) {
    if (valor <= 0) return
    const F = especial === 'inscricao' ? null : fatias(fonte) // fatias da faixa de volume usam a receita ANTES desta
    C.receita += valor; T.receita += valor
    porFonte[fonte] = (porFonte[fonte] || 0) + valor
    let pote, res, est
    if (especial === 'inscricao') {
      pote = valor * P.INSCRICAO_FATIA_RANKING; res = 0; est = valor - pote
      C.poteRanking += pote; poteFaixa[faixa] += pote
    } else {
      if (F) { pote = valor * F.pote; res = valor * F.reserva; est = valor - pote - res }
      else { pote = valor * P.FATIA_POTE; res = valor * P.FATIA_RESERVA; est = valor - pote - res }
      C.poteAventura += pote * P.POTE_FATIA_AVENTURA
      const r = pote * P.POTE_FATIA_RANKING
      C.poteRanking += r
      if (FAIXAS.length === 1) poteFaixa[0] += r
      else { const sp = FAIXAS.reduce((s, f) => s + f.pesoPote, 0); FAIXAS.forEach((f, i) => (poteFaixa[i] += (r * f.pesoPote) / sp)) }
    }
    C.entrouPote += pote; T.entrouPote += pote
    C.reserva += res; C.entrouReserva += res
    C.estudio += est
  }
  // Paga um valor: primeiro do saldo do jogo (reinvestir, sem taxa), o resto com dinheiro de fora.
  function pagar(ag, valor, podeExterno = true) {
    const doSaldo = Math.min(ag.saldo, valor)
    const fora = valor - doSaldo
    if (fora > EPS && !podeExterno) return false
    ag.saldo -= doSaldo
    if (fora > 0) { C.externo += fora; T.externo += fora; ag.gastoExterno += fora; ag.gastoExtTemp += fora; externoHoje += fora }
    ag.gastoTemp += valor
    return true
  }
  function creditar(ag, valor, tipoGanho) {
    ag.saldo += valor
    ag.ganhoTemp += valor
    ag.ganhoTotal += valor
    if (tipoGanho) T.ganho[ag.tipo] += valor
  }

  // ── bonecos ── (c = quanto custou; só para medir o retorno do dono)
  const novoBoneco = (rend, custo = 0) => ({ r: rend, d: 0, v: 0, c: custo })
  function comprarBonecos(ag, n, podeExterno = true) {
    // mercado primeiro (se mais barato), depois loja do estúdio
    let comprados = 0
    const precoMerc = P.PRECO_BONECO_COMUM * fatorMercado
    while (comprados < n && mercado.length > 0 && precoMerc <= P.PRECO_BONECO_COMUM) {
      const oferta = mercado[mercado.length - 1]
      if (!pagar(ag, precoMerc, podeExterno)) return comprados
      mercado.pop()
      creditar(oferta.vendedor, precoMerc * (1 - P.TAXA_MERCADO), true)
      receita(precoMerc * P.TAXA_MERCADO, null, 'taxa de mercado')
      oferta.boneco.c = precoMerc
      ag.bonecos.push(oferta.boneco)
      comprasHoje++
      comprados++
    }
    while (comprados < n) {
      if (!pagar(ag, P.PRECO_BONECO_COMUM, podeExterno)) return comprados
      receita(P.PRECO_BONECO_COMUM, null, 'loja (kit e reposição)')
      ag.bonecos.push(novoBoneco(P.REND_COMUM, P.PRECO_BONECO_COMUM))
      comprados++
    }
    return comprados
  }
  function custoCostura(a, b, ag) {
    const bruto = P.COSTURA_BASE * P.COSTURA_FATOR ** (a.v + b.v)
    const desconto = Math.min(ag.retalhos * P.RETALHO_DESCONTO, bruto * 0.5, P.RETALHO_DESCONTO)
    return { bruto, desconto, final: bruto - desconto }
  }
  function costurar(ag, podeExterno) {
    const pais = ag.bonecos.filter((b) => b.v < P.CARRETEL_VOLTAS && b.d < P.DESGASTE_MAX * 0.8).sort((x, y) => y.r - x.r)
    if (pais.length < 2) return false
    const [a, b] = pais
    const c = custoCostura(a, b, ag)
    if (!pagar(ag, c.final, podeExterno)) return false
    if (c.desconto > 0) ag.retalhos -= 1
    receita(c.final, null, 'costura')
    a.v++; b.v++
    ag.bonecos.push(novoBoneco(Math.min(P.REND_TETO, ((a.r + b.r) / 2) * R.entre(0.95, 1.08)), c.final))
    nascimentos++; T.nasc++
    return true
  }
  const rendTime = (bs) => (bs.length >= 3 ? (bs[0].r + bs[1].r + bs[2].r) / 3 : bs.length > 0 ? P.REND_UM_BONECO : 0)
  const taxaSaqueDe = (ag, dia) => {
    const idade = dia - ag.entrou
    let taxa = P.TAXA_SAQUE_FAIXAS[0][1]
    for (const [desde, t] of P.TAXA_SAQUE_FAIXAS) if (idade >= desde) taxa = t
    return taxa
  }

  // ── jogadores ──
  let proxId = 0
  function entrar(tipo, dia) {
    const ag = {
      id: proxId++, tipo, entrou: dia, ativo: true, saldo: 0, bonecos: [], retalhos: 0,
      gastoExterno: 0, gastoExtTemp: 0, gastoTemp: 0, ganhoTemp: 0, ganhoTotal: 0, sacadoLiq: 0, entrada: 0, recuperouDia: -1, diasAtivo: 0, saiu: -1,
      skill: Math.exp(0.25 * R.normal()), riqueza: 0, inscrito: false, faixa: 0, aluga: null, semTime: 0, temporadaEntrada: Math.floor(dia / P.DIAS_TEMPORADA),
      hab: 'mediano', investe: false, formado: false,
    }
    if (FR) {
      if (tipo === 'bot') ag.hab = P.BOT_IA
      else { const x = R2.u(), H = P.HABILIDADE_MIX; ag.hab = x < H.bom ? 'bom' : x < H.bom + H.mediano ? 'mediano' : 'fraco' }
    }
    if (P.FORMATURA && tipo === 'farmador') ag.investe = R2.u() < P.FORMATURA.frac
    const antes = C.externo
    if (tipo === 'baleia') {
      ag.riqueza = P.RIQUEZA_BALEIA_MEDIANA * Math.exp(P.RIQUEZA_BALEIA_SIGMA * R.normal())
      const BO = P.BALEIA_ORIGEM
      const n = BO ? Math.max(BO.min, Math.min(BO.max, Math.round(ag.riqueza / BO.porRiqueza) * 3)) : Math.max(9, Math.min(30, Math.round(ag.riqueza / 40) * 3))
      for (let i = 0; i < n; i++) { pagar(ag, P.PRECO_BONECO_ORIGEM); receita(P.PRECO_BONECO_ORIGEM, null, 'loja (origem baleia)'); ag.bonecos.push(novoBoneco(P.REND_ORIGEM, P.PRECO_BONECO_ORIGEM)) }
      if (dia % P.DIAS_TEMPORADA < 20) inscrever(ag)
    } else if (tipo === 'medio') {
      comprarBonecos(ag, 3)
      if (dia % P.DIAS_TEMPORADA < 20 && R.u() < P.MEDIO_INSCREVE) inscrever(ag)
    } else if (tipo === 'farmador') {
      if (!P.FARMADOR_GRATIS) comprarBonecos(ag, 1) // R1: conta exige 1 boneco; o time vem do aluguel
    } else if (tipo === 'bot') {
      if (!P.FARMADOR_GRATIS) comprarBonecos(ag, 3) // R1: a fazenda compra o kit para farmar sozinha
      // de graça: a fazenda entra na fila de aluguel como qualquer farmador (o dono não sabe que é bot)
    }
    ag.entrada = C.externo - antes
    agentes.push(ag); ativos.push(ag)
    return ag
  }
  function escolherFaixa(ag) {
    let tot = 0
    for (const f of FAIXAS) tot += (f.quem && f.quem[ag.tipo]) || 0
    if (tot <= 0) return -1
    let x = R2.u() * tot
    for (let i = 0; i < FAIXAS.length; i++) { x -= (FAIXAS[i].quem && FAIXAS[i].quem[ag.tipo]) || 0; if (x < 0) return i }
    return FAIXAS.length - 1
  }
  function inscrever(ag) {
    if (ag.inscrito) return
    let fx = 0
    if (FAIXAS.length > 1) { fx = escolherFaixa(ag); if (fx < 0) return }
    const precoF = FAIXAS[fx].preco
    if (!pagar(ag, precoF)) return
    receita(precoF, 'inscricao', 'inscrição de ranking', fx)
    ag.inscrito = true; ag.faixa = fx
  }
  function sacar(ag, valor, dia) {
    valor = Math.min(valor, ag.saldo)
    if (valor < P.SAQUE_MINIMO) return
    if (AB && dia - ag.entrou < AB.esperaSaque) return // 1º saque com espera (o saldo fica guardado)
    const taxa = taxaSaqueDe(ag, dia)
    ag.saldo -= valor
    const liq = valor * (1 - taxa)
    C.sacadoLiq += liq; C.taxaSaque += valor * taxa
    ag.sacadoLiq += liq
    vendaHoje += liq * P.VENDE_TOKEN[ag.tipo]
    receita(valor * taxa, null, 'taxa de saque')
    if (ag.recuperouDia < 0 && ag.entrada > 0 && ag.sacadoLiq >= ag.entrada) ag.recuperouDia = dia
  }
  function sair(ag, dia) {
    ag.ativo = false
    ag.aluga = null
    ag.saiu = dia
    sacar(ag, ag.saldo, dia) // quem sai tenta levar o que tem
    if (ag.tipo !== 'farmador') mercado = mercado.filter((m) => m.vendedor !== ag)
  }
  function banir(ag, dia) { // conta-bot pega: o saldo volta ao pote da Aventura (não sai do jogo)
    const v = ag.saldo
    ag.saldo = 0
    C.poteAventura += v; C.entrouPote += v; T.entrouPote += v; C.confiscado += v
    ag.ativo = false; ag.aluga = null; ag.saiu = dia; ag.banido = true
    M.botsBanidos++
  }

  let externoHoje = 0, vendaHoje = 0, comprasHoje = 0

  for (let dia = 0; dia < DIAS; dia++) {
    externoHoje = 0; vendaHoje = 0; comprasHoje = 0
    const temp = Math.floor(dia / P.DIAS_TEMPORADA)
    const diaDaTemp = dia % P.DIAS_TEMPORADA
    if (diaDaTemp === 0 && dia > 0) T = novaTemp(temp)

    // 1) Começo da temporada: inscrições, leilões de raras, enfeites (+ passe de temporada)
    if (diaDaTemp === 0) {
      for (const ag of ativos) { ag.inscrito = false; ag.ganhoTemp = 0; ag.gastoTemp = 0; ag.gastoExtTemp = 0 }
      const baleias = ativos.filter((a) => a.tipo === 'baleia')
      for (const ag of ativos) {
        if (ag.tipo === 'baleia' && R.u() < 0.95) inscrever(ag)
        else if (ag.tipo === 'medio' && R.u() < P.MEDIO_INSCREVE) inscrever(ag)
        else if (FAIXAS.length > 1 && ag.tipo === 'farmador' && ag.bonecos.length >= 3 && R2.u() < 0.3) inscrever(ag)
      }
      const nLeiloes = Math.max(baleias.length ? 1 : 0, Math.min(20, Math.round(baleias.length / P.LEILOES_POR_BALEIAS)))
      for (let k = 0; k < nLeiloes; k++) {
        const lances = baleias.map((b) => ({ b, v: b.riqueza * R.entre(0.05, 0.25) })).sort((x, y) => y.v - x.v)
        if (!lances.length) break
        const vence = lances[0].b
        const valor = lances.length > 1 ? lances[1].v : lances[0].v * 0.5 // segundo maior lance
        pagar(vence, valor); receita(valor, null, 'leilão de raras')
        vence.bonecos.push(novoBoneco(P.REND_RARA, valor))
      }
      for (const ag of ativos) {
        if (ag.tipo === 'baleia' && R.u() < 0.7) { const v = ag.riqueza * P.ENFEITE_BALEIA_FRAC; pagar(ag, v); receita(v, null, 'enfeites') }
        else if (ag.tipo === 'medio' && R.u() < 0.1) { pagar(ag, P.ENFEITE_MEDIO); receita(P.ENFEITE_MEDIO, null, 'enfeites') }
      }
      if (P.PASSE) {
        for (const ag of ativos) {
          const ch = P.PASSE[ag.tipo] || 0
          if (ch > 0 && R2.u() < ch) { const fora = ag.tipo === 'farmador' ? false : true; if (pagar(ag, P.PASSE.preco, fora)) receita(P.PASSE.preco, null, 'passe de temporada') }
        }
      }
    }

    // 2) População: saídas (base + cenário), anti-bot e entradas
    const alvo = Math.max(1, Math.round(cen.alvo(dia) * escala))
    for (const ag of ativos) {
      let p = P.SAIDA_DIA[ag.tipo]
      if (ag.tipo === 'farmador' && ag.semTime > 5) p += P.SAIDA_SEM_TIME
      if (R.u() < p) sair(ag, dia)
    }
    if (AB && AB.deteccaoDia > 0) for (const ag of ativos) if (ag.ativo && ag.tipo === 'bot' && R2.u() < AB.deteccaoDia) banir(ag, dia)
    ativos = ativos.filter((a) => a.ativo)
    if (ativos.length > alvo) {
      let falta = ativos.length - alvo
      const pesoMax = 1.5
      let guarda = 0
      while (falta > 0 && guarda++ < 50) {
        for (const ag of ativos) {
          if (falta <= 0) break
          if (ag.ativo && R.u() < (P.PESO_SAIDA_FUGA[ag.tipo] / pesoMax) * 0.5) { sair(ag, dia); falta-- }
        }
      }
      ativos = ativos.filter((a) => a.ativo)
    }
    const novos = Math.max(0, alvo - ativos.length)
    for (let i = 0; i < novos; i++) {
      const x = R.u()
      let tipo
      if (x < cen.bots) tipo = 'bot'
      else {
        const y = (x - cen.bots) / (1 - cen.bots)
        tipo = y < P.MIX.baleia ? 'baleia' : y < P.MIX.baleia + P.MIX.medio ? 'medio' : 'farmador'
      }
      if (tipo === 'bot') { M.botsTentados++; if (AB && R2.u() >= AB.passaLimite) { M.botsBarrados++; continue } }
      entrar(tipo, dia)
    }
    T.ativosMax = Math.max(T.ativosMax, ativos.length)

    // 3) Times: próprio time de cada um + times de aluguel das baleias
    const baleias = ativos.filter((a) => a.tipo === 'baleia')
    const farmadores = ativos.filter((a) => a.tipo === 'farmador')
    // de graça: bot sem kit próprio entra na mesma fila (o dono do time não distingue)
    const fila = P.FARMADOR_GRATIS ? ativos.filter((a) => a.tipo === 'farmador' || (a.tipo === 'bot' && a.bonecos.length < 3)) : farmadores
    const timesAluguel = []
    for (const b of baleias) {
      b.bonecos.sort((x, y) => y.r - x.r)
      for (let k = 3; k + 3 <= b.bonecos.length; k += 3) {
        if ((k - 3) / 3 >= P.MAX_TIMES_ALUGUEL_BALEIA) break
        const bs = b.bonecos.slice(k, k + 3)
        timesAluguel.push({ dono: b, bs, r: rendTime(bs) })
      }
    }
    timesAluguel.sort((x, y) => y.r - x.r)
    // embaralha a fila (sorteio com semente) e distribui
    for (let i = fila.length - 1; i > 0; i--) { const j = Math.floor(R.u() * (i + 1)); [fila[i], fila[j]] = [fila[j], fila[i]] }
    let vagas = Infinity
    if (P.LOTACAO) {
      // fila por ordem de chegada; quem já tinha vaga ontem continua (estável). O sorteio acima continua igual.
      fila.sort((x, y) => (y.aluga ? 1 : 0) - (x.aluga ? 1 : 0) || x.entrou - y.entrou || x.id - y.id)
      if (ontem.lib > 0 && ontem.pbar > 0) vagas = Math.max(0, Math.floor(ontem.lib / P.LOTACAO.alvoTimeDia - ontem.p0 / ontem.pbar))
    }
    let ti = 0
    for (const f of fila) {
      const proprio = rendTime(f.bonecos)
      const t = timesAluguel[ti]
      if (t && ti < vagas && t.r * P.ALUGUEL_FARMADOR > proprio * 1.0) { f.aluga = t; ti++; f.semTime = 0 }
      else { f.aluga = null; f.semTime++; if (f.tipo === 'farmador') T.farmSemTimeDias++ }
    }
    const faltouTime = ti >= timesAluguel.length // a vaga existia, faltou time: sinal para a baleia locadora comprar
    const semTimeHoje = fila.filter((f) => !f.aluga && f.bonecos.length < 3).length
    M.timeDias += timesAluguel.length; M.timeDiasAlugados += ti
    for (const t of timesAluguel) M.custoTimes += t.bs[0].c + t.bs[1].c + t.bs[2].c
    M.timeDiasHist.push(timesAluguel.length)
    const demandaPorBaleia = baleias.length ? Math.ceil(farmadores.length / baleias.length) : 0

    // 4) Costura: baleias mantêm times para alugar e para vender; médios costuram às vezes
    for (const b of baleias) {
      const alvoBonecos = 3 * (1 + Math.min(P.MAX_TIMES_ALUGUEL_BALEIA, demandaPorBaleia))
      const orcamentoHoje = (b.riqueza / P.DIAS_TEMPORADA) * 2
      for (let k = 0; k < 3; k++) {
        const vivos = b.bonecos.length
        const precoVenda = P.PRECO_BONECO_COMUM * fatorMercado * (1 - P.TAXA_MERCADO)
        const media7 = compras7.length ? compras7.reduce((s, x) => s + x, 0) / compras7.length : 0
        const queroVender = mercado.length < Math.max(3, media7 * 3) && vivos >= alvoBonecos
        if (vivos >= alvoBonecos && !queroVender) break
        const pais = b.bonecos.filter((x) => x.v < P.CARRETEL_VOLTAS && x.d < P.DESGASTE_MAX * 0.8).sort((x, y) => y.r - x.r)
        if (pais.length < 2) break
        const c = custoCostura(pais[0], pais[1], b)
        if (queroVender && c.final > precoVenda) break // costurar para vender só se paga
        const podeExterno = b.gastoExtTemp + Math.max(0, c.final - b.saldo) <= b.riqueza && orcamentoHoje > 0
        if (!costurar(b, podeExterno)) break
        if (queroVender) {
          const filho = b.bonecos.pop()
          mercado.push({ boneco: filho, vendedor: b })
        }
      }
    }
    for (const m of ativos) {
      if (m.tipo !== 'medio' || R.u() > 0.01) continue
      if (costurar(m, false)) {
        const filho = m.bonecos.pop()
        mercado.push({ boneco: filho, vendedor: m })
      }
    }
    if (P.CRIADORES) { // médios criadores: costuram para vender quando o mercado está fino e a costura se paga
      const media7 = compras7.length ? compras7.reduce((s, x) => s + x, 0) / compras7.length : 0
      const precoVenda = P.PRECO_BONECO_COMUM * fatorMercado * (1 - P.TAXA_MERCADO)
      for (const m of ativos) {
        if (m.tipo !== 'medio' || mercado.length >= Math.max(3, media7 * 3) || R2.u() > P.CRIADORES.medioCostura) continue
        const pais = m.bonecos.filter((x) => x.v < P.CARRETEL_VOLTAS && x.d < P.DESGASTE_MAX * 0.8).sort((x, y) => y.r - x.r)
        if (pais.length < 2 || custoCostura(pais[0], pais[1], m).final > precoVenda) continue
        if (costurar(m, true)) mercado.push({ boneco: m.bonecos.pop(), vendedor: m })
      }
    }
    // 4b) Baleia locadora: há fila e o time se paga em ≤ paybackMax dias (pela renda de dono dos últimos 7 dias) → compra 1 time
    if (P.LOCADORA && semTimeHoje > 0 && faltouTime) {
      const L = P.LOCADORA
      // renda de dono por time (contando time parado) nos últimos 7 dias; sem histórico ainda, estima pelo valor do ponto
      const td7 = M.timeDiasHist.slice(-8, -1).reduce((s, x) => s + x, 0)
      const dc7 = M.donoHist.slice(-7).reduce((s, x) => s + x, 0)
      const rendaTimeDia = td7 > 0 ? dc7 / td7 : P.ENERGIA_DIARIA * P.USO_ENERGIA.farmador * P.REND_COMUM * (M.vpHist.length ? M.vpHist[M.vpHist.length - 1] : P.TETO_POR_PONTO) * P.ALUGUEL_DONO
      const custoTime = 3 * P.PRECO_BONECO_COMUM * Math.min(1, fatorMercado)
      const payback = rendaTimeDia > 0 ? custoTime / rendaTimeDia : Infinity
      const vida = P.DESGASTE_MAX / (P.ENERGIA_DIARIA * P.USO_ENERGIA.farmador)
      let restam = semTimeHoje
      if (payback <= Math.min(L.paybackMax, vida * 0.8)) {
        const ordem = [...baleias].sort((x, y) => x.id - y.id)
        for (let rodada = 0; rodada < L.porDia && restam > 0; rodada++) {
          for (const b of ordem) {
            if (restam <= 0) break
            const times = Math.floor(Math.max(0, b.bonecos.length - 3) / 3)
            if (times >= L.maxTimes) continue
            const fora = Math.max(0, custoTime - b.saldo)
            if (b.gastoExtTemp + fora > b.riqueza * L.investeFrac) continue
            if (comprarBonecos(b, 3, true) === 3) { M.timesComprados++; restam-- }
          }
        }
      }
    }

    // 5) Aventura: pontos, liberação do pote, reserva amortecedora, pagamento
    const jogadas = [] // {ag, pontos, lutas, bs, dono}
    let totalPontos = 0
    for (const ag of ativos) {
      const lutas = Math.round(P.ENERGIA_DIARIA * P.USO_ENERGIA[ag.tipo])
      let bs, r, dono = null
      if ((ag.tipo === 'farmador' || (P.FARMADOR_GRATIS && ag.tipo === 'bot')) && ag.aluga) { bs = ag.aluga.bs; r = ag.aluga.r; dono = ag.aluga.dono }
      else { ag.bonecos.sort((x, y) => y.r - x.r); bs = ag.bonecos.slice(0, 3); r = rendTime(ag.bonecos) }
      if (r <= 0) continue
      const fr = FR ? FR[ag.hab] : 1
      const pontos = lutas * r * fr * R.entre(0.9, 1.1)
      totalPontos += pontos
      jogadas.push({ ag, pontos, lutas, bs: bs.length >= 3 ? bs : bs.slice(0, 1), dono })
    }
    let lib = C.poteAventura * P.LIBERACAO_DIA
    if (historicoLib.length >= 7) {
      const media7 = historicoLib.slice(-7).reduce((s, x) => s + x, 0) / 7
      if (lib < P.PISO_RESERVA * media7) {
        const topo = Math.min(P.PISO_RESERVA * media7 - lib, C.reserva * P.RESERVA_USO_MAX_DIA)
        if (topo > 0) { C.reserva -= topo; C.poteAventura += topo; C.reservaParaPote += topo; T.reservaUsada += topo; lib += topo }
      }
    }
    const valorPonto = totalPontos > 0 ? Math.min(P.TETO_POR_PONTO, lib / totalPontos) : 0
    if (totalPontos > 0 && valorPonto >= P.TETO_POR_PONTO - 1e-12) T.diasNoTeto++
    M.vpHist.push(valorPonto)
    let pagoHoje = 0, donoHoje = 0, p0 = 0, pAl = 0, nAl = 0
    for (const j of jogadas) { if (j.dono) { pAl += j.pontos; nAl++ } else p0 += j.pontos }
    ontem.lib = lib; ontem.p0 = p0; ontem.pbar = nAl ? pAl / nAl : ontem.pbar || P.ENERGIA_DIARIA * P.REND_ORIGEM
    for (const j of jogadas) {
      const v = j.pontos * valorPonto
      pagoHoje += v
      if (j.dono) {
        creditar(j.ag, v * P.ALUGUEL_FARMADOR, true)
        creditar(j.dono, v * P.ALUGUEL_DONO, true)
        M.donoCredito += v * P.ALUGUEL_DONO; donoHoje += v * P.ALUGUEL_DONO
        receita(v * P.ALUGUEL_TAXA, null, 'taxa de aluguel') // receita só depois de tirar do pote (abaixo); ordem não muda o total
        if (j.ag.tipo === 'bot') T.pagoBots += v * P.ALUGUEL_FARMADOR
      } else {
        creditar(j.ag, v, true)
        if (j.ag.tipo === 'bot') T.pagoBots += v
      }
      for (const b of j.bs) b.d += j.lutas
    }
    C.poteAventura -= pagoHoje; C.pagoPote += pagoHoje; T.pagoPote += pagoHoje
    historicoLib.push(lib); historicoPago.push(pagoHoje); M.donoHist.push(donoHoje)
    for (const ag of ativos) { T.dias[ag.tipo]++; ag.diasAtivo++ }

    // 6) Desgaste → Aposentadoria (vira Retalho Honrado) ou reparo; médio repõe o time
    for (const ag of ativos) {
      const antes = ag.bonecos.length
      if (antes === 0) continue
      if (P.REPARO && ag.tipo === 'baleia') { // reparo: zera o desgaste pagando por luta restaurada
        const porLuta = (P.PRECO_BONECO_COMUM / P.DESGASTE_MAX) * P.REPARO.fator
        for (const b of ag.bonecos) {
          if (b.d < P.DESGASTE_MAX) continue
          const v = b.d * porLuta
          if (ag.gastoExtTemp + Math.max(0, v - ag.saldo) > ag.riqueza) continue
          pagar(ag, v); receita(v, null, 'reparo'); b.d = 0; b.c += v; M.reparos++
        }
      }
      ag.bonecos = ag.bonecos.filter((b) => b.d < P.DESGASTE_MAX)
      const apos = antes - ag.bonecos.length
      if (apos > 0) { ag.retalhos += apos; T.apos += apos }
      if ((ag.tipo === 'medio' || (ag.tipo === 'bot' && (!P.FARMADOR_GRATIS || antes >= 3))) && ag.bonecos.length < 3) {
        const falta = 3 - ag.bonecos.length
        const podeExterno = ag.tipo === 'bot' || R.u() < P.MEDIO_REPOE_COM_DINHEIRO
        if (comprarBonecos(ag, falta, podeExterno) < falta && ag.tipo === 'medio') sair(ag, dia)
      }
      if (P.FORMATURA && ag.tipo === 'farmador' && ag.formado && ag.bonecos.length < 3 && ag.bonecos.length > 0) {
        comprarBonecos(ag, 3 - ag.bonecos.length, false) // repõe só com saldo; senão volta à fila de aluguel
      }
    }
    // 6b) Formatura: farmador que juntou saldo compra time próprio (reinvestir, sem taxa) — demanda do mercado
    if (P.FORMATURA) {
      const precoT = 3 * P.PRECO_BONECO_COMUM * Math.min(1, fatorMercado) + P.FORMATURA.folga
      for (const ag of ativos) {
        if (ag.tipo !== 'farmador' || !ag.investe || !ag.ativo || ag.bonecos.length >= 3 || ag.saldo < precoT) continue
        if (comprarBonecos(ag, 3 - ag.bonecos.length, false) > 0) { ag.formado = true; ag.aluga = null; M.formaturas++ }
      }
    }
    ativos = ativos.filter((a) => a.ativo)

    // 7) Saques
    for (const ag of ativos) {
      if (ag.saldo < P.SAQUE_MINIMO) continue
      if (ag.tipo === 'bot') sacar(ag, ag.saldo, dia)
      else if (ag.tipo === 'farmador') { if (ag.investe && !ag.formado) continue; if (R.u() < 0.5) sacar(ag, ag.saldo * 0.95, dia) }
      else if (ag.tipo === 'medio') { if (R.u() < 0.1) sacar(ag, (ag.saldo - 10) * 0.5, dia) }
      else if (ag.tipo === 'baleia') { if (R.u() < 0.05) sacar(ag, (ag.saldo - 50) * 0.3, dia) }
    }

    // 8) Reserva acima do teto devolve ao pote; mercado ajusta preço; token; custos do estúdio
    if (dia >= 30) {
      const media30 = historicoPago.slice(-30).reduce((s, x) => s + x, 0) / 30
      const teto = P.RESERVA_TETO_DIAS * media30
      if (C.reserva > teto) { const ex = C.reserva - teto; C.reserva -= ex; C.poteAventura += ex; C.reservaParaPote += ex }
    }
    compras7.push(comprasHoje); if (compras7.length > 7) compras7.shift()
    const demanda = compras7.reduce((s, x) => s + x, 0) / compras7.length
    fatorMercado = mercado.length > demanda * 5 ? Math.max(0.4, fatorMercado * 0.97) : Math.min(1.0, fatorMercado * 1.02)
    // Índice do token (BRINQUEDO): compra = dinheiro de fora que entra (vira token para gastar);
    // venda = saque líquido × quanto cada tipo vende + o estúdio vendendo para pagar custos.
    fluxoCompra.push(externoHoje); fluxoVenda.push(vendaHoje + P.CUSTO_FIXO_DIA + P.CUSTO_POR_ATIVO_DIA * ativos.length)
    if (fluxoCompra.length > 30) { fluxoCompra.shift(); fluxoVenda.shift() }
    const somaC = fluxoCompra.reduce((s, x) => s + x, 0), somaV = fluxoVenda.reduce((s, x) => s + x, 0)
    preco = (somaC + P.LIQUIDEZ_TOKEN) / (somaV + P.LIQUIDEZ_TOKEN) // >1 = mais compra que venda
    C.custos += P.CUSTO_FIXO_DIA + P.CUSTO_POR_ATIVO_DIA * ativos.length

    // 9) Fim da temporada: prêmio do ranking (por faixa) e sobra
    if (diaDaTemp === P.DIAS_TEMPORADA - 1 || dia === DIAS - 1) {
      const inscritos = ativos.filter((a) => a.inscrito)
      const pontuar = (lista) => lista.map((a) => {
        const bs = [...a.bonecos].sort((x, y) => y.r - x.r)
        const raras = a.bonecos.filter((b) => b.r >= P.REND_RARA).length
        return { a, s: rendTime(bs) * (1 + 0.05 * Math.min(3, raras)) * a.skill }
      }).sort((x, y) => y.s - x.s)
      const pont = pontuar(inscritos)
      const top10Baleias = []
      for (let fx = 0; fx < FAIXAS.length; fx++) {
        const pf = FAIXAS.length === 1 ? pont : pontuar(inscritos.filter((a) => a.faixa === fx))
        if (!pf.length) continue
        const K = Math.min(P.RANKING_PREMIADOS_MAX, Math.max(1, Math.ceil(pf.length * P.RANKING_PREMIADOS_FRAC)))
        let somaPesos = 0
        for (let r = 1; r <= K; r++) somaPesos += 1 / r ** P.RANKING_EXPOENTE
        const total = poteFaixa[fx]
        let pagoR = 0
        for (let r = 1; r <= K; r++) {
          const v = (total * (1 / r ** P.RANKING_EXPOENTE)) / somaPesos
          creditar(pf[r - 1].a, v, true); pagoR += v
          if (pf[r - 1].a.tipo === 'bot') T.pagoBots += v
        }
        poteFaixa[fx] -= pagoR
        C.poteRanking -= pagoR; C.pagoPote += pagoR; T.pagoPote += pagoR
      }
      for (let r = 0; r < Math.min(10, pont.length); r++) if (pont[r].a.tipo === 'baleia') top10Baleias.push(pont[r].a)
      const sobra = C.poteAventura * P.SOBRA_PARA_RESERVA
      C.poteAventura -= sobra; C.reserva += sobra; C.poteParaReserva += sobra
      checar(dia)
      fecharTemporada(top10Baleias, diaDaTemp + 1)
    } else checar(dia)
  }

  function fecharTemporada(top10Baleias, diasNaTemp) {
    const vivos = ativos.reduce((s, a) => s + a.bonecos.length, 0) + mercado.length
    const porDia = (t) => (T.dias[t] ? T.ganho[t] / T.dias[t] : 0)
    const b10 = top10Baleias.length
      ? { ganho: top10Baleias.reduce((s, a) => s + a.ganhoTemp, 0) / top10Baleias.length / diasNaTemp, gasto: top10Baleias.reduce((s, a) => s + a.gastoTemp, 0) / top10Baleias.length / diasNaTemp }
      : null
    temporadas.push({
      temporada: T.i + 1,
      ativos: ativos.length, ativosMax: T.ativosMax,
      receitaExterna: T.externo, receita: T.receita,
      poteEntrou: T.entrouPote, potePagou: T.pagoPote,
      reserva: C.reserva, reservaUsada: T.reservaUsada,
      farmadorDia: porDia('farmador'), medioDia: porDia('medio'), botDia: porDia('bot'),
      baleiaTop10: b10,
      pctBots: T.pagoPote > 0 ? T.pagoBots / T.pagoPote : 0,
      bonecosPorJogador: ativos.length ? vivos / ativos.length : 0,
      nascimentos: T.nasc, aposentadorias: T.apos,
      farmSemTimePct: T.dias.farmador ? T.farmSemTimeDias / T.dias.farmador : 0,
      diasNoTeto: T.diasNoTeto, preco, caixaEstudio: C.estudio - C.custos,
      pagouMaisQueEntrou: C.pagoPote > C.entrouPote + C.reservaParaPote - C.poteParaReserva + EPS,
    })
  }

  function checar(dia) {
    invariantesChecados++
    const saldos = agentes.reduce((s, a) => s + a.saldo, 0)
    const negativo = agentes.some((a) => a.saldo < -EPS)
    const erro = verificarContas(C, saldos, negativo)
    if (erro) throw new Insolvencia(`INSOLVENCIA dia ${dia + 1}: ${erro}`)
    if (opcoes.registro) registro.push({ dia: dia + 1, pote: C.poteAventura + C.poteRanking, reserva: C.reserva, pagoPote: C.pagoPote, entrouPote: C.entrouPote, reservaParaPote: C.reservaParaPote, poteParaReserva: C.poteParaReserva, externo: C.externo, sacadoLiq: C.sacadoLiq })
  }

  // Coortes de farmadores: dias para recuperar a entrada (mediana) e % que recuperou até o dia 180
  const coortes = []
  for (let t = 0; t < temporadas.length; t++) {
    const fs = agentes.filter((a) => a.tipo === 'farmador' && a.temporadaEntrada === t && a.entrada > 0)
    const rec = fs.filter((a) => a.recuperouDia >= 0).map((a) => a.recuperouDia - a.entrou).sort((x, y) => x - y)
    coortes.push({ n: fs.length, mediana: rec.length ? rec[Math.floor(rec.length / 2)] : null, pct: fs.length ? rec.length / fs.length : 0 })
  }
  temporadas.forEach((t, i) => (t.farmadorRecupera = coortes[i]))

  const porTipo = {}
  for (const a of agentes) {
    const t = (porTipo[a.tipo] ||= { contas: 0, pos: 0, tirou: 0, saldoParado: 0 })
    t.contas++; t.pos += a.gastoExterno; t.tirou += a.sacadoLiq; t.saldoParado += a.saldo
  }
  return {
    cenario: cen.nome, semente: opcoes.semente ?? 42, escala, temporadas,
    contas: { ...C, saldosJogadores: agentes.reduce((s, a) => s + a.saldo, 0) },
    porTipo, porFonte, invariantesChecados, nascimentos, totalContas: agentes.length, registro: opcoes.registro ? registro : undefined,
    insolvente: false,
    resumo: resumir(),
  }

  // ── resumo da rodada 2 (as colunas do --comparar) ──
  function resumir() {
    const fim = DIAS - 1
    const q = (xs, p) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
    // "no bolso por dia": o que sacou + o saldo (como se sacasse hoje, com a taxa da idade) − o que pôs de fora, ÷ dias ativos
    const bolso = (a, comBonecos) => {
      const ultimo = a.saiu >= 0 ? a.saiu : fim
      let v = a.sacadoLiq + a.saldo * (1 - taxaSaqueDe(a, ultimo)) - a.gastoExterno
      if (comBonecos && a.ativo) for (const b of a.bonecos) v += b.c * Math.max(0, 1 - b.d / P.DESGASTE_MAX)
      return v / Math.max(1, a.diasAtivo)
    }
    const elegivel = (a) => a.entrou < DIAS - 30 && a.diasAtivo > 0
    const farm = agentes.filter((a) => a.tipo === 'farmador' && elegivel(a)).map((a) => bolso(a, false))
    const med = agentes.filter((a) => a.tipo === 'medio' && elegivel(a)).map((a) => bolso(a, false))
    const bal = agentes.filter((a) => a.tipo === 'baleia' && elegivel(a)).map((a) => bolso(a, true)).sort((x, y) => y - x)
    const bots = agentes.filter((a) => a.tipo === 'bot' && elegivel(a)).map((a) => bolso(a, false))
    const ts = temporadas.slice(1)
    const media = (f) => (ts.length ? ts.reduce((s, t) => s + f(t), 0) / ts.length : 0)
    const totRec = Object.values(porFonte).reduce((s, x) => s + x, 0)
    const rendaTimeDia = M.timeDias ? M.donoCredito / M.timeDias : 0
    const custoTime = M.timeDias ? M.custoTimes / M.timeDias : 0
    return {
      farmMediano: q(farm, 0.5), farmTop25: q(farm, 0.75), farmPositivo: farm.length ? farm.filter((x) => x > 0).length / farm.length : 0,
      medioMediano: q(med, 0.5),
      pctComTime: 1 - media((t) => t.farmSemTimePct), pctComTimeT1: temporadas.length ? 1 - temporadas[0].farmSemTimePct : 0,
      donoPaybackDias: rendaTimeDia > 0 ? custoTime / rendaTimeDia : null, donoRendaTimeDia: rendaTimeDia, custoTime,
      // time NOVO comprado na loja (3 comuns) que fica alugado: em quantos dias a parte do dono paga o time
      donoPaybackNovo: M.timeDiasAlugados && M.donoCredito > 0 ? (3 * P.PRECO_BONECO_COMUM) / (M.donoCredito / M.timeDiasAlugados) : null,
      ocupacaoTimes: M.timeDias ? M.timeDiasAlugados / M.timeDias : 0,
      vidaBonecoDias: P.DESGASTE_MAX / (P.ENERGIA_DIARIA * P.USO_ENERGIA.farmador),
      baleiaMediana: q(bal, 0.5), baleiaTop10: bal.length ? bal.slice(0, 10).reduce((s, x) => s + x, 0) / Math.min(10, bal.length) : 0,
      baleiasPositivas: bal.length ? bal.filter((x) => x >= 0).length / bal.length : 0, nBaleias: bal.length,
      botMediano: q(bots, 0.5),
      pctBots: media((t) => t.pctBots), botsTentados: M.botsTentados, botsBarrados: M.botsBarrados, botsBanidos: M.botsBanidos, confiscado: C.confiscado,
      mercadoPct: totRec ? (porFonte['taxa de mercado'] || 0) / totRec : 0,
      caixaEstudio: C.estudio - C.custos, receitaExterna: C.externo,
      potePagouMais: temporadas.some((t) => t.pagouMaisQueEntrou),
      timesComprados: M.timesComprados, formaturas: M.formaturas, reparos: M.reparos,
    }
  }
}

// ───────────────────────────── IMPRESSÃO ─────────────────────────────
const f0 = (x) => Math.round(x).toLocaleString('pt-BR')
const f2 = (x) => x.toFixed(2)
function linha(cols, larg) { return cols.map((c, i) => String(c).padStart(larg[i])).join(' ') }

export function tabela(res) {
  const cab = ['T', 'ativos', 'rec.ext', 'rec.total', 'pote+', 'pote−', 'reserva', 'farm/d', 'médio/d', 'bot/d', 'bal10 ganha/gasta d', 'farm recupera', '%bots', 'bon/jog', 'nasc/apos', 'token*', 'caixa est.', 'pagou>entrou?']
  const larg = [2, 6, 9, 9, 8, 8, 8, 6, 7, 5, 19, 13, 5, 7, 11, 5, 10, 13]
  const out = [`== ${res.cenario} (semente ${res.semente}, escala ${res.escala}) — US$ ilustrativo ==`, linha(cab, larg)]
  for (const t of res.temporadas) {
    const rec = t.farmadorRecupera
    out.push(linha([
      t.temporada, f0(t.ativos), f0(t.receitaExterna), f0(t.receita), f0(t.poteEntrou), f0(t.potePagou), f0(t.reserva),
      f2(t.farmadorDia), f2(t.medioDia), t.botDia ? f2(t.botDia) : '-', t.baleiaTop10 ? `${f2(t.baleiaTop10.ganho)} / ${f2(t.baleiaTop10.gasto)}` : '-',
      rec.n ? `${rec.mediana ?? 'nunca'}d (${Math.round(rec.pct * 100)}%)` : '-',
      Math.round(t.pctBots * 100) + '%', f2(t.bonecosPorJogador), `${t.nascimentos}/${t.aposentadorias}`, f2(t.preco), f0(t.caixaEstudio),
      t.pagouMaisQueEntrou ? 'SIM (ERRO)' : 'NUNCA',
    ], larg))
  }
  const pt = Object.entries(res.porTipo).map(([k, v]) => `${k} pôs ${f0(v.pos)} tirou ${f0(v.tirou)}`).join(' · ')
  out.push(`180 dias, dinheiro de fora × saque líquido: ${pt}`)
  const tot = Object.values(res.porFonte).reduce((a, b) => a + b, 0)
  out.push('receita por fonte: ' + Object.entries(res.porFonte).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round((v / tot) * 100)}%`).join(' · '))
  out.push(`invariantes checados: ${res.invariantesChecados} (todo dia) · contas criadas: ${res.totalContas} · saldo parado nos jogadores: ${f0(res.contas.saldosJogadores)}`)
  const s = res.resumo
  out.push(`no bolso/dia: farmador mediano ${f2(s.farmMediano)} · top25 ${f2(s.farmTop25)} · médio ${f2(s.medioMediano)} · baleia mediana ${f2(s.baleiaMediana)} (${Math.round(s.baleiasPositivas * 100)}% ≥ 0) · farmador com time ${Math.round(s.pctComTime * 100)}% · dono paga o time em ${s.donoPaybackDias ? Math.round(s.donoPaybackDias) + ' d' : '-'}`)
  return out.join('\n')
}

export const CENARIOS_COMPARAR = ['ENCHENTE', 'ESTAVEL', 'FUGA', 'ESTRESSE_BOTS']
const ROTULO = { ENCHENTE: 'ENCHENTE', ESTAVEL: 'ESTÁVEL', FUGA: 'FUGA', ESTRESSE_BOTS: '30% BOTS' }

/** Roda cada conjunto nos 4 cenários e devolve as linhas da comparação. */
export function comparar(nomes, { semente = 42, escala = 1 } = {}) {
  const linhas = []
  for (const n of nomes) {
    for (const c of CENARIOS_COMPARAR) {
      const r = simular(c, { semente, escala, params: conjunto(n) })
      linhas.push({ conjunto: n, cenario: c, ...r.resumo })
    }
  }
  return linhas
}

export function tabelaComparar(linhas) {
  const cab = ['conjunto', 'cenário', 'farm med/d', 'farm top25/d', 'farm c/ time', 'dono paga time novo/média (vida)', 'baleia med/d', 'top10 bal/d', 'baleias ≥0', '% pote bots', 'mercado % rec', 'caixa estúdio', 'pote pagou > entrou?']
  const larg = [12, 9, 10, 12, 12, 32, 12, 11, 10, 11, 13, 13, 20]
  const out = [
    'Comparação — TODO NÚMERO É PROPOSTA; US$ ilustrativo, não é promessa de lucro. Médias das temporadas 2–6 onde é % (semente 42).',
    '"no bolso por dia" = sacou + saldo (com a taxa de saque) − o que pôs de fora, ÷ dias ativos (farmador sem time conta como dia de 0).',
    '"dono paga time": novo = time de 3 comuns da loja, alugado; média = todos os times de aluguel (custo real, contando time parado); (vida) = dias até aposentar.',
    'baleia: conta também os bonecos vivos pelo custo × vida que resta. % pote bots = parte do pote paga a contas-bot.',
    linha(cab, larg),
  ]
  for (const l of linhas) {
    out.push(linha([
      l.conjunto, ROTULO[l.cenario], f2(l.farmMediano), f2(l.farmTop25), Math.round(l.pctComTime * 100) + '%',
      `${l.donoPaybackNovo ? Math.round(l.donoPaybackNovo) : '-'} / ${l.donoPaybackDias ? Math.round(l.donoPaybackDias) : '-'} d (${Math.round(l.vidaBonecoDias)})`, f2(l.baleiaMediana), f2(l.baleiaTop10), Math.round(l.baleiasPositivas * 100) + '%',
      (l.pctBots * 100).toFixed(1) + '%', (l.mercadoPct * 100).toFixed(1) + '%', f0(l.caixaEstudio), l.potePagouMais ? 'SIM (ERRO)' : 'NUNCA',
    ], larg))
  }
  return out.join('\n')
}

// ───────────────────────────── LINHA DE COMANDO ─────────────────────────────
const ehPrincipal = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('simular-economia.mjs')
if (ehPrincipal) {
  const args = process.argv.slice(2)
  const pega = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
  const semente = Number(pega('--semente', 42))
  const escala = Number(pega('--escala', 1))
  const so = pega('--cenario', null)
  const nomeConj = pega('--conjunto', 'R1')
  if (args.includes('--comparar')) {
    const lista = pega('--comparar', null)
    const nomes = lista && !lista.startsWith('--') ? lista.split(',') : ['R1', 'R2', 'R2+BOT_FORTE']
    const linhas = comparar(nomes, { semente, escala })
    if (args.includes('--json')) console.log(JSON.stringify(linhas, null, 2))
    else console.log(tabelaComparar(linhas))
    if (linhas.some((l) => l.potePagouMais)) process.exitCode = 1
  } else {
    const params = conjunto(nomeConj)
    const nomes = so ? [so] : Object.keys(CENARIOS)
    const resultados = []
    for (const n of nomes) {
      try { resultados.push(simular(n, { semente, escala, params })) } catch (e) {
        if (e instanceof Insolvencia) { console.log(`== ${n} ==\n${e.message}`); process.exitCode = 1; continue }
        throw e
      }
    }
    if (args.includes('--json')) console.log(JSON.stringify(resultados, null, 2))
    else {
      console.log(`TODO NÚMERO É PROPOSTA (nada vale sem o "sim" do dono). Conjunto: ${nomeConj}. *token = índice de brinquedo: compra÷venda em 30 dias (>1 sobe, <1 desce).\n`)
      for (const r of resultados) console.log(tabela(r) + '\n')
    }
  }
}
