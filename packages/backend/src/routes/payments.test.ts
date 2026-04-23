import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
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

// Helper to simulate Prisma $transaction with an array of promises
async function mockTransaction(promises: unknown[]) {
  const results: unknown[] = [];
  for (const p of promises) {
    results.push(await p);
  }
  return results;
}

vi.mock("../lib/prisma", () => ({
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
  creditor: string;
  originalAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
  interestRate: Prisma.Decimal | null;
  dueDate: Date | null;
  isArchived: boolean;
  isPaidOff: boolean;
  paidOffAt: Date | null;
  userId: string;
}> = {}) {
  return {
    id: "debt-1",
    name: "Credit Card",
    creditor: "Bank of America",
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
  paidAt: Date;
  debtId: string;
}> = {}) {
  return {
    id: "payment-1",
    amount: new Prisma.Decimal(1000),
    paidAt: new Date("2024-01-15"),
    debtId: "debt-1",
    ...overrides,
  };
}

beforeEach(() => {
  mockPaymentCreate.mockReset();
  mockPaymentFindMany.mockReset();
  mockPaymentFindUnique.mockReset();
  mockPaymentDelete.mockReset();
  mockDebtFindUnique.mockReset();
  mockDebtUpdate.mockReset();
  mockUserFindUnique.mockReset();
});

describe("POST /api/debts/:id/payments", () => {
  it("creates a payment and reduces balance", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(3000) }));
    mockPaymentCreate.mockResolvedValue(makePayment({ amount: new Prisma.Decimal(1000) }));
    mockDebtUpdate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(2000) }));

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment.amount).toBe(1000);
    expect(res.body.debt.remainingAmount).toBe(2000);
  });

  it("floors remaining balance at 0 on overpayment", async () => {
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
  });

  it("sets paidOffAt when payoff occurs", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(1000) }));
    mockPaymentCreate.mockResolvedValue(makePayment({ amount: new Prisma.Decimal(1000) }));
    mockDebtUpdate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(0), isPaidOff: true, paidOffAt: new Date("2024-01-15") }));

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.debt.isPaidOff).toBe(true);
    expect(res.body.debt.paidOffAt).toBeDefined();
  });

  it("does not change paidOffAt on partial payment", async () => {
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
    expect(res.body.debt.paidOffAt).toBeNull();
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .send({ amount: 1000 });

    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/debts/nonexistent/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 1000 });

    expect(res.status).toBe(404);
  });

  it("returns 403 for debt owned by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 1000 });

    expect(res.status).toBe(403);
  });

  it("returns 400 for missing amount", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Amount");
  });

  it("returns 400 for zero amount", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Amount");
  });

  it("returns 400 for negative amount", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Amount");
  });
});

describe("GET /api/debts/:id/payments", () => {
  it("returns payments sorted by paidAt desc", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());
    mockPaymentFindMany.mockResolvedValue([
      makePayment({ id: "payment-2", amount: new Prisma.Decimal(500), paidAt: new Date("2024-01-20") }),
      makePayment({ id: "payment-1", amount: new Prisma.Decimal(1000), paidAt: new Date("2024-01-15") }),
    ]);

    const res = await request(app)
      .get("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body.payments).toHaveLength(2);
    expect(mockPaymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { debtId: "debt-1" },
        orderBy: { paidAt: "desc" },
      })
    );
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/debts/debt-1/payments");
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/debts/nonexistent/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(404);
  });

  it("returns 403 for debt owned by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

    const res = await request(app)
      .get("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(403);
  });
});

describe("GET /api/debts/:id", () => {
  it("returns a debt with payments", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue({
      ...makeDebt(),
      payments: [
        makePayment({ id: "payment-1", amount: new Prisma.Decimal(1000) }),
      ],
    });

    const res = await request(app)
      .get("/api/debts/debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body.debt).toBeDefined();
    expect(res.body.debt.payments).toHaveLength(1);
    expect(res.body.debt.payments[0].amount).toBe(1000);
  });

  it("returns 404 for non-existent debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/debts/nonexistent")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(404);
  });

  it("returns 403 for debt owned by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

    const res = await request(app)
      .get("/api/debts/debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/debts/debt-1");
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/payments/:id", () => {
  it("deletes a payment and restores balance", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockPaymentFindUnique.mockResolvedValue({
      ...makePayment(),
      debt: makeDebt({ remainingAmount: new Prisma.Decimal(2000) }),
    });
    mockPaymentDelete.mockResolvedValue(makePayment());
    mockDebtUpdate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(3000) }));

    const res = await request(app)
      .delete("/api/payments/payment-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(204);
  });

  it("clears paid-off status when deleting from paid-off debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockPaymentFindUnique.mockResolvedValue({
      ...makePayment(),
      debt: makeDebt({ remainingAmount: new Prisma.Decimal(0), isPaidOff: true, paidOffAt: new Date("2024-01-15") }),
    });
    mockPaymentDelete.mockResolvedValue(makePayment());
    mockDebtUpdate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(1000), isPaidOff: false, paidOffAt: null }));

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

  it("returns 404 for non-existent payment", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockPaymentFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/payments/nonexistent")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(404);
  });

  it("returns 403 for payment on debt owned by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockPaymentFindUnique.mockResolvedValue({
      ...makePayment(),
      debt: makeDebt({ userId: "user-2" }),
    });

    const res = await request(app)
      .delete("/api/payments/payment-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).delete("/api/payments/payment-1");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/debts/:id/celebrate", () => {
  it("returns celebration for paid-off debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ isPaidOff: true, paidOffAt: new Date("2024-01-15"), remainingAmount: new Prisma.Decimal(0) }));

    const res = await request(app)
      .post("/api/debts/debt-1/celebrate")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body.celebration).toBeDefined();
    expect(res.body.celebration.message).toContain("Congratulations");
  });

  it("returns 400 for non-paid-off debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ isPaidOff: false, remainingAmount: new Prisma.Decimal(3000) }));

    const res = await request(app)
      .post("/api/debts/debt-1/celebrate")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("not paid off");
  });

  it("returns 404 for non-existent debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/debts/nonexistent/celebrate")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(404);
  });

  it("returns 403 for debt owned by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2", isPaidOff: true, paidOffAt: new Date("2024-01-15") }));

    const res = await request(app)
      .post("/api/debts/debt-1/celebrate")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/api/debts/debt-1/celebrate");
    expect(res.status).toBe(401);
  });
});

describe("User scoping for payments", () => {
  it("prevents user-1 from creating payments on user-2's debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

    const res = await request(app)
      .post("/api/debts/debt-1/payments")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ amount: 1000 });

    expect(res.status).toBe(403);
  });

  it("prevents user-1 from deleting user-2's payment", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockPaymentFindUnique.mockResolvedValue({
      ...makePayment(),
      debt: makeDebt({ userId: "user-2" }),
    });

    const res = await request(app)
      .delete("/api/payments/payment-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(403);
  });
});
