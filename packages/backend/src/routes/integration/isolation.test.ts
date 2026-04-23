import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

const mockDebtFindUnique = vi.fn();
const mockDebtFindMany = vi.fn();
const mockDebtUpdate = vi.fn();
const mockDebtDelete = vi.fn();
const mockPaymentFindUnique = vi.fn();
const mockPaymentFindMany = vi.fn();
const mockPaymentDelete = vi.fn();
const mockPaymentCreate = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("../../lib/prisma", () => ({
  prisma: {
    debt: {
      findUnique: (...args: unknown[]) => mockDebtFindUnique(...args),
      findMany: (...args: unknown[]) => mockDebtFindMany(...args),
      update: (...args: unknown[]) => mockDebtUpdate(...args),
      delete: (...args: unknown[]) => mockDebtDelete(...args),
    },
    payment: {
      findUnique: (...args: unknown[]) => mockPaymentFindUnique(...args),
      findMany: (...args: unknown[]) => mockPaymentFindMany(...args),
      delete: (...args: unknown[]) => mockPaymentDelete(...args),
      create: (...args: unknown[]) => mockPaymentCreate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
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

function makeDebt(overrides: Partial<{
  id: string;
  name: string;
  userId: string;
  isArchived: boolean;
  isPaidOff: boolean;
  paidOffAt: Date | null;
  remainingAmount: Prisma.Decimal;
}> = {}) {
  return {
    id: "debt-user2",
    name: "User 2 Debt",
    creditor: "Bank",
    originalAmount: new Prisma.Decimal(5000),
    remainingAmount: new Prisma.Decimal(3000),
    interestRate: null,
    dueDate: null,
    isArchived: false,
    isPaidOff: false,
    paidOffAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    userId: "user-2",
    ...overrides,
  };
}

describe("Isolation Tests — Cross-User Boundary Enforcement", () => {
  beforeEach(() => {
    mockDebtFindUnique.mockReset();
    mockDebtFindMany.mockReset();
    mockDebtUpdate.mockReset();
    mockDebtDelete.mockReset();
    mockPaymentFindUnique.mockReset();
    mockPaymentFindMany.mockReset();
    mockPaymentDelete.mockReset();
    mockPaymentCreate.mockReset();
    mockUserFindUnique.mockReset();
  });

  describe("User A cannot access User B's debts", () => {
    it("GET /api/debts/:id returns 403 for User B's debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

      const res = await request(app)
        .get("/api/debts/debt-user2")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(403);
    });

    it("PATCH /api/debts/:id returns 403 for User B's debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

      const res = await request(app)
        .patch("/api/debts/debt-user2")
        .set("Cookie", [`access_token=${makeToken("user-1")}`])
        .send({ name: "Hacked" });

      expect(res.status).toBe(403);
    });

    it("DELETE /api/debts/:id returns 403 for User B's debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

      const res = await request(app)
        .delete("/api/debts/debt-user2")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(403);
    });

    it("POST /api/debts/:id/archive returns 403 for User B's debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

      const res = await request(app)
        .post("/api/debts/debt-user2/archive")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(403);
    });

    it("POST /api/debts/:id/restore returns 403 for User B's debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2", isArchived: true }));

      const res = await request(app)
        .post("/api/debts/debt-user2/restore")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(403);
    });

    it("GET /api/debts only returns User A's debts", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindMany.mockResolvedValue([makeDebt({ id: "d1", userId: "user-1" })]);

      const res = await request(app)
        .get("/api/debts")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(200);
      expect(mockDebtFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1" }),
        })
      );
    });
  });

  describe("User A cannot access User B's payments", () => {
    it("POST /api/debts/:id/payments returns 403 for User B's debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

      const res = await request(app)
        .post("/api/debts/debt-user2/payments")
        .set("Cookie", [`access_token=${makeToken("user-1")}`])
        .send({ amount: 100 });

      expect(res.status).toBe(403);
    });

    it("GET /api/debts/:id/payments returns 403 for User B's debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

      const res = await request(app)
        .get("/api/debts/debt-user2/payments")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(403);
    });

    it("POST /api/debts/:id/celebrate returns 403 for User B's paid-off debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2", isPaidOff: true, paidOffAt: new Date("2024-01-15") }));

      const res = await request(app)
        .post("/api/debts/debt-user2/celebrate")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(403);
    });

    it("DELETE /api/payments/:id returns 403 for User B's payment", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockPaymentFindUnique.mockResolvedValue({
        id: "payment-user2",
        amount: new Prisma.Decimal(500),
        note: null,
        paidAt: new Date("2024-01-15"),
        debtId: "debt-user2",
        debt: makeDebt({ userId: "user-2" }),
      });

      const res = await request(app)
        .delete("/api/payments/payment-user2")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(403);
    });
  });

  describe("User A cannot modify User B's resources", () => {
    it("cannot change ownership of a debt via update", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

      const res = await request(app)
        .patch("/api/debts/debt-user2")
        .set("Cookie", [`access_token=${makeToken("user-1")}`])
        .send({ name: "Hacked Name", creditor: "Hacked Bank" });

      expect(res.status).toBe(403);
      expect(mockDebtUpdate).not.toHaveBeenCalled();
    });

    it("cannot delete User B's debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

      const res = await request(app)
        .delete("/api/debts/debt-user2")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(403);
      expect(mockDebtDelete).not.toHaveBeenCalled();
    });

    it("cannot archive User B's debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

      const res = await request(app)
        .post("/api/debts/debt-user2/archive")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(403);
      expect(mockDebtUpdate).not.toHaveBeenCalled();
    });

    it("cannot restore User B's archived debt", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2", isArchived: true }));

      const res = await request(app)
        .post("/api/debts/debt-user2/restore")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(403);
      expect(mockDebtUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Summary is scoped to authenticated user only", () => {
    it("summary query uses authenticated user's ID", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user1@example.com" });
      mockDebtFindMany.mockResolvedValue([
        { id: "d1", originalAmount: new Prisma.Decimal(1000), remainingAmount: new Prisma.Decimal(500), isPaidOff: false, isArchived: false, userId: "user-1" },
      ]);

      const res = await request(app)
        .get("/api/debts/summary")
        .set("Cookie", [`access_token=${makeToken("user-1")}`]);

      expect(res.status).toBe(200);
      expect(mockDebtFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
        })
      );
    });
  });
});
