"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, Database, Mail, Smartphone, MessageSquare, Save, Activity, RefreshCw, CheckCircle, AlertCircle, Table, Loader2, Send, Search } from "lucide-react";
import { testRemoteConnection } from "../../../../actions/db-test";
import { saveClientConfig, getClientConfig } from "../../../../actions/client";
import { toast, Toaster } from "sonner";
import "./settings.css";

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

  const fetchPersistentConfig = async () => {
    const result = await getClientConfig(id as string);
    if (result.success && result.config) {
      setInitialData(result.config);
    }
  };

  useEffect(() => {
    fetchPersistentConfig();
  }, [id]);

  const filteredTemplates = useMemo(() => {
    return waTemplates.filter(tmpl =>
      tmpl.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [waTemplates, searchTerm]);

  async function handleTestConnection() {
    if (!formRef.current) return;
    setTesting(true);
    setIsConnected(false);
    setWaTemplates([]);
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

  async function handleFetchWhatsApp() {
    if (!formRef.current) return;
    setTesting(true);
    setIsWaVerified(false);
    setDbTables([]);
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

  async function handleSendTestMessage(template: any) {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const phoneId = formData.get("whatsapp_phone_id");
    const token = formData.get("whatsapp_token")?.toString().trim();

    const testRecipient = prompt("Enter phone number (e.g., 91XXXXXXXXXX):");
    if (!testRecipient) return;

    const components: any[] = [];

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

        <header className="settings-header">
          <div>
            <h1 className="settings-header-title">Client Settings</h1>
            <p className="settings-header-subtitle">
              System ID: <span className="settings-header-subtitle-id">{id}</span>
            </p>
          </div>
          <div className="settings-status-badge">
            <Activity size={12} className={isConnected || isWaVerified ? "settings-status-icon-active" : "settings-status-icon-inactive"} />
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
                  <InputGroup name="website" label="Website URL" placeholder="https://client.com" defaultValue={initialData?.websiteUrl} />
                  <div className="settings-form-row">
                    <InputGroup name="host" label="Host Address" placeholder="127.0.0.1" defaultValue={initialData?.dbHost} />
                    <InputGroup name="port" label="Port" placeholder="3306" defaultValue={initialData?.dbPort || "3306"} />
                  </div>
                  <InputGroup name="database" label="Database Name" placeholder="db_main" defaultValue={initialData?.dbName} />
                  <div className="settings-form-row">
                    <InputGroup name="user" label="DB User" placeholder="root" defaultValue={initialData?.dbUser} />
                    <InputGroup name="password" label="Password" type="password" placeholder="••••••" defaultValue={initialData?.dbPassword} />
                  </div>
                  <button type="button" onClick={handleTestConnection} disabled={testing} className="settings-btn-primary">
                    {testing ? <Loader2 size={14} className="settings-loading-icon" /> : <Database size={14} />}
                    {testing ? "Analyzing..." : "Verify DB Connection"}
                  </button>
                </>
              )}

              {activeTab === "whatsapp" && (
                <div className="settings-form">
                  <InputGroup name="whatsapp_business_id" label="WABA ID" defaultValue={initialData?.wabaId} />
                  <InputGroup name="whatsapp_phone_id" label="Phone ID" defaultValue={initialData?.phoneNumberId} />
                  <InputGroup name="whatsapp_token" label="Permanent Access Token" type="text" autoComplete="off" defaultValue={initialData?.metaToken} />
                  <button
                    type="button"
                    onClick={handleFetchWhatsApp}
                    className={`settings-btn-success ${isWaVerified ? 'settings-btn-success-verified' : ''}`}
                  >
                    {testing ? <Loader2 size={14} className="settings-loading-icon" /> : <MessageSquare size={14} />}
                    {testing ? "Syncing Meta..." : "Sync Templates"}
                  </button>
                </div>
              )}
            </form>

            <div className="settings-panel">
              <div className="settings-panel-header">
                <h4 className="settings-panel-title">
                  {activeTab === "db" ? <Table size={12} /> : <MessageSquare size={12} />}
                  {activeTab === "db" ? "Detected Schema" : "Live Meta Templates"}
                </h4>
                {activeTab === "whatsapp" && (
                  <div className="settings-search-wrapper">
                    <Search className="settings-search-icon" size={14} />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      className="settings-search-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="settings-panel-content">
                {activeTab === "db" && isConnected && dbTables.map((table) => <ItemRow key={table} text={table} />)}
                {activeTab === "whatsapp" && filteredTemplates.map((tmpl: any) => (
                  <div key={tmpl.id} className="settings-template-card">
                    <div className="settings-template-header">
                      <span className="settings-template-name">{tmpl.name}</span>
                      <span className="settings-template-status">{tmpl.status}</span>
                    </div>
                    <p className="settings-template-body">
                      {tmpl.components.find((c: any) => c.type === "BODY")?.text}
                    </p>
                    {tmpl.status === "APPROVED" && (
                      <button onClick={() => handleSendTestMessage(tmpl)} className="settings-template-btn">
                        <Send size={10} /> Send Test WhatsApp
                      </button>
                    )}
                  </div>
                ))}
                {((activeTab === "db" && !isConnected) || (activeTab === "whatsapp" && !isWaVerified)) && !testing && <EmptyState text={`Sync ${activeTab.toUpperCase()} to view content`} />}
                {testing && <LoadingState text="Accessing remote data..." />}
              </div>
            </div>
          </div>

          <div className="settings-save-wrapper">
            <button onClick={handleSave} disabled={saving} className="settings-btn-save">
              {saving ? <Loader2 size={14} className="settings-loading-icon" /> : <Save size={14} />}
              {saving ? "Storing..." : "Save Config"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function InputGroup({ label, placeholder, name, type = "text", defaultValue, autoComplete = "on" }: any) {
  return (
    <div className="settings-input-wrapper">
      <label className="settings-input-label">{label}</label>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        key={defaultValue}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="settings-input-field"
      />
    </div>
  );
}

function ItemRow({ text }: { text: string }) {
  return (
    <div className="settings-item-row">
      <CheckCircle size={14} className="settings-item-icon" /> {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="settings-empty-state">
      <AlertCircle size={32} className="settings-empty-icon" />
      <p className="settings-empty-text">{text}</p>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="settings-loading-state">
      <Loader2 size={32} className="settings-loading-icon" />
      <p className="settings-loading-text">{text}</p>
    </div>
  );
}