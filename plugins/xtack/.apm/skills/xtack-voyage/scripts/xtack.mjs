#!/usr/bin/env node
// Deterministic, local assistance for goal-directed work. It does not authenticate
// externally supplied JSON, invoke host agent tools, or grant any permission.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const VERSION = 'xtack-core-v2';
const LEDGER_VERSION = 'xtack-ledger-v2';
const RECEIPT = 'xtack-run-v1';
const SNAPSHOT_ALGORITHM = 'xtack-snapshot-v4';
const BUDGET_PRECISION = 'xtack-budget-precision-v1';
const CI_ID_PRECISION = 'xtack-ci-id-precision-v2';
const CI_ID_PRECISION_V1 = 'xtack-ci-id-precision-v1';
const RECEIPT_PRECISION = 'xtack-receipt-precision-v1';
// The full original input can be retained separately; bound metadata size so
// an oversized numeric token is not duplicated in a returned ledger.
const MAX_CI_ID_SOURCE_CHARS = 4096;
// Node clamps larger delays to 1 ms, which could terminate a long command immediately.
const MAX_TIMEOUT_MS = 2_147_483_647;
let numberSources = new WeakMap();
let receiptSources = new WeakMap();
const receiptClaims = new WeakMap();
const budgetClaims = new WeakMap();
const ciIdClaims = new WeakMap();
const CRITICAL_FACTORS = new Set(['access-control', 'payments', 'destructive-migration', 'durable-data-integrity']);
const FACTORS = new Set([...CRITICAL_FACTORS, 'ordinary-change', 'operational-impact', 'uncertainty', 'reversible']);
const KINDS = ['bugfix', 'feature', 'refactor', 'investigate'];
const RISKS = ['light', 'standard', 'critical', 'unknown'];
const PLAYBOOKS = {
  bugfix: ['trace', 'forge', 'survey', 'trial'],
  feature: ['keel-if-needed', 'forge', 'survey', 'trial'],
  refactor: ['trace-if-needed', 'forge', 'survey', 'trial'],
  investigate: ['trace', 'trial-if-needed', 'wake-if-needed'],
};

function fail(message) { throw new Error(message); }
function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
  return value;
}
function nonempty(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be a nonempty string`);
  return value;
}
function oneOf(value, choices, name) {
  if (!choices.includes(value)) fail(`${name} must be one of: ${choices.join(', ')}`);
  return value;
}
function list(value, name) {
  if (!Array.isArray(value)) fail(`${name} must be an array`);
  return value;
}
function wellFormedUnicode(value) {
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

// Compare decimal spellings mathematically without constructing huge powers
// of ten. The input is already valid JSON and bounded by the CLI input limit.
function decimalParts(text) {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!match) return null;
  const fraction = match[3] || '';
  const allDigits = match[2] + fraction;
  let first = 0, last = allDigits.length;
  while (first < last && allDigits[first] === '0') first++;
  if (first === last) return { sign: '', digits: '0', exponent: 0 };
  while (last > first && allDigits[last - 1] === '0') last--;
  const trimmed = allDigits.slice(first, last);
  let exponentText = match[4] || '0';
  const negativeExponent = exponentText[0] === '-';
  if (exponentText[0] === '+' || negativeExponent) exponentText = exponentText.slice(1);
  exponentText = exponentText.replace(/^0+/, '') || '0';
  // A nonzero finite Number cannot have a useful exponent beyond the input
  // size plus the floating-point range. Avoid parsing arbitrarily long digits.
  if (exponentText.length > 9) return null;
  let exponent = Number(exponentText);
  if (negativeExponent) exponent = -exponent;
  return { sign: match[1], digits: trimmed,
    exponent: exponent - fraction.length + allDigits.length - last };
}
function decimalMatchesNumber(source, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  const supplied = decimalParts(source), emitted = decimalParts(String(value));
  return supplied !== null && emitted !== null && supplied.sign === emitted.sign &&
    supplied.digits === emitted.digits && supplied.exponent === emitted.exponent;
}
function numericSourceIsExact(parent, key) {
  const value = parent?.[key];
  const source = numberSources.get(parent)?.get(key);
  if (typeof source !== 'string') return false;
  return decimalMatchesNumber(source, value);
}
function receiptBinding(receipt, status, location) {
  try {
    const serialized = JSON.stringify(receipt);
    if (typeof serialized !== 'string') return null;
    const digest = crypto.createHash('sha256').update(serialized).digest('hex');
    return fingerprint({ version: RECEIPT_PRECISION, status, location, receipt_digest: digest });
  } catch { return null; }
}
function prepareReceiptClaim(receipt, location, carrying, prior, inherited = false) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return;
  const verifiedBinding = receiptBinding(receipt, 'verified', location);
  const priorExact = !carrying || inherited || (prior && typeof prior === 'object' && !Array.isArray(prior) &&
    prior.version === RECEIPT_PRECISION && prior.status === 'verified' && prior.binding === verifiedBinding);
  const status = receiptSources.get(receipt) === true && priorExact && verifiedBinding !== null ? 'verified' : 'unverified';
  const binding = receiptBinding(receipt, status, location) ?? fingerprint({ version: RECEIPT_PRECISION, status, location, receipt_digest: null });
  receiptClaims.set(receipt, { version: RECEIPT_PRECISION, status, binding });
}
function preciseReceipt(receipt) { return !!receipt && receiptClaims.get(receipt)?.status === 'verified'; }
function budgetBinding(kind, limit, status) {
  const usage = limit.usage && typeof limit.usage === 'object' && !Array.isArray(limit.usage) ? limit.usage : {};
  return fingerprint({ version: BUDGET_PRECISION, status, kind, max: limit.max,
    has_usage_value: Object.hasOwn(usage, 'value'),
    usage_value: typeof usage.value === 'number' && Number.isFinite(usage.value) ? usage.value : null,
    currency: kind === 'cost' ? limit.currency : null });
}
function fingerprints(intent) {
  // Omitted `required` has the same meaning as true; retain all other fields.
  const criteria = intent.criteria.map(c => ({ ...c, required: c.required !== false }));
  // The v2 domains prevent previously rounded v1 declarations from being
  // accepted as fresh evidence, even when their original number became null.
  return { algorithm: 'sha256-canonical-json-v2',
    intent: fingerprint({ version:'xtack-intent-v2', value:{ ...intent, criteria } }),
    criteria: Object.fromEntries(criteria.map(c => [c.id, fingerprint({ version:'xtack-criterion-v2', value:c })])) };
}
function intentOf(value) {
  const i = object(value, 'intent');
  nonempty(i.objective, 'intent.objective');
  object(i.scope, 'intent.scope');
  const included = list(i.scope.included, 'intent.scope.included');
  if (!included.length) fail('intent.scope.included must not be empty');
  for (const item of included) nonempty(item, 'included scope');
  for (const item of list(i.scope.excluded, 'intent.scope.excluded')) nonempty(item, 'excluded scope');
  for (const item of list(i.constraints, 'intent.constraints')) nonempty(item, 'constraint');
  for (const term of list(i.domain_terms, 'intent.domain_terms')) { object(term, 'domain term'); nonempty(term.term, 'domain term'); nonempty(term.meaning, 'domain meaning'); }
  oneOf(i.kind, KINDS, 'intent.kind');
  oneOf(i.risk, RISKS, 'intent.risk');
  nonempty(i.risk_reason, 'intent.risk_reason');
  const criteria = list(i.criteria, 'intent.criteria');
  if (!criteria.length) fail('intent.criteria must not be empty');
  const ids = new Set();
  for (const criterion of criteria) {
    object(criterion, 'criterion');
    const id = nonempty(criterion.id, 'criterion.id');
    nonempty(criterion.description, 'criterion.description');
    if (criterion.required !== undefined && typeof criterion.required !== 'boolean') fail('criterion.required must be boolean');
    if (ids.has(id)) fail(`duplicate criterion.id: ${id}`);
    ids.add(id);
  }
  if (!criteria.some(c => c.required !== false)) fail('at least one criterion must be required');
  return i;
}
function checkLedgerVersion(input) {
  if (typeof input.version === 'string' && input.version.startsWith('xtack-ledger-') && input.version !== LEDGER_VERSION)
    fail('unsupported ledger version');
}
function route(input, importedLedger = input?.version === LEDGER_VERSION) {
  object(input, 'input');
  checkLedgerVersion(input);
  const intent = intentOf(input.intent);
  const factors = input.risk_factors === undefined ? [] : list(input.risk_factors, 'risk_factors');
  for (const f of factors) nonempty(f, 'risk factor');
  const unknown_factors = factors.filter(f => !FACTORS.has(f));
  let risk = intent.risk;
  if (factors.some(f => CRITICAL_FACTORS.has(f))) risk = 'critical';
  if (factors.includes('ordinary-change') && risk === 'light') risk = 'standard';
  const change = intent.kind !== 'investigate';
  const identity = fingerprints(intent);
  // A review is about the declared risks as well as the current intent.
  const reviewContext = fingerprint({ version: 'xtack-review-context-v1', intent_fingerprint: identity.intent,
    risk, risk_factors: [...new Set(factors)].sort() });
  return {
    version: VERSION, kind: intent.kind, risk, declared_risk: intent.risk,
    fingerprints: { ...identity, review_context_algorithm: 'sha256-xtack-review-context-v1', review_context: reviewContext },
    risk_reason: intent.risk_reason, risk_factors: factors, unknown_factors,
    playbook: PLAYBOOKS[intent.kind],
    requirements: { independent_review: change && risk !== 'light', execution: change,
      risk_specific_checks: change && risk === 'critical' },
    limits: budgetAssessment(input.limits, importedLedger),
    limitations: [
      'Risk classification uses the supplied intent and factors; it does not discover undisclosed risk.',
      'Playbook entries are candidate specialists, not mandatory calls; apply requirements and use only methods the task needs.',
    ],
  };
}

function inside(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`));
}
function pathParts(item) {
  return item.split(process.platform === 'win32' ? /[\\/]/ : /\//);
}
function pathSyntaxIssue(item) {
  if (!wellFormedUnicode(item)) return 'target path contains an unpaired UTF-16 surrogate';
  if (path.isAbsolute(item) || item.includes('\0') || (process.platform === 'win32' && /^[A-Za-z]:/.test(item)))
    return 'target paths must be relative';
  let depth = 0;
  for (const part of pathParts(item)) {
    if (!part || part === '.') continue;
    if (part === '.git') return 'target paths must not include .git';
    if (part === '..') {
      if (!depth) return 'target path escapes root';
      depth--;
    } else depth++;
  }
  return null;
}
function pathTraversalIssue(root, item, allowMissingTail = false) {
  const parts = pathParts(item);
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || part === '.') continue;
    // Preserve the supplied component order; path.join would erase symlink/..
    // before the filesystem could identify the symlink.
    current += (current.endsWith(path.sep) ? '' : path.sep) + part;
    try {
      const st = fs.lstatSync(current);
      if (st.isSymbolicLink()) return 'symbolic link in path';
      if (i < parts.length - 1 && !st.isDirectory()) return 'non-directory in path';
    } catch (err) {
      // Unit coverage can name a deleted path. A later `..` would erase the
      // missing component, so that spelling remains unverified.
      if (allowMissingTail && err.code === 'ENOENT' && !parts.slice(i + 1).includes('..')) return null;
      return err.code || err.message;
    }
  }
  return null;
}
function realpathUTF8(value, name) {
  const bytes = fs.realpathSync.native(value, {encoding:'buffer'});
  try { return new TextDecoder('utf-8', {fatal:true, ignoreBOM:true}).decode(bytes); }
  catch { fail(`${name} resolves to a path that is not valid UTF-8`); }
}
function targetSpec(value) {
  const t = object(value, 'target');
  const suppliedRoot = nonempty(t.root, 'target.root');
  if (!wellFormedUnicode(suppliedRoot)) fail('target.root contains an unpaired UTF-16 surrogate');
  const root = realpathUTF8(suppliedRoot, 'target.root');
  if (!fs.statSync(root).isDirectory()) fail('target.root must be a directory');
  const items = list(t.paths, 'target.paths');
  if (!items.length) fail('target.paths must contain at least one explicit path');
  const paths = [...new Set(items.map(item => {
    nonempty(item, 'target path');
    const issue = pathSyntaxIssue(item);
    if (issue) fail(issue);
    return item;
  }))].sort();
  return { root, paths };
}

function snapshot(target) {
  const t = targetSpec(target);
  const hash = crypto.createHash('sha256');
  hash.update(`${SNAPSHOT_ALGORITHM}\0`);
  const issues = [];
  let files = 0;
  const visited = new Set();
  const add = value => hash.update(`${JSON.stringify(value)}\n`);
  function visit(rel) {
    const normalized = path.normalize(rel);
    if (visited.has(normalized)) return;
    visited.add(normalized);
    const absolute = path.resolve(t.root, normalized);
    if (!inside(t.root, absolute)) { issues.push(`${normalized}: outside root`); return; }
    try {
      const st = fs.lstatSync(absolute);
      if (st.isSymbolicLink()) { issues.push(`${normalized}: symbolic link not followed`); add([normalized, 'symlink']); return; }
      const actual = realpathUTF8(absolute, 'target path');
      if (!inside(t.root, actual) || actual !== absolute) { issues.push(`${normalized}: path resolves through a symbolic link`); return; }
      if (st.isDirectory()) {
        const before = fs.readdirSync(absolute, {encoding:'buffer'}).sort(Buffer.compare);
        add([normalized, 'directory', st.mode & 0o7777]);
        const names = [], decoder = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true});
        for (const bytes of before) {
          try { names.push(decoder.decode(bytes)); }
          catch { issues.push(`${normalized}: directory entry is not valid UTF-8 (hex ${bytes.toString('hex')})`); }
        }
        for (const name of names.sort()) {
          if (name === '.git') continue; // Repository metadata is not product content.
          visit(path.join(normalized, name));
        }
        const after = fs.readdirSync(absolute, {encoding:'buffer'}).sort(Buffer.compare);
        const end = fs.lstatSync(absolute);
        if (before.length !== after.length || before.some((entry, index) => !entry.equals(after[index])) || st.mtimeMs !== end.mtimeMs || st.ctimeMs !== end.ctimeMs ||
            st.ino !== end.ino || st.dev !== end.dev || !end.isDirectory() || (st.mode & 0o7777) !== (end.mode & 0o7777))
          issues.push(`${normalized}: directory changed during snapshot`);
      } else if (st.isFile()) {
        // A regular file can be replaced after lstat. On platforms supporting
        // these flags, avoid following a final symlink or blocking on a FIFO
        // before fstat can reject the replacement. This is not path isolation.
        const flags = fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0) | (fs.constants.O_NOFOLLOW || 0);
        const fd = fs.openSync(absolute, flags);
        try {
          const first = fs.fstatSync(fd);
          if (first.ino !== st.ino || first.dev !== st.dev || !first.isFile() || (first.mode & 0o7777) !== (st.mode & 0o7777)) { issues.push(`${normalized}: file replaced or mode changed during snapshot`); return; }
          add([normalized, 'file', first.mode & 0o7777, first.size]);
          const buf = Buffer.allocUnsafe(64 * 1024);
          let remaining = first.size;
          while (remaining > 0) {
            const n = fs.readSync(fd, buf, 0, Math.min(buf.length, remaining), null);
            if (!n) { issues.push(`${normalized}: shortened during snapshot`); break; }
            hash.update(buf.subarray(0, n)); remaining -= n;
          }
          const last = fs.fstatSync(fd);
          const current = fs.lstatSync(absolute);
          if (first.size !== last.size || first.mtimeMs !== last.mtimeMs || first.ctimeMs !== last.ctimeMs ||
              (first.mode & 0o7777) !== (last.mode & 0o7777) || current.ino !== first.ino || current.dev !== first.dev ||
              !current.isFile() || (first.mode & 0o7777) !== (current.mode & 0o7777))
            issues.push(`${normalized}: file changed during snapshot`);
          files++;
        } finally { fs.closeSync(fd); }
      } else { add([normalized, 'unsupported']); issues.push(`${normalized}: unsupported file type`); }
    } catch (err) { issues.push(`${normalized}: ${err.code || err.message}`); }
  }
  for (const item of t.paths) {
    const issue = pathTraversalIssue(t.root, item);
    if (issue) issues.push(`${item}: ${issue}`);
    else visit(item);
  }
  return { root: t.root, paths: t.paths, snapshot_algorithm: SNAPSHOT_ALGORITHM, digest: hash.digest('hex'), complete: issues.length === 0, files, issues,
    exclusions: ['.git metadata'], limitations: ['Only declared paths are covered; external inputs and transient changes are not proven.',
      'Ownership, ACLs, extended attributes and file capabilities are not covered; mode semantics vary by platform.'] };
}
function identitiesMatch(a, b) {
  return Boolean(a?.complete === true && b?.complete === true && a.snapshot_algorithm === SNAPSHOT_ALGORITHM && b.snapshot_algorithm === SNAPSHOT_ALGORITHM &&
    a.root === b.root && JSON.stringify(a.paths) === JSON.stringify(b.paths) && a.digest === b.digest);
}
function stableReceipt(receipt, current) {
  return Boolean(receipt && receipt.version === RECEIPT && ['success', 'failed', 'timed_out', 'signalled', 'spawn_error'].includes(receipt.status) &&
    Array.isArray(receipt.argv) && receipt.argv.length && nonemptyString(receipt.argv[0]) && receipt.argv.every(arg => typeof arg === 'string') &&
    nonemptyString(receipt.cwd) && wellFormedUnicode(receipt.cwd) && path.isAbsolute(receipt.cwd) && inside(current.root, receipt.cwd) &&
    nonemptyString(receipt.started_at) && nonemptyString(receipt.ended_at) && Number.isFinite(Date.parse(receipt.started_at)) && Number.isFinite(Date.parse(receipt.ended_at)) && Date.parse(receipt.started_at) <= Date.parse(receipt.ended_at) &&
    Number.isFinite(receipt.duration_ms) && receipt.duration_ms >= 0 && Number.isInteger(receipt.timeout_ms) && receipt.timeout_ms >= 1 && receipt.timeout_ms <= MAX_TIMEOUT_MS &&
    receipt.environment && nonemptyString(receipt.environment.platform) && nonemptyString(receipt.environment.arch) && nonemptyString(receipt.environment.node) &&
    receipt.stdout && Number.isInteger(receipt.stdout.bytes) && receipt.stdout.bytes >= 0 && receipt.stderr && Number.isInteger(receipt.stderr.bytes) && receipt.stderr.bytes >= 0 && receipt.target_unchanged === true &&
    identitiesMatch(receipt.target_before, receipt.target_after));
}
function groupObservationEligible(receipt) {
  // Older v1 receipts have no group observation. A supplied observation is
  // never proof of isolation, but an observed or unknown remaining group must
  // not be used as a successful execution for the gate.
  const group = receipt?.process_group_observation;
  return !receipt || !Object.hasOwn(receipt, 'process_group_observation') ||
    (group && typeof group === 'object' && !Array.isArray(group) &&
      (receipt.environment?.platform === 'win32' ? group.status === 'unsupported' : group.status === 'absent'));
}
function successfulReceipt(receipt, current) {
  return Boolean(preciseReceipt(receipt) && stableReceipt(receipt, current) && receipt.status === 'success' && receipt.exit_code === 0 && receipt.signal === null &&
    receipt.error === null && groupObservationEligible(receipt) && identitiesMatch(receipt.target_after, current));
}
function positiveReceipt(receipt, current) {
  return successfulReceipt(receipt, current) && receipt.argv.every(wellFormedUnicode);
}
function impossibleCompleteOutput(receipt) {
  // UTF-8 replacement can make decoded text longer than the original bytes,
  // including for invalid binary. It cannot make a complete capture shorter.
  // This narrow test does not authenticate output or cover truncation.
  return ['stdout', 'stderr'].some(key => {
    const output = receipt?.[key];
    return output && typeof output.text === 'string' && output.truncated === false &&
      Number.isInteger(output.bytes) && output.bytes >= 0 && Buffer.byteLength(output.text, 'utf8') < output.bytes;
  });
}
function identityStatus(identity, current) {
  if (!current.complete || current.snapshot_algorithm !== SNAPSHOT_ALGORITHM || !identity || identity.snapshot_algorithm !== SNAPSHOT_ALGORITHM ||
      identity.complete !== true || identity.root !== current.root || !Array.isArray(identity.paths) ||
      JSON.stringify(identity.paths) !== JSON.stringify(current.paths) || !/^[0-9a-f]{64}$/.test(identity.digest || '')) return 'unknown';
  return identity.digest === current.digest ? 'current' : 'stale';
}
function evidenceTargetStatus(item, current) {
  let identity;
  if (item.receipt) {
    if (!stableReceipt(item.receipt, current)) return 'unknown';
    identity = item.receipt.target_after;
  } else {
    identity = item.target_identity;
  }
  return identityStatus(identity, current);
}

function limitOutput(limit) {
  let count = 0, chunks = [], total = 0;
  return {
    append(chunk) { total += chunk.length; if (count < limit) { const slice = chunk.subarray(0, limit - count); chunks.push(slice); count += slice.length; } },
    result() { return { bytes: total, ...(limit ? { text: Buffer.concat(chunks).toString('utf8'), truncated: total > count } : {}) }; },
  };
}
function prepareRun(input) {
  object(input, 'input');
  const target = targetSpec(input.target);
  const suppliedCwd = nonempty(input.cwd, 'cwd');
  if (!wellFormedUnicode(suppliedCwd)) fail('cwd contains an unpaired UTF-16 surrogate');
  const cwd = realpathUTF8(suppliedCwd, 'cwd');
  if (!inside(target.root, cwd)) fail('cwd must be inside target.root');
  const argv = list(input.argv, 'argv');
  if (!argv.length || argv.some(x => typeof x !== 'string' || x.includes('\0')) || !nonemptyString(argv[0])) fail('argv must contain a nonempty executable and string arguments');
  if (!argv.every(wellFormedUnicode)) fail('argv must not contain unpaired UTF-16 surrogates');
  const timeout = input.timeout_ms;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > MAX_TIMEOUT_MS) fail(`timeout_ms must be an integer from 1 through ${MAX_TIMEOUT_MS}`);
  const limit = input.output_limit_bytes ?? 0;
  if (!Number.isInteger(limit) || limit < 0 || limit > 65536) fail('output_limit_bytes must be an integer from 0 through 65536');
  return { target, cwd, argv, timeout, limit };
}
async function run(input, prepared = prepareRun(input)) {
  const { target, cwd, argv, timeout, limit } = prepared;
  const before = snapshot(target);
  const started_at = new Date().toISOString();
  const started = performance.now();
  const stdout = limitOutput(limit), stderr = limitOutput(limit);
  let spawnError = null, runtimeError = null, timedOut = false, launched = false, observedExit = false;
  let signaling = false, signalError = null;
  const cleanupAttempts = [];
  const result = await new Promise(resolve => {
    const detached = process.platform !== 'win32';
    let proc;
    try { proc = spawn(argv[0], argv.slice(1), { cwd, shell: false, detached, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (error) { spawnError = error.code || error.message; resolve({ code: null, signal: null, error: spawnError,
      process_group_observation: { status: detached ? 'unknown' : 'unsupported' } }); return; }
    proc.stdout.on('data', chunk => stdout.append(chunk));
    proc.stderr.on('data', chunk => stderr.append(chunk));
    proc.on('spawn', () => { launched = true; });
    proc.on('error', err => {
      if (launched && signaling) signalError ||= err.code || err.message;
      else if (launched) runtimeError ||= err.code || err.message;
      else spawnError ||= err.code || err.message;
    });
    let force, settled = false, exited = { code: null, signal: null };
    proc.on('exit', (code, signal) => { observedExit = true; exited = { code, signal }; });
    const finish = (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (force) clearTimeout(force);
      let groupStatus = detached ? 'unknown' : 'unsupported';
      if (detached && launched && Number.isInteger(proc.pid) && proc.pid > 0) {
        // Signal zero only observes a numeric group; a reused group or zombie
        // can also appear present. No termination signal is sent here.
        try { process.kill(-proc.pid, 0); groupStatus = 'present_or_reused'; }
        catch (error) { if (error.code === 'ESRCH') groupStatus = 'absent'; }
      }
      resolve({ code, signal, error: spawnError || runtimeError, process_group_observation: { status: groupStatus } });
    };
    const terminate = signal => {
      // Node may have reaped a leader while descendants still hold pipes.
      // A numeric process group can then have been reused; never signal it
      // after exit has been observed. This check is not an atomic OS handle.
      if (!launched || observedExit || proc.exitCode !== null || proc.signalCode !== null) {
        cleanupAttempts.push({ signal, outcome: 'skipped', reason: launched ? 'leader_exit_observed' : 'launch_not_observed' });
        return;
      }
      try {
        signaling = true; signalError = null;
        if (detached && proc.pid) process.kill(-proc.pid, signal);
        else if (!proc.kill(signal)) {
          cleanupAttempts.push(signalError ? { signal, outcome: 'failed', error: signalError } : { signal, outcome: 'not_found' });
          return;
        }
        cleanupAttempts.push({ signal, outcome: 'sent' });
      } catch (e) {
        cleanupAttempts.push(e.code === 'ESRCH' ? { signal, outcome: 'not_found' } :
          { signal, outcome: 'failed', error: e.code || e.message });
      } finally { signaling = false; signalError = null; }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate('SIGTERM');
      force = setTimeout(() => {
        terminate('SIGKILL');
        // Descendants can escape the process group and retain inherited pipes.
        // Do not wait forever for their descriptors or claim they were killed.
        proc.stdout.destroy(); proc.stderr.destroy(); proc.unref();
        finish(exited.code, exited.signal);
      }, 250);
    }, timeout);
    proc.on('close', (code, signal) => {
      if (timedOut && !cleanupAttempts.some(attempt => attempt.signal === 'SIGKILL'))
        cleanupAttempts.push({ signal: 'SIGKILL', outcome: 'skipped', reason: 'leader_closed_before_escalation' });
      finish(code, signal);
    });
  });
  const after = snapshot(target);
  const status = timedOut && launched ? 'timed_out' : spawnError ? 'spawn_error' : result.error ? 'failed' : result.signal ? 'signalled' : result.code === 0 ? 'success' : 'failed';
  return { version: RECEIPT, argv, cwd, started_at, ended_at: new Date().toISOString(), duration_ms: Math.round(performance.now() - started),
    environment: { platform: process.platform, arch: process.arch, node: process.version },
    status, exit_code: result.code, signal: result.signal, error: result.error, timeout_ms: timeout,
    process_group_observation: result.process_group_observation,
    ...(timedOut ? { cleanup: { status: 'unverified', scope: process.platform === 'win32' ? 'direct_child' : 'process_group', attempts: cleanupAttempts } } : {}),
    stdout: stdout.result(), stderr: stderr.result(), target_before: before, target_after: after,
    target_unchanged: identitiesMatch(before, after),
    limitations: ['This records execution, not whether an acceptance criterion is satisfied.', 'The JSON can be edited and is not a tamper-proof host attestation.', 'Timeout handling is bounded but cannot guarantee termination of same-group or escaped descendants; they may change the target after the final snapshot. Numeric group signaling is not race-free.'] };
}

function nonemptyString(v) { return typeof v === 'string' && !!v.trim(); }
function disclosedDetail(v) {
  return nonemptyString(v) && !/^(?:unknown|unverified|not known|not verified|not available|n\/a)$/i.test(v.trim());
}
function budgetAssessment(limits, importedLedger = false) {
  if (limits === undefined) return { status: 'not_requested', items: [] };
  object(limits, 'limits');
  const keys = Object.keys(limits);
  if (!keys.length) return { status: 'not_requested', items: [] };
  const allowed = ['time_ms', 'tokens', 'cost', 'retries'];
  const claims = {};
  const items = keys.map(key => {
    if (!allowed.includes(key)) fail(`unknown limit: ${key}`);
    const value = object(limits[key], `limits.${key}`);
    if (typeof value.max !== 'number' || !Number.isFinite(value.max) || value.max < 0 || (key !== 'cost' && !Number.isInteger(value.max))) fail(`limits.${key}.max must be a nonnegative ${key === 'cost' ? 'number' : 'integer'}`);
    if (key === 'cost' && !nonemptyString(value.currency)) fail('limits.cost.currency is required');
    const usage = value.usage;
    const recorded = value.xtack_precision;
    const incomingExact = numericSourceIsExact(value, 'max') && numericSourceIsExact(usage, 'value');
    // A carried claim is relevant even in a direct request: copying rounded
    // values out of a ledger must not silently upgrade an unverified claim.
    const carryingClaim = importedLedger || Object.hasOwn(value, 'xtack_precision');
    const priorExact = !carryingClaim || (recorded && typeof recorded === 'object' && !Array.isArray(recorded) &&
      recorded.version === BUDGET_PRECISION && recorded.status === 'verified' && recorded.binding === budgetBinding(key, value, 'verified'));
    const exact = incomingExact && priorExact;
    const precisionStatus = exact ? 'verified' : 'unverified';
    claims[key] = { version: BUDGET_PRECISION, status: precisionStatus, binding: budgetBinding(key, value, precisionStatus) };
    if (!usage || typeof usage !== 'object' || typeof usage.value !== 'number' || !Number.isFinite(usage.value) || usage.value < 0 || (key !== 'cost' && !Number.isInteger(usage.value)) ||
        !['host', 'tool', 'ledger'].includes(usage.source?.kind) || !disclosedDetail(usage.source?.reference))
      return { kind: key, status: 'unverified', max: value.max, reason: 'Current usage or its observable source is unavailable.' };
    if (key === 'cost' && (!disclosedDetail(value.currency) ||
        (Object.hasOwn(usage, 'currency') && (!disclosedDetail(usage.currency) || usage.currency !== value.currency))))
      return { kind: key, status: 'unverified', max: value.max, reason: 'Cost currency is undisclosed or usage currency does not match.' };
    if (!exact)
      return { kind: key, status: 'unverified', max: value.max, reason: 'Budget number precision or its recorded claim is unverified.' };
    return { kind: key, status: usage.value >= value.max ? 'exhausted' : 'within', exceeded: usage.value > value.max, max: value.max, used: usage.value,
      ...(key === 'cost' ? { currency: value.currency } : {}), source: usage.source,
      reason: 'The supplied usage and source are not independently authenticated by this core.' };
  });
  budgetClaims.set(limits, claims);
  const actual = items.filter(x => x.kind !== 'retries');
  const retries = items.find(x => x.kind === 'retries');
  return { status: items.some(x => x.status === 'exhausted') ? 'exhausted' : items.some(x => x.status === 'unverified') ? 'unverified' : 'within', items,
    exceeded: items.some(x => x.exceeded),
    next_actions: {
      further_work: actual.some(x => x.status === 'exhausted') ? 'stop' : actual.some(x => x.status === 'unverified') ? 'unverified' : 'allowed_by_declared_limits',
      retry: actual.some(x => x.status === 'exhausted') || retries?.status === 'exhausted' ? 'stop' : actual.some(x => x.status === 'unverified') || retries?.status === 'unverified' ? 'unverified' : 'allowed_by_declared_limits',
    } };
}
function implementationAssessment(value, intent, target) {
  if (intent.kind === 'investigate' && value === undefined) return { status: 'not_required', units: [] };
  if (value === undefined) return { status: 'unverified', reason: 'Implementation contract is missing.', units: [] };
  object(value, 'implementation');
  const units = list(value.units, 'implementation.units');
  if (!units.length) return { status: 'unverified', reason: 'Implementation has no units.', units: [] };
  const ids = new Set();
  for (const unit of units) {
    object(unit, 'implementation unit');
    const id = nonempty(unit.id, 'unit.id');
    if (ids.has(id)) fail(`duplicate implementation unit: ${id}`);
    ids.add(id); nonempty(unit.outcome, 'unit.outcome');
    for (const field of ['paths', 'affected_boundaries', 'depends_on', 'criterion_ids']) {
      const entries = list(unit[field], `unit.${field}`);
      if (field !== 'depends_on' && !entries.length) fail(`unit.${field} must not be empty`);
      for (const entry of entries) nonempty(entry, `unit.${field} item`);
    }
  }
  const criteria = new Set(intent.criteria.map(c => c.id));
  for (const unit of units) {
    if (unit.depends_on.some(dep => !ids.has(dep) || dep === unit.id)) fail(`unit ${unit.id} has an invalid dependency`);
    if (unit.criterion_ids.some(id => !criteria.has(id))) fail(`unit ${unit.id} refers to an unknown criterion`);
  }
  const active = new Set(), done = new Set();
  const lookup = new Map(units.map(u => [u.id, u]));
  for (const unit of units) {
    if (done.has(unit.id)) continue;
    const stack = [{ id: unit.id, next: 0 }];
    active.add(unit.id);
    while (stack.length) {
      const frame = stack.at(-1);
      const dependencies = lookup.get(frame.id).depends_on;
      if (frame.next === dependencies.length) {
        active.delete(frame.id); done.add(frame.id); stack.pop();
        continue;
      }
      const dependency = dependencies[frame.next++];
      if (active.has(dependency)) fail('implementation dependencies contain a cycle');
      if (!done.has(dependency)) {
        active.add(dependency);
        stack.push({ id: dependency, next: 0 });
      }
    }
  }
  const uncovered = units.flatMap(unit => unit.paths.filter(p => {
    if (pathSyntaxIssue(p)) return true;
    const parts = pathParts(p);
    const needsTraversal = parts.includes('..') || parts.slice(1).includes('.') || parts.at(-1) === '';
    if (needsTraversal && pathTraversalIssue(target.root, p, true)) return true;
    const full = path.resolve(target.root, p);
    // Snapshot traversal excludes every .git entry, including nested ones.
    if (path.relative(target.root, full).split(path.sep).includes('.git')) return true;
    return !target.paths.some(t => {
      const selected = path.resolve(target.root, t);
      if (!inside(selected, full)) return false;
      if (selected === full) return true;
      try { return fs.lstatSync(selected).isDirectory(); }
      catch { return false; }
    });
  }));
  if (uncovered.length) return { status: 'unverified', reason: 'Unit paths are outside the declared verification target.', uncovered, units: units.map(u => u.id) };
  const covered = new Set(units.flatMap(u => u.criterion_ids));
  if (intent.criteria.some(c => c.required !== false && !covered.has(c.id)))
    return { status: 'unverified', reason: 'A required criterion is not connected to an implementation unit.', units: units.map(u => u.id) };
  return { status: 'eligible', reason: 'Declared units, dependencies, target paths, boundaries and criteria are linked; their completeness requires external review.', units: units.map(u => u.id) };
}
function githubRemoteMatches(remote, repo) {
  let host, pathname;
  if (/[\x00-\x20\x7f]/.test(remote)) return false;
  if (remote.startsWith('git@')) {
    const match = /^git@([^:]+):(.+)$/.exec(remote);
    if (!match) return false;
    host = match[1]; pathname = match[2];
  } else {
    try {
      // Git can pass even empty query/fragment delimiters as part of an SSH
      // repository path; URL.search/hash alone cannot detect empty ones.
      if (remote.includes('?') || remote.includes('#')) return false;
      const rawUrl = /^(?:https|ssh):\/\/[^/?#\\]+(\/[^?#\\]*)?$/i.exec(remote);
      if (!rawUrl) return false;
      const parsed = new URL(remote);
      if (!['https:', 'ssh:'].includes(parsed.protocol)) return false;
      // URL normalizes the default HTTPS port to an empty string; SSH is a
      // non-special scheme, so accept its explicit standard port as well.
      if (parsed.port && !(parsed.protocol === 'ssh:' && parsed.port === '22')) return false;
      // Git can send a non-normalized SSH path, while URL.pathname removes
      // dot segments. Compare the original path to the requested repository.
      host = parsed.hostname; pathname = (rawUrl[1] || '').replace(/^\//, '');
    }
    catch { return false; }
  }
  const actual = pathname.replace(/\/+$/, '').replace(/\.git$/, '');
  return host.toLowerCase() === 'github.com' && actual.toLowerCase() === repo.toLowerCase();
}
function githubRunUrlMatches(value, repo, id) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.toLowerCase() === 'github.com' && !url.port && !url.username && !url.password && !url.search && !url.hash &&
      url.pathname.toLowerCase() === `/${repo}/actions/runs/${id}`.toLowerCase();
  } catch { return false; }
}
function gitWorkspaceIssue(opts, root, paths) {
  // Git status can hide modified tracked files when their index entries are
  // marked assume-unchanged or skip-worktree. Scan from the repository top,
  // even when the declared target root is a nested directory. Paths may
  // contain newlines or arbitrary bytes, so parse NUL-delimited bytes.
  const flags = execFileSync('git', ['-C', root, 'ls-files', '-v', '-z', '--full-name', '--', ':/'], { ...opts, encoding: null });
  for (let start = 0; start < flags.length;) {
    const end = flags.indexOf(0, start);
    if (end < 0 || end - start < 3 || flags[start + 1] !== 0x20) fail('invalid Git index flags output');
    const tag = flags[start];
    if (!'HSMRCK?hsmrck'.includes(String.fromCharCode(tag))) fail('unknown Git index flag');
    if (tag === 0x53 || (tag >= 0x61 && tag <= 0x7a))
      return 'A tracked index entry is assume-unchanged or skip-worktree, so workspace equality is unverified.';
    start = end + 1;
  }
  // A commit-level CI run can depend on any tracked or untracked workspace input,
  // not only the specifically declared target. Ignored files are additionally
  // checked in the declared target; ignored inputs outside it remain unknown.
  const all = execFileSync('git', ['-C', root, 'status', '--porcelain=v1', '--untracked-files=all'], opts).trim();
  const ignoredTarget = execFileSync('git', ['--literal-pathspecs', '-C', root, 'status', '--porcelain=v1', '--untracked-files=all', '--ignored=matching', '--', ...paths], opts).trim();
  return all || ignoredTarget ? 'The workspace has tracked or untracked changes, or the declared target has ignored inputs.' : null;
}
function gitRawTargetIssue(opts, target) {
  // Git status compares after clean filters and can report a byte-different
  // worktree as clean. Compare only the declared target to index blob IDs
  // without running filters; the surrounding status checks bind that index to
  // HEAD. This does not prove the bytes used by a remote checkout.
  if (process.platform === 'win32') return 'Git executable mode cannot be established for the target on this platform.';
  const error = 'The declared target cannot be matched to unfiltered committed Git blobs and executable modes.';
  const format = execFileSync('git', ['-C', target.root, 'rev-parse', '--show-object-format'], opts);
  if (format !== 'sha1\n' && format !== 'sha256\n') return error;
  const algorithm = format.slice(0, -1), objectLength = algorithm === 'sha1' ? 40 : 64;
  const topOutput = execFileSync('git', ['-C', target.root, 'rev-parse', '--show-toplevel'], { ...opts, encoding: null });
  if (!topOutput.length || topOutput[topOutput.length - 1] !== 0x0a) return error;
  let top;
  try { top = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(topOutput.subarray(0, -1)); }
  catch { return error; }
  const repoRoot = realpathUTF8(top, 'Git repository root');
  if (!inside(repoRoot, target.root)) return error;
  const paths = target.paths.map(item => path.normalize(item));
  const output = execFileSync('git', ['--literal-pathspecs', '-C', target.root, 'ls-files', '--stage', '--full-name', '-z', '--', ...paths], { ...opts, encoding: null });
  const tracked = new Map(), decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  for (let start = 0; start < output.length;) {
    const end = output.indexOf(0, start), tab = output.indexOf(9, start);
    if (end < 0 || tab < start || tab >= end) return error;
    const header = output.subarray(start, tab).toString('ascii');
    const match = /^(100644|100755) ([0-9a-f]+) 0$/.exec(header);
    if (!match || match[2].length !== objectLength) return error;
    let name;
    try { name = decoder.decode(output.subarray(tab + 1, end)); } catch { return error; }
    if (!name || name.includes('\0') || path.isAbsolute(name)) return error;
    const absolute = path.resolve(repoRoot, name);
    if (!inside(repoRoot, absolute) || !inside(target.root, absolute) || absolute === target.root || tracked.has(absolute)) return error;
    tracked.set(absolute, { mode: match[1], oid: match[2] });
    start = end + 1;
  }
  const visited = new Set(), found = new Set();
  function visit(rel) {
    const absolute = path.resolve(target.root, rel);
    if (!inside(target.root, absolute)) return false;
    if (visited.has(absolute)) return true;
    visited.add(absolute);
    const st = fs.lstatSync(absolute);
    if (st.isSymbolicLink() || realpathUTF8(absolute, 'target path') !== absolute) return false;
    if (st.isDirectory()) {
      const names = fs.readdirSync(absolute, { encoding: 'buffer' });
      let count = 0;
      for (const bytes of names) {
        let name;
        try { name = decoder.decode(bytes); } catch { return false; }
        if (name === '.git') continue;
        count++;
        if (!visit(path.join(rel, name))) return false;
      }
      // Git does not represent empty directories, so a checkout cannot be
      // established to contain one merely from its committed tree.
      return count > 0;
    }
    if (!st.isFile()) return false;
    const entry = tracked.get(absolute);
    if (!entry || Boolean(st.mode & 0o100) !== (entry.mode === '100755')) return false;
    const flags = fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0) | (fs.constants.O_NOFOLLOW || 0);
    const fd = fs.openSync(absolute, flags);
    try {
      const first = fs.fstatSync(fd);
      if (!first.isFile() || first.dev !== st.dev || first.ino !== st.ino || first.mode !== st.mode || !Number.isSafeInteger(first.size)) return false;
      const hash = crypto.createHash(algorithm).update(`blob ${first.size}\0`), buf = Buffer.allocUnsafe(64 * 1024);
      let remaining = first.size;
      while (remaining > 0) {
        const n = fs.readSync(fd, buf, 0, Math.min(buf.length, remaining), null);
        if (!n) return false;
        hash.update(buf.subarray(0, n)); remaining -= n;
      }
      const last = fs.fstatSync(fd), current = fs.lstatSync(absolute);
      if (!current.isFile() || current.ino !== first.ino || current.dev !== first.dev || current.mode !== first.mode ||
          first.size !== last.size || first.mtimeMs !== last.mtimeMs || first.ctimeMs !== last.ctimeMs || first.mode !== last.mode ||
          hash.digest('hex') !== entry.oid) return false;
      found.add(absolute);
      return true;
    } finally { fs.closeSync(fd); }
  }
  for (const item of target.paths) {
    if (pathTraversalIssue(target.root, item) || !visit(path.normalize(item))) return error;
  }
  return found.size === tracked.size ? null : error;
}
function ciIdBinding(ci, status, version = CI_ID_PRECISION, source) {
  const fields = { version, status, repo: typeof ci.repo === 'string' ? ci.repo : null,
    run_id: Number.isFinite(ci.run_id) ? ci.run_id : null };
  if (version === CI_ID_PRECISION) fields.source = source;
  return fingerprint(fields);
}
function validCiIdSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
  const keys = Object.keys(source).sort().join(',');
  if (source.status === 'unavailable') return keys === 'status';
  const hasContext = Object.hasOwn(source, 'context');
  if (hasContext && !['request', 'ledger'].includes(source.context)) return false;
  if (source.status === 'recorded') return keys === (hasContext ? 'context,status,token' : 'status,token') && typeof source.token === 'string' &&
    source.token.length <= MAX_CI_ID_SOURCE_CHARS && /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(source.token);
  if (source.status === 'omitted') return keys === (hasContext ? 'context,length,sha256,status' : 'length,sha256,status') && Number.isSafeInteger(source.length) &&
    source.length > MAX_CI_ID_SOURCE_CHARS && typeof source.sha256 === 'string' && /^[0-9a-f]{64}$/.test(source.sha256);
  return false;
}
function ciIdSource(ci, importedLedger) {
  // Record only the token observed in this invocation, never an untrusted
  // source embedded in a carried claim. Its context is not authentication.
  const token = numberSources.get(ci)?.get('run_id');
  if (typeof token !== 'string') return {status:'unavailable'};
  const context = importedLedger ? 'ledger' : 'request';
  if (token.length > MAX_CI_ID_SOURCE_CHARS)
    return {status:'omitted', context, length:token.length, sha256:crypto.createHash('sha256').update(token).digest('hex')};
  return {status:'recorded', context, token};
}
function validCiIdClaim(ci, numericId) {
  const recorded = ci.xtack_id_precision;
  if (!recorded || typeof recorded !== 'object' || Array.isArray(recorded) || recorded.status !== 'verified') return false;
  if (recorded.version !== CI_ID_PRECISION_V1 && recorded.version !== CI_ID_PRECISION) return false;
  if (recorded.version === CI_ID_PRECISION && !validCiIdSource(recorded.source)) return false;
  const candidate = {...ci, run_id:numericId};
  return recorded.binding === ciIdBinding(candidate, 'verified', recorded.version, recorded.source);
}
function ciNumericIdIsExact(ci, importedLedger) {
  if (typeof ci.run_id === 'string' && Object.hasOwn(ci, 'xtack_id_precision')) {
    const numericId = Number(ci.run_id);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === ci.run_id && validCiIdClaim(ci, numericId);
  }
  if (typeof ci.run_id !== 'number') return true;
  const incomingExact = Number.isSafeInteger(ci.run_id) && ci.run_id > 0 && numericSourceIsExact(ci, 'run_id');
  const carryingClaim = importedLedger || Object.hasOwn(ci, 'xtack_id_precision');
  const priorExact = !carryingClaim || validCiIdClaim(ci, ci.run_id);
  const source = ciIdSource(ci, importedLedger);
  const status = incomingExact && priorExact ? 'verified' : 'unverified';
  ciIdClaims.set(ci, {version: CI_ID_PRECISION, status, source, binding: ciIdBinding(ci, status, CI_ID_PRECISION, source)});
  return status === 'verified';
}
function ciForLedger(ci) {
  const claim = ciIdClaims.get(ci);
  if (!claim) return ci;
  const retained = {...ci, xtack_id_precision:claim};
  // Do not present a rounded or non-finite parsed value as the requested ID.
  if (typeof ci.run_id === 'number' && claim.status !== 'verified') delete retained.run_id;
  return retained;
}
function exactQueriedRunId(raw, result) {
  if (typeof result?.databaseId === 'string') return /^[1-9][0-9]*$/.test(result.databaseId) ? result.databaseId : null;
  if (typeof result?.databaseId !== 'number') return null;
  const span = lastMembers(raw, [skipSpace(raw, 0), raw.length], new Set(['databaseId'])).get('databaseId');
  if (!span) return null;
  const token = raw.slice(span[0], span[1]);
  return /^[1-9][0-9]*$/.test(token) ? token : null;
}
function ciAssessment(ci, target, current, importedLedger) {
  if (!ci) return { status: 'not_required' };
  // Preserve numeric precision even while CI is disabled: the returned ledger
  // may later be reused with CI enabled or as part of a fresh request.
  const numericIdExact = ciNumericIdIsExact(ci, importedLedger);
  if (!ci.required) return { status: 'not_required' };
  if (!numericIdExact) return { status: 'unverified', reason: 'CI run ID precision or its carried claim is unverified; supply the exact decimal ID in a fresh request without stale precision metadata.' };
  if (!['string', 'number'].includes(typeof ci.run_id) || !nonemptyString(ci.repo) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(ci.repo) || !/^[1-9][0-9]*$/.test(String(ci.run_id || '')) ||
      !Array.isArray(ci.required_jobs) || !ci.required_jobs.length || ci.required_jobs.some(name => !nonemptyString(name)))
    return { status: 'unverified', reason: 'An explicit owner/repository, run ID, and required job names are needed.' };
  try {
    const opts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000, maxBuffer: 4 * 1024 * 1024 };
    const gitOpts = { ...opts, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } };
    const head = execFileSync('git', ['-C', target.root, 'rev-parse', 'HEAD'], gitOpts).trim();
    const remoteOutput = execFileSync('git', ['-C', target.root, 'remote', 'get-url', 'origin'], gitOpts);
    if (!remoteOutput.endsWith('\n')) return { status: 'unverified', reason: 'Git origin output has no expected line terminator.' };
    // Remove only Git's final LF. trim() would erase whitespace that is part
    // of the origin itself and can change the remote path Git actually uses.
    const remote = remoteOutput.slice(0, -1);
    if (!githubRemoteMatches(remote, ci.repo)) return { status: 'unverified', reason: 'Git origin does not identify the requested GitHub repository.' };
    const before = snapshot(target);
    if (!before.complete) return { status: 'unverified', reason: 'The target could not be verified before CI collection.' };
    if (!identitiesMatch(current, before)) return { status: 'unverified', reason: 'The target changed between gate evaluation and CI collection.' };
    const gitPaths = target.paths.map(item => path.normalize(item));
    const initialIssue = gitWorkspaceIssue(gitOpts, target.root, gitPaths);
    if (initialIssue) return { status: 'unverified', reason: initialIssue };
    const rawTargetIssue = gitRawTargetIssue(gitOpts, target);
    if (rawTargetIssue) return { status: 'unverified', reason: rawTargetIssue };
    const raw = execFileSync('gh', ['run', 'view', String(ci.run_id), '--repo', `github.com/${ci.repo}`, '--json', 'databaseId,status,conclusion,headSha,jobs,url'], opts);
    const result = JSON.parse(raw);
    const after = snapshot(target);
    if (!identitiesMatch(before, after)) return { status: 'unverified', reason: 'The target changed during CI collection.' };
    const endHead = execFileSync('git', ['-C', target.root, 'rev-parse', 'HEAD'], gitOpts).trim();
    const endIssue = gitWorkspaceIssue(gitOpts, target.root, gitPaths);
    const endRemoteOutput = execFileSync('git', ['-C', target.root, 'remote', 'get-url', 'origin'], gitOpts);
    if (endHead !== head || endIssue || endRemoteOutput !== remoteOutput) return { status: 'unverified', reason: 'Git state or origin changed or became unverified during CI collection.' };
    // Git status can execute configured clean filters. Check the target again
    // after the last Git command rather than trusting the earlier snapshot.
    if (!identitiesMatch(current, snapshot(target))) return { status: 'unverified', reason: 'The target changed during final Git checks.' };
    if (exactQueriedRunId(raw, result) !== String(ci.run_id) || !githubRunUrlMatches(result.url, ci.repo, ci.run_id) || result.headSha !== head)
      return { status: 'unverified', reason: 'CI run identity or commit SHA does not match the target.' };
    if (String(result.status).toLowerCase() !== 'completed') return { status: 'unverified', reason: 'CI run is not complete.', url: result.url };
    const runConclusion = String(result.conclusion).toLowerCase();
    if (runConclusion !== 'success') return { status: runConclusion === 'failure' ? 'blocked' : 'unverified', reason: `CI run conclusion is ${runConclusion}.`, url: result.url };
    if (!Array.isArray(result.jobs)) return { status: 'unverified', reason: 'CI job details are missing.', url: result.url };
    for (const name of ci.required_jobs) {
      const jobs = result.jobs.filter(job => job.name === name);
      if (jobs.length !== 1 || String(jobs[0].status).toLowerCase() !== 'completed') return { status: 'unverified', reason: `Required job is missing, ambiguous, or incomplete: ${name}`, url: result.url };
      const conclusion = String(jobs[0].conclusion).toLowerCase();
      if (conclusion !== 'success') return { status: conclusion === 'failure' ? 'blocked' : 'unverified', reason: `Required job ${name} conclusion is ${conclusion}.`, url: result.url };
    }
    return { status: 'eligible', source: 'gh', run_id: String(ci.run_id), url: result.url, head_sha: head, required_jobs: ci.required_jobs,
      reason: 'The current GitHub CLI response matches HEAD and the clean workspace; ignored inputs outside the declared target, remote service, local executable, and supplied job list remain trust boundaries.' };
  } catch { return { status: 'unverified', reason: 'Git or GitHub CLI execution, authentication, or response parsing failed.' }; }
}
function evaluateReview(review, required, current, intentFingerprint, reviewContextFingerprint) {
  if (!required && review === undefined) return { status: 'not_required' };
  if (!review || typeof review !== 'object') return { status: 'unverified', reason: 'Required review missing.' };
  const target_status = identityStatus(review.target_identity, current);
  if (target_status !== 'current') return { status: 'unverified', target_status,
    reason: target_status === 'stale' ? 'Review refers to an earlier or different target; review the current target.' : 'The review target identity is incomplete or covers a different target.' };
  if (review.target_digest !== undefined && review.target_digest !== review.target_identity.digest)
    return { status: 'unverified', target_status: 'unknown', reason: 'Review digest conflicts with its target identity.' };
  if (!/^[0-9a-f]{64}$/.test(review.intent_fingerprint || ''))
    return { status: 'unverified', target_status, intent_status: 'unknown', reason: 'Review intent fingerprint is missing.' };
  if (review.intent_fingerprint !== intentFingerprint)
    return { status: 'unverified', target_status, intent_status: 'stale', reason: 'Review covers a different intent; review the current intent.' };
  const req = review.requirements, standard = review.standards;
  if (req === 'fail') return { status: 'blocked', reason: 'Requirements review failed.' };
  // An explicit blocked verdict is a blocker only after establishing
  // that it concerns this target and intent. It must not hide known failures.
  if (review.disposition === 'blocked')
    return { status: 'blocked', reason: 'The overall review disposition is blocked.' };
  const findings = Array.isArray(review.findings) ? review.findings : [];
  if (review.findings !== undefined && !Array.isArray(review.findings)) return { status: 'unverified', reason: 'Findings must be an array.' };
  const completeFinding = f => ['location', 'criterion', 'evidence', 'impact', 'confidence'].every(key => nonemptyString(f?.[key]));
  // A separate incomplete finding cannot erase an established blocker. Only
  // a fully described finding with a known unresolved disposition blocks.
  if (findings.some(f => completeFinding(f) && ['major', 'critical'].includes(f?.severity) && ['open', 'accepted'].includes(f?.status)))
    return { status: 'blocked', reason: 'A major or critical finding is unresolved.' };
  if (!['pass', 'fail', 'unverified'].includes(req) || !['pass', 'fail', 'unverified'].includes(standard)) return { status: 'unverified', reason: 'Both review axes need results.' };
  if (findings.some(f => !completeFinding(f)))
    return { status: 'unverified', reason: 'Every finding needs location, criterion, evidence, impact, and confidence (or an explicit unknown).', findings };
  if (findings.some(f => !['minor', 'major', 'critical'].includes(f?.severity) || !['open', 'resolved', 'accepted'].includes(f?.status)))
    return { status: 'unverified', reason: 'A finding has an unknown severity or disposition.' };
  if (findings.some(f => f.severity === 'minor' && (f.status === 'open' || (f.status === 'accepted' && (!nonemptyString(f.rationale) || !nonemptyString(f.residual_risk))))))
    return { status: 'unverified', reason: 'A minor finding is unresolved or its acceptance lacks rationale and residual risk.' };
  if (standard === 'fail') {
    if (!findings.length || findings.some(f => f.severity !== 'minor' || f.status !== 'accepted' || !nonemptyString(f.rationale) || !nonemptyString(f.residual_risk)))
      return { status: 'blocked', reason: 'Standards failure has no documented accepted-minor disposition.' };
  }
  // Missing or unknown overall verdicts cannot become eligible. This
  // check follows established same-target blockers so uncertainty cannot mask
  // a definite failure.
  if (!['non-blocking', 'blocked', 'unverified'].includes(review.disposition))
    return { status: 'unverified', reason: 'The overall review disposition is missing or invalid.' };
  if (review.disposition === 'unverified')
    return { status: 'unverified', reason: 'The overall review disposition is unverified.' };
  // A missing/stale risk binding must not mask an already established block
  // on this same target and intent. Older records remain readable but cannot
  // establish that their reviewer saw the current declared risks.
  if (typeof review.review_context_fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(review.review_context_fingerprint))
    return { status: 'unverified', target_status, context_status: 'unknown', reason: 'Review risk context fingerprint is missing or invalid.' };
  if (review.review_context_fingerprint !== reviewContextFingerprint)
    return { status: 'unverified', target_status, context_status: 'stale', reason: 'Review covers a different declared risk context; review the current risks.' };
  if (findings.some(f => f.severity === 'minor' && f.status === 'accepted' &&
      (!disclosedDetail(f.rationale) || !disclosedDetail(f.residual_risk))))
    return { status: 'unverified', reason: 'A minor finding is unresolved or its acceptance lacks rationale and residual risk.' };
  if (findings.some(f => f.status === 'resolved' && !disclosedDetail(f.resolution_evidence)))
    return { status: 'unverified', reason: 'A resolved finding needs evidence supporting its resolution.' };
  if (req === 'unverified' || standard === 'unverified') return { status: 'unverified', reason: 'A review axis is unverified.' };
  if (required && (!review.independence || review.independence.status !== 'confirmed' || !disclosedDetail(review.independence.reference) || !disclosedDetail(review.independence.reviewer) || !disclosedDetail(review.independence.implementer) || review.independence.reviewer.trim() === review.independence.implementer.trim()))
    return { status: 'unverified', reason: 'Independent review and its host evidence reference are missing.' };
  if (!disclosedDetail(review.reference)) return { status: 'unverified', reason: 'Review result reference is missing.' };
  return { status: 'eligible', reason: 'Declared review has no blocking finding; its provenance and independence require external confirmation.' };
}
function evaluateApproval(approval, delivery, current) {
  if (!approval?.required) return { status: 'not_required' };
  const target_status = identityStatus(approval.target_identity, current);
  if (target_status !== 'current') return { status: 'unverified', target_status, reason: 'Approval target is missing, different, or stale.' };
  if (!delivery || !nonemptyString(delivery.action) || !nonemptyString(delivery.scope) ||
      approval.action !== delivery.action || approval.scope !== delivery.scope)
    return { status: 'unverified', target_status, reason: 'Approval action and scope must match the intended delivery action and scope.' };
  if (approval.status === 'denied') return { status: 'blocked', target_status, reason: 'Current target and scope were denied.' };
  if (approval.status === 'approved' && disclosedDetail(approval.reference)) return { status: 'eligible', target_status,
    reason: 'Approval is declared for this target, action, and scope; authority and provenance require external confirmation.' };
  return { status: 'unverified', target_status, reason: 'Required approval is not confirmed.' };
}
function receiptIdentifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) ||
      ['__proto__', 'prototype', 'constructor'].includes(value)) fail('invalid receipt identifier');
  return value;
}
function resolveReceipts(evidence, records) {
  const table = Object.create(null);
  if (records !== undefined) {
    object(records, 'receipts');
    for (const key of Object.keys(records)) {
      receiptIdentifier(key);
      table[key] = object(records[key], `receipts.${key}`);
    }
  }
  return evidence.map(item => {
    if (!Object.hasOwn(item, 'receipt_ref')) return item;
    if (Object.hasOwn(item, 'receipt')) fail('evidence cannot contain both receipt and receipt_ref');
    const key = receiptIdentifier(item.receipt_ref);
    if (!Object.hasOwn(table, key)) fail(`unknown receipt reference: ${key}`);
    return { ...item, receipt: table[key] };
  });
}
async function gate(input) {
  object(input, 'input');
  const ledgerVersion = LEDGER_VERSION;
  const resultVersion = VERSION;
  let importedLedger = input.version === ledgerVersion;
  if (input.ledger !== undefined) {
    if (typeof input.version === 'string' && input.version.startsWith('xtack-core-') && input.version !== resultVersion)
      fail('unsupported core result version');
    input = object(input.ledger, 'ledger');
    if (input.version !== ledgerVersion) fail('unsupported ledger version');
    importedLedger = true;
  }
  if (typeof input.version === 'string' && input.version.startsWith('xtack-ledger-') && input.version !== ledgerVersion)
    fail('unsupported ledger version');
  for (const key of ['ci', 'approval']) {
    if (input[key] !== undefined) {
      object(input[key], key);
      if (typeof input[key].required !== 'boolean') fail(`${key}.required must be boolean`);
    }
  }
  if (input.delivery !== undefined) object(input.delivery, 'delivery');
  if (input.risk_coverage !== undefined) list(input.risk_coverage, 'risk_coverage');
  const intent = intentOf(input.intent);
  const selection = route({ intent, risk_factors: input.risk_factors, limits: input.limits }, importedLedger);
  const target = targetSpec(input.target);
  const current = snapshot(target);
  const implementation = implementationAssessment(input.implementation, intent, target);
  const evidence = list(input.evidence, 'evidence');
  const carriedPrecision = input.receipt_precision;
  const hasPrecision = importedLedger || Object.hasOwn(input, 'receipt_precision');
  const validPrecision = carriedPrecision && typeof carriedPrecision === 'object' && !Array.isArray(carriedPrecision) &&
    carriedPrecision.version === RECEIPT_PRECISION && carriedPrecision.inline && typeof carriedPrecision.inline === 'object' && !Array.isArray(carriedPrecision.inline) &&
    carriedPrecision.receipts && typeof carriedPrecision.receipts === 'object' && !Array.isArray(carriedPrecision.receipts);
  const inventory = carriedPrecision?.inventory;
  const inventoryShape = validPrecision && inventory && typeof inventory === 'object' && !Array.isArray(inventory) &&
    typeof inventory.complete === 'boolean' && Array.isArray(inventory.inline) && Array.isArray(inventory.receipts) &&
    inventory.inline.every(x => typeof x === 'string' && /^(0|[1-9][0-9]*)$/.test(x)) &&
    inventory.receipts.every(x => typeof x === 'string' && /^(?!constructor$|prototype$|__proto__$)[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(x));
  const validInventory = inventoryShape && inventory.complete === true;
  const oldInline = new Set(inventoryShape ? inventory.inline : []);
  const oldTable = new Set(inventoryShape ? inventory.receipts : []);
  const occurrences = [];
  for (const [index, item] of evidence.entries()) {
    object(item, 'evidence item');
    nonempty(item.criterion_id, 'evidence.criterion_id');
    if (Object.hasOwn(item, 'receipt')) occurrences.push({ receipt: item.receipt, location: { kind: 'inline', index }, key: String(index), claims: validPrecision ? carriedPrecision.inline : null, old: oldInline });
  }
  if (input.receipts && typeof input.receipts === 'object' && !Array.isArray(input.receipts))
    for (const [id, receipt] of Object.entries(input.receipts))
      occurrences.push({ receipt, location: { kind: 'table', id }, key: id, claims: validPrecision ? carriedPrecision.receipts : null, old: oldTable });
  // Index only claims carried into this evaluation; newly inferred claims never seed peers.
  const sources = new Map();
  for (const entry of occurrences) {
    const { receipt, location, claims, key, old } = entry;
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) continue;
    try { entry.serialized = JSON.stringify(receipt); } catch { continue; }
    if (typeof entry.serialized !== 'string') continue;
    const present = !!claims && Object.hasOwn(claims, key);
    const prior = present ? claims[key] : undefined;
    const binding = receiptBinding(receipt, 'verified', location);
    const valid = receiptSources.get(receipt) === true && binding !== null && prior && typeof prior === 'object' && !Array.isArray(prior) &&
      prior.version === RECEIPT_PRECISION && prior.status === 'verified' && prior.binding === binding;
    const state = sources.get(entry.serialized) || { verified: false, conflict: false };
    if (valid && validInventory && old.has(key)) state.verified = true;
    else if (present || (validInventory && old.has(key))) state.conflict = true;
    sources.set(entry.serialized, state);
  }
  const currentInline = new Set(occurrences.filter(x => x.location.kind === 'inline').map(x => x.key));
  const currentTable = new Set(occurrences.filter(x => x.location.kind === 'table').map(x => x.key));
  const inventoryIntact = !!validInventory &&
    [...oldInline].every(key => currentInline.has(key) && Object.hasOwn(carriedPrecision.inline, key)) &&
    [...oldTable].every(key => currentTable.has(key) && Object.hasOwn(carriedPrecision.receipts, key)) &&
    occurrences.every(({ receipt, location, claims, key, old }) => {
      if (!old.has(key)) return !claims || !Object.hasOwn(claims, key);
      const prior = claims[key];
      if (!prior || typeof prior !== 'object' || Array.isArray(prior) || prior.version !== RECEIPT_PRECISION ||
          !['verified', 'unverified'].includes(prior.status)) return false;
      const binding = receiptBinding(receipt, prior.status, location);
      return binding !== null && prior.binding === binding;
    });
  for (const entry of occurrences) {
    const { receipt, location, claims, key, old } = entry;
    const present = !!claims && Object.hasOwn(claims, key);
    const state = sources.get(entry.serialized);
    const inherited = !!(hasPrecision && inventoryIntact && !old.has(key) && !present && state?.verified && !state.conflict);
    const inconsistentNewClaim = inventoryShape && !old.has(key) && present;
    prepareReceiptClaim(receipt, location, hasPrecision, present && !inconsistentNewClaim ? claims[key] : undefined, inherited);
  }
  let inventoryComplete = !hasPrecision || inventoryIntact;
  for (const entry of occurrences) {
    if (!entry.receipt || typeof entry.receipt !== 'object' || Array.isArray(entry.receipt)) continue;
    if (typeof entry.serialized !== 'string') inventoryComplete = false;
  }
  const resolvedEvidence = resolveReceipts(evidence, input.receipts);
  const orphaned_evidence = resolvedEvidence.filter(item => !intent.criteria.some(c => c.id === item.criterion_id)).map(item => ({ criterion_id: item.criterion_id, status: 'stale' }));
  const results = [];
  for (const criterion of intent.criteria) {
    const items = resolvedEvidence.filter(x => x.criterion_id === criterion.id);
    if (!items.length) { results.push({ id: criterion.id, required: criterion.required !== false, status: 'unverified', reason: 'No evidence.' }); continue; }
    const statuses = [], observations = [];
    let outputUnverified = false, argumentsUnverified = false, precisionUnverified = false;
    for (const item of items) {
      const a = item.assertion;
      const target_status = evidenceTargetStatus(item, current);
      const criterion_status = !/^[0-9a-f]{64}$/.test(item.criterion_fingerprint || '') ? 'unknown' :
        item.criterion_fingerprint === selection.fingerprints.criteria[criterion.id] ? 'current' : 'stale';
      const group = item.receipt?.process_group_observation;
      const groupStatus = !item.receipt || !Object.hasOwn(item.receipt, 'process_group_observation') ? 'not_recorded' :
        group && typeof group === 'object' && !Array.isArray(group) && ['absent', 'present_or_reused', 'unknown', 'unsupported'].includes(group.status) ? group.status : 'invalid';
      observations.push({ assertion_status: a?.status || 'unverified', execution_status: item.receipt?.status || 'not_run', target_status, criterion_status, process_group_status: groupStatus,
        ...(item.receipt && impossibleCompleteOutput(item.receipt) ? { output_status: 'inconsistent' } : {}) });
      // A known old target is historical context, not a current result. If its
      // target is unknown, never turn a failure into either a block or a pass.
      if (target_status === 'unknown' || criterion_status === 'unknown') { statuses.push('unverified'); continue; }
      if (target_status === 'stale' || criterion_status === 'stale') continue;
      if (item.receipt && !preciseReceipt(item.receipt)) { precisionUnverified = true; statuses.push('unverified'); continue; }
      if (!a || !['pass', 'fail', 'not_run', 'blocked', 'unverified'].includes(a.status) || !nonemptyString(a.rationale)) { statuses.push('unverified'); continue; }
      if (a.status === 'fail') {
        const r = item.receipt;
        const observed = r ? (successfulReceipt(r, current) || (r.status === 'failed' && Number.isInteger(r.exit_code) && r.exit_code !== 0 && r.signal === null && r.error === null)) : disclosedDetail(item.reference);
        statuses.push(observed ? 'blocked' : 'unverified'); continue;
      }
      if (a.status !== 'pass' || !disclosedDetail(a.rationale)) { statuses.push('unverified'); continue; }
      if (item.receipt) {
        const r = item.receipt;
        if (r.version !== RECEIPT || !['success', 'failed', 'timed_out', 'signalled', 'spawn_error'].includes(r.status)) { statuses.push('unverified'); continue; }
        // Execution failure/interruption alone does not establish product failure.
        if (r.status !== 'success' || r.exit_code !== 0 || r.signal != null) { statuses.push('unverified'); continue; }
        if (!positiveReceipt(r, current)) {
          if (successfulReceipt(r, current) && !r.argv.every(wellFormedUnicode)) argumentsUnverified = true;
          statuses.push('unverified'); continue;
        }
        if (impossibleCompleteOutput(r)) { outputUnverified = true; statuses.push('unverified'); continue; }
        statuses.push('eligible');
      } else if (disclosedDetail(item.reference)) { statuses.push('eligible'); }
      else statuses.push('unverified');
    }
    const status = statuses.includes('blocked') ? 'blocked' : statuses.length && statuses.every(s => s === 'eligible') ? 'eligible' : 'unverified';
    const groupUnverified = items.some(item => item.receipt && !groupObservationEligible(item.receipt));
    results.push({ id: criterion.id, required: criterion.required !== false, status, observations,
      reason: status === 'eligible' ? 'Evidence and explicit assertion are supplied; their provenance and sufficiency require external confirmation.' : status === 'blocked' ? 'An assertion or execution failed.' : precisionUnverified ? 'Receipt number precision or its recorded claim is unverified; inspect the original receipt and other conditions.' : outputUnverified ? 'A complete captured output is shorter than its declared byte count; inspect the original receipt and other conditions.' : argumentsUnverified ? 'A receipt contains an unpaired surrogate in argv; the actual child argument is unverified.' : groupUnverified ? 'Evidence is incomplete or unverified; inspect the original receipt process group observation and other conditions.' : 'Evidence, assertion, or current target is missing, stale, or incomplete.' });
  }
  const review = evaluateReview(input.review, selection.requirements.independent_review, current, selection.fingerprints.intent, selection.fingerprints.review_context);
  const ci = ciAssessment(input.ci, target, current, importedLedger);
  const approval = evaluateApproval(input.approval, input.delivery, current);
  const mandatory = results.filter(x => x.required).map(x => x.status);
  mandatory.push(implementation.status);
  // An exhausted item must not mask a different requested limit whose usage
  // is unknown. Keep exhaustion's stop guidance, while accounting for every
  // limit separately when assessing the supplied evidence.
  if (selection.limits.items.some(item => item.status === 'unverified')) mandatory.push('unverified');
  // Reaching a cap stops additional relevant work; it does not invalidate
  // already obtained evidence. Exceeding a declared cap fails its policy.
  if (selection.limits.exceeded) mandatory.push('blocked');
  const requiredIds = new Set(intent.criteria.filter(c => c.required !== false).map(c => c.id));
  const executionCriteria = new Set(resolvedEvidence.filter(x => requiredIds.has(x.criterion_id) && x.criterion_fingerprint === selection.fingerprints.criteria[x.criterion_id] && x.assertion?.status === 'pass' && disclosedDetail(x.assertion.rationale) && positiveReceipt(x.receipt, current) && !impossibleCompleteOutput(x.receipt)).map(x => x.criterion_id));
  if (selection.requirements.execution && !executionCriteria.size) mandatory.push('unverified');
  const requiredRiskFactors = selection.requirements.risk_specific_checks ? selection.risk_factors.filter(f => CRITICAL_FACTORS.has(f)) : [];
  if (selection.requirements.risk_specific_checks && !requiredRiskFactors.length) requiredRiskFactors.push('critical-general');
  const suppliedCoverage = Array.isArray(input.risk_coverage) ? input.risk_coverage : [];
  const risk_coverage = requiredRiskFactors.map(factor => {
    const candidates = suppliedCoverage.filter(x => x?.factor === factor && requiredIds.has(x?.criterion_id) && disclosedDetail(x?.rationale));
    const mapping = candidates.find(candidate => executionCriteria.has(candidate.criterion_id));
    return { factor, criterion_id: mapping?.criterion_id || candidates[0]?.criterion_id || null, status: mapping ? 'eligible' : 'unverified',
      reason: mapping ? 'Risk is mapped to a required criterion and execution; sufficiency requires external confirmation.' : 'Risk needs a required criterion, rationale, and current successful execution evidence.' };
  });
  mandatory.push(...risk_coverage.map(item => item.status));
  if (selection.declared_risk === 'unknown' || selection.risk === 'unknown' || selection.unknown_factors.length || !current.complete) mandatory.push('unverified');
  mandatory.push(review.status, ci.status);
  const assessment = mandatory.includes('blocked') ? 'blocked' : mandatory.includes('unverified') ? 'unverified' : 'eligible';
  const delivery_eligibility = assessment === 'blocked' || approval.status === 'blocked' ? 'blocked' : assessment === 'unverified' || approval.status === 'unverified' ? 'unverified' : 'eligible';
  let candidate_state;
  if (selection.limits.exceeded || (selection.limits.status === 'exhausted' && assessment !== 'eligible')) candidate_state = 'budget_exhausted';
  else if (review.status === 'blocked') candidate_state = 'changes_requested';
  else if (results.some(r => r.required && r.status === 'blocked') || ci.status === 'blocked') candidate_state = 'verification_failed';
  else if (!evidence.length) candidate_state = 'draft';
  else if (selection.requirements.independent_review && review.status === 'unverified') candidate_state = 'in_review';
  else if (assessment !== 'eligible') candidate_state = 'verification_pending';
  else if (input.approval?.required && approval.status !== 'eligible') candidate_state = 'approval_required';
  else if (input.approval?.required && approval.status === 'eligible') candidate_state = 'ready_to_ship';
  else candidate_state = 'verified';
  const inlineClaims = Object.fromEntries(evidence.flatMap((item, index) => {
    const claim = item.receipt && typeof item.receipt === 'object' ? receiptClaims.get(item.receipt) : undefined;
    return claim ? [[String(index), claim]] : [];
  }));
  const tableClaims = input.receipts === undefined ? {} : Object.fromEntries(
    Object.entries(input.receipts).flatMap(([id, receipt]) => {
      const claim = receipt && typeof receipt === 'object' ? receiptClaims.get(receipt) : undefined;
      return claim ? [[id, claim]] : [];
    }));
  const ledger = { version: ledgerVersion, intent, target, risk_factors: input.risk_factors || [], risk_coverage: suppliedCoverage, evidence,
    receipt_precision: { version: RECEIPT_PRECISION, inline: inlineClaims, receipts: tableClaims,
      inventory: { complete: inventoryComplete,
        inline: [...new Set([...oldInline, ...occurrences.filter(x => x.location.kind === 'inline').map(x => x.key)])],
        receipts: [...new Set([...oldTable, ...occurrences.filter(x => x.location.kind === 'table').map(x => x.key)])] } },
    ...(input.receipts === undefined ? {} : { receipts: input.receipts }),
    ...(input.implementation === undefined ? {} : { implementation: input.implementation }),
    ...(input.limits === undefined ? {} : { limits: Object.fromEntries(Object.entries(input.limits).map(([key, value]) =>
      [key, { ...value, xtack_precision: budgetClaims.get(input.limits)?.[key] }])) }),
    ...(input.delivery === undefined ? {} : { delivery: input.delivery }),
    ...(input.review === undefined ? {} : { review: input.review }), ...(input.ci === undefined ? {} : { ci: ciForLedger(input.ci) }),
    ...(input.approval === undefined ? {} : { approval: input.approval }) };
  const verificationFailed = results.some(r => r.required && r.status === 'blocked') || review.status === 'blocked' || ci.status === 'blocked';
  return { version: resultVersion, assessment, verification: verificationFailed ? 'blocked' : 'unverified',
    delivery_eligibility, ready_to_ship: delivery_eligibility === 'blocked' ? 'blocked' : 'unverified', candidate_state, ledger,
    target: current, selection, criteria: results, orphaned_evidence, implementation, risk_coverage, limits: selection.limits, review, ci, approval,
    limitations: ['eligible and candidate_state are conditional on supplied records, not authenticated or sufficient evidence.',
      'This process cannot authenticate imported receipts, reviewer independence, CI results, or host authorization.',
      'A successful command is separate from its asserted acceptance criterion; no permission is granted.',
      ...(selection.declared_risk === 'unknown' ? ['The declared risk is unknown; promotion based on a risk factor does not resolve it.'] : []),
      ...(selection.unknown_factors.length ? ['Unrecognized risk factors remain unverified; inspect selection.unknown_factors.'] : []),
      ...(!current.complete ? ['The current target snapshot is incomplete.'] : []),
      ...(selection.requirements.execution && !executionCriteria.size ? ['No required criterion has current successful execution evidence with a supported pass assertion.'] : [])] };
}

const HELP = `xtack execution core: node xtack.mjs (route|snapshot) < request.json\n                      node xtack.mjs run [--receipt <new-path>] < request.json\n                      node xtack.mjs gate [--compact] < request.json\n\nRead one JSON object from stdin and emit one JSON object to stdout. Errors emit JSON to stderr and exit 2; an observed command failure is a successful run invocation whose receipt status is failed. The optional --receipt exclusively creates a new file outside the target before running and captures the same receipt bytes; inspect any retained file and actual error before retrying. Gate accepts --compact, which omits the complete ledger. Gate requires an actual overall review disposition for a supplied or required review; it does not authenticate the review. Nothing is persisted automatically. See scripts/README.md for inputs, output statuses and limitations.\n`;
// The input has already passed JSON.parse. Scan only the selected object path,
// without a reviver's recursive walk or a source map for unrelated values.
// Duplicate members follow JSON.parse's last-member-wins semantics.
function skipSpace(text, at) {
  while (at < text.length && (text[at] === ' ' || text[at] === '\n' || text[at] === '\r' || text[at] === '\t')) at++;
  return at;
}
function skipString(text, at) {
  at++;
  while (at < text.length) {
    if (text[at] === '\\') { at += 2; continue; }
    if (text[at++] === '"') return at;
  }
  throw new Error('incomplete string while collecting number sources');
}
function skipValue(text, at) {
  at = skipSpace(text, at);
  if (text[at] === '"') return skipString(text, at);
  if (text[at] === '{' || text[at] === '[') {
    let depth = 0;
    do {
      const c = text[at];
      if (c === '"') { at = skipString(text, at); continue; }
      if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') depth--;
      at++;
    } while (depth && at < text.length);
    if (depth) throw new Error('incomplete container while collecting number sources');
    return at;
  }
  while (at < text.length && !',}] \n\r\t'.includes(text[at])) at++;
  return at;
}
function lastMembers(text, span, names) {
  const found = new Map();
  if (!span || text[span[0]] !== '{') return found;
  const longestEncodedKey = Math.max(...[...names].map(name => name.length)) * 6 + 2;
  let at = skipSpace(text, span[0] + 1);
  while (text[at] !== '}') {
    const start = at;
    at = skipString(text, at);
    // Each relevant key is ASCII and each character can occupy at most six
    // JSON source characters. Avoid copying an arbitrarily long unrelated key.
    const key = at - start <= longestEncodedKey ? JSON.parse(text.slice(start, at)) : undefined;
    at = skipSpace(text, at);
    if (text[at++] !== ':') throw new Error('invalid member while collecting number sources');
    at = skipSpace(text, at);
    const valueStart = at;
    at = skipValue(text, at);
    if (names.has(key)) found.set(key, [valueStart, at]);
    at = skipSpace(text, at);
    if (text[at] === ',') at = skipSpace(text, at + 1);
    else if (text[at] !== '}') throw new Error('invalid object while collecting number sources');
  }
  return found;
}
// Iterate each selected array/object once. These scanners only see input that
// JSON.parse has already accepted and honor the final duplicate object member.
function arraySpans(text, span) {
  const result = [];
  if (!span || text[span[0]] !== '[') return result;
  let at = skipSpace(text, span[0] + 1);
  while (text[at] !== ']') {
    const start = at;
    at = skipValue(text, at);
    result.push([start, at]);
    at = skipSpace(text, at);
    if (text[at] === ',') at = skipSpace(text, at + 1);
    else if (text[at] !== ']') throw new Error('invalid array while collecting receipt sources');
  }
  return result;
}
function objectSpans(text, span) {
  const result = new Map();
  if (!span || text[span[0]] !== '{') return result;
  let at = skipSpace(text, span[0] + 1);
  while (text[at] !== '}') {
    const start = at;
    at = skipString(text, at);
    const key = JSON.parse(text.slice(start, at));
    at = skipSpace(text, at);
    if (text[at++] !== ':') throw new Error('invalid object while collecting receipt sources');
    at = skipSpace(text, at);
    const valueStart = at;
    at = skipValue(text, at);
    result.set(key, [valueStart, at]);
    at = skipSpace(text, at);
    if (text[at] === ',') at = skipSpace(text, at + 1);
    else if (text[at] !== '}') throw new Error('invalid object while collecting receipt sources');
  }
  return result;
}
function captureReceiptSources(text, input, command) {
  if (command !== 'gate') return;
  const one = (span, key) => lastMembers(text, span, new Set([key])).get(key);
  let selected = input, span = [skipSpace(text, 0), text.length];
  if (input?.ledger !== undefined) { span = one(span, 'ledger'); selected = input.ledger; }
  if (!selected || typeof selected !== 'object' || Array.isArray(selected)) return;
  const top = lastMembers(text, span, new Set(['evidence', 'receipts']));
  const record = (receipt, source) => {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return;
    if (!source || text[source[0]] !== '{') { receiptSources.set(receipt, false); return; }
    const fields = lastMembers(text, source, new Set(['duration_ms', 'timeout_ms', 'exit_code', 'stdout', 'stderr']));
    const numeric = (parent, key, valueSpan) => typeof parent?.[key] !== 'number' ||
      (!!valueSpan && decimalMatchesNumber(text.slice(valueSpan[0], valueSpan[1]), parent[key]));
    const out = lastMembers(text, fields.get('stdout'), new Set(['bytes']));
    const err = lastMembers(text, fields.get('stderr'), new Set(['bytes']));
    receiptSources.set(receipt, numeric(receipt, 'duration_ms', fields.get('duration_ms')) &&
      numeric(receipt, 'timeout_ms', fields.get('timeout_ms')) && numeric(receipt, 'exit_code', fields.get('exit_code')) &&
      numeric(receipt.stdout, 'bytes', out.get('bytes')) && numeric(receipt.stderr, 'bytes', err.get('bytes')));
  };
  if (Array.isArray(selected.evidence)) {
    const elements = arraySpans(text, top.get('evidence'));
    if (elements.length !== selected.evidence.length) throw new Error('receipt evidence source mismatch');
    selected.evidence.forEach((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item) && Object.hasOwn(item, 'receipt'))
        record(item.receipt, one(elements[index], 'receipt'));
    });
  }
  if (selected.receipts && typeof selected.receipts === 'object' && !Array.isArray(selected.receipts)) {
    const entries = objectSpans(text, top.get('receipts'));
    for (const [key, receipt] of Object.entries(selected.receipts)) record(receipt, entries.get(key));
  }
}
// JSON.parse can round a fractional or out-of-range run limit into an
// accepted integer. Validate the effective source token before any snapshot
// or child process starts, while keeping JSON's last-member-wins semantics.
function validateRunNumberSources(text, input, command) {
  if (command !== 'run' || !input || typeof input !== 'object' || Array.isArray(input)) return;
  const names = new Set(['timeout_ms', 'output_limit_bytes']);
  const fields = lastMembers(text, [skipSpace(text, 0), text.length], names);
  for (const name of names) {
    if (typeof input[name] !== 'number') continue; // Existing validation/defaults handle non-numbers.
    const span = fields.get(name);
    if (!span || !decimalMatchesNumber(text.slice(span[0], span[1]), input[name]))
      fail(`${name} loses numeric precision or is not finite`);
  }
}
// JSON.parse has already validated the input. Walk the effective intent's
// source once, retaining only whether each last object member is numerically
// faithful. An overwritten duplicate must not change JSON.parse semantics.
// The explicit stack avoids a recursive walk over adversarial nesting.
function validateIntentNumberSource(text, input, command) {
  if (!['route', 'gate'].includes(command)) return;
  const one = (span, key) => lastMembers(text, span, new Set([key])).get(key);
  let span = [skipSpace(text, 0), text.length];
  if (command === 'gate' && input?.ledger !== undefined) span = one(span, 'ledger');
  span = one(span, 'intent');
  if (!span) return; // Ordinary input validation will report the missing intent.
  let at = span[0];
  const stack = [{kind:'root', state:'value', ok:true}];
  function complete(ok) {
    const parent = stack.at(-1);
    if (parent.kind === 'object') {
      if (ok) parent.bad.delete(parent.key); else parent.bad.add(parent.key);
    } else parent.ok &&= ok;
    parent.state = 'after';
  }
  function close(ok) { stack.pop(); complete(ok); }
  while (stack.length) {
    const frame = stack.at(-1);
    if (frame.kind === 'root' && frame.state === 'after') {
      if (at !== span[1]) fail('could not validate intent number sources');
      if (!frame.ok) fail('intent contains a number that loses precision or is not finite');
      return;
    }
    at = skipSpace(text, at);
    if (frame.kind === 'object' && frame.state === 'key') {
      if (text[at] === '}') { at++; close(frame.bad.size === 0); continue; }
      const end = skipString(text, at);
      frame.key = JSON.parse(text.slice(at, end));
      at = skipSpace(text, end);
      if (text[at++] !== ':') fail('could not validate intent number sources');
      frame.state = 'value';
      continue;
    }
    if (frame.state === 'after') {
      const end = frame.kind === 'object' ? '}' : ']';
      if (text[at] === end) {
        at++; close(frame.kind === 'object' ? frame.bad.size === 0 : frame.ok); continue;
      }
      if (text[at++] !== ',') fail('could not validate intent number sources');
      frame.state = frame.kind === 'object' ? 'key' : 'value';
      continue;
    }
    if (frame.kind === 'array' && text[at] === ']') { at++; close(frame.ok); continue; }
    const c = text[at];
    if (c === '{') { at++; stack.push({kind:'object', state:'key', bad:new Set(), key:null}); continue; }
    if (c === '[') { at++; stack.push({kind:'array', state:'value', ok:true}); continue; }
    if (c === '"') { at = skipString(text, at); complete(true); continue; }
    const start = at;
    while (at < span[1] && !',}] \n\r\t'.includes(text[at])) at++;
    if (at === start) fail('could not validate intent number sources');
    const token = text.slice(start, at);
    complete(c === '-' || (c >= '0' && c <= '9') ? decimalMatchesNumber(token, Number(token)) : true);
  }
  fail('could not validate intent number sources');
}
function captureBudgetSources(text, input, command) {
  const one = (span, key) => lastMembers(text, span, new Set([key])).get(key);
  let span = [skipSpace(text, 0), text.length];
  let selected = input;
  if (command === 'gate' && input?.ledger !== undefined) {
    span = one(span, 'ledger');
    selected = input.ledger;
  }
  span = one(span, 'limits');
  const dimensions = ['time_ms', 'tokens', 'cost', 'retries'];
  const entries = lastMembers(text, span, new Set(dimensions));
  for (const kind of dimensions) {
    const limit = selected?.limits?.[kind];
    if (!limit || typeof limit !== 'object' || Array.isArray(limit)) continue;
    const fields = lastMembers(text, entries.get(kind), new Set(['max', 'usage']));
    const record = (parent, key, valueSpan) => {
      if (!valueSpan || !parent || typeof parent !== 'object' || typeof parent[key] !== 'number') return;
      let sources = numberSources.get(parent);
      if (!sources) { sources = new Map(); numberSources.set(parent, sources); }
      sources.set(key, text.slice(valueSpan[0], valueSpan[1]));
    };
    record(limit, 'max', fields.get('max'));
    record(limit.usage, 'value', one(fields.get('usage'), 'value'));
  }
}
function captureCiIdSource(text, input, command) {
  if (command !== 'gate') return;
  const one = (span, key) => lastMembers(text, span, new Set([key])).get(key);
  let span = [skipSpace(text, 0), text.length];
  let selected = input;
  if (input?.ledger !== undefined) {
    span = one(span, 'ledger');
    selected = input.ledger;
  }
  const ci = selected?.ci;
  if (!ci || typeof ci !== 'object' || Array.isArray(ci) || typeof ci.run_id !== 'number') return;
  const idSpan = one(one(span, 'ci'), 'run_id');
  if (!idSpan) return;
  let sources = numberSources.get(ci);
  if (!sources) { sources = new Map(); numberSources.set(ci, sources); }
  sources.set('run_id', text.slice(idSpan[0], idSpan[1]));
}
function requiresBudgetSources(command, input) {
  if (command !== 'route' && command !== 'gate') return false;
  const effectiveInput = command === 'gate' && input?.ledger !== undefined ? input.ledger : input;
  const limits = effectiveInput && typeof effectiveInput === 'object' && !Array.isArray(effectiveInput)
    ? effectiveInput.limits : undefined;
  return !!(limits && typeof limits === 'object' && !Array.isArray(limits) && Object.keys(limits).length > 0);
}
async function main() {
  const command = process.argv[2];
  if (command === '--help' || command === '-h') { process.stdout.write(HELP); return; }
  const compact = command === 'gate' && process.argv.length === 4 && process.argv[3] === '--compact';
  const capture = command === 'run' && process.argv.length === 5 && process.argv[3] === '--receipt';
  if (!['route', 'snapshot', 'run', 'gate'].includes(command) || (process.argv.length !== 3 && !compact && !capture)) fail('expected route, snapshot, run [--receipt <new-path>], gate [--compact], or --help; --compact is only supported by gate');
  let text = '';
  const decoder = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true});
  const decode = (chunk, options) => {
    try { return decoder.decode(chunk, options); } catch { fail('stdin must contain valid UTF-8'); }
  };
  for await (const chunk of process.stdin) { text += decode(chunk, {stream:true}); if (text.length > 10 * 1024 * 1024) fail('input exceeds 10 MiB'); }
  text += decode();
  if (text.length > 10 * 1024 * 1024) fail('input exceeds 10 MiB');
  let input;
  // Preserve ordinary JSON parsing for commands without requested limits.
  // A reviver can overflow on deep, otherwise valid JSON and can use much
  // more memory on large unrelated arrays.
  try { input = JSON.parse(text); } catch { fail('stdin must contain valid JSON'); }
  validateRunNumberSources(text, input, command);
  validateIntentNumberSource(text, input, command);
  // Failure to locate any source must leave receipt precision unverified.
  try { captureReceiptSources(text, input, command); } catch { receiptSources = new WeakMap(); }
  const needsNumberSources = requiresBudgetSources(command, input);
  if (needsNumberSources) {
    try { captureBudgetSources(text, input, command); }
    catch { numberSources = new WeakMap(); }
  }
  // Capture independently of budget parsing: a scan failure must leave the
  // affected CI number unverified without discarding other precision claims.
  try { captureCiIdSource(text, input, command); } catch { /* no source: unverified */ }
  const preparedRun = command === 'run' ? prepareRun(input) : null;
  let fd = null, capturePath = null, reserved = null;
  if (capture) {
    const supplied = process.argv[4];
    if (!wellFormedUnicode(supplied) || !nonemptyString(supplied) || supplied.includes('\0')) fail('invalid receipt path');
    const name = path.basename(supplied);
    const trailingSeparator = process.platform === 'win32' ? /[\\/]$/.test(supplied) : /\/$/.test(supplied);
    if (name === '.' || name === '..' || trailingSeparator) fail('receipt path must name a new file');
    // Resolve the parent through the filesystem before appending the final
    // name: lexical normalization of a symlink followed by .. changes paths.
    const parent = realpathUTF8(path.dirname(supplied), 'receipt parent');
    capturePath = path.join(parent, name);
    const target = preparedRun.target;
    for (const item of target.paths) {
      const selected = path.resolve(target.root, item);
      if (inside(selected, capturePath)) fail('receipt path must be outside the declared target');
    }
    fd = fs.openSync(capturePath, 'wx', 0o600);
    try { reserved = fs.fstatSync(fd); }
    catch (error) {
      try { fs.closeSync(fd); } catch { /* Preserve the original failure. */ }
      fail(`receipt was reserved but runner did not start; inspect the retained file: ${error.code || error.message}`);
    }
  }
  let output;
  try { output = command === 'route' ? route(input) : command === 'snapshot' ? snapshot(object(input, 'input').target) : command === 'run' ? await run(input, preparedRun) : await gate(input); }
  catch (error) {
    if (fd !== null) {
      let closeError;
      try { fs.closeSync(fd); } catch (e) { closeError = e.code || e.message; }
      fail(`receipt was reserved; command may have run, inspect the retained file: ${error.message}${closeError ? `; close failed: ${closeError}` : ''}`);
    }
    throw error;
  }
  if (compact) {
    const { ledger, ...summary } = output;
    output = { ...summary, view: 'compact', ledger_included: false, resumable: false,
      limitations: [...summary.limitations, 'Compact output is not a complete or resumable ledger; retain the original input or full gate result if needed.'] };
  }
  const serialized = `${JSON.stringify(output)}\n`;
  if (fd !== null) {
    let failure = null;
    try {
      let current = fs.lstatSync(capturePath);
      if (!current.isFile() || current.ino !== reserved.ino || current.dev !== reserved.dev) throw new Error('receipt path replaced after reservation');
      const beforeWrite = fs.fstatSync(fd);
      if (beforeWrite.size !== 0 || beforeWrite.mtimeMs !== reserved.mtimeMs || beforeWrite.ctimeMs !== reserved.ctimeMs) throw new Error('reserved receipt was modified before capture');
      fs.writeFileSync(fd, serialized);
      current = fs.lstatSync(capturePath);
      if (!current.isFile() || current.ino !== reserved.ino || current.dev !== reserved.dev) throw new Error('receipt path replaced during capture');
      if (fs.fstatSync(fd).size !== Buffer.byteLength(serialized)) throw new Error('receipt length changed during capture');
    } catch (error) { failure = error; }
    finally { try { fs.closeSync(fd); } catch (error) { failure ||= error; } }
    // Keep a listener through process shutdown: Node can emit the stream error
    // after invoking its write callback. A closed consumer must not obscure
    // that the runner already finished and may have had side effects.
    process.stdout.on('error', () => {});
    const stdoutError = await new Promise(resolve => {
      try { process.stdout.write(serialized, error => resolve(error || null)); }
      catch (error) { resolve(error); }
    });
    if (failure) fail(`receipt capture failed after runner finished; preserve partial file and inspect ${stdoutError ? 'available host evidence (stdout delivery also failed)' : 'stdout'} before retry: ${failure.code || failure.message}`);
    if (stdoutError) fail(`receipt was captured but stdout delivery failed after runner finished; inspect the supplied receipt before retry: ${stdoutError.code || stdoutError.message}`);
    return;
  }
  process.stdout.write(serialized);
}
main().catch(error => { process.stderr.write(`${JSON.stringify({ error: error.message })}\n`); process.exitCode = 2; });
