import type { JSONContent } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { reviewChunks } from "../editor/document";
import type { BookChapter, SourceChunk } from "./types";
export function suggestedChapterLevel(doc: PMNode): number {
  const counts = new Map<number, number>();
  doc.forEach(node => { if (node.type.name === "heading") counts.set(node.attrs.level, (counts.get(node.attrs.level) || 0) + 1); });
  return [...counts.keys()].sort().find(level => counts.get(level)! > 1) || [...counts.keys()].sort()[0] || 1;
}
export function bookChapters(doc: PMNode, level: number, locale = "it"): BookChapter[] {
  const starts: { title: string; pos: number; heading: boolean }[] = [];
  doc.forEach((node, pos) => { if (node.type.name === "heading" && node.attrs.level === level) starts.push({ title: node.textContent, pos, heading: true }); });
  if (!starts.length || starts[0].pos > 0) starts.unshift({ title: locale === "en" ? "Opening pages" : "Pagine iniziali", pos: 0, heading: false });
  return starts.map((item, i) => { const to = starts[i + 1]?.pos ?? doc.content.size; return { id: `chapter-${i + 1}`, title: item.title, from: item.pos, to, headingPos: item.heading ? item.pos : null, words: (doc.textBetween(item.pos, to, " ").match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || []).length, index: i + 1 }; });
}
export function chapterChunks(doc: PMNode, chapters: BookChapter[]): SourceChunk[] {
  const all: SourceChunk[] = [];
  for (const chapter of chapters) {
    // Keep positions in the full document, not in the chapter-local slice.
    const sliced = doc.type.create(null, doc.content.cut(chapter.from, chapter.to));
    for (const chunk of reviewChunks(sliced, 9000)) all.push({ ...chunk, id: `chunk-${all.length + 1}`, chapterId: chapter.id, positions: chunk.positions.map(p => p < 0 ? p : p + chapter.from) });
  }
  return all;
}
export function textOfNode(node: JSONContent): string { return (node.text || "") + (node.content || []).map(textOfNode).join(""); }
export function headingEntries(doc: JSONContent, min: number, max: number) {
  const entries: { title: string; level: number; id: string }[] = [];
  let index = 0;
  const visit = (node: JSONContent) => {
    if (node.type === "heading") { index++; const level = Number(node.attrs?.level || 1); if (level >= min && level <= max) entries.push({ title: textOfNode(node), level, id: `bookr_heading_${index}` }); }
    node.content?.forEach(visit);
  };
  visit(doc); return entries;
}
