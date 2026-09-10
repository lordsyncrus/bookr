# Convergenza della revisione

Decisione del 10 settembre 2026: la revisione deve poter concludersi. Una formulazione stilistica equivalente non è un motivo sufficiente per riaprire il lavoro.

Implementazione:
- Riutilizzare sul server il risultato completo dello stesso utente/progetto quando testo e struttura sono invariati. Annotazioni e formattazione non riaprono il controllo.
- Conservare le decisioni in un registro per manoscritto, separato dal report che un nuovo job può sostituire. Il server ricava il contenuto delle decisioni solo dai propri job: il client invia ID e stati, non istruzioni editoriali arbitrarie.
- Nei controlli successivi saltare l’editing dei chunk identici e riusare le note di lettura quando disponibili. Ricontrollare la continuità globale; per la struttura considerare capitoli modificati e vicini, oppure l’intera struttura dopo riordini, eliminazioni o cambi dei titoli.
- Controlli finali e successivi: solo errori linguistici concreti, niente varianti stilistiche equivalenti. Le segnalazioni strutturali devono avere prove testuali.
- Scartare ripetizioni esatte di proposte già decise e inversioni esatte di correzioni approvate. Usare inoltre la memoria delle decisioni nei prompt. Il confronto deterministico non pretende di riconoscere ogni parafrasi semanticamente equivalente.
- Preservare le proposte ancora da valutare su passaggi invariati. Un nuovo controllo non equivale all’approvazione delle proposte precedenti.
- Mostrare conclusione del controllo sul testo corrente e riabilitare il controllo dopo modifiche. Zero proposte è un esito valido.

Limiti: il confronto incrementale è per chunk, non per singolo carattere; le modifiche possono spostare i confini e richiedere un controllo più ampio. Per i manoscritti preesistenti, recuperare le decisioni ancora disponibili nei report e negli snapshot. Non ricostruire decisioni già perse. Un errore concreto sfuggito ai controlli precedenti sul testo invariato può essere segnalato nel controllo di continuità durante un ciclo motivato da modifiche; non lanciare cicli automatici illimitati per cercarlo.

Test sintetici: firma invariata con annotazioni, memoria/reapertura delle decisioni, blocco inversioni e ripetizioni, esclusione varianti stilistiche nei controlli finali, riuso lettura/skip editing, mantenimento proposte pendenti e completamento con zero proposte. Nessun manoscritto reale va incluso nei log o nelle fixture.
