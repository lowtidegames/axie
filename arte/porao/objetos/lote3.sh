#!/bin/bash
# lote 3: 2 expressões do Rugrigo (R3 sobre o malandro) e 5 molduras (R3 sobre a comum). 7 gerações.
cd "$(dirname "$0")"
e() { REGSUF=$1 python3 -I gerar.py editar "$1" 1 "$2" "$3" > log-$1-1.txt 2>&1 & }
B=bruto/retrato_rugrigo_malandro-1.png
e retrato_rugrigo_rindo $B "exactly the same head size, hair, mustache, hoodie and framing, only the face changes: laughing out loud with the mouth wide open, eyes squeezed shut with joy, head tilted slightly back"
e retrato_rugrigo_assustado $B "exactly the same head size, hair, mustache, hoodie and framing, only the face changes: scared and panicked, very wide eyes, small pupils, mouth open in a shout, eyebrows raised high, one sweat drop on the forehead"
M=bruto/moldura_comum-1.png
S="exactly the same frame shape and size, only the border material and color changes: "
e moldura_incomum $M "${S}green painted wood border"
e moldura_raro $M "${S}blue polished metal border"
e moldura_epico $M "${S}purple crystal border with small studs"
e moldura_lendario $M "${S}ornate gold border with small gems"
e moldura_mitico $M "${S}pink iridescent border with tiny stars"
wait
