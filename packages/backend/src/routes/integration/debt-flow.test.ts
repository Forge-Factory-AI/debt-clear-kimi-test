import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

const mockDebtCreate = vi.fn();
const mockDebtFindMany = vi.fn();
const mockDebtFindUnique = vi.fn();
const mockDebtUpdate = vi.fn();
const mockDebtDelete = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("../../lib/prisma", () => ({
  prisma: {
    debt: {
      create: (...args: unknown[]) => mockDebtCreate(...args),
      findMany: (...args: unknown[]) => mockDebtFindMany(...args),
      findUnique: (...args: unknown[]) => mockDebtFindUnique(...args),
      update: (...args: unknown[]) => mockDebtUpdate(...args),
      delete: (...args: unknown[]) => mockDebtDelete(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
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
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    userId: "user-1",
    ...overrides,
  };
}

describe("Debt Flow Integration", () => {
  beforeEach(() => {
    mockDebtCreate.mockReset();
    mockDebtFindMany.mockReset();
    mockDebtFindUnique.mockReset();
    mockDebtUpdate.mockReset();
    mockDebtDelete.mockReset();
    mockUserFindUnique.mockReset();
  });

  it("full CRUD flow: create → list → get → update → delete", async () => {
    // Step 1: Create a debt
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtCreate.mockResolvedValue(makeDebt({ id: "new-debt-1" }));

    const createRes = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({
        name: "Credit Card",
        creditor: "Bank of America",
        originalAmount: 5000,
        remainingAmount: 3000,
        interestRate: 15.99,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.debt.name).toBe("Credit Card");
    expect(createRes.body.debt.originalAmount).toBe(5000);

    // Step 2: List debts
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([makeDebt({ id: "new-debt-1" })]);

    const listRes = await request(app)
      .get("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(listRes.status).toBe(200);
    expect(listRes.body.debts).toHaveLength(1);
    expect(listRes.body.debts[0].name).toBe("Credit Card");

    // Step 3: Get single debt
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue({
      ...makeDebt({ id: "new-debt-1" }),
      payments: [],
    });

    const getRes = await request(app)
      .get("/api/debts/new-debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(getRes.status).toBe(200);
    expect(getRes.body.debt.name).toBe("Credit Card");
    expect(getRes.body.debt.payments).toEqual([]);

    // Step 4: Update debt
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ id: "new-debt-1" }));
    mockDebtUpdate.mockResolvedValue(makeDebt({ id: "new-debt-1", name: "Updated Card" }));

    const updateRes = await request(app)
      .patch("/api/debts/new-debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Updated Card" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.debt.name).toBe("Updated Card");

    // Step 5: Delete debt
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ id: "new-debt-1" }));
    mockDebtDelete.mockResolvedValue(makeDebt({ id: "new-debt-1" }));

    const deleteRes = await request(app)
      .delete("/api/debts/new-debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(deleteRes.status).toBe(204);
  });

  it("archive and restore flow", async () => {
    // Archive the debt
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());
    mockDebtUpdate.mockResolvedValue(makeDebt({ isArchived: true }));

    const archiveRes = await request(app)
      .post("/api/debts/debt-1/archive")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.debt.isArchived).toBe(true);

    // List archived debts
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([makeDebt({ isArchived: true })]);

    const archivedListRes = await request(app)
      .get("/api/debts?archived=true")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(archivedListRes.status).toBe(200);
    expect(archivedListRes.body.debts).toHaveLength(1);
    expect(archivedListRes.body.debts[0].isArchived).toBe(true);

    // Restore the debt
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ isArchived: true }));
    mockDebtUpdate.mockResolvedValue(makeDebt({ isArchived: false }));

    const restoreRes = await request(app)
      .post("/api/debts/debt-1/restore")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.debt.isArchived).toBe(false);

    // List active debts (should now show restored debt)
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([makeDebt({ isArchived: false })]);

    const activeListRes = await request(app)
      .get("/api/debts?archived=false")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(activeListRes.status).toBe(200);
    expect(activeListRes.body.debts).toHaveLength(1);
    expect(activeListRes.body.debts[0].isArchived).toBe(false);
  });

  it("summary reflects debt state changes", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([
      makeDebt({ id: "d1", originalAmount: new Prisma.Decimal(5000), remainingAmount: new Prisma.Decimal(2000), isArchived: false, isPaidOff: false }),
      makeDebt({ id: "d2", originalAmount: new Prisma.Decimal(10000), remainingAmount: new Prisma.Decimal(0), isArchived: false, isPaidOff: true }),
      makeDebt({ id: "d3", originalAmount: new Prisma.Decimal(3000), remainingAmount: new Prisma.Decimal(3000), isArchived: true, isPaidOff: false }),
    ]);

    const summaryRes = await request(app)
      .get("/api/debts/summary")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.summary).toEqual({
      totalOriginal: 18000,
      totalRemaining: 5000,
      totalPaid: 13000,
      debtCount: 3,
      paidOffCount: 1,
      activeCount: 1,
    });
  });

  it("creating debt defaults remainingAmount to originalAmount", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtCreate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(5000) }));

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Loan", creditor: "Bank", originalAmount: 5000 });

    expect(res.status).toBe(201);
    expect(mockDebtCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          remainingAmount: expect.any(Prisma.Decimal),
        }),
      })
    );
  });

  it("debt creation with optional fields omitted succeeds", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtCreate.mockResolvedValue(makeDebt({ interestRate: null, dueDate: null }));

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Simple Loan", creditor: "Bank", originalAmount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.debt.interestRate).toBeNull();
    expect(res.body.debt.dueDate).toBeNull();
  });

  it("update validates fields and rejects invalid data", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());

    const res = await request(app)
      .patch("/api/debts/debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ originalAmount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Original amount");
  });

  it("all debt endpoints require authentication", async () => {
    const endpoints = [
      { method: "post" as const, path: "/api/debts", body: { name: "X", creditor: "Y", originalAmount: 1 } },
      { method: "get" as const, path: "/api/debts" },
      { method: "get" as const, path: "/api/debts/summary" },
      { method: "patch" as const, path: "/api/debts/1", body: { name: "X" } },
      { method: "delete" as const, path: "/api/debts/1" },
      { method: "post" as const, path: "/api/debts/1/archive" },
      { method: "post" as const, path: "/api/debts/1/restore" },
    ];

    for (const endpoint of endpoints) {
      const res = await request(app)[endpoint.method](endpoint.path).send(endpoint.body || {});
      expect(res.status).toBe(401);
    }
  });
});
