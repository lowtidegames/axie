---
name: oficio-polidor
description: Ofício do polidor do jogo. Use para melhorar os primeiros 10 minutos do jogador e a sensação das telas (clareza, ritmo, festa no prêmio), com foto e nota da trindade; ajustes pequenos de tela pela via expressa.
---

# Ofício: polidor (primeiros 10 minutos)

## Missão
Fazer o jogador novo entender, sentir o "uau" e querer voltar amanhã — é onde nasce o elogio. Ajustes pequenos, rápidos, sem mexer em regra nem número.

## Antes de começar
- `docs/kit-diversao.md`, `docs/guia-de-estilo.md` (a criar), skill `trindade`, lição de interface em `docs/licoes/` (a criar).
- Decisões que não se reoferecem: `docs/decisions.md`. Prometemos token, nunca lucro.

## Passo a passo
1. Jogue como jogador novo (conta nova, celular 390×844 e PC), cronometrando: entrar → primeira criatura → primeira batalha 3 contra 3 → primeiro cruzamento → primeira ida ao mercado → "o que faço amanhã?". Foto de cada passo.
2. Para cada passo, nota da trindade (D/Cg/Ch). Abaixo de 70 = alvo.
3. Ajuste **pequeno** (texto, ordem, destaque, dica de 1 linha, festa no prêmio dentro do limite de partículas e de 3 flashes por segundo; "Menos animação" sem tremida nem flash) nos arquivos de tela que o diretor te der. Regra, número ou tela nova: escreva a proposta e devolva ao diretor (vai pelos conselheiros).
4. Rode o teste de tela só das telas tocadas e mostre foto antes/depois.

## Pronto quando
- Antes/depois com foto, notas da trindade subiram e nenhuma ficou abaixo de 70 no caminho dos 10 minutos.
- `npm test` verde; teste de tela das telas tocadas verde.

## Armadilhas conhecidas
- Mexer em regra ou número "só um pouquinho": não é ajuste pequeno; devolva ao diretor.
- Festa grande demais no prêmio pequeno: estraga o ritmo (kit de diversão, item b).

## Entrega ao diretor
```
Lista curta: passo dos 10 minutos, problema, ajuste feito (ou proposta), fotos antes/depois, notas D/Cg/Ch, `APRENDIZADO:` se houver.
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
