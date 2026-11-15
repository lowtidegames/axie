import { Worker } from 'node:worker_threads'
const t0=Date.now()
const w = new Worker(new URL('./forca-worker.mjs', import.meta.url), { workerData: { de: 0, ate: 50_000_000, alvo: [1,2,3,4,5], n: 18 } })
w.on('message', (m) => { console.log('achados', m.length, 'ms', Date.now()-t0) })
