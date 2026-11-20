// R31 — chance verdadeira na tela: o sorteio de raridade e a tabela de chances mostrada vêm do MESMO código do motor.
// Rodar: node --test tests/servidor/reino-chances31.test.js
// O arquivo reino-chances31-antes.json foi gerado com o motor do origin/main (antes do R31) por:
//   GERAR_ANTES=1 node --test tests/servidor/reino-chances31.test.js
// R37 (20/11): regravado porque mudaram números de LUTA do config (1º chefe 320 e 4 cartas); o motor e o sorteio não
//   mudaram (só shared/reino/config.js no diff). Pontos, rodada final e o caminho do robô dependem da luta; o sorteio da mesma
//   situação é o mesmo. Com o config antigo, o arquivo antigo passa (main verde).
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALBUM, CARTAS, PARTIDA, RARIDADES, RELIQUIAS } from '../../shared/reino/config.js'
import { aplicar, chancesDaMao, chancesReais, criarPartida, reproduzir, sortearCartaDaSemente, visao } from '../../shared/reino/partida.js'
import { escolher } from '../../shared/reino/robos.js'
import { criarRng } from '../../shared/rng.js'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const ANTES = path.join(AQUI, 'reino-chances31-antes.json')
const TODAS = Object.keys(CARTAS)
const ALBUNS = {
  inicial: ALBUM.inicial,
  comuns: TODAS.filter((id) => CARTAS[id].raridade === 'C'),
  completo: TODAS,
  semLendaria: TODAS.filter((id) => CARTAS[id].raridade !== 'L'),
}
const NOMES = Object.keys(ALBUNS)

/** Uma partida por semente: robô aleatório (sorteia muito) ou ganancioso (vai longe); pegada = cada mão, espólio e horda. */
function pegada(i) {
  const album = NOMES[i % NOMES.length], robo = i % 2 ? 'ganancioso' : 'aleatorio'
  const rng = criarRng(`r31:robo:${i}`)
  let e = criarPartida({ semente: `r31:${i}`, cartasLiberadas: ALBUNS[album] })
  const passos = [], comandos = []
  const foto = () => passos.push([e.rodada, e.oferta.join(','), JSON.stringify(e.espolios), e.horda.ordem.join(',')].join('|'))
  foto()
  for (let g = 0; g < 400 && e.fase !== 'fim'; g++) {
    const c = escolher(robo, e, (n) => rng.inteiro(n))
    const r = aplicar(e, c, { eventos: false })
    assert.equal(r.ok, true)
    e = r.estado; comandos.push(c); foto()
  }
  const h = crypto.createHash('sha256').update(passos.join('\n')).digest('hex').slice(0, 24)
  const rep = reproduzir({ semente: `r31:${i}`, cartasLiberadas: ALBUNS[album], comandos })
  return { album, robo, maos: passos.length, pontos: rep.resultado.pontos, rodada: rep.resultado.rodada, h }
}

if (process.env.GERAR_ANTES) {
  const lista = []
  for (let i = 0; i < 200; i++) lista.push(pegada(i))
  fs.mkdirSync(path.dirname(ANTES), { recursive: true })
  fs.writeFileSync(ANTES, '[\n' + lista.map((x) => JSON.stringify(x)).join(',\n') + '\n]\n')
}

describe('R31: o sorteio não mudou', () => {
  test('200 sementes, antes (origin/main) × depois: mão por mão, espólio e horda idênticos; reproduzir dá o mesmo resultado', () => {
    const antes = JSON.parse(fs.readFileSync(ANTES, 'utf8'))
    assert.equal(antes.length, 200)
    for (let i = 0; i < 200; i++) assert.deepEqual(pegada(i), antes[i], `semente ${i}`)
  })
})

// ---------------------------------------------------------------- chancesReais = o que o sorteio faz
const mapa = (l) => Object.fromEntries(l.map((r) => [r.id, r.chance]))
const soma = (l) => l.reduce((s, r) => s + r.chance, 0)
const TABELA = Object.fromEntries(RARIDADES.map((r) => [r.id, r.chance]))

describe('R31: chancesReais', () => {
  test('álbum inicial: Common 50 · Uncommon 50 · o resto 0 (a queda da raridade que falta)', () => {
    assert.deepEqual(mapa(chancesReais(ALBUM.inicial)), { C: 50, U: 50, R: 0, E: 0, L: 0 })
  })
  test('álbum completo = a tabela do config; sem lendária: a lendária cai para a épica', () => {
    assert.deepEqual(mapa(chancesReais(TODAS)), TABELA)
    assert.deepEqual(mapa(chancesReais(ALBUNS.semLendaria)), { C: 50, U: 30, R: 14, E: 6, L: 0 })
  })
  test('só comuns: 100% Common; só uma rara: 100% Rare (sem nada embaixo, sobe); Common + Rare: 80 / 20', () => {
    assert.deepEqual(mapa(chancesReais(ALBUNS.comuns)), { C: 100, U: 0, R: 0, E: 0, L: 0 })
    assert.deepEqual(mapa(chancesReais(['T03'])), { C: 0, U: 0, R: 100, E: 0, L: 0 })
    assert.deepEqual(mapa(chancesReais(['T01', 'T03'])), { C: 80, U: 0, R: 20, E: 0, L: 0 })
  })
  test('soma 100 em qualquer conjunto; vazio: tudo 0; nomes e ordem das raridades do config', () => {
    const rng = criarRng('r31:somas')
    for (let k = 0; k < 300; k++) {
      const c = TODAS.filter(() => rng.inteiro(3) === 0)
      const ch = chancesReais(c)
      assert.equal(soma(ch), c.length ? 100 : 0)
      assert.deepEqual(ch.map((r) => [r.id, r.nome]), RARIDADES.map((r) => [r.id, r.nome]))
    }
    assert.throws(() => chancesReais(null))
  })
})

describe('R31: 20.000 sorteios do motor batem com chancesReais (até 1,5 ponto)', () => {
  const casos = { ...ALBUNS, umaCarta: ['M07'] }
  for (const [nome, cartas] of Object.entries(casos)) {
    test(`álbum ${nome}`, () => {
      const N = 20000, ch = chancesReais(cartas), conta = Object.fromEntries(RARIDADES.map((r) => [r.id, 0]))
      for (let i = 0; i < N; i++) conta[CARTAS[sortearCartaDaSemente(`r31:${nome}:${i}`, cartas)].raridade]++
      for (const r of ch) {
        const obs = (100 * conta[r.id]) / N
        assert.ok(Math.abs(obs - r.chance) <= 1.5, `${nome} ${r.nome}: sorteio ${obs.toFixed(2)}% × tela ${r.chance}%`)
        if (r.chance === 0) assert.equal(conta[r.id], 0, `${nome} ${r.nome}: chance 0 e saiu`)
      }
    })
  }
  test('o espólio de carta da partida de verdade (5.000 partidas do álbum inicial) também bate', () => {
    const N = 5000, conta = { C: 0, U: 0 }
    for (let i = 0; i < N; i++) conta[CARTAS[criarPartida({ semente: `r31:esp:${i}` }).espolios[0].carta].raridade]++
    assert.ok(Math.abs((100 * conta.C) / N - 50) <= 2.5 && conta.C + conta.U === N, JSON.stringify(conta))
  })
})

describe('R31: a visão leva as chances da partida', () => {
  // R34 (a regra mudou: achado da segurança): a visão traz a chance da MÃO (sem repetir carta), não a de uma carta sozinha.
  // Rodada 1 do álbum inicial: 3 Tropas comuns e 2 incomuns, sem repetir → Common 54 · Uncommon 46 (antes dizia 50/50).
  test('álbum inicial: rodada 1 = a chance da mão de Tropas sem repetir (54/46); relíquia da bolsa = a do config', () => {
    const v = visao(criarPartida({ semente: 'r31:v1' }))
    assert.deepEqual(mapa(v.chances), { C: 54, U: 46, R: 0, E: 0, L: 0 })
    assert.equal(v.chanceReliquia, PARTIDA.bolsa.chanceReliquia)
  })
  test('álbum completo: rodada 1 só Tropas que lutam (sem lendária); da rodada 2 em diante, o álbum inteiro com a carta que sobe', () => {
    let e = criarPartida({ semente: 'r31:v2', cartasLiberadas: TODAS })
    assert.deepEqual(mapa(visao(e).chances), mapa(chancesDaMao({ cartas: TODAS.filter((id) => CARTAS[id].tipo === 'tropa' && CARTAS[id].dano > 0) })))
    assert.equal(visao(e).chances.find((r) => r.id === 'L').chance, 0)
    const rng = criarRng('r31:v2robo')
    while (e.rodada === 1 && e.fase !== 'fim') e = aplicar(e, escolher('ganancioso', e, (n) => rng.inteiro(n)), { eventos: false }).estado
    assert.equal(e.rodada, 2)
    const sobe = [...new Set(e.terrenos.filter((t) => t && t.nivel < PARTIDA.nivelMax).map((t) => t.carta))]
    assert.ok(sobe.length > 0)
    assert.deepEqual(mapa(visao(e).chances), mapa(chancesDaMao({ cartas: TODAS, sobe })))
    assert.equal(visao(e).chances.reduce((a, r) => a + r.chance, 0), 100)
  })
  test('rodada do chefe: a bolsa não sorteia relíquia (chanceReliquia null); sem relíquia livre: 0', () => {
    const e = criarPartida({ semente: 'r31:v3' })
    const chefe = structuredClone(e); chefe.horda.chefe = 'x'
    assert.equal(visao(chefe).chanceReliquia, null)
    const cheio = structuredClone(e); cheio.reliquias = Object.keys(RELIQUIAS)
    assert.equal(visao(cheio).chanceReliquia, 0)
  })
})
