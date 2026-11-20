#!/bin/bash
# lote 1: 4 gerações (casa, logo do jogo, logo do estúdio, retrato da vó), em paralelo.
cd "$(dirname "$0")"
python3 -I gerar.py pixflux casa_vo_noite 1 320 180 "a simple small grandmother's house at night seen straight from the front, whitewashed walls, red tile roof, wooden front door, flowerpots, a tiny low basement window at ground level glowing with a bright blue-green monitor light that spills onto the grass, the other windows dark, deep navy night sky full of stars and a crescent moon, big empty dark sky area at the top and empty grass area at the bottom" fundo > l1.txt 2>&1
python3 -I gerar.py pixflux logo_jogo 1 128 64 "an emblem of a rolled-up carpet rug with a red and gold pattern lying on a small desk monitor, gold coins falling onto it with small sparkles, compact centered badge" > l2.txt 2>&1
python3 -I gerar.py pixflux logo_estudio 1 64 64 "a simple small studio mark: a round badge with a tiny lighthouse tower on a wave, two flat colors plus outline, compact centered" > l3.txt 2>&1
python3 -I gerar.py pixflux retrato_vo 1 96 96 "detailed bust portrait of a sweet elderly grandmother, round glasses, grey hair in a bun, warm smile, knitted shawl, holding a steaming cup of tea in both hands, expressive detailed face" > l4.txt 2>&1
cat l1.txt l2.txt l3.txt l4.txt
