from px import *
from PIL import Image
COMUM = ", big round stuffed head, mismatched button eyes (one large, one small), thick stitched angry eyebrows, short floppy stuffed arms held away from the body, short stuffed legs apart, visible cream stitching at neck, shoulders and hips, cute but menacing, full body, standing, facing front, centered"
PED = [
 ('jeans', "cursed rag doll entirely made of blue denim with metal rivets, metal zipper mouth, denim head, denim body, denim arms, denim legs" + COMUM),
 ('seda', "cursed rag doll entirely made of shiny pink silk with ribbons, stitched zigzag mouth, sewing needles as hands, embroidered blue eye on the chest, silk head, silk slippers" + COMUM),
 ('feltro', "cursed rag doll entirely made of green felt with square fabric patches, grumpy stitched mouth, cross-stitch mitten hands, patched felt legs" + COMUM),
 ('couro', "cursed rag doll entirely made of brown cracked leather with thick cream stitches, felt teeth, green felt star patch on the chest, orange wooden clog feet" + COMUM),
 ('tule', "cursed rag doll entirely made of lavender tulle and lace, veil over the head, scalloped layered body, frayed thread legs, red embroidered slashes on the chest" + COMUM),
 ('la', "cursed rag doll entirely made of cream knitted wool, knitted beanie with pom-pom, long knitted arms, yarn ball feet, button on the belly" + COMUM),
]
s0 = saldo()
for nome, desc in PED:
    r = post('/create-image-pixflux', {'description': desc, 'image_size': {'width': 128, 'height': 128}, 'no_background': True, 'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'highly detailed', 'view': 'side', 'direction': 'south', 'text_guidance_scale': 8, 'init_image': b64('manequim-1.png'), 'init_image_strength': 300, 'seed': 7})
    if r: salvar(r['image'], f'inteiro-{nome}.png'); print(nome, 'ok')
print('gasto:', round(s0 - saldo(), 2))
REG = { 'cabeca': [(26, 0, 102, 50)], 'tronco': [(50, 49, 79, 90)], 'bracos': [(26, 50, 53, 96), (76, 50, 102, 96)], 'pernas': [(42, 86, 86, 128)] }
def parte(slot, nome):
    im = Image.open(f'inteiro-{nome}.png').convert('RGBA'); out = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    for (x0, y0, x1, y1) in REG[slot]: out.alpha_composite(im.crop((x0, y0, x1 + 1, y1 + 1)), (x0, y0))
    return out
def boneco(c, t, b, p):
    o = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    for slot, nome in (('pernas', p), ('bracos', b), ('tronco', t), ('cabeca', c)): o.alpha_composite(parte(slot, nome))
    return o
nomes = [p[0] for p in PED]; esc = 4
f = Image.new('RGBA', (6*(128*esc+8)+8, 2*(128*esc+8)+8), (27, 18, 38, 255))
for i, n in enumerate(nomes): f.alpha_composite(Image.open(f'inteiro-{n}.png').convert('RGBA').resize((512, 512), Image.NEAREST), (8 + i*520, 8))
combos = [('jeans','couro','seda','la'), ('seda','tule','la','feltro'), ('feltro','jeans','couro','tule'), ('couro','la','jeans','seda'), ('tule','seda','feltro','couro'), ('la','feltro','tule','jeans')]
for i, c in enumerate(combos): b = boneco(*c); b.save(f'misto-{i+1}.png'); f.alpha_composite(b.resize((512, 512), Image.NEAREST), (8 + i*520, 528))
f.save('folha-inteiros-e-mistos.png')
