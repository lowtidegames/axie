// R22 — o que a tela do Keepmile pediu e o servidor não tinha: trocar apelido, replay do topo do ranking e da estrada
// de ontem, ler a última partida terminada e a data de cada conquista. Nenhuma regra de jogo nem número de economia muda.
// Rodar: node --test tests/servidor/reino-r22.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { ALBUM, CARTAS } from '../../shared/reino/config.js'
import { iniciar } from '../../server/index.mjs'
import { abrirBanco, MIGRACOES, VERSAO_DO_BANCO } from '../../server/db.mjs'
import { temporadaDoDia } from '../../server/reino/reino.mjs'
import { criarJogo } from '../../server/jogo.mjs'

const DIA = 86_400_000
const HORA = 3_600_000
const SEGUNDA = 4 + 7 * 3142
const T0 = SEGUNDA * DIA + 10 * HORA // segunda, 10:00 UTC
const folga = { contasPorIp: { max: 100_000, janelaMs: 3_600_000 }, pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 1_000_000, janelaMs: 60_000 } }
const reinoFolgado = {
  partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 },
  replaysPorConta: { max: 100_000, janelaMs: 60_000 }, replaysPorIp: { max: 100_000, janelaMs: 60_000 },
  apelidoPorConta: { max: 100_000, janelaMs: 3_600_000 }, apelidoPorIp: { max: 100_000, janelaMs: 3_600_000 },
}

async function subir({ t = T0, params = {}, dbPath = ':memory:' } = {}) {
  const relogio = { t }
  const s = await iniciar({ dbPath, porta: 0, agora: () => relogio.t, log: () => {}, limites: folga, reino: { params: { ...reinoFolgado, ...params } } })
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
  return { s, api, conta, relogio }
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
async function jogar(api, token, r, max = 10_000) {
  for (let i = 0; i < max && r.status === 'aberta'; i++) {
    const res = await api('POST', '/api/reino/partida/comando', token, { partida: r.id, seq: r.seq, comando: jogada(r) })
    assert.equal(res.status, 200, res.texto)
    r = res.json
  }
  return r
}
/** Joga até vencer a 1ª batalha e desiste (partida curta, com pontos). */
async function jogarUmPouco(api, token, r, comandos = 12) {
  for (let i = 0; i < comandos && r.status === 'aberta'; i++) {
    const res = await api('POST', '/api/reino/partida/comando', token, { partida: r.id, seq: r.seq, comando: jogada(r) })
    assert.equal(res.status, 200, res.texto)
    r = res.json
  }
  if (r.status === 'aberta') r = await desistir(api, token, r.id)
  return r
}
const desistir = async (api, token, id) => {
  const d = await api('POST', '/api/reino/partida/desistir', token, { partida: id })
  assert.equal(d.status, 200, d.texto)
  return d.json
}
const trocar = (api, token, apelido) => api('POST', '/api/reino/apelido', token, { apelido })

// ---------------------------------------------------------------- a) trocar apelido

describe('R22 a — trocar apelido (POST /api/reino/apelido)', () => {
  test('troca válida devolve o perfil com o apelido novo; o jogo antigo e o ranking também veem', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta('Velho Nome')
      const r = await trocar(api, a.token, 'Novo_Nome-1')
      assert.equal(r.status, 200, r.texto)
      assert.equal(r.json.apelido, 'Novo_Nome-1')
      assert.ok(Array.isArray(r.json.conquistas) && r.json.album, 'devolve o Perfil inteiro')
      assert.equal((await api('GET', '/api/reino/perfil', a.token)).json.apelido, 'Novo_Nome-1')
      assert.equal((await api('GET', '/api/estado', a.token)).json.conta.apelido, 'Novo_Nome-1')
      assert.equal(r.json.trocaDeApelido.podeEm, new Date(T0 + 86_400_000).toISOString(), 'diz quando pode trocar de novo')
    } finally { await fechar(s) }
  })

  test('fora da regra: 3–16 de [A-Za-z0-9 _-], sem espaço nas pontas nem duplo (nada é consertado em silêncio)', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      for (const ruim of ['ab', 'a'.repeat(17), ' Ana', 'Ana ', 'Ana  Bia', 'Ána', 'Ana.Bia', 'Ana\tBia', 'Ａｎａ', '', '___', 'Ana​Bia']) {
        const r = await trocar(api, a.token, ruim)
        assert.equal(r.status, 400, `${JSON.stringify(ruim)}: ${r.texto}`)
        assert.equal(r.json.erro.codigo, 'APELIDO_INVALIDO', JSON.stringify(ruim))
      }
      for (const corpo of [{ apelido: 123 }, { apelido: null }, {}, { apelido: 'Bom Nome', extra: 1 }, []]) {
        const r = await api('POST', '/api/reino/apelido', a.token, corpo)
        assert.equal(r.status, 400, JSON.stringify(corpo))
      }
      assert.equal((await api('GET', '/api/reino/perfil', a.token)).json.apelido, a.apelido, 'nada mudou')
      for (const bom of ['abc', 'a'.repeat(16), 'Ana Bia', 'x_y-z 9']) assert.equal((await trocar(api, (await conta()).token, bom)).status, 200, bom)
    } finally { await fechar(s) }
  })

  test('palavras barradas (equipe e ofensa), com caixa, separador ou número no lugar da letra', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta()
      for (const ruim of ['admin', 'ADMIN', 'The_Admin', 'Adm1n', 'Keepmile Staff', 'moderator', 'mod-erator', 'Official', 'St4ff', 'F u c k', 'shit123']) {
        const r = await trocar(api, a.token, ruim)
        assert.equal(r.status, 400, `${ruim}: ${r.texto}`)
        assert.equal(r.json.erro.codigo, 'APELIDO_BARRADO', ruim)
      }
      assert.equal((await trocar(api, a.token, 'Rei Bonito')).status, 200, 'nome comum passa')
    } finally { await fechar(s) }
  })

  test('único sem diferenciar maiúscula; trocar só a caixa do próprio é permitido', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta('Dono Unico')
      const b = await conta()
      const r = await trocar(api, b.token, 'dono unico')
      assert.equal(r.status, 409, r.texto)
      assert.equal(r.json.erro.codigo, 'APELIDO_EM_USO')
      assert.equal((await trocar(api, a.token, 'DONO UNICO')).status, 200)
      assert.equal((await api('GET', '/api/reino/perfil', a.token)).json.apelido, 'DONO UNICO')
    } finally { await fechar(s) }
  })

  test('1 troca por 24 h por conta; tentativa recusada não gasta a vez', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      await conta('Ocupado')
      const a = await conta()
      assert.equal((await trocar(api, a.token, 'ocupado')).status, 409)
      assert.equal((await trocar(api, a.token, 'admin')).status, 400)
      assert.equal((await trocar(api, a.token, 'Primeiro')).status, 200, 'as recusas não gastaram a vez')
      relogio.t += 23 * HORA
      const cedo = await trocar(api, a.token, 'Segundo')
      assert.equal(cedo.status, 429, cedo.texto)
      assert.equal(cedo.json.erro.codigo, 'APELIDO_TROCADO_HOJE')
      assert.equal(cedo.json.erro.podeEm, new Date(T0 + DIA).toISOString())
      assert.equal((await api('GET', '/api/reino/perfil', a.token)).json.apelido, 'Primeiro')
      relogio.t = T0 + DIA
      assert.equal((await trocar(api, a.token, 'Segundo')).status, 200)
    } finally { await fechar(s) }
  })

  test('limite de tentativas por conta e por IP (como as outras rotas)', async () => {
    const { s, api, conta } = await subir({ params: { apelidoPorConta: { max: 3, janelaMs: HORA }, apelidoPorIp: { max: 5, janelaMs: HORA } } })
    try {
      const a = await conta()
      for (let i = 0; i < 3; i++) assert.equal((await trocar(api, a.token, 'x')).status, 400)
      const r = await trocar(api, a.token, 'Bom Nome')
      assert.equal(r.status, 429, r.texto)
      assert.equal(r.json.erro.codigo, 'MUITOS_PEDIDOS')
      const b = await conta()
      for (let i = 0; i < 2; i++) assert.equal((await trocar(api, b.token, 'x')).status, 400)
      const ip = await trocar(api, b.token, 'Outro Bom')
      assert.equal(ip.status, 429, 'IP: 3 + 2 tentativas já foram')
      assert.equal(ip.json.erro.codigo, 'MUITOS_PEDIDOS')
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- b) replay do topo e estrada de ontem

describe('R22 b — ranking traz a melhor partida de cada linha e o placar da estrada de ontem', () => {
  test('cada linha do topo traz a MELHOR partida terminada da temporada, assistível por outra conta; fora do topo, null', async () => {
    const { s, api, conta } = await subir({ params: { topoComReplay: 1 } })
    try {
      const a = await conta(), b = await conta(), v = await conta()
      const a1 = await jogarUmPouco(api, a.token, await abrir(api, a.token, 'ranking'), 30)
      const a2 = await desistir(api, a.token, (await abrir(api, a.token, 'ranking')).id)
      assert.ok(a1.resultado.pontos > a2.resultado.pontos, `${a1.resultado.pontos} > ${a2.resultado.pontos}`)
      await desistir(api, b.token, (await abrir(api, b.token, 'ranking')).id)
      await abrir(api, b.token, 'ranking') // aberta: nunca vira "melhor"
      const r = (await api('GET', '/api/reino/ranking', v.token)).json
      assert.equal(r.lista[0].apelido, a.apelido)
      assert.equal(r.lista[0].partida, a1.id)
      assert.equal(r.lista[1].partida, null, 'fora do topo do replay: sem id')
      const rep = await api('GET', `/api/reino/replay/${a1.id}`, v.token)
      assert.equal(rep.status, 200, rep.texto)
      assert.equal(rep.json.propria, false)
    } finally { await fechar(s) }
  })

  test('estradaDeOntem: placar do dia passado com id assistível; a estrada de hoje não aparece nele e continua fechada', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      const a = await conta(), v = await conta()
      await desistir(api, a.token, (await abrir(api, a.token, 'ranking')).id)
      relogio.t += DIA // terça
      const ontem = await desistir(api, a.token, (await abrir(api, a.token, 'estrada')).id)
      relogio.t += DIA // quarta
      const hoje = await desistir(api, a.token, (await abrir(api, a.token, 'estrada')).id)
      const r = (await api('GET', '/api/reino/ranking', v.token)).json
      assert.equal(r.estradaDeOntem.dia, new Date((SEGUNDA + 1) * DIA).toISOString().slice(0, 10))
      assert.deepEqual(r.estradaDeOntem.lista.map((l) => l.partida), [ontem.id])
      assert.equal(r.estradaDeOntem.lista[0].apelido, a.apelido)
      assert.equal((await api('GET', `/api/reino/replay/${ontem.id}`, v.token)).status, 200)
      assert.ok(!JSON.stringify(r.estradaDeOntem).includes(hoje.id))
      assert.equal((await api('GET', `/api/reino/replay/${hoje.id}`, v.token)).status, 404)
      assert.equal((await api('GET', `/api/reino/replay/${hoje.id}`, a.token)).status, 409)
    } finally { await fechar(s) }
  })

  test('estradaDeOntem: quem ainda tem a estrada de ontem aberta recebe o placar sem id (não poderia assistir)', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      const a = await conta(), v = await conta()
      relogio.t += DIA // terça 10:00
      await desistir(api, a.token, (await abrir(api, a.token, 'ranking')).id)
      await desistir(api, v.token, (await abrir(api, v.token, 'ranking')).id)
      const ontem = await desistir(api, a.token, (await abrir(api, a.token, 'estrada')).id)
      relogio.t = (SEGUNDA + 2) * DIA - 10 * 60_000 // terça 23:50
      await abrir(api, v.token, 'estrada')
      relogio.t = (SEGUNDA + 2) * DIA + 10 * 60_000 // quarta 00:10, a de ontem ainda aberta
      const r = (await api('GET', '/api/reino/ranking', v.token)).json
      assert.equal(r.estradaDeOntem.lista[0].apelido, a.apelido)
      assert.equal(r.estradaDeOntem.lista[0].partida, null)
      assert.equal((await api('GET', `/api/reino/replay/${ontem.id}`, v.token)).status, 404)
      const ra = (await api('GET', '/api/reino/ranking', a.token)).json
      assert.equal(ra.estradaDeOntem.lista[0].partida, ontem.id, 'a própria sempre')
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- c) última partida terminada

describe('R22 c — GET /api/reino/partida/ultima', () => {
  test('a última terminada da conta (sobrevive a recarregar), só do dono, nunca a aberta, sem refazer a partida', async () => {
    const { s, api, conta } = await subir()
    try {
      const a = await conta(), b = await conta()
      let r = await api('GET', '/api/reino/partida/ultima', a.token)
      assert.equal(r.status, 200, r.texto)
      assert.deepEqual(r.json, { partida: null })
      const fim = await jogarUmPouco(api, a.token, await abrir(api, a.token, 'treino'))
      await abrir(api, a.token, 'ranking') // aberta depois: não muda a "última terminada"
      const antes = s.reino._interno.motor()
      r = await api('GET', '/api/reino/partida/ultima', a.token)
      assert.equal(r.status, 200, r.texto)
      assert.equal(r.json.partida.id, fim.id)
      assert.equal(r.json.partida.status, 'terminada')
      assert.deepEqual(r.json.partida.resultado, fim.resultado)
      assert.deepEqual(r.json.partida.visao, fim.visao)
      assert.equal(r.json.partida.semente, undefined)
      assert.equal(r.json.partida.repetido, undefined)
      assert.deepEqual(s.reino._interno.motor(), antes, 'resposta guardada: o motor não roda')
      assert.deepEqual((await api('GET', '/api/reino/partida/ultima', b.token)).json, { partida: null }, 'a de outro não sai')
      assert.equal((await api('GET', '/api/reino/partida/ultima?modo=ranking', a.token)).json.partida, null)
      assert.equal((await api('GET', '/api/reino/partida/ultima?modo=treino', a.token)).json.partida.id, fim.id)
      assert.equal((await api('GET', '/api/reino/partida/ultima?modo=xx', a.token)).status, 400)
      assert.equal((await api('GET', '/api/reino/partida/ultima?outro=1', a.token)).status, 400)
    } finally { await fechar(s) }
  })

  test('partida terminada por tempo sem comando nenhum também sai (terminada, motivo tempo)', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      const a = await conta()
      const p = await abrir(api, a.token, 'treino')
      relogio.t += 4 * HORA
      const r = await api('GET', '/api/reino/partida/ultima', a.token)
      assert.equal(r.status, 200, r.texto)
      assert.equal(r.json.partida.id, p.id)
      assert.equal(r.json.partida.status, 'terminada')
      assert.equal(r.json.partida.resultado.motivo, 'tempo')
      assert.equal(r.json.partida.opcoes, null)
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- d) conquistas com data

describe('R22 d — conquistas com a data em que foram ganhas', () => {
  test('perfil.conquistas[].quando = ISO da hora em que ganhou; não feita = null', async () => {
    const { s, api, conta, relogio } = await subir()
    try {
      const a = await conta()
      const ini = (await api('GET', '/api/reino/perfil', a.token)).json
      assert.ok(ini.conquistas.every((c) => c.quando === null))
      relogio.t += 5 * 60_000
      const quando = relogio.t
      await jogar(api, a.token, await abrir(api, a.token, 'treino'))
      relogio.t += HORA
      const p = (await api('GET', '/api/reino/perfil', a.token)).json
      const supper = p.conquistas.find((c) => c.id === 'supper')
      assert.equal(supper.feita, true)
      assert.equal(supper.quando, new Date(quando).toISOString())
      for (const c of p.conquistas) assert.equal(c.quando === null, !c.feita, c.id)
    } finally { await fechar(s) }
  })
})

// ---------------------------------------------------------------- migração v7

describe('R22 — migração v7 (banco usado da v6 e do zero)', () => {
  test('v6 com dados: cópia antes; conquista antiga fica feita com quando null; troca de apelido funciona', async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'keepmile-v6-'))
    const arq = path.join(pasta, 'v6.db')
    const db6 = abrirBanco(arq, { migracoes: MIGRACOES.slice(0, 6), agora: () => T0 })
    const jogo = criarJogo(db6, { agora: () => T0, log: () => {} })
    const { conta, token } = jogo.criarConta('Veterana Seis')
    // dados do Keepmile gravados como a v6 grava (conta com conquista antiga, sem data; partida terminada sem resposta guardada)
    const dia = Math.floor(T0 / DIA)
    db6.prepare("INSERT INTO reino_contas (conta_id, energia_saldo, energia_dia, conquistas, criada_em) VALUES (?, 3, ?, '[\"supper\"]', ?)").run(conta.id, dia, T0)
    const p = { id: `pa_${'ab'.repeat(12)}` }
    db6.prepare(`INSERT INTO reino_partidas (id, conta_id, modo, dia, temporada, semente, liberadas, comandos, tempos, seq, status, motivo, pontos, vencidas, rodada,
                 conferida, criada_em, tocada_em, terminada_em) VALUES (?, ?, 'treino', ?, ?, ?, ?, '[]', '[]', 0, 'terminada', 'tempo', 0, 0, 1, 1, ?, ?, ?)`)
      .run(p.id, conta.id, dia, temporadaDoDia(dia), 'cd'.repeat(16), JSON.stringify(ALBUM.inicial), T0, T0, T0)
    assert.equal(db6.prepare('PRAGMA user_version').get().user_version, 6)
    db6.close()

    const { s, api } = await subir({ dbPath: arq, t: T0 + 60_000 })
    try {
      // regra mudou (R39): entrou a v8 (só dados: conquistas de degrau)
      assert.equal(VERSAO_DO_BANCO, 8)
      assert.equal(s.db.prepare('PRAGMA user_version').get().user_version, 8)
      const copias = fs.readdirSync(path.join(pasta, 'copias')).filter((n) => n.startsWith('v6.db.v6.'))
      assert.equal(copias.length, 1, copias.join(','))
      const c = new DatabaseSync(path.join(pasta, 'copias', copias[0]), { readOnly: true })
      assert.equal(c.prepare('PRAGMA user_version').get().user_version, 6)
      assert.equal(c.prepare('SELECT COUNT(*) n FROM reino_partidas').get().n, 1)
      c.close()
      const perfil = (await api('GET', '/api/reino/perfil', token)).json
      assert.deepEqual(perfil.conquistas.find((x) => x.id === 'supper'), { id: 'supper', feita: true, quando: null })
      assert.equal((await api('GET', '/api/reino/partida/ultima', token)).json.partida.id, p.id)
      assert.equal((await trocar(api, token, 'Veterana Sete')).status, 200)
    } finally { await fechar(s) }
  })

  test('banco novo nasce na v7 com as colunas novas', () => {
    const db = abrirBanco(':memory:')
    try {
      assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8) // regra mudou (R39): entrou a v8 (só dados: conquistas de degrau)
      const cols = db.prepare('PRAGMA table_info(reino_contas)').all().map((c) => c.name)
      assert.ok(cols.includes('apelido_trocado_em') && cols.includes('conquistas_quando'), cols.join(','))
    } finally { db.close() }
  })
})
