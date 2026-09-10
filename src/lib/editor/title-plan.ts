import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
export type TitleProposal = { id:string; pos:number; original:string; originalLevel:number; title:string; level:number; action:"replace"|"insert"; reason:string; status:"pending"|"approved"|"rejected"|"stale" };
export type TitlePlan = { items:TitleProposal[]; cost:number; discarded?:number; model:string; createdAt:number };
export function titleTarget(doc:PMNode,p:TitleProposal) {
  if(p.pos<0||p.pos>=doc.content.size)return false;
  const node=doc.nodeAt(p.pos);
  return !!node && node.textContent===p.original && (p.originalLevel ? node.type.name==="heading"&&node.attrs.level===p.originalLevel : node.type.name==="paragraph");
}
export function applyTitlePlan(state:EditorState,items:TitleProposal[]) {
  const tr=closeHistory(state.tr);const applied:string[]=[];const seen=new Set<number>();
  for(const p of [...items].filter(p=>p.status==="pending").sort((a,b)=>b.pos-a.pos)) {
    if(seen.has(p.pos)||!titleTarget(state.doc,p))continue;
    seen.add(p.pos);const node=state.doc.nodeAt(p.pos)!;
    if(p.action==="insert")tr.insert(p.pos,state.schema.nodes.heading.create({level:p.level},state.schema.text(p.title)));
    else {
      tr.setNodeMarkup(p.pos,state.schema.nodes.heading,{...node.attrs,level:p.level});
      if(p.title!==node.textContent)tr.replaceWith(p.pos+1,p.pos+1+node.content.size,state.schema.text(p.title,node.firstChild?.marks));
    }
    applied.push(p.id);
  }
  return tr.setMeta("bookr-title-approve",applied);
}
export function remapTitlePlan(plan:TitlePlan|undefined,tr:Transaction):TitlePlan|undefined {
  if(!plan)return plan;
  const applied=tr.getMeta("bookr-title-approve") as string[]|undefined;
  return {...plan,items:plan.items.map(p=>{
    let pos=tr.mapping.map(p.pos,applied?.includes(p.id)&&p.action==="insert"?-1:1);
    if(p.action==="insert") {
      const left=tr.mapping.map(p.pos,-1);const candidate=left>=0&&left<tr.doc.content.size?tr.doc.nodeAt(left):null;
      if(candidate?.type.name==="heading"&&candidate.textContent===p.title&&candidate.attrs.level===p.level)pos=left;
    }
    const next={...p,pos};const node=pos>=0&&pos<tr.doc.content.size?tr.doc.nodeAt(pos):null;
    const matches=node?.type.name==="heading"&&node.textContent===p.title&&node.attrs.level===p.level;
    if(p.status==="rejected")return next;
    if(matches&&(p.status==="approved"||applied?.includes(p.id)||p.status==="pending"))return {...next,status:"approved"};
    if(titleTarget(tr.doc,next))return {...next,status:"pending"};
    return {...next,status:"stale"};
  })};
}
