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
	// abilitare foreign key enforcement
	try { dbInstance.run('PRAGMA foreign_keys = ON;'); } catch (e) {}
	return dbInstance;
}

export function newDb() {
	if (!SQL) throw new Error("DB non inizializzato: chiama initDb()");
	dbInstance = new SQL.Database();
	// assicurarsi che le foreign key siano abilitate anche per nuovi DB
	try { dbInstance.run('PRAGMA foreign_keys = ON;'); } catch (e) {}
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

// NEW: restituisce array di oggetti con informazioni di PRAGMA table_info
export function getTableInfo(tableName) {
	if (!dbInstance) throw new Error("DB non inizializzato");
	try {
		const res = dbInstance.exec(`PRAGMA table_info("${tableName}");`);
		if (!res || res.length === 0) return [];
		const info = res[0];
		// info.columns contiene i nomi delle colonne della pragma, info.values contiene le righe
		return info.values.map(row => {
			const obj = {};
			for (let i = 0; i < info.columns.length; i++) obj[info.columns[i]] = row[i];
			return obj;
		});
	} catch (e) {
		return [];
	}
}

// NEW: helper che restituisce solo i nomi delle colonne (compatibilità con moduli esistenti)
export function getTableColumns(tableName) {
	const info = getTableInfo(tableName);
	return Array.isArray(info) ? info.map(col => col.name) : [];
}

// NEW: aggiunge una colonna (columnDef è la definizione completa, es. '"col" INTEGER DEFAULT 0')
export function addColumn(tableName, columnDef) {
	if (!dbInstance) throw new Error("DB non inizializzato");
	const stmt = `ALTER TABLE "${tableName}" ADD COLUMN ${columnDef}`;
	return exec(stmt);
}

// NEW: drop table
export function dropTable(tableName) {
	if (!dbInstance) throw new Error("DB non inizializzato");
	return exec(`DROP TABLE IF EXISTS "${tableName}";`);
}

// NEW: rename table
export function renameTable(oldName, newName) {
	if (!dbInstance) throw new Error("DB non inizializzato");
	return exec(`ALTER TABLE "${oldName}" RENAME TO "${newName}";`);
}

// NEW: aggiunge una nuova colonna che referenzia una tabella esistente
export function addForeignKeyColumn(sourceTable, columnName, type = 'INTEGER', targetTable, targetColumn) {
	if (!dbInstance) throw new Error("DB non inizializzato");
	// semplice statement: ALTER TABLE "source" ADD COLUMN "col" TYPE REFERENCES "target"("col");
	const stmt = `ALTER TABLE "${sourceTable}" ADD COLUMN "${columnName}" ${type} REFERENCES "${targetTable}"("${targetColumn}")`;
	return exec(stmt);
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
	// riabilita enforcement FK dopo import
	try { dbInstance.run('PRAGMA foreign_keys = ON;'); } catch (e) {}
	return dbInstance;
}
