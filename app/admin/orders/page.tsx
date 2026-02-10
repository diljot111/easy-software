"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { getAppointmentsAndBills } from "../../actions/order";

/* ---------------- TYPES ---------------- */

type ClientInfo = {
  name: string | null;
  cont: string | null;
};

type Appointment = {
  id: number;
  inv: number;
  status: string | null;
  details: string | null;
  appdate: Date | null;
  clientInfo: ClientInfo | null;
};

type Bill = {
  id: number;
  inv: number;
  total: number | null;
  due: number | null;
  status: number | null;
  clientInfo: ClientInfo | null;
};

/* ---------------- PAGE ---------------- */

export default function OrdersPage() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  async function loadData() {
    try {
      const res = await getAppointmentsAndBills();

      if (!res.success) {
        throw new Error(res.error);
      }

      setAppointments(res.appointments ?? []);
      setBills(res.bills ?? []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load appointments & bills");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // 🔄 auto refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-8">
      <Toaster position="top-right" />

      <header className="mb-6">
        <h1 className="text-xl font-bold uppercase">
          Appointments & Orders
        </h1>
        <p className="text-xs text-slate-500">
          Live appointments and newly generated bills
        </p>
      </header>

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="animate-spin mx-auto text-slate-300" size={28} />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <AppointmentsTable data={appointments} />
          <BillsTable data={bills} />
        </div>
      )}
    </main>
  );
}

/* ---------------- APPOINTMENTS TABLE ---------------- */

function AppointmentsTable({ data }: { data: Appointment[] }) {
  return (
    <div className="border border-slate-200 rounded">
      <h2 className="text-xs font-bold uppercase px-4 py-3 border-b">
        Appointments (Live)
      </h2>

      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
          <tr>
            <th className="px-4 py-2">Ref</th>
            <th className="px-4 py-2">Client</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Purpose</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-10 text-center text-slate-400">
                No appointments
              </td>
            </tr>
          ) : (
            data.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2 font-bold">#{a.inv}</td>

                <td className="px-4 py-2">
                  {a.clientInfo?.name ?? "Unknown"}
                </td>

                <td className="px-4 py-2">
                  {a.clientInfo?.cont ?? "—"}
                </td>

                <td className="px-4 py-2">
                  {a.details ?? "Service"}
                </td>

                <td className="px-4 py-2">
                  <StatusBadge status={a.status ?? "Pending"} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- BILLS TABLE ---------------- */

function BillsTable({ data }: { data: Bill[] }) {
  return (
    <div className="border border-slate-200 rounded">
      <h2 className="text-xs font-bold uppercase px-4 py-3 border-b">
        New Bills (Orders)
      </h2>

      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
          <tr>
            <th className="px-4 py-2">Invoice</th>
            <th className="px-4 py-2">Client</th>
            <th className="px-4 py-2">Total</th>
            <th className="px-4 py-2">Due</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-10 text-center text-slate-400">
                No bills
              </td>
            </tr>
          ) : (
            data.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-2 font-bold">#{b.inv}</td>

                <td className="px-4 py-2">
                  {b.clientInfo?.name ?? "Unknown"}
                </td>

                <td className="px-4 py-2">₹{b.total ?? 0}</td>

                <td className="px-4 py-2">₹{b.due}</td>

                <td className="px-4 py-2">
                  <StatusBadge status={String(b.status ?? "—")} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- STATUS BADGE ---------------- */

function StatusBadge({ status }: { status: string }) {
  const color =
    status.toLowerCase() === "paid"
      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
      : status.toLowerCase() === "pending"
      ? "bg-yellow-50 text-yellow-600 border-yellow-100"
      : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${color}`}
    >
      {status}
    </span>
  );
}
