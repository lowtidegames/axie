# Porão — abertura e login por carteira (desenho do arquiteto, 20/11/2026 18:21 BRT)

Decisão do dono: docs/decisions.md, 20/11 18:17. Login SÓ por assinatura de mensagem Solana; nenhuma transação, nenhum token. Node 22 sem dependências.

## Rotas (todas com X-Porao e origem certa)
- `POST /api/sessao/desafio {carteira}` → `{mensagem, nonce, venceEm}`. Mensagem montada pelo servidor (site fixo `127.0.0.1:<porta>` ou `PORAO_SITE`, nunca do pedido), carteira, nonce 16 bytes, emitida/vence (5 min), "não é transação". Texto em assinatura.mjs (sério).
- `POST /api/sessao/entrar {carteira, nonce, assinatura}` (base58, 64 bytes): confere contra a mensagem GUARDADA; queima o nonce com `UPDATE ... WHERE usado_em IS NULL AND vence_em > agora` (1 linha); acha/cria conta; cookie.
- `POST /api/sessao/convidado` (127.0.0.1: conta `local_padrao=1`), `GET /api/sessao` → `{conta|null}`, `POST /api/sessao/sair`.
- `POST /api/apelido {apelido}`: só depois do 1º tapete, 1 vez.
- Rotas do jogo: sem sessão → 401 `sem_sessao`; com sessão recebem `contaId`. Estado ganha `conta {tipo, apelido, carteiraCurta, pedirApelido}`.
- Verificação: base58 → 32 bytes; SPKI `302a300506032b6570032100`+chave (ou JWK OKP/Ed25519); `crypto.verify(null, msg_utf8, chave, assinatura64)` em try.
- Cookie `porao_sessao`: token 32 bytes, banco guarda sha256; HttpOnly, SameSite=Strict, Path=/, 7 dias renovando; ao publicar `__Host-` + Secure.

## Migração v2 (cópia do banco automática)
`contas(id, tipo, carteira UNIQUE, apelido, apelido_chave UNIQUE, local_padrao, criada_em, visto_em)`, `saves(conta_id PK, estado, atualizado_em)`, `desafios(nonce PK, carteira, mensagem, vence_em, usado_em)`, `sessoes(hash PK, conta_id, vence_em, visto_em)`; `diario`/`pedidos` ganham `conta_id`. Conta 1 = convidada local com o save atual; tabela `save` antiga intocada (apagar é do dono). Cada conta nova com semente própria.

## Máquinas de estado
- Tela: LOGO → CARREGANDO (+ GET /api/sessao) → TÍTULO → (Continuar | Convidado → PORÃO) | (Conectar → AVISO → ESCOLHER → ASSINANDO → PORÃO; recusa/vencido → ESCOLHER) | Hall → TÍTULO. PORÃO: vó + 1ª impressão sozinha (chave `primeira-<conta>`) → 1º TAPETE → APELIDO → HISTÓRIA (pulável) → JOGO. 401 → TÍTULO.
- Servidor: desafio PENDENTE → USADO | VENCIDO. Sessão NENHUMA → ATIVA → SAIU | VENCIDA. Apelido NULO → DEFINIDO.

## Tarefas
| # | Agente | Ramo | Arquivos | Pronto quando |
|---|---|---|---|---|
| 1 | nucleo-do-jogo | teste-porao-contas | porao/servidor/banco.mjs, porao/tests/contas.test.js | banco v1 usado migra igual byte a byte; cópia em copias/; diário = caixa da conta 1; criarConta, contaDaCarteira, contaConvidadaLocal |
| 2 | nucleo-do-jogo (após 1) | teste-porao-contas | porao/servidor/jogo.mjs, porao/comum/apelido.js, porao/tests/jogo.test.js | contas isoladas; chave de pedido de A recusada em B; regras do apelido |
| 3 | engenheiro-de-carteira | teste-porao-assinatura | porao/comum/base58.js, porao/servidor/assinatura.mjs, porao/tests/assinatura.test.js | vetores base58; RFC 8032 teste 1; par gerado confere; bit trocado / 31-33 bytes = falso sem erro |
| 4 | engenheiro-de-carteira (após 1,2,3) | — | porao/servidor/sessao.mjs, index.mjs, porao/tests/api.test.js, sessao.test.js | caminho inteiro; nonce repetido/vencido/de outra carteira = 401; cookie; sair; chaves de emergência |
| 5 | dev-tela | teste-porao-abertura | porao/tela/abertura.js, index.html, estilo.css, app.js, sprites.js | fotos PC e 390×844, normal e Menos animação |
| 6 | dev-tela | teste-porao-carteira | porao/tela/carteira-navegador.js, api.js | Wallet Standard (app-ready/register-wallet, standard:connect + solana:signMessage) + reserva phantom/solflare/backpack; nunca window.ethereum; 401 → sem-sessao; carteira falsa no ?falso=1 |
| 7 | dev-tela | teste-porao-vo | porao/tela/vo.js | vó tutora, apelido, história; fotos |
| 8 | dev-tela (após 5,6,7) | — | porao/tests/tela.e2e.mjs | convidado chega à 1ª ideia < 30 s; caminho até a história |
Paralelo: 1,3,5,6,7 → 2 → 4 → 8. GO do seguranca na 3, 4 e 6.

## Riscos
- api.js cai no modo falso se /api/estado não responde: com login, sondar /api/sessao.
- CSP do Porão vem de server/api.mjs (Frayz): se precisar mudar, cabeçalhos próprios do Porão, nunca afrouxar o do Frayz.
- Celular não abre 127.0.0.1: carteira no celular só depois de publicar.
- MetaMask só com conta Solana. Progresso do convidado não passa para a carteira (v2). Filtro de palavrão fraco. Bytes assinados idênticos (UTF-8, \n).
- ASSUMPTION: Hall da Vergonha v1 só silhuetas. Sessão 7 dias renovando.
