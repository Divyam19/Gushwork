import { config } from 'dotenv';
config({ path: '.env.local' });
import { seedDatabase } from '../lib/seed';

seedDatabase({ refresh: process.argv.includes('--refresh'), log: console.log })
  .then((r) => console.log(`seeded ${r.leads} leads for ${r.today} (shift ${r.shift}d)`))
  .catch((e) => { console.error(e); process.exit(1); });
