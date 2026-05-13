import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sqlite3 from 'sqlite3';
import fs from 'fs';

import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Open sqlite database directly here (do not import db.js)
const dbPath = path.join(__dirname, 'db', 'sqlite.db');
// ensure db directory exists to avoid SQLITE_CANTOPEN
try {
	const dbDir = path.dirname(dbPath);
	fs.mkdirSync(dbDir, { recursive: true });
} catch (err) {
	console.error('Failed to ensure db directory exists:', err.message);
}
try {
	if (typeof sqlite3.verbose === 'function') sqlite3.verbose();
} catch (e) {}
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
	if (err) {
		console.error('Failed to open sqlite database at', dbPath + ':', err.message);
	} else {
		console.log('Opened sqlite database at', dbPath);
	}
});
// ensure litter_prices table exists to avoid SQLITE_ERROR on queries
db.serialize(() => {
	const createSql = `
		CREATE TABLE IF NOT EXISTS litter_prices (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			observed_at TEXT NOT NULL,
			product_name TEXT NOT NULL,
			price REAL NOT NULL,
			brand TEXT
		)`;
	db.run(createSql, (err) => {
		if (err) {
			console.error('Failed to ensure litter_prices table exists:', err.message);
		} else {
			console.log('Ensured litter_prices table exists.');
		}
	});
});
// attach db to app locals for later use if needed
app.set('db', db);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// API: get all litter prices as JSON
app.get('/api/quotes', (req, res) => {
	const database = app.get('db') || db;
	const sql = 'SELECT id, observed_at, product_name, price, brand FROM litter_prices ORDER BY observed_at DESC';
	database.all(sql, [], (err, rows) => {
		if (err) {
			console.error('Failed to query litter_prices:', err.message);
			res.status(500).json({ error: 'Failed to query litter_prices', message: err.message });
			return;
		}
		res.json(rows);
	});
});

// API: query by provider/brand (POST /api)
app.post('/api', (req, res) => {
	const database = app.get('db') || db;
	const provider = req.body.provider || req.body.brand;
	if (!provider) {
		res.status(400).json({ error: 'Missing provider (or brand) in request body' });
		return;
	}
	const sql = 'SELECT id, observed_at, product_name, price, brand FROM litter_prices WHERE brand = ? ORDER BY observed_at DESC';
	database.all(sql, [provider], (err, rows) => {
		if (err) {
			console.error('Failed to query litter_prices by provider:', err.message);
			res.status(500).json({ error: 'Failed to query litter_prices', message: err.message });
			return;
		}
		res.json(rows);
	});
});

// API: query by provider via query string (GET /api?provider=...)
app.get('/api', (req, res) => {
	const database = app.get('db') || db;
	const provider = req.query.provider || req.query.brand;
	if (!provider) {
		res.status(400).json({ error: 'Missing provider query parameter' });
		return;
	}
	const sql = 'SELECT id, observed_at, product_name, price, brand FROM litter_prices WHERE brand = ? ORDER BY observed_at DESC';
	database.all(sql, [provider], (err, rows) => {
		if (err) {
			console.error('Failed to query litter_prices by provider (GET):', err.message);
			res.status(500).json({ error: 'Failed to query litter_prices', message: err.message });
			return;
		}
		res.json(rows);
	});
});

// API: insert a litter_prices record via query string (GET /api/insert?product_name=...&price=...&brand=...&observed_at=...&id=...)
app.get('/api/insert', (req, res) => {
	const database = app.get('db') || db;
	const { id, observed_at, product_name, price, brand } = req.query;
	if (!product_name || typeof price === 'undefined') {
		res.status(400).json({ error: 'Missing required fields: product_name and price' });
		return;
	}
	const priceNum = Number(price);
	if (Number.isNaN(priceNum)) {
		res.status(400).json({ error: 'Invalid price value' });
		return;
	}

	let sql, params;
	if (typeof id !== 'undefined' && id !== '') {
		sql = 'INSERT INTO litter_prices (id, observed_at, product_name, price, brand) VALUES (?, ?, ?, ?, ?)';
		params = [id, observed_at || new Date().toISOString().slice(0,10), product_name, priceNum, brand || null];
	} else {
		sql = 'INSERT INTO litter_prices (observed_at, product_name, price, brand) VALUES (?, ?, ?, ?)';
		params = [observed_at || new Date().toISOString().slice(0,10), product_name, priceNum, brand || null];
	}

	database.run(sql, params, function(err) {
		if (err) {
			console.error('Failed to insert into litter_prices:', err.message);
			res.status(500).json({ error: 'Failed to insert record', message: err.message });
			return;
		}
		const insertedId = (typeof id !== 'undefined' && id !== '') ? Number(id) : this.lastID;
		res.status(201).json({ id: insertedId, observed_at: params[0], product_name, price: priceNum, brand: brand || null });
	});
});

// API: insert a litter_prices record via POST /api/insert (JSON body)
app.post('/api/insert', (req, res) => {
	const database = app.get('db') || db;
	const { id, observed_at, product_name, price, brand } = req.body || {};
	if (!product_name || typeof price === 'undefined') {
		res.status(400).type('text').send('Missing required fields: product_name and price');
		return;
	}
	const priceNum = Number(price);
	if (Number.isNaN(priceNum)) {
		res.status(400).type('text').send('Invalid price value');
		return;
	}

	let sql, params;
	if (typeof id !== 'undefined' && id !== '') {
		sql = 'INSERT INTO litter_prices (id, observed_at, product_name, price, brand) VALUES (?, ?, ?, ?, ?)';
		params = [id, observed_at || new Date().toISOString().slice(0,10), product_name, priceNum, brand || null];
	} else {
		sql = 'INSERT INTO litter_prices (observed_at, product_name, price, brand) VALUES (?, ?, ?, ?)';
		params = [observed_at || new Date().toISOString().slice(0,10), product_name, priceNum, brand || null];
	}

	database.run(sql, params, function(err) {
		if (err) {
			console.error('Failed to insert into litter_prices (POST):', err.message);
			res.status(500).type('text').send('Failed to insert record: ' + err.message);
			return;
		}
		const insertedId = (typeof id !== 'undefined' && id !== '') ? Number(id) : this.lastID;
		res.status(201).type('text').send('Inserted id=' + insertedId);
	});
});

// API: search by product_name or brand (GET /api/search?q=term)
app.get('/api/search', (req, res) => {
	const database = app.get('db') || db;
	const q = req.query.q || '';
	if (!q) {
		res.status(400).json({ error: 'Missing q query parameter' });
		return;
	}
	const pattern = `%${q}%`;
	const sql = `SELECT id, observed_at, product_name, price, brand FROM litter_prices WHERE product_name LIKE ? OR brand LIKE ? ORDER BY observed_at DESC`;
	database.all(sql, [pattern, pattern], (err, rows) => {
		if (err) {
			console.error('Failed to search litter_prices:', err.message);
			res.status(500).json({ error: 'Failed to search litter_prices', message: err.message });
			return;
		}
		res.json(rows);
	});
});

export default app;
