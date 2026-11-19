// Keepmile — a batalha automática do reino (docs/reino/biblia.md, seção 3).
// SEM dado: o mesmo reino contra a mesma horda dá sempre a mesma luta. Roda igual no servidor e no navegador.
// Passos fixos de 0,1 s; posições em centésimos de terreno; contas em inteiros (arredonda meio para cima).
//
// API:
//   montarExercito(terrenos, reliquias) → { soldados (fichas por terreno), magias, familias, ouroMercado }
//   simularBatalha({ terrenos, reliquias, horda, eventos }) → resultado (abaixo)
//   expandirHorda(horda) → lista de invasores na ordem de entrada (com vida e dano já escalados)
//
// Resultado: { vitoria, tiques, segundos, porTempo, pctHorda, terrenosLimpos, soldadosVivos, eventos }
// Eventos: arrays compactos [tique, código, ...]. Códigos:
//   'n' nasce [t,'n',id,lado(0 soldado,1 invasor),tipo,x,vida] · 'm' anda [t,'m',id,x,v] (x no começo do tique, v por tique; vale até o próximo 'm')
//   'd' dano [t,'d',origem(-1 = magia/estouro),alvo,valor] · 'h' cura [t,'h',alvo,valor] · 'c' cai [t,'c',id] · 'r' levanta [t,'r',id,vida]
//   'x' estouro [t,'x',origem,x,raio] · 'g' magia [t,'g',terreno,carta] · 's' estado [t,'s',id,'preso'|'lento'|'furia',tiques]
//   'e' cava/sai [t,'e',id,x] (x = -1 enterrou; senão saiu em x) · 'noite' [t,'noite'] · 'k' castelo [t,'k',id] · 'f' fim [t,'f',vitoria 0/1,porTempo 0/1]
import { BATALHA as B, CARTAS, CHEFES, FAMILIAS, HORDA, INVASORES, MULT_NIVEL, RELIQUIAS } from './config.js'

const arr = (x) => Math.floor(x + 0.5)
const CHEFE = Object.fromEntries(CHEFES.map((c) => [c.id, c]))

/** Famílias com o bônus ligado (3 terrenos; 2 com Twin Banner). */
export function familiasAtivas(terrenos, reliquias = []) {
  const precisa = reliquias.includes('banner') ? RELIQUIAS.banner.terrenos : null
  const cont = {}
  for (const t of terrenos) if (t) { const f = CARTAS[t.carta].familia; cont[f] = (cont[f] || 0) + 1 }
  return Object.keys(FAMILIAS).filter((f) => (cont[f] || 0) >= (precisa ?? FAMILIAS[f].terrenos))
}

/** Fichas do reino: o que cada terreno manda para a luta, já com níveis, construções, família e relíquias. */
export function montarExercito(terrenos, reliquias = []) {
  const n = terrenos.length
  const alc = reliquias.includes('blueprints') ? RELIQUIAS.blueprints.alcance : 1
  const fams = familiasAtivas(terrenos, reliquias)
  const tem = (f) => fams.includes(f)
  const bon = terrenos.map(() => ({ dano: 0, soldados: 0, reducao: 0, alcance: 0, danoTiro: 0, rapidez: 0, curaSeg: 0, vida: 0, bis: 0, pavio: 0, ouro: 0 }))
  terrenos.forEach((t, k) => {
    if (!t) return
    const c = CARTAS[t.carta]
    if (c.tipo !== 'construcao') return
    const v = c.valores[t.nivel - 1]
    for (let d = 1; d <= alc; d++) {
      for (const j of [k - d, k + d]) {
        if (j < 0 || j >= n) continue
        const b = bon[j]
        if (c.efeito === 'torre') { b.alcance += v; b.danoTiro += c.valores2[t.nivel - 1] } else b[c.efeito] += v
      }
    }
  })
  const soldados = []
  const magias = []
  let ouroMercado = 0
  const forcaMagia = 100 + (tem('fizzwick') ? FAMILIAS.fizzwick.bonus.magia : 0) + (reliquias.includes('fuse') ? RELIQUIAS.fuse.magia : 0)
  terrenos.forEach((t, k) => {
    if (!t) return
    const c = CARTAS[t.carta]
    const b = bon[k]
    if (c.tipo === 'tropa') {
      const mult = (c.multNivel || MULT_NIVEL)[t.nivel - 1]
      const tiro = c.alcance > B.corpo
      const vidaPct = 100 + b.vida + (k === 0 && reliquias.includes('bell') ? RELIQUIAS.bell.vida : 0)
      ouroMercado += b.ouro
      soldados.push({
        terreno: k + 1, carta: t.carta, nivel: t.nivel,
        qtd: c.qtd[t.nivel - 1] + (c.semExtras ? 0 : b.soldados),
        vida: Math.max(1, arr(c.vida * mult / 100 * vidaPct / 100)),
        dano: arr(c.dano * mult / 100 * (100 + b.dano + (tiro ? b.danoTiro : 0)) / 100),
        cura: c.cura ? arr(c.cura * mult / 100) : 0,
        cad: c.cad,
        alcance: c.alcance + (tiro ? b.alcance + (tem('thornbow') ? FAMILIAS.thornbow.bonus.alcanceTiro : 0) : 0),
        tiro,
        reducao: Math.min(B.tetoReducao, b.reducao + (tem('pikewall') ? FAMILIAS.pikewall.bonus.reducao : 0)),
        reducaoTiro: c.reducaoTiro || 0,
        rapidez: b.rapidez,
        curaSeg: b.curaSeg + (tem('potluck') ? FAMILIAS.potluck.bonus.curaSeg : 0),
        pavio: b.pavio, raioPavio: CARTAS.B10.raio,
      })
    } else if (c.tipo === 'magia') {
      magias.push({ terreno: k + 1, carta: t.carta, nivel: t.nivel, efeito: c.efeito, valor: c.valores[t.nivel - 1], forca: forcaMagia, bis: Math.min(100, b.bis) })
    }
  })
  return { soldados, magias, familias: fams, ouroMercado }
}

/** Multiplicador dos chefes (%): depois da rodada 20 repetem com o dobro a cada volta. */
export function multChefe(rodada) {
  const volta = Math.floor((rodada - 1) / (HORDA.chefeACada * CHEFES.length))
  return 100 * 2 ** Math.min(volta, 10)
}

/** Ficha de um invasor comum escalado para a rodada. */
function fichaInvasor(tipo, rodada) {
  const i = INVASORES[tipo]
  const esc = 100 + HORDA.escalaPorRodada * (rodada - 1)
  return {
    tipo, chefe: false, vida: Math.max(1, arr(i.vida * esc / 100)), dano: arr(i.dano * esc / 100), cura: i.cura ? arr(i.cura * esc / 100) : 0,
    cad: i.cad, vel: i.vel, alcance: i.alcance, tiroMetade: !!i.tiroMetade,
    explode: i.explode ? { dano: arr(i.explode.dano * esc / 100), raio: i.explode.raio } : null,
    cava: i.cava || null, tambor: i.tambor || null,
  }
}

/** A horda da partida (tipos na ordem) → fichas na ordem de entrada. Nip & Tuck viram 2. */
export function expandirHorda(horda) {
  const out = []
  for (const tipo of horda.ordem) {
    if (INVASORES[tipo]) { out.push(fichaInvasor(tipo, horda.rodada)); continue }
    const c = CHEFE[tipo]
    if (!c) throw new Error(`Invasor desconhecido: ${tipo}`)
    const m = multChefe(horda.rodada)
    for (let g = 0; g < (c.gemeos || 1); g++) {
      out.push({
        tipo, chefe: true, vida: arr(c.vida * m / 100), dano: arr(c.dano * m / 100), cura: 0, cad: c.cad, vel: c.vel, alcance: c.alcance,
        tiroMetade: false, explode: null, cava: c.cava || null, tambor: null, golpeArea: c.golpeArea || 0, gemeo: !!c.gemeos,
        furia: c.furia || 0, chama: c.chama || null, imune: !!c.imune,
      })
    }
  }
  return out
}

/** A luta inteira. terrenos: 6 × (null | { carta, nivel }); horda: { rodada, ordem: [tipos] }. */
export function simularBatalha({ terrenos, reliquias = [], horda, eventos = true }) {
  const ex = montarExercito(terrenos, reliquias)
  const ev = eventos ? [] : null
  let t = 0
  const E = ev ? (...a) => { a.unshift(t); ev.push(a) } : () => {}
  const candle = reliquias.includes('candle')

  // ---- soldados
  const sold = []
  let idSeq = 0
  for (const f of ex.soldados) {
    const casa = f.terreno * 100 - 50
    for (let i = 0; i < f.qtd; i++) {
      const u = {
        id: idSeq++, lado: 0, tipo: f.carta, terreno: f.terreno, casa, x: casa, hp: f.vida, hpMax: f.vida, dano: f.dano, cura: f.cura,
        cad: f.cad, carga: f.cad * 100, alcance: f.alcance, tiro: f.tiro, reducao: f.reducao, reducaoTiro: f.reducaoTiro, rapidez: f.rapidez,
        curaSeg: f.curaSeg, pavio: f.pavio, raioPavio: f.raioPavio, vivo: true, v: 0, pend: 0, c: CARTAS[f.carta],
      }
      sold.push(u)
      E('n', u.id, 0, u.tipo, u.x, u.hp)
    }
  }
  let hpSoldTotal = 0
  for (const s of sold) hpSoldTotal += s.hpMax

  // ---- invasores (todos criados já; entram em fila)
  const fichas = expandirHorda(horda)
  const inv = []
  let hpInvTotal = 0
  const intervalo = fichas.length ? Math.max(1, Math.min(B.intervaloMax, Math.floor(B.janelaEntrada / fichas.length))) : 1
  const novoInv = (f, quando) => {
    const u = { ...f, id: idSeq++, lado: 1, x: B.entrada, hp: f.vida, hpMax: f.vida, carga: f.cad * 100, ativo: false, vivo: true, entra: quando,
      preso: 0, lentoT: 0, lentoPct: 0, piche: 0, laco: false, debaixo: 0, raiva: false, chamados: 0, proxChamada: 0, v: 0, pend: 0 }
    inv.push(u)
    hpInvTotal += u.hpMax
    return u
  }
  fichas.forEach((f, i) => novoInv(f, i * intervalo))

  // ---- magias
  const mag = ex.magias.map((m) => ({ ...m, z0: (m.terreno - 1) * 100, z1: m.terreno * 100, cargas: m.bis > 0 ? [100, m.bis] : [100], pronta: 0, restam: -1 }))
  let levanta = 0
  for (const m of mag) {
    if (m.efeito !== 'levanta') continue
    const base = arr(m.valor * m.forca / 100)
    levanta += base + (m.bis ? arr(base * m.bis / 100) : 0)
  }
  let cornetaAte = -1, cornetaPct = 0

  let perdeu = false, fim = false, vitoria = false, porTempo = false
  let pisados = 0
  let prox = 0

  // ---- ajudas
  const noite = () => t >= B.noite
  function bater(origem, alvo, base, tiro) {
    if (base <= 0) return
    let d = base
    if (noite()) d = d * B.multNoite / 100
    if (alvo.lado === 1) { if (tiro && alvo.tiroMetade) d = d / 2 } else {
      d = d * (100 - alvo.reducao) / 100
      if (tiro && alvo.reducaoTiro) d = d * (100 - alvo.reducaoTiro) / 100
    }
    d = Math.max(1, arr(d))
    alvo.pend += d
    E('d', origem, alvo.id, d)
  }
  function curar(u, valor) {
    const c = Math.min(valor, u.hpMax - u.hp)
    if (c <= 0) return
    u.hp += c
    E('h', u.id, c)
  }
  function mexer(u, v) {
    if (v !== u.v) { E('m', u.id, u.x, v); u.v = v }
    u.x += v
  }
  /** Mais perto de x; empate: menor vida, depois menor id. */
  function maisPerto(lista, x, filtro) {
    let melhor = null, md = 0
    for (const u of lista) {
      if (filtro && !filtro(u)) continue
      const d = Math.abs(u.x - x)
      if (!melhor || d < md || (d === md && (u.hp < melhor.hp || (u.hp === melhor.hp && u.id < melhor.id)))) { melhor = u; md = d }
    }
    return melhor
  }

  for (t = 0; !fim; t++) {
    if (t === B.noite) E('noite')
    // 1 · entradas
    while (prox < inv.length && inv[prox].entra <= t && !inv[prox].chamado) {
      const u = inv[prox++]
      if (!u.vivo) continue // caiu antes de entrar (Grand Finale)
      u.ativo = true
      E('n', u.id, 1, u.tipo, u.x, u.hp)
      if (u.cava) { u.debaixo = u.cava.tiques; E('e', u.id, -1) }
    }
    // chefe que chama Munchers
    for (const u of inv) {
      if (!u.chama || !u.vivo || !u.ativo) continue
      if (u.proxChamada === 0) u.proxChamada = t + u.chama.tiques
      if (t >= u.proxChamada && u.chamados < u.chama.teto) {
        u.proxChamada = t + u.chama.tiques
        for (let i = 0; i < u.chama.quantos && u.chamados < u.chama.teto; i++) {
          const m = novoInv(fichaInvasor('muncher', horda.rodada), t)
          m.chamado = true; m.ativo = true; u.chamados++
          E('n', m.id, 1, m.tipo, m.x, m.hp)
        }
      }
    }
    const vis = inv.filter((u) => u.ativo && u.vivo && u.debaixo === 0)
    const vivos = sold.filter((s) => s.vivo)

    // 2a · magias
    for (const u of vis) u.piche = 0
    for (const m of mag) {
      if (m.efeito === 'levanta') continue
      let naZona = null
      for (const u of vis) if (u.x >= m.z0 && u.x < m.z1) (naZona ||= []).push(u)
      const forca = m.valor * m.forca / 100
      if (m.efeito === 'piche') {
        if (!naZona) continue
        const pct = Math.min(B.tetoLento, arr(forca * (100 + m.bis) / 100))
        for (const u of naZona) u.piche = Math.max(u.piche, pct)
      } else if (m.efeito === 'abelhas') {
        if (!naZona || t % 10 !== 0) continue
        const d = arr(forca * (100 + m.bis) / 100)
        for (const u of naZona) bater(-1, u, d, false)
      } else if (m.efeito === 'laco') {
        // prende os primeiros N que pisam; com Tinker's Shed, um 2º lote menor 3 s depois
        if (m.restam < 0) { m.restam = Math.max(1, arr(forca)); m.lote = 0; m.disparou = false }
        if (!naZona || t < m.pronta || m.restam === 0) continue
        for (const u of naZona) {
          if (m.restam <= 0) break
          if (u.laco || u.imune) continue
          if (!m.disparou) { E('g', m.terreno, m.carta); m.disparou = true }
          u.laco = true
          u.preso = u.chefe ? arr(CARTAS.M06.tiques * B.chefeMetade / 100) : CARTAS.M06.tiques
          E('s', u.id, 'preso', u.preso)
          m.restam--
        }
        if (m.restam === 0 && m.lote === 0 && m.bis > 0) {
          m.lote = 1; m.disparou = false
          m.restam = Math.max(1, arr(arr(forca) * m.bis / 100))
          m.pronta = t + B.rearme
        }
      } else if (m.cargas.length && t >= m.pronta && naZona) {
        // magias de gatilho: Boom Barrel, Rally Horn, Second Helping, Grand Finale
        const f = m.cargas.shift()
        m.pronta = t + B.rearme
        E('g', m.terreno, m.carta)
        const v = forca * f / 100
        if (m.efeito === 'barril') {
          const x0 = naZona[0].x
          const raio = CARTAS.M01.raio
          E('x', -1, x0, raio)
          for (const u of vis) if (Math.abs(u.x - x0) <= raio) bater(-1, u, arr(v), false)
        } else if (m.efeito === 'corneta') {
          cornetaAte = t + CARTAS.M04.tiques
          cornetaPct = Math.max(cornetaPct, arr(v))
        } else if (m.efeito === 'repeteco') {
          for (const s of vivos) curar(s, arr(s.hpMax * v / 100))
        } else if (m.efeito === 'finale') {
          const pct = Math.min(B.tetoLento, v)
          for (const u of vis) {
            if (!u.vivo) continue
            const d = Math.max(1, arr(u.hpMax * pct / 100 * (u.chefe ? B.chefeMetade : 100) / 100))
            u.pend += d
            E('d', -1, u.id, d)
          }
        }
      }
    }
    if (t >= cornetaAte) cornetaPct = 0

    // 2b · soldados
    const ultimoTriplo = candle && vivos.length === 1
    for (const s of vivos) {
      s.carga = Math.min(s.cad * 100, s.carga + 100 + s.rapidez + cornetaPct)
      const pronto = s.carga >= s.cad * 100
      const c = s.c
      if (c.alvo === 'aliadoFerido') {
        if (!pronto) continue
        let alvo = null
        for (const o of vivos) {
          if (Math.abs(o.x - s.x) > s.alcance || o.hp >= o.hpMax) continue
          if (!alvo || o.hpMax - o.hp > alvo.hpMax - alvo.hp || (o.hpMax - o.hp === alvo.hpMax - alvo.hp && o.id < alvo.id)) alvo = o
        }
        if (alvo) { curar(alvo, s.cura); s.carga -= s.cad * 100 }
        continue
      }
      const base = ultimoTriplo ? s.dano * B.ultimoDeTriplo / 100 : s.dano
      if (s.tiro) {
        if (!pronto) continue
        let alvo = null
        if (c.alvo === 'maisVida' || c.alvo === 'maisLonge') {
          let melhor = -1, md = 0
          for (const u of vis) {
            const d = Math.abs(u.x - s.x)
            if (d > s.alcance) continue
            const chave = c.alvo === 'maisVida' ? u.hp : d
            if (!alvo || chave > melhor || (chave === melhor && (d < md || (d === md && u.id < alvo.id)))) { alvo = u; melhor = chave; md = d }
          }
        } else alvo = maisPerto(vis, s.x, (u) => Math.abs(u.x - s.x) <= s.alcance)
        if (!alvo) continue
        s.carga -= s.cad * 100
        bater(s.id, alvo, base, true)
        if (c.lento) { alvo.lentoT = c.lento.tiques; alvo.lentoPct = c.lento.pct; E('s', alvo.id, 'lento', c.lento.tiques) }
        if (c.saltos) {
          const ja = new Set([alvo.id])
          let atual = alvo
          for (let j = 0; j < c.saltos; j++) {
            const nx = maisPerto(vis, atual.x, (u) => !ja.has(u.id) && Math.abs(u.x - atual.x) <= c.saltoAlcance)
            if (!nx) break
            ja.add(nx.id)
            bater(s.id, nx, base, true)
            atual = nx
          }
        }
        continue
      }
      // corpo a corpo: sai atrás de inimigo perto do seu terreno e volta
      const busca = c.busca || B.saida
      // também vai atrás de atirador que já o alcança (senão o atirador fica parado fora do alcance para sempre);
      // quem explode (Squib) não gasta a bomba em invasor que já vai cair neste passo
      const alvo = maisPerto(vis, s.x, (u) => (Math.abs(u.x - s.casa) <= busca || (u.alcance > B.corpo && Math.abs(u.x - s.x) <= u.alcance)) &&
        !(c.explode && u.pend >= u.hp))
      const passo = B.velSoldado / 10
      if (alvo) {
        const dx = alvo.x - s.x
        if (Math.abs(dx) <= B.corpo) {
          mexer(s, 0)
          if (!pronto) continue
          s.carga -= s.cad * 100
          if (c.explode) {
            E('x', s.id, s.x, c.explode.raio)
            for (const u of vis) if (Math.abs(u.x - s.x) <= c.explode.raio) bater(s.id, u, base, false)
            s.vivo = false
            s.hp = 0
            s.sumiu = true
            E('c', s.id)
          } else bater(s.id, alvo, base, false)
        } else mexer(s, dx > 0 ? passo : -passo)
      } else {
        const dx = s.casa - s.x
        mexer(s, Math.max(-passo, Math.min(passo, dx)))
      }
    }

    // 2c · invasores
    const tambores = vis.filter((u) => u.tambor)
    for (const u of inv) {
      if (!u.ativo || !u.vivo) continue
      if (u.debaixo > 0) {
        if (--u.debaixo === 0) { u.x = u.cava.sai; E('e', u.id, u.x) }
        continue
      }
      if (u.preso > 0) u.preso--
      if (u.lentoT > 0) u.lentoT--
      u.carga = Math.min(u.cad * 100, u.carga + 100 + (u.raiva ? u.furia : 0))
      const pronto = u.carga >= u.cad * 100
      if (u.cura) {
        if (pronto) {
          let alvo = null
          for (const o of vis) {
            if (Math.abs(o.x - u.x) > u.alcance || o.hp >= o.hpMax || !o.vivo) continue
            if (!alvo || o.hpMax - o.hp > alvo.hpMax - alvo.hp) alvo = o
          }
          if (alvo) { curar(alvo, u.cura); u.carga -= u.cad * 100 }
        }
      }
      const alvo = maisPerto(vivos, u.x, (s) => s.vivo)
      const alcance = u.cura ? B.corpo : u.alcance
      if (alvo && Math.abs(alvo.x - u.x) <= alcance) {
        mexer(u, 0)
        if (!pronto || u.dano <= 0) continue
        u.carga -= u.cad * 100
        let base = u.dano
        if (u.raiva) base = base * (100 + u.furia) / 100
        if (!u.chefe && tambores.some((d) => d.vivo && Math.abs(d.x - u.x) <= d.tambor.raio)) base = base * (100 + INVASORES.drum.tambor.pct) / 100
        const tiro = u.alcance > B.corpo
        if (u.golpeArea) {
          for (const s of vivos) if (s.vivo && Math.abs(s.x - u.x) <= u.golpeArea) bater(u.id, s, base, false)
        } else bater(u.id, alvo, base, tiro)
        continue
      }
      // anda para o castelo
      let v = 0
      if (u.preso === 0) {
        let lento = Math.max(u.lentoT > 0 ? u.lentoPct : 0, u.piche)
        if (u.imune) lento = 0
        else if (u.chefe) lento = lento * B.chefeMetade / 100
        const base = u.raiva ? u.vel * (100 + u.furia) / 100 : u.vel
        v = Math.max(1, arr(base / 10 * (100 - Math.min(B.tetoLento, lento)) / 100))
      }
      mexer(u, v)
      if (u.x >= B.castelo) { E('k', u.id); perdeu = true }
    }
    // terrenos pisados
    for (const u of vis) if (u.vivo && u.x >= 0 && u.x < B.castelo) pisados |= 1 << Math.floor(u.x / 100)

    // 3 · todo dano junto
    for (const u of sold) if (u.pend) { if (u.vivo) u.hp -= u.pend; u.pend = 0 }
    for (const u of inv) if (u.pend) { if (u.vivo) u.hp -= u.pend; u.pend = 0 }

    // 4 · quedas e efeitos (estouros entram no dano do próximo passo)
    for (const s of sold) {
      if (!s.vivo || s.hp > 0) continue
      s.vivo = false
      s.hp = 0
      E('c', s.id)
      if (s.pavio > 0) {
        E('x', s.id, s.x, s.raioPavio)
        for (const u of inv) if (u.vivo && u.ativo && u.debaixo === 0 && Math.abs(u.x - s.x) <= s.raioPavio) bater(-1, u, s.pavio, false)
      }
      if (levanta > 0) {
        levanta--
        s.vivo = true
        s.hp = Math.max(1, arr(s.hpMax / 2))
        E('r', s.id, s.hp)
      }
    }
    for (const u of inv) {
      if (!u.vivo || u.hp > 0) continue
      u.vivo = false
      u.hp = 0
      if (u.ativo) E('c', u.id)
      if (u.explode && u.ativo) {
        E('x', u.id, u.x, u.explode.raio)
        for (const s of sold) if (s.vivo && Math.abs(s.x - u.x) <= u.explode.raio) bater(u.id, s, u.explode.dano, false)
      }
      if (u.gemeo) {
        for (const o of inv) if (o.gemeo && o.vivo && o !== u && !o.raiva) { o.raiva = true; E('s', o.id, 'furia', -1) }
      }
    }
    // cura por segundo (Cookhouse, família Potluck)
    if ((t + 1) % 10 === 0) for (const s of sold) if (s.vivo && s.curaSeg > 0) curar(s, s.curaSeg)

    // 5 · confere o fim
    if (perdeu) { fim = true; vitoria = false; break }
    let restam = false
    for (const u of inv) if (u.vivo) { restam = true; break }
    if (!restam) { fim = true; vitoria = true; break }
    // sem ninguém de pé o castelo está aberto: a horda entra (decide já, sem esperar a caminhada)
    if (hpSoldTotal > 0 && !sold.some((s) => s.vivo)) { E('k', -1); fim = true; vitoria = false; break }
    if (t + 1 >= B.fimTempo) {
      fim = true
      porTempo = true
      let hs = 0, hi = 0
      for (const s of sold) if (s.vivo) hs += s.hp
      for (const u of inv) if (u.vivo) hi += u.hp
      // % de vida: hs/hpSoldTotal ≥ hi/hpInvTotal (empate é do jogador)
      vitoria = hpSoldTotal > 0 && hs * hpInvTotal >= hi * hpSoldTotal
      break
    }
  }
  const tiques = t + 1
  E('f', vitoria ? 1 : 0, porTempo ? 1 : 0)
  let restante = 0
  for (const u of inv) if (u.vivo) restante += u.hp
  const pctHorda = hpInvTotal > 0 ? Math.floor(100 * (hpInvTotal - restante) / hpInvTotal) : 100
  let hpSold = 0
  for (const s of sold) if (s.vivo) hpSold += s.hp
  const pctSoldados = hpSoldTotal > 0 ? Math.floor(100 * hpSold / hpSoldTotal) : 0
  let limpos = 0
  for (let k = 0; k < terrenos.length; k++) if (!(pisados & (1 << k))) limpos++
  return {
    vitoria, porTempo, tiques, segundos: tiques / 10, pctHorda, pctSoldados, terrenosLimpos: limpos,
    soldadosVivos: sold.filter((s) => s.vivo).length, soldados: sold.length, invasores: inv.length,
    familias: ex.familias, ouroMercado: ex.ouroMercado, eventos: ev,
  }
}
