"use server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

// Event: New Bill + 2-Min Feedback
export async function handleNewBill(customerId, amount) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  
  // 1. Create the Bill
  const bill = await prisma.bill.create({ data: { customerId, totalAmount: amount } });

  // 2. Immediate: Send 'payment_successful'
  await sendWhatsApp(customer.phone, "payment_successful", [
    { type: "body", parameters: [{ type: "text", text: customer.name }, { type: "text", text: amount.toString() }] }
  ]);

  // 3. Queue Delayed: 'feedback_survey_1' (2 min delay)
  await prisma.automationQueue.create({
    data: {
      eventType: "FEEDBACK",
      templateName: "feedback_survey_1",
      payload: { phone: customer.phone, name: customer.name },
      scheduledFor: new Date(Date.now() + 2 * 60000),
    }
  });
}

// Event: Reward Points Earned
export async function handlePointsUpdate(customerId, points) {
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: { increment: points } }
  });

  // Use 'welcomeeasy' to show balance
  await sendWhatsApp(customer.phone, "welcomeeasy", [
    { type: "body", parameters: [{ type: "text", text: customer.loyaltyPoints.toString() }] }
  ]);
}