"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Save, Zap, Sparkles, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
// Ensure this path matches your project structure
import { saveAutomationAction } from "@/app/actions/automation-logic"; 
import { getClientConfig } from "@/app/actions/client"; 

export default function NewAutomationPage() {
  const params = useParams();
  // Safe ID extraction (handles array or string)
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  
  const [templates, setTemplates] = useState<{ name: string; status: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Fetch live Meta templates based on stored tenant credentials 
  useEffect(() => {
    async function loadData() {
      if (!id) return;
      
      try {
        const configRes = await getClientConfig(id);
        if (!configRes.success || !configRes.config) {
          toast.error("Please configure WhatsApp settings first.");
          return;
        }

        // 🔹 Access snake_case config fields
        const { waba_id, meta_token } = configRes.config as any;
        const cleanToken = meta_token?.trim().replace(/[\n\r]/g, "");

        if (!waba_id || !cleanToken) {
          toast.error("Missing WABA ID or Token in Settings.");
          return;
        }

        const metaRes = await fetch(
          `https://graph.facebook.com/v18.0/${waba_id}/message_templates?limit=500`, 
          { headers: { Authorization: `Bearer ${cleanToken}` } }
        );
        
        const metaData = await metaRes.json();
        if (metaData.error) throw new Error(metaData.error.message);

        const approved = metaData.data?.filter((t: any) => t.status === "APPROVED") || [];
        setTemplates(approved);

      } catch (err: any) {
        console.error("Template Error:", err);
        toast.error(`Meta Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // 2. 🔍 Dynamic Search Filter logic
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  // 3. Handle form submission
  async function handleSubmit(formData: FormData) {
    if (!id) return;
    setSaving(true);

    const result = await saveAutomationAction(id, formData);
    setSaving(false);

    if (result && 'error' in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Automation Rule Activated!");
      router.push(`/admin/clients/${id}/automation`);
      router.refresh();
    }
  }

  const salonEvents = [
    "New appointment", 
    "Appointment re-schedule", 
    "Appointment cancel",
    "Appointment reminder before 30 mins of appopintment", // Typo matches backend logic
    "New bill",
    "Reward points granted / earned", 
    "membership buy",
    "Feedback after 2 mins of new bill generation", 
    "Service reminder"
  ];

  if (!id) return <div className="p-10 text-center">Loading System ID...</div>;

  return (
    <main className="min-h-screen bg-[#F9FAFB] text-slate-900 font-sans antialiased selection:bg-blue-100">
      <Toaster richColors position="top-center" />
      
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link 
          href={`/admin/clients/${id}/automation`} 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-all mb-12 uppercase tracking-widest group"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Workflows
        </Link>

        <form action={handleSubmit}>
          <header className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                Rule <span className="text-blue-600">Builder</span>
              </h1>
              <p className="text-sm text-slate-500 mt-2 flex items-center gap-2 font-semibold">
                <Zap size={14} className="text-blue-500 fill-blue-500" /> System Agent ID: {id}
              </p>
            </div>
            
            <button 
              type="submit" 
              disabled={saving || loading}
              className="bg-slate-900 hover:bg-blue-600 text-white px-10 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl hover:shadow-blue-200 flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Deploying..." : "Deploy Rule"}
            </button>
          </header>

          <div className="bg-white border border-slate-200 rounded-[32px] p-10 md:p-20 shadow-sm relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none">
              <Sparkles size={400} />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col space-y-12">
                
                {/* Step 1: Trigger Selection */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block">Step 1: Define Trigger</label>
                  <div className="flex items-center gap-4 text-2xl font-semibold">
                    <span className="text-slate-300">When</span>
                    <select 
                      name="eventType" 
                      required 
                      defaultValue="" 
                      className="bg-slate-50 border-2 border-transparent hover:border-blue-100 focus:border-blue-500 text-blue-600 px-4 py-2 rounded-2xl outline-none cursor-pointer transition-all appearance-none min-w-[300px]"
                    >
                      <option value="" disabled>Select System Event</option>
                      {salonEvents.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <span className="text-slate-300">occurs,</span>
                  </div>
                </div>

                {/* Step 2: Action Assignment + SEARCH BAR 🔍 */}
                <div className="space-y-6">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block">Step 2: Assign Action</label>
                  
                  {/* Search Input Box */}
                  <div className="relative max-w-[400px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search for a template..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      // 🛑 Prevent Form Submission on Enter
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none text-sm font-bold transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-4 text-2xl font-semibold">
                    <span className="text-slate-300">then send the</span>
                    <div className="relative inline-block">
                      <select 
                        name="templateName" 
                        required 
                        defaultValue="" 
                        className="bg-slate-50 border-2 border-transparent hover:border-blue-100 focus:border-blue-500 text-blue-600 px-4 py-2 rounded-2xl outline-none cursor-pointer transition-all appearance-none min-w-[300px] truncate"
                      >
                        <option value="" disabled>
                          {loading ? "Syncing Meta API..." : searchTerm ? `Found (${filteredTemplates.length})` : "Choose WhatsApp Template"}
                        </option>
                        {filteredTemplates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                      {loading && <Loader2 size={18} className="absolute right-4 top-4 animate-spin text-blue-400" />}
                    </div>
                  </div>
                </div>

                {/* Step 3: Timing Logic */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block">Step 3: Timing Logic</label>
                  <div className="flex items-center gap-4 text-2xl font-semibold">
                    <span className="text-slate-300">wait for</span>
                    <div className="flex items-center gap-2 bg-slate-50 border-2 border-transparent hover:border-blue-100 focus-within:border-blue-500 px-4 py-2 rounded-2xl transition-all">
                      <input 
                        name="delayValue" 
                        type="number" 
                        defaultValue="0" 
                        min="0"
                        className="w-16 bg-transparent text-center text-blue-600 outline-none font-bold" 
                      />
                      <select 
                        name="delayUnit" 
                        defaultValue="Minutes"
                        className="bg-transparent text-lg font-bold text-slate-400 outline-none cursor-pointer"
                      >
                        <option value="Minutes">Minutes</option>
                        <option value="Hours">Hours</option>
                        <option value="Days">Days</option>
                      </select>
                    </div>
                    <span className="text-slate-300">before delivery.</span>
                  </div>
                </div>

              </div>
              
              {/* Footer Information */}
              <div className="mt-20 pt-10 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 bg-blue-50 flex items-center justify-center rounded-xl text-blue-600 font-bold text-xs shadow-sm">01</div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Dynamic Mapping</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">The engine automatically links customer names and phone numbers from your legacy SQL database for personalized delivery.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 bg-emerald-50 flex items-center justify-center rounded-xl text-emerald-600 font-bold text-xs shadow-sm">02</div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Deduplication</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">Every event is logged in the system to ensure customers never receive duplicate messages for the same transaction.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}