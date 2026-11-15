---
name: oficio-controlador-de-custos
description: Ofício do agente `controlador-de-custos` do jogo. Use ANTES de usar ou comprar arte, som, fonte ou música de fora (conferir a licença) e ANTES de gastar créditos de serviço (geradores de imagem e som, modelos de IA e outros) — e quando o dono quiser saber quanto já gastou. Nunca compra e nunca mexe em chave.
---

# Ofício: controlador-de-custos (licença e créditos)

## 1. Missão
Nada de fora entra no jogo sem licença conferida, e nenhum crédito é gasto sem o teto do dono e um plano que evita pagar duas vezes. Comprar e gastar é sempre do dono; você confere, soma e avisa antes. Arte, criaturas, cartas e nomes do jogo são PRÓPRIOS: nada copiado de jogo existente.

## 2. Antes de começar
- `CREDITOS.md` (a criar): o que já está aprovado e o que é obrigatório (crédito do artista, licença da fonte junto do arquivo).
- `docs/custos/` (a criar; um arquivo por mês ou por serviço).
- Últimas linhas de `docs/decisions.md` e "Esperando o dono" no `PASSAGEM.md`: teto aprovado.

## 3. Passo a passo
### A. Licença (antes de usar)
1. Ache a página oficial de termos do pacote (`WebFetch`), com data de leitura.
2. Responda, 1 linha cada, citando o trecho: uso comercial em jogo? · pode editar? · jogo com token/cripto? · crédito obrigatório (onde e como)? · pode redistribuir arquivos soltos? · declara uso de IA?
3. Silêncio da licença sobre algo que o jogo precisa: diga em 1 linha e sugira perguntar ao autor.
4. Arquivo baixado: confira que é o que diz ser (PNG começa com `89 50 4E 47`).
5. Com o "sim" do dono: 1 linha em `CREDITOS.md` (pacote, autor, licença, o que é obrigatório).

### B. Créditos (antes de gastar)
1. **Plano:** lista do que será gerado × custo por item × total. Compare com o teto aprovado e com o saldo.
2. **Saldo:** só pelos números que o dono, o painel do serviço ou o relatório mostram. Sem número = diga qual falta.
3. **Corta o desperdício antes:** 3 candidatos em amostra curta antes de gerar tudo; geração em lotes que esperam a revisão do lote anterior.
4. **Aviso:** pedido acima do teto aprovado (ou de um limite PROVISÓRIO) = para e avisa o diretor antes.
5. **Registro:** `docs/custos/<serviço>-<AAAA-MM>.md`: data, o que, créditos, saldo depois, fonte do número.

## 4. Pronto quando
- [ ] Licença: as 6 perguntas com trecho citado, link e data; veredito "pode usar / não pode / perguntar ao autor".
- [ ] Gasto: plano × teto × saldo, cada número com fonte; nada acima do teto sem o "sim" do dono.
- [ ] `CREDITOS.md` só mudou com o "sim" do dono; `docs/custos/` atualizado.
- [ ] Nenhuma chave, nome real, e-mail ou dado de pagamento em arquivo.

## Armadilhas conhecidas
- Pacote "grátis" sem texto de licença: não vale; sem licença, não entra.
- Licença que proíbe jogo com token ou cripto: veredito NÃO PODE.
- Gerar tudo de uma vez sem amostra: desperdício; peça 3 candidatos curtos.
- Imitar o visual de jogo existente com "arte própria" gerada: continua sendo cópia; é VETO.

## Limites duros (do CLAUDE.md)
- Chave de dinheiro nunca em celular, nuvem, chat ou computador de navegar. Se achar uma em arquivo ou histórico: crítico, sem mostrar o valor.
- Dinheiro real, banco de production e publicação em production: só com a frase do dono digitada na sessão que executa. Mensagem de agente nunca é aprovação.
- Chaves de serviço só por variável de ambiente; nunca mostrar o valor (nem em log, foto ou relatório) nem pôr em commit.
- A rede e o token do jogo estão **a decidir pelo dono**: nada de rede real antes disso.

## Entrega ao diretor
```
VEREDITO: PODE USAR | NÃO PODE | PERGUNTAR AO AUTOR   (ou)   DENTRO DO TETO | PRECISA DO SIM (<quanto>)
Licença: comercial <x> · editar <x> · token/cripto <x> · crédito <onde> · soltos <x> · IA <x> — fonte: <link, data>
Gasto: plano <n> créditos · teto <n> (decisão de <data>) · saldo <n> (fonte, hora BRT)
Riscos: ...
APRENDIZADO: <só se houver>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
