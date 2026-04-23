import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockDebtCreate = vi.fn();
const mockDebtFindUnique = vi.fn();
const mockDebtFindMany = vi.fn();
const mockDebtUpdate = vi.fn();
const mockPaymentCreate = vi.fn();
const mockPaymentFindMany = vi.fn();

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
    },
    debt: {
      create: (...args: unknown[]) => mockDebtCreate(...args),
      findUnique: (...args: unknown[]) => mockDebtFindUnique(...args),
      findMany: (...args: unknown[]) => mockDebtFindMany(...args),
      update: (...args: unknown[]) => mockDebtUpdate(...args),
    },
    payment: {
      create: (...args: unknown[]) => mockPaymentCreate(...args),
      findMany: (...args: unknown[]) => mockPaymentFindMany(...args),
    },
    $transaction: async (promises: unknown[]) => {
      const results: unknown[] = [];
      for (const p of promises) {
        results.push(await p);
      }
      return results;
    },
  },
}));

function makeToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
}

describe("API Response Format Consistency", () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
    mockUserCreate.mockReset();
    mockDebtCreate.mockReset();
    mockDebtFindUnique.mockReset();
    mockDebtFindMany.mockReset();
    mockDebtUpdate.mockReset();
    mockPaymentCreate.mockReset();
    mockPaymentFindMany.mockReset();
  });

  it("all success responses use consistent envelope format", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtCreate.mockResolvedValue({
      id: "debt-1",
      name: "Card",
      creditor: "Bank",
      originalAmount: new Prisma.Decimal(1000),
      remainingAmount: new Prisma.Decimal(500),
      interestRate: null,
      dueDate: null,
      isArchived: false,
      isPaidOff: false,
      paidOffAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user-1",
    });

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Card", creditor: "Bank", originalAmount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("debt");
    expect(res.body.debt).toHaveProperty("id");
    expect(res.body.debt).toHaveProperty("name");
    expect(res.body.debt).toHaveProperty("originalAmount");
    expect(typeof res.body.debt.originalAmount).toBe("number");
  });

  it("list endpoints wrap results in plural key", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("debts");
    expect(Array.isArray(res.body.debts)).toBe(true);
  });

  it("error responses always include error key", async () => {
    // 400 bad request
    const badReq = await request(app)
      .post("/api/auth/register")
      .send({ email: "invalid" });

    expect(badReq.status).toBe(400);
    expect(badReq.body).toHaveProperty("error");

    // 401 unauthorized
    const unauthorized = await request(app).get("/api/debts");
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.body).toHaveProperty("error");

    // 404 not found
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(null);

    const notFound = await request(app)
      .get("/api/debts/nonexistent")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(notFound.status).toBe(404);
    expect(notFound.body).toHaveProperty("error");
  });

  it("summary endpoint uses summary key", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/debts/summary")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("summary");
    expect(res.body.summary).toHaveProperty("totalOriginal");
    expect(res.body.summary).toHaveProperty("totalRemaining");
    expect(res.body.summary).toHaveProperty("totalPaid");
    expect(res.body.summary).toHaveProperty("debtCount");
    expect(res.body.summary).toHaveProperty("paidOffCount");
    expect(res.body.summary).toHaveProperty("activeCount");
  });

  it("auth endpoints use user key for user data", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: "user-new",
      email: "new@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "new@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user).toHaveProperty("email");
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("health endpoint uses status key", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("payment endpoint returns both payment and debt keys", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue({
      id: "debt-1",
      name: "Card",
      creditor: "Bank",
      originalAmount: new Prisma.Decimal(1000),
      remainingAmount: new Prisma.Decimal(500),
      interestRate: null,
      dueDate: null,
      isArchived: false,
      isPaidOff: false,
      paidOffAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user-1",
    });
    mockPaymentCreate.mockResolvedValue({
      id: "pay-1",
      amount: new Prisma.Decimal(500),
      note: null,
      paidAt: new Date(),
      debtId: "debt-1",
    });
    mockDebtUpdate.mockResolvedValue({
      id: "debt-1",
      name: "Card",
      creditor: "Bank",
      originalAmount: new Prisma.Decimal(1000),
      remainingAmount: new Prisma.Decimal(0),
      interestRate: null,
      dueDate: null,
      isArchived: false,
      isPaidOff: true,
      paidOffAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user-1",
    });

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("payment");
    expect(res.body).toHaveProperty("debt");
  });

  it("payment list endpoint uses payments key", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue({
      id: "debt-1",
      name: "Card",
      creditor: "Bank",
      originalAmount: new Prisma.Decimal(1000),
      remainingAmount: new Prisma.Decimal(500),
      interestRate: null,
      dueDate: null,
      isArchived: false,
      isPaidOff: false,
      paidOffAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user-1",
    });
    mockPaymentFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("payments");
    expect(Array.isArray(res.body.payments)).toBe(true);
  });

  it("celebration endpoint uses celebration key", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue({
      id: "debt-1",
      name: "Card",
      creditor: "Bank",
      originalAmount: new Prisma.Decimal(1000),
      remainingAmount: new Prisma.Decimal(0),
      interestRate: null,
      dueDate: null,
      isArchived: false,
      isPaidOff: true,
      paidOffAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user-1",
    });

    const res = await request(app)
      .post("/api/debts/debt-1/celebrate")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("celebration");
    expect(res.body.celebration).toHaveProperty("message");
    expect(res.body.celebration).toHaveProperty("debt");
  });

  it("decimal values are serialized as numbers, not strings", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtCreate.mockResolvedValue({
      id: "debt-1",
      name: "Card",
      creditor: "Bank",
      originalAmount: new Prisma.Decimal("1234.56"),
      remainingAmount: new Prisma.Decimal("987.65"),
      interestRate: new Prisma.Decimal("5.50"),
      dueDate: null,
      isArchived: false,
      isPaidOff: false,
      paidOffAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user-1",
    });

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Card", creditor: "Bank", originalAmount: 1234.56, remainingAmount: 987.65, interestRate: 5.5 });

    expect(res.status).toBe(201);
    expect(typeof res.body.debt.originalAmount).toBe("number");
    expect(typeof res.body.debt.remainingAmount).toBe("number");
    expect(typeof res.body.debt.interestRate).toBe("number");
  });

  it("dates are serialized as ISO strings", async () => {
    const testDate = new Date("2024-06-15T10:30:00.000Z");
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtCreate.mockResolvedValue({
      id: "debt-1",
      name: "Card",
      creditor: "Bank",
      originalAmount: new Prisma.Decimal(1000),
      remainingAmount: new Prisma.Decimal(500),
      interestRate: null,
      dueDate: testDate,
      isArchived: false,
      isPaidOff: false,
      paidOffAt: null,
      createdAt: testDate,
      updatedAt: testDate,
      userId: "user-1",
    });

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Card", creditor: "Bank", originalAmount: 1000, dueDate: "2024-06-15" });

    expect(res.status).toBe(201);
    expect(typeof res.body.debt.dueDate).toBe("string");
    expect(new Date(res.body.debt.dueDate).toISOString()).toBe(testDate.toISOString());
  });
});
