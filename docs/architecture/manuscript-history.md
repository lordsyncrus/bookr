# Cronologia dei manoscritti: requisito per la produzione

Decisione concordata il 10 settembre 2026.

## Stato attuale

La cronologia locale usa snapshot completi del documento, delle impostazioni e dei dati di revisione. Le sessioni di scrittura sono raggruppate, ma non esistono ancora delta, compressione, deduplicazione degli allegati o caricamento su richiesta. Le immagini incorporate nel documento possono essere replicate in ogni snapshot. Questo formato serve per provare il flusso, non costituisce l’architettura definitiva per manoscritti grandi.

Il formato corrente delle voci è `schemaVersion: 1`. Le voci precedenti senza questo campo sono legacy v1. Non cambiare il significato del formato v1: introdurre una migrazione esplicita per il successivo.

## Architettura richiesta prima della produzione

- Conservare le differenze fra versioni, con checkpoint completi periodici. Definire la frequenza in base a dimensioni e costo di ricostruzione, non chiedere soglie all’utente.
- Separare immagini e allegati dal documento, conservandoli una sola volta nello storage privato e referenziandoli tramite ID. La deduplicazione deve rispettare isolamento e autorizzazioni degli utenti.
- Comprimere delta e checkpoint. La compressione non sostituisce la deduplicazione.
- Separare indice delle versioni e contenuto: in libreria caricare solo metadati dello storico; recuperare pagine della cronologia e snapshot su richiesta.
- Mostrare spazio occupato e stato di salvataggio. La gestione delle versioni deve essere esplicita: nessuna cancellazione silenziosa per recuperare spazio.
- Mantenere il ripristino non distruttivo: crea una nuova versione, conservando quella sostituita.
- Garantire salvataggi atomici di contenuto, versione e riferimenti agli allegati; gestire conflitti fra dispositivi tramite versione di base.
- Usare identificatori e hash di integrità per verificare la ricostruzione. Non inserire testo, titoli, nomi file o metadati del libro nei log e negli analytics.

## Migrazione del formato attuale

1. Riconoscere snapshot legacy senza `schemaVersion` come v1.
2. Estrarre e deduplicare gli allegati, mantenendo riferimenti validi anche nelle versioni storiche.
3. Convertire gli snapshot in checkpoint e delta preservando ordine, identificatori, date e tipo delle operazioni.
4. Ricostruire tutte le versioni e confrontarle con quelle di origine, inclusi formattazione, annotazioni, revisioni e impostazioni.
5. Attivare il nuovo formato solo dopo verifica e persistenza completa. Conservare la sorgente fino a migrazione conclusa; consentire ripresa dopo interruzione.

## Verifiche richieste

Testare manoscritti lunghi, immagini ripetute e molte sessioni. Misurare spazio, memoria, tempo di apertura e tempo di ripristino su dispositivi rappresentativi. Verificare ripristino dopo migrazione, scritture interrotte, conflitti fra schede/dispositivi, quote esaurite, checkpoint mancanti e isolamento fra utenti. La libreria non deve scaricare né materializzare l’intero storico per mostrare una card.

Queste sono condizioni di completamento del lavoro sulla persistenza di produzione; aggiungere un database senza cambiare il formato degli snapshot non soddisfa il requisito.
