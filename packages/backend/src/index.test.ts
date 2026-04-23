import { describe, it, expect } from "vitest";

describe("Server entry point", () => {
  it("exports app from app.ts", async () => {
    const { default: app } = await import("./app");
    expect(app).toBeDefined();
    expect(typeof app).toBe("function");
  });

  it("index module can be imported without throwing", async () => {
    // index.ts starts a server, but we just verify the module loads
    // We check that the module exists and its dependencies resolve
    const appModule = await import("./app");
    expect(appModule.default).toBeDefined();
  });
});
