"use client";
import { Activity, Users } from "lucide-react";

export default function TeamDashboard() {
  return (
    // UPDATED: Changed bg-slate-950 to bg-slate-50 for a light, clean feel
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        {/* UPDATED: Border changed to slate-200 */}
        <header className="flex flex-col border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight italic text-blue-600 uppercase">
            Team Overview
          </h1>
          {/* UPDATED: Text color changed to slate-500 */}
          <p className="text-slate-500 flex items-center gap-2 mt-1 font-medium">
            <Activity size={16} className="text-emerald-500 animate-pulse" /> 
            Easy Team Session
          </p>
        </header>

        {/* Empty State Content */}
        {/* UPDATED: Container changed to white with slate-200 border */}
        <section className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center h-[400px] border-dashed shadow-sm">
          {/* UPDATED: Icon color changed to slate-200 */}
          <Users size={48} className="text-slate-200 mb-4" />
          
          {/* UPDATED: Text color changed to slate-600 */}
          <h3 className="text-slate-600 font-bold italic text-xl">
            Waiting for Activity
          </h3>
          
          {/* UPDATED: Text color changed to slate-400 */}
          <p className="text-slate-400 text-sm mt-2 max-w-xs font-medium">
            Navigate to the Clients section to register new gym members or view existing accounts.
          </p>
        </section>
        
      </div>
    </main>
  );
}