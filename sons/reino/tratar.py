"""Tratamento das amostras do Reino (medido, nao ouvido).
Uso: python3 -I sons/reino/tratar.py medir | gerar [evento ...]   (com eventos: so esses sao regravados; o resto do manifesto fica como esta)
Le sons/reino/bruto/<evento>-<n>.mp3; escreve public/reino/sons/<evento>-<k>.mp3 (mono, 44,1 kHz, 96 kbps)
e public/reino/sons/manifesto.json. Alvo de pico = tabela da parte 5 de docs/reino/som.md (o motor reajusta ao alvo de qualquer forma)."""
import json, subprocess, os, sys, math
import numpy as np
SR = 44100
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BRUTO = os.path.join(RAIZ, 'sons/reino/bruto'); DEST = os.path.join(RAIZ, 'public/reino/sons')
# evento: (duracao esperada util em ms [min, max], pico alvo dBFS, buraco maximo em ms)
EV = {
  'choque': ((200, 1500), -11), 'marcha': ((500, 1200), -13), 'casteloRacha': ((500, 1500), -7), 'muralha': ((150, 800), -11),
  'chefeEntra': ((600, 1500), -7), 'flecha': ((120, 800), -14), 'espolio': ((250, 1000), -11), 'recorde': ((500, 1500), -8),
  # R35 (20/11/2026): o que a sintese faz pior — bicho, panela, mordida, porta, corpo grande caindo e o pisao do chefe
  'golpeBicada': ((120, 420), -13), 'golpeFrigideira': ((150, 700), -12), 'golpeMordida': ((120, 500), -13), 'golpePortada': ((150, 700), -12),
  'chefeTomba': ((500, 1500), -8), 'pisao': ((400, 1200), -7),
}
def ler(arq):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', arq, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(b, dtype=np.float32).astype(np.float64)
def medir(x):
    pico = float(np.max(np.abs(x))); thr = pico * 10 ** (-30 / 20)
    idx = np.nonzero(np.abs(x) > thr)[0]; ini, fim = int(idx[0]), int(idx[-1])
    # buraco: janelas de 10 ms abaixo de pico-42 dB entre ini e fim
    j = int(0.01 * SR); seg = x[ini:fim]; n = len(seg) // j
    rms = np.sqrt(np.mean(seg[:n * j].reshape(n, j) ** 2, axis=1)) if n else np.array([1.0])
    mudo = rms < pico * 10 ** (-42 / 20); maior = cur = 0
    for m in mudo:
        cur = cur + 1 if m else 0; maior = max(maior, cur)
    # centroide espectral (voz/musica tem tons: planicidade baixa); so informativo
    f = np.abs(np.fft.rfft(x[ini:fim] * np.hanning(fim - ini) + 1e-12)) + 1e-12
    plan = float(np.exp(np.mean(np.log(f))) / np.mean(f))
    return dict(pico=pico, pico_db=20 * math.log10(pico), ini=ini, fim=fim, util=(fim - ini) / SR * 1000, buraco=maior * 10, plan=plan,
                total=len(x) / SR * 1000)
def tratar(x, m, alvo_db):
    a = max(0, m['ini'] - int(0.003 * SR)); b = min(len(x), m['fim'] + int(0.060 * SR))
    y = x[a:b].copy(); n = len(y)
    fi = int(0.002 * SR); fo = min(int(0.060 * SR), n // 3)
    y[:fi] *= np.linspace(0, 1, fi); y[-fo:] *= np.linspace(1, 0, fo)
    # nivelar: pico em alvo_db dBFS (pico aproximado; mp3 pode passar um pouco, entao -0.5 dB de folga no alvo final)
    y *= 10 ** (alvo_db / 20) / np.max(np.abs(y))
    return y
def gravar(y, arq):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '96k', '-ar', str(SR), '-ac', '1', arq],
                       input=y.astype(np.float32).tobytes(), capture_output=True)
    if p.returncode: raise SystemExit(p.stderr.decode())
def candidatos():
    out = {}
    for ev, ((dmin, dmax), alvo) in EV.items():
        c = []
        for k in (1, 2, 3):
            arq = os.path.join(BRUTO, f'{ev}-{k}.mp3')
            if not os.path.exists(arq): continue
            x = ler(arq); m = medir(x); m['k'] = k; m['x'] = x
            falhas = []
            if m['pico'] < 0.1: falhas.append('fraca')
            if not dmin <= m['util'] <= dmax: falhas.append(f"duracao {m['util']:.0f} ms fora de {dmin}-{dmax}")
            if m['buraco'] > 150 and ev not in ('marcha', 'chefeEntra', 'casteloRacha', 'flecha'): falhas.append(f"buraco {m['buraco']} ms")
            tmp = os.path.join(BRUTO, '_prova.mp3'); gravar(tratar(x, m, -10), tmp); t = ler(tmp)  # ida e volta pelo mp3: o começo medido é o do arquivo final
            o = np.nonzero(np.abs(t) > np.max(np.abs(t)) * 10 ** (-30 / 20))[0][0] / SR * 1000
            if o > 15: falhas.append(f'comeco em {o:.0f} ms (limite 20)')
            if m['buraco'] > 300: falhas.append(f"buraco {m['buraco']} ms")
            m['falhas'] = falhas; c.append(m)
        out[ev] = c
    return out
if __name__ == '__main__':
    modo = sys.argv[1] if len(sys.argv) > 1 else 'medir'
    so = sys.argv[2:]; cand = candidatos(); man = {}
    if so: cand = {ev: c for ev, c in cand.items() if ev in so}
    for ev, c in cand.items():
        for m in c:
            print(f"{ev}-{m['k']}: pico {m['pico_db']:.1f} dBFS, util {m['util']:.0f} ms, inicio {m['ini'] / SR * 1000:.0f} ms, buraco {m['buraco']} ms, planicidade {m['plan']:.3f}, {'OK' if not m['falhas'] else 'DESCARTA: ' + '; '.join(m['falhas'])}")
        if modo == 'gerar':
            bons = [m for m in c if not m['falhas']][:3]; man[ev] = []
            for i, m in enumerate(bons, 1):
                y = tratar(m['x'], m, EV[ev][1] - 0.5); nome = f'{ev}-{i}.mp3'
                gravar(y, os.path.join(DEST, nome)); man[ev].append({'arquivo': nome, 'bruto': f"{ev}-{m['k']}.mp3"})
    if modo == 'gerar':
        antes = json.load(open(os.path.join(DEST, 'manifesto.json')))['efeitos'] if so and os.path.exists(os.path.join(DEST, 'manifesto.json')) else {}
        saida = {'versao': 1, 'nota': 'Amostras do Reino (ElevenLabs, 19/11 e 20/11/2026), medidas e nao ouvidas. Sem amostra = som por codigo. Formato: "evento": [{ "arquivo": "nome-1.mp3" }]',
                 'efeitos': {**antes, **{ev: [{'arquivo': i['arquivo']} for i in v] for ev, v in man.items() if v}}}
        json.dump(saida, open(os.path.join(DEST, 'manifesto.json'), 'w'), indent=2, ensure_ascii=False); open(os.path.join(DEST, 'manifesto.json'), 'a').write('\n')
