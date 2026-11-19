// Keepmile — ganchos de teste (só com ?teste=1). Não mudam regra nenhuma: leem o estado e apertam os mesmos comandos do motor.
import { simularBatalha } from '../../../shared/reino/batalha.js'
import { escolher } from '../../../shared/reino/robos.js'

export async function ligarGanchos(X) {
  const { J, C, Som, Musica, Guarda, Arte } = X
  const mediana = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0 }
  let marca = 0
  const fimDaLutaJa = () => { const B = X.Bat(); if (!B.ativa) return; B.pular(); B.fimEm = 1; B.avancar(0, performance.now() + 10) }
  window.__keepmile = {
    pronto: true,
    estado: () => structuredClone(J.e), visao: () => structuredClone(J.v), opcoes: () => structuredClone(J.op), comandos: () => structuredClone(J.comandos),
    semente: () => J.semente, liberadas: () => J.liberadas.slice(), erros: () => J.erros.slice(), lutas: () => structuredClone(J.lutas), ultimaLuta: () => (J.ultimaLuta ? { ...J.ultimaLuta } : null),
    fase: () => X.M().fase,
    modelo: () => { const M = X.M(); return { fase: M.fase, vidas: M.vidas, ouro: M.ouro, rodada: M.rodada, sel: M.sel, cartaPosta: M.cartaPosta, mao: M.mao, selo: !!(M.selo && performance.now() < M.selo.ate), aviso: M.aviso && performance.now() < M.aviso.t0 + M.aviso.ms ? M.aviso.texto : null, chefe: M.chefe?.id ?? null, derrota: M.derrota?.linha ?? null, fim: M.fim ? { ...M.fim } : null, vitoria: M.vitoria ? { ...M.vitoria } : null, brinde: M.brinde?.texto ?? null, vel: M.vel, armado: M.armado, trocar: M.trocar, hordaN: M.hordaN } },
    lutando: () => X.Bat().ativa,
    /** Leva a luta que está na tela até o fim, agora. */
    avancarBatalha: fimDaLutaJa,
    /** O robô ganancioso do motor joga pela tela (cada luta passa pela reprodução de eventos, sem esperar). Para em `ateRodada` ou no fim. */
    jogarSozinho({ robo = 'ganancioso', ateRodada = 0, maxComandos = 3000 } = {}) {
      let n = 0, s = 12345
      const inteiro = (k) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % k }
      while (J.e.fase !== 'fim' && n++ < maxComandos) {
        if (ateRodada && J.e.rodada >= ateRodada && J.e.fase === 'carta' && !J.e.cartaPosta) break
        const cmd = escolher(robo, J.e, inteiro)
        if (cmd.tipo === 'batalhar') { X.M().fase = 'carta'; X.lutar(true); fimDaLutaJa(); X.semTimers() } else if (!X.mandar(cmd)) throw new Error('comando recusado: ' + JSON.stringify(cmd))
      }
      X.semTimers()
      if (J.e.fase === 'fim') X.fimDaPartida(); else X.abrirRodada()
      return { comandos: J.comandos.length, rodada: J.e.rodada, fim: J.e.fase === 'fim' }
    },
    /** A lista de comandos refaz a mesma partida no motor? */
    reproduzir() { const r = X.reproduzir({ semente: J.semente, cartasLiberadas: J.liberadas, comandos: J.comandos }); return { ok: r.ok, igual: r.ok && JSON.stringify(r.resultado) === JSON.stringify(X.resultado(J.e)), resultado: r.resultado ?? null } },
    resultado: () => X.resultado(J.e),
    som: () => Som.estado(), musica: () => Musica.estado(),
    cena: () => { let vivos = 0; for (let i = 0; i < C.n; i++) if (C.est[i] === 1) vivos++; return { bonecos: C.n, vivos, tremidaMax: C.tremidaMax, flashes: C.flashes.slice(), picoParticulas: C.picoParticulas, limite: C.limite, menos: C.menos, tipo: C.tipo, e: C.e, VW: C.VW, VH: C.VH, hora: C.hora, camX: C.cam.x, zoom: C.cam.zoom, tb: C.tb, vidas: C.vidas, filtro: C.g.canvas.style.filter } },
    zerarMedidas() { C.tremidaMax = 0; C.picoParticulas = 0; C.flashes.length = 0; marca = X.nq() },
    /** Tempo de quadro desde zerarMedidas(): mediana do intervalo entre quadros e do custo de desenhar (ms). */
    quadros() { const n = Math.min(600, X.nq() - marca), a = [], b = []; for (let i = 0; i < n; i++) { const k = (X.nq() - 1 - i + 6000) % 600; a.push(X.QUADROS[k]); b.push(X.CUSTO[k]) } return { n, intervalo: mediana(a), custo: mediana(b), pior: Math.max(0, ...b) } },
    /** Luta de vitrine com o reino e a horda cheios (80+ bonecos) para medir o tempo de quadro. Não mexe na partida. */
    batalhaCheia() {
      const terrenos = ['T11', 'T07', 'T11', 'T01', 'T04', 'T11'].map((carta) => ({ carta, nivel: 5 }))
      const horda = { rodada: 9, ordem: [...Array(40).fill('muncher'), ...Array(10).fill('stilt'), ...Array(6).fill('spud'), 'brute', 'brute', 'gutbucket'], chefe: 'gutbucket' }
      const b = simularBatalha({ terrenos, reliquias: [], horda, eventos: true })
      C.terrenos = terrenos; X.M().fase = 'luta'
      X.Bat().iniciar({ eventos: b.eventos, horda, terrenos, exercito: X.montarExercito(terrenos, []) }, () => X.abrirRodada())
      X.UI().mudou()
      return { soldados: X.Bat().aliadosTotal, invasores: X.Bat().inimigosTotal, segundos: b.segundos }
    },
    origem: () => ({ ...Arte.origem }), temAtlas: () => Arte.temAtlas(),
    cartao() { const M = X.M(); return X.cartaoDoReino(C, { rodadas: M.fim?.vencidas ?? 0, pontos: M.fim?.pontos ?? 0, recorde: !!M.fim?.novoRecorde, titulo: 'Keepmile' }).toDataURL('image/png') },
    guarda: () => Guarda.tudo(),
    areaDoTerreno: (k) => { const a = C.areaDoTerreno(k); return { x: a.x * C.e, y: a.y * C.e, w: a.w * C.e, h: a.h * C.e } },
    seguir: () => X.seguir(),
  }
}
