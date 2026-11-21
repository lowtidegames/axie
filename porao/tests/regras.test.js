// Porão — tarefa 1: regras puras (porao/comum/regras.js) e números (porao/comum/config.js).
// Rodar: node --test porao/tests/regras.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import * as R from '../comum/regras.js'
import { CHANCES, RARIDADES, TEMPO, CONTRATO, PRESTIGIO, LUXOS, IMPRESSORA, CALOR, FASES, TROUXAS, GAVETA, LOTE, MISSOES } from '../comum/config.js'

const T0 = 1_700_000_000_000

function novo(semente = 'teste') { return R.estadoInicial({ semente, agora: T0 }) }

/** Põe uma carta na gaveta direto no estado (o sorteio é testado à parte). */
function comCarta(estado, raridade, n = 1) {
  const e = structuredClone(estado)
  e.cartas.push({ id: e.proximoId++, ideia: `${raridade}_${n}`, raridade })
  return e
}

/** Lança um projeto da raridade pedida. Devolve { estado, id }. */
function noAr(estado, raridade) {
  const e = comCarta(estado, raridade)
  const r = R.lancar(e, e.cartas.at(-1).id)
  assert.equal(r.ok, true, r.erro)
  return { estado: r.estado, id: r.projeto.id }
}

/** Avança `segundos` conectado, em passos curtos (pedidos da tela). */
function online(estado, segundos, passo = 20) {
  let e = estado
  let feito = 0
  while (feito < segundos) {
    const d = Math.min(passo, segundos - feito)
    feito += d
    e = R.avancar(e, e.ultimoTempo + d * 1000).estado
  }
  return e
}

const proj = (e, id) => e.projetos.find(p => p.id === id)

describe('config', () => {
  test('chances da impressora somam 100', () => {
    const soma = RARIDADES.reduce((s, r) => s + CHANCES[r], 0)
    assert.ok(Math.abs(soma - 100) < 1e-9, `soma ${soma}`)
    assert.deepEqual(R.chancesDaImpressora().map(c => c.raridade), RARIDADES)
  })
})

describe('impressora e sorteio', () => {
  test('mesma semente = mesmo sorteio; a 1ª é grátis e entra no álbum', () => {
    const a = R.imprimir(novo('s1'))
    const b = R.imprimir(novo('s1'))
    assert.equal(a.ok, true)
    assert.equal(a.custo, 0)
    assert.deepEqual(a.carta, b.carta)
    assert.deepEqual(a.estado, b.estado)
    assert.equal(a.estado.album[a.carta.ideia], true)
    assert.equal(a.estado.sorteios, 1)
    // sementes diferentes não dão sempre o mesmo resultado
    const vistos = new Set()
    for (let i = 0; i < 40; i++) vistos.add(R.imprimir(novo('x' + i)).carta.ideia)
    assert.ok(vistos.size > 3)
  })

  test('a 2ª custa caixa; sem caixa recusa com mensagem; travado sai grátis', () => {
    let e = R.imprimir(novo()).estado // gaveta com 1 carta, caixa 0
    const sem = R.imprimir(e)
    assert.equal(sem.ok, false)
    assert.match(sem.erro, /caixa/i)
    e.caixa = IMPRESSORA.custo
    const com = R.imprimir(e)
    assert.equal(com.ok, true)
    assert.equal(com.custo, IMPRESSORA.custo)
    assert.equal(com.estado.caixa, 0)
    // travado: sem carta, sem projeto no ar, sem caixa
    const t = novo()
    t.contagem.impressoes = 5
    assert.equal(R.custoImpressao(t), 0)
  })

  test('distribuição segue as chances (aproximado) e a ideia é da raridade sorteada', () => {
    const rng = { n: 0, proximo() { return (this.n++ % 1000) / 1000 }, inteiro(k) { return this.n++ % k } }
    const cont = Object.fromEntries(RARIDADES.map(r => [r, 0]))
    for (let i = 0; i < 1000; i++) cont[R.sortearRaridade(rng)]++
    assert.ok(cont.comum > 400 && cont.mitico < 20)
    const ideia = R.sortearIdeia({ inteiro: () => 0 }, 'raro')
    assert.equal(ideia, 'raro_1')
  })
})

describe('fusão', () => {
  test('3 iguais → 1 da raridade seguinte, sem sorteio', () => {
    let e = novo()
    e = comCarta(e, 'comum', 2); e = comCarta(e, 'comum', 2); e = comCarta(e, 'comum', 2); e = comCarta(e, 'comum', 3)
    const r = R.fundir(e, 'comum_2')
    assert.equal(r.ok, true)
    assert.equal(r.carta.raridade, 'incomum')
    assert.equal(r.estado.cartas.length, 2)
    assert.equal(r.estado.sorteios, e.sorteios)
    assert.equal(r.estado.album[r.carta.ideia], true)
  })
  test('só 2 iguais recusa; Mítico não funde', () => {
    let e = comCarta(comCarta(novo(), 'raro'), 'raro')
    assert.equal(R.fundir(e, 'raro_1').ok, false)
    let m = comCarta(comCarta(comCarta(novo(), 'mitico'), 'mitico'), 'mitico')
    const r = R.fundir(m, 'mitico_1')
    assert.equal(r.ok, false)
    assert.match(r.erro, /Mítico/)
  })
})

describe('projeto e tapete', () => {
  test('1º tapete possível em menos de 60 s com a 1ª ideia grátis', () => {
    let e = novo('ritmo')
    const imp = R.imprimir(e)
    e = imp.estado
    const l = R.lancar(e, imp.carta.id)
    e = online(l.estado, 20)
    const t = R.puxarTapete(e, l.projeto.id)
    assert.equal(t.ok, true, t.erro)
    assert.ok(t.ganho > 0)
    assert.equal(proj(t.estado, l.projeto.id).fase, 'APLICADO')
    assert.equal(t.estado.contagem.tapetes, 1)
  })

  test('tapete cedo paga menos que tarde e soma menos Calor; prévia = resultado', () => {
    const { estado, id } = noAr(novo(), 'raro')
    const cedo = online(estado, 30)
    const tarde = online(estado, 600)
    const pc = R.previaTapete(cedo, id)
    const pt = R.previaTapete(tarde, id)
    assert.ok(pc.ganho < pt.ganho, `${pc.ganho} < ${pt.ganho}`)
    assert.ok(pc.calor < pt.calor, `${pc.calor} < ${pt.calor}`)
    const real = R.puxarTapete(tarde, id)
    assert.equal(real.ganho, pt.ganho)
    assert.equal(real.estado.caixa, tarde.caixa + pt.ganho)
    assert.ok(Math.abs(real.estado.calor - pt.calorDepois) < 1e-9)
  })

  test('lançamento → HYPE → ESFRIANDO (hype zera) → volta; não puxa tapete na gaveta nem 2 vezes', () => {
    const { estado, id } = noAr(novo(), 'comum')
    assert.equal(proj(estado, id).fase, 'LANCAMENTO')
    assert.equal(R.puxarTapete(estado, id).ok, false)
    let e = online(estado, FASES.lancamentoSeg + 1)
    assert.ok(['HYPE', 'PICO'].includes(proj(e, id).fase))
    e = online(e, 21 * 60, 60)
    assert.equal(proj(e, id).fase, 'ESFRIANDO')
    e = online(e, 11 * 60, 60)
    assert.ok(['HYPE', 'PICO'].includes(proj(e, id).fase))
    const t = R.puxarTapete(e, id)
    assert.equal(t.ok, true)
    assert.equal(R.puxarTapete(t.estado, id).ok, false)
  })

  test('limite de projetos no ar', () => {
    let e = novo()
    for (let i = 0; i < 3; i++) e = noAr(e, 'comum').estado
    e = comCarta(e, 'comum')
    const r = R.lancar(e, e.cartas.at(-1).id)
    assert.equal(r.ok, false)
  })

  test('não muda o estado recebido e recusa id inválido', () => {
    const { estado, id } = noAr(novo(), 'comum')
    const e = online(estado, 30)
    const copia = structuredClone(e)
    R.puxarTapete(e, id); R.avancar(e, e.ultimoTempo + 5000); R.imprimir(e)
    assert.deepEqual(e, copia)
    for (const ruim of ['1', 1.5, -1, null, undefined, 999]) {
      const r = R.puxarTapete(e, ruim)
      assert.equal(r.ok, false)
      assert.equal(typeof r.erro, 'string')
    }
    assert.equal(R.lancar(e, '1').ok, false)
  })
})

describe('tempo online × fora do jogo', () => {
  test('Calor parado fora do jogo (mas rende e gasta hype)', () => {
    let { estado, id } = noAr(novo(), 'epico')
    estado = online(estado, 120)
    estado.calor = 30
    const antes = structuredClone(estado)
    const r = R.avancar(estado, estado.ultimoTempo + 2 * 3600 * 1000)
    assert.equal(r.online, false)
    assert.equal(r.estado.calor, antes.calor)
    assert.ok(r.estado.caixa > antes.caixa)
    assert.ok(r.rendeu > 0)
    assert.notEqual(proj(r.estado, id).hype, proj(antes, id).hype)
  })

  test('online o Calor sobe com projeto no ar e desce sem projeto', () => {
    let { estado } = noAr(novo(), 'mitico')
    const e = online(estado, 600)
    assert.ok(e.calor > 0)
    const vazio = novo(); vazio.calor = 50
    const v = online(vazio, 600)
    assert.ok(v.calor < 50)
  })

  test('teto do tempo fora do jogo', () => {
    let { estado } = noAr(novo(), 'raro')
    estado = online(estado, 30)
    const teto = TEMPO.tetoForaHoras * 3600
    const a = R.avancar(estado, estado.ultimoTempo + teto * 1000)
    const b = R.avancar(estado, estado.ultimoTempo + 100 * 3600 * 1000)
    assert.equal(b.segundos, teto)
    assert.equal(b.estado.caixa, a.estado.caixa)
    assert.equal(b.estado.ultimoTempo, estado.ultimoTempo + 100 * 3600 * 1000)
  })

  test('fora do jogo nunca dá batida nem puxa tapete sozinho', () => {
    let { estado, id } = noAr(novo(), 'mitico')
    estado.calor = 99.9
    const r = R.avancar(estado, estado.ultimoTempo + 5 * 3600 * 1000)
    assert.equal(r.estado.batida, null)
    assert.equal(r.estado.calor, 99.9)
    assert.notEqual(proj(r.estado, id).fase, 'APLICADO')
  })

  test('relógio voltando para trás não conta tempo', () => {
    const { estado } = noAr(novo(), 'comum')
    const r = R.avancar(estado, estado.ultimoTempo - 10_000)
    assert.equal(r.segundos, 0)
    assert.equal(r.estado.caixa, estado.caixa)
  })
})

describe('Calor, batida e rebrand', () => {
  function quaseBatida() {
    let { estado, id } = noAr(novo(), 'mitico')
    const outro = noAr(estado, 'epico') // mítico + épico no ar: Calor sobe mais que desce
    estado = online(outro.estado, 30)
    estado.calor = 99.5
    return { estado, id, outro: outro.id }
  }

  test('Calor em 100 online = batida, mostrando custo e projeto; tudo trava até resolver', () => {
    const { estado, id } = quaseBatida()
    const e = online(estado, 120)
    assert.ok(e.batida)
    assert.equal(e.calor, CALOR.maximo)
    assert.equal(e.batida.projetoId, id) // o de maior raridade
    const p = R.previaBatida(e)
    assert.equal(p.custoRebrand, CALOR.rebrandCusto.mitico)
    assert.equal(R.puxarTapete(e, id).ok, false)
  })

  test('REBRAND paga, Calor cai e o projeto continua com nome novo', () => {
    const { estado, id } = quaseBatida()
    const e = online(estado, 120)
    e.caixa = 5000
    const r = R.resolverBatida(e, 'rebrand')
    assert.equal(r.ok, true)
    assert.equal(r.estado.caixa, 5000 - CALOR.rebrandCusto.mitico)
    assert.equal(r.estado.calor, CALOR.depoisDoRebrand)
    assert.equal(r.estado.batida, null)
    assert.equal(proj(r.estado, id).rebrands, 1)
    assert.notEqual(proj(r.estado, id).fase, 'APREENDIDO')
  })

  test('sem caixa não faz rebrand; PERDER leva o projeto mostrado', () => {
    const { estado, id } = quaseBatida()
    const e = online(estado, 120)
    e.caixa = 0
    assert.equal(R.resolverBatida(e, 'rebrand').ok, false)
    const r = R.resolverBatida(e, 'perder')
    assert.equal(proj(r.estado, id).fase, 'APREENDIDO')
    assert.equal(r.estado.calor, CALOR.depoisDePerder)
    assert.equal(r.estado.contagem.batidas, 1)
  })

  // Regra mudou (20/11, conserto 1 do núcleo): antes a batida sem projeto no ar zerava o Calor de graça.
  // Agora, com caixa para pagar, cobra uma multa = rebrand mais barato e o Calor cai como no rebrand.
  const MULTA = Math.min(...Object.values(CALOR.rebrandCusto))

  test('batida sem projeto no ar e com caixa: cobra a multa (rebrand mais barato), Calor cai como no rebrand; prévia = resultado', () => {
    let { estado, id } = noAr(novo(), 'mitico')
    estado = online(estado, 30)
    estado.calor = 99
    estado.caixa = 1000
    const pv = R.previaTapete(estado, id)
    assert.equal(pv.batida, false)
    assert.equal(pv.multa, MULTA)
    assert.equal(pv.calorDepois, CALOR.depoisDoRebrand)
    const r = R.puxarTapete(estado, id)
    assert.equal(r.ok, true)
    assert.equal(r.multa, MULTA)
    assert.equal(r.ganho, pv.ganho)
    assert.equal(r.estado.batida, null)
    assert.equal(r.estado.calor, CALOR.depoisDoRebrand)
    assert.equal(r.estado.caixa, 1000 + r.ganho - MULTA)
    assert.equal(r.estado.caixaTotal, estado.caixaTotal + r.ganho) // multa não desconta do ganho da vida
    assert.ok(r.eventos.some(ev => ev.tipo === 'multa' && ev.valor === MULTA))
    assert.equal(r.estado.contagem.batidas, estado.contagem.batidas + 1)
  })

  test('batida sem projeto no ar e sem caixa para a multa: Calor só zera, nada é cobrado', () => {
    let { estado, id } = noAr(novo(), 'comum')
    estado = online(estado, FASES.lancamentoSeg + 1)
    estado.calor = 99.99
    estado.caixa = 0
    const pv = R.previaTapete(estado, id)
    assert.ok(pv.ganho < MULTA, `ganho ${pv.ganho} devia ser menor que a multa`)
    assert.equal(pv.multa, 0)
    assert.equal(pv.calorDepois, 0)
    const r = R.puxarTapete(estado, id)
    assert.equal(r.multa, 0)
    assert.equal(r.estado.batida, null)
    assert.equal(r.estado.calor, 0)
    assert.equal(r.estado.caixa, r.ganho)
    assert.ok(r.eventos.some(ev => ev.tipo === 'calor_zerou'))
  })
})

describe('luxos e prestígio', () => {
  test('luxo: compra única, cobra e soma bônus', () => {
    const l = LUXOS[0]
    const e = novo()
    assert.equal(R.comprarLuxo(e, l.id).ok, false) // sem caixa
    e.caixa = l.custo * 2
    const r = R.comprarLuxo(e, l.id)
    assert.equal(r.ok, true)
    assert.equal(r.estado.caixa, l.custo)
    assert.equal(R.bonus(r.estado).rendimento, l.bonus.rendimento)
    assert.equal(R.comprarLuxo(r.estado, l.id).ok, false)
    assert.equal(R.comprarLuxo(r.estado, 'nao_existe').ok, false)
  })

  test('luxo de rendimento faz render mais', () => {
    const { estado, id } = noAr(novo(), 'raro')
    const e = online(estado, 30)
    const com = structuredClone(e); com.luxos.push(LUXOS.find(l => l.bonus.rendimento).id)
    assert.ok(R.rendimentoPorHora(com, id) > R.rendimentoPorHora(e, id))
  })

  test('prestígio só na meta; ir preso zera e guarda álbum, carteirinha e contagem', () => {
    let e = R.imprimir(novo()).estado
    e.carteirinha.infl_1 = 2
    assert.equal(R.prestigioLiberado(e), false)
    assert.equal(R.irPreso(e).ok, false)
    e.caixaTotal = PRESTIGIO.meta
    e.luxos.push(LUXOS[0].id)
    const r = R.irPreso(e)
    assert.equal(r.ok, true)
    const n = r.estado
    assert.equal(n.caixa, 0); assert.equal(n.caixaTotal, 0)
    assert.deepEqual(n.cartas, []); assert.deepEqual(n.projetos, []); assert.deepEqual(n.luxos, [])
    assert.deepEqual(n.album, e.album)
    assert.equal(n.carteirinha.infl_1, 2)
    assert.equal(n.prestigio.nivel, 1)
    assert.equal(n.pseudonimo, 1)
    assert.equal(n.contagem.prisoes, 1)
    assert.ok(R.metaPrestigio(n) > PRESTIGIO.meta)
    assert.equal(R.bonus(n).rendimento, PRESTIGIO.bonusPorNivel)
  })
})

describe('contrato de influenciador', () => {
  function contratado(raridade, influ = 'infl_1') {
    let { estado, id } = noAr(novo('c-' + raridade), raridade)
    estado = online(estado, 10)
    estado.caixa = 10000
    const r = R.contratar(estado, id, influ)
    assert.equal(r.ok, true, r.erro)
    return { estado: r.estado, id }
  }

  test('vídeo 1: paga P1, traz trouxas e Calor; 1 vaga por projeto', () => {
    let { estado, id } = noAr(novo(), 'comum')
    estado = online(estado, 10)
    estado.caixa = 100
    const antes = proj(estado, id).trouxas
    const r = R.contratar(estado, id, 'infl_1')
    assert.equal(r.estado.caixa, 100 - CONTRATO.tamanhos.nano.p1)
    assert.equal(proj(r.estado, id).contrato.fase, 'V1_NO_AR')
    assert.ok(proj(r.estado, id).trouxas > antes)
    assert.ok(r.estado.calor > estado.calor)
    assert.equal(R.contratar(r.estado, id, 'infl_1').ok, false)
    assert.equal(R.contratar(estado, id, 'infl_6').ok, false) // ainda não liberado
  })

  test('pede mais só acima do limite de trouxas', () => {
    const baixo = contratado('comum') // nano × comum = 25 ≤ 30
    let e = online(baixo.estado, CONTRATO.esperaPedidoSeg + 5)
    const cb = proj(e, baixo.id).contrato
    assert.equal(cb.fase, 'V1_NO_AR')
    assert.equal(cb.proposta, CONTRATO.tamanhos.nano.p1)

    const alto = contratado('raro') // nano × raro = 37,5 > 30
    e = online(alto.estado, CONTRATO.esperaPedidoSeg + 5)
    const ca = proj(e, alto.id).contrato
    assert.equal(ca.fase, 'PEDE_MAIS')
    assert.equal(ca.proposta, Math.round(CONTRATO.tamanhos.nano.p1 * CONTRATO.multiplicadorP2))
    // pedido também chega com o jogador fora
    const fora = R.avancar(alto.estado, alto.estado.ultimoTempo + 3600 * 1000).estado
    assert.equal(proj(fora, alto.id).contrato.fase, 'PEDE_MAIS')
  })

  test('pagar põe o vídeo 2; recusar encerra; chorar é sorteado pelo servidor e repetível', () => {
    const alto = contratado('raro')
    const e = online(alto.estado, CONTRATO.esperaPedidoSeg + 5)
    const pago = R.responderContrato(e, alto.id, 'pagar')
    assert.equal(proj(pago.estado, alto.id).contrato.fase, 'V2_NO_AR')
    assert.equal(pago.estado.caixa, e.caixa - proj(e, alto.id).contrato.proposta)
    const rec = R.responderContrato(e, alto.id, 'recusar')
    assert.equal(proj(rec.estado, alto.id).contrato.fase, 'ENCERRADO')
    const c1 = R.responderContrato(e, alto.id, 'chorar')
    const c2 = R.responderContrato(e, alto.id, 'chorar')
    assert.deepEqual(c1, c2)
    const c = proj(c1.estado, alto.id).contrato
    assert.ok(['PEDE_MAIS', 'ENCERRADO'].includes(c.fase))
    if (c.fase === 'PEDE_MAIS') {
      assert.ok(c.proposta < proj(e, alto.id).contrato.proposta)
      assert.equal(R.responderContrato(c1.estado, alto.id, 'chorar').ok, false) // só chora 1 vez
    } else assert.equal(c.motivo, 'sumiu')
    assert.equal(R.responderContrato(e, alto.id, 'gritar').ok, false)
    // em muitas sementes aparecem os dois desfechos
    const fins = new Set()
    for (let i = 0; i < 30; i++) {
      const x = structuredClone(e); x.semente = 'choro' + i
      fins.add(proj(R.responderContrato(x, alto.id, 'chorar').estado, alto.id).contrato.fase)
    }
    assert.equal(fins.size, 2)
  })

  test('trouxas do vídeo somam ACIMA do limite: contratar cedo ou no pico traz o mesmo bônus', () => {
    // cedo: contrata logo depois do lançamento (fase HYPE) e espera chegar ao pico
    let cedo = noAr(novo('video-cedo'), 'comum')
    let e1 = online(cedo.estado, FASES.lancamentoSeg + 5)
    assert.equal(proj(e1, cedo.id).fase, 'HYPE')
    e1.caixa = 100
    const r1 = R.contratar(e1, cedo.id, 'infl_1')
    assert.equal(r1.ok, true, r1.erro)
    e1 = online(r1.estado, 600)
    // no pico: espera o pico e só então contrata
    let pico = noAr(novo('video-pico'), 'comum')
    let e2 = online(pico.estado, 600)
    assert.equal(proj(e2, pico.id).fase, 'PICO')
    e2.caixa = 100
    const r2 = R.contratar(e2, pico.id, 'infl_1')
    assert.equal(r2.ok, true, r2.erro)
    e2 = online(r2.estado, 60)
    assert.equal(r1.trazidas, r2.trazidas)
    const esperado = TROUXAS.maximo.comum + r1.trazidas
    assert.equal(proj(e1, cedo.id).fase, 'PICO')
    assert.ok(Math.abs(proj(e1, cedo.id).trouxas - esperado) < 1e-6, `cedo: ${proj(e1, cedo.id).trouxas} ≠ ${esperado}`)
    assert.ok(Math.abs(proj(e2, pico.id).trouxas - esperado) < 1e-6, `pico: ${proj(e2, pico.id).trouxas} ≠ ${esperado}`)
  })

  test('vídeo 3 sai sozinho depois do tapete e dá carimbo; 3 carimbos = REINCIDENTE', () => {
    let { estado, id } = contratado('comum')
    const t = R.puxarTapete(estado, id)
    assert.equal(R.previaTapete(estado, id).video3, true)
    assert.equal(proj(t.estado, id).contrato.fase, 'V3_NO_AR')
    assert.equal(t.estado.carteirinha.infl_1, 1)
    assert.equal(R.ehReincidente(t.estado, 'infl_1'), false)
    const r = structuredClone(t.estado); r.carteirinha.infl_1 = CONTRATO.carimbosReincidente
    assert.equal(R.ehReincidente(r, 'infl_1'), true)
  })
})

describe('P8 — relógio: pedir a cada 61 s', () => {
  test('pedir a cada 61 s não escapa do Calor nem do teto', () => {
    const passo = (TEMPO.limiteOnlineSeg + 1) * 1000
    const base = noAr(novo(), 'mitico').estado
    base.calor = 10
    // sumir: um pedido só depois de 1 h (fora do jogo, Calor parado)
    const sumiu = R.avancar(base, base.ultimoTempo + 3600 * 1000)
    assert.equal(sumiu.estado.calor, 10)
    // pedir a cada 61 s durante 1 h: o Calor tem de subir (primeiros 60 s de cada pedido contam como conectado)
    let e = base
    const fim = base.ultimoTempo + 3600 * 1000
    let visto = false
    while (e.ultimoTempo < fim) {
      const r = R.avancar(e, Math.min(fim, e.ultimoTempo + passo))
      if (r.segundos > TEMPO.limiteOnlineSeg) assert.equal(r.online, true)
      if (r.estado.batida) visto = true
      e = r.estado
    }
    assert.ok(e.calor > 10 || visto, `Calor ficou em ${e.calor}`)
    // o intervalo de 61 s rende o intervalo inteiro (61 s), não só 60
    const um = R.avancar(base, base.ultimoTempo + passo)
    assert.equal(um.segundos, TEMPO.limiteOnlineSeg + 1)
    assert.equal(um.online, true)
  })
})

test('save mexido à mão com nomes internos do JS em luxos não vira objeto (Object.hasOwn)', () => {
  const e = R.estadoInicial({ semente: 'x', agora: 0 })
  e.luxos = ['__proto__', 'constructor', 'cofre']
  const novo = R.atualizarEstado(e)
  assert.deepEqual(novo.luxos, ['__proto__', 'constructor', 'tela_curva'])
})

// ---------------------------------------------------------------------------------------------
// Lotes (QA 21/11, nota 72): imprimir N folhas e fundir tudo numa ação, com prévia que bate.
// ---------------------------------------------------------------------------------------------
describe('lotes: imprimir N e fundir tudo', () => {
  test('imprimir 10 debita a soma exata (1ª grátis) e tira 10 sorteios, igual a 10 impressões seguidas', () => {
    const e = novo('lote-10')
    e.caixa = 10 * IMPRESSORA.custo
    const pv = R.previaImprimir(e, 10)
    assert.equal(pv.ok, true, pv.erro)
    assert.equal(pv.quantidade, 10)
    assert.equal(pv.custo, 9 * IMPRESSORA.custo) // a 1ª da vida é grátis
    const r = R.imprimir(e, 10)
    assert.equal(r.ok, true, r.erro)
    assert.equal(r.cartas.length, 10)
    assert.equal(r.custo, pv.custo)
    assert.equal(r.estado.caixa, e.caixa - pv.custo)
    assert.equal(r.estado.sorteios, e.sorteios + 10)
    assert.equal(r.estado.contagem.impressoes, 10)
    assert.equal(e.cartas.length, 0) // estado de entrada não muda
    // um sorteio por folha: igual a imprimir uma de cada vez
    let s = e
    const uma = []
    for (let i = 0; i < 10; i++) { const x = R.imprimir(s); assert.equal(x.ok, true); uma.push(x.carta); s = x.estado }
    assert.deepEqual(r.cartas, uma)
    assert.deepEqual(r.estado, s)
    for (const c of r.cartas) assert.equal(r.estado.album[c.ideia], true)
  })

  test('quantidade fora de 1–10 ou não inteira é recusada; sem quantidade = 1', () => {
    const e = novo()
    e.caixa = 10_000
    for (const q of [0, LOTE.maximoImpressoes + 1, -1, 2.5, '3', null, NaN]) {
      assert.equal(R.imprimir(e, q).ok, false, String(q))
      assert.equal(R.previaImprimir(e, q).ok, false, String(q))
    }
    const r = R.imprimir(e)
    assert.equal(r.cartas.length, 1)
    assert.deepEqual(r.carta, r.cartas[0])
  })

  test('gaveta cheia corta o lote (avisa na prévia); gaveta já cheia recusa', () => {
    let e = novo()
    for (let i = 0; i < GAVETA.maximoDeCartas - 3; i++) e = comCarta(e, 'comum', 1 + (i % 5))
    e.caixa = 10_000
    e.contagem.impressoes = 1
    const pv = R.previaImprimir(e, 10)
    assert.equal(pv.ok, true)
    assert.equal(pv.quantidade, 3)
    assert.equal(pv.cortada, true)
    assert.equal(pv.custo, 3 * IMPRESSORA.custo)
    const r = R.imprimir(e, 10)
    assert.equal(r.cartas.length, 3)
    assert.equal(r.custo, pv.custo)
    assert.equal(r.cortada, true)
    assert.equal(r.estado.cartas.length, GAVETA.maximoDeCartas)
    const cheia = R.imprimir(r.estado, 2)
    assert.equal(cheia.ok, false)
    assert.match(cheia.erro, /gaveta/i)
  })

  test('sem caixa para o lote inteiro recusa sem imprimir nada (e diz quanto custa)', () => {
    const e = novo()
    e.contagem.impressoes = 1
    e.cartas.push({ id: e.proximoId++, ideia: 'comum_1', raridade: 'comum' })
    e.caixa = 3 * IMPRESSORA.custo - 1
    const r = R.imprimir(e, 3)
    assert.equal(r.ok, false)
    assert.match(r.erro, new RegExp(String(3 * IMPRESSORA.custo)))
    assert.equal(R.previaImprimir(e, 3).ok, false)
  })

  test('fundir tudo: funde todos os trios (em cascata) e a prévia mostra antes o que entra e sai', () => {
    let e = novo()
    for (let i = 0; i < 9; i++) e = comCarta(e, 'comum', 1) // 9 comum_1 → 3 incomum_1 → 1 raro_1
    for (let i = 0; i < 4; i++) e = comCarta(e, 'comum', 2) // 4 comum_2 → 1 incomum_2 + 1 comum_2
    e = comCarta(e, 'raro', 3)
    for (let i = 0; i < 3; i++) e = comCarta(e, 'mitico', 1) // Mítico não funde
    const antes = structuredClone(e)
    const pv = R.previaFundirTudo(e)
    assert.equal(pv.ok, true, pv.erro)
    const r = R.fundirTudo(e)
    assert.equal(r.ok, true, r.erro)
    assert.deepEqual(e, antes)
    assert.equal(r.fusoes, 5)
    assert.equal(pv.fusoes, r.fusoes)
    assert.deepEqual(pv.entraram, r.entraram)
    assert.deepEqual(pv.sairam, r.sairam)
    assert.deepEqual(r.entraram.map(c => c.ideia).sort(), ['incomum_2', 'raro_1'])
    assert.equal(r.sairam.length, 12)
    assert.equal(r.estado.cartas.length, e.cartas.length - 12 + 2)
    assert.equal(r.estado.contagem.fusoes, 5)
    assert.equal(r.estado.sorteios, e.sorteios) // sem sorteio
    // depois dele não sobra nenhum trio fundível
    const conta = {}
    for (const c of r.estado.cartas) conta[c.ideia] = (conta[c.ideia] || 0) + 1
    for (const c of r.estado.cartas) if (c.raridade !== 'mitico') assert.ok(conta[c.ideia] < 3, c.ideia)
    // igual a fundir um por um na mesma ordem
    let s = e
    for (const p of r.passos) { const x = R.fundir(s, p.ideia); assert.equal(x.ok, true); assert.deepEqual(x.carta, p.carta); s = x.estado }
    assert.deepEqual(r.estado, s)
    // nada para fundir: recusa
    assert.equal(R.fundirTudo(r.estado).ok, false)
    assert.equal(R.previaFundirTudo(r.estado).ok, false)
  })
})

// ---------------------------------------------------------------------------------------------
// Missão do dia (v1 aprovada: "missão do dia que não pune"). Dia = data em UTC.
// ---------------------------------------------------------------------------------------------
describe('missão do dia', () => {
  const DIA = 24 * 3600_000
  /** Primeiro dia (a partir de T0) em que a semente sorteia a missão do tipo pedido. */
  function diaCom(semente, tipo) {
    for (let d = 0; d < 60; d++) {
      const e = R.prepararMissoes(R.estadoInicial({ semente, agora: T0 + d * DIA }))
      if (e.missoes.lista.some(m => m.tipo === tipo)) return e
    }
    throw new Error(`nenhum dia com missão ${tipo}`)
  }

  test('3 missões por dia, de tipos diferentes, iguais para a mesma semente e dia', () => {
    const base = novo('m-1')
    const e = R.prepararMissoes(base)
    assert.equal(base.missoes, null) // entrada não muda
    assert.equal(e.missoes.dia, R.diaDoJogo(T0))
    assert.equal(R.diaDoJogo(Date.UTC(2026, 10, 21, 23, 59)), '2026-11-21')
    assert.equal(R.diaDoJogo(Date.UTC(2026, 10, 22, 0, 0)), '2026-11-22')
    assert.equal(e.missoes.lista.length, MISSOES.porDia)
    assert.equal(new Set(e.missoes.lista.map(m => m.tipo)).size, MISSOES.porDia)
    for (const m of e.missoes.lista) {
      assert.ok(Object.hasOwn(MISSOES.tipos, m.tipo), m.tipo)
      assert.ok(MISSOES.tipos[m.tipo].metas.includes(m.meta))
      assert.equal(m.premio, MISSOES.tipos[m.tipo].premioPorUnidade * m.meta)
    }
    assert.deepEqual(R.prepararMissoes(novo('m-1')).missoes, e.missoes)
    assert.equal(e.sorteios, 0) // não gasta o sorteio do jogo
    assert.deepEqual(R.prepararMissoes(e), e) // mesmo dia de novo: nada muda
    const listas = new Set()
    for (let d = 0; d < 10; d++) {
      const x = R.prepararMissoes(R.estadoInicial({ semente: 'm-1', agora: T0 + d * DIA }))
      listas.add(JSON.stringify(x.missoes.lista.map(m => [m.tipo, m.meta])))
    }
    assert.ok(listas.size > 1)
  })

  test('progresso conta só o que foi feito no dia; pronta → resgata 1 vez com o prêmio mostrado', () => {
    let e = diaCom('m-imprimir', 'imprimir')
    const m = e.missoes.lista.find(x => x.tipo === 'imprimir')
    e.contagem.impressoes = 7 // feitas antes do dia: não contam
    e.missoes.lista.find(x => x.id === m.id).base = 7
    e.caixa = 10_000
    let vis = R.missoesComProgresso(e).find(x => x.id === m.id)
    assert.equal(vis.progresso, 0)
    assert.equal(vis.pronta, false)
    assert.equal(R.resgatarMissao(e, m.id).ok, false)
    const r = R.imprimir(e, m.meta)
    assert.equal(r.ok, true, r.erro)
    e = r.estado
    vis = R.missoesComProgresso(e).find(x => x.id === m.id)
    assert.equal(vis.progresso, m.meta)
    assert.equal(vis.pronta, true)
    assert.equal(vis.resgatada, false)
    const g = R.resgatarMissao(e, m.id)
    assert.equal(g.ok, true, g.erro)
    assert.equal(g.premio, vis.premio)
    assert.equal(g.estado.caixa, e.caixa + vis.premio)
    assert.equal(R.missoesComProgresso(g.estado).find(x => x.id === m.id).resgatada, true)
    const de2 = R.resgatarMissao(g.estado, m.id)
    assert.equal(de2.ok, false)
    assert.match(de2.erro, /já/i)
    assert.equal(R.resgatarMissao(g.estado, 'nao-existe').ok, false)
    assert.equal(R.resgatarMissao(g.estado, { id: m.id }).ok, false)
    // o progresso não passa da meta
    const mais = R.imprimir(g.estado, 3)
    assert.equal(R.missoesComProgresso(mais.estado).find(x => x.id === m.id).progresso, m.meta)
  })

  test('cada tipo conta a ação certa (tapete, imprimir, luxo, fusão, contrato)', () => {
    assert.deepEqual(Object.keys(MISSOES.tipos).sort(), Object.keys(R.CONTAGEM_DA_MISSAO).sort())
    let e = novo('cont')
    e.caixa = 100_000
    e = R.comprarLuxo(e, LUXOS[0].id).estado
    assert.equal(e.contagem.luxos, 1)
    const p = noAr(e, 'comum')
    e = R.contratar(p.estado, p.id, 'infl_1').estado
    assert.equal(e.contagem.contratos, 1)
    // save antigo sem as contagens novas: atualizarEstado põe 0
    const velho = novo()
    delete velho.contagem.luxos; delete velho.contagem.contratos; delete velho.missoes
    const at = R.atualizarEstado(velho)
    assert.equal(at.contagem.luxos, 0)
    assert.equal(at.contagem.contratos, 0)
    assert.equal(R.prepararMissoes(at).missoes.lista.length, MISSOES.porDia)
  })

  test('dia seguinte: missões novas, nada é tirado; pronta e não resgatada fica para resgatar', () => {
    let e = diaCom('m-dia', 'imprimir')
    const m = e.missoes.lista.find(x => x.tipo === 'imprimir')
    e.caixa = 10_000
    e = R.imprimir(e, m.meta).estado
    const caixa = e.caixa
    const contagem = structuredClone(e.contagem)
    const amanha = R.avancar(e, e.ultimoTempo + DIA).estado
    const n = R.prepararMissoes(amanha)
    assert.equal(n.missoes.dia, R.diaDoJogo(amanha.ultimoTempo))
    assert.notEqual(n.missoes.dia, e.missoes.dia)
    assert.equal(n.caixa, amanha.caixa)
    assert.ok(n.caixa >= caixa)
    assert.deepEqual(n.contagem, contagem)
    const novas = n.missoes.lista.filter(x => x.id.startsWith(n.missoes.dia.replaceAll('-', '')))
    assert.equal(novas.length, MISSOES.porDia)
    for (const x of R.missoesComProgresso(n)) if (novas.some(y => y.id === x.id)) assert.equal(x.progresso, 0)
    // a pronta de ontem continua lá e paga
    const ontem = R.missoesComProgresso(n).find(x => x.id === m.id)
    assert.ok(ontem && ontem.pronta && !ontem.resgatada)
    assert.equal(R.resgatarMissao(n, m.id).ok, true)
    // a não pronta de ontem some sem cobrar nada
    const naoPronta = e.missoes.lista.find(x => x.id !== m.id)
    assert.equal(n.missoes.lista.some(x => x.id === naoPronta.id), false)
  })

  test('sem luxo para comprar, a missão de luxo não é sorteada', () => {
    for (let d = 0; d < 30; d++) {
      const e = R.estadoInicial({ semente: 'todos-luxos', agora: T0 + d * DIA })
      e.luxos = LUXOS.map(l => l.id)
      assert.equal(R.prepararMissoes(e).missoes.lista.some(m => m.tipo === 'luxo'), false)
    }
  })
})
