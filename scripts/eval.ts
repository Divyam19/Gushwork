import { config } from 'dotenv';
config({ path: '.env.local' });
import { extractSignals } from '../lib/agent/extract';
import { schedule } from '../lib/agent/schedule';
import { score } from '../lib/agent/score';
import { usage, MODEL } from '../lib/llm';
import { loadMock } from '../lib/mock';
import { istDate } from '../lib/dates';

async function main() {
  const { leads, chats, expected, anchor } = loadMock();
  const only = process.argv.slice(2).filter((a) => /^L\d+$/.test(a));
  const todo = expected.filter((e) => !only.length || only.includes(e.lead_id));
  console.log(`model=${MODEL()} anchor=${anchor}`);

  const rows: string[] = [];
  let tagOk = 0, dateOk = 0, dateTotal = 0;

  const run = async (e: (typeof expected)[number]) => {
    const lead = leads.find((l) => l.id === e.lead_id)!;
    const messages = chats[e.lead_id] ?? [];
    const lastContact = messages.length ? istDate(messages[messages.length - 1].sent_at) : lead.last_contact_date;
    const warns: string[] = [];
    const signals = await extractSignals(
      { ...lead, last_contact_date: lastContact, product_interest: lead.product_interest, notes: lead.notes },
      messages, anchor, { warn: (m) => warns.push(m) },
    );
    const r = score({ signals, messages, lastContactDate: lastContact, today: anchor });
    const date = schedule({ signals, computed: r.computed, messages, lastContactDate: lastContact, tag: r.tag });
    const tOk = r.tag === e.tag;
    const dChecked = !!e.next_followup_date;
    const dOk = !dChecked || date === e.next_followup_date;
    if (tOk) tagOk++;
    if (dChecked) { dateTotal++; if (dOk) dateOk++; }
    const pts = r.computed.points.map((p) => `${p.pts > 0 ? '+' : ''}${p.pts}`).join(' ');
    rows.push(
      `${e.lead_id} ${tOk ? 'PASS' : 'FAIL'} tag ${r.tag}/${e.tag} score ${r.score} [${pts}] | date ${date}${dChecked ? (dOk ? ' PASS' : ` FAIL (want ${e.next_followup_date})`) : ' (unchecked)'}${warns.length ? '\n    ' + warns.join('\n    ') : ''}`,
    );
  };

  const queue = [...todo];
  await Promise.all(Array.from({ length: 5 }, async () => { for (let e; (e = queue.shift()); ) await run(e); }));

  console.log(rows.sort().join('\n'));
  console.log(`\nTAGS ${tagOk}/${todo.length}  DATES ${dateOk}/${dateTotal}  tokens in=${usage.prompt} out=${usage.completion} calls=${usage.calls}`);
  process.exit(tagOk === todo.length && dateOk === dateTotal ? 0 : 1);
}
main();
