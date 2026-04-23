import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, statSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../..");

function dirExists(dir: string): boolean {
  const p = resolve(root, dir);
  return existsSync(p) && statSync(p).isDirectory();
}

function dirHasFiles(dir: string): boolean {
  const p = resolve(root, dir);
  if (!existsSync(p) || !statSync(p).isDirectory()) return false;
  const files = readdirSync(p);
  return files.length > 0;
}

describe("Skills directories exist", () => {
  it("skills/harness-engineering/ directory exists", () => {
    expect(
      dirExists("skills/harness-engineering"),
      "FIX: Create skills/harness-engineering/ directory."
    ).toBe(true);
  });

  it("skills/harness-engineering/ has content", () => {
    expect(
      dirHasFiles("skills/harness-engineering"),
      "FIX: Add at least one file (e.g., skill.md) to skills/harness-engineering/."
    ).toBe(true);
  });

  it("skills/code-review/ directory exists", () => {
    expect(
      dirExists("skills/code-review"),
      "FIX: Create skills/code-review/ directory."
    ).toBe(true);
  });

  it("skills/code-review/ has content", () => {
    expect(
      dirHasFiles("skills/code-review"),
      "FIX: Add at least one file (e.g., skill.md) to skills/code-review/."
    ).toBe(true);
  });

  it("skills/frontend-design/ directory exists", () => {
    expect(
      dirExists("skills/frontend-design"),
      "FIX: Create skills/frontend-design/ directory."
    ).toBe(true);
  });

  it("skills/frontend-design/ has content", () => {
    expect(
      dirHasFiles("skills/frontend-design"),
      "FIX: Add at least one file (e.g., skill.md) to skills/frontend-design/."
    ).toBe(true);
  });
});
