import type { Node as PMNode } from "@tiptap/pm/model";
import type { TitleProposal } from "../editor/title-plan";
export function titleCandidates(doc:PMNode) {
  const candidates:{pos:number;text:string;level:number;preview:string}[]=[];
  doc.forEach((node,pos)=>{
    if((node.type.name!=="heading"&&node.type.name!=="paragraph")||!node.textContent.trim())return;
    candidates.push({pos,text:node.textContent,level:node.type.name==="heading"?node.attrs.level:0,preview:doc.textBetween(pos,Math.min(doc.content.size,pos+node.nodeSize+300)," ").slice(0,500)});
  });return candidates;
}
export function validateTitleProposals(value:unknown,doc:PMNode):TitleProposal[] {
  const candidates=titleCandidates(doc);const seen=new Set<number>();
  if(!value||typeof value!=="object"||!Array.isArray((value as {items?:unknown}).items))throw new Error("INVALID_RESPONSE");
  const items=(value as {items:unknown[]}).items;if(items.length>250)throw new Error("INVALID_RESPONSE");
  return items.map((item,index)=>{
    if(!item||typeof item!=="object")throw new Error("INVALID_RESPONSE");
    const p=item as Record<string,unknown>;const target=candidates.find(c=>c.pos===p.pos);
    if(!target||seen.has(target.pos)||typeof p.title!=="string"||!p.title.trim()||p.title.length>200||/[\r\n]/.test(p.title)||!Number.isInteger(p.level)||Number(p.level)<1||Number(p.level)>6||typeof p.reason!=="string"||p.reason.length>1200||!["replace","insert"].includes(String(p.action))||(p.action==="replace"&&!target.level&&target.text.length>200))throw new Error("INVALID_RESPONSE");
    seen.add(target.pos);
    return {id:`title-${index}`,pos:target.pos,original:target.text,originalLevel:target.level,title:p.title.trim(),level:Number(p.level),reason:p.reason,action:p.action as "replace"|"insert",status:"pending" as const};
  }).filter(p=>p.action==="insert"||p.title!==p.original||p.level!==p.originalLevel).sort((a,b)=>a.pos-b.pos);
}
export const titleProposalSchema={type:"object",additionalProperties:false,required:["items"],properties:{items:{type:"array",items:{type:"object",additionalProperties:false,required:["targetId","title","level","action","reason"],properties:{targetId:{type:"string"},title:{type:"string"},level:{type:"integer"},action:{type:"string",enum:["replace","insert"]},reason:{type:"string"}}}}}};

/** Resolve only IDs actually sent to the model. A bad item must not discard valid siblings. */
export function resolveTitleProposals(value:unknown,doc:PMNode,candidates:ReturnType<typeof titleCandidates>) {
  if(!value||typeof value!=="object"||!Array.isArray((value as {items?:unknown}).items))throw new Error("INVALID_RESPONSE");
  const raw=(value as {items:unknown[]}).items;
  if(raw.length>250)throw new Error("INVALID_RESPONSE");
  const items:TitleProposal[]=[];const seen=new Set<number>();let discarded=0;
  for(const item of raw) {
    if(!item||typeof item!=="object"){discarded++;continue;}
    const p=item as Record<string,unknown>;
    const match=typeof p.targetId==="string"?/^B([1-9]\d*)$/.exec(p.targetId):null;
    const target=match?candidates[Number(match[1])-1]:undefined;
    if(!target||seen.has(target.pos)){discarded++;continue;}
    try {
      const validated=validateTitleProposals({items:[{...p,pos:target.pos}]},doc);
      seen.add(target.pos);
      for(const proposal of validated)items.push({...proposal,id:`title-${items.length}`});
    }catch{discarded++;}
  }
  if(raw.length&&discarded===raw.length)throw new Error("INVALID_RESPONSE");
  return {items:items.sort((a,b)=>a.pos-b.pos),discarded};
}
