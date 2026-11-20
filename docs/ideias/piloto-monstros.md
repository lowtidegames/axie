# Piloto: monstros elementais (roupa nova sobre o motor atual)

Proposta do designer de jogo, 15/11/2026. Só desenho: nenhum número muda. Os ids e números são os de `shared/config.js`. Nomes do jogo em inglês. Nada aqui foi aprovado; o dono escolhe o nome e julga o piloto.

## 1. Mundo

- **Mundo:** um reino de colinas verdes, vilas com bandeirinhas e um castelo no alto.
- **Monstros:** os monstros nascem de ovos e são feitos de partes. Uma cabeça de um, as pernas de outro: cada filhote é único.
- **Torneios:** os criadores montam trios e entram nos torneios das vilas. A luta corre sozinha, e o criador vence pela montagem.
- **Pôr do sol:** quando o sol baixa, os monstros cansam, e a luta precisa acabar antes de anoitecer.
- **Tom:** aventura de sábado de manhã. Monstros redondos e cheios de cara, cores fortes, nada sombrio.

**Nome provisório (o dono escolhe):**

| Opção | Por quê |
|---|---|
| **Crestkin** | "crest" (brasão, crista) + "kin" (família). Fala de linhagem e cruzamento. |
| **Hatchforge** | Ovo + forja. Fala de montar monstros. |
| **Kindlewild** | Faísca + selvagem. Soa como aventura. |

Antes de escolher, buscar cada nome em lojas de apps e de jogos, para ver se já existe algo igual.

## 2. Os 6 elementos (a roda do motor não muda)

No motor, cada tipo bate forte no SEGUINTE da lista: jeans > seda > lã > feltro > tule > couro > jeans (+25%, `BONUS_DE_TIPO`).

| id atual | Elemento | Cor principal | Ideia visual | Bate forte em |
|---|---|---|---|---|
| `jeans` | **Bloom** | `#4CB944` | espinhos, folhas, cipós, casca | Tide ("Bloom drinks Tide") |
| `seda` | **Tide** | `#2E8BEA` | barbatanas, conchas, cristas de onda | Stone ("Tide wears down Stone") |
| `la` | **Stone** | `#B07A4A` | placas de pedra, seixos, musgo | Gale ("Stone blocks Gale") |
| `feltro` | **Gale** | `#E8C547` | penas douradas, asas, laços de vento | Mist ("Gale blows away Mist") |
| `tule` | **Mist** | `#A98BE8` | névoa lilás, asas de mariposa, brilho suave | Ember ("Mist smothers Ember") |
| `couro` | **Ember** | `#F05A3C` | carvão, rachaduras de brasa, cascos | Bloom ("Ember burns Bloom") |

- **Roda:** Bloom > Tide > Stone > Gale > Mist > Ember > Bloom. É um só ciclo, e cada elo tem uma frase que se entende sozinha.
- **Raridade:** a raridade nunca usa a cor de um elemento. Ela aparece pela moldura e pela gema com o nome (Common, Uncommon, Rare, Legendary). O dourado da raridade precisa ser conferido contra o `#E8C547` do Gale (risco 3).

**Atributos na tela:**
- Vida → **HP**.
- Firmeza → **Armor %**.
- Rapidez → **Crit %**. No motor, a Rapidez é só a chance de crítico. Chamar de "Speed" numa luta automática faria o jogador achar que ele age primeiro.

## 3. As 9 criaturas prontas

As partes seguem o elemento da habilidade que trazem. Por isso o Cindertusk tem cabeça Bloom e barbatanas Tide sobre um corpo Ember. É a mistura de partes à vista desde o começo.

| id | Nome | Elemento (raridade) | Silhueta em 64 px |
|---|---|---|---|
| `rasgao` | **Burrlet** | Bloom (Common) | bolinha de quatro patas coberta de carrapichos, com cipós de espinho saindo dos ombros |
| `brigao` | **Ramblehorn** | Bloom (Rare) | carneiro de pé com chifres enrolados enormes e cheios de musgo |
| `mordedor` | **Snapcoal** | Ember (Common) | lagarto baixo de boca gigante, com espinhos de obsidiana nas costas |
| `pisoteador` | **Cindertusk** | Ember (Rare) | brutamontes de cascos enormes, de três cores (crina verde, barbatanas azuis) |
| `desfiado` | **Ripplance** | Tide (Rare) | de pé em curva de "S", com crista de onda na cabeça e barbatanas compridas como lanças |
| `embolado` | **Cobblepup** | Stone (Common) | bola de pedra com boné de rocha; a parte de baixo é uma pedra que rola |
| `cascudo` | **Breezle** | Gale (Rare) | coruja-bolinha dourada de asas abertas e sobrancelhas grossas |
| `assombrado` | **Wispurr** | Mist (Common) | gatinho-mariposa que flutua, sem pernas, com cauda de fumaça |
| `mudo` | **Lanternewt** | Mist (Common) | salamandra comprida com papo que brilha como lanterna |

**Partes para a arte** (head · arms · legs · body · mark):

| Monstro | head | arms | legs | body | mark |
|---|---|---|---|---|---|
| Burrlet | **Burr Head**: cabeça redonda de carrapichos verdes, presinhas brancas | **Thorn Vines**: dois cipós com espinhos saindo dos ombros | **Root Claws**: patas curtas com garras de raiz | **Bramble Torso**: barril de casca com folhas | **Keen Claws**: runa de três arranhões, brilho verde-claro no flanco |
| Ramblehorn | **Ram Horns**: chifres enrolados com musgo | **Dart Feathers** (Gale): penas douradas em ponta nos antebraços | **Ash Paws** (Ember): patas cinza com rachaduras laranja | **Sprout Torso**: tronco esguio com cachecol de folha | **Lucky Scale**: escama brilhante como medalha no peito |
| Snapcoal | **Coal Jaw**: mandíbula enorme de dentes de carvão | **Ember Whip**: dois chicotes de brasa saindo dos ombros | **Magma Hooves**: cascos pretos com lava nas frestas | **Coal Torso**: peito de rocha preta com rachaduras vermelhas | **Spiked Hide**: fileira de espinhos de obsidiana nas costas |
| Cindertusk | **Burr Head** (Bloom): crina de carrapicho verde e presas | **Lance Fin** (Tide): lâminas-barbatana azuis nos antebraços | **Magma Hooves**: cascos grandes | **Spark Torso**: corpo vermelho com pintinhas de faísca | **Hawk Eye**: brasão em forma de olho no ombro |
| Ripplance | **Wave Crest**: crista de onda quebrando, espuma branca | **Lance Fin**: barbatanas compridas como agulhas | **Current Flippers**: cauda enrolada de cavalo-marinho | **Shell Torso**: peitoral de concha perolada | **Hawk Eye**: brasão de olho no peito |
| Cobblepup | **Rock Cap**: boné de pedra com aba | **Slab Arms**: braços largos de laje, para abraçar | **Boulder Roll**: metade de baixo é uma pedra redonda | **Boulder Torso**: corpo redondo de pedra com musgo | **Rooted**: runa de raiz na barriga, raízes nas bordas |
| Breezle | **Storm Brow**: cara de coruja com sobrancelhas de pena | **Tailwind Wings**: asas douradas com laços de vento | **Breeze Talons**: garrinhas leves com penas-fita | **Plume Torso**: bola fofa de penas douradas | **Mending Moss**: tufo de musgo com folhinha no peito |
| Wispurr | **Veil Face**: capuz de névoa, olhos brilhando | **Mist Wings**: asas de mariposa lilás meio transparentes | **Wisp Tail**: sem pernas, cauda de fumaça enrolada | **Wisp Torso**: corpo fino e meio transparente | **Last Roar**: coroinha de chama lilás no peito |
| Lanternewt | **Lamp Snout**: papo de vidro com luz amarela | **Riptide Fins** (Tide): barbatanas azuis | **Quake Feet** (Stone): pés com placas de pedra | **Lantern Torso**: corpo lilás com barriga de vidro | **Glow Pouch**: bolsinha brilhante no quadril |

**Nomes das demais partes** (para o resto da coleção e para o nome do filhote; o apelido vai entre parênteses):

| Slot | Partes |
|---|---|
| Cabeças | `cab_botao` Burr Head (Burr) · `cab_brim` Ram Horns (Ram) · `cab_ziper` Coal Jaw (Coal) · `cab_desfiada` Wave Crest (Crest) · `cab_gorro` Rock Cap (Rock) · `cab_feltro` Storm Brow (Owl) · `cab_veu` Veil Face (Veil) · `cab_abafada` Lamp Snout (Lamp) |
| Braços | `br_rasgado` Thorn Vines (Lash) · `br_cadarco` Ember Whip (Whip) · `br_agulha` Lance Fin (Lance) · `br_cetim` Riptide Fins (Rip) · `br_abraco` Slab Arms (Hug) · `br_cruz` Tailwind Wings (Wing) · `br_alfinete` Dart Feathers (Dart) · `br_nevoa` Mist Wings (Haze) |
| Pernas | `pe_rebite` Root Claws (Root) · `pe_tamanco` Magma Hooves (Stomp) · `pe_sola` Ash Paws (Ash) · `pe_cetim` Current Flippers (Flip) · `pe_novelo` Boulder Roll (Roll) · `pe_rolo` Quake Feet (Quake) · `pe_remendo` Breeze Talons (Talon) · `pe_ultimo` Wisp Tail (Wisp) |
| Corpos | `tr_jeans_rebitado` Bramble Torso · `tr_jeans_surrado` Sprout Torso · `tr_couro_curtido` Coal Torso · `tr_couro_rachado` Spark Torso · `tr_seda_bordada` Shell Torso · `tr_seda_rota` Reef Torso · `tr_la_embolada` Boulder Torso · `tr_la_tricotada` Pebble Torso · `tr_feltro_duro` Plume Torso · `tr_feltro_manchado` Feather Torso · `tr_tule_rasgado` Wisp Torso · `tr_tule_armado` Lantern Torso |
| Marcas (bordado → **Mark**) | `espinho` Spiked Hide · `remendo_vivo` Mending Moss · `botao_reserva` Lucky Scale · `agulha_afiada` Keen Claws · `pe_de_chumbo` Rooted · `olho_de_vidro` Hawk Eye · `rancor` Last Roar · `bolso_de_linha` Glow Pouch |

**Textos das marcas.** Os modelos usam os mesmos campos de hoje. A tela troca o campo pelo número do config.

| id | Texto em inglês |
|---|---|
| `espinho` | Deals {valor} damage back to whoever hits it with a skill. |
| `remendo_vivo` | Heals {valor} at the start of each of its team's turns. |
| `botao_reserva` | The first hit it takes deals {valor} less. |
| `agulha_afiada` | +{valor%} damage with Arms skills. |
| `pe_de_chumbo` | Takes {valor} less per hit and can't be pushed or pulled. |
| `olho_de_vidro` | +{valor}% crit chance. |
| `rancor` | +{valor%} damage while in Last Stand. |
| `bolso_de_linha` | When it falls for good, its team gains {valor} Glow. |

## 4. Habilidades (as 24 cartas; mesmo efeito, mesmos números, mesmos campos)

Custo é a Linha de hoje, que vira **Glow**. Os números entre parênteses são os do config hoje, só para conferir. A tela continua montando o texto pelo `textoDaCarta`.

| id | Nome | Custo | Texto em inglês | Números de hoje |
|---|---|---|---|---|
| `botaozada` | Thorn Bash | 1 | {0.valor} damage to the Front. | 75 |
| `testada_de_brim` | Bramble Ram | 2 | {0.valor} damage to the Front; it takes {1.valor}. | 115 / 15 |
| `rasgo` | Thorn Lash | 1 | {0.valor} damage and Exposed on the target for {1.turnos} turns. | 45 / 2 |
| `rebite_solto` | Root Breaker | 1 | Breaks the target's Guard, then {1.valor} damage. | 55 |
| `mordida_de_ziper` | Cinder Bite | 2 | {0.valor} damage; +{0.bonusFioSolto%} if the target is Exposed. | 85 / 50% |
| `laco_de_cadarco` | Ember Whip | 1 | Reach; {0.valor} damage and pulls the target one spot forward. | 45 |
| `pisao_de_tamanco` | Magma Stomp | 2 | {0.valor} damage; +{0.bonusSeMenosVida} if it has less HP than the target. | 75 / 30 |
| `sola_grossa` | Ash Guard | 1 | Guard {0.valor} on itself. | 70 |
| `desfiar` | Tidal Crash | 3 | {0.valor} damage to every standing enemy. | 80 |
| `agulha_longa` | Water Lance | 1 | Reach; {0.valor} damage anywhere. | 60 |
| `lacada_fina` | Riptide | 2 | Reach; {0.valor} damage; +{0.bonusTras} if the target is in the Back. | 90 / 35 |
| `passo_de_cetim` | Current Step | 0 | Swaps places with an ally and readies {1.qtd} more skill. | 1 |
| `gorro_felpudo` | Stone Ward | 1 | Guard {0.valor} on every ally. | 45 |
| `abraco_apertado` | Bulwark Hug | 1 | Guard {0.valor} on itself and {1.valor} on a neighbor. | 60 / 40 |
| `novelo_rolante` | Rolling Boulder | 2 | {0.valor} damage and pushes the target one spot back. | 95 |
| `rolo_de_la` | Quake Stomp | 2 | {0.valor} damage; the rival loses {1.valor} stored Glow. | 85 / 1 |
| `feltro_pesado` | Downdraft | 2 | {0.valor} damage; it heals {1.valor}. | 90 / 25 |
| `ponto_cruz` | Tailwind | 0 | Readies {0.qtd} more skill; +{0.linhaSeMesmoTipo} Glow if it matches its element. | 1 / 1 |
| `alfinete_de_feltro` | Gust Dart | 1 | Reach; {0.valor} damage. | 65 |
| `remendo_rapido` | Soothing Breeze | 2 | Heals {0.valor} on an ally. | 90 |
| `veu_de_tule` | Mist Veil | 1 | The next attack against it misses (guaranteed). | — |
| `grito_abafado` | Fading Howl | 0 | +{0.valor} Glow now; it loses {1.valor} HP. | 1 / 20 |
| `nevoa_de_tule` | Haze Bolt | 2 | Reach; {0.valor} damage and Exposed on the target for {1.turnos} turns. | 75 / 2 |
| `ultimo_ponto` | Final Wisp | 1 | Only below {c.limite%} HP or in Last Stand: {0.valor} damage. | 25% / 150 |

## 5. Equivalentes

| Hoje | Nome novo | Como aparece |
|---|---|---|
| Linha | **Glow** | Orbes de luz na base do time (3 por turno, máximo 7). Cada habilidade gasta orbes visíveis. |
| Mão / comprar | **Ready skills** | Ícones acesos sobre cada monstro mostram quais habilidades estão prontas neste turno. "Compra" vira "readies". |
| Tesoura (turno 9+, 10% da vida máx.) | **Sundown** | O sol do fundo da arena desce do turno 6 ao 8. Do 9 em diante, "Sundown" tira 10% do HP máximo de todos por turno (cansaço). O céu fica laranja, sem flash. |
| Turno 12 (vence a maior soma de % de vida) | **Nightfall** | Duas barras de % de HP do time se enchem lado a lado, e a maior vence. |
| Último Fio | **Last Stand** | Ao chegar a 0 pela 1ª vez, o monstro fica de pé até o fim do próximo turno dele. Não pode ser alvo e só usa a habilidade das pernas. Aura branca pulsando devagar e o selo "LAST STAND". |
| Fio Solto | **Exposed** | Recebe +20% de dano. Ícone de rachadura sobre o monstro. |
| Escudo | **Guard** | Bolha azul-clara com o número em cima. |
| Véu | **Veil** | Brilho lilás tremeluzindo. O próximo ataque passa reto e aparece "MISS!". |
| Pontos de Costura / níveis de remendo (desgaste) | **Scars** (0–5) | Curativos e cicatrizes aparecem no retrato, só como enfeite (não mudam força). No limite, ele só pode se aposentar. |
| Carretel (5 costuras) | **Clutches** | "Clutches 3/5" na ficha: quantos ovos ainda pode gerar. |
| Costura / casulo | **Breed / Egg** | O cruzamento vira ninho, e o filhote nasce de um ovo. |
| Face / forro (`olharOAvesso`) | **Shown / Hidden traits** | O botão "Peek hidden traits" mostra os genes escondidos. |
| Aposentar / Mural / Retalhos Honrados | **Retire → Hall of Legends** / **Honor Badges** | Retrato com moldura na galeria. As medalhas seguem a mesma regra e os mesmos números de hoje. |
| Energia da Aventura (20/dia, 00:00 UTC) | **Rations** | "Uses 1 Ration" no botão e um saquinho com o contador na barra de cima. |
| Aventura | **The King's Road** | O mapa de cima (seção 8). |

## 6. Luta automática (só tela e um "escolhedor"; o motor não muda)

**Antes da luta, o jogador decide 4 coisas:**
1. **Trio:** 3 monstros da coleção. O trio rival aparece antes, com silhuetas e elementos.
2. **Posição:** Front, Middle e Back, arrastando.
3. **Ordem das habilidades de cada monstro:** 3 ícones em fila (1º, 2º, 3º) que se arrastam. Tocar num ícone desliga a habilidade (fica "Off").
4. **Tática do time**, uma de três:
   - **Rush:** ataques primeiro. O alvo com Reach é sempre o Front inimigo.
   - **Focus:** ataques primeiro. O alvo com Reach é o inimigo com menos % de HP.
   - **Guard:** se um aliado está com 50% de HP ou menos, Guard, Veil e cura vêm antes de tudo.

**Como o escolhedor decide a cada passo.** É uma função pura nova. Só usa `comandosValidos(estado)` e `aplicar`, como os robôs de `shared/robos.js`:
1. Se houver `fiapo` válido, ele é feito. É de graça e compra 1, como o planejador já faz.
2. Pega os `jogar` válidos e tira as habilidades marcadas "Off".
3. Ordena primeiro pela tática (Guard: defesa antes quando houver aliado com 50% ou menos). Depois por posto (as 1ª de todos, depois as 2ª, depois as 3ª). No empate, Front, depois Middle, depois Back.
4. Regras de segurança fixas:
   - nunca usa habilidade de autodano que levaria o próprio monstro a 0;
   - Current Step só troca se o Front estiver com menos de 35% de HP;
   - nunca usa `trocar` sozinho.
5. Escolhe o alvo:
   - `inimigo`: pela tática;
   - `aliado`: o de menor % de HP;
   - `vizinho`: o vizinho de menor % de HP;
   - `outroAliado`: o do Back.
6. Joga a primeira da lista que for válida. Se não houver nenhuma, faz `passar` (a Glow que sobra fica guardada, como hoje).

**O servidor decide tudo.** Os dois lados são automáticos. Por isso a luta inteira pode ser calculada no início (semente, times e táticas), e a tela só reproduz os eventos que o motor já emite (`turno`, `linha`, `compra`, `tesoura`, `ultimoFio`, `errou`, `cura`, `caiu`, `fim`…). "Pular" é mostrar o fim, e nada que o jogador vê muda o resultado. A tela deve dizer isso numa linha: "The result is decided when the fight starts."

**O que o jogador vê durante a luta:**
- Velocidade **1× / 2× / 4×** (a última escolhida fica guardada), **Pause** e **Skip**.
- Antes de cada ação, uma faixa com o nome da habilidade e o ícone do elemento, por 0,35 s. É a antecipação.
- Ícones "ready" acesos sobre cada monstro e os orbes de Glow do turno.

**Duração alvo:**
- Hoje a luta tem em média 9,3 turnos, com cerca de 2–3 ações por turno, ou seja, uns 23 golpes.
- Em 1×, cerca de 1,4 s por ação mais 0,5 s por troca de turno dá **40–50 s**.
- Em 2×, cerca de 23 s. Em 4×, cerca de 12 s.
- Medir na tela.

**O que torna gostoso assistir (picos):**

| Momento | O que acontece |
|---|---|
| **Strong!** | O golpe de vantagem de elemento aparece com o ícone dos dois elementos e um número maior. |
| **Crítico** | Pausa de 0,15 s, número grande e tremida de 6 px por 120 ms (fora com "Menos animação"). |
| **Last Stand** | Câmera lenta de 0,4 s e o selo. Desperta torcida: "ele ainda pode soltar o Final Wisp" (150). |
| **MISS!** | O Veil desvia com um "whoosh". |
| **Sundown** | O sol encosta no horizonte e a música muda. Dá urgência sem punir o jogador. |
| **Golpe final** | Câmera lenta no último monstro que cai. No Nightfall, as barras de % se enchem até o fim. |

**A decisão que mais muda o resultado (hipótese, medir no simulador): a POSIÇÃO e o TRIO.**
- 10 das 24 habilidades acertam só o Front.
- Monstro em Last Stand não é alvo, então o Front "anda".
- A ordem das habilidades pesa menos, porque quais ficam prontas a cada turno ainda depende do sorteio do baralho (ver risco 1).

**Medir antes de mostrar ao dono:**
- escolhedor com ordem padrão contra o planejador, com o mesmo trio: alvo de 45% ou mais;
- ordem boa contra ordem ruim: diferença de pelo menos 5 pontos percentuais. Se der menos, a escolha é de enfeite.

**Ordem padrão de fábrica:** monstro na frente ataca primeiro; quem está no Back faz cura e Guard primeiro.

**Rival do piloto:** se o escolhedor ficar abaixo de 45% contra o planejador, o rival do piloto usa o mesmo escolhedor (luta espelhada, justa).

## 7. Cena do ovo (reaproveita a revelação do casulo: `ordemDeRevelacao` = mark, legs, arms, head, body)

1. **Ninho:** os dois pais ficam um de cada lado. As chances por parte (`chancesDaCostura`) já foram mostradas antes de confirmar o cruzamento. O ovo cai no ninho com um "toc".
2. **Mark** (0,8 s): a runa da marca acende por dentro da casca. Ao lado, o cartão diz "Mark: Hawk Eye · Rare · from Snapcoal".
3. **Legs** (0,8 s): primeira rachadura embaixo e os pezinhos aparecem. Cartão da parte, com a mesma linha de origem e raridade.
4. **Arms** (0,8 s): rachaduras dos lados e as barbatanas, asas ou cipós saem pela fresta.
5. **Head** (1,0 s): o topo da casca salta, os olhos piscam e o nome parcial monta pelos apelidos ("Coal-Lance-…").
6. **Body = pico** (1,2 s): a casca explode em pedaços, a cor do elemento enche a tela por trás, a criatura inteira aparece com nome completo, elemento e moldura de raridade.
   - Rare ou Legendary: pausa de 0,6–1 s, fundo escurecendo, brilho e fanfarra, dentro do kit de diversão (grande).
   - Common: festa média.
7. **Botões:** "Name it", "Peek hidden traits" e "To the team".

**Regras da cena:**
- Cada etapa só acontece com um toque, ou sozinha a cada 0,8 s com o "auto" ligado.
- "Menos animação": sem tremida e sem flash; as trocas são por esmaecer; o som fica.
- No piloto o sprite é inteiro. Cada etapa revela uma faixa do sprite com recorte retangular: pernas embaixo, braços no meio, cabeça em cima, corpo no fim (tudo).

## 8. Mapa da Aventura (The King's Road, visto de cima)

| Fase | Lugar | Cena de cima | Trio rival (de `aventura-dados.js`) |
|---|---|---|---|
| 1 | **Hearthfield** | gramado da vila, poço e bandeirinhas | Snapcoal, Cobblepup, Lanternewt |
| 2 | **Millbrook** | moinho de água e ponte de madeira | Ramblehorn, Wispurr, Breezle |
| 3 | **Thornwood Edge** | borda da mata com cercas de espinho | Burrlet, Ripplance, Cobblepup |
| 4 | **Stonebridge Watch** | ponte de pedra com torre de vigia sobre o rio | Cindertusk, Breezle, Wispurr |
| 5 | **Crownhold Keep** | castelo no alto da colina, pátio do torneio | Ramblehorn, Cindertusk, Ripplance |

## 9. Direção de arte (pixel art, gerador de imagens)

**Tamanhos:**

| Peça | Tamanho | Escala na tela |
|---|---|---|
| Monstro de lado | quadro de **64×64** (o monstro ocupa uns 48×52) | ×3 no PC (192 px), ×2 no celular (128 px), sempre em múltiplo inteiro |
| Arena de lado | **384×216** | ×5 = 1920×1080 |
| Mapa de cima | **384×216** | ×5 = 1920×1080 |
| Ovo | **64×64** | como o monstro |
| Ícones | 16×16 | — |

- Se a ferramenta não gerar 384×216, gerar 192×108 e ampliar ×2.
- O rival usa o mesmo sprite espelhado pelo código.
- Nos 64 px, cada parte precisa ter silhueta própria (chifre, cauda, asa, casco). A cor sozinha não basta.

**Paleta base (12 cores):**

| Uso | Hex |
|---|---|
| contorno | `#2B1E3A` (ameixa escura) |
| luz | `#F7F1E3` (creme) |
| Bloom | `#4CB944` |
| Tide | `#2E8BEA` |
| Stone | `#B07A4A` |
| Gale | `#E8C547` |
| Mist | `#A98BE8` |
| Ember | `#F05A3C` |
| madeira | `#6B4A3A` |
| céu | `#8FD3F0` |
| folhagem funda | `#3E6B48` |
| pedra cinza | `#C9C2B8` |

**Regras de desenho:**
- Contorno de 1 px em `#2B1E3A`, nunca preto puro. Por dentro, as linhas são o tom mais escuro da própria cor.
- Luz vindo de cima à esquerda, no máximo 3 tons por material, sem pontilhado pesado, fundo transparente.
- Cada elemento ganha 1 tom escuro e 1 claro derivados da sua cor (a rampa fica pronta no arquivo de paleta).

**Fundo da arena:** pátio de torneio ao ar livre com gramado, cerca de madeira, bandeirinhas coloridas e o castelo pequeno ao longe. O céu fica livre em cima, para o sol do Sundown descer. O chão é plano, numa faixa de 64 px embaixo, com 3 marcas claras de posição de cada lado.

**Ovo:** casca creme com pintas nas 6 cores dos elementos (nunca na cor da raridade), em 3 estados: inteiro, rachado e casca aberta em pedaços.

**Prefixo de estilo, igual em todo pedido de monstro (S):**
`pixel art sprite, 64x64, side view, facing right, full body, cute chunky fantasy creature, bright saturated colors, 1px dark plum outline (#2B1E3A), simple 3-tone shading, light from top-left, transparent background, no text, no border`

Se a ferramenta tiver campos de vista, direção, contorno e sombra, usar: side, east, contorno de 1 cor, sombra simples. Depois de aprovar o primeiro monstro, usá-lo como referência de estilo nos outros.

**Lista de gerações do piloto (planejado 80 + folga 20 = 100; teto pedido 110; teto do dono 150):**

| # | Item | Pedido em inglês | Tentativas |
|---|---|---|---|
| 1 | Cobblepup (jogador, Front) | S + `round stone pup monster, wears a stone cap with a brim, wide flat slab arms, lower half is a rolling boulder, mossy patches, root rune on belly, ochre stone colors` | 4 |
| 2 | Snapcoal (jogador, Middle) | S + `low lizard monster with a huge jaw of coal teeth, two fiery whip tendrils from shoulders, black hooves with lava cracks, black rock chest with red glowing cracks, row of obsidian spikes on its back` | 4 |
| 3 | Breezle (jogador, Back) | S + `round fluffy golden owl chick monster, thick feather eyebrows, wings spread with wind ribbons, small light talons, small moss tuft emblem on chest` | 4 |
| 4 | Burrlet (rival, Front) | S + `small four-legged fox-boar pup covered in green burrs, tiny white tusks, two thorny vines from its shoulders, stubby legs with root claws, bark barrel body with leaves, three-scratch rune on flank` | 4 |
| 5 | Wispurr (rival, Middle) | S + `floating lavender cat-moth monster, misty hood over face with glowing eyes, translucent moth wings, no legs, curling smoke tail, tiny lilac flame crown on chest` | 4 |
| 6 | Ripplance (rival, Back) | S + `upright seahorse-like knight monster in S-curve pose, head crest shaped like a breaking wave with white foam, long needle-like blue fins as arms, curled tail as legs, pearl shell breastplate, eye-shaped crest on chest` | 4 |
| 7–12 | Pose de ataque dos 6 (referência = idle escolhido) | S + `same creature as reference, attack lunge pose leaning forward, mouth open` | 6 × 2 = 12 |
| 13 | Arena | `pixel art background, 384x216, side view, outdoor medieval tournament yard, green grass ground strip, wooden fence, colorful pennant flags, small castle on a distant hill, clear bright sky with space at top, flat colors, 1px dark plum outlines, no characters, no text` | 4 |
| 14 | Ovo inteiro | `pixel art, 64x64, cream monster egg with small spots in green, blue, ochre, gold, lilac and red-orange, resting upright, 1px dark plum outline, 3-tone shading, transparent background, no text` | 3 |
| 15 | Ovo rachado (referência = 14) | `same egg as reference, zigzag cracks across the shell, faint light shining through cracks` | 3 |
| 16 | Casca aberta (referência = 14) | `same egg as reference, broken open, two jagged shell halves and small shell fragments, empty` | 3 |
| 17 | Ninho (fundo da cena do ovo) | `pixel art background, 384x216, side view, cozy straw nest on a wooden table inside a medieval stable, warm lantern light, flat colors, 1px dark plum outlines, no characters, no text` | 3 |
| 18 | Mapa de cima | `pixel art map, 384x216, top-down view, bright medieval kingdom, winding dirt road from a village green at bottom left, past a water mill, a thorny forest edge, a stone bridge with watchtower over a river, to a castle on a hill at top right, flat colors, 1px dark plum outlines, no text` | 4 |
| 19 | 5 marcadores de lugar | `pixel art icon, 32x32, top-down, [village well / water mill / thorny bush gate / stone watchtower / castle keep], 1px dark plum outline, transparent background, no text` | 5 × 2 = 10 |
| 20 | 6 ícones de elemento | `pixel art icon, 16x16, [leaf with thorn / water drop wave / round stone / golden feather swirl / lilac mist puff / red-orange ember flame], 1px dark plum outline, transparent background` | 6 × 2 = 12 |
| — | Folga para refazer | — | 20 |

Total: 24 + 12 + 4 + 9 + 3 + 4 + 10 + 12 = **80**, mais 20 de folga = **100**. Cada geração é anotada em `docs/custos.md`.

**Fica no código, sem gerar:** Guard, Veil, Exposed, orbes de Glow, o sol do Sundown e as cores do céu, faíscas e números de dano.

**Mistura de partes, depois do piloto:**
1. Fixar 3 **esqueletos de corpo**: de pé, de quatro e flutuante. Cada um tem pontos de encaixe (cabeça, braço da frente, braço de trás, pernas, marca) num arquivo de dados.
2. Cada parte é gerada como camada solta em 64×64 sobre o molde do esqueleto, em tom neutro. A cor do elemento entra por troca de paleta (a rampa de cada elemento), então a mesma cabeça serve em qualquer corpo.
3. A tela empilha as camadas: braço de trás, pernas, corpo, cabeça, braço da frente, marca.
4. Custo estimado: 44 partes × até 3 esqueletos × 2 tentativas = cerca de 260 gerações. Precisa de teto novo do dono.
5. Antes, ler o que o teste de "partes sobre molde" e "pose presa" de 15/11 ensinou (`arte/piloto-pixellab/`).

## 10. Trindade esperada e riscos

`Trindade: D 82 · Cg 84 · Ch 78`

- **D:** a luta passa a ter picos de assistir, o ovo é a melhor cena e há 1×/2×/4×. Perde pontos porque o jogador não age durante a luta.
- **Cg:** nomes, paleta e roda formam um mundo só. Perde pontos porque o sprite inteiro do piloto não mostra a troca de partes.
- **Ch:** o servidor decide a luta inteira no início e a tela só a mostra. Perde pontos pelo risco 1.

**Os 3 maiores riscos, com honestidade:**

1. **A ordem das habilidades pode parecer de enfeite.**
   - O motor ainda sorteia quais habilidades ficam prontas a cada turno (baralho e compra: `shared/batalha.js:182-184` e `253-254`).
   - O jogador põe Water Lance em 1º e ela não sai porque não foi comprada.
   - O que reduz o risco: ícones "ready" visíveis, a medição de 5 pontos (ordem boa contra ruim) e posição e trio como decisão principal.
   - Se a medição falhar, a correção certa mexe no motor (por exemplo, toda habilidade pronta todo turno), e isso fica para depois do piloto, com o dono.
2. **Arte sem uniformidade.**
   - 6 monstros gerados separados podem sair em escalas e traços diferentes.
   - As partes de outro elemento (Cindertusk, Ramblehorn, Lanternewt) podem sumir no sprite inteiro.
   - O que reduz o risco: o mesmo prefixo S, referência de estilo depois do primeiro aprovado, 4 tentativas, 20 de folga e o diretor conferindo lado a lado em ×3.
3. **Originalidade num gênero cheio.**
   - Monstros elementais com roda de tipos e luta automática de lado existem aos montes. Um nome pode coincidir com algo que já existe.
   - O que reduz o risco: a roda é um único ciclo de 6, com frases próprias e sem fraquezas duplas; os 9 nomes e os 3 nomes do jogo passam por busca antes de irem para a tela; nada de criatura parecida com mascote conhecido.
   - Também conferir a cor da raridade contra o dourado do Gale.
