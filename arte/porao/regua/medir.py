# Mede peças contra a régua: assinatura PNG, margem de 1 px, linha do pé, alfa duro e cores dentro da paleta.
# Uso: python3 -I medir.py [arquivos .png ...]   (sem argumentos: mede sala, cena e tudo de pecas/)
import json, os, sys
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
PAL = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in json.load(open(os.path.join(AQUI, 'paleta.json'))).values()}
arqs = sys.argv[1:] or [os.path.join(AQUI, n) for n in ('sala.png',)] + \
    [os.path.join(AQUI, 'pecas', f) for f in sorted(os.listdir(os.path.join(AQUI, 'pecas')))]
ruim = 0
for p in arqs:
    im = Image.open(p).convert('RGBA'); W, H = im.size; b = im.getchannel('A').getbbox(); cont = im.getcolors(1 << 20)
    cores = {c[:3] for _, c in cont if c[3]}; alfas = sorted({c[3] for _, c in cont})
    png = open(p, 'rb').read(4) == b'\x89PNG'; inteira = b == (0, 0, W, H)      # sala e cena ocupam o quadro todo
    m = (b[0], W - b[2], b[1], H - b[3])
    ok = png and not (cores - PAL) and set(alfas) <= {0, 255} and (inteira or min(m) >= 1)
    ruim += not ok
    print(os.path.basename(p), 'PNG ok' if png else 'NAO E PNG', f'{W}x{H}', 'margens esq %d dir %d topo %d baixo %d' % m, 'pe y=%d' % (b[3] - 1),
          'cores', len(cores), 'fora da paleta', len(cores - PAL), 'alfas', alfas, 'OK' if ok else 'FALHA')
sys.exit(1 if ruim else 0)
