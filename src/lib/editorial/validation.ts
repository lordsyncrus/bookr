import type { BookFact, BookIssue, EditorialJob, ReadingNote, SourceChunk } from "./types";
import { PipelineError } from "./openrouter";
const record = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== "object" || Array.isArray(v)) throw new PipelineError("INVALID_RESPONSE"); return v as Record<string,unknown>; };
const string = (v: unknown, max = 8000): string => { if (typeof v !== "string" || v.length > max) throw new PipelineError("INVALID_RESPONSE"); return v; };
const strings = (v: unknown, max = 30): string[] => { if (!Array.isArray(v) || v.length > max) throw new PipelineError("INVALID_RESPONSE"); return v.map(x => string(x,1500)); };
export function verifiedEvidence(chunkId: string, quote: string, chunks: SourceChunk[]): boolean {
  const chunk = chunks.find(c => c.id === chunkId); return !!chunk && quote.length > 5 && quote.length <= 2000 && chunk.text.includes(quote);
}
export function validateNote(value: unknown, id: string, chapterIds: string[], chunks: SourceChunk[]): ReadingNote {
  const v = record(value); const facts: BookFact[] = [];
  if (!Array.isArray(v.facts) || v.facts.length > 40) throw new PipelineError("INVALID_RESPONSE");
  for (const raw of v.facts) { const f = record(raw); const quote = string(f.quote,2000); const chunkId = string(f.chunkId,100); if (verifiedEvidence(chunkId,quote,chunks)) facts.push({subject:string(f.subject,200),claim:string(f.claim,1500),quote,chunkId}); }
  return { id, chapterIds, summary:string(v.summary,8000),style:string(v.style,4000),characters:strings(v.characters),timeline:strings(v.timeline),threads:strings(v.threads),facts };
}
export function validateIssues(value: unknown, job: EditorialJob, requireCrossChapter: boolean): {issues:BookIssue[];discarded:number} {
  const v = record(value); if (!Array.isArray(v.issues) || v.issues.length > 30) throw new PipelineError("INVALID_RESPONSE");
  const issues: BookIssue[] = []; let discarded = 0;
  for (const raw of v.issues) {
    const f = record(raw); const category = string(f.category);
    if (!["structure","continuity","chronology","character","transition"].includes(category) || !["warning","suggestion"].includes(String(f.severity))) throw new PipelineError("INVALID_RESPONSE");
    const chapterIds = strings(f.chapterIds).filter(id=>job.chapters.some(c=>c.id===id));
    if (!Array.isArray(f.evidence)) throw new PipelineError("INVALID_RESPONSE");
    const evidence = f.evidence.slice(0,10).map(raw=>{const e=record(raw);return {chunkId:string(e.chunkId,100),quote:string(e.quote,2000)};}).filter(e=>verifiedEvidence(e.chunkId,e.quote,job.chunks));
    const citedChapters = new Set(evidence.map(e=>job.chunks.find(c=>c.id===e.chunkId)!.chapterId));
    if (!chapterIds.length || (requireCrossChapter && citedChapters.size < 2)) { discarded++; continue; }
    issues.push({ id:crypto.randomUUID(),category:category as BookIssue["category"],title:string(f.title,200),reason:string(f.reason,2500),suggestion:string(f.suggestion,2500),chapterIds,evidence,severity:f.severity as BookIssue["severity"],status:"pending" });
  }
  return {issues,discarded};
}
export function validateQuality(value: unknown, ids: string[]): string[] { const v=record(value); return [...new Set(strings(v.acceptedIds,100).filter(id=>ids.includes(id)))]; }
