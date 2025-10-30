// Wrapper minimale per sql.js
let SQL;
let dbInstance = null;

export async function initDb(env = {}) {
	// initSqlJs è esposto dal bundle incluso in index.html
	if (!window.initSqlJs) throw new Error("sql.js non trovato. Assicurarsi che sql-wasm.js sia caricato.");
	SQL = await window.initSqlJs({
		locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
		...env
	});
	dbInstance = new SQL.Database();
	return dbInstance;
}

export function newDb() {
	if (!SQL) throw new Error("DB non inizializzato: chiama initDb()");
	dbInstance = new SQL.Database();
	return dbInstance;
}

export function exec(sql) {
	if (!dbInstance) throw new Error("DB non inizializzato");
	try {
		const res = dbInstance.exec(sql); // array of result objects
		return { ok: true, result: res };
	} catch (e) {
		return { ok: false, error: e.toString() };
	}
}

export function createTable(name, columnsDef) {
	const stmt = `CREATE TABLE IF NOT EXISTS "${name}" (${columnsDef})`;
	return exec(stmt);
}

export function listTables() {
	const res = exec(`SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;`);
	if (!res.ok) return [];
	const rows = res.result[0];
	if (!rows) return [];
	const cols = rows.columns;
	return rows.values.map(r => {
		const obj = {};
		for (let i = 0; i < cols.length; i++) obj[cols[i]] = r[i];
		return obj;
	});
}

export function exportSqlite() {
	if (!dbInstance) throw new Error("DB non inizializzato");
	const binary = dbInstance.export(); // Uint8Array
	return binary;
}

export function importSqlite(arrayBuffer) {
	if (!SQL) throw new Error("sql.js non inizializzato");
	const u8 = new Uint8Array(arrayBuffer);
	dbInstance = new SQL.Database(u8);
	return dbInstance;
}
