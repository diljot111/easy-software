import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function GET() {
  const tasks = await prisma.automationQueue.findMany({
    where: { processed: false, scheduledFor: { lte: new Date() } }
  });

  for (const task of tasks) {
    const { phone, name } = task.payload;
    await sendWhatsApp(phone, task.templateName, [
      { type: "body", parameters: [{ type: "text", text: name }] }
    ]);
    
    await prisma.automationQueue.update({
      where: { id: task.id },
      data: { processed: true }
    });
  }
  return Response.json({ status: "Queue processed" });
}