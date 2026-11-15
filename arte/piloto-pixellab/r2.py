from px import *
from PIL import Image
D = "blank rag doll mannequin made of plain cream linen, big round stuffed head, two simple black button eyes, small stitched mouth, short stuffed arms held away from the body, short stuffed legs apart, visible stitching seams at neck, shoulders and hips, symmetrical, full body, standing, facing front, centered"
s0 = saldo()
for i, seed in enumerate([11, 23, 37]):
    r = post('/create-image-pixflux', {'description': D, 'image_size': {'width': 128, 'height': 128}, 'no_background': True, 'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'medium detail', 'view': 'side', 'direction': 'south', 'text_guidance_scale': 8, 'seed': seed})
    if r: salvar(r['image'], f'manequim-{i+1}.png')
print('gasto:', round(s0 - saldo(), 2))
folha = Image.new('RGBA', (128*4*3+40, 128*4+20), (27, 18, 38, 255))
for i in range(3):
    im = Image.open(f'manequim-{i+1}.png').convert('RGBA').resize((512, 512), Image.NEAREST); folha.alpha_composite(im, (10+i*522, 10))
folha.save('folha-manequins.png')
