// R46 (servidor) — a REVANCHE no servidor: regra gravada por partida (banco v9), comando `trocar` e `visao.revanche`
// (docs/reino/r46-desenho.md). Partida de antes da v9 fica com a regra 1 (horda nova depois de perder), idêntica.
// Rodar: node --test tests/servidor/reino-r46.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { ALBUM, CARTAS, PARTIDA } from '../../shared/reino/config.js'
import { aplicar, criarPartida, reproduzir, visao } from '../../shared/reino/partida.js'
import { escolher } from '../../shared/reino/robos.js'
import { criarRng } from '../../shared/rng.js'
import { iniciar } from '../../server/index.mjs'
import { abrirBanco, MIGRACOES, VERSAO_DO_BANCO } from '../../server/db.mjs'
import { temporadaDoDia } from '../../server/reino/reino.mjs'
import { criarJogo } from '../../server/jogo.mjs'

const DIA = 86_400_000
const HORA = 3_600_000
const SEGUNDA = 4 + 7 * 3150
const T0 = SEGUNDA * DIA + 10 * HORA // segunda, 10:00 UTC
const folga = { contasPorIp: { max: 100_000, janelaMs: 3_600_000 }, pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 1_000_000, janelaMs: 60_000 } }
const reinoFolgado = {
  partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 },
  replaysPorConta: { max: 100_000, janelaMs: 60_000 }, replaysPorIp: { max: 100_000, janelaMs: 60_000 },
}

async function subir({ t = T0, dbPath = ':memory:' } = {}) {
  const relogio = { t }
  const s = await iniciar({ dbPath, porta: 0, agora: () => relogio.t, log: () => {}, limites: folga, reino: { params: reinoFolgado } })
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
  async function conta(apelido = `Revanche ${++n}`) {
    const r = await api('POST', '/api/conta', null, { apelido })
    assert.equal(r.status, 201, r.texto)
    return { id: r.json.conta.id, token: r.json.token }
  }
  return { s, api, conta, relogio }
}
const fechar = (s) => new Promise((ok) => s.servidor.close(ok))
const abrir = async (api, token, modo = 'treino') => {
  const r = await api('POST', '/api/reino/partida', token, { modo })
  assert.equal(r.status, 201, r.texto)
  return r.json
}
const cmd = (api, token, p, comando) => api('POST', '/api/reino/partida/comando', token, { partida: p.id, seq: p.seq, comando })
/** Põe uma Tropa da mão no terreno k. */
const porTropa = (p, k) => ({ tipo: 'por', carta: p.opcoes.oferta.find((o) => CARTAS[o.carta].tipo === 'tropa').carta, terreno: k })

/** Joga uma partida de regra 1 inteira com o robô (como o servidor de antes gravaria) e devolve comandos e estado final. */
function partidaAntiga(semente) {
  const rng = criarRng(`r46s:${semente}`)
  let e = criarPartida({ semente, cartasLiberadas: ALBUM.inicial })
  const comandos = []
  while (e.fase !== 'fim') {
    const c = escolher('ganancioso', e, (n) => rng.inteiro(n))
    const r = aplicar(e, c, { eventos: false })
    assert.equal(r.ok, true)
    comandos.push(c)
    e = r.estado
  }
  return { comandos, estado: e }
}
const pid = (k) => `pa_${String(k).padStart(2, '0').repeat(12)}`

/** Banco v8 USADO: 2 partidas terminadas (com comandos) e 1 aberta, gravadas como o servidor de antes gravava. */
function bancoV8Usado(arq) {
  const db8 = abrirBanco(arq, { migracoes: MIGRACOES.slice(0, 8), agora: () => T0 })
  const jogo = criarJogo(db8, { agora: () => T0, log: () => {} })
  const vet = jogo.criarConta('Antiga Um')
  const dia = Math.floor(T0 / DIA)
  db8.prepare("INSERT INTO reino_contas (conta_id, rodadas_vencidas, partidas, recorde, energia_saldo, energia_dia, conquistas, conquistas_quando, criada_em) VALUES (?, 40, 2, 900, 3, ?, '[\"supper\"]', '{}', ?)")
    .run(vet.conta.id, dia, T0 - 30 * DIA)
  const terminadas = []
  for (const k of [1, 2]) {
    const semente = `ab${k}`.repeat(8)
    const { comandos, estado } = partidaAntiga(semente)
    const q = T0 - (5 - k) * HORA
    db8.prepare(`INSERT INTO reino_partidas (id, conta_id, modo, dia, temporada, semente, liberadas, comandos, tempos, seq, status, motivo, pontos, vencidas, rodada,
                 conferida, criada_em, tocada_em, terminada_em) VALUES (?, ?, 'treino', ?, ?, ?, ?, ?, ?, ?, 'terminada', ?, ?, ?, ?, 1, ?, ?, ?)`)
      .run(pid(k), vet.conta.id, dia, temporadaDoDia(dia), semente, JSON.stringify(ALBUM.inicial), JSON.stringify(comandos), JSON.stringify(comandos.map(() => 100)),
        comandos.length, estado.fim.motivo, estado.fim.pontos, estado.vencidas, estado.rodada, q, q, q)
    terminadas.push({ id: pid(k), semente, comandos, estado })
  }
  // aberta (treino), no começo: reino vazio, perder a 1ª luta não acaba a partida
  const sementeAberta = 'cd'.repeat(16)
  const aberta = criarPartida({ semente: sementeAberta, cartasLiberadas: ALBUM.inicial })
  db8.prepare(`INSERT INTO reino_partidas (id, conta_id, modo, dia, temporada, semente, liberadas, estado, status, criada_em, tocada_em)
               VALUES (?, ?, 'ranking', ?, ?, ?, ?, ?, 'aberta', ?, ?)`)
    .run(pid(9), vet.conta.id, dia, temporadaDoDia(dia), sementeAberta, JSON.stringify(aberta.liberadas), JSON.stringify(aberta), T0 - HORA, T0 - HORA)
  assert.equal(db8.prepare('PRAGMA user_version').get().user_version, 8)
  db8.close()
  return { token: vet.token, terminadas, aberta: { id: pid(9), estado: aberta } }
}

/** Liga a escuta do console.log (a cópia do banco é escrita ali) enquanto `fn` roda. */
async function comLog(fn) {
  const linhas = []
  const antes = console.log
  console.log = (...x) => { linhas.push(x.join(' ')) }
  try { return { r: await fn(), linhas } } finally { console.log = antes }
}

// ---------------------------------------------------------------- 1. banco v8 usado → v9
describe('R46 — migração v9 (regra da partida)', () => {
  test('v8 usado → v9: cópia antes (no log); antigas com regra 1 e replay idêntico; a aberta antiga segue com horda NOVA e recusa trocar; 2º boot não muda nada', async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'keepmile-v8-'))
    const arq = path.join(pasta, 'v8.db')
    const usado = bancoV8Usado(arq)

    const { r: sub, linhas } = await comLog(() => subir({ dbPath: arq, t: T0 + 60_000 }))
    const { s, api } = sub
    let foto
    try {
      assert.equal(VERSAO_DO_BANCO, 9)
      assert.equal(s.db.prepare('PRAGMA user_version').get().user_version, 9)
      const copias = fs.readdirSync(path.join(pasta, 'copias')).filter((n) => n.startsWith('v8.db.v8.'))
      assert.equal(copias.length, 1, copias.join(','))
      assert.ok(linhas.some((l) => l === `cópia do banco: ${copias[0]}`), linhas.join(' | '))
      const c = new DatabaseSync(path.join(pasta, 'copias', copias[0]), { readOnly: true })
      assert.equal(c.prepare('PRAGMA user_version').get().user_version, 8)
      assert.equal(c.prepare('SELECT COUNT(*) n FROM reino_partidas').get().n, 3)
      assert.equal(c.prepare("SELECT COUNT(*) n FROM pragma_table_info('reino_partidas') WHERE name = 'regra'").get().n, 0)
      c.close()
      assert.deepEqual(s.db.prepare('SELECT id, regra FROM reino_partidas ORDER BY id').all().map((x) => ({ ...x })), [
        { id: pid(1), regra: 1 }, { id: pid(2), regra: 1 }, { id: pid(9), regra: 1 },
      ])

      // replay das terminadas: idêntico ao motor de regra 1
      for (const t of usado.terminadas) {
        const r = await api('GET', `/api/reino/replay/${t.id}`, usado.token)
        assert.equal(r.status, 200, r.texto)
        assert.equal(r.json.regra, 1)
        assert.equal(r.json.totalPassos, t.comandos.length)
        let e = criarPartida({ semente: t.semente, cartasLiberadas: ALBUM.inicial })
        assert.deepEqual(r.json.inicio, visao(e))
        r.json.passos.forEach((p, i) => {
          const x = aplicar(e, t.comandos[i])
          e = x.estado
          assert.deepEqual(p.comando, t.comandos[i])
          assert.deepEqual(p.visao, JSON.parse(JSON.stringify(visao(e))), `${t.id} passo ${i}`)
          assert.equal('revanche' in p.visao, false)
        })
        assert.deepEqual(r.json.resultado, { motivo: t.estado.fim.motivo, pontos: t.estado.fim.pontos, vencidas: t.estado.vencidas, rodada: t.estado.rodada, conta: true, venceu: t.estado.vencidas >= PARTIDA.rodadaDaVitoria })
      }
      // a última terminada é remontada pelo servidor (refazer, com a regra da linha) e bate com o motor de regra 1
      const ult = (await api('GET', '/api/reino/partida/ultima?modo=treino', usado.token)).json.partida
      assert.equal(ult.regra, 1)
      assert.deepEqual(ult.visao, JSON.parse(JSON.stringify(visao(usado.terminadas[1].estado))))

      // a aberta antiga: perder traz horda NOVA (regra 1), sem revanche; trocar é recusado
      let p = (await api('GET', '/api/reino/partida?modo=ranking', usado.token)).json.partida
      assert.equal(p.id, usado.aberta.id)
      assert.equal(p.regra, 1)
      assert.equal('revanche' in p.visao, false)
      const r = await cmd(api, usado.token, p, { tipo: 'batalhar' })
      assert.equal(r.status, 200, r.texto)
      p = r.json
      const esperado = aplicar(usado.aberta.estado, { tipo: 'batalhar' }).estado
      assert.equal(p.visao.ultima.vitoria, false)
      assert.equal(p.visao.vidas, PARTIDA.vidas - 1)
      assert.deepEqual(p.visao.horda, visao(esperado).horda, 'horda nova, a da regra 1')
      assert.equal('revanche' in p.visao, false)
      assert.equal(p.opcoes.comandos.some((c) => c.tipo === 'trocar'), false)
      const tr = await cmd(api, usado.token, p, { tipo: 'trocar', a: 1, b: 2 })
      assert.equal(tr.status, 422, tr.texto)
      assert.equal(tr.json.erro.motivoDoMotor, 'sem_troca')
      // termina pelo servidor (desistir): conferida com a regra 1
      const fim = await api('POST', '/api/reino/partida/desistir', usado.token, { partida: p.id })
      assert.equal(fim.status, 200, fim.texto)
      assert.equal(fim.json.resultado.conta, true)
      foto = { partidas: s.db.prepare('SELECT * FROM reino_partidas ORDER BY id').all(), contas: s.db.prepare('SELECT * FROM reino_contas ORDER BY conta_id').all() }
    } finally { await fechar(s) }

    // 2º boot: nada a migrar, nenhuma cópia nova, nada muda
    const { r: sub2, linhas: linhas2 } = await comLog(() => subir({ dbPath: arq, t: T0 + 120_000 }))
    try {
      assert.equal(sub2.s.db.prepare('PRAGMA user_version').get().user_version, 9)
      assert.deepEqual(sub2.s.db.prepare('SELECT * FROM reino_partidas ORDER BY id').all(), foto.partidas)
      assert.deepEqual(sub2.s.db.prepare('SELECT * FROM reino_contas ORDER BY conta_id').all(), foto.contas)
      assert.equal(fs.readdirSync(path.join(pasta, 'copias')).length, 1)
      assert.equal(linhas2.some((l) => l.startsWith('cópia do banco')), false)
    } finally { await fechar(sub2.s) }
  })
})

// ---------------------------------------------------------------- 2. partida nova: regra 2, revanche e troca
describe('R46 — partida nova com a revanche', () => {
  test('nasce com regra 2; perdeu → mesma horda e visao.revanche; uma troca aceita, a segunda recusada; seconds e venceu saem; replay de regra 2 bate', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      let p = await abrir(api, a.token)
      assert.equal(p.regra, 2)
      assert.equal(s.db.prepare('SELECT regra FROM reino_partidas WHERE id = ?').get(p.id).regra, 2)
      assert.deepEqual(p.visao.revanche, { troca: false, dica: null })
      assert.equal(p.opcoes.comandos.some((c) => c.tipo === 'trocar'), false)
      // troca fora da revanche: recusada pelo motor
      let r = await cmd(api, a.token, p, { tipo: 'trocar', a: 1, b: 2 })
      assert.equal(r.status, 422, r.texto)
      const motivo = (x) => x.json.erro.motivoDoMotor
      assert.equal(motivo(r), 'sem_troca')

      // perde com o reino vazio: a MESMA horda volta, com a troca valendo
      const horda = p.visao.horda
      r = await cmd(api, a.token, p, { tipo: 'batalhar' })
      assert.equal(r.status, 200, r.texto)
      p = r.json
      assert.equal(p.visao.ultima.vitoria, false)
      assert.deepEqual(p.visao.horda, horda, 'a mesma horda')
      assert.deepEqual(p.visao.revanche, { troca: true, dica: null }) // reino vazio: nenhuma troca muda nada
      // dois terrenos vazios: recusada sem gastar a troca
      r = await cmd(api, a.token, p, { tipo: 'trocar', a: 1, b: 2 })
      assert.equal(r.status, 422)
      assert.equal(motivo(r), 'terreno_vazio')
      // põe uma Tropa no terreno 1 e troca 1 ↔ 2
      r = await cmd(api, a.token, p, porTropa(p, 1))
      assert.equal(r.status, 200, r.texto)
      p = r.json
      assert.equal(p.visao.revanche.troca, true)
      assert.ok(p.opcoes.comandos.some((c) => c.tipo === 'trocar' && c.a === 1 && c.b === 2))
      const tropa = p.visao.terrenos[0]
      r = await cmd(api, a.token, p, { tipo: 'trocar', a: 1, b: 2 })
      assert.equal(r.status, 200, r.texto)
      p = r.json
      assert.deepEqual(p.eventos, [{ tipo: 'troca', a: 1, b: 2 }])
      assert.deepEqual(p.visao.terrenos[1], tropa)
      assert.equal(p.visao.terrenos[0], null)
      assert.deepEqual(p.visao.revanche, { troca: false, dica: null })
      // repetir o mesmo seq devolve a mesma resposta (não troca de novo)
      const rep = await api('POST', '/api/reino/partida/comando', a.token, { partida: p.id, seq: p.seq - 1, comando: { tipo: 'trocar', a: 1, b: 2 } })
      assert.equal(rep.status, 200, rep.texto)
      assert.equal(rep.json.repetido, true)
      // segunda troca recusada
      r = await cmd(api, a.token, p, { tipo: 'trocar', a: 2, b: 3 })
      assert.equal(r.status, 422)
      assert.equal(motivo(r), 'sem_troca')
      // luta a revanche: vencendo, sai seconds (e supper)
      r = await cmd(api, a.token, p, { tipo: 'batalhar' })
      assert.equal(r.status, 200, r.texto)
      p = r.json
      assert.deepEqual(p.visao.revanche, { troca: false, dica: null })
      assert.equal(p.visao.ultima.vitoria, true, 'uma Tropa vence os 2 Scoffers da rodada 1')
      assert.ok(p.novidades.conquistas.includes('seconds'), p.novidades.conquistas.join(','))
      assert.ok(p.novidades.conquistas.includes('supper'))
      const fim = await api('POST', '/api/reino/partida/desistir', a.token, { partida: p.id })
      assert.equal(fim.status, 200, fim.texto)
      assert.equal(fim.json.regra, 2)
      assert.equal(fim.json.resultado.conta, true, 'conferida pelo servidor com a regra 2')
      assert.equal(typeof fim.json.resultado.venceu, 'boolean')

      // replay conferido: a regra 2, a troca nos passos, e o motor de regra 2 dá o mesmo
      const rp = await api('GET', `/api/reino/replay/${p.id}`, a.token)
      assert.equal(rp.status, 200, rp.texto)
      assert.equal(rp.json.regra, 2)
      const cmds = rp.json.passos.map((x) => x.comando)
      assert.ok(cmds.some((c) => c.tipo === 'trocar'))
      const linha = s.db.prepare('SELECT semente, comandos, liberadas FROM reino_partidas WHERE id = ?').get(p.id)
      assert.deepEqual(JSON.parse(linha.comandos), cmds)
      const ref = reproduzir({ semente: linha.semente, cartasLiberadas: JSON.parse(linha.liberadas), comandos: cmds, regra: 2 })
      assert.equal(ref.ok, true)
      assert.deepEqual(rp.json.passos.at(-1).visao, JSON.parse(JSON.stringify(visao(ref.estado))))
      assert.ok(rp.json.passos.some((x) => x.eventos.some((ev) => ev.tipo === 'troca')))
      assert.ok(rp.json.passos[0].visao.revanche, 'visao da regra 2 traz revanche')
      // a última terminada, remontada (refazer com a regra 2)
      s.db.prepare('UPDATE reino_partidas SET resposta = NULL WHERE id = ?').run(p.id)
      const ult = (await api('GET', '/api/reino/partida/ultima?modo=treino', a.token)).json.partida
      assert.equal(ult.regra, 2)
      assert.deepEqual(ult.visao, JSON.parse(JSON.stringify(visao(ref.estado))))
    } finally { await fechar(s) }
  })

  test('jogando até o fim pela rota: vitórias dão conquistas e o resultado traz venceu; a partida é conferida', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      let p = await abrir(api, a.token)
      const ganhas = []
      for (let g = 0; g < 400 && p.status === 'aberta'; g++) {
        const o = p.opcoes
        let c
        if (p.visao.revanche?.troca && p.visao.revanche.dica) c = { tipo: 'trocar', ...p.visao.revanche.dica }
        else if (o.fase === 'espolio') c = o.comandos.find((x) => x.tipo === 'espolio')
        else if (!p.visao.cartaPosta) c = o.comandos.find((x) => x.tipo === 'por' && CARTAS[x.carta].tipo === 'tropa' && !p.visao.terrenos[x.terreno - 1]) ?? o.comandos.find((x) => x.tipo === 'por') ?? { tipo: 'batalhar' }
        else c = { tipo: 'batalhar' }
        const r = await cmd(api, a.token, p, c)
        assert.equal(r.status, 200, `${JSON.stringify(c)} ${r.texto}`)
        p = r.json
        ganhas.push(...p.novidades.conquistas)
      }
      assert.equal(p.status, 'terminada')
      assert.ok(ganhas.includes('supper'), ganhas.join(','))
      assert.equal(p.resultado.conta, true)
      assert.equal(p.resultado.venceu, p.resultado.vencidas >= PARTIDA.rodadaDaVitoria)
      const perfil = (await api('GET', '/api/reino/perfil', a.token)).json
      for (const id of ganhas) assert.equal(perfil.conquistas.find((x) => x.id === id).feita, true, id)
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- 3. a rota confere a e b
describe('R46 — rota do comando: a e b só no trocar', () => {
  test('a/b fora do trocar, fora de 1..6, de tipo errado ou faltando: 400', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      const p = await abrir(api, a.token)
      const ruins = [
        { tipo: 'batalhar', a: 1 }, { tipo: 'sortear', b: 2 }, { tipo: 'por', carta: 'T01', terreno: 1, a: 1, b: 2 }, { tipo: 'espolio', indice: 0, a: 1 },
        { tipo: 'trocar', a: 0, b: 2 }, { tipo: 'trocar', a: 1, b: 7 }, { tipo: 'trocar', a: '1', b: 2 }, { tipo: 'trocar', a: 1.5, b: 2 },
        { tipo: 'trocar', a: 1 }, { tipo: 'trocar' }, { tipo: 'trocar', a: 1, b: 2, terreno: 3 }, { tipo: 'trocar', a: 1, b: 2, c: 3 },
        { tipo: 'trocar', a: null, b: 2 }, { tipo: 'trocar', a: -1, b: 2 },
      ]
      for (const comando of ruins) {
        const r = await cmd(api, a.token, p, comando)
        assert.equal(r.status, 400, `${JSON.stringify(comando)} → ${r.status} ${r.texto}`)
      }
      // nada foi aplicado
      assert.equal(s.db.prepare('SELECT seq FROM reino_partidas WHERE id = ?').get(p.id).seq, 0)
      // bem formado chega ao motor (que recusa: fora da revanche)
      const r = await cmd(api, a.token, p, { tipo: 'trocar', a: 6, b: 1 })
      assert.equal(r.status, 422, r.texto)
    } finally { await fechar(s) }
  })
})
