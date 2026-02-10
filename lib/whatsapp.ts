"use server";

/**
 * Normalize phone number for WhatsApp Cloud API
 * - Removes +, spaces, non-digits
 * - Adds country code (91) if missing
 */
function normalizeWhatsAppNumber(raw: string): string {
  if (!raw) return raw;

  // Remove everything except digits
  let phone = raw.replace(/[^\d]/g, "");

  // If already starts with 91 and length > 10, keep it
  if (phone.startsWith("91") && phone.length > 10) {
    return phone;
  }

  // If 10-digit Indian number, prepend 91
  if (phone.length === 10) {
    return `91${phone}`;
  }

  // Fallback (return as-is)
  return phone;
}

export async function sendWhatsApp(
  to: string,
  templateName: string,
  components: any[],
  language = "en"
) {
  const normalizedTo = normalizeWhatsAppNumber(to);

  console.log("🚀 sendWhatsApp() CALLED");
  console.log("📞 Raw To:", to);
  console.log("📞 Normalized To:", normalizedTo);
  console.log("📄 Template:", templateName);
  console.log("🌐 Language:", language);
  console.log("🧩 Components:", JSON.stringify(components, null, 2));
  console.log("📟 Phone Number ID:", process.env.WHATSAPP_PHONE_NUMBER_ID);
  console.log(
    "🔐 Access Token Exists:",
    !!process.env.WHATSAPP_ACCESS_TOKEN
  );

  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.error("❌ WhatsApp ENV variables missing");
      return {
        success: false,
        error: "WhatsApp environment variables not configured",
      };
    }

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    console.log("🌍 WhatsApp API URL:", url);

    const payload = {
      messaging_product: "whatsapp",
      to: normalizedTo,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    };

    console.log("📦 Payload:", JSON.stringify(payload, null, 2));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    console.log("📡 WhatsApp HTTP Status:", res.status);

    const data = await res.json();

    console.log("📨 WhatsApp API Response:", JSON.stringify(data, null, 2));

    if (!res.ok) {
      console.error("❌ WhatsApp API ERROR RESPONSE");
      return { success: false, error: data };
    }

    console.log("✅ WhatsApp message SENT successfully");
    return { success: true, data };
  } catch (error: any) {
    console.error("❌ WhatsApp Send EXCEPTION:", error);
    return { success: false, error: error.message };
  }
}
