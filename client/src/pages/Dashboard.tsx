import { ContentSkeleton, InsightCard, Metric, PageHeader, ProgressBar, ResponsiveChart, StatePanel } from "@/components/PageChrome";
import { Reveal } from "@/components/Motion";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { ArrowRight, BookOpenCheck, BrainCircuit, Compass, Sparkles, Target, TrendingUp } from "lucide-react";
import { Link } from "wouter";

type Prediction = { careerId: number; careerName: string; domain: string; score: number; explanation: string };
type SavedAnalysis = { profileSummary: string; predictions: Prediction[] };

function parseAnalysis(value: unknown): SavedAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SavedAnalysis>;
  if (!Array.isArray(candidate.predictions) || typeof candidate.profileSummary !== "string") return null;
  const predictions = candidate.predictions.filter((item): item is Prediction => Boolean(item && typeof item.careerId === "number" && typeof item.careerName === "string" && typeof item.score === "number" && typeof item.explanation === "string"));
  return predictions.length ? { profileSummary: candidate.profileSummary, predictions } : null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const profile = trpc.profile.get.useQuery(undefined, { retry: false });
  const roadmap = trpc.career.roadmap.useQuery(undefined, { retry: false });
  const catalog = trpc.career.catalog.useQuery();
  const latestAnalysis = trpc.career.latestAnalysis.useQuery(undefined, { retry: false });
  if (profile.isLoading || roadmap.isLoading || latestAnalysis.isLoading) return <div className="mx-auto max-w-7xl"><ContentSkeleton cards={4} rows={3} /></div>;
  if (profile.error) return <div className="mx-auto max-w-4xl"><StatePanel kind="error" title="We could not load your workspace" description={profile.error.message} action={<Link href="/dashboard" className="button-press rounded-xl bg-[#17233c] px-4 py-3 text-sm font-semibold text-white">Try again</Link>} /></div>;

  const data = profile.data!;
  const current = roadmap.data;
  const analysis = parseAnalysis(latestAnalysis.data?.results);
  const topMatch = analysis?.predictions[0];
  const gaps = current?.gaps ?? [];
  const highPriority = gaps.filter(gap => gap.priority === "High");
  const nextItem = current?.roadmap?.items.find(item => item.status !== "completed");
  const chartData = analysis?.predictions.slice(0, 5).map(item => ({ name: item.careerName, score: item.score })) ?? [];
  const hasCareerContext = Boolean(data.profile && data.skills.length);

  return <div className="mx-auto max-w-7xl">
    <PageHeader eyebrow="Career intelligence workspace" title={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}.`} description="A focused view of your current alignment, the skill gaps that matter, and the next action that moves your chosen direction forward." action={<Link href="/profile" className="button-press inline-flex items-center gap-2 rounded-xl bg-[#17233c] px-4 py-3 text-sm font-semibold text-white">Refine profile <ArrowRight size={16} /></Link>} />

    <Reveal><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Profile completion" value={`${data.completion}%`} detail="Based on evidence you have added." tone="blue" animate /><Metric label="Skills captured" value={data.skills.length} detail="Recorded skills and proficiency levels." tone="pink" animate /><Metric label="Career readiness" value={current?.readiness.score ?? "—"} detail={current ? "An application-defined, target-specific indicator." : "Select a target to calculate readiness."} tone="ink" animate={Boolean(current)} /><Metric label="Priority gaps" value={current ? highPriority.length : "—"} detail={current ? "Required skills currently classified as high priority." : "Generated for a selected target career."} tone="pink" animate={Boolean(current)} /></section></Reveal>

    {!hasCareerContext ? <section className="mt-5"><StatePanel title="Build the context behind your recommendations." description="Add at least one skill or interest and tell us about your education or goals. CareerCompass uses only the profile details needed for its career analysis." action={<Link href="/profile" className="button-press inline-flex items-center gap-2 rounded-xl bg-[#17233c] px-4 py-3 text-sm font-semibold text-white">Complete profile <ArrowRight size={16} /></Link>} /></section> : <>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.18fr_.82fr]">
        <InsightCard eyebrow="Top career match" title={topMatch ? topMatch.careerName : "Your analysis is ready when you are."} description={topMatch ? "A model-derived suitability estimate based on your saved profile and the curated career catalog." : "Run the profile-aware analysis to receive up to five ranked career paths and concise explanations."} action={topMatch ? <span className="rounded-full bg-[#e5efff] px-3 py-1.5 text-xs font-bold text-[#315f9c]">{topMatch.score}% suitability</span> : undefined}>
          {topMatch ? <div className="rounded-2xl bg-[#17233c] p-5 text-white"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow text-slate-400">Model-derived rationale</p><p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">{topMatch.explanation}</p></div><BrainCircuit className="shrink-0 text-[#b7d2ff]" size={26} /></div><div className="mt-6 flex flex-wrap items-center gap-3"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-[#d8e7ff]">{topMatch.domain}</span><Link href="/careers" className="inline-flex items-center gap-2 text-sm font-bold text-white">Compare career paths <ArrowRight size={16} /></Link></div></div> : <StatePanel kind="empty" title="No career analysis yet" description="Your profile has enough context. Generate a saved analysis to see ranked matches here." action={<Link href="/careers" className="button-press inline-flex items-center gap-2 rounded-xl bg-[#17233c] px-4 py-3 text-sm font-semibold text-white"><Sparkles size={16} /> Analyze my career</Link>} />}
        </InsightCard>
        <InsightCard eyebrow="Next learning action" title={nextItem ? `Learn ${nextItem.skillName}` : current ? "Your roadmap is clear." : "Set a target direction."} description={nextItem ? nextItem.description || "This is the next incomplete item in your personalized roadmap." : current ? "All roadmap items are complete. Review your target requirements and profile to keep the signal current." : "Target career mode lets you choose any catalog role—not only the top recommendation."} action={<BookOpenCheck className="text-[#315f9c]" size={22} />}>
          {current ? <><div className="rounded-2xl bg-[#f6f8fb] p-4"><div className="flex justify-between gap-4 text-xs font-semibold text-slate-600"><span>Roadmap progress</span><span>{current.readiness.roadmapCompletion}%</span></div><div className="mt-3"><ProgressBar value={current.readiness.roadmapCompletion} tone="blue" /></div></div><Link href="/roadmap" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#315f9c]">Open learning journey <ArrowRight size={16} /></Link></> : <Link href="/careers" className="button-press inline-flex items-center gap-2 rounded-xl bg-[#edf3fe] px-4 py-3 text-sm font-bold text-[#315f9c]">Choose a target career <Target size={16} /></Link>}
        </InsightCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
        <InsightCard eyebrow="Career matches" title="How your analysis currently ranks paths" description="Suitability values are produced by the saved model analysis. They represent alignment, not a promise of career outcomes." action={<Compass className="text-[#315f9c]" size={22} />}>
          {chartData.length ? <ResponsiveChart label="Career suitability comparison" config={{ score: { label: "Suitability", color: "#4e85ce" } }}><BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 14 }}><XAxis type="number" domain={[0, 100]} hide /><YAxis type="category" dataKey="name" width={126} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#506074" }} /><ChartTooltip cursor={{ fill: "rgba(219,233,255,.55)" }} content={<ChartTooltipContent hideLabel />} /><Bar dataKey="score" radius={[0, 8, 8, 0]}>{chartData.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? "#17233c" : "#6a9dde"} />)}</Bar></BarChart></ResponsiveChart> : <StatePanel title="No saved match comparison" description="Run a career analysis to populate this chart from your own profile." action={<Link href="/careers" className="text-sm font-bold text-[#315f9c]">Analyze my career</Link>} />}
        </InsightCard>
        <InsightCard eyebrow="Rule-based skill gap" title={current ? `${gaps.length} skills to review` : "Choose a target to reveal gaps"} description={current ? "Priority combines required level, configured importance, curated demand, current proficiency, and the emerging-skill marker." : "Target career mode produces a transparent, deterministic gap analysis for the career you select."} action={<Target className="text-[#b25273]" size={22} />}>
          {current ? <div className="space-y-3">{gaps.slice(0, 3).map(gap => <div key={gap.skillId} className="rounded-2xl bg-[#f8f9fb] p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{gap.name}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${gap.priority === "High" ? "bg-[#ffe3e6] text-[#b43d55]" : gap.priority === "Medium" ? "bg-[#fff0d4] text-[#956112]" : "bg-[#e8eef7] text-[#536477]"}`}>{gap.priority}</span></div><p className="mt-1 text-xs text-slate-500">Current L{gap.currentLevel} · target L{gap.requiredLevel} · demand {gap.demand}/5</p></div>)}{!gaps.length && <StatePanel kind="success" title="No required gaps identified" description="Your recorded proficiency currently meets the configured required skills for this target." />}</div> : <Link href="/careers" className="button-press inline-flex items-center gap-2 rounded-xl bg-[#f6e0e7] px-4 py-3 text-sm font-bold text-[#a74f70]">Explore target careers <ArrowRight size={16} /></Link>}
          {current && <Link href="/roadmap" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#b25273]">View full gap analysis <ArrowRight size={16} /></Link>}
        </InsightCard>
      </section>

      <Reveal delay={0.06}><section className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><InsightCard eyebrow="Target career" title={current?.career.name ?? "No active target"} description={current ? current.career.description : "Selecting a target creates a new personal roadmap while leaving your saved career analysis intact."} action={<Target className="text-[#315f9c]" size={22} />}>{current ? <><div className="mt-2 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-[#edf3fe] p-3"><p className="text-slate-500">Readiness</p><p className="display mt-1 text-2xl font-extrabold">{current.readiness.score}/100</p></div><div className="rounded-xl bg-[#f7f8fa] p-3"><p className="text-slate-500">Skill coverage</p><p className="display mt-1 text-2xl font-extrabold">{current.readiness.skillCoverage}%</p></div></div><p className="mt-4 text-xs leading-5 text-slate-500">This is an application-defined readiness indicator: 70% weighted required-skill coverage and 30% roadmap completion.</p></> : <Link href="/careers" className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-[#315f9c]">Choose a direction <ArrowRight size={16} /></Link>}</InsightCard><InsightCard eyebrow="Curated industry signals" title="What the catalog is tracking" description="These are administrator-updatable curated indicators, not real-time labour-market claims." action={<TrendingUp className="text-[#b25273]" size={22} />}><div className="space-y-2">{catalog.data?.trends.slice(0, 3).map(trend => <div key={trend.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8f9fb] p-3"><div><p className="text-sm font-bold">{trend.title}</p><p className="mt-1 text-xs text-slate-500">{trend.relatedDomain}</p></div><span className="rounded-full bg-[#f6e0e7] px-2.5 py-1 text-[10px] font-bold text-[#a74f70]">{trend.impact}</span></div>)}</div><Link href="/trends" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#b25273]">Explore industry intelligence <ArrowRight size={16} /></Link></InsightCard></section></Reveal>
    </>}
  </div>;
}
