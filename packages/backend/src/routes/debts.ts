import { Router } from "express";
import type { Response, Router as ExpressRouter } from "express";
import { prisma } from "../services/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { createDebtSchema, updateDebtSchema } from "../lib/validators.js";

const router: ExpressRouter = Router();

function getUserId(req: AuthRequest): string {
  return req.user!.userId;
}

// POST /api/debts — create a new debt
router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const parseResult = createDebtSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
    return;
  }

  const { name, totalAmount, remaining, description, category, dueDate } = parseResult.data;

  const debt = await prisma.debt.create({
    data: {
      name,
      totalAmount,
      remaining: remaining ?? totalAmount,
      description: description ?? null,
      category: category ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      userId: getUserId(req),
    },
    include: {
      payments: true,
    },
  });

  res.status(201).json({ debt });
});

// GET /api/debts — list debts with optional filtering
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const { filter } = req.query as { filter?: string };

  const where: Record<string, unknown> = { userId };

  if (filter === "archived") {
    where.isArchived = true;
  } else if (filter === "paid-off") {
    where.isPaidOff = true;
    where.isArchived = false;
  } else {
    // Default: active debts (not archived, not paid off)
    where.isArchived = false;
    where.isPaidOff = false;
  }

  const debts = await prisma.debt.findMany({
    where,
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ debts });
});

// GET /api/debts/summary — dashboard summary stats
router.get("/summary", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);

  const [totalDebts, activeDebts, paidOffDebts, archivedDebts, totalOwedAgg] =
    await Promise.all([
      prisma.debt.count({ where: { userId } }),
      prisma.debt.count({ where: { userId, isArchived: false, isPaidOff: false } }),
      prisma.debt.count({ where: { userId, isPaidOff: true } }),
      prisma.debt.count({ where: { userId, isArchived: true } }),
      prisma.debt.aggregate({
        where: { userId },
        _sum: { remaining: true },
      }),
    ]);

  const totalOwed = totalOwedAgg._sum.remaining?.toNumber() ?? 0;

  res.status(200).json({
    summary: {
      totalDebts,
      activeDebts,
      paidOffDebts,
      archivedDebts,
      totalOwed,
    },
  });
});

// GET /api/debts/:id — get a single debt
router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const debt = await prisma.debt.findFirst({
    where: { id, userId },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  res.status(200).json({ debt });
});

// PATCH /api/debts/:id — update a debt
router.patch("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const parseResult = updateDebtSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid input", details: parseResult.error.flatten() });
    return;
  }

  const userId = getUserId(req);
  const { id } = req.params;

  // Verify ownership
  const existing = await prisma.debt.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  const { name, totalAmount, remaining, description, category, dueDate } = parseResult.data;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
  if (remaining !== undefined) {
    updateData.remaining = remaining;
    // Auto-update isPaidOff when remaining hits zero
    if (remaining === 0) {
      updateData.isPaidOff = true;
    } else if (existing.isPaidOff && remaining > 0) {
      updateData.isPaidOff = false;
    }
  }
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

  const debt = await prisma.debt.update({
    where: { id },
    data: updateData,
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  res.status(200).json({ debt });
});

// DELETE /api/debts/:id — delete a debt (cascades payments via Prisma)
router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  // Verify ownership
  const existing = await prisma.debt.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  await prisma.debt.delete({
    where: { id },
  });

  res.status(204).send();
});

// POST /api/debts/:id/archive — archive a debt
router.post("/:id/archive", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const existing = await prisma.debt.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  const debt = await prisma.debt.update({
    where: { id },
    data: { isArchived: true },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  res.status(200).json({ debt });
});

// POST /api/debts/:id/restore — restore an archived debt
router.post("/:id/restore", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const existing = await prisma.debt.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  const debt = await prisma.debt.update({
    where: { id },
    data: { isArchived: false },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  res.status(200).json({ debt });
});

// PATCH /api/debts/:id/celebrate — mark a paid-off debt as celebrated
router.patch("/:id/celebrate", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  const existing = await prisma.debt.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }

  const debt = await prisma.debt.update({
    where: { id },
    data: { celebrated: true },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  res.status(200).json({ debt });
});

export default router;
