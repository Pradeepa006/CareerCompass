# CareerCompass AI Architecture Assessment

**Assessment date:** 21 August 2026  
**Scope:** Existing functional application; this assessment precedes the requested premium product upgrade.

## 1. Current Architecture

CareerCompass AI is a unified full-stack TypeScript application. The browser client is built with **React 19**, **Vite**, **Tailwind CSS 4**, **Wouter**, **TanStack React Query**, and **tRPC React**. The server is a single **Express 4** process that mounts a typed tRPC API at `/api/trpc`, registers the OAuth callback and storage proxy, and serves Vite in development or static assets in production. The persistence layer uses **Drizzle ORM** with a MySQL-compatible database driver, and the authentication model uses the existing Manus OAuth session integration.

| Concern | Current implementation | Reuse decision |
|---|---|---|
| Frontend | React, Vite, Wouter, Tailwind, Lucide, Sonner | Preserve and extend |
| UI primitives | Radix/shadcn-style components and existing `PageChrome` | Reuse and consolidate |
| Motion | Framer Motion is installed | Reuse; do not add a second animation library |
| API/data layer | tRPC 11 + React Query + SuperJSON | Preserve contracts and add typed procedures only where needed |
| Backend | Express process with tRPC and OAuth routes | Preserve |
| Database | Drizzle + MySQL-compatible relational schema | Reuse normalized entities; add only justified tables or columns |
| Authentication | OAuth callback, secure host-only sessions, role-aware procedures | Preserve; recently hardened against duplicate state issuance |
| AI | Server-side LLM invocation with strict JSON-schema validation | Preserve and extend through a scoped context builder |

## 2. Existing Features

The application already supports authenticated student profiles, skills and proficiency levels, education, interests, projects, certifications, experiences, profile completion, a seeded career/skill catalog, LLM-based ranked career analysis, target career selection, deterministic skill-gap analysis, prerequisite-aware roadmaps, persisted roadmap-item progress, curated industry signals, and a role-gated administrator control room.

Career recommendations are generated server-side from the student profile and curated career catalog. The output is validated to a strict schema and persisted as a prediction snapshot. In contrast, skill-gap priority, readiness, and roadmap sequencing are deterministic application logic. This distinction is already a sound foundation and must remain explicit in the upgraded interface.

## 3. Folder Structure

| Directory | Responsibility |
|---|---|
| `client/src/pages` | Route-level views: home, dashboard, profile, careers, roadmap, trends, and admin |
| `client/src/components` | Application layout, page chrome, existing AI chat shell, error boundary, maps, and reusable UI |
| `client/src/components/ui` | Accessible Radix/shadcn-style primitives |
| `client/src/lib` | tRPC client binding, utility functions, and OAuth redirect guard |
| `server/routers` | Feature-level tRPC procedures for profile, career, and administration |
| `server/_core` | Framework runtime, OAuth, cookie/session handling, tRPC context, LLM proxy, storage, and other integrations |
| `server/db.ts` | Drizzle-backed repository and profile/roadmap orchestration |
| `server/careerEngine.ts` | Pure deterministic gap, readiness, and prerequisite-sequencing rules |
| `server/catalog.ts` | Idempotent curated skill, career, mapping, prerequisite, and trend seed data |
| `drizzle` | Relational schema, snapshots, and generated migrations |
| `shared` | Cross-boundary constants and shared types |
| `docs` | Verification and architecture documentation |

## 4. Existing API Structure

The root tRPC router has `auth`, `profile`, `career`, and `admin` namespaces. Authentication exposes `me` and `logout`. The profile namespace provides a complete bundle read plus validated profile, skills, projects, certifications, and experience mutations. The career namespace exposes the public catalog; server-side LLM analysis; career details; target selection; active roadmap retrieval; and per-item progress updates. The admin namespace is role-gated and manages skills, careers, career-skill mappings, industry trends, and registered-user visibility.

| Namespace | Existing capabilities | Upgrade posture |
|---|---|---|
| `auth` | Current user and logout | Preserve unchanged |
| `profile` | Profile bundle and evidence capture | Add onboarding orchestration only if it does not replace the current forms |
| `career` | Catalog, analysis, details, target, roadmap, progress | Add comparison, assistant-context, analytics, and read-only insight procedures as additive contracts |
| `admin` | Catalog, mappings, users, curated trends | Extend with only real management data and statistics |

## 5. Existing Database Structure

The relational model is appropriately normalized for the existing product. `users` and `studentProfiles` represent account and profile state. `skills`, `careers`, `careerSkills`, and `skillPrerequisites` represent the curated intelligence graph. Student evidence is stored in `studentSkills`, `studentProjects`, `studentCertifications`, and `studentExperiences`. Career intelligence output is retained in `careerPredictions`, while a selected goal is stored in `studentTargets`. `roadmaps` and `roadmapItems` hold persistent student-specific learning plans and item status. `industryTrends` stores curated administrator-updatable trend content.

No destructive database change is justified during the early visual upgrade. Later product additions may require narrowly scoped tables for assistant conversations or achievement state, but only if the feature is implemented with real persisted user actions.

## 6. Existing AI and Decision Flow

The LLM career analysis flow accepts a minimized profile payload containing education, interests, domains, stated goal, skills and levels, project titles, certification names, and experience summaries. It receives only the curated career catalog needed for comparison, requests structured JSON, validates that output on the server, and persists the resulting ranked recommendations. The current procedure already includes non-guarantee language.

The skill-gap and roadmap flow is deterministic. Requirements are compared with recorded proficiency. Priority combines configured career importance, curated industry demand, the proficiency deficit, and the emerging-skill marker. Readiness is an application-defined score built from weighted required-skill coverage and completed roadmap items. Prerequisite edges produce a dependency-aware sequence. The visual product should clearly label this as **rule-based application logic**, not model output.

## 7. Reusable Assets

The upgrade can reuse `DashboardLayout` for responsive navigation, `PageChrome` for headings and metric cards, the existing UI primitive library for accessible controls, `AIChatBox` as a starting point for the contextual assistant interface, Recharts for responsive visualizations, and Framer Motion for controlled transitions, card entrances, progress animation, and reduced-motion-safe variants. Existing tRPC procedures, the catalog seed path, Drizzle repository, and test structure must be retained rather than replaced.

## 8. Modification Boundaries

The implementation should **extend rather than rewrite** the application. Existing authentication, profile persistence, career analysis, deterministic gaps, roadmaps, and administrator authorization are protected foundations. The dashboard, careers, roadmap, trends, and profile presentation layers should be progressively reworked around shared visual primitives. New API procedures are appropriate only for additive capabilities such as career comparison, scoped assistant responses, and analytics derived from actual profile and roadmap state.

## 9. Planned Additions

The initial additions will be an accessible motion token system, reusable loading/empty/error states, animated stat and progress components, career match and comparison cards, a dependency-aware journey visualization, transparent charts derived from existing records, and a contextual assistant surface. Later enhancements will use real student actions for achievements and analytics; no sample progress, fabricated reviews, or falsely real-time industry data will be introduced.

> **Implementation principle:** the product will distinguish LLM-derived recommendations from deterministic application calculations, label curated market content accurately, and preserve existing typed APIs and persisted user state.
