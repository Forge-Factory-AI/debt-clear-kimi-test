import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", { httpOnly: true, secure: isProduction(), sameSite: "lax" });
  res.clearCookie("refresh_token", { httpOnly: true, secure: isProduction(), sameSite: "lax" });
}

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ userId, type: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  return { accessToken, refreshToken };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  if (!validateEmail(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email: normalizedEmail, password: hashedPassword },
  });

  const { accessToken, refreshToken } = generateTokens(user.id);
  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const { accessToken, refreshToken } = generateTokens(user.id);
  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
  });
});

router.post("/logout", (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.status(200).json({ message: "Logged out" });
});

router.post("/refresh", async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; type: string };

    if (payload.type !== "refresh") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);
    setAuthCookies(res, accessToken, newRefreshToken);

    res.status(200).json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    });
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  const token = req.cookies?.access_token;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.status(200).json({ user });
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;
