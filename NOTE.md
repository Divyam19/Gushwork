# Submission note: PackRight Follow-ups

**Live:** https://gushwork-sooty.vercel.app · **Code:** https://github.com/Divyam19/Gushwork · **Video:** <loom-url>

**What I built.** One screen that tells each of the five reps who to follow up with today and what to say. Overdue leads are red and Hot leads come first. Each lead opens to the chat, tag, reason and a ready WhatsApp draft that the rep can edit and mark sent. Reps can add a lead or paste a new chat, and the agent re-tags that lead straight away. Sample data: 25 leads, 12 chats.

**How it decides Hot / Warm / Cold.** The model reads; code decides.
1. The model pulls yes/no buying signals from the chat, each with a quote (asked for a quote or demo, buyer waiting on us, we owe them a price, deadline, price objection, pushed to later, lost).
2. Code adds points (+35 strong intent, +25 interested, +20 buyer waiting, +15 we owe something, −25 pushed to later, minus for silence). **50+ is Hot, 20–49 Warm, below 20 Cold**; lost is always Cold. Code also sets the follow-up date: the buyer's own date, else today if they're waiting, else Hot +1, Warm +3, Cold +14 days.
3. The model writes the reason and draft. It never invents prices or dates; unknowns are `[placeholders]`.

Tags are consistent and the sheet shows the points behind each one. On the 16 hand-labelled leads: 16/16 tags, 10/10 dates, but I tuned the prompt on those, so it is in-sample.

**AI tools.** Claude Code to build, Claude for planning and sample data, OpenAI `gpt-4o-mini` inside the agent.

**Simplifications.** No login (out of scope), no real WhatsApp sending, one owner per lead, agent runs inside the request (~3–6s).

**Next.** WhatsApp Business API sync · lead reassignment and a workload view for the owner · learn scoring weights from won/lost deals · phone reminders.
