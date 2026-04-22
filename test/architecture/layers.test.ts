import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const rootDir = path.resolve(__dirname, "../..");

function readFile(...segments: string[]): string {
  return fs.readFileSync(path.join(rootDir, ...segments), "utf-8");
}

function fileExists(...segments: string[]): boolean {
  return fs.existsSync(path.join(rootDir, ...segments));
}

function dirExists(...segments: string[]): boolean {
  return fs.existsSync(path.join(rootDir, ...segments)) && fs.statSync(path.join(rootDir, ...segments)).isDirectory();
}

describe("Layer Rules", () => {
  it("backend has an src/ directory", () => {
    expect(dirExists("packages", "backend", "src")).toBe(true);
  });

  it("backend src/ contains app.ts entry point", () => {
    expect(fileExists("packages", "backend", "src", "app.ts")).toBe(
      true,
      "FIX: Create packages/backend/src/app.ts as the Express app entry point"
    );
  });

  it("backend src/ contains index.ts server bootstrap", () => {
    expect(fileExists("packages", "backend", "src", "index.ts")).toBe(
      true,
      "FIX: Create packages/backend/src/index.ts as the server bootstrap file"
    );
  });

  it("backend has prisma/ directory for schema", () => {
    expect(dirExists("packages", "backend", "prisma")).toBe(
      true,
      "FIX: Create packages/backend/prisma/ directory and add schema.prisma"
    );
  });

  it("backend prisma/schema.prisma defines the database schema", () => {
    expect(fileExists("packages", "backend", "prisma", "schema.prisma")).toBe(
      true,
      "FIX: Create packages/backend/prisma/schema.prisma with your data models"
    );
  });

  it("frontend has an src/ directory", () => {
    expect(dirExists("packages", "frontend", "src")).toBe(true);
  });

  it("frontend src/ contains main.tsx entry point", () => {
    expect(fileExists("packages", "frontend", "src", "main.tsx")).toBe(
      true,
      "FIX: Create packages/frontend/src/main.tsx as the React DOM entry point"
    );
  });

  it("frontend src/ contains App.tsx root component", () => {
    expect(fileExists("packages", "frontend", "src", "App.tsx")).toBe(
      true,
      "FIX: Create packages/frontend/src/App.tsx as the root React component"
    );
  });

  it("frontend src/ contains index.css with Tailwind directives", () => {
    expect(fileExists("packages", "frontend", "src", "index.css")).toBe(
      true,
      "FIX: Create packages/frontend/src/index.css with @tailwind directives"
    );
  });

  it("frontend src/lib/utils.ts exports a cn() utility", () => {
    expect(fileExists("packages", "frontend", "src", "lib", "utils.ts")).toBe(
      true,
      "FIX: Create packages/frontend/src/lib/utils.ts exporting a cn() function for class merging"
    );
    const content = readFile("packages", "frontend", "src", "lib", "utils.ts");
    expect(content.includes("export function cn")).toBe(
      true,
      "FIX: Add `export function cn(...inputs: ClassValue[])` to packages/frontend/src/lib/utils.ts"
    );
  });

  it("backend does not import frontend packages", () => {
    const backendFiles = getAllTsFiles(path.join(rootDir, "packages", "backend", "src"));
    for (const file of backendFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
      for (const imp of importMatches) {
        const match = imp.match(/from\s+['"]([^'"]+)['"]/);
        if (match) {
          const importPath = match[1];
          if (importPath.startsWith("@debt-clear/frontend") || importPath.includes("/frontend/")) {
            expect.fail(`FIX: Remove frontend import from backend file ${path.relative(rootDir, file)}: ${importPath}`);
          }
        }
      }
    }
    expect(true).toBe(true);
  });

  it("frontend does not import backend packages", () => {
    const frontendFiles = getAllTsFiles(path.join(rootDir, "packages", "frontend", "src"));
    for (const file of frontendFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
      for (const imp of importMatches) {
        const match = imp.match(/from\s+['"]([^'"]+)['"]/);
        if (match) {
          const importPath = match[1];
          if (importPath.startsWith("@debt-clear/backend") || importPath.includes("/backend/")) {
            expect.fail(`FIX: Remove backend import from frontend file ${path.relative(rootDir, file)}: ${importPath}`);
          }
        }
      }
    }
    expect(true).toBe(true);
  });
});

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}
