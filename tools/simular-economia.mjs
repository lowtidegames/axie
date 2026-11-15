#!/usr/bin/env node
// SIMULADOR DA ECONOMIA DO POTE — Frayz (tarefa 2 da fila).
// Modelo por agentes, dia a dia, 180 dias (6 temporadas de 30 dias). Node 22, zero dependências, determinístico por semente.
//
// TODO NÚMERO AQUI É PROPOSTA. Nenhum vira regra sem o "sim" do dono. Não é o arquivo de configuração do jogo.
// Valores em "US$ ilustrativo" (unidade de conta). O preço do token é um modelo de brinquedo (pressão de compra × venda),
// só para mostrar a direção — não prevê preço nenhum.
//
// Uso:
//   node tools/simular-economia.mjs                      os 3 cenários + estresse de bots, semente 42, escala 1
//   node tools/simular-economia.mjs --cenario FUGA       só um cenário
//   node tools/simular-economia.mjs --semente 7 --escala 0.5 --json
//
// Invariante central (checado TODO dia; se quebrar, a simulação para com erro "INSOLVENCIA"):
//   pote pago ≤ entrou no pote + reserva usada − devolvido à reserva;  pote ≥ 0;  reserva ≥ 0;
//   e o dinheiro fecha: entrada externa = estúdio + pote + reserva + saldos dos jogadores + sacado.

// ───────────────────────────── PARÂMETROS (todos PROPOSTA) ─────────────────────────────
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
  RANKING_EXPOENTE: 0.9,           // prêmio ∝ 1/posição^0,9
  LEILOES_POR_BALEIAS: 5,          // 1 leilão de rara por temporada a cada 5 baleias (mín. 1, máx. 20)
  ENFEITE_MEDIO: 3,

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
})

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

// ───────────────────────────── SIMULAÇÃO ─────────────────────────────
export function simular(cenario, opcoes = {}) {
  const P = { ...PARAMETROS, ...(opcoes.params || {}) }
  const cen = typeof cenario === 'string' ? CENARIOS[cenario] : cenario
  if (!cen) throw new Error('cenário desconhecido: ' + cenario)
  const escala = opcoes.escala ?? 1
  const R = criarSorteio(opcoes.semente ?? 42)
  const DIAS = opcoes.dias ?? P.DIAS

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
    sacadoLiq: 0, taxaSaque: 0,
  }
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
  function receita(valor, especial, fonte = especial || 'outros') {
    if (valor <= 0) return
    C.receita += valor; T.receita += valor
    porFonte[fonte] = (porFonte[fonte] || 0) + valor
    let pote, res, est
    if (especial === 'inscricao') {
      pote = valor * P.INSCRICAO_FATIA_RANKING; res = 0; est = valor - pote
      C.poteRanking += pote
    } else {
      pote = valor * P.FATIA_POTE; res = valor * P.FATIA_RESERVA; est = valor - pote - res
      C.poteAventura += pote * P.POTE_FATIA_AVENTURA
      C.poteRanking += pote * P.POTE_FATIA_RANKING
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
    if (tipoGanho) T.ganho[ag.tipo] += valor
  }

  // ── bonecos ──
  const novoBoneco = (rend) => ({ r: rend, d: 0, v: 0 })
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
      ag.bonecos.push(oferta.boneco)
      comprasHoje++
      comprados++
    }
    while (comprados < n) {
      if (!pagar(ag, P.PRECO_BONECO_COMUM, podeExterno)) return comprados
      receita(P.PRECO_BONECO_COMUM, null, 'loja (kit e reposição)')
      ag.bonecos.push(novoBoneco(P.REND_COMUM))
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
    ag.bonecos.push(novoBoneco(Math.min(P.REND_TETO, ((a.r + b.r) / 2) * R.entre(0.95, 1.08))))
    nascimentos++; T.nasc++
    return true
  }
  const rendTime = (bs) => (bs.length >= 3 ? (bs[0].r + bs[1].r + bs[2].r) / 3 : bs.length > 0 ? P.REND_UM_BONECO : 0)

  // ── jogadores ──
  let proxId = 0
  function entrar(tipo, dia) {
    const ag = {
      id: proxId++, tipo, entrou: dia, ativo: true, saldo: 0, bonecos: [], retalhos: 0,
      gastoExterno: 0, gastoExtTemp: 0, gastoTemp: 0, ganhoTemp: 0, sacadoLiq: 0, entrada: 0, recuperouDia: -1,
      skill: Math.exp(0.25 * R.normal()), riqueza: 0, inscrito: false, aluga: null, semTime: 0, temporadaEntrada: Math.floor(dia / P.DIAS_TEMPORADA),
    }
    const antes = C.externo
    if (tipo === 'baleia') {
      ag.riqueza = P.RIQUEZA_BALEIA_MEDIANA * Math.exp(P.RIQUEZA_BALEIA_SIGMA * R.normal())
      const n = Math.max(9, Math.min(30, Math.round(ag.riqueza / 40) * 3))
      for (let i = 0; i < n; i++) { pagar(ag, P.PRECO_BONECO_ORIGEM); receita(P.PRECO_BONECO_ORIGEM, null, 'loja (origem baleia)'); ag.bonecos.push(novoBoneco(P.REND_ORIGEM)) }
      if (dia % P.DIAS_TEMPORADA < 20) inscrever(ag)
    } else if (tipo === 'medio') {
      comprarBonecos(ag, 3)
      if (dia % P.DIAS_TEMPORADA < 20 && R.u() < P.MEDIO_INSCREVE) inscrever(ag)
    } else if (tipo === 'farmador') {
      comprarBonecos(ag, 1) // conta exige 1 boneco; o time vem do aluguel
    } else if (tipo === 'bot') {
      comprarBonecos(ag, 3) // a fazenda compra o kit para farmar sozinha
    }
    ag.entrada = C.externo - antes
    agentes.push(ag); ativos.push(ag)
    return ag
  }
  function inscrever(ag) {
    if (ag.inscrito) return
    if (!pagar(ag, P.INSCRICAO_RANKING)) return
    receita(P.INSCRICAO_RANKING, 'inscricao', 'inscrição de ranking')
    ag.inscrito = true
  }
  function sacar(ag, valor, dia) {
    valor = Math.min(valor, ag.saldo)
    if (valor < P.SAQUE_MINIMO) return
    const idade = dia - ag.entrou
    let taxa = P.TAXA_SAQUE_FAIXAS[0][1]
    for (const [desde, t] of P.TAXA_SAQUE_FAIXAS) if (idade >= desde) taxa = t
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
    sacar(ag, ag.saldo, dia) // quem sai tenta levar o que tem
    if (ag.tipo !== 'farmador') mercado = mercado.filter((m) => m.vendedor !== ag)
  }

  let externoHoje = 0, vendaHoje = 0, comprasHoje = 0

  for (let dia = 0; dia < DIAS; dia++) {
    externoHoje = 0; vendaHoje = 0; comprasHoje = 0
    const temp = Math.floor(dia / P.DIAS_TEMPORADA)
    const diaDaTemp = dia % P.DIAS_TEMPORADA
    if (diaDaTemp === 0 && dia > 0) T = novaTemp(temp)

    // 1) Começo da temporada: inscrições, leilões de raras, enfeites
    if (diaDaTemp === 0) {
      for (const ag of ativos) { ag.inscrito = false; ag.ganhoTemp = 0; ag.gastoTemp = 0; ag.gastoExtTemp = 0 }
      const baleias = ativos.filter((a) => a.tipo === 'baleia')
      for (const ag of ativos) {
        if (ag.tipo === 'baleia' && R.u() < 0.95) inscrever(ag)
        else if (ag.tipo === 'medio' && R.u() < P.MEDIO_INSCREVE) inscrever(ag)
      }
      const nLeiloes = Math.max(baleias.length ? 1 : 0, Math.min(20, Math.round(baleias.length / P.LEILOES_POR_BALEIAS)))
      for (let k = 0; k < nLeiloes; k++) {
        const lances = baleias.map((b) => ({ b, v: b.riqueza * R.entre(0.05, 0.25) })).sort((x, y) => y.v - x.v)
        if (!lances.length) break
        const vence = lances[0].b
        const valor = lances.length > 1 ? lances[1].v : lances[0].v * 0.5 // segundo maior lance
        pagar(vence, valor); receita(valor, null, 'leilão de raras')
        vence.bonecos.push(novoBoneco(P.REND_RARA))
      }
      for (const ag of ativos) {
        if (ag.tipo === 'baleia' && R.u() < 0.7) { const v = ag.riqueza * 0.05; pagar(ag, v); receita(v, null, 'enfeites') }
        else if (ag.tipo === 'medio' && R.u() < 0.1) { pagar(ag, P.ENFEITE_MEDIO); receita(P.ENFEITE_MEDIO, null, 'enfeites') }
      }
    }

    // 2) População: saídas (base + cenário) e entradas
    const alvo = Math.max(1, Math.round(cen.alvo(dia) * escala))
    for (const ag of ativos) {
      let p = P.SAIDA_DIA[ag.tipo]
      if (ag.tipo === 'farmador' && ag.semTime > 5) p += P.SAIDA_SEM_TIME
      if (R.u() < p) sair(ag, dia)
    }
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
      entrar(tipo, dia)
    }
    T.ativosMax = Math.max(T.ativosMax, ativos.length)

    // 3) Times: próprio time de cada um + times de aluguel das baleias
    const baleias = ativos.filter((a) => a.tipo === 'baleia')
    const farmadores = ativos.filter((a) => a.tipo === 'farmador')
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
    // embaralha farmadores (sorteio com semente) e distribui
    for (let i = farmadores.length - 1; i > 0; i--) { const j = Math.floor(R.u() * (i + 1)); [farmadores[i], farmadores[j]] = [farmadores[j], farmadores[i]] }
    let ti = 0
    for (const f of farmadores) {
      const proprio = rendTime(f.bonecos)
      const t = timesAluguel[ti]
      if (t && t.r * P.ALUGUEL_FARMADOR > proprio * 1.0) { f.aluga = t; ti++; f.semTime = 0 }
      else { f.aluga = null; f.semTime++; T.farmSemTimeDias++ }
    }
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

    // 5) Aventura: pontos, liberação do pote, reserva amortecedora, pagamento
    const jogadas = [] // {ag, pontos, lutas, bs, dono}
    let totalPontos = 0
    for (const ag of ativos) {
      const lutas = Math.round(P.ENERGIA_DIARIA * P.USO_ENERGIA[ag.tipo])
      let bs, r, dono = null
      if (ag.tipo === 'farmador' && ag.aluga) { bs = ag.aluga.bs; r = ag.aluga.r; dono = ag.aluga.dono }
      else { ag.bonecos.sort((x, y) => y.r - x.r); bs = ag.bonecos.slice(0, 3); r = rendTime(ag.bonecos) }
      if (r <= 0) continue
      const pontos = lutas * r * R.entre(0.9, 1.1)
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
    let pagoHoje = 0
    for (const j of jogadas) {
      const v = j.pontos * valorPonto
      pagoHoje += v
      if (j.dono) {
        creditar(j.ag, v * P.ALUGUEL_FARMADOR, true)
        creditar(j.dono, v * P.ALUGUEL_DONO, true)
        receita(v * P.ALUGUEL_TAXA, null, 'taxa de aluguel') // receita só depois de tirar do pote (abaixo); ordem não muda o total
      } else creditar(j.ag, v, true)
      if (j.ag.tipo === 'bot') T.pagoBots += v
      for (const b of j.bs) b.d += j.lutas
    }
    C.poteAventura -= pagoHoje; C.pagoPote += pagoHoje; T.pagoPote += pagoHoje
    historicoLib.push(lib); historicoPago.push(pagoHoje)
    for (const ag of ativos) T.dias[ag.tipo]++

    // 6) Desgaste → Aposentadoria (vira Retalho Honrado); médio repõe o time
    for (const ag of ativos) {
      const antes = ag.bonecos.length
      if (antes === 0) continue
      ag.bonecos = ag.bonecos.filter((b) => b.d < P.DESGASTE_MAX)
      const apos = antes - ag.bonecos.length
      if (apos > 0) { ag.retalhos += apos; T.apos += apos }
      if ((ag.tipo === 'medio' || ag.tipo === 'bot') && ag.bonecos.length < 3) {
        const falta = 3 - ag.bonecos.length
        const podeExterno = ag.tipo === 'bot' || R.u() < P.MEDIO_REPOE_COM_DINHEIRO
        if (comprarBonecos(ag, falta, podeExterno) < falta && ag.tipo === 'medio') sair(ag, dia)
      }
    }
    ativos = ativos.filter((a) => a.ativo)

    // 7) Saques
    for (const ag of ativos) {
      if (ag.saldo < P.SAQUE_MINIMO) continue
      if (ag.tipo === 'bot') sacar(ag, ag.saldo, dia)
      else if (ag.tipo === 'farmador') { if (R.u() < 0.5) sacar(ag, ag.saldo * 0.95, dia) }
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

    // 9) Fim da temporada: prêmio do ranking e sobra
    if (diaDaTemp === P.DIAS_TEMPORADA - 1 || dia === DIAS - 1) {
      const inscritos = ativos.filter((a) => a.inscrito)
      const pont = inscritos.map((a) => {
        const bs = [...a.bonecos].sort((x, y) => y.r - x.r)
        const raras = a.bonecos.filter((b) => b.r >= P.REND_RARA).length
        return { a, s: rendTime(bs) * (1 + 0.05 * Math.min(3, raras)) * a.skill }
      }).sort((x, y) => y.s - x.s)
      const top10Baleias = []
      if (pont.length) {
        const K = Math.min(P.RANKING_PREMIADOS_MAX, Math.max(1, Math.ceil(pont.length * P.RANKING_PREMIADOS_FRAC)))
        let somaPesos = 0
        for (let r = 1; r <= K; r++) somaPesos += 1 / r ** P.RANKING_EXPOENTE
        const total = C.poteRanking
        let pagoR = 0
        for (let r = 1; r <= K; r++) {
          const v = (total * (1 / r ** P.RANKING_EXPOENTE)) / somaPesos
          creditar(pont[r - 1].a, v, true); pagoR += v
        }
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
  const nomes = so ? [so] : Object.keys(CENARIOS)
  const resultados = []
  for (const n of nomes) {
    try { resultados.push(simular(n, { semente, escala })) } catch (e) {
      if (e instanceof Insolvencia) { console.log(`== ${n} ==\n${e.message}`); process.exitCode = 1; continue }
      throw e
    }
  }
  if (args.includes('--json')) console.log(JSON.stringify(resultados, null, 2))
  else {
    console.log('TODO NÚMERO É PROPOSTA (nada vale sem o "sim" do dono). *token = índice de brinquedo: compra÷venda em 30 dias (>1 sobe, <1 desce).\n')
    for (const r of resultados) console.log(tabela(r) + '\n')
  }
}
