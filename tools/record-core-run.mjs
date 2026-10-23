import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [directory, ids, command, ...args] = process.argv.slice(2);
if (!directory || !ids || !command) throw new Error('Usage: record-core-run.mjs evidence/subdir IDs command args...');
const dest = resolve(root, directory);
if (!dest.startsWith(resolve(root, 'evidence') + '/') && !dest.startsWith(resolve(root, 'evidence') + '\\')) throw new Error('EVIDENCE_PATH_OUTSIDE_PROJECT');
if (existsSync(dest)) throw new Error('EVIDENCE_ALREADY_EXISTS');
mkdirSync(dest, { recursive: true });
const hashes = {};
function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full); }
    else hashes[relative(root, full).replaceAll('\\', '/')] = createHash('sha256').update(readFileSync(full)).digest('hex');
  }
}
walk(join(root, 'packages/core'));
// Include helper programs launched indirectly by npm tests, not only direct command arguments.
walk(join(root, 'tools'));
for(const path of ['packages/enterprise','prototypes/android/pilot/src','prototypes/android/standalone/src'])if(existsSync(join(root,path)))walk(join(root,path));
for(const path of args.filter(p=>p.startsWith('tools/')&&/\.(mjs|ps1)$/.test(p)))if(existsSync(join(root,path)))hashes[path]=createHash('sha256').update(readFileSync(join(root,path))).digest('hex');
const startedAt = new Date().toISOString();
const run = spawnSync(command === 'node' ? process.execPath : command, args, {
  cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, DIALER_EVIDENCE_DIR: dest },
});
const output = (run.stdout ?? '') + (run.stderr ?? '');
const summary = Object.fromEntries([...output.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\r?$/gm)].map(m => [m[1], Number(m[2])]));
const report = { startedAt, endedAt: new Date().toISOString(), workAndRequirementIds: ids.split(','),
  command, args, workingDirectory: root, node: process.version, exitCode: run.status,
  signal: run.signal, error: run.error?.message, summary, sourceHashes: hashes,
  realPhoneAdapterConnected: false, output };
writeFileSync(join(dest, 'run.json'), JSON.stringify(report, null, 2) + '\n');
writeFileSync(join(dest, 'output.log'), output);
console.log(JSON.stringify({ directory, exitCode: run.status, summary }));
if (run.status !== 0) console.log(output.slice(-10000));
process.exitCode = run.status ?? 1;
