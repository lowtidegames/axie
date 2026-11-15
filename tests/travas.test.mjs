// Testes das travas do estúdio (tools/*.mjs). Não mexem no jogo nem no banco.
// Rodar: npm run test:travas
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as C from '../tools/trava-congelado.mjs'
import * as CS from '../tools/comando-seguro.mjs'
import * as CT from '../tools/contexto-turno.mjs'
import * as E from '../tools/trava-economia.mjs'
import * as G from '../tools/guarda-privacidade.mjs'
import * as GC from '../tools/guardas-comum.mjs'
import * as H from '../tools/trava-24h.mjs'
import * as P from '../tools/trava-proposta.mjs'
import * as R from '../tools/trava-ramo.mjs'
import * as T from '../tools/trava-robos.mjs'
import * as TV from '../tools/trava-verde.mjs'
import * as VD from '../tools/verde.mjs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-travas-'))
const evento = (command, extra = {}) => JSON.stringify({ tool_input: { command }, cwd: tmp, ...extra })
const raizCom = (arquivos) => {
  const raiz = fs.mkdtempSync(path.join(tmp, 'raiz-'))
  for (const [nome, texto] of Object.entries(arquivos)) {
    fs.mkdirSync(path.dirname(path.join(raiz, nome)), { recursive: true })
    fs.writeFileSync(path.join(raiz, nome), typeof texto === 'string' ? texto : JSON.stringify(texto))
  }
  return raiz
}

// ---------------- peças comuns ----------------
test('comum: partes, palavras e escrita em arquivo protegido', () => {
  assert.deepEqual(GC.partes('cd x && ls | wc; echo fim'), ['cd x', 'ls', 'wc', 'echo fim'])
  assert.deepEqual(GC.palavras(`git commit -m "uma frase" 'outra'`), ['git', 'commit', '-m', 'uma frase', 'outra'])
  assert.equal(GC.escreveNoArquivo('echo x > estudio/modo.json', 'modo.json'), true)
  assert.equal(GC.escreveNoArquivo('cat estudio/modo.json', 'modo.json'), false)
  assert.equal(GC.temData('feito em 09/11/2026'), true)
  assert.equal(GC.temData('sem data aqui'), false)
})

// ---------------- trava de robôs ----------------
test('robos: reconhece só o teste de tela rodado de verdade, parte por parte', () => {
  assert.equal(T.ehE2eDireto('node tests/tela.e2e.js'), true)
  assert.equal(T.ehE2eDireto('E2E_PORTA=4000 node --disable-warning=ExperimentalWarning tests/tela.e2e.js'), true)
  assert.equal(T.ehE2eDireto('grep -n "node tests/tela.e2e.js" STATUS.md'), false)
  assert.equal(T.ehE2eDireto('npm test'), false)
  assert.equal(T.ehE2ePeloNpm('npm run e2e'), true)
})

test('robos: o gancho barra o teste de tela direto e deixa o resto passar', () => {
  const arquivo = path.join(tmp, 'g.trava')
  assert.equal(T.decidirGatilho(evento('npm test'), { arquivo }).codigo, 0)
  assert.equal(T.decidirGatilho(evento('git commit -m "roda node tests/tela.e2e.js"'), { arquivo }).codigo, 0)
  const r = T.decidirGatilho(evento('cd /x && node tests/tela.e2e.js'), { arquivo })
  assert.equal(r.codigo, 2)
  assert.match(r.msg, /trava-robos\.mjs rodar/)
  assert.equal(T.decidirGatilho('isto não é json', { arquivo }).codigo, 0)
})

test('robos: um dono por vez; trava de processo morto é retomada; soltar só a própria', () => {
  const arquivo = path.join(tmp, 'p.trava')
  const outro = process.ppid
  assert.equal(T.pegar({ comando: 'a', pid: process.pid, arquivo, env: {} }), true)
  assert.equal(T.pegar({ comando: 'b', pid: outro, arquivo, env: {} }), false)
  assert.equal(T.soltar({ pid: outro, arquivo }), false)
  assert.equal(T.soltar({ arquivo }), true)
  fs.writeFileSync(arquivo, JSON.stringify({ pid: 2 ** 22 + 7, comando: 'morto', hora: Date.now() }))
  assert.equal(T.pegar({ comando: 'c', pid: outro, arquivo, env: {} }), true)
  T.soltar({ pid: outro, arquivo, forca: true })
})

// ---------------- trava do congelado ----------------
test('congelado: ABERTO deixa passar; CONGELADO barra publicação; emergência passa sempre', () => {
  const aberto = raizCom({ 'estudio/modo.json': { modo: 'ABERTO' } })
  const congelado = raizCom({ 'estudio/modo.json': { modo: 'CONGELADO', motivo: 'teste' } })
  const quebrado = raizCom({ 'estudio/modo.json': '{ nao e json' })
  assert.equal(C.decidir(evento('railway up'), { raiz: aberto }).codigo, 0)
  assert.equal(C.decidir(evento('railway up'), { raiz: congelado }).codigo, 2)
  assert.equal(C.decidir(evento('railway up'), { raiz: quebrado }).codigo, 2)
  assert.equal(C.decidir(evento('railway variables --set COMPRAS_PAUSADAS=1'), { raiz: congelado }).codigo, 0)
  assert.equal(C.decidir(evento('railway variables --set COISA_QUALQUER=1'), { raiz: congelado }).codigo, 2)
  assert.equal(C.decidir(evento('ls -la'), { raiz: congelado }).codigo, 0)
})

test('congelado: o Bash não escreve no arquivo do modo (só o dono)', () => {
  const raiz = raizCom({ 'estudio/modo.json': { modo: 'ABERTO' } })
  assert.equal(C.decidir(evento('echo {} > estudio/modo.json'), { raiz }).codigo, 2)
  assert.deepEqual(C.CHAVES_DE_EMERGENCIA, ['COMPRAS_PAUSADAS', 'SAQUES_PAUSADOS', 'TESOURARIA_PARADA', 'SAVE_SO_LEITURA', 'MANUTENCAO', 'MERCADO_PAUSADO'])
})

test('congelado: o modo do estúdio do repositório é um valor válido', () => {
  const modo = JSON.parse(fs.readFileSync(new URL('../estudio/modo.json', import.meta.url), 'utf8')).modo
  assert.ok(C.MODOS_VALIDOS.includes(modo))
})

// ---------------- trava da economia ----------------
test('economia: número novo exige linha no registro de decisões no mesmo commit', () => {
  assert.equal(E.mudouNumero('+++ b/shared/config.js\n-  preco: 10,\n+  preco: 12,\n'), true)
  assert.equal(E.mudouNumero('+++ b/shared/config.js\n-  // texto antigo\n+  // texto novo\n'), false)
  assert.equal(E.acrescentouDecisao('+++ b/docs/decisions.md\n+- 15/11/2026 10:00 BRT — economia: preço 12 — "sim" (conversa)\n'), true)
  assert.equal(E.acrescentouDecisao('+++ b/docs/decisions.md\n+- sem data nenhuma\n'), false)
})

test('economia: sem arquivo de lista usa o padrão e deixa passar comando comum', () => {
  const raiz = raizCom({})
  assert.deepEqual(E.lerConfig(raiz).variaveis, [])
  assert.equal(E.decidir(evento('ls'), { raiz }).codigo, 0)
})

// ---------------- trava das 24 horas ----------------
test('24h: push forçado exige aprovação do dono com mais de 24 h; tudo comum passa', () => {
  const raiz = raizCom({ 'estudio/aprovacoes-irreversiveis.json': { aprovacoes: [] } })
  const agora = new Date('2026-11-15T12:00:00-03:00')
  assert.equal(H.decidir(evento('git push --force origin teste-x'), { raiz, agora }).codigo, 2)
  assert.equal(H.decidir(evento('git push origin teste-x'), { raiz, agora }).codigo, 0)
  assert.equal(H.decidir(evento('ls'), { raiz, agora }).codigo, 0)
  const cedo = raizCom({ 'estudio/aprovacoes-irreversiveis.json': { aprovacoes: [{ acao: 'git push --force origin teste-x', aprovado_em: '2026-11-15T10:00:00-03:00' }] } })
  assert.equal(H.decidir(evento('git push --force origin teste-x'), { raiz: cedo, agora }).codigo, 2)
  const certa = raizCom({ 'estudio/aprovacoes-irreversiveis.json': { aprovacoes: [{ acao: 'git push --force origin teste-x', aprovado_em: '2026-11-13T10:00:00-03:00' }] } })
  assert.equal(H.decidir(evento('git push --force origin teste-x'), { raiz: certa, agora }).codigo, 0)
})

test('24h: o arquivo de aprovações do repositório está vazio de aprovações', () => {
  const j = JSON.parse(fs.readFileSync(new URL('../estudio/aprovacoes-irreversiveis.json', import.meta.url), 'utf8'))
  assert.deepEqual(j.aprovacoes, [])
})

// ---------------- trava do ramo ----------------
test('ramo: cada agente envia só o próprio ramo; teste só do diretor; main só de quem está na main', () => {
  const noRamo = (ramo) => () => ramo
  assert.equal(R.decidir(evento('git push origin teste-tela'), noRamo('teste-tela')).codigo, 0)
  assert.equal(R.decidir(evento('git push origin teste-servidor'), noRamo('teste-tela')).codigo, 2)
  assert.equal(R.decidir(evento('git push origin teste'), noRamo('teste-tela')).codigo, 2)
  assert.equal(R.decidir(evento('git push origin teste'), noRamo('teste')).codigo, 0)
  assert.equal(R.decidir(evento('git push origin main'), noRamo('teste')).codigo, 2)
  assert.equal(R.decidir(evento('git status'), noRamo('teste-tela')).codigo, 0)
})

// ---------------- trava da proposta ----------------
test('proposta: pedir o "sim" ou recomendar exige tabela com Nota e linha "Conselheiros:"', () => {
  const tabela = '| # | Opção | Nota |\n|---|---|---|\n| 1 | A | 9 |\n| 2 | B | 5 |\n'
  const pedido = '\n```\nsim, opção 1\n```\n'
  assert.equal(P.avaliar('Subiu o lote, tudo verde.').codigo, 0)
  assert.equal(P.avaliar(tabela + pedido).codigo, 2)
  assert.equal(P.avaliar(tabela + 'Conselheiros: não precisa — processo interno' + pedido).codigo, 0)
  assert.equal(P.avaliar('Eu recomendo fazer a opção A.').codigo, 2)
})

// ---------------- comando seguro ----------------
test('comando seguro: barra pkill -f perigoso, heredoc trocado e comando que o bash não lê', () => {
  assert.equal(CS.avaliar('pkill -f "node servidor"').codigo, 2)
  assert.equal(CS.avaliar('kill $(pgrep -f "[n]ode servidor")').codigo, 0)
  assert.equal(CS.avaliar('echo "aspas abertas').codigo, 2)
  assert.equal(CS.avaliar('cat > a.txt <<EOF\n$(date)\nEOF').codigo, 2)
  assert.equal(CS.avaliar("cat > a.txt <<'EOF'\n$(date)\nEOF").codigo, 0)
  assert.equal(CS.avaliar('ls -la').codigo, 0)
})

// ---------------- guarda de privacidade ----------------
test('privacidade: acha segredo e e-mail pessoal, ignora noreply', () => {
  const arroba = '@'
  assert.ok(G.procurar(`+const x = "contato: alguem${arroba}exemplo.com"`, []).length > 0)
  assert.equal(G.procurar(`+autor: 123+conta${arroba}users.noreply.github.com`, []).length, 0)
  assert.ok(G.procurar('+-----BEGIN ' + 'PRIVATE KEY-----', []).length > 0)
  assert.equal(G.procurar('+texto comum sem segredo', []).length, 0)
})

test('privacidade: palavra da lista privada é barrada e mascarada', () => {
  const r = G.procurar('+ele jogou o produtoxyz hoje', ['produtoxyz'])
  assert.ok(r.length > 0)
  assert.equal(G.mascarar('produtoxyz', ['produtoxyz']).includes('produtoxyz'), false)
})

test('privacidade: commit com autor pessoal é barrado, com noreply passa', () => {
  const git = () => ''
  const arroba = '@' // o e-mail é montado na hora: nenhum e-mail pessoal fica escrito no arquivo
  const pessoal = G.decidir(evento(`git commit --author="Fulano <fulano${arroba}exemplo.com>" -m "x"`), {}, git)
  assert.equal(pessoal.codigo, 2)
  const certo = G.decidir(evento(`git commit --author="Estudio <1+estudio${arroba}users.noreply.github.com>" -m "x"`), {}, git)
  assert.equal(certo.codigo, 0)
  assert.equal(G.decidir(evento('ls'), {}, git).codigo, 0)
})

// ---------------- verde ----------------
test('verde: gravar e ler o registro de uma bateria na pasta temporária', () => {
  const raiz = raizCom({})
  VD.gravarVerde(raiz, 'servidor', 'abc123', Date.UTC(2026, 10, 15, 12, 0))
  assert.equal(VD.lerVerde(raiz).servidor.arvore, 'abc123')
  assert.equal(VD.verdePara(raiz, 'servidor', 'abc123').arvore, 'abc123')
  assert.equal(VD.verdePara(raiz, 'servidor', 'outra'), null)
  assert.match(VD.hhmm(Date.UTC(2026, 10, 15, 15, 30)), /12:30 BRT/)
})

test('trava-verde: o Bash não forja .cache/verde.json; push sem verde é barrado', () => {
  assert.equal(TV.decidir(evento('echo {} > .cache/verde.json')).codigo, 2)
  assert.equal(TV.decidir(evento('ls')).codigo, 0)
  const git = (args) => ({ 'rev-parse --show-toplevel': tmp, 'rev-parse HEAD': 'h1', 'rev-parse HEAD^{tree}': 't1' }[args.join(' ')] ?? null)
  assert.equal(TV.decidir(evento('git push origin teste'), { raiz: tmp, git, arvoreDeCodigo: () => 'x' }).codigo, 2)
})

// ---------------- contexto de turno ----------------
test('contexto: uma linha com a hora e o estado, sem quebrar sem git', () => {
  assert.equal(CT.itensDoPacote('## No pacote\n\n| a |\n|---|\n| x |\n| y |\n'), 2)
  const l = CT.linha({ raiz: raizCom({}), git: () => '', arvore: null })
  assert.match(l, /^Agora \d\d:\d\d BRT/)
})
