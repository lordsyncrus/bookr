import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
export const PAGE_GAP=24;
/** Page furniture must never split a heading, paragraph, table, or its title badge. */
export function safePageBoundary(doc:import("@tiptap/pm/model").Node,pos:number):number {
 const resolved=doc.resolve(pos);let boundary=resolved.depth?resolved.before(1):pos;
 const at=doc.resolve(boundary),previous=at.nodeBefore;
 if(previous?.type.name==="heading")boundary-=previous.nodeSize;
 return boundary;
}
export const pageGapKey=new PluginKey<DecorationSet>("bookr-page-gaps");
export const PageGaps=Extension.create({name:"pageGaps",addProseMirrorPlugins(){return [new Plugin({key:pageGapKey,state:{init:()=>DecorationSet.empty,apply(tr,old){const positions=tr.getMeta(pageGapKey) as number[]|undefined;if(positions)return DecorationSet.create(tr.doc,positions.map(pos=>Decoration.widget(pos,()=>{const span=document.createElement("div");span.className="editor-page-gap";span.setAttribute("aria-hidden","true");span.dataset.pageGap="true";span.contentEditable="false";return span;},{side:-1,key:`gap-${pos}`})));return old.map(tr.mapping,tr.doc);}},props:{decorations:state=>pageGapKey.getState(state)}})];}});
