import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ✅ NEW: Inline Helper to count variables so seed.ts doesn't break on imports
function getTemplateVariableCounts(components: any[]) {
  let headerVars = 0;
  let bodyVars = 0;
  const regex = /{{(\d+)}}/g;

  if (!Array.isArray(components)) return { total: 0 };

  components.forEach((comp) => {
    if (comp.text) {
      const matches = comp.text.match(regex);
      if (matches) {
        const uniqueVars = new Set(matches).size;
        if (comp.type === "HEADER") headerVars = uniqueVars;
        else if (comp.type === "BODY") bodyVars = uniqueVars;
      }
    }
  });

  return { total: headerVars + bodyVars };
}

async function main() {
  console.log("🔐 Starting Database Seed...");

  // ==========================================
  // 1. ADMIN & TENANT SETUP
  // ==========================================
  
  // Hash the password
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // Ensure a Tenant Exists
  console.log("🏢 Ensuring default tenant exists...");
  
  const tenant = await prisma.tenant.upsert({
    where: { id: 1 }, 
    update: {},
    create: {
      id: 1, 
      business_name: "Master Admin HQ",
      business_type: "HQ", 
      db_host: "localhost",
      db_user: "root",
      db_password: "",
      db_name: "easy_automation",
    },
  });

  console.log("🔎 Checking for admin user...");

  const adminEmail = "admin"; 

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      tenant_id: tenant.id, 
    },
    create: {
      email: adminEmail,
      name: "System Admin",
      password: hashedPassword,
      role: "ADMIN",
      phone: "9999999999",
      tenant_id: tenant.id,
    },
  });

  console.log(`✅ SUCCESS! Admin user ready.`);
  console.log(`👉 Login: ${adminEmail} / admin123`);

  // ==========================================
  // 2. SYSTEM TEMPLATES SETUP
  // ==========================================
  console.log("\n🌱 Seeding System Templates...");

  const templates = [
    // --- SALON TEMPLATES ---
    {
      name: "salon_appt_confirm_v2",
      label: "Appointment Confirmation",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "Hello {{1}}, your appointment is confirmed for {{2}} at {{3}}. We look forward to seeing you at {{4}} soon.", example: { body_text: [["Rahul", "25th Aug", "10:00 AM", "Style Salon"]] } },
        { type: "FOOTER", text: "Reply STOP to unsubscribe" }
      ]
    },
    {
      name: "salon_bill_invoice_v2",
      label: "Billing / Invoice",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "Hi {{1}}, your bill of {{2}} has been generated. You can view the details here: {{3}} . Thank you for visiting {{4}} today.", example: { body_text: [["Rahul", "Rs. 500", "https://example.com/invoice", "Style Salon"]] } },
        { type: "FOOTER", text: "Thank you for your business" }
      ]
    },
    {
      name: "salon_feedback_req_v2",
      label: "Feedback Request",
      category: "MARKETING",
      industry: "Salon",
      components: [
        { type: "BODY", text: "Hi {{1}}, how was your experience at {{2}}? We would love to hear your feedback: {{3}} . Your opinion is very important to us!", example: { body_text: [["Rahul", "Style Salon", "https://example.com/feedback"]] } },
        { type: "FOOTER", text: "Your feedback matters" }
      ]
    },
    // --- GYM TEMPLATES ---
    {
      name: "gym_membership_alert",
      label: "Membership Expiry Warning",
      category: "UTILITY",
      industry: "Gym",
      components: [
        { type: "BODY", text: "Hi {{1}}, your gym membership expires on {{2}}. Please renew by {{3}} to keep your access active. See you at {{4}}!", example: { body_text: [["John", "15th Sept", "14th Sept", "Iron Gym"]] } },
        { type: "FOOTER", text: "Stay Fit" }
      ]
    },
    // --- GENERIC / ALL ---
    {
      name: "generic_feedback_v1",
      label: "General Feedback",
      category: "MARKETING",
      industry: "All",
      components: [
        { type: "BODY", text: "Hi {{1}}, we'd love to hear about your experience at {{2}}. Please rate us here: {{3}} . Thanks!", example: { body_text: [["User", "Business Name", "https://link.com"]] } }
      ]
    }
  ];

  for (const t of templates) {
    // Check if template exists to avoid duplicates
    const exists = await prisma.system_template.findFirst({ where: { name: t.name } });
    
    // ✅ NEW: Calculate variables
    const counts = getTemplateVariableCounts(t.components);

    if (!exists) {
      await prisma.system_template.create({
        data: {
          name: t.name,
          label: t.label,
          category: t.category,
          industry: t.industry,
          components: t.components as any,
          total_variables: counts.total // ✅ Added to DB
        }
      });
      console.log(`✅ Created Template: ${t.label} (${t.industry})`);
    } else {
      console.log(`⏩ Skipped Template: ${t.label} (Already exists)`);
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });