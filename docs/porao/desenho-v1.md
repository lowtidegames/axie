# Porão (jogo-sátira) — desenho técnico da versão 1

_Arquiteto, 20/11/2026 04:38 BRT. Ideia em docs/ideias/dev-do-porao.md; aprovação em docs/decisions.md (20/11 04:35)._

ASSUMPTIONS: na v1 os influenciadores são um catálogo fixo liberado com o progresso (sem sorteio). "Montar lançamento" (tema/tipo/tamanho) fica para a v2.

Jogo separado na pasta `porao/`. Servidor decide, tela só mostra. O Frayz não muda; só reaproveitamos `abrirBanco`/`transacao` (server/db.mjs), `CABECALHOS_DE_SEGURANCA`/`criarLimite` (server/api.mjs) e `criarRng` (shared/rng.js).

## 1. Estrutura
- `porao/comum/config.js` — todos os números (provisórios).
- `porao/comum/nomes.js` — nomes provisórios inventados e frases, por chave.
- `porao/comum/regras.js` — contas e máquinas de estado puras (sem banco, sem relógio próprio: o tempo entra como argumento). Prévia do tapete.
- `porao/servidor/nomes-local.mjs` — se existir `porao/nomes.local.json` (fora do git), troca nomes por chave; inválido = ignorado com aviso.
- `porao/servidor/banco.mjs` (tabelas), `porao/servidor/jogo.mjs` (ações), `porao/servidor/index.mjs` (só 127.0.0.1, porta 4900, banco `./dados/porao-teste.db`).
- `porao/tela/`: `index.html`, `estilo.css`, `sprites.js`, `cena.js`, `monitores.js`, `api.js`, `app.js`.
- `porao/tests/*.test.js`, `porao/ferramentas/simular.mjs`.
- **Arte trocável:** `sprites.js` lista cada sprite (nome, camada chão/parede/móvel/luxo/gente/efeito/interface, tamanho, âncora, forma provisória). Se existir imagem de mesmo nome (`porao/tela/arte/` ou `porao/arte.local/`), ela entra no lugar.
- **Tabelas:** `meta`, `save` (1 linha; semente do sorteio e último horário contado), `cartas`, `projetos`, `luxos`, `contratos`, `carteirinha`, `mensagens`, `missoes`, `diario` (cada mudança de caixa), `pedidos` (chave de pedido: não conta duas vezes).
- **Rotas:** `GET /api/estado` (adianta o relógio e devolve tudo, com nomes e prévias). `POST /api/imprimir`, `/api/fundir`, `/api/lancar`, `/api/projeto/:id/tapete`, `/api/batida`, `/api/luxo/:id`, `/api/contrato`, `/api/contrato/:id/resposta`, `/api/prestigio`, `/api/missao/:id`. Todas com chave de pedido.

## 2. Regras
- **Projeto:** GAVETA → lançar → LANÇAMENTO → HYPE ⇄ ESFRIANDO (hype zera / recarrega) → PICO → ESFRIANDO. No ar → tapete → APLICADO. Batida → APREENDIDO. Rende por hora = raridade × trouxas × (1 + luxos + prestígio). Tapete paga preço × trouxas e soma Calor (base da raridade × tempo no ar). Ganho e Calor mostrados antes.
- **Calor (0–100):** só muda com o jogador conectado. Sobe com tapete, projeto no ar e vídeo; desce devagar. Em 100 = BATIDA, mostrando custo do rebrand e qual projeto se perde. REBRAND (paga, Calor cai, projeto renomeado) ou PERDER (projeto mostrado → APREENDIDO). Sem projeto e sem caixa: Calor só zera.
- **Fora do jogo:** o tempo conta até um teto em horas; rende e gasta hype; Calor não sobe, sem batida, tapete nunca automático.
- **Impressora:** custa caixa; a 1ª é grátis. Chances (rascunho, visíveis): Comum 55 · Incomum 25 · Raro 12 · Épico 6 · Lendário 1,8 · Mítico 0,2. Sorteia raridade, depois a ideia dentro dela.
- **Fusão:** 3 cartas iguais na gaveta → 1 da raridade seguinte, sem sorteio. Mítico não funde.
- **Luxos:** compra única, bônus (rendimento, hype ou menos Calor); aparecem na cena pelo nome do sprite.
- **Prestígio:** liberado quando o caixa total chega à meta. "Ir preso" zera caixa, cartas, projetos e luxos; guarda álbum, carteirinha e contagem; bônus permanente e pseudônimo novo.
- **Contrato (1 vaga por projeto):** LIVRE → vídeo 1 (P1) → V1_NO_AR → se trouxe trouxas acima do limite: PEDE_MAIS no celular com P2 = P1 × multiplicador; senão vídeo 2 por P1. PEDE_MAIS → pagar (V2_NO_AR) · chorar (servidor sorteia desconto ou ele SOME) · recusar (ENCERRADO). Depois do tapete, vídeo 3 sai sozinho e ganha carimbo; 3+ carimbos = REINCIDENTE.

## 3. Tarefas
| # | Agente | Arquivos | Pronto quando |
|---|---|---|---|
| 1 | dev-servidor (Opus) | `porao/comum/regras.js`, `porao/comum/config.js`, `porao/tests/regras.test.js` | testes: cedo paga menos que tarde; Calor parado fora; teto do tempo fora; fusão; chances somam 100 |
| 2 | dev-servidor | `porao/comum/nomes.js`, `porao/servidor/nomes-local.mjs`, `porao/tests/nomes.test.js` | funciona sem arquivo, com arquivo e com arquivo quebrado |
| 3 | dev-tela | `porao/tela/index.html`, `estilo.css`, `sprites.js`, `cena.js` | fotos PC e celular do porão e do zoom no PC, também com "Menos animação" |
| 4 | dev-servidor (Opus) | `porao/servidor/banco.mjs`, `porao/servidor/jogo.mjs`, `porao/tests/jogo.test.js` | soma do diário = caixa; banco usado; pedido repetido não conta 2× |
| 5 | dev-servidor | `porao/servidor/index.mjs`, `porao/tests/api.test.js` | todas as rotas; recusa ligar fora de 127.0.0.1 |
| 6 | dev-tela | `porao/tela/monitores.js`, `api.js`, `app.js`, `porao/tests/tela.e2e.mjs` | e2e: 1º tapete < 60 s; celular 1 monitor por vez; borda acesa no monitor fora da vista |
| 7 | economista | `porao/ferramentas/simular.mjs` + números de `config.js` | 1º tapete < 60 s e ritmo de batidas |

Ordem: 1, 2, 3 juntas → 4 e 6 (6 com `api.js` falso até a 5) → 5 → e2e. 7 depois da 1.
Diretor: `npm test` inclui os testes do porão; `.gitignore` com `porao/nomes.local.json` e `porao/arte.local/`.

## 4. Fica para a v2
Montar lançamento, moda da semana, avaliações falsas, fases bunker/iate, equipe, eventos aleatórios, 5 tamanhos de influenciador, influenciador que vende antes ou dedura, arte final e som.

## Riscos
- Rotas novas sem login (só 127.0.0.1): revisão do `seguranca` antes de juntar.
- Nomes reais no git: teste confere o `.gitignore`.
- Mesmo `server/db.mjs` do Frayz, arquivo de banco separado.
- Multidão pesa: respeitar o limite de partículas do guia de estilo.
- `trava-economia` só vigia `shared/config.js`; `porao/comum/config.js` fica fora (decisão do dono se quiser incluir).
