// Mostra qual sequência de comandos se repete no turno sem fim (política gulosa: grátis primeiro).
import { randomBytes } from 'node:crypto'
import { criarLuta, comandosValidos, aplicarNoLugar } from '/home/user/wt/servidor/shared/batalha.js'
import { jogarTurno } from '/home/user/wt/servidor/shared/robos.js'
import { CARTAS } from '/home/user/wt/servidor/shared/config.js'
for (let k = 0; k < 500; k++) {
  const e = criarLuta({ semente: randomBytes(16).toString('hex'), timeA: ['cascudo', 'desfiado', 'mudo'], timeB: ['mordedor', 'embolado', 'cascudo'] })
  let achou = false
  while (!e.fim && !achou) {
    if (e.vez === 'B') { jogarTurno(e, 'planejador'); continue }
    const t = e.turno; let n = 0
    while (!e.fim && e.vez === 'A' && e.turno === t) {
      const v = comandosValidos(e)
      const gratis = v.find((c) => c.tipo === 'fiapo' || (c.tipo === 'jogar' && CARTAS[e.cartas[c.carta].carta].linha === 0))
      const outra = v.filter((c) => c.tipo === 'jogar').sort((a, b) => CARTAS[e.cartas[a.carta].carta].linha - CARTAS[e.cartas[b.carta].carta].linha)[0]
      const c = gratis ?? outra ?? { tipo: 'passar', time: 'A' }
      if (n === 200) {
        const A = e.times.A
        console.log('turno', t, 'linha', A.linha, 'mão', A.mao.map((x) => e.cartas[x].carta).join(','), '| baralho', A.baralho.length, 'descarte', A.descarte.map((x) => e.cartas[x].carta).join(','), '| fiapos', A.fiapos.length)
        console.log('bonecos A:', A.lugares.map((id) => `${id}:${e.bonecos[id].estado}:${e.bonecos[id].vida}`).join(' '))
        const ini = e.eventos.length
        for (let i = 0; i < 6; i++) { const v2 = comandosValidos(e); const g = v2.find((c) => c.tipo === 'fiapo' || (c.tipo === 'jogar' && CARTAS[e.cartas[c.carta].carta].linha === 0)) ?? v2.filter((c) => c.tipo === 'jogar')[0]; console.log('  cmd', JSON.stringify(g), e.cartas[g.carta]?.carta); aplicarNoLugar(e, g) }
        console.log('  eventos:', e.eventos.slice(ini).map((x) => x.t).join(','), '| rng mudou?', true)
        achou = true; break
      }
      aplicarNoLugar(e, c); n++
    }
  }
  if (achou) break
}
