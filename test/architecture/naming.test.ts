import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const rootDir = path.resolve(__dirname, "../..");

describe("File Naming Conventions", () => {
  it("backend source files use .ts extension", () => {
    const backendSrc = path.join(rootDir, "packages", "backend", "src");
    const files = getAllFiles(backendSrc);
    const nonTs = files.filter(
      (f) => !f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".spec.ts")
    );
    if (nonTs.length > 0) {
      expect.fail(
        `FIX: Rename these backend files to .ts: ${nonTs.map((f) => path.relative(backendSrc, f)).join(", ")}`
      );
    }
    expect(true).toBe(true);
  });

  it("frontend source files use .ts or .tsx extension", () => {
    const frontendSrc = path.join(rootDir, "packages", "frontend", "src");
    const files = getAllFiles(frontendSrc);
    const nonTs = files.filter(
      (f) =>
        !f.endsWith(".ts") &&
        !f.endsWith(".tsx") &&
        !f.endsWith(".css") &&
        !f.endsWith(".test.ts") &&
        !f.endsWith(".test.tsx") &&
        !f.endsWith(".spec.ts") &&
        !f.endsWith(".spec.tsx")
    );
    if (nonTs.length > 0) {
      expect.fail(
        `FIX: Rename these frontend files to .ts/.tsx: ${nonTs
          .map((f) => path.relative(frontendSrc, f))
          .join(", ")}`
      );
    }
    expect(true).toBe(true);
  });

  it("React components use PascalCase filenames", () => {
    const frontendSrc = path.join(rootDir, "packages", "frontend", "src");
    const componentsDir = path.join(frontendSrc, "components");
    if (fs.existsSync(componentsDir)) {
      const files = fs
        .readdirSync(componentsDir)
        .filter((f) => f.endsWith(".tsx"));
      for (const file of files) {
        const base = file.replace(".tsx", "");
        const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(base);
        if (!isPascalCase) {
          expect.fail(
            `FIX: Rename component file to PascalCase: components/${file} → components/${base
              .charAt(0)
              .toUpperCase() + base.slice(1)}.tsx`
          );
        }
      }
    }
    expect(true).toBe(true);
  });

  it("test files use .test.ts or .test.tsx suffix", () => {
    const backendTests = path.join(rootDir, "packages", "backend", "src", "__tests__");
    const frontendTests = path.join(rootDir, "packages", "frontend", "src", "__tests__");

    if (fs.existsSync(backendTests)) {
      const files = fs.readdirSync(backendTests);
      for (const file of files) {
        if (!file.endsWith(".test.ts")) {
          expect.fail(
            `FIX: Rename backend test file to use .test.ts suffix: ${file}`
          );
        }
      }
    }

    if (fs.existsSync(frontendTests)) {
      const files = fs.readdirSync(frontendTests);
      for (const file of files) {
        if (!file.endsWith(".test.tsx")) {
          expect.fail(
            `FIX: Rename frontend test file to use .test.tsx suffix: ${file}`
          );
        }
      }
    }
    expect(true).toBe(true);
  });

  it("utility files use camelCase or kebab-case", () => {
    const libDir = path.join(rootDir, "packages", "frontend", "src", "lib");
    if (fs.existsSync(libDir)) {
      const files = fs.readdirSync(libDir).filter((f) => f.endsWith(".ts"));
      for (const file of files) {
        const base = file.replace(".ts", "");
        const isValid = /^[a-z][a-zA-Z0-9]*$/.test(base) || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(base);
        if (!isValid) {
          expect.fail(
            `FIX: Rename utility file to camelCase or kebab-case: lib/${file}`
          );
        }
      }
    }
    expect(true).toBe(true);
  });

  it("hooks use use prefix in filename", () => {
    const hooksDir = path.join(rootDir, "packages", "frontend", "src", "hooks");
    if (fs.existsSync(hooksDir)) {
      const files = fs.readdirSync(hooksDir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
      for (const file of files) {
        if (!file.startsWith("use")) {
          expect.fail(
            `FIX: Rename hook file to start with 'use': hooks/${file} → hooks/use${file.charAt(0).toUpperCase() + file.slice(1)}`
          );
        }
      }
    }
    expect(true).toBe(true);
  });
});

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}
