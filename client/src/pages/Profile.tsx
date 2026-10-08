import { EmptyState, PageHeader, ProgressBar } from "@/components/PageChrome";
import { trpc } from "@/lib/trpc";
import { Check, FileText, Loader2, Plus, Save, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ProfileDraft = {
  educationLevel: string;
  degree: string;
  institution: string;
  graduationYear: string;
  bio: string;
  interests: string;
  preferredDomains: string;
  workPreference: string;
  careerGoal: string;
};

const blank: ProfileDraft = { educationLevel: "", degree: "", institution: "", graduationYear: "", bio: "", interests: "", preferredDomains: "", workPreference: "", careerGoal: "" };

type ParsedResume = Awaited<ReturnType<ReturnType<typeof trpc.resume.parse.useMutation>["mutateAsync"]>>;

export default function Profile() {
  const utils = trpc.useUtils();
  const catalog = trpc.career.catalog.useQuery();
  const profile = trpc.profile.get.useQuery(undefined, { retry: false });

  const [draft, setDraft] = useState<ProfileDraft>(blank);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [level, setLevel] = useState("3");
  const [project, setProject] = useState({ title: "", description: "", url: "" });
  const [cert, setCert] = useState({ name: "", issuer: "", year: "" });
  const [experience, setExperience] = useState({ title: "", organization: "", durationMonths: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [skillError, setSkillError] = useState("");

  // Resume upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = profile.data?.profile;
    if (p)
      setDraft({
        educationLevel: p.educationLevel ?? "",
        degree: p.degree ?? "",
        institution: p.institution ?? "",
        graduationYear: p.graduationYear?.toString() ?? "",
        bio: p.bio ?? "",
        interests: p.interests.join(", "),
        preferredDomains: p.preferredDomains.join(", "),
        workPreference: p.workPreference ?? "",
        careerGoal: p.careerGoal ?? "",
      });
  }, [profile.data]);

  const refresh = () => utils.profile.get.invalidate();

  const save = trpc.profile.save.useMutation({
    onSuccess: () => { refresh(); toast.success("Profile saved"); },
    onError: e => toast.error(e.message),
  });
  const replaceSkills = trpc.profile.replaceSkills.useMutation({
    onSuccess: () => { refresh(); toast.success("Skills updated"); },
    onError: e => toast.error(e.message),
  });
  const addProject = trpc.profile.addProject.useMutation({
    onSuccess: () => { setProject({ title: "", description: "", url: "" }); refresh(); toast.success("Project added"); },
    onError: e => toast.error(e.message),
  });
  const addCert = trpc.profile.addCertification.useMutation({
    onSuccess: () => { setCert({ name: "", issuer: "", year: "" }); refresh(); toast.success("Certification added"); },
    onError: e => toast.error(e.message),
  });
  const addExperience = trpc.profile.addExperience.useMutation({
    onSuccess: () => { setExperience({ title: "", organization: "", durationMonths: "" }); refresh(); toast.success("Experience added"); },
    onError: e => toast.error(e.message),
  });

  const parseResume = trpc.resume.parse.useMutation({
    onSuccess: (data) => {
      setParsedData(data);
      setDraft({
        educationLevel: data.educationLevel || "",
        degree: data.degree || "",
        institution: data.institution || "",
        graduationYear: data.graduationYear?.toString() ?? "",
        bio: data.bio || "",
        interests: data.interests.join(", "),
        preferredDomains: data.preferredDomains.join(", "),
        workPreference: data.workPreference || "",
        careerGoal: data.careerGoal || "",
      });
      toast.success("Resume parsed! Review and save your profile.");
    },
    onError: e => toast.error(`Resume parsing failed: ${e.message}`),
  });

  const applyParsedSkills = useCallback((data: ParsedResume, existingSkills: typeof profile.data.skills) => {
    if (!catalog.data) return;
    const catalogMap = new Map(catalog.data.skills.map(s => [s.name.toLowerCase(), s.id]));
    const newSkills = data.skills
      .map(s => ({ skillId: catalogMap.get(s.name.toLowerCase()), proficiency: Math.min(5, Math.max(1, Math.round(s.proficiency))) }))
      .filter((s): s is { skillId: number; proficiency: number } => s.skillId !== undefined);
    const existingIds = new Set((existingSkills ?? []).map(s => s.skillId));
    const merged = [
      ...(existingSkills ?? []).map(s => ({ skillId: s.skillId, proficiency: s.proficiency })),
      ...newSkills.filter(s => !existingIds.has(s.skillId)),
    ];
    if (merged.length) replaceSkills.mutate(merged);
  }, [catalog.data, replaceSkills]);

  const applyAllParsed = useCallback(async () => {
    if (!parsedData) return;
    const toastId = toast.loading("Applying parsed resume data…");
    try {
      applyParsedSkills(parsedData, profile.data?.skills ?? []);
      for (const p of parsedData.projects) {
        await addProject.mutateAsync({ title: p.title, description: p.description, url: p.url || undefined });
      }
      for (const c of parsedData.certifications) {
        await addCert.mutateAsync({ name: c.name, issuer: c.issuer, year: c.year ?? null });
      }
      for (const e of parsedData.experiences) {
        await addExperience.mutateAsync({ title: e.title, organization: e.organization, durationMonths: e.durationMonths });
      }
      toast.dismiss(toastId);
      toast.success("All resume data applied! Don't forget to save your profile.");
    } catch {
      toast.dismiss(toastId);
      toast.error("Some items failed to apply. Please check manually.");
    }
  }, [parsedData, profile.data, applyParsedSkills, addProject, addCert, addExperience]);

  function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { const result = reader.result as string; resolve(result.split(",")[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleResumeFile(file: File) {
    if (!file.name.match(/\.(pdf|txt)$/i)) { toast.error("Please upload a PDF or plain text (.txt) file."); return; }
    setResumeFile(file);
    setParsedData(null);
    try {
      const fileBase64 = await toBase64(file);
      const mimeType = file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain";
      parseResume.mutate({ fileBase64, mimeType, fileName: file.name });
    } catch { toast.error("Failed to read the file."); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleResumeFile(file);
  }

  if (profile.isLoading || catalog.isLoading) return <div className="h-80 animate-pulse rounded-[2rem] bg-slate-200" />;
  if (profile.error) return <EmptyState title="We could not load your profile" text={profile.error.message} />;

  const data = profile.data!;
  const knownIds = new Set(data.skills.map(skill => skill.skillId));
  const isParsing = parseResume.isPending;

  function update(field: keyof ProfileDraft, value: string) {
    setDraft(current => ({ ...current, [field]: value }));
    setFieldErrors(current => { const next = { ...current }; delete next[field]; return next; });
  }

  function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    const interests = split(draft.interests);
    const nextErrors: Record<string, string> = {};
    if (!data.skills.length && !interests.length) nextErrors.interests = "Add at least one skill or interest before saving a profile for career analysis.";
    if (draft.graduationYear && (Number(draft.graduationYear) < 1950 || Number(draft.graduationYear) > 2100)) nextErrors.graduationYear = "Enter a year between 1950 and 2100.";
    if (Object.keys(nextErrors).length) { setFieldErrors(nextErrors); return; }
    setFieldErrors({});
    save.mutate({ ...draft, graduationYear: draft.graduationYear ? Number(draft.graduationYear) : null, interests, preferredDomains: split(draft.preferredDomains) });
  }

  function addSkill() {
    const id = Number(selectedSkill);
    if (!id) { setSkillError("Choose a catalog skill before adding it."); return; }
    if (knownIds.has(id)) { setSkillError("That skill is already in your profile."); return; }
    setSkillError("");
    replaceSkills.mutate([...data.skills.map(skill => ({ skillId: skill.skillId, proficiency: skill.proficiency })), { skillId: id, proficiency: Number(level) }]);
    setSelectedSkill("");
  }

  function removeSkill(skillId: number) {
    replaceSkills.mutate(data.skills.filter(skill => skill.skillId !== skillId).map(skill => ({ skillId: skill.skillId, proficiency: skill.proficiency })));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Profile evidence"
        title="Describe your starting point."
        description="A complete profile gives the career assessment more useful context. Only your skill gap is calculated from the curated requirements and your stated proficiency."
        action={
          <div className="soft-card min-w-48 rounded-2xl p-3">
            <div className="mb-2 flex justify-between text-xs font-semibold"><span>Completion</span><span>{data.completion}%</span></div>
            <ProgressBar value={data.completion} tone="pink" />
          </div>
        }
      />

      {/* Resume Upload Zone */}
      <div className="mb-5">
        <div
          id="resume-upload-zone"
          role="region"
          aria-label="Resume upload"
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          onClick={() => !isParsing && fileInputRef.current?.click()}
          className={[
            "group relative cursor-pointer overflow-hidden rounded-[1.7rem] border-2 border-dashed transition-all duration-300 select-none",
            isDragOver ? "border-[#4777b8] bg-[#eef3fb] scale-[1.01]" :
            isParsing ? "border-[#4777b8] bg-[#f0f4ff]" :
            parsedData ? "border-emerald-400 bg-emerald-50" :
            "border-slate-200 bg-white hover:border-[#4777b8] hover:bg-[#f7f9ff]",
          ].join(" ")}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="resume-file-input"
            accept=".pdf,.txt"
            className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleResumeFile(f); e.target.value = ""; }}
          />
          <div className="flex flex-col items-center justify-center gap-4 px-8 py-8 text-center sm:flex-row sm:text-left">
            <div className={[
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-all",
              isParsing ? "bg-[#dbe9ff]" : parsedData ? "bg-emerald-100" : "bg-[#eef3fb] group-hover:bg-[#dbe9ff]",
            ].join(" ")}>
              {isParsing ? <Loader2 size={28} className="animate-spin text-[#4777b8]" /> :
               parsedData ? <Check size={28} className="text-emerald-600" /> :
               <Upload size={28} className="text-[#4777b8]" />}
            </div>
            <div className="flex-1">
              {isParsing ? (
                <><p className="font-bold text-[#17233c]">Parsing your resume with AI…</p><p className="mt-1 text-sm text-slate-500">Extracting skills, education, experience and more.</p></>
              ) : parsedData ? (
                <><p className="font-bold text-emerald-700"><FileText size={14} className="mr-1 inline" />{resumeFile?.name} — parsed successfully!</p>
                <p className="mt-1 text-sm text-slate-600">Found <strong>{parsedData.skills.length}</strong> skills, <strong>{parsedData.experiences.length}</strong> experiences, <strong>{parsedData.projects.length}</strong> projects, <strong>{parsedData.certifications.length}</strong> certifications. The form below has been auto-filled — review and save.</p></>
              ) : (
                <><p className="font-bold text-[#17233c]">Drop your resume here or <span className="text-[#4777b8]">browse</span></p><p className="mt-1 text-sm text-slate-500">PDF or TXT · AI will auto-fill your profile details, skills, and experience</p></>
              )}
            </div>
            {parsedData && !isParsing && (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row" onClick={e => e.stopPropagation()}>
                <button type="button" id="apply-all-resume-btn" onClick={applyAllParsed}
                  className="button-press inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  <Check size={15} />Apply all
                </button>
                <button type="button" id="reupload-resume-btn" onClick={() => { setResumeFile(null); setParsedData(null); fileInputRef.current?.click(); }}
                  className="button-press inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                  <Upload size={15} />Re-upload
                </button>
              </div>
            )}
          </div>
          {parsedData && !isParsing && parsedData.skills.length > 0 && (
            <div className="border-t border-emerald-100 bg-emerald-50/60 px-8 py-3" onClick={e => e.stopPropagation()}>
              <p className="mb-2 text-xs font-semibold text-emerald-800">Detected skills from resume:</p>
              <div className="flex flex-wrap gap-1.5">
                {parsedData.skills.slice(0, 20).map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-emerald-200">
                    {s.name}<span className="rounded bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">L{s.proficiency}</span>
                  </span>
                ))}
                {parsedData.skills.length > 20 && <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-500">+{parsedData.skills.length - 20} more</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile form + Skills */}
      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <form onSubmit={submitProfile} noValidate className="soft-card rounded-[1.7rem] p-6">
          <div className="flex items-center justify-between">
            <div><p className="eyebrow">Education &amp; direction</p><h2 className="display mt-1 text-2xl font-extrabold">Your context</h2></div>
            <button disabled={save.isPending} id="save-profile-btn" className="button-press inline-flex items-center gap-2 rounded-xl bg-[#17233c] px-4 py-2.5 text-sm font-semibold text-white">
              <Save size={16} />{save.isPending ? "Saving" : "Save profile"}
            </button>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Field label="Education level"><select value={draft.educationLevel} onChange={e => update("educationLevel", e.target.value)}><option value="">Select level</option><option>Undergraduate</option><option>Postgraduate</option><option>Diploma</option><option>Self-directed learning</option></select></Field>
            <Field label="Degree or program"><input value={draft.degree} onChange={e => update("degree", e.target.value)} placeholder="e.g. B.Tech Computer Science" /></Field>
            <Field label="Institution"><input value={draft.institution} onChange={e => update("institution", e.target.value)} placeholder="College or university" /></Field>
            <Field label="Graduation year" error={fieldErrors.graduationYear}><input value={draft.graduationYear} onChange={e => update("graduationYear", e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="2027" /></Field>
            <Field label="Interests (comma-separated)" wide error={fieldErrors.interests}><input value={draft.interests} onChange={e => update("interests", e.target.value)} placeholder="e.g. building products, data stories, cloud systems" /></Field>
            <Field label="Preferred domains" wide><input value={draft.preferredDomains} onChange={e => update("preferredDomains", e.target.value)} placeholder="e.g. Engineering, AI, Product" /></Field>
            <Field label="Work preference"><input value={draft.workPreference} onChange={e => update("workPreference", e.target.value)} placeholder="e.g. Collaborative, remote-friendly" /></Field>
            <Field label="Career goal"><input value={draft.careerGoal} onChange={e => update("careerGoal", e.target.value)} placeholder="What would you like to become?" /></Field>
            <Field label="Short bio" wide><textarea value={draft.bio} onChange={e => update("bio", e.target.value)} rows={4} placeholder="Share the kind of work, problems or industries that interest you." /></Field>
          </div>
        </form>

        <section className="soft-card rounded-[1.7rem] p-6">
          <p className="eyebrow">Skill inventory</p>
          <h2 className="display mt-1 text-2xl font-extrabold">What can you do today?</h2>
          <p className="mt-2 text-sm leading-6 thin-copy">Choose a proficiency from 1 (foundation) to 5 (advanced). This is used by the deterministic readiness engine.</p>
          <div className="mt-5 flex gap-2">
            <select aria-invalid={Boolean(skillError)} className="min-w-0 flex-1" value={selectedSkill} onChange={e => { setSelectedSkill(e.target.value); setSkillError(""); }}>
              <option value="">Choose a catalog skill</option>
              {catalog.data?.skills.filter(skill => !knownIds.has(skill.id)).map(skill => <option key={skill.id} value={skill.id}>{skill.name} · {skill.domain}</option>)}
            </select>
            <select className="w-20" value={level} onChange={e => setLevel(e.target.value)}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>L{value}</option>)}</select>
            <button type="button" onClick={addSkill} id="add-skill-btn" className="button-press grid w-11 place-items-center rounded-xl bg-[#dbe9ff] text-[#28558e]" aria-label="Add skill"><Plus size={18} /></button>
          </div>
          {skillError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">{skillError}</p>}
          <div className="mt-5 space-y-2">
            {data.skills.length ? data.skills.map(skill => (
              <div key={skill.skillId} className="flex items-center gap-3 rounded-xl bg-[#f7f8fa] p-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eef3fb] text-xs font-bold text-[#315f9c]">{skill.proficiency}</span>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{skill.name}</p><p className="text-xs text-slate-500">{skill.domain}</p></div>
                <button type="button" onClick={() => removeSkill(skill.skillId)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-600" aria-label={`Remove ${skill.name}`}><X size={16} /></button>
              </div>
            )) : <p className="rounded-xl bg-[#f7f8fa] p-4 text-sm text-slate-500">No skills yet. Upload your resume above or add skills manually.</p>}
          </div>
        </section>
      </div>

      {/* Projects / Certs / Experience */}
      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        <EntryCard title="Projects" description="Show evidence of applied work." onSubmit={e => { e.preventDefault(); if (project.title) addProject.mutate(project); }} button="Add project">
          <input value={project.title} onChange={e => setProject({ ...project, title: e.target.value })} placeholder="Project title" />
          <input value={project.description} onChange={e => setProject({ ...project, description: e.target.value })} placeholder="One-line summary" />
          <input value={project.url} onChange={e => setProject({ ...project, url: e.target.value })} placeholder="https:// link (optional)" />
          {data.projects.map(item => <Saved key={item.id} title={item.title} sub={item.description ?? "Project evidence"} />)}
        </EntryCard>
        <EntryCard title="Certifications" description="Add relevant formal learning." onSubmit={e => { e.preventDefault(); if (cert.name) addCert.mutate({ name: cert.name, issuer: cert.issuer, year: cert.year ? Number(cert.year) : null }); }} button="Add certification">
          <input value={cert.name} onChange={e => setCert({ ...cert, name: e.target.value })} placeholder="Certification name" />
          <input value={cert.issuer} onChange={e => setCert({ ...cert, issuer: e.target.value })} placeholder="Issuer" />
          <input value={cert.year} onChange={e => setCert({ ...cert, year: e.target.value.replace(/\D/g, "") })} placeholder="Year" />
          {data.certifications.map(item => <Saved key={item.id} title={item.name} sub={[item.issuer, item.year].filter(Boolean).join(" · ") || "Certification"} />)}
        </EntryCard>
        <EntryCard title="Experience" description="Internships, part-time work and volunteering count." onSubmit={e => { e.preventDefault(); if (experience.title) addExperience.mutate({ title: experience.title, organization: experience.organization, durationMonths: Number(experience.durationMonths) || 0 }); }} button="Add experience">
          <input value={experience.title} onChange={e => setExperience({ ...experience, title: e.target.value })} placeholder="Role title" />
          <input value={experience.organization} onChange={e => setExperience({ ...experience, organization: e.target.value })} placeholder="Organization" />
          <input value={experience.durationMonths} onChange={e => setExperience({ ...experience, durationMonths: e.target.value.replace(/\D/g, "") })} placeholder="Duration in months" />
          {data.experiences.map(item => <Saved key={item.id} title={item.title} sub={`${item.organization ?? "Experience"} · ${item.durationMonths} months`} />)}
        </EntryCard>
      </section>
    </div>
  );
}

function split(value: string) { return value.split(",").map(item => item.trim()).filter(Boolean).slice(0, 12); }
function Field({ label, children, wide = false, error }: { label: string; children: React.ReactNode; wide?: boolean; error?: string }) {
  return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>{children}{error && <span id={`${label}-error`} role="alert" className="mt-1.5 block text-xs font-semibold text-rose-600">{error}</span>}</label>;
}
function EntryCard({ title, description, onSubmit, button, children }: { title: string; description: string; onSubmit: (e: React.FormEvent) => void; button: string; children: React.ReactNode }) {
  return <form onSubmit={onSubmit} className="soft-card rounded-[1.7rem] p-5"><p className="eyebrow">Profile evidence</p><h2 className="display mt-1 text-xl font-extrabold">{title}</h2><p className="mt-2 text-sm thin-copy">{description}</p><div className="mt-5 space-y-2 [&_input]:w-full">{children}</div><button className="button-press mt-4 inline-flex items-center gap-2 rounded-xl bg-[#eef3fb] px-3 py-2 text-xs font-bold text-[#315f9c]"><Plus size={15} />{button}</button></form>;
}
function Saved({ title, sub }: { title: string; sub: string }) {
  return <div className="flex gap-2 rounded-lg bg-[#f7f8fa] p-2.5"><Check size={15} className="mt-0.5 shrink-0 text-[#4777b8]" /><div><p className="text-xs font-bold">{title}</p><p className="mt-0.5 text-[11px] text-slate-500">{sub}</p></div></div>;
}
