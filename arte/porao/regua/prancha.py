# Prancha de conferência da âncora: cena nova × arte provisória do jogo, mesmo zoom (3x) e mesmo fundo.
# Uso: python3 -I prancha.py <arquivo-de-saida.png>   (a foto fica FORA do repositório, na pasta de rascunho)
import os, sys
from PIL import Image, ImageDraw, ImageFont
AQUI = os.path.dirname(os.path.abspath(__file__)); Z = 3; FUNDO = (21, 18, 28, 255)
def abrir(*p): return Image.open(os.path.join(AQUI, *p)).convert('RGBA')
def f(t): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', t - 2)

cena = abrir('ancora-cena.png')
# arte provisória: painel C da prancha do piloto (lá está em 2x; volta a 1x por vizinho mais próximo)
comp = abrir('..', '..', 'piloto-porao', 'comparacao.png').crop((1140, 96, 1640, 456)); prov = comp.resize((250, 180), Image.NEAREST)
pecas = ['rugrigo_sentado', 'rugrigo_costas', 'mesa', 'aquario', 'trouxa_1']
W, H = 1600, 960
P = Image.new('RGBA', (W, H), FUNDO); d = ImageDraw.Draw(P)
d.text((20, 14), 'Porão — âncora de escala (20/11/2026) · tudo em 3x, vizinho mais próximo, mesmo fundo', fill=(243, 234, 214), font=f(22))
d.text((20, 52), 'A) Âncora nova: sala do PixelLab (grade 32×16) + peças soltas na paleta de 32 cores', fill=(255, 216, 74), font=f(18))
d.text((800, 52), 'B) Arte provisória do jogo (código), a mesma grade', fill=(255, 216, 74), font=f(18))
P.alpha_composite(cena.resize((cena.width * Z, cena.height * Z), Image.NEAREST), (20, 84))
P.alpha_composite(prov.resize((prov.width * Z, prov.height * Z), Image.NEAREST), (800, 84))
y0 = 84 + cena.height * Z + 40
d.text((20, y0 - 28), 'Peças soltas (contorno #1d1622 de 1 px, sem sombra no chão) · medida em px no tamanho real', fill=(255, 216, 74), font=f(18))
x = 20
for n in pecas:
    im = abrir('pecas', n + '.png'); P.alpha_composite(im.resize((im.width * Z, im.height * Z), Image.NEAREST), (x, y0))
    d.text((x, y0 + 61 * Z + 8), f'{n}\n{im.width}×{im.height}', fill=(191, 179, 160), font=f(14)); x += im.width * Z + 36
# Rugrigo: provisório do jogo (22×36) recortado da prancha do piloto, para a régua de altura
rp = abrir('..', '..', 'piloto-porao', 'comparacao.png').crop((1144, 500, 1188, 572)).resize((22, 36), Image.NEAREST)
P.alpha_composite(rp.resize((22 * Z, 36 * Z), Image.NEAREST), (x + 10, y0 + (48 - 36) * Z))
d.text((x + 10, y0 + 61 * Z + 8), 'Rugrigo provisório\n22×36', fill=(191, 179, 160), font=f(14)); x += 22 * Z + 90
pal = abrir('paleta.png'); P.alpha_composite(pal.resize((pal.width * 2, 28), Image.NEAREST), (x, y0 + 20))
d.text((x, y0 - 4), 'Paleta da régua (32 cores)', fill=(191, 179, 160), font=f(14))
bruta = abrir('bruto', 'sala-image_url.png'); bb = Image.new('RGBA', bruta.size, FUNDO); bb.alpha_composite(bruta)
P.alpha_composite(bb, (x, y0 + 70)); d.text((x + 256, y0 + 80), 'sala como veio\ndo serviço (1x):\ncores apagadas,\navivadas por código', fill=(191, 179, 160), font=f(14))
P.save(sys.argv[1]); print('prancha', P.size)
