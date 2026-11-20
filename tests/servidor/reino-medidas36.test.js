// R36 — o medidor de profundidade (tools/medir-reino.mjs): rápido, determinístico e sem mexer no config.
// Rodar: node --test tests/servidor/reino-medidas36.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ALBUM, CARTAS, CHEFES, PARTIDA } from '../../shared/reino/config.js'
import { jogarPartida } from '../../shared/reino/robos.js'
import { criarRng } from '../../shared/rng.js'
import { ROBOS36, VARIANTES, classificar, emParalelo, jogar, liberadasPorRodadas, medirA, medirB, rankingSemanal, RODADAS_ALBUM_CHEIO, segundosDeTela } from '../../tools/medir-reino.mjs'

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
