# PRD — Lead Follow-up Agent ("FollowUp")

> Take-home for the Gushwork FDE role. **Deadline: 36 hours from receipt (received Sat 24 Oct 2026).**
> This PRD is written for a coding agent. Read it fully before writing code. Follow it literally; where it is silent, pick the simplest option and log it in `DECISIONS.md`.

---

## 0. Before you write any code — create these 4 files

| File | Purpose | Who updates it |
|---|---|---|
| `AGENTS.md` | Rules for any AI coding agent working in this repo (stack, conventions, commands, do/don't). Template in §13. | Create once, update when conventions change |
| `DECISIONS.md` | Every non-obvious choice, one entry each: *Decision · Why · Alternatives rejected*. Seed entries in §14. | Append whenever you choose between options |
| `PROGRESS.md` | Checklist of build phases (§12). Tick items as done, note blockers. A new agent session must read this first and continue from the first unticked item. | After every phase / session |
| `NOTE.md` | The half-page submission note. Template in §15. | Fill in at the end |

`AGENTS.md` must tell the agent: *"Read PRD.md, then PROGRESS.md, then DECISIONS.md before doing anything."*

---

## 1. The problem (from the brief)

A small company — we call it **PackRight Machines** — sells packaging equipment to other businesses. 5 sales reps.
- Leads live in an Excel sheet and in WhatsApp chats.
- Reps forget to follow up, so good leads go cold.
- The owner can't see which leads are hot and who needs a reply today.

**Goal:** one simple screen that tells each rep *who to follow up with today, and what to say.*

## 2. How we are graded (pass/fail each — design every choice against this)

| Check | Pass means | How this PRD satisfies it |
|---|---|---|
| It works | Live link opens, main flow runs with no errors | Seeded DB, pre-computed analyses, error states everywhere, smoke test before submit |
| Agent is useful | Tags + reasons make sense for the chats | Hybrid agent: LLM extracts evidence, code scores (§6). `npm run eval` against `expected_tags.json` |
| Drafts are usable | A rep could send with small or no edits | Draft rules (§6.4): specific, short, one ask, Hinglish when buyer uses it, never invents prices |
| Screen is clear | Rep knows who to call within 10 s | Overdue → Today → Upcoming, red overdue, big stats, one card per lead (§7) |
| Scope is right | Only what was asked, done well. No half-built extras | §3 scope lock. Every extra idea goes to NOTE.md "what's next" |
| You can explain it | Note + video explain how and why | Deterministic scoring with visible evidence chips; DECISIONS.md |

Need 5/6 including "It works".

## 3. Scope lock

**In scope (build all, build well):**
1. Sample data: 25 leads, 12 WhatsApp chats, 5 reps (provided in `/mock-data`).
2. Agent: read leads + chats → tag Hot/Warm/Cold with one-line reason → next follow-up date → draft next message.
3. Screen: today's follow-ups at top, most urgent first; overdue stands out; open a lead to see chat, tag, reason, draft; edit draft + mark sent; add new lead; add new chat → agent re-analyses that lead.
4. Rep switcher (avatar group) incl. "All reps" view for the owner — because the brief says *each rep*.

**Out of scope (do NOT build):** login/auth, real WhatsApp sending, payments, reassigning leads, analytics/charts, notifications, email, multi-tenant, settings page, dark-mode toggle (follow system), deleting leads, editing lead fields.

If something seems missing, **don't build it** — add it to `NOTE.md → What I'd build next`.

## 4. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| App | **Next.js (latest stable, App Router) + TypeScript** | API routes for the agent. Server Components for reads. |
| Styling | **Tailwind CSS v4 + shadcn/ui** | Plus Magic UI registry for 3 accent components only (§8). |
| DB | **Supabase (Postgres)** | Accessed **only server-side** with the service-role key. No RLS needed (no auth). Never expose the key to the client. |
| LLM | **OpenAI** — `OPENAI_MODEL` env, default `gpt-4o-mini` | Structured outputs via `zod` + `openai` SDK (`zodResponseFormat` / `responses.parse`). Temperature 0.2. |
| Validation | `zod` | Shared schemas in `lib/schemas.ts`. |
| Dates | `date-fns` + `date-fns-tz` | **All "today" logic in `Asia/Kolkata`.** |
| Hosting | **Vercel** (free) | |
| Package manager | pnpm | |

Env vars (`.env.local`, and in Vercel):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
SEED_ANCHOR_DATE=2026-10-24
```

## 5. Data model (Supabase SQL — put in `supabase/schema.sql`)

```sql
create table reps (
  id text primary key,              -- 'rahul'
  name text not null,
  initials text not null,
  color text not null               -- hex, used for avatar bg
);

create table leads (
  id text primary key,              -- 'L01' or 'L' || short id for new ones
  name text not null,
  company text not null,
  phone text not null,
  city text,
  source text not null,             -- IndiaMART | Website | Trade Show | Referral | Cold Call | WhatsApp
  rep_id text not null references reps(id),
  product_interest text,
  notes text,
  last_contact_date date not null,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references leads(id) on delete cascade,
  sender text not null check (sender in ('rep','buyer')),
  text text not null,
  sent_at timestamptz not null
);
create index on messages(lead_id, sent_at);

create table analyses (
  lead_id text primary key references leads(id) on delete cascade,
  tag text not null check (tag in ('Hot','Warm','Cold')),
  score int not null,
  signals jsonb not null,           -- full signal object incl. evidence (see §6.2)
  reason text not null,             -- one line, ≤ 15 words
  next_followup_date date not null,
  draft text not null,
  draft_status text not null default 'pending' check (draft_status in ('pending','sent')),
  status text not null default 'ready' check (status in ('ready','analyzing','error')),
  error text,
  model text,
  analyzed_at timestamptz default now()
);
```

`last_contact_date` = date of the latest message if a chat exists, else the CSV value. Keep it in sync whenever messages are added.

### Seeding (`scripts/seed.ts`, run with `pnpm seed`)
1. Truncate all tables. Insert reps, leads, messages from `/mock-data`.
2. **Date shift:** all mock dates are relative to `SEED_ANCHOR_DATE` (2026-10-24). Compute `shift = today_IST − anchor` in days and add it to every date/timestamp. This keeps the demo looking fresh whenever it's seeded.
3. Run the agent on every lead (concurrency 5) and store analyses, so the app **never** shows an empty or loading state on first open.
4. Print a table: lead · tag · score · next date.

Also add a Vercel Cron (`vercel.json`) hitting `GET /api/cron/reseed` daily at 00:30 IST (19:00 UTC), protected by `CRON_SECRET`, that re-runs the seed. Reason: reviewers may open the link days later; without this, every date drifts into "overdue". Log in DECISIONS.md.

## 6. The agent

### 6.1 Design: "LLM reads, code decides, LLM writes"
Three steps per lead. This split is the core story for the video and note.

```
lead + notes + chat
   │
   ▼
[1] EXTRACT (LLM, structured JSON) ── yes/no signals, each with a short evidence quote
   │
   ▼
[2] SCORE + SCHEDULE (pure TypeScript, deterministic, unit-tested)
   │      → score, tag, next_followup_date
   ▼
[3] WRITE (LLM, structured JSON) ── one-line reason + WhatsApp draft
   │
   ▼
analyses row
```

Why: tags are explainable and stable (same input → same tag), the LLM never "vibes" a tag, and every tag can show the evidence that produced it. Put all agent code in `lib/agent/`: `extract.ts`, `score.ts`, `schedule.ts`, `write.ts`, `run.ts` (orchestrator), `prompts.ts`.

### 6.2 Step 1 — Extract signals (LLM)

Input: lead fields (name, company, source, product_interest, notes, last_contact_date), full chat with dates and sender labels (`REP`/`BUYER`), and today's date (IST).

Output schema (`zod`):
```ts
const Signal = z.object({ value: z.boolean(), evidence: z.string().nullable() }); // evidence = ≤12-word quote from chat/notes
const Signals = z.object({
  strong_intent: Signal,               // asked final price for a quantity, proforma/PO, demo/trial/factory visit, delivery date for an order
  medium_intent: Signal,               // asked specs, brochure, video, capacity, general price; or is considering/discussing internally
  rep_promise_pending: Signal,         // rep promised something (price, slot, document) and the chat shows it wasn't delivered
  time_pressure: Signal,               // buyer mentioned a deadline: festival, launch date, "this week", "next week"
  price_objection_unresolved: Signal,  // buyer said too expensive / competitor cheaper AND it's not resolved by a later buyer message
  deferred: Signal,                    // buyer explicitly pushed to later: next quarter, next year, after monsoon
  lost: Signal,                        // not interested / bought elsewhere / asked not to contact
  buyer_waiting_no_chat: Signal,       // ONLY for leads with no chat: notes show an enquiry/question we haven't answered
  explicit_followup_date: z.string().nullable(), // YYYY-MM-DD if buyer named a time ("Monday meeting" → day after that Monday; "January" → first Monday of Jan; "November" → first Monday of Nov)
  language: z.enum(['english','hinglish']), // hinglish if buyer writes any Hindi words
});
```
Prompt rules: be literal, only mark a signal true if the chat/notes support it, evidence must be copied from the text. Include 2 few-shot examples (use L07 and L06).

### 6.3 Step 2 — Score, tag and schedule (code only)

Computed in code from the chat (not the LLM):
- `buyer_waiting` = last message is from buyer. (No chat → use `buyer_waiting_no_chat`.)
- `ghosting` = last 2+ messages are from rep with no buyer reply.
- `days_since` = today − last_contact_date.

**Score** (`score.ts`):

| Signal | Points |
|---|---|
| strong_intent | +35 |
| medium_intent (only if no strong_intent) | +25 |
| buyer_waiting | +20 |
| rep_promise_pending | +15 |
| time_pressure | +10 |
| price_objection_unresolved | −10 |
| ghosting | −15 |
| deferred | −25 |
| recency: 0–3 days / 4–10 / 11–20 / >20 | +10 / 0 / −5 / −20 |

**Tag:** `lost` → **Cold** always. Else score ≥ 50 → **Hot**, 20–49 → **Warm**, < 20 → **Cold**.

**Next follow-up date** (`schedule.ts`), first rule that applies wins:
1. `explicit_followup_date` set → that date.
2. `lost` → last_contact + 90 days.
3. `buyer_waiting` → date of the **first unanswered buyer message** (so it shows as overdue if old — that's the point).
4. `rep_promise_pending` → day after the promise message.
5. By tag from last_contact: Hot +1 day, Warm +3, Cold +14.
6. If the result falls on a Sunday, move to Monday.

**Overdue** = `next_followup_date < today_IST` and `draft_status = 'pending'`.
**Due today** = `next_followup_date = today_IST` and pending.

Store the full breakdown in `signals` jsonb as `{ ...llmSignals, computed: { buyer_waiting, ghosting, days_since, points: [{label, pts}] } }` so the UI can show *why*.

Unit tests (`vitest`) for `score.ts` and `schedule.ts` with at least the 12 chat leads.

### 6.4 Step 3 — Reason + draft (LLM)

Input: lead, chat, tag, score breakdown, next follow-up date, rep name, company name "PackRight Machines".
Output:
```ts
z.object({
  reason: z.string(),  // ≤ 15 words, plain, cites the strongest signal. e.g. "Asked final price for 2 units before Diwali — waiting on us 2 days."
  draft: z.string(),   // the WhatsApp message
})
```

**Draft rules (put verbatim in the prompt):**
- WhatsApp tone, 2–4 short lines, ≤ 60 words. No subject line, no "Dear Sir/Madam", no emojis except at most one 🙏.
- Address the buyer the way the rep already does in the chat (Rajesh ji, Meena ma'am, Imran bhai). Default: first name + "ji".
- If `language = hinglish`, write natural Hinglish (Roman script) mixed with English, like the buyer.
- Answer the buyer's last open question first if they're waiting. Apologise briefly ("Sorry for the delay") only if they've waited > 1 day.
- Reference specifics from the chat (model, quantity, deadline).
- End with exactly **one clear ask** (confirm a slot, share PO, quick call today at a time).
- **Never invent** prices, discounts, delivery dates, stock or specs not in the chat. If the reply needs one, put a placeholder in square brackets: `[best price]`, `[delivery date]`. The UI highlights these.
- Cold + deferred/lost: short, polite, no pressure; one line of value; ask if it's ok to check back.
- Sign off with rep first name only.

### 6.5 Orchestration (`run.ts`)
`analyzeLead(leadId)`: set `status='analyzing'` → extract → score/schedule → write → upsert analyses (`status='ready'`, `draft_status='pending'`). On any error: retry once, then `status='error'`, keep the previous tag/draft if one exists, store the error message. Log token usage.

### 6.6 Eval (`pnpm eval`)
Runs the agent on all leads in `mock-data/expected_tags.json` (using the anchor date as "today", no DB) and prints pass/fail per lead for tag and date. Target: all 16 tags correct. Tune prompts — **not** the expected file — until they pass. Record the final result in PROGRESS.md.

## 7. Screens & UX

One page app. Route `/` (dashboard), lead detail as a right-side **Sheet** (URL `/?lead=L01` so it's linkable). Layout max-width ~1200px, generous whitespace, Inter or Geist font.

### 7.1 Header
- Left: logo mark + "PackRight · Follow-ups". Under it: today's date in IST ("Saturday, 24 Oct").
- Right: **Rep switcher** — an avatar group (5 initials avatars in rep colors + an "All" chip). Selected = ring + full opacity; others 60% opacity. Selection stored in URL `?rep=rahul` (default `all`). Tooltip shows name.
- Far right: `+ Add lead` button (primary) and `Cmd/Ctrl+K` search hint.

### 7.2 Stats row (4 tiles, NumberTicker numbers)
**Overdue** (red) · **Due today** (amber) · **Hot leads** · **Sent today**. Clicking Overdue / Due today scrolls to that section. Counts respect the rep filter.

### 7.3 Follow-up list (the heart — must pass the 10-second test)
Three sections, in order, each with a header and count:
1. **Overdue** — red section header. Sort: tag (Hot→Warm→Cold), then days late desc, then score desc.
2. **Due today** — Sort: tag, then score desc.
3. **Upcoming** — collapsed by default (`Accordion`), sorted by date asc. Show next 7 days; "Later" group below.
4. **Done today** — leads marked sent today, faded, collapsed.

Each **lead card** (one row, clickable, keyboard focusable):
- Left: tag badge (Hot = red/orange solid, Warm = amber soft, Cold = slate/blue soft) + score in small muted text.
- Middle: **Buyer name · Company** (bold), the one-line reason (muted), product interest chip.
- Right: due label — overdue in red bold "**2 days late**", "Due today", or "Tue 27 Oct"; rep avatar (small) when viewing "All".
- Overdue cards: red left border (4px) + light red tint. The **single most urgent card** gets the Border Beam (§8) — only one, so it pulls the eye without clutter.
- Status `analyzing` → card shows a shimmer skeleton line "Agent is updating…". Status `error` → small warning icon with tooltip.

Empty states: "Nothing due today 🎉 — next up: Meena Kulkarni, Tue." Never a blank screen.

### 7.4 Lead detail Sheet (right side, ~560px, full screen on mobile)
Top: name, company, phone (click-to-copy), city, source, rep avatar, tag badge, score.
Then, in order:
1. **Why this tag** — the reason line + signal chips showing each points contribution with its evidence on hover (e.g. `+35 Asked final price for 2 units`, `+20 Waiting on us 2 days`). This is what we show in the video.
2. **Next follow-up** — date + overdue state.
3. **Draft message** — editable `Textarea` (autosize). Bracket placeholders `[like this]` highlighted amber in a preview line under the box with a warning "Fill 1 placeholder before sending". Buttons: **Mark as sent** (Shimmer Button, primary), **Copy**, **Regenerate** (ghost, re-runs step 3 only). Edits auto-save (debounced 600ms) to `analyses.draft`.
4. **Chat** — WhatsApp-style bubbles (rep right, green tint; buyer left, neutral), date separators, timestamps. Newest at the bottom, auto-scrolled. Notes from the CSV shown as a small grey "CRM note" card at the top if present.
5. Footer: `+ Add chat` button.

**Mark as sent** flow: append draft as a `rep` message with `sent_at = now()` → set `draft_status='sent'`, update `last_contact_date` → toast "Sent to Rajesh · logged in chat" → card moves to **Done today** → trigger re-analysis in background (new tag, new date, new draft ready for next time). Disabled while placeholders remain unfilled (show why on hover).

### 7.5 Add lead (Dialog)
Fields: name*, company*, phone*, city, source (select)*, rep (select, defaults to current rep filter)*, product interest, notes, and optional **"Paste WhatsApp chat"** textarea. On save: insert lead (+ messages) → run agent → open the new lead's Sheet with the result. Show the agent progress in the dialog button ("Analysing…").

### 7.6 Add chat (Dialog, from the Sheet)
Textarea: "Paste new WhatsApp messages". Two modes via a small segmented toggle:
- **Paste export** (default): parse WhatsApp export lines `dd/mm/yy, hh:mm - Name: text` (also `[dd/mm/yy, hh:mm:ss] Name: text`). Sender = `rep` if name matches the lead's rep first name, else `buyer`. Multi-line messages append to the previous one. Show a parsed preview before saving.
- **Single message**: sender toggle (Buyer / Rep) + text, timestamp = now.
On save: insert messages → re-run agent → Sheet updates live (tag badge animates if it changed: "Warm → Hot").

### 7.7 Search (Command palette, Cmd/Ctrl+K)
Search leads by name/company/phone → opens Sheet.

### 7.8 Responsive & polish
- Works at 375px wide (reps live on phones): stats become 2×2, sheet full screen.
- All interactive elements keyboard-accessible; visible focus rings; WCAG AA contrast on badges.
- Optimistic UI for edits/mark sent; toasts via Sonner; no layout shift.
- Loading: skeletons, never spinners in the main list.

## 8. Component list (shadcn + 3 accents)

Install from shadcn: `button`, `badge`, `card`, `sheet`, `dialog`, `textarea`, `input`, `select`, `label`, `tabs` (only if needed), `accordion`, `avatar`, `tooltip`, `command`, `sonner`, `skeleton`, `separator`, `scroll-area`, `toggle-group`.

Accents (Magic UI registry via shadcn CLI — check current install URL at magicui.design):
- **Number Ticker** — stats row numbers.
- **Shimmer Button** — "Mark as sent" only.
- **Border Beam** — the single most urgent overdue card only.
- **Avatar Circles / avatar group** — rep switcher (or build with shadcn `avatar` + negative spacing).

Chat bubbles: build with Tailwind (or AI Elements `message` component if it fits cleanly — don't fight it).

**Rule:** no other animated/decorative components. Motion only on: number ticker, card enter (subtle fade), tag change, sheet open. Clean > flashy.

Visual style: neutral background (zinc-50 / zinc-950), white cards, 12px radius, soft borders, one brand color (indigo-600). Tag colors: Hot `red-600`, Warm `amber-500`, Cold `slate-500`. Overdue red is reserved for overdue only.

## 9. API routes (Route Handlers, all server-side)

| Method | Route | Does |
|---|---|---|
| GET | `/api/leads?rep=` | Leads + latest analysis, grouped/sorted (sorting logic in `lib/queue.ts`, shared with server components) |
| GET | `/api/leads/[id]` | Lead + messages + analysis |
| POST | `/api/leads` | Create lead (+ optional pasted chat) → analyze → return lead |
| POST | `/api/leads/[id]/messages` | Add messages → analyze → return analysis |
| PATCH | `/api/leads/[id]/draft` | Save edited draft text |
| POST | `/api/leads/[id]/send` | Mark sent (§7.4) |
| POST | `/api/leads/[id]/analyze` | Re-run full agent; `?step=write` for regenerate draft only |
| GET | `/api/cron/reseed` | Re-seed (checks `Authorization: Bearer CRON_SECRET`) |

Validate all bodies with zod; return `{ error }` with proper status codes. Set `export const maxDuration = 30` on agent routes. Agent runs inline (await) — it takes ~3–6s and keeps things simple; the UI shows "Analysing…". Log this in DECISIONS.md.

## 10. Folder structure
```
app/
  page.tsx                 # dashboard (server component, reads ?rep, ?lead)
  layout.tsx
  api/...                  # §9
components/
  header.tsx  rep-switcher.tsx  stats-row.tsx
  lead-list.tsx  lead-card.tsx  lead-sheet.tsx
  chat-thread.tsx  draft-editor.tsx  why-tag.tsx
  add-lead-dialog.tsx  add-chat-dialog.tsx  search-command.tsx
  ui/                      # shadcn + magic ui
lib/
  agent/ (extract, score, schedule, write, run, prompts)
  db.ts  queue.ts  dates.ts  whatsapp-parser.ts  schemas.ts
scripts/ seed.ts  eval.ts
supabase/ schema.sql
mock-data/ (provided)
tests/ score.test.ts  schedule.test.ts  whatsapp-parser.test.ts  queue.test.ts
AGENTS.md DECISIONS.md PROGRESS.md NOTE.md README.md
```

## 11. Mock data (provided in `/mock-data`)

- `reps.json` — 5 reps: Rahul Sharma, Priya Nair, Arjun Mehta, Sneha Iyer, Vikram Singh.
- `leads.csv` — 25 leads across Indian SMBs (snacks, spices, pharma, dairy, textiles…), sources: IndiaMART, Website, Trade Show, Referral, Cold Call, WhatsApp. L01–L12 have chats; L13–L25 have only CRM notes (the agent must still tag them from notes).
- `chats.json` — 12 WhatsApp chats (L01–L12), mixed English/Hinglish, designed to cover every signal: hot with buyer waiting (L01, L03, L07, L09), rep forgot a promise (L10), considering (L02, L05, L11), ghosting (L04), deferred (L06, L12), lost (L08).
- `expected_tags.json` — expected tags and dates for eval (§6.6). Anchor date 2026-10-24.

## 12. Build phases (copy into PROGRESS.md as a checklist)

**Phase 0 — Setup (≤1h)**: create AGENTS/DECISIONS/PROGRESS/NOTE.md · init Next.js + Tailwind + shadcn · Supabase project + `schema.sql` · env vars · push to GitHub · first Vercel deploy of the empty app (deploy early!).
**Phase 1 — Agent (≤4h)**: `score.ts` + `schedule.ts` + tests · `extract.ts` + `write.ts` + prompts · `run.ts` · `pnpm eval` passing.
**Phase 2 — Seed (≤1h)**: `seed.ts` with date shift + pre-analysis · verify rows in Supabase.
**Phase 3 — Dashboard (≤4h)**: header, rep switcher, stats, sections, cards, sorting (`queue.ts` + tests).
**Phase 4 — Lead sheet (≤3h)**: why-tag chips, chat thread, draft editor, mark sent, regenerate.
**Phase 5 — Add flows (≤2h)**: add lead, add chat + WhatsApp parser + tests, live update.
**Phase 6 — Polish (≤2h)**: empty/loading/error states, mobile, keyboard, Cmd+K, cron reseed.
**Phase 7 — Ship (≤2h)**: prod deploy, smoke test (§16), README, NOTE.md, record ≤3-min video, submit.

Stop adding features after Phase 6. Leave ≥4h buffer before the deadline.

## 13. AGENTS.md template
```md
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
```

## 14. DECISIONS.md seed entries
Use format: `## D-01 · Title` → **Decision** · **Why** · **Rejected**.
- D-01 Hybrid agent: LLM extracts signals, code scores → explainable, stable, testable. Rejected: LLM picks tag directly (inconsistent, hard to explain).
- D-02 Next.js + Supabase + Vercel → one deploy, free, persistent writes. Rejected: SQLite/JSON file (Vercel FS isn't persistent).
- D-03 OpenAI gpt-4o-mini, structured outputs → cheap, reliable JSON. Rejected: free Groq/Gemini (key already available, fewer surprises).
- D-04 Pre-compute analyses at seed → app never shows empty/loading on first open.
- D-05 Seed date shift + daily cron reseed → demo stays "today" whenever reviewers open it; trade-off: reviewer edits reset nightly.
- D-06 Agent runs inline in the request (3–6s) → simplest; rejected queues/background jobs.
- D-07 Each lead owned by one rep + "All" view for the owner → matches "each rep" in brief. Reassignment left out (scope).
- D-08 Overdue = due date passed and not sent; buyer-waiting leads are due the day the buyer asked → surfaces the exact problem the owner described.
- D-09 Draft placeholders in [brackets] instead of invented numbers → rep fills price; "Mark as sent" blocked until filled.
- D-10 No auth (out of scope) → rep selection via URL param.

## 15. NOTE.md template (≤ half a page)
```md
# FollowUp — Lead follow-up agent
**Live:** <url> · **Code:** <github> · **Video:** <loom>

**What I built.** One screen for PackRight's 5 reps: who to follow up today (overdue first, in red), why, and a ready-to-send WhatsApp draft. Reps can edit and mark drafts sent, add leads and paste new chats; the agent re-tags the lead instantly.

**How the agent decides Hot/Warm/Cold.** Three steps. (1) An LLM reads the chat and notes and extracts yes/no buying signals, each with a quote as evidence. (2) Plain code scores them (e.g. +35 asked for a quote/demo, +20 buyer waiting on us, −25 deferred, −recency) → ≥50 Hot, 20–49 Warm, <20 Cold; "lost" is always Cold. Code also sets the follow-up date (buyer's own date > buyer waiting > our pending promise > Hot +1 / Warm +3 / Cold +14 days). (3) The LLM writes a one-line reason and the draft, without inventing prices. Code decides, so tags are consistent and explainable; the screen shows the evidence behind every tag.

**AI tools.** <coding agent> for building, OpenAI <model> inside the agent, Claude for planning/PRD/sample data.

**Simplifications.** <from DECISIONS.md>

**What I'd build next.** WhatsApp Business API sync (auto-import chats, send from app) · lead reassignment & owner view of rep workload · learn scoring weights from won/lost outcomes · reminders on rep phones.
```

## 16. Pre-submit smoke test (on the LIVE url, incognito, desktop + phone)
- [ ] Opens in < 3s, no console errors, overdue section visible above the fold.
- [ ] Rep switcher filters all sections and stats.
- [ ] Open L01 → chat, Hot tag, reason, evidence chips, Hinglish draft visible.
- [ ] Edit draft, refresh → edit persisted.
- [ ] L07 draft has `[best price]` placeholder → Mark sent disabled → fill → sent → moves to Done today, appears in chat.
- [ ] Add lead with pasted chat → tagged within ~10s.
- [ ] Add chat to L12 ("Hi, monsoon over. Send updated price, we need 3 machines.") → Cold becomes Hot/Warm live.
- [ ] Cmd+K finds "Kulkarni".
- [ ] Re-run `pnpm seed` to reset before recording and before submitting.

## 17. Video script (≤ 3 min)
0:00 Problem in one line → open app, "Rahul opens it in the morning". 0:20 Overdue in red, stats; switch to Rahul. 0:40 Open Rajesh (L01): chat, Hot, why-chips, Hinglish draft → small edit → Mark sent → moves to Done. 1:20 Kavita (L07): placeholder blocks send → fill price → send. 1:45 Paste a new chat into Gopal (L12) → tag flips Cold → Hot live. 2:10 Add a new lead. 2:30 Explain agent in one sentence with the 3-step diagram + "code decides, LLM writes". 2:50 Close.
