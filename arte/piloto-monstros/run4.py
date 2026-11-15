import sys
from mon import *
EX = ", chibi proportions, big head, big friendly eyes, cheerful, round chubby shapes, profile view facing right, on plain empty ground, no grass patch, cute and charming"
COR = {'cascudo': ", golden yellow and cream feathers", 'rasgao': ", green and brown colors", 'assombrado': ", lavender and lilac colors", 'desfiado': ", bright blue and white colors"}
mid = sys.argv[1]
for t in sys.argv[2:]:
    idle(mid, int(t), extra=EX + COR[mid])
