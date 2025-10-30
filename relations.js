export function createRelations({ relSrcTable, relSrcCol, relTargetTable, relTargetCol, btnAddRelation, logger, db }) {
	let onAdded = null;

	// helper per popolare una select di colonne
	function populateColumnsSelect(tableSelect, colSelect) {
		colSelect.innerHTML = '<option value="">(seleziona campo)</option>';
		const tableName = tableSelect.value;
		if (tableName) {
			const cols = db.getTableColumns(tableName) || [];
			cols.forEach(col => {
				const opt = document.createElement('option');
				opt.value = col;
				opt.textContent = col;
				colSelect.appendChild(opt);
			});
		}
	}

	function updateTablesSelects() {
		const tables = db.listTables();
		[relSrcTable, relTargetTable].forEach(select => {
			const current = select.value;
			select.innerHTML = '<option value="">(seleziona tabella)</option>';
			tables.forEach(t => {
				const opt = document.createElement('option');
				opt.value = t.name;
				opt.textContent = t.name;
				select.appendChild(opt);
			});
			if (current) select.value = current;
		});
	}

	// quando cambia una tabella, aggiorna solo le sue colonne
	relSrcTable.addEventListener('change', () => populateColumnsSelect(relSrcTable, relSrcCol));
	relTargetTable.addEventListener('change', () => populateColumnsSelect(relTargetTable, relTargetCol));

	btnAddRelation.onclick = () => {
		const table1 = relSrcTable.value;
		const field1 = relSrcCol.value;
		const table2 = relTargetTable.value;
		const field2 = relTargetCol.value;

		if (!table1 || !field1 || !table2 || !field2) {
			logger.log('Seleziona tutti i campi per creare la relazione');
			return;
		}

		try {
			// usa timestamp per nome univoco
			const tempTable = `temp_${Date.now()}`;

			// 1. ottieni schema attuale
			const res = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table1}'`);
			if (!res.ok || !res.result?.[0]?.values?.[0]) {
				logger.log('Errore: impossibile leggere schema tabella');
				return;
			}
			let createStmt = res.result[0].values[0][0];

			// 2. modifica lo schema aggiungendo FK
			createStmt = createStmt.replace(/\)$/, `, FOREIGN KEY ("${field1}") REFERENCES "${table2}"("${field2}"))`);
			createStmt = createStmt.replace(`"${table1}"`, `"${tempTable}_new"`);

			// 3. ricrea la tabella con FK usando transazione
			const steps = [
				'BEGIN TRANSACTION',
				// prima creiamo una copia dei dati
				`CREATE TABLE "${tempTable}" AS SELECT * FROM "${table1}"`,
				// poi creiamo la nuova struttura con FK
				createStmt,
				// copiamo i dati nella nuova struttura
				`INSERT INTO "${tempTable}_new" SELECT * FROM "${tempTable}"`,
				// rimuoviamo la vecchia tabella
				`DROP TABLE "${table1}"`,
				// rinominiamo la nuova
				`ALTER TABLE "${tempTable}_new" RENAME TO "${table1}"`,
				// puliamo la tabella temporanea
				`DROP TABLE "${tempTable}"`,
				'COMMIT'
			];

			for (const sql of steps) {
				const r = db.exec(sql);
				if (!r.ok) {
					// rollback e pulisci in caso di errore
					db.exec('ROLLBACK');
					db.exec(`DROP TABLE IF EXISTS "${tempTable}"`);
					db.exec(`DROP TABLE IF EXISTS "${tempTable}_new"`);
					logger.log(`Errore: ${r.error}`);
					return;
				}
			}

			logger.log(`Relazione creata: "${table1}.${field1}" referenzia "${table2}.${field2}"`);
			if (onAdded) onAdded();

		} catch (e) {
			// assicurati che non rimangano tabelle temp
			try { db.exec('ROLLBACK'); } catch (_) {}
			try { db.exec(`DROP TABLE IF EXISTS "${tempTable}"`); } catch (_) {}
			try { db.exec(`DROP TABLE IF EXISTS "${tempTable}_new"`); } catch (_) {}
			logger.log(`Errore: ${e.toString()}`);
		}
	};

	// inizializza select
	function refresh() {
		updateTablesSelects();
		populateColumnsSelect(relSrcTable, relSrcCol);
		populateColumnsSelect(relTargetTable, relTargetCol);
	}

	refresh();

	return {
		refresh,
		onRelationAdded(cb) { onAdded = cb; }
	};
}
