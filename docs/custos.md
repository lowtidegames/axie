# Custos de serviços pagos (Frayz)

Quem escreve: só o diretor. Cada gasto entra aqui no mesmo dia, com a autorização do dono ao lado. As contas dos serviços são as do estúdio e são divididas com outros projetos.

| Data (BRT) | Serviço | O que foi gerado | Gasto | Autorização |
|---|---|---|---|---|
| 15/11/2026 00:45 | ElevenLabs (efeitos sonoros) | piloto de som: 24 clipes de 0,5 a 10 s (`sons/piloto-elevenlabs/`) | 342 créditos | dono 15/11 00:36 "pode usar o elevenlabs para pack de som completo" |
| 15/11/2026 00:50–01:10 | PixelLab (imagens) | piloto de arte: 1 cena, 8 bonecos inteiros, 3 manequins, 10 partes sobre molde, 6 + 3 testes de pose presa, 11 partes soltas (`arte/piloto-pixellab/`) | 38 gerações | dono 15/11 00:36 "o pixel lab para assets do jogo inteiro" |
| 15/11/2026 03:05–03:25 | ElevenLabs (efeitos sonoros) | pacote de som: 1 teste + 100 tomadas de 19 efeitos de ateliê em 2 rodadas; 53 escolhidas por medição e instaladas em `public/sons/` (bruto, pedidos e escolha em `sons/pacote-elevenlabs/`) | 942 créditos | dono 15/11 02:55 "som pelo ElevenLabs com teto de 5.000 créditos" |
| 15/11/2026 10:18–10:50 | PixelLab (imagens) | piloto de monstros (tema medieval): 6 monstros em pose parada e ataque, arena, ninho, mapa, ovo em 3 estados, 5 lugares, 6 ícones (`arte/piloto-monstros/`, finais em `public/piloto/arte/`) | 55 gerações (saldo 1107,5 → 1052,5; só ferramentas de 1 geração) | dono 15/11 10:04: teto de 150 gerações |
| 15/11/2026 10:51–10:53 | PixelLab (imagens) | refazer arena (bandeiras lisas, 1 tentativa aceita) + 3 testes de Cobblepup descartados, guardados em bruto (`arte/piloto-monstros/`) | 7 gerações pelo saldo (1052,5 → 1045,5; o registro soma 6) — total do tema novo: 62 de 150 | diretor 15/11 (teto 12; depois só arena) |

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
