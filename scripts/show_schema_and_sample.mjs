import dbPromise from '../db.js';

(async () => {
  try {
    const db = await dbPromise;
    db.all("PRAGMA table_info('litter_prices')", [], (err, cols) => {
      if (err) { console.error('ERR schema', err.message); process.exit(1); }
      console.log('SCHEMA:');
      console.log(JSON.stringify(cols, null, 2));
      db.all("SELECT * FROM litter_prices ORDER BY observed_at DESC LIMIT 5", [], (err2, rows) => {
        if (err2) { console.error('ERR rows', err2.message); process.exit(1); }
        console.log('\nSAMPLE 5 ROWS:');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
      });
    });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
