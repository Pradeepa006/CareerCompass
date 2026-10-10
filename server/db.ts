import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  careerPredictions,
  careerSkills,
  careers,
  industryTrends,
  InsertUser,
  roadmapItems,
  roadmaps,
  skills,
  skillPrerequisites,
  studentCertifications,
  studentExperiences,
  studentProfiles,
  studentProjects,
  studentSkills,
  studentTargets,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { analyzeSkillGaps } from "./careerEngine";
import { buildPrerequisiteSequence } from "./careerEngine";
import path from "path";
import fs from "fs";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try {
      database = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Connection initialization failed", error);
    }
  }
  return database;
}

import { careerSeeds, prerequisiteSeeds, skillSeeds } from "./catalog";

// ─── In-memory fallback store with local JSON file persistence ───────────────

let _catalog: { skills: any[]; careers: any[]; trends: any[] } | null = null;

function loadCatalog() {
  if (_catalog) return _catalog;
  try {
    const filePath = path.resolve(process.cwd(), "catalog_response.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const data = parsed?.result?.data?.json ?? parsed;
    _catalog = {
      skills: data.skills ?? [],
      careers: data.careers ?? [],
      trends: data.trends ?? [],
    };
  } catch {
    _catalog = { skills: [], careers: [], trends: [] };
  }
  return _catalog;
}

// Per-user in-memory stores (keyed by userId)
const memProfiles = new Map<number, any>();
const memSkills = new Map<number, any[]>();
const memProjects = new Map<number, any[]>();
const memCerts = new Map<number, any[]>();
const memExps = new Map<number, any[]>();
const memTargets = new Map<number, number>();
const memRoadmaps = new Map<number, any>();
const memRoadmapItems = new Map<number, any[]>();
const memPredictions = new Map<number, any[]>();
let _roadmapIdSeq = 1;
let _itemIdSeq = 1;
let _projectIdSeq = 1;
let _certIdSeq = 1;
let _expIdSeq = 1;

const LOCAL_STORE_FILE = path.resolve(process.cwd(), "local_store.json");

function loadLocalStore() {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, "utf8");
      const data = JSON.parse(raw);
      if (data.profiles) Object.entries(data.profiles).forEach(([k, v]) => memProfiles.set(Number(k), v));
      if (data.skills) Object.entries(data.skills).forEach(([k, v]) => memSkills.set(Number(k), v as any[]));
      if (data.projects) Object.entries(data.projects).forEach(([k, v]) => memProjects.set(Number(k), v as any[]));
      if (data.certs) Object.entries(data.certs).forEach(([k, v]) => memCerts.set(Number(k), v as any[]));
      if (data.exps) Object.entries(data.exps).forEach(([k, v]) => memExps.set(Number(k), v as any[]));
      if (data.targets) Object.entries(data.targets).forEach(([k, v]) => memTargets.set(Number(k), Number(v)));
      if (data.roadmaps) Object.entries(data.roadmaps).forEach(([k, v]) => memRoadmaps.set(Number(k), v));
      if (data.roadmapItems) Object.entries(data.roadmapItems).forEach(([k, v]) => memRoadmapItems.set(Number(k), v as any[]));
      if (data.predictions) Object.entries(data.predictions).forEach(([k, v]) => memPredictions.set(Number(k), v as any[]));
      if (data._seqs) {
        _roadmapIdSeq = data._seqs.roadmap || 1;
        _itemIdSeq = data._seqs.item || 1;
        _projectIdSeq = data._seqs.project || 1;
        _certIdSeq = data._seqs.cert || 1;
        _expIdSeq = data._seqs.exp || 1;
      }
    }
  } catch (err) {
    console.error("[Storage] Failed to load local_store.json", err);
  }
}

function persistLocalStore() {
  try {
    const data = {
      profiles: Object.fromEntries(memProfiles),
      skills: Object.fromEntries(memSkills),
      projects: Object.fromEntries(memProjects),
      certs: Object.fromEntries(memCerts),
      exps: Object.fromEntries(memExps),
      targets: Object.fromEntries(memTargets),
      roadmaps: Object.fromEntries(memRoadmaps),
      roadmapItems: Object.fromEntries(memRoadmapItems),
      predictions: Object.fromEntries(memPredictions),
      _seqs: {
        roadmap: _roadmapIdSeq,
        item: _itemIdSeq,
        project: _projectIdSeq,
        cert: _certIdSeq,
        exp: _expIdSeq,
      }
    };
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[Storage] Failed to save local_store.json", err);
  }
}

loadLocalStore();

function getMemProfileBundle(userId: number) {
  const catalog = loadCatalog();
  const skillsById = new Map(catalog.skills.map((s: any) => [s.id, s]));
  const careersById = new Map(catalog.careers.map((c: any) => [c.id, c]));

  const userSkills: Array<{ skillId: number; slug: string; name: string; domain: string; demand: number; trending: boolean; proficiency: number }> = [];
  for (const entry of memSkills.get(userId) ?? []) {
    const s = skillsById.get(entry.skillId);
    if (s) {
      userSkills.push({ skillId: s.id, slug: s.slug, name: s.name, domain: s.domain, demand: s.demand, trending: s.trending, proficiency: entry.proficiency });
    }
  }

  const targetCareerId = memTargets.get(userId);
  let target = null;
  if (targetCareerId) {
    const c = careersById.get(targetCareerId);
    if (c) target = { targetId: 1, careerId: c.id, slug: c.slug, name: c.name, domain: c.domain, growthIndicator: c.growthIndicator, demand: c.demand };
  }

  return {
    profile: memProfiles.get(userId) ?? null,
    skills: userSkills,
    projects: memProjects.get(userId) ?? [],
    certifications: memCerts.get(userId) ?? [],
    experiences: memExps.get(userId) ?? [],
    target,
  };
}

// ─── Exported DB functions with fallback ─────────────────────────────────────

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("The database is temporarily unavailable. Please try again shortly.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return; // no-op for in-memory mode
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getCatalog() {
  const db = await getDb();
  if (!db) return loadCatalog();
  const [skillRows, careerRows, trends] = await Promise.all([
    db.select().from(skills).orderBy(skills.domain, skills.name),
    db.select().from(careers).orderBy(careers.domain, careers.name),
    db.select().from(industryTrends).where(eq(industryTrends.active, true)),
  ]);
  return { skills: skillRows, careers: careerRows, trends };
}

export async function getProfileBundle(userId: number) {
  const db = await getDb();
  if (!db) return getMemProfileBundle(userId);
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  const [studentSkillRows, projects, certifications, experiences, targetRows] = await Promise.all([
    db.select({ skillId: skills.id, slug: skills.slug, name: skills.name, domain: skills.domain, demand: skills.demand, trending: skills.trending, proficiency: studentSkills.proficiency })
      .from(studentSkills).innerJoin(skills, eq(studentSkills.skillId, skills.id)).where(eq(studentSkills.userId, userId)).orderBy(skills.name),
    db.select().from(studentProjects).where(eq(studentProjects.userId, userId)).orderBy(desc(studentProjects.id)),
    db.select().from(studentCertifications).where(eq(studentCertifications.userId, userId)).orderBy(desc(studentCertifications.id)),
    db.select().from(studentExperiences).where(eq(studentExperiences.userId, userId)).orderBy(desc(studentExperiences.id)),
    db.select({ targetId: studentTargets.id, careerId: careers.id, slug: careers.slug, name: careers.name, domain: careers.domain, growthIndicator: careers.growthIndicator, demand: careers.demand })
      .from(studentTargets).innerJoin(careers, eq(studentTargets.careerId, careers.id)).where(eq(studentTargets.userId, userId)).limit(1),
  ]);
  return { profile, skills: studentSkillRows, projects, certifications, experiences, target: targetRows[0] ?? null };
}

export async function saveProfile(userId: number, input: {
  educationLevel?: string; degree?: string; institution?: string; graduationYear?: number | null; bio?: string; interests: string[]; preferredDomains: string[]; workPreference?: string; careerGoal?: string;
}) {
  const db = await getDb();
  if (!db) {
    memProfiles.set(userId, {
      userId,
      educationLevel: input.educationLevel || null,
      degree: input.degree || null,
      institution: input.institution || null,
      graduationYear: input.graduationYear || null,
      bio: input.bio || null,
      interests: input.interests || [],
      preferredDomains: input.preferredDomains || [],
      workPreference: input.workPreference || null,
      careerGoal: input.careerGoal || null,
      id: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    persistLocalStore();
    return getMemProfileBundle(userId);
  }
  const values = { userId, educationLevel: input.educationLevel || null, degree: input.degree || null, institution: input.institution || null, graduationYear: input.graduationYear || null, bio: input.bio || null, interests: input.interests, preferredDomains: input.preferredDomains, workPreference: input.workPreference || null, careerGoal: input.careerGoal || null };
  await db.insert(studentProfiles).values(values).onDuplicateKeyUpdate({ set: values });
  return getProfileBundle(userId);
}

export async function replaceStudentSkills(userId: number, values: Array<{ skillId: number; proficiency: number }>) {
  const db = await getDb();
  if (!db) {
    const catalog = loadCatalog();
    const validIds = new Set(catalog.skills.map((s: any) => s.id));
    if (values.some(v => !validIds.has(v.skillId))) throw new Error("One or more selected skills are no longer available.");
    memSkills.set(userId, values);
    persistLocalStore();
    return getMemProfileBundle(userId);
  }
  if (values.length) {
    const valid = await db.select({ id: skills.id }).from(skills).where(inArray(skills.id, values.map(item => item.skillId)));
    if (valid.length !== values.length) throw new Error("One or more selected skills are no longer available.");
  }
  await db.delete(studentSkills).where(eq(studentSkills.userId, userId));
  if (values.length) await db.insert(studentSkills).values(values.map(item => ({ userId, ...item })));
  return getProfileBundle(userId);
}

export async function addProfileProject(userId: number, value: { title: string; description?: string; url?: string }) {
  const db = await getDb();
  if (!db) {
    const existing = memProjects.get(userId) ?? [];
    existing.unshift({ id: _projectIdSeq++, userId, title: value.title, description: value.description || null, url: value.url || null, createdAt: new Date() });
    memProjects.set(userId, existing);
    persistLocalStore();
    return getMemProfileBundle(userId);
  }
  await db.insert(studentProjects).values({ userId, title: value.title, description: value.description || null, url: value.url || null });
  return getProfileBundle(userId);
}

export async function addCertification(userId: number, value: { name: string; issuer?: string; year?: number | null }) {
  const db = await getDb();
  if (!db) {
    const existing = memCerts.get(userId) ?? [];
    existing.unshift({ id: _certIdSeq++, userId, name: value.name, issuer: value.issuer || null, year: value.year || null, createdAt: new Date() });
    memCerts.set(userId, existing);
    persistLocalStore();
    return getMemProfileBundle(userId);
  }
  await db.insert(studentCertifications).values({ userId, name: value.name, issuer: value.issuer || null, year: value.year || null });
  return getProfileBundle(userId);
}

export async function addExperience(userId: number, value: { title: string; organization?: string; description?: string; durationMonths: number }) {
  const db = await getDb();
  if (!db) {
    const existing = memExps.get(userId) ?? [];
    existing.unshift({ id: _expIdSeq++, userId, title: value.title, organization: value.organization || null, description: value.description || null, durationMonths: value.durationMonths, createdAt: new Date() });
    memExps.set(userId, existing);
    persistLocalStore();
    return getMemProfileBundle(userId);
  }
  await db.insert(studentExperiences).values({ userId, title: value.title, organization: value.organization || null, description: value.description || null, durationMonths: value.durationMonths });
  return getProfileBundle(userId);
}

export async function getCareerRequirements(careerId: number) {
  const db = await getDb();
  if (!db) {
    const catalog = loadCatalog();
    const career = catalog.careers.find((c: any) => c.id === careerId);
    if (!career) return [];
    const seed = careerSeeds.find(s => s.slug === career.slug);
    if (!seed) return [];
    const skillsBySlug = new Map(catalog.skills.map((s: any) => [s.slug, s]));
    return seed.requirements.flatMap(r => {
      const s = skillsBySlug.get(r.skill);
      return s ? [{
        skillId: s.id,
        slug: s.slug,
        name: s.name,
        demand: s.demand,
        trending: s.trending,
        description: s.description,
        importance: r.importance,
        minimumProficiency: r.minimum,
        requirementType: r.type,
        learningOrder: r.order
      }] : [];
    }).sort((a, b) => a.learningOrder - b.learningOrder);
  }
  return db.select({ skillId: skills.id, slug: skills.slug, name: skills.name, demand: skills.demand, trending: skills.trending, description: skills.description, importance: careerSkills.importance, minimumProficiency: careerSkills.minimumProficiency, requirementType: careerSkills.requirementType, learningOrder: careerSkills.learningOrder })
    .from(careerSkills).innerJoin(skills, eq(careerSkills.skillId, skills.id)).where(eq(careerSkills.careerId, careerId)).orderBy(careerSkills.learningOrder);
}

export async function getCareer(careerId: number) {
  const db = await getDb();
  if (!db) {
    const catalog = loadCatalog();
    return catalog.careers.find((c: any) => c.id === careerId);
  }
  const result = await db.select().from(careers).where(eq(careers.id, careerId)).limit(1);
  return result[0];
}

export async function saveCareerPrediction(userId: number, results: unknown, model: string) {
  const db = await getDb();
  if (!db) {
    const existing = memPredictions.get(userId) ?? [];
    existing.unshift({ results, model, createdAt: new Date() });
    memPredictions.set(userId, existing);
    persistLocalStore();
    return;
  }
  await db.insert(careerPredictions).values({ userId, results, model });
}

export async function getLatestCareerPrediction(userId: number) {
  const db = await getDb();
  if (!db) {
    const preds = memPredictions.get(userId) ?? [];
    return preds[0] ?? null;
  }
  const result = await db.select({ results: careerPredictions.results, model: careerPredictions.model, createdAt: careerPredictions.createdAt })
    .from(careerPredictions).where(eq(careerPredictions.userId, userId)).orderBy(desc(careerPredictions.createdAt)).limit(1);
  return result[0] ?? null;
}

export async function setTargetCareer(userId: number, careerId: number) {
  const db = await getDb();
  if (!db) {
    memTargets.set(userId, careerId);
    const catalog = loadCatalog();
    const career = catalog.careers.find((c: any) => c.id === careerId);
    if (!career) throw new Error("Career not found.");
    const roadmapId = _roadmapIdSeq++;
    const roadmap = { id: roadmapId, userId, careerId, careerName: career.name, careerSlug: career.slug, careerDomain: career.domain, active: true, createdAt: new Date() };
    memRoadmaps.set(userId, roadmap);

    const requirements = await getCareerRequirements(careerId);
    const learner = await getProfileBundle(userId);
    const gaps = analyzeSkillGaps(learner.skills, requirements);
    const skillsBySlug = new Map(catalog.skills.map((s: any) => [s.slug, s]));
    const skillsById = new Map(catalog.skills.map((s: any) => [s.id, s]));
    const dependencies = prerequisiteSeeds.flatMap(([skillSlug, prereqSlug]) => {
      const s1 = skillsBySlug.get(skillSlug);
      const s2 = skillsBySlug.get(prereqSlug);
      return s1 && s2 ? [{ skillId: s1.id, prerequisiteSkillId: s2.id }] : [];
    });
    const startedSkills = new Set(learner.skills.filter(skill => skill.proficiency >= 1).map(skill => skill.skillId));
    const sequenceIds = buildPrerequisiteSequence(gaps.map(gap => gap.skillId), dependencies, startedSkills);
    const priorityById = new Map(gaps.map(gap => [gap.skillId, gap]));
    const items = sequenceIds.flatMap((skillId, index) => {
      const skill = skillsById.get(skillId);
      const gap = priorityById.get(skillId);
      return skill ? [{
        id: _itemIdSeq++,
        roadmapId,
        skillId,
        skillName: skill.name,
        skillSlug: skill.slug,
        title: `Learn ${skill.name}`,
        description: gap ? `${skill.description ?? "Build this skill."} ${gap.explanation}` : `${skill.description ?? "Build this prerequisite."} This is a prerequisite for a target-career skill in your roadmap.`,
        position: index + 1,
        status: "not_started" as const
      }] : [];
    });
    memRoadmapItems.set(roadmapId, items);
    persistLocalStore();
    return getActiveRoadmap(userId);
  }
  await db.insert(studentTargets).values({ userId, careerId }).onDuplicateKeyUpdate({ set: { careerId } });
  await db.update(roadmaps).set({ active: false }).where(and(eq(roadmaps.userId, userId), eq(roadmaps.active, true)));
  await db.insert(roadmaps).values({ userId, careerId, active: true });
  const [roadmap] = await db.select().from(roadmaps).where(and(eq(roadmaps.userId, userId), eq(roadmaps.careerId, careerId), eq(roadmaps.active, true))).orderBy(desc(roadmaps.id)).limit(1);
  if (!roadmap) throw new Error("Unable to create a learning roadmap.");
  const requirements = await getCareerRequirements(careerId);
  const learner = await getProfileBundle(userId);
  const gaps = analyzeSkillGaps(learner.skills, requirements);
  const dependencies = await db.select({ skillId: skillPrerequisites.skillId, prerequisiteSkillId: skillPrerequisites.prerequisiteSkillId }).from(skillPrerequisites);
  const startedSkills = new Set(learner.skills.filter(skill => skill.proficiency >= 1).map(skill => skill.skillId));
  const sequenceIds = buildPrerequisiteSequence(gaps.map(gap => gap.skillId), dependencies, startedSkills);
  const requiredSkillRows = sequenceIds.length ? await db.select().from(skills).where(inArray(skills.id, sequenceIds)) : [];
  const skillsById = new Map(requiredSkillRows.map(skill => [skill.id, skill]));
  const priorityById = new Map(gaps.map(gap => [gap.skillId, gap]));
  if (sequenceIds.length) await db.insert(roadmapItems).values(sequenceIds.flatMap((skillId, index) => {
    const skill = skillsById.get(skillId); const gap = priorityById.get(skillId);
    return skill ? [{ roadmapId: roadmap.id, skillId, title: `Learn ${skill.name}`, description: gap ? `${skill.description ?? "Build this skill."} ${gap.explanation}` : `${skill.description ?? "Build this prerequisite."} This is a prerequisite for a target-career skill in your roadmap.`, position: index + 1 }] : [];
  }));
  return getActiveRoadmap(userId);
}

export async function getActiveRoadmap(userId: number) {
  const db = await getDb();
  if (!db) {
    const roadmap = memRoadmaps.get(userId);
    if (!roadmap) return null;
    const items = (memRoadmapItems.get(roadmap.id) ?? []).map((item: any) => ({
      id: item.id, skillId: item.skillId, skillName: item.skillName, skillSlug: item.skillSlug,
      status: item.status ?? "not_started", position: item.position, description: item.description,
    }));
    return { ...roadmap, items };
  }
  const [roadmap] = await db.select({ id: roadmaps.id, careerId: careers.id, careerName: careers.name, careerSlug: careers.slug, careerDomain: careers.domain, createdAt: roadmaps.createdAt })
    .from(roadmaps).innerJoin(careers, eq(roadmaps.careerId, careers.id)).where(and(eq(roadmaps.userId, userId), eq(roadmaps.active, true))).orderBy(desc(roadmaps.id)).limit(1);
  if (!roadmap) return null;
  const items = await db.select({ id: roadmapItems.id, skillId: skills.id, skillName: skills.name, skillSlug: skills.slug, status: roadmapItems.status, position: roadmapItems.position, description: roadmapItems.description })
    .from(roadmapItems).innerJoin(skills, eq(roadmapItems.skillId, skills.id)).where(eq(roadmapItems.roadmapId, roadmap.id)).orderBy(roadmapItems.position);
  return { ...roadmap, items };
}

export async function getRoadmapSkillGraph(roadmapId: number) {
  const db = await getDb();
  if (!db) {
    const catalog = loadCatalog();
    const skillsById = new Map(catalog.skills.map((s: any) => [s.id, s]));
    const skillsBySlug = new Map(catalog.skills.map((s: any) => [s.slug, s]));
    const items = (memRoadmapItems.get(roadmapId) ?? []).map((item: any) => ({
      skillId: item.skillId,
      position: item.position,
      status: item.status ?? "not_started"
    }));
    if (!items.length) return { items, edges: [], skills: [] };
    const itemIds = new Set(items.map((item: any) => item.skillId));
    const edges = prerequisiteSeeds.flatMap(([skillSlug, prereqSlug]) => {
      const s1 = skillsBySlug.get(skillSlug);
      const s2 = skillsBySlug.get(prereqSlug);
      return (s1 && s2 && itemIds.has(s1.id)) ? [{ skillId: s1.id, prerequisiteSkillId: s2.id }] : [];
    });
    const relatedIds = Array.from(new Set(items.map((item: any) => item.skillId).concat(edges.map(edge => edge.prerequisiteSkillId))));
    const skillRows: any[] = [];
    for (const id of relatedIds) {
      const s = skillsById.get(id);
      if (s) skillRows.push(s);
    }
    return { items, edges, skills: skillRows };
  }
  const items = await db.select({ skillId: roadmapItems.skillId, position: roadmapItems.position, status: roadmapItems.status })
    .from(roadmapItems).where(eq(roadmapItems.roadmapId, roadmapId)).orderBy(roadmapItems.position);
  if (!items.length) return { items, edges: [], skills: [] };
  const itemIds = items.map(item => item.skillId);
  const edges = await db.select({ skillId: skillPrerequisites.skillId, prerequisiteSkillId: skillPrerequisites.prerequisiteSkillId })
    .from(skillPrerequisites).where(inArray(skillPrerequisites.skillId, itemIds));
  const relatedIds = Array.from(new Set(itemIds.concat(edges.map(edge => edge.prerequisiteSkillId))));
  const skillRows = relatedIds.length ? await db.select({ id: skills.id, name: skills.name, description: skills.description, domain: skills.domain, difficulty: skills.difficulty, demand: skills.demand, trending: skills.trending }).from(skills).where(inArray(skills.id, relatedIds)) : [];
  return { items, edges, skills: skillRows };
}

export async function updateRoadmapItem(userId: number, roadmapItemId: number, status: "not_started" | "in_progress" | "completed") {
  const db = await getDb();
  if (!db) {
    const roadmap = memRoadmaps.get(userId);
    if (!roadmap) throw new Error("No active roadmap found.");
    const items = memRoadmapItems.get(roadmap.id) ?? [];
    const idx = items.findIndex((i: any) => i.id === roadmapItemId);
    if (idx === -1) throw new Error("That roadmap item is not available in your account.");
    items[idx] = { ...items[idx], status };
    memRoadmapItems.set(roadmap.id, items);
    persistLocalStore();
    return getActiveRoadmap(userId);
  }
  const allowed = await db.select({ id: roadmapItems.id }).from(roadmapItems).innerJoin(roadmaps, eq(roadmapItems.roadmapId, roadmaps.id))
    .where(and(eq(roadmapItems.id, roadmapItemId), eq(roadmaps.userId, userId))).limit(1);
  if (!allowed[0]) throw new Error("That roadmap item is not available in your account.");
  await db.update(roadmapItems).set({ status }).where(eq(roadmapItems.id, roadmapItemId));
  return getActiveRoadmap(userId);
}

export async function getRegisteredUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn, createdAt: users.createdAt }).from(users).orderBy(desc(users.lastSignedIn));
}
