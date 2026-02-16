"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, Loader2, Edit, Save, X, Search, ChevronDown, Check } from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  getClientAutomations,
  triggerAutomationManual,
  deleteAutomationAction,
  saveAutomationAction
} from "../../../../actions/automation-logic";
import { getClientStoredTemplates } from "../../../../actions/whatsapp-actions"; 
import "./automation.css";

// ============================================================================
// 1. CUSTOM SEARCHABLE SELECT COMPONENT
// ============================================================================
function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  name,
  form
}: { 
  options: { name: string }[]; 
  value: string; 
  onChange: (val: string) => void; 
  placeholder: string;
  name: string;
  form?: string; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Hidden input to ensure value is submitted with the form */}
      <input type="hidden" name={name} value={value} form={form} />

      {/* The Display Box */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="automation-custom-select-trigger"
      >
        <span className={!value ? "text-gray-400" : "text-gray-700 font-medium"}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className="text-gray-500" />
      </div>

      {/* The Dropdown List */}
      {isOpen && (
        <div className="automation-custom-select-dropdown">
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2 bg-gray-50 px-2 py-1.5 rounded-md border border-gray-200">
              <Search size={12} className="text-gray-400" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search templates..." 
                className="bg-transparent border-none outline-none text-xs w-full text-gray-700 placeholder:text-gray-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-gray-400 text-center italic">No active templates found</div>
            ) : (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.name}
                  onClick={() => {
                    onChange(opt.name);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`automation-custom-select-option ${value === opt.name ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  <span>{opt.name}</span>
                  {value === opt.name && <Check size={12} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. MAIN PAGE COMPONENT
// ============================================================================
export default function ClientAutomationList() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [automations, setAutomations] = useState<any[]>([]);
  
  // 🟢 Templates that are Approved AND Mapped (Green Tick)
  const [readyTemplates, setReadyTemplates] = useState<{ name: string; status: string }[]>([]);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [tempFormState, setTempFormState] = useState({
    channel: "WhatsApp",
    templateName: ""
  });

  const salonEvents = [
    "Birthday",
    "Anniversary",
    "New Enquiry / Walkin",
    "Pending payment",
    "New appointment", 
    "Appointment re-schedule", 
    "Appointment cancel",
    "Appointment reminder before 30 mins of appopintment", 
    "New bill",
    "Reward points granted / earned", 
    "membership buy",
    "Feedback after 2 mins of new bill generation", 
    "Service reminder"
  ];

  const channels = ["WhatsApp", "SMS", "Email"];

  // --- Load Data ---
  async function loadData() {
    setLoading(true);
    
    // 1. Fetch Automations
    const autoData = await getClientAutomations(id as string);
    setAutomations(Array.isArray(autoData) ? autoData : []);

    // 2. Fetch Stored Templates from DB
    const tmplResult = await getClientStoredTemplates(id as string);
    if (tmplResult.success && tmplResult.templates) {
        // 🟢 FILTER: Only show templates that are APPROVED + (Mapped OR No Variables needed)
        const valid = tmplResult.templates.filter((t: any) => 
            t.status === "APPROVED" && (t.is_mapped === 1 || t.total_variables === 0)
        );
        setReadyTemplates(valid);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (isCreating) {
      setTempFormState({ channel: "WhatsApp", templateName: "" });
    }
  }, [isCreating]);

  // --- Search Logic ---
  const filteredAutomations = useMemo(() => {
    if (!searchTerm) return automations;
    return automations.filter(automation =>
      automation.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      automation.template_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [automations, searchTerm]);

  // --- Handlers ---
  const handleRunNow = async (configId: string, eventName: string) => {
    setExecutingId(configId);
    try {
      const result = await triggerAutomationManual(configId);
      if (result.success) toast.success(`Triggered: ${eventName}`);
      else toast.error(`Failed: ${result.error}`);
    } catch (err) { toast.error("System error."); }
    setExecutingId(null);
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Delete this automation?")) return;
    setAutomations((prev) => prev.filter((a) => a.id !== ruleId));
    toast.info("Deleting...");
    const result = await deleteAutomationAction(ruleId, id as string);
    if (result.success) toast.success("Deleted.");
    else { toast.error("Failed to delete."); loadData(); }
  };

  const handleCreateNew = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingId("new");
    const formData = new FormData(e.currentTarget); 
    
    const result = await saveAutomationAction(id as string, formData);
    setSavingId(null);

    if (result && 'error' in result && result.error) toast.error(result.error);
    else { toast.success("Created!"); setIsCreating(false); loadData(); }
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>, automationId: string) => {
    e.preventDefault();
    const formElement = e.currentTarget; 
    setSavingId(automationId);

    // 1. Delete old rule first
    await deleteAutomationAction(automationId, id as string);

    // 2. Create new rule
    const formData = new FormData(formElement);
    const result = await saveAutomationAction(id as string, formData);

    setSavingId(null);

    if (result && 'error' in result && result.error) {
      toast.error(result.error);
      loadData();
    } else {
      toast.success("Updated!");
      setEditingId(null);
      loadData();
    }
  };

  return (
    <main className="automation-main">
      <Toaster position="top-right" />
      <div className="automation-wrapper">
        <header className="automation-header">
          <div className="automation-header-info">
            <h1>Client Automations</h1>
            <p>System ID: <span className="automation-header-info-id">{id}</span></p>
          </div>
          <button onClick={() => setIsCreating(true)} className="automation-btn-add" disabled={isCreating}>
            <Plus size={14} /> Add Automation
          </button>
        </header>

        <div className="automation-search-wrapper">
          <Search className="automation-search-icon" size={16} />
          <input
            type="text"
            placeholder="Search automations..."
            className="automation-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="automation-table-wrapper">
          <table className="automation-table">
            <thead>
              <tr>
                <th style={{width: '25%'}}>Trigger Event</th>
                <th style={{width: '15%'}}>Channel</th>
                <th style={{width: '30%'}}>Template (Green Tick Only)</th>
                <th style={{width: '20%'}}>Delay</th>
                <th style={{width: '10%'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* CREATION ROW */}
              {isCreating && (
                <tr className="automation-edit-row">
                  <td>
                    <form onSubmit={handleCreateNew} id="create-form" className="automation-column-form">
                      <div className="automation-form-field-column">
                        <span className="automation-form-label-small">When</span>
                        <select name="eventType" required className="automation-form-select-column">
                          <option value="">Select Event</option>
                          {salonEvents.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                    </form>
                  </td>
                  <td>
                    <div className="automation-form-field-column">
                      <span className="automation-form-label-small">Via</span>
                      <select 
                        name="channel" 
                        form="create-form"
                        className="automation-form-select-column"
                        value={tempFormState.channel}
                        onChange={(e) => setTempFormState({...tempFormState, channel: e.target.value})}
                      >
                        {channels.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="automation-form-field-column">
                      <span className="automation-form-label-small">Send Template</span>
                      {/* 🟢 Searchable Select using ONLY Approved & Mapped Templates */}
                      <SearchableSelect 
                        name="templateName"
                        form="create-form"
                        options={readyTemplates} 
                        placeholder="Select mapped template..."
                        value={tempFormState.templateName}
                        onChange={(val) => setTempFormState({...tempFormState, templateName: val})}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="automation-form-field-column">
                      <span className="automation-form-label-small">Wait for</span>
                      <div className="automation-delay-inputs">
                        <input form="create-form" name="delayValue" type="number" defaultValue="0" min="0" className="automation-form-input-number-column" />
                        <select form="create-form" name="delayUnit" defaultValue="Minutes" className="automation-form-select-small-column">
                          <option value="Minutes">Min</option>
                          <option value="Hours">Hrs</option>
                          <option value="Days">Days</option>
                        </select>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="automation-actions-cell">
                      <button form="create-form" type="submit" disabled={savingId === "new"} className="automation-btn-save-inline">
                        {savingId === "new" ? <Loader2 size={14} className="automation-loading-spinner" /> : <Save size={14} />}
                      </button>
                      <button type="button" onClick={() => setIsCreating(false)} className="automation-btn-cancel-inline">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* LIST ROWS */}
              {!loading && filteredAutomations.map((item) => (
                editingId === item.id ? (
                  // EDIT ROW
                  <tr key={item.id} className="automation-edit-row">
                    <td>
                      <form onSubmit={(e) => handleSaveEdit(e, item.id)} id={`edit-form-${item.id}`} className="automation-column-form">
                        <div className="automation-form-field-column">
                          <span className="automation-form-label-small">When</span>
                          <select name="eventType" required defaultValue={item.event_type} className="automation-form-select-column">
                            {salonEvents.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </div>
                      </form>
                    </td>
                    <td>
                      <div className="automation-form-field-column">
                        <span className="automation-form-label-small">Via</span>
                        <select 
                          name="channel" 
                          form={`edit-form-${item.id}`}
                          className="automation-form-select-column"
                          defaultValue={item.channel || "WhatsApp"}
                        >
                          {channels.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className="automation-form-field-column">
                        <span className="automation-form-label-small">Send Template</span>
                         <SearchableSelect 
                            name="templateName"
                            form={`edit-form-${item.id}`}
                            options={readyTemplates} // 🟢 Filtered list
                            placeholder="Select mapped template..."
                            value={tempFormState.templateName || item.template_name}
                            onChange={(val) => setTempFormState({...tempFormState, templateName: val})}
                          />
                      </div>
                    </td>
                    <td>
                      <div className="automation-form-field-column">
                        <span className="automation-form-label-small">Wait for</span>
                        <div className="automation-delay-inputs">
                          <input form={`edit-form-${item.id}`} name="delayValue" type="number" defaultValue={item.delay_value} min="0" className="automation-form-input-number-column" />
                          <select form={`edit-form-${item.id}`} name="delayUnit" defaultValue={item.delay_unit} className="automation-form-select-small-column">
                            <option value="Minutes">Min</option>
                            <option value="Hours">Hrs</option>
                            <option value="Days">Days</option>
                          </select>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="automation-actions-cell">
                        <button form={`edit-form-${item.id}`} type="submit" disabled={savingId === item.id} className="automation-btn-save-inline">
                          {savingId === item.id ? <Loader2 size={14} className="automation-loading-spinner" /> : <Save size={14} />}
                        </button>
                        <button type="button" onClick={() => { setEditingId(null); setTempFormState({ channel: "WhatsApp", templateName: "" }); }} className="automation-btn-cancel-inline">
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // DISPLAY ROW
                  <tr key={item.id}>
                    <td>{item.event_type}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border
                        ${(item.channel === 'Email') ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                          (item.channel === 'SMS') ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                          'bg-green-50 text-green-600 border-green-100'}`}>
                        {item.channel || "WhatsApp"}
                      </span>
                    </td>
                    <td>{item.template_name}</td>
                    <td>{item.delay_value} {item.delay_unit}</td>
                    <td>
                      <div className="automation-actions-cell">
                        <button disabled={executingId === item.id} onClick={() => handleRunNow(item.id, item.event_type)} className="automation-btn-test">
                          {executingId === item.id ? <Loader2 size={12} className="animate-spin"/> : "Test"}
                        </button>
                        <button onClick={() => { setEditingId(item.id); setTempFormState({ channel: item.channel || "WhatsApp", templateName: item.template_name }); }} className="automation-btn-edit">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="automation-btn-delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              
              {!loading && automations.length === 0 && !isCreating && (
                <tr>
                  <td colSpan={5} className="automation-empty-cell">No active salon automations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}