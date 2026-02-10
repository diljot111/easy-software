"use server";

/**
 * EXECUTE: Sends the WhatsApp message via Meta Cloud API using tenant credentials.
 * FIX: Defaulted langCode to "en" to match Meta India registrations (Error #132001)
 */
export async function handleAutomatedWhatsApp(
  tenant: any, 
  templateName: string, 
  components: any[], 
  toNumber: string,
  langCode: string = "en" 
) {
  try {
    if (!tenant.metaToken || !tenant.phoneNumberId || !toNumber) {
      console.warn(`⚠️ Credentials missing for tenant: ${tenant.businessName}`);
      return { success: false, error: "Missing Credentials" };
    }

    // Clean phone number: remove non-digits and ensure 12 digits for India
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

    // DEBUG LOG 1: Verify exact payload sent to Meta
    console.log("📤 META PAYLOAD:", JSON.stringify(payload, null, 2));

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${tenant.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tenant.metaToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    // DEBUG LOG 2: Catch detailed Meta rejection reasons
    if (result.error) {
      console.error("❌ META FULL ERROR:", JSON.stringify(result.error, null, 2));
      throw new Error(result.error.message);
    }

    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (error: any) {
    console.error("❌ WhatsApp Action Failed:", error.message);
    return { success: false, error: error.message };
  }
}