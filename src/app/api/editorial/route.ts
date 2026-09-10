import { validateProfile } from "@/lib/editor/book-profile";
import { applyConvergence, reviewSignature, type ReviewDecision } from "@/lib/editorial/convergence";
import { EDITORIAL_BUDGET_USD } from "@/lib/editorial/limits";
import { getSchema } from "@tiptap/core";
import { editorExtensions } from "@/lib/editor/extensions";
import { bookChapters, chapterChunks } from "@/lib/editorial/chapters";
import { readJob, saveJob, setControl, sourceHash, jobIds } from "@/lib/editorial/store";
import { authorize, boundedJson, failure, json } from "@/lib/editorial/http";
import { publicResult, startEditorialWorker } from "@/lib/editorial/worker";
import type { EditorialJob } from "@/lib/editorial/types";
export const runtime="nodejs";
const creating=new Set<string>();
export async function POST(request:Request) {
  let owner:string|undefined;let acquired=false;
  try {
    owner=await authorize(request,true);
    if(creating.has(owner))throw new Error("BUSY");creating.add(owner);acquired=true;
    const data=await boundedJson(request,12_000_000);
    if(typeof data.projectId!=="string"||data.projectId.length>100||typeof data.jobId!=="string"|| !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(data.jobId)||!Number.isInteger(data.chapterLevel)||data.chapterLevel<1||data.chapterLevel>6)throw new Error("INVALID_REQUEST");
    const existing=await readJob(data.jobId);
    if(existing){if(existing.owner!==owner)throw new Error("NOT_FOUND");return json(publicResult(existing));}
    const doc=getSchema(editorExtensions()).nodeFromJSON(data.doc);doc.check();
    const editorialProfile=validateProfile(data.editorialProfile);
    if(!doc.textContent.trim()||doc.textContent.length>2_000_000)throw new Error("INVALID_REQUEST");
    const completed:EditorialJob[]=[];
    for(const id of await jobIds()) {
      const other=await readJob(id);
      if(other?.owner===owner&&other.projectId===data.projectId&&other.state==="complete")completed.push(other);
      if(other?.owner===owner&&!["complete","cancelled"].includes(other.state)) {
        if(other.projectId===data.projectId) return json({...publicResult(other),stale:other.sourceHash!==sourceHash(doc.toJSON())});
        throw new Error("BUSY");
      }
    }
    completed.sort((a,b)=>b.updatedAt-a.updatedAt);
    const schema=getSchema(editorExtensions()),signature=reviewSignature(doc);
    const reusable=completed.find(old=>((data.mode==="final"&&old.convergenceVersion===1)||old.mode==="full")&&reviewSignature(schema.nodeFromJSON(old.doc))===signature);
    if(reusable)return json({...publicResult(reusable),reused:true});
    if(!process.env.OPENROUTER_API_KEY)throw new Error("NOT_CONFIGURED");
    if(data.decisions!==undefined&&(!Array.isArray(data.decisions)||data.decisions.length>30000))throw new Error("INVALID_REQUEST");
    const decisions:ReviewDecision[]=(data.decisions||[]).filter((d:ReviewDecision)=>d&&typeof d.id==="string"&&d.id.length<100&&["approved","rejected","resolved","accepted"].includes(d.status));
    const locale=data.locale==="en"?"en":"it";
    const chapters=bookChapters(doc,data.chapterLevel,locale);
    if(chapters.length>250)throw new Error("FILE_TOO_LARGE");
    const chunks=chapterChunks(doc,chapters);
    const now=Date.now();
    const job:EditorialJob={profileVersion:1,editorialProfile,convergenceVersion:1,jobId:data.jobId,owner,projectId:data.projectId,doc:doc.toJSON(),sourceHash:sourceHash(doc.toJSON()),locale,version:1,state:"queued",phase:"reading",done:0,total:chunks.length*2+chapters.length*2+2,costUsd:0,inputTokens:0,outputTokens:0,budgetUsd:EDITORIAL_BUDGET_USD,error:null,stale:false,mode:data.mode==="final"?"final":"full",chapters,chunks,chapterNotes:[],memory:null,issues:[],findings:[],discarded:0,model:"",createdAt:now,updatedAt:now,notes:[],memoryQueue:[],memoryNext:[],phaseIndex:0,continuityGroups:[],qualityFindings:[]};
    const previous=completed.find(old=>old.mode==="full")||(job.mode==="final"?completed[0]:undefined);
    if(previous){
      applyConvergence(job,previous,decisions);
      const known=new Map(decisions.map(d=>[d.id,d.status]));
      for(const old of completed.filter(j=>j.jobId!==previous.jobId)){
        job.decisionMemory!.edits.push(...old.findings.filter(f=>["approved","rejected"].includes(known.get(f.id)||"")).map(f=>({original:f.original,suggested:f.suggested,status:known.get(f.id) as typeof f.status})));
        job.decisionMemory!.issues.push(...old.issues.filter(i=>known.has(i.id)).map(i=>({title:i.title,evidence:i.evidence,status:known.get(i.id) as typeof i.status})));
      }
    }
    if(job.decisionMemory){
      job.decisionMemory.edits=[...new Map(job.decisionMemory.edits.map(d=>[JSON.stringify([d.original,d.suggested,d.status]),d])).values()];
      job.decisionMemory.issues=[...new Map(job.decisionMemory.issues.map(d=>[JSON.stringify([d.title,d.evidence,d.status]),d])).values()];
    }
    await setControl(job.jobId,{desired:"run",budgetUsd:job.budgetUsd});await saveJob(job);startEditorialWorker();return json(publicResult(job),201);
  } catch(error){return failure(error);}finally{if(owner&&acquired)creating.delete(owner);}
}
