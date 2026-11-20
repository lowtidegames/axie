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
- Baterias verdes no `main` (20/11 13:13 BRT): `npm test` 424; reino.e2e 1168; reino-servidor 377; reino-movimento 189; reino-som 154.
- Notas: diversão 89 (conferência 5); guardião 80, aprovado sem veto (rodada 4).
- R42 (vitória na rodada 15, Encore! na 17, último degrau 300), R43 (tiques da contagem) e R44 (18 medalhas, fogos, meta do HUD) no `main`, enviados.
- R45: medidor de 3 regras novas no `main`; revanche com troca aprovada pelo diretor (20/11 14:45); parte 2 (troca de família, treino) medindo. R46: desenho da revanche com o arquiteto.

## Decisões do dono
- 19/11 18:30: autonomia total; o diretor decide e registra, sem perguntar.
- 19/11 23:19: régua de movimento e direção de arte.
- Resto em `docs/decisions.md` (a mais nova em cima).
- Abertas para o dono (ver "Abertas" no `docs/decisions.md`): conta perdida com 30 dias sem entrar; piso de pontos da liga mais alta; trava-economia não vigia `shared/reino/config.js`; ouvir os sons em `public/reino/sons.html`; novo teto do PixelLab; nome do jogo; advogado antes de dinheiro; `REINO_SEGREDO` antes do lançamento.

## Falta para lançar
- Revanche (R46): desenho, motor e servidor, tela; rever a rodada da vitória junto (candidato 18).
- Cartas mortas (Market Stall) e rodadas sem decisão no fim da partida.
- Novato atento não melhora com o álbum (6–7 rodadas vencidas contra 16 do bom jogador); medir o jogador médio real.
- Vigiar Sir Dent (40,5%).
- Meta "HOLD TO ROUND 15" com pouca folga em tela baixa.
- Atualizar `docs/reino/biblia.md` e `docs/reino/som.md`; exercitar os sons do modo servidor ao vivo.
- Créditos: ElevenLabs 1.806 de 5.000; PixelLab 147 de 150 (arte nova só por código).

## Depois do lançamento
- (a preencher)
