// Testes da máquina da partida do jogo de reino (shared/reino/partida.js) e dos dados (shared/reino/config.js).
// Rodar: npm test  (ou: node --test tests/servidor/reino-partida.test.js)
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALBUM, CARTAS, CHEFES, FAMILIAS, MULT_NIVEL, PARTIDA, RARIDADES, RELIQUIAS } from '../../shared/reino/config.js'
import { aplicar, chefeDaRodada, criarPartida, opcoes, reproduzir, resultado, visao } from '../../shared/reino/partida.js'
import { jogarPartida } from '../../shared/reino/robos.js'
import { criarRng } from '../../shared/rng.js'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const TODAS = Object.keys(CARTAS)

// ---------------------------------------------------------------- ajudas
function ok(e, cmd) {
  const r = aplicar(e, cmd)
  assert.equal(r.ok, true, `recusado: ${r.erro} ${r.motivo} ${JSON.stringify(cmd)}`)
  return r.estado
}
function recusa(e, cmd, codigo) {
  const antes = JSON.stringify(e)
  const r = aplicar(e, cmd)
  assert.equal(r.ok, false, `devia recusar (${codigo}): ${JSON.stringify(cmd)}`)
  assert.equal(r.erro, codigo, r.motivo)
  assert.equal(typeof r.motivo, 'string')
  assert.equal(JSON.stringify(e), antes, 'recusa não pode mudar o estado')
}
/** Partida inteira de um robô (com semente própria para o robô aleatório). */
function partidaDeRobo(robo, semente, cartasLiberadas = TODAS) {
  const rng = criarRng(`robo:${semente}`)
  return jogarPartida({ robo, semente, cartasLiberadas, inteiro: (n) => rng.inteiro(n) })
}
/** Joga até vencer a rodada 1 e cair no espólio (põe a 1ª Tropa no terreno 1). */
function ateEspolio(semente) {
  let e = criarPartida({ semente, cartasLiberadas: TODAS })
  e = ok(e, { tipo: 'por', carta: e.oferta[0], terreno: 1 })
  e = ok(e, { tipo: 'batalhar' })
  assert.equal(e.fase, 'espolio', `a rodada 1 devia ser vencida (semente ${semente})`)
  return e
}

// ---------------------------------------------------------------- dados
describe('reino: config (dados do jogo)', () => {
  test('30 cartas: 12 Tropas, 10 Construções, 8 Magias; famílias e raridades válidas', () => {
    const cs = Object.values(CARTAS)
    assert.equal(cs.length, 30)
    assert.equal(cs.filter((c) => c.tipo === 'tropa').length, 12)
    assert.equal(cs.filter((c) => c.tipo === 'construcao').length, 10)
    assert.equal(cs.filter((c) => c.tipo === 'magia').length, 8)
    const rars = RARIDADES.map((r) => r.id)
    for (const [id, c] of Object.entries(CARTAS)) {
      assert.ok(FAMILIAS[c.familia], `${id}: família`)
      assert.ok(rars.includes(c.raridade), `${id}: raridade`)
      assert.ok(typeof c.nome === 'string' && c.nome && typeof c.texto === 'string' && c.texto, `${id}: nome/texto`)
    }
    assert.equal(RARIDADES.reduce((a, r) => a + r.chance, 0), 100)
  })
  test('todo nível de toda carta tem número (5 níveis, sem buraco, sem número negativo)', () => {
    assert.equal(MULT_NIVEL.length, PARTIDA.nivelMax)
    for (const [id, c] of Object.entries(CARTAS)) {
      const listas = c.tipo === 'tropa' ? [c.qtd, c.multNivel || MULT_NIVEL] : [c.valores, ...(c.valores2 ? [c.valores2] : [])]
      for (const l of listas) {
        assert.equal(l.length, PARTIDA.nivelMax, id)
        for (let n = 0; n < l.length; n++) {
          assert.ok(Number.isInteger(l[n]) && l[n] > 0, `${id} N${n + 1}`)
          if (n) assert.ok(l[n] >= l[n - 1], `${id}: nível ${n + 1} não pode ser pior que o ${n}`)
        }
      }
    }
  })
  test('álbum: 12 cartas no começo + 18 na ordem = as 30, sem repetir', () => {
    assert.equal(ALBUM.inicial.length, 12)
    const tudo = [...ALBUM.inicial, ...ALBUM.ordem]
    assert.equal(new Set(tudo).size, 30)
    for (const id of tudo) assert.ok(CARTAS[id], id)
  })
  test('8 relíquias e 4 chefes nas rodadas 5, 10, 15 e 20', () => {
    assert.equal(Object.keys(RELIQUIAS).length, 8)
    assert.deepEqual(CHEFES.map((c) => c.rodada), [5, 10, 15, 20])
  })
})

// ---------------------------------------------------------------- criar e validar
describe('reino: criar partida', () => {
  test('começa na rodada 1 com 3 vidas, 3 de ouro, 6 terrenos vazios e 3 Tropas diferentes', () => {
    const e = criarPartida({ semente: 'a', cartasLiberadas: TODAS })
    assert.equal(e.rodada, 1)
    assert.equal(e.vidas, 3)
    assert.equal(e.ouro, 3)
    assert.deepEqual(e.terrenos, [null, null, null, null, null, null])
    assert.equal(e.oferta.length, 3)
    assert.equal(new Set(e.oferta).size, 3)
    for (const c of e.oferta) assert.equal(CARTAS[c].tipo, 'tropa')
    assert.deepEqual(e.horda.ordem, ['muncher', 'muncher'])
    assert.deepEqual(e.espolios.map((x) => x.tipo), ['carta', 'promocao', 'bolsa'])
  })
  test('sem lista de cartas usa as 12 do álbum inicial; a ordem da lista não muda a partida', () => {
    assert.deepEqual(criarPartida({ semente: 's' }).liberadas, Object.keys(CARTAS).filter((id) => ALBUM.inicial.includes(id)))
    const a = criarPartida({ semente: 's', cartasLiberadas: ['T01', 'T04', 'T07', 'B01'] })
    const b = criarPartida({ semente: 's', cartasLiberadas: ['B01', 'T07', 'T04', 'T01'] })
    assert.deepEqual(a, b)
  })
  test('semente e lista de cartas inválidas são recusadas', () => {
    for (const s of [undefined, null, '', 1.5, {}, 'x'.repeat(201)]) assert.throws(() => criarPartida({ semente: s }), /Semente/)
    for (const l of [['T01', 'T01', 'T04', 'T07'], ['T01', 'NOPE', 'T04', 'T07'], ['T01', 'T04', 'B01'], ['T01', 'T04', 'T08'], 'T01', [1, 2, 3]]) {
      assert.throws(() => criarPartida({ semente: 'x', cartasLiberadas: l }))
    }
  })
  test('só cartas liberadas aparecem na oferta e nos espólios', () => {
    const lib = ['T01', 'T04', 'T07', 'B01', 'M01']
    const { estado, diario } = partidaDeRobo('ganancioso', 'lib', lib)
    for (const l of diario) {
      if (l.carta) assert.ok(lib.includes(l.carta), l.carta)
      if (l.espolio && l.espolio.carta) assert.ok(lib.includes(l.espolio.carta))
    }
    for (const t of estado.terrenos) if (t) assert.ok(lib.includes(t.carta))
  })
})

// ---------------------------------------------------------------- determinismo e reprodução
describe('reino: determinismo e reproduzir', () => {
  test('mesma semente e mesmos comandos → mesmo estado e mesmos eventos, passo a passo', () => {
    const { comandos } = partidaDeRobo('planejador', 'det-1')
    const passo = () => {
      let e = criarPartida({ semente: 'det-1', cartasLiberadas: TODAS })
      const out = []
      for (const c of comandos) { const r = aplicar(e, c); assert.ok(r.ok); out.push(JSON.stringify(r)); e = r.estado }
      return out
    }
    assert.deepEqual(passo(), passo())
  })
  test('sementes diferentes dão partidas diferentes', () => {
    const a = criarPartida({ semente: 'um', cartasLiberadas: TODAS })
    const b = criarPartida({ semente: 'dois', cartasLiberadas: TODAS })
    assert.notDeepEqual([a.oferta, a.espolios], [b.oferta, b.espolios])
  })
  test('reproduzir bate com a partida jogada (3 robôs)', () => {
    for (const robo of ['aleatorio', 'ganancioso', 'planejador']) {
      const { estado, comandos } = partidaDeRobo(robo, `rep-${robo}`)
      const r = reproduzir({ semente: `rep-${robo}`, cartasLiberadas: TODAS, comandos })
      assert.equal(r.ok, true)
      assert.deepEqual(r.estado, estado)
      assert.deepEqual(r.resultado, resultado(estado))
      assert.equal(r.resultado.fim, true)
    }
  })
  test('reproduzir recusa comando adulterado e diz em qual comando', () => {
    const { comandos } = partidaDeRobo('ganancioso', 'adult')
    const ruim = comandos.slice()
    const i = ruim.findIndex((c) => c.tipo === 'por')
    ruim[i] = { tipo: 'por', carta: 'NOPE', terreno: 1 }
    const r = reproduzir({ semente: 'adult', cartasLiberadas: TODAS, comandos: ruim })
    assert.equal(r.ok, false)
    assert.equal(r.indice, i)
    assert.equal(r.erro, 'carta')
  })
  test('aplicar nunca muda o estado recebido', () => {
    const e = criarPartida({ semente: 'puro', cartasLiberadas: TODAS })
    const antes = JSON.stringify(e)
    aplicar(e, { tipo: 'por', carta: e.oferta[0], terreno: 2 })
    aplicar(e, { tipo: 'batalhar' })
    assert.equal(JSON.stringify(e), antes)
  })
})

// ---------------------------------------------------------------- visão
describe('reino: visao não vaza semente nem sorteio futuro', () => {
  test('sem semente, sem chave do sorteio, sem estado do sorteio', () => {
    const { comandos } = partidaDeRobo('ganancioso', 'segredo-xyz-123')
    let e = criarPartida({ semente: 'segredo-xyz-123', cartasLiberadas: TODAS })
    for (const c of comandos) {
      const v = JSON.stringify(visao(e)) + JSON.stringify(opcoes(e))
      assert.ok(!v.includes('segredo-xyz'), 'semente na visão')
      assert.ok(!v.includes(e.sorteio.chave), 'chave do sorteio na visão')
      assert.ok(!/sorteio"|chave|contador|sobra/.test(v), 'estado do sorteio na visão')
      e = aplicar(e, c, { eventos: false }).estado
    }
  })
  test('a visão não depende do estado do sorteio (o que vai sair depois não aparece)', () => {
    const e = criarPartida({ semente: 'futuro', cartasLiberadas: TODAS })
    const outro = structuredClone(e)
    outro.sorteio = criarPartida({ semente: 'outra-coisa' }).sorteio
    assert.deepEqual(visao(e), visao(outro))
    assert.deepEqual(opcoes(e), opcoes(outro))
    // e o sorteio de novo dá cartas diferentes: o futuro estava mesmo escondido
    e.ouro = outro.ouro = 50
    const a = aplicar(e, { tipo: 'sortear' }).estado.oferta
    const b = aplicar(outro, { tipo: 'sortear' }).estado.oferta
    assert.notDeepEqual(a, b)
  })
})

// ---------------------------------------------------------------- comandos
describe('reino: comandos válidos e inválidos', () => {
  test('pôr carta: mesma carta no mesmo terreno sobe nível; outra carta troca; nível 5 é o teto', () => {
    let e = criarPartida({ semente: 'nivel', cartasLiberadas: TODAS })
    const c = e.oferta[0]
    e = ok(e, { tipo: 'por', carta: c, terreno: 3 })
    assert.deepEqual(e.terrenos[2], { carta: c, nivel: 1 })
    // força a mesma carta na oferta (teste)
    for (let n = 2; n <= 5; n++) {
      e.cartaPosta = false; e.oferta = [c, 'T01', 'T04']
      e = ok(e, { tipo: 'por', carta: c, terreno: 3 })
      assert.equal(e.terrenos[2].nivel, n)
    }
    e.cartaPosta = false; e.oferta = [c, 'B01', 'M01']
    recusa(e, { tipo: 'por', carta: c, terreno: 3 }, 'nivel_maximo')
    const r = aplicar(e, { tipo: 'por', carta: 'B01', terreno: 3 })
    assert.ok(r.ok)
    assert.deepEqual(r.estado.terrenos[2], { carta: 'B01', nivel: 1 })
    assert.equal(r.eventos[0].trocou, c)
  })
  test('terreno fora, carta fora da mão, segunda carta na rodada, comando estranho: recusados', () => {
    const e = criarPartida({ semente: 'inval', cartasLiberadas: TODAS })
    const c = e.oferta[0]
    for (const t of [0, 7, -1, 1.5, '1', null, undefined]) recusa(e, { tipo: 'por', carta: c, terreno: t }, 'terreno')
    const fora = TODAS.find((id) => !e.oferta.includes(id))
    recusa(e, { tipo: 'por', carta: fora, terreno: 1 }, 'carta')
    recusa(e, { tipo: 'por', carta: 123, terreno: 1 }, 'carta')
    const e2 = ok(e, { tipo: 'por', carta: c, terreno: 1 })
    recusa(e2, { tipo: 'por', carta: e2.oferta[1], terreno: 2 }, 'ja_pos')
    recusa(e2, { tipo: 'sortear' }, 'ja_pos')
    recusa(e, { tipo: 'voar' }, 'comando')
    recusa(e, { tipo: 'espolio', indice: 0 }, 'fase')
    for (const cmd of [null, 'por', [], {}, { tipo: 5 }]) assert.equal(aplicar(e, cmd).ok, false)
    assert.equal(aplicar(null, { tipo: 'batalhar' }).ok, false)
    assert.equal(aplicar({ v: 99 }, { tipo: 'batalhar' }).ok, false)
  })
  test('ouro insuficiente: sortear e consertar recusados; custos sobem (2, 3… e 20, 40…)', () => {
    let e = criarPartida({ semente: 'ouro', cartasLiberadas: TODAS })
    e.ouro = 1
    recusa(e, { tipo: 'sortear' }, 'ouro')
    e.ouro = 100
    recusa(e, { tipo: 'consertar' }, 'vida_cheia')
    e = ok(e, { tipo: 'sortear' })
    assert.equal(e.ouro, 98)
    e = ok(e, { tipo: 'sortear' })
    assert.equal(e.ouro, 95)
    assert.equal(visao(e).custos.sortear, 4)
    e.vidas = 1
    e = ok(e, { tipo: 'consertar' })
    assert.equal(e.vidas, 2)
    assert.equal(e.ouro, 95 - PARTIDA.ouro.consertoBase)
    assert.equal(visao(e).custos.consertar, PARTIDA.ouro.consertoBase + PARTIDA.ouro.consertoPasso)
    e.ouro = PARTIDA.ouro.consertoBase
    recusa(e, { tipo: 'consertar' }, 'ouro')
  })
  test('Lucky Horseshoe: o 1º sorteio de cada oferta é grátis', () => {
    let e = criarPartida({ semente: 'ferradura', cartasLiberadas: TODAS })
    e.reliquias = ['horseshoe']
    e.ouro = 10
    e = ok(e, { tipo: 'sortear' })
    assert.equal(e.ouro, 10)
    e = ok(e, { tipo: 'sortear' })
    assert.equal(e.ouro, 8)
  })
  test('depois do fim nada é aceito; desistir acaba a partida', () => {
    let e = criarPartida({ semente: 'fim', cartasLiberadas: TODAS })
    e = ok(e, { tipo: 'desistir' })
    assert.equal(e.fase, 'fim')
    assert.equal(resultado(e).motivo, 'desistiu')
    for (const c of [{ tipo: 'batalhar' }, { tipo: 'desistir' }, { tipo: 'sortear' }]) recusa(e, c, 'fim')
    const { estado } = partidaDeRobo('ganancioso', 'fim-2')
    assert.equal(estado.fase, 'fim')
    recusa(estado, { tipo: 'batalhar' }, 'fim')
  })
  test('teto de comandos: o comando além do teto é recusado; reproduzir recusa lista grande demais', () => {
    const e = criarPartida({ semente: 'teto', cartasLiberadas: TODAS })
    e.comandos = PARTIDA.tetoComandos
    recusa(e, { tipo: 'batalhar' }, 'teto')
    const r = reproduzir({ semente: 'teto', cartasLiberadas: TODAS, comandos: Array(PARTIDA.tetoComandos + 1).fill({ tipo: 'consertar' }) })
    assert.equal(r.ok, false)
    assert.equal(reproduzir({ semente: 'teto', comandos: 'nada' }).ok, false)
  })
  test('perder: tira 1 vida, dá ouro de consolo e a MESMA rodada volta com horda e oferta novas; sem vidas acaba', () => {
    let e = criarPartida({ semente: 'perde', cartasLiberadas: TODAS })
    // sem tropas o castelo cai
    const h1 = e.horda
    e = ok(e, { tipo: 'batalhar' })
    assert.equal(e.vidas, 2)
    assert.equal(e.rodada, 1)
    assert.equal(e.fase, 'carta')
    assert.equal(e.ouro, PARTIDA.ouro.inicio + PARTIDA.ouro.derrota)
    assert.ok(e.horda && e.horda.rodada === h1.rodada)
    e = ok(e, { tipo: 'batalhar' })
    e = ok(e, { tipo: 'batalhar' })
    assert.equal(e.fase, 'fim')
    assert.equal(resultado(e).motivo, 'sem_vidas')
    assert.equal(resultado(e).pontos, Math.min(99, e.ultima.pctHorda))
  })
  test('vencer dá ouro e abre o espólio; a rodada seguinte traz LEVEL UP como 1ª carta', () => {
    let e = ateEspolio('vence')
    assert.ok(e.ouro >= PARTIDA.ouro.inicio + PARTIDA.ouro.vitoria)
    recusa(e, { tipo: 'batalhar' }, 'fase')
    recusa(e, { tipo: 'espolio', indice: 3 }, 'espolio')
    recusa(e, { tipo: 'espolio', indice: 1, terreno: 6 }, 'terreno_vazio')
    e = ok(e, { tipo: 'espolio', indice: 1, terreno: 1 })
    assert.equal(e.terrenos[0].nivel, 2)
    assert.equal(e.rodada, 2)
    assert.equal(e.oferta[0], e.terrenos[0].carta)
    assert.equal(visao(e).oferta[0].levelUp, true)
  })
  test('opcoes lista só comandos que aplicar aceita', () => {
    const { comandos } = partidaDeRobo('aleatorio', 'opc')
    let e = criarPartida({ semente: 'opc', cartasLiberadas: TODAS })
    let vistos = 0
    for (const c of comandos) {
      for (const x of opcoes(e).comandos) { assert.equal(aplicar(e, x, { eventos: false }).ok, true, JSON.stringify(x)); vistos++ }
      e = aplicar(e, c, { eventos: false }).estado
    }
    assert.ok(vistos > 50)
  })
})

// ---------------------------------------------------------------- chefes e espólios
describe('reino: chefes e espólios', () => {
  test('chefes nas rodadas 5, 10, 15, 20 e depois repetem a cada 5; nenhuma outra rodada tem chefe', () => {
    const esperado = { 5: 'gutbucket', 10: 'niptuck', 15: 'moleworth', 20: 'gobble', 25: 'gutbucket', 30: 'niptuck', 40: 'gobble' }
    for (let r = 1; r <= 40; r++) {
      const c = chefeDaRodada(r)
      if (esperado[r]) assert.equal(c.id, esperado[r], `rodada ${r}`)
      else if (r % 5) assert.equal(c, null, `rodada ${r}`)
    }
  })
  test('nas partidas jogadas o chefe vem na rodada certa, no fim da fila, e paga 1 de 3 relíquias', () => {
    let vistos = 0
    for (const s of ['ch-1', 'ch-2', 'ch-3']) {
      let e = criarPartida({ semente: s, cartasLiberadas: TODAS })
      const { comandos } = partidaDeRobo('planejador', s)
      for (const c of comandos) {
        if (e.fase === 'carta') {
          const ch = chefeDaRodada(e.rodada)
          assert.equal(e.horda.chefe, ch ? ch.id : null)
          if (ch) {
            vistos++
            assert.equal(e.horda.ordem.at(-1), ch.id)
            assert.ok(e.espolios.every((x) => x.tipo === 'reliquia' || x.tipo === 'bolsa'))
            assert.equal(new Set(e.espolios.map((x) => x.reliquia)).size, 3)
          }
        }
        e = aplicar(e, c, { eventos: false }).estado
      }
    }
    assert.ok(vistos >= 3)
  })
  test('o espólio mostrado antes da luta é o que entra no reino', () => {
    let conferidos = 0
    for (const s of ['esp-1', 'esp-2', 'esp-3', 'esp-4']) {
      const { comandos } = partidaDeRobo('ganancioso', s)
      let e = criarPartida({ semente: s, cartasLiberadas: TODAS })
      let mostrado = null
      for (const c of comandos) {
        if (e.fase === 'carta') mostrado = JSON.stringify(visao(e).espolios)
        if (c.tipo === 'espolio') {
          assert.equal(JSON.stringify(visao(e).espolios), mostrado, 'espólio mudou entre a carta e a luta')
          const esp = JSON.parse(mostrado)[c.indice]
          const r = aplicar(e, c)
          const depois = r.estado
          if (esp.tipo === 'carta') assert.equal(depois.terrenos[c.terreno - 1].carta, esp.carta)
          else if (esp.reliquia) assert.ok(depois.reliquias.includes(esp.reliquia))
          else if (esp.tipo === 'bolsa') assert.equal(depois.ouro, e.ouro + esp.ouro)
          conferidos++
        }
        e = aplicar(e, c, { eventos: false }).estado
      }
    }
    assert.ok(conferidos >= 10)
  })
  test('relíquias não se repetem; Spare Crown dá 1 vida a mais', () => {
    let e = ateEspolio('coroa')
    e.espolios = [{ tipo: 'reliquia', reliquia: 'crown' }, { tipo: 'promocao' }, { tipo: 'bolsa', ouro: 8 }]
    e = ok(e, { tipo: 'espolio', indice: 0 })
    assert.equal(e.vidas, 4)
    assert.equal(e.vidasMax, 4)
    for (const s of ['rel-1', 'rel-2']) {
      const { estado } = partidaDeRobo('planejador', s)
      assert.equal(new Set(estado.reliquias).size, estado.reliquias.length)
    }
  })
})

// ---------------------------------------------------------------- limpeza do código
describe('reino: o motor não usa sorte de fora nem relógio', () => {
  test('nenhum Math.random, Date ou performance.now em shared/reino', () => {
    const dir = path.join(RAIZ, 'shared/reino')
    const arquivos = fs.readdirSync(dir).filter((f) => f.endsWith('.js'))
    assert.ok(arquivos.length >= 4)
    for (const f of arquivos) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8')
      assert.ok(!/Math\.random|Date\.now|new Date|\bDate\(|performance\.now|crypto/.test(src), f)
    }
  })
})
