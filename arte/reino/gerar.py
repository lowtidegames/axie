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
