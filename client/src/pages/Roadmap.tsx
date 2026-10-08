import { EmptyState, Metric, PageHeader, ProgressBar } from "@/components/PageChrome";
import { trpc } from "@/lib/trpc";
import { CircleDot, GraduationCap, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusLabel = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export default function Roadmap() {
  const [, setLocation] = useLocation();
  const roadmap = trpc.career.roadmap.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const update = trpc.career.updateProgress.useMutation({
    onSuccess: () => {
      utils.career.roadmap.invalidate();
      toast.success("Progress updated");
    },
    onError: error => toast.error(error.message),
  });

  if (roadmap.isLoading) return <div className="h-96 animate-pulse rounded-[2rem] bg-slate-200" />;
  if (roadmap.error) return <EmptyState title="We could not load your roadmap" text={roadmap.error.message} />;
  const data = roadmap.data;

  if (!data) {
    return <div className="mx-auto max-w-4xl"><PageHeader eyebrow="Learning roadmap" title="A goal makes the next step visible." description="Select any target career to generate a personal, ordered learning plan." /><EmptyState title="No active roadmap yet" text="CareerCompass creates a roadmap when you choose a target career—whether or not it was the top LLM recommendation." action={<button onClick={() => setLocation("/careers")} className="button-press rounded-xl bg-[#17233c] px-4 py-3 text-sm font-semibold text-white">Choose a target career</button>} /></div>;
  }

  const completedItems = data.roadmap?.items.filter(item => item.status === "completed").length ?? 0;
  return <div className="mx-auto max-w-7xl">
    <PageHeader eyebrow="Personal learning roadmap" title={`Towards ${data.career.name}.`} description="The plan follows the configured requirement order. Priorities are deterministic and explain how each missing or under-proficient skill affects readiness." />
    <section className="grid gap-4 md:grid-cols-3">
      <Metric label="Career readiness" value={`${data.readiness.score}/100`} detail="70% requirement coverage, 30% roadmap completion." tone="ink" />
      <Metric label="Skill coverage" value={`${data.readiness.skillCoverage}%`} detail="Weighted required-skill coverage for this target." />
      <Metric label="Roadmap completion" value={`${data.readiness.roadmapCompletion}%`} detail={`${completedItems} learning items completed.`} tone="pink" />
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <article className="soft-card rounded-[1.7rem] p-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#dbe9ff] text-[#28558e]"><ListChecks size={19} /></span><div><p className="eyebrow">Learning sequence</p><h2 className="display mt-1 text-2xl font-extrabold">Your next actions</h2></div></div>
        <div className="mt-6 space-y-3">
          {data.roadmap?.items.length ? data.roadmap.items.map((item, index) => <article key={item.id} className="rounded-2xl bg-[#f8f9fb] p-4"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#5375a3]">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Learn {item.skillName}</h3><StatusBadge status={item.status} /></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.description || "Build this capability before moving to the next configured milestone."}</p><div className="mt-3 flex flex-wrap gap-2">{(["not_started", "in_progress", "completed"] as const).map(status => <button key={status} onClick={() => update.mutate({ roadmapItemId: item.id, status })} disabled={item.status === status || update.isPending} className={`button-press rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${item.status === status ? "bg-[#17233c] text-white" : "bg-white text-slate-500 hover:text-slate-900"}`}>{statusLabel[status]}</button>)}</div></div></div></article>) : <p className="rounded-xl bg-[#f8f9fb] p-4 text-sm text-slate-500">Your current skill levels already meet the configured requirements. Keep your profile fresh as you develop further.</p>}
        </div>
      </article>
      <article className="soft-card rounded-[1.7rem] p-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f6dfe6] text-[#b25273]"><GraduationCap size={19} /></span><div><p className="eyebrow">Deterministic gap analysis</p><h2 className="display mt-1 text-2xl font-extrabold">Why these skills matter</h2></div></div>
        <div className="mt-6 space-y-3">{data.gaps.length ? data.gaps.map(gap => <article key={gap.skillId} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">{gap.name}</h3><PriorityBadge priority={gap.priority} /></div><div className="mt-3 flex items-center gap-3"><div className="min-w-0 flex-1"><ProgressBar value={(gap.currentLevel / gap.requiredLevel) * 100} tone={gap.priority === "High" ? "pink" : "blue"} /></div><span className="text-xs font-bold text-slate-600">{gap.currentLevel}/{gap.requiredLevel}</span></div><p className="mt-3 text-xs leading-5 text-slate-500">{gap.explanation}</p></article>) : <p className="rounded-xl bg-[#f8f9fb] p-4 text-sm text-slate-500">No current required-skill gaps were found for this target.</p>}</div>
        <div className="mt-5 rounded-2xl bg-[#17233c] p-4 text-white"><CircleDot size={17} className="text-[#b9d4ff]" /><p className="mt-3 text-sm font-bold">Readiness score formula</p><p className="mt-1 text-xs leading-5 text-slate-300">70% weighted required-skill coverage + 30% completed roadmap items. Status changes are saved per student and recalculate this view.</p></div>
      </article>
    </section>
  </div>;
}

function StatusBadge({ status }: { status: "not_started" | "in_progress" | "completed" }) {
  const styles = { completed: "bg-[#dff0e7] text-[#317251]", in_progress: "bg-[#dbe9ff] text-[#28558e]", not_started: "bg-slate-200 text-slate-600" };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[status]}`}>{statusLabel[status]}</span>;
}
function PriorityBadge({ priority }: { priority: "High" | "Medium" | "Low" }) {
  const styles = { High: "bg-[#ffe3e6] text-[#b43d55]", Medium: "bg-[#fff0d4] text-[#9b6511]", Low: "bg-[#e8eef7] text-[#536477]" };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[priority]}`}>{priority} priority</span>;
}
