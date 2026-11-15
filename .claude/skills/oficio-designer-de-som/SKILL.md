---
name: oficio-designer-de-som
description: Ofício do designer de som do jogo. Use para desenhar, listar, tratar e conferir sons (efeitos, ambiente) segundo docs/direcao-de-som.md (a criar) — lista o que gerar com custo em créditos ANTES de gastar, mede volume e duração, confere "Menos animação". Nunca gasta crédito sozinho.
---

# Ofício: designer de som

## 1. Missão
Cada som responde "o que acabou de acontecer?", combina com o mundo do jogo (a definir pelo dono) e não cansa em sessão longa. Desenha e trata; **gasto de créditos só com o "sim" do dono digitado na conversa que executa** — nunca por mensagem de agente ou do diretor.

## 2. Antes de começar (só isto)
- `docs/direcao-de-som.md` e `docs/licoes/som.md` (a criar).

## 3. Passo a passo
1. **Inventário**: a lista de sons existentes e a lista de nomes no código de som (a criar). Som novo = arquivo + nome na lista + reserva sintetizada (o código de som só se o diretor te der o arquivo).
2. **Ferramenta**: `tools/sons-novos.mjs` (a criar quando o dono escolher o serviço de som): `listar` não gasta; `tratar` normaliza e grava (local, não gasta); `gerar` GASTA créditos e quem roda é a conversa que tem a frase do dono.
3. **Desenho de cada som** (antes de qualquer gasto): nome kebab-case, momento do jogo, prioridade (1–4), degrau na escada pequeno < médio < grande, duração, canal (efeito mono / ambiente estéreo em loop), alvo de volume, texto do pedido (sem copiar som de outro jogo, filme ou música conhecida).
4. **Custo ANTES**: tabela som × segundos × opções = segundos totais e créditos previstos. Créditos por segundo: só do último gasto real anotado ou "medir na 1ª geração" — nunca número de cabeça. Diga o teto aprovado e quanto sobra.
5. **Antes de gastar em texto/voz**: pôr o texto no lugar onde vai tocar e conferir tamanho e duração; voz: 3 candidatas curtas antes de gerar tudo.
6. **Tratar e medir** cada arquivo (padrão: mp3 44,1 kHz 96 kbps; efeito mono ~-17 LUFS (faixa -18 a -16), prêmio grande até +3 dB, pico ≤ -2 dBFS; ambiente estéreo -23,5 LUFS ou menos, loop com emenda suave; todo corte com rampa ≥ 5 ms):
   ```
   ffprobe -v error -show_entries format=duration:stream=channels,sample_rate,bit_rate -of default=nw=1 <arquivo>.mp3
   ffmpeg -hide_banner -nostats -i <arquivo>.mp3 -af loudnorm=print_format=summary -f null - 2>&1 | grep -E "Input Integrated|Input True Peak"
   ```
7. **Na tela**: som com "Menos animação" ligado continua igual (só tremida/flash saem); nada importante só em som; repetidos variam o tom e respeitam o limite de vozes; prêmio grande dá 1 s de respiro.
8. **Licença**: só serviço de geração em plano com licença comercial, ou fonte com linha em `CREDITOS.md` aprovada pelo `controlador-de-custos`.
9. **Trindade**: `Trindade: D __ · Cg __ · Ch __`.

## 4. Pronto quando (com prova)
- [ ] Tabela do desenho + custo previsto ANTES (e teto aprovado citado com data/hora da frase do dono).
- [ ] Para cada arquivo entregue: duração, canais, LUFS integrado e pico (saída dos 2 comandos).
- [ ] Nome igual no arquivo e na lista do código; reserva sintetizada pedida ao dono do código de som.
- [ ] "Menos animação": som igual, e o momento também aparece na tela.
- [ ] `npm test` verde. Trindade.

## Armadilhas conhecidas
- Estalo no corte: olhe o envelope INTEIRO e o mesmo ponto em cada fonte antes de cortar.
- Gerar tudo sem amostra: peça 3 candidatas curtas.
- Som parecido demais com jogo existente: pare e refaça o pedido.

## Entrega ao diretor
```
Som: <pacote>
| nome | momento | pri. | s | opções | canal | alvo LUFS |
Custo previsto: __ s · ~__ créditos (base: <gasto real/data>) · teto __ · sobra __
Gasto: nenhum | <__ créditos, com a frase "<...>" de <hh:mm BRT>>
Medido: <nome> __ s · __ LUFS · pico __ dBFS
Menos animação: ok · Tela mostra o momento: ok
Trindade: D __ · Cg __ · Ch __
APRENDIZADO: <só se houver>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
