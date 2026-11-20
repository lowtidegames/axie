# A3 kit de interface: trata os brutos (bruto/) e escreve as peças finais em porao/tela/arte/ui/ + indice.json.
# Uso: python3 -I arte/porao/interface/montar_ui.py   (da raiz do repositório)
import os, json
from PIL import Image, ImageDraw
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))
SAIDA = os.path.join(RAIZ, 'porao', 'tela', 'arte', 'ui'); os.makedirs(SAIDA, exist_ok=True)
BR = lambda n: Image.open(os.path.join(AQUI, 'bruto', n + '.png')).convert('RGBA')
PAL = [tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for v in json.load(open(os.path.join(RAIZ, 'arte', 'porao', 'regua', 'paleta.json'))).values()]
def hx(s): return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
CONT = hx('#1d1622')
def perto(c, pal=PAL): return min(pal, key=lambda p: sum((a - b) ** 2 for a, b in zip(c[:3], p)))
def mix(a, b, t): return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))
def lum(c): return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]

def duro(im):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    return im
def na_paleta(im):
    im = duro(im); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3]: px[x, y] = perto(px[x, y]) + (255,)
    return im
def recortar(im): return im.crop(im.getchannel('A').getbbox())
def rampa(im, cores):
    """Recolore por claridade: contorno fica #1d1622; o resto vira a rampa (escuro -> claro) por faixas de claridade."""
    im = na_paleta(im); px = im.load(); L = []
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if c[3] and c[:3] != CONT and lum(c) > 30: L.append(lum(c))
    L.sort(); n = len(L)
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if not c[3]: continue
            if c[:3] == CONT or lum(c) <= 30: px[x, y] = CONT + (255,); continue
            q = sum(1 for v in L if v < lum(c)) / n; i = min(len(cores) - 1, int(q * len(cores)))
            px[x, y] = cores[i] + (255,)
    return im

def esticar(im, W, H, t, r, b, l):
    """9-slice por código (vizinho mais próximo): cantos intactos, bordas e miolo esticados."""
    w, h = im.size; out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    xs = [(0, l, 0, l), (l, w - r, l, W - r), (w - r, w, W - r, W)]; ys = [(0, t, 0, t), (t, h - b, t, H - b), (h - b, h, H - b, H)]
    for (sy0, sy1, dy0, dy1) in ys:
        for (sx0, sx1, dx0, dx1) in xs:
            if sx1 <= sx0 or sy1 <= sy0 or dx1 <= dx0 or dy1 <= dy0: continue
            out.paste(im.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.NEAREST), (dx0, dy0))
    return out

def caixa_redonda(W, H, raio, corpo, luz=None, labio=None, borda=CONT, fundo_baixo=True):
    """Retângulo de cantos cortados no estilo do kit (contorno 1 px + luz em cima + lábio embaixo)."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    def forma(x0, y0, x1, y1, r, cor):
        d.rectangle((x0 + r, y0, x1 - r, y1), fill=cor + (255,)); d.rectangle((x0, y0 + r, x1, y1 - r), fill=cor + (255,))
        for (cx, cy) in ((x0 + 1, y0 + 1), (x1 - 1, y0 + 1), (x0 + 1, y1 - 1), (x1 - 1, y1 - 1)):
            if r >= 2: d.point((cx, cy), fill=cor + (255,))
    forma(0, 0, W - 1, H - 1, raio, borda); forma(1, 1, W - 2, H - 2, max(1, raio - 1), corpo)
    if labio: d.rectangle((2, H - 4, W - 3, H - 2), fill=labio + (255,))
    if luz: d.line((raio, 1, W - raio - 1, 1), fill=luz + (255,))
    return im

pecas = {}   # nome -> (imagem, fatia ou None, observação)
indice = []
def salvar(nome, im, fatia=None, nota='', repete=False, origem='geração'):
    im.save(os.path.join(SAIDA, nome + '.png'))
    e = dict(nome=nome, arquivo=nome + '.png', tamanho=list(im.size), origem=origem)
    if fatia: e['fatia'] = dict(top=fatia[0], right=fatia[1], bottom=fatia[2], left=fatia[3]); e['border_image_slice'] = ' '.join(map(str, fatia))
    if repete: e['ladrilho'] = True
    if nota: e['nota'] = nota
    indice.append(e)

# ---------- botões (gerado: ui_btn_normal-1; estados por código) ----------
raw = recortar(BR('ui_btn_normal-1'))
F_BTN = (6, 6, 8, 6)
normal = rampa(raw, [hx('#2a2630'), hx('#4a4458'), hx('#4a4458'), hx('#4a4458'), hx('#594a86')])
def refit(im, W, H, f): return esticar(im, W, H, *f)
b_norm = refit(normal, 24, 24, F_BTN); salvar('ui_btn_normal', b_norm, F_BTN, 'gerado + recolorido na paleta (pano/roxo)')
# apertado: tira o lábio (2 px), desce 2 px, escurece 1 tom
b_ap = rampa(raw, [hx('#1d1622'), hx('#2a2630'), hx('#2a2630'), hx('#2a2630'), hx('#4a4458')]); b_ap = refit(b_ap, 24, 22, (8, 6, 6, 6))
t = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); t.paste(b_ap, (0, 2)); salvar('ui_btn_apertado', t, (8, 6, 6, 6), 'por código a partir do botão gerado', origem='código')
b_des = refit(rampa(raw, [hx('#3a383c'), hx('#6a6660'), hx('#6a6660'), hx('#6a6660'), hx('#9a958c')]), 24, 24, F_BTN); salvar('ui_btn_desligado', b_des, F_BTN, 'pedra, sem brilho', origem='código')
b_dest = refit(rampa(raw, [hx('#a5452e'), hx('#e7723c'), hx('#e7723c'), hx('#e7723c'), hx('#ffd84a')]), 24, 24, F_BTN); salvar('ui_btn_destaque', b_dest, F_BTN, 'o grande laranja do PUXAR O TAPETE', origem='código')

# ---------- abas (por código: o bruto saiu em forma de pasta com dobra, sem fatia limpa) ----------
def aba(corpo, luz, lado, cor_base):
    im = Image.new('RGBA', (24, 20), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((2, 0, 21, 19), fill=CONT + (255,)); d.rectangle((0, 2, 23, 19), fill=CONT + (255,)); d.point((1, 1), fill=CONT + (255,)); d.point((22, 1), fill=CONT + (255,))
    d.rectangle((2, 1, 21, 19), fill=corpo + (255,)); d.rectangle((1, 2, 22, 19), fill=corpo + (255,))
    d.line((2, 1, 21, 1), fill=luz + (255,)); d.line((1, 2, 1, 19), fill=lado + (255,)); d.line((22, 2, 22, 19), fill=lado + (255,))
    d.line((0, 19, 23, 19), fill=(0, 0, 0, 0)); d.line((1, 19, 22, 19), fill=(0, 0, 0, 0))   # aberta embaixo (sem contorno)
    d.point((0, 19), fill=(0, 0, 0, 0)); d.point((23, 19), fill=(0, 0, 0, 0))
    return im
F_ABA = (6, 6, 2, 6)
salvar('ui_aba_ligada', aba(hx('#f3ead6'), hx('#facdad'), hx('#9a958c'), None), F_ABA, 'papel claro; aberta embaixo', origem='código')
salvar('ui_aba_desligada', aba(hx('#4a4458'), hx('#594a86'), hx('#2a2630'), None), F_ABA, 'pano escuro', origem='código')

# ---------- janela de app (por código; título TRANSPARENTE para a cor do app vir do CSS por trás) ----------
j = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); d = ImageDraw.Draw(j)
d.rectangle((0, 0, 47, 47), fill=CONT + (255,)); d.rectangle((1, 1, 46, 14), fill=(0, 0, 0, 0))                # barra de título vazada
d.rectangle((1, 16, 46, 46), fill=hx('#4a4458') + (255,)); d.line((1, 16, 46, 16), fill=hx('#594a86') + (255,))  # corpo ameixa + luz em cima
d.line((1, 17, 1, 45), fill=hx('#594a86') + (255,))
d.rectangle((0, 15, 47, 15), fill=CONT + (255,))
for i, cor in enumerate(['#f3ead6', '#ffd84a', '#d6082d']):                                                     # 3 botõezinhos no canto direito
    x0 = 25 + i * 7; d.rectangle((x0, 4, x0 + 5, 10), fill=CONT + (255,)); d.rectangle((x0 + 1, 5, x0 + 4, 9), fill=hx(cor) + (255,)); d.point((x0 + 1, 5), fill=hx('#f3ead6') + (255,))
# cantos de cima arredondados
for (x, y) in ((0, 0), (47, 0)): d.point((x, y), fill=(0, 0, 0, 0))
F_JAN = (17, 24, 3, 3)
salvar('ui_janela', j, F_JAN, 'título vazado (cor do app por trás); 3 botões ficam no canto direito, que NÃO estica (right=24); usar border-image-slice com "fill"', origem='código')

# ---------- barras ----------
def barra(corpo, luz, vazia=False):
    im = Image.new('RGBA', (24, 8), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((1, 0, 22, 7), fill=CONT + (255,)); d.rectangle((0, 1, 23, 6), fill=CONT + (255,))
    d.rectangle((1, 1, 22, 6), fill=corpo + (255,)); d.rectangle((2, 1, 21, 1), fill=luz + (255,))
    if vazia: d.rectangle((2, 5, 21, 6), fill=hx('#2a2630') + (255,))
    else: d.rectangle((2, 5, 21, 6), fill=mix(corpo, CONT, .35) + (255,))
    return im
F_BAR = (0, 4, 0, 4)
salvar('ui_barra_vazia', barra(hx('#3a383c'), hx('#6a6660'), True), F_BAR, 'trilho escuro; 8 px de altura fixos', origem='código')
salvar('ui_barra_cheia', barra(hx('#5be08a'), hx('#f3ead6')), F_BAR, 'recheio verde (Confiança alta / geral)', origem='código')
salvar('ui_barra_calor', barra(hx('#e7723c'), hx('#ffd84a')), F_BAR, 'recheio laranja (Calor)', origem='código')
salvar('ui_barra_confianca', barra(hx('#3b8fd9'), hx('#8fd0ff')), F_BAR, 'recheio azul (Confiança)', origem='código')

# ---------- barra de status (gerada: ui_status-2) e dock ----------
st = recortar(BR('ui_status-2')); st = rampa(st, [hx('#283a6a'), hx('#283a6a'), hx('#283a6a'), hx('#3b8fd9')])
F_ST = (6, 6, 6, 6); salvar('ui_status', esticar(st, 24, 16, *F_ST), F_ST, 'placa azul-noite da barra do topo, fichas de caixa/Calor/relógio', origem='geração')
dk = caixa_redonda(24, 24, 3, hx('#283a6a'), luz=hx('#3b8fd9')); dd = ImageDraw.Draw(dk)
dd.rectangle((0, 21, 23, 23), fill=(0, 0, 0, 0)); dd.rectangle((1, 21, 22, 23), fill=hx('#283a6a') + (255,)); dd.point((0, 21), fill=CONT + (255,)); dd.point((23, 21), fill=CONT + (255,))
dd.line((0, 4, 0, 23), fill=CONT + (255,)); dd.line((23, 4, 23, 23), fill=CONT + (255,)); dd.line((1, 23, 22, 23), fill=(0, 0, 0, 0)); dd.point((0, 23), fill=CONT + (255,)); dd.point((23, 23), fill=CONT + (255,))
salvar('ui_dock', dk, (4, 4, 4, 4), 'barra de tarefas: cantos de baixo retos, sem contorno embaixo', origem='código')

# ---------- papéis de parede (gerados; 2 tons + acento puxados para o escuro) ----------
def papel(nome, base):
    im = BR(nome + '-1'); px = im.load(); from collections import Counter
    fundo = Counter(px[x, y][:3] for y in range(64) for x in range(64)).most_common(1)[0][0]
    bf = mix(perto(fundo), CONT, .3)
    for y in range(64):
        for x in range(64):
            c = px[x, y][:3]
            if sum((a - b) ** 2 for a, b in zip(c, fundo)) < 600: px[x, y] = bf + (255,)
            else: px[x, y] = mix(perto(c), bf, .5) + (255,)
    return im
for n in ('grafico', 'comunidade', 'projeto'): salvar('papel_' + n, papel('papel_' + n, n), None, 'ladrilho 64x64 que repete; fundo escuro, riscos de baixo contraste', repete=True, origem='geração')

# ---------- ícones 32x32 (gerados; contorno e paleta por código) ----------
def icone(arq):
    im = na_paleta(recortar(BR(arq))); w, h = im.size
    if max(w, h) > 30: s = 30 / max(w, h); im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.NEAREST); im = na_paleta(im); w, h = im.size
    g = Image.new('RGBA', (w + 2, h + 2), (0, 0, 0, 0)); g.paste(im, (1, 1)); A = g.getchannel('A').load(); px = g.load()
    novo = []
    for y in range(g.height):
        for x in range(g.width):
            if A[x, y] == 0 and any(0 <= x + dx < g.width and 0 <= y + dy < g.height and A[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): novo.append((x, y))
    for p in novo: px[p] = CONT + (255,)
    out = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); out.paste(g, ((32 - g.width) // 2, (32 - g.height) // 2), g); return out
for n, arq in (('grafico', 'icone_grafico-1'), ('caixa', 'icone_caixa-2'), ('comunidade', 'icone_comunidade-2'), ('chat', 'icone_chat-1'),
               ('projetos', 'icone_projetos-1'), ('ideias', 'icone_ideias-1'), ('impressora', 'icone_impressora-1'), ('porao', 'icone_porao-1')):
    salvar('icone_' + n, icone(arq), None, 'ícone 32x32, mostrar a 1x (32 px) ou 2x (64 px)', origem='geração')
# celular: por código (sem geração de sobra)
c = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
d.rectangle((9, 2, 22, 29), fill=CONT + (255,)); d.rectangle((10, 3, 21, 28), fill=hx('#6a6660') + (255,)); d.rectangle((11, 5, 20, 24), fill=CONT + (255,)); d.rectangle((12, 6, 19, 23), fill=hx('#39b4e4') + (255,))
d.rectangle((12, 6, 19, 8), fill=hx('#8fd0ff') + (255,)); d.rectangle((13, 11, 18, 13), fill=hx('#f3ead6') + (255,)); d.rectangle((13, 16, 17, 18), fill=hx('#f3ead6') + (255,)); d.point((13, 20), fill=hx('#ff5fa2') + (255,)); d.point((14, 20), fill=hx('#ff5fa2') + (255,))
d.rectangle((14, 26, 17, 27), fill=hx('#3a383c') + (255,)); d.point((10, 3), fill=hx('#9a958c') + (255,))
salvar('icone_celular', c, None, 'ícone 32x32', origem='código')

json.dump(dict(escala='2x (1 px da arte = 2 px de tela), image-rendering: pixelated', pecas=indice), open(os.path.join(SAIDA, 'indice.json'), 'w'), indent=1, ensure_ascii=False)
print(len(indice), 'peças')
