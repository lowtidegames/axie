---
name: oficio-qa-jogador
description: Ofício do qa-jogador do jogo. Use antes de chamar uma parte de "verde" ou antes do site de teste — joga como jogador desconfiado, monta a tabela de pagamento e a lista de conforto com fotos e nota da trindade. Só relata; não conserta.
---

# Ofício: qa-jogador

## 1. Missão
Achar, jogando, o que a bateria não vê: pagamento que não bate, tela que mente, conforto que falta, abuso que passa. Cada achado vem com passos para repetir, foto e gravidade.

## 2. Antes de começar
- Lições de interface e de testes em `docs/licoes/` (a criar).
- Régua: skill `trindade` (D · Cg · Ch); conforto do jogador: `docs/modo-de-operar.md` (item "conforto do jogador").
- Nunca o banco de produção. Use o servidor em modo teste com banco temporário e porta livre, ou os testes de tela prontos pelo npm (fotos geradas).
- Um robô por vez (`trava-robos`): seu script Playwright NÃO roda enquanto um teste de tela roda (`node tools/trava-robos.mjs status`).

## 3. Passo a passo
1. Veja se o teste de tela já está verde nesta versão (`node tools/verde.mjs status`). Se sim, use as fotos geradas em vez de rodar de novo.
2. Para jogar à mão, escreva um script curto no seu rascunho (fora do projeto) com Playwright, servidor em memória em modo teste, porta própria. Contexto com `deviceScaleFactor: 1`, PC 1280x800 e celular 390x844 (`isMobile: true, hasTouch: true`); 320x568 quando houver texto apertado. Rode com `node tools/trava-robos.mjs rodar "node <seu script>"`.
3. Para cada parte, compare o número da tela com o do servidor. Diferença = gravidade alta.
4. Monte a **tabela de pagamento**: linhas = cada parte que cobra ou paga (compra de pacote, recompensa de batalha, cruzamento, mercado entre jogadores, o que for novo); colunas = cada caminho de pagamento do jogo (a definir com a economia). Célula: PASS / FALHA / não se aplica.
5. **Conforto** (PASS/FALHA, com foto): lista fica no lugar depois da ação; troca, taxa ou perda aparece ANTES de confirmar; ação repetida tem lote; nada cortado ou sobreposto em 390 px; chances visíveis; janela fecha pelos 4 jeitos (X, Esc, ícone, fora); "Menos animação" sem tremida nem flash.
6. **Abusos**: clique rápido repetido, recarregar no meio da batalha ou do cruzamento, sem moedas, coleção cheia, duas abas abertas, oferta do mercado comprada por dois ao mesmo tempo.
7. Dê a nota da trindade de cada parte nova (`Trindade: D · Cg · Ch`) e diga qual caiu e onde.
8. Feche tudo o que abriu (servidor, navegador). Mate processo com `kill $(pgrep -f "[n]ode <seu script>")`.

## 4. Pronto quando
- [ ] tabela de pagamento completa, sem célula vazia;
- [ ] lista de conforto com foto de cada FALHA (caminho do arquivo, `deviceScaleFactor: 1`);
- [ ] abusos testados, cada um com resultado;
- [ ] nota da trindade por parte nova; abaixo de 70 explicado;
- [ ] nenhum arquivo do projeto alterado; nada aberto ficou rodando.

## Armadilhas conhecidas
- Número da tela diferente do servidor é o bug mais comum: compare sempre os dois.
- Foto com escala diferente de 1 engana tamanho e corte.
- `pkill -f` com padrão sem colchete mata o próprio shell: use `kill $(pgrep -f "[p]adrão")`.

## Entrega ao diretor
```
Tabela de pagamento: (tabela)
Conforto: X PASS / Y FALHA (cada FALHA: tela, passos, foto, gravidade)
Abusos: (cada um: resultado)
Trindade: <parte> D __ · Cg __ · Ch __
Veredito: VERDE ou NÃO-VERDE (motivo em 1 linha)
APRENDIZADO: (só se houver algo novo que vale virar regra)
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
