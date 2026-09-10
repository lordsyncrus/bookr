import { EDITORIAL_BUDGET_USD } from "@/lib/editorial/limits";
import { authorize, boundedJson, failure, json } from "@/lib/editorial/http";
import { readJob, setControl } from "@/lib/editorial/store";
import { publicResult, startEditorialWorker } from "@/lib/editorial/worker";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){
  try{const owner=await authorize(request);const {id}=await context.params;const job=await readJob(id);if(!job||job.owner!==owner)throw new Error("NOT_FOUND");startEditorialWorker();return json(publicResult(job));}catch(error){return failure(error);}
}
export async function PATCH(request:Request,context:Context){
  try{const owner=await authorize(request,true);const {id}=await context.params;const job=await readJob(id);if(!job||job.owner!==owner)throw new Error("NOT_FOUND");const data=await boundedJson(request,1000);if(!["run","pause","cancel"].includes(data.desired))throw new Error("INVALID_REQUEST");await setControl(id,{desired:data.desired,budgetUsd:EDITORIAL_BUDGET_USD,resume:data.desired==="run"});startEditorialWorker();return json({ok:true});}catch(error){return failure(error);}
}
