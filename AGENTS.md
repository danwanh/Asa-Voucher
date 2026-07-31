# Asa Voucher Agent Rules

## Project Context
- **Project name**: Asa Voucher — an e-commerce platform for selling discount vouchers online, acting as an intermediary between customers (buyers) and businesses (partners).
- **Backend**: Express 4, TypeScript 5.6, Prisma 6 (PostgreSQL via Supabase), JWT auth, Zod validation, Morgan logging, express-rate-limit.
- **Backend source**: `backend/src`.
- **Prisma schema**: `backend/prisma/schema.prisma` (19 models).
- **Backend product/API docs**: `backend/docs`.
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 4, Radix UI, React Hook Form, Zustand, Axios, Recharts.
- **Frontend source**: `frontend/src/app`.
- **BRD & DB docs**: `docs/brd.md`, `docs/db-3layer.md`, `docs/README.md`.
- **Local project skills**: indexed in `.agents/SKILLS.md` and implemented under `.agents/skills/*/SKILL.md`.

## Communication
- Answer in the user's language unless they request otherwise.
- Be concise, but include enough implementation detail for code changes, test results, and known risks.
- Ask for clarification only when the request cannot be resolved from repo context and a wrong assumption would be risky.
- Do not force a fixed greeting or informal phrase in every response.

## Mandatory Skill Use
- Before non-trivial work, classify the task using `.agents/SKILLS.md`.
- Read the relevant `.agents/skills/*/SKILL.md` before inspecting or editing project files for that task.
- State which skill or skills are being used in the working update or final response.
- Combine skills when the task crosses domains; do not rely on only one skill for coupled backend, Prisma, frontend, or report work.

## Skill Routing
- Check `.agents/SKILLS.md` when a task could involve multiple skills.
- For Express backend endpoint/module work: `nodejs-backend-patterns`.
- For Prisma schema, migrations, seed, or database query work: `supabase` + `supabase-postgres-best-practices`.
- For Next.js frontend pages, components, or data fetching: `vercel-react-best-practices`.
- For UI design, Radix components, Tailwind styling, or visual layout: `frontend-design`.
- For UI accessibility, UX review, or Web Interface Guidelines compliance: `web-design-guidelines`.
- For performance profiling, N+1 queries, bundle optimization, or load time improvement: `performance-optimization`.
- For feature planning, creative work, or requirements exploration: `brainstorming`.

## Coding Standards
- Write code comments in English.
- Follow existing patterns before introducing new abstractions.
- Use Zod schemas for validation (`validateBody`, `validateParams`, `validateQuery`).
- Use `HttpError` for API errors; preserve the global response shape:
  ```json
  { "success": false, "error": { "code": "...", "message": "...", "details": [] } }
  ```
- JWT auth via `requireAuth` middleware, role checks via `requireRole`, owner-or-role checks via `requireOwnerOrRole`.
- Wrap async route handlers with `asyncHandler`.
- Keep API payload keys in camelCase and URL paths in kebab-case.
- Keep Prisma model fields and enum values aligned with `backend/prisma/schema.prisma`.
- Do not bypass authentication/authorization silently.

## Review Checklist
- Re-check edited files before reporting completion.
- For code changes, run `npm run type-check` and `npm run lint` and report the exact command and result.
- Mention any skipped verification.
- Preserve unrelated user changes in the worktree.
