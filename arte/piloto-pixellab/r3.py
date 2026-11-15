from px import *
from PIL import Image, ImageDraw
base = Image.open('manequim-1.png').convert('RGBA'); print('caixa do manequim:', base.getbbox())
REG = { 'cabeca': [(26, 0, 102, 50)], 'tronco': [(50, 49, 79, 90)], 'bracos': [(26, 50, 53, 96), (76, 50, 102, 96)], 'pernas': [(42, 86, 86, 128)] }
def mascara(nome):
    m = Image.new('RGB', (128, 128), (0, 0, 0)); d = ImageDraw.Draw(m)
    for r in REG[nome]: d.rectangle(r, fill=(255, 255, 255))
    m.save(f'mascara-{nome}.png'); return f'mascara-{nome}.png'
for n in REG: mascara(n)
PED = [
 ('cabeca', 'jeans', "big round rag doll head made of blue denim fabric, mismatched button eyes (one large cream button, one small black button), thick stitched angry eyebrows, metal zipper mouth, visible cream stitches"),
 ('cabeca', 'seda', "big round rag doll head made of shiny pink silk, mismatched button eyes, angry stitched eyebrows, stitched zigzag mouth, loose frayed threads sticking out on top like hair"),
 ('cabeca', 'feltro', "big square-ish rag doll head made of green felt with patches, one button eye and one X stitched eye, heavy angry brow, grumpy stitched mouth"),
 ('tronco', 'couro', "stuffed rag doll torso made of brown cracked leather with thick cream stitches and a green felt star patch on the chest"),
 ('tronco', 'tule', "stuffed rag doll torso made of lavender tulle fabric with scalloped layers and a red embroidered eye on the chest"),
 ('tronco', 'jeans', "stuffed rag doll torso made of blue denim with metal rivets and two crossed sewing needles embroidered on the chest"),
 ('bracos', 'agulha', "two rag doll arms made of pink silk ending in long sharp sewing needles instead of hands"),
 ('bracos', 'la', "two long knitted wool rag doll arms, cream colored, ending in spiky pom-pom hands"),
 ('pernas', 'tamanco', "two short rag doll legs made of brown leather wearing orange wooden clogs"),
 ('pernas', 'novelo', "two short knitted wool rag doll legs, cream colored, with feet made of balls of yarn"),
]
s0 = saldo()
for slot, nome, desc in PED:
    r = post('/inpaint', {'description': desc, 'image_size': {'width': 128, 'height': 128}, 'inpainting_image': b64('manequim-1.png'), 'mask_image': b64(f'mascara-{slot}.png'), 'no_background': True, 'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'highly detailed', 'view': 'side', 'direction': 'south', 'text_guidance_scale': 6})
    if r: salvar(r['image'], f'parte-{slot}-{nome}.png'); print(slot, nome, 'ok')
print('gasto:', round(s0 - saldo(), 2))
