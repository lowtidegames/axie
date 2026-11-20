// Tarefa 16 (decisão 15/11 03:18, item 4; parecer de segurança nº 1, A6; riscos baixos do parecer nº 2):
// energia para abrir luta na Aventura, desistir/abandonar contam como derrota, apelido "rn"/"m" e pontas, IPv6 da lista
// de proxies, replay que não refaz, teto do histórico dos bonecos e o teste luta a luta (o que o jogador viu = luta refeita).
// Rodar: node --test tests/servidor/tarefa16.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { reproduzir, criarLuta, resultado as resultadoDaLuta, VERSAO_DO_MOTOR } from '../../shared/batalha.js'
import { BONECOS_PRONTOS, ECONOMIA_DO_BETA } from '../../shared/config.js'
import { PARTES_DO_BONECO, gerarBonecoInicial, paraLuta } from '../../shared/costura.js'
import { jogarTurno } from '../../shared/robos.js'
import { iniciar } from '../../server/index.mjs'
import { abrirBanco, MIGRACOES, VERSAO_DO_BANCO } from '../../server/db.mjs'
import { criarJogo, hashDoToken } from '../../server/jogo.mjs'
import { PARAMS_SERVIDOR, proxiesDoAmbiente, ipDoCliente } from '../../server/api.mjs'

const DIA = 86_400_000
const T0 = 1_900_000_000_000 + 5 * 3_600_000 // um instante no meio de um dia UTC
const viradaDepois = (t) => (Math.floor(t / DIA) + 1) * DIA

function jogoEmMemoria(opcoes = {}) {
  const relogio = { t: T0 }
  const db = abrirBanco(':memory:', { modo: 'teste', agora: () => relogio.t })
  const logs = []
  const jogo = criarJogo(db, { agora: () => relogio.t, log: (l) => logs.push(l), ...opcoes })
  return { relogio, db, jogo, logs }
}
let nApelido = 0
function conta(jogo) {
  const { conta: c, token } = jogo.criarConta(`Energia ${++nApelido}`)
  const ids = jogo.estado(c.id).bonecos.map((b) => b.id)
  return { id: c.id, token, ids }
}
const codigoDe = (fn) => { try { fn(); return null } catch (e) { return e.codigo } }

/** Deixa o rival com 1 de vida e joga até o fim (cliente honesto). */
function vencer(jogo, db, contaId, luta) {
  db.prepare("UPDATE lutas SET estado = json_set(estado, '$.bonecos.B0.vida', 1, '$.bonecos.B1.vida', 1, '$.bonecos.B2.vida', 1) WHERE id = ?").run(luta.id)
  let r = jogo.verLuta(contaId, luta.id), turno = r.visao.turno, noTurno = 0, n = 0
  while (r.status === 'aberta') {
    assert.ok(++n < 500)
    if (r.visao.turno !== turno) { turno = r.visao.turno; noTurno = 0 }
    const jogar = r.validos.find((c) => c.tipo === 'jogar') ?? r.validos.find((c) => c.tipo === 'fiapo')
    r = jogo.comando(contaId, r.id, r.seq, noTurno++ < 6 && jogar ? jogar : { tipo: 'passar' })
  }
  return r
}

// ---------------------------------------------------------------- A: energia

describe('tarefa 16 — energia (A6: abrir luta na Aventura gasta energia)', () => {
  test('número vem da configuração do beta (PROVISÓRIO): 20 lutas por dia, 1 por luta', () => {
    assert.equal(ECONOMIA_DO_BETA.energiaPorDia, 20)
    assert.equal(ECONOMIA_DO_BETA.energiaPorLutaDaAventura, 1)
  })

  test('conta nova tem 20; cada luta aberta na Aventura gasta 1; sem energia: SEM_ENERGIA sem abrir luta; livre não gasta; recarrega inteira na virada do dia UTC', () => {
    const { relogio, db, jogo } = jogoEmMemoria()
    const c = conta(jogo)
    assert.deepEqual(jogo.estado(c.id).energia, { atual: 20, maximo: 20, recarregaEm: new Date(viradaDepois(T0)).toISOString() })
    for (let i = 0; i < 20; i++) {
      const l = jogo.novaLuta(c.id, { modo: 'aventura', fase: 1, time: c.ids.slice(0, 3) })
      assert.equal(l.energia.atual, 19 - i)
      jogo.desistir(c.id, l.id)
    }
    assert.equal(jogo.estado(c.id).energia.atual, 0)
    const lutas = () => db.prepare('SELECT COUNT(*) n FROM lutas WHERE conta_id = ?').get(c.id).n
    const antes = lutas()
    let e
    try { jogo.novaLuta(c.id, { modo: 'aventura', fase: 1, time: c.ids.slice(0, 3) }) } catch (x) { e = x }
    assert.equal(e?.codigo, 'SEM_ENERGIA'); assert.equal(e.status, 409)
    assert.deepEqual(e.extra.energia, { atual: 0, maximo: 20, recarregaEm: new Date(viradaDepois(T0)).toISOString() })
    assert.equal(lutas(), antes, 'abriu luta sem energia')
    // luta livre (sem progressão) não gasta
    const livre = jogo.novaLuta(c.id, { modo: 'livre', time: c.ids.slice(0, 3) })
    jogo.desistir(c.id, livre.id)
    assert.equal(jogo.estado(c.id).energia.atual, 0)
    // 1 ms antes da virada: ainda não
    relogio.t = viradaDepois(T0) - 1
    assert.equal(codigoDe(() => jogo.novaLuta(c.id, { modo: 'aventura', fase: 1, time: c.ids.slice(0, 3) })), 'SEM_ENERGIA')
    // na virada (00:00 UTC): inteira de novo
    relogio.t = viradaDepois(T0)
    assert.deepEqual(jogo.estado(c.id).energia, { atual: 20, maximo: 20, recarregaEm: new Date(viradaDepois(T0) + DIA).toISOString() })
    const l = jogo.novaLuta(c.id, { modo: 'aventura', fase: 1, time: c.ids.slice(0, 3) })
    assert.equal(l.energia.atual, 19)
    assert.equal(jogo.estado(c.id).energia.atual, 19)
  })

  test('pedido recusado não gasta energia (fase bloqueada, boneco ocupado, luta aberta)', () => {
    const { jogo } = jogoEmMemoria()
    const c = conta(jogo)
    assert.equal(codigoDe(() => jogo.novaLuta(c.id, { modo: 'aventura', fase: 2, time: c.ids.slice(0, 3) })), 'FASE_BLOQUEADA')
    const l = jogo.novaLuta(c.id, { modo: 'aventura', fase: 1, time: c.ids.slice(0, 3) })
    assert.equal(codigoDe(() => jogo.novaLuta(c.id, { modo: 'aventura', fase: 1, time: c.ids.slice(3, 6) })), 'LUTA_ABERTA')
    assert.equal(jogo.estado(c.id).energia.atual, 19)
    jogo.desistir(c.id, l.id)
    const livre = jogo.novaLuta(c.id, { modo: 'livre', time: c.ids.slice(0, 3) })
    assert.equal(codigoDe(() => jogo.novaLuta(c.id, { modo: 'aventura', fase: 1, time: c.ids.slice(0, 3) })), 'LUTA_ABERTA')
    jogo.desistir(c.id, livre.id)
    assert.equal(jogo.estado(c.id).energia.atual, 19)
  })

  test('a energia vive no banco: outra conexão no mesmo arquivo enxerga o gasto', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'frayz-energia-'))
    const arq = path.join(pasta, 'e.db')
    const db1 = abrirBanco(arq), db2 = abrirBanco(arq)
    try {
      const j1 = criarJogo(db1, { agora: () => T0, energiaPorDia: 1 }), j2 = criarJogo(db2, { agora: () => T0, energiaPorDia: 1 })
      const c = conta(j1)
      const l = j1.novaLuta(c.id, { modo: 'aventura', fase: 1, time: c.ids.slice(0, 3) })
      j1.desistir(c.id, l.id)
      assert.equal(codigoDe(() => j2.novaLuta(c.id, { modo: 'aventura', fase: 1, time: c.ids.slice(0, 3) })), 'SEM_ENERGIA')
      assert.equal(j2.estado(c.id).energia.atual, 0)
    } finally { db1.close(); db2.close() }
  })

  test('HTTP: GET /api/estado traz energia; 10 aberturas ao mesmo tempo com 1 de energia → só 1 passa; depois 409 SEM_ENERGIA', async () => {
    const s = await iniciar({ dbPath: ':memory:', porta: 0, agora: () => T0, log: () => {}, limites: { energiaPorDia: 1 } })
    const base = `http://127.0.0.1:${s.porta}`
    const api = async (metodo, caminho, token, corpo) => {
      const r = await fetch(base + caminho, { method: metodo, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined })
      return { status: r.status, json: await r.json() }
    }
    try {
      const { token } = (await api('POST', '/api/conta', null, { apelido: 'Corrida Energia' })).json
      const est = await api('GET', '/api/estado', token)
      assert.deepEqual(est.json.energia, { atual: 1, maximo: 1, recarregaEm: new Date(viradaDepois(T0)).toISOString() })
      const ids = est.json.bonecos.map((b) => b.id)
      const todos = await Promise.all(Array.from({ length: 10 }, (_, i) => api('POST', '/api/luta', token, { modo: 'aventura', fase: 1, time: ids.slice(3 * (i % 3), 3 * (i % 3) + 3) })))
      assert.equal(todos.filter((r) => r.status === 201).length, 1)
      assert.ok(todos.filter((r) => r.status !== 201).every((r) => r.status === 409), JSON.stringify(todos.map((r) => r.json.erro?.codigo)))
      assert.equal(s.db.prepare('SELECT COUNT(*) n FROM lutas').get().n, 1)
      const aberta = todos.find((r) => r.status === 201).json
      await api('POST', `/api/luta/${aberta.id}/desistir`, token)
      const sem = await api('POST', '/api/luta', token, { modo: 'aventura', fase: 1, time: ids.slice(0, 3) })
      assert.equal(sem.status, 409); assert.equal(sem.json.erro.codigo, 'SEM_ENERGIA')
      assert.equal(sem.json.erro.energia.atual, 0)
      assert.equal((await api('GET', '/api/estado', token)).json.energia.atual, 0)
    } finally { s.servidor.closeAllConnections(); await new Promise((ok) => s.servidor.close(ok)) }
  })
})

describe('tarefa 16 — desistir e abandonar contam como derrota em tudo', () => {
  test('Aventura: desistir e abandonar não liberam fase, zeram a sequência de vitórias, contam luta sem vitória no boneco e no registro', () => {
    const { relogio, db, jogo } = jogoEmMemoria()
    const c = conta(jogo)
    const time = c.ids.slice(0, 3)
    assert.equal(jogo.estado(c.id).vitoriasSeguidas, 0)
    // vence a fase 1 (sequência 1), depois desiste da fase 2
    const v = vencer(jogo, db, c.id, jogo.novaLuta(c.id, { modo: 'aventura', fase: 1, time }))
    assert.equal(v.resultado.vencedor, 'A')
    assert.equal(jogo.estado(c.id).vitoriasSeguidas, 1)
    assert.equal(jogo.estado(c.id).faseLiberada, 2)
    const antes = jogo.boneco(c.id, time[0]).boneco
    const d = jogo.novaLuta(c.id, { modo: 'aventura', fase: 2, time })
    const fimD = jogo.desistir(c.id, d.id)
    assert.equal(fimD.resultado.vencedor, 'B'); assert.equal(fimD.resultado.motivo, 'desistiu')
    let est = jogo.estado(c.id)
    assert.equal(est.faseLiberada, 2); assert.equal(est.vitoriasSeguidas, 0)
    let depois = jogo.boneco(c.id, time[0])
    assert.equal(depois.boneco.lutas, antes.lutas + 1); assert.equal(depois.boneco.vitorias, antes.vitorias)
    assert.deepEqual(depois.historico.filter((h) => h.tipo === 'lutou').at(-1), { tipo: 'lutou', em: relogio.t, luta: d.id, modo: 'aventura', venceu: false, maiorGolpe: depois.historico.filter((h) => h.tipo === 'lutou').at(-1).maiorGolpe })
    // vence de novo (sequência 1) e abandona a fase 2
    vencer(jogo, db, c.id, jogo.novaLuta(c.id, { modo: 'aventura', fase: 1, time }))
    assert.equal(jogo.estado(c.id).vitoriasSeguidas, 1)
    const a = jogo.novaLuta(c.id, { modo: 'aventura', fase: 2, time })
    relogio.t += (PARAMS_SERVIDOR.abandonoMin + 1) * 60_000
    jogo.aoPedido(c.id)
    const linha = db.prepare('SELECT status, resultado FROM lutas WHERE id = ?').get(a.id)
    assert.equal(linha.status, 'encerrada')
    assert.equal(JSON.parse(linha.resultado).vencedor, 'B'); assert.equal(JSON.parse(linha.resultado).motivo, 'abandono')
    est = jogo.estado(c.id)
    assert.equal(est.faseLiberada, 2); assert.equal(est.vitoriasSeguidas, 0)
    depois = jogo.boneco(c.id, time[0])
    // depois de "antes": desistiu, venceu, abandonou → 3 lutas, 1 vitória
    assert.equal(depois.boneco.lutas, antes.lutas + 3); assert.equal(depois.boneco.vitorias, antes.vitorias + 1)
    assert.equal(depois.historico.filter((h) => h.tipo === 'lutou').at(-1).venceu, false)
    // luta livre não mexe na sequência da Aventura
    vencer(jogo, db, c.id, jogo.novaLuta(c.id, { modo: 'aventura', fase: 1, time }))
    const livre = jogo.novaLuta(c.id, { modo: 'livre', time })
    jogo.desistir(c.id, livre.id)
    assert.equal(jogo.estado(c.id).vitoriasSeguidas, 1)
  })
})

// ---------------------------------------------------------------- B: riscos baixos da rechecagem

describe('tarefa 16 — apelido: "rn" vale "m" e pontuação nas pontas não conta', () => {
  test('quem chega com "rn" no lugar de "m" ou com . _ - nas pontas encontra o apelido já em uso', () => {
    const { jogo } = jogoEmMemoria()
    jogo.criarConta('Camila'); jogo.criarConta('Ana Lu'); jogo.criarConta('Rnaria')
    for (const igual of ['Carnila', 'CARNILA', '.Ana Lu', 'Ana Lu_', '-Ana Lu-', '._Ana Lu', 'Maria', 'rnaria']) {
      assert.equal(codigoDe(() => jogo.criarConta(igual)), 'APELIDO_EM_USO', igual)
    }
    for (const bom of ['Ana.Lu', 'Camilo', 'Ana Luz']) assert.equal(codigoDe(() => jogo.criarConta(bom)), null, bom)
  })
})

describe('tarefa 16 — TRUST_PROXY_IPS: IPv6 escrito de outro jeito', () => {
  test('0:0:0:0:0:0:0:1 vale ::1; maiúsculas e zeros viram a forma curta; o que não normaliza avisa no log', () => {
    const linhas = []
    const p = proxiesDoAmbiente({ TRUST_PROXY: '1', TRUST_PROXY_IPS: '0:0:0:0:0:0:0:1, 2001:DB8:0:0:0:0:0:1,10.0.0.1,fe80::1%eth0' }, (l) => linhas.push(l))
    assert.ok(p.has('::1')); assert.ok(p.has('2001:db8::1')); assert.ok(p.has('10.0.0.1'))
    assert.ok(linhas.some((l) => /fe80::1%eth0/.test(l) && /normaliz/i.test(l)), linhas.join('\n'))
    // pedido que chega do ::1 (forma do socket) com a lista escrita por extenso: o cabeçalho é lido
    const req = { socket: { remoteAddress: '::1' }, headers: { 'x-forwarded-for': '9.8.7.6' } }
    assert.equal(ipDoCliente(req, p), '9.8.7.6')
  })
})

describe('tarefa 16 — replay que não refaz: erro claro, nunca luta pela metade', () => {
  test('luta encerrada com comando guardado que o motor recusa: 500 LUTA_ILEGIVEL e log de erro', async () => {
    const { db, jogo, logs } = jogoEmMemoria()
    const c = conta(jogo)
    const l = jogo.novaLuta(c.id, { modo: 'livre', time: c.ids.slice(0, 3) })
    jogo.desistir(c.id, l.id)
    db.prepare("UPDATE lutas SET estado = ? WHERE id = ?").run(JSON.stringify({ curtos: ['jA Ac99 B0'] }), l.id)
    let e
    try { jogo.verLuta(c.id, l.id) } catch (x) { e = x }
    assert.equal(e?.status, 500); assert.equal(e.codigo, 'LUTA_ILEGIVEL')
    assert.ok(logs.some((x) => /ERRO/.test(x) && x.includes(l.id)), logs.join('\n'))
  })
})

describe('tarefa 16 — histórico dos bonecos com teto', () => {
  test('cada boneco guarda só as últimas N lutas no histórico (o nascimento fica); a contagem de lutas do boneco não muda', () => {
    assert.ok(Number.isSafeInteger(PARAMS_SERVIDOR.lutasNoHistoricoDoBoneco) && PARAMS_SERVIDOR.lutasNoHistoricoDoBoneco > 0)
    const { db, jogo } = jogoEmMemoria({ lutasNoHistoricoDoBoneco: 5 })
    const c = conta(jogo)
    for (let i = 0; i < 8; i++) jogo.desistir(c.id, jogo.novaLuta(c.id, { modo: 'livre', time: c.ids.slice(0, 3) }).id)
    for (const id of c.ids.slice(0, 3)) {
      const { boneco, historico } = jogo.boneco(c.id, id)
      assert.equal(boneco.lutas, 8)
      assert.equal(historico.filter((h) => h.tipo === 'lutou').length, 5)
      assert.equal(historico.filter((h) => h.tipo === 'nasceu').length, 1)
    }
    assert.equal(db.prepare("SELECT COUNT(*) n FROM eventos_bonecos WHERE tipo = 'lutou'").get().n, 15)
  })
})

describe('tarefa 16 — luta a luta: o que o jogador viu = a luta refeita pelo replay', () => {
  test('160 lutas com semente fixa (golpe, tempo, desistência, abandono, tesoura): nenhuma diferença', () => {
    const { relogio, db, jogo } = jogoEmMemoria()
    const c = conta(jogo)
    let rnd = 16016
    const r = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648
    const txt = (v) => JSON.stringify(v)
    const motivos = {}, jeitos = {}
    let diferentes = 0, comTempo = 0
    for (let k = 0; k < 160; k++) {
      const jeito = ['comandos', 'tempo', 'desistir', 'abandono'][k % 4]
      jeitos[jeito] = (jeitos[jeito] ?? 0) + 1
      let L = jogo.novaLuta(c.id, { modo: 'livre', robo: k % 2 ? 'planejador' : 'ganancioso', time: c.ids.slice(3 * (k % 3), 3 * (k % 3) + 3) })
      const vistos = [...L.eventos]
      let visao = L.visao, passos = 0, passouPorTempo = false, abandonou = false
      while (L.status === 'aberta' && passos++ < 600) {
        if (jeito === 'desistir' && passos > 4 + (k % 7)) { L = jogo.desistir(c.id, L.id); vistos.push(...L.eventos); visao = L.visao; break }
        if (jeito === 'abandono' && passos > 4 + (k % 5)) { relogio.t += (PARAMS_SERVIDOR.abandonoMin + 1) * 60_000; jogo.aoPedido(c.id); abandonou = true; break }
        if ((jeito === 'tempo' && passos % 3 === 0) || !L.validos.length) {
          relogio.t += 45_000; passouPorTempo = true
          L = jogo.verLuta(c.id, L.id); vistos.push(...L.eventos); visao = L.visao; continue
        }
        // cliente que joga mais cartas que passa (luta chega ao fim por golpe ou pela Tesoura)
        const jogaveis = L.validos.filter((x) => x.tipo !== 'passar')
        const lista = jogaveis.length && r() < 0.85 ? jogaveis : L.validos
        const cmd = lista[Math.floor(r() * lista.length)]
        L = jogo.comando(c.id, L.id, L.seq, cmd)
        vistos.push(...L.eventos); visao = L.visao
        relogio.t += 500
      }
      if (passouPorTempo) comTempo++
      relogio.t += 1000
      const linha = db.prepare('SELECT * FROM lutas WHERE id = ?').get(L.id)
      assert.equal(linha.status, 'encerrada', `luta ${k} (${jeito}) não encerrou`)
      const res = JSON.parse(linha.resultado)
      motivos[res.motivo] = (motivos[res.motivo] ?? 0) + 1
      const V = jogo.verLuta(c.id, L.id) // a luta refeita a partir do que ficou no banco (semente + comandos)
      const rep = jogo.replay(c.id, L.id)
      const rr = reproduzir({ semente: rep.semente, timeA: rep.timeA, timeB: rep.timeB, comandos: rep.comandos })
      let ok = rr.ok && txt(V.resultado) === txt(res) && txt(rep.resultado) === txt(res)
      if (abandonou) {
        // o fim por abandono não passou pela tela: o que ela viu é tudo antes dele
        ok = ok && txt(V.visao.eventos.slice(0, -1)) === txt(vistos) && V.visao.eventos.at(-1).t === 'fim' && V.visao.eventos.at(-1).motivo === 'abandono'
      } else {
        ok = ok && txt(V.visao.eventos) === txt(vistos) && txt({ ...V.visao, eventos: 0 }) === txt({ ...visao, eventos: 0 })
      }
      // o replay puro (sem o servidor) chega ao mesmo fim quando o fim é de comando
      if (rr.ok && rr.estado.fim) ok = ok && txt(rr.resultado) === txt(res)
      if (!ok) diferentes++
    }
    assert.equal(diferentes, 0, `lutas diferentes: ${diferentes}; motivos ${txt(motivos)}`)
    for (const m of ['derrubou', 'desistiu', 'abandono']) assert.ok(motivos[m] > 0, `nenhuma luta acabou por ${m}: ${txt(motivos)}`)
    assert.ok((motivos.tesoura ?? 0) + (motivos.desempate ?? 0) > 0, `nenhuma luta chegou à Tesoura: ${txt(motivos)}`)
    assert.ok(comTempo >= 30, `poucas lutas com tempo estourado: ${comTempo}`)
    assert.equal(Object.values(jeitos).reduce((a, b) => a + b), 160)
  })
})

// ---------------------------------------------------------------- banco: v3 → v4 com banco usado

describe('tarefa 16 — migração v3 → v4 com banco usado', () => {
  test('apelido repetido na forma nova ganha sufixo; token, luta encerrada e fase continuam; energia cheia', async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'frayz-v3-'))
    const arq = path.join(pasta, 'v3.db')
    const t0 = 1_960_000_000_000
    abrirBanco(arq, { migracoes: MIGRACOES.slice(0, 3), agora: () => t0 }).close()
    const d = new DatabaseSync(arq)
    const nomes = ['Camila', 'Carnila', 'Ana', '.Ana.', 'Bia']
    const ids = {}, tokens = {}
    for (const apelido of nomes) {
      // forma de comparar da v3 (sem acento, sem caixa, I/l/1 e O/0 juntos): todos diferentes nela
      const v3 = apelido.toLowerCase().replace(/[i1]/g, 'l').replace(/0/g, 'o')
      const id = Number(d.prepare('INSERT INTO contas (apelido, apelido_norm, token_hash, criada_em, fase_liberada) VALUES (?, ?, ?, ?, ?)')
        .run(apelido, v3, `sessao:${apelido}`, t0, apelido === 'Bia' ? 3 : 1).lastInsertRowid)
      const token = randomBytes(32).toString('base64url')
      d.prepare('INSERT INTO sessoes (token_hash, conta_id, criada_em, usada_em) VALUES (?, ?, ?, ?)').run(hashDoToken(token), id, t0, t0)
      ids[apelido] = id; tokens[apelido] = token
    }
    const prontos = Object.keys(BONECOS_PRONTOS)
    const timeA = prontos.slice(0, 3).map((p) => {
      const b = gerarBonecoInicial(`semente-${p}`, { id: `bo_${'a'.repeat(24)}` })
      for (const parte of PARTES_DO_BONECO) b.partes[parte].face = BONECOS_PRONTOS[p].partes[parte]
      return paraLuta(b)
    })
    const timeB = prontos.slice(3, 6)
    const e = criarLuta({ semente: 'luta-v3', timeA, timeB })
    for (let i = 0; i < 400 && !e.fim; i++) jogarTurno(e, 'ganancioso')
    const lutaId = `lu_${'c'.repeat(24)}`
    d.prepare(`INSERT INTO lutas (id, conta_id, modo, fase, robo, semente, time_a, time_b, bonecos_a, estado, seq, prazo, status, resultado, criada_em, encerrada_em, versao_motor, tocada_em)
               VALUES (?, ?, 'aventura', 1, 'ganancioso', 'luta-v3', ?, ?, '[]', ?, 0, NULL, 'encerrada', ?, ?, ?, ?, ?)`)
      .run(lutaId, ids.Bia, JSON.stringify(timeA), JSON.stringify(timeB), JSON.stringify({ curtos: e.comandos.map((c) => c) }), JSON.stringify(resultadoDaLuta(e)), t0, t0, VERSAO_DO_MOTOR, t0)
    d.close()

    const s = await iniciar({ dbPath: arq, porta: 0, agora: () => t0 + 60_000, log: () => {} })
    const url = `http://127.0.0.1:${s.porta}`
    const api = async (metodo, caminho, token, corpo) => {
      const r = await fetch(url + caminho, { method: metodo, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined })
      return { status: r.status, json: await r.json() }
    }
    try {
      // regra mudou (R14): o banco ganhou a v5 (Keepmile); a v3 migra até a versão atual, com a cópia da v3 antes
      assert.equal(VERSAO_DO_BANCO, 7) // fixado (parecer R14): v5 do Keepmile + v6 do R16 + v7 do R22 (regra mudou: entrou a v7)
      assert.equal(s.db.prepare('PRAGMA user_version').get().user_version, VERSAO_DO_BANCO)
      assert.ok(fs.readdirSync(path.join(pasta, 'copias')).some((n) => n.startsWith('v3.db.v3.')))
      const ap = Object.fromEntries(s.db.prepare('SELECT id, apelido FROM contas').all().map((c) => [c.id, c.apelido]))
      assert.deepEqual(nomes.map((n) => ap[ids[n]]), ['Camila', 'Carnila 2', 'Ana', '.Ana. 2', 'Bia'])
      for (const n of nomes) {
        const est = await api('GET', '/api/estado', tokens[n])
        assert.equal(est.status, 200, JSON.stringify(est.json))
        assert.equal(est.json.conta.apelido, ap[ids[n]])
        assert.deepEqual(est.json.energia, { atual: 20, maximo: 20, recarregaEm: new Date(viradaDepois(t0 + 60_000)).toISOString() })
        assert.equal(est.json.vitoriasSeguidas, 0)
      }
      assert.equal((await api('GET', '/api/estado', tokens.Bia)).json.faseLiberada, 3)
      for (const apelido of ['Carnila', 'camila', '_Ana']) assert.equal((await api('POST', '/api/conta', null, { apelido })).status, 409, apelido)
      const v = await api('GET', `/api/luta/${lutaId}`, tokens.Bia)
      assert.equal(v.status, 200, JSON.stringify(v.json))
      assert.deepEqual(v.json.resultado, JSON.parse(JSON.stringify(resultadoDaLuta(e))))
    } finally {
      s.servidor.closeAllConnections(); await new Promise((ok) => s.servidor.close(ok))
    }
    const n = fs.readdirSync(path.join(pasta, 'copias')).length
    abrirBanco(arq).close()
    assert.equal(fs.readdirSync(path.join(pasta, 'copias')).length, n)
  })
})
