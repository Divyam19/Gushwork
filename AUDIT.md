# Repo audit — Gushwork (PackRight / Follow-ups)

A Next.js 16 + Supabase + OpenAI sales follow-up queue: ~70 source files (about 2.8k lines of app/lib/components code outside `components/ui`), built in a short sprint with heavy AI assistance. The wiring is better than typical for this kind of build: every client `fetch` hits a real route, every `process.env` read is in `.env.example` (except one stale key going the other way), every import is in `package.json`, and `jscpd` finds 0 copy-paste clones. The risks are not phantom code. They are the unauthenticated write/LLM endpoints, non-atomic multi-step writes, and a few entity shapes defined in several places.

Method: mapped files and git churn, diffed client calls against registered routes, diffed env reads against `.env.example`, diffed imports against the manifest, checked every `components/ui` file for importers, read all API routes, `lib/agent/run.ts`, `lib/seed.ts`, `lib/queue.ts`, `lib/leads.ts`, `supabase/schema.sql`.

## Feature wiring status
| Feature | Frontend | Backend | Data layer | Status |
|---|---|---|---|---|
| Follow-up queue (Overdue / Today / Upcoming / Done) | ✅ `view-nav`, `lead-list` | ✅ `lib/queue.ts` (pure, tested) | ✅ `getQueueItems` | Complete |
| Lead detail sheet + chat | ✅ `lead-sheet`, `chat-thread` | ✅ `getLeadDetail` | ✅ | Complete |
| Add lead (+ pasted WhatsApp chat) | ✅ `add-lead-dialog` | ✅ `POST /api/leads` | ✅ | Complete |
| Add chat to existing lead | ✅ `add-chat-dialog` | ✅ `POST /api/leads/[id]/messages` | ✅ | Complete |
| Draft edit / regenerate / Mark as sent | ✅ `draft-editor` | ✅ `draft`, `analyze?step=write`, `send` | ✅ | Complete, see #4 |
| Search palette | ✅ client-side over props | n/a | n/a | Complete |
| Nightly reseed | n/a | ✅ `/api/cron/reseed` + `vercel.json` | ✅ `lib/seed.ts` | Complete, see #2 |
| Deploy | n/a | n/a | n/a | Not done: `PROGRESS.md:5,14` (the "GitHub repo pending" part is now stale, the repo exists; Vercel deploy is still pending) |

**Status: items 2–8 and the dead files are fixed (see D-37). Item 1 is mitigated, not solved: the app still has no auth by design (D-10). Gate the deployment with Vercel Deployment Protection before sharing the URL.**

## Critical — breaks in production
1. **Every write and LLM-spending endpoint is unauthenticated.** `app/api/leads/route.ts:25` (POST), `app/api/leads/[id]/analyze/route.ts:5`, `.../send/route.ts:11`, `.../messages/route.ts:15`, `.../draft/route.ts:5` have no auth or rate limit; only `cron/reseed` checks a secret. Lead ids are guessable (`L01`…, seeded), so once deployed, anyone can loop `POST /api/leads/L05/analyze` and burn the OpenAI budget, or overwrite drafts and mark leads sent. `DECISIONS.md` D-10 records "no auth" as a deliberate scope cut, so this is only critical once the URL is public. Fix: put the deployment behind Vercel Password Protection / deployment protection, or add a shared-secret header check in one helper used by all five routes.
2. **Reseed is delete-then-insert with no transaction.** `lib/seed.ts` (the `for (const t of ['analyses','messages','leads','reps'])` delete loop, then the four inserts). If any insert fails after the deletes (payload limit, constraint, timeout at `maxDuration = 30`), every table is left empty until the next cron run 24h later, and the dashboard renders blank. It also races live page reads during the window. Fix: move the replace into one Postgres function called via `sb.rpc(...)` so it runs in a single transaction, or insert-then-delete-stale with upserts.
3. **A killed analysis leaves a lead stuck in `analyzing` forever, and the UI polls forever.** `lib/agent/run.ts` sets `status: 'analyzing'` before the work and only resets it in the in-process catch. The work itself nests retries: `analyzeLead` loops 2 attempts (`run.ts`), each runs `extractSignals` + `writeReasonAndDraft`, each wrapped in `callStructured`'s own 2-attempt loop (`lib/llm.ts:16`). That is up to 8 sequential LLM calls inside `maxDuration = 30`. If the function is killed at the limit, the catch never runs and `status` stays `'analyzing'`. `app/page.tsx` then mounts `<AutoRefresh />` (3s `router.refresh()`) for as long as any row is `analyzing`, with no cap. Fix: keep one retry layer (drop the `analyzeLead` loop), and treat `analyzing` rows older than ~60s (`analyzed_at`/a started-at column) as errored when reading.

## Structural — duplication and drift
4. **`send` ignores failures and isn't idempotent.** `app/api/leads/[id]/send/route.ts:21-24`: the `analyses` and `leads` updates run in `Promise.all` and their `{ error }` results are discarded, so the message can be logged while the lead is never marked sent (still shows as due, and re-sending is possible). There is also no `draft_status === 'sent'` check, so a retried or double-fired POST inserts the same message twice. Same unchecked-update pattern in `messages/route.ts:29`. Fix: check each result, and early-return when the analysis is already `sent` with the same text.
5. **The analysis/lead/message shapes are defined in several places that already disagree in form.** `analyses` columns live in `supabase/schema.sql:35-48`, again as `QueueItem['analysis']` (`lib/queue.ts:17-27`, a subset) and `LeadDetail['analysis']` (`lib/leads.ts:29-35`, a different subset), each re-spelling the `'ready'|'analyzing'|'error'` and `'pending'|'sent'` unions. `'rep' | 'buyer'` is inlined in `lib/leads.ts:25` and `:28` although `Sender` exists in `lib/schemas.ts:32`. The rep type is `MockRep`, exported from `lib/mock.ts` (a fixture loader that imports `node:fs`), and cast in from Supabase with `data as MockRep[]` (`lib/leads.ts:9`). A new column will need edits in 3–4 files and nothing will fail if one is missed. Fix: one `Analysis`/`Rep`/`Lead` type module (or zod schema) and derive the two views with `Pick`/`Omit`; move `MockRep` to `lib/schemas.ts`.
6. **The "add messages, bump last contact, re-analyse, 502 on failure" flow is written twice, with the message schema copied.** `app/api/leads/route.ts:7-23` and `app/api/leads/[id]/messages/route.ts:7-13` each define the same `{sender, text, sent_at}` zod object (they differ only by `.optional()`), then each insert, compute `last_contact_date`, call `analyzeLead`, and return `502`. `last_contact_date` is also written in `send/route.ts:24`, and `analyzeLead` recomputes it from messages anyway (`run.ts`, `lastContactOf`). Fix: export one `MessageInput` schema and one `appendMessages(leadId, msgs)` helper.
7. **Three client fetch styles.** `components/draft-editor.tsx:23` has its own `call()` helper with error extraction; `add-lead-dialog.tsx:34` and `add-chat-dialog.tsx:28` hand-roll `fetch` and their own error handling. Low risk today, but error-message handling will drift. Fix: lift `call()` to `lib/api-client.ts`.
8. **Stale env key.** `.env.example` lists `SEED_ANCHOR_DATE`; nothing in `app/`, `lib/` or `scripts/` reads it (the anchor comes from `mock-data/expected_tags.json`, `lib/mock.ts:55`). Someone setting it will expect an effect. Remove it.

## Dead weight — safe to delete
- `components/ui/accordion.tsx`, `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/number-ticker.tsx`: zero importers (verified by grep). `number-ticker` is orphaned since `components/stats-row.tsx` was removed from history.
- `.agents/skills/**` (38 tracked files), `.claude/skills/*` (symlinks into it) and `skills-lock.json`: installer tooling for the Supabase skills, committed into the app repo. No runtime effect; add to `.gitignore` or keep deliberately.
- `PROGRESS.md:5,14`: update the "GitHub repo pending" wording (the repo now exists).

## Deliberately not flagged
No duplication from `jscpd` (0 clones at 8 lines), and the `cn` dependency looked suspicious but is a real, installed package that `lib/utils.ts` re-exports. The no-auth stance is a documented decision (D-10), flagged above only as a deploy-time risk. The nightly wipe of reviewer edits is documented (D-05, D-27). `next-themes` is only used by the toaster with no provider, which is harmless. `getQueueItems` selects all leads and filters in memory; fine at ~25 rows, not a finding. Style, naming and `components/ui` internals were skipped on purpose. Test gap, one line: the API routes (`send`, `messages`, `draft`, `leads`) and `seed.ts` have no tests, although `queue`, `score`, `schedule` and the WhatsApp parser do.

## Fix order
1. Gate the deployment (#1) before sharing the URL. It is the only item that gets worse the moment the app is public.
2. Make `send` check its writes and be idempotent (#4), since it is the user-visible "Mark as sent" action.
3. Collapse the nested retries and add a stale-`analyzing` guard (#3), so a slow LLM call can't leave a lead spinning.
4. Make reseed atomic via one RPC (#2).
5. Extract the shared `Analysis`/`Rep` types and `MessageInput` + `appendMessages` (#5, #6) and move `call()` to a shared client helper (#7). Do these together, so each type change is made once.
6. Delete the dead UI files and the stale env key (#8), and decide whether `.agents/` stays tracked.
