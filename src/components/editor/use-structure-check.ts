"use client";
import { useEffect, useState } from "react";
import type { Node } from "@tiptap/pm/model";
import type { DetectedContents } from "@/lib/editor/detect-contents";
import type { ReferenceReport } from "@/lib/editor/references";
export type StructureCheck = {contents:DetectedContents;references:ReferenceReport};
const cache = new WeakMap<Node,StructureCheck>();
export function useStructureCheck(doc:Node) {
  const [state,setState]=useState<{doc:Node;result?:StructureCheck;error?:boolean}>();
  useEffect(()=>{
    const cached=cache.get(doc);
    if(cached)return;
    let worker:Worker|undefined;
    let disposed=false;
    try {
      worker=new Worker(new URL("../../lib/editor/structure-worker.ts",import.meta.url),{type:"module"});
      worker.onmessage=event=>{
        if(event.data.error)setState({doc,error:true});
        else {cache.set(doc,event.data);setState({doc,result:event.data});}
        worker?.terminate();
      };
      worker.onerror=()=>{setState({doc,error:true});worker?.terminate();};
      worker.postMessage(doc.toJSON());
    }catch{queueMicrotask(()=>{if(!disposed)setState({doc,error:true});});}
    return()=>{disposed=true;worker?.terminate();};
  },[doc]);
  const cached=cache.get(doc);
  return cached?{doc,result:cached}:state?.doc===doc?state:{doc};
}
