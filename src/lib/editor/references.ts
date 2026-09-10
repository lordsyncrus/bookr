import { detectAttributions, type DiscursiveAttribution } from "./attributions";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
export type ReferenceItem = { id:string; pos:number; text:string; attribution?:DiscursiveAttribution; kind:"attribution"|"bibliography"|"citation"|"quote"|"source"|"note"; key?:string; targets:number[] };
export type ReferenceIssue = { id:string; pos:number; related:number[]; code:"attribution"|"unmatched"|"duplicate"|"incomplete"|"mixed"|"ambiguous"; text:string };
export type ReferenceReport = { items:ReferenceItem[]; issues:ReferenceIssue[]; bibliographyFound:boolean; draft:string[] };
const normalize=(s:string)=>s.toLocaleLowerCase().normalize("NFD").replace(/\p{M}/gu,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const yearPattern=/\b(?:18|19|20)\d{2}[a-z]?\b/iu;
const sourcePattern=/(?:https?:\/\/[^\s<>]+|\b10\.\d{4,9}\/[-._;()/:\p{L}\p{N}]+)/giu;
const cleanSource=(s:string)=>s.replace(/[.,;:!?]+$/u,""); // Keep DOI parentheses intact.
/** Conservative local detection. No external verification and no inferred bibliographic facts. */
export function detectReferences(doc:ProseMirrorNode):ReferenceReport {
  const items:ReferenceItem[]=[],issues:ReferenceIssue[]=[];
  let bibliographyFound=false,section:"bibliography"|"note"|null=null,sectionLevel=6;
  const add=(kind:ReferenceItem["kind"],pos:number,text:string,key?:string)=>items.push({id:`${kind}-${pos}-${items.length}`,kind,pos,text,key,targets:[]});
  doc.descendants((node,pos)=>{
    if(!node.isTextblock)return;
    const text=node.textContent.trim();if(!text)return false;
    const marker=normalize(text);
    if(/^(fonti da completare|sources to complete|bibliografia|riferimenti bibliografici|fonti bibliografiche|bibliography|references|works cited|sitografia|fonti|sources)$/.test(marker)){
      bibliographyFound=true;section="bibliography";sectionLevel=node.type.name==="heading"?Number(node.attrs.level):6;return false;
    }
    if(/^(note|note al testo|note bibliografiche|notes|endnotes)$/.test(marker)){section="note";sectionLevel=node.type.name==="heading"?Number(node.attrs.level):6;return false;}
    if(node.type.name==="heading"&&Number(node.attrs.level)<=sectionLevel)section=null;
    if(section&&node.type.name==="heading")return false;
    if(section){
      const number=text.match(/^\s*\[?(\d{1,3})[\].)]\s*/)?.[1];
      add(section,pos,text,number?`n:${number}`:undefined);return false;
    }
    for(const match of text.matchAll(/\[(\d{1,3}(?:\s*[,;–-]\s*\d{1,3})*)\]/g)){
      const raw=match[1];const keys=raw.split(/[,;]/).flatMap(part=>{const range=part.trim().match(/^(\d+)\s*[–-]\s*(\d+)$/);if(!range)return [part.trim()];const a=+range[1],b=+range[2];return b>=a&&b-a<30?Array.from({length:b-a+1},(_,i)=>String(a+i)):[];});
      for(const key of keys)add("citation",pos,match[0],`n:${key}`);
    }
    for(const match of text.matchAll(/\(([\p{L}][\p{L}\p{M}'’ .,&;-]{1,100}?),?\s+((?:18|19|20)\d{2}[a-z]?)(?:\s*[,;:]\s*[^)]{0,35})?\)/gu))add("citation",pos,match[0],`a:${normalize(match[1].split(/\s+(?:et al|e|and)\b|[,&;]/u)[0])}:${match[2].toLowerCase()}`);
    for(const match of text.matchAll(/\b([\p{Lu}][\p{L}\p{M}'’\-]+(?:\s+et al\.)?)\s+\(((?:18|19|20)\d{2}[a-z]?)\)/gu))add("citation",pos,match[0],`a:${normalize(match[1].replace(/\s+et al\.$/,""))}:${match[2].toLowerCase()}`);
    for(const match of text.matchAll(sourcePattern))add("source",pos,cleanSource(match[0]),normalize(cleanSource(match[0])));
    node.descendants(child=>{for(const mark of child.marks){if(mark.type.name!=="link"||typeof mark.attrs.href!=="string"||!/^https?:\/\//i.test(mark.attrs.href))continue;const url=cleanSource(mark.attrs.href);if(!items.some(item=>item.kind==="source"&&item.pos===pos&&item.text===url))add("source",pos,url,normalize(url));}});
    for(const attribution of detectAttributions(text))items.push({id:`attribution-${pos}-${items.length}`,kind:"attribution",pos,text,attribution,targets:[]});
    const parent=doc.resolve(pos).parent;
    if(parent.type.name==="blockquote"||/[«“][^»”]{15,}[»”]/u.test(text))add("quote",pos,text);
    return false;
  });
  const bibliography=items.filter(i=>i.kind==="bibliography"),notes=items.filter(i=>i.kind==="note");
  for(const item of items.filter(i=>i.kind==="citation")){
    const matches=item.key?.startsWith("n:")?[...bibliography,...notes].filter(b=>b.key===item.key):bibliography.filter(b=>{
      const [,name,year]=item.key!.split(":");return normalize(b.text).includes(name)&&b.text.toLowerCase().includes(year);
    });
    item.targets=matches.map(m=>m.pos);
    if(matches.length>1)issues.push({id:`ambiguous-${item.id}`,code:"ambiguous",pos:item.pos,related:item.targets,text:item.text});
    if(!matches.length)issues.push({id:`unmatched-${item.id}`,code:"unmatched",pos:item.pos,related:[],text:item.text});
  }
  for(const item of items.filter(i=>i.kind==="attribution")){
    const attribution=item.attribution!;
    item.targets=bibliography.filter(b=>normalize(b.text).includes(normalize(attribution.author))&&(!attribution.work||normalize(b.text).includes(normalize(attribution.work)))).map(b=>b.pos);
    if(!attribution.locator)issues.push({id:`document-${item.id}`,code:"attribution",pos:item.pos,related:item.targets,text:item.text});
  }
  const seen=new Map<string,ReferenceItem>();
  for(const item of bibliography){
    const key=normalize(item.text.replace(/^\s*\[?\d+[\].)]\s*/,""));const previous=seen.get(key);
    if(previous)issues.push({id:`duplicate-${item.id}`,code:"duplicate",pos:item.pos,related:[previous.pos],text:item.text});else seen.set(key,item);
    if(!yearPattern.test(item.text)&&!/(https?:\/\/|\b10\.\d{4,9}\/|s\.?\s*d\.?\b|n\.?\s*d\.?\b)/i.test(item.text))issues.push({id:`incomplete-${item.id}`,code:"incomplete",pos:item.pos,related:[],text:item.text});
  }
  const numbered=bibliography.filter(i=>i.key?.startsWith("n:"));
  if(numbered.length&&numbered.length<bibliography.length)issues.push({id:"mixed",code:"mixed",pos:bibliography[0].pos,related:[],text:""});
  const draft=bibliographyFound?[]:[...new Set(items.filter(i=>i.kind==="attribution"||i.kind==="source"||(i.kind==="citation"&&i.key?.startsWith("a:"))).map(i=>i.attribution?[i.attribution.author,i.attribution.work].filter(Boolean).join(" — "):i.text))];
  return {items,issues,bibliographyFound,draft};
}
