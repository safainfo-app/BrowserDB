export function createRelations({ relSrcTable, relSrcCol, relType, relTargetTable, relTargetCol, btnAddRelation, logger, db }) {
	let onAdded = null;

	function updateSelects() {
		const tableNames = db.listTables().map(t => t.name);
		[relSrcTable, relTargetTable].forEach(sel => {
			const prev = sel.value;
			sel.innerHTML = '<option value="">(seleziona)</option>';
			tableNames.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });
			if (prev) sel.value = prev;
		});
		relTargetCol.innerHTML = '<option value="">(col)</option>';
		if (relTargetTable.value) {
			db.getTableColumns(relTargetTable.value).forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; relTargetCol.appendChild(o); });
		}
		relSrcCol.placeholder = relSrcTable.value ? 'nuova_col_oppure_esistente' : 'fk_col';
	}

	relTargetTable.addEventListener('change', updateSelects);
	relSrcTable.addEventListener('change', updateSelects);

	btnAddRelation.onclick = async () => {
		const srcTable = relSrcTable.value;
		const srcCol = relSrcCol.value.trim();
		const type = relType.value;
		const tgtTable = relTargetTable.value;
		const tgtCol = relTargetCol.value;
		if (!srcTable || !srcCol || !tgtTable || !tgtCol) { logger.log('Compila tutti i campi della relazione.'); return; }
		const res = db.addForeignKeyColumn(srcTable, srcCol, type, tgtTable, tgtCol);
		if (res.ok) {
			logger.log(`Colonna "${srcCol}" aggiunta a "${srcTable}" con FK -> ${tgtTable}(${tgtCol}).`);
			if (onAdded) onAdded();
			updateSelects();
		} else {
			logger.log(`Errore relazione: ${res.error}`);
		}
	};

	return {
		refresh: updateSelects,
		onRelationAdded(cb) { onAdded = cb; }
	};
}
