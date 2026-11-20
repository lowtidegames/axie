# Abertura do Porão (20/11/2026): peças de título, logos, retrato da vó e quadros do carregando. Cada chamada entra em registro.json.
# Uso: python3 -I gerar.py pixflux <nome> <n> <w> <h> "<texto>" [fundo]   |   python3 -I gerar.py editar <nome> <n> <base.png> "<o que muda>" [w h]
# A chave vem de PIXELLAB_API_KEY e nunca é impressa.
import os, sys, json, base64, time, io, requests
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__)); BRUTO = os.path.join(AQUI, 'bruto'); os.makedirs(BRUTO, exist_ok=True)
K = os.environ['PIXELLAB_API_KEY']; B = 'https://api.pixellab.ai/v2'; CA = '/root/.ccr/ca-bundle.crt'
H = {'Authorization': 'Bearer ' + K, 'Content-Type': 'application/json'}
REG = os.path.join(AQUI, 'registro.json')
PLANO = ("pixel art, flat front view, dark plum outline around every shape, bold saturated colors, 3-tone cel shading, "
         "light from the top left, crisp clean pixels, original design, no text, no logos, no letters")
def saldo(): return requests.get(B + '/balance', headers=H, verify=CA, timeout=40).json()['subscription']['generations']
def b64(arq):
    buf = io.BytesIO(); Image.open(arq).convert('RGBA').save(buf, 'PNG'); return {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode()}
def anotar(**k):
    L = json.load(open(REG)) if os.path.exists(REG) else []
    k['hora_brt'] = time.strftime('%d/%m %H:%M', time.gmtime(time.time() - 3 * 3600)); L.append(k)
    json.dump(L, open(REG, 'w'), indent=1, ensure_ascii=False)
def achar(j):
    out = []
    if isinstance(j, dict):
        for v in j.values(): out += achar(v)
    elif isinstance(j, list):
        for v in j: out += achar(v)
    elif isinstance(j, str) and (j.startswith('http') or len(j) > 400): out.append(j)
    return out
def gravar(v, arq):
    if v.startswith('http'): open(arq, 'wb').write(requests.get(v, verify=CA, timeout=120).content)
    else: open(arq, 'wb').write(base64.b64decode(v))
def pixflux(nome, n, w, h, texto, fundo):
    texto = texto + ', ' + PLANO + ('' if fundo else ', transparent background')
    s0 = saldo(); t0 = time.time(); arq = os.path.join(BRUTO, f'{nome}-{n}.png'); ok = False
    corpo = dict(description=texto, image_size={'width': w, 'height': h}, no_background=not fundo, outline='single color black outline',
                 shading='detailed shading', detail='highly detailed', text_guidance_scale=8)
    r = requests.post(B + '/create-image-pixflux', headers=H, json=corpo, verify=CA, timeout=300); status = r.status_code
    if r.status_code < 300:
        j = r.json(); img = j.get('image') or (j.get('images') or [None])[0]; gravar(img['base64'], arq); ok = True
    else: print('ERRO', r.status_code, r.text[:300])
    s1 = saldo()
    anotar(peca=nome, tentativa=n, ferramenta='create-image-pixflux (frontal)', tamanho=[w, h], texto=texto, ok=ok, status=status,
           saldo_antes=round(s0, 2), saldo_depois=round(s1, 2), gasto=round(s0 - s1, 2), segundos=round(time.time() - t0), arquivo=os.path.relpath(arq, AQUI) if ok else None)
    print(nome, n, 'ok' if ok else 'ERRO', 'gasto', round(s0 - s1, 2), 'saldo', round(s1, 1))
def esperar_job(jid, limite=300):
    t0 = time.time()
    while time.time() - t0 < limite:
        time.sleep(6)
        j = requests.get(f'{B}/background-jobs/{jid}', headers=H, verify=CA, timeout=60).json()
        if j.get('status') in ('completed', 'failed'): return j
    return {'status': 'tempo esgotado'}
def editar(nome, n, base, muda, w=None, h=None):
    s0 = saldo(); t0 = time.time(); arq = os.path.join(BRUTO, f'{nome}-{n}.png')
    corpo = dict(image=b64(os.path.join(AQUI, base)), description=muda, no_background=True)
    if w: corpo.update(width=int(w), height=int(h))
    r = requests.post(B + '/edit-image-pixen', headers=H, json=corpo, verify=CA, timeout=300); ok = False; status = r.status_code
    if r.status_code < 300:
        j = r.json()
        if j.get('background_job_id'): j = esperar_job(j['background_job_id']); status = j.get('status'); j = j.get('last_response') or j
        ims = achar(j)
        if ims: gravar(ims[0], arq); ok = True
        else: print('sem imagem', str(j)[:300])
    else: print('ERRO', r.status_code, r.text[:300])
    s1 = saldo()
    anotar(peca=nome, tentativa=n, ferramenta='edit-image-pixen', base=base, texto=muda, ok=ok, status=status, saldo_antes=round(s0, 2),
           saldo_depois=round(s1, 2), gasto=round(s0 - s1, 2), segundos=round(time.time() - t0), arquivo=os.path.relpath(arq, AQUI) if ok else None)
    print(nome, n, 'ok' if ok else 'ERRO', 'gasto', round(s0 - s1, 2), 'saldo', round(s1, 1))
a = sys.argv[1:]
if a[0] == 'pixflux': pixflux(a[1], int(a[2]), int(a[3]), int(a[4]), a[5], len(a) > 6 and a[6] == 'fundo')
elif a[0] == 'editar': editar(a[1], int(a[2]), a[3], a[4], *a[5:7])
