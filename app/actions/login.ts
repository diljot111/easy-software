"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function loginUser(formData: FormData) {
  // 1. Safe Retrieval: Fallback to empty string to prevent '.trim()' on null
  const emailInput = formData.get("email") as string | null;
  const passwordInput = formData.get("password") as string | null;

  // 2. Immediate Validation
  if (!emailInput || !passwordInput) {
    return { success: false, error: "Please provide both email and password." };
  }

  const email = emailInput.trim();
  const password = passwordInput;

  console.log("--- EASY-AUTOMATIONS Auth Started ---");
  console.log("Authenticating:", email);

  try {
    // 3. Database Lookup (Matches your schema.prisma 'User' model)
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      console.log("Auth Result: Identity not found.");
      return { success: false, error: "Invalid credentials." };
    }

    // 4. Secure Password Verification
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Auth Result: Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      return { success: false, error: "Invalid credentials." };
    }

    // 5. Establish Session
    const cookieStore = await cookies();
    cookieStore.set("userId", user.id, { 
      httpOnly: true, 
      secure: process.env.NODE_SET === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 // 24 Hours
    });
    
    cookieStore.set("userRole", user.role, { 
      httpOnly: true, 
      secure: process.env.NODE_SET === "production" 
    });

    // 6. Define Redirect Path based on Role
    // Using EASY_TEAM or ADMIN based on your specific requirements
    const path = (user.role === "ADMIN" || user.role === "EASY_TEAM") 
      ? "/admin/dashboard" 
      : "/dashboard";

    console.log("--- Auth Successful: Redirecting to", path, "---");
    
    return { 
      success: true, 
      role: user.role, 
      path: path 
    };
    
  } catch (error) {
    console.error("CRITICAL AUTH ERROR:", error);
    return { success: false, error: "The authentication server is currently unresponsive." };
  }
}