import type { ManuscriptProject } from "./types";
export function mergeLibrary(stored:ManuscriptProject[],incoming:ManuscriptProject[],deleted:string[]) {
  const tombstones=new Set(deleted);
  const merged=new Map(stored.filter(p=>!tombstones.has(p.id)).map(p=>[p.id,p]));
  for(const project of incoming) {
    if(tombstones.has(project.id))continue;
    const prior=merged.get(project.id);
    if(!prior||project.updatedAt>prior.updatedAt)merged.set(project.id,prior?{...project,trashedAt:prior.trashedAt}:project);
  }
  return [...merged.values()];
}
