import { Node } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
export const PageSection=Node.create({name:"pageSection",group:"block",content:"paragraph+",defining:true,isolating:true,parseHTML:()=>[{tag:"section[data-manuscript-page]"}],renderHTML:()=>["section",{"data-manuscript-page":"true",class:"manuscript-added-page"},0]});
/** Insert an editable page at a document boundary, splitting a body paragraph if needed. */
export function insertPage(state:EditorState,pos:number){
 const tr=closeHistory(state.tr),resolved=tr.doc.resolve(pos);
 if(resolved.depth>1)throw new Error("NESTED_PAGE_BOUNDARY");
 let at=pos;
 if(resolved.depth===1){
   if(!resolved.parent.isTextblock)throw new Error("NESTED_PAGE_BOUNDARY");
   if(resolved.parentOffset===0)at=resolved.before();
   else if(resolved.parentOffset===resolved.parent.content.size)at=resolved.after();
   else {tr.split(pos);at=pos+1;}
 }
 const page=state.schema.nodes.pageSection.create(null,state.schema.nodes.paragraph.create());
 tr.insert(at,page);return {tr,caret:at+2};
}
