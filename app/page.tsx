"use client";
import { useState, useRef, useEffect } from "react";
import { getDatabaseTables, getTableData, checkForNewEntries, getInitialIds } from "./actions";
import { Database, Server, Key, User, Table, Loader2, X, Eye, Globe, Bell, AlertTriangle } from "lucide-react";
import { Toaster, toast } from "sonner";

export default function DBExplorer() {
  const [tables, setTables] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isWatching, setIsWatching] = useState(false);
  const [lastIds, setLastIds] = useState<Record<string, number>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // AUTOMATED WATCHER (TRUE NEW ENTRIES ONLY)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWatching && formRef.current) {
      interval = setInterval(async () => {
        const formData = new FormData(formRef.current!);
        const result = await checkForNewEntries(formData, lastIds);
        if (result.success && result.newEntries && result.newEntries.length > 0) {
          result.newEntries.forEach((entry) => {
            const actualId = entry.data[entry.pkField];
            toast.success(`NEW ENTRY in ${entry.tableName}`, {
              description: `New Record ID: ${actualId}`,
              icon: <Bell className="text-emerald-500" size={16} />,
            });
            setLastIds(prev => ({ ...prev, [entry.tableName]: actualId }));
          });
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isWatching, lastIds]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    
    const formData = new FormData(event.currentTarget);
    const initResult = await getInitialIds(formData);
    const tableResult = await getDatabaseTables(formData);

    if (tableResult.success && initResult.success) {
      setTables(tableResult.tables || []);
      setLastIds(initResult.initialIds || {}); // Silences old data
      setIsWatching(true);
      toast.success("Connected & Monitoring for NEW entries.");
    } else {
      const errMsg = tableResult.error || initResult.error;
      setError(errMsg);
      toast.error(errMsg, { icon: <AlertTriangle /> });
    }
    setLoading(false);
  }

  async function handleViewTable(tableName: string) {
    if (!formRef.current) return;
    setLoading(true);
    setSelectedTable(tableName);
    const result = await getTableData(new FormData(formRef.current), tableName);
    if (result.success) setTableData(result.data);
    else {
      setError(result.error);
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <Toaster position="top-right" theme="dark" richColors closeButton />
      <div className="max-w-[1400px] mx-auto space-y-6">
        <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
          {isWatching && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse" />}
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
               <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Server size={14}/> Server Name</label>
                <input name="serverName" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:ring-2 ring-blue-500 outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Globe size={14}/> IP Address</label>
                <input name="ip" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:ring-2 ring-blue-500 outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Database size={14}/> DB Name</label>
                <input name="dbName" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:ring-2 ring-blue-500 outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><User size={14}/> DB User</label>
                <input name="dbUser" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:ring-2 ring-blue-500 outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Key size={14}/> DB Password</label>
                <input name="dbPassword" type="password" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:ring-2 ring-blue-500 outline-none" />
              </div>
            </div>
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-all">
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Connect & Start Monitoring"}
            </button>
          </form>
          {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium flex items-center gap-2">
            <AlertTriangle size={16}/> {error}
          </div>}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            {tables.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                <h3 className="text-[10px] font-black text-slate-600 uppercase mb-4 tracking-widest px-2 flex justify-between">
                  Tables {isWatching && <span className="text-emerald-500 animate-pulse font-bold tracking-tighter">● LIVE</span>}
                </h3>
                {tables.map(t => (
                  <button key={t} onClick={() => handleViewTable(t)} className={`w-full text-left mb-1.5 p-3 rounded-xl text-xs font-bold flex justify-between items-center transition-all ${selectedTable === t ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                    <span className="truncate">{t}</span>
                    <Eye size={14} className={selectedTable === t ? 'opacity-100' : 'opacity-0'} />
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="lg:col-span-3">
             {tableData.length > 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4">
                <div className="p-4 bg-slate-800/40 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-blue-400 text-sm flex items-center gap-2"><Table size={16}/> {selectedTable}</h3>
                  <button onClick={() => setTableData([])}><X size={18} className="text-slate-500 hover:text-white"/></button>
                </div>
                <div className="overflow-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-slate-950">
                      <tr>
                        {Object.keys(tableData[0]).map(k => (
                          <th key={k} className="p-4 border-b border-slate-800 text-slate-500 uppercase tracking-widest">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {tableData.map((row, i) => (
                        <tr key={i} className="hover:bg-blue-500/5 transition-colors group">
                          {Object.values(row).map((v: any, j) => (
                            <td key={j} className="p-4 text-slate-400 group-hover:text-slate-200 whitespace-nowrap">{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-700 bg-slate-900/10 text-center px-6">
                <Database size={60} className="mb-4 opacity-5" />
                <p className="font-medium italic tracking-tight italic">Waiting for connection or new entries...</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}