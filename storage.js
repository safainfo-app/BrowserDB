export function saveFile(filename, uint8array, mime = "application/x-sqlite3") {
	const blob = new Blob([uint8array], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

export function readFileAsArrayBuffer(file) {
	return new Promise((resolve, reject) => {
		const fr = new FileReader();
		fr.onload = () => resolve(fr.result);
		fr.onerror = () => reject(fr.error);
		fr.readAsArrayBuffer(file);
	});
}
