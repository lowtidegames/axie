// Troca os nomes provisorios por nomes reais, se o dono puser porao/nomes.local.json (fora do git).
import fs from 'node:fs';
import { TEXTOS } from '../comum/nomes.js';

// Funcao pura: recebe o caminho e devolve uma COPIA dos textos. Nunca lanca erro.
export function carregarNomes(caminho) {
  const saida = { ...TEXTOS };
  let bruto;
  try {
    if (!caminho || !fs.existsSync(caminho)) return saida;
    bruto = fs.readFileSync(caminho, 'utf8');
  } catch (e) {
    console.warn(`nomes.local.json: nao consegui ler (${e.message}); usando nomes provisorios.`);
    return saida;
  }
  let dados;
  try {
    dados = JSON.parse(bruto);
  } catch (e) {
    console.warn('nomes.local.json: JSON invalido; usando nomes provisorios.');
    return saida;
  }
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    console.warn('nomes.local.json: precisa ser um objeto chave -> texto; ignorado.');
    return saida;
  }
  for (const [k, v] of Object.entries(dados)) {
    if (!Object.prototype.hasOwnProperty.call(TEXTOS, k)) {
      console.warn(`nomes.local.json: chave desconhecida "${k}"; ignorada.`);
    } else if (typeof v !== 'string' || !v.trim()) {
      console.warn(`nomes.local.json: valor invalido em "${k}"; ignorado.`);
    } else {
      saida[k] = v;
    }
  }
  return saida;
}
