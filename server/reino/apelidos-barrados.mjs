// Keepmile — palavras que não podem aparecer no apelido (troca de apelido R22; criação de conta R24). Lista curta de
// propósito: ofensas óbvias em inglês e nomes que fingem ser da equipe. Confere sem caixa, sem acento, sem espaço/_/-/.,
// com número no lugar da letra (4dm1n = admin) e na mesma forma do apelido único (chaveDoApelido: I/l/1 e O/0 juntos,
// "rn" vale "m"), para "ADMlN", "Adrnin" e "Keeprnile" não escaparem.
// Ofensa que aparece dentro de nome real (OFENSAS_EM_NOME_REAL) barra só como palavra — com enfeite/sufixo — e os nomes
// curtos da equipe (EQUIPE_PALAVRA_INTEIRA) só como palavra inteira — separada por espaço, _, -, ., número ou troca de
// minúscula para maiúscula — para não barrar nome comum ("Nazira", "Devon", "Sigma").
import { chaveDoApelido } from '../apelido.mjs'

/** Nomes que fingem ser da equipe (barram dentro de qualquer parte do apelido). */
export const EQUIPE = ['admin', 'administrador', 'moderator', 'moderador', 'staff', 'official', 'oficial', 'keepmile', 'frayz', 'support', 'suporte', 'gamemaster', 'developer', 'equipe']

/** Nomes curtos que fingem ser da equipe (barram só como palavra inteira). */
export const EQUIPE_PALAVRA_INTEIRA = ['dev', 'gm', 'owner']

/** Ofensas óbvias (inglês). */
export const OFENSAS = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'rapist', 'nazi', 'hitler', 'retard', 'porn', 'pussy', 'asshole']

/**
 * Ofensas curtas que aparecem dentro de nome real (Nazira, Hoshitaro, Slutsky, Scunthorpe): barram só como palavra,
 * aceitando enfeite antes (x, xx, bull...) e sufixo depois (s, y, ty, boy, head, face, xx...). As outras ofensas,
 * curtas ou não, barram em qualquer posição.
 */
export const OFENSAS_EM_NOME_REAL = ['nazi', 'shit', 'slut', 'cunt']
const ENFEITE_ANTES = ['x', 'bull', 'dumb', 'holy', 'big', 'the']
const ENFEITE_DEPOIS = ['s', 'y', 'ty', 'z', 'x', 'er', 'boy', 'girl', 'head', 'face', 'hole', 'bag', 'lord', 'king', 'man', 'hub', 'ing', 'show', 'fest', 'kid']

const DENTRO = [...EQUIPE, ...OFENSAS.filter((p) => !OFENSAS_EM_NOME_REAL.includes(p))]
const INTEIRA = EQUIPE_PALAVRA_INTEIRA
const NUMERO_POR_LETRA = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b' }

/** Formas antigas (R22): sem caixa e sem separador; e com os números trocados por letra (o 1 também como l). */
function formas(apelido) {
  const base = String(apelido).toLowerCase().replace(/[ _-]+/g, '')
  const leet = base.replace(/[0134578]/g, (d) => NUMERO_POR_LETRA[d])
  return [base, leet, base.replace(/1/g, 'l').replace(/[034578]/g, (d) => NUMERO_POR_LETRA[d])]
}

/** Forma do apelido único (chaveDoApelido) sem separador e com 3/4/5/7/8 trocados por letra (0 e 1 a chave já junta). */
function chave(s) {
  return chaveDoApelido(s).replace(/[ ._-]+/g, '').replace(/[34578]/g, (d) => NUMERO_POR_LETRA[d])
}

const DENTRO_CHAVE = DENTRO.map(chave)
const INTEIRA_CHAVE = new Set(INTEIRA.map(chave))
const alt = (l) => l.map(chave).join('|')
const OFENSA_COM_ENFEITE = new RegExp(`^(?:${alt(ENFEITE_ANTES)})*(?:${alt(OFENSAS_EM_NOME_REAL)})(?:${alt(ENFEITE_DEPOIS)})*$`)

/** Palavras do apelido: separa por espaço/_/-/. e por troca de minúscula para maiúscula; letras soltas seguidas viram uma ("F u c k"). */
function palavras(apelido) {
  const partes = String(apelido).normalize('NFKC').replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2').split(/[ ._-]+/).filter(Boolean)
  const juntas = []
  let soltas = ''
  for (const p of partes) {
    if (p.length === 1) { soltas += p; continue }
    if (soltas) { juntas.push(soltas); soltas = '' }
    juntas.push(p)
  }
  if (soltas) juntas.push(soltas)
  return juntas
}

/** O apelido contém palavra barrada? */
export function apelidoBarrado(apelido) {
  const f = formas(apelido)
  if (DENTRO.some((p) => f.some((x) => x.includes(p)))) return true
  const k = chave(apelido)
  if (DENTRO_CHAVE.some((p) => k.includes(p))) return true
  if (OFENSA_COM_ENFEITE.test(k)) return true // o apelido todo, sem separador ("xXnaziXx", "Nazi Boy")
  for (const w of palavras(apelido)) {
    // a palavra inteira (com número no lugar de letra: "sh1t") e cada pedaço dela entre números ("shit123")
    for (const pedaco of [w, ...w.split(/[0-9]+/)]) {
      if (!pedaco) continue
      const kp = chave(pedaco)
      if (INTEIRA_CHAVE.has(kp) || OFENSA_COM_ENFEITE.test(kp)) return true
    }
  }
  return false
}
