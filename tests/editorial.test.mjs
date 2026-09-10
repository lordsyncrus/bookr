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
 const view={state:{doc},dom:{closest:()=>paper,querySelectorAll:()=>[],offsetHeight:3*EDITOR_PAGE_HEIGHT},coordsAtPos:pos=>({top:100+Math.floor((pos-1)/30)*EDITOR_PAGE_HEIGHT*.75+50})};
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

const {detectReferences}=load("src/lib/editor/references.ts");
function referenceDoc(lines){return schema.node("doc",null,lines.map(([heading,text])=>schema.node(heading?"heading":"paragraph",heading?{level:1}:null,schema.text(text))));}
test("references link numeric and author-year citations without inventing missing sources",()=>{
 const doc=referenceDoc([[0,"Si veda [1] e (Rossi, 2020). Anche [9]."],[1,"Bibliografia"],[0,"[1] Rossi, M. (2020). Manuale sintetico."],[1,"Appendice"],[0,"Altre informazioni."]]);
 const report=detectReferences(doc);
 assert.equal(report.items.filter(i=>i.kind==="bibliography").length,1);
 assert.equal(report.items.filter(i=>i.kind==="citation"&&i.targets.length===1).length,2);
 assert.equal(report.issues.filter(i=>i.code==="unmatched").length,1);
 assert.equal(report.draft.length,0);
});
test("bibliography detects duplicates and preserves incomplete data for user review",()=>{
 const report=detectReferences(referenceDoc([[1,"Bibliografia"],[0,"[1] Rossi. Libro. 2020."],[0,"[2] Rossi. Libro. 2020."],[0,"Bianchi. Titolo senza data."]]));
 assert.equal(report.issues.filter(i=>i.code==="duplicate").length,1);
 assert.equal(report.issues.filter(i=>i.code==="incomplete").length,1);
 assert.equal(report.issues.filter(i=>i.code==="mixed").length,1);
});
test("sources draft includes only observed references and cannot duplicate an inserted sources section",()=>{
 const report=detectReferences(referenceDoc([[0,"Fonte https://example.org/test. DOI 10.1234/demo. Si veda (Rossi, 2020)."]]));
 assert.deepEqual(new Set(report.draft),new Set(["https://example.org/test","10.1234/demo","(Rossi, 2020)"]));
 const saved=detectReferences(referenceDoc([[0,"Fonte https://example.org/test."],[1,"Fonti da completare"],...report.draft.map(text=>[0,text])]));
 assert.equal(saved.bibliographyFound,true);assert.equal(saved.draft.length,0);
});
test("numeric notes are linked and ordinary dates are not treated as citations",()=>{
 const report=detectReferences(referenceDoc([[0,"Nel 2020 si discusse il tema [1]."],[1,"Note"],[0,"1. Chiarimento del testo."]]));
 assert.equal(report.items.filter(i=>i.kind==="citation").length,1);
 assert.equal(report.items.find(i=>i.kind==="citation").targets.length,1);
 assert.equal(report.issues.length,0);
});

test("ambiguous reference targets are exposed instead of silently choosing an entry",()=>{
 const report=detectReferences(referenceDoc([[0,"Si veda [1]."],[1,"Bibliografia"],[0,"[1] Rossi. Primo volume. 2020."],[0,"[1] Bianchi. Secondo volume. 2021."]]));
 const issue=report.issues.find(i=>i.code==="ambiguous");assert.ok(issue);assert.equal(issue.related.length,2);
});

test("comments and highlights persist, follow edits and support undo without changing prose",()=>{
 const {getSchema}=require("@tiptap/core"),{editorExtensions}=load("src/lib/editor/extensions.ts"),{documentComments}=load("src/lib/editor/annotations.ts");
 const {EditorState}=require("@tiptap/pm/state"),{history,undo}=require("@tiptap/pm/history");
 const s=getSchema(editorExtensions());let state=EditorState.create({schema:s,doc:s.nodeFromJSON({type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Una frase sintetica."}]}]}),plugins:[history()]});
 state=state.apply(state.tr.addMark(5,10,s.marks.userComment.create({id:"test-comment",text:"Controllare questo punto",createdAt:"2026-09-10"})).addMark(5,10,s.marks.userHighlight.create()));
 assert.equal(state.doc.textContent,"Una frase sintetica.");
 const restored=s.nodeFromJSON(JSON.parse(JSON.stringify(state.doc.toJSON())));assert.equal(documentComments(restored)[0].text,"Controllare questo punto");
 state=state.apply(state.tr.insertText("Nuova ",1));assert.equal(documentComments(state.doc)[0].from,11);
 undo(state,tr=>{state=state.apply(tr);});assert.equal(documentComments(state.doc)[0].from,5);
});

test("highlight index merges formatted runs and stays in document order after edits",()=>{
 const {getSchema}=require("@tiptap/core"),{editorExtensions}=load("src/lib/editor/extensions.ts"),{documentHighlights}=load("src/lib/editor/annotations.ts");
 const {EditorState}=require("@tiptap/pm/state");const s=getSchema(editorExtensions());
 const highlighted=(text,bold=false)=>({type:"text",text,marks:[{type:"userHighlight"},...(bold?[{type:"bold"}]:[])]});
 const doc=s.nodeFromJSON({type:"doc",content:[{type:"paragraph",content:[highlighted("Primo "),highlighted("passaggio",true),{type:"text",text:" separazione "},highlighted("secondo")]},{type:"paragraph",content:[highlighted("terzo")]}]});
 assert.deepEqual(documentHighlights(doc).map(h=>h.quote),["Primo passaggio","secondo","terzo"]);
 let state=EditorState.create({schema:s,doc});const first=documentHighlights(doc)[0];state=state.apply(state.tr.removeMark(first.from,first.to,s.marks.userHighlight));
 assert.deepEqual(documentHighlights(state.doc).map(h=>h.quote),["secondo","terzo"]);
 state=state.apply(state.tr.insertText("Intro ",1));assert.equal(documentHighlights(state.doc)[0].from,documentHighlights(doc)[1].from+6);
});

const {ensureHistory,recordHistory,restoreHistory}=load("src/lib/editor/history.ts");
function historyProject(){const doc={type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Testo iniziale"}]}]};return {version:1,id:"history-test",name:"Synthetic",doc,original:structuredClone(doc),createdAt:1,updatedAt:1,typography:{font:"Georgia",size:12,lineHeight:1.6,paragraphSpacing:8,margin:25},findings:[],review:null,importNotice:false};}
function changedText(project,text){return {...project,doc:{type:"doc",content:[{type:"paragraph",content:[{type:"text",text}]}]}};}
test("history groups typing but preserves semantic operations and previous snapshots",()=>{
 let project=ensureHistory(historyProject(),10);assert.equal(project.history.length,2);
 project=recordHistory(project,changedText(project,"Primo"),1000);project=recordHistory(project,changedText(project,"Secondo"),2000);assert.equal(project.history.length,3);assert.equal(project.history.at(-1).startedAt,1000);
 project=recordHistory(project,{...project,typography:{...project.typography,size:14}},3000);assert.equal(project.history.at(-1).kind,"format");assert.equal(project.history.length,4);
 project=recordHistory(project,changedText(project,"Terzo"),4000);assert.equal(project.history.length,5);assert.equal(project.history[1].snapshot.doc.content[0].content[0].text,"Testo iniziale");
 assert.equal(recordHistory(project,{...project,updatedAt:5000},5000).history.length,5);
});
test("history restores as a new version while retaining current content and invalidating AI analysis",()=>{
 let project=ensureHistory(historyProject(),10);project=recordHistory(project,changedText(project,"Testo nuovo"),1000);const before=JSON.stringify(project.history.at(-1).snapshot);
 project={...project,analysis:{state:"complete",stale:false}};const restored=restoreHistory(project,project.history[1].id,2000);
 assert.equal(restored.doc.content[0].content[0].text,"Testo iniziale");assert.equal(restored.history.at(-1).kind,"restore");assert.equal(JSON.stringify(restored.history.at(-2).snapshot),before);assert.equal(restored.analysis.stale,true);
 assert.equal(JSON.parse(JSON.stringify(restored)).history.length,4);assert.throws(()=>restoreHistory(project,"missing"),/VERSION_NOT_FOUND/);
});

const {reviewSignature,rememberDecisions,repeatsDecision,applyConvergence,mergeReviewFindings}=load("src/lib/editorial/convergence.ts");
test("review signature ignores annotations and typography but detects text and chapter changes",()=>{
 const {getSchema}=require("@tiptap/core"),{editorExtensions}=load("src/lib/editor/extensions.ts");const s=getSchema(editorExtensions());
 const base={type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Testo invariato"}]}]};
 const formatted={type:"doc",content:[{type:"paragraph",attrs:{textAlign:"justify"},content:[{type:"text",text:"Testo ",marks:[{type:"bold"}]},{type:"text",text:"invariato",marks:[{type:"userComment",attrs:{id:"c",text:"Nota"}}]}]}]};
 assert.equal(reviewSignature(s.nodeFromJSON(base)),reviewSignature(s.nodeFromJSON(formatted)));
 assert.notEqual(reviewSignature(s.nodeFromJSON(base)),reviewSignature(s.nodeFromJSON({type:"doc",content:[{type:"heading",attrs:{level:1},content:base.content[0].content}]})));
});
test("decision memory survives replacing reports, respects reopening, and blocks reversals",()=>{
 let project=historyProject();project.findings=[{id:"one",original:"prima",suggested:"dopo",status:"approved"}];
 const decisions=rememberDecisions(project,{...project,findings:[]});assert.deepEqual(decisions,[{id:"one",status:"approved"}]);
 assert.equal(rememberDecisions({...project,reviewDecisions:decisions},{...project,findings:[{...project.findings[0],status:"pending"}]}).length,0);
 assert.equal(repeatsDecision({original:"dopo",suggested:"prima"},{edits:project.findings,issues:[]}),true);
 assert.equal(mergeReviewFindings(project.findings,[{...project.findings[0],status:"pending"}])[0].status,"approved");
});
test("closure checks drop stylistic churn, rejected proposals and approved reversals",async()=>{
 const job=fixture();job.phase="editing";job.recheck=true;job.decisionMemory={edits:[{original:"La",suggested:"Una",status:"approved"},{original:"frase",suggested:"proposizione",status:"rejected"}],issues:[]};
 await advanceJob(job,async()=>({value:{findings:[{original:"Una",suggested:"La",category:"language",reason:"Reverse"},{original:"frase",suggested:"proposizione",category:"language",reason:"Repeat"},{original:"sintetica",suggested:"breve",category:"style",reason:"Equivalent"},{original:"errore",suggested:"errori",category:"language",reason:"Synthetic concrete agreement issue"}]},usage}));
 assert.equal(job.findings.length,1);assert.equal(job.findings[0].original,"errore");assert.equal(job.discarded,3);
});
test("incremental review skips unchanged prose and retains pending decisions",async()=>{
 const previous=fixture();previous.state="complete";previous.notes=previous.chunks.map(chunk=>({...note,id:chunk.id,chapterIds:[chunk.chapterId]}));
 const first=previous.chunks[0],start=first.text.indexOf("errore");previous.findings=[{id:"pending-old",original:"errore",suggested:"errori",reason:"Synthetic",category:"language",start,end:start+6,from:first.positions[start],to:first.positions[start+5]+1,block:1,status:"pending"}];
 const next=fixture();applyConvergence(next,previous,[]);assert.equal(next.unchangedChunks.length,2);assert.equal(next.findings[0].id,"pending-old");
 next.phase="editing";next.phaseIndex=0;await advanceJob(next,async()=>{throw new Error("Unchanged text must not request another edit");});assert.equal(next.phaseIndex,1);
 next.phase="reading";next.phaseIndex=0;await advanceJob(next,async()=>{throw new Error("Unchanged reading note should be reused");});assert.equal(next.notes.length,1);
});
test("a clean final check completes with zero suggestions",async()=>{
 const job=fixture();job.mode="final";const calls=[];
 const caller=async request=>{calls.push(request.name);return {value:request.name==="contextual_edit"?{findings:[]}:request.name==="editorial_quality"?{acceptedIds:[]}:request.name.includes("structure")||request.name.includes("continuity")?{issues:[]}:note,usage};};
 for(let n=0;n<100&&job.state!=="complete";n++)await advanceJob(job,caller);
 assert.equal(job.state,"complete");assert.equal(job.findings.length,0);assert.equal(job.issues.length,0);assert.equal(calls.filter(n=>n==="contextual_edit").length,2);
});

const {detectAttributions}=load("src/lib/editor/attributions.ts");
test("discursive source attribution extracts author and work without checking the claim",()=>{
 const text="Già Marco il Giovane, nella sua Historia Regionale, descriveva le usanze della città.";
 const results=detectAttributions(text);assert.equal(results.length,1);assert.equal(results[0].author,"Marco il Giovane");assert.equal(results[0].work,"Historia Regionale");
 const report=detectReferences(referenceDoc([[0,text]]));assert.equal(report.items.filter(i=>i.kind==="attribution").length,1);assert.equal(report.issues[0].code,"attribution");assert.deepEqual(report.draft,["Marco il Giovane — Historia Regionale"]);
});
test("discursive references support narrative verbs, according-to and linked bibliography",()=>{
 assert.equal(detectAttributions("Secondo Maria Rossi, il risultato è diverso.")[0].author,"Maria Rossi");
 assert.equal(detectAttributions("Maria Rossi scrive nel suo Manuale delle prove che il metodo è utile.")[0].work,"Manuale delle prove");
 assert.equal(detectAttributions("Alex Green, in his Regional History, described the customs.")[0].work,"Regional History");
 const report=detectReferences(referenceDoc([[0,"Maria Rossi, nella sua Storia Locale, descriveva le abitudini."],[1,"Bibliografia"],[0,"Maria Rossi. Storia Locale. 2020."]]));
 assert.equal(report.items.find(i=>i.kind==="attribution").targets.length,1);assert.equal(report.issues.some(i=>i.code==="attribution"),true);
});
test("ordinary locations and named people without attribution are not source references",()=>{
 assert.equal(detectAttributions("Marco il Giovane, nella sua casa, preparava la cena.").length,0);
 assert.equal(detectAttributions("Maria Rossi visitò il museo e poi tornò a casa.").length,0);
});

test("body alignment excludes nested table paragraphs and table repair is undoable",()=>{
 const {getSchema}=require("@tiptap/core"),{editorExtensions}=load("src/lib/editor/extensions.ts"),{alignParagraphs}=load("src/lib/editor/alignment.ts");
 const {EditorState}=require("@tiptap/pm/state"),{history,undo}=require("@tiptap/pm/history");const s=getSchema(editorExtensions());
 const p=(text,alignment)=>({type:"paragraph",attrs:{textAlign:alignment},content:[{type:"text",text}]});
 const doc=s.nodeFromJSON({type:"doc",content:[p("Corpo","left"),{type:"table",content:[{type:"tableRow",content:[{type:"tableCell",content:[p("123","right")]},{type:"tableCell",content:[{type:"bulletList",content:[{type:"listItem",content:[p("Cella","center")]}]}]}]}]}]});
 let state=EditorState.create({schema:s,doc,plugins:[history()]});state=state.apply(alignParagraphs(state,"justify"));
 const alignments=()=>{const result=[];state.doc.descendants(n=>{if(n.type.name==="paragraph")result.push(n.attrs.textAlign);});return result;};
 assert.deepEqual(alignments(),["justify","right","center"]);
 state=state.apply(alignParagraphs(state,"left","tables"));assert.deepEqual(alignments(),["justify","left","left"]);
 undo(state,tr=>{state=state.apply(tr);});assert.deepEqual(alignments(),["justify","right","center"]);
});

test("current page follows the largest visible area instead of the previous page sliver",()=>{
 const {mostVisiblePage}=load("src/lib/editor/pages.ts");
 assert.equal(mostVisiblePage(950,700,[0,1000,2000],3000),2);
 assert.equal(mostVisiblePage(200,500,[0,1000,2000],3000),1);
 assert.equal(mostVisiblePage(1980,650,[0,1024,2048],3100),3);
});
test("page gaps are view decorations and never alter saved text or create undo entries",()=>{
 const {getSchema}=require("@tiptap/core"),{editorExtensions}=load("src/lib/editor/extensions.ts"),{PageGaps,pageGapKey}=load("src/lib/editor/page-gaps.ts");
 const {EditorState}=require("@tiptap/pm/state");const s=getSchema(editorExtensions());const doc=s.nodeFromJSON({type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Un esempio sintetico"}]}]});
 const plugins=PageGaps.config.addProseMirrorPlugins.call(PageGaps);let state=EditorState.create({schema:s,doc,plugins});
 const tr=state.tr.setMeta(pageGapKey,[4]).setMeta("addToHistory",false);assert.equal(tr.docChanged,false);state=state.apply(tr);
 assert.deepEqual(state.doc.toJSON(),doc.toJSON());assert.equal(pageGapKey.getState(state).find().length,1);
 state=state.apply(state.tr.setMeta(pageGapKey,[]));assert.equal(pageGapKey.getState(state).find().length,0);
});

test("adding an editable page preserves surrounding text and is undoable",()=>{
 const {getSchema}=require("@tiptap/core"),{editorExtensions}=load("src/lib/editor/extensions.ts"),{insertPage}=load("src/lib/editor/insert-page.ts");
 const {EditorState}=require("@tiptap/pm/state"),{history,undo}=require("@tiptap/pm/history");const s=getSchema(editorExtensions());
 const doc=s.nodeFromJSON({type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Prima dopo"}]}]});let state=EditorState.create({schema:s,doc,plugins:[history()]});
 const result=insertPage(state,7);state=state.apply(result.tr);assert.equal(state.doc.childCount,3);assert.equal(state.doc.child(1).type.name,"pageSection");assert.equal(state.doc.textContent,"Prima dopo");assert.equal(state.doc.resolve(result.caret).parent.type.name,"paragraph");
 undo(state,tr=>{state=state.apply(tr);});assert.deepEqual(state.doc.toJSON(),doc.toJSON());
});

test("visual page breaks stay outside headings and keep headings with the next paragraph",()=>{
 const {safePageBoundary}=load("src/lib/editor/page-gaps.ts");const doc=referenceDoc([[0,"Introduzione"],[1,"Titolo del capitolo"],[0,"Primo paragrafo"],[0,"Secondo paragrafo"]]);
 const heading=doc.child(0).nodeSize;
 assert.equal(safePageBoundary(doc,heading+4),heading);
 assert.equal(safePageBoundary(doc,heading+doc.child(1).nodeSize+4),heading);
});

test("heading pagination guard preserves text and keeps measured spacing through table attribute updates",()=>{
 const {KeepHeadings}=load("src/lib/editor/keep-headings.ts");
 const {getSchema}=require("@tiptap/core"),{editorExtensions}=load("src/lib/editor/extensions.ts");
 const {EditorState}=require("@tiptap/pm/state"),{Decoration}=require("@tiptap/pm/view");
 const s=getSchema(editorExtensions()),doc=s.nodeFromJSON({type:"doc",content:[{type:"heading",attrs:{level:2},content:[{type:"text",text:"Titolo sintetico"}]},{type:"paragraph",content:[{type:"text",text:"Testo di prova"}]}]});
 const plugin=KeepHeadings.config.addProseMirrorPlugins.call(KeepHeadings)[0];
 let state=EditorState.create({schema:s,doc,plugins:[plugin]});
 state=state.apply(state.tr.setMeta(plugin,[Decoration.node(0,doc.firstChild.nodeSize,{style:"margin-top:100px"})]).setMeta("addToHistory",false));
 assert.deepEqual(state.doc.toJSON(),doc.toJSON());assert.equal(plugin.getState(state).find().length,1);
 state=state.apply(state.tr.insertText("X",2));assert.equal(plugin.getState(state).find().length,0);
});

test("AI writing validates actions and bounds without accepting arbitrary provider output",()=>{
 const {writingInput,writingOutput}=load("src/lib/editorial/writing.ts");
 assert.equal(writingInput({action:"expand",text:"Prova",instructions:""}).action,"expand");
 assert.throws(()=>writingInput({action:"delete",text:"Prova",instructions:""}));
 assert.throws(()=>writingInput({action:"write",text:"x".repeat(16001),instructions:""}));
 assert.throws(()=>writingOutput({text:""}));
 assert.equal(writingOutput({text:" Testo sintetico "}),"Testo sintetico");
});
test("AI selection replacement preserves surrounding text, rejects stale documents and undoes in one step",()=>{
 const {replaceAiSelection,canRewriteSelection}=load("src/lib/editor/ai-selection.ts");
 const {EditorState}=require("@tiptap/pm/state"),{history,undo}=require("@tiptap/pm/history");
 const doc=schema.node("doc",null,[schema.node("paragraph",null,schema.text("Prima brano dopo"))]);
 let state=EditorState.create({schema,doc,plugins:[history()]});
 assert.equal(canRewriteSelection(doc,7,12),true);
 state=state.apply(replaceAiSelection(state,doc,7,12,"nuovo testo"));assert.equal(state.doc.textContent,"Prima nuovo testo dopo");
 assert.throws(()=>replaceAiSelection(state,doc,7,12,"altro"),/CHANGED/);
 undo(state,tr=>{state=state.apply(tr);});assert.deepEqual(state.doc.toJSON(),doc.toJSON());
});
test("AI rewriting rejects selections across table cells and supports multi-paragraph prose",()=>{
 const {canRewriteSelection,replaceAiSelection}=load("src/lib/editor/ai-selection.ts");
 const {getSchema}=require("@tiptap/core"),{editorExtensions}=load("src/lib/editor/extensions.ts"),{EditorState}=require("@tiptap/pm/state");
 const s=getSchema(editorExtensions()),p=text=>s.node("paragraph",null,s.text(text));
 const table=s.node("doc",null,[s.node("table",null,[s.node("tableRow",null,[s.node("tableCell",null,[p("Uno")]),s.node("tableCell",null,[p("Due")])])])]);
 const positions=[];table.descendants((node,pos)=>{if(node.isText)positions.push(pos);});
 assert.equal(canRewriteSelection(table,positions[0],positions[0]+2),true);
 assert.equal(canRewriteSelection(table,positions[0],positions[1]+2),false);
 const doc=s.node("doc",null,[p("Prima uno"),p("due dopo")]);const state=EditorState.create({schema:s,doc});
 const tr=replaceAiSelection(state,doc,7,15,"nuovo\nsecondo");
 assert.equal(tr.doc.childCount,2);assert.equal(tr.doc.textContent,"Prima nuovosecondo dopo");
});

test("duplicating a manuscript creates independent content and does not reuse jobs or costs",()=>{
 const {duplicateProject}=load("src/lib/editor/duplicate-project.ts");
 const source={version:1,id:"original",name:"Prova",createdAt:1,updatedAt:2,doc:{type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Testo sintetico"}]}]},original:{type:"doc",content:[]},metadata:{title:"Titolo"},typography:{font:"Georgia",size:12,lineHeight:1.6,paragraphSpacing:8,margin:25},findings:[],review:null,analysis:{jobId:"job",state:"running"},writingCost:4,importNotice:false};
 const copy=duplicateProject(source,[source]);
 assert.notEqual(copy.id,source.id);assert.equal(copy.metadata.title,"Titolo (copia)");assert.equal(copy.analysis,undefined);assert.equal(copy.writingCost,0);
 copy.doc.content[0].content[0].text="Modificato";assert.equal(source.doc.content[0].content[0].text,"Testo sintetico");
 assert.equal(duplicateProject(source,[source,copy]).name,"Titolo (copia 2)");
});

test("book profiles use reading defaults and preserve explicit user overrides",()=>{
 const {bookProfile,validateProfile}=load("src/lib/editor/book-profile.ts");
 const p={analysis:{memory:{summary:"Sintesi",style:"Sobrio"},inferredProfile:{audience:"Adulti",tone:"Narrativo"}},metadata:{editorialProfile:{tone:"Diretto",genre:""}}};
 const result=bookProfile(p);assert.equal(result.description,"Sintesi");assert.equal(result.tone,"Diretto");assert.equal(result.audience,"Adulti");assert.equal(result.genre,"");
 assert.throws(()=>validateProfile({tone:"a".repeat(6001)}));
 const {writingInput}=load("src/lib/editorial/writing.ts");assert.equal(writingInput({action:"expand",text:"Esempio",instructions:"",profile:result,context:"Contesto"}).profile.tone,"Diretto");
});
test("new analyses derive the book profile from completed memory without rereading the manuscript",async()=>{
 const job=fixture();job.profileVersion=1;job.phase="memory";job.memoryQueue=[{...note,id:"memory",chapterIds:[],facts:[]}];
 let calls=0;await advanceJob(job,async request=>{calls++;assert.equal(request.name,"book_profile");assert.equal(request.data.memory.summary,note.summary);return {value:{description:"Descrizione breve",workType:"Manuale",tone:"Sobrio"},usage};});
 assert.equal(calls,1);assert.equal(job.phase,"structure");assert.equal(job.inferredProfile.workType,"Manuale");
});
