// Porão — abertura, tarefa 1: migração v2 do banco (contas, saves, desafios, sessões; conta_id no diário e nos pedidos).
// Desenho: docs/porao/desenho-abertura.md · decisão do dono 20/11 18:17 (progresso separado por conta).
// Rodar: node --test porao/tests/contas.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  abrirBancoPorao, MIGRACOES, MARCA, PEDIDOS_GUARDADOS_MS,
  criarConta, contaDaCarteira, contaConvidadaLocal, buscarConta,
  carregarSaveDaConta, gravarSaveDaConta, somaDoDiarioDaConta,
  carregarSave, gravarSave, anotarDiario, buscarPedido, gravarPedido,
} from '../servidor/banco.mjs'
import * as R from '../comum/regras.js'
import { LUXOS } from '../comum/config.js'

const T0 = 1_700_000_000_000
const SEMENTE = 'SEMENTE-SECRETA-contas-1b2c'
const CARTEIRA_A = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
const CARTEIRA_B = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy'

function pastaTemp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'porao-contas-')) }
function lcg(s) { return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) }

/**
 * Monta um banco na versão 1 EXATAMENTE como o servidor v1 deixava (mesmo esquema, meta, save id 1, diário com a
 * diferença de caixa de cada passo, pedidos) e o USA: várias ações de verdade das regras, tempo passando.
 */
function bancoV1Usado(arq, { passos = 250 } = {}) {
  const db = new DatabaseSync(arq)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec(MIGRACOES[0])
  db.prepare('INSERT INTO meta (chave, valor) VALUES (?, ?)').run('modo', 'teste')
  db.prepare('INSERT INTO meta (chave, valor) VALUES (?, ?)').run('marca', MARCA)
  db.exec('PRAGMA user_version = 1')
  let estado = R.estadoInicial({ semente: SEMENTE, agora: T0 })
  const gravar = (e, em) => db.prepare(`INSERT INTO save (id, estado, atualizado_em) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET estado = excluded.estado, atualizado_em = excluded.atualizado_em`).run(JSON.stringify(e), em)
  const diario = (antes, depois, motivo, em, pedido) => {
    if (depois !== antes) {
      db.prepare('INSERT INTO diario (em, motivo, valor, caixa_depois, pedido) VALUES (?, ?, ?, ?, ?)')
        .run(em, motivo, depois - antes, depois, pedido)
    }
  }
  gravar(estado, T0)
  const sorte = lcg(7)
  let agora = T0
  let feitas = 0
  for (let i = 0; i < passos; i++) {
    agora += sorte() < 0.05 ? 3 * 3600_000 : Math.floor(5_000 + sorte() * 50_000)
    const inicio = R.atualizarEstado(estado)
    const av = R.avancar(inicio, agora)
    const e = av.estado
    const noAr = e.projetos.filter(p => R.FASES_NO_AR.includes(p.fase) && p.fase !== 'LANCAMENTO')
    const opcoes = [
      ['imprimir', () => R.imprimir(e)],
      ['lancar', () => R.lancar(e, e.cartas[0]?.id)],
      ['tapete', () => R.puxarTapete(e, noAr[0]?.id)],
      ['luxo', () => R.comprarLuxo(e, LUXOS[Math.floor(sorte() * LUXOS.length)].id)],
      ['batida', () => R.resolverBatida(e, sorte() < 0.5 ? 'rebrand' : 'perder')],
      ['fundir', () => R.fundir(e, e.cartas[0]?.ideia)],
    ]
    const [acao, fazer] = opcoes[Math.floor(sorte() * opcoes.length)]
    const r = fazer()
    if (!r || r.ok !== true) continue
    const chave = `v1-pedido-${i}`
    diario(inicio.caixa, e.caixa, 'rendimento', agora, chave)
    diario(e.caixa, r.estado.caixa, acao, agora, chave)
    estado = r.estado
    gravar(estado, agora)
    db.prepare('INSERT INTO pedidos (chave, acao, corpo, resposta, em) VALUES (?, ?, ?, ?, ?)')
      .run(chave, acao, '{}', JSON.stringify({ ok: true, acao }), agora)
    feitas++
  }
  db.close()
  return { feitas, ultimo: agora }
}

/** Foto de um banco direto do arquivo (só lendo). */
function fotoV1(arq) {
  const db = new DatabaseSync(arq, { readOnly: true })
  try {
    return {
      save: db.prepare('SELECT id, estado, atualizado_em FROM save ORDER BY id').all(),
      diario: db.prepare('SELECT id, em, motivo, valor, caixa_depois, pedido FROM diario ORDER BY id').all(),
      pedidos: db.prepare('SELECT chave, acao, corpo, resposta, em FROM pedidos ORDER BY chave').all(),
      meta: db.prepare('SELECT chave, valor FROM meta ORDER BY chave').all(),
    }
  } finally { db.close() }
}

const tabelas = db => db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(t => t.name)

describe('abertura, tarefa 1 — migração v2 (contas)', () => {
  test('banco v1 USADO migra: save da conta 1 igual byte a byte; save antigo, diário e pedidos intactos; cópia em copias/', () => {
    const pasta = pastaTemp()
    const arq = path.join(pasta, 'porao-teste.db')
    const { feitas, ultimo } = bancoV1Usado(arq)
    assert.ok(feitas > 40, `poucas ações no banco v1 (${feitas})`)
    const antes = fotoV1(arq)
    assert.equal(antes.save.length, 1)
    assert.ok(antes.diario.length > 20)
    const caixaV1 = JSON.parse(antes.save[0].estado).caixa
    assert.ok(caixaV1 !== 0 || antes.diario.length > 0)

    const db = abrirBancoPorao(arq, { semente: 'outra-semente', agora: () => ultimo + 1000 })
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, MIGRACOES.length)
    for (const t of ['contas', 'saves', 'desafios', 'sessoes', 'save', 'diario', 'pedidos', 'meta']) {
      assert.ok(tabelas(db).includes(t), `falta a tabela ${t}`)
    }

    // conta 1 = convidada local padrão com o save de antes, texto idêntico
    const conta = contaConvidadaLocal(db, { agora: ultimo + 2000 })
    assert.equal(conta.id, 1)
    assert.equal(conta.tipo, 'convidado')
    assert.equal(conta.localPadrao, true)
    assert.equal(conta.carteira, null)
    assert.equal(conta.apelido, null)
    const linha = db.prepare('SELECT estado, atualizado_em FROM saves WHERE conta_id = 1').get()
    assert.equal(linha.estado, antes.save[0].estado) // byte a byte
    assert.equal(linha.atualizado_em, antes.save[0].atualizado_em)
    assert.deepEqual(carregarSaveDaConta(db, 1), JSON.parse(antes.save[0].estado))
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM contas').get().n, 1)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM saves').get().n, 1)

    // tabela save antiga intocada
    assert.deepEqual(db.prepare('SELECT id, estado, atualizado_em FROM save ORDER BY id').all(), antes.save)
    // diário e pedidos: as mesmas linhas, agora da conta 1
    assert.deepEqual(db.prepare('SELECT id, em, motivo, valor, caixa_depois, pedido FROM diario ORDER BY id').all(), antes.diario)
    assert.deepEqual(db.prepare('SELECT DISTINCT conta_id FROM diario').all().map(l => l.conta_id), [1])
    // pedidos: os de menos de 1 dia ficam (o boot já limpava os mais velhos na v1; a cópia guarda todos)
    const recentes = antes.pedidos.filter(p => p.em >= ultimo + 1000 - PEDIDOS_GUARDADOS_MS)
    assert.ok(recentes.length > 5 && recentes.length < antes.pedidos.length)
    assert.deepEqual(db.prepare('SELECT chave, acao, corpo, resposta, em FROM pedidos ORDER BY chave').all(), recentes)
    assert.deepEqual(db.prepare('SELECT DISTINCT conta_id FROM pedidos').all().map(l => l.conta_id), [1])
    assert.deepEqual(db.prepare('SELECT chave, valor FROM meta ORDER BY chave').all(), antes.meta)

    // soma do diário = caixa da conta 1
    assert.equal(somaDoDiarioDaConta(db, 1), carregarSaveDaConta(db, 1).caixa)
    assert.equal(somaDoDiarioDaConta(db, 1), caixaV1)

    // pedido antigo continua lembrado, agora com a conta
    const p = buscarPedido(db, recentes[0].chave)
    assert.equal(p.contaId, 1)
    assert.equal(p.acao, recentes[0].acao)

    // compatibilidade (jogo.mjs de hoje): carregarSave/gravarSave sem conta = conta convidada local
    assert.deepEqual(carregarSave(db), carregarSaveDaConta(db, 1))
    // jogar depois de migrar grava em saves; a tabela save antiga continua intocada (sem ponte em banco migrado)
    gravarSave(db, { ...carregarSave(db), caixa: carregarSave(db).caixa }, ultimo + 3000)
    gravarSaveDaConta(db, 1, carregarSaveDaConta(db, 1), ultimo + 4000)
    assert.equal(db.prepare('SELECT atualizado_em FROM saves WHERE conta_id = 1').get().atualizado_em, ultimo + 4000)
    assert.deepEqual(db.prepare('SELECT id, estado, atualizado_em FROM save ORDER BY id').all(), antes.save)
    db.close()

    // cópia de antes da migração, com o banco v1 inteiro
    const copias = fs.readdirSync(path.join(pasta, 'copias'))
    assert.equal(copias.length, 1)
    assert.match(copias[0], /^porao-teste\.db\.v1\.\d+\.copia$/)
    const arqCopia = path.join(pasta, 'copias', copias[0])
    const c = new DatabaseSync(arqCopia, { readOnly: true })
    assert.equal(c.prepare('PRAGMA user_version').get().user_version, 1)
    assert.ok(!tabelas(c).includes('contas'))
    c.close()
    assert.deepEqual(fotoV1(arqCopia), antes)
    fs.rmSync(pasta, { recursive: true, force: true })
  })

  test('migração rodando 2 vezes não estraga (reabrir e reaplicar a v2 à mão)', () => {
    const pasta = pastaTemp()
    const arq = path.join(pasta, 'porao-teste.db')
    const { ultimo } = bancoV1Usado(arq, { passos: 80 })
    let db = abrirBancoPorao(arq, { agora: () => ultimo + 1000 })
    const foto = () => ({
      contas: db.prepare('SELECT * FROM contas ORDER BY id').all(),
      saves: db.prepare('SELECT * FROM saves ORDER BY conta_id').all(),
      save: db.prepare('SELECT * FROM save').all(),
      diario: db.prepare('SELECT * FROM diario ORDER BY id').all(),
      pedidos: db.prepare('SELECT * FROM pedidos ORDER BY chave').all(),
    })
    const depois1 = foto()
    db.close()

    // reabrir: já está na v2, não copia de novo e não mexe em nada
    db = abrirBancoPorao(arq, { agora: () => ultimo + 5000 })
    assert.deepEqual(foto(), depois1)
    assert.equal(fs.readdirSync(path.join(pasta, 'copias')).length, 1)

    // reaplicar a v2 por cima (como se a versão gravada tivesse se perdido): nada muda
    assert.equal(typeof MIGRACOES[1], 'function')
    db.exec('BEGIN IMMEDIATE')
    MIGRACOES[1](db, { agora: () => ultimo + 9000 })
    db.exec('COMMIT')
    assert.deepEqual(foto(), depois1)
    assert.equal(somaDoDiarioDaConta(db, 1), carregarSaveDaConta(db, 1).caixa)
    db.close()
    fs.rmSync(pasta, { recursive: true, force: true })
  })

  test('migração v2 que falha no meio não deixa nada pela metade (banco segue v1 igual)', () => {
    const pasta = pastaTemp()
    const arq = path.join(pasta, 'porao-teste.db')
    const { ultimo } = bancoV1Usado(arq, { passos: 60 })
    const antes = fotoV1(arq)
    const quebrada = (db, o) => { MIGRACOES[1](db, o); throw new Error('falha de teste no meio da v2') }
    assert.throws(() => abrirBancoPorao(arq, { agora: () => ultimo + 1000, migracoes: [MIGRACOES[0], quebrada] }), /falha de teste/)
    const db = new DatabaseSync(arq, { readOnly: true })
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1)
    assert.ok(!tabelas(db).includes('contas'))
    db.close()
    assert.deepEqual(fotoV1(arq), antes)
    // a migração certa depois funciona
    const ok = abrirBancoPorao(arq, { agora: () => ultimo + 2000 })
    assert.equal(ok.prepare('SELECT estado FROM saves WHERE conta_id = 1').get().estado, antes.save[0].estado)
    ok.close()
    fs.rmSync(pasta, { recursive: true, force: true })
  })

  test('banco novo: conta convidada local já existe; contas novas com semente própria e save próprio', () => {
    const db = abrirBancoPorao(':memory:', { semente: SEMENTE, agora: () => T0 })
    const local = contaConvidadaLocal(db, { agora: T0 })
    assert.equal(local.id, 1)
    assert.equal(local.localPadrao, true)
    assert.equal(carregarSaveDaConta(db, 1).semente, SEMENTE)
    assert.deepEqual(carregarSave(db), carregarSaveDaConta(db, 1))
    // chamar de novo devolve a mesma
    assert.equal(contaConvidadaLocal(db, { agora: T0 + 10 }).id, 1)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM contas WHERE local_padrao = 1').get().n, 1)

    // carteira: cria uma vez, depois acha
    const a = contaDaCarteira(db, CARTEIRA_A, { agora: T0 + 100 })
    assert.equal(a.nova, true)
    assert.equal(a.tipo, 'carteira')
    assert.equal(a.carteira, CARTEIRA_A)
    assert.equal(a.localPadrao, false)
    const a2 = contaDaCarteira(db, CARTEIRA_A, { agora: T0 + 200 })
    assert.equal(a2.nova, false)
    assert.equal(a2.id, a.id)
    assert.equal(a2.vistoEm, T0 + 200)
    const b = contaDaCarteira(db, CARTEIRA_B, { agora: T0 + 300 })
    assert.notEqual(b.id, a.id)
    // achar sem criar
    assert.equal(contaDaCarteira(db, '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', { agora: T0, criar: false }), null)

    // sementes próprias, todas diferentes, nunca a do convidado
    const sementes = [1, a.id, b.id].map(id => carregarSaveDaConta(db, id).semente)
    assert.equal(new Set(sementes).size, 3)
    for (const s of sementes.slice(1)) assert.match(s, /^[0-9a-f]{64}$/) // 32 bytes aleatórios do servidor
    assert.deepEqual(carregarSaveDaConta(db, a.id), R.estadoInicial({ semente: sementes[1], agora: T0 + 100 }))

    // saves isolados
    const e = carregarSaveDaConta(db, a.id)
    gravarSaveDaConta(db, a.id, { ...e, caixa: 500 }, T0 + 400)
    assert.equal(carregarSaveDaConta(db, a.id).caixa, 500)
    assert.equal(carregarSaveDaConta(db, b.id).caixa, 0)
    assert.equal(carregarSaveDaConta(db, 1).caixa, 0)

    // diário por conta
    anotarDiario(db, { em: T0 + 400, motivo: 'rendimento', valor: 500, caixaDepois: 500, contaId: a.id })
    anotarDiario(db, { em: T0 + 400, motivo: 'rendimento', valor: 7, caixaDepois: 7 }) // sem conta = convidada local (compatível)
    assert.equal(somaDoDiarioDaConta(db, a.id), 500)
    assert.equal(somaDoDiarioDaConta(db, b.id), 0)
    assert.equal(somaDoDiarioDaConta(db, 1), 7)

    // pedidos com conta
    gravarPedido(db, { chave: 'pedido-da-a-0001', acao: 'imprimir', corpo: '{}', resposta: '{}', em: T0 + 500, contaId: a.id })
    assert.equal(buscarPedido(db, 'pedido-da-a-0001').contaId, a.id)
    gravarPedido(db, { chave: 'pedido-local-0001', acao: 'imprimir', corpo: '{}', resposta: '{}', em: T0 + 500 })
    assert.equal(buscarPedido(db, 'pedido-local-0001').contaId, 1)

    // buscarConta
    assert.equal(buscarConta(db, a.id).carteira, CARTEIRA_A)
    assert.equal(buscarConta(db, 9999), null)
    assert.throws(() => carregarSaveDaConta(db, 9999), /save/)
    db.close()
  })

  test('recusas: carteira inválida, conta inexistente, segunda convidada local, linha sem conta', () => {
    const db = abrirBancoPorao(':memory:', { semente: SEMENTE, agora: () => T0 })
    for (const ruim of ['', 'curta', 'O0Il' + 'a'.repeat(40), 'a'.repeat(45), 42, null, undefined, CARTEIRA_A + ' ']) {
      assert.throws(() => contaDaCarteira(db, ruim, { agora: T0 }), /carteira/i, String(ruim))
    }
    assert.throws(() => criarConta(db, { tipo: 'outro', agora: T0 }), /tipo/i)
    assert.throws(() => criarConta(db, { tipo: 'carteira', agora: T0 }), /carteira/i)
    assert.throws(() => criarConta(db, { tipo: 'convidado', localPadrao: true, agora: T0 })) // já existe a local
    assert.throws(() => gravarSaveDaConta(db, 9999, R.estadoInicial({ semente: 'x', agora: T0 }), T0))
    assert.throws(() => db.prepare('INSERT INTO diario (em, motivo, valor, caixa_depois) VALUES (1, ?, 1, 1)').run('x'), /conta/)
    // pedido sem conta: aceito, mas não é de ninguém (quem confere a conta recusa)
    db.prepare("INSERT INTO pedidos (chave, acao, corpo, resposta, em) VALUES ('k-sem-conta', 'a', '{}', '{}', 1)").run()
    assert.equal(buscarPedido(db, 'k-sem-conta').contaId, null)
    assert.throws(() => anotarDiario(db, { em: T0, motivo: 'x', valor: 1, caixaDepois: 1, contaId: 9999 }))
    // a mesma carteira não vira duas contas
    criarConta(db, { tipo: 'carteira', carteira: CARTEIRA_A, agora: T0 })
    assert.throws(() => criarConta(db, { tipo: 'carteira', carteira: CARTEIRA_A, agora: T0 }))
    db.close()
  })

  test('criarConta funciona dentro e fora de uma transação do chamador', () => {
    const db = abrirBancoPorao(':memory:', { semente: SEMENTE, agora: () => T0 })
    db.exec('BEGIN IMMEDIATE')
    const c = criarConta(db, { tipo: 'convidado', agora: T0, semente: 'semente-fixa-de-teste' })
    db.exec('ROLLBACK')
    assert.equal(buscarConta(db, c.id), null) // desfeita junto com a transação de fora
    const d = criarConta(db, { tipo: 'convidado', agora: T0, semente: 'semente-fixa-de-teste' })
    assert.equal(carregarSaveDaConta(db, d.id).semente, 'semente-fixa-de-teste')
    assert.equal(d.localPadrao, false)
    db.close()
  })

  test('compatível com jogo.mjs: gravarSave sem conta grava na convidada local; a tabela save antiga nunca muda', () => {
    // Regra mudou (tarefa 4, progresso por conta, 20/11 18:17): a PONTE (espelho do save na tabela antiga) saiu.
    const db = abrirBancoPorao(':memory:', { semente: SEMENTE, agora: () => T0 })
    const fotoSave = () => db.prepare('SELECT * FROM save ORDER BY id').all()
    const antes = fotoSave()
    assert.deepEqual(antes, []) // banco novo: a tabela antiga existe, vazia, e fica assim
    const e = carregarSave(db)
    gravarSave(db, { ...e, caixa: 123 }, T0 + 1)
    assert.equal(carregarSaveDaConta(db, 1).caixa, 123)
    const outra = criarConta(db, { tipo: 'convidado', agora: T0 + 2 })
    gravarSaveDaConta(db, outra.id, { ...e, caixa: 999 }, T0 + 3)
    gravarSaveDaConta(db, 1, { ...e, caixa: 7 }, T0 + 4)
    assert.deepEqual(fotoSave(), antes)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM meta WHERE chave = 'save_antigo_espelho'").get().n, 0)
    db.close()
  })

  test('banco que nasceu com a ponte (marca de espelho): a tabela save antiga também nunca muda', () => {
    const db = abrirBancoPorao(':memory:', { semente: SEMENTE, agora: () => T0 })
    // como a ponte deixava: linha antiga + marca apontando para a conta local
    db.prepare('INSERT INTO save (id, estado, atualizado_em) SELECT 1, estado, atualizado_em FROM saves WHERE conta_id = 1').run()
    db.prepare("INSERT INTO meta (chave, valor) VALUES ('save_antigo_espelho', '1')").run()
    const antes = db.prepare('SELECT * FROM save ORDER BY id').all()
    gravarSaveDaConta(db, 1, { ...carregarSave(db), caixa: 4242 }, T0 + 5)
    assert.equal(carregarSaveDaConta(db, 1).caixa, 4242)
    assert.deepEqual(db.prepare('SELECT * FROM save ORDER BY id').all(), antes)
    db.close()
  })
})
