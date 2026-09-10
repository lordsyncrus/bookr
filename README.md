# Bookr

Uno studio editoriale per trasformare una bozza in un libro, con l’AI al tuo fianco e l’ultima parola sempre tua.

**Carica → Analizza → Valuta le revisioni → Esporta**

## Cosa puoi fare

- **Lavora sul manoscritto.** Importa DOCX, TXT o Markdown; modifica testo, titoli, tabelle e formattazione nell’editor.
- **Revisiona con contesto.** L’AI legge per capitoli e blocchi, costruisce una memoria del libro e propone interventi su lingua, struttura e coerenza. Puoi approvarli o rifiutarli, anche in gruppo.
- **Organizza il libro.** Rileva un indice esistente o generane uno, sistema i titoli e individua possibili citazioni e riferimenti da verificare.
- **Conserva la tua voce.** In “Dati libro” raccogli autori, crediti, colophon e profilo editoriale: tono, pubblico, genere e terminologia.
- **Annota e riscrivi.** Evidenzia passaggi, aggiungi commenti e usa scrittura, espansione e sintesi AI sulla selezione. Ritrova gli interventi nella cronologia.
- **Gestisci ed esporta.** Rinomina, duplica o sposta i libri nel cestino. Scarica il DOCX revisionato, l’elenco delle revisioni e il file originale; crea il PDF tramite la stampa del browser.

## Provalo in locale

Servono **Node.js 22+**, npm e una chiave OpenRouter per le funzioni AI.

```bash
npm install
```

Crea `.env.development.local` nella radice del progetto:

```env
OPENROUTER_API_KEY=la_tua_chiave

# Facoltativi: modello di revisione e modello di secondo controllo
# OPENROUTER_REVIEW_MODEL=google/gemini-2.5-flash
# OPENROUTER_QA_MODEL=google/gemini-2.5-flash
```

Poi avvia:

```bash
npm run dev
```

Apri [localhost:3000](http://localhost:3000). Il comando avvia anche l’ambiente locale Hexclave per l’autenticazione, senza richiedere di configurare manualmente le sue chiavi. Dopo aver modificato le variabili d’ambiente, riavvia il server.

## Da sapere

Bookr è **in sviluppo attivo**. Le funzioni AI sono attualmente abilitate solo nell’ambiente di sviluppo.

- **Salvataggio locale:** la libreria vive nel browser, in IndexedDB; non è ancora sincronizzata nel cloud. Esporta una copia prima di cancellare i dati del browser. I lavori AI hanno checkpoint cifrati in `.bookr-data/` e richiedono il server locale acceso.
- **Impaginazione:** l’editor usa una vista continua. L’import DOCX non conserva ogni dettaglio dei layout Word complessi; la paginazione finale dipende dall’esportazione. Il file originale resta separato.
- **Revisione assistita:** le proposte richiedono valutazione editoriale. Il rilevamento di citazioni e riferimenti non equivale a una verifica delle fonti esterne.
- **Privacy:** il testo necessario alle elaborazioni AI passa attraverso OpenRouter. Contenuti e metadati dei manoscritti sono esclusi dai log e dagli eventi analytics; le aree sensibili sono protette nelle session replay con `hexclave-private`.

## Per chi sviluppa

**Next.js · React · TypeScript · Tiptap · Tailwind CSS · Hexclave · OpenRouter**

```bash
node --test tests/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

Prossimi passi nel [TODO](TODO.md). Dettagli su [convergenza delle revisioni](docs/architecture/review-convergence.md), [cronologia](docs/architecture/manuscript-history.md) e [paginazione](docs/architecture/editor-pagination.md).

## Licenza

Proprietaria, salvo diversa indicazione.
