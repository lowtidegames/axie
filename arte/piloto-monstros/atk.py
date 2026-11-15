import sys
from mon import *
from PIL import Image
Image.open('bruto/desfiado-idle-2.png').convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT).save('bruto/desfiado-idle-2-espelhado.png')
E = {'mordedor': 'mordedor-idle-4.png', 'cascudo': 'cascudo-idle-3.png', 'rasgao': 'rasgao-idle-3.png', 'assombrado': 'assombrado-idle-1.png', 'desfiado': 'desfiado-idle-2-espelhado.png'}
T = {'mordedor': "same creature lunging forward to bite, huge mouth wide open, leaning forward, spikes glowing brighter",
     'cascudo': "same creature diving forward in an attack, wings swept back, beak open, leaning forward",
     'rasgao': "same creature charging forward in an attack, head lowered, tusks forward, leaning forward",
     'assombrado': "same creature pouncing forward in an attack, claws out, mouth open, leaning forward, wings flared",
     'desfiado': "same creature lunging forward in an attack, needle fins pointed forward like lances, leaning forward, mouth open"}
for m in sys.argv[1:]:
    f = E[m]
    gerar('/edit-image-pixen', dict(image=b64('bruto/' + f), description=T[m], no_background=True), m + '-attack', 1, m + '-attack-1.png', 'edit-image-pixen sobre ' + f)
