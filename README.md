Semplice progetto BrowserDB.

Per eseguire localmente:
1. Aprire la cartella /workspaces/BrowserDB nel container.
2. Avviare un semplice server (es. python3 -m http.server 8000).
3. Dal container host aprire il browser: $BROWSER http://localhost:8000

Nota: sql-wasm.js viene caricato da CDN; il service worker permette il caching offline delle risorse locali.
