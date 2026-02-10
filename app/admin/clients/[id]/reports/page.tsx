"use client";
import { useParams } from "next/navigation";
import { ChevronLeft, FileText, Download, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function ClientReportsPage() {
  const { id } = useParams();

  // Mock data for minimalist reporting logic
  const stats = [
    { label: "Total Tasks", value: "1,284" },
    { label: "Success Rate", value: "99.2%" },
    { label: "Automation Time", value: "42h 12m" },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans antialiased w-full">
      <div className="max-w-full mx-auto px-6 md:px-12 py-10">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">
          <Link href="/admin/clients" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <ChevronLeft size={12} /> Clients
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-black">Analytics Report</span>
        </nav>

        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight bold">Performance Analytics</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Data Insights for Client ID: <span className="text-blue-600 font-bold">{id}</span>
            </p>
          </div>
          {/* Primary Blue Action Button from Reference */}
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-8 py-2.5 rounded shadow-lg shadow-blue-100 transition-all uppercase tracking-widest flex items-center gap-2">
            <Download size={14} /> Generate PDF
          </button>
        </header>

        {/* --- MINIMALIST STATS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="border border-slate-200 rounded-sm p-8 bg-slate-50/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 tracking-tighter">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* --- SYSTEM ACTIVITY OVERVIEW --- */}
        <section className="border border-slate-200 rounded-sm w-full p-10 bg-white">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 size={18} className="text-blue-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Weekly Automation Volume</h3>
          </div>
          
          {/* Simple Placeholder for Chart Logic */}
          <div className="h-48 w-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bold">Visualization Data Loading...</p>
          </div>
        </section>

        <footer className="mt-8 flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          <TrendingUp size={12} /> Reports generated based on legacy SQL sync data.
        </footer>
      </div>
    </main>
  );
}