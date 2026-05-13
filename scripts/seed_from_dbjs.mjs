import { addLitterPrice } from '../db.js';
import { seedData } from '../db.js';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'db', 'sqlite.db');

(async () => {
  try {
    // delete all rows first using sqlite3 directly
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) { console.error('Open error:', err.message); process.exit(1); }
    });
    db.run('DELETE FROM litter_prices', [], async (delErr) => {
      if (delErr) { console.error('Delete error:', delErr.message); db.close(()=>process.exit(1)); return; }
      db.close(async () => {
        // use addLitterPrice helper for correct insertion
        for (const item of seedData) {
          await addLitterPrice(item);
        }
        // verify
        const db2 = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
          if (err) { console.error('Open2 error:', err.message); process.exit(1); }
        });
        db2.get('SELECT COUNT(*) as c FROM litter_prices', [], (e, row) => {
          if (e) { console.error('Count error:', e.message); db2.close(()=>process.exit(1)); return; }
          console.log('Re-seeded from db.js seedData. Total now:', row.c);
          db2.close(()=>process.exit(0));
        });
      });
    });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
