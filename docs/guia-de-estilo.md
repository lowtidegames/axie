# Frayz — guia de estilo (interface, layout e arte)

Pedido do dono em 15/11/2026 00:25 BRT: **capricho máximo em interface, layout, som e arte**. Este guia é a régua. O som está em `docs/direcao-de-som.md`.
Quem escreve aqui: só o diretor. Quem desenha e programa a tela segue; se achar caminho melhor, avisa (`CAMINHO NOVO: ...`) antes.
Tudo é próprio: nenhuma arte, personagem, carta ou visual de jogo existente. Arte só por código (canvas/SVG/CSS); fontes só as daqui.

## 1. A ideia que amarra tudo: o ateliê da costureira-bruxa
- A luta acontece **em cima da mesa de costura** de uma bruxa, num sótão, à noite. Os bonecos têm um palmo de altura; o resto é gigante perto deles: carretel vira banco, alfineteiro vira morro, a tesoura é uma ameaça pendurada.
- **Cada peça da interface é um objeto do ateliê**, nunca um retângulo genérico:

| O que o jogador lê | Vira |
|---|---|
| Vida | fita métrica amarela que vai sendo cortada |
| Escudo | dedal com o número |
| Linha (energia) | 7 carretéis que se enchem de linha brilhante |
| Tempo do turno | um fio que queima da ponta até o nó |
| Tesoura (turno 9) | uma tesoura enorme pendurada no alto, descendo um pouco a cada turno |
| Roda dos tecidos | 6 retalhos presos num bastidor de bordado |
| Botões | retalhos costurados (pesponto na borda) |
| Lugares (Frente, Meio, Trás) | 3 círculos bordados no pano da mesa |
| Avisos | etiqueta de roupa presa com alfinete |
| Cartas | moldes de costura com moldura do tecido do tipo |
| Raridade | cor do pesponto (só a costura tem cor de raridade) |
| Replay | carretel de filme feito de linha |

- Regra de bolso: se um elemento novo não tem um objeto de ateliê por trás, ele ainda não está pronto.

## 2. Cores
Fundo sempre escuro e quente; a luz vem de uma vela (quente, de cima à esquerda) e da lua pela janela (fria, da direita).

| Papel | Cor | Uso |
|---|---|---|
| Noite funda | `#140C1F` | contorno dos desenhos, sombras (nunca preto puro) |
| Noite | `#1B1226` | fundo da página |
| Pano escuro | `#2A1B3D` | painéis |
| Pano claro | `#3A2752` | painel em destaque, cartão selecionável |
| Borda | `#5A4378` | bordas e divisórias |
| Linho | `#F2E6C9` | texto principal |
| Linho apagado | `#B9A98C` | texto secundário (mínimo 4,5:1 sobre o fundo) |
| Ouro de vela | `#FFC857` | números de valor, destaque, Lendária |
| Chama | `#FF9F1C` | crítico, alerta da Tesoura |
| Fio da maldição | `#FF4D8D` | ação principal, carta jogável, brilho da Linha |
| Vida | `#6FCF6B` | cura |
| Dano | `#FF5A5F` | dano, perigo |
| Escudo | `#6EC1FF` | escudo, véu |

Tecidos (cada um tem cor **e** padrão **e** ícone próprio, para quem não distingue cores):

| Tecido | Cor base | Padrão desenhado |
|---|---|---|
| Jeans | `#3F6FB5` | sarja em diagonal + rebite |
| Seda | `#D65DB1` | faixa de brilho deslizando |
| Lã | `#D9C9A3` | pontos de tricô em V |
| Feltro | `#5E9C76` | fosco salpicado |
| Tule | `#B9A7E8` | rede translúcida |
| Couro | `#8B5A2B` | poros e rachaduras + pesponto grosso |

Raridade (só no pesponto e na etiqueta): Comum `#E8D9B5` · Incomum `#7BD88F` · Rara `#5BB8FF` · Lendária `#FFC857` com brilho que corre devagar pela costura.

## 3. Letras
- Títulos, números grandes e botões: **Lilita One**. Texto: **Nunito** (600 e 800). As duas têm licença livre OFL-1.1; os arquivos ficam em `public/fontes/` com o texto da licença, e o crédito entra em `CREDITOS.md`. Reserva: `system-ui`.
- Tamanhos mínimos: texto 14 px no PC e 13 px no celular; texto de carta 13 px (no celular a carta na mão mostra só custo, desenho e nome — o texto aparece na carta ampliada); número de dano 28–64 px conforme o golpe.
- Números do jogo sempre com algarismos de largura fixa (`font-variant-numeric: tabular-nums`) para não dançar.
- Título de tela em caixa normal, nunca tudo em maiúsculas; etiquetas pequenas (FRENTE, MEIO, TRÁS) podem ser maiúsculas com espaçamento.

## 4. Medidas e toque
- Grade de 4 px. Espaços: 4, 8, 12, 16, 24, 32. Cantos: 10 px em painel, 14 px em cartão, 999 px em etiqueta.
- Alvo de toque: no mínimo 44×44 px. Nada importante a menos de 12 px da borda no celular; respeitar a área segura (`env(safe-area-inset-*)`).
- Dois formatos de referência: celular em pé 360×740 e PC 1280×720. Tem de ficar bom também em 390×844, 412×915, 768×1024 e 1920×1080 (a cena cresce; a mão nunca passa de 900 px de largura).
- Canvas com densidade de até 2× (nunca borrado, nunca mais que 2× para não pesar).

## 5. Os bonecos
O que está hoje: bonitos, mas duros — cabeça e tronco quadrados, braços retos, parecem robôs. Boneco de pano é **mole**.

**Forma**
- Tudo arredondado, encaroçado e torto: tronco de almofada (cai um pouco embaixo), membros que afinam e fazem curva, um ombro mais baixo, cabeça inclinada de 3° a 6°.
- Cabeça grande: 42% a 48% da altura do boneco. O rosto tem de ser lido com o boneco a 96 px de altura.
- Todos cabem na mesma caixa (largura até 0,72 da altura; fios soltos podem passar 8%). Nenhum boneco tapa o vizinho.
- Silhueta diferente por parte: olhando só o contorno preto dá para dizer qual cabeça, quais braços e quais pernas são.

**Traço e volume**
- Contorno `#140C1F`: 2,5 px na silhueta, 1,5 px por dentro (no desenho em escala 1).
- Pesponto: linha tracejada cor de linho, 1,5 px, traço 4 / espaço 3, levemente irregular, acompanhando a borda por dentro.
- Volume em 3 camadas sobre a textura: sombra no lado de baixo/direita (25%), luz quente em cima/esquerda (12%), filete frio de lua na borda direita (10%). Sombra de contato oval no pano.
- A textura do tecido tem escala fixa: nunca estica com o boneco.

**Rosto (a marca do jogo)**
- Olhos de botão **desiguais**: um grande e um pequeno, com linha cruzada nos furos e um brilho pequeno.
- Sobrancelha de linha grossa, sempre bravo. Boca conforme a cabeça (zíper, pontos, dentes de feltro).
- Expressões: parado (bravo), ataque (boca aberta, sobrancelha fechada), golpeado (olho pequeno salta e fica pendurado um instante), Último Fio (um olho pendurado pela linha, tremendo), caído (olhos em X costurado), vitória (sorriso torto).

**A maldição**
- Um fio brilhante cor `#FF4D8D` escapa da costura do peito de todo boneco e ondula. Quanto mais Linha o dono tem guardada, mais forte o brilho das costuras (só visual).
- Fiapos soltos nas juntas, balançando.

**Movimento (boneco montado em camadas: pernas, tronco, braços, cabeça, bordado, fios)**

| Momento | Como |
|---|---|
| Parado | respira (altura ±1,5% em 2,4 s), cabeça balança 1 px, fios ondulam; a cada 4–7 s um brilho passa num botão |
| Antes do golpe | encolhe 80–120 ms |
| Golpe | estica e avança 180 ms, volta com sobra |
| Golpe forte | o jogo para 60–90 ms no impacto |
| Apanhou | amassa, recua, treme 120 ms (até 6 px) |
| Crítico | a costura estoura: 30–40 flocos de enchimento |
| Escudo | o dedal desce na cabeça com um "tink" |
| Último Fio | cai, e um fio vindo do alto o segura: fica pendurado balançando (pêndulo de 1,2 s) |
| Caiu | desmonta mole no pano, 450 ms; solta 14–24 flocos |
| Vitória | pulinho torto e braço para cima |

**Remendos e troféus**
- Pontos de Costura aparecem como remendos de outra cor (nível 0 a 5), sempre nos mesmos lugares do boneco.
- Retalho de troféu (ranqueado): quadradinho da cor do tecido do adversário costurado na barra do tronco, até 12 visíveis.
- Fio de Ouro (topo da temporada): o pesponto inteiro vira ouro com brilho.

## 6. A cena da luta
- Fundo em 3 planos: (1) sótão no escuro — janela com lua, vigas, prateleira com potes de botões; (2) borda da mesa com objetos gigantes — máquina de costura em silhueta, alfineteiro, vela acesa, carretéis; (3) o pano de retalhos onde se luta.
- A vela pisca devagar (nunca flash); poeira flutua na luz. Tudo isso para com "Menos animação".
- Lugares: 3 círculos bordados por lado. Frente mais perto do centro, maior e mais baixo; Meio 94% do tamanho; Trás 88%. O nome do lugar é bordado no pano.
- Time do jogador à esquerda (PC) ou embaixo (celular). O rival tem a luz fria da lua; o jogador, a luz quente da vela.
- A **Tesoura** está pendurada no alto desde o começo. Do turno 6 ao 8 ela desce um degrau por turno e balança; do 9 em diante ela corta a cada turno (corte grande, sem flash).
- Vez de quem: faixa bordada atravessa a cena ("Sua vez" / "Vez do rival") por 700 ms.
- Vantagem de tecido: ao escolher uma carta, cada alvo que apanha mais ganha uma etiqueta dourada "+25%", e o retalho do tecido acende no bastidor.

## 7. Cartas
- Proporção 5:7. Na mão do PC: 132×185 px, em leque, sobrepostas e centralizadas; a carta sob o mouse sobe e cresce 1,25×. No celular: 5 cartas cabem em leque sem rolar; tocar amplia a carta no meio da tela, com o texto inteiro e o botão de jogar.
- Anatomia, de cima para baixo: custo num carretel (canto de cima à esquerda) · desenho grande **da própria parte** do boneco sobre um retalho escuro com luz · nome numa fita · texto em linho, com palavras-chave em negrito e números em ouro · rodapé com o ícone do lugar da parte (cabeça, braços, pernas) e a carinha do boneco dono.
- Moldura no tecido do tipo da carta, com pesponto.
- Estados: jogável = pesponto `#FF4D8D` pulsando devagar (1,6 s); sem Linha = 40% menos cor e carretel vazio (nunca cinza chapado); vez do rival = mão abaixada 30%, com cor; fiapo = bordas desfiadas e a frase "Fiapo: descarte e compre 1".
- Jogar: a carta voa da mão até o alvo em 220 ms, vira e se desfaz em fiapos.

## 8. Telas
- **Entrada:** logotipo Frayz em que cada letra é um retalho de um tecido e o z se desfia num fio solto; os bonecos do jogador sentados na beira da mesa; botões Aventura, Luta livre, Meus bonecos, Costura.
- **Escolher time:** os bonecos numa prateleira; tocar abre a ficha (partes, cartas, bordado); os 3 escolhidos sobem para os círculos Frente, Meio e Trás; dá para arrastar para trocar a ordem.
- **Fim da luta:** o boneco do golpe final em destaque, "Vitória!" bordado (ou "Derrota" desfiando), 3 números com ícone (turnos, maior golpe, viradas) e botões Revanche, Trocar time, Rever, Copiar replay. O texto cru do replay nunca aparece na tela.
- **Costura:** os dois pais lado a lado, as chances de cada parte em barras antes de confirmar, e o casulo de retalhos abrindo parte por parte.
- **Ficha do boneco:** frente e "avesso" (os forros), Carretel, remendos, árvore da família, histórico.

## 9. Limites (não se passam)
- Flash: no máximo 3 por segundo; nunca tela inteira branca.
- Partículas: no máximo 90 ao mesmo tempo.
- Tremida: no máximo 6 px e 120 ms.
- "Menos animação" (botão e preferência do aparelho): sem tremida, sem flash, sem câmera, no máximo 20 partículas, trocas por esmaecer. O som continua.
- 60 quadros por segundo num celular médio: camadas desenhadas uma vez e guardadas; nada de ler pixel a cada quadro.
- Texto com contraste de pelo menos 4,5:1. Nenhuma informação só por cor.
- No PC tudo funciona pelo teclado: 1–7 escolhe a carta, setas escolhem o alvo, Enter joga, Espaço passa, T troca lugares.
- A tela nunca calcula regra nem número: tudo vem do motor ou do servidor.

## 10. Como conferir
- Foto de cada tela nos dois formatos de referência, olhada de perto por quem fez.
- Folha de bonecos (`public/galeria.html`): os 9 prontos em todas as poses, todas as partes, e a silhueta preta de cada um.
- Nota da trindade por tela. Meta do acabamento: Dopamina, Congruência e Coerência com 90 ou mais.
