import { describe, expect, it } from "vitest";
import { satisfies } from "./check-node-version.mjs";

// Mirrors the vitest engines range from package-lock.json.
// If this range ever stops matching, the CI Node version must move with it.
const VITEST_RANGE = "^22.12.0 || ^24.0.0 || >=26.0.0";

describe("check:node version range", () => {
  it("accepts Node 22.12 and later 22.x for the vitest range", () => {
    expect(satisfies("v22.12.0", VITEST_RANGE)).toBe(true);
    expect(satisfies("v22.14.0", VITEST_RANGE)).toBe(true);
  });

  it("rejects Node 20 for the vitest range (CI regression)", () => {
    expect(satisfies("v20.19.0", VITEST_RANGE)).toBe(false);
    expect(satisfies("v20.0.0", VITEST_RANGE)).toBe(false);
  });

  it("accepts Node 24 and 26 lines for the vitest range", () => {
    expect(satisfies("v24.0.0", VITEST_RANGE)).toBe(true);
    expect(satisfies("v24.5.0", VITEST_RANGE)).toBe(true);
    expect(satisfies("v26.1.0", VITEST_RANGE)).toBe(true);
  });

  it("enforces caret upper bounds", () => {
    expect(satisfies("v23.0.0", VITEST_RANGE)).toBe(false);
    expect(satisfies("v22.11.9", VITEST_RANGE)).toBe(false);
    expect(satisfies("v25.0.0", VITEST_RANGE)).toBe(false);
  });

  it("supports simple >= ranges", () => {
    expect(satisfies("v22.12.0", ">=22.12.0")).toBe(true);
    expect(satisfies("v24.0.0", ">=22.12.0")).toBe(true);
    expect(satisfies("v20.19.0", ">=22.12.0")).toBe(false);
  });
});
