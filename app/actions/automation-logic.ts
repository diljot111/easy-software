"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { handleAutomatedWhatsApp } from "./whatsapp-actions"; 
import mysql, { Connection } from "mysql2/promise";
import { getTemplateVariableCounts } from "@/lib/whatsapp-utils"; 

function encrypt_url(val: number) {
  return (((val + 1000) * 7) + 5000) * 2;
}

async function getShortUrl(invoiceId: number, branchId: number, baseUrl: string) {
  // 🛡️ SECURITY: Safe URL Fallback
  let validBaseUrl = baseUrl;
  if (!validBaseUrl || !validBaseUrl.startsWith("http")) {
    validBaseUrl = "https://2025.shivsoftsindia.in/live_demo"; 
  }
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

export async function triggerAutomationManual(ruleId: number | string) {
  const rId = Number(ruleId);
  if (isNaN(rId)) return { success: false, error: "Invalid Rule ID" };

  let remoteDb;
  try {
    const rule = await prisma.automation_rule.findUnique({
      where: { id: rId },
      include: { tenant: true }
    });
    if (!rule || !rule.tenant) throw new Error("Rule not found.");

    const t = rule.tenant as any;
    const businessName = t.business_name || "Your Salon";
    
    // 🟢 SAFE URL SELECTION (Logic Match)
    const rawUrlSource = t.business_name || ""; 
    const vendorBaseUrl = rawUrlSource.startsWith("http") ? rawUrlSource : "https://2025.shivsoftsindia.in/live_demo";

    const event = rule.event_type.toLowerCase();

    // Default Payload
    let payload = { 
      name: "Test User", 
      phone: "919999999999", 
      date: new Date().toLocaleDateString('en-IN'), 
      time: "10:00 AM", 
      details: "Service",
      amount: "500",
      points: "50",
      id: 0, branch_id: 0, 
      dob: new Date(), aniversary: new Date(),
      pending: "500",
      appdate: new Date().toLocaleDateString('en-IN'),
      itime: "10:00 AM"
    };

    try {
      remoteDb = await mysql.createConnection({
        host: rule.tenant.db_host,
        user: rule.tenant.db_user,
        password: rule.tenant.db_password,
        database: rule.tenant.db_name,
        port: Number(rule.tenant.db_port) || 3306,
      });

      const tables = await identifyTables(remoteDb, rule.tenant.db_name);
      let table = tables.invoice;
      let customQuery = "";

      if (event.includes("appointment")) table = tables.appointment;
      else if (event.includes("reward")) table = tables.reward;
      else if (event.includes("membership")) table = tables.membership;
      else if (event.includes("service reminder")) table = tables.service_reminder;
      else if (event.includes("birthday") || event.includes("anniversary")) table = tables.client;
      else if (event.includes("enquiry") || event.includes("walkin")) table = tables.enquiry;
      else if (event.includes("pending")) {
          table = tables.invoice;
          customQuery = `SELECT t.*, c.name, c.cont as phone FROM ${tables.invoice} t LEFT JOIN ${tables.client} c ON t.client = c.id WHERE t.pending > 0 ORDER BY t.id DESC LIMIT 1`;
      }

      let rows: any = [];
      if (customQuery) {
          [rows] = await remoteDb.execute(customQuery);
      } else {
          try {
             [rows] = await remoteDb.execute(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1`);
          } catch(err) {
             console.warn(`Manual Test: Table ${table} not found.`);
          }
      }
      
      if (rows.length > 0) {
        const data = rows[0];
        const appDate = new Date(data.appdate || data.date || new Date()).toLocaleDateString('en-IN');
        payload = {
          ...data,
          name: data.name || "Real Customer", 
          phone: data.cont || "919999999999", 
          date: appDate,
          time: data.itime || data.time || "10:00 AM",
          details: data.details || data.service || "Service",
          amount: String(data.total || data.net_amt || "500"),
          id: data.id,
          branch_id: Number(data.branch_id || 0),
          points: String(data.points || "50"),
          dob: data.dob || new Date(),
          aniversary: data.aniversary || new Date(),
          pending: String(data.pending || "0"),
          appdate: appDate,
          itime: data.itime || "10:00 AM"
        };
      }
    } catch (e) { 
      console.warn("Manual Test: DB fetch failed, using dummy data"); 
    } finally { 
      if (remoteDb) await remoteDb.end(); 
    }

    const p_link = await getShortUrl(payload.id, payload.branch_id, vendorBaseUrl);

    // 🟢 SUPER RICH DATA (Logic Match)
    const richData: any = {
       ...payload, 
       "client.name": payload.name,
       "client.dob": new Date(payload.dob).toLocaleDateString('en-IN'),
       "client.anniversary": new Date(payload.aniversary).toLocaleDateString('en-IN'),
       "client.pending": payload.pending,
       "client.rewards": payload.points,
       "invoice.amount": payload.amount,
       "invoice.date": payload.date,
       "invoice.link": p_link,
       "appointment.date": payload.date,
       "appointment.time": payload.time,
       "appointment.service": payload.details,
       "system.name": businessName,
       "system.phone": "919999999999",
       "system.link": p_link,

       "business_name": businessName,
       "appdate": payload.date,
       "itime": payload.time,
       "short_link": p_link,
       "name": payload.name
    };

    const templateData = await prisma.whatsapp_template.findUnique({
      where: { tenant_id_name: { tenant_id: rule.tenant.id, name: rule.template_name } }
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
             if (richData[mappedKey] !== undefined && richData[mappedKey] !== null) {
                value = String(richData[mappedKey]);
             } else {
                value = mappedKey; 
             }
          }
          bodyParams.push({ type: "text", text: value });
       }
       while (bodyParams.length < counts.bodyVars) {
         bodyParams.push({ type: "text", text: "-" });
       }
       components = [{ type: "body", parameters: bodyParams }];
    } else {
       components = [{ type: "body", parameters: [{type: "text", text: payload.name}] }]; 
    }

    const result = await handleAutomatedWhatsApp(rule.tenant, rule.template_name, components, String(payload.phone), "en");
    return result.success ? { success: true } : { success: false, error: result.error };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getClientAutomations(tenantId: number | string) {
  const id = Number(tenantId);
  if (isNaN(id)) return [];
  try {
    return await prisma.automation_rule.findMany({
      where: { tenant_id: id },
      include: { logs: { take: 5, orderBy: { created_at: 'desc' } } }, 
      orderBy: { id: "desc" },
    });
  } catch (error) { return []; }
}

export async function saveAutomationAction(tenantId: number | string, formData: FormData) {
  const id = Number(tenantId);
  if (isNaN(id)) return { error: "Invalid Tenant ID" };
  try {
    await prisma.automation_rule.create({
      data: {
        tenant_id: id,
        event_type: formData.get("eventType") as string,
        template_name: formData.get("templateName") as string,
        delay_value: parseInt((formData.get("delayValue") || "0").toString()),
        delay_unit: (formData.get("delayUnit") || "Minutes").toString(),
        is_active: true,
      },
    });
    revalidatePath(`/admin/clients/${id}/automation`);
    return { error: null };
  } catch (error: any) { return { error: "Failed to save rule." }; }
}

export async function deleteAutomationAction(ruleId: number | string, tenantId: number | string) {
  const rId = Number(ruleId);
  const tId = Number(tenantId);
  if (isNaN(rId) || isNaN(tId)) return { success: false, error: "Invalid ID" };
  try {
    await prisma.automation_log.deleteMany({ where: { rule_id: rId } });
    await prisma.automation_rule.delete({ where: { id: rId } });
    revalidatePath(`/admin/clients/${tId}/automation`);
    return { success: true };
  } catch (error: any) { 
    return { success: false, error: "Failed to delete logic." }; 
  }
}