// R36 — o medidor de profundidade (tools/medir-reino.mjs): rápido, determinístico e sem mexer no config.
// Rodar: node --test tests/servidor/reino-medidas36.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ALBUM, CARTAS, CHEFES, CONQUISTAS, PARTIDA } from '../../shared/reino/config.js'
import { jogarPartida } from '../../shared/reino/robos.js'
import { criarRng } from '../../shared/rng.js'
import { ROBOS36, VARIANTES, classificar, emParalelo, jogar, liberadasPorRodadas, medirA, medirB, rankingSemanal, RODADAS_ALBUM_CHEIO, segundosDeTela } from '../../tools/medir-reino.mjs'
import { jogarComConquistas, maiorVazio, medirE, paresJuntos } from '../../tools/medir-reino.mjs'
import { LIMIARES_V, maoRuim, vitoriaNoLimiar } from '../../tools/medir-reino.mjs'
import { IDS, conquistasDoPasso } from '../../shared/reino/conquistas.js'

describe('R36 — medidor de profundidade', () => {
  test('o planejador com memória do medidor joga comando por comando igual ao de shared/reino/robos.js', () => {
    for (const semente of ['m36:a', 'm36:b']) {
      const rng = criarRng('x')
      const orig = jogarPartida({ robo: 'planejador', semente, cartasLiberadas: Object.keys(CARTAS), inteiro: (n) => rng.inteiro(n) })
      const cmds = []
      const e = jogar({ robo: 'planejador', semente, aoPasso: (e0, c) => cmds.push(c) })
      assert.deepEqual(cmds, orig.comandos)
      assert.equal(e.rodada, orig.estado.rodada)
    }
  })

  test('os robôs novos só mandam comandos válidos e o ganancioso puro nunca conserta nem sorteia', () => {
    for (const robo of ROBOS36.filter((r) => r !== 'planejador')) {
      const tipos = new Set()
      const e = jogar({ robo, semente: `m36:${robo}`, liberadas: ALBUM.inicial, aoPasso: (e0, c) => tipos.add(c.tipo) })
      assert.equal(e.fase, 'fim')
      if (robo === 'ganancioso-puro') { assert.ok(!tipos.has('consertar')); assert.ok(!tipos.has('sortear')) }
    }
  })

  test('mesma semente → mesmos números, com 1 e com 2 trabalhos (A)', async () => {
    const um = await medirA({ n: 4, semente: 'm36', robos: ['novato-atento', 'aleatorio'], trabalhos: 1 })
    const dois = await medirA({ n: 4, semente: 'm36', robos: ['novato-atento', 'aleatorio'], trabalhos: 2 })
    assert.deepEqual(um.res, dois.res)
    assert.deepEqual(um.cru, dois.cru)
  })

  test('B dá a mesma resposta com a mesma semente e classifica a oferta', async () => {
    const a = await medirB({ n: 1, K: 1, semente: 'm36b', trabalhos: 1 })
    const b = await medirB({ n: 1, K: 1, semente: 'm36b', trabalhos: 1 })
    assert.deepEqual(a.cru, b.cru)
    assert.ok(a.cru.length === 1 && a.cru[0].av.length >= 2)
  })

  test('variante só vale dentro da tarefa: o config volta igual', async () => {
    const antes = JSON.stringify({ CHEFES, CARTAS, PARTIDA })
    await medirA({ n: 1, semente: 'm36v', robos: ['novato-atento'], variante: 'pacote', trabalhos: 1 })
    await medirA({ n: 1, semente: 'm36v', robos: ['novato-atento'], variante: 'cartas', trabalhos: 1 })
    assert.equal(JSON.stringify({ CHEFES, CARTAS, PARTIDA }), antes)
    assert.ok(Object.keys(VARIANTES).includes('base'))
  })

  test('álbum, tempo de tela, classificação e ranking seguem as regras escritas', async () => {
    assert.deepEqual(liberadasPorRodadas(0), ALBUM.inicial)
    assert.equal(liberadasPorRodadas(ALBUM.primeira).length, ALBUM.inicial.length + 1)
    assert.equal(liberadasPorRodadas(RODADAS_ALBUM_CHEIO).length, 30)
    assert.equal(liberadasPorRodadas(RODADAS_ALBUM_CHEIO - 1).length, 29)
    assert.equal(segundosDeTela({ rodada: 8, segundos: 10, vitoria: false, chefe: null }, 1), 1.7 + 10 + 1)
    assert.equal(segundosDeTela({ rodada: 8, segundos: 10, vitoria: false, chefe: null }, 2), 0.8 + 5 + 1)
    assert.equal(segundosDeTela({ rodada: 1, segundos: 2.8, vitoria: false, chefe: null }, 1), 1.7 + 7 + 1) // ritmo 0,4 no começo
    const oferta = (vals) => ({ rodada: 6, av: vals.map(([tipo, media, carta]) => ({ tipo, media, carta: carta || null })) })
    assert.ok(classificar(oferta([['tropa', 15, 'T01'], ['magia', 14, 'M01'], ['guardar', 10]])).interessante)
    assert.ok(!classificar(oferta([['tropa', 15, 'T01'], ['tropa', 14.5, 'T04'], ['guardar', 10]])).interessante)
    assert.ok(classificar(oferta([['tropa', 15, 'T01'], ['guardar', 10]])).obvia)
    assert.ok(classificar(oferta([['tropa', 15, 'T01'], ['guardar', 14.9]])).nula)
    assert.equal(rankingSemanal([100], [200], { semanas: 50 }).passa, 0)
    assert.deepEqual(rankingSemanal([100, 900], [500], { semanas: 200, semente: 's' }), rankingSemanal([100, 900], [500], { semanas: 200, semente: 's' }))
    assert.equal((await emParalelo([], 2)).length, 0)
  })
})

describe('R40 — medida E com as 30 conquistas da regra única (shared/reino/conquistas.js)', () => {
  test('sem eventos (rápido) dá as MESMAS conquistas, na mesma ordem, que a partida jogada com eventos o tempo todo', () => {
    for (const robo of ['novato-atento', 'planejador', 'aleatorio']) {
      const rapido = { tem: new Set(), conta: { rodadas: 0 }, ordem: [] }
      const cheio = { tem: new Set(), conta: { rodadas: 0 }, ordem: [] }
      for (let p = 1; p <= 3; p++) {
        for (const [x, eventos] of [[rapido, false], [cheio, true]]) {
          const e = jogarComConquistas({ robo, semente: `m40:${robo}:${p}`, liberadas: liberadasPorRodadas(x.conta.rodadas), tem: x.tem, conta: x.conta, eventos, aoGanhar: (id) => x.ordem.push(`${p}:${id}`) })
          assert.equal(e.fase, 'fim')
        }
        assert.deepEqual(rapido.ordem, cheio.ordem)
        assert.equal(rapido.conta.rodadas, cheio.conta.rodadas)
      }
      assert.ok(rapido.ordem.length > 0 && rapido.ordem.every((x) => IDS.includes(x.split(':')[1])))
      assert.ok(rapido.tem.has('supper'))
    }
  })

  test('rodadas da conta = soma das vencidas; a conquista do passo é a do servidor (rodadasAntes e comandos da partida)', () => {
    const tem = new Set(), conta = { rodadas: 0 }
    let soma = 0
    for (let p = 1; p <= 2; p++) soma += jogarComConquistas({ robo: 'novato-atento', semente: `m40s:${p}`, liberadas: liberadasPorRodadas(conta.rodadas), tem, conta }).vencidas
    assert.equal(conta.rodadas, soma)
    // conferência independente: a mesma 1ª partida, com conquistasDoPasso chamado à mão
    const tem2 = new Set(), cmds = []
    let rod = 0
    jogar({ robo: 'novato-atento', semente: 'm40s:1', liberadas: liberadasPorRodadas(0), eventos: true, aoPasso: (e0, c, r) => {
      cmds.push(c)
      for (const id of conquistasDoPasso({ antes: e0, depois: r.estado, eventos: r.eventos, comandos: cmds, rodadasAntes: rod, tem: tem2 })) tem2.add(id)
      rod += r.eventos.filter((ev) => ev.tipo === 'batalha' && ev.vitoria).length
    } })
    const tem1 = new Set()
    jogarComConquistas({ robo: 'novato-atento', semente: 'm40s:1', liberadas: liberadasPorRodadas(0), tem: tem1, conta: { rodadas: 0 } })
    assert.deepEqual([...tem1].sort(), [...tem2].sort())
  })

  test('maior vazio e pares na mesma partida seguem a regra escrita', () => {
    assert.deepEqual(maiorVazio({ a: 1, b: 2, c: 7 }, 10, 5), { tam: 4, de: 3 }) // ainda falta: conta até a partida 10 (8..10 = 3 < 4)
    assert.deepEqual(maiorVazio({ a: 1, b: 2, c: 4 }, 10, 3), { tam: 1, de: 3 }) // todas feitas: para na última
    assert.deepEqual(maiorVazio({}, 5, 3), { tam: 5, de: 1 })
    const jogs = [{ conq: { supper: 3, road: 3 } }, { conq: { supper: 5, road: 5 } }, { conq: { supper: 1, road: 1 } }, { conq: { supper: 2 } }]
    assert.deepEqual(paresJuntos(jogs, 60).map((x) => [x.par, x.contas]), [['road+supper', 3]]) // a conta com as duas na 1ª fica fora
    assert.equal(paresJuntos(jogs, 90).length, 0) // 2 de 3 contas fora da 1ª = 66,7%
  })

  test('variantes das conquistas só valem dentro da tarefa: CONQUISTAS volta igual', async () => {
    const antes = JSON.stringify(CONQUISTAS)
    for (const variante of ['tally300', 'bis22', 'bis21', 'bolsos4']) await medirE({ n: 1, nBom: 0, partidas: 1, aleatorio: false, semente: 'm40v', variante, trabalhos: 1 })
    assert.equal(JSON.stringify(CONQUISTAS), antes)
  })

  test('V: a rodada da vitória tirada das vencidas é a MESMA da injeção (vitNN) e o Encore! é vencidas ≥ B (bisNN)', async () => {
    const base = await medirE({ n: 2, nBom: 1, partidas: 3, aleatorio: false, intermediario: true, semente: 'm40w', trabalhos: 1 })
    assert.ok(base.cru.planejador[0].vencidas.some((x) => x >= 12), 'a semente chega à rodada 12 (o teste compara algo)')
    for (const [variante, R] of [['vit12', 12], ['vit15', 15], ['vit16', 16], ['vit18', 18]]) {
      const v = await medirE({ n: 2, nBom: 1, partidas: 3, aleatorio: false, intermediario: true, semente: 'm40w', variante, trabalhos: 1 })
      for (const robo of ['novato-atento', 'intermediario', 'planejador']) {
        assert.deepEqual(v.cru[robo].map((j) => j.vencidas), base.cru[robo].map((j) => j.vencidas)) // a vitória não muda o jogo
        assert.deepEqual(v.cru[robo].map((j) => j.venceu), base.cru[robo].map((j) => j.vencidas.flatMap((x, i) => (x >= R ? [i + 1] : []))))
      }
    }
    for (const [variante, B] of [['bis21', 21], ['bis22', 22]]) {
      const v = await medirE({ n: 2, nBom: 1, partidas: 3, aleatorio: false, intermediario: true, semente: 'm40w', variante, trabalhos: 1 })
      for (const robo of ['novato-atento', 'intermediario', 'planejador']) for (const j of v.cru[robo]) {
        const p = j.vencidas.findIndex((x) => x >= B)
        assert.equal(j.conq.encore ?? 0, p < 0 ? 0 : p + 1)
      }
    }
    // conta à mão
    const jogs = [{ vencidas: [3, 12, 20] }, { vencidas: [11, 11, 11] }, { vencidas: [12, 0, 0] }]
    const doisTercos = (100 * 2) / 3
    assert.deepEqual(vitoriaNoLimiar(jogs, 12), { partidas: (100 * 3) / 9, primeira: 2, primeiraP90: Infinity, ate10: doisTercos, ate20: doisTercos, ate30: doisTercos, ate60: doisTercos })
    assert.deepEqual(LIMIARES_V, [12, 15, 16, 18, 20])
  })

  test('intermediário: só comandos válidos; sorteia quando a mão é ruim; mão ruim segue a regra escrita', () => {
    const tipos = { sortear: 0, consertar: 0 }
    for (let s = 0; s < 6; s++) jogar({ robo: 'intermediario', semente: `m40i:${s}`, liberadas: ALBUM.inicial, aoPasso: (e0, c) => { if (c.tipo in tipos) tipos[c.tipo]++ } })
    assert.ok(tipos.sortear > 0, 'sorteia quando a mão é ruim')
    const T = (...cs) => cs.map((c) => (c ? { carta: c, nivel: 1 } : null))
    const fam = (f) => Object.keys(CARTAS).filter((id) => CARTAS[id].familia === f)
    const [f1, f2] = [...new Set(Object.values(CARTAS).map((c) => c.familia))]
    const a = fam(f1), b = fam(f2)
    assert.equal(maoRuim({ terrenos: T(a[0], null, null, null, null, null), oferta: [{ carta: b[0] }] }), false) // começo: qualquer carta serve
    assert.equal(maoRuim({ terrenos: T(a[0], a[1], a[0], null, null, null), oferta: [{ carta: b[0] }, { carta: b[1] }] }), true)
    assert.equal(maoRuim({ terrenos: T(a[0], a[1], a[0], null, null, null), oferta: [{ carta: b[0] }, { carta: a[1] }] }), false) // família que já tem
    assert.equal(maoRuim({ terrenos: T(a[0], a[1], a[0], b[0], b[1], b[0]), oferta: [{ carta: a[0], levelUp: true }] }), false) // sobe
    assert.equal(maoRuim({ terrenos: T(a[0], a[1], a[0], b[0], b[1], b[0]), oferta: [{ carta: a[1] }] }), true) // cheio, nada sobe
  })

  test('E: mesma semente → mesmos números com 1 e 2 trabalhos; as 30 conquistas e a vitória no resumo', async () => {
    const um = await medirE({ n: 2, nBom: 1, partidas: 2, semente: 'm40e', trabalhos: 1 })
    const dois = await medirE({ n: 2, nBom: 1, partidas: 2, semente: 'm40e', trabalhos: 2 })
    assert.deepEqual(um.res, dois.res)
    assert.deepEqual(um.cru, dois.cru)
    for (const robo of ['novato-atento', 'planejador', 'aleatorio']) {
      assert.deepEqual(Object.keys(um.res[robo].porConquista), IDS)
      assert.equal(IDS.length, 30)
      for (const j of um.cru[robo]) for (const p of j.venceu) assert.ok(p >= 1 && p <= 2)
      assert.ok(um.res[robo].vitoria >= 0 && um.res[robo].vitoria <= 100)
    }
  })
})
