# folha de conferência: python3 -I folha.py saida.png arq1 arq2 ... (zoom 2x/3x, fundo noite)
import sys
from PIL import Image
out, fs = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGBA') for f in fs]
W = sum(i.width + 8 for i in ims); H = max(i.height for i in ims) + 8
S = Image.new('RGBA', (W, H), (40, 36, 50, 255)); x = 4
for i in ims: S.alpha_composite(i, (x, 4)); x += i.width + 8
z = 3 if W < 400 else 2
S.resize((W * z, H * z), Image.NEAREST).save(out)
