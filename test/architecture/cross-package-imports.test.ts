import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";

const root = resolve(__dirname, "../..");

function walkDir(dir: string, cb: (file: string) => void): void {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
      walkDir(fullPath, cb);
    } else if (stat.isFile() && (entry.endsWith(".ts") || entry.endsWith(".tsx"))) {
      cb(fullPath);
    }
  }
}

function getSourceFiles(pkgPath: string): string[] {
  const files: string[] = [];
  const srcPath = resolve(root, pkgPath, "src");
  if (!statSync(srcPath).isDirectory()) return files;
  walkDir(srcPath, (f) => files.push(f));
  return files;
}

describe("Cross-package import rules", () => {
  it("backend source files do not import frontend code", () => {
    const backendFiles = getSourceFiles("packages/backend");
    const violations: string[] = [];

    for (const file of backendFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Detect imports that reference frontend paths or packages
        if (
          line.includes("from \"@debt-clear/frontend\"") ||
          line.includes("from \"../frontend/\"") ||
          line.includes("from \"../../frontend/\"") ||
          line.includes("from \"@/components/\"")
        ) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      }
    }

    expect(
      violations,
      `FIX: Remove frontend imports from backend. Backend must never import frontend code. Violations:\n${violations.join("\n")}`
    ).toEqual([]);
  });

  it("frontend source files do not import backend code", () => {
    const frontendFiles = getSourceFiles("packages/frontend");
    const violations: string[] = [];

    for (const file of frontendFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          line.includes("from \"@debt-clear/backend\"") ||
          line.includes("from \"../backend/\"") ||
          line.includes("from \"../../backend/\"") ||
          line.includes("from \"express\"") ||
          line.includes("from \"@prisma/client\"")
        ) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      }
    }

    expect(
      violations,
      `FIX: Remove backend imports from frontend. Frontend must never import backend code or server-only packages. Violations:\n${violations.join("\n")}`
    ).toEqual([]);
  });
});
