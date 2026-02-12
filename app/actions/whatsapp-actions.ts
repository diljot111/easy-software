"use server";

/**
 * EXECUTE: Sends the WhatsApp message via Meta Cloud API.
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

    // 🔹 TERMINAL LOGGING: This is where you see the response in your terminal
    console.log("---------------- META API RESPONSE ----------------");
    console.log(`HTTP Status: ${response.status} ${response.statusText}`);
    console.log(JSON.stringify(result, null, 2)); // <--- Prints full JSON formatted
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