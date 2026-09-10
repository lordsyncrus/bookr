"use client";
import { setTitleActivity } from "@/lib/editor/ai-activity";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import type { Editor } from "@tiptap/react";
import { Sparkles, ArrowRight, Check, X } from "lucide-react";
import type { ManuscriptProject } from "@/lib/editor/types";
import { applyTitlePlan, titleTarget, type TitlePlan } from "@/lib/editor/title-plan";
export function TitlePlanPanel({project,editor,locked,onChange,onFinal,onNavigate}:{project:ManuscriptProject;editor:Editor;locked:boolean;onChange:(p:ManuscriptProject)=>void;onFinal:()=>void;onNavigate:(pos:number)=>void}) {
  const en=useLocale()==="en";const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [numbering,setNumbering]=useState("keep");const [confirm,setConfirm]=useState(false);
  const latest=useRef(project);useEffect(()=>{latest.current=project;},[project]);
  const plan=project.titlePlan;const ready=project.analysis?.state==="complete"&&!project.analysis.stale;
  const pending=plan?.items.filter(p=>p.status==="pending"&&titleTarget(editor.state.doc,p))||[];
  async function generate() {
    if(busy||locked)return;setBusy(true);setTitleActivity(project.id,true);setError("");
    const source=JSON.parse(JSON.stringify(editor.getJSON(),(key,value)=>key==="src"&&typeof value==="string"&&value.startsWith("data:")?"":value));
    const snapshot=JSON.stringify(editor.getJSON());
    try {
      const response=await fetch("/api/editorial/titles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobId:project.analysis?.jobId,doc:source,numbering}),signal:AbortSignal.timeout(120000)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error);
      if(editor.isDestroyed||snapshot!==JSON.stringify(editor.getJSON()))throw new Error("CHANGED");
      onChange({...latest.current,titlePlan:data as TitlePlan,updatedAt:Date.now()});
    }catch(error){const code=error instanceof Error?error.message:"";const messages:Record<string,[string,string]>={
      ANALYSIS_REQUIRED:["Il manoscritto è cambiato. Ripeti il check strutturale.","The manuscript changed. Run the structural check again."],
      CHANGED:["Il manoscritto è cambiato durante la generazione. Ripeti il check strutturale.","The manuscript changed during generation. Run the structural check again."],
      FILE_TOO_LARGE:["Il libro supera il limite della proposta. Nessuna chiamata AI effettuata.","The proposal exceeds the size limit. No AI call was made."],
      OUTPUT_LIMIT:["Il modello ha interrotto la risposta perché troppo lunga. Nessuna proposta parziale è stata applicata.","The model stopped because the response was too long. No partial proposal was applied."],
      INVALID_ANCHORS:["La proposta contiene riferimenti non validi al manoscritto. Nessuna modifica applicata.","The proposal contains invalid manuscript references. No changes applied."],
      INVALID_RESPONSE:["Il modello non ha restituito una proposta completa nel formato richiesto. Puoi riprovare.","The model did not return a complete valid proposal. You can retry."],
      TIMEOUT:["Il modello non ha risposto entro il tempo limite. Puoi riprovare.","The model timed out. You can retry."],
      TimeoutError:["La richiesta ha superato il tempo limite. Puoi riprovare.","The request timed out. You can retry."],
      CREDITS:["Servizio AI temporaneamente non disponibile. Contatta il supporto.","AI service temporarily unavailable. Contact support."],
      API_KEY:["La chiave OpenRouter non è valida.","The OpenRouter key is invalid."],
      BUSY:["Una generazione è già in corso o il provider è occupato. Attendi e riprova.","Generation is already running or the provider is busy. Wait and retry."],
      PROVIDER_REQUEST:["OpenRouter ha rifiutato il formato della richiesta. La configurazione del modello richiede una correzione.","OpenRouter rejected the request format. The model configuration needs correction."],
      PROVIDER:["Connessione a OpenRouter non riuscita. Puoi riprovare.","Could not connect to OpenRouter. You can retry."]
    };setError((messages[code]||["Generazione non riuscita. Codice: "+(code||"UNKNOWN"),"Generation failed. Code: "+(code||"UNKNOWN")])[en?1:0]);}finally{setBusy(false);setTitleActivity(project.id,false);}
  }
  function approve(ids:string[]) {
    if(locked||busy||!plan)return;
    editor.view.dispatch(applyTitlePlan(editor.state,plan.items.filter(p=>ids.includes(p.id))));setConfirm(false);
  }
  function reject(id:string) {if(!plan)return;onChange({...project,titlePlan:{...plan,items:plan.items.map(p=>p.id===id?{...p,status:"rejected"}:p)},updatedAt:Date.now()});}
  return <details open className="title-plan hexclave-private"><summary><Sparkles size={16}/>{en?"Propose contents and headings":"Proponi indice e titoli"}</summary>
    <p>{en?"A proposed structure based on the book’s complete reading: names, hierarchy and new headings. Approve changes before they enter your manuscript.":"Una proposta basata sulla lettura completa del libro: nomi, gerarchia e nuovi titoli. Approvi tu le modifiche prima che entrino nel manoscritto."}</p>
    {!ready&&<div className="title-plan-notice"><p>{en?"First complete an up-to-date structural check so the proposal considers the whole book.":"Completa prima un check strutturale aggiornato: la proposta terrà così conto dell’intero libro."}</p><button className="studio-button" disabled={locked||busy} onClick={onFinal}>{en?"Run structural check":"Avvia check strutturale"}</button></div>}
    {ready&&!plan&&<p role="status">{en?"Structural analysis complete. Now generate the proposed contents below; no contents have been created yet.":"Analisi strutturale completata. Ora genera la proposta qui sotto: l’indice non è ancora stato creato."}</p>}
    <label>{en?"Numbering":"Numerazione"}<select value={numbering} disabled={busy||locked} onChange={e=>setNumbering(e.target.value)}><option value="keep">{en?"Keep current convention":"Mantieni convenzione attuale"}</option><option value="decimal">{en?"Hierarchical · 1, 1.1, 1.2":"Gerarchica · 1, 1.1, 1.2"}</option><option value="none">{en?"No numbering":"Senza numerazione"}</option></select></label>
    <button className="studio-button primary full" disabled={!ready||locked||busy||!!plan} onClick={()=>void generate()}><Sparkles size={15}/>{busy?(en?"Preparing proposal…":"Preparazione proposta…"):(en?"Generate proposal":"Genera proposta")}</button>
    <small>{en?"Keep this panel open while the proposal is generated.":"Mantieni aperto questo pannello durante la generazione."}</small>
    {error&&<p role="alert">{error}</p>}
    {plan&&<>{!!plan.discarded&&<p role="status">{en?`${plan.discarded} invalid proposals were excluded. The valid proposals are shown below; this plan needs review.`:`${plan.discarded} proposte non valide escluse. Qui sotto trovi quelle verificate: il piano richiede una revisione.`}</p>}<div className="title-plan-actions"><strong>{en?`${pending.length} to review`:`${pending.length} da valutare`}</strong></div><p>{en?"Approvals also enable the linked contents in DOCX export. Use Undo in the editor to reverse an approval.":"Le approvazioni attivano anche l’indice collegato nell’esportazione DOCX. Usa Annulla nell’editor per annullare un’approvazione."}</p>
    {pending.length>0&&<button className="studio-button full" disabled={locked||busy} onClick={()=>setConfirm(true)}>{en?"Approve all headings":"Approva tutti i titoli"} ({pending.length})</button>}
    {confirm&&<div className="title-plan-notice" role="group" aria-label={en?"Confirm approval":"Conferma approvazione"}><p>{en?`Apply ${pending.length} changes to your manuscript?`:`Applicare ${pending.length} modifiche al manoscritto?`}</p><button className="studio-button primary" disabled={locked||busy} onClick={()=>approve(pending.map(p=>p.id))}>{en?"Apply all":"Applica tutte"}</button><button className="studio-button" onClick={()=>setConfirm(false)}>{en?"Cancel":"Annulla"}</button></div>}
    {!plan.items.length&&<p>{en?"No heading changes are needed.":"Non sono state proposte modifiche ai titoli."}</p>}
    {plan.items.map(p=><article className="title-proposal" key={p.id}><button className="structure-reference" disabled={p.status==="stale"} onClick={()=>onNavigate(p.pos)}>{en?"Go to passage":"Vai al passaggio"} · {p.action==="insert"?(en?"New heading":"Nuovo titolo"):(en?"Heading refactor":"Revisione titolo")}</button><div className="title-before"><small>{p.action==="insert"?(en?"Insert before":"Inserisci prima di"):(en?`Before · ${p.originalLevel?`Heading ${p.originalLevel}`:"Paragraph"}`:`Prima · ${p.originalLevel?`Titolo ${p.originalLevel}`:"Paragrafo"}`)}</small><p>{p.original}</p></div><div className="title-after"><small><ArrowRight size={13}/>{en?`After · Heading ${p.level}`:`Dopo · Titolo ${p.level}`}</small><strong>{p.title}</strong></div><p>{p.reason}</p><footer><span>{({pending:en?"Pending":"Da valutare",approved:en?"Approved":"Approvata",rejected:en?"Rejected":"Rifiutata",stale:en?"Passage changed":"Passaggio modificato"})[p.status]}</span>{p.status==="pending"&&<><button className="studio-button" disabled={locked||busy||!titleTarget(editor.state.doc,p)} onClick={()=>approve([p.id])}><Check size={14}/>{en?"Approve":"Approva"}</button><button className="studio-button" disabled={locked||busy} onClick={()=>reject(p.id)}><X size={14}/>{en?"Reject":"Rifiuta"}</button></>}</footer></article>)}
    <button className="studio-button full" disabled={busy||locked||pending.length>0} onClick={()=>onChange({...project,titlePlan:undefined,updatedAt:Date.now()})}>{en?"Start a new plan":"Prepara un nuovo piano"}</button><small>{en?"Export the revision report before starting a new plan to retain this proposal history.":"Esporta l’elenco revisioni prima di iniziare un nuovo piano per conservare lo storico di queste proposte."}</small></>}
  </details>;
}
