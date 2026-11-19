// Galeria da arte completa (R11): le o atlas (atlas.js, o mesmo conteudo do atlas.json) e mostra tudo animando em x3.
(function () {
  'use strict';
  var A = window.KEEPMILE_ATLAS, Z = 3, folhas = {}, tarefas = [], raiz = document.getElementById('galeria');
  if (!A) { raiz.textContent = 'atlas.js not found'; return; }

  function carregar(feito) {
    var nomes = Object.keys(A.folhas), falta = nomes.length;
    nomes.forEach(function (n) {
      var im = new Image();
      im.onload = im.onerror = function () { if (--falta === 0) feito(); };
      im.src = A.folhas[n].arquivo; folhas[n] = im;
    });
  }
  function el(tag, classe, texto, pai) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto) e.textContent = texto;
    (pai || raiz).appendChild(e); return e;
  }
  function tela(w, h, pai, zoom) {
    var c = el('canvas', 'px', null, pai), z = zoom || Z;
    c.width = w; c.height = h; c.style.width = (w * z) + 'px'; c.style.height = (h * z) + 'px';
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false; return x;
  }
  function rec(ctx, folha, r, x, y, espelha) {
    if (espelha) { ctx.save(); ctx.translate(x + r[2], y); ctx.scale(-1, 1); ctx.drawImage(folhas[folha], r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); ctx.restore(); }
    else ctx.drawImage(folhas[folha], r[0], r[1], r[2], r[3], x, y, r[2], r[3]);
  }
  function quadroEm(anim, t) {            // qual quadro da animacao no tempo t (ms)
    var tot = 0, i; for (i = 0; i < anim.ms.length; i++) tot += anim.ms[i];
    var pausa = anim.loop ? 0 : 500; t = t % (tot + pausa);
    for (i = 0; i < anim.ms.length; i++) { if (t < anim.ms[i]) return anim.quadros[i]; t -= anim.ms[i]; }
    return anim.quadros[anim.quadros.length - 1];
  }
  function texto(ctx, s, x, y, fonte) {
    var f = A.fontes[fonte || 'reino-contorno'], i, g;
    for (i = 0; i < s.length; i++) {
      g = f.glifos[s[i]] || f.glifos[s[i].toUpperCase()] || f.glifos['?'];
      rec(ctx, f.folha, g, x, y); x += g[2] + f.espaco;
    }
    return x;
  }
  function secao(titulo, nota) { el('h2', null, titulo); if (nota) el('p', 'nota', nota); return el('div', 'grade'); }

  // ---- pecas animadas: uma caixa por animacao, variantes lado a lado
  function caixaPeca(id, pai) {
    var p = A.pecas[id], cx = el('div', 'peca', null, pai), nomes = Object.keys(p.animacoes), vars = p.variantes || [p.quadros];
    el('div', 'titulo', p.nome + '  [' + id + ']', cx);
    if (p.cor) { var faixa = el('div', 'faixa', null, cx); faixa.style.background = p.cor; }
    var linha = el('div', 'linha', null, cx);
    nomes.forEach(function (n) {
      var bloco = el('div', 'anim', null, linha), w = p.tamanho[0], h = p.tamanho[1];
      var nv = (n === 'idle' || n === 'walk') ? vars.length : 1, ctx = tela(w * nv, h, bloco);
      el('div', 'legenda', n + ' · ' + p.animacoes[n].quadros.length + 'f', bloco);
      tarefas.push(function (t) {
        ctx.clearRect(0, 0, w * nv, h);
        ctx.fillStyle = 'rgba(43,30,58,.25)'; ctx.fillRect(0, p.ancora[1], w * nv, 1);
        for (var v = 0; v < nv; v++) rec(ctx, p.folha, vars[v][quadroEm(p.animacoes[n], t + v * 130)], v * w, 0);
      });
    });
  }

  function cenario(ap, hora, pai) {
    var c = A.cenarios[ap], h = c.horas[hora], W = c.referencia[0], H = c.referencia[1];
    var cx = el('div', 'peca', null, pai); el('div', 'titulo', ap + ' · ' + hora + ' · ' + W + 'x' + H, cx);
    var ctx = tela(W, H, cx, ap === 'pc' ? 2 : 2);
    tarefas.push(function (t) {
      ctx.clearRect(0, 0, W, H);
      var cam = ap === 'pc' ? Math.sin(t / 4000) * 30 : 0;
      h.planos.forEach(function (p) {
        var x = Math.round(p.x - cam * p.paralaxe);
        rec(ctx, h.folha, p.quadro, x, p.y);
        if (p.repete_x) { rec(ctx, h.folha, p.quadro, x - p.quadro[2], p.y); rec(ctx, h.folha, p.quadro, x + p.quadro[2], p.y); }
        if (p.nome === 'sky') h.nuvens.forEach(function (n, i) { rec(ctx, h.folha, n, Math.round(((t / (90 + i * 30)) + i * 170) % (W + 60)) - 60, 26 + i * 11); });
      });
      var cast = A.pecas.castle, gate = A.pecas.gate;
      rec(ctx, gate.folha, gate.quadros[0], c.portao[0] - gate.ancora[0], c.portao[1] - gate.ancora[1]);
      rec(ctx, cast.folha, cast.quadros[Math.floor(t / 2000) % 3], c.castelo[0] - cast.ancora[0], c.castelo[1] - cast.ancora[1]);
      var pe = A.pecas['plot-empty'];
      c.terrenos.forEach(function (tr) { rec(ctx, pe.folha, pe.quadros[quadroEm(pe.animacoes['plot' + tr.n], t)], tr.x - pe.ancora[0], tr.estrada[0] + 8 - pe.ancora[1]); });
    });
  }

  function montar() {
    el('p', 'nota', 'Everything below is drawn from atlas.json + the sprite sheets in this folder, at x3, nearest-neighbour.');
    var g = secao('Troops', 'Idle and walk show the 3 face variants. Allies face right in the sheet.');
    Object.keys(A.pecas).forEach(function (id) { if (A.pecas[id].tipo === 'tropa') caixaPeca(id, g); });
    g = secao('Invaders (8) and bosses (4)', 'They face left in the sheet; the screen mirrors when the road goes the other way.');
    Object.keys(A.pecas).forEach(function (id) { if (A.pecas[id].tipo === 'invasor' || A.pecas[id].tipo === 'chefe') caixaPeca(id, g); });
    g = secao('Buildings (level 1, 3, 5) and kingdom');
    Object.keys(A.pecas).forEach(function (id) { if (A.pecas[id].tipo === 'construcao' || A.pecas[id].tipo === 'reino') caixaPeca(id, g); });
    g = secao('Magic on the road and effects');
    Object.keys(A.pecas).forEach(function (id) { if (A.pecas[id].tipo === 'magia' || A.pecas[id].tipo === 'efeito') caixaPeca(id, g); });

    g = secao('Cards', 'Frame = rarity, ribbon = family, seal = type. Pins and the strength text are drawn by the screen (positions in atlas.cartas).');
    var C = A.cartas, T = C.todas || C.piloto, ids = Object.keys(T), brilho = A.pecas['rarity-shine'], aura = A.pecas['card-glow'], COL = 10;
    var LIN = Math.ceil(ids.length / COL), PX = C.tamanho[0] + 8, PY = C.tamanho[1] + 16;
    var ctx = tela(PX * COL + 6, PY * (LIN + 1) + 6, el('div', 'peca', null, g), 2);
    tarefas.push(function (t) {
      ctx.clearRect(0, 0, 9999, 9999);
      ids.forEach(function (id, i) {
        var x = 6 + (i % COL) * PX, y = 14 + Math.floor(i / COL) * PY, nivel = 1 + Math.floor(t / 900 + i) % 5, k, c = T[id], rara = ['Rare', 'Epic', 'Legendary'].indexOf(c.raridade) >= 0;
        if (rara && aura) rec(ctx, aura.folha, aura.quadros[Math.floor(t / 140) % 4], x - aura.ancora[0], y - aura.ancora[1]);
        rec(ctx, c.folha || C.folha, c.quadro, x, y);
        if (rara && (t + i * 400) % 2500 < 360) { ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, C.tamanho[0] - 2, C.tamanho[1] - 2); ctx.clip(); ctx.globalAlpha = 0.55;
          rec(ctx, brilho.folha, brilho.quadros[Math.min(5, Math.floor(((t + i * 400) % 2500) / 60))], x, y); ctx.restore(); }
        for (k = 0; k < nivel; k++) rec(ctx, 'interface', A.icones.quadros['pin-on'], x + C.pinos[k][0], y + C.pinos[k][1]);
        if (i === 0) rec(ctx, 'interface', A.interface.pecas['level-up'].quadros[Math.floor(t / 120) % 4], x + 5, y - 9);
      });
      Object.keys(C.molduras).forEach(function (r, j) {
        var x = 6 + (2 + j) * PX, y = 14 + LIN * PY;
        rec(ctx, C.folha, C.molduras[r], x, y);
        if (j >= 2) { ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, C.tamanho[0] - 2, C.tamanho[1] - 2); ctx.clip(); ctx.globalAlpha = 0.6;
          rec(ctx, brilho.folha, brilho.quadros[Math.min(5, Math.floor((t % 2500) / 60))], x, y); ctx.restore(); }
      });
      rec(ctx, C.folha, C.costas, 6 + 7 * PX, 14 + LIN * PY);
    });

    g = secao('Interface, icons and pixel fonts');
    var cx = el('div', 'peca', null, g), ui = tela(300, 150, cx), x = 2;
    Object.keys(A.icones.quadros).forEach(function (n) { rec(ui, 'interface', A.icones.quadros[n], x, 2); x += A.icones.quadros[n][2] + 2; });
    var P = A.interface.pecas; x = 2;
    ['button-green', 'button-red', 'button-plum'].forEach(function (n) { rec(ui, 'interface', P[n].solto, x, 18); rec(ui, 'interface', P[n].apertado, x + 26, 18); x += 54; });
    rec(ui, 'interface', P['button-wide-green'].solto, x, 18); texto(ui, 'PLAY AGAIN', x + 18, 25, 'reino');
    x = 2; Object.keys(P.loot).forEach(function (n) { rec(ui, 'interface', P.loot[n], x, 48); x += 46; });
    rec(ui, 'interface', P['label-to-go'], 146, 48); rec(ui, 'interface', P['label-boss'], 190, 48); rec(ui, 'interface', P['label-new'], 220, 48);
    texto(ui, 'ROUND 5 - VICTORY!', 146, 64); texto(ui, '12  7  30', 146, 78); texto(ui, '40!', 206, 78, 'reino-ouro');
    texto(ui, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 2, 98, 'reino'); texto(ui, '0123456789 .,!?:-+/%', 2, 108, 'reino');
    texto(ui, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789', 2, 122, 'mini-contorno'); texto(ui, 'LAST ONE STANDING! BRAMBLE SNARE', 2, 132, 'mini');

    if (A.logo) {
      g = secao('Logo, game icon, achievements, relics, leagues, run end, damage numbers', 'All by code, on the sheet "extras". The logo shine sweeps every 3 s.');
      var bx = el('div', 'peca', null, g), ex = tela(420, 300, bx, 2), L = A.logo, Q = A.conquistas, Rl = A.reliquias, F = A.fim;
      tarefas.push(function (t) {
        ex.clearRect(0, 0, 420, 300);
        var bi = Math.floor((t % 3000) / 60), y = 2, xx = 2;
        rec(ex, 'extras', bi < 6 ? L.large.brilho.quadros[bi] : L.large.quadro, 2, y); rec(ex, 'extras', bi < 6 ? L.medium.brilho.quadros[bi] : L.medium.quadro, 200, y + 4); rec(ex, 'extras', L.small.quadro, 330, y + 8);
        y = 40; Object.keys(Q.icones).forEach(function (n, i) {
          rec(ex, 'extras', Q.prontas[n], 2 + i * 22, y);
          rec(ex, 'extras', Q.molduras[i % 2 ? 'unlocked' : 'locked'], 2 + i * 22, y + 24); rec(ex, 'extras', Q.icones[n], 2 + i * 22 + Q.icone_em[0], y + 24 + Q.icone_em[1]);
        });
        y = 92; Object.keys(Rl.quadros).forEach(function (n, i) { rec(ex, 'extras', Rl.quadros[n], 2 + i * 16, y); });
        Object.keys(A.ligas.emblemas).forEach(function (n) { var l = A.ligas.emblemas[n]; rec(ex, 'extras', l.quadro, 140 + l.ordem * 30, y - 8); });
        rec(ex, 'extras', F.selo_chefe.quadros[quadroEm({ quadros: [0, 1, 2, 3], ms: F.selo_chefe.ms, loop: true }, t)], 330, y - 6);
        y = 128; rec(ex, 'extras', F.pergaminho.quadro, 2, y + 10); rec(ex, 'extras', F.faixa_recorde.quadros[Math.floor(t / 120) % 4], 18, y);
        var a = F.pergaminho.area_texto; texto(ex, 'ROUND', 2 + a[0] + 36, y + 10 + a[1] + 6, 'reino'); texto(ex, '18', 2 + a[0] + 40, y + 10 + a[1] + 18, 'dano-g-ouro');
        texto(ex, 'SCORE  1842', 2 + a[0] + 8, y + 10 + a[1] + 42, 'reino'); texto(ex, 'BEST   1790', 2 + a[0] + 8, y + 10 + a[1] + 54, 'reino');
        xx = 160; texto(ex, '7', xx, y + 20, A.dano.pequeno.normal); texto(ex, '12!', xx + 16, y + 20, A.dano.pequeno.critico);
        texto(ex, '24', xx, y + 34, A.dano.medio.normal); texto(ex, '48!', xx + 24, y + 34, A.dano.medio.critico); texto(ex, '+22', xx + 60, y + 34, A.dano.medio.cura);
        texto(ex, '95', xx, y + 52, A.dano.grande.normal); texto(ex, '140!', xx + 40, y + 52, A.dano.grande.critico);
      });
      var ic = el('div', 'peca', null, g); el('div', 'titulo', 'favicon-32.png / icone-180.png', ic);
      ['favicon-32.png', 'icone-180.png'].forEach(function (a) { var im = el('img', 'px', null, ic); im.src = a; im.style.width = (a.indexOf('32') > 0 ? 64 : 180) + 'px'; im.style.margin = '4px'; });
    }

    g = secao('Scenery: parallax layers by device and hour', 'PC pans to show the parallax; clouds drift; the castle cycles its 3 damage states; the 6 empty plots pulse.');
    ['pc', 'celular'].forEach(function (ap) { Object.keys(A.cenarios[ap].horas).forEach(function (h) { cenario(ap, h, g); }); });

    function passo(t) { for (var i = 0; i < tarefas.length; i++) tarefas[i](t); window.requestAnimationFrame(passo); }
    window.requestAnimationFrame(passo);
  }
  document.getElementById('fundo').addEventListener('change', function (e) { document.body.className = e.target.value; });
  carregar(montar);
})();
