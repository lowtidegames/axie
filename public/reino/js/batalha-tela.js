// Keepmile — A BATALHA NA TELA: só reproduz a lista de eventos que o motor já decidiu (nasce, anda, bate, cai, magia, estouro, castelo).
// Nada aqui muda o resultado: velocidade, pausa de impacto e câmera lenta só mexem no relógio do desenho.
import { AN } from './cena.js'

const VOO_MS = 210 // voo do projétil (ms de animação): a flecha sai ANTES para chegar junto com o dano

const ANIM_MAGIA = { laco: 'grow', abelhas: 'swarm', corneta: 'blow', repeteco: 'serve', levanta: 'open', finale: 'launch' } // animação da peça do atlas quando a magia dispara
const FILEIRAS = [-0.9, -0.3, 0.3, 0.9]
const SOM_MAGIA = { barril: 'magiaFogo', piche: 'magiaGelo', abelhas: 'magiaRaio', corneta: 'invasorChega', repeteco: 'magiaCura', laco: 'magiaGelo', levanta: 'magiaCura', finale: 'magiaRaio' }

export function criarBatalha(C, CONFIG, Som, expandirHorda) {
  const B = { ativa: false, ev: null, i: 0, vel: 1, mapa: new Int16Array(1024), aliados: 0, inimigos: 0, aliadosTotal: 0, inimigosTotal: 0, pausaAte: 0, lentoAte: 0, fimEm: 0, resultado: null, aoFim: null, aoAviso: null, silencio: false, ultimaPausa: 0 }
  const chefes = new Set(CONFIG.CHEFES.map((c) => c.id))
  C.batalha = B // (replay e teste) a cena alcança a batalha que ela desenha
  let porTerreno, contTerreno, nivelTerreno, nascidosInv, lentoUsado, chocou, dano, quedas, quem, ultimoFundo, terrenoDe, chefesVivos, armado = new Uint8Array(0), fatorAgora = 1, vivosT = {}
  const danoT = new Int32Array(7) // dano causado aos invasores por terreno (1..6); 0 = magia e estouros

  /** `segundos` (duração que o motor deu) e `rodada` só acertam o RITMO do desenho: nas rodadas 1–4 a luta curta toca mais devagar no 1×. */
  B.iniciar = ({ eventos, horda, terrenos, exercito, segundos = 0, rodada = 99 }, aoFim) => {
    B.ev = eventos; B.i = 0; B.ativa = true; B.resultado = null; B.aoFim = aoFim; B.fimEm = 0; B.pausaAte = 0; B.lentoAte = 0; B.silencio = false
    B.ritmo = rodada <= 4 && segundos > 0 ? Math.max(0.4, Math.min(1, segundos / 7)) : 1
    B.chefeCaiuEm = 0; B.lento = false; B.gruposCaidos = 0; vivosT = {}; B.pausouNaQueda = false; danoT.fill(0); terrenoDe = {}; chefesVivos = 0
    // entrada: a horda marcha no portão ao som do tambor antes do primeiro passo da luta (só desenho; o resultado já está decidido)
    // R21: ela ENTRA marchando de fora da tela, com poeira no pé, e os soldados dão o grito (um pulo, em onda) antes de sair
    B.preludioAte = performance.now() + 1700; C.marcha = true; C.marchaT0 = C.relogio; C.gritoT = C.relogio + 620; C.emLuta = true; C.noite = 0
    if (C.tipo === 'pc' && !C.menos) { C.cam.alvo = C.camMin; C.cam.vel = 90 } // R25: a câmera vai até o portão para a horda entrar DENTRO da tela
    armado = new Uint8Array(eventos.length)
    C.gatilho?.('entrada', C.VW * (C.tipo === 'celular' ? 0.3 : 0.22), C.oy + C.tiers[C.tiers.length - 1] + 6)
    porTerreno = {}; contTerreno = {}; nivelTerreno = {}
    for (const s of exercito.soldados) { porTerreno[s.terreno] = s.qtd; contTerreno[s.terreno] = 0; nivelTerreno[s.terreno] = s.nivel }
    B.aliadosTotal = B.aliados = exercito.soldados.reduce((a, s) => a + s.qtd, 0)
    B.inimigosTotal = B.inimigos = expandirHorda(horda).length
    nascidosInv = 0; lentoUsado = false; chocou = false; dano = {}; quedas = 0; quem = null; ultimoFundo = 0
    B.quedasDeSoldado = 0; B.rodadaChefe = horda.chefe
    Som.tocar('marcha')
  }
  function comecarLuta() { B.preludioAte = 0; C.marcha = false; C.cam.vel = 0; B.mapa.fill(-1); C.limparBonecos(); C.tb = 0; C.magiaAnim = {} }
  /** Resumo ao vivo (e final) da luta: dano por terreno, o que mais bateu e a contagem dos dois lados. */
  B.resumo = () => { let mvp = -1, m = 0; for (let k = 0; k < 7; k++) if (danoT[k] > m) { m = danoT[k]; mvp = k } return { dano: Array.from(danoT), mvp, aliados: B.aliados, aliadosTotal: B.aliadosTotal, inimigos: B.inimigos, inimigosTotal: B.inimigosTotal } }
  const tela = (i) => C.telaDe(i)
  const pan = (i) => Math.max(-0.8, Math.min(0.8, (C.sx[i] - C.cam.x) / C.VW * 2 - 1))
  /** Parada de impacto (hit-stop): 45 ms no golpe forte, 60 ms no do chefe e no estouro; nunca em golpe comum, nunca em rajada. */
  function pausa(agora, ms, tremida) {
    if (B.silencio || C.menos || agora - B.ultimaPausa < (ms >= 60 ? 380 : 650)) return
    B.ultimaPausa = agora; B.pausaAte = agora + ms / Math.max(1, B.vel / 2); C.tremer(tremida, ms + 40)
  }

  function evento(e, agora) {
    const t = e[0], cod = e[1], quieto = B.silencio
    if (cod === 'n') {
      const [, , id, lado, tipo, x, vida] = e
      let i
      if (lado === 0) {
        const k = Math.round((x + 50) / 100), j = contTerreno[k]++ || 0, f = C.formacao(j, porTerreno[k] || 1)
        i = C.nascer(0, tipo, x, vida, f.lane, f.dxe, 1, nivelTerreno[k] || 1, j === 0)
        terrenoDe[id] = k; vivosT[k] = (vivosT[k] || 0) + 1; if (i >= 0) C.grupo[i] = k
      } else {
        const chefe = chefes.has(tipo)
        // a horda anda em 4 fileiras (cada uma com a sua altura e o seu tom), não num borrão
        i = C.nascer(1, tipo, x, vida, chefe ? 0.2 : FILEIRAS[(id * 7919) % 4] + (((id * 13) % 5) - 2) * 0.03, chefe ? 0 : ((id * 31) % 29) - 14)
        nascidosInv++; if (nascidosInv > B.inimigosTotal) { B.inimigosTotal++; B.inimigos++ }
        if (chefe) chefesVivos++
        if (chefe && !quieto) { Som.tocar('chefeEntra'); C.tremer(6, 120); B.aoAviso?.('chefe', tipo) }
      }
      if (i >= 0) { B.mapa[id] = i; C.t0[i] = t }
    } else if (cod === 'm') {
      const i = B.mapa[e[2]]; if (i < 0) return
      C.x0[i] = e[3]; C.v[i] = e[4]; C.t0[i] = t; if (e[4]) C.dir[i] = e[4] > 0 ? 1 : -1
    } else if (cod === 'd') {
      const a = B.mapa[e[3]], o = e[2] >= 0 ? B.mapa[e[2]] : -1, valor = e[4]; if (a < 0) return
      C.hp[a] -= valor
      if (o >= 0 && C.lado[o] === 1) { const tp = e[2]; dano[tp] = (dano[tp] || 0) + valor }
      if (C.lado[a] === 1) danoT[o >= 0 && C.lado[o] === 0 ? terrenoDe[e[2]] || 0 : 0] += valor
      if (quieto) return
      const chefao = o >= 0 && C.peca[o].w > 100
      const forte = e[2] < 0 || (valor >= 12 && valor * 5 >= C.hpMax[a] * 2) || chefao // golpe forte: magia, chefe, ou tira 40% da vida de uma vez
      // R25 — o golpe tem DONO e ALVO à vista: quem bate e quem apanha são os representantes dos pelotões (a conta de vida acima é a de verdade)
      const av = C.rep(a), ov = o >= 0 ? C.rep(o) : -1
      const pa = tela(av)
      let empurra = 0
      if (o >= 0) {
        const xa = C.xDe(a), xo = C.xDe(o), longe = Math.abs(xa - xo) > 60 && atira(o)
        if (xa !== xo) C.dir[o] = xa > xo ? 1 : -1
        if (!longe) { C.marcarLuta(o); C.marcarLuta(a) } // os dois estão no choque: valem para a linha de frente
        { const xav = C.xDe(av) + C.dxe[av], xov = C.xDe(ov) + C.dxe[ov]; if (xav !== xov) C.dir[ov] = xav > xov ? 1 : -1 } // o representante olha para quem ele acerta
        const po = tela(ov)
        empurra = pa.x === po.x ? (C.dir[ov] * (C.sentido[ov] || 1) > 0 ? 1 : -1) : pa.x > po.x ? 1 : -1
        // o golpe já vem ANTECIPADO (antever): aqui é o instante do impacto. Sem antecipação marcada (nasceu agora, luta pulada), entra direto no bote.
        if (!C.emGolpe(ov)) { C.atacar(ov, av, false, true); if (longe) C.projetil(po.x + C.cam.x, po.y - 16, pa.x + C.cam.x, pa.y - 14, C.projetilDe(ov), 110) }
        if (longe) { if (C.lado[o] === 0 && (t & 3) === 0) Som.tocar('flecha', { pan: pan(ov), forca: 0.7 }) }
        if (chefao) { pausa(agora, 60, 6); Som.tocar('critico', { pan: pan(av) }) } else if (forte) { pausa(agora, 45, 3); Som.tocar('critico', { pan: pan(av), forca: 0.7 }) }
      }
      // quem apanha: recua, amassa e leva a estrela de impacto em TODO golpe; o corpo inteiro branco (1 quadro) só no golpe FORTE, no máximo 3 por segundo
      if (C.est[av] === 1) { if (!C.emGolpe(av)) { C.tocarAnim(av, AN.hit); if (!(forte && C.podeBranco())) C.animT[av] -= C.peca[av].anim.hit.ms[0] } C.apanhar(av, empurra, forte ? 1.7 : 1) }
      C.dano(pa.x + C.cam.x, pa.y - C.peca[av].ay * C.k[av] * 0.6, valor, forte ? 1 : 0, chefao, C.chaveDe(av), empurra || (C.lado[av] ? -1 : 1))
      if (!chocou) C.empurrar(3) // a carga: a câmera leva um tranco curto no primeiro choque
      if (!chocou) { chocou = true; Som.tocar('choque') }
    } else if (cod === 'h') {
      const i = B.mapa[e[2]]; if (i < 0) return
      C.hp[i] = Math.min(C.hpMax[i], C.hp[i] + e[3])
      if (!quieto) { const p = tela(C.rep(i)); if ((e[2] + t) % 5 === 0) C.efeito('heal', p.x + C.cam.x, p.y); if (e[3] > 0) { const iv = C.rep(i); C.dano(p.x + C.cam.x, p.y - C.peca[iv].ay * C.k[iv] * 0.6, e[3], 2, false, C.chaveDe(iv, true), C.lado[iv] ? -1 : 1) } } // cura em verde, somada
    } else if (cod === 'c') {
      const i = B.mapa[e[2]]; if (i < 0) return
      const eraVivo = C.est[i] === 1 || C.est[i] === 3
      const xFica = C.xDe(i); C.x0[i] = xFica; C.v[i] = 0; C.t0[i] = 1e9 // cai onde está
      if (!eraVivo) { C.est[i] = 2; C.tocarAnim(i, AN.fall); return }
      if (C.lado[i] === 0) { B.aliados--; B.quedasDeSoldado++ } else B.inimigos--
      // R26 — um grupo inteiro do reino acabou: 250 ms de respiro (a cena segura em câmera lenta no ponto) e poeira onde ele caiu
      if (C.lado[i] === 0 && !quieto) { const k = terrenoDe[e[2]]; if (k && --vivosT[k] === 0 && B.aliados > 0 && !C.menos) { B.lentoAte = Math.max(B.lentoAte, agora + 250); C.med.gruposCaidos++; C.med.pausaGrupoMs = Math.round(B.lentoAte - agora); const q = tela(i); C.efeito('dust', q.x + C.cam.x, q.y + 2); B.gruposCaidos = (B.gruposCaidos || 0) + 1 } }
      const chefe = C.lado[i] === 1 && chefes.has(B.tipoDe(e[2]))
      if (chefe) chefesVivos--
      if (quieto) { C.est[i] = 4; return }
      // R21 — cada um cai do seu jeito: o soldado tomba para trás e vira fumaça clara; o invasor estoura em fumaça roxa; o bruto tomba
      // com poeira; o chefe cambaleia, ajoelha, tomba e levanta uma nuvem grande (a cena toca as etapas pelo tempo)
      C.morrer(i, chefe ? 2 : C.lado[i] === 0 ? 0 : C.peca[i].w > 60 ? 3 : 1)
      const p = tela(i); if (!C.oculto[i]) C.gatilho?.(chefe ? 'chefeCai' : C.lado[i] === 0 ? 'morteAliado' : 'morteInvasor', p.x, p.y)
      if (chefe && chefesVivos <= 0) {
        // FESTA GRANDE: câmera lenta de 600 ms com zoom, ouro e confete (dentro do limite). Com Reduced motion: pausa + som.
        B.chefeCaiuEm = agora; lentoUsado = true; Som.tocar('chefeCai')
        if (C.menos) { B.pausaAte = agora + 450; B.pausouNaQueda = true }
        else {
          B.lentoAte = agora + 600; B.lento = true; C.zoom(p.x, p.y - 26, 600); C.flash('#FFD248', 220); C.tremer(6, 120)
          C.estouro(p.x + C.cam.x, p.y - 30, 14, 2, 80)
          for (const dx of [-22, 0, 22]) C.efeito('confetti', p.x + C.cam.x + dx, p.y - 34)
          C.efeito('level-ring', p.x + C.cam.x, p.y - 6)
        }
        B.aoAviso?.('chefeCaiu', B.tipoDe(e[2]))
      } else if (chefe) { Som.tocar('chefeCai', { forca: 0.6 }); pausa(agora, 120, 6) } else if ((quedas++ & 1) === 0) Som.tocar('soldadoCai', { pan: pan(i), forca: 0.8 })
      // câmera lenta: o último soldado de pé (ou o último invasor caindo)
      if (!lentoUsado && !C.menos && ((C.lado[i] === 0 && B.aliados === 1 && B.inimigos > 0) || (C.lado[i] === 1 && B.inimigos === 0 && nascidosInv > 2))) {
        lentoUsado = true; B.lentoAte = agora + 600
        if (C.lado[i] === 0) { B.aoAviso?.('ultimo'); for (let j = 0; j < C.n; j++) if (C.lado[j] === 0 && C.est[j] === 1) { const q = tela(j); C.zoom(q.x, q.y - 10, 600) } } else C.zoom(p.x, p.y - 10, 600)
      }
    } else if (cod === 'r') {
      const i = B.mapa[e[2]]; if (i < 0) return
      C.est[i] = 1; C.hp[i] = e[3]; C.anim[i] = AN.idle; C.animT[i] = C.relogio; C.t0[i] = t; B.aliados++
      if (!quieto) { const p = tela(i); C.efeito('heal', p.x + C.cam.x, p.y); Som.tocar('magiaCura', { pan: pan(i), forca: 0.7 }) }
    } else if (cod === 'x') {
      if (quieto) return
      const p = C.pos(e[3], 0)
      const dono = e[2] >= 0 ? B.mapa[e[2]] : -1
      C.gatilho?.('explosao', p.x, p.y); C.explodir(p.x + C.cam.x, p.y, dono >= 0 && C.lado[dono] === 1); C.flash('#FFE0A0', 110); pausa(agora, 60, 4); Som.tocar('magiaFogo', { pan: p.x / C.VW * 2 - 1 })
    } else if (cod === 'g') {
      const k = e[2], c = CONFIG.CARTAS[e[3]]
      if (quieto || !c) return
      const p = C.centroDoTerreno(k)
      C.pulo[k] = C.relogio + 300; C.magiaAnim[k] = { nome: ANIM_MAGIA[c.efeito] || 'idle', t0: C.relogio }
      if (c.efeito === 'laco') setTimeout(() => { if (C.magiaAnim?.[k]) C.magiaAnim[k] = { nome: 'hold', t0: C.relogio } }, 300)
      Som.tocar(SOM_MAGIA[c.efeito] || 'magiaRaio'); C.numero(p.x + C.cam.x, p.base - 30, c.nome, true); C.efeito('level-ring', p.x + C.cam.x, p.y)
      if (c.efeito === 'finale') { C.flash('#F58CC4', 160); C.efeito('fireworks', p.x + C.cam.x, p.base - 20) }
    } else if (cod === 's') {
      const i = B.mapa[e[2]]; if (i < 0) return
      if (e[3] === 'preso') C.preso[i] = t + e[4]
      if (e[3] === 'furia' && !quieto) { const p = tela(i); C.numero(p.x + C.cam.x, p.y - 80, 'FURY!', true); Som.tocar('chefeAnuncia', { forca: 0.6 }) }
    } else if (cod === 'e') {
      const i = B.mapa[e[2]]; if (i < 0) return
      if (e[3] < 0) C.est[i] = 3; else { C.est[i] = 1; C.x0[i] = e[3]; C.v[i] = 0; C.t0[i] = t; if (!quieto) { const p = C.pos(e[3], 0); C.efeito('dust', p.x + C.cam.x, p.y); C.efeito('smoke', p.x + C.cam.x, p.y); Som.tocar('muralha', { forca: 0.7 }) } }
    } else if (cod === 'noite') {
      C.noite = 1; if (!quieto) B.aoAviso?.('noite')
    } else if (cod === 'k') {
      quem = e[2]
      if (!quieto) { C.casteloTreme = C.relogio + 500; C.tremer(6, 120); Som.tocar('muralha') }
    } else if (cod === 'f') {
      // quem derrubou: o invasor que tocou o castelo; se a horda só varreu os soldados, quem mais bateu
      let tipo = null
      if (quem != null && quem >= 0 && B.mapa[quem] >= 0) tipo = B.tipoDe(quem)
      if (!tipo) { let m = -1; for (const [id, v] of Object.entries(dano)) if (v > m) { m = v; tipo = B.tipoDe(Number(id)) } }
      B.resultado = { vitoria: e[2] === 1, porTempo: e[3] === 1, quem: tipo, tocouCastelo: quem != null && quem >= 0, quedasDeSoldado: B.quedasDeSoldado, aliados: B.aliados }
      // fecho: 1 s para ver o último cair; se o chefe acabou de cair, espera a queda em etapas dele terminar (até 2,6 s desde o golpe final)
      B.fimEm = agora + (quieto ? 0 : B.chefeCaiuEm && agora - B.chefeCaiuEm < 2600 ? Math.max(1000, 2600 - (agora - B.chefeCaiuEm)) : 1000)
      if (!quieto) { C.fimT = C.relogio; C.fimVitoria = e[2] === 1; C.med.fim = e[2] === 1 ? 'festa' : 'recuo' } // quem venceu comemora (pulo, arma para cima) e o reino vencido recua um passo, antes do painel
      Som.fundoBatalha(0)
    }
  }
  const tipos = {}
  /** Só atira quem tem alcance de tiro no config (o resto bate de perto, mesmo quando o alvo ainda parece longe). */
  const atira = (i) => { const id = C.idTipo[i], c = CONFIG.CARTAS[id] || CONFIG.INVASORES[id] || CONFIG.CHEFES.find((x) => x.id === id); return !!c && c.alcance > 60 && C.projetilDe(i) !== 'nada' }
  /** ANTECIPAÇÃO: a lista de eventos já está pronta, então a tela olha um pouco à frente e começa o golpe ANTES do dano — o boneco
   *  encolhe, dá o bote e o impacto cai no instante exato em que o motor tira a vida. Quem atira solta o projétil antes, para ele chegar junto. */
  function antever() {
    const ev = B.ev, esc = Math.max(1, fatorAgora / 2) // acima de 2× a animação não acelera mais: a folga em tiques cresce
    for (let k = B.i; k < ev.length; k++) {
      const e = ev[k]; if (e[0] > C.tb + 6 * esc) break
      if (e[1] !== 'd' || e[2] < 0 || armado[k]) continue
      const o = B.mapa[e[2]]; if (o < 0 || C.est[o] !== 1) continue
      const a = B.mapa[e[3]], tp = C.projetilDe(o), longe = a >= 0 && Math.abs(C.xDe(a) - C.xDe(o)) > 60 && atira(o)
      if (C.tb < e[0] - (C.antecipaDe(o) + (longe && tp !== 'raio' ? VOO_MS : 0)) / 100 * esc) continue
      armado[k] = 1
      const ov = C.rep(o), av = a >= 0 ? C.rep(a) : -1 // quem aparece dando o golpe é o representante do pelotão
      if (a >= 0) { const xa = C.xDe(a), xo = C.xDe(o); if (xa !== xo) C.dir[o] = xa > xo ? 1 : -1; const xav = C.xDe(av) + C.dxe[av], xov = C.xDe(ov) + C.dxe[ov]; if (xav !== xov) C.dir[ov] = xav > xov ? 1 : -1 }
      C.atacar(ov, av, longe, false, C.menos ? 0 : (ov % 3) * 35) // CASCATA: os golpes de um pelotão saem com 0, 35 ou 70 ms de defasagem, nunca todos no mesmo quadro
    }
  }
  B.tipoDe = (id) => tipos[id] || null

  /** Avança o relógio da luta. Devolve quantos ms de animação passaram neste quadro. */
  B.avancar = (dtReal, agora) => {
    if (!B.ativa) return dtReal
    if (B.fimEm) { if (agora >= B.fimEm) { B.ativa = false; C.emLuta = false; const r = B.resultado, f = B.aoFim; B.aoFim = null; f?.(r) } return dtReal }
    if (B.preludioAte) { if (agora < B.preludioAte - (B.vel > 1 ? 900 : 0)) return dtReal; comecarLuta() }
    if (agora < B.pausaAte) return 0 // pausa de impacto: o mundo inteiro segura
    B.lento = agora < B.lentoAte; if (B.lento) C.med.lentoMs += dtReal
    const fator = B.vel * (B.vel === 1 ? B.ritmo : 1) * (B.lento ? 0.5 : 1)
    C.tb += dtReal * fator / 100; fatorAgora = fator
    const ev = B.ev
    if (!B.silencio) antever()
    while (B.i < ev.length && ev[B.i][0] <= C.tb) { const e = ev[B.i++]; if (e[1] === 'n') tipos[e[2]] = e[4]; evento(e, agora); if (B.fimEm) break }
    if (agora - ultimoFundo > 400 && chocou && !B.fimEm) { ultimoFundo = agora; Som.fundoBatalha(Math.min(1, (B.aliados + Math.min(B.inimigos, nascidosInv)) / 36)) }
    // câmera segue a frente da horda (só no PC; até 24 px/s — a cena limita)
    if (C.tipo === 'pc') { let fr = -1e9; for (let i = 0; i < C.n; i++) if (C.lado[i] === 1 && C.est[i] === 1 && C.sx[i] > fr) fr = C.sx[i]; C.cam.alvo = fr > -1e8 ? Math.max(C.camMin, Math.min(C.camMax, fr - C.VW * 0.45)) : 0 }
    return dtReal * Math.min(fator, 2)
  }
  /** Leva a luta ao fim na hora, sem festa (gancho de teste e "pular"). */
  B.pular = () => {
    if (!B.ativa || B.fimEm) return
    if (B.preludioAte) comecarLuta()
    B.silencio = true; B.pausaAte = 0
    const ev = B.ev
    while (B.i < ev.length) { const e = ev[B.i++]; if (e[1] === 'n') tipos[e[2]] = e[4]; C.tb = e[0]; evento(e, performance.now()) }
    Som.fundoBatalha(0)
  }
  B.parar = () => { B.preludioAte = 0; C.marcha = false; C.gritoT = -1e9; B.ativa = false; B.aoFim = null; C.emLuta = false; C.noite = 0; C.cam.alvo = 0; Som.fundoBatalha(0) }
  return B
}
