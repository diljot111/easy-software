"use client";
import { useParams } from "next/navigation";
import { ChevronLeft, History, Download, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ClientLogsPage() {
  const { id } = useParams();

  // UPDATED: All "FAILED" instances changed to "ERROR" for a consolidated error system
  const logs = [
    { id: 1, type: "WHATSAPP", status: "DELIVERED", details: "Membership renewal alert sent", time: "2026-02-02 11:45" },
    { id: 2, type: "SMS", status: "ERROR", details: "Invalid phone format in legacy DB", time: "2026-02-02 11:30" },
    { id: 3, type: "MAIL", status: "DELIVERED", details: "Monthly invoice delivery", time: "2026-02-02 10:15" },
    { id: 4, type: "DATABASE", status: "ERROR", details: "SQL Connection Timeout - Host 127.0.0.1", time: "2026-02-02 09:00" },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans antialiased w-full">
      <div className="max-w-full mx-auto px-6 md:px-12 py-10">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">
          <Link href="/admin/clients" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <ChevronLeft size={12} /> Clients
          </Link>
          <span>/</span>
          <Link href={`/admin/clients/${id}/settings`} className="hover:text-blue-600 transition-colors">Config</Link>
          <span>/</span>
          <span className="text-slate-900 font-black tracking-tight">Audit Logs</span>
        </nav>

        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight italic">Activity Logs</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium italic">
              Delivery Tracking for Client ID: <span className="text-blue-600 font-bold">{id}</span>
            </p>
          </div>
          <button className="bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-bold px-4 py-2 rounded uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2">
            <Download size={12} /> Export CSV
          </button>
        </header>

        {/* --- FULL WIDTH LOGS TABLE --- */}
        <div className="border border-slate-200 rounded-sm w-full overflow-hidden">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black">
              <tr>
                <th className="px-6 py-4">Module</th>
                <th className="px-6 py-4">Delivery Status</th>
                <th className="px-6 py-4">Event Details</th>
                <th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 tracking-tighter">
                    {log.type}
                  </td>
                  <td className="px-6 py-4">
                    {/* UPDATED: Logic now only checks for ERROR or DELIVERED */}
                    <span className={`inline-flex items-center gap-1.5 font-black uppercase text-[9px] px-2 py-0.5 rounded-full border ${
                      log.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      log.status === 'ERROR' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                      {log.status === 'DELIVERED' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium italic">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400 font-mono">
                    {log.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- MINIMALIST FOOTER STATUS --- */}
        <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          <History size={12} /> Auto-refreshing every 30 seconds
        </div>
      </div>
    </main>
  );
}