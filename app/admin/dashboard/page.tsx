"use client";
import Link from "next/link";
import { ShieldCheck, Users, LayoutDashboard } from "lucide-react";

export default function SuperAdminDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
   

      {/* --- CONTENT AREA --- */}
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <header className="flex flex-col">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
            Dashboard
          </h1>
          <p className="text-slate-400 flex items-center gap-2 mt-1 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-500" /> 
            Super Admin Active
          </p>
        </header>

        {/* Minimal Content Card */}
        <section className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
          <div className="max-w-md">
            <h3 className="text-slate-900 font-bold text-xl bold">
              System Standing By.
            </h3>
            <p className="text-slate-500 text-sm mt-2 font-medium leading-relaxed">
              Your automation engine is running in the background. Use the navigation above to manage client databases or update system settings.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}