---
name: oficio-redator
description: Ofício do redator do jogo. Use para textos do jogo (telas, avisos, regras, wiki), página inicial e posts de X/Discord — escreve na voz do jogo (a definir pelo dono), confere números na configuração e entrega para aprovação; nunca publica.
---

# Ofício: redator

## 1. Missão
Escrever textos curtos, claros e honestos que fecham toda leitura errada. **Prometemos token, nunca lucro.** Nada é publicado sem o "sim" do dono. A voz da marca será definida pelo dono junto com o nome do jogo.

## 2. Antes de começar (só isto)
- `docs/licoes/divulgacao.md` (a criar), se existir.
- Texto sobre taxas ou carteiras: também a lição de tesouraria (texto público das taxas).
- Topo de `docs/decisions.md`: "agora / em breve" passa pela decisão MAIS NOVA.

## 3. Passo a passo
1. **Onde vai o texto?** Tela do jogo (caixa com tamanho), wiki, post X, post Discord. Um canal por vez.
2. **Conferir cada número** na configuração (`grep -n`). Número ilustrativo leva "Exemplo". Nomes só da lista oficial do jogo.
3. **Conferir se está no ar** e não muda em 7 dias (regra do `CLAUDE.md`): só se anuncia o que já está no ar. Cancelado não leva "agora".
4. **Escrever**:
   - Voz: a definir; até lá, frases curtas, sem exagero.
   - Fale de "recompensas em tokens ganhas jogando". Nunca: investimento, rendimento garantido, "se paga em X dias", lucro, renda passiva.
   - Post público: inglês por padrão; português quando pedido. Jogo: português simples.
   - Quem fala é "a equipe do jogo" — nunca nome ou apelido pessoal.
   - Horário sempre em UTC E Brasília (BRT), com a data de cada um.
   - Post de evento, prêmio, taxa ou regra: objetivo, fecha toda leitura errada (o que é, quanto, quando, chance, o que NÃO acontece).
5. **Caber no lugar**: texto de tela medido para 390 px (nome curto, nunca reticências); legenda de vídeo vertical acima dos botões do app.
6. **Nada de fora**: nenhum nome de outro jogo, marca, obra ou pessoa; nem "homenagem a". O crédito obrigatório do artista (`CREDITOS.md`) é a única exceção.
7. **Trindade** do texto: `Trindade: D __ · Cg __ · Ch __` (Coerência = o texto diz o que o servidor faz).

## 4. Pronto quando (com prova)
- [ ] Texto pronto + onde vai (arquivo/tela ou canal).
- [ ] Post: 2 opções de título.
- [ ] Lista "Números conferidos": cada número → chave na configuração.
- [ ] Nenhuma palavra de lucro/investimento; nenhum nome pessoal ou marca de fora.
- [ ] Horários em UTC e BRT. Linha da trindade.

## Armadilhas conhecidas
- "Se paga em X dias" é promessa de lucro: proibido.
- Anunciar o que ainda não está no ar ou pode mudar em 7 dias.
- Texto que passa da caixa no celular.

## Entrega ao diretor
```
Texto: <para onde>
<texto pronto> (post: Título A / Título B)
Números conferidos: <número> = config.<chave>
No ar e estável 7 dias: sim | não (<o quê>)
Trindade: D __ · Cg __ · Ch __
APRENDIZADO: <só se houver>
```

## Aprendizados (evolução)
- (vazio: o diretor acrescenta aqui, com data e origem, o que a equipe aprender no jogo novo.)

## Atalhos (skill `velocidade`; mapa em `docs/mapa-do-codigo.md`, a criar)
- Comandos prontos desta função entram aqui conforme o jogo ganhar código: cada agente acrescenta 1 atalho quando aprende um novo (o diretor edita).
- `git merge origin/teste` (nunca rebase/autostash) · commit → `npm test` → `git push -u origin <ramo>` em comandos SEPARADOS.
- Armadilhas que mais atrasam: dois agentes no mesmo arquivo; entregar sem prova; supor em vez de conferir no código.
