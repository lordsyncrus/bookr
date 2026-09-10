"use client";
import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Editor } from "@tiptap/react";
import { detectContents, type DetectedContents } from "@/lib/editor/detect-contents";
import type { ManuscriptProject } from "@/lib/editor/types";
export function ContentsDetector({editor,project,locked,onChange,onNavigate}:{editor:Editor;project:ManuscriptProject;locked:boolean;onChange:(project:ManuscriptProject)=>void;onNavigate:(pos:number)=>void}) {
  const t=useTranslations("editor.detectContents");
  const [detected,setDetected]=useState<DetectedContents|null>(null);
  const [targets,setTargets]=useState<Record<number,number>>({});
  const snapshot = useRef(editor.state.doc);
  const [levels,setLevels]=useState<Record<number,number>>({});
  const [preview,setPreview]=useState<number|null>(null);
  const [applied,setApplied]=useState(false);
  const detect = useCallback(() => {snapshot.current=editor.state.doc;const result=detectContents(editor.state.doc);setDetected(result);setLevels(Object.fromEntries(result.entries.map(e=>[e.sourcePos,e.targets.length===1?(e.targets[0].level||e.level):e.level])));setTargets(Object.fromEntries(result.entries.map(e=>[e.sourcePos,e.targets.length===1?e.targets[0].pos:-1])));setApplied(false);setPreview(null);}, [editor]);
  const apply = useCallback(() => {
    if(!detected||locked)return;
    if(!snapshot.current.eq(editor.state.doc)){detect();return;}
    const tr=editor.state.tr;let count=0;
    for(const candidate of detected.entries){const pos=targets[candidate.sourcePos];const node=pos>=0?tr.doc.nodeAt(pos):null;
      if(!node||!candidate.targets.some(target=>target.pos===pos&&target.title===node.textContent))continue;
      tr.setNodeMarkup(pos,editor.schema.nodes.heading,{...node.attrs,level:levels[candidate.sourcePos]||candidate.level});count++;
    }
    if(count){editor.view.dispatch(tr);setApplied(true);}
    // Heading conversion keeps node sizes, so the detected bounds remain valid.
    if(detected.range)onChange({...project,doc:editor.getJSON(),updatedAt:Date.now(),contents:{...(project.contents||{enabled:false,minLevel:1,maxLevel:3,title:t("defaultTitle")}),existingRange:detected.range},analysis:project.analysis?{...project.analysis,stale:true}:undefined});
  }, [detected, locked, editor, targets, levels, project, onChange, t, detect]);
  function showTarget(pos:number, title:string) {
    const node = editor.state.doc.nodeAt(pos);
    if (!node || node.textContent !== title) { detect(); return; }
    setPreview(pos);onNavigate(pos);
  }
  const selected=detected?.entries.filter(e=>targets[e.sourcePos]>=0).length||0;
  return <div className="contents-detector hexclave-private">
    <button className="studio-button secondary full" disabled={locked} onClick={detect}>{t("detect")}</button>
    {detected&&<>
      <p>{detected.entries.length?t("found",{count:detected.entries.length}):t("none")}</p>
      {detected.entries.map(candidate=><div className="detected-entry" role="group" aria-label={candidate.title} key={candidate.sourcePos} onClick={event=>{if(!(event.target as HTMLElement).closest("button,select,input,label")){const target=candidate.targets.find(item=>item.pos===targets[candidate.sourcePos]);if(target)showTarget(target.pos,target.title);}}}><button className="structure-reference" disabled={targets[candidate.sourcePos]<0} onClick={() => { const target=candidate.targets.find(item=>item.pos===targets[candidate.sourcePos]);if(target)showTarget(target.pos,target.title); }}>{candidate.title}<small>{t("viewLinked")}</small></button><select aria-label={candidate.title} disabled={locked||applied} value={targets[candidate.sourcePos]??-1} onChange={event=>setTargets({...targets,[candidate.sourcePos]:Number(event.target.value)})}>
        <option value={-1}>{t("skip")}</option>
        {candidate.targets.map((target,index)=><option key={target.pos} value={target.pos}>{candidate.targets.length>1?t("occurrence",{number:index+1}):t("unique")} · {target.title}</option>)}
      </select>
      <div className="candidate-previews">{candidate.targets.map((target,index)=><button key={target.pos} className={preview===target.pos?"active":""} aria-pressed={preview===target.pos} onClick={()=>showTarget(target.pos,target.title)}>{t("viewCandidate",{number:index+1})}</button>)}</div>
      <span>{t("level")}</span><select aria-label={`${t("level")}: ${candidate.title}`} disabled={locked||applied} value={levels[candidate.sourcePos]||candidate.level} onChange={event=>setLevels({...levels,[candidate.sourcePos]:Number(event.target.value)})}>{[1,2,3,4,5,6].map(level=><option key={level} value={level}>{level}</option>)}</select>{candidate.targets.length>1&&<small>{t("ambiguous")}</small>}</div>)}
      {selected>0&&<button className="studio-button primary full" disabled={locked||applied} onClick={apply}>{applied?t("applied"):t("apply",{count:selected})}</button>}
      {detected.entries.length>0&&<p>{t("hint")}</p>}
    </>}
  </div>;
}
