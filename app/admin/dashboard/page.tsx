"use client";
import Link from "next/link";
import { ShieldCheck, Users, LayoutDashboard } from "lucide-react";

export default function SuperAdminDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* --- MINIMALIST NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={20} className="text-blue-600" />
            <span className="font-bold tracking-tighter uppercase text-slate-900">
              EasyK <span className="text-blue-600">Admin</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* NAVIGATION OPTION */}
            <Link 
              href="/admin/clients" 
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
            >
              <Users size={18} />
              Clients
            </Link>
          </div>
        </div>
      </nav>

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