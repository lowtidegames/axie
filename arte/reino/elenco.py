"""Elenco do piloto (R9): tropas, invasores e o 1o chefe, com TODAS as poses e animacoes.
Do gerador vem so a pose-chave (parado, passo, golpe); o resto e codigo: respirar, ciclo de andar de 6 quadros,
antecipacao, apanhar, cair, e as variacoes de rosto/chapeu para soldados iguais nao parecerem carimbo.
Cada peca devolve: quadros (numpy RGBA, mesma celula), ancora (ponto do pe), animacoes (nome -> quadros + ms).
Uso: python3 -B arte/reino/elenco.py  (grava uma folha de conferencia em prova/)"""
import os, sys
sys.dont_write_bytecode = True
import numpy as np
from comum import *

# ---------------------------------------------------------------- tratamento de cor por peca
def _pele(h, s, v): return 12 <= h <= 42 and v > 0.78 and 0.18 < s < 0.56


def variar(a, n, tipo):
    """Variacao n (0 = original). Aliado: tom de pele, cabelo e 1 px de altura; invasor: matiz e chifre."""
    if n == 0: return a
    if tipo == 'invasor':
        dh = (0, -14, 16)[n]; dv = (1, 1.10, 0.92)[n]
        return hsv_mapa(a, lambda h, s, v, y, x: ((h + dh, s, v * dv) if 240 <= h <= 320 and v > 0.2 else None))
    tom = (None, (0.80, 1.30, 26), (1.04, 0.72, 20))[n]       # (valor, saturacao, matiz) da pele
    cab = (None, (0.55, 0.8, 24), (1.30, 1.15, 34))[n]        # cabelo: mais escuro / mais claro (ruivo-loiro)
    def fn(h, s, v, y, x):
        if _pele(h, s, v): return (tom[2], s * tom[1], v * tom[0])
        if 14 <= h <= 40 and 0.42 <= s and 0.30 <= v <= 0.72 and cabelo[y, x]: return (cab[2], s * cab[1], v * cab[0])
        return None
    # cabelo = castanho colado na pele, na metade de cima
    al = a[..., 3] > 0; pele = np.zeros(al.shape, bool)
    import colorsys
    for y, x in zip(*np.nonzero(al)):
        hh, ss, vv = colorsys.rgb_to_hsv(*(a[y, x, :3] / 255.0))
        pele[y, x] = _pele(hh * 360, ss, vv)
    perto = pele.copy()
    for _ in range(2):
        p = np.pad(perto, 1); perto = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:] | perto
    b = caixa(a); cabelo = perto & (np.arange(a.shape[0])[:, None] < b[1] + (b[3] - b[1]) * 0.55)
    return hsv_mapa(a, fn)


def _fam(a, de, ate, alvo, sat=1.0, val=1.0):
    return hsv_mapa(a, lambda h, s, v, y, x: ((alvo, s * sat, v * val) if de <= h <= ate and s > 0.2 and v > 0.2 else None))


# ---------------------------------------------------------------- do bruto para a celula
def _limpo(nome, clar=None, sombra=False, pre=None):
    a = abrir(nome)
    if sombra: a = tirar_sombra(a)
    a = tirar_ilhas(a, 4)
    if clar: a = clarear(a, clar)
    if pre: a = pre(a)
    return a


def _na_celula(a, cel, ox, chao):
    """Poe o bruto (ja limpo) na celula: contorno ameixa e pe encostado em 'chao' (linha logo abaixo do ultimo pixel)."""
    c = contorno(a); b = caixa(c)
    o = celula(*cel); colar(o, c, ox - 1, chao - b[3])
    return o


def _centro_pe(q):
    b = caixa(q); xs = np.nonzero(q[b[3] - 3:b[3], :, 3].any(axis=0))[0]
    return int(round((xs.min() + xs.max()) / 2.0))


# ---------------------------------------------------------------- animacoes comuns
def animar(B, P, G, A, s, cel, chao, ax, P2=None, golpe_extra=None, lento=1.0, sem_golpe=False):
    """B parado, P passo, G golpe, A apanhou (G e A podem faltar: nascem do B por codigo). s=+1 olha direita, -1 esquerda."""
    Q = []; an = {}
    def q(a):
        Q.append(a); return len(Q) - 1
    ms = lambda v: int(round(v * lento))
    # parado: respira 1 px
    i0 = q(B); i1 = q(amassar(B, 1, 0.5))
    an['idle'] = dict(quadros=[i0, i1], ms=[ms(520), ms(520)], loop=True)
    # andar: 6 quadros (contato, amassa, passa por cima, contato inclinado, amassa, passa)
    P2 = P2 if P2 is not None else inclinar(P, s)
    w = [q(P), q(amassar(P, 1, 0.6)), q(mover(B, 0, -1)), q(P2), q(amassar(P2, 1, 0.6)), q(mover(inclinar(B, s), 0, -1))]
    an['walk'] = dict(quadros=w, ms=[ms(90)] * 6, loop=True)
    # golpe: antecipa (recua e amassa), golpe, segura, volta
    if not sem_golpe:
        if G is None: G = mover(inclinar(B, 3 * s), 3 * s, 0)
        ant = mover(inclinar(amassar(B, 1, 0.6), -2 * s), -2 * s, 0)
        g = [q(ant), q(G), q(mover(G, s, 0)), q(mover(inclinar(B, s), s, 0))]
        if golpe_extra: g, tempos = golpe_extra(q, g)
        else: tempos = [ms(120), ms(70), ms(90), ms(110)]
        an['attack'] = dict(quadros=g, ms=tempos, loop=False, impacto=1)
    # apanhou: branco 60 ms, recua
    if A is None: A = mover(inclinar(B, -3 * s), -1 * s, 0)
    an['hit'] = dict(quadros=[q(branco(A)), q(mover(A, -2 * s, 0))], ms=[60, ms(130)], loop=False)
    # cair: tomba, deita, some em pontilhado
    D = deitar(A, ax, chao, s)
    an['fall'] = dict(quadros=[q(mover(inclinar(A, -4 * s), -3 * s, 0)), q(D), q(pontilhar(D, 0.45)), q(pontilhar(D, 0.8))], ms=[ms(100), ms(170), 90, 90], loop=False)
    return Q, an


# ---------------------------------------------------------------- tropas
CEL = (48, 40); CHAO = 38; OX = 9


def _tropa(B, P, G=None, A=None, pre=None, **k):
    def faz(n):
        f = lambda nome: _na_celula(variar(_limpo(nome, pre=pre), n, 'aliado'), CEL, OX, CHAO) if nome else None
        b = f(B); ax = _centro_pe(b)
        Q, an = animar(b, f(P), f(G), f(A), 1, CEL, CHAO, ax, **k)
        if n == 1: Q = [amassar(x, 1, 0.75) for x in Q]          # variacao 1 e 1 px mais baixa
        return Q, an, ax
    return faz


def _porteiro_pecas():
    """Doorman: a porta (gerada) fica menor e ganha faixa azul; a cabeca do boneco-base espia por cima; pes por codigo."""
    porta = _limpo('porteiro-1')
    porta[:14, :12] = 0; porta[22:, :12] = 0
    linhas = [y for y in range(32) if not (9 <= y <= 13 or y in (26, 27))]            # tira 7 linhas lisas: porta de 21
    porta = np.concatenate([np.zeros((7, 32, 4), np.int32), porta[linhas]])
    b = caixa(porta)
    F = FAMILIA['Pikewall']                                   # faixa azul pintada na porta (cor da familia)
    for y, c in ((b[1] + 5, F[0]), (b[1] + 6, F[1]), (b[1] + 7, F[2])):
        for x in range(13, 26):
            if porta[y, x, 3] and porta[y, x, :3].max() > 70: porta[y, x, :3] = c
    cab = _limpo('lanceiro-1'); cab[16:] = 0; cab[:, :9] = 0   # so a cabeca (sem lanca)
    return porta, cab, b


def _porteiro(n):
    porta, cab, b = _porteiro_pecas(); cab = variar(cab, n, 'aliado')
    BOTA = de_img(bitmap(["nnn.", "bbbb"], {'n': MADEIRA[1], 'b': (84, 56, 60)}))
    X, Y = 3, 4
    def pose(dx=0, dy=0, inc=0, pe=(0, 0), olho=0):
        a = np.zeros((38, 40, 4), np.int32)
        colar(a, cab, X + 1 + dx + olho, Y - 7 + dy)                   # cabeca atras, olhos aparecendo por cima da porta
        F = FAMILIA['Pikewall']
        a[Y + 14 + dy:Y + 24, X + 9 + dx // 2:X + 13 + dx // 2] = F[1] + (255,); a[Y + 14 + dy:Y + 24, X + 9 + dx // 2] = F[2] + (255,)   # tunica
        for (bx, lv) in ((X + 8 + pe[0], pe[1]), (X + 11 - pe[0], 0)):
            a[Y + 24:Y + 28 - lv, bx + 1:bx + 3] = MADEIRA[2] + (255,); colar(a, BOTA, bx, Y + 28 - lv)
        p = np.zeros((38, 40, 4), np.int32); colar(p, porta, X + dx, Y + dy)
        colar(a, inclinar(p, inc) if inc else p, 0, 0)
        return _na_celula(a, CEL, OX - X, CHAO)
    B = pose(); ax = _centro_pe(B) - 3
    P = pose(pe=(-2, 0), inc=1); P2 = pose(pe=(2, 1), dx=1)
    G = pose(dx=5, inc=2, pe=(2, 0)); A = pose(dx=-2, inc=-2, olho=-1)
    def extra(q, g): return [g[0], g[1], q(mover(G, 2, 0)), g[3]], [140, 70, 110, 120]
    Q, an = animar(B, P, G, A, 1, CEL, CHAO, ax, P2=P2, golpe_extra=extra)
    if n == 1: Q = [amassar(x, 1, 0.3) for x in Q]
    return Q, an, ax


def _pavio(Q, an, quais):
    """Squib Runner: o pavio aceso pisca (2 quadros de faisca desenhados por codigo em cima do pavio)."""
    out = []
    for i, a in enumerate(Q):
        o = a.copy(); b = caixa(o)
        if not b or i not in quais: out.append(o); continue
        # acha o ponto mais alto do lado de tras (esquerda): a ponta do pavio
        cols = np.nonzero(o[:, :b[0] + (b[2] - b[0]) // 2, 3].any(axis=1))[0]
        y0 = cols.min(); x0 = int(np.nonzero(o[y0, :, 3])[0].mean())
        f = [(255, 255, 255), (255, 226, 96), (255, 140, 40)]
        pts = ([((0, -1), 0), ((-1, -1), 1), ((1, -1), 1), ((0, -2), 0), ((-1, -2), 1), ((1, -2), 2), ((0, -3), 1), ((-2, -3), 2), ((2, -4), 2)] if i % 2 == 0 else
               [((0, -1), 1), ((-1, -1), 2), ((0, -2), 0), ((1, -2), 1), ((0, -3), 0), ((-1, -3), 1), ((0, -4), 2), ((2, -1), 2), ((-3, -4), 2)])
        for (dx, dy), c in pts:
            y, x = y0 + dy, x0 + dx
            if 0 <= y < o.shape[0] and 0 <= x < o.shape[1] and not o[y, x, 3]: o[y, x, :3] = f[c]; o[y, x, 3] = 255
        out.append(o)
    return out


def _fogueteiro(n):
    pre = lambda a: _fam(tirar_fogo(a), 200, 250, 276, 0.9, 0.62)        # manga azul vira roxo escuro (familia Fizzwick)
    f = lambda nome: _na_celula(variar(_limpo(nome, pre=pre), n, 'aliado'), CEL, OX, CHAO)
    A_, B_ = f('fogueteiro-1'), f('fogueteiro-passo-1')
    ax = _centro_pe(A_)
    Q, an = animar(A_, A_, None, None, 1, CEL, CHAO, ax, P2=B_, sem_golpe=True)
    # anda correndo: A, amassa, B sobe, B, amassa, A sobe
    i = len(Q); Q += [B_, amassar(B_, 1, 0.6), mover(B_, 0, -1), mover(A_, 0, -1), amassar(A_, 1, 0.6)]
    an['walk'] = dict(quadros=[0, i + 4, i + 2, i, i + 1, i + 3], ms=[70] * 6, loop=True)
    an['idle'] = dict(quadros=[0, 1], ms=[260, 260], loop=True)        # impaciente: quica no lugar
    # estoura: incha em branco e some (o efeito 'explosao' do atlas toca por cima)
    j = len(Q); Q += [branco(esticar(A_, 1, 0.5)), branco(esticar(esticar(A_, 2, 0.5), 1, 0.3), (255, 236, 150)), celula(*CEL)]
    an['attack'] = dict(quadros=[j, j + 1, j + 2], ms=[70, 70, 60], loop=False, impacto=1, efeito='explosao')
    if n == 1: Q = [amassar(x, 1, 0.75) for x in Q]
    vivos = set(an['idle']['quadros'] + an['walk']['quadros'] + an['hit']['quadros'])
    return _pavio(Q, an, vivos), an, ax


def tirar_fogo(a):
    """Apaga a faisca assada no pavio (o codigo redesenha piscando)."""
    o = a.copy(); H = a.shape[0]
    for y, x in zip(*np.nonzero(a[..., 3])):
        r, g, b = a[y, x, :3]
        if y < H * 0.3 and x < a.shape[1] * 0.4 and r > 200 and (g > 90) and b < 140: o[y, x] = 0
        if y < H * 0.3 and x < a.shape[1] * 0.4 and r > 200 and g < 90 and b < 90: o[y, x] = 0
    return tirar_ilhas(o, 4)


TROPAS = [
 dict(id='T01', nome='Pikeman', familia='Pikewall', faz=_tropa('lanceiro-1', 'lanceiro-passo2-1', 'lanceiro-golpe-1', 'lanceiro-apanhou-1')),
 dict(id='T02', nome='Doorman', familia='Pikewall', faz=_porteiro),
 dict(id='T04', nome='Hedge Archer', familia='Thornbow', faz=_tropa('arqueiro-b-1', 'arqueiro-passo-1', 'arqueiro-tiro-1'), distancia=True),
 dict(id='T07', nome='Frypan Cook', familia='Potluck', faz=_tropa('cozinheiro-1', 'cozinheiro-passo-1', 'cozinheiro-golpe-1')),
 dict(id='T10', nome='Squib Runner', familia='Fizzwick', faz=_fogueteiro),
]


# ---------------------------------------------------------------- invasores
def _invasor(B, P, G=None, cel=CEL, ox=10, chao=CHAO, clar=1.85, sombra=False, lento=1.0, pre=None):
    def faz(n):
        f = lambda nome: _na_celula(variar(_limpo(nome, clar=clar, sombra=sombra, pre=pre), n, 'invasor'), cel, ox, chao) if nome else None
        b = f(B); ax = _centro_pe(b)
        Q, an = animar(b, f(P), f(G), None, -1, cel, chao, ax, lento=lento)
        return Q, an, ax
    return faz


def _pernalta(n):
    """Stilt Runner: corpo gerado, pernas de pau por codigo (balancam de verdade: 6 quadros de corrida)."""
    a = variar(_limpo('pernalta-1', clar=1.85), n, 'invasor')
    corpo = a.copy(); corpo[20:] = 0
    PAU = MADEIRA[0]; PE = (108, 52, 150)
    def pose(e=(0, 0), d=(0, 0), dy=0, inc=0, dx=0):
        c = np.zeros((40, 40, 4), np.int32)
        im = tela(40, 40); dr = ImageDraw.Draw(im)
        for (qx, (px, lv)) in ((17, e), (24, d)):
            fx = qx - 1 + px; fy = 33 - lv
            dr.line((qx, 22 + dy, fx, fy), fill=PAU + (255,), width=1)
            dr.rectangle((qx - 1, 22 + dy, qx + 1, 24 + dy), fill=PE + (255,))        # pe do bicho amarrado no pau
        colar(c, de_img(im), 0, 0)
        cp = np.zeros((40, 40, 4), np.int32); colar(cp, corpo, 4, 4 + dy)
        if inc: cp = inclinar(cp, inc)
        colar(c, cp, dx, 0)
        return _na_celula(c[:, 4:36], CEL, 10, CHAO)
    B = pose(); ax = _centro_pe(B)
    W = [pose((-5, 0), (5, 0), 1, -1), pose((-3, 0), (2, 1), 1, -1), pose((0, 0), (-1, 3), 0, -1), pose((5, 0), (-5, 0), 1, -1), pose((2, 1), (-3, 0), 1, -1), pose((-1, 3), (0, 0), 0, -1)]
    G = pose((-7, 5), (1, 0), 0, 1, 1); ANT = pose((2, 0), (2, 0), 1, 2, 1); A = pose((-2, 1), (-3, 0), 0, 3, 1)
    Q, an = animar(B, W[0], G, A, -1, CEL, CHAO, ax)
    i = len(Q); Q += W + [ANT]
    an['walk'] = dict(quadros=list(range(i, i + 6)), ms=[65] * 6, loop=True)
    an['attack']['quadros'][0] = i + 6
    return Q, an, ax


CEL_B = (72, 56); CHAO_B = 54
CEL_C = (112, 92); CHAO_C = 90

INVASORES = [
 dict(id='muncher', nome='Muncher', faz=_invasor('invasor-b-1', 'invasor-passo-1', 'invasor-golpe-1')),
 dict(id='stilt-runner', nome='Stilt Runner', faz=_pernalta),
 dict(id='spud-slinger', nome='Spud Slinger', faz=_invasor('atirador-1', 'atirador-passo-1', 'atirador-tiro-1'), distancia=True),
 dict(id='potlid-brute', nome='Potlid Brute', faz=_invasor('tampa-1', 'tampa-passo-1', 'tampa-golpe-1', cel=CEL_B, ox=14, chao=CHAO_B, clar=None, sombra=True, lento=1.25), cel=CEL_B, barra_vida=True),
 dict(id='gutbucket', nome='Gutbucket the Wide', faz=_invasor('gutbucket-1', 'gutbucket-passo-1', 'gutbucket-golpe-1', cel=CEL_C, ox=18, chao=CHAO_C, clar=None, lento=1.5), cel=CEL_C, chefe=True, barra_vida=True),
]


def montar():
    """Devolve a lista de pecas prontas para o atlas."""
    out = []
    for t in TROPAS:
        vs = [t['faz'](n) for n in range(3)]
        out.append(dict(id=t['id'], nome=t['nome'], tipo='tropa', familia=t['familia'], cor=hexa(FAMILIA[t['familia']][1]), olha='direita',
                        cel=CEL, ancora=(vs[0][2], CHAO), variantes=[v[0] for v in vs], anims=vs[0][1], distancia=bool(t.get('distancia'))))
    for t in INVASORES:
        nv = 1 if t.get('chefe') else (2 if t.get('barra_vida') else 3)
        vs = [t['faz'](n) for n in range(nv)]
        cel = t.get('cel', CEL)
        out.append(dict(id=t['id'], nome=t['nome'], tipo='chefe' if t.get('chefe') else 'invasor', familia='Hungry Horde', cor=hexa(INVASOR[1]), olha='esquerda',
                        cel=cel, ancora=(vs[0][2], {CEL: CHAO, CEL_B: CHAO_B, CEL_C: CHAO_C}[cel]), variantes=[v[0] for v in vs], anims=vs[0][1],
                        distancia=bool(t.get('distancia')), barra_vida=bool(t.get('barra_vida'))))
    return out


if __name__ == '__main__':
    ps = montar()
    for p in ps:
        hs = [caixa(q) for q in p['variantes'][0]]
        m = min(min(b[0], b[1], p['cel'][0] - b[2]) for b in hs if b)
        print(p['id'], p['nome'], 'quadros', len(p['variantes'][0]), 'variantes', len(p['variantes']), 'ancora', p['ancora'], 'margem min', m,
              'corpo', hs[0][2] - hs[0][0], 'x', hs[0][3] - hs[0][1], {k: len(v['quadros']) for k, v in p['anims'].items()})
    W = sum(len(p['variantes'][0]) * p['cel'][0] for p in ps[:1]);
    lin = []
    for p in ps:
        for v in p['variantes'][:1]:
            im = tela(len(v) * p['cel'][0], p['cel'][1])
            for i, q in enumerate(v): im.alpha_composite(para_img(q), (i * p['cel'][0], 0))
            lin.append(im)
    W = max(l.width for l in lin); H = sum(l.height for l in lin)
    o = Image.new('RGBA', (W, H), (110, 170, 100, 255)); y = 0
    for l in lin: o.alpha_composite(l, (0, y)); y += l.height
    saida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, 'prova', 'elenco-quadros.png')
    ampliar(o, 3).save(saida)
