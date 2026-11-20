# Status

_Atualizado: 20/11/2026 11:30 BRT_

Projeto atual: Keepmile (nome provisório), jogo original de montar reino com cartas e batalha automática. Nada publicado: só o repositório (`main`).

## Pronto
- Motor `shared/reino/`, tela `public/reino/`, servidor `server/reino/` (banco v8).
- Som da tela nova: 73 efeitos + 4 ambientes (R35). Ninguém ouviu ainda.
- Medidor de profundidade `tools/medir-reino.mjs` (R36, R40).
- Números novos: 1º chefe 320, 4 cartas reequilibradas (R37).
- Chefe destacado e números grandes no celular (R38).
- Vitória e 30 conquistas, regra única em `shared/reino/conquistas.js`, segurança GO (R39).
- Aviso de conquista, festa, gancho do degrau, textos do guardião (R41).
- Baterias verdes antes do R42: `npm test` 418; reino.e2e 1019; reino-servidor 377; reino-movimento 189; reino-som 149.
- Notas: diversão 89 (conferência 5); guardião 80, aprovado sem veto (rodada 4).
- R42 no `main` local, SEM envio, esperando baterias: vitória na rodada 15, Encore! na 17, último degrau 300.

## Decisões do dono
- 19/11 18:30: autonomia total; o diretor decide e registra, sem perguntar.
- 19/11 23:19: régua de movimento e direção de arte.
- Resto em `docs/decisions.md` (a mais nova em cima).
- Abertas para o dono (ver "Abertas" no `docs/decisions.md`): conta perdida com 30 dias sem entrar; piso de pontos da liga mais alta; trava-economia não vigia `shared/reino/config.js`; ouvir os sons em `public/reino/sons.html`; novo teto do PixelLab; nome do jogo; advogado antes de dinheiro; `REINO_SEGREDO` antes do lançamento.

## Falta para lançar
- Achar a causa da conferência D8 instável (reino.e2e, fim com recorde, r17) e enviar o R42.
- Cartas mortas (Market Stall) e rodadas sem decisão no fim da partida.
- Novato atento não melhora com o álbum (6–7 rodadas vencidas contra 16 do bom jogador); medir o jogador médio real.
- Vigiar Sir Dent (40,5%).
- 18 medalhas novas com ícone genérico; fogos da festa pequenos; meta "HOLD TO ROUND N" apertada no celular.
- Atualizar `docs/reino/biblia.md` e `docs/reino/som.md`; exercitar os sons do modo servidor ao vivo.
- Créditos: ElevenLabs 1.806 de 5.000; PixelLab 147 de 150 (arte nova só por código).

## Depois do lançamento
- (a preencher)
