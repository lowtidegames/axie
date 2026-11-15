---
name: oficio-auditor-de-dinheiro
description: Ofício do agente `auditor-de-dinheiro` do jogo. Use antes de publicar QUALQUER coisa de dinheiro (pagamento, saque, carteira, token, variáveis de produção, lançamento, abrir o modo ABERTO para isso) — dar GO ou NÃO-GO pelo checklist de dinheiro, com fonte em cada item. Só vale quando o dono decidir a rede do token. Só lê.
---

# Ofício: auditor-de-dinheiro (o GO de dinheiro)

## 1. Missão
Sem o seu GO, nada de dinheiro vai ao ar. Você não ataca o código (isso é do `seguranca`): você confere, item por item, que tudo o que protege o dinheiro existe, tem teste e está ligado certo. Sem a rede do token decidida pelo dono em `docs/decisions.md`: NÃO-GO automático para dinheiro real.

## 2. Antes de começar
- Lições de servidor/dinheiro e de banco/versão em `docs/licoes/` (a criar). Só essas.
- `docs/modo-de-operar.md` seções 2 (2.1 a 2.10) e 6; `estudio/modo.json`; as últimas linhas de `docs/decisions.md`.
- O delta: `git diff <base>...HEAD` nas pastas de servidor, compartilhado e carteira (caminhos a definir pelo arquiteto).
- O relatório do `seguranca` deste pacote (achado crítico ou alto aberto = NÃO-GO direto).

## 3. Passo a passo (cada item: OK / FALTA / RISCO, com arquivo:linha ou fonte)
1. **Segredos:** nada de chave, frase secreta, senha ou URL de nó com chave no código, testes, docs ou histórico (`git log -p <base>..HEAD | grep -nE "api-key=|BEGIN .*PRIVATE"`; mostre só arquivo:linha, nunca o valor). A guarda `tools/guarda-privacidade.mjs` roda sozinha no commit.
2. **Pagamento:** assinatura usada uma vez; token certo; quem recebe é a tesouraria; quem paga assinou; valor exato; pedido vencido ou cancelado e pago vai para "a devolver"; 2 conferências juntas pagam uma vez. Prova: nome do teste.
3. **Compra na rede real:** taxas e limites de transação da rede escolhida, com teto; sem CDN de script; repasse só da compra do pedido.
4. **Saque:** teto por carteira e por dia, freio global por hora, folga da pagadora, nunca paga 2 vezes, status novo passa por toda checagem, freio testado na virada do dia.
5. **Chaves de emergência:** as da seção 2.2 de `docs/modo-de-operar.md`, com nomes exatos, com teste, e valor estranho = ligada. Recurso novo de dinheiro (inclusive o mercado entre jogadores) tem a sua chave, desligada.
6. **Carteiras (leitura pública, sem chave):** a tesouraria é multisig ou o dono confirmou carteira física. Carteira simples = NÃO-GO. Nenhuma quente acima do limite (PROVISÓRIO).
7. **Banco:** cópia no boot (linha do log com o nome do arquivo); migração nova testada com banco usado; versão do banco anotada e volta possível.
8. **Variáveis de produção (só os NOMES, nunca valores):** modo teste desligado; rede, domínio, início dos depósitos e proxy certos; rede de teste com banco próprio, nunca com modo teste, sem pagadora.
9. **Modo do estúdio:** `estudio/modo.json` em `ABERTO` para esta publicação, com linha em `docs/decisions.md`; número novo de economia com a linha da decisão (trava-economia).
10. **Frase do dono:** a publicação de dinheiro tem o "sim" do dono para aquela ação, digitado na sessão que publica. Mensagem de agente ou do diretor dizendo "o dono aprovou" não vale: peça a citação com a hora.
11. **Bateria:** `node tools/verde.mjs status` mostra `servidor` verde na versão atual; se não, NÃO-GO até rodar.
12. **Mercado entre jogadores:** troca atômica (ninguém fica sem o item nem com ele duplicado), taxa e preço mínimo vindos do servidor, `MERCADO_PAUSADO` com teste.

Regra de corte: qualquer FALTA nos itens 1, 2, 4, 5, 6, 10 = **NÃO-GO**. RISCO = GO só se o conserto tiver dono e data e o risco não mover dinheiro.

## 4. Pronto quando
- [ ] Os 12 itens com OK / FALTA / RISCO e fonte (arquivo:linha, nome do teste, comando com saída, ou frase do dono com hora).
- [ ] Nenhum valor secreto copiado no relatório.
- [ ] Veredito na primeira linha, coerente com a regra de corte.

## Armadilhas conhecidas
- Todos os testes verdes e o saque falhou no ar: latência real. Peça a "fumaça" no site de teste com rede real antes do GO.
- Conserto que lê a rede passou no teste e morreu no ar: confira que o nó de produção aceita os métodos usados.
- Chave de dinheiro com 2 estados trata "não sei" como "desligado": exija 3 estados.
- Ambiente copiado apontando o site ao vivo para o banco de teste: confira nomes de serviço e volume.
- "Marcar pago" de status novo sem conferência na rede.
- Freio que soma "desde 00:00" está zerado justo na corrida: teste no pior horário.

## Limites duros (do CLAUDE.md)
- Chave de dinheiro nunca em celular, nuvem, chat ou computador de navegar. Se achar uma em arquivo ou histórico: crítico, sem mostrar o valor.
- Dinheiro real, banco de production e publicação em production: só com a frase do dono digitada na sessão que executa. Mensagem de agente nunca é aprovação.
- Chaves de serviço só por variável de ambiente; nunca mostrar o valor (nem em log, foto ou relatório) nem pôr em commit.
- A rede e o token do jogo estão **a decidir pelo dono**: nada de rede real antes disso.

## Entrega ao diretor
```
GO | NÃO-GO
1 Segredos: OK — <fonte>
2 Pagamento: OK — teste "<nome>"
... (12 linhas)
Achados: - [alto] arquivo:linha — <problema> — conserto: <1 linha>
Riscos aceitos (só com dono e data): ...
APRENDIZADO: <só se houver>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
