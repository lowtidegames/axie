// Keepmile — A LETRA EM PIXEL (R54): as duas fontes do jogo ("reino" 5×7 e "mini" 3×5), as letras de 12 idiomas, a maiúscula certa
// de cada idioma, a quebra de linha e o registro honesto do que não coube ou não tem desenho.
// Só dados e contas: nada aqui toca em tela (o desenho é do arte.js / arte-codigo.js), por isso roda igual no teste do servidor.
// Tudo desenhado aqui, ponto a ponto, no traço das fontes do jogo. Nenhuma fonte de fora.
//
// COMO AS LETRAS COM ACENTO CABEM SEM MUDAR A ALTURA DA LINHA (nenhuma tela muda de tamanho):
//   reino 5×7 · acento de 2 linhas (´ ` ^ ~ ˘): o corpo encolhe 1 linha (6), 1 linha de folga, acento nas 2 linhas ACIMA do topo.
//             · trema e ponto (¨ ˙): corpo inteiro (7), 1 linha de folga, os pontos 2 linhas acima do topo.
//   mini 3×5  · agudo e grave: corpo inteiro (5) com o acento em diagonal encostado, 2 linhas acima do topo.
//             · til (vira barra), trema e ponto: corpo inteiro, 1 linha de folga, acento 2 linhas acima.
//             · circunflexo e braquia (^ ˘): não cabem encostados (viram borrão): o corpo encolhe para 4 linhas + folga + acento.
//   cedilha (Ç Ş): 2 linhas ABAIXO da linha de base, nos dois tamanhos.
//   Ou seja: o glifo acentuado sobe no máximo 2 px e desce no máximo 2 px, usando o espaço entre linhas; a linha de base e o passo
//   da linha não mudam. Quem desenha num canvas justo (arte.js: `titulo`, `miniatura`) ganha a folga sozinho.
// ß: a maiúscula alemã sai "SS" (é o que `toLocaleUpperCase` faz e o que o alemão aceita); o "ẞ" maiúsculo escrito à mão vira "SS" também.
// Vietnamita e tailandês não têm desenho em pixel: a frase inteira vai para a letra do aparelho (arte.js) e entra em `Letras.faltas()`.

// ------------------------------------------------------------------ as duas fontes de sempre (inglês): NÃO MEXER (o inglês sai pixel a pixel igual)
export const G5 = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#', B: '####./#...#/#...#/####./#...#/#...#/####.', C: '.####/#..../#..../#..../#..../#..../.####', D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '####/#.../#.../###./#.../#.../####', F: '####/#.../#.../###./#.../#.../#...', G: '.####/#..../#..../#..##/#...#/#...#/.####', H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '###/.#./.#./.#./.#./.#./###', J: '..##/...#/...#/...#/...#/#..#/.##.', K: '#...#/#..#./#.#../##.../#.#../#..#./#...#', L: '#.../#.../#.../#.../#.../#.../####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', N: '#...#/##..#/#.#.#/#.#.#/#..##/#...#/#...#', O: '.###./#...#/#...#/#...#/#...#/#...#/.###.', P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#', R: '####./#...#/#...#/####./#.#../#..#./#...#', S: '.####/#..../#..../.###./....#/....#/####.', T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.', V: '#...#/#...#/#...#/#...#/.#.#./.#.#./..#..', W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#', X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '#####/....#/...#./..#../.#.../#..../#####',
  0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', 1: '.#./##./.#./.#./.#./.#./###', 2: '.###./#...#/....#/...#./..#../.#.../#####', 3: '####./....#/....#/.###./....#/....#/####.',
  4: '...#./..##./.#.#./#..#./#####/...#./...#.', 5: '#####/#..../####./....#/....#/#...#/.###.', 6: '.###./#..../#..../####./#...#/#...#/.###.', 7: '#####/....#/...#./..#../..#../..#../..#..',
  8: '.###./#...#/#...#/.###./#...#/#...#/.###.', 9: '.###./#...#/#...#/.####/....#/....#/.###.',
  ' ': '.../.../.../.../.../.../...', '.': './././././#/#', ',': '../../../../../.#/#.', '!': '#/#/#/#/#/./#', '?': '.###./#...#/....#/...#./..#../...../..#..', ':': '././#/././#/.',
  '-': '..../..../..../####/..../..../....', '+': '...../..#../..#../#####/..#../..#../.....', '/': '....#/....#/...#./..#../.#.../#..../#....', '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
  x: '...../...../#...#/.#.#./..#../.#.#./#...#', '>': '#.../.#../..#./...#/..#./.#../#...', '<': '...#/..#./.#../#.../.#../..#./...#', '(': '.#/#./#./#./#./#./.#', ')': '#./.#/.#/.#/.#/.#/#.',
  "'": '#/#/././././.', '=': '..../..../####/..../####/..../....', '*': '...../#.#.#/.###./#####/.###./#.#.#/.....', '&': '.##../#..#./#..#./.##../#.#.#/#..#./.##.#',
}
export const G3 = {
  A: '.#./#.#/###/#.#/#.#', B: '##./#.#/##./#.#/##.', C: '.##/#../#../#../.##', D: '##./#.#/#.#/#.#/##.', E: '###/#../##./#../###', F: '###/#../##./#../#..', G: '.##/#../#.#/#.#/.##', H: '#.#/#.#/###/#.#/#.#',
  I: '#/#/#/#/#', J: '..#/..#/..#/#.#/.#.', K: '#.#/#.#/##./#.#/#.#', L: '#../#../#../#../###', M: '#...#/##.##/#.#.#/#...#/#...#', N: '#..#/##.#/#.##/#..#/#..#', O: '.#./#.#/#.#/#.#/.#.', P: '##./#.#/##./#../#..',
  Q: '.#./#.#/#.#/.#./..#', R: '##./#.#/##./#.#/#.#', S: '.##/#../.#./..#/##.', T: '###/.#./.#./.#./.#.', U: '#.#/#.#/#.#/#.#/###', V: '#.#/#.#/#.#/#.#/.#.', W: '#...#/#...#/#.#.#/##.##/#...#', X: '#.#/#.#/.#./#.#/#.#',
  Y: '#.#/#.#/.#./.#./.#.', Z: '###/..#/.#./#../###', 0: '###/#.#/#.#/#.#/###', 1: '.#/##/.#/.#/.#', 2: '##./..#/.#./#../###', 3: '##./..#/.#./..#/##.', 4: '#.#/#.#/###/..#/..#', 5: '###/#../##./..#/##.',
  6: '.##/#../###/#.#/###', 7: '###/..#/.#./.#./.#.', 8: '###/#.#/###/#.#/###', 9: '###/#.#/###/..#/##.', ' ': '../../../../..', '!': '#/#/#/./#', '+': '.../.#./###/.#./...', '-': '.../.../###/.../...', x: '.../#.#/.#./#.#/...',
  '.': './././././#'.slice(0, 9), ':': './#/./#/.', '/': '..#/..#/.#./#../#..', '%': '#.#/..#/.#./#../#.#', "'": '#/#/././.', '&': '.#./#.#/.#./#.#/.##', '?': '##./..#/.#./.../.#.',
  '>': '#../.#./..#/.#./#..', '<': '..#/.#./#../.#./..#', '(': '.#/#./#./#./.#', ')': '#./.#/.#/.#/#.', '=': '.../###/.../###/...', '*': '.../#.#/.#./#.#/...',
}
export const ALTURA = { reino: 7, mini: 5 }
/** Quanto um glifo novo pode subir acima do topo e descer abaixo da linha de base (px). É a folga das folhas de letra nova. */
export const FOLGA = 2

// ------------------------------------------------------------------ montagem: acento + corpo
/** Corpo embaixo (na linha de base), `vao` linhas de folga, acento em cima (centrado). Devolve { l: linhas, c: quantas ficam acima do topo }. */
function sobre(alt, corpo, acento, vao = 1) {
  const b = corpo.split('/'), a = acento.split('/'), w = b[0].length, aw = a[0].length, e = (w - aw) >> 1
  if (aw > w) throw new Error('acento mais largo que a letra: ' + acento + ' em ' + corpo)
  const l = [...a.map((r) => '.'.repeat(e) + r + '.'.repeat(w - aw - e)), ...Array(vao).fill('.'.repeat(w)), ...b]
  return { l, c: l.length - alt }
}
const cru = (linhas, c = 0) => ({ l: linhas.split('/'), c })

// ---- reino 5×7
// corpos de 6 linhas (para o acento de 2 linhas caber com folga)
const R6 = {
  A: '.###./#...#/#...#/#####/#...#/#...#', E: '####/#.../###./#.../#.../####', I: '###/.#./.#./.#./.#./###', O: '.###./#...#/#...#/#...#/#...#/.###.',
  U: '#...#/#...#/#...#/#...#/#...#/.###.', N: '#...#/##..#/#.#.#/#.#.#/#..##/#...#', Y: '#...#/#...#/.#.#./..#../..#../..#..', G: '.####/#..../#..##/#...#/#...#/.####',
  И: '#...#/#..##/#.#.#/#.#.#/##..#/#...#',
}
// acentos por largura da letra (5, 4, 3)
const AR = {
  agudo: { 5: '...#./..#..', 4: '..#./.#..', 3: '..#/.#.' }, grave: { 5: '.#.../..#..', 4: '.#../..#.', 3: '#../.#.' }, circ: { 5: '..#../.#.#.', 4: '.#../#.#.', 3: '.#./#.#' },
  til: { 5: '.##.#/#..#.' }, braquia: { 5: '.#.#./..#..' }, trema: { 5: '.#.#.', 4: '#.#.', 3: '#.#' }, ponto: { 3: '.#.' },
}
const r2 = (letra, acento) => { const corpo = R6[letra]; return sobre(7, corpo, AR[acento][corpo.split('/')[0].length]) }
const r1 = (letra, acento) => { const corpo = G5[letra]; return sobre(7, corpo, AR[acento][corpo.split('/')[0].length]) }
const CEDILHA5 = '/..#../.#...'
const REINO = {
  Á: r2('A', 'agudo'), À: r2('A', 'grave'), Â: r2('A', 'circ'), Ã: r2('A', 'til'), Ä: r1('A', 'trema'), Å: cru('..#../.#.#./..#../.###./#...#/#####/#...#/#...#/#...#', 2),
  É: r2('E', 'agudo'), È: r2('E', 'grave'), Ê: r2('E', 'circ'), Ë: r1('E', 'trema'), Í: r2('I', 'agudo'), Ì: r2('I', 'grave'), Î: r2('I', 'circ'), Ï: r1('I', 'trema'), İ: r1('I', 'ponto'),
  Ó: r2('O', 'agudo'), Ò: r2('O', 'grave'), Ô: r2('O', 'circ'), Õ: r2('O', 'til'), Ö: r1('O', 'trema'), Ú: r2('U', 'agudo'), Ù: r2('U', 'grave'), Û: r2('U', 'circ'), Ü: r1('U', 'trema'),
  Ñ: r2('N', 'til'), Ý: r2('Y', 'agudo'), Ÿ: r1('Y', 'trema'), Ğ: r2('G', 'braquia'), Ç: cru(G5.C + CEDILHA5), Ş: cru(G5.S + CEDILHA5),
  Æ: cru('.#####/#.#.../#.#.../#####./#.#.../#.#.../#.####'), Œ: cru('.######/#..#.../#..#.../#..###./#..#.../#..#.../.######'),
  // sinais
  '¡': cru('#/./#/#/#/#/#'), '¿': cru('..#../...../..#../.#.../#..../#...#/.###.'), '«': cru('...../..#.#/.#.#./#.#../.#.#./..#.#/.....'), '»': cru('...../#.#../.#.#./..#.#/.#.#./#.#../.....'),
  '‹': cru('.../..#/.#./#../.#./..#/...'), '›': cru('.../#../.#./..#/.#./#../...'), '"': cru('#.#/#.#/.../.../.../.../...'), '„': cru('.../.../.../.../.../#.#/#.#'),
  '—': cru('....../....../....../######/....../....../......'), '…': cru('...../...../...../...../...../#.#.#/#.#.#'), '·': cru('./././#/#/./.'), '•': cru('.../.../.#./###/.#./.../...'),
  '°': cru('.#./#.#/.#./.../.../.../...'), º: cru('.#./#.#/.#./.../###/.../...'), ª: cru('.##/#.#/.##/.../###/.../...'), ';': cru('../../.#/../../.#/#.'),
  '#': cru('.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.'), _: cru('..../..../..../..../..../..../####'), '[': cru('##/#./#./#./#./#./##'), ']': cru('##/.#/.#/.#/.#/.#/##'), '|': cru('#/#/#/#/#/#/#'),
  '№': cru('#..#..../##.#.##./#.##.#.#/#..#.#.#/#..#.##./#..#..../#..#.###'),
  // cirílico (as letras de forma igual à do latim usam o glifo do latim: ver APELIDO)
  Б: cru('#####/#..../#..../####./#...#/#...#/####.'), Г: cru('####/#.../#.../#.../#.../#.../#...'), Д: cru('..###./.#..#./.#..#./.#..#./.#..#./######/#....#'), Ё: r1('E', 'trema'),
  Ж: cru('#.#.#/#.#.#/.###./..#../.###./#.#.#/#.#.#'), З: cru('.###./#...#/....#/..##./....#/#...#/.###.'), И: cru('#...#/#...#/#..##/#.#.#/##..#/#...#/#...#'), Й: r2('И', 'braquia'),
  Л: cru('..###/.#..#/.#..#/.#..#/.#..#/.#..#/#...#'), П: cru('#####/#...#/#...#/#...#/#...#/#...#/#...#'), У: cru('#...#/#...#/#...#/.####/....#/#...#/.###.'), Ф: cru('..#../.###./#.#.#/#.#.#/#.#.#/.###./..#..'),
  Ц: cru('#..#./#..#./#..#./#..#./#..#./#####/....#'), Ч: cru('#...#/#...#/#...#/.####/....#/....#/....#'), Ш: cru('#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#####'), Щ: cru('#.#.#./#.#.#./#.#.#./#.#.#./#.#.#./######/.....#'),
  Ъ: cru('##.../.#.../.#.../.###./.#..#/.#..#/.###.'), Ы: cru('#....#/#....#/#....#/###..#/#..#.#/#..#.#/###..#'), Ь: cru('#..../#..../#..../####./#...#/#...#/####.'), Э: cru('.###./#...#/....#/.####/....#/#...#/.###.'),
  Ю: cru('#..##./#.#..#/#.#..#/###..#/#.#..#/#.#..#/#..##.'), Я: cru('.####/#...#/#...#/.####/..#.#/.#..#/#...#'),
}

// ---- mini 3×5
const M4 = { A: '.#./#.#/###/#.#', E: '###/##./#../###', I: '.#./.#./.#./.#.', O: '.#./#.#/#.#/.#.', U: '#.#/#.#/#.#/###', G: '.##/#../#.#/.##' }
const AM = { agudo: '..#/.#.', grave: '#../.#.', circ: '.#./#.#', til: '###', trema: '#.#', braquia: '#.#/.#.' }
const m2 = (letra, acento) => sobre(5, G3[letra], AM[acento], 0) // encostado
const m1 = (letra, acento) => sobre(5, G3[letra], AM[acento], 1) // com folga
const m4 = (letra, acento) => sobre(5, M4[letra], AM[acento], 1) // corpo de 4 linhas
const CEDILHA3 = '/.#./#..'
const MINI = {
  Á: m2('A', 'agudo'), À: m2('A', 'grave'), Â: m4('A', 'circ'), Ã: m1('A', 'til'), Ä: m1('A', 'trema'), Å: cru('.#./#.#/.#./#.#/###/#.#/#.#', 2),
  É: m2('E', 'agudo'), È: m2('E', 'grave'), Ê: m4('E', 'circ'), Ë: m1('E', 'trema'),
  Í: cru('.#/#./#./#./#./#./#.', 2), Ì: cru('#./.#/.#/.#/.#/.#/.#', 2), Î: m4('I', 'circ'), Ï: cru('#.#/.../.#./.#./.#./.#./.#.', 2), İ: cru('#/./#/#/#/#/#', 2),
  Ó: m2('O', 'agudo'), Ò: m2('O', 'grave'), Ô: m4('O', 'circ'), Õ: m1('O', 'til'), Ö: m1('O', 'trema'), Ú: m2('U', 'agudo'), Ù: m2('U', 'grave'), Û: m4('U', 'circ'), Ü: m1('U', 'trema'),
  Ñ: cru('####/..../#..#/##.#/#.##/#..#/#..#', 2), Ý: m2('Y', 'agudo'), Ÿ: m1('Y', 'trema'), Ğ: m4('G', 'braquia'), Ç: cru(G3.C + CEDILHA3), Ş: cru(G3.S + CEDILHA3),
  Æ: cru('.####/#.#../####./#.#../#.###'), Œ: cru('.####/#.#../#.##./#.#../.####'),
  '¡': cru('#/./#/#/#'), '¿': cru('.#./.../.#./#../.##'), '«': cru('..../.#.#/#.#./.#.#/....'), '»': cru('..../#.#./.#.#/#.#./....'), '‹': cru('../.#/#./.#/..'), '›': cru('../#./.#/#./..'),
  '"': cru('#.#/#.#/.../.../...'), '„': cru('.../.../.../#.#/#.#'), '—': cru('..../..../####/..../....'), '…': cru('...../...../...../...../#.#.#'), '·': cru('././#/./.'), '•': cru('../##/##/../..'),
  '°': cru('.#./#.#/.#./.../...'), º: cru('.#./#.#/.#./.../###'), ª: cru('.##/#.#/.##/.../###'), ';': cru('../.#/../.#/#.'),
  '#': cru('.#.#./#####/.#.#./#####/.#.#.'), _: cru('.../.../.../.../###'), '[': cru('##/#./#./#./##'), ']': cru('##/.#/.#/.#/##'), '|': cru('#/#/#/#/#'), '№': cru('#..#.##/##.#.##/#.##.../#..#.##/#..#...'),
  Б: cru('###/#../##./#.#/##.'), Г: cru('###/#../#../#../#..'), Д: cru('.##../.#.#./.#.#./#####/#...#'), Ё: m1('E', 'trema'), Ж: cru('#.#.#/#.#.#/.###./#.#.#/#.#.#'),
  И: cru('#..#/#..#/#.##/##.#/#..#'), Й: cru('#..#/.##./..../#..#/#.##/##.#/#..#', 2), Л: cru('.###/.#.#/.#.#/.#.#/#..#'), П: cru('###/#.#/#.#/#.#/#.#'), У: cru('#.#/#.#/.##/..#/##.'), Ф: cru('..#../.###./#.#.#/.###./..#..'),
  Ц: cru('#.#./#.#./#.#./####/...#'), Ч: cru('#.#/#.#/.##/..#/..#'), Ш: cru('#.#.#/#.#.#/#.#.#/#.#.#/#####'), Щ: cru('#.#.#./#.#.#./#.#.#./######/.....#'),
  Ъ: cru('##../.#../.##./.#.#/.##.'), Ы: cru('#...#/#...#/##..#/#.#.#/##..#'), Ь: cru('#../#../##./#.#/##.'), Э: cru('##./..#/.##/..#/##.'), Ю: cru('#..#./#.#.#/###.#/#.#.#/#..#.'), Я: cru('.##/#.#/.##/#.#/#.#'),
}
/** As letras novas de cada tamanho: letra → { l: [linhas], c: linhas acima do topo }. O que passa da altura da fonte fica abaixo da linha de base. */
export const NOVAS = { reino: REINO, mini: MINI }

// ------------------------------------------------------------------ apelidos: letras de forma igual usam o glifo que já existe (o do atlas)
const APELIDO = {
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', // cirílico de mesma forma
  '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '‑': '-', '−': '-', '×': 'x', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ',
}
const APELIDO_MINI = { З: '3' } // no 3×5 o З e o 3 são o mesmo desenho
export const apelido = (ch, tamanho) => (tamanho === 'mini' && APELIDO_MINI[ch]) || APELIDO[ch] || null

/** Tamanho ("reino" ou "mini") de uma fonte do jogo pelo nome (reino-ouro → reino; mini-contorno → mini; dano-g → reino). */
export const tamanhoDe = (fonte) => (String(fonte).startsWith('mini') ? 'mini' : 'reino')

/** A lista oficial das letras novas (o teste exige glifo de cada uma nos dois tamanhos). */
export const LISTA = {
  latim: [...'ÁÀÂÃÄÅÇÉÈÊËÍÌÎÏÑÓÒÔÕÖÚÙÛÜÝŸŒÆĞŞİ'],
  sinais: [...'¿¡«»‹›ºª°"“”‘’„—–…·•×;#_[]|№'],
  cirilico: [...'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'],
}

// ------------------------------------------------------------------ maiúscula certa de cada idioma
const ASCII = /^[\x00-\x7f]*$/
const I_COM_PONTO = /^(tr|az|lt)\b/i
/** Maiúscula do idioma (turco: i→İ, ı→I; alemão: ß→SS). Sem idioma, usa `Letras.idioma`. Junta letra + acento solto (NFC). */
export function maiuscula(texto, idioma = Letras.idioma) {
  let s = String(texto)
  if (ASCII.test(s) && !I_COM_PONTO.test(idioma || '')) return s.toUpperCase()
  s = s.normalize('NFC')
  try { s = s.toLocaleUpperCase(idioma || 'en') } catch { s = s.toUpperCase() }
  return s.includes('ẞ') ? s.replace(/ẞ/g, 'SS') : s
}

/** A letra (já maiúscula) tem desenho em pixel neste tamanho? (pelas tabelas daqui: base, novas e apelidos) */
export function temGlifo(ch, tamanho = 'reino') {
  const base = tamanho === 'mini' ? G3 : G5
  if (base[ch] || base[ch.toLowerCase()] || NOVAS[tamanho][ch]) return true
  if (ch === ',') return true // no mini a vírgula é o ponto com rabinho
  const a = apelido(ch, tamanho)
  return a ? temGlifo(a, tamanho) : false
}
/** As letras de `texto` (no idioma dado) que NÃO têm desenho em pixel no tamanho da fonte. Lista vazia = sai tudo em pixel. */
export function semGlifo(texto, fonte = 'reino', idioma = Letras.idioma) {
  const t = tamanhoDe(fonte), fora = []
  for (const ch of maiuscula(texto, idioma)) if (!temGlifo(ch, t) && !fora.includes(ch)) fora.push(ch)
  return fora
}

// ------------------------------------------------------------------ registros (consultáveis, sem barulho no console)
const TETO = 400
const FALTAS = new Map(), ESTOUROS = new Map()
function anotar(mapa, chave, dado) {
  const ja = mapa.get(chave)
  if (ja) { ja.vezes++; return ja }
  if (mapa.size >= TETO) mapa.delete(mapa.keys().next().value)
  const novo = { ...dado, idioma: Letras.idioma, vezes: 1 }; mapa.set(chave, novo); return novo
}
export const Letras = {
  /** Idioma atual do jogo (código curto: en, pt, es, fr, de, it, tr, id, fil, ru, vi, th). Quem troca o idioma escreve aqui. */
  idioma: 'en',
  /** Frases que foram para a letra do aparelho por terem letra sem desenho: [{ texto, fonte, letras, idioma, vezes }]. */
  faltas: () => [...FALTAS.values()].map((f) => ({ ...f, letras: [...f.letras] })),
  /** Textos que não couberam e o que foi feito: [{ texto, largura, fonte, feito: 'menor' | 'reticencias' | 'hifen', idioma, vezes }]. */
  estouros: () => [...ESTOUROS.values()].map((e) => ({ ...e })),
  limpar() { FALTAS.clear(); ESTOUROS.clear() },
  registrarFalta: (texto, fonte, letras) => anotar(FALTAS, fonte + '\n' + texto, { texto, fonte, letras }),
  registrarEstouro: (texto, largura, fonte, feito) => anotar(ESTOUROS, [fonte, largura, feito, texto].join('\n'), { texto, largura, fonte, feito }),
}

// ------------------------------------------------------------------ quebrar em linhas e caber
/** Quebra `texto` em linhas de até `largura`, medindo com `medir(trecho)`. Quebra no espaço comum (o espaço que não quebra fica junto);
 *  palavra maior que a caixa é cortada com hífen (e anotada em `Letras.estouros()`). Com texto que cabe, dá o MESMO resultado da quebra antiga. */
export function quebrarCom(medir, texto, largura, fonte = '') {
  const out = []; let lin = ''
  for (let pal of String(texto).split(' ')) {
    const junto = lin ? lin + ' ' + pal : pal
    if (medir(junto) <= largura) { lin = junto; continue }
    if (lin) { out.push(lin); lin = '' }
    let cortou = false
    while (medir(pal) > largura) {
      const letras = [...pal]; if (letras.length < 2) break
      let n = letras.length - 1
      while (n > 1 && medir(letras.slice(0, n).join('') + '-') > largura) n--
      if (n === letras.length - 1 && n > 2 && medir(letras.slice(0, n - 1).join('') + '-') <= largura) n-- // não deixa 1 letra sozinha na linha de baixo
      out.push(letras.slice(0, n).join('') + '-'); pal = letras.slice(n).join(''); cortou = true
    }
    if (cortou) Letras.registrarEstouro(String(texto), largura, fonte, 'hifen')
    lin = pal
  }
  if (lin) out.push(lin)
  return out
}
/** Faz `texto` caber em UMA linha de `largura`: tenta cada fonte de `fontes` na ordem (a grande, depois a pequena) e, se nenhuma der,
 *  corta com reticências na última. Devolve { texto, fonte, largura, feito: 'coube' | 'menor' | 'reticencias' } e anota o que não coube. */
export function caberCom(medir, texto, largura, fontes) {
  const s = String(texto)
  for (let i = 0; i < fontes.length; i++) {
    const w = medir(s, fontes[i])
    if (w <= largura) { if (i) Letras.registrarEstouro(s, largura, fontes[0], 'menor'); return { texto: s, fonte: fontes[i], largura: w, feito: i ? 'menor' : 'coube' } }
  }
  const f = fontes[fontes.length - 1], letras = [...s]
  let n = letras.length - 1, corte = '...'
  for (; n > 0; n--) { corte = letras.slice(0, n).join('').trimEnd() + '...'; if (medir(corte, f) <= largura) break }
  if (n <= 0) corte = '...'
  Letras.registrarEstouro(s, largura, fontes[0], 'reticencias')
  return { texto: corte, fonte: f, largura: medir(corte, f), feito: 'reticencias' }
}
