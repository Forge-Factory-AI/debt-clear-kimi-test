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

describe("POST /api/debts/:debtId/payments", () => {
  it("creates a payment and reduces remaining", async () => {
    const cookies = await createUserAndGetCookies("payment1@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000, remaining: 500 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies)
      .send({ amount: 100 });

    expect(res.status).toBe(201);
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment.amount).toBe("100");
    expect(res.body.justPaidOff).toBe(false);

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(debt!.remaining.toNumber()).toBe(400);
  });

  it("returns justPaidOff when payoff occurs", async () => {
    const cookies = await createUserAndGetCookies("payoff@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000, remaining: 100 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies)
      .send({ amount: 100, note: "Final payment" });

    expect(res.status).toBe(201);
    expect(res.body.justPaidOff).toBe(true);

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(debt!.remaining.toNumber()).toBe(0);
    expect(debt!.isPaidOff).toBe(true);
    expect(debt!.paidOffAt).not.toBeNull();
  });

  it("floors remaining at 0 on overpayment", async () => {
    const cookies = await createUserAndGetCookies("overpay@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000, remaining: 100 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies)
      .send({ amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body.justPaidOff).toBe(true);

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(debt!.remaining.toNumber()).toBe(0);
  });

  it("does not set justPaidOff on already paid-off debt", async () => {
    const cookies = await createUserAndGetCookies("alreadypaid@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000, remaining: 100 });
    const debtId = debtRes.body.debt.id;

    // Pay off the debt first
    await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies)
      .send({ amount: 100 });

    // Another payment should not trigger justPaidOff
    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies)
      .send({ amount: 50 });

    expect(res.status).toBe(201);
    expect(res.body.justPaidOff).toBe(false);
  });

  it("returns 400 for non-positive amount", async () => {
    const cookies = await createUserAndGetCookies("invalidamount@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies)
      .send({ amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("returns 400 for negative amount", async () => {
    const cookies = await createUserAndGetCookies("negative@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies)
      .send({ amount: -50 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("returns 400 for note over 250 chars", async () => {
    const cookies = await createUserAndGetCookies("longnote@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies)
      .send({ amount: 100, note: "a".repeat(251) });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("returns 404 for non-existent debt", async () => {
    const cookies = await createUserAndGetCookies("notfound@example.com");

    const res = await request(app)
      .post("/api/debts/non-existent-id/payments")
      .set("Cookie", cookies)
      .send({ amount: 100 });

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's debt", async () => {
    const cookies1 = await createUserAndGetCookies("owner@example.com");
    const cookies2 = await createUserAndGetCookies("intruder@example.com");

    const debtRes = await createDebt(cookies1, { name: "Private", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies2)
      .send({ amount: 100 });

    expect(res.status).toBe(404);
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app)
      .post("/api/debts/some-id/payments")
      .send({ amount: 100 });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/debts/:debtId/payments", () => {
  it("returns payments in reverse chronological order", async () => {
    const cookies = await createUserAndGetCookies("list@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    await prisma.payment.create({
      data: { amount: 100, note: "First", debtId },
    });
    await new Promise((r) => setTimeout(r, 10));
    await prisma.payment.create({
      data: { amount: 200, note: "Second", debtId },
    });

    const res = await request(app)
      .get(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.payments).toHaveLength(2);
    expect(res.body.payments[0].amount).toBe("200");
    expect(res.body.payments[1].amount).toBe("100");
  });

  it("returns empty array when no payments exist", async () => {
    const cookies = await createUserAndGetCookies("empty@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .get(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.payments).toEqual([]);
  });

  it("returns 404 for non-existent debt", async () => {
    const cookies = await createUserAndGetCookies("notfound2@example.com");

    const res = await request(app)
      .get("/api/debts/non-existent-id/payments")
      .set("Cookie", cookies);

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's debt", async () => {
    const cookies1 = await createUserAndGetCookies("owner2@example.com");
    const cookies2 = await createUserAndGetCookies("intruder2@example.com");

    const debtRes = await createDebt(cookies1, { name: "Private", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .get(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies2);

    expect(res.status).toBe(404);
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/api/debts/some-id/payments");
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/payments/:id", () => {
  it("deletes a payment and restores remaining", async () => {
    const cookies = await createUserAndGetCookies("delete1@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000, remaining: 500 });
    const debtId = debtRes.body.debt.id;

    const payment = await prisma.payment.create({
      data: { amount: 100, debtId },
    });

    const res = await request(app)
      .delete(`/api/payments/${payment.id}`)
      .set("Cookie", cookies);

    expect(res.status).toBe(204);

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(debt!.remaining.toNumber()).toBe(600);
  });

  it("caps restored remaining at totalAmount", async () => {
    const cookies = await createUserAndGetCookies("deletecap@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000, remaining: 950 });
    const debtId = debtRes.body.debt.id;

    const payment = await prisma.payment.create({
      data: { amount: 100, debtId },
    });

    const res = await request(app)
      .delete(`/api/payments/${payment.id}`)
      .set("Cookie", cookies);

    expect(res.status).toBe(204);

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(debt!.remaining.toNumber()).toBe(1000);
  });

  it("clears paid-off status when deleting payment on paid-off debt", async () => {
    const cookies = await createUserAndGetCookies("clearstatus@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000, remaining: 100 });
    const debtId = debtRes.body.debt.id;

    // Pay off the debt via API
    const payoffRes = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .set("Cookie", cookies)
      .send({ amount: 100 });
    const paymentId = payoffRes.body.payment.id;

    // Verify paid off
    let debt = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(debt!.isPaidOff).toBe(true);
    expect(debt!.paidOffAt).not.toBeNull();

    // Delete payment
    const res = await request(app)
      .delete(`/api/payments/${paymentId}`)
      .set("Cookie", cookies);

    expect(res.status).toBe(204);

    debt = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(debt!.isPaidOff).toBe(false);
    expect(debt!.paidOffAt).toBeNull();
    expect(debt!.celebrated).toBe(false);
  });

  it("clears celebrated when deleting payment on celebrated debt", async () => {
    const cookies = await createUserAndGetCookies("clearcelebrated@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000, remaining: 100 });
    const debtId = debtRes.body.debt.id;

    // Pay off and celebrate
    const payment = await prisma.payment.create({
      data: { amount: 100, debtId },
    });
    await prisma.debt.update({
      where: { id: debtId },
      data: { celebrated: true },
    });

    const res = await request(app)
      .delete(`/api/payments/${payment.id}`)
      .set("Cookie", cookies);

    expect(res.status).toBe(204);

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(debt!.celebrated).toBe(false);
  });

  it("returns 404 for non-existent payment", async () => {
    const cookies = await createUserAndGetCookies("notfound3@example.com");

    const res = await request(app)
      .delete("/api/payments/non-existent-id")
      .set("Cookie", cookies);

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's payment", async () => {
    const cookies1 = await createUserAndGetCookies("owner3@example.com");
    const cookies2 = await createUserAndGetCookies("intruder3@example.com");

    const debtRes = await createDebt(cookies1, { name: "Private", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const payment = await prisma.payment.create({
      data: { amount: 100, debtId },
    });

    const res = await request(app)
      .delete(`/api/payments/${payment.id}`)
      .set("Cookie", cookies2);

    expect(res.status).toBe(404);
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).delete("/api/payments/some-id");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/debts/:id/celebrate", () => {
  it("sets celebrated to true", async () => {
    const cookies = await createUserAndGetCookies("celebrate@example.com");
    const debtRes = await createDebt(cookies, { name: "Loan", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .patch(`/api/debts/${debtId}/celebrate`)
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.debt.celebrated).toBe(true);
  });

  it("returns 404 for non-existent debt", async () => {
    const cookies = await createUserAndGetCookies("notfound4@example.com");

    const res = await request(app)
      .patch("/api/debts/non-existent-id/celebrate")
      .set("Cookie", cookies);

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's debt", async () => {
    const cookies1 = await createUserAndGetCookies("owner4@example.com");
    const cookies2 = await createUserAndGetCookies("intruder4@example.com");

    const debtRes = await createDebt(cookies1, { name: "Private", totalAmount: 1000 });
    const debtId = debtRes.body.debt.id;

    const res = await request(app)
      .patch(`/api/debts/${debtId}/celebrate`)
      .set("Cookie", cookies2);

    expect(res.status).toBe(404);
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).patch("/api/debts/some-id/celebrate");
    expect(res.status).toBe(401);
  });
});
