"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Retrieves the ID of the logged-in user from cookies.
 * MySQL expects an Integer for the ID field.
 */
async function getActiveUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_id")?.value;
  
  // Convert the string ID from the cookie back to a Number for MySQL
  const parsedId = userId ? parseInt(userId) : null;
  return isNaN(parsedId as number) ? null : parsedId; 
}

export async function createEasyTeamMember(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  
  const creatorId = await getActiveUserId();

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "EASY_TEAM",
        // If no creatorId is found, MySQL may fail if this field is required
        created_by_id: creatorId, 
      },
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/employees");
    return { success: true, message: "Team member created successfully!" };
  } catch (error: any) {
    console.error("MySQL Create Error:", error);
    if (error.code === 'P2002') return { success: false, error: "Email or Phone already exists." };
    if (error.code === 'P2003') return { success: false, error: "Invalid Creator ID (Session Error)." };
    return { success: false, error: "Database error. Check server logs." };
  }
}

export async function createCustomer(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  
  const creatorId = await getActiveUserId();

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "CUSTOMER",
        created_by_id: creatorId,
      },
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/clients");
    revalidatePath("/team/clients");
    return { success: true, message: "Customer registered successfully!" };
  } catch (error: any) {
    console.error("MySQL Customer Error:", error);
    if (error.code === 'P2002') return { success: false, error: "Customer already exists." };
    return { success: false, error: "Failed to create customer record." };
  }
}

export async function getAllUsers() {
  try {
    const members = await prisma.user.findMany({
      where: { role: { in: ["EASY_TEAM", "CUSTOMER"] } },
      include: {
        created_by: { 
          select: { name: true, role: true }
        }
      },
      orderBy: { created_at: "desc" },
    });
    // Ensure IDs are returned as numbers for the frontend logic
    return { success: true, members };
  } catch (error) {
    console.error("Fetch Error:", error);
    return { success: false, error: "Failed to fetch directory." };
  }
}