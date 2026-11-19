// Keepmile — simulador do jogo de reino: joga milhares de partidas com semente fixa e mede contra os alvos da bíblia.
// Uso: node tools/simular-reino.mjs [--partidas 600] [--planos 200] [--semente keepmile] [--rapido] [--album todas|inicial] [--trabalhos 4]
//   --planos N   joga N partidas com cada robô de plano (0 = não joga); padrão: um terço de --partidas
//   --trabalhos  quantos processos em paralelo (o resultado é o mesmo com 1 ou com 4)
import { pathToFileURL } from 'node:url'
import { Worker, isMainThread, parentPort } from 'node:worker_threads'
import { availableParallelism } from 'node:os'
import { criarRng } from '../shared/rng.js'
import { ALBUM, CARTAS, CHEFES, FAMILIAS } from '../shared/reino/config.js'
import { expandirHorda, montarExercito, simularBatalha } from '../shared/reino/batalha.js'
import { PLANOS, ROBOS, ROBOS_PLANO, jogarPartida } from '../shared/reino/robos.js'

const pct = (a, b) => (b ? (100 * a) / b : 0)
function quantil(lista, q) {
  const a = lista.slice().sort((x, y) => x - y)
  if (!a.length) return 0
  return a[Math.min(a.length - 1, Math.floor(q * a.length))]
}
const SEG_ESCOLHA = 20 // segundos de escolha por luta no relógio estimado

/** Carta dominante do reino final: maior nível; empate: mais terrenos; depois a ordem do config. */
function cartaDominante(terrenos) {
  const soma = {}
  for (const t of terrenos) if (t) { const s = (soma[t.carta] ||= { nivel: 0, n: 0 }); s.nivel = Math.max(s.nivel, t.nivel); s.n++ }
  let m = null
  for (const id of Object.keys(CARTAS)) {
    const s = soma[id]
    if (!s) continue
    if (!m || s.nivel > soma[m].nivel || (s.nivel === soma[m].nivel && s.n > soma[m].n)) m = id
  }
  return m
}
/** Plano do reino = as famílias que carregam os níveis: uma só (≥ 70% dos níveis) ou a dupla das duas maiores. */
function planoDoReino(terrenos) {
  const c = {}
  let tot = 0
  for (const t of terrenos) if (t) { const f = CARTAS[t.carta].familia; c[f] = (c[f] || 0) + t.nivel; tot += t.nivel }
  const fs = Object.keys(FAMILIAS).filter((f) => c[f]).sort((a, b) => c[b] - c[a] || a.localeCompare(b))
  if (!fs.length) return 'vazio'
  if (fs.length === 1 || c[fs[0]] >= 0.7 * tot) return FAMILIAS[fs[0]].nome
  return [fs[0], fs[1]].sort().map((f) => FAMILIAS[f].nome).join('+')
}

/** Teto de bonecos na luta: todos os soldados + todos os invasores (com os chamados pelo chefe). */
function tetoBonecos(luta) {
  const s = montarExercito(luta.terrenos, luta.reliquias).soldados.reduce((a, f) => a + f.qtd, 0)
  const fichas = expandirHorda(luta.horda)
  const chamados = fichas.reduce((a, f) => a + (f.chama ? f.chama.teto : 0), 0)
  return s + fichas.length + chamados
}
/** Máximo de bonecos vivos e à vista ao mesmo tempo, contado pelos eventos (o que a tela desenha). */
export function bonecosAoMesmoTempo(eventos) {
  const vivos = new Set()
  let max = 0
  for (const ev of eventos) {
    const cod = ev[1]
    if (cod === 'n' || cod === 'r') vivos.add(ev[2])
    else if (cod === 'c') vivos.delete(ev[2])
    if (vivos.size > max) max = vivos.size
  }
  return max
}

/** Joga as partidas [de, ate) de um robô e devolve os números crus. */
function simularRobo({ robo, de, ate, semente, cartasLiberadas, amostrar }) {
  const r = { rodadas: [], pontos: [], finais: [], lutas: [], relogio: [], escolhas: { tropa: 0, construcao: 0, magia: 0 }, levelUp: { oferecido: 0, pego: 0, cheioOferecido: 0, cheioPego: 0 },
    espolios: { carta: 0, promocao: 0, bolsa: 0, reliquia: 0 }, chefes: {}, ouroGanho: 0, ouroGasto: 0, sorteios: 0, consertos: 0,
    primeira: {}, tetoBonecos: 0, lutaMaisCheia: null, amostra: [] }
  for (let i = de; i < ate; i++) {
    const rng = criarRng(`robo:${semente}:${robo}:${i}`)
    const { estado, diario } = jogarPartida({ robo, semente: `${semente}:${i}`, cartasLiberadas, inteiro: (n) => rng.inteiro(n) })
    r.rodadas.push(estado.rodada)
    r.pontos.push(estado.fim.pontos)
    r.finais.push(estado.terrenos)
    r.ouroGanho += estado.ouroGanho
    r.ouroGasto += estado.ouroGasto
    let seg = 0
    const jaLutou = new Set()
    for (const l of diario) {
      if (l.tipo === 'por') {
        r.escolhas[CARTAS[l.carta].tipo]++
        if (l.levelUpOferecido) {
          r.levelUp.oferecido++
          if (l.levelUp) r.levelUp.pego++
          if (l.reinoCheio) { r.levelUp.cheioOferecido++; if (l.levelUp) r.levelUp.cheioPego++ }
        }
      }
      if (l.tipo === 'sortear') r.sorteios++
      if (l.tipo === 'consertar') r.consertos++
      if (l.tipo === 'espolio') r.espolios[l.espolio.reliquia && l.espolio.tipo === 'reliquia' ? 'reliquia' : l.espolio.tipo]++
      if (l.tipo === 'batalhar') {
        seg += SEG_ESCOLHA + l.batalha.segundos
        r.lutas.push({ vitoria: l.batalha.vitoria, segundos: l.batalha.segundos, porTempo: l.batalha.porTempo, rodada: l.rodada })
        if (!jaLutou.has(l.rodada)) {
          jaLutou.add(l.rodada)
          const p = (r.primeira[l.rodada] ||= [0, 0]); p[0]++; if (l.batalha.vitoria) p[1]++
        }
        if (l.batalha.chefe) { const c = (r.chefes[l.batalha.chefe] ||= { lutas: 0, vitorias: 0 }); c.lutas++; if (l.batalha.vitoria) c.vitorias++ }
        const teto = tetoBonecos(l.luta)
        if (teto > r.tetoBonecos) { r.tetoBonecos = teto; r.lutaMaisCheia = l.luta }
        if (amostrar && r.amostra.length < 1000 && i % 3 === 0) r.amostra.push(l.luta)
      }
    }
    r.relogio.push(seg / 60)
  }
  return r
}

function juntar(partes) {
  const r = partes[0]
  for (const p of partes.slice(1)) {
    for (const k of ['rodadas', 'pontos', 'finais', 'lutas', 'relogio', 'amostra']) r[k].push(...p[k])
    for (const g of ['escolhas', 'levelUp', 'espolios']) for (const k of Object.keys(r[g])) r[g][k] += p[g][k]
    for (const k of ['ouroGanho', 'ouroGasto', 'sorteios', 'consertos']) r[k] += p[k]
    for (const [k, c] of Object.entries(p.chefes)) { const x = (r.chefes[k] ||= { lutas: 0, vitorias: 0 }); x.lutas += c.lutas; x.vitorias += c.vitorias }
    for (const [k, c] of Object.entries(p.primeira)) { const x = (r.primeira[k] ||= [0, 0]); x[0] += c[0]; x[1] += c[1] }
    if (p.tetoBonecos > r.tetoBonecos) { r.tetoBonecos = p.tetoBonecos; r.lutaMaisCheia = p.lutaMaisCheia }
  }
  r.amostra = r.amostra.slice(0, 1000)
  return r
}

function tarefas({ partidas, planos, semente, album, robos }) {
  const cartasLiberadas = album === 'inicial' ? ALBUM.inicial : Object.keys(CARTAS)
  const out = []
  const lista = [...robos.map((robo) => [robo, partidas]), ...(planos ? ROBOS_PLANO.map((robo) => [robo, planos]) : [])]
  // novato: o aleatório só com o álbum inicial (os primeiros 60 s de quem acabou de chegar)
  if (robos.includes('aleatorio') && album !== 'inicial') lista.push(['aleatorio@inicial', partidas])
  const fatia = 25
  for (const [robo, n] of lista) {
    for (let de = 0; de < n; de += fatia) {
      const novato = robo === 'aleatorio@inicial'
      out.push({ chave: robo, robo: novato ? 'aleatorio' : robo, de, ate: Math.min(n, de + fatia), semente, cartasLiberadas: novato ? ALBUM.inicial : cartasLiberadas,
        amostrar: robo === 'ganancioso' || robo === 'planejador' })
    }
  }
  return out
}

/** ms por batalha (com eventos, como no servidor) e bonecos vivos ao mesmo tempo (amostra + a luta mais cheia de cada robô). */
function medirBatalhas(out, R, medirMs = true) {
  const amostra = ['ganancioso', 'planejador'].flatMap((k) => (R[k] ? R[k].amostra : []))
  const cheias = Object.values(R).map((r) => r.lutaMaisCheia).filter(Boolean)
  let max = 0
  if (amostra.length) {
    const t0 = performance.now()
    let eventos = 0
    for (const l of amostra) { const ev = simularBatalha({ ...l, eventos: true }).eventos; eventos += ev.length; max = Math.max(max, bonecosAoMesmoTempo(ev)) }
    if (medirMs) {
      out.msPorBatalha = (performance.now() - t0) / amostra.length
      out.eventosPorBatalha = eventos / amostra.length
      out.lutasMedidas = amostra.length
    }
  }
  for (const l of cheias) max = Math.max(max, bonecosAoMesmoTempo(simularBatalha({ ...l, eventos: true }).eventos))
  out.bonecosMax = max
  out.bonecosTeto = Math.max(0, ...Object.values(R).map((r) => r.tetoBonecos))
}

/** Síncrono (testes e uso simples). */
export function simular({ partidas = 600, planos = 0, semente = 'keepmile', album = 'todas', robos = ROBOS, medirMs = true } = {}) {
  const out = { partidas, planos, semente, album, robos: {} }
  const grupos = {}
  for (const t of tarefas({ partidas, planos, semente, album, robos })) (grupos[t.chave] ||= []).push(simularRobo(t))
  for (const [k, ps] of Object.entries(grupos)) out.robos[k] = juntar(ps)
  medirBatalhas(out, out.robos, medirMs)
  return out
}

/** Em paralelo (mesmo resultado que simular, mais rápido). */
export async function simularParalelo({ partidas = 600, planos = 0, semente = 'keepmile', album = 'todas', robos = ROBOS, trabalhos = availableParallelism() } = {}) {
  const fila = tarefas({ partidas, planos, semente, album, robos }).map((t, i) => ({ ...t, i }))
  const res = new Array(fila.length)
  let prox = 0
  const um = () => new Promise((ok, falha) => {
    const w = new Worker(new URL(import.meta.url))
    const mandar = () => { if (prox >= fila.length) { w.terminate(); ok(); return } w.postMessage(fila[prox++]) }
    w.on('message', (m) => { res[m.i] = m.r; mandar() })
    w.on('error', falha)
    mandar()
  })
  await Promise.all(Array.from({ length: Math.max(1, trabalhos) }, um))
  const out = { partidas, planos, semente, album, robos: {} }
  const grupos = {}
  fila.forEach((t, i) => (grupos[t.chave] ||= []).push(res[i]))
  for (const [k, ps] of Object.entries(grupos)) out.robos[k] = juntar(ps)
  medirBatalhas(out, out.robos)
  return out
}

/** Números contra os alvos. */
export function resumo(sim) {
  const R = sim.robos
  const linhas = []
  const res = { alvos: {} }
  const med = {}
  for (const robo of [...ROBOS, 'aleatorio@inicial']) {
    const r = R[robo]
    if (!r) continue
    med[robo] = quantil(r.rodadas, 0.5)
    linhas.push(`${robo.padEnd(11)} rodada final: mediana ${med[robo]} · p10 ${quantil(r.rodadas, 0.1)} · p90 ${quantil(r.rodadas, 0.9)} · pontos mediana ${quantil(r.pontos, 0.5)} · relógio mediana ${quantil(r.relogio, 0.5).toFixed(1)} min (p90 ${quantil(r.relogio, 0.9).toFixed(1)})`)
  }
  // planos bem jogados
  const pl = ROBOS_PLANO.filter((k) => R[k])
  if (pl.length) {
    const medP = pl.map((k) => [k, quantil(R[k].rodadas, 0.5), quantil(R[k].rodadas, 0.9), quantil(R[k].relogio, 0.5)])
    const topo = Math.max(...medP.map((x) => x[1]))
    res.planos = Object.fromEntries(medP.map(([k, m, p90]) => [k.slice(6), { mediana: m, p90 }]))
    res.planosViaveisRobo = medP.filter((x) => x[1] >= 0.8 * topo).length
    linhas.push(`robôs de plano (${R[pl[0]].rodadas.length} partidas cada): ${res.planosViaveisRobo} com mediana a até 20% do melhor (${topo}) (alvo ≥ 6)`)
    linhas.push('  ' + medP.map(([k, m, p90, rel]) => `${PLANOS[k.slice(6)].nome} ${m} (p90 ${p90}, ${rel.toFixed(0)} min)${m >= 0.8 * topo ? '' : ' ✗'}`).join(' · '))
    const ch = (k, id) => { const x = R[k].chefes[id]; return x ? pct(x.vitorias, x.lutas).toFixed(0) : '—' }
    linhas.push('  chefes 5/10/15/20 por plano: ' + pl.map((k) => `${k.slice(6)} ${CHEFES.map((c) => ch(k, c.id)).join('/')}`).join(' · '))
  }
  // primeiros 60 s
  for (const k of ['aleatorio@inicial', 'aleatorio']) {
    const r = R[k]
    if (!r) continue
    const f = (n) => pct(r.primeira[n] ? r.primeira[n][1] : 0, r.primeira[n] ? r.primeira[n][0] : 0)
    res[`novato_${k}`] = [1, 2, 3].map(f)
    linhas.push(`${k}: vence a 1ª luta da rodada 1 em ${f(1).toFixed(0)}% · rodada 2 ${f(2).toFixed(0)}% · rodada 3 ${f(3).toFixed(0)}% (alvo ≥ 85% e ≥ 60%)`)
  }
  // lutas dos robôs que jogam de verdade
  const lutas = ['ganancioso', 'planejador'].flatMap((k) => (R[k] ? R[k].lutas : []))
  if (lutas.length) {
    const seg = lutas.map((l) => l.segundos)
    const aos30 = pct(lutas.filter((l) => l.porTempo).length, lutas.length)
    linhas.push(`batalha: mediana ${quantil(seg, 0.5)} s · p10 ${quantil(seg, 0.1)} · p90 ${quantil(seg, 0.9)} · chega aos 30 s: ${aos30.toFixed(2)}% (alvo < 2%) · ${lutas.length} lutas`)
    const faixas = [[1, 5], [6, 10], [11, 15], [16, 20], [21, 999]]
    linhas.push('  aos 30 s por rodada: ' + faixas.map(([a, b]) => { const f = lutas.filter((l) => l.rodada >= a && l.rodada <= b); return `${a}–${b > 99 ? '' : b}: ${pct(f.filter((l) => l.porTempo).length, f.length).toFixed(1)}% de ${f.length}` }).join(' · '))
    res.batalhaMediana = quantil(seg, 0.5)
    res.aos30 = aos30
  }
  const plan = R.planejador
  if (plan) {
    const ordem = plan.pontos.map((p, i) => i).sort((a, b) => plan.pontos[b] - plan.pontos[a])
    const top = ordem.slice(0, Math.max(1, Math.floor(ordem.length / 10)))
    const presenca = {}
    const planos = {}
    const planosFam = {}
    for (const i of top) {
      const ts = plan.finais[i]
      for (const id of new Set(ts.filter(Boolean).map((t) => t.carta))) presenca[id] = (presenca[id] || 0) + 1
      const d = cartaDominante(ts)
      planos[d] = (planos[d] || 0) + 1
      const pf = planoDoReino(ts)
      planosFam[pf] = (planosFam[pf] || 0) + 1
    }
    const pres = Object.entries(presenca).map(([id, n]) => [id, pct(n, top.length)]).sort((a, b) => b[1] - a[1])
    res.maiorPresenca = pres[0]
    res.presenca = Object.fromEntries(pres)
    linhas.push(`10% melhores do planejador (${top.length} partidas): carta mais presente ${CARTAS[pres[0][0]].nome} ${pres[0][1].toFixed(0)}% (alvo ≤ 60%)`)
    linhas.push('  presença: ' + pres.map(([id, p]) => `${CARTAS[id].nome} ${p.toFixed(0)}%`).join(' · '))
    // presença em todos os reinos finais (planejador + robôs de plano): carta morta = < 5% nas melhores de todos
    const todos = [plan, ...pl.map((k) => R[k])]
    const pres2 = {}
    let nTop = 0
    for (const r of todos) {
      const ord = r.pontos.map((p, i) => i).sort((a, b) => r.pontos[b] - r.pontos[a]).slice(0, Math.max(1, Math.floor(r.pontos.length / 10)))
      nTop += ord.length
      for (const i of ord) for (const id of new Set(r.finais[i].filter(Boolean).map((t) => t.carta))) pres2[id] = (pres2[id] || 0) + 1
    }
    const mortas = Object.keys(CARTAS).filter((id) => pct(pres2[id] || 0, nTop) < 5)
    res.mortas = mortas
    linhas.push(`  cartas mortas (< 5% nos 10% melhores de planejador + planos): ${mortas.length ? mortas.map((id) => CARTAS[id].nome).join(', ') : 'nenhuma'}`)
    const pld = Object.entries(planos).map(([id, n]) => [id, pct(n, top.length)]).sort((a, b) => b[1] - a[1])
    res.cartasDominantes = pld.filter(([, p]) => p >= 8).length
    linhas.push(`  carta dominante com ≥ 8%: ${res.cartasDominantes} → ` + pld.map(([id, p]) => `${CARTAS[id].nome} ${p.toFixed(0)}%`).join(' · '))
    const pf = Object.entries(planosFam).map(([k, n]) => [k, pct(n, top.length)]).sort((a, b) => b[1] - a[1])
    res.planosViaveis = pf.filter(([, p]) => p >= 8).length
    linhas.push(`  dupla de famílias com ≥ 8%: ${res.planosViaveis} → ` + pf.map(([k, p]) => `${k} ${p.toFixed(0)}%`).join(' · '))
  }
  for (const robo of ['ganancioso', 'planejador', ...pl]) {
    const r = R[robo]
    if (!r) continue
    const tot = r.escolhas.tropa + r.escolhas.construcao + r.escolhas.magia
    const te = Object.values(r.espolios).reduce((a, b) => a + b, 0)
    const curto = robo.startsWith('plano:')
    res[`levelUp_${robo}`] = pct(r.levelUp.pego, r.levelUp.oferecido)
    res[`promocao_${robo}`] = pct(r.espolios.promocao, te)
    res[`chefes_${robo}`] = Object.fromEntries(CHEFES.map((c) => [c.id, r.chefes[c.id] ? pct(r.chefes[c.id].vitorias, r.chefes[c.id].lutas) : null]))
    if (curto) continue
    linhas.push(`${robo}: cartas tropa ${pct(r.escolhas.tropa, tot).toFixed(0)}% · construção ${pct(r.escolhas.construcao, tot).toFixed(0)}% · magia ${pct(r.escolhas.magia, tot).toFixed(0)}% · LEVEL UP (subiu o nível) em ${pct(r.levelUp.pego, r.levelUp.oferecido).toFixed(0)}% das ofertas que o tinham (com os 6 terrenos cheios: ${pct(r.levelUp.cheioPego, r.levelUp.cheioOferecido).toFixed(0)}%)`)
    linhas.push(`  espólio: Card ${pct(r.espolios.carta, te).toFixed(0)}% · Promotion ${pct(r.espolios.promocao, te).toFixed(0)}% · Purse ${pct(r.espolios.bolsa, te).toFixed(0)}% · Relic (chefe) ${pct(r.espolios.reliquia, te).toFixed(0)}%`)
    linhas.push(`  chefes: ` + CHEFES.map((c) => { const x = r.chefes[c.id]; return `${c.nome} ${x ? pct(x.vitorias, x.lutas).toFixed(0) + '% de ' + x.lutas : '—'}` }).join(' · '))
    linhas.push(`  ouro por partida: ganho ${(r.ouroGanho / r.rodadas.length).toFixed(1)} · gasto ${(r.ouroGasto / r.rodadas.length).toFixed(1)} · sorteios ${(r.sorteios / r.rodadas.length).toFixed(2)} · consertos ${(r.consertos / r.rodadas.length).toFixed(2)}`)
  }
  if (pl.length) {
    const lu = pl.map((k) => res[`levelUp_${k}`]), pr = pl.map((k) => res[`promocao_${k}`])
    linhas.push(`robôs de plano: LEVEL UP ${Math.min(...lu).toFixed(0)}–${Math.max(...lu).toFixed(0)}% · Promotion ${Math.min(...pr).toFixed(0)}–${Math.max(...pr).toFixed(0)}% · chefes (média dos planos): ` +
      CHEFES.map((c) => { const v = pl.map((k) => res[`chefes_${k}`][c.id]).filter((x) => x !== null); return `${c.nome.split(' ')[0]} ${v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(0) + '%' : '—'}` }).join(' · '))
  }
  if (med.planejador && med.aleatorio) {
    res.habilidade = med.planejador / med.aleatorio
    linhas.push(`habilidade: planejador ÷ aleatório = ${res.habilidade.toFixed(2)}× (alvo ≥ 1,5×)`)
  }
  if (sim.msPorBatalha !== undefined) {
    linhas.push(`batalha com eventos: ${sim.msPorBatalha.toFixed(3)} ms em média (alvo < 5 ms) · ${sim.eventosPorBatalha.toFixed(0)} eventos · ${sim.lutasMedidas} lutas medidas`)
  }
  if (sim.bonecosMax !== undefined) linhas.push(`bonecos vivos ao mesmo tempo: máximo ${sim.bonecosMax} (alvo ≤ 120) · teto somado da luta mais cheia ${sim.bonecosTeto}`)
  res.medianas = med
  res.msPorBatalha = sim.msPorBatalha
  res.bonecosMax = sim.bonecosMax
  return { linhas, res }
}

function argumentos(argv) {
  const a = { partidas: 600, semente: 'keepmile', album: 'todas', planos: null, trabalhos: availableParallelism() }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--partidas') a.partidas = Number(argv[++i])
    else if (argv[i] === '--planos') a.planos = Number(argv[++i])
    else if (argv[i] === '--semente') a.semente = argv[++i]
    else if (argv[i] === '--album') a.album = argv[++i]
    else if (argv[i] === '--trabalhos') a.trabalhos = Number(argv[++i])
    else if (argv[i] === '--rapido') a.partidas = 20
  }
  if (!Number.isInteger(a.partidas) || a.partidas < 1) throw new Error('--partidas precisa ser inteiro ≥ 1')
  if (a.planos === null) a.planos = Math.ceil(a.partidas / 3)
  return a
}

if (!isMainThread && parentPort) {
  parentPort.on('message', (t) => parentPort.postMessage({ i: t.i, r: simularRobo(t) }))
} else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = argumentos(process.argv.slice(2))
  const t0 = performance.now()
  const sim = await simularParalelo(a)
  const { linhas } = resumo(sim)
  console.log(`Keepmile — simulador (${a.partidas} partidas por robô, ${a.planos} por robô de plano, semente "${a.semente}", álbum ${a.album}) — números PROVISÓRIOS`)
  for (const l of linhas) console.log(l)
  console.log(`tempo total: ${((performance.now() - t0) / 1000).toFixed(1)} s`)
}
