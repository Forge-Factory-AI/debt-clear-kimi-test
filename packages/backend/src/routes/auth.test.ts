import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
    },
  },
}));

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getCookieValue(cookies: string[], name: string): string | undefined {
  const cookie = cookies.find((c) => c.startsWith(`${name}=`));
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
    mockUserCreate.mockReset();
  });

  it("returns 201 with cookies", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("test@example.com");

    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies).toBeDefined();
    expect(getCookieValue(cookies, "access_token")).toBeDefined();
    expect(getCookieValue(cookies, "refresh_token")).toBeDefined();
  });

  it("returns 409 for duplicate email", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: "hashed",
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email already registered");
  });

  it("returns 400 for missing email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ password: "password123" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid email format");
  });

  it("returns 400 for short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "12345" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Password must be at least 6 characters");
  });

  it("handles case-insensitive email", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "TEST@EXAMPLE.COM", password: "password123" });

    expect(res.status).toBe(201);
    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "test@example.com" },
      })
    );
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
  });

  it("returns 200 with cookies for valid credentials", async () => {
    const hashed = await bcrypt.hash("password123", 10);
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: hashed,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();

    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies).toBeDefined();
    expect(getCookieValue(cookies, "access_token")).toBeDefined();
    expect(getCookieValue(cookies, "refresh_token")).toBeDefined();
  });

  it("returns 401 for wrong password", async () => {
    const hashed = await bcrypt.hash("password123", 10);
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: hashed,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  it("returns 401 for non-existent email", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  it("is case-insensitive for email", async () => {
    const hashed = await bcrypt.hash("password123", 10);
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: hashed,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "TEST@EXAMPLE.COM", password: "password123" });

    expect(res.status).toBe(200);
    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "test@example.com" },
      })
    );
  });
});

describe("POST /api/auth/logout", () => {
  it("clears cookies and returns 200", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);

    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies).toBeDefined();
    expect(getCookieValue(cookies, "access_token")).toBe("");
    expect(getCookieValue(cookies, "refresh_token")).toBe("");
  });
});

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
  });

  it("issues new access token with valid refresh token", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const refreshToken = jwt.sign({ userId: "user-1", type: "refresh" }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${refreshToken}`]);

    expect(res.status).toBe(200);

    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies).toBeDefined();
    expect(getCookieValue(cookies, "access_token")).toBeDefined();
    expect(getCookieValue(cookies, "refresh_token")).toBeDefined();
  });

  it("returns 401 without refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", ["refresh_token=invalid-token"]);

    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
  });

  it("returns user profile with valid access token", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const accessToken = jwt.sign({ userId: "user-1" }, JWT_SECRET, { expiresIn: "15m" });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`access_token=${accessToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe("user-1");
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("returns 401 without access token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid access token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", ["access_token=invalid-token"]);

    expect(res.status).toBe(401);
  });
});

describe("Auth middleware", () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
  });

  it("returns 401 for protected route without token", async () => {
    // The /api/auth/me endpoint uses its own auth check; test via a protected route conceptually.
    // Since we don't have other protected routes yet, verify the middleware itself through /me
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with expired token", async () => {
    const expiredToken = jwt.sign({ userId: "user-1" }, JWT_SECRET, { expiresIn: "-1s" });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`access_token=${expiredToken}`]);

    expect(res.status).toBe(401);
  });
});
