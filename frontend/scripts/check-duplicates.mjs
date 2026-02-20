import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REPO_ROOT = path.resolve(ROOT, "..");
const DISALLOWED_NAME_PATTERN = /\s?\((?:1|2)\)(?=\.[^./\\]+$)/;

const FRONTEND_ROOT_EXTENSIONS = new Set([
  ".json",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".html",
  ".css"
]);

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

async function collectRepoRootCandidates() {
  const entries = await fs.readdir(REPO_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(REPO_ROOT, entry.name));
}

async function collectFrontendRootCandidates() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(ROOT, entry.name))
    .filter((fullPath) => FRONTEND_ROOT_EXTENSIONS.has(path.extname(fullPath)));
}

async function main() {
  const violations = [];
  const candidateFiles = [
    ...(await walkFiles(path.join(ROOT, "src"))),
    ...(await walkFiles(path.join(ROOT, "public"))),
    ...(await collectFrontendRootCandidates()),
    ...(await collectRepoRootCandidates())
  ];

  for (const filePath of candidateFiles) {
    if (!DISALLOWED_NAME_PATTERN.test(path.basename(filePath))) {
      continue;
    }
    violations.push(toPosix(path.relative(REPO_ROOT, filePath)));
  }

  if (violations.length > 0) {
    console.error("[check:duplicates] duplicate-style filenames found:");
    for (const relPath of violations.sort()) {
      console.error(`- ${relPath}`);
    }
    process.exit(1);
  }

  console.log("[check:duplicates] OK");
}

main().catch((error) => {
  console.error("[check:duplicates] failed:", error);
  process.exit(1);
});
