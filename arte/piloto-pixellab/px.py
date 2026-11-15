import os, sys, json, base64, time, requests
K = os.environ['PIXELLAB_API_KEY']; B = 'https://api.pixellab.ai/v2'; CA = '/root/.ccr/ca-bundle.crt'
H = {'Authorization': 'Bearer ' + K, 'Content-Type': 'application/json'}
def saldo():
    r = requests.get(B + '/balance', headers=H, verify=CA, timeout=40).json(); return r['subscription']['generations']
def post(caminho, corpo, espera=180):
    r = requests.post(B + caminho, headers=H, json=corpo, verify=CA, timeout=espera)
    if r.status_code >= 300: print('ERRO', caminho, r.status_code, r.text[:300]); return None
    return r.json()
def b64(arq): return {'type': 'base64', 'base64': base64.b64encode(open(arq, 'rb').read()).decode()}
def salvar(img, arq): open(arq, 'wb').write(base64.b64decode(img['base64'])); return arq
def job(jid, espera=300):
    t0 = time.time()
    while time.time() - t0 < espera:
        r = requests.get(B + '/background-jobs/' + jid, headers=H, verify=CA, timeout=40).json()
        if r.get('status') in ('completed', 'failed', 'cancelled'): return r
        time.sleep(4)
    return {'status': 'timeout'}
