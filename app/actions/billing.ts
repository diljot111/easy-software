"use server";

import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function createBillAndNotify(data: {
  appointmentId: number;
  total: number;
  paid: number;
  due: number;
}) {
  try {
    /* ---------------- 1️⃣ CREATE BILL ---------------- */

    const bill = await prisma.invoice_1.create({
      data: {
        appointment_id: data.appointmentId,
        total: data.total,
        paid: data.paid,
        due: data.due,
        active: 1,
        invoice: 1,
        billdate: new Date(),
        uid: 1, // system/admin
        client: 0, // temp, will update below
        taxtype: 0, // default value
        pay_method: "", // default value
        details: "", // default value
        paydetails: "", // default value
        is_cancelled: 0, // default value
      },
    });

    /* ---------------- 2️⃣ FETCH APPOINTMENT ---------------- */

    const appointment = await prisma.app_invoice_1.findUnique({
      where: { id: data.appointmentId },
      select: {
        details: true,
        client: true,
      },
    });

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    /* ---------------- 3️⃣ UPDATE BILL WITH CLIENT ---------------- */

    await prisma.invoice_1.update({
      where: { id: bill.id },
      data: { client: appointment.client },
    });

    /* ---------------- 4️⃣ FETCH CLIENT ---------------- */

    const client = await prisma.client.findUnique({
      where: { id: appointment.client },
      select: {
        name: true,
        cont: true,
      },
    });

    if (!client?.cont) {
      console.warn("No WhatsApp number for client");
      return { success: true, bill };
    }

    /* ---------------- 5️⃣ SEND WHATSAPP ---------------- */

    const components = [
      {
        type: "body",
        parameters: [
          { type: "text", text: client.name ?? "Customer" },       // {{1}}
          { type: "text", text: appointment.details ?? "Service" },// {{2}}
          { type: "text", text: String(bill.id) },                 // {{3}}
          { type: "text", text: `₹${bill.total ?? 0}` },           // {{4}}
          { type: "text", text: `₹${bill.due ?? 0}` },             // {{5}}
        ],
      },
    ];

    await sendWhatsApp(
      client.cont,
      "appointment_bill_notification",
      components,
      "en"
    );

    return { success: true, bill };
  } catch (error: any) {
    console.error("❌ Bill automation error:", error);
    return { success: false, error: error.message };
  }
}
