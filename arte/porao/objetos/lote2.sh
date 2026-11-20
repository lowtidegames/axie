#!/bin/bash
# lote 2: moldura comum, retrato do Rugrigo e os 8 influenciadores (cada chamada = 1 geração)
cd "$(dirname "$0")"
g() { REGSUF=$1 python3 -I gerar.py plano "$1" 1 "$2" "$3" "$4" > log-$1-1.txt 2>&1 & }
g moldura_comum 48 64 "an empty vertical trading card frame, plain cardboard-beige border with thick rim, transparent empty center, small dark banner at the bottom"
g retrato_rugrigo_malandro 96 96 "detailed bust portrait of a sly young man, messy black hair, thin black mustache, smug grin with one raised eyebrow, half-closed confident eyes, red hoodie with the hood down, gold chain, expressive detailed face"
g retrato_influ_nano_1 96 96 "detailed bust portrait of an excited teenage boy with braces on his teeth and a cheap headset, messy hair, wide happy eyes, expressive detailed face"
g retrato_influ_nano_2 96 96 "detailed bust portrait of a cheerful aunt with curly hair and reading glasses, flower blouse, holding a smartphone too close to her face, expressive detailed face"
g retrato_influ_nano_3 96 96 "detailed bust portrait of a young man with sunglasses pushed up on his head and a bus pass on a lanyard around his neck, confident smile, expressive detailed face"
g retrato_influ_medio_1 96 96 "detailed bust portrait of a middle-aged uncle with a thick mustache and an open shirt, a big gem ring on a raised hand, winking, expressive detailed face"
g retrato_influ_medio_2 96 96 "detailed bust portrait of a young man with slick styled hair taking a selfie, wind blowing his hair, showy grin, expressive detailed face"
g retrato_influ_medio_3 96 96 "detailed bust portrait of a woman in a white lab coat with a tiny rocket pin and round glasses, pointing one finger up, excited smile, expressive detailed face"
g retrato_influ_mega_1 96 96 "detailed bust portrait of a bearded guru in a hooded robe with big headphones, calm smile, small gold coins falling behind him, expressive detailed face"
g retrato_influ_mega_2 96 96 "detailed bust portrait of a glamorous woman with big pink hair, huge sunglasses and a fur collar, pink neon glow behind her, expressive detailed face"
wait
