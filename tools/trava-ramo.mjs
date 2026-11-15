// TRAVA DO RAMO (gancho PreToolUse do Bash): cada agente envia só o PRÓPRIO ramo teste-*.
// Decisão do dono: o .claude/settings.json libera
// `git push [-u] origin teste-*` sem perguntar, e esta trava garante o limite:
//   - destino = ramo atual (o próprio ramo) passa; ramo de outro agente não;
//   - `teste` só de quem está no ramo `teste` (o diretor);
//   - `main`/`master` só de quem está no `main` (depois do "sim" do dono; a trava-congelado continua valendo);
//   - "origem:destino" com nomes diferentes, --all e --mirror são barrados.
// Sem saber o ramo atual (fora de repositório) não trava. Uso: node tools/trava-ramo.mjs gatilho
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lerEvento, palavras, partes, rodarGatilho } from './guardas-comum.mjs'
import { pastaDoComando } from './guarda-privacidade.mjs'

const MSG = (motivo) => `Envio barrado pela trava do ramo: ${motivo}. Regra do dono: cada agente envia só o próprio ramo teste-*; o ramo teste só o diretor (no ramo teste); main só com o "sim" do dono, a partir do main.`

function ramoGit(pasta) {
  try { return execFileSync('git', ['-C', pasta, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' }
}

const limpo = (r) => String(r || '').replace(/^refs\/heads\//, '')

// destinos de um pedaço "git push ..." (null se não é push)
export function destinosDoPush(pedaco, atual) {
  const p = palavras(pedaco)
  const g = p.findIndex((w) => /(^|[\\/])git(\.exe)?$/.test(w))
  if (g === -1) return null
  let i = g + 1
  while (i < p.length && p[i].startsWith('-')) i += ['-C', '-c'].includes(p[i]) ? 2 : 1
  if (p[i] !== 'push') return null
  const args = p.slice(i + 1)
  if (args.some((a) => a === '--all' || a === '--mirror' || a === '--branches')) return { erro: '--all/--mirror empurra todos os ramos' }
  // tira redirecionamentos (2>&1, > arquivo, 2>/dev/null) e o que vem depois de um > solto
  const semRedir = []
  for (let k = 0; k < args.length; k++) {
    const a = args[k]
    if (/^\d*[<>]+$/.test(a)) { k++; continue } // "> arquivo" ou "2>" seguido do alvo
    if (/^\d*[<>]/.test(a) || /^&\d/.test(a)) continue // "2>&1", ">/tmp/x", "2>/dev/null"
    semRedir.push(a)
  }
  const pos = semRedir.filter((a) => !a.startsWith('-'))
  const refs = pos.slice(1) // pos[0] é o remoto
  if (!refs.length) return { destinos: [atual] }
  const destinos = []
  for (const r of refs) {
    const limpa = r.replace(/^\+/, '')
    if (limpa.includes(':')) {
      const [orig, dest] = limpa.split(':')
      const o = orig === 'HEAD' || orig === '' ? atual : limpo(orig)
      if (limpo(dest) !== o) return { erro: `"${r}" envia um ramo para outro nome` }
      destinos.push(limpo(dest))
    } else destinos.push(limpa === 'HEAD' ? atual : limpo(limpa))
  }
  return { destinos }
}

export function motivoBarrar(destino, atual) {
  if (destino === 'main' || destino === 'master') return atual === destino ? null : `envio para ${destino} fora do ramo ${destino}`
  if (destino === 'teste') return atual === 'teste' ? null : 'o ramo teste é só do diretor'
  if (destino !== atual) return `"${destino}" não é o seu ramo (você está no ${atual})`
  return null
}

export function decidir(entrada, ramoAtual = ramoGit) {
  const ev = lerEvento(entrada)
  const cmd = ev?.tool_input?.command
  if (!cmd || !/\bgit\b[\s\S]*\bpush\b/.test(cmd)) return { codigo: 0 }
  const atual = ramoAtual(pastaDoComando(cmd, ev.cwd))
  if (!atual || atual === 'HEAD') return { codigo: 0 }
  for (const pedaco of partes(cmd)) {
    const d = destinosDoPush(pedaco, atual)
    if (!d) continue
    if (d.erro) return { codigo: 2, msg: MSG(d.erro) }
    for (const dest of d.destinos) {
      const m = motivoBarrar(dest, atual)
      if (m) return { codigo: 2, msg: MSG(m) }
    }
  }
  return { codigo: 0 }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'gatilho') {
  rodarGatilho((d) => decidir(d))
}
