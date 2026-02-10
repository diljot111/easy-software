"use client";
import { Activity, ShieldCheck } from "lucide-react";

export default function SuperAdminDashboard() {
  return (
    // Changed bg-slate-950 to bg-slate-50 for a clean light background
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header: Border changed to slate-200 */}
        <header className="flex flex-col border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight italic text-blue-600 uppercase">
            System Overview
          </h1>
          {/* Text changed to slate-500 for better contrast on white */}
          <p className="text-slate-500 flex items-center gap-2 mt-1 font-medium">
            <ShieldCheck size={16} className="text-emerald-500" /> 
            Super Admin Control Panel
          </p>
        </header>

        {/* Empty State: Changed to white with slate-200 dashed border */}
        <section className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center h-[400px] border-dashed shadow-sm">
          {/* Icon color adjusted to light slate-200 */}
          <Activity size={48} className="text-slate-200 mb-4 animate-pulse" />
          
          <h3 className="text-slate-600 font-bold italic text-xl">
            Dashboard Idle
          </h3>
          
          <p className="text-slate-400 text-sm mt-2 max-w-xs font-medium">
            Use the Smart Navbar above to manage your Employees or Clients.
          </p>
        </section>
        
      </div>
    </main>
  );
}