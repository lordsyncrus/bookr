# BookReview

BookReview è un servizio editoriale assistito dall’AI per autori che hanno già scritto il proprio manoscritto. Analizza, propone e motiva gli interventi senza applicare riscritture importanti senza il controllo dell’autore.

Il flusso di prodotto è:

`Upload → Pre-analisi → Preventivo → Revisione → Approva/Rifiuta → Export`

La specifica completa è in [PRODUCT_CONCEPT.md](PRODUCT_CONCEPT.md).

## Stato attuale

- landing page editoriale in italiano e inglese;
- autenticazione Hexclave con password e codice email;
- workspace protetto server-side;
- upload DOCX, TXT e Markdown fino a 50 MB;
- parsing e pre-analisi in memoria;
- conteggio di parole, caratteri e capitoli;
- rilevamento preliminare della lingua e della struttura;
- stima di tempi, token di pipeline e costo tecnico AI;
- privacy per i contenuti del manoscritto nelle session replay.

La persistenza dei progetti, la coda asincrona e la review interface sono i prossimi blocchi dell’MVP.

## Sviluppo

Requisiti: Node.js 22+ e npm.

```bash
npm install
npm run dev
```

L’applicazione è disponibile su `http://localhost:3000`; la dashboard Hexclave locale viene avviata automaticamente dal comando `dev`.

Verifiche prima di ogni commit:

```bash
npm run lint
npx tsc --noEmit
npx next build --webpack
```

## Configurazione

`hexclave.config.ts` è la fonte dichiarativa delle funzionalità Hexclave. In produzione sono richieste:

```env
NEXT_PUBLIC_HEXCLAVE_PROJECT_ID=
HEXCLAVE_SECRET_SERVER_KEY=
```

Le variabili locali vanno conservate in `.env.production.local`, che è escluso da Git. Non inserire mai chiavi o contenuti dei manoscritti nei log, negli eventi analytics o nel repository.

## Principi tecnici

- UI: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui e `next-intl`.
- Autenticazione: Hexclave, con controllo ripetuto nelle route server.
- Privacy: ogni contenuto o metadato del manoscritto renderizzato usa `hexclave-private`.
- Pipeline: model-agnostic; OpenRouter sarà il gateway iniziale.
- Originale: il manoscritto caricato resta sempre distinto dalle modifiche approvate.

## Licenza

Proprietaria finché non viene indicato diversamente.
