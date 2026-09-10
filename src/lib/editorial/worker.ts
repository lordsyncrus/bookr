import { advanceJob } from "./engine";
import { jobIds, readJob, saveJob, getControl, setControl, workerLease } from "./store";
import type { EditorialJob, AnalysisResult } from "./types";
import { PipelineError } from "./openrouter";

export function publicResult(job: EditorialJob): AnalysisResult {
  const { jobId,version,sourceHash,state,phase,done,total,costUsd,inputTokens,outputTokens,budgetUsd,error,stale,mode,chapters,chapterNotes,memory,issues,discarded,model,createdAt,updatedAt }=job;
  return {inferredProfile:job.inferredProfile,jobId,version,sourceHash,state,phase,done,total,costUsd,inputTokens,outputTokens,budgetUsd,error,stale,mode,chapters,chapterNotes,memory,issues,findings:state==="complete"?job.findings:[],discarded,model,createdAt,updatedAt};
}
const workerGlobal = globalThis as typeof globalThis & { bookrWorker?: boolean };
export function startEditorialWorker() {
  if (process.env.NODE_ENV !== "development" || workerGlobal.bookrWorker) return;
  workerGlobal.bookrWorker = true;
  const tick = async () => {
    let release: (()=>Promise<void>) | null = null;
    try {
      release = await workerLease();
      if (release) for (const id of await jobIds()) {
        try {
          const job = await readJob(id);
          if (!job || ["complete","cancelled"].includes(job.state)) continue;
          const control = await getControl(id);
          job.budgetUsd=control.budgetUsd;
          if(control.desired==="cancel")job.state="cancelled";
          else if(control.desired==="pause")job.state="paused";
          else if(job.state==="error" && !control.resume)continue;
          else {
            job.state="running";job.error=null;
            if(control.resume){delete control.resume;await setControl(id,control);}
            try { await advanceJob(job,undefined,()=>saveJob(job)); }
            catch(error) { job.state="error";job.error=error instanceof PipelineError?error.code:"INVALID_RESPONSE"; }
          }
          job.updatedAt=Date.now();job.version++;
          await saveJob(job);
        } catch { /* Never log source data or provider payloads. Other jobs can continue. */ }
      }
    } catch { /* Retry local storage availability on the next tick. */ }
    finally { if(release) await release().catch(()=>{}); setTimeout(tick,1500).unref(); }
  };
  void tick();
}
