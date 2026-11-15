from px import *
from PIL import Image
COMUM = ", big round stuffed head, mismatched button eyes (one large, one small), thick stitched angry eyebrows, short floppy stuffed arms held away from the body, short stuffed legs apart, visible cream stitching at neck, shoulders and hips, cute but menacing, full body, standing, facing front, centered"
desc = "cursed rag doll entirely made of blue denim with metal rivets, metal zipper mouth, denim head, denim body, denim arms, denim legs" + COMUM
s0 = saldo(); fs = [20, 60, 120]
for f in fs:
    r = post('/create-image-pixflux', {'description': desc, 'image_size': {'width': 128, 'height': 128}, 'no_background': True, 'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'highly detailed', 'view': 'side', 'direction': 'south', 'text_guidance_scale': 8, 'init_image': b64('manequim-1.png'), 'init_image_strength': f, 'seed': 7})
    if r: salvar(r['image'], f'forca-{f}.png'); print(f, 'ok')
print('gasto:', round(s0 - saldo(), 2))
fo = Image.new('RGBA', (4*520+8, 528), (27, 18, 38, 255))
fo.alpha_composite(Image.open('manequim-1.png').convert('RGBA').resize((512, 512), Image.NEAREST), (8, 8))
for i, f in enumerate(fs): fo.alpha_composite(Image.open(f'forca-{f}.png').convert('RGBA').resize((512, 512), Image.NEAREST), (8 + (i+1)*520, 8))
fo.save('folha-forcas.png')
