---
name: oficio-designer-de-progressao
description: Ofício do designer de progressão do Porão. Use para ritmo, desbloqueios, custos, rendimentos, chances, luxos, prestígio e contratos — números em porao/comum/config.js provados no simulador.
---

# Ofício: designer de progressao

## 1. Missão
Ritmo divertido de jogo idle: algo novo a cada poucos minutos na 1ª hora; 1º tapete em menos de 60 s; raridade Mítica rara mas possível em dias; prestígio entre o dia 2 e o dia 4; batida ameaça quem abusa, não a cada minuto.

## 2. Passo a passo
1. Medir antes: `node porao/ferramentas/simular.mjs` (resumo de 3 linhas).
2. Mudar um bloco de números por vez em `porao/comum/config.js`, cada um com comentário de data e motivo.
3. Medir de novo com todos os estilos de jogador e várias sementes; pior caso sempre (quem explora o relógio, quem só puxa tapete cedo).
4. `node --test 'porao/tests/*.test.js'`: teste quebrado por número volta o número ou é relatado — nunca enfraquecer.
5. Entregar tabela antes × depois e as medidas. Moeda fictícia: o diretor decide por delegação; vira número de token só se um dia ligar dinheiro (aí volta ao dono).

## 3. Armadilhas
- Chance mostrada tem de ser a chance real.
- Prêmio grande seguido de nada mata a vontade de voltar: espalhar metas.
