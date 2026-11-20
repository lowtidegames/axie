// Tarefa R16 — consertos do parecer de segurança do Keepmile (docs/seguranca/parecer-reino-1.md, K1–K6) e migração v6.
// K1 repetir seq antigo e replay sem refazer a partida · K2 placar da estrada do dia só de conta antiga com ranking ·
// K3 fecho da temporada em lotes · K4 modo.json com %xx · K5 aviso do REINO_SEGREDO · K6 repetir partida terminada.
// Rodar: node --test tests/servidor/reino-seguranca16.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ALBUM, CARTAS } from '../../shared/reino/config.js'
import { criarPartida } from '../../shared/reino/partida.js'
import { iniciar } from '../../server/index.mjs'
import { abrirBanco, MIGRACOES, VERSAO_DO_BANCO } from '../../server/db.mjs'
import { criarJogo } from '../../server/jogo.mjs'
import { temporadaDoDia } from '../../server/reino/reino.mjs'

const DIA = 86_400_000
const SEGUNDA = 4 + 7 * 3142 // um dia que é segunda-feira
const T0 = SEGUNDA * DIA + 10 * 3_600_000 // segunda, 10:00 UTC
const folga = { contasPorIp: { max: 100_000, janelaMs: 3_600_000 }, pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 1_000_000, janelaMs: 60_000 } }
const reinoFolgado = {
  partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 },
  replaysPorConta: { max: 100_000, janelaMs: 60_000 }, replaysPorIp: { max: 100_000, janelaMs: 60_000 },
}

async function subir({ dbPath = ':memory:', t = T0, params = {}, reino = {}, ...resto } = {}) {
  const relogio = { t }
  const logs = []
  const s = await iniciar({ dbPath, porta: 0, agora: () => relogio.t, log: (l) => logs.push(l), limites: folga, reino: { params: { ...reinoFolgado, ...params }, ...reino }, ...resto })
  const url = `http://127.0.0.1:${s.porta}`
  async function api(metodo, caminho, token, corpo) {
    const r = await fetch(url + caminho, {
      method: metodo,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
    const texto = await r.text()
    let json = null
    try { json = JSON.parse(texto) } catch { /* não é JSON */ }
    return { status: r.status, json, texto }
  }
  let n = 0
  async function conta(apelido = `Rei ${++n}`) {
    const r = await api('POST', '/api/conta', null, { apelido })
    assert.equal(r.status, 201, r.texto)
    return { id: r.json.conta.id, token: r.json.token, apelido }
  }
  return { s, api, conta, relogio, logs, url }
}
const fechar = (s) => new Promise((ok) => s.servidor.close(ok))

function jogada(r) {
  const o = r.opcoes
  if (o.fase === 'espolio') return o.comandos.find((c) => c.tipo === 'espolio')
  if (!r.visao.cartaPosta) {
    const t = r.visao.terrenos
    const ordem = [...o.oferta].sort((a, b) => (CARTAS[b.carta].tipo === 'tropa') - (CARTAS[a.carta].tipo === 'tropa') || b.levelUp - a.levelUp)
    for (const { carta } of ordem) {
      const porDessa = o.comandos.filter((c) => c.tipo === 'por' && c.carta === carta)
      const escolha = porDessa.find((c) => t[c.terreno - 1]?.carta === carta) ?? porDessa.find((c) => !t[c.terreno - 1])
      if (escolha) return escolha
    }
  }
  return { tipo: 'batalhar' }
}
const abrir = async (api, token, modo) => {
  const r = await api('POST', '/api/reino/partida', token, { modo })
  assert.equal(r.status, 201, r.texto)
  return r.json
}
/** Manda até `max` comandos (ou até acabar). Devolve [última resposta, comandos mandados, respostas]. */
async function jogar(api, token, r, max = 10_000) {
  const cmds = [], resps = []
  for (let i = 0; i < max && r.status === 'aberta'; i++) {
    const c = jogada(r)
    const res = await api('POST', '/api/reino/partida/comando', token, { partida: r.id, seq: r.seq, comando: c })
    assert.equal(res.status, 200, res.texto)
    r = res.json
    cmds.push(c)
    resps.push(r)
  }
  return [r, cmds, resps]
}
const desistir = async (api, token, id) => {
  const d = await api('POST', '/api/reino/partida/desistir', token, { partida: id })
  assert.equal(d.status, 200, d.texto)
  return d.json
}
const motor = (s) => {
  const m = s.reino._interno.motor()
  return m.aplicar + m.reproduzir
}

// ---------------------------------------------------------------- K1

describe('R16 K1 — repetir seq e replay sem refazer a partida', () => {
  test('200 repetições do último seq → resposta guardada; 200 de seq mais antigo → 409; o motor não roda', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const [r, cmds, resps] = await jogar(api, a.token, await abrir(api, a.token, 'treino'), 6)
      assert.equal(r.status, 'aberta')
      const antes = motor(s)
      const ult = r.seq - 1
      for (let i = 0; i < 200; i++) {
        const x = await api('POST', '/api/reino/partida/comando', a.token, { partida: r.id, seq: ult, comando: cmds[ult] })
        assert.equal(x.status, 200, x.texto)
        assert.equal(x.json.repetido, true)
        const { repetido, ...sem } = x.json
        assert.deepEqual(sem, resps[ult])
      }
      for (let i = 0; i < 200; i++) {
        const x = await api('POST', '/api/reino/partida/comando', a.token, { partida: r.id, seq: 1, comando: cmds[1] })
        assert.equal(x.status, 409, x.texto)
        assert.equal(x.json.erro.codigo, 'SEQ_ANTIGA')
        assert.equal(x.json.erro.seq, r.seq)
      }
      assert.equal(motor(s), antes, 'o motor rodou para responder repetição')
      // partida terminada: repetir o último seq e mandar o seq seguinte também não refazem
      const fim = await desistir(api, a.token, r.id)
      const depois = motor(s)
      for (let i = 0; i < 200; i++) {
        const x = await api('POST', '/api/reino/partida/comando', a.token, { partida: r.id, seq: fim.seq - 1, comando: { tipo: 'desistir' } })
        assert.equal(x.status, 200, x.texto)
        assert.equal(x.json.status, 'terminada')
        const y = await api('POST', '/api/reino/partida/comando', a.token, { partida: r.id, seq: fim.seq, comando: { tipo: 'batalhar' } })
        assert.equal(y.json.erro.codigo, 'PARTIDA_ACABOU')
        assert.equal(y.json.erro.partida.status, 'terminada')
      }
      assert.equal(motor(s), depois, 'o motor rodou para responder partida terminada')
    } finally { await fechar(s) }
  })

  test('replay: refeito 1 vez e guardado; limite por IP; passos em páginas quando passa do teto', async () => {
    const { s, api, conta } = await subir({ params: { replayPassosPorPagina: 2 } })
    try {
      const a = await conta()
      const [r] = await jogar(api, a.token, await abrir(api, a.token, 'treino'), 5)
      const fim = await desistir(api, a.token, r.id)
      const total = fim.seq
      const antes = motor(s)
      const passos = []
      let desde = 0, paginas = 0
      while (desde !== null) {
        const x = await api('GET', `/api/reino/replay/${r.id}${desde ? `?desde=${desde}` : ''}`, a.token)
        assert.equal(x.status, 200, x.texto)
        assert.equal(x.json.totalPassos, total)
        assert.equal(x.json.desde, desde)
        assert.ok(x.json.passos.length <= 2)
        passos.push(...x.json.passos)
        desde = x.json.proximo
        paginas++
      }
      assert.equal(paginas, Math.ceil(total / 2))
      const cmds = JSON.parse(s.db.prepare('SELECT comandos FROM reino_partidas WHERE id = ?').get(r.id).comandos)
      assert.deepEqual(passos.map((p) => p.comando), cmds)
      assert.equal(passos.at(-1).visao.pontos, fim.resultado.pontos)
      // refeita UMA vez (1 chamada do motor por comando) para todas as páginas; depois, nada
      assert.equal(motor(s) - antes, total, 'o replay refez a partida mais de uma vez')
      const montado = motor(s)
      for (let i = 0; i < 50; i++) assert.equal((await api('GET', `/api/reino/replay/${r.id}`, a.token)).status, 200)
      assert.equal(motor(s), montado, 'replay guardado refeito de novo')
      for (const q of ['?desde=-1', `?desde=${total + 1}`, '?desde=x', '?desde=1&desde=1', '?outro=1']) {
        assert.equal((await api('GET', `/api/reino/replay/${r.id}${q}`, a.token)).status, 400, q)
      }
    } finally { await fechar(s) }
    // limite por IP: várias contas do mesmo IP somam
    const x = await subir({ params: { replaysPorIp: { max: 3, janelaMs: 60_000 } } })
    try {
      const [b, c] = [await x.conta(), await x.conta()]
      const pb = await abrir(x.api, b.token, 'treino'), pc = await abrir(x.api, c.token, 'treino')
      await desistir(x.api, b.token, pb.id)
      await desistir(x.api, c.token, pc.id)
      const st = []
      for (const [tok, id] of [[b.token, pb.id], [c.token, pc.id], [b.token, pb.id], [c.token, pc.id]]) st.push((await x.api('GET', `/api/reino/replay/${id}`, tok)).status)
      assert.deepEqual(st, [200, 200, 200, 429])
    } finally { await fechar(x.s) }
  })
})

// ---------------------------------------------------------------- K2

describe('R16 K2 — placar da estrada do dia só de conta antiga com ranking', () => {
  test('a conta batedora (criada hoje) joga, fica fora do placar com o motivo e não vê o próprio replay antes da virada', async () => {
    const { s, api, conta, relogio } = await subir({ t: T0 - DIA })
    try {
      // ontem: a Velha joga 1 ranking até o fim; a Parada só cria a conta
      const velha = await conta('Velha'), parada = await conta('Parada')
      const rk = await abrir(api, velha.token, 'ranking')
      await desistir(api, velha.token, rk.id)
      relogio.t = T0
      const batedor = await conta('Batedor')
      const ab = await abrir(api, batedor.token, 'estrada')
      assert.equal(ab.foraDoPlacar.codigo, 'CONTA_NOVA')
      assert.match(ab.foraDoPlacar.motivo, /fora do placar hoje/i)
      const [fb] = await jogar(api, batedor.token, ab)
      assert.equal(fb.status, 'terminada')
      assert.equal(fb.foraDoPlacar.codigo, 'CONTA_NOVA')
      const ap = await abrir(api, parada.token, 'estrada')
      assert.equal(ap.foraDoPlacar.codigo, 'SEM_RANKING')
      await desistir(api, parada.token, ap.id)
      const av = await abrir(api, velha.token, 'estrada')
      assert.equal(av.foraDoPlacar, null)
      const [fv] = await jogar(api, velha.token, av)
      // o placar só tem a Velha, mesmo com o Batedor fazendo os mesmos pontos ou mais
      const placar = (await api('GET', '/api/reino/ranking', batedor.token)).json.estradaDoDia
      assert.deepEqual(placar.lista.map((l) => l.apelido), ['Velha'])
      assert.equal(placar.voce.posicao, null)
      assert.equal(placar.voce.foraDoPlacar.codigo, 'CONTA_NOVA')
      assert.equal(placar.foraDoPlacar.codigo, 'CONTA_NOVA')
      const pv = (await api('GET', '/api/reino/ranking', velha.token)).json.estradaDoDia
      assert.equal(pv.voce.posicao, 1)
      assert.equal(pv.foraDoPlacar, null)
      assert.equal(pv.lista[0].pontos, fv.resultado.pontos)
      // replay da própria estrada de hoje: só depois da virada
      const rp = await api('GET', `/api/reino/replay/${fb.id}`, batedor.token)
      assert.equal(rp.status, 409, rp.texto)
      assert.equal(rp.json.erro.codigo, 'ESTRADA_DE_HOJE')
      assert.equal((await api('GET', `/api/reino/replay/${fv.id}`, velha.token)).status, 409)
      relogio.t = (SEGUNDA + 1) * DIA + 60_000
      const amanha = await api('GET', `/api/reino/replay/${fb.id}`, batedor.token)
      assert.equal(amanha.status, 200, amanha.texto)
      assert.equal(typeof amanha.json.semente, 'string')
      // a do batedor não está no placar: ninguém mais a vê; a da Velha (topo) sim
      assert.equal((await api('GET', `/api/reino/replay/${fb.id}`, velha.token)).status, 404)
      assert.equal((await api('GET', `/api/reino/replay/${fv.id}`, batedor.token)).status, 200)
      // no dia seguinte o batedor (criado ontem) ainda precisa de 1 ranking terminado
      const bb = await abrir(api, batedor.token, 'estrada')
      assert.equal(bb.foraDoPlacar.codigo, 'SEM_RANKING')
      assert.ok(s)
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- K3

describe('R16 K3 — fecho da temporada em lotes', () => {
  test('muitas partidas abertas: fecha em lotes nos pedidos seguintes, sem duplicar títulos', async () => {
    const { s, api, conta, relogio } = await subir({ params: { fechoPorPedido: 3 } })
    try {
      const jogadores = []
      for (let i = 0; i < 7; i++) {
        const c = await conta(`Jogador ${i}`)
        await abrir(api, c.token, 'ranking')
        jogadores.push(c)
      }
      const fora = await conta('Olheiro')
      const temporada = temporadaDoDia(SEGUNDA)
      relogio.t = (SEGUNDA + 7) * DIA + 181 * 60_000
      const abertas = () => s.db.prepare("SELECT COUNT(*) n FROM reino_partidas WHERE temporada = ? AND status = 'aberta'").get(temporada).n
      const fechadas = () => s.db.prepare('SELECT COUNT(*) n FROM reino_temporadas').get().n
      await api('GET', '/api/reino/perfil', fora.token)
      assert.equal(abertas(), 4)
      assert.equal(fechadas(), 0)
      await api('GET', '/api/reino/perfil', fora.token)
      assert.equal(abertas(), 1)
      assert.equal(fechadas(), 0)
      await api('GET', '/api/reino/perfil', fora.token)
      assert.equal(abertas(), 0)
      assert.equal(fechadas(), 1)
      assert.equal(s.db.prepare("SELECT COUNT(*) n FROM reino_partidas WHERE motivo = 'fim_da_temporada'").get().n, 7)
      const n = s.db.prepare('SELECT COUNT(*) n FROM reino_titulos WHERE temporada = ?').get(temporada).n
      await api('GET', '/api/reino/perfil', fora.token)
      s.reino._interno.fecharTemporadas()
      assert.equal(s.db.prepare('SELECT COUNT(*) n FROM reino_titulos WHERE temporada = ?').get(temporada).n, n)
      assert.equal(fechadas(), 1)
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- K4

describe('R16 K4 — modo.json com %xx no caminho', () => {
  test('caminho decodificado e normalizado antes dos arquivos fixos (os dois modo.json)', async () => {
    const { s, url } = await subir()
    try {
      for (const [c, api] of [
        ['/public/%72eino/modo.json', '/api/reino/'], ['/public/reino/modo%2ejson', '/api/reino/'], ['/public/reino/%6D%6F%64%6F.json', '/api/reino/'],
        ['/public/reino/x/%2e%2e/modo.json', '/api/reino/'], ['/public//%72eino//modo.json', '/api/reino/'],
        ['/public/%6dodo.json', '/api/'], ['/public/modo%2Ejson', '/api/'], ['/%70ublic/modo.json', '/api/'],
      ]) {
        const r = await fetch(url + c, { redirect: 'manual' })
        assert.equal(r.status, 200, c)
        assert.deepEqual(await r.json(), { modo: 'servidor', api }, c)
      }
      for (const c of ['/public/reino/modo%E0%A4%A.json', '/public/reino/modo.json%00', '/public/reino/%2e%2e/%2e%2e/server/index.mjs']) {
        const r = await fetch(url + c, { redirect: 'manual' })
        assert.ok([400, 404].includes(r.status), `${c} ${r.status}`)
      }
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- K5

describe('R16 K5 — REINO_SEGREDO', () => {
  const comEnv = async (valor, fn) => {
    const antes = process.env.REINO_SEGREDO
    if (valor === undefined) delete process.env.REINO_SEGREDO
    else process.env.REINO_SEGREDO = valor
    try { return await fn() } finally {
      if (antes === undefined) delete process.env.REINO_SEGREDO
      else process.env.REINO_SEGREDO = antes
    }
  }
  const doBanco = (s, dia) => createHmac('sha256', s.db.prepare("SELECT valor FROM meta WHERE chave = 'reino_segredo'").get().valor).update(`keepmile:estrada:${dia}`).digest('hex')

  test('sem a variável: aviso claro no boot (usa o do banco)', async () => {
    await comEnv(undefined, async () => {
      const { s, logs } = await subir()
      try {
        assert.ok(logs.some((l) => /AVISO.*REINO_SEGREDO/.test(l)), logs.join('\n'))
        assert.equal(s.reino._interno.sementeDaEstrada(SEGUNDA), doBanco(s, SEGUNDA))
      } finally { await fechar(s) }
    })
  })

  test('curta (< 32): aviso e recusa de usá-la (cai no do banco); o valor nunca vai ao log', async () => {
    const curta = 'segredo-curto-demais-1234'
    await comEnv(curta, async () => {
      const { s, logs } = await subir()
      try {
        assert.ok(logs.some((l) => /AVISO.*REINO_SEGREDO.*curt/i.test(l)), logs.join('\n'))
        assert.ok(!logs.some((l) => l.includes(curta)))
        assert.equal(s.reino._interno.sementeDaEstrada(SEGUNDA), doBanco(s, SEGUNDA))
      } finally { await fechar(s) }
    })
  })

  test('boa (32+): usada, sem aviso e sem o valor no log', async () => {
    const boa = 'x'.repeat(40)
    await comEnv(boa, async () => {
      const { s, logs } = await subir()
      try {
        assert.ok(!logs.some((l) => /REINO_SEGREDO/.test(l)), logs.join('\n'))
        assert.ok(!logs.some((l) => l.includes(boa)))
        assert.equal(s.reino._interno.sementeDaEstrada(SEGUNDA), createHmac('sha256', boa).update(`keepmile:estrada:${SEGUNDA}`).digest('hex'))
      } finally { await fechar(s) }
    })
  })
})

// ---------------------------------------------------------------- K6

describe('R16 K6 — repetir comando em partida terminada fora do comando', () => {
  test('terminada por tempo e por fecho da temporada: a repetição diz "terminada" com o resultado', async () => {
    const { api, conta, relogio, s } = await subir()
    try {
      const a = await conta()
      const t = await abrir(api, a.token, 'treino')
      const ct = jogada(t)
      const r1 = await api('POST', '/api/reino/partida/comando', a.token, { partida: t.id, seq: 0, comando: ct })
      assert.equal(r1.json.status, 'aberta')
      const b = await conta()
      const rk = await abrir(api, b.token, 'ranking')
      const ck = jogada(rk)
      assert.equal((await api('POST', '/api/reino/partida/comando', b.token, { partida: rk.id, seq: 0, comando: ck })).status, 200)
      // por tempo
      relogio.t += 181 * 60_000
      const x = await api('POST', '/api/reino/partida/comando', a.token, { partida: t.id, seq: 0, comando: ct })
      assert.equal(x.status, 200, x.texto)
      assert.equal(x.json.status, 'terminada')
      assert.equal(x.json.opcoes, null)
      assert.equal(x.json.prazo, null)
      assert.equal(x.json.resultado.motivo, 'tempo')
      assert.deepEqual(x.json.visao, r1.json.visao)
      // por fecho da temporada (a conta b não pediu nada até o fecho)
      relogio.t = (SEGUNDA + 7) * DIA + 181 * 60_000
      await api('GET', '/api/reino/perfil', a.token)
      assert.equal(s.db.prepare('SELECT motivo FROM reino_partidas WHERE id = ?').get(rk.id).motivo, 'fim_da_temporada')
      const y = await api('POST', '/api/reino/partida/comando', b.token, { partida: rk.id, seq: 0, comando: ck })
      assert.equal(y.status, 200, y.texto)
      assert.equal(y.json.status, 'terminada')
      assert.equal(y.json.resultado.motivo, 'fim_da_temporada')
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- migração v6

describe('R16 — migração v5 → v6 (resposta guardada na linha da partida)', () => {
  test('banco usado da v5 com partida aberta: cópia antes, v6 depois, a partida segue e a repetição usa a resposta guardada', async () => {
    // regra mudou (R22): entrou a v7; a v5 migra por v6 até ela (a parte da v6 é a mesma)
    // regra mudou (R39): entrou a v8 (só dados: conquistas de degrau)
    assert.equal(VERSAO_DO_BANCO, 9) // regra mudou (R46): entrou a v9 (regra de cada partida)
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'keepmile-v5-'))
    const arq = path.join(pasta, 'v5.db')
    const db5 = abrirBanco(arq, { migracoes: MIGRACOES.slice(0, 5), agora: () => T0 })
    const jogo = criarJogo(db5, { agora: () => T0, log: () => {} })
    const { conta, token } = jogo.criarConta('Antiga')
    const e = criarPartida({ semente: 'f'.repeat(32), cartasLiberadas: ALBUM.inicial.slice() })
    const id = `pa_${'a'.repeat(24)}`
    db5.prepare(`INSERT INTO reino_partidas (id, conta_id, modo, dia, temporada, semente, liberadas, estado, status, criada_em, tocada_em)
                 VALUES (?, ?, 'treino', ?, ?, ?, ?, ?, 'aberta', ?, ?)`).run(id, conta.id, SEGUNDA, temporadaDoDia(SEGUNDA), 'f'.repeat(32), JSON.stringify(e.liberadas), JSON.stringify(e), T0, T0)
    assert.equal(db5.prepare('PRAGMA user_version').get().user_version, 5)
    db5.close()
    const { s, api } = await subir({ dbPath: arq, t: T0 + 60_000 })
    try {
      assert.equal(s.db.prepare('PRAGMA user_version').get().user_version, 9) // regra mudou (R46): entrou a v9 (regra de cada partida)
      const copias = fs.readdirSync(path.join(pasta, 'copias')).filter((n) => n.startsWith('v5.db.v5.'))
      assert.equal(copias.length, 1)
      const c = new DatabaseSync(path.join(pasta, 'copias', copias[0]), { readOnly: true })
      assert.equal(c.prepare('PRAGMA user_version').get().user_version, 5)
      assert.equal(c.prepare('SELECT COUNT(*) n FROM reino_partidas').get().n, 1)
      c.close()
      const g = (await api('GET', '/api/reino/partida', token)).json.partida
      assert.equal(g.id, id)
      const cmd = jogada(g)
      const r1 = await api('POST', '/api/reino/partida/comando', token, { partida: id, seq: 0, comando: cmd })
      assert.equal(r1.status, 200, r1.texto)
      assert.ok(s.db.prepare('SELECT resposta FROM reino_partidas WHERE id = ?').get(id).resposta)
      const antes = motor(s)
      const r2 = await api('POST', '/api/reino/partida/comando', token, { partida: id, seq: 0, comando: cmd })
      assert.equal(r2.json.repetido, true)
      assert.equal(motor(s), antes)
    } finally { await fechar(s) }
  })
})
