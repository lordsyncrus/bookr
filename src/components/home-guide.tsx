import { getLocale } from "next-intl/server";
import { ChevronDown } from "lucide-react";

export async function HomeGuide() {
  const en = (await getLocale()) === "en";
  const steps = en ? [
    ["Upload", "Import your DOCX, TXT, or Markdown manuscript. Your original file is kept separately."],
    ["Review", "Start the analysis to find language issues, potential inconsistencies, and structural suggestions."],
    ["Approve", "Read each explanation, jump to its passage, and accept or reject the proposed change."],
    ["Export", "Download the updated DOCX and revision list, or save a PDF through browser printing."],
  ] : [
    ["Carica", "Importa il manoscritto in DOCX, TXT o Markdown. Il file originale resta conservato separatamente."],
    ["Revisiona", "Avvia l’analisi per trovare errori linguistici, possibili incoerenze e suggerimenti sulla struttura."],
    ["Approva", "Leggi la motivazione, raggiungi il passaggio e accetta o rifiuta la modifica proposta."],
    ["Esporta", "Scarica il DOCX aggiornato e l’elenco delle revisioni, oppure salva un PDF tramite la stampa del browser."],
  ];
  const faqs = en ? [
    ["Which files can I upload?", "Bookr imports DOCX, TXT, and Markdown. Complex Word layouts may not be fully preserved; the original file remains available to download."],
    ["Can I review a long book?", "Bookr divides the manuscript into chapters and smaller sections, using summaries to preserve context. This avoids sending the whole book in one AI request. Very large or complex documents still depend on browser resources and service limits."],
    ["Does AI change my text automatically?", "Review suggestions are presented for you to accept or reject. Writing, expansion, and summarization also show a proposal before you apply it."],
    ["Where is my manuscript saved?", "Your library is currently saved in this browser, without cloud synchronization. Export a copy before clearing browser data. AI jobs also use encrypted checkpoints on the local development server."],
    ["Is my manuscript sent to AI?", "The text needed for an AI task is sent through OpenRouter when you start it. Manuscript content and metadata are excluded from application logs and analytics events."],
    ["Does Bookr verify citations and sources?", "It identifies potential citations, attributions, and references for review. It does not yet verify claims against external sources."],
    ["Can I use Bookr in production today?", "Bookr is under active development. AI processing is currently enabled only in the local development environment; cloud storage and production workers are planned."],
  ] : [
    ["Quali file posso caricare?", "Bookr importa DOCX, TXT e Markdown. I layout Word complessi potrebbero non essere conservati interamente; il file originale resta sempre scaricabile."],
    ["Posso revisionare un libro lungo?", "Bookr divide il manoscritto in capitoli e sezioni più piccole, usando sintesi per mantenere il contesto. Evita così di inviare tutto il libro in una sola richiesta AI. Documenti molto grandi o complessi restano soggetti alle risorse del browser e ai limiti del servizio."],
    ["L’AI modifica il testo da sola?", "Le proposte di revisione vengono presentate perché tu possa approvarle o rifiutarle. Anche scrittura, espansione e sintesi mostrano una proposta prima di applicarla."],
    ["Dove viene salvato il manoscritto?", "La libreria è attualmente salvata in questo browser, senza sincronizzazione cloud. Esporta una copia prima di cancellare i dati del browser. I lavori AI usano anche checkpoint cifrati sul server locale di sviluppo."],
    ["Il manoscritto viene inviato all’AI?", "Il testo necessario all’elaborazione passa attraverso OpenRouter quando avvii una funzione AI. Contenuti e metadati del manoscritto sono esclusi dai log applicativi e dagli eventi analytics."],
    ["Bookr verifica citazioni e fonti?", "Individua possibili citazioni, attribuzioni e riferimenti da controllare. Non verifica ancora le affermazioni consultando fonti esterne."],
    ["Posso usare Bookr in produzione oggi?", "Bookr è in sviluppo attivo. Le elaborazioni AI sono abilitate solo nell’ambiente locale di sviluppo; salvataggio cloud e worker di produzione sono previsti in seguito."],
  ];
  return <>
    <section id="come-funziona" aria-labelledby="guide-title" className="home-anchor mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
      <h2 id="guide-title" className="font-serif text-4xl font-semibold text-ink sm:text-5xl">{en ? "How it works" : "Come funziona"}</h2>
      <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, body], i) => <li key={title} className="border-t border-ink/20 pt-5"><span className="text-xs tabular-nums text-forest">0{i + 1}</span><h3 className="mb-3 mt-4 font-serif text-3xl font-semibold text-ink">{title}</h3><p className="text-sm leading-6 text-ink/65">{body}</p></li>)}
      </ol>
    </section>
    <section id="faq" aria-labelledby="faq-title" className="home-anchor border-y border-ink/10 bg-white/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1fr_2fr] lg:px-10 lg:py-20">
        <h2 id="faq-title" className="font-serif text-4xl font-semibold text-ink sm:text-5xl">{en ? "Frequently asked questions" : "Domande frequenti"}</h2>
        <div>{faqs.map(([question, answer]) => <details key={question} className="group border-b border-ink/10 first:border-t"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-sm py-5 text-base font-medium text-ink focus-visible:outline-2 focus-visible:outline-forest [&::-webkit-details-marker]:hidden">{question}<ChevronDown size={18} className="shrink-0 text-forest group-open:rotate-180" aria-hidden="true" /></summary><p className="max-w-2xl pb-6 pr-8 text-sm leading-7 text-ink/65">{answer}</p></details>)}</div>
      </div>
    </section>
  </>;
}
