"use client";
import { useState, useEffect } from "react";
import { createEasyTeamMember, getAllUsers } from "../../actions/admin";
import { UserPlus, Loader2, X, Mail, Phone, Lock, ShieldCheck } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function EmployeeManagement() {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchEmployees() {
    const result = await getAllUsers();
    if (result.success) {
      // Logic: If EASY_TEAM filter is failing, we show all users to verify data
      setEmployees(result.members || []);
    } else {
      toast.error("Failed to fetch employee list.");
    }
  }

  useEffect(() => { fetchEmployees(); }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const result = await createEasyTeamMember(new FormData(event.currentTarget));
    if (result.success) {
      toast.success(result.message);
      setIsModalOpen(false);
      fetchEmployees();
    } else { 
      toast.error(result.error); 
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <Toaster richColors position="top-center" />
      
      {/* --- SIMPLIFIED MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-sm">
          <section className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400">
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-slate-900 mb-6">Add Staff Member</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input name="name" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 ring-blue-600" placeholder="Full Name" />
              <input name="email" type="email" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 ring-blue-600" placeholder="Email" />
              <input name="phone" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 ring-blue-600" placeholder="Phone Number" />
              <input name="password" type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 ring-blue-600" placeholder="Password" />
              
              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold text-white transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Save Employee"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* --- CONTENT --- */}
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Accounts</h1>
            <p className="text-slate-500 text-xs font-medium mt-1">Manage team access and permissions</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm">
            Add New Staff
          </button>
        </header>

        <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-8 py-4">Name</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.length === 0 ? (
                <tr><td colSpan={3} className="p-10 text-center text-slate-400">No employees found.</td></tr>
              ) : (
                employees.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50">
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        ID: {String(user.id).slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{user.role}</span>
                    </td>
                    <td className="px-8 py-5 text-slate-500 text-xs">
                      <p>{user.email}</p>
                      <p>{user.phone}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}