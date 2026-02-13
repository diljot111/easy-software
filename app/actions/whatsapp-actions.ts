"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTemplateVariableCounts } from "@/lib/whatsapp-utils"; // ✅ Added Import

/**
 * 1. EXECUTE: Sends the WhatsApp message via Meta Cloud API.
 * This will print the FULL Meta JSON response to your terminal.
 */
export async function handleAutomatedWhatsApp(
  tenant: any, 
  templateName: string, 
  components: any[], 
  toNumber: string,
  langCode: string = "en" 
) {
  try {
    // 1. Database Credential Check
    if (!tenant.meta_token || !tenant.phone_number_id || !toNumber) {
      console.warn(`⚠️ Missing Meta credentials for: ${tenant.business_name}`);
      return { success: false, error: "Missing Credentials" };
    }

    // 2. Format Phone Number
    let cleanPhone = toNumber.toString().replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const payload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: langCode },
        components: components
      }
    };

    console.log(`\n--- 📤 SENDING WHATSAPP TO: ${cleanPhone} ---`);

    // 3. API Call
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${tenant.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tenant.meta_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    // 4. Capture the Full JSON Response
    const result = await response.json();

    // 🔹 TERMINAL LOGGING
    console.log("---------------- META API RESPONSE ----------------");
    console.log(`HTTP Status: ${response.status} ${response.statusText}`);
    console.log(JSON.stringify(result, null, 2));
    console.log("---------------------------------------------------\n");

    // 5. Check for Meta Errors
    if (!response.ok || result.error) {
      return { 
        success: false, 
        error: result.error?.message || "Meta API Error",
        metaResponse: result 
      };
    }

    // 6. Success
    return { 
      success: true, 
      messageId: result.messages?.[0]?.id,
      metaResponse: result 
    };

  } catch (error: any) {
    console.error("❌ System Error in handleAutomatedWhatsApp:", error.message);
    return { 
      success: false, 
      error: error.message,
      metaResponse: { internal_system_error: error.message }
    };
  }
}

/**
 * 2. SYNC TEMPLATES: Mirrors Meta's templates to your local DB.
 * ⚡️ OPTIMIZED: Uses Batching (Chunks of 5) to prevent DB Connection Crashes (P1017)
 */
export async function syncTemplatesToDb(tenantId: number | string, metaTemplates: any[]) {
  const tId = Number(tenantId);
  if (isNaN(tId)) return { success: false, error: "Invalid Tenant ID" };

  try {
    const metaTemplateNames = metaTemplates.map((t) => t.name);

    // 1. DELETE: Remove templates from DB that are NOT in Meta anymore
    await prisma.whatsapp_template.deleteMany({
      where: {
        tenant_id: tId,
        name: { notIn: metaTemplateNames },
      },
    });

    // 2. BATCH UPSERT: Process templates in chunks of 5 to save connections
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < metaTemplates.length; i += BATCH_SIZE) {
      const batch = metaTemplates.slice(i, i + BATCH_SIZE);
      
      // Run this small batch in parallel (Fast but Safe)
      await Promise.all(
        batch.map((tmpl) => {
          const componentsJson = tmpl.components ? JSON.parse(JSON.stringify(tmpl.components)) : [];
          
          // ✅ NEW: Calculate variable count for DB
          const counts = getTemplateVariableCounts(componentsJson);

          return prisma.whatsapp_template.upsert({
            where: {
              tenant_id_name: {
                tenant_id: tId,
                name: tmpl.name,
              },
            },
            update: {
              status: tmpl.status,
              category: tmpl.category,
              language: tmpl.language || "en_US",
              components: componentsJson,
              total_variables: counts.total, // ✅ Saving variable count
              updated_at: new Date(),
            },
            create: {
              tenant_id: tId,
              name: tmpl.name,
              status: tmpl.status,
              category: tmpl.category,
              language: tmpl.language || "en_US",
              components: componentsJson,
              total_variables: counts.total, // ✅ Saving variable count
            },
          });
        })
      );
    }

    revalidatePath(`/admin/clients/${tId}/settings`);
    return { success: true };
  } catch (error: any) {
    console.error("Sync Error:", error);
    return { success: false, error: "Failed to sync templates to DB." };
  }
}

/**
 * 3. FETCH RECOMMENDED TEMPLATES: Retrieves System Templates based on Industry.
 */
export async function getRecommendedTemplatesByIndustry(industry: string) {
  try {
    if (!industry) return { success: false, templates: [] };

    // Fetch generic 'All' templates + specific industry templates
    const templates = await prisma.system_template.findMany({
      where: {
        OR: [
          { industry: industry },
          { industry: "All" }
        ]
      },
      orderBy: { created_at: "desc" }
    });

    return { success: true, templates };
  } catch (error: any) {
    console.error("Fetch System Templates Error:", error);
    return { success: false, error: error.message, templates: [] };
  }
}

/**
 * 4. CREATE META TEMPLATE: Submits a new template to Meta for approval.
 */
export async function createMetaTemplate(wabaId: string, token: string, templateData: any) {
  try {
    if (!wabaId || !token) {
      return { success: false, error: "Missing WABA ID or Token" };
    }

    const url = `https://graph.facebook.com/v18.0/${wabaId}/message_templates`;

    console.log(`\n--- 🛠️ CREATING TEMPLATE: ${templateData.name} ---`);

    // Construct Payload for Meta
    const payload = {
      name: templateData.name,
      category: templateData.category || "UTILITY",
      allow_category_change: true,
      language: "en_US",
      components: templateData.components.map((c: any) => {
        if (c.type === "BODY") return { type: "BODY", text: c.text, example: c.example };
        if (c.type === "FOOTER") return { type: "FOOTER", text: c.text };
        if (c.type === "HEADER") return c; 
        return c;
      }),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // Log the Meta response
    console.log("---------------- META API RESPONSE ----------------");
    console.log(`HTTP Status: ${response.status} ${response.statusText}`);
    console.log(JSON.stringify(result, null, 2));
    console.log("---------------------------------------------------\n");

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { success: true, id: result.id, status: "PENDING", data: result };

  } catch (error: any) {
    console.error("❌ Template Creation Failed:", error.message);
    return { success: false, error: error.message };
  }
}
// Add this new function to actions/whatsapp-actions.ts
export async function getClientStoredTemplates(tenantId: number | string) {
  const tId = Number(tenantId);
  if (isNaN(tId)) return { success: false, templates: [] };

  try {
    const templates = await prisma.whatsapp_template.findMany({
      where: { tenant_id: tId },
      orderBy: { name: 'asc' }
    });
    return { success: true, templates };
  } catch (error: any) {
    console.error("Fetch Stored Templates Error:", error);
    return { success: false, error: error.message, templates: [] };
  }
}

/**
 * 5. SAVE MAPPINGS: Updates the assigned variables and the backend status (0 or 1).
 */
export async function updateTemplateMapping(templateId: number, mappings: any, isMapped: number) {
  try {
    await prisma.whatsapp_template.update({
      where: { id: templateId },
      data: {
        mappings: mappings,
        is_mapped: isMapped
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save mapping:", error);
    return { success: false, error: "Failed to save mapping to DB" };
  }
}