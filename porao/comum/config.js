// Porão (jogo-sátira) — configuração única de números.
//
// *** TODO NÚMERO DESTE ARQUIVO É PROVISÓRIO *** (moeda fictícia, uso pessoal, sem token nem dinheiro).
// Quem ajusta: economista (porao/ferramentas/simular.mjs) + "sim" do dono.
// Só dados aqui: nenhuma lógica. As contas ficam em porao/comum/regras.js.
// Nomes (ideias, influenciadores, luxos, pseudônimos) ficam em porao/comum/nomes.js, pela chave.
// Tempo: segundos (ou minutos/horas quando o nome diz). Calor: 0–100.
// 20/11/2026 — economista (tarefa 7): números marcados "20/11" ajustados pelo simulador para o ritmo
// (1ª hora com novidade a cada ~3,5 min, prestígio ~dia 3, Mítico raro, batida para quem abusa). Ainda provisórios.

// ---------------------------------------------------------------------------------------------
// 1. Raridades (tamanho do golpe), da menor para a maior. A fusão leva à seguinte da lista.
// ---------------------------------------------------------------------------------------------
export const RARIDADES = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico']

// ---------------------------------------------------------------------------------------------
// 2. Impressora: chance (%) de cada raridade (visível na tela; soma 100). Depois sorteia a ideia.
// ---------------------------------------------------------------------------------------------
// 20/11: Lendário e Mítico mais raros (com 0,2% o Mítico saía em 100% dos jogos na 1ª semana).
export const CHANCES = { comum: 55, incomum: 27, raro: 12.5, epico: 4.5, lendario: 0.97, mitico: 0.03 }

// Quantas ideias diferentes existem em cada raridade (chaves "<raridade>_<n>", n a partir de 1).
export const IDEIAS_POR_RARIDADE = { comum: 5, incomum: 5, raro: 5, epico: 5, lendario: 5, mitico: 5 }

export const IMPRESSORA = {
  custo: 80, // caixa por impressão (20/11: era 40; impressão barata enchia a gaveta e o Mítico vinha cedo)
  primeiraGratis: true, // a 1ª impressão da vida não custa nada (1º minuto)
  gratisSeTravado: true, // sem carta, sem projeto no ar e sem caixa para imprimir: a próxima sai grátis
}

export const GAVETA = { maximoDeCartas: 30 }

// ---------------------------------------------------------------------------------------------
// 3. Fusão ("copiar e colar"): N cartas iguais → 1 da raridade seguinte. Mítico não funde.
// ---------------------------------------------------------------------------------------------
export const FUSAO = { quantidade: 3 }

// ---------------------------------------------------------------------------------------------
// 4. Projeto no ar: fases, trouxas, rendimento e hype.
//    Rende por hora = rendimentoPorTrouxaHora[raridade] × trouxas × (1 + luxos + prestígio).
// ---------------------------------------------------------------------------------------------
export const FASES = {
  lancamentoSeg: 5, // LANÇAMENTO: não rende, só aquece
  esfriandoRende: 0.25, // ESFRIANDO rende esta fração do normal
}

export const PROJETOS = { maximoNoAr: 3 }

// 20/11: ~5× menor. Antes, deixar um projeto rendendo fora do jogo pagava mais que puxar o tapete.
export const RENDIMENTO_POR_TROUXA_HORA = { comum: 0.1, incomum: 0.15, raro: 0.25, epico: 0.4, lendario: 0.6, mitico: 0.9 }

// 20/11: pico mais cedo (Comum ~5 min … Mítico ~9 min: algo acontece a cada poucos minutos) e topo menor
// (Mítico valia 180× o Comum; agora ~37×, para o caixa não explodir).
export const TROUXAS = {
  iniciais: { comum: 20, incomum: 25, raro: 35, epico: 50, lendario: 70, mitico: 100 },
  maximo: { comum: 150, incomum: 200, raro: 280, epico: 400, lendario: 560, mitico: 800 },
  crescimentoPorMin: { comum: 26, incomum: 29, raro: 40, epico: 50, lendario: 60, mitico: 78 }, // só com hype
}

export const HYPE = {
  maximo: 100,
  gastoPorMin: 5, // em HYPE/PICO (100 → 0 em 20 min)
  recargaPorMin: 10, // em ESFRIANDO (0 → 100 em 10 min)
}

// ---------------------------------------------------------------------------------------------
// 5. Puxar o tapete: paga preçoPorTrouxa × trouxas × (1 + extra), extra = min(minutos no ar × sobe, máx).
//    Soma Calor = base × (1 + min(minutos no ar × sobe, máx)). Cedo = pouco e frio; tarde = mais e quente.
// ---------------------------------------------------------------------------------------------
// 20/11: preço sobe 4%/min (dobra aos 25 min: esperar vale a pena e dá para ver subir); Calor do tapete menor
// (com o antigo, colher 3 projetos na volta já chamava a polícia) e chega ao dobro aos 40 min no ar.
export const TAPETE = {
  precoPorTrouxa: { comum: 1, incomum: 1.4, raro: 2, epico: 3, lendario: 4.5, mitico: 7 },
  precoSobePorMin: 0.04,
  precoExtraMaximo: 1.0,
  calorBase: { comum: 3, incomum: 5, raro: 7, epico: 10, lendario: 15, mitico: 22 },
  calorSobePorMin: 0.025,
  calorExtraMaximo: 1.0,
}

// ---------------------------------------------------------------------------------------------
// 6. Calor (0–100). Só muda com o jogador conectado. Em 100 = BATIDA.
// ---------------------------------------------------------------------------------------------
export const CALOR = {
  maximo: 100,
  // 20/11: esfria mais rápido (2,5/min); 3 Épicos no ar ≈ empate; Mítico no ar sempre esquenta (chama atenção).
  projetoNoArPorMin: { comum: 0.1, incomum: 0.25, raro: 0.5, epico: 0.8, lendario: 1.2, mitico: 2.6 },
  quedaPorMin: 2.5,
  // 20/11: ~30% do tapete no pico (o antigo era troco perto de um Mítico: rebrand sempre compensava).
  rebrandCusto: { comum: 50, incomum: 100, raro: 200, epico: 450, lendario: 1000, mitico: 2300 }, // pela raridade do projeto ameaçado
  depoisDoRebrand: 50,
  depoisDePerder: 40,
}

// ---------------------------------------------------------------------------------------------
// 7. Tempo: pedido com intervalo até limiteOnlineSeg = jogador conectado; acima = fora do jogo.
//    Fora do jogo conta no máximo tetoForaHoras (rende e gasta hype; Calor parado; sem batida; sem tapete).
// ---------------------------------------------------------------------------------------------
export const TEMPO = { limiteOnlineSeg: 60, tetoForaHoras: 8 }

// ---------------------------------------------------------------------------------------------
// 8. Luxos do porão: compra única; bônus somados (rendimento = +%, hype = −% de gasto, calor = −% de subida).
//    O id é também o nome do sprite na cena.
// ---------------------------------------------------------------------------------------------
// 20/11: escada para a 1ª hora (cadeira ~6 min, aquário ~18, … cofre ~50) e o carro como sonho do dia 2.
export const LUXOS = [
  { id: 'cadeira_gamer', custo: 100, bonus: { rendimento: 0.05 } },
  { id: 'aquario', custo: 250, bonus: { hype: 0.1 } },
  { id: 'tapete_persa', custo: 500, bonus: { calor: 0.1 } },
  { id: 'letreiro_neon', custo: 900, bonus: { rendimento: 0.1 } },
  { id: 'cafeteira_chique', custo: 1500, bonus: { hype: 0.15 } },
  { id: 'cofre', custo: 2200, bonus: { calor: 0.15 } },
  { id: 'carro_na_garagem', custo: 30000, bonus: { rendimento: 0.2 } },
]
export const LIMITES = { reducaoMaxima: 0.8 } // hype e calor somados não reduzem mais que isto

// ---------------------------------------------------------------------------------------------
// 9. Prestígio ("ir preso"): libera quando o caixa ganho na vida chega à meta.
//    meta da vida = meta × (1 + nível × metaSobePorNivel). Bônus permanente de rendimento = nível × bonusPorNivel.
// ---------------------------------------------------------------------------------------------
export const PRESTIGIO = { meta: 80000, metaSobePorNivel: 1, bonusPorNivel: 0.2 } // 20/11: meta era 10000 (prisão no dia 1)

// ---------------------------------------------------------------------------------------------
// 10. Influenciadores (contrato por vídeo, 1 vaga por projeto). Catálogo fixo liberado por tapetes feitos.
//     Vídeo traz trouxasVideo × multiplicador da raridade do projeto. Se o vídeo 1 trouxe MAIS que o limite,
//     depois de esperaPedidoSeg ele pede mais: P2 = P1 × multiplicadorP2. Senão, vídeo 2 por P1.
// ---------------------------------------------------------------------------------------------
export const CONTRATO = {
  tamanhos: {
    // 20/11: todos pedem mais a partir do Raro; vídeo esquenta menos; Médio e Mega mais caros.
    nano: { p1: 20, limiteTrouxas: 30, trouxasVideo: 25, hypeVideo: 15, calorVideo: 2 },
    medio: { p1: 200, limiteTrouxas: 140, trouxasVideo: 120, hypeVideo: 30, calorVideo: 5 },
    mega: { p1: 1000, limiteTrouxas: 450, trouxasVideo: 400, hypeVideo: 60, calorVideo: 10 },
  },
  // 20/11: menos diferença entre raridades (Mega num Mítico devolvia 30× o preço; agora ~10×).
  trouxasPorRaridade: { comum: 1, incomum: 1.1, raro: 1.3, epico: 1.5, lendario: 1.7, mitico: 2 },
  multiplicadorP2: 2.5,
  esperaPedidoSeg: 60,
  chorar: { chanceDesconto: 0.6, desconto: 0.3 }, // senão ele SOME
  calorVideo3: 2,
  carimbosReincidente: 3,
}

export const INFLUENCIADORES = [
  { id: 'infl_1', tamanho: 'nano', liberaComTapetes: 0 },
  // 20/11: um influenciador novo a cada ~10 min na 1ª hora (2, 5, 9, 14, 20 tapetes)
  { id: 'infl_2', tamanho: 'nano', liberaComTapetes: 2 },
  { id: 'infl_3', tamanho: 'medio', liberaComTapetes: 5 },
  { id: 'infl_4', tamanho: 'medio', liberaComTapetes: 9 },
  { id: 'infl_5', tamanho: 'mega', liberaComTapetes: 14 },
  { id: 'infl_6', tamanho: 'mega', liberaComTapetes: 20 },
]
