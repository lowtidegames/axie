---
name: oficio-dev-tela
description: Ofício do dev-tela do jogo. Use ao criar ou ajustar a TELA (HTML, JS puro, CSS, canvas, janelas, animações, celular) e os testes de tela. Confere com foto e nota da trindade antes de entregar.
---

# Ofício: dev-tela

## 1. Missão
Mostrar com clareza e festa o que o servidor decidiu, no PC e no celular, sem nada cortado, tremido ou mentiroso. A tela nunca decide moedas, sorteios nem resultado de batalha: chama a API e mostra a resposta.

## 2. Antes de começar
- Lições em `docs/licoes/` (a criar): interface; se mexer em teste de tela, testes; arte e som quando tocar.
- Regras visuais: `docs/guia-de-estilo.md` (a criar: tokens de cor no `:root`, "Menos animação", teto de partículas, flash no máximo 3 por segundo); diversão: `docs/kit-diversao.md`.
- Número mostrado vem do servidor ou da MESMA função compartilhada; nomes só da lista oficial.
- Não toca servidor, carteira nem o arquivo de configuração (salvo ordem do diretor).
- Antes de criar classe ou atributo CSS: `grep -rn "<nome>"` (o nome pode já existir).

## 3. Passo a passo
1. Leia o pedido pelo EFEITO. Meça o espaço real antes de desenhar (`getBoundingClientRect`), em 390 px e no PC.
2. Faça a mudança. Prefixo de classe único por parte; peça compartilhada mora num arquivo só.
3. Teste: acrescente a conferência no arquivo de checagens da parte e, se for tela nova, na matriz de aparelhos (a criar). O robô espera estado certo com prazo, nunca tempo fixo; ao estourar, mostra o erro do console.
4. Rode a tela UMA vez pelo script npm de teste de tela (a criar; passa pela `trava-robos`: um robô por vez; nunca o arquivo de teste de tela direto). Se outro robô estiver rodando, espere (`node tools/trava-robos.mjs status`); não force.
5. Foto de conferência: abra as fotos geradas da parte mudada (PC e celular). Para uma foto extra: Playwright, `newContext({ viewport, isMobile, hasTouch, deviceScaleFactor: 1 })`, servidor em memória em modo teste, porta própria.
6. Confira "Menos animação" (`localStorage menos_animacao = '1'`): sem tremida nem flash, desenho sem relógio (quadro fixo), brilho parado.
7. Animação CSS nova: confira `getComputedStyle(el).animationName` (atalho com dois tempos é ignorado sem erro).
8. Dê a nota da trindade da parte mudada: `Trindade: D · Cg · Ch`. Abaixo de 70: ajuste antes de entregar.

## 4. Pronto quando
- [ ] teste de tela verde (saída sem "FALHA:" e sem erro de console);
- [ ] foto conferida em 390 px e no PC (caminho de cada uma), nada cortado, sobreposto ou com "...";
- [ ] janela nova fecha pelos 4 jeitos (X, Esc, ícone, clicar fora) no PC e no celular;
- [ ] "Menos animação" conferida; partículas abaixo do teto; flash no máximo 3 por segundo;
- [ ] número da tela = número do servidor; só a raridade tem cor de destaque;
- [ ] `Trindade: D ≥ 70 · Cg ≥ 70 · Ch ≥ 70`.

## Armadilhas conhecidas
- Teste que simula o estado do app na mão: depois do login o app troca o estado; espere ou redesenhe na mesma chamada.
- Teste de sorteio olhando "o que estiver na tela": espere o título certo.
- Partes de criatura que não encaixam em todas as combinações: teste com pelo menos 3 combinações extremas.
- Foto com `deviceScaleFactor` diferente de 1 engana o tamanho real.

## Entrega ao diretor
```
O que mudou: (até 3 linhas)
Arquivos: caminho exato de cada um
Prova: "teste de tela: verde" + fotos conferidas (caminho de cada)
Trindade: D __ · Cg __ · Ch __
Riscos: (ex.: mexe em texto de dinheiro? número da tela?)
APRENDIZADO: (só se houver algo novo que vale virar regra)
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
