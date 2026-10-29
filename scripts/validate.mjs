import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const html = readFileSync(resolve(dist, 'workspace.html'), 'utf8');
const app = readFileSync(resolve(dist, 'assets/app.js'), 'utf8');
const sw = readFileSync(resolve(dist, 'sw.js'), 'utf8');
const manifest = JSON.parse(readFileSync(resolve(dist, 'manifest.webmanifest'), 'utf8'));
const checked = new Set();
function check(ref, base = dist) {
  if (!ref || /^(?:[a-z]+:|#|\/\/)/i.test(ref)) return;
  let path = resolve(base, ref.split(/[?#]/)[0]);
  if (path === dist) path = resolve(dist, 'index.html');
  assert(path.startsWith(dist + '/'), `Asset escapes distribution: ${ref}`);
  assert(existsSync(path) && statSync(path).size > 0, `Missing or empty asset: ${ref}`);
  checked.add(path);
}
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) check(match[1]);
for (const match of app.matchAll(/["'](\.\/[A-Za-z0-9_./-]+\.(?:png|svg|webp|jpg|js))["']/g)) check(match[1]);
for (const icon of manifest.icons) check(icon.src);
const precache = sw.match(/const PRECACHE = (\[[\s\S]*?\]);/);
assert(precache, 'Offline precache list is missing');
for (const match of precache[1].matchAll(/'([^']+)'/g)) check(match[1]);
assert(html.includes('src="./assets/app.js"'), 'Application module is not linked');
assert(!html.includes('ee.bootstrap()'), 'Bundled application must be external to HTML');
assert(app.includes('ACCOUNT_KEY:"auth.account"'), 'Original account handling missing');
assert(app.includes('PUBLIC_KEY_B64U:'), 'Original Pro verification missing');
function checkNoQa(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    assert(!entry.name.startsWith('__qa'), `QA fixture must not be published: ${entry.name}`);
    if (entry.isDirectory()) checkNoQa(resolve(path, entry.name));
  }
}
checkNoQa(dist);
const brandCss = readFileSync(resolve(dist, 'assets/klasama.css'), 'utf8');
for (const match of brandCss.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) check(match[1], resolve(dist, 'assets'));
assert(manifest.name === 'Klasama' && manifest.short_name === 'Klasama');
assert(html.includes('Katuwang mo sa bawat klase.'));
assert(app.includes('APP_NAME:"Klasama"'));
assert(app.includes('DB_NAME:"DepEdTeacherToolkitDB",DB_VERSION:17'));
assert(app.includes('t.encode("KlazAssistRecovery|"+a)'));
assert(app.includes('LS_KEY_NAME:"klazassist.sec.v1"'));
assert(app.includes('a[0]!=="KLASAMA1"'));
assert((app.match(/\[Qe\.APP_NAME,"KlazAssist"\]\.includes\(/g) || []).length === 4);
assert(!/SIMPLIFY TEACHING|EMPOWER LEARNING/i.test(html + app));
assert(!html.includes('pydjianPH'), 'Original software credits belong in About');
assert(app.includes('["Almara Creatives","Alvic M. Ramirez"].includes(p.issuer)') && app.includes('product!=="Klasama"')); 
for (const size of [192, 512]) {
  const icon = readFileSync(resolve(dist, `assets/klasama-current-${size}.png`));
  assert(icon.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
}

for (const file of ['assets/app.js', 'sw.js']) execFileSync(process.execPath, ['--check', resolve(dist, file)]);
console.log(`PASS: application and service worker syntax, ${checked.size} local assets, offline precache, Klasama branding, legacy data/recovery compatibility, Pro verification, and no QA fixtures.`);
