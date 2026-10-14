import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { satisfies } from "./check-node-version.mjs";

const ROOT = process.cwd();
const REPO_ROOT = path.resolve(ROOT, "..");
const WORKFLOWS_DIR = path.join(REPO_ROOT, ".github", "workflows");

const NPM_RUN_PATTERN = /npm\s+run\s+([A-Za-z0-9:._-]+)/g;
const NODE_VERSION_PATTERN = /node-version\s*:\s*["']?([^"'#\s]+)["']?/g;

export function stripCommentLines(text) {
  return String(text)
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
}

export function extractNpmRunScripts(text) {
  const scripts = [];
  const clean = stripCommentLines(text);
  NPM_RUN_PATTERN.lastIndex = 0;
  let match = NPM_RUN_PATTERN.exec(clean);
  while (match) {
    scripts.push(match[1]);
    match = NPM_RUN_PATTERN.exec(clean);
  }
  return [...new Set(scripts)];
}

export function extractNodeVersions(text) {
  const versions = [];
  const clean = stripCommentLines(text);
  NODE_VERSION_PATTERN.lastIndex = 0;
  let match = NODE_VERSION_PATTERN.exec(clean);
  while (match) {
    versions.push(match[1]);
    match = NODE_VERSION_PATTERN.exec(clean);
  }
  return [...new Set(versions)];
}

export function toProbeVersion(pinned) {
  const clean = String(pinned).trim().replace(/^[v=\s]+/, "");
  if (/^\d+$/.test(clean)) {
    // Bare major ("24") resolves to the latest patch on CI, so probe a high
    // patch instead of x.0.0 (which would understate the real runtime).
    return `${clean}.999.0`;
  }
  if (/^\d+\.\d+$/.test(clean)) {
    return `${clean}.999`;
  }
  return clean;
}

export function findMissingScripts(referenced, available) {
  const availableSet = new Set(available);
  return [...new Set(referenced)].filter((name) => !availableSet.has(name));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function collectRequirements(packageJson) {
  const requirements = [];
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
  const violations = [];
  const packageJson = await readJson(path.join(ROOT, "package.json"));
  const scriptNames = Object.keys(packageJson.scripts ?? {});

  let workflowFiles;
  try {
    const entries = await fs.readdir(WORKFLOWS_DIR, { withFileTypes: true });
    workflowFiles = entries
      .filter((entry) => entry.isFile() && /\.ya?ml$/.test(entry.name))
      .map((entry) => path.join(WORKFLOWS_DIR, entry.name));
  } catch (error) {
    console.error(`[check:ci-contract] cannot read workflows dir: ${WORKFLOWS_DIR}`, error.message);
    process.exit(1);
  }

  const referenced = [];
  const pinnedVersions = [];
  for (const filePath of workflowFiles) {
    const content = await fs.readFile(filePath, "utf8");
    referenced.push(...extractNpmRunScripts(content));
    pinnedVersions.push(
      ...extractNodeVersions(content).map((version) => ({
        version,
        file: path.relative(REPO_ROOT, filePath)
      }))
    );
  }
  // package.json verify chains also shell out to sibling scripts; a renamed
  // script would otherwise fail only when that chain runs.
  for (const body of Object.values(packageJson.scripts ?? {})) {
    referenced.push(...extractNpmRunScripts(String(body)));
  }

  for (const missing of findMissingScripts(referenced, scriptNames)) {
    violations.push(`npm script "${missing}" is referenced but missing from package.json scripts`);
  }

  const requirements = await collectRequirements(packageJson);
  for (const { version, file } of pinnedVersions) {
    const probe = toProbeVersion(version);
    for (const requirement of requirements) {
      let ok;
      try {
        ok = satisfies(probe, requirement.range);
      } catch {
        ok = false;
      }
      if (!ok) {
        violations.push(
          `Node "${version}" in ${file} (probe ${probe}) does not satisfy ${requirement.source} "${requirement.range}"`
        );
      }
    }
  }

  if (violations.length > 0) {
    console.error("[check:ci-contract] violations found:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("[check:ci-contract] OK");
  console.log(`- ${workflowFiles.length} workflow(s), ${referenced.length} npm-run reference(s) resolve`);
  console.log(`- ${pinnedVersions.length} Node pin(s) satisfy ${requirements.length} engine requirement(s)`);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error) => {
    console.error("[check:ci-contract] failed:", error);
    process.exit(1);
  });
}
