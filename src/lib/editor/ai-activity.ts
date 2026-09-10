"use client";
import { useSyncExternalStore } from "react";
const listeners=new Set<()=>void>();
let active:readonly string[]=[];
const empty:readonly string[]=[];
export function setTitleActivity(id:string,running:boolean){active=running?[...new Set([...active,id])]:active.filter(value=>value!==id);listeners.forEach(notify=>notify());}
export function useTitleActivity(){return useSyncExternalStore(callback=>{listeners.add(callback);return()=>{listeners.delete(callback);};},()=>active,()=>empty);}
