import sys
from PIL import Image
for a in sys.argv[1:]:
    im = Image.open(a).convert('RGBA'); al = im.getchannel('A')
    semi = sum(1 for p in al.getdata() if 0 < p < 255)
    b = al.getbbox(); print(a.split('/')[-1], im.size, 'bbox', b, 'larg', b[2]-b[0], 'alt', b[3]-b[1], 'semi', semi)
