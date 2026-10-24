# FollowUp — Lead follow-up agent
**Live:** <vercel-url> · **Code:** <github-url> · **Video:** <loom-url>

**What I built.** One screen for PackRight's 5 reps: who to follow up today (overdue first, in red), why, and a ready-to-send WhatsApp draft. Reps can edit and mark drafts sent, add leads and paste new chats; the agent re-tags the lead right away.

**How the agent decides Hot/Warm/Cold.** Three steps. (1) An LLM reads the chat and notes and extracts yes/no buying signals, each with a quote as evidence. (2) Plain code scores them (e.g. +35 asked for a quote/demo/visit, +20 buyer waiting on us, −25 deferred, −recency) → ≥50 Hot, 20–49 Warm, <20 Cold; "lost" is always Cold. Code also sets the follow-up date (buyer's own date > buyer waiting > our pending promise > Hot +1 / Warm +3 / Cold +14 days). (3) The LLM writes a one-line reason and the draft, with `[placeholders]` instead of invented prices. Code decides, so tags are consistent and explainable; the sheet shows the evidence behind every tag. On the 16 hand-labelled leads: 16/16 tags and 10/10 dates (3 runs). The prompt was tuned on those same leads, so treat it as in-sample (D-18).

**AI tools.** Claude Code for building, OpenAI gpt-4o-mini inside the agent, Claude for planning/PRD/sample data.

**Simplifications.** No auth (rep chosen via URL); one owner per lead, no reassignment; agent runs inline in the request (~3–6s) rather than a queue; analyses are pre-computed at seed with dates anchored to the seed day (reseed to refresh); WhatsApp is copy/paste, not integrated.

**Known gaps.** Drafts occasionally omit a `[placeholder]` where a price is needed (D-19); mobile layout and the search palette were not browser-verified before this note.

**What I'd build next.** WhatsApp Business API sync (auto-import chats, send from app) · lead reassignment & owner view of rep workload · learn scoring weights from won/lost outcomes · reminders on rep phones.
