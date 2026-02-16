"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, LayoutDashboard, LogOut, UserCog, Briefcase } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    // Add logic to clear cookies/session here if needed
    router.push("/login");
  };

  // Helper to highlight active link
  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/admin/dashboard" className="flex items-center gap-2 group">
          <div className="bg-blue-600 p-1.5 rounded-lg group-hover:rotate-6 transition-transform">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <span className="font-black text-sm uppercase tracking-tighter text-slate-900">
            EasyK <span className="text-blue-600">Admin</span>
          </span>
        </Link>

        {/* NAVIGATION LINKS */}
        <div className="flex items-center gap-1">
          <NavLink href="/admin/clients" active={isActive('/admin/clients')}>
            <Briefcase size={15} /> Clients
          </NavLink>
          
          <NavLink href="/admin/employees" active={isActive('/admin/employees')}>
            <UserCog size={15} /> Employees
          </NavLink>

          {/* DIVIDER */}
          <div className="w-px h-4 bg-slate-200 mx-3" />

          {/* LOGOUT */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut size={14} />
            Exit
          </button>
        </div>
      </div>
    </nav>
  );
}

// Sub-component for clean mapping
function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${
        active 
        ? 'bg-slate-100 text-blue-600' 
        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      {children}
    </Link>
  );
}