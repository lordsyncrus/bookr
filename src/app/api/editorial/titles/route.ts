import { getSchema } from "@tiptap/core";
import { editorExtensions } from "@/lib/editor/extensions";
import { authorize, boundedJson, failure, json } from "@/lib/editorial/http";
import { readJob, sourceHash } from "@/lib/editorial/store";
import { callEditorialAI, PipelineError } from "@/lib/editorial/openrouter";
import { titleCandidates, titleProposalSchema, resolveTitleProposals } from "@/lib/editorial/title-proposals";
export const runtime="nodejs";
const active=new Set<string>();
export async function POST(request:Request) {
  let owner:string|undefined;let acquired=false;
  try {
    owner=await authorize(request,true);
    if(active.has(owner))throw new Error("BUSY");active.add(owner);acquired=true;
    const data=await boundedJson(request,12_000_000);
    if(typeof data.jobId!=="string"||!["keep","decimal","none"].includes(data.numbering))throw new Error("INVALID_REQUEST");
    const job=await readJob(data.jobId);if(!job||job.owner!==owner)throw new Error("NOT_FOUND");
    const doc=getSchema(editorExtensions()).nodeFromJSON(data.doc);doc.check();
    if(job.state!=="complete"||sourceHash(doc.toJSON())!==job.sourceHash)return json({error:"ANALYSIS_REQUIRED"},409);
    const all=titleCandidates(doc);
    const headings=all.filter(c=>c.level);
    const body=all.filter(c=>!c.level);
    const stride=Math.max(1,Math.ceil(body.length/350));
    const candidates=[...headings,...body.filter((_,i)=>i%stride===0||i===body.length-1)].sort((a,b)=>a.pos-b.pos);
    const input={language:job.locale,numbering:data.numbering,memory:job.memory,chapters:job.chapterNotes,candidates:candidates.map((c,index)=>({targetId:`B${index+1}`,level:c.level,text:c.text.slice(0,200),preview:c.preview,canReplace:!!c.level||c.text.length<=200}))};
    // Bound the entire request instead of silently omitting the end of the book.
    if(Buffer.byteLength(JSON.stringify(input),"utf8")>230_000)throw new Error("FILE_TOO_LARGE");
    const result=await callEditorialAI({name:"title_plan",system:"Propose a coherent table of contents and heading refactor using the full-book reading notes and ordered candidate manuscript blocks sampled across the entire book. These blocks are candidate insertion points, not the entire prose; use the complete reading notes for understanding. Keep the book's language and voice. Return only justified changes. Use replace for existing headings or short standalone title paragraphs (canReplace=true). Use insert to add a NEW heading BEFORE a source paragraph; never rewrite prose as a title. Exclude front matter, colophon and existing table-of-contents entries. Do not move, remove or invent manuscript content. Use sensible levels 1-6 without hierarchy jumps. Numbering keep preserves the existing convention, decimal means consistent hierarchical numbers, none removes heading numbering. Each proposal must use an exact supplied targetId (B1, B2, etc.). Never invent an ID or return numeric text positions. Use each targetId at most once. Return a reason explaining its purpose in the book language. Maximum 250 changes. Keep each reason under 180 characters and each title under 200 characters.",data:input,schema:titleProposalSchema,maxTokens:32000});
    return json({...resolveTitleProposals(result.value,doc,candidates),cost:result.usage.cost,model:result.usage.model,createdAt:Date.now()});
  }catch(error){if(error instanceof PipelineError)return json({error:error.code},502);if(error instanceof Error && error.message==="INVALID_RESPONSE")return json({error:"INVALID_ANCHORS"},502);return failure(error);}finally{if(owner&&acquired)active.delete(owner);}
}
