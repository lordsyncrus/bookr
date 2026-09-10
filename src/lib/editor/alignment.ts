import type { EditorState } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
/** Preserve explicit cell alignment when formatting the document body. */
export function alignParagraphs(state:EditorState,alignment:"left"|"justify",scope:"body"|"tables"="body"){
 const tr=closeHistory(state.tr);
 state.doc.descendants((node,pos)=>{
  if(node.type.name!=="paragraph")return;
  const resolved=state.doc.resolve(pos);
  let inTable=false;
  for(let depth=resolved.depth;depth>0;depth--)if(["table","tableCell","tableHeader"].includes(resolved.node(depth).type.name)){inTable=true;break;}
  if((scope==="tables")!==inTable||node.attrs.textAlign===alignment)return;
  tr.setNodeMarkup(pos,undefined,{...node.attrs,textAlign:alignment});
 });return tr;
}
