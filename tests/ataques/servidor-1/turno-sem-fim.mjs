// ITEM 7: quantos comandos cabem num turno do jogador com as cartas de custo 0 (Ponto Cruz, Passo de Cetim, Grito Abafado)?
// Usa o motor de verdade (shared/ do worktree). Política gulosa: joga o que for de graça primeiro; senão a carta mais barata.
import { randomBytes } from 'node:crypto'
import { criarLuta, comandosValidos, aplicarNoLugar, visaoDoTime } from '/home/user/wt/servidor/shared/batalha.js'
import { jogarTurno } from '/home/user/wt/servidor/shared/robos.js'
import { CARTAS } from '/home/user/wt/servidor/shared/config.js'

const times = [['cascudo', 'desfiado', 'mudo'], ['cascudo', 'desfiado', 'pisoteador'], ['rasgao', 'brigao', 'mordedor']]
for (const timeA of times) {
  let max = 0, soma = 0, n = 0, maxBytes = 0, semFim = 0
  for (let k = 0; k < 200; k++) {
    const e = criarLuta({ semente: randomBytes(16).toString('hex'), timeA, timeB: ['mordedor', 'embolado', 'cascudo'] })
    while (!e.fim) {
      if (e.vez === 'B') { jogarTurno(e, 'planejador'); continue }
      let cmds = 0
      const turno = e.turno
      while (!e.fim && e.vez === 'A' && e.turno === turno) {
        const v = comandosValidos(e)
        const gratis = v.find((c) => c.tipo === 'fiapo' || (c.tipo === 'jogar' && CARTAS[e.cartas[c.carta].carta].linha === 0))
        const outra = v.filter((c) => c.tipo === 'jogar').sort((a, b) => CARTAS[e.cartas[a.carta].carta].linha - CARTAS[e.cartas[b.carta].carta].linha)[0]
        aplicarNoLugar(e, gratis ?? outra ?? { tipo: 'passar', time: 'A' })
        cmds++
        if (cmds > 5000) break
      }
      if (cmds > 5000) { semFim++; if (cmds > max) { max = cmds; maxBytes = JSON.stringify(visaoDoTime(e, 'A')).length } break }
      if (cmds > max) { max = cmds; maxBytes = JSON.stringify(visaoDoTime(e, 'A')).length }
      soma += cmds; n++
    }
  }
  console.log(`time ${timeA.join('+')}: comandos por turno — média ${(soma / n).toFixed(1)}, lutas com turno >5000 comandos: ${semFim}/200; máximo ${max} (visão nesse ponto: ${(maxBytes / 1024).toFixed(0)} KB)`)
}
