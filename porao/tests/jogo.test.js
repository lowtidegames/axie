// Porão — tarefa 4: banco (porao/servidor/banco.mjs) e camada de ações (porao/servidor/jogo.mjs).
// Rodar: node --test porao/tests/jogo.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  abrirBancoPorao, carregarSave, gravarSave, MIGRACOES,
  criarConta, contaDaCarteira, buscarConta, carregarSaveDaConta, gravarSaveDaConta, somaDoDiarioDaConta,
} from '../servidor/banco.mjs'
import { agir, verEstado, estadoParaTela, somaDoDiario, ACOES, definirApelido } from '../servidor/jogo.mjs'
import { validarApelido, APELIDO } from '../comum/apelido.js'
import * as R from '../comum/regras.js'
import { TEXTOS } from '../comum/nomes.js'
import { RARIDADES, LUXOS, INFLUENCIADORES, CONTRATO, CALOR } from '../comum/config.js'
import { LUXOS as LUXOS_DA_CENA } from '../tela/cena.js'

const T0 = 1_700_000_000_000
const SEMENTE = 'SEMENTE-SECRETA-porao-7f3a9c'

function pastaTemp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'porao-jogo-')) }
function bancoNovo() { return abrirBancoPorao(':memory:', { semente: SEMENTE, agora: () => T0 }) }

/** Gerador simples e determinístico só para escolher ações no teste. */
function lcg(s) { return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) }

/** Foto do que está gravado (para provar que nada mudou). */
function foto(db) {
  return {
    saves: db.prepare('SELECT conta_id, estado, atualizado_em FROM saves ORDER BY conta_id').all(), // progresso por conta (20/11 18:17)
    contas: db.prepare('SELECT * FROM contas ORDER BY id').all(),
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
      assert.ok(['rendimento', 'multa', ...Object.keys(ACOES)].includes(l.motivo), l.motivo) // 'multa': batida sem projeto no ar (20/11)
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
    assert.equal(JSON.parse(copia.prepare('SELECT estado FROM saves WHERE conta_id = 1').get().estado).caixa, antes.caixa)
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
    assert.notDeepEqual(foto(db).saves, antes.saves)
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

describe('consertos do núcleo (20/11): multa da batida e luxos alinhados', () => {
  // Tabela única: id do config (= nome do sprite) → chave do texto em nomes.js → tipo de bônus que o texto sugere.
  const TABELA = {
    cadeira_gamer: ['luxo.2', 'rendimento'],
    aquario: ['luxo.1', 'hype'],
    ar_condicionado: ['luxo.6', 'calor'],
    letreiro_neon: ['luxo.5', 'rendimento'],
    maquina_bebida: ['luxo.3', 'hype'],
    tela_curva: ['luxo.7', 'calor'],
    garagem: ['luxo.4', 'rendimento'],
  }

  test('luxos: cada id tem o texto que combina com ele e com o bônus, e os que têm sprite usam o mesmo id', () => {
    assert.deepEqual(LUXOS.map(l => l.id), Object.keys(TABELA))
    const t = estadoParaTela(R.estadoInicial({ semente: SEMENTE, agora: T0 }))
    for (const l of LUXOS) {
      const [k, tipo] = TABELA[l.id]
      const v = t.luxos.find(x => x.id === l.id)
      assert.equal(v.nome, TEXTOS[`${k}.nome`], l.id)
      assert.equal(v.descricao, TEXTOS[`${k}.descricao`], l.id)
      assert.deepEqual(Object.keys(l.bonus), [tipo], l.id)
    }
    assert.equal(new Set(t.luxos.map(l => l.nome)).size, LUXOS.length, 'dois luxos com o mesmo nome')
    for (const id of ['aquario', 'cadeira_gamer', 'maquina_bebida', 'garagem']) assert.ok(LUXOS_DA_CENA.includes(id), `sprite ${id}`)
  })

  test('save antigo com ids velhos de luxo continua com o luxo comprado e o bônus', () => {
    const db = bancoNovo()
    const e = carregarSave(db)
    e.luxos = ['carro_na_garagem', 'cafeteira_chique', 'tapete_persa', 'cofre']
    gravarSave(db, e, T0)
    const { estado: t } = verEstado(db, T0 + 1000)
    const comprados = t.luxos.filter(l => l.comprado).map(l => l.id).sort()
    assert.deepEqual(comprados, ['ar_condicionado', 'garagem', 'maquina_bebida', 'tela_curva'])
    assert.deepEqual(carregarSave(db).luxos.slice().sort(), comprados)
    const soma = k => LUXOS.filter(l => comprados.includes(l.id)).reduce((s, l) => s + (l.bonus[k] || 0), 0)
    assert.equal(t.bonus.rendimento, Math.round(soma('rendimento') * 100) / 100)
    assert.equal(t.bonus.calor, Math.round(soma('calor') * 100) / 100)
    db.close()
  })

  test('multa da batida sem projeto no ar vai ao diário com motivo próprio e a soma bate', () => {
    const db = bancoNovo()
    let e = R.estadoInicial({ semente: SEMENTE, agora: T0 })
    e.cartas.push({ id: e.proximoId++, ideia: 'mitico_1', raridade: 'mitico' })
    e = R.lancar(e, e.cartas[0].id).estado
    e.calor = 99
    gravarSave(db, e, T0)
    const pid = e.projetos[0].id
    const multa = Math.min(...Object.values(CALOR.rebrandCusto))
    const { estado: t } = verEstado(db, T0 + 10_000)
    const pv = t.projetos[0].previaTapete
    assert.equal(pv.multa, multa) // caixa 0, mas o ganho do tapete paga a multa (prévia avisa antes)
    const c0 = carregarSave(db).caixa // rendimento dos 10 s
    const r = agir(db, { acao: 'tapete', dados: { projetoId: pid }, chave: chave(), agora: T0 + 10_000 })
    assert.equal(r.ok, true, r.erro)
    assert.equal(r.resultado.multa, multa)
    assert.equal(r.resultado.ganho, pv.ganho)
    assert.equal(r.estado.caixa, c0 + pv.ganho - multa)
    assert.equal(r.estado.calor, CALOR.depoisDoRebrand)
    const linhas = db.prepare('SELECT motivo, valor FROM diario ORDER BY id').all()
    assert.ok(linhas.some(l => l.motivo === 'multa' && l.valor === -multa), JSON.stringify(linhas))
    assert.ok(linhas.some(l => l.motivo === 'tapete' && l.valor === r.resultado.ganho))
    assert.equal(somaDoDiario(db), carregarSave(db).caixa)
    db.close()
  })
})

// ---------------------------------------------------------------------------------------------
// Abertura, tarefa 2 (decisão do dono 20/11 18:17): progresso SEPARADO POR CONTA.
// ---------------------------------------------------------------------------------------------
describe('abertura T2 — progresso por conta', () => {
  const CARTEIRA_A = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
  const CARTEIRA_B = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy'

  function bancoComContas() {
    const db = bancoNovo()
    const a = contaDaCarteira(db, CARTEIRA_A, { agora: T0, semente: 'semente-da-conta-a' })
    const b = criarConta(db, { tipo: 'convidado', agora: T0, semente: 'semente-da-conta-b' })
    return { db, a, b, local: 1 }
  }
  const fotoDaConta = (db, id) => ({
    save: db.prepare('SELECT estado, atualizado_em FROM saves WHERE conta_id = ?').get(id),
    diario: db.prepare('SELECT * FROM diario WHERE conta_id = ? ORDER BY id').all(id),
    pedidos: db.prepare('SELECT * FROM pedidos WHERE conta_id = ? ORDER BY chave').all(id),
    conta: db.prepare('SELECT * FROM contas WHERE id = ?').get(id),
  })

  /** Joga até o 1º tapete da conta, só por ações do servidor. Devolve o agora final. */
  function primeiroTapete(db, contaId, agora = T0) {
    assert.equal(agir(db, { acao: 'imprimir', dados: {}, chave: chave(), agora: agora += 1000, contaId }).ok, true)
    const carta = carregarSaveDaConta(db, contaId).cartas[0]
    assert.equal(agir(db, { acao: 'lancar', dados: { cartaId: carta.id }, chave: chave(), agora: agora += 1000, contaId }).ok, true)
    const pid = carregarSaveDaConta(db, contaId).projetos[0].id
    agora += 120_000
    const r = agir(db, { acao: 'tapete', dados: { projetoId: pid }, chave: chave(), agora, contaId })
    assert.equal(r.ok, true, r.erro)
    assert.equal(carregarSaveDaConta(db, contaId).contagem.tapetes, 1)
    return agora
  }

  test('contas isoladas: imprimir em A não muda B nem a convidada local', () => {
    const { db, a, b, local } = bancoComContas()
    const antesB = fotoDaConta(db, b.id)
    const antesLocal = fotoDaConta(db, local)
    const r = agir(db, { acao: 'imprimir', dados: {}, chave: chave(), agora: T0 + 1000, contaId: a.id })
    assert.equal(r.ok, true, r.erro)
    assert.equal(carregarSaveDaConta(db, a.id).contagem.impressoes, 1)
    assert.equal(r.estado.cartas.length, 1)
    assert.deepEqual(fotoDaConta(db, b.id), antesB)
    assert.deepEqual(fotoDaConta(db, local), antesLocal)
    assert.equal(db.prepare('SELECT conta_id FROM pedidos').get().conta_id, a.id)
    // ver o estado de B mostra o porão de B (nada impresso) e não toca em A
    const antesA = fotoDaConta(db, a.id)
    const vb = verEstado(db, T0 + 2000, { contaId: b.id })
    assert.equal(vb.ok, true)
    assert.equal(vb.estado.cartas.length, 0)
    assert.equal(vb.estado.contagem.impressoes, 0)
    assert.deepEqual(fotoDaConta(db, a.id), antesA)
    // sem contaId = convidada local (compatível até a tarefa 4)
    assert.equal(agir(db, { acao: 'imprimir', dados: {}, chave: chave(), agora: T0 + 3000 }).ok, true)
    assert.equal(carregarSaveDaConta(db, local).contagem.impressoes, 1)
    assert.equal(carregarSaveDaConta(db, b.id).contagem.impressoes, 0)
    db.close()
  })

  test('chave de pedido usada pela conta A é recusada na conta B (e pedido sem conta não é de ninguém)', () => {
    const { db, a, b } = bancoComContas()
    const k = 'pedido-da-conta-a-01'
    const ra = agir(db, { acao: 'imprimir', dados: {}, chave: k, agora: T0 + 1000, contaId: a.id })
    assert.equal(ra.ok, true, ra.erro)
    const antes = foto(db)
    // mesma chave, mesma ação, mesmos dados, outra conta: recusa sem gravar e sem entregar a resposta de A
    for (const contaId of [b.id, undefined, null]) {
      const rb = agir(db, { acao: 'imprimir', dados: {}, chave: k, agora: T0 + 2000, contaId })
      assert.equal(rb.ok, false, `conta ${contaId}`)
      assert.equal(rb.codigo, 'chave_reusada')
      assert.ok(!('estado' in rb) && !('resultado' in rb))
      assert.deepEqual(foto(db), antes)
    }
    // a própria A repete normalmente
    const ra2 = agir(db, { acao: 'imprimir', dados: {}, chave: k, agora: T0 + 3000, contaId: a.id })
    assert.equal(ra2.repetido, true)
    assert.deepEqual(ra2.estado, ra.estado)
    // pedido gravado sem conta (conta_id NULL) não pode ser repetido por conta nenhuma
    db.prepare("INSERT INTO pedidos (chave, acao, corpo, resposta, em) VALUES ('pedido-sem-conta-01', 'imprimir', '{}', ?, ?)")
      .run(JSON.stringify({ ok: true, acao: 'imprimir', resultado: {}, estado: { caixa: 999999 } }), T0)
    const antes2 = foto(db)
    for (const contaId of [a.id, b.id, undefined]) {
      const r = agir(db, { acao: 'imprimir', dados: {}, chave: 'pedido-sem-conta-01', agora: T0 + 4000, contaId })
      assert.equal(r.ok, false)
      assert.equal(r.codigo, 'chave_reusada')
      assert.deepEqual(foto(db), antes2)
    }
    db.close()
  })

  test('conta inexistente ou id estranho: recusa sem gravar nada', () => {
    const db = bancoNovo()
    const antes = foto(db)
    for (const contaId of [9999, 0, -1, 1.5, '1', {}]) {
      const r = agir(db, { acao: 'imprimir', dados: {}, chave: chave(), agora: T0 + 1000, contaId })
      assert.equal(r.ok, false, String(contaId))
      assert.equal(r.codigo, 'conta_invalida')
      const v = verEstado(db, T0 + 1000, { contaId })
      assert.equal(v.ok, false)
      assert.equal(v.codigo, 'conta_invalida')
      assert.deepEqual(foto(db), antes)
    }
    db.close()
  })

  test('soma do diário = caixa de CADA conta numa sequência longa misturando contas', () => {
    const { db, a, b, local } = bancoComContas()
    const ids = [a.id, b.id, local]
    const sorte = lcg(7)
    let agora = T0
    for (let i = 0; i < 450; i++) {
      agora += sorte() < 0.05 ? 3 * 3600_000 : Math.floor(5_000 + sorte() * 40_000)
      const contaId = ids[Math.floor(sorte() * ids.length)]
      const e = carregarSaveDaConta(db, contaId)
      const noAr = e.projetos.filter(p => R.FASES_NO_AR.includes(p.fase) && p.fase !== 'LANCAMENTO')
      const opcoes = [
        ['imprimir', {}], ['imprimir', {}],
        ['lancar', { cartaId: e.cartas[0]?.id }],
        ['tapete', { projetoId: noAr[0]?.id }],
        ['luxo', { luxoId: LUXOS[Math.floor(sorte() * LUXOS.length)].id }],
        ['batida', { escolha: sorte() < 0.5 ? 'rebrand' : 'perder' }],
        ['fundir', { ideia: e.cartas[0]?.ideia }],
      ]
      const [acao, dados] = opcoes[Math.floor(sorte() * opcoes.length)]
      if (sorte() < 0.15) verEstado(db, agora, { contaId })
      else agir(db, { acao, dados, chave: chave(), agora, contaId })
      for (const id of ids) assert.equal(somaDoDiarioDaConta(db, id), carregarSaveDaConta(db, id).caixa, `passo ${i}, conta ${id}`)
    }
    assert.equal(somaDoDiario(db, a.id), carregarSaveDaConta(db, a.id).caixa)
    assert.equal(somaDoDiario(db), carregarSaveDaConta(db, local).caixa) // sem conta = convidada local
    for (const id of ids) {
      assert.ok(carregarSaveDaConta(db, id).contagem.impressoes > 5, `conta ${id} jogou pouco`)
      assert.ok(somaDoDiarioDaConta(db, id) !== 0 || carregarSaveDaConta(db, id).caixa === 0)
    }
    db.close()
  })

  test('estadoParaTela traz conta { tipo, apelido, carteiraCurta, pedirApelido }', () => {
    const { db, a, b } = bancoComContas()
    let v = verEstado(db, T0 + 1000, { contaId: a.id })
    assert.deepEqual(v.estado.conta, { tipo: 'carteira', apelido: null, carteiraCurta: '7xKX…gAsU', pedirApelido: false })
    assert.ok(!JSON.stringify(v).includes(CARTEIRA_A), 'carteira inteira não vai para a tela')
    v = verEstado(db, T0 + 1000, { contaId: b.id })
    assert.deepEqual(v.estado.conta, { tipo: 'convidado', apelido: null, carteiraCurta: null, pedirApelido: false })
    // depois do 1º tapete e sem apelido: pede
    const agora = primeiroTapete(db, a.id)
    v = verEstado(db, agora + 1000, { contaId: a.id })
    assert.equal(v.estado.conta.pedirApelido, true)
    const r = definirApelido(db, a.id, 'Rug_Rico', agora + 2000)
    assert.equal(r.ok, true, r.erro)
    const t = agir(db, { acao: 'imprimir', dados: {}, chave: chave(), agora: agora + 3000, contaId: a.id })
    assert.deepEqual(t.estado.conta, { tipo: 'carteira', apelido: 'Rug_Rico', carteiraCurta: '7xKX…gAsU', pedirApelido: false })
    // chamada direta, sem banco: conta null
    assert.equal(estadoParaTela(carregarSaveDaConta(db, a.id)).conta, null)
    db.close()
  })

  describe('apelido', () => {
    test('validarApelido: tamanho 3–20, letras/números/_, chave sem acento e minúscula, palavrão com leet', () => {
      assert.equal(APELIDO.minimo, 3)
      assert.equal(APELIDO.maximo, 20)
      const ok = (t, chaveEsperada) => {
        const r = validarApelido(t)
        assert.equal(r.ok, true, `${t}: ${r.erro}`)
        assert.equal(r.chave, chaveEsperada, t)
        assert.equal(r.erro, null)
      }
      ok('Rug', 'rug')
      ok('Rug_Rico', 'rug_rico')
      ok('ÁçãoDev_9', 'acaodev_9')
      ok('x'.repeat(20), 'x'.repeat(20))
      ok('computador', 'computador') // não confunde com palavrão (Scunthorpe)
      ok('Cuidado_Ze', 'cuidado_ze')
      ok('Rei_do_Porão', 'rei_do_porao') // "porra" exige 2 r: o nome do jogo passa
      ok('Esporadico', 'esporadico')
      const erro = (t, chaveTexto) => {
        const r = validarApelido(t)
        assert.equal(r.ok, false, String(t))
        assert.equal(r.erro, chaveTexto, String(t))
        assert.equal(r.chave, null)
      }
      erro('ab', 'apelido.erro.curto')
      erro('', 'apelido.erro.curto')
      erro(null, 'apelido.erro.curto')
      erro(42, 'apelido.erro.curto')
      erro('x'.repeat(21), 'apelido.erro.feio')
      erro('tem espaco', 'apelido.erro.feio')
      erro('rug-rico', 'apelido.erro.feio')
      erro('rug.rico', 'apelido.erro.feio')
      erro('аbc', 'apelido.erro.feio') // "а" cirílico: parece latino, não é
      erro('rugé́́', 'apelido.erro.feio') // acento solto empilhado
      for (const feio of ['merda', 'M3RD4', 'porra_dev', 'P0rr4', 'caralho123', 'fdp', 'puta', 'dev_puta', 'BUC3T4', 'm3rrrda']) erro(feio, 'apelido.erro.feio')
    })

    test('definirApelido: só depois do 1º tapete, só 1 vez, único sem ligar para maiúscula e acento', () => {
      const { db, a, b } = bancoComContas()
      const c = contaDaCarteira(db, CARTEIRA_B, { agora: T0, semente: 'semente-da-conta-c' })
      const linha = id => db.prepare('SELECT * FROM contas WHERE id = ?').get(id)

      // antes do 1º tapete: recusa, nada gravado
      let antes = linha(a.id)
      let r = definirApelido(db, a.id, 'Rug_Rico', T0 + 10)
      assert.equal(r.ok, false)
      assert.equal(r.codigo, 'apelido_cedo')
      assert.equal(typeof r.erro, 'string')
      assert.deepEqual(linha(a.id), antes)

      let agora = primeiroTapete(db, a.id)
      antes = linha(a.id)
      // 2 e 21 caracteres, palavrão com leet: recusa com a chave de texto
      for (const [t, k] of [['ab', 'apelido.erro.curto'], ['x'.repeat(21), 'apelido.erro.feio'], ['m3rd4_dev', 'apelido.erro.feio']]) {
        r = definirApelido(db, a.id, t, agora)
        assert.equal(r.ok, false, t)
        assert.equal(r.codigo, 'apelido_invalido')
        assert.equal(r.chaveTexto, k)
        assert.equal(r.erro, TEXTOS[k])
        assert.deepEqual(linha(a.id), antes)
      }
      r = definirApelido(db, a.id, 'Rug_Rico', agora)
      assert.equal(r.ok, true, r.erro)
      assert.equal(r.apelido, 'Rug_Rico')
      assert.equal(buscarConta(db, a.id).apelido, 'Rug_Rico')
      assert.equal(linha(a.id).apelido_chave, 'rug_rico')

      // 2ª vez: recusa (mesmo com outro nome)
      antes = linha(a.id)
      r = definirApelido(db, a.id, 'Outro_Nome', agora + 10)
      assert.equal(r.ok, false)
      assert.equal(r.codigo, 'apelido_definido')
      assert.deepEqual(linha(a.id), antes)

      // duplicado com maiúscula e acento em outra conta: usado
      agora = primeiroTapete(db, b.id, agora)
      for (const t of ['RUG_RICO', 'rug_rico', 'Rúg_Ricó']) {
        const antesB = linha(b.id)
        r = definirApelido(db, b.id, t, agora)
        assert.equal(r.ok, false, t)
        assert.equal(r.codigo, 'apelido_invalido')
        assert.equal(r.chaveTexto, 'apelido.erro.usado')
        assert.equal(r.erro, TEXTOS['apelido.erro.usado'])
        assert.deepEqual(linha(b.id), antesB)
      }
      assert.equal(definirApelido(db, b.id, 'Vó_Do_Golpe', agora).ok, true)
      assert.equal(linha(b.id).apelido_chave, 'vo_do_golpe')

      // conta inexistente; conta C sem tapete continua sem poder
      assert.equal(definirApelido(db, 9999, 'Qualquer', agora).codigo, 'conta_invalida')
      assert.equal(definirApelido(db, c.id, 'Novo_Dev', agora).codigo, 'apelido_cedo')
      db.close()
    })
  })
})
