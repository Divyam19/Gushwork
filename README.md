# PackRight · Follow-ups

One screen for PackRight's 5 sales reps: who to follow up today (overdue first), why, and a ready-to-send WhatsApp draft.

**How it works:** an LLM reads the chat and extracts yes/no buying signals with quoted evidence; plain code scores them, assigns Hot/Warm/Cold and picks the follow-up date; the LLM then writes a one-line reason and a draft (never inventing prices or dates; unknowns are `[placeholders]`). See `NOTE.md` and `DECISIONS.md`.

## Stack
Next.js (App Router, TS) · Tailwind v4 · shadcn/ui + Magic UI · Supabase (server-side only) · OpenAI · zod · vitest · pnpm

## Setup
```bash
pnpm install
cp .env.example .env.local   # fill in Supabase + OpenAI keys
# apply supabase/schema.sql to your Supabase project
pnpm seed                    # loads 25 leads, dates shifted so "today" is today (IST)
pnpm dev
```

## Commands
| | |
|---|---|
| `pnpm dev` / `pnpm build` | run / build |
| `pnpm test` | unit tests (scoring, scheduling, queue, WhatsApp parser) |
| `pnpm eval` | run the agent on the 16 labelled leads; prints tag + date pass/fail (calls OpenAI) |
| `pnpm seed` | reset the DB from `mock-data` and the frozen analysis fixture (`--refresh` re-runs the LLM) |

## Deploy (Vercel)
Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `CRON_SECRET`. `vercel.json` schedules a daily reseed (00:30 IST) at `/api/cron/reseed` so the demo always looks "today"; reviewer edits reset nightly. The Supabase service key is server-only. The app has no login by design (D-10), so its write and LLM routes are open to anyone with the URL: turn on Vercel Deployment Protection (or share only with the reviewer) to gate it.
