# Régua de arte do Porão (20/11/2026): âncora de escala no PixelLab. Cada chamada entra em registro.json.
# Uso:
#   python3 -I gerar.py sala                       -> pede o porão isométrico (create-room, grade 32 px) e espera
#   python3 -I gerar.py pecas                      -> corta os móveis da sala em peças soltas (10 gerações)
#   python3 -I gerar.py objeto <nome> <n> <w> <h>  -> peça solta (map-objects) com a sala como referência de estilo
#   python3 -I gerar.py pixflux <nome> <n> <w> <h> -> peça solta (create-image-pixflux, isométrico)
#   python3 -I gerar.py editar <nome> <n> <arquivo-base> "<o que muda>" -> edit-image-pixen sobre uma peça aceita
# Os textos ficam em PEDIDOS (abaixo). A chave vem de PIXELLAB_API_KEY e nunca é impressa.
import os, sys, json, base64, time, io, requests
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
BRUTO = os.path.join(AQUI, 'bruto'); os.makedirs(BRUTO, exist_ok=True)   # pasta criada ANTES de chamar
K = os.environ['PIXELLAB_API_KEY']; B = 'https://api.pixellab.ai/v2'; CA = '/root/.ccr/ca-bundle.crt'
H = {'Authorization': 'Bearer ' + K, 'Content-Type': 'application/json'}
REG = os.path.join(AQUI, 'registro-' + os.environ.get('REGSUF', 'x') + '.json')

# PROMPT-BASE fixo (o mesmo texto da régua, docs/porao/regua-de-arte.md)
ESTILO = ("isometric pixel art game asset, 2:1 dimetric angle, 32x16 pixel floor tiles, dark plum outline around every shape, "
          "bold saturated colors, 3-tone cel shading, light from the top left, crisp clean pixels, "
          "no cast shadow on the ground, transparent background, original design, no text, no logos, no letters, "
          "exactly the same scale as the reference")
# ATENÇÃO (2 gerações perdidas): a referência provada é o recorte CRU de 96x96 da sala. Com um fundo tratado na paleta,
# de 128x128 e com o Rugrigo à vista, o serviço devolveu só um pedaço de chão (com e sem a palavra "empty").
# A causa exata não foi isolada: ficar na receita provada.
SALA_TEMA = ("The basement of a grandmother's house used as a home office: warm red brick walls, wooden plank floor, "
             "one long wooden desk with three computer monitors against the back wall, an office chair, "
             "a wooden staircase going up, an old sofa, a hanging light bulb.")
PEDIDOS = {
 'cadeira_gamer': "a luxurious gaming chair, tall padded backrest, black leather with crimson red stripes, chrome star base with wheels, facing the top-right",
 'ar_condicionado': "a white split air conditioner unit mounted flat on a brick wall on the right, small green light, three thin cold air lines",
 'letreiro_neon': "a glowing pink and cyan neon sign shaped like a rocket and a rising arrow, mounted flat on a brick wall on the left, no letters",
 'maquina_bebida': "a tall energy drink vending machine, glass front with rows of colorful cans, glowing blue panel, plain colored stripes, no brand",
 'tela_curva': "one wide curved gaming monitor on a thin stand, facing the bottom-left, lit screen with a green rising chart",
 'garagem': "a low wide yellow sports car parked on a grey garage floor mat with yellow stripes, seen from the front-left, no brand, no badge, original shape",
 'rugrigo': "a sly young man sitting on a plain black office chair, seen from behind in three-quarter view, his body facing "
            "the top-right towards the desk, his head turned over his shoulder so his face shows, cute chibi proportions with "
            "a big round head and a small body, messy black hair, thin black mustache, smug grin, plain red hoodie with the hood down, "
            "grey sweatpants, slippers, one small gold wristwatch, no hat, no cap",
 'rugrigo_v1': "a sly young man sitting on a plain black office chair, seen from an isometric camera, facing the back-right "
            "towards a desk, head turned so part of his face shows, messy dark brown hair, thin mustache, smug grin, "
            "plain red hoodie, grey sweatpants, slippers, one small gold wristwatch, hands forward as if typing, "
            "chibi proportions with a big head",
 'mesa': "one long wooden computer desk seen from an isometric camera, three flat computer monitors standing side by side "
         "on top, a keyboard and a mouse, a dark PC tower with purple lights under the desk, no people, no chair",
 'aquario': "a rectangular fish aquarium on a low black wooden cabinet, seen from an isometric camera, clear blue water, "
            "orange and yellow fish, green plants, pebbles, white highlight on the glass edge",
 'cadeira_gamer': "a luxurious gaming chair, seen from an isometric camera, facing the top-right, tall padded backrest, "
                  "black leather with crimson red stripes, chrome star base with wheels",
 'cadeira_gamer_v1': "an empty luxurious gaming chair, seen from an isometric camera, facing the top-right, tall padded backrest, "
                  "black leather with crimson red stripes, chrome star base with wheels, no person",
 'trouxa': "a small gullible young person standing, seen from an isometric camera, facing the back-right, plain blue t-shirt, "
           "jeans, holding a smartphone up with both hands, wide happy eyes, chibi proportions with a big head",
}

def saldo(): return requests.get(B + '/balance', headers=H, verify=CA, timeout=40).json()['subscription']['generations']
def b64img(im):
    buf = io.BytesIO(); im.save(buf, 'PNG'); return {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode()}
def b64(arq): return b64img(Image.open(arq).convert('RGBA'))
def anotar(**k):
    L = json.load(open(REG)) if os.path.exists(REG) else []
    k['hora_brt'] = time.strftime('%d/%m %H:%M', time.gmtime(time.time() - 3 * 3600)); L.append(k)
    json.dump(L, open(REG, 'w'), indent=1, ensure_ascii=False)
def baixar(url, arq):
    r = requests.get(url, verify=CA, timeout=120); r.raise_for_status(); open(arq, 'wb').write(r.content)
def achar_imagens(j, pref=''):
    """Lista (caminho, valor) de tudo que parece imagem (url ou base64) na resposta, sem imprimir o conteúdo."""
    out = []
    if isinstance(j, dict):
        for k, v in j.items(): out += achar_imagens(v, pref + '.' + k)
    elif isinstance(j, list):
        for i, v in enumerate(j): out += achar_imagens(v, pref + f'[{i}]')
    elif isinstance(j, str) and (j.startswith('http') or len(j) > 400): out.append((pref, j))
    return out
def resumo(j):
    if isinstance(j, dict): return {k: resumo(v) for k, v in j.items()}
    if isinstance(j, list): return [resumo(v) for v in j[:40]]
    if isinstance(j, str) and len(j) > 120: return j[:60] + f'...({len(j)})'
    return j

def esperar_sala(rid, campo='status', limite=1500):
    t0 = time.time()
    while time.time() - t0 < limite:
        j = requests.get(f'{B}/rooms/{rid}', headers=H, verify=CA, timeout=60).json()
        if j.get(campo) in ('completed', 'failed'): return j
        time.sleep(20)
    return j

def sala():
    s0 = saldo(); t0 = time.time()
    corpo = dict(theme=SALA_TEMA, doors=[{'side': 'w', 'col': 0, 'row': 1}], view='isometric', tile_size=32,
                 pieces=False, name='porao-regua')
    r = requests.post(B + '/create-room', headers=H, json=corpo, verify=CA, timeout=120)
    if r.status_code >= 300:
        print('ERRO', r.status_code, r.text[:400]); anotar(peca='sala', ferramenta='create-room', ok=False, status=r.status_code, gasto=0); return
    rid = r.json()['room_id']; print('room_id', rid)
    json.dump({'room_id': rid}, open(os.path.join(AQUI, '..', 'regua', 'sala.json'), 'w'))
    j = esperar_sala(rid); guardar_sala(j, s0, t0, corpo)

def guardar_sala(j, s0, t0, corpo=None, peca='sala', ferramenta='create-room'):
    json.dump(resumo(j), open(os.path.join(AQUI, 'sala-resposta.json'), 'w'), indent=1, ensure_ascii=False)
    arqs = []
    for i, (cam, v) in enumerate(achar_imagens(j)):
        nome = cam.strip('.').replace('.', '-').replace('[', '').replace(']', '')
        arq = os.path.join(BRUTO, f'{peca}-{nome}.png')
        try:
            if v.startswith('http'): baixar(v, arq)
            else: open(arq, 'wb').write(base64.b64decode(v))
            arqs.append(os.path.relpath(arq, AQUI))
        except Exception as e: print('nao baixou', cam, type(e).__name__)
    s1 = saldo()
    anotar(peca=peca, ferramenta=ferramenta, pedido=corpo, ok=j.get('status') == 'completed', status=j.get('status'),
           saldo_antes=round(s0, 2), saldo_depois=round(s1, 2), gasto=round(s0 - s1, 2), segundos=round(time.time() - t0), arquivos=arqs)
    print(peca, j.get('status'), j.get('error'), 'gasto', round(s0 - s1, 2), 'saldo', round(s1, 1), arqs)

def pecas():
    rid = json.load(open(os.path.join(AQUI, '..', 'regua', 'sala.json')))['room_id']; s0 = saldo(); t0 = time.time()
    r = requests.post(f'{B}/rooms/{rid}/cut-out-furniture', headers=H, json={}, verify=CA, timeout=120)
    if r.status_code >= 300: print('ERRO', r.status_code, r.text[:400]); return
    j = esperar_sala(rid, 'pieces_status'); guardar_sala(j, s0, t0, None, 'pecas', 'cut-out-furniture')

def rever():
    """Só lê a sala de novo (grátis) e baixa o que houver."""
    rid = json.load(open(os.path.join(AQUI, '..', 'regua', 'sala.json')))['room_id']
    j = requests.get(f'{B}/rooms/{rid}', headers=H, verify=CA, timeout=60).json()
    json.dump(resumo(j), open(os.path.join(AQUI, 'sala-resposta.json'), 'w'), indent=1, ensure_ascii=False)
    print(json.dumps(resumo(j), indent=1)[:3000])

def uma(ferr, nome, n, w, h, extra=''):
    texto = PEDIDOS[nome] + ', ' + ESTILO + (', ' + extra if extra else '')
    s0 = saldo(); t0 = time.time(); arq = os.path.join(BRUTO, f'{nome}-{n}.png'); ok = False; status = None
    if ferr == 'pixflux':
        corpo = dict(description=texto, image_size={'width': w, 'height': h}, no_background=True, outline='single color black outline',
                     shading='detailed shading', detail='highly detailed', text_guidance_scale=8, isometric=True, view='high top-down')
        r = requests.post(B + '/create-image-pixflux', headers=H, json=corpo, verify=CA, timeout=300); status = r.status_code
        if r.status_code < 300:
            j = r.json(); img = j.get('image') or (j.get('images') or [None])[0]
            open(arq, 'wb').write(base64.b64decode(img['base64'])); ok = True
        else: print('ERRO', r.text[:300])
    else:
        ref = os.path.join(AQUI, '..', 'regua', 'referencia-escala.png')
        corpo = dict(description=texto, image_size={'width': w, 'height': h}, view='high top-down', outline='single color outline',
                     shading='detailed shading', detail='high detail', text_guidance_scale=8)
        if os.path.exists(ref): corpo['color_image'] = b64(ref)
        r = requests.post(B + '/map-objects', headers=H, json=corpo, verify=CA, timeout=300); status = r.status_code
        if r.status_code < 300:
            oid = r.json()['object_id']
            for _ in range(40):
                time.sleep(6)
                g = requests.get(f'{B}/map-objects/{oid}', headers=H, verify=CA, timeout=60)
                if g.status_code == 200 and g.json().get('download_url'): baixar(g.json()['download_url'], arq); ok = True; break
                if g.status_code == 410: break
        else: print('ERRO', r.text[:300])
        corpo.pop('color_image', None)
    s1 = saldo()
    anotar(peca=nome, tentativa=n, ferramenta=ferr, tamanho=[w, h], texto=texto, ok=ok, status=status, saldo_antes=round(s0, 2),
           saldo_depois=round(s1, 2), gasto=round(s0 - s1, 2), segundos=round(time.time() - t0), arquivo=os.path.relpath(arq, AQUI) if ok else None)
    print(nome, n, 'ok' if ok else 'ERRO', 'gasto', round(s0 - s1, 2), 'saldo', round(s1, 1))

def esperar_job(jid, limite=300):
    t0 = time.time()
    while time.time() - t0 < limite:
        time.sleep(6)
        j = requests.get(f'{B}/background-jobs/{jid}', headers=H, verify=CA, timeout=60).json()
        if j.get('status') in ('completed', 'failed'): return j
    return {'status': 'tempo esgotado'}

def editar(nome, n, base, muda, w=None, h=None):
    """edit-image-pixen: lados múltiplos de 4, até 256; devolve a MESMA imagem com só o que foi pedido mudado."""
    s0 = saldo(); t0 = time.time(); arq = os.path.join(BRUTO, f'{nome}-{n}.png')
    corpo = dict(image=b64(os.path.join(AQUI, base)), description=muda, no_background=True)
    if w: corpo.update(width=int(w), height=int(h))
    r = requests.post(B + '/edit-image-pixen', headers=H, json=corpo, verify=CA, timeout=300); ok = False; status = r.status_code
    if r.status_code < 300:
        j = r.json()
        if j.get('background_job_id'): j = esperar_job(j['background_job_id']); status = j.get('status'); j = j.get('last_response') or j
        ims = [v for _, v in achar_imagens(j)]
        if ims:
            v = ims[0]
            if v.startswith('http'): baixar(v, arq)
            else: open(arq, 'wb').write(base64.b64decode(v))
            ok = True
        else: print('sem imagem', json.dumps(resumo(j))[:400])
    else: print('ERRO', r.status_code, r.text[:300])
    s1 = saldo()
    anotar(peca=nome, tentativa=n, ferramenta='edit-image-pixen', base=base, texto=muda, ok=ok, status=status, saldo_antes=round(s0, 2),
           saldo_depois=round(s1, 2), gasto=round(s0 - s1, 2), segundos=round(time.time() - t0), arquivo=os.path.relpath(arq, AQUI) if ok else None)
    print(nome, n, 'ok' if ok else 'ERRO', 'gasto', round(s0 - s1, 2), 'saldo', round(s1, 1))

def dentro(nome, n, cx, cy, cw, ch, mx0, my0, mx1, my1, extra=''):
    """map-objects em modo de pintar DENTRO da sala: o recorte da sala (até 192x192 de área) é o fundo e a máscara
    diz onde a peça nasce. É o que prende a escala: a peça sai do tamanho que cabe na sala."""
    if cx < 0:   # recorte negativo = usar a referência fixa da régua (referencia-escala.png: recorte CRU 96x96 da sala)
        rec = Image.open(os.path.join(AQUI, '..', 'regua', 'referencia-escala.png')).convert('RGBA'); cw, ch = rec.size
    else:
        sala_im = Image.open(os.path.join(AQUI, '..', 'regua', 'bruto', 'sala-image_url.png')).convert('RGBA')
        fundo = Image.new('RGBA', sala_im.size, (21, 18, 28, 255)); fundo.alpha_composite(sala_im)
        rec = fundo.crop((cx, cy, cx + cw, cy + ch))
    masc = Image.new('RGB', (cw, ch), (0, 0, 0))
    for y in range(my0, my1):
        for x in range(mx0, mx1): masc.putpixel((x, y), (255, 255, 255))
    texto = PEDIDOS[nome] + ', ' + ESTILO + (', ' + extra if extra else '')
    s0 = saldo(); t0 = time.time(); arq = os.path.join(BRUTO, f'{nome}-{n}.png'); ok = False
    corpo = dict(description=texto, image_size={'width': cw, 'height': ch}, view='high top-down', outline='single color outline',
                 shading='detailed shading', detail='high detail', text_guidance_scale=8,
                 background_image=b64img(rec), inpainting={'type': 'mask', 'mask_image': b64img(masc)})
    r = requests.post(B + '/map-objects', headers=H, json=corpo, verify=CA, timeout=300); status = r.status_code
    if r.status_code < 300:
        oid = r.json()['object_id']
        for _ in range(50):
            time.sleep(6)
            g = requests.get(f'{B}/map-objects/{oid}', headers=H, verify=CA, timeout=60)
            if g.status_code == 200 and g.json().get('download_url'): baixar(g.json()['download_url'], arq); ok = True; break
            if g.status_code == 410: status = 410; break
    else: print('ERRO', r.status_code, r.text[:400])
    s1 = saldo()
    anotar(peca=nome, tentativa=n, ferramenta='map-objects (dentro da sala)', recorte=[cx, cy, cw, ch], mascara=[mx0, my0, mx1, my1], texto=texto,
           ok=ok, status=status, saldo_antes=round(s0, 2), saldo_depois=round(s1, 2), gasto=round(s0 - s1, 2), segundos=round(time.time() - t0),
           arquivo=os.path.relpath(arq, AQUI) if ok else None)
    print(nome, n, 'ok' if ok else 'ERRO', 'gasto', round(s0 - s1, 2), 'saldo', round(s1, 1))

PLANO = ("pixel art, flat front view, dark plum outline around every shape, bold saturated colors, 3-tone cel shading, "
         "light from the top left, crisp clean pixels, transparent background, original design, no text, no logos, no letters")
def plano(nome, n, w, h, texto):
    """pixflux em vista frontal (retratos e molduras): o texto do pedido vem na linha de comando."""
    texto = texto + ', ' + PLANO
    s0 = saldo(); t0 = time.time(); arq = os.path.join(BRUTO, f'{nome}-{n}.png'); ok = False
    corpo = dict(description=texto, image_size={'width': w, 'height': h}, no_background=True, outline='single color black outline',
                 shading='detailed shading', detail='highly detailed', text_guidance_scale=8)
    r = requests.post(B + '/create-image-pixflux', headers=H, json=corpo, verify=CA, timeout=300); status = r.status_code
    if r.status_code < 300:
        j = r.json(); img = j.get('image') or (j.get('images') or [None])[0]
        open(arq, 'wb').write(base64.b64decode(img['base64'])); ok = True
    else: print('ERRO', r.text[:300])
    s1 = saldo()
    anotar(peca=nome, tentativa=n, ferramenta='create-image-pixflux (frontal)', tamanho=[w, h], texto=texto, ok=ok, status=status, saldo_antes=round(s0, 2),
           saldo_depois=round(s1, 2), gasto=round(s0 - s1, 2), segundos=round(time.time() - t0), arquivo=os.path.relpath(arq, AQUI) if ok else None)
    print(nome, n, 'ok' if ok else 'ERRO', 'gasto', round(s0 - s1, 2), 'saldo', round(s1, 1))

a = sys.argv[1:]
if a[0] == 'sala': sala()
elif a[0] == 'pecas': pecas()
elif a[0] == 'plano': plano(a[1], int(a[2]), int(a[3]), int(a[4]), a[5])
elif a[0] == 'rever': rever()
elif a[0] in ('objeto', 'pixflux'): uma(a[0], a[1], int(a[2]), int(a[3]), int(a[4]), a[5] if len(a) > 5 else '')
elif a[0] == 'editar': editar(a[1], int(a[2]), a[3], a[4], *a[5:7])
elif a[0] == 'dentro': dentro(a[1], int(a[2]), *[int(v) for v in a[3:11]], *(a[11:12]))
