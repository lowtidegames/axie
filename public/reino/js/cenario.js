// Keepmile — OS 4 TRECHOS DA ESTRADA (direção de arte da cena). A partida anda e o cenário muda, sempre no ciclo de 5 rodadas:
//   0 campos de manhã (rodadas 1–2) · 1 vila à tarde (3) · 2 portões ao pôr do sol (4) · 3 noite de chefe (5).
// Usa os planos pintados do atlas (3 horas) e, por código: cores ACALMADAS para as tropas saltarem, luz do trecho, e vida
// (névoa e folhas, fumaça de chaminé, flâmulas e tochas, estrelas). Só enfeite: nada aqui conta regra nem partícula da luta.
import * as Arte from './arte.js'
import * as Px from './particulas.js'

export const TRECHOS = ['campos', 'vila', 'portoes', 'noite']
const CALMA = { // por plano: saturação, névoa (cor, quanto), valor. O fundo é o mais apagado; o chão segura um pouco de cor.
  far: { sat: 0.72, qNev: 0.18 }, mid: { sat: 0.76, qNev: 0.1 }, ground: { sat: 0.8, val: 0.97, qNev: 0.04 }, verge: { sat: 0.76, val: 0.92 }, front: { sat: 0.7, val: 0.8 }, sky: { sat: 0.94 },
}
const DEF = [
  { id: 'campos', hora: 'morning', nev: '#DDEBF0', mult: null, tinta: null, sombra: { alfa: 0.24, dx: 2, estica: 1 }, vinheta: 0.14 },
  { id: 'vila', hora: 'afternoon', nev: '#F4DCC0', mult: '#FFF8EC', tinta: null, sombra: { alfa: 0.28, dx: 5, estica: 1.5 }, vinheta: 0.18 },
  { id: 'portoes', hora: 'afternoon', nev: '#E8A8A0', mult: '#F6BEB0', multCeu: '#F0A8C0', tinta: '#FFD8C2', sombra: { alfa: 0.34, dx: 9, estica: 2.3 }, vinheta: 0.24 },
  { id: 'noite', hora: 'boss-night', nev: '#3A3C7C', mult: null, tinta: '#969CD8', sombra: { alfa: 0.38, dx: -3, estica: 1.2 }, vinheta: 0.3 },
]
const CHAMINES = { pc: [[128, 41], [261, 33], [378, 33], [511, 41]], celular: [[28, 41], [161, 33]] } // topo dos telhados no plano do meio

export function criarCenario(C) {
  const S = { feitos: new Map(), n: { folhas: 0, fumacas: 0, tochas: 0, flamulas: 0, estrelas: 0, nevoa: 0, raios: 0 } }
  const g = C.g
  let raios = {}, nevoas = {}, clar = null, chama = null, flam = null

  /** Planos, nuvens e luz de um trecho (folha própria, acalmada e tingida; feita uma vez por formato de tela). */
  S.cen = (trecho) => {
    const k = C.tipo + trecho
    if (S.feitos.has(k)) return S.feitos.get(k)
    const d = DEF[trecho], base = Arte.cenario(C.tipo, d.hora), copias = new Map()
    const copia = (src) => { if (!copias.has(src)) { const c = Px.tela(src.width, src.height), cg = c.getContext('2d', { willReadFrequently: true }); cg.drawImage(src, 0, 0); copias.set(src, [c, cg]) } return copias.get(src) }
    const planos = base.planos.map((p) => {
      const [img, cg] = copia(p.img), c = CALMA[p.nome] || {}, [x, y, w, h] = p.quadro
      Px.graduar(cg, x, y, w, h, { sat: c.sat ?? 1, val: c.val ?? 1, nev: d.nev, qNev: (c.qNev || 0) * (trecho === 3 ? 0.5 : 1), mult: p.nome === 'sky' ? d.multCeu || null : d.mult })
      return { ...p, img }
    })
    let nuvemImg = base.nuvemImg
    if (nuvemImg && d.mult) { const [img, cg] = copia(nuvemImg); for (const q of base.nuvens || []) Px.graduar(cg, q[0], q[1], q[2], q[3], { mult: d.multCeu || d.mult }); nuvemImg = img } else if (nuvemImg && copias.has(nuvemImg)) nuvemImg = copias.get(nuvemImg)[0]
    const cen = { id: d.id, trecho, planos, nuvens: base.nuvens || [], nuvemImg, luz: { ...base.luz, sombra: d.sombra, vinheta: d.vinheta }, tinta: d.tinta, codigo: !!base.codigo }
    S.feitos.set(k, cen); return cen
  }
  S.horaDe = (trecho) => DEF[trecho].hora
  S.limpar = () => { S.feitos.clear(); raios = {}; nevoas = {} }

  const noPlano = (cen, nome) => { const p = cen.planos.find((q) => q.nome === nome); return p ? { x: Math.round(C.ox + p.x - C.cam.x * p.paralaxe), y: C.oy + p.y, p } : null }

  /** Vida ATRÁS da estrada (depois dos planos, antes dos prédios e bonecos). `T` = relógio real (parado com Reduced motion). */
  S.vidaDeTras = (cen, alfa, T) => {
    const t = cen.trecho, n = S.n
    n.folhas = n.fumacas = n.estrelas = n.nevoa = 0
    g.globalAlpha = alfa
    if (t === 0) { // névoa baixa da manhã encostada no morro
      const m = noPlano(cen, 'mid'); if (m) { const w = 96, k = 'n' + w; if (!nevoas[k]) nevoas[k] = Px.nevoa(w, 14, '#FFFFFF'); const y = m.y + m.p.quadro[3] - 16, dx = Math.round(T * 0.004) % w; g.globalAlpha = alfa * 0.5; for (let x = -w + dx - ((Math.round(C.cam.x * 0.3) % w) + w) % w; x < C.VW; x += w) g.drawImage(nevoas[k], x, y); g.globalAlpha = alfa; n.nevoa = 1 }
    }
    if (t === 1 || t === 2) { // fumaça de chaminé: bolinhas que sobem e engordam, levadas pelo vento (só conta de tempo, sem estado)
      const m = noPlano(cen, 'mid')
      if (m && !cen.codigo) {
        const qw = m.p.quadro[2], x0 = m.p.repete_x ? ((m.x % qw) + qw) % qw - qw : m.x
        for (const [cx, cy] of CHAMINES[C.tipo] || []) for (let bx = x0 + cx; bx < C.VW + 20; bx += qw) {
          if (bx >= -20) {
            g.fillStyle = '#2B1E3A'; g.fillRect(bx - 1, m.y + cy - 3, 3, 4); g.fillStyle = t === 2 ? '#B87868' : '#C89070'; g.fillRect(bx, m.y + cy - 2, 1, 3)
            for (let k = 0; k < 4; k++) {
              const f = ((T / 2600 + k / 4 + cx * 0.013) % 1), tam = f < 0.25 ? 2 : f < 0.7 ? 3 : 2, x = bx + Math.round(f * 9 + Math.sin(f * 5 + k) * 1.5), y = m.y + cy - 5 - Math.round(f * 20)
              if (f > 0.85 && (k & 1)) continue
              g.fillStyle = t === 2 ? '#E8C0C8' : '#F4ECE0'; g.globalAlpha = alfa * (f > 0.6 ? 0.55 : 0.85); g.fillRect(x, y, tam, tam); n.fumacas++
            }
            g.globalAlpha = alfa
          }
          if (!m.p.repete_x) break
        }
      }
    }
    if (t === 3) { // estrelas que piscam devagar (nunca um clarão: 1 px, uma de cada vez)
      for (let k = 0; k < 7; k++) { const x = Math.round(Px.rnd(k + 1) * C.VW), y = C.oy + 4 + Math.round(Px.rnd(k + 20) * 46); if (y < 2) continue; const lig = C.menos ? 1 : Math.sin(T / 700 + k * 1.9) > -0.3; if (!lig) continue; g.fillStyle = '#FFF6E0'; g.fillRect(x, y, 1, 1); if (k % 3 === 0) { g.globalAlpha = alfa * 0.5; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); g.globalAlpha = alfa } n.estrelas++ }
    }
    g.globalAlpha = 1
  }

  /** Enfeites de beira de estrada num patamar (antes dos bonecos dele): flâmulas do reino nos portões, tochas acesas no pôr do sol e à noite. */
  S.beira = (cen, tier, alfa, T, cx, ty) => {
    const t = cen.trecho, n = S.n
    if (tier === 0) n.tochas = n.flamulas = 0
    if (t < 2) return
    if (!chama) { chama = Px.chama(); clar = { quente: Px.clarao('#FFB45A', 20), frio: Px.clarao('#FFC878', 26) }; flam = Px.flamula('#4884E8', '#8CB4FF', '#2C4C9C') }
    const yT = C.tiers[tier], Tr = C.geo.terrenos
    g.globalAlpha = alfa
    for (let k = 0; k < 6; k++) {
      const tr = Tr[k]; if ((tr.estrada[0] + tr.estrada[1]) / 2 !== yT) continue
      const X = Math.round(C.ox + tr.x - tr.sentido * (tr.largura >> 1) - cx), Y = C.oy + tr.estrada[0] - 1 + ty
      if (X < -20 || X > C.VW + 20) continue
      if (t === 2 && k % 2 === 0) { Arte.desenhar(g, flam, flam.quadros[Arte.quadroDe(flam.anim.play, C.menos ? 0 : T + k * 130)], X, Y - 1); n.flamulas++; continue }
      // tocha: haste, chama em 4 quadros e clarão pontilhado no chão (a luz não escurece à noite)
      const cl = t === 3 ? clar.frio : clar.quente, r = cl.width >> 1, tre = C.menos ? 0 : Math.round(Math.sin(T / 140 + k * 2.1))
      g.globalAlpha = alfa * (t === 3 ? 0.3 : 0.16); g.drawImage(cl, X - r, Y - 9 - r + tre); g.globalAlpha = alfa
      g.fillStyle = '#2B1E3A'; g.fillRect(X - 1, Y - 10, 3, 11); g.fillStyle = '#96623C'; g.fillRect(X, Y - 9, 1, 9); g.fillStyle = '#CECAD8'; g.fillRect(X - 1, Y - 11, 3, 2)
      Arte.desenhar(g, chama, chama.quadros[Arte.quadroDe(chama.anim.play, C.menos ? 0 : T + k * 77)], X, Y - 11); n.tochas++
    }
    g.globalAlpha = 1
  }

  /** Vida e luz NA FRENTE de tudo (antes da vinheta): raios de sol, luz rasante, folhas no vento, vapor da noite. */
  S.vidaDaFrente = (cen, alfa, T) => {
    const t = cen.trecho, n = S.n, k = t + ':' + C.VW + 'x' + C.VH
    n.raios = 0
    if (t !== 3) {
      if (!raios[k]) raios[k] = t === 0 ? Px.raios(C.VW, C.VH, '#FFF8D2', { inclina: 0.5, faixas: 3, largura: 0.07, x0: -0.05, passo: 0.34 }) : t === 1 ? Px.raios(C.VW, C.VH, '#FFE0A0', { inclina: 0.9, faixas: 2, largura: 0.1, x0: -0.1, passo: 0.55 }) : Px.raios(C.VW, C.VH, '#FF9C78', { inclina: 1.6, faixas: 3, largura: 0.12, x0: -0.5, passo: 0.42 })
      g.globalAlpha = alfa * (t === 2 ? 0.13 : 0.1) * (C.emLuta ? 0.7 : 1); g.drawImage(raios[k], 0, 0); n.raios = 1
    }
    if (!C.menos && (t === 0 || t === 2)) { // folhas soltas no vento (5): enfeite, some na luta cheia para não disputar com as tropas
      const cor = t === 0 ? ['#7CC950', '#56A842', '#D8E86C'] : ['#E87E2E', '#CC3C3E', '#FFD248']
      g.globalAlpha = alfa * 0.9
      for (let i = 0; i < 5; i++) {
        const f = ((T / (5200 + i * 700) + i * 0.23) % 1), x = Math.round(-10 + f * (C.VW + 20) + Math.sin(f * 14 + i) * 6), y = Math.round(C.oy + 20 + i * 31 + f * 60 + Math.sin(f * 9 + i * 2) * 5)
        if (y > C.VH - 4) continue
        g.fillStyle = cor[i % 3]; g.fillRect(x, y, 2, 1); if (Math.sin(f * 40 + i) > 0) g.fillRect(x + 1, y - 1, 1, 1); else g.fillRect(x, y + 1, 1, 1); n.folhas++
      }
    }
    g.globalAlpha = 1
  }
  return S
}
