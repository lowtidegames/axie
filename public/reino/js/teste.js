// Keepmile — ganchos de teste (só com ?teste=1). Não mudam regra nenhuma: leem o estado e apertam os mesmos comandos do motor.
import { simularBatalha } from '../../../shared/reino/batalha.js'
import { aplicar } from '../../../shared/reino/partida.js'
import { escolher } from '../../../shared/reino/robos.js'
import { T } from './textos.js'

export async function ligarGanchos(X) {
  const { J, C, Som, Musica, Guarda, Arte } = X
  const mediana = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0 }
  let marca = 0
  const aos = {}
  const fimDaLutaJa = () => { const B = X.Bat(); if (!B.ativa) return; B.pular(); B.fimEm = 1; B.avancar(0, performance.now() + 10) }
  window.__keepmile = {
    pronto: true,
    estado: () => structuredClone(J.e), visao: () => structuredClone(J.v), opcoes: () => structuredClone(J.op), comandos: () => structuredClone(J.comandos),
    semente: () => J.semente, liberadas: () => J.liberadas.slice(), erros: () => J.erros.slice(), lutas: () => structuredClone(J.lutas), ultimaLuta: () => (J.ultimaLuta ? { ...J.ultimaLuta } : null),
    fase: () => X.M().fase,
    modelo: () => { const M = X.M(); return { fase: M.fase, vidas: M.vidas, ouro: M.ouro, rodada: M.rodada, sel: M.sel, cartaPosta: M.cartaPosta, mao: M.mao, selo: !!(M.selo && performance.now() < M.selo.ate), aviso: M.aviso && performance.now() < M.aviso.t0 + M.aviso.ms ? M.aviso.texto : null, chefe: M.chefe?.id ?? null, chefeTexto: M.chefe?.texto ?? null, setaCarta: !!M.setaCarta, derrota: M.derrota?.linha ?? null, derrotaPct: M.derrota?.pct ?? null, derrotaTexto: M.derrota?.pct != null ? T.quase(M.derrota.pct) : null, derrotaDeNovo: M.derrota?.deNovo ?? null, chefeCurto: !!M.chefe?.curto, info: M.info ? M.info.slice() : null, infoSel: M.infoSel ? M.infoSel.slice() : null, chances: M.chances, espolioDesc: M.espolioDesc, resumo: M.resumo ? structuredClone(M.resumo) : null, seloLinha: M.selo?.linha ?? null, consertar: { ...M.consertar }, reliquias: M.reliquias, fim: M.fim ? { ...M.fim } : null, vitoria: M.vitoria ? { ...M.vitoria } : null, brinde: M.brinde?.texto ?? null, brindeRet: M.brindeRet ? { ...M.brindeRet } : null, vel: M.vel, armado: M.armado, trocar: M.trocar, trocarLinhas: M.trocarLinhas ? M.trocarLinhas.slice() : null, desafio: M.desafio ? { ...M.desafio } : null, relSel: M.relSel, hordaN: M.hordaN, status: M.status ? { texto: M.status.texto, codigo: M.status.codigo ?? null, rede: !!M.status.rede } : null, statusRet: M.statusRet ? { ...M.statusRet } : null, replay: M.replay ? { ...M.replay } : null, modoRot: M.modoRot ?? null, maoViradas: M.maoViradas ?? 0, maoRevelada: !!M.maoRevelada, maoLog: (M.maoLog || []).slice(), baseCurta: !!M.baseCurta, resumoCurtoRet: M.resumoCurtoRet ? { ...M.resumoCurtoRet } : null } },
    modeloAviso: () => { const a = X.M().aviso; return a ? { texto: a.texto, sub: a.sub ?? null } : null },
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
        if (cmd.tipo === 'batalhar') { X.M().fase = 'carta'; X.lutar(true); fimDaLutaJa(); X.semTimers(); X.limparFestas() } else if (!X.mandar(cmd)) throw new Error('comando recusado: ' + JSON.stringify(cmd))
      }
      X.semTimers(); X.limparFestas()
      if (J.e.fase === 'fim') X.fimDaPartida(); else X.abrirRodada()
      return { comandos: J.comandos.length, rodada: J.e.rodada, fim: J.e.fase === 'fim' }
    },
    /** O robô joga até a luta que ACABA a partida e para ANTES dela (o próximo "batalhar" decide o fim). Só olha: `aplicar` não mexe no estado. */
    jogarAteALutaFinal({ robo = 'ganancioso', maxComandos = 3000 } = {}) {
      let n = 0, s = 12345, parou = false
      const inteiro = (k) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % k }
      while (J.e.fase !== 'fim' && n++ < maxComandos) {
        const cmd = escolher(robo, J.e, inteiro)
        if (cmd.tipo === 'batalhar') {
          const r = aplicar(J.e, cmd, { eventos: false })
          if (r.ok && r.estado.fase === 'fim') { parou = true; break }
          X.M().fase = 'carta'; X.lutar(true); fimDaLutaJa(); X.semTimers(); X.limparFestas()
        } else if (!X.mandar(cmd)) throw new Error('comando recusado: ' + JSON.stringify(cmd))
      }
      X.semTimers(); X.limparFestas()
      if (J.e.fase === 'fim') X.fimDaPartida(); else { X.abrirRodada(); if (X.M().fase === 'chefe') X.seguir() }
      return { parou, rodada: J.e.rodada, comandos: J.comandos.length }
    },
    /** O robô põe a carta (e o que mais quiser) até a hora de lutar; a luta fica para a tela. */
    roboAteLutar() { let n = 0, s = 999; const inteiro = (k) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % k }; while (n++ < 50) { const cmd = escolher('ganancioso', J.e, inteiro); if (cmd.tipo === 'batalhar') break; if (!X.mandar(cmd)) throw new Error('comando recusado') } X.abrirRodada(); if (X.M().fase === 'chefe') X.seguir(); return { rodada: J.e.rodada, posta: J.e.cartaPosta } },
    /** A lista de comandos refaz a mesma partida no motor? */
    reproduzir() { const r = X.reproduzir({ semente: J.semente, cartasLiberadas: J.liberadas, comandos: J.comandos }); return { ok: r.ok, igual: r.ok && JSON.stringify(r.resultado) === JSON.stringify(X.resultado(J.e)), resultado: r.resultado ?? null } },
    resultado: () => X.resultado(J.e),
    som: () => Som.estado(), musica: () => Musica.estado(),
    cena: () => { let vivos = 0, ocultos = 0; for (let i = 0; i < C.n; i++) { if (C.est[i] === 1) vivos++; if (C.oculto[i]) ocultos++ } return { bonecos: C.n, vivos, ocultos, etiquetas: C.etiquetas.slice(), contorno: { ...X.CONTORNO }, maxTipoVisivel: X.maxTipoVisivel(), tremidaMax: C.tremidaMax, flashes: C.flashes.slice(), picoParticulas: C.picoParticulas, limite: C.limite, menos: C.menos, nivelMax: Math.max(0, ...Array.from(C.nv.subarray(0, C.n))), lideres: Array.from(C.lider.subarray(0, C.n)).reduce((a, b) => a + b, 0), marcha: C.marcha, fimDeJogo: !!C.fimDeJogo, tipo: C.tipo, e: C.e, VW: C.VW, VH: C.VH, hora: C.hora, camX: C.cam.x, camMin: C.camMin, camMax: C.camMax, zoom: C.cam.zoom, tb: C.tb, vidas: C.vidas, filtro: C.g.canvas.style.filter } },
    zerarMedidas() { C.tremidaMax = 0; C.picoParticulas = 0; C.flashes.length = 0; marca = X.nq(); C.zerarMedidas?.() },
    // ---- a cena nova (R21/R25): as medidas do movimento, o teto de representantes por pelotão e quem representa cada boneco
    med: () => structuredClone(C.med), zerarMedidasDaCena: () => C.zerarMedidas(), repMax: () => C.repMax, rep: (i) => C.rep(i),
    /** Tempo de quadro desde zerarMedidas(): mediana do intervalo entre quadros e do custo de desenhar (ms). */
    quadros() { const n = Math.min(600, X.nq() - marca), a = [], b = []; for (let i = 0; i < n; i++) { const k = (X.nq() - 1 - i + 6000) % 600; a.push(X.QUADROS[k]); b.push(X.CUSTO[k]) } return { n, intervalo: mediana(a), custo: mediana(b), pior: Math.max(0, ...b) } },
    /** Luta de vitrine com o reino e a horda cheios (80+ bonecos) para medir o tempo de quadro. Não mexe na partida. */
    batalhaCheia() {
      const terrenos = ['T11', 'T07', 'T11', 'T01', 'T04', 'T11'].map((carta) => ({ carta, nivel: 5 }))
      const horda = { rodada: 9, ordem: [...Array(40).fill('muncher'), ...Array(10).fill('stilt'), ...Array(6).fill('spud'), 'brute', 'brute', 'gutbucket'], chefe: 'gutbucket' }
      const b = simularBatalha({ terrenos, reliquias: [], horda, eventos: true })
      C.terrenos = terrenos; J.pos = null; X.M().fase = 'luta'; X.M().rodada = 9; C.mudarHora('afternoon', true)
      X.Bat().iniciar({ eventos: b.eventos, horda, terrenos, exercito: X.montarExercito(terrenos, []) }, () => { if (X.M().fase === 'luta') X.abrirRodada() })
      X.UI().mudou()
      return { soldados: X.Bat().aliadosTotal, invasores: X.Bat().inimigosTotal, segundos: b.segundos }
    },
    origem: () => ({ ...Arte.origem }), temAtlas: () => Arte.temAtlas(),
    cartao() { const M = X.M(); return X.cartaoDoReino(C, { rodadas: M.fim?.vencidas ?? 0, pontos: M.fim?.pontos ?? 0, recorde: !!M.fim?.novoRecorde, titulo: 'Keepmile', url: J.link || location.href }).toDataURL('image/png') },
    /** O que o cartão de compartilhar escreve (o desafio, as linhas dele, os pontos e o endereço) e a hora do dia em que foi desenhado. */
    cartaoInfo() { const M = X.M(); return X.cartaoDoReino(C, { rodadas: M.fim?.vencidas ?? 0, pontos: M.fim?.pontos ?? 0, recorde: !!M.fim?.novoRecorde, titulo: 'Keepmile', url: J.link || location.href }).info },
    guarda: () => Guarda.tudo(),
    areaDoTerreno: (k) => { const a = C.areaDoTerreno(k); return { x: a.x * C.css, y: a.y * C.css, w: a.w * C.css, h: a.h * C.css } },
    seguir: () => X.seguir(),
    /** A fila de festas: o que já apareceu (com começo e fim), o que espera e o intervalo mínimo. */
    festas: () => ({ log: X.F.log.map((l) => ({ ...l })), fila: X.F.fila.map((f) => ({ texto: f.texto, tam: f.tam })), atual: X.F.atual ? X.F.atual.texto : null }),
    festejar(lista) { for (const f of lista) X.festa({ tipo: 'brinde', ms: 500, titulo: 'TEST', ...f, ao: () => { aos[f.texto] = (aos[f.texto] || 0) + 1 } }) },
    /** Quantas vezes o efeito (som, confete) de cada festa de teste disparou. */
    festasAo: () => ({ ...aos }),
    /** O que a interface desenhou no último quadro (etiquetas: chances, resumo, espolioDesc, fimLiga…). */
    desenhou: () => [...X.UI().desenhou],
    resumoColunas: () => X.UI().resumoCols ?? null,
    letra: () => ({ ...X.UI().letra, css: C.css, VH: C.VH }), titulo: () => ({ zona: C.zonaTitulo ? { ...C.zonaTitulo } : null, pulados: C.numerosPulados }),
    batalha: () => { const B = X.Bat(); return { ativa: B.ativa, preludio: !!B.preludioAte, lento: !!B.lento, chefeCaiuEm: B.chefeCaiuEm || 0, ritmo: B.ritmo, vel: B.vel, pausada: performance.now() < B.pausaAte, pausou: !!B.pausouNaQueda } },
    /** Luta de vitrine em que o chefe cai (para ver a festa grande). Não mexe na partida. */
    chefeCai() {
      const terrenos = ['T01', 'T04', 'T07', 'T04', 'T01', 'T04'].map((carta) => ({ carta, nivel: 5 }))
      const horda = { rodada: 5, ordem: ['muncher', 'muncher', 'gutbucket'], chefe: 'gutbucket' }
      const b = simularBatalha({ terrenos, reliquias: [], horda, eventos: true })
      C.terrenos = terrenos; J.pos = null; X.M().fase = 'luta'; C.mudarHora('boss-night', true)
      X.Bat().iniciar({ eventos: b.eventos, horda, terrenos, exercito: X.montarExercito(terrenos, []) }, () => { if (X.M().fase === 'luta') X.abrirRodada() })
      X.UI().mudou()
      return { vitoria: b.vitoria, segundos: b.segundos }
    },
    /** Ícones das relíquias: de onde vem cada um e uma soma dos pixels (para conferir que são diferentes). */
    iconesReliquia() {
      const out = {}
      for (const id of Object.keys(X.CONFIG.RELIQUIAS)) { const c = document.createElement('canvas'); c.width = 13; c.height = 13; const g = c.getContext('2d'); const de = Arte.reliquia(g, id, 0, 0); const d = g.getImageData(0, 0, 13, 13).data; let h = 0, cheios = 0; for (let i = 0; i < d.length; i++) { h = (h * 31 + d[i]) >>> 0; if (i % 4 === 3 && d[i] > 40) cheios++ } out[id] = { de, h, cheios } }
      return out
    },
    link: () => ({ url: J.link, como: J.postou, vezes: J.postagens || 0 }),
    fimSalvo: () => Guarda.fimSalvo(), outraPartida: () => Guarda.outraPartida(), melhor: () => (J.melhor ? { ...J.melhor } : null),
    limparFestas: () => X.limparFestas(),
    pctHorda: () => J.pos?.bat.pctHorda ?? null,
    guardaSet: (k, v) => Guarda.set(k, v),
    forca: (id, n) => ({ numero: Arte.forcaDaCarta(id, n), legenda: Arte.legendaDaCarta(id) }),
    avisar: (tipo, dado) => X.Bat().aoAviso(tipo, dado),
    layout: () => { const L = X.UI().L; return { odds: { linhas: (L.odds.linhas || []).map((l) => l.map((i) => i.s)), fonte: L.odds.fonte, y: L.odds.y, h: L.odds.h }, lutar2: { ...L.lutar2 }, mesa: { ...L.mesa }, resumo: { ...L.resumo }, premios: { ...L.premios }, fimPainel: { ...L.fimPainel }, fimBotoes: L.fimBotoes.map((b) => ({ ...b })), replay: { R: { ...L.replay.R }, carta: { ...L.replay.carta }, pular: { ...L.replay.pular }, rever: { ...L.replay.rever }, voltar: { ...L.replay.voltar } }, pinos: { ...L.pinos }, menu: { ...L.menu }, cel: L.cel, espolio: L.espolio.map((c) => ({ ...c })), cartas: L.cartas.map((c) => ({ ...c })), VW: C.VW, VH: C.VH, camY: C.camY } },
    /** O nome do chefe quebrado como o anúncio desenha (título ×2): cabe na tela? */
    nomeDoChefe: (id) => { const nome = X.CONFIG.CHEFES.find((c) => c.id === id).nome, lin = X.UI().quebrar(nome, (C.VW - 12) / 2, 'reino-contorno'); return { linhas: lin, maior: Math.max(...lin.map((l) => Arte.largura(l, 'reino-contorno') * 2)), VW: C.VW } },
    partidaSalva: () => Guarda.partidaSalva(),
    css: () => ({ e: C.e, css: C.css }),
    // ---- MODO SERVIDOR: o que a tela guarda do servidor e um jogador simples que só manda o que está em `opcoes.comandos`
    servidor: () => { const S = X.S; return { on: S.on, id: S.id, modo: S.modo, seq: S.seq, ocupado: S.ocupado, energia: S.energia ? { ...S.energia } : null, fora: S.fora ? { ...S.fora } : null, resultado: S.resultado ? { ...S.resultado } : null, apelido: X.Srv.apelido, api: X.Srv.api, temToken: !!X.Srv.token, replay: !!J.replay } },
    /** Espera o servidor responder ao último comando mandado. */
    async livre() { await X.S.ultimo; return X.S.seq },
    /** Joga pela tela contra o servidor: põe uma carta (terreno vazio ou a mesma carta), luta, pega o 1º espólio. `semCarta`: só luta
     *  (perde depressa). Para em `ateRodada` ou no fim. Cada luta passa pela reprodução de eventos da tela, sem esperar. */
    async jogarNoServidor({ ateRodada = 0, semCarta = false, maxComandos = 600 } = {}) {
      const S = X.S; let n = 0
      await S.ultimo
      while (J.e.fase !== 'fim' && n++ < maxComandos) {
        const v = J.v, op = J.op
        if (ateRodada && v.rodada >= ateRodada && v.fase === 'carta' && !v.cartaPosta) break
        let cmd
        if (v.fase === 'espolio') cmd = op.comandos.find((c) => c.tipo === 'espolio')
        else if (!v.cartaPosta && !semCarta) { const por = op.comandos.filter((c) => c.tipo === 'por'); cmd = por.find((c) => !v.terrenos[c.terreno - 1]) || por.find((c) => v.terrenos[c.terreno - 1]?.carta === c.carta) || por[0] }
        if (!cmd) cmd = { tipo: 'batalhar' }
        const antes = S.seq
        if (cmd.tipo === 'batalhar') { X.M().fase = 'carta'; X.lutar(true); await S.ultimo; fimDaLutaJa(); X.semTimers(); X.limparFestas() } else { X.mandar(cmd, () => {}); await S.ultimo }
        if (S.seq === antes && J.e.fase !== 'fim') throw new Error('o servidor não aceitou: ' + JSON.stringify(cmd))
      }
      X.semTimers(); X.limparFestas()
      if (J.e.fase === 'fim') X.fimDaPartida(); else if (J.v.fase === 'espolio') { X.M().fase = 'vitoria' } else { X.abrirRodada(); if (X.M().fase === 'chefe') X.seguir() }
      return { comandos: n, rodada: J.v.rodada, fim: J.e.fase === 'fim', seq: S.seq }
    },
    avisarServidor: (c) => X.avisarServidor(c),
    abrirModo: (m) => X.abrirModo(m),
    // ---- R27: a mão que vira (recomeça a revelação; `fixar` congela o relógio dela em `ms` para a foto, null solta) e o replay
    maoNova: () => { X.M().maoFixo = undefined; X.maoNova(0) },
    maoFixar: (ms) => { const M = X.M(); M.maoFixo = ms ?? undefined; if (ms != null) { M.maoRevelada = false; M.maoLog = [] } },
    pularParaLuta: () => X.pularParaLuta(),
    revela: () => ({ ...X.UI().REVELA }),
  }
}
