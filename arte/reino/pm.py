"""Ajudante da arte do Reino: chama o gerador e anota CADA chamada em registro.csv.
Uso: python3 -B arte/reino/pm.py saldo | python3 -B arte/reino/gerar.py <peca> <tentativa>
A chave vem da variavel de ambiente e nunca e impressa nem gravada."""
import os, sys, json, base64, time, csv, datetime, requests
sys.dont_write_bytecode = True
K = os.environ.get('PIXELLAB_API_KEY', ''); B = 'https://api.pixellab.ai/v2'; CA = '/root/.ccr/ca-bundle.crt'
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
        if novo: w.writerow(['hora_BRT', 'item', 'tentativa', 'ferramenta', 'custo_geracoes', 'saldo_depois', 'arquivo', 'nota'])
        w.writerow([agora(), item, tentativa, ferramenta, custo[0], custo[1], arquivo, nota])


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
    """UMA chamada; salva em bruto/<arq>; anota custo = diferenca do saldo."""
    s0 = saldo()
    r = requests.post(B + caminho, headers=H, json=corpo, verify=CA, timeout=240)
    if r.status_code >= 300:
        print('ERRO', caminho, r.status_code, r.text[:300])
        anotar(item, tentativa, caminho, (0, saldo()), '', 'erro ' + str(r.status_code)); return None
    j = r.json(); img = None
    if 'image' in j: img = j['image']
    else:
        d = j.get('data') or j
        jid = d.get('background_job_id') or d.get('job_id') or j.get('background_job_id')
        if jid:
            jj = job(jid)
            res = jj.get('last_response') or jj.get('result') or jj
            img = res.get('image') or (res.get('images') or [None])[0]
    s1 = saldo()
    if img is None:
        print('sem imagem', json.dumps(j)[:300]); anotar(item, tentativa, caminho, (round(s0 - s1, 2), s1), '', 'sem imagem'); return None
    open(os.path.join(BRUTO, arq), 'wb').write(base64.b64decode(img['base64']))
    anotar(item, tentativa, caminho, (round(s0 - s1, 2), s1), 'bruto/' + arq, nota)
    print(item, tentativa, 'custo', round(s0 - s1, 2), 'saldo', s1, '->', arq)
    return os.path.join(BRUTO, arq)


if __name__ == '__main__':
    if sys.argv[1:] == ['saldo']: print('saldo', saldo())
    if sys.argv[1:] == ['api']:
        for u in (B + '/openapi.json', 'https://api.pixellab.ai/openapi.json'):
            r = requests.get(u, verify=CA, timeout=40); print(u, r.status_code, len(r.text))
            if r.status_code == 200:
                open(sys.argv[0] + '.api.json', 'w').write(r.text); break
