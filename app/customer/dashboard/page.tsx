"use client";
import { useState, useEffect } from "react";
import { getTableData } from "../../actions/database";
import { Database, Receipt, History, CreditCard, Activity, Bell } from "lucide-react";
import { Toaster, toast } from "sonner";

export default function ClientHub() {
  const [myBills, setMyBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real scenario, we would fetch data matching the logged-in user's name
  // For now, we load 'bill_1' as the primary client view
  useEffect(() => {
    async function fetchMyData() {
      setLoading(true);
      const result = await getTableData("bill_1");
      if (result.success) {
        setMyBills(result.data || []);
      } else {
        toast.error("Unable to load your billing history.");
      }
      setLoading(false);
    }
    fetchMyData();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <Toaster richColors position="top-center" />
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Simple Welcome Header */}
        <header className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight italic text-emerald-500">CLIENT HUB</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <History size={16} /> Track your gym memberships and payments
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Account Active</p>
          </div>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={<Receipt className="text-blue-400" />} title="Total Invoices" value={myBills.length.toString()} />
          <StatCard icon={<Activity className="text-emerald-400" />} title="Status" value="Active Member" />
          <StatCard icon={<CreditCard className="text-purple-400" />} title="Last Payment" value="Verified" />
        </div>

        {/* Personal Billing Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex items-center gap-2">
            <Database size={18} className="text-slate-500" />
            <h2 className="font-bold">Your Billing History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Reference</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {myBills.map((bill, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 text-slate-300">{bill.date || "N/A"}</td>
                    <td className="p-4 font-mono text-xs text-blue-400">{bill.id}</td>
                    <td className="p-4 font-bold text-slate-200">₹{bill.amount || "0"}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-md border border-emerald-500/20">
                        PAID
                      </span>
                    </td>
                  </tr>
                ))}
                {myBills.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-600 italic">No payment records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ icon, title, value }: { icon: any, title: string, value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center gap-4">
      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <p className="text-xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}