"use client";
import { useLocale } from "next-intl";
import { BookOpen, Sparkles, ListTree, SlidersHorizontal, Download, Check } from "lucide-react";
import type { ManuscriptProject } from "@/lib/editor/types";
export type WorkflowStep="book"|"review"|"structure"|"typography"|"export";
export function WorkflowTabs({step,onSelect,project}:{step:WorkflowStep;onSelect:(step:WorkflowStep)=>void;project:ManuscriptProject}) {
  const en=useLocale()==="en";
  const pending=project.findings.filter(f=>f.status==="pending").length;
  const structure=(project.titlePlan?.items.filter(f=>f.status==="pending").length||0)+(project.analysis?.issues.filter(i=>i.status==="pending"||i.status==="accepted").length||0);
  const tabs=[{id:"book",label:en?"Book details":"Dati libro",icon:BookOpen,count:0,done:!!project.metadata?.title.trim()&&!!project.metadata?.authors.trim()},{id:"review",label:en?"Text review":"Revisione testo",icon:Sparkles,count:pending,done:project.review?.state==="complete"&&pending===0},{id:"structure",label:en?"Structure & contents":"Struttura e indice",icon:ListTree,count:structure,done:project.analysis?.state==="complete"&&!project.analysis.stale&&structure===0},{id:"typography",label:en?"Formatting":"Formattazione",icon:SlidersHorizontal,count:0,done:false},{id:"export",label:en?"Export":"Esporta",icon:Download,count:0,done:false}] as const;
  return <div className="workflow-tabs" role="tablist" aria-label={en?"Book workflow":"Fasi del libro"}>{tabs.map((tab,index)=><button type="button" role="tab" id={`workflow-${tab.id}`} aria-controls="workflow-panel" aria-selected={step===tab.id} tabIndex={step===tab.id?0:-1} key={tab.id} onClick={()=>onSelect(tab.id)} onKeyDown={event=>{const next=event.key==="ArrowRight"?(index+1)%tabs.length:event.key==="ArrowLeft"?(index+tabs.length-1)%tabs.length:event.key==="Home"?0:event.key==="End"?tabs.length-1:-1;if(next<0)return;event.preventDefault();onSelect(tabs[next].id);(event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();}}><span className={`workflow-step-number ${tab.done?"done":""}`}>{tab.done?<Check size={12}/>:index+1}</span><span>{tab.label}</span>{tab.count>0&&<b>{tab.count}</b>}</button>)}</div>;
}
export function InspectorResizer({width,onResize}:{width:number;onResize:(width:number)=>void}) {
  const en=useLocale()==="en";
  return <div className="inspector-resizer" role="separator" tabIndex={0} aria-orientation="vertical" aria-label={en?"Resize review panel":"Ridimensiona pannello revisione"} aria-valuemin={320} aria-valuemax={680} aria-valuenow={width} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const right=e.currentTarget.parentElement?.getBoundingClientRect().right;if(right)onResize(Math.max(320,Math.min(680,right-e.clientX)));}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onKeyDown={e=>{if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;e.preventDefault();onResize(Math.max(320,Math.min(680,width+(e.key==="ArrowLeft"?24:-24))));}}><span/></div>;
}
