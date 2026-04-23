import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
    },
  },
}));

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getCookies(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") return [raw];
  return [];
}

function getCookieValue(cookies: string[], name: string): string | undefined {
  const cookie = cookies.find((c) => c.startsWith(`${name}=`));
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

describe("Auth Flow Integration", () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
    mockUserCreate.mockReset();
  });

  it("full flow: register → login → me → refresh → logout", async () => {
    // Step 1: Register a new user
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: "user-flow-1",
      email: "flow@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "flow@example.com", password: "password123" });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user.email).toBe("flow@example.com");

    const registerCookies = getCookies(registerRes);
    const accessToken = getCookieValue(registerCookies, "access_token");
    const refreshToken = getCookieValue(registerCookies, "refresh_token");
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    // Step 2: Get current user with access token
    mockUserFindUnique.mockResolvedValue({
      id: "user-flow-1",
      email: "flow@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`access_token=${accessToken}`]);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.id).toBe("user-flow-1");
    expect(meRes.body.user.email).toBe("flow@example.com");

    // Step 3: Refresh tokens
    mockUserFindUnique.mockResolvedValue({
      id: "user-flow-1",
      email: "flow@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${refreshToken}`]);

    expect(refreshRes.status).toBe(200);
    const refreshCookies = getCookies(refreshRes);
    const newAccessToken = getCookieValue(refreshCookies, "access_token");
    expect(newAccessToken).toBeDefined();
    expect(newAccessToken).toBeTruthy();

    // Step 4: Logout clears cookies
    const logoutRes = await request(app).post("/api/auth/logout");
    expect(logoutRes.status).toBe(200);

    const logoutCookies = getCookies(logoutRes);
    expect(getCookieValue(logoutCookies, "access_token")).toBe("");
    expect(getCookieValue(logoutCookies, "refresh_token")).toBe("");
  });

  it("login returns 401 for wrong password then succeeds with correct password", async () => {
    const hashed = await bcrypt.hash("correctpassword", 10);

    // First attempt: wrong password
    mockUserFindUnique.mockResolvedValue({
      id: "user-2",
      email: "retry@example.com",
      password: hashed,
    });

    const wrongRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "retry@example.com", password: "wrongpassword" });

    expect(wrongRes.status).toBe(401);
    expect(wrongRes.body.error).toBe("Invalid credentials");

    // Second attempt: correct password
    mockUserFindUnique.mockResolvedValue({
      id: "user-2",
      email: "retry@example.com",
      password: hashed,
    });

    const correctRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "retry@example.com", password: "correctpassword" });

    expect(correctRes.status).toBe(200);
    expect(correctRes.body.user).toBeDefined();
  });

  it("cannot access protected route after token expires", async () => {
    const expiredToken = jwt.sign({ userId: "user-1" }, JWT_SECRET, { expiresIn: "-1s" });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`access_token=${expiredToken}`]);

    expect(res.status).toBe(401);
  });

  it("refresh with wrong token type fails", async () => {
    // Create a regular access token (not refresh token)
    const accessToken = jwt.sign({ userId: "user-1" }, JWT_SECRET, { expiresIn: "15m" });

    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${accessToken}`]);

    expect(res.status).toBe(401);
  });

  it("sequential register attempts: first succeeds, second conflicts", async () => {
    // First registration succeeds
    mockUserFindUnique.mockResolvedValueOnce(null);
    mockUserCreate.mockResolvedValueOnce({
      id: "user-3",
      email: "duplicate@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const firstRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "duplicate@example.com", password: "password123" });

    expect(firstRes.status).toBe(201);

    // Second registration with same email fails
    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-3",
      email: "duplicate@example.com",
      password: "hashed",
    });

    const secondRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "duplicate@example.com", password: "password123" });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error).toBe("Email already registered");
  });

  it("me endpoint rejects requests without any cookies", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
