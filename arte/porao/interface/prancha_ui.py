# Prancha do kit de interface: prova do 9-slice em 3 tamanhos + maquetes por cima de cada papel de parede (escala 2x).
# Uso: python3 -I arte/porao/interface/prancha_ui.py (da raiz). Texto da prancha vem do ImageDraw padrão (só rótulo; as peças não têm letra).
import os, json
from PIL import Image, ImageDraw
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))
UI = os.path.join(RAIZ, 'porao', 'tela', 'arte', 'ui'); X = json.load(open(os.path.join(UI, 'indice.json')))['pecas']
P = {e['nome']: e for e in X}; IM = {n: Image.open(os.path.join(UI, P[n]['arquivo'])).convert('RGBA') for n in P}
Z = 2
def fat(n):
    f = P[n]['fatia']; return f['top'], f['right'], f['bottom'], f['left']
def esticar(im, W, H, t, r, b, l):
    w, h = im.size; out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    xs = [(0, l, 0, l), (l, w - r, l, W - r), (w - r, w, W - r, W)]; ys = [(0, t, 0, t), (t, h - b, t, H - b), (h - b, h, H - b, H)]
    for (sy0, sy1, dy0, dy1) in ys:
        for (sx0, sx1, dx0, dx1) in xs:
            if sx1 <= sx0 or sy1 <= sy0 or dx1 <= dx0 or dy1 <= dy0: continue
            out.paste(im.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.NEAREST), (dx0, dy0))
    return out
def p9(n, W, H): return esticar(IM[n], W, H, *fat(n))
def amp(im, z=Z): return im.resize((im.width * z, im.height * z), Image.NEAREST)
def lad(n, cols, rows):
    t = IM[n]; o = Image.new('RGBA', (t.width * cols, t.height * rows))
    for i in range(cols):
        for j in range(rows): o.paste(t, (i * t.width, j * t.height))
    return o

W, H = 1640, 1900; tela = Image.new('RGBA', (W, H), (42, 38, 48, 255)); d = ImageDraw.Draw(tela)
d.text((16, 8), 'KIT DE INTERFACE A3 - 9-slice em 3 tamanhos (2x), icones, papeis de parede e maquetes', fill=(243, 234, 214, 255))
# 1) prova do 9-slice
y = 30
tamanhos = {'ui_btn_normal': [(24, 24), (56, 24), (96, 32)], 'ui_btn_apertado': [(24, 24), (56, 24), (96, 32)], 'ui_btn_desligado': [(24, 24), (56, 24), (96, 32)],
            'ui_btn_destaque': [(40, 28), (96, 32), (128, 40)], 'ui_aba_ligada': [(24, 20), (56, 20), (96, 20)], 'ui_aba_desligada': [(24, 20), (56, 20), (96, 20)],
            'ui_janela': [(48, 48), (96, 64), (140, 90)], 'ui_barra_vazia': [(24, 8), (64, 8), (130, 8)], 'ui_barra_cheia': [(24, 8), (64, 8), (130, 8)],
            'ui_barra_calor': [(24, 8), (64, 8), (130, 8)], 'ui_barra_confianca': [(24, 8), (64, 8), (130, 8)], 'ui_status': [(24, 16), (70, 16), (130, 20)], 'ui_dock': [(24, 24), (90, 24), (140, 24)]}
col = 0; x0 = 16; lin_h = 0
for n, tams in tamanhos.items():
    larg = sum(a * Z + 14 for a, b in tams)
    if x0 + larg > W - 16: x0 = 16; y += lin_h + 30; lin_h = 0
    d.text((x0, y), n, fill=(255, 216, 74, 255)); xx = x0
    for (a, b) in tams:
        im = amp(p9(n, a, b)); tela.alpha_composite(im, (xx, y + 14)); xx += im.width + 14; lin_h = max(lin_h, im.height + 14)
    x0 = xx + 24
y += lin_h + 30
# 2) ícones e papéis
d.text((16, y), 'icones 32x32 (a 2x e a 1x)', fill=(255, 216, 74, 255)); x = 16
for n in [k for k in P if k.startswith('icone_')]:
    tela.alpha_composite(amp(IM[n]), (x, y + 14)); tela.alpha_composite(IM[n], (x + 16, y + 84)); x += 84
y += 130
d.text((16, y), 'papeis de parede: ladrilho 64x64 repetido 3x3 (conferir emenda)', fill=(255, 216, 74, 255)); x = 16
for n in ('papel_grafico', 'papel_comunidade', 'papel_projeto'):
    tela.alpha_composite(amp(lad(n, 3, 3), 1), (x, y + 14)); x += 200
x = 640
for n in ('papel_grafico', 'papel_comunidade', 'papel_projeto'):
    tela.alpha_composite(amp(lad(n, 2, 2), 1), (x, y + 14)); x += 140
y += 220
# 3) maquetes: janela com botões e abas por cima de cada papel
def maquete(papel, cor_app, icones, w=520, h=320, titulo_ligada=0):
    m = Image.new('RGBA', (w // Z, h // Z)); t = IM[papel]
    for i in range(0, m.width, 64):
        for j in range(0, m.height, 64): m.paste(t, (i, j))
    s = p9('ui_status', m.width, 16); m.alpha_composite(s, (0, 0))
    for i, c in enumerate(['#e7723c', '#5be08a', '#ffd84a']):
        ch = p9('ui_status', 40, 12); m.alpha_composite(ch, (8 + i * 46, 2))
    jx, jy, jw, jh = 14, 28, 150, 100
    ImageDraw.Draw(m).rectangle((jx + 1, jy + 1, jx + jw - 26, jy + 13), fill=cor_app)   # cor do app por trás do título vazado
    m.alpha_composite(p9('ui_janela', jw, jh), (jx, jy))
    m.alpha_composite(p9('ui_aba_ligada', 38, 18), (jx + 6, jy + 20)); m.alpha_composite(p9('ui_aba_desligada', 38, 18), (jx + 46, jy + 20)); m.alpha_composite(p9('ui_aba_desligada', 38, 18), (jx + 86, jy + 20))
    m.alpha_composite(p9('ui_btn_normal', 44, 20), (jx + 8, jy + 46)); m.alpha_composite(p9('ui_btn_apertado', 44, 20), (jx + 56, jy + 46)); m.alpha_composite(p9('ui_btn_desligado', 44, 20), (jx + 104, jy + 46))
    m.alpha_composite(p9('ui_btn_destaque', 80, 26), (jx + 8, jy + 70))
    m.alpha_composite(p9('ui_barra_vazia', 40, 8), (jx + 96, jy + 74)); m.alpha_composite(p9('ui_barra_calor', 26, 8), (jx + 96, jy + 74))
    m.alpha_composite(p9('ui_barra_vazia', 40, 8), (jx + 96, jy + 86)); m.alpha_composite(p9('ui_barra_confianca', 18, 8), (jx + 96, jy + 86))
    dk = p9('ui_dock', m.width - 40, 24); m.alpha_composite(dk, (20, m.height - 24))
    for i, n in enumerate(icones): m.alpha_composite(IM[n], (28 + i * 26, m.height - 28)) if False else m.alpha_composite(IM[n].resize((20, 20), Image.NEAREST), (26 + i * 24, m.height - 22))
    return amp(m)
ic = ['icone_grafico', 'icone_caixa', 'icone_comunidade', 'icone_chat', 'icone_projetos', 'icone_ideias', 'icone_impressora', 'icone_porao', 'icone_celular']
d.text((16, y - 6), 'maquetes: janela + abas + botoes + barras + status + dock por cima de cada papel (a cor do titulo vem do CSS)', fill=(255, 216, 74, 255))
x = 16
for papel, cor in (('papel_grafico', (91, 224, 138, 255)), ('papel_comunidade', (255, 95, 162, 255)), ('papel_projeto', (59, 143, 217, 255))):
    mq = maquete(papel, cor, ic); tela.alpha_composite(mq, (x, y + 12)); x += mq.width + 10
tela = tela.crop((0, 0, W, y + 12 + 330)); tela.convert('RGB').save(os.path.join(AQUI, 'prancha.png')); print(tela.size)
