"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useLocale } from "next-intl";
import { DeletePageButton } from "./delete-page-button";
import { pageContentRange } from "@/lib/editor/delete-page";
import { insertPage } from "@/lib/editor/insert-page";
import { pageGeometry } from "@/lib/editor/page-geometry";
import { EDITOR_PAGE_HEIGHT } from "@/lib/editor/pages";
export function PageActions({editor,total,offsets,locked}:{editor:Editor;total:number;offsets:number[];locked:boolean}){
 const en=useLocale()==="en",[error,setError]=useState("");
 const [active,setActive]=useState<number|null>(null),[position,setPosition]=useState<number|null>(null);
 useEffect(()=>{
   const paper=editor.view.dom.closest<HTMLElement>(".manuscript-paper"),canvas=paper?.closest<HTMLElement>(".document-canvas");if(!paper||!canvas)return;
   const refresh=(page:number|null)=>{if(page===null){setPosition(null);return;}const g=pageGeometry(editor.view);if(!g)return;const start=g.offsets[page-1]??(page-1)*EDITOR_PAGE_HEIGHT,end=g.offsets[page]??g.paper.offsetHeight,top=(g.viewport.top-g.rect.top)/g.scale,bottom=top+canvas.clientHeight/g.scale;setPosition(bottom>start&&top<end?Math.min(end-85,Math.max(start+44,top+20)):null);};
   const click=(event:PointerEvent)=>{const target=event.target as HTMLElement;if(target.closest(".page-actions-layer,.studio-modal"))return;if(!paper.contains(target)){setActive(null);setPosition(null);return;}const g=pageGeometry(editor.view);if(!g)return;const y=(event.clientY-g.rect.top)/g.scale;const page=Math.max(1,g.offsets.filter(offset=>offset<=y).length);setActive(page);refresh(page);};
   const scroll=()=>refresh(active);document.addEventListener("pointerdown",click);canvas.addEventListener("scroll",scroll,{passive:true});refresh(active);
   return()=>{document.removeEventListener("pointerdown",click);canvas.removeEventListener("scroll",scroll);};
 },[editor,active,offsets]);
 function add(page:number){if(locked)return;const range=pageContentRange(editor.view,page,total);if(!range){setError(en?"Page boundaries are updating. Try again.":"I confini della pagina si stanno aggiornando. Riprova.");return;}try{const {tr,caret}=insertPage(editor.state,range.to);editor.view.dispatch(tr);editor.chain().focus().setTextSelection(caret).scrollIntoView().run();setError("");}catch{setError(en?"This page ends inside a table or another structured block. Add a page after the complete block.":"Questa pagina termina dentro una tabella o un altro blocco strutturato. Aggiungi la pagina dopo il blocco completo.");}}
 return <div className="page-actions-layer">{Array.from({length:total},(_,i)=>active===i+1&&position!==null?<div className="page-side-actions" key={i} style={{top:position}} role="group" aria-label={en?`Page ${i+1} actions`:`Azioni pagina ${i+1}`}><small>{en?"Page":"Pagina"} {i+1}</small><button type="button" disabled={locked} onClick={()=>add(i+1)} aria-label={en?`Add a page after page ${i+1}`:`Aggiungi pagina dopo pagina ${i+1}`} title={en?"Add page after this":"Aggiungi pagina dopo questa"}><Plus size={16}/></button><DeletePageButton editor={editor} current={i+1} total={total} locked={locked}/></div>:null)}{error&&<div role="alert" className="page-action-error"><p>{error}</p><button onClick={()=>setError("")}>{en?"Close":"Chiudi"}</button></div>}</div>;
}
