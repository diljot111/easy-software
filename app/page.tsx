// app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  // This triggers an immediate server-side redirect
  redirect("/login");

  // This part will never be reached, but needed for TS
  return null;
}