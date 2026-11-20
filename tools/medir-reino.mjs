// Keepmile — R36: MEDIR A PROFUNDIDADE do jogo (sem mudar número nem regra). Só lê o motor; variantes entram por injeção, aqui.
// Uso: node tools/medir-reino.mjs <medida> [--n 2000] [--semente keepmile36] [--variante base] [--trabalhos 4] [--json]
//   medidas: A (novato no 1º chefe) · B (qualidade da decisão) · C (posição) · D (cartas e planos) · E (longo prazo) · F (tempo) · todas
//   --n      partidas (A, D, F), jogadores (E: --n vale para o atento; o bom usa n/10) ou ofertas (B, C)
//   --k      continuações por opção (B, C; padrão 8)
//   --variante base|<nome> (VARIANTES abaixo): muda números/regras SÓ dentro deste processo, nunca no config
// Mesma semente → mesmos números, com 1 ou com 4 trabalhos.
import { pathToFileURL } from 'node:url'
import { Worker, isMainThread, parentPort } from 'node:worker_threads'
import { availableParallelism } from 'node:os'
import { criarRng, estadoDaSemente } from '../shared/rng.js'
import { ALBUM, CARTAS, CHEFES, FAMILIAS, PARTIDA as P, RELIQUIAS } from '../shared/reino/config.js'
import { montarExercito, simularBatalha } from '../shared/reino/batalha.js'
import { aplicar, criarPartida, opcoes, visao } from '../shared/reino/partida.js'
import { PLANOS, escolher, forcaEstatica, hordaDeReferencia, notaDaLuta } from '../shared/reino/robos.js'

// ================================================================ variantes (injeção; desfeita no fim de cada tarefa)
const desfazer = []
function por(obj, chave, valor) { desfazer.push([obj, chave, obj[chave]]); obj[chave] = valor }
function restaurar() { while (desfazer.length) { const [o, k, v] = desfazer.pop(); o[k] = v } }

/** Cada variante: `cfg()` muda números (com `por`, desfeito depois) e/ou `regras` (regra simulada no laço da partida). */
export const VARIANTES = {
  base: {},
  // 1º chefe mais leve para o novato
  chefe320: { cfg: () => por(CHEFES[0], 'vida', 320) },
  chefe280: { cfg: () => por(CHEFES[0], 'vida', 280) },
  // guardar a mão (lutar sem pôr carta) rende ouro
  guardar3: { regras: { ouroGuardar: 3 } },
  guardar5: { regras: { ouroGuardar: 5 } },
  // reino cheio: a mão traz 2 cartas que sobem (a 1ª e a 2ª posição), e não só 1
  // (simulado trocando a 2ª carta da mão por outra carta do reino abaixo do nível 5, quando houver e o reino estiver cheio)
  sobem2: { regras: { sobem2: true } },
  // conserto mais barato (ouro com uso real): 20, 30, 40…
  conserto10: { cfg: () => por(P.ouro, 'consertoPasso', 10) },
  // as 4 cartas mortas e o Bunkhouse (números)
  cartas: {
    cfg: () => {
      por(CARTAS.B03, 'valores', [30, 36, 42, 48, 55]) // Stone Wall 25..45 → 30..55
      por(CARTAS.B07, 'valores', [5, 6, 8, 10, 12]) // Market Stall 3..8 → 5..12
      por(CARTAS.M05, 'valores', [120, 130, 140, 150, 160]) // Second Helping 80..100 → 120..160
      por(CARTAS.M06, 'valores', [4, 5, 6, 8, 10]); por(CARTAS.M06, 'tiques', 35) // Bramble Snare 3..8 por 2,5 s → 4..10 por 3,5 s
      por(CARTAS.B02, 'valores2', [5, 10, 15, 20, 25]) // Bunkhouse vida 10..40 → 5..25
    },
  },
  // pacote: as três que mexem no novato e na decisão
  pacote: { cfg: () => { por(CHEFES[0], 'vida', 320) }, regras: { ouroGuardar: 3 } },
}

function aplicarVariante(nome) {
  restaurar()
  const v = VARIANTES[nome]
  if (!v) throw new Error(`variante desconhecida: ${nome}`)
  if (v.cfg) v.cfg()
  return v.regras || {}
}

// ================================================================ álbum (a mesma regra do servidor e da tela)
function limiar(i) { return i <= ALBUM.quantasNoMeio ? ALBUM.primeira + ALBUM.depoisCada * i : ALBUM.primeira + ALBUM.depoisCada * ALBUM.quantasNoMeio + ALBUM.fimCada * (i - ALBUM.quantasNoMeio) }
export function liberadasPorRodadas(rodadas) { let n = 0; while (n < ALBUM.ordem.length && limiar(n) <= rodadas) n++; return [...ALBUM.inicial, ...ALBUM.ordem.slice(0, n)] }
export const RODADAS_ALBUM_CHEIO = limiar(ALBUM.ordem.length - 1)
const TODAS = Object.keys(CARTAS)

// ================================================================ robôs
// planejador: CÓPIA FIEL do de shared/reino/robos.js, com memória das lutas (a luta não tem dado: mesma entrada → mesmo resultado).
// O teste tests/servidor/reino-medidas36.test.js confere que joga comando por comando igual ao original.
const memoria = new Map()
const chaveLuta = (t, rel, h) => t.map((x) => (x ? x.carta + x.nivel : '-')).join('') + '|' + rel.join(',') + '|' + h.rodada + ':' + h.ordem.join(',')
function luta(terrenos, reliquias, horda) {
  const k = chaveLuta(terrenos, reliquias, horda)
  let n = memoria.get(k)
  if (n === undefined) {
    if (memoria.size > 300000) memoria.clear()
    n = notaDaLuta(simularBatalha({ terrenos, reliquias, horda, eventos: false }))
    memoria.set(k, n)
  }
  return n
}
function comTerreno(terrenos, carta, k) {
  const out = terrenos.map((t) => (t ? { ...t } : null))
  const a = out[k - 1]
  out[k - 1] = a && a.carta === carta ? { carta, nivel: a.nivel + 1 } : { carta, nivel: 1 }
  return out
}
function promovido(terrenos, k) { const out = terrenos.map((t) => (t ? { ...t } : null)); out[k - 1] = { carta: out[k - 1].carta, nivel: out[k - 1].nivel + 1 }; return out }
function melhor(lista, nota) { let m = null, mn = -Infinity; for (const x of lista) { const n = nota(x); if (n > mn) { m = x; mn = n } } return m }
function hordaAlvo(v) { const pc = v.proximoChefe; return pc.avisado && pc.rodada > v.rodada ? hordaDeReferencia(pc.rodada) : hordaDeReferencia(v.rodada + 3) }
function valorFuturo(terrenos, reliquias, alvo) {
  const fam = montarExercito(terrenos, reliquias).familias.length
  let niveis = 0
  for (const t of terrenos) if (t) niveis += t.nivel
  return luta(terrenos, reliquias, alvo) * 10 + forcaEstatica(terrenos, reliquias) + fam * 40 + niveis * 5
}
function planejador(e) {
  const v = visao(e), o = opcoes(e), alvo = hordaAlvo(v)
  if (o.fase === 'carta') {
    if (o.consertar.pode && (v.vidas === 1 || v.ouro >= o.consertar.custo + 15)) return { tipo: 'consertar' }
    if (v.cartaPosta) return { tipo: 'batalhar' }
    const porC = o.comandos.filter((c) => c.tipo === 'por')
    if (!porC.length) return { tipo: 'batalhar' }
    const cand = porC.map((c) => { const t = comTerreno(v.terrenos, c.carta, c.terreno); return { c, t, agora: luta(t, v.reliquias, v.horda), h: forcaEstatica(t, v.reliquias) } })
    const vencem = cand.filter((x) => x.agora >= 1000)
    if (!vencem.length && o.sortear.pode && v.ouro - o.sortear.custo >= (v.vidas < v.vidasMax ? 0 : 10) && e.sorteios < 2) return { tipo: 'sortear' }
    const pool = (vencem.length ? vencem : cand.sort((a, b) => b.agora - a.agora).slice(0, 6)).sort((a, b) => b.h - a.h).slice(0, 6)
    return melhor(pool, (x) => x.agora * (vencem.length ? 0 : 10) + valorFuturo(x.t, v.reliquias, alvo)).c
  }
  const esp = o.comandos.filter((c) => c.tipo === 'espolio')
  const base = valorFuturo(v.terrenos, v.reliquias, alvo)
  return melhor(esp, (c) => {
    const x = v.espolios[c.indice]
    if (x.tipo === 'carta') return valorFuturo(comTerreno(v.terrenos, x.carta, c.terreno), v.reliquias, alvo)
    if (x.tipo === 'promocao') return valorFuturo(promovido(v.terrenos, c.terreno), v.reliquias, alvo)
    if (x.reliquia) {
      if (x.reliquia === 'crown') return base + 400
      if (x.reliquia === 'horseshoe' || x.reliquia === 'ledger') return base + 150
      return valorFuturo(v.terrenos, [...v.reliquias, x.reliquia], alvo) + 50
    }
    return base + x.ouro * 12
  })
}

/** "Ganancioso puro" (R36): a carta e o terreno de maior força IMEDIATA; nunca conserta, nunca sorteia. Espólio como o ganancioso. */
function gananciosoPuro(e) {
  const v = visao(e), o = opcoes(e)
  if (o.fase === 'carta') {
    const porC = o.comandos.filter((c) => c.tipo === 'por')
    if (!porC.length) return { tipo: 'batalhar' }
    return melhor(porC, (c) => { const t = comTerreno(v.terrenos, c.carta, c.terreno); return luta(t, v.reliquias, v.horda) * 1000 + forcaEstatica(t, v.reliquias) })
  }
  const esp = o.comandos.filter((c) => c.tipo === 'espolio')
  const base = forcaEstatica(v.terrenos, v.reliquias)
  return melhor(esp, (c) => {
    const x = v.espolios[c.indice]
    if (x.tipo === 'carta') return forcaEstatica(comTerreno(v.terrenos, x.carta, c.terreno), v.reliquias)
    if (x.tipo === 'promocao') return forcaEstatica(promovido(v.terrenos, c.terreno), v.reliquias)
    if (x.reliquia) return forcaEstatica(v.terrenos, [...v.reliquias, x.reliquia]) + base * 0.05
    return base
  })
}

/**
 * "Novato atento" (R36): faz o que a tela sugere, sem simular luta. Conserta sempre que há vida perdida e ouro; pega o LEVEL UP quando a
 * mão traz; senão a carta que LIGA o bônus de família; senão uma carta qualquer da mão (sorteio do robô). Tropa e magia vão no 1º terreno
 * vazio a partir do portão; construção no 1º vazio ao lado de uma tropa ("buildings help the plots next to them"). Reino cheio sem LEVEL UP:
 * troca a carta de nível mais baixo. Nunca sorteia. Espólio: Promotion na tropa de nível mais alto; senão Card; senão Purse.
 */
function novatoAtento(e, inteiro) {
  const v = visao(e), o = opcoes(e)
  if (o.fase === 'carta') {
    if (o.consertar.pode) return { tipo: 'consertar' }
    if (v.cartaPosta) return { tipo: 'batalhar' }
    const porC = o.comandos.filter((c) => c.tipo === 'por')
    if (!porC.length) return { tipo: 'batalhar' }
    const T = v.terrenos
    if (v.oferta[0] && v.oferta[0].levelUp) {
      const c = v.oferta[0].carta
      const k = T.findIndex((t) => t && t.carta === c && t.nivel < P.nivelMax)
      if (k >= 0) return { tipo: 'por', carta: c, terreno: k + 1 }
    }
    const lugar = (carta) => {
      const vazios = T.map((t, i) => (t ? -1 : i)).filter((i) => i >= 0)
      if (!vazios.length) { let m = 0; T.forEach((t, i) => { if (t.nivel < T[m].nivel) m = i }); return m + 1 }
      if (CARTAS[carta].tipo === 'construcao') {
        const tropa = (i) => T[i] && CARTAS[T[i].carta].tipo === 'tropa'
        const junto = vazios.find((i) => tropa(i - 1) || tropa(i + 1))
        if (junto !== undefined) return junto + 1
      }
      return vazios[0] + 1
    }
    const cont = {}
    for (const t of T) if (t) cont[CARTAS[t.carta].familia] = (cont[CARTAS[t.carta].familia] || 0) + 1
    const cheio = T.every(Boolean)
    const liga = v.oferta.map((x) => x.carta).find((c) => !cheio && (cont[CARTAS[c].familia] || 0) + 1 === FAMILIAS[CARTAS[c].familia].terrenos)
    const carta = liga || v.oferta[inteiro(v.oferta.length)].carta
    const cmd = { tipo: 'por', carta, terreno: lugar(carta) }
    return porC.some((c) => c.carta === cmd.carta && c.terreno === cmd.terreno) ? cmd : porC[0]
  }
  const esp = o.comandos.filter((c) => c.tipo === 'espolio')
  const prom = esp.filter((c) => v.espolios[c.indice].tipo === 'promocao')
  if (prom.length) return melhor(prom, (c) => { const t = v.terrenos[c.terreno - 1]; return (CARTAS[t.carta].tipo === 'tropa' ? 100 : 0) + t.nivel * 10 - c.terreno * 0.1 })
  const carta = esp.find((c) => v.espolios[c.indice].tipo === 'carta' && !v.terrenos[c.terreno - 1])
  if (carta) return carta
  return esp.find((c) => v.espolios[c.indice].tipo !== 'carta' && v.espolios[c.indice].tipo !== 'promocao') || esp[0]
}

export const ROBOS36 = ['aleatorio', 'ganancioso-puro', 'novato-atento', 'planejador']
export function escolher36(robo, e, inteiro) {
  if (robo === 'planejador') return planejador(e)
  if (robo === 'ganancioso-puro') return gananciosoPuro(e)
  if (robo === 'novato-atento') return novatoAtento(e, inteiro)
  return escolher(robo, e, inteiro) // aleatorio, ganancioso, plano:<id> (robos.js, sem cópia)
}

// ================================================================ laço da partida (com as regras das variantes)
/** Antes de cada comando: regras que mexem na mão (variante sobem2). */
function ajustarMao(e, regras) {
  if (!regras.sobem2 || e.fase !== 'carta' || e.cartaPosta || !e.terrenos.every(Boolean) || e._mao === e.comandos) return e
  const sobe = [...new Set(e.terrenos.filter((t) => t.nivel < P.nivelMax).map((t) => t.carta))].filter((c) => c !== e.oferta[0])
  e._mao = e.comandos
  if (sobe.length && e.oferta.length > 1 && !e.terrenos.some((t) => t.carta === e.oferta[1] && t.nivel < P.nivelMax)) {
    e.oferta[1] = sobe[(e.rodada * 7 + e.sorteios * 3 + e.comandos) % sobe.length] // escolha fixa pelo estado (determinística, sem gastar o sorteio)
  }
  return e
}

/** Aplica o comando e as regras da variante. Devolve o resultado de aplicar (estado novo). */
function passo(e, c, regras, eventos = false) {
  const r = aplicar(e, c, { eventos })
  if (!r.ok) return r
  if (regras.ouroGuardar && c.tipo === 'batalhar' && !e.cartaPosta && e.oferta.length) {
    r.estado.ouro += regras.ouroGuardar; r.estado.ouroGanho += regras.ouroGuardar; r.guardou = true
  }
  if (regras.sobem2) ajustarMao(r.estado, regras)
  return r
}

/** Joga até o fim (ou até `ate` rodadas a mais). `aoPasso(e, c, r)` vê cada comando. */
function jogarDe(e, { robo, inteiro, regras = {}, aoPasso, eventos = false }) {
  if (regras.sobem2) e = ajustarMao(structuredClone(e), regras)
  for (let g = 0; g < P.tetoComandos && e.fase !== 'fim'; g++) {
    const c = escolher36(robo, e, inteiro)
    const r = passo(e, c, regras, eventos)
    if (!r.ok) throw new Error(`robô ${robo} mandou comando recusado: ${r.erro} ${JSON.stringify(c)}`)
    if (aoPasso) aoPasso(e, c, r)
    e = r.estado
  }
  return e
}

export function jogar({ robo, semente, liberadas = TODAS, regras = {}, aoPasso, eventos = false, rngSemente }) {
  const rng = criarRng(rngSemente || `robo36:${robo}:${semente}`)
  return jogarDe(criarPartida({ semente, cartasLiberadas: liberadas }), { robo, inteiro: (n) => rng.inteiro(n), regras, aoPasso, eventos })
}

// ================================================================ estatística
const pct = (a, b) => (b ? (100 * a) / b : 0)
export function quantil(lista, q) { const a = lista.slice().sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : 0 }
const media = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0)
/** Meia largura do intervalo de 95% de uma proporção (em pontos percentuais). */
const erroP = (p, n) => (n ? 196 * Math.sqrt((p / 100) * (1 - p / 100) / n) / 100 * 100 : 0)
const f1 = (x) => x.toFixed(1)

// ================================================================ tempo de tela (F)
// Do código da tela (public/reino/js/batalha-tela.js): entrada da horda 1,7 s (0,8 s no 2×); rodadas 1–4 tocam a luta curta mais devagar
// no 1× (ritmo = max(0,4; min(1; s/7))); fim: 1 s depois do último evento (2,6 s quando o chefe cai); vitória: ouro contando ≈ 1,5 s.
// Escolha: SEG_ESCOLHA s por rodada (o mesmo número do simulador antigo; é estimativa, não medida de gente).
const SEG_ESCOLHA = 20
export function segundosDeTela(b, vel) {
  const entrada = vel === 1 ? 1.7 : 0.8
  const ritmo = vel === 1 && b.rodada <= 4 && b.segundos > 0 ? Math.max(0.4, Math.min(1, b.segundos / 7)) : 1
  const fim = b.vitoria && b.chefe ? 2.6 : 1
  return entrada + b.segundos / (vel * ritmo) + fim + (b.vitoria ? 1.5 : 0)
}

// ================================================================ A — novato no 1º chefe
function tarefaA({ robo, de, ate, semente, regras }) {
  const out = []
  for (let j = de; j < ate; j++) {
    let rodadas = 0
    const jog = []
    for (let p = 1; p <= 3; p++) {
      const lib = liberadasPorRodadas(rodadas)
      let tent = 0, venceu = 0
      const lutas = []
      const e = jogar({ robo, semente: `${semente}:A:${j}:${p}`, liberadas: lib, regras, aoPasso: (e0, c, r) => {
        if (c.tipo !== 'batalhar') return
        const b = r.estado.ultima
        lutas.push({ rodada: e0.rodada, vitoria: b.vitoria, segundos: b.segundos, chefe: b.chefe })
        if (e0.rodada === 5) { tent++; if (b.vitoria) venceu = tent }
      } })
      rodadas += e.vencidas
      jog.push({ rodada: e.rodada, vencidas: e.vencidas, pontos: e.fim.pontos, tentativas: tent, venceuNa: venceu, cartas: lib.length, lutas })
    }
    out.push(jog)
  }
  return out
}
function resumoA(porRobo) {
  const L = []
  const res = {}
  L.push('| robô | partida | n | vence o chefe 5: na 1ª tentativa | até a 2ª | até a 3ª | chega ao chefe | rodada final mediana / p90 | cartas no álbum |')
  L.push('|---|---|---|---|---|---|---|---|---|')
  for (const [robo, jogs] of Object.entries(porRobo)) {
    const n = jogs.length
    for (let p = 0; p < 3; p++) {
      const g = jogs.map((x) => x[p])
      const ate = (k) => pct(g.filter((x) => x.venceuNa && x.venceuNa <= k).length, n)
      const chega = pct(g.filter((x) => x.tentativas > 0).length, n)
      L.push(`| ${robo} | ${p + 1} | ${n} | ${f1(ate(1))}% | ${f1(ate(2))}% | ${f1(ate(3))}% (±${f1(erroP(ate(3), n))}) | ${f1(chega)}% | ${quantil(g.map((x) => x.rodada), 0.5)} / ${quantil(g.map((x) => x.rodada), 0.9)} | ${f1(media(g.map((x) => x.cartas)))} |`)
      res[`${robo}:${p + 1}`] = { ate1: ate(1), ate3: ate(3), chega, mediana: quantil(g.map((x) => x.rodada), 0.5) }
    }
    const algum = pct(jogs.filter((x) => x.some((y) => y.venceuNa)).length, n)
    res[`${robo}:ate3partidas`] = algum
    L.push(`| ${robo} | **passou do 1º chefe em alguma das 3 partidas** | ${n} | | | **${f1(algum)}%** (±${f1(erroP(algum, n))}) | | | |`)
  }
  return { linhas: L, res }
}

// ================================================================ B e C — qualidade da decisão e posição (valor esperado por continuação)
function tipoDaOpcao(e, c) {
  if (c.tipo !== 'por') return c.tipo === 'batalhar' ? 'guardar' : c.tipo
  const t = e.terrenos[c.terreno - 1]
  return t && t.carta === c.carta ? 'subir' : CARTAS[c.carta].tipo
}
/** Valor esperado (rodada final média) de cada comando a partir de `e`, com K continuações do planejador (mesmos K futuros para todas). */
function valorDe(e, cmd, { K, semente, regras }) {
  const vals = []
  for (let j = 0; j < K; j++) {
    const x = structuredClone(e)
    x.sorteio = estadoDaSemente(`${semente}:cont:${j}`)
    let y = x
    if (cmd) { const r = passo(x, cmd, regras); if (!r.ok) throw new Error(`opção recusada ${JSON.stringify(cmd)}: ${r.erro}`); y = r.estado }
    const rng = criarRng(`${semente}:cont:${j}:robo`)
    vals.push(jogarDe(y, { robo: 'planejador', inteiro: (n) => rng.inteiro(n), regras }).rodada)
  }
  return vals
}
/** As opções da oferta: cada carta nos 3 melhores terrenos (pela nota do próprio planejador), sortear, consertar e guardar a mão. */
function opcoesDaOferta(e) {
  const v = visao(e), o = opcoes(e), alvo = hordaAlvo(v)
  const ops = []
  const porCarta = {}
  for (const c of o.comandos.filter((x) => x.tipo === 'por')) (porCarta[c.carta] ||= []).push(c)
  for (const lista of Object.values(porCarta)) {
    const nota = (c) => { const t = comTerreno(v.terrenos, c.carta, c.terreno); return luta(t, v.reliquias, v.horda) * 10 + valorFuturo(t, v.reliquias, alvo) }
    ops.push(...lista.map((c) => ({ c, n: nota(c) })).sort((a, b) => b.n - a.n).slice(0, 3).map((x) => x.c))
  }
  if (o.sortear.pode) ops.push({ tipo: 'sortear' })
  if (o.consertar.pode) ops.push({ tipo: 'consertar' })
  ops.push({ tipo: 'batalhar' })
  return ops
}
/** Estados de oferta para medir: o 1º momento de escolha de rodadas sorteadas de partidas do planejador (álbum completo). */
function amostrarOfertas({ i, semente, regras }) {
  const rng = criarRng(`${semente}:amostra:${i}`)
  const estados = []
  jogar({ robo: 'planejador', semente: `${semente}:B:${i}`, regras, aoPasso: (e0) => { if (e0.fase === 'carta' && !e0.cartaPosta && e0.sorteios === 0 && e0.consertos >= 0 && !estados.some((x) => x.rodada === e0.rodada && x.vidas === e0.vidas)) estados.push(e0) } })
  return estados.length ? estados[rng.inteiro(estados.length)] : null
}
function tarefaB({ de, ate, semente, regras, K }) {
  const out = []
  for (let i = de; i < ate; i++) {
    memoria.clear()
    const e = amostrarOfertas({ i, semente, regras })
    if (!e) continue
    const ops = opcoesDaOferta(e)
    const av = ops.map((c) => { const vals = valorDe(e, c, { K, semente: `${semente}:B:${i}`, regras }); return { tipo: tipoDaOpcao(e, c), carta: c.carta || null, terreno: c.terreno || 0, media: media(vals), vals } })
    out.push({ rodada: e.rodada, cheio: e.terrenos.every(Boolean), av })
  }
  return out
}
export function classificar(o) {
  const av = o.av.slice().sort((a, b) => b.media - a.media)
  const [a, b] = av
  const resto = Math.max(0.5, a.media - o.rodada) // rodadas que ainda faltam (para a leitura mais dura)
  const ganho = b ? (a.media - b.media) / a.media : 1
  const ganhoResto = b ? (a.media - b.media) / resto : 1
  const espalho = (av[0].media - av[av.length - 1].media) / av[0].media
  // "outra opção que não é a mesma coisa": a melhor de tipo diferente do da 1ª
  const outro = av.find((x) => x.tipo !== a.tipo)
  const ganhoOutro = outro ? (a.media - outro.media) / a.media : 1
  return {
    interessante: !!outro && ganhoOutro <= 0.10 && b.tipo !== a.tipo,
    interessanteCarta: !!b && ganho <= 0.10 && (b.carta || b.tipo) !== (a.carta || a.tipo),
    interessanteDuro: !!outro && b.tipo !== a.tipo && (a.media - outro.media) / resto <= 0.10,
    obvia: ganho > 0.25,
    obviaResto: ganhoResto > 0.25,
    nula: espalho < 0.03,
    melhor: a.tipo, ganho, espalho,
  }
}
const faixaDe = (r) => (r <= 5 ? '1–5' : r <= 10 ? '6–10' : r <= 15 ? '11–15' : '16+')
function resumoB(lista) {
  const L = ['| rodadas | ofertas | interessantes (2 melhores a ≤ 10%, tipos diferentes) | 2 melhores a ≤ 10% e cartas/ações diferentes | leitura dura (tipos diferentes, 10% do que FALTA) | óbvias (1ª > 25%) | nulas (todas a < 3%) | melhor opção mais comum |', '|---|---|---|---|---|---|---|---|']
  const res = {}
  for (const fx of ['1–5', '6–10', '11–15', '16+', 'todas']) {
    const g = lista.filter((o) => fx === 'todas' || faixaDe(o.rodada) === fx)
    const cl = g.map(classificar)
    const n = g.length
    const c = (k) => pct(cl.filter((x) => x[k]).length, n)
    const m = {}
    for (const x of cl) m[x.melhor] = (m[x.melhor] || 0) + 1
    const top = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${f1(pct(v, n))}%`).join(', ')
    L.push(`| ${fx} | ${n} | ${f1(c('interessante'))}% (±${f1(erroP(c('interessante'), n))}) | ${f1(c('interessanteCarta'))}% | ${f1(c('interessanteDuro'))}% | ${f1(c('obvia'))}% | ${f1(c('nula'))}% | ${top} |`)
    res[fx] = { n, interessante: c('interessante'), carta: c('interessanteCarta'), duro: c('interessanteDuro'), obvia: c('obvia'), nula: c('nula') }
  }
  // posição dentro da mesma carta (entre os 3 melhores terrenos dela)
  const difPos = []
  for (const o of lista) {
    const porCarta = {}
    for (const a of o.av) if (a.carta) (porCarta[a.carta] ||= []).push(a.media)
    for (const v of Object.values(porCarta)) if (v.length > 1) difPos.push((Math.max(...v) - Math.min(...v)) / Math.max(...v) * 100)
  }
  res.difPosMediana = quantil(difPos, 0.5); res.difPosP90 = quantil(difPos, 0.9)
  // ruído: desvio da média de K continuações (a mesma opção)
  const dp = []
  for (const o of lista) for (const a of o.av) { const m = a.media; const s = Math.sqrt(a.vals.reduce((x, v) => x + (v - m) ** 2, 0) / Math.max(1, a.vals.length - 1)); dp.push(s / Math.sqrt(a.vals.length)) }
  res.erroMedia = quantil(dp, 0.5)
  const opsVal = {}
  for (const o of lista) for (const a of o.av) { const k = a.tipo; (opsVal[k] ||= []).push(a.media - Math.max(...o.av.map((x) => x.media))) }
  res.custoPorTipo = Object.fromEntries(Object.entries(opsVal).map(([k, v]) => [k, media(v)]))
  L.push('')
  L.push(`Posição (a mesma carta nos seus 3 melhores terrenos): diferença mediana ${f1(res.difPosMediana)}% · p90 ${f1(res.difPosP90)}% da rodada final. Erro da média de cada opção (mediana): ±${res.erroMedia.toFixed(2)} rodada.`)
  L.push('Quanto cada tipo de opção perde para a melhor da oferta (rodadas, média): ' + Object.entries(res.custoPorTipo).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · '))
  return { linhas: L, res }
}

// C: o mesmo reino com os terrenos embaralhados
function permutar(t, rng) {
  for (let tent = 0; tent < 20; tent++) {
    const a = t.slice()
    for (let i = a.length - 1; i > 0; i--) { const j = rng.inteiro(i + 1); const x = a[i]; a[i] = a[j]; a[j] = x }
    if (a.some((x, i) => JSON.stringify(x) !== JSON.stringify(t[i]))) return a.map((x) => (x ? { ...x } : null))
  }
  return null
}
function tarefaC({ de, ate, semente, regras, K }) {
  const out = []
  for (let i = de; i < ate; i++) {
    memoria.clear()
    const e = amostrarOfertas({ i, semente: `${semente}:C`, regras })
    if (!e || e.terrenos.filter(Boolean).length < 3) continue
    const rng = criarRng(`${semente}:C:perm:${i}`)
    const t2 = permutar(e.terrenos, rng)
    if (!t2) continue
    const e2 = structuredClone(e); e2.terrenos = t2
    const a = media(valorDe(e, null, { K, semente: `${semente}:C:${i}`, regras }))
    const b = media(valorDe(e2, null, { K, semente: `${semente}:C:${i}`, regras }))
    // a luta de agora: quantas de 60 ordens diferentes mudam o resultado (com o reino como está)
    const base = simularBatalha({ terrenos: e.terrenos, reliquias: e.reliquias, horda: e.horda, eventos: false }).vitoria
    let vira = 0
    for (let p = 0; p < 60; p++) { const tp = permutar(e.terrenos, rng); if (tp && simularBatalha({ terrenos: tp, reliquias: e.reliquias, horda: e.horda, eventos: false }).vitoria !== base) vira++ }
    out.push({ rodada: e.rodada, orig: a, perm: b, vira: vira / 60, base })
  }
  return out
}
function resumoC(lista) {
  const d = lista.map((x) => Math.abs(x.orig - x.perm) / x.orig * 100)
  const dr = lista.map((x) => x.orig - x.perm)
  const vira = lista.map((x) => x.vira * 100)
  const res = { n: lista.length, medianaPct: quantil(d, 0.5), p90Pct: quantil(d, 0.9), mediaRod: media(dr), viraMediana: quantil(vira, 0.5), viraP90: quantil(vira, 0.9), algumaVira: pct(lista.filter((x) => x.vira > 0).length, lista.length) }
  const L = [
    `| reinos | |Δ rodada final| mediana | p90 | ordem do planejador − ordem embaralhada (média) | luta de agora: % das ordens que mudam o resultado (mediana / p90) | reinos em que alguma ordem muda a luta de agora |`,
    '|---|---|---|---|---|---|',
    `| ${res.n} | ${f1(res.medianaPct)}% | ${f1(res.p90Pct)}% | ${dr.length ? res.mediaRod.toFixed(2) : 0} rodada | ${f1(res.viraMediana)}% / ${f1(res.viraP90)}% | ${f1(res.algumaVira)}% |`,
  ]
  return { linhas: L, res }
}

// ================================================================ D — cartas, planos, ouro (+ F: lutas "só olhando")
function tarefaD({ robo = 'planejador', de, ate, semente, regras, liberadas = TODAS, leve = false }) {
  const out = []
  for (let i = de; i < ate; i++) {
    const r = { oferecida: {}, escolhida: {}, lutas: [], ouro: { inicio: P.ouro.inicio, vitoria: 0, limpos: 0, mercado: 0, chefe: 0, ledger: 0, derrota: 0, bolsa: 0, guardar: 0 }, gasto: { sortear: 0, consertar: 0 }, certas: 0, perdidas: 0, decide: 0 }
    let maoVista = ''
    const e = jogar({ robo, semente: `${semente}:D:${i}`, liberadas, regras, aoPasso: (e0, c, res) => {
      const e1 = res.estado
      const mao = e0.fase === 'carta' && !e0.cartaPosta ? `${e0.rodada}|${e0.horda.ordem.join()}|${e0.sorteios}|${e0.oferta.join()}` : ''
      if (mao && maoVista !== mao) {
        // cada mão vista (inclui as sorteadas de novo) conta como oferecida
        maoVista = mao
        for (const id of new Set(e0.oferta)) r.oferecida[id] = (r.oferecida[id] || 0) + 1
      }
      if (c.tipo === 'por') r.escolhida[c.carta] = (r.escolhida[c.carta] || 0) + 1
      if (c.tipo === 'sortear') r.gasto.sortear += e0.ouro - e1.ouro
      if (c.tipo === 'consertar') r.gasto.consertar += e0.ouro - e1.ouro
      if (c.tipo === 'espolio') { const x = e0.espolios[c.indice]; if (x.tipo === 'bolsa' && !x.reliquia) r.ouro.bolsa += x.ouro }
      if (c.tipo === 'batalhar') {
        const b = e1.ultima
        r.lutas.push({ rodada: e0.rodada, vitoria: b.vitoria, segundos: b.segundos, chefe: b.chefe, cartas: e0.terrenos.filter(Boolean).map((t) => t.carta) })
        if (res.guardou) r.ouro.guardar += regras.ouroGuardar
        if (b.vitoria) {
          const ganho = e1.ouro - e0.ouro - (res.guardou ? regras.ouroGuardar : 0)
          const merc = montarExercito(e0.terrenos, e0.reliquias).ouroMercado
          const led = e0.reliquias.includes('ledger') ? RELIQUIAS.ledger.ouro : 0
          const ch = b.chefe ? P.ouro.chefe : 0
          r.ouro.vitoria += P.ouro.vitoria; r.ouro.mercado += merc; r.ouro.ledger += led; r.ouro.chefe += ch
          r.ouro.limpos += ganho - P.ouro.vitoria - merc - led - ch
        } else r.ouro.derrota += P.ouro.derrota
      }
    } })
    // "só olhando": na 1ª mão de cada rodada, a luta de agora dá o mesmo resultado com qualquer carta em qualquer terreno (e sem carta)?
    // Refaz a partida (mesma semente) só para isso, para não mexer na memória do robô no meio da partida.
    let olhou = ''
    if (!leve) jogar({ robo, semente: `${semente}:D:${i}`, liberadas, regras, aoPasso: (e0) => {
      if (e0.fase !== 'carta' || e0.cartaPosta || e0.sorteios) return
      const chave = `${e0.rodada}|${e0.horda.ordem.join()}`
      if (olhou === chave) return
      olhou = chave
      const o = opcoes(e0)
      const notas = [luta(e0.terrenos, e0.reliquias, e0.horda), ...o.comandos.filter((x) => x.tipo === 'por').map((x) => luta(comTerreno(e0.terrenos, x.carta, x.terreno), e0.reliquias, e0.horda))]
      const ganha = notas.filter((n) => n >= 1000).length
      if (ganha === notas.length) r.certas++
      else if (ganha === 0) r.perdidas++
      else r.decide++
    } })
    r.rodada = e.rodada; r.pontos = e.fim.pontos; r.final = e.terrenos; r.ouroGanho = e.ouroGanho; r.ouroGasto = e.ouroGasto
    out.push(r)
  }
  return out
}
function contarRodadasDecididas(r) { return r.certas + r.perdidas + r.decide }
function resumoD(lista, planos) {
  const L = []
  const res = {}
  const ofer = {}, esc = {}, presTop = {}, comCarta = {}, lutasCom = {}
  for (const r of lista) {
    for (const [k, v] of Object.entries(r.oferecida)) ofer[k] = (ofer[k] || 0) + v
    for (const [k, v] of Object.entries(r.escolhida)) esc[k] = (esc[k] || 0) + v
    for (const id of new Set(r.final.filter(Boolean).map((t) => t.carta))) (comCarta[id] ||= []).push(r.rodada)
    for (const l of r.lutas) for (const id of new Set(l.cartas)) { const x = (lutasCom[id] ||= [0, 0]); x[0]++; if (l.vitoria) x[1]++ }
  }
  const ordem = lista.map((r, i) => i).sort((a, b) => lista[b].pontos - lista[a].pontos)
  const top = ordem.slice(0, Math.max(1, Math.floor(lista.length / 10)))
  for (const i of top) for (const id of new Set(lista[i].final.filter(Boolean).map((t) => t.carta))) presTop[id] = (presTop[id] || 0) + 1
  const todasFinais = lista.map((r) => r.rodada)
  const medTodas = media(todasFinais)
  L.push(`Planejador, álbum completo, ${lista.length} partidas: rodada final mediana ${quantil(todasFinais, 0.5)} (p10 ${quantil(todasFinais, 0.1)}, p90 ${quantil(todasFinais, 0.9)}), média ${medTodas.toFixed(2)}.`)
  L.push('')
  L.push('| carta | tipo | raridade | oferecida (mãos) | escolhida quando oferecida | vitória das lutas com ela no reino | rodada final média com ela no fim (vs todas) | nos 10% melhores reinos |')
  L.push('|---|---|---|---|---|---|---|---|')
  const linhas = Object.keys(CARTAS).map((id) => {
    const taxa = pct(esc[id] || 0, ofer[id] || 0)
    const lv = lutasCom[id] ? pct(lutasCom[id][1], lutasCom[id][0]) : 0
    const rf = comCarta[id] ? media(comCarta[id]) : 0
    const pt = pct(presTop[id] || 0, top.length)
    return { id, taxa, lv, rf, pt }
  }).sort((a, b) => b.taxa - a.taxa)
  for (const x of linhas) {
    const c = CARTAS[x.id]
    L.push(`| ${c.nome} | ${c.tipo} | ${c.raridade} | ${ofer[x.id] || 0} | ${f1(x.taxa)}%${x.taxa < 5 ? ' **morta**' : ''} | ${f1(x.lv)}% | ${x.rf ? x.rf.toFixed(1) : '—'} (${x.rf ? (x.rf - medTodas >= 0 ? '+' : '') + (x.rf - medTodas).toFixed(1) : ''}) | ${f1(x.pt)}%${x.pt > 45 ? ' **dominante**' : ''} |`)
  }
  res.mortas = linhas.filter((x) => x.taxa < 5).map((x) => CARTAS[x.id].nome)
  res.dominantes = linhas.filter((x) => x.pt > 45).map((x) => `${CARTAS[x.id].nome} ${f1(x.pt)}%`)
  res.cartas = Object.fromEntries(linhas.map((x) => [x.id, { taxa: x.taxa, top: x.pt, rf: x.rf }]))
  L.push('')
  L.push(`Mortas (escolhidas < 5% das vezes em que aparecem): ${res.mortas.join(', ') || 'nenhuma'} · dominantes (> 45% dos 10% melhores reinos): ${res.dominantes.join(', ') || 'nenhuma'}.`)
  // ouro
  const n = lista.length
  const som = (f) => lista.reduce((a, r) => a + f(r), 0) / n
  const fontes = Object.keys(lista[0].ouro)
  const ganho = som((r) => r.ouroGanho), gasto = som((r) => r.ouroGasto)
  res.ouro = { ganho, gasto, sortear: som((r) => r.gasto.sortear), consertar: som((r) => r.gasto.consertar), sobra: ganho - gasto }
  L.push('')
  L.push(`Ouro por partida (planejador): ganho ${f1(ganho)} = ` + fontes.map((k) => `${k} ${f1(som((r) => r.ouro[k]))}`).join(' + ') + ` · gasto ${f1(gasto)} = sortear ${f1(res.ouro.sortear)} + consertar ${f1(res.ouro.consertar)} · sobra no fim ${f1(ganho - gasto)}.`)
  // só olhando
  const rd = som(contarRodadasDecididas)
  res.soOlhando = { certas: pct(som((r) => r.certas), rd), perdidas: pct(som((r) => r.perdidas), rd), decide: pct(som((r) => r.decide), rd) }
  L.push(`Luta de agora pela 1ª mão da rodada: ganha com QUALQUER carta/terreno (só olhando) ${f1(res.soOlhando.certas)}% · perde com qualquer uma ${f1(res.soOlhando.perdidas)}% · a escolha decide ${f1(res.soOlhando.decide)}%.`)
  if (planos) {
    L.push('')
    L.push('| plano (robô preso ao plano) | partidas | rodada final mediana | p90 | média | a até 20% do melhor? |')
    L.push('|---|---|---|---|---|---|')
    const meds = Object.entries(planos).map(([k, l]) => [k, quantil(l.map((x) => x.rodada), 0.5), quantil(l.map((x) => x.rodada), 0.9), media(l.map((x) => x.rodada)), l.length])
    const topo = Math.max(...meds.map((x) => x[3]))
    for (const [k, m, p9, md, nn] of meds) L.push(`| ${PLANOS[k].nome} | ${nn} | ${m} | ${p9} | ${md.toFixed(2)} | ${md >= 0.8 * topo ? 'sim' : '**não**'} |`)
    res.planosViaveis = meds.filter((x) => x[3] >= 0.8 * topo).length
    res.planos = Object.fromEntries(meds.map((x) => [x[0], x[3]]))
    L.push(`Planos viáveis (média a até 20% do melhor): ${res.planosViaveis} de 7.`)
  }
  return { linhas: L, res }
}

// ================================================================ E — longo prazo (álbum, conquistas) e ranking semanal
const CONQ = ['supper', 'road', 'plate', 'last', 'house', 'brass', 'family', 'penny', 'double', 'mole', 'pudding', 'librarian']
const CHEFE_CONQ = { gutbucket: 'road', niptuck: 'double', moleworth: 'mole', gobble: 'pudding' }
function contarSoldados(eventos) {
  const soldados = new Set(), vivos = new Set()
  let quedas = 0
  for (const x of eventos) {
    if (x[1] === 'n' && x[3] === 0) { soldados.add(x[2]); vivos.add(x[2]) } else if (x[1] === 'c' && vivos.has(x[2])) { vivos.delete(x[2]); quedas++ } else if (x[1] === 'r' && soldados.has(x[2])) vivos.add(x[2])
  }
  return { quedas, vivos: vivos.size }
}
function tarefaE({ robo, de, ate, semente, regras, teto }) {
  const out = []
  for (let j = de; j < ate; j++) {
    let rodadas = 0
    const tem = new Map()
    let album = null
    const pontos = []
    for (let p = 1; p <= teto && (tem.size < CONQ.length || album === null); p++) {
      const lib = liberadasPorRodadas(rodadas)
      let sorteou = false
      const marcar = (id) => { if (!tem.has(id)) tem.set(id, p) }
      const e = jogar({ robo, semente: `${semente}:E:${j}:${p}`, liberadas: lib, regras, aoPasso: (e0, c, r) => {
        const e1 = r.estado
        if (c.tipo === 'sortear') sorteou = true
        if (c.tipo === 'batalhar' && e1.ultima.vitoria) {
          marcar('supper')
          if (e1.ultima.chefe && CHEFE_CONQ[e1.ultima.chefe]) marcar(CHEFE_CONQ[e1.ultima.chefe])
          if (e0.rodada === 10 && !sorteou) marcar('penny')
          if (!tem.has('plate') || !tem.has('last')) {
            const { quedas, vivos } = contarSoldados(simularBatalha({ terrenos: e0.terrenos, reliquias: e0.reliquias, horda: e0.horda, eventos: true }).eventos)
            if (quedas === 0) marcar('plate')
            if (vivos === 1) marcar('last')
          }
        }
        const t = e1.terrenos
        if (t.every(Boolean)) { marcar('house'); if (new Set(t.map((x) => CARTAS[x.carta].familia)).size === 1) marcar('family') }
        if (t.some((x) => x && x.nivel >= P.nivelMax)) marcar('brass')
      } })
      rodadas += e.vencidas
      pontos.push(e.fim.pontos)
      if (album === null && rodadas >= RODADAS_ALBUM_CHEIO) { album = p; marcar('librarian') }
    }
    out.push({ conq: Object.fromEntries(tem), album, partidas: pontos.length, pontos })
  }
  return out
}
function resumoE(porRobo, teto) {
  const L = ['| robô | jogadores | partidas até o álbum de 30 (mediana / p90) | partidas até as 12 conquistas (mediana) | conquistas feitas até o teto (mediana) |', '|---|---|---|---|---|']
  const res = {}
  for (const [robo, jogs] of Object.entries(porRobo)) {
    const alb = jogs.map((x) => x.album ?? Infinity)
    const todas = jogs.map((x) => (Object.keys(x.conq).length === CONQ.length ? Math.max(...Object.values(x.conq)) : Infinity))
    const fmt = (v) => (v === Infinity ? `> ${teto[robo]}` : String(v))
    L.push(`| ${robo} | ${jogs.length} | ${fmt(quantil(alb, 0.5))} / ${fmt(quantil(alb, 0.9))} | ${fmt(quantil(todas, 0.5))} | ${quantil(jogs.map((x) => Object.keys(x.conq).length), 0.5)} de 12 |`)
    res[robo] = { album: quantil(alb, 0.5), todas: quantil(todas, 0.5), porConquista: {} }
  }
  L.push('')
  L.push('| conquista | ' + Object.keys(porRobo).map((r) => `${r}: % dos jogadores / partida mediana`).join(' | ') + ' |')
  L.push('|---|' + Object.keys(porRobo).map(() => '---|').join(''))
  for (const id of CONQ) {
    const cel = Object.entries(porRobo).map(([robo, jogs]) => {
      const ps = jogs.filter((x) => x.conq[id]).map((x) => x.conq[id])
      res[robo].porConquista[id] = { pct: pct(ps.length, jogs.length), mediana: quantil(ps, 0.5) }
      return `${f1(pct(ps.length, jogs.length))}% / ${ps.length ? quantil(ps, 0.5) : '—'}`
    })
    L.push(`| ${id} | ${cel.join(' | ')} |`)
  }
  return { linhas: L, res }
}
/** Ranking semanal: média das 3 melhores de 21 partidas; reamostra das partidas já jogadas (partidas são independentes). */
export function rankingSemanal(pontosPior, pontosMelhor, { semanas = 20000, partidas = 21, melhores = 3, semente = 'ranking' } = {}) {
  const rng = criarRng(semente)
  const nota = (lista) => { const s = Array.from({ length: partidas }, () => lista[rng.inteiro(lista.length)]).sort((a, b) => b - a); return s.slice(0, melhores).reduce((a, b) => a + b, 0) / melhores }
  let passa = 0, empata = 0
  for (let s = 0; s < semanas; s++) { const a = nota(pontosPior), b = nota(pontosMelhor); if (a > b) passa++; else if (a === b) empata++ }
  return { passa: pct(passa, semanas), empata: pct(empata, semanas) }
}

// ================================================================ trabalhos em paralelo
function rodarTarefa(t) {
  const regras = aplicarVariante(t.variante || 'base')
  memoria.clear()
  try {
    if (t.tipo === 'A') return tarefaA({ ...t, regras })
    if (t.tipo === 'B') return tarefaB({ ...t, regras })
    if (t.tipo === 'C') return tarefaC({ ...t, regras })
    if (t.tipo === 'D') return tarefaD({ ...t, regras })
    if (t.tipo === 'E') return tarefaE({ ...t, regras })
    throw new Error(`tarefa desconhecida ${t.tipo}`)
  } finally { restaurar(); memoria.clear() }
}
export async function emParalelo(tarefas, trabalhos = availableParallelism()) {
  if (trabalhos <= 1) return tarefas.map(rodarTarefa)
  const fila = tarefas.map((t, i) => ({ ...t, i }))
  const res = new Array(fila.length)
  let prox = 0
  const um = () => new Promise((ok, falha) => {
    const w = new Worker(new URL(import.meta.url))
    const mandar = () => { if (prox >= fila.length) { w.terminate(); ok(); return } w.postMessage(fila[prox++]) }
    w.on('message', (m) => { if (m.erro) { w.terminate(); falha(new Error(m.erro)); return } res[m.i] = m.r; mandar() })
    w.on('error', falha)
    mandar()
  })
  await Promise.all(Array.from({ length: Math.min(trabalhos, fila.length) }, um))
  return res
}
const fatias = (n, passo) => { const out = []; for (let de = 0; de < n; de += passo) out.push([de, Math.min(n, de + passo)]); return out }

// ================================================================ medidas (cada uma devolve { linhas, res })
export async function medirA({ n = 2000, semente = 'keepmile36', variante = 'base', trabalhos, robos = ['aleatorio', 'ganancioso-puro', 'novato-atento'] } = {}) {
  const ts = robos.flatMap((robo) => fatias(n, 50).map(([de, ate]) => ({ tipo: 'A', robo, de, ate, semente, variante })))
  const r = await emParalelo(ts, trabalhos)
  const por = {}
  ts.forEach((t, i) => (por[t.robo] ||= []).push(...r[i]))
  const out = resumoA(por)
  out.cru = por
  return out
}
export async function medirB({ n = 400, K = 8, semente = 'keepmile36', variante = 'base', trabalhos } = {}) {
  const ts = fatias(n, 5).map(([de, ate]) => ({ tipo: 'B', de, ate, semente, variante, K }))
  const lista = (await emParalelo(ts, trabalhos)).flat()
  const out = resumoB(lista)
  out.cru = lista
  return out
}
export async function medirC({ n = 300, K = 8, semente = 'keepmile36', variante = 'base', trabalhos } = {}) {
  const ts = fatias(n, 5).map(([de, ate]) => ({ tipo: 'C', de, ate, semente, variante, K }))
  const lista = (await emParalelo(ts, trabalhos)).flat()
  return resumoC(lista)
}
export async function medirD({ n = 2000, planos = 300, semente = 'keepmile36', variante = 'base', trabalhos, liberadas } = {}) {
  const ts = fatias(n, 25).map(([de, ate]) => ({ tipo: 'D', robo: 'planejador', de, ate, semente, variante, liberadas }))
  const tp = planos ? Object.keys(PLANOS).flatMap((k) => fatias(planos, 25).map(([de, ate]) => ({ tipo: 'D', robo: `plano:${k}`, de, ate, semente: `${semente}:${k}`, variante }))) : []
  const r = await emParalelo([...ts, ...tp], trabalhos)
  const lista = r.slice(0, ts.length).flat()
  const pl = {}
  tp.forEach((t, i) => (pl[t.robo.slice(6)] ||= []).push(...r[ts.length + i]))
  const out = resumoD(lista, planos ? pl : null)
  out.cru = lista
  return out
}
export async function medirPontos({ robo, n = 2000, semente = 'keepmile36', variante = 'base', trabalhos } = {}) {
  const ts = fatias(n, 50).map(([de, ate]) => ({ tipo: 'D', robo, de, ate, semente: `${semente}:pontos`, variante, leve: true }))
  return (await emParalelo(ts, trabalhos)).flat().map((r) => r.pontos)
}
export async function medirE({ n = 200, nBom = 40, teto = { 'novato-atento': 400, planejador: 150 }, semente = 'keepmile36', variante = 'base', trabalhos, pontos } = {}) {
  const ts = [...fatias(n, 10).map(([de, ate]) => ({ tipo: 'E', robo: 'novato-atento', de, ate, semente, variante, teto: teto['novato-atento'] })),
    ...fatias(nBom, 2).map(([de, ate]) => ({ tipo: 'E', robo: 'planejador', de, ate, semente, variante, teto: teto.planejador }))]
  const r = await emParalelo(ts, trabalhos)
  const por = {}
  ts.forEach((t, i) => (por[t.robo] ||= []).push(...r[i]))
  const out = resumoE(por, teto)
  if (pontos) {
    out.linhas.push('')
    out.linhas.push('Ranking semanal (média das 3 melhores de 21 partidas; 20.000 semanas reamostradas das partidas medidas):')
    out.res.ranking = {}
    for (const [a, b] of [['aleatorio', 'ganancioso-puro'], ['ganancioso-puro', 'planejador'], ['novato-atento', 'planejador'], ['novato-atento', 'ganancioso-puro']]) {
      if (!pontos[a] || !pontos[b]) continue
      const x = rankingSemanal(pontos[a], pontos[b], { semente: `${semente}:rank:${a}:${b}` })
      const y = rankingSemanal(pontos[a], pontos[b], { semente: `${semente}:rank1:${a}:${b}`, partidas: 3 })
      out.res.ranking[`${a}>${b}`] = x.passa
      out.linhas.push(`- ${a} passa ${b}: ${f1(x.passa)}% das semanas (com 3 partidas na semana: ${f1(y.passa)}%)`)
    }
  }
  return out
}
/** F: tempo de tela por partida. `porRobo`: { robo: [{ lutas: [{rodada, vitoria, segundos, chefe}] }] } */
export function resumoF(porRobo) {
  const L = ['| robô | partidas | lutas por partida | só luta no 1× (min, mediana / p90) | só luta no 2× | partida inteira no 1× com 20 s de escolha por rodada (mediana / p90) | idem no 2× |', '|---|---|---|---|---|---|---|']
  const res = {}
  for (const [robo, jogos] of Object.entries(porRobo)) {
    const t1 = jogos.map((j) => j.lutas.reduce((a, b) => a + segundosDeTela(b, 1), 0) / 60)
    const t2 = jogos.map((j) => j.lutas.reduce((a, b) => a + segundosDeTela(b, 2), 0) / 60)
    const c1 = jogos.map((j, i) => t1[i] + j.lutas.length * SEG_ESCOLHA / 60)
    const c2 = jogos.map((j, i) => t2[i] + j.lutas.length * SEG_ESCOLHA / 60)
    const nl = media(jogos.map((j) => j.lutas.length))
    L.push(`| ${robo} | ${jogos.length} | ${f1(nl)} | ${f1(quantil(t1, 0.5))} / ${f1(quantil(t1, 0.9))} | ${f1(quantil(t2, 0.5))} / ${f1(quantil(t2, 0.9))} | ${f1(quantil(c1, 0.5))} / ${f1(quantil(c1, 0.9))} | ${f1(quantil(c2, 0.5))} / ${f1(quantil(c2, 0.9))} |`)
    res[robo] = { lutas: nl, luta1: quantil(t1, 0.5), luta2: quantil(t2, 0.5), inteira1: quantil(c1, 0.5), inteira2: quantil(c2, 0.5), inteira1p90: quantil(c1, 0.9) }
  }
  return { linhas: L, res }
}

// ================================================================ linha de comando
function argumentos(argv) {
  const a = { medida: argv[0] || 'todas', n: null, K: 8, semente: 'keepmile36', variante: 'base', trabalhos: availableParallelism(), json: false }
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--n') a.n = Number(argv[++i])
    else if (argv[i] === '--k') a.K = Number(argv[++i])
    else if (argv[i] === '--semente') a.semente = argv[++i]
    else if (argv[i] === '--variante') a.variante = argv[++i]
    else if (argv[i] === '--trabalhos') a.trabalhos = Number(argv[++i])
    else if (argv[i] === '--json') a.json = true
  }
  if (!VARIANTES[a.variante]) throw new Error(`variante desconhecida: ${a.variante} (há: ${Object.keys(VARIANTES).join(', ')})`)
  return a
}

if (!isMainThread && parentPort) {
  parentPort.on('message', (t) => { try { parentPort.postMessage({ i: t.i, r: rodarTarefa(t) }) } catch (x) { parentPort.postMessage({ i: t.i, erro: String(x && x.stack || x) }) } })
} else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = argumentos(process.argv.slice(2))
  const t0 = performance.now()
  const base = { semente: a.semente, variante: a.variante, trabalhos: a.trabalhos }
  const mostrar = (titulo, r) => { console.log(`\n## ${titulo}\n`); for (const l of r.linhas) console.log(l); if (a.json) console.log('\n```json\n' + JSON.stringify(r.res) + '\n```') }
  const quer = (m) => a.medida === 'todas' || a.medida.split(',').includes(m)
  console.log(`Keepmile — medidas R36 (semente "${a.semente}", variante ${a.variante}) — números PROVISÓRIOS; nada no config muda`)
  let A = null, D = null
  if (quer('A') || quer('E') || quer('F')) { A = await medirA({ ...base, n: a.n ?? 2000 }); if (quer('A')) mostrar('A — novato no 1º chefe (álbum inicial; o álbum cresce entre as partidas)', A) }
  if (quer('B')) mostrar(`B — qualidade da decisão (valor esperado com ${a.K} continuações do planejador)`, await medirB({ ...base, n: a.n ?? 400, K: a.K }))
  if (quer('C')) mostrar(`C — posição importa? (${a.K} continuações)`, await medirC({ ...base, n: a.n ?? 300, K: a.K }))
  if (quer('D') || quer('E') || quer('F')) { D = await medirD({ ...base, n: a.n ?? 2000, planos: quer('D') ? 300 : 0 }); if (quer('D')) mostrar('D — cartas, planos e ouro (planejador, álbum completo)', D) }
  if (quer('E')) {
    // ranking: os 4 robôs com o álbum completo (quem disputa ranking já jogou bastante); o planejador vem do D
    const pontos = { planejador: D.cru.map((r) => r.pontos) }
    for (const robo of ['aleatorio', 'ganancioso-puro', 'novato-atento']) pontos[robo] = await medirPontos({ ...base, robo, n: a.n ?? 2000 })
    mostrar('E — longo prazo e ranking', await medirE({ ...base, n: a.n ? Math.max(10, Math.round(a.n / 10)) : 200, nBom: a.n ? Math.max(2, Math.round(a.n / 50)) : 40, pontos }))
  }
  if (quer('F')) {
    const por = {}
    for (const [robo, jogs] of Object.entries(A.cru)) por[`${robo} (álbum inicial, 1ª partida)`] = jogs.map((j) => j[0])
    por['planejador (álbum completo)'] = D.cru
    const F = resumoF(por)
    F.linhas.push('')
    F.linhas.push(`"Só olhando" (planejador): ${f1(D.res.soOlhando.certas)}% das lutas já estavam ganhas com qualquer escolha; ${f1(D.res.soOlhando.perdidas)}% perdidas com qualquer escolha; a escolha decidiu ${f1(D.res.soOlhando.decide)}%.`)
    mostrar('F — tempo de tela', F)
  }
  console.log(`\ntempo total: ${((performance.now() - t0) / 1000).toFixed(1)} s`)
}
