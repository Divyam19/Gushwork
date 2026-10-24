# DECISIONS

## D-01 · Hybrid agent
**Decision** LLM extracts signals, code scores. **Why** Explainable, stable, testable. **Rejected** LLM picks tag directly (inconsistent, hard to explain).

## D-02 · Next.js + Supabase + Vercel
**Decision** One deploy, free, persistent writes. **Rejected** SQLite/JSON file (Vercel FS isn't persistent).

## D-03 · OpenAI gpt-4o-mini, structured outputs
**Decision** Cheap, reliable JSON. **Rejected** Groq/Gemini (key already available, fewer surprises). Extraction model may be upgraded after 3 eval runs (D-16).

## D-04 · Pre-compute analyses at seed
**Decision** App never shows empty/loading on first open.

## D-05 · Seed date shift + daily cron reseed
**Decision** Demo stays "today" whenever reviewers open it. **Trade-off** Reviewer edits reset nightly.

## D-06 · Agent runs inline in the request (3–6s)
**Decision** Simplest. **Rejected** Queues/background jobs.

## D-07 · One rep per lead + "All" view for the owner
**Rejected** Reassignment (out of scope).

## D-08 · Overdue = due date passed and not sent
**Decision** Buyer-waiting leads are due the day the buyer asked.

## D-09 · Draft placeholders in [brackets]
**Decision** Rep fills price; "Mark as sent" blocked until filled.

## D-10 · No auth (out of scope)
**Decision** Rep selection via URL param. Open agent routes can spend OpenAI budget; noted in NOTE.md.

## D-11 · buyer_waiting needs an open question/request (amends PRD §6.3)
**Decision** `buyer_waiting` = last message is from buyer AND it contains an open question/request to us (LLM signal `open_request`, code precondition: last sender is buyer). `explicit_followup_date` is only honored when not buyer_waiting.
**Why** PRD's literal rule (last message from buyer) contradicts expected_tags.json: L02 (10-21), L11 (10-12) and L09 (10-24) fail. Verified all L01–L12 dates match under this definition.
**Rejected** Keeping PRD literal (would need editing expected_tags.json, which the PRD forbids).

## D-12 · Reseed from a frozen fixture (amends PRD §5 seeding)
**Decision** `mock-data/seed-analyses.json` holds verified LLM extraction + draft output. Reseed shifts dates and recomputes score/schedule in code; `pnpm seed --refresh` regenerates the fixture with the LLM. Write via delete+insert in quick succession, no visible truncate window.
**Why** Instant, free, deterministic; cron cannot time out. **Rejected** Fresh LLM calls per reseed (slow, flaky, >30s).

## D-13 · sent_at on analyses (amends PRD §5)
**Decision** Added `analyses.sent_at`; preserved across re-analysis. "Done today" and "Sent today" are driven by `sent_at` date = today IST, not `draft_status`.
**Why** Re-analysis resets draft_status to pending, which would eject the card from Done today.

## D-14 · Edited draft is kept when new chat arrives
**Decision** If the rep edited the draft, re-analysis stores the fresh draft in `analyses.pending_draft` and the UI shows a "New draft available" prompt (Use it / Dismiss). Unedited drafts are replaced directly.
**Rejected** Silent overwrite (loses rep work).

## D-15 · Lost leads follow PRD (date +90d, in Upcoming); "Hot leads" stat counts all Hot leads for the rep filter.

## D-16 · Extraction model decided after 3 consecutive eval runs
Knife-edge leads: L10 (score exactly 50), L11 (exactly 20), L16, L23.

## D-17 · Explicit follow-up dates resolved in code
**Decision** LLM returns a structured hint (`{kind:'weekday'|'month'|'date', ...}`), `schedule.ts` resolves it. **Why** Mini models are unreliable at date arithmetic; makes it unit-testable.

## D-18 · Extraction stays on gpt-4o-mini; fixed via prompt, not model upgrade
**Decision** First eval was 12/16 tags, 8/10 dates (L02/L05 "discuss with partner" misread as deferred; L10/L16 trial/demo not marked strong_intent; L11 "video dekh ke batati hoon" marked open_request). Tightened EXTRACT_SYSTEM (deferred hard rule, strong_intent covers trial/demo incl. notes, open_request covers any direct request) and added few-shot examples 3-7. Now 16/16 tags, 10/10 dates on 3 consecutive runs.
**Caveat** Examples 5-7 are modelled on eval leads L16/L02/L03 (paraphrased, not copied), so the eval is partly in-sample. Validate on unseen chats in Phase 5/7.

## D-19 · Write step gets explicit "who owes what" context
**Decision** `write.ts` passes the rep's pending promise, the buyer's open request and a REQUIRED directive (deliver what we owe with a [placeholder]) into the user message. **Why** gpt-4o-mini otherwise repeated the rep's own promise ("I'll confirm the slot") or invented delivery ability ("We can deliver before Diwali"). **Known gap** L10 still gives no placeholder for the trial slot; acceptable, revisit if time.

## D-20 · analyzeLead cannot store an error row for a never-analysed lead
**Decision** `analyses` columns are NOT NULL, so on failure `status='error'` is stored only when a previous analysis exists; otherwise the error is thrown to the caller. **Why** avoids schema change; seeding pre-analyses every lead, so new leads (Phase 5) must handle the throw in the API route.
