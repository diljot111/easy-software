import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Starting Admin Password Reset...");

  // 1. Hash the password
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // 2. FORCE UPDATE: We cast to 'any' to bypass TypeScript errors
  // This helps if your prisma client is out of sync with the DB
  const userClient = prisma.user as any;

  console.log("🔎 Attempting to update admin user...");

  try {
    // 🔹 ATTEMPT 1: Try finding by 'email' (Standard)
    const resultEmail = await userClient.updateMany({
      where: { email: "admin" }, 
      data: { password: hashedPassword },
    });

    if (resultEmail.count > 0) {
      console.log("✅ SUCCESS! Updated user where email='admin'");
      return;
    }

    // 🔹 ATTEMPT 2: Try finding by 'username' (Legacy)
    // If the first one worked, this won't run. If first failed, we try this.
    const resultUsername = await userClient.updateMany({
      where: { username: "admin" },
      data: { password: hashedPassword }, // or try 'pass' if your DB uses that
    });

    if (resultUsername.count > 0) {
      console.log("✅ SUCCESS! Updated user where username='admin'");
      return;
    }

    // 🔹 ATTEMPT 3: If both failed, try creating the user
    console.log("⚠️ User not found. Creating new admin user...");
    await userClient.create({
      data: {
        email: "admin",      // Try 'email' first
        password: hashedPassword,
        name: "Super Admin",
        role: "SUPER_ADMIN", // Adjust if your role name is different
      },
    });
    console.log("✅ CREATED new admin user.");

  } catch (error: any) {
    console.error("❌ Database Error:", error.message);
    console.log("💡 TIP: Check your prisma/schema.prisma file to see the exact column names.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });