// Textos do Porão por CHAVE estável (chaves em ASCII, textos em português com acento).
// Tudo inventado e provisório (sátira leve).
// Nomes reais ficam em porao/nomes.local.json (fora do git); ver servidor/nomes-local.mjs.
// Marcador {projeto} = nome do golpe atual.

// [nome, lançamento, fim] por raridade
const IDEIAS = {
  comum: [
    ['Moeda do Vizinho', 'Lançamos a Moeda do Vizinho: toda compra rende um abraçinho!', 'A moeda sumiu junto com o vizinho. Mudou de bairro.'],
    ['Pede Doação pro Servidor', 'Ajude o servidor a não chorar! Doe qualquer valor!', 'O servidor era o notebook do tio. Fechou a tampa.'],
    ['Rifa do Pinguim', 'Rifa do Pinguim: o prêmio é um pinguim (de geladeira).', 'O pinguim foi sorteado para mim mesmo. Que sorte.'],
    ['Token do Pastel', 'Token do Pastel: cada pastel vale 1 token, cada token vale um pastel.', 'A feira acabou e o pastel esfriou. Fim do token.'],
    ['Cripto-Cafezinho', 'Cafezinho que rende juros! Quanto mais forte, mais rende.', 'O café esfriou, os juros evaporaram.'],
  ],
  incomum: [
    ['Jogue e Ganhe Troco', 'Jogue e ganhe troco! Até 3 centavos por dia!', 'O troco acabou. Ninguém tinha moeda miúda.'],
    ['Bichinho NFT de Papel', 'Bichinhos de papel dobrado, raros e dobráveis!', 'Choveu. Os bichinhos viraram papa.'],
    ['Staking de Feijão', 'Plante feijão no cofre e colha rendimento em 7 dias!', 'O feijão não brotou. O cofre nunca existiu.'],
    ['Clube do Hype Barato', 'Clube exclusivo com 4 mil membros (3 mil são robôs).', 'Os robôs pediram demissão em massa.'],
    ['Sorvete Descentralizado', 'Sorvete que ninguém controla! Derrete sozinho!', 'Derreteu. Como avisado no site, em letra miudinha.'],
  ],
  raro: [
    ['Metaverso do Quintal', 'Compre um terreno virtual no meu quintal digital!', 'O quintal foi vendido de verdade. Virou estacionamento.'],
    ['Jogo que Ainda Vai Sair', 'O jogo mais esperado do ano! (o ano não foi definido)', 'O jogo saiu: era uma tela preta com música.'],
    ['Fundo Tigre Dourado', 'O Tigre Dourado rende 300% ao mês. O tigre garante.', 'O tigre fugiu do zoológico e levou o cofre.'],
    ['Plataforma Zen Cripto', 'Invista com paz interior e lucro exterior.', 'A paz interior era minha. O lucro também.'],
    ['Aluguel de Nuvem', 'Alugue nuvens premium, as mais fofas da internet!', 'Veio vento. Nuvem nenhuma sobrou.'],
  ],
  epico: [
    ['Banco do Futuro Agora', 'O banco que já nasce do futuro. Você só depositou cedo demais.', 'O futuro foi adiado por tempo indeterminado.'],
    ['Império da Moeda Cometa', 'A Moeda Cometa passa só uma vez. Embarque!', 'O cometa passou. Eu também.'],
    ['Fábrica de Sonhos Líquidos', 'Engarrafamos sonhos! Cada garrafa é um ativo!', 'Os sonhos evaporaram. Garrafas vazias à venda.'],
    ['Cassino do Bem', 'Aposte pelo bem! A casa sempre ganha (para doar).', 'A casa ganhou. Doou para si mesma.'],
    ['Torre de Marfim Digital', 'Torre exclusiva de 100 andares, todos em construção.', 'A torre era uma imagem. Ninguém avisou o elevador.'],
  ],
  lendario: [
    ['Ouro de Marte Ltda.', 'Ouro extraído de Marte. Frete grátis (em teoria).', 'A nave atrasou. Marte não atende telefone.'],
    ['Super Rede Infinita', 'A rede que nunca cai! Quem cair, não é culpa nossa.', 'A rede caiu. Ficou só o fio.'],
    ['Cripto Vaticínio', 'Previmos o futuro e ele é lucrativo. Garantido pelo futuro.', 'O futuro chegou e não gostou da gente.'],
    ['Cofre dos Dragões', 'Dragões guardam seu dinheiro. Nunca falharam (nunca foram testados).', 'Os dragões eram lagartixas de aluguel.'],
    ['Aliança Global do Sim', 'Uma aliança de 40 países imaginários. Todos disseram sim.', 'Os países pediram independência da aliança.'],
  ],
  mitico: [
    ['O Golpe do Século', 'Chegou O Golpe do Século: ninguém vai acreditar como é simples!', 'Ninguém acreditou. Mas todo mundo comprou.'],
    ['Moeda Universal do Cosmos', 'A moeda de todos os planetas. Aceita até onde não tem gente.', 'O cosmos fechou para balanço. Eterno.'],
    ['Fundação Infinito Mais Um', 'Retorno infinito mais um por cento. Matemática avançada.', 'Infinito mais um dividido por zero. Deu ruim.'],
    ['Templo do Lucro Eterno', 'Templo onde o lucro é eterno e o templo é portátil.', 'Dobrei o templo e fui embora de van.'],
  ],
};

// grupos: nano.1..3, medio.1..3, mega.1..2
const INFLU = {
  'nano.1': {
    nome: 'Biel do Zap',
    bio: 'Sete seguidores fiéis, dois deles são minha mãe.',
    posts: [
      'Gente, olha {projeto}! Ainda é pequeno, entra antes de ficar grande!',
      'Hoje acordei com {projeto} na cabeça. Sinal do destino.',
      'Meus 7 seguidores já entraram em {projeto}. Você vai ficar de fora?',
      'Não é recomendação, mas {projeto} é o futuro (e eu não tenho dinheiro).',
      '{projeto}: porque sonhar custa pouco e o resto custa pouco também.',
    ],
  },
  'nano.2': {
    nome: 'Dona Cripta',
    bio: 'Tia do grupo da família que descobriu o gráfico.',
    posts: [
      'Bom dia família! {projeto} está subindo, igual minha pressão.',
      'Mandei {projeto} para o grupo todo. Só o Zé respondeu: "quem é?"',
      'Fé em {projeto} é um bom café. O resto é detalhe.',
      '{projeto} me deu mais alegria que a novela das nove.',
      'Segura firme em {projeto}, que a tia já tá de olho!',
    ],
  },
  'nano.3': {
    nome: 'Pedrinho Lambo',
    bio: 'Vai comprar uma lambo. Hoje está de ônibus.',
    posts: [
      'Em breve lambo! Tudo graças a {projeto}.',
      'Pesquisei {projeto} por 4 minutos. Conclusão: foguete.',
      '{projeto} não dorme. Eu durmo, mas {projeto} não.',
      'Quem entrou em {projeto} cedo já está comigo no ônibus, com esperança.',
      'Papai disse que {projeto} é furada. Papai não tem lambo.',
    ],
  },
  'medio.1': {
    nome: 'Tio Gema',
    bio: 'O tiozão das gemas raras (e das dicas duvidosas).',
    posts: [
      'Atenção, sobrinhada: {projeto} é a gema do mês. Anotem.',
      'Eu avisei sobre {projeto}. Quem não ouviu, ouviu depois.',
      'Joias eu entendo. {projeto} é joia bruta, só falta lapidar o seu bolso.',
      'Gema não se explica. {projeto}, sim, se explica no meu curso.',
      '{projeto} a esse preço? Vou repetir: a esse preço!',
      'Mandem {projeto} pra quem diz que cripto é bolha!',
    ],
  },
  'medio.2': {
    nome: 'Lambo Lucas',
    bio: 'Alugou uma lambo uma vez. Foi suficiente para a bio.',
    posts: [
      'Comprei {projeto} dentro da lambo (alugada, por 20 minutos).',
      'Rotina de sucesso: acordar, café, {projeto}, repetir.',
      '{projeto} é para quem pensa grande. Eu penso enorme.',
      'Vou revelar o segredo de {projeto}: tem que entrar. Só isso.',
      'Fiquei rico com {projeto}! (no sonho de ontem, mas valeu).',
      'Corre pra {projeto} antes que eu conte para mais gente!',
    ],
  },
  'medio.3': {
    nome: 'Dra. Foguete',
    bio: 'Doutora em nada, especialista em foguete emoji.',
    posts: [
      '{projeto} já decolou. Quem está na plataforma?',
      'Foguete, foguete, foguete! Ah, e {projeto}.',
      'Doutora aqui: {projeto} faz bem à saúde financeira (não é conselho médico).',
      'Meu gráfico de {projeto} só aponta para cima. Giro a tela se precisar.',
      'Gratidão a {projeto}. Gratidão também a quem comprou depois de mim.',
      '{projeto} é o remédio. Efeitos colaterais: euforia.',
    ],
  },
  'mega.1': {
    nome: 'Mestre do Airdrop',
    bio: 'Mil mil seguidores, todos esperando um airdrop que nunca chega.',
    posts: [
      'Meus 5 milhões de amigos: {projeto} é a nova era. Entrem.',
      'Airdrop de {projeto}! (só para quem já comprou {projeto}).',
      'Eu nunca indico nada. Exceto {projeto}. Exceto {projeto} de novo.',
      'Vou sortear 10 mil em {projeto}. Enviem 5 mil para participar.',
      '{projeto} mudou minha vida. Vou mudar a sua também (taxa do curso).',
      'Aviso aos haters: {projeto} não ouve vocês, só ouve o meu jato.',
      'Já mostrei {projeto} para meus pets. Eles entraram.',
    ],
  },
  'mega.2': {
    nome: 'Baronesa Hype',
    bio: 'Celebridade de tudo e de nada. Nome em neon.',
    posts: [
      'Como celebridade responsável, eu apoio {projeto} desde ontem à noite.',
      '{projeto}: luxo, glamour e nenhum balanço publicado.',
      'Meus fãs amam {projeto}. Meus advogados também (me orientaram a dizer isso).',
      'Entrei em {projeto} só pela vibe. A vibe está linda.',
      '{projeto} é arte, é ciência, é tendência. E um pouco de risco.',
      'Quem não curtir {projeto} será bloqueado com carinho.',
      'Se {projeto} subir mais, compro um planeta pequeno.',
    ],
  },
};

const LUXOS = [
  ['Aquário de Peixe Caro', 'Peixes que custam mais que o porão inteiro.'],
  ['Cadeira Gamer Trono', 'Reclina, vibra e julga você em silêncio.'],
  ['Máquina de Bebida Infinita', 'Só tem refrigerante de uva. Infinito.'],
  ['Carro na Garagem', 'Está na garagem do vizinho, mas aparece na foto.'],
  ['Neon de Frase Motivacional', '"Trabalhe enquanto eles dormem" (eu também durmo).'],
  ['Ar-Condicionado Polar', 'Congela as ideias e os trouxas ao mesmo tempo.'],
  ['Tela Curva Gigante', 'Tão curva que dá pra ver o próprio futuro.'],
  ['Estátua de Mim Mesmo', 'Dourada, discreta e com 3 metros.'],
];

const TAPETE = [
  'O projeto saiu para comprar pão e nunca mais voltou.',
  'Atualização importante: o site agora é uma tela azul.',
  'Foi um prazer. Quem reclamar será tratado como inimigo da inovação.',
  'O time inteiro entrou de férias. Férias eternas.',
  '"Isso era só estudo", disse o dono, em outra cidade.',
  'A equipe foi para a lua. Lua sem sinal de internet.',
  'A comunidade foi muito importante. Agora é passado.',
];

const CHAT = [
  'quando lambo?',
  'alguém sabe se o saque funciona?',
  'confia que sobe, tô dentro com tudo',
  'o dev disse que vem novidade amanhã (disse isso ontem tb)',
  'meu primo já ficou rico com isso, ele disse',
  'por que o gráfico só desce, é normal?',
  'fica ligado: hoje é o dia do pump (não é dica)',
  'chega de fud, só vem coisa boa, abraço',
];

const AVALIACAO = [
  ['Joaozinho123', 'Melhor investimento da minha vida! Nota 5. Não testei o saque.'],
  ['Marilu Fiel', 'Mudou minha vida, agora acordo cedo para ver o gráfico.'],
  ['Robô Confiável 42', 'Excelente. Recomendo. Excelente. Recomendo.'],
  ['Carlão do Pix', 'Ainda não saquei, mas a fé é grande. 5 estrelas.'],
  ['Anônimo Feliz', 'Entrei com R$ 10, hoje tenho R$ 10. Estável!'],
  ['Bia Moedinha', 'Equipe muito atenciosa. Responderam meu chamado com um emoji.'],
];

const PRESTIGIO = [
  'Reincidente Primário',
  'Foragido de Estimação',
  'Ex-Presidiário Emérito',
  'Lenda do Camburão',
  'Rei do Habeas Corpus',
  'Imperador do Indulto',
];

const MSG = {
  'msg.video1.oferta': 'Oi! Vi seu vídeo de {projeto}. Quero fechar uma parceria: 5 mil pra gravar um vídeo sobre você.',
  'msg.melhorar.oferta': 'Agora que o jogo lançou, imagino que você possa melhorar a oferta, né? A audiência tá alta.',
  'msg.choro.resposta': 'Entendo que é caro, mas meu preço é justo: cada seguidor me ama e custa caro. Posso fazer 10% de desconto.',
  'msg.sumir': 'Visualizado. Última vez visto: nunca. Esta pessoa ficou indisponível.',
};

const VIDEO = {
  'video.1.roteiro': 'Conheçam esse jogo! É {projeto}: simples, bonito e prestes a explodir. Link na bio, não esquece de curtir.',
  'video.2.roteiro': 'Quanto {projeto} rende por dia? Olha o teste de saque: caiu na hora (um centavo). Agora o gráfico: só sobe, sempre.',
  'video.3.roteiro': 'Por que eu saí de {projeto}? Era só estudo, pessoal. Tudo educativo. Qualquer coisa, falem com o meu advogado.',
};

const PERSONAGEM = {
  'personagem.rugrigo.nome': 'Rugrigo',
  'personagem.rugrigo.bio': 'Dono do porão. Mora lá desde que a ideia era boa.',
};

function montar() {
  const t = {};
  for (const [rar, lista] of Object.entries(IDEIAS)) {
    lista.forEach(([nome, lan, fim], i) => {
      const p = `ideia.${rar}.${i + 1}`;
      t[`${p}.nome`] = nome;
      t[`${p}.lancamento`] = lan;
      t[`${p}.fim`] = fim;
    });
  }
  for (const [g, d] of Object.entries(INFLU)) {
    t[`influ.${g}.nome`] = d.nome;
    t[`influ.${g}.bio`] = d.bio;
    d.posts.forEach((p, i) => { t[`influ.${g}.post.${i + 1}`] = p; });
  }
  Object.assign(t, MSG, VIDEO, PERSONAGEM);
  LUXOS.forEach(([n, d], i) => { t[`luxo.${i + 1}.nome`] = n; t[`luxo.${i + 1}.descricao`] = d; });
  TAPETE.forEach((s, i) => { t[`tapete.${i + 1}`] = s; });
  CHAT.forEach((s, i) => { t[`chat.${i + 1}`] = s; });
  AVALIACAO.forEach(([a, s], i) => { t[`avaliacao.${i + 1}.autor`] = a; t[`avaliacao.${i + 1}.texto`] = s; });
  PRESTIGIO.forEach((s, i) => { t[`prestigio.${i + 1}`] = s; });
  return t;
}

export const TEXTOS = Object.freeze(montar());
export const CHAVES = Object.keys(TEXTOS);
export const RARIDADES = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'];

// Troca {projeto} pelo nome do golpe atual.
export function citar(texto, projeto) {
  return String(texto).replaceAll('{projeto}', projeto);
}
