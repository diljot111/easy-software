"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, Loader2, Edit, Save, X, Search } from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import {
  getClientAutomations,
  triggerAutomationManual,
  deleteAutomationAction
} from "../../../../actions/automation-logic";
import { saveAutomationAction } from "../../../../actions/automation-logic";
import { getClientConfig } from "../../../../actions/client";
import "./automation.css";

export default function ClientAutomationList() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [automations, setAutomations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<{ name: string; status: string }[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const salonEvents = [
    "New appointment", "Appointment re-schedule", "Appointment cancel",
    "Appointment reminder before 30 mins of appopintment", "New bill",
    "Reward points granted / earned", "membership buy",
    "Feedback after 2 mins of new bill generation", "Service reminder"
  ];

  async function loadAutomations() {
    setLoading(true);
    const data = await getClientAutomations(id as string);
    setAutomations(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function loadTemplates() {
    try {
      const configRes = await getClientConfig(id as string);
      if (!configRes.success || !configRes.config) {
        toast.error("Please configure WhatsApp settings first.");
        return;
      }

      const { wabaId, metaToken } = configRes.config;
      const cleanToken = metaToken?.trim().replace(/[\n\r]/g, "");

      if (!wabaId || !cleanToken) {
        toast.error("Missing WABA ID or Token in Settings.");
        return;
      }

      const metaRes = await fetch(
        `https://graph.facebook.com/v18.0/${wabaId}/message_templates?limit=500`,
        { headers: { Authorization: `Bearer ${cleanToken}` } }
      );

      const metaData = await metaRes.json();
      if (metaData.error) throw new Error(metaData.error.message);

      const approved = metaData.data?.filter((t: any) => t.status === "APPROVED") || [];
      setTemplates(approved);

    } catch (err: any) {
      console.error("Template Error:", err);
      toast.error(`Meta Error: ${err.message}`);
    }
  }

  useEffect(() => {
    loadAutomations();
    loadTemplates();
  }, [id]);

  const filteredAutomations = useMemo(() => {
    if (!searchTerm) return automations;
    return automations.filter(automation =>
      automation.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      automation.templateName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [automations, searchTerm]);

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

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;

    setAutomations((prev) => prev.filter((a) => a.id !== ruleId));
    toast.info("Deleting automation...");

    const result = await deleteAutomationAction(ruleId, id as string);

    if (result.success) {
      toast.success("Automation deleted successfully.");
    } else {
      toast.error("Failed to delete.");
      loadAutomations();
    }
  };

  const handleCreateNew = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingId("new");
    const formData = new FormData(e.currentTarget);

    const result = await saveAutomationAction(id as string, formData);
    setSavingId(null);

    if (result && 'error' in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Automation created successfully!");
      setIsCreating(false);
      loadAutomations();
    }
  };

  const handleEdit = (automationId: string) => {
    setEditingId(automationId);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>, automationId: string) => {
    e.preventDefault();
    setSavingId(automationId);

    await deleteAutomationAction(automationId, id as string);

    const formData = new FormData(e.currentTarget);
    const result = await saveAutomationAction(id as string, formData);

    setSavingId(null);

    if (result && 'error' in result && result.error) {
      toast.error(result.error);
      loadAutomations();
    } else {
      toast.success("Automation updated successfully!");
      setEditingId(null);
      loadAutomations();
    }
  };

  return (
    <main className="automation-main">
      <Toaster position="top-right" />

      <div className="automation-wrapper">
        <header className="automation-header">
          <div className="automation-header-info">
            <h1>Client Automations</h1>
            <p>
              System ID: <span className="automation-header-info-id">{id}</span>
            </p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="automation-btn-add"
            disabled={isCreating}
          >
            <Plus size={14} /> Add Automation
          </button>
        </header>

        <div className="automation-search-wrapper">
          <Search className="automation-search-icon" size={16} />
          <input
            type="text"
            placeholder="Search by trigger event or template name..."
            className="automation-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="automation-table-wrapper">
          <table className="automation-table">
            <thead>
              <tr>
                <th>Trigger Event</th>
                <th>WhatsApp Template</th>
                <th>Configured Delay</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New Row Creation Form */}
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
                      <span className="automation-form-label-small">then send</span>
                      <select form="create-form" name="templateName" required className="automation-form-select-column">
                        <option value="">Choose Template</option>
                        {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="automation-form-field-column">
                      <span className="automation-form-label-small">wait for</span>
                      <div className="automation-delay-inputs">
                        <input
                          form="create-form"
                          name="delayValue"
                          type="number"
                          defaultValue="0"
                          min="0"
                          className="automation-form-input-number-column"
                        />
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

              {loading ? (
                <tr>
                  <td colSpan={4} className="automation-loading-cell">
                    <Loader2 className="automation-loading-spinner" size={24} />
                  </td>
                </tr>
              ) : automations.length === 0 && !isCreating ? (
                <tr>
                  <td colSpan={4} className="automation-empty-cell">
                    No active salon automations found.
                  </td>
                </tr>
              ) : (
                filteredAutomations.map((item) => (
                  editingId === item.id ? (
                    // Edit Mode Row
                    <tr key={item.id} className="automation-edit-row">
                      <td>
                        <form onSubmit={(e) => handleSaveEdit(e, item.id)} id={`edit-form-${item.id}`} className="automation-column-form">
                          <div className="automation-form-field-column">
                            <span className="automation-form-label-small">When</span>
                            <select name="eventType" required defaultValue={item.eventType} className="automation-form-select-column">
                              <option value="">Select Event</option>
                              {salonEvents.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                          </div>
                        </form>
                      </td>
                      <td>
                        <div className="automation-form-field-column">
                          <span className="automation-form-label-small">then send</span>
                          <select form={`edit-form-${item.id}`} name="templateName" required defaultValue={item.templateName} className="automation-form-select-column">
                            <option value="">Choose Template</option>
                            {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                          </select>
                        </div>
                      </td>
                      <td>
                        <div className="automation-form-field-column">
                          <span className="automation-form-label-small">wait for</span>
                          <div className="automation-delay-inputs">
                            <input
                              form={`edit-form-${item.id}`}
                              name="delayValue"
                              type="number"
                              defaultValue={item.delayValue}
                              min="0"
                              className="automation-form-input-number-column"
                            />
                            <select form={`edit-form-${item.id}`} name="delayUnit" defaultValue={item.delayUnit} className="automation-form-select-small-column">
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
                          <button type="button" onClick={handleCancelEdit} className="automation-btn-cancel-inline">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // Normal Display Row
                    <tr key={item.id}>
                      <td className="automation-event-cell">
                        {item.eventType}
                      </td>
                      <td className="automation-template-cell">
                        {item.templateName}
                      </td>
                      <td className="automation-delay-cell">
                        {item.delayValue} {item.delayUnit}
                      </td>
                      <td>
                        <div className="automation-actions-cell">
                          <button
                            disabled={executingId === item.id}
                            onClick={() => handleRunNow(item.id, item.eventType)}
                            className="automation-btn-test"
                          >
                            {executingId === item.id ? "Working..." : "Test Now"}
                          </button>

                          <button
                            onClick={() => handleEdit(item.id)}
                            className="automation-btn-edit"
                            title="Edit Automation"
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="automation-btn-delete"
                            title="Delete Rule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}