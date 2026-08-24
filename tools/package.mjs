// Local packaging adapter. APM owns YAML metadata and dependency/plugin export.
import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogs = [
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
];
const pluginArea = "build/marketplace/plugins";
const task = process.argv[2];
let work;
let keepWork = false;

function fail(message, code = 1) {
  throw Object.assign(new Error(message), { exitCode: code });
}

function stat(file) {
  try {
    return fs.lstatSync(file);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

// Check every ancestor as well as the leaf, including dangling symlinks.
function safe(file) {
  const relative = path.relative(root, path.resolve(file));
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    fail(`Path escapes project: ${file}`);
  }
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (stat(current)?.isSymbolicLink())
      fail(`Symlink is not allowed: ${current}`);
  }
  return file;
}

function tree(file) {
  safe(file);
  const info = stat(file);
  if (!info) fail(`Missing output/source: ${file}`);
  if (info.isFile()) return [""];
  if (!info.isDirectory()) fail(`Not a regular file/directory: ${file}`);
  return fs
    .readdirSync(file)
    .sort()
    .flatMap((name) =>
      tree(path.join(file, name)).map((child) => path.join(name, child)),
    );
}

function json(file) {
  safe(file);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`Cannot read JSON ${file}: ${error.message}`);
  }
}

function apm(cwd, ...args) {
  const result = spawnSync("apm", args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    fail(
      `apm ${args[0]} failed (${result.status ?? result.signal})`,
      result.status === 3 ? 3 : 1,
    );
}

function discover() {
  const dir = safe(path.join(root, "plugins"));
  return fs
    .readdirSync(dir)
    .sort()
    .filter((folder) => {
      const source = safe(path.join(dir, folder));
      return (
        stat(source)?.isDirectory() &&
        stat(safe(path.join(source, "apm.yml")))?.isFile()
      );
    });
}

function localFolder(source) {
  if (typeof source !== "string" || !source.startsWith("./"))
    fail(`Unsupported local source: ${source}`);
  const parts = source.replace(/\/$/, "").split("/");
  if (
    parts.length !== 3 ||
    parts[1] !== "plugins" ||
    !parts[2] ||
    [".", ".."].includes(parts[2]) ||
    parts[2].includes("\\")
  ) {
    fail(`Local sources must be ./plugins/<folder>: ${source}`);
  }
  const folder = parts[2];
  const manifest = safe(path.join(root, "plugins", folder, "apm.yml"));
  if (!stat(manifest)?.isFile())
    fail(`Local source requires apm.yml: ${manifest}`);
  return folder;
}

function expectedCatalogs() {
  const files = catalogs.map((_, i) => path.join(work, `catalog-${i}.json`));
  apm(
    root,
    "pack",
    "--offline",
    "--check-versions",
    "--marketplace",
    "claude,codex",
    "--marketplace-path",
    `claude=${path.relative(root, files[0])}`,
    "--marketplace-path",
    `codex=${path.relative(root, files[1])}`,
  );
  const published = [];
  files.forEach((file, i) => {
    const catalog = json(file);
    if (!Array.isArray(catalog.plugins)) fail(`Invalid catalog: ${file}`);
    for (const plugin of catalog.plugins) {
      // Only local references change; remote entries and all APM metadata stay intact.
      const local =
        i === 0
          ? typeof plugin.source === "string" &&
            /^(\.\.?\/|\/)/.test(plugin.source)
          : plugin.source?.source === "local";
      if (!local) continue;
      const folder = localFolder(i === 0 ? plugin.source : plugin.source.path);
      const mapped = `./${pluginArea}/${folder}`;
      if (i === 0) {
        published.push({
          folder,
          ...Object.fromEntries(
            ["name", "version", "description"].map((key) => [key, plugin[key]]),
          ),
        });
        plugin.source = mapped;
      } else {
        plugin.source.path = mapped;
      }
    }
    fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + "\n");
  });
  return { files, published };
}

function metadata(bundle) {
  const value = json(path.join(bundle, "plugin.json"));
  if (
    Object.hasOwn(value, "$schema") ||
    ["name", "version", "description"].some(
      (key) => typeof value[key] !== "string" || !value[key].trim(),
    )
  )
    fail(`Invalid APM-installable bundle metadata: ${bundle}`);
  for (const key of ["name", "version"]) {
    if (/[\\/\x00-\x1f]/.test(value[key]) || [".", ".."].includes(value[key]))
      fail(`Unsafe ${key}: ${value[key]}`);
  }
  return value;
}

function validate(folders, bundles, published) {
  const names = new Set();
  for (const folder of folders) {
    const bundle = path.join(bundles, folder);
    tree(bundle);
    const value = metadata(bundle);
    const archive = `${value.name}-${value.version}.zip`;
    if (names.has(archive)) fail(`Release archive name collision: ${archive}`);
    names.add(archive);
    for (const entry of published.filter((entry) => entry.folder === folder)) {
      for (const key of ["name", "version", "description"]) {
        if (entry[key] !== value[key])
          fail(`Built ${key} differs from source catalog: ${folder}`);
      }
    }
    const ownSkills = safe(path.join(root, "plugins", folder, ".apm/skills"));
    if (!stat(ownSkills)) continue;
    for (const skill of fs.readdirSync(ownSkills)) {
      const source = path.join(ownSkills, skill);
      const target = path.join(bundle, "skills", skill);
      if (!stat(safe(path.join(source, "SKILL.md")))?.isFile())
        fail(`Missing source SKILL.md: ${source}`);
      const expected = tree(source);
      if (!isDeepStrictEqual(expected, tree(target)))
        fail(`Own skill file set differs: ${folder}/${skill}`);
      for (const relative of expected) {
        if (
          !fs
            .readFileSync(path.join(source, relative))
            .equals(fs.readFileSync(path.join(target, relative)))
        ) {
          fail(`Own skill bytes differ: ${folder}/${skill}/${relative}`);
        }
      }
    }
  }
  for (const entry of published) {
    if (!folders.includes(entry.folder))
      fail(`Published plugin not built: ${entry.folder}`);
  }
}

function build(folders) {
  const bundles = path.join(work, "plugins");
  fs.mkdirSync(bundles);
  const names = new Set();
  for (const folder of folders) {
    const source = path.join(root, "plugins", folder);
    tree(source);
    const copy = path.join(work, "sources", folder);
    // Never reuse installed dependencies, locks, or generated host manifests.
    const generated = new Set([
      "apm_modules",
      "apm.lock",
      "apm.lock.yaml",
      "build",
      ".git",
      ".claude",
      ".codex",
      ".agents",
      ".claude-plugin",
      ".codex-plugin",
      "plugin.json",
    ]);
    fs.cpSync(source, copy, {
      recursive: true,
      filter: (file) =>
        file === source ||
        !generated.has(path.relative(source, file).split(path.sep)[0]),
    });
    const output = path.join(work, "bundles", folder);
    apm(copy, "pack", "--offline", "--format", "claude-plugin", "-o", output);
    const entries = fs.readdirSync(output);
    if (entries.length !== 1) fail(`Expected one APM bundle: ${folder}`);
    const bundle = path.join(output, entries[0]);
    const value = metadata(bundle);
    const name = `${value.name}-${value.version}`;
    if (entries[0] !== name) fail(`Unexpected APM bundle name: ${entries[0]}`);
    if (names.has(name)) fail(`Archive name collision: ${name}.zip`);
    names.add(name);
    // APM's legacy export keeps metadata and hooks at the root. Native hosts
    // need discovery manifests; derive them rather than maintaining duplicates.
    const native = { ...value };
    if (stat(path.join(bundle, "skills"))) native.skills = "./skills/";
    if (stat(path.join(bundle, "hooks.json"))) native.hooks = "./hooks.json";
    for (const host of [".claude-plugin", ".codex-plugin"]) {
      fs.mkdirSync(path.join(bundle, host), { recursive: true });
      fs.writeFileSync(
        path.join(bundle, host, "plugin.json"),
        `${JSON.stringify(native, null, 2)}\n`,
      );
    }
    fs.renameSync(bundle, path.join(bundles, folder));
  }
  return { bundles };
}

function compareBundles(expected, actual) {
  const files = tree(expected);
  if (!isDeepStrictEqual(files, tree(actual)))
    fail("Built plugin file set differs from fresh APM export; run pack.");
  for (const relative of files) {
    if (
      !fs.readFileSync(path.join(expected, relative)).equals(
        fs.readFileSync(path.join(actual, relative)),
      )
    )
      fail(`Built plugin content differs from fresh APM export: ${relative}`);
  }
}

function preflight(destinations) {
  for (const destination of destinations) {
    safe(destination);
    if (stat(destination)) tree(destination);
    const isCatalog = catalogs.some(
      (file) => destination === path.join(root, file),
    );
    const info = stat(destination);
    if (info && (isCatalog ? !info.isFile() : !info.isDirectory()))
      fail(`Wrong destination type: ${destination}`);
  }
}

function promote(pairs) {
  preflight(pairs.map(([, destination]) => destination));
  const moved = [];
  try {
    for (const [source, destination] of pairs) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const item = {
        destination,
        backup: path.join(work, `backup-${moved.length}`),
        installed: false,
        saved: false,
      };
      moved.push(item);
      if (stat(destination)) {
        fs.renameSync(destination, item.backup);
        item.saved = true;
      }
      fs.renameSync(source, destination);
      item.installed = true;
    }
  } catch (error) {
    for (const item of moved.reverse()) {
      try {
        if (item.installed)
          fs.rmSync(item.destination, { recursive: true, force: true });
        if (item.saved) fs.renameSync(item.backup, item.destination);
      } catch (rollbackError) {
        keepWork = true;
        console.error(
          `Rollback failed: ${rollbackError.message}; backups retained at ${work}`,
        );
      }
    }
    throw error;
  }
}

try {
  if (!["marketplace", "check", "pack"].includes(task))
    fail("Usage: node tools/package.mjs marketplace|check|pack");
  const destinations = catalogs.map((file) => path.join(root, file));
  if (task !== "marketplace") destinations.push(path.join(root, pluginArea));
  preflight(destinations);
  fs.mkdirSync(safe(path.join(root, "build")), { recursive: true });
  work = fs.mkdtempSync(path.join(root, "build/.pack."));
  const folders = task === "marketplace" ? [] : discover();
  if (task !== "marketplace" && !folders.length)
    fail("No plugin manifests found at plugins/*/apm.yml.");
  // A failed bundle build must never advance the catalogs.
  const built = task !== "marketplace" ? build(folders) : null;
  const expected = expectedCatalogs();
  if (task === "check") {
    expected.files.forEach((file, i) => {
      let actual;
      try {
        actual = json(path.join(root, catalogs[i]));
      } catch {
        fail(`Catalog missing/invalid: ${catalogs[i]}`, 4);
      }
      if (!isDeepStrictEqual(json(file), actual))
        fail(`Catalog drift: ${catalogs[i]}`, 4);
    });
  }
  if (task !== "marketplace") {
    validate(
      folders,
      built?.bundles ?? path.join(root, pluginArea),
      expected.published,
    );
    if (task === "check")
      compareBundles(built.bundles, path.join(root, pluginArea));
  }
  if (task !== "check") {
    const pairs = expected.files.map((file, i) => [
      file,
      path.join(root, catalogs[i]),
    ]);
    if (built) pairs.unshift([built.bundles, path.join(root, pluginArea)]);
    promote(pairs);
  }
  console.log(`${task}: OK`);
} catch (error) {
  console.error(error.message);
  process.exitCode = error.exitCode ?? 1;
} finally {
  if (work && !keepWork) fs.rmSync(work, { recursive: true, force: true });
}
