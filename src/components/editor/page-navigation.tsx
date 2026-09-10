"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, CornerDownLeft } from "lucide-react";
import { EDITOR_PAGE_HEIGHT, clampPage } from "@/lib/editor/pages";

export function PageNavigation({current,total,onNavigate,hasContents=false}:{current:number;total:number;hasContents?:boolean;onNavigate:(page:number)=>void}) {
  const t=useTranslations("editor.pages");
  const [draft,setDraft]=useState<string|null>(null);
  function go(page:number){onNavigate(hasContents&&page<=0?0:clampPage(page,total));setDraft(null);}
  return <nav className="page-navigation" aria-label={t("navigation")} title={t("hint")}>
    <button type="button" aria-label={t("previous")} disabled={current<=(hasContents?0:1)} onClick={()=>go(current-1)}><ChevronLeft size={15}/></button>
    <form onSubmit={event=>{event.preventDefault();if(draft?.trim())go(Number(draft));else setDraft(null);}}>
      <label><span>{t("page")}</span><input aria-label={t("goTo")} type="number" inputMode="numeric" min={hasContents?0:1} max={total} step={1} value={draft??current} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Escape"){setDraft(null);event.currentTarget.blur();}}}/></label>
      <span className="page-total">{t("of",{total})}</span>
      <button type="submit" aria-label={t("go")} title={t("go")}><CornerDownLeft size={13}/></button>
    </form>
    <button type="button" aria-label={t("next")} disabled={current>=total} onClick={()=>go(current+1)}><ChevronRight size={15}/></button>
    <span className="sr-only" role="status" aria-live="polite">{t("position",{current,total})}</span>
  </nav>;
}
export function PageGuides({total}:{total:number}) {
  const t=useTranslations("editor.pages");
  return <div className="editor-page-guides" aria-hidden="true">{Array.from({length:total},(_,index)=><div className="editor-page-guide" key={index} style={{top:index*EDITOR_PAGE_HEIGHT}}><span className="editor-page-number"><span className="page-number-prefix">{t("short")} </span>{index+1}</span></div>)}</div>;
}
