import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();

function parseVersion(version) {
  const clean = String(version).trim().replace(/^[v=\s]+/, "").split("-")[0];
  const parts = clean.split(".").map((part) => Number.parseInt(part, 10));
  return [
    Number.isFinite(parts[0]) ? parts[0] : 0,
    Number.isFinite(parts[1]) ? parts[1] : 0,
    Number.isFinite(parts[2]) ? parts[2] : 0
  ];
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function caretUpperBound(target) {
  if (target[0] !== 0) return [target[0] + 1, 0, 0];
  if (target[1] !== 0) return [0, target[1] + 1, 0];
  return [0, 0, target[2] + 1];
}

function testComparator(version, comparator) {
  const trimmed = comparator.trim();
  if (trimmed === "" || trimmed === "*") return true;
  const match = /^(>=|<=|>|<|=|\^|~)?\s*v?(\d+(?:\.\d+(?:\.\d+)?)?)$/.exec(trimmed);
  if (!match) {
    throw new Error(`Unsupported version range comparator: "${comparator}"`);
  }
  const operator = match[1] === undefined ? "=" : match[1];
  const target = parseVersion(match[2]);
  const order = compareVersions(version, target);
  switch (operator) {
    case ">=":
      return order >= 0;
    case "<=":
      return order <= 0;
    case ">":
      return order > 0;
    case "<":
      return order < 0;
    case "=":
      return order === 0;
    case "^":
      return order >= 0 && compareVersions(version, caretUpperBound(target)) < 0;
    case "~":
      return order >= 0 && compareVersions(version, [target[0], target[1] + 1, 0]) < 0;
    default:
      return false;
  }
}

export function satisfies(versionString, range) {
  const version = parseVersion(versionString);
  const alternatives = String(range)
    .split("||")
    .map((alternative) => alternative.trim())
    .filter((alternative) => alternative.length > 0);
  if (alternatives.length === 0) return true;
  return alternatives.some((alternative) =>
    alternative.split(/\s+/).every((comparator) => testComparator(version, comparator))
  );
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function collectRequirements() {
  const requirements = [];
  const packageJson = await readJson(path.join(ROOT, "package.json"));
  if (packageJson.engines && packageJson.engines.node) {
    requirements.push({ source: "package.json engines.node", range: packageJson.engines.node });
  }
  try {
    const lockfile = await readJson(path.join(ROOT, "package-lock.json"));
    for (const name of ["vitest", "vite"]) {
      const entry = lockfile.packages ? lockfile.packages[`node_modules/${name}`] : undefined;
      if (entry && entry.engines && entry.engines.node) {
        requirements.push({
          source: `package-lock ${name}@${entry.version} engines.node`,
          range: entry.engines.node
        });
      }
    }
  } catch {
    // No lockfile available; fall back to package.json engines only.
  }
  return requirements;
}

async function main() {
  const requirements = await collectRequirements();
  if (requirements.length === 0) {
    console.log("[check:node] OK (no node engine requirements declared)");
    return;
  }
  const current = process.version;
  const unmet = [];
  for (const requirement of requirements) {
    let ok = false;
    try {
      ok = satisfies(current, requirement.range);
    } catch (error) {
      console.error(`[check:node] cannot evaluate range "${requirement.range}":`, error.message);
    }
    if (!ok) unmet.push(requirement);
  }
  if (unmet.length > 0) {
    console.error(`[check:node] Node.js ${current} does not satisfy required ranges:`);
    for (const requirement of unmet) {
      console.error(`- ${requirement.source}: "${requirement.range}"`);
    }
    console.error("Use the Node.js version pinned in .github/workflows (see node-version).");
    process.exit(1);
  }
  console.log(`[check:node] OK (Node.js ${current})`);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error) => {
    console.error("[check:node] failed:", error);
    process.exit(1);
  });
}
