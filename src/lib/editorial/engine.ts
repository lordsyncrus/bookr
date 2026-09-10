import { profileSchema, validateProfile } from "../editor/book-profile";
import { repeatsDecision, repeatsIssue } from "./convergence";
import type { EditorialJob, ReadingNote, BookFact } from "./types";
import { callEditorialAI, PipelineError, type AiRequest } from "./openrouter";
import { noteSchema, issuesSchema, editsSchema, qualitySchema } from "./schemas";
import { validateNote, validateIssues, validateQuality } from "./validation";
import { validateFindings } from "../review-types";
import { anchorFinding } from "../editor/document";
export type AiCaller = typeof callEditorialAI;
function factGroups(notes:ReadingNote[]):BookFact[][] {
  const subjects=new Map<string,BookFact[]>();
  for(const note of notes)for(const fact of note.facts){const key=fact.subject.toLocaleLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu,"").trim();const list=subjects.get(key)||[];if(!list.some(f=>f.chunkId===fact.chunkId&&f.quote===fact.quote))list.push(fact);subjects.set(key,list);}
  const groups:BookFact[][]=[];
  for(const facts of subjects.values())if(new Set(facts.map(f=>f.chunkId)).size>1){for(let i=0;i<facts.length;i+=30)groups.push([...facts.slice(0,5),...facts.slice(Math.max(0,i-5),i+30)].filter((f,n,a)=>a.indexOf(f)===n));}
  return groups;
}
const compactNote=(n:ReadingNote)=>({chapterIds:n.chapterIds,summary:n.summary,style:n.style,characters:n.characters,timeline:n.timeline,threads:n.threads});
export function totalSteps(job:EditorialJob) {
  const base=job.chunks.length+job.chapters.length+job.chapters.length+1;
  return Math.max(job.done+1,base+job.continuityGroups.length+(job.chunks.length+Math.max(1,Math.ceil(job.findings.length/30))));
}
export async function advanceJob(job:EditorialJob, caller:AiCaller=callEditorialAI, checkpoint:()=>Promise<void>=async()=>{}):Promise<EditorialJob> {
  const language=job.locale==="en"?"English":"Italian";
  const invoke=async(request:AiRequest)=>{
    // Reserve conservatively at routing price caps before the next paid request.
    const upper=(Buffer.byteLength(JSON.stringify(request.data)+request.system,"utf8")+2000)*3/1e6+(request.maxTokens||6000)*15/1e6;
    if(job.costUsd+upper>job.budgetUsd)throw new PipelineError("BUDGET");
    job.costUsd+=upper;await checkpoint();
    const response=await caller(request);job.costUsd+=response.usage.cost-upper;job.inputTokens+=response.usage.input;job.outputTokens+=response.usage.output;job.model=response.usage.model;return response.value;
  };
  const next=(phase:EditorialJob["phase"])=>{job.phase=phase;job.phaseIndex=0;};
  if(job.phase==="reading"){
    const chunk=job.chunks[job.phaseIndex];
    if(!chunk){initializeFacts(job);next("chapters");return job;}
    const reused=job.reusedNotes?.find(n=>n.id===chunk.id);if(reused){job.notes.push(reused);job.phaseIndex++;job.done++;return job;}
    const value=await invoke({name:"reading_note",schema:noteSchema,system:`Read this section as a professional editor. Respond in ${language}. Summarize events/arguments (max 1200 characters), author voice and deliberate stylistic traits (max 700), characters, timeline and open threads. Extract at most 8 concrete continuity facts with a stable subject name and an exact quote and chunkId. Do not infer unprovided events. For nonfiction use concepts, claims and terminology instead of fictional characters. Empty lists are appropriate.`,data:{chunkId:chunk.id,chapterId:chunk.chapterId,text:chunk.text}});
    job.notes.push(validateNote(value,chunk.id,[chunk.chapterId],[chunk]));job.phaseIndex++;
  }else if(job.phase==="chapters"){
    const chapter=job.chapters[job.phaseIndex];
    if(!chapter){job.memoryQueue=[...job.chapterNotes];next("memory");return job;}
    const notes=job.notes.filter(n=>n.chapterIds.includes(chapter.id));
    // Very long chapters are reduced in groups; every source section participates.
    if(notes.length>8){
      const batch=notes.slice(0,8);const value=await invoke({name:"chapter_reduce",schema:noteSchema,system:`Merge these sequential reading notes in ${language}. Preserve all important events, unresolved threads, contradictions and distinctive style. Summary at most 1800 characters. Return no facts; exact evidence is retained separately.`,data:batch.map(compactNote)});
      const reduced=validateNote(value,`reduced-${job.version}`,[chapter.id],[]);
      const position=job.notes.indexOf(batch[0]);job.notes=job.notes.filter(n=>!batch.includes(n));job.notes.splice(position,0,reduced);
      return job;
    }
    const value=await invoke({name:"chapter_summary",schema:noteSchema,system:`Produce a chapter card in ${language}: its role in the book, synopsis, character development, chronology and unresolved threads. Summary at most 1800 characters and style at most 600. Preserve uncertainties. Return no facts; evidence is retained independently.`,data:{chapter,notes:notes.map(compactNote)}});
    job.chapterNotes.push(validateNote(value,chapter.id,[chapter.id],[]));job.phaseIndex++;
  }else if(job.phase==="memory"){
    if(job.memoryQueue.length===1){
      job.memory=job.memoryQueue[0];
      if(job.profileVersion===1&&!job.inferredProfile){
        const value=await invoke({name:"book_profile",schema:profileSchema,maxTokens:4000,system:`Extract an editorial book profile in ${language} from the completed reading memory. Include a short description (max 800 characters), purpose, intended audience, work type, genre, voice/tone, register, narrative point of view, verb tenses, rhythm, vocabulary and consistency rules. Use empty strings when unsupported; do not guess author, publication details or facts. Treat these traits as descriptive guidance, not mandatory corrections. Each other field at most 1200 characters.`,data:{memory:job.memory}});
        job.inferredProfile=validateProfile(value);
      }
      next("structure");return job;
    }
    const batch=job.memoryQueue.slice(0,8);
    const value=await invoke({name:"book_memory",schema:noteSchema,system:`Build a global book memory in ${language} from sequential chapter/group summaries. Preserve narrative/argument arc, characters and relationships, chronology, world rules, promises/open threads, voice and stylistic constraints. Summary at most 6000 characters, style at most 2000. Distinguish ambiguity from confirmed events. Return no facts.`,data:batch.map(compactNote)});
    job.memoryQueue.splice(0,batch.length);
    job.memoryNext.push(validateNote(value,`memory-${job.version}`,[...new Set(batch.flatMap(n=>n.chapterIds))],[]));
    if(!job.memoryQueue.length){job.memoryQueue=job.memoryNext;job.memoryNext=[];}
  }else if(job.phase==="structure"){
    const chapter=job.chapters[job.phaseIndex];
    if(!chapter){next("continuity");return job;}
    if(job.recheck&&!job.structureChapters?.includes(chapter.id)){job.phaseIndex++;job.done++;return job;}
    const value=await invoke({name:"chapter_structure",schema:issuesSchema,system:`Review the focal chapter's role within this complete book in ${language}. Check order, pacing, length balance, redundancies, missing sections, setup/payoff and transitions to neighboring chapters. Propose at most 4 concrete, motivated structural interventions; do not fabricate flaws. Shortness alone is not a defect. Do not request more dialogue, description or background without a specific coherence problem. An empty result is preferable to generic advice. ${job.recheck||job.mode==="final"?"This is a closure check, not another developmental edit. Report only concrete coherence errors supported by exact evidence. Do not propose optional improvements to pace, balance, wording or chapter length. Respect prior rejected/resolved decisions.":""} Cite supplied chapterIds. For structural judgments based on summaries, evidence may be empty. Do not claim a textual contradiction without exact quotes.`,data:{priorDecisions:job.decisionMemory?.issues,focal:chapter,outline:job.chapters.map(c=>({id:c.id,title:c.title,words:c.words})),memory:job.memory,neighbors:job.chapterNotes.slice(Math.max(0,job.phaseIndex-1),job.phaseIndex+2)}});
    const checked=validateIssues(value,job,false);job.issues.push(...checked.issues.filter(issue=>!repeatsIssue(issue,job.decisionMemory)&&(!(job.recheck||job.mode==="final")||(issue.severity==="warning"&&issue.evidence.length>0))));job.discarded+=checked.discarded;job.phaseIndex++;
  }else if(job.phase==="continuity"){
    const group=job.continuityGroups[job.phaseIndex];
    if(!group){next("editing");return job;}
    const value=await invoke({name:"cross_chapter_continuity",schema:issuesSchema,system:`Check these evidenced facts against each other and the global book memory in ${language}. Look for contradictions in character knowledge, age/names/relationships, objects, chronology, terminology and world rules. Distinguish intentional reveals and development from contradictions. Return at most 5 actionable issues, or none. Every issue MUST cite exact source quotes from at least TWO different chapters, with provided chunkIds and chapterIds. Do not manufacture contradictions.`,data:{memory:job.memory,facts:group.map(f=>({...f,chapterId:job.chunks.find(c=>c.id===f.chunkId)?.chapterId})),chapters:job.chapters.map(c=>({id:c.id,title:c.title}))}});
    const checked=validateIssues(value,job,true);for(const issue of checked.issues)if(!repeatsIssue(issue,job.decisionMemory)&&!job.issues.some(old=>old.evidence.length&&JSON.stringify(old.evidence)===JSON.stringify(issue.evidence)))job.issues.push(issue);job.discarded+=checked.discarded;job.phaseIndex++;
  }else if(job.phase==="editing"){
    const chunk=job.chunks[job.phaseIndex];if(!chunk){next("quality");return job;}
    if(job.unchangedChunks?.includes(chunk.id)){job.phaseIndex++;job.done++;return job;}
    const value=await invoke({name:"contextual_edit",schema:editsSchema,system:`${job.recheck||job.mode==="final"?"Perform a closure check for demonstrable spelling, grammar, agreement and punctuation errors only. Do not propose stylistic alternatives, synonym swaps, smoother wording or equivalent phrasing. Return no findings when no concrete error remains. Do not reverse approved changes or repeat rejected proposals.":"Edit the source section for language errors and necessary clarity repairs, never merely equivalent stylistic alternatives."} guided by the book's voice and chapter context. Explain in ${language}; replacements stay in the source language. At most 16 useful proposals; empty if clean. Every original must be exact, unique, non-overlapping text from this section. Avoid rewriting intentional style or changing facts. Obvious grammar agreement, spelling and accent errors are not intentional style unless supported by the source. Each original must stay within ONE paragraph; never combine a heading with the following paragraph. Include enough context for a unique citation.`,data:{profile:{...job.inferredProfile,...job.editorialProfile},priorDecisions:job.decisionMemory?.edits.filter(d=>chunk.text.includes(d.original)||chunk.text.includes(d.suggested)),style:job.memory?.style,chapter:job.chapterNotes.find(n=>n.chapterIds.includes(chunk.chapterId)),text:chunk.text}});
    const checked=validateFindings(value,chunk.text);job.discarded+=checked.discarded;
    for(const f of checked.findings){if(repeatsDecision(f,job.decisionMemory)||((job.recheck||job.mode==="final")&&f.category!=="language")){job.discarded++;continue;}const range=anchorFinding(chunk,f.start,f.end);if(range)job.findings.push({...f,...range,id:crypto.randomUUID(),block:job.phaseIndex+1,status:"pending"});else job.discarded++;}job.phaseIndex++;
  }else if(job.phase==="quality"){
    const batch=job.findings.slice(job.phaseIndex*30,(job.phaseIndex+1)*30);if(!batch.length){job.findings=job.qualityFindings;next("complete");return job;}
    const value=await invoke({name:"editorial_quality",schema:qualitySchema,model:process.env.OPENROUTER_QA_MODEL,system:`Act as a skeptical second-pass editor. Check each proposed correction against the author's style and context. Accept only necessary, defensible edits preserving meaning, register and voice. Reject unsupported rewrites or introduced facts. Reject equivalent stylistic alternatives even if they read smoothly. An empty acceptedIds array is a successful result. ${job.recheck||job.mode==="final"?"This is a closure check: require an identifiable objective error, not an editorial preference.":""} Return acceptedIds from the supplied list only.`,data:{style:job.memory?.style,proposals:batch.map(f=>({id:f.id,original:f.original,suggested:f.suggested,reason:f.reason,context:job.chunks[f.block-1]?.text.slice(Math.max(0,f.start-300),f.end+300)}))}});
    const ids=validateQuality(value,batch.map(f=>f.id));job.qualityFindings.push(...batch.filter(f=>ids.includes(f.id)||job.carriedFindingIds?.includes(f.id)));job.discarded+=batch.filter(f=>!ids.includes(f.id)&&!job.carriedFindingIds?.includes(f.id)).length;job.phaseIndex++;
  }
  if(job.phase==="complete"){job.state="complete";job.total=job.done;}
  else {job.done++;job.total=totalSteps(job);}
  return job;
}
export function initializeFacts(job:EditorialJob) { job.continuityGroups=factGroups(job.notes); }
