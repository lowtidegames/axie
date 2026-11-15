from px import *
from PIL import Image
EST = {'no_background': True, 'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'highly detailed', 'view': 'side', 'direction': 'south', 'text_guidance_scale': 8}
CAB = "rag doll head only, no body, big round stuffed head, mismatched button eyes (one large, one small), thick stitched angry eyebrows, visible cream stitches, front view, centered, isolated game sprite"
PED = [
 ('cabeca-jeans', (64, 64), "made of blue denim fabric, metal zipper mouth, " + CAB),
 ('cabeca-seda', (64, 64), "made of shiny pink silk, zigzag stitched mouth, loose frayed threads sticking out on top, " + CAB),
 ('cabeca-feltro', (64, 64), "made of green felt with a square patch, one eye is an X stitch, grumpy stitched mouth, " + CAB),
 ('cabeca-couro', (64, 64), "made of brown cracked leather, white felt teeth, " + CAB),
 ('tronco-couro', (48, 48), "rag doll torso only, stuffed pillow shaped body, no head, no arms, no legs, made of brown cracked leather with thick cream stitches and a green felt star patch on the chest, front view, centered, isolated game sprite"),
 ('tronco-tule', (48, 48), "rag doll torso only, stuffed pillow shaped body, no head, no arms, no legs, made of lavender tulle with scalloped layers and a red embroidered eye on the chest, front view, centered, isolated game sprite"),
 ('tronco-jeans', (48, 48), "rag doll torso only, stuffed pillow shaped body, no head, no arms, no legs, made of blue denim with metal rivets and two crossed sewing needles embroidered on the chest, front view, centered, isolated game sprite"),
 ('braco-agulha', (32, 48), "single stuffed rag doll arm only, vertical, hanging down, made of pink silk, ending in a long sharp sewing needle instead of a hand, isolated game sprite"),
 ('braco-la', (32, 48), "single long stuffed rag doll arm only, vertical, hanging down, made of cream knitted wool, ending in a spiky pom-pom hand, isolated game sprite"),
 ('perna-tamanco', (32, 40), "single short stuffed rag doll leg only, vertical, made of brown leather, wearing an orange wooden clog, isolated game sprite"),
 ('perna-novelo', (32, 40), "single short stuffed rag doll leg only, vertical, made of cream knitted wool, the foot is a ball of yarn, isolated game sprite"),
]
s0 = saldo()
for nome, (w, h), desc in PED:
    r = post('/create-image-pixflux', dict(EST, description=desc, image_size={'width': w, 'height': h}, seed=5))
    if r: salvar(r['image'], f'solta-{nome}.png'); print(nome, 'ok')
print('gasto:', round(s0 - saldo(), 2))
esc = 6; x = 8
f = Image.new('RGBA', (11*(64*esc+8)+8, 64*esc+16), (27, 18, 38, 255))
for nome, (w, h), _ in PED:
    im = Image.open(f'solta-{nome}.png').convert('RGBA'); f.alpha_composite(im.resize((w*esc, h*esc), Image.NEAREST), (x, 8)); x += w*esc + 8
f.crop((0, 0, x, 64*esc+16)).save('folha-soltas.png')
