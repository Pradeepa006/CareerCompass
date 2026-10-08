import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber, interactiveCard } from "./Motion";
export { ContentSkeleton, InsightCard, ResponsiveChart, StatePanel } from "./InsightCard";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">{eyebrow}</p><h1 className="display mt-2 text-4xl font-extrabold sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 thin-copy">{description}</p></div>{action}</header>;
}

export function Metric({ label, value, detail, tone = "blue", animate = false }: { label: string; value: string | number; detail: string; tone?: "blue" | "pink" | "ink"; animate?: boolean }) {
  const color = tone === "blue" ? "bg-[#dbe9ff] text-[#28558e]" : tone === "pink" ? "bg-[#f6dfe6] text-[#a74f70]" : "bg-[#17233c] text-white";
  const numericValue = typeof value === "number" ? value : Number(value.replace(/[^0-9.-]/g, ""));
  return <motion.article initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.26 }} className={`soft-card rounded-2xl p-5 ${interactiveCard}`}><p className="eyebrow">{label}</p><div className="mt-5 flex items-end justify-between gap-3"><p className="display text-3xl font-extrabold">{animate && Number.isFinite(numericValue) ? <AnimatedNumber value={numericValue} /> : value}</p><span className={`grid h-8 w-8 place-items-center rounded-full ${color}`}><ArrowUpRight size={15}/></span></div><p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p></motion.article>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <section className="soft-card rounded-[1.7rem] p-8 text-center"><h2 className="display text-2xl font-extrabold">{title}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 thin-copy">{text}</p>{action && <div className="mt-6">{action}</div>}</section>;
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "pink" | "ink" }) {
  const colors = { blue: "bg-[#4e85ce]", pink: "bg-[#ca6b8c]", ink: "bg-[#17233c]" };
  const reducedMotion = useReducedMotion();
  return <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><motion.div initial={reducedMotion ? false : { width: "0%" }} whileInView={{ width: `${Math.max(0, Math.min(100, value))}%` }} viewport={{ once: true }} transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.23, 1, 0.32, 1] }} className={`h-full rounded-full ${colors[tone]}`} /></div>;
}
