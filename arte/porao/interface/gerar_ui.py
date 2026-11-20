# A3 kit de interface (20/11/2026). Uso: python3 -I gerar_ui.py <pixflux|pixen> <nome> <n> <w> <h> "<pedido>"
# Chave em PIXELLAB_API_KEY (nunca impressa). Cada chamada entra em registro.json.
import os, sys, json, base64, time, requests
AQUI = os.path.dirname(os.path.abspath(__file__)); BRUTO = os.path.join(AQUI, 'bruto'); os.makedirs(BRUTO, exist_ok=True)
K = os.environ['PIXELLAB_API_KEY']; B = 'https://api.pixellab.ai/v2'; CA = '/root/.ccr/ca-bundle.crt'
H = {'Authorization': 'Bearer ' + K, 'Content-Type': 'application/json'}
ESTILO = ("flat front view pixel art user interface asset, thick dark plum outline, bold saturated colors, 3-tone cel shading, "
          "light from the top left, crisp clean pixels, no text, no letters, no logos, original design")
def saldo(): return requests.get(B + '/balance', headers=H, verify=CA, timeout=40).json()['subscription']['generations']
ferr, nome, n, w, h, ped = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
sem_fundo = len(sys.argv) > 7 and sys.argv[7] == 'cheio'
texto = ped + ', ' + ESTILO
s0 = saldo(); arq = os.path.join(BRUTO, f'{nome}-{n}.png'); ok = False
corpo = dict(description=texto, image_size={'width': w, 'height': h}, no_background=not sem_fundo)
if ferr == 'pixflux':
    corpo.update(outline='single color black outline', shading='medium shading', detail='medium detail', text_guidance_scale=8)
    ep = '/create-image-pixflux'
else:
    ep = '/create-image-pixen'
r = requests.post(B + ep, headers=H, json=corpo, verify=CA, timeout=300); st = r.status_code
if r.status_code < 300:
    j = r.json()
    if j.get('background_job_id'):
        for _ in range(60):
            time.sleep(5); g = requests.get(f"{B}/background-jobs/{j['background_job_id']}", headers=H, verify=CA, timeout=60).json()
            if g.get('status') in ('completed', 'failed'): j = g.get('last_response') or g; break
    im = j.get('image') or (j.get('images') or [None])[0]
    if im is None and isinstance(j, dict):
        for v in j.values():
            if isinstance(v, dict) and 'base64' in v: im = v
    if im: open(arq, 'wb').write(base64.b64decode(im['base64'])); ok = True
    else: print('sem imagem', str(list(j.keys()) if isinstance(j, dict) else j)[:300])
else: print('ERRO', r.status_code, r.text[:300])
s1 = saldo()
RG = os.path.join(AQUI, 'registro.json')
L = json.load(open(RG)) if os.path.exists(RG) else []
L.append(dict(peca=nome, tentativa=n, ferramenta=ferr, tamanho=[w, h], texto=texto, ok=ok, status=st, saldo_antes=s0, saldo_depois=s1,
              hora_brt=time.strftime('%d/%m %H:%M', time.gmtime(time.time() - 10800)), arquivo=os.path.relpath(arq, AQUI) if ok else None))
json.dump(L, open(RG, 'w'), indent=1, ensure_ascii=False)
print(nome, n, 'ok' if ok else 'ERRO', 'saldo', s0, '->', s1)
