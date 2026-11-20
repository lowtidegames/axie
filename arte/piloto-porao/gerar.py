# Piloto de arte do Porão (20/11/2026): gera UMA peça por chamada no PixelLab e anota em registro.json.
# Uso: python3 -I gerar.py <peca> <tentativa> [texto extra] [ferramenta: pixflux|pixen-edit:<arquivo>]
# A chave vem de PIXELLAB_API_KEY e nunca é impressa.
import os, sys, json, base64, time, requests
AQUI = os.path.dirname(os.path.abspath(__file__))
K = os.environ['PIXELLAB_API_KEY']; B = 'https://api.pixellab.ai/v2'; CA = '/root/.ccr/ca-bundle.crt'
H = {'Authorization': 'Bearer ' + K, 'Content-Type': 'application/json'}
ESTILO = ("isometric pixel art game asset, 2:1 dimetric angle, thick dark plum outline around every shape, "
          "bold saturated colors, 3-tone cel shading, light from the top, crisp clean pixels, highly detailed, "
          "original design, no text, no logos, no letters")
PECAS = {
 'canto': (192, 192, "corner of a cozy luxurious basement seen from an isometric camera: two tall walls meeting at the back corner, "
           "left wall of warm red-orange bricks with dark mortar, right wall of the same bricks with a small high window, "
           "checkered wooden plank floor diamond, a wooden staircase with a handrail coming down along the right wall, "
           "a hanging bare light bulb, empty floor in the middle, no furniture, no people"),
 'mesa': (128, 128, "a wooden computer desk seen from an isometric camera, three computer monitors side by side on the desk, "
          "the screens glowing: left screen a green rising price chart, middle screen blue chat bubbles, right screen a colorful game, "
          "a keyboard, a mouse, an energy drink can, a smartphone on the desk, gaming PC tower with purple lights under the desk, no people"),
 'rugrigo': (96, 96, "a sly young man sitting on an office chair seen from an isometric camera, facing the back-right, "
             "messy dark hair, thin mustache, smug grin, plain red hoodie, grey sweatpants, slippers, "
             "one shiny gold wristwatch as the only luxury detail, relaxed lazy pose, hands near a keyboard, chibi proportions with big head"),
 'aquario': (96, 96, "a big luxurious rectangular fish aquarium on a black wooden cabinet seen from an isometric camera, "
             "clear blue water, bright orange and yellow tropical fish, green plants, pebbles, bubbles, glass with white highlight on the edge"),
 'carta': (96, 128, "a vertical collectible card, flat front view, legendary rarity, thick ornate gold frame with small gems, "
           "a simple illustration in the middle of a golden rocket launching out of a laptop screen, shiny sparkles, "
           "empty dark banner at the bottom for a name"),
}
CARTA_ESTILO = ("pixel art game card, thick dark plum outline, bold saturated colors, 3-tone cel shading, light from the top, "
                "crisp clean pixels, highly detailed, original design, no text, no logos, no letters")

def saldo(): return requests.get(B + '/balance', headers=H, verify=CA, timeout=40).json()['subscription']['generations']
def b64(arq): return {'type': 'base64', 'base64': base64.b64encode(open(arq, 'rb').read()).decode()}

def main():
    peca, tent = sys.argv[1], int(sys.argv[2])
    extra = sys.argv[3] if len(sys.argv) > 3 else ''
    ferr = sys.argv[4] if len(sys.argv) > 4 else 'pixflux'
    w, h, texto = PECAS[peca]
    if ferr.startswith('pixen-edit:'):
        ref = os.path.join(AQUI, 'bruto', ferr.split(':', 1)[1])
        caminho = '/edit-image-pixen'
        corpo = dict(image=b64(ref), description=extra, no_background=True)
    else:
        caminho = '/create-image-pixflux'
        corpo = dict(description=texto + ', ' + (CARTA_ESTILO if peca == 'carta' else ESTILO) + (', ' + extra if extra else ''),
                     image_size={'width': w, 'height': h}, no_background=True, outline='single color black outline',
                     shading='detailed shading', detail='highly detailed', text_guidance_scale=8)
        if peca != 'carta': corpo.update(isometric=True, view='high top-down')
    s0 = saldo(); t0 = time.time()
    r = requests.post(B + caminho, headers=H, json=corpo, verify=CA, timeout=300)
    ok = r.status_code < 300
    arq = os.path.join(AQUI, 'bruto', f'{peca}-{tent}.png')
    if ok:
        j = r.json(); img = j.get('image') or (j.get('images') or [None])[0]
        open(arq, 'wb').write(base64.b64decode(img['base64']))
    s1 = saldo()
    reg = os.path.join(AQUI, 'registro.json'); L = json.load(open(reg)) if os.path.exists(reg) else []
    L.append(dict(peca=peca, tentativa=tent, ferramenta=caminho.strip('/'), tamanho=[w, h], extra=extra,
                  ok=ok, status=r.status_code, saldo_antes=round(s0, 2), saldo_depois=round(s1, 2), gasto=round(s0 - s1, 2),
                  segundos=round(time.time() - t0), hora_brt=time.strftime('%H:%M'), arquivo=os.path.relpath(arq, AQUI) if ok else None))
    json.dump(L, open(reg, 'w'), indent=1, ensure_ascii=False)
    print(peca, tent, 'ok' if ok else ('ERRO ' + str(r.status_code) + ' ' + r.text[:200]), 'gasto', round(s0 - s1, 2), 'saldo', round(s1, 1))

main()
