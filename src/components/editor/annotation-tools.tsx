"use client";
import { useEffect, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { useLocale } from "next-intl";
import { Highlighter, MessageSquarePlus, MessageSquare, X, Trash2, Pencil } from "lucide-react";
import { closeHistory } from "@tiptap/pm/history";
import type { Node as PMNode } from "@tiptap/pm/model";
import { documentComments, documentHighlights, type ManuscriptComment } from "@/lib/editor/annotations";
export function AnnotationTools({editor,locked}:{editor:Editor;locked:boolean}){
 const en=useLocale()==="en";const [open,setOpen]=useState(false),[draft,setDraft]=useState(""),[editing,setEditing]=useState<string|null>(null),[selected,setSelected]=useState<string|null>(null),[error,setError]=useState("");
 const [view,setView]=useState<"comments"|"highlights">("comments");
 const [composing,setComposing]=useState(false);
 const range=useRef<{from:number;to:number;doc:PMNode}|null>(null);const input=useRef<HTMLTextAreaElement>(null);
 const state=useEditorState({editor,selector:({editor:e})=>({empty:e.state.selection.empty,highlight:e.isActive("userHighlight"),comments:documentComments(e.state.doc),highlights:documentHighlights(e.state.doc)})});
 useEffect(()=>{
   const click=(event:MouseEvent)=>{const id=(event.target as HTMLElement).closest("[data-comment-id]")?.getAttribute("data-comment-id");if(id){setOpen(true);setView("comments");setSelected(id);requestAnimationFrame(()=>document.getElementById(`comment-card-${id}`)?.scrollIntoView({block:"nearest"}));}};
   const keydown=(event:KeyboardEvent)=>{
     if(event.isComposing||!(event.metaKey||event.ctrlKey)||locked)return;
     const key=event.key.toLowerCase();
     if(key==="h"&&event.shiftKey&&!event.altKey){event.preventDefault();event.stopPropagation();if(!editor.state.selection.empty)editor.chain().focus().toggleMark("userHighlight").run();}
     if((key==="m"||event.code==="KeyM")&&event.altKey&&!event.shiftKey){event.preventDefault();event.stopPropagation();if(editor.state.selection.empty)return;const {from,to}=editor.state.selection;range.current={from,to,doc:editor.state.doc};setComposing(true);setEditing(null);setDraft("");setError("");setOpen(true);setView("comments");requestAnimationFrame(()=>input.current?.focus());}
   };
   const dom=editor.view.dom;dom.addEventListener("click",click);dom.addEventListener("keydown",keydown,true);return()=>{dom.removeEventListener("click",click);dom.removeEventListener("keydown",keydown,true);};
 },[editor,locked]);
 function start(){if(locked||editor.state.selection.empty)return;const {from,to}=editor.state.selection;range.current={from,to,doc:editor.state.doc};setComposing(true);setEditing(null);setDraft("");setError("");setOpen(true);setView("comments");requestAnimationFrame(()=>input.current?.focus());}
 function edit(comment:ManuscriptComment){setEditing(comment.id);range.current=null;setComposing(false);setDraft(comment.text);setError("");requestAnimationFrame(()=>input.current?.focus());}
 function save(){if(locked||!draft.trim())return;const tr=closeHistory(editor.state.tr),type=editor.schema.marks.userComment;
   if(editing){tr.doc.descendants((node,pos)=>{const mark=node.marks.find(m=>m.type===type&&m.attrs.id===editing);if(node.isText&&mark){tr.removeMark(pos,pos+node.nodeSize,mark);tr.addMark(pos,pos+node.nodeSize,type.create({...mark.attrs,text:draft.trim()}));}});}
   else{const target=range.current;if(!target||!target.doc.eq(editor.state.doc)){setError(en?"The text changed. Select the passage again.":"Il testo è cambiato. Seleziona di nuovo il passaggio.");return;}
     let overlap=false;tr.doc.nodesBetween(target.from,target.to,node=>{if(node.marks.some(m=>m.type===type))overlap=true;});if(overlap){setError(en?"This selection already contains a comment. Open it to edit it, or select another passage.":"La selezione contiene già un commento. Aprilo per modificarlo oppure seleziona un altro passaggio.");return;}
     const id=crypto.randomUUID();tr.addMark(target.from,target.to,type.create({id,text:draft.trim(),createdAt:new Date().toISOString()}));setSelected(id);
   }
   editor.view.dispatch(tr);range.current=null;setComposing(false);setEditing(null);setDraft("");setError("");
 }
 function remove(id:string){if(locked)return;const tr=closeHistory(editor.state.tr);tr.doc.descendants((node,pos)=>{const mark=node.marks.find(m=>m.type.name==="userComment"&&m.attrs.id===id);if(node.isText&&mark)tr.removeMark(pos,pos+node.nodeSize,mark);});editor.view.dispatch(tr);if(editing===id){setEditing(null);setDraft("");} }
 function go(comment:ManuscriptComment){setSelected(comment.id);editor.chain().focus().setTextSelection({from:comment.from,to:comment.to}).scrollIntoView().run();}
 return <div className="annotation-tools hexclave-private">
  <button type="button" title="⌘/Ctrl + Shift + H" aria-keyshortcuts="Meta+Shift+H Control+Shift+H" disabled={locked||state.empty} aria-pressed={state.highlight} onMouseDown={e=>e.preventDefault()} onClick={()=>editor.chain().focus().toggleMark("userHighlight").run()}><Highlighter size={15}/>{state.highlight?(en?"Remove highlight":"Togli evidenziazione"):(en?"Highlight":"Evidenzia")}</button>
  <button type="button" title="⌘/Ctrl + Alt + M" aria-keyshortcuts="Meta+Alt+M Control+Alt+M" disabled={locked||state.empty} onMouseDown={e=>e.preventDefault()} onClick={start}><MessageSquarePlus size={15}/>{en?"Add comment":"Commenta"}</button>
  <button type="button" aria-expanded={open&&view==="comments"} onClick={()=>{setOpen(!(open&&view==="comments"));setView("comments");}}><MessageSquare size={15}/>{en?"Comments":"Commenti"} · {state.comments.length}</button>
  <button type="button" aria-expanded={open&&view==="highlights"} onClick={()=>{setOpen(!(open&&view==="highlights"));setView("highlights");}}><Highlighter size={15}/>{en?"Highlights":"Evidenziazioni"} · {state.highlights.length}</button>
  {open&&<aside className="annotations-drawer" aria-label={view==="highlights"?(en?"Manuscript highlights":"Evidenziazioni del manoscritto"):(en?"Manuscript comments":"Commenti al manoscritto")} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();setOpen(false);}}}>
   <header><strong>{view==="highlights"?(en?"Highlights":"Evidenziazioni"):(en?"Comments":"Commenti")} · {view==="highlights"?state.highlights.length:state.comments.length}</strong><button aria-label={en?"Close panel":"Chiudi pannello"} onClick={()=>setOpen(false)}><X size={17}/></button></header>
   {view==="highlights"?<>
    <p className="modal-note">{en?"Highlighted passages in document order. Select one to jump to the text.":"Passaggi evidenziati in ordine nel manoscritto. Clicca su una voce per raggiungere il testo."}</p>
    {!state.highlights.length&&<p>{en?"No highlights yet. Select text and choose Highlight.":"Nessuna evidenziazione. Seleziona il testo e premi Evidenzia."}</p>}
    {state.highlights.map((highlight,index)=><article key={highlight.from}><button className="annotation-quote highlight-quote" onClick={()=>editor.chain().focus().setTextSelection({from:highlight.from,to:highlight.to}).scrollIntoView().run()}><small>{en?"Passage":"Passaggio"} {index+1} →</small>{highlight.quote}</button></article>)}
   </>:<>
   {(composing||editing)&&<div className="annotation-compose"><label htmlFor="manuscript-comment">{editing?(en?"Edit comment":"Modifica commento"):(en?"New comment":"Nuovo commento")}</label><textarea id="manuscript-comment" ref={input} value={draft} maxLength={5000} rows={4} disabled={locked} onChange={e=>setDraft(e.target.value)}/>{error&&<p role="alert">{error}</p>}<button disabled={locked||!draft.trim()} onClick={save}>{en?"Save comment":"Salva commento"}</button><button onClick={()=>{range.current=null;setComposing(false);setEditing(null);setDraft("");setError("");}}>{en?"Cancel":"Annulla"}</button></div>}
   {!state.comments.length&&<p className="modal-note">{en?"Select text, then choose Add comment. Comments are saved with this manuscript; they are not included in exports.":"Seleziona il testo e premi Commenta. I commenti sono salvati con il manoscritto; non sono inclusi negli export."}</p>}
   {state.comments.map(comment=><article id={`comment-card-${comment.id}`} className={selected===comment.id?"is-selected":""} key={comment.id}><button className="annotation-quote" onClick={()=>go(comment)}>{comment.quote}</button><p>{comment.text}</p><footer><button disabled={locked} aria-label={en?"Edit comment":"Modifica commento"} onClick={()=>edit(comment)}><Pencil size={14}/></button><button disabled={locked} aria-label={en?"Delete comment":"Elimina commento"} onClick={()=>remove(comment.id)}><Trash2 size={14}/></button></footer></article>)}
   </>}
  </aside>}
 </div>;
}
