import { prisma } from "@/lib/prisma";
import { notifyAppointmentConfirmed } from "../../../actions/whatsapp-actions";

export async function GET() {
  console.log("🟢 CRON ROUTE HIT: /api/cron/check-appointments");

  try {
    // ⏱️ Look back last 2 minutes
    const since = new Date(Date.now() - 2 * 60 * 1000);
    console.log("⏱️ Checking appointments since:", since.toISOString());

    const appointments = await prisma.app_invoice_1.findMany({
      where: {
        updatetime: {
          gte: since,
        },
      },
      select: {
        id: true,
        updatetime: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    console.log("🔵 Appointments found:", appointments);

    for (const appt of appointments) {
      console.log("🟠 Sending WhatsApp for appointment:", appt.id);
      await notifyAppointmentConfirmed(appt.id);
    }

    console.log("✅ Appointment cron completed");

    return Response.json({ success: true });
  } catch (error) {
    console.error("❌ Appointment cron error:", error);
    return Response.json({ success: false });
  }
}
