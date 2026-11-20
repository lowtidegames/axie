# Régua de arte do Porão: trata as peças escolhidas, tira a paleta de 32 cores e monta a cena-âncora.
# Uso: python3 -I montar.py            (escreve em pecas/, paleta.png, paleta.json, sala.png, ancora-cena*.png, referencia-escala.png)
# Regras aplicadas por código (as mesmas que o artista-pixel deve aplicar em toda peça nova):
#   1) alfa duro (sem meio-transparente); 2) cores trocadas pela mais próxima da paleta, sem pontilhado;
#   3) contorno de 1 px #1d1622 fechado em volta da silhueta: borda já escura é recolorida, borda clara ganha 1 px por fora;
#   4) corte na caixa da peça + 1 px de margem. Sombra no chão: nenhuma (é do código da tela).
import os, json
from PIL import Image, ImageOps
AQUI = os.path.dirname(os.path.abspath(__file__))
BRUTO = os.path.join(AQUI, 'bruto'); PECAS = os.path.join(AQUI, 'pecas'); os.makedirs(PECAS, exist_ok=True)
CONTORNO = (29, 22, 34)       # #1d1622, o --pix-contorno do jogo
FUNDO = (21, 18, 28, 255)     # fundo de conferência (a noite do jogo)
N_CORES = 32
# peça final: (arquivo bruto, espelhar?)
ESCOLHA = {
    'rugrigo_sentado': ('rugrigo-3', False),   # rosto à vista (piloto redesenhado em 48 px)
    'rugrigo_costas': ('rugrigo-4', False),    # trabalhando, de costas
    'mesa': ('mesa-2', False),
    'aquario': ('aquario-1', False),
    'trouxa_1': ('trouxa-1', False),
}

def duro(im):
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 255) if a > 127 else (0, 0, 0, 0)
    return im

# PALETA DA RÉGUA: 32 cores escolhidas à mão a partir das cores medidas na sala e nas peças (rampas curtas, 3 tons por material)
# e dos tokens que a tela já usa (ouro, verde do ganho, azul de tela, linho). As 6 cores de RARIDADE não estão aqui de propósito.
PALETA = {
 'contorno': '#1d1622',
 'madeira_1': '#3b2216', 'madeira_2': '#5d371c', 'madeira_3': '#86522a', 'madeira_4': '#b5763f', 'madeira_5': '#f5a55f',
 'tijolo_1': '#4a1f16', 'tijolo_2': '#7a2f22', 'tijolo_3': '#a5452e',
 'pedra_1': '#3a383c', 'pedra_2': '#6a6660', 'pedra_3': '#9a958c',
 'pano_1': '#2a2630', 'pano_2': '#4a4458',
 'pele_1': '#d98a6e', 'pele_2': '#facdad',
 'moletom_1': '#6a0227', 'moletom_2': '#d6082d', 'vermelho_claro': '#ff6b5e',
 'azul_1': '#283a6a', 'azul_2': '#3b8fd9', 'agua': '#39b4e4', 'azul_claro': '#8fd0ff',
 'verde_1': '#185b05', 'verde_2': '#55a10d', 'verde_ganho': '#5be08a',
 'laranja': '#e7723c', 'ouro': '#ffd84a',
 'roxo_1': '#594a86', 'roxo_2': '#a65ae6', 'rosa_neon': '#ff5fa2',
 'linho': '#f3ead6',
}
def lum(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

def avivar(im, sat=1.3, val=1.15):
    """A sala do PixelLab vem apagada perto das peças: sobe saturação e claridade por código antes de ir para a paleta."""
    import colorsys
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r, g, b = colorsys.hsv_to_rgb(h, min(1, s * sat), min(1, v * val)); px[x, y] = (round(r * 255), round(g * 255), round(b * 255), 255)
    return im

def mais_perto(c, pal, memo={}):
    if c in memo: return memo[c]
    # distância com peso de olho (vermelho-médio), boa o bastante para pixel art
    def d(p):
        rm = (c[0] + p[0]) / 2; dr, dg, db = c[0] - p[0], c[1] - p[1], c[2] - p[2]
        return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db
    memo[c] = min(pal, key=d); return memo[c]

def na_paleta(im, pal):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a: px[x, y] = mais_perto((r, g, b), pal) + (255,)
    return im

def contornar(im):
    W, H = im.size; im2 = Image.new('RGBA', (W + 2, H + 2), (0, 0, 0, 0)); im2.alpha_composite(im, (1, 1))
    W, H = im2.size; A = im2.getchannel('A').load(); px = im2.load(); fora = []; borda = []
    viz = ((1, 0), (-1, 0), (0, 1), (0, -1))
    for y in range(H):
        for x in range(W):
            perto = [(x + dx, y + dy) for dx, dy in viz if 0 <= x + dx < W and 0 <= y + dy < H]
            if A[x, y]:
                if len(perto) < 4 or any(not A[p] for p in perto): borda.append((x, y))
            elif any(A[p] for p in perto): fora.append((x, y))
    escuro = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] < 62
    claras = {p for p in borda if not escuro(px[p])}
    for p in borda:
        if p not in claras: px[p] = CONTORNO + (255,)
    for x, y in fora:
        if any((x + dx, y + dy) in claras for dx, dy in viz): px[x, y] = CONTORNO + (255,)
    b = im2.getchannel('A').getbbox()
    cx = im2.crop((max(0, b[0] - 1), max(0, b[1] - 1), min(W, b[2] + 1), min(H, b[3] + 1)))
    out = Image.new('RGBA', (b[2] - b[0] + 2, b[3] - b[1] + 2), (0, 0, 0, 0)); out.alpha_composite(im2.crop(b), (1, 1)); return out

def main():
    sala = duro(Image.open(os.path.join(BRUTO, 'sala-image_url.png')))
    brutos = {}
    for nome, (arq, esp) in ESCOLHA.items():
        p = os.path.join(BRUTO, arq + '.png')
        if not os.path.exists(p): continue
        im = duro(Image.open(p)); brutos[nome] = ImageOps.mirror(im) if esp else im
    pal = [rgb(h) for h in PALETA.values()]; sala = avivar(sala)
    json.dump(PALETA, open(os.path.join(AQUI, 'paleta.json'), 'w'), indent=1)
    tira = Image.new('RGB', (len(pal) * 8, 8))
    for i, c in enumerate(pal): tira.paste(c, (i * 8, 0, i * 8 + 8, 8))
    tira.save(os.path.join(AQUI, 'paleta.png'))
    print('paleta', len(pal), ' '.join('#%02x%02x%02x' % c for c in pal))
    sala = na_paleta(sala, pal); sala.save(os.path.join(AQUI, 'sala.png'))
    feitas = {}
    for nome, im in brutos.items():
        f = contornar(na_paleta(im, pal)); f.save(os.path.join(PECAS, nome + '.png')); feitas[nome] = f
        print('peca', nome, f.size, 'cores', len(f.getcolors(1 << 16)))
    # cena-âncora (1x): a sala pintada + as peças soltas pousadas pelo pé (centro da base)
    cena = Image.new('RGBA', sala.size, FUNDO); cena.alpha_composite(sala)
    def pousar(nome, x, y, espelho=False):
        if nome not in feitas: return
        f = ImageOps.mirror(feitas[nome]) if espelho else feitas[nome]
        cena.alpha_composite(f, (x - f.width // 2, y - f.height + 1))
    pousar('aquario', 76, 134)
    pousar('rugrigo_sentado', 141, 104)
    pousar('trouxa_1', 108, 153, True); pousar('trouxa_1', 123, 158)
    cena.save(os.path.join(AQUI, 'ancora-cena.png'))
    cena.resize((cena.width * 3, cena.height * 3), Image.NEAREST).save(os.path.join(AQUI, 'ancora-cena-3x.png'))
    # referência de escala para os pedidos "dentro da sala": recorte CRU da sala (96x96 a partir de 60,70), sem tratar.
    # É o recorte que deu certo no aquário e na trouxa. Um fundo tratado (paleta reduzida, 128x128, com o Rugrigo)
    # devolveu só um pedaço de chão em 2 gerações (bruto/cadeira_gamer-1.png e -2.png); causa não isolada.
    cru = Image.open(os.path.join(BRUTO, 'sala-image_url.png')).convert('RGBA')
    ref = Image.new('RGBA', cru.size, FUNDO); ref.alpha_composite(cru)
    ref.crop((60, 70, 156, 166)).save(os.path.join(AQUI, 'referencia-escala.png'))
    print('cena', cena.size, 'referencia 96x96 crua')

main()
