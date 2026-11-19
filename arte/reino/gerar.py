"""Pedidos de arte do Reino ao gerador. Uma chamada por vez:
python3 -B arte/reino/gerar.py <peca> <tentativa> [nota]
Cada peca: (ferramenta, largura, altura, fundo_transparente, texto em ingles)."""
import sys
sys.dont_write_bytecode = True
from pm import gerar, b64, BRUTO
import os

ESTILO = ("pixel art game sprite, side view, facing right, full body, chunky chibi proportions with big head, "
          "bright saturated storybook colors, single dark plum outline, 3-tone cel shading, light from top-left, "
          "clean readable silhouette, transparent background, no text, no border")
PREDIO = ("pixel art game building sprite, side view, front facade, flat ground line at the bottom, "
          "bright saturated storybook colors, single dark plum outline, 3-tone cel shading, light from top-left, "
          "transparent background, no text, no symbols, plain solid-color pennants")

P = {
 # tropas aliadas (humor: gente comum de aldeia que virou exercito)
 'lanceiro':  ('pixflux', 32, 32, True, ESTILO + ", tiny medieval spearman soldier, round steel kettle helmet, blue tunic, long wooden spear held upright, small round wooden shield, cheerful determined face"),
 'lanceiro24': ('pixen', 24, 24, True, "tiny pixel art medieval spearman soldier, side view facing right, big head, round steel helmet, blue tunic, wooden spear, dark outline, bright colors"),
 'arqueiro':  ('pixflux', 32, 32, True, ESTILO + ", tiny medieval archer, green pointed hood, leather vest, wooden longbow in hand, quiver on back, focused squint"),
 'cavaleiro': ('pixflux', 32, 32, True, ESTILO + ", tiny stout knight in a bucket helmet with a red feather plume, shiny steel armor, big kite shield plain blue, short sword"),
 'mago':      ('pixflux', 32, 32, True, ESTILO + ", tiny old wizard, oversized floppy orange hat covering his eyes, long white beard to the feet, wooden staff with a glowing teal crystal"),
 'campones':  ('pixflux', 32, 32, True, ESTILO + ", tiny angry peasant farmer with a pitchfork, straw hat, patched brown trousers, a cooking pot lid as a shield"),
 # invasores (roxo-noite + lima acida, nunca usados no reino)
 'invasor':   ('pixflux', 32, 32, True, ESTILO.replace('facing right', 'facing left') + ", tiny mischievous purple imp raider, dark violet skin, glowing lime-green eyes, two small curved horns, ragged black loincloth, jagged bone club, toothy grin"),
 'invasor-bruto': ('pixflux', 48, 48, True, ESTILO.replace('facing right', 'facing left') + ", bulky purple ogre brute raider, dark violet skin, glowing lime-green eyes, one broken horn, spiked iron shoulder pad, huge wooden mallet, underbite with tusks"),
 'chefe':     ('pixflux', 80, 80, True, ESTILO.replace('facing right', 'facing left') + ", giant fat ogre warlord boss, dark violet skin, glowing lime-green eyes, crooked stolen golden crown too small for his head, torn crimson cape, enormous spiked iron mace, belly armor made of a castle door, menacing grin"),
 # reino
 'castelo':   ('pixflux', 96, 96, True, PREDIO + ", cozy medieval stone castle keep, three round towers with blue cone roofs, big arched wooden gate, warm lit windows, cream stone walls with ivy"),
 'portao':    ('pixflux', 64, 64, True, PREDIO + ", wooden palisade gatehouse, two log watchtowers with small roofs, open double gate, sharpened log wall, torch on each side"),
 'quartel':   ('pixflux', 48, 48, True, PREDIO + ", small medieval barracks tent, red and white striped canvas, weapon rack with spears beside it, wooden training dummy"),
 'moinho':    ('pixflux', 48, 48, True, PREDIO + ", small medieval windmill, round white tower, four cloth sails, orange shingle roof, little wooden door, sacks of grain"),
 'torre-mago': ('pixflux', 48, 48, True, PREDIO + ", small crooked wizard tower, leaning purple-blue stone, pointed teal roof bent at the tip, round glowing window, floating crystal on top"),
 'ferraria':  ('pixflux', 48, 48, True, PREDIO + ", small medieval blacksmith forge hut, stone chimney with orange glow, anvil in front, timber frame walls, thatched roof"),
 'tenda':     ('pixflux', 48, 48, True, PREDIO + ", small round army camp tent, green and cream striped canvas, straw archery target with arrows beside it, plain green pennant on top"),
 # cenario em planos (o ceu e do codigo)
 'plano-longe': ('pixflux', 320, 96, True, "pixel art parallax background layer, distant rolling mountains and far hills, soft blue-violet silhouettes, flat simple shapes, 3 tones, no sky, transparent background above the ridge line, no buildings, no text"),
 'plano-meio': ('pixflux', 320, 96, True, "pixel art parallax background layer, row of round storybook trees and green hills, a few tiny farm houses with orange roofs, bright greens, dark plum outline, 3-tone shading, no sky, transparent background above the tree line, no text"),
}

EDIT = {
 'lanceiro-golpe': ('lanceiro', "same soldier, same colors and size, lunging forward in an attack, spear thrust horizontally forward to the right at full stretch, front leg bent, shield pulled back"),
 'lanceiro-passo': ('lanceiro', "same soldier, same colors and size, walking to the right, mid-stride with legs wide apart, one foot forward and one foot back, spear upright on the shoulder"),
 'lanceiro-apanhou': ('lanceiro', "same soldier, same colors and size, hit and knocked backwards, leaning back, eyes shut tight, mouth open, helmet tilted, spear slipping from the hand"),
 # familia inteira a partir do MESMO boneco-base (prende proporcao e traco)
 'arqueiro-b': ('lanceiro', "same chibi character with the same proportions and outline, but now an archer: green pointed hood instead of the helmet, brown leather vest, holding a wooden longbow, quiver of arrows on the back, no spear, no shield"),
 'cavaleiro-b': ('lanceiro', "same chibi character with the same proportions and outline, but now a knight: closed steel bucket helmet with a red feather plume, full shiny steel armor, short sword raised, plain blue kite shield without any symbol, no spear"),
 'invasor-golpe': ('invasor-b', "same imp, same colors and size, facing left, swinging the bone club down hard in an attack, leaning forward to the left, mouth wide open, tail up"),
 'arqueiro-tiro': ('arqueiro-b', "same archer, same colors and size, bow raised and fully drawn, arrow nocked and aimed up and to the right, one eye closed"),
 'invasor-b': ('lanceiro', "same chibi proportions and outline, but now a mischievous imp raider facing left: dark violet skin, glowing lime-green eyes, two small curved horns, pointed ears, ragged black loincloth, jagged bone club, toothy grin, no helmet, no shield, no spear"),
}

# ---- PILOTO (R9): elenco inteiro por edicao do MESMO boneco-base
MESMO = "same chibi character with the same proportions, same face and same dark outline, facing right, "
EDIT.update({
 'porteiro': ('lanceiro', MESMO + "but now a doorman soldier: he carries a huge tall wooden plank door with iron hinges and a round iron knob in front of him as a shield, the door is taller than him and hides most of his small body, round steel helmet, blue tunic, no spear, no round shield"),
 'cozinheiro': ('lanceiro', MESMO + "but now a cook: tall white puffy chef hat instead of the helmet, orange tunic with a white apron, holding a black iron frying pan raised high above his head, no spear, no shield"),
 'fogueteiro': ('lanceiro', MESMO + "but now a runner with bright purple hood and purple tunic, pale skin, a wooden barrel strapped on his back with a lit sparkling fuse on top, running to the right leaning forward, no spear, no shield, no helmet"),
 'cozinheiro-golpe': ('cozinheiro', "same cook, same colors and size, swinging the frying pan down hard forward to the right at full stretch, leaning forward, front leg bent"),
 'porteiro-golpe': ('porteiro', "same doorman, same colors and size, shoving the big wooden door forward to the right, leaning forward, front leg bent"),
 'fogueteiro-passo': ('fogueteiro', "same runner, same colors and size, running to the right, the other leg forward, legs wide apart, barrel on the back"),
 'pernalta': ('invasor-b', "same imp, same colors, facing left, but now walking on two tall thin wooden stilts strapped under his feet, legs long, arms out for balance, no club"),
 'atirador': ('invasor-b', "same imp, same colors and size, facing left, but now holding a leather sling with a brown potato in it, a small sack of potatoes on his back, no club"),
 'atirador-tiro': ('atirador', "same imp, same colors and size, facing left, arm stretched forward throwing a brown potato to the left with the sling, leaning forward, mouth open"),
 'tampa': ('invasor-bruto-1', "same ogre, same colors and size, facing left, but now holding a big round iron cooking pot lid with a knob as a shield in front of him, an iron cooking pot worn as a helmet, wooden mallet in the other hand, no symbols"),
 'tampa-golpe': ('tampa', "same ogre, same colors and size, facing left, swinging the wooden mallet down hard to the left, leaning forward, mouth wide open, pot lid shield pulled back"),
 'gutbucket': ('chefe-1', "same giant fat ogre, same colors and size, facing left, but even wider round belly, a dented steel bucket worn on his head as a helmet instead of the crown, a white napkin bib tied around his neck instead of the cape, holding an enormous wooden spoon instead of the mace"),
 'gutbucket-golpe': ('gutbucket', "same giant fat ogre, same colors and size, facing left, swinging the enormous wooden spoon down hard to the left, leaning forward, mouth wide open"),
 'gutbucket-passo': ('gutbucket', "same giant fat ogre, same colors and size, facing left, walking to the left, mid-stride with one foot forward and one foot back, belly bouncing"),
})
FRENTE = ("pixel art game building sprite, flat front elevation view like a side-scroller platform game, straight-on, no perspective, no top-down, "
          "roof seen from the front as a simple triangle or trapezoid, flat ground line at the bottom, no grass base, no ground tile, "
          "bright saturated storybook colors, single dark outline, 3-tone cel shading, light from top-left, transparent background, no text, no symbols")
P.update({
 'smithy': ('pixflux', 48, 48, True, FRENTE + ", small medieval blacksmith forge hut, big stone chimney on the left, open front with glowing orange forge fire, iron anvil in front, timber frame walls, blue shingle roof"),
 'watchtower': ('pixflux', 48, 48, True, FRENTE + ", tall narrow wooden watchtower on four log legs, ladder, roofed lookout platform at the top with green shingle roof, plain solid green pennant, straw archery target at the base"),
 'cookhouse': ('pixflux', 48, 48, True, FRENTE + ", small cozy medieval cookhouse kitchen hut, orange shingle roof, fat brick chimney, big black cauldron of soup over a fire in front, hanging sausages, round window with warm light"),
})

# predios do piloto como FAMILIA: edicao da cookhouse (mesmo angulo de frente e mesmo traco)
CASA = "same pixel art style, same front view angle, same size and same outline, same small grass base, but now "
EDIT.update({
 'smithy-b': ('cookhouse-1', CASA + "a blacksmith forge: blue shingle roof instead of orange, big grey stone chimney, wide open front arch with a glowing orange forge fire inside, an iron anvil in front instead of the cauldron, no flowers"),
 'watchtower-b': ('cookhouse-1', CASA + "a tall narrow wooden watchtower: a lookout cabin with a green shingle roof on top of four tall log legs with cross beams and a ladder, a plain solid green pennant on a pole, a round straw archery target at the base instead of the cauldron, no chimney, no flowers"),
 'lanceiro-passo2': ('lanceiro', "same soldier with exactly the same big head, same helmet size, same body size, same colors and same shield, only the legs change: walking to the right, mid-stride with legs wide apart, one foot forward and one foot back, spear held upright"),
 'arqueiro-passo': ('arqueiro-b', "same archer, same colors and size, walking to the right, mid-stride with legs wide apart, one foot forward and one foot back, bow held low"),
 'cozinheiro-passo': ('cozinheiro', "same cook, same colors and size, walking to the right, mid-stride with legs wide apart, one foot forward and one foot back, frying pan still raised"),
 'invasor-passo': ('invasor-b', "same imp, same colors and size, facing left, walking to the left, mid-stride with legs wide apart, one foot forward and one foot back, club on the shoulder"),
 'atirador-passo': ('atirador', "same imp, same colors and size, facing left, walking to the left, mid-stride with legs wide apart, one foot forward and one foot back, sack on the back"),
 'tampa-passo': ('tampa', "same ogre, same colors and size, facing left, walking to the left, mid-stride with one foot forward and one foot back, pot lid shield in front"),
})

# ---- R11 (arte completa): as 7 tropas, 4 invasores e 3 chefes que faltavam, sempre por edicao de uma peca ja aceita
SEM = ", no spear, no shield, no helmet, no symbols"
IMP = "same imp, same violet skin, same lime-green eyes, same outline, facing left, "
OGRO = "same pixel art style, same dark violet skin, same glowing lime-green eyes, same outline, facing left, "
EDIT.update({
 'sirdent': ('lanceiro', MESMO + "but now one big stout knight: closed steel bucket helmet with a very tiny red feather plume, very round barrel-shaped dented steel armor like a ball, holding a huge broad sword upright in front, no shield, no spear, no symbols"),
 'vovo': ('lanceiro', MESMO + "but now a tiny old granny: grey hair bun, round glasses, green knitted shawl, long dark green dress to the feet, holding a gigantic wooden crossbow bigger than her, pointing to the right" + SEM),
 'falcoeira': ('lanceiro', MESMO + "but now a falconer girl: short green cape, green cap with one feather, one arm with a leather glove raised up high and a brown falcon perched on the glove" + SEM),
 'sopeiro': ('lanceiro', MESMO + "but now a soup carrier: orange tunic, white head scarf, a long wooden yoke pole across the shoulders with two wooden buckets of soup hanging, one on each side" + SEM),
 'torteiro': ('lanceiro', MESMO + "but now a baker: orange tunic, flat white baker cap, white apron, one arm pulled far back holding a round cream pie with a cherry on the open hand, ready to throw" + SEM),
 'ganso': ('lanceiro', "same pixel art style, same outline, same size, facing right, but replace the soldier with a plump white clockwork toy goose: long neck, orange beak, orange feet, a big brass wind-up key sticking out of its back, a bright pink scarf, brass rivets, no human, no weapon"),
 'faisqueiro': ('lanceiro', MESMO + "but now an old tinkerer wizard: tall crooked bright pink hat bent at the tip, wild spiky white beard standing on end, bright pink robe, holding a long wooden staff that ends in a two-pronged metal fork with a yellow spark" + SEM),
 'bloater': ('invasor-b', IMP + "but now hugely bloated and round like a balloon: enormous swollen round belly, puffed cheeks, tiny arms and tiny legs, no club"),
 'toupeira': ('invasor-b', IMP + "but now a digger: leather miner cap with a small lit candle on top, big pale digging claws, a wooden shovel on the shoulder, no club"),
 'tambor': ('invasor-b', IMP + "but now a drummer: a big round wooden war drum strapped on his belly, two drumsticks raised high, no club"),
 'curandeiro': ('invasor-b', IMP + "but now a quack doctor: tall crooked black top hat, long ragged coat, holding up a round glass bottle of bubbling lime-green potion, no club"),
 'nip': ('chefe-1', OGRO + "but now a tall lanky thin ogre tailor boss with long arms and a small head: red pincushion hat with pins, measuring tape around the neck, striped vest, holding gigantic open iron scissors taller than him, no crown, no cape, no mace"),
 'tuck': ('nip-1', "same tall lanky ogre tailor, same colors and size, facing left, but holding a gigantic steel sewing needle like a spear with a red thread through its eye instead of the scissors, a thimble worn as a hat instead of the pincushion"),
 'moleworth': ('chefe-1', OGRO + "but now a giant fat mole lady boss: dark violet fur, long pink snout, tiny glasses, enormous pale digging claws, a huge fancy wide lady hat with a big feather and flowers, pearl necklace, no crown, no cape, no mace"),
 'gobble-golpe': ('chefe-1', "same giant ogre king, same colors and size, facing left, swinging the enormous iron mace down hard to the left, leaning forward, mouth wide open, crown still on the head, cape flying"),
 'nip-golpe': ('nip-1', "same tall lanky ogre tailor, same colors and size, facing left, lunging forward to the left, snapping the gigantic scissors shut far in front of him, mouth wide open"),
 'moleworth-golpe': ('moleworth-1', "same giant mole lady, same colors and size, facing left, slashing down hard to the left with one enormous claw stretched forward, leaning forward, mouth wide open, hat still on"),
 'sirdent-golpe': ('sirdent-1', "same knight, same colors and size, swinging the huge sword down forward to the right at full stretch, leaning forward, front leg bent"),
 'torteiro-golpe': ('torteiro-1', "same baker, same colors and size, arm stretched far forward to the right after throwing, leaning forward, front leg bent, hand empty, no pie"),
 'falcoeira-golpe': ('falcoeira-1', "same falconer, same colors and size, arm pointing forward to the right, the brown falcon flying off forward with wings spread wide"),
})
CASA2 = "same pixel art style, same front view angle, same size and same outline, same small grass base, but now "
EDIT.update({
 'fletcher': ('cookhouse-1', CASA2 + "a fletcher's hut: green shingle roof instead of orange, no chimney, a bundle of long arrows leaning by the door, a wooden rack with bows in front instead of the cauldron, feathers hanging at the window, no flowers"),
 'market': ('cookhouse-1', CASA2 + "an open market stall: orange and cream striped cloth awning instead of the roof, wooden counter with baskets of apples, bread and a wheel of cheese, a small pile of gold coins, no chimney, no cauldron, no door"),
 'feasthall': ('cookhouse-1', CASA2 + "a wide grand feast hall: taller and wider, big orange shingle roof with two brick chimneys, large double wooden doors wide open with warm light inside, a long table with a roast in front instead of the cauldron"),
 'tinker': ('cookhouse-1', CASA2 + "a crooked tinker's workshop shed: bright pink shingle roof instead of orange, bent metal stovepipe chimney, brass gears and cogwheels on the wall, a workbench with tools and springs in front instead of the cauldron, no flowers"),
 'fuse': ('cookhouse-1', CASA2 + "a fireworks depot: bright pink shingle roof instead of orange, no chimney, stacked wooden powder barrels and rockets in front instead of the cauldron, coils of fuse rope hanging on the wall, a small warning lantern, no flowers"),
})
EDIT.update({
 'bunkhouse': ('cookhouse-1', CASA2 + "a soldiers' bunkhouse barracks: blue shingle roof instead of orange, no chimney, a wooden rack with spears and round shields in front instead of the cauldron, a straw training dummy, a small window with a bunk bed inside, no flowers, no symbols"),
 'sirdent-golpe2': ('sirdent-1', "same knight with exactly the same big helmet, same head size, same round body size and same colors, only the arms change: the huge sword swung down and pointing forward to the right at full stretch, leaning slightly forward"),
})
EDIT.update({
 'tampa-golpe2': ('tampa', "same ogre with exactly the same iron cooking pot helmet on the head, same head size, same body size, same colors and the same round pot lid shield held in front, only the mallet arm changes: the wooden mallet swung far forward and down to the left at full stretch, leaning slightly forward, mouth open"),
})

if __name__ == '__main__':
    peca, tent = sys.argv[1], int(sys.argv[2]); nota = sys.argv[3] if len(sys.argv) > 3 else ''
    if peca in EDIT:
        base, texto = EDIT[peca]
        gerar('/edit-image-pixen', dict(image=b64(os.path.join(AQUI := os.path.dirname(os.path.abspath(__file__)), 'bruto', base + '.png')), description=texto, no_background=True), peca, tent, f'{peca}-{tent}.png', nota)
    else:
        ferr, w, h, nb, texto = P[peca]
        corpo = dict(description=texto, image_size={'width': w, 'height': h}, no_background=nb)
        if ferr == 'pixflux':
            corpo.update(outline='single color black outline', shading='basic shading', detail='medium detail', text_guidance_scale=8)
            if w <= 80: corpo.update(view='side', direction='west' if 'facing left' in texto else 'east')
        else:
            corpo.update(outline='single color black outline', view='side', direction='east')
        gerar('/create-image-' + ferr, corpo, peca, tent, f'{peca}-{tent}.png', nota)
