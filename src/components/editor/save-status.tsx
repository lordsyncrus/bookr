"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, HardDrive, LoaderCircle, X } from "lucide-react";
export function SaveStatus({state}:{state:"saved"|"saving"|"error"}) {
  const t=useTranslations("editor");const [open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);trigger.current?.focus();}};
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[open]);
  return <div className="save-status-control" ref={root}>
    <button ref={trigger} type="button" className={`save-indicator ${state==="error"?"has-error":""}`} aria-expanded={open} aria-controls="save-status-details" onClick={()=>setOpen(value=>!value)}>{state==="saving"?<LoaderCircle size={13} className="animate-spin"/>:state==="error"?<X size={13}/>:<Check size={13}/>}<span role="status">{t(state)}</span><ChevronDown size={12}/></button>
    {open&&<div id="save-status-details" className="save-status-details"><HardDrive size={17}/><div><strong>{t("onThisDevice")}</strong><p>{t("deviceNote")}</p>{state==="error"&&<p role="alert">{t("errors.STORAGE")}</p>}</div></div>}
  </div>;
}
