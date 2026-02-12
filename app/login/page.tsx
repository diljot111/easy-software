"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "../actions/login"; 
import { Lock, User, Terminal, Loader2, ShieldCheck } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    // DEBUG: Check what is actually being sent
    console.log("Submitting:", Object.fromEntries(formData));

    try {
      const result = await loginUser(formData);

      if (result.success) {
        toast.success("Login successful");
        // Redirect to the path returned by the server, or default to admin
        router.replace(result.path || "/admin/clients"); 
        return;
      }

      toast.error(result.error || "Invalid credentials");
    } catch (err) {
      console.error(err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <Toaster richColors position="top-center" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Terminal className="text-white" size={28} />
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase">
            Easy Automations
          </h1>
          <p className="text-slate-400 text-[11px] mt-1 font-bold uppercase tracking-widest">
            Security Gateway
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">
              Username or Email
            </label>
            <div className="relative">
              {/* Changed Icon to User since it might not be an email */}
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              
              {/* 🔹 FIX: Changed type="email" to type="text" */}
              <input
                name="email" 
                required
                type="text" 
                placeholder="admin" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 focus:ring-2 ring-blue-600 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                name="password"
                required
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-900 focus:ring-2 ring-blue-600 outline-none transition-all"
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all flex justify-center items-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "SIGN IN"}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-50">
          <p className="text-[9px] text-slate-300 text-center uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2">
            <ShieldCheck size={12} className="text-emerald-500" />
            Verified System Access Only
          </p>
        </div>
      </div>
    </main>
  );
}