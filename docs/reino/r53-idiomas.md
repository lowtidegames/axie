# R53 — o jogo em 12 idiomas (desenho do arquiteto, 20/11/2026)

Ordem do dono: `docs/decisions.md`, 20/11/2026 16:02 (confirmada 16:15: "segue idiomas"). Idiomas: pt-BR, en (origem), es, fr, de, it, ru, tr, id, vi, fil, th.

**O que muda:** o jogo abre na língua do aparelho, ou na escolhida em Ajustes, com a mesma letra em pixel. Vietnamita e tailandês usam a letra do aparelho. O servidor não muda.

## Onde está o texto hoje (estimado)
- `public/reino/js/textos.js:7-140`: ~330 chaves, ~120 com número ou variável; plural à mão em inglês.
- `shared/reino/config.js`: nome e texto de 36 cartas, 8 invasores, 4 chefes, 8 relíquias, 4 famílias, 4 espólios; 5 raridades, 18 legendas, 6 ligas. `shared/reino/conquistas.js`: 30 nomes.
- Soltos: `batalha-tela.js:175` ("FURY!"), `interface.js:537` ("MAG"), `index.html:2,7`.
- Só funcionam em inglês: `telas.js:130` (`.replace('Next card: ')`), `textos.js:46` (`comUnidade`), `textos.js:123,127` (`split(' the ')`).
- Servidor manda só códigos de erro e ids: não precisa saber o idioma.
- Letra: todo texto passa por `arte.js:221-240`. Duas fontes (reino 5×7, mini 3×5), só maiúsculas sem acento (`arte-codigo.js:327-351`). Letra que falta vira espaço sem aviso (`arte.js:218-219`). `toUpperCase` erra no turco. HTML usa a monoespaçada do sistema.
- Largura: `quebrar` existe duas vezes (`interface.js:213`, `telas.js:25`), só quebra por espaço.
- Testes: ~70 frases em inglês nos e2e; o navegador de teste abre em inglês, então nada muda.

## Decisões (do diretor, por delegação)
- **Letra:** letras em pixel desenhadas por nós para latinos e cirílico (acentos compostos sobre a letra-base; ¿ ¡ « »; cirílicas); letra do aparelho só em vietnamita e tailandês. Frase com letra sem desenho vai inteira para a letra do aparelho. Nenhuma fonte de fora.
- **Estrutura:** um arquivo por idioma em `public/reino/js/idiomas/<codigo>.js`, mesma árvore de `T`; `js/idioma.js` carrega só o escolhido e sobrepõe ao inglês antes de o jogo abrir. Textos do config vêm traduzidos no pacote do idioma, com o número lido do config (`config.js` não muda). Plural, números e datas por `Intl`.
- **Escolha:** `?idioma=` → guardado em `keepmile_idioma_v1` → idioma do navegador → inglês. Seletor em Ajustes, cada idioma com o nome na própria língua. Trocar recarrega a página.
- **Nomes próprios** (cartas, criaturas, chefes, conquistas, nome do jogo): ficam em inglês (ASSUMPTION; o dono pode mudar). Palavras comuns (raridade, tipo, legendas, espólio, grupos) são traduzidas.
- **Qualidade:** glossário em `docs/reino/glossario.md` com termos e limites (legenda até 6 letras, botão até 8); teste do servidor (mesmas chaves, mesmas variáveis, mesmos números, todas as letras com desenho); teste de tela por idioma (nada passa da caixa; fotos); retradução para o inglês por outro redator.

## Tarefas
1. Letra (`js/letras.js` novo, `arte-codigo.js`, `arte.js`): glifos, maiúscula por idioma, troca reino→mini quando não cabe, quebra única, registro do que falta ou estoura.
2. Glossário (redator; o diretor grava).
3. Base (`js/idioma.js` novo, `textos.js`, `app.js`, `index.html`): inglês idêntico ao de hoje; `?idioma=` carrega. Espera a revanche e a tarefa 1.
4. Telas (`interface.js`, `telas.js` com o seletor, `batalha-tela.js`, `fim.js`): largura em cada caixa.
5. Traduções (`idiomas/pt-BR.js`, `idiomas/es.js`; depois fr, de, it, tr, id, fil; ru; vi, th).
6. Testes (`tests/servidor/reino-idiomas.test.js`, `tests/tela/reino-idiomas.e2e.mjs`, `teste.js`).

## Riscos
Apelido continua só com letras sem acento (mexer é login: decisão do dono). Ninguém nativo revisa as traduções.
