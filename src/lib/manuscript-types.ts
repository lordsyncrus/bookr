export const MAX_MANUSCRIPT_BYTES = 50 * 1024 * 1024;

export type ManuscriptLanguage = "it" | "en" | "undetermined";

export type ManuscriptPreflight = {
  file: {
    name: string;
    extension: "docx" | "txt" | "md";
    sizeBytes: number;
  };
  metrics: {
    words: number;
    characters: number;
    chapters: number;
    structureDetected: boolean;
    language: ManuscriptLanguage;
  };
  estimate: {
    contextTokens: number;
    pipelineTokens: number;
    durationMinutes: {
      min: number;
      max: number;
    };
    aiCostEur: {
      min: number;
      max: number;
    };
  };
  reviewTypes: Array<"language" | "style" | "continuity" | "structure">;
};

export type PreflightErrorCode =
  | "UNAUTHORIZED"
  | "MISSING_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FORMAT"
  | "EMPTY_MANUSCRIPT"
  | "PARSE_FAILED";

export type PreflightError = {
  error: PreflightErrorCode;
};
