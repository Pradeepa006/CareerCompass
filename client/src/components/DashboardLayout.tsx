import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { BarChart3, BookOpenCheck, BriefcaseBusiness, Compass, LogOut, Map, Menu, ShieldCheck, Sparkles, TrendingUp, UserRound, X, CircleAlert } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import CareerAssistant from "./CareerAssistant";

const navigation = [
  { label: "Overview", path: "/dashboard", icon: BarChart3 },
  { label: "My profile", path: "/profile", icon: UserRound },
  { label: "Explore careers", path: "/careers", icon: Compass },
  { label: "Skill gap", path: "/skill-gap", icon: CircleAlert },
  { label: "Learning roadmap", path: "/roadmap", icon: BookOpenCheck },
  { label: "Career journey", path: "/journey", icon: Map },
  { label: "My analytics", path: "/analytics", icon: BarChart3 },
  { label: "Industry signals", path: "/trends", icon: TrendingUp },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  if (loading) return <div className="min-h-screen page-grid grid place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" /></div>;
  if (!user) return <div className="min-h-screen page-grid grid place-items-center p-6"><section className="soft-card max-w-md rounded-[2rem] p-9 text-center"><div className="mx-auto mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#dbe9ff] text-[#24579f]"><Compass size={24} /></div><h1 className="display text-3xl font-extrabold">Your compass awaits.</h1><p className="mt-3 thin-copy">Sign in to save your profile, generate career guidance, and track your learning roadmap.</p><button onClick={() => startLogin()} className="button-press mt-7 w-full rounded-xl bg-[#111827] px-5 py-3 font-semibold text-white">Sign in to CareerCompass</button></section></div>;
  const nav = [...navigation, ...(user.role === "admin" ? [{ label: "Control room", path: "/admin", icon: ShieldCheck }] : [])];
  const initials = (user.name || "Student").split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
  return <div className="min-h-screen bg-[#eef1f4] text-[#121722] lg:flex">
    <button onClick={() => setOpen(!open)} className="fixed right-5 top-5 z-40 grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm lg:hidden" aria-label="Toggle navigation">{open ? <X size={18} /> : <Menu size={18} />}</button>
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[274px] flex-col border-r border-slate-200 bg-[#fbfcfd] px-4 py-5 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <Link href="/dashboard" className="mb-10 flex items-center gap-3 px-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#17233c] text-white"><Sparkles size={18} /></span><span><strong className="display block text-lg font-extrabold tracking-tight">CareerCompass</strong><small className="eyebrow text-[.55rem]">Guidance system</small></span></Link>
      <nav className="space-y-1">{nav.map(item => { const Icon = item.icon; const active = location === item.path; return <Link key={item.path} href={item.path} onClick={() => setOpen(false)} data-active={active} className="nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"><Icon size={17} strokeWidth={active ? 2.4 : 1.8} />{item.label}</Link>; })}</nav>
      <div className="mt-auto rounded-2xl bg-[#edf3fe] p-4"><p className="eyebrow text-[#3965a5]">Remember</p><p className="mt-2 text-sm leading-5 text-[#32445f]">A suitability score estimates alignment with your present profile. It is not a guarantee.</p></div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl px-2 py-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#f1dce3] text-xs font-bold">{initials}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.name || "Student"}</p><p className="truncate text-xs text-slate-500">{user.role === "admin" ? "Administrator" : "Student"}</p></div><button onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Sign out"><LogOut size={16} /></button></div>
    </aside>
    <main className="min-w-0 flex-1 p-5 pt-20 lg:p-9">{children}</main>
    <CareerAssistant />
  </div>;
}
