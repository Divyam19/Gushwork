# AGENTS.md
Read PRD.md, then PROGRESS.md, then DECISIONS.md before doing anything.
Continue from the first unticked item in PROGRESS.md.

## Stack
Next.js (App Router, TS) · Tailwind v4 · shadcn/ui (+ Magic UI: number-ticker, shimmer-button, border-beam only) · Supabase (server-side only, service key) · OpenAI (OPENAI_MODEL) · zod · date-fns-tz (Asia/Kolkata) · vitest · pnpm

## Commands
pnpm dev | pnpm build | pnpm test | pnpm seed | pnpm eval | pnpm lint

## Rules
- Scope is locked by PRD §3. Do not add features. Ideas → NOTE.md "What I'd build next".
- Tags are decided by code (lib/agent/score.ts), never by the LLM.
- Never let the LLM invent prices/dates; placeholders in [brackets].
- All "today" logic goes through lib/dates.ts (IST).
- Supabase service key is server-only. Never import lib/db.ts in client components.
- Any choice between options → append to DECISIONS.md.
- After each phase: run pnpm test && pnpm build, tick PROGRESS.md, commit.
- Small commits with clear messages.
- PRD amendments: DECISIONS.md D-11..D-15 override PRD §6.3 / §5 / §7.4 where they conflict.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
