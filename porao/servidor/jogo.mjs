// Porão (jogo-sátira) — camada de ações do servidor.
// Cada ação, dentro de UMA transação: confere a chave de pedido (repetida → mesma resposta, sem contar 2×) →
// carrega o save → avancar(estado, agora) → aplica a ação de regras.js → grava o save + linhas do diário com a
// diferença de caixa (rendimento do tempo e a própria ação) → guarda a resposta pela chave.
// Ação recusada: nada é gravado (nem o relógio, nem o pedido).
// O relógio entra por parâmetro (agora, em ms). A tela recebe só estadoParaTela: sem semente, sem contador do sorteio.
import * as R from '../comum/regras.js'
import { TEXTOS, citar } from '../comum/nomes.js'
import { LUXOS, INFLUENCIADORES, CONTRATO, CALOR, GAVETA, FUSAO, RARIDADES, PRESTIGIO } from '../comum/config.js'
import { transacao, carregarSave, gravarSave, anotarDiario, buscarPedido, gravarPedido } from './banco.mjs'

const ERRO_GENERICO = 'Não deu para fazer isso agora.'

/** Ações que a tela pode pedir: nome → (estado, dados) → resultado de regras.js. */
export const ACOES = Object.freeze({
  imprimir: (e) => R.imprimir(e),
  fundir: (e, d) => R.fundir(e, d.ideia),
  lancar: (e, d) => R.lancar(e, d.cartaId),
  tapete: (e, d) => R.puxarTapete(e, d.projetoId),
  batida: (e, d) => R.resolverBatida(e, d.escolha),
  luxo: (e, d) => R.comprarLuxo(e, d.luxoId),
  contrato: (e, d) => R.contratar(e, d.projetoId, d.influenciadorId),
  resposta: (e, d) => R.responderContrato(e, d.projetoId, d.resposta),
  prestigio: (e) => R.irPreso(e),
})

const CHAVE_VALIDA = /^[A-Za-z0-9_-]{8,80}$/
const LIMITE_CORPO = 2000 // caracteres do corpo em JSON (limite técnico)

class Recusa extends Error {
  constructor(erro, codigo) { super(erro); this.codigo = codigo }
}

// ---------------------------------------------------------------------------------------------
// Ação
// ---------------------------------------------------------------------------------------------
/**
 * agir(db, { acao, dados, chave, agora, textos? }) →
 *   { ok: true, acao, resultado, estado: <estadoParaTela>, repetido? } | { ok: false, erro, codigo }
 * codigo: 'chave_invalida' | 'chave_reusada' | 'acao_invalida' | 'dados_invalidos' | 'recusado'.
 */
export function agir(db, { acao, dados = {}, chave, agora, textos = TEXTOS } = {}) {
  if (typeof chave !== 'string' || !CHAVE_VALIDA.test(chave)) {
    return falha('Pedido sem chave válida (8 a 80 letras, números, - ou _).', 'chave_invalida')
  }
  if (typeof acao !== 'string' || !Object.hasOwn(ACOES, acao)) return falha('Ação desconhecida.', 'acao_invalida')
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados) || Object.getPrototypeOf(dados) !== Object.prototype) {
    return falha('Pedido com dados inválidos.', 'dados_invalidos')
  }
  const corpo = JSON.stringify(dados)
  if (corpo.length > LIMITE_CORPO) return falha('Pedido grande demais.', 'dados_invalidos')
  if (!Number.isFinite(agora)) throw new TypeError('agora precisa ser número (ms)')

  try {
    return transacao(db, () => {
      const antigo = buscarPedido(db, chave)
      if (antigo) {
        if (antigo.acao !== acao || antigo.corpo !== corpo) throw new Recusa('Essa chave de pedido já foi usada para outro pedido.', 'chave_reusada')
        return { ...JSON.parse(antigo.resposta), repetido: true }
      }
      const inicio = carregarSave(db)
      const avanco = R.avancar(inicio, agora)
      const r = ACOES[acao](avanco.estado, dados)
      if (!r || r.ok !== true) throw new Recusa(r?.erro || ERRO_GENERICO, 'recusado')
      const fim = r.estado
      anotarDiferenca(db, inicio.caixa, avanco.estado.caixa, 'rendimento', agora, chave)
      anotarDiferenca(db, avanco.estado.caixa, fim.caixa, acao, agora, chave)
      gravarSave(db, fim, agora)
      const resultado = limparResultado(r, fim, textos)
      resultado.eventosDoTempo = avanco.eventos
      const resposta = { ok: true, acao, resultado, estado: estadoParaTela(fim, { textos }) }
      gravarPedido(db, { chave, acao, corpo, resposta: JSON.stringify(resposta), em: agora })
      return resposta
    })
  } catch (e) {
    if (e instanceof Recusa) return falha(e.message, e.codigo)
    throw e
  }
}

/**
 * verEstado(db, agora, { textos }) → { ok: true, estado: <estadoParaTela>, segundos, online, rendeu, eventos }.
 * Adianta o relógio e grava (com a linha de rendimento no diário); com gravar:false só calcula (SAVE_SO_LEITURA). Sem chave de pedido: repetir só adianta o relógio.
 */
export function verEstado(db, agora, { textos = TEXTOS, gravar = true } = {}) {
  if (!Number.isFinite(agora)) throw new TypeError('agora precisa ser número (ms)')
  return transacao(db, () => {
    const inicio = carregarSave(db)
    const avanco = R.avancar(inicio, agora)
    if (gravar) {
      anotarDiferenca(db, inicio.caixa, avanco.estado.caixa, 'rendimento', agora, null)
      gravarSave(db, avanco.estado, agora)
    }
    return {
      ok: true,
      estado: estadoParaTela(avanco.estado, { textos }),
      segundos: avanco.segundos,
      online: avanco.online,
      rendeu: avanco.rendeu,
      eventos: avanco.eventos,
    }
  })
}

/** Soma de todas as linhas do diário (deve ser igual ao caixa do save). */
export function somaDoDiario(db) {
  return db.prepare('SELECT COALESCE(SUM(valor), 0) AS s FROM diario').get().s
}

/** Últimas linhas do diário (mais nova primeiro). */
export function lerDiario(db, limite = 50) {
  const n = Number.isSafeInteger(limite) && limite > 0 ? Math.min(limite, 500) : 50
  return db.prepare('SELECT id, em, motivo, valor, caixa_depois AS caixaDepois FROM diario ORDER BY id DESC LIMIT ?').all(n)
}

function falha(erro, codigo) { return { ok: false, erro, codigo } }

function anotarDiferenca(db, antes, depois, motivo, em, pedido) {
  const valor = depois - antes
  if (valor !== 0) anotarDiario(db, { em, motivo, valor, caixaDepois: depois, pedido })
}

/** Resultado de regras.js sem o estado (e sem nada do sorteio), com nomes resolvidos. */
function limparResultado(r, estado, textos) {
  const { estado: _fora, ok: _ok, ...resto } = r
  const out = structuredClone(resto)
  if (out.carta) out.carta.nome = nomeIdeia(out.carta.ideia, textos)
  if (out.projeto) out.projeto.nome = nomeProjeto(out.projeto, textos)
  if (out.projetoId) {
    const p = estado.projetos.find(x => x.id === out.projetoId)
    if (p) out.projetoNome = nomeProjeto(p, textos)
  }
  delete out.semente
  delete out.sorteios
  return out
}

// ---------------------------------------------------------------------------------------------
// Nomes (chave → texto de nomes.js, ou do nomes.local.json carregado pelo servidor)
// ---------------------------------------------------------------------------------------------
const texto = (textos, chave) => (typeof textos[chave] === 'string' ? textos[chave] : TEXTOS[chave] ?? chave)

/** "raro_3" → "ideia.raro.3" */
function prefixoIdeia(ideia) {
  const i = String(ideia).lastIndexOf('_')
  return `ideia.${ideia.slice(0, i)}.${ideia.slice(i + 1)}`
}
const nomeIdeia = (ideia, textos) => texto(textos, `${prefixoIdeia(ideia)}.nome`)

/** Nome do golpe na tela: rebrand renomeia ("Nome 2.0", "Nome 3.0"...). */
function nomeProjeto(p, textos) {
  const base = nomeIdeia(p.ideia, textos)
  return p.rebrands > 0 ? `${base} ${p.rebrands + 1}.0` : base
}

/** infl_<n> → "influ.<tamanho>.<k>" (k-ésimo do mesmo tamanho no catálogo). */
const CHAVE_INFLU = (() => {
  const m = {}
  const conta = {}
  for (const i of INFLUENCIADORES) {
    conta[i.tamanho] = (conta[i.tamanho] || 0) + 1
    m[i.id] = `influ.${i.tamanho}.${conta[i.tamanho]}`
  }
  return m
})()

/**
 * Luxo (id do config = nome do sprite) → chave em nomes.js. Provisório: a lista de nomes.js não bate 1-para-1 com
 * a de config.js; os parecidos foram ligados pelo sentido, os outros pelo bônus.
 */
const CHAVE_LUXO = {
  cadeira_gamer: 'luxo.2', // Cadeira Gamer Trono
  aquario: 'luxo.1', // Aquário de Peixe Caro
  tapete_persa: 'luxo.6', // Ar-Condicionado Polar (menos Calor)
  letreiro_neon: 'luxo.5', // Neon de Frase Motivacional
  cafeteira_chique: 'luxo.3', // Máquina de Bebida Infinita
  cofre: 'luxo.8', // Estátua de Mim Mesmo
  carro_na_garagem: 'luxo.4', // Carro na Garagem
}

function postsDe(textos, chaveInflu) {
  const lista = []
  for (let k = 1; texto(textos, `${chaveInflu}.post.${k}`) !== `${chaveInflu}.post.${k}`; k++) lista.push(`${chaveInflu}.post.${k}`)
  return lista
}

function nomePseudonimo(estado, textos) {
  if (estado.pseudonimo <= 0) return texto(textos, 'personagem.rugrigo.nome')
  let n = 0
  while (texto(textos, `prestigio.${n + 1}`) !== `prestigio.${n + 1}`) n++
  const k = Math.min(estado.pseudonimo, n)
  return texto(textos, `prestigio.${k}`)
}

// ---------------------------------------------------------------------------------------------
// O que a tela vê
// ---------------------------------------------------------------------------------------------
const arred = (x, casas = 2) => Math.round(x * 10 ** casas) / 10 ** casas

/**
 * Estado para a tela: SEM semente e sem contador do sorteio; nomes resolvidos; prévias prontas.
 * opcoes.textos: textos por chave (padrão nomes.js; o servidor passa o resultado de carregarNomes).
 */
export function estadoParaTela(estado, { textos = TEXTOS } = {}) {
  const noAr = p => R.FASES_NO_AR.includes(p.fase)
  const bonus = R.bonus(estado)
  const liberados = R.influenciadoresLiberados(estado)
  const celular = []
  const chat = []

  const projetos = estado.projetos.map(p => {
    const nome = nomeProjeto(p, textos)
    const pre = prefixoIdeia(p.ideia)
    let contrato = null
    if (p.contrato) {
      const c = p.contrato
      const chaveInf = CHAVE_INFLU[c.influenciador]
      const nomeInf = texto(textos, `${chaveInf}.nome`)
      contrato = {
        influenciador: c.influenciador,
        influenciadorNome: nomeInf,
        tamanho: c.tamanho,
        fase: c.fase,
        videos: c.videos,
        p1: c.p1,
        proposta: c.proposta,
        esperaRestanteSeg: Math.ceil(c.esperaRestante),
        podeResponder: (c.fase === 'V1_NO_AR' && c.proposta !== null) || c.fase === 'PEDE_MAIS',
        podeChorar: c.fase === 'PEDE_MAIS' && !c.chorou,
        chorou: c.chorou,
        motivo: c.motivo,
      }
      const msg = (tipo, chaveTexto, extra = {}) => celular.push({
        projetoId: p.id, influenciador: c.influenciador, de: nomeInf, tipo,
        texto: chaveTexto ? citar(texto(textos, chaveTexto), nome) : null, ...extra,
      })
      msg('oferta', 'msg.video1.oferta', { valor: c.p1 })
      if (c.proposta !== null && (c.fase === 'PEDE_MAIS' || c.chorou || c.motivo === 'sumiu' || (c.proposta > c.p1))) {
        msg('pede_mais', 'msg.melhorar.oferta', { valor: c.chorou ? Math.round(c.p1 * CONTRATO.multiplicadorP2) : c.proposta })
      } else if (c.proposta !== null) {
        msg('proposta', null, { valor: c.proposta }) // sem texto próprio em nomes.js ainda: a tela mostra o valor
      }
      if (c.chorou) msg('desconto', 'msg.choro.resposta', { valor: c.proposta })
      if (c.motivo === 'sumiu') msg('sumiu', 'msg.sumir')
      const posts = postsDe(textos, chaveInf)
      for (let v = 1; v <= c.videos; v++) {
        const roteiro = `video.${v}.roteiro`
        if (texto(textos, roteiro) !== roteiro) chat.push({ projetoId: p.id, autor: nomeInf, tipo: 'video', video: v, texto: citar(texto(textos, roteiro), nome) })
        if (posts.length) chat.push({ projetoId: p.id, autor: nomeInf, tipo: 'post', texto: citar(texto(textos, posts[(p.id + v - 1) % posts.length]), nome) })
      }
    }
    if (noAr(p)) chat.push({ projetoId: p.id, autor: null, tipo: 'trouxa', texto: texto(textos, `chat.${(p.id % 8) + 1}`) })
    const previa = noAr(p) && p.fase !== 'LANCAMENTO' && !estado.batida ? R.previaTapete(estado, p.id) : null
    return {
      id: p.id,
      ideia: p.ideia,
      raridade: p.raridade,
      nome,
      textoLancamento: citar(texto(textos, `${pre}.lancamento`), nome),
      textoFim: p.fase === 'APLICADO' || p.fase === 'APREENDIDO' ? citar(texto(textos, `${pre}.fim`), nome) : null,
      textoTapete: p.fase === 'APLICADO' ? texto(textos, `tapete.${((p.id - 1) % 7) + 1}`) : null,
      fase: p.fase,
      noAr: noAr(p),
      hype: arred(p.hype, 1),
      trouxas: Math.floor(p.trouxas),
      tempoNoArSeg: Math.floor(p.tempoNoAr),
      lancamentoRestanteSeg: Math.ceil(p.lancamentoRestante),
      rebrands: p.rebrands,
      rendePorHora: arred(R.rendimentoPorHora(estado, p.id)),
      ganhoNoAr: Math.floor(p.ganhoNoAr),
      ganhoTapete: p.ganhoTapete ?? null,
      contrato,
      previaTapete: previa ? { ...previa, calor: arred(previa.calor, 1), calorDepois: arred(previa.calorDepois, 1) } : null,
    }
  })

  const contagemIdeia = {}
  for (const c of estado.cartas) contagemIdeia[c.ideia] = (contagemIdeia[c.ideia] || 0) + 1
  const ultimaRaridade = RARIDADES[RARIDADES.length - 1]

  const pb = R.previaBatida(estado)
  const alvo = pb ? estado.projetos.find(p => p.id === pb.projetoId) : null

  return {
    versao: estado.versao,
    relogio: estado.ultimoTempo,
    caixa: estado.caixa,
    caixaTotal: estado.caixaTotal,
    calor: arred(estado.calor, 1),
    calorMaximo: CALOR.maximo,
    personagem: { nome: texto(textos, 'personagem.rugrigo.nome'), bio: texto(textos, 'personagem.rugrigo.bio') },
    pseudonimo: { numero: estado.pseudonimo, nome: nomePseudonimo(estado, textos) },
    prestigio: {
      nivel: estado.prestigio.nivel,
      meta: R.metaPrestigio(estado),
      liberado: R.prestigioLiberado(estado),
      bonusRendimento: arred(estado.prestigio.nivel * PRESTIGIO.bonusPorNivel),
    },
    bonus: { rendimento: arred(bonus.rendimento), hype: arred(bonus.hype), calor: arred(bonus.calor) },
    impressora: {
      custo: R.custoImpressao(estado),
      chances: R.chancesDaImpressora(),
      gaveta: estado.cartas.length,
      gavetaMaxima: GAVETA.maximoDeCartas,
    },
    cartas: estado.cartas.map(c => ({
      id: c.id,
      ideia: c.ideia,
      raridade: c.raridade,
      nome: nomeIdeia(c.ideia, textos),
      podeFundir: c.raridade !== ultimaRaridade && contagemIdeia[c.ideia] >= FUSAO.quantidade,
    })),
    fusao: { quantidade: FUSAO.quantidade },
    projetos,
    batida: pb ? { ...pb, projetoNome: alvo ? nomeProjeto(alvo, textos) : null } : null,
    luxos: LUXOS.map(l => ({
      id: l.id,
      nome: texto(textos, `${CHAVE_LUXO[l.id]}.nome`),
      descricao: texto(textos, `${CHAVE_LUXO[l.id]}.descricao`),
      custo: l.custo,
      bonus: { ...l.bonus },
      comprado: estado.luxos.includes(l.id),
      podeComprar: !estado.luxos.includes(l.id) && estado.caixa >= l.custo && !estado.batida,
    })),
    influenciadores: INFLUENCIADORES.map(i => {
      const k = CHAVE_INFLU[i.id]
      return {
        id: i.id,
        tamanho: i.tamanho,
        nome: texto(textos, `${k}.nome`),
        bio: texto(textos, `${k}.bio`),
        p1: CONTRATO.tamanhos[i.tamanho].p1,
        liberado: liberados.includes(i.id),
        liberaComTapetes: i.liberaComTapetes,
        carimbos: estado.carteirinha[i.id] || 0,
        reincidente: R.ehReincidente(estado, i.id),
      }
    }),
    celular,
    chat,
    album: Object.keys(estado.album).filter(k => estado.album[k]).map(ideia => ({ ideia, nome: nomeIdeia(ideia, textos) })),
    contagem: { ...estado.contagem },
  }
}
