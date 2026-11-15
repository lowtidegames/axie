// Tarefa 13 (parecer de segurança nº 1): banco alheio (A8), cópia antes de migrar e migração v1 → v2 com "banco usado"
// (apelidos repetidos, sessão antiga, luta aberta do motor 1 que é cancelada sem vencedor e sem desgaste).
// Rodar: npm test  (ou: node --test tests/servidor/banco.test.js)
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { criarLuta } from '../../shared/batalha.js'
import { BONECOS_PRONTOS } from '../../shared/config.js'
import { PARTES_DO_BONECO, gerarBonecoInicial, paraLuta } from '../../shared/costura.js'
import { abrirBanco, MIGRACOES, VERSAO_DO_BANCO } from '../../server/db.mjs'
import { iniciar } from '../../server/index.mjs'

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'frayz-banco2-'))
const hashDoArquivo = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const hashDoToken = (t) => createHash('sha256').update(t).digest('hex')

describe('A8 — banco que não é do Frayz', () => {
  test('arquivo SQLite com tabelas mas sem a marca: recusa com erro claro, sem migrar, sem cópia e sem tocar no arquivo', () => {
    const sub = fs.mkdtempSync(path.join(pasta, 'alheio-'))
    const arq = path.join(sub, 'alheio.db')
    const d = new DatabaseSync(arq)
    d.exec('CREATE TABLE jogadores (id INTEGER PRIMARY KEY, saldo INTEGER); INSERT INTO jogadores (saldo) VALUES (1000)')
    d.close()
    const antes = hashDoArquivo(arq), arquivosAntes = fs.readdirSync(sub)
    for (const modo of ['teste', 'producao']) assert.throws(() => abrirBanco(arq, { modo }), /não é um banco do Frayz/)
    assert.equal(hashDoArquivo(arq), antes, 'o arquivo mudou')
    assert.deepEqual(fs.readdirSync(sub), arquivosAntes, 'criou arquivo ao lado (cópia, -wal ou -shm)')
  })

  test('com versão marcada mas sem as tabelas/marca do Frayz, ou arquivo que nem é SQLite: recusa', () => {
    const arq = path.join(pasta, 'versao-falsa.db')
    const d = new DatabaseSync(arq)
    d.exec('CREATE TABLE meta (chave TEXT, valor TEXT); PRAGMA user_version = 2')
    d.close()
    const antes = hashDoArquivo(arq)
    assert.throws(() => abrirBanco(arq), /não é um banco do Frayz/)
    assert.equal(hashDoArquivo(arq), antes)
    const texto = path.join(pasta, 'texto.db')
    fs.writeFileSync(texto, 'isto não é um banco, é um texto qualquer com mais de cem letras '.repeat(4))
    const antesT = hashDoArquivo(texto)
    assert.throws(() => abrirBanco(texto), /não (é um banco SQLite|é um banco do Frayz)/)
    assert.equal(hashDoArquivo(texto), antesT)
  })

  test('banco do Frayz novo ganha a marca; banco v2 sem a marca é recusado', () => {
    const arq = path.join(pasta, 'marca.db')
    const db = abrirBanco(arq)
    assert.equal(db.prepare("SELECT valor FROM meta WHERE chave = 'marca'").get().valor, 'frayz')
    db.prepare("DELETE FROM meta WHERE chave = 'marca'").run()
    db.close()
    assert.throws(() => abrirBanco(arq), /não é um banco do Frayz/)
  })
})

// ---------------------------------------------------------------- banco usado da versão 1

/** Monta um banco da VERSÃO 1 com dados, como o servidor antigo deixava. */
function bancoV1(arq, t0) {
  abrirBanco(arq, { migracoes: MIGRACOES.slice(0, 1), agora: () => t0 }).close()
  const d = new DatabaseSync(arq)
  const tokens = {}
  const novaConta = d.prepare('INSERT INTO contas (apelido, token_hash, criada_em) VALUES (?, ?, ?)')
  const novoBoneco = d.prepare("INSERT INTO bonecos (id, conta_id, dados, estado, ocupado_por, versao, criado_em) VALUES (?, ?, ?, 'ativo', ?, 0, ?)")
  const contas = {}
  for (const apelido of ['Ana', ' ana ', 'ANA', 'Bia', 'Nome Bem Comprido Já', 'nome bem comprido já']) {
    const token = randomBytes(32).toString('base64url')
    const id = Number(novaConta.run(apelido, hashDoToken(token), t0).lastInsertRowid)
    tokens[apelido] = token
    contas[apelido] = { id, bonecos: [] }
    for (const pronto of Object.keys(BONECOS_PRONTOS)) {
      const b = gerarBonecoInicial(randomBytes(16).toString('hex'), { id: `bo_${randomBytes(12).toString('hex')}` })
      for (const p of PARTES_DO_BONECO) b.partes[p].face = BONECOS_PRONTOS[pronto].partes[p]
      b.pronto = pronto
      const dados = { ...b }; delete dados.id
      novoBoneco.run(b.id, id, JSON.stringify(dados), null, t0)
      contas[apelido].bonecos.push({ id: b.id, b })
    }
  }
  // Ana: uma luta ABERTA do motor 1 (sorteio de 32 bits num número; sem mesa) com 3 bonecos ocupados,
  // uma resposta guardada no formato antigo e uma luta já ENCERRADA do motor 1.
  const ana = contas.Ana
  const novaLuta = d.prepare(`INSERT INTO lutas (id, conta_id, modo, fase, robo, semente, time_a, time_b, bonecos_a, estado, seq, prazo, status, resultado, criada_em, encerrada_em)
    VALUES (?, ?, 'livre', NULL, 'ganancioso', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const velha = (fim) => {
    const defs = ana.bonecos.slice(0, 3).map((x) => paraLuta(x.b))
    const e = criarLuta({ semente: 'semente-velha', timeA: defs, timeB: Object.keys(BONECOS_PRONTOS).slice(0, 3) })
    e.versao = 1; e.rng = 123456789
    for (const k of ['A', 'B']) delete e.times[k].mesa
    if (fim) e.fim = { vencedor: 'A', motivo: 'derrubou', turno: 3, pct: { A: 1, B: 0 } }
    return { defs, e }
  }
  const aberta = `lu_${'a'.repeat(24)}`, fechada = `lu_${'b'.repeat(24)}`
  { const { defs, e } = velha(true); novaLuta.run(fechada, ana.id, 'semente-velha', JSON.stringify(defs), '[]', JSON.stringify(ana.bonecos.slice(3, 6).map((x) => x.id)), JSON.stringify(e), 0, null, 'encerrada', JSON.stringify(e.fim), t0, t0) }
  { const { defs, e } = velha(false); novaLuta.run(aberta, ana.id, 'semente-velha', JSON.stringify(defs), '[]', JSON.stringify(ana.bonecos.slice(0, 3).map((x) => x.id)), JSON.stringify(e), 1, t0 + 20_000, 'aberta', null, t0, null) }
  d.prepare("UPDATE bonecos SET ocupado_por = ? WHERE id IN (?, ?, ?)").run(aberta, ...ana.bonecos.slice(0, 3).map((x) => x.id))
  d.prepare('INSERT INTO luta_respostas (luta_id, seq, comando, resposta) VALUES (?, 0, ?, ?)').run(aberta, '{"tipo":"passar"}', JSON.stringify({ id: aberta, visao: { grande: 'x'.repeat(5000) } }))
  d.prepare('INSERT INTO luta_respostas (luta_id, seq, comando, resposta) VALUES (?, 0, ?, ?)').run(fechada, '{"tipo":"passar"}', '{"visao":{}}')
  d.close()
  return { tokens, contas, aberta, fechada }
}

describe('migração v1 → v2 com banco usado', () => {
  test('cópia antes; apelidos repetidos ganham sufixo; token antigo continua; luta aberta do motor 1 é cancelada sem vencedor e sem desgaste', async () => {
    const sub = fs.mkdtempSync(path.join(pasta, 'usado-'))
    const arq = path.join(sub, 'usado.db')
    let t = 1_950_000_000_000
    const v1 = bancoV1(arq, t)
    t += 3 * 3_600_000

    const s = await iniciar({ dbPath: arq, porta: 0, agora: () => t, log: () => {} })
    const url = `http://127.0.0.1:${s.porta}`
    const api = async (metodo, caminho, token, corpo) => {
      const r = await fetch(url + caminho, { method: metodo, headers: { Authorization: `Bearer ${token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined })
      return { status: r.status, json: await r.json() }
    }
    try {
      assert.equal(s.db.prepare('PRAGMA user_version').get().user_version, VERSAO_DO_BANCO)
      const copias = fs.readdirSync(path.join(sub, 'copias'))
      assert.ok(copias.some((n) => n.startsWith(`usado.db.v1.${t}`)), copias.join(','))

      // apelidos: o mais antigo fica com o nome; os repetidos ganham " 2", " 3" (sem passar de 20 letras); índice único
      const ap = Object.fromEntries(s.db.prepare('SELECT id, apelido, apelido_norm FROM contas').all().map((c) => [c.id, c]))
      assert.equal(ap[v1.contas.Ana.id].apelido, 'Ana')
      assert.equal(ap[v1.contas[' ana '].id].apelido, 'ana 2')
      assert.equal(ap[v1.contas.ANA.id].apelido, 'ANA 3')
      assert.equal(ap[v1.contas.Bia.id].apelido, 'Bia')
      assert.equal(ap[v1.contas['Nome Bem Comprido Já'].id].apelido, 'Nome Bem Comprido Já')
      assert.equal(ap[v1.contas['nome bem comprido já'].id].apelido, 'nome bem comprido 2')
      assert.equal(new Set(Object.values(ap).map((c) => c.apelido_norm)).size, 6)
      assert.throws(() => s.db.prepare('UPDATE contas SET apelido_norm = ? WHERE id = ?').run('ana', v1.contas.Bia.id), /UNIQUE/)
      const novo = await fetch(url + '/api/conta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"apelido":"ANA 2"}' })
      assert.equal(novo.status, 409)

      // token antigo continua valendo (sessão migrada); coleção na ordem de antes, com o resumo
      const est = await api('GET', '/api/estado', v1.tokens.Ana)
      assert.equal(est.status, 200, JSON.stringify(est.json))
      assert.deepEqual(est.json.bonecos.map((b) => b.id), v1.contas.Ana.bonecos.map((x) => x.id))
      assert.equal(est.json.colecao.vivos, 9)
      assert.equal(est.json.faseLiberada, 1)
      // o primeiro pedido cancelou a luta aberta do motor 1: sem vencedor, sem desgaste, bonecos livres
      assert.equal(est.json.lutaAberta, null)
      for (const x of v1.contas.Ana.bonecos.slice(0, 3)) {
        const b = est.json.bonecos.find((y) => y.id === x.id)
        assert.equal(b.ocupado, false); assert.equal(b.lutas, 0); assert.equal(b.pontosDeCostura, 0)
        const h = await api('GET', `/api/boneco/${x.id}`, v1.tokens.Ana)
        assert.ok(!h.json.historico.some((e) => e.tipo === 'lutou'))
      }
      const ver = await api('GET', `/api/luta/${v1.aberta}`, v1.tokens.Ana)
      assert.equal(ver.status, 200, JSON.stringify(ver.json))
      assert.equal(ver.json.status, 'encerrada')
      assert.deepEqual(ver.json.resultado, { vencedor: null, motivo: 'cancelada_por_atualizacao', versaoDoMotor: 1 })
      assert.equal(s.db.prepare('SELECT COUNT(*) n FROM luta_respostas WHERE luta_id = ?').get(v1.aberta).n, 0)
      const cmd = await api('POST', `/api/luta/${v1.aberta}/comando`, v1.tokens.Ana, { seq: 1, comando: { tipo: 'passar' } })
      assert.equal(cmd.status, 409)
      // replays das lutas velhas dizem a versão do motor com que nasceram
      for (const id of [v1.aberta, v1.fechada]) {
        const rep = await api('GET', `/api/luta/${id}/replay`, v1.tokens.Ana)
        assert.equal(rep.status, 200, JSON.stringify(rep.json))
        assert.equal(rep.json.versaoDoMotor, 1)
      }
      // os bonecos voltam a lutar, já no motor 2
      const nova = await api('POST', '/api/luta', v1.tokens.Ana, { modo: 'livre', robo: 'ganancioso', time: v1.contas.Ana.bonecos.slice(0, 3).map((x) => x.id) })
      assert.equal(nova.status, 201, JSON.stringify(nova.json))
      assert.equal(s.db.prepare('SELECT versao_motor FROM lutas WHERE id = ?').get(nova.json.id).versao_motor, 2)
      // as outras contas antigas também entram com o token de antes
      assert.equal((await api('GET', '/api/estado', v1.tokens.Bia)).status, 200)
    } finally {
      s.servidor.closeAllConnections(); await new Promise((ok) => s.servidor.close(ok))
    }
    // reabrir: sem migração pendente, sem cópia nova
    const n = fs.readdirSync(path.join(sub, 'copias')).length
    abrirBanco(arq).close()
    assert.equal(fs.readdirSync(path.join(sub, 'copias')).length, n)
  })
})
