import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const router: Router = Router();

// Helper to convert Prisma Decimal to number for JSON serialization
function decimalToNumber(d: Prisma.Decimal | number | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  if (typeof d === "number") return d;
  return d.toNumber();
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

// Validation helpers
function validateName(name: unknown): string | null {
  if (typeof name !== "string" || name.trim().length === 0) {
    return "Name is required";
  }
  return null;
}

function validateCreditor(creditor: unknown): string | null {
  if (typeof creditor !== "string" || creditor.trim().length === 0) {
    return "Creditor is required";
  }
  return null;
}

function validateAmount(amount: unknown, field: string): string | null {
  if (amount === undefined || amount === null) {
    return `${field} is required`;
  }
  const num = typeof amount === "string" ? Number(amount) : Number(amount);
  if (Number.isNaN(num) || num <= 0) {
    return `${field} must be a positive number`;
  }
  return null;
}

function validateOptionalAmount(amount: unknown, field: string): string | null {
  if (amount === undefined || amount === null) return null;
  const num = typeof amount === "string" ? Number(amount) : Number(amount);
  if (Number.isNaN(num) || num < 0) {
    return `${field} must be a non-negative number`;
  }
  return null;
}

function validateOptionalDate(date: unknown, field: string): string | null {
  if (date === undefined || date === null) return null;
  const d = new Date(date as string | number | Date);
  if (Number.isNaN(d.getTime())) {
    return `${field} must be a valid date`;
  }
  return null;
}

// All debt routes are protected
router.use(authMiddleware);

// POST /api/debts - Create a new debt
router.post("/", async (req: Request, res: Response) => {
  const { name, creditor, originalAmount, remainingAmount, interestRate, dueDate } = req.body;

  const errors: string[] = [];
  const nameError = validateName(name);
  if (nameError) errors.push(nameError);
  const creditorError = validateCreditor(creditor);
  if (creditorError) errors.push(creditorError);
  const originalAmountError = validateAmount(originalAmount, "Original amount");
  if (originalAmountError) errors.push(originalAmountError);
  const remainingAmountError = validateOptionalAmount(remainingAmount, "Remaining amount");
  if (remainingAmountError) errors.push(remainingAmountError);
  const interestRateError = validateOptionalAmount(interestRate, "Interest rate");
  if (interestRateError) errors.push(interestRateError);
  const dueDateError = validateOptionalDate(dueDate, "Due date");
  if (dueDateError) errors.push(dueDateError);

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  const debt = await prisma.debt.create({
    data: {
      name: name.trim(),
      creditor: creditor.trim(),
      originalAmount: new Prisma.Decimal(originalAmount),
      remainingAmount: new Prisma.Decimal(remainingAmount ?? originalAmount),
      interestRate: interestRate !== undefined && interestRate !== null ? new Prisma.Decimal(interestRate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      userId: req.user!.id,
    },
  });

  res.status(201).json({ debt: serializeDebt(debt) });
});

// GET /api/debts - List debts with optional filters
router.get("/", async (req: Request, res: Response) => {
  const { archived, paidOff } = req.query;

  const where: {
    userId: string;
    isArchived?: boolean;
    isPaidOff?: boolean;
  } = {
    userId: req.user!.id,
  };

  if (archived === "true") {
    where.isArchived = true;
  } else if (archived === "false") {
    where.isArchived = false;
  }

  if (paidOff === "true") {
    where.isPaidOff = true;
  } else if (paidOff === "false") {
    where.isPaidOff = false;
  }

  // Default: exclude archived and paid-off debts (active debts)
  if (archived === undefined && paidOff === undefined) {
    where.isArchived = false;
    where.isPaidOff = false;
  }

  const debts = await prisma.debt.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ debts: debts.map(serializeDebt) });
});

// GET /api/debts/summary - Dashboard summary statistics
router.get("/summary", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const allDebts = await prisma.debt.findMany({
    where: { userId },
  });

  let totalOriginal = 0;
  let totalRemaining = 0;
  let totalPaid = 0;
  let paidOffCount = 0;
  let activeCount = 0;

  for (const debt of allDebts) {
    totalOriginal += debt.originalAmount.toNumber();
    totalRemaining += debt.remainingAmount.toNumber();
    if (debt.isPaidOff) {
      paidOffCount++;
    }
    if (!debt.isArchived && !debt.isPaidOff) {
      activeCount++;
    }
  }

  totalPaid = totalOriginal - totalRemaining;

  res.status(200).json({
    summary: {
      totalOriginal,
      totalRemaining,
      totalPaid,
      debtCount: allDebts.length,
      paidOffCount,
      activeCount,
    },
  });
});

// PATCH /api/debts/:id - Update a debt
router.patch("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, creditor, originalAmount, remainingAmount, interestRate, dueDate, isPaidOff } = req.body;

  const existing = await prisma.debt.findUnique({
    where: { id },
  });

  if (!existing) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  if (existing.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const errors: string[] = [];
  if (name !== undefined) {
    const nameError = validateName(name);
    if (nameError) errors.push(nameError);
  }
  if (creditor !== undefined) {
    const creditorError = validateCreditor(creditor);
    if (creditorError) errors.push(creditorError);
  }
  if (originalAmount !== undefined) {
    const amountError = validateAmount(originalAmount, "Original amount");
    if (amountError) errors.push(amountError);
  }
  if (remainingAmount !== undefined) {
    const amountError = validateOptionalAmount(remainingAmount, "Remaining amount");
    if (amountError) errors.push(amountError);
  }
  if (interestRate !== undefined) {
    const rateError = validateOptionalAmount(interestRate, "Interest rate");
    if (rateError) errors.push(rateError);
  }
  if (dueDate !== undefined) {
    const dateError = validateOptionalDate(dueDate, "Due date");
    if (dateError) errors.push(dateError);
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  const updateData: {
    name?: string;
    creditor?: string;
    originalAmount?: Prisma.Decimal;
    remainingAmount?: Prisma.Decimal;
    interestRate?: Prisma.Decimal | null;
    dueDate?: Date | null;
    isPaidOff?: boolean;
  } = {};

  if (name !== undefined) updateData.name = name.trim();
  if (creditor !== undefined) updateData.creditor = creditor.trim();
  if (originalAmount !== undefined) updateData.originalAmount = new Prisma.Decimal(originalAmount);
  if (remainingAmount !== undefined) updateData.remainingAmount = new Prisma.Decimal(remainingAmount);
  if (interestRate !== undefined) updateData.interestRate = interestRate !== null ? new Prisma.Decimal(interestRate) : null;
  if (dueDate !== undefined) updateData.dueDate = dueDate !== null ? new Date(dueDate) : null;
  if (isPaidOff !== undefined) updateData.isPaidOff = Boolean(isPaidOff);

  const updated = await prisma.debt.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({ debt: serializeDebt(updated) });
});

// DELETE /api/debts/:id - Delete a debt (cascades payments via Prisma)
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.debt.findUnique({
    where: { id },
  });

  if (!existing) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  if (existing.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await prisma.debt.delete({
    where: { id },
  });

  res.status(204).send();
});

// POST /api/debts/:id/archive - Archive a debt
router.post("/:id/archive", async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.debt.findUnique({
    where: { id },
  });

  if (!existing) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  if (existing.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updated = await prisma.debt.update({
    where: { id },
    data: { isArchived: true },
  });

  res.status(200).json({ debt: serializeDebt(updated) });
});

// POST /api/debts/:id/restore - Restore an archived debt
router.post("/:id/restore", async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.debt.findUnique({
    where: { id },
  });

  if (!existing) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  if (existing.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updated = await prisma.debt.update({
    where: { id },
    data: { isArchived: false },
  });

  res.status(200).json({ debt: serializeDebt(updated) });
});

export default router;
