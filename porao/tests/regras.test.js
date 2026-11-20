// Porão — tarefa 1: regras puras (porao/comum/regras.js) e números (porao/comum/config.js).
// Rodar: node --test porao/tests/regras.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import * as R from '../comum/regras.js'
import { CHANCES, RARIDADES, TEMPO, CONTRATO, PRESTIGIO, LUXOS, IMPRESSORA, CALOR, FASES, TROUXAS } from '../comum/config.js'

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
