import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const rootDir = path.resolve(__dirname, "../..");

function fileExists(...segments: string[]): boolean {
  return fs.existsSync(path.join(rootDir, ...segments));
}

function dirExists(...segments: string[]): boolean {
  return fs.existsSync(path.join(rootDir, ...segments)) && fs.statSync(path.join(rootDir, ...segments)).isDirectory();
}

describe("Directory Structure", () => {
  it("has pnpm-workspace.yaml at root", () => {
    expect(fileExists("pnpm-workspace.yaml")).toBe(
      true,
      "FIX: Create pnpm-workspace.yaml at repo root with `packages: ['packages/*']`"
    );
  });

  it("has packages/ directory", () => {
    expect(dirExists("packages")).toBe(
      true,
      "FIX: Create a packages/ directory at repo root for monorepo workspaces"
    );
  });

  it("has packages/backend/ directory", () => {
    expect(dirExists("packages", "backend")).toBe(
      true,
      "FIX: Create packages/backend/ for the Express API package"
    );
  });

  it("has packages/frontend/ directory", () => {
    expect(dirExists("packages", "frontend")).toBe(
      true,
      "FIX: Create packages/frontend/ for the React frontend package"
    );
  });

  it("backend has package.json", () => {
    expect(fileExists("packages", "backend", "package.json")).toBe(
      true,
      "FIX: Create packages/backend/package.json with name, scripts, and dependencies"
    );
  });

  it("frontend has package.json", () => {
    expect(fileExists("packages", "frontend", "package.json")).toBe(
      true,
      "FIX: Create packages/frontend/package.json with name, scripts, and dependencies"
    );
  });

  it("backend has tsconfig.json", () => {
    expect(fileExists("packages", "backend", "tsconfig.json")).toBe(
      true,
      "FIX: Create packages/backend/tsconfig.json with TypeScript compiler options"
    );
  });

  it("frontend has tsconfig.json", () => {
    expect(fileExists("packages", "frontend", "tsconfig.json")).toBe(
      true,
      "FIX: Create packages/frontend/tsconfig.json with TypeScript compiler options"
    );
  });

  it("root has package.json with workspace scripts", () => {
    expect(fileExists("package.json")).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
    expect(pkg.scripts?.test).toBeDefined();
    expect(pkg.scripts?.build).toBeDefined();
  });

  it("has .github/workflows/ci.yml for CI", () => {
    expect(fileExists(".github", "workflows", "ci.yml")).toBe(
      true,
      "FIX: Create .github/workflows/ci.yml with build and test steps"
    );
  });

  it("has docker-compose.yml for local dev", () => {
    expect(fileExists("docker-compose.yml")).toBe(
      true,
      "FIX: Create docker-compose.yml with PostgreSQL service definition"
    );
  });
});

describe("Documentation Structure", () => {
  it("AGENTS.md exists at root", () => {
    expect(fileExists("AGENTS.md")).toBe(
      true,
      "FIX: Create AGENTS.md at repo root with project-specific agent guidance"
    );
  });

  it("ARCHITECTURE.md exists at root", () => {
    expect(fileExists("ARCHITECTURE.md")).toBe(
      true,
      "FIX: Create ARCHITECTURE.md at repo root with layer rules and module inventory"
    );
  });

  it("DESIGN.md exists at root", () => {
    expect(fileExists("DESIGN.md")).toBe(
      true,
      "FIX: Create DESIGN.md at repo root with color tokens and typography specs"
    );
  });

  it("PRODUCT_SENSE.md exists at root", () => {
    expect(fileExists("PRODUCT_SENSE.md")).toBe(
      true,
      "FIX: Create PRODUCT_SENSE.md at repo root with user journeys and non-goals"
    );
  });

  it("QUALITY_SCORE.md exists at root", () => {
    expect(fileExists("QUALITY_SCORE.md")).toBe(
      true,
      "FIX: Create QUALITY_SCORE.md at repo root with grading table and scoring formula"
    );
  });
});

describe("Skills Structure", () => {
  it("skills/harness-engineering/ directory exists", () => {
    expect(dirExists("skills", "harness-engineering")).toBe(
      true,
      "FIX: Create skills/harness-engineering/ directory"
    );
  });

  it("skills/harness-engineering/SKILL.md exists", () => {
    expect(fileExists("skills", "harness-engineering", "SKILL.md")).toBe(
      true,
      "FIX: Create skills/harness-engineering/SKILL.md with skill definition"
    );
  });

  it("skills/code-review/ directory exists", () => {
    expect(dirExists("skills", "code-review")).toBe(
      true,
      "FIX: Create skills/code-review/ directory"
    );
  });

  it("skills/code-review/SKILL.md exists", () => {
    expect(fileExists("skills", "code-review", "SKILL.md")).toBe(
      true,
      "FIX: Create skills/code-review/SKILL.md with review checklist and format"
    );
  });

  it("skills/frontend-design/ directory exists", () => {
    expect(dirExists("skills", "frontend-design")).toBe(
      true,
      "FIX: Create skills/frontend-design/ directory"
    );
  });

  it("skills/frontend-design/SKILL.md exists", () => {
    expect(fileExists("skills", "frontend-design", "SKILL.md")).toBe(
      true,
      "FIX: Create skills/frontend-design/SKILL.md with design principles and component template"
    );
  });
});
