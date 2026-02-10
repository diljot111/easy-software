"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logoutUser() {
  const cookieStore = await cookies();
  
  // Clear the auth_role cookie we set during login
  cookieStore.delete("auth_role");
  
  // Redirect to the public login page
  redirect("/login");
}