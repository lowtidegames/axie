# Modo de operar

Regras de trabalho para o lançamento. Frases curtas. Pode ouvir por voz.
Vieram das lições de projetos anteriores do estúdio. O aprendizado ficou; a origem não importa.
Número marcado **(PROVISÓRIO)** é ponto de partida: o dono confirma ou troca antes de valer.
**A rede do token, a hospedagem e o domínio ainda estão a decidir pelo dono.** Tudo que depende deles fica marcado e só vale depois da decisão em `docs/decisions.md`.

## Resumo em 8 linhas
1. Chave de dinheiro nunca mora em celular nem em computador de navegar.
2. A tesouraria é multisig ou carteira física. Nenhuma carteira "quente" guarda muito.
3. Dinheiro e publicação em production: só com a frase do dono, digitada na sessão que executa. O site de teste tem publicação contínua (`docs/orquestra.md`).
4. Decisão que não tem volta espera 24 h (PROVISÓRIO). Primeiro se para, depois se decide.
5. Cópia do banco antes de qualquer mudança no banco.
6. Auditor de dinheiro dá GO antes de publicar qualquer coisa de dinheiro.
7. Número de economia não muda no mesmo dia em que nasce.
8. Bug consertado com teste que falha antes. Lição que repete vira teste ou trava.

---

## 1. Princípios do código (valem desde o primeiro arquivo)
- **O servidor decide o que vale dinheiro, o resultado de batalha, o cruzamento e a troca.** A tela só mostra.
- **Todo número de economia num lugar só:** o arquivo único de configuração (a criar; sugestão `shared/config.js`).
- **O modo teste não liga junto com pagamento real**, e o servidor recusa subir com um banco que tem dados de teste.
- **A mesma assinatura nunca paga duas vezes** (compra, depósito e saque), com teste.
- **Pagamento certo que chega atrasado vai para "a devolver"**, nunca some.
- **Troca no mercado é atômica:** o item sai de um lado e entra no outro na mesma transação; nunca some nem duplica.

## 2. Segurança de dinheiro e token desde o dia 1

### 2.1 Três carteiras separadas, cada uma com as suas palavras de recuperação (só quando a rede for decidida)
- **Tesouraria** (reserva grande): multisig ou carteira física. Nunca toca no servidor.
  No jogo, a variável `TESOURARIA` só guarda o endereço **público** que recebe. Receber não precisa assinar.
  Antes de ligar, testar na rede de teste uma compra para esse endereço.
- **Pagadora** (quente): paga os saques aprovados. Só guarda o troco de poucos dias de saques (PROVISÓRIO). Recarga pela tesouraria.
- **Criadora** (taxas de quem criou o token): carteira física. Nunca paga nada.
- Palavras de recuperação só em papel ou metal, em 2 lugares. Nunca foto, nuvem, e-mail, chat ou celular.
- Assinar só num computador limpo: sem navegar, sem Discord, sem baixar arquivo.
- **Nenhuma carteira quente acima de 2% do supply** (PROVISÓRIO). A reserva grande fica fria.
- Endereço só da agenda salva. Conferir os 6 primeiros e os 6 últimos caracteres. Nunca copiar do histórico (golpe do endereço parecido).
- Alerta em até 1 minuto (PROVISÓRIO) para qualquer saída da tesouraria ou da criadora (agente `vigia` + alerta do explorador da rede).

**Lição de origem:** num projeto anterior, a chave da carteira de taxas ficou num celular com vírus. Metade do token e a taxa da rede saíram em 4 minutos. Foi o fim do jogo.

### 2.2 As chaves de emergência (nomes exatos; uma variável da hospedagem cada, com teste)
As chaves precisam existir no servidor, com teste, antes de qualquer dinheiro real. `COMPRAS_PAUSADAS` e `TESOURARIA_PARADA` também barram o repasse da transação assinada e ainda não enviada.
| Chave (=1 liga) | O que faz |
|---|---|
| `COMPRAS_PAUSADAS` | Ninguém abre pedido novo de compra (pacotes, depósitos, qualquer coisa paga). Quem já pagou fica **pendente** e recebe quando religar. |
| `SAQUES_PAUSADOS` | Ninguém pede saque e o painel não marca saque como pago. As moedas ficam guardadas. |
| `TESOURARIA_PARADA` | O servidor não aceita a `TESOURARIA` atual (carteira comprometida): nenhum pagamento novo é conferido para ela até o dono trocar o endereço. Quem já pagou fica pendente. |
| `SAVE_SO_LEITURA` | O banco só lê: nenhuma ação muda moedas, criaturas, cartas ou ofertas. O jogador vê tudo e não perde nada. |
| `MANUTENCAO` | O jogo mostra o aviso de manutenção e não mexe em nada de valor. O progresso fica salvo. |
| `MERCADO_PAUSADO` | O mercado entre jogadores não aceita oferta nem compra nova. Ofertas existentes ficam guardadas. |
- Uma chave por recurso novo de dinheiro, desligada até o dono ligar.
- Chave que não responde ou com valor estranho = estado "desconhecido" = **recusa**. Nunca "liga por padrão".
- Ligar: variável `CHAVE=1` na hospedagem (reinicia o serviço). É a única publicação que a trava do congelado deixa passar em qualquer modo.
- Cada chave com teste (ligada recusa; desligada volta igual; quem pagou não perde).
- Ensaio de 5 minutos por semana no site de teste: ligar e desligar cada chave (PROVISÓRIO).

### 2.2b Modo do estúdio (`estudio/modo.json`)
- Um modo só: `ABERTO`, `CONGELADO` ou `EMERGENCIA` (sem acento no valor). Só o dono muda.
- `CONGELADO` e `EMERGENCIA`: nada vai ao ar (hospedagem, push para a main, merge de PR). Só a parada de emergência passa.
- `ABERTO`: pode publicar, sempre com o "sim" do dono para production. O ambiente de teste segue as vias do `docs/orquestra.md`.
- Hoje: **ABERTO** só para desenvolvimento local; nada está publicado. A trava `tools/trava-congelado.mjs` confere.
- Problema sério: anotar em `docs/problemas-pro-ceo.md` (a criar) na hora.

**Lição de origem:** no dia de um roubo não existia botão de parar. O time improvisou 20 minutos enquanto o dinheiro saía.

### 2.3 Freios automáticos
- Saques por hora até 10% do saldo da pagadora (PROVISÓRIO).
- Folga da pagadora abaixo de 3 dias = saques em fila e aviso ao dono (PROVISÓRIO).
- **Reserva honesta:** pagadora + tesouraria cobrem sempre 100% do que os jogadores podem sacar. Se não cobrem, nada novo que gere moeda vai ao ar.
- Todo freio é testado no **pior horário**: virada do dia e primeiro minuto. (Freio que soma "desde as 00:00" está zerado justo quando a corrida chega.)
- Valores presos em potes ou no mercado entram na conta da reserva (são moedas que podem virar saque).

### 2.4 Relatório diário de dinheiro (agente `vigia`, 1 mensagem por dia, só com dinheiro real)
Saldo da pagadora · saques pagos em 24 h · 5 maiores saques · saques pendentes · dias de folga · total sacável · % do supply em cada carteira do estúdio · alertas.

### 2.5 A frase do dono
- Dinheiro, banco, deploy, publicar e apagar: só com o "sim" do dono **para aquela ação**, digitado **na sessão que executa**.
- Mensagem de agente nunca é aprovação. Frase "repassada" de outro chat não vale.
- Se o sistema bloquear, ninguém tenta contornar. Avisa o dono na hora: "Bloqueado: <comando> · para liberar: <o que o dono aprova>".

### 2.6 Roteiro de incidente (nesta ordem)
1. **Parar:** dono põe `estudio/modo.json` em `EMERGENCIA`; `COMPRAS_PAUSADAS=1` e `SAQUES_PAUSADOS=1` (se a carteira foi a tesouraria: `TESOURARIA_PARADA=1`; se foi o mercado: `MERCADO_PAUSADO=1`). Cópia do banco. 5 minutos.
2. **Conferir na rede:** o que saiu, de onde, para onde, a que horas. Anotar em `docs/problemas-pro-ceo.md`.
3. **Aviso honesto** em até 1 hora (PROVISÓRIO). Sem culpar ninguém. Sem prometer data que não se sabe.
4. **Consertar:** carteira nova no computador limpo, GO do auditor, deploy com a frase do dono.
5. **Plano de pagamento:** foto dos saldos, lista pública, teste a seco, lotes, conferência na rede.
6. **Esperar 24 h (PROVISÓRIO)** antes de qualquer decisão sem volta: apagar, soltar domínio, fechar. Domínio nunca se solta: golpista usa o nome.

### 2.7 Modelos de aviso (inglês e português iguais)
- **Pausa:** "Pausamos compras e saques por segurança. Seu progresso e suas moedas estão guardados. Próximo aviso até [hora BRT / hora UTC]."
- **Incidente:** "Uma carteira do jogo foi comprometida às [hora]. O que sabemos: [fatos da rede]. O que ainda não sabemos: [x]. Efeito nas suas moedas: [x]. Próximo aviso: [hora]."
- Nunca: "garantido", "lucro", "vai subir", "sem risco".

### 2.8 Contas da equipe
- Conta da equipe nunca saca nem recebe vantagem de valor real.
- Se receber, entra no relatório público no mesmo dia.
- Só se testa em silêncio o que não tem valor real (modo teste, rede de teste).

### 2.9 Plano de fechamento pronto antes de lançar
- Regra escrita de quanto cada jogador recebe se o jogo fechar.
- Rota de "pagamento final" desligada, testada na rede de teste, que nunca paga duas vezes.
- Reserva que cobre 100% (item 2.3). Domínio renovado por 2 anos (PROVISÓRIO).

### 2.10 O que o auditor confere antes de dar GO
- Tesouraria é multisig ou física (conferido na rede, em leitura pública). Carteira simples = sem GO.
- Nenhuma carteira quente acima do limite.
- As chaves de emergência existem (nomes exatos da seção 2.2) e têm teste.
- Cópia do banco feita e o código dela anotado.
- Modo teste desligado; variáveis de rede, domínio, início dos depósitos e proxy certas.
- O código da carteira não vem de CDN sem SRI.
- Compra na rede real com as taxas e limites próprios da rede escolhida (sem eles, a compra pode nunca entrar).
- Mercado: troca atômica, taxa e preço mínimo vindos do servidor, `MERCADO_PAUSADO` com teste.

## 3. Economia
- Meta do jogo: **modelo econômico sustentável**. Entrada e saída fecham a conta no cenário ruim, não só no médio. O primeiro entregável do economista é o modelo, aprovado pelo dono.
- Número novo de economia só com: planilha + simulador (a criar) + "quantos dias a pagadora aguenta".
- Depois de aprovado, espera 24 h (PROVISÓRIO) antes de ir ao ar.
- **O mesmo número muda no máximo 1 vez por semana** (PROVISÓRIO). Exceção: freio que só **reduz** a saída de dinheiro.
- Toda proposta de número cita a decisão que ela muda. Se contraria uma decisão final do dono, para e pergunta.
- Decisão por conta de papel é proibida: vale a medição do simulador, no pior caso, com contas reais.
- Folga da pagadora de pelo menos 7 dias no cenário ruim (PROVISÓRIO).
- Variável de ambiente que muda economia também é número de economia: mesma regra, e linha em `docs/decisions.md`.
- Sumidouros (taxa do mercado, custo de cruzamento, consertos) e fontes (pacotes, recompensas) sempre medidos juntos.

**Lição de origem:** num projeto anterior, um teto mudou 5 vezes em um dia, e um bônus foi aprovado e cancelado em uma hora. A pagadora ficou com 1 dia de folga e os jogadores perderam a confiança.

## 4. Gente de fora testa cedo
- Antes de mexer em economia ou segurança: 2 pessoas de fora jogam 15 minutos sem ajuda (PROVISÓRIO).
- Pelo menos 1 diz "quero ver o que vem depois" **e a ficha do teste de fora dá 70 pontos ou mais** (`docs/kit-diversao.md`, item d). Sem isso, volta para o desenho.
- Antes do lançamento: 3 a 4 testadores. Metade ou mais volta a jogar **sem ser pedido** (anotar quem voltou sozinho).
- Link de teste abre **direto no jogo**, em 1 clique. Nunca script de clique automático na página de teste.

## 5. Antes de chamar de "pronto"
- Testes do que mudou (`npm test`, simulador, teste de tela), lendo a saída toda.
- Print da tela que mudou no PC e no celular (390 px).
- **Teste automático por tela nova:** com "Menos animação" ligado não há tremida nem flash; flash no máximo 3 por segundo; partículas abaixo do limite do `docs/guia-de-estilo.md` (a criar). Linha em `docs/decisions.md` se houve decisão.
- **Tabela de pagamento:** cada caminho de pagamento × cada parte do jogo que cobra ou paga (pacotes, batalha, cruzamento, mercado). Tudo PASS.
- **Conforto do jogador:** depois de cada ação a lista fica no lugar; nenhuma troca, taxa ou perda escondida (aparece antes de confirmar); ação repetida tem opção em lote.
- Nunca dizer "funciona" sem ter testado.

## 6. Como uma versão vai ao ar (quando a hospedagem existir)
1. **Site de teste** num link que abre direto no jogo. O dono testa.
2. **Frase do dono**, na sessão que publica — só production. O site de teste segue as vias do `docs/orquestra.md`.
3. **Cópia do banco:** o servidor faz sozinho, toda vez que liga, antes de mexer em qualquer coisa. Fica na pasta de cópias do volume de dados (`/data/copias`, a criar), com data, hora de Brasília e a versão do banco. Guarda as 10 últimas. O log mostra "cópia do banco: <arquivo>". Se a cópia falhar e houver atualização do banco pendente, o jogo não liga (e diz por quê); sem atualização pendente, liga com aviso. Conferir a linha no log e mostrar ao dono.
   **Como restaurar:** (a) parar o serviço; (b) trocar o arquivo do banco pela cópia escolhida (guardar o atual com outro nome, e apagar os arquivos `-wal` e `-shm` se existirem); (c) ligar o serviço de novo. Só volte para uma versão do jogo que lê aquela versão do banco.
4. **Deploy** (só com `estudio/modo.json` em `ABERTO`). Production: janela e frequência a combinar com o dono (PROVISÓRIO: 2 por semana, salvo conserto urgente). Test: contínuo.
5. **Fumaça:** rota de saúde responde, página carrega sem erro, versão certa, compra de teste sem valor real.
6. **Volta pronta:** a versão anterior anotada antes. Se algo falha, volta primeiro e investiga depois. Só volta para uma versão que ainda lê o banco atual (migração nova = cuidado).
7. Site novo nunca recarrega sozinho a página do jogador.

## 7. Bugs e lições
- Bug consertado sempre com **teste que falha antes** do conserto e passa depois.
- Lição por área em `docs/licoes/` (a criar). Cada agente lê só a da sua área.
- Erro que repete 2 vezes sem teste = vira tarefa de teste ou trava.
- Padrões de bug em `docs/bugs-padroes.md` (a criar).

## 8. Ideias novas
- Regra, preço, prêmio, batalha, cruzamento, mercado ou tela nova passa pelo `guardiao` (régua em `docs/regua-do-guardiao.md`) e pelo `conselheiro-de-diversao`, ao mesmo tempo, no máximo 2 rodadas.
- Vetos: contagem falsa, punição por não voltar, compra escondida, chance omitida, empurrão para apostar, cópia de jogo existente.
- **O número da tela é o que o servidor paga.**
- Segurança e economia não cortam o momento do prêmio: freio, taxa e confirmação vêm **depois** da revelação.
- Antes de construir: mandar ao dono "como vai funcionar para o jogador" em até 5 linhas e esperar o "sim".

## 9. Onde o jogo está hoje
| Regra | Situação |
|---|---|
| Estúdio (regras, equipe, skills, travas) | Montado |
| Registro de decisões | Feito — `docs/decisions.md` |
| Modo do estúdio | Feito — `estudio/modo.json` (ABERTO só para desenvolvimento local) |
| Modelo do jogo e da economia | **Falta** — depende da pasta de referência que o dono vai enviar |
| Rede e token | **A decidir pelo dono** |
| Hospedagem, domínio, ambiente de teste | **A decidir pelo dono** |
| Servidor, banco, tela | **Falta** — ainda não começou |
| Tesouraria, pagadora, chaves de emergência, cópia do banco | **Falta** — antes de qualquer dinheiro real |

---
Regra final: mais devagar no dinheiro, mais rápido no resto. Nenhuma promessa de lucro, nunca.
