"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft, Database, MessageSquare, Save, Activity, 
  CheckCircle, AlertCircle, Table, Loader2, Send, Search, PlusCircle, Check,
  ChevronDown, Type
} from "lucide-react";
import { testRemoteConnection } from "../../../../actions/db-test";
import { saveClientConfig, getClientConfig } from "../../../../actions/client";
import { 
  createMetaTemplate, 
  getRecommendedTemplatesByIndustry,
  syncTemplatesToDb,
  getClientStoredTemplates,
  updateTemplateMapping,
  getRemoteDatabaseSchema 
} from "../../../../actions/whatsapp-actions";
import { toast, Toaster } from "sonner";
import "./settings.css"; 
import { getTemplateVariableCounts } from "@/lib/whatsapp-utils";

type TabType = "db" | "mail" | "sms" | "whatsapp";

export default function ClientSettingsPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const formRef = useRef<HTMLFormElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>("db");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null); 
  const [isWaVerified, setIsWaVerified] = useState(false);
  const [dbTables, setDbTables] = useState<string[]>([]);
  
  const [waTemplates, setWaTemplates] = useState<any[]>([]); 
  const [storedTemplates, setStoredTemplates] = useState<any[]>([]); 
  
  const [recommendedTemplates, setRecommendedTemplates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [storedSearchTerm, setStoredSearchTerm] = useState("");

  const [dbFields, setDbFields] = useState<any[]>([]); 

  const [isConnected, setIsConnected] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  const [mappings, setMappings] = useState<Record<string, Record<string, string>>>({});
  const businessTypes = ["Salon", "Gym", "Pet Clinic", "Aesthetic Clinic", "Car Detailing"];

  const fetchPersistentConfig = async () => {
    if (!id) return;
    const result = await getClientConfig(id);
    if (result.success && result.config) {
      setInitialData(result.config);
      if (result.config.waba_id && result.config.meta_token) {
        setIsWaVerified(true);
      }
      if (result.config.db_host) {
        setIsConnected(true);
      }
    }
    fetchStoredTemplates();
  };

  const fetchStoredTemplates = async () => {
     if (!id) return;
     const result = await getClientStoredTemplates(id);
     if (result.success) {
         setStoredTemplates(result.templates);
         
         const dbMappings: Record<string, Record<string, string>> = {};
         result.templates.forEach((t: any) => {
           if (t.mappings) {
             dbMappings[t.id] = typeof t.mappings === 'string' ? JSON.parse(t.mappings) : t.mappings;
           }
         });
         setMappings(dbMappings);
     }
  };

  useEffect(() => {
    if (id && isConnected) {
      getRemoteDatabaseSchema(id).then((res) => {
        if (res.success) {
          setDbFields(res.columns || []);
        }
      });
    }
  }, [id, isConnected]);

  useEffect(() => {
    fetchPersistentConfig();
  }, [id]);

  useEffect(() => {
    async function loadRecommended() {
      if (activeTab === "whatsapp" && initialData?.business_type) {
        const result = await getRecommendedTemplatesByIndustry(initialData.business_type);
        if (result.success) {
          setRecommendedTemplates(result.templates || []);
        }
      }
    }
    loadRecommended();
  }, [activeTab, initialData?.business_type]);

  const filteredTemplates = useMemo(() => {
    return waTemplates.filter(tmpl =>
      tmpl.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [waTemplates, searchTerm]);

  const filteredStoredTemplates = useMemo(() => {
    return storedTemplates.filter(tmpl =>
      tmpl.name.toLowerCase().includes(storedSearchTerm.toLowerCase())
    );
  }, [storedTemplates, storedSearchTerm]);

  // ✅ FIXED: Updated logic to prevent "Cannot update while rendering" error
  function handleMappingChange(templateId: number, varIndex: number, value: string, requiredVars: number) {
    // 1. Calculate the new mapping object first (Pure calculation)
    const currentTemplateMappings = mappings[templateId] || {};
    const updatedTemplateMappings = {
      ...currentTemplateMappings,
      [String(varIndex)]: value,
    };

    // 2. Calculate Status
    const mappedVarsCount = Object.values(updatedTemplateMappings).filter(Boolean).length;
    const isMappedStatus = mappedVarsCount === requiredVars ? 1 : 0;

    // 3. Update Mappings State (UI)
    setMappings((prev) => ({
      ...prev,
      [templateId]: updatedTemplateMappings,
    }));

    // 4. Update Stored Templates State (Green Tick UI)
    setStoredTemplates((current) =>
      current.map((t) => 
        t.id === templateId 
          ? { ...t, is_mapped: isMappedStatus, mappings: updatedTemplateMappings } 
          : t
      )
    );

    // 5. Trigger Database Update (Side Effect)
    // This is now safe because it happens *after* the state logic, not inside it.
    updateTemplateMapping(templateId, updatedTemplateMappings, isMappedStatus);
  }

  // 🔹 FIXED SEMANTIC VARIABLE LIST
  const variableOptions = [
    { 
      label: "Client Details", 
      options: [
        { value: "client.name", label: "Client Name" },
        { value: "client.dob", label: "Date of Birth" },
        { value: "client.anniversary", label: "Anniversary" },
        { value: "client.rewards", label: "Reward Points (Calc)" },
        { value: "client.pending", label: "Pending Amount (Calc)" },
      ]
    },
    { 
      label: "Appointment Info", 
      options: [
        { value: "appointment.date", label: "Appt Date" },
        { value: "appointment.time", label: "Appt Time" },
        { value: "appointment.service", label: "Service Name" },
      ]
    },
    { 
      label: "Billing / Invoice", 
      options: [
        { value: "invoice.date", label: "Bill Date" },
        { value: "invoice.amount", label: "Bill Amount / Total" },
        { value: "invoice.link", label: "Invoice Link (Auto)" },
      ]
    },
    { 
      label: "System / Business", 
      options: [
        { value: "system.name", label: "Business Name" },
        { value: "system.phone", label: "Business Phone" },
      ]
    }
  ];

  async function performAutoSave(formData: FormData) {
    if (!id) return;
    setSaving(true);
    try {
      const result = await saveClientConfig(id, formData);
      if (result.success) {
        toast.success("Saved!");
        await fetchPersistentConfig(); 
      } else {
        toast.error("Save failed: " + result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!formRef.current) return;
    setTesting(true);
    setIsConnected(false);
    setDbTables([]);
    
    try {
      const formData = new FormData(formRef.current);
      const result = await testRemoteConnection(formData);
      
      if (result.success) {
        setIsConnected(true);
        setDbTables((result.tables as string[]) || []);
        toast.success(result.message);
        await performAutoSave(formData);
      } else {
        toast.error(result.error);
      }
    } finally {
      setTesting(false);
    }
  }

  async function handleFetchWhatsApp() {
    if (!formRef.current) return;
    setTesting(true);
    setIsWaVerified(false);

    const formData = new FormData(formRef.current);
    const wabaId = formData.get("whatsapp_business_id")?.toString().trim();
    const token = formData.get("whatsapp_token")?.toString().trim();

    if (!wabaId || !token) {
        toast.error("Missing WABA ID or Token.");
        setTesting(false);
        return;
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/message_templates?limit=500`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error.message);

      const templates = data.data || [];
      setWaTemplates(templates);
      setIsWaVerified(true);
      toast.success(`Synced ${templates.length} templates!`);

      await performAutoSave(formData);

      if (syncTemplatesToDb && id) {
         const syncResult = await syncTemplatesToDb(id, templates);
         if (syncResult.success) {
            toast.success("DB Mirror Complete.");
            await fetchStoredTemplates(); 
         } else {
            toast.error("DB Mirror Failed.");
         }
      }

    } catch (err: any) {
      setIsWaVerified(false);
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleCreateTemplate(templateDef: any) {
    if (!formRef.current) return;
    setCreatingTemplate(templateDef.name);

    const formData = new FormData(formRef.current);
    const wabaId = formData.get("whatsapp_business_id")?.toString().trim();
    const token = formData.get("whatsapp_token")?.toString().trim();

    if (!wabaId || !token) {
      toast.error("Credentials required.");
      setCreatingTemplate(null);
      return;
    }

    try {
      const result = await createMetaTemplate(wabaId, token, templateDef);
      if (result.success) {
        toast.success(`Template submitted!`);
        await handleFetchWhatsApp(); 
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setCreatingTemplate(null);
    }
  }

  async function handleSendTestMessage(template: any) {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const phoneId = formData.get("whatsapp_phone_id");
    const token = formData.get("whatsapp_token")?.toString().trim();

    const testRecipient = prompt("Enter phone (e.g., 91XXXXXXXXXX):");
    if (!testRecipient) return;

    const components: any[] = [];
    const bodyComp = template.components.find((c: any) => c.type === "BODY");
    if (bodyComp) {
      const varCount = (bodyComp.text.match(/{{[0-9]+}}/g) || []).length;
      if (varCount > 0) {
        components.push({
          type: "body",
          parameters: Array.from({ length: varCount }, (_, i) => ({
            type: "text",
            text: `TestValue_${i + 1}`
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
      toast.success("Test message sent!");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  }

  async function handleSave() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    await performAutoSave(formData);
  }

  if (!id) return <div className="p-10 text-center text-xs text-slate-500">Loading Configuration...</div>;

  return (
    <main className="settings-main">
      <Toaster richColors position="top-center" />
      <div className="settings-wrapper">
        <nav className="settings-breadcrumb">
          <Link href="/admin/clients" className="settings-breadcrumb-link">
            <ChevronLeft size={12} /> Clients
          </Link>
          <span>/</span>
          <span className="settings-breadcrumb-active">Configuration</span>
        </nav>

        <header className="settings-header py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Client Settings</h1>
            <p className="text-xs text-slate-500 mt-1">
              System ID: <span className="font-mono bg-slate-100 px-1 rounded">{id}</span>
            </p>
          </div>
          <div className="settings-status-badge">
            <Activity size={12} className={isConnected || isWaVerified ? "text-green-500" : "text-slate-400"} />
            {isConnected || isWaVerified ? "Active Session" : "Sync Required"}
          </div>
        </header>

        <div className="settings-tabs-container">
          {["db", "mail", "sms", "whatsapp"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              className={`settings-tab-button ${activeTab === tab ? 'settings-tab-active' : ''}`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="settings-content-container">
          <div className="settings-content-grid">
            <form key={initialData?.id || 'loading'} ref={formRef} className="settings-form">
              {activeTab === "db" && (
                <>
                  <div className="settings-input-wrapper">
                    <label className="settings-input-label">Business Type</label>
                    <select 
                      name="business_type"
                      className="settings-input-field"
                      defaultValue={initialData?.business_type || ""}
                    >
                      <option value="" disabled>Select Type</option>
                      {businessTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* 🟢 SEPARATE INPUTS FOR NAME AND LINK */}
                  <InputGroup name="business_name" label="Business Name" placeholder="My Awesome Salon" defaultValue={initialData?.business_name} />
                  <InputGroup name="website_link" label="Website Link (Base URL)" placeholder="https://2025.shivsoftsindia.in/..." defaultValue={initialData?.website_link} />
                  
                  <div className="settings-form-row">
                    <InputGroup name="host" label="Host" placeholder="127.0.0.1" defaultValue={initialData?.db_host} />
                    <InputGroup name="port" label="Port" placeholder="3306" defaultValue={initialData?.db_port || "3306"} />
                  </div>
                  <InputGroup name="database" label="Database Name" placeholder="db_main" defaultValue={initialData?.db_name} />
                  <div className="settings-form-row">
                    <InputGroup name="user" label="User" placeholder="root" defaultValue={initialData?.db_user} />
                    <InputGroup name="password" label="Pass" type="password" placeholder="••••" defaultValue={initialData?.db_password} />
                  </div>
                  <button type="button" onClick={handleTestConnection} disabled={testing} className="settings-btn-primary">
                    {testing ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                    {testing ? "Checking..." : "Verify & Save"}
                  </button>
                </>
              )}

              {activeTab === "whatsapp" && (
                <div className="settings-form">
                  <InputGroup name="whatsapp_business_id" label="WABA ID" defaultValue={initialData?.waba_id} />
                  <InputGroup name="whatsapp_phone_id" label="Phone ID" defaultValue={initialData?.phone_number_id} />
                  <InputGroup name="whatsapp_token" label="Access Token" type="text" autoComplete="off" defaultValue={initialData?.meta_token} />
                  <button
                    type="button"
                    onClick={handleFetchWhatsApp}
                    className={`settings-btn-success ${isWaVerified ? 'settings-btn-success-verified' : ''}`}
                  >
                    {testing ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                    {testing ? "Syncing..." : "Sync & Save"}
                  </button>

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <PlusCircle size={12} /> Recommended for {initialData?.business_type || "Industry"}
                    </h4>
                    <div className="space-y-2">
                      {recommendedTemplates.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">
                          {initialData?.business_type 
                            ? "No specific templates found." 
                            : "Select a Business Type first."}
                        </p>
                      ) : (
                        recommendedTemplates.map((tmpl) => {
                          const exists = waTemplates.some(t => t.name === tmpl.name);
                          const bodyText = tmpl.components.find((c: any) => c.type === "BODY")?.text || "";
                          
                          return (
                            <div key={tmpl.name} className="flex flex-col bg-slate-50 p-2.5 rounded-lg border border-slate-200 gap-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{tmpl.label}</p>
                                  <p className="text-[9px] text-slate-400 font-mono">{tmpl.name}</p>
                                </div>
                                {exists ? (
                                  <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Check size={10} /> Added
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCreateTemplate(tmpl)}
                                    disabled={!!creatingTemplate}
                                    className="text-[9px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                  >
                                    {creatingTemplate === tmpl.name ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                                    Create
                                  </button>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-600 bg-white p-1.5 rounded border border-slate-100 leading-snug line-clamp-3">
                                {bodyText}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="settings-panel flex-1">
              <div className="settings-panel-header">
                <h4 className="settings-panel-title">
                  {activeTab === "db" ? <Table size={12} /> : <MessageSquare size={12} />}
                  {activeTab === "db" ? "Detected Schema" : "Meta Templates (Live)"}
                </h4>
                {activeTab === "whatsapp" && (
                  <div className="settings-search-wrapper">
                    <Search className="settings-search-icon" size={12} />
                    <input
                      type="text"
                      placeholder="Filter..."
                      className="settings-search-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="settings-panel-content">
                {activeTab === "db" && isConnected && dbTables.map((table) => <ItemRow key={table} text={table} />)}
                
                {activeTab === "whatsapp" && filteredTemplates.map((tmpl: any) => {
                  const counts = getTemplateVariableCounts(tmpl.components);
                  return (
                    <div key={tmpl.id || tmpl.name} className="settings-template-card">
                      <div className="settings-template-header">
                        <span className="settings-template-name">{tmpl.name}</span>
                        <span className={`settings-template-status ${tmpl.status === "APPROVED" ? "text-green-600" : "text-amber-600"}`}>
                          {tmpl.status}
                        </span>
                      </div>
                      <p className="settings-template-body">
                        {tmpl.components.find((c: any) => c.type === "BODY")?.text}
                      </p>
                      
                      <div className="mt-2 mb-3 flex gap-2">
                        <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          Vars: {counts.total}
                        </span>
                      </div>

                      {tmpl.status === "APPROVED" && (
                        <button onClick={() => handleSendTestMessage(tmpl)} className="settings-template-btn">
                          <Send size={10} /> Test
                        </button>
                      )}
                    </div>
                  );
                })}

                {((activeTab === "db" && !isConnected) || (activeTab === "whatsapp" && !isWaVerified)) && !testing && <EmptyState text={`Sync ${activeTab.toUpperCase()} First`} />}
                {testing && <LoadingState text="Working..." />}
              </div>
            </div>

          </div>
          
          <div className="settings-save-wrapper mt-4 flex justify-end">
             <button onClick={handleSave} disabled={saving} className="settings-btn-save flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Storing..." : "Save Config"}
            </button>
          </div>
          
          {activeTab === "whatsapp" && storedTemplates.length > 0 && (
            <div className="mt-6 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden w-full">
              
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                   <Database size={13} className="text-blue-500" /> Database Templates
                 </h3>
                 <div className="flex items-center gap-2">
                   <div className="relative flex items-center">
                     <Search className="absolute left-2 text-slate-400" size={12} />
                     <input
                       type="text"
                       placeholder="Find template..."
                       className="text-[10px] border border-slate-300 rounded pl-6 pr-2 py-1 w-48 outline-none focus:border-blue-500 transition-all bg-white"
                       value={storedSearchTerm}
                       onChange={(e) => setStoredSearchTerm(e.target.value)}
                     />
                   </div>
                   <span className="text-[10px] text-slate-500 font-medium bg-slate-200 px-1.5 py-0.5 rounded">
                     {filteredStoredTemplates.length}
                   </span>
                 </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-white text-[10px] text-slate-400 uppercase tracking-wider">
                      <th className="px-3 py-2 font-semibold w-1/4">Details</th>
                      <th className="px-3 py-2 font-semibold w-5/12">Message Content</th>
                      <th className="px-3 py-2 font-semibold w-1/3">Variable Mapping</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStoredTemplates.map((tmpl: any) => {
                      const componentsJson = typeof tmpl.components === 'string' ? JSON.parse(tmpl.components) : tmpl.components;
                      const counts = getTemplateVariableCounts(componentsJson || []);
                      const bodyText = (componentsJson || []).find((c: any) => c.type === "BODY")?.text || "No body text";
                      
                      const requiredVars = tmpl.total_variables || counts.total;
                      const mappedVarsCount = Object.values(mappings[tmpl.id] || {}).filter(Boolean).length;
                      
                      const isComplete = tmpl.is_mapped === 1 || requiredVars === 0 || (requiredVars > 0 && mappedVarsCount === requiredVars);

                      return (
                        <tr key={tmpl.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5">
                                {isComplete ? (
                                  <CheckCircle size={14} className="text-green-500" />
                                ) : (
                                  <AlertCircle size={14} className="text-amber-500" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-slate-800 mb-0.5">{tmpl.name}</div>
                                <div className="text-[9px] text-slate-400 font-mono">ID: {tmpl.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-[11px] text-slate-600">
                            <div className="whitespace-pre-wrap leading-tight max-w-[400px]">
                              {bodyText}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top bg-slate-50/30">
                            {requiredVars > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {Array.from({ length: requiredVars }).map((_, i) => {
                                  const varNum = i + 1;
                                  const currentValue = mappings[tmpl.id]?.[varNum] || "";
                                  
                                  return (
                                    <div key={varNum} className="flex items-center gap-1.5 relative group">
                                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded min-w-[24px] text-center">
                                        {`{{${varNum}}}`}
                                      </span>
                                      
                                      <SearchableSelect 
                                        options={variableOptions}
                                        value={currentValue}
                                        onChange={(val: string) => handleMappingChange(tmpl.id, varNum, val, requiredVars)}
                                        placeholder="Select Value..."
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic flex items-center gap-1 mt-1">
                                <CheckCircle size={10} className="text-green-500" /> No variables
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder 
}: { 
  options: any[]; 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allOptions = options.flatMap((g: any) => g.options);
  const selectedLabel = allOptions.find((o: any) => o.value === value)?.label || value;

  const filteredGroups = options.map((group: any) => ({
    ...group,
    options: group.options.filter((opt: any) => 
      opt.label.toLowerCase().includes(search.toLowerCase()) || 
      opt.value.toLowerCase().includes(search.toLowerCase())
    )
  })).filter((g: any) => g.options.length > 0);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className="text-[10px] py-1 px-2 border border-slate-300 rounded w-full bg-white text-slate-700 flex justify-between items-center cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate flex-1">{value ? selectedLabel : <span className="text-slate-400">{placeholder}</span>}</span>
        <ChevronDown size={10} className="text-slate-400 ml-1" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-[200px] bg-white border border-slate-200 rounded-md shadow-lg max-h-60 flex flex-col text-[10px]">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white rounded-t-md">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2">
              <Search size={10} className="text-slate-400 mr-1" />
              <input 
                autoFocus
                className="bg-transparent w-full py-1.5 outline-none text-slate-700 placeholder:text-slate-400"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-1">
            {filteredGroups.map((group: any) => (
              <div key={group.label} className="mb-1">
                <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase">{group.label}</div>
                {group.options.map((opt: any) => (
                  <div 
                    key={`${opt.value}-${opt.label}`} 
                    className={`px-2 py-1.5 rounded cursor-pointer flex items-center justify-between ${value === opt.value ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-700'}`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                  >
                    <span>{opt.label}</span>
                    {value === opt.value && <Check size={10} />}
                  </div>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && search && <div className="p-2 text-center text-slate-400 italic">No variables found</div>}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-md">
            <p className="text-[9px] text-slate-400 mb-1 flex items-center gap-1"><Type size={9} /> Custom Text:</p>
            <div className="flex gap-1">
              <input 
                className="flex-1 border border-slate-300 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                placeholder="Type & Enter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search) {
                    onChange(search); 
                    setIsOpen(false);
                  }
                }}
              />
              <button 
                type="button"
                className="bg-blue-600 text-white rounded px-2 hover:bg-blue-700"
                onClick={() => {
                  if (search) {
                    onChange(search);
                    setIsOpen(false);
                  }
                }}
              >
                <Check size={10} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputGroup({ label, placeholder, name, type = "text", defaultValue, autoComplete = "on" }: any) {
  return (
    <div className="settings-input-wrapper mb-3">
      <label className="settings-input-label block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        key={defaultValue}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="settings-input-field w-full text-sm border border-slate-300 rounded p-2 outline-none focus:border-blue-500"
      />
    </div>
  );
}

function ItemRow({ text }: { text: string }) {
  return (
    <div className="settings-item-row flex items-center gap-2 p-2 border-b border-slate-100 text-sm text-slate-700">
      <CheckCircle size={14} className="text-green-500" /> {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="settings-empty-state flex flex-col items-center justify-center p-10 text-slate-400">
      <AlertCircle size={32} className="mb-2 opacity-50" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="settings-loading-state flex flex-col items-center justify-center p-10 text-blue-500">
      <Loader2 size={32} className="animate-spin mb-2" />
      <p className="text-sm font-bold">{text}</p>
    </div>
  );
}