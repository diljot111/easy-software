"use client";
import { useState, useEffect } from "react";
import { createCustomer, getAllUsers } from "../../actions/admin";
import { ShoppingBag, Loader2, X, UserCheck, ShieldAlert, Mail, Phone, Lock, User } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function TeamClientManagement() {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchClients() {
    const result = await getAllUsers();
    if (result.success) {
      // Show all customers in the directory
      const filtered = result.members?.filter((u: any) => u.role === "CUSTOMER") || [];
      setClients(filtered);
    }
  }

  useEffect(() => { fetchClients(); }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const result = await createCustomer(new FormData(event.currentTarget));
    if (result.success) {
      toast.success(result.message);
      setIsModalOpen(false);
      fetchClients();
    } else { toast.error(result.error); }
    setLoading(false);
  }

  return (
    // UPDATED: bg-slate-950 -> bg-slate-50, text-white -> text-slate-900
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <Toaster richColors position="top-center" />
      
      {/* --- ADD CUSTOMER MODAL (LIGHT THEME) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <section className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                <ShoppingBag size={20} />
              </div>
              <h2 className="text-xl font-bold italic text-slate-900">Register New Client</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-400" size={16} />
                <input name="name" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 ring-emerald-500 outline-none text-slate-900" placeholder="Full Name" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={16} />
                <input name="email" type="email" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 ring-emerald-500 outline-none text-slate-900" placeholder="Email Address" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-slate-400" size={16} />
                <input name="phone" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 ring-emerald-500 outline-none text-slate-900" placeholder="Phone Number" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={16} />
                <input name="password" type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 ring-emerald-500 outline-none text-slate-900" placeholder="Password" />
              </div>
              
              <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-xl font-bold text-white flex justify-center items-center gap-2 mt-6 transition-all shadow-lg shadow-emerald-200">
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Complete Registration"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* --- PAGE CONTENT --- */}
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold italic text-emerald-600 uppercase tracking-tighter">Clients</h1>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-100"
          >
            <ShoppingBag size={18} /> Add Client
          </button>
        </header>

        {/* CLIENT DIRECTORY TABLE */}
        <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="p-5">Client Name</th>
                <th className="p-5">Managed By</th>
                <th className="p-5">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5">
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">{user.email}</p>
                  </td>
                  <td className="p-5">
                    {user.createdBy ? (
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        {user.createdBy.role === 'SUPER_ADMIN' ? 
                          <ShieldAlert size={14} className="text-red-500"/> : 
                          <UserCheck size={14} className="text-blue-500"/>
                        }
                        <span>{user.createdBy.name}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Auto-Registered</span>
                    )}
                  </td>
                  <td className="p-5 text-slate-500 text-xs font-medium">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-slate-400 italic">No clients registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}