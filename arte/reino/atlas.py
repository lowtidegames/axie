"""Monta o ATLAS do piloto (R9) para a tela: folhas de sprites + atlas.json em public/reino/arte/.
Junta elenco.py (tropas, invasores, chefe), predios.py (construcoes, castelo, portao, terreno), efeitos.py, interface.py
(cartas, icones, botoes, fontes) e cenario.py (planos por aparelho e hora).
Uso: python3 -B arte/reino/atlas.py"""
import os, sys, json
sys.dont_write_bytecode = True
import numpy as np
from comum import *
import elenco, predios, efeitos, interface, cenario

RAIZ = os.path.dirname(os.path.dirname(AQUI))
SAI = os.path.join(RAIZ, 'public', 'reino', 'arte')
LARG = 1024

CARTAS = [  # as 10 cartas do piloto (biblia, coluna P)
 ('T01', 'Pikeman', 'Pikewall', 'Common', 'tropa', 'Sturdy pikemen. They hold the road.'),
 ('T02', 'Doorman', 'Pikewall', 'Uncommon', 'tropa', 'Carries a real door. Takes 30% less damage from ranged.'),
 ('T04', 'Hedge Archer', 'Thornbow', 'Common', 'tropa', 'Shoots from behind the line.'),
 ('T07', 'Frypan Cook', 'Potluck', 'Common', 'tropa', 'Many cooks, fast pans.'),
 ('T10', 'Squib Runner', 'Fizzwick', 'Common', 'tropa', 'Runs at invaders and goes boom.'),
 ('B01', 'Smithy', 'Pikewall', 'Common', 'construcao', 'Neighbors deal more damage.'),
 ('B04', 'Watchtower', 'Thornbow', 'Common', 'construcao', 'Neighbor shooters see farther and hit harder.'),
 ('B06', 'Cookhouse', 'Potluck', 'Common', 'construcao', 'Neighbors heal every second.'),
 ('M01', 'Boom Barrel', 'Fizzwick', 'Common', 'magia', 'First invader to step here sets it off.'),
 ('M06', 'Bramble Snare', 'Thornbow', 'Common', 'magia', 'The first invaders to step here are stuck for 2.5 s.'),
]


class Folha:
    """Empacotador simples em prateleiras: cada tira de quadros numa linha, quebrando na largura maxima."""
    def __init__(self, nome, larg=LARG):
        self.nome, self.larg = nome, larg; self.x = self.y = self.h = 0; self.itens = []; self.maxw = 0

    def nova_linha(self):
        if self.x: self.y += self.h + 1; self.x = 0; self.h = 0

    def por(self, im):
        if isinstance(im, np.ndarray): im = para_img(im)
        w, h = im.size
        if self.x + w > self.larg: self.nova_linha()
        r = [self.x, self.y, w, h]; self.itens.append((im, self.x, self.y))
        self.x += w + 1; self.h = max(self.h, h); self.maxw = max(self.maxw, r[0] + w)
        return r

    def salvar(self):
        H = self.y + self.h; im = tela(self.maxw, H)
        for (s, x, y) in self.itens: im.alpha_composite(s, (x, y))
        arq = self.nome + '.png'; im.save(os.path.join(SAI, arq), optimize=True)
        return dict(arquivo=arq, largura=self.maxw, altura=H)


def _peca(f, p, nome_folha):
    vs = []
    for v in p['variantes']:
        f.nova_linha(); vs.append([f.por(q) for q in v])
    o = dict(nome=p['nome'], tipo=p['tipo'], folha=nome_folha, tamanho=list(p['cel']), ancora=list(p['ancora']), quadros=vs[0],
             animacoes={k: dict(quadros=a['quadros'], ms=a['ms'], loop=bool(a.get('loop')), **({'impacto': a['impacto']} if 'impacto' in a else {}), **({'efeito': a['efeito']} if 'efeito' in a else {})) for k, a in p['anims'].items()})
    if len(vs) > 1: o['variantes'] = vs
    for k in ('familia', 'cor', 'olha', 'distancia', 'barra_vida', 'niveis', 'estados', 'nota'):
        if p.get(k) not in (None, False): o[k] = p[k]
    return o


def _recorte(q):
    b = caixa(q); return para_img(q[b[1]:b[3], b[0]:b[2]])


def main():
    os.makedirs(SAI, exist_ok=True)
    for a in os.listdir(SAI):
        if a.endswith('.png'): os.remove(os.path.join(SAI, a))
    atlas = dict(jogo='Keepmile', versao=1, unidade='px de arte (ampliar sempre por numero inteiro, sem suavizar)',
                 familias={k: dict(cor=hexa(v[1]), claro=hexa(v[0]), escuro=hexa(v[2])) for k, v in FAMILIA.items()},
                 invasores=dict(cor=hexa(INVASOR[1]), olho=hexa(LIMA)),
                 raridades={k: dict(cor=hexa(v[1]), claro=hexa(v[0]), escuro=hexa(v[2])) for k, v in RARIDADE.items()},
                 cores=dict(contorno=hexa(AMEIXA), creme=hexa(CREME), ouro=hexa(OURO)), folhas={}, pecas={})
    pecas = {}
    # ---- tropas / invasores
    el = elenco.montar()
    f = Folha('tropas')
    for p in el:
        if p['tipo'] == 'tropa': atlas['pecas'][p['id']] = _peca(f, p, 'tropas'); pecas[p['id']] = p
    atlas['folhas']['tropas'] = f.salvar()
    f = Folha('invasores')
    for p in el:
        if p['tipo'] != 'tropa': atlas['pecas'][p['id']] = _peca(f, p, 'invasores'); pecas[p['id']] = p
    atlas['folhas']['invasores'] = f.salvar()
    # ---- reino (predios, castelo, portao, terreno)
    f = Folha('reino')
    for p in predios.montar_predios() + predios.montar_reino(): atlas['pecas'][p['id']] = _peca(f, p, 'reino'); pecas[p['id']] = p
    atlas['folhas']['reino'] = f.salvar()
    # ---- efeitos e magias
    f = Folha('efeitos')
    for p in efeitos.montar(): atlas['pecas'][p['id']] = _peca(f, p, 'efeitos'); pecas[p['id']] = p
    atlas['folhas']['efeitos'] = f.salvar()
    # ---- cartas e interface
    f = Folha('interface', 640)
    cartas = {}
    for (cid, nome, fam, rar, tipo, texto) in CARTAS:
        p = pecas[cid]; v = p['variantes'][0]
        if tipo == 'tropa': arte = _recorte(v[p['anims']['attack']['quadros'][1]] if cid != 'T10' else v[p['anims']['walk']['quadros'][0]])
        elif tipo == 'construcao': arte = _recorte(v[0])
        else: arte = _recorte(v[p['anims']['idle']['quadros'][0]])
        im = interface.carta(nome, fam, rar, tipo, arte, 'magia' if tipo == 'magia' else 'dia')
        cartas[cid] = dict(nome=nome, tipo=tipo, familia=fam, raridade=rar, texto=texto, quadro=f.por(im), peca=cid)
    f.nova_linha()
    atlas['cartas'] = dict(folha='interface', tamanho=[interface.CW, interface.CH], pinos=interface.PINOS, pino_tamanho=[5, 5], texto_forca=interface.TEXTO_FORCA,
                           piloto=cartas, molduras={r: f.por(interface.moldura(r)) for r in RARIDADE}, costas=f.por(interface.costas()))
    f.nova_linha()
    ic = {n: f.por(interface.icone(n)) for n in interface.ICONES}
    f.nova_linha()
    ui = {}
    for nome, cor in (('green', interface.VERDE), ('red', interface.CARMIM), ('plum', interface.PAINEL)):
        ui['button-' + nome] = dict(solto=f.por(interface.botao(24, 24, cor)), apertado=f.por(interface.botao(24, 24, cor, True)), conteudo=[12, 11])
    for nome, cor in (('green', interface.VERDE), ('plum', interface.PAINEL)):
        ui['button-wide-' + nome] = dict(solto=f.por(interface.botao(96, 24, cor)), apertado=f.por(interface.botao(96, 24, cor, True)), conteudo=[48, 11], fatias=[6, 84, 6])
    ui['panel'] = dict(quadro=f.por(interface.painel(24, 24)), borda=3, nota='9 fatias: cantos de 3 px, miolo esticavel')
    f.nova_linha()
    ui['loot'] = {t: f.por(interface.moldura_espolio(t)) for t in ('Card', 'Promotion', 'Purse')}
    ui['level-up'] = dict(quadros=[f.por(interface.selo_levelup(q)) for q in range(4)], ms=[120] * 4)
    ui['label-to-go'] = f.por(interface.etiqueta('1 TO GO')); ui['label-boss'] = f.por(interface.etiqueta('BOSS', interface.PAINEL)); ui['label-new'] = f.por(interface.etiqueta('NEW', interface.VERDE))
    f.nova_linha()
    fim, fontes = interface.folha_fontes(); r = f.por(fim)
    for fo in fontes.values():
        for c in fo['glifos']: fo['glifos'][c][0] += r[0]; fo['glifos'][c][1] += r[1]
        fo['folha'] = 'interface'
    atlas['icones'] = dict(folha='interface', quadros=ic); atlas['interface'] = dict(folha='interface', pecas=ui); atlas['fontes'] = fontes
    atlas['folhas']['interface'] = f.salvar()
    # ---- cenarios
    cen, nuvens = cenario.montar(); atlas['cenarios'] = {}
    for ap, geo in (('pc', cenario.PC), ('celular', cenario.CEL)):
        a = dict(referencia=list(geo['ref']), largura_dos_planos=geo['largura'], portao=list(geo['portao']), castelo=list(geo['castelo']),
                 terrenos=[dict(n=t['n'], x=t['x'], largura=t['largura'], base_predio=t['predio_base'], estrada=list(t['estrada']), sentido=t['sentido']) for t in geo['terrenos']], horas={})
        if 'escadas' in geo: a['escadas'] = [dict(de=e['de'], para=e['para'], x=list(e['x']), y=list(e['y'])) for e in geo['escadas']]
        if 'mesa_y' in geo: a['mesa_y'] = geo['mesa_y']
        for h in cenario.HORAS:
            nome = 'cena-%s-%s' % (ap, cenario.NOME_HORA[h]); f = Folha(nome, 640); planos = []
            for (pn, im, x, y, par) in cen[ap][h]:
                f.nova_linha(); planos.append(dict(nome=pn, quadro=f.por(im), x=x, y=y, paralaxe=par, repete_x=(ap == 'pc' and pn != 'sky')))
            f.nova_linha(); nv = [f.por(n) for n in nuvens[h]]
            L = cenario.LUZ[h]
            a['horas'][cenario.NOME_HORA[h]] = dict(folha=nome, planos=planos, nuvens=nv, luz=dict(ambiente=hexa(L['ambiente']), filete=hexa(L['filete']), sombra=L['sombra'], vinheta=L['vinheta']))
            atlas['folhas'][nome] = f.salvar()
        atlas['cenarios'][ap] = a
    atlas['cenarios']['rodadas'] = {'1': 'morning', '2': 'morning', '3': 'afternoon', '4': 'afternoon', '5': 'boss-night'}
    txt = json.dumps(atlas, separators=(',', ':'), ensure_ascii=False)
    open(os.path.join(SAI, 'atlas.json'), 'w').write(txt + '\n')
    open(os.path.join(SAI, 'atlas.js'), 'w').write('// gerado por arte/reino/atlas.py: o mesmo conteudo de atlas.json, para abrir a galeria sem servidor\nwindow.KEEPMILE_ATLAS = ' + txt + ';\n')
    tot = 0
    for a in sorted(os.listdir(SAI)):
        t = os.path.getsize(os.path.join(SAI, a)); tot += t; print('%-28s %7.1f KB' % (a, t / 1024.0))
    print('total %.1f KB · pecas %d · cartas %d · icones %d' % (tot / 1024.0, len(atlas['pecas']), len(cartas), len(ic)))


if __name__ == '__main__':
    main()
