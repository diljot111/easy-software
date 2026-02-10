import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Updating admin password with bcrypt...");

  const hashedPassword = await bcrypt.hash("admin123", 10);

  const result = await prisma.user.updateMany({
    where: { username: "admin" },
    data: { pass: hashedPassword },
  });

  if (result.count === 0) {
    throw new Error("❌ Admin user not found in database");
  }

  console.log("✅ Admin password updated successfully");
  console.log("👉 Username: admin");
  console.log("👉 Password: admin123");
}

main()
  .catch((err) => {
    console.error("❌ Seed error:", err.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 