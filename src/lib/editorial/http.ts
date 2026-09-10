import { hexclaveServerApp } from "@/hexclave/server";
import { ownerHash } from "./store";
export const json = (value: unknown, status = 200) => Response.json(value, {status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
export async function authorize(request: Request, mutation = false) {
  if (process.env.NODE_ENV !== "development") throw new Error("DISABLED");
  if (mutation && request.headers.get("origin") !== new URL(request.url).origin) throw new Error("UNAUTHORIZED");
  try { return ownerHash((await hexclaveServerApp.getUser({ tokenStore:request,or:"throw" })).id); }
  catch { throw new Error("UNAUTHORIZED"); }
}
export async function boundedJson(request: Request, max: number) {
  const reader=request.body?.getReader(); if(!reader)throw new Error("INVALID_REQUEST");
  let size=0;const parts:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error("FILE_TOO_LARGE");}parts.push(value);}
  try{return JSON.parse(Buffer.concat(parts).toString("utf8"));}catch{throw new Error("INVALID_REQUEST");}
}
export function failure(error:unknown) { const code=error instanceof Error?error.message:"STORAGE_UNAVAILABLE";return json({error:["DISABLED","UNAUTHORIZED","INVALID_REQUEST","FILE_TOO_LARGE","NOT_FOUND","BUSY","NOT_CONFIGURED"].includes(code)?code:"STORAGE_UNAVAILABLE"},code==="UNAUTHORIZED"?401:code==="NOT_FOUND"||code==="DISABLED"?404:code==="BUSY"?409:400); }
