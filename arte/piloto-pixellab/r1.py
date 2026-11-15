from px import *
BASE = "cursed rag doll, big round stuffed head, mismatched button eyes (one large, one small), thick stitched angry eyebrows, floppy stuffed arms and legs, visible cream stitching, a thin glowing pink thread coming out of a chest seam, cute but menacing, full body, standing"
pedidos = [
 ('boneco-jeans-frente', BASE + ", made of blue denim patchwork with metal rivets, metal zipper mouth", 'south'),
 ('boneco-seda-frente', BASE + ", made of pink silk with ribbons, sewing needles as claws, embroidered blue eye on the chest, stitched mouth", 'south'),
 ('boneco-feltro-lado', BASE + ", made of green felt with square patches, cross-stitch mittens, grumpy stitched mouth", 'south-east'),
 ('boneco-couro-lado', BASE + ", made of brown cracked leather with thick stitches, felt teeth, wooden clog feet", 'south-east'),
]
s0 = saldo(); print('saldo antes:', round(s0, 2))
for nome, desc, dire in pedidos:
    r = post('/create-image-pixflux', {'description': desc, 'image_size': {'width': 128, 'height': 128}, 'no_background': True, 'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'highly detailed', 'view': 'side', 'direction': dire, 'text_guidance_scale': 8})
    if r: salvar(r['image'], nome + '.png'); print(nome, 'ok', r.get('usage'))
r = post('/create-image-pixflux', {'description': "witch's attic sewing workshop at night seen from the side, a worn wooden sewing table with a patchwork cloth mat in the foreground as a battle stage, giant spools of thread, pin cushion, lit candle on the left with warm glow, window with a cold full moon on the right, shelves with jars of buttons, an old sewing machine silhouette, cozy and eerie, purple night palette, game background", 'image_size': {'width': 400, 'height': 224}, 'outline': 'selective outline', 'shading': 'detailed shading', 'detail': 'highly detailed', 'view': 'side', 'text_guidance_scale': 8})
if r: salvar(r['image'], 'cena-atelie.png'); print('cena ok', r.get('usage'))
s1 = saldo(); print('saldo depois:', round(s1, 2), '| gasto:', round(s0 - s1, 2))
