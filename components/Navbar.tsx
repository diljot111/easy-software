"use client";
import { usePathname } from "next/navigation";
import { logoutUser } from "@/app/actions/logout";
import { 
  Terminal, ShieldCheck, Users, ShoppingBag, 
  Activity, LogOut, LayoutDashboard, UserCircle2
} from "lucide-react";

export default function Navbar({ role }: { role: string }) {
  const pathname = usePathname();

  const isAdmin = role === "SUPER_ADMIN";
  const isTeam = role === "EASY_TEAM";

  return (
    <nav className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          {/* <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-200">
            <Terminal size={20} />
          </div> */}
          <div>
            <h1 className="text-xl font-bold tracking-tighter bold text-slate-900 leading-none">
              EASY AUTOMATIONS
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
              <Activity size={10} className="text-emerald-500 animate-pulse" /> 
              {role.replace("_", " ")} SESSION
            </p>
          </div>
        </div>

        {/* --- SMART NAVIGATION LINKS --- */}
        {/* <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200"> */}
          
          {/* 1. Dashboard Overview */}
          {/* {(isAdmin || isTeam) && (
            <NavLink 
              href={isAdmin ? "/admin/dashboard" : "/team/dashboard"} 
              active={pathname === "/admin/dashboard" || pathname === "/team/dashboard"}
            >
              <LayoutDashboard size={16} /> Dashboard
            </NavLink>
          )} */}

          {/* 2. Clients Management */}
          {/* <NavLink 
            href={isAdmin ? "/admin/clients" : "/team/clients"} 
            active={pathname.includes("/clients")}
          >
            <ShoppingBag size={16} /> Clients
          </NavLink> */}

          {/* 3. Employees Management */}
          {/* {isAdmin && (
            <NavLink href="/admin/employees" active={pathname.includes("/employees")}>
              <UserCircle2 size={16} /> Employees
            </NavLink>
          )}
        </div> */}

        {/* Global Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => logoutUser()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all text-sm font-bold shadow-sm group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> 
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children, active }: { href: string, children: React.ReactNode, active: boolean }) {
  return (
    <a 
      href={href} 
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
        active 
          ? 'bg-blue-600 text-white shadow-md shadow-blue-200 translate-y-[-1px]' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-white'
      }`}
    >
      {children}
    </a>
  );
}