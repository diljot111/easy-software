"use server";

export async function verifyWhatsAppToken(formData: FormData) {
  const phoneId = formData.get("whatsapp_phone_id") as string;
  const token = formData.get("whatsapp_token") as string;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: true, message: "Connection Verified: Token is valid." };
  } catch (err) {
    return { success: false, error: "Network error: Could not reach Meta servers." };
  }
}