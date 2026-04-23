import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const router: Router = Router();

function decimalToNumber(d: Prisma.Decimal | number | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  if (typeof d === "number") return d;
  return d.toNumber();
}

function serializePayment(payment: {
  id: string;
  amount: Prisma.Decimal;
  paidAt: Date;
  debtId: string;
}) {
  return {
    id: payment.id,
    amount: decimalToNumber(payment.amount),
    paidAt: payment.paidAt,
    debtId: payment.debtId,
  };
}

function serializeDebt(debt: {
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
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}) {
  return {
    id: debt.id,
    name: debt.name,
    creditor: debt.creditor,
    originalAmount: decimalToNumber(debt.originalAmount),
    remainingAmount: decimalToNumber(debt.remainingAmount),
    interestRate: decimalToNumber(debt.interestRate),
    dueDate: debt.dueDate,
    isArchived: debt.isArchived,
    isPaidOff: debt.isPaidOff,
    paidOffAt: debt.paidOffAt,
    createdAt: debt.createdAt,
    updatedAt: debt.updatedAt,
    userId: debt.userId,
  };
}

router.use(authMiddleware);

// POST /api/debts/:id/payments - Create a payment against a debt
router.post("/:id/payments", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount } = req.body;

  // Validate amount
  if (amount === undefined || amount === null) {
    res.status(400).json({ error: "Amount is required" });
    return;
  }
  const numAmount = typeof amount === "string" ? Number(amount) : Number(amount);
  if (Number.isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: "Amount must be a positive number" });
    return;
  }

  const debt = await prisma.debt.findUnique({
    where: { id },
  });

  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  if (debt.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const paymentAmount = new Prisma.Decimal(numAmount);
  const newRemaining = Prisma.Decimal.max(debt.remainingAmount.minus(paymentAmount), new Prisma.Decimal(0));
  const isPayoff = newRemaining.equals(0) && !debt.isPaidOff;

  const [payment, updatedDebt] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        amount: paymentAmount,
        debtId: id,
      },
    }),
    prisma.debt.update({
      where: { id },
      data: {
        remainingAmount: newRemaining,
        isPaidOff: isPayoff ? true : debt.isPaidOff,
        paidOffAt: isPayoff ? new Date() : debt.paidOffAt,
      },
    }),
  ]);

  res.status(201).json({
    payment: serializePayment(payment),
    debt: serializeDebt(updatedDebt),
  });
});

// GET /api/debts/:id/payments - List payments for a debt
router.get("/:id/payments", async (req: Request, res: Response) => {
  const { id } = req.params;

  const debt = await prisma.debt.findUnique({
    where: { id },
  });

  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  if (debt.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const payments = await prisma.payment.findMany({
    where: { debtId: id },
    orderBy: { paidAt: "desc" },
  });

  res.status(200).json({ payments: payments.map(serializePayment) });
});

// GET /api/debts/:id - Get a single debt with payments
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const debt = await prisma.debt.findUnique({
    where: { id },
    include: {
      payments: {
        orderBy: { paidAt: "desc" },
      },
    },
  });

  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  if (debt.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { payments, ...debtData } = debt;

  res.status(200).json({
    debt: {
      ...serializeDebt(debtData),
      payments: payments.map(serializePayment),
    },
  });
});

// POST /api/debts/:id/celebrate - Celebration for paid-off debt
router.post("/:id/celebrate", async (req: Request, res: Response) => {
  const { id } = req.params;

  const debt = await prisma.debt.findUnique({
    where: { id },
  });

  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  if (debt.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!debt.isPaidOff) {
    res.status(400).json({ error: "Debt is not paid off yet" });
    return;
  }

  res.status(200).json({
    celebration: {
      message: `Congratulations! You paid off ${debt.name}!`,
      debt: serializeDebt(debt),
    },
  });
});

// DELETE /api/payments/:id - Delete a payment and restore balance
// This router is mounted at /api/payments separately
export const paymentDeleteRouter: Router = Router();
paymentDeleteRouter.use(authMiddleware);

paymentDeleteRouter.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { debt: true },
  });

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  if (payment.debt.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const wasPaidOff = payment.debt.isPaidOff;
  const restoredRemaining = payment.debt.remainingAmount.plus(payment.amount);

  await prisma.$transaction([
    prisma.payment.delete({
      where: { id },
    }),
    prisma.debt.update({
      where: { id: payment.debtId },
      data: {
        remainingAmount: restoredRemaining,
        isPaidOff: wasPaidOff ? false : payment.debt.isPaidOff,
        paidOffAt: wasPaidOff ? null : payment.debt.paidOffAt,
      },
    }),
  ]);

  res.status(204).send();
});

export default router;
