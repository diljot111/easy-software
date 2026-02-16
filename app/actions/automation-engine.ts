"use server";

import mysql, { Connection } from "mysql2/promise";
import { prisma } from "@/lib/prisma";
import { handleAutomatedWhatsApp } from "./whatsapp-actions";
import { getTemplateVariableCounts } from "@/lib/whatsapp-utils";

function encrypt_url(val: number) {
  return (((val + 1000) * 7) + 5000) * 2;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getShortUrl(invoiceId: number, branchId: number, baseUrl: string) {
  // 🛡️ SECURITY: Force a valid URL structure
  let validBaseUrl = baseUrl;
  if (!validBaseUrl || !validBaseUrl.startsWith("http")) {
    // Fallback if the user just typed a name like "My Salon"
    validBaseUrl = "https://2025.shivsoftsindia.in/live_demo"; 
  }
  // Ensure trailing slash
  validBaseUrl = validBaseUrl.endsWith('/') ? validBaseUrl : `${validBaseUrl}/`;

  const encryptedId = encrypt_url(invoiceId);
  const encryptedBranchId = encrypt_url(branchId);
  const longUrl = `${validBaseUrl}invoice.php?invMencr=${encryptedId}&invshopid=${encryptedBranchId}`;

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

async function identifyTables(connection: Connection, dbName: string) {
  const [rows]: any = await connection.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`, 
    [dbName]
  );
  
  const tables = rows.map((r: any) => r.TABLE_NAME);
  
  return {
    invoice: tables.find((t: string) => t.startsWith('invoice_')) || 'invoice_1',
    appointment: tables.find((t: string) => t.startsWith('app_invoice_')) || 'app_invoice_1',
    client: tables.find((t: string) => t === 'client' || t === 'customer') || 'client',
    enquiry: tables.find((t: string) => t === 'enquiry') || 'enquiry',
    reward: tables.find((t: string) => t === 'customer_reward_points') || 'customer_reward_points',
    membership: tables.find((t: string) => t === 'membership_discount_history') || 'membership_discount_history',
    service_reminder: tables.find((t: string) => t === 'service_reminder') || 'service_reminder'
  };
}

function getDynamicParams(eventType: string, data: any, businessName: string): any[] {
  const params = [];
  const evt = eventType.toLowerCase();
  if (evt.includes("new bill") || evt.includes("feedback")) {
    params.push({ type: "text", text: data.name || "Customer" }); 
    params.push({ type: "text", text: data.short_link || "https://example.com" }); 
  } else {
    params.push({ type: "text", text: data.name || "Customer" });
  }
  return [{ type: "body", parameters: params }];
}

export async function processTenantAutomation(tenantId: number) {
  const id = Number(tenantId);
  if (isNaN(id)) return { success: false, error: "Invalid Tenant ID" };

  const tenant = await prisma.tenant.findUnique({ 
    where: { id: id },
    include: { automation_rules: { where: { is_active: true } } } 
  });
  
  if (!tenant) return { success: true };

  const t = tenant as any;
  const businessDisplayName = t.business_name || "Our Salon"; 
  const businessPhone = t.business_phone || "919999999999"; 
  
  // 🟢 SMART URL: Use Name only if it's a URL, otherwise use default
  const rawUrlSource = t.business_name || ""; 
  const vendorBaseUrl = rawUrlSource.startsWith("http") ? rawUrlSource : "https://2025.shivsoftsindia.in/live_demo";

  if (!tenant.automation_rules || tenant.automation_rules.length === 0) return { success: true };

  let remoteDb: Connection | undefined;
  let pendingJobs: any[] = [];

  try {
    console.log(`[${id}] 📡 Connecting to DB...`);
    remoteDb = await mysql.createConnection({
      host: tenant.db_host,
      user: tenant.db_user,
      password: tenant.db_password,
      database: tenant.db_name,
      port: Number(tenant.db_port) || 3306,
      connectTimeout: 5000
    });

    const tables = await identifyTables(remoteDb, tenant.db_name);
    const lookback = new Date(Date.now() - 10 * 60000).toISOString().slice(0, 19).replace('T', ' ');

    for (const rule of tenant.automation_rules) {
      const event = rule.event_type.toLowerCase();
      let query = "";
      let queryParams: any[] = [];
      let dateCol = "updatetime"; 
      let isRecurring = false; 

      if (event.includes("birthday")) {
        query = `SELECT *, id as client_id, cont as phone FROM ${tables.client} WHERE DATE_FORMAT(dob, '%m-%d') = DATE_FORMAT(NOW(), '%m-%d')`;
        isRecurring = true;
      } else if (event.includes("anniversary")) {
        query = `SELECT *, id as client_id, cont as phone FROM ${tables.client} WHERE DATE_FORMAT(aniversary, '%m-%d') = DATE_FORMAT(NOW(), '%m-%d')`;
        isRecurring = true;
      } else if (event.includes("enquiry") || event.includes("walkin")) {
        query = `SELECT * FROM ${tables.enquiry} WHERE date >= ?`;
        queryParams = [lookback];
      } else if (event.includes("pending")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM ${tables.invoice} t LEFT JOIN ${tables.client} c ON t.client = c.id WHERE t.updatetime >= ? AND t.pending > 0`; 
        queryParams = [lookback];
      } else if (event.includes("appointment reminder")) {
        dateCol = "appdate";
        const today = new Date().toISOString().slice(0, 10);
        const timeCheck = new Date(new Date().getTime() + 30 * 60000).toTimeString().slice(0, 5); 
        query = `SELECT t.*, c.name, c.cont as phone FROM ${tables.appointment} t LEFT JOIN ${tables.client} c ON t.client = c.id WHERE t.appdate = ? AND t.itime LIKE ?`;
        queryParams = [today, `${timeCheck}%`];
      } else if (event.includes("appointment cancel")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM ${tables.appointment} t LEFT JOIN ${tables.client} c ON t.client = c.id WHERE t.updatetime >= ? AND (t.status = 'Cancel' OR t.status = 'Deleted')`;
        queryParams = [lookback];
      } else if (event.includes("appointment re-schedule")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM ${tables.appointment} t LEFT JOIN ${tables.client} c ON t.client = c.id WHERE t.updatetime >= ? AND t.status = 'Rescheduled'`;
        queryParams = [lookback];
      } else if (event.includes("new appointment")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM ${tables.appointment} t LEFT JOIN ${tables.client} c ON t.client = c.id WHERE t.updatetime >= ? AND (t.status = 'Pending' OR t.status = 'Confirmed')`;
        queryParams = [lookback];
      } else if (event.includes("reward")) {
        dateCol = "datetime"; 
        query = `SELECT t.*, c.name, c.cont as phone FROM ${tables.reward} t LEFT JOIN ${tables.client} c ON c.id = SUBSTRING_INDEX(t.client_id, ',', -1) WHERE t.datetime >= ? AND t.point_type = 1`;
        queryParams = [lookback];
      } else if (event.includes("membership")) {
        dateCol = "time_update"; 
        query = `SELECT t.*, c.name, c.cont as phone FROM ${tables.membership} t LEFT JOIN ${tables.client} c ON c.id = SUBSTRING_INDEX(t.client_id, ',', -1) WHERE t.time_update >= ?`;
        queryParams = [lookback];
      } else if (event.includes("service reminder")) {
        dateCol = "reminder_date";
        query = `SELECT t.*, c.name, c.cont as phone FROM ${tables.service_reminder} t LEFT JOIN ${tables.client} c ON c.id = t.client_id WHERE t.reminder_date >= ?`;
        queryParams = [lookback];
      } else if (event.includes("new bill") || event.includes("feedback")) {
        query = `SELECT t.*, c.name, c.cont as phone FROM ${tables.invoice} t LEFT JOIN ${tables.client} c ON t.client = c.id WHERE t.updatetime >= ?`;
        queryParams = [lookback];
      }

      if (!query) continue;

      try {
        const [rows]: any = await remoteDb.execute(query, queryParams);
        
        for (const data of rows) {
          const uniqueId = isRecurring ? `${data.id}_${new Date().getFullYear()}` : data.id.toString();
          const alreadySent = await prisma.automation_log.findFirst({
            where: { tenant_id: id, external_id: uniqueId, rule_id: rule.id }
          });

          if (!alreadySent) {
            pendingJobs.push({ rule, data, uniqueId, dateCol, isRecurring });
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
    if (remoteDb) await remoteDb.end();
  }

  if (pendingJobs.length === 0) return { success: true };

  console.log(`[${id}] 🚀 Processing ${pendingJobs.length} jobs...`);

  for (let i = 0; i < pendingJobs.length; i++) {
    const job = pendingJobs[i];
    const { rule, data, uniqueId, dateCol } = job;
    
    // 1. Calculate Core Variables
    const appDateRaw = data.appdate || data.appointment_date || data.date || data.booking_date || data[dateCol] || new Date();
    const appTimeRaw = data.itime || data.time || data.start_time || "10:00 AM";
    const serviceName = data.details || data.service || data.treatment || "Service";
    const billAmount = data.total || data.net_amt || data.amount || data.final_total || "0";

    const formattedDate = new Date(appDateRaw).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const p_branch = Number(data.branch_id || 0);
    
    // ✅ Fix: getShortUrl now strictly uses the Safe URL we calculated above
    const p_link = await getShortUrl(Number(data.id), p_branch, vendorBaseUrl);

    // 2. 🛡️ DATA MAPPING (Overloaded for safety)
    const richData: any = {
       ...data,
       "client.name": data.name || data.client_name || "Customer",
       "client.dob": data.dob ? new Date(data.dob).toLocaleDateString('en-IN') : "-",
       "client.anniversary": data.aniversary ? new Date(data.aniversary).toLocaleDateString('en-IN') : "-",
       "client.pending": data.pending ? String(data.pending) : "0",
       "client.rewards": data.points ? String(data.points) : "0",
       "invoice.amount": billAmount,
       "invoice.date": formattedDate, 
       "invoice.link": p_link,
       "appointment.date": formattedDate, 
       "appointment.time": appTimeRaw,
       "appointment.service": serviceName,
       "system.name": businessDisplayName,
       "system.phone": businessPhone,
       "system.link": p_link,

       // 🚨 LEGACY KEYS (Must exist for older mappings)
       "business_name": businessDisplayName,
       "appdate": formattedDate,
       "itime": appTimeRaw,
       "short_link": p_link,
       "details": serviceName,
       "service": serviceName,
       "name": data.name || data.client_name || "Customer"
    };

    const templateData = await prisma.whatsapp_template.findUnique({
      where: { tenant_id_name: { tenant_id: id, name: rule.template_name } }
    });

    let components = [];

    if (templateData && templateData.components) {
      const counts = getTemplateVariableCounts(templateData.components as any[]);
      const mappings = (templateData.mappings as Record<string, string>) || {};
      const bodyParams = [];

      for (let k = 1; k <= counts.total; k++) {
         const mappedKey = mappings[String(k)]; 
         let value = "-";
         if (mappedKey) {
            // Priority: Check richData
            if (richData[mappedKey] !== undefined && richData[mappedKey] !== null) {
               value = String(richData[mappedKey]);
            } else {
               // Fallback to literal text
               value = mappedKey; 
            }
         }
         bodyParams.push({ type: "text", text: value });
      }
      
      while (bodyParams.length < counts.bodyVars) {
        bodyParams.push({ type: "text", text: "-" });
      }

      components = [{ type: "body", parameters: bodyParams }];
      
      // DEBUG LOG: CHECK THIS IN YOUR TERMINAL
      console.log(`[DEBUG] Rule: ${rule.event_type} | Params:`, JSON.stringify(bodyParams));

    } else {
      components = getDynamicParams(rule.event_type, {
          ...data, 
          appdate: formattedDate,
          itime: appTimeRaw,
          short_link: p_link,
      }, businessDisplayName);
    }

    const result = await handleAutomatedWhatsApp(tenant, rule.template_name, components, data.phone, "en");

    if (result.success) {
      await prisma.automation_log.create({
        data: { tenant_id: id, rule_id: rule.id, external_id: uniqueId, status: "SENT" }
      });
      console.log(`✅ SENT: "${rule.template_name}" to ${data.name}`);
    } else {
      console.error(`❌ FAILED: ${result.error}`);
    }

    if (i < pendingJobs.length - 1) await delay(15000); 
  }

  return { success: true };
}