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

Il workspace include una libreria locale, un editor rich text e una revisione AI a blocchi con approvazione/rifiuto. Persistenza cloud, worker server e controlli narrativi globali restano i prossimi blocchi dell’MVP.

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

Per lo sviluppo usa `.env.development.local`; per la produzione `.env.production.local`. Entrambi sono esclusi da Git. Non inserire mai chiavi o contenuti dei manoscritti nei log, negli eventi analytics o nel repository.

## Principi tecnici

- UI: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui e `next-intl`.
- Autenticazione: Hexclave, con controllo ripetuto nelle route server.
- Privacy: ogni contenuto o metadato del manoscritto renderizzato usa `hexclave-private`.
- Pipeline: model-agnostic; OpenRouter sarà il gateway iniziale.
- Originale: il manoscritto caricato resta sempre distinto dalle modifiche approvate.

## Licenza

Proprietaria finché non viene indicato diversamente.

## Prova OpenRouter in sviluppo

In `.env.development.local` configura `OPENROUTER_API_KEY` e, facoltativamente,
`OPENROUTER_REVIEW_MODEL` (default: `google/gemini-2.5-flash`). Riavvia `npm run dev`.
Il precedente componente di pre-analisi include **Revisiona il campione**.
Il workspace attuale usa la revisione completa descritta sotto.

La prova analizza al massimo i primi 12.000 caratteri, con una singola chiamata
OpenRouter e un limite di 6.000 token di output. Mostra proposte di lingua/stile,
originale e motivazione. Puoi approvare o rifiutare ogni proposta e scaricare il
solo campione TXT con le modifiche approvate. Le proposte con citazioni assenti,
ambigue o sovrapposte vengono escluse. Risultati e scelte non sono persistenti.

Il server richiede autenticazione, origine corrispondente e una sola chiamata
contemporanea per utente nel processo. La route è disabilitata in produzione:
non sostituisce la futura pipeline asincrona a capitoli, con quote persistenti.
Le richieste usano provider ZDR e vietano raccolta dati; non abilitare il logging
dei prompt nel tuo account OpenRouter. La chiave e i contenuti non vengono loggati.
Il costo USD restituito dal provider viene mostrato quando disponibile.

Test delle citazioni e dell'applicazione delle modifiche: `node --test tests/review.test.mjs`.

## Studio editoriale

Il workspace offre sidebar con libreria e struttura dei capitoli, editor Tiptap,
barra di formattazione e pannelli Revisione / Formato. Supporta testo, titoli,
elenchi, tabelle, immagini DOCX compatibili, grassetto, corsivo, sottolineato,
font e dimensioni. Il pannello tipografico controlla font/dimensioni espliciti,
paragrafi vuoti e gerarchia dei titoli; consente di uniformare i caratteri,
scegliere interlinea, spaziatura e margini A4.

L’import DOCX ricostruisce la struttura con Mammoth e recupera font/dimensioni
sui paragrafi corrispondenti dal file OOXML. Non è un import Word senza perdite:
layout complessi, intestazioni, campi, commenti e revisioni Word non hanno
round-trip completo; le note possono diventare testo. Il file originale resta
scaricabile. L’export genera un nuovo DOCX dell’intero documento, con il testo
attuale e le modifiche approvate. Il canvas è fluido, non un’anteprima esatta
della paginazione di Word. I font devono essere installati sul dispositivo.

### Revisione e salvataggio

In sviluppo, **Revisiona tutto il manoscritto** percorre l’intero documento in
blocchi di massimo 9.000 caratteri tramite `/api/reviews/chunk`. Ogni chiamata è
autenticata, limita il corpo della richiesta e usa il gateway OpenRouter sul
server. I suggerimenti hanno posizioni verificate nel documento, si possono
approvare/rifiutare e vengono rimappati quando cambia il testo; quelli non più
validi diventano obsoleti. Durante analisi/pausa il testo è bloccato per mantenere
stabile il checkpoint. È possibile interrompere per tornare all’editing.

Bozze, originale, risultati, costo e avanzamento vengono salvati in IndexedDB,
suddivisi per utente Hexclave. Sono dati locali di questo browser, non un backup
cloud né dati sincronizzati tra dispositivi. Esportare copie prima di cancellare
i dati del browser. Il salvataggio fallito viene segnalato. Non aprire lo stesso
progetto in più schede per modificarlo contemporaneamente.

La scheda del browser coordina le chiamate: deve restare aperta per avanzare.
Pausa/ripresa usa l’ultimo blocco salvato; non è ancora una coda worker server.
Questo passaggio copre lingua/stile su tutto il testo, non la continuità narrativa
tra capitoli. Il nuovo riepilogo export mostra copertura e decisioni pendenti.

Il contenuto del workspace è dentro `hexclave-private`. La raccolta automatica
analytics Hexclave è disabilitata: la versione installata include il testo del
target nei click anche quando il sottoalbero è bloccato nelle replay. Nessun
contenuto, nome file o metadato del manoscritto viene aggiunto ai log.

Verifiche: `node --test tests/*.test.mjs`, `npm run lint`, `npx tsc --noEmit`,
`npx next build --webpack`. I test coprono chunk completi oltre il limite iniziale,
aggancio su testo formattato, rimappatura/undo e contenuto completo del DOCX.

### Studio editoriale (prova locale)

La sezione Revisione ora include **Approva tutte** (un solo gruppo di annullamento)
 ed **Esporta elenco revisioni** (DOCX con originali, proposte, motivazioni e stati).
Le schede portano al passaggio del documento; il layout dell'editor rimane fluido,
quindi la paginazione definitiva è quella del file Word.
**Dati del libro** salva titolo, autori, anno di scrittura, pubblicazione e crediti,
con frontespizio e colophon facoltativi nell'esportazione.
**Capitoli e indice** usa gli stili Titolo, permette di spostare capitoli interi
 e genera un indice Word con voci e collegamenti; aggiornare il campo in Word
per calcolare la paginazione. Un indice già nel manoscritto non viene rimosso.

La nuova analisi completa è disponibile in sviluppo (`npm run dev`): lettura di
ogni sezione, sintesi dei capitoli, memoria globale, struttura, controllo di
coerenza basato su citazioni, editing contestuale e secondo controllo delle
proposte. Le decisioni strutturali sono un piano da applicare nell'editor, non
riscritture automatiche. Il controllo finale ripete l'analisi strutturale sul testo
corrente, conservando le decisioni linguistiche precedenti. Non è fact-checking
su fonti esterne.

I lavori vengono eseguiti dal processo Next di sviluppo e salvati cifrati in
`.bookr-data/` (ignorata da Git), con chiave locale `.bookr-data/.key` e permessi
ristretti. Il server deve rimanere acceso; se viene riavviato, riprende dall'ultimo
passaggio salvato. Una richiesta in volo al momento dell'arresto può essere
ripetuta. Il limite di spesa prenota una stima prudenziale prima di ciascuna
richiesta; richieste interrotte possono lasciare una riserva nel costo mostrato.
Non è una coda distribuita per deploy serverless. Il limite iniziale si imposta
prima dell'avvio e si può aumentare riprendendo un lavoro fermo.

Configurazione: `OPENROUTER_API_KEY`, facoltativi `OPENROUTER_REVIEW_MODEL`
(default `google/gemini-2.5-flash`) e `OPENROUTER_QA_MODEL` per il secondo controllo.
Il routing richiede ZDR, divieto di raccolta dati e prezzi massimi compatibili con
il limite prudenziale. Gli account non condividono i lavori. Nessun contenuto del
manoscritto viene scritto nei log o negli eventi analytics. L'originale resta
scaricabile dal browser; esportare il DOCX per conservare una copia esterna.

Verifica: `node --test tests/*.test.mjs`, `npx tsc --noEmit`, `npm run lint`,
`npm run build` (la build richiede accesso a Google Fonts).

**Rileva indice esistente** confronta le voci iniziali (anche con puntini,
 tabulazioni e colonne numeriche) con i titoli nel corpo. Mostra un'anteprima:
le corrispondenze multiple non sono preselezionate, e i livelli Titolo sono
modificabili. Confermare applica gli stili ai titoli effettivi. Se il confine
dell'indice è riconosciuto con certezza, l'esportazione può sostituire quella
sezione con l'indice dinamico, lasciando intatta la bozza nell'editor.
Il collegamento tra proposte e testo funziona in entrambi i versi: scheda →
passaggio e testo evidenziato → spiegazione della revisione.

La barra inferiore mostra **Pagina X di Y**, con frecce precedente/successiva e
un campo numerico: inserire una pagina e premere Invio o il pulsante accanto.
I riferimenti numerati ai margini seguono il layout visualizzato nell'editor e
si aggiornano con testo, font e dimensioni. Non inseriscono interruzioni nel
manoscritto; Word ricalcola la paginazione del DOCX esportato.
