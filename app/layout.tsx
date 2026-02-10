import { cookies } from "next/headers";
import Navbar from "@/components/Navbar";
import "./globals.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("auth_role")?.value || "";

  return (
    <html lang="en">
      <body className="bg-slate-950 antialiased">
        {/* Only show Navbar if a role exists (User is logged in) */}
        {role && <Navbar role={role} />}
        {children}
      </body>
    </html>
  );
}