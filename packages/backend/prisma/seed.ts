import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@debtclear.app";
const DEMO_PASSWORD = "demo1234";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log("Demo user already exists, skipping seed...");
    return;
  }

  console.log("Seeding demo data...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      password: passwordHash,
      name: "Demo User",
    },
  });

  // ── 1. Active: Chase Sapphire Credit Card ───────────────────────────
  // total: 4500, remaining: 1200, paid: 3300
  await prisma.debt.create({
    data: {
      name: "Chase Sapphire Credit Card",
      totalAmount: 4500,
      remaining: 1200,
      description: "Chase Sapphire Preferred — travel and dining expenses",
      category: "Credit Card",
      userId: user.id,
      payments: {
        create: [
          { amount: 800, note: "March payment", createdAt: new Date("2025-01-15") },
          { amount: 1000, note: "April payment", createdAt: new Date("2025-02-15") },
          { amount: 700, note: "May payment", createdAt: new Date("2025-03-15") },
          { amount: 800, note: "June payment", createdAt: new Date("2025-04-15") },
        ],
      },
    },
  });

  // ── 2. Active: Federal Student Loan ─────────────────────────────────
  // total: 32000, remaining: 18500, paid: 13500
  await prisma.debt.create({
    data: {
      name: "Federal Student Loan",
      totalAmount: 32000,
      remaining: 18500,
      description: "Federal Direct Subsidized Loan — undergrad",
      category: "Student Loan",
      userId: user.id,
      payments: {
        create: [
          { amount: 1500, note: "Fall 2023 payment", createdAt: new Date("2023-09-15") },
          { amount: 1500, note: "Winter 2024 payment", createdAt: new Date("2024-01-15") },
          { amount: 1500, note: "Spring 2024 payment", createdAt: new Date("2024-03-15") },
          { amount: 1500, note: "Summer 2024 payment", createdAt: new Date("2024-06-15") },
          { amount: 1500, note: "Fall 2024 payment", createdAt: new Date("2024-09-15") },
          { amount: 2000, note: "Winter 2025 payment", createdAt: new Date("2025-01-15") },
          { amount: 2000, note: "Spring 2025 payment", createdAt: new Date("2025-03-15") },
          { amount: 2000, note: "April bonus payment", createdAt: new Date("2025-04-15") },
        ],
      },
    },
  });

  // ── 3. Active: Toyota Camry Auto Loan ───────────────────────────────
  // total: 22000, remaining: 8200, paid: 13800
  await prisma.debt.create({
    data: {
      name: "Toyota Camry Auto Loan",
      totalAmount: 22000,
      remaining: 8200,
      description: "2022 Toyota Camry LE financing through Toyota Financial",
      category: "Auto",
      userId: user.id,
      payments: {
        create: [
          { amount: 4600, note: "2023 payment", createdAt: new Date("2023-12-01") },
          { amount: 4600, note: "2024 payment", createdAt: new Date("2024-12-01") },
          { amount: 4600, note: "Q1 2025 payment", createdAt: new Date("2025-03-01") },
        ],
      },
    },
  });

  // ── 4. Active: Capital One Credit Card ──────────────────────────────
  // total: 2800, remaining: 950, paid: 1850
  await prisma.debt.create({
    data: {
      name: "Capital One Credit Card",
      totalAmount: 2800,
      remaining: 950,
      description: "Capital One Quicksilver — everyday spending",
      category: "Credit Card",
      userId: user.id,
      payments: {
        create: [
          { amount: 500, note: "January payment", createdAt: new Date("2025-01-20") },
          { amount: 500, note: "February payment", createdAt: new Date("2025-02-20") },
          { amount: 450, note: "March payment", createdAt: new Date("2025-03-20") },
          { amount: 400, note: "April payment", createdAt: new Date("2025-04-20") },
        ],
      },
    },
  });

  // ── 5. Active: Medical Bill — City Hospital ─────────────────────────
  // total: 6200, remaining: 3400, paid: 2800
  await prisma.debt.create({
    data: {
      name: "Medical Bill — City Hospital",
      totalAmount: 6200,
      remaining: 3400,
      description: "Emergency room visit — March 2025",
      category: "Medical",
      userId: user.id,
      payments: {
        create: [
          { amount: 1400, note: "First installment", createdAt: new Date("2025-03-25") },
          { amount: 1400, note: "Second installment", createdAt: new Date("2025-04-25") },
        ],
      },
    },
  });

  // ── 6. PAID OFF: SoFi Personal Loan (Trophy 1) ──────────────────────
  // total: 10000, remaining: 0, paid: 10000
  await prisma.debt.create({
    data: {
      name: "SoFi Personal Loan",
      totalAmount: 10000,
      remaining: 0,
      description: "Debt consolidation loan — fully paid!",
      category: "Personal Loan",
      isPaidOff: true,
      paidOffAt: new Date("2025-03-01"),
      celebrated: true,
      userId: user.id,
      payments: {
        create: [
          { amount: 2500, note: "Q1 2024 payment", createdAt: new Date("2024-03-01") },
          { amount: 2500, note: "Q2 2024 payment", createdAt: new Date("2024-06-01") },
          { amount: 2500, note: "Q3 2024 payment", createdAt: new Date("2024-09-01") },
          { amount: 2500, note: "Final payment!", createdAt: new Date("2025-03-01") },
        ],
      },
    },
  });

  // ── 7. PAID OFF: Best Buy Store Card (Trophy 2) ─────────────────────
  // total: 1500, remaining: 0, paid: 1500
  await prisma.debt.create({
    data: {
      name: "Best Buy Store Card",
      totalAmount: 1500,
      remaining: 0,
      description: "Home theater system — fully paid!",
      category: "Credit Card",
      isPaidOff: true,
      paidOffAt: new Date("2025-02-15"),
      celebrated: true,
      userId: user.id,
      payments: {
        create: [
          { amount: 500, note: "First payment", createdAt: new Date("2025-01-15") },
          { amount: 500, note: "Second payment", createdAt: new Date("2025-02-01") },
          { amount: 500, note: "Paid in full!", createdAt: new Date("2025-02-15") },
        ],
      },
    },
  });

  // ── 8. ARCHIVED: Old Discover Card ──────────────────────────────────
  // total: 3200, remaining: 1500, paid: 1700
  await prisma.debt.create({
    data: {
      name: "Old Discover Card",
      totalAmount: 3200,
      remaining: 1500,
      description: "Transferred balance to lower APR card — archived",
      category: "Credit Card",
      isArchived: true,
      userId: user.id,
      payments: {
        create: [
          { amount: 500, note: "Balance transfer fee", createdAt: new Date("2024-08-01") },
          { amount: 600, note: "Partial payoff", createdAt: new Date("2024-09-01") },
          { amount: 600, note: "Before transfer", createdAt: new Date("2024-10-01") },
        ],
      },
    },
  });

  console.log("Seeding complete. Demo user:", DEMO_EMAIL, "/ Password:", DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
