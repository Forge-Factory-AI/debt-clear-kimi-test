import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../services/prisma.js";

async function cleanupDb() {
  await prisma.payment.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.user.deleteMany();
}

async function createUserAndGetCookies(email: string): Promise<string[]> {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password: "password123", name: "Test User" });
  return (res.headers["set-cookie"] as unknown as string[]) ?? [];
}

async function createDebt(cookies: string[], data: Record<string, unknown>) {
  return request(app).post("/api/debts").set("Cookie", cookies).send(data);
}

beforeEach(async () => {
  await cleanupDb();
});

afterAll(async () => {
  await cleanupDb();
  await prisma.$disconnect();
});

describe("POST /api/debts", () => {
  it("returns 201 and creates a debt with remaining defaulting to totalAmount", async () => {
    const cookies = await createUserAndGetCookies("create@example.com");

    const res = await createDebt(cookies, {
      name: "Car Loan",
      totalAmount: 15000,
      description: "Auto loan",
      category: "Auto",
    });

    expect(res.status).toBe(201);
    expect(res.body.debt).toBeDefined();
    expect(res.body.debt.name).toBe("Car Loan");
    expect(res.body.debt.totalAmount).toBe("15000");
    expect(res.body.debt.remaining).toBe("15000");
    expect(res.body.debt.description).toBe("Auto loan");
    expect(res.body.debt.category).toBe("Auto");
    expect(res.body.debt.isArchived).toBe(false);
    expect(res.body.debt.isPaidOff).toBe(false);
  });

  it("returns 201 with explicit remaining amount", async () => {
    const cookies = await createUserAndGetCookies("create2@example.com");

    const res = await createDebt(cookies, {
      name: "Credit Card",
      totalAmount: 5000,
      remaining: 2500,
    });

    expect(res.status).toBe(201);
    expect(res.body.debt.remaining).toBe("2500");
  });

  it("returns 400 for invalid input (missing name)", async () => {
    const cookies = await createUserAndGetCookies("invalid@example.com");

    const res = await createDebt(cookies, {
      totalAmount: 1000,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("returns 400 for invalid input (negative totalAmount)", async () => {
    const cookies = await createUserAndGetCookies("invalid2@example.com");

    const res = await createDebt(cookies, {
      name: "Bad Debt",
      totalAmount: -100,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).post("/api/debts").send({
      name: "Test",
      totalAmount: 1000,
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/debts", () => {
  it("returns only active debts by default", async () => {
    const cookies = await createUserAndGetCookies("list@example.com");

    await createDebt(cookies, { name: "Active 1", totalAmount: 1000 });
    await createDebt(cookies, { name: "Active 2", totalAmount: 2000 });

    const res = await request(app).get("/api/debts").set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.debts).toHaveLength(2);
    expect(res.body.debts.every((d: { isArchived: boolean; isPaidOff: boolean }) => !d.isArchived && !d.isPaidOff)).toBe(true);
  });

  it("filters archived debts", async () => {
    const cookies = await createUserAndGetCookies("archived@example.com");

    const debtRes = await createDebt(cookies, { name: "To Archive", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    await request(app).post(`/api/debts/${debtId}/archive`).set("Cookie", cookies);

    const res = await request(app).get("/api/debts?filter=archived").set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.debts).toHaveLength(1);
    expect(res.body.debts[0].name).toBe("To Archive");
    expect(res.body.debts[0].isArchived).toBe(true);
  });

  it("filters paid-off debts", async () => {
    const cookies = await createUserAndGetCookies("paidoff@example.com");

    const debtRes = await createDebt(cookies, { name: "To Pay Off", totalAmount: 1000, remaining: 500 });
    const debtId = debtRes.body.debt.id;

    await request(app).patch(`/api/debts/${debtId}`).set("Cookie", cookies).send({ remaining: 0 });

    const res = await request(app).get("/api/debts?filter=paid-off").set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.debts).toHaveLength(1);
    expect(res.body.debts[0].name).toBe("To Pay Off");
    expect(res.body.debts[0].isPaidOff).toBe(true);
  });

  it("does not show other users' debts", async () => {
    const cookies1 = await createUserAndGetCookies("user1@example.com");
    const cookies2 = await createUserAndGetCookies("user2@example.com");

    await createDebt(cookies1, { name: "User1 Debt", totalAmount: 1000 });
    await createDebt(cookies2, { name: "User2 Debt", totalAmount: 2000 });

    const res = await request(app).get("/api/debts").set("Cookie", cookies1);

    expect(res.status).toBe(200);
    expect(res.body.debts).toHaveLength(1);
    expect(res.body.debts[0].name).toBe("User1 Debt");
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/api/debts");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/debts/:id", () => {
  it("returns a single debt with payments", async () => {
    const cookies = await createUserAndGetCookies("single@example.com");

    const debtRes = await createDebt(cookies, { name: "Single", totalAmount: 5000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app).get(`/api/debts/${debtId}`).set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.debt).toBeDefined();
    expect(res.body.debt.name).toBe("Single");
    expect(res.body.debt.payments).toEqual([]);
  });

  it("returns 404 for non-existent debt", async () => {
    const cookies = await createUserAndGetCookies("notfound@example.com");

    const res = await request(app).get("/api/debts/non-existent-id").set("Cookie", cookies);

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's debt", async () => {
    const cookies1 = await createUserAndGetCookies("owner@example.com");
    const cookies2 = await createUserAndGetCookies("intruder@example.com");

    const debtRes = await createDebt(cookies1, { name: "Private", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app).get(`/api/debts/${debtId}`).set("Cookie", cookies2);

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/debts/:id", () => {
  it("updates a debt's name and amount", async () => {
    const cookies = await createUserAndGetCookies("update@example.com");

    const debtRes = await createDebt(cookies, { name: "Old Name", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .patch(`/api/debts/${debtId}`)
      .set("Cookie", cookies)
      .send({ name: "New Name", totalAmount: 2000 });

    expect(res.status).toBe(200);
    expect(res.body.debt.name).toBe("New Name");
    expect(res.body.debt.totalAmount).toBe("2000");
  });

  it("auto-sets isPaidOff when remaining reaches 0", async () => {
    const cookies = await createUserAndGetCookies("payoff@example.com");

    const debtRes = await createDebt(cookies, { name: "Almost Done", totalAmount: 1000, remaining: 100 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .patch(`/api/debts/${debtId}`)
      .set("Cookie", cookies)
      .send({ remaining: 0 });

    expect(res.status).toBe(200);
    expect(res.body.debt.remaining).toBe("0");
    expect(res.body.debt.isPaidOff).toBe(true);
  });

  it("clears isPaidOff when remaining goes from 0 to positive", async () => {
    const cookies = await createUserAndGetCookies("unpayoff@example.com");

    const debtRes = await createDebt(cookies, { name: "Paid", totalAmount: 1000, remaining: 0 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .patch(`/api/debts/${debtId}`)
      .set("Cookie", cookies)
      .send({ remaining: 500 });

    expect(res.status).toBe(200);
    expect(res.body.debt.remaining).toBe("500");
    expect(res.body.debt.isPaidOff).toBe(false);
  });

  it("returns 400 for invalid input", async () => {
    const cookies = await createUserAndGetCookies("badupdate@example.com");

    const debtRes = await createDebt(cookies, { name: "Test", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .patch(`/api/debts/${debtId}`)
      .set("Cookie", cookies)
      .send({ totalAmount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("returns 404 for another user's debt", async () => {
    const cookies1 = await createUserAndGetCookies("owner2@example.com");
    const cookies2 = await createUserAndGetCookies("intruder2@example.com");

    const debtRes = await createDebt(cookies1, { name: "Private", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .patch(`/api/debts/${debtId}`)
      .set("Cookie", cookies2)
      .send({ name: "Hacked" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/debts/:id", () => {
  it("deletes a debt and cascades payments", async () => {
    const cookies = await createUserAndGetCookies("delete@example.com");

    const debtRes = await createDebt(cookies, { name: "To Delete", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    // Add a payment
    await prisma.payment.create({
      data: { amount: 100, debtId },
    });

    const res = await request(app).delete(`/api/debts/${debtId}`).set("Cookie", cookies);

    expect(res.status).toBe(204);

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(debt).toBeNull();

    const payments = await prisma.payment.findMany({ where: { debtId } });
    expect(payments).toHaveLength(0);
  });

  it("returns 404 for another user's debt", async () => {
    const cookies1 = await createUserAndGetCookies("owner3@example.com");
    const cookies2 = await createUserAndGetCookies("intruder3@example.com");

    const debtRes = await createDebt(cookies1, { name: "Private", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app).delete(`/api/debts/${debtId}`).set("Cookie", cookies2);

    expect(res.status).toBe(404);
  });
});

describe("POST /api/debts/:id/archive", () => {
  it("archives a debt", async () => {
    const cookies = await createUserAndGetCookies("archive@example.com");

    const debtRes = await createDebt(cookies, { name: "To Archive", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app).post(`/api/debts/${debtId}/archive`).set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.debt.isArchived).toBe(true);
  });

  it("returns 404 for another user's debt", async () => {
    const cookies1 = await createUserAndGetCookies("owner4@example.com");
    const cookies2 = await createUserAndGetCookies("intruder4@example.com");

    const debtRes = await createDebt(cookies1, { name: "Private", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app).post(`/api/debts/${debtId}/archive`).set("Cookie", cookies2);

    expect(res.status).toBe(404);
  });
});

describe("POST /api/debts/:id/restore", () => {
  it("restores an archived debt", async () => {
    const cookies = await createUserAndGetCookies("restore@example.com");

    const debtRes = await createDebt(cookies, { name: "To Restore", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    await request(app).post(`/api/debts/${debtId}/archive`).set("Cookie", cookies);

    const res = await request(app).post(`/api/debts/${debtId}/restore`).set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.debt.isArchived).toBe(false);
  });

  it("returns 404 for another user's debt", async () => {
    const cookies1 = await createUserAndGetCookies("owner5@example.com");
    const cookies2 = await createUserAndGetCookies("intruder5@example.com");

    const debtRes = await createDebt(cookies1, { name: "Private", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    await request(app).post(`/api/debts/${debtId}/archive`).set("Cookie", cookies1);

    const res = await request(app).post(`/api/debts/${debtId}/restore`).set("Cookie", cookies2);

    expect(res.status).toBe(404);
  });
});

describe("GET /api/debts/summary", () => {
  it("returns correct summary stats", async () => {
    const cookies = await createUserAndGetCookies("summary@example.com");

    await createDebt(cookies, { name: "Active 1", totalAmount: 1000, remaining: 500 });
    await createDebt(cookies, { name: "Active 2", totalAmount: 2000, remaining: 1000 });

    const paidOffRes = await createDebt(cookies, { name: "Paid", totalAmount: 3000, remaining: 0 });
    await request(app).patch(`/api/debts/${paidOffRes.body.debt.id}`).set("Cookie", cookies).send({ remaining: 0 });

    const archivedRes = await createDebt(cookies, { name: "Archived", totalAmount: 4000 });
    await request(app).post(`/api/debts/${archivedRes.body.debt.id}/archive`).set("Cookie", cookies);

    const res = await request(app).get("/api/debts/summary").set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.totalDebts).toBe(4);
    expect(res.body.summary.activeDebts).toBe(2);
    expect(res.body.summary.paidOffDebts).toBe(1);
    expect(res.body.summary.archivedDebts).toBe(1);
    expect(res.body.summary.totalOwed).toBe(5500);
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/api/debts/summary");
    expect(res.status).toBe(401);
  });

  it("does not include other users' debts in summary", async () => {
    const cookies1 = await createUserAndGetCookies("sum1@example.com");
    const cookies2 = await createUserAndGetCookies("sum2@example.com");

    await createDebt(cookies1, { name: "User1 Debt", totalAmount: 5000 });
    await createDebt(cookies2, { name: "User2 Debt", totalAmount: 3000 });

    const res = await request(app).get("/api/debts/summary").set("Cookie", cookies1);

    expect(res.status).toBe(200);
    expect(res.body.summary.totalDebts).toBe(1);
    expect(res.body.summary.totalOwed).toBe(5000);
  });
});
