import sys
from pm import *
S = "pixel art sprite, 64x64, side view, facing right, full body, cute chunky fantasy creature, bright saturated colors, 1px dark plum outline (#2B1E3A), simple 3-tone shading, light from top-left, transparent background, no text, no border"
D = {
 'embolado': "round stone pup monster, wears a stone cap with a brim, wide flat slab arms, lower half is a rolling boulder, mossy patches, root rune on belly, ochre stone colors",
 'mordedor': "low lizard monster with a huge jaw of coal teeth, two fiery whip tendrils from shoulders, black hooves with lava cracks, black rock chest with red glowing cracks, row of obsidian spikes on its back",
 'cascudo': "round fluffy golden owl chick monster, thick feather eyebrows, wings spread with wind ribbons, small light talons, small moss tuft emblem on chest",
 'rasgao': "small four-legged fox-boar pup covered in green burrs, tiny white tusks, two thorny vines from its shoulders, stubby legs with root claws, bark barrel body with leaves, three-scratch rune on flank",
 'assombrado': "floating lavender cat-moth monster, misty hood over face with glowing eyes, translucent moth wings, no legs, curling smoke tail, tiny lilac flame crown on chest",
 'desfiado': "upright seahorse-like knight monster in S-curve pose, head crest shaped like a breaking wave with white foam, long needle-like blue fins as arms, curled tail as legs, pearl shell breastplate, eye-shaped crest on chest",
}
def idle(mid, tent, ferr='pixflux', extra='', seed=None):
    corpo = dict(description=S + ', ' + D[mid] + extra, image_size={'width': 64, 'height': 64}, no_background=True,
                 outline='single color black outline', shading='basic shading', detail='medium detail', view='side', direction='east', text_guidance_scale=8)
    if seed is not None: corpo['seed'] = seed
    return gerar('/create-image-' + ferr, corpo, mid + '-idle', tent, f'{mid}-idle-{tent}.png')
if __name__ == '__main__':
    mid, tent, ferr = sys.argv[1], int(sys.argv[2]), sys.argv[3] if len(sys.argv) > 3 else 'pixflux'
    idle(mid, tent, ferr)
