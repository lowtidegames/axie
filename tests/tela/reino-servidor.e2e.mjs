// Keepmile — teste de tela do MODO SERVIDOR (Chrome de verdade). Sobe o servidor de verdade (server/index.mjs) num banco temporário,
// em porta livre, e abre http://127.0.0.1:<porta>/public/reino/. Confere: a tela escolhe o modo servidor sozinha e cria a conta sem
// perguntar nada (guardada no aparelho); treino jogado por toque com cada comando conferido contra o servidor (seq e visão iguais);
// rede cortada no meio (offline, e resposta perdida DEPOIS de o servidor aplicar): "RECONNECTING...", o mesmo seq de novo, nada
// duplicado; recarregar no meio volta à partida do servidor; seq velho → a tela recarrega do servidor; 429, manutenção e só leitura
// viram aviso curto e a tela segue jogável; ranking gasta energia ("2/9" e quando volta); estrada do dia fora do placar com o motivo
// em 1 linha, e a 2ª tentativa diz "available tomorrow"; ranking da temporada, placar do dia, perfil, álbum e conquistas vindos do
// servidor; replay em páginas (?desde=) na tela de batalha, com botão de sair; replay da própria estrada de hoje → "available
// tomorrow". No dia seguinte (relógio do servidor de teste), a MESMA conta no PC entra no placar do dia e a tela só então diz a posição.
// Nada cortado em 320×568, 360×740, 390×844, 1280×720 e 740×360; toque ≥ 44 px; Reduced motion sem tremida nem flash.
// Fotos em tests/tela/fotos/reino/servidor-*.png.
// Rode pela trava:  node tools/trava-robos.mjs rodar "timeout 900 node tests/tela/reino-servidor.e2e.mjs"
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { iniciar } from '../../server/index.mjs'
import { T } from '../../public/reino/js/textos.js'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const FOTOS = path.join(AQUI, 'fotos', 'reino')
fs.mkdirSync(FOTOS, { recursive: true })

const falhas = []
let conferencias = 0
const falha = (m) => { falhas.push(m); console.log('FALHA: ' + m) }
const confere = (ok, m) => { conferencias++; if (!ok) falha(m); else console.log('  ok: ' + m) }

const DIA = 86_400_000
const relogio = { desvio: 0 }
const agora = () => Date.now() + relogio.desvio
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'keepmile-e2e-servidor-'))
const folga = { pedidosPorConta: { max: 100_000, janelaMs: 60_000 }, pedidosPorIp: { max: 100_000, janelaMs: 60_000 }, contasPorIp: { max: 1000, janelaMs: 60_000 } }
const reinoFolgado = { partidasPorConta: { max: 100_000, janelaMs: 3_600_000 }, partidasPorIp: { max: 100_000, janelaMs: 3_600_000 }, replaysPorConta: { max: 100_000, janelaMs: 60_000 }, replaysPorIp: { max: 100_000, janelaMs: 60_000 }, replayPassosPorPagina: 3 }
const s = await iniciar({ dbPath: path.join(pasta, 'keepmile-e2e.db'), porta: 0, agora, log: () => {}, limites: folga, reino: { params: reinoFolgado } })
const base = `http://127.0.0.1:${s.porta}`
const URL_JOGO = `${base}/public/reino/?teste=1`
const browser = await chromium.launch()

/** Pedido direto ao servidor (fora da tela), para conferir o que ELE guardou. */
async function api(metodo, caminho, token, corpo) {
  const r = await fetch(base + caminho, { method: metodo, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: corpo !== undefined ? JSON.stringify(corpo) : undefined })
  let json = null
  try { json = await r.json() } catch { /* ok */ }
  return { status: r.status, json }
}
/** Um robô de fora joga uma partida de ranking até o fim pela API (para o ranking ter mais gente). */
async function roboDeRanking(apelido, rodadasComCarta) {
  const c = (await api('POST', '/api/conta', null, { apelido })).json
  let p = (await api('POST', '/api/reino/partida', c.token, { modo: 'ranking' })).json
  for (let n = 0; n < 400 && p.status === 'aberta'; n++) {
    const o = p.opcoes, v = p.visao
    let cmd = o.fase === 'espolio' ? o.comandos.find((x) => x.tipo === 'espolio') : null
    if (!cmd && !v.cartaPosta && v.rodada <= rodadasComCarta) { const por = o.comandos.filter((x) => x.tipo === 'por'); cmd = por.find((x) => !v.terrenos[x.terreno - 1]) || por[0] }
    p = (await api('POST', '/api/reino/partida/comando', c.token, { partida: p.id, seq: p.seq, comando: cmd || { tipo: 'batalhar' } })).json
  }
  return c
}

const K = (page, f, arg) => page.evaluate(f, arg)
const modelo = (page) => page.evaluate(() => window.__keepmile.modelo())
const srv = (page) => page.evaluate(() => window.__keepmile.servidor())
const espera = (page, f, arg, ms = 15_000) => page.waitForFunction(f, arg, { timeout: ms })
const texto = (page, sel) => page.evaluate((q) => { const e = document.querySelector(q); return e ? e.textContent : null }, sel)

/** Nada sai da tela: a caixa aberta cabe na largura, sem rolagem lateral, e todo botão dela tem 44 px de toque. */
async function medirTela(page, nome) {
  const r = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, caixa = document.getElementById('telaCaixa'), out = []
    const c = caixa.getBoundingClientRect()
    if (c.left < -0.5 || c.right > vw + 0.5 || c.top < -0.5 || c.bottom > vh + 0.5) out.push(`caixa fora: ${Math.round(c.left)},${Math.round(c.top)}-${Math.round(c.right)},${Math.round(c.bottom)} em ${vw}x${vh}`)
    if (caixa.scrollWidth > caixa.clientWidth + 1) out.push(`caixa com rolagem lateral ${caixa.scrollWidth} > ${caixa.clientWidth}`)
    if (document.documentElement.scrollWidth > vw + 1) out.push('página com rolagem lateral')
    for (const e of caixa.querySelectorAll('button, canvas, p, li')) { const b = e.getBoundingClientRect(); if (b.width && (b.left < c.left - 0.5 || b.right > c.right + 0.5)) out.push(`${e.tagName}#${e.id} sai da caixa (${Math.round(b.left)}-${Math.round(b.right)} / ${Math.round(c.left)}-${Math.round(c.right)})`) }
    for (const b of caixa.querySelectorAll('button')) { const q = b.getBoundingClientRect(); if (q.width < 43.5 || q.height < 43.5) out.push(`botão #${b.id} com ${Math.round(q.width)}x${Math.round(q.height)}`) }
    return out
  })
  confere(r.length === 0, `${nome}: nada cortado e toque >= 44 px` + (r.length ? ' — ' + r.slice(0, 4).join('; ') : ''))
}

function abrirContexto({ w, h, toque }, sessao = null) {
  return browser.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: 1 }).then(async (ctx) => {
    if (sessao) await ctx.addInitScript((v) => { try { localStorage.setItem('keepmile_sessao_v1', v) } catch { /* ok */ } }, sessao)
    return ctx
  })
}
function vigiar(page, erros, pedidos) {
  // recurso que falhou de propósito (409, 429, 503, rede cortada) aparece no console do Chrome: é o esperado; qualquer outro erro conta
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) erros.push('console: ' + m.text().slice(0, 200)) })
  page.on('pageerror', (e) => erros.push('erro de página: ' + e.message))
  page.on('response', async (r) => {
    const u = new URL(r.url()); if (!u.pathname.startsWith('/api/')) { if (r.status() >= 400) erros.push(`${r.status()} ${u.pathname}`); return }
    const reg = { metodo: r.request().method(), caminho: u.pathname + u.search, status: r.status(), codigo: null, repetido: false }
    pedidos.push(reg)
    try { const j = await r.json(); reg.codigo = j?.erro?.codigo ?? null; reg.repetido = j?.repetido === true } catch { /* sem corpo */ }
  })
}

// =============================================================== CELULAR (dia 1): conta, treino, rede, erros, ranking, estrada, perfil, replay
async function celular() {
  console.log('\n=== celular 360x740 (dia 1) ===')
  const ctx = await abrirContexto({ w: 360, h: 740, toque: true })
  const page = await ctx.newPage(), erros = [], pedidos = []
  vigiar(page, erros, pedidos)
  const foto = async (nome) => { const arq = path.join(FOTOS, `servidor-${nome}.png`); await page.screenshot({ path: arq }); console.log('  foto: ' + path.relative(process.cwd(), arq)) }
  const tap = (sel) => page.locator(sel).first().tap()
  const token = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('keepmile_sessao_v1'))).token
  const doServidor = async (modo) => (await api('GET', '/api/reino/partida' + (modo ? '?modo=' + modo : ''), await token())).json
  const igualAoServidor = async (rot) => {
    const [lado, tela, v] = [await doServidor((await srv(page)).modo), await srv(page), await K(page, () => window.__keepmile.visao())]
    confere(!!lado.partida && lado.partida.id === tela.id && lado.partida.seq === tela.seq, `${rot}: partida e seq iguais aos do servidor (seq ${tela.seq})`)
    confere(!!lado.partida && JSON.stringify(lado.partida.visao) === JSON.stringify(v), `${rot}: a visão da tela é a do servidor`)
  }
  /** Escolhe a carta 0 e toca num terreno vazio (toques de verdade). Devolve o terreno. */
  const porCartaPorToque = async () => {
    await espera(page, () => window.__keepmile.fase() === 'carta' && !window.__keepmile.servidor().ocupado)
    await tap('#bt-carta0')
    const k = await K(page, () => { const q = window.__keepmile, carta = q.modelo().mao[0].carta, v = q.visao(), por = q.opcoes().comandos.filter((c) => c.tipo === 'por' && c.carta === carta); return (por.find((c) => !v.terrenos[c.terreno - 1]) || por.find((c) => v.terrenos[c.terreno - 1]?.carta === carta) || por[0]).terreno })
    const troca = await K(page, (t) => { const q = window.__keepmile, x = q.visao().terrenos[t - 1]; return !!x && x.carta !== q.modelo().mao[0].carta }, k)
    await tap('#bt-terreno' + k)
    if (troca) { await page.waitForTimeout(450); await tap('#bt-terreno' + k) } // terreno ocupado por outra carta: "REPLACE?" pede o 2º toque
    return k
  }
  const fecharTela = async () => { if (await page.evaluate(() => !document.getElementById('tela').hidden)) { await page.keyboard.press('Escape'); await espera(page, () => document.getElementById('tela').hidden) } }
  const abrirMenu = async () => { await fecharTela(); await tap('#bt-menu'); await espera(page, () => document.getElementById('tela').dataset.tela === 'menu' && !document.getElementById('tela').hidden) }
  const abrirTela = async (botao, nome) => { await abrirMenu(); await tap(botao); await espera(page, (n) => document.getElementById('tela').dataset.tela === n && !document.getElementById('telaCarregando'), nome) }

  // ---- 1. conta sem atrito
  await page.goto(URL_JOGO)
  await espera(page, () => document.documentElement.dataset.pronto === '1' && window.__keepmile?.pronto)
  let e = await srv(page)
  confere(e.on && e.api === `${base}/api/reino/`, 'a tela escolheu o modo servidor sozinha e a API fica na mesma raiz da página')
  confere(e.temToken && /^Keeper \d{5}$/.test(e.apelido || ''), `conta criada na 1ª visita, sem perguntar nada (${e.apelido})`)
  const perfil0 = (await api('GET', '/api/reino/perfil', await token())).json
  confere(perfil0.apelido === e.apelido, 'o token guardado no aparelho é o da conta que o servidor criou')
  confere(e.modo === 'treino' && e.seq === 0 && (await modelo(page)).fase === 'carta', 'abre direto num treino do servidor, já com as 3 cartas')
  confere((await modelo(page)).modoRot === T.srv.modo.treino, 'o HUD diz o modo (TRAINING)')
  confere(pedidos.filter((p) => p.metodo === 'POST' && p.caminho === '/api/conta').length === 1, 'uma conta só foi criada')
  await igualAoServidor('começo')

  // ---- 2. treino por toque, comando a comando
  const k1 = await porCartaPorToque()
  await espera(page, () => window.__keepmile.servidor().seq === 1)
  confere((await K(page, () => window.__keepmile.visao())).terrenos[k1 - 1] != null, `a carta posta por toque está no terreno ${k1} (resposta do servidor)`)
  await igualAoServidor('depois de pôr a carta')
  await tap('#bt-lutar')
  await espera(page, () => window.__keepmile.fase() === 'luta')
  await K(page, () => window.__keepmile.avancarBatalha())
  await espera(page, () => ['vitoria', 'derrota'].includes(window.__keepmile.fase()))
  const luta = await K(page, () => window.__keepmile.ultimaLuta())
  confere(luta && luta.tela === luta.motor, `a luta que a tela mostrou deu o que o servidor decidiu (${luta?.motor ? 'vitória' : 'derrota'})`)
  await igualAoServidor('depois da luta')
  // sai da vitória/derrota pelo jogador simples (só manda o que está em opcoes.comandos) até a próxima escolha de carta
  await K(page, () => window.__keepmile.jogarNoServidor({ ateRodada: 1 }))
  await igualAoServidor('rodada seguinte')
  confere((await K(page, () => window.__keepmile.erros())).length === 0, 'nenhuma divergência entre a tela e o servidor até aqui')

  // ---- 3. rede cortada: offline (o pedido nem sai)
  let antes = (await srv(page)).seq
  await ctx.setOffline(true)
  await porCartaPorToque()
  await espera(page, () => window.__keepmile.modelo().status?.rede === true)
  confere((await modelo(page)).status.texto === T.srv.rede, 'rede cortada: aviso curto "RECONNECTING..."')
  confere((await K(page, () => window.__keepmile.desenhou())).includes('status'), 'o aviso está desenhado na tela')
  { const m = await modelo(page), css = (await K(page, () => window.__keepmile.css())).css; confere(m.statusRet && m.statusRet.x >= 0 && (m.statusRet.x + m.statusRet.w) * css <= 360.5, 'o aviso cabe na largura do celular') }
  await foto('reconectando-celular')
  confere((await srv(page)).seq === antes && (await srv(page)).ocupado, 'enquanto a rede não volta, a jogada fica esperando (não se perde)')
  await ctx.setOffline(false)
  await espera(page, (a) => window.__keepmile.servidor().seq === a + 1, antes)
  await igualAoServidor('rede de volta')
  confere((await doServidor('treino')).partida.seq === antes + 1, 'a jogada valeu UMA vez no servidor')
  await espera(page, () => !window.__keepmile.modelo().status, null, 6000)
  confere(true, 'o aviso de rede some sozinho')

  // ---- 3b. resposta perdida DEPOIS de o servidor aplicar: a tela repete o MESMO seq e o servidor devolve a resposta guardada
  await K(page, () => window.__keepmile.jogarNoServidor({ ateRodada: 1 }))
  antes = (await srv(page)).seq
  let cortes = 0
  await page.route('**/api/reino/partida/comando', async (rota) => { if (cortes++ === 0) { try { await rota.fetch() } catch { /* ok */ } await rota.abort('connectionreset') } else await rota.continue() })
  const marca = pedidos.length
  await porCartaPorToque()
  await espera(page, (a) => window.__keepmile.servidor().seq === a + 1 && !window.__keepmile.servidor().ocupado, antes)
  await page.unroute('**/api/reino/partida/comando')
  await page.waitForTimeout(150)
  const repetidos = pedidos.slice(marca).filter((p) => p.caminho === '/api/reino/partida/comando')
  confere(cortes >= 2 && repetidos.some((p) => p.repetido), 'a resposta se perdeu depois de o servidor aplicar: a tela repetiu o mesmo seq e veio a resposta guardada (repetido)')
  confere((await doServidor('treino')).partida.seq === antes + 1, 'nada duplicado: o servidor andou 1 seq só')
  await igualAoServidor('depois da repetição')
  confere((await K(page, () => window.__keepmile.erros())).length === 0, 'sem divergência depois da rede cortada')

  // ---- 4. recarregar no meio volta à partida do servidor
  e = await srv(page)
  await page.reload()
  await espera(page, () => document.documentElement.dataset.pronto === '1' && window.__keepmile?.pronto)
  const e2 = await srv(page)
  confere(e2.id === e.id && e2.seq === e.seq && e2.apelido === e.apelido, `recarregar: a mesma conta e a mesma partida, no mesmo seq (${e2.seq})`)
  await igualAoServidor('depois de recarregar')
  confere((await modelo(page)).fase === 'carta' && (await modelo(page)).cartaPosta === true, 'a carta posta antes de recarregar continua posta')

  // ---- 5. seq velho (a partida andou por fora): a tela recarrega do servidor
  { const p = (await doServidor('treino')).partida, tk = await token()
    const r = await api('POST', '/api/reino/partida/comando', tk, { partida: p.id, seq: p.seq, comando: { tipo: 'batalhar' } })
    let q = r.json
    if (q.status === 'aberta') q = (await api('POST', '/api/reino/partida/comando', tk, { partida: p.id, seq: q.seq, comando: q.opcoes.comandos.find((c) => c.tipo === 'espolio' || c.tipo === 'batalhar') })).json
    const m0 = pedidos.length
    await tap('#bt-lutar')
    await espera(page, (alvo) => window.__keepmile.servidor().seq === alvo && !window.__keepmile.servidor().ocupado, q.seq)
    await page.waitForTimeout(100)
    confere(pedidos.slice(m0).some((x) => /^SEQ_/.test(x.codigo || '')), 'o servidor recusou o seq velho (SEQ_ANTIGA / SEQ_JA_USADA)')
    await igualAoServidor('depois do seq velho')
    const avisou = await espera(page, () => window.__keepmile.festas().log.some((l) => l.texto && /RUN RESUMED/.test(l.texto)), null, 8000).then(() => true, () => false)
    confere(avisou, 'a tela avisa que voltou à partida do servidor')
  }

  // ---- 6. erros do contrato viram aviso curto e a tela segue jogável
  await K(page, () => window.__keepmile.jogarNoServidor({ ateRodada: 1 }))
  antes = (await srv(page)).seq
  await page.route('**/api/reino/partida/comando', (rota) => rota.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ erro: { codigo: 'MUITOS_PEDIDOS', motivo: 'Muitos pedidos. Espere um pouco.' } }) }))
  const k429 = await porCartaPorToque()
  await espera(page, () => window.__keepmile.modelo().status?.codigo === 'MUITOS_PEDIDOS')
  confere((await modelo(page)).status.texto === T.srv.erro.MUITOS_PEDIDOS.toUpperCase(), '429 simulado vira aviso curto em inglês: "TOO MANY REQUESTS. WAIT A MOMENT."')
  confere((await srv(page)).seq === antes && !(await srv(page)).ocupado, 'depois do 429 a tela não fica travada (nada foi aplicado)')
  await page.unroute('**/api/reino/partida/comando')
  await page.waitForTimeout(450)
  await tap('#bt-terreno' + k429) // a carta continua escolhida: basta tocar o terreno de novo
  await espera(page, (a) => window.__keepmile.servidor().seq === a + 1, antes)
  confere(true, 'a mesma jogada passa na tentativa seguinte')
  process.env.SAVE_SO_LEITURA = '1'
  await tap('#bt-lutar')
  await espera(page, () => window.__keepmile.modelo().status?.codigo === 'SO_LEITURA')
  delete process.env.SAVE_SO_LEITURA
  confere((await modelo(page)).status.texto === T.srv.erro.SO_LEITURA.toUpperCase() && (await modelo(page)).fase === 'carta', 'só leitura: aviso curto e a partida fica onde estava')
  process.env.MANUTENCAO = '1'
  await abrirMenu(); await tap('#mRanking')
  await espera(page, () => !!document.getElementById('telaErro'))
  confere((await texto(page, '#telaErro')) === T.srv.erro.MANUTENCAO, 'manutenção: a tela do ranking mostra "Maintenance. Back soon." e um "Try again"')
  delete process.env.MANUTENCAO
  await tap('#telaDeNovo')
  await espera(page, () => !!document.getElementById('rankTemporada'))
  confere(true, '"Try again" carrega o ranking quando a manutenção acaba')
  await fecharTela()

  // ---- 7. fim do treino, com o que o servidor gravou
  await K(page, () => window.__keepmile.jogarNoServidor({ semCarta: true }))
  await espera(page, () => window.__keepmile.fase() === 'fim' && window.__keepmile.modelo().fim?.contou, null, 20_000)
  const perfil1 = (await api('GET', '/api/reino/perfil', await token())).json
  let fim = (await modelo(page)).fim
  confere(perfil1.melhores.length === 1 && fim.pontos === perfil1.melhores[0].pontos && fim.vencidas === perfil1.melhores[0].vencidas, `fim: pontos e rodadas são os que o servidor gravou (${fim.pontos} / ${fim.vencidas})`)
  confere(fim.novoRecorde === (perfil1.recordes.pontos > 0) && fim.recorde === perfil1.recordes.pontos, 'o recorde do fim é o do perfil do servidor')
  await espera(page, (n) => window.__keepmile.modelo().fim.liga.nome === n, T.srv.semLiga)
  confere(true, 'sem partida de ranking, o fim não inventa liga (UNRANKED)')
  confere((await K(page, () => window.__keepmile.erros())).length === 0, 'treino inteiro sem divergência nem erro')
  const idTreino = (await srv(page)).id
  await tap('#bt-denovo')
  await espera(page, (id) => window.__keepmile.servidor().id !== id && window.__keepmile.fase() === 'carta', idTreino)
  confere((await srv(page)).modo === 'treino', 'PLAY AGAIN abre outro treino num toque')

  // ---- 8. menu e escolha de modo; ranking gasta energia
  await Promise.all([roboDeRanking('Old Ember', 6), roboDeRanking('Miss Crow', 3), roboDeRanking('Uncle Malt', 0)])
  await abrirMenu()
  confere((await texto(page, '#mLiga')).includes(e.apelido), 'o menu mostra o nome da conta')
  await medirTela(page, 'menu')
  await foto('menu-celular')
  await espera(page, () => !window.__keepmile.modelo().status, null, 8000)
  await tap('#mJogar')
  await espera(page, () => !!document.getElementById('jRanking'))
  confere((await texto(page, '#jRanking')).includes('3/9') && (await texto(page, '#telaEnergia')).startsWith(T.srv.energia(3, 9)), 'escolha de modo: a energia de ranking aparece como 3/9')
  confere(/ \+3 in (\d+h )?\d+m$/.test(await texto(page, '#telaEnergia')), `e diz quando volta (${await texto(page, '#telaEnergia')})`)
  { const falta = Date.parse(perfil1.energia.recarregaEm) - Date.now(), dito = (await texto(page, '#telaEnergia')).split('in ')[1]; confere([T.srv.em(falta), T.srv.em(falta - 60_000), T.srv.em(falta + 60_000)].includes(dito), 'o tempo da recarga é o do servidor') }
  confere(!/buy|pay|price|\$|prize|reward/i.test(await texto(page, '#telaCaixa')), 'nada de compra nem de prêmio na escolha de modo')
  await medirTela(page, 'escolha de modo')
  await foto('energia-celular')
  await tap('#jRanking')
  await espera(page, () => window.__keepmile.servidor().modo === 'ranking' && document.getElementById('tela').hidden)
  e = await srv(page)
  confere(e.energia.atual === 2 && (await api('GET', '/api/reino/perfil', await token())).json.energia.atual === 2, 'abrir a partida de ranking gastou 1 energia (2/9, igual no servidor)')
  confere((await modelo(page)).modoRot === T.srv.modo.ranking, 'o HUD diz RANKED')
  await K(page, () => window.__keepmile.jogarNoServidor({ ateRodada: 3 }))
  await K(page, () => window.__keepmile.jogarNoServidor({ semCarta: true }))
  await espera(page, () => window.__keepmile.fase() === 'fim' && window.__keepmile.modelo().fim?.contou, null, 20_000)
  await espera(page, () => /^RANK \d+$/.test(window.__keepmile.modelo().fim.liga.marca || ''))
  fim = (await modelo(page)).fim
  const rk1 = (await api('GET', '/api/reino/ranking', await token())).json
  confere(fim.liga.marca === T.srv.posicaoMarca(rk1.voce.posicao) && fim.media === rk1.voce.pontos, `fim do ranking: posição e média da temporada vêm do servidor (${rk1.voce.posicao}º, ${rk1.voce.pontos})`)
  confere(fim.amigo?.texto === T.srv.energiaCurta(2, 9), 'e a energia que sobrou (2/9)')

  // ---- 9. ranking da temporada
  await abrirTela('#mRanking', 'ranking')
  { const t = await texto(page, '#rankTemporada'), falta = Date.parse(rk1.temporada.termina) - Date.now()
    confere([falta, falta - 60_000, falta + 60_000].some((f) => t === T.srv.ranking.temporada(rk1.temporada.numero, T.srv.em(f))), `temporada: o tempo que falta é o do servidor (${t})`)
    confere((await texto(page, '#rankVoce')) === T.srv.ranking.voce(rk1.voce.posicao, rk1.voce.pontos), 'a posição e os pontos da conta são os do servidor')
    confere((await texto(page, '#rankRegra')) === T.srv.ranking.regra(3), 'a regra em 1 linha: média das 3 melhores')
    const linhas = await page.evaluate(() => [...document.querySelectorAll('#listaTopo li')].map((li) => li.textContent))
    confere(linhas.length === rk1.lista.length && rk1.lista.every((l, i) => linhas[i].includes(l.apelido) && linhas[i].includes(String(l.pontos))), `o topo mostra as ${rk1.lista.length} contas do servidor, na ordem dele`)
    confere((await page.evaluate(() => document.querySelectorAll('#listaTopo li.km-feita').length)) === 1, 'a linha da conta está marcada')
    confere((await page.evaluate(() => document.querySelectorAll('#listaLigas li').length)) === rk1.ligas.length, 'os títulos são os que o servidor mandou')
    confere(!/prize|reward|\$|earn|token/i.test(await texto(page, '#telaCaixa')), 'nenhuma promessa de prêmio no ranking')
    confere((await page.evaluate(() => document.querySelectorAll('#telaCaixa .km-letra canvas').length)) > 10, 'a tela do ranking está na letra em pixel do jogo')
  }
  await medirTela(page, 'ranking')
  await foto('ranking-celular')

  // ---- 10. estrada do dia: conta nova fica fora do placar, com o motivo em 1 linha; 2ª tentativa → amanhã
  await abrirTela('#mJogar', 'jogar')
  confere((await texto(page, '#jogarFora')) === T.srv.foraFrase.CONTA_NOVA, 'antes de jogar a estrada, a tela já diz que a conta nova fica fora do placar de hoje')
  await tap('#jEstrada')
  await espera(page, () => window.__keepmile.servidor().modo === 'estrada' && document.getElementById('tela').hidden)
  e = await srv(page)
  confere(e.fora?.codigo === 'CONTA_NOVA' && (await modelo(page)).info?.[0] === '#' + T.srv.fora.CONTA_NOVA, 'na estrada: o motivo de estar fora do placar em 1 linha')
  confere((await modelo(page)).modoRot === T.srv.modo.estrada, 'o HUD diz DAILY ROAD')
  await page.waitForTimeout(900)
  await foto('estrada-celular')
  await K(page, () => window.__keepmile.jogarNoServidor({ ateRodada: 2 }))
  await K(page, () => window.__keepmile.jogarNoServidor({ semCarta: true }))
  await espera(page, () => window.__keepmile.fase() === 'fim' && window.__keepmile.modelo().fim?.contou, null, 20_000)
  await page.waitForTimeout(400)
  fim = (await modelo(page)).fim
  confere(fim.amigo?.texto === T.srv.fora.CONTA_NOVA && !/RANK \d/.test(fim.amigo.texto), 'fim da estrada: diz que está fora do placar e por quê; não diz posição')
  await tap('#bt-denovo')
  await espera(page, () => document.getElementById('tela').dataset.tela === 'jogar' && !!document.getElementById('jEstrada'))
  confere((await texto(page, '#jEstrada')).includes(T.srv.jogar.estradaFeita), 'depois de jogar: "Done today. Available tomorrow."')
  { const m0 = pedidos.length
    await tap('#jEstrada')
    await espera(page, () => !!document.getElementById('jogarAviso'))
    confere((await texto(page, '#jogarAviso')) === T.srv.erro.ESTRADA_JA_JOGADA && pedidos.slice(m0).some((p) => p.codigo === 'ESTRADA_JA_JOGADA' && p.status === 409), '2ª tentativa da estrada: o servidor recusa (409) e a tela diz "available tomorrow"')
  }
  // placar do dia: a conta não está nele, e a tela não diz que está
  await fecharTela(); await abrirTela('#mPlacar', 'placar')
  { const rk = (await api('GET', '/api/reino/ranking', await token())).json, ed = rk.estradaDoDia
    confere(ed.voce && ed.voce.posicao === null && !ed.lista.some((l) => l.apelido === e.apelido), 'o servidor não pôs a conta no placar de hoje')
    confere((await texto(page, '#placarVoce')) === T.srv.placar.fora(ed.voce.pontos) && (await texto(page, '#placarFora')) === T.srv.foraFrase.CONTA_NOVA, 'placar do dia: "not on the board" e o motivo')
    confere((await page.evaluate(() => document.querySelectorAll('#listaPlacar li.km-feita').length)) === 0 && !(await texto(page, '#listaPlacar')).includes(e.apelido), 'a conta não aparece marcada nem listada no placar')
    confere(!!(await texto(page, '#placarFeita')) && !(await page.evaluate(() => !!document.getElementById('placarJogar'))), 'sem botão de jogar a estrada de novo hoje')
  }
  await medirTela(page, 'placar do dia')

  // ---- 11. perfil, álbum e conquistas vindos do servidor
  await fecharTela(); await abrirMenu(); await tap('#mLiga')
  await espera(page, () => !!document.getElementById('perfilRecordes'))
  const perfil2 = (await api('GET', '/api/reino/perfil', await token())).json
  confere((await texto(page, '#perfilRecordes')) === T.srv.perfil.recordes(perfil2.recordes.pontos, perfil2.recordes.rodadasVencidas, perfil2.recordes.partidas), 'perfil: recordes do servidor')
  confere((await texto(page, '#perfilTopo')).includes(perfil2.apelido), 'perfil: o nome da conta')
  { const ids = await page.evaluate(() => [...document.querySelectorAll('#listaMelhores li')].map((li) => li.dataset.partida)); confere(JSON.stringify(ids) === JSON.stringify(perfil2.melhores.map((m) => m.id)), `perfil: as ${ids.length} melhores partidas do servidor, na ordem dele`) }
  await medirTela(page, 'perfil')
  await foto('perfil-celular')
  await tap('#perfilAlbum')
  await espera(page, () => !!document.getElementById('albumConta'))
  confere((await texto(page, '#albumConta')).startsWith(`${perfil2.album.liberadas.length} / ${perfil2.album.total}`) && (await page.evaluate(() => document.querySelectorAll('#albumGrade [data-livre="1"]').length)) === perfil2.album.liberadas.length, `álbum: ${perfil2.album.liberadas.length} cartas liberadas, as do servidor`)
  confere((await texto(page, '#albumConta')).includes(T.album.somadas(perfil2.album.rodadasVencidas)), 'álbum: as rodadas vencidas somadas são as do servidor')
  { const w = await page.evaluate(() => document.querySelector('.km-barra i').getBoundingClientRect().width); confere(perfil2.album.rodadasVencidas === 0 || w > 0, 'a barra do álbum anda (o estilo passa pela regra de segurança do servidor)') }
  await medirTela(page, 'álbum')
  await fecharTela(); await abrirTela('#mConquistas', 'conquistas')
  { const feitas = perfil2.conquistas.filter((c) => c.feita).map((c) => c.id).sort(), naTela = (await page.evaluate(() => [...document.querySelectorAll('#listaConquistas li.km-feita')].map((li) => li.dataset.id))).sort()
    confere(JSON.stringify(feitas) === JSON.stringify(naTela), `conquistas: as ${feitas.length} que o servidor marcou`) }

  // ---- 12. replay: a própria estrada de hoje → "available tomorrow"; a de ranking passa na tela de batalha, em páginas
  await fecharTela(); await abrirMenu(); await tap('#mLiga')
  await espera(page, () => !!document.querySelector('.km-ver'))
  { const m0 = pedidos.length
    await tap('.km-ver[data-modo="estrada"]')
    await espera(page, () => !!document.querySelector('#perfilAviso p'))
    confere((await texto(page, '#perfilAviso')) === T.srv.erro.ESTRADA_DE_HOJE && pedidos.slice(m0).some((p) => p.codigo === 'ESTRADA_DE_HOJE' && p.status === 409), 'replay da própria estrada de hoje: 409 → "available tomorrow"')
  }
  const idRanking = perfil2.melhores.find((m) => m.modo === 'ranking').id
  { const m0 = pedidos.length
    await tap(`.km-ver[data-partida="${idRanking}"]`)
    await espera(page, () => !!window.__keepmile.modelo().replay && document.getElementById('tela').hidden)
    const paginas = pedidos.slice(m0).filter((p) => p.caminho.startsWith('/api/reino/replay/' + idRanking))
    confere(paginas.length > 1 && paginas.slice(1).every((p) => /\?desde=\d+$/.test(p.caminho)), `o replay veio em ${paginas.length} páginas (?desde=)`)
    const rep = await modelo(page), total = (await api('GET', `/api/reino/replay/${idRanking}`, await token())).json.totalPassos
    confere(rep.replay.n === total && rep.replay.nome === e.apelido, `as páginas juntas dão a partida inteira (${total} passos)`)
    confere(rep.modoRot === T.srv.replayRot, 'o HUD diz REPLAY')
    await espera(page, () => window.__keepmile.fase() === 'luta', null, 20_000)
    confere((await K(page, () => window.__keepmile.lutando())), 'o replay passa a luta na tela de batalha')
    await foto('replay-luta-celular')
    const bts = await page.evaluate(() => [...document.querySelectorAll('#toques button')].map((b) => ({ id: b.id, w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height })))
    confere(bts.some((b) => b.id === 'bt-sair-replay') && bts.every((b) => b.w >= 43.5 && b.h >= 43.5) && !bts.some((b) => /carta|terreno|lutar|menu/.test(b.id)), 'no replay só há sair, som e velocidade, com 44 px')
    const seqAntes = (await srv(page)).seq
    await K(page, () => window.__keepmile.avancarBatalha())
    await espera(page, () => window.__keepmile.fase() === 'replay')
    confere(await espera(page, () => window.__keepmile.desenhou().includes('replay'), null, 3000).then(() => true, () => false), 'entre as lutas, a faixa do replay diz de quem é e o passo')
    await foto('replay-celular')
    // até o fim, pulando cada luta
    for (let i = 0; i < 400; i++) { const m = await modelo(page); if (m.replay.fim) break; if (m.fase === 'luta') await K(page, () => window.__keepmile.avancarBatalha()); await page.waitForTimeout(60) }
    const fimR = (await modelo(page)).replay, grav = perfil2.melhores.find((m) => m.id === idRanking)
    confere(fimR.fim === T.srv.replay.fim(grav.vencidas, grav.pontos) && fimR.i === total, `o replay termina no resultado gravado (${fimR.fim})`)
    confere((await srv(page)).seq === seqAntes && pedidos.slice(m0).every((p) => p.metodo === 'GET'), 'assistir não manda comando nenhum')
    await tap('#bt-sair-replay')
    await espera(page, () => !window.__keepmile.modelo().replay)
    confere((await modelo(page)).fase === 'fim' && (await srv(page)).modo === 'estrada', 'sair do replay volta para onde o jogador estava')
  }

  // ---- 13. Reduced motion: aviso e replay sem tremida nem flash
  await K(page, () => { window.__keepmile.guardaSet('menos', true) })
  await page.reload()
  await espera(page, () => document.documentElement.dataset.pronto === '1' && window.__keepmile?.pronto)
  confere((await K(page, () => window.__keepmile.cena())).menos === true && (await srv(page)).modo === 'treino', 'Reduced motion ligado; sem partida aberta, recarregar abre um treino')
  await K(page, () => { window.__keepmile.zerarMedidas(); window.__keepmile.avisarServidor('MUITOS_PEDIDOS') })
  await K(page, () => window.__keepmile.jogarNoServidor({ ateRodada: 2 }))
  await page.waitForTimeout(300)
  { const c = await K(page, () => window.__keepmile.cena()); confere(c.tremidaMax === 0 && c.flashes.length === 0, 'Reduced motion: aviso e rodada sem tremida nem flash') }
  await K(page, () => { window.__keepmile.guardaSet('menos', false) })

  confere(erros.length === 0, 'celular: zero erro de console e zero 404' + (erros.length ? ' — ' + erros.slice(0, 5).join(' | ') : ''))
  const sessao = await page.evaluate(() => localStorage.getItem('keepmile_sessao_v1'))
  await ctx.close()
  return { sessao, apelido: e.apelido }
}

// =============================================================== PC (dia seguinte, MESMA conta): energia que volta, placar do dia com a conta, replay da estrada de ontem
async function pc({ sessao, apelido }) {
  console.log('\n=== pc 1280x720 (dia 2, a mesma conta) ===')
  relogio.desvio += DIA
  const ctx = await abrirContexto({ w: 1280, h: 720, toque: false }, sessao)
  const page = await ctx.newPage(), erros = [], pedidos = []
  vigiar(page, erros, pedidos)
  const foto = async (nome) => { const arq = path.join(FOTOS, `servidor-${nome}.png`); await page.screenshot({ path: arq }); console.log('  foto: ' + path.relative(process.cwd(), arq)) }
  const token = JSON.parse(sessao).token
  const fecharTela = async () => { if (await page.evaluate(() => !document.getElementById('tela').hidden)) { await page.keyboard.press('Escape'); await espera(page, () => document.getElementById('tela').hidden) } }
  const abrirTela = async (botao, pronto) => { await fecharTela(); await page.click('#bt-menu'); await espera(page, () => document.getElementById('tela').dataset.tela === 'menu' && !document.getElementById('tela').hidden); await page.click(botao); await espera(page, (q) => !!document.querySelector(q), pronto) }
  await page.goto(URL_JOGO)
  await espera(page, () => document.documentElement.dataset.pronto === '1' && window.__keepmile?.pronto)
  let e = await srv(page)
  confere(e.apelido === apelido && pedidos.every((p) => p.caminho !== '/api/conta'), 'a conta guardada no aparelho continua a mesma (nenhuma conta nova)')
  confere(e.energia.atual === 5, 'no dia seguinte a energia voltou: 2 + 3 = 5/9 (número do servidor)')
  // estrada do dia: agora a conta entra no placar, e só então a tela diz a posição
  await abrirTela('#mJogar', '#jEstrada')
  confere(!(await page.evaluate(() => !!document.getElementById('jogarFora'))) && (await texto(page, '#jEstrada')).includes(T.srv.jogar.estradaSub), 'a estrada de hoje está livre de novo e sem aviso de fora do placar')
  await page.click('#jEstrada')
  await espera(page, () => window.__keepmile.servidor().modo === 'estrada' && document.getElementById('tela').hidden)
  confere((await srv(page)).fora === null, 'o servidor não marcou a conta como fora do placar')
  await K(page, () => window.__keepmile.jogarNoServidor({ ateRodada: 2 }))
  await K(page, () => window.__keepmile.jogarNoServidor({ semCarta: true }))
  await espera(page, () => window.__keepmile.fase() === 'fim' && window.__keepmile.modelo().fim?.contou, null, 20_000)
  const rk = (await api('GET', '/api/reino/ranking', token)).json
  await espera(page, (t) => window.__keepmile.modelo().fim.amigo?.texto === t, T.srv.noPlacar(rk.estradaDoDia.voce.posicao))
  confere(rk.estradaDoDia.voce.posicao === 1, 'fim da estrada: a tela só diz "RANK 1 ON THE BOARD" depois que o servidor trouxe a posição da conta')
  await page.waitForTimeout(300)
  await foto('estrada-fim-pc')
  await abrirTela('#mPlacar', '#placarVoce')
  confere((await texto(page, '#placarVoce')) === T.srv.placar.voce(1, rk.estradaDoDia.voce.pontos) && (await page.evaluate(() => document.querySelectorAll('#listaPlacar li.km-feita').length)) === 1, 'placar do dia: a conta aparece e está marcada, com os pontos do servidor')
  await medirTela(page, 'placar do dia (PC)')
  await foto('placar-pc')
  await abrirTela('#mRanking', '#rankTemporada')
  confere((await texto(page, '#telaEnergia')).startsWith(T.srv.energia(5, 9)), 'ranking: a energia do servidor (5/9)')
  await medirTela(page, 'ranking (PC)')
  await foto('ranking-pc')
  // replay da estrada de ONTEM (dia passado: o servidor libera)
  await abrirTela('#mLiga', '.km-ver')
  const perfil = (await api('GET', '/api/reino/perfil', token)).json
  const ontem = perfil.melhores.filter((m) => m.modo === 'estrada').sort((a, b) => a.quando.localeCompare(b.quando))[0]
  await page.click(`.km-ver[data-partida="${ontem.id}"]`)
  await espera(page, () => !!window.__keepmile.modelo().replay && document.getElementById('tela').hidden)
  confere(true, 'a estrada de ontem já pode ser assistida')
  await espera(page, () => window.__keepmile.fase() === 'luta', null, 20_000)
  await page.waitForTimeout(700)
  await foto('replay-pc')
  await page.keyboard.press('Escape')
  await espera(page, () => !window.__keepmile.modelo().replay)
  confere((await modelo(page)).fase === 'fim', 'Esc sai do replay')
  // PLAY AGAIN depois da estrada: abre a escolha de modo (a estrada é uma por dia)
  await page.click('#bt-denovo')
  await espera(page, () => document.getElementById('tela').dataset.tela === 'jogar' && !!document.getElementById('jTreino'))
  await page.click('#jTreino')
  await espera(page, () => window.__keepmile.servidor().modo === 'treino' && window.__keepmile.fase() === 'carta')
  // desistir pelo menu: o servidor grava e a tela mostra o fim dele
  await K(page, () => window.__keepmile.jogarNoServidor({ ateRodada: 2 }))
  const id = (await srv(page)).id
  await page.click('#bt-menu'); await espera(page, () => !!document.getElementById('mNova'))
  await page.click('#mNova'); await page.click('.km-confirma .km-bt--perigo')
  await espera(page, () => window.__keepmile.fase() === 'fim')
  { const r = (await srv(page)).resultado, aberta = (await api('GET', '/api/reino/partida?modo=treino', token)).json
    confere(!!r && (await modelo(page)).fim.pontos === r.pontos && aberta.partida === null && (await srv(page)).id === id, '"New run" do menu desiste no servidor e o fim mostra os pontos gravados') }
  confere((await K(page, () => window.__keepmile.erros())).length === 0, 'PC: nenhuma divergência entre a tela e o servidor')
  confere(erros.length === 0, 'PC: zero erro de console e zero 404' + (erros.length ? ' — ' + erros.slice(0, 5).join(' | ') : ''))
  await ctx.close()
}

// =============================================================== desenho nos 5 tamanhos + começo com o servidor em manutenção
async function desenho({ sessao }) {
  for (const [w, h, toque] of [[320, 568, true], [360, 740, true], [390, 844, true], [1280, 720, false], [740, 360, true]]) {
    console.log(`\n=== desenho ${w}x${h} ===`)
    const ctx = await abrirContexto({ w, h, toque }, sessao)
    const page = await ctx.newPage(), erros = [], pedidos = []
    vigiar(page, erros, pedidos)
    const clique = (sel) => (toque ? page.locator(sel).first().tap() : page.locator(sel).first().click())
    await page.goto(URL_JOGO)
    await espera(page, () => document.documentElement.dataset.pronto === '1' && window.__keepmile?.pronto)
    for (const [botao, pronto, nome] of [[null, '#mJogar', 'menu'], ['#mJogar', '#jEstrada', 'escolha de modo'], ['#mRanking', '#rankTemporada', 'ranking'], ['#mPlacar', '#placarVoce', 'placar do dia'], ['#mLiga', '#perfilRecordes', 'perfil']]) {
      if (await page.evaluate(() => !document.getElementById('tela').hidden)) { await page.keyboard.press('Escape'); await espera(page, () => document.getElementById('tela').hidden) }
      await clique('#bt-menu'); await espera(page, () => document.getElementById('tela').dataset.tela === 'menu' && !document.getElementById('tela').hidden)
      if (botao) { await clique(botao); await espera(page, (q) => !!document.querySelector(q), pronto) }
      await medirTela(page, `${w}x${h} ${nome}`)
    }
    await page.keyboard.press('Escape'); await espera(page, () => document.getElementById('tela').hidden)
    // o aviso de rede e os botões do jogo cabem
    await K(page, () => window.__keepmile.avisarServidor('SO_LEITURA'))
    await page.waitForTimeout(120)
    { const m = await modelo(page), css = (await K(page, () => window.__keepmile.css())).css; confere(!!m.statusRet && m.statusRet.x >= 0 && (m.statusRet.x + m.statusRet.w) * css <= w + 0.5 && (m.statusRet.y + m.statusRet.h) * css <= h, `${w}x${h}: o aviso do servidor cabe na tela`) }
    const bts = await page.evaluate(() => [...document.querySelectorAll('#toques button')].map((b) => { const r = b.getBoundingClientRect(); return { id: b.id, ok: r.width >= 43.5 && r.height >= 43.5 && r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5 } }))
    confere(bts.length > 5 && bts.every((b) => b.ok), `${w}x${h}: botões do jogo com 44 px e dentro da tela` + (bts.every((b) => b.ok) ? '' : ' — ' + bts.filter((b) => !b.ok).map((b) => b.id).join(',')))
    confere(erros.length === 0, `${w}x${h}: zero erro de console` + (erros.length ? ' — ' + erros.slice(0, 3).join(' | ') : ''))
    await ctx.close()
  }
  // começo com o servidor em manutenção: uma tela curta com "Try again", nunca travado
  console.log('\n=== começo em manutenção ===')
  const ctx = await abrirContexto({ w: 360, h: 740, toque: true }, sessao)
  const page = await ctx.newPage(), erros = [], pedidos = []
  vigiar(page, erros, pedidos)
  process.env.MANUTENCAO = '1'
  await page.goto(URL_JOGO)
  await espera(page, () => document.getElementById('tela').dataset.tela === 'falha' && !!document.getElementById('telaErro'))
  confere((await texto(page, '#telaErro')) === T.srv.erro.MANUTENCAO, 'abrir o jogo em manutenção: "Maintenance. Back soon." e "Try again"')
  delete process.env.MANUTENCAO
  await page.locator('#telaDeNovo').tap()
  await espera(page, () => document.documentElement.dataset.pronto === '1' && window.__keepmile?.pronto && window.__keepmile.fase() === 'carta')
  confere((await srv(page)).on, '"Try again" entra no jogo quando o servidor volta')
  confere(erros.length === 0, 'manutenção: zero erro de console' + (erros.length ? ' — ' + erros.slice(0, 3).join(' | ') : ''))
  await ctx.close()
}

let codigo = 0
try {
  const conta = await celular()
  await pc(conta)
  await desenho(conta)
} catch (err) {
  falha('o teste parou: ' + (err?.stack || err))
  for (const c of browser.contexts()) for (const pg of c.pages()) console.log('  estado na parada: ' + JSON.stringify(await pg.evaluate(() => ({ fase: window.__keepmile?.fase(), srv: window.__keepmile?.servidor(), erros: window.__keepmile?.erros(), tela: document.getElementById('tela').hidden ? null : document.getElementById('tela').dataset.tela, v: (({ rodada, fase, cartaPosta, vidas }) => ({ rodada, fase, cartaPosta, vidas }))(window.__keepmile?.visao() || {}) })).catch((e) => String(e))))
} finally {
  delete process.env.MANUTENCAO; delete process.env.SAVE_SO_LEITURA
  await browser.close().catch(() => {})
  s.servidor.closeAllConnections?.()
  await new Promise((ok) => s.servidor.close(ok))
  fs.rmSync(pasta, { recursive: true, force: true })
}
console.log(`\n${conferencias} conferências, ${falhas.length} falha(s)`)
if (falhas.length) { console.log(falhas.map((f) => ' - ' + f).join('\n')); codigo = 1 }
process.exit(codigo)
