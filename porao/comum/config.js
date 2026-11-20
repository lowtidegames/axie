// Porão (jogo-sátira) — configuração única de números.
//
// *** TODO NÚMERO DESTE ARQUIVO É PROVISÓRIO *** (moeda fictícia, uso pessoal, sem token nem dinheiro).
// Quem ajusta: economista (porao/ferramentas/simular.mjs) + "sim" do dono.
// Só dados aqui: nenhuma lógica. As contas ficam em porao/comum/regras.js.
// Nomes (ideias, influenciadores, luxos, pseudônimos) ficam em porao/comum/nomes.js, pela chave.
// Tempo: segundos (ou minutos/horas quando o nome diz). Calor: 0–100.

// ---------------------------------------------------------------------------------------------
// 1. Raridades (tamanho do golpe), da menor para a maior. A fusão leva à seguinte da lista.
// ---------------------------------------------------------------------------------------------
export const RARIDADES = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico']

// ---------------------------------------------------------------------------------------------
// 2. Impressora: chance (%) de cada raridade (visível na tela; soma 100). Depois sorteia a ideia.
// ---------------------------------------------------------------------------------------------
export const CHANCES = { comum: 55, incomum: 25, raro: 12, epico: 6, lendario: 1.8, mitico: 0.2 }

// Quantas ideias diferentes existem em cada raridade (chaves "<raridade>_<n>", n a partir de 1).
export const IDEIAS_POR_RARIDADE = { comum: 6, incomum: 5, raro: 4, epico: 3, lendario: 2, mitico: 1 }

export const IMPRESSORA = {
  custo: 40, // caixa por impressão
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

export const RENDIMENTO_POR_TROUXA_HORA = { comum: 0.5, incomum: 0.8, raro: 1.3, epico: 2, lendario: 3.2, mitico: 5 }

export const TROUXAS = {
  iniciais: { comum: 20, incomum: 30, raro: 45, epico: 70, lendario: 110, mitico: 180 },
  maximo: { comum: 200, incomum: 350, raro: 600, epico: 1000, lendario: 1800, mitico: 3000 },
  crescimentoPorMin: { comum: 10, incomum: 15, raro: 25, epico: 40, lendario: 70, mitico: 120 }, // só com hype
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
export const TAPETE = {
  precoPorTrouxa: { comum: 1, incomum: 1.5, raro: 2.5, epico: 4, lendario: 7, mitico: 12 },
  precoSobePorMin: 0.02,
  precoExtraMaximo: 1.0,
  calorBase: { comum: 8, incomum: 12, raro: 18, epico: 26, lendario: 38, mitico: 55 },
  calorSobePorMin: 0.01,
  calorExtraMaximo: 1.0,
}

// ---------------------------------------------------------------------------------------------
// 6. Calor (0–100). Só muda com o jogador conectado. Em 100 = BATIDA.
// ---------------------------------------------------------------------------------------------
export const CALOR = {
  maximo: 100,
  projetoNoArPorMin: { comum: 0.2, incomum: 0.3, raro: 0.45, epico: 0.7, lendario: 1, mitico: 1.5 },
  quedaPorMin: 1,
  rebrandCusto: { comum: 30, incomum: 60, raro: 120, epico: 250, lendario: 500, mitico: 1000 }, // pela raridade do projeto ameaçado
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
export const LUXOS = [
  { id: 'cadeira_gamer', custo: 150, bonus: { rendimento: 0.05 } },
  { id: 'aquario', custo: 400, bonus: { hype: 0.1 } },
  { id: 'tapete_persa', custo: 800, bonus: { calor: 0.1 } },
  { id: 'letreiro_neon', custo: 1500, bonus: { rendimento: 0.1 } },
  { id: 'cafeteira_chique', custo: 2500, bonus: { hype: 0.15 } },
  { id: 'cofre', custo: 4000, bonus: { calor: 0.15 } },
  { id: 'carro_na_garagem', custo: 6000, bonus: { rendimento: 0.2 } },
]
export const LIMITES = { reducaoMaxima: 0.8 } // hype e calor somados não reduzem mais que isto

// ---------------------------------------------------------------------------------------------
// 9. Prestígio ("ir preso"): libera quando o caixa ganho na vida chega à meta.
//    meta da vida = meta × (1 + nível × metaSobePorNivel). Bônus permanente de rendimento = nível × bonusPorNivel.
// ---------------------------------------------------------------------------------------------
export const PRESTIGIO = { meta: 10000, metaSobePorNivel: 1, bonusPorNivel: 0.2 }

// ---------------------------------------------------------------------------------------------
// 10. Influenciadores (contrato por vídeo, 1 vaga por projeto). Catálogo fixo liberado por tapetes feitos.
//     Vídeo traz trouxasVideo × multiplicador da raridade do projeto. Se o vídeo 1 trouxe MAIS que o limite,
//     depois de esperaPedidoSeg ele pede mais: P2 = P1 × multiplicadorP2. Senão, vídeo 2 por P1.
// ---------------------------------------------------------------------------------------------
export const CONTRATO = {
  tamanhos: {
    nano: { p1: 20, limiteTrouxas: 30, trouxasVideo: 25, hypeVideo: 15, calorVideo: 3 },
    medio: { p1: 120, limiteTrouxas: 120, trouxasVideo: 100, hypeVideo: 30, calorVideo: 7 },
    mega: { p1: 600, limiteTrouxas: 400, trouxasVideo: 350, hypeVideo: 60, calorVideo: 15 },
  },
  trouxasPorRaridade: { comum: 1, incomum: 1.2, raro: 1.5, epico: 2, lendario: 2.8, mitico: 4 },
  multiplicadorP2: 2.5,
  esperaPedidoSeg: 60,
  chorar: { chanceDesconto: 0.6, desconto: 0.3 }, // senão ele SOME
  calorVideo3: 2,
  carimbosReincidente: 3,
}

export const INFLUENCIADORES = [
  { id: 'infl_1', tamanho: 'nano', liberaComTapetes: 0 },
  { id: 'infl_2', tamanho: 'nano', liberaComTapetes: 1 },
  { id: 'infl_3', tamanho: 'medio', liberaComTapetes: 3 },
  { id: 'infl_4', tamanho: 'medio', liberaComTapetes: 5 },
  { id: 'infl_5', tamanho: 'mega', liberaComTapetes: 8 },
  { id: 'infl_6', tamanho: 'mega', liberaComTapetes: 12 },
]
