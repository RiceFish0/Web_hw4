import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'db', 'sqlite.db');

(async () => {
  try {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error('Open error:', err.message);
        process.exit(1);
      }
    });

    db.serialize(() => {
      db.run('DELETE FROM litter_prices', [], function (err) {
        if (err) {
          console.error('Delete error:', err.message);
          db.close(() => process.exit(1));
          return;
        }
        console.log('Deleted existing rows from litter_prices');
        db.close(async () => {
          try {
            await import('../db.js'); // triggers seedIfEmpty
            const db2 = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
              if (err) {
                console.error('Open2 error:', err.message);
                process.exit(1);
              }
            });
            db2.get('SELECT COUNT(*) as c FROM litter_prices', [], (e, row) => {
              if (e) {
                console.error('Count error:', e.message);
                db2.close(() => process.exit(1));
                return;
              }
              console.log('Rows after reseed:', row.c);
              db2.close(() => process.exit(0));
            });
          } catch (e) {
            console.error('Reseed import failed:', e.message);
            process.exit(1);
          }
        });
      });
    });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
