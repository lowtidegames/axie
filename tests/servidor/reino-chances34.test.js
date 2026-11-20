// R34 — a chance mostrada é a da MÃO: a mão não repete carta (e pode trazer a carta que sobe), então a chance de cada raridade na mão
// não é a de uma carta sozinha. chancesDaMao calcula EXATO pelo mesmo sorteio; aqui 30.000 mãos do motor por álbum batem com ela.
// Rodar: node --test tests/servidor/reino-chances34.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ALBUM, CARTAS, RARIDADES } from '../../shared/reino/config.js'
import { chancesDaMao, criarPartida, sortearMaoDaSemente, visao } from '../../shared/reino/partida.js'

const TODAS = Object.keys(CARTAS)
const tropas = (l) => l.filter((id) => CARTAS[id].tipo === 'tropa' && CARTAS[id].dano > 0)
const N = 30000

/** Frequência medida (%) de cada raridade entre todas as cartas das mãos. */
function medir(nome, sortear) {
  const conta = Object.fromEntries(RARIDADES.map((r) => [r.id, 0]))
  let total = 0
  for (let i = 0; i < N; i++) for (const id of sortear(`r34:${nome}:${i}`)) { conta[CARTAS[id].raridade]++; total++ }
  return Object.fromEntries(RARIDADES.map((r) => [r.id, (100 * conta[r.id]) / total]))
}
function bate(nome, ch, obs) {
  for (const r of ch) {
    assert.ok(Math.abs(obs[r.id] - r.exata) <= 1, `${nome} ${r.nome}: medido ${obs[r.id].toFixed(2)}% × número ${r.exata.toFixed(2)}%`)
    assert.ok(Math.abs(r.chance - r.exata) < 1, `${nome} ${r.nome}: mostrado ${r.chance} longe do exato ${r.exata}`)
    if (r.exata === 0) assert.equal(obs[r.id], 0, `${nome} ${r.nome}: 0% e saiu`)
  }
  assert.equal(ch.reduce((a, r) => a + r.chance, 0), 100, `${nome}: os números mostrados somam 100`)
}

describe('R34: chances da mão = frequência medida (30.000 mãos do motor por álbum, até 1 ponto)', () => {
  const casos = {
    inicial: [ALBUM.inicial],
    inicialRodada1: [tropas(ALBUM.inicial)],
    comuns: [TODAS.filter((id) => CARTAS[id].raridade === 'C')],
    completo: [TODAS],
    semLendaria: [TODAS.filter((id) => CARTAS[id].raridade !== 'L')],
    tresCartas: [['T01', 'T02', 'T04']],
    umaCarta: [['M07']],
    comLevelUp: [ALBUM.inicial, ['T02', 'B01', 'M04']],
    completoComLevelUp: [TODAS, ['M08']],
  }
  for (const [nome, [cartas, sobe = []]] of Object.entries(casos)) {
    test(`álbum ${nome}`, () => bate(nome, chancesDaMao({ cartas, sobe }), medir(nome, (sm) => sortearMaoDaSemente(sm, cartas, sobe))))
  }
  test('a mão de verdade da partida (rodada 1, álbum inicial): visao.chances = o que as mãos dão (54/46, não 50/50)', () => {
    const ch = visao(criarPartida({ semente: 'r34:v' })).chances
    assert.deepEqual(ch.map((r) => [r.id, r.chance]), [['C', 54], ['U', 46], ['R', 0], ['E', 0], ['L', 0]])
    const obs = medir('partida', (sm) => criarPartida({ semente: sm }).oferta)
    bate('partida', ch, obs)
  })
  test('maior resto: soma 100 e raridade sem carta fica 0; conjunto vazio: tudo 0', () => {
    for (const c of [TODAS, ['T01'], ['T03', 'M08'], ALBUM.inicial]) {
      const ch = chancesDaMao({ cartas: c })
      assert.equal(ch.reduce((a, r) => a + r.chance, 0), 100)
      for (const r of ch) if (!c.some((id) => CARTAS[id].raridade === r.id)) assert.equal(r.chance, 0)
    }
    assert.deepEqual(chancesDaMao({ cartas: [] }).map((r) => r.chance), [0, 0, 0, 0, 0])
  })
})
