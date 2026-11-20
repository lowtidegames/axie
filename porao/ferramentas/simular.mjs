// Porão (jogo-sátira) — simulador de ritmo (tarefa 7). Moeda fictícia, uso pessoal: aqui só se mede ritmo e diversão.
// Rodar: node porao/ferramentas/simular.mjs [--sementes N] [--detalhe] [--com '{"IMPRESSORA":{"custo":100}}']  (~1 min com 10 sementes)
//
// Jogadores-robô usam as MESMAS regras do servidor (porao/comum/regras.js) e os números de porao/comum/config.js.
// Estilos: apressado (puxa cedo, nada fica no ar fora do jogo) · equilibrado (puxa no pico, evita batida) ·
//          ganancioso (espera o preço máximo, ignora o Calor, paga rebrand).
// Ritmos de jogo (sessões curtas online + tempo fora): casual · normal · viciado. 7 dias de jogo, várias sementes.
// Saída: resumo de 3 linhas (com APROVADO/REPROVADO nas metas) + detalhe.
import * as R from '../comum/regras.js'
import * as C from '../comum/config.js'
import { criarRng } from '../../shared/rng.js'
import { pathToFileURL } from 'node:url'

const T0 = Date.UTC(2026, 10, 20, 22, 0, 0) // início: 19:00 BRT do dia 1
const MIN = 60_000
const HORA = 60 * MIN
const DIA = 24 * HORA
const PASSO_ONLINE = 20_000 // a tela pede o estado a cada 20 s
const DIAS = 7

// ---------------------------------------------------------------------------------------------
// Agenda: [minuto do dia, duração em min]. O dia 1 começa às 19:00 com a sessão longa da 1ª hora.
// ---------------------------------------------------------------------------------------------
export const RITMOS = {
  casual: { primeira: 30, sessoes: [[8 * 60, 10], [13 * 60, 10], [21 * 60 + 30, 10]] },
  normal: { primeira: 60, sessoes: [[8 * 60, 15], [12 * 60 + 30, 15], [16 * 60, 15], [19 * 60 + 30, 15], [22 * 60 + 30, 15]] },
  viciado: { primeira: 90, sessoes: [[7 * 60, 20], [9 * 60, 20], [11 * 60, 20], [13 * 60, 20], [15 * 60, 20], [17 * 60, 20], [19 * 60, 20], [22 * 60, 20]] },
}

function agenda(ritmo, semente) {
  const rng = criarRng('agenda:' + semente)
  const ag = RITMOS[ritmo]
  const lista = [{ inicio: T0, fim: T0 + ag.primeira * MIN }]
  const fimDoJogo = T0 + DIAS * DIA
  const meiaNoite = T0 - 19 * HORA
  for (let d = 0; d <= DIAS; d++) {
    for (const [m, dur] of ag.sessoes) {
      const jit = Math.round((rng.proximo() - 0.5) * 60) * MIN // ±30 min
      const dd = Math.max(5, Math.round(dur * (0.7 + 0.6 * rng.proximo()))) * MIN // ±30%
      const inicio = meiaNoite + d * DIA + m * MIN + jit
      const ultimo = lista.at(-1)
      if (inicio <= ultimo.fim + 30 * MIN || inicio >= fimDoJogo) continue
      lista.push({ inicio, fim: Math.min(inicio + dd, fimDoJogo) })
    }
  }
  return lista
}

// ---------------------------------------------------------------------------------------------
// Estilos e política de influenciador
// ---------------------------------------------------------------------------------------------
const minutosPrecoMax = () => C.TAPETE.precoExtraMaximo / C.TAPETE.precoSobePorMin
export const ESTILOS = {
  apressado: { puxaComSeg: 120, puxaTudoAoSair: true, evitaBatida: true, calorParaLancar: 100, calorAlerta: 85, influ: 'nunca' },
  equilibrado: { puxaNoPico: true, evitaBatida: true, calorParaLancar: 70, calorAlerta: 75, influ: 'so_v1' },
  ganancioso: { puxaNoMaximo: true, evitaBatida: false, calorParaLancar: 100, influ: 'sempre' },
}
export const POLITICAS_INFLU = ['nunca', 'so_v1', 'sempre', 'chora']

const noAr = p => R.FASES_NO_AR.includes(p.fase)
const indice = r => C.RARIDADES.indexOf(r)
const maxTrouxas = p => C.TROUXAS.maximo[p.raridade]

/** Valor do tapete daqui a `minDepois` (estimativa do robô). */
function estimaTapete(p, minDepois = 0) {
  const min = p.tempoNoAr / 60 + minDepois
  const tr = Math.max(p.trouxas, Math.min(maxTrouxas(p), p.trouxas + C.TROUXAS.crescimentoPorMin[p.raridade] * minDepois))
  return C.TAPETE.precoPorTrouxa[p.raridade] * tr * (1 + Math.min(min * C.TAPETE.precoSobePorMin, C.TAPETE.precoExtraMaximo))
}

// ---------------------------------------------------------------------------------------------
// Uma corrida: um robô, um ritmo, uma semente, 7 dias.
// ---------------------------------------------------------------------------------------------
export function correr({ estilo, ritmo, semente, influ }) {
  const E = ESTILOS[estilo]
  const politica = influ || E.influ
  let s = R.estadoInicial({ semente: `sim:${semente}`, agora: T0 })
  const m = {
    estilo, ritmo, semente, politica,
    seg1Tapete: null, primeiraRaridade: {}, primeiroLuxo: null, prestigios: [], novidades: [],
    batidas: 0, rebrands: 0, perdas: 0, zeradas: 0, tapetes: 0,
    ganhoTapete: 0, ganhoRende: 0, gastoImpressao: 0, gastoLuxo: 0, gastoRebrand: 0, gastoInflu: 0,
    contratos: 0, v2Pagos: 0, pedeMais: 0, chorouDesconto: 0, chorouSumiu: 0, custoInflu: 0,
    onlineSeg: 0, caixaMax: 0, problemas: [], acoes: [],
  }
  let agora = T0
  let onlineSeg = 0
  const marca = tipo => m.novidades.push({ tipo, dia: (agora - T0) / DIA, onlineMin: onlineSeg / 60 })
  const novaCarta = carta => {
    if (carta && m.primeiraRaridade[carta.raridade] == null) {
      m.primeiraRaridade[carta.raridade] = { dia: (agora - T0) / DIA, onlineMin: onlineSeg / 60 }
      if (carta.raridade !== 'comum') marca('raridade:' + carta.raridade)
    }
  }
  const eventos = evs => {
    for (const ev of evs || []) {
      if (ev.tipo === 'batida') m.batidas++
      if (ev.tipo === 'calor_zerou') m.zeradas++
      if (ev.tipo === 'pedido' && ev.fase === 'PEDE_MAIS') m.pedeMais++
      if (ev.tipo === 'pedido' && !vistos.has('pedido')) { vistos.add('pedido'); marca('1º pedido no celular') }
      if (ev.tipo === 'fase' && ev.fase === 'PICO' && !vistos.has('pico')) { vistos.add('pico'); marca('1º pico') }
      if (ev.tipo === 'batida' && !vistos.has('batida')) { vistos.add('batida'); marca('1ª batida') }
    }
  }
  const vistos = new Set()
  const aplicar = r => {
    if (!r.ok) throw new Error(`ação recusada: ${r.erro}`)
    s = r.estado; eventos(r.eventos)
    if (onlineSeg <= 3600) m.acoes.push(onlineSeg / 60) // minutos online de cada ação na 1ª hora
    return r
  }

  function puxar(p) {
    const lib = R.influenciadoresLiberados(s).length
    const r = aplicar(R.puxarTapete(s, p.id))
    m.tapetes++
    m.ganhoTapete += r.ganho
    if (m.seg1Tapete == null) { m.seg1Tapete = onlineSeg; marca('1º tapete') }
    if (R.influenciadoresLiberados(s).length > lib) marca('influenciador liberado')
  }

  /** Maior influenciador liberado cujo vídeo devolve 2× o preço no tapete (e que o Calor aguenta, para os cuidadosos). */
  function melhorVideo(p) {
    const lib = R.influenciadoresLiberados(s)
    const extra = 1 + Math.min(p.tempoNoAr / 60 * C.TAPETE.precoSobePorMin, C.TAPETE.precoExtraMaximo)
    return C.INFLUENCIADORES.filter(i => lib.includes(i.id))
      .map(i => ({ id: i.id, t: C.CONTRATO.tamanhos[i.tamanho] }))
      .filter(({ t }) => s.caixa >= t.p1 && !(E.evitaBatida && s.calor + t.calorVideo >= E.calorAlerta) &&
        Math.round(t.trouxasVideo * C.CONTRATO.trouxasPorRaridade[p.raridade]) * C.TAPETE.precoPorTrouxa[p.raridade] * extra > 2 * t.p1)
      .sort((a, b) => b.t.p1 - a.t.p1)[0] || null
  }

  function agir(saindo) {
    for (let guarda = 0; guarda < 200; guarda++) {
      // 1. batida: rebrand se o projeto vale mais que o custo e dá para pagar
      if (s.batida) {
        const pv = R.previaBatida(s)
        const p = s.projetos.find(x => x.id === pv.projetoId)
        const vale = p ? estimaTapete(p, 30) : 0
        if (pv.podeRebrand && vale > pv.custoRebrand) { aplicar(R.resolverBatida(s, 'rebrand')); m.rebrands++; m.gastoRebrand += pv.custoRebrand }
        else { aplicar(R.resolverBatida(s, 'perder')); m.perdas++ }
        continue
      }
      // 2. prestígio assim que libera
      if (R.prestigioLiberado(s)) {
        aplicar(R.irPreso(s))
        m.prestigios.push({ dia: (agora - T0) / DIA, onlineMin: onlineSeg / 60 })
        marca('prestígio')
        continue
      }
      // 3. fusão
      const contagem = {}
      for (const c of s.cartas) if (c.raridade !== 'mitico') contagem[c.ideia] = (contagem[c.ideia] || 0) + 1
      const fundivel = Object.keys(contagem).find(k => contagem[k] >= C.FUSAO.quantidade)
      if (fundivel) {
        const r = aplicar(R.fundir(s, fundivel))
        if (s.contagem.fusoes === 1) marca('1ª fusão')
        novaCarta(r.carta)
        continue
      }
      // 4. luxo (o mais barato que falta)
      const proxLuxo = C.LUXOS.filter(l => !s.luxos.includes(l.id)).sort((a, b) => a.custo - b.custo)[0]
      if (proxLuxo && s.caixa >= proxLuxo.custo) {
        aplicar(R.comprarLuxo(s, proxLuxo.id))
        m.gastoLuxo += proxLuxo.custo
        if (m.primeiroLuxo == null) m.primeiroLuxo = { dia: (agora - T0) / DIA, onlineMin: onlineSeg / 60 }
        marca('luxo:' + proxLuxo.id)
        continue
      }
      // 5. tapete (o mais barato primeiro)
      const prontos = s.projetos.filter(p => noAr(p) && p.fase !== 'LANCAMENTO')
        .sort((a, b) => indice(a.raridade) - indice(b.raridade) || a.id - b.id)
      let puxou = false
      for (const p of prontos) {
        let quer = false
        if (m.seg1Tapete == null) quer = p.tempoNoAr >= 15 // 1º minuto: o 1º tapete sai logo
        else if (E.puxaComSeg != null) quer = p.tempoNoAr >= E.puxaComSeg || (saindo && E.puxaTudoAoSair)
        else if (E.puxaNoPico) quer = p.trouxas >= maxTrouxas(p) - 1e-6
        else if (E.puxaNoMaximo) quer = p.trouxas >= maxTrouxas(p) - 1e-6 && p.tempoNoAr / 60 >= minutosPrecoMax()
        if (!quer) continue
        // vídeo antes do tapete: as trouxas do vídeo só somam ACIMA do máximo se o projeto já está no pico
        // (antes disso o vídeo só adianta o crescimento). Contrata, espera o pedido do vídeo 2, responde, depois puxa.
        if (politica !== 'nunca' && !saindo && m.seg1Tapete != null) {
          if (!p.contrato) {
            const v = melhorVideo(p)
            if (v) {
              const r = aplicar(R.contratar(s, p.id, v.id))
              m.contratos++; m.gastoInflu += r.custo; m.custoInflu += r.custo
              if (m.contratos === 1) marca('1º vídeo')
              puxou = true; break
            }
          } else if (p.contrato.fase === 'V1_NO_AR' || p.contrato.fase === 'PEDE_MAIS') continue // espera o pedido / responde
        }
        if (E.evitaBatida && R.previaTapete(s, p.id).batida) continue // espera: puxa outro antes ou deixa esfriar
        puxar(p); puxou = true; break
      }
      if (puxou) continue
      // 5b. cuidadoso com Calor alto e subindo: tira do ar o projeto que mais esquenta (se o tapete não chama a polícia)
      if (E.evitaBatida && s.calor >= E.calorAlerta) {
        const b = R.bonus(s)
        const sobe = s.projetos.filter(noAr).reduce((a, p) => a + C.CALOR.projetoNoArPorMin[p.raridade], 0) * (1 - b.calor)
        if (sobe > C.CALOR.quedaPorMin) {
          const alvo = prontos.filter(p => !R.previaTapete(s, p.id).batida)
            .sort((a, b2) => C.CALOR.projetoNoArPorMin[b2.raridade] - C.CALOR.projetoNoArPorMin[a.raridade])[0]
          if (alvo) { puxar(alvo); continue }
        }
      }
      // 6. proposta do vídeo 2
      const prop = s.projetos.find(p => p.contrato && noAr(p) &&
        ((p.contrato.fase === 'V1_NO_AR' && p.contrato.proposta !== null) || p.contrato.fase === 'PEDE_MAIS'))
      if (prop) {
        const c = prop.contrato
        const barato = c.fase === 'V1_NO_AR'
        let resp = 'recusar'
        if (politica === 'sempre') resp = 'pagar'
        else if (politica === 'so_v1') resp = barato ? 'pagar' : 'recusar'
        else if (politica === 'chora') resp = barato || c.chorou ? 'pagar' : 'chorar'
        if (resp === 'pagar' && s.caixa < c.proposta) resp = 'recusar'
        if (resp !== 'recusar' && E.evitaBatida && s.calor + C.CONTRATO.tamanhos[c.tamanho].calorVideo >= E.calorAlerta + 5) resp = 'recusar'
        const r = aplicar(R.responderContrato(s, prop.id, resp))
        if (resp === 'pagar') { m.v2Pagos++; m.gastoInflu += r.custo; m.custoInflu += r.custo }
        if (r.desfecho === 'desconto') m.chorouDesconto++
        if (r.desfecho === 'sumiu') m.chorouSumiu++
        continue
      }
      // 7. lançar (a carta mais rara primeiro)
      const noArAgora = s.projetos.filter(noAr).length
      // (fora do jogo o Calor não sobe: quem não é apressado deixa os 3 no ar ao sair)
      if (noArAgora < C.PROJETOS.maximoNoAr && s.cartas.length > 0 && (s.calor < E.calorParaLancar || saindo) &&
          !(saindo && E.puxaTudoAoSair)) {
        const carta = [...s.cartas].sort((a, b) => indice(b.raridade) - indice(a.raridade) || a.id - b.id)[0]
        aplicar(R.lancar(s, carta.id))
        continue
      }
      // 8. imprimir: mantém a gaveta com cartas; o que passa da poupança do próximo luxo vai para a impressora
      if (s.cartas.length < C.GAVETA.maximoDeCartas) {
        const custo = R.custoImpressao(s)
        const poupanca = proxLuxo ? proxLuxo.custo : 0
        const quer = custo === 0 || (s.caixa >= custo && (s.cartas.length < C.PROJETOS.maximoNoAr || s.caixa - custo >= poupanca))
        if (quer) {
          const r = aplicar(R.imprimir(s))
          m.gastoImpressao += r.custo
          novaCarta(r.carta)
          continue
        }
      }
      break
    }
    m.caixaMax = Math.max(m.caixaMax, s.caixa)
    if (!Number.isFinite(s.caixa) || s.caixa < 0 || !Number.isFinite(s.calor)) m.problemas.push(`estado inválido no dia ${((agora - T0) / DIA).toFixed(2)}`)
  }

  for (const sess of agenda(ritmo, semente)) {
    if (sess.inicio > agora) {
      const r = R.avancar(s, sess.inicio, { online: false })
      s = r.estado; m.ganhoRende += r.rendeu; eventos(r.eventos)
      agora = sess.inicio
    }
    agir(false)
    while (agora < sess.fim) {
      agora = Math.min(agora + PASSO_ONLINE, sess.fim)
      const r = R.avancar(s, agora, { online: true })
      s = r.estado; m.ganhoRende += r.rendeu; eventos(r.eventos)
      onlineSeg += r.segundos
      agir(sess.fim - agora < PASSO_ONLINE)
    }
  }
  const fim = T0 + DIAS * DIA // fecha os 7 dias fora do jogo
  if (fim > agora) { const r = R.avancar(s, fim, { online: false }); s = r.estado; m.ganhoRende += r.rendeu }
  m.onlineSeg = onlineSeg
  m.nivelFinal = s.prestigio.nivel
  m.caixaFinal = s.caixa
  m.album = Object.keys(s.album).length
  return m
}

// ---------------------------------------------------------------------------------------------
// Estatística
// ---------------------------------------------------------------------------------------------
const mediana = xs => { const v = xs.filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : null }
const media = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
const fmt = (x, d = 1) => x == null ? '—' : Number(x).toFixed(d)
const ganhoTotal = m => m.ganhoTapete + m.ganhoRende
const NUNCA = 99

const maiorLacuna = tempos => {
  const t = [0, ...tempos.filter(x => x <= 60), 60]
  let maior = 0
  for (let i = 1; i < t.length; i++) maior = Math.max(maior, t[i] - t[i - 1])
  return maior
}
/** 1ª hora (min online): maior intervalo sem novidade, quantas novidades e maior intervalo sem nada para fazer. */
function lacunasPrimeiraHora(m) {
  const nov = m.novidades.map(n => n.onlineMin).filter(x => x <= 60)
  return { maior: maiorLacuna(nov), quantas: nov.length, media: 60 / (nov.length + 1), semAcao: maiorLacuna(m.acoes) }
}

// ---------------------------------------------------------------------------------------------
// Contas sem sorteio: valor do tapete e do vídeo por raridade
// ---------------------------------------------------------------------------------------------
export function tabelaRaridades() {
  return C.RARIDADES.map(r => {
    const ini = C.TROUXAS.iniciais[r], max = C.TROUXAS.maximo[r], cres = C.TROUXAS.crescimentoPorMin[r]
    const minPico = (max - ini) / cres
    const preco = C.TAPETE.precoPorTrouxa[r]
    const ext = min => 1 + Math.min(min * C.TAPETE.precoSobePorMin, C.TAPETE.precoExtraMaximo)
    const calor = min => C.TAPETE.calorBase[r] * (1 + Math.min(min * C.TAPETE.calorSobePorMin, C.TAPETE.calorExtraMaximo))
    const minMax = Math.max(minPico, minutosPrecoMax())
    return {
      r, minPico,
      cedo: Math.floor(preco * (ini + cres) * ext(1)),
      pico: Math.floor(preco * max * ext(minPico)),
      maximo: Math.floor(preco * max * ext(minMax)),
      calorCedo: calor(1), calorPico: calor(minPico), calorMax: calor(minMax),
      rendeHora: C.RENDIMENTO_POR_TROUXA_HORA[r] * max,
      rebrand: C.CALOR.rebrandCusto[r],
    }
  })
}

export function tabelaVideos() {
  const linhas = []
  for (const [tam, t] of Object.entries(C.CONTRATO.tamanhos)) {
    for (const r of C.RARIDADES) {
      const traz = Math.round(t.trouxasVideo * C.CONTRATO.trouxasPorRaridade[r])
      const minPico = (C.TROUXAS.maximo[r] - C.TROUXAS.iniciais[r]) / C.TROUXAS.crescimentoPorMin[r]
      const pico = traz * C.TAPETE.precoPorTrouxa[r] * (1 + Math.min(minPico * C.TAPETE.precoSobePorMin, C.TAPETE.precoExtraMaximo))
      const maximo = traz * C.TAPETE.precoPorTrouxa[r] * (1 + C.TAPETE.precoExtraMaximo)
      const p2 = traz > t.limiteTrouxas ? Math.round(t.p1 * C.CONTRATO.multiplicadorP2) : t.p1
      linhas.push({ tam, r, traz, p1: t.p1, p2, v1: pico - t.p1, v2: pico - p2, v1max: maximo - t.p1, v2max: maximo - p2 })
    }
  }
  return linhas
}

// ---------------------------------------------------------------------------------------------
// Metas de ritmo (pedido do dono, 20/11/2026). Devolve [{ meta, ok, valor }].
// ---------------------------------------------------------------------------------------------
const filtro = (res, estilo, ritmo, politica) =>
  res.filter(m => m.estilo === estilo && m.ritmo === ritmo && m.politica === (politica || ESTILOS[estilo].influ))

export function avaliar(res) {
  const metas = []
  const nEq = filtro(res, 'equilibrado', 'normal')
  const t1 = Math.max(...res.map(m => m.seg1Tapete ?? Infinity))
  metas.push({ meta: '1º tapete < 60 s (todos)', ok: t1 < 60, valor: `${fmt(t1, 0)} s no pior` })
  // "algo novo para fazer a cada poucos minutos": novidade em média a cada ≤ 5 min, nenhuma lacuna de novidade > 12 min
  // e nunca > 7 min sem ação do robô equilibrado (tapete, impressão, lançamento, vídeo). Medianas das sementes.
  const lp = nEq.map(lacunasPrimeiraHora)
  const lac = mediana(lp.map(x => x.maior)), med = mediana(lp.map(x => x.media)), semAcao = mediana(lp.map(x => x.semAcao))
  metas.push({
    meta: '1ª hora: novidade em média a cada ≤ 5 min, maior lacuna ≤ 12 min, nunca > 7 min sem ação',
    ok: med <= 5 && lac <= 12 && semAcao <= 7,
    valor: `novidade a cada ${fmt(med)} min (maior lacuna ${fmt(lac)}) · maior tempo sem ação ${fmt(semAcao)} min`,
  })
  const mit7 = nEq.filter(m => m.primeiraRaridade.mitico).length / nEq.length
  const mit1 = nEq.filter(m => m.primeiraRaridade.mitico && m.primeiraRaridade.mitico.dia < 1).length / nEq.length
  metas.push({ meta: '1º Mítico raro mas possível (normal: 30–90% até o d7, ≤ 10% no d1)', ok: mit7 >= 0.3 && mit7 <= 0.9 && mit1 <= 0.1, valor: `${fmt(mit7 * 100, 0)}% até d7 · ${fmt(mit1 * 100, 0)}% no d1` })
  const prest = mediana(nEq.map(m => m.prestigios[0]?.dia ?? NUNCA)) + 1
  metas.push({ meta: '1º prestígio entre o dia 2 e o dia 4 (normal)', ok: prest >= 2 && prest <= 4, valor: `dia ${fmt(prest, 1)}` })
  const bph = xs => media(xs.map(m => m.batidas / (m.onlineSeg / 3600)))
  const bG = bph(filtro(res, 'ganancioso', 'normal')), bE = bph(nEq), bA = bph(filtro(res, 'apressado', 'normal'))
  metas.push({ meta: 'batida ameaça quem abusa (ganancioso 0,3–3/h online) e poupa o equilibrado (≤ 0,5/h)', ok: bG >= 0.3 && bG <= 3 && bE <= 0.5, valor: `batidas/h ganancioso ${fmt(bG, 2)} · equilibrado ${fmt(bE, 2)} · apressado ${fmt(bA, 2)}` })
  const gG = media(filtro(res, 'ganancioso', 'normal').map(ganhoTotal)), gA = media(filtro(res, 'apressado', 'normal').map(ganhoTotal)), gE = media(nEq.map(ganhoTotal))
  const prestA = mediana(filtro(res, 'apressado', 'normal').map(m => m.prestigios[0]?.dia ?? NUNCA)) + 1
  metas.push({
    meta: 'risco vale (ganancioso 1,2–4× o apressado) sem ser obrigatório (equilibrado ≥ 0,7× ganancioso; apressado normal chega ao prestígio em 7 dias)',
    ok: gG / gA >= 1.2 && gG / gA <= 4 && gE / gG >= 0.7 && prestA <= DIAS,
    valor: `ganancioso/apressado ${fmt(gG / gA, 2)}× · equilibrado/ganancioso ${fmt(gE / gG, 2)}× · prestígio do apressado dia ${prestA > DIAS ? 'nunca' : fmt(prestA, 1)}`,
  })
  const caixaMax = Math.max(...res.map(m => m.caixaMax))
  const prob = res.flatMap(m => m.problemas)
  metas.push({ meta: 'caixa não explode nem trava (máx < 10 milhões, sem estado inválido)', ok: caixaMax < 1e7 && prob.length === 0, valor: `caixa máx ${Math.round(caixaMax)} · problemas ${prob.length}` })
  return metas
}

export function rodarTudo(nSementes = 10) {
  const res = []
  for (const ritmo of Object.keys(RITMOS)) {
    for (const estilo of Object.keys(ESTILOS)) {
      for (let i = 0; i < nSementes; i++) res.push(correr({ estilo, ritmo, semente: `${ritmo}-${i}` }))
    }
  }
  for (const influ of POLITICAS_INFLU) { // influenciadores: equilibrado normal com cada política, mesmas sementes
    if (influ === ESTILOS.equilibrado.influ) continue
    for (let i = 0; i < nSementes; i++) res.push(correr({ estilo: 'equilibrado', ritmo: 'normal', semente: `normal-${i}`, influ }))
  }
  return res
}

export function relatorio(res, detalhe = false) {
  const linhas = []
  const out = x => linhas.push(x)
  const metas = avaliar(res)
  const aprovado = metas.every(x => x.ok)
  const nEq = filtro(res, 'equilibrado', 'normal')
  const r = k => { const d = mediana(nEq.map(m => m.primeiraRaridade[k]?.dia ?? NUNCA)); return d >= NUNCA ? 'nunca' : `dia ${fmt(d + 1, 1)}` }
  out(`${aprovado ? 'APROVADO' : 'REPROVADO'} — Porão, 7 dias · ${nEq.length} sementes × 3 estilos × 3 ritmos + 3 políticas de vídeo (${res.length} corridas) · metas ${metas.filter(x => x.ok).length}/${metas.length}`)
  out(`Normal/equilibrado: 1º tapete ${fmt(mediana(nEq.map(m => m.seg1Tapete)), 0)} s · 1º luxo ${fmt(mediana(nEq.map(m => m.primeiroLuxo?.onlineMin)), 0)} min online · raro ${r('raro')} · épico ${r('epico')} · lendário ${r('lendario')} · prestígio ${metas[3].valor}`)
  out(`${metas[4].valor} · ${metas[5].valor} · Mítico ${metas[2].valor}`)
  out('')
  out('Metas:')
  for (const x of metas) out(`  [${x.ok ? 'ok' : 'FALHA'}] ${x.meta}: ${x.valor}`)
  out('')
  out('Por ritmo e estilo (medianas; "dia" = dia de jogo, dia 1 = primeiras 24 h; 99 = não chegou em 7 dias):')
  out('  ritmo    estilo      online/dia  raro  épico  lend.  mítico(%)  1ºluxo  prestígio níveis tapetes/h batidas/h zeradas/h  ganho 7d')
  for (const ritmo of Object.keys(RITMOS)) {
    for (const estilo of Object.keys(ESTILOS)) {
      const g = filtro(res, estilo, ritmo)
      const h = m => m.onlineSeg / 3600
      const dia = f => { const d = mediana(g.map(f)); return d >= NUNCA ? '99' : fmt(d + 1, 1) }
      const pr = k => dia(m => m.primeiraRaridade[k]?.dia ?? NUNCA)
      const mit = g.filter(m => m.primeiraRaridade.mitico).length / g.length
      out(`  ${ritmo.padEnd(8)} ${estilo.padEnd(12)} ${fmt(mediana(g.map(m => m.onlineSeg / 60)) / DIAS, 0).padStart(5)} min ${pr('raro').padStart(5)} ${pr('epico').padStart(6)} ${pr('lendario').padStart(6)} ${(pr('mitico') + ` (${fmt(mit * 100, 0)})`).padStart(10)} ${(fmt(mediana(g.map(m => m.primeiroLuxo?.onlineMin ?? null)), 0) + 'min').padStart(7)} ${dia(m => m.prestigios[0]?.dia ?? NUNCA).padStart(10)} ${fmt(media(g.map(m => m.nivelFinal)), 1).padStart(6)} ${fmt(media(g.map(m => m.tapetes / h(m))), 1).padStart(9)} ${fmt(media(g.map(m => m.batidas / h(m))), 2).padStart(9)} ${fmt(media(g.map(m => m.zeradas / h(m))), 2).padStart(9)} ${String(Math.round(media(g.map(ganhoTotal)))).padStart(9)}`)
    }
  }
  out('')
  out('1ª hora (normal, equilibrado, semente 0), em minutos online:')
  out('  ' + nEq[0].novidades.filter(n => n.onlineMin <= 60).map(n => `${fmt(n.onlineMin, 1)} ${n.tipo}`).join(' · '))
  out(`  mediana das sementes: ${fmt(mediana(nEq.map(m => lacunasPrimeiraHora(m).quantas)), 0)} novidades; maior intervalo ${fmt(mediana(nEq.map(m => lacunasPrimeiraHora(m).maior)))} min; maior tempo sem ação ${fmt(mediana(nEq.map(m => lacunasPrimeiraHora(m).semAcao)))} min`)
  const bDia = (estilo, ritmo) => fmt(media(filtro(res, estilo, ritmo).map(m => m.batidas / DIAS)), 2)
  out(`  batidas por dia (normal): apressado ${bDia('apressado', 'normal')} · equilibrado ${bDia('equilibrado', 'normal')} · ganancioso ${bDia('ganancioso', 'normal')} (viciado ganancioso ${bDia('ganancioso', 'viciado')})`)
  out('')
  out('Influenciadores (normal, equilibrado, mesmas sementes; média por corrida de 7 dias):')
  out('  política  vídeos1 vídeos2 pedeMais desconto sumiu   custo   ganho 7d  batidas/h')
  for (const p of POLITICAS_INFLU) {
    const g = filtro(res, 'equilibrado', 'normal', p)
    out(`  ${p.padEnd(9)} ${fmt(media(g.map(m => m.contratos)), 1).padStart(7)} ${fmt(media(g.map(m => m.v2Pagos)), 1).padStart(7)} ${fmt(media(g.map(m => m.pedeMais)), 1).padStart(8)} ${fmt(media(g.map(m => m.chorouDesconto)), 1).padStart(8)} ${fmt(media(g.map(m => m.chorouSumiu)), 1).padStart(5)} ${String(Math.round(media(g.map(m => m.custoInflu)))).padStart(7)} ${String(Math.round(media(g.map(ganhoTotal)))).padStart(10)} ${fmt(media(g.map(m => m.batidas / (m.onlineSeg / 3600))), 2).padStart(10)}`)
  }
  out('')
  out('Fontes e sumidouros (normal, média em 7 dias): fontes tapete + rendimento | gastos impressora · luxos · rebrand · vídeos')
  for (const estilo of Object.keys(ESTILOS)) {
    const g = filtro(res, estilo, 'normal')
    const k = f => String(Math.round(media(g.map(f))))
    out(`  ${estilo.padEnd(12)} ${k(m => m.ganhoTapete)} + ${k(m => m.ganhoRende)} | ${k(m => m.gastoImpressao)} · ${k(m => m.gastoLuxo)} · ${k(m => m.gastoRebrand)} · ${k(m => m.gastoInflu)}  (rebrands ${fmt(media(g.map(m => m.rebrands)), 1)}, perdas ${fmt(media(g.map(m => m.perdas)), 1)}, caixa máx ${k(m => m.caixaMax)})`)
  }
  if (detalhe) {
    out('')
    out('Conta por raridade (sem sorteio): min até o pico · tapete com 1 min · no pico · no preço máximo · Calor do tapete (1 min/pico/máx) · rende/h no pico · rebrand')
    for (const x of tabelaRaridades()) {
      out(`  ${x.r.padEnd(9)} ${fmt(x.minPico, 0).padStart(4)} min ${String(x.cedo).padStart(6)} ${String(x.pico).padStart(7)} ${String(x.maximo).padStart(7)}  Calor ${fmt(x.calorCedo, 0)}/${fmt(x.calorPico, 0)}/${fmt(x.calorMax, 0)}  rende ${fmt(x.rendeHora, 0)}/h  rebrand ${x.rebrand}`)
    }
    out('')
    out('Vídeos contratados no pico (lucro já tirado o preço, puxando no pico / no preço máximo): tamanho × raridade')
    for (const x of tabelaVideos()) {
      out(`  ${x.tam.padEnd(6)} ${x.r.padEnd(9)} traz ${String(x.traz).padStart(4)} · v1 (P1 ${x.p1}) ${fmt(x.v1, 0).padStart(6)} / ${fmt(x.v1max, 0).padStart(6)} · v2 (preço ${x.p2}) ${fmt(x.v2, 0).padStart(6)} / ${fmt(x.v2max, 0).padStart(6)}`)
    }
  }
  return { aprovado, texto: linhas.join('\n') }
}

/**
 * Ensaio sem mexer no arquivo: troca números na memória (só nesta execução), ex.:
 *   --com '{"IMPRESSORA":{"custo":100},"CHANCES":{"comum":56,"mitico":0.1}}'
 * Listas (LUXOS, INFLUENCIADORES) trocam item a item pelo índice. Nomes de campo desconhecidos = erro.
 */
export function ensaiar(trocas) {
  const mesclar = (alvo, novo, caminho) => {
    for (const [k, v] of Object.entries(novo)) {
      if (!(k in alvo)) throw new Error(`campo desconhecido: ${caminho}.${k}`)
      if (v && typeof v === 'object') mesclar(alvo[k], v, `${caminho}.${k}`)
      else alvo[k] = v
    }
  }
  for (const [k, v] of Object.entries(trocas)) {
    if (!(k in C) || typeof C[k] !== 'object' || k === 'RARIDADES') throw new Error(`bloco desconhecido: ${k}`)
    mesclar(C[k], v, k)
  }
}

const principal = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (principal) {
  const args = process.argv.slice(2)
  const i = args.indexOf('--sementes')
  const n = i >= 0 ? Number(args[i + 1]) : 10
  const j = args.indexOf('--com')
  if (j >= 0) { ensaiar(JSON.parse(args[j + 1])); console.log('(ensaio: números trocados só nesta execução)') }
  const inicio = Date.now()
  const { aprovado, texto } = relatorio(rodarTudo(n), args.includes('--detalhe'))
  console.log(texto)
  console.log(`\n(${((Date.now() - inicio) / 1000).toFixed(1)} s)`)
  process.exitCode = aprovado ? 0 : 1
}
