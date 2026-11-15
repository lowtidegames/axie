# Folha de sombras das 9 criaturas (prova da sombra da biblia das criaturas).
# Desenha por codigo, em 64x64, preto sobre branco, olhando para a direita.
# uso: python3 arte/piloto-monstros/sombras.py            -> arte/piloto-monstros/folha-sombras.png
#      python3 arte/piloto-monstros/sombras.py --soltas P -> tambem salva uma sombra 64x64 por criatura na pasta P
import os
import sys
from PIL import Image, ImageDraw

P, B = 0, 255  # preto, branco


def bola(d, cx, cy, r, cor=P):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=cor)


def placa(d, x, y):
    """Mark: plaqueta pendurada no aro de tras (cordao + losango)."""
    d.line((x, y, x, y + 4), fill=P, width=1)
    d.polygon([(x, y + 3), (x + 3, y + 6), (x, y + 9), (x - 3, y + 6)], fill=P)


def thwick(d):  # cesto de vime (trapezio de boca larga) + dois manguais de carrapicho
    d.polygon([(15, 34), (45, 34), (41, 54), (19, 54)], fill=P)
    d.rectangle((13, 31, 47, 35), fill=P)  # borda do cesto
    bola(d, 39, 23, 9)  # cabeca-maca de carrapicho
    for x, y in [(39, 11), (30, 15), (48, 15), (51, 24), (27, 24)]:
        bola(d, x, y, 2)
    d.rectangle((20, 54, 26, 60), fill=P)
    d.rectangle((34, 54, 40, 60), fill=P)
    d.polygon([(40, 60), (45, 60), (40, 56)], fill=P)
    d.polygon([(26, 60), (31, 60), (26, 56)], fill=P)
    # manguais: corda fina + bola espinhuda (traco exagerado)
    d.line([(17, 33), (10, 22), (9, 12)], fill=P, width=2)
    bola(d, 9, 8, 5)
    for x, y in [(9, 1), (2, 8), (16, 8), (4, 3), (14, 3)]:
        bola(d, x, y, 1)
    d.line([(45, 36), (53, 40), (57, 46)], fill=P, width=2)
    bola(d, 58, 50, 5)
    for x, y in [(58, 57), (51, 50), (63, 46), (63, 54)]:
        bola(d, x, y, 1)
    placa(d, 14, 40)


def rambark(d):  # tronco de ariete deitado sobre rodas + chifre em caracol gigante
    d.rounded_rectangle((6, 30, 46, 46), radius=5, fill=P)
    d.rectangle((42, 28, 59, 47), fill=P)  # ponta ferrada (cabeca)
    d.polygon([(59, 30), (63, 34), (63, 42), (59, 46)], fill=P)
    bola(d, 42, 23, 13)  # chifre em caracol
    bola(d, 43, 24, 7, B)
    bola(d, 45, 25, 4)
    d.rectangle((44, 30, 58, 36), fill=P)
    for cx in (15, 37):  # rodas de carreta
        bola(d, cx, 53, 7)
        bola(d, cx, 53, 2, B)
    # penas de flecha (bracos Gale) na traseira
    d.polygon([(8, 31), (1, 15), (8, 18), (14, 31)], fill=P)
    d.polygon([(16, 31), (10, 12), (17, 16), (22, 31)], fill=P)
    placa(d, 5, 40)


def kilnjaw(d):  # forno de pao em cupula baixa + chamine torta + bocarra de porta de forno
    d.pieslice((6, 26, 50, 78), 180, 360, fill=P)
    d.rectangle((6, 50, 50, 53), fill=P)
    d.polygon([(40, 34), (63, 27), (63, 35), (46, 43)], fill=P)  # queixo de cima
    d.polygon([(42, 46), (63, 43), (61, 53), (42, 53)], fill=P)  # queixo de baixo
    for x in (50, 55, 60):
        d.polygon([(x - 2, 44), (x + 1, 44), (x, 40)], fill=P)
    d.polygon([(13, 34), (10, 12), (19, 11), (22, 30)], fill=P)  # chamine torta
    d.rectangle((7, 8, 22, 12), fill=P)
    bola(d, 22, 3, 3)
    bola(d, 28, 1, 2)
    for x in (10, 34):  # pes de martelo
        d.rectangle((x + 2, 52, x + 8, 60), fill=P)
        d.rectangle((x, 56, x + 12, 60), fill=P)
    placa(d, 5, 44)


def bickern(d):  # bigorna de perfil (mesa chata, cintura fina, corno para tras) + lanca
    d.rectangle((14, 20, 44, 29), fill=P)
    d.polygon([(14, 20), (14, 29), (0, 21)], fill=P)  # corno da bigorna = rabo
    d.polygon([(21, 29), (39, 29), (36, 40), (24, 40)], fill=P)
    d.rectangle((14, 40, 46, 46), fill=P)
    for x in (14, 35):  # cascos de martelo
        d.rectangle((x + 2, 46, x + 8, 60), fill=P)
        d.rectangle((x, 54, x + 11, 60), fill=P)
    d.polygon([(42, 22), (48, 20), (48, 28), (42, 29)], fill=P)
    bola(d, 52, 20, 8)  # cabeca-maca
    for x, y in [(52, 9), (44, 13), (60, 13), (62, 21)]:
        bola(d, x, y, 2)
    d.polygon([(38, 33), (38, 38), (63, 45)], fill=P)  # lanca apontada para baixo
    bola(d, 42, 36, 3)
    placa(d, 10, 28)


def tiltide(d):  # jarro em pe com alca furada + penacho de agua + lanca para cima + balanco
    d.chord((8, 38, 56, 62), 0, 180, fill=P)  # balanco em meia-lua
    d.chord((12, 34, 52, 56), 0, 180, fill=B)
    d.polygon([(8, 50), (6, 43), (13, 50)], fill=P)
    d.polygon([(56, 50), (58, 43), (51, 50)], fill=P)
    d.rectangle((28, 50, 36, 58), fill=P)
    d.ellipse((21, 24, 43, 52), fill=P)
    d.rectangle((27, 18, 37, 27), fill=P)
    d.ellipse((9, 26, 27, 44), fill=P)  # alca
    d.ellipse((13, 30, 23, 40), fill=B)
    d.rounded_rectangle((24, 8, 41, 21), radius=3, fill=P)  # elmo
    d.polygon([(41, 11), (48, 16), (41, 20)], fill=P)
    d.polygon([(31, 9), (28, 1), (18, 0), (8, 5), (3, 16), (10, 11), (18, 8), (24, 9)], fill=P)  # penacho
    d.polygon([(36, 33), (40, 36), (63, 10)], fill=P)  # lanca
    bola(d, 39, 34, 3)
    placa(d, 12, 43)


def portcully(d):  # guarita quadrada com ameias + queixo de grade + roda de mo
    d.rectangle((14, 20, 44, 46), fill=P)
    d.rectangle((24, 7, 50, 19), fill=P)  # cabeca-guarita
    for x in (24, 34, 44):
        d.rectangle((x, 1, x + 6, 7), fill=P)
    d.rectangle((34, 23, 57, 30), fill=P)  # queixo
    d.rectangle((44, 19, 50, 23), fill=B)
    d.rectangle((52, 19, 57, 23), fill=B)
    for x in (50, 55):
        d.rectangle((x, 18, x + 2, 23), fill=P)
    d.rectangle((6, 22, 14, 42), fill=P)  # folha de portao de tras
    d.rectangle((45, 31, 55, 48), fill=P)  # folha de portao da frente
    bola(d, 29, 52, 9)  # mo
    bola(d, 29, 52, 2, B)
    placa(d, 10, 42)


def skirlet(d):  # fole de gaita deitado (oval largo) + tres tubos em leque + focinho de corneta
    d.ellipse((12, 28, 48, 55), fill=P)
    for x, y in [(3, 9), (12, 3), (23, 2)]:  # tubos (traco exagerado)
        d.line([(22, 34), (x, y)], fill=P, width=3)
        bola(d, x, y, 3)
    bola(d, 47, 33, 9)  # cabeca
    bola(d, 43, 23, 3)
    d.polygon([(53, 31), (63, 24), (63, 42), (53, 36)], fill=P)  # corneta
    d.polygon([(33, 30), (30, 17), (38, 13), (41, 28)], fill=P)  # pa de vela
    for cx in (22, 40):  # pes de cata-vento
        d.polygon([(cx, 51), (cx + 5, 56), (cx, 61), (cx - 5, 56)], fill=P)
        d.rectangle((cx - 4, 55, cx + 4, 57), fill=P)
    placa(d, 13, 46)


def lullfume(d):  # incensario pequeno pendurado na propria fumaca + rabo de fumaca
    bola(d, 28, 6, 4)
    bola(d, 34, 5, 5)
    bola(d, 40, 7, 4)
    for y in (12, 16, 20):  # corrente
        d.rectangle((33, y, 35, y + 2), fill=P)
    d.ellipse((24, 25, 44, 44), fill=P)
    d.polygon([(26, 30), (34, 20), (42, 30)], fill=P)
    bola(d, 25, 26, 3)  # orelhas
    bola(d, 43, 26, 3)
    # mangas compridas que caem retas e enrolam na ponta (nao podem abrir como asa)
    d.polygon([(25, 32), (17, 34), (15, 52), (19, 52), (21, 40), (26, 38)], fill=P)
    bola(d, 15, 54, 3)
    d.polygon([(43, 32), (51, 34), (53, 52), (49, 52), (47, 40), (42, 38)], fill=P)
    bola(d, 53, 54, 3)
    for x, y, r in [(34, 46, 5), (31, 51, 4), (33, 55, 3), (36, 58, 2), (35, 61, 1)]:
        bola(d, x, y, r)


def mumflask(d):  # frasco em gota + rolha na boca + serpentina em espiral + vara de pescar
    bola(d, 28, 42, 13)
    d.polygon([(22, 33), (34, 33), (35, 22), (27, 22)], fill=P)
    bola(d, 34, 16, 9)  # cabeca
    bola(d, 31, 6, 3)  # olho em torre
    d.polygon([(41, 13), (51, 11), (52, 19), (42, 21)], fill=P)  # rolha
    d.ellipse((0, 34, 18, 52), fill=P)  # serpentina
    d.ellipse((3, 37, 15, 49), fill=B)
    bola(d, 9, 43, 3)
    d.rectangle((9, 43, 13, 45), fill=P)
    for x in (17, 31):  # pes de pilao
        d.polygon([(x + 1, 52), (x + 9, 52), (x + 10, 60), (x, 60)], fill=P)
    d.line([(38, 38), (48, 31), (56, 28), (62, 31)], fill=P, width=2)  # vara
    d.line([(62, 31), (62, 45)], fill=P, width=1)
    d.arc((57, 43, 62, 49), 0, 180, fill=P)
    placa(d, 20, 52)


ELENCO = [
    ('Thwick', thwick), ('Rambark', rambark), ('Kilnjaw', kilnjaw), ('Bickern', bickern), ('Tiltide', tiltide),
    ('Portcully', portcully), ('Skirlet', skirlet), ('Lullfume', lullfume), ('Mumflask', mumflask),
]


def sombra(fn):
    im = Image.new('L', (64, 64), B)
    fn(ImageDraw.Draw(im))
    return im.point(lambda v: P if v < 128 else B)


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    sombras = [(nome, sombra(fn)) for nome, fn in ELENCO]
    esc, vao = 4, 12
    lado = 64 * esc
    larg = len(sombras) * (lado + vao) + vao
    folha = Image.new('L', (larg, vao + lado + 16 + 64 + 20 + vao), B)
    d = ImageDraw.Draw(folha)
    x = vao
    for nome, im in sombras:
        folha.paste(im.resize((lado, lado), Image.NEAREST), (x, vao))
        d.rectangle((x, vao, x + lado - 1, vao + lado - 1), outline=200)
        d.text((x + 4, vao + lado + 3), nome, fill=P)
        # prova em 32 px (metade do tamanho), mostrada em x2 para caber o olho
        p32 = im.resize((32, 32), Image.BOX).point(lambda v: P if v < 140 else B)
        folha.paste(p32.resize((64, 64), Image.NEAREST), (x + (lado - 64) // 2, vao + lado + 18))
        x += lado + vao
    saida = os.path.join(aqui, 'folha-sombras.png')
    folha.save(saida)
    print(saida, folha.size)
    if '--soltas' in sys.argv:
        pasta = sys.argv[sys.argv.index('--soltas') + 1]
        os.makedirs(pasta, exist_ok=True)
        for nome, im in sombras:
            im.save(os.path.join(pasta, 'sombra-' + nome.lower() + '.png'))


if __name__ == '__main__':
    main()
