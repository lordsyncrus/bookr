# AI Book Reviewer / Editor --- Product Concept

## 1. Visione

Realizzare un servizio web di **revisione editoriale assistita da AI**
rivolto principalmente ad autori che possiedono già un manoscritto in
uno stadio avanzato.

Il prodotto **non deve scrivere il libro al posto dell'autore**.

Il presupposto ideale è:

> **L'autore porta il manoscritto all'80%. Il servizio lo aiuta a
> portarlo al 100%, fino a una versione pronta per la pubblicazione.**

L'AI deve comportarsi come un **editor professionale digitale**, non
come un ghostwriter.

L'obiettivo è preservare il più possibile: - voce dell'autore; -
stile; - intenzione narrativa; - lessico caratteristico; - struttura
creativa originale;

intervenendo invece su errori, incoerenze, debolezze e problemi
editoriali.

------------------------------------------------------------------------

## 2. Principio fondamentale

Il sistema deve distinguere chiaramente tra:

### Correzione

Interventi oggettivi o quasi oggettivi: - grammatica; - ortografia; -
punteggiatura; - refusi; - concordanze; - sintassi errata; - ripetizioni
accidentali; - errori tipografici.

### Revisione

Interventi editoriali che migliorano il testo senza cambiarne
arbitrariamente la voce: - periodi poco leggibili; - ambiguità; -
ridondanze; - passaggi deboli; - transizioni; - ritmo; - uniformità
stilistica; - continuità.

### Suggerimento

Interventi soggettivi o strutturali che devono essere proposti
all'autore, non applicati silenziosamente: - riscrittura importante di
un paragrafo; - spostamento di sezioni; - fusione o divisione di
capitoli; - modifica di dialoghi; - cambiamenti narrativi; -
eliminazione di contenuti; - alterazioni significative dello stile.

**Più un intervento modifica l'intenzione dell'autore, maggiore deve
essere il controllo lasciato all'autore.**

------------------------------------------------------------------------

## 3. Esperienza utente ideale

### Fase 1 --- Upload

L'utente crea un progetto e carica il proprio manoscritto.

Formati inizialmente desiderabili: - DOCX; - TXT; - Markdown; - EPUB; -
eventualmente PDF.

DOCX dovrebbe essere considerato uno dei formati prioritari perché
permette di conservare meglio struttura e formattazione.

------------------------------------------------------------------------

## 4. Pre-analisi

Prima di iniziare la revisione, il sistema analizza il documento e
determina almeno:

-   numero di parole;
-   numero di caratteri;
-   numero di capitoli;
-   struttura individuata;
-   lingua;
-   dimensione stimata del contesto;
-   costo AI stimato;
-   tempo stimato di elaborazione;
-   tipo di revisione possibile.

Questa fase deve consentire di calcolare il prezzo **prima
dell'esecuzione**.

Esempio:

> Manoscritto rilevato: 82.430 parole\
> Capitoli: 24\
> Revisione editoriale completa: €17,90

L'utente paga per la singola lavorazione.

Il modello commerciale principale non deve necessariamente essere un
abbonamento.

------------------------------------------------------------------------

## 5. Comprensione globale del libro

Prima di correggere le singole frasi, il sistema deve **capire il
libro**.

Deve costruire una rappresentazione strutturata contenente, quando
applicabile:

-   genere;
-   tono;
-   registro linguistico;
-   stile dell'autore;
-   struttura;
-   capitoli;
-   personaggi;
-   relazioni;
-   luoghi;
-   eventi;
-   timeline;
-   punti di vista;
-   temi;
-   terminologia ricorrente;
-   nomi propri;
-   regole del mondo narrativo;
-   elementi ancora aperti;
-   informazioni introdotte e successivamente richiamate.

Questa rappresentazione costituisce una sorta di **Book Memory / Story
Bible**.

Non bisogna affidarsi esclusivamente alla capacità di inserire l'intero
manoscritto nella context window.

Anche quando il modello dispone di un contesto molto grande, è
preferibile utilizzare una pipeline gerarchica.

------------------------------------------------------------------------

## 6. Pipeline editoriale

Una possibile pipeline:

### Pass 1 --- Parsing e struttura

Separare: - front matter; - capitoli; - sezioni; - paragrafi; -
eventuali note.

### Pass 2 --- Analisi globale

Creare: - riassunto del libro; - riassunto di ogni capitolo; - mappa dei
personaggi; - timeline; - style profile; - story bible / knowledge base.

### Pass 3 --- Correzione linguistica

Ricercare: - refusi; - errori grammaticali; - errori sintattici; -
punteggiatura; - concordanze; - uso improprio di parole; - problemi
tipografici.

### Pass 4 --- Editing stilistico

Analizzare: - leggibilità; - fluidità; - ripetizioni; - periodi
eccessivamente complessi; - ridondanze; - registro; - uniformità; -
dialoghi; - ritmo.

Il sistema deve evitare di "normalizzare" eccessivamente il testo.

Una costruzione insolita potrebbe essere una scelta stilistica
dell'autore e non un errore.

### Pass 5 --- Continuità

Controllare il manoscritto globalmente.

Esempi: - un personaggio cambia nome; - un personaggio conosce qualcosa
che non dovrebbe ancora sapere; - un oggetto cambia colore; - un evento
viene collocato in due date incompatibili; - un personaggio è presente
contemporaneamente in luoghi incompatibili; - età o rapporti familiari
cambiano; - una regola introdotta precedentemente viene contraddetta; -
una sottotrama viene dimenticata.

### Pass 6 --- Coerenza tra capitoli

Verificare: - transizioni; - sequenza logica; - ripetizioni
informative; - anticipazioni involontarie; - informazioni mancanti; -
richiami inconsistenti; - capitoli ridondanti o sbilanciati.

### Pass 7 --- Revisione strutturale

Produrre suggerimenti su: - ordine dei capitoli; - capitoli troppo
lunghi/corti; - sezioni eventualmente da fondere; - sezioni
eventualmente da dividere; - passaggi deboli; - ritmo complessivo.

Questi interventi devono normalmente essere **proposte**, non modifiche
automatiche.

### Pass 8 --- Quality Control

Un agente/modello differente dovrebbe controllare il lavoro degli agenti
precedenti.

Deve chiedersi: - la correzione è realmente necessaria? - è stato
modificato il significato? - è stata alterata la voce dell'autore? - è
stata introdotta un'informazione inesistente? - il nuovo testo è
realmente migliore? - la modifica crea contraddizioni altrove?

### Pass 9 --- Controllo globale finale

Dopo le modifiche approvate, eseguire nuovamente controlli di
continuità, struttura e qualità sull'intero manoscritto.

------------------------------------------------------------------------

## 7. Revisione assistita: principio UX fondamentale

Il prodotto non dovrebbe limitarsi a restituire un nuovo DOCX.

La caratteristica centrale dovrebbe essere una **Review Interface**.

Per ogni intervento mostrare:

**Originale**

> Testo originale dell'autore.

**Proposta**

> Testo revisionato.

**Motivazione**

> Periodo ambiguo; la modifica migliora la leggibilità senza alterare il
> significato.

**Categoria**

> Stile / grammatica / continuità / struttura / ecc.

**Confidenza**

> Alta / media / bassa.

Azioni:

-   **Approva**
-   **Rifiuta**
-   **Modifica**
-   eventualmente **Approva tutte le correzioni sicure**

Il sistema deve conservare sempre l'originale.

------------------------------------------------------------------------

## 8. Tipologie di finding

Ogni problema individuato dovrebbe essere un oggetto strutturato, ad
esempio:

``` json
{
  "id": "finding_00123",
  "chapter": 7,
  "type": "continuity",
  "severity": "medium",
  "confidence": 0.94,
  "original_text": "...",
  "suggested_text": "...",
  "reason": "Nel capitolo 3 il personaggio afferma di non essere mai stato a Roma.",
  "status": "pending"
}
```

Categorie possibili:

-   spelling;
-   grammar;
-   punctuation;
-   typography;
-   syntax;
-   readability;
-   style;
-   repetition;
-   dialogue;
-   continuity;
-   chronology;
-   character;
-   terminology;
-   chapter_structure;
-   global_structure.

------------------------------------------------------------------------

## 9. Livelli di severità

Distinguere almeno:

### Error

Problema molto probabilmente oggettivo.

### Warning

Possibile incoerenza o problema significativo.

### Suggestion

Miglioramento editoriale soggettivo.

### Note

Osservazione utile che non richiede necessariamente una modifica.

------------------------------------------------------------------------

## 10. Preservazione della voce dell'autore

Questa è una delle caratteristiche più importanti del prodotto.

Prima dell'editing il sistema dovrebbe costruire uno **Style Profile**
basato sul manoscritto originale.

Può includere: - lunghezza media dei periodi; - registro; - frequenza
dei dialoghi; - uso della punteggiatura; - lessico; - livello di
formalità; - costruzioni ricorrenti; - ritmo; - peculiarità
intenzionali.

Gli agenti di revisione devono utilizzare questo profilo come vincolo.

L'obiettivo non è:

> "Come lo scriverebbe un LLM?"

ma:

> "Come potrebbe essere corretto e migliorato questo testo continuando a
> sembrare scritto dallo stesso autore?"

------------------------------------------------------------------------

## 11. Report editoriale

Alla fine produrre un report con:

-   stato generale del manoscritto;
-   numero di errori trovati;
-   numero di suggerimenti;
-   problemi di continuità;
-   problemi strutturali;
-   statistiche;
-   capitoli più problematici;
-   valutazione della coerenza;
-   valutazione della leggibilità;
-   eventuali questioni ancora da decidere;
-   modifiche approvate/rifiutate;
-   raccomandazioni finali.

Il report deve essere utile anche indipendentemente dalle correzioni
automatiche.

------------------------------------------------------------------------

## 12. Output

Al termine l'utente dovrebbe poter ottenere almeno:

-   manoscritto originale;
-   manoscritto revisionato;
-   DOCX revisionato;
-   report editoriale;
-   elenco completo delle modifiche.

In seguito: - EPUB; - PDF; - eventuale output predisposto per KDP; -
indice / table of contents; - metadati editoriali.

------------------------------------------------------------------------

## 13. Possibili funzioni editoriali aggiuntive

Una volta terminata la revisione, il sistema potrebbe assistere nella
produzione di:

-   indice;
-   sinossi;
-   abstract;
-   quarta di copertina;
-   descrizione Amazon/KDP;
-   biografia autore;
-   prefazione, quando richiesta;
-   keywords;
-   categorie editoriali;
-   metadata EPUB;
-   materiali promozionali.

Queste funzioni devono rimanere separate dalla revisione del
manoscritto.

------------------------------------------------------------------------

## 14. Architettura AI

Il sistema dovrebbe essere **model agnostic**.

OpenRouter può essere utilizzato come gateway principale.

Non assumere che un unico modello debba fare tutto.

È preferibile poter configurare modelli diversi per:

-   parsing/analisi;
-   grammar checking;
-   editing;
-   continuity;
-   reasoning strutturale;
-   quality assurance;
-   final review.

L'architettura deve consentire di cambiare modello senza riscrivere la
pipeline.

------------------------------------------------------------------------

## 15. Controllo dei costi

Ogni job deve avere cost accounting.

Registrare almeno:

-   modello;
-   input tokens;
-   output tokens;
-   costo;
-   durata;
-   fase;
-   capitolo;
-   eventuali retry.

Prima dell'acquisto deve essere possibile stimare il costo del job.

Il prezzo finale può essere:

`costo AI stimato + costo infrastruttura + margine + buffer`

La pipeline deve evitare di inviare inutilmente l'intero manoscritto a
ogni chiamata.

------------------------------------------------------------------------

## 16. Elaborazione asincrona

La revisione di un libro può richiedere tempo.

Non deve essere implementata come una singola richiesta HTTP.

Utilizzare:

-   job queue;
-   worker;
-   stato persistente;
-   retry;
-   checkpoint;
-   progress tracking.

Esempio:

> Analisi struttura --- completata\
> Comprensione globale --- completata\
> Revisione linguistica --- 17/24 capitoli\
> Continuità --- in attesa\
> Quality control --- in attesa

Il job deve poter riprendere dopo un crash senza ricominciare tutto.

------------------------------------------------------------------------

## 17. Privacy

Un manoscritto inedito è materiale estremamente sensibile.

Principi:

-   cifratura in transito;
-   accesso isolato per utente;
-   niente URL pubblici ai manoscritti;
-   retention configurabile;
-   cancellazione completa del progetto;
-   logging senza contenuto sensibile quando possibile;
-   spiegazione trasparente dei provider AI utilizzati.

Verificare inoltre le condizioni dei provider LLM riguardo conservazione
e utilizzo dei dati.

------------------------------------------------------------------------

## 18. Posizionamento

Il prodotto non dovrebbe essere presentato principalmente come:

> "AI che scrive libri."

Il posizionamento desiderato è:

> **Servizio editoriale assistito da AI per manoscritti già scritti.**

Oppure:

> **Dal manoscritto alla versione pronta per la pubblicazione.**

Il target iniziale può comprendere: - autori self-publishing; -
scrittori esordienti; - professionisti che pubblicano saggi/manuali; -
piccoli editori; - agenzie editoriali.

------------------------------------------------------------------------

## 19. Principio etico/editoriale

Il sistema deve aumentare la qualità del lavoro umano senza appropriarsi
della paternità creativa.

L'autore deve poter sapere: - cosa è stato cambiato; - perché; - da
quale fase; - con quale livello di certezza;

e deve poter rifiutare ogni intervento.

**La versione finale deve continuare a essere riconoscibilmente il libro
dell'autore.**

------------------------------------------------------------------------

## 20. Relazione con AuthorAgent

Valutare **AuthorAgent** come possibile base tecnica o fonte di
componenti riutilizzabili.

Prima di sviluppare da zero:

1.  installare AuthorAgent in ambiente di test;
2.  analizzarne frontend, backend e pipeline;
3.  identificare le funzioni già disponibili;
4.  verificare supporto OpenRouter;
5.  verificare gestione di manoscritti esistenti;
6.  analizzare sistema di memoria/continuità;
7.  verificare export;
8.  verificare licenza del repository e delle dipendenze;
9.  identificare cosa mantenere, modificare o rimuovere.

L'obiettivo non è necessariamente fare un fork indiscriminato.

AuthorAgent può essere: - base del prodotto; - motore backend; -
reference architecture; - fonte di componenti.

Il prodotto finale deve però essere focalizzato sulla **revisione
editoriale assistita**, non sulla generazione autonoma di libri.

------------------------------------------------------------------------

## 21. MVP

Non costruire tutto immediatamente.

Un MVP convincente dovrebbe fare molto bene:

1.  autenticazione;
2.  creazione progetto;
3.  upload DOCX;
4.  parsing capitoli;
5.  analisi globale;
6.  revisione grammaticale/stilistica;
7.  controllo continuità;
8.  interfaccia diff;
9.  Approva / Rifiuta;
10. export DOCX;
11. conteggio token/costi;
12. integrazione OpenRouter;
13. progress tracking.

Se questa esperienza funziona bene su un vero romanzo di 300--500
pagine, il nucleo del prodotto è validato.

------------------------------------------------------------------------

## 22. Criterio guida per l'agente di sviluppo

Quando deve decidere se implementare una feature, chiedersi:

> **Questa funzione aiuta un autore che ha già scritto il proprio libro
> a trasformare un buon manoscritto in un manoscritto editorialmente
> pronto, mantenendo il controllo e la propria voce?**

Se sì, è coerente con il prodotto.

Se la funzione serve principalmente a generare automaticamente grandi
quantità di narrativa al posto dell'autore, è secondaria o fuori scope.
