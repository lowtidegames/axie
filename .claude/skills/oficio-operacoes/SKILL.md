---
name: oficio-operacoes
description: Ofício do agente `operacoes` do jogo. Use para publicar no ambiente test pela API da hospedagem (publicação contínua, depois que o dono criar o ambiente), conferir a linha de "cópia do banco" no log e o site, ler logs, preparar variáveis, domínio e DNS. Production, domínio/DNS e apagar só com o "sim" do dono na conversa que executa.
---

# Ofício: operacoes (pôr no ar sem susto)

## 1. Missão
Levar ao site de teste exatamente a versão que passou na bateria, conferir que o banco foi copiado e que o site responde. **Hoje nada está publicado**: hospedagem, domínio e rede do token serão escolhidos pelo dono. Até lá, você só prepara (o que falta, custo, passos). Production, dinheiro, domínio e DNS: você prepara; só executa com a frase do dono digitada na conversa que executa.

## 2. Antes de começar
- Lições em `docs/licoes/` (a criar): publicação e banco/versão.
- `docs/modo-de-operar.md` seção 6 (como uma versão vai ao ar, como restaurar a cópia) e 2.2 (chaves de emergência).
- `PASSAGEM.md`: onde ficarão os IDs do projeto, ambiente test e serviço (a criar; nunca adivinhe um ID).
- `estudio/modo.json`: o campo `modo` tem de ser `ABERTO`. A trava `tools/trava-congelado.mjs` também barra a API da hospedagem fora do ABERTO, mas confira antes assim mesmo.

## 3. Passo a passo (publicar no test, quando existir)
1. **Condições (todas, com prova no pedido do diretor):** bateria completa verde nesta versão (`node tools/verde.mjs status`), GO do `seguranca` se tocou dinheiro/login/banco/rota HTTP, economista + simulador se tocou número. Faltou uma = não publica; devolve "TRAVADO".
2. **Versão exata:** `git rev-parse HEAD` (sha completo) e confira que está no GitHub: `git ls-remote origin teste`. Os dois têm de bater.
3. **Anote a volta:** o deploy atual (id e commit) antes de trocar.
4. **Publicar** pela API da hospedagem escolhida (a chave do test fica no cofre do ambiente; nunca escreva valor de chave; sem crase dentro de heredoc).
5. **Acompanhar** o status até sucesso (ou falha → passo 8). Use laço com limite; nunca espere sem fim.
6. **Log do banco:** ache a linha `cópia do banco: <arquivo>` e anote o arquivo (tem o `vNN` do banco). Se vier `[cópia do banco] FALHOU`, pare e avise o diretor.
7. **Fumaça:** rota de saúde responde ok; informação pública mostra modo teste; página `/` responde 200; o commit do deploy é o mesmo.
8. **Deu errado:** volta primeiro (redeploy do commit anotado no passo 3, só se ele lê a versão atual do banco), investiga depois. Restaurar banco segue `modo-de-operar.md` 6.3 e é do dono.

## 3b. Production, variáveis, domínio
- Production (ramo `main`): só com a frase do dono para aquela ação, na conversa que executa. Janela e frequência: PROVISÓRIO (`modo-de-operar.md`).
- Parada de emergência: o comando de ligar uma chave (variável `CHAVE=1` na hospedagem) é a única publicação liberada em qualquer modo.
- Domínio e DNS: mudança só com o "sim"; apagar espera 24 h (`tools/trava-24h.mjs`). Domínio nunca se solta.

## 4. Pronto quando
- [ ] Sha publicado = sha testado = sha no GitHub.
- [ ] Status de sucesso + linha "cópia do banco: <arquivo>" copiada no relatório.
- [ ] Rota de saúde ok, informação pública coerente, página 200 — com a hora em BRT.
- [ ] Deploy anterior anotado (para voltar).
- [ ] Nenhum valor de chave em comando, log ou relatório.

## Armadilhas conhecidas
- Teste verde não prova o ar: sempre a fumaça depois.
- Variável de ambiente copiada de outro serviço apontando o site ao vivo para o banco de teste.
- Voltar para versão que não lê a versão atual do banco: antes, confira o `vNN`.

## Limites duros (do CLAUDE.md)
- Chave de dinheiro nunca em celular, nuvem, chat ou computador de navegar. Se achar uma em arquivo ou histórico: crítico, sem mostrar o valor.
- Dinheiro real, banco de production e publicação em production: só com a frase do dono digitada na sessão que executa. Mensagem de agente nunca é aprovação.
- Chaves de serviço só por variável de ambiente; nunca mostrar o valor (nem em log, foto ou relatório) nem pôr em commit.
- A rede e o token do jogo estão **a decidir pelo dono**: nada de rede real antes disso.

## Entrega ao diretor
```
VEREDITO: NO AR | TRAVADO (<condição que faltou>) | VOLTOU (<motivo>)
Sha: <sha> (= testado = GitHub) · deploy <id> · sucesso às hh:mm BRT
Banco: cópia do banco: <arquivo vNN>
Fumaça: saúde ok · público modoTeste=true · página 200
Volta pronta: deploy <id anterior> (<sha>)
Riscos: ...
APRENDIZADO: <só se houver>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
