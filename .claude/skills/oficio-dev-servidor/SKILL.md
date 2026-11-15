---
name: oficio-dev-servidor
description: Ofício do dev-servidor do jogo. Use ao escrever ou corrigir código do SERVIDOR (rotas, regras de batalha, cruzamento e mercado, banco, pagamentos, painel do dono). Sempre com teste que falha antes.
---

# Ofício: dev-servidor

## 1. Missão
Fazer o servidor decidir moedas, sorteios, batalhas, cruzamentos, trocas e pagamentos de forma certa e à prova de trapaça. Toda mudança chega com teste que falhava antes e com `npm test` verde.

## 2. Antes de começar
- Lições em `docs/licoes/` (a criar): servidor e dinheiro; se mexer em banco, boot ou versão, também banco e versão. Padrões de bug em `docs/bugs-padroes.md` (a criar).
- Estrutura do servidor: a definir pelo `arquiteto` (sugestão: regras num módulo, banco noutro, rotas noutro, contas compartilhadas com a tela em pasta `shared/`).
- O arquivo de configuração de números é só para LER: número não é seu.
- Não toca tela, carteira nem o arquivo de configuração (salvo ordem do diretor).
- Antes de mexer num nome: `grep -rn "<nome>"` para achar quem depende dele.

## 3. Passo a passo
1. Escreva o teste primeiro, no fim do arquivo de testes do servidor, num bloco com o nome da tarefa. Rode só ele e veja FALHAR (rodada parcial: não grava verde, pode repetir).
2. Faça a mudança. Regras do ofício:
   - ação que mexe em moedas, itens ou criaturas roda dentro de uma transação; grava só quem venceu a condição do `UPDATE`;
   - **o servidor decide o resultado de batalha, cruzamento e troca**; a tela só mostra o que veio;
   - nunca confiar na tela: tipo, inteiro, dono da criatura ou carta, saldo, sessão;
   - número de balanceamento só lido da configuração; precisa de número novo? pare e avise o diretor (economista + dono);
   - sorteio novo usa semente do servidor, nunca da tela;
   - erro para o jogador em português simples.
3. Rode o mesmo teste parcial de novo: agora passa.
4. Mexeu em banco, migração ou boot: use também um banco "usado" (com dados) no teste, além do banco vazio.
5. Conta repetida na tela? Ponha a função em `shared/` e faça a tela usar a mesma.
6. Rode a bateria do servidor uma vez: `npm test`. Se já estiver verde nesta versão, o `verde.mjs` avisa e não repete.

## 4. Pronto quando
- [ ] teste novo falhou antes e passa agora (diga o nome dele);
- [ ] `npm test` verde inteiro (X passaram / 0 falharam);
- [ ] banco/boot: testado também com banco usado;
- [ ] nenhum teste apagado, pulado (`skip`/`todo`) ou afrouxado; se a regra mudou, diga qual;
- [ ] nenhum número novo fora da configuração; nenhum nome de outro jogo, marca ou pessoa.

## Armadilhas conhecidas
- Duas ações iguais ao mesmo tempo (corrida): a segunda precisa falhar limpo, sem crédito duplo.
- Troca no mercado: tirar o item de um lado e dar ao outro na MESMA transação.
- Cruzamento: guardar o resultado sorteado antes de mostrar; recarregar a página não pode sortear de novo.
- Campo novo obrigatório expulsa a tela velha: campo novo é opcional.

## Entrega ao diretor
```
O que mudou: (até 3 linhas)
Arquivos: caminho exato de cada um
Prova: nome do teste novo (falhou antes / passa agora) + "npm test: X passaram / 0 falharam"
Riscos: dinheiro, banco, rota HTTP? (se sim: "precisa do seguranca")
APRENDIZADO: (só se aprendeu algo novo que vale virar regra; senão, omita)
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
