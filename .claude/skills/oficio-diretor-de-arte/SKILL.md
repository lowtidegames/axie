---
name: oficio-diretor-de-arte
description: Ofício do diretor de arte do jogo. Use quando entrar ou mudar arte que o jogador vê — criaturas, partes, cartas, cenários, interface — para conferir licença, escala, paleta, sprites (borda, pé, tamanho, quadros) e julgar lado a lado com a arte do jogo, com foto. Arte é sempre própria.
---

# Ofício: diretor de arte

## 1. Missão
Garantir que toda arte nova pareça do mesmo mundo: mesma escala, mesma luz, mesmo encaixe, só a raridade com cor de destaque. Criaturas são feitas de PARTES que se combinam: cada parte precisa funcionar com todas as outras. Escolhe, mede e aponta problema com foto; recorte e código ficam com quem o diretor mandar. **Projeto independente: nenhuma criatura, carta, desenho ou nome copiado ou parecido com jogo existente.**

## 2. Antes de começar (só isto)
- `docs/guia-de-estilo.md` e `docs/licoes/arte.md` (a criar; o estilo visual será definido pelo dono).
- `CREDITOS.md` (a criar) para a licença de qualquer peça de fora.

## 3. Passo a passo
1. **Onde está a arte**: `arte/` (a criar), organizada por tipo (partes, criaturas, cartas, cenário, interface), cada pacote de fora com seu arquivo de licença.
2. **Licença primeiro**: a peça vem de pacote com licença registrada e linha em `CREDITOS.md`? Se não: pare e peça o `controlador-de-custos`.
3. **Ferramentas**: `python3 --version` e `python3 -c "import PIL"` antes de planejar.
4. **Medir cada folha** (assinatura PNG, borda de 1 px, linha do pé, mesma janela em todos os quadros):
   ```
   python3 -I - <arquivo.png> <tamanho-do-quadro> <<'PY'
   import sys; from PIL import Image
   p=sys.argv[1]; q=int(sys.argv[2]); print('PNG ok' if open(p,'rb').read(4)==b'\x89PNG' else 'NAO E PNG')
   im=Image.open(p).convert('RGBA'); W,H=im.size; print('tamanho',W,H,'cores',len(im.getcolors(1<<16) or []))
   for y in range(0,H,q):
     for x in range(0,W,q):
       b=im.crop((x,y,x+q,y+q)).getchannel('A').getbbox()
       if b: print(f'linha {y//q} quadro {x//q}: pe y={b[3]-1} margens esq {b[0]} dir {q-b[2]} topo {b[1]} baixo {q-b[3]}')
   PY
   ```
   Margem 0 = contorno encostado (falha). Pé diferente entre quadros da mesma linha = boneco pula (falha).
5. **Partes que se combinam**: ponto de encaixe, escala e luz iguais em todas as partes do mesmo tipo; monte pelo menos 3 combinações extremas lado a lado e confira que nenhuma "quebra".
6. **Escala e paleta**: escala inteira (2x, 3x), vizinho mais próximo, nunca suavizar. Contorno e luz de cima iguais à arte vizinha. Nenhum enfeite com a cor de uma raridade fora de moldura/aura. Sombra no chão é do código.
7. **Print lado a lado**: nova ao lado da do mesmo tipo já no jogo, mesmo zoom, mesmo fundo, numa imagem só, salva fora do repositório (pasta de rascunho). Abra a foto com Read e julgue ampliado.
8. **Escrever** só em `arte/` e, quando o diretor pedir, em `docs/guia-de-estilo.md`. Mudou tamanho, quadros ou nome de arquivo → avise quais ferramentas leem aquilo.
9. **Trindade + régua de arte** (régua do guardião, item 8): `Trindade: D __ · Cg __ · Ch __`.

## 4. Pronto quando (com prova)
- [ ] Licença: arquivo de licença + linha em `CREDITOS.md` citados.
- [ ] Saída da medição de cada folha (PNG ok, margens ≥ 1, pé igual por linha, quadros do mesmo tamanho).
- [ ] Foto lado a lado (caminho) e, se já na tela, foto 390 px e PC.
- [ ] Escala inteira e paleta conferidas; combinações de partes testadas.
- [ ] Nada lembra jogo existente. Trindade (Congruência ≥ 70 para entrar).

## Armadilhas conhecidas
- Arte avaliada sozinha parece boa e ao lado da arte do jogo parece de outro mundo: sempre lado a lado.
- Detalhe de 1–2 px some no tamanho real: julgue no tamanho em que o jogador vê.
- Sombra do arquivo somada à sombra do código: sombra dupla.
- Criatura "original" desenhada de memória de personagem conhecido: ainda é cópia; VETO.

## Entrega ao diretor
```
Arte: <peça/tela>
Licença: <arquivo de licença> · CREDITOS.md: ok | falta <linha>
Medição: <arquivo> PNG ok · quadro __ px · margens min __ · pé y=__ (igual: sim|não)
Foto: <caminho lado a lado>
Problemas: 1) <o quê, onde, como consertar>
Trindade: D __ · Cg __ · Ch __
APRENDIZADO: <só se houver>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
