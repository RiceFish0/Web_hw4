import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dbPromise from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'db', 'sqlite.db');

function runSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

(async () => {
  try {
    // backup DB
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = dbPath + ".bak-migration-" + timestamp;
    fs.copyFileSync(dbPath, backupPath);
    console.log('Backup created at', backupPath);

    const db = await dbPromise;

    // Start transaction
    await runSql(db, 'BEGIN TRANSACTION');

    // Create new table with desired schema
    await runSql(db, `
      CREATE TABLE IF NOT EXISTS litter_prices_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observed_at TEXT NOT NULL,
        product_name TEXT NOT NULL,
        price REAL NOT NULL,
        brand TEXT
      )
    `);

    // Copy data (preserve matching columns)
    await runSql(db, `
      INSERT INTO litter_prices_new (id, observed_at, product_name, price, brand)
      SELECT id, observed_at, product_name, price, brand FROM litter_prices
    `);

    // Verify rows copied
    const newCountRows = await allSql(db, 'SELECT COUNT(*) as c FROM litter_prices_new');
    const oldCountRows = await allSql(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='litter_prices'");
    console.log('Rows copied to litter_prices_new:', newCountRows[0].c);

    // Drop old table
    await runSql(db, 'DROP TABLE IF EXISTS litter_prices');

    // Rename new table
    await runSql(db, 'ALTER TABLE litter_prices_new RENAME TO litter_prices');

    // Commit
    await runSql(db, 'COMMIT');

    // Final count
    const finalCountRows = await allSql(db, 'SELECT COUNT(*) as c FROM litter_prices');
    console.log('Final rows in litter_prices:', finalCountRows[0].c);

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    try {
      const db = await dbPromise;
      await runSql(db, 'ROLLBACK');
    } catch (e) {
      // ignore
    }
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
})();
