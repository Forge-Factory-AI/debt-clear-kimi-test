import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check if any users exist
  const count = await prisma.user.count();
  if (count > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding demo data...");

  const user = await prisma.user.create({
    data: {
      email: "demo@debtclear.app",
      password: "$2a$10$hashedpasswordplaceholder",
      name: "Demo User",
    },
  });

  await prisma.debt.create({
    data: {
      name: "Credit Card",
      totalAmount: 5000,
      remaining: 3500,
      description: "Main credit card debt",
      category: "Credit Card",
      userId: user.id,
      payments: {
        create: [
          { amount: 500, note: "First payment" },
          { amount: 1000, note: "Second payment" },
        ],
      },
    },
  });

  await prisma.debt.create({
    data: {
      name: "Student Loan",
      totalAmount: 25000,
      remaining: 18000,
      description: "Federal student loan",
      category: "Student Loan",
      userId: user.id,
      payments: {
        create: [
          { amount: 2000, note: "January payment" },
          { amount: 2000, note: "February payment" },
          { amount: 3000, note: "March payment" },
        ],
      },
    },
  });

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
