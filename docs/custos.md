# Custos de serviços pagos (Frayz)

Quem escreve: só o diretor. Cada gasto entra aqui no mesmo dia, com a autorização do dono ao lado. As contas dos serviços são as do estúdio e são divididas com outros projetos.

| Data (BRT) | Serviço | O que foi gerado | Gasto | Autorização |
|---|---|---|---|---|
| 15/11/2026 00:45 | ElevenLabs (efeitos sonoros) | piloto de som: 24 clipes de 0,5 a 10 s (`sons/piloto-elevenlabs/`) | 342 créditos | dono 15/11 00:36 "pode usar o elevenlabs para pack de som completo" |
| 15/11/2026 00:50–01:10 | PixelLab (imagens) | piloto de arte: 1 cena, 8 bonecos inteiros, 3 manequins, 10 partes sobre molde, 6 + 3 testes de pose presa, 11 partes soltas (`arte/piloto-pixellab/`) | 38 gerações | dono 15/11 00:36 "o pixel lab para assets do jogo inteiro" |

## O que o piloto ensinou sobre preço
- **ElevenLabs:** cerca de 11 créditos por segundo de som. A chave do estúdio não deixa ler o saldo da conta. Metade das tomadas de 0,5 s saiu fraca ou muda: contar 3 a 4 tomadas por som.
- **PixelLab:** as ferramentas básicas custam 1 geração por imagem; as "Pro" custam de 10 a 40 por chamada. Saldo do plano em 15/11 01:10: 1.107 de 10.000 gerações no ciclo (a data da renovação não aparece na API).

## Lições (para não gastar de novo)
- Prender a pose com imagem inicial em força 300 devolve a imagem inicial igual (6 gerações perdidas). Em força 20–120 o tecido pedido some.
- Pedir "só a cabeça", "só o braço" não funciona nas ferramentas básicas: vem um boneco inteiro.
- O que funciona: gerar o boneco inteiro e cortar por código (cabeça × corpo combinaram bem nos 16 testes, sem gasto extra).
