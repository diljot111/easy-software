"use client";

import { useEffect, useState } from "react";
import { getAllClients, createClient } from "../../actions/client"; // Ensure createClient is exported from actions
import { Loader2, ChevronDown, UserPlus, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";

export default function ClientManagement() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  
  // 🔹 New State for Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔹 Fetch all clients from DB
  async function fetchClients() {
    setLoading(true);
    try {
      const result = await getAllClients();
      if (!result.success) {
        throw new Error(result.error);
      }
      setClients(result.clients || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch clients");
      setClients([]);
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

  // 🔹 Handle Form Submission
  async function handleAddClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    
    try {
      const result = await createClient(formData);
      if (result.success) {
        toast.success("Client added successfully");
        setIsModalOpen(false);
        fetchClients(); // Refresh list
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
    <main className="min-h-screen bg-white text-slate-900 w-full">
      <Toaster position="top-right" />

      {/* 🔹 ADD CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold uppercase mb-6">Add New Client</h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              <input name="name" required placeholder="Full Name" className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 ring-blue-600" />
              <input name="email" type="email" required placeholder="Email Address" className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 ring-blue-600" />
              <input name="phone" required placeholder="Phone Number" className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 ring-blue-600" />
              <button disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest flex justify-center items-center">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Create Client"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-full px-6 md:px-12 py-10">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight">
              Client Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              All registered clients from the system
            </p>
          </div>
          {/* 🔹 NEW CLIENT BUTTON */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <UserPlus size={16} /> New Client
          </button>
        </header>

        {/* TABLE */}
        <div className="border border-slate-200 rounded-sm w-full overflow-visible">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-slate-300" size={26} />
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold">
                    No clients found
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{client.name ?? "Unnamed Client"}</div>
                      <div className="text-slate-400">{client.email ?? "No email"}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{client.cont ?? "No phone"}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(client.doj).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${client.active === 1 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                        {client.active === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right overflow-visible">
                      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === client.id ? null : client.id)}
                          className="bg-blue-600 text-white text-[10px] font-bold px-4 py-2 rounded hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                          MANAGE <ChevronDown size={12} />
                        </button>
                        {openDropdown === client.id && (
                          <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded shadow-xl z-50 py-1">
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
    <Link href={href} className="block px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors uppercase tracking-tight">
      {children}
    </Link>
  );
}