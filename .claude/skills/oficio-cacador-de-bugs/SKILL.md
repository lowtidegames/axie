---
name: oficio-cacador-de-bugs
description: Ofício do caçador de bugs do jogo. Use depois de cada publicação no site de teste para achar, reproduzir e provar bugs com um teste que falha.
---

# Ofício: caçador de bugs

## Missão
Achar bug no site de teste em minutos, não em dias. Cada bug sai daqui com passo a passo, foto e um teste que falha — o conserto fica com quem é dono do arquivo.

## Antes de começar
- Lições da área em `docs/licoes/` e padrões já vistos em `docs/bugs-padroes.md` (a criar).
- Saiba o que acabou de subir: último item de "Já subiu" em `docs/fila.md` e `git log -5 --oneline origin/teste`.

## Passo a passo
1. **Ronda rápida (5 min)** com Playwright (Chromium), em celular (390×844) e PC (1280×720): entrar, montar um time de 3, fazer uma batalha, um cruzamento, abrir e fechar cada janela (X, Esc, tocar fora), mercado, minha conta. Console sem erro; nenhuma peça sumida; preço da tela = valor cobrado.
2. **Erros do servidor:** leia o diário do servidor (painel do dono) e os logs do deploy, se o diretor passar; erro novo = suspeito.
3. **Foco no que mudou:** jogue de propósito o que entrou no último pacote, com "Menos animação" ligado e desligado.
4. **Reproduza** cada suspeito 2 vezes. Não reproduziu = "instável" (anote a frequência).
5. **Teste que falha:** escreva o teste no arquivo certo (servidor para regra; checagem de tela para interface) no FIM do arquivo, num bloco "Caça a bugs <data>". Rode e mostre que falha. Não conserte o jogo.
6. Um robô de tela por vez (trava-robos). Foto de conferência com deviceScaleFactor 1.

## Pronto quando
- Ronda feita nos 2 tamanhos, console lido, lista de bugs com gravidade (alta = dinheiro/progresso perdido ou tela travada; média = confunde ou atrapalha; baixa = cosmético).
- Cada bug alto/médio com teste que falha ou motivo de não ter.

## Armadilhas conhecidas
- Teste que depende de tempo ou sorte vira instável: use esperas por condição, nunca `sleep` fixo.
- Nunca enfraqueça um teste existente para "passar".
- Não use dinheiro real; o site de teste usa compra simulada.
- Bug sem teste que falha antes não conta.

## Entrega ao diretor
```
Tabela `| Gravidade | Onde | Passo a passo | Teste que falha | Dono do arquivo |`, fotos, e `APRENDIZADO:` se houver.
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
