"""Monta o ATLAS do Keepmile para a tela: folhas de sprites + atlas.json em public/reino/arte/.
R11 (arte completa): MESMO FORMATO da R9. As folhas antigas (tropas, invasores, reino, efeitos, interface, cena-*) sao
montadas primeiro, na mesma ordem e com os mesmos tamanhos, e por isso cada quadro antigo fica no MESMO lugar; tudo que e
novo vai para o fim da folha ou para folhas novas (tropas2, invasores2, chefes, reino2, efeitos2, cartas2, extras).
No fim, o atlas novo e conferido contra arte/reino/atlas-r9.json (a trava): se um retangulo antigo mudou, o script falha.
Uso: python3 -B arte/reino/atlas.py"""
import os, sys, json, re
sys.dont_write_bytecode = True
import numpy as np
from comum import *
import elenco, predios, efeitos, efeitos2, extras, interface, cenario

RAIZ = os.path.dirname(os.path.dirname(AQUI))
SAI = os.path.join(RAIZ, 'public', 'reino', 'arte')
LARG = 1024
TRAVA = json.load(open(os.path.join(AQUI, 'atlas-r9.json')))

PILOTO = ['T01', 'T02', 'T04', 'T07', 'T10', 'B01', 'B04', 'B06', 'M01', 'M06']      # ordem da R9 na folha 'interface'
RAR = {'C': 'Common', 'U': 'Uncommon', 'R': 'Rare', 'E': 'Epic', 'L': 'Legendary'}
IDS = dict(invasores={'muncher': 'muncher', 'stilt': 'stilt-runner', 'spud': 'spud-slinger', 'brute': 'potlid-brute', 'bloater': 'bloater', 'mole': 'mole-raider', 'drum': 'drum-bully', 'quack': 'quack'},
           chefes={'gutbucket': 'gutbucket', 'niptuck': 'niptuck', 'moleworth': 'moleworth', 'gobble': 'gobble'})


def cartas_do_config():
    """As 30 cartas saem de shared/reino/config.js (nome, tipo, familia, raridade, texto): uma fonte so."""
    txt = open(os.path.join(RAIZ, 'shared', 'reino', 'config.js')).read(); out = []
    for m in re.finditer(r"^\s*([TBM]\d\d): \{ nome: (['\"])(.*?)\2, tipo: '(\w+)', familia: '(\w+)', raridade: '(\w)'.*?texto: (['\"])(.*?)\7 \},?\s*$", txt, re.M):
        out.append((m.group(1), m.group(3), m.group(5).capitalize(), RAR[m.group(6)], m.group(4), m.group(8)))
    assert len(out) == 30, len(out)
    return out


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
    """Poe os quadros que ja existiam na R9 (mesma ordem); os quadros NOVOS da mesma peca ficam pendentes para o fim da folha."""
    velho = TRAVA['pecas'].get(p['id']); n = len(velho['quadros']) if velho else None
    vs = []; resto = []
    for v in p['variantes']:
        f.nova_linha(); vs.append([f.por(q) for q in v[:n]]); resto.append(v[n:] if n else [])
    o = dict(nome=p['nome'], tipo=p['tipo'], folha=nome_folha, tamanho=list(p['cel']), ancora=list(p['ancora']), quadros=vs[0],
             animacoes={k: dict(quadros=a['quadros'], ms=a['ms'], loop=bool(a.get('loop')), **({'impacto': a['impacto']} if 'impacto' in a else {}), **({'efeito': a['efeito']} if 'efeito' in a else {})) for k, a in p['anims'].items()})
    if len(vs) > 1: o['variantes'] = vs
    for k in ('familia', 'cor', 'olha', 'distancia', 'barra_vida', 'niveis', 'estados', 'nota'):
        if p.get(k) not in (None, False): o[k] = p[k]
    return o, (vs, resto)


def _grupo(atlas, pecas, nome_folha, lista, larg=LARG):
    f = Folha(nome_folha, larg); pend = []
    for p in lista:
        o, pe = _peca(f, p, nome_folha); atlas['pecas'][p['id']] = o; pecas[p['id']] = p; pend.append(pe)
    for (vs, resto) in pend:                                   # quadros novos de pecas antigas: linhas novas no fim
        for v, r in zip(vs, resto):
            if r: f.nova_linha(); v += [f.por(q) for q in r]
    atlas['folhas'][nome_folha] = f.salvar()


def _recorte(q):
    b = caixa(q); return para_img(q[b[1]:b[3], b[0]:b[2]])


def _arte_carta(cid, tipo, pecas):
    p = pecas[cid]; v = p['variantes'][0]
    if tipo == 'tropa':
        if cid == 'T10': return _recorte(v[p['anims']['walk']['quadros'][0]])
        if cid in ('T01', 'T02', 'T04', 'T07', 'T03'): return _recorte(v[p['anims']['attack']['quadros'][1]])
        return _recorte(v[0])                                  # as outras tropas novas: a pose parada e a silhueta da carta
    if tipo == 'construcao': return _recorte(v[0])
    return _recorte(v[p['anims']['idle']['quadros'][0]])


def conferir(novo):
    """A trava: todo retangulo que existia na R9 tem de estar no mesmo lugar, e todo campo antigo tem de continuar existindo."""
    erros = []; avisos = []
    def anda(a, b, cam):
        if isinstance(a, dict):
            if not isinstance(b, dict): erros.append('%s deixou de ser objeto' % cam); return
            for k in a:
                if k not in b: erros.append('%s.%s sumiu' % (cam, k)); continue
                anda(a[k], b[k], cam + '.' + k)
        elif isinstance(a, list):
            if not isinstance(b, list) or len(b) < len(a):
                (avisos if '.animacoes.' in cam else erros).append('%s encolheu' % cam); return
            if '.animacoes.' in cam or cam.endswith('.ms'): return           # tempos e indices podem mudar (dados, nao formato)
            if len(a) == 4 and all(isinstance(x, int) for x in a):
                if a != b[:4] or len(b) != 4: erros.append('%s mudou de lugar: %s -> %s' % (cam, a, b))
                return
            for i, x in enumerate(a): anda(x, b[i], '%s[%d]' % (cam, i))
        elif a != b and not cam.startswith('.folhas'): avisos.append('%s: %r -> %r' % (cam, a, b))
    anda(TRAVA, novo, '')
    return erros, avisos


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
    # ---- tropas / invasores / chefes (os da R9 nas folhas antigas; os novos em folhas novas)
    el = elenco.montar()
    _grupo(atlas, pecas, 'tropas', [p for p in el if p['tipo'] == 'tropa' and not p.get('nova')])
    _grupo(atlas, pecas, 'invasores', [p for p in el if p['tipo'] != 'tropa' and not p.get('nova')])
    _grupo(atlas, pecas, 'tropas2', [p for p in el if p['tipo'] == 'tropa' and p.get('nova')])
    _grupo(atlas, pecas, 'invasores2', [p for p in el if p['tipo'] == 'invasor' and p.get('nova')])
    _grupo(atlas, pecas, 'chefes', [p for p in el if p['tipo'] == 'chefe' and p.get('nova')])
    # ---- reino (predios, castelo, portao, terreno)
    pr = predios.montar_predios()
    _grupo(atlas, pecas, 'reino', [p for p in pr if not p.get('nova')] + predios.montar_reino())
    _grupo(atlas, pecas, 'reino2', [p for p in pr if p.get('nova')])
    # ---- efeitos e magias
    _grupo(atlas, pecas, 'efeitos', efeitos.montar())
    _grupo(atlas, pecas, 'efeitos2', efeitos2.montar())
    # ---- cartas e interface (folha antiga: mesma ordem da R9)
    CARTAS = cartas_do_config(); por_id = {c[0]: c for c in CARTAS}
    f = Folha('interface', 640)
    cartas = {}; imagens = {}
    for (cid, nome, fam, rar, tipo, texto) in CARTAS:
        imagens[cid] = interface.carta(nome, fam, rar, tipo, _arte_carta(cid, tipo, pecas), 'magia' if tipo == 'magia' else 'dia')
    for cid in PILOTO:
        (_, nome, fam, rar, tipo, texto) = por_id[cid]
        cartas[cid] = dict(nome=nome, tipo=tipo, familia=fam, raridade=rar, texto=texto, quadro=f.por(imagens[cid]), peca=cid)
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
    # ---- R11: as 30 cartas (folha nova 'cartas2') com a ilustracao solta de cada uma
    f = Folha('cartas2', 640); todas = {}
    for (cid, nome, fam, rar, tipo, texto) in CARTAS:
        todas[cid] = dict(nome=nome, tipo=tipo, familia=fam, raridade=rar, texto=texto, folha='cartas2', quadro=f.por(imagens[cid]), peca=cid)
    f.nova_linha()
    for (cid, nome, fam, rar, tipo, texto) in CARTAS: todas[cid]['ilustracao'] = f.por(imagens[cid].crop((4, 18, 52, 53)))
    atlas['cartas']['todas'] = todas; atlas['cartas']['ilustracao_tamanho'] = [48, 35]
    atlas['folhas']['cartas2'] = f.salvar()
    # ---- R11: extras de interface (folha nova 'extras')
    f = Folha('extras', 640)
    ex = extras.montar(f.por, f.nova_linha)
    atlas['fontes'].update(ex.pop('_fontes'))
    for k, v in ex.items(): atlas[k] = v
    atlas['folhas']['extras'] = f.salvar()
    extras.icone_jogo(32).save(os.path.join(SAI, 'favicon-32.png'), optimize=True); extras.icone_jogo(180).save(os.path.join(SAI, 'icone-180.png'), optimize=True)
    atlas['icone_do_jogo'] = {'32': 'favicon-32.png', '180': 'icone-180.png'}
    atlas['ids'] = dict(IDS, nota='id de shared/reino/config.js -> id em pecas')
    # ---- cenarios (planos antigos na ordem da R9, nuvens, e so depois os planos novos)
    cen, nuvens = cenario.montar(); atlas['cenarios'] = {}
    for ap, geo in (('pc', cenario.PC), ('celular', cenario.CEL)):
        a = dict(referencia=list(geo['ref']), largura_dos_planos=geo['largura'], portao=list(geo['portao']), castelo=list(geo['castelo']),
                 terrenos=[dict(n=t['n'], x=t['x'], largura=t['largura'], base_predio=t['predio_base'], estrada=list(t['estrada']), sentido=t['sentido']) for t in geo['terrenos']], horas={})
        if 'escadas' in geo: a['escadas'] = [dict(de=e['de'], para=e['para'], x=list(e['x']), y=list(e['y'])) for e in geo['escadas']]
        if 'mesa_y' in geo: a['mesa_y'] = geo['mesa_y']
        for h in cenario.HORAS:
            nome = 'cena-%s-%s' % (ap, cenario.NOME_HORA[h]); f = Folha(nome, 640); planos = []
            n_velho = len(TRAVA['cenarios'][ap]['horas'][cenario.NOME_HORA[h]]['planos'])
            def plano(pn, im, x, y, par):
                f.nova_linha(); planos.append(dict(nome=pn, quadro=f.por(im), x=x, y=y, paralaxe=par, repete_x=(ap == 'pc' and pn != 'sky')))
            for pl in cen[ap][h][:n_velho]: plano(*pl)
            f.nova_linha(); nv = [f.por(n) for n in nuvens[h]]
            for pl in cen[ap][h][n_velho:]: plano(*pl)
            L = cenario.LUZ[h]
            a['horas'][cenario.NOME_HORA[h]] = dict(folha=nome, planos=planos, nuvens=nv, luz=dict(ambiente=hexa(L['ambiente']), filete=hexa(L['filete']), sombra=L['sombra'], vinheta=L['vinheta']))
            atlas['folhas'][nome] = f.salvar()
        atlas['cenarios'][ap] = a
    atlas['cenarios']['rodadas'] = {'1': 'morning', '2': 'morning', '3': 'afternoon', '4': 'afternoon', '5': 'boss-night'}
    atlas['cenarios']['vida'] = dict(morning=['bird', 'bunting'], afternoon=['bird', 'dust-mote', 'bunting'], **{'boss-night': ['firefly']})
    # ---- a trava
    erros, avisos = conferir(atlas)
    for a in avisos: print('aviso (valor mudou, formato igual):', a[:150])
    if erros:
        for e in erros: print('ERRO DE FORMATO:', e)
        sys.exit(1)
    txt = json.dumps(atlas, separators=(',', ':'), ensure_ascii=False)
    open(os.path.join(SAI, 'atlas.json'), 'w').write(txt + '\n')
    open(os.path.join(SAI, 'atlas.js'), 'w').write('// gerado por arte/reino/atlas.py: o mesmo conteudo de atlas.json, para abrir a galeria sem servidor\nwindow.KEEPMILE_ATLAS = ' + txt + ';\n')
    tot = 0
    for a in sorted(os.listdir(SAI)):
        t = os.path.getsize(os.path.join(SAI, a)); tot += t; print('%-28s %7.1f KB%s' % (a, t / 1024.0, '  <-- ACIMA DE 400 KB' if t > 400 * 1024 and a.endswith('.png') else ''))
    print('total %.1f KB · pecas %d · cartas %d · icones %d · trava R9 conferida: nenhum retangulo antigo mudou' % (tot / 1024.0, len(atlas['pecas']), len(todas), len(ic)))


if __name__ == '__main__':
    main()
