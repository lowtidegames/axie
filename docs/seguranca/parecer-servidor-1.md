# Parecer de segurança nº 1 — servidor do protótipo (15/11/2026 01:31 BRT)

Revisor: agente `seguranca` (só leu e atacou; não editou). Alvo: ramo `frayz-servidor` (f909be0 + 9d28886). Provas: `tests/ataques/servidor-1/` (scripts e saídas; rodam contra um servidor de teste, fora da bateria).

## Veredito
- **GO** para juntar como protótipo SEM dinheiro: não leu arquivo fora das pastas, não usou boneco de outra conta, não duplicou nada, não falsificou resultado, não derrubou o servidor com facilidade.
- **NÃO-GO para o dia em que houver prêmio** enquanto qualquer item da tabela estiver aberto.

## Achados
| Nº | Gravidade hoje / com prêmio | O ataque | Conserto | Estado |
|---|---|---|---|---|
| A1 | alta / crítica | O sorteio guarda só 32 bits. Com as cartas que a tela mostra, testam-se todos os estados e descobre-se a mão do rival, a ordem dos baralhos e todo crítico futuro (provado em 2 lutas reais, ~3 min num computador comum). | Estado do sorteio com 128 bits | tarefa 12 |
| A2 | alta / crítica | Ponto Cruz (custo 0, compra 1) volta à mão sem fim quando o baralho esvazia: turno sem fim, Linha sem fim, sorteio avançado à vontade. Em 27 de 86 lutas com o laço, o jogador venceu no mesmo turno. | Carta jogada só volta ao descarte no fim do turno + teto de comandos por turno | tarefa 12 |
| A3 | alta | Costura sem custo e sem teto: 1 conta faz 247 bonecos por minuto, e depois o pedido de estado trava o servidor. | Teto de bonecos por conta, estado em páginas, custo/energia na costura | tarefa 13 (custo: com a economia) |
| A4 | média / alta | Cada comando guarda a resposta inteira: o banco cresce ~159 MB por hora por conta. | Guardar só o necessário e limpar ao fim da luta | tarefa 13 |
| A5 | média / alta | Atrás de proxy todos dividem o mesmo limite por endereço; reiniciar zera os limites. | Ler o endereço do proxy confiável; guardar limites no banco | tarefa 13 |
| A6 | média / alta | "Rolar de novo": abrir a luta, olhar a mão, desistir e abrir de novo, de graça. | Abrir a luta gasta energia; desistir conta como derrota | espera a economia (energia) |
| A7 | baixa / alta | Aventura sem progressão no servidor: conta nova abre a fase 5 direto. | Gravar a fase liberada por conta | tarefa 13 |
| A8 | baixa | O servidor migra por cima de um banco que não é do Frayz. | Recusar banco estranho; cópia sempre que houver dados | tarefa 13 |
| A9 | baixa | Mapa de limites cresce com endereços IPv6 e cada pedido fica lento. | Limpar por idade; balde por bloco | tarefa 13 |
| A10 | baixa / média | Apelido repetido ou com letra parecida de outro alfabeto. | Normalizar e exigir apelido único | tarefa 13 |
| A11 | baixa | O número da carta do rival já diz qual carta é. | Embaralhar os números por luta (ou aceitar) | tarefa 12 |

Também abertos (listados pelo autor do servidor e confirmados): chaves de emergência não lidas; sessão sem validade e sem "sair"; fazenda de contas sem trava (5 contas por hora por endereço IPv4, mas até ~327 mil por hora com um bloco IPv6).

## Travas contra fazenda para o dia do prêmio (proposta, nada feito)
Energia diária gasta ao abrir a luta · prêmio só para conta com carteira assinada · limite por endereço real guardado no banco · prova de trabalho ou captcha ao criar conta · progressão obrigatória na Aventura · teto de prêmio por conta por dia · alerta de ritmo de robô.

## Lição
"Semente de 128 bits" não protege se o gerador guarda só 32 bits. Toda revisão de sorteio mede o tamanho do estado, não o da semente.
