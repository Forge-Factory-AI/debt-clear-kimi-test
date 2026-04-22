import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

async function cleanupDb() {
  await prisma.payment.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await cleanupDb();
});

afterAll(async () => {
  await cleanupDb();
  await prisma.$disconnect();
});

describe("POST /api/auth/register", () => {
  it("returns 201 with cookies on successful registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "password123", name: "Test User" });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.name).toBe("Test User");
    expect(res.headers["set-cookie"]).toBeDefined();
    const cookies = (res.headers["set-cookie"] as unknown as string[]);
    expect(cookies.some((c) => c.includes("accessToken="))).toBe(true);
    expect(cookies.some((c) => c.includes("refreshToken="))).toBe(true);
  });

  it("returns 409 for duplicate email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "duplicate@example.com", password: "password123" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "duplicate@example.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email already registered");
  });

  it("returns 400 for invalid input (missing email)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("returns 400 for invalid input (short password)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("returns 400 for invalid input (invalid email)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("handles case-insensitive email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "CASE@EXAMPLE.COM", password: "password123" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "case@example.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email already registered");
  });
});

describe("POST /api/auth/login", () => {
  it("returns 200 with cookies on successful login", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "login@example.com", password: "password123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("login@example.com");
    expect(res.headers["set-cookie"]).toBeDefined();
    const cookies = (res.headers["set-cookie"] as unknown as string[]);
    expect(cookies.some((c) => c.includes("accessToken="))).toBe(true);
    expect(cookies.some((c) => c.includes("refreshToken="))).toBe(true);
  });

  it("returns 401 for wrong credentials (wrong password)", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "wrongpass@example.com", password: "password123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "wrongpass@example.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  it("returns 401 for wrong credentials (non-existent email)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nonexistent@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  it("handles case-insensitive email on login", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "CaseLogin@Example.COM", password: "password123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "caselogin@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("caselogin@example.com");
  });
});

describe("POST /api/auth/logout", () => {
  it("clears cookies on logout", async () => {
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "logout@example.com", password: "password123" });

    const cookies = (registerRes.headers["set-cookie"] as unknown as string[]);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out");
    expect(res.headers["set-cookie"]).toBeDefined();
    const logoutCookies = (res.headers["set-cookie"] as unknown as string[]);
    expect(logoutCookies.some((c) => c.includes("accessToken=;") || c.includes("Max-Age=0"))).toBe(true);
    expect(logoutCookies.some((c) => c.includes("refreshToken=;") || c.includes("Max-Age=0"))).toBe(true);
  });
});

describe("POST /api/auth/refresh", () => {
  it("issues new token pair with valid refresh token", async () => {
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "refresh@example.com", password: "password123" });

    const cookies = (registerRes.headers["set-cookie"] as unknown as string[]);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Token refreshed");
    expect(res.headers["set-cookie"]).toBeDefined();
    const newCookies = (res.headers["set-cookie"] as unknown as string[]);
    expect(newCookies.some((c) => c.includes("accessToken="))).toBe(true);
    expect(newCookies.some((c) => c.includes("refreshToken="))).toBe(true);
  });

  it("returns 401 without refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });
});

describe("GET /api/auth/me", () => {
  it("returns user profile when authenticated", async () => {
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "me@example.com", password: "password123", name: "Me User" });

    const cookies = (registerRes.headers["set-cookie"] as unknown as string[]);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("me@example.com");
    expect(res.body.user.name).toBe("Me User");
    expect(res.body.user.id).toBeDefined();
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });
});

describe("Auth middleware", () => {
  it("returns 401 with invalid access token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 401 with expired/malformed Bearer token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });
});
