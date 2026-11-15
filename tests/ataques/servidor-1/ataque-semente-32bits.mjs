// ATAQUE: a semente tem 128 bits, mas o motor a reduz a 32 bits (hashSemente). Só com o que a tela recebe
// (minhas compras e quem começou), acho o estado do sorteio por força bruta, prevejo a mão do robô e o crítico
// do meu próximo golpe, confiro com o servidor e, no fim, confiro com a semente que o replay entrega.
import { Worker } from 'node:worker_threads'
import os from 'node:os'
import { api, novaConta } from './lib.mjs'
import { criarLuta, aplicarNoLugar, visaoDoTime, comandosValidos } from './sh/batalha.js'
import { jogarTurno } from './sh/robos.js'
import { hashSemente } from '/home/user/wt/servidor/shared/rng.js'

const c = await novaConta()
const time = c.bonecos.slice(0, 3).map((b) => b.id)
const r = await api('POST', '/api/luta', { token: c.token, corpo: { modo: 'livre', time, robo: 'ganancioso' } })
if (r.status !== 201) throw new Error(r.txt)
const L = r.json
const v = L.visao
console.log('luta', L.id, 'começou', v.comecou, 'vez', v.vez, 'chaves da visão:', Object.keys(v).join(','))
const minhas = v.eventos.filter((e) => e.t === 'compra' && e.time === 'A').map((e) => Number(e.carta.slice(2)))
console.log('compras que a tela viu (índices das cartas A):', minhas.join(' '))

// força bruta em paralelo
const N = os.cpus().length, TOTAL = 2 ** 32, passo = Math.ceil(TOTAL / N)
const t0 = Date.now()
const partes = await Promise.all(Array.from({ length: N }, (_, i) => new Promise((ok, falha) => {
  const w = new Worker(new URL('./forca-worker.mjs', import.meta.url), { workerData: { de: i * passo, ate: Math.min(TOTAL, (i + 1) * passo), alvo: minhas, n: 18 } })
  w.on('message', ok); w.on('error', falha)
})))
const candidatos = partes.flat()
console.log(`força bruta: ${candidatos.length} candidatos em ${((Date.now() - t0) / 1000).toFixed(0)} s com ${N} núcleos`)

// confere cada candidato refazendo a luta inteira (robô incluso) e comparando com a visão do servidor
const defA = ['A0', 'A1', 'A2'].map((k) => ({ nome: v.bonecos[k].nome, partes: v.bonecos[k].partes }))
const defB = ['B0', 'B1', 'B2'].map((k) => v.bonecos[k].pronto)
// a força bruta levou mais que o relógio do turno: o servidor passou a vez por mim. Leio a luta como está agora.
const agoraL = (await api('GET', `/api/luta/${L.id}`, { token: c.token })).json
const alvoEv = JSON.stringify(agoraL.visao.eventos)
const limpa = (x) => JSON.stringify(visaoDoTime(x, 'A').eventos)
let bons = []
for (const h of candidatos) {
  const e = criarLuta({ semente: `raw:${h}`, timeA: defA, timeB: defB })
  if (e.vez === 'B') jogarTurno(e, 'ganancioso')
  // passes automáticos do relógio, como o servidor faz
  while (!e.fim && e.eventos.length < agoraL.visao.eventos.length && e.vez === 'A') { aplicarNoLugar(e, { tipo: 'passar', time: 'A' }); if (!e.fim && e.vez === 'B') jogarTurno(e, 'ganancioso') }
  if (limpa(e) === alvoEv) bons.push({ h, e })
}
console.log('candidatos que batem com tudo o que a tela viu:', bons.length, '(turno agora', agoraL.visao.turno + ')')
let seq = agoraL.seq
// enquanto houver mais de um, passo a vez e comparo de novo (o robô joga e revela mais)
while (bons.length > 1) {
  const rr = await api('POST', `/api/luta/${L.id}/comando`, { token: c.token, corpo: { seq, comando: { tipo: 'passar' } } })
  seq++
  const alvo2 = JSON.stringify(rr.json.visao.eventos)
  bons = bons.filter(({ e }) => { aplicarNoLugar(e, { tipo: 'passar', time: 'A' }); if (!e.fim && e.vez === 'B') jogarTurno(e, 'ganancioso'); return limpa(e) === alvo2 })
  console.log('depois de passar: candidatos', bons.length)
}
if (bons.length !== 1) { console.log('sem candidato; parar'); process.exit(0) }
const { h, e } = bons[0]
console.log(`estado do sorteio achado: ${h} (força bruta + ${seq - agoraL.seq} passes)`)
console.log('PREVISÃO mão do robô:', e.times.B.mao.map((cid) => `${cid}=${e.cartas[cid].carta}`).join(', '))
console.log('PREVISÃO próximas 5 do meu baralho:', e.times.A.baralho.slice(0, 5).map((cid) => e.cartas[cid].carta).join(', '))
const prevMaoB = e.times.B.mao.slice()
// prevê o crítico do próximo golpe; se agora não há golpe possível, passa e tenta no próximo turno
for (let tentativa = 0; tentativa < 4 && !e.fim; tentativa++) {
  let alvoCmd = null
  for (const cmd of comandosValidos(e)) {
    if (cmd.tipo !== 'jogar') continue
    const s = JSON.parse(JSON.stringify(e))
    aplicarNoLugar(s, cmd)
    const dano = s.eventos.slice(e.eventos.length).find((x) => x.t === 'dano' && x.de?.startsWith('A'))
    if (dano) { alvoCmd = { cmd, dano }; break }
  }
  if (!alvoCmd) {
    const rr = await api('POST', `/api/luta/${L.id}/comando`, { token: c.token, corpo: { seq, comando: { tipo: 'passar' } } }); seq++
    aplicarNoLugar(e, { tipo: 'passar', time: 'A' }); if (!e.fim && e.vez === 'B') jogarTurno(e, 'ganancioso')
    console.log('sem golpe agora; passei. visão ainda bate:', JSON.stringify(visaoDoTime(e, 'A').eventos) === JSON.stringify(rr.json.visao.eventos))
    continue
  }
  const { cmd, dano } = alvoCmd
  console.log(`PREVISÃO: jogar ${cmd.carta} em ${cmd.alvo} → dano ${dano.valor}, crítico=${dano.critico}`)
  const rc = await api('POST', `/api/luta/${L.id}/comando`, { token: c.token, corpo: { seq, comando: { tipo: 'jogar', carta: cmd.carta, alvo: cmd.alvo } } }); seq++
  const real = rc.json.eventos?.find((x) => x.t === 'dano' && x.de?.startsWith('A'))
  console.log(`SERVIDOR:  dano ${real?.valor}, crítico=${real?.critico}  → ${real?.valor === dano.valor && real?.critico === dano.critico ? 'BATEU' : 'não bateu ' + rc.status}`)
  aplicarNoLugar(e, cmd); if (!e.fim && e.vez === 'B') jogarTurno(e, 'ganancioso')
  break
}
const antesDesistir = (await api('GET', `/api/luta/${L.id}`, { token: c.token })).json
await api('POST', `/api/luta/${L.id}/desistir`, { token: c.token })
const rp = await api('GET', `/api/luta/${L.id}/replay`, { token: c.token })
console.log(`replay: semente de ${rp.json.semente.length * 4} bits; hashSemente(semente) = ${hashSemente(rp.json.semente)} → ${hashSemente(rp.json.semente) === h ? 'IGUAL ao estado achado' : 'diferente'}`)
// confere a mão do robô prevista com o replay: refaço a luta pela semente e pelos comandos verdadeiros
const { reproduzir } = await import('/home/user/wt/servidor/shared/batalha.js')
const comandosAteAgora = rp.json.comandos.slice(0, e.comandos.length)
const rep = reproduzir({ semente: rp.json.semente, timeA: rp.json.timeA, timeB: rp.json.timeB, comandos: comandosAteAgora })
console.log('mão real do robô naquele momento (pelo replay):', rep.estado.times.B.mao.join(','), '→', rep.estado.times.B.mao.join(',') === prevMaoB.join(',') ? 'IGUAL à prevista' : 'diferente da prevista')
