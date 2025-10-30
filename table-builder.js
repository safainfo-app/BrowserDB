export function createTableBuilder({ columnsListEl, btnAddCol, formEl, tableNameEl, logger, db }) {
	const TYPE_OPTIONS = ['TEXT','INTEGER','REAL','BLOB'];
	let onCreateCb = null;
	let onAddColsCb = null;

	function createColumnRow(data = {}) {
		const row = document.createElement('div');
		row.className = 'column-row';

		const nameInput = document.createElement('input');
		nameInput.type = 'text';
		nameInput.placeholder = 'col_name';
		nameInput.value = data.name || '';

		const typeSelect = document.createElement('select');
		TYPE_OPTIONS.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; typeSelect.appendChild(o); });
		if (data.type) typeSelect.value = data.type;

		const pkChk = document.createElement('input');
		pkChk.type = 'checkbox';
		pkChk.title = 'PK';
		pkChk.checked = !!data.pk;

		const btnRemove = document.createElement('button');
		btnRemove.type = 'button';
		btnRemove.className = 'btn-remove-col';
		btnRemove.textContent = '✕';
		btnRemove.onclick = () => row.remove();

		row.appendChild(nameInput);
		row.appendChild(typeSelect);
		const pkSpan = document.createElement('div'); pkSpan.appendChild(pkChk); row.appendChild(pkSpan);
		row.appendChild(btnRemove);

		columnsListEl.appendChild(row);
		return row;
	}

	function addDefaultRows() { createColumnRow(); createColumnRow(); }

	function reset() {
		tableNameEl.value = '';
		columnsListEl.innerHTML = '';
		addDefaultRows();
	}

	function gatherColumnsDef() {
		const rows = Array.from(columnsListEl.children);
		const defs = [];
		for (const r of rows) {
			const name = r.querySelector('input[type="text"]').value.trim();
			if (!name) continue;
			const type = r.querySelector('select').value;
			const pk = r.querySelector('input[type="checkbox"]')?.checked;
			let def = `"${name}" ${type}`;
			if (pk) def += ' PRIMARY KEY';
			defs.push(def);
		}
		return defs.join(', ');
	}

	function getRows() {
		// return simple representation of rows
		return Array.from(columnsListEl.children).map(r => ({
			name: r.querySelector('input[type="text"]').value.trim(),
			type: r.querySelector('select').value,
			pk: !!r.querySelector('input[type="checkbox"]')?.checked
		}));
	}

	// wiring
	btnAddCol.onclick = () => createColumnRow();

	// external API
	return {
		loadColumns(infoArray) {
			columnsListEl.innerHTML = '';
			infoArray.forEach(col => createColumnRow({ name: col.name, type: (col.type || 'TEXT'), pk: !!col.pk }));
		},
		reset,
		addDefaultRows,
		gatherColumnsDef,
		getRows,
		onCreate(cb) { onCreateCb = cb; },
		onAddColumns(cb) { onAddColsCb = cb; },
		emitCreate(name, colsDef) { if (onCreateCb) onCreateCb(name, colsDef); },
		emitAddColumns(tableName, newCols) { if (onAddColsCb) onAddColsCb(tableName, newCols); }
	};
}
