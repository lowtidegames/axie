// TRAVA DE ROBÔS: um teste de tela (e2e, Chrome de verdade) por vez.
// Por quê: dois e2e rodando juntos disputam o computador e dão "timeout" falso.
//
// Como usar:
//   node tools/trava-robos.mjs rodar "<comando>" [args...]   pega a trava, roda o comando, solta no fim
//                                                            (os scripts e2e do package.json já usam isto)
//   node tools/trava-robos.mjs status                        mostra quem está com a trava
//   node tools/trava-robos.mjs soltar                        apaga a trava à força (se um robô morreu preso)
//   node tools/trava-robos.mjs gatilho                       gancho do Claude Code (.claude/settings.json): lê o JSON
//                                                            do comando na entrada padrão; barra um e2e rodado DIRETO
//                                                            (sem a trava), dizendo o comando certo
//
// A trava é um arquivo na pasta temporária com pid, comando e hora. Vence sozinha depois de PRAZO_MS
// ou quando o processo dono já morreu. Esperar a trava: até ESTUDIO_TRAVA_ESPERA_MIN minutos (padrão 25).
// Só usa o que vem no Node 22 (sem dependências).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PT_PADRAO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'pt-padrao.cjs') // opcional: se existir, os testes de tela nascem em pt-BR
export const ARQUIVO = process.env.ESTUDIO_TRAVA_ARQUIVO || path.join(os.tmpdir(), 'estudio-robo.trava')
export const PRAZO_MS = 40 * 60 * 1000
const VAR_DONO = 'ESTUDIO_TRAVA_DONO'

function vivo(pid) {
  try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }
}

export function ler(arquivo = ARQUIVO) {
  try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')) } catch { return null }
}

// Dono herdado: o "rodar" passa o pid dele aos filhos (ESTUDIO_TRAVA_DONO), para um e2e dentro do outro não travar.
function eNosso(pid, meuPid, env = process.env) {
  return pid === meuPid || String(pid) === env[VAR_DONO]
}

/** A trava ativa de OUTRO processo vivo (ou null: livre, vencida, morta ou nossa). */
export function ocupadaPorOutro({ meuPid = process.pid, arquivo = ARQUIVO, agora = Date.now(), env = process.env } = {}) {
  const t = ler(arquivo)
  if (!t || typeof t.pid !== 'number') return null
  if (eNosso(t.pid, meuPid, env)) return null
  if (agora - t.hora > PRAZO_MS) return null
  if (!vivo(t.pid)) return null
  return t
}

/** Pega a trava de forma atômica (abre com 'wx'). true = pegou (ou já era nossa). */
export function pegar({ comando = '', pid = process.pid, arquivo = ARQUIVO, env = process.env } = {}) {
  for (let i = 0; i < 3; i++) {
    const t = ler(arquivo)
    if (t && typeof t.pid === 'number') {
      if (eNosso(t.pid, pid, env)) return true
      if (ocupadaPorOutro({ meuPid: pid, arquivo, env })) return false
      try { fs.unlinkSync(arquivo) } catch { /* outro já limpou */ }
    } else if (fs.existsSync(arquivo)) {
      try { fs.unlinkSync(arquivo) } catch { /* ignora */ }
    }
    try {
      const fd = fs.openSync(arquivo, 'wx')
      fs.writeSync(fd, JSON.stringify({ pid, comando: String(comando).slice(0, 300), hora: Date.now() }))
      fs.closeSync(fd)
      return true
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
    }
  }
  return false
}

/** Solta só se a trava é nossa (ou já morta/vencida). forca = apaga sempre. */
export function soltar({ pid = process.pid, arquivo = ARQUIVO, forca = false } = {}) {
  const t = ler(arquivo)
  if (!forca && t && t.pid !== pid && vivo(t.pid) && Date.now() - t.hora <= PRAZO_MS) return false
  try { fs.unlinkSync(arquivo) } catch { /* já livre */ }
  return true
}

// ---------- reconhecer um e2e rodado direto ----------
// Olha cada PARTE do comando (separada por &&, ||, ;, | ou quebra de linha) e só o começo dela:
// citar um e2e dentro de um grep, de um texto ou de um commit NÃO conta (lição: a trava antiga lia a linha toda).
export function partesDoComando(cmd) {
  return String(cmd || '')
    .split(/&&|\|\||[;|\n]/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function semPrefixos(parte) {
  let p = parte.replace(/^\(+\s*/, '')
  for (;;) {
    const antes = p
    p = p.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s+)/, '') // VAR=valor
    p = p.replace(/^(?:env|exec|nohup|time)\s+/, '')
    p = p.replace(/^timeout\s+(?:-\S+\s+)*\S+\s+/, '')
    if (p === antes) return p
  }
}

/** A parte roda um e2e direto (sem passar pela trava)? */
export function ehE2eDireto(parte) {
  const p = semPrefixos(parte)
  return /^node\s+(?:--?\S+\s+)*\S*tests\/[^\s]*\.e2e\.js\b/.test(p)
}

/** A parte roda um e2e pelo npm (os scripts já passam pela trava e esperam a vez). */
export function ehE2ePeloNpm(parte) {
  return /^npm\s+(?:run\s+)?e2e(?::\S+)?(?:\s|$)/.test(semPrefixos(parte))
}

function hhmm(ms) {
  return new Date(ms).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) + ' BRT'
}

/** Decisão do gancho: { codigo: 0 } deixa passar; { codigo: 2, msg } barra. */
export function decidirGatilho(entrada, op = {}) {
  let cmd = ''
  try { cmd = JSON.parse(entrada)?.tool_input?.command || '' } catch { return { codigo: 0 } }
  const direto = partesDoComando(cmd).filter(ehE2eDireto)
  if (!direto.length) return { codigo: 0 }
  const t = ocupadaPorOutro(op)
  const certo = `node tools/trava-robos.mjs rodar "${direto[0].replace(/"/g, '\\"')}"`
  const msg = t
    ? `Outro teste de tela está rodando (desde ${hhmm(t.hora)}). Dois juntos dão timeout falso. Faça outra coisa e tente depois, ou rode pela trava (espera a vez): ${certo}`
    : `Teste de tela rodado direto não pega a trava (outro pode começar junto e dar timeout falso). Rode pela trava: ${certo}  (ou pelos scripts npm de teste de tela, quando existirem)`
  return { codigo: 2, msg }
}

// ---------- rodar um comando com a trava ----------
const aspas = (s) => (/^[A-Za-z0-9_@%+=:,./-]+$/.test(s) ? s : `'${String(s).replace(/'/g, `'\\''`)}'`)

export async function rodar(comando, extras = [], op = {}) {
  const esperaMs = (Number(process.env.ESTUDIO_TRAVA_ESPERA_MIN) || 25) * 60_000
  const inicio = Date.now()
  let avisou = false
  const linha = [comando, ...extras.map(aspas)].join(' ')
  while (!pegar({ comando: linha, ...op })) {
    const t = ocupadaPorOutro(op)
    if (!avisou && t) { console.error(`[trava] Outro teste de tela está rodando (desde ${hhmm(t.hora)}). Esperando a vez...`); avisou = true }
    if (Date.now() - inicio > esperaMs) {
      console.error('[trava] Esperei demais. Rode de novo depois (ou "node tools/trava-robos.mjs status").')
      return 75
    }
    await new Promise((ok) => setTimeout(ok, 3000))
  }
  return await new Promise((resolve) => {
    const filho = spawn(linha, { shell: true, stdio: 'inherit', env: { ...process.env, [VAR_DONO]: String(process.pid), NODE_OPTIONS: [process.env.NODE_OPTIONS, fs.existsSync(PT_PADRAO) ? `--require=${PT_PADRAO}` : ''].filter(Boolean).join(' ') } })
    const repassar = (sinal) => { try { filho.kill(sinal) } catch { /* já saiu */ } }
    process.on('SIGINT', repassar)
    process.on('SIGTERM', repassar)
    filho.on('exit', (codigo, sinal) => {
      soltar({ arquivo: op.arquivo })
      resolve(codigo ?? (sinal ? 1 : 0))
    })
    filho.on('error', (e) => {
      console.error('[trava] Não consegui rodar: ' + e.message)
      soltar({ arquivo: op.arquivo })
      resolve(1)
    })
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [modo, ...resto] = process.argv.slice(2)
  if (modo === 'gatilho') {
    let dados = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (c) => (dados += c))
    process.stdin.on('end', () => {
      const r = decidirGatilho(dados)
      if (r.msg) console.error(r.msg)
      process.exit(r.codigo)
    })
  } else if (modo === 'rodar') {
    const [comando, ...extras] = resto[0] === '--' ? resto.slice(1) : resto
    if (!comando) { console.error('Uso: node tools/trava-robos.mjs rodar "<comando>" [args...]'); process.exit(64) }
    process.exitCode = await rodar(comando, extras)
  } else if (modo === 'soltar') {
    soltar({ forca: true }); console.log('Trava apagada à força.')
  } else {
    const t = ocupadaPorOutro()
    console.log(t ? `Ocupada (pid ${t.pid}, desde ${hhmm(t.hora)}): ${t.comando}` : 'Livre.')
  }
}
