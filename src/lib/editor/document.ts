import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { JSONContent } from "@tiptap/core";
import type { Mapping } from "@tiptap/pm/transform";
import type { EditorialFinding, OutlineItem } from "./types";
export type ReviewChunk = { text: string; positions: number[] };
export function documentOutline(doc: ProseMirrorNode): OutlineItem[] {
  const items: OutlineItem[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "heading")
      items.push({ title: node.textContent, level: node.attrs.level, pos });
  });
  return items;
}
// One position per UTF-16 code unit keeps AI citations aligned with ProseMirror,
// including text split across bold/italic runs and repeated passages.
export function reviewChunks(
  doc: ProseMirrorNode,
  limit = 9000,
): ReviewChunk[] {
  const chunks: ReviewChunk[] = [];
  let chunk: ReviewChunk = { text: "", positions: [] };
  const flush = () => {
    if (chunk.text.trim()) chunks.push(chunk);
    chunk = { text: "", positions: [] };
  };
  doc.descendants((block, blockPos) => {
    if (!block.isTextblock) return;
    let text = "";
    const positions: number[] = [];
    block.descendants((node, offset) => {
      const value = node.isText
        ? node.text!
        : node.type.name === "hardBreak"
          ? "\n"
          : "";
      for (let i = 0; i < value.length; i++)
        positions.push(blockPos + 1 + offset + i);
      text += value;
    });
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + limit, text.length);
      if (end < text.length) {
        const boundary = text.lastIndexOf(" ", end);
        if (boundary > start + limit / 2) end = boundary + 1;
        // Never split a Unicode surrogate pair.
        if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
      }
      const part = text.slice(start, end);
      if (chunk.text.length + part.length + 2 > limit) flush();
      if (chunk.text) {
        chunk.text += "\n\n";
        chunk.positions.push(-1, -1);
      }
      chunk.text += part;
      chunk.positions.push(...positions.slice(start, end));
      start = end;
    }
    return false;
  });
  flush();
  return chunks;
}
export function anchorFinding(
  chunk: ReviewChunk,
  start: number,
  end: number,
): { from: number; to: number } | null {
  if (start < 0 || end > chunk.text.length || end <= start) return null;
  const from = chunk.positions[start];
  for (let i = start; i < end; i++)
    if (chunk.positions[i] !== from + i - start || chunk.positions[i] < 0)
      return null;
  return { from, to: from + end - start };
}
export function remapFindings(
  findings: EditorialFinding[],
  mapping: Mapping,
  doc: ProseMirrorNode,
): EditorialFinding[] {
  return findings.map((f) => {
    const from = mapping.map(f.from, f.status === "approved" ? -1 : 1);
    const to = mapping.map(f.to, f.status === "approved" ? 1 : -1);
    const inBounds = from <= to && from >= 0 && to <= doc.content.size;
    const text = inBounds ? doc.textBetween(from, to, "\n", "\n") : null;
    let status = f.status;
    if (f.status === "pending" && text !== f.original) status = text === f.suggested ? "approved" : "stale";
    if (f.status === "approved" && text !== f.suggested)
      status = text === f.original ? "pending" : "stale";
    return { ...f, from: Math.max(0, from), to: Math.max(from, to), status };
  });
}
export function countWords(doc: JSONContent): number {
  let text = "";
  const visit = (node: JSONContent) => {
    if (node.text) text += node.text;
    node.content?.forEach(visit);
    if (["paragraph", "heading", "hardBreak"].includes(node.type || ""))
      text += " ";
  };
  visit(doc);
  return (text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) ?? []).length;
}
export function typographyAudit(doc: JSONContent) {
  const fonts = new Set<string>();
  const sizes = new Set<string>();
  let empty = 0;
  let headingSkips = 0;
  let lastLevel = 0;
  const visit = (node: JSONContent) => {
    if (
      node.type === "paragraph" &&
      (!node.content?.length ||
        node.content.every((n) => !n.text?.trim() && n.type === "text"))
    )
      empty++;
    if (node.type === "heading") {
      const level = Number(node.attrs?.level || 1);
      if (level > lastLevel + 1) headingSkips++;
      lastLevel = level;
    }
    node.marks?.forEach((m) => {
      if (m.type === "textStyle") {
        if (m.attrs?.fontFamily) fonts.add(m.attrs.fontFamily);
        if (m.attrs?.fontSize) sizes.add(m.attrs.fontSize);
      }
    });
    node.content?.forEach(visit);
  };
  visit(doc);
  return { fonts: [...fonts], sizes: [...sizes], empty, headingSkips };
}
