import sys
from mon import S
from pm import *
tent = int(sys.argv[1])
D = "round boulder creature, small stone pup monster made of rocks, mossy patches, tiny stubby legs or rolling boulder base, big cute eyes, stone cap like a pebble on its head, ochre and gray stone colors, not a human, not a child"
corpo = dict(description=S + ', ' + D, image_size={'width': 64, 'height': 64}, no_background=True, outline='single color black outline', shading='basic shading', detail='medium detail', view='side', direction='east', text_guidance_scale=8)
gerar('/create-image-pixflux', corpo, 'embolado-idle-novo', tent, f'embolado-idle-novo-{tent}.png', 'prompt monstro de pedra, nao humano')
