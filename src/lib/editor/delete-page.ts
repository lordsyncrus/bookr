import { pageGeometry } from "./page-geometry";
import type { EditorView } from "@tiptap/pm/view";
import { EDITOR_PAGE_HEIGHT } from "./pages";
/** The first character on a page belongs to that page, even across paragraphs. */
export function pageContentRange(view:EditorView,page:number,total:number) {
  const geometry=pageGeometry(view);
  // Explicitly inserted blank pages must remain removable even without text anchors.
  if(geometry){
    let explicit:{from:number;to:number}|null=null;
    const start=geometry.offsets[page-1]??(page-1)*EDITOR_PAGE_HEIGHT,end=geometry.offsets[page]??geometry.paper.offsetHeight;
    view.state.doc.forEach((node,pos)=>{if(node.type.name!=="pageSection")return;const dom=view.nodeDOM(pos);if(!(dom instanceof HTMLElement))return;const top=(dom.getBoundingClientRect().top-geometry.rect.top)/geometry.scale;const bottom=(dom.getBoundingClientRect().bottom-geometry.rect.top)/geometry.scale;
      if(!node.textContent.trim()&&Math.min(end,bottom)-Math.max(start,top)>(end-start)/2)explicit={from:pos,to:pos+node.nodeSize};
    });if(explicit)return explicit;
  }
  if(geometry?.gaps.length&&geometry.gaps.length===geometry.total-1){const from=page<=1?0:geometry.gaps[page-2],to=page>=geometry.total?view.state.doc.content.size:geometry.gaps[page-1];return from!==undefined&&to!==undefined&&from<to?{from,to}:null;}
  const paper=view.dom.closest<HTMLElement>(".manuscript-paper");if(!paper)return null;
  const rect=paper.getBoundingClientRect();const scale=rect.width/Math.max(1,paper.offsetWidth);
  const boundary=(y:number)=>{
    let found:number|null=null;
    view.state.doc.descendants((node,pos)=>{
      if(found!==null)return false;
      if(node.isText) {
        let lo=0,hi=node.nodeSize;
        while(lo<hi){const mid=Math.floor((lo+hi)/2);if(view.coordsAtPos(pos+mid,1).top>=y-0.5)hi=mid;else lo=mid+1;}
        if(lo<node.nodeSize)found=pos+lo;
      }else if(node.isLeaf){const dom=view.nodeDOM(pos);if(dom instanceof HTMLElement&&dom.getBoundingClientRect().top>=y-0.5)found=pos;}
    });
    if(found===null)return view.state.doc.content.size;
    const resolved=view.state.doc.resolve(found);
    return resolved.depth>0&&resolved.parent.isTextblock&&resolved.parentOffset===0?resolved.before():found;
  };
  const from=page<=1?0:boundary(rect.top+(geometry?.offsets[page-1]??(page-1)*EDITOR_PAGE_HEIGHT)*scale);
  const to=page>=total?view.state.doc.content.size:boundary(rect.top+(geometry?.offsets[page]??page*EDITOR_PAGE_HEIGHT)*scale);
  return from<to?{from,to}:null;
}

export function pageTables(doc:import("@tiptap/pm/model").Node,range:{from:number;to:number}) {
  const tables:{from:number;to:number;characters:number}[]=[];
  doc.forEach((node,pos)=>{
    if(node.type.name==="table"&&pos<range.to&&pos+node.nodeSize>range.from)tables.push({from:pos,to:pos+node.nodeSize,characters:node.textContent.length});
  });
  return tables;
}
