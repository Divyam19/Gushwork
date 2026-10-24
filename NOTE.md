# Submission note: PackRight Follow-ups

**Live app:** https://gushwork-sooty.vercel.app (mirror: https://gushwork-production.up.railway.app) · **Code:** https://github.com/Divyam19/Gushwork · **Video:** <loom-url>

**What I built.** One screen that tells each of PackRight's five reps who to follow up with today and what to say. Overdue leads are in red, Hot leads come first, and each lead opens to the chat, the tag, the reason and a ready WhatsApp draft. The rep can edit the draft, mark it sent, add a new lead, or paste a new chat, and the agent re-tags that lead straight away. Sample data: 25 leads and 12 chats.

**How the agent decides Hot / Warm / Cold.** The model reads the chat; plain code decides.
1. The model pulls yes/no buying signals from the chat and notes, each with a quote (asked for a quote or demo, buyer waiting on us, we owe them a price, deadline, price objection, pushed to later, lost).
2. Code adds up points: +35 strong intent, +25 interested, +20 buyer waiting, +15 we owe something, +10 deadline, −10 price objection, −25 pushed to later, minus for silence. **50+ is Hot, 20–49 Warm, below 20 Cold**; a lost lead is always Cold. Code also picks the follow-up date (the buyer's own date first, then buyer waiting, then our promise, then Hot +1, Warm +3, Cold +14 days).
3. The model writes the one-line reason and the draft. It never invents a price or date; unknowns are `[placeholders]` that must be filled before sending.

Because code decides, tags are consistent, and the sheet shows the points behind every tag. On the 16 hand-labelled leads: 16/16 tags and 10/10 dates. I tuned the prompt on those same leads, so that is in-sample, not a held-out score.

**AI tools.** Claude Code to build and review the app, Claude for the plan and sample data, OpenAI `gpt-4o-mini` inside the agent.

**Simplifications.** No login (out of scope), no real WhatsApp sending, one owner per lead, and the agent runs inside the request (about 3–6 seconds) instead of a queue. Dates are anchored to the day the demo was last seeded.

**What I'd build next.** WhatsApp Business API sync (import chats, send from the app) · reassigning leads, and an owner view of each rep's workload · learning the scoring weights from won and lost deals · phone reminders for reps.
