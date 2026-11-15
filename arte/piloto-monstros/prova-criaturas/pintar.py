"""Pinta a sombra 64x64 com cores planas da paleta da criatura (guia para o gerador).
uso (de dentro de prova-criaturas/): python3 -I pintar.py embolado|brigao saida.png"""
import sys
from PIL import Image, ImageDraw, ImageChops


def hx(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


nome, saida = sys.argv[1], sys.argv[2]
sh = Image.open('sombras/sombra-' + ('portcully' if nome == 'embolado' else 'rambark') + '.png').convert('L')
im = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
m = sh.point(lambda v: 255 if v < 128 else 0)
if nome == 'embolado':
    reg = [((0, 0, 63, 63), hx('#B07A4A')), ((24, 0, 50, 19), hx('#C9C2B8')), ((34, 23, 57, 30), hx('#6E6A7A')),
           ((6, 22, 14, 42), hx('#6B4A3A')), ((45, 31, 55, 48), hx('#6B4A3A')), ((19, 49, 40, 62), hx('#C9C2B8'))]
else:
    reg = [((0, 0, 63, 63), hx('#8A5E3C')), ((42, 28, 63, 47), hx('#6E6A7A')), ((28, 8, 58, 40), hx('#4CB944')),
           ((0, 10, 24, 31), hx('#E8C547')), ((6, 46, 24, 62), hx('#2B2B33')), ((28, 46, 46, 62), hx('#2B2B33'))]
for box, c in reg:
    t = Image.new('RGBA', (64, 64), c)
    b = Image.new('L', (64, 64), 0)
    ImageDraw.Draw(b).rectangle(box, fill=255)
    im.paste(t, (0, 0), ImageChops.multiply(m, b))
d = ImageDraw.Draw(im)
if nome == 'embolado':
    d.rectangle((27, 29, 31, 31), fill=hx('#FFD25A'))
else:
    d.ellipse((13, 49, 17, 53), fill=hx('#F05A3C'))
    d.ellipse((35, 51, 39, 55), fill=hx('#F05A3C'))
im.save(saida)
