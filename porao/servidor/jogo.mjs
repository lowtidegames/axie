// Porão (jogo-sátira) — camada de ações do servidor.
// Cada ação, dentro de UMA transação: confere a chave de pedido (repetida → mesma resposta, sem contar 2×) →
// carrega o save → avancar(estado, agora) → aplica a ação de regras.js → grava o save + linhas do diário com a
// diferença de caixa (rendimento do tempo e a própria ação) → guarda a resposta pela chave.
// Ação recusada: nada é gravado (nem o relógio, nem o pedido).
// O relógio entra por parâmetro (agora, em ms). A tela recebe só estadoParaTela: sem semente, sem contador do sorteio.
import * as R from '../comum/regras.js'
import { TEXTOS, citar } from '../comum/nomes.js'
import { LUXOS, INFLUENCIADORES, CONTRATO, CALOR, GAVETA, FUSAO, RARIDADES, PRESTIGIO } from '../comum/config.js'
import {
  transacao, anotarDiario, buscarPedido, gravarPedido,
  buscarConta, contaConvidadaLocal, carregarSaveDaConta, gravarSaveDaConta, somaDoDiarioDaConta,
} from './banco.mjs'
import { validarApelido, ERROS_DO_APELIDO } from '../comum/apelido.js'

// Progresso POR CONTA (decisão do dono 20/11 18:17): agir, verEstado e definirApelido recebem contaId.
// Sem contaId (undefined ou null) = conta convidada local padrão (compatibilidade até a tarefa 4, que liga a sessão).
// Chave de pedido é da conta que a usou: outra conta (ou pedido gravado sem conta) recebe 'chave_reusada'.

const ERRO_GENERICO = 'Não deu para fazer isso agora.'
const ERRO_CONTA = 'Conta não encontrada.'

/** Conta do pedido: contaId omitido = convidada local; id que não é inteiro positivo ou não existe = null. */
function contaDoPedido(db, contaId) {
  if (contaId === undefined || contaId === null) return contaConvidadaLocal(db)
  if (!Number.isSafeInteger(contaId) || contaId <= 0) return null
  return buscarConta(db, contaId)
}

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
 * agir(db, { acao, dados, chave, agora, textos?, contaId? }) →
 *   { ok: true, acao, resultado, estado: <estadoParaTela>, repetido? } | { ok: false, erro, codigo }
 * codigo: 'chave_invalida' | 'chave_reusada' | 'acao_invalida' | 'dados_invalidos' | 'recusado' | 'conta_invalida'.
 */
export function agir(db, { acao, dados = {}, chave, agora, textos = TEXTOS, contaId } = {}) {
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
      const conta = contaDoPedido(db, contaId)
      if (!conta) throw new Recusa(ERRO_CONTA, 'conta_invalida')
      const antigo = buscarPedido(db, chave)
      if (antigo) {
        // Mesma mensagem para "outra conta" e "outro pedido": não conta a ninguém que a chave existe noutra conta.
        if (antigo.contaId !== conta.id || antigo.acao !== acao || antigo.corpo !== corpo) {
          throw new Recusa('Essa chave de pedido já foi usada para outro pedido.', 'chave_reusada')
        }
        return { ...JSON.parse(antigo.resposta), repetido: true }
      }
      const inicio = R.atualizarEstado(carregarSaveDaConta(db, conta.id))
      const avanco = R.avancar(inicio, agora)
      const r = ACOES[acao](avanco.estado, dados)
      if (!r || r.ok !== true) throw new Recusa(r?.erro || ERRO_GENERICO, 'recusado')
      const fim = r.estado
      anotarComMulta(db, conta.id, inicio.caixa, avanco.estado.caixa, avanco.eventos, 'rendimento', agora, chave)
      anotarComMulta(db, conta.id, avanco.estado.caixa, fim.caixa, r.eventos, acao, agora, chave)
      gravarSaveDaConta(db, conta.id, fim, agora)
      const resultado = limparResultado(r, fim, textos)
      resultado.eventosDoTempo = avanco.eventos
      const resposta = { ok: true, acao, resultado, estado: estadoParaTela(fim, { textos, conta }) }
      gravarPedido(db, { chave, acao, corpo, resposta: JSON.stringify(resposta), em: agora, contaId: conta.id })
      return resposta
    })
  } catch (e) {
    if (e instanceof Recusa) return falha(e.message, e.codigo)
    throw e
  }
}

/**
 * verEstado(db, agora, { textos, gravar, contaId }) →
 *   { ok: true, estado: <estadoParaTela>, segundos, online, rendeu, eventos } | { ok: false, erro, codigo: 'conta_invalida' }.
 * Adianta o relógio da conta e grava (com a linha de rendimento no diário); com gravar:false só calcula (SAVE_SO_LEITURA). Sem chave de pedido: repetir só adianta o relógio.
 */
export function verEstado(db, agora, { textos = TEXTOS, gravar = true, contaId } = {}) {
  if (!Number.isFinite(agora)) throw new TypeError('agora precisa ser número (ms)')
  return transacao(db, () => {
    const conta = contaDoPedido(db, contaId)
    if (!conta) return falha(ERRO_CONTA, 'conta_invalida')
    const inicio = R.atualizarEstado(carregarSaveDaConta(db, conta.id))
    const avanco = R.avancar(inicio, agora)
    if (gravar) {
      anotarComMulta(db, conta.id, inicio.caixa, avanco.estado.caixa, avanco.eventos, 'rendimento', agora, null)
      gravarSaveDaConta(db, conta.id, avanco.estado, agora)
    }
    return {
      ok: true,
      estado: estadoParaTela(avanco.estado, { textos, conta }),
      segundos: avanco.segundos,
      online: avanco.online,
      rendeu: avanco.rendeu,
      eventos: avanco.eventos,
    }
  })
}

/** Soma do diário da conta (deve ser igual ao caixa do save dela). Sem contaId = convidada local. */
export function somaDoDiario(db, contaId) {
  const conta = contaDoPedido(db, contaId)
  return conta ? somaDoDiarioDaConta(db, conta.id) : 0
}

/** Últimas linhas do diário da conta (mais nova primeiro). Sem contaId = convidada local. */
export function lerDiario(db, limite = 50, { contaId } = {}) {
  const n = Number.isSafeInteger(limite) && limite > 0 ? Math.min(limite, 500) : 50
  const conta = contaDoPedido(db, contaId)
  if (!conta) return []
  return db.prepare('SELECT id, em, motivo, valor, caixa_depois AS caixaDepois FROM diario WHERE conta_id = ? ORDER BY id DESC LIMIT ?').all(conta.id, n)
}

/**
 * definirApelido(db, contaId, texto, agora, { textos }) →
 *   { ok: true, apelido, conta } | { ok: false, erro, codigo, chaveTexto? }
 * Só depois do 1º tapete (contagem.tapetes ≥ 1, que a prisão não zera), só 1 vez, único sem ligar para maiúscula
 * e acento (contas.apelido_chave UNIQUE). codigo: 'conta_invalida' | 'apelido_definido' | 'apelido_cedo' |
 * 'apelido_invalido' (com chaveTexto 'apelido.erro.curto' | 'apelido.erro.feio' | 'apelido.erro.usado' e erro = o texto).
 * Recusa não grava nada.
 */
export function definirApelido(db, contaId, apelidoPedido, agora, { textos = TEXTOS } = {}) {
  if (!Number.isFinite(agora)) throw new TypeError('agora precisa ser número (ms)')
  const invalido = chaveTexto => ({ ok: false, erro: texto(textos, chaveTexto), codigo: 'apelido_invalido', chaveTexto })
  return transacao(db, () => {
    const conta = contaId === undefined || contaId === null ? null : contaDoPedido(db, contaId)
    if (!conta) return falha(ERRO_CONTA, 'conta_invalida')
    if (conta.apelido !== null) return falha('Esta conta já tem apelido: ele é para sempre.', 'apelido_definido')
    if (!(carregarSaveDaConta(db, conta.id).contagem.tapetes >= 1)) {
      return falha('O apelido vem depois do primeiro tapete puxado.', 'apelido_cedo')
    }
    const v = validarApelido(apelidoPedido)
    if (!v.ok) return invalido(v.erro)
    if (db.prepare('SELECT 1 FROM contas WHERE apelido_chave = ?').get(v.chave)) return invalido(ERROS_DO_APELIDO.usado)
    try {
      const { changes } = db.prepare('UPDATE contas SET apelido = ?, apelido_chave = ?, visto_em = ? WHERE id = ? AND apelido IS NULL')
        .run(v.apelido, v.chave, Math.floor(agora), conta.id)
      if (changes !== 1) return falha('Esta conta já tem apelido: ele é para sempre.', 'apelido_definido')
    } catch (e) {
      if (/UNIQUE/i.test(String(e?.message))) return invalido(ERROS_DO_APELIDO.usado)
      throw e
    }
    const nova = buscarConta(db, conta.id)
    return { ok: true, apelido: nova.apelido, conta: contaParaTela(nova, carregarSaveDaConta(db, conta.id)) }
  })
}

function falha(erro, codigo) { return { ok: false, erro, codigo } }

function anotarDiferenca(db, contaId, antes, depois, motivo, em, pedido) {
  const valor = depois - antes
  if (valor !== 0) anotarDiario(db, { em, motivo, valor, caixaDepois: depois, pedido, contaId })
}

/** Como anotarDiferenca, mas a multa da batida (eventos 'multa') vai numa linha própria com motivo 'multa'. */
function anotarComMulta(db, contaId, antes, depois, eventos, motivo, em, pedido) {
  const multa = R.multaDosEventos(eventos)
  anotarDiferenca(db, contaId, antes, depois + multa, motivo, em, pedido)
  anotarDiferenca(db, contaId, depois + multa, depois, 'multa', em, pedido)
}

/** "7xKXtg…gAsU" → "7xKX…gAsU" (4…4). A carteira inteira nunca vai para a tela. */
function carteiraCurta(carteira) {
  if (typeof carteira !== 'string' || carteira.length === 0) return null
  return carteira.length <= 8 ? carteira : `${carteira.slice(0, 4)}…${carteira.slice(-4)}`
}

/** O que a tela vê da conta. pedirApelido: já puxou o 1º tapete e ainda não tem apelido. */
function contaParaTela(conta, estado) {
  if (!conta) return null
  return {
    tipo: conta.tipo,
    apelido: conta.apelido ?? null,
    carteiraCurta: conta.tipo === 'carteira' ? carteiraCurta(conta.carteira) : null,
    pedirApelido: !conta.apelido && estado.contagem.tapetes >= 1,
  }
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

/** Quantas frases a família tem (prefixo.1, prefixo.2... sem buraco), lida dos textos em uso; nunca número fixo. */
function quantas(textos, prefixo) {
  const conta = (t) => { let n = 0; while (typeof t[`${prefixo}.${n + 1}`] === 'string') n++; return n }
  return conta(textos) || conta(TEXTOS)
}

/** k-ésima frase da família (k ≥ 0, dá a volta). Determinística: sem sorteio. */
function fraseDa(textos, prefixo, k) {
  const n = quantas(textos, prefixo)
  return n ? texto(textos, `${prefixo}.${(((k % n) + n) % n) + 1}`) : `${prefixo}.1`
}

/**
 * Nome do golpe na tela. Rebrand renomeia com rebrand.1..N ({nome} = nome da ideia); o jeito vem do número do
 * projeto + quantos rebrands ele já teve (rebrands seguidos do mesmo projeto nunca repetem até dar a volta).
 */
function nomeProjeto(p, textos, rebrands = p.rebrands) {
  const base = nomeIdeia(p.ideia, textos)
  if (!(rebrands > 0)) return base
  return fraseDa(textos, 'rebrand', p.id - 1 + rebrands - 1).replaceAll('{nome}', base)
}

/** Dinheiro como a tela mostra ("$ 1.200"). */
const dinheiro = (n) => `$ ${Number(n || 0).toLocaleString('pt-BR')}`

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
 * Tabela única dos luxos: id do config (= nome do sprite na cena) → chave do texto em nomes.js.
 * Cada texto combina com o que o luxo é e com o bônus que dá (20/11).
 *   id               texto                              bônus            sprite
 *   cadeira_gamer    luxo.2 Cadeira Gamer Trono          + rendimento     cadeira_gamer
 *   aquario          luxo.1 Aquário de Peixe Caro        − gasto de hype  aquario
 *   ar_condicionado  luxo.6 Ar-Condicionado Polar        − Calor (esfria) falta
 *   letreiro_neon    luxo.5 Neon de Frase Motivacional   + rendimento     falta
 *   maquina_bebida   luxo.3 Máquina de Bebida Infinita   − gasto de hype  maquina_bebida
 *   tela_curva       luxo.7 Tela Curva Gigante           − Calor (vê a polícia chegando)  falta
 *   garagem          luxo.4 Carro na Garagem             + rendimento     garagem
 * Sobram sem par: texto luxo.8 (Estátua de Mim Mesmo) e sprite sofa.
 */
export const CHAVE_LUXO = Object.freeze({
  cadeira_gamer: 'luxo.2',
  aquario: 'luxo.1',
  ar_condicionado: 'luxo.6',
  letreiro_neon: 'luxo.5',
  maquina_bebida: 'luxo.3',
  tela_curva: 'luxo.7',
  garagem: 'luxo.4',
})

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
 * opcoes.conta: a conta do banco (buscarConta); sem ela, conta: null (chamada direta, sem banco).
 */
export function estadoParaTela(estado, { textos = TEXTOS, conta = null } = {}) {
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
        trazidasV1: c.trazidasV1 ?? 0, // "Vídeo 1 trouxe N trouxas" (save antigo sem o campo = 0)
        proposta: c.proposta,
        esperaRestanteSeg: Math.ceil(c.esperaRestante),
        podeResponder: (c.fase === 'V1_NO_AR' && c.proposta !== null) || c.fase === 'PEDE_MAIS',
        podeChorar: c.fase === 'PEDE_MAIS' && !c.chorou,
        chorou: c.chorou,
        motivo: c.motivo,
      }
      const msg = (tipo, chaveTexto, extra = {}) => celular.push({
        projetoId: p.id, influenciador: c.influenciador, de: nomeInf, tipo,
        texto: chaveTexto ? citar(texto(textos, chaveTexto), nome).replaceAll('{valor}', dinheiro(extra.valor)) : null, ...extra,
      })
      msg('oferta', 'msg.video1.oferta', { valor: c.p1 })
      if (c.proposta !== null && (c.fase === 'PEDE_MAIS' || c.chorou || c.motivo === 'sumiu' || (c.proposta > c.p1))) {
        msg('pede_mais', 'msg.melhorar.oferta', { valor: c.chorou ? Math.round(c.p1 * CONTRATO.multiplicadorP2) : c.proposta })
      } else if (c.proposta !== null) {
        msg('proposta', 'msg.video2.mesmo_preco', { valor: c.proposta }) // abaixo do limite: vídeo 2 pelo mesmo preço
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
    if (noAr(p)) chat.push({ projetoId: p.id, autor: null, tipo: 'trouxa', texto: fraseDa(textos, 'chat', p.id) })
    const previa = noAr(p) && p.fase !== 'LANCAMENTO' && !estado.batida ? R.previaTapete(estado, p.id) : null
    return {
      id: p.id,
      ideia: p.ideia,
      raridade: p.raridade,
      nome,
      textoLancamento: citar(texto(textos, `${pre}.lancamento`), nome),
      textoFim: p.fase === 'APLICADO' || p.fase === 'APREENDIDO' ? citar(texto(textos, `${pre}.fim`), nome) : null,
      textoTapete: p.fase === 'APLICADO' ? fraseDa(textos, 'tapete', p.id - 1) : null,
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
    batida: pb ? {
      ...pb,
      projetoNome: alvo ? nomeProjeto(alvo, textos) : null,
      nomeAposRebrand: alvo ? nomeProjeto(alvo, textos, alvo.rebrands + 1) : null, // prévia do nome se pagar o rebrand
      frase: fraseDa(textos, 'batida', Math.max(0, estado.contagem.batidas - 1)), // muda a cada batida, sem sorteio
    } : null,
    rotulos: { confianca: texto(textos, 'ui.confianca') },
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
    conta: contaParaTela(conta, estado),
  }
}
