import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as N from '../comum/nomes.js';
import { carregarNomes } from '../servidor/nomes-local.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RARIDADES = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'];

function tmp(conteudo) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'porao-'));
  const f = path.join(d, 'nomes.local.json');
  if (conteudo !== undefined) fs.writeFileSync(f, conteudo);
  return f;
}
function mudo(fn) {
  const w = console.warn;
  const av = [];
  console.warn = (m) => av.push(m);
  try { return [fn(), av]; } finally { console.warn = w; }
}

test('sem arquivo: nomes provisorios', () => {
  const [r, av] = mudo(() => carregarNomes(tmp()));
  assert.deepEqual(r, N.TEXTOS);
  assert.equal(av.length, 0);
});

test('com arquivo: troca chaves conhecidas', () => {
  const [r] = mudo(() => carregarNomes(tmp(JSON.stringify({ 'ideia.comum.1.nome': 'Nome Real' }))));
  assert.equal(r['ideia.comum.1.nome'], 'Nome Real');
  assert.notEqual(N.TEXTOS['ideia.comum.1.nome'], 'Nome Real');
});

test('arquivo quebrado: ignora com aviso', () => {
  const [r, av] = mudo(() => carregarNomes(tmp('{quebrado')));
  assert.deepEqual(r, N.TEXTOS);
  assert.equal(av.length, 1);
});

test('chave desconhecida e valor invalido: ignora com aviso', () => {
  const [r, av] = mudo(() => carregarNomes(tmp(JSON.stringify({ 'nao.existe': 'x', 'ideia.comum.1.nome': 5 }))));
  assert.deepEqual(r, N.TEXTOS);
  assert.equal(av.length, 2);
});

test('nao altera o original', () => {
  const antes = JSON.stringify(N.TEXTOS);
  mudo(() => carregarNomes(tmp(JSON.stringify({ 'ideia.comum.1.nome': 'Z' }))));
  assert.equal(JSON.stringify(N.TEXTOS), antes);
});

test('ideias: 4+ por raridade, com nome, lancamento e fim', () => {
  for (const r of RARIDADES) {
    for (let i = 1; i <= 4; i++) {
      for (const c of ['nome', 'lancamento', 'fim']) {
        const t = N.TEXTOS[`ideia.${r}.${i}.${c}`];
        assert.ok(typeof t === 'string' && t.length > 2, `falta ideia.${r}.${i}.${c}`);
      }
    }
  }
});

test('toda chave tem texto e a lista bate', () => {
  for (const [k, v] of Object.entries(N.TEXTOS)) assert.ok(typeof v === 'string' && v.trim().length > 0, k);
  assert.deepEqual(N.CHAVES, Object.keys(N.TEXTOS));
});

test('influenciadores: 3 nano, 3 medio, 2 mega; todo post tem {projeto}', () => {
  const cont = { nano: 0, medio: 0, mega: 0 };
  for (const k of Object.keys(N.TEXTOS)) {
    const m = k.match(/^influ\.(nano|medio|mega)\.(\d+)\.nome$/);
    if (m) cont[m[1]]++;
  }
  assert.deepEqual(cont, { nano: 3, medio: 3, mega: 2 });
  for (const [k, v] of Object.entries(N.TEXTOS)) {
    if (/^influ\.\w+\.\d+\.post\.\d+$/.test(k)) assert.ok(v.includes('{projeto}'), k);
  }
  for (const g of ['nano.1', 'nano.2', 'nano.3', 'medio.1', 'medio.2', 'medio.3', 'mega.1', 'mega.2']) {
    for (let i = 1; i <= 5; i++) assert.ok(N.TEXTOS[`influ.${g}.post.${i}`], `post ${g}.${i}`);
    assert.ok(N.TEXTOS[`influ.${g}.bio`]);
  }
});

test('celular, videos, luxos, tapete, chat, avaliacoes, prestigio, Rugrigo', () => {
  for (const k of ['msg.video1.oferta', 'msg.melhorar.oferta', 'msg.choro.resposta', 'msg.sumir', 'video.1.roteiro', 'video.2.roteiro', 'video.3.roteiro', 'personagem.rugrigo.nome']) {
    assert.ok(N.TEXTOS[k], k);
  }
  for (const pre of ['luxo.', 'tapete.', 'chat.', 'avaliacao.', 'prestigio.']) {
    assert.ok(N.CHAVES.filter((k) => k.startsWith(pre)).length >= 4, pre);
  }
});

test('.gitignore da raiz protege nomes.local.json', () => {
  const g = fs.readFileSync(path.join(RAIZ, '.gitignore'), 'utf8').split('\n').map((l) => l.trim());
  assert.ok(g.includes('porao/nomes.local.json'));
});

test('ideias: exatamente 5 por raridade, nomes sem repetir', () => {
  const nomes = new Set();
  for (const r of RARIDADES) {
    const n = N.CHAVES.filter((k) => new RegExp(`^ideia\\.${r}\\.\\d+\\.nome$`).test(k)).length;
    assert.equal(n, 5, `ideias em ${r}`);
    for (let i = 1; i <= 5; i++) {
      for (const c of ['nome', 'lancamento', 'fim']) assert.ok(N.TEXTOS[`ideia.${r}.${i}.${c}`], `falta ideia.${r}.${i}.${c}`);
      nomes.add(N.TEXTOS[`ideia.${r}.${i}.nome`]);
    }
  }
  assert.equal(nomes.size, 30);
});

test('rebrand: 5 jeitos, todos com {nome} e diferentes', () => {
  const lista = N.CHAVES.filter((k) => /^rebrand\.\d+$/.test(k));
  assert.equal(lista.length, 5);
  for (let i = 1; i <= 5; i++) assert.ok(N.TEXTOS[`rebrand.${i}`].includes('{nome}'), `rebrand.${i}`);
  assert.equal(new Set(lista.map((k) => N.TEXTOS[k])).size, 5);
});

test('celular: oferta do video 1 usa {valor}; video 2 pelo mesmo preco cita {projeto}', () => {
  const oferta = N.TEXTOS['msg.video1.oferta'];
  assert.ok(oferta.includes('{valor}'));
  assert.ok(oferta.includes('{projeto}'));
  assert.ok(!/\d+ mil/.test(oferta), 'valor fixo na oferta');
  assert.ok(N.TEXTOS['msg.video2.mesmo_preco'].includes('{projeto}'));
});

test('batida: 5 frases curtas; medidor de confianca tem rotulo', () => {
  for (let i = 1; i <= 5; i++) {
    const t = N.TEXTOS[`batida.${i}`];
    assert.ok(t && t.length <= 60, `batida.${i}`);
  }
  assert.ok(N.TEXTOS['ui.confianca'] && N.TEXTOS['ui.confianca'].length <= 24);
});

test('marcadores: so {projeto}, {valor} e {nome}', () => {
  for (const [k, v] of Object.entries(N.TEXTOS)) {
    for (const m of v.match(/\{[^}]*\}/g) ?? []) assert.ok(['{projeto}', '{valor}', '{nome}'].includes(m), `${k}: ${m}`);
  }
});

test('sorteio do servidor: 7 frases de tapete e 8 de chat', () => {
  assert.equal(N.CHAVES.filter((k) => k.startsWith('tapete.')).length, 7);
  assert.equal(N.CHAVES.filter((k) => k.startsWith('chat.')).length, 8);
});
