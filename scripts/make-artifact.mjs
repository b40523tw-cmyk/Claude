// Turn Vite's single-file build into an Artifact page body (no doctype/html/head/body wrappers).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const keep = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/game.html', `${keep.trim()}\n${body.trim()}\n`);
console.log('dist/game.html', (keep.length + body.length) / 1024 | 0, 'KB');
