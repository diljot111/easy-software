"use client";
import { useState } from "react";
import { 
  History, Search, Filter, Download, 
  Terminal, CheckCircle2, AlertCircle, Clock 
} from "lucide-react";

export default function LogsPage() {
  const [filter, setFilter] = useState("all");

  const logs = [
    { id: 1, event: "WhatsApp Trigger", user: "Diljot", status: "success", time: "2 mins ago", details: "Notification sent to Armaan" },
    { id: 2, event: "SQL Sync", user: "System", status: "success", time: "15 mins ago", details: "Legacy DB table 'bill_1' synced" },
    { id: 3, event: "Client Added", user: "Super Admin", status: "info", time: "1 hour ago", details: "New client 'Rahul' registered" },
    { id: 4, event: "Auth Failure", user: "Unknown", status: "error", time: "3 hours ago", details: "Failed login attempt from IP 192.168.1.1" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold bold text-slate-900 uppercase tracking-tighter">System Logs</h1>
            <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">
              <History size={16} className="text-blue-500" /> Real-time audit trail of all platform activities.
            </p>
          </div>
          <button className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all text-slate-600 shadow-sm">
            <Download size={16} /> Export CSV
          </button>
        </header>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              placeholder="Search logs by event or user..." 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 ring-blue-500 transition-all"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">All Logs</button>
            <button className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50">Errors</button>
            <button className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50">Automation</button>
          </div>
        </div>

        {/* Logs Table */}
        <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-[0.2em] font-black border-b border-slate-200">
              <tr>
                <th className="p-5">Event</th>
                <th className="p-5">User</th>
                <th className="p-5">Details</th>
                <th className="p-5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      {log.status === "success" && <CheckCircle2 size={16} className="text-emerald-500" />}
                      {log.status === "error" && <AlertCircle size={16} className="text-red-500" />}
                      {log.status === "info" && <Terminal size={16} className="text-blue-500" />}
                      <span className="font-bold text-slate-700">{log.event}</span>
                    </div>
                  </td>
                  <td className="p-5 font-medium text-slate-500">{log.user}</td>
                  <td className="p-5 text-slate-400 font-medium text-xs bold">{log.details}</td>
                  <td className="p-5 text-right">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                      <Clock size={10} /> {log.time}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}