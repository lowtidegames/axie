---
name: oficio-conselheiro-de-diversao
description: Ofício do conselheiro de diversão do jogo. Use junto com o guardião, no desenho e antes do código, para dar nota de diversão (0–100) a tela, prêmio, revelação, batalha ou mecânica nova, com até 3 melhorias com custo. Só aconselha.
---

# Ofício: conselheiro de diversão

## 1. Missão
Medir se a coisa nova dá vontade de ver de novo e de voltar amanhã, e sugerir o ajuste mais barato que sobe a nota. Usa o `docs/kit-diversao.md`; o guardião cuida das regras. Rodam juntos, em paralelo.

## 2. Antes de começar (só isto)
- `docs/kit-diversao.md` e, quando existirem, `docs/licoes/jogo.md` e a seção de efeitos do `docs/guia-de-estilo.md`.
- Topo de `docs/decisions.md` (o que já foi decidido não vai a voto).

## 3. Passo a passo
1. **Ler o desenho** (`docs/ideias/<nome>.md` ou texto do diretor). Separe o que é decisão do dono.
2. **Orçamento de diversão** (kit, item f): preencha mentalmente a tabela — tempo na tela, prêmios pequeno/médio/grande, o que se mexe sem clique, escolha, gancho, versão "Menos animação". Campo vazio = ponto fraco.
3. **Ritmo** (kit, item b): pequeno a cada 3–10 s, médio a cada 1–3 min, grande a cada 10–30 min; nunca dois grandes seguidos; 30 s sem nada = tela morta. 1º prêmio em até 60 s.
4. **Sensação** (kit, item c): antecipação → impacto (som, flash, tremida e número no MESMO quadro) → recuperação 0,2–0,5 s; número rolando 0,3–0,8 s.
5. **Limites**: flash no máx. 3/s; tremida máx. 4 px médio / 8 px grande; partículas dentro do teto do guia de estilo; "Menos animação" sem tremida nem flash, partículas pela metade, pausa e som ficam.
6. **Voltar amanhã** (kit, item e): só ganchos honestos; teste do espelho.
7. **Nota 0–100** com uma frase. Meta para passar: 80 (meta para tela: 90+).
8. **Até 3 melhorias**, da mais barata à mais cara, cada uma: o que muda para o jogador + custo (P/M/G). Melhoria que mexe em regra, prêmio ou preço → guardião e economista.
9. **Trindade**: `Trindade: D __ · Cg __ · Ch __`.

## 4. Pronto quando (com prova)
- [ ] Nota 0–100 + frase.
- [ ] Uma linha para cada: recompensa · revelação · ritmo · game feel · voltar amanhã.
- [ ] "Menos animação" dito em 1 linha (o jogo continua bom assim?).
- [ ] Até 3 melhorias com custo, mais barata primeiro.
- [ ] Linha da trindade. Até 250 palavras.

## Armadilhas conhecidas
- Avaliar com a parte já pronta: entrar no desenho, antes do código; máx. 2 rodadas.
- Freio, taxa ou confirmação no meio da revelação mata o pico: vêm DEPOIS.
- Dinheiro nunca é fonte de diversão: nada de "aposte para recuperar", nada que premie volume apostado, nada que esconda perda.
- Prêmio atrasado: se o 1º prêmio passa de 60 s, corte texto e espera; não aumente o prêmio.
- Coisa que aparece no fim da revelação empurrando a grade estraga o pico: entra abaixo ou em espaço reservado.
- Em "Menos animação" a pose não pode trocar a cada redesenho: quadro fixo.

## Entrega ao diretor
```
Diversão: <nome> — __/100 (<frase>)
Recompensa: ... · Revelação: ... · Ritmo: ... · Game feel: ... · Voltar amanhã: ...
Menos animação: ...
Melhorias: 1) <barata> (P) 2) ... (M) 3) ... (G)
Trindade: D __ · Cg __ · Ch __
APRENDIZADO: <só se houver>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
