import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'db', 'sqlite.db');

const seedData = [
  { observed_at: "2026-01-05", product_name: "¯q¥Íµß®ø¯ä¨§»G¬â (±ø«¬)", price: 250, brand: "¨LØp¬P²y" },
  { observed_at: "2026-01-10", product_name: "1.5mm ·¥²Ó¨§»G¬â", price: 280, brand: "¯ä¨ýºu" },
  { observed_at: "2026-01-15", product_name: "¬õ¼Ð¾®µ²¤ì®h¬â", price: 380, brand: "³ÍÀu Cat's Best" },
  { observed_at: "2026-02-01", product_name: "ºñ¼ÐÀô«OªQ¤ì¬â", price: 300, brand: "°ê»Ú¿ß®a" },
  { observed_at: "2026-02-12", product_name: "88% ¯uªÅ¤ÑµM¨§»G¬â", price: 220, brand: "¸ô©ö¿ß¬â" },
  { observed_at: "2026-02-20", product_name: "¯q¥Íµß®ø¯ä¨§»G¬â (±ø«¬)", price: 260, brand: "¨LØp¬P²y" },
  { observed_at: "2026-03-05", product_name: "ºñ¯ù®ø¯ä¨§»G¬â", price: 200, brand: "¦ã¥i EcoClean" },
  { observed_at: "2026-03-10", product_name: "1.5mm ·¥²Ó¨§»G¬â", price: 299, brand: "¯ä¨ýºu" },
  { observed_at: "2026-03-15", product_name: "¬õ¼Ð¾®µ²¤ì®h¬â", price: 350, brand: "³ÍÀu Cat's Best" },
  { observed_at: "2026-03-20", product_name: "³»¯ÅÀô«OµL¹Ð¨§»G¬â", price: 270, brand: "¤ôÅ]¯À" },
  { observed_at: "2026-04-01", product_name: "¯q¥Íµß®ø¯ä¨§»G¬â (±ø«¬)", price: 250, brand: "¨LØp¬P²y" },
  { observed_at: "2026-04-05", product_name: "ºñ¼ÐÀô«OªQ¤ì¬â", price: 320, brand: "°ê»Ú¿ß®a" },
  { observed_at: "2026-04-10", product_name: "88% ¯uªÅ¤ÑµM¨§»G¬â", price: 240, brand: "¸ô©ö¿ß¬â" },
  { observed_at: "2026-04-12", product_name: "ºñ¯ù®ø¯ä¨§»G¬â", price: 190, brand: "¦ã¥i EcoClean" },
  { observed_at: "2026-04-15", product_name: "1.5mm ·¥²Ó¨§»G¬â", price: 285, brand: "¯ä¨ýºu" },
  { observed_at: "2026-04-20", product_name: "³»¯ÅÀô«OµL¹Ð¨§»G¬â", price: 290, brand: "¤ôÅ]¯À" },
  { observed_at: "2026-04-25", product_name: "¬õ¼Ð¾®µ²¤ì®h¬â", price: 390, brand: "³ÍÀu Cat's Best" },
  { observed_at: "2026-05-01", product_name: "88% ¯uªÅ¤ÑµM¨§»G¬â", price: 230, brand: "¸ô©ö¿ß¬â" },
  { observed_at: "2026-05-05", product_name: "ºñ¼ÐÀô«OªQ¤ì¬â", price: 310, brand: "°ê»Ú¿ß®a" },
  { observed_at: "2026-05-10", product_name: "ºñ¯ù®ø¯ä¨§»G¬â", price: 210, brand: "¦ã¥i EcoClean" }
];

(async () => {
  try {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error('Open error:', err.message);
        process.exit(1);
      }
    });

    db.serialize(() => {
      const stmt = db.prepare('INSERT INTO litter_prices (observed_at, product_name, price, brand) VALUES (?, ?, ?, ?)');
      for (const item of seedData) {
        stmt.run([item.observed_at, item.product_name, item.price, item.brand]);
      }
      stmt.finalize((err) => {
        if (err) {
          console.error('Finalize error:', err.message);
          db.close(() => process.exit(1));
          return;
        }
        db.get('SELECT COUNT(*) as c FROM litter_prices', [], (e, row) => {
          if (e) {
            console.error('Count error:', e.message);
            db.close(() => process.exit(1));
            return;
          }
          console.log('Inserted seed rows. Total now:', row.c);
          db.close(() => process.exit(0));
        });
      });
    });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
