import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

const mockDebtCreate = vi.fn();
const mockDebtFindMany = vi.fn();
const mockDebtFindUnique = vi.fn();
const mockDebtUpdate = vi.fn();
const mockDebtDelete = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("../lib/prisma", () => ({
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

beforeEach(() => {
  mockDebtCreate.mockReset();
  mockDebtFindMany.mockReset();
  mockDebtFindUnique.mockReset();
  mockDebtUpdate.mockReset();
  mockDebtDelete.mockReset();
  mockUserFindUnique.mockReset();
});

describe("POST /api/debts", () => {
  it("returns 201 and creates a debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtCreate.mockResolvedValue(makeDebt());

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({
        name: "Credit Card",
        creditor: "Bank of America",
        originalAmount: 5000,
        remainingAmount: 3000,
        interestRate: 15.99,
      });

    expect(res.status).toBe(201);
    expect(res.body.debt).toBeDefined();
    expect(res.body.debt.name).toBe("Credit Card");
    expect(res.body.debt.originalAmount).toBe(5000);
    expect(res.body.debt.remainingAmount).toBe(3000);
  });

  it("defaults remainingAmount to originalAmount", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtCreate.mockResolvedValue(makeDebt({ remainingAmount: new Prisma.Decimal(5000) }));

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({
        name: "Credit Card",
        creditor: "Bank of America",
        originalAmount: 5000,
      });

    expect(res.status).toBe(201);
    expect(mockDebtCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          remainingAmount: expect.any(Prisma.Decimal),
        }),
      })
    );
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/debts")
      .send({ name: "Credit Card", creditor: "Bank", originalAmount: 1000 });

    expect(res.status).toBe(401);
  });

  it("returns 400 for missing name", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ creditor: "Bank", originalAmount: 1000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Name");
  });

  it("returns 400 for missing creditor", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Credit Card", originalAmount: 1000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Creditor");
  });

  it("returns 400 for missing originalAmount", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Credit Card", creditor: "Bank" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Original amount");
  });

  it("returns 400 for negative originalAmount", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Credit Card", creditor: "Bank", originalAmount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Original amount");
  });

  it("returns 400 for zero originalAmount", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Credit Card", creditor: "Bank", originalAmount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Original amount");
  });

  it("returns 400 for invalid dueDate", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Credit Card", creditor: "Bank", originalAmount: 1000, dueDate: "not-a-date" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Due date");
  });

  it("allows optional fields to be omitted", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtCreate.mockResolvedValue(makeDebt({ interestRate: null, dueDate: null }));

    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Credit Card", creditor: "Bank", originalAmount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.debt.interestRate).toBeNull();
  });
});

describe("GET /api/debts", () => {
  it("returns active debts by default (not archived, not paid off)", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([makeDebt()]);

    const res = await request(app)
      .get("/api/debts")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(mockDebtFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", isArchived: false, isPaidOff: false }),
      })
    );
    expect(res.body.debts).toHaveLength(1);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/debts");
    expect(res.status).toBe(401);
  });

  it("filters archived debts with ?archived=true", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([makeDebt({ isArchived: true })]);

    const res = await request(app)
      .get("/api/debts?archived=true")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(mockDebtFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", isArchived: true }),
      })
    );
  });

  it("filters non-archived debts with ?archived=false", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([makeDebt()]);

    const res = await request(app)
      .get("/api/debts?archived=false")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(mockDebtFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", isArchived: false }),
      })
    );
  });

  it("filters paid-off debts with ?paidOff=true", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([makeDebt({ isPaidOff: true, remainingAmount: new Prisma.Decimal(0) })]);

    const res = await request(app)
      .get("/api/debts?paidOff=true")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(mockDebtFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", isPaidOff: true }),
      })
    );
  });

  it("filters non-paid-off debts with ?paidOff=false", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([makeDebt()]);

    const res = await request(app)
      .get("/api/debts?paidOff=false")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(mockDebtFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", isPaidOff: false }),
      })
    );
  });

  it("combines archived and paidOff filters", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([]);

    await request(app)
      .get("/api/debts?archived=true&paidOff=true")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(mockDebtFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", isArchived: true, isPaidOff: true }),
      })
    );
  });

  it("only returns debts for the authenticated user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([makeDebt({ userId: "user-1" })]);

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

describe("GET /api/debts/summary", () => {
  it("returns correct summary stats", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([
      makeDebt({ originalAmount: new Prisma.Decimal(5000), remainingAmount: new Prisma.Decimal(3000), isArchived: false, isPaidOff: false }),
      makeDebt({ id: "debt-2", originalAmount: new Prisma.Decimal(10000), remainingAmount: new Prisma.Decimal(0), isArchived: false, isPaidOff: true }),
      makeDebt({ id: "debt-3", originalAmount: new Prisma.Decimal(2000), remainingAmount: new Prisma.Decimal(2000), isArchived: true, isPaidOff: false }),
    ]);

    const res = await request(app)
      .get("/api/debts/summary")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({
      totalOriginal: 17000,
      totalRemaining: 5000,
      totalPaid: 12000,
      debtCount: 3,
      paidOffCount: 1,
      activeCount: 1,
    });
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/debts/summary");
    expect(res.status).toBe(401);
  });

  it("returns zero values when user has no debts", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/debts/summary")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({
      totalOriginal: 0,
      totalRemaining: 0,
      totalPaid: 0,
      debtCount: 0,
      paidOffCount: 0,
      activeCount: 0,
    });
  });
});

describe("PATCH /api/debts/:id", () => {
  it("updates a debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());
    mockDebtUpdate.mockResolvedValue(makeDebt({ name: "Updated Card" }));

    const res = await request(app)
      .patch("/api/debts/debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Updated Card" });

    expect(res.status).toBe(200);
    expect(res.body.debt.name).toBe("Updated Card");
  });

  it("returns 404 for non-existent debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/debts/nonexistent")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Updated" });

    expect(res.status).toBe(404);
  });

  it("returns 403 for debt owned by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

    const res = await request(app)
      .patch("/api/debts/debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ name: "Updated" });

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).patch("/api/debts/debt-1").send({ name: "Updated" });
    expect(res.status).toBe(401);
  });

  it("validates fields on update", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());

    const res = await request(app)
      .patch("/api/debts/debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ originalAmount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Original amount");
  });

  it("updates isPaidOff", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());
    mockDebtUpdate.mockResolvedValue(makeDebt({ isPaidOff: true }));

    const res = await request(app)
      .patch("/api/debts/debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`])
      .send({ isPaidOff: true });

    expect(res.status).toBe(200);
    expect(res.body.debt.isPaidOff).toBe(true);
  });
});

describe("DELETE /api/debts/:id", () => {
  it("deletes a debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());
    mockDebtDelete.mockResolvedValue(makeDebt());

    const res = await request(app)
      .delete("/api/debts/debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(204);
    expect(mockDebtDelete).toHaveBeenCalledWith({ where: { id: "debt-1" } });
  });

  it("returns 404 for non-existent debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/debts/nonexistent")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(404);
  });

  it("returns 403 for debt owned by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

    const res = await request(app)
      .delete("/api/debts/debt-1")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).delete("/api/debts/debt-1");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/debts/:id/archive", () => {
  it("archives a debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt());
    mockDebtUpdate.mockResolvedValue(makeDebt({ isArchived: true }));

    const res = await request(app)
      .post("/api/debts/debt-1/archive")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body.debt.isArchived).toBe(true);
  });

  it("returns 404 for non-existent debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/debts/nonexistent/archive")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(404);
  });

  it("returns 403 for debt owned by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

    const res = await request(app)
      .post("/api/debts/debt-1/archive")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/api/debts/debt-1/archive");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/debts/:id/restore", () => {
  it("restores an archived debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ isArchived: true }));
    mockDebtUpdate.mockResolvedValue(makeDebt({ isArchived: false }));

    const res = await request(app)
      .post("/api/debts/debt-1/restore")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(200);
    expect(res.body.debt.isArchived).toBe(false);
  });

  it("returns 404 for non-existent debt", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/debts/nonexistent/restore")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(404);
  });

  it("returns 403 for debt owned by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindUnique.mockResolvedValue(makeDebt({ userId: "user-2" }));

    const res = await request(app)
      .post("/api/debts/debt-1/restore")
      .set("Cookie", [`access_token=${makeToken("user-1")}`]);

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/api/debts/debt-1/restore");
    expect(res.status).toBe(401);
  });
});

describe("User scoping", () => {
  it("ensures user-1 cannot see user-2's debts", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockDebtFindMany.mockResolvedValue([]);

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
