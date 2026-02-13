"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// 1. GET ALL CLIENTS
export async function getAllClients() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { id: "desc" },
    });
    return { success: true, clients };
  } catch (error: any) {
    console.error("Fetch Clients Error:", error);
    return { success: false, error: "Failed to fetch clients." };
  }
}

// 2. SAVE CLIENT CONFIGURATION (Updated for Integer IDs)
export async function saveClientConfig(clientId: string | number, formData: FormData) {
  // Ensure ID is an integer
  const id = typeof clientId === "string" ? parseInt(clientId) : clientId;

  if (isNaN(id)) {
    return { success: false, error: "Invalid Client ID" };
  }

  // Extract Form Data
  const business_name = formData.get("business_name") as string | null;
  const business_type = formData.get("business_type") as string | null;
  
  const host = formData.get("host") as string | null;
  const dbName = formData.get("database") as string | null;
  const dbUser = formData.get("user") as string | null;
  const dbPassword = formData.get("password") as string | null;
  const port = formData.get("port") as string | null;
  
  const wabaId = formData.get("whatsapp_business_id") as string | null;
  const phoneId = formData.get("whatsapp_phone_id") as string | null;
  const metaToken = formData.get("whatsapp_token") as string | null;

  // Prepare Update Object
  const dataToUpdate: any = {};
  if (business_name) dataToUpdate.business_name = business_name;
  if (business_type) dataToUpdate.business_type = business_type;
  if (host) dataToUpdate.db_host = host;
  if (dbName) dataToUpdate.db_name = dbName;
  if (dbUser) dataToUpdate.db_user = dbUser;
  if (dbPassword) dataToUpdate.db_password = dbPassword;
  if (port) dataToUpdate.db_port = port;
  if (wabaId) dataToUpdate.waba_id = wabaId;
  if (phoneId) dataToUpdate.phone_number_id = phoneId;
  if (metaToken) dataToUpdate.meta_token = metaToken;

  try {
    await prisma.tenant.upsert({
      where: { id: id }, // ✅ Using Integer ID
      update: dataToUpdate,
      create: {
        id: id, // ✅ Force the specific Integer ID
        business_name: business_name || `Client_${id}`,
        business_type: business_type || "Salon",
        db_host: host || "localhost",
        db_name: dbName || "",
        db_user: dbUser || "",
        db_password: dbPassword || "",
        db_port: port || "3306",
        waba_id: wabaId || "",
        phone_number_id: phoneId || "",
        meta_token: metaToken || "",
      },
    });

    revalidatePath(`/admin/clients/${id}/settings`);
    return { success: true, message: "Configuration saved successfully." };
  } catch (error: any) {
    console.error("Save Config Error:", error);
    return { success: false, error: "Database error during save." };
  }
}

// 3. GET CLIENT CONFIG
export async function getClientConfig(clientId: string | number) {
  const id = typeof clientId === "string" ? parseInt(clientId) : clientId;
  
  if (isNaN(id)) return { success: false, error: "Invalid ID" };

  try {
    const config = await prisma.tenant.findUnique({ 
      where: { id: id } // ✅ Using Integer ID
    });
    
    if (!config) return { success: false, error: "Configuration not found" };
    
    return { success: true, config };
  } catch (error) {
    console.error("Get Config Error:", error);
    return { success: false, error: "Could not retrieve settings." };
  }
}

// 4. CREATE CLIENT
export async function createClient(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) return { success: false, error: "Missing required fields." };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { success: false, error: "User already exists." };

    const hashedPassword = await bcrypt.hash(password, 10);

    // Transaction to create both Client entry and User login
    await prisma.$transaction(async (tx) => {
      // 1. Create Legacy Client Record
      await tx.client.create({
        data: { 
          name, 
          email, 
          cont: phone, 
          active: 1, 
          branch_id: 1, 
          doj: new Date() 
        },
      });

      // 2. Create User Login (Linked to Default Tenant ID 1)
      await tx.user.create({
        data: { 
          name, 
          email, 
          password: hashedPassword, 
          phone: phone, 
          role: "CUSTOMER", 
          tenant_id: 1 // ✅ Changed from "default-tenant" to 1 (Integer)
        },
      });
    });

    revalidatePath("/admin/clients");
    return { success: true, message: "Client created successfully." };
  } catch (error: any) {
    console.error("Create Client Error:", error);
    return { success: false, error: "Creation failed: " + error.message };
  }
}