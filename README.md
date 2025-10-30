Semplice progetto BrowserDB.

Interfaccia grafica per creare e gestire tabelle (creazione colonne, PK, NOT NULL, DEFAULT, FK).
Non è presente un editor SQL: tutte le operazioni principali sono disponibili via GUI.

Per eseguire localmente:
1. Aprire la cartella /workspaces/BrowserDB nel container.
2. Avviare un semplice server (es. python3 -m http.server 8000).
3. Dal container host aprire il browser: $BROWSER http://localhost:8000

Nota: sql-wasm.js viene caricato da CDN; il DB in memoria viene perso al refresh a meno che non si esporti.
