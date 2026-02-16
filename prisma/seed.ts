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
  // 2. SYSTEM TEMPLATES SETUP (SALON SPECIFIC)
  // ==========================================
  console.log("\n🌱 Seeding System Templates...");

  const templates = [
    {
      name: "salon_billing",
      label: "E-Bill Generated",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "Your e-bill has been generated. You can view it here: {{1}}. {{2}} 💅" }
      ]
    },
    {
      name: "salon_appointment_confirmation",
      label: "Appointment Confirmation",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "🗓️ Hello {{1}}, your appointment for {{2}} is confirmed for {{3}} at {{4}}. We look forward to pampering you! 💇‍♀️💆‍♀️ See you soon! 😊" }
      ]
    },
    {
      name: "salon_add_enquiry",
      label: "Enquiry Acknowledgement",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "👋 Hi {{1}}, thank you for your interest in our salon! 💅💇 We have received your enquiry and will get back to you shortly. Feel free to reach out if you have any questions. 🌟" }
      ]
    },
    {
      name: "salon_appointment_cancellation",
      label: "Appointment Cancellation",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "Your appointment scheduled for {{1}} has been successfully canceled. {{2}} 💅" }
      ]
    },
    {
      name: "salon_appointment_reschedule",
      label: "Appointment Rescheduled",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "Your appointment has been rescheduled to {{1}}.{{2}} 💅" }
      ]
    },
    {
      name: "salon_pending_payment_clearance",
      label: "Payment Cleared",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "Your pending payment of {{1}} has been cleared. Your current balance is {{2}}. {{3}} 💅" }
      ]
    },
    {
      name: "salon_reward_points",
      label: "Reward Points Update",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "🎁 Yay! Your reward points have been updated. 🎉 You now have {{1}} points in your account! 💖 Keep pampering yourself and earning more points! 🌟" }
      ]
    },
    {
      name: "salon_new_membership",
      label: "Membership Welcome",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "Thank you for signing up for our membership. We are excited to have you with us. {{1}} 💅" }
      ]
    },
    {
      name: "salon_package_service_availed",
      label: "Package Service Usage",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "You have availed a service under your package. Remaining services: {{1}}. {{2}} 💅" }
      ]
    },
    {
      name: "salon_birthday_wish",
      label: "Birthday Wish",
      category: "MARKETING",
      industry: "Salon",
      components: [
        { type: "BODY", text: "🎂 Happy Birthday, {{1}}! 🥳 Celebrate your special day with a complimentary {{2}} on us! 💖 Visit us anytime this week to avail the offer. 🎉" }
      ]
    },
    {
      name: "salon_anniversary_wish",
      label: "Anniversary Wish",
      category: "MARKETING",
      industry: "Salon",
      components: [
        { type: "BODY", text: "💍 Happy Anniversary, {{1}}! 💖 Celebrate with a 20% discount on your next service. 🥂 Use code: {{2}} when booking. Cheers to many more years of pampering! 💝" }
      ]
    },
    {
      name: "salon_service_reminder",
      label: "Service Reminder",
      category: "UTILITY",
      industry: "Salon",
      components: [
        { type: "BODY", text: "📅 Hi {{1}} , it’s time for your next {{2}} session! 💆‍♀️ Book your slot at: {{3}} and stay fabulous! ✨" }
      ]
    },
    {
      name: "salon_feedback_request",
      label: "Feedback Request",
      category: "MARKETING",
      industry: "Salon",
      components: [
        { type: "BODY", text: "🌟 Hi {{1}}, we’d love to know how your recent experience was at our salon. ✨ Please take a moment to share your feedback here: {{2}}. Your feedback helps us serve you better! 🙏" }
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