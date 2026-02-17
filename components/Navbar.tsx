"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, LayoutDashboard, LogOut, UserCog, Briefcase } from "lucide-react";
// Define what the Navbar expects to receive
interface NavbarProps {
  role?: string;
}

export default function Navbar({ role }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 text-slate-900">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/admin/dashboard" className="flex items-center gap-2 group">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <span className="font-black text-sm uppercase tracking-tighter">
            EasyK <span className="text-blue-600">{role || 'Admin'}</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {/* Only show these if role is admin */}
          {role === 'admin' && (
            <>
              <Link href="/admin/clients" className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 ${isActive('/admin/clients') ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>
                <Briefcase size={15} /> Clients
              </Link>
              <Link href="/admin/employees" className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 ${isActive('/admin/employees') ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>
                <UserCog size={15} /> Employees
              </Link>
            </>
          )}

          <div className="w-px h-4 bg-slate-200 mx-3" />

          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-lg">
            <LogOut size={14} /> Exit
          </button>
        </div>
      </div>
    </nav>
  );
}