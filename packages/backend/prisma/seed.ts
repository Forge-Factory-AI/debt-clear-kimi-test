import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@debtclear.app";
const DEMO_PASSWORD = "password123";

async function main() {
  console.log("Seeding database...");

  // Idempotency: skip if demo user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (existingUser) {
    console.log(`Demo user (${DEMO_EMAIL}) already exists. Skipping seed.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      password: hashedPassword,
    },
  });

  console.log(`Created demo user: ${user.email}`);

  const now = new Date();
  const janDate = new Date(now.getFullYear(), now.getMonth() - 2, 15);
  const febDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const marDate = new Date(now.getFullYear(), now.getMonth(), 15);

  const debtsData = [
    {
      name: "Credit Card",
      creditor: "Chase",
      originalAmount: 5000,
      remainingAmount: 2400,
      interestRate: 18.99,
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      isArchived: false,
      isPaidOff: false,
      paidOffAt: null,
      payments: [
        { amount: 1000, paidAt: janDate },
        { amount: 800, paidAt: febDate },
        { amount: 800, paidAt: marDate },
      ],
    },
    {
      name: "Student Loan",
      creditor: "Sallie Mae",
      originalAmount: 25000,
      remainingAmount: 18500,
      interestRate: 4.5,
      dueDate: new Date(now.getFullYear(), now.getMonth() + 2, 1),
      isArchived: false,
      isPaidOff: false,
      paidOffAt: null,
      payments: [
        { amount: 2500, paidAt: janDate },
        { amount: 2000, paidAt: febDate },
        { amount: 2000, paidAt: marDate },
      ],
    },
    {
      name: "Car Loan",
      creditor: "Toyota Financial",
      originalAmount: 22000,
      remainingAmount: 8200,
      interestRate: 3.9,
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 20),
      isArchived: false,
      isPaidOff: false,
      paidOffAt: null,
      payments: [
        { amount: 5000, paidAt: janDate },
        { amount: 4000, paidAt: febDate },
        { amount: 4800, paidAt: marDate },
      ],
    },
    {
      name: "Medical Bill",
      creditor: "City Hospital",
      originalAmount: 3500,
      remainingAmount: 3500,
      interestRate: null,
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 30),
      isArchived: false,
      isPaidOff: false,
      paidOffAt: null,
      payments: [],
    },
    {
      name: "Personal Loan",
      creditor: "LendingClub",
      originalAmount: 10000,
      remainingAmount: 0,
      interestRate: 11.5,
      dueDate: null,
      isArchived: false,
      isPaidOff: true,
      paidOffAt: marDate,
      payments: [
        { amount: 3000, paidAt: janDate },
        { amount: 3500, paidAt: febDate },
        { amount: 3500, paidAt: marDate },
      ],
    },
    {
      name: "Home Improvement",
      creditor: "Lowe's",
      originalAmount: 4200,
      remainingAmount: 0,
      interestRate: 0,
      dueDate: null,
      isArchived: false,
      isPaidOff: true,
      paidOffAt: febDate,
      payments: [
        { amount: 2000, paidAt: janDate },
        { amount: 2200, paidAt: febDate },
      ],
    },
    {
      name: "Phone Plan",
      creditor: "Verizon",
      originalAmount: 1200,
      remainingAmount: 600,
      interestRate: 0,
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 30),
      isArchived: false,
      isPaidOff: false,
      paidOffAt: null,
      payments: [
        { amount: 600, paidAt: janDate },
      ],
    },
    {
      name: "Old Utility Bill",
      creditor: "PG&E",
      originalAmount: 800,
      remainingAmount: 200,
      interestRate: null,
      dueDate: null,
      isArchived: true,
      isPaidOff: false,
      paidOffAt: null,
      payments: [
        { amount: 300, paidAt: janDate },
        { amount: 300, paidAt: febDate },
      ],
    },
  ];

  for (const debt of debtsData) {
    const { payments, ...debtFields } = debt;
    const createdDebt = await prisma.debt.create({
      data: {
        ...debtFields,
        userId: user.id,
        payments: {
          create: payments,
        },
      },
    });
    console.log(`Created debt: ${createdDebt.name} (${createdDebt.creditor})`);
  }

  // Verify stats
  const allDebts = await prisma.debt.findMany({ where: { userId: user.id } });
  const totalOriginal = allDebts.reduce((sum, d) => sum + d.originalAmount.toNumber(), 0);
  const totalRemaining = allDebts.reduce((sum, d) => sum + d.remainingAmount.toNumber(), 0);
  const paidOffCount = allDebts.filter((d) => d.isPaidOff).length;
  const activeCount = allDebts.filter((d) => !d.isArchived && !d.isPaidOff).length;

  console.log(`\nSeed summary:`);
  console.log(`  Debts: ${allDebts.length}`);
  console.log(`  Total original: $${totalOriginal.toLocaleString()}`);
  console.log(`  Total remaining: $${totalRemaining.toLocaleString()}`);
  console.log(`  Total paid: $${(totalOriginal - totalRemaining).toLocaleString()}`);
  console.log(`  Paid off: ${paidOffCount}`);
  console.log(`  Active: ${activeCount}`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
