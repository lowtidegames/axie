"""Fecha por codigo a assinatura (aros de latao, plaqueta, olho creme de pupila quadrada, mo/ferro) e limpa o contorno.
uso (de dentro de prova-criaturas/): python3 -I tratar_prova.py embolado|brigao  -> <id>-idle.png (64x64)"""
import sys
from PIL import Image, ImageDraw

AME = (0x2B, 0x1E, 0x3A, 255)
CREME = (0xF7, 0xF1, 0xE3, 255)
LAT1, LAT2, LAT3 = (0xE0, 0xC0, 0x78, 255), (0xC9, 0xA4, 0x5C, 255), (0x9A, 0x7A, 0x3E, 255)


def a(im, x, y):
    return 0 <= x < 64 and 0 <= y < 64 and im.getpixel((x, y))[3] > 128


def anel(im, y0, x0, x1):
    """Aro de latao de 3 linhas (luz, meio, sombra) em cima do corpo + contorno ameixa em cima e embaixo."""
    for x in range(x0, x1 + 1):
        if a(im, x, y0) or a(im, x, y0 + 1):
            im.putpixel((x, y0 - 1), AME)
            im.putpixel((x, y0), LAT1)
            im.putpixel((x, y0 + 1), LAT2)
            im.putpixel((x, y0 + 2), LAT3)
            im.putpixel((x, y0 + 3), AME)


def olho(d, x, y):
    """Olho de oficina: creme 5x5 com pupila quadrada 2x2 ameixa e brilho 1px; contorno ameixa."""
    d.rectangle((x - 1, y - 1, x + 5, y + 5), fill=AME)
    d.rectangle((x, y, x + 4, y + 4), fill=CREME)
    d.rectangle((x + 2, y + 2, x + 3, y + 3), fill=AME)
    d.point((x + 1, y + 1), fill=(255, 255, 255, 255))


def plaqueta(d, x, y, forma):
    """Plaqueta pendurada por um cordao (forma: 'prumo' ou 'ferradura')."""
    d.line((x, y, x, y + 3), fill=AME)
    if forma == 'prumo':
        d.polygon([(x - 2, y + 4), (x + 2, y + 4), (x + 1, y + 9), (x - 1, y + 9)], fill=LAT2, outline=AME)
        d.point((x - 1, y + 5), fill=LAT1)
    else:
        d.rectangle((x - 2, y + 4, x + 2, y + 8), fill=LAT2, outline=AME)
        d.point((x, y + 6), fill=AME)
        d.point((x - 1, y + 5), fill=LAT1)


def embolado(im):
    # tira os pes e poe uma mo de pedra atras do corpo
    for y in range(51, 64):
        for x in range(64):
            im.putpixel((x, y), (0, 0, 0, 0))
    for y in range(45, 50):
        for x in range(0, 12):
            im.putpixel((x, y), (0, 0, 0, 0))
    base = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    d.ellipse((13, 45, 51, 63), fill=AME)
    d.ellipse((14, 46, 50, 62), fill=(0xC9, 0xC2, 0xB8, 255))
    d.chord((14, 46, 50, 62), 20, 160, fill=(0xA8, 0xA1, 0x98, 255))
    d.chord((14, 46, 50, 62), 200, 340, fill=(0xDD, 0xD7, 0xCE, 255))
    for x0, y0, x1, y1 in [(18, 56, 24, 52), (40, 56, 46, 53), (32, 62, 32, 59), (22, 60, 26, 58), (38, 60, 42, 58)]:
        d.line((x0, y0, x1, y1), fill=(0x8A, 0x84, 0x7C, 255))
    d.ellipse((29, 53, 35, 59), fill=AME)
    d.ellipse((30, 54, 34, 58), fill=LAT2)
    d.point((31, 55), fill=LAT1)
    base.alpha_composite(im)
    im.paste(base, (0, 0))
    d = ImageDraw.Draw(im)
    anel(im, 16, 12, 52)  # pescoco (sob as ameias)
    anel(im, 47, 12, 52)  # quadril (corpo x mo)
    olho(d, 33, 19)
    olho(d, 41, 19)
    plaqueta(d, 10, 48, 'prumo')


def brigao(im):
    # a cara de carneiro do gerador vira a ponta de ferro do tronco (tons de ferro #6E6A7A)
    troca = {(0xF5, 0xD7, 0xC0): (0x9A, 0x96, 0xAC), (0xC6, 0x7F, 0x7D): (0x6E, 0x6A, 0x7A), (0xCD, 0xA6, 0x8A): (0x6E, 0x6A, 0x7A),
             (0xFA, 0xF9, 0xF7): (0x9A, 0x96, 0xAC), (0xB0, 0xB2, 0xBC): (0x9A, 0x96, 0xAC), (0xE8, 0x37, 0x67): (0x6E, 0x6A, 0x7A)}
    for y in range(24, 50):
        for x in range(44, 64):
            p = im.getpixel((x, y))
            if p[3] > 128 and p[:3] in troca:
                im.putpixel((x, y), troca[p[:3]] + (255,))
    # chifre em aneis de arvore: do marrom do gerador para o verde claro da biblia
    verde = {(0xC3, 0x86, 0x49): (0xC8, 0xF0, 0x6A), (0xC8, 0x8E, 0x4F): (0xC8, 0xF0, 0x6A), (0xA0, 0x64, 0x2F): (0x8F, 0xD0, 0x54),
             (0x80, 0x45, 0x1F): (0x4C, 0xB9, 0x44), (0x37, 0x1C, 0x28): (0x2F, 0x6B, 0x3A)}
    for y in range(14, 38):
        for x in range(30, 62):
            p = im.getpixel((x, y))
            if p[3] > 128 and p[:3] in verde:
                im.putpixel((x, y), verde[p[:3]] + (255,))
    d = ImageDraw.Draw(im)
    olho(d, 51, 30)
    # aro de latao na emenda do tronco com a ponta de ferro
    for y in range(30, 47):
        if a(im, 44, y):
            im.putpixel((43, y), AME)
            im.putpixel((44, y), LAT1)
            im.putpixel((45, y), LAT2)
            im.putpixel((46, y), LAT3)
    plaqueta(d, 17, 40, 'ferradura')


FN = {'embolado': embolado, 'brigao': brigao}
if __name__ == '__main__':
    nome = sys.argv[1]
    src = {'embolado': 'brutos/embolado-texto-2.png', 'brigao': 'brutos/brigao-texto-1.png'}[nome]
    im = Image.open(src).convert('RGBA')
    FN[nome](im)
    im.save(nome + '-idle.png')
