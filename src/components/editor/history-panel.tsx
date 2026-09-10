"use client";
import { useState, useCallback, type CSSProperties } from "react";
import { useLocale } from "next-intl";
import { History, RotateCcw, ArrowLeft } from "lucide-react";
import type { ManuscriptProject } from "@/lib/editor/types";
import { historyText, type ManuscriptSnapshot, type HistoryKind } from "@/lib/editor/history";
import { useDialogFocus } from "./use-dialog-focus";
function SnapshotPreview({node}:{node:ManuscriptSnapshot["doc"]}){
 if(node.type==="text"){
  const marks=node.marks||[],style=marks.find(m=>m.type==="textStyle")?.attrs||{};
  return <span style={{fontWeight:marks.some(m=>m.type==="bold")?700:undefined,fontStyle:marks.some(m=>m.type==="italic")?"italic":undefined,textDecoration:marks.some(m=>m.type==="strike")?"line-through":marks.some(m=>m.type==="underline")?"underline":undefined,background:marks.some(m=>m.type==="userHighlight")?"#ffed96":undefined,fontFamily:typeof style.fontFamily==="string"?style.fontFamily:undefined,fontSize:typeof style.fontSize==="string"?style.fontSize:undefined}}>{node.text}</span>;
 }
 return <div style={{marginBottom:node.type==="paragraph"?8:undefined,fontWeight:node.type==="heading"?700:undefined,fontSize:node.type==="heading"?18:undefined,textAlign:(["left","right","center","justify"].includes(node.attrs?.textAlign)?node.attrs?.textAlign:undefined) as CSSProperties["textAlign"]}}>{node.content?.map((child,i)=><SnapshotPreview node={child} key={i}/>)}</div>;
}
function annotations(value:ManuscriptSnapshot){
 const comments=new Map<string,string>(),highlights:string[]=[];
 const walk=(node:ManuscriptSnapshot["doc"])=>{for(const mark of node.marks||[]){if(mark.type==="userComment")comments.set(String(mark.attrs?.id),String(mark.attrs?.text||""));if(mark.type==="userHighlight"&&node.text)highlights.push(node.text);}node.content?.forEach(walk);};walk(value.doc);
 return {comments:[...comments.values()],highlights};
}
export function HistoryPanel({projects,activeId,onSelect,onRestore,onOpen,locked}:{projects:ManuscriptProject[];activeId:string|null;onSelect:(id:string)=>void;onRestore:(project:ManuscriptProject,id:string)=>void;onOpen:(id:string)=>void;locked:boolean}) {
 const en=useLocale()==="en";const project=projects.find(p=>p.id===activeId)||projects[0];
 const [selected,setSelected]=useState<string|null>(null),[confirm,setConfirm]=useState<string|null>(null);
 const close=useCallback(()=>setConfirm(null),[]);useDialogFocus(!!confirm,close);
 const entries=project?.history||[];const version=entries.find(e=>e.id===selected)||entries.at(-1);const index=entries.findIndex(e=>e.id===version?.id),previous=entries[index-1];
 const labels:Record<HistoryKind,string>={original:en?"Original imported text":"Testo originale importato",baseline:en?"History started":"Inizio cronologia",text:en?"Text editing":"Modifica del testo",review:en?"Revision decisions":"Decisioni di revisione",structure:en?"Structure and contents":"Struttura e indice",format:en?"Formatting":"Formattazione",metadata:en?"Book details":"Dati del libro",annotations:en?"Highlights and comments":"Evidenziazioni e commenti",restore:en?"Version restored":"Versione ripristinata"};
 const date=(at:number)=>new Date(at).toLocaleString(en?"en-GB":"it-IT");
 const textBefore=previous?historyText(previous.snapshot):"",textAfter=version?historyText(version.snapshot):"";
 const linesBefore=textBefore.split("\n"),linesAfter=textAfter.split("\n");let prefix=0;while(prefix<linesBefore.length&&prefix<linesAfter.length&&linesBefore[prefix]===linesAfter[prefix])prefix++;
 let suffix=0;while(suffix<linesBefore.length-prefix&&suffix<linesAfter.length-prefix&&linesBefore[linesBefore.length-1-suffix]===linesAfter[linesAfter.length-1-suffix])suffix++;
 const changedBefore=linesBefore.slice(prefix,linesBefore.length-suffix).join("\n"),changedAfter=linesAfter.slice(prefix,linesAfter.length-suffix).join("\n");
 return <section className="history-page hexclave-private"><header><div><span className="small-overline"><History size={15}/>{en?"Manuscript history":"Cronologia del manoscritto"}</span><h1>{en?"Your changes":"Le tue modifiche"}</h1></div>{project&&<button className="studio-button secondary" disabled={locked} onClick={()=>onOpen(project.id)}><ArrowLeft size={15}/>{en?"Back to editor":"Torna all’editor"}</button>}</header>
 <label>{en?"Manuscript":"Manoscritto"}<select value={project?.id||""} onChange={e=>{onSelect(e.target.value);setSelected(null);setConfirm(null);}}>{projects.map(p=><option key={p.id} value={p.id}>{p.metadata?.title||p.name}</option>)}</select></label>
 <p className="modal-note">{en?"Saved on this device. Typing is grouped into sessions. Earlier intermediate changes cannot be reconstructed. Restoring creates a new version and preserves the current one.":"Salvata su questo dispositivo. La scrittura è raggruppata in sessioni. Le modifiche intermedie precedenti all’attivazione non sono ricostruibili. Il ripristino crea una nuova versione e conserva quella attuale."}</p>
 {!project?<p>{en?"No manuscripts available.":"Nessun manoscritto disponibile."}</p>:<div className="history-layout"><nav aria-label={en?"Versions":"Versioni"}>{[...entries].reverse().map(e=><button key={e.id} aria-current={version?.id===e.id?"true":undefined} onClick={()=>setSelected(e.id)}><strong>{labels[e.kind]}</strong><time>{date(e.at)}</time>{e.startedAt!==e.at&&<small>{en?"Session from":"Sessione dalle"} {new Date(e.startedAt).toLocaleTimeString()}</small>}</button>)}</nav>
 {version&&<div className="history-detail"><header><div><h2>{labels[version.kind]}</h2><p>{date(version.at)}</p></div><button className="studio-button secondary" disabled={locked||version.id===entries.at(-1)?.id} onClick={()=>setConfirm(version.id)}><RotateCcw size={15}/>{en?"Restore":"Ripristina"}</button></header>
 {version.kind==="original"&&<p className="modal-note">{en?"This restores the original document text; book settings reflect when history was enabled.":"Questa versione recupera il documento originale; le impostazioni del libro risalgono all’attivazione della cronologia."}</p>}
 <h3>{en?"Text changes":"Modifiche al testo"}</h3>{textBefore===textAfter?<p>{en?"Text unchanged. See settings and annotations below.":"Testo invariato. Consulta impostazioni e annotazioni qui sotto."}</p>:<div className="history-comparison"><div><h4>{en?"Before":"Prima"}</h4><pre>{changedBefore||(en?"No text":"Nessun testo")}</pre></div><div><h4>{en?"After":"Dopo"}</h4><pre>{changedAfter||(en?"Text removed":"Testo rimosso")}</pre></div></div>}
 <details><summary>{en?"Settings and annotation details":"Dettagli impostazioni e annotazioni"}</summary><div className="history-comparison">{[previous,version].map((e,i)=><div key={i}><h4>{i===0?(en?"Before":"Prima"):(en?"After":"Dopo")}</h4>{e?<><p>{e.snapshot.typography.font} · {e.snapshot.typography.size} pt · {en?"Line spacing":"Interlinea"} {e.snapshot.typography.lineHeight}</p><p>{en?"Paragraph spacing":"Spazio paragrafi"}: {e.snapshot.typography.paragraphSpacing} · {en?"Margins":"Margini"}: {e.snapshot.typography.margin} mm</p><p>{e.snapshot.metadata?.title} {e.snapshot.metadata?.authors}</p>
 <details><summary>{en?"Formatted text preview":"Anteprima testo formattato"}</summary><div className="history-format-preview"><SnapshotPreview node={e.snapshot.doc}/></div></details>
 <p>{en?"Comments":"Commenti"}: {annotations(e.snapshot).comments.length}</p>{annotations(e.snapshot).comments.map((text,i)=><blockquote key={`c-${i}`}>{text}</blockquote>)}
 <p>{en?"Highlighted text":"Testo evidenziato"}</p>{annotations(e.snapshot).highlights.map((text,i)=><mark key={`h-${i}`}>{text} </mark>)}<p>{en?"Contents":"Indice"}: {e.snapshot.contents?.enabled?(en?"enabled":"attivo"):(en?"disabled":"disattivo")}</p><p>{en?"Approved revisions":"Revisioni approvate"}: {e.snapshot.findings.filter(f=>f.status==="approved").length}</p></>:"—"}</div>)}</div></details>
 </div>}</div>}
 {confirm&&project&&<div className="studio-modal-backdrop"><div className="studio-modal" role="dialog" aria-modal="true" aria-labelledby="restore-history-title"><h2 id="restore-history-title">{en?"Restore this version?":"Ripristinare questa versione?"}</h2><p>{en?"The manuscript and its settings will be restored. Your current version remains in history. AI analysis will need to be refreshed.":"Il manoscritto e le sue impostazioni verranno ripristinati. La versione attuale rimarrà nello storico. L’analisi AI sarà da aggiornare."}</p><div className="modal-actions"><button className="studio-button secondary" onClick={close}>{en?"Cancel":"Annulla"}</button><button className="studio-button primary" disabled={locked} onClick={()=>{onRestore(project,confirm);setSelected(null);setConfirm(null);}}>{en?"Restore version":"Ripristina versione"}</button></div></div></div>}
 </section>;
}
