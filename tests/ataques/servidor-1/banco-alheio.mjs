// abrirBanco num arquivo SQLite que NÃO é do Frayz (user_version 0, com dados): migra por cima, sem cópia e sem recusar.
import { DatabaseSync } from 'node:sqlite'
import { abrirBanco } from '/home/user/wt/servidor/server/db.mjs'
const f = '/tmp/seg-frayz-1/db/alheio.db'
const d = new DatabaseSync(f); d.exec("CREATE TABLE IF NOT EXISTS jogadores (id INTEGER PRIMARY KEY, saldo INTEGER); INSERT INTO jogadores (saldo) VALUES (1000)"); d.close()
try { const db = abrirBanco(f, { modo: 'producao' }); console.log('abriu e migrou por cima; tabelas agora:', db.prepare("SELECT group_concat(name) n FROM sqlite_master WHERE type='table'").get().n, '; modo gravado:', db.prepare("SELECT valor FROM meta WHERE chave='modo'").get().valor); db.close() } catch (e) { console.log('recusou:', e.message) }
const fs = await import('node:fs'); console.log('pasta de cópias existe?', fs.existsSync('/tmp/seg-frayz-1/db/copias'))
