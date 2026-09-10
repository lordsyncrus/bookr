import type { Node as PMNode } from "@tiptap/pm/model";
export type ContentsMatch = { title: string; sourcePos: number; level: number; targets: {pos:number;title:string;level:number|null}[] };
export type DetectedContents = { entries: ContentsMatch[]; range: {from:number;to:number}|null; explicit: boolean };
const normalize = (value: string) => value.normalize("NFKC").replace(/^\s*(?:(?:Capitolo|CAPITOLO|capitolo)\s+)?(?:\d+(?:\.\d+)*|[IVXLCDM]+)[.)\s:–—-]+/,"").toLocaleLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ").replace(/[.:;]+$/,"").trim();
function entry(text:string) {
  const title=/^capitolo\s+(?:\d+|[ivxlcdm]+)$/i.test(text.trim())?text.trim():text.replace(/(?:\t+|\s*[.·…]{2,}\s*|\s+)(?:\d+(?:\s*[-–]\s*\d+)?|[ivxlcdm]+)\s*$/i,"").trim();
  if(!title || title.length>150 || title.split(/\s+/).length>24 || /^[\d\s.,–—-]+$/.test(title) || /^[ivxlcdm]+$/i.test(title))return null;
  const numbered=title.match(/^\s*(\d+(?:\.\d+)+)[.)\s]/);
  return {title,key:normalize(title),level:Math.min(6,numbered?numbered[1].split(".").length:1)};
}
export function detectContents(doc:PMNode):DetectedContents {
  const blocks:{text:string;pos:number;level:number|null;topFrom:number;topTo:number}[]=[];
  doc.forEach((top,topFrom)=>{
    const add=(node:PMNode,pos:number)=>{if(node.isTextblock){blocks.push({text:node.textContent.trim(),pos,level:node.type.name==="heading"?node.attrs.level:null,topFrom,topTo:topFrom+top.nodeSize});return false;}return true;};
    if(!add(top,topFrom))return;top.descendants((node,pos)=>add(node,topFrom+1+pos));
  });
  const marker=blocks.findIndex((block,index)=>index<60&&/^(?:indice(?:\s+generale)?|sommario|table of contents|contents)\s*[:.]?$/i.test(block.text));
  const start=marker>=0?marker+1:0;
  const seen=new Set<string>();let end=Math.min(blocks.length,start+240);let confirmedEnd=false;
  for(let i=start;i<end;i++){
    const current=entry(blocks[i].text);if(!current)continue;
    if(seen.size>=2&&seen.has(current.key)&&blocks.slice(i+1,i+4).some(block=>block.text.length>150)) {end=i;confirmedEnd=true;break;}
    seen.add(current.key);
  }
  const entries:ContentsMatch[]=[];const keys=new Set<string>();
  for(let i=start;i<end;i++){
    const candidate=entry(blocks[i].text);if(!candidate||keys.has(candidate.key)||candidate.key.length<3)continue;
    const targets=blocks.slice(confirmedEnd?end:i+1).filter(block=>block.text.length<=180&&normalize(block.text)===candidate.key).map(block=>({pos:block.pos,title:block.text,level:block.level}));
    if(!targets.length)continue;
    // Without a labelled contents section, require dotted leaders or explicit page references.
    if(marker<0 && candidate.title===blocks[i].text)continue;
    keys.add(candidate.key);entries.push({title:candidate.title,sourcePos:blocks[i].pos,level:candidate.level,targets});
  }
  if(entries.length<2)return {entries:[],range:null,explicit:marker>=0};
  const range=marker>=0&&confirmedEnd&&blocks[marker].pos===blocks[marker].topFrom&&blocks[end].pos===blocks[end].topFrom
    ? {from:blocks[marker].topFrom,to:blocks[end].topFrom}:null;
  return {entries,range,explicit:marker>=0};
}
