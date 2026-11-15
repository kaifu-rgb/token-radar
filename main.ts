import { readFileSync, writeFileSync, statSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';
import { parseSnapshot, buildBoard, boardIssue, dashboardScript } from './lib/model.ts';

const args = process.argv.slice(2);
let input = '/input';
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--input' || !args[i + 1]) {
    console.error('Usage: node main.ts [--input <file|dir>]');
    process.exit(2);
  }
  input = args[++i];
}
let raw: string;
try {
  const path = statSync(input).isDirectory() ? join(input, 'snapshot.json') : input;
  raw = readFileSync(path, 'utf8');
} catch {
  console.error('Missing or unreadable snapshot: ' + input);
  process.exit(2);
}
try {
  const snapshot = parseSnapshot(raw);
  const board = buildBoard(snapshot);
  const issue = boardIssue(board, snapshot);
  if (issue) throw new Error('Board refused: ' + issue);
  const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, 'board.json'), JSON.stringify(board, null, 2));
  writeFileSync(join(output, 'data.js'), dashboardScript(board, snapshot));
  const beside = dirname(fileURLToPath(import.meta.url));
  cpSync(join(beside, 'dashboard'), join(output, 'dashboard'), { recursive: true });
  cpSync(join(beside, 'screenshots'), join(output, 'screenshots'), { recursive: true });
  const shots = readdirSync(join(beside, 'screenshots'));
  if (shots.length < 3) throw new Error('screenshots/ must contain at least three images with plain names');
  for (const name of shots) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || !statSync(join(beside, 'screenshots', name)).isFile()) throw new Error('Invalid screenshot name: ' + name);
    const bytes = readFileSync(join(beside, 'screenshots', name));
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!png && !jpeg) throw new Error('Screenshot must be a PNG or JPEG: ' + name);
  }
  writeFileSync(join(output, 'dossier.json'), buildDossier(output, {
    text_max_bytes: 65536,
    screenshots: { max: 4, max_bytes: 524288 },
    dashboard: { max_files: 400, max_bytes: 4194304 },
  }));
  console.log('Packaged ' + board.rows.length + ' board rows into ' + output);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
