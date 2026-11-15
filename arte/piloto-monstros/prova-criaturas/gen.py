"""Uma geracao por chamada (pixflux). uso (da pasta arte/piloto-monstros): python3 -I prova-criaturas/gen.py embolado|brigao tent texto|guia [forca]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pm

S = ("pixel art game sprite, 64x64, side view facing right, full body, a living handcrafted OBJECT creature (not an animal), chunky readable shapes, "
     "large cream eyes with square dark pupils, 1px dark plum outline (#2B1E3A), flat 3-tone shading, light from top-left, pale brass rings where body parts join, "
     "small brass tag hanging from the rear ring, bright saturday-morning cartoon mood, transparent background, no text, no border, no ground, no human")
P = {
    'embolado': "a walking stone castle gatehouse shaped like a square block, with a bulldog underbite made of an iron portcullis grille, three square battlements on top of its head, sleepy stubborn eyes, two wooden gate doors as arms, rolling on one single round millstone instead of legs, a small arrow-slit window on the chest glowing warm yellow, ochre-brown stone with light grey trim and green moss patches. avoid: boy, child, hat, human face, golem with fists, turtle, lizard tail, truck",
    'brigao': "a medieval battering ram log that sprouted and became a ram, long horizontal brown bark log body with one small green sprout, iron-capped front end as the face with ONE enormous spiral horn made of pale green tree rings bigger than the head, rolling on two charred black cart wheels with glowing orange hubs, two golden-yellow arrow fletching feathers standing up at the rear, stubborn clumsy eyes. avoid: sheep wool, goat, horse, four animal legs, car, tank, cannon",
}
item, tent, modo = sys.argv[1], int(sys.argv[2]), sys.argv[3]
EXTRA = os.environ.get('EXTRA_PEDIDO')
corpo = dict(description=S + ', ' + (EXTRA or P[item]), image_size={'width': 64, 'height': 64}, no_background=True,
             outline='single color black outline', shading='basic shading', detail='medium detail', view='side', direction='east', text_guidance_scale=8)
nota = 'so texto'
if modo == 'guia':
    f = int(sys.argv[4])
    corpo['init_image'] = pm.b64(os.path.join(pm.AQUI, 'prova-criaturas/brutos/guia-%s.png' % item))
    corpo['init_image_strength'] = f
    nota = 'guia sombra pintada forca %d' % f
nome = '%s-%s%s-%d.png' % (item, modo, sys.argv[4] if modo == 'guia' else '', tent)
pm.gerar('/create-image-pixflux', corpo, 'prova-' + item, tent, 'prova-criaturas/brutos/' + nome if False else '../prova-criaturas/brutos/' + nome, nota)
