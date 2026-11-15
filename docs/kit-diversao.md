# Kit de diversão

Para usar no desenho de uma parte nova e de novo na tela pronta. Frases curtas. Números PROVISÓRIOS: teste com gente de fora e ajuste.
O `conselheiro-de-diversao` usa este kit; o `guardiao` cuida das regras.

## a) Roteiro dos 15 primeiros minutos (modelo; ajustar quando o jogo existir)
O relógio começa quando o jogador **já tem criaturas ou cartas** (depois do primeiro pacote ou do time inicial).
Regra de ouro: o jogador faz algo e **vê o jogo reagir** antes de ler texto longo.

| Minuto | O que o jogador vê | O que ele faz | Sentimento |
|---|---|---|---|
| 0:00-0:10 | Tela inicial viva (algo se mexe sozinho); um único botão chamando | Toca no botão | "Funciona e é bonito." |
| 0:10-0:60 | **1º prêmio em até 60 s:** a primeira criatura se revela, com suas partes | Abre o primeiro pacote | "Eu ganhei algo." |
| 1:00-3:00 | A criatura entra no time de 3 e a primeira batalha começa, com cartas simples | Escolhe cartas e vê o golpe | "Meu time luta." |
| 3:00-5:00 | Fim da batalha com recompensa e festa pequena | Coleta e vê o que mudou | "Dá para ver o crescimento." |
| 5:00-8:00 | **1ª escolha de verdade:** quem entra no time, qual carta jogar | Decide | "Sou eu que decido." |
| 8:00-11:00 | **1º cruzamento:** duas criaturas, chance de cada resultado visível, revelação em etapas | Cruza e espera o resultado | "Quero ver o próximo." |
| 11:00-13:00 | Uma meta pequena na tela (missão do dia, barra de coleção) e a vitrine do mercado | Explora | "Tem mais para descobrir." |
| 13:00-15:00 | **Gancho de saída:** algo que continua sem ele (recompensa que acumula, sem punir) | Fecha a aba sem culpa | "Amanhã eu volto." |

Cortes: se o 1º prêmio passa de 60 s, corte texto e espera; não aumente o prêmio.

## b) Ritmo de prêmios
| Tamanho | Cadência no começo | Exemplo | Efeito |
|---|---|---|---|
| Pequeno | a cada 3-10 s | golpe que acerta, moeda que entra | som curto, número sobe, 1 faísca |
| Médio | a cada 1-3 min | vitória de batalha, carta nova, missão | pausa de 0,3 s, flash suave, 10-20 partículas, som de 2 notas, contador rolando |
| Grande | a cada 10-30 min | criatura rara, cruzamento raro, torneio ganho | pausa de 0,6-1 s, fundo escurece, brilho, fanfarra, 40+ partículas (dentro do limite do guia de estilo), texto grande |

Nunca dois grandes seguidos. Entre dois grandes, médios. 30 s sem nenhum pequeno = tela morta: pôr vida.

## c) Checklist de sensação boa
- [ ] **Antecipação:** um sinal antes (pacote treme, cartas viram devagar, cruzamento brilha).
- [ ] **Impacto:** som, flash, tremida e número no MESMO quadro.
- [ ] **Recuperação:** volta ao normal em 0,2-0,5 s, sem corte seco.
- [ ] **Tremida:** só em médio ou grande; máx. 4 px (médio) e 8 px (grande), 0,15-0,3 s; nunca contínua.
- [ ] **Flash:** branco ou cor da raridade, 1-3 quadros, **no máximo 3 por segundo**; nunca tela branca repetida.
- [ ] **Partículas:** poucas e com propósito; somem em até 1 s; teto no código (`docs/guia-de-estilo.md`, a criar).
- [ ] **Som:** cada impacto tem o seu (`docs/direcao-de-som.md`, a criar).
- [ ] **Número rolando:** sobe em 0,3-0,8 s em vez de pular.
- [ ] **Menos animação** (opção do menu, chave `menos_animacao`): sem tremida, sem flash, partículas pela metade, contador troca na hora; a pausa e o som ficam. O jogo continua bom assim.

## d) Ficha do teste com gente de fora
**Teste de 15 min:** 1 pessoa por vez, 3 a 5 pessoas, sem ajuda, pelo link que abre direto no jogo. Anote o minuto:
1. Onde o olho vai primeiro? 2. Quando sorri ou fala algo ("uau")? 3. Quando fica parado mais de 10 s?
4. Quando pergunta "o que faço?" 5. Quando clica em algo que não é botão? 6. Quando olha outra aba?

**5 perguntas depois** (0 a 5 + uma frase): 1. Foi divertido? 2. Entendeu sem eu falar? 3. Melhor momento? 4. Pior momento? 5. Jogaria de novo? Quando?

**Voltou sozinho:** sem lembrar ninguém, a pessoa abriu de novo em 24-48 h? Conte voltaram ÷ testaram.

**Pontuação (0-100):** média das perguntas 1 e 2 (×10) = 40 · "uau" visto em metade ou mais = 20 · ninguém travou mais de 10 s = 15 · pergunta 5 positiva em metade ou mais = 15 · pelo menos 1 voltou sozinho = 10.
**Meta: 70 ou mais.** Abaixo de 70 não avança: conserta o pior momento e testa com gente nova.

## e) Por que voltar amanhã
**Use (honestos):** progresso com o jogo fechado com teto mostrado antes · missão do dia que não cobra nada se faltar · coleção (álbum de criaturas e partes) com o que falta e as chances · algo que amadurece (cruzamento em andamento, recompensa acumulando) · silhueta do que vem.
**Proibido:** relógio falso · punir quem sai (criatura que foge, item que estraga) · chance escondida · pressão para pagar ou para apostar ("aposte para recuperar", ranking por volume apostado) · escassez inventada · botão de fechar escondido · confirmação que engana.
Teste do espelho: se dá vergonha de explicar à mãe do jogador, é proibido.

## f) Orçamento de diversão por tela (preencher antes de codar)
| Campo | Preencher |
|---|---|
| Tela | |
| Tempo do jogador aqui por sessão | |
| Prêmios pequenos (por minuto) / médios (por sessão) / grande (quando) | |
| Efeito de cada um (tabela b) | |
| Teste dos 5 segundos: o que a pessoa entende | |
| O que se mexe quando ninguém clica | |
| Escolha do jogador nesta tela | |
| Gancho para a próxima tela | |
| Versão "Menos animação" | |
| Nota do conselheiro de diversão | (meta: 90+) |
