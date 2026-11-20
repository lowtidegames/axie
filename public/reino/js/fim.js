// Keepmile — o cartão do reino para postar: um PNG com o reino final DE DIA, o título e o desafio "BEAT MY N ROUNDS", feito no
// aparelho (nada sai dele sozinho). Compartilhar: a folha do sistema com o arquivo quando o aparelho tem; senão baixa o PNG e copia
// o link da MESMA estrada (`?semente=`).
import * as Arte from './arte.js'
import { T } from './textos.js'

/** Desenha o mundo limpo (sem interface), de dia, e monta o cartão. Devolve um canvas. */
export function cartaoDoReino(C, { rodadas, pontos, recorde, titulo }) {
  const antes = C.depoisDoMundo, d = C.destaque, hora = C.hora, noite = C.noite, mix = C.mix, horaDe = C.horaDe
  C.depoisDoMundo = null; C.destaque = null; C.noite = 0
  if (hora === 'boss-night') { C.hora = 'afternoon'; C.mix = 1 }
  C.desenhar(performance.now(), 0, 0) // um quadro só do reino
  C.depoisDoMundo = antes; C.destaque = d; C.hora = hora; C.noite = noite; C.mix = mix; C.horaDe = horaDe
  const cel = C.tipo === 'celular', e = C.e
  const rec = cel ? { x: Math.max(0, C.ox), y: Math.max(0, C.oy + 14), w: Math.min(180, C.VW), h: 262 } : { x: Math.max(0, C.ox - 40), y: Math.max(0, C.oy + 34), w: Math.min(560, C.VW), h: 150 }
  const topo = 40, k = 2, c = document.createElement('canvas')
  c.width = rec.w * k; c.height = (rec.h + topo) * k
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false
  g.drawImage(C.g.canvas, rec.x * e, rec.y * e, rec.w * e, rec.h * e, 0, topo * k, rec.w * k, rec.h * k)
  g.setTransform(k, 0, 0, k, 0, 0)
  g.fillStyle = Arte.COR.painel; g.fillRect(0, 0, rec.w, topo); g.fillStyle = Arte.COR.filete; g.fillRect(0, topo - 2, rec.w, 1); g.fillStyle = Arte.COR.ameixa; g.fillRect(0, topo - 1, rec.w, 1)
  if (!Arte.logo(g, 'small', 6 + 32, 5)) Arte.texto(g, titulo, 6, 6, { fonte: 'reino-contorno' })
  const s = T.desafioB(rodadas), ws = Arte.largura(s, 'reino-ouro') * 2
  Arte.titulo(g, s, rec.w - 6 - ws / 2, 4, 2, true)
  if (rec.w - 12 - ws - Arte.largura(T.desafioA, 'reino-contorno') > 74) Arte.texto(g, T.desafioA, rec.w - 12 - ws, 10, { fonte: 'reino-contorno', alinhar: 'direita' }); else Arte.texto(g, T.desafioA, 6, 24, { fonte: 'reino-contorno' })
  Arte.texto(g, `${T.pontos} ${pontos}${recorde ? ' - NEW RECORD!' : ''}`, rec.w - 6, 28, { fonte: 'mini', cor: recorde ? Arte.COR.ouro : Arte.COR.creme, alinhar: 'direita' })
  g.strokeStyle = Arte.COR.ameixa; g.lineWidth = 2; g.strokeRect(1, 1, rec.w - 2, rec.h + topo - 2)
  return c
}

/** Baixa o cartão como PNG (1 toque). */
export function baixarCartao(b, nome = 'keepmile-kingdom.png') {
  const a = document.createElement('a'), url = URL.createObjectURL(b)
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
/** Link da mesma estrada: a página atual só com `?semente=`. */
export function linkDaEstrada(semente) { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('semente', semente); return u.href }

/** Compartilha o cartão. Devolve 'sistema' (folha do aparelho), 'baixou+link' (PNG baixado e link copiado) ou 'baixou' (só o PNG). */
export async function compartilhar(c, { texto, url, nome = 'keepmile-kingdom.png' }) {
  const b = await new Promise((ok) => c.toBlob(ok, 'image/png'))
  if (!b) return 'falhou'
  try {
    const arq = new File([b], nome, { type: 'image/png' })
    if (navigator.canShare?.({ files: [arq] }) && navigator.share) { await navigator.share({ files: [arq], text: texto, url }); return 'sistema' }
  } catch (err) { if (err?.name === 'AbortError') return 'cancelou' /* outro erro: cai no download */ }
  baixarCartao(b, nome)
  let copiou = false
  try { if (navigator.clipboard) { await navigator.clipboard.writeText(texto); copiou = true } } catch { /* sem permissão: o PNG já baixou */ }
  return copiou ? 'baixou+link' : 'baixou'
}
