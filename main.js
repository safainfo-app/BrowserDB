import * as DB from "./db.js";
import * as Storage from "./storage.js";

async function init() {
	// registra service worker
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
	}

	// init sql.js e DB
	await DB.initDb();

	// UI refs
	const btnNew = document.getElementById('btn-new-db');
	const btnImport = document.getElementById('btn-import');
	const btnExport = document.getElementById('btn-export');
	const fileImport = document.getElementById('file-import');
	const formCreate = document.getElementById('form-create-table');
	const tableName = document.getElementById('table-name');
	const tableCols = document.getElementById('table-columns');
	const tablesList = document.getElementById('tables-list');
	const sqlEditor = document.getElementById('sql-editor');
	const btnRunSql = document.getElementById('btn-run-sql');
	const sqlOutput = document.getElementById('sql-output');
	const btnClear = document.getElementById('btn-clear-output');

	function refreshTables() {
		const tables = DB.listTables();
		tablesList.innerHTML = '';
		if (tables.length === 0) { tablesList.textContent = "(Nessuna tabella)"; return; }
		tables.forEach(t => {
			const div = document.createElement('div');
			div.className = 'table-item';
			const left = document.createElement('div');
			left.textContent = t.name;
			const right = document.createElement('div');
			const btnShow = document.createElement('button');
			btnShow.textContent = 'Schema';
			btnShow.className = 'secondary';
			btnShow.onclick = () => {
				sqlOutput.textContent = t.sql || '—';
			};
			right.appendChild(btnShow);
			div.appendChild(left);
			div.appendChild(right);
			tablesList.appendChild(div);
		});
	}

	btnNew.onclick = () => {
		DB.newDb();
		refreshTables();
		sqlOutput.textContent = 'Nuovo DB creato.';
	};

	formCreate.onsubmit = (e) => {
		e.preventDefault();
		const name = tableName.value.trim();
		const cols = tableCols.value.trim();
		if (!name || !cols) return;
		const r = DB.createTable(name, cols);
		if (r.ok) {
			sqlOutput.textContent = `Tabella "${name}" creata.`;
			tableName.value = '';
			tableCols.value = '';
			refreshTables();
		} else {
			sqlOutput.textContent = `Errore: ${r.error}`;
		}
	};

	btnRunSql.onclick = () => {
		const sql = sqlEditor.value.trim();
		if (!sql) return;
		const r = DB.exec(sql);
		if (!r.ok) {
			sqlOutput.textContent = `Errore: ${r.error}`;
			return;
		}
		if (!r.result || r.result.length === 0) {
			sqlOutput.textContent = "Comando eseguito.";
			refreshTables();
			return;
		}
		// format result
		const out = r.result.map(t => {
			const cols = t.columns;
			const rows = t.values;
			let s = cols.join('\t') + '\n';
			rows.forEach(row => { s += row.map(v => String(v)).join('\t') + '\n'; });
			return s;
		}).join('\n---\n');
		sqlOutput.textContent = out;
	};

	btnClear.onclick = () => { sqlOutput.textContent = ''; };

	btnExport.onclick = () => {
		try {
			const bin = DB.exportSqlite();
			Storage.saveFile('browserdb.sqlite', bin, 'application/x-sqlite3');
		} catch (e) {
			sqlOutput.textContent = 'Errore export: ' + e.toString();
		}
	};

	btnImport.onclick = () => fileImport.click();
	fileImport.onchange = async (ev) => {
		const f = ev.target.files[0];
		if (!f) return;
		try {
			const ab = await Storage.readFileAsArrayBuffer(f);
			DB.importSqlite(ab);
			refreshTables();
			sqlOutput.textContent = `Database importato: ${f.name}`;
		} catch (e) {
			sqlOutput.textContent = 'Errore import: ' + e.toString();
		}
		fileImport.value = '';
	};

	// inizializza lista tabelle
	refreshTables();
}

init().catch(e => {
	console.error(e);
	document.body.innerText = 'Errore inizializzazione: ' + e.toString();
});
