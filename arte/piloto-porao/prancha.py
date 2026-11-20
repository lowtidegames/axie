# Piloto do Porão: prancha de comparação lado a lado, tudo em 2x (o zoom da cena do jogo), fundo escuro igual.
# Uso: python3 -I prancha.py <saida.png> <foto-provisorio.png> <prov-rugrigo_a.png> [rieka.png salvaje.png]
# Sem as imagens dos pacotes, a coluna do meio vira só descrição (é a versão que fica no repositório:
# imagem de pacote não comprado não entra no git).
import os, sys
from PIL import Image, ImageDraw, ImageFont
AQUI = os.path.dirname(os.path.abspath(__file__))
FUNDO = (21, 18, 28, 255); TXT = (242, 230, 201, 255); OURO = (255, 200, 87, 255); CINZA = (185, 169, 140, 255)
F = lambda s, b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans' + ('-Bold' if b else '') + '.ttf', s)
z2 = lambda im: im.resize((im.width * 2, im.height * 2), Image.NEAREST)

saida, foto, prov_rug = sys.argv[1:4]
pac = sys.argv[4:6] if len(sys.argv) >= 6 else None
pecas = os.path.join(AQUI, 'pecas')
COLW, W, H = 520, 1640, 1080
P = Image.new('RGBA', (W, H), FUNDO); d = ImageDraw.Draw(P)
d.text((20, 14), 'Porão — piloto de arte (20/11/2026) · tudo em 2x, vizinho mais próximo, mesmo fundo', font=F(22, True), fill=TXT)
X = [20, 20 + COLW + 40, 20 + 2 * (COLW + 40)]
for x, t in zip(X, ['A) PixelLab (11 gerações)', 'B) Pacotes prontos (não comprados)', 'C) Arte provisória atual (código)']):
    d.text((x, 56), t, font=F(20, True), fill=OURO)

# A) PixelLab: cena de prova + Rugrigo de frente + carta Lendária
cena = Image.open(os.path.join(pecas, 'cena-prova-1x.png')).convert('RGBA')
P.alpha_composite(z2(cena), (X[0], 92))
P.alpha_composite(z2(Image.open(os.path.join(pecas, 'rugrigo-frente.png'))), (X[0], 500))
P.alpha_composite(z2(Image.open(os.path.join(pecas, 'carta-lendaria.png'))), (X[0] + 210, 500))

# B) Pacotes
if pac:
    r = Image.open(pac[0]).convert('RGBA').crop((0, 0, 1040, 800))           # prévia oficial 4x -> 2x
    r = r.resize((r.width // 2, r.height // 2), Image.NEAREST)
    P.alpha_composite(r, (X[1], 92)); d.text((X[1], 92 + r.height + 4), 'Isometric Home Interiors (riekahq) · US$ 5 · prévia 4x → 2x', font=F(14), fill=CINZA)
    s = Image.open(pac[1]).convert('RGBA').crop((270, 130, 1190, 960))       # print do editor deles (zoom ~3x)
    s = s.resize((s.width // 3, s.height // 3), Image.NEAREST)
    P.alpha_composite(s, (X[1], 520)); d.text((X[1], 520 + s.height + 4), 'Isometric Interiors (pixel-salvaje) · US$ 15 · print ~3x → ~1x', font=F(14), fill=CINZA)
else:
    linhas = [
        ('Isometric Home Interiors (riekahq) · US$ 5', True),
        ('grade 2:1 de 32×16, igual à do jogo; 95 peças,', False),
        ('30 cores, contorno escuro, luz de cima-esquerda.', False),
        ('Peças planas e simples (blocos com 2-3 tons);', False),
        ('nível de detalhe parecido com a arte provisória.', False),
        ('Sem personagem, sem carta, sem aquário rico.', False),
        ('Feito "como código com ajuda de IA" (diz a página).', False),
        ('', False),
        ('Isometric Interiors (pixel-salvaje) · US$ 15', True),
        ('800+ peças, salas prontas (escritório, escada,', False),
        ('laboratório), feito à mão, detalhe alto, escada', False),
        ('e PC bons; contorno fino, cores médias.', False),
        ('Sem personagem e sem carta: Rugrigo, gente e', False),
        ('cartas teriam de vir de outro lugar (mistura).', False),
        ('Visual "sala de hotel de pixel" genérico, comum', False),
        ('em muitos jogos: cara própria baixa.', False),
        ('', False),
        ('Imagens dos pacotes NÃO ficam no repositório:', True),
        ('prancha com as prévias só na pasta de rascunho.', False),
    ]
    y = 96
    for t, b in linhas:
        d.text((X[1], y), t, font=F(17, b), fill=TXT if b else CINZA); y += 27

# C) Provisória: foto da cena no navegador (já em 2x) + Rugrigo provisório em 2x
f = Image.open(foto).convert('RGBA').crop((380, 180, 900, 545))
P.alpha_composite(f, (X[2], 92))
P.alpha_composite(z2(Image.open(prov_rug).convert('RGBA')), (X[2], 500))
d.text((X[2] + 60, 500), 'Rugrigo provisório 22×36 (2x)', font=F(14), fill=CINZA)

# Notas
y0 = 800
notas = [
    ('A) PixelLab  Trindade: D 88 · Cg 74 · Ch 90', 'cores fortes, contorno engrossado por código, detalhe alto, Rugrigo e carta próprios; MAS escala muda entre gerações (sala pequena p/ móveis) e ângulo ~2:1 só "fraco".'),
    ('B) Pacotes   Trindade: D 62 · Cg 55 · Ch 85', 'riekahq: grade exata mas simples demais; salvaje: bonito, mas sem personagem/carta e com cara de "sala de pixel" genérica.'),
    ('C) Provisória Trindade: D 45 · Cg 80 · Ch 95', 'grade e escala perfeitas (é o motor), lê bem pequeno, mas pobre: blocos lisos, Rugrigo de 22 px sem rosto.'),
]
for t, n in notas:
    d.text((20, y0), t, font=F(18, True), fill=OURO); d.text((20, y0 + 26), n, font=F(15), fill=TXT); y0 += 68
d.text((20, y0 + 6), 'Recomendação: PixelLab com régua de escala fixa + contorno engrossado por código (nota 86) · mistura com pacote 68 · só pacote 55.', font=F(15, True), fill=TXT)
d.text((20, y0 + 30), 'Atenção: no mesmo zoom a peça do PixelLab é ~2,5x maior que a provisória (Rugrigo 87 px × 36 px): a grade da cena teria de crescer (quem mexe: dev da tela, porao/tela/sprites.js).', font=F(15), fill=CINZA)
P.save(saida); print(saida, P.size)
