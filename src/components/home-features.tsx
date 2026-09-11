"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, FileCheck, Highlighter, ListTree, Pause, Play, ScanText } from "lucide-react";
import { useLocale } from "next-intl";

const icons = [BookOpen, ScanText, FileCheck, BookOpen, ListTree, Highlighter, BookOpen, Highlighter, FileCheck];
const copy = {
  it: [
    ["Manoscritti lunghi", "Lavora anche su libri estesi: il testo viene analizzato capitolo per capitolo, mantenendo il contesto del libro senza inviarlo tutto in una sola richiesta AI."],
    ["Controllo ortografico", "Individua refusi, accenti sbagliati e parole scritte male, proponendo la correzione."],
    ["Verifica grammaticale", "Controlla concordanze, costruzione delle frasi e punteggiatura."],
    ["Creazione titoli", "Propone titoli per capitoli e sezioni, aiutandoti a renderli chiari e uniformi."],
    ["Generazione indice", "Crea l’indice dai titoli del libro oppure riconosce e collega quello già presente."],
    ["Coerenza stilistica", "Segnala problemi di chiarezza e uniformità, rispettando il tono e la voce dell’autore."],
    ["Coerenza del contenuto", "Cerca possibili contraddizioni tra capitoli: nomi, date, eventi e termini usati in modo diverso."],
    ["Espansione e sintesi", "Sviluppa un passaggio o rendilo più breve. Leggi la proposta prima di inserirla nel libro."],
    ["Formattazione del libro", "Scegli caratteri, spaziature e margini. Aggiungi frontespizio e colophon ed esporta il documento."],
  ],
  en: [
    ["Long manuscripts", "Work on longer books: the text is analyzed chapter by chapter, preserving book context without sending everything in a single AI request."],
    ["Spell checking", "Finds typos, incorrect accents, and misspelled words, and suggests corrections."],
    ["Grammar checking", "Checks agreement, sentence structure, and punctuation."],
    ["Heading creation", "Suggests chapter and section headings to help make them clear and consistent."],
    ["Table of contents", "Builds a table of contents from your book’s headings or detects and links an existing one."],
    ["Style consistency", "Flags clarity and consistency issues while respecting the author’s tone and voice."],
    ["Content consistency", "Looks for potential contradictions across chapters: names, dates, events, and inconsistent terminology."],
    ["Expand and summarize", "Develop a passage or make it shorter. Review the suggestion before adding it to your book."],
    ["Book formatting", "Choose fonts, spacing, and margins. Add a title page and colophon, then export your document."],
  ],
};

export function HomeFeatures() {
  const en = useLocale() === "en";
  const items = copy[en ? "en" : "it"];
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const move = useCallback((direction: number, automatic = false) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    const step = card.offsetWidth + 20;
    const end = el.scrollWidth - el.clientWidth;
    const next = direction > 0 && el.scrollLeft >= end - 4 ? 0 : direction < 0 && el.scrollLeft <= 4 ? end : el.scrollLeft + direction * step;
    el.scrollTo({ left: next, behavior: reduced ? "instant" : "smooth" });
    if (!automatic) setPaused(true);
  }, [reduced]);

  useEffect(() => {
    if (paused || interacting || reduced) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const el = track.current;
      if (!el) return;
      const bounds = el.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      move(1, true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, interacting, reduced, move]);

  return (
    <section id="metodo" aria-labelledby="home-features-title" className="border-y border-ink/10 bg-white/55 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-forest">{en ? "Inside the studio" : "Dentro lo studio"}</p>
            <h2 id="home-features-title" className="font-serif text-4xl font-semibold text-ink sm:text-5xl">{en ? "What does Bookr do?" : "Cosa fa Bookr?"}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!reduced && <button type="button" className="feature-control" onClick={() => setPaused(value => !value)} aria-label={paused ? (en ? "Resume carousel" : "Riprendi carosello") : (en ? "Pause carousel" : "Pausa carosello")}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}
            <button type="button" className="feature-control" onClick={() => move(-1)} aria-label={en ? "Previous features" : "Funzionalità precedenti"}><ArrowLeft size={18} /></button>
            <button type="button" className="feature-control" onClick={() => move(1)} aria-label={en ? "Next features" : "Funzionalità successive"}><ArrowRight size={18} /></button>
          </div>
        </div>
        <div ref={track} className="home-features-track" role="region" aria-roledescription={en ? "carousel" : "carosello"} aria-label={en ? "Bookr features" : "Funzionalità di Bookr"} tabIndex={0} onTouchStart={() => setPaused(true)} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}>
          {items.map(([title, body], index) => {
            const Icon = icons[index];
            return <article key={title} className="home-feature-card" aria-label={`${index + 1} / ${items.length}`}>
              <div className="flex items-center justify-between text-forest"><Icon size={24} strokeWidth={1.5} aria-hidden="true" /><span className="text-xs tabular-nums text-ink/40">0{index + 1}</span></div>
              <h3 className="mb-3 mt-9 font-serif text-3xl font-semibold leading-tight text-ink">{title}</h3>
              <p className="text-sm leading-6 text-ink/65">{body}</p>
            </article>;
          })}
        </div>
      </div>
    </section>
  );
}
