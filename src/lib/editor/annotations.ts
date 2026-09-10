import { Mark } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
export const UserHighlight=Mark.create({name:"userHighlight",inclusive:false,parseHTML:()=>[{tag:"mark[data-user-highlight]"}],renderHTML:()=>["mark",{"data-user-highlight":"true",class:"user-highlight"},0]});
export const UserComment=Mark.create({
  name:"userComment",inclusive:false,
  addAttributes(){return {id:{default:null},text:{default:""},createdAt:{default:null}};},
  parseHTML:()=>[],
  renderHTML({mark}){return ["span",{"data-comment-id":mark.attrs.id,class:"user-comment-anchor"},0];},
});
export type ManuscriptComment={id:string;text:string;createdAt:string;from:number;to:number;quote:string};
export function documentComments(doc:PMNode):ManuscriptComment[]{
  const result=new Map<string,ManuscriptComment>();
  doc.descendants((node,pos)=>{if(!node.isText)return;const mark=node.marks.find(m=>m.type.name==="userComment");if(!mark?.attrs.id)return;
    const previous=result.get(mark.attrs.id);
    if(previous){previous.quote+=(previous.to===pos?"":" … ")+node.textContent;previous.to=pos+node.nodeSize;}
    else result.set(mark.attrs.id,{id:mark.attrs.id,text:mark.attrs.text,createdAt:mark.attrs.createdAt,from:pos,to:pos+node.nodeSize,quote:node.textContent});
  });return [...result.values()];
}

export type ManuscriptHighlight={from:number;to:number;quote:string};
/** Merge adjacent text runs (bold/italic/comments) without merging separate passages. */
export function documentHighlights(doc:PMNode):ManuscriptHighlight[]{
 const highlights:ManuscriptHighlight[]=[];
 doc.descendants((node,pos)=>{
   if(!node.isText||!node.marks.some(mark=>mark.type.name==="userHighlight"))return;
   const previous=highlights.at(-1);
   if(previous&&previous.to===pos){previous.to=pos+node.nodeSize;previous.quote+=node.textContent;}
   else highlights.push({from:pos,to:pos+node.nodeSize,quote:node.textContent});
 });
 return highlights;
}
