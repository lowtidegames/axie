// Frayz — EFEITOS: flocos de enchimento, fiapos, impacto em estrela de pano, costura estourando, brilho e poeira.
// Só desenho (nenhuma regra, nenhum número de jogo). Limites do guia de estilo, seção 9:
//   · no máximo 90 partículas ao mesmo tempo (20 no modo calmo, o "Menos animação");
//   · impacto é uma ESTRELA DE PANO com pesponto — nunca clarão, nunca tela branca; no máximo 3 por segundo;
//   · no modo calmo nada pula nem estoura: as marcas só aparecem e somem esmaecendo.
// Uso: const fx = criarEfeitos({ maxParticulas: 90 }); fx.enchimento(x, y, 16, { chao }); a cada quadro: fx.atualizar(dtMs); fx.desenhar(ctx)
// As posições são em px do canvas (o mesmo espaço em que os bonecos são desenhados). opcoes.escala ajusta o tamanho (1 = boneco de ~150 px).

const TAU = Math.PI * 2
const TINTA = '#140C1F', LINHO = '#F2E6C9', ENCHIMENTO = '#F6EEDC', OURO = '#FFC857'
const rnd = (a, b) => a + Math.random() * (b - a)
const limita = (v, a, b) => (v < a ? a : v > b ? b : v)

// ---------- bitmaps pequenos, desenhados uma vez
let FLOCOS = null
function flocos() {
  if (FLOCOS) return FLOCOS
  FLOCOS = []
  for (let v = 0; v < 4; v++) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 48
    const c = cv.getContext('2d'); c.translate(24, 24)
    const bolas = []
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + v * 0.7, d = 5 + ((i * 7 + v * 3) % 5); bolas.push([Math.cos(a) * d, Math.sin(a) * d * 0.85, 7.5 + ((i * 5 + v) % 4)]) }
    bolas.push([0, 0, 10])
    c.fillStyle = 'rgba(20,12,31,0.6)'; for (const [x, y, r] of bolas) { c.beginPath(); c.arc(x, y, r + 1.6, 0, TAU); c.fill() }
    c.fillStyle = '#CFC3A8'; for (const [x, y, r] of bolas) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill() }
    c.fillStyle = ENCHIMENTO; for (const [x, y, r] of bolas) { c.beginPath(); c.arc(x - 1.6, y - 1.9, r * 0.86, 0, TAU); c.fill() }
    c.fillStyle = 'rgba(255,255,255,0.75)'; for (const [x, y, r] of bolas.slice(0, 3)) { c.beginPath(); c.arc(x - 3, y - 3.4, r * 0.34, 0, TAU); c.fill() }
    FLOCOS.push(cv)
  }
  return FLOCOS
}
let NUVEM = null
function nuvem() {
  if (NUVEM) return NUVEM
  NUVEM = document.createElement('canvas'); NUVEM.width = NUVEM.height = 64
  const c = NUVEM.getContext('2d'), g = c.createRadialGradient(32, 32, 2, 32, 32, 31)
  g.addColorStop(0, 'rgba(226,214,190,0.5)'); g.addColorStop(0.6, 'rgba(226,214,190,0.2)'); g.addColorStop(1, 'rgba(226,214,190,0)')
  c.fillStyle = g; c.fillRect(0, 0, 64, 64)
  return NUVEM
}

/** Cria um conjunto de efeitos. */
export function criarEfeitos({ maxParticulas = 90 } = {}) {
  const P = [] // partículas e marcas (tudo conta para o teto)
  const impactos = [] // instantes (ms do relógio interno) das últimas estrelas, para o limite de 3 por segundo
  let calmo = false, relogio = 0, pico = 0
  const teto = () => (calmo ? Math.min(20, maxParticulas) : maxParticulas)
  const nova = (p) => { if (P.length >= teto()) return false; p.idade = 0; P.push(p); if (P.length > pico) pico = P.length; return true }

  const fx = {
    /** Flocos de enchimento que saltam, flutuam, giram e pousam no pano. opcoes: { chao (y onde pousam), escala, forca, direcao (rad) } */
    enchimento(x, y, n = 12, opcoes = {}) {
      const e = opcoes.escala ?? 1, f = opcoes.forca ?? 1
      for (let i = 0; i < n; i++) {
        const a = opcoes.direcao != null ? opcoes.direcao + rnd(-0.9, 0.9) : rnd(-Math.PI, 0) + rnd(-0.5, 0.5), v = rnd(110, 330) * e * f * (calmo ? 0.45 : 1)
        if (!nova({ k: 'floco', x: x + rnd(-6, 6) * e, y: y + rnd(-6, 6) * e, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * e, rot: rnd(0, TAU), vr: rnd(-7, 7), tam: rnd(7, 15) * e, sp: i % 4,
          chao: (opcoes.chao ?? y + 80 * e) + rnd(-3, 9) * e, fase: rnd(0, TAU), vida: rnd(1500, 2300), pouso: 0 })) break
      }
    },
    /** Fiapos de linha na cor dada: esvoaçam e caem devagar. */
    fiapos(x, y, cor = LINHO, n = 8, opcoes = {}) {
      const e = opcoes.escala ?? 1
      for (let i = 0; i < n; i++) {
        const a = rnd(0, TAU), v = rnd(60, 210) * e * (calmo ? 0.4 : 1)
        if (!nova({ k: 'fiapo', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70 * e, rot: rnd(0, TAU), vr: rnd(-5, 5), tam: rnd(7, 14) * e, cor: i % 3 === 2 ? LINHO : cor, curva: rnd(-0.9, 0.9), fase: rnd(0, TAU), vida: rnd(700, 1200) })) break
      }
    },
    /** Impacto: estrela de pano com pesponto que estufa e some (nunca clarão). forca 1 = golpe comum, 2 = golpe forte. No máximo 3 por segundo. */
    impacto(x, y, forca = 1, opcoes = {}) {
      const e = opcoes.escala ?? 1
      while (impactos.length && relogio - impactos[0] > 1000) impactos.shift()
      if (impactos.length < 3) {
        impactos.push(relogio)
        const n = 9 + Math.floor(rnd(0, 3)), pts = [], r = (22 + 12 * forca) * e
        for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU + rnd(-0.08, 0.08), q = i % 2 ? rnd(0.42, 0.56) : rnd(0.86, 1.12); pts.push([Math.cos(a) * q, Math.sin(a) * q]) }
        nova({ k: 'estrela', x, y, r, pts, rot: rnd(-0.4, 0.4), cor: opcoes.cor ?? (forca >= 2 ? OURO : LINHO), vida: calmo ? 520 : 240 + 60 * forca })
      }
      if (!calmo) fx.fiapos(x, y, opcoes.corDoFiapo ?? LINHO, Math.round(3 + 3 * forca), opcoes)
    },
    /** Golpe crítico: a costura estoura — o rasgo abre, os pontos saltam e voam de 30 a 40 flocos de enchimento. */
    costuraEstourando(x, y, opcoes = {}) {
      const e = opcoes.escala ?? 1
      nova({ k: 'rasgo', x, y, tam: 34 * e, rot: rnd(-0.5, 0.5), vida: calmo ? 700 : 520, dentes: Array.from({ length: 9 }, () => rnd(0.5, 1)) })
      if (!calmo) for (let i = 0; i < 7; i++) { const a = rnd(-Math.PI, 0) + rnd(-0.6, 0.6), v = rnd(180, 380) * e; nova({ k: 'ponto', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: rnd(0, TAU), vr: rnd(-14, 14), tam: rnd(5, 8) * e, vida: rnd(600, 900) }) }
      fx.enchimento(x, y, calmo ? 10 : Math.round(rnd(30, 40)), { ...opcoes, forca: 1.25 })
    },
    /** Brilho: estrelinha de quatro pontas que acende e apaga (cura, escudo, véu). */
    brilho(x, y, cor = OURO, opcoes = {}) {
      const e = opcoes.escala ?? 1, n = calmo ? 3 : opcoes.n ?? 7
      for (let i = 0; i < n; i++) if (!nova({ k: 'brilho', x: x + rnd(-26, 26) * e, y: y + rnd(-30, 22) * e, vx: 0, vy: -rnd(8, 26) * e, tam: rnd(5, 11) * e, cor, atraso: i * 55, rot: rnd(-0.3, 0.3), vida: rnd(520, 820) + i * 55 })) break
    },
    /** Poeira do pano: sopro baixinho que se abre para os lados (pouso, queda). */
    poeira(x, y, n = 6, opcoes = {}) {
      const e = opcoes.escala ?? 1
      for (let i = 0; i < (calmo ? Math.min(n, 3) : n); i++) { const d = i % 2 ? 1 : -1; if (!nova({ k: 'po', x: x + rnd(-8, 8) * e, y: y - rnd(0, 5) * e, vx: d * rnd(26, 88) * e, vy: -rnd(4, 26) * e, tam: rnd(14, 28) * e, vida: rnd(480, 820) })) break }
    },

    /** Avança a física. dtMs = tempo desde o último quadro. */
    atualizar(dtMs) {
      const ms = limita(dtMs, 0, 60), dt = ms / 1000
      relogio += ms
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]
        p.idade += ms
        if (p.idade >= p.vida) { P[i] = P[P.length - 1]; P.pop(); continue }
        if (p.k === 'floco') {
          if (p.pouso) { p.pouso += ms; p.x += p.vx * dt; p.vx *= Math.exp(-7 * dt); continue }
          const atr = Math.exp(-2.5 * dt)
          p.vy += 330 * dt; p.vx *= atr; p.vy *= atr
          p.x += (p.vx + Math.sin(p.idade / 150 + p.fase) * 22) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vr *= Math.exp(-0.9 * dt)
          if (p.y >= p.chao && p.vy > 0) { p.y = p.chao; p.pouso = 1; p.vx *= 0.3; p.vida = Math.max(p.vida, p.idade + 520) }
        } else if (p.k === 'fiapo') {
          const atr = Math.exp(-3.4 * dt)
          p.vy += 150 * dt; p.vx *= atr; p.vy *= atr
          p.x += (p.vx + Math.sin(p.idade / 120 + p.fase) * 30) * dt; p.y += p.vy * dt; p.rot += p.vr * dt
        } else if (p.k === 'ponto') { p.vy += 760 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt } else if (p.k === 'brilho') { if (p.idade > p.atraso) p.y += p.vy * dt } else if (p.k === 'po') {
          const atr = Math.exp(-3 * dt); p.vx *= atr; p.vy *= atr; p.x += p.vx * dt; p.y += p.vy * dt
        }
      }
    },

    /** Desenha tudo (chame depois dos bonecos). */
    desenhar(ctx) {
      if (!P.length) return
      const F = flocos()
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      for (const p of P) { // marcas primeiro (ficam por baixo das partículas)
        const f = p.idade / p.vida
        if (p.k === 'estrela') {
          const pulo = calmo ? 1 : f < 0.3 ? 0.35 + 0.8 * (f / 0.3) : 1.15 - 0.15 * Math.min(1, (f - 0.3) / 0.25), a = calmo ? Math.sin(f * Math.PI) : f < 0.55 ? 1 : 1 - (f - 0.55) / 0.45
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.r * pulo, p.r * pulo); ctx.globalAlpha = a
          ctx.beginPath(); p.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath()
          ctx.fillStyle = p.cor; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 2.6 / p.r; ctx.stroke()
          ctx.beginPath(); p.pts.forEach((q, i) => (i ? ctx.lineTo(q[0] * 0.72, q[1] * 0.72) : ctx.moveTo(q[0] * 0.72, q[1] * 0.72))); ctx.closePath()
          ctx.setLineDash([4 / p.r, 3.4 / p.r]); ctx.strokeStyle = 'rgba(20,12,31,0.55)'; ctx.lineWidth = 1.5 / p.r; ctx.stroke(); ctx.setLineDash([])
          ctx.restore()
        } else if (p.k === 'rasgo') {
          const ab = calmo ? 0.8 : Math.min(1, f / 0.16), a = f < 0.6 ? 1 : 1 - (f - 0.6) / 0.4, n = p.dentes.length, w = p.tam
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = a
          ctx.beginPath()
          for (let i = 0; i < n; i++) { const x = -w + (2 * w * i) / (n - 1), h = Math.sin((i / (n - 1)) * Math.PI) * w * 0.34 * ab * p.dentes[i]; ctx.lineTo(x, -h - (i % 2 ? 2.5 : 0)) }
          for (let i = n - 1; i >= 0; i--) { const x = -w + (2 * w * i) / (n - 1), h = Math.sin((i / (n - 1)) * Math.PI) * w * 0.34 * ab * p.dentes[i]; ctx.lineTo(x, h + (i % 2 ? 2.5 : 0)) }
          ctx.closePath(); ctx.fillStyle = '#2A0F1E'; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 2; ctx.stroke()
          ctx.strokeStyle = LINHO; ctx.lineWidth = 1.6
          for (let i = 1; i < n - 1; i += 2) { const x = -w + (2 * w * i) / (n - 1), h = Math.sin((i / (n - 1)) * Math.PI) * w * 0.34 * ab + 5; ctx.beginPath(); ctx.moveTo(x - 1, -h); ctx.lineTo(x - 2.5, -h * 0.45); ctx.moveTo(x + 1, h); ctx.lineTo(x + 2.5, h * 0.45); ctx.stroke() }
          ctx.restore()
        }
      }
      for (const p of P) {
        const f = p.idade / p.vida
        if (p.k === 'floco') {
          const a = p.pouso ? limita(1 - (p.pouso - 320) / 360, 0, 1) * limita((p.vida - p.idade) / 200, 0, 1) : limita((p.vida - p.idade) / 260, 0, 1), s = p.tam / 15
          ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(s, s * (p.pouso ? 0.74 : 1)); ctx.drawImage(F[p.sp], -12, -12, 24, 24); ctx.restore()
        } else if (p.k === 'fiapo') {
          ctx.save(); ctx.globalAlpha = limita(1 - (f - 0.6) / 0.4, 0, 1); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
          ctx.beginPath(); ctx.moveTo(-p.tam / 2, 0); ctx.quadraticCurveTo(0, p.tam * p.curva, p.tam / 2, Math.sin(p.idade / 90 + p.fase) * 2)
          ctx.strokeStyle = TINTA; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = p.cor; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore()
        } else if (p.k === 'ponto') {
          ctx.save(); ctx.globalAlpha = limita(1 - (f - 0.7) / 0.3, 0, 1); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
          ctx.beginPath(); ctx.moveTo(-p.tam / 2, -p.tam / 2); ctx.lineTo(p.tam / 2, p.tam / 2); ctx.moveTo(p.tam / 2, -p.tam / 2); ctx.lineTo(-p.tam / 2, p.tam / 2)
          ctx.strokeStyle = TINTA; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = LINHO; ctx.lineWidth = 1.7; ctx.stroke(); ctx.restore()
        } else if (p.k === 'brilho') {
          if (p.idade < p.atraso) continue
          const g = (p.idade - p.atraso) / (p.vida - p.atraso), k = Math.sin(g * Math.PI), r = p.tam * (0.4 + 0.6 * k)
          ctx.save(); ctx.globalAlpha = k; ctx.translate(p.x, p.y); ctx.rotate(p.rot)
          ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, q = i % 2 ? r * 0.28 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q) } ctx.closePath()
          ctx.fillStyle = p.cor; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 1.2; ctx.stroke()
          ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, TAU); ctx.fill(); ctx.restore()
        } else if (p.k === 'po') {
          const r = p.tam * (0.5 + f * 0.9)
          ctx.globalAlpha = (1 - f) * 0.8; ctx.drawImage(nuvem(), p.x - r, p.y - r * 0.55, r * 2, r * 1.1); ctx.globalAlpha = 1
        }
      }
      ctx.restore()
    },

    /** Quantas partículas e marcas estão vivas agora (ou só as de um tipo: 'floco', 'fiapo', 'ponto', 'brilho', 'po', 'estrela', 'rasgo'). */
    contagem(tipo) { if (!tipo) return P.length; let n = 0; for (const p of P) if (p.k === tipo) n++; return n },
    /** A maior contagem já vista (para o teste conferir o teto). */
    pico() { return pico },
    /** Modo calmo ("Menos animação"): teto de 20, nada salta nem estoura. Ao ligar, o excesso some na hora. */
    modoCalmo(ligado) { ligado = !!ligado; if (ligado === calmo) return; calmo = ligado; if (calmo && P.length > teto()) P.length = teto() },
    /** Apaga tudo (troca de luta). */
    limpar() { P.length = 0; impactos.length = 0 },
    get calmo() { return calmo },
    get teto() { return teto() },
  }
  return fx
}
