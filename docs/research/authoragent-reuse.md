# AuthorAgent: componenti e istruzioni riutilizzabili in Bookr

Studio del 10 settembre 2026. Repository esaminato: https://github.com/Ckokoski/AuthorAgent, commit `47e9570fb96b9d151a3b1f9c22e3a365eab9bd9c`. Analisi statica di istruzioni e implementazioni; non sono stati eseguiti gli esportatori di AuthorAgent né verificata la conformità a servizi di stampa. Nessun componente importato in Bookr durante questo studio.

## Valutazione

AuthorAgent è una buona base di requisiti editoriali e di organizzazione dei controlli. Non è un motore di impaginazione pronto da inserire nel nostro editor. Il suo percorso parte anche dalla scrittura automatica; Bookr parte dal manoscritto dell’utente e deve conservarne contenuto, struttura e decisioni.

Non è possibile ricostruire da questo confronto quanti prompt fossero stati preservati da una precedente versione di AuthorAgent: manca l’identificazione di quella versione e una mappa delle derivazioni. Questo documento propone una mappa di riuso verificabile da oggi.

## Impaginazione: priorità alta

Fonte: [istruzioni format](https://github.com/Ckokoski/AuthorAgent/blob/47e9570fb96b9d151a3b1f9c22e3a365eab9bd9c/skills/author/format/SKILL.md).

La distinzione utile è fra manoscritto destinato a revisione, interno di un libro stampato ed ebook. Il primo può usare interlinea doppia e impaginazione di servizio; gli altri richiedono scelte diverse. Le indicazioni sono preset da adattare, non uno standard universale valido per ogni editore o genere.

Proposta Bookr: nella tab Formattazione, aggiungere un profilo di impaginazione e mostrare anteprima e modifiche previste. Separare famiglia tipografica, corpo, interlinea, rientri, spaziatura, formato pagina e organizzazione delle sezioni. Applicazione esplicita, annullabile; eccezioni per tabelle, elenchi, poesie, citazioni e didascalie.

Dal [CSS EPUB](https://github.com/Ckokoski/AuthorAgent/blob/47e9570fb96b9d151a3b1f9c22e3a365eab9bd9c/gateway/src/services/epub-export.ts) possiamo riprendere il principio di paragrafi rientrati, con primo paragrafo di capitolo/scena senza rientro, stacchi di scena riconoscibili e gerarchia dei titoli. EPUB richiede navigazione e contenuto adattabile, senza dipendere dalle pagine dell’editor. È un export nuovo per Bookr, da costruire dal documento strutturato e validare con EPUBCheck; il parser Markdown originale non va usato come passaggio intermedio perché perderebbe struttura e formattazione.

Dal [DOCX exporter](https://github.com/Ckokoski/AuthorAgent/blob/47e9570fb96b9d151a3b1f9c22e3a365eab9bd9c/gateway/src/services/docx-export.ts) sono utili le sezioni dedicate a frontespizio, dedica e materiali finali. Limiti osservati: i preset cambiano i margini ma non impostano le dimensioni della pagina; titoli principali resi graficamente senza HeadingLevel; spazi verticali ottenuti con paragrafi vuoti; nessun indice automatico effettivamente generato; copyright predefinito con dichiarazione di opera di fantasia e ISBN segnaposto. Sono motivi per non importarlo integralmente.

Bookr ha già titoli semantici, indice DOCX collegato, metadati, conservazione di tabelle/immagini e controllo CSS di vedove/orfane nel PDF. Mancano profili per stampa, margini interno/esterno, intestazioni editoriali, numerazione per sezioni e un’anteprima paginata affidabile. Le pagine attuali e la stampa browser non garantiscono identità fra editor, Word e PDF. Per la stampa finale serve una pipeline di composizione verificata; un prompt non basta.

## Regole editoriali per ciascun libro

Fonte: [STYLE-GUIDE](https://github.com/Ckokoski/AuthorAgent/blob/47e9570fb96b9d151a3b1f9c22e3a365eab9bd9c/workspace/soul/STYLE-GUIDE.md).

Importare il concetto di guida persistente del libro: tono, punto di vista, tempi verbali, dialoghi, convenzioni di capitoli e scene. Adattamento italiano proposto: virgolette/caporali, trattini, maiuscole, numeri e date, abbreviazioni, unità di misura, corsivi e glossario. Le scelte dell’autore prevalgono sulle preferenze generiche; la guida entra in tutti i passaggi pertinenti della revisione. Non importare elenchi inglesi di parole vietate come divieti universali.

## Revisione specialistica e prove

Fonti: [revise](https://github.com/Ckokoski/AuthorAgent/blob/47e9570fb96b9d151a3b1f9c22e3a365eab9bd9c/skills/author/revise/SKILL.md), [continuity-check](https://github.com/Ckokoski/AuthorAgent/blob/47e9570fb96b9d151a3b1f9c22e3a365eab9bd9c/skills/author/continuity-check/SKILL.md), [orchestratore](https://github.com/Ckokoski/AuthorAgent/blob/47e9570fb96b9d151a3b1f9c22e3a365eab9bd9c/gateway/src/services/revision-orchestrator.ts).

Recuperare checklist distinte per struttura, scene, stile e correttezza. Per ogni rilievo: posizione, problema, motivazione e proposta. L’orchestratore distingue passaggi eseguiti e saltati: utile per non confondere «nessun errore» con «controllo non effettuato». Bookr possiede già lettura, sintesi, memoria, struttura, continuità, editing e secondo controllo; conviene arricchire questi passaggi, evitando una seconda pipeline duplicata.

La continuità aggiunge gravità esplicita, categorie dettagliate e raggruppamento di occorrenze ripetute. Bookr già richiede prove testuali per contraddizioni tra capitoli: ampliare la tassonomia e rendere confrontabili i due passaggi nell’interfaccia. Per saggistica usare concetti, terminologia, misure e affermazioni invece di imporre motivazioni dei personaggi e tensione narrativa. Coerenza interna e verifica di fonti esterne devono restare controlli distinti.

## Voce e memoria: seconda fase

Il [profilo stilistico](https://github.com/Ckokoski/AuthorAgent/blob/47e9570fb96b9d151a3b1f9c22e3a365eab9bd9c/gateway/src/services/style-clone.ts) propone misure quantitative utili per segnalare variazioni. Molte euristiche dipendono dall’inglese: suffissi, avverbi, congiunzioni, pronomi e leggibilità. Non trasferire i punteggi all’italiano senza adattamento e validazione. Una variazione di stile è un suggerimento da valutare, non prova di errore o testo AI.

La memoria di entità e fatti può diventare una scheda consultabile e correggibile per libro, con citazioni d’origine. Il riuso deve essere isolato per manoscritto/utente. Non apprendere automaticamente regole permanenti da ogni rifiuto: una decisione locale non è necessariamente una preferenza generale.

## Ordine proposto

1. Guida editoriale del libro e preset di impaginazione; nessun nuovo costo AI per applicare regole deterministiche.
2. Controlli di formattazione con posizione, spiegazione e correzione annullabile: rientri, spaziatura, gerarchie, stacchi, eccezioni.
3. Sezioni del libro, numerazione, formato stampa e anteprima coerente; completare dediche/materiali finali senza testi inventati.
4. Report dei controlli eseguiti/saltati, rilievi specialistici e prove affiancate.
5. EPUB e validazione degli export; successivamente profilo stilistico italiano e memoria editoriale avanzata.

Per lo storico delle modifiche e il salvataggio server serve un lavoro dedicato: non risultano risolti importando questi prompt. Non includere nel primo intervento ghostwriting, marketing, pubblicazione autonoma o auto-riscritture iterative.

Il repository include una [licenza MIT](https://github.com/Ckokoski/AuthorAgent/blob/47e9570fb96b9d151a3b1f9c22e3a365eab9bd9c/LICENSE). In caso di importazione di codice o testi, conservare gli avvisi previsti e registrare file di origine, commit e adattamenti. Proposta: prompt versionati in file dedicati con registro di provenienza e casi di verifica, anziché ulteriori stringhe sparse nel motore.
