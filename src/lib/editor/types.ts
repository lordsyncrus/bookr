import type { AnalysisResult, BookMetadata, ContentsOptions } from "../editorial/types";
import type { JSONContent } from "@tiptap/core";
import type { Finding } from "../review-types";
export type EditorialFinding = Finding & {
  id: string;
  from: number;
  to: number;
  status: "pending" | "approved" | "rejected" | "stale";
  block: number;
};
export type Typography = {
  font: string;
  size: number;
  lineHeight: number;
  paragraphSpacing: number;
  showPageGaps?: boolean;
  keepHeadingsWithNext?: boolean;
  margin: number;
};
export const DEFAULT_TYPOGRAPHY: Typography = {
  keepHeadingsWithNext: true,
  font: "Georgia",
  size: 12,
  lineHeight: 1.6,
  paragraphSpacing: 8,
  margin: 25,
};
export type ReviewProgress = {
  next: number;
  total: number;
  cost: number;
  discarded: number;
  state: "paused" | "complete";
  model: string;
};
export type ManuscriptProject = {
  writingCost?: number;
  reviewDecisions?: import("../editorial/convergence").ReviewDecision[];
  history?: import("./history").HistoryEntry[];
  version: 1;
  id: string;
  name: string;
  updatedAt: number;
  trashedAt?: number;
  createdAt: number;
  doc: JSONContent;
  original: JSONContent;
  source?: File;
  typography: Typography;
  findings: EditorialFinding[];
  review: ReviewProgress | null;
  importNotice: boolean;
  metadata?: BookMetadata;
  contents?: ContentsOptions;
  chapterLevel?: number;
  analysis?: AnalysisResult;
  titlePlan?: import("./title-plan").TitlePlan;
};
export type OutlineItem = { title: string; level: number; pos: number };
