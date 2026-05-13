import dbPromise from '../db.js';

(async () => {
  try {
    const db = await dbPromise;
    db.all("PRAGMA table_info('litter_prices')", [], (err, rows) => {
      if (err) {
        console.error('ERR', err.message);
        process.exit(1);
      }
      console.log(JSON.stringify(rows, null, 2));
      process.exit(0);
    });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
