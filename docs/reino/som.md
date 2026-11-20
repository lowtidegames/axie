# Reino — direção de som (versão 1, 19/11/2026)

> **Atualização R35 (20/11/2026).** Os números abaixo são da versão 1. Hoje: **73 efeitos** e **4 ambientes** por código (um por trecho da estrada, cruzando em 1,5 s), mais 38 amostras gravadas de 14 eventos em `public/reino/sons/`. O teste tem **149 conferências**. Peças novas em `som-reino.js`: `Som.golpe` (som no quadro do dano; o mesmo pelotão em 60 ms soa uma vez, mais forte; teto de ~25 golpes novos por segundo; altura e força variam), `Som.hitStop` (corte de agudo junto da parada), `Som.ambiente`, estéreo leve pelo X (teto ±0,6) e ducking (10 dB no chefe caindo, 9 dB no recorde). A cena avisa o som pelo gancho `C.aoSom` (`cena.js`). Volume e mudo usam rampa pelo relógio. A lista viva dos sons, com o evento que dispara cada um, é a folha `public/reino/sons.html`.

Para ouvir: abra `public/reino/sons.html` (um botão por som, os momentos da música e "Simulate a round"). Motor: `public/reino/som-reino.js`. Tudo que está aqui já toca, fabricado por código. Tema, nomes e sons são PROVISÓRIOS até o dono ouvir e aprovar.

## 1. A frase e os 5 princípios
**A frase:** em 5 segundos de jogo você ouve um alaúde alegre dedilhando, uma carta batendo na mesa de madeira com um acorde, e ao fundo o tambor avisando que alguém vem pela estrada.

| # | Princípio | Como se cumpre |
|---|---|---|
| 1 | Cada toque tem resposta na hora | som começa em até 15 ms (medido: 6 ms + 14 ms do aparelho; limite 50 ms) |
| 2 | Nada cansa na 30ª batalha | 3 variações por som repetido, nunca a mesma duas vezes; som de soldado é baixo e curto; a melodia descansa a cada segunda volta |
| 3 | A música conta onde você está | 8 momentos sobre o mesmo tema; acelera de 100 a 121 batidas por minuto e ganha camadas nas rodadas 3, 6, 8 e 11 |
| 4 | Tudo é do mesmo mundo | só madeira, corda, pele, metal, pedra e sopro; os sons de interface caem nas notas do tema (sol, lá, si, ré, mi) |
| 5 | Grande é raro | só 13 sons "grandes" abaixam a música; vitória, chefe e recorde são os mais altos; o resto fica 4 a 11 dB abaixo |

Nada de laser, moeda de fliperama ou voz. Nenhuma melodia ou efeito vem de jogo, filme ou música conhecida.

## 2. Efeitos (37, todos por código)
Duração = o que se ouve (acima de pico − 30 dB). Pri. 1 = nunca some; 4 = some primeiro. Pico = alvo em dBFS. Var. = variações.

| Evento (`Som.tocar`) | O que se ouve | ms | Camada | Var. | Pri. | Pico |
|---|---|---|---|---|---|---|
| `toque` | tique de madeira | 60 | interface | 3 | 2 | −18 |
| `cartaAparece` | carta deslizando + uma corda | 200 | interface | 3 | 2 | −14 |
| `cartaEscolhe` | estalo de papel + duas cordas subindo | 220 | interface | 3 | 2 | −12 |
| `cartaPoe` | batida na madeira + acorde de sol | 320 | interface | 3 | 2 | −11 |
| `sortear` | 4 cartas embaralhadas + uma corda aguda | 460 | interface | 3 | 2 | −13 |
| `ouro` | duas moedas tilintando (sobe de tom em sequência) | 190 | interface | 3 | 2 | −13 |
| `negado` | dois toques surdos | 200 | interface | 3 | 2 | −15 |
| `faltaUm` | duas cordas que ficam "no ar" (falta 1 para subir) | 300 | interface | 1 | 2 | −14 |
| `consertar` | dois martelinhos + três cordas subindo | 550 | interface | 3 | 2 | −12 |
| `nivelPequeno` | arpejo de 4 cordas + brilho | 430 | nível | 3 | 2 | −11 |
| `nivelGrande` | trompa sol–ré–sol + tambor + chuva de sininhos | 1080 | nível | 1 | 1 | −8 |
| `marcha` | 4 passos de tropa: tambor, botas, armadura | 770 | batalha | 3 | 3 | −13 |
| `choque` | 8 espadas + 4 baques + rumor, num som só | 540 | batalha | 3 | 3 | −11 |
| `espada` | um tinido curto | 60 | batalha | 3 | 4 | −16 |
| `flecha` | assobio que passa + "toc" | 220 | batalha | 3 | 3 | −14 |
| `magiaFogo` | sopro que abre + estalidos | 380 | batalha | 3 | 2 | −10 |
| `magiaGelo` | três cristais agudos + ar frio | 410 | batalha | 3 | 2 | −11 |
| `magiaRaio` | estalo seco + zunido descendo, duas vezes + trovão curto | 200 | batalha | 3 | 2 | −10 |
| `magiaCura` | três cordas subindo + flauta | 560 | batalha | 3 | 2 | −12 |
| `critico` | estalo + sino de metal + baque | 340 | batalha | 3 | 2 | −8 |
| `soldadoCai` | "piu" descendo + baque (bem-humorado) | 230 | batalha | 3 | 4 | −16 |
| `muralha` | bloco de pedra + pedrinhas | 310 | batalha | 3 | 3 | −11 |
| `casteloRacha` | rachadura picotada descendo + ronco + pedras caindo | 790 | batalha | 3 | 1 | −7 |
| `vidaPerdida` | sino grave + duas notas tristes | 750 | batalha | 1 | 1 | −9 |
| `invasorChega` | trompa ré–lá + tambor acelerando | 980 | invasor | 1 | 2 | −10 |
| `chefeAnuncia` | trompa grave "torta" (duas notas coladas) + 3 tambores | 1300 | chefe | 1 | 1 | −8 |
| `chefeEntra` | dois passos pesados + gongo | 890 | chefe | 1 | 1 | −7 |
| `chefeCai` | assobio caindo + estrondo + acorde alegre | 1400 | chefe | 1 | 1 | −7 |
| `vitoria` | fanfarra que abre com o motivo (sol–ré–si–dó–ré) | 1640 | resultado | 1 | 1 | −7 |
| `espolio` | baú rangendo + três sininhos | 500 | resultado | 3 | 2 | −11 |
| `espolioEscolhe` | duas cordas + tinido | 260 | resultado | 3 | 2 | −11 |
| `derrota` | o motivo descendo em menor, perdendo o fôlego | 1630 | resultado | 1 | 1 | −9 |
| `fimDePartida` | o tema inteiro depressa + acorde final + pandeiro | 2310 | fim | 1 | 1 | −7 |
| `recorde` | escala subindo + trompa + sininhos | 1250 | fim | 1 | 1 | −8 |
| `rankingSobe` | uma corda + "blip" subindo (um degrau por posição) | 140 | fim | 3 | 2 | −14 |
| `cartaNova` | página virando + escala + acorde de cristal | 990 | álbum | 1 | 2 | −9 |
| `conquista` | carimbo + trompa de 3 notas | 960 | álbum | 1 | 2 | −9 |

**Como "dezenas" lutam sem virar barulho** (`Som.fundoBatalha(0 a 1)`):
- O jogo NÃO pede um som por soldado. Ele diz só a força da briga; o motor sorteia poucos sons bem escolhidos.
- Três camadas: `choque` (a massa, a cada ~1,4 s) + `espada` e `flecha` soltas, espalhadas entre esquerda e direita + `soldadoCai` de vez em quando.
- Tetos: 6 vozes de tropa ao mesmo tempo (4 espadas, 3 flechas, 3 quedas, 2 choques). Medido na rodada simulada: cerca de 70 sons em 12 s, nunca mais de 6 vozes de tropa.
- Magia, crítico, muralha e castelo ficam fora desse teto e sempre aparecem.

## 3. Música — o Tema do Reino
- **Tom e andamento:** sol maior, 4 por 4, 100 batidas por minuto na rodada 1, +1,5 por rodada até 121.
- **Instrumentos (de época, estilizados, por código):** alaúde (corda dedilhada), flauta doce, charamela, trompa, cordas, tambor de pele, pandeiro.
- **Motivo (original, 8 notas):** sol – ré – si – dó – lá | sol – mi – lá. Resposta: sol – ré – si – dó – lá | fá♯ – lá – sol.
- **Acordes (8 compassos):** Sol · Dó/Ré · Sol · Ré/Sol · Mi m · Dó · Lá m/Ré · Sol.

| Momento (`Musica.momento`) | O que toca |
|---|---|
| `construir` | alaúde dedilhado + flauta com o tema + bordão baixinho; a flauta descansa meia volta sim, meia não |
| `batalha` | entra tambor, pandeiro e baixo; o tema passa para a charamela; alaúde no contratempo |
| `chefe` | o MESMO tema em sol menor, uma oitava abaixo; tambor grave em todo tempo; cordas tremendo; baixo martelando |
| `porUmFio` | construir abafado (como atrás de uma porta) + batida de coração; a flauta só aparece em metade |
| `vitoria` | tema na trompa + flauta uma oitava acima, percussão cheia (toca durante o espólio) |
| `derrota` | tema em menor, só notas longas, sem tambor, mais lento (86) |
| `fim` | festa: como vitória, um pouco mais rápida, com sininhos no fim da volta |
| `menu` | só o alaúde tocando o tema, lento (álbum e telas calmas) |

- **Troca:** sempre na linha do compasso (no máximo 2,4 s de espera). Para a batalha e o chefe, um rufar de tambor começa NA HORA e cresce até a virada. Vitória e derrota respondem na hora pelo efeito; a música acompanha na virada.
- **Crescer com as rodadas** (`Musica.rodada(n)`): 3 = pandeiro leve no construir · 6 = segunda flauta uma oitava acima · 8 = pandeiro dobrado · 11 = cordas na batalha. O andamento sobe junto.

## 4. Mixagem
| Item | Regra | Medido |
|---|---|---|
| Efeitos | pico de −18 (toque) a −7 dBFS (vitória, chefe, castelo) | todos a ±2,5 dB do alvo |
| Música | ~12 dB abaixo dos efeitos grandes | pico −18 a −10 dBFS; médio −31 a −26 dBFS |
| Golpe grande | música abaixa 6 dB e volta em ~0,5 s (13 sons) | — |
| Teto de vozes | 12 de efeito (6 de tropa); cheio, sai a menos importante e mais antiga | 13 sons longos → 12 vozes |
| Saída | compressor (limiar −9 dB, 6:1) + teto que não deixa passar de −3 dBFS | 12 sons grandes + música juntos: −3,5 dBFS |
| Celular | nada só em grave: todo tambor tem estalo em 2,6 kHz e o baixo é corda dedilhada | — |
| Mudo e volumes | botão de mudo + efeitos (80%) e música (60%) separados, guardados no aparelho | voltam iguais ao recarregar |
| Primeiro toque | antes dele não existe nem contexto de áudio; aba escondida = silêncio | conferido |
| "Menos animação" | o som continua; só os 13 grandes ficam 6 dB mais baixos | conferido |
| Sala | eco curto de sala de pedra (0,7 s), baixo, igual para tudo | — |

Volume médio aqui é medido em dBFS (RMS) dentro do navegador. Para amostra gravada vale a régua do ofício: mono, ~−17 LUFS, pico até −2 dBFS, medido com `ffmpeg loudnorm`.

## 5. O que gerar por amostra × o que fica no código
**Chave do ElevenLabs (19/11 18:20 BRT):** aceita pelo endereço de efeitos (resposta 422 a um pedido vazio; com chave falsa, 401). **Gasto: 0 créditos.** Não gerei nada: crédito pago só sai com o "sim" do dono na conversa que executa. O motor já aceita amostras (`public/reino/sons/manifesto.json`): entrou o arquivo, ele toca no lugar do código, no mesmo alvo de pico.

Vale gerar só o que o código faz pior: multidão, metal de verdade, pedra. Base de preço: ~11 créditos por segundo; 3 tomadas por som (lição do `docs/custos.md`); pedir de 0,8 s para cima e aparar.

| Evento | Texto do pedido (inglês) | s × tomadas | Créditos |
|---|---|---|---|
| `choque` | Two small medieval armies clash, many swords and shields hitting, short burst, no voices, no music, dry | 1,5 × 3 | ~50 |
| `marcha` | Four heavy footsteps of a marching troop in leather boots and light armor, steady, dry, no voices | 1,2 × 3 | ~40 |
| `casteloRacha` | Large stone wall cracking and splitting, falling pebbles at the end, dry, close | 1,5 × 3 | ~50 |
| `muralha` | Single heavy stone block thud with small debris, dry, close | 0,8 × 3 | ~26 |
| `chefeEntra` | Two giant heavy footsteps shaking the ground, second one louder, deep but with clear mid crack | 1,5 × 3 | ~50 |
| `flecha` | Single arrow whoosh passing by ending in a wooden thunk, dry | 0,8 × 3 | ~26 |
| `espolio` | Old wooden treasure chest lid creaking open quickly, dry, close | 1,0 × 3 | ~33 |
| `recorde` (camada) | Small cheerful crowd cheering in a village square, short, no music, no words | 1,5 × 3 | ~50 |
| **Total** | 8 sons, 24 tomadas | 29,4 s | **~325 (teto pedido: 400)** |

**Fica no código (não vale gastar):** toda a música; tudo que tem nota (cartas, ouro, níveis, fanfarras, trompas, álbum, conquista); as magias; `espada` e `soldadoCai` (curtos demais: metade das tomadas de 0,5 s sai fraca); `toque` e `negado`.

## 6. Plano de testes (`tests/tela/reino-som.e2e.mjs`, 41 conferências verdes)
Ninguém da equipe ouve: cada som é fabricado fora do tempo real, pela cadeia inteira, e medido. Números em `sons/reino/medidas.txt`.

| O que mede | Régua |
|---|---|
| Pico de cada variação (85) | alvo ±2,5 dB; nunca acima de −3 dBFS; sem estouro |
| Duração | ±25% da tabela |
| Atraso | começa em até 15 ms; atraso do aparelho ≤ 50 ms |
| Variações | diferentes entre si |
| Música | 8 momentos tocam; motivo nas notas certas (flauta, charamela, alaúde); chefe em menor; batalha com mais batida; cresce com a rodada |
| Ao vivo | nada antes do toque; os 37 botões tocam; tetos 12 e 6; mudo e volumes guardados; "Menos animação"; troca na linha do compasso |
| Rodada simulada | ordem certa, batalha de 12 s, pico ≤ −3 dBFS |
| Página | zero erro de console, zero 404, celular 390 px, amostra no lugar do código, funciona em subpasta |

Recalibrar depois de mexer numa receita: `node tests/tela/reino-som.e2e.mjs --calibrar --gravar` (pela trava de robôs).

## 7. Como o jogo usa
```js
import { Som, Musica } from './som-reino.js'
addEventListener('pointerdown', () => Som.destravar(), { capture: true }) // também click, touchend e keydown
Som.tocar('cartaPoe'); Som.tocar('ouro', { tom: 2, pan: -0.3 }); Som.fundoBatalha(0.8)
Musica.rodada(7); Musica.momento('batalha'); Som.mudo(true); Som.volume('musica', 0.4)
```
O motor não conhece regra nenhuma: o jogo só diz "aconteceu isto". Todo som importante também aparece na tela.

## 8. Lição desta entrega e o que falta
- **Lição:** filtro de áudio precisa nascer já na frequência certa (`.value` antes de agendar). Sem isso o mesmo som saía até 3 dB mais alto ou mais baixo conforme o instante do toque. Achado pela medição, travado no teste.
- **Falta:** o ouvido do dono (a aprovação final é dele, pela folha); as 8 amostras acima, se ele disser "sim"; ligar no jogo quando a tela existir; conferir num celular de verdade.

Trindade: D 80 · Cg 84 · Ch 88 (dopamina fecha só com o ouvido do dono).
