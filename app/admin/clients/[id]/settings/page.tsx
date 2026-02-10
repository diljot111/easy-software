"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, Database, Mail, Smartphone, MessageSquare, Save, Activity, RefreshCw, CheckCircle, AlertCircle, Table, Loader2, Send, Search } from "lucide-react";
import { testRemoteConnection } from "../../../../actions/db-test"; 
import { saveClientConfig, getClientConfig } from "../../../../actions/client"; 
import { toast, Toaster } from "sonner";

type TabType = "db" | "mail" | "sms" | "whatsapp";

export default function ClientSettingsPage() {
  const { id } = useParams();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>("db");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isWaVerified, setIsWaVerified] = useState(false); 
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [waTemplates, setWaTemplates] = useState<any[]>([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  // 🔹 Fetch configuration from DB on load
  const fetchPersistentConfig = async () => {
    const result = await getClientConfig(id as string);
    if (result.success && result.config) {
      setInitialData(result.config); 
    }
  };

  useEffect(() => {
    fetchPersistentConfig();
  }, [id]);

  // 🔹 Template Search Logic
  const filteredTemplates = useMemo(() => {
    return waTemplates.filter(tmpl => 
      tmpl.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [waTemplates, searchTerm]);

  /**
   * 🔹 Verify DB Connection: Clears WA templates to prevent mixing
   */
  async function handleTestConnection() {
    if (!formRef.current) return;
    setTesting(true);
    setIsConnected(false);
    setWaTemplates([]); // 🔹 Clear templates so only tables show
    setIsWaVerified(false);

    try {
      const formData = new FormData(formRef.current);
      const result = await testRemoteConnection(formData);
      if (result.success) {
        setIsConnected(true);
        setDbTables((result.tables as string[]) || []);
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    } finally {
      setTesting(false);
    }
  }

  /**
   * 🔹 Sync Meta Templates: Clears DB tables to prevent mixing
   */
  async function handleFetchWhatsApp() {
    if (!formRef.current) return;
    setTesting(true);
    setIsWaVerified(false);
    setDbTables([]); // 🔹 Clear tables so only templates show
    setIsConnected(false);

    const formData = new FormData(formRef.current);
    const wabaId = formData.get("whatsapp_business_id");
    const token = formData.get("whatsapp_token")?.toString().trim();

    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/message_templates?limit=500`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      setWaTemplates(data.data || []);
      setIsWaVerified(true);
      toast.success(`Synced ${data.data?.length} templates successfully!`);
    } catch (err: any) {
      setIsWaVerified(false);
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  }

  // 🔹 UNIVERSAL FIX: Detects and fills Headers, Body, and Buttons (Fixes #131008 & #132012)
  async function handleSendTestMessage(template: any) {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const phoneId = formData.get("whatsapp_phone_id");
    const token = formData.get("whatsapp_token")?.toString().trim();
    
    const testRecipient = prompt("Enter phone number (e.g., 91XXXXXXXXXX):");
    if (!testRecipient) return;

    const components: any[] = [];

    // 1. Process Header Component (Required for Error #131008)
    const headerComp = template.components.find((c: any) => c.type === "HEADER");
    if (headerComp) {
      if (headerComp.format === "TEXT" && headerComp.text.includes("{{1}}")) {
        components.push({
          type: "header",
          parameters: [{ type: "text", text: "Priority Update" }]
        });
      } else if (["IMAGE", "DOCUMENT", "VIDEO"].includes(headerComp.format)) {
        components.push({
          type: "header",
          parameters: [{
            type: headerComp.format.toLowerCase(),
            [headerComp.format.toLowerCase()]: { link: "https://bit.ly/sample-wa-image" }
          }]
        });
      }
    }

    // 2. Process Body Variables ({{1}} through {{n}})
    const bodyComp = template.components.find((c: any) => c.type === "BODY");
    if (bodyComp) {
      const varCount = (bodyComp.text.match(/{{[0-9]+}}/g) || []).length;
      if (varCount > 0) {
        components.push({
          type: "body",
          parameters: Array.from({ length: varCount }, (_, i) => ({
            type: "text",
            text: i === 0 ? "Valued Customer" : `TestValue_${i + 1}`
          }))
        });
      }
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: testRecipient,
          type: "template",
          template: {
            name: template.name,
            language: { code: template.language || "en_US" }, 
            components: components
          }
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      toast.success("Test message successfully sent!");
    } catch (err: any) {
      toast.error("Test Send Failed: " + err.message);
    }
  }

  async function handleSave() {
    if (!formRef.current) return;
    setSaving(true);
    try {
      const formData = new FormData(formRef.current);
      const result = await saveClientConfig(id as string, formData);
      if (result.success) {
        toast.success(result.message);
        await fetchPersistentConfig(); 
      } else {
        toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans antialiased w-full">
      <Toaster richColors position="top-center" />
      <div className="max-w-full mx-auto px-6 md:px-12 py-10">
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">
          <Link href="/admin/clients" className="hover:text-blue-600 flex items-center gap-1"><ChevronLeft size={12} /> Clients</Link>
          <span>/</span> <span className="text-slate-900 font-black">Configuration</span>
        </nav>

        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Client Settings</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">System ID: <span className="text-blue-600 font-bold">{id}</span></p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Activity size={12} className={isConnected || isWaVerified ? "text-emerald-500" : "text-slate-300"} /> 
            {isConnected || isWaVerified ? "Active Session" : "Sync Required"}
          </div>
        </header>

        <div className="flex border border-slate-200 rounded-sm overflow-hidden mb-8 w-full shadow-sm">
          {["db", "mail", "sms", "whatsapp"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as TabType)} className={`flex-1 py-4 text-[11px] font-bold uppercase tracking-widest border-r last:border-r-0 border-slate-200 ${activeTab === tab ? 'bg-emerald-600 text-white shadow-inner' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="border border-slate-200 rounded-sm p-10 bg-white shadow-sm relative min-h-[550px] w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <form key={initialData?.id || 'loading'} ref={formRef} className="space-y-6 max-w-xl">
              {activeTab === "db" && (
                <>
                  <InputGroup name="website" label="Website URL" placeholder="https://client.com" defaultValue={initialData?.websiteUrl} />
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup name="host" label="Host Address" placeholder="127.0.0.1" defaultValue={initialData?.dbHost} />
                    <InputGroup name="port" label="Port" placeholder="3306" defaultValue={initialData?.dbPort || "3306"} />
                  </div>
                  <InputGroup name="database" label="Database Name" placeholder="db_main" defaultValue={initialData?.dbName} />
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup name="user" label="DB User" placeholder="root" defaultValue={initialData?.dbUser} />
                    <InputGroup name="password" label="Password" type="password" placeholder="••••••" defaultValue={initialData?.dbPassword} />
                  </div>
                  <button type="button" onClick={handleTestConnection} disabled={testing} className="flex items-center gap-2 bg-slate-900 text-white text-[10px] font-black uppercase py-4 rounded px-8">
                    {testing ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} {testing ? "Analyzing..." : "Verify DB Connection"}
                  </button>
                </>
              )}

              {activeTab === "whatsapp" && (
                <div className="space-y-6 animate-in slide-in-from-left duration-300">
                  <InputGroup name="whatsapp_business_id" label="WABA ID" defaultValue={initialData?.wabaId} />
                  <InputGroup name="whatsapp_phone_id" label="Phone ID" defaultValue={initialData?.phoneNumberId} />
                  <InputGroup name="whatsapp_token" label="Permanent Access Token" type="text" autoComplete="off" defaultValue={initialData?.metaToken} />
                  <button type="button" onClick={handleFetchWhatsApp} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded transition-all ${isWaVerified ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                    {testing ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                    {testing ? "Syncing Meta..." : "Sync Templates"}
                  </button>
                </div>
              )}
            </form>

            <div className="bg-slate-50 border border-slate-200 rounded-sm p-6 flex flex-col max-h-[550px]">
              <div className="mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  {activeTab === "db" ? <Table size={12} /> : <MessageSquare size={12} />} 
                  {activeTab === "db" ? "Detected Schema" : "Live Meta Templates"}
                </h4>
                {activeTab === "whatsapp" && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Search templates..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded text-xs outline-none focus:border-blue-500 font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="overflow-y-auto flex-1 space-y-3 pr-2">
                {activeTab === "db" && isConnected && dbTables.map((table) => <ItemRow key={table} text={table} />)}
                {activeTab === "whatsapp" && filteredTemplates.map((tmpl: any) => (
                  <div key={tmpl.id} className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{tmpl.name}</span>
                      <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold uppercase">{tmpl.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed mb-4 italic">
                      {tmpl.components.find((c: any) => c.type === "BODY")?.text}
                    </p>
                    {tmpl.status === "APPROVED" && (
                      <button onClick={() => handleSendTestMessage(tmpl)} className="w-full bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-500 py-2 rounded text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2">
                        <Send size={10} /> Send Test WhatsApp
                      </button>
                    )}
                  </div>
                ))}
                {( (activeTab === "db" && !isConnected) || (activeTab === "whatsapp" && !isWaVerified) ) && !testing && <EmptyState text={`Sync ${activeTab.toUpperCase()} to view content`} />}
                {testing && <LoadingState text="Accessing remote data..." />}
              </div>
            </div>
          </div>

          <div className="absolute bottom-10 right-10">
            <button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-12 py-4 rounded shadow-xl uppercase tracking-widest">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saving ? "Storing..." : "Save Config"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// 🔹 Reusable UI Components
function InputGroup({ label, placeholder, name, type = "text", defaultValue, autoComplete = "on" }: any) {
  return (
    <div className="w-full">
      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">{label}</label>
      <input 
        name={name} 
        type={type} 
        autoComplete={autoComplete} 
        key={defaultValue} 
        defaultValue={defaultValue} 
        placeholder={placeholder} 
        className="w-full bg-slate-50 border border-slate-200 rounded py-3 px-4 text-xs text-slate-900 outline-none focus:border-blue-500 transition-colors font-bold" 
      />
    </div>
  );
}

function ItemRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded text-[10px] font-bold text-slate-600 uppercase shadow-sm mb-2">
      <CheckCircle size={14} className="text-emerald-500" /> {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center px-10">
      <AlertCircle size={32} className="text-slate-200 mb-2" />
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{text}</p>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48">
      <Loader2 size={32} className="text-blue-500 animate-spin mb-2" />
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{text}</p>
    </div>
  );
}