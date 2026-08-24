// Archive committed bundles without resolving dependencies or rebuilding them.
import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

const root = fs.realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const area = "build/marketplace/plugins";
const catalogs = [
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
];
const tag = process.argv[2];
let work;
let preserveBackup = false;

function fail(message) {
  throw new Error(message);
}
function stat(file) {
  try {
    return fs.lstatSync(file);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
function safe(relative) {
  const file = path.resolve(root, relative);
  const parts = path.relative(root, file).split(path.sep);
  if (parts[0] === ".." || path.isAbsolute(path.relative(root, file)))
    fail(`Unsafe path: ${relative}`);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    if (stat(current)?.isSymbolicLink())
      fail(`Symlink is not allowed: ${current}`);
  }
  return file;
}
function files(relative) {
  const file = safe(relative);
  const info = stat(file);
  if (info?.isFile()) return [relative];
  if (!info?.isDirectory())
    fail(`Missing/non-regular bundle path: ${relative}`);
  return fs
    .readdirSync(file)
    .sort()
    .flatMap((name) => files(`${relative}/${name}`));
}
function git(...args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_ATTR_NOSYSTEM: "1" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    fail(`git ${args[0]} failed: ${result.stderr.trim()}`);
  return result.stdout;
}
function readJson(relative) {
  try {
    return JSON.parse(fs.readFileSync(safe(relative), "utf8"));
  } catch (error) {
    fail(`Cannot read ${relative}: ${error.message}`);
  }
}

try {
  if (
    process.argv.length > 3 ||
    (tag &&
      !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(tag))
  )
    fail("Usage: node tools/archive.mjs [vX.Y.Z]");
  const commit = git("rev-parse", "--verify", "HEAD^{commit}").trim();
  const tracked = git(
    "ls-tree",
    "-r",
    "-z",
    "--name-only",
    commit,
    "--",
    ...catalogs,
    area,
  )
    .split("\0")
    .filter(Boolean)
    .sort();
  const actual = [...catalogs.flatMap(files), ...files(area)].sort();
  if (!isDeepStrictEqual(actual, tracked))
    fail(
      "Distribution must match tracked HEAD files; missing or untracked payload found.",
    );
  git(
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--exit-code",
    commit,
    "--",
    ...catalogs,
    area,
  );
  // git archive honors attributes. Reject bundle attributes rather than silently omitting/substituting payload.
  if (actual.some((file) => path.basename(file) === ".gitattributes"))
    fail("Bundle .gitattributes is not supported for snapshot archives.");
  const infoAttributes = path.resolve(
    root,
    git("rev-parse", "--git-path", "info/attributes").trim(),
  );
  if (stat(infoAttributes)?.size)
    fail("Local Git info/attributes could change archive contents.");
  const published = readJson(catalogs[0]).plugins;
  if (!Array.isArray(published)) fail("Invalid marketplace plugins.");
  const names = new Set();
  const bundles = fs
    .readdirSync(safe(area))
    .sort()
    .map((folder) => {
      const relative = `${area}/${folder}`;
      if (!stat(safe(relative))?.isDirectory())
        fail(`Expected a bundle directory: ${relative}`);
      const metadata = readJson(`${relative}/plugin.json`);
      for (const key of ["name", "version", "description"])
        if (typeof metadata[key] !== "string" || !metadata[key].trim())
          fail(`Missing bundle ${key}: ${relative}`);
      for (const key of ["name", "version"])
        if (!/^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(metadata[key]))
          fail(`Unsafe bundle ${key}: ${relative}`);
      const name = `${metadata.name}-${metadata.version}`;
      if (names.has(name)) fail(`Duplicate archive: ${name}.zip`);
      names.add(name);
      if (
        tag &&
        published.some((entry) => entry.source === `./${relative}`) &&
        metadata.version !== tag.slice(1)
      )
        fail(
          `Tag ${tag} does not match published ${metadata.name} version ${metadata.version}.`,
        );
      return { relative, name };
    });
  if (!bundles.length) fail("No committed bundles found.");
  const destination = safe("build/archive");
  if (stat(destination)) files("build/archive");
  if (stat(destination) && !stat(destination).isDirectory())
    fail("build/archive must be a directory.");
  work = fs.mkdtempSync(path.join(safe("build"), ".archive."));
  const staged = path.join(work, "output");
  fs.mkdirSync(staged);
  const attributes = path.join(work, "empty-attributes");
  fs.writeFileSync(attributes, "");
  for (const { relative, name } of bundles) {
    git(
      "-c",
      `core.attributesFile=${attributes}`,
      "archive",
      "--format=zip",
      `--prefix=${name}/`,
      `--output=${path.join(staged, `${name}.zip`)}`,
      `${commit}:${relative}`,
    );
  }
  const backup = path.join(work, "previous");
  const existed = Boolean(stat(destination));
  if (existed) fs.renameSync(destination, backup);
  try {
    fs.renameSync(staged, destination);
  } catch (error) {
    if (existed) {
      try {
        fs.renameSync(backup, destination);
      } catch (rollbackError) {
        preserveBackup = true;
        console.error(
          `Rollback failed: ${rollbackError.message}; backup retained at ${backup}`,
        );
      }
    }
    throw error;
  }
  console.log(
    `Archived ${bundles.length} committed bundle(s) from ${commit}; no rebuild.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (work && !preserveBackup)
    fs.rmSync(work, { recursive: true, force: true });
}
