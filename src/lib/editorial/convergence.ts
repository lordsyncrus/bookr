import { anchorFinding } from "../editor/document";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorialFinding, ManuscriptProject } from "../editor/types";
import type { BookIssue, EditorialJob } from "./types";
export type ReviewDecision={id:string;status:"approved"|"rejected"|"resolved"|"accepted"};
export type DecisionMemory={edits:Array<Pick<EditorialFinding,"original"|"suggested"|"status">>;issues:Array<Pick<BookIssue,"title"|"evidence"|"status">>};
/** Formatting and annotations cannot reopen an otherwise identical text review. */
export function reviewSignature(doc:PMNode):string {
 const walk=(node:PMNode):unknown=>{
   if(node.isText)return node.text;
   const children:unknown[]=[];node.forEach(child=>{const value=walk(child);if(typeof value==="string"&&typeof children.at(-1)==="string")children[children.length-1]=String(children.at(-1))+value;else children.push(value);});
   return [node.type.name,node.type.name==="heading"?node.attrs.level:null,children];
 };return JSON.stringify(walk(doc));
}
export function rememberDecisions(previous:ManuscriptProject,next:ManuscriptProject):ReviewDecision[]{
 const decisions=new Map<string,ReviewDecision>((previous.reviewDecisions||[]).map(d=>[d.id,d]));
 // Bootstrap old projects from the decisions still available in their history.
 if(!previous.reviewDecisions)for(const entry of previous.history||[])for(const f of entry.snapshot.findings){if(f.status==="approved"||f.status==="rejected")decisions.set(f.id,{id:f.id,status:f.status});}
 for(const item of [...previous.findings,...(previous.analysis?.issues||[]),...next.findings,...(next.analysis?.issues||[])]){
   if(["approved","rejected","resolved","accepted"].includes(item.status))decisions.set(item.id,{id:item.id,status:item.status as ReviewDecision["status"]});
   else if(item.status==="pending")decisions.delete(item.id);
 }
 return [...decisions.values()];
}
const normalized=(text:string)=>text.normalize("NFC").replace(/\s+/g," ").trim();
export function repeatsDecision(f:Pick<EditorialFinding,"original"|"suggested">,memory?:DecisionMemory):boolean {
 return !!memory?.edits.some(old=>
   (normalized(old.original)===normalized(f.original)&&normalized(old.suggested)===normalized(f.suggested))||
   (old.status==="approved"&&normalized(old.suggested)===normalized(f.original)&&normalized(old.original)===normalized(f.suggested)));
}
export function repeatsIssue(issue:BookIssue,memory?:DecisionMemory):boolean {
 return !!memory?.issues.some(old=>["rejected","resolved"].includes(old.status)&&((issue.evidence.length>0&&old.evidence.length===issue.evidence.length&&old.evidence.every(e=>issue.evidence.some(n=>normalized(n.quote)===normalized(e.quote))))||(!issue.evidence.length&&!old.evidence.length&&normalized(old.title)===normalized(issue.title))));
}
export function applyConvergence(job:EditorialJob,previous:EditorialJob,decisions:ReviewDecision[]) {
 job.recheck=true;
 const known=new Map(decisions.map(d=>[d.id,d.status]));
 job.decisionMemory={edits:previous.findings.filter(f=>["approved","rejected"].includes(known.get(f.id)||"")).map(f=>({original:f.original,suggested:f.suggested,status:known.get(f.id) as EditorialFinding["status"]})),issues:previous.issues.filter(i=>known.has(i.id)).map(i=>({title:i.title,evidence:i.evidence,status:known.get(i.id) as BookIssue["status"]}))};
 // An unchanged chunk needs no further line-editing. Global continuity is still checked.
 job.unchangedChunks=(previous.mode==="full"||previous.convergenceVersion===1)?job.chunks.filter(chunk=>previous.chunks.some(old=>old.text===chunk.text)).map(c=>c.id):[];
 const changedChapters=new Set(job.chunks.filter(c=>!job.unchangedChunks!.includes(c.id)).map(c=>c.chapterId));
 // Deletions and title/order changes can affect structure even without new prose.
 const structureChanged=JSON.stringify(previous.chapters.map(c=>c.title))!==JSON.stringify(job.chapters.map(c=>c.title))||previous.chunks.some(c=>!job.chunks.some(n=>n.text===c.text));
 job.structureChapters=structureChanged?job.chapters.map(c=>c.id):job.chapters.filter((c,i)=>[c,job.chapters[i-1],job.chapters[i+1]].some(n=>n&&changedChapters.has(n.id))).map(c=>c.id);
 // Keep still-pending proposals on unchanged passages; do not silently discard them.
 for(const f of previous.findings){
   if(known.has(f.id))continue;
   const old=previous.chunks[f.block-1];if(!old)continue;
   const matches=job.chunks.filter(c=>c.text===old.text);if(matches.length!==1)continue;
   const chunk=matches[0],range=anchorFinding(chunk,f.start,f.end);
   if(range){const carried={...f,...range,block:job.chunks.indexOf(chunk)+1,status:"pending" as const};job.findings.push(carried);(job.carriedFindingIds||=[]).push(carried.id);}
 }
 for(const issue of previous.issues){
   const decision=known.get(issue.id);if(decision==="rejected"||decision==="resolved")continue;
   const mappedChapters=issue.chapterIds.map(id=>{const old=previous.chapters.find(c=>c.id===id);return old&&job.chapters.find(c=>c.id===id&&c.title===old.title);});
   if(mappedChapters.some(c=>!c||job.structureChapters!.includes(c.id)))continue;
   const evidence=issue.evidence.flatMap(e=>{const old=previous.chunks.find(c=>c.id===e.chunkId);const next=old&&job.chunks.find(c=>c.text===old.text);return next?[{...e,chunkId:next.id}]:[];});
   if(evidence.length!==issue.evidence.length)continue;
   job.issues.push({...issue,evidence,status:decision==="accepted"?"accepted":"pending"});
 }
 job.reusedNotes=job.chunks.flatMap(chunk=>{
   const old=previous.chunks.find(c=>c.text===chunk.text);const note=old&&previous.notes.find(n=>n.id===old.id);
   return note?[{...note,id:chunk.id,chapterIds:[chunk.chapterId],facts:note.facts.map(f=>({...f,chunkId:chunk.id}))}]:[];
 });
}

/** Preserve explicit decisions when replacing an AI report, including cached results. */
export function mergeReviewFindings(previous:EditorialFinding[],incoming:EditorialFinding[]):EditorialFinding[]{
 const decided=previous.filter(f=>f.status==="approved"||f.status==="rejected");
 const ids=new Set(decided.map(f=>f.id));
 return [...decided,...incoming.filter(f=>!ids.has(f.id))];
}
