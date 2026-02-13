"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { handleAutomatedWhatsApp } from "./whatsapp-actions"; 
import mysql, { Connection } from "mysql2/promise";

// ----------------------------------------------------------------------
// 1. CONFIGURATION & UTILS
// ----------------------------------------------------------------------

function getVendorBaseUrl(tenantId: number) {
  const urlMap: Record<number, string> = {
    1: "https://2025.shivsoftsindia.in/live_demo" 
  };
  return urlMap[tenantId] || "https://2025.shivsoftsindia.in/live_demo";
}

function encrypt_url(val: number) {
  return (((val + 1000) * 7) + 5000) * 2;
}

async function getShortUrl(invoiceId: number, branchId: number, baseUrl: string) {
  let longUrl = "";
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

// ----------------------------------------------------------------------
// 2. TRIGGER AUTOMATION (Manual Test)
// ----------------------------------------------------------------------

export async function triggerAutomationManual(ruleId: number | string) {
  // ✅ FIX: Ensure Rule ID is an Integer
  const rId = Number(ruleId);
  if (isNaN(rId)) return { success: false, error: "Invalid Rule ID" };

  let remoteDb;
  try {
    const rule = await prisma.automation_rule.findUnique({
      where: { id: rId }, // ✅ Integer ID
      include: { tenant: true }
    });
    if (!rule || !rule.tenant) throw new Error("Rule not found.");

    const t = rule.tenant as any;
    
    // 🚨 FIX: Business Name logic
    let businessName = t.business_name || "Your Salon";
    if (businessName.includes("http") || businessName.includes(".in") || businessName.includes(".com")) {
        businessName = "Your Salon";
    }

    const vendorBaseUrl = getVendorBaseUrl(rule.tenant.id); // ID is already Int
    const event = rule.event_type.toLowerCase();

    // Default Dummy Payload
    let payload = { 
      name: "Test User", 
      phone: "919999999999", 
      date: new Date().toLocaleDateString('en-IN'), 
      time: "10:00 AM",
      points: "50",
      details: "Service / Enquiry",
      amount: "500",
      id: 0,
      branch_id: 0
    };

    // 1. FETCH REAL DATA FROM DB
    try {
      remoteDb = await mysql.createConnection({
        host: rule.tenant.db_host,
        user: rule.tenant.db_user,
        password: rule.tenant.db_password,
        database: rule.tenant.db_name,
        port: Number(rule.tenant.db_port) || 3306, // ✅ Integer Port
      });

      let table = "invoice_1"; // Default
      let customQuery = "";

      if (event.includes("appointment")) table = "app_invoice_1";
      else if (event.includes("reward")) table = "customer_reward_points";
      else if (event.includes("membership")) table = "membership_discount_history";
      else if (event.includes("service reminder")) table = "service_reminder";
      else if (event.includes("birthday") || event.includes("anniversary")) table = "client";
      else if (event.includes("enquiry") || event.includes("walkin")) table = "enquiry";
      else if (event.includes("pending")) {
          table = "invoice_1";
          customQuery = `SELECT t.*, c.name, c.cont as phone FROM invoice_1 t LEFT JOIN client c ON t.client = c.id WHERE t.pending > 0 ORDER BY t.id DESC LIMIT 1`;
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
        const rawDate = data.updatetime || data.datetime || data.time_update || data.dob || data.aniversary || data.date || new Date();
        
        payload = {
          name: data.name || "Real Customer", 
          phone: data.cont || "919999999999", 
          date: new Date(rawDate).toLocaleDateString('en-IN'),
          time: data.itime || "10:00 AM",
          points: String(data.points || "50"),
          details: data.details || data.service || "Service",
          amount: String(data.pending || data.net_amt || "500"),
          id: data.id,
          branch_id: Number(data.branch_id || 0)
        };
      }
    } catch (e) { 
      console.warn("Manual Test: DB fetch failed, using dummy data"); 
    } finally { 
      if (remoteDb) await remoteDb.end(); 
    }

    const p_link = await getShortUrl(payload.id, payload.branch_id, vendorBaseUrl);

    // 2. STRICT PARAMETER MAPPING (Same as Engine)
    let params: string[] = [];

    if (event.includes("new bill") || event.includes("feedback")) {
       params = [payload.name, p_link];
    }
    else if (event.includes("reward")) {
      params = [payload.points]; 
    } 
    else if (event.includes("membership")) {
      params = [businessName];
    }
    else if (event.includes("pending")) {
        params = [payload.name, payload.amount, p_link];
    }
    else if (event.includes("appointment") || event.includes("reminder") || event.includes("confirmation")) {
      params = [payload.name, payload.details, payload.time, businessName];
    }
    else if (event.includes("cancel")) {
      params = [payload.date, businessName];
    }
    else if (event.includes("re-schedule")) {
      params = [`${payload.date} at ${payload.time}`, businessName];
    }
    else if (event.includes("enquiry")) {
        params = [payload.name, businessName];
    }
    else if (event.includes("birthday") || event.includes("anniversary")) {
        params = [payload.name];
    }
    else {
      // Fallback
      params = [payload.name];
    }

    const components = [{
      type: "body",
      parameters: params.map(val => ({ type: "text", text: String(val) }))
    }];

    const result = await handleAutomatedWhatsApp(rule.tenant, rule.template_name, components, payload.phone, "en");
    return result.success ? { success: true } : { success: false, error: result.error };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------------------------
// 3. CRUD ACTIONS (Existing)
// ----------------------------------------------------------------------

export async function getClientAutomations(tenantId: number | string) {
  // ✅ FIX: Ensure Tenant ID is Integer
  const id = Number(tenantId);
  if (isNaN(id)) return [];

  try {
    return await prisma.automation_rule.findMany({
      where: { tenant_id: id }, // ✅ Integer
      include: { logs: { take: 5, orderBy: { created_at: 'desc' } } }, 
      orderBy: { id: "desc" },
    });
  } catch (error) { return []; }
}

export async function saveAutomationAction(tenantId: number | string, formData: FormData) {
  // ✅ FIX: Ensure Tenant ID is Integer
  const id = Number(tenantId);
  if (isNaN(id)) return { error: "Invalid Tenant ID" };

  try {
    await prisma.automation_rule.create({
      data: {
        tenant_id: id, // ✅ Integer
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
    // Delete logs first to respect Foreign Key constraints (if cascade isn't set)
    await prisma.automation_log.deleteMany({ where: { rule_id: rId } });
    await prisma.automation_rule.delete({ where: { id: rId } });
    
    revalidatePath(`/admin/clients/${tId}/automation`);
    return { success: true };
  } catch (error: any) { 
    return { success: false, error: "Failed to delete logic." }; 
  }
}