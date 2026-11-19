// Keepmile — o cartão do reino para postar: um PNG com o reino final e o recorde, feito no aparelho (nada sai dele sozinho).
import * as Arte from './arte.js'

/** Desenha o mundo limpo (sem interface) e monta o cartão. Devolve um canvas. */
export function cartaoDoReino(C, { rodadas, pontos, recorde, titulo }) {
  const antes = C.depoisDoMundo, d = C.destaque
  C.depoisDoMundo = null; C.destaque = null
  C.desenhar(performance.now(), 0, 0) // um quadro só do reino
  C.depoisDoMundo = antes; C.destaque = d
  const cel = C.tipo === 'celular', e = C.e
  const rec = cel ? { x: Math.max(0, C.ox), y: Math.max(0, C.oy + 14), w: Math.min(180, C.VW), h: 268 } : { x: Math.max(0, C.ox - 40), y: Math.max(0, C.oy + 34), w: Math.min(560, C.VW), h: 200 }
  const topo = 34, k = 2, c = document.createElement('canvas')
  c.width = rec.w * k; c.height = (rec.h + topo) * k
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false
  g.drawImage(C.g.canvas, rec.x * e, rec.y * e, rec.w * e, rec.h * e, 0, topo * k, rec.w * k, rec.h * k)
  g.setTransform(k, 0, 0, k, 0, 0)
  g.fillStyle = Arte.COR.painel; g.fillRect(0, 0, rec.w, topo); g.fillStyle = Arte.COR.filete; g.fillRect(0, topo - 2, rec.w, 1); g.fillStyle = Arte.COR.ameixa; g.fillRect(0, topo - 1, rec.w, 1)
  Arte.texto(g, titulo, 6, 5, { fonte: 'reino-contorno' })
  Arte.texto(g, `SCORE ${pontos}`, 6, 19, { fonte: 'mini', cor: Arte.COR.creme })
  const s = `${rodadas} ROUND${rodadas === 1 ? '' : 'S'}`
  Arte.titulo(g, s, rec.w - 6 - Arte.largura(s, 'reino-ouro'), 4, 2, true)
  if (recorde) Arte.texto(g, 'NEW RECORD!', rec.w - 6, 24, { fonte: 'mini', cor: Arte.COR.ouro, alinhar: 'direita' })
  g.strokeStyle = Arte.COR.ameixa; g.lineWidth = 2; g.strokeRect(1, 1, rec.w - 2, rec.h + topo - 2)
  return c
}

/** Baixa o cartão como PNG (1 toque). */
export function baixarCartao(c, nome = 'keepmile-kingdom.png') {
  c.toBlob((b) => {
    if (!b) return
    const a = document.createElement('a'), url = URL.createObjectURL(b)
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }, 'image/png')
}
