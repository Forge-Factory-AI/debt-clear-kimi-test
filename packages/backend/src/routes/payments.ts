import { Router } from "express";
import type { Response, Router as ExpressRouter } from "express";
import { prisma } from "../services/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { createPaymentSchema } from "../lib/validators.js";

// Router for /api/debts/:debtId/payments (mounted with mergeParams)
const debtPaymentsRouter: ExpressRouter = Router({ mergeParams: true });

function getUserId(req: AuthRequest): string {
  return req.user!.userId;
}

// POST /api/debts/:debtId/payments — create a payment
// eslint-disable-next-line @typescript-eslint/no-misused-promises
debtPaymentsRouter.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const parseResult = createPaymentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
    return;
  }

  const userId = getUserId(req);
  const { debtId } = req.params;
  const { amount, note } = parseResult.data;

  // Verify debt ownership
  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId },
  });

  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  const paymentAmount = amount;
  const currentRemaining = debt.remaining.toNumber();
  const newRemaining = Math.max(0, currentRemaining - paymentAmount);
  const wasPaidOff = debt.isPaidOff;
  const isNowPaidOff = newRemaining === 0;

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        amount: paymentAmount,
        note: note ?? null,
        debtId,
      },
    }),
    prisma.debt.update({
      where: { id: debtId },
      data: {
        remaining: newRemaining,
        isPaidOff: isNowPaidOff,
        paidOffAt: isNowPaidOff && !wasPaidOff ? new Date() : debt.paidOffAt,
      },
    }),
  ]);

  res.status(201).json({
    payment,
    justPaidOff: isNowPaidOff && !wasPaidOff,
  });
});

// GET /api/debts/:debtId/payments — list payments for a debt
// eslint-disable-next-line @typescript-eslint/no-misused-promises
debtPaymentsRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const { debtId } = req.params;

  // Verify debt ownership
  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId },
  });

  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  const payments = await prisma.payment.findMany({
    where: { debtId },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ payments });
});

// Router for /api/payments/:id (no mergeParams needed)
const paymentsRouter: ExpressRouter = Router();

// DELETE /api/payments/:id — delete a payment and restore balance
// eslint-disable-next-line @typescript-eslint/no-misused-promises
paymentsRouter.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const payment = await prisma.payment.findFirst({
    where: { id },
    include: { debt: true },
  });

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  if (payment.debt.userId !== userId) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const debt = payment.debt;
  const currentRemaining = debt.remaining.toNumber();
  const totalAmount = debt.totalAmount.toNumber();
  const restoredRemaining = Math.min(totalAmount, currentRemaining + payment.amount.toNumber());
  const wasPaidOff = debt.isPaidOff;

  await prisma.$transaction([
    prisma.payment.delete({ where: { id } }),
    prisma.debt.update({
      where: { id: debt.id },
      data: {
        remaining: restoredRemaining,
        isPaidOff: false,
        paidOffAt: null,
        celebrated: false,
      },
    }),
  ]);

  res.status(204).send();
});

export { debtPaymentsRouter, paymentsRouter };
