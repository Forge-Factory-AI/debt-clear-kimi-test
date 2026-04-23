import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, statSync, readFileSync } from "fs";
import { resolve, join } from "path";

const root = resolve(__dirname, "../..");

describe("Backend structure rules", () => {
  it("backend has a src/app.ts file", () => {
    expect(
      existsSync(resolve(root, "packages/backend/src/app.ts")),
      "FIX: Create packages/backend/src/app.ts to set up the Express application."
    ).toBe(true);
  });

  it("backend has a src/index.ts entry point", () => {
    expect(
      existsSync(resolve(root, "packages/backend/src/index.ts")),
      "FIX: Create packages/backend/src/index.ts as the server entry point."
    ).toBe(true);
  });

  it("backend routes are in src/routes/ directory", () => {
    const routesDir = resolve(root, "packages/backend/src/routes");
    expect(
      existsSync(routesDir) && statSync(routesDir).isDirectory(),
      "FIX: Create packages/backend/src/routes/ and move route handlers there."
    ).toBe(true);
  });

  it("backend routes use Express Router", () => {
    const routesDir = resolve(root, "packages/backend/src/routes");
    if (!existsSync(routesDir) || !statSync(routesDir).isDirectory()) {
      expect(false, "FIX: Create packages/backend/src/routes/ directory.").toBe(true);
      return;
    }

    const files = readdirSync(routesDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    expect(
      files.length > 0,
      "FIX: Add at least one route file to packages/backend/src/routes/."
    ).toBe(true);

    for (const file of files) {
      const content = readFileSync(join(routesDir, file), "utf-8");
      expect(
        content.includes("Router"),
        `FIX: ${file} must use Express Router. Import { Router } from "express" and export a router instance.`
      ).toBe(true);
    }
  });

  it("Prisma schema exists and has User, Debt, and Payment models", () => {
    const schemaPath = resolve(root, "packages/backend/prisma/schema.prisma");
    expect(
      existsSync(schemaPath),
      "FIX: Create packages/backend/prisma/schema.prisma with the data models."
    ).toBe(true);

    const content = readFileSync(schemaPath, "utf-8");

    expect(
      content.includes("model User"),
      "FIX: Add a User model to schema.prisma."
    ).toBe(true);

    expect(
      content.includes("model Debt"),
      "FIX: Add a Debt model to schema.prisma."
    ).toBe(true);

    expect(
      content.includes("model Payment"),
      "FIX: Add a Payment model to schema.prisma."
    ).toBe(true);
  });

  it("Prisma schema uses Decimal for monetary fields", () => {
    const schemaPath = resolve(root, "packages/backend/prisma/schema.prisma");
    if (!existsSync(schemaPath)) {
      expect(false, "FIX: Create packages/backend/prisma/schema.prisma.").toBe(true);
      return;
    }

    const content = readFileSync(schemaPath, "utf-8");
    const hasDecimal = /\bDecimal\b/.test(content);

    expect(
      hasDecimal,
      "FIX: Use Decimal type (not Float or Int) for monetary fields in schema.prisma to avoid floating-point errors."
    ).toBe(true);
  });
});
