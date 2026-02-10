import { prisma } from "@/lib/prisma";
import { notifyBillingGenerated } from "../../../actions/whatsapp-actions";

export async function GET() {
  console.log("🟢 CRON ROUTE HIT: /api/cron/check-bills");

  try {
    // ⏱️ Look back 2 minutes
    const since = new Date(Date.now() - 2 * 60 * 1000);

    console.log("⏱️ Checking bills since:", since.toISOString());

    const bills = await prisma.invoice_1.findMany({
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

    console.log("🔵 Bills found:", bills);

    for (const bill of bills) {
      console.log("🟠 Triggering WhatsApp for bill:", bill.id);
      await notifyBillingGenerated(bill.id);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("❌ Bill cron error:", error);
    return Response.json({ success: false });
  }
}
