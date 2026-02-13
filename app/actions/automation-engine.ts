"use server";

import mysql, { Connection } from "mysql2/promise";
import { prisma } from "@/lib/prisma";
import { handleAutomatedWhatsApp } from "./whatsapp-actions";
import { getTemplateVariableCounts } from "@/lib/whatsapp-utils";
/**
 * ----------------------------------------------------------------------
 * 1. CONFIGURATION & UTILS
 * ----------------------------------------------------------------------
 */

function getVendorBaseUrl(tenantId: number) {
  // Map Tenant ID (Int) to their specific base URL if needed
  const urlMap: Record<number, string> = {
    1: "https://2025.shivsoftsindia.in/live_demo" // Example for ID 1
  };
  return urlMap[tenantId] || "https://2025.shivsoftsindia.in/live_demo";
}

function encrypt_url(val: number) {
  return (((val + 1000) * 7) + 5000) * 2;
}

// ⏳ Helper for Delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getShortUrl(invoiceId: number, branchId: number, baseUrl: string) {
  let longUrl = "";
  // Ensure the base URL ends with a slash
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  
  const encryptedId = encrypt_url(invoiceId);
  const encryptedBranchId = encrypt_url(branchId);
  longUrl = `${cleanBaseUrl}invoice.php?invMencr=${encryptedId}&invshopid=${encryptedBranchId}`;

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

/**
 * Dynamic Variable Mapper
 */
function getDynamicParams(eventType: string, data: any, businessName: string): any[] {
  const params = [];
  const evt = eventType.toLowerCase();

  // 1. BILLING / FEEDBACK
  if (evt.includes("new bill") || evt.includes("feedback")) {
    params.push({ type: "text", text: data.name || "Customer" }); 
    params.push({ type: "text", text: data.short_link || "https://example.com" }); 
  } 
  // 2. REWARDS
  else if (evt.includes("reward")) {
    params.push({ type: "text", text: data.points?.toString() || "0" });
  }
  // 3. MEMBERSHIP
  else if (evt.includes("membership")) {
    params.push({ type: "text", text: businessName });
  }
  // 4. PENDING PAYMENT
  else if (evt.includes("pending")) {
    const amt = data.pending || data.net_amt || "0";
    params.push({ type: "text", text: data.name || "Customer" });
    params.push({ type: "text", text: amt.toString() });
    params.push({ type: "text", text: data.short_link || "" });
  }
  // 5. APPOINTMENTS
  else if (evt.includes("appointment") || evt.includes("reminder") || evt.includes("confirmation")) {
    params.push({ type: "text", text: data.name || "Customer" });
    params.push({ type: "text", text: data.details || "Service" });
    params.push({ type: "text", text: data.itime || "10:00 AM" });
    params.push({ type: "text", text: businessName });
  }
  // 6. CANCELLATION
  else if (evt.includes("cancel")) {
    params.push({ type: "text", text: data.appdate || "Date" });
    params.push({ type: "text", text: businessName });
  }
  // 7. RESCHEDULE
  else if (evt.includes("re-schedule")) {
    params.push({ type: "text", text: `${data.appdate} at ${data.itime}` });
    params.push({ type: "text", text: businessName });
  }
  // 8. ENQUIRY
  else if (evt.includes("enquiry") || evt.includes("walkin")) {
    params.push({ type: "text", text: data.name || "Customer" });
    params.push({ type: "text", text: businessName });
  }
  // 9. BIRTHDAY / ANNIVERSARY
  else if (evt.includes("birthday") || evt.includes("anniversary")) {
    params.push({ type: "text", text: data.name || "Customer" });
  }
  else {
    params.push({ type: "text", text: data.name || "Customer" });
  }
  
  return [{ type: "body", parameters: params }];
}

// ----------------------------------------------------------------------
// 2. MAIN AUTOMATION ENGINE (BATCH PROCESSING)
// ----------------------------------------------------------------------

export async function processTenantAutomation(tenantId: number) {
  // ✅ FIX: Ensure tenantId is an Integer
  const id = Number(tenantId);
  if (isNaN(id)) return { success: false, error: "Invalid Tenant ID" };

  const tenant = await prisma.tenant.findUnique({ 
    where: { id: id }, // ✅ Integer ID
    include: { automation_rules: { where: { is_active: true } } } 
  });
  
  if (!tenant) return { success: true };

  const t = tenant as any;
  let businessDisplayName = t.business_name || "Your Salon";
  if (businessDisplayName.includes("http") || businessDisplayName.includes(".in") || businessDisplayName.includes(".com")) {
      businessDisplayName = "Your Salon"; 
  }

  const businessPhone = t.business_phone || "919999999999"; 
  const vendorBaseUrl = getVendorBaseUrl(id);

  if (!tenant.automation_rules || tenant.automation_rules.length === 0) return { success: true };

  let remoteDb: Connection | undefined;
  
  // 📦 JOB QUEUE
  let pendingJobs: any[] = [];

  // ======================================================
  // PHASE 1: FETCH ALL PENDING MESSAGES (FAST)
  // ======================================================
  try {
    console.log(`[${businessDisplayName}] 📡 Connecting to DB to fetch jobs...`);
    remoteDb = await mysql.createConnection({
      host: tenant.db_host,
      user: tenant.db_user,
      password: tenant.db_password,
      database: tenant.db_name,
      port: Number(tenant.db_port) || 3306, // ✅ Force Integer Port
      connectTimeout: 5000
    });

    const lookback = new Date(Date.now() - 10 * 60000).toISOString().slice(0, 19).replace('T', ' ');

    for (const rule of tenant.automation_rules) {
      const event = rule.event_type.toLowerCase();
      let query = "";
      let queryParams: any[] = [];
      let dateCol = "updatetime"; 
      let isRecurring = false; 

      // --- QUERY LOGIC ---
      if (event.includes("birthday")) {
        query = `SELECT *, id as client_id, cont as phone FROM client WHERE DATE_FORMAT(dob, '%m-%d') = DATE_FORMAT(NOW(), '%m-%d')`;
        isRecurring = true;
      } else if (event.includes("anniversary")) {
        query = `SELECT *, id as client_id, cont as phone FROM client WHERE DATE_FORMAT(aniversary, '%m-%d') = DATE_FORMAT(NOW(), '%m-%d')`;
        isRecurring = true;
      } else if (event.includes("enquiry") || event.includes("walkin")) {
        query = `SELECT * FROM enquiry WHERE date >= ?`;
        queryParams = [lookback];
      } else if (event.includes("pending")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM invoice_1 t LEFT JOIN client c ON t.client = c.id WHERE t.updatetime >= ? AND t.pending > 0`; 
        queryParams = [lookback];
      } else if (event.includes("appointment reminder")) {
        dateCol = "appdate";
        const today = new Date().toISOString().slice(0, 10);
        const timeCheck = new Date(new Date().getTime() + 30 * 60000).toTimeString().slice(0, 5); 
        query = `SELECT t.*, c.name, c.cont as phone FROM app_invoice_1 t LEFT JOIN client c ON t.client = c.id WHERE t.appdate = ? AND t.itime LIKE ?`;
        queryParams = [today, `${timeCheck}%`];
      } else if (event.includes("appointment cancel")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM app_invoice_1 t LEFT JOIN client c ON t.client = c.id WHERE t.updatetime >= ? AND (t.status = 'Cancel' OR t.status = 'Deleted')`;
        queryParams = [lookback];
      } else if (event.includes("appointment re-schedule")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM app_invoice_1 t LEFT JOIN client c ON t.client = c.id WHERE t.updatetime >= ? AND t.status = 'Rescheduled'`;
        queryParams = [lookback];
      } else if (event.includes("new appointment")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM app_invoice_1 t LEFT JOIN client c ON t.client = c.id WHERE t.updatetime >= ? AND (t.status = 'Pending' OR t.status = 'Confirmed')`;
        queryParams = [lookback];
      } else if (event.includes("reward")) {
        dateCol = "datetime"; 
        query = `SELECT t.*, c.name, c.cont as phone FROM customer_reward_points t LEFT JOIN client c ON c.id = SUBSTRING_INDEX(t.client_id, ',', -1) WHERE t.datetime >= ? AND t.point_type = 1`;
        queryParams = [lookback];
      } else if (event.includes("membership")) {
        dateCol = "time_update"; 
        query = `SELECT t.*, c.name, c.cont as phone FROM membership_discount_history t LEFT JOIN client c ON c.id = SUBSTRING_INDEX(t.client_id, ',', -1) WHERE t.time_update >= ?`;
        queryParams = [lookback];
      } else if (event.includes("service reminder")) {
        dateCol = "reminder_date";
        query = `SELECT t.*, c.name, c.cont as phone FROM service_reminder t LEFT JOIN client c ON c.id = t.client_id WHERE t.reminder_date >= ?`;
        queryParams = [lookback];
      } else if (event.includes("new bill") || event.includes("feedback")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM invoice_1 t LEFT JOIN client c ON t.client = c.id WHERE t.updatetime >= ?`;
        queryParams = [lookback];
      }

      if (!query) continue;

      try {
        const [rows]: any = await remoteDb.execute(query, queryParams);
        
        for (const data of rows) {
          const uniqueId = isRecurring ? `${data.id}_${new Date().getFullYear()}` : data.id.toString();
          
          // Check if already sent
          const alreadySent = await prisma.automation_log.findFirst({
            where: { 
              tenant_id: id, // ✅ Integer
              external_id: uniqueId, 
              rule_id: rule.id // ✅ Integer
            }
          });

          if (!alreadySent) {
            // Add to Queue
            pendingJobs.push({
               rule,
               data,
               uniqueId,
               dateCol,
               isRecurring
            });
          }
        }
      } catch (err: any) {
         console.warn(`⚠️ Query Skipped: ${err.message}`);
      }
    }
  } catch (error: any) {
    console.error(`💥 DB Connection Error:`, error.message);
    return { success: false, error: error.message };
  } finally {
    // 🔹 CLOSE DB CONNECTION NOW - Don't hold it open during sending
    if (remoteDb) await remoteDb.end();
  }

  // ======================================================
  // PHASE 2: BATCH SENDING (SAFE & SLOW)
  // ======================================================
  
  if (pendingJobs.length === 0) {
    console.log(`[${businessDisplayName}] ✅ No new events to process.`);
    return { success: true };
  }

  console.log(`[${businessDisplayName}] 🚀 Processing ${pendingJobs.length} jobs in batches...`);

  // Process 1 by 1 (Strict Serial Mode) to prevent spam blocking
  for (let i = 0; i < pendingJobs.length; i++) {
    const job = pendingJobs[i];
    const { rule, data, uniqueId, dateCol } = job;
    
    // Prepare Data
    const rawDate = data[dateCol] || data.updatetime || data.dob || data.aniversary || data.date || new Date();
    const formattedDate = new Date(rawDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
    const p_branch = Number(data.branch_id || 0);
    const p_link = await getShortUrl(Number(data.id), p_branch, vendorBaseUrl);

    // Prepare Base Params
    const components = getDynamicParams(rule.event_type, {
        ...data, 
        appdate: formattedDate,
        itime: data.itime || "",
        short_link: p_link,
    }, businessDisplayName);

    // 🛡️ SMART VARIABLE MATCHER (Prevents Meta API crashes)
    // 1. Fetch the exact template from your database
    const templateData = await prisma.whatsapp_template.findUnique({
      where: { 
        tenant_id_name: { tenant_id: id, name: rule.template_name } 
      }
    });

    if (templateData && templateData.components) {
      // 2. Count how many variables Meta actually wants
      const counts = getTemplateVariableCounts(templateData.components as any[]);
      let bodyParams = components[0].parameters;

      // 3. If we generated too FEW variables, add blanks so Meta doesn't crash
      while (bodyParams.length < counts.bodyVars) {
        bodyParams.push({ type: "text", text: "-" });
      }
      
      // 4. If we generated too MANY variables, slice off the extras
      if (bodyParams.length > counts.bodyVars) {
        components[0].parameters = bodyParams.slice(0, counts.bodyVars);
      }
    }

    // Send Message
    const result = await handleAutomatedWhatsApp(tenant, rule.template_name, components, data.phone, "en");

    if (result.success) {
      await prisma.automation_log.create({
        data: { 
          tenant_id: id, // ✅ Integer
          rule_id: rule.id, // ✅ Integer
          external_id: uniqueId, 
          status: "SENT" 
        }
      });
      console.log(`✅ (${i+1}/${pendingJobs.length}) SENT: "${rule.template_name}" to ${data.name}`);
    } else {
      console.error(`❌ FAILED sending to ${data.name}: ${result.error}`);
    }

    // ⏳ WAIT 15 SECONDS BETWEEN EACH MESSAGE (Safe Batching)
    if (i < pendingJobs.length - 1) {
        console.log(`⏳ Waiting 15s before next message...`);
        await delay(15000); 
    }
  }

  return { success: true };
}