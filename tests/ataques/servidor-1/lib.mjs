// Ajudas dos ataques (fora do repositório).
export const BASE = process.env.BASE || 'http://127.0.0.1:48731'
export const OBRA = '/home/user/wt/servidor'

export async function api(metodo, caminho, { token, corpo, cab = {} } = {}) {
  const h = { ...cab }
  if (token) h.authorization = `Bearer ${token}`
  let body
  if (corpo !== undefined) { h['content-type'] = 'application/json'; body = typeof corpo === 'string' ? corpo : JSON.stringify(corpo) }
  const t0 = performance.now()
  const r = await fetch(BASE + caminho, { method: metodo, headers: h, body })
  const txt = await r.text()
  let json = null
  try { json = JSON.parse(txt) } catch {}
  return { status: r.status, json, txt, ms: performance.now() - t0, headers: r.headers }
}

let n = 0
export async function novaConta(apelido) {
  const r = await api('POST', '/api/conta', { corpo: { apelido: apelido ?? `seg${process.pid}x${n++}` } })
  if (r.status !== 201) throw new Error('conta: ' + r.status + ' ' + r.txt)
  const e = await api('GET', '/api/estado', { token: r.json.token })
  return { token: r.json.token, id: r.json.conta.id, bonecos: e.json.bonecos }
}
