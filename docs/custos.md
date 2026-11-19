# Custos de serviços pagos (Frayz)

Quem escreve: só o diretor. Cada gasto entra aqui no mesmo dia, com a autorização do dono ao lado. As contas dos serviços são as do estúdio e são divididas com outros projetos.

| Data (BRT) | Serviço | O que foi gerado | Gasto | Autorização |
|---|---|---|---|---|
| 15/11/2026 00:45 | ElevenLabs (efeitos sonoros) | piloto de som: 24 clipes de 0,5 a 10 s (`sons/piloto-elevenlabs/`) | 342 créditos | dono 15/11 00:36 "pode usar o elevenlabs para pack de som completo" |
| 15/11/2026 00:50–01:10 | PixelLab (imagens) | piloto de arte: 1 cena, 8 bonecos inteiros, 3 manequins, 10 partes sobre molde, 6 + 3 testes de pose presa, 11 partes soltas (`arte/piloto-pixellab/`) | 38 gerações | dono 15/11 00:36 "o pixel lab para assets do jogo inteiro" |
| 15/11/2026 03:05–03:25 | ElevenLabs (efeitos sonoros) | pacote de som: 1 teste + 100 tomadas de 19 efeitos de ateliê em 2 rodadas; 53 escolhidas por medição e instaladas em `public/sons/` (bruto, pedidos e escolha em `sons/pacote-elevenlabs/`) | 942 créditos | dono 15/11 02:55 "som pelo ElevenLabs com teto de 5.000 créditos" |
| 15/11/2026 10:18–10:50 | PixelLab (imagens) | piloto de monstros (tema medieval): 6 monstros em pose parada e ataque, arena, ninho, mapa, ovo em 3 estados, 5 lugares, 6 ícones (`arte/piloto-monstros/`, finais em `public/piloto/arte/`) | 55 gerações (saldo 1107,5 → 1052,5; só ferramentas de 1 geração) | dono 15/11 10:04: teto de 150 gerações |
| 15/11/2026 10:51–10:53 | PixelLab (imagens) | refazer arena (bandeiras lisas, 1 tentativa aceita) + 3 testes de Cobblepup descartados, guardados em bruto (`arte/piloto-monstros/`) | 7 gerações pelo saldo (1052,5 → 1045,5; o registro soma 6) — total do tema novo: 62 de 150 | diretor 15/11 (teto 12; depois só arena) |
| 15/11/2026 11:04–11:08 | PixelLab (imagens) | prova do conceito de objeto-criatura: Portcully (6 tentativas) e Rambark (2), mais 1 teste com sombra como guia, tratados por código (`arte/piloto-monstros/prova-criaturas/`) | 8 gerações (saldo 1040,5 → 1032,5) — total do tema novo: 70 de 150 | diretor 15/11 (teto 14) |
| 19/11/2026 18:20 | ElevenLabs (efeitos sonoros) | Reino: só conferência da chave (pedido vazio, 422 = chave aceita); nenhum som gerado | 0 créditos | — |
| 19/11/2026 18:36–18:50 | PixelLab (imagens) | jogo de reino, prova de direção de arte: boneco-base + 3 variações + 5 poses por edição, mago, 2 invasores, chefe, castelo, portão, 5 construções, 2 planos de fundo, 3 testes descartados (`arte/reino/`) | 25 gerações (saldo 1004,5 → 979,5) — total nos tetos do dono: 95 de 150 | diretor 19/11 (teto 30) |

**Teto do ElevenLabs: 5.000 créditos. Gasto até agora: 1.284 (piloto 342 + pacote 942). Sobra: 3.716.**

## O que o piloto ensinou sobre preço
- **ElevenLabs:** cerca de 11 créditos por segundo de som. A chave do estúdio não deixa ler o saldo da conta. Metade das tomadas de 0,5 s saiu fraca ou muda: contar 3 a 4 tomadas por som.
- **PixelLab:** as ferramentas básicas custam 1 geração por imagem; as "Pro" custam de 10 a 40 por chamada. Saldo do plano em 15/11 01:10: 1.107 de 10.000 gerações no ciclo (a data da renovação não aparece na API).

## Lições (para não gastar de novo)
- Prender a pose com imagem inicial em força 300 devolve a imagem inicial igual (6 gerações perdidas). Em força 20–120 o tecido pedido some.
- Pedir "só a cabeça", "só o braço" não funciona nas ferramentas básicas: vem um boneco inteiro.
- O que funciona: gerar o boneco inteiro e cortar por código (cabeça × corpo combinaram bem nos 16 testes, sem gasto extra).
- Som de 0,5 s sai fraco ou mudo em metade das tomadas; pedir de 0,6 a 1,8 s e aparar. O dedal ("ting" de metal) saiu fraco em 8 tomadas: ficou no código.
- Som de toque precisa começar junto do estalo: aparar o ruído que vem antes, senão parece atraso.

- **PixelLab, lições de 15/11 10:50:** `edit-image-pixen` custa 1 geração e mantém o personagem (jeito certo de fazer a pose de ataque); `style_image` do bitforge copia a referência e perde o bicho novo; o pixflux só aceita 32×32 ou mais (ícone de 16×16 vai pelo pixen). Bandeiras de cenário saem parecidas com brasões reais: pedir sempre "plain solid-color pennants".

- **CORREÇÃO (15/11 11:12): o número `subscription.generations` da API do PixelLab é o que SOBRA no plano, não o que foi usado** — ele desce a cada geração (1107,5 → 1052,5 → 1045,5 → 1040,5 → 1032,5). Onde este arquivo diz "1.107 de 10.000 gerações no ciclo" leia: sobravam 1.107 de 10.000. Em 15/11 11:08 sobravam 1.032,5. Entre 10:53 e 11:04 o saldo caiu 5 sem chamada nossa registrada (a conta é dividida com outro projeto do dono).
- **PixelLab, lição de 15/11 11:08:** a sombra pintada como imagem inicial só calca a silhueta e perde o desenho; texto com o OBJETO primeiro dá mais identidade; palavras como "bulldog face" ou "ram" puxam para o bicho real.

- **PixelLab, lições de 19/11:** família inteira de bonecos por `edit-image-pixen` sobre UM boneco-base (traço e lado coerentes); pixflux 32×32 dá soldado melhor que pixen 24×24; prédio vem em 3/4 e às vezes roxo (trocar matiz por código); escudo vem com cruz (pedir "without any symbol"). Entre 15/11 e 19/11 o saldo caiu de 1.032,5 para 1.004,5 sem uso nosso (conta dividida com outro projeto).
