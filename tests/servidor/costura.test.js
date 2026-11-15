// Testes da Costura (cruzamento), genes, desgaste e Carretel (shared/costura.js).
// Rodar: npm test  (ou: node --test tests/servidor/costura.test.js)
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { criarLuta, montarBoneco } from '../../shared/batalha.js'
import { criarRng } from '../../shared/rng.js'
import { jogarTurno } from '../../shared/robos.js'
import {
  PARAMS_COSTURA, PARTES_DO_BONECO, abrirCasulo, aposentar, chancesDaCostura, costurar, custoDaCostura,
  gerarBonecoInicial, nivelDeRemendo, olharOAvesso, paraLuta, podeAposentar, podeCosturar, registrarLuta, validarBoneco,
} from '../../shared/costura.js'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// Dois pais com 4 genes DIFERENTES em cada parte (para o teste estatístico enxergar cada caminho).
function boneco(id, genes, extra = {}) {
  const partes = {}
  for (const p of PARTES_DO_BONECO) partes[p] = { face: genes[p][0], forro: genes[p][1] }
  return { id, partes, voltasUsadas: 0, pontosDeCostura: 0, pais: [], geracao: 0, estado: 'ativo', ocupado: false, lutas: 0, vitorias: 0, maiorGolpe: 0, ...extra }
}
const A = boneco('A', {
  tronco: ['tr_jeans_rebitado@comum', 'tr_seda_bordada@rara'],
  cabeca: ['cab_botao@comum', 'cab_ziper@incomum'],
  bracos: ['br_rasgado@lendaria', 'br_cadarco@comum'],
  pernas: ['pe_rebite@comum', 'pe_sola@rara'],
  bordado: ['bo_espinho@incomum', 'bo_rancor@comum'],
})
const B = boneco('B', {
  tronco: ['tr_la_embolada@incomum', 'tr_tule_rasgado@lendaria'],
  cabeca: ['cab_gorro@rara', 'cab_veu@comum'],
  bracos: ['br_agulha@comum', 'br_nevoa@rara'],
  pernas: ['pe_novelo@lendaria', 'pe_cetim@comum'],
  bordado: ['bo_olho_de_vidro@comum', 'bo_pe_de_chumbo@lendaria'],
})

function costurarOk(args) {
  const r = costurar(args)
  assert.equal(r.ok, true, `${r.codigo} ${r.motivo}`)
  return r
}

describe('costura: genes e chances', () => {
  test('determinismo: mesma semente e mesmos pais → mesmo filho, sorteios e custo', () => {
    const r1 = costurarOk({ semente: 'x1', paiA: A, paiB: B })
    const r2 = costurarOk({ semente: 'x1', paiA: A, paiB: B })
    assert.deepEqual(r1, r2)
    const r3 = costurarOk({ semente: 'x2', paiA: A, paiB: B })
    assert.notDeepEqual(r1.sorteios, r3.sorteios)
    const g1 = gerarBonecoInicial(criarRng('g')), g2 = gerarBonecoInicial(criarRng('g'))
    assert.deepEqual(g1, g2)
    assert.equal(validarBoneco(g1).ok, true)
  })

  test('as chances de cada parte somam 1 (face, forro e raridade da face)', () => {
    const casos = [[A, B], [A, boneco('C', Object.fromEntries(PARTES_DO_BONECO.map((p) => [p, [A.partes[p].face, A.partes[p].face]])))]]
    const rng = criarRng('soma')
    for (let i = 0; i < 20; i++) casos.push([gerarBonecoInicial(rng, { id: `s${i}a` }), gerarBonecoInicial(rng, { id: `s${i}b` })])
    for (const [x, y] of casos) {
      const ch = chancesDaCostura(x, y)
      for (const p of PARTES_DO_BONECO) {
        const soma = (l) => l.reduce((s, r) => s + r.chance, 0)
        assert.ok(Math.abs(soma(ch[p].face) - 1) < 1e-12, `face ${p}`)
        assert.ok(Math.abs(soma(ch[p].forro) - 1) < 1e-12, `forro ${p}`)
        assert.ok(Math.abs(Object.values(ch[p].raridadeDaFace).reduce((s, v) => s + v, 0) - 1) < 1e-12)
        const genes = ch[p].face.map((r) => r.gene)
        assert.equal(new Set(genes).size, genes.length, 'gene repetido na lista: as chances iguais têm de ser somadas')
      }
    }
  })

  test('chances exatas: 35% face de cada pai, 15% forro de cada pai; forro do filho 25% cada', () => {
    const ch = chancesDaCostura(A, B)
    const mapa = (l) => Object.fromEntries(l.map((r) => [r.gene, r.chance]))
    const f = mapa(ch.tronco.face)
    assert.ok(Math.abs(f['tr_jeans_rebitado@comum'] - 0.35) < 1e-12)
    assert.ok(Math.abs(f['tr_seda_bordada@rara'] - 0.15) < 1e-12)
    assert.ok(Math.abs(f['tr_la_embolada@incomum'] - 0.35) < 1e-12)
    assert.ok(Math.abs(f['tr_tule_rasgado@lendaria'] - 0.15) < 1e-12)
    for (const v of Object.values(mapa(ch.tronco.forro))) assert.ok(Math.abs(v - 0.25) < 1e-12)
    // gene repetido: soma
    const C = boneco('C', Object.fromEntries(PARTES_DO_BONECO.map((p) => [p, [A.partes[p].face, A.partes[p].face]])))
    const ch2 = chancesDaCostura(A, C)
    const f2 = mapa(ch2.cabeca.face)
    assert.ok(Math.abs(f2['cab_botao@comum'] - 0.85) < 1e-12)
    assert.ok(Math.abs(f2['cab_ziper@incomum'] - 0.15) < 1e-12)
    assert.ok(Math.abs(mapa(ch2.cabeca.forro)['cab_botao@comum'] - 0.75) < 1e-12)
  })

  test('sorteio real bate com chancesDaCostura (20.000 costuras, tolerância de 4,5 desvios)', () => {
    const N = 20000
    const ch = chancesDaCostura(A, B)
    const cont = {}
    for (const p of PARTES_DO_BONECO) cont[p] = { face: {}, forro: {} }
    for (let i = 0; i < N; i++) {
      const { filho } = costurarOk({ semente: `est:${i}`, paiA: A, paiB: B, idFilho: 'f' })
      for (const p of PARTES_DO_BONECO) {
        const g = filho.partes[p]
        cont[p].face[g.face] = (cont[p].face[g.face] ?? 0) + 1
        cont[p].forro[g.forro] = (cont[p].forro[g.forro] ?? 0) + 1
      }
    }
    for (const p of PARTES_DO_BONECO) {
      for (const lado of ['face', 'forro']) {
        const esperado = ch[p][lado]
        assert.deepEqual(Object.keys(cont[p][lado]).sort(), esperado.map((r) => r.gene).sort(), `${p}.${lado}: resultado fora da lista`)
        for (const r of esperado) {
          const obs = cont[p][lado][r.gene] / N
          const sd = Math.sqrt((r.chance * (1 - r.chance)) / N)
          assert.ok(Math.abs(obs - r.chance) <= 4.5 * sd, `${p}.${lado} ${r.gene}: observado ${obs.toFixed(4)} × chance ${r.chance} (tol ${(4.5 * sd).toFixed(4)})`)
        }
      }
    }
  })

  test('forro do filho sempre vem das 4 opções dos pais; face também', () => {
    for (let i = 0; i < 500; i++) {
      const { filho } = costurarOk({ semente: `op:${i}`, paiA: A, paiB: B })
      for (const p of PARTES_DO_BONECO) {
        const ops = [A.partes[p].face, A.partes[p].forro, B.partes[p].face, B.partes[p].forro]
        assert.ok(ops.includes(filho.partes[p].forro), `forro de ${p} fora das opções`)
        assert.ok(ops.includes(filho.partes[p].face), `face de ${p} fora das opções`)
      }
    }
  })

  test('olharOAvesso devolve os forros; filho nasce em casulo com a ordem de revelação', () => {
    assert.deepEqual(olharOAvesso(A), Object.fromEntries(PARTES_DO_BONECO.map((p) => [p, A.partes[p].forro])))
    const { filho, sorteios } = costurarOk({ semente: 'cas', paiA: A, paiB: B })
    assert.deepEqual(filho.casulo, { ordem: PARAMS_COSTURA.ordemDeRevelacao, aberto: false })
    assert.deepEqual(filho.casulo.ordem.slice().sort(), PARTES_DO_BONECO.slice().sort())
    assert.equal(sorteios.length, 5)
    assert.deepEqual(filho.pais, ['A', 'B'])
    assert.equal(filho.geracao, 1)
    assert.equal(filho.voltasUsadas, 0)
    assert.equal(filho.estado, 'ativo')
    const aberto = abrirCasulo(filho)
    assert.equal(aberto.casulo.aberto, true)
    assert.equal(filho.casulo.aberto, false)
    assert.deepEqual(JSON.parse(JSON.stringify(filho)), filho, 'filho tem de ser JSON puro')
  })
})

describe('costura: recusas, Carretel e custo', () => {
  test('cada recusa tem código e motivo em português', () => {
    const casos = [
      [{ semente: 's', paiA: A, paiB: A }, 'MESMO_BONECO'],
      [{ semente: 's', paiA: A, paiB: { ...B, estado: 'aposentado' } }, 'APOSENTADO'],
      [{ semente: 's', paiA: { ...A, voltasUsadas: PARAMS_COSTURA.carretelVoltas }, paiB: B }, 'CARRETEL_CHEIO'],
      [{ semente: 's', paiA: A, paiB: { ...B, ocupado: true } }, 'OCUPADO'],
      [{ semente: 's', paiA: A, paiB: { ...B, pais: ['A', 'Z'] } }, 'PARENTES'], // B é filho de A
      [{ semente: 's', paiA: { ...A, pais: ['B', 'Z'] }, paiB: B }, 'PARENTES'], // A é filho de B
      [{ semente: 's', paiA: { ...A, pais: ['P', 'Q'] }, paiB: { ...B, pais: ['P', 'Q'] } }, 'PARENTES'], // irmãos
      [{ semente: 's', paiA: { ...A, pais: ['P', 'Q'] }, paiB: { ...B, pais: ['P', 'R'] } }, 'PARENTES'], // meio-irmãos
      [{ semente: '', paiA: A, paiB: B }, 'SEMENTE_INVALIDA'],
      [{ semente: 's', paiA: A, paiB: { ...B, partes: { ...B.partes, tronco: { face: 'cab_botao@comum', forro: 'cab_botao@comum' } } } }, 'BONECO_INVALIDO'],
      [{ semente: 's', paiA: A, paiB: { ...B, partes: { ...B.partes, cabeca: { face: 'cab_botao@divina', forro: 'cab_botao@comum' } } } }, 'BONECO_INVALIDO'],
    ]
    for (const [args, codigo] of casos) {
      const r = costurar(args)
      assert.equal(r.ok, false, `devia recusar ${codigo}`)
      assert.equal(r.codigo, codigo, r.motivo)
      assert.equal(typeof r.motivo, 'string')
      assert.ok(r.motivo.length > 3)
    }
    // primos (avós em comum) podem
    assert.equal(podeCosturar({ ...A, pais: ['P', 'Q'] }, { ...B, pais: ['R', 'S'] }).ok, true)
  })

  test('regra de parentes é configurável (PROVISÓRIA)', () => {
    const antes = { ...PARAMS_COSTURA.parentes }
    try {
      const meio = [{ ...A, pais: ['P', 'Q'] }, { ...B, pais: ['P', 'R'] }]
      PARAMS_COSTURA.parentes.irmaos = 'mesmosPais'
      assert.equal(podeCosturar(...meio).ok, true)
      assert.equal(podeCosturar({ ...A, pais: ['P', 'Q'] }, { ...B, pais: ['Q', 'P'] }).codigo, 'PARENTES')
      PARAMS_COSTURA.parentes.irmaos = false
      PARAMS_COSTURA.parentes.paiEFilho = false
      assert.equal(podeCosturar(A, { ...B, pais: ['A', 'Z'] }).ok, true)
    } finally { Object.assign(PARAMS_COSTURA.parentes, antes) }
  })

  test('Carretel sobe nos dois pais e trava no limite', () => {
    let a = A, b = B
    const custos = []
    for (let i = 0; i < PARAMS_COSTURA.carretelVoltas; i++) {
      const r = costurarOk({ semente: `car:${i}`, paiA: a, paiB: b })
      custos.push(r.custo)
      ;[a, b] = r.pais
      assert.equal(a.voltasUsadas, i + 1)
      assert.equal(b.voltasUsadas, i + 1)
    }
    const r = costurar({ semente: 'car:fim', paiA: a, paiB: b })
    assert.equal(r.ok, false)
    assert.equal(r.codigo, 'CARRETEL_CHEIO')
    // o custo sobe a cada volta usada: base × mult^(voltas A + voltas B)
    const { base, multiplicadorPorVolta } = PARAMS_COSTURA.custo
    custos.forEach((c, i) => assert.equal(c, Math.round(base * multiplicadorPorVolta ** (2 * i) * 100) / 100))
    for (let i = 1; i < custos.length; i++) assert.ok(custos[i] > custos[i - 1])
    assert.equal(custoDaCostura(A, B), base)
  })

  test('entradas não são mudadas', () => {
    const a = JSON.parse(JSON.stringify(A)), b = JSON.parse(JSON.stringify(B))
    const ja = JSON.stringify(a), jb = JSON.stringify(b)
    const r = costurarOk({ semente: 'nm', paiA: a, paiB: b })
    chancesDaCostura(a, b); olharOAvesso(a); paraLuta(a)
    const l = registrarLuta(a, { venceu: true, maiorGolpe: 99 })
    abrirCasulo(r.filho)
    const cheio = { ...a, pontosDeCostura: PARAMS_COSTURA.desgaste.limite }
    const jc = JSON.stringify(cheio)
    aposentar(cheio)
    assert.equal(JSON.stringify(a), ja)
    assert.equal(JSON.stringify(b), jb)
    assert.equal(JSON.stringify(cheio), jc)
    assert.notEqual(l, a)
    assert.equal(a.voltasUsadas, 0)
  })
})

describe('costura: luta, desgaste e aposentadoria', () => {
  test('o filho luta no motor (só as faces) e uma luta entre robôs termina', () => {
    const { filho } = costurarOk({ semente: 'luta', paiA: A, paiB: B })
    const def = paraLuta(filho)
    assert.deepEqual(def.partes, Object.fromEntries(PARTES_DO_BONECO.map((p) => [p, filho.partes[p].face])))
    const rng = criarRng('time')
    const outros = [gerarBonecoInicial(rng, { id: 'o1' }), gerarBonecoInicial(rng, { id: 'o2' }), gerarBonecoInicial(rng, { id: 'o3' }), gerarBonecoInicial(rng, { id: 'o4' })]
    const e = criarLuta({ semente: 'luta-filho', timeA: [def, paraLuta(A), paraLuta(outros[0])], timeB: outros.slice(1).map(paraLuta) })
    e.registro = false
    for (let g = 0; g < 200 && !e.fim; g++) jogarTurno(e, 'planejador')
    assert.ok(e.fim, 'a luta não terminou')
    assert.ok(e.fim.vencedor === 'A' || e.fim.vencedor === 'B')
  })

  test('desgaste não altera atributos; remendo é só visual (0..N)', () => {
    const ficha = montarBoneco(paraLuta(A))
    let b = A
    const { limite, niveisDeRemendo } = PARAMS_COSTURA.desgaste
    assert.equal(nivelDeRemendo(b), 0)
    b = registrarLuta(b, { venceu: true, maiorGolpe: 120 })
    b = registrarLuta(b, { venceu: false, maiorGolpe: 80 })
    assert.equal(b.pontosDeCostura, 2 * PARAMS_COSTURA.desgaste.pontosPorLuta)
    assert.equal(b.lutas, 2)
    assert.equal(b.vitorias, 1)
    assert.equal(b.maiorGolpe, 120)
    assert.deepEqual(montarBoneco(paraLuta(b)), ficha)
    const quase = { ...A, pontosDeCostura: limite - 1 }
    assert.deepEqual(montarBoneco(paraLuta(quase)), ficha)
    assert.equal(nivelDeRemendo(quase), niveisDeRemendo - 1)
    assert.equal(podeAposentar(quase), false)
    const cheio = registrarLuta(quase)
    assert.equal(cheio.pontosDeCostura, limite)
    assert.equal(nivelDeRemendo(cheio), niveisDeRemendo)
    assert.equal(podeAposentar(cheio), true)
    // no limite não luta mais: só se aposenta
    assert.throws(() => paraLuta(cheio), /limite/)
    assert.throws(() => registrarLuta(cheio), /limite/)
    // mas ainda costura (o Carretel é outro limite)
    assert.equal(podeCosturar(cheio, B).ok, true)
  })

  test('aposentadoria devolve Retalhos Honrados e o registro do Mural, e trava costura e luta', () => {
    assert.equal(aposentar(A).codigo, 'AINDA_NAO')
    const cheio = { ...A, pontosDeCostura: PARAMS_COSTURA.desgaste.limite, lutas: 1200, vitorias: 640, maiorGolpe: 187 }
    assert.equal(aposentar({ ...cheio, ocupado: true }).codigo, 'OCUPADO')
    const r = aposentar(cheio)
    assert.equal(r.ok, true)
    assert.equal(r.boneco.estado, 'aposentado')
    // A: faces comum, comum, lendaria, comum, incomum
    const t = PARAMS_COSTURA.retalhosPorRaridade
    assert.equal(r.retalhos, t.comum * 3 + t.lendaria + t.incomum)
    assert.equal(r.mural.lutas, 1200)
    assert.equal(r.mural.vitorias, 640)
    assert.equal(r.mural.maiorGolpe, 187)
    assert.equal(r.mural.id, 'A')
    assert.equal(typeof r.mural.nome, 'string')
    assert.equal(aposentar(r.boneco).codigo, 'APOSENTADO')
    assert.equal(costurar({ semente: 's', paiA: r.boneco, paiB: B }).codigo, 'APOSENTADO')
    assert.throws(() => paraLuta(r.boneco), /aposentado/)
    assert.throws(() => registrarLuta(r.boneco), /aposentado/)
    assert.deepEqual(JSON.parse(JSON.stringify(r)), r)
  })

  test('boneco de origem segue as chances de raridade publicáveis', () => {
    const tab = PARAMS_COSTURA.chancesDeRaridade
    assert.ok(Math.abs(Object.values(tab).reduce((s, v) => s + v, 0) - 1) < 1e-12)
    const rng = criarRng('origem'), N = 4000, cont = {}
    for (let i = 0; i < N; i++) {
      const b = gerarBonecoInicial(rng, { id: `o${i}` })
      for (const p of PARTES_DO_BONECO) for (const g of [b.partes[p].face, b.partes[p].forro]) { const r = g.split('@')[1]; cont[r] = (cont[r] ?? 0) + 1 }
    }
    const tot = N * 10
    for (const [k, p] of Object.entries(tab)) {
      const sd = Math.sqrt((p * (1 - p)) / tot)
      assert.ok(Math.abs((cont[k] ?? 0) / tot - p) <= 4.5 * sd, `${k}: ${(cont[k] / tot).toFixed(4)} × ${p}`)
    }
  })

  test('sem Math.random nem Date.now no fonte', () => {
    const fonte = fs.readFileSync(path.join(RAIZ, 'shared/costura.js'), 'utf8')
    assert.ok(!/Math\.random/.test(fonte))
    assert.ok(!/Date\.now|new Date/.test(fonte))
  })
})
