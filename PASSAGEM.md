# PASSAGEM — Frayz

## ⚑ 15/11/2026 01:55 BRT — ESTADO ATUAL (vale acima do resto)
- **Jogo:** Frayz — bonecos de pano amaldiçoados, batalha 3×3 por cartas, costura (cruzamento), aluguel de times, ranking, token na Solana (nada de dinheiro ainda). Repositório `lowtidegames/axie` (público, o dono sabe), ramo `main`. Ambiente de nuvem próprio: `frayz` (libera só api.elevenlabs.io e api.pixellab.ai).
- **Diretor desta passagem:** `session_019N76nV6wFUb2aP2SLbeotJ`. Esta conversa ficou grande (479 mil tokens de memória): a próxima etapa deve ser em conversa NOVA (frase no fim).
- **No `main` (70f0bce), tudo com teste:** motor de batalha (24 cartas, 9 bonecos, 2 robôs, simulador), costura/genes/Carretel/desgaste, economia do pote no simulador (rodadas 1 e 2), tela do protótipo (luta, coleção, costura com casulo, Aventura de 5 fases com intenção do rival, replay), servidor do protótipo (conta de teste, luta e costura decididas no servidor, banco). `npm test` 114/0 (motor 2 juntado: sorteio por SHA-256, mesa, teto de 40 comandos); `npm run e2e` verde (celular e PC).
- **Régua de qualidade:** `docs/guia-de-estilo.md` (interface, layout, arte) e `docs/direcao-de-som.md`. Meta: trindade 90+ por tela. O guia de estilo descreve desenho por código; se o dono escolher pixel art, REESCREVER antes de produzir.
- **Serviços pagos (dono liberou 15/11 00:36):** ElevenLabs (som) e PixelLab (arte). Piloto feito e guardado em `sons/piloto-elevenlabs/` e `arte/piloto-pixellab/`; gastos e lições em `docs/custos.md` (342 créditos; 38 gerações; PixelLab com 1.107 de 10.000 gerações no ciclo, conta dividida com outro projeto). O que funciona na arte: gerar o boneco INTEIRO e cortar por código (cabeça × corpo provado em 16 misturas); pedir parte solta ou prender pose em molde NÃO funciona nas ferramentas básicas.
- **Segurança:** parecer nº 1 em `docs/seguranca/parecer-servidor-1.md` (GO para protótipo sem dinheiro; lista do que é NÃO-GO para o dia do prêmio). Provas em `tests/ataques/servidor-1/`.

### Rodando quando esta passagem foi escrita (ramos só nesta máquina, SEM envio — se a máquina cair, perdem-se)
| Ramo (pasta em /home/user/wt/) | O que é | Ao voltar |
|---|---|---|
| `frayz-arte` (arte) | bonecos em camadas com poses, cena, efeitos — desenho por código | mandei fechar e entregar; aproveitar rig/poses/efeitos/cena dinâmica; o desenho das partes só vale se o dono NÃO for de pixel art |
| `frayz-pecas` (pecas) | peças da interface: cartas, mão em leque, fita métrica, carretéis, bastidor, fontes | conferir fotos; depois encaixar na luta (tarefa 11) |
| `frayz-som` (som) | motor de som, música em camadas, folha de sons, amostras por manifesto | conferir medidas; ligar as amostras do ElevenLabs pelo `public/sons/manifesto.json` |

### Esperando o dono (não reoferecer o que ele recusar)
1. **Visual:** `sim, pixel art total opção 1 — teto 600 gerações do PixelLab e 5.000 créditos do ElevenLabs` (as outras: misto 84; tudo por código 80).
2. **Link de teste:** `sim, link de teste pelo GitHub opção 1` (página grátis do GitHub; 1 clique dele em Settings → Pages).
3. **Economia:** `sim, números da rodada 2 só para o beta sem dinheiro opção 1` (`docs/ideias/economia-do-pote.md`). Farmador ganha ~US$ 0,37/dia no modelo; o pote nunca paga mais do que entra.
4. **Consumo do Fable** (perguntou 01:52: 22% do limite semanal; reinicia 21/11 03:00 BRT): proposta de usar o Fable só para dirigir e julgar, com agentes Opus/Sonnet e conversa nova.
5. Mais adiante: teto de força do Lendário (+10% dá 62% de vitória; +4% dá 56,5%); freio da inflação de raridade; abrir luta gastar energia e desistir contar como derrota; custo e teto da costura; tornar o repositório privado antes de ligar dinheiro; confirmar o código FRAY no explorador antes de criar o token.

### Fila (detalhes em `docs/fila.md`)
- 11 ENCAIXE do acabamento na luta (depois de arte/peças/som) · 12 motor (em rechecagem) · 13 servidor rodada 2 (A3, A4, A5, A7, A8, A9, A10, chaves de emergência, sessão; depende da 12).
- Se pixel art for aprovado: reescrever o guia de estilo; pipeline de bonecos (gerar inteiros → cortar cabeça, tronco, braços, pernas com pivôs → camadas no rig); cenas; arte das 24 cartas; ícones; pacote de som com 3–4 tomadas por som e escolha por medição.

### Regras vivas do dono
- Propostas já chegam com uma opção 95+ em primeiro lugar; nota honesta (dizer o que falta).
- Capricho máximo em interface, layout, som e arte.
- Checklist com Nota + linha "Conselheiros:" + o "sim" num bloco; contraponto honesto antes de executar; português simples; hora real em BRT (rodar `date`, não chutar).
- Só o dono decide: número de economia, dinheiro e créditos pagos (teto dito por ele), token/carteira, hospedagem, publicar, apagar, regra da casa, visual.
- Até 4 agentes ao mesmo tempo, cada um em worktree próprio e com lista de arquivos; agentes não enviam ao GitHub; o diretor junta, roda `npm test` e envia o `main`.
- Nada liga o Frayz a outros jogos; nada copiado de jogo existente.

### Avisos práticos para a conversa nova
- **Chaves:** as variáveis `ELEVENLABS_API_KEY` e `PIXELLAB_API_KEY` vieram do ambiente antigo desta máquina. Numa conversa nova no ambiente `frayz` elas NÃO existem: pedir ao dono para pôr as duas no ambiente (pelo formulário seguro de credencial), nunca no chat.
- O `fetch` do Node só passa pelo proxy com `NODE_USE_ENV_PROXY=1`; Python `requests` precisa de `verify='/root/.ccr/ca-bundle.crt'`.
- Trava do verde: `git push` só passa com `npm test` verde na MESMA árvore; arquivo solto sem commit muda a árvore. Commit de `shared/config.js` exige linha nova em `docs/decisions.md` já adicionada (`git add`) ANTES do comando de commit. Não encadear `merge && teste`.
- Rodar: `npm test` · `npm run e2e` (um robô por vez) · `npm run simular` · `npm run simular:economia -- --comparar` · `npm run dev` (tela local, porta 4700) · `npm run servidor` (porta 4800).

### Frase para a conversa nova
```
Você é o DIRETOR do Frayz. Repositório lowtidegames/axie, ramo main, ambiente frayz. Leia PASSAGEM.md (seção do topo), CLAUDE.md, docs/fila.md e o topo de docs/decisions.md. Revise as regras e me mostre o resumo em poucas linhas.
```
