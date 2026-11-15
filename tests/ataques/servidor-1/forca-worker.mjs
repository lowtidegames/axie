// Trabalhador da força bruta: testa todos os estados h (32 bits) num intervalo.
// Refaz o embaralhamento do baralho A (18 cartas, Fisher-Yates com mulberry32) e compara as K primeiras com o que a tela viu.
import { parentPort, workerData } from 'node:worker_threads'
const { de, ate, alvo, n } = workerData
const K = alvo.length
const a = new Int32Array(n)
const achados = []
const C = 0x6d2b79f5
for (let h = de; h < ate; h++) {
  for (let i = 0; i < n; i++) a[i] = i
  let s = h >>> 0
  for (let i = n - 1; i > 0; i--) {
    s = (s + C) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    const v = ((t ^ (t >>> 14)) >>> 0) / 4294967296
    const j = Math.floor(v * (i + 1))
    const x = a[i]; a[i] = a[j]; a[j] = x
  }
  let ok = true
  for (let k = 0; k < K; k++) if (a[k] !== alvo[k]) { ok = false; break }
  if (ok) achados.push(h)
}
parentPort.postMessage(achados)
