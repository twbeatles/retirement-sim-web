import { describe, expect, it } from "vitest";
import {
  extractNodeVersions,
  extractNpmRunScripts,
  findMissingScripts,
  toProbeVersion
} from "./check-ci-contract.mjs";
import { satisfies } from "./check-node-version.mjs";

// Mirrors the vitest engines range from package-lock.json.
const VITEST_RANGE = "^22.12.0 || ^24.0.0 || >=26.0.0";

describe("check:ci-contract script references", () => {
  it("extracts npm run targets and ignores npm ci", () => {
    const text = [
      "run: npm ci",
      "run: npm run check:node",
      "run: npm run test -- --run",
      "run: npm run build -- --base=/app/"
    ].join("\n");
    expect(extractNpmRunScripts(text).sort()).toEqual(["build", "check:node", "test"]);
  });

  it("ignores full-line comments", () => {
    const text = ["# run: npm run ghost", "run: npm run lint"].join("\n");
    expect(extractNpmRunScripts(text)).toEqual(["lint"]);
  });

  it("flags a workflow step pointing at a missing script (dbfac48 regression)", () => {
    const referenced = ["check:node", "lint"];
    expect(findMissingScripts(referenced, ["lint"])).toEqual(["check:node"]);
    expect(findMissingScripts(referenced, ["check:node", "lint"])).toEqual([]);
  });
});

describe("check:ci-contract Node pins", () => {
  it("extracts node-version pins with and without quotes", () => {
    const text = ['node-version: "24"', "node-version: '22'", "node-version: 20"].join("\n");
    expect(extractNodeVersions(text).sort()).toEqual(["20", "22", "24"]);
  });

  it("probes bare majors at a high patch (latest-patch semantics)", () => {
    expect(toProbeVersion("24")).toBe("24.999.0");
    expect(toProbeVersion("22")).toBe("22.999.0");
    expect(toProbeVersion("22.12")).toBe("22.12.999");
    expect(toProbeVersion("22.12.0")).toBe("22.12.0");
  });

  it("accepts the pinned CI majors used today", () => {
    expect(satisfies(toProbeVersion("22"), VITEST_RANGE)).toBe(true);
    expect(satisfies(toProbeVersion("24"), VITEST_RANGE)).toBe(true);
  });

  it("rejects majors outside the vitest range (Node 20 / 23 / 25 regression)", () => {
    expect(satisfies(toProbeVersion("20"), VITEST_RANGE)).toBe(false);
    expect(satisfies(toProbeVersion("23"), VITEST_RANGE)).toBe(false);
    expect(satisfies(toProbeVersion("25"), VITEST_RANGE)).toBe(false);
  });
});
