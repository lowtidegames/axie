# Piloto do Porão: trata as peças escolhidas (contorno engrossado por código) e monta a cena de prova.
# Uso: python3 -I montar.py <pasta-de-saida-da-cena>
# Peças finais vão para pecas/ (dentro desta pasta). Nada de porao/ é tocado.
import os, sys
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
CONTORNO = (29, 22, 34, 255)  # #1d1622, o mesmo --pix-contorno da arte provisória
ESCOLHA = {'canto': 'canto-2', 'mesa': 'mesa-1', 'rugrigo-costas': 'rugrigo-1', 'rugrigo-frente': 'rugrigo-2',
           'aquario': 'aquario-1', 'carta-lendaria': 'carta-1'}

def engrossar(im):
    """Soma 1 px de contorno escuro por fora da silhueta (vizinhos de 4 lados), sem suavizar."""
    im = im.convert('RGBA'); W, H = im.size
    # alfa duro: meio-transparente vira cheio ou vazio
    px = im.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 255) if a > 127 else (0, 0, 0, 0)
    A = im.getchannel('A').load(); out = im.copy(); o = out.load()
    for y in range(H):
        for x in range(W):
            if A[x, y]: continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and A[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = CONTORNO
    return out

def main():
    pecas = os.path.join(AQUI, 'pecas'); os.makedirs(pecas, exist_ok=True)
    feitas = {}
    for nome, bruto in ESCOLHA.items():
        im = engrossar(Image.open(os.path.join(AQUI, 'bruto', bruto + '.png')))
        im.save(os.path.join(pecas, nome + '.png')); feitas[nome] = im
        print('peca', nome, im.size)
    # cena de prova no tamanho nativo (1x): canto + mesa + Rugrigo de costas + aquário
    cena = Image.new('RGBA', (220, 200), (21, 18, 28, 255))
    cena.alpha_composite(feitas['canto'], (14, 6))
    cena.alpha_composite(feitas['aquario'], (22, 92))
    cena.alpha_composite(feitas['mesa'], (82, 42))
    cena.alpha_composite(feitas['rugrigo-costas'].resize((64, 64), Image.NEAREST) if False else feitas['rugrigo-costas'], (80, 80))
    out = sys.argv[1] if len(sys.argv) > 1 else pecas
    cena.save(os.path.join(out, 'cena-prova-1x.png'))
    cena.resize((cena.width * 3, cena.height * 3), Image.NEAREST).save(os.path.join(out, 'cena-prova-3x.png'))
    print('cena', cena.size)

main()
