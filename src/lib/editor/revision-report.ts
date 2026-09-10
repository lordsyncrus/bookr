import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import type { ManuscriptProject } from "./types";

export function buildRevisionReport(project: ManuscriptProject, locale = "it") {
  const en = locale === "en";
  const labels = en
    ? {title:"Revision report", original:"Original", proposed:"Proposed replacement", reason:"Reason", block:"Block", approved:"Approved", rejected:"Rejected", pending:"Pending", stale:"No longer applicable", language:"Language", style:"Style", removed:"[Removed passage]", empty:"No revision suggestions recorded.", description:"Snapshot of the current review. Only approved changes are applied to the manuscript; rejected and pending proposals are listed for reference."}
    : {title:"Elenco delle revisioni", original:"Testo originale", proposed:"Modifica proposta", reason:"Motivazione", block:"Blocco", approved:"Approvata", rejected:"Rifiutata", pending:"In attesa", stale:"Non più applicabile", language:"Lingua", style:"Stile", removed:"[Passaggio rimosso]", empty:"Nessuna proposta di revisione registrata.", description:"Riepilogo della revisione corrente. Solo le modifiche approvate sono applicate al manoscritto; le proposte rifiutate e in attesa sono riportate per consultazione."};
  const p = (label: string, value: string) => new Paragraph({children:[new TextRun({text:label ? `${label}: ` : "",bold:!!label}),...value.split(/\r?\n/).map((line,i)=>new TextRun({text:line,break:i?1:undefined}))],spacing:{after:160}});
  const children: Paragraph[] = [new Paragraph({text:labels.title,heading:HeadingLevel.TITLE}), p("",project.metadata?.title || project.name), p("",new Date().toLocaleString(en?"en-GB":"it-IT")), p("",labels.description)];
  for (const status of ["approved","rejected","pending","stale"] as const) children.push(p(labels[status],String(project.findings.filter(f=>f.status===status).length)));
  if (!project.findings.length) children.push(p("",labels.empty));
  for (const [i,f] of project.findings.entries()) {
    children.push(new Paragraph({text:`${i+1}. ${labels[f.status]} · ${labels[f.category]} · ${labels.block} ${f.block}`,heading:HeadingLevel.HEADING_2}),p(labels.original,f.original),p(labels.proposed,f.suggested || labels.removed),p(labels.reason,f.reason));
  }
  if(project.titlePlan) {
    children.push(new Paragraph({text:en?"Contents and heading revisions":"Revisioni di indice e titoli",heading:HeadingLevel.HEADING_1}));
    for(const item of project.titlePlan.items) children.push(new Paragraph({text:`${labels[item.status]} · ${item.title}`,heading:HeadingLevel.HEADING_2}),p(labels.original,item.original),p(labels.proposed,`${item.action === "insert" ? (en?"Insert before passage":"Inserisci prima del passaggio") : (en?"Replace heading":"Sostituisci titolo")} · H${item.level}: ${item.title}`),p(labels.reason,item.reason));
  }
  if (project.analysis) {
    children.push(new Paragraph({text:en?"Book structure and consistency":"Struttura e coerenza del libro",heading:HeadingLevel.HEADING_1}));
    if (project.analysis.stale) children.push(p("",en?"This analysis predates the latest text changes.":"Questa analisi precede le ultime modifiche al testo."));
    for (const issue of project.analysis.issues) {
      const states = en ? {pending:"Pending",accepted:"Accepted into plan",rejected:"Rejected",resolved:"Completed"} : {pending:"Da valutare",accepted:"Accolta nel piano",rejected:"Rifiutata",resolved:"Intervento completato"};
      children.push(new Paragraph({text:issue.title,heading:HeadingLevel.HEADING_2}),p(en?"Decision":"Decisione",states[issue.status]),p(labels.reason,issue.reason),p(en?"Suggested intervention":"Intervento proposto",issue.suggestion));
      for (const evidence of issue.evidence) children.push(p(en?"Evidence":"Passaggio citato",evidence.quote));
    }
  }
  return new Document({creator:"Bookr",title:labels.title,styles:{default:{document:{run:{font:"Calibri",size:22}}}},sections:[{children}]});
}
export async function exportRevisionReport(project: ManuscriptProject, locale: string): Promise<Blob> {
  return Packer.toBlob(buildRevisionReport(project, locale));
}
