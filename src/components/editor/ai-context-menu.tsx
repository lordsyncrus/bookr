"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { useLocale } from "next-intl";
import { Sparkles, PenLine, Expand, AlignLeft, LoaderCircle, X } from "lucide-react";
import { canRewriteSelection, replaceAiSelection } from "@/lib/editor/ai-selection";
import { setTitleActivity } from "@/lib/editor/ai-activity";
import type { BookProfile } from "@/lib/editor/book-profile";
import type { WritingAction } from "@/lib/editorial/writing";
import { useDialogFocus } from "./use-dialog-focus";
type Target = {from:number;to:number;doc:PMNode;text:string};
export function AiContextMenu({editor,projectId,profile,locked,onBusy,onCost}:{editor:Editor;projectId:string;profile:BookProfile;locked:boolean;onBusy:(busy:boolean)=>void;onCost:(cost:number)=>void}) {
  const en=useLocale()==="en";
  const [menu,setMenu]=useState<{x:number;y:number}|null>(null),[action,setAction]=useState<WritingAction|null>(null);
  const [instructions,setInstructions]=useState(""),[result,setResult]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [target,setTarget]=useState<Target|null>(null);
  const menuRef=useRef<HTMLDivElement>(null),inFlight=useRef(false);
  const callbacks=useRef({onBusy,onCost});useEffect(()=>{callbacks.current={onBusy,onCost};},[onBusy,onCost]);
  const labels={write:en?"Write":"Scrivi",expand:en?"Expand":"Espandi",summarize:en?"Summarize":"Riassumi"};
  const close=useCallback(()=>{if(inFlight.current)return;setAction(null);setMenu(null);setError("");editor.commands.focus();},[editor]);
  useDialogFocus(!!action,close);
  useEffect(()=>{
    const context=(event:MouseEvent)=>{
      if(locked||inFlight.current||editor.state.selection.empty)return;
      event.preventDefault();
      const {from,to}=editor.state.selection;
      setTarget({from,to,doc:editor.state.doc,text:editor.state.doc.textBetween(from,to,"\n")});
      setMenu({x:Math.max(8,Math.min(event.clientX,window.innerWidth-240)),y:Math.max(8,Math.min(event.clientY,window.innerHeight-185))});
      setError("");setResult("");setInstructions("");
    };
    const keyboard=(event:KeyboardEvent)=>{
      if(event.key==="ContextMenu"||(event.shiftKey&&event.key==="F10")){
        const rect=editor.view.coordsAtPos(editor.state.selection.from);
        if(!editor.state.selection.empty&&!locked){event.preventDefault();context(new MouseEvent("contextmenu",{clientX:rect.left,clientY:rect.bottom}));}
      }
    };
    editor.view.dom.addEventListener("contextmenu",context);editor.view.dom.addEventListener("keydown",keyboard);
    return()=>{editor.view.dom.removeEventListener("contextmenu",context);editor.view.dom.removeEventListener("keydown",keyboard);};
  },[editor,locked]);
  useEffect(()=>{
    if(!menu)return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const outside=(event:PointerEvent)=>{if(!menuRef.current?.contains(event.target as Node))setMenu(null);};
    const scroll=()=>setMenu(null);
    document.addEventListener("pointerdown",outside);document.addEventListener("scroll",scroll,true);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("scroll",scroll,true);};
  },[menu]);
  function choose(value:WritingAction){setMenu(null);setAction(value);const t=target;if(!t||!canRewriteSelection(t.doc,t.from,t.to))setError(en?"Select prose or text within a single table cell; do not span table cells or lists.":"Seleziona del testo, anche dentro una singola cella, senza attraversare celle o elenchi diversi.");else if(t.text.length>16000)setError(en?"Select a shorter passage (maximum 16,000 characters).":"Seleziona un passaggio più breve (massimo 16.000 caratteri).");}
  async function generate(){
    const t=target;if(!action||!t||locked||inFlight.current||!canRewriteSelection(t.doc,t.from,t.to)||t.text.length>16000)return;
    inFlight.current=true;setBusy(true);setError("");setResult("");callbacks.current.onBusy(true);setTitleActivity(projectId,true);
    try{
      const response=await fetch("/api/editorial/write",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,text:t.text,instructions,profile,context:t.doc.textBetween(Math.max(0,t.from-2000),t.from,"\n")+"\n[SELEZIONE]\n"+t.doc.textBetween(t.to,Math.min(t.doc.content.size,t.to+2000),"\n")}),signal:AbortSignal.timeout(120000)});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      if(typeof data.cost==="number"&&Number.isFinite(data.cost)&&data.cost>=0)callbacks.current.onCost(data.cost);
      if(editor.isDestroyed)return;
      if(typeof data.text!=="string"||!data.text.trim())throw new Error("INVALID_RESPONSE");
      setResult(data.text);
    }catch(cause){const code=cause instanceof Error?cause.message:"";setError(["TIMEOUT","TimeoutError"].includes(code)?(en?"The request timed out. Try again.":"La richiesta ha superato il tempo limite. Puoi riprovare."):code==="NOT_CONFIGURED"?(en?"AI is not configured.":"Il servizio AI non è configurato."):(en?"Generation failed. No text was changed. Try again.":"Generazione non riuscita. Nessun testo modificato. Puoi riprovare."));}
    finally{inFlight.current=false;setBusy(false);callbacks.current.onBusy(false);setTitleActivity(projectId,false);}
  }
  function apply(){const t=target;if(!t||locked||busy||!result.trim())return;try{editor.view.dispatch(replaceAiSelection(editor.state,t.doc,t.from,t.to,result));close();}catch{setError(en?"The document changed. Close this proposal and select the passage again.":"Il documento è cambiato. Chiudi la proposta e seleziona di nuovo il passaggio.");}}
  return createPortal(<>
    {menu&&<div className="ai-selection-menu" ref={menuRef} role="menu" aria-label={en?"AI writing":"Scrittura AI"} style={{left:menu.x,top:menu.y}} onKeyDown={event=>{const buttons=Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button")||[]);const at=buttons.indexOf(document.activeElement as HTMLButtonElement);if(event.key==="Escape"){event.preventDefault();close();}if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)){event.preventDefault();buttons[event.key==="Home"?0:event.key==="End"?buttons.length-1:(at+(event.key==="ArrowDown"?1:buttons.length-1))%buttons.length]?.focus();}if(event.key==="Tab")setMenu(null);}}><small><Sparkles size={14}/>{en?"Work on selection":"Lavora sulla selezione"}</small>{([["write",PenLine],["expand",Expand],["summarize",AlignLeft]] as const).map(([key,Icon])=><button role="menuitem" key={key} onClick={()=>choose(key)}><Icon size={16}/>{labels[key]}</button>)}</div>}
    {action&&<div className="studio-modal-backdrop"><section className="studio-modal ai-writing-dialog hexclave-private" role="dialog" aria-modal="true" aria-labelledby="ai-writing-title"><header><h2 id="ai-writing-title"><Sparkles size={20}/>{labels[action]}</h2><button disabled={busy} onClick={close} aria-label={en?"Close":"Chiudi"}><X size={20}/></button></header><details><summary>{en?"Selected text":"Testo selezionato"}</summary><p className="ai-source">{target?.text}</p></details><label>{en?"Instructions (optional)":"Istruzioni (facoltative)"}<textarea rows={2} maxLength={1500} value={instructions} disabled={busy} onChange={event=>setInstructions(event.target.value)} placeholder={en?"For example: use a simpler tone":"Es. usa un tono più semplice"}/></label>{busy&&<p role="status" className="ai-writing-status"><LoaderCircle className="animate-spin" size={18}/>{en?"Working on your selection…":"Sto elaborando la selezione…"}</p>}{result&&<label>{en?"Proposal — editable before applying":"Proposta — puoi modificarla prima di applicare"}<textarea className="ai-proposal" rows={10} value={result} maxLength={48000} onChange={event=>setResult(event.target.value)}/></label>}{error&&<p role="alert">{error}</p>}<div className="modal-actions"><button className="studio-button secondary" disabled={busy} onClick={close}>{en?"Discard":"Scarta"}</button><button className="studio-button secondary" disabled={busy||locked||!target||target.text.length>16000||!canRewriteSelection(target.doc,target.from,target.to)} onClick={()=>void generate()}>{result?(en?"Regenerate":"Rigenera"):(en?"Generate":"Genera")}</button>{result&&<button className="studio-button primary" disabled={busy||locked||!result.trim()} onClick={apply}>{en?"Apply to selection":"Applica alla selezione"}</button>}</div></section></div>}
  </>,document.body);
}
