"use server";

export async function fetchWhatsAppTemplates(formData: FormData) {
  // We need the WABA ID, not the Phone Number ID for templates
  const wabaId = formData.get("whatsapp_business_id") as string; 
  const accessToken = formData.get("whatsapp_token") as string;

  if (!wabaId || !accessToken) {
    return { success: false, error: "WABA ID and Token are required." };
  }

  try {
    // Correct Endpoint: uses the WhatsApp Business Account ID
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${wabaId}/message_templates?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (data.error) {
      // This will catch if the ID is still wrong or token expired
      throw new Error(data.error.message);
    }

    return { 
      success: true, 
      templates: data.data || [], 
      message: "Templates synced successfully." 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}