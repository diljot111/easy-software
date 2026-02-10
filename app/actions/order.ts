"use server";

import { prisma } from "@/lib/prisma";

export async function getAppointmentsAndBills() {
  try {
    // 1️⃣ Fetch appointments
    const appointmentsRaw = await prisma.app_invoice_1.findMany({
      select: {
        id: true,
        inv: true,
        client: true,
        status: true,
        details: true,
        appdate: true,
      },
      orderBy: { id: "desc" },
      take: 15,
    });

    // 2️⃣ Fetch bills
    const billsRaw = await prisma.invoice_1.findMany({
      select: {
        id: true,
        inv: true,
        client: true,
        total: true,
        due: true,
        status: true,
      },
      orderBy: { id: "desc" },
      take: 15,
    });

    // 3️⃣ Collect client IDs
    const clientIds = Array.from(
      new Set([
        ...appointmentsRaw.map(a => a.client),
        ...billsRaw.map(b => b.client),
      ])
    );

    // 4️⃣ Fetch clients
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: {
        id: true,
        name: true,
        cont: true,
      },
    });

    const clientMap = Object.fromEntries(
      clients.map(c => [c.id, c])
    );

    // 5️⃣ Attach client info
    const appointments = appointmentsRaw.map(a => ({
      ...a,
      clientInfo: clientMap[a.client] || null,
    }));

    const bills = billsRaw.map(b => ({
      ...b,
      clientInfo: clientMap[b.client] || null,
    }));

    return {
      success: true,
      appointments,
      bills,
    };
  } catch (error) {
    console.error("❌ Orders fetch error:", error);
    return {
      success: false,
      error: "Failed to fetch appointments & bills",
    };
  }
}
