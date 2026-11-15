// Quando o laço do Ponto Cruz aparece (só o Cascudo de pé), ele vira Linha sem fim: Ponto Cruz até 7, gasta em Feltro Pesado
// (100 de dano) e Remendo Rápido, repete. Conta quantas lutas o jogador vira para vitória NAQUELE turno e com quantos comandos.
import { randomBytes } from 'node:crypto'
import { criarLuta, comandosValidos, aplicarNoLugar } from '/home/user/wt/servidor/shared/batalha.js'
import { jogarTurno } from '/home/user/wt/servidor/shared/robos.js'
import { CARTAS } from '/home/user/wt/servidor/shared/config.js'
const nome = (e, c) => c.carta && e.cartas[c.carta].carta
let lacos = 0, viradas = 0, cmdsMax = 0, vidaRivalAntes = []
for (let k = 0; k < 1500; k++) {
  const e = criarLuta({ semente: randomBytes(16).toString('hex'), timeA: ['cascudo', 'desfiado', 'mudo'], timeB: ['mordedor', 'embolado', 'cascudo'] })
  let laco = false
  while (!e.fim) {
    if (e.vez === 'B') { jogarTurno(e, 'planejador'); continue }
    const t = e.turno; let n = 0
    while (!e.fim && e.vez === 'A' && e.turno === t) {
      const v = comandosValidos(e)
      let c
      if (!laco) {
        c = v.find((x) => x.tipo === 'fiapo' || (x.tipo === 'jogar' && CARTAS[nome(e, x)].linha === 0)) ?? v.filter((x) => x.tipo === 'jogar').sort((a, b) => CARTAS[nome(e, a)].linha - CARTAS[nome(e, b)].linha)[0] ?? v.at(-1)
        if (n === 100) { laco = true; lacos++; vidaRivalAntes.push(e.times.B.lugares.map((id) => e.bonecos[id].vida).join('/')) }
      } else {
        const fp = v.find((x) => nome(e, x) === 'feltro_pesado')
        const pc = v.find((x) => nome(e, x) === 'ponto_cruz')
        const fi = v.find((x) => x.tipo === 'fiapo')
        c = fi ?? fp ?? pc ?? v.at(-1)
        if (n > 5000) c = v.at(-1)
      }
      aplicarNoLugar(e, c); n++
    }
    if (laco && e.fim) { if (e.fim.vencedor === 'A' && e.fim.turno === t) { viradas++; cmdsMax = Math.max(cmdsMax, n) } break }
    if (laco) break
  }
}
console.log(`lutas em que o laço apareceu: ${lacos}/1500; dessas, vencidas NO MESMO turno pelo laço: ${viradas} (até ${cmdsMax} comandos num turno)`)
console.log('vida do rival quando o laço começou (exemplos):', vidaRivalAntes.slice(0, 5).join('  '))
