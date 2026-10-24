import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { addDays, diffDays, istDate, todayIST } from './dates';
import { db } from './db';
import { MODEL } from './llm';
import { loadMock } from './mock';
import { lastContactOf, runAgent } from './agent/run';
import { schedule } from './agent/schedule';
import { score } from './agent/score';
import type { Message, Signals } from './schemas';

const FIXTURE = path.join(process.cwd(), 'mock-data', 'seed-analyses.json');

interface FixtureEntry { signals: Signals; reason: string; draft: string }
interface Fixture { anchor: string; model: string; leads: Record<string, FixtureEntry> }

async function refreshFixture(log: (s: string) => void): Promise<Fixture> {
  const { leads, chats, reps, anchor } = loadMock();
  const out: Fixture = { anchor, model: MODEL(), leads: {} };
  const queue = [...leads];
  await Promise.all(Array.from({ length: 5 }, async () => {
    for (let l; (l = queue.shift()); ) {
      const messages = chats[l.id] ?? [];
      const rep = reps.find((r) => r.id === l.rep_id)!;
      const a = await runAgent({ ...l, last_contact_date: lastContactOf(messages, l.last_contact_date) }, rep.name, messages, anchor);
      out.leads[l.id] = { signals: a.signals, reason: a.reason, draft: a.draft };
      log(`  analysed ${l.id} -> ${a.tag}`);
    }
  }));
  writeFileSync(FIXTURE, JSON.stringify(out, null, 2) + '\n');
  return out;
}

export async function seedDatabase(opts: { refresh?: boolean; log?: (s: string) => void } = {}) {
  const log = opts.log ?? (() => {});
  const { reps, leads, chats, anchor } = loadMock();
  const fixture: Fixture =
    opts.refresh || !existsSync(FIXTURE) ? await refreshFixture(log) : JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const today = todayIST();
  const shift = diffDays(today, anchor);
  const shiftTs = (ts: string) => new Date(new Date(ts).getTime() + shift * 86_400_000).toISOString();

  const leadRows: Record<string, unknown>[] = [];
  const msgRows: Record<string, unknown>[] = [];
  const analysisRows: Record<string, unknown>[] = [];
  const summary: string[] = [];

  for (const l of leads) {
    const messages: Message[] = (chats[l.id] ?? []).map((m) => ({ ...m, sent_at: shiftTs(m.sent_at) }));
    const lastContact = messages.length ? istDate(messages[messages.length - 1].sent_at) : addDays(l.last_contact_date, shift);
    const fx = fixture.leads[l.id];
    if (!fx) throw new Error(`fixture missing ${l.id}; run pnpm seed --refresh`);
    const signals: Signals = {
      ...fx.signals,
      explicit_followup: fx.signals.explicit_followup && {
        ...fx.signals.explicit_followup,
        ref_date: addDays(fx.signals.explicit_followup.ref_date, shift),
        value: fx.signals.explicit_followup.kind === 'date' ? addDays(fx.signals.explicit_followup.value, shift) : fx.signals.explicit_followup.value,
      },
    };
    const r = score({ signals, messages, lastContactDate: lastContact, today });
    const next = schedule({ signals, computed: r.computed, messages, lastContactDate: lastContact, tag: r.tag });

    leadRows.push({
      id: l.id, name: l.name, company: l.company, phone: l.phone, city: l.city || null, source: l.source,
      rep_id: l.rep_id, product_interest: l.product_interest || null, notes: l.notes || null, last_contact_date: lastContact,
    });
    for (const m of messages) msgRows.push({ lead_id: l.id, sender: m.sender, text: m.text, sent_at: m.sent_at });
    analysisRows.push({
      lead_id: l.id, tag: r.tag, score: r.score, signals: { ...signals, computed: r.computed },
      reason: fx.reason, next_followup_date: next, draft: fx.draft, draft_status: 'pending',
      status: 'ready', model: fixture.model,
    });
    summary.push(`${l.id.padEnd(4)} ${r.tag.padEnd(5)} ${String(r.score).padStart(4)}  ${next}`);
  }

  const sb = db();
  for (const t of ['analyses', 'messages', 'leads', 'reps'] as const) {
    const col = t === 'analyses' || t === 'messages' ? 'lead_id' : 'id';
    const { error } = await sb.from(t).delete().neq(col, '__none__');
    if (error) throw new Error(`delete ${t}: ${error.message}`);
  }
  for (const [t, rows] of [['reps', reps], ['leads', leadRows], ['messages', msgRows], ['analyses', analysisRows]] as const) {
    const { error } = await sb.from(t).insert(rows as never[]);
    if (error) throw new Error(`insert ${t}: ${error.message}`);
  }
  log(`lead tag score next\n${summary.join('\n')}`);
  return { today, shift, leads: leadRows.length };
}
