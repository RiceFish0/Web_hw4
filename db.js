import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'db');
const dbFile = path.join(dbDir, 'sqlite.db');

async function ensureDbDir() {
  try {
    await fs.promises.mkdir(dbDir, { recursive: true });
  } catch (err) {
    // mkdir failed
    console.error('Failed to ensure db directory:', err.message);
    throw err;
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    try {
      if (typeof sqlite3.verbose === 'function') sqlite3.verbose();
    } catch (e) {}

    const db = new sqlite3.Database(dbFile, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Failed to open database:', err.message);
        reject(err);
        return;
      }
      console.log('Database opened at', dbFile);
      resolve(db);
    });
  });
}

async function initDatabase() {
  await ensureDbDir();
  const db = await openDatabase();
  return db;
}

// Export a promise that resolves to the opened database.
const dbPromise = initDatabase();

export { dbPromise, dbFile as dbPath };
export default dbPromise;

async function ensureTableExists() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS litter_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observed_at TEXT NOT NULL,
        product_name TEXT NOT NULL,
        price REAL NOT NULL,
        brand TEXT
      )`;
    db.run(sql, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function getAllLitterPrices() {
  const db = await dbPromise;
  await ensureTableExists();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM litter_prices ORDER BY observed_at DESC', [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function addLitterPrice({ observed_at = new Date().toISOString(), product_name, price, brand = null } = {}) {
  if (!product_name || typeof price === 'undefined') {
    throw new Error('product_name and price are required');
  }
  const db = await dbPromise;
  await ensureTableExists();
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO litter_prices (observed_at, product_name, price, brand) VALUES (?, ?, ?, ?)';
    db.run(sql, [observed_at, product_name, price, brand], function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID });
    });
  });
}

export { ensureTableExists, getAllLitterPrices, addLitterPrice };

// Export seedData so other scripts can reuse the canonical UTF-8 seed
export { seedData };

// Seed data: if table is empty, insert these records.
const seedData = [
  { observed_at: "2026-01-05", product_name: "益生菌消臭豆腐砂 (條型)", price: 250, brand: "汪喵星球" },
  { observed_at: "2026-01-10", product_name: "1.5mm 極細豆腐砂", price: 280, brand: "臭味滾" },
  { observed_at: "2026-01-15", product_name: "紅標凝結木屑砂", price: 380, brand: "凱優 Cat's Best" },
  { observed_at: "2026-02-01", product_name: "綠標環保松木砂", price: 300, brand: "國際貓家" },
  { observed_at: "2026-02-12", product_name: "88% 真空天然豆腐砂", price: 220, brand: "路易貓砂" },
  { observed_at: "2026-02-20", product_name: "益生菌消臭豆腐砂 (條型)", price: 260, brand: "汪喵星球" },
  { observed_at: "2026-03-05", product_name: "綠茶消臭豆腐砂", price: 200, brand: "艾可 EcoClean" },
  { observed_at: "2026-03-10", product_name: "1.5mm 極細豆腐砂", price: 299, brand: "臭味滾" },
  { observed_at: "2026-03-15", product_name: "紅標凝結木屑砂", price: 350, brand: "凱優 Cat's Best" },
  { observed_at: "2026-03-20", product_name: "頂級環保無塵豆腐砂", price: 270, brand: "水魔素" },
  { observed_at: "2026-04-01", product_name: "益生菌消臭豆腐砂 (條型)", price: 250, brand: "汪喵星球" },
  { observed_at: "2026-04-05", product_name: "綠標環保松木砂", price: 320, brand: "國際貓家" },
  { observed_at: "2026-04-10", product_name: "88% 真空天然豆腐砂", price: 240, brand: "路易貓砂" },
  { observed_at: "2026-04-12", product_name: "綠茶消臭豆腐砂", price: 190, brand: "艾可 EcoClean" },
  { observed_at: "2026-04-15", product_name: "1.5mm 極細豆腐砂", price: 285, brand: "臭味滾" },
  { observed_at: "2026-04-20", product_name: "頂級環保無塵豆腐砂", price: 290, brand: "水魔素" },
  { observed_at: "2026-04-25", product_name: "紅標凝結木屑砂", price: 390, brand: "凱優 Cat's Best" },
  { observed_at: "2026-05-01", product_name: "88% 真空天然豆腐砂", price: 230, brand: "路易貓砂" },
  { observed_at: "2026-05-05", product_name: "綠標環保松木砂", price: 310, brand: "國際貓家" },
  { observed_at: "2026-05-10", product_name: "綠茶消臭豆腐砂", price: 210, brand: "艾可 EcoClean" }
];

async function seedIfEmpty() {
  const db = await dbPromise;
  await ensureTableExists();
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as c FROM litter_prices', [], async (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      const count = row && row.c ? row.c : 0;
      if (count > 0) {
        resolve({ seeded: false, count });
        return;
      }
      try {
        for (const item of seedData) {
          // use addLitterPrice helper
          // eslint-disable-next-line no-await-in-loop
          await addLitterPrice(item);
        }
        resolve({ seeded: true, inserted: seedData.length });
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Auto-seed if table empty (runs on import). Log result.
(async () => {
  try {
    const result = await seedIfEmpty();
    if (result && result.seeded) {
      console.log(`Seeded ${result.inserted} litter_prices records.`);
    } else {
      console.log(`litter_prices already has ${result.count} records; skipping seed.`);
    }
  } catch (err) {
    console.error('Seeding failed:', err.message);
  }
})();
