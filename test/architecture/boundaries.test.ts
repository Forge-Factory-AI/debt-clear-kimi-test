import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const rootDir = path.resolve(__dirname, "../..");

describe("Import Boundaries", () => {
  it("backend package.json does not list frontend as a dependency", () => {
    const backendPkg = JSON.parse(
      fs.readFileSync(path.join(rootDir, "packages", "backend", "package.json"), "utf-8")
    );
    const allDeps = {
      ...backendPkg.dependencies,
      ...backendPkg.devDependencies,
    };
    expect(allDeps["@debt-clear/frontend"]).toBeUndefined();
  });

  it("frontend package.json does not list backend as a dependency", () => {
    const frontendPkg = JSON.parse(
      fs.readFileSync(path.join(rootDir, "packages", "frontend", "package.json"), "utf-8")
    );
    const allDeps = {
      ...frontendPkg.dependencies,
      ...frontendPkg.devDependencies,
    };
    expect(allDeps["@debt-clear/backend"]).toBeUndefined();
  });

  it("backend source files do not import from @prisma/client outside of service layer", () => {
    const backendSrc = path.join(rootDir, "packages", "backend", "src");
    const files = getAllTsFiles(backendSrc);
    for (const file of files) {
      const relPath = path.relative(backendSrc, file);
      const content = fs.readFileSync(file, "utf-8");
      if (relPath.includes("__tests__")) continue;
      // Allow imports in app.ts and services/
      if (relPath === "app.ts" || relPath.startsWith("services" + path.sep)) continue;
      const hasPrismaImport = /from\s+['"]@prisma\/client['"]/.test(content);
      if (hasPrismaImport) {
        expect.fail(
          `FIX: Move Prisma client import from ${relPath} into a service file in packages/backend/src/services/`
        );
      }
    }
    expect(true).toBe(true);
  });

  it("frontend source files do not use Node.js built-in modules", () => {
    const frontendSrc = path.join(rootDir, "packages", "frontend", "src");
    const files = getAllTsFiles(frontendSrc);
    const nodeBuiltins = [
      "fs", "path", "http", "https", "crypto", "os", "url",
      "stream", "events", "buffer", "util", "net", "child_process",
    ];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      for (const mod of nodeBuiltins) {
        const pattern = new RegExp(`from\\s+['"]${mod}['"]|require\\(['"]${mod}['"]\\)`);
        if (pattern.test(content)) {
          expect.fail(
            `FIX: Remove Node.js built-in import '${mod}' from frontend file ${path.relative(frontendSrc, file)} — use browser APIs or API calls instead`
          );
        }
      }
    }
    expect(true).toBe(true);
  });

  it("frontend uses Vite proxy for API calls, not hardcoded backend URLs", () => {
    const viteConfigPath = path.join(rootDir, "packages", "frontend", "vite.config.ts");
    if (fs.existsSync(viteConfigPath)) {
      const content = fs.readFileSync(viteConfigPath, "utf-8");
      expect(content.includes("proxy")).toBe(
        true,
        "FIX: Add a proxy configuration to packages/frontend/vite.config.ts to forward /api to the backend"
      );
    }
  });

  it("schema.prisma uses PostgreSQL as the datasource provider", () => {
    const schemaPath = path.join(rootDir, "packages", "backend", "prisma", "schema.prisma");
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content.includes('provider = "postgresql"')).toBe(
      true,
      'FIX: Set datasource provider to "postgresql" in packages/backend/prisma/schema.prisma'
    );
  });

  it("schema.prisma defines User, Debt, and Payment models", () => {
    const schemaPath = path.join(rootDir, "packages", "backend", "prisma", "schema.prisma");
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content.includes("model User")).toBe(
      true,
      "FIX: Add a `model User` to packages/backend/prisma/schema.prisma"
    );
    expect(content.includes("model Debt")).toBe(
      true,
      "FIX: Add a `model Debt` to packages/backend/prisma/schema.prisma"
    );
    expect(content.includes("model Payment")).toBe(
      true,
      "FIX: Add a `model Payment` to packages/backend/prisma/schema.prisma"
    );
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
