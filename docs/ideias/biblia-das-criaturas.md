# Bíblia das criaturas

Proposta do designer de criaturas, 15/11/2026, para a ordem do dono de 10:53 ("muito genericos e sem identidade visual"). Só desenho: nenhum número, efeito ou id muda (tudo vem de `shared/config.js`). Nomes do jogo em inglês. Nada aqui foi aprovado: o dono escolhe nomes e julga a arte. Nomes conferidos por busca na internet em 15/11 (seção 8); marca registrada e lojas de aplicativo ainda não conferidas.

## 0. O que deu errado na primeira rodada

Saíram um pintinho, um lagarto, uma raposa, um gato com asa, um cavalo-marinho e um menino de chapéu. O erro foi do pedido, não só do gerador: cada pedido começava por um BICHO ("owl chick", "lizard", "fox-boar", "cat-moth", "seahorse") e o elemento entrava só como cor. Nenhum passa na prova da frase: "pintinho amarelo com asa" serve para mil jogos.

## 1. A regra visual do elenco (a assinatura)

**Toda criatura é uma PEÇA DE OFÍCIO do reino que criou vida.** O corpo nunca é corpo de bicho: é um objeto feito à mão (cesto, tronco de aríete, forno, bigorna, jarro, guarita, fole de gaita, incensário, frasco). O bicho aparece só na cara e no jeito de andar.

1. **Corpo-ofício.** O corpo é sempre um objeto de feira, forja, castelo ou botica. É ele que dá a sombra.
2. **O elemento entra pelo ofício, não pela cor.** Cada elemento é uma oficina do reino: Bloom = horta, vime e madeira · Tide = poço, fonte e pesca · Stone = pedreiro e moinho · Gale = música e vento (gaita, cata-vento, vela) · Mist = botica, vidro e incenso · Ember = forja e forno.
3. **A brasa de dentro (Kindle).** Todo corpo tem UMA abertura por onde se vê o elemento aceso lá dentro (fresta, janela, boca, barriga de vidro). É o acento de cor, o ponto para onde o olho vai.
4. **Aros de latão (Hoops).** Onde duas partes se encontram há um aro claro de latão (pescoço, ombros, quadril). É a "costura" à vista: mostra que a criatura é montada e onde cada peça troca.
5. **Mark = plaqueta do criador.** A marca é uma plaqueta de latão pendurada por um cordão no aro de trás, cada uma com um formato (olho, ferradura, prego, pedra de amolar…). É a marca de procedência, como a que o artesão batia na peça.
6. **Olho de oficina.** Olhos grandes creme com pupila QUADRADA ameixa de 2×2 px e um brilho de 1 px. Igual em todos: é a nossa "letra".
7. **Uma forma grande e um traço que quebra o contorno.** Formas de objeto são geométricas e diferentes entre si; por isso as nove sombras não se confundem.
8. **Três cores e um acento.** Cor do elemento como massa, um neutro do material (vime, ferro, pedra, vidro), creme de luz; acento só na brasa de dentro. Nunca dourado de raridade no corpo (o latão dos aros é ocre apagado `#C9A45C`, não ouro).
9. **Tom.** Peças de feira simpáticas, redondas nos cantos, nada de ferrugem, osso ou sombra. Aventura de sábado de manhã.
10. **Nome.** Duas palavras do ofício coladas, 2–3 sílabas, com som de batida ou de sopro.

**Por que gruda:** objeto feito à mão tem sombra de objeto (bigorna, jarro, guarita), que ninguém confunde com bicho; e a frase sai pronta ("a bigorna que virou bezerro"). **Por que casa com partes que se cruzam:** coisa de oficina É montada — tampa, alça, bico, pé. Trocar a tampa de um jarro pela de uma guarita parece natural; trocar a cabeça de uma raposa pela de um pássaro parece erro. Os aros mostram a emenda e a plaqueta mostra a linhagem: para quem coleciona e cruza, procedência à vista é o que dá valor.

**Descartadas por lembrarem coisa conhecida (registro):** bule ou xícara assombrada, vela ou lustre fantasma, sino de bronze, espada e escudo vivos, molho de chaves, engrenagens, saco de lixo (objetos-criatura de uma franquia famosa de monstros); chama na ponta do rabo (idem); galo de cata-vento (vira pintinho de novo); espantalho; bicho-preguiça e tamanduá (bichos sul-americanos, recusa do dono de 10:05); golem de pedra genérico.

## 2. As partes (o mesmo desenho em qualquer corpo)

Uma parte tem UM desenho só, em qualquer monstro. As partes repetidas nos 9 de hoje (`cab_botao`, `br_agulha`, `pe_tamanco`, `bo_olho_de_vidro`) são a prova à vista de que as peças trocam.

| id | Nome novo (apelido) | Elemento | Forma |
|---|---|---|---|
| `cab_botao` | **Mace Burr** (Burr) | Bloom | cabeça-bola de carrapicho com 5 pontas, como cabeça de maça de torneio |
| `cab_brim` | **Ram Cap** (Ram) | Bloom | ponta de tronco ferrada, com um chifre em caracol feito de anéis de árvore |
| `cab_ziper` | **Oven Maw** (Maw) | Ember | bocarra de porta de forno com dentes de tijolo, acesa por dentro |
| `cab_desfiada` | **Plume Helm** (Plume) | Tide | elmo de torneio com penacho de água que cai para trás |
| `cab_gorro` | **Gate Head** (Gate) | Stone | guarita com três ameias e queixo de grade de portão |
| `cab_feltro` | **Horn Snout** (Horn) | Gale | cara redonda com focinho de corneta aberta |
| `cab_veu` | **Censer Lid** (Lid) | Mist | tampa furada em cone, com duas orelhinhas redondas |
| `cab_abafada` | **Cork Head** (Cork) | Mist | cúpula de vidro com rolha na boca e olho em torre |
| `br_rasgado` | **Burr Flails** (Flail) | Bloom | dois manguais: corda de cipó com bola de carrapicho |
| `br_cadarco` | **Hook Chain** (Hook) | Ember | corrente de forja com gancho em brasa |
| `br_agulha` | **Tilt Lance** (Lance) | Tide | lança de justa azul, com guarda-mão redondo |
| `br_cetim` | **Angler Rod** (Rod) | Tide | vara de pescar com linha e anzol |
| `br_abraco` | **Gate Leaves** (Gate) | Stone | duas folhas de portão de madeira e pedra |
| `br_cruz` | **Sail Paddles** (Sail) | Gale | pás de vela de moinho |
| `br_alfinete` | **Fletch Fins** (Fletch) | Gale | penas de flecha amarelas, em par |
| `br_nevoa` | **Smoke Sleeves** (Sleeve) | Mist | mangas de fumaça que caem retas e enrolam na ponta |
| `pe_rebite` | **Root Claws** (Root) | Bloom | pés curtos com garra de raiz |
| `pe_tamanco` | **Hammer Hooves** (Hammer) | Ember | cada pé é uma cabeça de martelo, face em brasa |
| `pe_sola` | **Cinder Wheels** (Wheel) | Ember | rodas de carreta chamuscadas, cubo aceso |
| `pe_cetim` | **Wave Rocker** (Rocker) | Tide | balanço em meia-lua, como onda |
| `pe_novelo` | **Millstone** (Mill) | Stone | uma mó só, que rola |
| `pe_rolo` | **Pestle Feet** (Pestle) | Stone | dois pés de pilão de pedra |
| `pe_remendo` | **Pinwheel Feet** (Spin) | Gale | pés de cata-vento |
| `pe_ultimo` | **Smoke Tail** (Wisp) | Mist | sem pernas; rabo de fumaça em S |

Plaquetas (Mark): `agulha_afiada` **Whet Mark** (cunha de pedra de amolar) · `botao_reserva` **Lucky Shoe** (ferradura) · `espinho` **Nail Mark** (estrela de prego) · `olho_de_vidro` **Lens Mark** (lente redonda com ponto) · `pe_de_chumbo` **Plumb Mark** (peso de prumo) · `remendo_vivo` **Sprig Mark** (raminho de três folhas) · `rancor` **Horn Mark** (cornetinha) · `bolso_de_linha` **Pouch Mark** (saquinho). As partes que ainda não aparecem nos 9 seguem a mesma regra (oficina do elemento) e ficam para depois do piloto.

**Sugestão para o dono (não aplicada): nomes dos elementos.** Manteria Bloom, Tide, Stone, Gale, Mist, Ember: são comuns, mas se entendem sozinhos e a roda já tem frase. A identidade vem das oficinas, não do nome do elemento.

## 3. Os 9 monstros

Paleta de todos: contorno `#2B1E3A`, luz `#F7F1E3`, latão dos aros `#C9A45C`. Abaixo, as 3 cores + o acento de cada um.

### 3.1 `rasgao` → **Thwick** (Bloom, Common)
- **Frase:** um cesto de vime de feira que criou pés e gira dois manguais de carrapicho.
- **Duas ideias:** cesto de vime + ouriço briguento.
- **Forma:** trapézio de boca larga. **Traço exagerado:** os dois manguais (um no alto, atrás; um na frente).
- **Personalidade:** briguento, miúdo, incansável. **Papel:** Front que abre a defesa (Exposed e quebra de Guard).
- **Paleta:** vime `#B8925A` · Bloom `#4CB944` · folha funda `#3E6B48` · acento: broto claro `#C8F06A` aceso entre as tiras do cesto.
- **Partes:** head Mace Burr · arms Burr Flails · legs Root Claws · body **Wicker Trug** (cesto trançado com aro na boca) · mark Whet Mark.
- **Nome:** Thwick (thwack + wicker). Reservas: Burrflail, Trugget. Não manteria Burrlet (nome de bichinho qualquer).
- **Linhagem:** filhote = cestinha de colher amora com um mangual só; maduro = balaio grande de colheita com três manguais e roseira saindo pela boca.
- **Não pode parecer:** raposa, javali, ouriço comum, moita com olhos.

### 3.2 `brigao` → **Rambark** (Bloom, Rare)
- **Frase:** um tronco de aríete de cerco que brotou e virou carneiro (em inglês, aríete e carneiro são a mesma palavra: ram).
- **Duas ideias:** aríete sobre rodas + carneiro.
- **Forma:** barra deitada. **Traço exagerado:** um chifre em caracol gigante, maior que a cabeça.
- **Personalidade:** teimoso, estabanado, leal. **Papel:** Front que bate forte e se machuca junto.
- **Paleta:** casca `#8A5E3C` · Bloom `#4CB944` · ferro `#6E6A7A` · acento: anéis do chifre em verde-claro `#C8F06A`.
- **Partes:** head Ram Cap · arms **Fletch Fins** (Gale: penas de flecha amarelas `#E8C547` espetadas na traseira do tronco) · legs **Cinder Wheels** (Ember: rodas pretas com cubo laranja `#F05A3C`) · body **Siege Log** (tronco fino com um broto) · mark Lucky Shoe.
- **Nome:** Rambark (ram + bark). Reservas: Siegeling, Buntlog. Não manteria Ramblehorn (carneiro com musgo é genérico).
- **Linhagem:** filhote = toquinho com botão de chifre e rodinhas de carretel; maduro = aríete de portão com dois caracóis e telhadinho de escudos lisos.
- **Não pode parecer:** carneiro ou cabra de fazenda, cavalo, carro, tanque de guerra.

### 3.3 `mordedor` → **Kilnjaw** (Ember, Common)
- **Frase:** um forno de pão em cúpula que virou sapo, com a porta do forno como boca.
- **Duas ideias:** forno de padeiro + sapo.
- **Forma:** cúpula baixa e larga. **Traço exagerado:** chaminé torta nas costas soltando duas bolinhas de fumaça.
- **Personalidade:** guloso, rabugento, caseiro. **Papel:** Middle que puxa o alvo e morde quem está Exposed.
- **Paleta:** tijolo `#B5523A` · Ember `#F05A3C` · fuligem `#4A3A44` · acento: fogo amarelo `#FFD25A` no fundo da boca.
- **Partes:** head Oven Maw · arms Hook Chain · legs Hammer Hooves · body **Bread Kiln** (cúpula de tijolo com chaminé) · mark Nail Mark.
- **Nome:** Kilnjaw (kiln + jaw). Reservas: Ovengulp, Bricktoad. Não manteria Snapcoal (lagarto de carvão).
- **Linhagem:** filhote = forninho de bolo sem chaminé, boca que não fecha; maduro = forno de duas bocas com chaminé dupla.
- **Não pode parecer:** lagarto, dinossauro, dragão, jacaré, tartaruga de casco em brasa.

### 3.4 `pisoteador` → **Bickern** (Ember, Rare)
- **Frase:** uma bigorna que virou bezerro bravo: o corno da bigorna é o rabo dele.
- **Duas ideias:** bigorna de ferreiro + bezerro de torneio. ("Bickern" é o nome antigo da bigorna de corno.)
- **Forma:** T de bigorna (mesa chata, cintura fina, base larga). **Traço exagerado:** a mesa da bigorna com o corno apontando para trás.
- **Personalidade:** exibido, esquentado, valente. **Papel:** Middle que bate em três elementos (a vitrine da mistura).
- **Paleta:** ferro `#6E6A7A` · Ember `#F05A3C` · ferro fundo `#4A3A44` · acento: ferradura em brasa `#FFD25A` em cima da mesa.
- **Partes:** head **Mace Burr** (Bloom: bola verde `#4CB944`, a mesma do Thwick) · arms **Tilt Lance** (Tide: lança azul `#2E8BEA`, a mesma do Tiltide) · legs Hammer Hooves (os mesmos do Kilnjaw) · body **Anvil** · mark Lens Mark.
- **Nome:** Bickern. Reservas: Anvull, Clangcalf. Não manteria Cindertusk.
- **Linhagem:** filhote = bigorninha de ourives de pernas bambas; maduro = bigorna de dois cornos com martelo-crina.
- **Não pode parecer:** touro ou búfalo comum, rinoceronte, robô, cavaleiro humano.

### 3.5 `desfiado` → **Tiltide** (Tide, Rare)
- **Frase:** um jarro de fonte que virou justador: elmo com penacho de água, lança, e um balanço de onda no lugar das pernas.
- **Duas ideias:** jarro de fonte + lontra escudeira (só no focinho e nos bigodes).
- **Forma:** jarro em pé com alça furada (dá para ver através). **Traço exagerado:** o penacho de água caindo para trás.
- **Personalidade:** exibido, galante, convencido. **Papel:** Back que acerta todos e troca de lugar.
- **Paleta:** louça azul `#2E8BEA` · pérola `#DCEBFA` · azul fundo `#1F5FA8` · acento: espuma branca `#FFFFFF` no penacho.
- **Partes:** head Plume Helm · arms Tilt Lance · legs Wave Rocker · body **Fountain Ewer** (jarro com alça) · mark Lens Mark.
- **Nome:** Tiltide (tilt = justa + tide). Reservas: Spoutlance, Jugallant. Não manteria Ripplance.
- **Linhagem:** filhote = canequinha com esguicho e palito de lança; maduro = fonte de dois andares com dois penachos.
- **Não pode parecer:** cavalo-marinho, sereia, peixe comum, cavaleiro humano de armadura.

### 3.6 `embolado` → **Portcully** (Stone, Common)
- **Frase:** uma guarita de castelo que virou buldogue: os dentes são a grade do portão e ele anda rolando numa mó.
- **Duas ideias:** guarita com portão + buldogue de guarda.
- **Forma:** bloco quadrado. **Traço exagerado:** as três ameias no alto da cabeça, com o queixo de grade para a frente.
- **Personalidade:** teimoso, fiel, dorminhoco. **Papel:** Front que protege o time.
- **Paleta:** pedra `#B07A4A` · pedra clara `#C9C2B8` · madeira `#6B4A3A` · acento: tocha `#FFD25A` na seteira do peito.
- **Partes:** head Gate Head · arms Gate Leaves · legs Millstone · body **Keep Block** (bloco de pedra com seteira e musgo) · mark Plumb Mark.
- **Nome:** Portcully (portcullis + bully). Reservas: Moatmutt, Rookruff. Não manteria Cobblepup.
- **Linhagem:** filhote = marco de pedra com uma ameia só e roda de amolar; maduro = portão duplo com duas torres e ponte levadiça como língua.
- **Não pode parecer:** menino de chapéu, golem de pedra, torre de xadrez, caminhão, tartaruga.

### 3.7 `cascudo` → **Skirlet** (Gale, Rare)
- **Frase:** um fole de gaita que virou bichinho gordo e cura o time tocando.
- **Duas ideias:** gaita de foles + arganaz gordo.
- **Forma:** oval largo, deitado. **Traço exagerado:** três tubos em leque saindo das costas.
- **Personalidade:** mandão, cuidadoso, barulhento. **Papel:** Back que cura e acelera.
- **Paleta:** Gale `#E8C547` · xadrez de madeira `#6B4A3A` · creme `#F7F1E3` · acento: risco de vento branco-azulado `#DFF6FF` na boca da corneta.
- **Partes:** head Horn Snout · arms Sail Paddles · legs Pinwheel Feet · body **Piper's Bag** (fole redondo que enche e esvazia) · mark Sprig Mark.
- **Nome:** Skirlet (skirl = o som da gaita). Reservas: Dronelet, Huffpipe. Não manteria Breezle.
- **Linhagem:** filhote = apito de barro com um tubo só; maduro = órgão de feira com cinco tubos.
- **Não pode parecer:** pintinho, coruja, galinha, porco comum, polvo.

### 3.8 `assombrado` → **Lullfume** (Mist, Common)
- **Frase:** um incensário de corrente que dorme pendurado na própria fumaça.
- **Duas ideias:** incensário de corrente + arganaz dormindo.
- **Forma:** linha em pé com uma gota pequena (o menor e mais fino do elenco). **Traço exagerado:** a corrente que sobe até a nuvenzinha de onde ele pende.
- **Personalidade:** sonolento, tímido, rancoroso. **Papel:** Middle que some e dá o golpe final no Last Stand.
- **Paleta:** Mist `#A98BE8` · estanho `#8E8AA6` · lilás fundo `#6A55B0` · acento: brasa rosa `#FF9EC4` nos furos da tampa.
- **Partes:** head Censer Lid · arms Smoke Sleeves · legs Smoke Tail · body **Censer Orb** (bola furada) · mark Horn Mark.
- **Nome:** Lullfume (lull + fume). Reservas: Thurrin, Dozechain. Não manteria Wispurr.
- **Linhagem:** filhote = dedal de incenso com um fiozinho de fumaça; maduro = incensário de três correntes com cauda comprida.
- **Não pode parecer:** gato, morcego, fantasma de lençol, mariposa, fada.

### 3.9 `mudo` → **Mumflask** (Mist, Common)
- **Frase:** um frasco de boticário de rolha na boca que guarda luz na barriga de vidro e pesca com vara.
- **Duas ideias:** alambique de botica + camaleão calado.
- **Forma:** gota em pé. **Traço exagerado:** a serpentina de cobre em espiral no lugar do rabo.
- **Personalidade:** calado, paciente, generoso. **Papel:** Back que gera Glow e pesca quem está atrás.
- **Paleta:** Mist `#A98BE8` · vidro `#DCD3F7` · cobre `#C77B4A` · acento: luz âmbar `#FFD25A` na barriga.
- **Partes:** head Cork Head · arms **Angler Rod** (Tide: vara azul `#2E8BEA`) · legs **Pestle Feet** (Stone: pilões ocre `#B07A4A`) · body **Still Flask** (frasco redondo de vidro) · mark Pouch Mark.
- **Nome:** Mumflask (mum = calado + flask). Reservas: Corklume, Hushvial. Não manteria Lanternewt.
- **Linhagem:** filhote = vidrinho de amostra com rolha grande demais; maduro = alambique de dois bojos com serpentina dupla.
- **Não pode parecer:** salamandra, peixe-lanterna, lâmpada, camaleão verde comum, fantasma de vidro.

## 4. Folha de sombras (a prova da sombra)

`arte/piloto-monstros/folha-sombras.png`, feita por `arte/piloto-monstros/sombras.py` (formas desenhadas por código, 64×64, ×4; embaixo, cada uma reduzida a 32 px). Ordem: Thwick, Rambark, Kilnjaw, Bickern, Tiltide, Portcully, Skirlet, Lullfume, Mumflask.

O que conferi olhando a folha (3 voltas):
- Nenhum par se confunde: trapézio com manguais · barra com caracol · cúpula com chaminé · T de bigorna · jarro com alça furada · bloco com ameias · oval com três tubos · linha pendurada · gota com espiral.
- Refeito: as mangas do Lullfume abriam como asa de morcego (agora caem retas); o balanço do Tiltide se fundia com o corpo (agora é meia-lua solta).
- Fraquezas honestas: o Tiltide lembra uma âncora em 32 px (serve ao elemento, mas o jarro precisa aparecer na cor); o Portcully lembra um caminhãozinho se a cabeça não tiver cara (olhos e grade resolvem na arte); Bickern e Tiltide usam a mesma lança (de propósito: uma aponta para baixo, a outra para cima).
- Com `--soltas PASTA` o script salva cada sombra em 64×64, para servir de guia ao gerador (seção 7, risco 1).

## 5. Os 6 do piloto e os pedidos de arte

**Escolha:** Portcully, Bickern, Skirlet × Rambark, Lullfume, Tiltide.
- Um de cada elemento (Stone, Ember, Gale, Bloom, Mist, Tide): a roda inteira aparece na luta.
- Bickern e Rambark trazem partes de três elementos: a mistura à vista, que é o que o jogo vende.
- As seis sombras mais diferentes entre si (bloco, T, oval, barra, linha, jarro) e os dois trocadilhos mais fortes (Rambark, Portcully).
- Dois trios com Front, Middle e Back: Portcully / Bickern / Skirlet contra Rambark / Lullfume / Tiltide.
- Ficam para depois: Thwick, Kilnjaw, Mumflask. O diretor ajusta a conta do piloto (hoje ela usa `embolado`, `mordedor`, `cascudo`, `rasgao`, `assombrado`, `desfiado`: trocam `mordedor` por `pisoteador` e `rasgao` por `brigao`).

**Prefixo igual em todos (S):**
`pixel art game sprite, 64x64, side view facing right, full body, a living handcrafted OBJECT creature (not an animal), chunky readable shapes, large cream eyes with square dark pupils, 1px dark plum outline (#2B1E3A), flat 3-tone shading, light from top-left, pale brass rings where body parts join, small brass tag hanging from the rear ring, bright saturday-morning cartoon mood, transparent background, no text, no border, no ground, no human`

| Monstro | Pedido (depois de S) | Tentativas |
|---|---|---|
| **Portcully** | `a walking stone castle gatehouse shaped like a square block, with a bulldog underbite made of an iron portcullis grille, three square battlements on top of its head, sleepy stubborn eyes, two wooden gate doors as arms, rolling on one single round millstone instead of legs, a small arrow-slit window on the chest glowing warm yellow, ochre-brown stone with light grey trim and green moss patches. avoid: boy, child, hat, human face, golem with fists, turtle, lizard tail, truck` | 5 |
| **Bickern** | `a blacksmith anvil that became a proud little bull calf, the body IS an anvil in profile: flat table top, narrow waist, wide base, the anvil's pointed horn sticks out backwards like a tail, a glowing orange horseshoe resting on its back, four short legs ending in blocky hammer-head hooves with glowing faces, head is a round green thistle burr ball with five spikes like a mace head, one long blue jousting lance arm pointing forward, dark iron grey body with red-orange cracks, cocky grin. avoid: realistic bull, rhino, dinosaur, robot, knight, fur` | 7 |
| **Skirlet** | `a plump living bagpipe, a wide round golden-yellow bag body with a brown tartan patch, three long wooden drone pipes fanning up and back from its shoulders, small round face with a flared brass horn as snout, tiny round ears, two little lattice windmill-sail paddles as arms, feet are small spinning pinwheels, pale wind swirl coming out of the horn, bossy caring frown. avoid: chick, bird, owl, beak, feathers, wings, pig, octopus` | 5 |
| **Rambark** | `a medieval battering ram log that sprouted and became a ram, long horizontal brown bark log body with one small green sprout, iron-capped front end as the face with ONE enormous spiral horn made of pale green tree rings bigger than the head, rolling on two charred black cart wheels with glowing orange hubs, two golden-yellow arrow fletching feathers standing up at the rear, stubborn clumsy eyes. avoid: sheep wool, goat, horse, four animal legs, car, tank, cannon` | 6 |
| **Lullfume** | `a small round pewter incense censer creature hanging from a short chain, asleep, pierced cone lid as head with two tiny round ears and closed sleepy eyes, pink ember glow in the holes of the lid, long straight drooping lilac smoke sleeves as arms curling at the tips, no legs, an S-shaped lilac smoke tail trailing down, floating, lots of empty space above. avoid: cat, bat, bat wings, moth wings, ghost sheet, fairy, hood, legs` | 6 |
| **Tiltide** | `a tall blue ceramic fountain pitcher that became a tiny jousting knight, upright jug body with a big open loop handle on its back, wearing a tournament helm with a tall plume made of falling water sweeping backwards, a short otter muzzle with whiskers poking from the visor, one long blue jousting lance held upward, no legs: it rides a crescent-shaped rocking wave, pearl white trim, white foam on the plume, smug show-off smile. avoid: seahorse, mermaid, fish, curled tail, human knight, horse, sword` | 7 |

**Ataque (referência = o parado escolhido, ferramenta de editar que mantém o personagem):** `same creature, attack pose: leaning forward, [Portcully: slams gate doors shut / Bickern: thrusts lance, hooves off the ground / Skirlet: bag squeezed flat, big wind blast from horn / Rambark: charging head-first, wheels blurred / Lullfume: eyes open and angry, swinging forward on its chain, sleeves thrown ahead / Tiltide: lance lowered, rocking forward on the wave]`

**Conta da rodada 2 (teto 70):** parados 36 (5+7+5+6+6+7) · ataques 18 (3 por monstro) · folga 16 = **70**. As 4 primeiras gerações são do Portcully (o mais fácil): se o estilo fechar, ele vira a referência de estilo dos outros; se não fechar em 5, parar e voltar ao diretor antes de gastar o resto.

**Depois de gerar, por código (sem gasto):** plaqueta do Mark no formato certo, aros de latão onde faltarem, pupila quadrada, contorno em `#2B1E3A`, e a corrente com a nuvenzinha do Lullfume (linha fina o gerador não acerta).

**Critério de aprovação (as três provas, nota 0–10 cada; aprova com 7 ou mais nas três):**
1. **Sombra:** pintado de preto e reduzido a 32 px, bate com a sombra da folha e não se confunde com nenhum outro.
2. **Frase:** quem nunca viu descreve com a frase do conceito ("é uma bigorna que virou bezerro"). Se a descrição for um bicho ("é um touro"), reprova.
3. **Desejo:** na miniatura de 64 px ao lado dos seis da primeira rodada, é o que a pessoa aponta.
E mais: as partes de outro elemento aparecem com a cor do elemento delas; nada da lista "avoid" apareceu; nada lembra criatura conhecida.

## 6. A mistura de partes no filhote

O que torna o cruzamento desejável à vista:
- **A emenda aparece.** Cada parte herdada encaixa num aro de latão. O filhote de Bickern com Tiltide pode ser um jarro de fonte com cabeça de carrapicho e cascos de martelo: dá para apontar "a cabeça é do pai, o corpo é da mãe".
- **A parte vem com a cor da oficina dela.** Cascos de forja continuam pretos e laranja num corpo azul. Monstro de três cores vira troféu: quanto mais oficinas, mais raro de ver.
- **A plaqueta é a linhagem.** O formato do Mark e a origem ("from Bickern") aparecem na cena do ovo e na ficha.
- **O ovo já avisa.** A casca tem uma faixa com a textura do corpo que vem (vime, tijolo, louça, pedra, vidro): expectativa antes de rachar, sem entregar as outras partes.
- **Nome montado pelas peças.** Enquanto o jogador não batiza, o filhote se chama pelos apelidos (ex.: "Burr-Lance-Hammer").
- **Filhote de verdade.** O filhote nasce na forma pequena do corpo (seção 3, "filhote") e cresce para a forma do jogo; a madura fica como promessa para depois.

O que isso pede da arte depois do piloto (precisa de teto novo do dono; nada pedido agora):
1. Cada parte desenhada UMA vez, como camada solta, com ponto de encaixe no aro. O gerador não faz parte solta (lição de `docs/custos.md`): gerar o monstro inteiro, **cortar por código nos aros** e limpar à mão no código.
2. Três posturas de corpo (de pé, deitado sobre rodas ou patas, pendurado/flutuante), cada uma com os pontos de encaixe num arquivo de dados.
3. Os 12 corpos e as 32 partes restantes seguem a tabela de oficinas da seção 1.
4. Aros, plaquetas e olhos sempre por código: é o que garante a assinatura igual em qualquer combinação.

## 7. Notas honestas e riscos

**Primeira rodada: 3 de 10.** Pixel art limpo e contorno certo, mas sombra de bicho comum, nenhuma frase própria e um menino de chapéu no lugar de um monstro. Bom como teste da ferramenta, ruim como identidade.

**Segunda rodada, o que espero: 7 de 10** (8 se a guia de sombra funcionar). Os conceitos e as sombras são 8–9 no papel; o que tira ponto é o gerador.

`Trindade (desenho): D 86 · Cg 90 · Ch 88` — D: trocadilho e objeto dão o "quero esse"; Cg: tudo sai do mesmo reino de ofícios e nada lembra jogo existente; Ch: a mesma parte tem o mesmo desenho em todo monstro e a cor da parte é a do elemento dela.

**Os 3 maiores riscos:**
1. **O gerador puxa para o bicho.** Ele devolve o animal mais comum da frase (foi assim que "owl chick" virou pintinho) e ignora objeto estranho; linha fina, furo e peça de outra cor costumam sumir. Como contornar: o OBJETO vem primeiro e o bicho só como adjetivo; lista "avoid" com o que saiu antes; testar nas 4 primeiras gerações a sombra de 64×64 pintada em cores chapadas como imagem inicial em força média (a lição de força 300 = devolve igual continua valendo; se não ajudar, só texto); e fechar por código o que ele erra. **Bickern e Lullfume são os candidatos a desenho por código** (formas duras e linha fina): se não saírem em 7 e 6 tentativas, desenhar por código a partir da sombra, em vez de gastar a folga.
2. **Objeto sem cara vira coisa, não criatura.** Uma bigorna sem olhos é só uma bigorna. O olho de oficina grande, a expressão fixa e o jeito de andar (o fole que respira, o incensário que balança) são obrigatórios; sem isso cai a prova do desejo.
3. **Originalidade e nomes.** Objetos que viram criatura existem em outros jogos; por isso a lista de descartadas e a regra dos aros, da plaqueta e da brasa de dentro, que são só nossas. Os nomes passaram por busca na internet, não por registro de marca. E o trabalho cresce: 44 partes com desenho único pedem um lote de arte bem maior que o piloto.

## 8. Nomes para o dono escolher

Conferência: busca na internet em 15/11/2026 por cada nome entre aspas + "game" — nenhum jogo com esses nomes apareceu (apareceram só vizinhos: Hatchstead, Kilnworth, Guildhall). Os 9 nomes de monstro também não apareceram em jogo. Falta conferir lojas de aplicativo, marca registrada e domínio antes de escolher.

**Nome do JOGO (5 opções, melhor primeiro):**

| Nome | Por quê | Nota |
|---|---|---|
| **Hatchwright** | hatch (chocar) + wright (artesão, como em shipwright). Diz o jogo inteiro: você fabrica monstros que nascem de ovos. | 92 |
| **Wroughtkin** | wrought (feito à mão) + kin (família). Fala de linhagem e de ofício. | 86 |
| **Tiltkin** | tilt (justa de torneio) + kin. Curto, soa como mascote. | 82 |
| **Kilnkin** | kiln (forno) + kin. Sonoro, mas puxa só para o fogo. | 76 |
| **Guildhatch** | guild + hatch. Claro, porém parecido com nomes de jogos de guilda. | 70 |

**Substitutos dos três termos:**

| Hoje | Opções (melhor primeiro) | Por quê |
|---|---|---|
| "King's Road" | **The Pennant Road** · The Tourney Trail · The Tiltway | a estrada das bandeirinhas dos torneios; sem rei no nome |
| "Keeper" | **Wright** · Nestwright · Broodwright | quem fabrica e cria; casa com Hatchwright ("You are a Wright") |
| "Hearthfield" | **Maypole Green** · Kettlegreen · Oatbarrow | gramado da vila com mastro de festa; longe de "Hearth…" |
