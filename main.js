import * as DB from "./db.js";
import * as Storage from "./storage.js";
import { createTableBuilder } from "./table-builder.js";
import { createRelations } from "./relations.js";
import { createTablesList } from "./tables-list.js";
import { createLogger } from "./ui.js";

async function init() {
	await DB.initDb();

	// DOM refs
	const els = {
		btnNew: document.getElementById('btn-new-db'),
		btnImport: document.getElementById('btn-import'),
		btnExport: document.getElementById('btn-export'),
		fileImport: document.getElementById('file-import'),
		// builder
		formBuilder: document.getElementById('table-builder-form'),
		tableName: document.getElementById('table-name'),
		columnsList: document.getElementById('columns-list'),
		btnAddCol: document.getElementById('btn-add-column'),
		// relations
		relSrcTable: document.getElementById('rel-src-table'),
		relSrcCol: document.getElementById('rel-src-col'),
		relType: document.getElementById('rel-type'),
		relTargetTable: document.getElementById('rel-target-table'),
		relTargetCol: document.getElementById('rel-target-col'),
		btnAddRelation: document.getElementById('btn-add-relation'),
		// tables list + log
		tablesList: document.getElementById('tables-list'),
		log: document.getElementById('sql-output'),
		// editing controls
		btnCancelEdit: document.getElementById('btn-cancel-edit'),
		btnDropTable: document.getElementById('btn-drop-table'),
		editIndicator: document.getElementById('edit-indicator'),
		editingName: document.getElementById('editing-name')
	};

	const logger = createLogger(els.log);
	const tableBuilder = createTableBuilder({
		columnsListEl: els.columnsList,
		btnAddCol: els.btnAddCol,
		formEl: els.formBuilder,
		tableNameEl: els.tableName,
		logger,
		db: DB
	});
	const relations = createRelations({
		relSrcTable: els.relSrcTable,
		relSrcCol: els.relSrcCol,
		relTargetTable: els.relTargetTable,
		relTargetCol: els.relTargetCol,
		btnAddRelation: els.btnAddRelation,
		logger,
		db: DB
	});
	// pass relations.refresh as onChange so tables-list notifies relations when drop happens
	const tablesList = createTablesList({
		container: els.tablesList,
		logger,
		db: DB,
		onEdit: startEditingTable,
		onChange: relations.refresh
	});

	// editing state
	let editingTable = null;

	// start editing: populate builder with existing columns
	function startEditingTable(tableName) {
		editingTable = tableName;
		els.editIndicator.style.display = '';
		els.editingName.textContent = tableName;
		els.btnCancelEdit.style.display = '';
		els.btnDropTable.style.display = '';
		els.tableName.disabled = true;
		els.tableName.value = tableName;
		const info = DB.getTableInfo(tableName);
		tableBuilder.loadColumns(info);
	}

	function stopEditing() {
		editingTable = null;
		els.editIndicator.style.display = 'none';
		els.btnCancelEdit.style.display = 'none';
		els.btnDropTable.style.display = 'none';
		els.tableName.disabled = false;
		els.tableName.value = '';
		tableBuilder.reset();
		tablesList.refresh();
	}

	// wire builder callbacks
	tableBuilder.onCreate(async (tableNameVal, colsDef) => {
		const r = DB.createTable(tableNameVal, colsDef);
		if (r.ok) {
			logger.log(`Tabella "${tableNameVal}" creata.`);
			tableBuilder.reset();
			tablesList.refresh();
			// aggiorna selects relazioni
			relations.refresh();
		} else {
			logger.log(`Errore: ${r.error}`);
		}
	});
	tableBuilder.onAddColumns(async (originalTable, newColsDefs) => {
		// add sequentially
		for (const def of newColsDefs) {
			const r = DB.addColumn(originalTable, def);
			if (!r.ok) { logger.log(`Errore aggiunta colonna: ${r.error}`); return; }
		}
		logger.log(`Aggiunte ${newColsDefs.length} colonne a "${originalTable}".`);
		// aggiorna selects relazioni
		relations.refresh();
		stopEditing();
	});

	// relations module uses DB.addForeignKeyColumn internally and refreshes selects
	relations.onRelationAdded(() => {
		tablesList.refresh();
	});

	// tables-list edit/cancel/drop actions
	els.btnCancelEdit.onclick = () => { if (editingTable) stopEditing(); };
	els.btnDropTable.onclick = async () => {
		if (!editingTable) return;
		if (!confirm(`Eliminare definitivamente la tabella "${editingTable}"?`)) return;
		const r = DB.dropTable(editingTable);
		if (r.ok) {
			logger.log(`Tabella "${editingTable}" eliminata.`);
			stopEditing();
		} else {
			logger.log(`Errore: ${r.error}`);
		}
	};

	// new/import/export
	els.btnNew.onclick = () => { DB.newDb(); tablesList.refresh(); relations.refresh(); logger.log('Nuovo DB creato.'); };
	els.btnExport.onclick = () => {
		try {
			const bin = DB.exportSqlite();
			Storage.saveFile('browserdb.sqlite', bin, 'application/x-sqlite3');
			logger.log('Database esportato.');
		} catch (e) { logger.log('Errore export: ' + e.toString()); }
	};
	els.btnImport.onclick = () => els.fileImport.click();
	els.fileImport.onchange = async (ev) => {
		const f = ev.target.files[0];
		if (!f) return;
		try {
			const ab = await Storage.readFileAsArrayBuffer(f);
			DB.importSqlite(ab);
			tablesList.refresh();
			relations.refresh();
			logger.log(`Database importato: ${f.name}`);
		} catch (e) { logger.log('Errore import: ' + e.toString()); }
		els.fileImport.value = '';
	};

	// special: when form submitted in builder and we are editing, delegate to addColumns
	els.formBuilder.addEventListener('submit', (ev) => {
		ev.preventDefault();
		const nameVal = els.tableName.value.trim();
		if (!nameVal) { logger.log('Inserisci il nome della tabella.'); return; }
		const colsDef = tableBuilder.gatherColumnsDef();
		if (!colsDef) { logger.log('Aggiungi almeno una colonna.'); return; }

		if (editingTable) {
			// compute which columns are new
			const existing = DB.getTableInfo(editingTable).map(c => c.name);
			const rows = tableBuilder.getRows();
			const toAdd = [];
			for (const r of rows) {
				const cname = r.name.trim();
				if (!cname) continue;
				if (!existing.includes(cname)) {
					let def = `"${cname}" ${r.type}`;
					if (r.pk) def += ' PRIMARY KEY';
					toAdd.push(def);
				}
			}
			if (toAdd.length === 0) { logger.log('Nessuna colonna nuova da aggiungere.'); return; }
			tableBuilder.emitAddColumns(editingTable, toAdd);
			return;
		}

		tableBuilder.emitCreate(nameVal, colsDef);
	});

	// init UI
	tablesList.refresh();
	relations.refresh();
}

init().catch(e => {
	console.error(e);
	document.body.innerText = 'Errore inizializzazione: ' + e.toString();
});
