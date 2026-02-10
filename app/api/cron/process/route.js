import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function GET(req) {
  // Security check: Only allow authorized cron services (e.g., Vercel/Upstash)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Find all PENDING tasks that are due now or overdue
    const pendingTasks = await prisma.automationQueue.findMany({
      where: {
        processed: false,
        scheduledFor: { lte: new Date() }
      }
    });

    console.log(`[Queue] Processing ${pendingTasks.length} tasks...`);

    for (const task of pendingTasks) {
      // 2. Dispatch the WhatsApp Template
      const result = await sendWhatsApp(
        task.payload.phone, 
        task.templateName, 
        task.payload.components
      );

      // 3. Log the result and mark as processed
      await prisma.automationQueue.update({
        where: { id: task.id },
        data: { 
          processed: true,
          status: result.success ? "DELIVERED" : "ERROR" 
        }
      });
    }

    return Response.json({ success: true, processed: pendingTasks.length });
  } catch (error) {
    console.error("[Queue Error]", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}