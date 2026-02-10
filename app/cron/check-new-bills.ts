"use server";

import { prisma } from "@/lib/prisma";
import { notifyBillingGenerated } from "@/app/actions/whatsapp-actions";

let lastSeenBillId = 0; // 🔥 IN-MEMORY ONLY (TEMP)

export async function checkNewBills() {
  console.log("🔵 checkNewBills() START");

  try {
    const bills = await prisma.invoice_1.findMany({
      orderBy: { id: "desc" },
      take: 5,
      select: { id: true },
    });

    console.log("🔵 Bills fetched:", bills);

    for (const bill of bills) {
      console.log("🟡 Inspecting bill:", bill.id);

      // TEMP dedupe (memory only)
      if (bill.id <= lastSeenBillId) {
        console.log("⏭️ Skipping old bill:", bill.id);
        continue;
      }

      console.log("🟠 NEW BILL DETECTED:", bill.id);

      lastSeenBillId = bill.id;

      const result = await notifyBillingGenerated(bill.id);

      console.log("🟣 WhatsApp result:", result);
    }

    return { success: true };
  } catch (error) {
    console.error("❌ checkNewBills ERROR:", error);
    return { success: false };
  }
}
