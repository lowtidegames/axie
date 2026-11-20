# Junta PNGs lado a lado, ampliados por escala inteira (vizinho mais próximo), sobre fundo escuro.
# Uso: python3 -I folha.py <saida.png> <escala> <a.png> [b.png ...]
import sys
from PIL import Image
saida, k, arqs = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(a).convert('RGBA') for a in arqs]
ims = [i.resize((i.width * k, i.height * k), Image.NEAREST) for i in ims]
W = sum(i.width for i in ims) + 16 * (len(ims) + 1); Hh = max(i.height for i in ims) + 32
f = Image.new('RGBA', (W, Hh), (34, 28, 40, 255)); x = 16
for i in ims:
    f.alpha_composite(i, (x, 16)); x += i.width + 16
f.save(saida)
print(saida, f.size)
