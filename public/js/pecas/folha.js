// Frayz — FOLHA DE CONFERÊNCIA das peças (public/pecas.html): todas as peças, em todos os estados, nos dois formatos,
// com dados de verdade da ponte (as 24 cartas reais, com o texto real). Mais três montagens de tela inteira.
//   pecas.html                         a folha (PC e celular lado a lado quando a janela é larga)
//   pecas.html?formato=celular|pc      só um formato
//   pecas.html?montagem=luta|time|vitoria|derrota   só a montagem, ocupando a janela (o formato vem do tamanho da janela)
//   &menos=1                           liga "Menos animação" (classe no body)
import * as P from '../ponte.js'
import * as arte from './arte-adaptador.js'
import { el } from './base.js'
import { atualizarCarta, criarCarta } from './carta.js'
import { criarMao } from './mao.js'
import { criarAlfinetes, criarDedal, criarFita, criarPlaca } from './fita.js'
import { criarCarreteis, criarContador } from './carreteis.js'
import { criarBastidor } from './bastidor.js'
import { mostrarFaixa } from './faixa.js'
import { criarFioDoTempo } from './fio-do-tempo.js'
import { criarEtiquetas } from './etiqueta.js'
import { atualizarBotao, criarBotao } from './botao.js'
import { criarLogotipo } from './logotipo.js'
import { soltarNumero } from './numero-de-dano.js'
import { criarMarcaDeVantagem } from './marca-de-vantagem.js'
import * as M from './montagens.js'

const url = new URLSearchParams(location.search)
const pedido = ['pc', 'celular'].includes(url.get('formato')) ? url.get('formato') : null
const montagem = url.get('montagem')
if (url.get('menos') === '1') document.body.classList.add('menos-animacao')
const formatoDaJanela = () => (window.innerWidth >= 700 && window.innerWidth / window.innerHeight >= 1.1 ? 'pc' : 'celular')
const raiz = document.querySelector('#folha')
const gancho = (window.__pecas = { pronto: false, maos: {}, origem: () => arte.origem() })

if (montagem) soMontagem(); else folha()
Promise.all([arte.pronta, document.fonts.ready]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => { gancho.pronto = true })))

// ------------------------------------------------------------------ só uma montagem, do tamanho da janela

function soMontagem() {
  document.body.classList.add('so-montagem')
  const formato = pedido ?? formatoDaJanela()
  document.body.dataset.formato = formato
  const tela = el('section'); raiz.append(tela)
  if (montagem === 'time') gancho.time = M.montarTime(tela, formato)
  else if (montagem === 'vitoria' || montagem === 'derrota') gancho.fim = M.montarFim(tela, formato, montagem)
  else { const l = M.montarLuta(tela, formato); gancho.luta = l; gancho.maos[formato] = l.mao }
}

// ------------------------------------------------------------------ a folha

function folha() {
  const formatos = pedido ? [pedido] : window.innerWidth >= 1040 ? ['pc', 'celular'] : [formatoDaJanela()]
  const ROTULO = { pc: 'PC', celular: 'Celular' }
  const { estado, visao } = M.lutaDeExemplo()
  const todas = M.todasAsCartas(), carta = (id) => todas.find((c) => c.id === id)
  const fila = (...filhos) => { const f = el('div', 'fo-fila'); f.append(...filhos); return f }
  const item = (rotulo, ...filhos) => { const i = el('div', 'fo-item'); i.append(...filhos, el('small', null, rotulo)); return i }
  const botaoDeTeste = (rotulo, fn) => criarBotao({ rotulo, variante: 'secundario', aoClicar: fn })
  const botoes = (...b) => { const d = el('div', 'fo-botoes'); d.append(...b); return d }

  /** Uma seção: título, explicação e um quadro por formato. */
  function secao(titulo, texto, construir) {
    const s = el('section', 'fo-secao'); s.append(el('h2', null, titulo), el('p', null, texto))
    const qs = el('div', 'fo-quadros')
    for (const f of formatos) {
      const q = el('div', 'fo-quadro'); q.dataset.formato = f; q.dataset.palco = ''
      q.append(el('span', 'fo-rotulo', ROTULO[f]))
      construir(q, f)
      qs.append(q)
    }
    s.append(qs); raiz.append(s); return s
  }

  // ---- topo
  const topo = el('header', 'fo-topo')
  const logo = criarLogotipo({ altura: window.innerWidth >= 700 ? 104 : 72 })
  const tx = el('div'); const origem = el('p', null, 'Desenho dos bonecos: carregando…')
  tx.append(el('h1', null, 'Folha de conferência das peças'), origem)
  arte.pronta.then((o) => { origem.textContent = o === 'rig' ? 'Desenho dos bonecos: boneco-rig.js (novo).' : o === 'provisorio' ? 'Desenho dos bonecos: provisório (bonecos.js de hoje), até o boneco-rig.js chegar.' : 'Desenho dos bonecos: nenhum encontrado.' })
  const acoes = el('div', 'fo-acoes')
  const menos = criarBotao({ rotulo: 'Menos animação', variante: 'secundario', detalhe: 'desligada' })
  menos.id = 'foMenos'
  menos.addEventListener('click', () => { const on = document.body.classList.toggle('menos-animacao'); atualizarBotao(menos, { detalhe: on ? 'ligada' : 'desligada', aceso: on }) })
  if (document.body.classList.contains('menos-animacao')) atualizarBotao(menos, { detalhe: 'ligada', aceso: true })
  acoes.append(menos)
  topo.append(logo.el, tx, acoes); raiz.append(topo)

  // ---- 1. carta: estados
  secao('Carta — estados', 'Molde de costura com a moldura no tecido do tipo. Custo num carretel, desenho da parte, nome numa fita, texto em linho, rodapé com o lugar e a carinha do dono.', (q, f) => {
    const variante = f === 'pc' ? 'mao' : 'mini'
    const nova = (id, estado, largura) => { const c = criarCarta(carta(id), { variante, largura, nomeDoTipo: P.NOMES_DOS_TIPOS[carta(id).tipo] }); atualizarCarta(c, estado); return c }
    const itens = [
      item('Normal (não pode agora)', nova('botaozada', {})),
      item('Jogável: o fio da maldição pulsa na costura', nova('mordida_de_ziper', { jogavel: true })),
      item('Sem Linha: menos cor, carretel vazio', nova('desfiar', { semLinha: true })),
      item('Selecionada: alfinete e contorno', nova('novelo_rolante', { jogavel: true, selecionada: true })),
      item('Fiapo: borda desfiada', nova('remendo_rapido', { fiapo: true, fraseDoFiapo: M.FRASE_DO_FIAPO })),
      item('Com vantagem de tecido', nova('nevoa_de_tule', { jogavel: true, marca: M.BONUS })),
    ]
    // amostra da costura Lendária (os 9 bonecos prontos só têm Comum e Rara; aqui a raridade é forçada só para ver a costura)
    const lendaria = criarCarta({ ...carta('gorro_felpudo'), raridade: 'lendaria' }, { variante, nomeDoTipo: P.NOMES_DOS_TIPOS.la })
    itens.push(item('Costura Lendária (amostra)', lendaria))
    if (f === 'celular') itens.push(item('Mini de 72 px (mão com 7)', nova('alfinete_de_feltro', { jogavel: true }, 72)))
    const linha = fila(...itens); linha.style.paddingTop = '12px'
    const grande = criarCarta(carta('ultimo_ponto'), { variante: 'ampliada', largura: f === 'pc' ? 264 : 288, tag: 'div', estado: { jogavel: true } })
    const grande2 = criarCarta(carta('remendo_rapido'), { variante: 'ampliada', largura: f === 'pc' ? 264 : 288, tag: 'div', estado: { fiapo: true, fraseDoFiapo: M.FRASE_DO_FIAPO } })
    const l2 = fila(item('Ampliada (texto inteiro)', grande)); if (f === 'pc') l2.append(item('Ampliada: fiapo', grande2))
    l2.style.paddingTop = '12px'
    q.append(linha, l2)
  })

  // ---- 2. as 24 cartas reais
  secao('As 24 cartas', 'Todas as cartas do jogo, com o texto que o motor dá. Quatro por tecido.', (q, f) => {
    const linha = fila(); linha.classList.add('fo-todas'); linha.style.paddingTop = '12px'
    for (const c of todas) linha.append(criarCarta(c, { variante: f === 'pc' ? 'mao' : 'mini', nomeDoTipo: P.NOMES_DOS_TIPOS[c.tipo] }))
    q.append(linha)
  })

  // ---- 3. mão
  secao('Mão', 'Leque centralizado e sobreposto. No PC a carta sob o mouse sobe e cresce; teclas 1 a 7 escolhem. No celular, tocar amplia a carta com o botão Jogar.', (q, f) => {
    const caixa = el('div', 'fo-mao'); q.append(caixa)
    let cartas = M.cartasDaMao(estado, visao)
    const reserva = todas.filter((c) => c.dono).map((c, i) => ({ id: 'extra' + i, dados: { ...c, id: 'extra' + i }, estado: { jogavel: i % 2 === 0 } }))
    const etiquetas = criarEtiquetas(q)
    const mao = criarMao(caixa, { nomeDoTipo: (t) => P.NOMES_DOS_TIPOS[t] })
    mao.definir(cartas)
    gancho.maos[f] = mao
    mao.aoEscolher(({ id, acao, origem: de }) => {
      gancho.ultimaEscolha = { id, acao, origem: de }
      const c = cartas.find((x) => x.id === id)
      if (c?.motivo && !c.estado.jogavel) return etiquetas.avisar(c.motivo, { tipo: 'recusa' })
      mao.selecionar(id)
      if (acao === 'jogar') { const r = caixa.getBoundingClientRect(); mao.voar(id, { x: r.left + r.width / 2, y: r.top - 20 }).then(() => { cartas = cartas.filter((x) => x.id !== id) }) }
    })
    let rival = false
    q.append(botoes(
      botaoDeTeste('Comprar', () => { if (cartas.length >= P.REGRAS.maoMaxima) return etiquetas.avisar(`A mão guarda até ${P.REGRAS.maoMaxima} cartas.`, { tipo: 'alerta' }); cartas = [...cartas, reserva[(cartas.length * 5 + reserva.length) % reserva.length]].filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i); mao.definir(cartas) }),
      botaoDeTeste('Jogar a 1ª', () => { const c = cartas[0]; if (!c) return; const r = caixa.getBoundingClientRect(); cartas = cartas.slice(1); mao.voar(c.id, { x: r.left + r.width / 2, y: r.top - 20 }) }),
      botaoDeTeste('Descartar a última', () => { const c = cartas[cartas.length - 1]; if (!c) return; cartas = cartas.slice(0, -1); mao.descartar(c.id) }),
      botaoDeTeste('Vez do rival', () => { rival = !rival; mao.vezDoRival(rival) }),
    ))
  })

  // ---- 4. vida
  secao('Vida, escudo e estados', 'Fita métrica que vai sendo cortada (o pedaço cai; a parte vermelha mostra o que havia e encolhe depois), dedal do escudo e alfinetes de estado. Toque nos alfinetes para ler.', (q, f) => {
    const linha = fila(); linha.style.paddingTop = '20px'
    for (const t of [P.EU, P.RIVAL]) for (const id of visao.times[t].lugares) {
      const b = visao.bonecos[id], placa = criarPlaca()
      placa.definir({ vida: b.vida, vidaMax: b.vidaMax, escudo: b.escudo, marcas: M.marcasDoBoneco(b), caido: b.estado === 'caido' })
      linha.append(item(b.nome, placa.el))
    }
    q.append(linha)
    const teste = criarPlaca(); let vida = 180, escudo = 0; const max = 180
    const pintar = () => teste.definir({ vida, vidaMax: max, escudo, alerta: vida / max <= 0.25, marcas: escudo ? [] : [{ tipo: 'fio-solto', titulo: 'Fio Solto.', legenda: 'Exemplo de legenda.' }] })
    pintar(); gancho.placas ??= {}; gancho.placas[f] = { definir: (o) => { vida = o.vida; pintar() } }
    const baixa = criarFita(); baixa.definir({ vida: 22, vidaMax: 145, alerta: true })
    const caida = criarFita(); caida.definir({ vida: 0, vidaMax: 212, caido: true })
    const dedal = criarDedal(); dedal.definir(45)
    const alf = criarAlfinetes(); alf.definir([{ tipo: 'ultimo-fio', titulo: 'Último Fio.', legenda: 'Só usa cartas de Pernas.' }, { tipo: 'fio-solto', titulo: 'Fio Solto.', legenda: 'Recebe mais dano.' }, { tipo: 'veu', titulo: 'Véu.', legenda: 'O próximo ataque erra.' }])
    const l2 = fila(item('Placa de teste (botões abaixo)', teste.el), item('Vida baixa', baixa.el), item('Caído', caida.el), item('Dedal', dedal.el), item('Alfinetes', alf.el))
    l2.style.paddingTop = '20px'
    q.append(l2, botoes(
      botaoDeTeste('Dano 47', () => { vida = Math.max(0, vida - 47); pintar() }),
      botaoDeTeste('Cura 30', () => { vida = Math.min(max, vida + 30); pintar() }),
      botaoDeTeste('Escudo 45', () => { escudo = escudo ? 0 : 45; pintar() }),
    ))
  })

  // ---- 5. linha
  secao('Linha e contadores', 'A Linha em carretéis: cheio tem barriga de linha brilhante; vazio, só o miolo. Contadores de mão e de baralho com ícone.', (q, f) => {
    const meu = criarCarreteis({ maximo: P.REGRAS.linhaMaxima, rotulo: 'Linha' }); let n = visao.times[P.EU].linha; meu.definir(n)
    const rival = criarCarreteis({ maximo: P.REGRAS.linhaMaxima, rotulo: 'Rival', compacto: true }); rival.definir(visao.times[P.RIVAL].linha)
    const mao = criarContador({ icone: 'mao', rotulo: 'Cartas na mão do rival' }); mao.definir(visao.times[P.RIVAL].mao)
    const baralho = criarContador({ icone: 'baralho', rotulo: 'Cartas no baralho' }); baralho.definir(visao.times[P.RIVAL].baralho)
    const l = fila(item('Sua Linha', meu.el), item('Linha do rival (compacta)', rival.el), item('Mão do rival', mao.el), item('Baralho', baralho.el)); l.classList.add('fo-fila--meio')
    gancho.linha ??= {}; gancho.linha[f] = meu
    q.append(l, botoes(
      botaoDeTeste(`Ganhar ${P.REGRAS.linhaPorTurno}`, () => { n = Math.min(P.REGRAS.linhaMaxima, n + P.REGRAS.linhaPorTurno); meu.definir(n) }),
      botaoDeTeste('Gastar 2', () => { n = Math.max(0, n - 2); meu.definir(n) }),
    ))
  })

  // ---- 6. bastidor
  secao('Bastidor: a roda dos tecidos', 'Seis retalhos presos num bastidor de bordado; as setas pespontadas apontam em quem cada tecido bate forte. Toque para ver os nomes.', (q, f) => {
    const novo = (lado) => criarBastidor({ tipos: P.TIPOS, nomes: P.NOMES_DOS_TIPOS, pares: M.PARES, texto: M.TEXTO_DA_RODA, lado })
    const parado = novo('direita'), a = novo('baixo'), b = novo('baixo')
    a.acender('jeans'); b.acender('tule')
    gancho.bastidores ??= {}; gancho.bastidores[f] = parado
    const l = fila(item('Parado', parado.el), item('Carta de Jeans escolhida', a.el), item('Carta de Tule escolhida', b.el)); l.style.paddingTop = '8px'
    const bs = P.TIPOS.map((t) => botaoDeTeste(P.NOMES_DOS_TIPOS[t], () => parado.acender(t)))
    q.append(l, botoes(...bs, botaoDeTeste('Apagar', () => parado.acender(null))))
  })

  // ---- 7. faixa de vez
  secao('Faixa de vez', 'Fita bordada que atravessa a cena por 700 ms. A sua vem da esquerda, com a chama da vela; a do rival vem da direita, com a lua.', (q) => {
    const p1 = el('div', 'fo-palco'), p2 = el('div', 'fo-palco'); p2.style.marginTop = '12px'
    q.append(p1, p2)
    mostrarFaixa(p1, { texto: 'Sua vez', lado: 'eu', fixa: true }); mostrarFaixa(p2, { texto: 'Vez do rival', lado: 'rival', fixa: true })
    for (const p of [p1, p2]) p.querySelector('.fz-faixa').style.top = '50%'
    const repor = (p, o) => mostrarFaixa(p, o).then(() => { mostrarFaixa(p, { ...o, fixa: true }); p.querySelector('.fz-faixa').style.top = '50%' })
    q.append(botoes(
      botaoDeTeste('Passar “Sua vez”', () => repor(p1, { texto: 'Sua vez', lado: 'eu' })),
      botaoDeTeste('Passar “Vez do rival”', () => repor(p2, { texto: 'Vez do rival', lado: 'rival' })),
    ))
  })

  // ---- 8. fio do tempo
  secao('Fio do tempo', `O turno de ${P.TEMPO_DO_TURNO_S} s é um fio que queima da ponta até o nó. Nos últimos 5 s a brasa cresce e solta faíscas pequenas.`, (q, f) => {
    const col = el('div'); col.style.display = 'grid'; col.style.gap = '12px'; col.style.maxWidth = '460px'
    const fios = [P.TEMPO_DO_TURNO_S, 11, 4, 0].map((s) => { const x = criarFioDoTempo({ total: P.TEMPO_DO_TURNO_S, alerta: 5 }); x.definir(s); col.append(x.el); return x })
    gancho.fios ??= {}; gancho.fios[f] = fios[2]
    q.append(col, botoes(
      botaoDeTeste('Queimar o primeiro', () => fios[0].iniciar()),
      botaoDeTeste('Queimar os últimos 5 s', () => fios[2].iniciar(5)),
    ))
  })

  // ---- 9. etiquetas
  secao('Etiquetas de aviso', 'Aviso curto como etiqueta de roupa presa com alfinete. Entram em fila, somem sozinhas e são lidas pelo leitor de tela.', (q) => {
    const palco = el('div', 'fo-palco fo-palco--alto'); q.append(palco)
    const fixas = criarEtiquetas(palco, { maximo: 4, duracao: 2e9 })
    fixas.avisar('Toque em dois bonecos seus para trocar de lugar.')
    fixas.avisar('Linha insuficiente.', { tipo: 'recusa' })
    fixas.avisar('Fiapo descartado: você comprou 1 carta.', { tipo: 'bom' })
    fixas.avisar(`A Tesoura corta no turno ${P.REGRAS.tesouraInicio}!`, { tipo: 'alerta' })
    const vivas = criarEtiquetas(q); vivas.el.style.top = 'auto'; vivas.el.style.bottom = '72px'
    let k = 0
    q.append(botoes(botaoDeTeste('Soltar um aviso', () => vivas.avisar(['No Último Fio ele só usa cartas de Pernas.', 'A condição da carta não foi cumprida.', 'Não há alvo para essa carta.'][k++ % 3], { tipo: 'recusa' }))))
  })

  // ---- 10. botões
  secao('Botões-retalho', 'Retalhos costurados, com pesponto na borda. O desligado fica chato (sem volume) e com a costura frouxa. No PC o atalho aparece numa tecla.', (q) => {
    const l1 = fila(
      item('Principal', criarBotao({ rotulo: 'Passar', variante: 'principal', atalho: 'Espaço' })),
      item('Secundário com detalhe', criarBotao({ rotulo: 'Trocar lugares', detalhe: `${P.REGRAS.custoDaTroca} de Linha`, variante: 'secundario', atalho: 'T' })),
      item('Perigo', criarBotao({ rotulo: 'Sair da luta', variante: 'perigo' })),
    )
    const aceso = criarBotao({ rotulo: 'Trocar lugares', detalhe: 'escolha dois', variante: 'secundario' }); atualizarBotao(aceso, { aceso: true })
    const l2 = fila(
      item('Principal desligado', criarBotao({ rotulo: 'Lutar', detalhe: 'Faltam 2', variante: 'principal', desligado: true })),
      item('Secundário desligado', criarBotao({ rotulo: 'Rever', variante: 'secundario', desligado: true })),
      item('Aceso (modo ligado)', aceso),
    )
    l1.style.paddingTop = l2.style.paddingTop = '4px'
    q.append(l1, l2)
  })

  // ---- 11. número de dano e marca de vantagem
  secao('Número de dano e marca de vantagem', 'O número nasce maior conforme o golpe (28 a 64 px). Crítico em cor de chama com o estouro da costura; cura em verde; escudo em azul. A marca dourada mostra o bônus de tecido.', (q, f) => {
    const palco = el('div', 'fo-palco'); palco.style.height = '128px'; q.append(palco)
    const w = f === 'pc' ? 860 : 336
    if (f !== 'pc') palco.style.height = '216px'
    const mostras = [{ valor: 45, forca: 0.1 }, { valor: 96, forca: 0.5 }, { valor: 150, forca: 1 }, { valor: 154, forca: 0.9, tipo: 'critico' }, { valor: 90, forca: 0.4, tipo: 'cura' }, { valor: 45, forca: 0.2, tipo: 'escudo' }]
    const pontos = f === 'pc' ? [[60, 64], [190, 64], [350, 64], [545, 64], [710, 64], [810, 64]] : [[52, 52], [150, 52], [266, 52], [96, 150], [226, 132], [296, 180]]
    mostras.forEach((m, i) => soltarNumero(palco, { ...m, x: pontos[i][0], y: pontos[i][1], fixo: true }))
    const l = fila(item('Marca no alvo', criarMarcaDeVantagem(M.BONUS)), item('Marca na carta', criarMarcaDeVantagem(M.BONUS, { pequena: true }))); l.style.paddingTop = '16px'
    q.append(l, botoes(
      botaoDeTeste('Soltar dano', () => soltarNumero(palco, { valor: 123, x: w / 2, y: 64, forca: 0.8 })),
      botaoDeTeste('Soltar crítico', () => soltarNumero(palco, { valor: 154, x: w / 2, y: 64, forca: 1, tipo: 'critico' })),
      botaoDeTeste('Soltar cura', () => soltarNumero(palco, { valor: 90, x: w / 2, y: 64, forca: 0.4, tipo: 'cura' })),
    ))
  })

  // ---- 12. logotipo
  secao('Logotipo', 'Cada letra é um retalho de um tecido; o z se desfia num fio solto que ondula.', (q, f) => {
    const l = fila(...(f === 'pc' ? [150, 72, 44] : [84, 44]).map((a) => item(a + ' px', criarLogotipo({ altura: a }).el))); l.classList.add('fo-fila--meio')
    q.append(l)
  })

  // ---- 13. montagens (janelas de verdade, cada uma no seu tamanho)
  const sm = el('section', 'fo-secao'); sm.append(el('h2', null, 'Montagens de tela'), el('p', null, 'Só layout, sem lógica de luta: a tela de luta, a escolha do time e o fim (vitória e derrota), em 360×740 e em 1280×720. Abra cada uma sozinha com ?montagem=luta, time, vitoria ou derrota.'))
  const qs = el('div', 'fo-quadros')
  for (const nome of ['luta', 'time', 'vitoria', 'derrota']) for (const f of formatos) {
    const [w, h] = f === 'pc' ? [1280, 720] : [360, 740]
    const q = el('div', 'fo-quadro'); q.dataset.formato = f; q.style.padding = '28px 12px 12px'; q.style.width = 'auto'; q.style.flex = '0 0 auto'
    q.append(el('span', 'fo-rotulo', `${nome} · ${ROTULO[f]} ${w}×${h}`))
    const cabe = Math.min(1, (Math.min(window.innerWidth, 1320) - 48) / w, f === 'pc' ? 0.68 : 1)
    const caixa = el('div', 'fo-janela-caixa'); caixa.style.width = w * cabe + 'px'; caixa.style.height = h * cabe + 'px'
    const janela = el('iframe', 'fo-janela'); janela.width = w; janela.height = h; janela.loading = 'lazy'; janela.title = `Montagem: ${nome} (${ROTULO[f]})`
    janela.src = `pecas.html?montagem=${nome}&formato=${f}${document.body.classList.contains('menos-animacao') ? '&menos=1' : ''}`
    janela.style.transform = `scale(${cabe})`
    caixa.append(janela); q.append(caixa); qs.append(q)
  }
  sm.append(qs); raiz.append(sm)
}
