import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const studentProfiles = mysqlTable("studentProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  educationLevel: varchar("educationLevel", { length: 200 }),
  degree: varchar("degree", { length: 300 }),
  institution: varchar("institution", { length: 300 }),
  graduationYear: int("graduationYear"),
  bio: text("bio"),
  interests: json("interests").$type<string[]>().notNull(),
  preferredDomains: json("preferredDomains").$type<string[]>().notNull(),
  workPreference: varchar("workPreference", { length: 500 }),
  careerGoal: text("careerGoal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("profile_user_idx").on(table.userId)]);

export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 90 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  domain: varchar("domain", { length: 80 }).notNull(),
  difficulty: varchar("difficulty", { length: 24 }).notNull(),
  demand: int("demand").notNull(),
  trending: boolean("trending").default(false).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("skill_domain_idx").on(table.domain)]);

export const careers = mysqlTable("careers", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 140 }).notNull(),
  domain: varchar("domain", { length: 80 }).notNull(),
  description: text("description").notNull(),
  growthIndicator: varchar("growthIndicator", { length: 40 }).notNull(),
  demand: int("demand").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("career_domain_idx").on(table.domain)]);

export const careerSkills = mysqlTable("careerSkills", {
  id: int("id").autoincrement().primaryKey(),
  careerId: int("careerId").notNull().references(() => careers.id, { onDelete: "cascade" }),
  skillId: int("skillId").notNull().references(() => skills.id, { onDelete: "cascade" }),
  requirementType: mysqlEnum("requirementType", ["required", "preferred"]).default("required").notNull(),
  importance: int("importance").notNull(),
  minimumProficiency: int("minimumProficiency").notNull(),
  learningOrder: int("learningOrder").notNull(),
}, table => [uniqueIndex("career_skill_unique").on(table.careerId, table.skillId), index("career_skill_career_idx").on(table.careerId)]);

export const skillPrerequisites = mysqlTable("skillPrerequisites", {
  id: int("id").autoincrement().primaryKey(),
  skillId: int("skillId").notNull().references(() => skills.id, { onDelete: "cascade" }),
  prerequisiteSkillId: int("prerequisiteSkillId").notNull().references(() => skills.id, { onDelete: "cascade" }),
}, table => [uniqueIndex("skill_prerequisite_unique").on(table.skillId, table.prerequisiteSkillId), index("skill_prerequisite_skill_idx").on(table.skillId)]);

export const studentSkills = mysqlTable("studentSkills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillId: int("skillId").notNull().references(() => skills.id, { onDelete: "cascade" }),
  proficiency: int("proficiency").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("student_skill_unique").on(table.userId, table.skillId), index("student_skill_user_idx").on(table.userId)]);

export const studentProjects = mysqlTable("studentProjects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  url: varchar("url", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studentCertifications = mysqlTable("studentCertifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 180 }).notNull(),
  issuer: varchar("issuer", { length: 160 }),
  year: int("year"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studentExperiences = mysqlTable("studentExperiences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  organization: varchar("organization", { length: 160 }),
  description: text("description"),
  durationMonths: int("durationMonths").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const careerPredictions = mysqlTable("careerPredictions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  results: json("results").$type<unknown>().notNull(),
  model: varchar("model", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("prediction_user_idx").on(table.userId)]);

export const studentTargets = mysqlTable("studentTargets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  careerId: int("careerId").notNull().references(() => careers.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const roadmaps = mysqlTable("roadmaps", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  careerId: int("careerId").notNull().references(() => careers.id, { onDelete: "cascade" }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("roadmap_user_idx").on(table.userId), index("roadmap_career_idx").on(table.careerId)]);

export const roadmapItems = mysqlTable("roadmapItems", {
  id: int("id").autoincrement().primaryKey(),
  roadmapId: int("roadmapId").notNull().references(() => roadmaps.id, { onDelete: "cascade" }),
  skillId: int("skillId").notNull().references(() => skills.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  position: int("position").notNull(),
  status: mysqlEnum("status", ["not_started", "in_progress", "completed"]).default("not_started").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("roadmap_skill_unique").on(table.roadmapId, table.skillId), index("roadmap_item_roadmap_idx").on(table.roadmapId)]);

export const industryTrends = mysqlTable("industryTrends", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  summary: text("summary").notNull(),
  relatedDomain: varchar("relatedDomain", { length: 80 }).notNull(),
  impact: varchar("impact", { length: 24 }).notNull(),
  active: boolean("active").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Career = typeof careers.$inferSelect;
