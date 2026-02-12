import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Starting Admin Reset...");

  // 1. Hash the password
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // 2. Ensure a Tenant Exists (Admins usually need a tenant)
  console.log("🏢 Ensuring default tenant exists...");
  const tenant = await prisma.tenant.upsert({
    where: { id: "default-tenant" },
    update: {},
    create: {
      id: "default-tenant",
      business_name: "Master Admin HQ",
      db_host: "localhost",
      db_user: "root",
      db_password: "",
      db_name: "easy_automation",
    },
  });

  console.log("🔎 Checking for admin user...");

  // 3. Upsert Admin User (Create if new, Update if exists)
  // We use 'admin' as the email login handle
  const adminEmail = "admin"; 

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: "ADMIN", // ✅ FIXED: Must be 'ADMIN', not 'SUPER_ADMIN'
      tenant_id: tenant.id,
    },
    create: {
      email: adminEmail,
      name: "System Admin",
      password: hashedPassword,
      role: "ADMIN", // ✅ FIXED
      phone: "9999999999",
      tenant_id: tenant.id,
    },
  });

  console.log(`✅ SUCCESS! Admin user ready.`);
  console.log(`👉 Login Email: ${adminEmail}`);
  console.log(`👉 Login Password: admin123`);
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });