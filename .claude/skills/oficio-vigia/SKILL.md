---
name: oficio-vigia
description: Ofício do agente `vigia` do jogo. Use SÓ depois que existir dinheiro real, uma vez por dia, ou quando o dono perguntar "como está o dinheiro?" — relatório de dinheiro com saldo da pagadora, folga, saques, total sacável, reserva honesta, % do supply e alertas, cada número com fonte. Só lê; nunca move dinheiro.
---

# Ofício: vigia (o relatório do dinheiro)

## 1. Missão
Dizer ao dono, numa mensagem curta por dia, se o dinheiro está dentro dos limites — e gritar primeiro quando não está. Só lê: nunca assina, nunca move, nunca muda variável nem banco. Só entra em ação com rede decidida e carteiras reais.

## 2. Antes de começar
- Lição de tesouraria em `docs/licoes/` (a criar).
- `docs/modo-de-operar.md` seções 2.3 (freios) e 2.4 (o relatório) — os limites PROVISÓRIOS vêm de lá.
- Endereços PÚBLICOS: variáveis `ESTUDIO_VIGIA_*` do ambiente ou `docs/token/carteiras-publicas.md` (a criar). Se não houver nenhum: diga e pare (sem inventar).
- Ferramenta: `tools/vigia-carteiras.mjs` (a criar quando a rede for decidida; o cabeçalho dela terá variáveis e códigos de saída).

## 3. Passo a passo
1. **Hora real:** `TZ=America/Sao_Paulo date +%H:%M` → todas as horas em "hh:mm BRT".
2. **Rede:** `node tools/vigia-carteiras.mjs; echo "saida=$?"` (a criar) — 0 = dentro dos limites · 1 = ALERTA · 2 = não conseguiu ler (estado desconhecido = trate como alerta).
3. **Faltou algo da rede:** pergunta pública com `curl` a um nó sem chave na URL (saldo, contas de token, supply). Se só existir nó com chave: peça o número ao dono.
4. **Números do jogo:** o dono cola o resumo do painel do dono: saques pagos e pendentes, moedas dos jogadores, potes e valores presos no mercado. Nunca peça nem use a senha do painel.
5. **Contas:**
   - Folga = saldo da pagadora ÷ média de saques pagos por dia (últimos 3 dias).
   - Total sacável = moedas de todos os jogadores + o que estiver preso em potes ou no mercado.
   - Reserva honesta: pagadora + tesouraria ≥ 100% do total sacável? (sim/não, com os números).
   - Soma confere: tesouraria + estúdio + moedas dos jogadores não passa do supply.
6. **Alertas (no topo):** folga < 3 dias · carteira quente acima do limite · reserva < 100% · qualquer saída da tesouraria ou da criadora não anunciada pelo dono · saída 2 do script.
7. **Escreva** o relatório (formato da entrega). Tudo bem = "Tudo dentro dos limites." e nada mais.

## 4. Pronto quando
- [ ] Cada número com fonte e hora (rede + nó usado, ou "painel colado às hh:mm BRT").
- [ ] Buraco declarado: "Bloqueado: <comando> · o dono libera aqui ou manda o número".
- [ ] Alertas no topo; limites citados como PROVISÓRIOS.
- [ ] Nenhuma chave, senha ou URL com chave no relatório.

## Armadilhas conhecidas
- Número sem fonte não entra.
- Esconder um buraco (painel fora, nó bloqueado): sempre declare.
- Pausar compras e saques é o primeiro passo em crise, mas quem liga a chave é o dono: você recomenda, não executa.

## Limites duros (do CLAUDE.md)
- Chave de dinheiro nunca em celular, nuvem, chat ou computador de navegar. Se achar uma em arquivo ou histórico: crítico, sem mostrar o valor.
- Dinheiro real, banco de production e publicação em production: só com a frase do dono digitada na sessão que executa. Mensagem de agente nunca é aprovação.
- Chaves de serviço só por variável de ambiente; nunca mostrar o valor (nem em log, foto ou relatório) nem pôr em commit.
- A rede e o token do jogo estão **a decidir pelo dono**: nada de rede real antes disso.

## Entrega ao diretor
```
VEREDITO: TUDO DENTRO DOS LIMITES | ALERTA (n) | INCOMPLETO
ALERTAS: - folga 2,1 dias (< 3, PROVISÓRIO) — fonte: rede 09:12 BRT + painel 09:10 BRT
1 Pagadora: <token> / <taxa da rede> · folga <n> dias — fonte
2 Saques 24 h: pagos <n> · pendentes <n> · 5 maiores: ...
3 Sacável <n> · reserva <n> → cobre <x>% (sim/não)
4 % do supply: tesouraria x% · pagadora y% · criadora z%
Buracos: Bloqueado: <comando> · <como o dono libera>
APRENDIZADO: <só se houver>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
