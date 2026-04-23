import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

const mockPaymentCreate = vi.fn();
const mockPaymentFindMany = vi.fn();
const mockPaymentFindUnique = vi.fn();
const mockPaymentDelete = vi.fn();
const mockDebtFindUnique = vi.fn();
const mockDebtUpdate = vi.fn();
const mockUserFindUnique = vi.fn();

async function mockTransaction(promises: unknown[]) {
  const results: unknown[] = [];
  for (const p of promises) {
    results.push(await p);
  }
  return results;
}

vi.mock("../../lib/prisma", () => ({
  prisma: {
    payment: {
      create: (...args: unknown[]) => mockPaymentCreate(...args),
      findMany: (...args: unknown[]) => mockPaymentFindMany(...args),
      findUnique: (...args: unknown[]) => mockPaymentFindUnique(...args),
      delete: (...args: unknown[]) => mockPaymentDelete(...args),
    },
    debt: {
      findUnique: (...args: unknown[]) => mockDebtFindUnique(...args),
      update: (...args: unknown[]) => mockDebtUpdate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(args[0] as unknown[]),
  },
}));

function makeToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
}

function makeDebt(overrides: Partial<{
  id: string;
  name: string;
  remainingAmount: Prisma.Decimal;
  isPaidOff: boolean;
  paidOffAt: Date | null;
  userId: string;
}> = {}) {
  return {
    id: "debt-1",
    name: "Credit Card",
    creditor: "Bank",
    originalAmount: new Prisma.Decimal(5000),
    remainingAmount: new Prisma.Decimal(3000),
    interestRate: new Prisma.Decimal(15.99),
    dueDate: null,
    isArchived: false,
    isPaidOff: false,
    paidOffAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    userId: "user-1",
    ...overrides,
  };
}

function makePayment(overrides: Partial<{
  id: string;
  amount: Prisma.Decimal;
  note: string | null;
  paidAt: Date;
  debtId: string;
}> = {}) {
  return {
    id: "payment-1",
    amount: new Prisma.Decimal(1000),
    note: null,
    paidAt: new Date("2024-01-15"),
    debtId: "debt-1",
    ...overrides,
  };
}

describe("Payment Flow Integration", () => {
  beforeEach(() => {
    mockPaymentCreate.mockReset();
    mockPaymentFindMany.mockReset();
    mockPaymentFindUnique.mockReset();
    mockPaymentDelete.mockReset();
    mockDebtFindUnique.mockReset();
    mockDebtUpdate.mockReset();
    mockUserFindUnique.mockReset();
  });

  it("full payment flow: create → list → celebrate → delete", async () => {
    // Step 1: Create a payment that pays off the debt
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(1000) }));
    mockPaymentCreate.mockResolvedValue(makePayment({ amount: new Prisma.Decimal(1000) }));
    mockDebtUpdate.mockResolvedValue(makeDebt({
      remainingAmount: new Prisma.Decimal(0),
      isPaidOff: true,
      paidOffAt: new Date("2024-01-15"),
    }));

    const createRes = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 1000 });

    expect(createRes.status).toBe(201);
    expect(createRes.body.payment.amount).toBe(1000);
    expect(createRes.body.debt.remainingAmount).toBe(0);
    expect(createRes.body.debt.isPaidOff).toBe(true);

    // Step 2: List payments for the debt
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());
    mockPaymentFindMany.mockResolvedValue([
      makePayment({ id: "payment-1", amount: new Prisma.Decimal(1000) }),
    ]);

    const listRes = await request(app)
      .get("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(listRes.status).toBe(200);
    expect(listRes.body.payments).toHaveLength(1);
    expect(listRes.body.payments[0].amount).toBe(1000);

    // Step 3: Celebrate the payoff
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({
      isPaidOff: true,
      paidOffAt: new Date("2024-01-15"),
      remainingAmount: new Prisma.Decimal(0),
    }));

    const celebrateRes = await request(app)
      .post("/api/debts/debt-1/celebrate")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(celebrateRes.status).toBe(200);
    expect(celebrateRes.body.celebration.message).toContain("Congratulations");

    // Step 4: Delete the payment (restores balance)
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockPaymentFindUnique.mockResolvedValue({
      ...makePayment(),
      debt: makeDebt({ remainingAmount: new Prisma.Decimal(0), isPaidOff: true, paidOffAt: new Date("2024-01-15") }),
    });
    mockPaymentDelete.mockResolvedValue(makePayment());
    mockDebtUpdate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(1000), isPaidOff: false, paidOffAt: null }));

    const deleteRes = await request(app)
      .delete("/api/payments/payment-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(deleteRes.status).toBe(204);
  });

  it("partial payment does not mark debt as paid off", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(3000) }));
    mockPaymentCreate.mockResolvedValue(makePayment({ amount: new Prisma.Decimal(1000) }));
    mockDebtUpdate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(2000) }));

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.debt.isPaidOff).toBe(false);
    expect(res.body.debt.remainingAmount).toBe(2000);
  });

  it("overpayment floors remaining balance at 0", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(500) }));
    mockPaymentCreate.mockResolvedValue(makePayment({ amount: new Prisma.Decimal(1000) }));
    mockDebtUpdate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(0), isPaidOff: true, paidOffAt: new Date("2024-01-15") }));

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.debt.remainingAmount).toBe(0);
    expect(res.body.debt.isPaidOff).toBe(true);
  });

  it("cannot celebrate non-paid-off debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ isPaidOff: false, remainingAmount: new Prisma.Decimal(3000) }));

    const res = await request(app)
      .post("/api/debts/debt-1/celebrate")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("not paid off");
  });

  it("payment with note is stored correctly", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(2000) }));
    mockPaymentCreate.mockResolvedValue(makePayment({ amount: new Prisma.Decimal(500), note: "Monthly payment" }));
    mockDebtUpdate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(1500) }));

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 500, note: "Monthly payment" });

    expect(res.status).toBe(201);
    expect(res.body.payment.note).toBe("Monthly payment");
  });

  it("payment with long note is rejected", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());

    const longNote = "a".repeat(256);
    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 500, note: longNote });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Note must be 255 characters or less");
  });

  it("deleting payment from non-paid-off debt does not change paid-off status", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockPaymentFindUnique.mockResolvedValue({
      ...makePayment(),
      debt: makeDebt({ remainingAmount: new Prisma.Decimal(2000), isPaidOff: false, paidOffAt: null }),
    });
    mockPaymentDelete.mockResolvedValue(makePayment());
    mockDebtUpdate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(3000), isPaidOff: false, paidOffAt: null }));

    const res = await request(app)
      .delete("/api/payments/payment-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(204);
    expect(mockDebtUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPaidOff: false,
          paidOffAt: null,
        }),
      })
    );
  });

  it("all payment endpoints require authentication", async () => {
    const endpoints = [
      { method: "post" as const, path: "/api/debts/1/payments", body: { amount: 100 } },
      { method: "get" as const, path: "/api/debts/1/payments" },
      { method: "get" as const, path: "/api/debts/1" },
      { method: "post" as const, path: "/api/debts/1/celebrate" },
      { method: "delete" as const, path: "/api/payments/1" },
    ];

    for (const endpoint of endpoints) {
      const res = await request(app)[endpoint.method](endpoint.path).send(endpoint.body || {});
      expect(res.status).toBe(401);
    }
  });
});
