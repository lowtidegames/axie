# Piloto do Porão: 1 ladrilho isométrico de chão no tamanho da grade do jogo (losango 32x16), pelo create-isometric-tile.
# Uso: python3 -I ladrilho.py <tentativa>   (chave em PIXELLAB_API_KEY, nunca impressa)
import os, sys, json, base64, time, requests
AQUI = os.path.dirname(os.path.abspath(__file__))
K = os.environ['PIXELLAB_API_KEY']; B = 'https://api.pixellab.ai/v2'; CA = '/root/.ccr/ca-bundle.crt'
H = {'Authorization': 'Bearer ' + K, 'Content-Type': 'application/json'}
def saldo(): return requests.get(B + '/balance', headers=H, verify=CA, timeout=40).json()['subscription']['generations']
tent = int(sys.argv[1])
corpo = dict(description="warm wooden parquet floor tile of a cozy basement, honey-orange planks with dark plum seams, bold saturated colors",
             image_size={'width': 32, 'height': 32}, isometric_tile_size=32, isometric_tile_shape='thin tile',
             outline='single color outline', shading='basic shading', detail='highly detailed', text_guidance_scale=8)
s0 = saldo(); t0 = time.time()
r = requests.post(B + '/create-isometric-tile', headers=H, json=corpo, verify=CA, timeout=120)
j = r.json() if r.status_code < 300 else {}
print('status', r.status_code, (r.text[:200] if r.status_code >= 300 else list(j.keys())))
img = None; tid = j.get('tile_id') or j.get('id') or (j.get('data') or {}).get('id')
while r.status_code < 300 and time.time() - t0 < 300:
    if 'image' in j and j['image']: img = j['image']; break
    jid = j.get('background_job_id') or (j.get('data') or {}).get('background_job_id')
    url = B + ('/background-jobs/' + jid if jid else '/isometric-tiles/' + str(tid))
    time.sleep(5); q = requests.get(url, headers=H, verify=CA, timeout=40).json()
    st = q.get('status') or (q.get('data') or {}).get('status')
    if st in ('completed', 'failed', 'cancelled'):
        d = q.get('last_response') or q.get('data') or q
        img = d.get('image') or (d.get('images') or [None])[0]
        if not img: print('fim sem imagem', st, str(q)[:300])
        break
arq = os.path.join(AQUI, 'bruto', f'ladrilho-{tent}.png')
if img: open(arq, 'wb').write(base64.b64decode(img['base64']))
s1 = saldo()
reg = os.path.join(AQUI, 'registro.json'); L = json.load(open(reg))
L.append(dict(peca='ladrilho', tentativa=tent, ferramenta='create-isometric-tile', tamanho=[32, 32], extra='', ok=bool(img),
              status=r.status_code, saldo_antes=round(s0, 2), saldo_depois=round(s1, 2), gasto=round(s0 - s1, 2),
              segundos=round(time.time() - t0), hora_brt=time.strftime('%H:%M'), arquivo=os.path.relpath(arq, AQUI) if img else None))
json.dump(L, open(reg, 'w'), indent=1, ensure_ascii=False)
print('ladrilho', tent, 'ok' if img else 'sem imagem', 'gasto', round(s0 - s1, 2), 'saldo', round(s1, 1))
