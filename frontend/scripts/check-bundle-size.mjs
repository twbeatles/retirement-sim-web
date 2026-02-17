import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const DIST_INDEX = path.join(DIST_DIR, "index.html");
const DIST_ASSETS = path.join(DIST_DIR, "assets");

const BASELINE_ENTRY_BYTES = 753275;
const TARGET_ENTRY_BYTES = Math.floor(BASELINE_ENTRY_BYTES * 0.7);
const BASELINE_INITIAL_BYTES = 753275;
const TARGET_INITIAL_BYTES = Math.floor(BASELINE_INITIAL_BYTES * 0.7);

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function extractReferencedJsAssets(html) {
  const results = [];
  const regex =
    /<(?:script|link)\b[^>]*(?:src|href)\s*=\s*["']([^"']+\.js)["'][^>]*>/gi;
  let match = regex.exec(html);

  while (match) {
    const href = match[1];
    if (!href.startsWith("http://") && !href.startsWith("https://")) {
      results.push(href);
    }
    match = regex.exec(html);
  }

  return [...new Set(results)];
}

function resolveDistAssetPath(href) {
  const normalized = href.startsWith("/") ? href.slice(1) : href;
  return path.join(DIST_DIR, normalized);
}

async function fileSizeOrNull(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return null;
  }
}

async function main() {
  const warnOnly = process.argv.includes("--warn");
  const enforce = process.argv.includes("--enforce");

  const distExists = await fileSizeOrNull(DIST_INDEX);
  if (distExists === null) {
    const message =
      "[perf:report] dist/index.html not found. Run a production build before bundle-size checks.";
    if (enforce) {
      console.error(message);
      process.exit(1);
    }
    console.warn(message);
    process.exit(0);
  }

  const html = await fs.readFile(DIST_INDEX, "utf8");
  const referenced = extractReferencedJsAssets(html);
  if (referenced.length === 0) {
    const message =
      "[perf:report] no JavaScript assets referenced by dist/index.html.";
    if (enforce) {
      console.error(message);
      process.exit(1);
    }
    console.warn(message);
    process.exit(0);
  }

  const measured = [];
  for (const href of referenced) {
    const fullPath = resolveDistAssetPath(href);
    const size = await fileSizeOrNull(fullPath);
    if (size !== null) {
      measured.push({ href, bytes: size });
    } else {
      measured.push({ href, bytes: 0, missing: true });
    }
  }

  const missing = measured.filter((item) => item.missing);
  if (missing.length > 0) {
    const message = `[perf:report] missing assets referenced by index.html: ${missing
      .map((item) => item.href)
      .join(", ")}`;
    if (enforce) {
      console.error(message);
      process.exit(1);
    }
    console.warn(message);
  }

  const initialTotal = measured.reduce((sum, item) => sum + item.bytes, 0);
  const entryAsset =
    measured.find((item) => /(?:^|\/)assets\/index-[^/]+\.js$/.test(item.href)) ??
    measured.find((item) => /(?:^|\/)index-[^/]+\.js$/.test(item.href)) ??
    measured[0];
  const entryBytes = entryAsset?.bytes ?? 0;

  let allJs = [];
  try {
    const assetEntries = await fs.readdir(DIST_ASSETS, { withFileTypes: true });
    allJs = await Promise.all(
      assetEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
        .map(async (entry) => {
          const filePath = path.join(DIST_ASSETS, entry.name);
          const bytes = (await fs.stat(filePath)).size;
          return { name: entry.name, bytes };
        })
    );
    allJs.sort((a, b) => b.bytes - a.bytes);
  } catch {
    // Dist assets directory can be missing in partial builds; keep report minimal.
  }

  console.log("[perf:report]");
  console.log(`- Entry JS: ${entryAsset?.href ?? "n/a"} (${formatKiB(entryBytes)})`);
  console.log(`- Initial JS total (index + modulepreload): ${formatKiB(initialTotal)}`);
  console.log(
    `- Entry target: <= ${formatKiB(TARGET_ENTRY_BYTES)} (baseline ${formatKiB(
      BASELINE_ENTRY_BYTES
    )})`
  );
  console.log(
    `- Initial total target: <= ${formatKiB(TARGET_INITIAL_BYTES)} (baseline ${formatKiB(
      BASELINE_INITIAL_BYTES
    )})`
  );

  if (allJs.length > 0) {
    console.log("- Largest JS chunks:");
    for (const chunk of allJs.slice(0, 5)) {
      console.log(`  - ${chunk.name}: ${formatKiB(chunk.bytes)}`);
    }
  }

  const errors = [];
  if (entryBytes > TARGET_ENTRY_BYTES) {
    errors.push(
      `entry JS ${formatKiB(entryBytes)} exceeds target ${formatKiB(TARGET_ENTRY_BYTES)}`
    );
  }

  if (initialTotal > TARGET_INITIAL_BYTES) {
    errors.push(
      `initial JS total ${formatKiB(initialTotal)} exceeds target ${formatKiB(
        TARGET_INITIAL_BYTES
      )}`
    );
  }

  const lazyChunks = allJs.filter(
    (chunk) =>
      !chunk.name.startsWith("index-") &&
      !chunk.name.startsWith("simulation.worker-")
  );
  if (lazyChunks.length === 0) {
    errors.push("no additional lazy-loaded JS chunks detected in dist/assets");
  }

  if (errors.length > 0 && warnOnly) {
    for (const message of errors) {
      console.warn(`[perf:warn] ${message}`);
    }
  }

  if (errors.length > 0 && enforce) {
    for (const message of errors) {
      console.error(`[perf:gate] failed: ${message}`);
    }
    process.exit(1);
  }

  if (enforce && errors.length === 0) {
    console.log("[perf:gate] passed");
  }
}

main().catch((error) => {
  console.error("[perf:report] failed:", error);
  process.exit(1);
});
