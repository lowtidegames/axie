// TRAVA DA PROPOSTA (gancho Stop): toda resposta que pede o "sim" do dono traz o checklist de opções com nota
// e diz o que os conselheiros acharam (ou por que não precisa). Combinado do dono, esquecido mais de
// uma vez → virou trava (regra 8: lição que repete vira trava).
// Pedido de "sim" = a resposta tem um bloco de código cuja 1ª linha começa com "sim" (o texto que o dono copia).
// Também cobra quando a resposta RECOMENDA ou PROPÕE algo ("recomendo",
// "sugiro", "o melhor é", "minha proposta", "cole isto", prompt ou plano para o dono usar). Resposta que só
// informa não é cobrada. Só conta o texto fora dos blocos de código, crases e aspas (comando, prompt ou palavra citada não dispara).
// Exige: (1) uma tabela com a coluna "Nota" e pelo menos 2 linhas de opção; (2) uma linha com "Conselheiros:".
// stop_hook_active = true -> sai 0 (nunca laço). Sem transcrição legível -> sai 0 (não trava por falha própria).
// Uso: node tools/trava-proposta.mjs gatilho
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lerEvento, rodarGatilho } from './guardas-comum.mjs'

export const MSG = 'Proposta sem o combinado do dono: toda resposta que pede o "sim" OU recomenda/propõe algo (recomendo, sugiro, o melhor é, cole isto, prompt ou plano para o dono usar) precisa do CHECKLIST de opções em tabela com a coluna "Nota" (melhor primeiro, pelo menos 2 opções) e de uma linha "Conselheiros: ..." (notas do guardião/diversão/economista, ou "não precisa — <motivo>"). Refaça a resposta com os dois.'

// texto da última fala do assistente na transcrição (JSONL)
export function ultimaFala(linhas) {
  for (let i = linhas.length - 1; i >= 0; i--) {
    let e; try { e = JSON.parse(linhas[i]) } catch { continue }
    const m = e && (e.message || e)
    if (!m || (e.type !== 'assistant' && m.role !== 'assistant')) continue
    const c = Array.isArray(m.content) ? m.content : []
    const txt = c.filter((p) => p && p.type === 'text' && typeof p.text === 'string').map((p) => p.text).join('\n')
    if (txt.trim()) return txt
  }
  return ''
}

export function pedeSim(texto) {
  const blocos = texto.match(/```[^\n]*\n([\s\S]*?)```/g) || []
  return blocos.some((b) => /^```[^\n]*\n\s*sim\b/i.test(b))
}

// recomenda ou propõe? (texto fora dos blocos de código, sem acento, minúsculo)
const RECOMENDA = [
  /\b(eu )?(recomendo|recomendamos|recomendaria|sugiro|sugerimos|sugeriria|proponho|propomos|aconselho)\b/,
  /\bminha (recomendacao|sugestao|proposta|indicacao)\b/,
  /\b(o|a) melhor (e|seria|caminho|opcao|escolha|saida)\b/,
  /\bmelhor caminho\b/,
  /\beu faria\b/,
  /\b(cole|colar|copie|copiar)\s+(isto|isso|este|esse|esta|essa|abaixo|aqui|o texto|a frase|o prompt|na|no|em)\b/,
  /\b(prompt|plano|frase|texto|roteiro)\b[^.\n]{0,40}\b(para|pra) (voce|vc|o dono) (usar|colar|mandar|enviar|seguir|copiar)\b/,
  /\bprompt recomendado\b/,
]
export function recomenda(texto) {
  const prosa = texto.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`|"[^"\n]*"|“[^”\n]*”/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return RECOMENDA.some((r) => r.test(prosa))
}

export function temChecklist(texto) {
  const linhas = texto.split('\n')
  const i = linhas.findIndex((l) => /^\s*\|.*\bNota\b.*\|\s*$/i.test(l))
  if (i < 0) return false
  let opcoes = 0
  for (let k = i + 2; k < linhas.length && /^\s*\|/.test(linhas[k]); k++) opcoes++
  return opcoes >= 2
}

export const temConselheiros = (texto) => /conselheiros\s*:/i.test(texto)

export function avaliar(texto) {
  if (!pedeSim(texto) && !recomenda(texto)) return { codigo: 0 }
  return temChecklist(texto) && temConselheiros(texto) ? { codigo: 0 } : { codigo: 2, msg: MSG }
}

export function decidir(entrada) {
  const evento = lerEvento(entrada)
  if (!evento || evento.stop_hook_active) return { codigo: 0 }
  const arq = evento.transcript_path
  if (!arq || !fs.existsSync(arq)) return { codigo: 0 }
  let linhas
  try { linhas = fs.readFileSync(arq, 'utf8').split('\n').filter(Boolean) } catch { return { codigo: 0 } }
  return avaliar(ultimaFala(linhas))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'gatilho') {
  rodarGatilho((d) => decidir(d))
}
