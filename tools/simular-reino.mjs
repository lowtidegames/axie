// Keepmile — simulador do jogo de reino: joga milhares de partidas com semente fixa e mede contra os alvos da bíblia.
// Uso: node tools/simular-reino.mjs [--partidas 600] [--semente keepmile] [--rapido] [--album todas|inicial]
import { pathToFileURL } from 'node:url'
import { criarRng } from '../shared/rng.js'
import { ALBUM, CARTAS, CHEFES, FAMILIAS } from '../shared/reino/config.js'
import { simularBatalha } from '../shared/reino/batalha.js'
import { ROBOS, jogarPartida } from '../shared/reino/robos.js'

const pct = (a, b) => (b ? (100 * a) / b : 0)
function quantil(lista, q) {
  const a = lista.slice().sort((x, y) => x - y)
  if (!a.length) return 0
  return a[Math.min(a.length - 1, Math.floor(q * a.length))]
}

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

export function simular({ partidas = 600, semente = 'keepmile', album = 'todas', robos = ROBOS, medirMs = true } = {}) {
  const cartasLiberadas = album === 'inicial' ? ALBUM.inicial : Object.keys(CARTAS)
  const out = { partidas, semente, album, robos: {} }
  const amostraLutas = []
  for (const robo of robos) {
    const r = { rodadas: [], pontos: [], finais: [], lutas: [], escolhas: { tropa: 0, construcao: 0, magia: 0 }, levelUp: { oferecido: 0, pego: 0 },
      espolios: { carta: 0, promocao: 0, bolsa: 0, reliquia: 0 }, chefes: {}, ouroGanho: 0, ouroGasto: 0, sorteios: 0, consertos: 0 }
    for (let i = 0; i < partidas; i++) {
      const rng = criarRng(`robo:${semente}:${robo}:${i}`)
      const { estado, diario } = jogarPartida({ robo, semente: `${semente}:${i}`, cartasLiberadas, inteiro: (n) => rng.inteiro(n) })
      r.rodadas.push(estado.rodada)
      r.pontos.push(estado.fim.pontos)
      r.finais.push(estado.terrenos)
      r.ouroGanho += estado.ouroGanho
      r.ouroGasto += estado.ouroGasto
      for (const l of diario) {
        if (l.tipo === 'por') {
          r.escolhas[CARTAS[l.carta].tipo]++
          if (l.levelUp) r.levelUp.pego++
        }
        if (l.tipo === 'sortear') r.sorteios++
        if (l.tipo === 'consertar') r.consertos++
        if (l.tipo === 'espolio') r.espolios[l.espolio.reliquia && l.espolio.tipo === 'reliquia' ? 'reliquia' : l.espolio.tipo]++
        if (l.tipo === 'batalhar') {
          r.lutas.push({ ...l.batalha, rodada: l.rodada })
          if (l.batalha.chefe) { const c = (r.chefes[l.batalha.chefe] ||= { lutas: 0, vitorias: 0 }); c.lutas++; if (l.batalha.vitoria) c.vitorias++ }
          if (amostraLutas.length < 3000 && i % 3 === 0) amostraLutas.push(l.luta)
        }
      }
      r.levelUp.oferecido += diario.filter((l) => l.tipo === 'por' && l.levelUpOferecido).length
    }
    out.robos[robo] = r
  }
  // ms por batalha (com a lista de eventos, como no servidor)
  if (medirMs && amostraLutas.length) {
    const t0 = performance.now()
    let eventos = 0
    for (const l of amostraLutas) eventos += simularBatalha({ ...l, eventos: true }).eventos.length
    out.msPorBatalha = (performance.now() - t0) / amostraLutas.length
    out.eventosPorBatalha = eventos / amostraLutas.length
    out.lutasMedidas = amostraLutas.length
  }
  return out
}

/** Números contra os alvos. */
export function resumo(sim) {
  const R = sim.robos
  const linhas = []
  const res = { alvos: {} }
  const med = {}
  for (const [robo, r] of Object.entries(R)) {
    med[robo] = quantil(r.rodadas, 0.5)
    linhas.push(`${robo.padEnd(11)} rodada final: mediana ${med[robo]} · p10 ${quantil(r.rodadas, 0.1)} · p90 ${quantil(r.rodadas, 0.9)} · pontos mediana ${quantil(r.pontos, 0.5)}`)
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
    linhas.push(`10% melhores do planejador (${top.length} partidas): carta mais presente ${CARTAS[pres[0][0]].nome} ${pres[0][1].toFixed(0)}% (alvo ≤ 60%)`)
    linhas.push('  presença: ' + pres.slice(0, 12).map(([id, p]) => `${CARTAS[id].nome} ${p.toFixed(0)}%`).join(' · '))
    const pl = Object.entries(planos).map(([id, n]) => [id, pct(n, top.length)]).sort((a, b) => b[1] - a[1])
    res.cartasDominantes = pl.filter(([, p]) => p >= 8).length
    linhas.push(`  carta dominante com ≥ 8%: ${res.cartasDominantes} → ` + pl.map(([id, p]) => `${CARTAS[id].nome} ${p.toFixed(0)}%`).join(' · '))
    const pf = Object.entries(planosFam).map(([k, n]) => [k, pct(n, top.length)]).sort((a, b) => b[1] - a[1])
    res.planosViaveis = pf.filter(([, p]) => p >= 8).length
    linhas.push(`  planos (família ou dupla de famílias) com ≥ 8%: ${res.planosViaveis} (alvo ≥ 6) → ` + pf.map(([k, p]) => `${k} ${p.toFixed(0)}%`).join(' · '))
  }
  for (const [robo, r] of Object.entries(R)) {
    if (robo === 'aleatorio') continue
    const tot = r.escolhas.tropa + r.escolhas.construcao + r.escolhas.magia
    const te = Object.values(r.espolios).reduce((a, b) => a + b, 0)
    linhas.push(`${robo}: cartas tropa ${pct(r.escolhas.tropa, tot).toFixed(0)}% · construção ${pct(r.escolhas.construcao, tot).toFixed(0)}% · magia ${pct(r.escolhas.magia, tot).toFixed(0)}% · LEVEL UP pego em ${pct(r.levelUp.pego, r.levelUp.oferecido).toFixed(0)}% das ofertas que o tinham`)
    linhas.push(`  espólio: Card ${pct(r.espolios.carta, te).toFixed(0)}% · Promotion ${pct(r.espolios.promocao, te).toFixed(0)}% · Purse ${pct(r.espolios.bolsa, te).toFixed(0)}% · Relic (chefe) ${pct(r.espolios.reliquia, te).toFixed(0)}%`)
    linhas.push(`  chefes: ` + CHEFES.map((c) => { const x = r.chefes[c.id]; return `${c.nome} ${x ? pct(x.vitorias, x.lutas).toFixed(0) + '% de ' + x.lutas : '—'}` }).join(' · '))
    linhas.push(`  ouro por partida: ganho ${(r.ouroGanho / r.rodadas.length).toFixed(1)} · gasto ${(r.ouroGasto / r.rodadas.length).toFixed(1)} · sorteios ${(r.sorteios / r.rodadas.length).toFixed(2)} · consertos ${(r.consertos / r.rodadas.length).toFixed(2)}`)
    res[`levelUp_${robo}`] = pct(r.levelUp.pego, r.levelUp.oferecido)
    res[`promocao_${robo}`] = pct(r.espolios.promocao, te)
  }
  if (med.planejador && med.aleatorio) {
    res.habilidade = med.planejador / med.aleatorio
    linhas.push(`habilidade: planejador ÷ aleatório = ${res.habilidade.toFixed(2)}× (alvo ≥ 1,5×)`)
  }
  if (sim.msPorBatalha !== undefined) linhas.push(`batalha com eventos: ${sim.msPorBatalha.toFixed(3)} ms em média (alvo < 5 ms) · ${sim.eventosPorBatalha.toFixed(0)} eventos · ${sim.lutasMedidas} lutas medidas`)
  res.medianas = med
  res.msPorBatalha = sim.msPorBatalha
  return { linhas, res }
}

function argumentos(argv) {
  const a = { partidas: 600, semente: 'keepmile', album: 'todas' }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--partidas') a.partidas = Number(argv[++i])
    else if (argv[i] === '--semente') a.semente = argv[++i]
    else if (argv[i] === '--album') a.album = argv[++i]
    else if (argv[i] === '--rapido') a.partidas = 20
  }
  if (!Number.isInteger(a.partidas) || a.partidas < 1) throw new Error('--partidas precisa ser inteiro ≥ 1')
  return a
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = argumentos(process.argv.slice(2))
  const t0 = performance.now()
  const sim = simular(a)
  const { linhas } = resumo(sim)
  console.log(`Keepmile — simulador (${a.partidas} partidas por robô, semente "${a.semente}", álbum ${a.album}) — números PROVISÓRIOS`)
  for (const l of linhas) console.log(l)
  console.log(`tempo total: ${((performance.now() - t0) / 1000).toFixed(1)} s`)
}
