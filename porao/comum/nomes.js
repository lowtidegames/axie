// Textos do Porão por CHAVE estável (chaves em ASCII, textos em português com acento).
// Tudo inventado e provisório (sátira leve).
// Nomes reais ficam em porao/nomes.local.json (fora do git); ver servidor/nomes-local.mjs.
// Marcadores: {projeto} = nome do golpe atual · {valor} = preço já formatado · {nome} = nome antes do rebrand.

// [nome, lançamento, fim] por raridade — do golpe mixuruca (Comum) ao cósmico absurdo (Mítico)
const IDEIAS = {
  comum: [
    ['Moeda do Vizinho', 'Moeda do Vizinho: lastreada na palavra dele. Ele jurou.', 'O vizinho se mudou de madrugada. Levou a moeda e a minha escada.'],
    ['Vaquinha do Servidor', 'Ajude o servidor a ficar de pé! Qualquer moedinha serve.', 'O servidor era o notebook do tio. Ele fechou a tampa.'],
    ['Rifa do Pinguim', 'Rifa do Pinguim: o prêmio é um pinguim (de geladeira).', 'Sorteio feito: ganhei eu. Que sorte a minha.'],
    ['Token do Pastel', 'Cada token vale um pastel. O vento vai de brinde.', 'A feira acabou. O token esfriou junto com o pastel.'],
    ['Cafezinho que Rende', 'Deixe seu café com a gente: rende juros até esfriar.', 'O café esfriou. Os juros evaporaram antes.'],
  ],
  incomum: [
    ['Jogue e Ganhe Troco', 'Jogue 8 horas por dia e ganhe até 3 centavos!', 'Faltou troco. Pagamos todo mundo em bala.'],
    ['Bichinho de Papel Raro', 'Bichinhos de papel dobrado: únicos, raros e inflamáveis.', 'Choveu. A coleção inteira virou papa.'],
    ['Poupança de Feijão', 'Plante 1 feijão no algodão e colha 2 em 7 dias. É ciência!', 'O feijão brotou. Eu jantei o rendimento.'],
    ['Clube do Hype Barato', 'Clube exclusivo: 4 mil membros (3.900 são robôs).', 'Os robôs pediram demissão. Sobramos você e eu.'],
    ['Sorvete Sem Dono', 'O sorvete que ninguém controla. Nem o freezer.', 'Derreteu. Estava avisado na letra miudinha.'],
  ],
  raro: [
    ['Metaverso do Quintal', 'Terrenos virtuais no meu quintal. Vista para o varal.', 'A vó vendeu o quintal de verdade. Virou estacionamento.'],
    ['Jogo que Ainda Vai Sair', 'O jogo mais esperado do ano! (o ano a gente avisa)', 'O jogo saiu: uma tela preta com música. Os robôs deram 10.'],
    ['Fundo Galo de Ouro', 'O Galo de Ouro rende 300% ao mês. O galo garante.', 'O galo cantou às 5h e voou com o cofre.'],
    ['Lucro Zen', 'Invista com paz interior e lucro exterior.', 'A paz interior era minha. O lucro também.'],
    ['Aluguel de Nuvem', 'Alugue uma nuvem de verdade. Olhe pra cima: é aquela ali.', 'Ventou. Sua nuvem agora é de outro município.'],
  ],
  epico: [
    ['Banco do Futuro Agora', 'O banco do futuro: deposite hoje, saque em 2090.', 'O futuro foi adiado. O saque também.'],
    ['Moeda Cometa', 'A Moeda Cometa passa só uma vez. Embarque!', 'O cometa passou. Eu fui na cauda.'],
    ['Sonho Engarrafado S.A.', 'Engarrafamos sonhos. Cada garrafa vazia é um ativo.', 'Os sonhos evaporaram. Devolvemos os cascos.'],
    ['Cassino do Bem', 'Aposte pelo bem! A casa sempre ganha (e doa).', 'A casa ganhou. Doou tudo para a casa.'],
    ['Torre de 100 Andares', 'Torre de luxo com 100 andares. Só falta o primeiro.', 'A torre era um desenho. O elevador ainda não sabe.'],
  ],
  lendario: [
    ['Ouro de Marte Ltda.', 'Ouro extraído de Marte. Frete grátis (só de ida).', 'A nave atrasou. Marte não atende telefone.'],
    ['Rede que Nunca Cai', 'A rede que nunca cai. Se cair, foi você.', 'A rede caiu. Sobrou o fio e um boleto.'],
    ['Oráculo do Lucro Certo', 'O oráculo viu o futuro: você lucra. Ele cobra antes.', 'O oráculo previu o tapete. Só não avisou.'],
    ['Cofre dos Dragões', 'Dragões guardam seu dinheiro. Nunca foram roubados (nem vistos).', 'Os dragões eram lagartixas de aluguel.'],
    ['Aliança Global do Sim', '40 países imaginários já disseram sim. Só falta você.', 'Os 40 países pediram asilo em outro golpe.'],
  ],
  mitico: [
    ['O Golpe do Século', 'O Golpe do Século: está no nome e você entra assim mesmo.', 'Estava no nome. Todo mundo comprou mesmo assim.'],
    ['Cotas do Sol', 'Vendo cotas do Sol. Quem não pagar fica no escuro.', 'O Sol se pôs. Jurei que voltava amanhã e fui embora.'],
    ['Loteamento Universo 2', 'Lotes na planta do próximo universo. Entrega após o Big Bang.', 'O universo novo atrasou. O antigo não aceita devolução.'],
    ['Templo do Lucro Eterno', 'O lucro é eterno. O templo é dobrável.', 'Dobrei o templo e fui embora de van.'],
    ['Império do Puxa-Tapete', 'Um tapete tão grande que o mercado inteiro cabe em cima.', 'Puxei. A galáxia inteira escorregou junto.'],
  ],
};

// grupos: nano.1..3, medio.1..3, mega.1..2
const INFLU = {
  'nano.1': {
    nome: 'Biel do Grupo',
    bio: 'Sete seguidores fiéis. Dois são a minha mãe.',
    posts: [
      'Gente, olha {projeto}! Entra antes que meus 7 seguidores esgotem!',
      'Sonhei com {projeto}. No sonho eu pagava o aluguel.',
      'Meus 7 seguidores já entraram em {projeto}. Oi, mãe! Oi, mãe de novo!',
      'Não é recomendação, mas {projeto} é o futuro (me emprestam 20?).',
      'Gravei um vídeo de {projeto}. Minha mãe curtiu das duas contas.',
    ],
  },
  'nano.2': {
    nome: 'Dona Cripta',
    bio: 'Tia do grupo da família. Descobriu o gráfico ontem.',
    posts: [
      'Bom dia, família! {projeto} está subindo igual à minha pressão.',
      'Mandei {projeto} no grupo da família. O Zé respondeu: "quem é?"',
      'Bom dia com {projeto} e uma rosa que pisca. Repasse para 10 contatos.',
      '{projeto} me deu mais emoção que a novela das nove.',
      'Imprimi o gráfico de {projeto} e colei na geladeira. Lindo!',
    ],
  },
  'nano.3': {
    nome: 'Pedrinho Carrão',
    bio: 'Vai comprar um carrão. Hoje está de ônibus.',
    posts: [
      'Em breve, carrão! Graças a {projeto}. Por enquanto, graças ao cobrador.',
      'Pesquisei {projeto} por 4 minutos. Conclusão: foguete.',
      '{projeto} não dorme. Eu durmo, mas {projeto} não.',
      'Quem entrou cedo em {projeto} já está comigo: no ônibus, com esperança.',
      'Papai disse que {projeto} é furada. Papai também não tem carrão.',
    ],
  },
  'medio.1': {
    nome: 'Tio Gema',
    bio: 'O tiozão das gemas raras e das dicas duvidosas.',
    posts: [
      'Atenção, sobrinhada: {projeto} é a gema do mês. Anotem.',
      'Eu avisei sobre {projeto}. Quem não ouviu, ouve no meu curso.',
      '{projeto} é joia bruta. Só falta lapidar o seu bolso.',
      'Gema não se explica. {projeto} eu explico no módulo 7 (pago à parte).',
      '{projeto} a esse preço? Vou repetir mais alto: A ESSE PREÇO?',
      'Mandem {projeto} pra quem diz que isso é bolha. Bolha também sobe!',
    ],
  },
  'medio.2': {
    nome: 'Lucas Conversível',
    bio: 'Alugou um conversível por 20 minutos. Rendeu 400 fotos.',
    posts: [
      'Comprei {projeto} dentro do conversível (devolvo às 15h).',
      'Rotina de sucesso: acordar, café, {projeto}, devolver o carro.',
      '{projeto} é para quem pensa grande. Eu penso enorme e parcelo.',
      'O segredo de {projeto}? Tem que entrar. Pronto, era isso.',
      'Fiquei rico com {projeto}! Foi num sonho, mas eu conto igual.',
      'Corre pra {projeto} antes que eu conte para mais gente!',
    ],
  },
  'medio.3': {
    nome: 'Dra. Foguete',
    bio: 'Doutora em nada. Pós em emoji de foguete.',
    posts: [
      '{projeto} já decolou. Destino: a gente vê no caminho.',
      'Foguete, foguete, foguete! Ah, e {projeto}.',
      'Receito {projeto} de 8 em 8 horas (não é conselho médico).',
      'Meu gráfico de {projeto} só aponta para cima. Se precisar, eu viro a tela.',
      'Gratidão a {projeto}. E a quem comprou depois de mim.',
      '{projeto} é o remédio. Efeito colateral: euforia e sumiço do saldo.',
    ],
  },
  'mega.1': {
    nome: 'Mestre do Airdrop',
    bio: 'Cinco milhões de seguidores esperando um airdrop que nunca chega.',
    posts: [
      'Meus 5 milhões de amigos: {projeto} é a nova era. Entrem em fila.',
      'Airdrop de {projeto}! (só para quem já comprou {projeto})',
      'Eu nunca indico nada. Exceto {projeto}. E {projeto} de novo.',
      'Vou sortear 10 mil em {projeto}. Para participar, envie 5 mil.',
      '{projeto} mudou a minha vida. Mudo a sua também (taxa do curso).',
      'Aos críticos de {projeto}: não escuto vocês. O jato faz barulho.',
      'Mostrei {projeto} para o meu cachorro. Ele entrou com tudo.',
    ],
  },
  'mega.2': {
    nome: 'Baronesa Hype',
    bio: 'Famosa por ser famosa. Nome em neon.',
    posts: [
      'Como celebridade responsável, apoio {projeto} desde ontem à noite.',
      '{projeto}: luxo, glamour e nenhum balanço publicado.',
      'Eu amo {projeto}. Meus advogados pediram para eu parar por aqui.',
      'Entrei em {projeto} só pela vibe. A vibe está linda.',
      '{projeto} é arte, é ciência, é tendência. O resto está no contrato.',
      'Quem não curtir {projeto} será bloqueado com carinho.',
      'Se {projeto} subir mais, compro um planeta pequeno.',
    ],
  },
};

const LUXOS = [
  ['Aquário de Peixe Caro', 'Cada peixe custa mais que o porão. Eles sabem disso.'],
  ['Cadeira Gamer Trono', 'Reclina, vibra e julga você em silêncio.'],
  ['Máquina de Bebida Infinita', 'Só sai refrigerante de uva. Para sempre.'],
  ['Carro na Garagem', 'A garagem é do vizinho, mas a foto é minha.'],
  ['Neon de Frase Motivacional', '"Trabalhe enquanto eles dormem" (eu também durmo).'],
  ['Ar-Condicionado Polar', 'Tão gelado que a vó desce de casaco para reclamar.'],
  ['Tela Curva Gigante', 'Tão curva que dá pra ver a polícia chegando por trás.'],
  ['Estátua de Mim Mesmo', 'Dourada, discreta e com 3 metros.'],
];

// exatamente 7 (o servidor escolhe pelo resto de 7)
const TAPETE = [
  'O projeto saiu para comprar pão e nunca mais voltou.',
  'Atualização importante: o site agora é uma tela azul.',
  'Foi um prazer. Quem reclamar é inimigo da inovação.',
  'O time inteiro entrou de férias. Férias eternas.',
  '"Era só estudo", disse o dono, já em outra cidade.',
  'A equipe foi para a Lua. Lá não pega sinal.',
  'Obrigado, comunidade! Vocês foram a minha porta de saída.',
];

// exatamente 8 (o servidor escolhe pelo resto de 8)
const CHAT = [
  'quando carrão?',
  'alguém já conseguiu sacar? pergunto por um amigo (eu)',
  'confia que sobe, vendi a moto pra entrar',
  'o dev disse que vem novidade amanhã (disse isso ontem tb)',
  'meu primo ficou rico com isso. quem contou foi ele',
  'o gráfico só desce, mas desce bonito né',
  'hoje é o dia do pump, vi num sonho (não é dica)',
  'o dev tá online mas não responde. deve ser timidez',
];

const AVALIACAO = [
  ['Joaozinho123', 'Melhor investimento da minha vida! Nota 5. Não testei o saque.'],
  ['Marilu Fiel', 'Mudou minha vida: agora acordo às 4h para ver o gráfico.'],
  ['Robô Confiável 42', 'Excelente. Recomendo. Excelente. Recomendo. Bip.'],
  ['Carlão do Boleto', 'Ainda não saquei, mas a fé é grande. 5 estrelas.'],
  ['Anônimo Feliz', 'Entrei com 10, hoje tenho 10. Estável!'],
  ['Bia Moedinha', 'Suporte nota 10: responderam meu chamado com um joinha.'],
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
  'msg.video1.oferta': 'Oi, sumido! Vi {projeto} e senti cheiro de sucesso. Por {valor} eu gravo um vídeo jurando que uso há anos.',
  'msg.melhorar.oferta': 'Agora que o jogo lançou, imagino que você possa melhorar a oferta, né? Minha sinceridade encareceu.',
  'msg.choro.resposta': 'Caro? Meus seguidores me amam, e amor custa caro. Faço 10% de desconto e não se fala mais nisso.',
  'msg.sumir': 'Visualizado. Visto por último: nunca. O influenciador agora mora em outro fuso.',
  'msg.video2.mesmo_preco': 'O vídeo de {projeto} flopou: 12 views, 9 foram minhas. Faço o segundo pelo mesmo preço e a gente finge que não viu.',
};

const VIDEO = {
  'video.1.roteiro': 'Conheçam esse jogo! É {projeto}: simples, bonito e prestes a explodir. Link na bio. Não fui pago para dizer isso (fui).',
  'video.2.roteiro': 'Quanto {projeto} rende por dia? Olha o teste de saque: caiu na hora (um centavo). E o gráfico: só sobe, eu cortei o resto.',
  'video.3.roteiro': 'Por que eu saí de {projeto}? Era só estudo, pessoal. Conteúdo educativo. Dúvidas, falem com o meu advogado.',
};

const PERSONAGEM = {
  'personagem.rugrigo.nome': 'Rugrigo',
  'personagem.rugrigo.bio': 'Dono do porão (o porão é da vó). Ex-suporte, atual problema.',
};

// jeitos de renomear o golpe no rebrand; {nome} = nome de antes
const REBRAND = [
  '{nome} 2.0',
  'Novo {nome}',
  '{nome} Agora Vai',
  '{nome} do Bem',
  '{nome} Sob Nova Direção',
];

// a polícia bate na porta do porão
const BATIDA = [
  'TOC TOC. Não é o entregador.',
  'Polícia! Larga o tapete devagar.',
  'Abre! A gente sabe que esse porão tem Wi-Fi.',
  'A vó abriu a porta e ofereceu café para a polícia.',
  'Sirene lá fora. Você jura que é o carro do ovo.',
];

const UI = {
  'ui.confianca': 'Confiança dos trouxas',
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
  Object.assign(t, MSG, VIDEO, PERSONAGEM, UI);
  LUXOS.forEach(([n, d], i) => { t[`luxo.${i + 1}.nome`] = n; t[`luxo.${i + 1}.descricao`] = d; });
  TAPETE.forEach((s, i) => { t[`tapete.${i + 1}`] = s; });
  CHAT.forEach((s, i) => { t[`chat.${i + 1}`] = s; });
  AVALIACAO.forEach(([a, s], i) => { t[`avaliacao.${i + 1}.autor`] = a; t[`avaliacao.${i + 1}.texto`] = s; });
  PRESTIGIO.forEach((s, i) => { t[`prestigio.${i + 1}`] = s; });
  REBRAND.forEach((s, i) => { t[`rebrand.${i + 1}`] = s; });
  BATIDA.forEach((s, i) => { t[`batida.${i + 1}`] = s; });
  return t;
}

export const TEXTOS = Object.freeze(montar());
export const CHAVES = Object.keys(TEXTOS);
export const RARIDADES = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'];

// Troca {projeto} pelo nome do golpe atual.
export function citar(texto, projeto) {
  return String(texto).replaceAll('{projeto}', projeto);
}
