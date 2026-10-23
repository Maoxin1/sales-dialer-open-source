import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'java-parser';
import xcode from 'xcode';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, passed: Boolean(ok), detail });
  if (!ok) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}
function files(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? files(filename, extension) : filename.endsWith(extension) ? [filename] : [];
  });
}
function unquote(v) { return typeof v === 'string' ? v.replace(/^"|"$/g, '') : v; }
function ref(v) { return unquote(v && typeof v === 'object' && 'value' in v ? v.value : v); }

for (const filename of files(path.join(root, 'prototypes/android/app/src/main/java'), '.java')) {
  parse(fs.readFileSync(filename, 'utf8'));
  check('java_grammar_parse', true, { file: path.relative(root, filename), parser: 'java-parser@3.0.1', scope: 'grammar only; no Android type checking' });
}
const ios = path.join(root, 'prototypes/ios');
const project = xcode.project(path.join(ios, 'DialerProbe.xcodeproj/project.pbxproj'));
project.parseSync();
const parsed = project.hash.project;
const objects = parsed.objects;
const model = JSON.parse(fs.readFileSync(path.join(ios, 'project-model.json'), 'utf8'));
check('xcode_project_parse', Boolean(objects[ref(parsed.rootObject)]), { parser: 'xcode@3.0.1', scope: 'OpenStep project syntax, not Xcode build' });
check('xcode_object_count', Object.keys(objects).length === Object.keys(model.objects).length, { objects: Object.keys(objects).length });
for (const [id, expected] of Object.entries(model.objects)) {
  const actual = objects[id];
  check('xcode_object_type', actual && ref(actual.isa) === expected.isa, { id, expected: expected.isa });
  for (const field of ['children', 'files', 'buildPhases', 'buildConfigurations', 'targets']) {
    if (field in expected) check('xcode_references_resolve', Array.isArray(actual[field]) && actual[field].every(item => objects[ref(item)]), { id, field });
  }
  for (const field of ['fileRef', 'buildConfigurationList', 'productReference', 'mainGroup', 'productRefGroup']) {
    if (field in expected) check('xcode_reference_resolves', Boolean(objects[ref(actual[field])]), { id, field });
  }
  if (expected.isa === 'PBXFileReference' && expected.sourceTree === '<group>') {
    check('xcode_source_file_exists', fs.existsSync(path.join(ios, 'DialerProbe', ref(actual.path))), { file: ref(actual.path) });
  }
}

// This detects delimiter/string/comment mistakes. It is deliberately not called a Swift parser.
function swiftLexicalBalance(source) {
  const stack = [];
  let state = 'code', commentDepth = 0;
  const pairs = { ')': '(', ']': '[', '}': '{' };
  for (let i = 0; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (state === 'line') { if (c === '\n') state = 'code'; continue; }
    if (state === 'block') {
      if (c === '/' && next === '*') { commentDepth++; i++; }
      else if (c === '*' && next === '/') { commentDepth--; i++; if (!commentDepth) state = 'code'; }
      continue;
    }
    if (state === 'string') { if (c === '\\') i++; else if (c === '"') state = 'code'; continue; }
    if (c === '/' && next === '/') { state = 'line'; i++; continue; }
    if (c === '/' && next === '*') { state = 'block'; commentDepth = 1; i++; continue; }
    if (c === '"') { state = 'string'; continue; }
    if ('([{'.includes(c)) stack.push(c);
    if (c in pairs && stack.pop() !== pairs[c]) return false;
  }
  return stack.length === 0 && !['string', 'block'].includes(state);
}
for (const filename of files(path.join(ios, 'DialerProbe'), '.swift')) {
  check('swift_lexical_balance_only', swiftLexicalBalance(fs.readFileSync(filename, 'utf8')), { file: path.relative(root, filename), scope: 'delimiter/string/comment balance; Swift grammar and framework types NOT checked' });
}
const provenance = JSON.parse(fs.readFileSync(path.join(root, 'evidence/step-2/wrapper-provenance.json'), 'utf8'));
const jar = fs.readFileSync(path.join(root, 'prototypes/android/gradle/wrapper/gradle-wrapper.jar'));
const jarHash = crypto.createHash('sha256').update(jar).digest('hex');
check('gradle_wrapper_official_checksum', jarHash === provenance.official_checksums['wrapper.jar'].sha256, { sha256: jarHash });
const report = { checkedAt: new Date().toISOString(), node: process.version, passed: true, checks,
  scope: 'Static source/project checks only', excluded: ['Java/Android type checking and APK build', 'Swift grammar/type checking and iOS build', 'Device behavior, actual calls, caller ID and reliability'] };
const evidencePath = path.join(process.env.DIALER_EVIDENCE_DIR || path.join(root, 'evidence/step-2'), 'static-source-checks.json');
fs.writeFileSync(evidencePath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, checks: checks.length, javaFiles: 3, swiftFiles: 3, evidence: path.relative(root, evidencePath), excluded: report.excluded }, null, 2));
