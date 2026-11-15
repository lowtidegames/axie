// Frayz — Aventura "Baú da Costureira": 5 fases em sequência. *** PROVISÓRIO ***
// Times inimigos fixos (só ids de BONECOS_PRONTOS do config) e robô de cada fase. Dificuldade cresce: fases 1–2 robô ganancioso, 3–5 planejador.
// Dados da TELA do protótipo; quando houver servidor, as fases vêm dele. Nenhuma regra aqui.
export const FASES = [
  { n: 1, nome: 'Gaveta dos Botões', robo: 'ganancioso', time: ['mordedor', 'embolado', 'mudo'] },
  { n: 2, nome: 'Cesto de Retalhos', robo: 'ganancioso', time: ['brigao', 'assombrado', 'cascudo'] },
  { n: 3, nome: 'Mesa de Corte', robo: 'planejador', time: ['rasgao', 'desfiado', 'embolado'] },
  { n: 4, nome: 'Prateleira dos Carretéis', robo: 'planejador', time: ['pisoteador', 'cascudo', 'assombrado'] },
  { n: 5, nome: 'Fundo do Baú', robo: 'planejador', time: ['brigao', 'pisoteador', 'desfiado'] },
]
