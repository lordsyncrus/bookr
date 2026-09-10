import type { ManuscriptProject } from "./types";
import { ensureHistory } from "./history";
/** Independent content copy; never attach it to the source's running server job. */
export function duplicateProject(source: ManuscriptProject, existing: ManuscriptProject[], en = false): ManuscriptProject {
  const base = source.metadata?.title?.trim() || source.name;
  const names = new Set(existing.map(project => project.metadata?.title?.trim() || project.name));
  let number = 1;
  const label = en ? "copy" : "copia";
  let name = `${base} (${label})`;
  while (names.has(name)) name = `${base} (${label} ${++number})`;
  const copy = structuredClone({...source, source: undefined, history: undefined});
  const now = Date.now();
  return ensureHistory({
    ...copy, id: crypto.randomUUID(), name, createdAt: now, updatedAt: now,
    metadata: copy.metadata ? {...copy.metadata, title: name} : undefined,
    // Files are immutable; preserve File identity/name while document objects are cloned.
    source: source.source,
    trashedAt: undefined, analysis: undefined, review: null, history: undefined,
    writingCost: 0,
    titlePlan: copy.titlePlan ? {...copy.titlePlan, cost: 0} : undefined,
  });
}
