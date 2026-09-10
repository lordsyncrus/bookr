# TODO

## Affidabilità della revisione editoriale

### Priorità alta

- [ ] Riconoscere i capitoli prima della lettura AI usando titoli strutturati, indice esistente e candidati rilevati nel testo. Applicare default automatici nei casi chiari e mostrare le ambiguità all’utente.
  - Verifica: documenti con titoli semantici, titoli solo in grassetto, indice preesistente e nessun titolo; escludere le voci dell’indice dai confini dei capitoli.
- [ ] Fornire a ogni blocco contesto dalla fine del precedente e dall’inizio del successivo, mantenendo separata la porzione modificabile.
  - Verifica: le proposte restano ancorate al blocco principale, senza duplicati o modifiche al contesto adiacente.
- [ ] Registrare la copertura dei controlli per porzione di testo, versione del contenuto e versione delle regole.
  - Verifica: distinguere controllato, da controllare, fallito e non più aggiornato; dichiarare completato solo quando tutti i controlli previsti sono conclusi o riutilizzati validamente.

### Evoluzione successiva

- [ ] Affiancare alle sintesi una memoria strutturata di nomi, termini, date e affermazioni, con riferimenti al testo originale e rilettura mirata in caso di dubbio.
- [ ] Rafforzare la separazione dei controlli per ambito: lingua sul blocco, sviluppo e ripetizioni sul capitolo, coerenza sull’intero libro; fornire a ogni controllo il contesto pertinente.
- [ ] Rafforzare la rianalisi incrementale già presente: riaprire il passaggio modificato e i controlli dipendenti, conservando le decisioni precedenti e riutilizzando solo risultati ancora validi.

### Vincoli e validazione trasversali

- [ ] Preservare gli ancoraggi delle revisioni e le decisioni già salvate quando cambiano i confini di capitoli o blocchi; gestire esplicitamente i risultati che non possono essere rimappati in sicurezza.
- [ ] Verificare copertura, assenza di duplicati, rispetto delle decisioni e prestazioni su un manoscritto lungo, oltre ai test sintetici.
- Mantenere i default automatici e il percorso guidato; richiedere interventi solo sulle ambiguità rilevanti.
- Non includere testo, nomi dei file o metadati dei manoscritti in log o analytics.

Stime indicative discusse il 2026-09-11: 2–4 ore per le tre priorità, inclusi test e prova su un manoscritto lungo; 1–2 giornate per l’intero gruppo. Da rivalutare in fase di implementazione, soprattutto per la compatibilità delle revisioni esistenti.
