// src/actions/appointments.js
import { sendWhatsApp } from "@/lib/whatsapp";

export async function confirmAppointment(phone, customerName) {
  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: customerName } // Fills {{1}} in template
      ]
    }
  ];

  // Uses 'appointment_confirmation_1' from your manager
  return await sendWhatsApp(phone, "appointment_confirmation_1", components);
}