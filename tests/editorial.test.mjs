import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp,readFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { Schema } from "@tiptap/pm/model";
const require=createRequire(import.meta.url);
const cache=new Map();
function load(file){
  file=path.resolve(file);if(cache.has(file))return cache.get(file);
  const compiled=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const result={exports:{}};cache.set(file,result.exports);
  new Function("require","module","exports",compiled)((id)=>id.startsWith(".")?load(path.resolve(path.dirname(file),`${id}.ts`)):require(id),result,result.exports);
  return result.exports;
}
const {advanceJob}=load("src/lib/editorial/engine.ts");
const {bookChapters,chapterChunks}=load("src/lib/editorial/chapters.ts");
const {saveJob,readJob}=load("src/lib/editorial/store.ts");
const schema=new Schema({nodes:{doc:{content:"block+"},heading:{content:"text*",group:"block",attrs:{level:{default:1}}},paragraph:{content:"text*",group:"block"},text:{group:"inline"}}});
function fixture(){
  const doc=schema.node("doc",null,[schema.node("heading",{level:1},schema.text("Capitolo uno")),schema.node("paragraph",null,schema.text("Una frase sintetica con errore.")),schema.node("heading",{level:1},schema.text("Capitolo due")),schema.node("paragraph",null,schema.text("Una seconda frase sintetica."))]);
  const chapters=bookChapters(doc,1),chunks=chapterChunks(doc,chapters);
  return {jobId:crypto.randomUUID(),owner:"synthetic-owner",sourceHash:"hash",doc:doc.toJSON(),locale:"it",version:1,state:"running",phase:"reading",done:0,total:1,costUsd:0,inputTokens:0,outputTokens:0,budgetUsd:5,error:null,stale:false,mode:"full",chapters,chunks,chapterNotes:[],memory:null,issues:[],findings:[],discarded:0,model:"",createdAt:Date.now(),updatedAt:Date.now(),notes:[],memoryQueue:[],memoryNext:[],phaseIndex:0,continuityGroups:[],qualityFindings:[]};
}
const note={summary:"Sintesi di prova",style:"Sobrio",characters:[],timeline:[],threads:[],facts:[]};
const usage={cost:0.001,input:100,output:50,model:"synthetic"};
test("full pipeline resumes encrypted checkpoints and checks every source section before completing",async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),"bookr-job-test-"));process.env.BOOKR_JOB_DIR=dir;
 try{
  let job=fixture();const calls=[];
  const caller=async r=>{calls.push(r.name);let value=note;if(r.name==="contextual_edit")value={findings:r.data.text.includes("errore")?[{original:"con errore",suggested:"senza errore",reason:"Synthetic",category:"language"}]:[]};else if(r.name==="editorial_quality")value={acceptedIds:r.data.proposals.map(p=>p.id)};else if(r.name.includes("structure")||r.name.includes("continuity"))value={issues:[]};return {value,usage};};
  for(let n=0;n<100&&job.state!=="complete";n++){await advanceJob(job,caller,()=>saveJob(job));job.version++;await saveJob(job);job=await readJob(job.jobId);}
  assert.equal(job.state,"complete");assert.equal(job.chapterNotes.length,2);assert.equal(job.findings.length,1);
  assert.equal(calls.filter(c=>c==="reading_note").length,job.chunks.length);
  assert.equal(calls.filter(c=>c==="contextual_edit").length,job.chunks.length);
  assert.ok(calls.indexOf("book_memory")<calls.indexOf("contextual_edit"));
  assert.equal(job.findings[0].original,"con errore");
  assert.ok(Math.abs(job.costUsd-calls.length*0.001)<1e-8);
  const sealed=await readFile(path.join(dir,`${job.jobId}.sealed`));assert.ok(!sealed.includes(Buffer.from("frase sintetica")));
 }finally{delete process.env.BOOKR_JOB_DIR;await rm(dir,{recursive:true,force:true});}
});
test("budget stops before a paid call and failed memory reduction retains its inputs",async()=>{
 const job=fixture();job.budgetUsd=0.001;let called=false;
 await assert.rejects(advanceJob(job,async()=>{called=true;return {value:note,usage};}),/BUDGET/);assert.equal(called,false);
 job.budgetUsd=5;job.phase="memory";job.memoryQueue=[{...note,id:"one",chapterIds:["chapter-1"]},{...note,id:"two",chapterIds:["chapter-2"]}];
 await assert.rejects(advanceJob(job,async()=>{throw new Error("Synthetic failure");}),/Synthetic failure/);
 assert.equal(job.memoryQueue.length,2);assert.equal(job.memoryNext.length,0);assert.ok(job.costUsd>0);
});
test("chapter chunks retain exact whole-document positions and include the last chapter",()=>{
 const job=fixture();const doc=schema.nodeFromJSON(job.doc);
 for(const chunk of job.chunks)for(let i=0;i<chunk.positions.length;i++)if(chunk.positions[i]>=0)assert.equal(doc.textBetween(chunk.positions[i],chunk.positions[i]+1),chunk.text[i]);
 assert.ok(job.chunks.at(-1).text.includes("seconda frase"));
});

test("detects contents entries inside tables with a separate page-number column",()=>{
 const {getSchema}=require("@tiptap/core");const {editorExtensions}=load("src/lib/editor/extensions.ts");const {detectContents}=load("src/lib/editor/detect-contents.ts");
 const p=text=>({type:"paragraph",content:[{type:"text",text}]});
 const doc=getSchema(editorExtensions()).nodeFromJSON({type:"doc",content:[p("Indice"),{type:"table",content:[{type:"tableRow",content:[{type:"tableCell",content:[p("Introduzione"),p("Tecniche"),p("Conclusione")]},{type:"tableCell",content:[p("3"),p("7"),p("12")]}]}]},p("Introduzione"),p("Paragrafo sintetico sufficientemente lungo per separare l’indice dal corpo del manoscritto. ".repeat(3)),p("Tecniche"),p("Testo tecnico sintetico"),p("Conclusione"),p("Fine della prova")]});
 const result=detectContents(doc);assert.equal(result.entries.length,3);assert.ok(result.entries.every(e=>e.targets.length===1));assert.equal(doc.nodeAt(result.range.to).textContent,"Introduzione");
});

test("title plans validate exact anchors, preserve prose and marks, and undo bulk changes",()=>{
 const {getSchema}=require("@tiptap/core");const {editorExtensions}=load("src/lib/editor/extensions.ts");
 const schema=getSchema(editorExtensions());const {EditorState}=require("@tiptap/pm/state");const {history,undo,redo}=require("@tiptap/pm/history");
 const {validateTitleProposals}=load("src/lib/editorial/title-proposals.ts");const {applyTitlePlan,remapTitlePlan}=load("src/lib/editor/title-plan.ts");
 const doc=schema.nodeFromJSON({type:"doc",content:[{type:"heading",attrs:{level:1},content:[{type:"text",text:"Vecchio",marks:[{type:"bold"}]}]},{type:"paragraph",content:[{type:"text",text:"Testo da preservare."}]}]});
 const pos=doc.firstChild.nodeSize;
 const items=validateTitleProposals({items:[{pos:0,title:"Nuovo",level:2,action:"replace",reason:"Gerarchia"},{pos,title:"Una nuova sezione",level:1,action:"insert",reason:"Passaggio tematico"}]},doc);
 assert.throws(()=>validateTitleProposals({items:[{pos:999,title:"X",level:1,action:"insert",reason:"X"}]},doc));
 assert.throws(()=>validateTitleProposals({items:[{pos:0,title:"X",level:7,action:"replace",reason:"X"}]},doc));
 let state=EditorState.create({schema,doc,plugins:[history()]});let plan={items};
 function dispatch(tr){plan=remapTitlePlan(plan,tr);state=state.apply(tr);}
 dispatch(applyTitlePlan(state,items));assert.equal(state.doc.lastChild.textContent,"Testo da preservare.");assert.equal(state.doc.firstChild.firstChild.marks[0].type.name,"bold");assert.ok(plan.items.every(p=>p.status==="approved"));
 undo(state,dispatch);assert.deepEqual(state.doc.toJSON(),doc.toJSON());assert.ok(plan.items.every(p=>p.status==="pending"));
 redo(state,dispatch);assert.ok(plan.items.every(p=>p.status==="approved"));
});

test("pending title anchors follow earlier approvals and refuse changed passages",()=>{
 const {EditorState}=require("@tiptap/pm/state");const {applyTitlePlan,remapTitlePlan}=load("src/lib/editor/title-plan.ts");const {validateTitleProposals}=load("src/lib/editorial/title-proposals.ts");
 const doc=schema.nodeFromJSON(fixture().doc);const second=doc.child(0).nodeSize+doc.child(1).nodeSize;
 let state=EditorState.create({schema,doc});let plan={items:validateTitleProposals({items:[{pos:0,title:"Un titolo più lungo",level:1,action:"replace",reason:"X"},{pos:second,title:"Due",level:1,action:"replace",reason:"X"}]},doc)};
 let tr=applyTitlePlan(state,[plan.items[0]]);plan=remapTitlePlan(plan,tr);state=state.apply(tr);
 assert.equal(plan.items[1].status,"pending");assert.notEqual(plan.items[1].pos,second);
 tr=state.tr.insertText("cambiato",plan.items[1].pos+1);plan=remapTitlePlan(plan,tr);state=state.apply(tr);assert.equal(plan.items[1].status,"stale");assert.equal(applyTitlePlan(state,[plan.items[1]]).docChanged,false);
});

test("page deletion selects page boundaries within prose, supports zoom and last page",()=>{
 const {pageContentRange}=load("src/lib/editor/delete-page.ts");const {EDITOR_PAGE_HEIGHT}=load("src/lib/editor/pages.ts");
 const text="a".repeat(90);const doc=schema.node("doc",null,[schema.node("paragraph",null,schema.text(text))]);
 const paper={offsetWidth:800,getBoundingClientRect:()=>({top:100,width:600})};
 const view={state:{doc},dom:{closest:()=>paper},coordsAtPos:pos=>({top:100+Math.floor((pos-1)/30)*EDITOR_PAGE_HEIGHT*.75+50})};
 assert.deepEqual(pageContentRange(view,1,3),{from:0,to:31});
 assert.deepEqual(pageContentRange(view,2,3),{from:31,to:61});
 assert.deepEqual(pageContentRange(view,3,3),{from:61,to:doc.content.size});
 const {EditorState}=require("@tiptap/pm/state");const state=EditorState.create({schema,doc});const range=pageContentRange(view,2,3);const changed=state.apply(state.tr.delete(range.from,range.to));assert.equal(changed.doc.textContent.length,60);
});

test("AI errors distinguish truncated output, timeout and unavailable credit without exposing provider content",async()=>{
 const {callEditorialAI}=load("src/lib/editorial/openrouter.ts");
 const originalFetch=globalThis.fetch;const originalKey=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY="synthetic";
 const request={name:"synthetic",system:"Synthetic only",data:{},schema:{type:"object"}};
 try {
  globalThis.fetch=async()=>Response.json({choices:[{finish_reason:"length",message:{content:"sensitive output"}}]});
  await assert.rejects(callEditorialAI(request),error=>error.code==="OUTPUT_LIMIT"&&!error.message.includes("sensitive"));
  globalThis.fetch=async()=>{throw new DOMException("timeout","TimeoutError");};
  await assert.rejects(callEditorialAI(request),error=>error.code==="TIMEOUT");
  globalThis.fetch=async()=>new Response("sensitive provider body",{status:402});
  await assert.rejects(callEditorialAI(request),error=>error.code==="CREDITS"&&!error.message.includes("sensitive"));
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=originalKey;}
});

test("title response schema avoids provider state explosion while local validation retains limits",()=>{
 const {titleProposalSchema,validateTitleProposals}=load("src/lib/editorial/title-proposals.ts");
 assert.equal(titleProposalSchema.properties.items.maxItems,undefined);
 assert.deepEqual(titleProposalSchema.properties.items.items.properties.level,{type:"integer"});
 const doc=schema.nodeFromJSON(fixture().doc);
 assert.throws(()=>validateTitleProposals({items:Array.from({length:251},()=>({pos:0,title:"Synthetic",level:1,action:"replace",reason:"Synthetic"}))},doc));
 assert.throws(()=>validateTitleProposals({items:[{pos:0,title:"Synthetic",level:7,action:"replace",reason:"Synthetic"}]},doc));
});

test("one invalid title proposal does not discard valid siblings; IDs cannot target unsupplied blocks",()=>{
 const {titleCandidates,resolveTitleProposals}=load("src/lib/editorial/title-proposals.ts");
 const doc=schema.nodeFromJSON(fixture().doc);const candidates=titleCandidates(doc).filter(c=>c.level);
 const item={targetId:"B1",title:"Titolo rivisto",level:1,action:"replace",reason:"Synthetic"};
 const result=resolveTitleProposals({items:[item,{...item,targetId:"B999"},{...item,targetId:"B2",level:9},{...item,targetId:"B2",title:"Secondo titolo"},{...item}]},doc,candidates);
 assert.equal(result.items.length,2);assert.equal(result.discarded,3);
 assert.equal(result.items[1].pos,candidates[1].pos);
 assert.notEqual(result.items[0].id,result.items[1].id);
 assert.throws(()=>resolveTitleProposals({items:[{...item,targetId:"B999"}]},doc,candidates));
 assert.deepEqual(resolveTitleProposals({items:[]},doc,candidates),{items:[],discarded:0});
});

test("page removal offers an explicit whole-table range without removing the following chapter",()=>{
 const {getSchema}=require("@tiptap/core");const {editorExtensions}=load("src/lib/editor/extensions.ts");const {pageTables}=load("src/lib/editor/delete-page.ts");const {EditorState}=require("@tiptap/pm/state");const {history,undo}=require("@tiptap/pm/history");
 const schema=getSchema(editorExtensions());const p=text=>({type:"paragraph",content:[{type:"text",text}]});
 const doc=schema.nodeFromJSON({type:"doc",content:[{type:"table",content:[{type:"tableRow",content:[{type:"tableCell",content:[p("Vecchio indice sintetico")]},{type:"tableCell",content:[p("1 2 3")]}]}]},{type:"heading",attrs:{level:1},content:[{type:"text",text:"Capitolo conservato"}]},p("Corpo conservato")]});
 const tables=pageTables(doc,{from:0,to:4});assert.equal(tables.length,1);assert.equal(tables[0].to,doc.firstChild.nodeSize);
 let state=EditorState.create({schema,doc,plugins:[history()]});state=state.apply(state.tr.delete(tables[0].from,tables[0].to));assert.equal(state.doc.firstChild.textContent,"Capitolo conservato");assert.equal(state.doc.lastChild.textContent,"Corpo conservato");undo(state,tr=>{state=state.apply(tr);});assert.deepEqual(state.doc.toJSON(),doc.toJSON());
});

test("library autosave preserves trash and restore decisions and cannot resurrect permanently deleted books",()=>{
 const {mergeLibrary}=load("src/lib/editor/library-lifecycle.ts");
 const book={id:"one",updatedAt:1,doc:{type:"doc"},name:"Synthetic"};
 const trashed={...book,updatedAt:2,trashedAt:2};
 assert.equal(mergeLibrary([trashed],[{...book,updatedAt:3}],[])[0].trashedAt,2);
 const restored={...book,updatedAt:4};
 assert.equal(mergeLibrary([restored],[{...trashed,updatedAt:5}],[])[0].trashedAt,undefined);
 assert.deepEqual(mergeLibrary([],[{...book,updatedAt:100}], [book.id]),[]);
 assert.equal(mergeLibrary([{...book,id:"two"}],[book],[]).length,2);
 assert.equal(mergeLibrary([{...book,updatedAt:10}],[book],[])[0].updatedAt,10);
});

test("library verification distinguishes stale analysis, unresolved changes and structure-only checks",()=>{
 const {libraryStatus}=load("src/lib/editor/library-status.ts");const base={findings:[],review:null};
 assert.equal(libraryStatus(base).state,"unverified");
 const checked={...base,analysis:{state:"complete",mode:"final",issues:[],stale:false}};
 assert.equal(libraryStatus(checked).state,"checked");assert.equal(libraryStatus(checked).language,false);assert.equal(libraryStatus(checked).structure,true);
 assert.equal(libraryStatus({...checked,analysis:{...checked.analysis,stale:true}}).state,"outdated");
 const pending={...checked,findings:[{status:"approved"},{status:"pending"}],titlePlan:{items:[{status:"pending"}]}};
 assert.equal(libraryStatus(pending).pending,2);assert.equal(libraryStatus(pending).approved,1);assert.equal(libraryStatus(pending).state,"review");
 assert.equal(libraryStatus({...checked,analysis:{...checked.analysis,state:"error"}}).state,"error");
});

test("library progress never marks stale or undecided books as fully complete",()=>{
 const {libraryProgress}=load("src/lib/editor/library-status.ts");
 const base={findings:[],review:null};assert.equal(libraryProgress(base).percent,0);
 const complete={...base,analysis:{state:"complete",mode:"full",stale:false,issues:[]}};
 assert.equal(libraryProgress(complete).percent,100);
 assert.equal(libraryProgress({...complete,analysis:{...complete.analysis,stale:true}}).percent,75);
 const pending={...complete,findings:[{status:"approved"},{status:"pending"}]};
 assert.equal(libraryProgress(pending).percent,62);assert.equal(libraryProgress(pending).remaining,1);
});
