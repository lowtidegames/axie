import json, subprocess, os, sys, math
import numpy as np
from PIL import Image, ImageDraw
SR = 44100
DEST = sys.argv[1]; os.makedirs(DEST, exist_ok=True)
pedido = {p['nome']: p for p in json.load(open('pedido.json'))}
def ler(arq):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', arq, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(b, dtype=np.float32).copy()
def medir(x, alvo):
    pico = float(np.max(np.abs(x))) if len(x) else 0.0
    if pico < 1e-4: return dict(pico=pico, ok=False, util=0, ini=0, fim=0, nota=99)
    thr = max(pico * 10 ** (-30 / 20), 0.003)
    idx = np.nonzero(np.abs(x) > thr)[0]
    ini, fim = int(idx[0]), int(idx[-1]); util = (fim - ini) / SR * 1000
    ipico = int(np.argmax(np.abs(x))); ataque = (ipico - ini) / SR * 1000
    ok = pico >= 0.05 and util >= max(25, 0.3 * alvo)
    nota = abs(math.log2(max(util, 1) / alvo)) + (0.5 if pico < 0.15 else 0) + (0.3 if ataque > 0.6 * util else 0)
    return dict(pico=pico, ok=ok, util=util, ini=ini, fim=fim, nota=nota, ataque=ataque)
PERC = {'botao', 'escolherCarta', 'semLinha', 'golpe', 'golpeForte', 'golpeNoEscudo', 'comprarCarta', 'fiapo', 'tesoura', 'queda', 'escudo', 'cartaJogada'}
escolhidos = {}; fracos = []; linhas = []
for nome, p in pedido.items():
    cands = []
    for arq in sorted(os.listdir('bruto')):
        if arq.startswith(nome + '-') and arq.endswith('.mp3'):
            x = ler('bruto/' + arq); m = medir(x, p['alvoMs']); m['arq'] = arq; m['x'] = x; cands.append(m)
    bons = sorted([c for c in cands if c['ok']], key=lambda c: (c['pico'] < 0.25, c['nota']))[:3]
    bons = [c for c in bons if c['pico'] >= 0.25] or bons[:2]
    if len(bons) < 3: fracos.append(f'{nome} ({len(bons)})')
    escolhidos[nome] = []
    for k, c in enumerate(bons, 1):
        x = c['x']; a = max(0, c['ini'] - int(0.004 * SR)); b = min(len(x), c['fim'] + int(0.040 * SR))
        if nome in PERC:  # som de toque: começa junto do estalo principal, sem ruído antes (senão parece atraso)
            forte = np.nonzero(np.abs(x) >= 0.35 * c['pico'])[0]
            if len(forte): a = max(a, int(forte[0]) - int(0.012 * SR))
        b = min(b, a + int(p['alvoMs'] * 2.5 / 1000 * SR) + int(0.05 * SR))
        y = x[a:b].astype(np.float64); n = len(y)
        fi = min(int(0.002 * SR), n // 4); fo = min(int(0.030 * SR), n // 3)
        if fi > 0: y[:fi] *= np.linspace(0, 1, fi)
        if fo > 0: y[-fo:] *= np.linspace(1, 0, fo)
        y *= (10 ** (-3 / 20)) / max(np.max(np.abs(y)), 1e-9)
        saida = f'{DEST}/{nome}-{k}.mp3'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-codec:a', 'libmp3lame', '-q:a', '3', saida], input=y.astype(np.float32).tobytes(), check=True)
        escolhidos[nome].append(dict(arq=f'sons/{nome}-{k}.mp3', de=c['arq'], ms=round(n / SR * 1000), picoBruto=round(20 * math.log10(c['pico']), 1), y=y))
    linhas.append(f"{nome:15s} alvo {p['alvoMs']:4d} ms | usáveis {sum(c['ok'] for c in cands)}/{len(cands)} | escolhidas: " + ', '.join(f"{e['de']} ({e['ms']} ms, bruto {e['picoBruto']} dB)" for e in escolhidos[nome]))
print('\n'.join(linhas)); print('COM MENOS DE 2 TOMADAS BOAS:', fracos or 'nenhum')
# folha de ondas
nomes = list(escolhidos); W, H = 300, 70
im = Image.new('RGB', (3 * (W + 10) + 130, len(nomes) * (H + 8) + 8), (27, 18, 38)); d = ImageDraw.Draw(im)
for i, nome in enumerate(nomes):
    y0 = 8 + i * (H + 8); d.text((6, y0 + H // 2 - 5), nome, fill=(242, 230, 201))
    for k, e in enumerate(escolhidos[nome]):
        x0 = 130 + k * (W + 10); d.rectangle((x0, y0, x0 + W, y0 + H), fill=(42, 27, 61)); y = e['y']; n = len(y)
        for px in range(W):
            seg = y[int(px * n / W):max(int((px + 1) * n / W), int(px * n / W) + 1)]
            d.line((x0 + px, y0 + H / 2 - float(seg.max()) * H / 2, x0 + px, y0 + H / 2 - float(seg.min()) * H / 2), fill=(255, 200, 87))
        d.text((x0 + 4, y0 + 2), f"{e['ms']} ms", fill=(185, 169, 140))
im.save('ondas-escolhidas.png')
json.dump({n: [dict(arq=e['arq'], de=e['de'], ms=e['ms'], picoBruto=e['picoBruto']) for e in v] for n, v in escolhidos.items()}, open('escolhidos.json', 'w'), indent=1, ensure_ascii=False)
json.dump(fracos, open('fracos.json', 'w'))
