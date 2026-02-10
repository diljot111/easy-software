"use client";

import { useEffect, useState } from "react";
import { getAllClients, createClient } from "../../actions/client";
import { Loader2, ChevronDown, UserPlus, X, Search } from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import "./clients.css";

export default function ClientManagement() {
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchClients() {
    setLoading(true);
    try {
      const result = await getAllClients();
      if (!result.success) {
        throw new Error(result.error);
      }
      setClients(result.clients || []);
      setFilteredClients(result.clients || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch clients");
      setClients([]);
      setFilteredClients([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();

    const closeDropdown = () => setOpenDropdown(null);
    window.addEventListener("click", closeDropdown);
    return () => window.removeEventListener("click", closeDropdown);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredClients(clients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = clients.filter((client) => {
        const name = (client.name ?? "").toLowerCase();
        const email = (client.email ?? "").toLowerCase();
        return name.includes(query) || email.includes(query);
      });
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);

  async function handleAddClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await createClient(formData);
      if (result.success) {
        toast.success("Client added successfully");
        setIsModalOpen(false);
        fetchClients();
      } else {
        toast.error(result.error || "Failed to add client");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="clients-main">
      <Toaster position="top-right" />

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} className="modal-close">
              <X size={20} />
            </button>
            <h2 className="modal-title">Add New Client</h2>
            <form onSubmit={handleAddClient} className="modal-form">
              <input name="name" required placeholder="Full Name" className="form-input" />
              <input name="email" type="email" required placeholder="Email Address" className="form-input" />
              <input name="number" required placeholder="Reference Client ID" className="form-input" />
              <input name="phone" required placeholder="Phone Number" className="form-input" />
              <button disabled={isSubmitting} className="btn-submit">
                {isSubmitting ? <Loader2 className="loading-spinner" size={18} /> : "Create Client"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="clients-container">
        <header className="clients-header">
          <div className="clients-header-info">
            <h1>Client Directory</h1>
            <p>All registered clients from the system</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-new-client">
            <UserPlus size={16} /> New Client
          </button>
        </header>

        <div className="search-container">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="table-wrapper">
          <table className="clients-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="loading-cell">
                    <Loader2 className="loading-spinner" size={26} />
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    {searchQuery ? "No clients match your search" : "No clients found"}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="client-name">{client.name ?? "Unnamed Client"}</div>
                      <div className="client-email">{client.email ?? "No email"}</div>
                    </td>
                    <td className="client-contact">{client.cont ?? "No phone"}</td>
                    <td className="client-date">{new Date(client.doj).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${client.active === 1 ? "status-active" : "status-inactive"}`}>
                        {client.active === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="actions-container" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === client.id ? null : client.id)}
                          className="btn-manage"
                        >
                          MANAGE <ChevronDown size={12} />
                        </button>
                        {openDropdown === client.id && (
                          <div className="dropdown-menu">
                            <DropdownLink href={`/admin/clients/${client.id}/settings`}>Settings</DropdownLink>
                            <DropdownLink href={`/admin/clients/${client.id}/automation`}>Automations</DropdownLink>
                            <DropdownLink href={`/admin/clients/${client.id}/logs`}>Logs</DropdownLink>
                            <DropdownLink href={`/admin/clients/${client.id}/reports`}>Reports</DropdownLink>
                          </div>
                        )}
                      </div>
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

function DropdownLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="dropdown-link">
      {children}
    </Link>
  );
}