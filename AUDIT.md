# Repo audit — Gushwork (PackRight / Follow-ups) · pass 2

Second pass, after the fixes in `f794f7e` (the first report is in git history). This is a Next.js 16 + Supabase + OpenAI follow-up queue of ~70 source files. The mechanical checks are now clean: 0 `jscpd` clones; every `process.env` read (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_MODEL`, `CRON_SECRET`) is in `.env.example`; every client call hits a real route; `tsc` passes. What's left is one regression my own fixes introduced, one leftover duplicate-entity problem, and a few small items.

**Status: all six findings and the dead file are fixed (D-38) and verified against the running app. Sending, then adding a chat at once, returned `{ok, tag}`. A second concurrent `analyze` call got 409. The reseed left exactly 52 messages.**

## Feature wiring status
| Feature | Frontend | Backend | Data layer | Status |
|---|---|---|---|---|
| Follow-up queue (4 views, rep filter) | ✅ | ✅ `lib/queue.ts` (tested) | ✅ | Complete |
| Lead sheet: score, chat, draft | ✅ | ✅ | ✅ | Complete |
| Add lead / add chat | ✅ | ✅ | ✅ | Complete, but see #1 |
| Mark as sent | ✅ | ✅ idempotent now | ✅ | Complete |
| Regenerate draft | ✅ | ✅ | ✅ | Complete, but see #1 |
| Nightly reseed | n/a | ✅ | ✅ write-first | Complete, but see #2 |
| Deploy | n/a | n/a | n/a | Still pending (`PROGRESS.md:5`). Auth is out of scope by design (D-10). |

## Critical — breaks in production
1. **Regression: "Add chat" right after "Mark as sent" now fails, and the new chat is never analysed.** My single-flight guard sits inside `analyzeLead` (`lib/agent/run.ts:56`), so it applies to every caller, not only the public analyze route. `send` starts a background analysis (`app/api/leads/[id]/send/route.ts:32`, via `after()`), which takes several seconds. If the rep adds a buyer reply in that window, `messages/route.ts:22` hits the guard and returns 502 "Analysis already running", although the messages were already saved (`:18`). The lead keeps the pre-reply tag and draft until someone presses Regenerate. Regenerate during that window fails the same way. Fix: move the guard out of `analyzeLead` and into `app/api/leads/[id]/analyze/route.ts` only, the one route that exists just to trigger LLM spend. For internal callers, a later run simply overwrites an earlier one, and the later run is the one that saw the newest chat.

## Structural — duplication and drift
2. **Reseed's old-message cleanup is capped at 1,000 rows.** `lib/seed.ts:85` reads old message ids with an unpaginated `select('id')`. PostgREST returns at most 1,000 rows by default, so past that, older messages survive the reseed and seeded leads show duplicated chats. That's unlikely at 52 seed messages plus a day of edits, but it fails silently. Fix: take the new ids from `insert(msgRows).select('id')`, then `delete().not('id', 'in', ...)` for everything else. That also drops the extra read.
3. **The lead entity is still defined four times.** Pass 1 unified `Rep`, `AnalysisRow` and `MessageInput`, but the lead itself still lives in `MockLead` (`lib/mock.ts:6`), `QueueItem` (`lib/queue.ts:4-16`), `LeadDetail['lead']` (`lib/leads.ts:24-27`) and `LeadInput` (`lib/agent/prompts.ts:4-11`), with nullability that already differs (`city: string` in `MockLead` vs `string | null` elsewhere). Fix: one `LeadRow` in `lib/schemas.ts`, with the others as `Pick<LeadRow, ...>`.
4. **"Sent today" is decided in two places.** `lib/queue.ts` (`sentToday`: `sent_at` in IST equals today) puts a lead in Done today. `components/lead-sheet.tsx:108` re-implements the same rule to show the Sent card (D-34). If one changes (for example, to the rep's day instead of IST), the list and the sheet disagree about the same lead. Fix: export `isSentToday(analysis, today)` from `lib/queue.ts` and use it in both.
5. **Tag cut-offs are hard-coded in the UI.** `components/lead-sheet.tsx:24-31` draws the heat gauge with `pct(20)` / `pct(50)` and a comment pointing at `lib/agent/score.ts:56`, where the real thresholds are inline literals. If the scoring changes, the gauge silently shows the wrong bands. Fix: export `WARM_AT = 20, HOT_AT = 50` from `score.ts` and import them in the sheet.
6. **Two polling loops when the open lead is analysing.** `app/page.tsx:58` mounts `<AutoRefresh />` when any row is analysing, and `components/lead-sheet.tsx:114` mounts another one for the open lead. Both call `router.refresh()` every 3s, so the page re-renders twice per cycle. Fix: drop the sheet's copy, since the page-level one already covers that lead.

## Dead weight — safe to delete
- `components/ui/separator.tsx`: zero importers. My pass-1 check missed it.

## Deliberately not flagged
- No auth: a documented decision (D-10), mitigated with a README note.
- The send idempotency edge case: identical text after a failed post-send analysis is treated as a duplicate. That is acceptable.
- The analyze guard is check-then-set, not atomic. It is a cost brake, not a lock.
- `getQueueItems` loads all leads in one query. That is fine at ~25 rows.
- `next-themes` has no provider. That is harmless.
- `.agents/` stays tracked as installer output.
- Pass-1 items that are now verified fixed: idempotent send (one message for two identical POSTs), write-first reseed (25/52/5 rows after two runs), single retry layer, stale-analyzing guard (tested).
- Test gap, one line: the API routes still have no tests.

## Fix order
1. Move the guard to the analyze route (#1). It is a user-visible regression and a 3-line change.
2. Fix the reseed cleanup to use new ids (#2). It is independent and small.
3. Remove the duplicate `AutoRefresh` (#6) and share `isSentToday` (#4). Both are UI-only and safe together.
4. Export the score thresholds (#5) and unify `LeadRow` (#3) last. These are type-only refactors, checked by `tsc`.
5. Delete `separator.tsx`.
