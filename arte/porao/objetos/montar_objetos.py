# A2 do lote de arte do Porão: trata os brutos (alfa duro -> paleta -> contorno -> corte), grava os PNGs finais em
# porao/tela/arte/, medidas.json, prancha.png e a cena de prova.   Uso: python3 -I montar_objetos.py
# Regras da régua (docs/porao/regua-de-arte.md) aplicadas por código; as funções vêm de montar.py (mesma régua).
import os, sys, json, colorsys
AQUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, AQUI)
from PIL import Image, ImageOps, ImageDraw, ImageFont
from montar import duro, na_paleta, contornar, PALETA, rgb, CONTORNO, FUNDO

RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))
BRUTO = os.path.join(AQUI, 'bruto'); PECAS = os.path.join(AQUI, 'pecas'); os.makedirs(PECAS, exist_ok=True)
FINAL = os.path.join(RAIZ, 'porao', 'tela', 'arte')
REGUA = os.path.join(AQUI, '..', 'regua')
PAL32 = [rgb(h) for h in PALETA.values()]
PAL_RET = PAL32 + [rgb(v) for k, v in json.load(open(os.path.join(AQUI, 'paleta_retrato.json'))).items() if k[0] != '_']
RARIDADE = {'comum': '#e8d9b5', 'incomum': '#7bd88f', 'raro': '#5bb8ff', 'epico': '#c58bff', 'lendario': '#ffc857', 'mitico': '#ff8fb5'}

def contornar_canvas(im):
    """Contorno de 1 px #1d1622 SEM cortar: o quadro fica do mesmo tamanho (poses do Rugrigo e da trouxa não pulam)."""
    W, H = im.size; im2 = Image.new('RGBA', (W + 2, H + 2), (0, 0, 0, 0)); im2.alpha_composite(im, (1, 1))
    W2, H2 = im2.size; A = im2.getchannel('A').load(); px = im2.load(); fora = []; borda = []
    viz = ((1, 0), (-1, 0), (0, 1), (0, -1))
    for y in range(H2):
        for x in range(W2):
            perto = [(x + dx, y + dy) for dx, dy in viz if 0 <= x + dx < W2 and 0 <= y + dy < H2]
            if A[x, y]:
                if len(perto) < 4 or any(not A[p] for p in perto): borda.append((x, y))
            elif any(A[p] for p in perto): fora.append((x, y))
    escuro = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] < 62
    claras = {p for p in borda if not escuro(px[p])}
    for p in borda:
        if p not in claras: px[p] = CONTORNO + (255,)
    for x, y in fora:
        if any((x + dx, y + dy) in claras for dx, dy in viz): px[x, y] = CONTORNO + (255,)
    return im2.crop((1, 1, W + 1, H + 1))

def limpar_solto(im):
    """Tira pixel solto (opaco sem nenhum vizinho opaco nos 4 lados)."""
    A = im.getchannel('A').load(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if A[x, y] and not any(0 <= x + dx < im.width and 0 <= y + dy < im.height and A[x + dx, y + dy]
                                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): px[x, y] = (0, 0, 0, 0)
    return im

def maior_ilha(im):
    """Fica só com a maior região conectada (tira respingo solto do serviço)."""
    W, H = im.size; A = im.getchannel('A').load(); visto = set(); melhor = []
    for y in range(H):
        for x in range(W):
            if A[x, y] and (x, y) not in visto:
                pilha = [(x, y)]; visto.add((x, y)); reg = []
                while pilha:
                    p = pilha.pop(); reg.append(p)
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            q = (p[0] + dx, p[1] + dy)
                            if 0 <= q[0] < W and 0 <= q[1] < H and A[q] and q not in visto: visto.add(q); pilha.append(q)
                if len(reg) > len(melhor): melhor = reg
    keep = set(melhor); px = im.load()
    for y in range(H):
        for x in range(W):
            if (x, y) not in keep: px[x, y] = (0, 0, 0, 0)
    return im

def abrir(nome, n=1):
    return duro(Image.open(os.path.join(BRUTO, f'{nome}-{n}.png')))

def tratar_solta(nome, n=1, pal=PAL32):
    """Peça solta (luxo): paleta, contorno, corte na caixa + 1 px de margem."""
    return contornar(na_paleta(maior_ilha(abrir(nome, n)), pal))

def tratar_quadro(arq, pal=PAL32):
    """Peça de quadro fixo (gente): mesmo tamanho de saída."""
    im = duro(Image.open(arq)); return contornar_canvas(na_paleta(im, pal))

def moldura(nome, rar):
    """Moldura: miolo vazio (transparente) e borda na rampa da cor da raridade (4 tons por claridade)."""
    im = duro(Image.open(os.path.join(BRUTO, f'{nome}-1.png'))); W, H = im.size
    bb = im.getchannel('A').getbbox(); im = im.crop(bb); im = im.resize((44, 60), Image.NEAREST); W, H = im.size; px = im.load()
    T = 5   # espessura da borda em px (medida na peça)
    lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    anel = [(x, y) for y in range(H) for x in range(W) if px[x, y][3] and (x < T or y < T or x >= W - T or y >= H - T)]
    ls = sorted(lum(px[p]) for p in anel); q = lambda f: ls[int(len(ls) * f)]
    base = rgb(RARIDADE[rar]); mix = lambda c, k: tuple(min(255, round(v * k)) for v in c)
    claro = tuple(round(v + (255 - v) * 0.45) for v in base)
    rampa = [mix(base, 0.42), mix(base, 0.72), base, claro]
    for p in anel:
        l = lum(px[p]); i = 0 if l < q(0.25) else 1 if l < q(0.55) else 2 if l < q(0.85) else 3
        px[p] = rampa[i] + (255,)
    for y in range(T, H - T):
        for x in range(T, W - T): px[x, y] = (0, 0, 0, 0)
    # contorno escuro por dentro do miolo e por fora da peça
    for x in range(T - 1, W - T + 1):
        for y in (T - 1, H - T):
            if 0 <= y < H: px[x, y] = CONTORNO + (255,)
    for y in range(T - 1, H - T + 1):
        for x in (T - 1, W - T):
            if 0 <= x < W: px[x, y] = CONTORNO + (255,)
    return contornar(im)

def main():
    medidas = {}; saidas = {}
    # ---- gente e Rugrigo (quadro fixo) ----
    ra = Image.open(os.path.join(REGUA, 'pecas', 'rugrigo_costas.png')).convert('RGBA'); saidas['rugrigo_a'] = Image.new('RGBA', (36, 48), (0, 0, 0, 0)); saidas['rugrigo_a'].alpha_composite(ra, (1, 2))
    saidas['rugrigo_b'] = Image.open(os.path.join(REGUA, 'pecas', 'rugrigo_sentado.png')).convert('RGBA')
    saidas['rugrigo_rindo'] = tratar_quadro(os.path.join(BRUTO, 'rugrigo_rindo-1.png'))
    saidas['rugrigo_batida'] = tratar_quadro(os.path.join(BRUTO, 'rugrigo_batida-1.png'))
    base_t = Image.open(os.path.join(BRUTO, 'base_trouxa_1.png')).convert('RGBA')
    saidas['trouxa_1'] = base_t
    for i in (2, 3, 4): saidas[f'trouxa_{i}'] = tratar_quadro(os.path.join(BRUTO, f'trouxa_{i}-1.png'))
    # ---- luxos (peças soltas) ----
    for nome in ('cadeira_gamer', 'ar_condicionado', 'letreiro_neon', 'maquina_bebida', 'tela_curva', 'garagem'):
        n = LUXO_ESCOLHA[nome]; saidas[nome] = tratar_solta(nome, n)
    saidas['aquario'] = Image.open(os.path.join(REGUA, 'pecas', 'aquario.png')).convert('RGBA')
    # ---- molduras ----
    for r in RARIDADE: saidas[f'moldura_carta_{r}'] = moldura('moldura_' + r, r)
    # ---- retratos (paleta de retrato, quadro 96x96 fixo) ----
    retratos = ['rugrigo_malandro', 'rugrigo_rindo', 'rugrigo_assustado'] + [f'influ_{g}' for g in INFLU]
    for r in retratos:
        im = tratar_retrato(os.path.join(BRUTO, f'retrato_{r}-{RET_ESCOLHA.get(r, 1)}.png')); saidas['retrato_' + r] = im
    # ---- grava ----
    indice_novo = []
    for nome, im in saidas.items():
        im.save(os.path.join(PECAS, nome + '.png')); im.save(os.path.join(FINAL, nome + '.png')); indice_novo.append(nome)
        W, H = im.size; m = {'w': W, 'h': H}
        if nome.startswith('moldura'): m.update(ax=None, ay=None, fatia=6, nota='miolo transparente 38x54; borda na cor da raridade')
        elif nome.startswith('retrato'): m.update(ax=W // 2, ay=H, nota='busto, quadro fixo, paleta de retrato (48 cores)')
        elif nome in ('ar_condicionado',): m.update(ax=3, ay=3, nota='parede da direita; âncora no canto de fixação')
        elif nome in ('letreiro_neon',): m.update(ax=W - 3, ay=3, nota='parede da esquerda; âncora no canto de fixação')
        elif nome.startswith(('rugrigo', 'trouxa')): m.update(ax=W // 2, ay=H - 2, nota='gente: base no chão')
        else:
            d = PEGADA[nome]; m.update(ax=W // 2, ay=H - 3 - round(sum(d) * 4), nota='caixa: ay = H - 3 - (largura+fundo) x 4')
        medidas[nome] = m
    json.dump(medidas, open(os.path.join(AQUI, 'medidas.json'), 'w'), indent=1, ensure_ascii=False)
    ind_arq = os.path.join(FINAL, 'indice.json'); ind = json.load(open(ind_arq))
    for n in indice_novo:
        if n not in ind: ind.append(n)
    json.dump(ind, open(ind_arq, 'w'), ensure_ascii=False)
    for n, m in medidas.items(): print(n, m['w'], m['h'], m['ax'], m['ay'], len(saidas[n].getcolors(1 << 16)), 'cores')
    prancha(saidas); cena(saidas)

def tratar_retrato(arq):
    return contornar_canvas(na_paleta(maior_ilha(duro(Image.open(arq))), PAL_RET))

LUXO_ESCOLHA = {'cadeira_gamer': 2, 'ar_condicionado': 2, 'letreiro_neon': 1, 'maquina_bebida': 1, 'tela_curva': 2, 'garagem': 1}
RET_ESCOLHA = {}
PEGADA = {'cadeira_gamer': (1, 1), 'maquina_bebida': (1, 1), 'tela_curva': (0.92, 0.12), 'garagem': (3, 2.6), 'aquario': (1.2, 2)}
INFLU = ['nano_1', 'nano_2', 'nano_3', 'medio_1', 'medio_2', 'medio_3', 'mega_1', 'mega_2']

def fonte(t=9):
    try: return ImageFont.load_default(size=t)
    except TypeError: return ImageFont.load_default()

def prancha(S):
    z = 3; F = fonte(11); cor_t = (243, 234, 214); W = 1500
    linhas = [
        ('LUXOS (3x, escala da ancora)', ['aquario', 'cadeira_gamer', 'maquina_bebida', 'tela_curva', 'ar_condicionado', 'letreiro_neon', 'garagem'], 3),
        ('GENTE (3x)', ['rugrigo_a', 'rugrigo_b', 'rugrigo_rindo', 'rugrigo_batida', 'trouxa_1', 'trouxa_2', 'trouxa_3', 'trouxa_4'], 3),
        ('MOLDURAS (3x, miolo vazio)', [f'moldura_carta_{r}' for r in RARIDADE], 3),
        ('RETRATOS (2x)', ['retrato_rugrigo_malandro', 'retrato_rugrigo_rindo', 'retrato_rugrigo_assustado'] + [f'retrato_influ_{g}' for g in INFLU], 2),
    ]
    P = Image.new('RGBA', (W, 2400), FUNDO); d = ImageDraw.Draw(P); y = 4
    for t, nomes, k in linhas:
        d.text((8, y), t, fill=cor_t, font=F); y += 16; x = 8; alt = 0
        for n in nomes:
            im = S[n].resize((S[n].width * k, S[n].height * k), Image.NEAREST)
            if x + im.width > W - 8: x = 8; y += alt + 16; alt = 0
            P.alpha_composite(im, (x, y)); d.text((x, y + im.height + 1), n.replace('retrato_', '').replace('moldura_carta_', ''), fill=(154, 149, 140), font=fonte(9))
            x += im.width + 14; alt = max(alt, im.height + 12)
        y += alt + 14
    P = P.crop((0, 0, W, y + 4)); P.save(os.path.join(AQUI, 'prancha.png')); print('prancha', P.size)

def cena(S):
    sala = Image.open(os.path.join(REGUA, 'sala.png')).convert('RGBA')
    c = Image.new('RGBA', (sala.width + 60, sala.height + 70), FUNDO); c.alpha_composite(sala)
    def pousar(nome, x, y, esp=False):
        im = ImageOps.mirror(S[nome]) if esp else S[nome]
        m = json.load(open(os.path.join(AQUI, 'medidas.json')))[nome]
        c.alpha_composite(im, (x - (m['ax'] if not esp else im.width - m['ax']), y - m['ay']))
    P = POSICOES
    for nome, x, y, esp in P: pousar(nome, x, y, esp)
    c.save(os.path.join(AQUI, 'cena-prova-1x.png'))
    c.resize((c.width * 3, c.height * 3), Image.NEAREST).save(os.path.join(AQUI, 'cena-prova.png')); print('cena', c.size)

# posições (x, y do ponto de âncora na sala-âncora 248x176): luxos e trouxas dentro da sala
POSICOES = [
    ('ar_condicionado', 196, 48, False), ('letreiro_neon', 78, 30, False),
    ('maquina_bebida', 52, 92, False), ('aquario', 76, 134, False), ('tela_curva', 122, 74, False),
    ('cadeira_gamer', 168, 112, False), ('rugrigo_rindo', 141, 104, False), ('garagem', 232, 232, False),
    ('trouxa_1', 108, 153, True), ('trouxa_2', 123, 158, False), ('trouxa_3', 172, 140, False), ('trouxa_4', 94, 120, False),
]

if __name__ == '__main__': main()
