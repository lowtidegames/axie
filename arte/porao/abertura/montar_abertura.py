# Abertura do Porão: trata os brutos (alfa duro -> paleta -> contorno), grava os PNGs finais em porao/tela/arte/,
# medidas.json, prancha.png e a maquete da tela de título.   Uso: python3 -I montar_abertura.py
import os, sys, json
AQUI = os.path.dirname(os.path.abspath(__file__)); OBJ = os.path.join(AQUI, '..', 'objetos')
sys.path.insert(0, OBJ)
from PIL import Image, ImageDraw, ImageFont
from montar import duro, na_paleta, rgb, CONTORNO, PALETA
from montar_objetos import contornar_canvas, maior_ilha, PAL32, PAL_RET

RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))
BRUTO = os.path.join(AQUI, 'bruto'); FINAL = os.path.join(RAIZ, 'porao', 'tela', 'arte')
# paleta da noite: a de retrato + 8 tons de céu/grama/luz de monitor (só para a casa e os emblemas)
EXTRA = ['#0a0716', '#141032', '#1f1a4a', '#2c2a70', '#0f3a3a', '#1c6a4a', '#39e4c0', '#b8fff0', '#f6f0d4', '#ffd84a', '#e7723c', '#a0245f']
PAL_NOITE = PAL_RET + [rgb(h) for h in EXTRA]
def mais_do_bruto(arq, base, n=14):
    """Acrescenta à paleta as n cores mais usadas do bruto que estão longe de qualquer cor dela (o verde da grama, o brilho do monitor)."""
    from collections import Counter
    im = Image.open(arq).convert('RGB'); c = Counter(im.getdata()); out = list(base); novas = []
    for cor, _ in c.most_common(200):
        if min(sum((a - b) ** 2 for a, b in zip(cor, p)) for p in out) > 900: out.append(cor); novas.append(cor)
        if len(novas) >= n: break
    return out

def tratar(arq, pal, contorno=True, ilha=True):
    im = duro(Image.open(arq))
    if ilha: im = maior_ilha(im)
    im = na_paleta(im, pal)
    return contornar_canvas(im) if contorno else im

def main():
    S = {}; M = {}
    S['casa_vo_noite'] = tratar(os.path.join(BRUTO, 'casa_vo_noite-2.png'), mais_do_bruto(os.path.join(BRUTO, 'casa_vo_noite-2.png'), PAL_NOITE), contorno=False, ilha=False)
    S['logo_jogo'] = tratar(os.path.join(BRUTO, 'logo_jogo-1.png'), PAL_NOITE)
    S['logo_estudio'] = tratar(os.path.join(BRUTO, 'logo_estudio-1.png'), PAL_NOITE)
    S['retrato_vo'] = tratar(os.path.join(BRUTO, 'retrato_vo-1.png'), PAL_RET)
    S['retrato_vo_orgulhosa'] = tratar(os.path.join(BRUTO, 'retrato_vo_orgulhosa-1.png'), PAL_RET)
    quadros = [tratar(os.path.join(BRUTO, f'carregando_rugrigo-{i}.png'), PAL32) for i in (1, 2, 3)]
    for i, q in enumerate(quadros, 1): S[f'carregando_rugrigo_{i}'] = q
    fw, fh = quadros[0].size
    folha = Image.new('RGBA', (fw * len(quadros), fh), (0, 0, 0, 0))
    for i, q in enumerate(quadros): folha.alpha_composite(q, (i * fw, 0))
    S['carregando_rugrigo'] = folha
    # âncora do carregando: centro dos pés (linha de baixo do boneco, do lado direito, onde ele está)
    px = quadros[0].load(); xs = []; ymax = 0
    for y in range(fh):
        for x in range(fw):
            if px[x, y][3] and x > fw // 2: ymax = max(ymax, y)
    for x in range(fw // 2, fw):
        if px[x, ymax][3]: xs.append(x)
    ax = (min(xs) + max(xs)) // 2
    for n, im in S.items():
        im.save(os.path.join(FINAL, n + '.png'))
        W, H = im.size
        if n.startswith('carregando_rugrigo_'): M[n] = dict(w=W, h=H, ax=ax, ay=ymax, nota='quadro do carregando; a folha tem 3 quadros lado a lado; ordem 1-2-1-3')
        elif n == 'carregando_rugrigo': M[n] = dict(w=W, h=H, quadros=3, qw=fw, qh=fh, ax=ax, ay=ymax, ordem=[0, 1, 0, 2], nota='folha horizontal; âncora = centro dos pés dentro do quadro')
        elif n.startswith('retrato'): M[n] = dict(w=W, h=H, ax=W // 2, ay=H, nota='busto, quadro fixo, paleta de retrato (48 cores)')
        elif n == 'casa_vo_noite': M[n] = dict(w=W, h=H, ax=W // 2, ay=H, nota='fundo cheio (sem transparência); alto livre para o logo, embaixo livre para os botões; escala 2x/3x/cobrir')
        else: M[n] = dict(w=W, h=H, ax=W // 2, ay=H // 2, nota='emblema sem letras, centro')
    json.dump(M, open(os.path.join(AQUI, 'medidas.json'), 'w'), indent=1, ensure_ascii=False)
    ip = os.path.join(FINAL, 'indice.json'); idx = json.load(open(ip))
    return S, M, ip, idx

def fonte(t):
    try: return ImageFont.load_default(size=t)
    except TypeError: return ImageFont.load_default()

def fatiar(btn, w, h, f=(6, 6, 8, 6), z=2):
    """9-slice com fatia cima/direita/baixo/esquerda, escala fixa z."""
    t, r, b, l = f; W, H = btn.size; out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    def peca(box, dest):
        c = btn.crop(box); c = c.resize((dest[2] - dest[0], dest[3] - dest[1]), Image.NEAREST); out.alpha_composite(c, (dest[0], dest[1]))
    lz, tz, rz, bz = l * z, t * z, r * z, b * z
    peca((0, 0, l, t), (0, 0, lz, tz)); peca((W - r, 0, W, t), (w - rz, 0, w, tz))
    peca((0, H - b, l, H), (0, h - bz, lz, h)); peca((W - r, H - b, W, H), (w - rz, h - bz, w, h))
    peca((l, 0, W - r, t), (lz, 0, w - rz, tz)); peca((l, H - b, W - r, H), (lz, h - bz, w - rz, h))
    peca((0, t, l, H - b), (0, tz, lz, h - bz)); peca((W - r, t, W, H - b), (w - rz, tz, w, h - bz))
    peca((l, t, W - r, H - b), (lz, tz, w - rz, h - bz))
    return out

def estender(casa, z, W, H, y, cx):
    """Tela W x H: a casa a z x, centrada em cx (px da arte), y no topo; céu e grama continuam pelas bordas (sem emenda)."""
    g = casa.resize((casa.width * z, casa.height * z), Image.NEAREST).convert('RGBA'); T = Image.new('RGBA', (W, H))
    x0 = W // 2 - cx * z
    topo = g.crop((0, 0, g.width, 1)).resize((g.width, y + 1), Image.NEAREST) if y > 0 else None
    base = g.crop((0, g.height - 1, g.width, g.height))
    if y > 0: T.alpha_composite(topo, (x0, 0))
    if y + g.height < H: T.alpha_composite(base.resize((g.width, H - y - g.height), Image.NEAREST), (x0, y + g.height))
    T.alpha_composite(g, (x0, y))
    if x0 > 0:   # arte mais estreita que a tela: repete a borda
        T.alpha_composite(T.crop((x0, 0, x0 + 1, H)).resize((x0, H), Image.NEAREST), (0, 0))
    return T

def maquete(S):
    ui = os.path.join(FINAL, 'ui'); d0 = Image.open(os.path.join(ui, 'ui_btn_destaque.png')).convert('RGBA'); n0 = Image.open(os.path.join(ui, 'ui_btn_normal.png')).convert('RGBA')
    F = fonte(22); casa = S['casa_vo_noite']; lg = S['logo_jogo']; est = S['logo_estudio']
    def botoes(T, pos, w, h):
        d = ImageDraw.Draw(T)
        for (txt, b), (x, y) in zip([('Jogar', d0), ('Continuar', n0), ('Ajustes', n0)], pos):
            T.alpha_composite(fatiar(b, w, h), (x, y)); tw = d.textlength(txt, font=F); d.text((x + (w - tw) / 2, y + h / 2 - 13), txt, fill=(243, 234, 214, 255), font=F)
    # PC 1280 x 800: casa a 4x
    pc = estender(casa, 4, 1280, 800, 40, 160)
    pc.alpha_composite(lg.resize((lg.width * 2, lg.height * 2), Image.NEAREST), (512, 50))
    botoes(pc, [(300, 690), (530, 690), (760, 690)], 220, 44)
    pc.alpha_composite(est.resize((est.width * 2, est.height * 2), Image.NEAREST), (16, 656))
    # celular 390 x 844: casa a 3x, corte no centro
    ce = estender(casa, 3, 390, 844, 190, 160)
    ce.alpha_composite(lg.resize((lg.width * 2, lg.height * 2), Image.NEAREST), (67, 50))
    botoes(ce, [(75, 640), (75, 696), (75, 752)], 240, 48)
    ce.alpha_composite(est, (163, 790)) if False else None
    return pc, ce

def prancha(S):
    F = fonte(12); cor = (243, 234, 214, 255); P = Image.new('RGBA', (1320, 1100), (29, 22, 34, 255)); d = ImageDraw.Draw(P)
    d.text((10, 6), 'ABERTURA DO PORAO - casa 2x | emblemas 3x | retratos 3x | carregando 4x | maquete da tela de titulo 2x (390x844 mostra a casa cobrindo)', fill=cor, font=F)
    c = S['casa_vo_noite']; P.alpha_composite(c.resize((c.width * 2, c.height * 2), Image.NEAREST), (10, 28)); d.text((10, 392), 'casa_vo_noite 320x180', fill=cor, font=F)
    pc, ce = maquete(S); P.alpha_composite(pc.resize((640, 400), Image.NEAREST), (670, 28)); d.text((670, 432), 'maquete PC 1280x800 (a metade)', fill=cor, font=F)
    x = 10; y = 470
    for n in ('logo_jogo', 'logo_estudio'):
        im = S[n]; P.alpha_composite(im.resize((im.width * 3, im.height * 3), Image.NEAREST), (x, y)); d.text((x, y + im.height * 3 + 2), n, fill=cor, font=F); x += im.width * 3 + 20
    for n in ('retrato_vo', 'retrato_vo_orgulhosa'):
        im = S[n]; P.alpha_composite(im.resize((im.width * 3, im.height * 3), Image.NEAREST), (x, y)); d.text((x, y + im.height * 3 + 2), n, fill=cor, font=F); x += im.width * 3 + 20
    x = 10; y = 800
    for i in (1, 2, 3):
        im = S[f'carregando_rugrigo_{i}']; P.alpha_composite(im.resize((im.width * 4, im.height * 4), Image.NEAREST), (x, y)); x += im.width * 4 + 10
    d.text((10, y + 200), 'carregando_rugrigo (3 quadros, ordem 1-2-1-3)', fill=cor, font=F)
    P.save(os.path.join(AQUI, 'prancha.png')); pc.save(os.path.join(AQUI, 'maquete-titulo-pc.png')); ce.save(os.path.join(AQUI, 'maquete-titulo-celular.png'))

if __name__ == '__main__':
    S, M, ip, idx = main(); prancha(S); print(sorted(M))
