"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { pageGeometry } from "@/lib/editor/page-geometry";

export function useDocumentPages(editor: Editor | null, hasContents = false) {
  const [offsets,setOffsets]=useState<number[]>([0]);
  const [headingPages,setHeadingPages]=useState<Record<number,number>>({});
  const [pages, setPages] = useState({current:1,total:1});
  const scheduleRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!editor) return;
    const paper=editor.view.dom.closest<HTMLElement>(".manuscript-paper");
    const canvas=editor.view.dom.closest<HTMLElement>(".document-canvas");
    if (!paper || !canvas) return;
    let frame=0, disposed=false;
    const measure=()=>{
      frame=0;
      if(disposed || editor.isDestroyed)return;
      const rect=paper.getBoundingClientRect(), viewport=canvas.getBoundingClientRect();
      const scale=rect.width/Math.max(1,paper.offsetWidth);
      const geometry=pageGeometry(editor.view);if(!geometry)return;const total=geometry.total;
      setOffsets(old=>JSON.stringify(old)===JSON.stringify(geometry.offsets)?old:geometry.offsets);
      if(hasContents) {
        const next:Record<number,number>={};
        editor.state.doc.descendants((node,pos)=>{
          if(node.type.name!=="heading")return;
          const dom=editor.view.nodeDOM(pos);
          if(dom instanceof HTMLElement)next[pos]=Math.max(1,geometry.offsets.filter(offset=>offset<=(dom.getBoundingClientRect().top-rect.top)/Math.max(.01,scale)).length);
        });
        setHeadingPages(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
      }
      const current=hasContents && viewport.top + Math.min(canvas.clientHeight/2,200) < rect.top ? 0 : geometry.current;
      setPages(previous=>previous.current===current&&previous.total===total?previous:{current,total});
    };
    const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(measure);};
    scheduleRef.current=schedule;
    const observer=new ResizeObserver(schedule);
    const contents=canvas.querySelector(".contents-paper");if(contents)observer.observe(contents);
    observer.observe(paper);observer.observe(canvas);observer.observe(editor.view.dom);
    canvas.addEventListener("scroll",schedule,{passive:true});
    editor.on("transaction",schedule);
    window.addEventListener("resize",schedule);
    document.fonts.addEventListener("loadingdone",schedule);
    void document.fonts.ready.then(schedule);
    schedule();
    return ()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();
      canvas.removeEventListener("scroll",schedule);editor.off("transaction",schedule);
      window.removeEventListener("resize",schedule);document.fonts.removeEventListener("loadingdone",schedule);
      scheduleRef.current=()=>{};
    };
  },[editor,hasContents]);
  const goToPage=useCallback((page:number)=>{
    if(!editor || editor.isDestroyed)return;
    const paper=editor.view.dom.closest<HTMLElement>(".manuscript-paper");
    const canvas=editor.view.dom.closest<HTMLElement>(".document-canvas");
    if(!paper || !canvas)return;
    const rect=paper.getBoundingClientRect(),viewport=canvas.getBoundingClientRect();
    const scale=rect.width/Math.max(1,paper.offsetWidth);
    const contents=hasContents&&page===0?canvas.querySelector(".contents-paper"):null;
    const geometry=pageGeometry(editor.view);if(!geometry)return;
    const top=contents?Math.max(0,canvas.scrollTop+contents.getBoundingClientRect().top-viewport.top-12):Math.max(0,canvas.scrollTop+rect.top-viewport.top+(geometry.offsets[Math.max(0,Math.min(geometry.total-1,page-1))]||0)*scale-12);
    canvas.scrollTo({top,behavior:"instant"});
    scheduleRef.current();
  },[editor,hasContents]);
  return {...pages,offsets,headingPages,goToPage};
}
