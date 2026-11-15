// Frayz — simulador da Costura (sem tela, sem banco). Mede os números PROVISÓRIOS de shared/costura.js.
//   node tools/simular-costura.mjs [--populacao N] [--geracoes G] [--semente S] [--lutas N]
//        [--costuras F] [--lutas-por-geracao L] [--teto T] [--modo acaso|selecao|ambos] [--fator-lendaria X]
//
// 1) População: N bonecos de origem; a cada geração, F × (vivos) costuras entre pares (ao acaso, ou "selecao":
//    os de mais faces raras costuram entre si), cada vivo faz L lutas (Pontos de Costura) e quem chega ao limite
//    se aposenta. Imprime a raridade das faces por geração e vivos × aposentados.
// 2) Lendário × Comum: 2.000 lutas planejador × planejador; o MESMO time (3 bonecos prontos sorteados) com todas
//    as partes Lendárias contra todas Comuns, lados alternados. É a prova do teto de +10% ("paga para ganhar").
//    --fator-lendaria X muda o fator da Lendária SÓ NESTE PROCESSO (para medir uma proposta; a config não muda).
import { criarLuta } from '../shared/batalha.js'
import { BONECOS_PRONTOS, RARIDADES } from '../shared/config.js'
import { PARAMS_COSTURA, PARTES_DO_BONECO, aposentar, costurar, gerarBonecoInicial, podeAposentar, registrarLuta } from '../shared/costura.js'
import { criarRng } from '../shared/rng.js'
import { jogarTurno } from '../shared/robos.js'

const RARS = Object.keys(RARIDADES) // comum, incomum, rara, lendaria
const PESO_RAR = { comum: 0, incomum: 1, rara: 2, lendaria: 3 }

export function lerArgs(argv) {
  const o = { populacao: 300, geracoes: 15, semente: 'frayz', lutas: 2000, costuras: 0.2, lutasPorGeracao: 150, modo: 'ambos', teto: 3000, fatorLendaria: null, alvoRaridade: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = argv[i + 1]
    if (a === '--populacao') { o.populacao = Math.max(4, parseInt(v, 10) || 4); i++ }
    else if (a === '--geracoes') { o.geracoes = Math.max(1, parseInt(v, 10) || 1); i++ }
    else if (a === '--semente') { o.semente = String(v); i++ }
    else if (a === '--lutas') { o.lutas = Math.max(0, parseInt(v, 10) || 0); i++ }
    else if (a === '--costuras') { o.costuras = Math.max(0, parseFloat(v) || 0); i++ }
    else if (a === '--lutas-por-geracao') { o.lutasPorGeracao = Math.max(0, parseInt(v, 10) || 0); i++ }
    else if (a === '--teto') { o.teto = Math.max(4, parseInt(v, 10) || 4); i++ }
    else if (a === '--modo') { o.modo = String(v); i++ }
    else if (a === '--fator-lendaria') { o.fatorLendaria = parseFloat(v); i++ }
    else if (a === '--alvo-raridade') { o.alvoRaridade = String(v); i++ }
  }
  return o
}

const nota = (b) => PARTES_DO_BONECO.reduce((s, p) => s + PESO_RAR[b.partes[p].face.split('@')[1]], 0)

function distribuicao(lista) {
  const c = Object.fromEntries(RARS.map((r) => [r, 0]))
  for (const b of lista) for (const p of PARTES_DO_BONECO) c[b.partes[p].face.split('@')[1]]++
  const tot = lista.length * PARTES_DO_BONECO.length || 1
  return Object.fromEntries(RARS.map((r) => [r, (100 * c[r]) / tot]))
}

/** Simula a população. modo 'acaso' ou 'selecao'. */
export function simularPopulacao({ populacao, geracoes, semente, costuras, lutasPorGeracao, modo, teto = Infinity }) {
  const rng = criarRng(`pop:${semente}:${modo}`)
  let vivos = []
  for (let i = 0; i < populacao; i++) vivos.push(gerarBonecoInicial(rng, { id: `o${i}` }))
  let aposentados = 0, retalhos = 0, recusas = {}, n = 0, metadeLendaria = null
  const linhas = [{ g: 0, vivos: vivos.length, aposentados, nascidos: 0, carretelCheio: 0, dist: distribuicao(vivos), distNascidos: null }]
  for (let g = 1; g <= geracoes; g++) {
    // costuras
    const alvo = Math.round(costuras * Math.min(vivos.length, teto)) // acima do teto, as costuras param de crescer
    let ordem
    if (modo === 'selecao') ordem = vivos.map((b, i) => [nota(b) + rng.proximo() * 0.01, i]).sort((a, b) => b[0] - a[0]).map((x) => x[1])
    else { ordem = vivos.map((_, i) => i); for (let i = ordem.length - 1; i > 0; i--) { const j = rng.inteiro(i + 1); [ordem[i], ordem[j]] = [ordem[j], ordem[i]] } }
    const usados = new Set(), nascidos = []
    for (let i = 0; i < ordem.length && nascidos.length < alvo; i++) {
      const ia = ordem[i]
      if (usados.has(ia)) continue
      for (let j = i + 1; j < ordem.length && j <= i + 20; j++) {
        const ib = ordem[j]
        if (usados.has(ib)) continue
        const r = costurar({ semente: `${semente}:${modo}:${g}:${n}`, paiA: vivos[ia], paiB: vivos[ib], idFilho: `c${n}` })
        if (!r.ok) { recusas[r.codigo] = (recusas[r.codigo] ?? 0) + 1; continue }
        n++
        vivos[ia] = r.pais[0]; vivos[ib] = r.pais[1]
        usados.add(ia); usados.add(ib)
        nascidos.push(r.filho)
        break
      }
    }
    // lutas e aposentadoria (os nascidos desta geração só lutam na próxima)
    const fica = []
    for (let b of vivos) {
      // L lutas de uma vez (rápido): soma L−1 direto e passa a última pela API (que trava no limite)
      const L = Math.min(lutasPorGeracao, PARAMS_COSTURA.desgaste.limite - b.pontosDeCostura)
      if (L > 0) {
        b = { ...b, pontosDeCostura: b.pontosDeCostura + (L - 1) * PARAMS_COSTURA.desgaste.pontosPorLuta, lutas: b.lutas + L - 1, vitorias: b.vitorias + Math.floor((L - 1) / 2) }
        b = registrarLuta(b, { venceu: true })
      }
      if (podeAposentar(b)) { const r = aposentar(b); aposentados++; retalhos += r.retalhos } else fica.push(b)
    }
    vivos = fica.concat(nascidos)
    const carretelCheio = vivos.filter((b) => b.voltasUsadas >= PARAMS_COSTURA.carretelVoltas).length
    const dist = distribuicao(vivos)
    if (metadeLendaria === null && dist.lendaria >= 50) metadeLendaria = g
    linhas.push({ g, vivos: vivos.length, aposentados, nascidos: nascidos.length, carretelCheio, dist, distNascidos: nascidos.length ? distribuicao(nascidos) : null })
  }
  return { linhas, recusas, retalhos, metadeLendaria }
}

const IDS = Object.keys(BONECOS_PRONTOS)
function comRaridade(id, rar) {
  const p = BONECOS_PRONTOS[id].partes
  return { nome: id, partes: Object.fromEntries(PARTES_DO_BONECO.map((s) => [s, `${p[s].split('@')[0]}@${rar}`])) }
}

/** Mesmo time, raridade X contra raridade Y. Devolve a taxa de vitória do lado X. */
export function duelarRaridades({ lutas, semente, rarX = 'lendaria', rarY = 'comum' }) {
  const rng = criarRng(`duelo:${semente}`)
  let venceX = 0, somaTurnos = 0
  for (let i = 0; i < lutas; i++) {
    const ids = IDS.slice(), time = []
    for (let k = 0; k < 3; k++) time.push(ids.splice(rng.inteiro(ids.length), 1)[0])
    const xA = i % 2 === 0
    const tx = time.map((id) => comRaridade(id, rarX)), ty = time.map((id) => comRaridade(id, rarY))
    const e = criarLuta({ semente: `${semente}:rar:${i}`, timeA: xA ? tx : ty, timeB: xA ? ty : tx })
    e.registro = false
    for (let g = 0; g < 200 && !e.fim; g++) jogarTurno(e, 'planejador')
    if (!e.fim) throw new Error(`luta ${i} não terminou`)
    somaTurnos += e.fim.turno
    if ((e.fim.vencedor === 'A') === xA) venceX++
  }
  const p = venceX / (lutas || 1)
  return { pct: 100 * p, ic: 100 * 1.96 * Math.sqrt((p * (1 - p)) / (lutas || 1)), turnos: somaTurnos / (lutas || 1) }
}

function imprimirPopulacao(nome, r) {
  const f = (x) => x.toFixed(1).padStart(5)
  const L = [`\n== População: costuras ${nome} ==`, ' ger  vivos  apos  nasc  carretel-cheio |  faces vivas: comum incom  rara  lend | nascidos: lend']
  for (const l of r.linhas) {
    L.push(`${String(l.g).padStart(4)} ${String(l.vivos).padStart(6)} ${String(l.aposentados).padStart(5)} ${String(l.nascidos).padStart(5)} ${String(l.carretelCheio).padStart(15)} |               ${f(l.dist.comum)} ${f(l.dist.incomum)} ${f(l.dist.rara)} ${f(l.dist.lendaria)} | ${l.distNascidos ? f(l.distNascidos.lendaria) : '    -'}`)
  }
  L.push(`metade das faces Lendária: ${r.metadeLendaria === null ? 'não aconteceu' : `geração ${r.metadeLendaria}`} · Retalhos Honrados devolvidos: ${r.retalhos} · recusas: ${JSON.stringify(r.recusas)}`)
  console.log(L.join('\n'))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const o = lerArgs(process.argv.slice(2))
  const t0 = performance.now()
  if (Number.isFinite(o.fatorLendaria)) RARIDADES.lendaria.fator = o.fatorLendaria // só neste processo
  const geracaoEmLutas = o.lutasPorGeracao
  console.log('Frayz — simulador da Costura (números PROVISÓRIOS)')
  console.log(`semente ${o.semente} · população inicial ${o.populacao} · ${o.geracoes} gerações · ${geracaoEmLutas} lutas por geração · costuras por geração = ${o.costuras} × vivos (até ${o.teto} vivos)`)
  console.log(`Carretel ${PARAMS_COSTURA.carretelVoltas} voltas · limite de desgaste ${PARAMS_COSTURA.desgaste.limite} pontos · origem: ${JSON.stringify(PARAMS_COSTURA.chancesDeRaridade)}`)
  const modos = o.modo === 'ambos' ? ['acaso', 'selecao'] : [o.modo]
  for (const m of modos) imprimirPopulacao(m === 'acaso' ? 'ao acaso' : 'com seleção (raros com raros)', simularPopulacao({ ...o, modo: m }))
  if (o.lutas > 0) {
    const fat = Object.entries(RARIDADES).map(([k, v]) => `${k} ${v.fator}`).join(' · ')
    console.log(`\n== Raridade na luta (planejador × planejador, ${o.lutas} lutas, mesmo time, lados alternados; fatores: ${fat}) ==`)
    const pares = o.alvoRaridade ? [[o.alvoRaridade, 'comum']] : [['lendaria', 'comum'], ['rara', 'comum'], ['lendaria', 'rara']]
    for (const [x, y] of pares) {
      const d = duelarRaridades({ lutas: o.lutas, semente: o.semente, rarX: x, rarY: y })
      console.log(`  ${RARIDADES[x].nome.padEnd(9)} × ${RARIDADES[y].nome.padEnd(9)} → ${RARIDADES[x].nome} vence ${d.pct.toFixed(1)}% (±${d.ic.toFixed(1)}) · ${d.turnos.toFixed(1)} turnos${x === 'lendaria' && y === 'comum' && d.pct > 58 ? '  ALERTA (> 58%)' : ''}`)
    }
  }
  console.log(`\n(${((performance.now() - t0) / 1000).toFixed(1)} s)`)
}
