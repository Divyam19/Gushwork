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

## D-21 · Dashboard data read inside a Suspense boundary
**Decision** `app/page.tsx` renders a static skeleton shell; the DB read, `searchParams` and today's date live in an async `Dashboard` component inside `<Suspense>`. **Why** This Next.js version (Cache Components) fails the build if runtime data is read outside Suspense. Also gives PRD §7.8 skeleton loading for free.

## D-22 · shadcn "base-nova" (Base UI) components
**Decision** Used the default `shadcn init` style, which builds on Base UI, not Radix. Accordion is uncontrolled and collapsed by default. Magic UI: number-ticker and border-beam only (shimmer-button comes with Phase 4).

## D-23 · Edited-draft detection via `signals.generated_draft`
**Decision** The agent stores the draft it generated in `analyses.signals.generated_draft`. On re-analysis, if `draft_status='pending'` and `draft` differs from it, the rep edited it, so the new draft goes to `pending_draft` (D-14). Regenerate (`?step=write`) is explicit and overwrites. **Why** No schema change needed. **Rejected** an `edited` boolean column (schema churn).

## D-24 · Mark as sent closes the sheet; re-analysis runs via `after()`
**Decision** `/api/leads/[id]/send` logs the message, marks sent, then re-runs the agent in `after()` so the response is instant. The dashboard auto-refreshes every 3s while any lead is `analyzing`. The sheet closes on send (card shows in Done today).

## D-25 · Native `<select>` for source/rep in Add lead
**Decision** Styled native selects instead of shadcn Select. **Why** Better on phones (reps use mobile), fully accessible, no Base UI Select quirks. PRD §8 lists `select`; behaviour is identical.

## D-26 · WhatsApp parsing runs client-side; server trusts a validated messages array
**Decision** `lib/whatsapp-parser.ts` is pure and runs in the dialogs so the rep sees a parsed preview before saving; routes validate `{sender,text,sent_at}` with zod. Timestamps in exports are treated as IST; media and system lines are skipped and counted. Failed analysis on Add lead keeps the lead (saved, shown without analysis) and toasts the error.

## D-27 · Daily reseed cron + file tracing
**Decision** `vercel.json` cron `0 19 * * *` (00:30 IST) calls `/api/cron/reseed`, which 401s unless `Authorization: Bearer $CRON_SECRET` matches (and fails closed if the secret is unset). `outputFileTracingIncludes` ships `mock-data/**` with that route since the seed reads it from disk. **Trade-off** reviewer edits reset nightly (D-05).

## D-28 · Search palette is client-side over the already-loaded leads
**Decision** Cmd/Ctrl+K filters the 25 leads passed from the server in-memory via cmdk. No search endpoint. **Why** Tiny dataset; zero latency.

## D-29 · Write step: buyer-waiting leads get a REQUIRED "answer now, use placeholders" directive
**Decision** Extends D-19: not just when we owe something, but whenever the buyer is waiting, the draft must answer the open request with a `[placeholder]` for unknown price/date. **Why** Smoke test on L12 (new chat "send updated price, 3 machines") produced drafts that ignored or deferred the request. **Caveat** The frozen seed fixture drafts predate this; run `pnpm seed --refresh` to regenerate them (costs ~25 LLM calls).

## D-30 · UI declutter pass (polish only, no new features)
**Decision** Lead cards became Linear-style rows in one bordered list: tag dot, name · company, one-line reason, due text (score, product chip, rep avatar-on-mobile removed; tag/score still in the dot tooltip and the sheet). Stats became one slim line of numbers (same anchor links). Overdue shows 5 with "Show N more". Sheet: reason + follow-up date first, points chips behind a "Why Hot?" expander, draft in its own card, chat last (latest 3 messages, "Show earlier"). Add lead: five required fields up front, rest under "More details". Red is now used only for overdue text and the Hot dot; negative-point chips are grey. Indigo stays the one accent. **Rejected** a `?filter=` URL state for the stats (new feature).

## D-31 · Lead sheet redesign: tag-tinted hero, heat gauge, three numbered steps
**Decision** The sheet header is tinted by the lead's tag (Hot rose→orange, Warm amber, Cold slate) with an initials tile, contact pills (phone copies on click) and a Cold→Warm→Hot heat gauge that places the code-computed score on the 20/50 cut-offs from `score.ts`; clicking it reveals the points breakdown as a ledger with a total. Below are three colour-separated steps: 1 Why now (white, tag-coloured rail, follow-up pill red only when overdue), 2 Send this (indigo, the one accent = action), 3 Conversation (WhatsApp-beige, white/green bubbles). The sheet opens at the top instead of scrolling to the last message. The full duplicated draft preview for placeholders became a single "Fill in before sending" chip row, so Mark as sent stays above the fold at 800px. Fixed the sheet width (primitive's `sm:max-w-sm` was overriding 560px). **Why** Presentation only; no new data or features.

## D-32 · Dashboard redesign to match the sheet
**Decision** Sticky white top bar (rep picker as a segmented pill control; Add lead is icon-only on phones). The stats line became an indigo "Today" hero: IST greeting (`greetingIST`, rep's first name when filtered), a progress ring of sent / (sent + overdue + due today), a "Start here" card that opens the same lead the border beam marks (overdue[0], else dueToday[0]), and the four counts as glass chips (same anchor links). Each bucket is a card with its own colour band: Overdue rose, Due today sky, Upcoming slate, Done today emerald (Upcoming/Done side by side on desktop). Rows use the sheet's tag-gradient initials tile and a due pill (red only when overdue). Tag colours live in `components/tag-theme.ts`, shared by rows, sheet, hero and search. **Why** Presentation only; every number and link already existed. Accordion panel's default `[&_a]:underline` / `[&_p]:mb-4` overridden so rows render the same inside it.

## D-33 · CRM layout: sidebar views + one table, no page scroll
**Decision** Supersedes D-32's stacked layout. Left sidebar lists the four buckets as views (Overdue / Due today / Upcoming / Done today, with counts) plus a small "Today" card (progress ring, sent of total, hot count). The main pane shows one view at a time as a table: Lead · Status · Next step · Due · Owner, with a sticky header; on desktop the page is fixed to the viewport and only the table scrolls. View is a `?view=` URL param (default: Overdue if any, else Due today), preserved across rep switches, search and closing the sheet. The indigo hero and "Show N more" cap were removed (the table scrolls instead). On phones the sidebar becomes a swipeable tab row and the table shows Lead + Due only. **Why** User asked for a CRM look with less scrolling; it's the same data and actions, rearranged.

## D-34 · Sheet shows a "Sent" state for leads sent today
**Decision** If `analyses.sent_at` is today (IST), step 2 of the sheet becomes a green "Sent · time" card (message is already in the conversation; shows the next follow-up date) instead of the editable draft + Mark as sent. The next draft stays available behind "Write another message". **Why** After Mark as sent the agent re-drafts in `after()`, and the new draft was near-identical, so a lead sitting in Done today looked unsent. No change to the agent or API.

## D-35 · Motion pass: springs for what moves, expo-out for what arrives
**Decision** Added `motion` springs (already a dependency) only where an element travels: the sidebar and rep-switcher active highlights (`layoutId`, so they glide between items), the progress ring, and the heat-gauge pin. Everything that merely appears uses one CSS family in `globals.css` (`--ease-out-expo`, `.anim-rise/.anim-fade/.anim-pop`, staggered via `--i`, capped at 14 rows): table rows (replayed on every view switch by keying the table body on the view), the sheet's hero and three sections, the Sent card, the points ledger and the rep card. The sheet now slides the full width on the iOS sheet curve and has a real exit: it mounts closed → opens on the next frame (an already-open mount never plays its slide-in), and on close it slides out first, then navigates (`onOpenChangeComplete`). Row hover shows an indigo edge and press scales slightly. Animations use `backwards` fill, not `both`, so their end state doesn't pin `transform` over hover/press styles. `MotionConfig reducedMotion="user"` plus a `prefers-reduced-motion` block turn it all down. **Why** The UI felt static; this is presentation only. **Moved** `VIEWS`/`viewCount` to `components/views.ts` because `view-nav.tsx` is now a client component and the server page can't read values exported from one.

## D-36 · Mobile pass (375px): sticky chrome, 44px targets, 16px inputs, full-width sheet
**Decision** Phones get a one-row sticky header (logo, 40px search/add); the rep picker moves into the page as big scrollable name chips (`RepChips`, `md:hidden`; the header pill switcher is `md:` only); the view tabs are a sticky bar under the header (`ViewNav`'s `<aside>` is `display: contents` below md so the bar can stick for the whole page; a real sidebar from md up). The page scrolls normally on phones (fixed-viewport + inner table scroll stays desktop-only). Rows show the reason on 2 lines and the table header row is hidden. **Bug fixed:** the lead sheet was 270px wide on a phone because the primitive's `data-[side=right]:w-3/4` beat `w-full`; it is now full width. Sheet/dialog close buttons, tabs, chips, pills, dialog fields/selects and search rows are 40-44px tall on phones; every text field is 16px on phones (iOS zooms the page on focus below that: draft textarea, selects, paste-chat textarea, search box). Mark as sent is full width on its own row with Copy / Regenerate side by side. Added `viewport-fit: cover` with safe-area padding (header top, sheet and page bottom), `touch-action: manipulation` and a transparent tap highlight. **Not changed** desktop layout; sheet stays a right-side panel on phones (a bottom sheet was considered, not needed).

## D-37 · Phone layout redesign + audit fixes
**Decision (phone UI)** Below md the view tabs are a 4-segment control (count over label, sticky), the rep card is hidden (the selected chip already says who), the title is screen-reader only, and the list is full width. The phone page body is a flex column; a grid there stretched its rows to the screen height. **Decision (audit, see AUDIT.md)** (1) Auth stays out of scope (D-10); the real gate for a public deploy is Vercel Deployment Protection, and the cost of repeated calls is capped by a one-run-at-a-time guard in `analyzeLead`. (2) Reseed writes new data first (upsert, insert messages, then delete superseded rows) instead of deleting first, so a failure never leaves blank tables. (3) One retry layer: `callStructured` retries, `analyzeLead` no longer does, so a run fits `maxDuration`. An `analyzing` row older than 60s reads as an error (`lib/analysis-status.ts`), which also stops `AutoRefresh`. (4) `send` is idempotent for identical text and checks its writes. (5) One `Rep`/`AnalysisRow`/`MessageInput` definition in `lib/schemas.ts`, one `lib/messages.ts`, one `lib/api-client.ts`. **Rejected** a Postgres RPC for an atomic reseed (needs a manual migration on the live project) and in-memory rate limiting (does nothing across serverless instances).

## D-38 · Audit pass 2 fixes
**Decision** The one-run-per-lead guard moves out of `analyzeLead` and into `POST /api/leads/[id]/analyze` (409 while a fresh run is in progress). Inside `analyzeLead` it blocked "Add chat" right after "Mark as sent". Internal callers may overlap; the later run has the newer chat and overwrites. Reseed deletes messages not in the ids it just inserted, instead of reading old ids (PostgREST caps reads at 1,000). Also: one `LeadRow` type (`MockLead` is its all-strings CSV form), `isSentToday` shared by the queue and the sheet, `WARM_AT`/`HOT_AT` exported from `score.ts` for the gauge, and a single page-level `AutoRefresh`.

## D-39 · No nightly reseed
**Decision** Removed the `vercel.json` cron. The `/api/cron/reseed` route stays as a manual, secret-protected reset (`pnpm seed` does the same locally). **Why** The nightly wipe erased reviewers' sends and edits ("Done today" emptied); persistence matters more than dates re-anchoring automatically. **Trade-off** Dates are anchored to the last seed, so reseed right before sharing. Supersedes the cron parts of D-05 and D-27.

## D-40 · Delivered promises clear `rep_promise_pending`
**Decision** After a rep sends the promised price, re-analysis kept `rep_promise_pending` and `price_objection_unresolved` true (Kavita, L07: even a clear "Best price is ₹3,00,000 + GST" left "We owe the best price", Hot). The extract prompt's few-shot Example 1 is that exact chat and anchored the answer. Fixed in the prompt only: the rule now says to read the rep messages after the promise and treat a short or informal delivery as delivered; a new rep price/offer addresses the objection until the buyer pushes back; added Example 8 (Example 1's chat plus the delivered price). Tags are still decided in code. **Check** `pnpm eval` 16/16 tags, 10/10 dates after the change; the L07 + price reply case now returns Warm with no pending promise.
