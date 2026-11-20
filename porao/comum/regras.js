// Porão (jogo-sátira) — regras puras: contas e máquinas de estado.
// Sem banco e sem relógio próprio: o tempo ("agora", em ms) entra como argumento; o sorteio sai da
// semente guardada no próprio estado (estado.semente + estado.sorteios), então a mesma entrada dá sempre
// a mesma saída e recarregar não sorteia de novo. A semente NUNCA vai para a tela.
// Nenhuma função muda o estado recebido: cada ação devolve uma cópia nova.
// Ações devolvem { ok: true, estado, ... } ou { ok: false, erro: 'mensagem em português' }.
// Quem chama (servidor) faz avancar(estado, agora) ANTES de cada ação.
// Todos os números vêm de ./config.js.
import { criarRng } from '../../shared/rng.js'
import {
  RARIDADES, CHANCES, IDEIAS_POR_RARIDADE, IMPRESSORA, GAVETA, FUSAO, FASES, PROJETOS,
  RENDIMENTO_POR_TROUXA_HORA, TROUXAS, HYPE, TAPETE, CALOR, TEMPO, LUXOS, LIMITES, PRESTIGIO,
  CONTRATO, INFLUENCIADORES,
} from './config.js'

export const VERSAO_DO_ESTADO = 1
export const FASES_NO_AR = ['LANCAMENTO', 'HYPE', 'PICO', 'ESFRIANDO']
export const FASES_FINAIS = ['APLICADO', 'APREENDIDO']
export const CONTRATO_ATIVO = ['V1_NO_AR', 'PEDE_MAIS', 'V2_NO_AR']
export const RESPOSTAS_DE_CONTRATO = ['pagar', 'chorar', 'recusar']

const EPS = 1e-9
const ERRO_BATIDA = 'A polícia está na porta: resolva a batida primeiro.'

// ---------------------------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------------------------
const falha = erro => ({ ok: false, erro })
const idValido = x => Number.isSafeInteger(x) && x > 0
const copiar = e => structuredClone(e)
const noAr = p => FASES_NO_AR.includes(p.fase)
const indiceRaridade = r => RARIDADES.indexOf(r)

function acharProjeto(e, id) {
  if (!idValido(id)) return null
  return e.projetos.find(p => p.id === id) || null
}

/** Rng do próximo sorteio (semente do estado + contador). Soma 1 ao contador do estado recebido (cópia). */
function rngDoEstado(e) {
  const rng = criarRng(`${e.semente}:${e.sorteios}`)
  e.sorteios += 1
  return rng
}

/** Põe caixa (pode ser fração: a sobra fica guardada). Devolve o inteiro creditado. */
function creditar(e, valor) {
  if (!(valor > 0)) return 0
  const total = e.sobraCaixa + valor
  const inteiro = Math.floor(total + EPS)
  e.sobraCaixa = Math.max(0, total - inteiro)
  e.caixa += inteiro
  e.caixaTotal += inteiro
  return inteiro
}

// ---------------------------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------------------------
/**
 * Estado novo. semente: texto do servidor (nunca da tela). agora: ms.
 */
export function estadoInicial({ semente, agora }) {
  if (typeof semente !== 'string' || semente.length === 0) throw new TypeError('semente precisa ser texto')
  if (!Number.isFinite(agora)) throw new TypeError('agora precisa ser número (ms)')
  return {
    versao: VERSAO_DO_ESTADO,
    semente,
    sorteios: 0,
    ultimoTempo: agora,
    caixa: 0, // inteiro
    sobraCaixa: 0, // fração ainda não creditada [0, 1)
    caixaTotal: 0, // ganho nesta vida (meta do prestígio)
    calor: 0, // 0–100
    batida: null, // { projetoId, custoRebrand } enquanto pendente
    proximoId: 1,
    cartas: [], // gaveta: { id, ideia, raridade }
    projetos: [], // { id, ideia, raridade, fase, hype, trouxas, tempoNoAr, lancamentoRestante, rebrands, ganhoNoAr, contrato }
    luxos: [], // ids de LUXOS
    prestigio: { nivel: 0 },
    pseudonimo: 0,
    album: {}, // ideia → true
    carteirinha: {}, // influenciador → carimbos
    contagem: { impressoes: 0, fusoes: 0, lancamentos: 0, tapetes: 0, batidas: 0, rebrands: 0, prisoes: 0 },
  }
}

// ---------------------------------------------------------------------------------------------
// Bônus (luxos + prestígio)
// ---------------------------------------------------------------------------------------------
/** { rendimento: +fração, hype: −fração do gasto, calor: −fração da subida } */
export function bonus(estado) {
  const b = { rendimento: 0, hype: 0, calor: 0 }
  for (const id of estado.luxos) {
    const l = LUXOS.find(x => x.id === id)
    if (!l) continue
    for (const k of Object.keys(b)) b[k] += l.bonus[k] || 0
  }
  b.rendimento += estado.prestigio.nivel * PRESTIGIO.bonusPorNivel
  b.hype = Math.min(b.hype, LIMITES.reducaoMaxima)
  b.calor = Math.min(b.calor, LIMITES.reducaoMaxima)
  return b
}

/** Caixa por hora do projeto agora (0 fora do ar ou no lançamento). */
export function rendimentoPorHora(estado, projetoId) {
  const p = acharProjeto(estado, projetoId)
  if (!p || !noAr(p) || p.fase === 'LANCAMENTO') return 0
  const fator = p.fase === 'ESFRIANDO' ? FASES.esfriandoRende : 1
  return RENDIMENTO_POR_TROUXA_HORA[p.raridade] * p.trouxas * (1 + bonus(estado).rendimento) * fator
}

// ---------------------------------------------------------------------------------------------
// Calor e batida
// ---------------------------------------------------------------------------------------------
function dispararBatida(e, eventos) {
  const alvos = e.projetos.filter(noAr)
  if (alvos.length === 0) { // nada a perder: Calor só zera
    e.calor = 0
    eventos.push({ tipo: 'calor_zerou' })
    return
  }
  alvos.sort((a, b) => indiceRaridade(b.raridade) - indiceRaridade(a.raridade) || b.trouxas - a.trouxas || a.id - b.id)
  const alvo = alvos[0]
  e.calor = CALOR.maximo
  e.batida = { projetoId: alvo.id, custoRebrand: CALOR.rebrandCusto[alvo.raridade] }
  e.contagem.batidas += 1
  eventos.push({ tipo: 'batida', projetoId: alvo.id })
}

/** Soma Calor (só em ação ou tempo com o jogador conectado). Em 100: batida. */
function somarCalor(e, delta, eventos) {
  if (e.batida) return
  e.calor = Math.min(CALOR.maximo, Math.max(0, e.calor + delta))
  if (e.calor >= CALOR.maximo - EPS) dispararBatida(e, eventos)
}

/** O que a batida pendente mostra: projeto ameaçado, custo do rebrand e se dá para pagar. */
export function previaBatida(estado) {
  if (!estado.batida) return null
  const { projetoId, custoRebrand } = estado.batida
  return {
    projetoId,
    custoRebrand,
    podeRebrand: estado.caixa >= custoRebrand,
    calorDepoisDoRebrand: CALOR.depoisDoRebrand,
    calorDepoisDePerder: CALOR.depoisDePerder,
  }
}

/** escolha: 'rebrand' (paga, Calor cai, projeto renomeado) ou 'perder' (projeto → APREENDIDO). */
export function resolverBatida(estado, escolha) {
  if (!estado.batida) return falha('Não há batida agora.')
  if (escolha !== 'rebrand' && escolha !== 'perder') return falha('Escolha "rebrand" ou "perder".')
  const e = copiar(estado)
  const p = e.projetos.find(x => x.id === e.batida.projetoId)
  if (escolha === 'rebrand') {
    if (e.caixa < e.batida.custoRebrand) return falha(`Falta caixa para o rebrand (custa ${e.batida.custoRebrand}).`)
    e.caixa -= e.batida.custoRebrand
    if (p) p.rebrands += 1
    e.contagem.rebrands += 1
    e.calor = CALOR.depoisDoRebrand
  } else {
    if (p) {
      p.fase = 'APREENDIDO'
      if (p.contrato && CONTRATO_ATIVO.includes(p.contrato.fase)) {
        p.contrato.fase = 'ENCERRADO'
        p.contrato.motivo = 'apreendido'
      }
    }
    e.calor = CALOR.depoisDePerder
  }
  const custo = escolha === 'rebrand' ? estado.batida.custoRebrand : 0
  e.batida = null
  return { ok: true, estado: e, escolha, custo, projetoId: p ? p.id : null }
}

// ---------------------------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------------------------
/** Avança um projeto dt segundos (máquina de fases). Devolve o caixa (fração) que rendeu. */
function avancarProjeto(p, dt, b, eventos) {
  let ganho = 0
  const porTrouxaSeg = RENDIMENTO_POR_TROUXA_HORA[p.raridade] * (1 + b.rendimento) / 3600
  const gasto = HYPE.gastoPorMin * (1 - b.hype) / 60
  const recarga = HYPE.recargaPorMin / 60
  const cresce = TROUXAS.crescimentoPorMin[p.raridade] / 60
  const maximo = TROUXAS.maximo[p.raridade]
  let resta = dt
  let guarda = 0
  p.tempoNoAr += dt
  if (p.contrato && p.contrato.fase === 'V1_NO_AR' && p.contrato.proposta === null) {
    p.contrato.esperaRestante = Math.max(0, p.contrato.esperaRestante - dt)
    if (p.contrato.esperaRestante <= EPS) {
      const c = p.contrato
      const t = CONTRATO.tamanhos[c.tamanho]
      if (c.trazidasV1 > t.limiteTrouxas) {
        c.fase = 'PEDE_MAIS'
        c.proposta = Math.round(c.p1 * CONTRATO.multiplicadorP2)
      } else c.proposta = c.p1
      eventos.push({ tipo: 'pedido', projetoId: p.id, fase: c.fase, proposta: c.proposta })
    }
  }
  while (guarda++ < 1000) {
    const antes = p.fase
    if (p.fase === 'LANCAMENTO') {
      const passo = Math.min(resta, p.lancamentoRestante)
      p.lancamentoRestante -= passo; resta -= passo
      if (p.lancamentoRestante <= EPS) { p.lancamentoRestante = 0; p.fase = p.trouxas >= maximo ? 'PICO' : 'HYPE' }
    } else if (p.fase === 'HYPE' || p.fase === 'PICO') {
      const ateZerar = gasto > 0 ? p.hype / gasto : Infinity
      const ateMax = p.fase === 'HYPE' ? Math.max(0, (maximo - p.trouxas) / cresce) : Infinity
      const passo = Math.min(resta, ateZerar, ateMax)
      const crescendo = p.fase === 'HYPE' ? cresce : 0
      ganho += porTrouxaSeg * (p.trouxas * passo + crescendo * passo * passo / 2)
      p.trouxas += crescendo * passo
      p.hype = Math.max(0, p.hype - gasto * passo)
      resta -= passo
      if (p.fase === 'HYPE' && p.trouxas >= maximo - EPS) { p.trouxas = Math.max(p.trouxas, maximo); p.fase = 'PICO' }
      if (p.hype <= EPS) { p.hype = 0; p.fase = 'ESFRIANDO' }
    } else if (p.fase === 'ESFRIANDO') {
      const passo = Math.min(resta, Math.max(0, (HYPE.maximo - p.hype) / recarga))
      ganho += porTrouxaSeg * p.trouxas * passo * FASES.esfriandoRende
      p.hype = Math.min(HYPE.maximo, p.hype + recarga * passo)
      resta -= passo
      if (p.hype >= HYPE.maximo - EPS) { p.hype = HYPE.maximo; p.fase = p.trouxas >= maximo ? 'PICO' : 'HYPE' }
    } else break
    if (p.fase !== antes) eventos.push({ tipo: 'fase', projetoId: p.id, fase: p.fase })
    if (resta <= EPS && p.fase === antes) break
    if (resta <= EPS) resta = 0
  }
  p.ganhoNoAr += ganho
  return ganho
}

/**
 * Adianta o relógio até `agora` (ms). Intervalo até TEMPO.limiteOnlineSeg = conectado; acima = fora do jogo.
 * Conectado: rende, gasta hype, Calor sobe (projetos no ar) e desce, pode dar batida.
 * Fora: conta no máximo TEMPO.tetoForaHoras; rende e gasta hype; Calor parado; nunca batida; nunca tapete.
 * opcoes.online (true/false) força o modo. Devolve { estado, segundos, online, rendeu (inteiro creditado), eventos }.
 */
export function avancar(estado, agora, opcoes = {}) {
  if (!Number.isFinite(agora)) throw new TypeError('agora precisa ser número (ms)')
  const e = copiar(estado)
  const eventos = []
  const bruto = Math.max(0, (agora - e.ultimoTempo) / 1000)
  e.ultimoTempo = Math.max(e.ultimoTempo, agora)
  const online = typeof opcoes.online === 'boolean' ? opcoes.online : bruto <= TEMPO.limiteOnlineSeg
  const segundos = online ? bruto : Math.min(bruto, TEMPO.tetoForaHoras * 3600)
  if (segundos <= 0) return { estado: e, segundos: 0, online, rendeu: 0, eventos }
  const b = bonus(e)
  // Calor: taxa fixa no intervalo (o conjunto de projetos no ar não muda dentro do avanço)
  let deltaCalor = 0
  if (online) {
    const sobe = e.projetos.filter(noAr).reduce((s, p) => s + CALOR.projetoNoArPorMin[p.raridade], 0)
    deltaCalor = (sobe * (1 - b.calor) - CALOR.quedaPorMin) / 60 * segundos
  }
  let ganho = 0
  for (const p of e.projetos) if (noAr(p)) ganho += avancarProjeto(p, segundos, b, eventos)
  const rendeu = creditar(e, ganho)
  if (online) somarCalor(e, deltaCalor, eventos)
  return { estado: e, segundos, online, rendeu, eventos }
}

// ---------------------------------------------------------------------------------------------
// Impressora e fusão
// ---------------------------------------------------------------------------------------------
/** Chances visíveis: [{ raridade, chance (%) }] na ordem das raridades. */
export function chancesDaImpressora() {
  return RARIDADES.map(raridade => ({ raridade, chance: CHANCES[raridade] }))
}

/** Lista das ideias de uma raridade (chaves para nomes.js). */
export function ideiasDa(raridade) {
  const n = IDEIAS_POR_RARIDADE[raridade] || 0
  return Array.from({ length: n }, (_, i) => `${raridade}_${i + 1}`)
}

/** Sorteia a raridade com rng.proximo() ∈ [0, 1). */
export function sortearRaridade(rng) {
  const total = RARIDADES.reduce((s, r) => s + CHANCES[r], 0)
  const x = rng.proximo() * total
  let acc = 0
  for (const r of RARIDADES) {
    acc += CHANCES[r]
    if (x < acc) return r
  }
  return RARIDADES[0]
}

/** Sorteia a ideia dentro da raridade com rng.inteiro(n). */
export function sortearIdeia(rng, raridade) {
  const lista = ideiasDa(raridade)
  return lista[rng.inteiro(lista.length)]
}

/** Quanto custa a próxima impressão (0 = grátis). */
export function custoImpressao(estado) {
  if (IMPRESSORA.primeiraGratis && estado.contagem.impressoes === 0 && estado.prestigio.nivel === 0) return 0
  const travado = estado.cartas.length === 0 && !estado.projetos.some(noAr) && estado.caixa < IMPRESSORA.custo
  if (IMPRESSORA.gratisSeTravado && travado) return 0
  return IMPRESSORA.custo
}

/** Imprime uma ideia: sorteia a raridade, depois a ideia. Devolve { ok, estado, carta, custo }. */
export function imprimir(estado) {
  if (estado.batida) return falha(ERRO_BATIDA)
  if (estado.cartas.length >= GAVETA.maximoDeCartas) return falha('A gaveta está cheia: lance ou funda alguma ideia antes.')
  const custo = custoImpressao(estado)
  if (estado.caixa < custo) return falha(`Falta caixa para imprimir (custa ${custo}).`)
  const e = copiar(estado)
  e.caixa -= custo
  const rng = rngDoEstado(e)
  const raridade = sortearRaridade(rng)
  const ideia = sortearIdeia(rng, raridade)
  const carta = { id: e.proximoId++, ideia, raridade }
  e.cartas.push(carta)
  e.album[ideia] = true
  e.contagem.impressoes += 1
  return { ok: true, estado: e, carta, custo }
}

/** "Copiar e colar": FUSAO.quantidade cartas da mesma ideia → 1 da raridade seguinte (sem sorteio). */
export function fundir(estado, ideia) {
  if (estado.batida) return falha(ERRO_BATIDA)
  if (typeof ideia !== 'string') return falha('Ideia inválida.')
  const iguais = estado.cartas.filter(c => c.ideia === ideia)
  if (iguais.length === 0) return falha('Essa ideia não está na gaveta.')
  const raridade = iguais[0].raridade
  const i = indiceRaridade(raridade)
  if (i === RARIDADES.length - 1) return falha('Mítico já é o maior golpe: não dá para fundir.')
  if (iguais.length < FUSAO.quantidade) return falha(`Precisa de ${FUSAO.quantidade} cartas iguais para fundir.`)
  const e = copiar(estado)
  const usar = new Set(iguais.slice(0, FUSAO.quantidade).map(c => c.id))
  e.cartas = e.cartas.filter(c => !usar.has(c.id))
  const seguinte = RARIDADES[i + 1]
  const posicao = Number(ideia.slice(ideia.lastIndexOf('_') + 1)) - 1
  const lista = ideiasDa(seguinte)
  const carta = { id: e.proximoId++, ideia: lista[(posicao >= 0 ? posicao : 0) % lista.length], raridade: seguinte }
  e.cartas.push(carta)
  e.album[carta.ideia] = true
  e.contagem.fusoes += 1
  return { ok: true, estado: e, carta, usadas: [...usar] }
}

// ---------------------------------------------------------------------------------------------
// Projeto e tapete
// ---------------------------------------------------------------------------------------------
/** Tira a carta da gaveta e põe o projeto no ar (fase LANCAMENTO). */
export function lancar(estado, cartaId) {
  if (estado.batida) return falha(ERRO_BATIDA)
  if (!idValido(cartaId)) return falha('Carta inválida.')
  const carta = estado.cartas.find(c => c.id === cartaId)
  if (!carta) return falha('Essa carta não está na sua gaveta.')
  if (estado.projetos.filter(noAr).length >= PROJETOS.maximoNoAr) {
    return falha(`Já tem ${PROJETOS.maximoNoAr} projetos no ar: puxe o tapete de algum antes.`)
  }
  const e = copiar(estado)
  e.cartas = e.cartas.filter(c => c.id !== cartaId)
  const projeto = {
    id: e.proximoId++,
    ideia: carta.ideia,
    raridade: carta.raridade,
    fase: 'LANCAMENTO',
    hype: HYPE.maximo,
    trouxas: TROUXAS.iniciais[carta.raridade],
    tempoNoAr: 0,
    lancamentoRestante: FASES.lancamentoSeg,
    rebrands: 0,
    ganhoNoAr: 0,
    contrato: null,
  }
  e.projetos.push(projeto)
  e.contagem.lancamentos += 1
  return { ok: true, estado: e, projeto: copiar(projeto) }
}

function contaDoTapete(estado, p) {
  const min = p.tempoNoAr / 60
  const b = bonus(estado)
  const extraPreco = Math.min(min * TAPETE.precoSobePorMin, TAPETE.precoExtraMaximo)
  const ganho = Math.floor(TAPETE.precoPorTrouxa[p.raridade] * p.trouxas * (1 + extraPreco) + EPS)
  const extraCalor = Math.min(min * TAPETE.calorSobePorMin, TAPETE.calorExtraMaximo)
  const video3 = !!(p.contrato && CONTRATO_ATIVO.includes(p.contrato.fase))
  const calor = (TAPETE.calorBase[p.raridade] * (1 + extraCalor) + (video3 ? CONTRATO.calorVideo3 : 0)) * (1 - b.calor)
  return { ganho, calor, video3 }
}

function podePuxar(estado, projetoId) {
  if (estado.batida) return ERRO_BATIDA
  const p = acharProjeto(estado, projetoId)
  if (!p) return 'Projeto não encontrado.'
  if (!noAr(p)) return 'Esse projeto não está no ar.'
  if (p.fase === 'LANCAMENTO') return 'Espere o lançamento terminar.'
  return null
}

/**
 * Prévia (antes de decidir): { ok, ganho, calor (quanto soma), calorDepois, batida (vai dar batida?), video3,
 * projetoAmeacado (se batida) }.
 */
export function previaTapete(estado, projetoId) {
  const erro = podePuxar(estado, projetoId)
  if (erro) return falha(erro)
  const r = puxarTapete(estado, projetoId)
  const batida = !!r.estado.batida
  return {
    ok: true,
    ganho: r.ganho,
    calor: r.calor,
    calorDepois: r.estado.calor,
    batida,
    projetoAmeacado: batida ? r.estado.batida.projetoId : null,
    video3: r.video3,
  }
}

/** Puxa o tapete (só o jogador, conectado): paga, soma Calor, projeto → APLICADO; vídeo 3 + carimbo. */
export function puxarTapete(estado, projetoId) {
  const erro = podePuxar(estado, projetoId)
  if (erro) return falha(erro)
  const e = copiar(estado)
  const p = e.projetos.find(x => x.id === projetoId)
  const { ganho, calor, video3 } = contaDoTapete(e, p)
  const eventos = []
  e.caixa += ganho
  e.caixaTotal += ganho
  p.fase = 'APLICADO'
  p.ganhoTapete = ganho
  e.contagem.tapetes += 1
  if (video3) {
    p.contrato.fase = 'V3_NO_AR'
    p.contrato.videos = 3
    const id = p.contrato.influenciador
    e.carteirinha[id] = (e.carteirinha[id] || 0) + 1
    eventos.push({ tipo: 'video3', projetoId: p.id, influenciador: id, carimbos: e.carteirinha[id] })
  }
  somarCalor(e, calor, eventos)
  return { ok: true, estado: e, ganho, calor, video3, batida: !!e.batida, eventos }
}

// ---------------------------------------------------------------------------------------------
// Luxos e prestígio
// ---------------------------------------------------------------------------------------------
export function comprarLuxo(estado, luxoId) {
  if (estado.batida) return falha(ERRO_BATIDA)
  const l = LUXOS.find(x => x.id === luxoId)
  if (!l) return falha('Esse luxo não existe.')
  if (estado.luxos.includes(l.id)) return falha('Você já tem esse luxo.')
  if (estado.caixa < l.custo) return falha(`Falta caixa para esse luxo (custa ${l.custo}).`)
  const e = copiar(estado)
  e.caixa -= l.custo
  e.luxos.push(l.id)
  return { ok: true, estado: e, luxo: l.id, custo: l.custo }
}

/** Meta de caixa ganho nesta vida para liberar o prestígio. */
export function metaPrestigio(estado) {
  return Math.round(PRESTIGIO.meta * (1 + estado.prestigio.nivel * PRESTIGIO.metaSobePorNivel))
}

export function prestigioLiberado(estado) {
  return estado.caixaTotal >= metaPrestigio(estado)
}

/** "Ir preso": zera caixa, cartas, projetos, luxos e Calor; guarda álbum, carteirinha e contagem; nível +1. */
export function irPreso(estado) {
  if (estado.batida) return falha(ERRO_BATIDA)
  if (!prestigioLiberado(estado)) return falha(`Ainda não: junte ${metaPrestigio(estado)} de caixa nesta vida.`)
  const e = copiar(estado)
  Object.assign(e, { caixa: 0, sobraCaixa: 0, caixaTotal: 0, calor: 0, batida: null, cartas: [], projetos: [], luxos: [] })
  e.prestigio.nivel += 1
  e.pseudonimo += 1
  e.contagem.prisoes += 1
  return { ok: true, estado: e, nivel: e.prestigio.nivel }
}

// ---------------------------------------------------------------------------------------------
// Contrato de influenciador
// ---------------------------------------------------------------------------------------------
export function influenciadoresLiberados(estado) {
  return INFLUENCIADORES.filter(i => estado.contagem.tapetes >= i.liberaComTapetes).map(i => i.id)
}

export function ehReincidente(estado, influenciadorId) {
  return (estado.carteirinha[influenciadorId] || 0) >= CONTRATO.carimbosReincidente
}

/** Um vídeo vai ao ar: traz trouxas e hype ao projeto e soma Calor. Devolve trouxas trazidas. */
function videoNoAr(e, p, eventos) {
  const t = CONTRATO.tamanhos[p.contrato.tamanho]
  const trazidas = Math.round(t.trouxasVideo * CONTRATO.trouxasPorRaridade[p.raridade])
  p.trouxas += trazidas
  p.hype = Math.min(HYPE.maximo, p.hype + t.hypeVideo)
  somarCalor(e, t.calorVideo * (1 - bonus(e).calor), eventos)
  return trazidas
}

/** Vídeo 1: paga P1, 1 vaga por projeto. Contrato: LIVRE → V1_NO_AR. */
export function contratar(estado, projetoId, influenciadorId) {
  if (estado.batida) return falha(ERRO_BATIDA)
  const p0 = acharProjeto(estado, projetoId)
  if (!p0) return falha('Projeto não encontrado.')
  if (!noAr(p0)) return falha('Esse projeto não está no ar.')
  if (p0.contrato) return falha('Esse projeto já tem parceiro: é 1 vaga por projeto.')
  const inf = INFLUENCIADORES.find(i => i.id === influenciadorId)
  if (!inf) return falha('Influenciador não encontrado.')
  if (!influenciadoresLiberados(estado).includes(inf.id)) return falha('Esse influenciador ainda não te conhece.')
  const t = CONTRATO.tamanhos[inf.tamanho]
  if (estado.caixa < t.p1) return falha(`Falta caixa para o vídeo (custa ${t.p1}).`)
  const e = copiar(estado)
  const p = e.projetos.find(x => x.id === projetoId)
  const eventos = []
  e.caixa -= t.p1
  p.contrato = {
    influenciador: inf.id,
    tamanho: inf.tamanho,
    fase: 'V1_NO_AR',
    p1: t.p1,
    trazidasV1: 0,
    esperaRestante: CONTRATO.esperaPedidoSeg,
    proposta: null, // preço do vídeo 2 (aparece depois da espera)
    chorou: false,
    videos: 1,
    motivo: null,
  }
  p.contrato.trazidasV1 = videoNoAr(e, p, eventos)
  return { ok: true, estado: e, custo: t.p1, trazidas: p.contrato.trazidasV1, eventos }
}

/** resposta: 'pagar' (vídeo 2 pela proposta) · 'chorar' (só em PEDE_MAIS, 1 vez; sorteio) · 'recusar'. */
export function responderContrato(estado, projetoId, resposta) {
  if (estado.batida) return falha(ERRO_BATIDA)
  if (!RESPOSTAS_DE_CONTRATO.includes(resposta)) return falha('Resposta inválida: pagar, chorar ou recusar.')
  const p0 = acharProjeto(estado, projetoId)
  if (!p0 || !p0.contrato) return falha('Esse projeto não tem contrato.')
  const c0 = p0.contrato
  const aberto = (c0.fase === 'V1_NO_AR' && c0.proposta !== null) || c0.fase === 'PEDE_MAIS'
  if (!aberto) return falha('Não há proposta para responder agora.')
  const e = copiar(estado)
  const p = e.projetos.find(x => x.id === projetoId)
  const c = p.contrato
  const eventos = []
  if (resposta === 'pagar') {
    if (!noAr(p)) return falha('Esse projeto não está no ar.')
    if (e.caixa < c.proposta) return falha(`Falta caixa para o vídeo 2 (custa ${c.proposta}).`)
    e.caixa -= c.proposta
    const custo = c.proposta
    c.fase = 'V2_NO_AR'
    c.videos = 2
    const trazidas = videoNoAr(e, p, eventos)
    return { ok: true, estado: e, custo, trazidas, eventos }
  }
  if (resposta === 'chorar') {
    if (c.fase !== 'PEDE_MAIS') return falha('Ele não pediu mais: não tem do que chorar.')
    if (c.chorou) return falha('Você já chorou o preço: agora é pagar ou recusar.')
    const rng = rngDoEstado(e)
    if (rng.proximo() < CONTRATO.chorar.chanceDesconto) {
      c.proposta = Math.round(c.proposta * (1 - CONTRATO.chorar.desconto))
      c.chorou = true
      return { ok: true, estado: e, desfecho: 'desconto', proposta: c.proposta }
    }
    c.fase = 'ENCERRADO'
    c.motivo = 'sumiu'
    return { ok: true, estado: e, desfecho: 'sumiu' }
  }
  c.fase = 'ENCERRADO'
  c.motivo = 'recusou'
  return { ok: true, estado: e, desfecho: 'recusou' }
}
