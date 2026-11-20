// Keepmile — o cartão do reino para postar: um PNG com o reino final DE DIA, o título e o desafio "BEAT MY N ROUNDS", feito no
// aparelho (nada sai dele sozinho). Compartilhar: a folha do sistema com o arquivo quando o aparelho tem; senão baixa o PNG e copia
// o link da MESMA estrada (`?semente=`).
import * as Arte from './arte.js'
import { T } from './textos.js'

/** Desenha o mundo limpo (sem interface), DE DIA, e monta o cartão: em cima o logo e o desafio lido de uma vez ("BEAT MY 9 ROUNDS",
 *  as duas partes juntas); embaixo os pontos e o ENDEREÇO escrito (com a estrada e as rodadas a bater). Devolve um canvas; `info`
 *  diz o que foi escrito (para o teste). */
export function cartaoDoReino(C, { rodadas, pontos, recorde, titulo, url = '' }) {
  const antes = C.depoisDoMundo, d = C.destaque, hora = C.hora, noite = C.noite, mix = C.mix, horaDe = C.horaDe, zona = C.zonaTitulo
  C.depoisDoMundo = null; C.destaque = null; C.noite = 0; C.zonaTitulo = null
  if (hora === 'boss-night') { C.hora = 'afternoon'; C.mix = 1 }
  const horaDoCartao = C.hora
  C.desenhar(performance.now(), 0, 0) // um quadro só do reino
  C.depoisDoMundo = antes; C.destaque = d; C.hora = hora; C.noite = noite; C.mix = mix; C.horaDe = horaDe; C.zonaTitulo = zona
  const cel = C.tipo === 'celular', e = C.e, COR = Arte.COR
  const rec = cel ? { x: Math.max(0, C.ox), y: Math.max(0, C.oy + 30), w: Math.min(180, C.VW), h: 240 } : { x: Math.max(0, C.ox - 40), y: Math.max(0, C.oy + 34), w: Math.min(560, C.VW), h: 150 }
  const a = T.desafioA, b = T.desafioB(rodadas), umaLinha = !cel && Arte.largura(`${a} ${b}`, 'reino-ouro') * 2 <= rec.w - 90
  const topo = umaLinha ? 30 : 66, pe = cel ? 34 : 24, k = 2, c = document.createElement('canvas'), W = rec.w, H = topo + rec.h + pe
  c.width = W * k; c.height = H * k
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false
  g.drawImage(C.g.canvas, rec.x * e, rec.y * e, rec.w * e, rec.h * e, 0, topo * k, rec.w * k, rec.h * k)
  g.setTransform(k, 0, 0, k, 0, 0)
  // cabeçalho: logo + o desafio (as duas partes coladas, a segunda maior e em ouro)
  g.fillStyle = COR.painel; g.fillRect(0, 0, W, topo); g.fillStyle = COR.filete; g.fillRect(0, topo - 3, W, 1); g.fillStyle = COR.ouro; g.fillRect(0, topo - 2, W, 1); g.fillStyle = COR.ameixa; g.fillRect(0, topo - 1, W, 1)
  const linhas = []
  if (umaLinha) {
    if (!Arte.logo(g, 'small', 8 + 32, 8)) Arte.texto(g, titulo, 8, 10, { fonte: 'reino-contorno' })
    const wa = Arte.largura(a + ' ', 'reino-contorno') * 2, wb = Arte.largura(b, 'reino-ouro') * 2, x0 = W - 10 - wa - wb
    Arte.titulo(g, a, x0 + wa / 2 - 6, 6, 2); Arte.titulo(g, b, x0 + wa + wb / 2, 6, 2, true)
    linhas.push({ texto: a, y: 6, h: 18 }, { texto: b, y: 6, h: 18 })
  } else {
    if (!Arte.logo(g, 'small', W >> 1, 4)) Arte.texto(g, titulo, W >> 1, 6, { fonte: 'reino-contorno', alinhar: 'centro' })
    const kb = Arte.largura(b, 'reino-ouro') * 3 <= W - 8 ? 3 : 2
    Arte.titulo(g, a, W >> 1, 20, 2); Arte.titulo(g, b, W >> 1, 37, kb, true)
    linhas.push({ texto: a, y: 20, h: 18 }, { texto: b, y: 37, h: 9 * kb })
  }
  // rodapé: pontos e o endereço escrito (letra de verdade: o endereço diferencia maiúscula de minúscula)
  const y0 = topo + rec.h
  g.fillStyle = COR.ameixa; g.fillRect(0, y0, W, 1); g.fillStyle = COR.ouro; g.fillRect(0, y0 + 1, W, 1); g.fillStyle = COR.painel; g.fillRect(0, y0 + 2, W, pe - 2)
  const pontosTxt = `${T.pontos} ${pontos}${recorde ? ' - ' + T.recorde : ''}`
  Arte.texto(g, pontosTxt, 6, y0 + 6, { fonte: Arte.temFonte('mini-ouro') && recorde ? 'mini-ouro' : 'mini-contorno' })
  const endereco = String(url).replace(/^https?:\/\//, ''), partes = []
  if (endereco) {
    g.font = '5.5px ui-monospace, Menlo, Consolas, monospace'; g.textBaseline = 'top'
    const cabe = (t) => g.measureText(t).width <= W - 12
    if (cel || !cabe(endereco)) { const q = endereco.indexOf('?'); if (q > 0 && !cabe(endereco)) partes.push(endereco.slice(0, q), endereco.slice(q)); else partes.push(endereco) } else partes.push(endereco)
    g.fillStyle = COR.creme
    if (cel) partes.forEach((t, i) => g.fillText(t, 6, y0 + 15 + i * 8, W - 12)); else { g.textAlign = 'right'; partes.forEach((t, i) => g.fillText(t, W - 6, y0 + (partes.length > 1 ? 4 : 8) + i * 8, W - 150)); g.textAlign = 'left' }
  }
  g.strokeStyle = COR.ameixa; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2)
  c.info = { desafio: `${a} ${b}`, linhas, umaLinha, pontos: pontosTxt, endereco: partes.join(''), hora: horaDoCartao, w: c.width, h: c.height }
  return c
}

/** Baixa o cartão como PNG (1 toque). */
export function baixarCartao(b, nome = 'keepmile-kingdom.png') {
  const a = document.createElement('a'), url = URL.createObjectURL(b)
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
/** Link da mesma estrada: a página atual só com `?semente=` e, se houver, `&rodadas=` (quantas o amigo tem de bater). */
export function linkDaEstrada(semente, rodadas = null) { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('semente', semente); if (rodadas != null) u.searchParams.set('rodadas', String(rodadas)); return u.href }

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
