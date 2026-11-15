"""folha-prova.png: finais x4 ao lado da sombra; embaixo os 5 genericos da primeira rodada x3. uso (de prova-criaturas/): python3 -I folha.py"""
from PIL import Image, ImageDraw, ImageFont

BG, TXT = (232, 230, 224), (43, 30, 58)
try:
    F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except OSError:
    F = ImageFont.load_default()
W, H = 1180, 780
f = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(f)


def poe(arq, x, y, esc, fundo=None):
    im = Image.open(arq).convert('RGBA').resize((64 * esc, 64 * esc), Image.NEAREST)
    if fundo:
        d.rectangle((x - 3, y - 3, x + 64 * esc + 2, y + 64 * esc + 2), fill=fundo)
    f.paste(im, (x, y), im)


def sombra(arq, x, y, esc):
    im = Image.open(arq).convert('L').resize((64 * esc, 64 * esc), Image.NEAREST)
    f.paste(Image.merge('RGB', (im, im, im)), (x, y))


d.text((20, 12), 'PROVA DO CONCEITO: objeto de oficio que criou vida (final tratado x4 | sombra da biblia x4)', font=F, fill=TXT)
for i, (nome, fim, som, leg) in enumerate([
        ('embolado', 'embolado-idle.png', 'sombras/sombra-portcully.png', 'Portcully (embolado, Stone)'),
        ('brigao', 'brigao-idle.png', 'sombras/sombra-rambark.png', 'Rambark (brigao, Bloom)')]):
    x0 = 20 + i * 580
    poe(fim, x0, 44, 4)
    sombra(som, x0 + 270, 44, 4)
    d.text((x0, 306), leg, font=F, fill=TXT)
d.line((20, 340, W - 20, 340), fill=(170, 168, 160), width=2)
d.text((20, 352), '1a rodada (reprovada: "muito genericos"), x3, para comparar', font=F, fill=TXT)
mons = [('rasgao', 'rasgao'), ('mordedor', 'mordedor'), ('cascudo', 'cascudo'), ('assombrado', 'assombrado'), ('desfiado', 'desfiado')]
for i, (n, leg) in enumerate(mons):
    x = 20 + i * 228
    poe('../../../public/piloto/arte/monsters/%s-idle.png' % n, x, 380, 3)
    d.text((x, 580), leg, font=F, fill=TXT)
d.text((20, 620), 'Os dois novos ao lado dos genericos, x3:', font=F, fill=TXT)
poe('embolado-idle.png', 20, 648, 2)
poe('brigao-idle.png', 160, 648, 2)
f.save('folha-prova.png')
