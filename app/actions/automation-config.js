"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveAutomationAction(formData) {
  const eventType = formData.get("eventType");
  const templateName = formData.get("templateName");
  const delayValue = parseInt(formData.get("delayValue"));
  const delayUnit = formData.get("delayUnit");

  // Save the configuration to the database
  await prisma.automationConfig.create({
    data: {
      eventType,
      templateName,
      delayValue,
      delayUnit,
      isActive: true,
    }
  });

  revalidatePath("/admin/automation"); // Refresh the list page
}