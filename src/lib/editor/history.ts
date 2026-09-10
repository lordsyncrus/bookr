import type { ManuscriptProject } from "./types";
export type ManuscriptSnapshot=Pick<ManuscriptProject,"doc"|"typography"|"metadata"|"contents"|"chapterLevel"|"findings"|"titlePlan">;
export type HistoryKind="original"|"baseline"|"text"|"review"|"structure"|"format"|"metadata"|"annotations"|"restore";
// Snapshot v1 is transitional. Production migration requirements: docs/architecture/manuscript-history.md.
export const HISTORY_SCHEMA_VERSION = 1 as const;
export type HistoryEntry={schemaVersion?:typeof HISTORY_SCHEMA_VERSION;id:string;at:number;startedAt:number;kind:HistoryKind;snapshot:ManuscriptSnapshot};
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function snapshot(project:ManuscriptProject):ManuscriptSnapshot {
 const {doc,typography,metadata,contents,chapterLevel,findings,titlePlan}=project;
 return {doc,typography,metadata,contents,chapterLevel,findings,titlePlan};
}
function entry(value:ManuscriptSnapshot,kind:HistoryKind,at:number):HistoryEntry{return {schemaVersion:HISTORY_SCHEMA_VERSION,id:crypto.randomUUID(),at,startedAt:at,kind,snapshot:value};}
export function ensureHistory(project:ManuscriptProject,now=Date.now()):ManuscriptProject {
 if(project.history?.length)return project;
 return {...project,history:[entry({...snapshot(project),doc:project.original,findings:[],titlePlan:undefined,contents:undefined},"original",project.createdAt),entry(snapshot(project),"baseline",now)]};
}
function plain(node:ManuscriptSnapshot["doc"]):string {return node.text??(node.content||[]).map(plain).join(node.type==="doc"?"\n":"");}
export function recordHistory(previous:ManuscriptProject,next:ManuscriptProject,now=Date.now(),forced?:HistoryKind):ManuscriptProject {
 const base=ensureHistory(previous,now),before=snapshot(previous),after=snapshot(next);
 if(equal(before,after)&&!forced)return {...next,history:base.history};
 let kind:HistoryKind=forced||"text";
 if(!forced){
   if(!equal(before.metadata,after.metadata))kind="metadata";
   else if(!equal(before.titlePlan,after.titlePlan)||!equal(before.contents,after.contents)||before.chapterLevel!==after.chapterLevel)kind="structure";
   else if(before.findings.some(f=>after.findings.find(n=>n.id===f.id)?.status!==f.status))kind="review";
   else if(!equal(before.typography,after.typography))kind="format";
   else if(plain(before.doc)===plain(after.doc))kind=JSON.stringify(before.doc).includes('userComment')||JSON.stringify(after.doc).includes('userComment')||JSON.stringify(before.doc).includes('userHighlight')||JSON.stringify(after.doc).includes('userHighlight')?"annotations":"format";
 }
 const history=[...base.history!],last=history.at(-1)!;
 // Coalesce typing bursts, but never merge across a semantic operation or a five-minute session.
 if(kind==="text"&&last.kind==="text"&&now-last.at<30000&&now-last.startedAt<300000)history[history.length-1]={...last,at:now,snapshot:after};
 else history.push(entry(after,kind,now));
 return {...next,history};
}
export function restoreHistory(project:ManuscriptProject,id:string,now=Date.now()):ManuscriptProject {
 const saved=project.history?.find(item=>item.id===id);if(!saved)throw new Error("VERSION_NOT_FOUND");
 const restored={...project,...structuredClone(saved.snapshot),updatedAt:now,review:null,analysis:project.analysis?{...project.analysis,stale:true}:undefined};
 return recordHistory(project,restored,now,"restore");
}
export function historyText(value:ManuscriptSnapshot){return plain(value.doc);}
