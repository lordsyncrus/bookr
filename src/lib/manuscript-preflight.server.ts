import "server-only";

import mammoth from "mammoth";

import type { ManuscriptLanguage, ManuscriptPreflight } from "./manuscript-types";

const WORD_PATTERN = /[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu;
const CHAPTER_PATTERN = /^(?:#{1,3}\s*)?(?:capitolo|chapter|parte|part)\s+(?:\d+|[ivxlcdm]+|[^\n]{1,72})\s*$/i;
const MARKDOWN_HEADING_PATTERN = /^#{1,2}\s+\S.{0,100}$/;

const ITALIAN_MARKERS = new Set([
  "che", "con", "del", "della", "delle", "dei", "gli", "una", "non", "per", "sono", "come", "anche", "nel", "alla", "più", "era", "aveva",
]);
const ENGLISH_MARKERS = new Set([
  "the", "and", "that", "with", "for", "was", "were", "not", "from", "this", "have", "had", "his", "her", "but", "into", "about", "would",
]);

export async function analyseManuscript(file: File): Promise<ManuscriptPreflight> {
  const extension = getExtension(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const text = extension === "docx"
    ? (await mammoth.extractRawText({ buffer })).value
    : new TextDecoder("utf-8").decode(buffer);
  const normalized = text.replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    throw new ManuscriptPreflightError("EMPTY_MANUSCRIPT");
  }

  const words = normalized.match(WORD_PATTERN) ?? [];
  const chapterHeadings = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => CHAPTER_PATTERN.test(line) || (extension === "md" && MARKDOWN_HEADING_PATTERN.test(line)));
  const contextTokens = Math.max(1, Math.ceil(normalized.length / 3.8));
  const pipelineTokens = Math.ceil(contextTokens * 7.8);
  const durationBase = Math.max(4, Math.ceil(words.length / 8_000) * 3);

  return {
    file: {
      name: safeDisplayName(file.name),
      extension,
      sizeBytes: file.size,
    },
    metrics: {
      words: words.length,
      characters: normalized.length,
      chapters: Math.max(1, chapterHeadings.length),
      structureDetected: chapterHeadings.length > 0,
      language: detectLanguage(words),
    },
    estimate: {
      contextTokens,
      pipelineTokens,
      durationMinutes: {
        min: durationBase,
        max: Math.ceil(durationBase * 2.4),
      },
      aiCostEur: estimateAiCost(contextTokens),
    },
    reviewTypes: ["language", "style", "continuity", "structure"],
  };
}

export function getExtension(fileName: string): "docx" | "txt" | "md" {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "docx" || extension === "txt" || extension === "md") return extension;
  throw new ManuscriptPreflightError("UNSUPPORTED_FORMAT");
}

function detectLanguage(words: string[]): ManuscriptLanguage {
  const sample = words.slice(0, 6_000).map((word) => word.toLocaleLowerCase());
  const italianScore = sample.reduce((score, word) => score + Number(ITALIAN_MARKERS.has(word)), 0);
  const englishScore = sample.reduce((score, word) => score + Number(ENGLISH_MARKERS.has(word)), 0);
  const threshold = Math.max(3, Math.floor(sample.length * 0.002));

  if (italianScore >= threshold && italianScore > englishScore * 1.25) return "it";
  if (englishScore >= threshold && englishScore > italianScore * 1.25) return "en";
  return "undetermined";
}

function estimateAiCost(contextTokens: number) {
  const inputTokens = contextTokens * 7;
  const outputTokens = contextTokens * 0.8;
  const low = (inputTokens * 0.4 + outputTokens * 2) / 1_000_000;
  const high = (inputTokens * 3 + outputTokens * 15) / 1_000_000;

  return {
    min: roundCurrency(Math.max(0.01, low)),
    max: roundCurrency(Math.max(0.05, high)),
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function safeDisplayName(fileName: string) {
  return fileName.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || "manuscript";
}

export class ManuscriptPreflightError extends Error {
  constructor(public readonly code: "UNSUPPORTED_FORMAT" | "EMPTY_MANUSCRIPT") {
    super(code);
    this.name = "ManuscriptPreflightError";
  }
}
