"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, LoaderCircle, MoreHorizontal, Copy, Pencil, Trash2, RotateCcw } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { ManuscriptProject } from "@/lib/editor/types";
import { libraryStatus, libraryProgress } from "@/lib/editor/library-status";
import { downloadBlob, exportDocx } from "@/lib/editor/export";
import { exportRevisionReport } from "@/lib/editor/revision-report";
import { printPdf } from "@/lib/editor/print-pdf";
export function LibraryCardStatus({project}:{project:ManuscriptProject}) {
  const en=useLocale()==="en";const t=useTranslations("editor");const status=libraryStatus(project);
  const labels:Record<string,string>=en?{queued:"Analysis queued",running:"Analysis in progress",paused:"Analysis paused",error:"Analysis interrupted",cancelled:"Analysis cancelled",outdated:"Check needs updating",review:"Changes to review",checked:"Checks completed",unverified:"Not checked yet"}:{queued:"Analisi in coda",running:"Analisi in corso",paused:"Analisi in pausa",error:"Analisi interrotta",cancelled:"Analisi annullata",outdated:"Verifica da aggiornare",review:"Interventi da valutare",checked:"Controlli completati",unverified:"Non ancora verificato"};
  const progress=libraryProgress(project);
  const steps:Record<string,string>=en?{language:"Language",structure:"Structure",decisions:"Decisions",final:"Final check"}:{language:"Lingua",structure:"Struttura",decisions:"Decisioni",final:"Verifica finale"};
  return <div className={`library-check-status compact-check status-${status.state}`}>
    <div className="library-progress-heading"><strong>{labels[status.state]}</strong><b>{progress.percent}%</b></div>
    <div className="library-progress-track" role="progressbar" aria-label={en?"Review workflow progress":"Avanzamento del percorso di revisione"} aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} title={en?"Four equally weighted steps: language, structure, decisions, final check. Not a quality score.":"Quattro fasi di pari peso: lingua, struttura, decisioni e verifica finale. Non è un voto alla qualità."}><span style={{width:`${progress.percent}%`}}/></div>
    <ul className="library-progress-steps">{progress.steps.map(step=><li key={step.key} className={step.done?"done":"todo"}><span aria-hidden="true"/>{steps[step.key]}<span className="sr-only">{step.done?(en?": completed":": completata"):(en?": pending":": da completare")}</span></li>)}</ul>
    {project.analysis&&["running","queued","paused","error"].includes(status.state)?<small>{t(`phases.${project.analysis.phase}`)} · {project.analysis.done}/{project.analysis.total}</small>:progress.remaining>0?<small>{en?`${progress.remaining} decisions remaining`:`${progress.remaining} interventi da chiudere`}</small>:null}
  </div>;

}
export function LibraryCardMenu({project,disabled,onDuplicate,onRename,onTrash,onRestore,onDelete,onError}:{project:ManuscriptProject;disabled:boolean;onDuplicate:()=>void;onRename:()=>void;onTrash:()=>void;onRestore:()=>void;onDelete:()=>void;onError:(message:string)=>void}) {
  const locale=useLocale();const en=locale==="en";const [busy,setBusy]=useState(false);
  async function run(format:"docx"|"pdf"|"report") {
    if(busy)return;setBusy(true);onError("");
    try {
      if(format==="pdf")await printPdf(project,locale);
      else downloadBlob(format==="docx"?await exportDocx(project):await exportRevisionReport(project,locale),`${project.name}-${format==="docx"?"revisionato":"elenco-revisioni"}.docx`);
    }catch{onError(en?"Export failed. For PDF, allow the print window to open.":"Esportazione non riuscita. Per il PDF, consenti l’apertura della finestra di stampa.");}finally{setBusy(false);}
  }
  const trashed=!!project.trashedAt;
  const analysisActive=!!project.analysis&&!["complete","cancelled"].includes(project.analysis.state);
  return <DropdownMenu><DropdownMenuTrigger className="library-card-menu-trigger" disabled={disabled||busy} aria-label={en?"Book actions":"Azioni del libro"} title={en?"Book actions":"Azioni del libro"}>{busy?<LoaderCircle size={19} className="animate-spin"/>:<MoreHorizontal size={21}/>}</DropdownMenuTrigger><DropdownMenuContent align="end" sideOffset={6} className="w-60 rounded-xl p-2 hexclave-private">
    {!trashed&&<><DropdownMenuItem onClick={()=>void run("docx")}><Download/>{en?"Export DOCX":"Esporta DOCX"}</DropdownMenuItem><DropdownMenuItem onClick={()=>void run("pdf")}><Download/>{en?"Export PDF":"Esporta PDF"}</DropdownMenuItem><DropdownMenuItem onClick={()=>void run("report")}><Download/>{en?"Revision report":"Elenco revisioni"}</DropdownMenuItem></>}
    <DropdownMenuItem disabled={!project.source} onClick={()=>{if(project.source)downloadBlob(project.source,project.source.name);}}><Download/>{en?"Download original":"Scarica originale"}</DropdownMenuItem><DropdownMenuSeparator/>
    {trashed?<><DropdownMenuItem onClick={onRestore}><RotateCcw/>{en?"Restore":"Ripristina"}</DropdownMenuItem><DropdownMenuItem onClick={onDelete}><Trash2/>{en?"Delete permanently":"Elimina definitivamente"}</DropdownMenuItem></>:<><DropdownMenuItem onClick={onDuplicate}><Copy/>{en?"Duplicate":"Duplica"}</DropdownMenuItem><DropdownMenuItem onClick={onRename}><Pencil/>{en?"Rename":"Rinomina"}</DropdownMenuItem><DropdownMenuItem disabled={analysisActive} title={analysisActive?(en?"Complete or cancel the analysis first":"Completa o annulla prima l’analisi"):undefined} onClick={onTrash}><Trash2/>{en?"Move to Trash":"Sposta nel cestino"}</DropdownMenuItem></>}
  </DropdownMenuContent></DropdownMenu>;
}
