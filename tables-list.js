export function createTablesList({ container, logger, db, onEdit, onChange } = {}) {
	function render() {
		const tables = db.listTables();
		container.innerHTML = '';
		if (tables.length === 0) { container.textContent = "(Nessuna tabella)"; return; }
		tables.forEach(t => {
			const div = document.createElement('div');
			div.className = 'table-item';
			const left = document.createElement('div');
			left.textContent = t.name;
			const right = document.createElement('div');

			const btnShow = document.createElement('button');
			btnShow.textContent = 'Schema'; btnShow.className = 'secondary';
			btnShow.onclick = () => logger.log(t.sql || '—');

			const btnCols = document.createElement('button');
			btnCols.textContent = 'Colonne'; btnCols.className = 'secondary';
			btnCols.onclick = () => {
				const cols = db.getTableColumns(t.name);
				logger.log(`${t.name} columns:\n- ${cols.join('\n- ')}`);
			};

			const btnEdit = document.createElement('button');
			btnEdit.textContent = 'Edit'; btnEdit.className = 'secondary';
			btnEdit.onclick = () => onEdit && onEdit(t.name);

			const btnDelete = document.createElement('button');
			btnDelete.textContent = 'Delete'; btnDelete.className = 'secondary';
			btnDelete.onclick = () => {
				if (!confirm(`Eliminare la tabella "${t.name}"?`)) return;
				const r = db.dropTable(t.name);
				if (r.ok) {
					logger.log(`Tabella "${t.name}" eliminata.`);
					render();
					// notify caller that schema changed
					if (typeof onChange === 'function') onChange();
				} else {
					logger.log(`Errore: ${r.error}`);
				}
			};

			right.appendChild(btnShow);
			right.appendChild(btnCols);
			right.appendChild(btnEdit);
			right.appendChild(btnDelete);

			div.appendChild(left);
			div.appendChild(right);
			container.appendChild(div);
		});
	}

	return {
		refresh: render
	};
}
