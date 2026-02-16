"use client";

import { useState } from "react";
import { useParams } from "next/navigation"; 
import { 
  Play, Settings, Zap, History, 
  Plus, Bot, Terminal, Loader2 
} from "lucide-react";
import { toast, Toaster } from "sonner";

// ✅ Import the engine
import { processTenantAutomation } from "@/app/actions/automation-engine"; 

export default function SetAutomation() {
  const params = useParams(); // Get params object
  const id = params?.id; // Safely access ID
  
  const [isDeploying, setIsDeploying] = useState(false);

  const startAutomation = async () => {
    // 1. Validation: Ensure ID exists
    if (!id) {
      toast.error("System Error: No Tenant ID found in URL.");
      return;
    }

    setIsDeploying(true);
    const toastId = toast.loading("Initializing automation sequence...");

    try {
      // 2. Conversion: Convert String ID to Number for the backend
      const tenantId = Number(id);
      
      if (isNaN(tenantId)) {
        throw new Error("Invalid Tenant ID format");
      }

      // 🚀 CALL REAL BACKEND LOGIC
      const result = await processTenantAutomation(tenantId);

      if (result.success) {
        toast.success("Automation sequence completed successfully!", { id: toastId });
      } else {
        toast.error(`Automation Failed: ${result.error}`, { id: toastId });
      }
    } catch (error: any) {
      console.error(error);
      toast.error(`Critical Error: ${error.message}`, { id: toastId });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <Toaster richColors position="top-center" />
      
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex justify-between items-end border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 uppercase tracking-tighter">Set Automation</h1>
            <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">
              <Bot size={16} className="text-blue-500" /> Configure and deploy global automation agents.
            </p>
          </div>
          <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all">
            <Plus size={16} /> New Workflow
          </button>
        </header>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Start Card */}
          <div className="md:col-span-2 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-3 rounded-2xl text-white">
                  <Zap size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Main Automation Agent</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Node.js / MySQL Stack</p>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-100">
                Ready
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                This agent monitors your connected SQL databases and triggers automated WhatsApp notifications based on predefined table changes.
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={startAutomation}
                disabled={isDeploying}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDeploying ? <Loader2 className="animate-spin" /> : <Play size={18} />}
                {isDeploying ? "PROCESSING..." : "RUN AUTOMATION"}
              </button>
              <button className="px-6 py-4 border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                <Settings size={20} />
              </button>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Live Logs</p>
              <div className="space-y-3">
                <LogItem text="Watcher initialized" time="Now" />
                <LogItem text="SQL Connection Stable" time="-2m" />
                <LogItem text="System Ready" time="-5m" />
              </div>
            </div>
            
            <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <Terminal size={14} className="text-blue-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Environment</p>
              </div>
              <p className="text-xs font-mono text-blue-200">Production v3.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function LogItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex justify-between items-center text-[11px] font-medium border-b border-slate-50 pb-2 last:border-0">
      <span className="text-slate-600">{text}</span>
      <span className="text-slate-300 font-mono">{time}</span>
    </div>
  );
}