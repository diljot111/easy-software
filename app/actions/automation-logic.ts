"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { handleAutomatedWhatsApp } from "./whatsapp-actions"; 
import mysql, { Connection } from "mysql2/promise";

// ----------------------------------------------------------------------
// 1. CONFIGURATION & UTILS
// ----------------------------------------------------------------------

function getVendorBaseUrl(tenantId: string) {
  const urlMap: Record<string, string> = {
    "default": "https://2025.shivsoftsindia.in/live_demo" 
  };
  return urlMap[tenantId] || urlMap["default"];
}

function encrypt_url(invoiceId: number) {
  return (((invoiceId + 1000) * 7) + 5000) * 2;
}

async function getShortUrl(invoiceId: number, branchId: number, baseUrl: string) {
  let longUrl = "";
  
  baseUrl = "https://2025.shivsoftsindia.in/live_demo/";
  const encryptedId = encrypt_url(invoiceId);
  const encryptedBranchId = encrypt_url(branchId);
  // const shopId = process.env.DEFAULT_SHOP_ID || "240140"; 
  longUrl = `${baseUrl}/invoice.php?invMencr=${encryptedId}&invshopid=${encryptedBranchId}`;

  try {
    const response = await fetch("https://easyk.in/api.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        action: "generate_shorturl",
        token: process.env.SHORTENER_API_TOKEN || "437483f79f2b09cc219faa04b262f2bd",
        header_id: process.env.SHORTENER_HEADER_ID || "SVSaln",
        url: longUrl
      })
    });
    const result = await response.json(); 
    if (result.status === 1 && result.short_link) return result.short_link; 
    return longUrl; 
  } catch (error) {
    console.error("🔗 Shortening Failed:", error);
    return longUrl; 
  }
}

// ----------------------------------------------------------------------
// 2. MAIN AUTOMATION ENGINE
// ----------------------------------------------------------------------

export async function processTenantAutomation(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ 
    where: { id: tenantId },
    include: { automationRules: { where: { isActive: true } } } 
  });
  
  if (!tenant) return { success: true };

  const t = tenant as any;
  const businessDisplayName = t.businessName || "Our Business";
  const businessPhone = t.businessPhone || "919999999999"; 
  const vendorBaseUrl = getVendorBaseUrl(tenantId);

  if (!tenant.automationRules || tenant.automationRules.length === 0) return { success: true };

  let remoteDb: Connection | undefined;

  try {
    remoteDb = await mysql.createConnection({
      host: tenant.dbHost,
      user: tenant.dbUser,
      password: tenant.dbPassword,
      database: tenant.dbName, 
      port: parseInt(tenant.dbPort || "3306"),
    });

    const lookback = new Date(Date.now() - 10 * 60000).toISOString().slice(0, 19).replace('T', ' ');

    for (const rule of tenant.automationRules) {
      const event = rule.eventType.toLowerCase();
      let query = "";
      let queryParams: any[] = [];
      let dateCol = "updatetime"; 

      // ---------------------------------------------------------
      // 🧩 DYNAMIC EVENT ROUTING
      // ---------------------------------------------------------
      
      if (event.includes("appointment reminder")) {
        dateCol = "appdate";
        const today = new Date().toISOString().slice(0, 10);
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);
        const timeCheck = now.toTimeString().slice(0, 5); 

        query = `SELECT t.*, c.name, c.cont as phone FROM app_invoice_1 t 
                 LEFT JOIN client c ON t.client = c.id 
                 WHERE t.appdate = ? AND t.itime LIKE ?`;
        queryParams = [today, `${timeCheck}%`];

      } else if (event.includes("appointment cancel")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM app_invoice_1 t 
                 LEFT JOIN client c ON t.client = c.id 
                 WHERE t.updatetime >= ? AND (t.status = 'Cancel' OR t.status = 'Deleted')`;
        queryParams = [lookback];

      } else if (event.includes("appointment re-schedule")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM app_invoice_1 t 
                 LEFT JOIN client c ON t.client = c.id 
                 WHERE t.updatetime >= ? AND t.status != 'Cancel'`;
        queryParams = [lookback];

      } else if (event.includes("new appointment")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM app_invoice_1 t 
                 LEFT JOIN client c ON t.client = c.id 
                 WHERE t.updatetime >= ?`;
        queryParams = [lookback];

      } else if (event.includes("reward")) {
        // 🏆 REWARDS: 'cust,3' -> '3' using SUBSTRING_INDEX
        dateCol = "datetime"; 
        query = `SELECT t.*, c.name, c.cont as phone FROM customer_reward_points t 
                 LEFT JOIN client c ON c.id = SUBSTRING_INDEX(t.client_id, ',', -1) 
                 WHERE t.datetime >= ? AND t.point_type = 1`;
        queryParams = [lookback];

      } else if (event.includes("membership")) {
        // 💳 MEMBERSHIP: 'cust,3' -> '3' using SUBSTRING_INDEX
        dateCol = "time_update"; 
        query = `SELECT t.*, c.name, c.cont as phone FROM membership_discount_history t 
                 LEFT JOIN client c ON c.id = SUBSTRING_INDEX(t.client_id, ',', -1)
                 WHERE t.time_update >= ?`;
        queryParams = [lookback];

      } else if (event.includes("service reminder")) {
        // 🔔 REMINDER
        dateCol = "reminder_date";
        query = `SELECT t.*, c.name, c.cont as phone FROM service_reminder t 
                 LEFT JOIN client c ON c.id = t.client_id 
                 WHERE t.reminder_date >= ?`;
        queryParams = [lookback];

      } else if (event.includes("new bill") || event.includes("feedback")) {
        // 🧾 BILL / FEEDBACK
        query = `SELECT t.*, c.name, c.cont as phone FROM invoice_1 t 
                 LEFT JOIN client c ON t.client = c.id 
                 WHERE t.updatetime >= ?`;
        queryParams = [lookback];
      }

      console.log(`[${businessDisplayName}] 🔎 Rule: "${rule.eventType}" | Querying...`);

      if (!query) continue; 

      // ---------------------------------------------------------
      // 3. EXECUTE & PROCESS
      // ---------------------------------------------------------
      const [rows]: any = await remoteDb.execute(query, queryParams);

      for (const data of rows) {
        const alreadySent = await prisma.automationLog.findFirst({
          where: { tenantId, externalId: data.id.toString(), ruleId: rule.id }
        });

        if (alreadySent) continue;

        // 📝 PREPARE COMMON VARIABLES
        const rawDate = data[dateCol] || data.updatetime || new Date();
        const formattedDate = new Date(rawDate).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
        
        const p_name = data.name || "Customer";
        const p_time = data.itime || "";
        const p_link = await getShortUrl(Number(data.id), data.branch_id, vendorBaseUrl);

        // 🔹 TEMPLATE-SPECIFIC PARAMETER MAPPING
        let params: string[] = [];

        if (event.includes("reward") || event.includes("membership")) {
           // 🏆 REWARD / MEMBERSHIP: 1 Param (Name)
           params = [p_name];

        } else if (event.includes("new bill")) {
           // 🧾 NEW BILL (salon_billing): 2 Params (Name, Link)
           // 🚨 FIXES #132000 ERROR (Expected 2, Got 4)
           params = [p_name, p_link];

        } else if (event.includes("re-schedule")) {
           // 🔄 RESCHEDULE: 2 Params (Date, Time)
           params = [formattedDate, p_time];

        } else if (event.includes("new appointment")) {
           // 📅 NEW APPT: 3 Params (Name, Date, Time)
           params = [p_name, formattedDate, p_time];

        } else if (event.includes("cancel")) {
           // ❌ CANCEL: 2 Params (Name, Date)
           params = [p_name, formattedDate];

        } else {
           // 🔔 DEFAULT (Feedback, etc): Standard 4 Params
           params = [p_name, p_link, businessPhone, formattedDate];
        }

        const components = [{
          type: "body",
          parameters: params.map(val => ({ type: "text", text: String(val) }))
        }];

        const result = await handleAutomatedWhatsApp(tenant, rule.templateName, components, data.phone, "en");

        if (result.success) {
          await prisma.automationLog.create({
            data: { tenantId, ruleId: rule.id, externalId: data.id.toString(), status: "SENT" }
          });
          console.log(`✅ [${businessDisplayName}] SENT: "${rule.templateName}" to ${data.name}`);
        } else {
          console.error(`❌ FAILED sending to ${data.name}: ${result.error}`);
        }
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error(`💥 ERROR:`, error.message);
    return { success: false, error: error.message };
  } finally {
    if (remoteDb) await remoteDb.end();
  }
}

// ----------------------------------------------------------------------
// 4. MANUAL TRIGGER
// ----------------------------------------------------------------------

export async function triggerAutomationManual(ruleId: string) {
  let remoteDb;
  try {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
      include: { tenant: true }
    });
    if (!rule || !rule.tenant) throw new Error("Rule not found.");

    const t = rule.tenant as any;
    const businessPhone = t.businessPhone || "919999999999"; 
    const vendorBaseUrl = getVendorBaseUrl(rule.tenant.id);
    const event = rule.eventType.toLowerCase();

    let payload = { 
      name: "Test User", 
      phone: "919999999999", 
      date: new Date().toLocaleDateString('en-IN'), 
      time: "10:00 AM",
      id: 0
    };

    try {
      remoteDb = await mysql.createConnection({
        host: rule.tenant.dbHost,
        user: rule.tenant.dbUser,
        password: rule.tenant.dbPassword,
        database: rule.tenant.dbName,
        port: parseInt(rule.tenant.dbPort || "3306"),
      });

      let table = "invoice_1";
      if (event.includes("appointment")) table = "app_invoice_1";
      else if (event.includes("reward")) table = "customer_reward_points";
      else if (event.includes("membership")) table = "membership_discount_history";
      else if (event.includes("service reminder")) table = "service_reminder";

      const [rows]: any = await remoteDb.execute(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1`);
      
      if (rows.length > 0) {
        const data = rows[0];
        const rawDate = data.updatetime || data.datetime || data.time_update || new Date();
        
        payload = {
          name: "Real Customer", 
          phone: "919999999999",
          date: new Date(rawDate).toLocaleDateString('en-IN'),
          time: data.itime || "10:00 AM",
          id: data.id
        };
      }
    } catch (e) { console.warn("Manual Test: DB fetch failed, using dummy data"); } 
    finally { if (remoteDb) await remoteDb.end(); }

    const p_link = await getShortUrl(payload.id, 0, vendorBaseUrl);

    // 🔹 MANUAL TRIGGER MAPPING
    let params: string[] = [];
    if (event.includes("reward") || event.includes("membership")) params = [payload.name];
    else if (event.includes("new bill")) params = [payload.name, p_link];
    else if (event.includes("re-schedule")) params = [payload.date, payload.time];
    else if (event.includes("new appointment")) params = [payload.name, payload.date, payload.time];
    else if (event.includes("cancel")) params = [payload.name, payload.date];
    else params = [payload.name, p_link, businessPhone, payload.date];

    const components = [{
      type: "body",
      parameters: params.map(val => ({ type: "text", text: String(val) }))
    }];

    const result = await handleAutomatedWhatsApp(rule.tenant, rule.templateName, components, payload.phone, "en");
    return result.success ? { success: true } : { success: false, error: result.error };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------------------------
// 5. CRUD ACTIONS
// ----------------------------------------------------------------------

export async function getClientAutomations(tenantId: string) {
  if (!tenantId) return [];
  try {
    return await prisma.automationRule.findMany({
      where: { tenantId: String(tenantId) },
      include: { logs: { take: 5, orderBy: { createdAt: 'desc' } } }, 
      orderBy: { id: "desc" },
    });
  } catch (error) { return []; }
}

export async function saveAutomationAction(tenantId: string, formData: FormData) {
  try {
    await prisma.automationRule.create({
      data: {
        tenantId: String(tenantId),
        eventType: formData.get("eventType") as string,
        templateName: formData.get("templateName") as string,
        delayValue: parseInt((formData.get("delayValue") || "0").toString()),
        delayUnit: (formData.get("delayUnit") || "Minutes").toString(),
        isActive: true,
      },
    });
    revalidatePath(`/admin/clients/${tenantId}/automation`);
    return { error: null };
  } catch (error: any) { return { error: "Failed." }; }
}

export async function deleteAutomationAction(ruleId: string, tenantId: string) {
  try {
    await prisma.automationRule.delete({ where: { id: ruleId } });
    revalidatePath(`/admin/clients/${tenantId}/automation`);
    return { success: true };
  } catch (error) { return { success: false, error: "Failed." }; }
}