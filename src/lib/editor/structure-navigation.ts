import type { Node as PMNode } from "@tiptap/pm/model";
import type { BookChapter } from "../editorial/types";
const headingIndex=new WeakMap<PMNode,Map<string,{pos:number;title:string}[]>>();
export function chapterReferences(doc: PMNode, chapter: BookChapter, stale: boolean): {pos:number;title:string}[] {
  const original = chapter.headingPos ?? chapter.from;
  if (!stale) {
    const node = doc.nodeAt(original);
    if (node && (chapter.headingPos === null || node.textContent === chapter.title)) return [{pos:original,title:chapter.title}];
  }
  let index=headingIndex.get(doc);
  if(!index){
    index=new Map();
    doc.descendants((node,pos)=>{
      if(node.type.name!=="heading")return;
      const title=node.textContent, key=title.trim();
      index!.set(key,[...(index!.get(key)||[]),{pos,title}]);
    });
    headingIndex.set(doc,index);
  }
  return index.get(chapter.title.trim()) || [];
}

export function remapChapterReferences(chapters:BookChapter[],tr:import("@tiptap/pm/state").Transaction,stale:boolean) {
  return chapters.map(chapter=>{
    const targets=chapterReferences(tr.before,chapter,stale);
    if(targets.length!==1)return chapter;
    const mapped=tr.mapping.mapResult(targets[0].pos,1);
    if(mapped.deleted)return chapter;
    const node=mapped.pos<tr.doc.content.size?tr.doc.nodeAt(mapped.pos):null;
    if(node?.type.name!=="heading")return chapter;
    return {...chapter,headingPos:mapped.pos,from:mapped.pos,to:tr.mapping.map(chapter.to,-1),title:node.textContent};
  });
}
