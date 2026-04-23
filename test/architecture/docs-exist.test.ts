import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../..");

function pathExists(file: string): boolean {
  return existsSync(resolve(root, file));
}

describe("Documentation files exist", () => {
  it("AGENTS.md exists at repo root", () => {
    expect(
      pathExists("AGENTS.md"),
      "FIX: Create AGENTS.md at repo root with project overview, stack, commands, and rules."
    ).toBe(true);
  });

  it("docs/ARCHITECTURE.md exists", () => {
    expect(
      pathExists("docs/ARCHITECTURE.md"),
      "FIX: Create docs/ARCHITECTURE.md with layer rules, module inventory, and dependency flow."
    ).toBe(true);
  });

  it("docs/DESIGN.md exists", () => {
    expect(
      pathExists("docs/DESIGN.md"),
      "FIX: Create docs/DESIGN.md with color tokens, typography, animation specs, and component patterns."
    ).toBe(true);
  });

  it("docs/PRODUCT_SENSE.md exists", () => {
    expect(
      pathExists("docs/PRODUCT_SENSE.md"),
      "FIX: Create docs/PRODUCT_SENSE.md with user journeys, in-scope features, and non-goals."
    ).toBe(true);
  });

  it("docs/QUALITY_SCORE.md exists", () => {
    expect(
      pathExists("docs/QUALITY_SCORE.md"),
      "FIX: Create docs/QUALITY_SCORE.md with grading table, minimum scores, and automated checks."
    ).toBe(true);
  });
});
