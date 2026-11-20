// Keepmile — MOVIMENTO POR CÓDIGO: a pose de cada boneco em cima do quadro do atlas (recuar, dar o bote, voltar, apanhar, pular no
// passo, tombar). Só contas puras, em PIXEL INTEIRO de arte e por TEMPO (ms), nunca por quadro: a cena aplica com corte e deslocamento.
// Uma pose = { dx, dy, larg, alt, incl, fase }: desloca (px), engorda/estica (px a mais na largura/altura, pé parado) e inclina
// (px de desvio no topo). `dx` e `incl` positivos = para onde o boneco OLHA.
export const FASE = { nada: 0, antecipa: 1, bote: 2, volta: 3 }
export const BOTE_MS = 70, SEGURA_MS = 60, VOLTA_MS = 190
const sai = (f) => 1 - (1 - f) * (1 - f), entra = (f) => f * f
export const pose = () => ({ dx: 0, dy: 0, larg: 0, alt: 0, incl: 0, fase: 0 })
export function zerar(P) { P.dx = 0; P.dy = 0; P.larg = 0; P.alt = 0; P.incl = 0; P.fase = 0; return P }

/** Quanto dura o golpe inteiro (antecipação + bote + segura + volta). */
export const duracaoDoGolpe = (ant) => ant + BOTE_MS + SEGURA_MS + VOLTA_MS

/** GOLPE: antecipa (encolhe e recua) → bote para a frente (estica) → segura no impacto → volta. `peso` 1 soldado, 1.5 bruto, 2 chefe.
 *  `tiro`: quem atira não avança — puxa para trás e leva o coice. Soma na pose e devolve a fase. */
export function golpe(P, ms, ant, peso = 1, tiro = false) {
  if (ms < 0) return 0
  const rec = Math.round(3 * peso), av = Math.round((tiro ? -2 : 6) * peso)
  if (ms < ant) { const f = sai(ms / ant); P.dx -= Math.round(rec * f); P.alt -= Math.round(2 * peso * f); P.larg += Math.round(2 * peso * f); P.incl -= Math.round(1.4 * f * peso); return (P.fase = FASE.antecipa) }
  ms -= ant
  if (ms < BOTE_MS) { const f = sai(ms / BOTE_MS); P.dx += Math.round(-rec + (av + rec) * f); P.larg += tiro ? 0 : Math.round(2 * peso); P.alt -= tiro ? 0 : 1; P.incl += Math.round((tiro ? -1 : 2) * peso); return (P.fase = FASE.bote) }
  ms -= BOTE_MS
  if (ms < SEGURA_MS) { P.dx += av; P.incl += Math.round((tiro ? -1 : 2) * peso); P.alt += tiro ? 0 : 1; return (P.fase = FASE.bote) }
  ms -= SEGURA_MS
  if (ms < VOLTA_MS) { const f = sai(ms / VOLTA_MS); P.dx += Math.round(av * (1 - f)); P.incl += f < 0.4 ? Math.sign(av) : 0; return (P.fase = FASE.volta) }
  return 0
}

/** APANHOU: recua e amassa na hora, depois estica 1 px e assenta. `dir` = +1 se o golpe empurra para onde ele olha. */
export function apanhou(P, ms, dir, forca = 1) {
  if (ms < 0 || ms >= 240) return false
  const rec = Math.round(3 * forca)
  if (ms < 70) { P.dx += dir * rec; P.larg += 2; P.alt -= 2; P.incl += dir }
  else if (ms < 150) { P.dx += dir * Math.round(rec * (1 - (ms - 70) / 80 * 0.6)); P.alt += 1; P.larg -= 1 }
  else P.dx += dir * Math.round(rec * 0.4 * (1 - (ms - 150) / 90))
  return true
}

/** PASSO de marcha: pulinho de até 2 px a cada pisada (meio ciclo do andar) e 1 px amassado ao pousar. Devolve true no instante da pisada. */
export function passo(P, ms, meioCiclo = 300, alto = 2) {
  const f = (ms % meioCiclo) / meioCiclo
  P.dy -= Math.round(Math.sin(f * Math.PI) * alto)
  if (f < 0.14) { P.alt -= 1; P.larg += 1 }
  return f < 0.14
}

/** PARADO: nunca parado de verdade — troca o peso de perna (1 px de inclinação) fora de fase com os vizinhos. */
export function parado(P, ms) {
  const c = ms % 2600
  if (c > 1900 && c < 2500) P.incl += c < 2200 ? 1 : -1
}

/** GRITO antes da luta: um pulo só, com a arma para o alto (estica 2 px no ar). */
export function grito(P, ms) {
  if (ms < 0 || ms >= 320) return
  const f = ms / 320
  P.dy -= Math.round(Math.sin(f * Math.PI) * 5); if (f > 0.2 && f < 0.75) { P.alt += 2; P.larg -= 1 } else if (f >= 0.88) { P.alt -= 1; P.larg += 2 }
}

/** VIRADA: afina e abre de novo em 120 ms (o espelho troca no meio). */
export function virada(P, ms, w) { if (ms >= 0 && ms < 120) P.larg -= Math.round(w * 0.3 * Math.sin((ms / 120) * Math.PI)) }

/** TOMBO do aliado: salta para trás em arco curto antes de cair (a fumaça vem depois). */
export function tombo(P, ms, dur) {
  const f = Math.min(1, ms / dur)
  P.dx -= Math.round(7 * sai(f)); P.dy -= Math.round(Math.sin(Math.min(1, f * 1.5) * Math.PI) * 5)
  if (f < 0.2) P.incl -= 2
}

/** ESTOURO do invasor: amassa largo, espicha fino e some na fumaça (bem diferente do tombo do soldado). */
export const ESTOURO_MS = 170
export function estouro(P, ms) {
  if (ms < 80) { const f = sai(ms / 80); P.larg += Math.round(6 * f); P.alt -= Math.round(7 * f) }
  else { const f = entra((ms - 80) / 90); P.larg += Math.round(6 - 12 * f); P.alt += Math.round(-7 + 16 * f); P.dy -= Math.round(4 * f) }
}

/** QUEDA DO CHEFE em etapas: cambaleia (treme de um lado para o outro, cada vez menos) → ajoelha (amassa e afunda) → tomba. */
export const CHEFE = { cambaleia: 420, ajoelha: 260 }
export function quedaDoChefe(P, ms) {
  if (ms < CHEFE.cambaleia) { const f = ms / CHEFE.cambaleia; P.dx += Math.round(Math.sin(ms / 34) * 4 * (1 - f * 0.6)); P.incl += Math.round(Math.sin(ms / 34) * 2); return 1 }
  ms -= CHEFE.ajoelha > 0 ? CHEFE.cambaleia : 0
  if (ms < CHEFE.ajoelha) { const f = sai(ms / CHEFE.ajoelha); P.alt -= Math.round(10 * f); P.larg += Math.round(6 * f); P.incl -= Math.round(2 * f); return 2 }
  return 3
}
