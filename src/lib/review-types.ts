export const REVIEW_SAMPLE_CHARACTERS = 12_000;
export type Finding = { original: string; suggested: string; reason: string; category: "language" | "style"; start: number; end: number };
export type ReviewResult = { sample: string; totalCharacters: number; findings: Finding[]; discarded: number; model: string; costUsd: number | null };

export function validateFindings(value: unknown, sample: string): { findings: Finding[]; discarded: number } {
  if (!value || typeof value !== "object" || !("findings" in value) || !Array.isArray(value.findings) || value.findings.length > 20) throw new Error("INVALID_RESPONSE");
  const findings: Finding[] = [];
  for (const item of value.findings) {
    if (!item || typeof item.original !== "string" || !item.original || typeof item.suggested !== "string" || typeof item.reason !== "string" || !item.reason || item.original.length > 2000 || item.suggested.length > 2000 || item.reason.length > 2000 || !["language", "style"].includes(item.category) || item.original === item.suggested) continue;
    const start = sample.indexOf(item.original);
    const end = start + item.original.length;
    if (start < 0 || sample.indexOf(item.original, start + 1) !== -1 || findings.some(f => start < f.end && end > f.start)) continue;
    findings.push({ original: item.original, suggested: item.suggested, reason: item.reason, category: item.category, start, end });
  }
  return { findings: findings.sort((a, b) => a.start - b.start), discarded: value.findings.length - findings.length };
}
export function applyFindings(sample: string, findings: Finding[]): string {
  return [...findings].sort((a, b) => b.start - a.start).reduce((text, f) => text.slice(0, f.start) + f.suggested + text.slice(f.end), sample);
}
