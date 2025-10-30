export function createLogger(logEl) {
	return {
		log(msg) {
			if (!logEl) return;
			logEl.textContent = msg;
		}
	};
}
