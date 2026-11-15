"""Ajudante do piloto de monstros: chama o PixelLab e anota cada geração em registro.csv."""
import os, sys, json, base64, time, csv, datetime, requests
K = os.environ['PIXELLAB_API_KEY']; B = 'https://api.pixellab.ai/v2'; CA = '/root/.ccr/ca-bundle.crt'
H = {'Authorization': 'Bearer ' + K, 'Content-Type': 'application/json'}
AQUI = os.path.dirname(os.path.abspath(__file__))
REG = os.path.join(AQUI, 'registro.csv')
BRUTO = os.path.join(AQUI, 'bruto')
os.makedirs(BRUTO, exist_ok=True)

def saldo():
    r = requests.get(B + '/balance', headers=H, verify=CA, timeout=40).json()
    return r['subscription']['generations']

def agora():
    return (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).strftime('%d/%m %H:%M')

def anotar(item, tentativa, ferramenta, custo, arquivo, nota=''):
    novo = not os.path.exists(REG)
    with open(REG, 'a', newline='') as f:
        w = csv.writer(f)
        if novo: w.writerow(['hora_BRT', 'item', 'tentativa', 'ferramenta', 'custo_geracoes', 'arquivo', 'nota'])
        w.writerow([agora(), item, tentativa, ferramenta, custo, arquivo, nota])

def b64(arq):
    return {'type': 'base64', 'base64': base64.b64encode(open(arq, 'rb').read()).decode()}

def job(jid, espera=300):
    t0 = time.time()
    while time.time() - t0 < espera:
        r = requests.get(B + '/background-jobs/' + jid, headers=H, verify=CA, timeout=40).json()
        if r.get('status') in ('completed', 'failed', 'cancelled'): return r
        time.sleep(4)
    return {'status': 'timeout'}

def gerar(caminho, corpo, item, tentativa, arq, nota=''):
    """Faz UMA chamada, salva o PNG em bruto/<arq> e anota no registro (custo = diferença do saldo)."""
    s0 = saldo()
    r = requests.post(B + caminho, headers=H, json=corpo, verify=CA, timeout=240)
    if r.status_code >= 300:
        print('ERRO', caminho, r.status_code, r.text[:300]); anotar(item, tentativa, caminho, 0, '', 'erro ' + str(r.status_code)); return None
    j = r.json()
    img = None
    if 'image' in j: img = j['image']
    else:
        d = j.get('data') or j
        jid = d.get('background_job_id') or d.get('job_id') or j.get('background_job_id')
        if jid:
            jj = job(jid)
            res = jj.get('last_response') or jj.get('result') or jj
            img = res.get('image') or (res.get('images') or [None])[0]
            if img is None: print('sem imagem', json.dumps(jj)[:400])
    if img is None:
        print('resposta', json.dumps(j)[:400]); return None
    open(os.path.join(BRUTO, arq), 'wb').write(base64.b64decode(img['base64']))
    c = round(s0 - saldo(), 2)
    anotar(item, tentativa, caminho, c, 'bruto/' + arq, nota)
    print(item, tentativa, 'custo', c, '->', arq)
    return os.path.join(BRUTO, arq)
