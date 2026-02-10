"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";
// 🔹 IMPORT DELETE ACTION HERE
import { 
  getClientAutomations, 
  triggerAutomationManual, 
  deleteAutomationAction 
} from "../../../../actions/automation-logic";

export default function ClientAutomationList() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [automations, setAutomations] = useState<any[]>([]);

  // 1. Fetch real workflows
  async function loadAutomations() {
    setLoading(true);
    const data = await getClientAutomations(id as string);
    // 🔹 Ensure we are setting an array, even if fetch fails
    setAutomations(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadAutomations();
  }, [id]);

  // 2. RUN NOW Handler
  const handleRunNow = async (configId: string, eventName: string) => {
    setExecutingId(configId);
    try {
      const result = await triggerAutomationManual(configId);
      if (result.success) {
        toast.success(`Triggered: ${eventName}`);
      } else {
        toast.error(`Failed: ${result.error}`);
      }
    } catch (err) {
      toast.error("System error during trigger.");
    }
    setExecutingId(null);
  };

  // 3. 🔹 DELETE Handler (New)
  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;

    // Optimistic Update: Remove from UI immediately
    setAutomations((prev) => prev.filter((a) => a.id !== ruleId));
    toast.info("Deleting automation...");

    const result = await deleteAutomationAction(ruleId, id as string);

    if (result.success) {
      toast.success("Automation deleted successfully.");
    } else {
      // Revert if failed
      toast.error("Failed to delete.");
      loadAutomations(); 
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans antialiased w-full">
      <Toaster position="top-right" />
      
      <div className="w-full px-8 py-10">
        <header className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight bold">Client Automations</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium text-blue-600 uppercase tracking-widest">
              System ID: <span className="font-bold">{id}</span>
            </p>
          </div>

          <Link href={`/admin/clients/${id}/automation/new`}>
            <button className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-8 py-2.5 rounded shadow-lg shadow-red-100 transition-all uppercase tracking-widest flex items-center gap-2">
              <Plus size={14} /> Add Automation
            </button>
          </Link>
        </header>

        {/* --- DYNAMIC DATA TABLE --- */}
        <div className="border border-slate-200 rounded-sm w-full overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black">
              <tr>
                <th className="px-6 py-4">Trigger Event</th>
                <th className="px-6 py-4">WhatsApp Template</th>
                <th className="px-6 py-4">Configured Delay</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-slate-200" size={24} />
                  </td>
                </tr>
              ) : automations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-bold bold">
                    No active salon automations found.
                  </td>
                </tr>
              ) : (
                automations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 uppercase tracking-tight">
                      {item.eventType}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono">
                      {item.templateName}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium bold">
                      {item.delayValue} {item.delayUnit}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        disabled={executingId === item.id}
                        onClick={() => handleRunNow(item.id, item.eventType)}
                        className="inline-block bg-blue-600 text-white text-[10px] font-bold px-4 py-2 rounded hover:bg-blue-700 transition-all uppercase tracking-tight disabled:opacity-50"
                      >
                        {executingId === item.id ? "Working..." : "Run Now"}
                      </button>
                      
                      {/* 🔹 FIXED DELETE BUTTON */}
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="inline-block bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 p-2 rounded transition-colors"
                        title="Delete Rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}