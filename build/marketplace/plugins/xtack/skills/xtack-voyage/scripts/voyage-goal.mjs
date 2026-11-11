#!/usr/bin/env node
// A local record of coordinator claims; its contents are not authenticated.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const MAX_BYTES = 4 * 1024 * 1024;
const own = (v, k) => Object.prototype.hasOwnProperty.call(v, k);
const identifiedReference = value => typeof value === 'string' && !!value.trim() &&
  !/^(?:unknown|unverified|not known|not verified|not available|n\/a)$/i.test(value.trim());
function fail(message) { throw new Error(message); }
// JSON.parse rounds numbers before validation. Compare only the identity
// fields against their original decimal spellings, without converting large
// exponents to powers of ten. JSON.parse has already checked the syntax.
function decimalParts(text) {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!match) return null;
  const fraction = match[3] || '', digits = match[2] + fraction;
  let first = 0, last = digits.length;
  while (first < last && digits[first] === '0') first++;
  if (first === last) return { sign:'', digits:'0', exponent:0 };
  while (last > first && digits[last - 1] === '0') last--;
  let exponent = match[4] || '0';
  const negative = exponent[0] === '-';
  if (exponent[0] === '+' || negative) exponent = exponent.slice(1);
  exponent = exponent.replace(/^0+/, '') || '0';
  if (exponent.length > 9) return null;
  return { sign:match[1], digits:digits.slice(first, last),
    exponent:(negative ? -Number(exponent) : Number(exponent)) - fraction.length + digits.length - last };
}
function exactNumber(text, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  const a = decimalParts(text), b = decimalParts(String(value));
  return !!a && !!b && a.sign === b.sign && a.digits === b.digits && a.exponent === b.exponent;
}
function skipSpace(text, at) {
  while (at < text.length && ' \n\r\t'.includes(text[at])) at++;
  return at;
}
function skipString(text, at) {
  at++;
  while (at < text.length) {
    if (text[at] === '\\') { at += 2; continue; }
    if (text[at++] === '"') return at;
  }
  fail('invalid JSON while checking number precision');
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
    if (depth) fail('invalid JSON while checking number precision');
    return at;
  }
  while (at < text.length && !',}] \n\r\t'.includes(text[at])) at++;
  return at;
}
function lastMembers(text, span, names) {
  const found = new Map();
  if (!span || text[span[0]] !== '{') return found;
  const longest = Math.max(...[...names].map(name => name.length)) * 6 + 2;
  let at = skipSpace(text, span[0] + 1);
  while (text[at] !== '}') {
    const start = at;
    at = skipString(text, at);
    const key = at - start <= longest ? JSON.parse(text.slice(start, at)) : undefined;
    at = skipSpace(text, at);
    if (text[at++] !== ':') fail('invalid JSON while checking number precision');
    at = skipSpace(text, at);
    const valueStart = at;
    at = skipValue(text, at);
    if (names.has(key)) found.set(key, [valueStart, at]);
    at = skipSpace(text, at);
    if (text[at] === ',') at = skipSpace(text, at + 1);
    else if (text[at] !== '}') fail('invalid JSON while checking number precision');
  }
  return found;
}
function arraySpans(text, span) {
  const result = [];
  if (!span || text[span[0]] !== '[') return result;
  let at = skipSpace(text, span[0] + 1);
  while (text[at] !== ']') {
    const start = at;
    at = skipValue(text, at); result.push([start, at]);
    at = skipSpace(text, at);
    if (text[at] === ',') at = skipSpace(text, at + 1);
    else if (text[at] !== ']') fail('invalid JSON while checking number precision');
  }
  return result;
}
function checkNumber(text, span, parent, key, label, stored) {
  if (typeof parent?.[key] !== 'number') return; // Ordinary validation handles other types.
  if (!span || !exactNumber(text.slice(span[0], span[1]), parent[key]))
    fail(`${label} loses numeric precision; ${stored ? 'preserve original record bytes for manual investigation' : 'supply the exact revision anchor'}`);
}
function checkRecordNumbers(text, record, filename) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return;
  const root = [skipSpace(text, 0), text.length];
  const fields = lastMembers(text, root, new Set(['version', 'revision', 'previous', 'constraint_history']));
  for (const key of ['version', 'revision']) checkNumber(text, fields.get(key), record, key, `${filename}: record.${key}`, true);
  const previous = lastMembers(text, fields.get('previous'), new Set(['revision']));
  checkNumber(text, previous.get('revision'), record.previous, 'revision', `${filename}: record.previous.revision`, true);
  if (Array.isArray(record.constraint_history)) {
    const spans = arraySpans(text, fields.get('constraint_history'));
    for (const [index, item] of record.constraint_history.entries()) {
      const entry = lastMembers(text, spans[index], new Set(['revision']));
      checkNumber(text, entry.get('revision'), item, 'revision', `${filename}: record.constraint_history[${index}].revision`, true);
    }
  }
}
function checkInputAnchor(text, input, command) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return;
  const key = command === 'show' ? 'minimum_revision' : command === 'update' ? 'expected_revision' : null;
  if (!key) return;
  const fields = lastMembers(text, [skipSpace(text, 0), text.length], new Set([key]));
  checkNumber(text, fields.get(key), input, key, key, false);
}
function readBounded(fd, limit, error) {
  let bytes = Buffer.allocUnsafe(Math.min(64 * 1024, limit + 1));
  let total = 0;
  for (;;) {
    if (total === bytes.length) {
      const larger = Buffer.allocUnsafe(Math.min(bytes.length * 2, limit + 1));
      bytes.copy(larger, 0, 0, total);
      bytes = larger;
    }
    let count;
    try { count = fs.readSync(fd, bytes, total, bytes.length - total, null); }
    catch (e) { if (e.code === 'EINTR') continue; throw e; }
    if (count === 0) return bytes.subarray(0, total);
    total += count;
    if (total > limit) fail(error);
  }
}
function object(value, name, allowed, required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${name} has unknown field ${key}`);
  for (const key of required) if (!own(value, key)) fail(`${name} missing ${key}`);
}
function string(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be a nonempty string`);
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
function goalPath(value) {
  string(value, 'file');
  if (!wellFormedUnicode(value)) fail('file contains an unpaired UTF-16 surrogate');
}
function strings(value, name, unique = true) {
  if (!Array.isArray(value)) fail(`${name} must be an array`);
  value.forEach((v) => string(v, name));
  if (unique && new Set(value).size !== value.length) fail(`${name} has duplicates`);
}
function entries(value, name, fields, required, validate) {
  if (!Array.isArray(value)) fail(`${name} must be an array`);
  const ids = new Set();
  for (const item of value) {
    object(item, name, fields, required);
    string(item.id, `${name}.id`);
    if (ids.has(item.id)) fail(`${name} has duplicate id`);
    ids.add(item.id);
    validate(item);
  }
  return ids;
}
function validate(record, {allowUnreadyDependencies = () => false} = {}) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) fail('record must be an object');
  if (record.version !== 2) fail('unsupported goal version; preserve it for manual review');
  object(record, 'record', ['version','goal_id','revision','previous','original_request','original_constraints','constraints','constraint_history','steering','criteria','units','evidence','status'], ['version','goal_id','revision','previous','original_request','original_constraints','constraints','constraint_history','steering','criteria','units','evidence','status']);
  string(record.goal_id, 'goal_id');
  if (!Number.isSafeInteger(record.revision) || record.revision < 1) fail('invalid revision');
  if (record.revision === 1) {
    if (record.previous !== null) fail('first revision must not have a predecessor');
  } else {
    object(record.previous, 'previous', ['revision','sha256'], ['revision','sha256']);
    if (record.previous.revision !== record.revision - 1 || typeof record.previous.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.previous.sha256)) fail('invalid predecessor');
  }
  string(record.original_request, 'original_request');
  strings(record.original_constraints, 'original_constraints');
  strings(record.constraints, 'constraints');
  strings(record.steering, 'steering', false);
  if (!Array.isArray(record.constraint_history)) fail('constraint_history must be an array');
  const steeringEntries = record.constraint_history.length ? new Set(record.steering) : null;
  let lastRevision = 1;
  for (const item of record.constraint_history) {
    object(item, 'constraint_history entry', ['revision','constraints','steering'], ['revision','constraints','steering']);
    if (!Number.isSafeInteger(item.revision) || item.revision <= lastRevision || item.revision > record.revision) fail('invalid constraint history revision');
    strings(item.constraints, 'constraint_history.constraints');
    string(item.steering, 'constraint_history.steering');
    if (!steeringEntries.has(item.steering)) fail('constraint history steering missing');
    lastRevision = item.revision;
  }
  const lastConstraints = record.constraint_history.length ? record.constraint_history.at(-1).constraints : record.original_constraints;
  if (JSON.stringify(lastConstraints) !== JSON.stringify(record.constraints)) fail('constraint history does not match current constraints');
  const evidence = entries(record.evidence, 'evidence', ['id','description','reference'], ['id','description','reference'], e => {
    string(e.description, 'evidence.description'); string(e.reference, 'evidence.reference');
  });
  const criteria = entries(record.criteria, 'criteria', ['id','description','status','evidence_ids'], ['id','description','status','evidence_ids'], c => {
    string(c.description, 'criteria.description');
    if (!['pending','met','unmet','unverified'].includes(c.status)) fail('invalid criterion status');
    strings(c.evidence_ids, 'criteria.evidence_ids');
    for (const id of c.evidence_ids) if (!evidence.has(id)) fail('unknown evidence reference');
  });
  const unitIds = entries(record.units, 'units', ['id','outcome','status','criterion_ids','depends_on'], ['id','outcome','status','criterion_ids','depends_on'], u => {
    string(u.outcome, 'units.outcome');
    if (!['pending','in_progress','completed'].includes(u.status)) fail('invalid unit status');
    strings(u.criterion_ids, 'units.criterion_ids');
    strings(u.depends_on, 'units.depends_on');
    for (const id of u.criterion_ids) if (!criteria.has(id)) fail('unknown criterion reference');
  });
  const unitsById = new Map(record.units.map(u => [u.id, u]));
  const visited = new Set(), visiting = new Set();
  for (const unit of record.units) {
    if (visited.has(unit.id)) continue;
    const stack = [{unit, next:0}];
    visiting.add(unit.id);
    while (stack.length) {
      const frame = stack.at(-1);
      if (frame.check) {
        if (frame.unit.status !== 'pending' && frame.check.status !== 'completed' &&
            !allowUnreadyDependencies(frame.unit, frame.check)) fail('started unit requires completed dependencies');
        frame.check = null;
      }
      if (frame.next === frame.unit.depends_on.length) {
        visiting.delete(frame.unit.id); visited.add(frame.unit.id); stack.pop();
        continue;
      }
      const id = frame.unit.depends_on[frame.next++];
      if (!unitIds.has(id)) fail('unknown unit dependency');
      const dependency = unitsById.get(id);
      if (visiting.has(id)) fail('cyclic unit dependencies');
      frame.check = dependency;
      if (!visited.has(id)) { visiting.add(id); stack.push({unit:dependency, next:0}); }
    }
  }
  if (!['active','blocked','completed'].includes(record.status)) fail('invalid goal status');
  if (record.status === 'completed') {
    if (!record.criteria.length || !record.units.length) fail('completed goal requires criteria and units');
    if (record.criteria.some(c => c.status !== 'met' || !c.evidence_ids.length)) fail('completed goal requires met criteria with evidence');
    if (record.units.some(u => u.status !== 'completed')) fail('completed goal requires completed units');
    const linked = new Set(record.units.flatMap(u => u.criterion_ids));
    if (record.criteria.some(c => !linked.has(c.id))) fail('completed goal requires each criterion linked to a unit');
    const contributing = new Set();
    const pending = record.units.filter(u => u.criterion_ids.length);
    while (pending.length) {
      const unit = pending.pop();
      if (contributing.has(unit.id)) continue;
      contributing.add(unit.id);
      for (const id of unit.depends_on) pending.push(unitsById.get(id));
    }
    if (record.units.some(u => !contributing.has(u.id))) fail('completed goal contains an unrelated unit');
  }
}
function readRecord(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile()) fail('goal path must be a regular file, not a symlink');
  if (stat.size > MAX_BYTES) fail('goal record too large');
  // If the checked file is replaced by a FIFO, avoid blocking before fstat
  // can reject it on platforms supporting nonblocking opens.
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0);
  const fd = fs.openSync(file, flags);
  try {
    const actual = fs.fstatSync(fd);
    if (!actual.isFile() || actual.dev !== stat.dev || actual.ino !== stat.ino || actual.size > MAX_BYTES) fail('goal path changed while reading');
    const bytes = readBounded(fd, MAX_BYTES, 'goal record too large');
    let contents;
    try { contents = new TextDecoder('utf-8', {fatal:true}).decode(bytes); } catch { fail('invalid goal UTF-8'); }
    let record;
    try { record = JSON.parse(contents); } catch { fail('invalid goal JSON'); }
    checkRecordNumbers(contents, record, path.basename(file));
    validate(record);
    return { record, hash:createHash('sha256').update(bytes).digest('hex') };
  } finally { fs.closeSync(fd); }
}
function directoryStat(dir) {
  // A trailing separator or dot makes lstat follow a final symlink on POSIX.
  // Strip only those suffixes for the entry check; do not normalize any `..`.
  // POSIX permits exactly two leading slashes to have implementation-defined meaning.
  const root = process.platform !== 'win32' && dir.startsWith('//') && !dir.startsWith('///')
    ? '//' : path.parse(dir).root;
  const trailing = process.platform === 'win32' ? /[\\/]+$/ : /\/+$/;
  const dot = process.platform === 'win32' ? /[\\/]\.$/ : /\/\.$/;
  let entry = dir;
  // Do not turn a POSIX root with three or more slashes into the distinct // form.
  const posixRootOnly = process.platform !== 'win32' && /^\/+(?:\.(?:\/+|$))*$/.test(dir);
  while (!posixRootOnly) {
    const withoutTrailing = entry.replace(trailing, '');
    if (withoutTrailing && withoutTrailing.length >= root.length) entry = withoutTrailing;
    const withoutDot = entry.replace(dot, '');
    if (!withoutDot || withoutDot.length < root.length || withoutDot === entry) break;
    entry = withoutDot;
  }
  const stat = fs.lstatSync(entry);
  if (!stat.isDirectory()) fail('goal path must be a directory, not a symlink');
  return stat;
}
function childPath(dir, child) {
  // Do not normalize: a symlink followed by .. is resolved by the filesystem.
  const bareDrive = process.platform === 'win32' && /^[A-Za-z]:$/.test(dir);
  const trailingSeparator = process.platform === 'win32' ? /[\\/]$/.test(dir) : dir.endsWith('/');
  return dir + (bareDrive || trailingSeparator ? '' : path.sep) + child;
}
function readGoal(dir) {
  const before = directoryStat(dir);
  const names = fs.readdirSync(dir).filter(n => /^\d+\.json$/.test(n));
  if (!names.length) fail('goal has no published revision');
  const revisions = names.map(n => {
    const number = Number(n.slice(0, -5));
    if (!Number.isSafeInteger(number) || number < 1 || n !== `${number}.json`) fail('invalid revision filename');
    return number;
  }).sort((a,b) => a-b);
  let prior;
  for (let i = 0; i < revisions.length; i++) {
    if (revisions[i] !== i + 1) fail('missing goal revision');
    const current = readRecord(childPath(dir, `${revisions[i]}.json`));
    if (current.record.revision !== revisions[i]) fail('revision filename mismatch');
    if (prior) {
      const a = prior.record, b = current.record;
      if (b.previous.sha256 !== prior.hash || b.goal_id !== a.goal_id || b.original_request !== a.original_request ||
          JSON.stringify(b.original_constraints) !== JSON.stringify(a.original_constraints) ||
          JSON.stringify(b.steering.slice(0, a.steering.length)) !== JSON.stringify(a.steering) ||
          JSON.stringify(b.constraint_history.slice(0, a.constraint_history.length)) !== JSON.stringify(a.constraint_history)) fail('goal revision chain mismatch');
    }
    prior = current;
  }
  const after = directoryStat(dir);
  if (before.dev !== after.dev || before.ino !== after.ino) fail('goal directory changed while reading');
  return {...prior, dirStat:after};
}
function syncDirectory(dir, expected) {
  // Directory fsync is not supported on every host; atomicity and durability differ.
  let fd;
  try {
    const flags = fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0) |
      (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_DIRECTORY || 0);
    fd = fs.openSync(dir, flags);
    const actual = fs.fstatSync(fd);
    if (!actual.isDirectory() || (expected && (actual.dev !== expected.dev || actual.ino !== expected.ino))) return 'unverified';
    fs.fsyncSync(fd);
    if (expected) {
      const current = directoryStat(dir);
      if (current.dev !== expected.dev || current.ino !== expected.ino) return 'unverified';
    }
    return 'confirmed';
  }
  catch { return 'unverified'; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
function normalizeUnits(units) {
  if (!Array.isArray(units)) return units;
  return units.map(u => u && typeof u === 'object' && !Array.isArray(u) && !own(u, 'depends_on')
    ? {...u, depends_on:[]} : u);
}
function criteriaWithoutIdentifiedReferences(record) {
  const evidenceById = new Map(record.evidence.map(item => [item.id, item]));
  return record.criteria.filter(criterion => !criterion.evidence_ids.some(id => identifiedReference(evidenceById.get(id)?.reference)))
    .map(criterion => criterion.id);
}
function serializeRecord(record) {
  const data = JSON.stringify(record, null, 2) + '\n';
  if (Buffer.byteLength(data) > MAX_BYTES) fail('goal record too large');
  return data;
}
function writeRecord(dir, record, dirStat, data = serializeRecord(record)) {
  const file = childPath(dir, `${record.revision}.json`);
  const tmp = childPath(dir, `.${randomUUID()}.tmp`);
  let fd, tmpStat;
  let made = false;
  try {
    fd = fs.openSync(tmp, 'wx', 0o600); made = true;
    tmpStat = fs.fstatSync(fd);
    fs.writeFileSync(fd, data); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    const now = directoryStat(dir);
    if (now.dev !== dirStat.dev || now.ino !== dirStat.ino) fail('goal directory changed during update');
    // A revision is published once, without replacing an existing path.
    fs.linkSync(tmp, file);
    const published = fs.lstatSync(file);
    if (!published.isFile() || published.dev !== tmpStat.dev || published.ino !== tmpStat.ino)
      fail('published revision identity changed; inspect the goal before retrying');
    const durability = syncDirectory(dir, dirStat);
    return durability;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (made && tmpStat) {
      try {
        const currentDir = directoryStat(dir), currentTemp = fs.lstatSync(tmp);
        if (currentDir.dev === dirStat.dev && currentDir.ino === dirStat.ino && currentTemp.isFile() &&
            currentTemp.dev === tmpStat.dev && currentTemp.ino === tmpStat.ino) fs.unlinkSync(tmp);
      } catch {}
    }
  }
}
function run(command, input) {
  if (command === 'create') {
    object(input, 'input', ['file','original_request','constraints','criteria','units','evidence'], ['file','original_request']);
    goalPath(input.file);
    const initialConstraints = own(input, 'constraints') ? input.constraints : [];
    const record = {version: 2, goal_id: randomUUID(), revision: 1, previous:null, original_request: input.original_request,
      original_constraints: initialConstraints, constraints: initialConstraints, constraint_history: [], steering: [], criteria: own(input, 'criteria') ? input.criteria : [], units: normalizeUnits(own(input, 'units') ? input.units : []), evidence: own(input, 'evidence') ? input.evidence : [], status: 'active'};
    validate(record);
    const data = serializeRecord(record);
    fs.mkdirSync(input.file, {mode:0o700});
    const dirStat = directoryStat(input.file);
    const durability = writeRecord(input.file, record, dirStat, data);
    const parentDurability = syncDirectory(childPath(input.file, '..'));
    return {record, authenticity:'unverified', history_completeness:'unverified', durability: durability === 'confirmed' && parentDurability === 'confirmed' ? 'confirmed' : 'unverified'};
  }
  if (command === 'show') {
    object(input, 'input', ['file','goal_id','minimum_revision'], ['file']); goalPath(input.file);
    if (own(input, 'goal_id')) string(input.goal_id, 'goal_id');
    if (own(input, 'minimum_revision') && (!Number.isSafeInteger(input.minimum_revision) || input.minimum_revision < 1)) fail('invalid minimum_revision');
    const record = readGoal(input.file).record;
    if (own(input, 'goal_id') && record.goal_id !== input.goal_id) fail('goal identity conflict');
    if (own(input, 'minimum_revision') && record.revision < input.minimum_revision) fail('goal revision is older than minimum_revision');
    const missingReferences = record.status === 'completed' ? criteriaWithoutIdentifiedReferences(record) : [];
    return {record, authenticity:'unverified', history_completeness:'unverified',
      ...(missingReferences.length ? {completion_warnings:[{code:'unidentified_references', criterion_ids:missingReferences}]} : {})};
  }
  if (command === 'update') {
    object(input, 'input', ['file','goal_id','expected_revision','changes','steering'], ['file','goal_id','expected_revision','changes']);
    goalPath(input.file); string(input.goal_id, 'goal_id');
    if (!Number.isSafeInteger(input.expected_revision) || input.expected_revision < 1) fail('invalid expected_revision');
    object(input.changes, 'changes', ['constraints','criteria','units','evidence','status']);
    if (own(input, 'steering')) string(input.steering, 'steering');
    if (!Object.keys(input.changes).length && !own(input, 'steering')) fail('empty update');
      const {record, hash, dirStat} = readGoal(input.file);
      if (record.goal_id !== input.goal_id) fail('goal identity conflict');
      if (record.revision !== input.expected_revision) fail('revision conflict');
      if (record.revision === Number.MAX_SAFE_INTEGER) fail('revision exhausted');
      if (record.status === 'completed' && !['active','blocked'].includes(input.changes.status)) fail('completed goal requires explicit reopening before update');
      const changes = {...input.changes};
      if (own(changes, 'units')) changes.units = normalizeUnits(changes.units);
      const constraintsChanged = own(changes, 'constraints') && JSON.stringify(changes.constraints) !== JSON.stringify(record.constraints);
      if (constraintsChanged && !own(input, 'steering')) fail('constraint changes require explicit steering');
      let next = {...record, ...changes, revision: record.revision + 1, previous:{revision:record.revision, sha256:hash},
        steering: own(input, 'steering') ? [...record.steering, input.steering] : record.steering,
        constraint_history: constraintsChanged ? [...record.constraint_history, {revision:record.revision + 1, constraints:changes.constraints, steering:input.steering}] : record.constraint_history};
      // Check the submitted structure before examining arrays. A definition or
      // evidence change can invalidate started units, so check readiness only
      // after applying that reassessment; no invalid state is published.
      const priorUnits = new Map(record.units.map(unit => [unit.id, unit]));
      validate(next, {allowUnreadyDependencies:unit => {
        const prior = priorUnits.get(unit.id);
        return !!prior && prior.status !== 'pending' && prior.status === unit.status;
      }});
      const definitions = r => JSON.stringify({constraints:r.constraints,
        criteria:r.criteria.map(({id, description}) => ({id, description})),
        units:r.units.map(({id, outcome, criterion_ids, depends_on}) => ({id, outcome,
          criterion_ids:[...criterion_ids].sort(), depends_on:[...depends_on].sort()}))});
      const oldEvidence = new Map(record.evidence.map(e => [e.id, e]));
      const nextEvidence = new Map(next.evidence.map(e => [e.id, e]));
      const referenced = new Set(record.criteria.filter(c => ['met','unmet'].includes(c.status)).flatMap(c => c.evidence_ids));
      const nextCriteria = new Map(next.criteria.map(c => [c.id, c]));
      const removedVerdictEvidence = record.criteria.some(c => {
        const updated = nextCriteria.get(c.id);
        return ['met','unmet'].includes(c.status) && updated?.status === c.status &&
          c.evidence_ids.some(id => !updated.evidence_ids.includes(id));
      });
      // Validation limits evidence to these fields. JSON object key order is
      // not part of an observation, but an actual value change still is.
      const evidenceChanged = removedVerdictEvidence || [...referenced].some(id => {
        const previous = oldEvidence.get(id), current = nextEvidence.get(id);
        return !current || previous.description !== current.description || previous.reference !== current.reference;
      });
      const steeringProvided = own(input, 'steering');
      const definitionsChanged = definitions(record) !== definitions(next);
      if (steeringProvided || definitionsChanged || evidenceChanged) {
        if (next.status === 'completed') {
          const causes = [steeringProvided && 'steering', definitionsChanged && 'definitions', evidenceChanged && 'referenced evidence'].filter(Boolean);
          fail(`changed requirements or evidence require reassessment before completion (${causes.join(', ')})`);
        }
        next = {...next,
          criteria: next.criteria.map(c => ['met','unmet'].includes(c.status) ? {...c, status:'unverified', evidence_ids:[]} : c),
          units: next.units.map(u => u.depends_on.length && u.status !== 'pending'
            ? {...u, status:'pending'}
            : u.status === 'completed' ? {...u, status:'in_progress'} : u)};
      }
      validate(next);
      if (next.status === 'completed') {
        if (criteriaWithoutIdentifiedReferences(next).length)
          fail('completed goal requires an identified evidence reference for each criterion');
      }
      const durability = writeRecord(input.file, next, dirStat);
      return {record: next, authenticity:'unverified', history_completeness:'unverified', durability};
  }
  fail('expected create, show, or update');
}
try {
  const args = process.argv.slice(2);
  const help = ['--help', '-h'];
  if ((args.length === 1 && help.includes(args[0])) ||
      (args.length === 2 && ['create', 'show', 'update'].includes(args[0]) && help.includes(args[1]))) {
    process.stdout.write(`Usage: node voyage-goal.mjs <create|show|update> < input.json

Provide one UTF-8 JSON object on stdin. "file" is the goal directory.
  create: file, original_request; optional constraints, criteria, units, evidence
  show:   file; optional goal_id, minimum_revision
  update: file, goal_id, expected_revision, changes; optional steering

Update arrays replace the current arrays. On revision conflict, show the current
goal and reconcile changes before retrying. Operations return JSON; help is text.
For complete fields, examples and recovery guidance, read GOAL.md beside this script.
`);
    if (args[0] === 'show') process.stdout.write(`
Example stdin JSON (replace the directory, ID, and revision with actual values):
{"file":"/permitted/path/goal","goal_id":"OBSERVED-ID","minimum_revision":1}
The ID and minimum revision are optional independent anchors, not authentication.
`);
    if (args[0] === 'update') process.stdout.write(`
Example stdin JSON (replace the directory, ID, revision, and changes; this writes):
{"file":"/permitted/path/goal","goal_id":"OBSERVED-ID","expected_revision":1,"changes":{"status":"blocked"}}
Changes may contain constraints, criteria, units, evidence, or status.
Criterion: id, description, status (pending|met|unmet|unverified), evidence_ids.
Unit: id, outcome, status (pending|in_progress|completed), criterion_ids, depends_on.
Evidence: id, description, reference. Supplied arrays replace whole arrays.
Show the identified goal first; preserve current contributions, links and dependencies.
On conflict or uncertain write outcome, inspect the error and reread before reconciling.
Definition, referenced evidence, constraint or steering changes can require reassessment.
Steering must be an actual user instruction. Respect content and write boundaries.
Safely serialize and quote actual values; see GOAL.md for conditions and recovery.
`);
  } else {
    if (args.length > 1 && ['create', 'show', 'update'].includes(args[0]))
      fail('expected create, show, or update; pass one JSON object on stdin; use --help');
    if (process.argv.length !== 3) fail('expected create, show, or update');
    const bytes = readBounded(0, MAX_BYTES, 'input too large');
    let raw;
    try { raw = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true}).decode(bytes); }
    catch { fail('invalid input UTF-8'); }
    let input;
    try { input = JSON.parse(raw); } catch { fail('invalid input JSON'); }
    checkInputAnchor(raw, input, process.argv[2]);
    let locator;
    if (input && typeof input === 'object' && !Array.isArray(input) && own(input, 'include_locator')) {
      if (typeof input.include_locator !== 'boolean') fail('include_locator must be a boolean');
      if (input.include_locator) {
        goalPath(input.file);
        if (process.platform === 'win32' && (/^[A-Za-z]:(?![\\/])/.test(input.file) || /^[\\/](?![\\/])/.test(input.file)))
          fail('include_locator requires a fully qualified or ordinary relative Windows path');
        let cwd;
        if (!path.isAbsolute(input.file)) {
          cwd = process.cwd();
          if (process.platform !== 'win32' && (!wellFormedUnicode(cwd) || !Buffer.from(cwd, 'utf8').equals(fs.realpathSync.native('.', {encoding:'buffer'}))))
            fail('cwd cannot be faithfully represented in a locator');
        }
        locator = {file:input.file, ...(cwd !== undefined ? {cwd} : {})};
      }
      const {include_locator, ...request} = input;
      input = request;
    }
    const result = run(process.argv[2], input);
    process.stdout.write(JSON.stringify(locator ? {...result, locator} : result) + '\n');
  }
} catch (error) {
  process.stderr.write(JSON.stringify({error: error.message}) + '\n');
  process.exitCode = 1;
}
