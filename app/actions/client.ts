"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAllClients() {
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        cont: true,
        email: true,
        active: true,
        branch_id: true,
        doj: true,
      },
      orderBy: { doj: "desc" },
    });
    return { success: true, clients };
  } catch (error) {
    console.error("❌ getAllClients error:", error);
    return { success: false, error: "Failed to fetch client records." };
  }
}

/**
 * Optimized Save Action: Filters out null/empty values to prevent Prisma Validation Errors.
 */
export async function saveClientConfig(clientId: string, formData: FormData) {
  const host = formData.get("host") as string | null;
  const dbName = formData.get("database") as string | null;
  const dbUser = formData.get("user") as string | null;
  const dbPassword = formData.get("password") as string | null;
  const port = formData.get("port") as string | null;
  const website = formData.get("website") as string | null;
  
  // WhatsApp Fields
  const wabaId = formData.get("whatsapp_business_id") as string | null;
  const phoneId = formData.get("whatsapp_phone_id") as string | null;
  const metaToken = formData.get("whatsapp_token") as string | null;

  // Create a clean object with only non-empty values
  const dataToUpdate: any = {};
  if (host) dataToUpdate.dbHost = host;
  if (dbName) dataToUpdate.dbName = dbName;
  if (dbUser) dataToUpdate.dbUser = dbUser;
  if (dbPassword) dataToUpdate.dbPassword = dbPassword;
  if (port) dataToUpdate.dbPort = port;
  if (website) dataToUpdate.websiteUrl = website;
  if (wabaId) dataToUpdate.wabaId = wabaId;
  if (phoneId) dataToUpdate.phoneNumberId = phoneId;
  debugger;
  if (metaToken) dataToUpdate.metaToken = metaToken;

  try {
    await prisma.tenant.upsert({
      where: { id: clientId },
      update: dataToUpdate,
      create: {
        id: clientId,
        businessName: `Client_${clientId}`,
        // Required fallback values for first-time creation
        dbHost: host || "localhost",
        dbName: dbName || "",
        dbUser: dbUser || "",
        dbPassword: dbPassword || "",
        dbPort: port || "3306",
        wabaId: wabaId || "",
        phoneNumberId: phoneId || "",
        metaToken: metaToken || "",
      },
    });

    revalidatePath(`/admin/clients/${clientId}/settings`);
    return { success: true, message: "Configuration successfully synchronized." };
  } catch (error: any) {
    console.error("❌ saveClientConfig error:", error);
    return { success: false, error: "Database mapping error. Ensure required fields exist in schema." };
  }
}

export async function getClientConfig(clientId: string) {
  try {
    const config = await prisma.tenant.findUnique({
      where: { id: clientId },
    });
    return { success: true, config };
  } catch (error) {
    return { success: false, error: "Could not retrieve saved settings." };
  }
}

export async function createClient(formData: FormData) {
  const name = formData.get("name") as string | null;
  const email = formData.get("email") as string | null;
  const phone = formData.get("phone") as string | null;

  if (!name || !email || !phone) {
    return { success: false, error: "Name, Email, and Phone are required." };
  }

  try {
    await prisma.client.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        cont: phone.trim(),
        active: 1,
        branch_id: 1,
        doj: new Date(),
      },
    });

    revalidatePath("/admin/clients");
    return { success: true, message: "Client onboarded successfully." };
  } catch (error) {
    console.error("❌ createClient error:", error);
    return { success: false, error: "Database error: Could not save client." };
  }
}