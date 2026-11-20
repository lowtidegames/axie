// Testes do escolhedor da luta automática (shared/tatica.js; a cópia de public/piloto/tatica.js saiu na tarefa 42). Puro: sem tela.
// Rodar: npm test  (ou: node --test tests/servidor/tatica.test.js)
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { aplicarNoLugar, comandosValidos, criarLuta, validar } from '../../shared/batalha.js'
import { BONECOS_PRONTOS, CARTAS } from '../../shared/config.js'
import { criarRng } from '../../shared/rng.js'
import { SEGURANCA, TATICAS, cartasDoMonstro, classeDaCarta, escolher, lutaAutomatica, ordemPadrao, ordemRuim } from '../../shared/tatica.js'

const IDS = Object.keys(BONECOS_PRONTOS)
const trio = (rng) => { const ids = IDS.slice(), t = []; for (let i = 0; i < 3; i++) t.push(ids.splice(rng.inteiro(ids.length), 1)[0]); return t }
const planoDe = (e, t, tatica, ordem = ordemPadrao, off = () => false) => {
  const o = {}
  e.times[t].lugares.forEach((id, i) => { o[id] = ordem(cartasDoMonstro(e, id), i).filter((c) => !off(id, c)) })
  return { tatica, ordem: o }
}

/** Roda a luta inteira conferindo cada comando antes de aplicar. Devolve o estado final e os comandos. */
function rodar(semente, tA, tB, mkA, mkB, conferir = () => {}) {
  const e = criarLuta({ semente, timeA: tA, timeB: tB })
  const planos = { A: mkA(e), B: mkB(e) }
  for (let g = 0; g < 3000 && !e.fim; g++) {
    const cmd = escolher(e, planos[e.vez])
    assert.ok(cmd, 'devolve um comando')
    assert.equal(validar(e, cmd).ok, true, 'comando válido: ' + JSON.stringify(cmd))
    assert.ok(comandosValidos(e).some((c) => c.tipo === cmd.tipo && c.carta === cmd.carta && (c.alvo ?? null) === (cmd.alvo ?? null)), 'está na lista do motor')
    conferir(e, cmd, planos[e.vez])
    assert.equal(aplicarNoLugar(e, cmd).ok, true)
  }
  return e
}

describe('escolhedor do piloto', () => {
  test('sempre devolve comando válido e toda luta termina (300 lutas, todas as táticas)', () => {
    const rng = criarRng('tatica-teste')
    for (let i = 0; i < 300; i++) {
      const ta = TATICAS[i % 3], tb = TATICAS[(i + 1) % 3]
      const e = rodar(`t${i}`, trio(rng), trio(rng), (s) => planoDe(s, 'A', ta), (s) => planoDe(s, 'B', tb, i % 2 ? ordemRuim : ordemPadrao))
      assert.ok(e.fim, 'a luta terminou')
    }
  })

  test('respeita Off: carta desligada nunca é jogada', () => {
    const rng = criarRng('tatica-off')
    for (let i = 0; i < 120; i++) {
      const off = (id, c) => CARTAS[c].parte === (['cabeca', 'bracos', 'pernas'][i % 3])
      rodar(`off${i}`, trio(rng), trio(rng), (s) => planoDe(s, 'A', 'rush', ordemPadrao, off), (s) => planoDe(s, 'B', 'focus'), (e, cmd) => {
        if (cmd.tipo === 'jogar' && cmd.time === 'A') {
          const inst = e.cartas[cmd.carta]
          assert.equal(off(inst.dono, inst.carta), false, `jogou carta Off: ${inst.carta}`)
        }
      })
    }
  })

  test('todas Off: o time só passa ou descarta fiapo', () => {
    const e = rodar('tudo-off', ['embolado', 'mordedor', 'cascudo'], ['rasgao', 'assombrado', 'desfiado'], (s) => planoDe(s, 'A', 'rush', ordemPadrao, () => true), (s) => planoDe(s, 'B', 'rush'), (s, cmd) => {
      if (cmd.time === 'A') assert.ok(cmd.tipo === 'passar' || cmd.tipo === 'fiapo', 'só passa: ' + cmd.tipo)
    })
    assert.equal(e.fim.vencedor, 'B')
  })

  test('regras de segurança: nunca troca sozinho, autodano nunca leva a 0, Current Step só com a Frente abaixo do limite', () => {
    const rng = criarRng('tatica-seg')
    for (let i = 0; i < 300; i++) {
      rodar(`seg${i}`, trio(rng), trio(rng), (s) => planoDe(s, 'A', TATICAS[i % 3]), (s) => planoDe(s, 'B', TATICAS[(i + 2) % 3]), (e, cmd) => {
        assert.notEqual(cmd.tipo, 'trocar', 'nunca usa trocar')
        if (cmd.tipo !== 'jogar') return
        const inst = e.cartas[cmd.carta], def = CARTAS[inst.carta], u = e.bonecos[inst.dono]
        for (const ef of def.efeitos) {
          if (ef.tipo === 'autoDano') assert.ok(u.vida > ef.valor, `autodano levaria a 0 (${inst.carta}, vida ${u.vida})`)
          if (ef.tipo === 'trocaComAlvo') {
            const f = e.times[cmd.time].lugares.map((id) => e.bonecos[id]).find((b) => b.estado === 'vivo')
            assert.ok(f && f.vida / f.vidaMax < SEGURANCA.trocaSeFrenteAbaixoDe, 'Current Step com a Frente forte')
          }
        }
      })
    }
  })

  test('Rush mira a Frente; Focus mira o inimigo com menos % de vida (cartas com Reach)', () => {
    const rng = criarRng('tatica-alvo')
    let vistos = 0
    for (let i = 0; i < 150; i++) {
      const tat = i % 2 ? 'focus' : 'rush'
      rodar(`alvo${i}`, trio(rng), trio(rng), (s) => planoDe(s, 'A', tat), (s) => planoDe(s, 'B', tat), (e, cmd) => {
        if (cmd.tipo !== 'jogar' || CARTAS[e.cartas[cmd.carta].carta].alvo !== 'inimigo') return
        const rival = e.times[cmd.time === 'A' ? 'B' : 'A'].lugares.map((id) => e.bonecos[id]).filter((b) => b.estado === 'vivo')
        if (tat === 'rush') assert.equal(cmd.alvo, rival[0].id)
        else assert.equal(e.bonecos[cmd.alvo].vida / e.bonecos[cmd.alvo].vidaMax, Math.min(...rival.map((b) => b.vida / b.vidaMax)))
        vistos++
      })
    }
    assert.ok(vistos > 50, 'houve jogadas com Reach para conferir')
  })

  test('ordem de fábrica: Front ataca primeiro, Back defende primeiro; ordem ruim é o contrário', () => {
    const cartas = ['feltro_pesado', 'ponto_cruz', 'remendo_rapido'] // Breezle
    assert.equal(classeDaCarta(ordemPadrao(cartas, 0)[0]), 'ataque')
    assert.equal(classeDaCarta(ordemPadrao(cartas, 2)[0]), 'defesa')
    assert.deepEqual(ordemRuim(cartas, 2), ordemPadrao(cartas, 2).reverse())
  })

  test('luta inteira: mesma semente e mesmos planos dão o mesmo resultado', () => {
    const mk = () => {
      const e = criarLuta({ semente: 'x', timeA: ['embolado', 'mordedor', 'cascudo'], timeB: ['rasgao', 'assombrado', 'desfiado'] })
      return lutaAutomatica({ semente: 'mesma', timeA: ['embolado', 'mordedor', 'cascudo'], timeB: ['rasgao', 'assombrado', 'desfiado'], ordensA: planoDe(e, 'A', 'guard'), ordensB: planoDe(e, 'B', 'rush') })
    }
    const a = mk(), b = mk()
    assert.deepEqual(a.resultado, b.resultado)
    assert.deepEqual(a.comandos, b.comandos)
    assert.ok(a.comandos.length > 10)
  })
})
