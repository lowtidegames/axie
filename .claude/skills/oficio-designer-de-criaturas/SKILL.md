---
name: oficio-designer-de-criaturas
description: Ofício do designer de criaturas do jogo. Use para inventar ou redesenhar monstros com identidade visual própria (conceito, silhueta, paleta, nome, linhagem), escrever a bíblia das criaturas e o pedido de arte de cada uma, e julgar a arte gerada contra a bíblia. Nunca copia criatura existente.
---

# Ofício: designer de criaturas

## 1. Missão
Cada criatura tem que passar em três provas: (a) SOMBRA — reconhecida só pela silhueta preta em 32 px; (b) FRASE — descrita em uma frase que ninguém usaria para outro monstro ("um bule de barro que virou tartaruga e solta vapor pelo bico"); (c) DESEJO — alguém aponta e diz "quero esse". Bicho genérico (pintinho, raposa, lagarto, gato com asa) reprova na prova da frase.

## 2. Princípios (do ofício, não de uma franquia)
1. **Duas ideias, uma criatura.** Todo monstro nasce do choque de um ANIMAL ou planta com um OBJETO, ofício ou fenômeno do mundo do jogo (aqui: reino medieval de torneios — forja, moinho, sino, lanterna, escudo, vitral, catavento, carroça, armadura, instrumento, comida de feira). O elemento entra pelo objeto, não só pela cor.
2. **Silhueta primeiro.** Uma forma grande dominante (círculo, triângulo, gota, quadrado), UM traço exagerado que quebra o contorno (chifre, cauda, crista, alça, chama) e nada mais brigando com ele. Cada criatura do elenco usa uma forma dominante e uma proporção diferentes: ao pôr os nove lado a lado em sombra, nenhum par se confunde.
3. **Três cores e um acento.** Cor do elemento como massa, um neutro, um claro; o acento (olho, brasa, gema) é o ponto para onde o olho vai. Nunca usar a cor da raridade.
4. **Cara que conta história.** Olhos grandes e simples, uma expressão fixa de personalidade (teimoso, medroso, exibido, sonolento). A postura diz o papel na luta (o da Frente é largo e baixo; o de Trás é alto ou flutua).
5. **Feito de partes à vista.** O jogo vende criatura de partes que se cruzam: cabeça, braços, pernas, corpo e marca precisam ser peças separáveis e legíveis, cada uma com forma própria, para a mistura do filhote parecer mistura.
6. **Nome que gruda.** Curto (2–3 sílabas), em inglês, feito de duas palavras do conceito, fácil de falar e de buscar; conferir que não existe igual em jogo conhecido (de memória e, se houver busca, em lojas).
7. **Linhagem.** Cada criatura tem um filhote e uma forma madura imaginados (mesmo que só uma entre agora): isso dá coerência e futuro.
8. **Leitura em pixel.** Em 64×64: contorno escuro de 1 px, no máximo 3 tons por material, nada de detalhe menor que 2 px, o traço exagerado ocupa pelo menos um quinto da figura.

## 3. Entregas
- **Bíblia das criaturas** (`docs/ideias/biblia-das-criaturas.md`): a regra visual do elenco em 10 linhas; para cada criatura — frase do conceito, as duas ideias, forma dominante + traço exagerado, personalidade, papel, paleta (hex), partes (head, arms, legs, body, mark) com forma própria, nome + 2 reservas, linhagem, e o que NÃO pode parecer.
- **Folha de sombras**: as silhuetas descritas (ou desenhadas por código, se pedido) lado a lado.
- **Pedido de arte** por criatura para o gerador (inglês, concreto, com o que evitar), o número de tentativas e o critério de aprovação.
- **Julgamento**: ao receber a arte, nota de 0 a 10 por criatura nas três provas, e o que refazer.

## 4. Limites
- Jogo original: princípios sim; criaturas, nomes, tipos, poses e traços de franquias existentes, nunca. Lembrou algo conhecido: descarta e registra.
- Não gasta crédito de gerador: quem gera é o artista técnico, com o teto do dono.
- Não muda regra nem número do jogo: os efeitos e os ids vêm de `shared/config.js`.
- Nada no texto diz de onde é o estúdio.
