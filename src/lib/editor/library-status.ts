import type { ManuscriptProject } from "./types";
export function libraryStatus(project:ManuscriptProject) {
  const analysis=project.analysis;
  const pending=project.findings.filter(f=>f.status==="pending").length+(project.titlePlan?.items.filter(f=>f.status==="pending").length||0);
  const approved=project.findings.filter(f=>f.status==="approved").length+(project.titlePlan?.items.filter(f=>f.status==="approved").length||0);
  const stale=project.findings.filter(f=>f.status==="stale").length+(project.titlePlan?.items.filter(f=>f.status==="stale").length||0);
  const issues=analysis?.issues.filter(i=>i.status==="pending"||i.status==="accepted").length||0;
  const state=analysis&&analysis.state!=="complete"?analysis.state:analysis?.stale||stale?"outdated":analysis?.state==="complete"||project.review?.state==="complete"?(pending||issues?"review":"checked"):project.review?"paused":"unverified";
  return {state,pending,approved,stale,issues,structure:analysis?.state==="complete",language:project.review?.state==="complete"||analysis?.state==="complete"&&analysis.mode==="full"};
}

export function libraryProgress(project:ManuscriptProject) {
  const status=libraryStatus(project);
  const checked=!!(status.language||status.structure);
  const findings=[...project.findings,...(project.titlePlan?.items||[])];
  const issues=project.analysis?.issues||[];
  const total=findings.length+issues.length;
  const decided=findings.filter(f=>f.status==="approved"||f.status==="rejected").length+issues.filter(i=>i.status==="resolved"||i.status==="rejected").length;
  const decisions=checked?(total?decided/total:1):0;
  const fresh=!!status.language&&status.structure&&decisions===1&&!project.analysis?.stale&&!status.stale;
  const steps=[{key:"language",done:!!status.language},{key:"structure",done:status.structure},{key:"decisions",done:decisions===1},{key:"final",done:fresh}];
  return {steps,percent:Math.floor(((status.language?1:0)+(status.structure?1:0)+decisions+(fresh?1:0))*25),remaining:total-decided};
}
