# Parecer de segurança nº 2 — servidor rodada 2 (15/11/2026)

Revisor: agente `seguranca` (só leu e atacou). Alvo: `frayz-servidor2` (b943003). `npm test` 139/139; junto com o main 141/141; nenhum teste apagado ou enfraquecido.

## Veredito
**NÃO-GO até consertar o S2-1 (1 linha + teste); depois, GO** para juntar como protótipo SEM dinheiro.

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

## Achados novos
| Nº | Gravidade | O ataque | Conserto | Estado |
|---|---|---|---|---|
| S2-1 | alta | `api.mjs:82` `somar.get()` com RETURNING deixa o comando aberto e o WAL nunca é descarregado: ~8 KB de disco por pedido, até 404/429, de 1 IP sem conta (12 mil pedidos = 94 MB; continua com jogador real) | `somar.all(...)[0]` (+ `journal_size_limit`); teste: 3.000 pedidos não passam de 8 MB de WAL | em conserto (ramo frayz-servidor2b) |
| S2-2 | média | luta encerrada guarda o estado inteiro: ~50 MB/h por conta abrindo e desistindo | guardar só o replay; teto de lutas por conta | em conserto |
| S2-3 | baixa | cada /64 novo cria linha em `limites` mesmo com 429; limpeza só 2.000/min e só após 1 h | apagar por janela do tipo, em laço; /48 antes do /64 | em conserto |
| S2-4 | baixa | `TRUST_PROXY=1` confia no X-Forwarded-For de qualquer conexão; porta exposta = IP à vontade | lista de IPs do proxy | em conserto |
| S2-5 | baixa | `Ina`/`İna`/`ına`, `ɑna`, `ǀana`/`lana` convivem | comparar por esqueleto (NFKD + parecidas) | em conserto |
| S2-6 | baixa | com SAVE_SO_LEITURA o GET ainda grava em `limites` | limites só em memória no modo só-leitura | em conserto |

## Lição
Comando do SQLite com `RETURNING` lido com `.get()` fica aberto e trava o descarregamento do WAL. Sempre use `.all()` ou `.run()`, e todo teste de banco em arquivo mede o tamanho do `-wal`.
