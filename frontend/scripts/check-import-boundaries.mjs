import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const COMPONENTS_DIR = path.join(SRC_DIR, "components");
const TARGET_EXTENSIONS = new Set([".ts", ".tsx"]);
const DISALLOWED_DUPLICATE_PATTERN = /\s?\((?:1|2)\)(?=\.[^./\\]+$)/;
const HIGH_COST_SIMULATION_CALL_PATTERN = /\brequestSimulation(?:Batch)?\s*\(/;
const SIMULATION_CLIENT_IMPORT_PATTERN =
  /from\s+["'][^"']*logic\/simulationClient["']/;
const ALLOWED_HIGH_COST_COMPONENT_CALLERS = new Set([
  "src/components/WhatIfSlider.tsx",
  "src/components/ScenarioComparison.tsx"
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
    if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function main() {
  const violations = [];

  const allSourceFilesWithAnyExt = await walkFiles(SRC_DIR);
  for (const filePath of allSourceFilesWithAnyExt) {
    const relPath = toPosixPath(path.relative(ROOT, filePath));
    if (DISALLOWED_DUPLICATE_PATTERN.test(path.basename(filePath))) {
      violations.push(`${relPath}: duplicate-style filename is not allowed`);
    }
  }

  const componentFiles = await walkFiles(COMPONENTS_DIR);
  for (const filePath of componentFiles) {
    const content = await fs.readFile(filePath, "utf8");
    const relPath = toPosixPath(path.relative(ROOT, filePath));

    if (content.includes("logic/engine")) {
      violations.push(
        `${relPath}: direct import/reference to logic/engine is not allowed in components`
      );
    }

    if (content.includes("new Worker(")) {
      violations.push(
        `${relPath}: direct Worker construction is not allowed in components (use simulationClient)`
      );
    }

    const isAllowedHighCostCaller =
      ALLOWED_HIGH_COST_COMPONENT_CALLERS.has(relPath);
    if (
      SIMULATION_CLIENT_IMPORT_PATTERN.test(content) &&
      HIGH_COST_SIMULATION_CALL_PATTERN.test(content) &&
      !isAllowedHighCostCaller
    ) {
      violations.push(
        `${relPath}: direct high-cost simulation call is not allowed in components; route via hooks/useSimulation (allowed exceptions: ${[
          ...ALLOWED_HIGH_COST_COMPONENT_CALLERS
        ].join(", ")})`
      );
    }
  }

  const allSourceFiles = await walkFiles(SRC_DIR);
  for (const filePath of allSourceFiles) {
    const content = await fs.readFile(filePath, "utf8");
    const relPath = toPosixPath(path.relative(ROOT, filePath));

    if (content.includes("SOLVER_RESULT")) {
      violations.push(
        `${relPath}: legacy SOLVER_RESULT event usage found; use Promise worker responses`
      );
    }
  }

  const layoutFiles = [
    path.join(COMPONENTS_DIR, "layout", "DesktopLayout.tsx"),
    path.join(COMPONENTS_DIR, "layout", "MobileLayout.tsx")
  ];
  const bannedStaticImports = [
    "../Charts",
    "../YearlyReportTable",
    "../RiskDashboard",
    "../ScenarioComparison",
    "../WhatIfSlider",
    "../PensionOptimizer",
    "../BacktestingPanel"
  ];

  for (const filePath of layoutFiles) {
    const content = await fs.readFile(filePath, "utf8");
    const relPath = toPosixPath(path.relative(ROOT, filePath));

    for (const specifier of bannedStaticImports) {
      const escapedSpecifier = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        `^\\s*import\\s+\\{[^}]+\\}\\s+from\\s+['"]${escapedSpecifier}['"]\\s*;`,
        "m"
      );
      if (pattern.test(content)) {
        violations.push(
          `${relPath}: static import '${specifier}' is not allowed in layout; use React.lazy`
        );
      }
    }
  }

  if (violations.length > 0) {
    console.error("[check:imports] violations found:");
    for (const issue of violations) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log("[check:imports] OK");
  console.log("- components do not reference logic/engine");
  console.log("- components do not construct workers directly");
  console.log(
    `- components avoid direct high-cost simulation calls (allowed: ${[
      ...ALLOWED_HIGH_COST_COMPONENT_CALLERS
    ].join(", ")})`
  );
  console.log("- no legacy SOLVER_RESULT event usage found");
  console.log("- desktop/mobile layouts avoid static imports for heavy analysis/chart modules");
  console.log("- duplicate-style filenames are not present in src");
}

main().catch((error) => {
  console.error("[check:imports] failed:", error);
  process.exit(1);
});
