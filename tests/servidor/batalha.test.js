// Testes do motor de batalha do Frayz (shared/batalha.js), do gerador com semente e dos robôs.
// Rodar: npm test  (ou: node --test tests/servidor/batalha.test.js)
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { aplicar, bateForte, comandosValidos, criarLuta, montarBoneco, reproduzir, resultado, textoDaCarta, textoDoBordado, visaoDoTime } from '../../shared/batalha.js'
import { BONECOS_PRONTOS, BORDADOS, CARTAS, PARTES, RARIDADES, REGRAS, TIPOS } from '../../shared/config.js'
import { criarRng, estadoDaSemente, passo } from '../../shared/rng.js'
import { jogarTurno, planejarTurno } from '../../shared/robos.js'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const IDS = Object.keys(BONECOS_PRONTOS)

// ---------------------------------------------------------------- ajudas

/** Aplica e exige sucesso. */
function ok(e, cmd) {
  const r = aplicar(e, cmd)
  assert.equal(r.ok, true, `comando recusado: ${r.codigo} ${r.motivo} ${JSON.stringify(cmd)}`)
  return r.estado
}
/** Aplica e exige recusa com o código. Confere que o estado não mudou. */
function recusa(e, cmd, codigo) {
  const antes = JSON.stringify(e)
  const r = aplicar(e, cmd)
  assert.equal(r.ok, false, `devia recusar ${codigo}: ${JSON.stringify(cmd)}`)
  assert.equal(r.codigo, codigo, r.motivo)
  assert.equal(typeof r.motivo, 'string')
  assert.equal(JSON.stringify(e), antes, 'recusa não pode mudar o estado')
}
const passar = (e) => ok(e, { tipo: 'passar', time: e.vez })
/** Passa até ser a vez do time `t`. */
function vezDe(e, t) { return e.vez === t ? e : passar(e) }
/** Põe na mão do time uma cópia da carta `carta` (de qualquer boneco que a tenha). Muda o estado (teste). */
function naMao(e, t, carta) {
  const time = e.times[t]
  const ja = time.mao.find((c) => e.cartas[c].carta === carta)
  if (ja) return ja
  const cid = Object.keys(e.cartas).find((c) => c[0] === t && e.cartas[c].carta === carta && !time.fiapos.includes(c))
  assert.ok(cid, `time ${t} não tem ${carta}`)
  for (const k of ['baralho', 'descarte']) { const i = time[k].indexOf(cid); if (i >= 0) time[k].splice(i, 1) }
  time.mao.push(cid)
  if (time.mao.length > REGRAS.maoMaxima) time.mao.splice(0, 1)
  return cid
}
const frente = (e, t) => e.times[t].lugares[0]
const semSorte = (e) => { for (const b of Object.values(e.bonecos)) { b.rapidez = 0; b.firmeza = 0 } }

/** Luta inteira entre robôs; devolve estado final e comandos. */
function lutaDeRobos(semente, timeA, timeB, roboA = 'planejador', roboB = 'ganancioso') {
  const e = criarLuta({ semente, timeA, timeB })
  for (let g = 0; g < 100 && !e.fim; g++) jogarTurno(e, e.vez === 'A' ? roboA : roboB)
  return e
}
function timesSorteados(i) {
  const r = criarRng(`times:${i}`)
  const pega = () => { const ids = IDS.slice(); return [0, 1, 2].map(() => ids.splice(r.inteiro(ids.length), 1)[0]) }
  return [pega(), pega()]
}

// ---------------------------------------------------------------- gerador

describe('rng com semente', () => {
  test('mesma semente → mesma sequência; sementes diferentes → sequências diferentes', () => {
    const a = criarRng('x'), b = criarRng('x'), c = criarRng('y')
    const sa = [], sb = [], sc = []
    for (let i = 0; i < 50; i++) { sa.push(a.proximo()); sb.push(b.proximo()); sc.push(c.proximo()) }
    assert.deepEqual(sa, sb)
    assert.notDeepEqual(sa, sc)
    for (const v of sa) assert.ok(v >= 0 && v < 1)
  })
  // regra mudou (parecer de segurança nº 1, A1): o estado deixou de ser um inteiro de 32 bits; agora é chave de 256 bits + contador
  test('estado é JSON com chave de 256 bits (não cabe em 32 bits) e o passo é puro', () => {
    const s = estadoDaSemente('frayz')
    assert.match(s.chave, /^[0-9a-f]{64}$/)
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s)
    assert.deepEqual(passo(s), passo(s))
  })
})

// ---------------------------------------------------------------- dados

describe('config (dados do jogo)', () => {
  test('6 tipos; 24 cartas, 4 por tipo, 8 por parte', () => {
    assert.equal(TIPOS.length, 6)
    const cs = Object.values(CARTAS)
    assert.equal(cs.length, 24)
    for (const t of TIPOS) assert.equal(cs.filter((c) => c.tipo === t).length, 4, t)
    for (const p of ['cabeca', 'bracos', 'pernas']) assert.equal(cs.filter((c) => c.parte === p).length, 8, p)
  })
  test('as 12 cartas do desenho existem', () => {
    for (const id of ['botaozada', 'mordida_de_ziper', 'agulha_longa', 'abraco_apertado', 'novelo_rolante', 'pisao_de_tamanco',
      'rasgo', 'veu_de_tule', 'ponto_cruz', 'remendo_rapido', 'desfiar', 'ultimo_ponto']) assert.ok(CARTAS[id], id)
  })
  test('texto da carta e do bordado não tem número escrito à mão: vem dos efeitos', () => {
    for (const [id, c] of Object.entries(CARTAS)) {
      assert.ok(!/\d/.test(c.texto.replace(/\{[^}]*\}/g, '')), `${id}: número fora de {campo}`)
      const t = textoDaCarta(id)
      assert.ok(!t.includes('{') && !t.includes('undefined'), `${id}: ${t}`)
      for (const ef of c.efeitos) if (typeof ef.valor === 'number' && ef.valor >= 1) assert.ok(t.includes(String(ef.valor)), `${id}: ${t}`)
    }
    for (const [id, b] of Object.entries(BORDADOS)) {
      assert.ok(!/\d/.test(b.texto.replace(/\{[^}]*\}/g, '')), id)
      assert.ok(!textoDoBordado(id).includes('{'))
    }
    assert.equal(textoDaCarta('mordida_de_ziper'), `${CARTAS.mordida_de_ziper.efeitos[0].valor} de dano; +50% se o alvo tem Fio Solto.`)
  })
  test('≥ 8 bordados; partes válidas; raridade com teto de +4%', () => {
    assert.ok(Object.keys(BORDADOS).length >= 8)
    for (const r of Object.values(RARIDADES)) assert.ok(r.fator >= 1 && r.fator <= 1.04 + 1e-12)
    for (const [id, p] of Object.entries(PARTES)) {
      if (p.carta) assert.ok(CARTAS[p.carta], `${id} → carta ${p.carta}`)
      if (p.bordado) assert.ok(BORDADOS[p.bordado], `${id} → bordado ${p.bordado}`)
      if (p.slot === 'tronco') assert.ok(TIPOS.includes(p.tipo), id)
    }
  })
  test('9 bonecos prontos, 2 raridades, juntos carregam as 24 cartas', () => {
    assert.equal(IDS.length, 9)
    const rars = new Set(), cartas = new Set()
    for (const id of IDS) {
      const f = montarBoneco(id)
      for (const ref of Object.values(f.partes)) rars.add(ref.split('@')[1])
      for (const c of f.cartas) cartas.add(c)
      assert.equal(f.cartas.length, 3)
    }
    assert.equal(rars.size, 2)
    assert.equal(cartas.size, 24)
  })
  test('Lendária dá no máximo +4% de vida sobre a Comum', () => {
    const p = { tronco: 'tr_la_embolada', cabeca: 'cab_gorro', bracos: 'br_abraco', pernas: 'pe_novelo', bordado: 'bo_espinho' }
    const com = montarBoneco({ partes: p })
    const len = montarBoneco({ partes: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, `${v}@lendaria`])) })
    assert.ok(len.vidaMax > com.vidaMax && len.vidaMax <= Math.ceil(com.vidaMax * 1.04))
    assert.equal(com.nome, 'Gorro-Abraço-Novelo')
  })
  test('boneco com parte errada ou desconhecida é recusado', () => {
    assert.throws(() => montarBoneco({ partes: { tronco: 'cab_gorro', cabeca: 'cab_gorro', bracos: 'br_abraco', pernas: 'pe_novelo', bordado: 'bo_espinho' } }))
    assert.throws(() => montarBoneco({ partes: { tronco: 'tr_la_embolada', cabeca: 'nada', bracos: 'br_abraco', pernas: 'pe_novelo', bordado: 'bo_espinho' } }))
    assert.throws(() => montarBoneco('nao_existe'))
    assert.throws(() => criarLuta({ semente: 1, timeA: ['rasgao'], timeB: ['rasgao', 'brigao', 'mudo'] }))
    assert.throws(() => criarLuta({ semente: '', timeA: IDS.slice(0, 3), timeB: IDS.slice(3, 6) }))
  })
})

// ---------------------------------------------------------------- roda de tipos

describe('roda de tipos', () => {
  test('cada tipo bate forte só no seguinte (Jeans > Seda > Lã > Feltro > Tule > Couro > Jeans)', () => {
    const ordem = ['jeans', 'seda', 'la', 'feltro', 'tule', 'couro']
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      assert.equal(bateForte(ordem[i], ordem[j]), j === (i + 1) % 6, `${ordem[i]} × ${ordem[j]}`)
    }
  })
  test('carta de Jeans dá +25% em Seda e dano normal em Lã', () => {
    const golpe = (timeB) => {
      let e = criarLuta({ semente: 'roda', timeA: ['rasgao', 'mudo', 'brigao'], timeB })
      e = vezDe(e, 'A')
      semSorte(e)
      const alvo = e.bonecos[frente(e, 'B')]
      alvo.reserva = 0
      const cid = naMao(e, 'A', 'botaozada')
      const antes = alvo.vida
      e = ok(e, { tipo: 'jogar', time: 'A', carta: cid })
      return antes - e.bonecos[alvo.id].vida
    }
    assert.equal(golpe(['desfiado', 'mudo', 'brigao']), Math.round(CARTAS.botaozada.efeitos[0].valor * 1.25))
    assert.equal(golpe(['embolado', 'mudo', 'brigao']), Math.max(0, CARTAS.botaozada.efeitos[0].valor - BORDADOS.pe_de_chumbo.valor))
  })
})

// ---------------------------------------------------------------- Linha, mão, limites

describe('Linha, mão e limites', () => {
  test('quem começa ganha 2 Linha no 1º turno; o outro 3; guarda até 7', () => {
    let e = criarLuta({ semente: 'linha', timeA: IDS.slice(0, 3), timeB: IDS.slice(3, 6) })
    const c = e.comecou, o = c === 'A' ? 'B' : 'A'
    assert.equal(e.turno, 1)
    assert.equal(e.vez, c)
    assert.equal(e.times[c].linha, REGRAS.linhaPrimeiroTurnoDeQuemComeca)
    e = passar(e)
    assert.equal(e.times[o].linha, REGRAS.linhaPorTurno)
    for (let i = 0; i < 6; i++) e = passar(e)
    assert.equal(e.times[c].linha, REGRAS.linhaMaxima)
    assert.equal(e.times[o].linha, REGRAS.linhaMaxima)
  })
  test('mão: começa com 4; 1º turno compra conforme a regra (quem joga em segundo compra mais); depois +2 por turno; nunca passa de 7', () => {
    let e = criarLuta({ semente: 'mao', timeA: IDS.slice(0, 3), timeB: IDS.slice(3, 6) })
    const c = e.comecou, o = c === 'A' ? 'B' : 'A'
    assert.equal(e.times[c].mao.length, REGRAS.maoInicial + REGRAS.compraNoPrimeiroTurno.quemComeca)
    e = passar(e)
    assert.equal(e.times[o].mao.length, REGRAS.maoInicial + REGRAS.compraNoPrimeiroTurno.quemNaoComeca)
    e = passar(e)
    assert.equal(e.times[c].mao.length, REGRAS.maoInicial + REGRAS.compraNoPrimeiroTurno.quemComeca + REGRAS.compraPorTurno)
    for (let i = 0; i < 6; i++) { e = passar(e); for (const t of ['A', 'B']) assert.ok(e.times[t].mao.length <= REGRAS.maoMaxima) }
    assert.equal(e.times[c].mao.length, REGRAS.maoMaxima)
    assert.equal(Object.keys(e.cartas).length, 36)
  })
  test('trocar dois de lugar custa 1 Linha e muda a Frente', () => {
    let e = criarLuta({ semente: 'troca', timeA: IDS.slice(0, 3), timeB: IDS.slice(3, 6) })
    const t = e.vez, [a, , c] = e.times[t].lugares, l = e.times[t].linha
    e = ok(e, { tipo: 'trocar', time: t, a, b: c })
    assert.equal(e.times[t].linha, l - 1)
    assert.equal(e.times[t].lugares[0], c)
    assert.equal(e.times[t].lugares[2], a)
  })
})

// ---------------------------------------------------------------- recusas

describe('comando inválido é recusado com motivo', () => {
  const base = () => vezDe(criarLuta({ semente: 'recusa', timeA: ['rasgao', 'assombrado', 'embolado'], timeB: ['mordedor', 'desfiado', 'cascudo'] }), 'A')

  test('fora do turno', () => {
    const e = base()
    recusa(e, { tipo: 'passar', time: 'B' }, 'FORA_DO_TURNO')
  })
  test('carta que não está na mão', () => {
    const e = base()
    const fora = e.times.A.baralho[0]
    recusa(e, { tipo: 'jogar', time: 'A', carta: fora }, 'CARTA_FORA_DA_MAO')
    recusa(e, { tipo: 'jogar', time: 'A', carta: e.times.B.mao[0] }, 'CARTA_FORA_DA_MAO')
    recusa(e, { tipo: 'jogar', time: 'A', carta: 'inventada' }, 'CARTA_FORA_DA_MAO')
  })
  test('Linha insuficiente (carta e troca)', () => {
    const e = base()
    const cid = naMao(e, 'A', 'novelo_rolante')
    e.times.A.linha = 1
    recusa(e, { tipo: 'jogar', time: 'A', carta: cid }, 'LINHA_INSUFICIENTE')
    e.times.A.linha = 0
    recusa(e, { tipo: 'trocar', time: 'A', a: 'A0', b: 'A1' }, 'LINHA_INSUFICIENTE')
  })
  test('alvo inválido: ataque comum só na Frente; Alcance só em inimigo de pé; cura só em aliado', () => {
    const e = base()
    e.times.A.linha = 7
    const bot = naMao(e, 'A', 'botaozada')
    recusa(e, { tipo: 'jogar', time: 'A', carta: bot, alvo: e.times.B.lugares[1] }, 'ALVO_INVALIDO')
    recusa(e, { tipo: 'jogar', time: 'A', carta: bot, alvo: 'A1' }, 'ALVO_INVALIDO')
    const nev = naMao(e, 'A', 'nevoa_de_tule')
    recusa(e, { tipo: 'jogar', time: 'A', carta: nev, alvo: 'A0' }, 'ALVO_INVALIDO')
    recusa(e, { tipo: 'jogar', time: 'A', carta: nev, alvo: 'B9' }, 'ALVO_INVALIDO')
    e.bonecos.B2.estado = 'caido'; e.bonecos.B2.vida = 0
    recusa(e, { tipo: 'jogar', time: 'A', carta: nev, alvo: 'B2' }, 'ALVO_INVALIDO')
    const ab = naMao(e, 'A', 'abraco_apertado')
    recusa(e, { tipo: 'jogar', time: 'A', carta: ab, alvo: 'B0' }, 'ALVO_INVALIDO')
  })
  test('boneco caído não joga (a carta virou fiapo)', () => {
    const e = base()
    const cid = naMao(e, 'A', 'botaozada')
    const dono = e.cartas[cid].dono
    e.bonecos[dono].estado = 'caido'; e.bonecos[dono].vida = 0
    recusa(e, { tipo: 'jogar', time: 'A', carta: cid }, 'BONECO_CAIDO')
  })
  test('no Último Fio só cartas de Pernas', () => {
    const e = base()
    e.times.A.linha = 7
    const cab = naMao(e, 'A', 'botaozada')
    const dono = e.cartas[cab].dono
    Object.assign(e.bonecos[dono], { estado: 'fio', vida: 0, usouFio: true, fioAte: e.turno })
    recusa(e, { tipo: 'jogar', time: 'A', carta: cab }, 'ULTIMO_FIO_SO_PERNAS')
    const pe = naMao(e, 'A', 'rebite_solto')
    assert.equal(e.cartas[pe].dono, dono)
    ok(e, { tipo: 'jogar', time: 'A', carta: pe })
  })
  test('condição da carta (Último Ponto só com pouca vida ou no Último Fio)', () => {
    const e = base()
    const cid = naMao(e, 'A', 'ultimo_ponto')
    recusa(e, { tipo: 'jogar', time: 'A', carta: cid }, 'CONDICAO_DA_CARTA')
    e.bonecos[e.cartas[cid].dono].vida = 10
    ok(e, { tipo: 'jogar', time: 'A', carta: cid })
  })
  test('fiapo só de boneco caído; troca inválida; comando estranho; luta acabada', () => {
    const e = base()
    recusa(e, { tipo: 'fiapo', time: 'A', carta: e.times.A.mao[0] }, 'NAO_E_FIAPO')
    recusa(e, { tipo: 'trocar', time: 'A', a: 'A0', b: 'A0' }, 'TROCA_INVALIDA')
    recusa(e, { tipo: 'trocar', time: 'A', a: 'A0', b: 'B1' }, 'TROCA_INVALIDA')
    recusa(e, { tipo: 'voar', time: 'A' }, 'COMANDO_INVALIDO')
    recusa(e, null, 'COMANDO_INVALIDO')
    recusa(e, { tipo: 'passar', time: 'C' }, 'COMANDO_INVALIDO')
    const fim = lutaDeRobos('acabou', ...timesSorteados(1))
    assert.ok(fim.fim)
    recusa(fim, { tipo: 'passar', time: fim.vez }, 'LUTA_ACABOU')
  })
  test('todo comando de comandosValidos é aceito', () => {
    for (let i = 0; i < 20; i++) {
      let e = criarLuta({ semente: `val:${i}`, timeA: timesSorteados(i)[0], timeB: timesSorteados(i)[1] })
      for (let p = 0; p < 4; p++) e = passar(e)
      for (const c of comandosValidos(e)) assert.equal(aplicar(e, c).ok, true, JSON.stringify(c))
    }
  })
})

// ---------------------------------------------------------------- Último Fio, fiapo, Tesoura

describe('Último Fio', () => {
  test('cai a 0 → fica de pé, não é alvo, só usa Pernas e cai no fim do próximo turno do dono; segunda queda é de vez', () => {
    let e = vezDe(criarLuta({ semente: 'fio', timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mudo', 'brigao'] }), 'A')
    const alvo = frente(e, 'B')
    e.bonecos[alvo].vida = 1
    e.bonecos[alvo].reserva = 0
    e = ok(e, { tipo: 'jogar', time: 'A', carta: naMao(e, 'A', 'botaozada') })
    const b = e.bonecos[alvo]
    assert.equal(b.estado, 'fio')
    assert.equal(b.vida, 0)
    assert.equal(b.fioAte, e.turno + 1)
    assert.ok(e.eventos.some((x) => x.t === 'ultimoFio' && x.alvo === alvo))
    // não é alvo: a Frente agora é o próximo de pé
    const bot2 = naMao(e, 'A', 'botaozada')
    e.times.A.linha = 7
    const v = comandosValidos(e).filter((c) => c.tipo === 'jogar' && e.cartas[c.carta].carta === 'botaozada')
    assert.ok(v.length > 0 && v.every((c) => c.alvo !== alvo))
    recusa(e, { tipo: 'jogar', time: 'A', carta: bot2, alvo }, 'ALVO_INVALIDO')
    e = passar(e) // vez do B: o boneco no fio ainda age, só com Pernas
    assert.equal(e.bonecos[alvo].estado, 'fio')
    for (const c of comandosValidos(e)) if (c.tipo === 'jogar' && e.cartas[c.carta].dono === alvo) assert.equal(CARTAS[e.cartas[c.carta].carta].parte, 'pernas')
    e = passar(e) // fim do turno do dono → cai de vez
    assert.equal(e.bonecos[alvo].estado, 'caido')
  })
  test('quem já usou o Último Fio cai de vez na próxima vez que chega a 0', () => {
    let e = vezDe(criarLuta({ semente: 'fio2', timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mudo', 'brigao'] }), 'A')
    const alvo = frente(e, 'B')
    Object.assign(e.bonecos[alvo], { vida: 1, usouFio: true, reserva: 0 })
    e = ok(e, { tipo: 'jogar', time: 'A', carta: naMao(e, 'A', 'botaozada') })
    assert.equal(e.bonecos[alvo].estado, 'caido')
  })
})

describe('fiapo', () => {
  test('carta de boneco caído vira fiapo: descarta por 0 Linha, compra 1 e sai da luta', () => {
    let e = vezDe(criarLuta({ semente: 'fiapo', timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mudo', 'brigao'] }), 'A')
    const cid = naMao(e, 'A', 'botaozada')
    const dono = e.cartas[cid].dono
    Object.assign(e.bonecos[dono], { estado: 'caido', vida: 0 })
    const linha = e.times.A.linha, mao = e.times.A.mao.length, bar = e.times.A.baralho.length
    assert.ok(comandosValidos(e).some((c) => c.tipo === 'fiapo' && c.carta === cid))
    e = ok(e, { tipo: 'fiapo', time: 'A', carta: cid })
    assert.equal(e.times.A.linha, linha)
    assert.equal(e.times.A.mao.length, mao)
    assert.equal(e.times.A.baralho.length, bar - 1)
    assert.ok(!e.times.A.mao.includes(cid))
    assert.ok(!e.times.A.descarte.includes(cid))
    assert.ok(e.times.A.fiapos.includes(cid))
  })
})

describe('Tesoura e fim no turno 12', () => {
  test('a partir do turno 9 corta 10% da vida máxima de todos; no 12 vence a maior soma de % de vida', () => {
    let e = criarLuta({ semente: 'tesoura', timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mordedor', 'desfiado'] })
    // tira um pouco de vida do time A para o B vencer na Tesoura
    e.bonecos.A0.vida -= 50
    while (e.turno < REGRAS.tesouraInicio - 1) e = passar(e)
    const antes = Object.fromEntries(Object.values(e.bonecos).map((b) => [b.id, b.vida]))
    e = passar(e)
    assert.equal(e.turno, REGRAS.tesouraInicio)
    for (const b of Object.values(e.bonecos)) assert.equal(antes[b.id] - b.vida, Math.round(b.vidaMax * REGRAS.tesouraCorte), b.id)
    while (!e.fim) e = passar(e)
    assert.equal(e.turno, REGRAS.turnoFinal)
    const r = resultado(e)
    assert.equal(r.vencedor, 'B')
    assert.equal(r.motivo, 'tesoura')
    assert.ok(r.pct.B > r.pct.A)
  })
  test('empate exato no turno 12 é decidido pela semente (sempre igual)', () => {
    const rodar = () => {
      let e = criarLuta({ semente: 'empate', timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['rasgao', 'mudo', 'brigao'] })
      while (!e.fim) e = passar(e)
      return resultado(e)
    }
    const a = rodar(), b = rodar()
    assert.equal(a.motivo, 'desempate')
    assert.deepEqual(a, b)
  })
})

// ---------------------------------------------------------------- determinismo e reprodução

describe('determinismo e replay', () => {
  test('100 lutas: mesma semente + mesmos comandos = mesmo estado final; reproduzir bate com a original', () => {
    for (let i = 0; i < 100; i++) {
      const [timeA, timeB] = timesSorteados(i)
      const e1 = lutaDeRobos(`det:${i}`, timeA, timeB, i % 2 ? 'planejador' : 'ganancioso', 'planejador')
      const e2 = lutaDeRobos(`det:${i}`, timeA, timeB, i % 2 ? 'planejador' : 'ganancioso', 'planejador')
      assert.equal(JSON.stringify(e1), JSON.stringify(e2), `luta ${i}`)
      const r = reproduzir({ semente: `det:${i}`, timeA, timeB, comandos: e1.comandos })
      assert.equal(r.ok, true)
      assert.equal(JSON.stringify(r.estado), JSON.stringify(e1), `replay ${i}`)
      assert.deepEqual(r.resultado, resultado(e1))
    }
  })
  test('reproduzir aponta o comando recusado', () => {
    const [timeA, timeB] = timesSorteados(7)
    const e = lutaDeRobos('rep', timeA, timeB)
    const cmds = e.comandos.slice()
    cmds.splice(3, 0, { tipo: 'passar', time: 'C' })
    const r = reproduzir({ semente: 'rep', timeA, timeB, comandos: cmds })
    assert.equal(r.ok, false)
    assert.equal(r.indice, 3)
  })
  test('estado é JSON puro e aplicar não muda o estado recebido', () => {
    const [timeA, timeB] = timesSorteados(3)
    let e = criarLuta({ semente: 'json', timeA, timeB })
    for (let p = 0; p < 5; p++) {
      const copia = JSON.parse(JSON.stringify(e))
      assert.deepEqual(copia, e)
      const antes = JSON.stringify(e)
      const c = planejarTurno(e, 'planejador')[0]
      const r1 = aplicar(e, c), r2 = aplicar(copia, c)
      assert.equal(JSON.stringify(e), antes)
      assert.equal(JSON.stringify(r1.estado), JSON.stringify(r2.estado))
      e = r1.estado
    }
  })
  test('visão do time não entrega a semente da luta (quem tem a semente prevê todo sorteio)', () => {
    const [timeA, timeB] = timesSorteados(5)
    const e = criarLuta({ semente: 'segredo-da-luta-123', timeA, timeB })
    for (const lado of ['A', 'B']) {
      const v = visaoDoTime(e, lado)
      assert.equal(v.semente, undefined)
      assert.ok(!JSON.stringify(v).includes('segredo-da-luta-123'), 'a semente não pode aparecer em lugar nenhum da visão')
    }
    assert.equal(e.semente, 'segredo-da-luta-123', 'o estado do servidor continua com a semente')
  })
  test('visão do time esconde a mão do rival, a ordem do baralho e o sorteio', () => {
    const [timeA, timeB] = timesSorteados(4)
    let e = criarLuta({ semente: 'visao', timeA, timeB })
    for (let p = 0; p < 3; p++) e = passar(e)
    const v = visaoDoTime(e, 'A')
    assert.equal(v.rng, undefined)
    assert.equal(v.times.B.mao, e.times.B.mao.length)
    assert.deepEqual(v.times.A.mao, e.times.A.mao)
    assert.equal(v.times.A.baralho, e.times.A.baralho.length)
    for (const cid of e.times.B.mao) assert.equal(v.cartas[cid].carta, undefined)
    for (const cid of e.times.A.mao) assert.equal(v.cartas[cid].carta, e.cartas[cid].carta)
    assert.ok(!JSON.stringify(v.eventos.filter((x) => x.time === 'B' && x.t === 'compra')).includes('"carta"'))
  })
  test('nenhum Math.random nem Date.now no motor, nos robôs, no gerador e nos dados', () => {
    for (const f of ['shared/batalha.js', 'shared/robos.js', 'shared/rng.js', 'shared/config.js']) {
      const src = fs.readFileSync(path.join(RAIZ, f), 'utf8')
      assert.ok(!/Math\.random|Date\.now|new Date|performance\.now|crypto/.test(src), f)
    }
  })
})

// ---------------------------------------------------------------- robôs

describe('robôs', () => {
  test('lutas entre robôs sempre terminam até o turno 12, sem comando inválido', () => {
    for (let i = 0; i < 150; i++) {
      const [timeA, timeB] = timesSorteados(1000 + i)
      const pares = [['ganancioso', 'ganancioso'], ['planejador', 'ganancioso'], ['planejador', 'planejador']]
      const [ra, rb] = pares[i % 3]
      const e = lutaDeRobos(`fim:${i}`, timeA, timeB, ra, rb)
      assert.ok(e.fim, `luta ${i} não terminou`)
      assert.ok(e.fim.turno <= REGRAS.turnoFinal)
      assert.ok(['A', 'B'].includes(e.fim.vencedor))
    }
  })
  test('ganancioso joga o maior dano disponível', () => {
    let e = vezDe(criarLuta({ semente: 'gan', timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mordedor', 'desfiado'] }), 'A')
    e.times.A.mao = []
    const fraca = naMao(e, 'A', 'rasgo'), forte = naMao(e, 'A', 'botaozada')
    e.times.A.linha = 1
    const c = planejarTurno(e, 'ganancioso')[0]
    assert.equal(c.carta, forte)
    assert.notEqual(c.carta, fraca)
  })
})

// ---------------------------------------------------------------- tarefa 12: parecer de segurança nº 1 (A2 e A11)

describe('A2 — turno sem fim (mesa + teto de comandos)', () => {
  /** Joga de graça (fiapo ou carta de 0 Linha) enquanto puder, como o ataque laco-qual.mjs. Conta Ponto Cruz no turno. */
  function lacoDoPontoCruz(e) {
    const t = e.vez, turno = e.turno
    let pontoCruz = 0
    for (let n = 0; n < 300 && !e.fim && e.vez === t && e.turno === turno; n++) {
      const v = comandosValidos(e)
      const g = v.find((c) => c.tipo === 'fiapo' || (c.tipo === 'jogar' && CARTAS[e.cartas[c.carta].carta].linha === 0))
      if (!g) break
      if (g.tipo === 'jogar' && e.cartas[g.carta].carta === 'ponto_cruz') pontoCruz++
      e = ok(e, g)
    }
    return pontoCruz
  }

  test('só o boneco do Ponto Cruz de pé e baralho vazio: no máximo 2 Ponto Cruz no turno (não volta à mão)', () => {
    let e = vezDe(criarLuta({ semente: 'laco', timeA: ['cascudo', 'desfiado', 'mudo'], timeB: ['mordedor', 'embolado', 'cascudo'] }), 'A')
    const A = e.times.A
    const dono = Object.values(e.bonecos).find((b) => b.time === 'A' && b.pronto === 'cascudo').id
    for (const id of A.lugares) if (id !== dono) Object.assign(e.bonecos[id], { estado: 'caido', vida: 0 })
    const minhas = Object.keys(e.cartas).filter((c) => c[0] === 'A' && e.cartas[c].dono === dono)
    const cruz = minhas.filter((c) => e.cartas[c].carta === 'ponto_cruz')
    assert.equal(cruz.length, 2)
    A.mao = cruz.slice()
    A.baralho = []
    A.descarte = minhas.filter((c) => !cruz.includes(c))
    A.fiapos = Object.keys(e.cartas).filter((c) => c[0] === 'A' && e.cartas[c].dono !== dono)
    A.linha = 0
    const n = lacoDoPontoCruz(e)
    assert.ok(n <= 2, `Ponto Cruz jogado ${n} vezes no mesmo turno`)
  })

  test('carta jogada fica na mesa do time até o fim do turno; depois vai ao descarte', () => {
    let e = vezDe(criarLuta({ semente: 'mesa', timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mordedor', 'desfiado'] }), 'A')
    e.times.A.linha = 7
    const cid = naMao(e, 'A', 'botaozada')
    e = ok(e, { tipo: 'jogar', time: 'A', carta: cid })
    assert.deepEqual(e.times.A.mesa, [cid])
    assert.ok(!e.times.A.descarte.includes(cid))
    for (const lado of ['A', 'B']) {
      const v = visaoDoTime(e, lado)
      assert.deepEqual(v.times.A.mesa, [cid], `a mesa do A aparece para ${lado}`)
      assert.equal(v.times.A.mesa.length, 1)
      assert.equal(v.cartas[cid].carta, 'botaozada', 'carta na mesa é pública')
      assert.deepEqual(v.times.B.mesa, [])
    }
    e = passar(e)
    assert.deepEqual(e.times.A.mesa, [])
    assert.ok(e.times.A.descarte.includes(cid))
  })

  test('teto de comandos por turno: o comando 41 é recusado (TETO_DE_COMANDOS); passar sempre é aceito', () => {
    assert.equal(REGRAS.maxComandosPorTurno, 40)
    let e = vezDe(criarLuta({ semente: 'teto', timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mordedor', 'desfiado'] }), 'A')
    for (let i = 0; i < REGRAS.maxComandosPorTurno; i++) {
      e.times.A.linha = 7 // teste: Linha à vontade para isolar o teto
      e = ok(e, { tipo: 'trocar', time: 'A', a: 'A0', b: 'A1' })
    }
    e.times.A.linha = 7
    recusa(e, { tipo: 'trocar', time: 'A', a: 'A0', b: 'A1' }, 'TETO_DE_COMANDOS')
    assert.deepEqual(comandosValidos(e), [{ tipo: 'passar', time: 'A' }])
    e = passar(e)
    e = passar(e)
    e.times.A.linha = 7
    e = ok(e, { tipo: 'trocar', time: 'A', a: 'A0', b: 'A1' }) // turno novo: conta de novo
  })

  test('2.000 lutas robô × robô: nenhum turno passa de 40 comandos e ninguém passa de 7 de Linha', () => {
    const pares = [['ganancioso', 'ganancioso'], ['planejador', 'ganancioso'], ['planejador', 'planejador']]
    for (let i = 0; i < 2000; i++) {
      const [timeA, timeB] = timesSorteados(5000 + i)
      const [ra, rb] = pares[i % 3]
      const e = criarLuta({ semente: `teto:${i}`, timeA, timeB })
      for (let g = 0; g < 100 && !e.fim; g++) {
        jogarTurno(e, e.vez === 'A' ? ra : rb)
        for (const t of ['A', 'B']) assert.ok(e.times[t].linha <= 7, `luta ${i}: Linha ${e.times[t].linha}`)
      }
      assert.ok(e.fim, `luta ${i} não terminou`)
      let n = 0
      for (const c of e.comandos) {
        if (c.tipo === 'passar') { n = 0; continue }
        n++
        assert.ok(n <= REGRAS.maxComandosPorTurno, `luta ${i}: turno com ${n} comandos`)
      }
    }
  })
})

describe('A11 — o número da carta não diz qual carta é', () => {
  test('em 200 lutas, deduzir a carta escondida do rival pelo número acerta só o acaso (~1/3)', () => {
    // a dedução do ataque carta-pelo-numero.mjs: n → carta (n % 6) / 2 do boneco dono
    let escondidas = 0, acertos = 0
    for (let i = 0; i < 200; i++) {
      const [timeA, timeB] = timesSorteados(9000 + i)
      const e = criarLuta({ semente: `num:${i}`, timeA, timeB })
      const v = visaoDoTime(e, 'A')
      for (const [cid, c] of Object.entries(v.cartas)) {
        if (!cid.startsWith('B') || c.carta) continue
        escondidas++
        const n = Number(cid.slice(2)), b = v.bonecos[c.dono]
        const deduzida = montarBoneco({ partes: b.partes }).cartas[Math.floor((n % 6) / 2)]
        if (deduzida === e.cartas[cid].carta) acertos++
      }
    }
    assert.ok(escondidas > 2000)
    const taxa = acertos / escondidas
    assert.ok(taxa < 0.40, `acertou ${acertos}/${escondidas} (${(100 * taxa).toFixed(1)}%)`)
  })
  test('a ordem das cartas no estado segue o número (c0..c17), não a ordem dos bonecos', () => {
    const e = criarLuta({ semente: 'ordem', timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mordedor', 'desfiado'] })
    for (const t of ['A', 'B']) {
      const ids = Object.keys(e.cartas).filter((c) => c[0] === t)
      assert.deepEqual(ids, Array.from({ length: 18 }, (_, k) => `${t}c${k}`))
    }
    const mesmaOrdem = (s) => {
      const x = criarLuta({ semente: s, timeA: ['rasgao', 'mudo', 'brigao'], timeB: ['assombrado', 'mordedor', 'desfiado'] })
      return Object.keys(x.cartas).filter((c) => c[0] === 'B').map((c) => x.cartas[c].carta).join()
    }
    assert.notEqual(mesmaOrdem('p1'), mesmaOrdem('p2'), 'a carta de cada número muda de luta para luta')
  })
})

// ------------------------------------------------------------------ tarefa 15: teto do Lendário +4%
// Regra (decisions.md 15/11 03:18): raridade dá opções, não força. Teto da Lendária +4% sobre a Comum;
// Incomum e Rara são 30% e 60% do teto. Lendária × Comum (mesmo time) não passa de 58%.
describe('tarefa 15 — teto do Lendário +4%', () => {
  test('fatores: Comum 1, Incomum +1,2%, Rara +2,4%, Lendária +4%', () => {
    assert.equal(RARIDADES.comum.fator, 1)
    assert.ok(Math.abs(RARIDADES.lendaria.fator - 1.04) < 1e-12, `lendária ${RARIDADES.lendaria.fator}`)
    const teto = RARIDADES.lendaria.fator - 1
    assert.ok(Math.abs((RARIDADES.incomum.fator - 1) / teto - 0.3) < 1e-9, 'Incomum = 30% do teto')
    assert.ok(Math.abs((RARIDADES.rara.fator - 1) / teto - 0.6) < 1e-9, 'Rara = 60% do teto')
  })
  test('Lendária × Comum (2000 lutas, semente fixa) fica em até 58%', async () => {
    const { duelarRaridades } = await import('../../tools/simular-costura.mjs')
    const d = duelarRaridades({ lutas: 2000, semente: 'frayz', rarX: 'lendaria', rarY: 'comum' })
    assert.ok(d.pct <= 58, `Lendária vence ${d.pct.toFixed(1)}%`)
  })
})
