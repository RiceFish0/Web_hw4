import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedData } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'db', 'sqlite.db');

(async ()=>{
  try {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err)=>{ if(err){console.error('Open error',err.message);process.exit(1);} });
    db.serialize(async ()=>{
      db.run('DROP TABLE IF EXISTS litter_prices', [], (e)=>{ if(e){console.error('Drop error', e.message); db.close(()=>process.exit(1)); return;} });
      db.run(`CREATE TABLE litter_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observed_at TEXT NOT NULL,
        product_name TEXT NOT NULL,
        price REAL NOT NULL,
        brand TEXT
      )`, [], async (e)=>{
        if(e){ console.error('Create error', e.message); db.close(()=>process.exit(1)); return; }
        // insert seedData
        const stmt = db.prepare('INSERT INTO litter_prices (observed_at, product_name, price, brand) VALUES (?, ?, ?, ?)');
        for(const item of seedData) stmt.run([item.observed_at, item.product_name, item.price, item.brand]);
        stmt.finalize((err)=>{
          if(err){ console.error('Finalize error', err.message); db.close(()=>process.exit(1)); return; }
          db.get('SELECT COUNT(*) as c FROM litter_prices', [], (ee,row)=>{
            if(ee){ console.error('Count error', ee.message); db.close(()=>process.exit(1)); return; }
            console.log('Table reset and seeded. Total rows:', row.c);
            db.close(()=>process.exit(0));
          });
        });
      });
    });
  }catch(e){ console.error(e.message); process.exit(1); }
})();
