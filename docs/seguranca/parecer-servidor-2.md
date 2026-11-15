# Parecer de segurança nº 2 — servidor rodada 2 (15/11/2026)

Revisor: agente `seguranca` (só leu e atacou). Alvo: `frayz-servidor2` (b943003). `npm test` 139/139; junto com o main 141/141; nenhum teste apagado ou enfraquecido.

## Veredito
Primeira passada (b943003): NÃO-GO por causa do S2-1. Rechecagem (a89ef12): **GO**, juntado no main em f94fe50.

## Rodada 1
| Nº | Estado |
|---|---|
| A3 teto de bonecos + páginas | FECHADO (12 costuras ao mesmo tempo com 59 vivos: só 1 passa) |
| A4 banco cresce por comando | PARCIAL: parte quadrática fechada; ainda ~6,8 KB por luta sem teto (S2-2) |
| A5 limites atrás de proxy / reinício | FECHADO (sobrevive a reinício); risco de configuração em S2-4 |
| A7 progressão da Aventura | FECHADO |
| A8 banco alheio | FECHADO (recusa sem tocar; migração v1→v2 com cópia antes, testada em banco usado) |
| A9 limites com IPv6 | PARCIAL: sem lentidão; tabela cresce mais rápido que a limpeza (S2-3) |
| A10 apelido | PARCIAL: único e sem outros alfabetos; letras parecidas dentro do latino passam (S2-5) |
| Chaves de emergência, sessão com validade, `/api/sair` | FECHADO (S2-6 baixo) |
| A6 rolar de novo | espera a economia (energia) |

## Rechecagem (15/11 03:58 BRT, commit a89ef12): **GO** para juntar como protótipo SEM dinheiro
`npm test` 153/0; só 3 testes mudaram, todos por regra que mudou (lista de IPs do proxy; limpeza até acabar). Nenhum apagado.

| Nº | Gravidade | Estado (rechecagem a89ef12) |
|---|---|---|
| S2-1 | alta | FECHADO: `.all()[0]` + `journal_size_limit`; WAL 3,9 MB com 12 mil pedidos e com jogador real |
| S2-2 | média | FECHADO: 0,6 KB por luta, teto de 200 por conta; replay refeito sem diferença em 400 lutas; 0,35 ms por leitura. Fica de fora (declarado): `eventos_bonecos` ~0,26 KB por luta sem teto |
| S2-3 | baixa | FECHADO: limpeza por tipo em laço; /48 antes do /64 (100 mil linhas: 189 ms) |
| S2-4 | baixa | FECHADO: `TRUST_PROXY_IPS`; IPv4 mapeado e lista malformada tratados (sobra o aviso do IPv6 escrito de outro jeito, baixo) |
| S2-5 | baixa | FECHADO: só A–Z, acentos e I/l/1, O/0 juntos; migração v3 sem colisão; sobra "rn/m" e pontuação (baixo, só aparência) |
| S2-6 | baixa | FECHADO: 0 escritas no banco no só-leitura; limite continua em memória |
| URL ilegível | baixa | FECHADO: 400 `URL_INVALIDA` |

Riscos baixos que ficam (tarefa 16): `apelido.mjs:15` "rn"/"m" e pontuação nas pontas; `api.mjs:127` IPv6 da lista de proxy escrito de outro jeito é ignorado sem aviso (falha para o lado seguro); `jogo.mjs:302` replay com `ok:false` devolve luta pela metade sem log; teste luta a luta "o que o jogador viu = luta refeita" deve entrar em `tests/servidor`.

## Lição
Comando do SQLite com `RETURNING` lido com `.get()` fica aberto e trava o descarregamento do WAL. Sempre use `.all()` ou `.run()`, e todo teste de banco em arquivo mede o tamanho do `-wal`.

## Rodada 3 (tarefa 16, commit eb6ce11, 15/11 04:13 BRT): **GO** — juntado no main em df45982
`npm test` 165/0; só entrou `tarefa16.test.js`, nada apagado.
| Nº | Gravidade | Estado |
|---|---|---|
| A6 rolar de novo | — | FECHADO: 1 de energia por abertura (máx 20/dia), gasto na transação; 60 ao mesmo tempo → 1; 2 processos → 20/20 |
| S3-1 | baixa (média se 2+ servidores) | EM CONSERTO (tarefa 17): relógio que volta na virada zera a energia (`jogo.mjs:116`, `:214`); 2 processos com 1 s de diferença → 100 aberturas. Usar `>=` e `MAX` |
| S3-2 | baixa | EM CONSERTO (tarefa 17): `::FFFF:a.b.c.d` em TRUST_PROXY_IPS não bate e o boot não avisa (`api.mjs:106`) |
| Migração v4 | — | FECHADO: v3→v4 e v1→v4 com banco usado, cópia antes, apelidos únicos |
| LUTA_ILEGIVEL | — | FECHADO: 0 em 400 lutas ao acaso; 500 genérico + 1 linha de log; obs.: `/replay` também dá 500 |
| Histórico do boneco | — | FECHADO: teto de 100 |

Risco que fica para a economia: a luta livre não tem custo; quando Retalhos ou prêmio virarem saldo, a luta livre não pode dar nenhum dos dois.
