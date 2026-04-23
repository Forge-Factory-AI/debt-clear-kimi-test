import { describe, it, expect, vi, beforeEach } from "vitest";
import { authMiddleware } from "./auth";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const mockUserFindUnique = vi.fn();

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function createRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createReq(cookies?: Record<string, string>): Request {
  return {
    cookies,
  } as unknown as Request;
}

describe("authMiddleware", () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
  });

  it("returns 401 when no token is provided", async () => {
    const req = createReq();
    const res = createRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    const req = createReq({ access_token: "invalid-token" });
    const res = createRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when user is not found (lines 24-26)", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const token = jwt.sign({ userId: "nonexistent-user" }, JWT_SECRET, { expiresIn: "15m" });
    const req = createReq({ access_token: token });
    const res = createRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is expired (catch block lines 31-32)", async () => {
    const expiredToken = jwt.sign({ userId: "user-1" }, JWT_SECRET, { expiresIn: "-1s" });
    const req = createReq({ access_token: expiredToken });
    const res = createRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when token is valid and user exists", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: "hashed",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    });

    const token = jwt.sign({ userId: "user-1" }, JWT_SECRET, { expiresIn: "15m" });
    const req = createReq({ access_token: token });
    const res = createRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("attaches user to request when token is valid", async () => {
    const user = {
      id: "user-1",
      email: "test@example.com",
      password: "hashed",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };
    mockUserFindUnique.mockResolvedValue(user);

    const token = jwt.sign({ userId: "user-1" }, JWT_SECRET, { expiresIn: "15m" });
    const req = createReq({ access_token: token });
    const res = createRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toEqual(user);
  });
});
