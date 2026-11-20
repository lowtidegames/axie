// Porão — tarefa 4: banco (porao/servidor/banco.mjs) e camada de ações (porao/servidor/jogo.mjs).
// Rodar: node --test porao/tests/jogo.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { abrirBancoPorao, carregarSave, MIGRACOES } from '../servidor/banco.mjs'
import { agir, verEstado, estadoParaTela, somaDoDiario, ACOES } from '../servidor/jogo.mjs'
import * as R from '../comum/regras.js'
import { TEXTOS } from '../comum/nomes.js'
import { RARIDADES, LUXOS, INFLUENCIADORES, CONTRATO } from '../comum/config.js'

const T0 = 1_700_000_000_000
const SEMENTE = 'SEMENTE-SECRETA-porao-7f3a9c'

function pastaTemp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'porao-jogo-')) }
function bancoNovo() { return abrirBancoPorao(':memory:', { semente: SEMENTE, agora: () => T0 }) }

/** Gerador simples e determinístico só para escolher ações no teste. */
function lcg(s) { return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) }

/** Foto do que está gravado (para provar que nada mudou). */
function foto(db) {
  return {
    save: db.prepare('SELECT estado FROM save').all(),
    diario: db.prepare('SELECT * FROM diario ORDER BY id').all(),
    pedidos: db.prepare('SELECT * FROM pedidos ORDER BY chave').all(),
  }
}

let nChave = 0
const chave = () => `pedido-${++nChave}-${Math.random().toString(36).slice(2, 10)}`

/** Procura em profundidade uma chave de objeto pelo nome. */
function temChave(obj, nome) {
  if (!obj || typeof obj !== 'object') return false
  if (Object.prototype.hasOwnProperty.call(obj, nome)) return true
  return Object.values(obj).some(v => temChave(v, nome))
}

describe('tarefa 4 — banco e ações do porão', () => {
  test('soma do diário bate com o caixa depois de uma sequência longa de ações', () => {
    const db = bancoNovo()
    const sorte = lcg(42)
    let agora = T0
    let feitas = 0
    for (let i = 0; i < 600; i++) {
      // tempo passa: quase sempre conectado, às vezes fora do jogo
      agora += sorte() < 0.05 ? 3 * 3600_000 : Math.floor(5_000 + sorte() * 50_000)
      const e = carregarSave(db)
      const noAr = e.projetos.filter(p => R.FASES_NO_AR.includes(p.fase) && p.fase !== 'LANCAMENTO')
      const opcoes = [
        ['imprimir', {}],
        ['lancar', { cartaId: e.cartas[0]?.id }],
        ['tapete', { projetoId: noAr[0]?.id }],
        ['luxo', { luxoId: LUXOS[Math.floor(sorte() * LUXOS.length)].id }],
        ['contrato', { projetoId: noAr.at(-1)?.id, influenciadorId: INFLUENCIADORES[Math.floor(sorte() * 2)].id }],
        ['resposta', { projetoId: noAr.at(-1)?.id, resposta: ['pagar', 'chorar', 'recusar'][Math.floor(sorte() * 3)] }],
        ['batida', { escolha: sorte() < 0.5 ? 'rebrand' : 'perder' }],
        ['fundir', { ideia: e.cartas[0]?.ideia }],
        ['prestigio', {}],
      ]
      const [acao, dados] = opcoes[Math.floor(sorte() * opcoes.length)]
      const r = agir(db, { acao, dados, chave: chave(), agora })
      if (r.ok) feitas++
      const caixa = carregarSave(db).caixa
      assert.equal(somaDoDiario(db), caixa, `passo ${i} (${acao})`)
      if (r.ok) assert.equal(r.estado.caixa, caixa)
    }
    verEstado(db, agora + 30_000)
    assert.equal(somaDoDiario(db), carregarSave(db).caixa)
    assert.ok(feitas > 50, `poucas ações deram certo (${feitas})`)
    const linhas = db.prepare('SELECT valor, motivo FROM diario').all()
    assert.ok(linhas.length > 20)
    for (const l of linhas) {
      assert.ok(Number.isSafeInteger(l.valor) && l.valor !== 0, `valor inválido no diário: ${l.valor}`)
      assert.ok(['rendimento', ...Object.keys(ACOES)].includes(l.motivo), l.motivo)
    }
    db.close()
  })

  test('pedido repetido devolve a mesma resposta e não conta duas vezes', () => {
    const db = bancoNovo()
    const k = 'imprimir-0001'
    const a = agir(db, { acao: 'imprimir', dados: {}, chave: k, agora: T0 + 1000 })
    assert.equal(a.ok, true, a.erro)
    const antes = foto(db)
    const b = agir(db, { acao: 'imprimir', dados: {}, chave: k, agora: T0 + 9000 })
    assert.equal(b.ok, true)
    assert.equal(b.repetido, true)
    assert.deepEqual(b.resultado, a.resultado)
    assert.deepEqual(b.estado, a.estado)
    assert.deepEqual(foto(db), antes)
    assert.equal(carregarSave(db).contagem.impressoes, 1)
    // mesma chave para outra ação: recusa, sem gravar
    const c = agir(db, { acao: 'prestigio', dados: {}, chave: k, agora: T0 + 9000 })
    assert.equal(c.ok, false)
    assert.match(c.erro, /chave/i)
    assert.deepEqual(foto(db), antes)
    db.close()
  })

  test('pedido sem chave ou com chave estranha é recusado', () => {
    const db = bancoNovo()
    const antes = foto(db)
    for (const k of [undefined, '', 'curta', 123, 'x'.repeat(200), 'tem espaço aqui', { a: 1 }]) {
      const r = agir(db, { acao: 'imprimir', dados: {}, chave: k, agora: T0 + 1000 })
      assert.equal(r.ok, false, String(k))
    }
    assert.deepEqual(foto(db), antes)
    db.close()
  })

  test('ação recusada não grava nada (nem o relógio, nem o diário, nem o pedido)', () => {
    const db = bancoNovo()
    assert.equal(agir(db, { acao: 'imprimir', dados: {}, chave: chave(), agora: T0 + 1000 }).ok, true)
    const carta = carregarSave(db).cartas[0]
    assert.equal(agir(db, { acao: 'lancar', dados: { cartaId: carta.id }, chave: chave(), agora: T0 + 2000 }).ok, true)
    const antes = foto(db)
    const tentativas = [
      ['lancar', { cartaId: 999 }],
      ['lancar', { cartaId: '1' }],
      ['tapete', { projetoId: 999 }],
      ['luxo', { luxoId: 'carro_na_garagem' }],
      ['luxo', { luxoId: 'nao_existe' }],
      ['batida', { escolha: 'rebrand' }],
      ['prestigio', {}],
      ['fundir', { ideia: 'comum_1' }],
      ['resposta', { projetoId: 1, resposta: 'pagar' }],
      ['contrato', { projetoId: 999, influenciadorId: 'infl_1' }],
      ['acao_que_nao_existe', {}],
      ['imprimir', 'não é objeto'],
      ['imprimir', [1, 2]],
      ['__proto__', {}],
    ]
    for (const [acao, dados] of tentativas) {
      const r = agir(db, { acao, dados, chave: chave(), agora: T0 + 120_000 })
      assert.equal(r.ok, false, `${acao} devia ser recusada`)
      assert.equal(typeof r.erro, 'string')
      assert.deepEqual(foto(db), antes, `${acao} gravou algo`)
    }
    db.close()
  })

  test('abrir de novo um banco já usado (com dados) continua de onde parou', () => {
    const pasta = pastaTemp()
    const arq = path.join(pasta, 'porao-teste.db')
    let db = abrirBancoPorao(arq, { semente: SEMENTE, agora: () => T0 })
    assert.equal(agir(db, { acao: 'imprimir', dados: {}, chave: 'reabrir-01', agora: T0 + 1000 }).ok, true)
    const carta = carregarSave(db).cartas[0]
    assert.equal(agir(db, { acao: 'lancar', dados: { cartaId: carta.id }, chave: 'reabrir-02', agora: T0 + 2000 }).ok, true)
    verEstado(db, T0 + 50_000)
    const antes = carregarSave(db)
    const somaAntes = somaDoDiario(db)
    db.close()

    // reabre com outra semente: a gravada vale (não sorteia de novo)
    db = abrirBancoPorao(arq, { semente: 'outra-semente', agora: () => T0 + 60_000 })
    assert.deepEqual(carregarSave(db), antes)
    assert.equal(somaDoDiario(db), somaAntes)
    // pedido antigo continua lembrado
    const rep = agir(db, { acao: 'imprimir', dados: {}, chave: 'reabrir-01', agora: T0 + 70_000 })
    assert.equal(rep.repetido, true)
    assert.equal(carregarSave(db).contagem.impressoes, 1)
    const t = verEstado(db, T0 + 80_000)
    assert.equal(t.estado.projetos.length, 1)
    assert.equal(somaDoDiario(db), carregarSave(db).caixa)
    db.close()
    fs.rmSync(pasta, { recursive: true, force: true })
  })

  test('migração pendente num banco com dados: cópia antes; banco alheio ou de outro modo é recusado', () => {
    const pasta = pastaTemp()
    const arq = path.join(pasta, 'porao-teste.db')
    let db = abrirBancoPorao(arq, { semente: SEMENTE, agora: () => T0 })
    agir(db, { acao: 'imprimir', dados: {}, chave: 'migra-0001', agora: T0 + 1000 })
    const antes = carregarSave(db)
    db.close()
    db = abrirBancoPorao(arq, { semente: SEMENTE, agora: () => T0 + 5, migracoes: [...MIGRACOES, 'CREATE TABLE extra_teste (a INTEGER)'] })
    const copias = fs.readdirSync(path.join(pasta, 'copias'))
    assert.equal(copias.length, 1)
    const copia = new DatabaseSync(path.join(pasta, 'copias', copias[0]), { readOnly: true })
    assert.equal(JSON.parse(copia.prepare('SELECT estado FROM save').get().estado).caixa, antes.caixa)
    copia.close()
    assert.deepEqual(carregarSave(db), antes)
    db.close()
    // outro modo: recusa
    assert.throws(() => abrirBancoPorao(arq, { modo: 'producao', migracoes: [...MIGRACOES, 'CREATE TABLE extra_teste (a INTEGER)'] }), /modo/)
    // arquivo com tabelas que não são do porão: recusa sem mexer
    const alheio = path.join(pasta, 'alheio.db')
    const a = new DatabaseSync(alheio)
    a.exec('CREATE TABLE contas (id INTEGER)')
    a.close()
    const bytes = fs.readFileSync(alheio)
    assert.throws(() => abrirBancoPorao(alheio), /porão/)
    assert.deepEqual(fs.readFileSync(alheio), bytes)
    fs.rmSync(pasta, { recursive: true, force: true })
  })

  test('a semente e o contador do sorteio nunca aparecem para a tela', () => {
    const db = bancoNovo()
    let agora = T0
    const respostas = []
    respostas.push(verEstado(db, agora))
    for (let i = 0; i < 5; i++) {
      agora += 2000
      respostas.push(agir(db, { acao: 'imprimir', dados: {}, chave: chave(), agora }))
    }
    const e = carregarSave(db)
    respostas.push(agir(db, { acao: 'lancar', dados: { cartaId: e.cartas[0].id }, chave: chave(), agora: agora + 1000 }))
    respostas.push(verEstado(db, agora + 30_000))
    respostas.push(estadoParaTela(carregarSave(db)))
    assert.equal(carregarSave(db).semente, SEMENTE)
    for (const r of respostas) {
      const txt = JSON.stringify(r)
      assert.ok(!txt.includes(SEMENTE), 'semente vazou')
      assert.ok(!temChave(r, 'semente'), 'campo semente vazou')
      assert.ok(!temChave(r, 'sorteios'), 'contador do sorteio vazou')
    }
    for (const p of db.prepare('SELECT resposta FROM pedidos').all()) assert.ok(!p.resposta.includes(SEMENTE))
    db.close()
  })

  test('toda ideia, influenciador e luxo que o jogo pode mostrar tem nome em nomes.js', () => {
    for (const r of RARIDADES) {
      const ideias = R.ideiasDa(r)
      assert.ok(ideias.length > 0)
      for (const ideia of ideias) {
        const n = ideia.slice(ideia.lastIndexOf('_') + 1)
        for (const parte of ['nome', 'lancamento', 'fim']) {
          assert.equal(typeof TEXTOS[`ideia.${r}.${n}.${parte}`], 'string', `falta ideia.${r}.${n}.${parte}`)
        }
      }
    }
    // pela tela: cada carta, influenciador e luxo vem com nome resolvido (nunca a chave crua)
    let e = R.estadoInicial({ semente: SEMENTE, agora: T0 })
    for (const r of RARIDADES) for (const ideia of R.ideiasDa(r)) e.cartas.push({ id: e.proximoId++, ideia, raridade: r })
    const t = estadoParaTela(e)
    for (const c of t.cartas) assert.ok(c.nome && !c.nome.startsWith('ideia.'), c.ideia)
    assert.equal(t.influenciadores.length, INFLUENCIADORES.length)
    for (const i of t.influenciadores) assert.ok(i.nome && !i.nome.startsWith('influ.'), i.id)
    assert.equal(t.luxos.length, LUXOS.length)
    for (const l of t.luxos) assert.ok(l.nome && !l.nome.startsWith('luxo.'), l.id)
    assert.ok(t.pseudonimo.nome)
  })

  test('estadoParaTela traz nomes e prévias (impressora, chances, tapete, batida)', () => {
    const db = bancoNovo()
    let agora = T0
    agir(db, { acao: 'imprimir', dados: {}, chave: chave(), agora: agora += 1000 })
    const carta = carregarSave(db).cartas[0]
    agir(db, { acao: 'lancar', dados: { cartaId: carta.id }, chave: chave(), agora: agora += 1000 })
    const c = agir(db, { acao: 'contrato', dados: { projetoId: carregarSave(db).projetos[0].id, influenciadorId: 'infl_1' }, chave: chave(), agora: agora += 1000 })
    const { estado: t } = verEstado(db, agora += 30_000)
    assert.equal(t.impressora.custo, R.custoImpressao(carregarSave(db)))
    assert.deepEqual(t.impressora.chances, R.chancesDaImpressora())
    const p = t.projetos[0]
    assert.equal(p.nome, TEXTOS[`ideia.${carta.raridade}.${carta.ideia.split('_')[1]}.nome`])
    assert.ok(p.previaTapete && p.previaTapete.ok)
    assert.equal(p.previaTapete.ganho, R.previaTapete(carregarSave(db), p.id).ganho)
    assert.equal(t.batida, null)
    if (c.ok) {
      assert.ok(t.celular.length >= 1)
      assert.ok(t.chat.some(m => m.texto.includes(p.nome)), 'post do chat cita o projeto')
      for (const m of [...t.celular, ...t.chat]) assert.ok(!m.texto.includes('{projeto}'))
    }
    // batida forçada: prévia aparece com o nome do projeto ameaçado
    const e = structuredClone(carregarSave(db))
    e.batida = { projetoId: p.id, custoRebrand: 30 }
    const tb = estadoParaTela(e)
    assert.equal(tb.batida.projetoId, p.id)
    assert.equal(tb.batida.projetoNome, p.nome)
    assert.equal(tb.batida.custoRebrand, 30)
    db.close()
  })
})

describe('P8 — SAVE_SO_LEITURA e limpeza de pedidos', () => {
  test('SAVE_SO_LEITURA: GET /api/estado não muda o save', () => {
    const db = bancoNovo()
    agir(db, { acao: 'imprimir', dados: {}, chave: 'chave-p8-0001', agora: T0 })
    const antes = foto(db)
    const r = verEstado(db, T0 + 30_000, { gravar: false })
    assert.equal(r.ok, true)
    assert.deepEqual(foto(db), antes)
    verEstado(db, T0 + 30_000)
    assert.notDeepEqual(foto(db).save, antes.save)
  })

  test('boot apaga pedidos com mais de 1 dia e guarda os novos', () => {
    const pasta = pastaTemp()
    const arq = path.join(pasta, 'p.db')
    try {
      const db = abrirBancoPorao(arq, { semente: SEMENTE, agora: () => T0 })
      const ins = db.prepare('INSERT INTO pedidos (chave, acao, corpo, resposta, em) VALUES (?, ?, ?, ?, ?)')
      ins.run('velho-0001', 'imprimir', '{}', '{}', T0 - 25 * 3600 * 1000)
      ins.run('novo-0001', 'imprimir', '{}', '{}', T0 - 3600 * 1000)
      db.close()
      const db2 = abrirBancoPorao(arq, { semente: SEMENTE, agora: () => T0 })
      const chaves = db2.prepare('SELECT chave FROM pedidos').all().map(x => x.chave)
      assert.deepEqual(chaves, ['novo-0001'])
      db2.close()
    } finally { fs.rmSync(pasta, { recursive: true, force: true }) }
  })
})

describe('textos novos do humorista ligados no servidor', () => {
  /** Lista os textos de uma família (rebrand.1, rebrand.2...) na ordem. */
  const familia = (pre) => { const l = []; for (let k = 1; TEXTOS[`${pre}.${k}`] !== undefined; k++) l.push(TEXTOS[`${pre}.${k}`]); return l }
  const dinheiro = (n) => `$ ${Number(n).toLocaleString('pt-BR')}`

  /** Estado com 1 projeto no ar, montado só pelas ações do servidor. */
  function comProjeto() {
    const db = bancoNovo()
    let agora = T0
    agir(db, { acao: 'imprimir', dados: {}, chave: chave(), agora: agora += 1000 })
    agir(db, { acao: 'lancar', dados: { cartaId: carregarSave(db).cartas[0].id }, chave: chave(), agora: agora += 1000 })
    const e = structuredClone(carregarSave(db))
    db.close()
    return e
  }
  const baseDe = (p) => TEXTOS[`ideia.${p.raridade}.${p.ideia.split('_')[1]}.nome`]

  test('rebrand usa rebrand.1..N com {nome}, determinístico e sem sorteio', () => {
    const lista = familia('rebrand')
    assert.ok(lista.length >= 2)
    const e = comProjeto()
    const p = e.projetos[0]
    const base = baseDe(p)
    const vistos = new Set()
    for (let r = 1; r <= lista.length; r++) {
      p.rebrands = r
      const sorteiosAntes = e.sorteios
      const a = estadoParaTela(e).projetos[0].nome
      assert.equal(estadoParaTela(e).projetos[0].nome, a, 'mesmo estado, mesmo nome')
      assert.equal(e.sorteios, sorteiosAntes)
      assert.ok(lista.some(m => m.replaceAll('{nome}', base) === a), `nome fora da lista: ${a}`)
      assert.ok(!a.includes('{nome}'))
      vistos.add(a)
    }
    assert.equal(vistos.size, lista.length, 'cada rebrand seguido usa um jeito diferente')
    p.rebrands = 0
    assert.equal(estadoParaTela(e).projetos[0].nome, base)
    // a quantidade vem dos textos (nomes.local pode ter outra lista): com 1 jeito só, sempre ele
    const so1 = { ...TEXTOS }
    for (let k = 2; so1[`rebrand.${k}`]; k++) delete so1[`rebrand.${k}`]
    so1['rebrand.1'] = '{nome} Turbo'
    p.rebrands = 3
    assert.equal(estadoParaTela(e, { textos: so1 }).projetos[0].nome, `${base} Turbo`)
  })

  test('batida pendente traz batida.frase da lista batida.*, determinística', () => {
    const lista = familia('batida')
    assert.ok(lista.length >= 2)
    const e = comProjeto()
    e.batida = { projetoId: e.projetos[0].id, custoRebrand: 30 }
    const vistas = new Set()
    for (let b = 1; b <= lista.length; b++) {
      e.contagem.batidas = b
      const t = estadoParaTela(e)
      assert.ok(lista.includes(t.batida.frase), t.batida.frase)
      assert.equal(estadoParaTela(e).batida.frase, t.batida.frase)
      vistas.add(t.batida.frase)
    }
    assert.equal(vistas.size, lista.length, 'batidas seguidas mudam a frase')
  })

  test('batida traz o nome que o projeto terá depois do rebrand (prévia = resultado)', () => {
    const e = comProjeto()
    e.batida = { projetoId: e.projetos[0].id, custoRebrand: 1 }
    e.caixa = Math.max(e.caixa, 10)
    const previa = estadoParaTela(e).batida.nomeAposRebrand
    const r = R.resolverBatida(e, 'rebrand')
    assert.equal(r.ok, true, r.erro)
    assert.equal(estadoParaTela(r.estado).projetos[0].nome, previa)
  })

  test('celular: oferta do vídeo 1 com {valor} = P1 real; vídeo 2 pelo mesmo preço tem texto', () => {
    const e = comProjeto()
    const p = e.projetos[0]
    const p1 = CONTRATO.tamanhos.nano.p1
    p.contrato = { influenciador: 'infl_1', tamanho: 'nano', fase: 'V1_NO_AR', videos: 1, p1, proposta: null, esperaRestante: 10, chorou: false, motivo: null, trazidasV1: 0 }
    let t = estadoParaTela(e)
    const oferta = t.celular.find(m => m.tipo === 'oferta')
    assert.ok(!oferta.texto.includes('{valor}'), oferta.texto)
    assert.ok(oferta.texto.includes(dinheiro(p1)), oferta.texto)
    assert.equal(oferta.valor, p1)
    // abaixo do limite: proposta = mesmo preço
    p.contrato.proposta = p1
    p.contrato.esperaRestante = 0
    t = estadoParaTela(e)
    const prop = t.celular.find(m => m.tipo === 'proposta')
    assert.ok(prop, 'mensagem da proposta')
    assert.equal(prop.valor, p1)
    assert.equal(prop.texto, TEXTOS['msg.video2.mesmo_preco'].replaceAll('{projeto}', t.projetos[0].nome))
    for (const m of t.celular) assert.ok(!/\{(projeto|valor|nome)\}/.test(m.texto ?? ''), m.texto)
  })

  test('rotulos.confianca vem de ui.confianca', () => {
    const e = comProjeto()
    assert.equal(estadoParaTela(e).rotulos.confianca, TEXTOS['ui.confianca'])
    assert.equal(estadoParaTela(e, { textos: { ...TEXTOS, 'ui.confianca': 'Fé cega' } }).rotulos.confianca, 'Fé cega')
  })

  test('tapete e chat dos trouxas usam a quantidade de frases de nomes.js (sem número fixo)', () => {
    const nTapete = familia('tapete').length
    const nChat = familia('chat').length
    const mais = { ...TEXTOS, [`tapete.${nTapete + 1}`]: 'TAPETE NOVO', [`chat.${nChat + 1}`]: 'CHAT NOVO' }
    // tapete: o projeto de número N+1 usa a frase nova (antes voltava à 1)
    const e = comProjeto()
    e.projetos[0].id = nTapete + 1
    e.projetos[0].fase = 'APLICADO'
    assert.equal(estadoParaTela(e, { textos: mais }).projetos[0].textoTapete, 'TAPETE NOVO')
    assert.equal(estadoParaTela(e).projetos[0].textoTapete, TEXTOS['tapete.1'])
    // chat: projeto no ar de número N usa a frase N+1
    const e2 = comProjeto()
    e2.projetos[0].id = nChat
    const trouxa = (t) => t.chat.find(m => m.tipo === 'trouxa').texto
    assert.equal(trouxa(estadoParaTela(e2, { textos: mais })), 'CHAT NOVO')
    assert.equal(trouxa(estadoParaTela(e2)), TEXTOS['chat.1'])
  })
})
