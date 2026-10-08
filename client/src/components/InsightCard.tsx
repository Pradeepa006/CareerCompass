import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { AlertCircle, CheckCircle2, Inbox, LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { ComponentProps } from "react";
import { interactiveCard } from "./Motion";

export function InsightCard({ eyebrow, title, description, action, children }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.26 }} className={`soft-card overflow-hidden rounded-[1.7rem] p-5 sm:p-6 ${interactiveCard}`}><header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow">{eyebrow ?? "Career insight"}</p><h2 className="display mt-1 text-xl font-extrabold">{title}</h2>{description && <p className="mt-2 max-w-xl text-sm leading-6 thin-copy">{description}</p>}</div>{action}</header><div className="mt-5">{children}</div></motion.section>;
}

export function ResponsiveChart({ config, children, label }: { config: ChartConfig; children: ComponentProps<typeof ChartContainer>["children"]; label: string }) {
  return <div aria-label={label} role="img"><ChartContainer config={config} className="h-[220px] w-full">{children}</ChartContainer></div>;
}

export function ContentSkeleton({ cards = 3, rows = 2 }: { cards?: number; rows?: number }) {
  return <section className="space-y-5" aria-label="Loading content" aria-busy="true"><div className="h-7 w-40 animate-pulse rounded-lg bg-slate-200" /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: cards }).map((_, index) => <div key={index} className="soft-card h-32 animate-pulse rounded-2xl bg-white/60" />)}</div><div className="soft-card space-y-3 rounded-[1.7rem] p-6">{Array.from({ length: rows }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div></section>;
}

export function StatePanel({ kind = "empty", title, description, action }: { kind?: "empty" | "error" | "success" | "loading"; title: string; description: string; action?: React.ReactNode }) {
  const icons = { empty: Inbox, error: AlertCircle, success: CheckCircle2, loading: LoaderCircle };
  const tones = { empty: "bg-[#edf3fe] text-[#315f9c]", error: "bg-[#ffe8eb] text-[#b14357]", success: "bg-[#e3f3e9] text-[#2e7550]", loading: "bg-[#fff0d4] text-[#986112]" };
  const Icon = icons[kind];
  return <section className="state-panel rounded-[1.7rem] p-8 text-center" role={kind === "error" ? "alert" : "status"}><span className={`mx-auto grid h-11 w-11 place-items-center rounded-2xl ${tones[kind]}`}><Icon size={20} className={kind === "loading" ? "animate-spin" : ""} /></span><h2 className="display mt-5 text-2xl font-extrabold">{title}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 thin-copy">{description}</p>{action && <div className="mt-6">{action}</div>}</section>;
}
