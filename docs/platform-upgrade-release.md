# CareerCompass AI Platform Upgrade

**Release scope:** Premium career-intelligence interface upgrade built incrementally on the existing authenticated CareerCompass application.

## Product Architecture

CareerCompass remains a React, Tailwind, Wouter, TanStack Query, tRPC, Express, Drizzle, and MySQL-compatible application. Its existing profile, catalog, target, roadmap, progress, role-gated administration, OAuth, and server-side LLM foundations were preserved. The upgrade adds presentation components and additive read-only procedures rather than replacing existing contracts.

| Layer | Upgrade |
|---|---|
| Design system | Reusable motion, animated metrics, progress bars, chart wrappers, loading skeletons, and state panels |
| Dashboard | Persisted model-analysis visibility, next action, rule-based gaps, target, readiness, and curated trends |
| Career intelligence | Saved analysis visibility and two-career comparison with explicit source labels |
| Skill gap | Dedicated current/matched/missing and High/Medium/Low priority experience |
| Journey | Dependency-aware route with interactive nodes and persisted status controls |
| Industry intelligence | Curated demand and emerging-skill charts, explicitly not real-time claims |
| Assistant | Floating server-side CareerCompass AI, scoped to minimal student context |
| Analytics | Actual skill, roadmap, gap, readiness, and milestone data |

## Data and Decision Flows

| Flow | Source of truth | Explanation shown to students |
|---|---|---|
| Career ranking | Server-side LLM and curated role catalog | **Model-derived suitability estimate**; not an outcome guarantee |
| Skill gaps | Current proficiency, configured requirements, importance, curated demand, emerging marker | **Rule-based application logic** |
| Readiness | 70% weighted required-skill coverage + 30% roadmap completion | **Application-defined indicator**; not employment probability |
| Journey | Stored roadmap items plus configured prerequisite graph | Dependency-aware learning sequence |
| Industry signals | Administrator-maintained catalog records | **Curated**, not real-time labour-market information |
| Assistant | Minimized student context, active target, current gaps, roadmap, and curated trends | Contextual guidance; never a job guarantee |

## Typed API Additions

The following tRPC procedures extend the existing `career` namespace without replacing earlier profile, target, or progress contracts.

| Procedure | Access | Purpose |
|---|---|---|
| `career.latestAnalysis` | Authenticated | Latest persisted model-analysis snapshot |
| `career.journey` | Authenticated | Target snapshot plus roadmap skill graph and prerequisites |
| `career.analytics` | Authenticated | Current profile skills, active roadmap, deterministic gaps, readiness, and progress data |
| `assistant.respond` | Authenticated | Context-scoped LLM response from the student’s recent conversation |

All new inputs are Zod-validated. The assistant accepts at most eight recent user/assistant messages and 1,400 characters per message. It receives only the context necessary for current guidance, rather than a full raw database export.

## UI Component System

`Motion.tsx` provides page and reveal transitions that respect `prefers-reduced-motion`, animated numbers, and consistent interaction timing. `InsightCard.tsx` provides card, responsive-chart, skeleton, and explicit empty/error/success/loading state primitives. The application keeps visible focus styles, labelled controls, keyboard-reachable navigation, reduced-motion support, and responsive chart containers.

## Gamification Scope

This release intentionally ships **action-derived milestone signals only**. The analytics view labels profile foundation, target selection, and first completed learning action from actual persisted student state. It does **not** fabricate XP, badges, levels, streaks, or achievements. Persisted gamification mechanics are deliberately deferred until there is a defined data model, idempotent event policy, and product decision for those systems.

## Security and Privacy

Authentication retains its recent single-redirect OAuth nonce protection and first-party `SameSite=Lax` session/state cookie policy. Assistant requests are made server-side through the configured LLM helper; browser code never sees LLM credentials. Role gating remains in server procedures, including administrative routes. The assistant system instruction prohibits exposure of email addresses, identifiers, credentials, and full private records, and prevents unsupported claims such as guaranteed jobs or real-time labour data.

## Performance Notes

The upgrade reuses React Query caching and tRPC batching. Analytics and journey views derive from existing lightweight profile, roadmap, requirements, and catalog records. Charts use responsive containers, and motion is restricted to opacity and transforms with short durations. No large media assets, background workers, live scrapers, or persistent processes were added.

## Verification

The TypeScript check and Vitest suite pass after the upgrade. Authenticated browser verification confirmed the interactive journey and dedicated skill-gap views render persisted target/roadmap data correctly. The skill-gap view exposes current and required levels, severity, demand, priority, learning status, and matched requirement details. The UI includes explicit empty/error/loading states for principal new workflows.

## Deployment

The project is ready for a saved version. To publish it, first create a checkpoint and then use the **Publish** control in the project interface. No external hosting configuration is required for the current Autoscale-compatible single-process design.
