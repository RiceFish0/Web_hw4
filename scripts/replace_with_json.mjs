import fs from 'fs/promises';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'db', 'sqlite.db');
const jsonPath = path.join(__dirname, 'seed.json');

(async () => {
  try {
    const txt = await fs.readFile(jsonPath, 'utf8');
    const seed = JSON.parse(txt);
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) { console.error('Open error:', err.message); process.exit(1); }
    });
    db.serialize(() => {
      db.run('DELETE FROM litter_prices', [], function (delErr) {
        if (delErr) { console.error('Delete error:', delErr.message); db.close(()=>process.exit(1)); return; }
        console.log('Deleted existing rows');
        const stmt = db.prepare('INSERT INTO litter_prices (observed_at, product_name, price, brand) VALUES (?, ?, ?, ?)');
        for (const item of seed) stmt.run([item.observed_at, item.product_name, item.price, item.brand]);
        stmt.finalize((err) => {
          if (err) { console.error('Finalize error:', err.message); db.close(()=>process.exit(1)); return; }
          db.get('SELECT COUNT(*) as c FROM litter_prices', [], (e, row) => {
            if (e) { console.error('Count error:', e.message); db.close(()=>process.exit(1)); return; }
            console.log('Replaced with JSON seed. Total now:', row.c);
            db.close(()=>process.exit(0));
          });
        });
      });
    });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
