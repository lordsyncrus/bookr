# Bookr — Product concept

Aggiornato all’11 settembre 2026. Questo documento descrive la direzione del prodotto e distingue le funzioni disponibili dagli sviluppi previsti. Per avviare il progetto: [README](README.md). Per le attività pianificate: [TODO](TODO.md).

## La promessa

**Aiutare chi ha già scritto un manoscritto a revisionarlo, organizzarlo ed esportarlo, mantenendo la propria voce e il controllo delle modifiche.**

Bookr è uno studio editoriale per narrativa, saggi e manuali. Il valore è un percorso guidato che collega comprensione del libro, proposte motivate e decisioni dell’autore. Non promette una certificazione di correttezza o un libro pronto per la pubblicazione senza verifica umana.

Il pubblico iniziale comprende autori indipendenti, professionisti che scrivono libri e piccoli team editoriali.

## Principi di prodotto

- **Default utili.** Il percorso deve funzionare con poche scelte iniziali; le opzioni avanzate restano disponibili senza diventare passaggi obbligatori.
- **Voce dell’autore.** Correggere gli errori e i problemi concreti senza trasformare ogni peculiarità in un difetto stilistico.
- **Decisioni esplicite.** Le proposte devono spiegare cosa cambia e perché, e portare al passaggio interessato. Gli interventi sostanziali restano sotto il controllo dell’utente.
- **Una revisione può terminare.** Nessuna modifica necessaria è un risultato valido. I controlli successivi non devono riaprire continuamente scelte già approvate o rifiutate.
- **Originale conservato.** Il file di partenza resta distinto dal documento modificato; cronologia e annullamento aiutano a recuperare il lavoro.
- **Interfaccia operativa.** Dashboard compatta, fasi riconoscibili, decisioni facili da raggiungere e attività AI visibile anche dalla libreria.

## Il percorso

**Carica → Comprendi → Revisiona → Decidi → Verifica → Esporta**

### 1. Libreria e importazione

L’utente importa DOCX, TXT o Markdown e ritrova i manoscritti in una libreria con avanzamento, stato di verifica e attività in corso. Le azioni rapide includono esportazione, download dell’originale, rinomina, duplicazione e spostamento nel cestino con conferma.

Il titolo e gli autori del libro sono dati editoriali: non coincidono necessariamente con il nome del file o con l’utente connesso.

### 2. Dati del libro e comprensione

“Dati libro” raccoglie titolo, autori, anni, crediti e informazioni per frontespizio e colophon. Include anche un profilo editoriale modificabile: descrizione, scopo, pubblico, tipo di opera, genere, tono, registro, punto di vista, tempi verbali, ritmo, lessico e coerenza.

Le nuove analisi ricavano il profilo dalla memoria di lettura. Le informazioni non supportate restano vuote; le modifiche esplicite dell’utente prevalgono sui valori inferiti. Il profilo guida revisione e scrittura sulle selezioni.

### 3. Revisione e struttura

L’editor riunisce testo, formattazione e pannelli organizzati per fasi. Le proposte linguistiche mostrano originale, sostituzione e motivazione, con navigazione tra scheda e passaggio. Si possono approvare o rifiutare singolarmente o in gruppo.

I controlli strutturali segnalano problemi di ordine, transizioni e coerenza; non equivalgono a riscritture automatiche. Sono disponibili rilevamento dell’indice esistente, collegamento ai titoli, generazione dell’indice e proposte di revisione dei titoli.

La direzione UX è riutilizzare automaticamente un indice riconosciuto con sicurezza e generarne uno quando manca, chiedendo intervento sulle sole ambiguità. La maggiore robustezza del riconoscimento prima della lettura è ancora nel TODO.

### 4. Interventi dell’autore

L’utente può formattare il documento, evidenziare passaggi, aggiungere commenti e ritrovarli nelle raccolte dedicate. La cronologia è accessibile dalla sidebar.

Le azioni AI sulla selezione — scrivi, espandi, riassumi — producono una proposta da valutare prima dell’applicazione. La scrittura assistita è una scelta esplicita dell’autore.

### 5. Verifica ed esportazione

Il controllo finale cerca errori residui concreti e rispetta le decisioni precedenti. L’interfaccia distingue le verifiche aggiornate da quelle superate da modifiche successive.

Sono disponibili DOCX del documento corrente, elenco delle revisioni, download dell’originale e PDF tramite stampa del browser. Frontespizio, colophon e indice sono opzioni editoriali dell’esportazione.

## Come lavora l’AI oggi

La pipeline usa OpenRouter e richieste strutturate, senza affidarsi a una singola chiamata contenente l’intero libro:

1. Identifica i capitoli dai titoli semantici del livello scelto.
2. Divide ogni capitolo in blocchi di circa 9.000 caratteri e produce note di lettura.
3. Riunisce le note in sintesi dei capitoli e in una memoria globale.
4. Analizza il ruolo dei capitoli usando la mappa, la memoria e le sintesi dei capitoli vicini.
5. Confronta fatti estratti e citazioni per cercare incoerenze tra capitoli.
6. Propone correzioni sui blocchi usando il contesto del capitolo e il profilo del libro.
7. Sottopone le proposte a un secondo controllo, con un modello configurabile separatamente.

Gli ancoraggi testuali vengono validati. Le rianalisi riutilizzano parte dei risultati invariati e tengono conto delle decisioni pregresse. Questo riduce ripetizioni e riscritture superflue, senza garantire una revisione esaustiva.

**Limiti attuali:** titoli solo visivi non sono ancora confini affidabili per la segmentazione; senza titoli semantici il testo diventa un’unica sezione suddivisa in blocchi. Il contesto ai confini e la copertura verificabile sono miglioramenti pianificati.

Il rilevamento di citazioni, attribuzioni e bibliografie identifica passaggi da controllare. **Non verifica ancora le affermazioni consultando fonti esterne.**

## Formattazione e fedeltà del documento

Bookr gestisce titoli, testo, elenchi, tabelle, font, spaziature e margini. Il corpo del testo può essere uniformato in giustificato, mantenendo le tabelle escluse dall’allineamento globale. L’opzione per mantenere il titolo con il testo successivo è attiva di default per gli export.

L’editor usa attualmente una vista continua: la paginazione avanzata è sospesa per problemi di prestazioni sui manoscritti lunghi. L’import DOCX ricostruisce il contenuto modificabile ma non offre un round-trip completo di ogni funzione Word. Numeri di pagina e layout vanno verificati nell’output finale.

## Salvataggio e produzione

| Area | Oggi | Evoluzione prevista |
| --- | --- | --- |
| Libreria e documenti | IndexedDB locale, separata per utente | Database e archivio file persistenti, sincronizzazione |
| Elaborazioni AI | Ambiente di sviluppo; worker nel processo Next, checkpoint cifrati in `.bookr-data/` | Coda persistente e worker adatti alla produzione |
| Cronologia | Versioni locali del documento | Delta, checkpoint e caricamento progressivo per limitare lo spazio |
| PDF | Stampa del browser | Esportazione diretta da valutare |
| Copertura | Stato delle fasi e risultati della pipeline | Controlli tracciati per porzione, versione e regole |

Il server locale deve restare acceso per eseguire i lavori. La soluzione attuale non è una coda distribuita per deploy serverless. La libreria locale non costituisce un backup cloud.

## Consumi e modello commerciale

I consumi tecnici sono visibili nelle impostazioni e nel riepilogo dell’utente. Limiti e protezioni sono responsabilità del sistema: l’utente non deve impostare soglie di spesa per completare il percorso editoriale.

Prezzi commerciali, pagamento per libro o abbonamento restano da definire. Non fanno parte del flusso attuale e non va riproposto il vecchio passaggio obbligatorio di preventivo.

Hexclave gestisce l’identità e resta il riferimento per i servizi utente, inclusi eventuali pagamenti futuri. Le impostazioni account sono distinte dalle preferenze di Bookr.

## Privacy

- Il testo necessario all’elaborazione viene inviato ai provider AI tramite OpenRouter; la configurazione del routing richiede Zero Data Retention e vieta la raccolta dati.
- Nessun estratto, nome file o metadato editoriale deve finire nei log o negli eventi analytics.
- I contenuti sensibili renderizzati devono essere protetti con `hexclave-private` nelle session replay.
- L’accesso ai lavori è isolato per utente; le chiavi dei servizi restano sul server.
- Retention, backup e cancellazione completa lato server sono requisiti della futura persistenza cloud. Il cestino della libreria non va descritto come cancellazione definitiva di ogni copia.

## Prossimi passi

Le priorità concordate sono nel [TODO](TODO.md): riconoscimento dei capitoli prima della lettura, contesto ai confini dei blocchi e copertura verificabile. Seguono memoria strutturata con riferimenti al testo, controlli per ambito e rianalisi più mirate.

Una possibile evoluzione agentica è un coordinatore che prepari un piano, scelga gli strumenti necessari, attenda le decisioni e si arresti quando i controlli sono conclusi. È una direzione discussa, **non una funzione già implementata né un cambio di scope approvato**.

EPUB, materiali promozionali e integrazioni con editor esterni restano possibilità successive. Lo [studio su AuthorAgent](docs/research/authoragent-reuse.md) documenta gli spunti di riuso: non implica che tutte le sue funzioni siano presenti in Bookr.

## Come valutiamo il prodotto

Una prova su un manoscritto reale deve verificare che:

- tutte le porzioni previste siano elaborate o segnalate come incomplete;
- le revisioni raggiungano il testo corretto e non si duplichino;
- decisioni e modifiche restino recuperabili dopo chiusura e riapertura;
- i controlli successivi convergano, senza inventare nuovi interventi per forza;
- apertura, navigazione e modifica restino fluide su libri lunghi;
- l’esportazione contenga il documento corrente e l’originale resti recuperabile.

Il criterio guida rimane: **questa funzione aiuta l’autore a migliorare il proprio libro, conservandone voce e controllo?**
