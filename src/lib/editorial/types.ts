import type { JSONContent } from "@tiptap/core";
import type { EditorialFinding } from "../editor/types";
export type BookMetadata = {
  editorialProfile?: Partial<import("../editor/book-profile").BookProfile>;
  title: string; subtitle: string; authors: string; writingYear: string; language: string;
  edition: string; publisher: string; publicationYear: string; publicationPlace: string;
  isbn: string; copyright: string; credits: string; rights: string; colophonNotes: string;
  includeTitlePage: boolean; includeColophon: boolean;
};
export const EMPTY_METADATA: BookMetadata = { title:"", subtitle:"", authors:"", writingYear:"", language:"it", edition:"", publisher:"", publicationYear:"", publicationPlace:"", isbn:"", copyright:"", credits:"", rights:"", colophonNotes:"", includeTitlePage:false, includeColophon:false };
export type ContentsOptions = { enabled: boolean; minLevel: number; maxLevel: number; title: string; existingRange?: {from:number;to:number}; replaceExisting?: boolean };
export type BookChapter = { id: string; title: string; from: number; to: number; words: number; headingPos: number | null; index: number };
export type SourceChunk = { id: string; chapterId: string; text: string; positions: number[] };
export type Evidence = { chunkId: string; quote: string };
export type BookFact = Evidence & { subject: string; claim: string };
export type ReadingNote = { id: string; chapterIds: string[]; summary: string; style: string; characters: string[]; timeline: string[]; threads: string[]; facts: BookFact[] };
export type BookIssue = { id: string; category: "structure" | "continuity" | "chronology" | "character" | "transition"; title: string; reason: string; suggestion: string; chapterIds: string[]; evidence: Evidence[]; severity: "warning" | "suggestion"; status: "pending" | "accepted" | "rejected" | "resolved" };
export type PipelinePhase = "reading" | "chapters" | "memory" | "structure" | "continuity" | "editing" | "quality" | "complete";
export type JobState = "queued" | "running" | "paused" | "error" | "complete" | "cancelled";
export type AnalysisResult = {
  inferredProfile?: Partial<import("../editor/book-profile").BookProfile>;
  jobId: string; version: number; sourceHash: string; state: JobState; phase: PipelinePhase;
  done: number; total: number; costUsd: number; inputTokens: number; outputTokens: number;
  budgetUsd: number; error: string | null; stale: boolean; mode: "full" | "final";
  chapters: BookChapter[]; chapterNotes: ReadingNote[]; memory: ReadingNote | null;
  issues: BookIssue[]; findings: EditorialFinding[]; discarded: number; model: string;
  createdAt: number; updatedAt: number;
};
export type EditorialJob = AnalysisResult & {
  profileVersion?: 1;
  editorialProfile?: Partial<import("../editor/book-profile").BookProfile>;
  convergenceVersion?: 1; carriedFindingIds?: string[]; recheck?: boolean; unchangedChunks?: string[]; structureChapters?: string[]; reusedNotes?: ReadingNote[]; decisionMemory?: import("./convergence").DecisionMemory;
  owner: string; projectId: string; doc: JSONContent; locale: "it" | "en"; chunks: SourceChunk[];
  notes: ReadingNote[]; memoryQueue: ReadingNote[]; memoryNext: ReadingNote[]; phaseIndex: number;
  continuityGroups: BookFact[][]; qualityFindings: EditorialFinding[];
};
export type JobControl = { desired: "run" | "pause" | "cancel"; budgetUsd: number; resume?: boolean };
