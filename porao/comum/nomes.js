// Textos do Porao por CHAVE estavel. Tudo inventado e provisorio (satira leve).
// Nomes reais ficam em porao/nomes.local.json (fora do git); ver servidor/nomes-local.mjs.
// Marcador {projeto} = nome do golpe atual.

// [nome, lancamento, fim] por raridade
const IDEIAS = {
  comum: [
    ['Moeda do Vizinho', 'Lancamos a Moeda do Vizinho: toda compra rende um abracinho!', 'A moeda sumiu junto com o vizinho. Mudou de bairro.'],
    ['Pede Doacao pro Servidor', 'Ajude o servidor a nao chorar! Doe qualquer valor!', 'O servidor era o notebook do tio. Fechou a tampa.'],
    ['Rifa do Pinguim', 'Rifa do Pinguim: o premio e um pinguim (de geladeira).', 'O pinguim foi sorteado para mim mesmo. Que sorte.'],
    ['Token do Pastel', 'Token do Pastel: cada pastel vale 1 token, cada token vale um pastel.', 'A feira acabou e o pastel esfriou. Fim do token.'],
    ['Cripto-Cafezinho', 'Cafezinho que rende juros! Quanto mais forte, mais rende.', 'O cafe esfriou, os juros evaporaram.'],
  ],
  incomum: [
    ['Jogue e Ganhe Troco', 'Jogue e ganhe troco! Ate 3 centavos por dia!', 'O troco acabou. Ninguem tinha moeda miuda.'],
    ['Bichinho NFT de Papel', 'Bichinhos de papel dobrado, raros e dobraveis!', 'Choveu. Os bichinhos viraram papa.'],
    ['Staking de Feijao', 'Plante feijao no cofre e colha rendimento em 7 dias!', 'O feijao nao brotou. O cofre nunca existiu.'],
    ['Clube do Hype Barato', 'Clube exclusivo com 4 mil membros (3 mil sao robos).', 'Os robos pediram demissao em massa.'],
    ['Sorvete Descentralizado', 'Sorvete que ninguem controla! Derrete sozinho!', 'Derreteu. Como avisado no site, em letra miudinha.'],
  ],
  raro: [
    ['Metaverso do Quintal', 'Compre um terreno virtual no meu quintal digital!', 'O quintal foi vendido de verdade. Virou estacionamento.'],
    ['Jogo que Ainda Vai Sair', 'O jogo mais esperado do ano! (o ano nao foi definido)', 'O jogo saiu: era uma tela preta com musica.'],
    ['Fundo Tigre Dourado', 'O Tigre Dourado rende 300% ao mes. O tigre garante.', 'O tigre fugiu do zoologico e levou o cofre.'],
    ['Plataforma Zen Cripto', 'Invista com paz interior e lucro exterior.', 'A paz interior era minha. O lucro tambem.'],
    ['Aluguel de Nuvem', 'Alugue nuvens premium, as mais fofas da internet!', 'Veio vento. Nuvem nenhuma sobrou.'],
  ],
  epico: [
    ['Banco do Futuro Agora', 'O banco que ja nasce do futuro. Voce so depositou cedo demais.', 'O futuro foi adiado por tempo indeterminado.'],
    ['Imperio da Moeda Cometa', 'A Moeda Cometa passa so uma vez. Embarque!', 'O cometa passou. Eu tambem.'],
    ['Fabrica de Sonhos Liquidos', 'Engarrafamos sonhos! Cada garrafa e um ativo!', 'Os sonhos evaporaram. Garrafas vazias a venda.'],
    ['Cassino do Bem', 'Aposte pelo bem! A casa sempre ganha (para doar).', 'A casa ganhou. Doou para si mesma.'],
    ['Torre de Marfim Digital', 'Torre exclusiva de 100 andares, todos em construcao.', 'A torre era uma imagem. Ninguem avisou o elevador.'],
  ],
  lendario: [
    ['Ouro de Marte Ltda.', 'Ouro extraido de Marte. Frete gratis (em teoria).', 'A nave atrasou. Marte nao atende telefone.'],
    ['Super Rede Infinita', 'A rede que nunca cai! Quem cair, nao e culpa nossa.', 'A rede caiu. Ficou so o fio.'],
    ['Cripto Vaticinio', 'Previmos o futuro e ele e lucrativo. Garantido pelo futuro.', 'O futuro chegou e nao gostou da gente.'],
    ['Cofre dos Dragoes', 'Dragoes guardam seu dinheiro. Nunca falharam (nunca foram testados).', 'Os dragoes eram lagartixas de aluguel.'],
    ['Aliança Global do Sim', 'Uma alianca de 40 paises imaginarios. Todos disseram sim.', 'Os paises pediram independencia da alianca.'],
  ],
  mitico: [
    ['O Golpe do Seculo', 'Chegou O Golpe do Seculo: ninguem vai acreditar como e simples!', 'Ninguem acreditou. Mas todo mundo comprou.'],
    ['Moeda Universal do Cosmos', 'A moeda de todos os planetas. Aceita ate onde nao tem gente.', 'O cosmos fechou para balanco. Eterno.'],
    ['Fundacao Infinito Mais Um', 'Retorno infinito mais um por cento. Matematica avancada.', 'Infinito mais um dividido por zero. Deu ruim.'],
    ['Templo do Lucro Eterno', 'Templo onde o lucro e eterno e o templo e portatil.', 'Dobrei o templo e fui embora de van.'],
  ],
};

// grupos: nano.1..3, medio.1..3, mega.1..2
const INFLU = {
  'nano.1': {
    nome: 'Biel do Zap',
    bio: 'Sete seguidores fieis, dois deles sao minha mae.',
    posts: [
      'Gente, olha {projeto}! Ainda e pequeno, entra antes de ficar grande!',
      'Hoje acordei com {projeto} na cabeca. Sinal do destino.',
      'Meus 7 seguidores ja entraram em {projeto}. Voce vai ficar de fora?',
      'Nao e recomendacao, mas {projeto} e o futuro (e eu nao tenho dinheiro).',
      '{projeto}: porque sonhar custa pouco e o resto custa pouco tambem.',
    ],
  },
  'nano.2': {
    nome: 'Dona Cripta',
    bio: 'Tia do grupo da familia que descobriu o grafico.',
    posts: [
      'Bom dia familia! {projeto} esta subindo, igual minha pressao.',
      'Mandei {projeto} para o grupo todo. So o Ze respondeu: "quem e?"',
      'Fe em {projeto} e um bom cafe. O resto e detalhe.',
      '{projeto} me deu mais alegria que a novela das nove.',
      'Segura firme em {projeto}, que a tia ja ta de olho!',
    ],
  },
  'nano.3': {
    nome: 'Pedrinho Lambo',
    bio: 'Vai comprar uma lambo. Hoje esta de onibus.',
    posts: [
      'Em breve lambo! Tudo gracas a {projeto}.',
      'Pesquisei {projeto} por 4 minutos. Conclusao: foguete.',
      '{projeto} nao dorme. Eu durmo, mas {projeto} nao.',
      'Quem entrou em {projeto} cedo ja esta comigo no onibus, com esperanca.',
      'Papai disse que {projeto} e furada. Papai nao tem lambo.',
    ],
  },
  'medio.1': {
    nome: 'Tio Gema',
    bio: 'O tiozao das gemas raras (e das dicas duvidosas).',
    posts: [
      'Atencao, sobrinhada: {projeto} e a gema do mes. Anotem.',
      'Eu avisei sobre {projeto}. Quem nao ouviu, ouviu depois.',
      'Joias eu entendo. {projeto} e joia bruta, so falta lapidar o seu bolso.',
      'Gema nao se explica. {projeto}, sim, se explica no meu curso.',
      '{projeto} a esse preco? Vou repetir: a esse preco!',
      'Mandem {projeto} pra quem diz que cripto e bolha!',
    ],
  },
  'medio.2': {
    nome: 'Lambo Lucas',
    bio: 'Alugou uma lambo uma vez. Foi suficiente para a bio.',
    posts: [
      'Comprei {projeto} dentro da lambo (alugada, por 20 minutos).',
      'Rotina de sucesso: acordar, cafe, {projeto}, repetir.',
      '{projeto} e para quem pensa grande. Eu penso enorme.',
      'Vou revelar o segredo de {projeto}: tem que entrar. So isso.',
      'Fiquei rico com {projeto}! (no sonho de ontem, mas valeu).',
      'Corre pra {projeto} antes que eu conte para mais gente!',
    ],
  },
  'medio.3': {
    nome: 'Dra. Foguete',
    bio: 'Doutora em nada, especialista em foguete emoji.',
    posts: [
      '{projeto} ja decolou. Quem esta na plataforma?',
      'Foguete, foguete, foguete! Ah, e {projeto}.',
      'Doutora aqui: {projeto} faz bem a saude financeira (nao e conselho medico).',
      'Meu grafico de {projeto} so aponta para cima. Giro a tela se precisar.',
      'Gratidao a {projeto}. Gratidao tambem a quem comprou depois de mim.',
      '{projeto} e o remedio. Efeitos colaterais: euforia.',
    ],
  },
  'mega.1': {
    nome: 'Mestre do Airdrop',
    bio: 'Mil mil seguidores, todos esperando um airdrop que nunca chega.',
    posts: [
      'Meus 5 milhoes de amigos: {projeto} e a nova era. Entrem.',
      'Airdrop de {projeto}! (so para quem ja comprou {projeto}).',
      'Eu nunca indico nada. Exceto {projeto}. Exceto {projeto} de novo.',
      'Vou sortear 10 mil em {projeto}. Enviem 5 mil para participar.',
      '{projeto} mudou minha vida. Vou mudar a sua tambem (taxa do curso).',
      'Aviso aos haters: {projeto} nao ouve voces, so ouve o meu jato.',
      'Ja mostrei {projeto} para meus pets. Eles entraram.',
    ],
  },
  'mega.2': {
    nome: 'Baronesa Hype',
    bio: 'Celebridade de tudo e de nada. Nome em neon.',
    posts: [
      'Como celebridade responsavel, eu apoio {projeto} desde ontem a noite.',
      '{projeto}: luxo, glamour e nenhum balanco publicado.',
      'Meus fas amam {projeto}. Meus advogados tambem (me orientaram a dizer isso).',
      'Entrei em {projeto} so pelo vibe. O vibe esta lindo.',
      '{projeto} e arte, e ciencia, e tendencia. E um pouco de risco.',
      'Quem nao curtir {projeto} sera bloqueado com carinho.',
      'Se {projeto} subir mais, compro um planeta pequeno.',
    ],
  },
};

const LUXOS = [
  ['Aquario de Peixe Caro', 'Peixes que custam mais que o porao inteiro.'],
  ['Cadeira Gamer Trono', 'Reclina, vibra e julga voce em silencio.'],
  ['Maquina de Bebida Infinita', 'So tem refrigerante de uva. Infinito.'],
  ['Carro na Garagem', 'Esta na garagem do vizinho, mas aparece na foto.'],
  ['Neon de Frase Motivacional', '"Trabalhe enquanto eles dormem" (eu tambem durmo).'],
  ['Ar-Condicionado Polar', 'Congela as ideias e os trouxas ao mesmo tempo.'],
  ['Tela Curva Gigante', 'Tao curva que da pra ver o proprio futuro.'],
  ['Estatua de Mim Mesmo', 'Dourada, discreta e com 3 metros.'],
];

const TAPETE = [
  'O projeto saiu para comprar pao e nunca mais voltou.',
  'Atualizacao importante: o site agora e uma tela azul.',
  'Foi um prazer. Quem reclamar sera tratado como inimigo da inovacao.',
  'O time inteiro entrou de ferias. Ferias eternas.',
  '"Isso era so estudo", disse o dono, em outra cidade.',
  'A equipe foi para a lua. Lua sem sinal de internet.',
  'A comunidade foi muito importante. Agora e passado.',
];

const CHAT = [
  'quando lambo?',
  'alguem sabe se o saque funciona?',
  'confia que sobe, to dentro com tudo',
  'o dev disse que vem novidade amanha (disse isso ontem tb)',
  'meu primo ja ficou rico com isso, ele disse',
  'por que o grafico so desce, e normal?',
  'fica ligado: hoje e o dia do pump (nao e dica)',
  'chega de fud, so vem coisa boa, abraco',
];

const AVALIACAO = [
  ['Joaozinho123', 'Melhor investimento da minha vida! Nota 5. Nao testei o saque.'],
  ['Marilu Fiel', 'Mudou minha vida, agora acordo cedo para ver o grafico.'],
  ['Robo Confiavel 42', 'Excelente. Recomendo. Excelente. Recomendo.'],
  ['Carlao do Pix', 'Ainda nao saquei, mas a fe e grande. 5 estrelas.'],
  ['Anonimo Feliz', 'Entrei com R$ 10, hoje tenho R$ 10. Estavel!'],
  ['Bia Moedinha', 'Equipe muito atenciosa. Responderam meu chamado com um emoji.'],
];

const PRESTIGIO = [
  'Reincidente Primario',
  'Foragido de Estimacao',
  'Ex-Presidiario Emerito',
  'Lenda do Camburao',
  'Rei do Habeas Corpus',
  'Imperador do Indulto',
];

const MSG = {
  'msg.video1.oferta': 'Oi! Vi seu video de {projeto}. Quero fechar uma parceria: 5 mil pra gravar um video sobre voce.',
  'msg.melhorar.oferta': 'Agora que o jogo lancou, imagino que voce possa melhorar a oferta, ne? A audiencia ta alta.',
  'msg.choro.resposta': 'Entendo que e caro, mas meu preco e justo: cada seguidor me ama e custa caro. Posso fazer 10% de desconto.',
  'msg.sumir': 'Visualizado. Ultima vez visto: nunca. Esta pessoa ficou indisponivel.',
};

const VIDEO = {
  'video.1.roteiro': 'Conhecam esse jogo! E {projeto}: simples, bonito e prestes a explodir. Link na bio, nao esquece de curtir.',
  'video.2.roteiro': 'Quanto {projeto} rende por dia? Olha o teste de saque: caiu na hora (um centavo). Agora o grafico: so sobe, sempre.',
  'video.3.roteiro': 'Por que eu sai de {projeto}? Era so estudo, pessoal. Tudo educativo. Qualquer coisa, falem com o meu advogado.',
};

const PERSONAGEM = {
  'personagem.rugrigo.nome': 'Rugrigo',
  'personagem.rugrigo.bio': 'Dono do porao. Mora la desde que a ideia era boa.',
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
