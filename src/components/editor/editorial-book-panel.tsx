"use client";
import { TitlePlanPanel } from "./title-plan-panel";
import { chapterReferences } from "@/lib/editor/structure-navigation";
import { ContentsDetector } from "./contents-detector";
import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Editor } from "@tiptap/react";
import { ArrowUp, ArrowDown, ListTree } from "lucide-react";
import { bookChapters, headingEntries, suggestedChapterLevel } from "@/lib/editorial/chapters";
import type { ManuscriptProject } from "@/lib/editor/types";
import type { BookIssue } from "@/lib/editorial/types";
export function EditorialBookPanel({ project, editor, locked, onChange, onFinal, onNavigate }: {
  project: ManuscriptProject; editor: Editor; locked: boolean; onChange: (project: ManuscriptProject)=>void; onFinal:()=>void; onNavigate:(pos:number)=>void;
}) {
  const t=useTranslations("editor.structure");const locale=useLocale();
  const level=project.chapterLevel || suggestedChapterLevel(editor.state.doc);
  const chapters=bookChapters(editor.state.doc,level,locale);
  const contents=project.contents || {enabled:false,minLevel:1,maxLevel:3,title:locale==="it"?"Indice":"Contents"};
  const entries=headingEntries(project.doc,contents.minLevel,contents.maxLevel);
  const save = useCallback((next:ManuscriptProject) => { onChange({...next,updatedAt:Date.now()}); }, [onChange]);
  function move(index:number,direction:number) {
    if(locked)return;
    const before=chapters[Math.min(index,index+direction)],after=chapters[Math.max(index,index+direction)];
    if(!before||!after)return;
    const doc=editor.state.doc;
    editor.view.dispatch(editor.state.tr.replaceWith(before.from,after.to,doc.content.cut(after.from,after.to).append(doc.content.cut(before.from,before.to))));
  }
  function decide(id:string,status:BookIssue["status"]) {
    if(!project.analysis)return;
    save({...project,analysis:{...project.analysis,issues:project.analysis.issues.map(issue=>issue.id===id?{...issue,status}:issue)}});
  }
  function references(ids:string[]) {
    return ids.flatMap(id => {
      const chapter=project.analysis?.chapters.find(item=>item.id===id);
      return chapter ? chapterReferences(editor.state.doc,chapter,!!project.analysis?.stale) : [];
    }).filter((target,index,all)=>all.findIndex(item=>item.pos===target.pos)===index);
  }
  return <section className="editorial-book hexclave-private">
    <header className="structure-heading"><span className="small-overline">{t("tab")}</span><h3>{t("title")}</h3><p>{t("intro")}</p></header>
    <details open><summary><ListTree size={16}/>{t("titlesStep")}</summary>
      <ContentsDetector editor={editor} project={project} locked={locked} onChange={onChange} onNavigate={onNavigate} />
    </details>
    <TitlePlanPanel project={project} editor={editor} locked={locked} onChange={onChange} onFinal={onFinal} onNavigate={onNavigate}/>
    <details><summary>{t("mapStep")}</summary>
      <label>{t("chapterLevel")}<select value={level} disabled={locked} onChange={event=>save({...project,chapterLevel:Number(event.target.value),analysis:project.analysis?{...project.analysis,stale:true}:undefined})}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{t("heading",{level:n})}</option>)}</select></label>
      {!chapters.some(c=>c.headingPos!==null)&&<p className="modal-note">{t("noHeadings")}</p>}
      <p>{t("moveHint")}</p>
      {chapters.map((chapter,index)=><div className="chapter-map-row" key={chapter.id}>
        <button onClick={()=>onNavigate(chapter.from)}>{index+1}. {chapter.title}<small>{t("words",{count:chapter.words})}</small></button>
        <button disabled={locked||index===0} aria-label={t("up")} onClick={()=>move(index,-1)}><ArrowUp size={14}/></button>
        <button disabled={locked||index===chapters.length-1} aria-label={t("down")} onClick={()=>move(index,1)}><ArrowDown size={14}/></button>
      </div>)}
    </details>
    <details><summary>{t("exportStep")}</summary>
      <label className="book-option"><input type="checkbox" checked={contents.enabled} onChange={event=>save({...project,contents:{...contents,enabled:event.target.checked}})}/>{t("includeContents")}</label>
      {contents.enabled&&<>
        <label>{t("contentsTitle")}<input value={contents.title} maxLength={150} onChange={event=>save({...project,contents:{...contents,title:event.target.value}})}/></label>
        <label>{t("depth")}<select value={contents.maxLevel} onChange={event=>save({...project,contents:{...contents,maxLevel:Number(event.target.value)}})}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n===1?(locale==="it"?"Solo titoli di livello 1":"Level 1 headings only"):n}</option>)}</select></label>
        <p>{t("contentsHint")}</p>
        {contents.existingRange&&<label className="book-option"><input type="checkbox" checked={!!contents.replaceExisting} onChange={event=>save({...project,contents:{...contents,replaceExisting:event.target.checked}})}/>{t("replaceExisting")}</label>}
        <ol className="contents-preview">{entries.map(entry=><li key={entry.id} style={{marginLeft:(entry.level-1)*12}}>{entry.title}</li>)}</ol>
        {!entries.length&&<p>{t("emptyContents")}</p>}
      </>}
    </details>
    {project.analysis&&<details><summary>{t("report")}</summary>
      {project.analysis.stale&&<p className="modal-note">{t("stale")}</p>}
      {project.analysis.memory&&<details><summary>{t("memory")}</summary><p>{project.analysis.memory.summary}</p><p>{project.analysis.memory.style}</p></details>}
      {project.analysis.chapterNotes.map(note=><details key={note.id}><summary>{project.analysis?.chapters.find(c=>c.id===note.id)?.title || t("chapter")}</summary><div className="structure-references">{references(note.chapterIds).map(target=><button className="structure-reference" key={target.pos} onClick={()=>onNavigate(target.pos)}>{t("goToTitle")}: {target.title}</button>)}</div><p>{note.summary}</p>{note.timeline.map((item,i)=><p key={i}>{item}</p>)}</details>)}
      {project.analysis.issues.map(issue=>{const targets=references(issue.chapterIds);return <article className="book-issue navigable" key={issue.id} onClick={event=>{if(!(event.target as HTMLElement).closest("button,select,label,a,input")&&targets.length===1)onNavigate(targets[0].pos);}}><h4><button className="structure-reference" disabled={targets.length!==1} onClick={()=>onNavigate(targets[0].pos)}>{issue.title}</button></h4><div className="structure-references">{targets.map((target,index)=><button key={target.pos} className="structure-reference" onClick={()=>onNavigate(target.pos)}>{targets.length>1?`${index+1}. `:""}{t("goToTitle")}: {target.title}</button>)}</div>{targets.length===0&&<small>{t("referenceMissing")}</small>}<p>{issue.reason}</p><p>{issue.suggestion}</p>{issue.evidence.map((e,i)=><blockquote key={i}>{e.quote}</blockquote>)}<label>{t("decision")}<select value={issue.status} onChange={event=>decide(issue.id,event.target.value as BookIssue["status"])}>{["pending","accepted","rejected","resolved"].map(status=><option key={status} value={status}>{t(status)}</option>)}</select></label></article>;})}
      <p>{t("decisionHint")}</p>
    </details>}
    <div className="structure-analysis-action"><h4>{t("checkTitle")}</h4><p>{t("checkDescription")}</p><button className="studio-button primary full" disabled={locked} onClick={onFinal}>{project.analysis ? t("finalCheck") : t("startCheck")}</button></div>
  </section>;
}
